-- Keep the active-ad and administrator cases in one SELECT policy so Postgres
-- evaluates a single permissive branch for each advertisement row.
drop policy if exists advertisements_active_read on public.advertisements;
drop policy if exists advertisements_admin_read on public.advertisements;

create policy advertisements_read on public.advertisements
  for select to authenticated
  using (
    (select joykin_private.is_admin())
    or (
      is_active
      and starts_at <= now()
      and (ends_at is null or ends_at > now())
    )
  );
