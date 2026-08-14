-- Backfills `gis` rows in role_group_app_roles for role groups that predate the
-- `gis` app_type. Without this, `UserAppRolesMatrix` reads the missing row as
-- "no access" and existing members lose the GIS app.
--
-- Built-in groups are re-seeded through the seeding helper, which is idempotent.
-- Custom groups mirror their `dashboards` role, because maps are a
-- visualization surface and `dashboards` is its closest existing analogue. A
-- group with no `dashboards` row deliberately gets no `gis` row: it was never
-- granted a visualization app and must not gain one silently.

-- Built-in role groups: the seeding helper now includes `gis` and does nothing
-- to rows that already exist.
do $$
declare
  v_workspace_id uuid;
begin
  for v_workspace_id in
    select id from public.workspaces
  loop
    perform public.util__seed_builtin_role_groups_for_workspace (v_workspace_id);
  end loop;
end;
$$;

-- Custom (non-built-in) role groups: mirror the group's dashboards role.
insert into
  public.role_group_app_roles (
    role_group_id,
    app,
    role
  )
select
  dashboards_role.role_group_id,
  'gis'::public.app_type,
  dashboards_role.role
from
  public.role_group_app_roles dashboards_role
  join public.role_groups rg on rg.id = dashboards_role.role_group_id
where
  dashboards_role.app = 'dashboards'::public.app_type and
  not rg.is_builtin
on conflict (
  role_group_id,
  app
) do nothing;
