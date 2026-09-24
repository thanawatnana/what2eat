-- Business packages, verified restaurant accounts, targeted campaigns, and
-- privacy-preserving aggregate campaign analytics.

create table if not exists public.ad_packages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]+$'),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text not null default '',
  price_amount numeric(12,2) not null check (price_amount >= 0 and price_amount <= 1000000000),
  duration_days smallint not null check (duration_days between 1 and 365),
  priority_weight numeric(8,2) not null check (priority_weight between 0.01 and 1000),
  daily_impression_limit integer not null check (daily_impression_limit between 1 and 10000000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.ad_packages (
  code, name, description, price_amount, duration_days, priority_weight, daily_impression_limit
)
values
  ('local_boost', 'Local Boost', 'เหมาะสำหรับโปรโมทร้านในพื้นที่ใกล้เคียงเป็นเวลา 7 วัน', 299, 7, 1, 300),
  ('growth', 'Growth', 'เพิ่มโอกาสแสดงผลและใช้งานต่อเนื่อง 30 วัน', 799, 30, 2, 1000),
  ('featured', 'Featured', 'แพ็กเกจเด่นพร้อมลำดับความสำคัญสูงสุด 30 วัน', 1490, 30, 4, 2500)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  price_amount = excluded.price_amount,
  duration_days = excluded.duration_days,
  priority_weight = excluded.priority_weight,
  daily_impression_limit = excluded.daily_impression_limit;

alter table public.ad_packages enable row level security;
revoke all on public.ad_packages from public, anon, authenticated;
grant select on public.ad_packages to authenticated;
grant insert, update, delete on public.ad_packages to authenticated;
grant all on public.ad_packages to service_role;

drop policy if exists ad_packages_active_read on public.ad_packages;
create policy ad_packages_active_read on public.ad_packages
  for select to authenticated
  using (is_active or (select joykin_private.is_admin()));

drop policy if exists ad_packages_admin_insert on public.ad_packages;
create policy ad_packages_admin_insert on public.ad_packages
  for insert to authenticated
  with check ((select joykin_private.is_admin()));

drop policy if exists ad_packages_admin_update on public.ad_packages;
create policy ad_packages_admin_update on public.ad_packages
  for update to authenticated
  using ((select joykin_private.is_admin()))
  with check ((select joykin_private.is_admin()));

drop policy if exists ad_packages_admin_delete on public.ad_packages;
create policy ad_packages_admin_delete on public.ad_packages
  for delete to authenticated
  using ((select joykin_private.is_admin()));

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  cuisine_categories text[] not null default '{}'::text[],
  phone text check (phone is null or char_length(phone) between 8 and 30),
  address text not null check (char_length(btrim(address)) between 3 and 500),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'suspended')),
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 500),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists restaurants_status_idx on public.restaurants(status);
create index if not exists restaurants_location_idx on public.restaurants(latitude, longitude)
  where status = 'approved';

alter table public.restaurants enable row level security;
revoke all on public.restaurants from public, anon, authenticated;
grant select, insert, update, delete on public.restaurants to authenticated;
grant all on public.restaurants to service_role;

drop policy if exists restaurants_read on public.restaurants;
create policy restaurants_read on public.restaurants
  for select to authenticated
  using (
    status = 'approved'
    or owner_user_id = (select auth.uid())
    or (select joykin_private.is_admin())
  );

drop policy if exists restaurants_member_insert on public.restaurants;
create policy restaurants_member_insert on public.restaurants
  for insert to authenticated
  with check (
    owner_user_id = (select auth.uid())
    and exists (
      select 1 from public.users
      where id = (select auth.uid()) and not coalesce(is_guest, false)
    )
  );

drop policy if exists restaurants_owner_update on public.restaurants;
create policy restaurants_owner_update on public.restaurants
  for update to authenticated
  using (owner_user_id = (select auth.uid()) or (select joykin_private.is_admin()))
  with check (owner_user_id = (select auth.uid()) or (select joykin_private.is_admin()));

drop policy if exists restaurants_owner_delete on public.restaurants;
create policy restaurants_owner_delete on public.restaurants
  for delete to authenticated
  using (
    (owner_user_id = (select auth.uid()) and status in ('pending', 'rejected'))
    or (select joykin_private.is_admin())
  );

create or replace function joykin_private.guard_restaurant_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_is_admin boolean := joykin_private.is_admin();
  is_registered boolean;
begin
  if caller_is_admin then
    if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
      new.approved_by := caller_id;
      new.approved_at := now();
      new.rejection_reason := null;
    elsif new.status <> 'approved' then
      new.approved_by := null;
      new.approved_at := null;
    end if;
    return new;
  end if;

  select exists (
    select 1 from public.users
    where id = caller_id and not coalesce(is_guest, false)
  ) into is_registered;

  if caller_id is null or not is_registered then
    raise exception 'A registered member account is required';
  end if;

  if tg_op = 'INSERT' then
    new.owner_user_id := caller_id;
  elsif old.owner_user_id <> caller_id then
    raise exception 'Restaurant ownership mismatch';
  else
    new.owner_user_id := old.owner_user_id;
  end if;

  new.status := 'pending';
  new.rejection_reason := null;
  new.approved_by := null;
  new.approved_at := null;
  return new;
end
$$;

revoke all on function joykin_private.guard_restaurant_write() from public, anon, authenticated;

drop trigger if exists restaurants_guard_write on public.restaurants;
create trigger restaurants_guard_write
before insert or update on public.restaurants
for each row execute function joykin_private.guard_restaurant_write();

drop trigger if exists restaurants_touch_updated_at on public.restaurants;
create trigger restaurants_touch_updated_at
before update on public.restaurants
for each row execute function joykin_private.touch_updated_at();

drop trigger if exists ad_packages_touch_updated_at on public.ad_packages;
create trigger ad_packages_touch_updated_at
before update on public.ad_packages
for each row execute function joykin_private.touch_updated_at();

alter table public.advertisements
  add column if not exists restaurant_id uuid references public.restaurants(id) on delete cascade,
  add column if not exists package_id uuid references public.ad_packages(id) on delete restrict,
  add column if not exists priority_weight numeric(8,2) not null default 1,
  add column if not exists daily_impression_limit integer not null default 300,
  add column if not exists duration_days smallint not null default 30,
  add column if not exists status text not null default 'active',
  add column if not exists payment_status text not null default 'pending',
  add column if not exists payment_reference text,
  add column if not exists paid_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists target_radius_km numeric(6,2),
  add column if not exists target_latitude double precision,
  add column if not exists target_longitude double precision,
  add column if not exists target_categories text[] not null default '{}'::text[],
  add column if not exists target_start_time time,
  add column if not exists target_end_time time,
  add column if not exists target_days smallint[] not null default array[0,1,2,3,4,5,6]::smallint[],
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'advertisements_priority_weight_check') then
    alter table public.advertisements add constraint advertisements_priority_weight_check
      check (priority_weight between 0.01 and 1000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'advertisements_daily_limit_check') then
    alter table public.advertisements add constraint advertisements_daily_limit_check
      check (daily_impression_limit between 1 and 10000000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'advertisements_duration_days_check') then
    alter table public.advertisements add constraint advertisements_duration_days_check
      check (duration_days between 1 and 365);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'advertisements_status_check') then
    alter table public.advertisements add constraint advertisements_status_check
      check (status in ('draft', 'pending_review', 'active', 'rejected', 'paused', 'expired'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'advertisements_payment_status_check') then
    alter table public.advertisements add constraint advertisements_payment_status_check
      check (payment_status in ('pending', 'confirmed', 'waived', 'refunded'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'advertisements_radius_check') then
    alter table public.advertisements add constraint advertisements_radius_check
      check (target_radius_km is null or target_radius_km between 0.1 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'advertisements_target_latitude_check') then
    alter table public.advertisements add constraint advertisements_target_latitude_check
      check (target_latitude is null or target_latitude between -90 and 90);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'advertisements_target_longitude_check') then
    alter table public.advertisements add constraint advertisements_target_longitude_check
      check (target_longitude is null or target_longitude between -180 and 180);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'advertisements_target_days_check') then
    alter table public.advertisements add constraint advertisements_target_days_check
      check (target_days <@ array[0,1,2,3,4,5,6]::smallint[]);
  end if;
end
$$;

create index if not exists advertisements_restaurant_id_idx on public.advertisements(restaurant_id);
create index if not exists advertisements_package_id_idx on public.advertisements(package_id);
create index if not exists advertisements_approved_by_idx on public.advertisements(approved_by);
create index if not exists restaurants_approved_by_idx on public.restaurants(approved_by);
create index if not exists advertisements_status_window_idx
  on public.advertisements(status, starts_at, ends_at)
  where is_active;

create or replace function joykin_private.guard_advertisement_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_is_admin boolean := joykin_private.is_admin();
  selected_package public.ad_packages%rowtype;
  selected_restaurant public.restaurants%rowtype;
  is_registered boolean;
begin
  if new.package_id is not null then
    select * into selected_package
    from public.ad_packages
    where id = new.package_id and (is_active or caller_is_admin);
    if not found then raise exception 'Advertising package is unavailable'; end if;

    new.payment_amount := selected_package.price_amount;
    new.priority_weight := selected_package.priority_weight;
    new.daily_impression_limit := selected_package.daily_impression_limit;
    new.duration_days := selected_package.duration_days;
  end if;

  if caller_is_admin then
    if new.package_id is not null and new.status = 'active'
      and new.payment_status not in ('confirmed', 'waived') then
      raise exception 'Payment must be confirmed before activation';
    end if;
    if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
      new.is_active := true;
      new.starts_at := now();
      new.ends_at := now() + make_interval(days => new.duration_days);
      new.approved_by := caller_id;
      new.approved_at := now();
      new.rejection_reason := null;
      if new.payment_status in ('confirmed', 'waived') then
        new.paid_at := coalesce(new.paid_at, now());
      end if;
    elsif new.status <> 'active' then
      new.is_active := false;
    end if;
    return new;
  end if;

  select exists (
    select 1 from public.users
    where id = caller_id and not coalesce(is_guest, false)
  ) into is_registered;
  if caller_id is null or not is_registered then
    raise exception 'A registered member account is required';
  end if;
  if new.package_id is null then raise exception 'An advertising package is required'; end if;
  if new.restaurant_id is null then raise exception 'A restaurant account is required'; end if;

  select * into selected_restaurant
  from public.restaurants
  where id = new.restaurant_id
    and owner_user_id = caller_id
    and status = 'approved';
  if not found then raise exception 'An approved restaurant account is required'; end if;

  if tg_op = 'UPDATE' and old.created_by <> caller_id then
    raise exception 'Campaign ownership mismatch';
  end if;

  new.created_by := caller_id;
  new.target_latitude := selected_restaurant.latitude;
  new.target_longitude := selected_restaurant.longitude;
  new.status := 'pending_review';
  new.is_active := false;
  new.rejection_reason := null;
  new.approved_by := null;
  new.approved_at := null;
  if tg_op = 'INSERT' then
    new.payment_status := 'pending';
    new.payment_reference := null;
    new.paid_at := null;
  else
    new.payment_status := old.payment_status;
    new.payment_reference := old.payment_reference;
    new.paid_at := old.paid_at;
  end if;
  return new;
end
$$;

revoke all on function joykin_private.guard_advertisement_write() from public, anon, authenticated;

drop trigger if exists advertisements_guard_write on public.advertisements;
create trigger advertisements_guard_write
before insert or update on public.advertisements
for each row execute function joykin_private.guard_advertisement_write();

drop policy if exists advertisements_active_read on public.advertisements;
create policy advertisements_active_read on public.advertisements
  for select to authenticated
  using (
    status = 'active'
    and is_active
    and starts_at <= now()
    and (ends_at is null or ends_at > now())
  );

drop policy if exists advertisements_restaurant_owner_read on public.advertisements;
create policy advertisements_restaurant_owner_read on public.advertisements
  for select to authenticated
  using (
    exists (
      select 1 from public.restaurants
      where id = restaurant_id and owner_user_id = (select auth.uid())
    )
  );

drop policy if exists advertisements_restaurant_owner_insert on public.advertisements;
create policy advertisements_restaurant_owner_insert on public.advertisements
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1 from public.restaurants
      where id = restaurant_id
        and owner_user_id = (select auth.uid())
        and status = 'approved'
    )
  );

drop policy if exists advertisements_restaurant_owner_update on public.advertisements;
create policy advertisements_restaurant_owner_update on public.advertisements
  for update to authenticated
  using (
    created_by = (select auth.uid())
    and status in ('draft', 'pending_review', 'rejected', 'paused')
  )
  with check (created_by = (select auth.uid()));

drop policy if exists advertisements_restaurant_owner_delete on public.advertisements;
create policy advertisements_restaurant_owner_delete on public.advertisements
  for delete to authenticated
  using (
    created_by = (select auth.uid())
    and status in ('draft', 'pending_review', 'rejected')
  );

create table if not exists public.ad_daily_stats (
  advertisement_id uuid not null references public.advertisements(id) on delete cascade,
  stat_date date not null default current_date,
  impressions integer not null default 0 check (impressions >= 0),
  clicks integer not null default 0 check (clicks >= 0),
  updated_at timestamptz not null default now(),
  primary key (advertisement_id, stat_date)
);

alter table public.ad_daily_stats enable row level security;
revoke all on public.ad_daily_stats from public, anon, authenticated;
grant select on public.ad_daily_stats to authenticated;
grant all on public.ad_daily_stats to service_role;

drop policy if exists ad_daily_stats_owner_read on public.ad_daily_stats;
create policy ad_daily_stats_owner_read on public.ad_daily_stats
  for select to authenticated
  using (
    (select joykin_private.is_admin())
    or exists (
      select 1
      from public.advertisements a
      join public.restaurants r on r.id = a.restaurant_id
      where a.id = advertisement_id and r.owner_user_id = (select auth.uid())
    )
  );

create or replace function public.get_targeted_ads(
  p_lat double precision default null,
  p_lng double precision default null,
  p_limit integer default 20
)
returns table (
  id uuid,
  title text,
  image_url text,
  target_url text,
  priority_weight numeric,
  package_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  local_now timestamp := timezone('Asia/Bangkok', now());
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_lat is not null and (p_lat < -90 or p_lat > 90) then raise exception 'Invalid latitude'; end if;
  if p_lng is not null and (p_lng < -180 or p_lng > 180) then raise exception 'Invalid longitude'; end if;

  return query
  with recent_interests as (
    select distinct lower(btrim(h.food_category)) as category
    from public.history h
    where h.user_id = auth.uid()
      and h.food_category is not null
      and btrim(h.food_category) <> ''
    order by lower(btrim(h.food_category))
    limit 20
  )
  select
    a.id,
    a.title,
    a.image_url,
    a.target_url,
    a.priority_weight,
    p.name
  from public.advertisements a
  left join public.ad_packages p on p.id = a.package_id
  left join public.ad_daily_stats s
    on s.advertisement_id = a.id
   and s.stat_date = local_now::date
  where a.status = 'active'
    and a.is_active
    and a.starts_at <= now()
    and (a.ends_at is null or a.ends_at > now())
    and coalesce(s.impressions, 0) < a.daily_impression_limit
    and (
      cardinality(a.target_days) = 0
      or extract(dow from local_now)::smallint = any(a.target_days)
    )
    and (
      a.target_start_time is null or a.target_end_time is null
      or (a.target_start_time <= a.target_end_time and local_now::time between a.target_start_time and a.target_end_time)
      or (a.target_start_time > a.target_end_time and (local_now::time >= a.target_start_time or local_now::time <= a.target_end_time))
    )
    and (
      cardinality(a.target_categories) = 0
      or exists (
        select 1 from recent_interests i
        where i.category = any (
          select lower(btrim(category)) from unnest(a.target_categories) as category
        )
      )
    )
    and (
      a.target_radius_km is null
      or (
        p_lat is not null and p_lng is not null
        and 6371 * acos(least(1, greatest(-1,
          cos(radians(p_lat)) * cos(radians(a.target_latitude))
          * cos(radians(a.target_longitude) - radians(p_lng))
          + sin(radians(p_lat)) * sin(radians(a.target_latitude))
        ))) <= a.target_radius_km
      )
    )
  order by a.priority_weight desc, a.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
end
$$;

revoke all on function public.get_targeted_ads(double precision, double precision, integer) from public, anon;
grant execute on function public.get_targeted_ads(double precision, double precision, integer) to authenticated, service_role;

create or replace function public.record_ad_event(p_ad_id uuid, p_event_type text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_event_type not in ('impression', 'click') then raise exception 'Invalid event type'; end if;
  if not exists (
    select 1 from public.advertisements
    where id = p_ad_id
      and status = 'active'
      and is_active
      and starts_at <= now()
      and (ends_at is null or ends_at > now())
  ) then
    return;
  end if;

  insert into public.ad_daily_stats (advertisement_id, stat_date, impressions, clicks)
  values (
    p_ad_id,
    timezone('Asia/Bangkok', now())::date,
    case when p_event_type = 'impression' then 1 else 0 end,
    case when p_event_type = 'click' then 1 else 0 end
  )
  on conflict (advertisement_id, stat_date) do update set
    impressions = public.ad_daily_stats.impressions
      + case when p_event_type = 'impression' then 1 else 0 end,
    clicks = public.ad_daily_stats.clicks
      + case when p_event_type = 'click' then 1 else 0 end,
    updated_at = now();
end
$$;

revoke all on function public.record_ad_event(uuid, text) from public, anon;
grant execute on function public.record_ad_event(uuid, text) to authenticated, service_role;

drop policy if exists advertisement_images_admin_read on storage.objects;
drop policy if exists advertisement_images_admin_insert on storage.objects;
drop policy if exists advertisement_images_admin_update on storage.objects;
drop policy if exists advertisement_images_admin_delete on storage.objects;
drop policy if exists advertisement_images_business_read on storage.objects;
drop policy if exists advertisement_images_business_insert on storage.objects;
drop policy if exists advertisement_images_business_update on storage.objects;
drop policy if exists advertisement_images_business_delete on storage.objects;

create policy advertisement_images_business_read on storage.objects
  for select to authenticated
  using (bucket_id = 'advertisements');

create policy advertisement_images_business_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'advertisements'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (
      (select joykin_private.is_admin())
      or exists (
        select 1 from public.restaurants
        where owner_user_id = (select auth.uid()) and status = 'approved'
      )
    )
  );

create policy advertisement_images_business_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'advertisements'
    and (
      (select joykin_private.is_admin())
      or (storage.foldername(name))[1] = (select auth.uid())::text
    )
  )
  with check (
    bucket_id = 'advertisements'
    and (
      (select joykin_private.is_admin())
      or (storage.foldername(name))[1] = (select auth.uid())::text
    )
  );

create policy advertisement_images_business_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'advertisements'
    and (
      (select joykin_private.is_admin())
      or (storage.foldername(name))[1] = (select auth.uid())::text
    )
  );

-- Keep one permissive policy per advertisement action. This avoids evaluating
-- several overlapping policies for every carousel and dashboard query.
drop policy if exists advertisements_read on public.advertisements;
drop policy if exists advertisements_active_read on public.advertisements;
drop policy if exists advertisements_admin_read on public.advertisements;
drop policy if exists advertisements_restaurant_owner_read on public.advertisements;
drop policy if exists advertisements_admin_insert on public.advertisements;
drop policy if exists advertisements_restaurant_owner_insert on public.advertisements;
drop policy if exists advertisements_admin_update on public.advertisements;
drop policy if exists advertisements_restaurant_owner_update on public.advertisements;
drop policy if exists advertisements_admin_delete on public.advertisements;
drop policy if exists advertisements_restaurant_owner_delete on public.advertisements;
drop policy if exists advertisements_business_select on public.advertisements;
drop policy if exists advertisements_business_insert on public.advertisements;
drop policy if exists advertisements_business_update on public.advertisements;
drop policy if exists advertisements_business_delete on public.advertisements;

create policy advertisements_business_select on public.advertisements
  for select to authenticated
  using (
    (status = 'active' and is_active and starts_at <= now() and (ends_at is null or ends_at > now()))
    or (select joykin_private.is_admin())
    or exists (
      select 1 from public.restaurants
      where id = restaurant_id and owner_user_id = (select auth.uid())
    )
  );

create policy advertisements_business_insert on public.advertisements
  for insert to authenticated
  with check (
    ((select joykin_private.is_admin()) and created_by = (select auth.uid()))
    or (
      created_by = (select auth.uid())
      and exists (
        select 1 from public.restaurants
        where id = restaurant_id
          and owner_user_id = (select auth.uid())
          and status = 'approved'
      )
    )
  );

create policy advertisements_business_update on public.advertisements
  for update to authenticated
  using (
    (select joykin_private.is_admin())
    or (created_by = (select auth.uid()) and status in ('draft', 'pending_review', 'rejected', 'paused'))
  )
  with check (
    (select joykin_private.is_admin())
    or created_by = (select auth.uid())
  );

create policy advertisements_business_delete on public.advertisements
  for delete to authenticated
  using (
    (select joykin_private.is_admin())
    or (created_by = (select auth.uid()) and status in ('draft', 'pending_review', 'rejected'))
  );
