-- Case types and records the way they looked before per-case-type statuses:
-- records carry a free-text `status`, case types have no statuses, and one
-- attribute is named "Status". A later migration requires both status
-- columns, drops `individuals.status`, and reserves the attribute name, so
-- those are lifted first and the backfill replays against the shape it was
-- written for. Every fixture id starts with `ab`.
begin;

alter table public.individuals
add column if not exists status text not null default 'active';

alter table public.individuals
alter column status_id
drop not null;

alter table public.concepts
alter column default_status_id
drop not null;

alter table public.concept_attributes
drop constraint if exists concept_attributes__name_not_reserved;

insert into auth.users (id, email, aud, role)
values ('ab000001-0000-4000-8000-000000000001'::uuid, 'statuses_backfill@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values ('ab001001-0000-4000-8000-000000000001'::uuid, 'ab000001-0000-4000-8000-000000000001'::uuid, 'statuses backfill ws', 'statuses-backfill-ws')
on conflict (id) do nothing;

-- One case type whose records use statuses beyond Active, in mixed case and
-- with stray whitespace, and one with no records at all.
insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation)
values
  ('ab002001-0000-4000-8000-000000000001'::uuid, 'ab000001-0000-4000-8000-000000000001'::uuid, 'ab001001-0000-4000-8000-000000000001'::uuid, 'backfill case type with records', true),
  ('ab002002-0000-4000-8000-000000000002'::uuid, 'ab000001-0000-4000-8000-000000000001'::uuid, 'ab001001-0000-4000-8000-000000000001'::uuid, 'backfill case type without records', true);

-- "Name" is each case type's label. "Status" collides with the built-in
-- status column.
insert into public.concept_attributes (
  id, workspace_id, concept_id, name, data_type, mapping_type,
  is_label, is_identifier, is_array, allow_manual_edit
)
values
  ('ab003001-0000-4000-8000-000000000001'::uuid, 'ab001001-0000-4000-8000-000000000001'::uuid, 'ab002001-0000-4000-8000-000000000001'::uuid, 'Name', 'varchar', 'manual_entry', true, false, false, false),
  ('ab003002-0000-4000-8000-000000000002'::uuid, 'ab001001-0000-4000-8000-000000000001'::uuid, 'ab002001-0000-4000-8000-000000000001'::uuid, 'Status', 'varchar', 'manual_entry', false, false, false, false),
  ('ab003003-0000-4000-8000-000000000003'::uuid, 'ab001001-0000-4000-8000-000000000001'::uuid, 'ab002002-0000-4000-8000-000000000002'::uuid, 'Name', 'varchar', 'manual_entry', true, false, false, false);

insert into public.individuals (id, workspace_id, concept_id, external_id, name, status)
values
  ('ab004001-0000-4000-8000-000000000001'::uuid, 'ab001001-0000-4000-8000-000000000001'::uuid, 'ab002001-0000-4000-8000-000000000001'::uuid, 'ext-1', 'Record one', 'active'),
  ('ab004002-0000-4000-8000-000000000002'::uuid, 'ab001001-0000-4000-8000-000000000001'::uuid, 'ab002001-0000-4000-8000-000000000001'::uuid, 'ext-2', 'Record two', 'Closed'),
  ('ab004003-0000-4000-8000-000000000003'::uuid, 'ab001001-0000-4000-8000-000000000001'::uuid, 'ab002001-0000-4000-8000-000000000001'::uuid, 'ext-3', 'Record three', 'closed'),
  ('ab004004-0000-4000-8000-000000000004'::uuid, 'ab001001-0000-4000-8000-000000000001'::uuid, 'ab002001-0000-4000-8000-000000000001'::uuid, 'ext-4', 'Record four', ' escalated '),
  ('ab004005-0000-4000-8000-000000000005'::uuid, 'ab001001-0000-4000-8000-000000000001'::uuid, 'ab002001-0000-4000-8000-000000000001'::uuid, 'ext-5', 'Record five', 'INACTIVE'),
  ('ab004006-0000-4000-8000-000000000006'::uuid, 'ab001001-0000-4000-8000-000000000001'::uuid, 'ab002001-0000-4000-8000-000000000001'::uuid, 'ext-6', 'Record six', '');
