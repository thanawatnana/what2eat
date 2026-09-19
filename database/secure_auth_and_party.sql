-- Transactional upgrade of the existing Joykin database. Existing records are retained.
create schema if not exists joykin_private;
revoke all on schema joykin_private from public, anon;
grant usage on schema joykin_private to authenticated, service_role;

alter table public.users alter column password_hash drop not null;
alter table public.users alter column email drop not null;
create unique index if not exists users_username_normalized on public.users (lower(username));
create unique index if not exists users_email_normalized on public.users (lower(email)) where email is not null;

create or replace function joykin_private.provision_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_username text;
begin
  -- The Auth admin importer supplies the original UUID, preserving all foreign keys.
  if exists (select 1 from public.users where id = new.id) then
    if not exists (select 1 from public.users where id = new.id and lower(email) = lower(new.email)) then
      raise exception 'Profile identity mismatch';
    end if;
    update public.users set password_hash = null where id = new.id;
    return new;
  end if;
  v_username := case when new.is_anonymous then 'guest_' || replace(new.id::text, '-', '')
    else lower(btrim(new.raw_user_meta_data->>'username')) end;
  if v_username is null or (not new.is_anonymous and v_username !~ '^[a-z0-9_.-]{3,30}$') then
    raise exception 'Invalid username';
  end if;
  insert into public.users(id, username, name_account, email, is_guest)
  values (new.id, v_username,
    case when new.is_anonymous then 'Guest' else left(coalesce(nullif(btrim(new.raw_user_meta_data->>'name_account'), ''), v_username), 40) end,
    lower(new.email), coalesce(new.is_anonymous, false));
  return new;
end $$;
revoke all on function joykin_private.provision_user() from public, anon, authenticated;
drop trigger if exists joykin_provision_user on auth.users;
create trigger joykin_provision_user after insert on auth.users for each row execute function joykin_private.provision_user();

-- Remove permissive legacy policies only on tables owned by this application.
do $$ declare p record; begin
  for p in select schemaname, tablename, policyname from pg_policies where schemaname = 'public'
    and tablename in ('users','foods','user_foods','favorites','history','rooms','participants','swipes')
  loop execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename); end loop;
end $$;
alter table public.users enable row level security;
alter table public.foods enable row level security;
alter table public.user_foods enable row level security;
alter table public.favorites enable row level security;
alter table public.history enable row level security;
alter table public.rooms enable row level security;
alter table public.participants enable row level security;
alter table public.swipes enable row level security;
revoke all on public.users, public.foods, public.user_foods, public.favorites, public.history,
  public.rooms, public.participants, public.swipes from public, anon, authenticated;
grant select(id, name_account, username, is_guest, profile_image_url, created_at, updated_at),
  update(name_account, profile_image_url) on public.users to authenticated;
grant select on public.foods to authenticated;
grant select, insert, update, delete on public.user_foods, public.favorites, public.history to authenticated;
grant all on public.users, public.foods, public.user_foods, public.favorites, public.history,
  public.rooms, public.participants, public.swipes to service_role;
create policy own_profile_read on public.users for select to authenticated using (id = (select auth.uid()));
create policy own_profile_update on public.users for update to authenticated
  using (id = (select auth.uid()) and not is_guest) with check (id = (select auth.uid()) and not is_guest);
create policy foods_read on public.foods for select to authenticated using (true);
create policy own_foods on public.user_foods for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_favorites on public.favorites for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_history on public.history for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create index if not exists user_foods_owner on public.user_foods(user_id);
create index if not exists favorites_owner on public.favorites(user_id);
create index if not exists history_owner on public.history(user_id, created_at desc);

-- Keep duplicate legacy favorites intact. New writes use a serialized API to deduplicate.
create or replace function joykin_private.save_favorite(p_name text, p_category text, p_image text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  perform 1 from public.users where id = auth.uid() for update;
  if not found then raise exception 'Profile missing'; end if;
  if length(btrim(p_name)) not between 1 and 200 then raise exception 'Invalid food'; end if;
  if not exists (select 1 from public.favorites where user_id = auth.uid() and food_name = p_name) then
    insert into public.favorites(user_id, food_name, food_category, food_image_url)
    values(auth.uid(), p_name, coalesce(p_category, 'Custom'), p_image);
  end if;
end $$;
create or replace function public.save_favorite(p_name text, p_category text, p_image text default null) returns void
language sql security invoker set search_path = '' as $$ select joykin_private.save_favorite(p_name, p_category, p_image) $$;
revoke insert on public.favorites from authenticated;
revoke all on function joykin_private.save_favorite(text,text,text), public.save_favorite(text,text,text) from public, anon;
grant execute on function joykin_private.save_favorite(text,text,text), public.save_favorite(text,text,text) to authenticated;

-- Atomic, bounded rate limits. The login endpoint is the only public API caller;
-- it receives no user rows/password hashes through this function.
create table if not exists joykin_private.rate_limits (
  key text primary key, hits integer not null, resets_at timestamptz not null
);
alter table joykin_private.rate_limits enable row level security;
revoke all on joykin_private.rate_limits from public, anon, authenticated;
create or replace function joykin_private.take_rate(p_key text, p_max integer, p_seconds integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_hits integer;
begin
  delete from joykin_private.rate_limits where resets_at < now() - interval '1 day';
  insert into joykin_private.rate_limits as r values(p_key, 1, now() + make_interval(secs => p_seconds))
  on conflict(key) do update set
    hits = case when r.resets_at <= now() then 1 else r.hits + 1 end,
    resets_at = case when r.resets_at <= now() then now() + make_interval(secs => p_seconds) else r.resets_at end
  returning hits into v_hits;
  return v_hits <= p_max;
end $$;
revoke all on function joykin_private.take_rate(text,integer,integer) from public, anon, authenticated;
create or replace function public.login_attempt(p_key text) returns boolean
language sql security definer set search_path = '' as $$
  select joykin_private.take_rate('login:' || p_key, 8, 900) and joykin_private.take_rate('login:global', 300, 60)
$$;
revoke all on function public.login_attempt(text) from public, anon, authenticated;
grant execute on function public.login_attempt(text) to service_role;

-- The Edge Function can resolve an account without exposing profile rows or hashes.
create or replace function public.login_profile(p_identifier text, p_by_email boolean) returns jsonb
language sql security definer set search_path = '' as $$
  select to_jsonb(u) from public.users u
  where case when p_by_email then lower(u.email) = p_identifier else lower(u.username) = p_identifier end
  limit 1
$$;
revoke all on function public.login_profile(text,boolean) from public, anon, authenticated;
grant execute on function public.login_profile(text,boolean) to service_role;

-- Existing rooms stay in place but do not become accessible to new users.
alter table public.rooms add column if not exists host_user_id uuid references auth.users(id);
alter table public.rooms add column if not exists capacity integer not null default 4;
alter table public.rooms add column if not exists custom_foods jsonb not null default '[]';
alter table public.rooms add column if not exists expires_at timestamptz not null default (now() + interval '2 hours');
alter table public.rooms add column if not exists version integer not null default 1;
alter table public.participants add column if not exists user_id uuid references auth.users(id);
alter table public.participants add column if not exists left_at timestamptz;
create unique index if not exists participant_room_user on public.participants(room_id, user_id) where user_id is not null;
create index if not exists participant_user on public.participants(user_id);
create index if not exists rooms_host on public.rooms(host_user_id);
create table if not exists public.room_foods (
  room_id uuid not null references public.rooms(id), food_id text not null,
  position integer not null, food jsonb not null, primary key(room_id, food_id)
);
create table if not exists public.room_votes (
  room_id uuid not null, user_id uuid not null references auth.users(id), food_id text not null,
  is_liked boolean not null, primary key(room_id, user_id, food_id),
  foreign key(room_id, food_id) references public.room_foods(room_id, food_id)
);
alter table public.room_foods enable row level security;
alter table public.room_votes enable row level security;
revoke all on public.room_foods, public.room_votes from public, anon, authenticated;
grant all on public.room_foods, public.room_votes to service_role;
create index if not exists room_votes_user on public.room_votes(user_id);
create index if not exists room_votes_food on public.room_votes(room_id, food_id);
create index if not exists legacy_swipes_room on public.swipes(room_id);
create index if not exists legacy_swipes_participant on public.swipes(participant_id);

-- All game transitions acquire the room row lock. A snapshot freezes menus at
-- start; immutable votes and a single finalizer prevent duplicates/races.
create or replace function joykin_private.party(p_action text, p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_room public.rooms%rowtype; v_part public.participants%rowtype;
  v_id uuid; v_code text; v_name text; v_food_id text; v_count integer; v_needed integer;
  v_winner text; v_snapshot jsonb; v_attempt integer; v_food jsonb;
begin
  if v_uid is null or not exists(select 1 from public.users where id = v_uid) then
    return jsonb_build_object('error', 'กรุณาเข้าสู่ระบบ');
  end if;
  if p_action in ('create','join') and not joykin_private.take_rate('party:'||v_uid::text, 20, 600) then
    return jsonb_build_object('error','ลองบ่อยเกินไป กรุณารอสักครู่');
  end if;
  begin
    v_name := btrim(p_payload->>'name');
    if p_action = 'create' then
      if v_name is null or length(v_name) not between 1 and 15 then raise exception 'กรุณาระบุชื่อ 1–15 ตัวอักษร'; end if;
      for v_attempt in 1..10 loop
        v_code := (100000 + floor(random()*900000))::integer::text;
        begin
          insert into public.rooms(room_code, host_user_id, status, version)
          values(v_code, v_uid, 'waiting', 2) returning * into v_room;
          exit;
        exception when unique_violation then if v_attempt = 10 then raise exception 'กรุณาลองสร้างห้องอีกครั้ง'; end if; end;
      end loop;
      insert into public.participants(room_id,user_id,name) values(v_room.id,v_uid,v_name) returning * into v_part;
    else
      if p_action = 'join' then
        if coalesce(p_payload->>'code','') !~ '^[0-9]{6}$' then raise exception 'รหัสห้องต้องเป็นเลข 6 หลัก'; end if;
        select * into v_room from public.rooms where room_code = p_payload->>'code' and version = 2 for update;
      else
        v_id := (p_payload->>'roomId')::uuid;
        select * into v_room from public.rooms where id = v_id and version = 2 for update;
      end if;
      if v_room.id is null then raise exception 'ไม่พบห้อง'; end if;
      select * into v_part from public.participants where room_id = v_room.id and user_id = v_uid and left_at is null;
      if p_action = 'join' then
        if v_room.expires_at <= now() or v_room.status <> 'waiting' then raise exception 'ห้องปิดหรือเริ่มเล่นแล้ว'; end if;
        if v_name is null or length(v_name) not between 1 and 15 then raise exception 'กรุณาระบุชื่อ 1–15 ตัวอักษร'; end if;
        if v_part.id is null then
          select count(*) into v_count from public.participants where room_id=v_room.id and left_at is null;
          if v_count >= v_room.capacity then raise exception 'ห้องเต็มแล้ว (สูงสุด 4 คน)'; end if;
          insert into public.participants(room_id,user_id,name) values(v_room.id,v_uid,v_name)
          on conflict(room_id,user_id) where user_id is not null do update set left_at=null, name=excluded.name
          returning * into v_part;
        end if;
      elsif v_part.id is null then raise exception 'คุณไม่ได้อยู่ในห้องนี้';
      end if;

      if v_room.expires_at <= now() and v_room.status not in ('done','cancelled') then
        update public.rooms set status='cancelled' where id=v_room.id returning * into v_room;
      end if;

      if p_action in ('add_food','remove_food') then
        if v_room.status <> 'waiting' then raise exception 'ห้องเริ่มเล่นแล้ว'; end if;
        if p_action = 'add_food' then
          if jsonb_array_length(v_room.custom_foods) >= 50 then raise exception 'เพิ่มได้สูงสุด 50 เมนู'; end if;
          v_name := btrim(p_payload->>'name');
          if v_name is null or length(v_name) not between 1 and 30 then raise exception 'กรุณาระบุชื่อเมนู 1–30 ตัวอักษร'; end if;
          v_food := jsonb_build_object('id',gen_random_uuid()::text,'name',v_name,'category','Custom','emoji','🍽️');
          update public.rooms set custom_foods=custom_foods || jsonb_build_array(v_food) where id=v_room.id returning * into v_room;
        else
          update public.rooms set custom_foods=coalesce((select jsonb_agg(f) from jsonb_array_elements(custom_foods) f where f->>'id' <> p_payload->>'foodId'), '[]')
          where id=v_room.id returning * into v_room;
        end if;
      elsif p_action = 'start' then
        if v_room.host_user_id <> v_uid then raise exception 'เฉพาะเจ้าของห้องเท่านั้น'; end if;
        if v_room.status = 'waiting' then
          select count(*) into v_count from public.participants where room_id=v_room.id and left_at is null;
          if v_count < 2 then raise exception 'ต้องมีผู้เล่นอย่างน้อย 2 คน'; end if;
          if jsonb_array_length(v_room.custom_foods) > 0 then
            insert into public.room_foods(room_id,food_id,position,food)
            select v_room.id,f->>'id',n::integer,f from jsonb_array_elements(v_room.custom_foods) with ordinality x(f,n);
          else
            insert into public.room_foods(room_id,food_id,position,food)
            select v_room.id,id::text,row_number() over(order by id)::integer,to_jsonb(f) from public.foods f;
          end if;
          if not exists(select 1 from public.room_foods where room_id=v_room.id) then raise exception 'ไม่มีเมนูในห้อง'; end if;
          update public.rooms set status='playing' where id=v_room.id returning * into v_room;
        end if;
      elsif p_action = 'vote' then
        v_food_id := p_payload->>'foodId';
        if not exists(select 1 from public.room_foods where room_id=v_room.id and food_id=v_food_id) then raise exception 'เมนูไม่ถูกต้อง'; end if;
        if jsonb_typeof(p_payload->'liked') is distinct from 'boolean' then raise exception 'คะแนนโหวตไม่ถูกต้อง'; end if;
        if v_room.status = 'playing' then
          -- First acknowledged vote wins. Retrying the same request cannot change it.
          insert into public.room_votes values(v_room.id,v_uid,v_food_id,(p_payload->>'liked')::boolean) on conflict do nothing;
          select count(*) into v_count from public.participants where room_id=v_room.id and left_at is null;
          select v_count * count(*) into v_needed from public.room_foods where room_id=v_room.id;
          if (select count(*) from public.room_votes where room_id=v_room.id) = v_needed then
            select food_id into v_winner from public.room_votes where room_id=v_room.id
            group by food_id having count(*) filter(where is_liked) = v_count order by random() limit 1;
            update public.rooms set status='done',matched_food_id=case when v_winner is null then 'no_match' else jsonb_build_array(v_winner)::text end
            where id=v_room.id returning * into v_room;
            if v_winner is not null then
              select food into v_food from public.room_foods where room_id=v_room.id and food_id=v_winner;
              insert into public.history(user_id,food_name,food_category,mode,image_url)
              select user_id,v_food->>'name',v_food->>'category','party',v_food->>'image_url' from public.participants where room_id=v_room.id and left_at is null;
            end if;
          end if;
        elsif v_room.status <> 'done' then raise exception 'ห้องไม่ได้อยู่ระหว่างโหวต'; end if;
      elsif p_action = 'leave' then
        if v_room.status = 'playing' or (v_room.status = 'waiting' and v_room.host_user_id = v_uid) then
          update public.rooms set status='cancelled' where id=v_room.id returning * into v_room;
        end if;
        update public.participants set left_at=now() where id=v_part.id;
        return jsonb_build_object('left',true);
      elsif p_action not in ('snapshot','join') then raise exception 'คำสั่งไม่ถูกต้อง'; end if;
    end if;

    select coalesce(jsonb_agg(food order by position),'[]') into v_snapshot from public.room_foods where room_id=v_room.id;
    return jsonb_build_object(
      'room',to_jsonb(v_room), 'participantId',v_part.id,
      'participants',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'user_id',user_id) order by joined_at) from public.participants where room_id=v_room.id and left_at is null),'[]'),
      'foods',v_snapshot,
      'myVotes',coalesce((select jsonb_agg(food_id) from public.room_votes where room_id=v_room.id and user_id=v_uid),'[]')
    );
  exception when others then
    -- Rate-limit increments survive rejected joins; validation errors do not.
    return jsonb_build_object('error',case when sqlstate='P0001' then sqlerrm else 'ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง' end);
  end;
end $$;
create or replace function public.party(p_action text,p_payload jsonb default '{}') returns jsonb
language sql security invoker set search_path = '' as $$ select joykin_private.party(p_action,p_payload) $$;
revoke all on function public.party(text,jsonb), joykin_private.party(text,jsonb) from public, anon;
grant execute on function public.party(text,jsonb), joykin_private.party(text,jsonb) to authenticated;

-- Polling is authoritative; realtime is only a prompt to fetch a new snapshot.
create or replace function joykin_private.is_member(p_room uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from public.participants where room_id=p_room and user_id=auth.uid() and left_at is null)
$$;
revoke all on function joykin_private.is_member(uuid) from public, anon;
grant execute on function joykin_private.is_member(uuid) to authenticated;
grant select on public.rooms to authenticated;
create policy member_room_read on public.rooms for select to authenticated using (joykin_private.is_member(id));

-- Existing image URLs remain valid; new uploads are restricted to the owner folder.
drop policy if exists "Allow public uploads 9jtozr_0" on storage.objects;
drop policy if exists "Allow public uploads 9jtozr_1" on storage.objects;
drop policy if exists "Allow public uploads 9jtozr_2" on storage.objects;
drop policy if exists "Allow public uploads 9jtozr_3" on storage.objects;
drop policy if exists allow_avatar_read on storage.objects;
drop policy if exists allow_avatar_update on storage.objects;
drop policy if exists allow_avatar_upload on storage.objects;
create policy joykin_image_read on storage.objects for select to authenticated
  using (bucket_id in ('avatars','food-images') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy joykin_image_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars','food-images') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy joykin_image_update on storage.objects for update to authenticated
  using (bucket_id in ('avatars','food-images') and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id in ('avatars','food-images') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy joykin_image_delete on storage.objects for delete to authenticated
  using (bucket_id in ('avatars','food-images') and (storage.foldername(name))[1] = (select auth.uid())::text);
update storage.buckets set file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id in ('avatars','food-images');
