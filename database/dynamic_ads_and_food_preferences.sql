-- Dynamic advertisements, per-user food preferences, and secure admin access.
-- This migration is additive and keeps existing application data intact.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
revoke all on public.admin_users from public, anon, authenticated;
grant select on public.admin_users to authenticated;
grant all on public.admin_users to service_role;

drop policy if exists admin_users_read_self on public.admin_users;
create policy admin_users_read_self on public.admin_users
  for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function joykin_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  )
$$;

revoke all on function joykin_private.is_admin() from public, anon;
grant execute on function joykin_private.is_admin() to authenticated, service_role;

create table if not exists public.advertisements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 100),
  image_url text not null check (image_url ~ '^https://'),
  image_path text not null check (char_length(image_path) between 3 and 500),
  target_url text check (target_url is null or target_url ~ '^https?://'),
  payment_amount numeric(12,2) not null check (payment_amount > 0 and payment_amount <= 1000000000),
  is_active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint advertisements_valid_window check (ends_at is null or ends_at > starts_at)
);

create index if not exists advertisements_created_by_idx on public.advertisements(created_by);
create index if not exists advertisements_active_window_idx
  on public.advertisements(starts_at, ends_at)
  where is_active;

alter table public.advertisements enable row level security;
revoke all on public.advertisements from public, anon, authenticated;
grant select, insert, update, delete on public.advertisements to authenticated;
grant all on public.advertisements to service_role;

drop policy if exists advertisements_active_read on public.advertisements;
create policy advertisements_active_read on public.advertisements
  for select to authenticated
  using (
    is_active
    and starts_at <= now()
    and (ends_at is null or ends_at > now())
  );

drop policy if exists advertisements_admin_read on public.advertisements;
create policy advertisements_admin_read on public.advertisements
  for select to authenticated
  using ((select joykin_private.is_admin()));

drop policy if exists advertisements_admin_insert on public.advertisements;
create policy advertisements_admin_insert on public.advertisements
  for insert to authenticated
  with check (
    (select joykin_private.is_admin())
    and created_by = (select auth.uid())
  );

drop policy if exists advertisements_admin_update on public.advertisements;
create policy advertisements_admin_update on public.advertisements
  for update to authenticated
  using ((select joykin_private.is_admin()))
  with check ((select joykin_private.is_admin()));

drop policy if exists advertisements_admin_delete on public.advertisements;
create policy advertisements_admin_delete on public.advertisements
  for delete to authenticated
  using ((select joykin_private.is_admin()));

create table if not exists public.food_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  food_source text not null check (food_source in ('system', 'custom')),
  food_id uuid not null,
  is_hidden boolean not null default false,
  is_selected boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, food_source, food_id)
);

alter table public.food_preferences enable row level security;
revoke all on public.food_preferences from public, anon, authenticated;
grant select, insert, update, delete on public.food_preferences to authenticated;
grant all on public.food_preferences to service_role;

drop policy if exists food_preferences_read_own on public.food_preferences;
create policy food_preferences_read_own on public.food_preferences
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists food_preferences_insert_own on public.food_preferences;
create policy food_preferences_insert_own on public.food_preferences
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      (food_source = 'system' and exists (
        select 1 from public.foods where id = food_id
      ))
      or
      (food_source = 'custom' and exists (
        select 1 from public.user_foods
        where id = food_id and user_id = (select auth.uid())
      ))
    )
  );

drop policy if exists food_preferences_update_own on public.food_preferences;
create policy food_preferences_update_own on public.food_preferences
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      (food_source = 'system' and exists (
        select 1 from public.foods where id = food_id
      ))
      or
      (food_source = 'custom' and exists (
        select 1 from public.user_foods
        where id = food_id and user_id = (select auth.uid())
      ))
    )
  );

drop policy if exists food_preferences_delete_own on public.food_preferences;
create policy food_preferences_delete_own on public.food_preferences
  for delete to authenticated
  using (user_id = (select auth.uid()));

create or replace function joykin_private.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

revoke all on function joykin_private.touch_updated_at() from public, anon, authenticated;

drop trigger if exists advertisements_touch_updated_at on public.advertisements;
create trigger advertisements_touch_updated_at
before update on public.advertisements
for each row execute function joykin_private.touch_updated_at();

drop trigger if exists food_preferences_touch_updated_at on public.food_preferences;
create trigger food_preferences_touch_updated_at
before update on public.food_preferences
for each row execute function joykin_private.touch_updated_at();

-- Party rooms use the host's hidden system-menu preferences when freezing a round.
create or replace function joykin_private.skip_hidden_room_food()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.rooms r
    join public.food_preferences p
      on p.user_id = r.host_user_id
     and p.food_source = 'system'
     and p.food_id::text = new.food_id
     and p.is_hidden
    where r.id = new.room_id
  ) then
    return null;
  end if;
  return new;
end
$$;

revoke all on function joykin_private.skip_hidden_room_food() from public, anon, authenticated;

drop trigger if exists room_foods_skip_hidden on public.room_foods;
create trigger room_foods_skip_hidden
before insert on public.room_foods
for each row execute function joykin_private.skip_hidden_room_food();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'advertisements',
  'advertisements',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists advertisement_images_admin_read on storage.objects;
create policy advertisement_images_admin_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'advertisements'
    and (select joykin_private.is_admin())
  );

drop policy if exists advertisement_images_admin_insert on storage.objects;
create policy advertisement_images_admin_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'advertisements'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select joykin_private.is_admin())
  );

drop policy if exists advertisement_images_admin_update on storage.objects;
create policy advertisement_images_admin_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'advertisements'
    and (select joykin_private.is_admin())
  )
  with check (
    bucket_id = 'advertisements'
    and (select joykin_private.is_admin())
  );

drop policy if exists advertisement_images_admin_delete on storage.objects;
create policy advertisement_images_admin_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'advertisements'
    and (select joykin_private.is_admin())
  );

-- The production table was empty; seed the established starter menu once.
insert into public.foods(name, category, price)
select seed.name, seed.category, seed.price
from (values
  ('ข้าวกะเพราหมูกรอบ', 'Thai', '50-70'),
  ('ข้าวมันไก่', 'Thai', '40-60'),
  ('ซูชิ / ซาชิมิ', 'Japanese', '100-200'),
  ('สลัดผักอกไก่', 'Healthy', '60-90'),
  ('พิซซ่า', 'Western', '200+'),
  ('ส้มตำไก่ย่าง', 'Thai', '60-100'),
  ('ชาบู / หมูกระทะ', 'Party', '200+'),
  ('แฮมเบอร์เกอร์', 'Fast Food', '100-150')
) as seed(name, category, price)
where not exists (select 1 from public.foods);
