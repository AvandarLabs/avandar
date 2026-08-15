grant
select
,
  insert,
update,
delete on table public.maps to authenticated;

grant
select
  on table public.maps to anon;

grant all on table public.maps to service_role;
