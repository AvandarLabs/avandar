-- Backfills `case_types` and `case_records` rows in role_group_app_roles for
-- role groups that predate those apps. Without this, `UserAppRolesMatrix`
-- reads the missing rows as "no access", existing members lose the Case
-- Manager and the Records pages, and their case-type and record writes fail
-- RLS.
--
-- Built-in groups are re-seeded through the seeding helper, which is
-- idempotent. Custom groups mirror their `data_sources` role into both apps,
-- because case types and their records are built from workspace data. A
-- group with no `data_sources` row deliberately gets neither row: it was
-- never granted the data its case types read.

-- Built-in role groups: the seeding helper now includes both case apps and
-- does nothing to rows that already exist.
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

-- Custom (non-built-in) role groups: mirror the group's data_sources role
-- into both case apps. A case row the group already holds is left alone.
insert into
  public.role_group_app_roles (
    role_group_id,
    app,
    role
  )
select
  data_sources_role.role_group_id,
  case_app.app,
  data_sources_role.role
from
  public.role_group_app_roles data_sources_role
  join public.role_groups rg on rg.id = data_sources_role.role_group_id
  cross join (
    values
      ('case_types'::public.app_type),
      ('case_records'::public.app_type)
  ) as case_app (app)
where
  data_sources_role.app = 'data_sources'::public.app_type and
  not rg.is_builtin
on conflict (
  role_group_id,
  app
) do nothing;
