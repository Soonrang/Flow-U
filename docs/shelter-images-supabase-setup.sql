-- FlowU shelter image and admin permission setup
-- Admin rule: public.users.role = 'ADMIN'
-- Run this whole file in the Supabase SQL Editor.

-- 1. Required columns
alter table public.shelters
  add column if not exists image_urls text[] default '{}';

alter table public.users
  add column if not exists role text default 'USER';

alter table public.users
  alter column role set default 'USER';

-- 2. Grants used by the browser client
grant usage on schema public to anon, authenticated;
grant select on public.users to authenticated;
grant select on public.shelters to anon, authenticated;
grant insert, update on public.shelters to authenticated;

-- 3. Admin helper for RLS and RPC
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and upper(trim(coalesce(role, ''))) = 'ADMIN'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- 4. Storage bucket
insert into storage.buckets (id, name, public)
values ('shelter-images', 'shelter-images', true)
on conflict (id) do update set public = excluded.public;

-- 5. Drop old/wide policies before recreating the intended policies
drop policy if exists "Users can read own profile" on public.users;
drop policy if exists "Anon shelter image upload" on storage.objects;
drop policy if exists "Authenticated shelter image upload" on storage.objects;
drop policy if exists "Authenticated shelter image update" on storage.objects;
drop policy if exists "Authenticated shelter image delete" on storage.objects;
drop policy if exists "Admins can upload shelter images" on storage.objects;
drop policy if exists "Admins can update shelter images" on storage.objects;
drop policy if exists "Admins can delete shelter images" on storage.objects;
drop policy if exists "Public shelter image read" on storage.objects;
drop policy if exists "Anon shelter insert" on public.shelters;
drop policy if exists "Anon shelter update" on public.shelters;
drop policy if exists "Authenticated shelter insert" on public.shelters;
drop policy if exists "Authenticated shelter update" on public.shelters;
drop policy if exists "Public can read approved shelters" on public.shelters;
drop policy if exists "Admins can read shelters" on public.shelters;
drop policy if exists "Admins can insert shelters" on public.shelters;
drop policy if exists "Admins can update shelters" on public.shelters;

-- 6. Users can read their own role for the admin gate
create policy "Users can read own profile"
on public.users
for select
to authenticated
using (id = auth.uid());

-- 7. Public map reads approved shelters; admins can read all shelters
create policy "Public can read approved shelters"
on public.shelters
for select
to anon, authenticated
using (
  use_yn = 'Y'
  and aprv_status = 'Y'
  and coalesce(del_yn, 'N') = 'N'
);

create policy "Admins can read shelters"
on public.shelters
for select
to authenticated
using (public.is_admin());

-- 8. Admin-only shelter writes
create policy "Admins can insert shelters"
on public.shelters
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update shelters"
on public.shelters
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 9. Shelter images are public to read; admins can write
create policy "Public shelter image read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'shelter-images');

create policy "Admins can upload shelter images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'shelter-images'
  and public.is_admin()
);

create policy "Admins can update shelter images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'shelter-images'
  and public.is_admin()
)
with check (
  bucket_id = 'shelter-images'
  and public.is_admin()
);

create policy "Admins can delete shelter images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'shelter-images'
  and public.is_admin()
);

-- 10. Admin shelter update RPC.
-- The function checks ADMIN role internally and updates with security definer privileges.
drop function if exists public.admin_update_shelter(
  bigint,
  text,
  text,
  text,
  text,
  double precision,
  double precision,
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  text[]
);

drop function if exists public.admin_update_shelter(jsonb);

create or replace function public.admin_update_shelter(p_payload jsonb)
returns public.shelters
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row public.shelters;
  next_image_urls text[];
begin
  if not public.is_admin() then
    raise exception 'ADMIN role required';
  end if;

  select coalesce(array_agg(value), '{}')
  into next_image_urls
  from jsonb_array_elements_text(coalesce(p_payload -> 'image_urls', '[]'::jsonb)) as value;

  update public.shelters
  set
    name = p_payload ->> 'name',
    address = p_payload ->> 'address',
    sido = nullif(p_payload ->> 'sido', ''),
    sigungu = nullif(p_payload ->> 'sigungu', ''),
    latitude = (p_payload ->> 'latitude')::double precision,
    longitude = (p_payload ->> 'longitude')::double precision,
    phone_number = nullif(p_payload ->> 'phone_number', ''),
    description = nullif(p_payload ->> 'description', ''),
    link_url = nullif(p_payload ->> 'link_url', ''),
    applicant_id = p_payload ->> 'applicant_id',
    animal_type = (p_payload ->> 'animal_type')::integer,
    use_yn = p_payload ->> 'use_yn',
    operating_hours = nullif(p_payload ->> 'operating_hours', ''),
    image_urls = next_image_urls,
    updated_at = now()
  where id = (p_payload ->> 'id')::bigint
  returning * into updated_row;

  if updated_row.id is null then
    raise exception 'Shelter not found: %', p_payload ->> 'id';
  end if;

  return updated_row;
end;
$$;

grant execute on function public.admin_update_shelter(jsonb) to authenticated;

-- 11. Refresh PostgREST schema cache
notify pgrst, 'reload schema';
