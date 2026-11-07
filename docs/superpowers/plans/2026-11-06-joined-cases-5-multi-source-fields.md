# Joined Cases 5: Multi-Source Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let one field of a case type read several dataset columns, in one dataset or several, with one rule reducing every source's rows, one ID field per new case type, and every source listed wherever a field's provenance is shown.

**Architecture:** The value rule moves from the mapping row to the field (`concept_attributes.value_picker_rule_type`), and a field keeps one mapping row per source, ordered by `position`. The concept view stacks a field's sources with `UNION ALL` inside the field's correlated subquery, each source keyed by its own dataset's key column, then reduces the stacked rows once with the field's rule, list, or per-bucket rule. Authoring (form and chat) builds sources, and folds the join key columns into one ID field.

**Tech Stack:** Postgres (Supabase declarative schema, pgTAP, migration upgrade tests), TypeScript, Zod, React, Mantine, Lingui, DuckDB (QETL), Deno edge functions, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-06-joined-cases-5-multi-source-fields-design.md`. Section numbers (§) refer to it. **Overview and ground rules:** `docs/superpowers/plans/2026-11-06-joined-cases.md`. **Shared names:** umbrella §6.

**Prerequisite:** plans 1 to 4 have landed on `feat/joined-cases`. Task 0 checks what they actually named things.

---

## Required skills

- **`supabase-declarative-schema`** before Tasks 1 to 4. Edit `supabase/schemas/`, run `pnpm db:reset` and then immediately `pnpm db:new-migration <name>`, and never hand-edit what it generates. Task 2's data move is the one hand-written migration (`supabase migration new`), because `db diff` never emits DML.
- **`test-driven-development`** throughout.
- **`impeccable`** before Task 17. The multi-source editor is a new surface. Task 19 reuses that component and needs no second pass.
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
| 2 | `<ts>_move_value_picker_rule_to_concept_attributes.sql` | hand-written | copy each mapping's rule onto its field |
| 3 | `<ts>_allow_many_sources_per_attribute.sql` | generated | drop the mapping's rule; swap `unique (concept_attribute_id)` for `attribute_mappings__dataset_column__attribute_column_unique`; add `concept_attributes__value_picker_rule_type_by_shape`; replace `rpc_concepts__create` |

A generated migration from the final schema would drop the mapping's rule before anything could copy it, which is why the change is split around the copy (§7).

**Known gap inside this plan:** from Task 3 until Task 16, creating a case type fails, because the RPC reads the rule from the attribute and the client still sends it on the mapping. Do not stop between them. `pnpm type-check` is red from Task 4 until Task 20; Vitest does not type-check, so every TDD loop in between still runs.

## File map

| File | Responsibility |
| --- | --- |
| `supabase/schemas/00.enum.attribute_mappings__value_picker_rule_type.sql` (new) | The rule enum, moved so layer 20 can use it |
| `supabase/schemas/20.concept_attributes.sql` | `value_picker_rule_type` and its shape check |
| `supabase/schemas/30.attribute_mappings__dataset_column.sql` | No rule, `position`, the two-column unique |
| `supabase/schemas/50.rpc_concepts__create.sql` | Rule on attributes, position on mappings |
| `supabase/migration-upgrade-tests/value_picker_rule_move.{prelude,assertions}.sql` (new), `scripts/test-dashboard-publishing-migrations.sh` | Replays the data move |
| `supabase/tests/database/concept_attributes__value_picker_rule_type.test.sql` (new) | The shape check |
| `supabase/tests/database/attribute_mappings__dataset_column__sources.test.sql` (new) | Position default, several sources, one column once |
| `supabase/tests/database/rpc_concepts__create.test.sql`, `supabase/tests/database/permissions/rls_attribute_mappings__dataset_column.test.sql` | Payload shape; a two-source case type; position as the update probe |
| `apps/desktop/scripts/gen-sqlite-migrations/getManualMigrationBodyFromSourceFile.ts` | SQLite body for migration 3 |
| `shared/models/ontology/ConceptAttribute/*`, `shared/models/ontology/AttributeMapping/DatasetColumnMapping/*` | Rule on the field, position on the source |
| `shared/models/ontology/AttributeMapping/DatasetColumnMapping/AttributeSources/` (new) | A field's sources in read order |
| `shared/models/ontology/Concept/Concept.types.ts`, `ConceptModule.ts` | `mappings` per hydrated attribute |
| `src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql.ts` | `ConceptAttributeSource`, the column arm |
| `src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/buildAttributeValueSql.ts` | Stacked sources, one reduction |
| `src/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata.ts` | Sources, keys, shared type |
| `src/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery.ts` | Every source's columns |
| `src/views/OntologyDesignerApp/ConceptMetaView/*` | Hydration, Refresh, provenance on the case type page, Sync |
| `src/views/IndividualManagerApp/SingleIndividualView/*` | Provenance on the record page |
| `shared/types/chat.types.ts`, `supabase/functions/chat/PostChatMessages/{parsing,prompt}/*` | Chat contract, parsers, tools, prompt |
| `src/views/OntologyDesignerApp/makeAttributesWithIdentifierFromKeyColumns/` (new) | One ID field from the join keys |
| `src/views/OntologyDesignerApp/{createdCaseTypeToFormValues,proposedCaseTypeToCreatedCaseType,insertConceptFromFormValues}/` | Chat conversion and the insert |
| `src/views/OntologyDesignerApp/ConceptCreatorView/*` | Form state, sources, join keys |
| `src/components/caseFields/FieldSourcesEditor/` (new) | The multi-source editor |
| `src/components/ChatPanel/CaseTypeDraftBlock/*` | Sources in the draft card |
| `apps/ava-video-producer/avandar-adapter/{OntologyScreen,AttributeMappingScreen,CasesScreen}/*` | Adapter fixtures follow the model |
| `tests/e2e/multi-source-fields.spec.ts`, `tests/data/multi-source-fields/*.csv` (new), `tests/e2e/helpers/CaseTypeSeedHelpers.ts` | E2E |
| `docs/ontology-architecture.md` | The end state |

---

## Task 0: Read what plans 1 to 4 landed

**Files:** none. Nothing is committed.

This plan's code assumes the names in spec §4. Where a landed name differs, keep the landed name and adapt this plan's code mechanically. Where a landed **decision** differs (for example, the record page does not read provenance from mappings), stop and record it in spec §4 before continuing.

- [ ] **Step 1: Check the Supabase switch**

Run: `ava supabase status`
Expected: names `feat-joined-cases`.

- [ ] **Step 2: Locate each assumed name**

```bash
rg -n "export function buildAttributeValueSql" src/clients/qetl
rg -n "getSQLSelectOfMapping|getAttributeAssertions\b" src shared
rg -n "attributeId|bucketGrain|bucketColumnName|isArray" src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql.ts
rg -n "bucket_grain|bucket_column_id" supabase/schemas
rg -n "bucketGrain|BucketGrain|ValueShape|getValueShape" shared/models/ontology/ConceptAttribute
rg -n "bucketColumnId" shared/models/ontology/AttributeMapping
rg -ln "ValuePickerRule\b" shared/models/ontology
rg -n "ValuePickerTypes" shared src supabase/functions
rg -n "sourceName" src/views/IndividualManagerApp
rg -n "valueShape|bucketGrain|bucketColumnId" shared/types/chat.types.ts
rg -n "bucketColumnId|bucketGrain" src/views/OntologyDesignerApp/ConceptCreatorView src/components/ChatPanel/CaseTypeDraftBlock
```

Expected: `buildAttributeValueSql` exists and `getSQLSelectOfMapping` does not; `bucket_grain` is on `concept_attributes` and `bucket_column_id` on `attribute_mappings__dataset_column`; the `dataset_column` arm has `attributeId`, `bucketGrain` and `bucketColumnName`; the record page builds `sourceName` from mappings.

- [ ] **Step 3: Write down the differences**

Keep a short list (in the session, not in the repo) of every landed name that differs from this plan, for example "G4 calls the arm's grain `grain`". Apply it to every code block below.

---

## Task 1: A rule column on fields, a position on sources

**Files:**
- Create: `supabase/schemas/00.enum.attribute_mappings__value_picker_rule_type.sql`
- Modify: `supabase/schemas/30.attribute_mappings__dataset_column.sql:1-9` (enum moves out), `:11-21` (column)
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
 * per bucket for a bucketed list. Single-value and bucketed-list fields of a
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

Delete lines 1 to 9 of `supabase/schemas/30.attribute_mappings__dataset_column.sql` (the same `create type`). If plan 2 changed the enum's values or comments, carry its version over instead of the block above, keeping the docstring.

- [ ] **Step 5: Add the two columns**

In `supabase/schemas/20.concept_attributes.sql`, inside `create table public.concept_attributes`, directly after the `bucket_grain` column plan 4 added, add:

```sql
  -- The rule that reduces this field's rows from every source to one value,
  -- or to one value per bucket. Set on single-value and bucketed-list
  -- dataset-column fields only.
  value_picker_rule_type public.attribute_mappings__value_picker_rule_type,
```

In `supabase/schemas/30.attribute_mappings__dataset_column.sql`, inside `create table public.attribute_mappings__dataset_column`, directly after `dataset_column_id uuid not null` (and after plan 4's `bucket_column_id`, if it follows), add:

```sql
  -- This source's place in its field's read order. `first` and lists read a
  -- field's sources in ascending position, ties broken by dataset column id.
  position integer not null default 0
```

Mind the commas: the column above it now ends with `,`. Leave `value_picker_rule_type` and `unique` on the mapping table alone in this task.

Run `pnpm format`. Formatting may re-indent the SQL. Do not change the statements.

- [ ] **Step 6: Generate the migration**

```bash
ava supabase status
pnpm db:reset
pnpm db:new-migration add_attribute_rule_and_source_position
```

Expected: a new `supabase/migrations/<ts>_add_attribute_rule_and_source_position.sql` containing exactly two statements, `alter table "public"."concept_attributes" add column "value_picker_rule_type" ...` and `alter table "public"."attribute_mappings__dataset_column" add column "position" integer not null default 0`. If it also drops or creates the enum, the file order is wrong: the enum must be in a `00.` file. Fix the schema files, reset, and regenerate.

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

Spec §7. The prelude and assertions are written to work both now and after Task 3: they re-add the mapping's rule only if it is missing and drop the shape check only if it exists.

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
-- Every fixture id starts with `ae`.
begin;

alter table public.attribute_mappings__dataset_column
add column if not exists value_picker_rule_type public.attribute_mappings__value_picker_rule_type;

alter table public.concept_attributes
drop constraint if exists concept_attributes__value_picker_rule_type_by_shape;

insert into auth.users (id, email, aud, role)
values ('ae000001-0000-4000-8000-000000000001'::uuid, 'rule_move@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values ('ae001001-0000-4000-8000-000000000001'::uuid, 'ae000001-0000-4000-8000-000000000001'::uuid, 'rule move ws', 'rule-move-ws')
on conflict (id) do nothing;

-- Case type 1 holds every shape. Case type 2 has two identifier fields in
-- one dataset, which the label and identifier trigger rejects on update.
insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id)
values
  ('ae002001-0000-4000-8000-000000000001'::uuid, 'ae000001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'rule move shapes', false, 'ae003001-0000-4000-8000-000000000001'::uuid),
  ('ae002002-0000-4000-8000-000000000002'::uuid, 'ae000001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'rule move two keys', false, 'ae003002-0000-4000-8000-000000000002'::uuid);

insert into public.concept_statuses (id, workspace_id, concept_id, name, color, position)
values
  ('ae003001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Active', '#40c057', 0),
  ('ae003002-0000-4000-8000-000000000002'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002002-0000-4000-8000-000000000002'::uuid, 'Active', '#40c057', 0);

-- One statement per case type, so the label trigger counts every attribute
-- of it at once. "Already moved" already holds a rule on the field.
insert into public.concept_attributes (
  id, workspace_id, concept_id, name, data_type, mapping_type,
  is_label, is_identifier, is_array, allow_manual_edit, bucket_grain, value_picker_rule_type
)
values
  ('ae004001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Case ID', 'varchar', 'dataset_column', true, true, false, false, null, null),
  ('ae004002-0000-4000-8000-000000000002'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Peak titer', 'bigint', 'dataset_column', false, false, false, false, null, null),
  ('ae004003-0000-4000-8000-000000000003'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Every result', 'varchar', 'dataset_column', false, false, true, false, null, null),
  ('ae004004-0000-4000-8000-000000000004'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Monthly titer', 'double', 'dataset_column', false, false, true, false, 'month', null),
  ('ae004005-0000-4000-8000-000000000005'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Notes', 'varchar', 'manual_entry', false, false, false, false, null, null),
  ('ae004006-0000-4000-8000-000000000006'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Orphan', 'varchar', 'dataset_column', false, false, false, false, null, null),
  ('ae004007-0000-4000-8000-000000000007'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Already moved', 'bigint', 'dataset_column', false, false, false, false, null, 'count');

insert into public.concept_attributes (
  id, workspace_id, concept_id, name, data_type, mapping_type,
  is_label, is_identifier, is_array, allow_manual_edit, bucket_grain, value_picker_rule_type
)
values
  ('ae004011-0000-4000-8000-000000000011'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002002-0000-4000-8000-000000000002'::uuid, 'Key A', 'varchar', 'dataset_column', true, true, false, false, null, null),
  ('ae004012-0000-4000-8000-000000000012'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002002-0000-4000-8000-000000000002'::uuid, 'Key B', 'varchar', 'dataset_column', false, true, false, false, null, null);

-- Mappings come after attributes, the order the creation RPC uses, so the
-- identifier check passes on insert and only an update would re-run it.
insert into public.attribute_mappings__dataset_column (
  id, workspace_id, concept_attribute_id, value_picker_rule_type,
  dataset_id, dataset_column_id, bucket_column_id
)
values
  ('ae005001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae004001-0000-4000-8000-000000000001'::uuid, 'first', 'ae006001-0000-4000-8000-000000000001'::uuid, 'ae007001-0000-4000-8000-000000000001'::uuid, null),
  ('ae005002-0000-4000-8000-000000000002'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae004002-0000-4000-8000-000000000002'::uuid, 'max', 'ae006001-0000-4000-8000-000000000001'::uuid, 'ae007002-0000-4000-8000-000000000002'::uuid, null),
  ('ae005003-0000-4000-8000-000000000003'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae004003-0000-4000-8000-000000000003'::uuid, 'sum', 'ae006001-0000-4000-8000-000000000001'::uuid, 'ae007003-0000-4000-8000-000000000003'::uuid, null),
  ('ae005004-0000-4000-8000-000000000004'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae004004-0000-4000-8000-000000000004'::uuid, 'avg', 'ae006001-0000-4000-8000-000000000001'::uuid, 'ae007002-0000-4000-8000-000000000002'::uuid, 'ae007004-0000-4000-8000-000000000004'::uuid),
  ('ae005007-0000-4000-8000-000000000007'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae004007-0000-4000-8000-000000000007'::uuid, 'min', 'ae006001-0000-4000-8000-000000000001'::uuid, 'ae007002-0000-4000-8000-000000000002'::uuid, null),
  ('ae005011-0000-4000-8000-000000000011'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae004011-0000-4000-8000-000000000011'::uuid, 'first', 'ae006002-0000-4000-8000-000000000002'::uuid, 'ae007011-0000-4000-8000-000000000011'::uuid, null),
  ('ae005012-0000-4000-8000-000000000012'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae004012-0000-4000-8000-000000000012'::uuid, 'most_frequent', 'ae006002-0000-4000-8000-000000000002'::uuid, 'ae007012-0000-4000-8000-000000000012'::uuid, null);
```

If plan 4 named `bucket_grain` or `bucket_column_id` differently, use its names here.

- [ ] **Step 3: Write the replay assertions**

Create `supabase/migration-upgrade-tests/value_picker_rule_move.assertions.sql`:

```sql
-- Verify every single-value and bucketed-list field took its mapping's rule,
-- a plain list and a manual-entry field took none, a field with no mapping
-- took most_frequent, a field that already had a rule kept it, the case type
-- with two keys in one dataset moved too, and the trigger is back on.
do $$
begin
  if exists (
    select 1
    from (
      values
        ('ae004001-0000-4000-8000-000000000001'::uuid, 'first'),
        ('ae004002-0000-4000-8000-000000000002'::uuid, 'max'),
        ('ae004003-0000-4000-8000-000000000003'::uuid, null),
        ('ae004004-0000-4000-8000-000000000004'::uuid, 'avg'),
        ('ae004005-0000-4000-8000-000000000005'::uuid, null),
        ('ae004006-0000-4000-8000-000000000006'::uuid, 'most_frequent'),
        ('ae004007-0000-4000-8000-000000000007'::uuid, 'count'),
        ('ae004011-0000-4000-8000-000000000011'::uuid, 'first'),
        ('ae004012-0000-4000-8000-000000000012'::uuid, 'most_frequent')
    ) as expected (attribute_id, rule_type)
    left join public.concept_attributes ca on ca.id = expected.attribute_id
    where ca.value_picker_rule_type::text is distinct from expected.rule_type
  ) then
    raise exception 'a field does not hold the rule its mapping held';
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
# leaving plain lists and manual-entry fields without one.
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

Expected: FAIL with `a field does not hold the rule its mapping held` (the migration is still empty).

- [ ] **Step 6: Write the migration**

Put this in `supabase/migrations/<ts>_move_value_picker_rule_to_concept_attributes.sql`:

```sql
-- Moves each dataset-column field's value rule from its mapping row onto the
-- field, so one rule can reduce the rows of several sources.
--
-- Hand-written because `db diff` never emits DML. It runs after the migration
-- that adds `concept_attributes.value_picker_rule_type` and before the one
-- that drops the mapping's rule and requires the field's. Each step skips
-- fields that already hold a rule, so a re-run changes nothing.
--
-- The move changes no label and no identifier, so the trigger that validates
-- them is paused for it. Left on, it would re-check every moved field's case
-- type and stop the deploy on a case type it rejects today, such as one with
-- two identifier fields in one dataset.
alter table public.concept_attributes
disable trigger tr_concept_attributes__validate_label_and_identifiers;

-- A single-value or bucketed-list field keeps the rule its one mapping row
-- holds. A plain list keeps every value and reads no rule, so it gets none.
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

-- A single-value or bucketed-list field with no mapping row reads nothing, so
-- every rule gives it the same empty value. It takes most_frequent, the rule
-- the create form and chat default to.
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

alter table public.concept_attributes
enable trigger tr_concept_attributes__validate_label_and_identifiers;
```

Run `pnpm format`. Formatting may re-indent the SQL. Do not change the statements.

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
- Modify: `supabase/schemas/50.rpc_concepts__create.sql:1-25` (docstring), `:93-148` (inserts)
- Create: `supabase/tests/database/concept_attributes__value_picker_rule_type.test.sql`
- Modify: `supabase/tests/database/attribute_mappings__dataset_column__sources.test.sql`
- Modify: `supabase/tests/database/rpc_concepts__create.test.sql`
- Modify: `supabase/tests/database/permissions/rls_attribute_mappings__dataset_column.test.sql`
- Modify: `tests/e2e/helpers/CaseTypeSeedHelpers.ts:107-129`
- Create: `supabase/migrations/<ts>_allow_many_sources_per_attribute.sql` (generated)

- [ ] **Step 1: Check the Supabase switch**

Run: `ava supabase status`
Expected: names `feat-joined-cases`.

- [ ] **Step 2: Write the failing shape test**

Create `supabase/tests/database/concept_attributes__value_picker_rule_type.test.sql`:

```sql
\set ON_ERROR_STOP on

/**
 * A single-value or bucketed-list dataset-column field reduces its rows with
 * a rule, so it must hold one. A plain list keeps every value and a
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
  values ('b9001001-0000-4000-8000-000000000001'::uuid, 'b9002001-0000-4000-8000-000000000001'::uuid, 'Bucketed without rule', 'double', 'dataset_column', false, false, true, false, 'month', null);
  $t4$,
  '23514',
  null,
  'a bucketed-list field without a rule is rejected'
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
  values ('b9001001-0000-4000-8000-000000000001'::uuid, 'b9002001-0000-4000-8000-000000000001'::uuid, 'Bucketed with rule', 'double', 'dataset_column', false, false, true, false, 'month', 'avg');
  $t7$,
  'a bucketed-list field with a rule is accepted'
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

Change `select plan (1);` to `select plan (4);`, and insert these assertions directly above `select * from finish ();`:

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

- [ ] **Step 4: Extend the creation RPC test**

In `supabase/tests/database/rpc_concepts__create.test.sql`:

1. Change `select plan (15);` to `select plan (18);`.
2. In test 9, replace the attributes and mappings payloads with:

```sql
    '[{"id":"ac006003-0000-4000-8000-000000000003","name":"Name","description":null,"data_type":"varchar","mapping_type":"dataset_column","is_label":true,"is_identifier":true,"is_array":false,"allow_manual_edit":false,"value_picker_rule_type":"most_frequent"}]'::jsonb,
    '[{"concept_attribute_id":"ac006099-0000-4000-8000-000000000099","dataset_id":"ac007001-0000-4000-8000-000000000001","dataset_column_id":"ac008001-0000-4000-8000-000000000001","position":0}]'::jsonb,
```

3. Insert directly above `select * from finish ();`:

```sql
-- 16. One ID field reading two datasets' keys, and a field reading one
-- column of each.
select lives_ok (
  $t16$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"ac000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  select public.rpc_concepts__create (
    '{"id":"ac004011-0000-4000-8000-000000000011","workspace_id":"ac001001-0000-4000-8000-000000000001","name":"Two-source case type","description":null,"allow_manual_creation":false,"default_status_id":"ac005011-0000-4000-8000-000000000011"}'::jsonb,
    '[{"id":"ac006011-0000-4000-8000-000000000011","name":"Case ID","description":null,"data_type":"varchar","mapping_type":"dataset_column","is_label":true,"is_identifier":true,"is_array":false,"allow_manual_edit":false,"value_picker_rule_type":"first"},{"id":"ac006012-0000-4000-8000-000000000012","name":"Result","description":null,"data_type":"varchar","mapping_type":"dataset_column","is_label":false,"is_identifier":false,"is_array":false,"allow_manual_edit":false,"value_picker_rule_type":"most_frequent"}]'::jsonb,
    '[{"concept_attribute_id":"ac006011-0000-4000-8000-000000000011","dataset_id":"ac007011-0000-4000-8000-000000000011","dataset_column_id":"ac008011-0000-4000-8000-000000000011","position":0},{"concept_attribute_id":"ac006011-0000-4000-8000-000000000011","dataset_id":"ac007012-0000-4000-8000-000000000012","dataset_column_id":"ac008012-0000-4000-8000-000000000012","position":1},{"concept_attribute_id":"ac006012-0000-4000-8000-000000000012","dataset_id":"ac007011-0000-4000-8000-000000000011","dataset_column_id":"ac008013-0000-4000-8000-000000000013","position":0},{"concept_attribute_id":"ac006012-0000-4000-8000-000000000012","dataset_id":"ac007012-0000-4000-8000-000000000012","dataset_column_id":"ac008014-0000-4000-8000-000000000014","position":1}]'::jsonb,
    '[]'::jsonb,
    '[{"id":"ac005011-0000-4000-8000-000000000011","name":"Active","description":null,"color":"#40c057","position":0}]'::jsonb
  );
  $t16$,
  'a Case Types editor creates a case type whose fields each read two sources'
);

reset role;

-- 17.
select is (
  (select value_picker_rule_type::text from public.concept_attributes where id = 'ac006012-0000-4000-8000-000000000012'::uuid),
  'most_frequent',
  'the rule is stored on the field'
);

-- 18.
select is (
  (
    select array_agg(dataset_column_id order by position)
    from public.attribute_mappings__dataset_column
    where concept_attribute_id = 'ac006012-0000-4000-8000-000000000012'::uuid
  ),
  array['ac008013-0000-4000-8000-000000000013'::uuid, 'ac008014-0000-4000-8000-000000000014'::uuid],
  'each source is stored with its position'
);
```

- [ ] **Step 5: Run the three files and watch them fail**

```bash
ava supabase status
supabase test db supabase/tests/database/concept_attributes__value_picker_rule_type.test.sql supabase/tests/database/attribute_mappings__dataset_column__sources.test.sql supabase/tests/database/rpc_concepts__create.test.sql
```

Expected: FAIL. The shape test's assertions 1 to 4 `threw no exception`; the sources test fails on the insert in assertion 2 (`value_picker_rule_type` is still `not null` on the mapping); the RPC test fails on test 16 for the same reason.

- [ ] **Step 6: Change the mapping table**

In `supabase/schemas/30.attribute_mappings__dataset_column.sql`, replace the `create table` statement with (keep plan 4's `bucket_column_id` line and comment where shown):

```sql
create table public.attribute_mappings__dataset_column (
  id uuid primary key default gen_random_uuid(),
  -- Workspace this attribute mapping belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A field has one row per source, so this is not unique on its own.
  concept_attribute_id uuid not null references concept_attributes (id) on update cascade on delete cascade,
  dataset_id uuid not null,
  dataset_column_id uuid not null,
  -- (plan 4's bucket_column_id column and comment, unchanged)
  -- This source's place in its field's read order. `first` and lists read a
  -- field's sources in ascending position, ties broken by dataset column id.
  position integer not null default 0,
  -- A field reads each column at most once.
  constraint attribute_mappings__dataset_column__attribute_column_unique unique (concept_attribute_id, dataset_column_id)
);
```

Replace the placeholder comment line with plan 4's real `bucket_column_id` definition.

- [ ] **Step 7: Add the shape check**

In `supabase/schemas/20.concept_attributes.sql`, add this constraint to the end of the `create table public.concept_attributes` column list, after the last existing constraint (give that constraint a trailing comma):

```sql
  -- A single-value or bucketed-list dataset-column field reduces its rows with
  -- a rule. A plain list keeps every value and a manual-entry field reads no
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

In the same file, the comment above `tr_concept_attributes__validate_label_and_identifiers` and the trigger function are unchanged.

- [ ] **Step 8: Write the rule and positions in the creation RPC**

In `supabase/schemas/50.rpc_concepts__create.sql`, change the docstring's two mapping lines to:

```sql
 * @param p_attributes The `concept_attributes` rows, each with its `id` and,
 *   for a single-value or bucketed-list dataset-column field, its
 *   `value_picker_rule_type`.
 * @param p_dataset_column_mappings The `attribute_mappings__dataset_column`
 *   rows, one per source of each dataset-column field, each with its
 *   `position`.
```

In the attributes insert, add `value_picker_rule_type` to the column list, to the `select` list as `a.value_picker_rule_type`, and to the `jsonb_to_recordset` definition as `value_picker_rule_type public.attribute_mappings__value_picker_rule_type`, each after the `bucket_grain` entry plan 4 added.

Replace the dataset-column mapping insert with (keep plan 4's `bucket_column_id` in all three lists):

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

Run `pnpm format`.

- [ ] **Step 9: Generate the migration**

```bash
ava supabase status
pnpm db:reset
pnpm db:new-migration allow_many_sources_per_attribute
```

Expected: a new `<ts>_allow_many_sources_per_attribute.sql` containing: drop of `attribute_mappings__dataset_column_concept_attribute_id_key` (constraint and its index), drop column `value_picker_rule_type` on the mapping table, the new `attribute_mappings__dataset_column__attribute_column_unique` (index and constraint), the new `concept_attributes__value_picker_rule_type_by_shape`, and `create or replace function public.rpc_concepts__create`. Nothing else. If it drops anything else, it is the shared-stack bug in `CLAUDE.md`: reset, regenerate, compare.

- [ ] **Step 10: Move the mapping RLS test off the rule**

In `supabase/tests/database/permissions/rls_attribute_mappings__dataset_column.test.sql`:

1. In the `insert into public.concept_attributes` seed block, add `value_picker_rule_type` to the column list after `allow_manual_edit`, and `'first'::public.attribute_mappings__value_picker_rule_type` to the end of each of the five rows.
2. Make these replacements everywhere in the file:

| Find | Replace with |
| --- | --- |
| `id, workspace_id, concept_attribute_id, value_picker_rule_type,` (seed column list) | `id, workspace_id, concept_attribute_id,` |
| `'first'::public.attribute_mappings__value_picker_rule_type,` on its own line inside the mapping seed rows | nothing (delete the line) |
| `(id, workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id)` | `(id, workspace_id, concept_attribute_id, dataset_id, dataset_column_id)` |
| `'f500b002-0000-4000-8000-000000000002'::uuid, 'first'::public.attribute_mappings__value_picker_rule_type,` and `'f500b004-0000-4000-8000-000000000004'::uuid, 'first'::public.attribute_mappings__value_picker_rule_type,` (test inserts) | the same uuid followed by `,` only |
| `set value_picker_rule_type = 'sum'::public.attribute_mappings__value_picker_rule_type` | `set position = 5` |
| `t.value_picker_rule_type = 'first'::public.attribute_mappings__value_picker_rule_type` | `t.position = 0` |
| `t.value_picker_rule_type = 'sum'::public.attribute_mappings__value_picker_rule_type` | `t.position = 5` |
| `-- 11. A case_types editor changes a mapping's value picker.` | `-- 11. A case_types editor changes a source's position.` |

Then confirm nothing was missed:

```bash
rg -n "value_picker_rule_type" supabase/tests/database/permissions/rls_attribute_mappings__dataset_column.test.sql
```

Expected: only the concept attribute seed block's column list and its five `'first'` values.

- [ ] **Step 11: Move the E2E seeding helper onto the new payload**

In `tests/e2e/helpers/CaseTypeSeedHelpers.ts`, in `p_attributes`, add `value_picker_rule_type: "first",` after `allow_manual_edit: false,`. In `p_dataset_column_mappings`, delete `value_picker_rule_type: "first",` and add `position: 0,` after `dataset_column_id: datasetColumnId,`.

- [ ] **Step 12: Run the whole database suite**

```bash
ava supabase status
pnpm test:db
```

Expected: PASS for every pgTAP file (including the three from Steps 2 to 4), the privilege reconcile, and every migration replay, including `value_picker_rule_move`.

- [ ] **Step 13: Commit**

```bash
git add supabase/schemas/20.concept_attributes.sql supabase/schemas/30.attribute_mappings__dataset_column.sql supabase/schemas/50.rpc_concepts__create.sql supabase/migrations/*_allow_many_sources_per_attribute.sql supabase/tests/database tests/e2e/helpers/CaseTypeSeedHelpers.ts
git commit -m "feat(joined-cases): let a field read several sources and require its rule by shape"
```

---

## Task 4: Database types and the desktop mirror

**Files:**
- Modify: `shared/types/database.types.ts` (generated)
- Modify: `apps/desktop/scripts/gen-sqlite-migrations/getManualMigrationBodyFromSourceFile.ts`
- Create: `apps/desktop/migrations/<ts>_*.gen.sql` (generated, one per migration from Tasks 1 to 3)

The SQLite mirror still has a unique index on `concept_attribute_id`, under the name `value_extractors__dataset_column_val_entity_field_config_id_key` (`apps/desktop/migrations/20250820162238_*.gen.sql:52`). A field's second source would fail to sync into it, so migration 3 gets a hand-written SQLite body.

- [ ] **Step 1: Regenerate the database types**

```bash
ava supabase status
pnpm db:gen-types
```

Expected: `shared/types/database.types.ts` gains `concept_attributes.value_picker_rule_type` and `attribute_mappings__dataset_column.position`, and loses `attribute_mappings__dataset_column.value_picker_rule_type`. Never hand-edit this file.

- [ ] **Step 2: Confirm the mirror's index name**

```bash
rg -n "UNIQUE INDEX .*entity_field_config_id_key|concept_attribute_id_key" apps/desktop/migrations
```

Expected: `value_extractors__dataset_column_val_entity_field_config_id_key` is created in `20250820162238_*.gen.sql` and never dropped. If a later file renamed it, use that name in Step 3 as well.

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

Expected: three new `.gen.sql` files. Migration 1's adds the two columns; migration 2's reports no schema-shape changes; migration 3's is the body from Step 3. The check reports no drift.

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
- Modify: `shared/models/ontology/ConceptAttribute/ConceptAttribute.types.ts:12-29`, `ConceptAttribute.ts`, `ConceptAttributeParsers.ts:22-36`
- Modify: `shared/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types.ts:12-13, 28-29`, `DatasetColumnMappingParsers.ts:24-74`, `DatasetColumnMappings.ts:1-2`
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

If plan 4 did not add `bucketColumnId` to the mapping model, drop that line from `_source`.

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

In `shared/models/ontology/ConceptAttribute/ConceptAttribute.types.ts`, add the import `import type { Enums } from "$/types/database.types.ts";`, then above `type ConceptAttributeRead` add:

```ts
/**
 * The rule that reduces a field's rows from every source to one value, or
 * to one value per bucket. Read from `concept_attributes.value_picker_rule_type`.
 */
export type ValuePickerRuleType =
  Enums<"attribute_mappings__value_picker_rule_type">;
```

and in `ConceptAttributeRead`, after `isArray: boolean;` (and plan 4's `bucketGrain`):

```ts
    /**
     * The rule that reduces this field's rows from every source. Set on a
     * single-value or bucketed-list dataset-column field, undefined on a
     * plain list and on a manual-entry field.
     */
    valuePickerRuleType: ValuePickerRuleType | undefined;
```

If plan 2 already moved `ValuePickerRuleType` out of `DatasetColumnMapping.types.ts`, import it from there instead of declaring it here.

In `shared/models/ontology/ConceptAttribute/ConceptAttribute.ts`, add `ValuePickerRuleType as ValuePickerRuleTypeT` to the type import and, inside the namespace:

```ts
  export type ValuePickerRuleType = ValuePickerRuleTypeT;
```

In `shared/models/ontology/ConceptAttribute/ConceptAttributeParsers.ts`, import `DatasetColumnMappings` (`$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappings.ts`) and add to `DBReadSchema`:

```ts
  value_picker_rule_type: z
    .enum(DatasetColumnMappings.ValuePickerTypes)
    .nullable(),
```

If plan 2 moved the list of rule names to `ValuePickerRule`, use that list here.

- [ ] **Step 5: Take the rule off the mapping model and add the position**

In `shared/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types.ts`, delete the `ValuePickerRuleType` export (`:12-13`) and the `valuePickerRuleType` field (`:28-29`), and after `datasetColumnId` add:

```ts
  /**
   * This source's place in its field's read order. A field reads its sources
   * in ascending position, ties broken by dataset column id.
   */
  position: number;
```

In `DatasetColumnMappings.ts`, import `ValuePickerRuleType` from `$/models/ontology/ConceptAttribute/ConceptAttribute.types.ts`.

In `DatasetColumnMappingParsers.ts`:

1. In `DBReadSchema`, replace `value_picker_rule_type: z.enum(DatasetColumnMappings.ValuePickerTypes),` with `position: z.number().int(),` and remove the now unused `DatasetColumnMappings` import.
2. In `fromDBReadToModelRead`, delete `valuePickerRuleType: obj.valuePickerRuleType ?? "most_frequent",`.
3. Replace `fromModelInsertToDBInsert` with:

```ts
    fromModelInsertToDBInsert: pipe(
      snakeCaseKeysDeep,
      excludeUndefinedDeep,
      omitProps("type"),
    ),
```

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

In `shared/models/ontology/Concept/ConceptModule.ts`, rename `ConceptAttributeWithMapping` to `ConceptAttributeWithMappings` (every use in the file) and change its body to:

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

Run: `pnpm test:frontend shared/models/ontology/AttributeMapping/DatasetColumnMapping/AttributeSources`
Expected: PASS, 4 tests.

- [ ] **Step 9: Commit**

```bash
git add shared/models/ontology src/clients/ontology/ConceptAttributeClient.ts
git commit -m "feat(joined-cases): keep the value rule on the field and order a field's sources"
```

---

## Task 6: `buildAttributeValueSql` stacks a field's sources

**Files:**
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql.ts:16-40, 101-155`
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/buildAttributeValueSql.ts` (rewrite)
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/buildAttributeValueSql.executed.test.ts` (create if plan 1 did not)
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql.executed.test.ts` (fixture shape)

Spec §6.3 and §6.4. The SQL and every expected value below were run against `@duckdb/node-api@1.5.5-r.4` on 2026-11-06 with this exact fixture and implementation.

- [ ] **Step 1: Write the failing executed tests**

Append to `src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/buildAttributeValueSql.executed.test.ts` (merge the imports into the file's existing ones; if the file does not exist, create it with a file header saying it runs each field's emitted SQL against real DuckDB over real parquet and asserts rows):

```ts
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getRowNumberedViewName } from "@/clients/DuckDbClient/duckDbSqlText";
import { buildAttributeValueSql } from "@/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/buildAttributeValueSql";
import { withDuckDb } from "../../../../../../tests/integration/queries/executedDuckDb";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type {
  ConceptAttributeColumn,
  ConceptAttributeSource,
} from "@/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql";
import type { DuckDBConnection } from "@duckdb/node-api";

const LINE_LIST_ID = "aaaaaaaa-5555-4555-8555-aaaaaaaaaaaa";
const LABS_ID = "bbbbbbbb-6666-4666-8666-bbbbbbbbbbbb";
const TWO_SOURCE_SPINE = "two_source_spine";

type DatasetColumnAttributeColumn = Extract<
  ConceptAttributeColumn,
  { kind: "dataset_column" }
>;

/**
 * Two datasets with different key columns: a line list keyed by `case_id`
 * and a lab sheet keyed by `patient_ref`, whose `titer` is BIGINT where the
 * line list's is INTEGER. `c1` has values in both and ties between them,
 * `c2` has a NULL in the line list and a NULL bucket date in the labs, `c3`
 * has only NULLs, `c4` is only in the labs, and `c5` is in neither.
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
      SELECT * FROM (VALUES ('c1'), ('c2'), ('c3'), ('c4'), ('c5')) AS t(external_id);
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

function _column(
  options: Readonly<{
    name: string;
    sources: readonly ConceptAttributeSource[];
    sharedType: string;
    ruleType?: ConceptAttribute.ValuePickerRuleType;
    isArray?: boolean;
    bucketGrain?: ConceptAttribute.BucketGrain;
  }>,
): DatasetColumnAttributeColumn {
  return {
    kind: "dataset_column",
    attributeId: `attr-${options.name}` as ConceptAttribute.Id,
    attributeName: options.name,
    sources: [...options.sources],
    sharedSourceDuckDbDataType: options.sharedType as DatasetColumnAttributeColumn["sharedSourceDuckDbDataType"],
    valuePickerRuleType: options.ruleType,
    isArray: options.isArray ?? false,
    bucketGrain: options.bucketGrain,
  };
}

/**
 * Selects the given fields for every record, ordered by key. JSON rows carry
 * a BIGINT as a string, so the BIGINT rules' values read as strings here.
 */
async function _queryTwoSourceFields(
  columns: readonly DatasetColumnAttributeColumn[],
): Promise<Array<Record<string, unknown>>> {
  return await withDuckDb(async (connection) => {
    await _seedTwoSources(connection);
    const selectors = columns.map((column) => {
      return buildAttributeValueSql({
        column,
        externalIdsTable: "individuals",
        externalIdColumn: "external_id",
        outputColumnName: column.attributeName,
      });
    });
    const reader = await connection.runAndReadAll(`
      SELECT individuals.external_id, ${selectors.join(",\n")}
      FROM "${TWO_SOURCE_SPINE}" individuals
      ORDER BY individuals.external_id
    `);
    return reader.getRowObjectsJson();
  });
}

/** One field's value for every record, in key order. */
async function _queryFieldValues(
  column: DatasetColumnAttributeColumn,
): Promise<unknown[]> {
  const rows = await _queryTwoSourceFields([column]);
  return rows.map((row) => {
    return row[column.attributeName];
  });
}

describe("buildAttributeValueSql over two sources", () => {
  // c1's first line-list row says negative. c2 has a NULL in the line list,
  // so the labs' value is its first. c4 is only in the labs.
  it("`first` takes the earliest source's first non-NULL value, reading the next source when it has none", async () => {
    expect(
      await _queryFieldValues(
        _column({
          name: "result",
          sources: RESULT_SOURCES,
          sharedType: "VARCHAR",
          ruleType: "first",
        }),
      ),
    ).toEqual(["negative", "positive", null, "positive", null]);
  });

  it("`first` follows source position, not the order the sources are listed in", async () => {
    expect(
      await _queryFieldValues(
        _column({
          name: "result",
          sources: [
            _lineListSource({ position: 1 }),
            _labsSource({ position: 0 }),
          ],
          sharedType: "VARCHAR",
          ruleType: "first",
        }),
      ),
    ).toEqual(["positive", "positive", null, "positive", null]);
  });

  // Ten runs, because a `first` that is deterministic only by luck returns
  // different values across runs of unchanged data.
  it("`first` across two sources returns the same value in ten consecutive runs", async () => {
    const column = _column({
      name: "result",
      sources: RESULT_SOURCES,
      sharedType: "VARCHAR",
      ruleType: "first",
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
        _column({
          name: "result",
          sources: RESULT_SOURCES,
          sharedType: "VARCHAR",
          ruleType: "most_frequent",
        }),
      ),
    ).toEqual(["negative", "positive", null, "positive", null]);
  });

  // c1's titers are 0 and 30 in the line list and 30 and 30 in the labs.
  it("`most_frequent` picks the value most frequent across both sources", async () => {
    const [c1] = await _queryFieldValues(
      _column({
        name: "titer",
        sources: TITER_SOURCES,
        sharedType: "BIGINT",
        ruleType: "most_frequent",
      }),
    );
    expect(c1).toBe("30");
  });

  it("`count` counts every source's non-NULL values, and 0 when there are none", async () => {
    expect(
      await _queryFieldValues(
        _column({
          name: "result",
          sources: RESULT_SOURCES,
          sharedType: "VARCHAR",
          ruleType: "count",
        }),
      ),
    ).toEqual(["4", "1", "0", "1", "0"]);
  });

  it("`sum`, `avg`, `min`, and `max` cover both sources once they are cast to one type", async () => {
    const rows = await _queryTwoSourceFields([
      _column({ name: "sum", sources: TITER_SOURCES, sharedType: "BIGINT", ruleType: "sum" }),
      _column({ name: "avg", sources: TITER_SOURCES, sharedType: "BIGINT", ruleType: "avg" }),
      _column({ name: "min", sources: TITER_SOURCES, sharedType: "BIGINT", ruleType: "min" }),
      _column({ name: "max", sources: TITER_SOURCES, sharedType: "BIGINT", ruleType: "max" }),
    ]);
    expect(rows[0]).toEqual({
      external_id: "c1",
      sum: 90,
      avg: 22.5,
      min: "0",
      max: "30",
    });
  });

  it("a list holds every non-NULL value in source order, then file order", async () => {
    expect(
      await _queryFieldValues(
        _column({
          name: "results",
          sources: RESULT_SOURCES,
          sharedType: "VARCHAR",
          isArray: true,
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
        _column({
          name: "phones",
          sources: PHONE_SOURCES,
          sharedType: "VARCHAR",
          isArray: true,
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
  // titer has no date, so it falls in no bucket.
  it("a bucketed `avg` averages both sources per month and drops a row with no date", async () => {
    expect(
      await _queryFieldValues(
        _column({
          name: "monthly",
          sources: DATED_TITER_SOURCES,
          sharedType: "BIGINT",
          ruleType: "avg",
          isArray: true,
          bucketGrain: "month",
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

  it("a bucketed `most_frequent` counts across sources within each month", async () => {
    const [c1] = await _queryFieldValues(
      _column({
        name: "monthly",
        sources: DATED_TITER_SOURCES,
        sharedType: "BIGINT",
        ruleType: "most_frequent",
        isArray: true,
        bucketGrain: "month",
      }),
    );
    expect(c1).toEqual([
      { bucket: "2026-01-01", value: "30" },
      { bucket: "2026-02-01", value: "30" },
    ]);
  });

  it("a bucketed `first` follows source position within each month", async () => {
    const lineListFirst = await _queryFieldValues(
      _column({
        name: "monthly",
        sources: DATED_TITER_SOURCES,
        sharedType: "BIGINT",
        ruleType: "first",
        isArray: true,
        bucketGrain: "month",
      }),
    );
    const labsFirst = await _queryFieldValues(
      _column({
        name: "monthly",
        sources: [
          { ...DATED_TITER_SOURCES[0]!, position: 1 },
          { ...DATED_TITER_SOURCES[1]!, position: 0 },
        ],
        sharedType: "BIGINT",
        ruleType: "first",
        isArray: true,
        bucketGrain: "month",
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

If plan 4 named the arm's grain or bucket column differently, use its names in `_column` and `_lineListSource`.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:executed src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql`
Expected: FAIL. The new cases fail with a DuckDB binder or parser error, because the current builder reads `column.datasetId`, which these columns do not have.

- [ ] **Step 3: Give the column arm its sources**

In `src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql.ts`, add `import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";` (if absent), and replace the `ConceptAttributeColumn` type with:

```ts
/**
 * One source of a dataset-column field as the view reads it: one column of
 * one dataset, matched to records by that dataset's own key column. Built by
 * column resolution from a mapping row, and read by `buildAttributeValueSql`.
 */
export type ConceptAttributeSource = {
  datasetId: string;
  /** The dataset column this source reads values from. */
  selectColumnName: string;
  /** The dataset's key column, which its rows are matched to records by. */
  primaryKeyColumnName: string;
  /** The date column that assigns rows to buckets, on a bucketed field only. */
  bucketColumnName: string | undefined;
  /** The source's place in the field's read order. */
  position: number;
};

/** One column of the concept relation, already resolved to what it reads. */
export type ConceptAttributeColumn =
  | {
      kind: "dataset_column";
      /** The field this column computes, whatever name it is emitted under. */
      attributeId: ConceptAttribute.Id;
      /** The relation's column name, which is the attribute's name. */
      attributeName: string;
      /** Every source, in read order. Never empty. */
      sources: ConceptAttributeSource[];
      /**
       * The DuckDB type every source's values are cast to so the stacked
       * rows share one type. Undefined for a field with one source, which
       * reads its column as stored.
       */
      sharedSourceDuckDbDataType: DuckDbDataType | undefined;
      /** Undefined only on a plain list, which keeps every value. */
      valuePickerRuleType: ConceptAttribute.ValuePickerRuleType | undefined;
      isArray: boolean;
      /** Set on a bucketed list, which reduces each bucket with the rule. */
      bucketGrain: ConceptAttribute.BucketGrain | undefined;
    }
  | {
      /**
       * An attribute with no dataset contribution to read, which today means a
       * manual-entry mapping. It becomes a typed NULL so the relation's schema
       * is stable whether or not a value exists, rather than the column
       * vanishing and breaking a saved query.
       */
      kind: "unmapped";
      attributeId: ConceptAttribute.Id;
      attributeName: string;
      duckDbDataType: DuckDbDataType;
    };
```

Replace `_buildColumnSelector` with the version below, and delete `_buildArraySelector` and every import only it used (`getEntityKeyComparisonSql`, `getRowNumberedViewName`, the `DatasetColumnMapping` type) if plan 1 left them:

```ts
function _buildColumnSelector(column: ConceptAttributeColumn): string {
  if (column.kind === "unmapped") {
    return `CAST(NULL AS ${column.duckDbDataType}) AS ${quoteSqlIdentifier(column.attributeName)}`;
  }
  return buildAttributeValueSql({
    column,
    externalIdsTable: SPINE_ALIAS,
    externalIdColumn: EXTERNAL_ID_COLUMN,
    outputColumnName: column.attributeName,
  });
}
```

- [ ] **Step 4: Rewrite `buildAttributeValueSql`**

Replace the contents of `src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/buildAttributeValueSql.ts` with the following. If plan 4 already has a grain-to-`date_trunc` table, use it instead of `DATE_TRUNC_PART_BY_GRAIN`.

```ts
import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { match } from "ts-pattern";
import {
  getEntityKeyComparisonSql,
  getRowNumberedViewName,
} from "@/clients/DuckDbClient/duckDbSqlText";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type {
  ConceptAttributeColumn,
  ConceptAttributeSource,
} from "@/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql";

/** A concept view column that reads dataset rows. */
type DatasetColumnAttributeColumn = Extract<
  ConceptAttributeColumn,
  { kind: "dataset_column" }
>;

/** The outer table whose key each source's rows are matched against. */
type ExternalIds = Readonly<{
  externalIdsTable: string;
  externalIdColumn: string;
}>;

/** The alias every rule reads a field's stacked source rows under. */
const STACKED_ALIAS = "stacked";

/** The `date_trunc` part for each grain, so no stored text reaches the SQL. */
const DATE_TRUNC_PART_BY_GRAIN: Record<ConceptAttribute.BucketGrain, string> = {
  day: "day",
  week: "week",
  month: "month",
  quarter: "quarter",
  year: "year",
};

function _buildBucketSql(
  options: Readonly<{
    column: DatasetColumnAttributeColumn;
    source: ConceptAttributeSource;
  }>,
): string | undefined {
  const { column, source } = options;
  if (column.bucketGrain === undefined) {
    return undefined;
  }
  if (source.bucketColumnName === undefined) {
    throw new Error(
      `Field '${column.attributeName}' is bucketed, but its source ` +
        `'${source.selectColumnName}' has no date column to bucket by.`,
    );
  }
  const part = DATE_TRUNC_PART_BY_GRAIN[column.bucketGrain];
  const bucketColumn = quoteSqlIdentifier(source.bucketColumnName);
  return `CAST(date_trunc('${part}', dataset.${bucketColumn}) AS DATE)`;
}

/**
 * One source's rows for the outer record: each non-NULL value, the source's
 * place in the read order, the row's place in its file, and for a bucketed
 * field the bucket. A row whose bucket date is NULL is dropped here.
 */
function _buildSourceRowsSql(
  options: Readonly<{
    column: DatasetColumnAttributeColumn;
    source: ConceptAttributeSource;
    sourceOrder: number;
    externalIds: ExternalIds;
  }>,
): string {
  const { column, source, sourceOrder, externalIds } = options;
  const valueSql = `dataset.${quoteSqlIdentifier(source.selectColumnName)}`;
  const sharedType = column.sharedSourceDuckDbDataType;
  const bucketSql = _buildBucketSql({ column, source });
  const selectList = [
    `${sharedType ? `CAST(${valueSql} AS ${sharedType})` : valueSql} AS value`,
    `${sourceOrder} AS source_order`,
    "dataset.file_row_number AS file_row_number",
    ...(bucketSql ? [`${bucketSql} AS bucket`] : []),
  ];
  const conditions = [
    getEntityKeyComparisonSql({
      ...externalIds,
      primaryKeyColumnName: source.primaryKeyColumnName,
    }),
    `${valueSql} IS NOT NULL`,
    ...(bucketSql ? [`${bucketSql} IS NOT NULL`] : []),
  ];
  const rowsView = quoteSqlIdentifier(getRowNumberedViewName(source.datasetId));
  return `SELECT ${selectList.join(", ")}
FROM ${rowsView} dataset
WHERE ${conditions.join("\n  AND ")}`;
}

/**
 * Every source's rows for the outer record, stacked into one relation in read
 * order: ascending `position`, with equal positions keeping the order the
 * sources were given in.
 */
function _buildStackedRowsSql(
  options: Readonly<{
    column: DatasetColumnAttributeColumn;
    externalIds: ExternalIds;
  }>,
): string {
  const { column, externalIds } = options;
  if (column.sources.length === 0) {
    throw new Error(`Field '${column.attributeName}' has no source to read.`);
  }
  const orderedSources = [...column.sources].sort((left, right) => {
    return left.position - right.position;
  });
  const branches = orderedSources.map((source, sourceOrder) => {
    return _buildSourceRowsSql({ column, source, sourceOrder, externalIds });
  });
  return `(\n${branches.join("\nUNION ALL\n")}\n) ${STACKED_ALIAS}`;
}

/** The aggregate that reduces stacked rows to one value under a rule. */
function _buildRuleAggregateSql(
  ruleType: Exclude<ConceptAttribute.ValuePickerRuleType, "most_frequent">,
): string {
  const value = `${STACKED_ALIAS}.value`;
  return match(ruleType)
    .with("first", () => {
      return `first(${value} ORDER BY ${STACKED_ALIAS}.source_order, ${STACKED_ALIAS}.file_row_number)`;
    })
    .with("sum", () => {
      return `CAST(SUM(${value}) AS DOUBLE)`;
    })
    .with("avg", () => {
      return `CAST(AVG(${value}) AS DOUBLE)`;
    })
    .with("count", () => {
      return `COUNT(${value})`;
    })
    .with("max", () => {
      return `MAX(${value})`;
    })
    .with("min", () => {
      return `MIN(${value})`;
    })
    .exhaustive();
}

/**
 * Reduces stacked rows under the field's rule: to one row for a single value,
 * or to one row per bucket for a bucketed list. Both shapes use this one
 * function, so a per-bucket rule cannot drift from the single-value rule of
 * the same name.
 */
function _buildReducedRowsSql(
  options: Readonly<{
    ruleType: ConceptAttribute.ValuePickerRuleType;
    stackedSql: string;
    isPerBucket: boolean;
  }>,
): string {
  const { ruleType, stackedSql, isPerBucket } = options;
  if (ruleType !== "most_frequent") {
    const bucket = isPerBucket ? `${STACKED_ALIAS}.bucket, ` : "";
    const groupBy = isPerBucket ? `\nGROUP BY ${STACKED_ALIAS}.bucket` : "";
    return `SELECT ${bucket}${_buildRuleAggregateSql(ruleType)} AS value
FROM ${stackedSql}${groupBy}`;
  }
  // Ties go to the smallest value, so the rule is deterministic.
  const outerBucket = isPerBucket ? "counted.bucket, " : "";
  const innerBucket = isPerBucket ? `${STACKED_ALIAS}.bucket, ` : "";
  const outerGroupBy = isPerBucket ? "\nGROUP BY counted.bucket" : "";
  return `SELECT ${outerBucket}first(counted.value ORDER BY counted.value_count DESC, counted.value) AS value
FROM (
  SELECT ${innerBucket}${STACKED_ALIAS}.value, COUNT(*) AS value_count
  FROM ${stackedSql}
  GROUP BY ${innerBucket}${STACKED_ALIAS}.value
) counted${outerGroupBy}`;
}

function _getRequiredRuleType(
  column: DatasetColumnAttributeColumn,
): ConceptAttribute.ValuePickerRuleType {
  if (column.valuePickerRuleType === undefined) {
    throw new Error(
      `Field '${column.attributeName}' needs a value rule to reduce its rows.`,
    );
  }
  return column.valuePickerRuleType;
}

/** The body of the field's scalar subquery, by value shape. */
function _buildValueSql(
  options: Readonly<{
    column: DatasetColumnAttributeColumn;
    stackedSql: string;
  }>,
): string {
  const { column, stackedSql } = options;
  if (column.bucketGrain !== undefined) {
    const perBucketSql = _buildReducedRowsSql({
      ruleType: _getRequiredRuleType(column),
      stackedSql,
      isPerBucket: true,
    });
    return `SELECT COALESCE(list({'bucket': reduced.bucket, 'value': reduced.value} ORDER BY reduced.bucket), [])
FROM (
${perBucketSql}
) reduced`;
  }
  if (column.isArray) {
    return `SELECT COALESCE(list(${STACKED_ALIAS}.value ORDER BY ${STACKED_ALIAS}.source_order, ${STACKED_ALIAS}.file_row_number), [])
FROM ${stackedSql}`;
  }
  return _buildReducedRowsSql({
    ruleType: _getRequiredRuleType(column),
    stackedSql,
    isPerBucket: false,
  });
}

/**
 * Builds the correlated scalar subquery that computes one field's value for
 * the outer query's current record.
 *
 * Every source contributes its rows, keyed by its own dataset's key column,
 * and the field's single-value rule, list, or per-bucket rule runs once over
 * all of them. NULL values never reach a rule, and rows are ordered by
 * source position, then file row number. Use it wherever a field's value is
 * read from datasets, such as a concept view column or a record's name.
 */
export function buildAttributeValueSql(
  options: Readonly<{
    column: DatasetColumnAttributeColumn;
    externalIdsTable: string;
    externalIdColumn: string;
    outputColumnName: string;
  }>,
): string {
  const { column, externalIdsTable, externalIdColumn } = options;
  const stackedSql = _buildStackedRowsSql({
    column,
    externalIds: { externalIdsTable, externalIdColumn },
  });
  return `(
${_buildValueSql({ column, stackedSql })}
) AS ${quoteSqlIdentifier(options.outputColumnName)}`;
}
```

- [ ] **Step 5: Move every single-source fixture to the new arm**

In `buildConceptViewSql.executed.test.ts` and in plan 1 to 4's cases of `buildAttributeValueSql.executed.test.ts`, change every `kind: "dataset_column"` fixture by moving its dataset, column, key and bucket column into one source and adding the shared type. For example, `AGE` becomes:

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
  valuePickerRuleType: "first",
  isArray: false,
  bucketGrain: undefined,
};
```

A list fixture (`TAGS`) gets `valuePickerRuleType: undefined`. Do not change any expected row: a field with one source must return exactly what it returned before.

- [ ] **Step 6: Run both files and watch them pass**

Run: `pnpm test:executed src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql`
Expected: PASS, including the 12 new two-source cases and every earlier case unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql
git commit -m "feat(joined-cases): read a field by stacking its sources and reducing them once"
```

---

## Task 7: Column resolution builds every source

**Files:**
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata.ts`
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/__tests__/conceptAttributeColumns.integration.executed.test.ts`

Spec §6.5 and §6.6.

- [ ] **Step 1: Update the fixture helpers**

In `conceptAttributeColumns.integration.executed.test.ts`:

1. In `_attribute`, add `valuePickerRuleType: "first",` and `bucketGrain: undefined,` before `...overrides`.
2. Replace `_mapping` with:

```ts
function _mapping(
  options: Readonly<{
    attributeName: string;
    datasetId: Dataset.Id;
    columnName: string;
    dataType?: DatasetColumn.T["dataType"];
    position?: number;
  }>,
): MappedColumn {
  const datasetColumnId =
    `col-${options.datasetId}-${options.columnName}` as DatasetColumn.Id;
  return {
    mapping: {
      id: `map-${options.attributeName}-${options.columnName}` as DatasetColumnMapping["id"],
      workspaceId:
        "wwwwwwww-4444-4444-8444-wwwwwwwwwwww" as DatasetColumnMapping["workspaceId"],
      type: "dataset_column",
      conceptAttributeId:
        `attr-${options.attributeName}` as ConceptAttribute.Id,
      datasetId: options.datasetId,
      datasetColumnId,
      bucketColumnId: undefined,
      position: options.position ?? 0,
      createdAt: "2026-08-19T00:00:00Z",
      updatedAt: "2026-08-19T00:00:00Z",
    },
    datasetColumn: {
      id: datasetColumnId,
      name: options.columnName,
      datasetId: options.datasetId,
      dataType: options.dataType ?? "varchar",
    } as DatasetColumn.T,
  };
}
```

3. Where an existing case passed `ruleType` to `_mapping`, pass it to that attribute's `_attribute(...)` as `valuePickerRuleType` instead. A list attribute (`TAGS`) gets `valuePickerRuleType: undefined`.

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
});
const PATIENT_NO_SOURCE = _mapping({
  attributeName: "Case ref",
  datasetId: LABS,
  columnName: "patient_no",
  dataType: "bigint",
  position: 1,
});
const RESULT_LINE_LIST_SOURCE = _mapping({
  attributeName: "Result",
  datasetId: LINE_LIST,
  columnName: "result",
});
const RESULT_LABS_SOURCE = _mapping({
  attributeName: "Result",
  datasetId: LABS,
  columnName: "lab_result",
  position: 1,
});
const CASE_REF = _attribute({ name: "Case ref", isIdentifier: true });
const RESULT = _attribute({
  name: "Result",
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
            dataType: "bigint",
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
            }),
            _mapping({
              attributeName: "Mixed",
              datasetId: LABS,
              columnName: "patient_no",
              dataType: "bigint",
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
              position: 1,
            }),
          ],
        }),
      );
    }).toThrow(/has no identifier attribute mapped into it/);
  });

  it("refuses a bucketed field whose source has no date column", () => {
    expect(() => {
      makeConceptAttributeColumnsFromMetadata(
        _metadata({
          attributes: [
            CASE_REF,
            _attribute({
              name: "Monthly result",
              isArray: true,
              bucketGrain: "month",
              valuePickerRuleType: "count",
            }),
          ],
          mappings: [
            CASE_REF_SOURCE,
            PATIENT_NO_SOURCE,
            _mapping({
              attributeName: "Monthly result",
              datasetId: LINE_LIST,
              columnName: "result",
            }),
          ],
        }),
      );
    }).toThrow(/no date column to bucket by/);
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `pnpm test:executed src/clients/qetl/QueryMediator/conceptRelation/__tests__/conceptAttributeColumns`
Expected: FAIL. The first case returns `negative` for record 7 (only the first mapping is read today), and the three `toThrow` cases throw nothing or a different message.

- [ ] **Step 4: Rewrite column resolution**

In `src/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata.ts`:

1. Replace the imports with:

```ts
import { prop } from "@avandar/utils";
import { AttributeSources } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/AttributeSources/AttributeSources";
import { ConceptStatusColumn } from "$/models/queries/ConceptStatusColumn/ConceptStatusColumn";
import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import { removeDuplicates } from "@/lib/utils/arrays/removeDuplicates/removeDuplicates";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes";
import type { AttributeMapping } from "$/models/ontology/AttributeMapping/AttributeMapping.types";
import type { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type {
  ConceptAttributeColumn,
  ConceptAttributeSource,
} from "@/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql";
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

3. Delete `_isDatasetColumnMapping` and `_getDatasetColumnMappingsForAttribute`. In `_getPrimaryKeyColumnNameByDatasetId`, replace the `_getDatasetColumnMappingsForAttribute({ ... })` call with `AttributeSources.getSourceMappingsFromMappings({ attributeId: attribute.id, mappings: metadata.mappings })`, and change the last paragraph of its docstring to:

```ts
 * A dataset reached by two identifier sources is resolved by attribute order,
 * then by each attribute's read order, not by insertion order, so two runs
 * pick the same key column. One ID field with a source per dataset fills the
 * map exactly as one identifier field per dataset does.
```

4. In `_buildUnmappedColumn`, add `attributeId: attribute.id,` to the returned object.

5. Replace `_buildAttributeColumn` (and its docstring) with these four functions:

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
  const bucketColumn =
    mapping.bucketColumnId === undefined
      ? undefined
      : _getDatasetColumn({
          attribute,
          datasetColumnId: mapping.bucketColumnId,
          metadata,
        });
  if (attribute.bucketGrain !== undefined && bucketColumn === undefined) {
    throw new Error(
      `Concept attribute '${attribute.name}' (${attribute.id}) is bucketed, ` +
        `but its source '${valueColumn.name}' has no date column to bucket by.`,
    );
  }
  return {
    source: {
      datasetId: mapping.datasetId,
      selectColumnName: valueColumn.name,
      primaryKeyColumnName,
      bucketColumnName: bucketColumn?.name,
      position: mapping.position,
    },
    datasetId: mapping.datasetId,
    valueColumn,
  };
}

/**
 * The DuckDB type a field's sources are cast to so they stack into one
 * relation, or undefined for a single source, which reads its column as
 * stored. An identifier's sources are keys, which are compared as text, so
 * they may differ in type and are then read as VARCHAR. Any other field's
 * sources must share a type.
 */
function _getSharedSourceDuckDbDataType(
  options: Readonly<{
    attribute: ConceptAttribute.T;
    valueColumns: readonly DatasetColumn.T[];
  }>,
): DuckDbDataType | undefined {
  const { attribute, valueColumns } = options;
  if (valueColumns.length <= 1) {
    return undefined;
  }
  const dataTypes = removeDuplicates(valueColumns.map(prop("dataType")));
  const [onlyDataType] = dataTypes;
  if (dataTypes.length === 1 && onlyDataType !== undefined) {
    return DuckDbDataTypeUtils.fromDatasetColumnType(onlyDataType);
  }
  if (attribute.isIdentifier) {
    return "VARCHAR";
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
 * become a typed NULL rather than an error: the relation's schema stays
 * complete, and it is honest, because we hold no value for it.
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
    return {
      column: _buildUnmappedColumn(attribute),
      contributingDatasetIds: [],
    };
  }
  const builtSources = mappings.map((mapping) => {
    return _buildSource({
      attribute,
      mapping,
      metadata,
      primaryKeyColumnNameByDatasetId: options.primaryKeyColumnNameByDatasetId,
    });
  });
  return {
    column: {
      kind: "dataset_column",
      attributeId: attribute.id,
      attributeName: attribute.name,
      sources: builtSources.map(prop("source")),
      sharedSourceDuckDbDataType: _getSharedSourceDuckDbDataType({
        attribute,
        valueColumns: builtSources.map(prop("valueColumn")),
      }),
      valuePickerRuleType: attribute.valuePickerRuleType,
      isArray: attribute.isArray,
      bucketGrain: attribute.bucketGrain,
    },
    contributingDatasetIds: builtSources.map(prop("datasetId")),
  };
}
```

6. In `makeConceptAttributeColumnsFromMetadata`, replace

```ts
    const { column, contributingDatasetId } = _buildAttributeColumn({
```

through

```ts
      contributingDatasetIds.add(contributingDatasetId);
    }
```

with:

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

and in its docstring replace the last paragraph with:

```ts
 * One column per attribute, never one per mapping: a field with several
 * sources is one column whose value the view computes over all of them.
```

Remove the `AttributeMapping` type import if nothing uses it any more.

- [ ] **Step 5: Run the file and watch it pass**

Run: `pnpm test:executed src/clients/qetl/QueryMediator/conceptRelation`
Expected: PASS, including the six new cases and every earlier case.

- [ ] **Step 6: Commit**

```bash
git add src/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata.ts src/clients/qetl/QueryMediator/conceptRelation/__tests__/conceptAttributeColumns.integration.executed.test.ts
git commit -m "feat(joined-cases): resolve every source of a field, keyed by its own dataset"
```

---

## Task 8: Needed columns and contributors cover every source

**Files:**
- Modify: `src/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery.ts:78-93`
- Modify: `src/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery.test.ts`
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql.test.ts`
- Modify: `src/clients/qetl/QueryMediator/__tests__/QueryMediator.concepts.test.ts:~120-140` (fixture shape)

- [ ] **Step 1: Write the failing tests**

In `getNeededColumnsFromQuery.test.ts`, change the `CONCEPT_PLAN` column to the new arm (one source, as in Task 6 Step 5; the expected `["age_years", "person_id"]` does not change), add `const OTHER_DATASET_ID = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb" as Dataset.Id;` and the `ConceptAttribute` type import, and add:

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
          valuePickerRuleType: "avg",
          isArray: true,
          bucketGrain: "month",
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

In `getConceptRelationPlansFromSql.test.ts`, add `valuePickerRuleType: "first"` (and plan 4's `bucketGrain: undefined`) to `IDENTIFIER_ATTRIBUTE`, replace `valuePickerRuleType: "first",` in `IDENTIFIER_MAPPING` with `position: 0, bucketColumnId: undefined,`, add `dataType: "varchar"` to `IDENTIFIER_COLUMN`, and add:

```ts
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

In `QueryMediator.concepts.test.ts`, move the `dataset_column` fixture column to the new arm the same way (expected results unchanged).

- [ ] **Step 2: Run them and watch the needed-columns case fail**

Run: `pnpm test:frontend src/clients/qetl/QueryMediator/getNeededColumnsFromQuery src/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql src/clients/qetl/QueryMediator/__tests__/QueryMediator.concepts`
Expected: the new needed-columns case FAILS (`undefined` keys, because the function still reads `column.datasetId`). The contributor case already PASSES, because Task 7 added every source's dataset to `contributingDatasetIds`; it stays as the regression guard.

- [ ] **Step 3: Read every source**

In `getNeededColumnsFromQuery.ts`, replace the inner `.reduce` callback of `_getConceptColumnsByDatasetId` with:

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

If plan 4 already added the bucket column here, keep one copy of it.

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
- Modify: `src/views/OntologyDesignerApp/insertConceptFromFormValues/insertConceptFromFormValues.ts:75-106`, `insertConceptFromFormValues.test.ts:47-58`
- Modify: `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeAttributesList.tsx:114-125, 52, 97-101`

The case type page and Sync read a field's mappings from the hydrated concept, so they must hold all of them (spec §6.2, §6.8).

- [ ] **Step 1: Write the failing test**

In `insertConceptFromFormValues.test.ts`, replace the `generateIndividuals` mock's `getAttributesWithMapping` with:

```ts
      getAttributesWithMappings: (
        attributes: ReadonlyArray<{ mappings?: unknown[] }>,
      ) => {
        return attributes.filter((attribute) => {
          return (attribute.mappings ?? []).length > 0;
        });
      },
```

and add this case to the `describe` block:

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

In `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeActions.test.tsx:65`, rename `getAttributesWithMapping` to `getAttributesWithMappings`.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:frontend src/views/OntologyDesignerApp/insertConceptFromFormValues`
Expected: FAIL. `getAttributesWithMappings` is not exported from the mocked module's real counterpart, and the attribute has no `mappings`.

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

In `insertConceptFromFormValues.ts`, rename the import to `getAttributesWithMappings` and in `_getFullConcept` replace the `attributesWithMappings` block with:

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

In `RefreshRecordsButton.tsx`, rename the import and call to `getAttributesWithMappings`.

In `useHydratedConcept.ts`, replace the `attributes:` mapping inside `hydratedConcept` with:

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

In `CaseTypeAttributesList.tsx`, add the imports `import { useLingui } from "@lingui/react/macro";`, `import { useMemo } from "react";` and `import { AttributeSources } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/AttributeSources/AttributeSources";`. Replace `datasetNameForAttribute` with:

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

## Task 10: Sync reads every identifier source and a multi-source name

**Files:**
- Modify: `src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/generateIndividuals.ts:151-314`
- Modify: `src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/generateIndividuals.test.ts`

Spec §6.7. Plan 6 later removes the name from Sync; until then it must read several sources.

- [ ] **Step 1: Update the fixture and write the failing test**

In `generateIndividuals.test.ts`:

1. Give `_makeMapping` an optional `datasetId` and `position` argument, and replace its `valuePickerRuleType: "first",` with `position: args.position ?? 0, bucketColumnId: undefined,` and `datasetId: args.datasetId ?? DATASET_ID,`.
2. Give `_makeDatasetColumn` an optional `datasetId` argument (default `DATASET_ID`).
3. In `_makeConcept`'s `_makeAttribute`, add `valuePickerRuleType: "first" as const,` (and plan 4's `bucketGrain: undefined,`) to the `Model.make` call, and replace `mapping: _makeMapping(...)` with `mappings: [_makeMapping({ conceptAttributeId: args.id, datasetColumnId: args.datasetColumnId })]`.

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

Reuse the file's existing `beforeEach` resets (`vi.clearAllMocks()` and the `JobProgressStore` spies) if the outer `describe` does not already cover this block.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:frontend src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/generateIndividuals.test.ts`
Expected: FAIL. Sync reads `attribute.mapping`, which no longer exists, so it throws before staging.

- [ ] **Step 3: Resolve Sync's sources through column resolution**

In `generateIndividuals.ts`, add the imports:

```ts
import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { buildAttributeValueSql } from "@/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/buildAttributeValueSql";
import { makeConceptAttributeColumnsFromMetadata } from "@/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata";
import { removeDuplicates } from "@/lib/utils/arrays/removeDuplicates/removeDuplicates";
import type {
  ConceptAttributeColumn,
  ConceptAttributeSource,
} from "@/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql";
```

(add `makeIdLookupRecord` to the `@avandar/utils` import, and remove imports this step leaves unused). Replace `IndividualSourceMappings` and `_resolveIndividualSourceMappings` with:

```ts
/**
 * What the staging SQL reads: every identifier source, the record name's
 * field as a view column, and the columns each dataset must load.
 */
type IndividualSources = {
  identifierSources: ConceptAttributeSource[];
  labelColumn: Extract<ConceptAttributeColumn, { kind: "dataset_column" }>;
  neededColumnsByDatasetId: Record<string, string[]>;
};

/** Every column a set of dataset-column mappings names, bucket dates included. */
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
async function _resolveIndividualSources(
  concept: BuildableConcept,
): Promise<IndividualSources> {
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
  if (labelColumn?.kind !== "dataset_column") {
    throw new Error(
      `Concept ${concept.name} names its records from ` +
        `'${labelAttribute.name}', which does not read a dataset.`,
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

`_resolveIndividualSources` is over 45 lines if `_getNeededColumnsByDatasetId` is inlined; keep them separate as shown.

In `_stageIndividuals`, change the `mappings` option to `sources: IndividualSources`, destructure `{ identifierSources, labelColumn, neededColumnsByDatasetId }`, and replace the two template values with:

```ts
      externalIdSelectors: identifierSources
        .map((source) => {
          return `SELECT ${quoteSqlIdentifier(source.selectColumnName)} AS external_id FROM ${quoteSqlIdentifier(source.datasetId)}`;
        })
        .join(" UNION ALL "),
      titleSelector: buildAttributeValueSql({
        column: labelColumn,
        externalIdsTable: "external_ids",
        externalIdColumn: "external_id",
        outputColumnName: "name",
      }),
```

Update the comment above `WorkspaceQuerySession.runQuery` to say Sync reads each identifier source's key column and each label source's value and key column. In `_runGenerateIndividuals`, replace `const mappings = await _resolveIndividualSourceMappings(concept);` with `const sources = await _resolveIndividualSources(concept);` and pass `sources` to `_stageIndividuals`.

The external id selectors keep today's uncast shape on purpose: casting a key column would re-key existing records whose keys are not text.

- [ ] **Step 4: Run the file and watch it pass**

Run: `pnpm test:frontend src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals`
Expected: PASS, the new case and every earlier one.

- [ ] **Step 5: Commit**

```bash
git add src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals
git commit -m "feat(joined-cases): sync records from every identifier source and name them from every label source"
```

---

## Task 11: The record page names every source dataset

**Files:**
- Modify: `src/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail.tsx:13-19, 57-81`
- Modify: `src/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail.test.tsx`
- Modify: the file where plan 1 builds `CaseDetailsRow.sourceName` (Task 0 found it with `rg -n "sourceName" src/views/IndividualManagerApp`)

- [ ] **Step 1: Write the failing test**

In `CaseDetailsRail.test.tsx`, change `sourceName: "Measles line list",` to `sourceNames: ["Measles line list"],`, add `sourceNames: [],` to the MMR row, and add:

```ts
  it("names every source dataset of a field, in read order", () => {
    render(
      <CaseDetailsRail
        attributes={[
          {
            id: uuid<ConceptAttribute.Id>(),
            name: "Result",
            value: "positive",
            sourceNames: ["Line list", "Lab results"],
          },
        ]}
      />,
    );
    expect(screen.getByText("Line list, Lab results")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:frontend src/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail`
Expected: FAIL, `Unable to find an element with the text: Line list, Lab results`.

- [ ] **Step 3: List the sources**

In `CaseDetailsRail.tsx`, add `import { useLingui } from "@lingui/react/macro";` and `import { useMemo } from "react";`, and replace `sourceName?: string;` in `CaseDetailsRow` with:

```ts
  /** The datasets this field reads, in read order, each once. */
  sourceNames: readonly string[];
```

In `CaseDetailsRail`, before `return`, add:

```ts
  const { i18n } = useLingui();
  const sourceNameList = useMemo(() => {
    return new Intl.ListFormat(i18n.locale, {
      style: "short",
      type: "unit",
    });
  }, [i18n.locale]);
```

and replace the `attribute.sourceName ? (...) : null` block with:

```tsx
                {attribute.sourceNames.length > 0 ? (
                  <Text size="xs" c="dimmed">
                    {sourceNameList.format(attribute.sourceNames)}
                  </Text>
                ) : null}
```

In the file where plan 1 sets `sourceName`, set `sourceNames` instead, built from every dataset-column mapping of the field:

```ts
        sourceNames: AttributeSources.getDatasetIdsFromMappings({
          attributeId: attribute.id,
          mappings,
        }).flatMap((datasetId) => {
          const datasetName = datasetNamesById[datasetId];
          return datasetName === undefined ? [] : [datasetName];
        }),
```

using the mappings and dataset names plan 1 already fetches there (rename to match).

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm test:frontend src/views/IndividualManagerApp/SingleIndividualView`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/IndividualManagerApp/SingleIndividualView
git commit -m "feat(joined-cases): list every source dataset of a field on the record page"
```

---

## Task 12: The chat contract and parsers carry sources

**Files:**
- Modify: `shared/types/chat.types.ts:108-137, 187-201, 227-231`
- Create: `supabase/functions/chat/PostChatMessages/parsing/parseChatCaseAttributeSources.ts`
- Create: `supabase/functions/chat/PostChatMessages/parsing/parseChatCaseAttributeSources.test.ts`
- Modify: `supabase/functions/chat/PostChatMessages/parsing/parseProposeCaseType.ts:14-24, 67-89, 140-161, 198-201`, `parseProposeCaseType.test.ts`
- Modify: `supabase/functions/chat/PostChatMessages/parsing/parseCreateCaseTypes.ts:21-64, 96-123`, `parseCreateCaseTypes.test.ts`

Spec §6.9.

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

In `parseProposeCaseType.test.ts`, change every attribute in every fixture from `datasetId: X, columnId: Y,` to `sources: [{ datasetId: X, columnId: Y }],`, and the matching expectations the same way. Then add:

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
            valuePickerRuleType: "most_frequent",
          },
        ],
        manualEntryAttributes: [],
      }),
    );

    expect(parsed?.attributes[0]?.sources).toEqual([
      { datasetId: DEATHS_DATASET_ID, columnId: STATE_COLUMN_ID },
      { datasetId: CENSUS_DATASET_ID, columnId: POPULATION_COLUMN_ID },
    ]);
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
            valuePickerRuleType: "first",
          },
          {
            sources: [{ datasetId: DEATHS_DATASET_ID, columnId: STATE_COLUMN_ID }],
            name: "State again",
            isIncluded: true,
            valuePickerRuleType: "first",
          },
        ],
        manualEntryAttributes: [],
      }),
    );

    expect(
      parsed?.attributes.map((attribute) => {
        return attribute.name;
      }),
    ).toEqual(["State"]);
  });
```

In `parseCreateCaseTypes.test.ts`, move every `dataset_column` attribute fixture and expectation to `sources` the same way, and add:

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

    expect(parsed?.[0]?.attributes[0]).toEqual({
      name: "Result",
      kind: "dataset_column",
      sources: [{ datasetId: DATASET_ID, columnId: COLUMN_ID }],
    });
  });
```

using that file's existing id constants (add `OTHER_DATASET_ID` and `OTHER_COLUMN_ID` as fresh uuid strings if it has none).

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm test:frontend supabase/functions/chat/PostChatMessages/parsing`
Expected: FAIL. `parseChatCaseAttributeSources.ts` does not exist, and both parsers drop every attribute that has `sources` instead of `datasetId` and `columnId`.

- [ ] **Step 3: Change the contract**

In `shared/types/chat.types.ts`:

1. Change the `ChatCaseValuePickerRuleType` docstring to: `Which value a dataset-column field keeps when its sources hold several rows per case. Mirrors the attribute_mappings__value_picker_rule_type database enum.`
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
  /** The date column that buckets this source's rows, on a bucketed field. */
  bucketColumnId?: string;
};
```

3. In `ChatCreatedCaseAttribute`'s `dataset_column` arm and in `ChatProposedCaseAttribute`, replace `datasetId: string;` and `columnId: string;` (and their comments) with:

```ts
  /**
   * Every column this field reads, in priority order. Never empty. The first
   * source's column names the field in the draft card and in `labelColumnId`.
   */
  sources: ChatCaseAttributeSource[];
```

and delete plan 4's attribute-level `bucketColumnId` from both (it now lives on each source).

4. Change `labelColumnId`'s docstring to: `The first source column of the field whose value labels each case in the UI. The client falls back to a join key when it names no field.`

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

In `parseProposeCaseType.ts`, import `parseChatCaseAttributeSources`, change the comment above `VALUE_PICKER_RULE_TYPES` (add one if missing) to `The rules a field's rows can be reduced by. Mirrors ChatCaseValuePickerRuleType.`, and replace `_parseAttribute` and `_parseSourceAttributes` with:

```ts
function _parseAttribute(
  raw: unknown,
  sourceDatasetIds: ReadonlySet<string>,
): ChatProposedCaseAttribute | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const record = raw as Record<string, unknown>;
  const sources = parseChatCaseAttributeSources({
    rawSources: record.sources,
    datasetIds: sourceDatasetIds,
  });
  const name = _asTrimmedString(record.name);
  if (sources.length === 0 || !name) {
    return undefined;
  }
  const description = _asTrimmedString(record.description);
  return {
    sources,
    // Every case type has a built-in `status`, and a dataset `status` column
    // is common, so the attribute is renamed rather than dropped.
    name: ConceptStatus.toNonReservedAttributeName(name),
    isIncluded: record.isIncluded !== false,
    valuePickerRuleType: _asValuePickerRuleType(record.valuePickerRuleType),
    ...(description ? { description } : {}),
  };
}

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
  }>,
): ChatProposedCaseAttribute[] {
  const sourceDatasetIds = new Set(
    options.sourceDatasets.map((sourceDataset) => {
      return sourceDataset.datasetId;
    }),
  );
  const seenFirstColumnIds = new Set<string>();
  return _parseList(options.rawAttributes, (raw) => {
    return _parseAttribute(raw, sourceDatasetIds);
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

Keep plan 3's `valueShape` and plan 4's `bucketGrain` parsing inside `_parseAttribute`, and delete plan 4's attribute-level `bucketColumnId` parsing. In `parseProposeCaseType`, change the label check to:

```ts
  const hasLabelAttribute = attributes.some((attribute) => {
    return attribute.sources[0]?.columnId === labelColumnId;
  });
```

- [ ] **Step 6: Parse sources in created case types**

In `parseCreateCaseTypes.ts`, import `parseChatCaseAttributeSources` and replace `_parseDatasetColumnAttribute` and `_parseAttribute` with:

```ts
function _parseDatasetColumnAttribute(
  options: Readonly<{
    raw: Record<string, unknown>;
    name: string;
    datasetIds: ReadonlySet<string>;
  }>,
): ChatCreatedCaseAttribute | undefined {
  const { raw, name } = options;
  const sources = parseChatCaseAttributeSources({
    rawSources: raw.sources,
    datasetIds: options.datasetIds,
  });
  if (sources.length === 0) {
    return undefined;
  }
  return {
    name,
    kind: "dataset_column",
    sources,
    ...(_asTrimmedString(raw.description)
      ? { description: _asTrimmedString(raw.description) }
      : {}),
    ...(raw.isLabel === true ? { isLabel: true } : {}),
  };
}

function _parseAttribute(
  raw: unknown,
  datasetIds: ReadonlySet<string>,
): ChatCreatedCaseAttribute | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const record = raw as Record<string, unknown>;
  const name = _asTrimmedString(record.name);
  if (!name) {
    return undefined;
  }
  if (record.kind === "manual_entry") {
    return {
      name,
      kind: "manual_entry",
      ...(_asTrimmedString(record.description)
        ? { description: _asTrimmedString(record.description) }
        : {}),
    };
  }
  if (record.kind === "dataset_column") {
    return _parseDatasetColumnAttribute({ raw: record, name, datasetIds });
  }
  return undefined;
}
```

In `_parseCaseType`, replace the `attributes` expression with:

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
- Modify: `supabase/functions/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.ts:167-221, 325-341`, `makeChatToolConfigFromOptions.test.ts`
- Modify: `supabase/functions/chat/PostChatMessages/prompt/buildCaseManagerSystemPrompt.ts:81-93`, `buildCaseManagerSystemPrompt.test.ts`

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
        return ["sources", "datasetId", "columnId"].includes(key);
      }),
      minSources: attributeItems?.properties.sources?.minItems,
      requiresSources: attributeItems?.required.includes("sources"),
    }).toEqual({ keys: ["sources"], minSources: 1, requiresSources: true });
  });
```

In `buildCaseManagerSystemPrompt.test.ts`, add (using that file's existing call helper or arguments):

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

1. `labelColumnId.description`: `"Column id of the first source of the attribute whose value names each case in the UI. Must be the first source of one of \`attributes\`."`
2. `attributes.description`: `"One entry per field worth mapping, across all source datasets. Preselect the useful ones with isIncluded true and offer marginal ones with isIncluded false."`
3. In `attributes.items.properties`, delete `datasetId` and `columnId` (and plan 4's `bucketColumnId`) and add, first:

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
                    },
                    required: ["datasetId", "columnId"],
                    additionalProperties: false,
                  },
                },
```

(if plan 4 added `bucketColumnId` to the attribute, add it to these source `properties` instead, unrequired, with its description changed to "this source's date column").
4. `valuePickerRuleType.description`: `"Which value to keep when the field's sources hold several rows per case. Use sum or max for cumulative measures, first for dates, most_frequent for categories."`
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

1. Replace the `labelColumnId` bullet with:

```
- \`labelColumnId\` is the column a human would read to recognise a case, such as a name, county, or title. It must be the first source of one of \`attributes\`.
```

2. Replace the "Choose the value picker per column" bullet with:

```
- Choose the value picker per field: sum or max for cumulative measures, first for dates, most_frequent for categories and text. A dataset at a finer grain than the case type usually needs sum or max.
- A field can read several columns when they hold the same thing: phone 1 and phone 2 in one dataset, or lab results kept in two sheets. Give that field one entry per column in its \`sources\`, in priority order: when the field keeps one value, the earliest source with a value wins, and a list holds the sources' values in that order. Every source of a field must have the same column type, and each source's dataset must be in \`sourceDatasets\`.
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

Spec §6.6. This task depends on Task 16's form types (`mappings.datasetColumn` is an array and the rule is on the attribute); do Task 16 Steps 3 and 4 first if you run tasks out of order.

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

function _identifierOf(attributes: readonly AttributeFormValues[]) {
  return attributes.filter((attribute) => {
    return attribute.isIdentifier;
  });
}

describe("makeAttributesWithIdentifierFromKeyColumns", () => {
  it("makes one ID field reading each dataset's key column, in order", () => {
    const [identifier, ...rest] = _identifierOf(
      makeAttributesWithIdentifierFromKeyColumns({
        conceptId: CONCEPT_ID,
        keyColumns: [CASE_ID_COLUMN, PATIENT_REF_COLUMN],
        attributes: [],
      }),
    );

    expect({
      count: rest.length + 1,
      name: identifier?.name,
      rule: identifier?.valuePickerRuleType,
      columnIds: identifier?.mappings.datasetColumn.map((source) => {
        return source.datasetColumnId;
      }),
    }).toEqual({
      count: 1,
      name: "case_id",
      rule: "first",
      columnIds: [CASE_ID_COLUMN.id, PATIENT_REF_COLUMN.id],
    });
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
  const [firstKeyColumn] = keyColumns;
  if (firstKeyColumn === undefined) {
    return [...attributes];
  }
  const keyColumnIds = new Set(keyColumns.map(prop("id")));
  const keyFields = attributes.filter((attribute) => {
    return _isKeyField(attribute, keyColumnIds);
  });
  const namingField =
    keyFields.find((attribute) => {
      return attribute.mappings.datasetColumn[0]?.datasetColumnId === firstKeyColumn.id;
    }) ?? keyFields[0];
  const labelField = keyFields.find(prop("isLabel"));
  const id = (labelField ?? namingField)?.id ?? uuid<ConceptAttributeId>();
  const identifier: AttributeFormValues = Model.make("ConceptAttribute", {
    id,
    conceptId,
    name: ConceptStatus.toNonReservedAttributeName(
      namingField?.name ?? firstKeyColumn.name,
    ),
    description: namingField?.description,
    dataType: _getKeyDataType(keyColumns),
    mappingType: "dataset_column",
    isIdentifier: true,
    isLabel: labelField !== undefined,
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
  return [identifier, ...attributes.filter((attribute) => {
    return !keyFields.includes(attribute);
  })];
}
```

Run `pnpm format`. If the function exceeds 45 lines after formatting, extract the `Model.make` call into `_makeIdentifierField({ id, conceptId, namingField, labelField, keyColumns })`.

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

In both test files, move every `dataset_column` attribute fixture from `datasetId`/`columnId` to `sources: [{ datasetId, columnId }]`. Then in `proposedCaseTypeToCreatedCaseType.test.ts` add (using that file's draft factory and ids):

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
          : { ...attribute, isIncluded: attribute.sources[0]?.datasetId !== CENSUS_DATASET_ID ? attribute.isIncluded : false };
      }),
    });

    expect(
      created.identities.map((identity) => {
        return identity.datasetId;
      }),
    ).toContain(CENSUS_DATASET_ID);
  });
```

Adapt `_draft`, `CENSUS_DATASET_ID` and `POPULATION_COLUMN_ID` to the file's own factory and constants; the census dataset's key column must stay included, as the conversion forces.

In `createdCaseTypeToFormValues.test.ts` add:

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

- `_toDatasetColumnAttribute`: replace `datasetId: attribute.datasetId, columnId: attribute.columnId,` with `sources: attribute.sources,` (keep plan 3 and 4's shape fields).
- `_includedAttributes`: `return attribute.isIncluded || primaryKeyColumnIds.has(_getFirstSourceColumnId(attribute) ?? "");`
- `_contributingSourceDatasets`: build `contributingDatasetIds` from `options.included.flatMap((attribute) => { return attribute.sources.map((source) => { return source.datasetId; }); })`, and change its docstring's first line to `Drops sources that no longer contribute anything, counting every source of every included field.`
- `_resolveLabelColumnId`: `return _getFirstSourceColumnId(attribute) === draft.labelColumnId;`
- The `isLabel` argument in the main function: `isLabel: _getFirstSourceColumnId(attribute) === labelColumnId,`

- [ ] **Step 4: Build fields with sources, then the ID field**

In `createdCaseTypeToFormValues.ts`, replace the imports of `ValuePickerRuleType` and `ChatCaseSourceDataset` with:

```ts
import { makeAttributesWithIdentifierFromKeyColumns } from "@/views/OntologyDesignerApp/makeAttributesWithIdentifierFromKeyColumns/makeAttributesWithIdentifierFromKeyColumns";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type {
  ChatCaseAttributeSource,
  ChatCreatedCaseType,
} from "$/types/chat.types";
```

and replace `DEFAULT_VALUE_PICKER_RULE_TYPE`'s type with `ConceptAttribute.ValuePickerRuleType`. Delete `_makeMissingIdentifierAttributes`, and replace `_makeMappedAttribute` and `_attributesFromCaseType` with:

```ts
/** One chat source matched to the catalog column it names. */
type ResolvedSource = {
  source: ChatCaseAttributeSource;
  column: CatalogColumn;
};

/**
 * A field's sources the catalog knows, whose dataset has a join key, and
 * whose type matches the field's first such source: the planner refuses a
 * source with no key and sources of different types.
 */
function _getResolvedSources(options: {
  sources: readonly ChatCaseAttributeSource[];
  columns: readonly CatalogColumn[];
  identifiedDatasetIds: ReadonlySet<string>;
}): ResolvedSource[] {
  const resolved = options.sources.flatMap((source) => {
    const column = _findColumn(options.columns, source.columnId);
    return column &&
      column.datasetId === source.datasetId &&
      options.identifiedDatasetIds.has(source.datasetId)
      ? [{ source, column }]
      : [];
  });
  const firstDataType = resolved[0]?.column.dataType;
  return resolved.filter((entry) => {
    return entry.column.dataType === firstDataType;
  });
}

function _makeMappedAttribute(options: {
  conceptId: ConceptId;
  name: string;
  description: string | undefined;
  sources: readonly [ResolvedSource, ...ResolvedSource[]];
  isLabel: boolean;
  valuePickerRuleType: ConceptAttribute.ValuePickerRuleType;
}): AttributeFormValues {
  const conceptAttributeId = uuid<ConceptAttributeId>();
  return Model.make("ConceptAttribute", {
    id: conceptAttributeId,
    conceptId: options.conceptId,
    name: ConceptStatus.toNonReservedAttributeName(options.name),
    description: options.description,
    dataType: options.sources[0].column.dataType,
    mappingType: "dataset_column",
    isIdentifier: false,
    isLabel: options.isLabel,
    allowManualEdit: false,
    isArray: false,
    bucketGrain: undefined,
    valuePickerRuleType: options.valuePickerRuleType,
    mappings: {
      manualEntry: { type: "manual_entry", conceptAttributeId },
      datasetColumn: options.sources.map(({ source, column }) => {
        return {
          type: "dataset_column",
          conceptAttributeId,
          datasetId: column.datasetId,
          datasetColumnId: column.id,
          bucketColumnId: source.bucketColumnId as DatasetColumn.Id | undefined,
        };
      }),
    },
  } as const);
}

function _attributesFromCaseType(options: {
  caseType: ChatCreatedCaseType;
  conceptId: ConceptId;
  columns: readonly CatalogColumn[];
}): AttributeFormValues[] {
  const { caseType, conceptId, columns } = options;
  const identifiedDatasetIds = new Set(
    caseType.identities.map((identity) => {
      return identity.datasetId;
    }),
  );
  const mapped = caseType.attributes.flatMap((attribute) => {
    if (attribute.kind === "manual_entry") {
      return [
        makeDefaultManualEntryAttribute({
          conceptId,
          name: ConceptStatus.toNonReservedAttributeName(attribute.name),
        }),
      ];
    }
    const [firstSource, ...otherSources] = _getResolvedSources({
      sources: attribute.sources,
      columns,
      identifiedDatasetIds,
    });
    return firstSource
      ? [
          _makeMappedAttribute({
            conceptId,
            name: attribute.name,
            description: attribute.description,
            sources: [firstSource, ...otherSources],
            isLabel: attribute.isLabel === true,
            valuePickerRuleType:
              attribute.valuePickerRuleType ?? DEFAULT_VALUE_PICKER_RULE_TYPE,
          }),
        ]
      : [];
  });
  const keyColumns = caseType.identities.flatMap((identity) => {
    const column = _findColumn(columns, identity.primaryKeyColumnId);
    return column && column.datasetId === identity.datasetId ? [column] : [];
  });
  return makeAttributesWithIdentifierFromKeyColumns({
    conceptId,
    keyColumns,
    attributes: mapped,
  });
}
```

Plan 2 sets `dataType` from `ValuePickerRule.getOutputDataType`, and plans 3 and 4 set `isArray`, `bucketGrain`, and the rule from the chat field's shape: keep their expressions in place of the literals above. Change the main function's docstring to: `Turns a chat-created case type into the payload the concept creator submits. A case type may draw columns from several datasets, so a field may read several sources, and the datasets' join keys become one ID field.`

- [ ] **Step 5: Run them and watch them pass**

Run: the command from Step 2.
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/views/OntologyDesignerApp/proposedCaseTypeToCreatedCaseType src/views/OntologyDesignerApp/createdCaseTypeToFormValues
git commit -m "feat(joined-cases): turn chat drafts into fields with sources and one ID field"
```

---

## Task 16: Form state holds sources, and the insert writes their positions

**Files:**
- Modify: `src/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes.ts:26-51, 106-186`
- Create: `src/views/OntologyDesignerApp/ConceptCreatorView/makeSourceDatasetsFromAttributes/makeSourceDatasetsFromAttributes.ts` and `.test.ts`
- Modify: `src/views/OntologyDesignerApp/ConceptCreatorView/index.tsx:55-152`
- Modify: `src/views/OntologyDesignerApp/insertConceptFromFormValues/insertConceptFromFormValues.ts:26-49`, its test

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

In `insertConceptFromFormValues.test.ts`, change the fixture attribute's `mappings.datasetColumn` to `[]`, add `valuePickerRuleType: undefined,` (and plan 4's `bucketGrain: undefined,`) to it, and add:

```ts
  it("writes one mapping per source, positioned in list order", async () => {
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
              { type: "dataset_column", conceptAttributeId: fieldId, datasetId: "ds-a", datasetColumnId: "col-a", bucketColumnId: undefined },
              { type: "dataset_column", conceptAttributeId: fieldId, datasetId: "ds-b", datasetColumnId: "col-b", bucketColumnId: undefined },
            ] as never,
          },
        },
      ],
    });

    const [createParams] = conceptCreateMock.mock.calls[0] as [
      { mappings: Array<{ type: string; datasetColumnId?: string; position?: number }> },
    ];
    expect(
      createParams.mappings
        .filter((mapping) => {
          return mapping.type === "dataset_column";
        })
        .map((mapping) => {
          return [mapping.datasetColumnId, mapping.position];
        }),
    ).toEqual([
      ["col-a", 0],
      ["col-b", 1],
    ]);
  });
```

(`as never` stands in for the branded ids in this mock-only payload; prefer the file's `uuid<...>()` helpers if the brands make the cast unnecessary.)

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm test:frontend src/views/OntologyDesignerApp/ConceptCreatorView/makeSourceDatasetsFromAttributes src/views/OntologyDesignerApp/insertConceptFromFormValues`
Expected: FAIL: the helper does not exist, and the insert writes one mapping per field with no position.

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

In `makeDefaultDatasetColumnAttribute`, add `valuePickerRuleType: "most_frequent",` (plan 2's default, if it changed it) after `isArray: false,`, and replace its `datasetColumn` draft with:

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

In `makeDefaultManualEntryAttribute`, add `valuePickerRuleType: undefined,` and replace its `datasetColumn` draft with `datasetColumn: [],`.

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
 * a field or a source is added, removed, or moved.
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

- [ ] **Step 5: Write one mapping per source**

In `insertConceptFromFormValues.ts`, remove the `hasPropKeys` import and replace `_mappingsFromAttributes` with:

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
```

- [ ] **Step 6: Build the ID field on submit**

In `ConceptCreatorView/index.tsx`, import `makeAttributesWithIdentifierFromKeyColumns`, and replace `transformValues` with:

```ts
    // The submitted `attributes` are every field, the label flagged, with the
    // datasets' join keys folded into one ID field.
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
      return {
        ...values,
        attributes: makeAttributesWithIdentifierFromKeyColumns({
          conceptId: values.id,
          keyColumns,
          attributes: labelledAttributes,
        }),
      };
    },
```

and in `validate`, after `sourceDatasets`, add (only if plan 4 added a `bucketGrain` to the form's fields):

```ts
      datasetColumnAttributes: {
        mappings: {
          datasetColumn: {
            bucketColumnId: (bucketColumnId, values, path) => {
              const attributeIdx = Number(path.split(".")[1]);
              return values.datasetColumnAttributes[attributeIdx]?.bucketGrain !==
                undefined && bucketColumnId === undefined
                ? t`Choose the date column this source's rows are grouped by.`
                : null;
            },
          },
        },
      },
```

replacing plan 4's single-mapping date column rule if it has one. Remove imports `transformValues` no longer uses (`isDefined`, `prop`, `makeDefaultDatasetColumnAttribute` if unused).

- [ ] **Step 7: Run them and watch them pass**

Run: `pnpm test:frontend src/views/OntologyDesignerApp/ConceptCreatorView src/views/OntologyDesignerApp/insertConceptFromFormValues src/views/OntologyDesignerApp/makeAttributesWithIdentifierFromKeyColumns`
Expected: PASS.

- [ ] **Step 8: Check creation works again**

```bash
ava supabase status
pnpm test:db
```

Expected: PASS. Creation through the RPC is covered there; the browser path is covered by Task 21.

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

Load the **`impeccable`** skill before Step 5. This is a new surface: it sits inside a field's settings in the create form and inside a field row of the chat draft card. Follow `DESIGN.md`'s Named Rules (neutral by default, blue only for focus, 6px radius, no `Paper` inside the slate, hairline before shadow) and `docs/design/app-view-layout.md`. Copy says "source", "field", and "column", never "mapping". The code below is the functional baseline the impeccable pass refines; do not change its props or accessible names, which Tasks 18, 19, and 21 rely on.

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
    expect({
      moved: onMove.mock.calls,
      firstUp: screen.getByRole("button", { name: "Move result up" }),
      lastDown: screen.getByRole("button", { name: "Move lab_result down" }),
    }).toMatchObject({ moved: [["c-result", "down"]] });
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
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm test:frontend src/components/caseFields`
Expected: FAIL, `Failed to resolve import`.

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
          style={{ gridColumn: "2 / -1" }}
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

Move the `style={{ gridColumn: ... }}` into the CSS module as `.dateColumn` during the impeccable pass (inline styles are for computed values only).

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
  /** Set on a bucketed field's source: its date column and the choices. */
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
 * the user add a column of the same type, remove one, or reorder them. A
 * field keeps the earliest source's value when it keeps one, so the order is
 * meaningful. Controlled: the caller owns the sources.
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

With the `impeccable` skill loaded, review the editor inside both hosts (Tasks 18 and 19 mount it; mount it in a scratch story or the running create form). Keep the props, the group name `Sources of <field>`, and the button and select names exactly as tested. Re-run the tests afterwards.

- [ ] **Step 6: Run them and watch them pass**

Run: `pnpm test:frontend src/components/caseFields`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/caseFields
git commit -m "feat(joined-cases): add the field sources editor"
```

---

## Task 18: The create form edits a field's sources

**Files:**
- Create: `src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnSourcesField.tsx`
- Modify: `src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator.tsx`
- Modify: `src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/index.tsx:73-180, 252-263`
- Modify: `src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/IdentifierBlock/index.tsx:21-29`

This task wires tested pieces (Tasks 16 and 17) into the form; the e2e in Task 21 is its test.

- [ ] **Step 1: Write the form adapter**

Create `DatasetColumnSourcesField.tsx`:

```tsx
import { prop } from "@avandar/utils";
import { useMemo } from "react";
import { FieldSourcesEditor } from "@/components/caseFields/FieldSourcesEditor/FieldSourcesEditor";
import { getAddableSourceColumns } from "@/components/caseFields/FieldSourcesEditor/getAddableSourceColumns/getAddableSourceColumns";
import type { DatasetWithColumns } from "$/models/datasets/Dataset/Dataset.types";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ConceptFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import type { FormType } from "@avandar/ui/hooks";
import type { ReactNode } from "react";

/** A dataset column with the dataset it belongs to. */
export type DatasetColumnLookup = Readonly<
  Record<string, { dataset: DatasetWithColumns; column: DatasetColumn.T } | undefined>
>;

type Props = {
  conceptForm: FormType<ConceptFormValues>;
  attributeIdx: number;
  attributeName: string;
  datasetColumnLookup: DatasetColumnLookup;
  /** Called after a source is added or removed, so join keys can follow. */
  onSourcesChange: () => void;
};

/**
 * Binds the sources of one of the create form's dataset-column fields to the
 * field sources editor. Rendered by `DatasetColumnMappingCreator`.
 */
export function DatasetColumnSourcesField({
  conceptForm,
  attributeIdx,
  attributeName,
  datasetColumnLookup,
  onSourcesChange,
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
  const attribute = conceptForm.getValues().datasetColumnAttributes[attributeIdx];
  if (!attribute) {
    return null;
  }
  const sources = attribute.mappings.datasetColumn;
  const sourcesPath = `datasetColumnAttributes.${attributeIdx}.mappings.datasetColumn`;
  const _findSourceIdx = (columnId: string) => {
    return sources.findIndex((source) => {
      return source.datasetColumnId === columnId;
    });
  };
  return (
    <FieldSourcesEditor
      fieldName={attributeName}
      sources={sources.map((source) => {
        const entry = datasetColumnLookup[source.datasetColumnId];
        return {
          key: source.datasetColumnId,
          datasetName: entry?.dataset.name ?? "",
          columnName: entry?.column.name ?? "",
          canRemove: sources.length > 1,
        };
      })}
      addableColumns={getAddableSourceColumns({
        sourceColumnIds: sources.map(prop("datasetColumnId")),
        candidateColumns,
        datasetNamesById,
      })}
      onAdd={(columnId) => {
        const entry = datasetColumnLookup[columnId];
        if (!entry) {
          return;
        }
        conceptForm.insertListItem(sourcesPath, {
          type: "dataset_column",
          conceptAttributeId: attribute.id,
          datasetId: entry.dataset.id,
          datasetColumnId: entry.column.id,
          bucketColumnId: undefined,
        });
        onSourcesChange();
      }}
      onRemove={(columnId) => {
        conceptForm.removeListItem(sourcesPath, _findSourceIdx(columnId));
        onSourcesChange();
      }}
      onMove={(columnId, direction) => {
        const from = _findSourceIdx(columnId);
        const to = direction === "up" ? from - 1 : from + 1;
        if (from >= 0 && to >= 0 && to < sources.length) {
          conceptForm.reorderListItem(sourcesPath, { from, to });
        }
      }}
    />
  );
}
```

If plan 4 gave fields a bucket grain in the form, pass `dateColumn` per source when `attribute.bucketGrain` is set (options: the source dataset's columns whose `dataType` is `date` or `timestamp`; value: `source.bucketColumnId`) and an `onDateColumnChange` that sets `${sourcesPath}.${idx}.bucketColumnId`, and delete plan 4's single date column select from `DatasetColumnMappingCreator`.

- [ ] **Step 2: Bind the rule to the field and mount the sources**

In `DatasetColumnMappingCreator.tsx`:

1. Add props `datasetColumnLookup: DatasetColumnLookup;` and `onSourcesChange: () => void;`.
2. Add `"valuePickerRuleType"` to the attribute `keysAndProps` field list, delete the `mappingKeys`/`mappingInputProps` `keysAndProps` call, and bind the rule `Select` to `attributeKeys.valuePickerRuleType` and `attributeInputProps.valuePickerRuleType()`.
3. Directly after the `Allow manual edit` checkbox, render:

```tsx
        <DatasetColumnSourcesField
          conceptForm={conceptForm}
          attributeIdx={attributeIdx}
          attributeName={attributeName}
          datasetColumnLookup={datasetColumnLookup}
          onSourcesChange={onSourcesChange}
        />
```

- [ ] **Step 3: Recompute join keys from every source**

In `DatasetColumnAttributesBlock/index.tsx`:

1. Delete `useMap`, `attributeToColumnMap`, and every `updateAttributeToColumnMap` call. Compute the picker's exclusions from the sources:

```ts
  const addedColumns = useMemo(() => {
    return addedAttributes.flatMap((attribute) => {
      return attribute.mappings.datasetColumn.map(prop("datasetColumnId"));
    });
  }, [addedAttributes]);
```

2. Add, after `datasetColumnLookup`:

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
  }, [conceptForm, datasetsById]);
```

3. In `addDatasetColumnAsAttribute`, replace the `sourceDatasets` bookkeeping after `insertListItem` with `syncSourceDatasets();`. In `removeAttribute`, replace everything after `setSelectedAttributeId(newAttributes[0]?.id);` with `syncSourceDatasets();`, and remove the `sourceDatasetId` lookup above it. Update both callbacks' dependency lists.
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
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/useCaseTypeDraftEditor.ts:10-53, 137-144, 183-197`
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/useCaseTypeDraftEditor.test.ts`
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftBlock.tsx`, `CaseTypeDraftCard.tsx`, `CaseTypeDraftSourceSection.tsx`, `CaseTypeDraftAttributeRow.tsx`
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftBlock.test.tsx` (fixture shape)

Spec §6.9. The first source is the field's key: it is never removed or reordered in the card.

- [ ] **Step 1: Write the failing tests**

In `useCaseTypeDraftEditor.test.ts`, change every fixture attribute from `datasetId: X, columnId: Y,` to `sources: [{ datasetId: X, columnId: Y }],` and every expectation that reads `attribute.columnId` or `attribute.datasetId` to read `attribute.sources[0]?.columnId` or `.datasetId`. Then add:

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

1. Import `ChatCaseAttributeSource`.
2. Add to `CaseTypeDraftEditor`:

```ts
  /** Adds a column to a field's sources, unless the field already reads it. */
  addAttributeSource: (
    columnId: string,
    source: ChatCaseAttributeSource,
  ) => void;
  /** Removes one of a field's sources. A field's first source stays. */
  removeAttributeSource: (columnId: string, sourceColumnId: string) => void;
```

and change the docstring above `setAttributeName` (add one if missing) to say every per-field setter names the field by its first source's column.

3. Replace `_mapAttribute` with:

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

4. Group by the first source's dataset:

```ts
  const sourceGroups = draft.sourceDatasets.map((sourceDataset) => {
    return {
      ...sourceDataset,
      attributes: draft.attributes.filter((attribute) => {
        return attribute.sources[0]?.datasetId === sourceDataset.datasetId;
      }),
    };
  });
```

5. In `removeSourceDataset`, replace the `attributes:` expression with:

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

and its comment to: `Dropping the source alone would leave fields reading a dataset with no join key, which the relation builder rejects, so its fields and its columns in other fields go too.`

6. Add the two members to the returned object:

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
```

7. If plan 4 lets the card bucket a field, add `setAttributeSourceDateColumn(columnId, sourceColumnId, bucketColumnId)` in the same shape, and make `canCreate` false while any included bucketed field has a source without `bucketColumnId`.

- [ ] **Step 4: Show and edit sources in the card**

In `CaseTypeDraftBlock.tsx`, pass `datasetColumns={datasetColumns ?? []}` to `CaseTypeDraftCard`. In `CaseTypeDraftCard.tsx`, add the prop `datasetColumns: ReadonlyArray<Pick<DatasetColumn.T, "id" | "name" | "datasetId" | "dataType">>;` and pass it, with `datasetNamesById`, to each `CaseTypeDraftSourceSection`, which passes both to each `CaseTypeDraftAttributeRow`. In the card's `labelOptions`, read the column from `attribute.sources[0]?.columnId` (skip a field without one). In `CaseTypeDraftSourceSection.tsx`, build `joinKeyOptions` and the rows' `key`, `columnLabel`, `isPrimaryKey` and `isLabelColumn` from `attribute.sources[0]?.columnId`, and under the join key `Select`, when the card has two or more datasets (`canRemove` is true), render:

```tsx
      {canRemove ? (
        <Text size="xs" c="dimmed">
          <Trans>The join keys become one ID field.</Trans>
        </Text>
      ) : null}
```

In `CaseTypeDraftAttributeRow.tsx`, add the props `datasetColumns` and `datasetNamesById`, read every `attribute.columnId` from `attribute.sources[0]?.columnId ?? ""`, and directly after the name `TextInput`'s hint `Group`, when the field is included, render:

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
          />
        ) : null}
```

with `const firstColumnId = attribute.sources[0]?.columnId ?? "";` at the top of the component. The card has no move buttons (open question 3 in the spec).

- [ ] **Step 5: Run them and watch them pass**

Run: `pnpm test:frontend src/components/ChatPanel/CaseTypeDraftBlock`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ChatPanel/CaseTypeDraftBlock
git commit -m "feat(joined-cases): add and remove a field's sources in the chat draft card"
```

---

## Task 20: Video producer adapters follow the model

**Files:**
- Modify: `apps/ava-video-producer/avandar-adapter/OntologyScreen/OntologyScreen.types.ts:10-22`, `OntologyScreen.tsx:~99-100`
- Modify: `apps/ava-video-producer/avandar-adapter/CasesScreen/CasesScreen.tsx:~65-78`, `RecordDetail.tsx`
- Modify: `apps/ava-video-producer/avandar-adapter/AttributeMappingScreen/AttributeMappingScreen.types.ts:5-31`, `createMappingFormFromFrame.ts:28-30, 66-75`

Read `apps/ava-video-producer/docs/component-videos.md` first. These adapters render the real product components with fixtures; only the fixture shapes change.

- [ ] **Step 1: Run the type check and list the adapter errors**

Run: `pnpm type-check`
Expected: errors in the three adapter directories (and any other file Tasks 5 to 19 missed; fix those too, one file at a time, until the list is clean).

- [ ] **Step 2: Move the fixtures to `mappings` and `sourceNames`**

- `OntologyScreen.types.ts`: `Attribute["mapping"]` becomes `NonNullable<Attribute["mappings"]>[number]`, and `OntologyAttributeProjection`'s `& { mapping: ... }` becomes `& { mappings: Array<Pick<DatasetMapping, "type" | "datasetId" | "conceptAttributeId" | "datasetColumnId" | "position">> }`.
- `OntologyScreen.tsx`: each field's `mapping: { type: "dataset_column", datasetId }` becomes `mappings: [{ type: "dataset_column", datasetId, conceptAttributeId: <the field's id>, datasetColumnId: <a fixed uuid per field>, position: 0 }]` (hoist the id into a local so both uses share it).
- `CasesScreen.tsx`: the attribute fixture's `mapping: { ... }` becomes `mappings: [{ type: "dataset_column", conceptAttributeId: \`field-${index}\`, datasetColumnId: \`column-${index}\`, position: 0, datasetId: ... }]`. This file casts through `unknown`, so the type check does not catch it; the case type list reads `mappings` at render time.
- `RecordDetail.tsx`: each `CaseDetailsRow`'s `sourceName: x` becomes `sourceNames: [x]` (or `[]` when there was none).
- `AttributeMappingScreen.types.ts`: `Rule` becomes `Pick<Attribute, "valuePickerRuleType">`; `MappingValuesProjection.datasetColumnAttributes` items become `Pick<Attribute, "isArray" | "allowManualEdit" | "valuePickerRuleType">`; remove `"datasetColumnAttributes.0.mappings.datasetColumn"` from `MappingInputPrefix`.
- `createMappingFormFromFrame.ts`: put `valuePickerRuleType: stage.valuePickerRuleType` on the attribute instead of `mappings.datasetColumn`, and serve it for the `datasetColumnAttributes.0` prefix (delete the `prefix.endsWith("datasetColumn")` branch).

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

---

## Task 21: E2E: a field read from two datasets

**Files:**
- Create: `tests/data/multi-source-fields/line-list.csv`
- Create: `tests/data/multi-source-fields/lab-results.csv`
- Create: `tests/e2e/multi-source-fields.spec.ts`

Load **`playwright-best-practices`**. The case type is created through the UI, because creating it is the behavior under test. Only the dataset uploads (through the UI, in `beforeAll`), oracle reads, and teardown touch the database directly.

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

/** The value and source line the record page shows for one field. */
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

    const sourcesText = `${seededWorld.lineListName}, ${seededWorld.labResultsName}`;
    await page.getByRole("link", { name: /Ben Okafor$/ }).click();
    await expect(_factOf(page, RESULT_FIELD_NAME)).toHaveText(
      `inconclusive${sourcesText}`,
      { timeout: MEDIUM_WAIT },
    );

    await page.getByRole("link", { name: /Ana Diaz$/ }).click();
    await expect(_factOf(page, RESULT_FIELD_NAME)).toHaveText(
      `positive${sourcesText}`,
      { timeout: MEDIUM_WAIT },
    );
  });
});
```

`for ... of` is used for sequential async teardown, as other specs do; replace it with a `reduce` chain if the lint rule rejects it. Check every locator against the running app on the first red run (the create form's DOM, in particular the column picker's radios and the `View records` control, which may be a button); adjust the locator, never the assertion.

- [ ] **Step 3: Run it and watch it pass**

The feature is complete by this task, so this spec passes on its first run unless a locator is wrong. To prove it can fail, temporarily change `inconclusive` to `negative` in the first assertion and watch it fail with the received text, then revert.

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

Expected: `src/i18n/locales/en/messages.po` gains `Sources`, `Sources of {fieldName}`, `Add a source`, `Choose a column of the same type`, `No other column has this type`, `Move {0} up`, `Move {0} down`, `Remove {0} from {fieldName}`, `Date column for {0}`, and `The join keys become one ID field.`, each with a `#:` reference to its file.

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
pnpm test:e2e multi-source-fields.spec.ts
pnpm test:e2e case-statuses-data-explorer.spec.ts
pnpm test:e2e case-statuses-record.spec.ts
```

Expected: each PASSES on its own (the two case status specs seed through `CaseTypeSeedHelpers`, which Task 3 moved to the new payload).

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

- In the ER diagram, change the `concept_attributes ||--o| attribute_mappings__dataset_column` edge to `||--o{` with the label `"concept_attribute_id<br/>one row per source, cascade"`, add `enum value_picker_rule_type` to `concept_attributes`, and in `attribute_mappings__dataset_column` replace `enum value_picker_rule_type` with `int position`.
- Replace the caption's first sentence with: `A manual-entry field has one mapping row; a dataset-column field has one per source, in the table its mapping_type names.`
- In the table, the `concept_attributes` row's notes gain: `value_picker_rule_type is set exactly on single-value and bucketed-list dataset-column fields (concept_attributes__value_picker_rule_type_by_shape)`. The `attribute_mappings__dataset_column` row becomes: `"This field reads this column of this dataset, in this position" | One row per source; unique on (concept_attribute_id, dataset_column_id); dataset_id and dataset_column_id are bare ids, not foreign keys`.

- [ ] **Step 2: Sections 5.2 and 5.3 (authoring)**

- 5.2: `AttributeFormValues.mappings.datasetColumn` is a field's sources in read order; `FieldSourcesEditor` (`src/components/caseFields/FieldSourcesEditor/`) adds, removes, and reorders them, offering only same-type columns; `makeSourceDatasetsFromAttributes` keeps one join key entry per dataset any source reads; `transformValues` folds the join keys into one ID field with `makeAttributesWithIdentifierFromKeyColumns`.
- 5.3: chat fields carry `sources: ChatCaseAttributeSource[]`, keyed in the card by the first source's column; the card adds and removes extra sources (not the first) and does not reorder; `createdCaseTypeToFormValues` drops unknown sources, sources in datasets with no join key, and sources of another type, then folds the join keys into one ID field. Replace the sentence about adding a missing identifier attribute per source.

- [ ] **Step 3: Sections 6, 7, 7.1, and 8 (reading values)**

- 6: Sync stages one `SELECT` per identifier source (one ID field may have one per dataset) and names records through the label field's column from `makeConceptAttributeColumnsFromMetadata`, built by `buildAttributeValueSql`.
- 7: add a subsection "7.x Fields with several sources" with the stacked SQL shape from spec §6.4, the read order (position, then dataset column id, then `file_row_number`), the shared-type cast (none for one source; `VARCHAR` for an ID field over keys of different types), and that one reduction serves single values and buckets.
- 7.1: the rule lives on `concept_attributes`. Update the five homes: the enum is `supabase/schemas/00.enum.attribute_mappings__value_picker_rule_type.sql`.
- 8: in the column resolution row, replace "One column per attribute; one key column per dataset" with "One column per attribute, reading every source; one key column per dataset, from the first identifier source of each; sources of different types throw, except an ID field's, read as text; a source in a dataset with no key, or a bucketed source with no date column, throws". In the View row, say every dataset-column field is one stacked scalar subquery.

- [ ] **Step 4: Sections 10, 12, and 16**

- 10: replace "At most one mapping row per attribute in each mapping table" with "A field reads each column at most once | `attribute_mappings__dataset_column__attribute_column_unique`; `unique` on `concept_attribute_id` in the manual-entry table". Replace "One identifier attribute per contributing dataset" with "One identifier source per contributing dataset; a new case type has one ID field with a source per dataset, an older one may have one identifier field per dataset".
- 12: in the checklist, note that a new mapping kind's rows are not ordered by `AttributeSources` unless it is a dataset-column source.
- 16: remove any row saying a field reads one dataset or column; add nothing for this gap unless verification found a limitation.

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

- [ ] `pnpm test:db` passes, including the `value_picker_rule_move` replay.
- [ ] `pnpm test:frontend`, `pnpm test:executed`, `pnpm type-check`, `pnpm lint`, and `pnpm i18n:check` pass.
- [ ] `pnpm test:e2e multi-source-fields.spec.ts` passes on its own.
- [ ] Spec §10's exit criteria hold.
- [ ] `git status` shows only `supabase/config.toml` modified.
- [ ] Nothing was run against production.
