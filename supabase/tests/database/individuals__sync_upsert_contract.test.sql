\set ON_ERROR_STOP on

/**
 * Contract test for the incremental sync upsert shape used by
 * `generateIndividuals` (src/views/OntologyDesignerApp/ConceptMetaView/
 * generateIndividuals/index.ts).
 *
 * The application never includes `id`, `status`, or `assigned_to` in the
 * upsert payload it sends to Postgres. This locks in that Postgres's
 * `ON CONFLICT ... DO UPDATE SET` genuinely leaves an omitted column alone,
 * rather than relying only on a mocked unit test for that guarantee.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values ('b4000001-0000-4000-8000-000000000001'::uuid, 'sync_contract_owner@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4000001-0000-4000-8000-000000000001'::uuid, 'sync contract ws', 'sync-contract-ws')
on conflict (id) do nothing;

insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation)
values ('b4002001-0000-4000-8000-000000000001'::uuid, 'b4000001-0000-4000-8000-000000000001'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'sync contract concept', true)
on conflict (id) do nothing;

insert into public.individuals (id, workspace_id, concept_id, external_id, name, status, assigned_to)
values (
  'b4003001-0000-4000-8000-000000000001'::uuid,
  'b4001001-0000-4000-8000-000000000001'::uuid,
  'b4002001-0000-4000-8000-000000000001'::uuid,
  'ext-sync-contract-1',
  'Original Name',
  'confirmed',
  'b4000001-0000-4000-8000-000000000001'::uuid
)
on conflict (id) do nothing;

select plan(4);

-- The exact upsert shape `generateIndividuals` issues: only
-- workspace_id, concept_id, external_id, name, and missing_from_source_at.
insert into public.individuals (workspace_id, concept_id, external_id, name, missing_from_source_at)
values (
  'b4001001-0000-4000-8000-000000000001'::uuid,
  'b4002001-0000-4000-8000-000000000001'::uuid,
  'ext-sync-contract-1',
  'Updated Name',
  null
)
on conflict (concept_id, external_id) do update set
  name = excluded.name,
  missing_from_source_at = excluded.missing_from_source_at;

select is(
  (select id from public.individuals where external_id = 'ext-sync-contract-1'),
  'b4003001-0000-4000-8000-000000000001'::uuid,
  'the upsert never assigns a new id to an existing individual'
);

select is(
  (select status from public.individuals where external_id = 'ext-sync-contract-1'),
  'confirmed',
  'the upsert leaves an existing status untouched'
);

select is(
  (select assigned_to from public.individuals where external_id = 'ext-sync-contract-1'),
  'b4000001-0000-4000-8000-000000000001'::uuid,
  'the upsert leaves an existing assigned_to untouched'
);

select is(
  (select name from public.individuals where external_id = 'ext-sync-contract-1'),
  'Updated Name',
  'the upsert still updates the column it does name'
);

select * from finish();

rollback;
