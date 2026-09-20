-- Optional-email registration with OTP-gated profile provisioning.
create or replace function joykin_private.provision_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_username text;
begin
  if exists (select 1 from public.users where id = new.id) then
    if not exists (select 1 from public.users where id = new.id and lower(email) = lower(new.email)) then
      raise exception 'Profile identity mismatch';
    end if;
    update public.users set password_hash = null where id = new.id;
    return new;
  end if;
  if not coalesce(new.is_anonymous, false) and new.email_confirmed_at is null then
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
create trigger joykin_provision_user after insert or update of email_confirmed_at on auth.users
for each row execute function joykin_private.provision_user();

create or replace function public.registration_attempt(p_key text) returns boolean
language sql security definer set search_path = '' as $$
  select joykin_private.take_rate('register:' || p_key, 5, 900)
    and joykin_private.take_rate('register:global', 100, 60)
$$;
revoke all on function public.registration_attempt(text) from public, anon, authenticated;
grant execute on function public.registration_attempt(text) to service_role;

create or replace function public.registration_conflict(p_username text, p_email text default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.users u where lower(u.username) = lower(p_username)
      or (p_email is not null and u.email is not null and lower(u.email) = lower(p_email))
  ) or exists(
    select 1 from auth.users a where not coalesce(a.is_anonymous, false)
      and (lower(a.raw_user_meta_data->>'username') = lower(p_username)
        or (p_email is not null and a.email is not null and lower(a.email) = lower(p_email)))
  )
$$;
revoke all on function public.registration_conflict(text,text) from public, anon, authenticated;
grant execute on function public.registration_conflict(text,text) to service_role;

-- New custom Party foods no longer carry an emoji field.
update public.rooms
set custom_foods = coalesce((
  select jsonb_agg(item - 'emoji') from jsonb_array_elements(custom_foods) item
), '[]'::jsonb)
where jsonb_typeof(custom_foods) = 'array' and jsonb_array_length(custom_foods) > 0;
