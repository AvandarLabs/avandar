# Joined Cases 5: Multi-Source Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let one field of a case type read several dataset columns, in one dataset or several, with one rule reducing every source's rows, one ID field per new case type, and every source listed wherever a field's provenance is shown.

**Architecture:** The value rule moves from the mapping row to the field (`concept_attributes.value_picker_rule_type`), and a field keeps one mapping row per source, ordered by `position`. A new module, `buildStackedSourceRowsSql`, stacks a field's sources with `UNION ALL` inside the field's correlated subquery, each keyed by its own dataset's key column; plan 1's `buildAttributeValueSql` (single values, lists) and plan 4's `buildBucketedListValueSql` (per period) reduce those rows instead of one dataset's. Authoring (form and chat) builds sources, and folds the join key columns into one ID field.

**Tech Stack:** Postgres (Supabase declarative schema, pgTAP, migration upgrade tests), TypeScript, Zod, React, Mantine, Lingui, DuckDB (QETL), Deno edge functions, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-06-joined-cases-5-multi-source-fields-design.md`. Section numbers (§) refer to it. **Overview and ground rules:** `docs/superpowers/plans/2026-11-06-joined-cases.md`. **Shared names:** umbrella §6.

**Prerequisite:** plans 1 to 4 have landed on `feat/joined-cases`. This plan edits their code as their plans write it; Task 0 checks what actually landed.

---

## Required skills

- **`supabase-declarative-schema`** before Tasks 1 to 4. Edit `supabase/schemas/`, run `pnpm db:reset` and then immediately `pnpm db:new-migration <name>`, and never hand-edit what it generates. Task 2's data move is the one hand-written migration (`supabase migration new`), because `db diff` never emits DML.
- **`test-driven-development`** throughout.
- **`impeccable`** before Task 17. The multi-source editor is a new surface. Tasks 18 and 19 mount that component and need no second pass.
- **`playwright-best-practices`** before Task 21.

## Database command rule

Every step that runs `pnpm db:reset`, `pnpm db:new-migration`, `pnpm test:db`, `supabase test db`, or the migration replay script starts with:

```bash
ava supabase status
```

Expected: the first line says this branch is on a switched local Supabase database and names `feat-joined-cases`. If it says `This is the develop local Supabase`, stop and run `ava supabase switch`. If `ava` is missing, run `pnpm build:ava-cli`. Never pass `--linked` or `--db-url` to `supabase test db`.

## Commits

Commit after every task by path (never `git add -A`, never `supabase/config.toml`). Every message below ends with the session's `Co-Authored-By` trailer (overview ground rule 4). Do not push.

## Migration order (do not deviate)

| Order | Migration | Kind | Contents |
| --- | --- | --- | --- |
| 1 | `<ts>_add_attribute_rule_and_source_position.sql` | generated | nullable `concept_attributes.value_picker_rule_type`; `attribute_mappings__dataset_column.position integer not null default 0` |
| 2 | `<ts>_move_value_picker_rule_to_concept_attributes.sql` | hand-written | copy, correct, and complete each field's rule and `data_type` |
| 3 | `<ts>_allow_many_sources_per_attribute.sql` | generated | drop the mapping's rule; swap `unique (concept_attribute_id)` for `attribute_mappings__dataset_column__attribute_column_unique`; add `concept_attributes__value_picker_rule_type_by_shape`; replace `rpc_concepts__create` without plan 3's `value_rule_mismatch` check |

A generated migration from the final schema would drop the mapping's rule before anything could copy it, which is why the change is split around the copy (§7).

**Known gap inside this plan:** from Task 3 until Task 16, creating a case type fails, because the RPC reads the rule from the attribute and the client still sends it on the mapping. Do not stop between them. `pnpm type-check` is red from Task 4 until Task 20; Vitest does not type-check, so every TDD loop in between still runs.

## File map

| File | Responsibility |
| --- | --- |
| `supabase/schemas/00.enum.attribute_mappings__value_picker_rule_type.sql` (new) | The rule enum, moved so layer 20 can use it |
| `supabase/schemas/20.concept_attributes.sql` | `value_picker_rule_type` and its shape check |
| `supabase/schemas/30.attribute_mappings__dataset_column.sql` | No rule, `position`, the two-column unique |
| `supabase/schemas/50.rpc_concepts__create.sql` | Rule on attributes, position on mappings, no `value_rule_mismatch` |
| `supabase/migration-upgrade-tests/value_picker_rule_move.{prelude,assertions}.sql` (new), `value_rule_data_types.prelude.sql` (plan 2's), `scripts/test-dashboard-publishing-migrations.sh` | Replays |
| `supabase/tests/database/concept_attributes__value_picker_rule_type.test.sql` (new), `attribute_mappings__dataset_column__sources.test.sql` (new) | The shape check; several sources |
| `supabase/tests/database/rpc_concepts__create.test.sql`, `concept_attributes__bucketed_list.test.sql` (plan 4's), `permissions/rls_attribute_mappings__dataset_column.test.sql` | Payloads and fixtures move the rule onto the field |
| `apps/desktop/scripts/gen-sqlite-migrations/getManualMigrationBodyFromSourceFile.ts` | SQLite body for migration 3 |
| `shared/models/ontology/ConceptAttribute/*`, `shared/models/ontology/AttributeMapping/DatasetColumnMapping/*` | Rule on the field, position on the source |
| `shared/models/ontology/AttributeMapping/DatasetColumnMapping/AttributeSources/` (new) | A field's sources in read order |
| `shared/models/ontology/Concept/Concept.types.ts`, `ConceptModule.ts` | `mappings` per hydrated attribute |
| `src/clients/qetl/QueryMediator/conceptRelation/buildStackedSourceRowsSql/` (new) | `ConceptAttributeSource`; the stacked rows |
| `src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/`, `buildBucketedListValueSql/` | Reduce the stacked rows |
| `src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql.ts` | The column arm and dispatch |
| `src/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata.ts` | Sources, keys, shared type, rule checks |
| `src/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery.ts` | Every source's value, key and date columns |
| `src/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql.test.ts` | Pins that planning fetches every source's date column (no code change) |
| `src/views/OntologyDesignerApp/ConceptMetaView/*` | Hydration, Refresh, provenance on the case type page, Sync (key sources only, once plan 6 has landed) |
| `src/views/IndividualManagerApp/SingleIndividualView/useRecordFields/makeCaseDetailsRowsFromAttributes/` | Provenance in read order |
| `shared/types/chat.types.ts`, `supabase/functions/chat/PostChatMessages/{parsing,prompt}/*` | Chat contract, parsers, tools, prompt |
| `src/views/OntologyDesignerApp/makeAttributesWithIdentifierFromKeyColumns/` (new) | One ID field from the join keys |
| `src/views/OntologyDesignerApp/{createdCaseTypeToFormValues,proposedCaseTypeToCreatedCaseType,insertConceptFromFormValues}/` | Chat conversion and the insert |
| `src/views/OntologyDesignerApp/ConceptCreatorView/*` | Form state, sources, join keys, `keepKeyAndLabelFieldsSingle` per source |
| `src/components/caseFields/FieldSourcesEditor/` (new), `src/components/caseFields/PeriodControls/` (plan 4's) | The multi-source editor, with a date column per source; the period picker without one |
| `src/components/ChatPanel/CaseTypeDraftBlock/*` | Sources in the draft card |
| `apps/ava-video-producer/avandar-adapter/*` | Adapter fixtures follow the model |
| `tests/e2e/multi-source-fields.spec.ts`, `tests/data/multi-source-fields/*.csv` (new), `tests/e2e/helpers/CaseTypeSeedHelpers.ts` | E2E |
| `docs/ontology-architecture.md` | The end state |

---

## Task 0: Read what plans 1 to 4 landed

**Files:** none. Nothing is committed.

This plan's code edits plans 1 to 4's code as their plans write it (spec §4). Where a landed name differs, keep the landed name and adapt this plan's code mechanically. Where a landed **decision** differs (for example, provenance is no longer built from mappings), stop and record it in spec §4 before continuing.

- [ ] **Step 1: Check the Supabase switch**

Run: `ava supabase status`
Expected: names `feat-joined-cases`.

- [ ] **Step 2: Locate each name this plan edits**

```bash
rg -n "export (function|type) (buildAttributeValueSql|AttributeValueSqlOptions)|function _buildReducedValueSql|ValueSqlParts" src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql
rg -n "export function buildBucketedListValueSql|BucketedListValueSqlOptions|function _buildSourceRowsSql|DATE_TRUNC_PART_BY_GRAIN|AGGREGATE_SQL_BY_RULE" src/clients/qetl/QueryMediator/conceptRelation/buildBucketedListValueSql
rg -n "ConceptAttributeValueRule|_buildColumnSelector|bucketed_list|bucketColumnName|valueShape" src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql.ts
rg -n "function _(assertRuleAllowedForColumn|getValueRule|resolveBucket|getDatasetColumnMappingsForAttribute)" src/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata.ts
rg -n "function _getMappedDatasetColumns|bucketColumnId" src/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql.ts
rg -n "bucketColumnName" src/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery.ts
rg -n "bucket_grain_requires_array|bucket_grain_dataset_value_only" supabase/schemas/20.concept_attributes.sql
rg -n "buildRecordKeyStagingSql|RecordKeySource|_getRecordKeySources|_resolveIndividualSourceMappings" src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals
rg -n "value_rule_mismatch|list_field_is_key_or_label|bucket_grain|bucket_column_id" supabase/schemas/50.rpc_concepts__create.sql
rg -n "tr__attribute_mappings__dataset_column__validate_bucket_column" supabase/schemas
rg -n "function _getSourceNames" src/views/IndividualManagerApp
rg -n "export function (withFieldDataTypes|keepKeyAndLabelFieldsSingle)" src/views/OntologyDesignerApp/ConceptCreatorView
rg -n "export function parseProposeCaseType|ProposeCaseTypeCatalogColumn|bucketColumnId|valueShape" supabase/functions/chat/PostChatMessages/parsing/parseProposeCaseType.ts
rg -n "setAttributeBucket|setAttributeValueShape" src/components/ChatPanel/CaseTypeDraftBlock/useCaseTypeDraftEditor.ts
ls supabase/migration-upgrade-tests
```

Expected: each name exists as spec §4 describes. In particular:

- `buildAttributeValueSql` takes `selectColumnName`, `primaryKeyColumnName`, `datasetId`, `valueShape` and `valuePickerRuleType`.
- `buildBucketedListValueSql(options: BucketedListValueSqlOptions)` runs `_buildSourceRowsSql` (emitting `bucket, value, row_order`), then `_buildPerBucketValuesSql`, then the list wrapper; its options are `datasetId`, `selectColumnName`, `primaryKeyColumnName`, `bucketColumnName`, `bucketGrain`, `ruleType`, `externalIdsTable` and `externalIdColumn`, and it returns the parenthesized subquery without an alias.
- `ConceptAttributeColumn`'s `dataset_column` arm is an intersection with `ConceptAttributeValueRule`, whose arms are `single` (with a rule), `list`, and `bucketed_list` (with a rule, `bucketGrain` and `bucketColumnName`); `_buildColumnSelector` matches `{ valueShape: "bucketed_list" }`.
- `_getValueRule` takes `{ attribute, mapping, metadata }` and calls `_resolveBucket`, which returns `{ bucketGrain, bucketColumnName }`.
- `_getMappedDatasetColumns` returns each mapping's `datasetColumnId` and, when set, its `bucketColumnId`; `getNeededColumnsFromQuery` adds a `bucketed_list` column's `bucketColumnName`.
- The RPC has plan 3's `list_field_is_key_or_label` check and the `value_rule_mismatch` check as plan 4 reworded it (`A dataset field has a value rule unless it keeps every value`); `20.concept_attributes.sql` has plan 4's two `bucket_grain` checks; `value_rule_data_types.prelude.sql` exists.
- The last `rg` tells you whether plan 6 has landed: it finds `buildRecordKeyStagingSql` if so, and `_resolveIndividualSourceMappings` if not. Task 10 branches on it.

- [ ] **Step 3: Write down the differences**

Keep a short list (in the session, not the repo) of every landed name that differs from this plan, and apply it to every code block below.

---

## Task 1: A rule column on fields, a position on sources

**Files:**
- Create: `supabase/schemas/00.enum.attribute_mappings__value_picker_rule_type.sql`
- Modify: `supabase/schemas/30.attribute_mappings__dataset_column.sql:1-9` (enum moves out), the `create table` (column)
- Modify: `supabase/schemas/20.concept_attributes.sql` (column)
- Create: `supabase/tests/database/attribute_mappings__dataset_column__sources.test.sql`
- Create: `supabase/migrations/<ts>_add_attribute_rule_and_source_position.sql` (generated)

- [ ] **Step 1: Check the Supabase switch**

Run: `ava supabase status`
Expected: names `feat-joined-cases`.

- [ ] **Step 2: Write the failing test**

Create `supabase/tests/database/attribute_mappings__dataset_column__sources.test.sql`:

```sql
\set ON_ERROR_STOP on

/**
 * A dataset-column field reads one mapping row per source. Each row has a
 * place in the field's read order, and a field reads each column at most
 * once.
 */
begin;

set search_path to extensions, public;

select plan (1);

-- 1. A payload that leaves the position out reads first.
select col_default_is (
  'public',
  'attribute_mappings__dataset_column',
  'position',
  '0',
  'a source''s position defaults to 0'
);

select * from finish ();

rollback;
```

- [ ] **Step 3: Run it and watch it fail**

```bash
ava supabase status
supabase test db supabase/tests/database/attribute_mappings__dataset_column__sources.test.sql
```

Expected: FAIL, `Column public.attribute_mappings__dataset_column.position does not exist`.

- [ ] **Step 4: Move the enum into its own file**

Create `supabase/schemas/00.enum.attribute_mappings__value_picker_rule_type.sql`:

```sql
/**
 * The rule that reduces a field's dataset rows to one value, or to one value
 * per period for a per-period field. Single-value and per-period fields of a
 * case type store one in `concept_attributes.value_picker_rule_type`.
 *
 * Enum values:
 *
 * `most_frequent`: the most frequent non-NULL value, ties going to the
 * smallest value.
 *
 * `first`: the first non-NULL value, reading sources in position order and
 * each source's rows in file order.
 *
 * `sum`, `avg`: the sum or average of the non-NULL values, as a double.
 *
 * `count`: how many non-NULL values there are.
 *
 * `max`, `min`: the largest or smallest non-NULL value.
 *
 * Note: the name keeps its `attribute_mappings__` prefix although
 * `concept_attributes` holds the rule. Renaming an enum type needs a
 * hand-written migration of its own.
 */
create type public.attribute_mappings__value_picker_rule_type as enum(
  'most_frequent',
  'first',
  'sum',
  'avg',
  'count',
  'max',
  'min'
);
```

Delete the same `create type` statement (lines 1 to 9) from `supabase/schemas/30.attribute_mappings__dataset_column.sql`.

- [ ] **Step 5: Add the two columns**

In `supabase/schemas/20.concept_attributes.sql`, inside `create table public.concept_attributes`, directly after plan 4's `bucket_grain` column, add:

```sql
  -- The rule that reduces this field's rows from every source to one value,
  -- or to one value per period. Set on single-value and per-period
  -- dataset-column fields only.
  value_picker_rule_type public.attribute_mappings__value_picker_rule_type,
```

In `supabase/schemas/30.attribute_mappings__dataset_column.sql`, inside `create table public.attribute_mappings__dataset_column`, directly after plan 4's `bucket_column_id` column (give it a trailing comma), add:

```sql
  -- This source's place in its field's read order. `first` and lists read a
  -- field's sources in ascending position, ties broken by dataset column id.
  position integer not null default 0
```

Leave the mapping's `value_picker_rule_type` and its `unique` alone in this task. Run `pnpm format`; do not change the statements it re-indents.

- [ ] **Step 6: Generate the migration**

```bash
ava supabase status
pnpm db:reset
pnpm db:new-migration add_attribute_rule_and_source_position
```

Expected: a new `supabase/migrations/<ts>_add_attribute_rule_and_source_position.sql` with exactly two statements: `alter table "public"."concept_attributes" add column "value_picker_rule_type" ...` and `alter table "public"."attribute_mappings__dataset_column" add column "position" integer not null default 0`. If it drops or creates the enum, the enum is not in a `00.` file: fix, reset, regenerate.

- [ ] **Step 7: Run the test and watch it pass**

```bash
ava supabase status
pnpm db:reset
supabase test db supabase/tests/database/attribute_mappings__dataset_column__sources.test.sql
```

Expected: PASS, 1 of 1.

- [ ] **Step 8: Commit**

```bash
git add supabase/schemas/00.enum.attribute_mappings__value_picker_rule_type.sql supabase/schemas/20.concept_attributes.sql supabase/schemas/30.attribute_mappings__dataset_column.sql supabase/migrations/*_add_attribute_rule_and_source_position.sql supabase/tests/database/attribute_mappings__dataset_column__sources.test.sql
git commit -m "feat(joined-cases): add a rule column to fields and a position to their sources"
```

---

## Task 2: Move each rule onto its field

**Files:**
- Create: `supabase/migrations/<ts>_move_value_picker_rule_to_concept_attributes.sql` (hand-written)
- Create: `supabase/migration-upgrade-tests/value_picker_rule_move.prelude.sql`
- Create: `supabase/migration-upgrade-tests/value_picker_rule_move.assertions.sql`
- Modify: `scripts/test-dashboard-publishing-migrations.sh` (append one replay)

Spec §7. The prelude restores the mapping's rule only if it is missing and drops the shape check only if it exists, so it works now and after Task 3. Fixture ids start with `c5` (plan 2's replay uses `ae`).

- [ ] **Step 1: Create the empty migration**

```bash
supabase migration new move_value_picker_rule_to_concept_attributes
```

Note the created path. Leave it empty for now.

- [ ] **Step 2: Write the replay prelude**

Create `supabase/migration-upgrade-tests/value_picker_rule_move.prelude.sql`:

```sql
-- Fields the way they looked before the value rule moved onto them: each
-- dataset-column mapping carries the rule and no field holds one. A later
-- migration drops the mapping's rule and requires the field's, so both are
-- lifted first and the move replays against the shape it was written for.
-- Every fixture id starts with `c5`.
begin;

alter table public.attribute_mappings__dataset_column
add column if not exists value_picker_rule_type public.attribute_mappings__value_picker_rule_type;

alter table public.concept_attributes
drop constraint if exists concept_attributes__value_picker_rule_type_by_shape;

insert into auth.users (id, email, aud, role)
values ('c5000001-0000-4000-8000-000000000001'::uuid, 'rule_move@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values ('c5001001-0000-4000-8000-000000000001'::uuid, 'c5000001-0000-4000-8000-000000000001'::uuid, 'rule move ws', 'rule-move-ws')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values ('c5001101-0000-4000-8000-000000000001'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'c5000001-0000-4000-8000-000000000001'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values ('c5001201-0000-4000-8000-000000000001'::uuid, 'c5000001-0000-4000-8000-000000000001'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'c5001101-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner')
on conflict (id) do nothing;

insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type)
values ('c5005001-0000-4000-8000-000000000001'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'c5000001-0000-4000-8000-000000000001'::uuid, 'c5001201-0000-4000-8000-000000000001'::uuid, 'rule move line list', 'csv_file'::public.datasets__source_type)
on conflict (id) do nothing;

-- `note_text` was a number column when a `sum` was mapped to it, and has
-- since been retyped to text.
insert into public.dataset_columns (
  id, dataset_id, workspace_id, original_name, name, original_data_type, detected_data_type, data_type, column_idx
)
values
  ('c5006001-0000-4000-8000-000000000001'::uuid, 'c5005001-0000-4000-8000-000000000001'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'case_id', 'case_id', 'VARCHAR', 'VARCHAR', 'varchar', 0),
  ('c5006002-0000-4000-8000-000000000002'::uuid, 'c5005001-0000-4000-8000-000000000001'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'titer', 'titer', 'BIGINT', 'BIGINT', 'bigint', 1),
  ('c5006003-0000-4000-8000-000000000003'::uuid, 'c5005001-0000-4000-8000-000000000001'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'result', 'result', 'VARCHAR', 'VARCHAR', 'varchar', 2),
  ('c5006004-0000-4000-8000-000000000004'::uuid, 'c5005001-0000-4000-8000-000000000001'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'onset', 'onset', 'DATE', 'DATE', 'date', 3),
  ('c5006005-0000-4000-8000-000000000005'::uuid, 'c5005001-0000-4000-8000-000000000001'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'note_text', 'note_text', 'BIGINT', 'VARCHAR', 'varchar', 4);

-- Case type 1 holds every shape. Case type 2 has two identifier fields in
-- one dataset, which the label and identifier trigger refuses on update.
insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id)
values
  ('c5002001-0000-4000-8000-000000000001'::uuid, 'c5000001-0000-4000-8000-000000000001'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'rule move shapes', false, 'c5007001-0000-4000-8000-000000000001'::uuid),
  ('c5002002-0000-4000-8000-000000000002'::uuid, 'c5000001-0000-4000-8000-000000000001'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'rule move two keys', false, 'c5007002-0000-4000-8000-000000000002'::uuid);

insert into public.concept_statuses (id, workspace_id, concept_id, name, color, position)
values
  ('c5007001-0000-4000-8000-000000000001'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'c5002001-0000-4000-8000-000000000001'::uuid, 'Active', '#40c057', 0),
  ('c5007002-0000-4000-8000-000000000002'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'c5002002-0000-4000-8000-000000000002'::uuid, 'Active', '#40c057', 0);

-- One statement per case type, so the label trigger counts every attribute
-- of it at once. "Already moved" holds a rule on the field already, and
-- "Stale count" has the column's type instead of its rule's output type.
insert into public.concept_attributes (
  id, workspace_id, concept_id, name, data_type, mapping_type,
  is_label, is_identifier, is_array, allow_manual_edit, bucket_grain, value_picker_rule_type
)
values
  ('c5003001-0000-4000-8000-000000000001'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'c5002001-0000-4000-8000-000000000001'::uuid, 'Case ID', 'varchar', 'dataset_column', true, true, false, false, null, null),
  ('c5003002-0000-4000-8000-000000000002'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'c5002001-0000-4000-8000-000000000001'::uuid, 'Peak titer', 'bigint', 'dataset_column', false, false, false, false, null, null),
  ('c5003003-0000-4000-8000-000000000003'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'c5002001-0000-4000-8000-000000000001'::uuid, 'Every result', 'varchar', 'dataset_column', false, false, true, false, null, null),
  ('c5003004-0000-4000-8000-000000000004'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'c5002001-0000-4000-8000-000000000001'::uuid, 'Monthly titer', 'double', 'dataset_column', false, false, true, false, 'month', null),
  ('c5003005-0000-4000-8000-000000000005'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'c5002001-0000-4000-8000-000000000001'::uuid, 'Notes', 'varchar', 'manual_entry', false, false, false, false, null, null),
  ('c5003006-0000-4000-8000-000000000006'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'c5002001-0000-4000-8000-000000000001'::uuid, 'Orphan', 'varchar', 'dataset_column', false, false, false, false, null, null),
  ('c5003007-0000-4000-8000-000000000007'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'c5002001-0000-4000-8000-000000000001'::uuid, 'Already moved', 'bigint', 'dataset_column', false, false, false, false, null, 'count'),
  ('c5003008-0000-4000-8000-000000000008'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'c5002001-0000-4000-8000-000000000001'::uuid, 'Retyped total', 'double', 'dataset_column', false, false, false, false, null, null),
  ('c5003009-0000-4000-8000-000000000009'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'c5002001-0000-4000-8000-000000000001'::uuid, 'Stale count', 'varchar', 'dataset_column', false, false, false, false, null, null);

insert into public.concept_attributes (
  id, workspace_id, concept_id, name, data_type, mapping_type,
  is_label, is_identifier, is_array, allow_manual_edit, bucket_grain, value_picker_rule_type
)
values
  ('c5003101-0000-4000-8000-000000000101'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'c5002002-0000-4000-8000-000000000002'::uuid, 'Key A', 'varchar', 'dataset_column', true, true, false, false, null, null),
  ('c5003102-0000-4000-8000-000000000102'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'c5002002-0000-4000-8000-000000000002'::uuid, 'Key B', 'varchar', 'dataset_column', false, true, false, false, null, null);

-- Mappings come after attributes, the order the creation RPC uses, so the
-- identifier check passes on insert and only an update would re-run it.
-- "Every result" is a list made before lists stored no rule.
insert into public.attribute_mappings__dataset_column (
  id, workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id, bucket_column_id
)
values
  ('c5004001-0000-4000-8000-000000000001'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'c5003001-0000-4000-8000-000000000001'::uuid, 'first', 'c5005001-0000-4000-8000-000000000001'::uuid, 'c5006001-0000-4000-8000-000000000001'::uuid, null),
  ('c5004002-0000-4000-8000-000000000002'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'c5003002-0000-4000-8000-000000000002'::uuid, 'max', 'c5005001-0000-4000-8000-000000000001'::uuid, 'c5006002-0000-4000-8000-000000000002'::uuid, null),
  ('c5004003-0000-4000-8000-000000000003'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'c5003003-0000-4000-8000-000000000003'::uuid, 'first', 'c5005001-0000-4000-8000-000000000001'::uuid, 'c5006003-0000-4000-8000-000000000003'::uuid, null),
  ('c5004004-0000-4000-8000-000000000004'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'c5003004-0000-4000-8000-000000000004'::uuid, 'avg', 'c5005001-0000-4000-8000-000000000001'::uuid, 'c5006002-0000-4000-8000-000000000002'::uuid, 'c5006004-0000-4000-8000-000000000004'::uuid),
  ('c5004007-0000-4000-8000-000000000007'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'c5003007-0000-4000-8000-000000000007'::uuid, 'min', 'c5005001-0000-4000-8000-000000000001'::uuid, 'c5006002-0000-4000-8000-000000000002'::uuid, null),
  ('c5004008-0000-4000-8000-000000000008'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'c5003008-0000-4000-8000-000000000008'::uuid, 'sum', 'c5005001-0000-4000-8000-000000000001'::uuid, 'c5006005-0000-4000-8000-000000000005'::uuid, null),
  ('c5004009-0000-4000-8000-000000000009'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'c5003009-0000-4000-8000-000000000009'::uuid, 'count', 'c5005001-0000-4000-8000-000000000001'::uuid, 'c5006003-0000-4000-8000-000000000003'::uuid, null),
  ('c5004101-0000-4000-8000-000000000101'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'c5003101-0000-4000-8000-000000000101'::uuid, 'first', 'c5005001-0000-4000-8000-000000000001'::uuid, 'c5006001-0000-4000-8000-000000000001'::uuid, null),
  ('c5004102-0000-4000-8000-000000000102'::uuid, 'c5001001-0000-4000-8000-000000000001'::uuid, 'c5003102-0000-4000-8000-000000000102'::uuid, 'most_frequent', 'c5005001-0000-4000-8000-000000000001'::uuid, 'c5006003-0000-4000-8000-000000000003'::uuid, null);
```

Copy the `workspace_memberships`, `user_profiles`, `datasets` and `dataset_columns` column lists from plan 2's `value_rule_data_types.prelude.sql` if they differ from the ones above.

- [ ] **Step 3: Write the replay assertions**

Create `supabase/migration-upgrade-tests/value_picker_rule_move.assertions.sql`:

```sql
-- Verify every single-value and per-period field took its mapping's rule
-- (a disallowed one replaced), a list and a manual-entry field took none, a
-- field with no mapping took most_frequent, a field that already had a rule
-- kept it, each field's type follows its rule, the case type with two keys
-- in one dataset moved too, and the trigger is back on.
do $$
begin
  if exists (
    select 1
    from (
      values
        ('c5003001-0000-4000-8000-000000000001'::uuid, 'first', 'varchar'),
        ('c5003002-0000-4000-8000-000000000002'::uuid, 'max', 'bigint'),
        ('c5003003-0000-4000-8000-000000000003'::uuid, null, 'varchar'),
        ('c5003004-0000-4000-8000-000000000004'::uuid, 'avg', 'double'),
        ('c5003005-0000-4000-8000-000000000005'::uuid, null, 'varchar'),
        ('c5003006-0000-4000-8000-000000000006'::uuid, 'most_frequent', 'varchar'),
        ('c5003007-0000-4000-8000-000000000007'::uuid, 'count', 'bigint'),
        ('c5003008-0000-4000-8000-000000000008'::uuid, 'most_frequent', 'varchar'),
        ('c5003009-0000-4000-8000-000000000009'::uuid, 'count', 'bigint'),
        ('c5003101-0000-4000-8000-000000000101'::uuid, 'first', 'varchar'),
        ('c5003102-0000-4000-8000-000000000102'::uuid, 'most_frequent', 'varchar')
    ) as expected (attribute_id, rule_type, data_type)
    left join public.concept_attributes ca on ca.id = expected.attribute_id
    where
      ca.value_picker_rule_type::text is distinct from expected.rule_type
      or ca.data_type::text is distinct from expected.data_type
  ) then
    raise exception 'a field does not hold the rule and type its mapping implied';
  end if;

  if (
    select tgenabled
    from pg_trigger
    where tgname = 'tr_concept_attributes__validate_label_and_identifiers'
  ) <> 'O' then
    raise exception 'the label and identifier trigger was left disabled';
  end if;
end;
$$;

-- The next migration requires exactly this shape. Adding its check here
-- validates every row the move touched, and fails the replay if one breaks it.
alter table public.concept_attributes
add constraint concept_attributes__value_picker_rule_type_by_shape check (
  (value_picker_rule_type is not null) = (
    mapping_type = 'dataset_column'
    and (not is_array or bucket_grain is not null)
  )
);

rollback;
```

- [ ] **Step 4: Register the replay**

Append to `scripts/test-dashboard-publishing-migrations.sh`, replacing `<ts>` with the timestamp from Step 1:

```bash

# Value rule move: copy each dataset-column mapping's rule onto its field,
# correct a rule its column no longer allows, leave lists and manual-entry
# fields without one, and set each field's type from its rule.
run_migration_replay \
  "$repo_root/supabase/migration-upgrade-tests/value_picker_rule_move.prelude.sql" \
  "$repo_root/supabase/migrations/<ts>_move_value_picker_rule_to_concept_attributes.sql" \
  "$repo_root/supabase/migration-upgrade-tests/value_picker_rule_move.assertions.sql"
```

- [ ] **Step 5: Run the replay and watch it fail**

```bash
ava supabase status
pnpm db:reset
./scripts/test-dashboard-publishing-migrations.sh
```

Expected: FAIL with `a field does not hold the rule and type its mapping implied` (the migration is still empty).

- [ ] **Step 6: Write the migration**

Put this in `supabase/migrations/<ts>_move_value_picker_rule_to_concept_attributes.sql`:

```sql
-- Moves each dataset-column field's value rule from its mapping row onto the
-- field, so one rule can reduce the rows of several sources, and leaves each
-- moved rule and field type the way the rule table defines them.
--
-- Hand-written because `db diff` never emits DML. It runs after the migration
-- that adds `concept_attributes.value_picker_rule_type` and before the one
-- that drops the mapping's rule and requires the field's. Every field has at
-- most one mapping row until then, so each join below is unambiguous. Each
-- step skips rows that are already right, so a re-run changes nothing.
--
-- The move changes no label and no identifier, so the trigger that validates
-- them is paused for it. Left on, it would re-check every moved field's case
-- type and stop the deploy on a case type it rejects today, such as one with
-- two identifier fields in one dataset.
alter table public.concept_attributes
disable trigger tr_concept_attributes__validate_label_and_identifiers;

-- A single-value or per-period field keeps the rule its mapping holds. A
-- plain list keeps every value and reads no rule, so it gets none, which also
-- clears the rule a list made before lists stored none still carries.
update public.concept_attributes ca
set
  value_picker_rule_type = m.value_picker_rule_type
from
  public.attribute_mappings__dataset_column m
where
  m.concept_attribute_id = ca.id
  and ca.mapping_type = 'dataset_column'
  and (
    not ca.is_array
    or ca.bucket_grain is not null
  )
  and ca.value_picker_rule_type is null;

-- The rule table: sum and avg need a bigint or double column, and max and
-- min never apply to a boolean one. A column retyped since its rule was
-- chosen can break that, so such a rule becomes most_frequent, which every
-- type allows.
update public.concept_attributes ca
set
  value_picker_rule_type = 'most_frequent'
from
  public.attribute_mappings__dataset_column m
  join public.dataset_columns c on c.id = m.dataset_column_id
  and c.dataset_id = m.dataset_id
where
  m.concept_attribute_id = ca.id
  and (
    (
      ca.value_picker_rule_type in ('sum', 'avg')
      and c.data_type not in ('bigint', 'double')
    )
    or (
      ca.value_picker_rule_type in ('max', 'min')
      and c.data_type = 'boolean'
    )
  );

-- A single-value or per-period field with no mapping row, or a mapping with
-- no rule, reads nothing, so every rule gives it the same empty value. It
-- takes most_frequent, the rule the create form and chat default to.
update public.concept_attributes ca
set
  value_picker_rule_type = 'most_frequent'
where
  ca.mapping_type = 'dataset_column'
  and (
    not ca.is_array
    or ca.bucket_grain is not null
  )
  and ca.value_picker_rule_type is null;

-- A field's type is the type of one value as the view emits it: the column's
-- type for a list, double for sum and avg, bigint for count, and the column's
-- type for every other rule.
with
  expected_types as (
    select
      ca.id,
      case
        when ca.is_array
        and ca.bucket_grain is null then c.data_type
        when ca.value_picker_rule_type in ('sum', 'avg') then 'double'::public.datasets__ava_data_type
        when ca.value_picker_rule_type = 'count' then 'bigint'::public.datasets__ava_data_type
        else c.data_type
      end as data_type
    from
      public.concept_attributes ca
      join public.attribute_mappings__dataset_column m on m.concept_attribute_id = ca.id
      join public.dataset_columns c on c.id = m.dataset_column_id
      and c.dataset_id = m.dataset_id
    where
      ca.mapping_type = 'dataset_column'
  )
update public.concept_attributes ca
set
  data_type = expected_types.data_type
from
  expected_types
where
  expected_types.id = ca.id
  and ca.data_type is distinct from expected_types.data_type;

alter table public.concept_attributes
enable trigger tr_concept_attributes__validate_label_and_identifiers;
```

Run `pnpm format`; do not change the statements it re-indents.

- [ ] **Step 7: Apply and run the replay again**

```bash
ava supabase status
pnpm db:reset
./scripts/test-dashboard-publishing-migrations.sh
```

Expected: the reset applies migrations 1 and 2 cleanly, and every replay passes, including `value_picker_rule_move`.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/*_move_value_picker_rule_to_concept_attributes.sql supabase/migration-upgrade-tests/value_picker_rule_move.prelude.sql supabase/migration-upgrade-tests/value_picker_rule_move.assertions.sql scripts/test-dashboard-publishing-migrations.sh
git commit -m "feat(joined-cases): move each field's value rule from its mapping onto the field"
```

---

## Task 3: Many sources per field, a rule required by shape

**Files:**
- Modify: `supabase/schemas/30.attribute_mappings__dataset_column.sql` (table)
- Modify: `supabase/schemas/20.concept_attributes.sql` (check)
- Modify: `supabase/schemas/50.rpc_concepts__create.sql` (docstring, inserts, plan 3's checks)
- Create: `supabase/tests/database/concept_attributes__value_picker_rule_type.test.sql`
- Modify: `supabase/tests/database/attribute_mappings__dataset_column__sources.test.sql`
- Modify: `supabase/tests/database/rpc_concepts__create.test.sql`
- Modify: `supabase/tests/database/concept_attributes__bucketed_list.test.sql` (plan 4's)
- Modify: `supabase/tests/database/permissions/rls_attribute_mappings__dataset_column.test.sql`
- Modify: `supabase/migration-upgrade-tests/value_rule_data_types.prelude.sql` (plan 2's)
- Modify: `tests/e2e/helpers/CaseTypeSeedHelpers.ts` (the RPC payload)
- Create: `supabase/migrations/<ts>_allow_many_sources_per_attribute.sql` (generated)

- [ ] **Step 1: Check the Supabase switch**

Run: `ava supabase status`
Expected: names `feat-joined-cases`.

- [ ] **Step 2: Write the failing shape test**

Create `supabase/tests/database/concept_attributes__value_picker_rule_type.test.sql`:

```sql
\set ON_ERROR_STOP on

/**
 * A single-value or per-period dataset-column field reduces its rows with a
 * rule, so it must hold one. A plain list keeps every value and a
 * manual-entry field reads no rows, so neither may hold one.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values ('b9000001-0000-4000-8000-000000000001'::uuid, 'rule_shape@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values ('b9001001-0000-4000-8000-000000000001'::uuid, 'b9000001-0000-4000-8000-000000000001'::uuid, 'rule shape ws', 'rule-shape-ws')
on conflict (id) do nothing;

insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id)
values ('b9002001-0000-4000-8000-000000000001'::uuid, 'b9000001-0000-4000-8000-000000000001'::uuid, 'b9001001-0000-4000-8000-000000000001'::uuid, 'rule shape case type', false, 'b9003001-0000-4000-8000-000000000001'::uuid);

insert into public.concept_statuses (id, workspace_id, concept_id, name, color, position)
values ('b9003001-0000-4000-8000-000000000001'::uuid, 'b9001001-0000-4000-8000-000000000001'::uuid, 'b9002001-0000-4000-8000-000000000001'::uuid, 'Active', '#40c057', 0);

-- The case type's one label, so each insert below keeps exactly one.
insert into public.concept_attributes (
  id, workspace_id, concept_id, name, data_type, mapping_type,
  is_label, is_identifier, is_array, allow_manual_edit
)
values ('b9004001-0000-4000-8000-000000000001'::uuid, 'b9001001-0000-4000-8000-000000000001'::uuid, 'b9002001-0000-4000-8000-000000000001'::uuid, 'Name', 'varchar', 'manual_entry', true, false, false, true);

select plan (8);

-- 1.
select throws_ok (
  $t1$
  insert into public.concept_attributes (workspace_id, concept_id, name, data_type, mapping_type, is_label, is_identifier, is_array, allow_manual_edit, bucket_grain, value_picker_rule_type)
  values ('b9001001-0000-4000-8000-000000000001'::uuid, 'b9002001-0000-4000-8000-000000000001'::uuid, 'Single without rule', 'varchar', 'dataset_column', false, false, false, false, null, null);
  $t1$,
  '23514',
  null,
  'a single-value dataset-column field without a rule is rejected'
);

-- 2.
select throws_ok (
  $t2$
  insert into public.concept_attributes (workspace_id, concept_id, name, data_type, mapping_type, is_label, is_identifier, is_array, allow_manual_edit, bucket_grain, value_picker_rule_type)
  values ('b9001001-0000-4000-8000-000000000001'::uuid, 'b9002001-0000-4000-8000-000000000001'::uuid, 'List with rule', 'varchar', 'dataset_column', false, false, true, false, null, 'first');
  $t2$,
  '23514',
  null,
  'a plain list field with a rule is rejected'
);

-- 3.
select throws_ok (
  $t3$
  insert into public.concept_attributes (workspace_id, concept_id, name, data_type, mapping_type, is_label, is_identifier, is_array, allow_manual_edit, bucket_grain, value_picker_rule_type)
  values ('b9001001-0000-4000-8000-000000000001'::uuid, 'b9002001-0000-4000-8000-000000000001'::uuid, 'Manual with rule', 'varchar', 'manual_entry', false, false, false, true, null, 'first');
  $t3$,
  '23514',
  null,
  'a manual-entry field with a rule is rejected'
);

-- 4.
select throws_ok (
  $t4$
  insert into public.concept_attributes (workspace_id, concept_id, name, data_type, mapping_type, is_label, is_identifier, is_array, allow_manual_edit, bucket_grain, value_picker_rule_type)
  values ('b9001001-0000-4000-8000-000000000001'::uuid, 'b9002001-0000-4000-8000-000000000001'::uuid, 'Per month without rule', 'double', 'dataset_column', false, false, true, false, 'month', null);
  $t4$,
  '23514',
  null,
  'a per-period field without a rule is rejected'
);

-- 5.
select lives_ok (
  $t5$
  insert into public.concept_attributes (workspace_id, concept_id, name, data_type, mapping_type, is_label, is_identifier, is_array, allow_manual_edit, bucket_grain, value_picker_rule_type)
  values ('b9001001-0000-4000-8000-000000000001'::uuid, 'b9002001-0000-4000-8000-000000000001'::uuid, 'Single with rule', 'varchar', 'dataset_column', false, false, false, false, null, 'first');
  $t5$,
  'a single-value dataset-column field with a rule is accepted'
);

-- 6.
select lives_ok (
  $t6$
  insert into public.concept_attributes (workspace_id, concept_id, name, data_type, mapping_type, is_label, is_identifier, is_array, allow_manual_edit, bucket_grain, value_picker_rule_type)
  values ('b9001001-0000-4000-8000-000000000001'::uuid, 'b9002001-0000-4000-8000-000000000001'::uuid, 'List without rule', 'varchar', 'dataset_column', false, false, true, false, null, null);
  $t6$,
  'a plain list field without a rule is accepted'
);

-- 7.
select lives_ok (
  $t7$
  insert into public.concept_attributes (workspace_id, concept_id, name, data_type, mapping_type, is_label, is_identifier, is_array, allow_manual_edit, bucket_grain, value_picker_rule_type)
  values ('b9001001-0000-4000-8000-000000000001'::uuid, 'b9002001-0000-4000-8000-000000000001'::uuid, 'Per month with rule', 'double', 'dataset_column', false, false, true, false, 'month', 'avg');
  $t7$,
  'a per-period field with a rule is accepted'
);

-- 8.
select lives_ok (
  $t8$
  insert into public.concept_attributes (workspace_id, concept_id, name, data_type, mapping_type, is_label, is_identifier, is_array, allow_manual_edit, bucket_grain, value_picker_rule_type)
  values ('b9001001-0000-4000-8000-000000000001'::uuid, 'b9002001-0000-4000-8000-000000000001'::uuid, 'Manual without rule', 'varchar', 'manual_entry', false, false, false, true, null, null);
  $t8$,
  'a manual-entry field without a rule is accepted'
);

select * from finish ();

rollback;
```

- [ ] **Step 3: Extend the sources test**

In `supabase/tests/database/attribute_mappings__dataset_column__sources.test.sql`, insert this fixture block directly after `set search_path to extensions, public;`:

```sql
insert into auth.users (id, email, aud, role)
values ('af000001-0000-4000-8000-000000000001'::uuid, 'sources@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values ('af001001-0000-4000-8000-000000000001'::uuid, 'af000001-0000-4000-8000-000000000001'::uuid, 'sources ws', 'sources-ws')
on conflict (id) do nothing;

insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id)
values ('af002001-0000-4000-8000-000000000001'::uuid, 'af000001-0000-4000-8000-000000000001'::uuid, 'af001001-0000-4000-8000-000000000001'::uuid, 'sources case type', false, 'af003001-0000-4000-8000-000000000001'::uuid);

insert into public.concept_statuses (id, workspace_id, concept_id, name, color, position)
values ('af003001-0000-4000-8000-000000000001'::uuid, 'af001001-0000-4000-8000-000000000001'::uuid, 'af002001-0000-4000-8000-000000000001'::uuid, 'Active', '#40c057', 0);

insert into public.concept_attributes (
  id, workspace_id, concept_id, name, data_type, mapping_type,
  is_label, is_identifier, is_array, allow_manual_edit, value_picker_rule_type
)
values
  ('af004001-0000-4000-8000-000000000001'::uuid, 'af001001-0000-4000-8000-000000000001'::uuid, 'af002001-0000-4000-8000-000000000001'::uuid, 'Result', 'varchar', 'dataset_column', true, false, false, false, 'most_frequent'),
  ('af004002-0000-4000-8000-000000000002'::uuid, 'af001001-0000-4000-8000-000000000001'::uuid, 'af002001-0000-4000-8000-000000000001'::uuid, 'Every result', 'varchar', 'dataset_column', false, false, true, false, null);
```

Change `select plan (1);` to `select plan (4);`, and insert directly above `select * from finish ();`:

```sql
-- 2. Lab results kept in two sheets: one field, one row per sheet.
select lives_ok (
  $t2$
  insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, dataset_id, dataset_column_id, position)
  values
    ('af001001-0000-4000-8000-000000000001'::uuid, 'af004001-0000-4000-8000-000000000001'::uuid, 'af006001-0000-4000-8000-000000000001'::uuid, 'af007001-0000-4000-8000-000000000001'::uuid, 0),
    ('af001001-0000-4000-8000-000000000001'::uuid, 'af004001-0000-4000-8000-000000000001'::uuid, 'af006002-0000-4000-8000-000000000002'::uuid, 'af007002-0000-4000-8000-000000000002'::uuid, 1);
  $t2$,
  'a field reads one column of each of two datasets'
);

-- 3.
select throws_ok (
  $t3$
  insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, dataset_id, dataset_column_id, position)
  values ('af001001-0000-4000-8000-000000000001'::uuid, 'af004001-0000-4000-8000-000000000001'::uuid, 'af006001-0000-4000-8000-000000000001'::uuid, 'af007001-0000-4000-8000-000000000001'::uuid, 2);
  $t3$,
  '23505',
  null,
  'a field cannot read the same column twice'
);

-- 4. Two fields may read one column, such as a list and a single value of it.
select lives_ok (
  $t4$
  insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, dataset_id, dataset_column_id)
  values ('af001001-0000-4000-8000-000000000001'::uuid, 'af004002-0000-4000-8000-000000000002'::uuid, 'af006001-0000-4000-8000-000000000001'::uuid, 'af007001-0000-4000-8000-000000000001'::uuid);
  $t4$,
  'two fields can read the same column'
);
```

No field here has a period, so plan 4's bucket column trigger lets these rows through.

- [ ] **Step 4: Extend and adjust the creation RPC test**

In `supabase/tests/database/rpc_concepts__create.test.sql`:

1. Raise `select plan (N);` by 3.
2. In test 9, replace the attributes and mappings payloads with:

```sql
    '[{"id":"ac006003-0000-4000-8000-000000000003","name":"Name","description":null,"data_type":"varchar","mapping_type":"dataset_column","is_label":true,"is_identifier":true,"is_array":false,"allow_manual_edit":false,"value_picker_rule_type":"most_frequent"}]'::jsonb,
    '[{"concept_attribute_id":"ac006099-0000-4000-8000-000000000099","dataset_id":"ac007001-0000-4000-8000-000000000001","dataset_column_id":"ac008001-0000-4000-8000-000000000001","position":0}]'::jsonb,
```

3. Plan 3's assertions 16 to 19 move the rule onto the field:
   - In 16, add `,"value_picker_rule_type":"first"` to the `County` attribute JSON and delete `"value_picker_rule_type":"first",` from its mapping JSON.
   - Replace 17 with:

```sql
-- 17.
select is (
  (
    select count(*)::int
    from public.concept_attributes
    where
      id = 'ac006008-0000-4000-8000-000000000008'::uuid
      and value_picker_rule_type is null
  ),
  1,
  'a list field stores no value rule'
);
```

   - In 18, add `,"value_picker_rule_type":"first"` to the `County` attribute and `,"value_picker_rule_type":"sum"` to the `Daily new cases` attribute, delete both rules from the mapping JSON, and change the expected message to `'new row for relation "concept_attributes" violates check constraint "concept_attributes__value_picker_rule_type_by_shape"'`.
   - In 19, change the expected message the same way (its attribute names no rule).
   - Assertion 20 (a list label) is unchanged: plan 3's `list_field_is_key_or_label` check still refuses it.
   - If plan 4 added RPC assertions to this file, move each mapping's rule onto its attribute JSON the same way.

4. Insert directly above `select * from finish ();`:

```sql
-- One ID field reading two datasets' keys, and a field reading one column
-- of each.
select lives_ok (
  $t_two_sources$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"ac000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  select public.rpc_concepts__create (
    '{"id":"ac004031-0000-4000-8000-000000000031","workspace_id":"ac001001-0000-4000-8000-000000000001","name":"Two-source case type","description":null,"allow_manual_creation":false,"default_status_id":"ac005031-0000-4000-8000-000000000031"}'::jsonb,
    '[{"id":"ac006031-0000-4000-8000-000000000031","name":"Case ID","description":null,"data_type":"varchar","mapping_type":"dataset_column","is_label":true,"is_identifier":true,"is_array":false,"allow_manual_edit":false,"value_picker_rule_type":"first"},{"id":"ac006032-0000-4000-8000-000000000032","name":"Result","description":null,"data_type":"varchar","mapping_type":"dataset_column","is_label":false,"is_identifier":false,"is_array":false,"allow_manual_edit":false,"value_picker_rule_type":"most_frequent"}]'::jsonb,
    '[{"concept_attribute_id":"ac006031-0000-4000-8000-000000000031","dataset_id":"ac007031-0000-4000-8000-000000000031","dataset_column_id":"ac008031-0000-4000-8000-000000000031","position":0},{"concept_attribute_id":"ac006031-0000-4000-8000-000000000031","dataset_id":"ac007032-0000-4000-8000-000000000032","dataset_column_id":"ac008032-0000-4000-8000-000000000032","position":1},{"concept_attribute_id":"ac006032-0000-4000-8000-000000000032","dataset_id":"ac007031-0000-4000-8000-000000000031","dataset_column_id":"ac008033-0000-4000-8000-000000000033","position":0},{"concept_attribute_id":"ac006032-0000-4000-8000-000000000032","dataset_id":"ac007032-0000-4000-8000-000000000032","dataset_column_id":"ac008034-0000-4000-8000-000000000034","position":1}]'::jsonb,
    '[]'::jsonb,
    '[{"id":"ac005031-0000-4000-8000-000000000031","name":"Active","description":null,"color":"#40c057","position":0}]'::jsonb
  );
  $t_two_sources$,
  'a Case Types editor creates a case type whose fields each read two sources'
);

reset role;

select is (
  (select value_picker_rule_type::text from public.concept_attributes where id = 'ac006032-0000-4000-8000-000000000032'::uuid),
  'most_frequent',
  'the rule is stored on the field'
);

select is (
  (
    select array_agg(dataset_column_id order by position)
    from public.attribute_mappings__dataset_column
    where concept_attribute_id = 'ac006032-0000-4000-8000-000000000032'::uuid
  ),
  array['ac008033-0000-4000-8000-000000000033'::uuid, 'ac008034-0000-4000-8000-000000000034'::uuid],
  'each source is stored with its position'
);
```

Number the three new assertions' comments after the file's last one.

- [ ] **Step 5: Run the three files and watch them fail**

```bash
ava supabase status
supabase test db supabase/tests/database/concept_attributes__value_picker_rule_type.test.sql supabase/tests/database/attribute_mappings__dataset_column__sources.test.sql supabase/tests/database/rpc_concepts__create.test.sql
```

Expected: FAIL. The shape test's assertions 1 to 4 `threw no exception`. The sources test's assertion 2 dies with `23505` (the old `unique (concept_attribute_id)` refuses the second row), and assertion 3 then `threw no exception`, because assertion 2's rows were rolled back and one row per field is still allowed. The RPC test's new case dies with plan 4's `A dataset field has a value rule unless it keeps every value` (the old RPC reads the rule from the mapping, which no longer sends one), and plan 3's 18 and 19 receive that message instead of the constraint's.

- [ ] **Step 6: Change the mapping table**

In `supabase/schemas/30.attribute_mappings__dataset_column.sql`:

1. Replace `concept_attribute_id uuid not null unique references concept_attributes (id) on update cascade on delete cascade,` with:

```sql
  -- A field has one row per source, so this is not unique on its own.
  concept_attribute_id uuid not null references concept_attributes (id) on update cascade on delete cascade,
```

2. Delete the `value_picker_rule_type` column and the comment plan 3 put above it.
3. After the `position` column (give it a trailing comma), add:

```sql
  -- A field reads each column at most once.
  constraint attribute_mappings__dataset_column__attribute_column_unique unique (concept_attribute_id, dataset_column_id)
```

- [ ] **Step 7: Add the shape check**

In `supabase/schemas/20.concept_attributes.sql`, add this constraint after the last constraint of `create table public.concept_attributes` (give that one a trailing comma):

```sql
  -- A single-value or per-period dataset-column field reduces its rows with a
  -- rule. A plain list keeps every value and a manual-entry field reads no
  -- rows, so neither has one.
  constraint concept_attributes__value_picker_rule_type_by_shape check (
    (value_picker_rule_type is not null) = (
      mapping_type = 'dataset_column'
      and (
        not is_array
        or bucket_grain is not null
      )
    )
  )
```

- [ ] **Step 8: Write the rule and positions in the creation RPC**

In `supabase/schemas/50.rpc_concepts__create.sql`:

1. Replace the docstring's `p_attributes` and `p_dataset_column_mappings` lines with:

```sql
 * @param p_attributes The `concept_attributes` rows, each with its `id`, and
 *   for a single-value or per-period dataset-column field its
 *   `value_picker_rule_type`.
 * @param p_dataset_column_mappings The `attribute_mappings__dataset_column`
 *   rows, one per source of each dataset-column field, each with its
 *   `position`.
```

(plan 4 wrote both lines; drop its sentences about a row without `bucket_grain` or `bucket_column_id` only if your wording replaces them, and keep them otherwise), and replace the paragraph about the two hints, as plan 4 reworded it (it begins ``A field that keeps every value (`is_array` with no `bucket_grain`) stores``), with:

```sql
 *
 * A list of either kind is never the label or an identifier, refused with
 * errcode `23514` and the hint `list_field_is_key_or_label`. Which fields
 * hold a value rule (every single-value and per-period dataset field, and no
 * other) is the `concept_attributes__value_picker_rule_type_by_shape`
 * constraint's, which refuses the attribute insert with `23514`.
```

2. In the attributes insert, add `value_picker_rule_type` to the column list, `a.value_picker_rule_type` to the `select` list, and `value_picker_rule_type public.attribute_mappings__value_picker_rule_type` to the `jsonb_to_recordset` definition, each after plan 4's `bucket_grain`.
3. Replace the dataset-column mapping insert with:

```sql
  insert into public.attribute_mappings__dataset_column (
    workspace_id,
    concept_attribute_id,
    dataset_id,
    dataset_column_id,
    bucket_column_id,
    position
  )
  select
    v_workspace_id,
    m.concept_attribute_id,
    m.dataset_id,
    m.dataset_column_id,
    m.bucket_column_id,
    -- A payload that leaves the position out reads first, as the column
    -- default does.
    coalesce(m.position, 0)
  from jsonb_to_recordset(p_dataset_column_mappings) as m (
    concept_attribute_id uuid,
    dataset_id uuid,
    dataset_column_id uuid,
    bucket_column_id uuid,
    position integer
  );
```

4. Delete the block that raises `value_rule_mismatch`, as plan 4 reworded it: from its comment `-- A field that keeps every value names no rule. Every other dataset field` through its `end if;`. It joins the mapping's rule, which no longer exists, and the shape check in Step 7 states the same rule ("a rule unless the field is a list with no period") on the field. Keep the `list_field_is_key_or_label` block.

Run `pnpm format`.

- [ ] **Step 9: Generate the migration**

```bash
ava supabase status
pnpm db:reset
pnpm db:new-migration allow_many_sources_per_attribute
```

Expected: a new `<ts>_allow_many_sources_per_attribute.sql` containing: the drop of `attribute_mappings__dataset_column_concept_attribute_id_key` (constraint and index), the drop of the mapping's `value_picker_rule_type`, the new `attribute_mappings__dataset_column__attribute_column_unique` (index and constraint), the new `concept_attributes__value_picker_rule_type_by_shape`, and `create or replace function public.rpc_concepts__create`. Nothing else. If it drops anything else, it is the shared-stack bug in `CLAUDE.md`: reset, regenerate, compare.

- [ ] **Step 10: Move every other database test off the mapping's rule**

1. `supabase/tests/database/permissions/rls_attribute_mappings__dataset_column.test.sql`: in the `insert into public.concept_attributes` seed block, add `value_picker_rule_type` to the column list after `allow_manual_edit`, and `'first'::public.attribute_mappings__value_picker_rule_type` to the end of each of its five rows. Then make these replacements everywhere in the file:

| Find | Replace with |
| --- | --- |
| `id, workspace_id, concept_attribute_id, value_picker_rule_type,` (mapping seed column list) | `id, workspace_id, concept_attribute_id,` |
| a line holding only `'first'::public.attribute_mappings__value_picker_rule_type,` inside the mapping seed rows | nothing (delete the line) |
| `(id, workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id)` | `(id, workspace_id, concept_attribute_id, dataset_id, dataset_column_id)` |
| `::uuid, 'first'::public.attribute_mappings__value_picker_rule_type, '` in the test inserts | `::uuid, '` |
| `set value_picker_rule_type = 'sum'::public.attribute_mappings__value_picker_rule_type` | `set position = 5` |
| `t.value_picker_rule_type = 'first'::public.attribute_mappings__value_picker_rule_type` | `t.position = 0` |
| `t.value_picker_rule_type = 'sum'::public.attribute_mappings__value_picker_rule_type` | `t.position = 5` |
| `-- 11. A case_types editor changes a mapping's value picker.` | `-- 11. A case_types editor changes a source's position.` |

2. `supabase/tests/database/concept_attributes__bucketed_list.test.sql` (plan 4's, 22 assertions). Its mapping trigger and table checks are unchanged; only the rule moves:

| Where | Change |
| --- | --- |
| Every `insert into public.attribute_mappings__dataset_column` (the setup row and assertions 6 to 13) | Delete `value_picker_rule_type` from the column list and its value (`'first'`, `'avg'`, `'max'`) from the row |
| The setup `insert into public.concept_attributes` | Add `value_picker_rule_type` after `bucket_grain`, with `'first'` for Patient and Note, `'max'` for Temperature per week, and `'avg'` for Unmapped per month |
| Assertions 1, 3, 4 and 5 (direct attribute inserts) | Add `value_picker_rule_type` after `bucket_grain`, with `'avg'`, `'first'`, `'first'` and `'avg'`, so each row breaks only the check its assertion names. Assertion 2 (hand-entered) stays without one. Expected messages unchanged |
| Assertions 15 and 19 (RPC) | Move `"value_picker_rule_type":"first"` from the Patient mapping onto the Patient attribute and `"value_picker_rule_type":"avg"` from the per-month mapping onto the per-month attribute. Expected results unchanged (19 still dies on the trigger's `A mapping for a field with a bucket_grain needs a bucket_column_id`) |
| Assertion 21 (RPC, a per-month field without a rule) | Move `"value_picker_rule_type":"first"` onto the Patient attribute; the per-month attribute stays without one. Change the expected message to `'new row for relation "concept_attributes" violates check constraint "concept_attributes__value_picker_rule_type_by_shape"'` |

   If a landed assertion differs from this table, apply its rule: every mapping loses its rule, every single-value or per-period dataset field gains the rule its mapping had (`first` where it had none), and a refusal that came from the RPC's `value_rule_mismatch` now comes from `concept_attributes__value_picker_rule_type_by_shape`.

3. `supabase/migration-upgrade-tests/value_rule_data_types.prelude.sql` (plan 2's): directly after `begin;`, add:

```sql
-- The value rule has since moved onto `concept_attributes`: restore the
-- mapping's rule and lift the field's requirement, so this replay runs
-- against the shape it was written for.
alter table public.attribute_mappings__dataset_column
add column if not exists value_picker_rule_type public.attribute_mappings__value_picker_rule_type;

alter table public.concept_attributes
drop constraint if exists concept_attributes__value_picker_rule_type_by_shape;
```

and remove the header sentence that says nothing is lifted.

4. Confirm nothing was missed:

```bash
rg -n "value_picker_rule_type" supabase/tests/database
```

Expected: only `concept_attributes` column lists, values, and payload keys, never an `attribute_mappings__dataset_column` column.

- [ ] **Step 11: Move the E2E seeding helper onto the new payload**

In `tests/e2e/helpers/CaseTypeSeedHelpers.ts`, in `p_attributes` add `value_picker_rule_type: "first",` after `allow_manual_edit: false,`; in `p_dataset_column_mappings` delete `value_picker_rule_type: "first",` and add `position: 0,` after `dataset_column_id: datasetColumnId,`.

- [ ] **Step 12: Run the whole database suite**

```bash
ava supabase status
pnpm test:db
```

Expected: PASS for every pgTAP file, the privilege reconcile, and every replay, including `value_rule_data_types` and `value_picker_rule_move`.

- [ ] **Step 13: Commit**

```bash
git add supabase/schemas/20.concept_attributes.sql supabase/schemas/30.attribute_mappings__dataset_column.sql supabase/schemas/50.rpc_concepts__create.sql supabase/migrations/*_allow_many_sources_per_attribute.sql supabase/tests/database supabase/migration-upgrade-tests/value_rule_data_types.prelude.sql tests/e2e/helpers/CaseTypeSeedHelpers.ts
git commit -m "feat(joined-cases): let a field read several sources and require its rule by shape"
```

---

## Task 4: Database types and the desktop mirror

**Files:**
- Modify: `shared/types/database.types.ts` (generated)
- Modify: `apps/desktop/scripts/gen-sqlite-migrations/getManualMigrationBodyFromSourceFile.ts`
- Create: `apps/desktop/migrations/<ts>_*.gen.sql` (generated, one per migration from Tasks 1 to 3)

The SQLite mirror still has a unique index on `concept_attribute_id`, named `value_extractors__dataset_column_val_entity_field_config_id_key` (`apps/desktop/migrations/20250820162238_*.gen.sql:52`). A field's second source would fail to sync into it, so migration 3 gets a hand-written SQLite body.

- [ ] **Step 1: Regenerate the database types**

```bash
ava supabase status
pnpm db:gen-types
```

Expected: `shared/types/database.types.ts` gains `concept_attributes.value_picker_rule_type` and `attribute_mappings__dataset_column.position`, and loses `attribute_mappings__dataset_column.value_picker_rule_type`.

- [ ] **Step 2: Confirm the mirror's index name**

```bash
rg -n "UNIQUE INDEX .*entity_field_config_id_key|concept_attribute_id_key" apps/desktop/migrations
```

Expected: `value_extractors__dataset_column_val_entity_field_config_id_key` is created in `20250820162238_*.gen.sql` and never dropped. If a later file renamed it, add that name to Step 3's drops.

- [ ] **Step 3: Add the SQLite body for migration 3**

In `apps/desktop/scripts/gen-sqlite-migrations/getManualMigrationBodyFromSourceFile.ts`, add an entry to `_MANUAL_MIGRATION_BODIES`, keyed by the exact file name of Task 3's migration:

```ts
  "<ts>_allow_many_sources_per_attribute.sql": `-- SQLite override. A field now has one mapping row per source, so the
-- mirror's one-row-per-field unique index has to go, or syncing a field's
-- second source would fail. The mirror carries that index under its
-- \`value_extractors__\` name, which the Postgres constraint rename never
-- reached, so both names are dropped. The two-column unique index replaces
-- it, and the value rule now lives on \`concept_attributes\`.
--
drop index if exists "value_extractors__dataset_column_val_entity_field_config_id_key";

drop index if exists "attribute_mappings__dataset_column_concept_attribute_id_key";

alter table "attribute_mappings__dataset_column" drop column "value_picker_rule_type";

create unique index "attribute_mappings__dataset_column__attribute_column_unique"
on "attribute_mappings__dataset_column" ("concept_attribute_id", "dataset_column_id");
`,
```

- [ ] **Step 4: Generate and check the SQLite migrations**

```bash
pnpm desktop:sqlite:gen-migrations
pnpm desktop:sqlite:check-migrations
```

Expected: three new `.gen.sql` files. Migration 1's adds the two columns, migration 2's reports no schema-shape changes, and migration 3's is the body from Step 3. The check reports no drift.

- [ ] **Step 5: Commit**

```bash
git add shared/types/database.types.ts apps/desktop/scripts/gen-sqlite-migrations/getManualMigrationBodyFromSourceFile.ts apps/desktop/migrations
git commit -m "chore(joined-cases): regenerate database types and the desktop mirror for field sources"
```

---

## Task 5: Models: the rule on the field, the position on the source

**Files:**
- Create: `shared/models/ontology/AttributeMapping/DatasetColumnMapping/AttributeSources/AttributeSources.ts`
- Create: `shared/models/ontology/AttributeMapping/DatasetColumnMapping/AttributeSources/AttributeSources.test.ts`
- Modify: `shared/models/ontology/ConceptAttribute/ConceptAttribute.types.ts`, `ConceptAttribute.ts`, `ConceptAttributeParsers.ts`
- Modify: `shared/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types.ts`, `DatasetColumnMappingParsers.ts`, `DatasetColumnMappings.ts`
- Modify: `shared/models/ontology/Concept/Concept.types.ts:58-65, 92-94`, `shared/models/ontology/Concept/ConceptModule.ts:8-17`
- Modify: `src/clients/ontology/ConceptAttributeClient.ts:28-35` (docstring)

- [ ] **Step 1: Write the failing test**

Create `shared/models/ontology/AttributeMapping/DatasetColumnMapping/AttributeSources/AttributeSources.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { AttributeSources } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/AttributeSources/AttributeSources.ts";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { DatasetColumnId } from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";
import type { AttributeMapping } from "$/models/ontology/AttributeMapping/AttributeMapping.types.ts";
import type {
  DatasetColumnMapping,
  DatasetColumnMappingId,
} from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types.ts";
import type { ConceptAttributeId } from "$/models/ontology/ConceptAttribute/ConceptAttribute.types.ts";

const RESULT_ID = "attr-result" as ConceptAttributeId;
const OTHER_ID = "attr-other" as ConceptAttributeId;

function _source(options: {
  attributeId?: ConceptAttributeId;
  datasetId: string;
  columnId: string;
  position: number;
}): DatasetColumnMapping {
  return {
    id: `map-${options.columnId}` as DatasetColumnMappingId,
    workspaceId: "ws" as DatasetColumnMapping["workspaceId"],
    type: "dataset_column",
    conceptAttributeId: options.attributeId ?? RESULT_ID,
    datasetId: options.datasetId as DatasetId,
    datasetColumnId: options.columnId as DatasetColumnId,
    bucketColumnId: undefined,
    position: options.position,
    createdAt: "2026-11-06T00:00:00Z",
    updatedAt: "2026-11-06T00:00:00Z",
  };
}

describe("AttributeSources.getSourceMappingsFromMappings", () => {
  it("lists a field's sources by position, whatever order they arrive in", () => {
    const labs = _source({ datasetId: "labs", columnId: "c-2", position: 1 });
    const lineList = _source({
      datasetId: "line-list",
      columnId: "c-1",
      position: 0,
    });

    expect(
      AttributeSources.getSourceMappingsFromMappings({
        attributeId: RESULT_ID,
        mappings: [labs, lineList],
      }),
    ).toEqual([lineList, labs]);
  });

  it("breaks a position tie by dataset column id", () => {
    const later = _source({ datasetId: "a", columnId: "c-b", position: 0 });
    const earlier = _source({ datasetId: "b", columnId: "c-a", position: 0 });

    expect(
      AttributeSources.getSourceMappingsFromMappings({
        attributeId: RESULT_ID,
        mappings: [later, earlier],
      }),
    ).toEqual([earlier, later]);
  });

  it("leaves out other fields' sources and manual-entry mappings", () => {
    const own = _source({ datasetId: "a", columnId: "c-1", position: 0 });
    const manual = {
      type: "manual_entry",
      conceptAttributeId: RESULT_ID,
    } as AttributeMapping;

    expect(
      AttributeSources.getSourceMappingsFromMappings({
        attributeId: RESULT_ID,
        mappings: [
          own,
          manual,
          _source({
            attributeId: OTHER_ID,
            datasetId: "a",
            columnId: "c-9",
            position: 0,
          }),
        ],
      }),
    ).toEqual([own]);
  });
});

describe("AttributeSources.getDatasetIdsFromMappings", () => {
  it("lists each source dataset once, in read order", () => {
    expect(
      AttributeSources.getDatasetIdsFromMappings({
        attributeId: RESULT_ID,
        mappings: [
          _source({ datasetId: "labs", columnId: "c-3", position: 2 }),
          _source({ datasetId: "line-list", columnId: "c-1", position: 0 }),
          _source({ datasetId: "labs", columnId: "c-2", position: 1 }),
        ],
      }),
    ).toEqual(["line-list", "labs"]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:frontend shared/models/ontology/AttributeMapping/DatasetColumnMapping/AttributeSources`
Expected: FAIL, `Failed to resolve import ".../AttributeSources.ts"`.

- [ ] **Step 3: Write `AttributeSources`**

Create `shared/models/ontology/AttributeMapping/DatasetColumnMapping/AttributeSources/AttributeSources.ts`:

```ts
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { AttributeMapping } from "$/models/ontology/AttributeMapping/AttributeMapping.types.ts";
import type { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types.ts";
import type { ConceptAttributeId } from "$/models/ontology/ConceptAttribute/ConceptAttribute.types.ts";

function _compareReadOrder(
  left: Readonly<DatasetColumnMapping>,
  right: Readonly<DatasetColumnMapping>,
): number {
  return (
    left.position - right.position ||
    left.datasetColumnId.localeCompare(right.datasetColumnId)
  );
}

function _isDatasetColumnMapping(
  mapping: Readonly<AttributeMapping>,
): mapping is DatasetColumnMapping {
  return mapping.type === "dataset_column";
}

function _getSourceMappingsFromMappings(
  options: Readonly<{
    attributeId: ConceptAttributeId;
    mappings: readonly AttributeMapping[];
  }>,
): DatasetColumnMapping[] {
  return options.mappings
    .filter(_isDatasetColumnMapping)
    .filter((mapping) => {
      return mapping.conceptAttributeId === options.attributeId;
    })
    .sort(_compareReadOrder);
}

/**
 * Reads a field's sources, which are its dataset-column mapping rows, in the
 * order the field reads them: ascending position, ties broken by dataset
 * column id. Every consumer that lists or reads a field's sources goes
 * through it, for example column resolution or a provenance list, so read
 * order is decided in one place.
 */
export const AttributeSources = {
  /** One field's dataset-column mappings, in read order. */
  getSourceMappingsFromMappings: _getSourceMappingsFromMappings,

  /** The datasets one field reads, in read order, each listed once. */
  getDatasetIdsFromMappings: (
    options: Readonly<{
      attributeId: ConceptAttributeId;
      mappings: readonly AttributeMapping[];
    }>,
  ): DatasetId[] => {
    return [
      ...new Set(
        _getSourceMappingsFromMappings(options).map((mapping) => {
          return mapping.datasetId;
        }),
      ),
    ];
  },
};
```

- [ ] **Step 4: Move the rule onto the field model**

In `shared/models/ontology/ConceptAttribute/ConceptAttribute.types.ts`, add `import type { Enums } from "$/types/database.types.ts";` and, above `type ConceptAttributeRead`:

```ts
/**
 * The rule that reduces a field's rows from every source to one value, or
 * to one value per period. Read from `concept_attributes.value_picker_rule_type`.
 */
export type ValuePickerRuleType =
  Enums<"attribute_mappings__value_picker_rule_type">;
```

and in `ConceptAttributeRead`, after plan 4's `bucketGrain`:

```ts
    /**
     * The rule that reduces this field's rows from every source. Set on a
     * single-value or per-period dataset-column field, undefined on a plain
     * list and on a manual-entry field.
     */
    valuePickerRuleType: ValuePickerRuleType | undefined;
```

In `ConceptAttribute.ts`, add `ValuePickerRuleType as ValuePickerRuleTypeT` to the type import and `export type ValuePickerRuleType = ValuePickerRuleTypeT;` inside the namespace.

In `ConceptAttributeParsers.ts`, import `DatasetColumnMappings` (`$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappings.ts`) and add to `DBReadSchema`:

```ts
  value_picker_rule_type: z
    .enum(DatasetColumnMappings.ValuePickerTypes)
    .nullable(),
```

- [ ] **Step 5: Take the rule off the mapping model and add the position**

In `DatasetColumnMapping.types.ts`, delete the `ValuePickerRuleType` export and the `valuePickerRuleType` field (plan 3 made it optional), and after `datasetColumnId` add:

```ts
  /**
   * This source's place in its field's read order. A field reads its sources
   * in ascending position, ties broken by dataset column id.
   */
  position: number;
```

Every file that imported `ValuePickerRuleType` from `DatasetColumnMapping.types` (`DatasetColumnMappings.ts`, plan 2's `ValuePickerRule`, plan 3's builders; find them with `rg -n "ValuePickerRuleType.*DatasetColumnMapping.types" shared src supabase/functions`) imports it from `$/models/ontology/ConceptAttribute/ConceptAttribute.types` instead.

In `DatasetColumnMappingParsers.ts`, in `DBReadSchema` replace the `value_picker_rule_type` entry with `position: z.number().int(),` and remove whatever plan 3 left that reads or writes the rule, then remove imports that become unused.

- [ ] **Step 6: Give each hydrated attribute all of its mappings**

In `shared/models/ontology/Concept/Concept.types.ts`, change `ConceptFull`'s attribute type to:

```ts
  attributes?: ReadonlyArray<
    ConceptAttributeModel["Read"] & {
      /** Every mapping of the field: one per source for a dataset-column field. */
      mappings?: AttributeMapping[];
    }
  >;
```

and `BuildableConcept` to:

```ts
export type BuildableConcept = ConceptWith<
  "datasets" | "attributes" | `attributes.${number}.mappings`
>;
```

In `ConceptModule.ts`, rename `ConceptAttributeWithMapping` to `ConceptAttributeWithMappings` (every use) with the body:

```ts
type ConceptAttributeWithMappings = ConceptAttributeModel["Read"] & {
  mappings: AttributeMapping[];
};
```

- [ ] **Step 7: Say what `getAllAttributeMappings` returns**

In `src/clients/ontology/ConceptAttributeClient.ts`, replace the docstring above `return {` in `queries` with:

```ts
      /**
       * Given a list of concept attributes, fetch every mapping that
       * populates them. A dataset-column field has one mapping per source, so
       * read a field's sources through `AttributeSources`, which puts them in
       * read order.
       */
```

- [ ] **Step 8: Run the test and watch it pass**

Run: `pnpm test:frontend shared/models/ontology`
Expected: PASS, including the 4 new tests.

- [ ] **Step 9: Commit**

```bash
git add shared/models/ontology src/clients/ontology/ConceptAttributeClient.ts
git commit -m "feat(joined-cases): keep the value rule on the field and order a field's sources"
```

---

## Task 6: The view reads a field by stacking its sources

**Files:**
- Create: `src/clients/qetl/QueryMediator/conceptRelation/buildStackedSourceRowsSql/buildStackedSourceRowsSql.ts`
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/buildAttributeValueSql.ts` (rewrite)
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/buildBucketedListValueSql/buildBucketedListValueSql.ts`
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql.ts` (arm and dispatch)
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql.executed.test.ts`
- Modify (fixture shape): `buildAttributeValueSql.executed.test.ts`, `buildBucketedListValueSql.executed.test.ts`

Spec §6.3 and §6.4. The SQL below, under plan 1's single and list reductions and plan 4's per-period reductions, and every expected value in Step 1, were run against `@duckdb/node-api@1.5.5-r.4` on 2026-11-06 with this exact fixture.

- [ ] **Step 1: Write the failing executed tests**

Append to `buildConceptViewSql.executed.test.ts` (merge the imports into the file's own; the view test covers both value builders, whichever shape each serves):

```ts
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { ConceptAttributeValueRule } from "@/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql";
import type { ConceptAttributeSource } from "@/clients/qetl/QueryMediator/conceptRelation/buildStackedSourceRowsSql/buildStackedSourceRowsSql";

const LINE_LIST_ID = "aaaaaaaa-5555-4555-8555-aaaaaaaaaaaa";
const LABS_ID = "bbbbbbbb-6666-4666-8666-bbbbbbbbbbbb";
const TWO_SOURCE_VIEW = "concept_dddddddd-7777-4777-8777-dddddddddddd";
const TWO_SOURCE_SPINE = `${TWO_SOURCE_VIEW}__individuals`;

/**
 * Two datasets with different key columns: a line list keyed by `case_id`
 * and a lab sheet keyed by `patient_ref`, whose `titer` is BIGINT where the
 * line list's is INTEGER. `c1` has values in both and ties between them,
 * `c2` has a NULL in the line list and a NULL date in the labs, `c3` has only
 * NULLs, `c4` is only in the labs, and `c5` is in neither.
 */
async function _seedTwoSources(connection: DuckDBConnection): Promise<void> {
  const lineListPath = join(tmpdir(), "ava-two-source-line-list.parquet");
  const labsPath = join(tmpdir(), "ava-two-source-labs.parquet");
  await connection.run(`
    COPY (
      SELECT * FROM (VALUES
        ('c1', '555-0101', NULL,       'negative', 0::INTEGER,  DATE '2026-01-05'),
        ('c1', NULL,       '555-0102', 'positive', 30::INTEGER, DATE '2026-01-20'),
        ('c2', '555-0201', '555-0201', NULL,       NULL,        DATE '2026-02-01'),
        ('c3', NULL,       NULL,       NULL,       NULL,        NULL)
      ) AS t(case_id, phone_1, phone_2, result, titer, onset)
    ) TO '${lineListPath}' (FORMAT parquet)
  `);
  await connection.run(`
    COPY (
      SELECT * FROM (VALUES
        ('c1', 'positive', 30::BIGINT, DATE '2026-01-25'),
        ('c1', 'negative', 30::BIGINT, DATE '2026-02-10'),
        ('c2', 'positive', NULL,       DATE '2026-02-03'),
        ('c2', NULL,       70::BIGINT, NULL),
        ('c4', 'positive', 90::BIGINT, DATE '2026-03-01')
      ) AS t(patient_ref, lab_result, titer, sampled_on)
    ) TO '${labsPath}' (FORMAT parquet)
  `);
  await connection.run(`
    CREATE VIEW "${getRowNumberedViewName(LINE_LIST_ID)}" AS
      SELECT * FROM read_parquet('${lineListPath}', file_row_number = true);
    CREATE VIEW "${getRowNumberedViewName(LABS_ID)}" AS
      SELECT * FROM read_parquet('${labsPath}', file_row_number = true);
    CREATE TABLE "${TWO_SOURCE_SPINE}" AS
      SELECT * FROM (VALUES
        ('c1', 'Active'), ('c2', 'Active'), ('c3', 'Active'), ('c4', 'Active'), ('c5', 'Active')
      ) AS t(external_id, status);
  `);
}

function _lineListSource(
  overrides: Readonly<Partial<ConceptAttributeSource>>,
): ConceptAttributeSource {
  return {
    datasetId: LINE_LIST_ID,
    selectColumnName: "result",
    primaryKeyColumnName: "case_id",
    bucketColumnName: undefined,
    position: 0,
    ...overrides,
  };
}

function _labsSource(
  overrides: Readonly<Partial<ConceptAttributeSource>>,
): ConceptAttributeSource {
  return {
    datasetId: LABS_ID,
    selectColumnName: "lab_result",
    primaryKeyColumnName: "patient_ref",
    bucketColumnName: undefined,
    position: 1,
    ...overrides,
  };
}

const RESULT_SOURCES = [_lineListSource({}), _labsSource({})];
const TITER_SOURCES = [
  _lineListSource({ selectColumnName: "titer" }),
  _labsSource({ selectColumnName: "titer" }),
];
const DATED_TITER_SOURCES = [
  _lineListSource({ selectColumnName: "titer", bucketColumnName: "onset" }),
  _labsSource({ selectColumnName: "titer", bucketColumnName: "sampled_on" }),
];
const PHONE_SOURCES = [
  _lineListSource({ selectColumnName: "phone_1" }),
  _lineListSource({ selectColumnName: "phone_2", position: 1 }),
];

/** A two-source column, every source cast to `sharedType`. */
function _twoSourceColumn(
  options: Readonly<{
    name: string;
    sources: readonly ConceptAttributeSource[];
    sharedType: "VARCHAR" | "BIGINT";
    rule: ConceptAttributeValueRule;
  }>,
): ConceptAttributeColumn {
  return {
    kind: "dataset_column",
    attributeId: `attr-${options.name}` as ConceptAttribute.Id,
    attributeName: options.name,
    sources: [...options.sources],
    sharedSourceDuckDbDataType: options.sharedType,
    ...options.rule,
  };
}

/**
 * Builds the view over the two-source world and returns its rows by key.
 * JSON rows carry a BIGINT as a string, so the BIGINT rules read as strings.
 */
async function _queryTwoSourceView(
  attributeColumns: readonly ConceptAttributeColumn[],
): Promise<Array<Record<string, unknown>>> {
  return await withDuckDb(async (connection) => {
    await _seedTwoSources(connection);
    await connection.run(
      buildConceptViewSql({
        viewName: TWO_SOURCE_VIEW,
        spineTableName: TWO_SOURCE_SPINE,
        attributeColumns,
      }),
    );
    const reader = await connection.runAndReadAll(
      `SELECT * FROM "${TWO_SOURCE_VIEW}" ORDER BY external_id`,
    );
    return reader.getRowObjectsJson();
  });
}

/** One field's value for each of c1 to c5. */
async function _queryFieldValues(
  column: ConceptAttributeColumn,
): Promise<unknown[]> {
  const rows = await _queryTwoSourceView([column]);
  return rows.map((row) => {
    return row[column.attributeName];
  });
}

describe("buildConceptViewSql with a field read from two sources", () => {
  // c1's first line-list row says negative. c2 has a NULL in the line list,
  // so the labs' value is its first. c4 is only in the labs.
  it("`first` takes the earliest source's first non-NULL value, reading the next source when it has none", async () => {
    expect(
      await _queryFieldValues(
        _twoSourceColumn({
          name: "result",
          sources: RESULT_SOURCES,
          sharedType: "VARCHAR",
          rule: { valueShape: "single", valuePickerRuleType: "first" },
        }),
      ),
    ).toEqual(["negative", "positive", null, "positive", null]);
  });

  it("`first` follows source position, not the order the sources are listed in", async () => {
    expect(
      await _queryFieldValues(
        _twoSourceColumn({
          name: "result",
          sources: [_lineListSource({ position: 1 }), _labsSource({ position: 0 })],
          sharedType: "VARCHAR",
          rule: { valueShape: "single", valuePickerRuleType: "first" },
        }),
      ),
    ).toEqual(["positive", "positive", null, "positive", null]);
  });

  // Ten runs, because a `first` that is deterministic only by luck returns
  // different values across runs of unchanged data.
  it("`first` across two sources returns the same value in ten consecutive runs", async () => {
    const column = _twoSourceColumn({
      name: "result",
      sources: RESULT_SOURCES,
      sharedType: "VARCHAR",
      rule: { valueShape: "single", valuePickerRuleType: "first" },
    });
    const values = new Set<unknown>();
    for (let run = 0; run < 10; run += 1) {
      const [firstValue] = await _queryFieldValues(column);
      values.add(firstValue);
    }
    expect([...values]).toEqual(["negative"]);
  });

  // c1 has negative and positive twice each, one of each per source.
  it("`most_frequent` counts values across sources and breaks a tie by value", async () => {
    expect(
      await _queryFieldValues(
        _twoSourceColumn({
          name: "result",
          sources: RESULT_SOURCES,
          sharedType: "VARCHAR",
          rule: { valueShape: "single", valuePickerRuleType: "most_frequent" },
        }),
      ),
    ).toEqual(["negative", "positive", null, "positive", null]);
  });

  // c1's titers are 0 and 30 in the line list and 30 and 30 in the labs.
  it("`most_frequent` picks the value most frequent across both sources", async () => {
    const [c1] = await _queryFieldValues(
      _twoSourceColumn({
        name: "titer",
        sources: TITER_SOURCES,
        sharedType: "BIGINT",
        rule: { valueShape: "single", valuePickerRuleType: "most_frequent" },
      }),
    );
    expect(c1).toBe("30");
  });

  it("`count` counts every source's non-NULL values, and 0 when there are none", async () => {
    expect(
      await _queryFieldValues(
        _twoSourceColumn({
          name: "result",
          sources: RESULT_SOURCES,
          sharedType: "VARCHAR",
          rule: { valueShape: "single", valuePickerRuleType: "count" },
        }),
      ),
    ).toEqual(["4", "1", "0", "1", "0"]);
  });

  it("`sum`, `avg`, `min`, and `max` cover both sources once they are cast to one type", async () => {
    const rows = await _queryTwoSourceView(
      (["sum", "avg", "min", "max"] as const).map((ruleType) => {
        return _twoSourceColumn({
          name: ruleType,
          sources: TITER_SOURCES,
          sharedType: "BIGINT",
          rule: { valueShape: "single", valuePickerRuleType: ruleType },
        });
      }),
    );
    expect(rows[0]).toMatchObject({ sum: 90, avg: 22.5, min: "0", max: "30" });
  });

  it("a list holds every non-NULL value in source order, then file order", async () => {
    expect(
      await _queryFieldValues(
        _twoSourceColumn({
          name: "results",
          sources: RESULT_SOURCES,
          sharedType: "VARCHAR",
          rule: { valueShape: "list" },
        }),
      ),
    ).toEqual([
      ["negative", "positive", "positive", "negative"],
      ["positive"],
      [],
      ["positive"],
      [],
    ]);
  });

  // Phone 1 and phone 2 of one dataset. c2 has the same number in both.
  it("a list over two columns of one dataset keeps both columns' values, duplicates included", async () => {
    expect(
      await _queryFieldValues(
        _twoSourceColumn({
          name: "phones",
          sources: PHONE_SOURCES,
          sharedType: "VARCHAR",
          rule: { valueShape: "list" },
        }),
      ),
    ).toEqual([
      ["555-0101", "555-0102"],
      ["555-0201", "555-0201"],
      [],
      [],
      [],
    ]);
  });

  // c1's January titers are 0 and 30 (line list) and 30 (labs). c2's only
  // titer has no date, so it falls in no period.
  it("a per-month `avg` averages both sources per month and drops a row with no date", async () => {
    expect(
      await _queryFieldValues(
        _twoSourceColumn({
          name: "monthly",
          sources: DATED_TITER_SOURCES,
          sharedType: "BIGINT",
          rule: { valueShape: "bucketed_list", valuePickerRuleType: "avg", bucketGrain: "month" },
        }),
      ),
    ).toEqual([
      [
        { bucket: "2026-01-01", value: 20 },
        { bucket: "2026-02-01", value: 30 },
      ],
      [],
      [],
      [{ bucket: "2026-03-01", value: 90 }],
      [],
    ]);
  });

  it("a per-month `most_frequent` counts across sources within each month", async () => {
    const [c1] = await _queryFieldValues(
      _twoSourceColumn({
        name: "monthly",
        sources: DATED_TITER_SOURCES,
        sharedType: "BIGINT",
        rule: { valueShape: "bucketed_list", valuePickerRuleType: "most_frequent", bucketGrain: "month" },
      }),
    );
    expect(c1).toEqual([
      { bucket: "2026-01-01", value: "30" },
      { bucket: "2026-02-01", value: "30" },
    ]);
  });

  it("a per-month `first` follows source position within each month", async () => {
    const lineListFirst = await _queryFieldValues(
      _twoSourceColumn({
        name: "monthly",
        sources: DATED_TITER_SOURCES,
        sharedType: "BIGINT",
        rule: { valueShape: "bucketed_list", valuePickerRuleType: "first", bucketGrain: "month" },
      }),
    );
    const labsFirst = await _queryFieldValues(
      _twoSourceColumn({
        name: "monthly",
        sources: [
          { ...DATED_TITER_SOURCES[0]!, position: 1 },
          { ...DATED_TITER_SOURCES[1]!, position: 0 },
        ],
        sharedType: "BIGINT",
        rule: { valueShape: "bucketed_list", valuePickerRuleType: "first", bucketGrain: "month" },
      }),
    );
    expect([lineListFirst[0], labsFirst[0]]).toEqual([
      [
        { bucket: "2026-01-01", value: "0" },
        { bucket: "2026-02-01", value: "30" },
      ],
      [
        { bucket: "2026-01-01", value: "30" },
        { bucket: "2026-02-01", value: "30" },
      ],
    ]);
  });
});
```

If plan 4 emits the bucket as epoch milliseconds in JSON rows, assert through `ConceptAttribute.toBucketedListEntries` instead of the literal objects.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:executed src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql`
Expected: FAIL. The new cases fail when the view is created, because the dispatch still reads `column.datasetId`, which these columns do not have.

- [ ] **Step 3: Write the stacked rows module**

Create `src/clients/qetl/QueryMediator/conceptRelation/buildStackedSourceRowsSql/buildStackedSourceRowsSql.ts`:

```ts
import { quoteSqlIdentifier } from "@avandar/utils/sql";
import {
  getEntityKeyComparisonSql,
  getRowNumberedViewName,
} from "@/clients/DuckDbClient/duckDbSqlText";
import type { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

/**
 * One source of a dataset-column field as the view reads it: one column of
 * one dataset, matched to records by that dataset's own key column. Built by
 * column resolution from a mapping row, and read by `buildStackedSourceRowsSql`.
 */
export type ConceptAttributeSource = {
  datasetId: string;
  /** The dataset column this source reads values from. */
  selectColumnName: string;
  /** The dataset's key column, which its rows are matched to records by. */
  primaryKeyColumnName: string;
  /** The date column that places rows in a period, on a per-period field only. */
  bucketColumnName: string | undefined;
  /** The source's place in the field's read order. */
  position: number;
};

/** What a field's stacked source rows are built from. */
export type StackedSourceRowsSqlOptions = Readonly<{
  sources: readonly ConceptAttributeSource[];
  /** The type every source's value is cast to; undefined for one source. */
  sharedSourceDuckDbDataType: DuckDbDataType | undefined;
  /** Set on a per-period field, which also gets each row's period. */
  bucketGrain: ConceptAttribute.BucketGrain | undefined;
  /** The outer table carrying the record keys, and its key column. */
  externalIdsTable: string;
  externalIdColumn: string;
}>;

/**
 * The DuckDB `date_trunc` part for each period. An exhaustive record, so a
 * period reaches SQL only as one of these five literals.
 */
const DATE_TRUNC_PART_BY_GRAIN: Readonly<
  Record<ConceptAttribute.BucketGrain, string>
> = {
  day: "day",
  week: "week",
  month: "month",
  quarter: "quarter",
  year: "year",
};

function _buildBucketSql(
  options: Readonly<{
    source: ConceptAttributeSource;
    bucketGrain: ConceptAttribute.BucketGrain | undefined;
  }>,
): string | undefined {
  const { source, bucketGrain } = options;
  if (bucketGrain === undefined) {
    return undefined;
  }
  if (source.bucketColumnName === undefined) {
    throw new Error(
      `Source column '${source.selectColumnName}' of a per-${bucketGrain} ` +
        `field names no date column.`,
    );
  }
  const bucketColumn = `dataset.${quoteSqlIdentifier(source.bucketColumnName)}`;
  return `CAST(date_trunc('${DATE_TRUNC_PART_BY_GRAIN[bucketGrain]}', ${bucketColumn}) AS DATE)`;
}

/**
 * One source's rows for the outer record: each non-NULL value, the source's
 * place in the read order, the row's place in its file, and for a per-period
 * field the period. A row whose value or date is NULL never leaves here.
 */
function _buildSourceRowsSql(
  options: StackedSourceRowsSqlOptions &
    Readonly<{ source: ConceptAttributeSource; sourcePosition: number }>,
): string {
  const { source, sharedSourceDuckDbDataType: sharedType } = options;
  const valueColumn = `dataset.${quoteSqlIdentifier(source.selectColumnName)}`;
  const bucketSql = _buildBucketSql({
    source,
    bucketGrain: options.bucketGrain,
  });
  const selectList = [
    `${sharedType ? `CAST(${valueColumn} AS ${sharedType})` : valueColumn} AS value`,
    `${options.sourcePosition} AS source_position`,
    "dataset.file_row_number AS row_order",
    ...(bucketSql ? [`${bucketSql} AS bucket`] : []),
  ];
  const conditions = [
    getEntityKeyComparisonSql({
      externalIdsTable: options.externalIdsTable,
      externalIdColumn: options.externalIdColumn,
      primaryKeyColumnName: source.primaryKeyColumnName,
    }),
    `${valueColumn} IS NOT NULL`,
    ...(bucketSql ? [`${bucketSql} IS NOT NULL`] : []),
  ];
  const rowsView = quoteSqlIdentifier(getRowNumberedViewName(source.datasetId));
  return `SELECT ${selectList.join(", ")}
FROM ${rowsView} dataset
WHERE ${conditions.join("\n  AND ")}`;
}

/**
 * Builds one field's rows for the outer record, read from every source and
 * stacked with `UNION ALL` in read order (ascending `position`; equal
 * positions keep the order given). Columns: `value`, `source_position` (0
 * for the first source read), `row_order` (`file_row_number`), and `bucket`
 * on a per-period field. Every value shape reduces these rows, so a source
 * is matched, filtered, and cast the same way whatever the field keeps.
 *
 * Returns a bare `SELECT ... UNION ALL ...`; the caller wraps it as
 * `(<sql>) source_rows`.
 */
export function buildStackedSourceRowsSql(
  options: StackedSourceRowsSqlOptions,
): string {
  if (options.sources.length === 0) {
    throw new Error("A dataset-column field needs at least one source.");
  }
  const orderedSources = [...options.sources].sort((left, right) => {
    return left.position - right.position;
  });
  return orderedSources
    .map((source, sourcePosition) => {
      return _buildSourceRowsSql({ ...options, source, sourcePosition });
    })
    .join("\nUNION ALL\n");
}
```

If plan 1 changed `getEntityKeyComparisonSql`'s signature, call it the way plan 1's `buildAttributeValueSql` does.

- [ ] **Step 4: Rewrite `buildAttributeValueSql` over the stacked rows**

Replace the contents of `buildAttributeValueSql.ts` with:

```ts
import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { match } from "ts-pattern";
import { buildStackedSourceRowsSql } from "@/clients/qetl/QueryMediator/conceptRelation/buildStackedSourceRowsSql/buildStackedSourceRowsSql";
import type { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { ConceptAttributeSource } from "@/clients/qetl/QueryMediator/conceptRelation/buildStackedSourceRowsSql/buildStackedSourceRowsSql";

/** The alias every rule reads a field's stacked source rows under. */
const SOURCE_ROWS_ALIAS = "source_rows";

/**
 * What one field's single value or list is read from, and the outer table of
 * record keys it is read for. The concept view passes one per dataset-backed
 * field, for example, and Sync passes its label's, so both read values the
 * same way.
 */
export type AttributeValueSqlOptions = {
  /** Every column the field reads, in read order. */
  sources: readonly ConceptAttributeSource[];
  /** The type every source's value is cast to; undefined for one source. */
  sharedSourceDuckDbDataType: DuckDbDataType | undefined;
  /** Keep one value, picked by `valuePickerRuleType`, or every value as a list. */
  valueShape: "single" | "list";
  /** How the rows reduce to one value. Required for one value; a list ignores it. */
  valuePickerRuleType: ConceptAttribute.ValuePickerRuleType | undefined;
  /** The name of the column the subquery emits. */
  outputColumnName: string;
  /** The outer table, by name or alias, holding one row per record key. */
  externalIdsTable: string;
  /** That table's record key column. */
  externalIdColumn: string;
};

/** The `SELECT` that reduces one record's stacked rows to its value. */
function _buildReducedValueSql(
  options: Readonly<{
    sourceRowsSql: string;
    valuePickerRuleType: ConceptAttribute.ValuePickerRuleType;
  }>,
): string {
  const from = `FROM (${options.sourceRowsSql}) ${SOURCE_ROWS_ALIAS}`;
  const value = `${SOURCE_ROWS_ALIAS}.value`;
  const aggregateSql = (aggregate: string): string => {
    return `SELECT ${aggregate} ${from}`;
  };
  return match(options.valuePickerRuleType)
    .with("first", () => {
      // Source position, then `file_row_number`, is a total order. Do not use
      // `row_number() OVER ()`: parallel scan order is unstable.
      return `SELECT ${value} ${from} ORDER BY ${SOURCE_ROWS_ALIAS}.source_position, ${SOURCE_ROWS_ALIAS}.row_order LIMIT 1`;
    })
    .with("most_frequent", () => {
      // The value tie-break makes a tie on COUNT(*) deterministic.
      return `SELECT ${value} ${from} GROUP BY ${value} ORDER BY COUNT(*) DESC, ${value} LIMIT 1`;
    })
    .with("sum", () => {
      return aggregateSql(`CAST(SUM(${value}) AS DOUBLE)`);
    })
    .with("avg", () => {
      return aggregateSql(`CAST(AVG(${value}) AS DOUBLE)`);
    })
    .with("count", () => {
      return aggregateSql(`COUNT(${value})`);
    })
    .with("max", () => {
      return aggregateSql(`MAX(${value})`);
    })
    .with("min", () => {
      return aggregateSql(`MIN(${value})`);
    })
    .exhaustive();
}

/**
 * Builds the correlated subquery that reads one field's single value or list
 * for the outer row's record key, aliased to `outputColumnName`.
 *
 * Every source contributes its rows, keyed by its own dataset's key column,
 * and the rule or the list runs once over all of them. Every rule reads only
 * non-NULL cells, because NULL means "no value". Use it wherever a field's
 * value is read from datasets, for example a column of a concept's view or
 * the name Sync stages for each record.
 */
export function buildAttributeValueSql(
  options: Readonly<AttributeValueSqlOptions>,
): string {
  const sourceRowsSql = buildStackedSourceRowsSql({
    sources: options.sources,
    sharedSourceDuckDbDataType: options.sharedSourceDuckDbDataType,
    bucketGrain: undefined,
    externalIdsTable: options.externalIdsTable,
    externalIdColumn: options.externalIdColumn,
  });
  const body = match(options.valueShape)
    .with("list", () => {
      // `list()` over no rows is NULL. A record with no values gets an empty
      // list, which reads as "none" rather than "unknown".
      return `SELECT COALESCE(list(${SOURCE_ROWS_ALIAS}.value ORDER BY ${SOURCE_ROWS_ALIAS}.source_position, ${SOURCE_ROWS_ALIAS}.row_order), []) FROM (${sourceRowsSql}) ${SOURCE_ROWS_ALIAS}`;
    })
    .with("single", () => {
      const { valuePickerRuleType } = options;
      // A guessed rule would answer with a value nobody chose.
      if (valuePickerRuleType === undefined) {
        throw new Error(
          `Column '${options.outputColumnName}' keeps one value, but names no value rule.`,
        );
      }
      return _buildReducedValueSql({ sourceRowsSql, valuePickerRuleType });
    })
    .exhaustive();
  return `(${body}) AS ${quoteSqlIdentifier(options.outputColumnName)}`;
}
```

If plan 4 typed `valueShape` here differently (for example `Exclude<ConceptAttribute.ValueShape, "bucketed_list">`), keep plan 4's type.

- [ ] **Step 5: Point the per-period builder at the stacked rows**

Plan 4's `buildBucketedListValueSql` runs three steps: `_buildSourceRowsSql`, `_buildPerBucketValuesSql`, and the list wrapper. Only the first changes. In `buildBucketedListValueSql.ts`:

1. Replace `type RuleType = DatasetColumnMapping["valuePickerRuleType"];` (the mapping model no longer has a rule) with:

```ts
type RuleType = ConceptAttribute.ValuePickerRuleType;
```

   and remove the `DatasetColumnMapping` import.
2. Replace `BucketedListValueSqlOptions` with:

```ts
/** Everything one per-period field's value subquery reads. */
export type BucketedListValueSqlOptions = Readonly<{
  /** Every column the field reads, each with its date column, in read order. */
  sources: readonly ConceptAttributeSource[];
  /** The type every source's value is cast to; undefined for one source. */
  sharedSourceDuckDbDataType: DuckDbDataType | undefined;
  bucketGrain: ConceptAttribute.BucketGrain;
  ruleType: RuleType;
  /** The outer table carrying the record keys, and its key column. */
  externalIdsTable: string;
  externalIdColumn: string;
}>;
```

   importing `buildStackedSourceRowsSql` and the `ConceptAttributeSource` type from `@/clients/qetl/QueryMediator/conceptRelation/buildStackedSourceRowsSql/buildStackedSourceRowsSql`.
3. Delete `DATE_TRUNC_PART_BY_GRAIN` and `_buildSourceRowsSql`. The stacked module owns both, and the NULL rule with them. Remove the imports only they used (`getEntityKeyComparisonSql`, `getRowNumberedViewName`; keep `quoteSqlIdentifier` if anything else uses it).
4. In `AGGREGATE_SQL_BY_RULE`, change `first` to:

```ts
  // The earliest source with a value in the period wins, and within a
  // source the earliest row in its file.
  first:
    "first(source_rows.value ORDER BY source_rows.source_position, source_rows.row_order)",
```

5. In `buildBucketedListValueSql`, replace `sourceRowsSql: _buildSourceRowsSql(options),` with:

```ts
    sourceRowsSql: buildStackedSourceRowsSql({
      sources: options.sources,
      sharedSourceDuckDbDataType: options.sharedSourceDuckDbDataType,
      bucketGrain: options.bucketGrain,
      externalIdsTable: options.externalIdsTable,
      externalIdColumn: options.externalIdColumn,
    }),
```

6. In `_buildPerBucketValuesSql`'s docstring, say it reads every source's rows; in `buildBucketedListValueSql`'s, change "one per period that has a non-NULL value" to "one per period in which any source has a non-NULL value".

`_buildPerBucketValuesSql`, the list wrapper, and `buildBucketedListTypeSql` are unchanged.

- [ ] **Step 6: Give the column arm its sources, and dispatch on them**

In `buildConceptViewSql.ts`:

1. Import `import type { ConceptAttributeSource } from "@/clients/qetl/QueryMediator/conceptRelation/buildStackedSourceRowsSql/buildStackedSourceRowsSql";`.
2. In the `dataset_column` arm of `ConceptAttributeColumn`, delete `selectColumnName`, `datasetId` and `primaryKeyColumnName` (and their comments), and add:

```ts
      /** Every column the field reads, in read order. Never empty. */
      sources: ConceptAttributeSource[];
      /**
       * The DuckDB type every source's value is cast to so the stacked rows
       * share one type. Undefined for a field with one source, which reads
       * its column as stored.
       */
      sharedSourceDuckDbDataType: DuckDbDataType | undefined;
```

   Keep `attributeId`, `attributeName`, and the intersection with `ConceptAttributeValueRule`.
3. In plan 4's `bucketed_list` arm of `ConceptAttributeValueRule`, delete `bucketColumnName` and its comment; each source carries its own date column now. The arm keeps `valuePickerRuleType` and `bucketGrain`:

```ts
  | {
      valueShape: "bucketed_list";
      valuePickerRuleType: ValuePickerRuleType;
      bucketGrain: ConceptAttribute.BucketGrain;
    };
```

   Change `ValuePickerRuleType`'s import in this file to `ConceptAttribute.ValuePickerRuleType` if it came from `DatasetColumnMapping.types`.
4. Replace `_buildColumnSelector` (plans 1, 3 and 4's) with:

```ts
type DatasetColumnAttributeColumn = Extract<
  ConceptAttributeColumn,
  { kind: "dataset_column" }
>;

function _buildColumnSelector(column: ConceptAttributeColumn): string {
  if (column.kind === "unmapped") {
    return _buildUnmappedSelector(column);
  }
  return _buildDatasetColumnSelector(column);
}

/**
 * One dataset-backed field's subquery over its stacked sources. Single
 * values and lists go through `buildAttributeValueSql`, the function Sync
 * reads names with, so the view agrees with Sync on every value; a
 * per-period field goes through `buildBucketedListValueSql`.
 */
function _buildDatasetColumnSelector(
  column: DatasetColumnAttributeColumn,
): string {
  const sourceOptions = {
    sources: column.sources,
    sharedSourceDuckDbDataType: column.sharedSourceDuckDbDataType,
    externalIdsTable: SPINE_ALIAS,
    externalIdColumn: EXTERNAL_ID_COLUMN,
  };
  return match(column)
    .with({ valueShape: "single" }, (singleColumn) => {
      return buildAttributeValueSql({
        ...sourceOptions,
        valueShape: "single",
        valuePickerRuleType: singleColumn.valuePickerRuleType,
        outputColumnName: column.attributeName,
      });
    })
    .with({ valueShape: "list" }, () => {
      return buildAttributeValueSql({
        ...sourceOptions,
        valueShape: "list",
        valuePickerRuleType: undefined,
        outputColumnName: column.attributeName,
      });
    })
    .with({ valueShape: "bucketed_list" }, (bucketedColumn) => {
      return `${buildBucketedListValueSql({
        ...sourceOptions,
        bucketGrain: bucketedColumn.bucketGrain,
        ruleType: bucketedColumn.valuePickerRuleType,
      })} AS ${quoteSqlIdentifier(column.attributeName)}`;
    })
    .exhaustive();
}
```

   `_buildUnmappedSelector` (with plan 4's `bucketed_list` arm) is unchanged.

- [ ] **Step 7: Move every one-source fixture to the new arm**

A field with one source must return exactly what it returned before, so no expected value changes in this step: only fixture shapes do.

1. In `buildConceptViewSql.executed.test.ts`, every `dataset_column` fixture plans 1 to 4 wrote moves `datasetId`, `selectColumnName` and `primaryKeyColumnName` (and, on a per-period fixture, `bucketColumnName`) into one source, and gains `sharedSourceDuckDbDataType: undefined`. For example, `AGE` becomes:

```ts
const AGE: ConceptAttributeColumn = {
  kind: "dataset_column",
  attributeId: "attr-age" as ConceptAttribute.Id,
  attributeName: "age",
  sources: [
    {
      datasetId: DATASET_A,
      selectColumnName: "age_years",
      primaryKeyColumnName: "person_id",
      bucketColumnName: undefined,
      position: 0,
    },
  ],
  sharedSourceDuckDbDataType: undefined,
  valueShape: "single",
  valuePickerRuleType: "first",
};
```

   A per-period fixture keeps `valueShape: "bucketed_list"`, `valuePickerRuleType` and `bucketGrain` at the top level, and its source carries the date column name.

2. In `buildAttributeValueSql.executed.test.ts` (plan 1's), cases override `BASE_OPTIONS` with partial options, some of them a source column (`selectColumnName: "dose"`, for example). Keep every case unchanged by splitting the source out of the base and merging source overrides into it:

```ts
const BASE_SOURCE: ConceptAttributeSource = {
  datasetId: DATASET_ID,
  selectColumnName: "region",
  primaryKeyColumnName: 'case "id"',
  bucketColumnName: undefined,
  position: 0,
};

/** Every option a case does not override: `first` over `region`. */
const BASE_OPTIONS: AttributeValueSqlOptions = {
  sources: [BASE_SOURCE],
  sharedSourceDuckDbDataType: undefined,
  valuePickerRuleType: "first",
  valueShape: "single",
  outputColumnName: "value",
  externalIdsTable: SPINE,
  externalIdColumn: "external_id",
};

/** What a case overrides: the field's options, or its one source's columns. */
type ValueOverrides = Partial<Omit<AttributeValueSqlOptions, "sources">> &
  Partial<Pick<ConceptAttributeSource, "selectColumnName" | "primaryKeyColumnName">>;

function _withOverrides(overrides: Readonly<ValueOverrides>): AttributeValueSqlOptions {
  const {
    selectColumnName = BASE_SOURCE.selectColumnName,
    primaryKeyColumnName = BASE_SOURCE.primaryKeyColumnName,
    ...fieldOverrides
  } = overrides;
  return {
    ...BASE_OPTIONS,
    ...fieldOverrides,
    sources: [{ ...BASE_SOURCE, selectColumnName, primaryKeyColumnName }],
  };
}
```

   `_readRecords` takes `Record<string, Readonly<ValueOverrides>>` and calls `buildAttributeValueSql({ ..._withOverrides(overrides), outputColumnName })`.

3. In `buildBucketedListValueSql.executed.test.ts` (plan 4's), do the same with `SCORE_PER_MONTH`:

```ts
const SCORE_SOURCE: ConceptAttributeSource = {
  datasetId: VISITS,
  selectColumnName: "score",
  primaryKeyColumnName: "person_id",
  // The space proves the date column is quoted.
  bucketColumnName: "Visit date",
  position: 0,
};

/** Monthly `first` of the score; each test overrides what it needs. */
const SCORE_PER_MONTH: BucketedListValueSqlOptions = {
  sources: [SCORE_SOURCE],
  sharedSourceDuckDbDataType: undefined,
  bucketGrain: "month",
  ruleType: "first",
  externalIdsTable: "individuals",
  externalIdColumn: "external_id",
};

/** What a test overrides: the field's options, or its one source's columns. */
type PeriodOverrides = Partial<Omit<BucketedListValueSqlOptions, "sources">> &
  Partial<Omit<ConceptAttributeSource, "position">>;

function _withOverrides(
  overrides: Readonly<PeriodOverrides>,
): BucketedListValueSqlOptions {
  const {
    datasetId = SCORE_SOURCE.datasetId,
    selectColumnName = SCORE_SOURCE.selectColumnName,
    primaryKeyColumnName = SCORE_SOURCE.primaryKeyColumnName,
    bucketColumnName = SCORE_SOURCE.bucketColumnName,
    ...fieldOverrides
  } = overrides;
  return {
    ...SCORE_PER_MONTH,
    ...fieldOverrides,
    sources: [
      { datasetId, selectColumnName, primaryKeyColumnName, bucketColumnName, position: 0 },
    ],
  };
}
```

   `_readPeriods` and `_describeFields` take `PeriodOverrides` in place of `Partial<BucketedListValueSqlOptions>` and call `buildBucketedListValueSql(_withOverrides(overrides))`. Every test body stays as plan 4 wrote it.

- [ ] **Step 8: Run the three suites and watch them pass**

Run: `pnpm test:executed src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql src/clients/qetl/QueryMediator/conceptRelation/buildBucketedListValueSql`
Expected: PASS, the 12 new two-source cases and every earlier case unchanged.

- [ ] **Step 9: Commit**

```bash
git add src/clients/qetl/QueryMediator/conceptRelation/buildStackedSourceRowsSql src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql src/clients/qetl/QueryMediator/conceptRelation/buildBucketedListValueSql src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql
git commit -m "feat(joined-cases): read a field by stacking its sources before its rule runs"
```

---

## Task 7: Column resolution builds every source

**Files:**
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata.ts`
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/__tests__/conceptAttributeColumns.integration.executed.test.ts`

Spec §6.5 and §6.6. Plans 2, 3 and 4 left three per-mapping helpers in this file: `_assertRuleAllowedForColumn` (plan 2), `_getValueRule` (plan 3, which plan 4 gave a `metadata` option and a `bucketed_list` arm), and `_resolveBucket` (plan 4, returning `{ bucketGrain, bucketColumnName }`). This task reads the rule and the period from the field, narrows `_resolveBucket` to `_resolveBucketColumnName`, called once per source with every one of plan 4's refusals, and checks the rule against every source.

- [ ] **Step 1: Update the fixture helpers**

In `conceptAttributeColumns.integration.executed.test.ts`:

1. In `_attribute`, add `valuePickerRuleType: "first",` before `...overrides` (plan 4 already added `bucketGrain: undefined`).
2. In `_mapping`, delete the `ruleType` option and its use; add `position?: number`, put `position: options.position ?? 0,` on the mapping; and make the mapping id `` `map-${options.attributeName}-${options.columnName}` `` so a field can have two. Keep plan 2's `columnDataType` (default `bigint`) and plan 4's `bucketColumnId`.
3. Wherever a case passed `ruleType` to `_mapping`, pass it to that field's `_attribute(...)` as `valuePickerRuleType` instead (for example plan 2's `total` gets `valuePickerRuleType: "sum"`, and plan 4's `AGE_PER_MONTH` gets `valuePickerRuleType: "max"`). A list field (`TAGS`) gets `valuePickerRuleType: undefined`. Plan 2's "reads a list field whatever rule its mapping stores" no longer has a mapping rule to store; delete that case (the database refuses a list with a rule).

- [ ] **Step 2: Write the failing cases**

Append to the same file:

```ts
const LINE_LIST = "dddddddd-7777-4777-8777-dddddddddddd" as Dataset.Id;
const LABS = "eeeeeeee-8888-4888-8888-eeeeeeeeeeee" as Dataset.Id;
const UNKEYED = "ffffffff-9999-4999-8999-ffffffffffff" as Dataset.Id;
const TWO_SOURCE_VIEW = "concept_99999999-1111-4111-8111-999999999999";
const TWO_SOURCE_SPINE = `${TWO_SOURCE_VIEW}__individuals`;

/**
 * A line list keyed by text `case_ref` and a lab sheet keyed by BIGINT
 * `patient_no`, matching records 7 and 8. Record 7 has negative in the line
 * list and positive twice in the labs; record 8 has a NULL in the line list.
 */
async function _seedTwoSourceWorld(
  connection: DuckDBConnection,
): Promise<void> {
  const lineListPath = join(tmpdir(), "ava-columns-line-list.parquet");
  const labsPath = join(tmpdir(), "ava-columns-labs.parquet");
  await connection.run(`
    COPY (
      SELECT * FROM (VALUES ('7', 'negative'), ('8', NULL))
      AS t(case_ref, result)
    ) TO '${lineListPath}' (FORMAT parquet)
  `);
  await connection.run(`
    COPY (
      SELECT * FROM (VALUES
        (7::BIGINT, 'positive'), (7::BIGINT, 'positive'), (8::BIGINT, 'positive')
      ) AS t(patient_no, lab_result)
    ) TO '${labsPath}' (FORMAT parquet)
  `);
  await connection.run(`
    CREATE VIEW "${getRowNumberedViewName(LINE_LIST)}" AS
      SELECT * FROM read_parquet('${lineListPath}', file_row_number = true);
    CREATE VIEW "${getRowNumberedViewName(LABS)}" AS
      SELECT * FROM read_parquet('${labsPath}', file_row_number = true);
    CREATE TABLE "${TWO_SOURCE_SPINE}" AS
      SELECT * FROM (VALUES ('7', 'Active'), ('8', 'Active'), ('9', 'Active'))
      AS t(external_id, status);
  `);
}

/** Builds the view from metadata and returns its rows and column types. */
async function _queryTwoSourceView(
  metadata: ConceptRelationMetadata,
): Promise<{
  rows: Array<Record<string, unknown>>;
  typesByColumn: Record<string, string>;
}> {
  return await withDuckDb(async (connection) => {
    await _seedTwoSourceWorld(connection);
    const { attributeColumns } =
      makeConceptAttributeColumnsFromMetadata(metadata);
    await connection.run(
      buildConceptViewSql({
        viewName: TWO_SOURCE_VIEW,
        spineTableName: TWO_SOURCE_SPINE,
        attributeColumns,
      }),
    );
    const rows = (
      await connection.runAndReadAll(
        `SELECT * FROM "${TWO_SOURCE_VIEW}" ORDER BY external_id`,
      )
    ).getRowObjectsJson();
    const types = (
      await connection.runAndReadAll(`DESCRIBE "${TWO_SOURCE_VIEW}"`)
    ).getRowObjectsJson();
    return {
      rows,
      typesByColumn: Object.fromEntries(
        types.map((row) => {
          return [String(row.column_name), String(row.column_type)];
        }),
      ),
    };
  });
}

const CASE_REF_SOURCE = _mapping({
  attributeName: "Case ref",
  datasetId: LINE_LIST,
  columnName: "case_ref",
  columnDataType: "varchar",
});
const PATIENT_NO_SOURCE = _mapping({
  attributeName: "Case ref",
  datasetId: LABS,
  columnName: "patient_no",
  columnDataType: "bigint",
  position: 1,
});
const RESULT_LINE_LIST_SOURCE = _mapping({
  attributeName: "Result",
  datasetId: LINE_LIST,
  columnName: "result",
  columnDataType: "varchar",
});
const RESULT_LABS_SOURCE = _mapping({
  attributeName: "Result",
  datasetId: LABS,
  columnName: "lab_result",
  columnDataType: "varchar",
  position: 1,
});
const CASE_REF = _attribute({ name: "Case ref", isIdentifier: true });
const RESULT = _attribute({
  name: "Result",
  dataType: "varchar",
  valuePickerRuleType: "most_frequent",
});

describe("makeConceptAttributeColumnsFromMetadata with several sources", () => {
  it("reads a field from two datasets, each matched by its own key column", async () => {
    const { rows } = await _queryTwoSourceView(
      _metadata({
        attributes: [CASE_REF, RESULT],
        mappings: [
          CASE_REF_SOURCE,
          PATIENT_NO_SOURCE,
          RESULT_LINE_LIST_SOURCE,
          RESULT_LABS_SOURCE,
        ],
      }),
    );
    expect(
      rows.map((row) => {
        return row.Result;
      }),
    ).toEqual(["positive", "positive", null]);
  });

  it("reads one ID field over a text key and a BIGINT key as text", async () => {
    const { rows, typesByColumn } = await _queryTwoSourceView(
      _metadata({
        attributes: [CASE_REF],
        mappings: [CASE_REF_SOURCE, PATIENT_NO_SOURCE],
      }),
    );
    expect({
      values: rows.map((row) => {
        return row["Case ref"];
      }),
      type: typesByColumn["Case ref"],
    }).toEqual({ values: ["7", "8", null], type: "VARCHAR" });
  });

  it("reads the same values when each dataset has its own identifier field", async () => {
    const { rows } = await _queryTwoSourceView(
      _metadata({
        attributes: [
          CASE_REF,
          _attribute({ name: "Patient no", isIdentifier: true }),
          RESULT,
        ],
        mappings: [
          CASE_REF_SOURCE,
          _mapping({
            attributeName: "Patient no",
            datasetId: LABS,
            columnName: "patient_no",
            columnDataType: "bigint",
          }),
          RESULT_LINE_LIST_SOURCE,
          RESULT_LABS_SOURCE,
        ],
      }),
    );
    expect(
      rows.map((row) => {
        return row.Result;
      }),
    ).toEqual(["positive", "positive", null]);
  });

  it("refuses a field whose sources have different types", () => {
    expect(() => {
      makeConceptAttributeColumnsFromMetadata(
        _metadata({
          attributes: [CASE_REF, _attribute({ name: "Mixed" })],
          mappings: [
            CASE_REF_SOURCE,
            PATIENT_NO_SOURCE,
            _mapping({
              attributeName: "Mixed",
              datasetId: LINE_LIST,
              columnName: "result",
              columnDataType: "varchar",
            }),
            _mapping({
              attributeName: "Mixed",
              datasetId: LABS,
              columnName: "patient_no",
              columnDataType: "bigint",
              position: 1,
            }),
          ],
        }),
      );
    }).toThrow(/different types \(bigint, varchar\)/);
  });

  it("refuses a second source in a dataset with no key", () => {
    expect(() => {
      makeConceptAttributeColumnsFromMetadata(
        _metadata({
          attributes: [CASE_REF, RESULT],
          mappings: [
            CASE_REF_SOURCE,
            RESULT_LINE_LIST_SOURCE,
            _mapping({
              attributeName: "Result",
              datasetId: UNKEYED,
              columnName: "result",
              columnDataType: "varchar",
              position: 1,
            }),
          ],
        }),
      );
    }).toThrow(/has no identifier attribute mapped into it/);
  });

  // Plan 4's fixtures: `AGE_PER_MONTH` (rule `max`), `SEEN_ON`, and
  // `_agePerMonthMapping`, whose source in dataset A groups by `seen_on`.
  it("refuses a per-month field whose second source names no date column", () => {
    expect(() => {
      makeConceptAttributeColumnsFromMetadata(
        _metadataWithColumns({
          attributes: [PERSON_ID, AGE_PER_MONTH],
          mappings: [
            PERSON_ID_MAPPING,
            _agePerMonthMapping(SEEN_ON),
            _mapping({
              attributeName: "age per month",
              datasetId: DATASET_A,
              columnName: "person_id",
              position: 1,
            }),
          ],
          extraColumns: [SEEN_ON],
        }),
      );
    }).toThrow(/source 'person_id' names no date column/);
  });

  it("refuses a rule the sources' shared type does not allow, naming every column", () => {
    expect(() => {
      makeConceptAttributeColumnsFromMetadata(
        _metadata({
          attributes: [
            CASE_REF,
            _attribute({ name: "Result", valuePickerRuleType: "sum" }),
          ],
          mappings: [
            CASE_REF_SOURCE,
            PATIENT_NO_SOURCE,
            RESULT_LINE_LIST_SOURCE,
            RESULT_LABS_SOURCE,
          ],
        }),
      );
    }).toThrow(
      /applies 'sum' to dataset columns 'result', 'lab_result', whose type 'varchar' does not allow it/,
    );
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `pnpm test:executed src/clients/qetl/QueryMediator/conceptRelation/__tests__/conceptAttributeColumns`
Expected: FAIL. Only each field's first mapping is read today, so the first case returns `negative` for record 7, and the four refusals throw nothing or a different message (the per-month one reads only its first source, which has a date column).

- [ ] **Step 4: Rewrite the per-field helpers**

In `makeConceptAttributeColumnsFromMetadata.ts`:

1. Add the imports (keep the file's others):

```ts
import { prop } from "@avandar/utils";
import { AttributeSources } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/AttributeSources/AttributeSources";
import { removeDuplicates } from "@/lib/utils/arrays/removeDuplicates/removeDuplicates";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { ConceptAttributeSource } from "@/clients/qetl/QueryMediator/conceptRelation/buildStackedSourceRowsSql/buildStackedSourceRowsSql";
```

2. Replace `BuiltAttributeColumn` with:

```ts
/** One attribute's column, and every dataset it reads. */
type BuiltAttributeColumn = {
  column: ConceptAttributeColumn;
  contributingDatasetIds: Dataset.Id[];
};

/** One source of a field, with the dataset column its values come from. */
type BuiltSource = {
  source: ConceptAttributeSource;
  datasetId: Dataset.Id;
  valueColumn: DatasetColumn.T;
};
```

3. Delete `_isDatasetColumnMapping` and `_getDatasetColumnMappingsForAttribute`. In `_getPrimaryKeyColumnNameByDatasetId`, call `AttributeSources.getSourceMappingsFromMappings({ attributeId: attribute.id, mappings: metadata.mappings })` in their place, and end its docstring with:

```ts
 * A dataset reached by two identifier sources is resolved by attribute order,
 * then by each attribute's read order, not by insertion order, so two runs
 * pick the same key column. One ID field with a source per dataset fills the
 * map exactly as one identifier field per dataset does.
```

4. Replace plan 3's `_getValueRule` with:

```ts
/**
 * How a dataset-column field's rows become its value, from its value shape
 * and its own rule. A list keeps every value. A single or per-period field
 * needs a rule, and one without is a broken ontology: guessing a rule would
 * answer with a value nobody chose, so it throws, naming the field.
 */
function _getValueRule(
  attribute: Readonly<ConceptAttribute.T>,
): ConceptAttributeValueRule {
  const _getRequiredRuleType = (): ConceptAttribute.ValuePickerRuleType => {
    if (attribute.valuePickerRuleType === undefined) {
      throw new Error(
        `Concept attribute '${attribute.name}' (${attribute.id}) reduces ` +
          `its rows, but names no value rule.`,
      );
    }
    return attribute.valuePickerRuleType;
  };
  return match(ConceptAttribute.getValueShape(attribute))
    .with("single", (): ConceptAttributeValueRule => {
      return { valueShape: "single", valuePickerRuleType: _getRequiredRuleType() };
    })
    .with("list", (): ConceptAttributeValueRule => {
      return { valueShape: "list" };
    })
    .with("bucketed_list", (): ConceptAttributeValueRule => {
      // `getValueShape` is per-period only for a field with a period; this
      // restates that for the compiler.
      if (attribute.bucketGrain === undefined) {
        throw new Error(
          `Concept attribute '${attribute.name}' (${attribute.id}) has no period.`,
        );
      }
      return {
        valueShape: "bucketed_list",
        valuePickerRuleType: _getRequiredRuleType(),
        bucketGrain: attribute.bucketGrain,
      };
    })
    .exhaustive();
}
```

   It takes no mapping and no metadata any more: the date column is each source's (item 6). Remove the `mapping` and `metadata` arguments at its call site. (If plans 3 or 4 test the old messages, `keeps one value, but its mapping names no value rule` or `keeps one value per period, but its mapping names no value rule`, change that test's regex to `names no value rule`.)

5. Replace plan 2's `_assertRuleAllowedForColumn` with:

```ts
/**
 * Throws when a single or per-period field applies a rule its sources'
 * shared type does not allow, which happens only when a column's type is
 * edited after the field was made. DuckDB would otherwise refuse the whole
 * view (`sum(VARCHAR)` does not bind) or answer with a value the rule table
 * calls meaningless, and neither names the field. A list applies no rule.
 */
function _assertRuleAllowedForSources(
  options: Readonly<{
    attribute: ConceptAttribute.T;
    valueRule: ConceptAttributeValueRule;
    valueColumns: readonly DatasetColumn.T[];
    sharedAvaDataType: AvaDataType.T;
  }>,
): void {
  const { attribute, valueRule, sharedAvaDataType } = options;
  if (
    valueRule.valueShape === "list" ||
    ValuePickerRule.isAllowedForColumnType({
      ruleType: valueRule.valuePickerRuleType,
      columnDataType: sharedAvaDataType,
    })
  ) {
    return;
  }
  const columnNames = options.valueColumns
    .map((column) => {
      return `'${column.name}'`;
    })
    .join(", ");
  const columnNoun =
    options.valueColumns.length === 1 ? "dataset column" : "dataset columns";
  throw new Error(
    `Concept attribute '${attribute.name}' (${attribute.id}) applies ` +
      `'${valueRule.valuePickerRuleType}' to ${columnNoun} ${columnNames}, ` +
      `whose type '${sharedAvaDataType}' does not allow it.`,
  );
}
```

6. Replace plan 4's `_resolveBucket` with `_resolveBucketColumnName`, which keeps each of its refusals (and plan 4's "has no period" refusal of a date column on any other field, which `_getValueRule` no longer sees a mapping for) but answers for one source:

```ts
/**
 * The name of the date column one source of a field groups its rows by:
 * the column on a per-period field's source, and `undefined` on any other
 * field's.
 *
 * Fails closed, like the value column: a period with no readable date column
 * would answer every record with an empty list, which reads as "no data" for
 * data that may well exist, and a date column on a field without a period
 * means the ontology is inconsistent, which ignoring it would hide.
 */
function _resolveBucketColumnName(
  options: Readonly<{
    attribute: ConceptAttribute.T;
    mapping: DatasetColumnMapping;
    metadata: ConceptRelationMetadata;
  }>,
): string | undefined {
  const { attribute, mapping, metadata } = options;
  const field = `Concept attribute '${attribute.name}' (${attribute.id})`;
  if (attribute.bucketGrain === undefined) {
    if (mapping.bucketColumnId !== undefined) {
      throw new Error(
        `${field} has no period, but its source ` +
          `'${mapping.datasetColumnId}' names date column ` +
          `'${mapping.bucketColumnId}'.`,
      );
    }
    return undefined;
  }
  if (mapping.bucketColumnId === undefined) {
    const valueColumn = metadata.datasetColumnsById[mapping.datasetColumnId];
    throw new Error(
      `${field} keeps one value per ${attribute.bucketGrain}, but its source ` +
        `'${valueColumn?.name ?? mapping.datasetColumnId}' names no date column.`,
    );
  }
  const bucketColumn = metadata.datasetColumnsById[mapping.bucketColumnId];
  if (!bucketColumn) {
    throw new Error(
      `${field} groups its rows by date column '${mapping.bucketColumnId}', ` +
        `which does not exist.`,
    );
  }
  if (bucketColumn.datasetId !== mapping.datasetId) {
    throw new Error(
      `${field} groups its rows by column '${bucketColumn.name}' of dataset ` +
        `'${bucketColumn.datasetId}', not of the dataset it reads ` +
        `('${mapping.datasetId}').`,
    );
  }
  if (!ConceptAttribute.isBucketDateColumnType(bucketColumn.dataType)) {
    throw new Error(
      `${field} groups its rows by column '${bucketColumn.name}', which is ` +
        `'${bucketColumn.dataType}', not a date or timestamp.`,
    );
  }
  return bucketColumn.name;
}
```

   Every message keeps the words plan 4's tests match (`names no date column`, `does not exist`, `not of the dataset it reads`, `not a date or timestamp`, `has no period`), so those tests pass unchanged.

7. Replace `_buildAttributeColumn` (and its docstring) with these functions:

```ts
function _getDatasetColumn(
  options: Readonly<{
    attribute: ConceptAttribute.T;
    datasetColumnId: DatasetColumn.Id;
    metadata: ConceptRelationMetadata;
  }>,
): DatasetColumn.T {
  const datasetColumn =
    options.metadata.datasetColumnsById[options.datasetColumnId];
  // Fail closed rather than degrading to a NULL column. A mapping pointing at
  // a column that no longer exists is a broken ontology, and answering the
  // query with NULLs would report "no value" for data that may well exist.
  if (!datasetColumn) {
    throw new Error(
      `Concept attribute '${options.attribute.name}' (${options.attribute.id}) ` +
        `is mapped to dataset column '${options.datasetColumnId}', which ` +
        `does not exist.`,
    );
  }
  return datasetColumn;
}

/** Resolves one mapping row of a field to the source the view reads. */
function _buildSource(
  options: Readonly<{
    attribute: ConceptAttribute.T;
    mapping: DatasetColumnMapping;
    metadata: ConceptRelationMetadata;
    primaryKeyColumnNameByDatasetId: PrimaryKeyColumnNameByDatasetId;
  }>,
): BuiltSource {
  const { attribute, mapping, metadata } = options;
  const valueColumn = _getDatasetColumn({
    attribute,
    datasetColumnId: mapping.datasetColumnId,
    metadata,
  });
  const primaryKeyColumnName =
    options.primaryKeyColumnNameByDatasetId[mapping.datasetId];
  if (primaryKeyColumnName === undefined) {
    throw new Error(
      `Concept attribute '${attribute.name}' (${attribute.id}) reads dataset ` +
        `'${mapping.datasetId}', which has no identifier attribute mapped ` +
        `into it, so its rows cannot be matched to an individual.`,
    );
  }
  return {
    source: {
      datasetId: mapping.datasetId,
      selectColumnName: valueColumn.name,
      primaryKeyColumnName,
      bucketColumnName: _resolveBucketColumnName({
        attribute,
        mapping,
        metadata,
      }),
      position: mapping.position,
    },
    datasetId: mapping.datasetId,
    valueColumn,
  };
}

/**
 * The one Ava type a field's sources stack as. Any other field's sources
 * must share a type. An identifier's sources are keys, which are compared as
 * text, so they may differ and are then read as `varchar`.
 */
function _getSharedSourceAvaDataType(
  options: Readonly<{
    attribute: ConceptAttribute.T;
    valueColumns: readonly DatasetColumn.T[];
  }>,
): AvaDataType.T {
  const { attribute } = options;
  const dataTypes = removeDuplicates(options.valueColumns.map(prop("dataType")));
  const [onlyDataType] = dataTypes;
  if (dataTypes.length === 1 && onlyDataType !== undefined) {
    return onlyDataType;
  }
  if (attribute.isIdentifier) {
    return "varchar";
  }
  throw new Error(
    `Concept attribute '${attribute.name}' (${attribute.id}) reads columns ` +
      `of different types (${[...dataTypes].sort().join(", ")}). Every ` +
      `source of a field must have the same type.`,
  );
}

/**
 * Turns one attribute into the column the concept's view emits for it.
 *
 * A `manual_entry` attribute, and an attribute with no mapping row at all,
 * become a typed NULL (or empty list) rather than an error: the relation's
 * schema stays complete, and it is honest, because we hold no value for it.
 */
function _buildAttributeColumn(
  options: Readonly<{
    attribute: ConceptAttribute.T;
    metadata: ConceptRelationMetadata;
    primaryKeyColumnNameByDatasetId: PrimaryKeyColumnNameByDatasetId;
  }>,
): BuiltAttributeColumn {
  const { attribute, metadata } = options;
  const mappings = AttributeSources.getSourceMappingsFromMappings({
    attributeId: attribute.id,
    mappings: metadata.mappings,
  });
  if (attribute.mappingType === "manual_entry" || mappings.length === 0) {
    return { column: _buildUnmappedColumn(attribute), contributingDatasetIds: [] };
  }
  const builtSources = mappings.map((mapping) => {
    return _buildSource({
      attribute,
      mapping,
      metadata,
      primaryKeyColumnNameByDatasetId: options.primaryKeyColumnNameByDatasetId,
    });
  });
  const valueColumns = builtSources.map(prop("valueColumn"));
  const sharedAvaDataType = _getSharedSourceAvaDataType({ attribute, valueColumns });
  const valueRule = _getValueRule(attribute);
  _assertRuleAllowedForSources({ attribute, valueRule, valueColumns, sharedAvaDataType });
  return {
    column: {
      kind: "dataset_column",
      attributeId: attribute.id,
      attributeName: attribute.name,
      sources: builtSources.map(prop("source")),
      // One source reads its column as stored, so an existing field's type
      // never changes; several are cast so `UNION ALL` has one type.
      sharedSourceDuckDbDataType:
        builtSources.length > 1
          ? DuckDbDataTypeUtils.fromDatasetColumnType(sharedAvaDataType)
          : undefined,
      // The rule, and on a per-period field its period, from the field.
      ...valueRule,
    },
    contributingDatasetIds: builtSources.map(prop("datasetId")),
  };
}
```

8. In `makeConceptAttributeColumnsFromMetadata`, replace the destructuring of `contributingDatasetId` and the `if (contributingDatasetId !== undefined) { ... }` block with:

```ts
    const { column, contributingDatasetIds: columnDatasetIds } =
      _buildAttributeColumn({
        attribute,
        metadata,
        primaryKeyColumnNameByDatasetId,
      });
    columnDatasetIds.forEach((datasetId) => {
      contributingDatasetIds.add(datasetId);
    });
```

and end its docstring with `One column per attribute, never one per mapping: a field with several sources is one column computed over all of them.`

Remove imports that become unused. Run `pnpm format`.

- [ ] **Step 5: Run the suite and watch it pass**

Run: `pnpm test:executed src/clients/qetl/QueryMediator/conceptRelation`
Expected: PASS, including the seven new cases and plans 1 to 4's cases: plan 2's "refuses a sum over a text column" still matches its one-column message, and plan 4's per-month refusals (`names no date column`, `does not exist`, `not of the dataset it reads`, `not a date or timestamp`, `has no period`) match `_resolveBucketColumnName`'s messages.

- [ ] **Step 6: Commit**

```bash
git add src/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata.ts src/clients/qetl/QueryMediator/conceptRelation/__tests__/conceptAttributeColumns.integration.executed.test.ts
git commit -m "feat(joined-cases): resolve every source of a field and check its rule against them all"
```

---

## Task 8: Needed columns, planning's date columns, and contributors cover every source

Plan 4 names the two places a date column must be fetched and loaded (its Task 10). With several sources each must cover every source's. Planning's fetch (`_getMappedDatasetColumns`) already asks for every mapping row's value and date column, and a field has one row per source, so it needs no code change, only a test that pins it. The needed-columns list reads one `bucketColumnName` per column today, and changes.

**Files:**
- Modify: `src/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery.ts:78-93`
- Modify: `src/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery.test.ts`
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql.test.ts`
- Modify: `src/clients/qetl/QueryMediator/__tests__/QueryMediator.concepts.test.ts` (fixture shape)

- [ ] **Step 1: Write the failing tests**

In `getNeededColumnsFromQuery.test.ts`, move plan 4's hoisted `AGE_COLUMN` to the new arm (one source, as in Task 6 Step 7; its expected columns do not change). Plan 4's "takes a per-month field's date column from a concept plan" case overrides source columns, so its column becomes:

```ts
        {
          ...AGE_COLUMN,
          attributeName: "temperature per month",
          sources: [
            {
              ...AGE_COLUMN.sources[0]!,
              selectColumnName: "temperature",
              bucketColumnName: "visit_date",
            },
          ],
          valueShape: "bucketed_list",
          valuePickerRuleType: "avg",
          bucketGrain: "month",
        },
```

with its expectation unchanged. Then add `const OTHER_DATASET_ID = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb" as Dataset.Id;` and the `ConceptAttribute` type import, and add:

```ts
  it("takes every source's value, key, and date columns into that source's dataset", () => {
    const plan: ConceptRelationPlan = {
      ...CONCEPT_PLAN,
      contributingDatasetIds: [DATASET_ID, OTHER_DATASET_ID],
      attributeColumns: [
        {
          kind: "dataset_column",
          attributeId: "attr-titer" as ConceptAttribute.Id,
          attributeName: "titer",
          sources: [
            {
              datasetId: DATASET_ID,
              selectColumnName: "titer",
              primaryKeyColumnName: "case_id",
              bucketColumnName: "onset",
              position: 0,
            },
            {
              datasetId: OTHER_DATASET_ID,
              selectColumnName: "lab_titer",
              primaryKeyColumnName: "patient_ref",
              bucketColumnName: "sampled_on",
              position: 1,
            },
          ],
          sharedSourceDuckDbDataType: "BIGINT",
          bucketGrain: "month",
          valueShape: "bucketed_list",
          valuePickerRuleType: "avg",
        },
      ],
    };

    expect(
      getNeededColumnsFromQuery({
        rawSql: `SELECT * FROM "concept_${CONCEPT_ID}"`,
        datasetIds: [DATASET_ID, OTHER_DATASET_ID],
        conceptRelations: [plan],
      }),
    ).toEqual({
      [DATASET_ID]: ["case_id", "onset", "titer"],
      [OTHER_DATASET_ID]: ["lab_titer", "patient_ref", "sampled_on"],
    });
  });
```

In `getConceptRelationPlansFromSql.test.ts`, add `valuePickerRuleType: "first"` to `IDENTIFIER_ATTRIBUTE`, replace any rule on `IDENTIFIER_MAPPING` with `position: 0,` (keep plan 4's `bucketColumnId: undefined`), and give `IDENTIFIER_COLUMN` a `dataType: "varchar"`. Move plan 4's per-month fixtures the same way: `valuePickerRuleType: "avg"` moves from `TEMPERATURE_MAPPING` to `TEMPERATURE_ATTRIBUTE`, and `TEMPERATURE_MAPPING` gains `position: 0`. In plan 4's "fetches the date column a per-month field groups its rows by", the date column is now on the source, so its expectation becomes:

```ts
    ).toMatchObject({
      kind: "dataset_column",
      valueShape: "bucketed_list",
      bucketGrain: "month",
      sources: [{ bucketColumnName: "visit_date" }],
    });
```

Then add these two cases:

```ts
  // Column resolution looks every date column up by id, so planning must
  // fetch each source's, in whichever dataset it lives.
  it("fetches the date column of every source of a per-month field", async () => {
    const labsDatasetId = "eeeeeeee-7777-4777-8777-eeeeeeeeeeee" as Dataset.Id;
    const labsKeyColumn = {
      id: "col-labs-patient-ref",
      name: "patient_ref",
      datasetId: labsDatasetId,
      dataType: "varchar",
    } as DatasetColumn.T;
    const labsTemperatureColumn = {
      id: "col-labs-temp-c",
      name: "temp_c",
      datasetId: labsDatasetId,
      dataType: "double",
    } as DatasetColumn.T;
    const labsDateColumn = {
      id: "col-labs-sampled-on",
      name: "sampled_on",
      datasetId: labsDatasetId,
      dataType: "date",
    } as DatasetColumn.T;
    conceptAttributeGetAllMock.mockResolvedValue([
      IDENTIFIER_ATTRIBUTE,
      TEMPERATURE_ATTRIBUTE,
    ]);
    // One ID field with a key in each dataset, and a per-month field with a
    // source in each.
    getAllAttributeMappingsMock.mockResolvedValue([
      IDENTIFIER_MAPPING,
      {
        ...IDENTIFIER_MAPPING,
        id: "map-person-id-labs",
        datasetId: labsDatasetId,
        datasetColumnId: labsKeyColumn.id,
        position: 1,
      },
      TEMPERATURE_MAPPING,
      {
        ...TEMPERATURE_MAPPING,
        id: "map-temperature-labs",
        datasetId: labsDatasetId,
        datasetColumnId: labsTemperatureColumn.id,
        bucketColumnId: labsDateColumn.id,
        position: 1,
      },
    ]);
    // Answers only the ids asked for, as the real client does.
    datasetColumnGetAllMock.mockImplementation(
      async (filter: { where: { id: { in: readonly string[] } } }) => {
        return [
          IDENTIFIER_COLUMN,
          TEMPERATURE_COLUMN,
          VISIT_DATE_COLUMN,
          labsKeyColumn,
          labsTemperatureColumn,
          labsDateColumn,
        ].filter((column) => {
          return filter.where.id.in.includes(column.id);
        });
      },
    );
    const { getConceptRelationPlansFromSql } =
      await import("@/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql");

    const plans = await getConceptRelationPlansFromSql({
      rawSql: `SELECT * FROM "concept_${CONCEPT_ID}"`,
      allowlist: _permissiveAllowlist(),
    });

    expect(
      plans[0]?.attributeColumns.find((column) => {
        return column.attributeName === "temperature per month";
      }),
    ).toMatchObject({
      valueShape: "bucketed_list",
      bucketGrain: "month",
      sources: [
        { datasetId: DATASET_ID, selectColumnName: "temperature", bucketColumnName: "visit_date" },
        { datasetId: labsDatasetId, selectColumnName: "temp_c", bucketColumnName: "sampled_on" },
      ],
    });
  });

  // The allowlist is per dataset, so a field's second source must pass it
  // too: otherwise the view would bind against a dataset the caller cannot
  // load.
  it("refuses a concept whose ID field's second source is outside the workspace", async () => {
    const { getConceptRelationPlansFromSql } =
      await import("@/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql");
    const foreignDatasetId =
      "ffffffff-6666-4666-8666-ffffffffffff" as Dataset.Id;
    getAllAttributeMappingsMock.mockResolvedValue([
      IDENTIFIER_MAPPING,
      {
        ...IDENTIFIER_MAPPING,
        id: "map-person-id-foreign",
        datasetId: foreignDatasetId,
        datasetColumnId: "col-foreign-person-id",
        position: 1,
      },
    ]);
    datasetColumnGetAllMock.mockResolvedValue([
      IDENTIFIER_COLUMN,
      {
        ...IDENTIFIER_COLUMN,
        id: "col-foreign-person-id",
        datasetId: foreignDatasetId,
      },
    ]);

    await expect(
      getConceptRelationPlansFromSql({
        rawSql: `SELECT * FROM "concept_${CONCEPT_ID}"`,
        allowlist: _permissiveAllowlist(),
      }),
    ).rejects.toThrow(foreignDatasetId);
  });
```

In `QueryMediator.concepts.test.ts`, move the `dataset_column` fixture to the new arm the same way (expected results unchanged).

- [ ] **Step 2: Run them and watch the needed-columns case fail**

Run: `pnpm test:frontend src/clients/qetl/QueryMediator/getNeededColumnsFromQuery src/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql src/clients/qetl/QueryMediator/__tests__/QueryMediator.concepts`
Expected: the new needed-columns case FAILS (it still reads `column.datasetId`), and so does plan 4's per-month case, which reads `column.bucketColumnName`. Both planning cases already PASS, because plan 4's `_getMappedDatasetColumns` asks for every mapping row's date column and Task 7 adds every source's dataset to `contributingDatasetIds`; they stay as regression guards for the two places plan 4 named.

- [ ] **Step 3: Read every source**

In `getNeededColumnsFromQuery.ts`, replace the inner `.reduce` callback of `_getConceptColumnsByDatasetId` (including plan 4's `bucketed_list` date column) with the version below, which keeps every source's date column in that source's own dataset, so a projected load never omits one:

```ts
      .reduce((nextColumnsByDatasetId, column) => {
        column.sources.forEach((source) => {
          const prior = nextColumnsByDatasetId[source.datasetId] ?? [];
          nextColumnsByDatasetId[source.datasetId] = unionColumnSets(prior, [
            source.selectColumnName,
            source.primaryKeyColumnName,
            ...(source.bucketColumnName === undefined
              ? []
              : [source.bucketColumnName]),
          ]);
        });
        return nextColumnsByDatasetId;
      }, columnsByDatasetId);
```

- [ ] **Step 4: Run them and watch them pass**

Run: the command from Step 2.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/clients/qetl/QueryMediator/getNeededColumnsFromQuery src/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql.test.ts src/clients/qetl/QueryMediator/__tests__/QueryMediator.concepts.test.ts
git commit -m "feat(joined-cases): load and authorize every source dataset of a field"
```

---

## Task 9: Hydrated case types carry every mapping

**Files:**
- Modify: `src/views/OntologyDesignerApp/ConceptMetaView/useHydratedConcept.ts:52-69`
- Modify: `src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/generateIndividuals.ts:46-68` (`getAttributesWithMapping`)
- Modify: `src/views/OntologyDesignerApp/ConceptMetaView/RefreshRecordsButton.tsx`, `CaseTypeActions.test.tsx:65`
- Modify: `src/views/OntologyDesignerApp/insertConceptFromFormValues/insertConceptFromFormValues.ts:75-106`, its test
- Modify: `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeAttributesList.tsx:114-125, 52`

- [ ] **Step 1: Write the failing test**

In `insertConceptFromFormValues.test.ts`, replace the mocked `getAttributesWithMapping` with:

```ts
      getAttributesWithMappings: (
        attributes: ReadonlyArray<{ mappings?: unknown[] }>,
      ) => {
        return attributes.filter((attribute) => {
          return (attribute.mappings ?? []).length > 0;
        });
      },
```

and add:

```ts
  it("hands the first sync every mapping of a field with several sources", async () => {
    attributeGetAllMock.mockResolvedValue([
      { id: ATTRIBUTE_ID, conceptId: CONCEPT_ID, mappingType: "dataset_column" },
    ]);
    getAllAttributeMappingsMock.mockResolvedValue([
      { type: "dataset_column", conceptAttributeId: ATTRIBUTE_ID, datasetId: "ds-a", position: 0 },
      { type: "dataset_column", conceptAttributeId: ATTRIBUTE_ID, datasetId: "ds-b", position: 1 },
    ]);

    await insertConceptFromFormValues(_makeFormValues());

    await vi.waitFor(() => {
      expect(generateIndividualsMock).toHaveBeenCalled();
    });
    const [syncedConcept] = generateIndividualsMock.mock.calls[0] as [
      { attributes: Array<{ mappings: Array<{ datasetId: string }> }> },
    ];
    expect(
      syncedConcept.attributes[0]?.mappings.map((mapping) => {
        return mapping.datasetId;
      }),
    ).toEqual(["ds-a", "ds-b"]);
  });
```

In `CaseTypeActions.test.tsx:65`, rename `getAttributesWithMapping` to `getAttributesWithMappings`.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:frontend src/views/OntologyDesignerApp/insertConceptFromFormValues`
Expected: FAIL: `getAttributesWithMappings` does not exist on the real module the code imports, and no attribute has `mappings`.

- [ ] **Step 3: Hydrate every mapping**

In `generateIndividuals.ts`, replace `getAttributesWithMapping` with:

```ts
/**
 * Narrows a concept's attributes down to the ones with at least one mapping:
 * the shape {@link generateIndividuals} and {@link BuildableConcept} require.
 * Shared by the manual "Refresh" button and the auto-sync path that runs
 * right after a concept is created, so both agree on what counts as ready to
 * sync.
 */
export function getAttributesWithMappings<
  TAttribute extends { mappings?: AttributeMapping[] },
>(
  attributes: readonly TAttribute[],
): Array<
  SetRequired<TAttribute, "mappings"> & SetDefined<TAttribute, "mappings">
> {
  return attributes.filter(
    (
      attribute,
    ): attribute is SetRequired<TAttribute, "mappings"> &
      SetDefined<TAttribute, "mappings"> => {
      return (
        hasDefinedProps(attribute, "mappings") && attribute.mappings.length > 0
      );
    },
  );
}
```

In `insertConceptFromFormValues.ts`, import `getAttributesWithMappings`, and in `_getFullConcept` replace the `attributesWithMappings` block with:

```ts
  const attributesWithMappings = getAttributesWithMappings(
    conceptAttributes.map((attribute) => {
      return {
        ...attribute,
        mappings: mappings.filter(
          propEq("conceptAttributeId", attribute.id),
        ),
      };
    }),
  );
```

In `RefreshRecordsButton.tsx`, rename the import and call. In `useHydratedConcept.ts`, replace the `attributes:` mapping inside `hydratedConcept` with:

```ts
      attributes: conceptAttributes?.map((attribute) => {
        return {
          ...attribute,
          mappings: mappings?.filter((candidate) => {
            return candidate.conceptAttributeId === attribute.id;
          }),
        };
      }),
```

- [ ] **Step 4: Name every source dataset on the case type page**

In `CaseTypeAttributesList.tsx`, import `useLingui` (`@lingui/react/macro`), `useMemo` (`react`) and `AttributeSources`, and replace `datasetNameForAttribute` with:

```ts
/** The names of the datasets a field reads, in read order, each once. */
function _getSourceDatasetNames(
  attribute: Attribute,
  datasets: readonly Dataset.T[] | undefined,
): string[] {
  return AttributeSources.getDatasetIdsFromMappings({
    attributeId: attribute.id,
    mappings: attribute.mappings ?? [],
  }).flatMap((datasetId) => {
    const dataset = datasets?.find((candidate) => {
      return candidate.id === datasetId;
    });
    return dataset ? [dataset.name] : [];
  });
}
```

In `AttributeRow`, replace `const sourceName = datasetNameForAttribute(attribute, datasets);` with:

```ts
  const { i18n } = useLingui();
  const sourceNameList = useMemo(() => {
    return new Intl.ListFormat(i18n.locale, {
      style: "short",
      type: "unit",
    });
  }, [i18n.locale]);
  const sourceNames = _getSourceDatasetNames(attribute, datasets);
  const sourceName =
    sourceNames.length > 0 ? sourceNameList.format(sourceNames) : undefined;
```

- [ ] **Step 5: Run the tests and watch them pass**

Run: `pnpm test:frontend src/views/OntologyDesignerApp/insertConceptFromFormValues src/views/OntologyDesignerApp/ConceptMetaView`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/views/OntologyDesignerApp/ConceptMetaView src/views/OntologyDesignerApp/insertConceptFromFormValues
git commit -m "feat(joined-cases): hydrate every source of a field and name each on the case type page"
```

---

## Task 10: Sync reads every identifier source, and a multi-source name until plan 6

**Files:**
- Modify: `src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/generateIndividuals.ts` (`_resolveIndividualSourceMappings`, `_stageIndividuals`, `_runGenerateIndividuals`)
- Modify: `src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/generateIndividuals.test.ts`

Spec §6.7. Plan 6 removes the record name from Sync and stages keys only, through `buildRecordKeyStagingSql` and `RecordKeySource`. The umbrella lets it land before or after this plan, so this task has two paths. Task 0's last `rg` says which:

- It found `buildRecordKeyStagingSql`: plan 6 has landed. Do **Path A** (Steps A1 to A4) and skip Steps 1 to 5.
- It found `_resolveIndividualSourceMappings`: plan 6 has not landed. Skip Path A and do Steps 1 to 5. They keep plan 6's target names (`IndividualSourceMappings`, `_resolveIndividualSourceMappings`, `_stageIndividuals`), so plan 6's instruction to delete them still applies.

Both paths change the fixture the same way (Step 1, items 1 to 3) and share `_makeTwoSourceConcept`.

- [ ] **Step A1: Update the fixture and write the failing test (plan 6 landed)**

Apply Step 1's items 1 to 3 to `generateIndividuals.test.ts` (plan 6 removed item 4's label case; skip it), add Step 1's `LABS_*` constants, `_makeTwoSourceConcept`, and its `describe` with this case in place of Step 1's:

```ts
  // One ID field with a key column in each dataset stages one key source per
  // dataset, as one identifier field per dataset does.
  it("stages a key from every source of one ID field", async () => {
    await generateIndividuals(_makeTwoSourceConcept());

    const [stagingCall] = runQueryMock.mock.calls as Array<
      [{ neededColumnsByDatasetId: Record<string, string[]> }]
    >;
    expect(stagingCall?.[0].neededColumnsByDatasetId).toEqual({
      [DATASET_ID]: ["person_id"],
      [LABS_DATASET_ID]: ["patient_ref"],
    });
  });
```

If plan 6's own two-dataset case gave the second dataset its own identifier attribute (its fallback for running before this plan), leave it: it covers the other identifier shape.

- [ ] **Step A2: Run it and watch it fail**

Run: `pnpm test:frontend src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/generateIndividuals.test.ts`
Expected: FAIL if plan 6 used its fallback and reads `attribute.mapping` (the labs key is missing, or every key is). If it already reads `flatMap(prop("mappings"))`, the case passes and stays as the regression guard; go to Step A4.

- [ ] **Step A3: Read every identifier mapping row**

In `generateIndividuals.ts`, make `_getRecordKeySources` build its mappings as plan 6 wrote it for this plan's shape:

```ts
  const identifierMappings = Concept.bind(concept)
    .getIdentifierAttributes()
    .flatMap(prop("mappings"))
    .filter((mapping): mapping is DatasetColumnMapping => {
      return mapping.type === "dataset_column";
    });
```

and end its docstring with: `A field with several sources contributes one key source per mapping row, so one ID field with a source per dataset stages the same keys as one identifier field per dataset.` `buildRecordKeyStagingSql` and `RecordKeySource` are unchanged.

- [ ] **Step A4: Run and commit**

Run: `pnpm test:frontend src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals`
Expected: PASS.

```bash
git add src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals
git commit -m "feat(joined-cases): stage a record key from every identifier source"
```

- [ ] **Step 1: Update the fixture and write the failing test (plan 6 not landed)**

In `generateIndividuals.test.ts`:

1. Give `_makeMapping` optional `datasetId` and `position` arguments; replace any rule on it with `position: args.position ?? 0,` and `datasetId: args.datasetId ?? DATASET_ID,` (keep plan 4's `bucketColumnId: undefined`).
2. Give `_makeDatasetColumn` an optional `datasetId` argument (default `DATASET_ID`).
3. In `_makeConcept`'s `_makeAttribute`, add `valuePickerRuleType: "first" as const,` to the `Model.make` call (plan 4 already added `bucketGrain`), and replace `mapping: _makeMapping(...)` with `mappings: [_makeMapping({ conceptAttributeId: args.id, datasetColumnId: args.datasetColumnId })]`.
4. Plan 3's "a label without a rule fails the sync" case now builds the label with `valuePickerRuleType: undefined` on the attribute; change its expected message to match `names no value rule`.

Then add:

```ts
const LABS_DATASET_ID = uuid<Dataset.Id>();
const LABS_KEY_COLUMN_ID = uuid<DatasetColumnId>();
const LABS_NAME_COLUMN_ID = uuid<DatasetColumnId>();

/**
 * One ID field reading both datasets' keys, and a name field reading a column
 * of each, as a case type built over two datasets has.
 */
function _makeTwoSourceConcept(): BuildableConcept {
  const concept = _makeConcept();
  const [identifier, label] = concept.attributes;
  return {
    ...concept,
    attributes: [
      {
        ...identifier!,
        mappings: [
          ...identifier!.mappings,
          _makeMapping({
            conceptAttributeId: identifier!.id,
            datasetColumnId: LABS_KEY_COLUMN_ID,
            datasetId: LABS_DATASET_ID,
            position: 1,
          }),
        ],
      },
      {
        ...label!,
        mappings: [
          ...label!.mappings,
          _makeMapping({
            conceptAttributeId: label!.id,
            datasetColumnId: LABS_NAME_COLUMN_ID,
            datasetId: LABS_DATASET_ID,
            position: 1,
          }),
        ],
      },
    ],
  };
}

describe("generateIndividuals over two sources", () => {
  beforeEach(() => {
    getAllDatasetColumnsMock.mockResolvedValue([
      _makeDatasetColumn(EXTERNAL_ID_COLUMN_ID, "person_id"),
      _makeDatasetColumn(NAME_COLUMN_ID, "full_name"),
      _makeDatasetColumn(LABS_KEY_COLUMN_ID, "patient_ref", LABS_DATASET_ID),
      _makeDatasetColumn(LABS_NAME_COLUMN_ID, "patient_name", LABS_DATASET_ID),
    ]);
    getAllIndividualsMock.mockResolvedValue([]);
    _mockSinglePage([]);
  });

  it("loads every identifier source's key and every name source's value and key", async () => {
    await generateIndividuals(_makeTwoSourceConcept());

    const [stagingCall] = runQueryMock.mock.calls as Array<
      [{ neededColumnsByDatasetId: Record<string, string[]> }]
    >;
    expect(stagingCall?.[0].neededColumnsByDatasetId).toEqual({
      [DATASET_ID]: ["full_name", "person_id"],
      [LABS_DATASET_ID]: ["patient_name", "patient_ref"],
    });
  });
});
```

Reuse the file's existing `beforeEach` resets if the outer `describe` does not cover this block.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:frontend src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/generateIndividuals.test.ts`
Expected: FAIL. Sync reads `attribute.mapping`, which no longer exists.

- [ ] **Step 3: Resolve Sync's sources through column resolution**

In `generateIndividuals.ts`, add the imports (keep plan 1's `buildAttributeValueSql` import; remove imports this step leaves unused):

```ts
import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { makeConceptAttributeColumnsFromMetadata } from "@/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata";
import { removeDuplicates } from "@/lib/utils/arrays/removeDuplicates/removeDuplicates";
import type { ConceptAttributeColumn } from "@/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql";
import type { ConceptAttributeSource } from "@/clients/qetl/QueryMediator/conceptRelation/buildStackedSourceRowsSql/buildStackedSourceRowsSql";
```

and add `makeIdLookupRecord` to the `@avandar/utils` import. Replace the source-mapping type and `_resolveIndividualSourceMappings` with:

```ts
/** The label field's view column, which keeps one value. */
type LabelColumn = Extract<
  ConceptAttributeColumn,
  { kind: "dataset_column"; valueShape: "single" }
>;

/**
 * What the staging SQL reads: every identifier source, the record name's
 * field as a view column, and the columns each dataset must load.
 */
type IndividualSourceMappings = {
  identifierSources: ConceptAttributeSource[];
  labelColumn: LabelColumn;
  neededColumnsByDatasetId: Record<string, string[]>;
};

/** Every column a set of dataset-column mappings names, date columns included. */
function _getMappedColumnIds(
  mappings: readonly AttributeMapping[],
): DatasetColumnId[] {
  return mappings.flatMap((mapping) => {
    if (mapping.type !== "dataset_column") {
      return [];
    }
    return mapping.bucketColumnId === undefined
      ? [mapping.datasetColumnId]
      : [mapping.datasetColumnId, mapping.bucketColumnId];
  });
}

/** Each dataset's key and value columns the staging SQL reads, sorted. */
function _getNeededColumnsByDatasetId(
  sources: readonly ConceptAttributeSource[],
): Record<string, string[]> {
  return objectValuesMap(
    makeBucketRecord(sources, { key: "datasetId" }),
    (datasetSources) => {
      return removeDuplicates(
        datasetSources.flatMap((source) => {
          return [source.primaryKeyColumnName, source.selectColumnName];
        }),
      ).sort();
    },
  );
}

/**
 * Resolves a concept's identifier and label fields through the same column
 * resolution the concept view uses, so a record's name is read from every
 * source of its label field exactly as the view reads it.
 */
async function _resolveIndividualSourceMappings(
  concept: BuildableConcept,
): Promise<IndividualSourceMappings> {
  const entConfig = Concept.bind(concept);
  const identifierAttributes = entConfig.getIdentifierAttributes();
  const labelAttribute = entConfig.getLabelAttribute();
  const attributes = removeDuplicates(
    [...identifierAttributes, labelAttribute],
    { hashFn: prop("id") },
  );
  const mappings = attributes.flatMap(prop("mappings"));
  const datasetColumns = await DatasetColumnClient.getAll(
    where("id", "in", _getMappedColumnIds(mappings)),
  );
  const { attributeColumns } = makeConceptAttributeColumnsFromMetadata({
    attributes,
    mappings,
    datasetColumnsById: makeIdLookupRecord(datasetColumns, { key: "id" }),
  });
  const labelColumn = attributeColumns.find((column) => {
    return column.attributeId === labelAttribute.id;
  });
  if (labelColumn?.kind !== "dataset_column" || labelColumn.valueShape !== "single") {
    throw new Error(
      `Concept ${concept.name} names its records from ` +
        `'${labelAttribute.name}', which does not keep one dataset value.`,
    );
  }
  const identifierIds = new Set(identifierAttributes.map(prop("id")));
  const identifierSources = attributeColumns.flatMap((column) => {
    return column.kind === "dataset_column" &&
      identifierIds.has(column.attributeId)
      ? column.sources
      : [];
  });
  return {
    identifierSources,
    labelColumn,
    neededColumnsByDatasetId: _getNeededColumnsByDatasetId([
      ...identifierSources,
      ...labelColumn.sources,
    ]),
  };
}
```

In `_stageIndividuals`, take `mappings: IndividualSourceMappings` in place of the old type, destructure `{ identifierSources, labelColumn, neededColumnsByDatasetId }`, and replace the two template values with:

```ts
      // One selector per identifier source, each key read as stored, as
      // before. DuckDB reads a union of a BIGINT key and a text key as text.
      externalIdSelectors: identifierSources
        .map((source) => {
          return `SELECT ${quoteSqlIdentifier(source.selectColumnName)} AS external_id FROM ${quoteSqlIdentifier(source.datasetId)}`;
        })
        .join(" UNION ALL "),
      titleSelector: buildAttributeValueSql({
        sources: labelColumn.sources,
        sharedSourceDuckDbDataType: labelColumn.sharedSourceDuckDbDataType,
        valueShape: "single",
        valuePickerRuleType: labelColumn.valuePickerRuleType,
        outputColumnName: "name",
        externalIdsTable: "external_ids",
        externalIdColumn: "external_id",
      }),
```

Update the comment above `WorkspaceQuerySession.runQuery` to say Sync reads each identifier source's key column and each label source's value and key column. In `_runGenerateIndividuals`, call `_resolveIndividualSourceMappings(concept)` and pass its result to `_stageIndividuals`. Plan 6 later deletes `IndividualSourceMappings`, `_resolveIndividualSourceMappings` and `_stageIndividuals`; `LabelColumn`, `_getMappedColumnIds` and `_getNeededColumnsByDatasetId` go with them, since only those read them. Keep each function at or under 45 lines.

- [ ] **Step 4: Run the file and watch it pass**

Run: `pnpm test:frontend src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals`
Expected: PASS, the new case and every earlier one.

- [ ] **Step 5: Commit**

```bash
git add src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals
git commit -m "feat(joined-cases): sync records from every identifier source and name them from every label source"
```

---

## Task 11: The record page lists a field's sources in read order

**Files:**
- Modify: `src/views/IndividualManagerApp/SingleIndividualView/useRecordFields/makeCaseDetailsRowsFromAttributes/makeCaseDetailsRowsFromAttributes.ts` (`_getSourceNames`)
- Modify: `.../makeCaseDetailsRowsFromAttributes/makeCaseDetailsRowsFromAttributes.test.ts`

Plan 1 already lists every dataset a field's mappings read, one per line, sorted by name. This task lists them in the order the field reads them, so the source a `first` field prefers comes first.

- [ ] **Step 1: Write the failing test**

In `makeCaseDetailsRowsFromAttributes.test.ts`, add (using the file's attribute and dataset factories):

```ts
  it("lists a field's source datasets in the order the field reads them, not by name", () => {
    const [row] = makeCaseDetailsRowsFromAttributes({
      attributes: [RESULT_ATTRIBUTE],
      valuesByAttributeId: {},
      mappings: [
        { ...RESULT_SOURCE, datasetId: ALPHA_DATASET.id, datasetColumnId: "col-b", position: 1 },
        { ...RESULT_SOURCE, datasetId: ZETA_DATASET.id, datasetColumnId: "col-a", position: 0 },
      ],
      datasets: [ALPHA_DATASET, ZETA_DATASET],
    });

    expect(row?.sourceNames).toEqual(["Zeta labs", "Alpha list"]);
  });
```

with `ALPHA_DATASET` named `Alpha list`, `ZETA_DATASET` named `Zeta labs`, and `RESULT_SOURCE` a `dataset_column` mapping of `RESULT_ATTRIBUTE` (add them beside the file's fixtures). If an existing case asserts alphabetical order for one field's several datasets, change its expectation to read order.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:frontend src/views/IndividualManagerApp/SingleIndividualView/useRecordFields`
Expected: FAIL, `["Alpha list", "Zeta labs"]`.

- [ ] **Step 3: Read the names in read order**

Import `AttributeSources` and replace `_getSourceNames` with:

```ts
/** The names of the datasets one field reads, in the order it reads them. */
function _getSourceNames(
  options: Readonly<{
    attributeId: ConceptAttribute.Id;
    mappings: readonly AttributeMapping[];
    datasetNamesById: ReadonlyMap<string, string>;
  }>,
): string[] {
  return AttributeSources.getDatasetIdsFromMappings({
    attributeId: options.attributeId,
    mappings: options.mappings,
  }).flatMap((datasetId) => {
    const datasetName = options.datasetNamesById.get(datasetId);
    return datasetName === undefined ? [] : [datasetName];
  });
}
```

Change "the datasets the field reads" in `makeCaseDetailsRowsFromAttributes`' docstring to "the datasets the field reads, in read order", and remove the now unused `removeDuplicates` import.

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm test:frontend src/views/IndividualManagerApp/SingleIndividualView`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/IndividualManagerApp/SingleIndividualView/useRecordFields
git commit -m "feat(joined-cases): list a field's source datasets in read order on the record page"
```

---

## Task 12: The chat contract and parsers carry sources

**Files:**
- Modify: `shared/types/chat.types.ts` (rule docstring, `ChatCaseAttributeSource`, both attribute types, `labelColumnId`)
- Create: `supabase/functions/chat/PostChatMessages/parsing/parseChatCaseAttributeSources.ts` and `.test.ts`
- Modify: `supabase/functions/chat/PostChatMessages/parsing/parseProposeCaseType.ts`, `parseProposeCaseType.test.ts`
- Modify: `supabase/functions/chat/PostChatMessages/parsing/parseCreateCaseTypes.ts`, `parseCreateCaseTypes.test.ts`

Spec §6.9. Plan 2 gave `parseProposeCaseType` the catalog columns; plan 3 parses `valueShape` and coerces a join key or label field to one value; plan 4 parses `bucketGrain` and `bucketColumnId`. This task keeps each of those, keyed by a field's first source.

- [ ] **Step 1: Write the failing tests**

Create `supabase/functions/chat/PostChatMessages/parsing/parseChatCaseAttributeSources.test.ts`:

```ts
import { parseChatCaseAttributeSources } from "@sbfn/chat/PostChatMessages/parsing/parseChatCaseAttributeSources.ts";
import { describe, expect, it } from "vitest";

const LINE_LIST_ID = "0f2c9f3e-aaaa-4bbb-8ccc-ddddeeeeffff";
const LABS_ID = "0f2c9f3e-bbbb-4bbb-8ccc-ddddeeeeffff";
const UNDECLARED_ID = "0f2c9f3e-cccc-4bbb-8ccc-ddddeeeeffff";
const RESULT_COLUMN_ID = "1a2b3c4d-aaaa-4bbb-8ccc-ddddeeeeffff";
const LAB_RESULT_COLUMN_ID = "1a2b3c4d-bbbb-4bbb-8ccc-ddddeeeeffff";
const SAMPLED_ON_COLUMN_ID = "1a2b3c4d-cccc-4bbb-8ccc-ddddeeeeffff";

describe("parseChatCaseAttributeSources", () => {
  it("keeps every source of a declared dataset, in the order given", () => {
    expect(
      parseChatCaseAttributeSources({
        rawSources: [
          { datasetId: LABS_ID, columnId: LAB_RESULT_COLUMN_ID, bucketColumnId: SAMPLED_ON_COLUMN_ID },
          { datasetId: LINE_LIST_ID, columnId: RESULT_COLUMN_ID },
        ],
        datasetIds: new Set([LINE_LIST_ID, LABS_ID]),
      }),
    ).toEqual([
      { datasetId: LABS_ID, columnId: LAB_RESULT_COLUMN_ID, bucketColumnId: SAMPLED_ON_COLUMN_ID },
      { datasetId: LINE_LIST_ID, columnId: RESULT_COLUMN_ID },
    ]);
  });

  it("drops a source whose dataset has no join key, a repeated column, and an invented id", () => {
    expect(
      parseChatCaseAttributeSources({
        rawSources: [
          { datasetId: LINE_LIST_ID, columnId: RESULT_COLUMN_ID },
          { datasetId: UNDECLARED_ID, columnId: LAB_RESULT_COLUMN_ID },
          { datasetId: LINE_LIST_ID, columnId: RESULT_COLUMN_ID },
          { datasetId: LINE_LIST_ID, columnId: "not-a-uuid" },
        ],
        datasetIds: new Set([LINE_LIST_ID, LABS_ID]),
      }),
    ).toEqual([{ datasetId: LINE_LIST_ID, columnId: RESULT_COLUMN_ID }]);
  });

  it("returns no sources when the model sent no list", () => {
    expect(
      parseChatCaseAttributeSources({
        rawSources: undefined,
        datasetIds: new Set([LINE_LIST_ID]),
      }),
    ).toEqual([]);
  });
});
```

In `parseProposeCaseType.test.ts` and `parseCreateCaseTypes.test.ts`, change every dataset attribute fixture from `datasetId: X, columnId: Y,` to `sources: [{ datasetId: X, columnId: Y }],` (a plan 4 bucketed fixture moves its `bucketColumnId` into that source), and every expectation that reads `columnId` or `datasetId` off an attribute to read `sources[0]`. Then add to `parseProposeCaseType.test.ts` (pass plan 2's catalog argument as the file's other cases do):

```ts
  it("keeps a field's sources across two datasets, in the order given", () => {
    const parsed = parseProposeCaseType(
      JSON.stringify({
        name: "Measles case",
        sourceDatasets: [
          { datasetId: DEATHS_DATASET_ID, primaryKeyColumnId: DEATHS_KEY_COLUMN_ID },
          { datasetId: CENSUS_DATASET_ID, primaryKeyColumnId: CENSUS_KEY_COLUMN_ID },
        ],
        attributes: [
          {
            sources: [
              { datasetId: DEATHS_DATASET_ID, columnId: STATE_COLUMN_ID },
              { datasetId: CENSUS_DATASET_ID, columnId: POPULATION_COLUMN_ID },
            ],
            name: "Result",
            isIncluded: true,
            valueShape: "single",
            valuePickerRuleType: "most_frequent",
          },
        ],
        manualEntryAttributes: [],
      }),
      [],
    );

    expect(parsed?.attributes[0]?.sources).toEqual([
      { datasetId: DEATHS_DATASET_ID, columnId: STATE_COLUMN_ID },
      { datasetId: CENSUS_DATASET_ID, columnId: POPULATION_COLUMN_ID },
    ]);
  });

  it("drops a source whose catalog type differs from the field's first source", () => {
    const parsed = parseProposeCaseType(
      JSON.stringify({
        name: "Measles case",
        sourceDatasets: [
          { datasetId: DEATHS_DATASET_ID, primaryKeyColumnId: DEATHS_KEY_COLUMN_ID },
          { datasetId: CENSUS_DATASET_ID, primaryKeyColumnId: CENSUS_KEY_COLUMN_ID },
        ],
        attributes: [
          {
            sources: [
              { datasetId: DEATHS_DATASET_ID, columnId: STATE_COLUMN_ID },
              { datasetId: CENSUS_DATASET_ID, columnId: POPULATION_COLUMN_ID },
            ],
            name: "State",
            isIncluded: true,
            valueShape: "single",
            valuePickerRuleType: "first",
          },
        ],
        manualEntryAttributes: [],
      }),
      [
        { id: STATE_COLUMN_ID, data_type: "varchar" },
        { id: POPULATION_COLUMN_ID, data_type: "bigint" },
      ],
    );

    expect(
      parsed?.attributes[0]?.sources.map((source) => {
        return source.columnId;
      }),
    ).toEqual([STATE_COLUMN_ID]);
  });

  // The card names a field by its first source's column, so two fields with
  // the same first column could not be told apart.
  it("drops a field whose first source repeats an earlier field's", () => {
    const parsed = parseProposeCaseType(
      JSON.stringify({
        name: "Measles case",
        sourceDatasets: [
          { datasetId: DEATHS_DATASET_ID, primaryKeyColumnId: DEATHS_KEY_COLUMN_ID },
        ],
        attributes: [
          {
            sources: [{ datasetId: DEATHS_DATASET_ID, columnId: STATE_COLUMN_ID }],
            name: "State",
            isIncluded: true,
            valueShape: "single",
            valuePickerRuleType: "first",
          },
          {
            sources: [{ datasetId: DEATHS_DATASET_ID, columnId: STATE_COLUMN_ID }],
            name: "State again",
            isIncluded: true,
            valueShape: "single",
            valuePickerRuleType: "first",
          },
        ],
        manualEntryAttributes: [],
      }),
      [],
    );

    expect(
      parsed?.attributes.map((attribute) => {
        return attribute.name;
      }),
    ).toEqual(["State"]);
  });
```

and to `parseCreateCaseTypes.test.ts` (using that file's id constants; add `OTHER_DATASET_ID` and `OTHER_COLUMN_ID` as fresh UUID strings if it has none):

```ts
  it("keeps a created field's sources that a declared identity holds", () => {
    const parsed = parseCreateCaseTypes(
      JSON.stringify({
        cases: [
          {
            name: "Measles case",
            identities: [
              { datasetId: DATASET_ID, primaryKeyColumnId: KEY_COLUMN_ID },
            ],
            attributes: [
              {
                name: "Result",
                kind: "dataset_column",
                sources: [
                  { datasetId: DATASET_ID, columnId: COLUMN_ID },
                  { datasetId: OTHER_DATASET_ID, columnId: OTHER_COLUMN_ID },
                ],
              },
            ],
          },
        ],
      }),
    );

    expect(parsed?.[0]?.attributes[0]).toMatchObject({
      name: "Result",
      kind: "dataset_column",
      sources: [{ datasetId: DATASET_ID, columnId: COLUMN_ID }],
    });
  });
```

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm test:frontend supabase/functions/chat/PostChatMessages/parsing`
Expected: FAIL. `parseChatCaseAttributeSources.ts` does not exist, and both parsers drop every attribute that has `sources` instead of `datasetId` and `columnId`.

- [ ] **Step 3: Change the contract**

In `shared/types/chat.types.ts`:

1. `ChatCaseValuePickerRuleType`'s docstring becomes: `Which value a dataset-column field keeps when its sources hold several rows per case. Mirrors the attribute_mappings__value_picker_rule_type database enum.`
2. Above `ChatCreatedCaseAttribute`, add:

```ts
/**
 * One column a dataset-column field reads. A field lists its sources in
 * priority order: when it keeps one value, the earliest source with a value
 * wins, and a list holds the sources' values in this order.
 */
export type ChatCaseAttributeSource = {
  datasetId: string;
  columnId: string;
  /** The date column that places this source's rows in periods, on a per-period field. */
  bucketColumnId?: string;
};
```

3. In `ChatProposedCaseAttribute` and the `dataset_column` arm of `ChatCreatedCaseAttribute`, replace `datasetId` and `columnId` (and plan 4's attribute-level `bucketColumnId`) with:

```ts
  /**
   * Every column this field reads, in priority order. Never empty. The first
   * source's column names the field in the draft card and in `labelColumnId`.
   */
  sources: ChatCaseAttributeSource[];
```

   Keep plan 3's `valueShape`, plan 4's `bucketGrain`, and the rule. Update plan 4's comment that `bucketGrain` and `bucketColumnId` are present together to: `bucketGrain is present exactly when valueShape is "bucketed_list", and then every source has a bucketColumnId.`
4. `labelColumnId`'s docstring becomes: `The first source column of the field whose value labels each case in the UI. The client falls back to a join key when it names no field.`

- [ ] **Step 4: Write the shared sources parser**

Create `supabase/functions/chat/PostChatMessages/parsing/parseChatCaseAttributeSources.ts`:

```ts
import type { ChatCaseAttributeSource } from "$/types/chat.types.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function _asUuid(value: unknown): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  return UUID_RE.test(text) ? text : undefined;
}

function _parseSource(raw: unknown): ChatCaseAttributeSource | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const record = raw as Record<string, unknown>;
  const datasetId = _asUuid(record.datasetId);
  const columnId = _asUuid(record.columnId);
  if (!datasetId || !columnId) {
    return undefined;
  }
  const bucketColumnId = _asUuid(record.bucketColumnId);
  return { datasetId, columnId, ...(bucketColumnId ? { bucketColumnId } : {}) };
}

/**
 * Parses the `sources` a case type tool call gives one field: each source a
 * declared dataset holds, each column once, in the order the model gave. A
 * source in a dataset with no join key could not be matched to a case, so it
 * is dropped. Used by both case type parsers.
 */
export function parseChatCaseAttributeSources(
  options: Readonly<{
    rawSources: unknown;
    datasetIds: ReadonlySet<string>;
  }>,
): ChatCaseAttributeSource[] {
  if (!Array.isArray(options.rawSources)) {
    return [];
  }
  const seenColumnIds = new Set<string>();
  return options.rawSources
    .map(_parseSource)
    .filter((source): source is ChatCaseAttributeSource => {
      if (
        !source ||
        !options.datasetIds.has(source.datasetId) ||
        seenColumnIds.has(source.columnId)
      ) {
        return false;
      }
      seenColumnIds.add(source.columnId);
      return true;
    });
}
```

- [ ] **Step 5: Parse sources in the proposal**

In `parseProposeCaseType.ts`, import `parseChatCaseAttributeSources`, and give `VALUE_PICKER_RULE_TYPES` the comment `The rules that reduce a field's rows from every source. Mirrors ChatCaseValuePickerRuleType.` Add above `_parseAttribute`:

```ts
/**
 * A field's sources, kept to the type of its first catalogued source: one
 * field reads one type, and a source of another would fail the case type
 * when it is queried. A source the catalog does not list is kept, and the
 * client drops it when it resolves columns.
 */
function _parseFieldSources(
  options: Readonly<{
    rawSources: unknown;
    sourceDatasetIds: ReadonlySet<string>;
    columnDataTypesById: ColumnDataTypesById;
  }>,
): ChatCaseAttributeSource[] {
  const sources = parseChatCaseAttributeSources({
    rawSources: options.rawSources,
    datasetIds: options.sourceDatasetIds,
  });
  const firstDataType = sources
    .map((source) => {
      return options.columnDataTypesById.get(source.columnId);
    })
    .find((dataType) => {
      return dataType !== undefined;
    });
  return sources.filter((source) => {
    const dataType = options.columnDataTypesById.get(source.columnId);
    return dataType === undefined || dataType === firstDataType;
  });
}
```

Then change plan 2, 3 and 4's `_parseAttribute` so that:

1. It takes `sourceDatasetIds: ReadonlySet<string>` beside plan 2's `columnDataTypesById`, reads `const sources = _parseFieldSources({ rawSources: record.sources, sourceDatasetIds, columnDataTypesById });`, returns `undefined` when `sources.length === 0` or the name is missing, and returns `sources` in place of `datasetId` and `columnId`.
2. Plan 2's rule check reads the type of `sources[0]` (`columnDataTypesById.get(sources[0].columnId)`).
3. Plan 4's per-period parse becomes per source: the field keeps `"bucketed_list"` only with a known grain and a `bucketColumnId` on its first source; any other source without a `bucketColumnId` is dropped; when the field falls back to one value, every source's `bucketColumnId` is removed.
4. Plan 3's coercion of a join key or the label column to one value compares `sources[0].columnId` where it compared `columnId`.

Replace `_parseSourceAttributes` with:

```ts
/**
 * The proposed fields with at least one source a declared dataset holds,
 * each named by a first source column no earlier field has. The card keys a
 * field by that column, and a source with no join key would make the whole
 * concept unqueryable.
 */
function _parseSourceAttributes(
  options: Readonly<{
    rawAttributes: unknown;
    sourceDatasets: readonly ChatCaseSourceDataset[];
    columnDataTypesById: ColumnDataTypesById;
  }>,
): ChatProposedCaseAttribute[] {
  const sourceDatasetIds = new Set(
    options.sourceDatasets.map((sourceDataset) => {
      return sourceDataset.datasetId;
    }),
  );
  const seenFirstColumnIds = new Set<string>();
  return _parseList(options.rawAttributes, (raw) => {
    return _parseAttribute(raw, {
      sourceDatasetIds,
      columnDataTypesById: options.columnDataTypesById,
    });
  }).filter((attribute) => {
    const firstColumnId = attribute.sources[0]?.columnId;
    if (firstColumnId === undefined || seenFirstColumnIds.has(firstColumnId)) {
      return false;
    }
    seenFirstColumnIds.add(firstColumnId);
    return true;
  });
}
```

(adapt `_parseAttribute`'s second parameter to that object). In `parseProposeCaseType`, the label check becomes `attribute.sources[0]?.columnId === labelColumnId`.

- [ ] **Step 6: Parse sources in created case types**

In `parseCreateCaseTypes.ts`, import `parseChatCaseAttributeSources`, give `_parseDatasetColumnAttribute` an options object `{ raw, name, datasetIds }`, and make it read `sources` with `parseChatCaseAttributeSources({ rawSources: raw.sources, datasetIds })`, returning `undefined` when none remain, and `sources` in place of `datasetId` and `columnId` (keep plan 3's `valueShape`). Give `_parseAttribute` the case's `datasetIds` and pass it through. In `_parseCaseType`, replace the attributes filter with:

```ts
  // A dataset column with no join key cannot be matched to a case, so its
  // source is dropped, and a field left with none is dropped with it.
  const attributes = Array.isArray(record.attributes)
    ? record.attributes
        .map((rawAttribute) => {
          return _parseAttribute(rawAttribute, datasetIds);
        })
        .filter((attribute): attribute is ChatCreatedCaseAttribute => {
          return attribute !== undefined;
        })
    : [];
```

Plan 3's coercion of a join key or `isLabel` field to one value compares `sources[0].columnId` where it compared `columnId`.

- [ ] **Step 7: Run them and watch them pass**

Run: `pnpm test:frontend supabase/functions/chat/PostChatMessages/parsing`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add shared/types/chat.types.ts supabase/functions/chat/PostChatMessages/parsing
git commit -m "feat(joined-cases): let chat give a field several sources"
```

---

## Task 13: The tool schemas and the prompt describe sources

**Files:**
- Modify: `supabase/functions/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.ts`, its test
- Modify: `supabase/functions/chat/PostChatMessages/prompt/buildCaseManagerSystemPrompt.ts`, its test

- [ ] **Step 1: Write the failing tests**

In `makeChatToolConfigFromOptions.test.ts`, add:

```ts
  it("asks proposeCaseType for each field's columns as a non-empty list of sources", () => {
    const config = makeChatToolConfigFromOptions({
      clarificationCapReached: false,
      app: "case-manager",
    });
    const tools = config.tools as Array<{
      function: {
        name: string;
        parameters: {
          properties: {
            attributes?: {
              items: {
                properties: Record<string, { minItems?: number }>;
                required: string[];
              };
            };
          };
        };
      };
    }>;
    const attributeItems = tools.find((tool) => {
      return tool.function.name === "proposeCaseType";
    })?.function.parameters.properties.attributes?.items;

    expect({
      keys: Object.keys(attributeItems?.properties ?? {}).filter((key) => {
        return ["sources", "datasetId", "columnId", "bucketColumnId"].includes(key);
      }),
      minSources: attributeItems?.properties.sources?.minItems,
      requiresSources: attributeItems?.required.includes("sources"),
    }).toEqual({ keys: ["sources"], minSources: 1, requiresSources: true });
  });
```

In `buildCaseManagerSystemPrompt.test.ts`, add (with that file's usual arguments):

```ts
  it("tells the model a field can read several columns, listed in priority order", () => {
    const prompt = buildCaseManagerSystemPrompt({
      datasets: [],
      columns: [],
      concepts: [],
    });
    expect(prompt).toContain(
      "Give that field one entry per column in its `sources`, in priority order",
    );
  });
```

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm test:frontend supabase/functions/chat/PostChatMessages/prompt`
Expected: FAIL on both new cases.

- [ ] **Step 3: Change both tool schemas**

In `makeChatToolConfigFromOptions.ts`, `proposeCaseType`:

1. `labelColumnId.description`: ``"Column id of the first source of the attribute whose value names each case in the UI. Must be the first source of one of `attributes`."``
2. `attributes.description`: `"One entry per field worth mapping, across all source datasets. Preselect the useful ones with isIncluded true and offer marginal ones with isIncluded false."`
3. In `attributes.items.properties`, delete `datasetId`, `columnId`, and plan 4's `bucketColumnId`, and add first:

```ts
                sources: {
                  type: "array",
                  minItems: 1,
                  description:
                    "Every column this field reads, in priority order. Usually one. Add more only for columns that hold the same thing, such as phone 1 and phone 2, or one measure kept in two datasets. Every source must have the same column type.",
                  items: {
                    type: "object",
                    properties: {
                      datasetId: {
                        type: "string",
                        description:
                          "Which source dataset this column comes from. Must be one of `sourceDatasets`.",
                      },
                      columnId: {
                        type: "string",
                        description: "Catalog column id, copied verbatim.",
                      },
                      bucketColumnId: {
                        type: "string",
                        description:
                          "Only for a per-period field: a date or timestamp column of this source's dataset that places each row in a period.",
                      },
                    },
                    required: ["datasetId", "columnId"],
                    additionalProperties: false,
                  },
                },
```

4. Prefix plan 2's `valuePickerRuleType.description` with `"Which value to keep when the field's sources hold several rows per case. "` in place of its opening clause about a dataset.
5. In `required`, replace `"datasetId", "columnId",` with `"sources",`.

In `createCaseTypes`, in `attributes.items.properties`, replace `datasetId: { type: "string" }, columnId: { type: "string" },` with:

```ts
                      sources: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            datasetId: { type: "string" },
                            columnId: { type: "string" },
                          },
                          required: ["datasetId", "columnId"],
                          additionalProperties: false,
                        },
                      },
```

- [ ] **Step 4: Change the prompt**

In `buildCaseManagerSystemPrompt.ts`, inside `caseManagerRules`:

1. Replace the `labelColumnId` bullet's last sentence with ``It must be the first source of one of \`attributes\`.`` (the prompt is a template literal, so its backticks stay escaped).
2. Directly after the value picker bullet (and plans 2 to 4's bullets beside it), add:

```
- A field can read several columns when they hold the same thing: phone 1 and phone 2 in one dataset, or lab results kept in two sheets. Give that field one entry per column in its \`sources\`, in priority order: when the field keeps one value, the earliest source with a value wins, and a list holds the sources' values in that order. Every source of a field must have the same column type, and each source's dataset must be in \`sourceDatasets\`. A per-period field gives every source its own date column.
- The join key columns become one ID field that reads every dataset's key. Still list each join key column as an attribute with that column as its only source.
```

- [ ] **Step 5: Run them and watch them pass**

Run: `pnpm test:frontend supabase/functions/chat/PostChatMessages/prompt`
Expected: PASS, including the existing "lets proposeCaseType prefill every field" case.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/chat/PostChatMessages/prompt
git commit -m "feat(joined-cases): describe field sources in the case type tools and prompt"
```

---

## Task 14: One ID field from the join keys

**Files:**
- Create: `src/views/OntologyDesignerApp/makeAttributesWithIdentifierFromKeyColumns/makeAttributesWithIdentifierFromKeyColumns.ts`
- Create: `src/views/OntologyDesignerApp/makeAttributesWithIdentifierFromKeyColumns/makeAttributesWithIdentifierFromKeyColumns.test.ts`

Spec §6.6. This task uses Task 16's form types (`mappings.datasetColumn` is an array, the rule is on the attribute). If you run tasks out of order, do Task 16 Steps 3 and 4 first.

- [ ] **Step 1: Write the failing test**

Create `makeAttributesWithIdentifierFromKeyColumns.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { makeDefaultManualEntryAttribute } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import { makeAttributesWithIdentifierFromKeyColumns } from "@/views/OntologyDesignerApp/makeAttributesWithIdentifierFromKeyColumns/makeAttributesWithIdentifierFromKeyColumns";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { DatasetColumnId } from "$/models/datasets/DatasetColumn/DatasetColumn.types";
import type { ConceptId } from "$/models/ontology/Concept/Concept.types";
import type { ConceptAttributeId } from "$/models/ontology/ConceptAttribute/ConceptAttribute.types";
import type { AttributeFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import type { KeyColumn } from "@/views/OntologyDesignerApp/makeAttributesWithIdentifierFromKeyColumns/makeAttributesWithIdentifierFromKeyColumns";

const CONCEPT_ID = uuid<ConceptId>();
const LINE_LIST_ID = uuid<DatasetId>();
const LABS_ID = uuid<DatasetId>();
const CASE_ID_COLUMN: KeyColumn = {
  id: uuid<DatasetColumnId>(),
  datasetId: LINE_LIST_ID,
  name: "case_id",
  dataType: "varchar",
};
const PATIENT_REF_COLUMN: KeyColumn = {
  id: uuid<DatasetColumnId>(),
  datasetId: LABS_ID,
  name: "patient_ref",
  dataType: "varchar",
};
const RESULT_COLUMN_ID = uuid<DatasetColumnId>();

function _field(options: {
  name: string;
  columns: ReadonlyArray<{ id: DatasetColumnId; datasetId: DatasetId }>;
  isLabel?: boolean;
}): AttributeFormValues {
  const id = uuid<ConceptAttributeId>();
  return {
    __type: "ConceptAttribute",
    id,
    conceptId: CONCEPT_ID,
    name: options.name,
    description: undefined,
    dataType: "varchar",
    mappingType: "dataset_column",
    isIdentifier: false,
    isLabel: options.isLabel ?? false,
    allowManualEdit: false,
    isArray: false,
    bucketGrain: undefined,
    valuePickerRuleType: "most_frequent",
    mappings: {
      manualEntry: { type: "manual_entry", conceptAttributeId: id },
      datasetColumn: options.columns.map((column) => {
        return {
          type: "dataset_column",
          conceptAttributeId: id,
          datasetId: column.datasetId,
          datasetColumnId: column.id,
          bucketColumnId: undefined,
        };
      }),
    },
  };
}

describe("makeAttributesWithIdentifierFromKeyColumns", () => {
  it("makes one ID field reading each dataset's key column, in order", () => {
    const attributes = makeAttributesWithIdentifierFromKeyColumns({
      conceptId: CONCEPT_ID,
      keyColumns: [CASE_ID_COLUMN, PATIENT_REF_COLUMN],
      attributes: [],
    });
    const identifiers = attributes.filter((attribute) => {
      return attribute.isIdentifier;
    });

    expect(
      identifiers.map((identifier) => {
        return {
          name: identifier.name,
          rule: identifier.valuePickerRuleType,
          columnIds: identifier.mappings.datasetColumn.map((source) => {
            return source.datasetColumnId;
          }),
        };
      }),
    ).toEqual([
      {
        name: "case_id",
        rule: "first",
        columnIds: [CASE_ID_COLUMN.id, PATIENT_REF_COLUMN.id],
      },
    ]);
  });

  it("folds a field that reads only key columns into the ID field, keeping its name", () => {
    const attributes = makeAttributesWithIdentifierFromKeyColumns({
      conceptId: CONCEPT_ID,
      keyColumns: [CASE_ID_COLUMN, PATIENT_REF_COLUMN],
      attributes: [_field({ name: "Case ID", columns: [CASE_ID_COLUMN] })],
    });

    expect(
      attributes.map((attribute) => {
        return [attribute.name, attribute.isIdentifier];
      }),
    ).toEqual([["Case ID", true]]);
  });

  it("makes the ID field the label, under the label's id, when a folded key field was the label", () => {
    const labelField = _field({
      name: "Patient ref",
      columns: [PATIENT_REF_COLUMN],
      isLabel: true,
    });
    const [identifier] = makeAttributesWithIdentifierFromKeyColumns({
      conceptId: CONCEPT_ID,
      keyColumns: [CASE_ID_COLUMN, PATIENT_REF_COLUMN],
      attributes: [labelField],
    });

    expect([identifier?.id, identifier?.isLabel]).toEqual([
      labelField.id,
      true,
    ]);
  });

  it("makes the ID field text when the key columns differ in type", () => {
    const [identifier] = makeAttributesWithIdentifierFromKeyColumns({
      conceptId: CONCEPT_ID,
      keyColumns: [CASE_ID_COLUMN, { ...PATIENT_REF_COLUMN, dataType: "bigint" }],
      attributes: [],
    });

    expect(identifier?.dataType).toBe("varchar");
  });

  it("keeps the key columns' type when they agree", () => {
    const [identifier] = makeAttributesWithIdentifierFromKeyColumns({
      conceptId: CONCEPT_ID,
      keyColumns: [
        { ...CASE_ID_COLUMN, dataType: "bigint" },
        { ...PATIENT_REF_COLUMN, dataType: "bigint" },
      ],
      attributes: [],
    });

    expect(identifier?.dataType).toBe("bigint");
  });

  it("leaves a field that reads a non-key column, and a manual-entry field, alone", () => {
    const result = _field({
      name: "Result",
      columns: [CASE_ID_COLUMN, { id: RESULT_COLUMN_ID, datasetId: LABS_ID }],
    });
    const notes = makeDefaultManualEntryAttribute({
      conceptId: CONCEPT_ID,
      name: "Notes",
    });
    const attributes = makeAttributesWithIdentifierFromKeyColumns({
      conceptId: CONCEPT_ID,
      keyColumns: [CASE_ID_COLUMN],
      attributes: [result, notes],
    });

    expect(attributes.slice(1)).toEqual([result, notes]);
  });

  it("returns the fields unchanged when no dataset has a key column yet", () => {
    const result = _field({
      name: "Result",
      columns: [{ id: RESULT_COLUMN_ID, datasetId: LABS_ID }],
    });

    expect(
      makeAttributesWithIdentifierFromKeyColumns({
        conceptId: CONCEPT_ID,
        keyColumns: [],
        attributes: [result],
      }),
    ).toEqual([result]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:frontend src/views/OntologyDesignerApp/makeAttributesWithIdentifierFromKeyColumns`
Expected: FAIL, `Failed to resolve import`.

- [ ] **Step 3: Write the fold**

Create `makeAttributesWithIdentifierFromKeyColumns.ts`:

```ts
import { Model } from "@avandar/models";
import { prop } from "@avandar/utils";
import { uuid } from "$/lib/uuid";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ConceptId } from "$/models/ontology/Concept/Concept.types";
import type { ConceptAttributeId } from "$/models/ontology/ConceptAttribute/ConceptAttribute.types";
import type { AttributeFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";

/** One dataset's join key column, as a case type's ID field reads it. */
export type KeyColumn = Pick<
  DatasetColumn.T,
  "id" | "datasetId" | "name" | "dataType"
>;

function _isKeyField(
  attribute: Readonly<AttributeFormValues>,
  keyColumnIds: ReadonlySet<string>,
): boolean {
  const sources = attribute.mappings.datasetColumn;
  return (
    attribute.mappingType === "dataset_column" &&
    sources.length > 0 &&
    sources.every((source) => {
      return keyColumnIds.has(source.datasetColumnId);
    })
  );
}

/** Keys compare as text, so keys of different types make a text field. */
function _getKeyDataType(keyColumns: readonly KeyColumn[]): AvaDataType.T {
  const dataTypes = new Set(keyColumns.map(prop("dataType")));
  const [onlyDataType] = dataTypes;
  return dataTypes.size === 1 && onlyDataType !== undefined
    ? onlyDataType
    : "varchar";
}

function _makeIdentifierField(
  options: Readonly<{
    id: ConceptAttributeId;
    conceptId: ConceptId;
    namingField: AttributeFormValues | undefined;
    isLabel: boolean;
    keyColumns: readonly [KeyColumn, ...KeyColumn[]];
  }>,
): AttributeFormValues {
  const { id, namingField, keyColumns } = options;
  return Model.make("ConceptAttribute", {
    id,
    conceptId: options.conceptId,
    name: ConceptStatus.toNonReservedAttributeName(
      namingField?.name ?? keyColumns[0].name,
    ),
    description: namingField?.description,
    dataType: _getKeyDataType(keyColumns),
    mappingType: "dataset_column",
    isIdentifier: true,
    isLabel: options.isLabel,
    allowManualEdit: false,
    isArray: false,
    bucketGrain: undefined,
    valuePickerRuleType: "first",
    mappings: {
      manualEntry: { type: "manual_entry", conceptAttributeId: id },
      datasetColumn: keyColumns.map((column) => {
        return {
          type: "dataset_column",
          conceptAttributeId: id,
          datasetId: column.datasetId,
          datasetColumnId: column.id,
          bucketColumnId: undefined,
        };
      }),
    },
  } as const);
}

/**
 * Gives a new case type one ID field whose sources are each dataset's join
 * key column, in the order the datasets were added, and folds into it every
 * field that reads only key columns. A folded field's name and description
 * name the ID field, and if one was the label, the ID field is the label and
 * keeps its id. Called by the create form's submit transform and by
 * `createdCaseTypeToFormValues`, so both paths build the same ID field.
 */
export function makeAttributesWithIdentifierFromKeyColumns(
  options: Readonly<{
    conceptId: ConceptId;
    keyColumns: readonly KeyColumn[];
    attributes: readonly AttributeFormValues[];
  }>,
): AttributeFormValues[] {
  const { conceptId, keyColumns, attributes } = options;
  const [firstKeyColumn, ...otherKeyColumns] = keyColumns;
  if (firstKeyColumn === undefined) {
    return [...attributes];
  }
  const keyColumnIds = new Set(keyColumns.map(prop("id")));
  const keyFields = attributes.filter((attribute) => {
    return _isKeyField(attribute, keyColumnIds);
  });
  const namingField =
    keyFields.find((attribute) => {
      return (
        attribute.mappings.datasetColumn[0]?.datasetColumnId ===
        firstKeyColumn.id
      );
    }) ?? keyFields[0];
  const labelField = keyFields.find(prop("isLabel"));
  const identifier = _makeIdentifierField({
    id: (labelField ?? namingField)?.id ?? uuid<ConceptAttributeId>(),
    conceptId,
    namingField,
    isLabel: labelField !== undefined,
    keyColumns: [firstKeyColumn, ...otherKeyColumns],
  });
  return [
    identifier,
    ...attributes.filter((attribute) => {
      return !keyFields.includes(attribute);
    }),
  ];
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm test:frontend src/views/OntologyDesignerApp/makeAttributesWithIdentifierFromKeyColumns`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/views/OntologyDesignerApp/makeAttributesWithIdentifierFromKeyColumns
git commit -m "feat(joined-cases): fold a case type's join keys into one ID field"
```

---

## Task 15: Chat drafts become fields with sources

**Files:**
- Modify: `src/views/OntologyDesignerApp/proposedCaseTypeToCreatedCaseType/proposedCaseTypeToCreatedCaseType.ts`, its test
- Modify: `src/views/OntologyDesignerApp/createdCaseTypeToFormValues/createdCaseTypeToFormValues.ts`, its test

- [ ] **Step 1: Write the failing tests**

In both test files, move every dataset attribute fixture from `datasetId`/`columnId` to `sources: [{ datasetId, columnId }]` (a plan 4 per-period fixture moves its `bucketColumnId` into that source). Then add to `proposedCaseTypeToCreatedCaseType.test.ts` (with the file's own draft factory and ids):

```ts
  it("keeps a dataset that only a field's second source reads", () => {
    const draft = _draft();
    const created = proposedCaseTypeToCreatedCaseType({
      ...draft,
      attributes: draft.attributes.map((attribute, index) => {
        return index === 0
          ? {
              ...attribute,
              sources: [
                ...attribute.sources,
                { datasetId: CENSUS_DATASET_ID, columnId: POPULATION_COLUMN_ID },
              ],
            }
          : attribute;
      }),
    });

    expect(
      created.identities.map((identity) => {
        return identity.datasetId;
      }),
    ).toContain(CENSUS_DATASET_ID);
  });
```

and to `createdCaseTypeToFormValues.test.ts`:

```ts
  it("makes one ID field that reads each identity's key column", () => {
    const formValues = createdCaseTypeToFormValues({
      caseType: _covidCase({
        identities: [
          { datasetId: DATASET_ID, primaryKeyColumnId: PK_COLUMN_ID },
          { datasetId: CENSUS_DATASET_ID, primaryKeyColumnId: CENSUS_KEY_COLUMN_ID },
        ],
      }),
      workspaceId: WORKSPACE_ID,
      columns: COLUMNS,
    });

    const identifiers = formValues.attributes.filter((attribute) => {
      return attribute.isIdentifier;
    });
    expect(
      identifiers.map((identifier) => {
        return identifier.mappings.datasetColumn.map((source) => {
          return source.datasetColumnId;
        });
      }),
    ).toEqual([[PK_COLUMN_ID, CENSUS_KEY_COLUMN_ID]]);
  });

  it("drops a source whose type differs from the field's first source", () => {
    const formValues = createdCaseTypeToFormValues({
      caseType: _covidCase({
        identities: [
          { datasetId: DATASET_ID, primaryKeyColumnId: PK_COLUMN_ID },
          { datasetId: CENSUS_DATASET_ID, primaryKeyColumnId: CENSUS_KEY_COLUMN_ID },
        ],
        attributes: [
          {
            name: "Case status",
            kind: "dataset_column",
            sources: [
              { datasetId: DATASET_ID, columnId: STATUS_COLUMN_ID },
              { datasetId: CENSUS_DATASET_ID, columnId: POPULATION_COLUMN_ID },
            ],
          },
        ],
      }),
      workspaceId: WORKSPACE_ID,
      columns: COLUMNS,
    });

    const caseStatus = formValues.attributes.find((attribute) => {
      return attribute.name === "Case status";
    });
    expect(
      caseStatus?.mappings.datasetColumn.map((source) => {
        return source.datasetColumnId;
      }),
    ).toEqual([STATUS_COLUMN_ID]);
  });

  it("drops a source whose dataset has no join key", () => {
    const formValues = createdCaseTypeToFormValues({
      caseType: _covidCase({
        attributes: [
          {
            name: "Population",
            kind: "dataset_column",
            sources: [{ datasetId: CENSUS_DATASET_ID, columnId: POPULATION_COLUMN_ID }],
          },
        ],
      }),
      workspaceId: WORKSPACE_ID,
      columns: COLUMNS,
    });

    expect(
      formValues.attributes.map((attribute) => {
        return attribute.name;
      }),
    ).not.toContain("Population");
  });
```

Plan 3's and plan 4's cases that expect one identifier attribute per identity now expect the one ID field; change those expectations.

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm test:frontend src/views/OntologyDesignerApp/proposedCaseTypeToCreatedCaseType src/views/OntologyDesignerApp/createdCaseTypeToFormValues`
Expected: FAIL: the conversions still read `attribute.datasetId` and `attribute.columnId`.

- [ ] **Step 3: Carry sources from the card**

In `proposedCaseTypeToCreatedCaseType.ts`, add:

```ts
/** A proposed field's key: its first source's column. */
function _getFirstSourceColumnId(
  attribute: Readonly<ChatProposedCaseAttribute>,
): string | undefined {
  return attribute.sources[0]?.columnId;
}
```

and change:

- `_toDatasetColumnAttribute`: `sources: attribute.sources,` in place of `datasetId` and `columnId` (keep plan 3's `valueShape`, plan 4's `bucketGrain`, and plan 3's single-only rule).
- `_includedAttributes`: `return attribute.isIncluded || primaryKeyColumnIds.has(_getFirstSourceColumnId(attribute) ?? "");`
- `_contributingSourceDatasets`: build `contributingDatasetIds` from `options.included.flatMap((attribute) => { return attribute.sources.map((source) => { return source.datasetId; }); })`, and begin its docstring with `Drops sources that no longer contribute anything, counting every source of every included field.`
- `_resolveLabelColumnId` and the `isLabel` argument compare `_getFirstSourceColumnId(attribute)` where they compared `attribute.columnId`; so does plan 3's single-value coercion of the label and join keys.

- [ ] **Step 4: Build fields with sources, then the ID field**

In `createdCaseTypeToFormValues.ts`, import `makeAttributesWithIdentifierFromKeyColumns` and `ChatCaseAttributeSource`, and delete `_makeMissingIdentifierAttributes`. Add:

```ts
/** One chat source matched to the catalog column, and date column, it names. */
type ResolvedSource = {
  source: ChatCaseAttributeSource;
  column: CatalogColumn;
  bucketColumn: CatalogColumn | undefined;
};

/**
 * A field's sources the catalog knows, whose dataset has a join key, whose
 * type matches the field's first such source, and, on a per-period field,
 * whose date column is a date or timestamp column of its own dataset. The
 * planner refuses every other source.
 */
function _getResolvedSources(options: {
  sources: readonly ChatCaseAttributeSource[];
  columns: readonly CatalogColumn[];
  identifiedDatasetIds: ReadonlySet<string>;
  isPerPeriod: boolean;
}): ResolvedSource[] {
  const resolved = options.sources.flatMap((source): ResolvedSource[] => {
    const column = _findColumn(options.columns, source.columnId);
    const bucketColumn = source.bucketColumnId
      ? _findColumn(options.columns, source.bucketColumnId)
      : undefined;
    const isDateColumnUsable =
      !options.isPerPeriod ||
      (bucketColumn !== undefined &&
        bucketColumn.datasetId === source.datasetId &&
        ConceptAttribute.isBucketDateColumnType(bucketColumn.dataType));
    return column &&
      column.datasetId === source.datasetId &&
      options.identifiedDatasetIds.has(source.datasetId) &&
      isDateColumnUsable
      ? [{ source, column, bucketColumn: options.isPerPeriod ? bucketColumn : undefined }]
      : [];
  });
  const firstDataType = resolved[0]?.column.dataType;
  return resolved.filter((entry) => {
    return entry.column.dataType === firstDataType;
  });
}
```

Change plan 2 to 4's `_makeMappedAttribute` to take `sources: readonly [ResolvedSource, ...ResolvedSource[]]` in place of its one `column`: read the column type from `sources[0].column.dataType` wherever it read `column.dataType` (the rule check, `ConceptAttribute.getOutputDataType`), set `isIdentifier: false` (the fold makes the ID field), and build the drafts as:

```ts
      datasetColumn: options.sources.map(({ column, bucketColumn }) => {
        return {
          type: "dataset_column",
          conceptAttributeId,
          datasetId: column.datasetId,
          datasetColumnId: column.id,
          bucketColumnId: bucketColumn?.id,
        };
      }),
```

with `valuePickerRuleType` on the attribute (the value plan 2's `toAllowedRuleType` computes), not on a mapping draft. In `_attributesFromCaseType`, for a dataset attribute:

```ts
    const [firstSource, ...otherSources] = _getResolvedSources({
      sources: attribute.sources,
      columns,
      identifiedDatasetIds,
      isPerPeriod: attribute.valueShape === "bucketed_list",
    });
    if (!firstSource) {
      return [];
    }
```

and pass `sources: [firstSource, ...otherSources]` to `_makeMappedAttribute` (keep plans 3 and 4's shape and grain arguments), where `identifiedDatasetIds` is `new Set(caseType.identities.map((identity) => { return identity.datasetId; }))`. End `_attributesFromCaseType` with:

```ts
  const keyColumns = caseType.identities.flatMap((identity) => {
    const column = _findColumn(columns, identity.primaryKeyColumnId);
    return column && column.datasetId === identity.datasetId ? [column] : [];
  });
  return makeAttributesWithIdentifierFromKeyColumns({
    conceptId,
    keyColumns,
    attributes: mapped,
  });
```

Change the main function's docstring to: `Turns a chat-created case type into the payload the concept creator submits. A case type may draw columns from several datasets, so a field may read several sources, and the datasets' join keys become one ID field.`

- [ ] **Step 5: Run them and watch them pass**

Run: the command from Step 2.
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/views/OntologyDesignerApp/proposedCaseTypeToCreatedCaseType src/views/OntologyDesignerApp/createdCaseTypeToFormValues
git commit -m "feat(joined-cases): turn chat drafts into fields with sources and one ID field"
```

---

## Task 16: Form state holds sources, and the insert writes rules and positions

**Files:**
- Modify: `src/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes.ts` (types, type test, factories, plan 2's `withFieldDataTypes`)
- Create: `src/views/OntologyDesignerApp/ConceptCreatorView/makeSourceDatasetsFromAttributes/makeSourceDatasetsFromAttributes.ts` and `.test.ts`
- Modify: `src/views/OntologyDesignerApp/ConceptCreatorView/index.tsx` (`transformValues`, `validate`)
- Modify: `src/views/OntologyDesignerApp/insertConceptFromFormValues/insertConceptFromFormValues.ts`, its test
- Modify: `src/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes.test.ts` (plan 2's `withFieldDataTypes` cases)
- Modify: `src/views/OntologyDesignerApp/ConceptCreatorView/keepKeyAndLabelFieldsSingle/keepKeyAndLabelFieldsSingle.ts` and its test (plans 3 and 4's)

- [ ] **Step 1: Write the failing tests**

Create `makeSourceDatasetsFromAttributes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { makeDefaultDatasetColumnAttribute } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import { makeSourceDatasetsFromAttributes } from "@/views/OntologyDesignerApp/ConceptCreatorView/makeSourceDatasetsFromAttributes/makeSourceDatasetsFromAttributes";
import type { DatasetWithColumns } from "$/models/datasets/Dataset/Dataset.types";
import type { DatasetColumnRead } from "$/models/datasets/DatasetColumn/DatasetColumn.types";
import type { ConceptId } from "$/models/ontology/Concept/Concept.types";

const CONCEPT_ID = uuid<ConceptId>();

function _dataset(name: string): DatasetWithColumns {
  const id = uuid<DatasetWithColumns["id"]>();
  const column = {
    id: uuid<DatasetColumnRead["id"]>(),
    datasetId: id,
    name: `${name}_key`,
    dataType: "varchar",
  } as DatasetColumnRead;
  return { id, name, columns: [column] } as unknown as DatasetWithColumns;
}

const LINE_LIST = _dataset("line list");
const LABS = _dataset("labs");

function _fieldReading(...datasets: DatasetWithColumns[]) {
  const [first, ...rest] = datasets;
  const field = makeDefaultDatasetColumnAttribute({
    conceptId: CONCEPT_ID,
    name: "Result",
    dataset: first!,
    datasetColumn: first!.columns[0]!,
  });
  return {
    ...field,
    mappings: {
      ...field.mappings,
      datasetColumn: [
        ...field.mappings.datasetColumn,
        ...rest.map((dataset) => {
          return {
            type: "dataset_column" as const,
            conceptAttributeId: field.id,
            datasetId: dataset.id,
            datasetColumnId: dataset.columns[0]!.id,
            bucketColumnId: undefined,
          };
        }),
      ],
    },
  };
}

describe("makeSourceDatasetsFromAttributes", () => {
  it("adds a dataset that only a field's second source reads, after the first", () => {
    expect(
      makeSourceDatasetsFromAttributes({
        attributes: [_fieldReading(LINE_LIST, LABS)],
        sourceDatasets: [],
        datasetsById: { [LINE_LIST.id]: LINE_LIST, [LABS.id]: LABS },
      }).map((sourceDataset) => {
        return sourceDataset.dataset.name;
      }),
    ).toEqual(["line list", "labs"]);
  });

  it("keeps the key column already chosen for a dataset", () => {
    const chosen = {
      dataset: LINE_LIST,
      primaryKeyColumnId: LINE_LIST.columns[0]!.id,
    };
    expect(
      makeSourceDatasetsFromAttributes({
        attributes: [_fieldReading(LINE_LIST)],
        sourceDatasets: [chosen],
        datasetsById: { [LINE_LIST.id]: LINE_LIST },
      }),
    ).toEqual([chosen]);
  });

  it("drops a dataset no field reads any more", () => {
    expect(
      makeSourceDatasetsFromAttributes({
        attributes: [_fieldReading(LINE_LIST)],
        sourceDatasets: [
          { dataset: LINE_LIST, primaryKeyColumnId: undefined },
          { dataset: LABS, primaryKeyColumnId: LABS.columns[0]!.id },
        ],
        datasetsById: { [LINE_LIST.id]: LINE_LIST, [LABS.id]: LABS },
      }).map((sourceDataset) => {
        return sourceDataset.dataset.name;
      }),
    ).toEqual(["line list"]);
  });
});
```

In `insertConceptFromFormValues.test.ts`, change the fixture attribute's `mappings.datasetColumn` to `[]` and add `valuePickerRuleType: undefined,` to it; move plan 3's "a list field's mapping has no rule" case to assert the **attribute** row has no rule; and add:

```ts
  it("writes one mapping per source, positioned in list order, and the field's rule on the field", async () => {
    const values = _makeFormValues();
    const [manualAttribute] = values.attributes;
    const fieldId = uuid<ConceptAttributeId>();
    await insertConceptFromFormValues({
      ...values,
      attributes: [
        { ...manualAttribute!, isLabel: false },
        {
          ...manualAttribute!,
          id: fieldId,
          isLabel: true,
          mappingType: "dataset_column",
          valuePickerRuleType: "first",
          mappings: {
            manualEntry: { type: "manual_entry", conceptAttributeId: fieldId },
            datasetColumn: [
              { type: "dataset_column", conceptAttributeId: fieldId, datasetId: uuid(), datasetColumnId: uuid(), bucketColumnId: undefined },
              { type: "dataset_column", conceptAttributeId: fieldId, datasetId: uuid(), datasetColumnId: uuid(), bucketColumnId: undefined },
            ],
          },
        },
      ],
    });

    const [createParams] = conceptCreateMock.mock.calls[0] as [
      {
        attributes: Array<{ id: string; valuePickerRuleType?: string }>;
        mappings: Array<{ type: string; position?: number }>;
      },
    ];
    expect({
      rule: createParams.attributes.find((attribute) => {
        return attribute.id === fieldId;
      })?.valuePickerRuleType,
      positions: createParams.mappings
        .filter((mapping) => {
          return mapping.type === "dataset_column";
        })
        .map((mapping) => {
          return mapping.position;
        }),
    }).toEqual({ rule: "first", positions: [0, 1] });
  });
```

In `conceptFormTypes.test.ts`, move plan 2's `withFieldDataTypes` fixtures' rule from `mappings.datasetColumn` onto the attribute and wrap their `mappings.datasetColumn` in an array.

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm test:frontend src/views/OntologyDesignerApp/ConceptCreatorView src/views/OntologyDesignerApp/insertConceptFromFormValues`
Expected: FAIL: the helper does not exist, the insert writes one mapping per field with no position, and `withFieldDataTypes` reads a single mapping draft.

- [ ] **Step 3: Change the form types**

In `conceptFormTypes.ts`, add `import type { IsEqual } from "type-fest";` and replace `AttributeFormValues` and its type test with:

```ts
/**
 * One source of a dataset-column field, as the create form edits it. Its
 * position is its index in the field's list, written when the form submits.
 */
export type AttributeSourceFormValues = SetOptional<
  DatasetColumnMapping<"Insert">,
  "workspaceId" | "position"
>;

export type AttributeFormValues = SetRequired<
  SetOptional<ConceptAttributeModel["Insert"], "workspaceId">,
  "id"
> & {
  mappings: {
    manualEntry: SetOptional<ManualEntryMapping<"Insert">, "workspaceId">;
    /** Every source of a dataset-column field, in read order. Empty otherwise. */
    datasetColumn: AttributeSourceFormValues[];
  };
};

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// Type test to make sure `AttributeFormValues.mappings` has a key for every
// mapping kind.
type _Test_AttributeFormValues = Expect<
  IsEqual<
    keyof AttributeFormValues["mappings"],
    keyof CamelCaseKeys<AttributeMappingRegistry>
  >
>;
```

In `makeDefaultDatasetColumnAttribute`, put the rule plan 2 defaults to (`most_frequent`) on the attribute as `valuePickerRuleType`, and replace its `datasetColumn` draft with a one-element array:

```ts
      datasetColumn: [
        {
          type: "dataset_column",
          conceptAttributeId,
          datasetId: dataset.id,
          datasetColumnId: datasetColumn.id,
          bucketColumnId: undefined,
        },
      ],
```

In `makeDefaultManualEntryAttribute`, add `valuePickerRuleType: undefined,` and set `datasetColumn: [],`.

In plan 2's `withFieldDataTypes`, replace the destructuring of `attribute.mappings.datasetColumn` with:

```ts
    const firstColumnId = attribute.mappings.datasetColumn[0]?.datasetColumnId;
    const columnDataType = firstColumnId
      ? columnDataTypesById.get(firstColumnId)
      : undefined;
    const ruleType = attribute.valuePickerRuleType;
```

return the attribute unchanged when `ruleType` is `undefined` as well, and pass `ruleType` where it passed the mapping's rule. Its docstring gains: `A field's sources share one type, so its first source's column gives it.`

- [ ] **Step 4: Write the source datasets helper**

Create `makeSourceDatasetsFromAttributes.ts`:

```ts
import { prop } from "@avandar/utils";
import { removeDuplicates } from "@/lib/utils/arrays/removeDuplicates/removeDuplicates";
import type { DatasetWithColumns } from "$/models/datasets/Dataset/Dataset.types";
import type {
  AttributeFormValues,
  ConceptFormValues,
} from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";

type SourceDataset = ConceptFormValues["sourceDatasets"][number];

/**
 * The datasets a case type draws from, recomputed after its fields' sources
 * change: one entry per dataset any field reads, in first-use order, each
 * keeping the join key already chosen for it. Called by the create form after
 * a field or a source is added or removed.
 */
export function makeSourceDatasetsFromAttributes(
  options: Readonly<{
    attributes: readonly AttributeFormValues[];
    sourceDatasets: readonly SourceDataset[];
    datasetsById: Readonly<Record<string, DatasetWithColumns | undefined>>;
  }>,
): SourceDataset[] {
  const usedDatasetIds = removeDuplicates(
    options.attributes.flatMap((attribute) => {
      return attribute.mappings.datasetColumn.map(prop("datasetId"));
    }),
  );
  return usedDatasetIds.flatMap((datasetId) => {
    const existing = options.sourceDatasets.find((sourceDataset) => {
      return sourceDataset.dataset.id === datasetId;
    });
    if (existing) {
      return [existing];
    }
    const dataset = options.datasetsById[datasetId];
    return dataset ? [{ dataset, primaryKeyColumnId: undefined }] : [];
  });
}
```

- [ ] **Step 5: Write rules on fields and one mapping per source**

In `insertConceptFromFormValues.ts`, import `ConceptAttribute` as a value, remove `hasPropKeys`, and replace `_mappingsFromAttributes` (including plan 3's list handling) with:

```ts
/** Every field's mappings: one per source, positioned in list order. */
function _mappingsFromAttributes(
  attributes: ConceptFormSubmitValues["attributes"],
  workspaceId: Workspace.Id,
): Array<AttributeMapping<"Insert">> {
  return attributes.flatMap((attribute): Array<AttributeMapping<"Insert">> => {
    return match(attribute.mappingType)
      .with("manual_entry", () => {
        return [{ ...attribute.mappings.manualEntry, workspaceId }];
      })
      .with("dataset_column", () => {
        return attribute.mappings.datasetColumn.map((source, position) => {
          return { ...source, position, workspaceId };
        });
      })
      .exhaustive();
  });
}

/**
 * A field's row. The form keeps a rule on every dataset field so the user can
 * switch back to one value, but only a field that reduces its rows stores
 * one, as `concept_attributes__value_picker_rule_type_by_shape` requires.
 */
function _attributeRowFromFormValues(
  attribute: ConceptFormSubmitValues["attributes"][number],
  workspaceId: Workspace.Id,
): ConceptAttribute.T<"Insert"> {
  const reducesRows =
    attribute.mappingType === "dataset_column" &&
    ConceptAttribute.getValueShape(attribute) !== "list";
  return {
    ...attribute,
    workspaceId,
    valuePickerRuleType: reducesRows ? attribute.valuePickerRuleType : undefined,
  };
}
```

and in `insertConceptFromFormValues`, map `attributes` through `_attributeRowFromFormValues(attribute, workspaceId)`.

- [ ] **Step 6: Build the ID field on submit**

In `ConceptCreatorView/index.tsx`, import `makeAttributesWithIdentifierFromKeyColumns`, and replace the body of `transformValues` (plan 3's `keepKeyAndLabelFieldsSingle` and plan 2's `withFieldDataTypes` stay, in this order) with:

```ts
    // The submitted `attributes` are every field, the label flagged and kept
    // to one value, each typed from its rule, then the datasets' join keys
    // folded into one ID field, which sets its own type.
    transformValues: (values: ConceptFormValues): ConceptFormSubmitValues => {
      const keyColumns = values.sourceDatasets.flatMap(
        ({ dataset, primaryKeyColumnId }) => {
          const column = dataset.columns.find(propEq("id", primaryKeyColumnId));
          return column ? [column] : [];
        },
      );
      const labelledAttributes = values.datasetColumnAttributes
        .concat(values.manualEntryAttributes)
        .map((attribute) => {
          return attribute.id === values.labelAttributeId
            ? setValue(attribute, "isLabel", true)
            : attribute;
        });
      const typedAttributes = withFieldDataTypes({
        attributes: keepKeyAndLabelFieldsSingle({
          attributes: labelledAttributes,
          labelAttributeId: values.labelAttributeId,
        }),
        sourceDatasets: values.sourceDatasets,
      });
      return {
        ...values,
        attributes: makeAttributesWithIdentifierFromKeyColumns({
          conceptId: values.id,
          keyColumns,
          attributes: typedAttributes,
        }),
      };
    },
```

In `validate`, plan 4's `datasetColumnAttributes.bucketGrain` rule reads one date column. Make it read every source's:

```ts
        // Each source of a per-period field shows its own date column picker
        // in the sources editor. This rule only stops the submit while one
        // is missing.
        bucketGrain: (bucketGrain, values, path) => {
          const attribute =
            values.datasetColumnAttributes[Number(path.split(".")[1])];
          const isAnyDateColumnMissing = (
            attribute?.mappings.datasetColumn ?? []
          ).some((source) => {
            return source.bucketColumnId === undefined;
          });
          return bucketGrain !== undefined && isAnyDateColumnMissing
            ? t`Choose the date column for each source of this field`
            : null;
        },
```

In plan 3's `keepKeyAndLabelFieldsSingle.ts`, plan 4 drops a key or label field's date column from its one mapping draft. Drop it from every source instead:

```ts
          mappings: {
            ...attribute.mappings,
            datasetColumn: attribute.mappings.datasetColumn.map((source) => {
              return { ...source, bucketColumnId: undefined };
            }),
          },
```

and in `keepKeyAndLabelFieldsSingle.test.ts`, plan 3's `_listField` builds `datasetColumn` as a one-element array, plan 4's "drops the period and date column from a key field that had one" sets `bucketColumnId` on `datasetColumn[0]`, and its last expectation reads `kept?.mappings.datasetColumn[0]?.bucketColumnId`.

Remove imports `transformValues` no longer uses.

- [ ] **Step 7: Run them and watch them pass**

Run: `pnpm test:frontend src/views/OntologyDesignerApp/ConceptCreatorView src/views/OntologyDesignerApp/insertConceptFromFormValues src/views/OntologyDesignerApp/makeAttributesWithIdentifierFromKeyColumns`
Expected: PASS.

- [ ] **Step 8: Check creation works again**

```bash
ava supabase status
pnpm test:db
```

Expected: PASS. The browser path is covered by Task 21.

- [ ] **Step 9: Commit**

```bash
git add src/views/OntologyDesignerApp/ConceptCreatorView src/views/OntologyDesignerApp/insertConceptFromFormValues
git commit -m "feat(joined-cases): hold a field's sources in the create form and write their positions"
```

---

## Task 17: The multi-source editor

**Files:**
- Create: `src/components/caseFields/FieldSourcesEditor/FieldSourcesEditor.tsx`
- Create: `src/components/caseFields/FieldSourcesEditor/FieldSourceRow.tsx`
- Create: `src/components/caseFields/FieldSourcesEditor/FieldSourcesEditor.module.css`
- Create: `src/components/caseFields/FieldSourcesEditor/FieldSourcesEditor.test.tsx`
- Create: `src/components/caseFields/FieldSourcesEditor/getAddableSourceColumns/getAddableSourceColumns.ts` and `.test.ts`
- Modify: `src/components/caseFields/PeriodControls/PeriodControls.tsx` and `.test.tsx` (plan 4's)

A per-period field's sources each have a date column, so the editor shows one date column picker per source, and plan 4's `PeriodControls` learns to show only the period.

Load the **`impeccable`** skill before Step 5. This is a new surface: it sits inside a field's settings in the create form and inside a field row of the chat draft card, beside plan 3's `ValueShapeControl`. Follow `DESIGN.md`'s Named Rules (neutral by default, blue only for focus and selection, 6px radius, no `Paper` inside the slate, hairline before shadow) and `docs/design/app-view-layout.md`. Copy says "source", "field", "column" and "date column", never "mapping" or "bucket". The code below is the functional baseline the impeccable pass refines; keep its props and accessible names, which Tasks 18, 19 and 21 rely on.

- [ ] **Step 1: Write the failing tests**

Create `getAddableSourceColumns/getAddableSourceColumns.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getAddableSourceColumns } from "@/components/caseFields/FieldSourcesEditor/getAddableSourceColumns/getAddableSourceColumns";

const COLUMNS = [
  { id: "c-result", name: "result", datasetId: "line-list", dataType: "varchar" as const },
  { id: "c-age", name: "age", datasetId: "line-list", dataType: "bigint" as const },
  { id: "c-lab-result", name: "lab_result", datasetId: "labs", dataType: "varchar" as const },
  { id: "c-orphan", name: "orphan", datasetId: "unnamed", dataType: "varchar" as const },
];
const DATASET_NAMES_BY_ID = { "line-list": "Line list", labs: "Labs" };

describe("getAddableSourceColumns", () => {
  it("offers same-type columns the field does not read, grouped by dataset name", () => {
    expect(
      getAddableSourceColumns({
        sourceColumnIds: ["c-result"],
        candidateColumns: COLUMNS,
        datasetNamesById: DATASET_NAMES_BY_ID,
      }),
    ).toEqual([{ group: "Labs", items: [{ value: "c-lab-result", label: "lab_result" }] }]);
  });

  it("offers nothing while the field's first source is unknown", () => {
    expect(
      getAddableSourceColumns({
        sourceColumnIds: ["c-missing"],
        candidateColumns: COLUMNS,
        datasetNamesById: DATASET_NAMES_BY_ID,
      }),
    ).toEqual([]);
  });
});
```

Create `FieldSourcesEditor.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { FieldSourcesEditor } from "@/components/caseFields/FieldSourcesEditor/FieldSourcesEditor";
import { fireEvent, render, screen, within } from "@/test-utils";
import type { FieldSourceItem } from "@/components/caseFields/FieldSourcesEditor/FieldSourcesEditor";

const SOURCES: FieldSourceItem[] = [
  { key: "c-result", datasetName: "Line list", columnName: "result", canRemove: true },
  { key: "c-lab-result", datasetName: "Labs", columnName: "lab_result", canRemove: true },
];

describe("FieldSourcesEditor", () => {
  it("lists every source with its dataset, in order", () => {
    render(
      <FieldSourcesEditor
        fieldName="Result"
        sources={SOURCES}
        addableColumns={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    const items = within(
      screen.getByRole("group", { name: "Sources of Result" }),
    ).getAllByRole("listitem");
    expect(
      items.map((item) => {
        return item.textContent;
      }),
    ).toEqual(["Line list result", "Labs lab_result"]);
  });

  it("reports which source to remove", () => {
    const onRemove = vi.fn();
    render(
      <FieldSourcesEditor
        fieldName="Result"
        sources={SOURCES}
        addableColumns={[]}
        onAdd={vi.fn()}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Remove lab_result from Result" }),
    );
    expect(onRemove).toHaveBeenCalledWith("c-lab-result");
  });

  it("disables removing a source the field cannot lose", () => {
    render(
      <FieldSourcesEditor
        fieldName="Result"
        sources={[{ ...SOURCES[0]!, canRemove: false }]}
        addableColumns={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Remove result from Result" }),
    ).toBeDisabled();
  });

  it("moves a source down, and offers no move past either end", () => {
    const onMove = vi.fn();
    render(
      <FieldSourcesEditor
        fieldName="Result"
        sources={SOURCES}
        addableColumns={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onMove={onMove}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Move result down" }));
    expect(onMove.mock.calls).toEqual([["c-result", "down"]]);
    expect(screen.getByRole("button", { name: "Move result up" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Move lab_result down" }),
    ).toBeDisabled();
  });

  it("offers no move buttons when reordering is not allowed", () => {
    render(
      <FieldSourcesEditor
        fieldName="Result"
        sources={SOURCES}
        addableColumns={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /^Move / }),
    ).not.toBeInTheDocument();
  });

  it("offers a date column choice for each source of a per-period field", () => {
    const onDateColumnChange = vi.fn();
    render(
      <FieldSourcesEditor
        fieldName="Titer"
        sources={[
          {
            ...SOURCES[0]!,
            dateColumn: {
              columnId: undefined,
              options: [{ value: "c-onset", label: "onset" }],
            },
          },
        ]}
        addableColumns={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onDateColumnChange={onDateColumnChange}
      />,
    );
    expect(
      screen.getByRole("textbox", { name: "Date column for result" }),
    ).toBeInTheDocument();
  });
});
```

(If Mantine's `Select` renders as `combobox` in this test environment, use that role, as the e2e specs do.)

Add to plan 4's `PeriodControls.test.tsx`:

```tsx
  it("shows only the period when the field's sources pick their own date columns", () => {
    render(
      <PeriodControls
        fieldName="Temperature"
        bucketGrain="month"
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryAllByLabelText("Date column for Temperature")).toEqual(
      [],
    );
  });
```

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm test:frontend src/components/caseFields/FieldSourcesEditor src/components/caseFields/PeriodControls`
Expected: FAIL, `Failed to resolve import` for the editor, and the new `PeriodControls` case finds a date column picker.

- [ ] **Step 3: Write `getAddableSourceColumns`**

Create `getAddableSourceColumns/getAddableSourceColumns.ts`:

```ts
import { makeBucketRecord } from "@avandar/utils";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

/** One dataset's columns a field could add as a source, for a grouped select. */
export type AddableSourceColumnGroup = {
  group: string;
  items: Array<{ value: string; label: string }>;
};

type CandidateColumn = Pick<
  DatasetColumn.T,
  "id" | "name" | "datasetId" | "dataType"
>;

/**
 * The columns a field can add as a source: the same type as its first
 * source, not already read by it, grouped and sorted by dataset name. A
 * dataset whose name has not loaded yet is left out rather than shown by id.
 * Use it wherever a field's sources are edited, such as the create form.
 */
export function getAddableSourceColumns(
  options: Readonly<{
    sourceColumnIds: readonly string[];
    candidateColumns: readonly CandidateColumn[];
    datasetNamesById: Readonly<Record<string, string | undefined>>;
  }>,
): AddableSourceColumnGroup[] {
  const firstSourceColumn = options.candidateColumns.find((column) => {
    return column.id === options.sourceColumnIds[0];
  });
  if (!firstSourceColumn) {
    return [];
  }
  const sourceColumnIds = new Set(options.sourceColumnIds);
  const addableColumns = options.candidateColumns.filter((column) => {
    return (
      column.dataType === firstSourceColumn.dataType &&
      !sourceColumnIds.has(column.id)
    );
  });
  return Object.entries(makeBucketRecord(addableColumns, { key: "datasetId" }))
    .flatMap(([datasetId, columns]) => {
      const group = options.datasetNamesById[datasetId];
      return group === undefined
        ? []
        : [
            {
              group,
              items: columns.map((column) => {
                return { value: column.id, label: column.name };
              }),
            },
          ];
    })
    .sort((left, right) => {
      return left.group.localeCompare(right.group);
    });
}
```

- [ ] **Step 4: Write the editor**

In plan 4's `PeriodControls.tsx`, make the date column optional. In `Props`, replace `bucketColumnId` and `dateColumnOptions` with:

```ts
  /** Omit with `dateColumnOptions` when each source picks its own. */
  bucketColumnId?: string | undefined;
  /**
   * The date and timestamp columns of the field's dataset. Omit it when the
   * field's sources each pick their own date column, as `FieldSourcesEditor`
   * does; the controls then show only the period.
   */
  dateColumnOptions?: readonly DateColumnOption[];
```

and wrap the second `Select` (the date column) in `{dateColumnOptions ? ( ... ) : null}`. Every other line, the period `Select` included, is unchanged, so plan 4's cases still pass.

Create `FieldSourcesEditor.module.css`:

```css
.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--mantine-spacing-xs);
  align-items: center;
  padding-block: 2px;
}

.icon {
  color: var(--mantine-color-neutral-6);
}

.dateColumn {
  grid-column: 2 / -1;
}
```

Create `FieldSourceRow.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Group, Select, Text } from "@mantine/core";
import {
  IconArrowDown,
  IconArrowUp,
  IconDatabase,
  IconX,
} from "@tabler/icons-react";
import css from "@/components/caseFields/FieldSourcesEditor/FieldSourcesEditor.module.css";
import type { FieldSourceItem } from "@/components/caseFields/FieldSourcesEditor/FieldSourcesEditor";
import type { ReactNode } from "react";

type Props = {
  fieldName: string;
  source: FieldSourceItem;
  size: "xs" | "sm";
  isFirst: boolean;
  isLast: boolean;
  onRemove: (key: string) => void;
  onMove?: (key: string, direction: "up" | "down") => void;
  onDateColumnChange?: (key: string, columnId: string) => void;
};

/** One source of a field: its dataset and column, and what can be done to it. */
export function FieldSourceRow({
  fieldName,
  source,
  size,
  isFirst,
  isLast,
  onRemove,
  onMove,
  onDateColumnChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  return (
    <li className={css.row}>
      <IconDatabase size={14} aria-hidden className={css.icon} />
      <Text size={size} truncate>
        <Text span c="dimmed" inherit>
          {source.datasetName}
        </Text>{" "}
        {source.columnName}
      </Text>
      <Group gap={2} wrap="nowrap">
        {onMove ? (
          <>
            <ActionIcon
              size="sm"
              variant="subtle"
              color="neutral"
              disabled={isFirst}
              aria-label={t`Move ${source.columnName} up`}
              onClick={() => {
                onMove(source.key, "up");
              }}
            >
              <IconArrowUp size={14} />
            </ActionIcon>
            <ActionIcon
              size="sm"
              variant="subtle"
              color="neutral"
              disabled={isLast}
              aria-label={t`Move ${source.columnName} down`}
              onClick={() => {
                onMove(source.key, "down");
              }}
            >
              <IconArrowDown size={14} />
            </ActionIcon>
          </>
        ) : null}
        <ActionIcon
          size="sm"
          variant="subtle"
          color="neutral"
          disabled={!source.canRemove}
          aria-label={t`Remove ${source.columnName} from ${fieldName}`}
          onClick={() => {
            onRemove(source.key);
          }}
        >
          <IconX size={14} />
        </ActionIcon>
      </Group>
      {source.dateColumn && onDateColumnChange ? (
        <Select
          size={size}
          className={css.dateColumn}
          label={t`Date column for ${source.columnName}`}
          data={source.dateColumn.options}
          value={source.dateColumn.columnId ?? null}
          allowDeselect={false}
          onChange={(columnId) => {
            if (columnId) {
              onDateColumnChange(source.key, columnId);
            }
          }}
        />
      ) : null}
    </li>
  );
}
```

Create `FieldSourcesEditor.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Select, Stack, Text } from "@mantine/core";
import { FieldSourceRow } from "@/components/caseFields/FieldSourcesEditor/FieldSourceRow";
import css from "@/components/caseFields/FieldSourcesEditor/FieldSourcesEditor.module.css";
import type { AddableSourceColumnGroup } from "@/components/caseFields/FieldSourcesEditor/getAddableSourceColumns/getAddableSourceColumns";
import type { ReactNode } from "react";

/** One source of a field as the editor lists it. */
export type FieldSourceItem = {
  /** Stable while the source is listed, such as its column id. */
  key: string;
  datasetName: string;
  columnName: string;
  canRemove: boolean;
  /** Set on a per-period field's source: its date column and the choices. */
  dateColumn?: {
    columnId: string | undefined;
    options: ReadonlyArray<{ value: string; label: string }>;
  };
};

type Props = {
  fieldName: string;
  sources: readonly FieldSourceItem[];
  addableColumns: readonly AddableSourceColumnGroup[];
  size?: "xs" | "sm";
  onAdd: (columnId: string) => void;
  onRemove: (key: string) => void;
  /** Omit to list the sources without letting the user reorder them. */
  onMove?: (key: string, direction: "up" | "down") => void;
  onDateColumnChange?: (key: string, columnId: string) => void;
};

/**
 * Lists the columns one field reads, in the order it reads them, and lets
 * the user add a column of the same type, remove one, reorder them, and on a
 * per-period field choose each one's date column. A field keeps the earliest
 * source's value when it keeps one, so the order is meaningful. Controlled:
 * the caller owns the sources.
 */
export function FieldSourcesEditor({
  fieldName,
  sources,
  addableColumns,
  size = "sm",
  onAdd,
  onRemove,
  onMove,
  onDateColumnChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const hasAddableColumns = addableColumns.some((group) => {
    return group.items.length > 0;
  });
  return (
    <Stack gap={4} role="group" aria-label={t`Sources of ${fieldName}`}>
      <Text size={size} fw={500}>
        {t`Sources`}
      </Text>
      <ol className={css.list}>
        {sources.map((source, index) => {
          return (
            <FieldSourceRow
              key={source.key}
              fieldName={fieldName}
              source={source}
              size={size}
              isFirst={index === 0}
              isLast={index === sources.length - 1}
              onRemove={onRemove}
              onMove={onMove}
              onDateColumnChange={onDateColumnChange}
            />
          );
        })}
      </ol>
      <Select
        size={size}
        label={t`Add a source`}
        placeholder={
          hasAddableColumns
            ? t`Choose a column of the same type`
            : t`No other column has this type`
        }
        data={addableColumns.map((group) => {
          return { group: group.group, items: group.items };
        })}
        value={null}
        searchable
        disabled={!hasAddableColumns}
        onChange={(columnId) => {
          if (columnId) {
            onAdd(columnId);
          }
        }}
      />
    </Stack>
  );
}
```

- [ ] **Step 5: Run the impeccable pass**

With `impeccable` loaded, review the editor inside both hosts once Tasks 18 and 19 mount it (or in the running create form). Keep the props, the group name `Sources of <field>`, and the button and select names exactly as tested. Re-run the tests afterwards.

- [ ] **Step 6: Run them and watch them pass**

Run: `pnpm test:frontend src/components/caseFields`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/caseFields/FieldSourcesEditor src/components/caseFields/PeriodControls
git commit -m "feat(joined-cases): add the field sources editor"
```

---

## Task 18: The create form edits a field's sources

**Files:**
- Create: `src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnSourcesField.tsx`
- Modify: `src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator.tsx`
- Modify: `src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/index.tsx`
- Modify: `src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/IdentifierBlock/index.tsx:21-29`
- Modify: plan 2's `DatasetColumnMappingCreator.test.tsx` (fixture shape)

This task wires Tasks 16 and 17 into the form; Task 21's e2e is its end-to-end test.

- [ ] **Step 1: Write the form adapter**

The form is uncontrolled, so setting a value does not re-render a component. Plan 4's `DatasetColumnMappingCreator` therefore mirrors a field's shape in state and writes both; this task mirrors the field's sources the same way, in the same component, and keeps the adapter below stateless.

Create `DatasetColumnSourcesField.tsx`:

```tsx
import { prop } from "@avandar/utils";
import { useMemo } from "react";
import { makeDateColumnOptions } from "@/components/caseFields/PeriodControls/PeriodControls";
import { FieldSourcesEditor } from "@/components/caseFields/FieldSourcesEditor/FieldSourcesEditor";
import { getAddableSourceColumns } from "@/components/caseFields/FieldSourcesEditor/getAddableSourceColumns/getAddableSourceColumns";
import type { DatasetWithColumns } from "$/models/datasets/Dataset/Dataset.types";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { DatasetColumnId } from "$/models/datasets/DatasetColumn/DatasetColumn.types";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { ConceptAttributeId } from "$/models/ontology/ConceptAttribute/ConceptAttribute.types";
import type { FieldSourceItem } from "@/components/caseFields/FieldSourcesEditor/FieldSourcesEditor";
import type { AttributeSourceFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import type { ReactNode } from "react";

/** Every column of every dataset, with its dataset, by column id. */
export type DatasetColumnLookup = Readonly<
  Record<string, { dataset: DatasetWithColumns; column: DatasetColumn.T } | undefined>
>;

type Props = {
  attributeId: ConceptAttributeId;
  attributeName: string;
  /** The field's sources, in read order. */
  sources: readonly AttributeSourceFormValues[];
  /** Set on a per-period field, whose every source needs a date column. */
  bucketGrain: ConceptAttribute.BucketGrain | undefined;
  datasetColumnLookup: DatasetColumnLookup;
  onChange: (nextSources: AttributeSourceFormValues[]) => void;
};

/**
 * The first date or timestamp column of the dataset a column belongs to,
 * the date column a source starts with when its field gains a period. Used
 * by `DatasetColumnMappingCreator` and the adapter below.
 */
export function getFirstDateColumnId(
  datasetColumnLookup: DatasetColumnLookup,
  columnId: string,
): DatasetColumnId | undefined {
  const dataset = datasetColumnLookup[columnId]?.dataset;
  // Every option is one of this dataset's column ids.
  return makeDateColumnOptions(dataset?.columns ?? [])[0]?.value as
    | DatasetColumnId
    | undefined;
}

function _makeSourceItems(
  options: Readonly<Omit<Props, "onChange" | "attributeId">>,
): FieldSourceItem[] {
  const { sources, bucketGrain, datasetColumnLookup } = options;
  return sources.map((source) => {
    const entry = datasetColumnLookup[source.datasetColumnId];
    return {
      key: source.datasetColumnId,
      datasetName: entry?.dataset.name ?? "",
      columnName: entry?.column.name ?? "",
      // A field always reads at least one column.
      canRemove: sources.length > 1,
      dateColumn:
        bucketGrain === undefined
          ? undefined
          : {
              columnId: source.bucketColumnId,
              options: makeDateColumnOptions(entry?.dataset.columns ?? []),
            },
    };
  });
}

/**
 * Binds one of the create form's dataset-column fields to the field sources
 * editor: turns the editor's add, remove, move and date column events into
 * the field's next list of sources. Rendered by `DatasetColumnMappingCreator`,
 * which owns the list.
 */
export function DatasetColumnSourcesField({
  attributeId,
  attributeName,
  sources,
  bucketGrain,
  datasetColumnLookup,
  onChange,
}: Readonly<Props>): ReactNode {
  const candidateColumns = useMemo(() => {
    return Object.values(datasetColumnLookup).flatMap((entry) => {
      return entry ? [entry.column] : [];
    });
  }, [datasetColumnLookup]);
  const datasetNamesById = useMemo(() => {
    return Object.fromEntries(
      Object.values(datasetColumnLookup).flatMap((entry) => {
        return entry ? [[entry.dataset.id, entry.dataset.name]] : [];
      }),
    );
  }, [datasetColumnLookup]);
  const _findSourceIdx = (columnId: string): number => {
    return sources.findIndex(({ datasetColumnId }) => {
      return datasetColumnId === columnId;
    });
  };
  return (
    <FieldSourcesEditor
      fieldName={attributeName}
      sources={_makeSourceItems({ attributeName, sources, bucketGrain, datasetColumnLookup })}
      addableColumns={getAddableSourceColumns({
        sourceColumnIds: sources.map(prop("datasetColumnId")),
        candidateColumns,
        datasetNamesById,
      })}
      onAdd={(columnId) => {
        const entry = datasetColumnLookup[columnId];
        if (entry) {
          onChange([
            ...sources,
            {
              type: "dataset_column",
              conceptAttributeId: attributeId,
              datasetId: entry.dataset.id,
              datasetColumnId: entry.column.id,
              // A per-period field's new source starts on its dataset's first
              // date column, as a field does when it gains a period.
              bucketColumnId:
                bucketGrain === undefined
                  ? undefined
                  : getFirstDateColumnId(datasetColumnLookup, columnId),
            },
          ]);
        }
      }}
      onRemove={(columnId) => {
        onChange(
          sources.filter(({ datasetColumnId }) => {
            return datasetColumnId !== columnId;
          }),
        );
      }}
      onMove={(columnId, direction) => {
        const from = _findSourceIdx(columnId);
        const to = direction === "up" ? from - 1 : from + 1;
        const moved = sources[from];
        if (moved && to >= 0 && to < sources.length) {
          const nextSources = sources.filter((_source, index) => {
            return index !== from;
          });
          nextSources.splice(to, 0, moved);
          onChange(nextSources);
        }
      }}
      onDateColumnChange={(columnId, bucketColumnId) => {
        onChange(
          sources.map((source) => {
            return source.datasetColumnId === columnId
              ? { ...source, bucketColumnId: bucketColumnId as DatasetColumnId }
              : source;
          }),
        );
      }}
    />
  );
}
```

If the component exceeds 45 lines, move the four handlers into a `_makeSourceHandlers({ sources, bucketGrain, datasetColumnLookup, attributeId, onChange })` helper in the same file.

- [ ] **Step 2: Own the sources beside the shape, and mount them**

In `DatasetColumnMappingCreator.tsx`:

1. Add props `datasetColumnLookup: DatasetColumnLookup;` and `onSourcesChange: () => void;` (documented "Called after the field's sources change, so the join keys can follow."), and import `DatasetColumnSourcesField`, `getFirstDateColumnId` and the `DatasetColumnLookup` type from `./DatasetColumnSourcesField`, and the `AttributeSourceFormValues` type from `conceptFormTypes`.
2. Add `"valuePickerRuleType"` to the attribute `keysAndProps` field list, delete the `mappingKeys` / `mappingInputProps` `keysAndProps` call on `mappings.datasetColumn`, and bind the rule `Select` (plan 4's `renderRuleSelect`) to `attributeKeys.valuePickerRuleType` and `attributeInputProps.valuePickerRuleType()`. Plan 2's column type for the rule options reads the first source's column: `datasetColumnLookup[sources[0]?.datasetColumnId ?? ""]?.column.dataType`.
3. Replace plan 4's `ShapeFields`, its `shape` state, `datasetId`, `dateColumnOptions` and `applyShape` with:

```ts
/** A field's stored shape, mirrored in state so the controls re-render. */
type ShapeFields = {
  isArray: boolean;
  bucketGrain: ConceptAttribute.BucketGrain | undefined;
};
```

```ts
  const formAttribute =
    conceptForm.getValues().datasetColumnAttributes[attributeIdx];
  const attributePath = `datasetColumnAttributes.${attributeIdx}` as const;
  // The form is uncontrolled, so setting a value does not re-render this
  // component; state does, and every change below writes both.
  const [shape, setShape] = useState<ShapeFields>(() => {
    return {
      isArray: formAttribute?.isArray ?? false,
      bucketGrain: formAttribute?.bucketGrain,
    };
  });
  const [sources, setSources] = useState<AttributeSourceFormValues[]>(() => {
    return formAttribute?.mappings.datasetColumn ?? [];
  });
  const valueShape = ConceptAttribute.getValueShape(shape);

  const writeSources = (nextSources: AttributeSourceFormValues[]) => {
    setSources(nextSources);
    conceptForm.setFieldValue(
      `${attributePath}.mappings.datasetColumn`,
      nextSources,
    );
    onSourcesChange();
  };

  // A field that gains a period starts each source on its dataset's first
  // date column; one that loses it drops every source's date column.
  const applyShape = (nextShape: ShapeFields) => {
    setShape(nextShape);
    conceptForm.setFieldValue(`${attributePath}.isArray`, nextShape.isArray);
    conceptForm.setFieldValue(
      `${attributePath}.bucketGrain`,
      nextShape.bucketGrain,
    );
    writeSources(
      sources.map((source) => {
        return {
          ...source,
          bucketColumnId:
            nextShape.bucketGrain === undefined
              ? undefined
              : (source.bucketColumnId ??
                getFirstDateColumnId(datasetColumnLookup, source.datasetColumnId)),
        };
      }),
    );
  };
```

4. In `ValueShapeControl`'s `onChange`, drop `bucketColumnId` from both objects (the `bucketed_list` one becomes `{ isArray: true, bucketGrain: shape.bucketGrain ?? "month" }`). In the `bucketed_list` arm, `PeriodControls` loses `bucketColumnId` and `dateColumnOptions` (each source picks its own date column in `FieldSourcesEditor`, and Task 17 Step 4 lets `PeriodControls` show only the period), and its `onChange` becomes `(choice) => { applyShape({ isArray: true, bucketGrain: choice.bucketGrain }); }`.
5. Directly after the `Allow manual edit` checkbox, render:

```tsx
        {formAttribute ? (
          <DatasetColumnSourcesField
            attributeId={formAttribute.id}
            attributeName={attributeName}
            sources={sources}
            bucketGrain={shape.bucketGrain}
            datasetColumnLookup={datasetColumnLookup}
            onChange={writeSources}
          />
        ) : null}
```

In plan 2's `DatasetColumnMappingCreator.test.tsx`, move the fixture's rule onto the attribute, wrap its mapping draft in an array, and pass `datasetColumnLookup={{}}` and `onSourcesChange={vi.fn()}`.

- [ ] **Step 3: Recompute join keys from every source**

In `DatasetColumnAttributesBlock/index.tsx`:

1. Delete `useMap`, `attributeToColumnMap`, `addedColumns`' `useMemo`, and every `updateAttributeToColumnMap` call. The map was also what re-rendered the block (the form is uncontrolled), so replace it with state that holds every column a field reads, which is also the picker's exclusion list:

```ts
  // Every column a field reads, as the column picker's exclusions. The form
  // is uncontrolled, so setting this state is also what re-renders the block,
  // and the join key block inside it, after a field or a source changes.
  const [addedColumns, setAddedColumns] = useState<readonly DatasetColumn.Id[]>(
    [],
  );
```

2. After `datasetColumnLookup`, add:

```ts
  const datasetsById = useMemo(() => {
    return makeObject(allDatasets ?? [], { keyFn: prop("id") });
  }, [allDatasets]);

  // Join keys follow the sources: a dataset any field reads needs one, and a
  // dataset none reads does not.
  const syncSourceDatasets = useCallback(() => {
    const values = conceptForm.getValues();
    conceptForm.setFieldValue(
      "sourceDatasets",
      makeSourceDatasetsFromAttributes({
        attributes: values.datasetColumnAttributes,
        sourceDatasets: values.sourceDatasets,
        datasetsById,
      }),
    );
    setAddedColumns(
      values.datasetColumnAttributes.flatMap((attribute) => {
        return attribute.mappings.datasetColumn.map(prop("datasetColumnId"));
      }),
    );
  }, [conceptForm, datasetsById]);
```

   Import `makeSourceDatasetsFromAttributes` from `@/views/OntologyDesignerApp/ConceptCreatorView/makeSourceDatasetsFromAttributes/makeSourceDatasetsFromAttributes`.

3. In `addDatasetColumnAsAttribute`, replace the `sourceDatasets` bookkeeping after `insertListItem` with `syncSourceDatasets();`. In `removeAttribute`, replace everything after `setSelectedAttributeId(newAttributes[0]?.id);` with `syncSourceDatasets();` and remove the `sourceDatasetId` lookup above it (it read `mappings.datasetColumn.datasetId`, which is now a list). Update both dependency lists.
4. Pass `datasetColumnLookup={datasetColumnLookup}` and `onSourcesChange={syncSourceDatasets}` to `DatasetColumnMappingCreator`.

In `IdentifierBlock/index.tsx`, replace `datasetIdsToPullFrom`'s body with:

```ts
    return [
      ...new Set(
        datasetColumnAttributes.flatMap((attribute) => {
          return attribute.mappings.datasetColumn.map(prop("datasetId"));
        }),
      ),
    ];
```

and remove `isDefined` from its imports if unused.

- [ ] **Step 4: Run the form's tests**

Run: `pnpm test:frontend src/views/OntologyDesignerApp/ConceptCreatorView src/components/caseFields`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/OntologyDesignerApp/ConceptCreatorView
git commit -m "feat(joined-cases): edit a field's sources in the create form"
```

---

## Task 19: The draft card edits a field's sources

**Files:**
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/useCaseTypeDraftEditor.ts`, its test
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftBlock.tsx`, `CaseTypeDraftCard.tsx`, `CaseTypeDraftSourceSection.tsx`, `CaseTypeDraftAttributeRow.tsx`
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftBlock.test.tsx` (fixture shape)

Spec §6.9. The first source is the field's key: the card never removes or reorders it.

- [ ] **Step 1: Write the failing tests**

In `useCaseTypeDraftEditor.test.ts`, change every fixture attribute from `datasetId: X, columnId: Y,` to `sources: [{ datasetId: X, columnId: Y }],` and every expectation reading `attribute.columnId` or `attribute.datasetId` to read `attribute.sources[0]?.columnId` or `.datasetId`. Then add:

```ts
  it("adds a source to a field, and refuses a column the field already reads", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.addAttributeSource(STATE_COLUMN_ID, {
        datasetId: CENSUS_DATASET_ID,
        columnId: POPULATION_COLUMN_ID,
      });
    });
    act(() => {
      result.current.addAttributeSource(STATE_COLUMN_ID, {
        datasetId: CENSUS_DATASET_ID,
        columnId: POPULATION_COLUMN_ID,
      });
    });

    const state = result.current.draft.attributes.find((attribute) => {
      return attribute.sources[0]?.columnId === STATE_COLUMN_ID;
    });
    expect(
      state?.sources.map((source) => {
        return source.columnId;
      }),
    ).toEqual([STATE_COLUMN_ID, POPULATION_COLUMN_ID]);
  });

  it("removes a field's extra source but never its first", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });
    act(() => {
      result.current.addAttributeSource(STATE_COLUMN_ID, {
        datasetId: CENSUS_DATASET_ID,
        columnId: POPULATION_COLUMN_ID,
      });
    });

    act(() => {
      result.current.removeAttributeSource(STATE_COLUMN_ID, STATE_COLUMN_ID);
      result.current.removeAttributeSource(STATE_COLUMN_ID, POPULATION_COLUMN_ID);
    });

    const state = result.current.draft.attributes.find((attribute) => {
      return attribute.sources[0]?.columnId === STATE_COLUMN_ID;
    });
    expect(
      state?.sources.map((source) => {
        return source.columnId;
      }),
    ).toEqual([STATE_COLUMN_ID]);
  });

  it("removing a dataset also removes its columns from other fields' sources", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });
    act(() => {
      result.current.addAttributeSource(STATE_COLUMN_ID, {
        datasetId: CENSUS_DATASET_ID,
        columnId: POPULATION_COLUMN_ID,
      });
    });

    act(() => {
      result.current.removeSourceDataset(CENSUS_DATASET_ID);
    });

    expect(
      result.current.draft.attributes.flatMap((attribute) => {
        return attribute.sources.map((source) => {
          return source.datasetId;
        });
      }),
    ).not.toContain(CENSUS_DATASET_ID);
  });
```

In `CaseTypeDraftBlock.test.tsx`, move its draft fixture to `sources` the same way.

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm test:frontend src/components/ChatPanel/CaseTypeDraftBlock`
Expected: FAIL: `addAttributeSource` is not a function, and grouping reads `attribute.datasetId`.

- [ ] **Step 3: Key fields by their first source, and edit sources**

In `useCaseTypeDraftEditor.ts`:

1. Import `ChatCaseAttributeSource`, and add to `CaseTypeDraftEditor`:

```ts
  /** Adds a column to a field's sources, unless the field already reads it. */
  addAttributeSource: (
    columnId: string,
    source: ChatCaseAttributeSource,
  ) => void;
  /** Removes one of a field's sources. A field's first source stays. */
  removeAttributeSource: (columnId: string, sourceColumnId: string) => void;
  /** Sets the date column of one source of a per-period field. */
  setAttributeSourceDateColumn: (
    columnId: string,
    sourceColumnId: string,
    bucketColumnId: string,
  ) => void;
```

   Every per-field setter (plan 3's `setAttributeValueShape`, plan 4's `setAttributeBucket`, and the existing ones) names the field by its first source's column; say so in the type's docstring.
2. Replace `_mapAttribute` with:

```ts
/**
 * Updates the field whose first source reads `columnId`. A field is named by
 * that column throughout the card; the parser keeps it unique and the card
 * never removes or reorders a first source, so the name never changes.
 */
function _mapAttribute(
  draft: ChatProposedCaseType,
  columnId: string,
  update: (attribute: ChatProposedCaseAttribute) => ChatProposedCaseAttribute,
): ChatProposedCaseType {
  return {
    ...draft,
    attributes: draft.attributes.map((attribute) => {
      return attribute.sources[0]?.columnId === columnId
        ? update(attribute)
        : attribute;
    }),
  };
}
```

3. Group `sourceGroups` by `attribute.sources[0]?.datasetId`.
4. In `removeSourceDataset`, replace the `attributes:` expression with:

```ts
          attributes: current.attributes
            .filter((attribute) => {
              return attribute.sources[0]?.datasetId !== datasetId;
            })
            .map((attribute) => {
              return {
                ...attribute,
                sources: attribute.sources.filter((source) => {
                  return source.datasetId !== datasetId;
                }),
              };
            }),
```

   and its comment to: `Dropping the source alone would leave fields reading a dataset with no join key, which the relation builder rejects, so its fields, and its columns in other fields, go too.`
5. Plan 4's `setAttributeBucket(columnId, { bucketGrain, bucketColumnId })` set one date column. A field's sources may be in several datasets, each with its own date columns, so it now takes the first date column of each dataset and gives it to every source that has none. Replace its type with:

```ts
  /**
   * Keeps one value per period for the field whose first source reads
   * `columnId`: sets its shape and period, and gives each source without a
   * date column the first one of its dataset. A join key and the label keep
   * one value.
   */
  setAttributeBucket: (
    columnId: string,
    bucket: Readonly<{
      bucketGrain: ChatCaseBucketGrain;
      firstDateColumnIdByDatasetId: Readonly<Record<string, string | undefined>>;
    }>,
  ) => void;
```

   and its implementation's `_mapAttribute` callback with:

```ts
          return {
            ...attribute,
            valueShape: "bucketed_list",
            bucketGrain: bucket.bucketGrain,
            sources: attribute.sources.map((source) => {
              return {
                ...source,
                bucketColumnId:
                  source.bucketColumnId ??
                  bucket.firstDateColumnIdByDatasetId[source.datasetId],
              };
            }),
          };
```

   In plan 3's `_withKeyOrLabelColumn` and `setAttributeValueShape` callbacks, plan 4 omits `bucketGrain` and `bucketColumnId` from the attribute. Omit `bucketGrain` and strip the date column from every source instead:

```ts
            ...omit(attribute, ["bucketGrain"]),
            sources: attribute.sources.map((source) => {
              return omit(source, ["bucketColumnId"]);
            }),
```

   In `useCaseTypeDraftEditor.test.ts`, plan 4's cases call `setAttributeBucket(X, { bucketGrain, bucketColumnId: Y })`; pass `{ bucketGrain, firstDateColumnIdByDatasetId: { [<X's dataset id>]: Y } }` instead (an empty record where `Y` is `undefined`), and read `attribute.sources[0]?.bucketColumnId` where they read `attribute.bucketColumnId`.
6. Add the three members to the returned object:

```ts
    addAttributeSource: (columnId, source) => {
      setDraft((current) => {
        return _mapAttribute(current, columnId, (attribute) => {
          const isAlreadySource = attribute.sources.some((existing) => {
            return existing.columnId === source.columnId;
          });
          return isAlreadySource
            ? attribute
            : { ...attribute, sources: [...attribute.sources, source] };
        });
      });
    },
    removeAttributeSource: (columnId, sourceColumnId) => {
      setDraft((current) => {
        return _mapAttribute(current, columnId, (attribute) => {
          return {
            ...attribute,
            sources: attribute.sources.filter((source, index) => {
              return index === 0 || source.columnId !== sourceColumnId;
            }),
          };
        });
      });
    },
    setAttributeSourceDateColumn: (columnId, sourceColumnId, bucketColumnId) => {
      setDraft((current) => {
        return _mapAttribute(current, columnId, (attribute) => {
          return {
            ...attribute,
            sources: attribute.sources.map((source) => {
              return source.columnId === sourceColumnId
                ? { ...source, bucketColumnId }
                : source;
            }),
          };
        });
      });
    },
```

7. Replace plan 4's `_hasPeriodWithoutDateColumn` body so it checks every source:

```ts
  return draft.attributes.some((attribute) => {
    return (
      attribute.isIncluded &&
      attribute.valueShape === "bucketed_list" &&
      attribute.sources.some((source) => {
        return source.bucketColumnId === undefined;
      })
    );
  });
```

   and its docstring's "has no date column" with "has a source without a date column".

- [ ] **Step 4: Show and edit sources in the card**

`CaseTypeDraftBlock.tsx` passes `datasetColumns={datasetColumns ?? []}` to `CaseTypeDraftCard`, which passes it and `datasetNamesById` to each `CaseTypeDraftSourceSection`, which passes both to each `CaseTypeDraftAttributeRow` (beside plan 2's `columnDataTypesById` and plan 4's date column options). In the card's `labelOptions`, read the column from `attribute.sources[0]?.columnId` (skip a field without one). In `CaseTypeDraftSourceSection.tsx`, build `joinKeyOptions` and each row's `key`, `columnLabel`, `isPrimaryKey` and `isLabelColumn` from `attribute.sources[0]?.columnId`, and under the join key `Select`, when the card has two or more datasets (`canRemove`), render:

```tsx
      {canRemove ? (
        <Text size="xs" c="dimmed">
          <Trans>The join keys become one ID field.</Trans>
        </Text>
      ) : null}
```

Plan 4 passes each row its group dataset's `dateColumnOptions`. A field's sources may be in other datasets, so pass the whole `dateColumnOptionsByDatasetId` down instead (the card already has it), replacing the row's `dateColumnOptions` prop.

In `CaseTypeDraftAttributeRow.tsx`, add the props `datasetColumns`, `datasetNamesById` and `dateColumnOptionsByDatasetId`, read every `attribute.columnId` as `firstColumnId` (`const firstColumnId = attribute.sources[0]?.columnId ?? "";`), and compute each dataset's first date column (importing `objectValuesMap` from `@avandar/utils` and `useMemo` from `react`):

```ts
  const firstDateColumnIdByDatasetId = useMemo(() => {
    return objectValuesMap(dateColumnOptionsByDatasetId, (options) => {
      return options[0]?.value;
    });
  }, [dateColumnOptionsByDatasetId]);
```

In plan 4's `ValueShapeControl` `onChange`, the `bucketed_list` branch becomes `editor.setAttributeBucket(firstColumnId, { bucketGrain: attribute.bucketGrain ?? "month", firstDateColumnIdByDatasetId });`. In the `bucketed_list` arm, `PeriodControls` loses `bucketColumnId` and `dateColumnOptions` (Task 17 lets it show only the period), and its `onChange` becomes `(choice) => { editor.setAttributeBucket(firstColumnId, { bucketGrain: choice.bucketGrain, firstDateColumnIdByDatasetId }); }`. Then, after the controls line, when the field is included, render:

```tsx
        {attribute.isIncluded ? (
          <FieldSourcesEditor
            size="xs"
            fieldName={attribute.name}
            sources={attribute.sources.map((source, index) => {
              return {
                key: source.columnId,
                datasetName: datasetNamesById[source.datasetId] ?? "",
                columnName:
                  datasetColumns.find((column) => {
                    return column.id === source.columnId;
                  })?.name ?? "",
                // The first source names the field in the card.
                canRemove: index > 0,
                dateColumn:
                  attribute.valueShape === "bucketed_list"
                    ? {
                        columnId: source.bucketColumnId,
                        options: dateColumnOptionsByDatasetId[source.datasetId] ?? [],
                      }
                    : undefined,
              };
            })}
            addableColumns={getAddableSourceColumns({
              sourceColumnIds: attribute.sources.map((source) => {
                return source.columnId;
              }),
              candidateColumns: datasetColumns,
              datasetNamesById,
            })}
            onAdd={(columnId) => {
              const column = datasetColumns.find((candidate) => {
                return candidate.id === columnId;
              });
              if (column) {
                editor.addAttributeSource(firstColumnId, {
                  datasetId: column.datasetId,
                  columnId: column.id,
                });
              }
            }}
            onRemove={(columnId) => {
              editor.removeAttributeSource(firstColumnId, columnId);
            }}
            onDateColumnChange={(columnId, bucketColumnId) => {
              editor.setAttributeSourceDateColumn(firstColumnId, columnId, bucketColumnId);
            }}
          />
        ) : null}
```

The card passes no `onMove` (spec open question 3).

In `CaseTypeDraftBlock.test.tsx`, plan 4's "creates a per-month field with its dataset's first date column" finds the picker by `Date column for Total deaths`. The picker is now the source's, labelled by its column: find it by `Date column for <that field's column name>` instead. Its expectation is unchanged.

- [ ] **Step 5: Run them and watch them pass**

Run: `pnpm test:frontend src/components/ChatPanel/CaseTypeDraftBlock`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ChatPanel/CaseTypeDraftBlock
git commit -m "feat(joined-cases): add and remove a field's sources in the chat draft card"
```

---

## Task 20: Video producer adapters, and a clean type check

**Files:**
- Modify: `apps/ava-video-producer/avandar-adapter/OntologyScreen/OntologyScreen.types.ts`, `OntologyScreen.tsx`
- Modify: `apps/ava-video-producer/avandar-adapter/CasesScreen/CasesScreen.tsx`
- Modify: `apps/ava-video-producer/avandar-adapter/AttributeMappingScreen/AttributeMappingScreen.types.ts`, `createMappingFormFromFrame.ts`
- Modify: any other file `pnpm type-check` names

Read `apps/ava-video-producer/docs/component-videos.md` first. These adapters render the real product components with fixtures; only fixture shapes change.

- [ ] **Step 1: Run the type check and list the errors**

Run: `pnpm type-check`
Expected: errors in the three adapter directories and in any file Tasks 5 to 19 missed. Work the list file by file until it is clean.

- [ ] **Step 2: Move the adapter fixtures to the new model**

- `OntologyScreen.types.ts`: `Attribute["mapping"]` becomes `NonNullable<Attribute["mappings"]>[number]`, and the projection's `& { mapping: ... }` becomes `& { mappings: Array<Pick<DatasetMapping, "type" | "datasetId" | "conceptAttributeId" | "datasetColumnId" | "position">> }`.
- `OntologyScreen.tsx`: each field's `mapping: { type: "dataset_column", datasetId }` becomes `mappings: [{ type: "dataset_column", datasetId, conceptAttributeId: <the field's id>, datasetColumnId: <a fixed uuid per field>, position: 0 }]` (hoist the field id into a local so both uses share it).
- `CasesScreen.tsx`: the attribute fixture's `mapping: { ... }` becomes ``mappings: [{ type: "dataset_column", conceptAttributeId: `field-${index}`, datasetColumnId: `column-${index}`, position: 0, datasetId: ... }]``. This file casts through `unknown`, so the type check does not catch it; `CaseTypeAttributesList` reads `mappings` at render time.
- `AttributeMappingScreen.types.ts` and `createMappingFormFromFrame.ts`: the rule moves from `mappings.datasetColumn` onto the attribute; `Rule` becomes `Pick<Attribute, "valuePickerRuleType">`; remove the `"datasetColumnAttributes.0.mappings.datasetColumn"` prefix and serve the rule for `"datasetColumnAttributes.0"`.

- [ ] **Step 3: Check the adapters**

```bash
pnpm type-check
pnpm --filter @avandar/ava-video-producer test
```

Expected: the type check is clean for the whole repo, and the producer's tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/ava-video-producer/avandar-adapter
git commit -m "chore(joined-cases): move video adapter fixtures to field sources"
```

(Add any other file Step 1 named to this commit, or to a `fix(joined-cases)` commit of its own.)

---

## Task 21: E2E: a field read from two datasets

**Files:**
- Create: `tests/data/multi-source-fields/line-list.csv`
- Create: `tests/data/multi-source-fields/lab-results.csv`
- Create: `tests/e2e/multi-source-fields.spec.ts`

Load **`playwright-best-practices`**. The case type is created through the UI, because creating it is the behavior under test. Only the uploads (through the UI, in `beforeAll`), oracle reads, and teardown touch the database directly.

- [ ] **Step 1: Add the fixtures**

Create `tests/data/multi-source-fields/line-list.csv`:

```csv
e2e_case_ref,e2e_full_name,e2e_test_result
c1,Ana Diaz,negative
c2,Ben Okafor,
```

Create `tests/data/multi-source-fields/lab-results.csv`:

```csv
e2e_patient_ref,e2e_lab_result
c1,positive
c1,positive
c2,inconclusive
```

Ana's result is negative once in the line list and positive twice in the labs, so the most frequent value over both is positive. Ben's is only in the labs.

- [ ] **Step 2: Write the spec**

Create `tests/e2e/multi-source-fields.spec.ts`:

```ts
/*
 * A field that reads one column of each of two datasets, end to end: built in
 * the create form, it shows on the record page the value its rule computes
 * over both datasets, and names both datasets as its sources.
 *
 * Both datasets are uploaded in `beforeAll`, in a browser context of its own,
 * so the session under test starts after they exist.
 */
import path from "node:path";
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
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { Page } from "@playwright/test";

test.use({ trace: "retain-on-failure" });

const LINE_LIST_CSV_PATH = path.join(
  process.cwd(),
  "tests/data/multi-source-fields/line-list.csv",
);
const LAB_RESULTS_CSV_PATH = path.join(
  process.cwd(),
  "tests/data/multi-source-fields/lab-results.csv",
);
const CASE_TYPE_NAME = "E2E lab cases";
const RESULT_FIELD_NAME = "e2e_test_result";

/** What `beforeAll` created, so `afterAll` removes exactly that. */
const seededWorld: {
  workspaceId: string | undefined;
  lineListId: string | undefined;
  labResultsId: string | undefined;
  lineListName: string;
  labResultsName: string;
} = {
  workspaceId: undefined,
  lineListId: undefined,
  labResultsId: undefined,
  lineListName: "",
  labResultsName: "",
};

/** Oracle read: the name the import gave a dataset. */
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

async function _addColumnAsField(page: Page, columnName: string): Promise<void> {
  await page.getByRole("radio", { name: columnName, exact: true }).check();
  await page.getByRole("button", { name: "Add column as a field" }).click();
}

async function _chooseOption(options: {
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

/** Builds the case type in the create form and submits it. */
async function _createCaseType(page: Page): Promise<void> {
  await page.getByRole("textbox", { name: "Case type name" }).fill(CASE_TYPE_NAME);
  await page
    .getByRole("switch", { name: "Some data should come from existing datasets" })
    .check();
  await _addColumnAsField(page, RESULT_FIELD_NAME);
  await _addColumnAsField(page, "e2e_full_name");
  // The result field was added first, so its settings are open.
  const resultSources = page.getByRole("group", {
    name: `Sources of ${RESULT_FIELD_NAME}`,
  });
  await resultSources.getByRole("combobox", { name: "Add a source" }).click();
  await page.getByRole("option", { name: "e2e_lab_result", exact: true }).click();
  await expect(resultSources.getByRole("listitem")).toHaveCount(2);

  await _chooseOption({
    page,
    comboboxName: seededWorld.lineListName,
    optionName: "e2e_case_ref",
  });
  await _chooseOption({
    page,
    comboboxName: seededWorld.labResultsName,
    optionName: "e2e_patient_ref",
  });
  await _chooseOption({
    page,
    comboboxName: /should be used as a .*name\?/,
    optionName: "e2e_full_name",
  });
  await page.getByRole("button", { name: "Create case type" }).click();
}

/** The value and source lines the record page shows for one field. */
function _factOf(page: Page, fieldName: string) {
  return page
    .locator("dt", { hasText: fieldName })
    .locator("xpath=following-sibling::dd[1]");
}

test.describe("Multi-source fields", () => {
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
      seededWorld.lineListId = await importDatasetViaUi({
        page,
        filePath: LINE_LIST_CSV_PATH,
        expectedRowCount: 2,
        workspaceSlug,
      });
      seededWorld.labResultsId = await importDatasetViaUi({
        page,
        filePath: LAB_RESULTS_CSV_PATH,
        expectedRowCount: 3,
        workspaceSlug,
      });
    } finally {
      await context.close();
    }
    seededWorld.lineListName = await _readDatasetName({
      supabaseAdminClient: admin,
      datasetId: seededWorld.lineListId,
    });
    seededWorld.labResultsName = await _readDatasetName({
      supabaseAdminClient: admin,
      datasetId: seededWorld.labResultsId,
    });
  });

  // Removes the case type the test created (with its statuses, fields,
  // sources, and records) and both datasets, whatever the test did.
  test.afterAll(async () => {
    const admin = createSupabaseAdminClient();
    const { workspaceId } = seededWorld;
    if (!workspaceId) {
      return;
    }
    await admin
      .from("concepts")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("name", CASE_TYPE_NAME)
      .throwOnError();
    for (const datasetId of [seededWorld.lineListId, seededWorld.labResultsId]) {
      if (datasetId) {
        await deleteDatasetFixture({ admin, datasetId, workspaceId });
      }
    }
  });

  test("a field read from two datasets shows the value both give and names both as its sources", async ({
    page,
    e2eWorkerDb,
  }) => {
    test.setTimeout(45_000);
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    await signInWithEmailPassword(page, {
      email: primaryUser.email,
      password: primaryUser.password,
      workspaceSlug,
    });
    // The create form has no in-app link (Spotlight only), so this is the
    // session's first landing after sign-in.
    await page.goto(`/${workspaceSlug}/ontology-designer/concept-creator`);
    await _createCaseType(page);

    await page
      .getByRole("button", { name: `Refresh ${CASE_TYPE_NAME} records` })
      .click();
    await expect(
      page.getByText(`Finished syncing ${CASE_TYPE_NAME} records`),
    ).toBeVisible({ timeout: MEDIUM_WAIT });
    await page.getByRole("link", { name: "View records" }).click();

    await page.getByRole("link", { name: /Ben Okafor$/ }).click();
    const benResult = _factOf(page, RESULT_FIELD_NAME);
    await expect(benResult).toContainText("inconclusive", { timeout: MEDIUM_WAIT });
    await expect(benResult).toContainText(seededWorld.lineListName);
    await expect(benResult).toContainText(seededWorld.labResultsName);

    await page.getByRole("link", { name: /Ana Diaz$/ }).click();
    await expect(_factOf(page, RESULT_FIELD_NAME)).toContainText("positive", {
      timeout: MEDIUM_WAIT,
    });
  });
});
```

Sequential async teardown uses `for ... of`, as other specs do; switch to a `reduce` chain if the lint rule rejects it. Check every locator against the running app on the first run (the column picker's radios and the `View records` control in particular, which may be a button); adjust the locator, never the assertion.

- [ ] **Step 3: Run it, and prove it can fail**

The feature is complete by this task, so the spec passes on its first run unless a locator is wrong. Temporarily change `inconclusive` to `negative` and watch it fail with the received text, then revert.

```bash
pnpm test:e2e multi-source-fields.spec.ts
```

Expected: PASS, 1 test. Run it on its own, never with the full suite.

- [ ] **Step 4: Commit**

```bash
git add tests/data/multi-source-fields tests/e2e/multi-source-fields.spec.ts
git commit -m "test(joined-cases): a field read from two datasets shows both on the record page"
```

---

## Task 22: Translations and full verification

**Files:**
- Modify: `src/i18n/locales/*` (generated)

- [ ] **Step 1: Extract and compile the catalogs**

```bash
pnpm i18n:extract && pnpm i18n:compile
```

Expected: `src/i18n/locales/en/messages.po` gains `Sources`, `Sources of {fieldName}`, `Add a source`, `Choose a column of the same type`, `No other column has this type`, `Move {0} up`, `Move {0} down`, `Remove {0} from {fieldName}`, `Date column for {0}`, `Choose the date column for each source of this field`, and `The join keys become one ID field.`, each with a `#:` reference, and loses plan 4's `Choose the date column for this field`, which nothing uses any more.

- [ ] **Step 2: Run everything**

```bash
ava supabase status
pnpm type-check
pnpm lint
pnpm test:frontend
pnpm test:executed
pnpm test:db
pnpm i18n:check
pnpm desktop:sqlite:check-migrations
rg -n "valuePickerRuleType" shared/models/ontology/AttributeMapping
rg -n "value_picker_rule_type" supabase/schemas/30.attribute_mappings__dataset_column.sql
```

Expected: every command passes, and both `rg` commands print nothing.

- [ ] **Step 3: Run the case type E2E specs, one at a time**

```bash
ls tests/e2e | grep -iE "case|multi-source"
```

Run each listed spec on its own, for example:

```bash
pnpm test:e2e multi-source-fields.spec.ts
pnpm test:e2e case-statuses-data-explorer.spec.ts
pnpm test:e2e case-list-field.spec.ts
```

Expected: each PASSES on its own (the case status specs seed through `CaseTypeSeedHelpers`, which Task 3 moved to the new payload; plans 3 and 4's specs exercise the draft card and form this plan changed).

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales
git commit -m "chore(joined-cases): extract and compile field source translations"
```

---

## Task 23: Update the ontology architecture doc

**Files:**
- Modify: `docs/ontology-architecture.md` (sections 4, 5.2, 5.3, 6, 7, 7.1, 8, 10, 12, 16, as plans 1 to 4 left them)

Comments and docs describe the code as it is; no gap or plan names.

- [ ] **Step 1: Section 4 (data model)**

- In the ER diagram, change the `concept_attributes ||--o| attribute_mappings__dataset_column` edge to `||--o{` labelled `"concept_attribute_id<br/>one row per source, cascade"`, add `enum value_picker_rule_type` to `concept_attributes`, and in `attribute_mappings__dataset_column` replace `enum value_picker_rule_type` with `int position`.
- Replace the caption's first sentence with: `A manual-entry field has one mapping row; a dataset-column field has one per source, in the table its mapping_type names.`
- In the table, the `concept_attributes` row's notes gain: `value_picker_rule_type is set exactly on single-value and per-period dataset-column fields (concept_attributes__value_picker_rule_type_by_shape)`. The `attribute_mappings__dataset_column` row becomes: `"This field reads this column of this dataset, in this position" | One row per source; unique on (concept_attribute_id, dataset_column_id); dataset_id and dataset_column_id are bare ids, not foreign keys`.

- [ ] **Step 2: Sections 5.2 and 5.3 (authoring)**

- 5.2: `AttributeFormValues.mappings.datasetColumn` is a field's sources in read order and the rule is on the field; `FieldSourcesEditor` (`src/components/caseFields/FieldSourcesEditor/`) adds, removes, and reorders sources, offering only same-type columns, and chooses each source's date column on a per-period field; `makeSourceDatasetsFromAttributes` keeps one join key entry per dataset any source reads; `transformValues` flags the label, keeps keys and the label to one value, types each field, then folds the join keys into one ID field with `makeAttributesWithIdentifierFromKeyColumns`.
- 5.3: chat fields carry `sources: ChatCaseAttributeSource[]`, keyed in the card by the first source's column; the card adds and removes extra sources (not the first) and does not reorder; `parseProposeCaseType` keeps a field's sources to its first catalogued source's type; `createdCaseTypeToFormValues` drops unknown sources, sources in datasets with no join key, sources of another type, and per-period sources without a usable date column, then folds the join keys into one ID field. Replace the sentence about adding a missing identifier attribute per source.

- [ ] **Step 3: Sections 6, 7, 7.1, and 8 (reading values)**

- 6: Sync stages one key source per identifier mapping row (one ID field may have one per dataset). If plan 6 has not landed, it also names records through the label field's column from `makeConceptAttributeColumnsFromMetadata`, built by `buildAttributeValueSql`; if it has, say only the first sentence.
- 7: add a subsection "Fields with several sources": `buildStackedSourceRowsSql` builds one branch per source (its own key column, the NULL rule, the date and the cast), stacked with `UNION ALL` in read order (position, then dataset column id, then `file_row_number`), and both value builders reduce those rows; one source is not cast, several are cast to their shared column type, and an ID field over keys of different types is read as text.
- 7.1: the rule lives on `concept_attributes`; the enum is `supabase/schemas/00.enum.attribute_mappings__value_picker_rule_type.sql`. Restate the rule audit query with the field's rule:

```sql
select count(*)
from public.concept_attributes a
join public.attribute_mappings__dataset_column m on m.concept_attribute_id = a.id
join public.dataset_columns c on c.id = m.dataset_column_id and c.dataset_id = m.dataset_id
where
  (a.value_picker_rule_type in ('sum', 'avg') and c.data_type not in ('bigint', 'double'))
  or (a.value_picker_rule_type in ('max', 'min') and c.data_type = 'boolean');
```

- 8: in the column resolution row, replace "One column per attribute; one key column per dataset" with "One column per attribute, reading every source; one key column per dataset, from the first identifier source of each; sources of different types throw, except an ID field's, read as text; a rule the sources' shared type disallows throws; a source in a dataset with no key, or a per-period source without a usable date column, throws". In the View row, say every dataset-column field reads its stacked sources. Where plan 4 added the two sites that read a per-period field's date column (planning's column fetch and the needed-columns list), say each covers every source's date column.

- [ ] **Step 4: Sections 10, 12, and 16**

- 10: replace "At most one mapping row per attribute in each mapping table" with "A field reads each column at most once | `attribute_mappings__dataset_column__attribute_column_unique`; `unique` on `concept_attribute_id` in the manual-entry table". Replace "One identifier attribute per contributing dataset" with "One identifier source per contributing dataset; a new case type has one ID field with a source per dataset, an older one may have one identifier field per dataset". Add "Which fields hold a value rule | `concept_attributes__value_picker_rule_type_by_shape`".
- 12: in the checklist, note that a new mapping kind's rows are not ordered by `AttributeSources` unless it is a dataset-column source.
- 16: remove any row saying a field reads one dataset or column.

- [ ] **Step 5: Check the doc**

```bash
rg -n "exactly one mapping row|one mapping per|reads exactly one|unique on concept_attribute_id" docs/ontology-architecture.md
```

Expected: no stale claims. Every mermaid block still renders (check in the editor's preview).

- [ ] **Step 6: Commit**

```bash
git add docs/ontology-architecture.md
git commit -m "docs(joined-cases): describe multi-source fields in the ontology architecture"
```

---

## Verification once this plan lands

- [ ] `pnpm test:db` passes, including the `value_picker_rule_move` and `value_rule_data_types` replays.
- [ ] `pnpm test:frontend`, `pnpm test:executed`, `pnpm type-check`, `pnpm lint`, and `pnpm i18n:check` pass.
- [ ] `pnpm test:e2e multi-source-fields.spec.ts` passes on its own.
- [ ] Spec §10's exit criteria hold.
- [ ] `git status` shows only `supabase/config.toml` modified.
- [ ] Nothing was run against production.
