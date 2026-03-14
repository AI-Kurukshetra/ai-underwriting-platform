create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

revoke all on function public.current_organization_id() from public;
grant execute on function public.current_organization_id() to authenticated;
grant execute on function public.current_organization_id() to service_role;

drop policy if exists "profiles can read own organization" on public.profiles;

create policy "profiles can read own profile" on public.profiles
for select using (id = auth.uid());
