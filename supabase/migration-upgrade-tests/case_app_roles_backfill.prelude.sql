-- Role groups the way they look before the case apps existed: built-in
-- groups with no case_types or case_records row, a custom group holding a
-- data_sources role, a custom group holding none, and a custom group that
-- already holds a case_types role of its own. Identifiers are `ca0`-prefixed
-- so the assertions read these fixtures only, whatever else the database
-- holds.
begin;

insert into auth.users (id, email, aud, role)
values (
  'ca000001-0000-4000-8000-000000000001'::uuid,
  'case_app_roles_backfill@test.dev',
  'authenticated',
  'authenticated'
);

-- Creating the workspace seeds its built-in groups with the case apps
-- already, so those rows are removed to recreate the shape the backfill
-- meets on an existing workspace.
insert into public.workspaces (id, owner_id, name, slug)
values (
  'ca001001-0000-4000-8000-000000000001'::uuid,
  'ca000001-0000-4000-8000-000000000001'::uuid,
  'case app roles backfill',
  'case-app-roles-backfill'
);

delete from public.role_group_app_roles rgar
using public.role_groups rg
where
  rg.id = rgar.role_group_id and
  rg.workspace_id = 'ca001001-0000-4000-8000-000000000001'::uuid and
  rgar.app::text in ('case_types', 'case_records');

insert into public.role_groups (id, workspace_id, name, is_builtin)
values
  ('ca002001-0000-4000-8000-000000000001'::uuid, 'ca001001-0000-4000-8000-000000000001'::uuid, 'Backfill data editor', false),
  ('ca002002-0000-4000-8000-000000000002'::uuid, 'ca001001-0000-4000-8000-000000000001'::uuid, 'Backfill dashboards only', false),
  ('ca002003-0000-4000-8000-000000000003'::uuid, 'ca001001-0000-4000-8000-000000000001'::uuid, 'Backfill existing case role', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('ca002001-0000-4000-8000-000000000001'::uuid, 'data_sources', 'editor'),
  ('ca002002-0000-4000-8000-000000000002'::uuid, 'dashboards', 'viewer'),
  ('ca002003-0000-4000-8000-000000000003'::uuid, 'data_sources', 'admin'),
  ('ca002003-0000-4000-8000-000000000003'::uuid, 'case_types', 'viewer');
