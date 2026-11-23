# Joined Cases 7: Key Matching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a case type match keys that differ in spacing, case, symbols, or leading zeros, and translate one dataset's IDs through an ID lookup table, with one key expression shared by Sync and the concept view and a sync notice for every ID left out.

**Architecture:** Each identifier mapping stores `key_normalizations` and an optional lookup (`crosswalk_*`, all or none). `buildRecordKeySql` turns one dataset row's key into its record key, or NULL when a lookup finds no row or more than one record key. Sync stages those keys and counts the ones left out; the view compares the spine's key against the same expression in every source branch; the lookup dataset is a contributing dataset, so it is allowlisted, leased, loaded, and projected like any other. Authoring asks for normalizations once per case type and for a lookup per source dataset, in the form, on the draft card, and in chat.

**Tech Stack:** Postgres (Supabase declarative schema, pgTAP), TypeScript, Zod, React, Mantine, Lingui, DuckDB (QETL, executed Vitest tests), Deno edge functions, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-06-joined-cases-7-key-matching-design.md`. Section numbers (§) refer to it unless they say "umbrella". **Overview and ground rules:** `docs/superpowers/plans/2026-11-06-joined-cases.md`.

**Prerequisite:** plans 1 to 6 have landed on `feat/joined-cases`. Spec §3 lists what this plan assumes from each. Before Task 1, confirm three of them:

```bash
rg -n "getEntityKeyComparisonSql" src
rg -n "export type ConceptAttributeSource|export type RecordKeySource" src
rg -n "name: string;" shared/models/ontology/Individual/Individual.types.ts
```

Expected: the first lists only `duckDbSqlText.ts` and `conceptRelation/buildStackedSourceRowsSql/buildStackedSourceRowsSql.ts` (plan 5's `_buildSourceRowsSql`, the one place the view compares keys, for all three value shapes); the second finds `ConceptAttributeSource` in that same file and `RecordKeySource` in `generateIndividuals/buildRecordKeyStagingSql/buildRecordKeyStagingSql.ts` (plan 6); the third finds nothing (plan 6 dropped `individuals.name`). If the first lists `buildAttributeValueSql.ts`, `buildBucketedListValueSql.ts`, or `generateIndividuals.ts`, an earlier plan has not landed: stop. (Plan 1 deleted `AttributeAssertionClient`, `ConceptWrapper`, and `getSQLSelectOfMapping`; the rule SQL lives in `buildAttributeValueSql`, which no longer compares keys itself.)

---

## Required skills

- **`supabase-declarative-schema`** before Tasks 1 and 2 (`agent-skills/public-skills/skills/supabase-declarative-schema/SKILL.md`). Edit `supabase/schemas/`, run `pnpm db:reset`, then immediately `pnpm db:new-migration <name>`. Never hand-edit a generated migration.
- **`test-driven-development`** throughout.
- **`duckdb-docs`** if a DuckDB function in Task 6 behaves differently than this plan says.
- Not `impeccable`: the checkbox group and the lookup fields extend existing surfaces (the form and the draft card), they do not create one (overview ground rule 9).

## Database command rule

Every step that runs `pnpm db:reset`, `pnpm db:new-migration`, or `pnpm test:db` starts with:

```bash
ava supabase status
```

Expected: the first line says this branch is on a switched local Supabase database named `feat-joined-cases`. If it says `This is the develop local Supabase`, stop and run `ava supabase switch`, then check again. If `ava` is missing, run `pnpm build:ava-cli`.

## Migration order (do not deviate)

| Order | Migration | Kind | Contents |
| --- | --- | --- | --- |
| 1 | `<ts>_add_key_matching_to_dataset_column_mappings.sql` | generated | the enum, four columns, the all-or-none check |
| 2 | `<ts>_write_key_matching_in_rpc_concepts__create.sql` | generated | `rpc_concepts__create` writes the four columns |

## File map

| File | Responsibility |
| --- | --- |
| `supabase/schemas/00.enum.attribute_mappings__key_normalization.sql` (new) | The enum, in application order |
| `supabase/schemas/30.attribute_mappings__dataset_column.sql` | Four columns and `attribute_mappings__dataset_column__crosswalk_all_or_none` |
| `supabase/schemas/50.rpc_concepts__create.sql` | Writes the four columns |
| `supabase/tests/database/attribute_mappings__dataset_column__key_matching.test.sql` (new) | Default, all-or-none, enum labels |
| `supabase/tests/database/rpc_concepts__create.test.sql` | The RPC stores key matching |
| `shared/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types.ts` | Key matching fields and types |
| `.../DatasetColumnMapping/DatasetColumnMapping.ts` (new) | Main entry: namespace plus value module |
| `.../DatasetColumnMapping/DatasetColumnMappingModule/DatasetColumnMappingModule.ts` (new, with test) | Canonical order, lookup triple, lookup issues, key column ids |
| `.../DatasetColumnMapping/DatasetColumnMappingParsers.ts` (with new test) | Reads and writes the new columns |
| `src/clients/DuckDbClient/duckDbSqlText.ts` (with new executed test) | `buildRecordKeySql`; `getEntityKeyComparisonSql` deleted |
| `src/clients/qetl/QueryMediator/conceptRelation/getRecordKeyMatchingFromMapping/` (new, with test) | Mapping row to `RecordKeyMatching`, failing closed |
| `src/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata.ts` | Record key per dataset; lookup datasets contribute |
| `src/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql.ts` | Fetches lookup columns |
| `src/clients/qetl/QueryMediator/conceptRelation/buildStackedSourceRowsSql/buildStackedSourceRowsSql.ts` | `ConceptAttributeSource` gains `keyMatching`; `_buildSourceRowsSql` filters through `buildRecordKeySql` |
| `src/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery.ts` | Lookup columns projected |
| `src/clients/qetl/QueryMediator/conceptRelation/loadConceptSpine/loadConceptSpine.ts` | Docstring names `buildRecordKeySql` |
| `src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/buildRecordKeyStagingSql/` (plan 6's, with its executed test) | `RecordKeySource` gains `keyMatching`; staging arms use `buildRecordKeySql`; left-out-ID count and needed columns added |
| `src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/generateIndividuals.ts` | Record key sources, left-out counts, notice |
| `src/lib/utils/state/JobProgressStore/JobProgressStore.ts`, `src/components/JobProgressPanel/JobProgressIndicator.tsx` | Notice entry |
| `shared/types/chat.types.ts` | `ChatCaseKeyNormalization`, `ChatCaseKeyCrosswalk`, the two fields |
| `supabase/functions/chat/PostChatMessages/parsing/parseCaseKeyMatching/` (new, with test) | Shared parsing of both fields |
| `supabase/functions/chat/PostChatMessages/parsing/parseProposeCaseType.ts`, `parseCreateCaseTypes.ts` | Use it |
| `supabase/functions/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.ts`, `buildCaseManagerSystemPrompt.ts` | Tool schemas and rules |
| `src/views/OntologyDesignerApp/applyKeyMatchingToIdentifierAttributes/` (new, with test) | Writes key matching onto every source of the ID field that plan 5's `makeAttributesWithIdentifierFromKeyColumns` builds |
| `src/views/OntologyDesignerApp/createdCaseTypeToFormValues/createdCaseTypeToFormValues.ts`, `proposedCaseTypeToCreatedCaseType/proposedCaseTypeToCreatedCaseType.ts` | Carry and resolve key matching |
| `src/components/caseKeyMatching/` (new) | Labels hook, issue message hook, checkbox group, lookup fields |
| `src/components/ChatPanel/CaseTypeDraftBlock/useCaseTypeDraftEditor.ts`, `CaseTypeDraftCard.tsx`, `CaseTypeDraftSourceSection.tsx` | Card editing |
| `src/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes.ts`, `index.tsx`, `DatasetColumnAttributesBlock/index.tsx`, `DatasetColumnAttributesBlock/KeyMatchingBlock/KeyMatchingBlock.tsx` (new) | Form editing |
| `tests/data/key-matching/patients.csv`, `lab-results.csv` (new) | E2E fixtures |
| `tests/e2e/case-key-matching.spec.ts` (new) | End to end |
| `docs/ontology-architecture.md` | Key matching everywhere it applies |

---

## Task 1: Enum, columns, and the all-or-none check

**Files:**
- Create: `supabase/schemas/00.enum.attribute_mappings__key_normalization.sql`
- Modify: `supabase/schemas/30.attribute_mappings__dataset_column.sql` (end of the column list)
- Create: `supabase/tests/database/attribute_mappings__dataset_column__key_matching.test.sql`
- Create: `supabase/migrations/<ts>_add_key_matching_to_dataset_column_mappings.sql` (generated)
- Modify: `shared/types/database.types.ts` (generated)

- [ ] **Step 1: Check the Supabase switch**

Run: `ava supabase status`
Expected: the first line names `feat-joined-cases`.

- [ ] **Step 2: Write the failing pgTAP test**

Create `supabase/tests/database/attribute_mappings__dataset_column__key_matching.test.sql`:

```sql
\set ON_ERROR_STOP on

/**
 * Key matching on `attribute_mappings__dataset_column`: a mapping compares
 * keys exactly unless it names normalizations, and an ID lookup table is
 * named by its dataset and both of its columns, or not at all.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values ('b7000001-0000-4000-8000-000000000001'::uuid, 'key_matching@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values ('b7001001-0000-4000-8000-000000000001'::uuid, 'b7000001-0000-4000-8000-000000000001'::uuid, 'key matching ws', 'key-matching-ws')
on conflict (id) do nothing;

insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id)
values ('b7002001-0000-4000-8000-000000000001'::uuid, 'b7000001-0000-4000-8000-000000000001'::uuid, 'b7001001-0000-4000-8000-000000000001'::uuid, 'key matching case type', false, 'b7003001-0000-4000-8000-000000000001'::uuid);

insert into public.concept_statuses (id, workspace_id, concept_id, name, color, position)
values ('b7003001-0000-4000-8000-000000000001'::uuid, 'b7001001-0000-4000-8000-000000000001'::uuid, 'b7002001-0000-4000-8000-000000000001'::uuid, 'Active', '#40c057', 0);

-- One statement, so the label trigger sees exactly one label. Each mapping
-- below gets its own attribute, so no insert collides with another.
insert into public.concept_attributes (id, workspace_id, concept_id, name, data_type, mapping_type, is_label, is_identifier, is_array, allow_manual_edit, value_picker_rule_type)
values
  ('b7004001-0000-4000-8000-000000000001'::uuid, 'b7001001-0000-4000-8000-000000000001'::uuid, 'b7002001-0000-4000-8000-000000000001'::uuid, 'key a', 'varchar', 'dataset_column', true, true, false, false, 'first'),
  ('b7004002-0000-4000-8000-000000000002'::uuid, 'b7001001-0000-4000-8000-000000000001'::uuid, 'b7002001-0000-4000-8000-000000000001'::uuid, 'key b', 'varchar', 'dataset_column', false, true, false, false, 'first'),
  ('b7004003-0000-4000-8000-000000000003'::uuid, 'b7001001-0000-4000-8000-000000000001'::uuid, 'b7002001-0000-4000-8000-000000000001'::uuid, 'key c', 'varchar', 'dataset_column', false, true, false, false, 'first'),
  ('b7004004-0000-4000-8000-000000000004'::uuid, 'b7001001-0000-4000-8000-000000000001'::uuid, 'b7002001-0000-4000-8000-000000000001'::uuid, 'key d', 'varchar', 'dataset_column', false, true, false, false, 'first'),
  ('b7004005-0000-4000-8000-000000000005'::uuid, 'b7001001-0000-4000-8000-000000000001'::uuid, 'b7002001-0000-4000-8000-000000000001'::uuid, 'key e', 'varchar', 'dataset_column', false, true, false, false, 'first'),
  ('b7004006-0000-4000-8000-000000000006'::uuid, 'b7001001-0000-4000-8000-000000000001'::uuid, 'b7002001-0000-4000-8000-000000000001'::uuid, 'key f', 'varchar', 'dataset_column', false, true, false, false, 'first');

-- A mapping written the way every mapping before key matching was.
insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, dataset_id, dataset_column_id)
values ('b7001001-0000-4000-8000-000000000001'::uuid, 'b7004001-0000-4000-8000-000000000001'::uuid, 'b7005001-0000-4000-8000-000000000001'::uuid, 'b7006001-0000-4000-8000-000000000001'::uuid);

select plan (7);

-- 1.
select is (
  (select key_normalizations from public.attribute_mappings__dataset_column where concept_attribute_id = 'b7004001-0000-4000-8000-000000000001'::uuid),
  '{}'::public.attribute_mappings__key_normalization[],
  'a mapping that names no normalizations compares keys exactly'
);

-- 2.
select is (
  (select num_nulls(crosswalk_dataset_id, crosswalk_source_key_column_id, crosswalk_record_key_column_id) from public.attribute_mappings__dataset_column where concept_attribute_id = 'b7004001-0000-4000-8000-000000000001'::uuid),
  3,
  'a mapping that names no ID lookup table has none'
);

-- 3.
select lives_ok (
  $t3$
  insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, dataset_id, dataset_column_id, key_normalizations, crosswalk_dataset_id, crosswalk_source_key_column_id, crosswalk_record_key_column_id)
  values ('b7001001-0000-4000-8000-000000000001'::uuid, 'b7004002-0000-4000-8000-000000000002'::uuid, 'b7005002-0000-4000-8000-000000000002'::uuid, 'b7006002-0000-4000-8000-000000000002'::uuid, array['trim', 'strip_leading_zeros']::public.attribute_mappings__key_normalization[], 'b7005001-0000-4000-8000-000000000001'::uuid, 'b7006003-0000-4000-8000-000000000003'::uuid, 'b7006004-0000-4000-8000-000000000004'::uuid);
  $t3$,
  'a mapping can name normalizations and a whole ID lookup table'
);

-- 4.
select throws_ok (
  $t4$
  insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, dataset_id, dataset_column_id, crosswalk_dataset_id)
  values ('b7001001-0000-4000-8000-000000000001'::uuid, 'b7004003-0000-4000-8000-000000000003'::uuid, 'b7005002-0000-4000-8000-000000000002'::uuid, 'b7006002-0000-4000-8000-000000000002'::uuid, 'b7005001-0000-4000-8000-000000000001'::uuid);
  $t4$,
  '23514',
  null,
  'an ID lookup table without its columns is rejected'
);

-- 5.
select throws_ok (
  $t5$
  insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, dataset_id, dataset_column_id, crosswalk_dataset_id, crosswalk_source_key_column_id)
  values ('b7001001-0000-4000-8000-000000000001'::uuid, 'b7004004-0000-4000-8000-000000000004'::uuid, 'b7005002-0000-4000-8000-000000000002'::uuid, 'b7006002-0000-4000-8000-000000000002'::uuid, 'b7005001-0000-4000-8000-000000000001'::uuid, 'b7006003-0000-4000-8000-000000000003'::uuid);
  $t5$,
  '23514',
  null,
  'an ID lookup table missing its record key column is rejected'
);

-- 6.
select throws_ok (
  $t6$
  insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, dataset_id, dataset_column_id, crosswalk_record_key_column_id)
  values ('b7001001-0000-4000-8000-000000000001'::uuid, 'b7004005-0000-4000-8000-000000000005'::uuid, 'b7005002-0000-4000-8000-000000000002'::uuid, 'b7006002-0000-4000-8000-000000000002'::uuid, 'b7006004-0000-4000-8000-000000000004'::uuid);
  $t6$,
  '23514',
  null,
  'a record key column without its ID lookup table is rejected'
);

-- 7.
select throws_ok (
  $t7$
  insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, dataset_id, dataset_column_id, key_normalizations)
  values ('b7001001-0000-4000-8000-000000000001'::uuid, 'b7004006-0000-4000-8000-000000000006'::uuid, 'b7005002-0000-4000-8000-000000000002'::uuid, 'b7006002-0000-4000-8000-000000000002'::uuid, array['uppercase']::public.attribute_mappings__key_normalization[]);
  $t7$,
  '22P02',
  null,
  'an unknown normalization is rejected'
);

select * from finish ();

rollback;
```

If plan 5 left `value_picker_rule_type` off `concept_attributes` for some shape, or made another column required, match the column list to `supabase/schemas/20.concept_attributes.sql`; the assertions do not change.

- [ ] **Step 3: Run the test to verify it fails**

Run: `ava supabase status && pnpm test:db`
Expected: FAIL in `attribute_mappings__dataset_column__key_matching.test.sql` with `column "key_normalizations" does not exist`.

- [ ] **Step 4: Add the enum**

Create `supabase/schemas/00.enum.attribute_mappings__key_normalization.sql`:

```sql
/**
 * One way an identifier mapping cleans its dataset's keys before they are
 * compared. A mapping applies its set in the order declared here, whatever
 * order it stores them in.
 *
 * Enum values:
 *
 * `trim` - Removes spaces, tabs, newlines, and other Unicode spaces at either
 *  end.
 *
 * `lowercase` - Lowercases every letter.
 *
 * `alphanumeric_only` - Keeps only letters and digits. Runs before
 *  `strip_leading_zeros`, so `#007` loses its symbol and then its zeros.
 *
 * `strip_leading_zeros` - Removes leading zeros, keeping a lone `0`.
 *
 * Note: The declared order is the order of application. Keep new values at
 * the end only if they apply last; otherwise the application order in
 * `DatasetColumnMappingModule.KEY_NORMALIZATIONS` must change with it.
 */
create type public.attribute_mappings__key_normalization as enum(
  'trim',
  'lowercase',
  'alphanumeric_only',
  'strip_leading_zeros'
);
```

- [ ] **Step 5: Add the columns and the check**

In `supabase/schemas/30.attribute_mappings__dataset_column.sql`, append to the end of the `create table public.attribute_mappings__dataset_column (...)` column list (after the last column plan 5 left, adding a comma to it):

```sql
  -- How this mapping's dataset keys are cleaned before they are compared.
  -- Empty compares them exactly. Only read on an identifier field's mapping.
  key_normalizations public.attribute_mappings__key_normalization[] not null default '{}',
  -- An ID lookup table that translates this mapping's dataset keys into
  -- record keys: the lookup dataset, its column holding this dataset's keys,
  -- and its column holding the record key. No foreign keys, matching
  -- `dataset_id` and `dataset_column_id`. Only read on an identifier field's
  -- mapping.
  crosswalk_dataset_id uuid,
  crosswalk_source_key_column_id uuid,
  crosswalk_record_key_column_id uuid,
  -- A lookup is named whole or not at all.
  constraint attribute_mappings__dataset_column__crosswalk_all_or_none check (
    num_nulls(
      crosswalk_dataset_id,
      crosswalk_source_key_column_id,
      crosswalk_record_key_column_id
    ) in (0, 3)
  )
```

- [ ] **Step 6: Reset and generate the migration**

Run:

```bash
ava supabase status
pnpm db:reset
pnpm db:new-migration add_key_matching_to_dataset_column_mappings
```

Expected: one new file in `supabase/migrations/` that creates the type, adds the four columns, and adds the check. Open it and confirm it drops nothing. If it drops anything, this is the shared-stack bug in `CLAUDE.md`: reset, regenerate, compare.

- [ ] **Step 7: Run the test to verify it passes**

Run: `ava supabase status && pnpm test:db`
Expected: PASS, including the 7 new assertions.

- [ ] **Step 8: Regenerate database types**

Run: `pnpm db:gen-types`
Expected: `shared/types/database.types.ts` gains `attribute_mappings__key_normalization` under `Enums` and the four columns on `attribute_mappings__dataset_column`.

- [ ] **Step 9: Commit**

```bash
git add supabase/schemas/00.enum.attribute_mappings__key_normalization.sql \
  supabase/schemas/30.attribute_mappings__dataset_column.sql \
  supabase/tests/database/attribute_mappings__dataset_column__key_matching.test.sql \
  supabase/migrations/*_add_key_matching_to_dataset_column_mappings.sql \
  shared/types/database.types.ts
git commit -m "feat(joined-cases): store key normalizations and ID lookup tables on mappings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 2: `rpc_concepts__create` writes key matching

**Files:**
- Modify: `supabase/schemas/50.rpc_concepts__create.sql` (the `attribute_mappings__dataset_column` insert)
- Modify: `supabase/tests/database/rpc_concepts__create.test.sql`
- Create: `supabase/migrations/<ts>_write_key_matching_in_rpc_concepts__create.sql` (generated)

- [ ] **Step 1: Check the Supabase switch**

Run: `ava supabase status`
Expected: the first line names `feat-joined-cases`.

- [ ] **Step 2: Write the failing assertions**

In `supabase/tests/database/rpc_concepts__create.test.sql`, raise `select plan (N)` by 4, and add before `select * from finish ();`:

```sql
-- Key matching, on the shape plan 5 gives new case types: one ID field with
-- one source per dataset. The patients source compares keys exactly; the
-- labs source cleans its keys and translates them through the patients
-- dataset.
select lives_ok (
  $tkm$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"ac000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  select public.rpc_concepts__create (
    '{"id":"ac004071-0000-4000-8000-000000000071","workspace_id":"ac001001-0000-4000-8000-000000000001","name":"Key matching case type","description":null,"allow_manual_creation":false,"default_status_id":"ac005071-0000-4000-8000-000000000071"}'::jsonb,
    '[{"id":"ac006071-0000-4000-8000-000000000071","name":"Patient ID","description":null,"data_type":"varchar","mapping_type":"dataset_column","is_label":true,"is_identifier":true,"is_array":false,"allow_manual_edit":false,"value_picker_rule_type":"first"}]'::jsonb,
    '[{"concept_attribute_id":"ac006071-0000-4000-8000-000000000071","dataset_id":"ac007071-0000-4000-8000-000000000071","dataset_column_id":"ac008071-0000-4000-8000-000000000071","position":0},{"concept_attribute_id":"ac006071-0000-4000-8000-000000000071","dataset_id":"ac007072-0000-4000-8000-000000000072","dataset_column_id":"ac008072-0000-4000-8000-000000000072","position":1,"key_normalizations":["trim","strip_leading_zeros"],"crosswalk_dataset_id":"ac007071-0000-4000-8000-000000000071","crosswalk_source_key_column_id":"ac008073-0000-4000-8000-000000000073","crosswalk_record_key_column_id":"ac008071-0000-4000-8000-000000000071"}]'::jsonb,
    '[]'::jsonb,
    '[{"id":"ac005071-0000-4000-8000-000000000071","name":"Active","description":null,"color":"#40c057","position":0}]'::jsonb
  );
  $tkm$,
  'a Case Types editor creates a case type whose ID sources carry key matching'
);

reset role;

select is (
  (select key_normalizations from public.attribute_mappings__dataset_column where concept_attribute_id = 'ac006071-0000-4000-8000-000000000071'::uuid and dataset_id = 'ac007072-0000-4000-8000-000000000072'::uuid),
  array['trim', 'strip_leading_zeros']::public.attribute_mappings__key_normalization[],
  'the RPC stores the normalizations its payload names'
);

select is (
  (select array[crosswalk_dataset_id, crosswalk_source_key_column_id, crosswalk_record_key_column_id] from public.attribute_mappings__dataset_column where concept_attribute_id = 'ac006071-0000-4000-8000-000000000071'::uuid and dataset_id = 'ac007072-0000-4000-8000-000000000072'::uuid),
  array['ac007071-0000-4000-8000-000000000071', 'ac008073-0000-4000-8000-000000000073', 'ac008071-0000-4000-8000-000000000071']::uuid[],
  'the RPC stores the ID lookup table its payload names'
);

select is (
  (select key_normalizations from public.attribute_mappings__dataset_column where concept_attribute_id = 'ac006071-0000-4000-8000-000000000071'::uuid and dataset_id = 'ac007071-0000-4000-8000-000000000071'::uuid),
  '{}'::public.attribute_mappings__key_normalization[],
  'a source sent without normalizations compares keys exactly'
);
```

The `ac…071` series is unused by plans 3 and 5, which add their own cases to this file. If plan 5's payload keys differ from `position` and the attribute's `value_picker_rule_type`, copy them from the test's earlier dataset-column case; the four assertions do not change.

- [ ] **Step 3: Run the test to verify it fails**

Run: `ava supabase status && pnpm test:db`
Expected: FAIL on "the RPC stores the normalizations its payload names": the RPC ignores the new keys, so the row holds `{}`.

- [ ] **Step 4: Write the columns in the RPC**

In `supabase/schemas/50.rpc_concepts__create.sql`, in the `insert into public.attribute_mappings__dataset_column` statement, keep every column plan 5 left and add the four new ones to all three lists:

```sql
  insert into public.attribute_mappings__dataset_column (
    -- ...the columns plan 5 left, unchanged...
    key_normalizations,
    crosswalk_dataset_id,
    crosswalk_source_key_column_id,
    crosswalk_record_key_column_id
  )
  select
    -- ...the values plan 5 left, unchanged...
    -- A payload without the key reads as NULL, which the not-null column
    -- would refuse, so a missing list means exact matching.
    coalesce(m.key_normalizations, '{}'),
    m.crosswalk_dataset_id,
    m.crosswalk_source_key_column_id,
    m.crosswalk_record_key_column_id
  from jsonb_to_recordset(p_dataset_column_mappings) as m (
    -- ...the record columns plan 5 left, unchanged...
    key_normalizations public.attribute_mappings__key_normalization[],
    crosswalk_dataset_id uuid,
    crosswalk_source_key_column_id uuid,
    crosswalk_record_key_column_id uuid
  );
```

Also add one line to the function's docstring under `@param p_dataset_column_mappings`: "Identifier mappings may carry `key_normalizations` and a whole ID lookup table (`crosswalk_*`)."

- [ ] **Step 5: Reset and generate the migration**

```bash
ava supabase status
pnpm db:reset
pnpm db:new-migration write_key_matching_in_rpc_concepts__create
```

Expected: one file that replaces `public.rpc_concepts__create` and drops nothing else.

- [ ] **Step 6: Run the test to verify it passes**

Run: `ava supabase status && pnpm test:db`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add supabase/schemas/50.rpc_concepts__create.sql \
  supabase/tests/database/rpc_concepts__create.test.sql \
  supabase/migrations/*_write_key_matching_in_rpc_concepts__create.sql
git commit -m "feat(joined-cases): write key matching in rpc_concepts__create

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 3: Desktop mirror

**Files:**
- Create: `apps/desktop/migrations/<ts>_add_key_matching_to_dataset_column_mappings.gen.sql` (generated)
- Create: `apps/desktop/migrations/<ts>_write_key_matching_in_rpc_concepts__create.gen.sql` (generated, if the generator emits one)

- [ ] **Step 1: Generate and check**

Run: `pnpm desktop:sqlite:gen-migrations && pnpm desktop:sqlite:check-migrations`
Expected: a generated migration that adds the four columns to `attribute_mappings__dataset_column`, with the array as `text not null default '[]'` (the transpiler turns Postgres arrays into JSON text, as it did for `data_catalog_listings.pipeline_scope_keys`). The check passes. If the generator lists a statement under "needs hand edit", follow the instructions it prints.

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/migrations/
git commit -m "chore(joined-cases): mirror mapping key matching to desktop SQLite

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 4: Model types and the `DatasetColumnMapping` module

**Files:**
- Modify: `shared/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types.ts`
- Create: `shared/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappingModule/DatasetColumnMappingModule.ts`
- Create: `shared/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappingModule/DatasetColumnMappingModule.test.ts`
- Create: `shared/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.ts`

If an earlier plan already created `DatasetColumnMapping.ts`, keep it and add the members below to it.

- [ ] **Step 1: Add the types**

In `DatasetColumnMapping.types.ts`, add after `ValuePickerRuleType` (or where plan 5 left the type exports):

```ts
/** One way an identifier mapping cleans its dataset's keys before matching. */
export type DatasetColumnMappingKeyNormalization =
  Enums<"attribute_mappings__key_normalization">;

/**
 * An ID lookup table: a dataset that translates an identifier mapping's
 * dataset keys into record keys.
 */
export type DatasetColumnMappingKeyCrosswalk = {
  datasetId: DatasetId;
  /** The lookup column holding the mapping's dataset keys. */
  sourceKeyColumnId: DatasetColumnId;
  /** The lookup column holding the record key each dataset key becomes. */
  recordKeyColumnId: DatasetColumnId;
};

/** An ID lookup table as an editor holds it, before all three are chosen. */
export type DatasetColumnMappingKeyCrosswalkDraft = Readonly<{
  datasetId?: string;
  sourceKeyColumnId?: string;
  recordKeyColumnId?: string;
}>;

/** What stops an ID lookup table draft from being used. */
export type DatasetColumnMappingKeyCrosswalkIssue = "incomplete" | "same_column";
```

Add to `DatasetColumnMappingRead`, after `datasetColumnId` (or after the last field plan 5 added):

```ts
  /**
   * How the mapping's dataset keys are cleaned before matching, applied in
   * a fixed order. Empty compares keys exactly. Only read on an identifier
   * field's mapping.
   */
  keyNormalizations: DatasetColumnMappingKeyNormalization[];

  /**
   * The ID lookup table this mapping's keys are translated through. The
   * three are set together or not at all. Only read on an identifier
   * field's mapping.
   */
  crosswalkDatasetId?: DatasetId;
  crosswalkSourceKeyColumnId?: DatasetColumnId;
  crosswalkRecordKeyColumnId?: DatasetColumnId;
```

Change the insert type so callers that predate key matching still compile:

```ts
type DatasetColumnMappingInsert = SetOptional<
  DatasetColumnMappingRead,
  "id" | "createdAt" | "updatedAt" | "keyNormalizations"
>;
```

(Keep any other key plan 5 added to that `SetOptional`.)

- [ ] **Step 2: Write the failing module test**

Create `DatasetColumnMappingModule/DatasetColumnMappingModule.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid.ts";
import { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.ts";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { DatasetColumnId } from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";

const LOOKUP_DATASET_ID = uuid<DatasetId>();
const KEY_COLUMN_ID = uuid<DatasetColumnId>();
const SOURCE_KEY_COLUMN_ID = uuid<DatasetColumnId>();
const RECORD_KEY_COLUMN_ID = uuid<DatasetColumnId>();

describe("DatasetColumnMapping.toCanonicalKeyNormalizations", () => {
  it("orders normalizations the way they apply, with symbols before leading zeros", () => {
    expect(
      DatasetColumnMapping.toCanonicalKeyNormalizations([
        "strip_leading_zeros",
        "alphanumeric_only",
        "trim",
      ]),
    ).toEqual(["trim", "alphanumeric_only", "strip_leading_zeros"]);
  });

  it("keeps one of each normalization and drops unknown values", () => {
    expect(
      DatasetColumnMapping.toCanonicalKeyNormalizations([
        "lowercase",
        "uppercase",
        "lowercase",
      ]),
    ).toEqual(["lowercase"]);
  });
});

describe("DatasetColumnMapping.getKeyCrosswalk", () => {
  it("returns the ID lookup table when all three parts are set", () => {
    expect(
      DatasetColumnMapping.getKeyCrosswalk({
        crosswalkDatasetId: LOOKUP_DATASET_ID,
        crosswalkSourceKeyColumnId: SOURCE_KEY_COLUMN_ID,
        crosswalkRecordKeyColumnId: RECORD_KEY_COLUMN_ID,
      }),
    ).toEqual({
      datasetId: LOOKUP_DATASET_ID,
      sourceKeyColumnId: SOURCE_KEY_COLUMN_ID,
      recordKeyColumnId: RECORD_KEY_COLUMN_ID,
    });
  });

  it("returns undefined when any part is missing", () => {
    expect(
      DatasetColumnMapping.getKeyCrosswalk({
        crosswalkDatasetId: LOOKUP_DATASET_ID,
        crosswalkSourceKeyColumnId: SOURCE_KEY_COLUMN_ID,
      }),
    ).toBeUndefined();
  });
});

describe("DatasetColumnMapping.getKeyCrosswalkIssue", () => {
  it("reports a draft without both columns as incomplete", () => {
    expect(
      DatasetColumnMapping.getKeyCrosswalkIssue({
        datasetId: LOOKUP_DATASET_ID,
        sourceKeyColumnId: SOURCE_KEY_COLUMN_ID,
      }),
    ).toBe("incomplete");
  });

  it("reports a draft that uses one column twice", () => {
    expect(
      DatasetColumnMapping.getKeyCrosswalkIssue({
        datasetId: LOOKUP_DATASET_ID,
        sourceKeyColumnId: SOURCE_KEY_COLUMN_ID,
        recordKeyColumnId: SOURCE_KEY_COLUMN_ID,
      }),
    ).toBe("same_column");
  });

  it("reports nothing for a finished draft", () => {
    expect(
      DatasetColumnMapping.getKeyCrosswalkIssue({
        datasetId: LOOKUP_DATASET_ID,
        sourceKeyColumnId: SOURCE_KEY_COLUMN_ID,
        recordKeyColumnId: RECORD_KEY_COLUMN_ID,
      }),
    ).toBeUndefined();
  });
});

describe("DatasetColumnMapping.toKeyCrosswalk", () => {
  it("returns undefined for a draft with an issue", () => {
    expect(
      DatasetColumnMapping.toKeyCrosswalk({ datasetId: LOOKUP_DATASET_ID }),
    ).toBeUndefined();
  });
});

describe("DatasetColumnMapping.getKeyColumnIds", () => {
  it("lists the key column, then the lookup's two columns", () => {
    expect(
      DatasetColumnMapping.getKeyColumnIds({
        datasetColumnId: KEY_COLUMN_ID,
        crosswalkDatasetId: LOOKUP_DATASET_ID,
        crosswalkSourceKeyColumnId: SOURCE_KEY_COLUMN_ID,
        crosswalkRecordKeyColumnId: RECORD_KEY_COLUMN_ID,
      }),
    ).toEqual([KEY_COLUMN_ID, SOURCE_KEY_COLUMN_ID, RECORD_KEY_COLUMN_ID]);
  });

  it("lists only the key column for a mapping without a lookup", () => {
    expect(
      DatasetColumnMapping.getKeyColumnIds({ datasetColumnId: KEY_COLUMN_ID }),
    ).toEqual([KEY_COLUMN_ID]);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test:frontend shared/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappingModule`
Expected: FAIL: cannot resolve `DatasetColumnMapping.ts`.

- [ ] **Step 4: Write the module**

Create `DatasetColumnMappingModule/DatasetColumnMappingModule.ts`:

```ts
import { registry } from "@avandar/utils";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { DatasetColumnId } from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";
import type {
  DatasetColumnMappingKeyCrosswalk,
  DatasetColumnMappingKeyCrosswalkDraft,
  DatasetColumnMappingKeyCrosswalkIssue,
  DatasetColumnMappingKeyNormalization,
} from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types.ts";

/**
 * Every key normalization, in the order they apply. Symbols go before leading
 * zeros so that `#007` becomes `7`: its zeros only reach the start once the
 * symbol is gone.
 */
const KEY_NORMALIZATIONS = registry<DatasetColumnMappingKeyNormalization>().keys(
  "trim",
  "lowercase",
  "alphanumeric_only",
  "strip_leading_zeros",
);

/** The three lookup columns of a mapping row, as the model reads them. */
type KeyCrosswalkFields = Readonly<{
  crosswalkDatasetId?: DatasetId;
  crosswalkSourceKeyColumnId?: DatasetColumnId;
  crosswalkRecordKeyColumnId?: DatasetColumnId;
}>;

function isKeyNormalization(
  value: string,
): value is DatasetColumnMappingKeyNormalization {
  return KEY_NORMALIZATIONS.some((normalization) => {
    return normalization === value;
  });
}

/**
 * The known normalizations among `values`, once each, in the order they
 * apply. Unknown values are dropped, so chat output can pass through it.
 */
function toCanonicalKeyNormalizations(
  values: readonly string[],
): DatasetColumnMappingKeyNormalization[] {
  return KEY_NORMALIZATIONS.filter((normalization) => {
    return values.includes(normalization);
  });
}

/** The mapping's ID lookup table, or undefined unless all three are set. */
function getKeyCrosswalk(
  mapping: KeyCrosswalkFields,
): DatasetColumnMappingKeyCrosswalk | undefined {
  const {
    crosswalkDatasetId,
    crosswalkSourceKeyColumnId,
    crosswalkRecordKeyColumnId,
  } = mapping;
  if (
    !crosswalkDatasetId ||
    !crosswalkSourceKeyColumnId ||
    !crosswalkRecordKeyColumnId
  ) {
    return undefined;
  }
  return {
    datasetId: crosswalkDatasetId,
    sourceKeyColumnId: crosswalkSourceKeyColumnId,
    recordKeyColumnId: crosswalkRecordKeyColumnId,
  };
}

/** What stops a lookup draft from being used, or undefined when nothing does. */
function getKeyCrosswalkIssue(
  draft: DatasetColumnMappingKeyCrosswalkDraft,
): DatasetColumnMappingKeyCrosswalkIssue | undefined {
  if (!draft.datasetId || !draft.sourceKeyColumnId || !draft.recordKeyColumnId) {
    return "incomplete";
  }
  return draft.sourceKeyColumnId === draft.recordKeyColumnId
    ? "same_column"
    : undefined;
}

/**
 * The ID lookup table a finished draft describes, or undefined while it has
 * an issue. A draft's ids come from the workspace catalog through the lookup
 * fields' selects, which only offer real dataset and column ids, so they are
 * branded here the way the parsers brand ids read from the database.
 */
function toKeyCrosswalk(
  draft: DatasetColumnMappingKeyCrosswalkDraft,
): DatasetColumnMappingKeyCrosswalk | undefined {
  const { datasetId, sourceKeyColumnId, recordKeyColumnId } = draft;
  if (
    getKeyCrosswalkIssue(draft) !== undefined ||
    !datasetId ||
    !sourceKeyColumnId ||
    !recordKeyColumnId
  ) {
    return undefined;
  }
  return {
    datasetId: datasetId as DatasetId,
    sourceKeyColumnId: sourceKeyColumnId as DatasetColumnId,
    recordKeyColumnId: recordKeyColumnId as DatasetColumnId,
  };
}

/** Every column a mapping's record key reads: its key, then its lookup's. */
function getKeyColumnIds(
  mapping: Readonly<{ datasetColumnId: DatasetColumnId }> & KeyCrosswalkFields,
): DatasetColumnId[] {
  const keyCrosswalk = getKeyCrosswalk(mapping);
  return keyCrosswalk
    ? [
        mapping.datasetColumnId,
        keyCrosswalk.sourceKeyColumnId,
        keyCrosswalk.recordKeyColumnId,
      ]
    : [mapping.datasetColumnId];
}

/** Key matching helpers for dataset-column mappings. */
export const DatasetColumnMappingModule = {
  KEY_NORMALIZATIONS,
  isKeyNormalization,
  toCanonicalKeyNormalizations,
  getKeyCrosswalk,
  getKeyCrosswalkIssue,
  toKeyCrosswalk,
  getKeyColumnIds,
};
```

- [ ] **Step 5: Write the main entry**

Create `DatasetColumnMapping.ts`:

```ts
/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  DatasetColumnMappingId,
  DatasetColumnMappingKeyCrosswalk,
  DatasetColumnMappingKeyCrosswalkDraft,
  DatasetColumnMappingKeyCrosswalkIssue,
  DatasetColumnMappingKeyNormalization,
  DatasetColumnMappingModel,
} from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types.ts";
import type { Simplify } from "type-fest";

export { DatasetColumnMappingModule as DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappingModule/DatasetColumnMappingModule.ts";

export namespace DatasetColumnMapping {
  export type T<K extends keyof DatasetColumnMappingModel = "Read"> = Simplify<
    DatasetColumnMappingModel[K]
  >;
  export type Id = DatasetColumnMappingId;
  export type KeyNormalization = DatasetColumnMappingKeyNormalization;
  export type KeyCrosswalk = DatasetColumnMappingKeyCrosswalk;
  export type KeyCrosswalkDraft = DatasetColumnMappingKeyCrosswalkDraft;
  export type KeyCrosswalkIssue = DatasetColumnMappingKeyCrosswalkIssue;
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm test:frontend shared/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappingModule`
Expected: PASS (10 tests).

- [ ] **Step 7: Commit**

```bash
git add shared/models/ontology/AttributeMapping/DatasetColumnMapping/
git commit -m "feat(joined-cases): add key matching to the dataset column mapping model

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 5: Parsers read and write key matching

**Files:**
- Modify: `shared/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappingParsers.ts`
- Create: `shared/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappingParsers.test.ts`
- Modify: every `DatasetColumnMapping` read fixture the type checker flags (Step 6)

- [ ] **Step 1: Write the failing test**

Create `DatasetColumnMappingParsers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid.ts";
import { DatasetColumnMappingParsers } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappingParsers.ts";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { DatasetColumnId } from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";
import type { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.ts";
import type { ConceptAttributeId } from "$/models/ontology/ConceptAttribute/ConceptAttribute.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

/**
 * A row as the database returns it for a mapping created before key
 * matching. Its columns follow `DatasetColumnMapping.T<"DBRead">`; if plan 5
 * renamed or added one, match the type.
 */
const DB_ROW: DatasetColumnMapping.T<"DBRead"> = {
  id: "00000000-0000-4000-8000-000000000001",
  workspace_id: "00000000-0000-4000-8000-000000000002",
  concept_attribute_id: "00000000-0000-4000-8000-000000000003",
  dataset_id: "00000000-0000-4000-8000-000000000004",
  dataset_column_id: "00000000-0000-4000-8000-000000000005",
  bucket_column_id: null,
  position: 0,
  key_normalizations: [],
  crosswalk_dataset_id: null,
  crosswalk_source_key_column_id: null,
  crosswalk_record_key_column_id: null,
  created_at: "2026-11-06T00:00:00.000Z",
  updated_at: "2026-11-06T00:00:00.000Z",
};

function _makeInsert(
  keyNormalizations: DatasetColumnMapping.KeyNormalization[] | undefined,
): DatasetColumnMapping.T<"Insert"> {
  return {
    type: "dataset_column",
    workspaceId: uuid<Workspace.Id>(),
    conceptAttributeId: uuid<ConceptAttributeId>(),
    datasetId: uuid<DatasetId>(),
    datasetColumnId: uuid<DatasetColumnId>(),
    position: 0,
    keyNormalizations,
  };
}

describe("DatasetColumnMappingParsers", () => {
  it("reads a row without key matching as exact matching with no lookup", () => {
    const mapping = DatasetColumnMappingParsers.fromDBReadToModelRead(DB_ROW);

    expect(mapping.keyNormalizations).toEqual([]);
    expect(mapping.crosswalkDatasetId).toBeUndefined();
    expect(mapping.crosswalkSourceKeyColumnId).toBeUndefined();
    expect(mapping.crosswalkRecordKeyColumnId).toBeUndefined();
  });

  it("writes normalizations once each, in the order they apply", () => {
    const row = DatasetColumnMappingParsers.fromModelInsertToDBInsert(
      _makeInsert(["strip_leading_zeros", "trim", "trim"]),
    );

    expect(row.key_normalizations).toEqual(["trim", "strip_leading_zeros"]);
  });

  it("writes an empty list for a draft that names no normalizations", () => {
    const row = DatasetColumnMappingParsers.fromModelInsertToDBInsert(
      _makeInsert(undefined),
    );

    expect(row.key_normalizations).toEqual([]);
  });
});
```

(Keep the insert fixture's fields equal to what plan 5's `T<"Insert">` requires; `keyNormalizations` is the subject.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend shared/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappingParsers`
Expected: FAIL: `DBReadSchema` rejects `key_normalizations`, or `key_normalizations` is undefined in the written row.

- [ ] **Step 3: Read the new columns**

In `DatasetColumnMappingParsers.ts`, import the module:

```ts
import { DatasetColumnMappingModule } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappingModule/DatasetColumnMappingModule.ts";
```

Add to `DBReadSchema`:

```ts
  key_normalizations: z.array(
    z.enum(DatasetColumnMappingModule.KEY_NORMALIZATIONS),
  ),
  crosswalk_dataset_id: z.uuid().nullable(),
  crosswalk_source_key_column_id: z.uuid().nullable(),
  crosswalk_record_key_column_id: z.uuid().nullable(),
```

In `fromDBReadToModelRead`'s returned object, add:

```ts
          keyNormalizations:
            DatasetColumnMappingModule.toCanonicalKeyNormalizations(
              obj.keyNormalizations ?? [],
            ),
          crosswalkDatasetId: obj.crosswalkDatasetId as DatasetId | undefined,
          crosswalkSourceKeyColumnId: obj.crosswalkSourceKeyColumnId as
            | DatasetColumnId
            | undefined,
          crosswalkRecordKeyColumnId: obj.crosswalkRecordKeyColumnId as
            | DatasetColumnId
            | undefined,
```

- [ ] **Step 4: Write the canonical list**

In `fromModelInsertToDBInsert`, make the first step of the `pipe` (the one that already fills defaults, or a new first step if plan 5 removed it) return:

```ts
      (input) => {
        return {
          ...input,
          // Stored canonical, so a row never depends on the order a form or
          // chat listed them in, and a missing list means exact matching.
          keyNormalizations:
            DatasetColumnMappingModule.toCanonicalKeyNormalizations(
              input.keyNormalizations ?? [],
            ),
        };
      },
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test:frontend shared/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappingParsers`
Expected: PASS (3 tests).

- [ ] **Step 6: Fix read fixtures the type checker flags**

Run: `pnpm type-check`
Expected: errors only where a `DatasetColumnMapping` read object is built by hand without `keyNormalizations`, today in `src/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql.test.ts`, `src/clients/qetl/QueryMediator/conceptRelation/__tests__/conceptAttributeColumns.integration.executed.test.ts`, and `src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/generateIndividuals.test.ts`. Add `keyNormalizations: []` to each flagged object, nothing else. Run `pnpm type-check` again; expected: clean.

- [ ] **Step 7: Run the affected tests**

Run: `pnpm test:frontend src/clients/qetl/QueryMediator/conceptRelation src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals src/clients/ontology/ConceptClient`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add shared/models/ontology/AttributeMapping/DatasetColumnMapping/ \
  src/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql.test.ts \
  src/clients/qetl/QueryMediator/conceptRelation/__tests__/conceptAttributeColumns.integration.executed.test.ts \
  src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/generateIndividuals.test.ts
git commit -m "feat(joined-cases): read and write mapping key matching in the parsers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 6: `buildRecordKeySql`

**Files:**
- Modify: `src/clients/DuckDbClient/duckDbSqlText.ts` (add after `getTableNameFromRowNumberedViewName`; `getEntityKeyComparisonSql` is deleted in Task 9)
- Create: `src/clients/DuckDbClient/duckDbSqlText.executed.test.ts`

The directory already holds per-module tests beside their modules (`duckDbCsvLoad.test.ts`, `duckDbParquetLoad.test.ts`), so this executed test sits beside `duckDbSqlText.ts` the same way.

- [ ] **Step 1: Write the failing executed test**

Create `src/clients/DuckDbClient/duckDbSqlText.executed.test.ts`:

```ts
/**
 * Executed tests for record keys. Each case runs the emitted expression in a
 * real DuckDB and asserts the keys it returns, because what matters is which
 * keys meet, not how the SQL reads.
 */
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import {
  buildRecordKeySql,
  escapeSqlSingleQuotedLiteral,
  EXACT_RECORD_KEY_MATCHING,
} from "@/clients/DuckDbClient/duckDbSqlText";
import { withDuckDb } from "../../../tests/integration/queries/executedDuckDb";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping";
import type { RecordKeyMatching } from "@/clients/DuckDbClient/duckDbSqlText";

const KEYS_DATASET_ID = uuid<Dataset.Id>();
const LOOKUP_DATASET_ID = uuid<Dataset.Id>();

const EVERY_NORMALIZATION: DatasetColumnMapping.KeyNormalization[] = [
  "trim",
  "lowercase",
  "alphanumeric_only",
  "strip_leading_zeros",
];

function _toSqlLiteral(value: string | null): string {
  return value === null ? "NULL" : `'${escapeSqlSingleQuotedLiteral(value)}'`;
}

function _toValuesSql(rows: ReadonlyArray<ReadonlyArray<string | null>>): string {
  return rows
    .map((row, rowIndex) => {
      return `(${[String(rowIndex), ...row.map(_toSqlLiteral)].join(", ")})`;
    })
    .join(", ");
}

/**
 * Each key's record key, in the order the keys were given. `lookupRows` pairs
 * a lookup key with a record key, and becomes a lookup dataset with columns
 * `lab_key` and `patient_key`.
 */
async function _readRecordKeys(
  options: Readonly<{
    keys: ReadonlyArray<string | null>;
    keyType?: "VARCHAR" | "BIGINT";
    keyMatching: RecordKeyMatching;
    lookupRows?: ReadonlyArray<readonly [string | null, string | null]>;
  }>,
): Promise<Array<string | null>> {
  return await withDuckDb(async (connection) => {
    await connection.run(`
      CREATE TABLE "${KEYS_DATASET_ID}" AS
      SELECT position, CAST(key AS ${options.keyType ?? "VARCHAR"}) AS key
      FROM (VALUES ${_toValuesSql(options.keys.map((key) => [key]))}) AS t(position, key)
    `);
    if (options.lookupRows) {
      await connection.run(`
        CREATE TABLE "${LOOKUP_DATASET_ID}" AS
        SELECT lab_key, patient_key
        FROM (VALUES ${_toValuesSql(options.lookupRows)}) AS t(position, lab_key, patient_key)
      `);
    }
    const recordKeySql = buildRecordKeySql({
      datasetAlias: "dataset",
      primaryKeyColumnName: "key",
      keyMatching: options.keyMatching,
    });
    const reader = await connection.runAndReadAll(
      `SELECT ${recordKeySql} AS record_key FROM "${KEYS_DATASET_ID}" dataset ORDER BY dataset.position`,
    );
    return reader.getRowObjects().map((row) => {
      return row.record_key === null ? null : String(row.record_key);
    });
  });
}

function _normalizedOnly(
  keyNormalizations: DatasetColumnMapping.KeyNormalization[],
): RecordKeyMatching {
  return { keyNormalizations, crosswalk: undefined };
}

const LOOKUP_MATCHING: RecordKeyMatching = {
  keyNormalizations: EVERY_NORMALIZATION,
  crosswalk: {
    datasetId: LOOKUP_DATASET_ID,
    sourceKeyColumnName: "lab_key",
    recordKeyColumnName: "patient_key",
  },
};

describe("buildRecordKeySql", () => {
  it("emits exactly today's text cast when nothing is normalized or translated", () => {
    expect(
      buildRecordKeySql({
        datasetAlias: "dataset",
        primaryKeyColumnName: "person_id",
        keyMatching: EXACT_RECORD_KEY_MATCHING,
      }),
    ).toBe(`CAST("dataset"."person_id" AS VARCHAR)`);
  });

  it("returns every text key unchanged when nothing is normalized or translated", async () => {
    const keys = [" P-001 ", "007", "Ab", "p-001", null];
    expect(
      await _readRecordKeys({ keys, keyMatching: EXACT_RECORD_KEY_MATCHING }),
    ).toEqual(keys);
  });

  it("returns a numeric key as its plain text when nothing is normalized or translated", async () => {
    expect(
      await _readRecordKeys({
        keys: ["7", "17"],
        keyType: "BIGINT",
        keyMatching: EXACT_RECORD_KEY_MATCHING,
      }),
    ).toEqual(["7", "17"]);
  });

  it("removes spaces, tabs, newlines, and non-breaking spaces at either end under trim", async () => {
    expect(
      await _readRecordKeys({
        keys: [" a ", "\ta\n", " a ", "a b"],
        keyMatching: _normalizedOnly(["trim"]),
      }),
    ).toEqual(["a", "a", "a", "a b"]);
  });

  it("lowercases accented letters under lowercase", async () => {
    expect(
      await _readRecordKeys({
        keys: ["ÉCOLE-P001"],
        keyMatching: _normalizedOnly(["lowercase"]),
      }),
    ).toEqual(["école-p001"]);
  });

  it("keeps only letters, including accented ones, and digits under alphanumeric_only", async () => {
    expect(
      await _readRecordKeys({
        keys: ["P-001", "José 01", "a_b.c"],
        keyMatching: _normalizedOnly(["alphanumeric_only"]),
      }),
    ).toEqual(["P001", "José01", "abc"]);
  });

  it("strips leading zeros but keeps a lone zero under strip_leading_zeros", async () => {
    expect(
      await _readRecordKeys({
        keys: ["007", "0", "000", "0A1", "100"],
        keyMatching: _normalizedOnly(["strip_leading_zeros"]),
      }),
    ).toEqual(["7", "0", "0", "A1", "100"]);
  });

  it("removes symbols before leading zeros whatever order the normalizations are stored in", async () => {
    const keys = ["#007"];
    expect(
      await _readRecordKeys({
        keys,
        keyMatching: _normalizedOnly(["strip_leading_zeros", "alphanumeric_only"]),
      }),
    ).toEqual(["7"]);
    expect(
      await _readRecordKeys({
        keys,
        keyMatching: _normalizedOnly(["alphanumeric_only", "strip_leading_zeros"]),
      }),
    ).toEqual(["7"]);
  });

  it("returns NULL for a key that normalizes to nothing", async () => {
    expect(
      await _readRecordKeys({
        keys: ["---", "   ", null],
        keyMatching: _normalizedOnly(["trim", "alphanumeric_only"]),
      }),
    ).toEqual([null, null, null]);
  });

  it("translates a key through the lookup when its rows name one record key after normalization", async () => {
    expect(
      await _readRecordKeys({
        keys: ["11", "22"],
        keyType: "BIGINT",
        keyMatching: LOOKUP_MATCHING,
        lookupRows: [
          ["011", "P-001"],
          ["11", "p001"],
          ["22", "P-002"],
        ],
      }),
    ).toEqual(["p001", "p002"]);
  });

  it("returns NULL for a key with no lookup row", async () => {
    expect(
      await _readRecordKeys({
        keys: ["44"],
        keyMatching: LOOKUP_MATCHING,
        lookupRows: [["11", "P-001"]],
      }),
    ).toEqual([null]);
  });

  it("returns NULL for a key whose lookup rows name two record keys", async () => {
    expect(
      await _readRecordKeys({
        keys: ["33"],
        keyMatching: LOOKUP_MATCHING,
        lookupRows: [
          ["33", "P-003"],
          ["33", "P-001"],
        ],
      }),
    ).toEqual([null]);
  });

  it("ignores lookup rows without a record key", async () => {
    expect(
      await _readRecordKeys({
        keys: ["55", "66"],
        keyMatching: LOOKUP_MATCHING,
        lookupRows: [
          ["55", null],
          ["55", "P-005"],
          ["66", null],
        ],
      }),
    ).toEqual(["p005", null]);
  });

  it("compares lookup keys exactly when nothing is normalized", async () => {
    expect(
      await _readRecordKeys({
        keys: ["011", "11"],
        keyMatching: {
          keyNormalizations: [],
          crosswalk: LOOKUP_MATCHING.crosswalk,
        },
        lookupRows: [["11", "P-001"]],
      }),
    ).toEqual([null, "P-001"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:executed src/clients/DuckDbClient/duckDbSqlText.executed.test.ts`
Expected: FAIL: `buildRecordKeySql` is not exported.

- [ ] **Step 3: Write `buildRecordKeySql`**

In `src/clients/DuckDbClient/duckDbSqlText.ts`, add the imports:

```ts
import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
```

and add after `getTableNameFromRowNumberedViewName`:

```ts
/** How one identifier mapping turns its dataset's key into a record key. */
export type RecordKeyMatching = Readonly<{
  keyNormalizations: readonly DatasetColumnMapping.KeyNormalization[];
  crosswalk: RecordKeyCrosswalk | undefined;
}>;

/** An ID lookup table, by column name, that translates a dataset key. */
export type RecordKeyCrosswalk = Readonly<{
  datasetId: Dataset.Id;
  sourceKeyColumnName: string;
  recordKeyColumnName: string;
}>;

/** Key matching that compares keys exactly, as every case type did before. */
export const EXACT_RECORD_KEY_MATCHING: RecordKeyMatching = {
  keyNormalizations: [],
  crosswalk: undefined,
};

/** True when the key matching changes nothing, so no key can be excluded. */
export function isExactRecordKeyMatching(
  keyMatching: RecordKeyMatching,
): boolean {
  return (
    keyMatching.crosswalk === undefined &&
    DatasetColumnMapping.toCanonicalKeyNormalizations(
      keyMatching.keyNormalizations,
    ).length === 0
  );
}

/**
 * The SQL each key normalization applies to a `VARCHAR` expression.
 *
 * DuckDB's regular expressions are RE2, so a pattern has no lookahead. `trim`
 * uses a pattern rather than DuckDB's `trim()`, which leaves tabs and
 * newlines in place. `alphanumeric_only` uses Unicode classes because RE2's
 * `[[:alnum:]]` is ASCII-only and would drop `é`. `strip_leading_zeros` keeps
 * the character after the zeros, so `0` and `000` both stay `0`, and `(?s)`
 * lets that character be a newline.
 */
const KEY_NORMALIZATION_SQL: Readonly<
  Record<DatasetColumnMapping.KeyNormalization, (expression: string) => string>
> = {
  trim: (expression) => {
    return `regexp_replace(${expression}, '^[\\s\\p{Z}]+|[\\s\\p{Z}]+$', '', 'g')`;
  },
  lowercase: (expression) => {
    return `lower(${expression})`;
  },
  alphanumeric_only: (expression) => {
    return `regexp_replace(${expression}, '[^\\p{L}\\p{N}]', '', 'g')`;
  },
  strip_leading_zeros: (expression) => {
    return `regexp_replace(${expression}, '(?s)^0+(.)', '\\1')`;
  },
};

/** The alias an ID lookup table is read under inside a record key. */
const CROSSWALK_ALIAS = "crosswalk";

/**
 * Casts a key to text and applies the normalizations in their fixed order.
 *
 * The cast is what lets a `BIGINT` key meet a text one: DuckDB resolves
 * `VARCHAR = BIGINT` by casting the text to a number, which throws on the
 * first id that is not numeric. With no normalization this is exactly the
 * cast every key had before key matching, so existing case types keep their
 * keys.
 */
function _buildNormalizedKeySql(
  options: Readonly<{
    keySql: string;
    keyNormalizations: readonly DatasetColumnMapping.KeyNormalization[];
  }>,
): string {
  const textKeySql = `CAST(${options.keySql} AS VARCHAR)`;
  const keyNormalizations = DatasetColumnMapping.toCanonicalKeyNormalizations(
    options.keyNormalizations,
  );
  if (keyNormalizations.length === 0) {
    return textKeySql;
  }
  const normalizedKeySql = keyNormalizations.reduce(
    (expression, keyNormalization) => {
      return KEY_NORMALIZATION_SQL[keyNormalization](expression);
    },
    textKeySql,
  );
  // A key that normalizes to nothing, such as `---` without its symbols, is
  // no key at all, and the spine refuses an empty one.
  return `NULLIF(${normalizedKeySql}, '')`;
}

/**
 * Builds the SQL expression that turns one dataset row's key into the record
 * key it belongs to, or NULL when it belongs to none.
 *
 * Sync selects it to stage record keys, and the concept view compares a
 * record's key against it in every source, so membership and values always
 * agree. A dataset key is cast to text and normalized. With an ID lookup
 * table it is then looked up: the record key is the one distinct normalized
 * record key among the lookup rows whose normalized source key equals it,
 * and NULL when there is no such row or the rows name two or more record
 * keys. Lookup rows without a record key are ignored.
 */
export function buildRecordKeySql(
  options: Readonly<{
    /** The alias the dataset row is read under, for example `dataset`. */
    datasetAlias: string;
    primaryKeyColumnName: string;
    keyMatching: RecordKeyMatching;
  }>,
): string {
  const { keyNormalizations, crosswalk } = options.keyMatching;
  const datasetKeySql = _buildNormalizedKeySql({
    keySql: `${quoteSqlIdentifier(options.datasetAlias)}.${quoteSqlIdentifier(options.primaryKeyColumnName)}`,
    keyNormalizations,
  });
  if (!crosswalk) {
    return datasetKeySql;
  }
  const buildLookupColumnSql = (columnName: string): string => {
    return _buildNormalizedKeySql({
      keySql: `${quoteSqlIdentifier(CROSSWALK_ALIAS)}.${quoteSqlIdentifier(columnName)}`,
      keyNormalizations,
    });
  };
  const recordKeySql = buildLookupColumnSql(crosswalk.recordKeyColumnName);
  return `(
    SELECT CASE WHEN count(DISTINCT ${recordKeySql}) = 1 THEN min(${recordKeySql}) END
    FROM ${quoteSqlIdentifier(crosswalk.datasetId)} ${quoteSqlIdentifier(CROSSWALK_ALIAS)}
    WHERE ${buildLookupColumnSql(crosswalk.sourceKeyColumnName)} = ${datasetKeySql}
  )`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:executed src/clients/DuckDbClient/duckDbSqlText.executed.test.ts`
Expected: PASS (14 tests).

- [ ] **Step 5: Commit**

```bash
git add src/clients/DuckDbClient/duckDbSqlText.ts src/clients/DuckDbClient/duckDbSqlText.executed.test.ts
git commit -m "feat(joined-cases): build record keys with normalization and ID lookup tables

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 7: `getRecordKeyMatchingFromMapping`

**Files:**
- Create: `src/clients/qetl/QueryMediator/conceptRelation/getRecordKeyMatchingFromMapping/getRecordKeyMatchingFromMapping.ts`
- Create: `src/clients/qetl/QueryMediator/conceptRelation/getRecordKeyMatchingFromMapping/getRecordKeyMatchingFromMapping.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { EXACT_RECORD_KEY_MATCHING } from "@/clients/DuckDbClient/duckDbSqlText";
import { getRecordKeyMatchingFromMapping } from "@/clients/qetl/QueryMediator/conceptRelation/getRecordKeyMatchingFromMapping/getRecordKeyMatchingFromMapping";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { Workspace } from "$/models/Workspace/Workspace";

const WORKSPACE_ID = uuid<Workspace.Id>();
const LABS_DATASET_ID = uuid<Dataset.Id>();
const LOOKUP_DATASET_ID = uuid<Dataset.Id>();
const OTHER_DATASET_ID = uuid<Dataset.Id>();
const LAB_NUMBER_COLUMN_ID = uuid<DatasetColumn.Id>();
const LOOKUP_LAB_COLUMN_ID = uuid<DatasetColumn.Id>();
const LOOKUP_PATIENT_COLUMN_ID = uuid<DatasetColumn.Id>();

function _makeColumn(options: {
  id: DatasetColumn.Id;
  datasetId: Dataset.Id;
  name: string;
}): DatasetColumn.T {
  return Model.make("DatasetColumn", {
    id: options.id,
    name: options.name,
    originalName: options.name,
    datasetId: options.datasetId,
    workspaceId: WORKSPACE_ID,
    description: undefined,
    dataType: "varchar" as const,
    detectedDataType: "VARCHAR" as const,
    originalDataType: "VARCHAR",
    columnIdx: 0,
    createdAt: "2026-11-06T00:00:00.000Z",
    updatedAt: "2026-11-06T00:00:00.000Z",
  });
}

function _makeMapping(
  overrides: Partial<DatasetColumnMapping.T>,
): DatasetColumnMapping.T {
  return {
    id: uuid<DatasetColumnMapping.Id>(),
    workspaceId: WORKSPACE_ID,
    type: "dataset_column",
    conceptAttributeId: uuid<ConceptAttribute.Id>(),
    datasetId: LABS_DATASET_ID,
    datasetColumnId: LAB_NUMBER_COLUMN_ID,
    bucketColumnId: undefined,
    position: 0,
    keyNormalizations: [],
    createdAt: "2026-11-06T00:00:00.000Z",
    updatedAt: "2026-11-06T00:00:00.000Z",
    ...overrides,
  };
}

const LOOKUP_COLUMNS = {
  [LOOKUP_LAB_COLUMN_ID]: _makeColumn({
    id: LOOKUP_LAB_COLUMN_ID,
    datasetId: LOOKUP_DATASET_ID,
    name: "lookup_lab_number",
  }),
  [LOOKUP_PATIENT_COLUMN_ID]: _makeColumn({
    id: LOOKUP_PATIENT_COLUMN_ID,
    datasetId: LOOKUP_DATASET_ID,
    name: "lookup_patient_id",
  }),
};

const WITH_LOOKUP = {
  keyNormalizations: ["strip_leading_zeros", "trim"],
  crosswalkDatasetId: LOOKUP_DATASET_ID,
  crosswalkSourceKeyColumnId: LOOKUP_LAB_COLUMN_ID,
  crosswalkRecordKeyColumnId: LOOKUP_PATIENT_COLUMN_ID,
} satisfies Partial<DatasetColumnMapping.T>;

describe("getRecordKeyMatchingFromMapping", () => {
  it("compares keys exactly for a mapping written before key matching", () => {
    expect(
      getRecordKeyMatchingFromMapping({
        mapping: _makeMapping({}),
        datasetColumnsById: {},
      }),
    ).toEqual(EXACT_RECORD_KEY_MATCHING);
  });

  it("resolves the lookup's columns to names and orders the normalizations", () => {
    expect(
      getRecordKeyMatchingFromMapping({
        mapping: _makeMapping(WITH_LOOKUP),
        datasetColumnsById: LOOKUP_COLUMNS,
      }),
    ).toEqual({
      keyNormalizations: ["trim", "strip_leading_zeros"],
      crosswalk: {
        datasetId: LOOKUP_DATASET_ID,
        sourceKeyColumnName: "lookup_lab_number",
        recordKeyColumnName: "lookup_patient_id",
      },
    });
  });

  it("throws when a lookup column no longer exists", () => {
    expect(() => {
      getRecordKeyMatchingFromMapping({
        mapping: _makeMapping(WITH_LOOKUP),
        datasetColumnsById: {
          [LOOKUP_LAB_COLUMN_ID]: LOOKUP_COLUMNS[LOOKUP_LAB_COLUMN_ID],
        },
      });
    }).toThrow(/is not a column of dataset/);
  });

  it("throws when a lookup column belongs to another dataset", () => {
    expect(() => {
      getRecordKeyMatchingFromMapping({
        mapping: _makeMapping(WITH_LOOKUP),
        datasetColumnsById: {
          ...LOOKUP_COLUMNS,
          [LOOKUP_PATIENT_COLUMN_ID]: _makeColumn({
            id: LOOKUP_PATIENT_COLUMN_ID,
            datasetId: OTHER_DATASET_ID,
            name: "lookup_patient_id",
          }),
        },
      });
    }).toThrow(/is not a column of dataset/);
  });
});
```

(Match `_makeMapping`'s base fields to plan 5's `DatasetColumnMapping.T`; the type checker names any difference.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend src/clients/qetl/QueryMediator/conceptRelation/getRecordKeyMatchingFromMapping`
Expected: FAIL: module not found.

- [ ] **Step 3: Write the function**

```ts
import { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { RecordKeyMatching } from "@/clients/DuckDbClient/duckDbSqlText";

/** Every dataset column the planner or Sync read, keyed by id. */
type DatasetColumnsById = Readonly<
  Partial<Record<DatasetColumn.Id, DatasetColumn.T | undefined>>
>;

/**
 * The name of one ID lookup table column, failing closed.
 *
 * A lookup column that is gone, or that belongs to another dataset, is a
 * broken ontology. Answering with no matches would report "no record" for
 * data that may well exist, so it throws instead.
 */
function _getLookupColumnName(
  options: Readonly<{
    mapping: DatasetColumnMapping.T;
    columnId: DatasetColumn.Id;
    lookupDatasetId: Dataset.Id;
    datasetColumnsById: DatasetColumnsById;
  }>,
): string {
  const column = options.datasetColumnsById[options.columnId];
  if (!column || column.datasetId !== options.lookupDatasetId) {
    throw new Error(
      `Identifier mapping '${options.mapping.id}' translates its keys ` +
        `through column '${options.columnId}', which is not a column of ` +
        `dataset '${options.lookupDatasetId}'.`,
    );
  }
  return column.name;
}

/**
 * How an identifier mapping's dataset keys become record keys, with its ID
 * lookup table's columns resolved to names.
 *
 * The concept planner and Sync both call this, so a lookup resolves the same
 * way for membership and for values. A mapping written before key matching
 * resolves to exact matching.
 */
export function getRecordKeyMatchingFromMapping(
  options: Readonly<{
    mapping: DatasetColumnMapping.T;
    datasetColumnsById: DatasetColumnsById;
  }>,
): RecordKeyMatching {
  const { mapping, datasetColumnsById } = options;
  const keyNormalizations = DatasetColumnMapping.toCanonicalKeyNormalizations(
    mapping.keyNormalizations,
  );
  const keyCrosswalk = DatasetColumnMapping.getKeyCrosswalk(mapping);
  if (!keyCrosswalk) {
    return { keyNormalizations, crosswalk: undefined };
  }
  return {
    keyNormalizations,
    crosswalk: {
      datasetId: keyCrosswalk.datasetId,
      sourceKeyColumnName: _getLookupColumnName({
        mapping,
        columnId: keyCrosswalk.sourceKeyColumnId,
        lookupDatasetId: keyCrosswalk.datasetId,
        datasetColumnsById,
      }),
      recordKeyColumnName: _getLookupColumnName({
        mapping,
        columnId: keyCrosswalk.recordKeyColumnId,
        lookupDatasetId: keyCrosswalk.datasetId,
        datasetColumnsById,
      }),
    },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:frontend src/clients/qetl/QueryMediator/conceptRelation/getRecordKeyMatchingFromMapping`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/clients/qetl/QueryMediator/conceptRelation/getRecordKeyMatchingFromMapping/
git commit -m "feat(joined-cases): resolve an identifier mapping's key matching

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 8: Planning: sources carry key matching, lookup datasets contribute

**Files:**
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/buildStackedSourceRowsSql/buildStackedSourceRowsSql.ts` (`ConceptAttributeSource`)
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata.ts` (`_getPrimaryKeyColumnNameByDatasetId`, `_buildSource`, `_buildAttributeColumn`, `makeConceptAttributeColumnsFromMetadata`)
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql.ts`
- Test: the `makeConceptAttributeColumnsFromMetadata` test (`rg -l "makeConceptAttributeColumnsFromMetadata" src --glob '*.test.ts'`; today `__tests__/conceptAttributeColumns.integration.executed.test.ts`)
- Test: `src/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql.test.ts`

- [ ] **Step 1: Add `keyMatching` to the source type**

In `buildStackedSourceRowsSql.ts`, where plan 5 defines `ConceptAttributeSource`, add after `primaryKeyColumnName`:

```ts
  /**
   * How this source's dataset keys become record keys: the normalizations
   * and ID lookup table of its dataset's first identifier source, the same
   * mapping row `primaryKeyColumnName` comes from.
   */
  keyMatching: RecordKeyMatching;
```

with `import type { RecordKeyMatching } from "@/clients/DuckDbClient/duckDbSqlText";`. Every other `ConceptAttributeSource` literal in the repo (plan 5's fixtures in `buildConceptViewSql.executed.test.ts`, `getNeededColumnsFromQuery.test.ts`, `QueryMediator.concepts.test.ts`, and the column-resolution test) now needs the field: run `pnpm type-check` and add `keyMatching: EXACT_RECORD_KEY_MATCHING` to each flagged source, nothing else. That also makes every existing view test a check that exact matching changes no value.

- [ ] **Step 2: Write the failing column-resolution tests**

In the `makeConceptAttributeColumnsFromMetadata` test file, add (using that file's existing attribute, mapping, and column builders; the new inputs are `keyNormalizations` and the three `crosswalk*` ids on the identifier mapping, and the lookup's two columns in `datasetColumnsById`):

```ts
describe("key matching", () => {
  it("gives every source its dataset's key matching and makes the lookup dataset a contributor", () => {
    const columns = makeConceptAttributeColumnsFromMetadata(
      _makeLabsMetadataWithLookup(),
    );

    const labTotal = columns.attributeColumns.find((column) => {
      return column.attributeName === "lab_total";
    });
    expect(labTotal).toMatchObject({
      kind: "dataset_column",
      sources: [
        {
          datasetId: LABS_DATASET_ID,
          primaryKeyColumnName: "lab_number",
          keyMatching: {
            keyNormalizations: ["trim", "strip_leading_zeros"],
            crosswalk: {
              datasetId: PATIENTS_DATASET_ID,
              sourceKeyColumnName: "patient_lab_number",
              recordKeyColumnName: "patient_id",
            },
          },
        },
      ],
    });
    expect(columns.contributingDatasetIds).toEqual(
      [LABS_DATASET_ID, PATIENTS_DATASET_ID].sort(),
    );
  });

  it("gives a mapping written before key matching exact matching and the same contributors as before", () => {
    const columns = makeConceptAttributeColumnsFromMetadata(
      _makeLabsMetadataWithoutLookup(),
    );

    const labTotal = columns.attributeColumns.find((column) => {
      return column.attributeName === "lab_total";
    });
    expect(labTotal).toMatchObject({
      sources: [{ keyMatching: EXACT_RECORD_KEY_MATCHING }],
    });
    expect(columns.contributingDatasetIds).toEqual([LABS_DATASET_ID]);
  });

  it("throws when the lookup's record key column is not in the lookup dataset", () => {
    expect(() => {
      makeConceptAttributeColumnsFromMetadata(
        _makeLabsMetadataWithLookup({ omitRecordKeyColumn: true }),
      );
    }).toThrow(/is not a column of dataset/);
  });
});
```

Add the two fixture builders beside the file's existing ones, in plan 5's shape (one ID field with one source per dataset). `_makeLabsMetadataWithLookup` returns a `ConceptRelationMetadata` with: an identifier attribute `Patient ID` with two mapping rows, `patient_id` on `PATIENTS_DATASET_ID` (position 0, no key matching) and `lab_number` on `LABS_DATASET_ID` (position 1) whose row has `keyNormalizations: ["strip_leading_zeros", "trim"]`, `crosswalkDatasetId: PATIENTS_DATASET_ID`, `crosswalkSourceKeyColumnId` (column `patient_lab_number`), `crosswalkRecordKeyColumnId` (column `patient_id`); a `lab_total` attribute reading `lab_result` on `LABS_DATASET_ID`; and `datasetColumnsById` holding all four columns, minus `patient_id` when `omitRecordKeyColumn` is true. `_makeLabsMetadataWithoutLookup` has the ID field with only its `lab_number` source, with `keyNormalizations: []` and no `crosswalk*` ids, the same `lab_total` field, and only the labs columns.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm test:executed src/clients/qetl/QueryMediator/conceptRelation/__tests__/conceptAttributeColumns.integration.executed.test.ts` (or `pnpm test:frontend <path>` if plan 5 moved the test to a non-executed file)
Expected: FAIL: sources have no `keyMatching`, and the patients dataset is not a contributor.

- [ ] **Step 4: Resolve a record key per dataset**

In `makeConceptAttributeColumnsFromMetadata.ts`, replace `PrimaryKeyColumnNameByDatasetId` and plan 5's `_getPrimaryKeyColumnNameByDatasetId` with:

```ts
/** One contributing dataset's key column and how its keys become record keys. */
type DatasetRecordKey = {
  primaryKeyColumnName: string;
  keyMatching: RecordKeyMatching;
};

/** Each contributing dataset's record key, by dataset id. */
type RecordKeyByDatasetId = Partial<
  Record<Dataset.Id, DatasetRecordKey | undefined>
>;

/**
 * The key column, and the key matching, of each contributing dataset, both
 * read from the dataset's first identifier source.
 *
 * Getting this wrong is silent: a source filtered on the wrong key matches no
 * row and every value comes back NULL. So a dataset with no identifier
 * source is a throw where its source is built, and a broken ID lookup table
 * throws here.
 *
 * A dataset reached by two identifier sources is resolved by attribute order,
 * then by each attribute's read order, not by insertion order, so two runs
 * pick the same key. One ID field with a source per dataset fills the map
 * exactly as one identifier field per dataset does.
 */
function _getRecordKeyByDatasetId(
  metadata: Readonly<ConceptRelationMetadata>,
): RecordKeyByDatasetId {
  const identifierAttributes = metadata.attributes
    .filter((attribute) => {
      return (
        attribute.isIdentifier && attribute.mappingType === "dataset_column"
      );
    })
    .sort(_compareAttributes);

  const recordKeyByDatasetId: RecordKeyByDatasetId = {};
  identifierAttributes.forEach((attribute) => {
    AttributeSources.getSourceMappingsFromMappings({
      attributeId: attribute.id,
      mappings: metadata.mappings,
    }).forEach((mapping) => {
      // First writer wins, which is what makes attribute order decide.
      if (recordKeyByDatasetId[mapping.datasetId] !== undefined) {
        return;
      }
      const datasetColumn =
        metadata.datasetColumnsById[mapping.datasetColumnId];
      if (datasetColumn) {
        recordKeyByDatasetId[mapping.datasetId] = {
          primaryKeyColumnName: datasetColumn.name,
          keyMatching: getRecordKeyMatchingFromMapping({
            mapping,
            datasetColumnsById: metadata.datasetColumnsById,
          }),
        };
      }
    });
  });
  return recordKeyByDatasetId;
}
```

Imports to add:

```ts
import { getRecordKeyMatchingFromMapping } from "@/clients/qetl/QueryMediator/conceptRelation/getRecordKeyMatchingFromMapping/getRecordKeyMatchingFromMapping";
import type { RecordKeyMatching } from "@/clients/DuckDbClient/duckDbSqlText";
```

In plan 5's `_buildSource`, rename the option `primaryKeyColumnNameByDatasetId: PrimaryKeyColumnNameByDatasetId` to `recordKeyByDatasetId: RecordKeyByDatasetId`, and replace the `primaryKeyColumnName` lookup and its throw with:

```ts
  const recordKey = options.recordKeyByDatasetId[mapping.datasetId];
  if (recordKey === undefined) {
    throw new Error(
      `Concept attribute '${attribute.name}' (${attribute.id}) reads dataset ` +
        `'${mapping.datasetId}', which has no identifier attribute mapped ` +
        `into it, so its rows cannot be matched to an individual.`,
    );
  }
```

and in the returned `source`, replace `primaryKeyColumnName,` with:

```ts
      primaryKeyColumnName: recordKey.primaryKeyColumnName,
      keyMatching: recordKey.keyMatching,
```

Rename the same option in `_buildAttributeColumn` and in `makeConceptAttributeColumnsFromMetadata` (whose first line becomes `const recordKeyByDatasetId = _getRecordKeyByDatasetId(metadata);`).

- [ ] **Step 5: Make lookup datasets contributors**

In plan 5's `_buildAttributeColumn`, replace `contributingDatasetIds: builtSources.map(prop("datasetId")),` with:

```ts
    // The view reads each source's ID lookup table inside that source's key
    // filter, so it is loaded, leased, and allowlisted like the source.
    contributingDatasetIds: builtSources.flatMap(({ datasetId, source }) => {
      const lookupDatasetId = source.keyMatching.crosswalk?.datasetId;
      return lookupDatasetId === undefined
        ? [datasetId]
        : [datasetId, lookupDatasetId];
    }),
```

`makeConceptAttributeColumnsFromMetadata` already adds every id `_buildAttributeColumn` returns to its set, which de-duplicates a lookup that is also a source. Update the `contributingDatasetIds` docstring on `ConceptAttributeColumns`: "The datasets the columns read, including every ID lookup table a source's key reads."

- [ ] **Step 6: Run the column-resolution tests to verify they pass**

Run the command from Step 3.
Expected: PASS, including every pre-existing case.

- [ ] **Step 7: Write the failing planner test**

In `getConceptRelationPlansFromSql.test.ts`, add (reusing the file's client mocks: `ConceptAttributeClient.getAll`, `getAllAttributeMappings`, `DatasetColumnClient.getAll`, the individuals and statuses reads):

```ts
it("fetches the ID lookup table's columns along with the mapped columns", async () => {
  _mockConceptWithLookup();

  await getConceptRelationPlansFromSql({
    rawSql: `SELECT * FROM "concept_${CONCEPT_ID}"`,
    allowlist: _makeAllowlist({ datasetIds: [LABS_DATASET_ID, PATIENTS_DATASET_ID] }),
  });

  const requestedColumnIds = _getRequestedDatasetColumnIds();
  expect(requestedColumnIds).toEqual(
    expect.arrayContaining([LOOKUP_LAB_COLUMN_ID, LOOKUP_PATIENT_COLUMN_ID]),
  );
});

it("refuses a concept whose ID lookup table is not reachable from the workspace", async () => {
  _mockConceptWithLookup();

  await expect(
    getConceptRelationPlansFromSql({
      rawSql: `SELECT * FROM "concept_${CONCEPT_ID}"`,
      allowlist: _makeAllowlist({ datasetIds: [LABS_DATASET_ID] }),
    }),
  ).rejects.toThrow(PATIENTS_DATASET_ID);
});
```

`_mockConceptWithLookup` sets up the same labs-with-lookup concept as Step 2 through the mocks; `_getRequestedDatasetColumnIds` reads the `in` filter of the `DatasetColumnClient.getAll` mock's first call. Name the helpers after the file's existing ones if it already has equivalents.

- [ ] **Step 8: Run the planner tests to verify the first fails**

Run: `pnpm test:frontend src/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql`
Expected: the first new test FAILS (the lookup columns are not requested); the second already passes through the contributor allowlist from Step 5.

- [ ] **Step 9: Fetch the lookup columns**

In `getConceptRelationPlansFromSql.ts`, in `_getMappedDatasetColumns`, collect every key column a mapping's record key reads, beside whatever plan 4 and plan 5 already collect (the value column and the bucket column):

```ts
  const datasetColumnIds = removeDuplicates(
    mappings.flatMap((mapping) => {
      return mapping.type === "dataset_column"
        ? [
            ...DatasetColumnMapping.getKeyColumnIds(mapping),
            ...(mapping.bucketColumnId ? [mapping.bucketColumnId] : []),
          ]
        : [];
    }),
  );
```

`getKeyColumnIds` starts with `mapping.datasetColumnId`, so the value column is still fetched. Import `DatasetColumnMapping` from `$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping`.

- [ ] **Step 10: Run the planner tests to verify they pass**

Run: `pnpm test:frontend src/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/clients/qetl/QueryMediator/conceptRelation/
git commit -m "feat(joined-cases): plan record keys per source and load ID lookup tables

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 9: The view filters every source through `buildRecordKeySql`

**Files:**
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/buildStackedSourceRowsSql/buildStackedSourceRowsSql.ts` (`_buildSourceRowsSql`, plan 5's one key comparison for single values, lists, and bucketed lists)
- Modify: `src/clients/DuckDbClient/duckDbSqlText.ts` (delete `getEntityKeyComparisonSql`)
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/loadConceptSpine/loadConceptSpine.ts:114-120` (docstring)
- Test: `src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql.executed.test.ts`

- [ ] **Step 1: Write the failing executed test**

In `buildConceptViewSql.executed.test.ts`, add a describe block with its own world. The column objects use plan 5's dataset-column arm (`sources`, `sharedSourceDuckDbDataType`, and plan 3's `valueShape` with its rule); `keyMatching` on each source is the new input.

```ts
describe("key matching", () => {
  const PATIENTS = uuid<Dataset.Id>();
  const LABS = uuid<Dataset.Id>();
  const KEY_VIEW = `concept_${uuid()}`;
  const KEY_SPINE = `${KEY_VIEW}__individuals`;
  const EVERY_NORMALIZATION: DatasetColumnMapping.KeyNormalization[] = [
    "trim",
    "lowercase",
    "alphanumeric_only",
    "strip_leading_zeros",
  ];

  /**
   * Patients pair each lab number with a patient. `LAB-9003` is paired with
   * two patients, so it is ambiguous; `LAB-9004` is paired with none. The
   * spine holds the record keys Sync would stage.
   */
  async function _seedKeyMatchingWorld(
    connection: DuckDBConnection,
  ): Promise<void> {
    const patientsPath = join(tmpdir(), "ava-key-matching-patients.parquet");
    const labsPath = join(tmpdir(), "ava-key-matching-labs.parquet");
    await connection.run(`
      COPY (SELECT * FROM (VALUES
        ('0017A', 'LAB-9001', 'Ana Lima'),
        ('0018B', 'lab-9002', 'Ben Okafor'),
        ('0019C', 'LAB-9003', 'Cy Tan'),
        ('0017A', 'LAB-9003', 'Ana Lima')
      ) AS t(patient_id, patient_lab_number, full_name)) TO '${patientsPath}' (FORMAT parquet)
    `);
    await connection.run(`
      COPY (SELECT * FROM (VALUES
        (' lab 9001', 5.5),
        ('LAB-9001', 6.5),
        ('LAB9002', 4.0),
        ('LAB-9003', 7.0),
        ('LAB-9004', 1.0)
      ) AS t(lab_number, lab_result)) TO '${labsPath}' (FORMAT parquet)
    `);
    await connection.run(`
      CREATE VIEW "${PATIENTS}" AS SELECT * FROM read_parquet('${patientsPath}');
      CREATE VIEW "${getRowNumberedViewName(PATIENTS)}" AS
        SELECT * FROM read_parquet('${patientsPath}', file_row_number = true);
      CREATE VIEW "${LABS}" AS SELECT * FROM read_parquet('${labsPath}');
      CREATE VIEW "${getRowNumberedViewName(LABS)}" AS
        SELECT * FROM read_parquet('${labsPath}', file_row_number = true);
      CREATE TABLE "${KEY_SPINE}" AS SELECT * FROM (VALUES
        ('17a', 'Active'), ('18b', 'Active'), ('19c', 'Active')
      ) AS t(external_id, status);
    `);
  }

  const LAB_KEY_MATCHING: RecordKeyMatching = {
    keyNormalizations: EVERY_NORMALIZATION,
    crosswalk: {
      datasetId: PATIENTS,
      sourceKeyColumnName: "patient_lab_number",
      recordKeyColumnName: "patient_id",
    },
  };

  const LAB_SOURCES: ConceptAttributeSource[] = [
    {
      datasetId: LABS,
      selectColumnName: "lab_result",
      primaryKeyColumnName: "lab_number",
      keyMatching: LAB_KEY_MATCHING,
      bucketColumnName: undefined,
      position: 0,
    },
  ];

  const LAB_TOTAL: ConceptAttributeColumn = {
    kind: "dataset_column",
    attributeId: uuid<ConceptAttribute.Id>(),
    attributeName: "lab_total",
    sources: LAB_SOURCES,
    sharedSourceDuckDbDataType: undefined,
    valueShape: "single",
    valuePickerRuleType: "sum",
  };

  const LAB_RESULTS: ConceptAttributeColumn = {
    kind: "dataset_column",
    attributeId: uuid<ConceptAttribute.Id>(),
    attributeName: "lab_results",
    sources: LAB_SOURCES,
    sharedSourceDuckDbDataType: undefined,
    valueShape: "list",
  };

  const NAME: ConceptAttributeColumn = {
    kind: "dataset_column",
    attributeId: uuid<ConceptAttribute.Id>(),
    attributeName: "name",
    sources: [
      {
        datasetId: PATIENTS,
        selectColumnName: "full_name",
        primaryKeyColumnName: "patient_id",
        keyMatching: {
          keyNormalizations: EVERY_NORMALIZATION,
          crosswalk: undefined,
        },
        bucketColumnName: undefined,
        position: 0,
      },
    ],
    sharedSourceDuckDbDataType: undefined,
    valueShape: "single",
    valuePickerRuleType: "first",
  };

  async function _queryKeyMatchingView(): Promise<Array<Record<string, unknown>>> {
    return await withDuckDb(async (connection) => {
      await _seedKeyMatchingWorld(connection);
      await connection.run(
        buildConceptViewSql({
          viewName: KEY_VIEW,
          spineTableName: KEY_SPINE,
          attributeColumns: [NAME, LAB_TOTAL, LAB_RESULTS],
        }),
      );
      const reader = await connection.runAndReadAll(
        `SELECT * FROM "${KEY_VIEW}" ORDER BY external_id`,
      );
      return reader.getRowObjects().map(_normalize);
    });
  }

  it("attaches a source's rows to the record its ID lookup table names", async () => {
    const rows = await _queryKeyMatchingView();
    expect(rows.map((row) => [row.external_id, row.name, row.lab_total])).toEqual([
      ["17a", "Ana Lima", 12],
      ["18b", "Ben Okafor", 4],
      ["19c", "Cy Tan", null],
    ]);
  });

  it("gives an ambiguous key's rows to no record, in a list field too", async () => {
    const rows = await _queryKeyMatchingView();
    expect(rows.map((row) => row.lab_results)).toEqual([[5.5, 6.5], [4], []]);
  });
});
```

Add the imports the block needs at the top of the file (`uuid` from `$/lib/uuid`, `RecordKeyMatching` from `@/clients/DuckDbClient/duckDbSqlText`, `ConceptAttributeSource` from `@/clients/qetl/QueryMediator/conceptRelation/buildStackedSourceRowsSql/buildStackedSourceRowsSql`, `DatasetColumnMapping` from `$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping`, `ConceptAttribute`, `Dataset`). The file's `_normalize` turns DuckDB numbers and lists into plain values; if the decimals arrive as strings, compare `Number(...)`. A per-period field needs no case of its own: its rows come from the same `_buildSourceRowsSql`, and plan 5's per-month cases now run with `keyMatching: EXACT_RECORD_KEY_MATCHING` (Task 8, Step 1).

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:executed src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql.executed.test.ts`
Expected: FAIL: `lab_total` is NULL for every record, because the source still compares raw keys.

- [ ] **Step 3: Filter each source through `buildRecordKeySql`**

In `buildStackedSourceRowsSql.ts`, add:

```ts
/**
 * The filter that keeps the rows of one source that belong to the outer
 * record: the record's key against the record key the row's own key becomes.
 * The record's key is cast to `VARCHAR` as it always was; the spine is text
 * already, so the cast changes nothing and an exact source reads exactly as
 * it did before key matching.
 */
function _buildSourceKeyFilterSql(
  options: Readonly<{
    externalIdsTable: string;
    externalIdColumn: string;
    source: ConceptAttributeSource;
  }>,
): string {
  const recordKeySql = buildRecordKeySql({
    datasetAlias: "dataset",
    primaryKeyColumnName: options.source.primaryKeyColumnName,
    keyMatching: options.source.keyMatching,
  });
  return `CAST(${quoteSqlIdentifier(options.externalIdsTable)}.${quoteSqlIdentifier(options.externalIdColumn)} AS VARCHAR) = ${recordKeySql}`;
}
```

In `_buildSourceRowsSql`, replace the first entry of `conditions`:

```ts
    getEntityKeyComparisonSql({
      externalIdsTable: options.externalIdsTable,
      externalIdColumn: options.externalIdColumn,
      primaryKeyColumnName: source.primaryKeyColumnName,
    }),
```

with:

```ts
    _buildSourceKeyFilterSql({
      externalIdsTable: options.externalIdsTable,
      externalIdColumn: options.externalIdColumn,
      source,
    }),
```

and in the imports replace `getEntityKeyComparisonSql` with `buildRecordKeySql`. The source's `FROM ... dataset` alias stays `dataset`; `buildRecordKeySql` quotes it as `"dataset"`, which DuckDB resolves to the same alias.

- [ ] **Step 4: Delete `getEntityKeyComparisonSql`**

Delete `getEntityKeyComparisonSql` and its docstring from `src/clients/DuckDbClient/duckDbSqlText.ts`. In `loadConceptSpine.ts`, change the sentence "Every comparison against a dataset's key column casts both sides to text (`getEntityKeyComparisonSql`), so a pinned `VARCHAR` is the type that makes those comparisons mean what Postgres means." to "Every record key a dataset row becomes is text (`buildRecordKeySql`), so a pinned `VARCHAR` is the type that makes those comparisons mean what Postgres means."

Run: `rg -n "getEntityKeyComparisonSql" src shared supabase`
Expected: no output.

- [ ] **Step 5: Run the view tests to verify they pass**

Run: `pnpm test:executed src/clients/qetl/QueryMediator/conceptRelation`
Expected: PASS, the two new tests and every pre-existing exact-key case unchanged.

- [ ] **Step 6: Run the rest of the concept tests**

Run: `pnpm test:frontend src/clients/qetl && pnpm test:executed tests/integration/queries/structuredQueryConcepts.executed.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/clients/qetl/QueryMediator/conceptRelation/ src/clients/DuckDbClient/duckDbSqlText.ts
git commit -m "feat(joined-cases): read concept values through record keys

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 10: Project ID lookup table columns

**Files:**
- Modify: `src/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery.ts` (`_getConceptColumnsByDatasetId`)
- Test: `src/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery.test.ts`

- [ ] **Step 1: Write the failing test**

Add to the test file, building a plan the way its concept cases already do:

```ts
it("needs an ID lookup table's two key columns, also when the lookup is itself a source", () => {
  const needed = getNeededColumnsFromQuery({
    conceptRelations: [_makePlanWithLookupThroughSource()],
    datasetIds: [LABS_DATASET_ID, PATIENTS_DATASET_ID],
    rawSql: `SELECT "lab_total" FROM "concept_${CONCEPT_ID}"`,
  });

  expect(needed[PATIENTS_DATASET_ID]).toEqual(
    ["full_name", "patient_id", "patient_lab_number"].sort(),
  );
  expect(needed[LABS_DATASET_ID]).toEqual(["lab_number", "lab_result"].sort());
});
```

`_makePlanWithLookupThroughSource` returns a `ConceptRelationPlan` built like plan 5's cases in this file (each column with `sources`), whose `attributeColumns` are a `name` column with one source on patients (`full_name`, key `patient_id`, exact matching) and a `lab_total` column with one source on labs (`lab_result`, key `lab_number`, lookup `{ datasetId: PATIENTS_DATASET_ID, sourceKeyColumnName: "patient_lab_number", recordKeyColumnName: "patient_id" }`). If the function returns columns in another order than sorted, compare with the same normalization the file's other cases use.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend src/clients/qetl/QueryMediator/getNeededColumnsFromQuery`
Expected: FAIL: the patients dataset lacks `patient_lab_number`.

- [ ] **Step 3: Add the lookup columns**

In `_getConceptColumnsByDatasetId`, plan 5's inner callback runs `column.sources.forEach((source) => { ... })` and adds each source's select, key, and date column to its own dataset. Inside that `forEach`, after the existing `nextColumnsByDatasetId[source.datasetId] = unionColumnSets(...)` statement, add:

```ts
          // The source's record key reads its ID lookup table, so the lookup
          // dataset needs both key columns even when nothing else reads it.
          const { crosswalk } = source.keyMatching;
          if (crosswalk) {
            nextColumnsByDatasetId[crosswalk.datasetId] = unionColumnSets(
              nextColumnsByDatasetId[crosswalk.datasetId] ?? [],
              [crosswalk.sourceKeyColumnName, crosswalk.recordKeyColumnName],
            );
          }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:frontend src/clients/qetl/QueryMediator/getNeededColumnsFromQuery`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/clients/qetl/QueryMediator/getNeededColumnsFromQuery/
git commit -m "fix(joined-cases): load the key columns of ID lookup tables

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 11: Sync's staging reads record keys, and counts the IDs it leaves out

Plan 6 built `buildRecordKeyStagingSql({ stagingTableName, keySources })` with `RecordKeySource = { datasetId; primaryKeyColumnName }`, one `SELECT CAST(<key> AS VARCHAR) AS external_id FROM <dataset>` arm per identifier mapping row. This task extends that module: it does not add a second staging builder.

**Files:**
- Modify: `src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/buildRecordKeyStagingSql/buildRecordKeyStagingSql.ts`
- Modify: `src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/buildRecordKeyStagingSql/buildRecordKeyStagingSql.executed.test.ts`

- [ ] **Step 1: Give plan 6's cases exact matching**

In the test file, import `EXACT_RECORD_KEY_MATCHING` from `@/clients/DuckDbClient/duckDbSqlText` and add `keyMatching: EXACT_RECORD_KEY_MATCHING` to every `RecordKeySource` plan 6's cases pass (`PEOPLE`, `VISITS`, `HOUSEHOLDS`). Change nothing else in them. They are now the proof that a case type without key matching stages exactly the keys it staged before, typed `VARCHAR`.

- [ ] **Step 2: Write the failing key matching tests**

Add to the same file:

```ts
const PATIENTS = "eeeeeeee-5555-4555-8555-eeeeeeeeeeee" as Dataset.Id;
const LABS = "ffffffff-6666-4666-8666-ffffffffffff" as Dataset.Id;
const EVERY_NORMALIZATION: DatasetColumnMapping.KeyNormalization[] = [
  "trim",
  "lowercase",
  "alphanumeric_only",
  "strip_leading_zeros",
];

const PATIENT_KEY_SOURCE: RecordKeySource = {
  datasetId: PATIENTS,
  primaryKeyColumnName: "patient_id",
  keyMatching: { keyNormalizations: EVERY_NORMALIZATION, crosswalk: undefined },
};

/** Lab numbers translate to patients through the patients dataset itself. */
const LAB_KEY_SOURCE: RecordKeySource = {
  datasetId: LABS,
  primaryKeyColumnName: "lab_number",
  keyMatching: {
    keyNormalizations: EVERY_NORMALIZATION,
    crosswalk: {
      datasetId: PATIENTS,
      sourceKeyColumnName: "patient_lab_number",
      recordKeyColumnName: "patient_id",
    },
  },
};

/**
 * `LAB-9003` pairs with two patients, so it is ambiguous; `LAB-9004` pairs
 * with none. One lab key is NULL, which is not a left-out ID.
 */
async function _seedKeyMatching(connection: DuckDBConnection): Promise<void> {
  await connection.run(`
    CREATE TABLE "${PATIENTS}" AS SELECT * FROM (VALUES
      ('0017A', 'LAB-9001'),
      ('0018B', 'lab-9002'),
      ('0019C', 'LAB-9003'),
      ('0017A', 'LAB-9003')
    ) AS t(patient_id, patient_lab_number);
    CREATE TABLE "${LABS}" AS SELECT * FROM (VALUES
      (' lab 9001'), ('LAB-9001'), ('LAB9002'), ('LAB-9003'), ('LAB-9004'), (NULL)
    ) AS t(lab_number);
  `);
}

async function _stageWithKeyMatching(
  keySources: readonly RecordKeySource[],
): Promise<{ externalIds: string[]; columnTypes: string[] }> {
  return await withDuckDb(async (connection) => {
    await _seedKeyMatching(connection);
    await connection.run(
      buildRecordKeyStagingSql({ stagingTableName: STAGING_TABLE, keySources }),
    );
    const rows = (
      await connection.runAndReadAll(
        `SELECT external_id FROM "${STAGING_TABLE}" ORDER BY external_id`,
      )
    ).getRowObjects();
    const described = (
      await connection.runAndReadAll(`DESCRIBE "${STAGING_TABLE}"`)
    ).getRowObjects();
    return {
      externalIds: rows.map((row) => {
        return String(row.external_id);
      }),
      columnTypes: described.map((column) => {
        return String(column.column_type);
      }),
    };
  });
}

describe("buildRecordKeyStagingSql with key matching", () => {
  it("stages one record key per matched key, leaving out unmatched and ambiguous keys", async () => {
    const { externalIds } = await _stageWithKeyMatching([
      PATIENT_KEY_SOURCE,
      LAB_KEY_SOURCE,
    ]);
    expect(externalIds).toEqual(["17a", "18b", "19c"]);
  });

  it("stages normalized and translated keys as VARCHAR, so existing records keep matching", async () => {
    const { columnTypes } = await _stageWithKeyMatching([
      PATIENT_KEY_SOURCE,
      LAB_KEY_SOURCE,
    ]);
    expect(columnTypes).toEqual(["VARCHAR"]);
  });
});

describe("buildExcludedKeyCountsSql", () => {
  it("counts each source's distinct keys that matched no record, by source index", async () => {
    const rawSql = buildExcludedKeyCountsSql([PATIENT_KEY_SOURCE, LAB_KEY_SOURCE]);
    const rows = await withDuckDb(async (connection) => {
      await _seedKeyMatching(connection);
      const reader = await connection.runAndReadAll(rawSql ?? "");
      return reader.getRowObjects().map((row) => {
        return [Number(row.source_index), Number(row.excluded_key_count)];
      });
    });
    expect(rows).toEqual([[1, 2]]);
  });

  it("builds no query when every source matches keys exactly", () => {
    expect(
      buildExcludedKeyCountsSql([
        { ...PATIENT_KEY_SOURCE, keyMatching: EXACT_RECORD_KEY_MATCHING },
      ]),
    ).toBeUndefined();
  });
});

describe("getNeededColumnsFromRecordKeySources", () => {
  it("names each dataset's key column and each lookup's two columns once", () => {
    expect(
      getNeededColumnsFromRecordKeySources([PATIENT_KEY_SOURCE, LAB_KEY_SOURCE]),
    ).toEqual({
      [PATIENTS]: ["patient_id", "patient_lab_number"],
      [LABS]: ["lab_number"],
    });
  });
});
```

Extend the file's imports: `buildExcludedKeyCountsSql` and `getNeededColumnsFromRecordKeySources` beside `buildRecordKeyStagingSql`, `DatasetColumnMapping` (type) from `$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping`, and `DuckDBConnection` (type) from `@duckdb/node-api`.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm test:executed buildRecordKeyStagingSql`
Expected: FAIL: `buildExcludedKeyCountsSql` is not exported, and the key matching cases stage raw keys.

- [ ] **Step 4: Extend the module**

Replace the contents of `buildRecordKeyStagingSql.ts` with plan 6's module, extended (plan 6's docstrings, its throw, and its output shape are kept):

```ts
import { quoteSqlIdentifier } from "@avandar/utils/sql";
import {
  buildRecordKeySql,
  isExactRecordKeyMatching,
} from "@/clients/DuckDbClient/duckDbSqlText";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { RecordKeyMatching } from "@/clients/DuckDbClient/duckDbSqlText";

/**
 * The column that keys records in one contributing dataset: one identifier
 * mapping's dataset and key column, and how its keys become record keys.
 */
export type RecordKeySource = {
  datasetId: Dataset.Id;
  primaryKeyColumnName: string;
  /** The mapping's normalizations and ID lookup table. */
  keyMatching: RecordKeyMatching;
};

/**
 * One row of the left-out ID count: a source, by its index in the list Sync
 * passed, and how many of its distinct keys matched no record. DuckDB returns
 * both as `BIGINT` or `INTEGER`.
 */
export type ExcludedKeyCountRow = {
  source_index: number | bigint;
  excluded_key_count: number | bigint;
};

const DATASET_ALIAS = "dataset";

function _buildFromSql(keySource: RecordKeySource): string {
  return `FROM ${quoteSqlIdentifier(keySource.datasetId)} ${quoteSqlIdentifier(DATASET_ALIAS)}`;
}

function _buildRecordKeySqlForSource(keySource: RecordKeySource): string {
  return buildRecordKeySql({
    datasetAlias: DATASET_ALIAS,
    primaryKeyColumnName: keySource.primaryKeyColumnName,
    keyMatching: keySource.keyMatching,
  });
}

/**
 * The SQL that stages a case type's record keys for Sync: one row per
 * distinct record key across every contributing dataset, as text, with NULL
 * keys dropped. Sync reads no other column, so no field value is computed
 * here.
 *
 * Each key is built by `buildRecordKeySql`, the expression the concept view
 * filters by, so membership and values agree. It is always `VARCHAR`: a cast
 * key with no key matching, a normalized key, or a translated one. That
 * matters beyond typing, because a key staged as anything else would stop
 * matching its existing record and the stale sweep would flag it. A key that
 * becomes no record key (it normalizes to nothing, or its ID lookup table has
 * no single match) is dropped with the NULL keys and counted by
 * `buildExcludedKeyCountsSql`.
 *
 * @param options.stagingTableName The table to (re)create.
 * @param options.keySources One key source per identifier mapping.
 * @throws When there is no key source: a case type with no identifier field
 *   has no keys to stage. Authoring always creates one.
 */
export function buildRecordKeyStagingSql(
  options: Readonly<{
    stagingTableName: string;
    keySources: readonly RecordKeySource[];
  }>,
): string {
  const { stagingTableName, keySources } = options;
  if (keySources.length === 0) {
    throw new Error(
      "Sync needs at least one identifier field to read record keys from.",
    );
  }
  const stagingTable = quoteSqlIdentifier(stagingTableName);
  const keySelects = keySources
    .map((keySource) => {
      return `SELECT ${_buildRecordKeySqlForSource(keySource)} AS external_id ${_buildFromSql(keySource)}`;
    })
    .join("\n    UNION ALL\n    ");
  return `DROP TABLE IF EXISTS ${stagingTable};

CREATE TABLE ${stagingTable} AS (
  SELECT DISTINCT external_id
  FROM (
    ${keySelects}
  )
  WHERE external_id IS NOT NULL
);`;
}

/**
 * Counts, per key source, the distinct non-NULL keys that became no record
 * key.
 *
 * Only sources whose key matching changes something are counted: an exact
 * key is NULL only when the raw key is, so it can never be left out. With no
 * such source this returns undefined, and a case type without key matching
 * runs no extra query. The source index is a literal integer rather than the
 * dataset id, so nothing but quoted identifiers reaches the SQL.
 */
export function buildExcludedKeyCountsSql(
  keySources: readonly RecordKeySource[],
): string | undefined {
  const sourceSelects = keySources.flatMap((keySource, sourceIndex) => {
    if (isExactRecordKeyMatching(keySource.keyMatching)) {
      return [];
    }
    const datasetKeySql = `CAST(${quoteSqlIdentifier(DATASET_ALIAS)}.${quoteSqlIdentifier(keySource.primaryKeyColumnName)} AS VARCHAR)`;
    return [
      `SELECT ${sourceIndex} AS source_index, ${datasetKeySql} AS dataset_key, ` +
        `${_buildRecordKeySqlForSource(keySource)} AS external_id ${_buildFromSql(keySource)}`,
    ];
  });
  if (sourceSelects.length === 0) {
    return undefined;
  }
  return `SELECT source_index, count(DISTINCT dataset_key) AS excluded_key_count
FROM (
  ${sourceSelects.join("\n  UNION ALL\n  ")}
)
WHERE external_id IS NULL AND dataset_key IS NOT NULL
GROUP BY source_index
ORDER BY source_index`;
}

function _withColumns(
  columnsByDatasetId: Readonly<Partial<Record<Dataset.Id, string[]>>>,
  datasetId: Dataset.Id,
  columnNames: readonly string[],
): Partial<Record<Dataset.Id, string[]>> {
  return {
    ...columnsByDatasetId,
    [datasetId]: [
      ...new Set([...(columnsByDatasetId[datasetId] ?? []), ...columnNames]),
    ],
  };
}

/**
 * The columns Sync's two statements read, so the mediator does not acquire
 * whole datasets: a `CREATE TABLE AS` has no top-level select list to infer
 * them from. Each source needs its key column, and its ID lookup table needs
 * both of its key columns.
 */
export function getNeededColumnsFromRecordKeySources(
  keySources: readonly RecordKeySource[],
): Partial<Record<Dataset.Id, string[]>> {
  return keySources.reduce<Partial<Record<Dataset.Id, string[]>>>(
    (columnsByDatasetId, keySource) => {
      const withKey = _withColumns(columnsByDatasetId, keySource.datasetId, [
        keySource.primaryKeyColumnName,
      ]);
      const { crosswalk } = keySource.keyMatching;
      return crosswalk
        ? _withColumns(withKey, crosswalk.datasetId, [
            crosswalk.sourceKeyColumnName,
            crosswalk.recordKeyColumnName,
          ])
        : withKey;
    },
    {},
  );
}
```

The exact arm is now `CAST("dataset"."person_id" AS VARCHAR)` over `FROM "<dataset>" "dataset"` instead of plan 6's unaliased `CAST("person_id" AS VARCHAR)`; the value is the same, which plan 6's cases (Step 1) check. If `WorkspaceQuerySession.runQuery`'s `neededColumnsByDatasetId` is typed as a non-partial record, return that type instead; the values do not change.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test:executed buildRecordKeyStagingSql`
Expected: PASS: plan 6's four cases unchanged, and the five new ones.

- [ ] **Step 6: Commit**

```bash
git add src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/buildRecordKeyStagingSql/
git commit -m "feat(joined-cases): stage record keys with key matching and count IDs left out

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 12: A notice entry for finished jobs

**Files:**
- Modify: `src/lib/utils/state/JobProgressStore/JobProgressStore.ts`
- Modify: `src/lib/utils/state/JobProgressStore/JobProgressStore.test.ts`
- Modify: `src/components/JobProgressPanel/JobProgressIndicator.tsx`
- Modify: `src/components/JobProgressPanel/JobProgressPanel.test.tsx`

- [ ] **Step 1: Write the failing store tests**

Add to `JobProgressStore.test.ts`:

```ts
  it("keeps a job that finished with a notice until it is dismissed", () => {
    const jobId = JobProgressStore.startJob("Refreshing Patient records…");

    JobProgressStore.finishJobWithNotice(jobId, {
      label: "Refreshed Patient records",
      message: "2 IDs in Lab results did not match a record.",
    });
    expect(JobProgressStore.getJob(jobId)).toEqual({
      status: "notice",
      label: "Refreshed Patient records",
      message: "2 IDs in Lab results did not match a record.",
    });

    JobProgressStore.finishJob(jobId);
    expect(JobProgressStore.getJob(jobId)).toBeUndefined();
  });

  it("does nothing when a job that already finished gets a notice", () => {
    const jobId = JobProgressStore.startJob("Refreshing Patient records…");
    JobProgressStore.finishJob(jobId);

    JobProgressStore.finishJobWithNotice(jobId, {
      label: "Refreshed Patient records",
      message: "Left out.",
    });

    expect(JobProgressStore.getJob(jobId)).toBeUndefined();
  });
```

- [ ] **Step 2: Write the failing panel test**

Add to `JobProgressPanel.test.tsx`:

```ts
  it("shows a notice with its message until the user dismisses it", async () => {
    _renderPanel();
    act(() => {
      const jobId = JobProgressStore.startJob("Refreshing Patient records…");
      JobProgressStore.finishJobWithNotice(jobId, {
        label: "Refreshed Patient records",
        message: "2 IDs in Lab results did not match a record.",
      });
    });

    const notice = screen.getByRole("status", {
      name: "Refreshed Patient records",
    });
    expect(notice).toHaveTextContent(
      "2 IDs in Lab results did not match a record.",
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Dismiss Refreshed Patient records" }),
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
```

(Import `userEvent` from `@/test-utils` if it re-exports it, otherwise from `@testing-library/user-event`, matching the repo's other component tests.)

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm test:frontend src/lib/utils/state/JobProgressStore src/components/JobProgressPanel`
Expected: FAIL: `finishJobWithNotice` is not a function.

- [ ] **Step 4: Add the entry and the updater**

In `JobProgressStore.ts`, add the arm to `JobEntry`:

```ts
  | { status: "notice"; label: string; message: string };
```

and the updater after `failJob`:

```ts
        /**
         * Ends a job with a message the user should read, such as how many
         * IDs a sync left out. Kept until dismissed, like an error. No-ops if
         * the job already finished.
         */
        finishJobWithNotice: (
          jobId: JobId,
          notice: { label: string; message: string },
        ): void => {
          if (!jobs.has(jobId)) {
            return;
          }
          version += 1;
          jobs.set(jobId, { status: "notice", ...notice });
        },
```

Update the store's docstring list of states to mention the notice.

- [ ] **Step 5: Render the notice**

In `JobProgressIndicator.tsx`, add before the `error` arm:

```tsx
    .with({ status: "notice" }, (noticeEntry) => {
      return {
        role: "status" as const,
        ariaLive: "polite" as const,
        showDismissButton: true,
        body: (
          <Text size="xs" className={css.jobProgressDetail}>
            {noticeEntry.message}
          </Text>
        ),
      };
    })
```

and change the component docstring to "an indeterminate or determinate progress bar, a dismissible notice, or a dismissible error message".

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm test:frontend src/lib/utils/state/JobProgressStore src/components/JobProgressPanel`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/utils/state/JobProgressStore/ src/components/JobProgressPanel/
git commit -m "feat(joined-cases): let a finished job leave a dismissible notice

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 13: Sync stages record keys and reports left-out IDs

**Files:**
- Modify: `src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/generateIndividuals.ts`
- Modify: `src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/generateIndividuals.test.ts`

- [ ] **Step 1: Write the failing tests**

In `generateIndividuals.test.ts`, add constants and a concept whose identifier translates through a lookup:

```ts
const LOOKUP_DATASET_ID = uuid<Dataset.Id>();
const LOOKUP_LAB_COLUMN_ID = uuid<DatasetColumnId>();
const LOOKUP_PATIENT_COLUMN_ID = uuid<DatasetColumnId>();
```

Give `_makeDatasetColumn` a third parameter `datasetId: Dataset.Id = DATASET_ID`. Add:

```ts
/** `_makeConcept`, with its identifier translated through an ID lookup table. */
function _makeConceptWithLookup(): BuildableConcept {
  const concept = _makeConcept();
  return {
    ...concept,
    // The notice names a dataset by its catalog name; only `id` and `name`
    // are read, so a partial dataset is enough here.
    datasets: [
      Model.make("Dataset", {
        id: DATASET_ID,
        name: "Lab results",
      }) as unknown as BuildableConcept["datasets"][number],
    ],
    // A hydrated attribute holds every mapping row (plan 5). Only the
    // identifier's dataset-column rows carry key matching.
    attributes: concept.attributes.map((attribute) => {
      return attribute.isIdentifier
        ? {
            ...attribute,
            mappings: attribute.mappings.map((mapping) => {
              return mapping.type === "dataset_column"
                ? {
                    ...mapping,
                    keyNormalizations: ["trim", "lowercase"],
                    crosswalkDatasetId: LOOKUP_DATASET_ID,
                    crosswalkSourceKeyColumnId: LOOKUP_LAB_COLUMN_ID,
                    crosswalkRecordKeyColumnId: LOOKUP_PATIENT_COLUMN_ID,
                  }
                : mapping;
            }),
          }
        : attribute;
    }),
  };
}

function _mockLookupColumns(): void {
  getAllDatasetColumnsMock.mockResolvedValue([
    _makeDatasetColumn(EXTERNAL_ID_COLUMN_ID, "person_id"),
    _makeDatasetColumn(LOOKUP_LAB_COLUMN_ID, "lookup_lab_number", LOOKUP_DATASET_ID),
    _makeDatasetColumn(LOOKUP_PATIENT_COLUMN_ID, "lookup_patient_id", LOOKUP_DATASET_ID),
  ]);
}

/** Answers the left-out ID count with `rows`, and every other query with nothing. */
function _mockExcludedKeyCounts(
  rows: Array<{ source_index: number; excluded_key_count: bigint }>,
): void {
  runQueryMock.mockImplementation(async (options: { rawSql: string }) => {
    return options.rawSql.includes("excluded_key_count")
      ? { data: rows, fields: [], numRows: rows.length }
      : { data: [], fields: [], numRows: 0 };
  });
}
```

Add the tests inside `describe("generateIndividuals", ...)`:

```ts
  it("stages SQL that reads the ID lookup table, so the query leases it", async () => {
    _mockLookupColumns();

    await generateIndividuals(_makeConceptWithLookup());

    const createSql = _getRunSqlStatements()[0]!;
    expect(
      [...DuckDbSqlAnalyzer.getReadDatasetIdsFromSql(createSql)].sort(),
    ).toEqual([DATASET_ID, LOOKUP_DATASET_ID].sort());
  });

  it("reads only each dataset's key column and the lookup's two columns", async () => {
    _mockLookupColumns();

    await generateIndividuals(_makeConceptWithLookup());

    const [{ neededColumnsByDatasetId }] = runQueryMock.mock.calls[0]!;
    expect(neededColumnsByDatasetId).toEqual({
      [DATASET_ID]: ["person_id"],
      [LOOKUP_DATASET_ID]: ["lookup_lab_number", "lookup_patient_id"],
    });
  });

  it("ends the job with a notice naming how many IDs each dataset left out", async () => {
    _mockLookupColumns();
    _mockExcludedKeyCounts([{ source_index: 0, excluded_key_count: 2n }]);

    await generateIndividuals(_makeConceptWithLookup());

    expect(JobProgressStore.getAllJobs().map(({ entry }) => entry)).toEqual([
      {
        status: "notice",
        label: "Refreshed Person records",
        message:
          "2 IDs in Lab results did not match a record, so their rows were left out.",
      },
    ]);
  });

  it("finishes the job without a notice when every ID matched", async () => {
    _mockLookupColumns();
    _mockExcludedKeyCounts([]);

    await generateIndividuals(_makeConceptWithLookup());

    expect(JobProgressStore.getAllJobs()).toEqual([]);
  });

  it("runs no left-out ID count for a case type that compares keys exactly", async () => {
    await generateIndividuals(_makeConcept());

    expect(
      _getRunSqlStatements().some((sql) => {
        return sql.includes("excluded_key_count");
      }),
    ).toBe(false);
  });
```

If plan 6 changed `_makeConcept` or the mocks' shapes, adapt these helpers to it; the assertions do not change.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test:frontend src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/generateIndividuals.test.ts`
Expected: FAIL: the staging SQL does not read the lookup dataset, and no notice is left.

- [ ] **Step 3: Give each key source its key matching**

In `generateIndividuals.ts`, plan 6's `_getRecordKeySources` reads every identifier mapping row (`flatMap(prop("mappings"))`), fetches each row's key column, and returns `{ datasetId, primaryKeyColumnName }`. Change three things in it:

1. Narrow with the namespace type: `.filter((mapping): mapping is DatasetColumnMapping.T => { return mapping.type === "dataset_column"; })`, and replace the file's type import of `DatasetColumnMapping` from `DatasetColumnMapping.types` with `import { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping";` (both bind the same name; the value is needed below).
2. Fetch every column a key reads, the lookup's included:

   ```ts
     const keyColumns = await DatasetColumnClient.getAll(
       where(
         "id",
         "in",
         identifierMappings.flatMap((mapping) => {
           return DatasetColumnMapping.getKeyColumnIds(mapping);
         }),
       ),
     );
   ```

3. Return the key matching with each source:

   ```ts
       return {
         datasetId: keyColumn.datasetId,
         primaryKeyColumnName: keyColumn.name,
         keyMatching: getRecordKeyMatchingFromMapping({
           mapping,
           datasetColumnsById: keyColumnsById,
         }),
       };
   ```

Extend its docstring: "Each source carries its mapping's normalizations and ID lookup table, resolved by the same function the concept planner uses."

- [ ] **Step 4: Read the lookup columns, and count left-out IDs**

In plan 6's `_stageRecordKeys`, replace the inline `neededColumnsByDatasetId: objectValuesMap(makeBucketRecord(...), ...)` with:

```ts
    neededColumnsByDatasetId: getNeededColumnsFromRecordKeySources(keySources),
```

and change its comment's last sentence to "Sync reads each contributing dataset's key column, and each ID lookup table's two key columns." Remove `objectValuesMap` and `makeBucketRecord` from the imports if nothing else uses them.

Add:

```ts
/** How many of one source dataset's IDs matched no record. */
type ExcludedKeyCount = { datasetId: Dataset.Id; excludedKeyCount: number };

/**
 * Counts the IDs each key source left out, for the sources whose key
 * matching can leave any out. A case type without key matching runs no
 * query here.
 */
async function _getExcludedKeyCounts(
  options: Readonly<{
    workspaceId: Workspace.Id;
    keySources: readonly RecordKeySource[];
  }>,
): Promise<ExcludedKeyCount[]> {
  const rawSql = buildExcludedKeyCountsSql(options.keySources);
  if (rawSql === undefined) {
    return [];
  }
  const result = await WorkspaceQuerySession.runQuery<ExcludedKeyCountRow>({
    rawSql,
    workspaceId: options.workspaceId,
    neededColumnsByDatasetId: getNeededColumnsFromRecordKeySources(
      options.keySources,
    ),
  });
  return result.data.flatMap((row) => {
    const keySource = options.keySources[Number(row.source_index)];
    const excludedKeyCount = Number(row.excluded_key_count);
    return keySource && excludedKeyCount > 0
      ? [{ datasetId: keySource.datasetId, excludedKeyCount }]
      : [];
  });
}
```

In `_runGenerateIndividuals`, plan 6 already calls `_getRecordKeySources(concept)` and `_stageRecordKeys({ workspaceId, stagingTableName, keySources })`. Make `const excludedKeyCounts = await _getExcludedKeyCounts({ workspaceId: concept.workspaceId, keySources });` the first statement inside its `try` (so a failure still drops the staging table), return `excludedKeyCounts` at the end of the `try` after the stale sweep, and change the function's return type to `Promise<ExcludedKeyCount[]>`.

- [ ] **Step 5: Finish with a notice**

Add:

```ts
/**
 * One sentence per dataset that left IDs out, in source order. A dataset the
 * concept does not list reads as "one of the datasets" rather than an id.
 */
function _buildExcludedKeysMessage(
  options: Readonly<{
    excludedKeyCounts: readonly ExcludedKeyCount[];
    datasets: BuildableConcept["datasets"];
  }>,
): string {
  return options.excludedKeyCounts
    .map(({ datasetId, excludedKeyCount }) => {
      const datasetName =
        options.datasets.find((dataset) => {
          return dataset.id === datasetId;
        })?.name ?? t`one of the datasets`;
      return plural(excludedKeyCount, {
        one: `# ID in ${datasetName} did not match a record, so its rows were left out.`,
        other: `# IDs in ${datasetName} did not match a record, so their rows were left out.`,
      });
    })
    .join(" ");
}
```

and in `generateIndividuals`, replace `await _runGenerateIndividuals(concept, jobId); JobProgressStore.finishJob(jobId);` with:

```ts
    const excludedKeyCounts = await _runGenerateIndividuals(concept, jobId);
    if (excludedKeyCounts.length === 0) {
      JobProgressStore.finishJob(jobId);
    } else {
      JobProgressStore.finishJobWithNotice(jobId, {
        label: t`Refreshed ${concept.name} records`,
        message: _buildExcludedKeysMessage({
          excludedKeyCounts,
          datasets: concept.datasets,
        }),
      });
    }
```

Imports to add: `plural` beside `t` from `@lingui/core/macro`; `getRecordKeyMatchingFromMapping` from `@/clients/qetl/QueryMediator/conceptRelation/getRecordKeyMatchingFromMapping/getRecordKeyMatchingFromMapping`; `buildExcludedKeyCountsSql` and `getNeededColumnsFromRecordKeySources` beside plan 6's `buildRecordKeyStagingSql` import, and the type `ExcludedKeyCountRow` beside its `RecordKeySource`; and the type `Dataset` from `$/models/datasets/Dataset/Dataset`. Remove imports this task left unused.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm test:frontend src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals src/views/OntologyDesignerApp/insertConceptFromFormValues`
Expected: PASS, including plan 6's existing cases.

- [ ] **Step 7: Commit**

```bash
git add src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/
git commit -m "feat(joined-cases): sync record keys and report IDs left out

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 14: Chat contract and shared edge parsing

**Files:**
- Modify: `shared/types/chat.types.ts`
- Create: `supabase/functions/chat/PostChatMessages/parsing/parseCaseKeyMatching/parseCaseKeyMatching.ts`
- Create: `supabase/functions/chat/PostChatMessages/parsing/parseCaseKeyMatching/parseCaseKeyMatching.test.ts`

- [ ] **Step 1: Extend the contract**

In `shared/types/chat.types.ts`, add after `ChatCaseValuePickerRuleType`:

```ts
/**
 * A difference to ignore when comparing a case type's keys. Mirrors the
 * `attribute_mappings__key_normalization` database enum.
 */
export type ChatCaseKeyNormalization =
  | "trim"
  | "lowercase"
  | "alphanumeric_only"
  | "strip_leading_zeros";

/**
 * An ID lookup table: a catalog dataset pairing one source dataset's keys
 * with the shared key the other sources use.
 */
export type ChatCaseKeyCrosswalk = {
  datasetId: string;
  /** The lookup column holding the source dataset's key values. */
  sourceKeyColumnId: string;
  /** The lookup column holding the shared key. */
  recordKeyColumnId: string;
};
```

Add to `ChatCaseSourceDataset`:

```ts
  /** The ID lookup table this dataset's keys are translated through, if any. */
  keyCrosswalk?: ChatCaseKeyCrosswalk;
```

Add to both `ChatCreatedCaseType` and `ChatProposedCaseType`, after the sources field (`identities`, `sourceDatasets`):

```ts
  /**
   * Differences ignored when every source's keys are compared, including ID
   * lookup table columns. One set for the whole case type, so two datasets'
   * keys are always cleaned the same way. Absent means exact matching.
   */
  keyNormalizations?: ChatCaseKeyNormalization[];
```

- [ ] **Step 2: Write the failing parser test**

Create `parseCaseKeyMatching.test.ts`:

```ts
import {
  parseKeyCrosswalk,
  parseKeyNormalizations,
} from "@sbfn/chat/PostChatMessages/parsing/parseCaseKeyMatching/parseCaseKeyMatching.ts";
import { describe, expect, it } from "vitest";

const DATASET_ID = "11111111-1111-4111-8111-111111111111";
const SOURCE_COLUMN_ID = "22222222-2222-4222-8222-222222222222";
const RECORD_COLUMN_ID = "33333333-3333-4333-8333-333333333333";

describe("parseKeyNormalizations", () => {
  it("keeps known normalizations once each, in the order they apply", () => {
    expect(
      parseKeyNormalizations(["strip_leading_zeros", "trim", "trim", "uppercase", 7]),
    ).toEqual(["trim", "strip_leading_zeros"]);
  });

  it("reads anything but an array as no normalizations", () => {
    expect(parseKeyNormalizations("trim")).toEqual([]);
  });
});

describe("parseKeyCrosswalk", () => {
  it("keeps a lookup with three ids and two different columns", () => {
    expect(
      parseKeyCrosswalk({
        datasetId: DATASET_ID,
        sourceKeyColumnId: SOURCE_COLUMN_ID,
        recordKeyColumnId: RECORD_COLUMN_ID,
      }),
    ).toEqual({
      datasetId: DATASET_ID,
      sourceKeyColumnId: SOURCE_COLUMN_ID,
      recordKeyColumnId: RECORD_COLUMN_ID,
    });
  });

  it("drops a lookup missing a column", () => {
    expect(
      parseKeyCrosswalk({ datasetId: DATASET_ID, sourceKeyColumnId: SOURCE_COLUMN_ID }),
    ).toBeUndefined();
  });

  it("drops a lookup that uses one column twice", () => {
    expect(
      parseKeyCrosswalk({
        datasetId: DATASET_ID,
        sourceKeyColumnId: SOURCE_COLUMN_ID,
        recordKeyColumnId: SOURCE_COLUMN_ID,
      }),
    ).toBeUndefined();
  });

  it("drops a lookup whose ids are not UUIDs", () => {
    expect(
      parseKeyCrosswalk({
        datasetId: "lab-lookup",
        sourceKeyColumnId: SOURCE_COLUMN_ID,
        recordKeyColumnId: RECORD_COLUMN_ID,
      }),
    ).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test:frontend supabase/functions/chat/PostChatMessages/parsing/parseCaseKeyMatching`
Expected: FAIL: module not found.

- [ ] **Step 4: Write the helper**

Create `parseCaseKeyMatching.ts`:

```ts
import { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.ts";
import type {
  ChatCaseKeyCrosswalk,
  ChatCaseKeyNormalization,
} from "$/types/chat.types.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function _asUuid(value: unknown): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  return UUID_RE.test(text) ? text : undefined;
}

/**
 * The known normalizations in a tool call, once each and in the order they
 * apply. Unknown values are dropped rather than failing the draft, because
 * the user can tick the right ones on the card.
 */
export function parseKeyNormalizations(
  raw: unknown,
): ChatCaseKeyNormalization[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return DatasetColumnMapping.toCanonicalKeyNormalizations(
    raw.filter((value): value is string => {
      return typeof value === "string";
    }),
  );
}

/**
 * An ID lookup table from a tool call, or undefined unless it names three
 * UUIDs and two different columns. A partial lookup is dropped and its
 * source kept, so the card shows the source without one rather than
 * creating a lookup the database would refuse.
 */
export function parseKeyCrosswalk(
  raw: unknown,
): ChatCaseKeyCrosswalk | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const record = raw as Record<string, unknown>;
  const datasetId = _asUuid(record.datasetId);
  const sourceKeyColumnId = _asUuid(record.sourceKeyColumnId);
  const recordKeyColumnId = _asUuid(record.recordKeyColumnId);
  if (
    !datasetId ||
    !sourceKeyColumnId ||
    !recordKeyColumnId ||
    sourceKeyColumnId === recordKeyColumnId
  ) {
    return undefined;
  }
  return { datasetId, sourceKeyColumnId, recordKeyColumnId };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test:frontend supabase/functions/chat/PostChatMessages/parsing/parseCaseKeyMatching`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add shared/types/chat.types.ts supabase/functions/chat/PostChatMessages/parsing/parseCaseKeyMatching/
git commit -m "feat(joined-cases): add key matching to the case type chat contract

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 15: Edge parsers and tool schemas

**Files:**
- Modify: `supabase/functions/chat/PostChatMessages/parsing/parseProposeCaseType.ts` (`_parseSourceDataset`, `parseProposeCaseType`)
- Modify: `supabase/functions/chat/PostChatMessages/parsing/parseCreateCaseTypes.ts` (`_parseIdentity`, `_parseCaseType`)
- Modify: `supabase/functions/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.ts`
- Test: `parseProposeCaseType.test.ts`, `parseCreateCaseTypes.test.ts`, `makeChatToolConfigFromOptions.test.ts`

- [ ] **Step 1: Write the failing parser tests**

Add to `parseProposeCaseType.test.ts` (using its existing valid-proposal fixture, here called `_makeProposalArgs`; use the file's real helper):

```ts
it("keeps a source's ID lookup table and the case type's normalizations", () => {
  const draft = parseProposeCaseType(
    JSON.stringify({
      ..._makeProposalArgs(),
      keyNormalizations: ["lowercase", "trim"],
      sourceDatasets: [
        {
          datasetId: LABS_DATASET_ID,
          primaryKeyColumnId: LAB_NUMBER_COLUMN_ID,
          keyCrosswalk: {
            datasetId: PATIENTS_DATASET_ID,
            sourceKeyColumnId: PATIENT_LAB_COLUMN_ID,
            recordKeyColumnId: PATIENT_ID_COLUMN_ID,
          },
        },
      ],
    }),
  );

  expect(draft?.keyNormalizations).toEqual(["trim", "lowercase"]);
  expect(draft?.sourceDatasets[0]?.keyCrosswalk).toEqual({
    datasetId: PATIENTS_DATASET_ID,
    sourceKeyColumnId: PATIENT_LAB_COLUMN_ID,
    recordKeyColumnId: PATIENT_ID_COLUMN_ID,
  });
});

it("keeps a source whose ID lookup table is partial, without the lookup", () => {
  const draft = parseProposeCaseType(
    JSON.stringify({
      ..._makeProposalArgs(),
      sourceDatasets: [
        {
          datasetId: LABS_DATASET_ID,
          primaryKeyColumnId: LAB_NUMBER_COLUMN_ID,
          keyCrosswalk: { datasetId: PATIENTS_DATASET_ID },
        },
      ],
    }),
  );

  expect(draft?.sourceDatasets).toEqual([
    { datasetId: LABS_DATASET_ID, primaryKeyColumnId: LAB_NUMBER_COLUMN_ID },
  ]);
});

it("leaves normalizations out when the proposal names none", () => {
  const draft = parseProposeCaseType(JSON.stringify(_makeProposalArgs()));
  expect(draft).not.toHaveProperty("keyNormalizations");
});
```

Add the same three claims to `parseCreateCaseTypes.test.ts` for `identities[].keyCrosswalk` and a case's `keyNormalizations`. Define the UUID constants beside the file's existing ones.

- [ ] **Step 2: Write the failing tool schema test**

In `makeChatToolConfigFromOptions.test.ts`, insert `"keyNormalizations"` right after `"sourceDatasets"` in the expected key list of "lets proposeCaseType prefill every field of a draft", and add:

```ts
  it("offers normalizations from the enum and an ID lookup table per source", () => {
    const config = makeChatToolConfigFromOptions({
      clarificationCapReached: false,
      app: "case-manager",
    });
    const tools = config.tools as Array<{
      function: {
        name: string;
        parameters: {
          properties: {
            keyNormalizations?: { items: { enum: string[] } };
            sourceDatasets?: {
              items: { properties: Record<string, { required?: string[] }> };
            };
          };
        };
      };
    }>;
    const propose = tools.find((tool) => {
      return tool.function.name === "proposeCaseType";
    });
    const properties = propose?.function.parameters.properties;

    expect(properties?.keyNormalizations?.items.enum).toEqual([
      "trim",
      "lowercase",
      "alphanumeric_only",
      "strip_leading_zeros",
    ]);
    expect(
      properties?.sourceDatasets?.items.properties.keyCrosswalk?.required,
    ).toEqual(["datasetId", "sourceKeyColumnId", "recordKeyColumnId"]);
  });
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm test:frontend supabase/functions/chat/PostChatMessages/parsing supabase/functions/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions`
Expected: FAIL: the parsers drop both fields and the schema lacks them.

- [ ] **Step 4: Parse both fields**

In `parseProposeCaseType.ts`, import `parseKeyCrosswalk` and `parseKeyNormalizations` from `@sbfn/chat/PostChatMessages/parsing/parseCaseKeyMatching/parseCaseKeyMatching.ts`. In `_parseSourceDataset`, replace `return { datasetId, primaryKeyColumnId };` with:

```ts
  const keyCrosswalk = parseKeyCrosswalk(record.keyCrosswalk);
  return {
    datasetId,
    primaryKeyColumnId,
    ...(keyCrosswalk ? { keyCrosswalk } : {}),
  };
```

In `parseProposeCaseType`, compute `const keyNormalizations = parseKeyNormalizations(record.keyNormalizations);` and add to the returned object, after `sourceDatasets`:

```ts
    ...(keyNormalizations.length > 0 ? { keyNormalizations } : {}),
```

Make the same two changes in `parseCreateCaseTypes.ts`: `_parseIdentity` returns `keyCrosswalk` the same way, and `_parseCaseType` adds `keyNormalizations` after `identities`. Add one sentence to each function's docstring: "A source's ID lookup table is kept only when it is whole."

- [ ] **Step 5: Offer both fields in the tool schemas**

In `makeChatToolConfigFromOptions.ts`, import `DatasetColumnMapping` from `$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.ts` and add one shared definition near the top:

```ts
/** An ID lookup table on one source, for both case type tools. */
const KEY_CROSSWALK_SCHEMA = {
  type: "object",
  description:
    "Optional ID lookup table for THIS dataset: a catalog dataset with one column holding this dataset's key values and another holding the shared key the other sources use. Only set it when one catalog dataset plainly pairs the two IDs by its column names, types, name, or description. Otherwise leave it out.",
  properties: {
    datasetId: {
      type: "string",
      description: "Catalog id of the lookup dataset, copied verbatim.",
    },
    sourceKeyColumnId: {
      type: "string",
      description: "Lookup column holding THIS dataset's key values.",
    },
    recordKeyColumnId: {
      type: "string",
      description: "Lookup column holding the shared key.",
    },
  },
  required: ["datasetId", "sourceKeyColumnId", "recordKeyColumnId"],
  additionalProperties: false,
} as const;

/** The case type's normalizations, for both case type tools. */
const KEY_NORMALIZATIONS_SCHEMA = {
  type: "array",
  description:
    "Differences to ignore when comparing every source's keys, including lookup table columns: trim (spaces at either end), lowercase (letter case), alphanumeric_only (dashes, spaces, and other symbols), strip_leading_zeros (zeros at the start). Leave out unless the catalog gives a reason.",
  items: { type: "string", enum: [...DatasetColumnMapping.KEY_NORMALIZATIONS] },
} as const;
```

Then, in `proposeCaseType`'s `parameters.properties`, add `keyNormalizations: KEY_NORMALIZATIONS_SCHEMA,` right after `sourceDatasets`, and `keyCrosswalk: KEY_CROSSWALK_SCHEMA,` to `sourceDatasets.items.properties` after `primaryKeyColumnId`. In `createCaseTypes`, add `keyNormalizations: KEY_NORMALIZATIONS_SCHEMA,` to each case's properties after `identities`, and `keyCrosswalk: KEY_CROSSWALK_SCHEMA,` to `identities.items.properties`. Leave every `required` list as it is: both fields are optional.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm test:frontend supabase/functions/chat/PostChatMessages`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/chat/PostChatMessages/parsing/ supabase/functions/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.ts supabase/functions/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.test.ts
git commit -m "feat(joined-cases): let chat propose key matching for a case type

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 16: Prompt rules for key matching

**Files:**
- Modify: `supabase/functions/chat/PostChatMessages/prompt/buildCaseManagerSystemPrompt.ts` (the "Joining rests entirely on the join keys" list)
- Test: `supabase/functions/chat/PostChatMessages/prompt/buildCaseManagerSystemPrompt.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
  it("limits key normalizations and ID lookup tables to what the catalog shows", () => {
    const prompt = buildCaseManagerSystemPrompt({
      datasets: [],
      columns: [],
      concepts: [],
    });

    expect(prompt).toContain("`keyNormalizations`");
    expect(prompt).toContain(
      "Leave `keyNormalizations` out unless the catalog gives a reason",
    );
    expect(prompt).toContain("`keyCrosswalk`");
    expect(prompt).toContain(
      "Never invent a lookup table to rescue a dataset",
    );
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend supabase/functions/chat/PostChatMessages/prompt/buildCaseManagerSystemPrompt`
Expected: FAIL: the prompt does not mention the fields.

- [ ] **Step 3: Add the rules**

In `caseManagerRules`, change the bullet "If a dataset holds tempting columns but nothing that carries the shared key, leave that dataset out. A source without a usable key makes the whole case type unqueryable, which is worse than a missing field." to end with " The one exception is an ID lookup table, below.", and add after the list's last bullet ("Prefer a key that is genuinely shared ..."):

```text
- Keys often differ only in formatting between files. \`keyNormalizations\` lists the differences to ignore for every source at once: trim (spaces at either end), lowercase (letter case), alphanumeric_only (dashes, spaces, and other symbols), strip_leading_zeros (zeros at the start). Leave \`keyNormalizations\` out unless the catalog gives a reason: a key that is numeric in one source and text in another suggests trim and strip_leading_zeros, and a code column whose name implies zero padding (zip, FIPS) suggests strip_leading_zeros. If the user says IDs differ in case, spacing, punctuation, or padding, add the matching ones.
- A dataset may identify the same things with a different ID scheme, such as a lab's sample number. Include it as a source keyed on its own ID column, with a \`keyCrosswalk\` naming an ID lookup table, only when one catalog dataset plainly pairs the two IDs: a column whose name and type match this source's key and another whose name and type match the shared key, or a name or description that says it maps one to the other. Another source can be the lookup table. Never invent a lookup table to rescue a dataset; without one, leave the dataset out.
```

(Inside the template literal, keep the backticks escaped as the file's other bullets do.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:frontend supabase/functions/chat/PostChatMessages/prompt`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/chat/PostChatMessages/prompt/buildCaseManagerSystemPrompt.ts supabase/functions/chat/PostChatMessages/prompt/buildCaseManagerSystemPrompt.test.ts
git commit -m "feat(joined-cases): tell the case manager model when to match keys loosely

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 17: Key matching reaches the mappings

**Files:**
- Create: `src/views/OntologyDesignerApp/applyKeyMatchingToIdentifierAttributes/applyKeyMatchingToIdentifierAttributes.ts`
- Create: `src/views/OntologyDesignerApp/applyKeyMatchingToIdentifierAttributes/applyKeyMatchingToIdentifierAttributes.test.ts`
- Modify: `src/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes.ts`
- Modify: `src/views/OntologyDesignerApp/createdCaseTypeToFormValues/createdCaseTypeToFormValues.ts` (+ test)
- Modify: `src/views/OntologyDesignerApp/proposedCaseTypeToCreatedCaseType/proposedCaseTypeToCreatedCaseType.ts` (+ test)
- Modify: `src/clients/ontology/ConceptClient.test.ts`

- [ ] **Step 1: Add the form value types**

In `conceptFormTypes.ts`, add to each `sourceDatasets` entry:

```ts
    /** The ID lookup table this dataset's keys translate through, as chosen so far. */
    keyCrosswalk?: DatasetColumnMapping.KeyCrosswalkDraft;
```

and to `ConceptFormValues`:

```ts
  /**
   * Differences ignored when keys are compared, written to every identifier
   * mapping so two datasets' keys are always cleaned the same way.
   */
  keyNormalizations: DatasetColumnMapping.KeyNormalization[];
```

Set `keyNormalizations: []` in `getDefaultConceptFormValues`. Switch the file's `DatasetColumnMapping` import from `DatasetColumnMapping.types` to `import type { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping";`, and write `DatasetColumnMapping.T<"Insert">` where plan 5's `AttributeSourceFormValues` wrote `DatasetColumnMapping<"Insert">`. Each source draft then accepts `keyNormalizations` and the three `crosswalk*` ids, which Task 4 made optional on the insert type.

- [ ] **Step 2: Write the failing test for the helper**

New case types get one ID field with one source per dataset (plan 5's `makeAttributesWithIdentifierFromKeyColumns`), so the test builds that field the same way.

```ts
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { applyKeyMatchingToIdentifierAttributes } from "@/views/OntologyDesignerApp/applyKeyMatchingToIdentifierAttributes/applyKeyMatchingToIdentifierAttributes";
import { makeDefaultManualEntryAttribute } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import { makeAttributesWithIdentifierFromKeyColumns } from "@/views/OntologyDesignerApp/makeAttributesWithIdentifierFromKeyColumns/makeAttributesWithIdentifierFromKeyColumns";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { DatasetColumnId } from "$/models/datasets/DatasetColumn/DatasetColumn.types";
import type { ConceptId } from "$/models/ontology/Concept/Concept.types";
import type { KeyColumn } from "@/views/OntologyDesignerApp/makeAttributesWithIdentifierFromKeyColumns/makeAttributesWithIdentifierFromKeyColumns";

const CONCEPT_ID = uuid<ConceptId>();
const PATIENTS_DATASET_ID = uuid<DatasetId>();
const LABS_DATASET_ID = uuid<DatasetId>();
const LOOKUP = {
  datasetId: PATIENTS_DATASET_ID,
  sourceKeyColumnId: uuid<DatasetColumnId>(),
  recordKeyColumnId: uuid<DatasetColumnId>(),
};

const KEY_COLUMNS: KeyColumn[] = [
  {
    id: uuid<DatasetColumnId>(),
    datasetId: PATIENTS_DATASET_ID,
    name: "patient_id",
    dataType: "varchar",
  },
  {
    id: uuid<DatasetColumnId>(),
    datasetId: LABS_DATASET_ID,
    name: "lab_number",
    dataType: "varchar",
  },
];

/** The one ID field plan 5 builds from the two datasets' join keys. */
function _makeIdField() {
  const [idField] = makeAttributesWithIdentifierFromKeyColumns({
    conceptId: CONCEPT_ID,
    keyColumns: KEY_COLUMNS,
    attributes: [],
  });
  if (!idField) {
    throw new Error("The ID field was not built.");
  }
  return idField;
}

describe("applyKeyMatchingToIdentifierAttributes", () => {
  it("writes the normalizations to every ID source and each dataset's own lookup", () => {
    const [idField] = applyKeyMatchingToIdentifierAttributes({
      attributes: [_makeIdField()],
      keyNormalizations: ["trim", "lowercase"],
      keyCrosswalksByDatasetId: new Map([[LABS_DATASET_ID, LOOKUP]]),
    });

    expect(idField?.mappings.datasetColumn).toMatchObject([
      {
        datasetId: PATIENTS_DATASET_ID,
        keyNormalizations: ["trim", "lowercase"],
        crosswalkDatasetId: undefined,
      },
      {
        datasetId: LABS_DATASET_ID,
        keyNormalizations: ["trim", "lowercase"],
        crosswalkDatasetId: LOOKUP.datasetId,
        crosswalkSourceKeyColumnId: LOOKUP.sourceKeyColumnId,
        crosswalkRecordKeyColumnId: LOOKUP.recordKeyColumnId,
      },
    ]);
  });

  it("leaves fields that are not identifiers unchanged", () => {
    const idField = _makeIdField();
    const valueField = {
      ...idField,
      id: uuid<typeof idField.id>(),
      isIdentifier: false,
      isLabel: false,
    };
    const manualField = makeDefaultManualEntryAttribute({
      conceptId: CONCEPT_ID,
      name: "Notes",
    });

    expect(
      applyKeyMatchingToIdentifierAttributes({
        attributes: [valueField, manualField],
        keyNormalizations: ["trim"],
        keyCrosswalksByDatasetId: new Map([[LABS_DATASET_ID, LOOKUP]]),
      }),
    ).toEqual([valueField, manualField]);
  });
});
```

(If plan 5 changed `makeDefaultManualEntryAttribute`'s options, build the manual field the way its tests do.)

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test:frontend src/views/OntologyDesignerApp/applyKeyMatchingToIdentifierAttributes`
Expected: FAIL: module not found.

- [ ] **Step 4: Write the helper**

```ts
import type { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping";
import type { AttributeFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";

/**
 * Writes a case type's key matching onto every source of every identifier
 * field: the same normalizations on all of them, and each source its own
 * dataset's ID lookup table. Each source is one mapping row, so one ID field
 * with a source per dataset and one identifier field per dataset come out
 * the same. Other fields come back unchanged, because key matching only means
 * something on a row that keys a dataset.
 *
 * The normalizations go on every identifier source so two datasets' keys are
 * cleaned the same way before they meet. Different sets per dataset would
 * split one record into two without any error.
 */
export function applyKeyMatchingToIdentifierAttributes(
  options: Readonly<{
    attributes: readonly AttributeFormValues[];
    keyNormalizations: readonly DatasetColumnMapping.KeyNormalization[];
    keyCrosswalksByDatasetId: ReadonlyMap<
      string,
      DatasetColumnMapping.KeyCrosswalk
    >;
  }>,
): AttributeFormValues[] {
  return options.attributes.map((attribute) => {
    if (!attribute.isIdentifier || attribute.mappingType !== "dataset_column") {
      return attribute;
    }
    return {
      ...attribute,
      mappings: {
        ...attribute.mappings,
        datasetColumn: attribute.mappings.datasetColumn.map((source) => {
          const keyCrosswalk = options.keyCrosswalksByDatasetId.get(
            source.datasetId,
          );
          return {
            ...source,
            keyNormalizations: [...options.keyNormalizations],
            crosswalkDatasetId: keyCrosswalk?.datasetId,
            crosswalkSourceKeyColumnId: keyCrosswalk?.sourceKeyColumnId,
            crosswalkRecordKeyColumnId: keyCrosswalk?.recordKeyColumnId,
          };
        }),
      },
    };
  });
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test:frontend src/views/OntologyDesignerApp/applyKeyMatchingToIdentifierAttributes`
Expected: PASS.

- [ ] **Step 6: Write the failing conversion tests**

In `proposedCaseTypeToCreatedCaseType.test.ts`:

```ts
it("carries the case type's normalizations and each kept source's lookup", () => {
  const created = proposedCaseTypeToCreatedCaseType({
    ..._makeDraft(),
    keyNormalizations: ["trim"],
    sourceDatasets: [
      {
        datasetId: LABS_DATASET_ID,
        primaryKeyColumnId: LAB_NUMBER_COLUMN_ID,
        keyCrosswalk: LOOKUP,
      },
    ],
  });

  expect(created.keyNormalizations).toEqual(["trim"]);
  expect(created.identities[0]?.keyCrosswalk).toEqual(LOOKUP);
});
```

In `createdCaseTypeToFormValues.test.ts`:

```ts
it("puts the normalizations and a resolvable lookup on the identifier mappings only", () => {
  const values = createdCaseTypeToFormValues({
    caseType: {
      ..._makeCaseType(),
      keyNormalizations: ["lowercase", "trim"],
      identities: [
        {
          datasetId: LABS_DATASET_ID,
          primaryKeyColumnId: LAB_NUMBER_COLUMN_ID,
          keyCrosswalk: {
            datasetId: PATIENTS_DATASET_ID,
            sourceKeyColumnId: PATIENT_LAB_COLUMN_ID,
            recordKeyColumnId: PATIENT_ID_COLUMN_ID,
          },
        },
      ],
    },
    workspaceId: WORKSPACE_ID,
    columns: CATALOG_COLUMNS,
  });

  const identifier = values.attributes.find((attribute) => {
    return attribute.isIdentifier;
  });
  expect(identifier?.mappings.datasetColumn).toMatchObject([
    {
      datasetId: LABS_DATASET_ID,
      keyNormalizations: ["trim", "lowercase"],
      crosswalkDatasetId: PATIENTS_DATASET_ID,
      crosswalkSourceKeyColumnId: PATIENT_LAB_COLUMN_ID,
      crosswalkRecordKeyColumnId: PATIENT_ID_COLUMN_ID,
    },
  ]);
  values.attributes
    .filter((attribute) => {
      return !attribute.isIdentifier && attribute.mappingType === "dataset_column";
    })
    .flatMap((attribute) => {
      return attribute.mappings.datasetColumn;
    })
    .forEach((source) => {
      expect(source.keyNormalizations ?? []).toEqual([]);
    });
});

it("drops a lookup whose columns are not in the lookup dataset", () => {
  const values = createdCaseTypeToFormValues({
    caseType: {
      ..._makeCaseType(),
      identities: [
        {
          datasetId: LABS_DATASET_ID,
          primaryKeyColumnId: LAB_NUMBER_COLUMN_ID,
          keyCrosswalk: {
            datasetId: PATIENTS_DATASET_ID,
            sourceKeyColumnId: LAB_NUMBER_COLUMN_ID,
            recordKeyColumnId: PATIENT_ID_COLUMN_ID,
          },
        },
      ],
    },
    workspaceId: WORKSPACE_ID,
    columns: CATALOG_COLUMNS,
  });

  const identifier = values.attributes.find((attribute) => {
    return attribute.isIdentifier;
  });
  expect(identifier?.mappings.datasetColumn[0]?.crosswalkDatasetId).toBeUndefined();
});
```

`CATALOG_COLUMNS` holds `LAB_NUMBER_COLUMN_ID` and a value column on the labs dataset, and `PATIENT_LAB_COLUMN_ID` and `PATIENT_ID_COLUMN_ID` on the patients dataset; `_makeCaseType` is the file's existing case type fixture with one labs value attribute (plan 5's `sources` shape). With one identity, the ID field has one source. Reuse the file's names where they exist.

In `ConceptClient.test.ts`, add `keyNormalizations: ["lowercase", "trim"]` and the three `crosswalk*` ids to the dataset-column mapping of the existing "sends the case type..." test, and assert:

```ts
    expect(args.p_dataset_column_mappings).toEqual([
      expect.objectContaining({
        concept_attribute_id: KEY_ATTRIBUTE_ID,
        key_normalizations: ["trim", "lowercase"],
        crosswalk_dataset_id: LOOKUP_DATASET_ID,
        crosswalk_source_key_column_id: LOOKUP_SOURCE_COLUMN_ID,
        crosswalk_record_key_column_id: LOOKUP_RECORD_COLUMN_ID,
      }),
    ]);
```

- [ ] **Step 7: Run the conversion tests to verify they fail**

Run: `pnpm test:frontend src/views/OntologyDesignerApp/proposedCaseTypeToCreatedCaseType src/views/OntologyDesignerApp/createdCaseTypeToFormValues src/clients/ontology/ConceptClient`
Expected: `proposedCaseTypeToCreatedCaseType` and `createdCaseTypeToFormValues` FAIL (no normalizations carried); `ConceptClient` already PASSES, because the parser from Task 5 writes the fields. Keep that test: it guards the payload.

- [ ] **Step 8: Carry normalizations through the proposal**

In `proposedCaseTypeToCreatedCaseType.ts`, add to the returned object after `identities: sourceDatasets,`:

```ts
    ...(draft.keyNormalizations && draft.keyNormalizations.length > 0
      ? { keyNormalizations: draft.keyNormalizations }
      : {}),
```

Sources keep their `keyCrosswalk` already, because `_contributingSourceDatasets` returns the draft's source objects. Add to the function's docstring: "Key matching travels with it: the case type's normalizations and each kept source's ID lookup table."

- [ ] **Step 9: Resolve and apply key matching in the created case type**

In `createdCaseTypeToFormValues.ts`, add:

```ts
/**
 * A source's ID lookup table, resolved against the workspace's columns, or
 * undefined when a column is unknown, belongs to another dataset, or is used
 * twice. Unknown column ids are dropped here the same way unknown attribute
 * columns are.
 */
function _resolveKeyCrosswalk(options: {
  keyCrosswalk: ChatCaseKeyCrosswalk | undefined;
  columns: readonly CatalogColumn[];
}): DatasetColumnMapping.KeyCrosswalk | undefined {
  const { keyCrosswalk, columns } = options;
  if (!keyCrosswalk) {
    return undefined;
  }
  const sourceKeyColumn = _findColumn(columns, keyCrosswalk.sourceKeyColumnId);
  const recordKeyColumn = _findColumn(columns, keyCrosswalk.recordKeyColumnId);
  if (
    !sourceKeyColumn ||
    !recordKeyColumn ||
    sourceKeyColumn.id === recordKeyColumn.id ||
    sourceKeyColumn.datasetId !== keyCrosswalk.datasetId ||
    recordKeyColumn.datasetId !== keyCrosswalk.datasetId
  ) {
    return undefined;
  }
  return {
    datasetId: sourceKeyColumn.datasetId,
    sourceKeyColumnId: sourceKeyColumn.id,
    recordKeyColumnId: recordKeyColumn.id,
  };
}

/** Each source's resolvable ID lookup table, by dataset id. */
function _getKeyCrosswalksByDatasetId(options: {
  identities: readonly ChatCaseSourceDataset[];
  columns: readonly CatalogColumn[];
}): Map<string, DatasetColumnMapping.KeyCrosswalk> {
  return new Map(
    options.identities.flatMap((identity) => {
      const keyCrosswalk = _resolveKeyCrosswalk({
        keyCrosswalk: identity.keyCrosswalk,
        columns: options.columns,
      });
      return keyCrosswalk ? [[identity.datasetId, keyCrosswalk] as const] : [];
    }),
  );
}
```

In `createdCaseTypeToFormValues`, replace `const attributes = _attributesFromCaseType({...});` with:

```ts
  const keyNormalizations = DatasetColumnMapping.toCanonicalKeyNormalizations(
    options.caseType.keyNormalizations ?? [],
  );
  // Applied after plan 5's fold (the end of `_attributesFromCaseType`) has
  // built the one ID field, so every one of its sources gets it.
  const attributes = applyKeyMatchingToIdentifierAttributes({
    attributes: _attributesFromCaseType({
      caseType: options.caseType,
      conceptId,
      columns: options.columns,
    }),
    keyNormalizations,
    keyCrosswalksByDatasetId: _getKeyCrosswalksByDatasetId({
      identities: options.caseType.identities,
      columns: options.columns,
    }),
  });
```

and add `keyNormalizations,` to the `Model.make("Concept", {...})` form values. Imports: `DatasetColumnMapping` (value) from `$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping`, `applyKeyMatchingToIdentifierAttributes`, and `ChatCaseKeyCrosswalk` beside `ChatCaseSourceDataset`.

- [ ] **Step 10: Fix form value fixtures the type checker flags**

Run: `pnpm type-check`
Expected: errors only where a test builds `ConceptFormValues` or `ConceptFormSubmitValues` by hand without `keyNormalizations` (for example in `insertConceptFromFormValues.test.ts` or `conceptFormTypes.test.ts`). Add `keyNormalizations: []` to each, nothing else, and run `pnpm type-check` again until it is clean.

- [ ] **Step 11: Run the tests to verify they pass**

Run: `pnpm test:frontend src/views/OntologyDesignerApp src/clients/ontology/ConceptClient`
Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add src/views/OntologyDesignerApp/applyKeyMatchingToIdentifierAttributes/ \
  src/views/OntologyDesignerApp/ConceptCreatorView/ \
  src/views/OntologyDesignerApp/insertConceptFromFormValues/ \
  src/views/OntologyDesignerApp/createdCaseTypeToFormValues/ \
  src/views/OntologyDesignerApp/proposedCaseTypeToCreatedCaseType/ \
  src/clients/ontology/ConceptClient.test.ts
git commit -m "feat(joined-cases): write key matching onto identifier mappings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 18: Shared key matching controls

**Files:**
- Create: `src/components/caseKeyMatching/useKeyNormalizationLabels/useKeyNormalizationLabels.ts`
- Create: `src/components/caseKeyMatching/useKeyLookupIssueMessage/useKeyLookupIssueMessage.ts`
- Create: `src/components/caseKeyMatching/KeyNormalizationCheckboxGroup/KeyNormalizationCheckboxGroup.tsx`
- Create: `src/components/caseKeyMatching/KeyLookupFields/KeyLookupFields.tsx`
- Create: `src/components/caseKeyMatching/KeyLookupFields/KeyLookupSelects.tsx`
- Create: `src/components/caseKeyMatching/KeyLookupFields/KeyLookupFields.test.tsx`

- [ ] **Step 1: Write the failing component test**

```tsx
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { describe, expect, it, vi } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { KeyLookupFields } from "@/components/caseKeyMatching/KeyLookupFields/KeyLookupFields";
import { render, screen, userEvent } from "@/test-utils";
import type { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping";

const PATIENTS_ID = "11111111-1111-4111-8111-111111111111";
const LAB_COLUMN_ID = "22222222-2222-4222-8222-222222222222";
const PATIENT_COLUMN_ID = "33333333-3333-4333-8333-333333333333";

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAllDatasetsWithColumns: () => {
        return [
          [
            {
              id: PATIENTS_ID,
              name: "Patients",
              columns: [
                { id: LAB_COLUMN_ID, name: "patient_lab_number" },
                { id: PATIENT_COLUMN_ID, name: "patient_id" },
              ],
            },
          ],
          false,
        ];
      },
    },
  };
});

function _renderFields(
  options: {
    value?: DatasetColumnMapping.KeyCrosswalkDraft;
    onChange?: (draft: DatasetColumnMapping.KeyCrosswalkDraft | undefined) => void;
  } = {},
): void {
  render(
    <I18nProvider i18n={i18n}>
      <AvandarAppProvider>
        <KeyLookupFields
          sourceDatasetName="Lab results"
          recordNoun="case"
          value={options.value}
          onChange={options.onChange ?? vi.fn()}
        />
      </AvandarAppProvider>
    </I18nProvider>,
  );
}

describe("KeyLookupFields", () => {
  it("offers to start an ID lookup table when there is none", async () => {
    const onChange = vi.fn();
    _renderFields({ onChange });

    await userEvent.click(
      screen.getByRole("button", {
        name: "Use an ID lookup table for Lab results",
      }),
    );

    expect(onChange).toHaveBeenCalledWith({});
  });

  it("clears both columns when the lookup table changes", async () => {
    const onChange = vi.fn();
    _renderFields({
      value: {
        datasetId: "44444444-4444-4444-8444-444444444444",
        sourceKeyColumnId: LAB_COLUMN_ID,
        recordKeyColumnId: PATIENT_COLUMN_ID,
      },
      onChange,
    });

    await userEvent.click(screen.getByRole("textbox", { name: "ID lookup table" }));
    await userEvent.click(screen.getByRole("option", { name: "Patients" }));

    expect(onChange).toHaveBeenLastCalledWith({ datasetId: PATIENTS_ID });
  });

  it("removes the lookup table when the user stops using it", async () => {
    const onChange = vi.fn();
    _renderFields({ value: { datasetId: PATIENTS_ID }, onChange });

    await userEvent.click(
      screen.getByRole("button", {
        name: "Stop using an ID lookup table for Lab results",
      }),
    );

    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });
});
```

(If Mantine's `Select` input is exposed as `combobox` rather than `textbox` in this repo's tests, use that role; `CaseTypeDraftBlock.test.tsx` shows which.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend src/components/caseKeyMatching`
Expected: FAIL: module not found.

- [ ] **Step 3: Write the two hooks**

`useKeyNormalizationLabels/useKeyNormalizationLabels.ts`:

```ts
import { useLingui } from "@lingui/react/macro";
import type { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping";

/**
 * What each key normalization ignores, as a user reads it. The words name
 * the difference in the data, never the cleaning step.
 */
export function useKeyNormalizationLabels(): Readonly<
  Record<DatasetColumnMapping.KeyNormalization, string>
> {
  const { t } = useLingui();
  return {
    trim: t`Spaces at the start or end`,
    lowercase: t`Upper and lower case`,
    alphanumeric_only: t`Dashes, spaces, and other symbols`,
    strip_leading_zeros: t`Zeros at the start`,
  };
}
```

`useKeyLookupIssueMessage/useKeyLookupIssueMessage.ts`:

```ts
import { matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping";

/** What to tell the user about an ID lookup table draft, or undefined. */
export function useKeyLookupIssueMessage(
  draft: DatasetColumnMapping.KeyCrosswalkDraft | undefined,
): string | undefined {
  const { t } = useLingui();
  const issue = draft ? DatasetColumnMapping.getKeyCrosswalkIssue(draft) : undefined;
  return issue
    ? matchLiteral(issue, {
        incomplete: t`Choose the lookup table and both of its columns.`,
        same_column: t`Choose two different columns.`,
      })
    : undefined;
}
```

- [ ] **Step 4: Write the checkbox group**

`KeyNormalizationCheckboxGroup/KeyNormalizationCheckboxGroup.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Checkbox, Stack } from "@mantine/core";
import { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping";
import { useKeyNormalizationLabels } from "@/components/caseKeyMatching/useKeyNormalizationLabels/useKeyNormalizationLabels";
import type { MantineSize } from "@mantine/core";

type Props = {
  value?: readonly DatasetColumnMapping.KeyNormalization[];
  defaultValue?: readonly DatasetColumnMapping.KeyNormalization[];
  onChange?: (keyNormalizations: DatasetColumnMapping.KeyNormalization[]) => void;
  size?: MantineSize;
};

/**
 * The differences a case type ignores when it compares IDs, one checkbox
 * each, in the order they apply. Controlled or uncontrolled, so it works in
 * the form and on the draft card alike.
 */
export function KeyNormalizationCheckboxGroup({
  value,
  defaultValue,
  onChange,
  size = "sm",
}: Readonly<Props>): React.ReactNode {
  const { t } = useLingui();
  const labels = useKeyNormalizationLabels();
  return (
    <Checkbox.Group
      size={size}
      label={t`Match IDs that differ only in`}
      description={t`Applies to the IDs of every dataset and ID lookup table.`}
      value={value ? [...value] : undefined}
      defaultValue={defaultValue ? [...defaultValue] : undefined}
      onChange={(values) => {
        onChange?.(values.filter(DatasetColumnMapping.isKeyNormalization));
      }}
    >
      <Stack gap={4} mt={6}>
        {DatasetColumnMapping.KEY_NORMALIZATIONS.map((keyNormalization) => {
          return (
            <Checkbox
              key={keyNormalization}
              size={size}
              value={keyNormalization}
              label={labels[keyNormalization]}
            />
          );
        })}
      </Stack>
    </Checkbox.Group>
  );
}
```

- [ ] **Step 5: Write the lookup fields**

`KeyLookupFields/KeyLookupSelects.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import type { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping";
import type { DatasetWithColumns } from "$/models/datasets/Dataset/Dataset.types";
import type { MantineSize } from "@mantine/core";

type Props = {
  draft: DatasetColumnMapping.KeyCrosswalkDraft;
  datasets: readonly DatasetWithColumns[];
  sourceDatasetName: string;
  recordNoun: string;
  error: React.ReactNode;
  size: MantineSize;
  onChange: (draft: DatasetColumnMapping.KeyCrosswalkDraft) => void;
};

/** The lookup table, then its two columns. Changing the table clears both. */
export function KeyLookupSelects({
  draft,
  datasets,
  sourceDatasetName,
  recordNoun,
  error,
  size,
  onChange,
}: Readonly<Props>): React.ReactNode {
  const { t } = useLingui();
  const lookupDataset = datasets.find((dataset) => {
    return dataset.id === draft.datasetId;
  });
  const columnOptions = (lookupDataset?.columns ?? []).map((column) => {
    return { value: column.id, label: column.name };
  });
  return (
    <>
      <Select
        size={size}
        label={t`ID lookup table`}
        data={datasets.map((dataset) => {
          return { value: dataset.id, label: dataset.name };
        })}
        value={draft.datasetId ?? null}
        searchable
        allowDeselect={false}
        onChange={(datasetId) => {
          onChange({ datasetId: datasetId ?? undefined });
        }}
      />
      <Select
        size={size}
        label={t`Column with ${sourceDatasetName} IDs`}
        data={columnOptions}
        value={draft.sourceKeyColumnId ?? null}
        disabled={!lookupDataset}
        searchable
        allowDeselect={false}
        onChange={(columnId) => {
          onChange({ ...draft, sourceKeyColumnId: columnId ?? undefined });
        }}
      />
      <Select
        size={size}
        label={t`Column with the matching ${recordNoun} ID`}
        data={columnOptions}
        value={draft.recordKeyColumnId ?? null}
        disabled={!lookupDataset}
        searchable
        allowDeselect={false}
        error={error}
        onChange={(columnId) => {
          onChange({ ...draft, recordKeyColumnId: columnId ?? undefined });
        }}
      />
    </>
  );
}
```

`KeyLookupFields/KeyLookupFields.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Button, Group, Stack, Text } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import { IconArrowsExchange, IconTrash } from "@tabler/icons-react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { KeyLookupSelects } from "@/components/caseKeyMatching/KeyLookupFields/KeyLookupSelects";
import type { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping";
import type { MantineSize } from "@mantine/core";

type Props = {
  /** The source dataset whose IDs the lookup table translates. */
  sourceDatasetName: string;
  /** What one record is called where this renders, such as "case". */
  recordNoun: string;
  value?: DatasetColumnMapping.KeyCrosswalkDraft | undefined;
  defaultValue?: DatasetColumnMapping.KeyCrosswalkDraft | undefined;
  onChange?: (draft: DatasetColumnMapping.KeyCrosswalkDraft | undefined) => void;
  error?: React.ReactNode;
  size?: MantineSize;
};

/**
 * One source dataset's optional ID lookup table: a button to start one, or
 * the lookup table, its two columns, and a button to stop using it. The
 * lookup can be any workspace dataset, so the choices come from the whole
 * catalog rather than from the case type's sources.
 */
export function KeyLookupFields({
  sourceDatasetName,
  recordNoun,
  value,
  defaultValue,
  onChange,
  error,
  size = "sm",
}: Readonly<Props>): React.ReactNode {
  const { t } = useLingui();
  const [draft, setDraft] = useUncontrolled<
    DatasetColumnMapping.KeyCrosswalkDraft | undefined
  >({ value, defaultValue, finalValue: undefined, onChange });
  const [datasets] = DatasetClient.useGetAllDatasetsWithColumns();

  if (!draft) {
    return (
      <Button
        size={size}
        variant="subtle"
        color="neutral"
        leftSection={<IconArrowsExchange size={14} />}
        onClick={() => {
          setDraft({});
        }}
      >
        {t`Use an ID lookup table for ${sourceDatasetName}`}
      </Button>
    );
  }
  return (
    <Stack gap={6}>
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Text size="xs" c="dimmed">
          {t`Use this when ${sourceDatasetName} identifies records with different IDs. Each ID must match exactly one ${recordNoun} in the lookup table.`}
        </Text>
        <ActionIcon
          size="sm"
          variant="subtle"
          color="neutral"
          aria-label={t`Stop using an ID lookup table for ${sourceDatasetName}`}
          onClick={() => {
            setDraft(undefined);
          }}
        >
          <IconTrash size={14} />
        </ActionIcon>
      </Group>
      <KeyLookupSelects
        draft={draft}
        datasets={datasets ?? []}
        sourceDatasetName={sourceDatasetName}
        recordNoun={recordNoun}
        error={error}
        size={size}
        onChange={setDraft}
      />
    </Stack>
  );
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm test:frontend src/components/caseKeyMatching`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add src/components/caseKeyMatching/
git commit -m "feat(joined-cases): add controls for how case type IDs are matched

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 19: Key matching on the draft card

**Files:**
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/useCaseTypeDraftEditor.ts`
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/useCaseTypeDraftEditor.test.ts`
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftCard.tsx`
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftSourceSection.tsx`
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftBlock.test.tsx`

- [ ] **Step 1: Write the failing editor tests**

In `useCaseTypeDraftEditor.test.ts` (using its `renderHook` setup and draft fixture, called `_makeDraft` here):

```ts
it("writes the case type's normalizations into the draft", () => {
  const { result } = renderHook(() => {
    return useCaseTypeDraftEditor(_makeDraft());
  });

  act(() => {
    result.current.setKeyNormalizations(["trim", "lowercase"]);
  });

  expect(result.current.draft.keyNormalizations).toEqual(["trim", "lowercase"]);
});

it("writes only a finished ID lookup table into its source", () => {
  const { result } = renderHook(() => {
    return useCaseTypeDraftEditor(_makeDraft());
  });

  act(() => {
    result.current.setKeyCrosswalkDraft(LABS_DATASET_ID, {
      datasetId: PATIENTS_DATASET_ID,
    });
  });
  expect(result.current.draft.sourceDatasets[0]?.keyCrosswalk).toBeUndefined();
  expect(result.current.canCreate).toBe(false);

  act(() => {
    result.current.setKeyCrosswalkDraft(LABS_DATASET_ID, LOOKUP);
  });
  expect(result.current.draft.sourceDatasets[0]?.keyCrosswalk).toEqual(LOOKUP);
  expect(result.current.canCreate).toBe(true);
});

it("starts with the ID lookup table chat proposed", () => {
  const proposed = _makeDraft();
  const { result } = renderHook(() => {
    return useCaseTypeDraftEditor({
      ...proposed,
      sourceDatasets: proposed.sourceDatasets.map((sourceDataset) => {
        return { ...sourceDataset, keyCrosswalk: LOOKUP };
      }),
    });
  });

  expect(result.current.keyCrosswalkDrafts[LABS_DATASET_ID]).toEqual(LOOKUP);
});
```

`LOOKUP` is a whole `ChatCaseKeyCrosswalk` on `PATIENTS_DATASET_ID`; `LABS_DATASET_ID` is the fixture's first source.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test:frontend src/components/ChatPanel/CaseTypeDraftBlock/useCaseTypeDraftEditor`
Expected: FAIL: `setKeyNormalizations` is not a function.

- [ ] **Step 3: Hold key matching in the editor**

In `useCaseTypeDraftEditor.ts`, add to `CaseTypeDraftEditor`:

```ts
  /**
   * Each source's ID lookup table as chosen so far, by dataset id. Only a
   * finished one is written into `draft`.
   */
  keyCrosswalkDrafts: Readonly<
    Record<string, DatasetColumnMapping.KeyCrosswalkDraft | undefined>
  >;
  setKeyCrosswalkDraft: (
    datasetId: string,
    keyCrosswalkDraft: DatasetColumnMapping.KeyCrosswalkDraft | undefined,
  ) => void;
  setKeyNormalizations: (keyNormalizations: ChatCaseKeyNormalization[]) => void;
```

Add the helpers:

```ts
/** The ID lookup tables a proposal starts with, by source dataset id. */
function _getKeyCrosswalkDrafts(
  draft: ChatProposedCaseType,
): Record<string, DatasetColumnMapping.KeyCrosswalkDraft | undefined> {
  return Object.fromEntries(
    draft.sourceDatasets.flatMap((sourceDataset) => {
      return sourceDataset.keyCrosswalk
        ? [[sourceDataset.datasetId, sourceDataset.keyCrosswalk]]
        : [];
    }),
  );
}

/**
 * The draft with each source's finished ID lookup table written into it and
 * any unfinished one left out, the way the status set is written back.
 */
function _withKeyCrosswalks(
  draft: ChatProposedCaseType,
  keyCrosswalkDrafts: Readonly<
    Record<string, DatasetColumnMapping.KeyCrosswalkDraft | undefined>
  >,
): ChatProposedCaseType {
  return {
    ...draft,
    sourceDatasets: draft.sourceDatasets.map((sourceDataset) => {
      const keyCrosswalkDraft = keyCrosswalkDrafts[sourceDataset.datasetId];
      return {
        ...sourceDataset,
        keyCrosswalk: keyCrosswalkDraft
          ? DatasetColumnMapping.toKeyCrosswalk(keyCrosswalkDraft)
          : undefined,
      };
    }),
  };
}

/** True when every ID lookup table the user started is finished. */
function _areKeyCrosswalksFinished(
  keyCrosswalkDrafts: Readonly<
    Record<string, DatasetColumnMapping.KeyCrosswalkDraft | undefined>
  >,
): boolean {
  return Object.values(keyCrosswalkDrafts).every((keyCrosswalkDraft) => {
    return (
      keyCrosswalkDraft === undefined ||
      DatasetColumnMapping.getKeyCrosswalkIssue(keyCrosswalkDraft) === undefined
    );
  });
}
```

In the hook: hold `const [keyCrosswalkDrafts, setKeyCrosswalkDrafts] = useState(() => { return _getKeyCrosswalkDrafts(proposedDraft); });`, reset it with `setKeyCrosswalkDrafts(_getKeyCrosswalkDrafts(proposedDraft));` beside the other resets when the proposal changes, return `draft: _withStatusSet(_withKeyCrosswalks(draft, keyCrosswalkDrafts), statusSet)`, add `&& _areKeyCrosswalksFinished(keyCrosswalkDrafts)` to `canCreate`, and add:

```ts
    keyCrosswalkDrafts,
    setKeyCrosswalkDraft: (datasetId, keyCrosswalkDraft) => {
      setKeyCrosswalkDrafts((current) => {
        return { ...current, [datasetId]: keyCrosswalkDraft };
      });
    },
    setKeyNormalizations: (keyNormalizations) => {
      setDraft((current) => {
        return { ...current, keyNormalizations };
      });
    },
```

In `removeSourceDataset`, also drop that dataset's lookup draft: `setKeyCrosswalkDrafts((current) => { return { ...current, [datasetId]: undefined }; });`. Imports: `DatasetColumnMapping` (value) and `ChatCaseKeyNormalization`.

Extend the hook's docstring: "ID lookup tables are held beside the draft by source, like the status set, and written back only once finished."

- [ ] **Step 4: Run the editor tests to verify they pass**

Run: `pnpm test:frontend src/components/ChatPanel/CaseTypeDraftBlock/useCaseTypeDraftEditor`
Expected: PASS.

- [ ] **Step 5: Write the failing card test**

In `CaseTypeDraftBlock.test.tsx`, using the file's render setup and draft:

```tsx
it("disables Create until a started ID lookup table names both of its columns", async () => {
  _renderBlockWithDraft(_makeDraft());

  await userEvent.click(
    screen.getByRole("button", { name: /^Use an ID lookup table for / }),
  );

  expect(screen.getByText("Choose the lookup table and both of its columns.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Create case type" })).toBeDisabled();
});

it("shows the case type's normalizations as checked boxes", () => {
  _renderBlockWithDraft({ ..._makeDraft(), keyNormalizations: ["lowercase"] });

  expect(screen.getByRole("checkbox", { name: "Upper and lower case" })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: "Zeros at the start" })).not.toBeChecked();
});
```

The test file's mocks must answer `DatasetClient.useGetAllDatasetsWithColumns` (add it beside its existing `DatasetClient.useGetAll` mock, returning `[[], false]`).

- [ ] **Step 6: Run the card test to verify it fails**

Run: `pnpm test:frontend src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftBlock`
Expected: FAIL: no such button or checkbox.

- [ ] **Step 7: Render key matching on the card**

In `CaseTypeDraftCard.tsx`, after the `sourceGroups.map(...)` and before `CaseTypeDraftManualEntrySection`, add:

```tsx
            <KeyNormalizationCheckboxGroup
              size="xs"
              value={draft.keyNormalizations ?? []}
              onChange={editor.setKeyNormalizations}
            />
```

In `CaseTypeDraftSourceSection.tsx`, add under the "Join key" `Select`:

```tsx
      <KeyLookupFields
        size="xs"
        sourceDatasetName={datasetName}
        recordNoun={t`case`}
        value={keyCrosswalkDraft}
        error={keyLookupIssueMessage}
        onChange={(nextKeyCrosswalkDraft) => {
          editor.setKeyCrosswalkDraft(group.datasetId, nextKeyCrosswalkDraft);
        }}
      />
```

with, at the top of the component:

```tsx
  const keyCrosswalkDraft = editor.keyCrosswalkDrafts[group.datasetId];
  const keyLookupIssueMessage = useKeyLookupIssueMessage(keyCrosswalkDraft);
```

and imports for `KeyNormalizationCheckboxGroup`, `KeyLookupFields`, and `useKeyLookupIssueMessage` from `@/components/caseKeyMatching/...`. Update the section's docstring: "the column its rows are matched on, its optional ID lookup table, and the attributes read from it."

- [ ] **Step 8: Run the card tests to verify they pass**

Run: `pnpm test:frontend src/components/ChatPanel/CaseTypeDraftBlock`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/components/ChatPanel/CaseTypeDraftBlock/
git commit -m "feat(joined-cases): edit ID matching on the case type draft card

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 20: Key matching in the concept creator form

**Files:**
- Create: `src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/KeyMatchingBlock/KeyMatchingBlock.tsx`
- Modify: `src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/index.tsx` (after `IdentifierBlock`)
- Modify: `src/views/OntologyDesignerApp/ConceptCreatorView/index.tsx` (validation and `transformValues`)
- Create: `src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/KeyMatchingBlock/KeyMatchingBlock.test.tsx`
- Modify: `src/views/OntologyDesignerApp/ConceptCreatorView/makeSourceDatasetsFromAttributes/makeSourceDatasetsFromAttributes.test.ts` (plan 5's)

- [ ] **Step 1: Write the failing block test**

```tsx
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { describe, expect, it, vi } from "vitest";
import { useForm } from "@avandar/ui/hooks";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { getDefaultConceptFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import { KeyMatchingBlock } from "@/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/KeyMatchingBlock/KeyMatchingBlock";
import { render, renderHook, screen, userEvent } from "@/test-utils";
import type {
  ConceptFormType,
  ConceptFormValues,
} from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAllDatasetsWithColumns: () => {
        return [[], false];
      },
    },
  };
});

function _makeForm(): ConceptFormType {
  const { result } = renderHook(() => {
    return useForm({
      mode: "uncontrolled",
      initialValues: {
        ...getDefaultConceptFormValues(),
        sourceDatasets: [
          {
            dataset: {
              id: "11111111-1111-4111-8111-111111111111",
              name: "Lab results",
              columns: [],
            } as unknown as ConceptFormValues["sourceDatasets"][number]["dataset"],
            primaryKeyColumnId: undefined,
          },
        ],
      },
    }) as ConceptFormType;
  });
  return result.current;
}

describe("KeyMatchingBlock", () => {
  it("stores the ticked normalizations in the form", async () => {
    const conceptForm = _makeForm();
    render(
      <I18nProvider i18n={i18n}>
        <AvandarAppProvider>
          <KeyMatchingBlock conceptForm={conceptForm} conceptName="patient" />
        </AvandarAppProvider>
      </I18nProvider>,
    );

    await userEvent.click(screen.getByRole("checkbox", { name: "Zeros at the start" }));

    expect(conceptForm.getValues().keyNormalizations).toEqual(["strip_leading_zeros"]);
  });

  it("offers an ID lookup table for each source dataset", () => {
    const conceptForm = _makeForm();
    render(
      <I18nProvider i18n={i18n}>
        <AvandarAppProvider>
          <KeyMatchingBlock conceptForm={conceptForm} conceptName="patient" />
        </AvandarAppProvider>
      </I18nProvider>,
    );

    expect(
      screen.getByRole("button", { name: "Use an ID lookup table for Lab results" }),
    ).toBeInTheDocument();
  });
});
```

(Build the form the way the repo's other form component tests do if one exists; the `as unknown as` cast stands in for a catalog dataset the block only reads `id` and `name` from.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/KeyMatchingBlock`
Expected: FAIL: module not found.

- [ ] **Step 3: Write the block**

```tsx
import { Trans } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { KeyLookupFields } from "@/components/caseKeyMatching/KeyLookupFields/KeyLookupFields";
import { KeyNormalizationCheckboxGroup } from "@/components/caseKeyMatching/KeyNormalizationCheckboxGroup/KeyNormalizationCheckboxGroup";
import type { ConceptFormType } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";

type Props = {
  conceptForm: ConceptFormType;
  conceptName: string;
};

/**
 * How the case type's IDs are matched: the differences to ignore, once for
 * every dataset, then an optional ID lookup table per source dataset.
 */
export function KeyMatchingBlock({
  conceptForm,
  conceptName,
}: Readonly<Props>): JSX.Element {
  const { sourceDatasets } = conceptForm.getValues();
  return (
    <Stack gap="sm">
      <KeyNormalizationCheckboxGroup
        key={conceptForm.key("keyNormalizations")}
        {...conceptForm.getInputProps("keyNormalizations")}
      />
      <Text size="sm" fw={500}>
        <Trans>ID lookup tables</Trans>
      </Text>
      {sourceDatasets.map(({ dataset }, sourceIndex) => {
        const inputProps = conceptForm.getInputProps(
          `sourceDatasets.${sourceIndex}.keyCrosswalk`,
        );
        return (
          <KeyLookupFields
            key={conceptForm.key(`sourceDatasets.${sourceIndex}.keyCrosswalk`)}
            sourceDatasetName={dataset.name}
            recordNoun={conceptName}
            defaultValue={inputProps.defaultValue}
            value={inputProps.value}
            onChange={inputProps.onChange}
            error={inputProps.error}
          />
        );
      })}
    </Stack>
  );
}
```

In `DatasetColumnAttributesBlock/index.tsx`, render `<KeyMatchingBlock conceptForm={conceptForm} conceptName={conceptName} />` right after the `IdentifierBlock` (inside the same `addedAttributes.length > 0` branch, wrapping both in a `Stack`).

- [ ] **Step 4: Run the block test to verify it passes**

Run: `pnpm test:frontend src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/KeyMatchingBlock`
Expected: PASS.

- [ ] **Step 5: Validate and apply key matching on submit**

In `ConceptCreatorView/index.tsx`, extend the `sourceDatasets` validation rule:

```ts
      sourceDatasets: {
        primaryKeyColumnId: isNotEmpty(t`ID field is required`),
        keyCrosswalk: (keyCrosswalk) => {
          const issue = keyCrosswalk
            ? DatasetColumnMapping.getKeyCrosswalkIssue(keyCrosswalk)
            : undefined;
          return issue
            ? matchLiteral(issue, {
                incomplete: t`Choose the lookup table and both of its columns.`,
                same_column: t`Choose two different columns.`,
              })
            : null;
        },
      },
```

In `transformValues`, plan 5's body ends by returning `attributes: makeAttributesWithIdentifierFromKeyColumns({ conceptId: values.id, keyColumns, attributes: typedAttributes })`. Replace that `return` with:

```ts
      // Every source of the ID field gets the same normalizations and its
      // own dataset's lookup table. Unfinished lookups never reach here:
      // validation stops the submit first.
      const keyCrosswalksByDatasetId = new Map(
        values.sourceDatasets.flatMap(({ dataset, keyCrosswalk }) => {
          const resolvedKeyCrosswalk = keyCrosswalk
            ? DatasetColumnMapping.toKeyCrosswalk(keyCrosswalk)
            : undefined;
          return resolvedKeyCrosswalk
            ? [[dataset.id, resolvedKeyCrosswalk] as const]
            : [];
        }),
      );
      return {
        ...values,
        attributes: applyKeyMatchingToIdentifierAttributes({
          attributes: makeAttributesWithIdentifierFromKeyColumns({
            conceptId: values.id,
            keyColumns,
            attributes: typedAttributes,
          }),
          keyNormalizations: values.keyNormalizations,
          keyCrosswalksByDatasetId,
        }),
      };
```

Plan 5's `makeSourceDatasetsFromAttributes` keeps each existing `sourceDatasets` entry whole when fields change, so a chosen `keyCrosswalk` survives adding or removing a field. Pin that in its test file:

```ts
  it("keeps a dataset's ID lookup table when the fields change", () => {
    const keyCrosswalk = {
      datasetId: PATIENTS_DATASET_ID,
      sourceKeyColumnId: PATIENT_LAB_COLUMN_ID,
    };
    const [labs] = makeSourceDatasetsFromAttributes({
      attributes: [_makeFieldReading(LABS_DATASET_ID)],
      sourceDatasets: [
        { dataset: LABS_DATASET, primaryKeyColumnId: undefined, keyCrosswalk },
      ],
      datasetsById: { [LABS_DATASET_ID]: LABS_DATASET },
    });

    expect(labs?.keyCrosswalk).toEqual(keyCrosswalk);
  });
```

using that file's existing dataset and field builders (named here `LABS_DATASET` and `_makeFieldReading`).

Imports: `matchLiteral` from `@avandar/utils`, `DatasetColumnMapping` (value) from `$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping`, `applyKeyMatchingToIdentifierAttributes`.

- [ ] **Step 6: Type check and run the form's tests**

Run: `pnpm type-check && pnpm test:frontend src/views/OntologyDesignerApp/ConceptCreatorView`
Expected: clean, and PASS.

- [ ] **Step 7: Commit**

```bash
git add src/views/OntologyDesignerApp/ConceptCreatorView/
git commit -m "feat(joined-cases): choose how IDs are matched in the case type form

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 21: Translations

**Files:**
- Modify: `src/i18n/locales/*/messages.po`, `src/i18n/locales/*/messages.ts` (generated)

- [ ] **Step 1: Extract and compile**

Run: `pnpm i18n:extract && pnpm i18n:compile`
Expected: `src/i18n/locales/en/messages.po` gains the strings of spec §5.10, each with a `#:` reference to its file. Confirm `generateIndividuals.ts` is referenced for "Refreshed {0} records" and both plural forms.

- [ ] **Step 2: Check the copy rule**

Run: `rg -n -i "crosswalk|normali[sz]ation|external id|identifier attribute" src/i18n/locales/en/messages.po`
Expected: no `msgid` contains any of these words (file references may).

- [ ] **Step 3: Commit**

```bash
git add src/i18n/locales/
git commit -m "chore(joined-cases): extract key matching copy

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 22: End to end

**Files:**
- Create: `tests/data/key-matching/patients.csv`
- Create: `tests/data/key-matching/lab-results.csv`
- Create: `tests/e2e/case-key-matching.spec.ts`

- [ ] **Step 1: Add the fixtures**

`tests/data/key-matching/patients.csv`:

```csv
patient_id,patient_lab_number,full_name
0017A,LAB-9001,Ana Lima
0018B,lab-9002,Ben Okafor
0019C,LAB-9003,Cy Tan
0017A,LAB-9003,Ana Lima
```

`tests/data/key-matching/lab-results.csv`:

```csv
lab_number,lab_result
" lab 9001",5.5
LAB-9001,6.5
LAB9002,4.0
LAB-9003,7.0
LAB-9004,1.0
```

Every column name is unique across the two files, so the form's column list never shows two radios with one name.

- [ ] **Step 2: Write the spec**

Create `tests/e2e/case-key-matching.spec.ts`:

```ts
/*
 * ID matching end to end: a case type built in the form from two CSVs whose
 * keys differ in spacing, case, symbols, and zero padding, with the lab
 * dataset's IDs translated through the patients dataset. Its first sync
 * keeps three records, leaves out the two lab IDs that match no single
 * patient, and the record page shows each patient's lab total.
 *
 * The datasets are imported in `beforeAll`, in a browser context of their
 * own, so the session under test starts after they exist.
 */
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { deleteDatasetFixture } from "./helpers/deleteDatasetFixture";
import { importDatasetViaUi } from "./helpers/importDatasetViaUi";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { MEDIUM_WAIT } from "./helpers/timeouts";
import { installDuckDbExtensionCache } from "./setup/installDuckDbExtensionCache";
import path from "node:path";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { Page } from "@playwright/test";

test.use({ trace: "retain-on-failure" });

const CASE_TYPE_NAME = "E2E lab patients";
const PATIENTS_CSV_PATH = path.join(
  process.cwd(),
  "tests/data/key-matching/patients.csv",
);
const LAB_RESULTS_CSV_PATH = path.join(
  process.cwd(),
  "tests/data/key-matching/lab-results.csv",
);

/** What `beforeAll` and the test created, so `afterAll` removes exactly that. */
const seededWorld: {
  workspaceId: string | undefined;
  patientsDatasetId: string | undefined;
  labsDatasetId: string | undefined;
} = { workspaceId: undefined, patientsDatasetId: undefined, labsDatasetId: undefined };

/** Oracle read: a dataset's catalog name. */
async function _readDatasetName(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  datasetId: string;
}): Promise<string> {
  const { data } = await options.supabaseAdminClient
    .from("datasets")
    .select("name")
    .eq("id", options.datasetId)
    .single()
    .throwOnError();
  return data.name;
}

/** Oracle read: the created case type's id, by its unique test name. */
async function _readCaseTypeId(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
}): Promise<string | undefined> {
  const { data } = await options.supabaseAdminClient
    .from("concepts")
    .select("id")
    .eq("workspace_id", options.workspaceId)
    .eq("name", CASE_TYPE_NAME)
    .maybeSingle()
    .throwOnError();
  return data?.id;
}

async function _pickOption(options: {
  page: Page;
  comboboxName: string | RegExp;
  optionName: string;
}): Promise<void> {
  await options.page
    .getByRole("combobox", { name: options.comboboxName })
    .click();
  await options.page
    .getByRole("option", { name: options.optionName, exact: true })
    .click();
}

/** Adds one dataset column as a field, as plan 5's multi-source spec does. */
async function _addColumnAsField(page: Page, columnName: string): Promise<void> {
  await page.getByRole("radio", { name: columnName, exact: true }).check();
  await page.getByRole("button", { name: "Add column as a field" }).click();
}

/** The value the record page shows for one field (plan 5's locator). */
function _factOf(page: Page, fieldName: string) {
  return page
    .locator("dt", { hasText: fieldName })
    .locator("xpath=following-sibling::dd[1]");
}

test.describe("Case type ID matching", () => {
  test.beforeAll(async ({ browser, e2eWorkerDb }, testInfo) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    seededWorld.workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });
    const context = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
      reducedMotion: "reduce",
    });
    await installDuckDbExtensionCache(context);
    try {
      const page = await context.newPage();
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });
      await importDatasetViaUi({
        page,
        filePath: PATIENTS_CSV_PATH,
        expectedRowCount: 4,
        workspaceSlug,
        onDatasetCreated: (datasetId) => {
          seededWorld.patientsDatasetId = datasetId;
        },
      });
      await importDatasetViaUi({
        page,
        filePath: LAB_RESULTS_CSV_PATH,
        expectedRowCount: 5,
        workspaceSlug,
        onDatasetCreated: (datasetId) => {
          seededWorld.labsDatasetId = datasetId;
        },
      });
    } finally {
      await context.close();
    }
  });

  // Removes the case type (with its statuses and records) and both
  // datasets, whatever the test did.
  test.afterAll(async () => {
    const admin = createSupabaseAdminClient();
    const { workspaceId } = seededWorld;
    if (!workspaceId) {
      return;
    }
    const caseTypeId = await _readCaseTypeId({
      supabaseAdminClient: admin,
      workspaceId,
    });
    if (caseTypeId) {
      await admin.from("concepts").delete().eq("id", caseTypeId).throwOnError();
    }
    for (const datasetId of [
      seededWorld.patientsDatasetId,
      seededWorld.labsDatasetId,
    ]) {
      if (datasetId) {
        await deleteDatasetFixture({ admin, datasetId, workspaceId });
      }
    }
  });

  test("a case type matches lab IDs through the patients dataset and reports the two it left out", async ({
    page,
    e2eWorkerDb,
  }) => {
    test.setTimeout(45_000);
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const { patientsDatasetId, labsDatasetId, workspaceId } = seededWorld;
    if (!patientsDatasetId || !labsDatasetId || !workspaceId) {
      throw new Error("beforeAll did not import both datasets.");
    }
    const [patientsName, labsName] = await Promise.all([
      _readDatasetName({ supabaseAdminClient: admin, datasetId: patientsDatasetId }),
      _readDatasetName({ supabaseAdminClient: admin, datasetId: labsDatasetId }),
    ]);

    await signInWithEmailPassword(page, {
      email: primaryUser.email,
      password: primaryUser.password,
      workspaceSlug,
    });
    // The first landing after sign-in. The form has no link in the Case
    // Manager screens; Spotlight and the URL are its only entry points.
    await page.goto(`/${workspaceSlug}/ontology-designer/concept-creator`);

    await page.getByRole("textbox", { name: "Case type name" }).fill(CASE_TYPE_NAME);
    await page
      .getByRole("switch", { name: "Some data should come from existing datasets" })
      .check();
    await _addColumnAsField(page, "full_name");
    await _addColumnAsField(page, "lab_result");
    await _pickOption({
      page,
      comboboxName: /^If there are multiple lab_result values/,
      optionName: "Get a sum of the values",
    });
    await _pickOption({ page, comboboxName: patientsName, optionName: "patient_id" });
    await _pickOption({ page, comboboxName: labsName, optionName: "lab_number" });

    for (const label of [
      "Spaces at the start or end",
      "Upper and lower case",
      "Dashes, spaces, and other symbols",
      "Zeros at the start",
    ]) {
      await page.getByRole("checkbox", { name: label }).check();
    }
    await page
      .getByRole("button", { name: `Use an ID lookup table for ${labsName}` })
      .click();
    await _pickOption({ page, comboboxName: "ID lookup table", optionName: patientsName });
    await _pickOption({
      page,
      comboboxName: `Column with ${labsName} IDs`,
      optionName: "patient_lab_number",
    });
    await _pickOption({
      page,
      comboboxName: /^Column with the matching .* ID$/,
      optionName: "patient_id",
    });
    await _pickOption({
      page,
      comboboxName: /should be used as a .*'s name\?$/,
      optionName: "full_name",
    });
    await page.getByRole("button", { name: "Create case type" }).click();

    // The first sync runs on its own after creation and ends with a notice.
    const notice = page.getByRole("status", {
      name: `Refreshed ${CASE_TYPE_NAME} records`,
    });
    await expect(notice).toContainText(
      `2 IDs in ${labsName} did not match a record, so their rows were left out.`,
      { timeout: MEDIUM_WAIT },
    );

    const caseTypeId = await _readCaseTypeId({ supabaseAdminClient: admin, workspaceId });
    const { data: records } = await admin
      .from("individuals")
      .select("external_id")
      .eq("concept_id", caseTypeId ?? "")
      .order("external_id")
      .throwOnError();
    expect(records.map((record) => record.external_id)).toEqual(["17a", "18b", "19c"]);

    await page.getByRole("link", { name: "View records" }).click();
    await page.getByRole("link", { name: /Ana Lima$/ }).click();
    await expect(_factOf(page, "lab_result")).toContainText(/12/, {
      timeout: MEDIUM_WAIT,
    });
    await page.getByRole("link", { name: /Ben Okafor$/ }).click();
    await expect(_factOf(page, "lab_result")).toContainText(/4/, {
      timeout: MEDIUM_WAIT,
    });
  });
});
```

The form folds the two ID columns (`patient_id`, `lab_number`) into one ID field with a source per dataset (plan 5), and the key matching applies to both sources; the lookup is on the labs source. Check every locator against the running app on the first run, as plan 5's spec says (the rule select's label and the `View records` control in particular); adjust the locator, never the assertion.

- [ ] **Step 3: Run the spec**

Run: `pnpm test:e2e case-key-matching.spec.ts`
Expected: PASS, on its own. Take screenshots on failure into `.temp/feat-joined-cases/`.

- [ ] **Step 4: Commit**

```bash
git add tests/data/key-matching/ tests/e2e/case-key-matching.spec.ts
git commit -m "test(joined-cases): cover ID matching through a lookup table end to end

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 23: `docs/ontology-architecture.md`

**Files:**
- Modify: `docs/ontology-architecture.md` (sections 2, 4, 5, 6, 7.1, 8, 10, 14, 16)

Plans 1 to 6 rewrote parts of these sections, so each step names what to change rather than quoting old text.

- [ ] **Step 1: Section 2, Terms**

Add two rows to the terms table:

```markdown
| Match IDs that differ only in spacing, case, symbols, or zeros | Key normalization | `attribute_mappings__dataset_column.key_normalizations` | `DatasetColumnMapping.KeyNormalization` |
| ID lookup table | Key crosswalk | `attribute_mappings__dataset_column.crosswalk_*` | `DatasetColumnMapping.KeyCrosswalk` |
```

- [ ] **Step 2: Section 4, Data model**

In the ER diagram's `attribute_mappings__dataset_column` block, add `enum_array key_normalizations` and `uuid crosswalk_dataset_id "no foreign key"`. In the table row for `attribute_mappings__dataset_column`, append: "An identifier mapping can also clean its keys (`key_normalizations`) and translate them through an ID lookup table (`crosswalk_dataset_id` and its two column ids, bare ids like `dataset_id`)." Under "Database-enforced integrity", add: "- An ID lookup table is named whole or not at all (`attribute_mappings__dataset_column__crosswalk_all_or_none`)."

- [ ] **Step 3: Section 5, Authoring**

Add a subsection after the chat path:

```markdown
### 5.4 How IDs are matched

A case type asks once which differences its IDs may have (spaces at the
ends, letter case, symbols, leading zeros) and writes that set to every
identifier mapping, so two datasets' keys are always cleaned the same way
before they meet. Each source dataset may also name an ID lookup table: any
workspace dataset with a column of this dataset's IDs and a column of the
shared ID, often another source. The form (`KeyMatchingBlock`) and the draft
card (`KeyNormalizationCheckboxGroup`, `KeyLookupFields` in
`src/components/caseKeyMatching/`) edit both; `applyKeyMatchingToIdentifierAttributes`
writes them onto every source of the ID field (one mapping row per dataset)
for both paths, after `makeAttributesWithIdentifierFromKeyColumns` builds it. Chat proposes
normalizations only when the catalog gives a reason, and an ID lookup table
only when one dataset plainly pairs the two IDs (`buildCaseManagerSystemPrompt`);
`parseCaseKeyMatching` keeps a lookup only when it is whole.
```

- [ ] **Step 4: Section 6, Sync**

In the Sync flow, describe staging as: "one row per distinct record key across every identifier mapping, each built by `buildRecordKeySql` (`buildRecordKeyStagingSql.ts`)". Add after the design points:

```markdown
**Left-out IDs.** A key that normalizes to nothing, or whose ID lookup table
has no row or rows naming two record keys, becomes no record. When any source
has key matching, Sync counts those keys per source in one more read
(`buildExcludedKeyCountsSql`) and ends its job with a dismissible notice
("2 IDs in Lab results did not match a record, so their rows were left out.")
through `JobProgressStore.finishJobWithNotice`. A case type without key
matching runs no extra query. A record whose key stops matching on a later
sync is flagged `missing_from_source_at` like any key that left the data.
`neededColumnsByDatasetId` names each lookup's two columns. The stored
`external_id` is the normalized or translated key, so with `lowercase` a
record whose label is empty is named `p-001`, not the raw `P-001`.
```

- [ ] **Step 5: Section 7.1, Value pickers**

Replace the paragraph on key comparison with:

```markdown
Every source filters its rows in one place, `_buildSourceRowsSql`
(`buildStackedSourceRowsSql.ts`), for single values, lists, and bucketed
lists alike: `CAST("individuals"."external_id" AS VARCHAR) =
buildRecordKeySql(...)` (`src/clients/DuckDbClient/duckDbSqlText.ts`).
`buildRecordKeySql` casts the dataset key to `VARCHAR` (a dataset key is
often `BIGINT`, and DuckDB would otherwise cast the text side to a number and
throw), applies the mapping's normalizations in a fixed order (trim,
lowercase, symbols, then leading zeros, so `#007` becomes `7`), turns an empty
result into NULL, and, with an ID lookup table, returns the one distinct
normalized record key among the matching lookup rows, or NULL when there is
none or more than one. With no key matching it is exactly
`CAST(dataset."<key>" AS VARCHAR)`. Sync stages keys with the same function,
so membership and values agree.
```

- [ ] **Step 6: Section 8, Concepts as QETL relations**

In the planning diagram's allowlist box, change "every contributing dataset" to "every contributing dataset, including ID lookup tables". In the pieces table, append to the column resolution row: "each source carries its dataset's `keyMatching` (`getRecordKeyMatchingFromMapping`, which throws on a lookup column that is missing or in another dataset); lookup datasets are contributors". Append to the spine row: "keys reach the view's filters only through `buildRecordKeySql`".

- [ ] **Step 7: Section 10, Invariants**

Replace the "Keys are compared as text" row with:

```markdown
| A dataset row belongs to the record whose key `buildRecordKeySql` returns for it | `buildRecordKeySql`, `duckDbSqlText.ts`; used by `_buildSourceRowsSql` (`buildStackedSourceRowsSql.ts`) and `buildRecordKeyStagingSql` | One function for Sync and the view; always `VARCHAR`; a key with no single lookup match joins nothing in both |
| An ID lookup table is named whole or not at all | `attribute_mappings__dataset_column__crosswalk_all_or_none` | The edge parser and the client drop partial lookups before they reach it |
| ID lookup tables are loaded, leased, projected, and allowlisted like sources | `makeConceptAttributeColumnsFromMetadata` (contributors), `getNeededColumnsFromQuery`, `getNeededColumnsFromRecordKeySources` | A lookup in another workspace throws |
```

- [ ] **Step 8: Sections 14 and 16**

In section 14, replace "which compares them as text" with "which turns them into text record keys with `buildRecordKeySql`". In section 16, add:

```markdown
| `DOUBLE` key columns cast to text as `7.0` | They do not match `7`, with or without key matching | Read |
| An ID lookup table is evaluated inside every query that reads a translated field | Fine at demo scale; a precomputed key table belongs to the relation cache | Read |
| Normalizations are stored per identifier mapping but authored once per case type | Mappings written directly with different sets split records with no error | Read |
```

- [ ] **Step 9: Check the doc**

Run: `rg -n "getEntityKeyComparisonSql|\x{2014}" docs/ontology-architecture.md` (the second pattern is the em dash character, which the docs never use)
Expected: no output.

- [ ] **Step 10: Commit**

```bash
git add docs/ontology-architecture.md
git commit -m "docs(joined-cases): describe key matching in the ontology architecture

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Final verification

- [ ] `ava supabase status` names `feat-joined-cases`, then `pnpm test:db` passes.
- [ ] `pnpm test:frontend`, `pnpm test:executed`, `pnpm type-check`, and `pnpm lint` pass.
- [ ] `pnpm i18n:check` is clean.
- [ ] `pnpm test:e2e case-key-matching.spec.ts` passes on its own.
- [ ] `rg -n "getEntityKeyComparisonSql" src shared supabase` returns nothing.
- [ ] `git status` shows only `supabase/config.toml` modified.
- [ ] Nothing was run against production.
