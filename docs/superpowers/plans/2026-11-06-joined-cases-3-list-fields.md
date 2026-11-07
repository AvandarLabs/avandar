# Joined Cases 3: List Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let chat, the draft card, and the case type form create fields that keep every value, store them with no value rule, show every value on the record page, keep the Data Explorer and dashboards to operations that work on a list, and tell chat's SQL model which fields are lists.

**Architecture:** `ConceptAttribute.ValueShape` (`"single" | "list"`) is derived from `is_array` and drives every branch. A list field's mapping stores a NULL rule, which `rpc_concepts__create` enforces. The concept view reads each column by shape. List cells come out of DuckDB as plain arrays and list result columns are marked, so the explorer, grid, charts, and dashboard filters can keep lists out of operations that fail. The chat contract carries `valueShape`, the draft card switches it, and the conversions drop the rule for a list.

**Tech Stack:** Postgres (Supabase declarative schema, pgTAP), TypeScript, React, Mantine, Lingui, DuckDB (QETL, executed tests), apache-arrow 17, Deno edge functions (tested with Vitest), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-06-joined-cases-3-list-fields-design.md`. Section numbers (§) refer to it. **Umbrella:** `docs/superpowers/specs/2026-11-06-joined-cases-design.md`. **Overview and ground rules:** `docs/superpowers/plans/2026-11-06-joined-cases.md`.

---

## Before you start

- Plans 1 and 2 have landed on `feat/joined-cases`. This plan uses their names exactly as umbrella §6 lists them: `buildAttributeValueSql` (replaces `getSQLSelectOfMapping`), `ConceptAttributeColumn.attributeId`, `ConceptRecordValuesClient.getConceptRecordValues`, and `ValuePickerRule.getOutputDataType({ ruleType, columnDataType })` in `shared/models/ontology/ValuePickerRule/ValuePickerRule.ts`.
- Plans 1 and 2 changed some files this plan edits. Where a snippet below shows a whole function, keep every line plan 1 or 2 added that the snippet does not mention. What this plan builds on from plan 1 (`docs/superpowers/plans/2026-11-06-joined-cases-1-record-page-concept-view.md`):
  - Task 1: `buildAttributeValueSql(options)` in `src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/`, with options `selectColumnName`, `primaryKeyColumnName`, `datasetId`, `valuePickerRuleType`, `isArray`, `outputColumnName`, `externalIdsTable`, `externalIdColumn`. It holds the list arm (`_buildArraySelector` is gone) and applies the NULL rule to lists.
  - Tasks 2 and 3: `attributeId` on both arms of `ConceptAttributeColumn`; the view calls `buildAttributeValueSql` for every dataset column; Sync calls it for the record name with `isArray: false`; an attribute named `external_id` is emitted as `external_id_2`.
  - Task 7: `duckDbArrowResults.ts` lives in `src/clients/DuckDbClient/duckDbArrowResults/` and returns list cells as plain arrays.
  - Tasks 10 to 12: `CaseDetailsRow` is `{ id, name, value, sourceNames }`, the rail shows a dimmed "No value", and rows come from `makeCaseDetailsRowsFromAttributes` inside `useRecordFields`.
  - Tasks 13 to 15: `AttributeAssertionClient`, the `AttributeAssertion` model, `_runConceptQuery`, and `ConceptWrapper` are deleted. No task here edits them.
- From plan 2: `createdCaseTypeToFormValues.ts`, the concept creator's submit transform (`ConceptCreatorView/index.tsx`), and the draft card's value-picker options set `dataType` from `ValuePickerRule.getOutputDataType` and offer rules per column type.
- Read the overview's ground rules. They apply to every task: switch check before any database command, commit by path, never `git add -A`, never stage `supabase/config.toml`, Lingui for every user-facing string, no em dashes, comments describe the code and never this plan, the spec, or a gap.
- Load the `supabase-declarative-schema` skill before Task 2.
- Task 13 needs the switched local stack and a running dev server. Check `ava supabase status` names `feat-joined-cases` first.
- Every commit command below ends with the `Co-Authored-By` trailer this session uses. If your session specifies a different trailer, use yours.

### Decisions this plan locks in

| Decision | Choice | Why |
| --- | --- | --- |
| A list field's stored rule | NULL; `value_picker_rule_type` drops `not null` | Umbrella 3.2. The column moves to `concept_attributes` in plan 5; until then the mapping holds it (§4.2) |
| Who enforces "NULL exactly for a list" | `rpc_concepts__create`, after the mappings insert | The rule and `is_array` are in different tables, so no check constraint can say it yet |
| A list label or identifier | Refused by the RPC, coerced to one value by every authoring path | Sync names records by the label's rule and matches rows by identifiers |
| Where a draft's rule is dropped | `insertConceptFromFormValues._mappingsFromAttributes`, plus `proposedCaseTypeToCreatedCaseType` for chat's payload | Every draft keeps a rule so the user can switch back to one value |
| Existing list fields' stored rule | Left as is | Nothing reads it; plan 5's move nulls it (§4.12) |
| `ConceptAttributeColumn` | `valueShape` replaces `isArray`; a single column carries its rule, a list none | The view's branch is then exhaustive over the shape |
| An unmapped list field | `CAST([] AS <type>[])` | A list is `[]` when it has nothing (umbrella 3.2), and chat SQL treats it as a list |
| List cells in JS | Plan 1 makes them arrays; this plan turns a list's dates into `YYYY-MM-DD` and timestamps into ISO strings | A list result column is text-typed, so an epoch number would read as a count |
| `buildAttributeValueSql` options | `valueShape` replaces `isArray`; `valuePickerRuleType` may be undefined, and one value without it throws | A list carries no rule; Sync's rule-less label then fails closed in the one place value SQL is built |
| List result columns | `{ dataType: "varchar", isArray: true }` | Every number gate that reads `dataType` keeps lists out untouched |
| Explorer operations on a list | Show, sort, group by, count. No filter, sum, average, max, min, chart measure | §4.5, from DuckDB runs |
| Grid cell for a list | Values joined with `; `, blank for `[]` | `; ` matches the CSV export and never collides with a number's thousands comma |
| Draft card control | Mantine `SegmentedControl` (**One value** / **Every value**) in a shared `ValueShapeControl`; rule select only for one value | The same control serves the card and the form |
| Record page long lists | First five values, then `Show all <n> values` / `Show fewer` | §4.10 |
| Chat schema marker | `<name> (list)` plus one note when any field is a list | A marker the model cannot mistake for part of the column name |

## File structure

| File | Status | Responsibility |
| --- | --- | --- |
| `shared/models/ontology/ConceptAttribute/ConceptAttribute.types.ts` | Modify | `ConceptAttributeValueShape` |
| `shared/models/ontology/ConceptAttribute/ConceptAttribute.ts` | Modify | Namespace `ValueShape`, merged with the module |
| `shared/models/ontology/ConceptAttribute/ConceptAttributeModule/ConceptAttributeModule.ts` (+ test) | Create | `getValueShape`, `valueShapeToIsArray`, `getOutputDataType` |
| `supabase/schemas/30.attribute_mappings__dataset_column.sql` | Modify | Nullable rule |
| `supabase/schemas/50.rpc_concepts__create.sql` | Modify | Two checks |
| `supabase/migrations/<timestamp>_list_field_value_rules.sql` | Generate | |
| `supabase/tests/database/rpc_concepts__create.test.sql` | Modify | Six assertions |
| `apps/desktop/migrations/*.gen.sql` | Generate | |
| `shared/types/database.types.ts` | Generate | |
| `shared/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types.ts` | Modify | Optional rule |
| `shared/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappingParsers.ts` (+ new test) | Modify | No invented rule |
| `src/clients/ontology/ConceptClient.test.ts` | Modify | No rule sent for none |
| `src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/buildAttributeValueSql.ts` (+ executed test) | Modify | `valueShape` option |
| `src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql.ts` (+ executed test) | Modify | Columns by shape |
| `src/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata.ts` | Modify | Value rule from the shape |
| `src/clients/qetl/QueryMediator/conceptRelation/__tests__/conceptAttributeColumns.integration.executed.test.ts` | Modify | Fail closed, list ignores rule |
| `src/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery.test.ts`, `src/clients/qetl/QueryMediator/__tests__/QueryMediator.concepts.test.ts` | Modify | Fixtures |
| `src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/generateIndividuals.ts` (+ test) | Modify | Label read as one value |
| `src/clients/DuckDbClient/duckDbArrowResults/duckDbArrowResults.ts` (+ plan 1's test) | Modify | List dates as ISO strings |
| `src/clients/DuckDbClient/arrowFieldToQueryResultField.ts` | Modify | List columns |
| `shared/models/queries/QueryResult/QueryResult.types.ts` | Modify | `isArray` |
| `shared/models/queries/QueryColumn/QueryColumnModule.ts` (+ test) | Modify | `isList`, `getValidAggregations`, `isNumeric` |
| `src/views/DataExplorerApp/AggregationSelect.tsx`, `src/views/DataExplorerApp/QueryForm/ManualQueryForm/AggregationFields.tsx` | Modify | Aggregations per column |
| `src/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField.tsx` (+ test) | Modify | No list filters |
| `src/lib/ui/viz/makeDataGridColumnDefs/makeDataGridColumnDefs.ts` (+ test) | Modify | List cells |
| `src/views/DashboardApp/AvaPage/pfields/LocalFiltersPField/LocalFilterEditor.tsx` (+ new test), `LocalFiltersPField.tsx` | Modify | No list columns |
| `shared/types/chat.types.ts` | Modify | `ChatCaseValueShape`, `valueShape` |
| `supabase/functions/chat/PostChatMessages/parsing/parseProposeCaseType.ts`, `parseCreateCaseTypes.ts` (+ tests) | Modify | Parse and coerce |
| `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftBlock.test.tsx`, `useCaseTypeDraftEditor.test.ts`, `src/views/OntologyDesignerApp/proposedCaseTypeToCreatedCaseType/proposedCaseTypeToCreatedCaseType.test.ts` | Modify | Fixtures |
| `supabase/functions/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.ts`, `buildCaseManagerSystemPrompt.ts` (+ tests) | Modify | Schema and guidance |
| `src/views/OntologyDesignerApp/proposedCaseTypeToCreatedCaseType/proposedCaseTypeToCreatedCaseType.ts` | Modify | Carry the shape |
| `src/views/OntologyDesignerApp/createdCaseTypeToFormValues/createdCaseTypeToFormValues.ts` (+ test) | Modify | Shape, type, coercion |
| `src/views/OntologyDesignerApp/insertConceptFromFormValues/insertConceptFromFormValues.ts` (+ test) | Modify | Drop a list's rule |
| `src/components/caseFields/ValueShapeControl/ValueShapeControl.tsx` | Create | The switch |
| `src/components/ChatPanel/CaseTypeDraftBlock/useCaseTypeDraftEditor.ts`, `CaseTypeDraftAttributeRow.tsx`, `CaseTypeDraftCard.module.css` | Modify | Card switch |
| `src/views/OntologyDesignerApp/ConceptCreatorView/keepKeyAndLabelFieldsSingle/keepKeyAndLabelFieldsSingle.ts` (+ test) | Create | Form coercion |
| `src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator.tsx`, `ConceptCreatorView/index.tsx` | Modify | Form switch |
| `src/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldValue.tsx`, `RecordFieldValueList.tsx`, `RecordFieldValue.module.css` (+ test) | Create | Field values on the record page |
| `src/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail.tsx` (+ test) | Modify | Use it |
| `src/views/IndividualManagerApp/SingleIndividualView/useRecordFields/makeCaseDetailsRowsFromAttributes/makeCaseDetailsRowsFromAttributes.ts` (+ test) | Modify | `valueShape` on each row |
| `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeAttributesList.tsx` | Modify | `Every value` badge |
| `shared/models/chat/SqlTableAlias/SqlTableAlias.types.ts`, `SqlTableAliasModule.ts` (+ test) | Modify | Marker and note |
| `supabase/functions/chat/PostChatMessages/schema/fetchWorkspaceSchema.ts` (+ test) | Modify | `is_array` |
| `supabase/functions/chat/utils/buildSqlSystemPrompt/buildSqlSystemPrompt.ts` (+ test) | Modify | Note |
| `shared/types/offlineChat.types.ts` | Modify | `is_array` |
| `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/fetchOfflineChatSchema.ts` (+ test) | Modify | `is_array` |
| `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/buildOfflinePrompts/buildOfflinePrompts.ts` (+ test) | Modify | Note |
| `src/i18n/locales/*` | Generate | Catalogs |
| `tests/e2e/case-list-field.spec.ts` | Create | E2E |
| `docs/ontology-architecture.md` | Modify | Docs |

---

### Task 1: A field's value shape

**Files:**
- Modify: `shared/models/ontology/ConceptAttribute/ConceptAttribute.types.ts`
- Create: `shared/models/ontology/ConceptAttribute/ConceptAttributeModule/ConceptAttributeModule.ts`
- Modify: `shared/models/ontology/ConceptAttribute/ConceptAttribute.ts`
- Test: `shared/models/ontology/ConceptAttribute/ConceptAttributeModule/ConceptAttributeModule.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `shared/models/ontology/ConceptAttribute/ConceptAttributeModule/ConceptAttributeModule.test.ts`:

```ts
/**
 * A field's value shape decides what it stores and how it is read, so these
 * pin the shape against the stored `is_array` and `data_type`.
 */
import { describe, expect, it } from "vitest";
import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute.ts";

describe("ConceptAttribute.getValueShape", () => {
  it("reads a field that keeps every value as a list and any other as one value", () => {
    expect(ConceptAttribute.getValueShape({ isArray: true })).toBe("list");
    expect(ConceptAttribute.getValueShape({ isArray: false })).toBe("single");
  });
});

describe("ConceptAttribute.valueShapeToIsArray", () => {
  it("stores each shape as the is_array it is read back from", () => {
    for (const valueShape of ["single", "list"] as const) {
      const isArray = ConceptAttribute.valueShapeToIsArray(valueShape);
      expect(ConceptAttribute.getValueShape({ isArray })).toBe(valueShape);
    }
  });
});

describe("ConceptAttribute.getOutputDataType", () => {
  it("types a list field as its column, whatever rule its draft holds", () => {
    expect(
      ConceptAttribute.getOutputDataType({
        valueShape: "list",
        ruleType: "count",
        columnDataType: "varchar",
      }),
    ).toBe("varchar");
  });

  it("types a single field as its rule's output", () => {
    expect(
      ConceptAttribute.getOutputDataType({
        valueShape: "single",
        ruleType: "count",
        columnDataType: "varchar",
      }),
    ).toBe("bigint");
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm test:frontend ConceptAttributeModule`
Expected: FAIL. `ConceptAttribute` has no runtime value, so `ConceptAttribute.getValueShape` is undefined (`TypeError: Cannot read properties of undefined`).

- [ ] **Step 3: Add the type**

Append to `shared/models/ontology/ConceptAttribute/ConceptAttribute.types.ts`:

```ts
/**
 * How many values a field holds for one record. `single` reduces the field's
 * rows to one value with its value rule; `list` keeps every non-NULL value
 * in source order. Authoring, the concept view, the query form, and the
 * record page each branch on it, for example to hide the value rule of a
 * list.
 */
export type ConceptAttributeValueShape = "single" | "list";
```

- [ ] **Step 4: Write the module**

Create `shared/models/ontology/ConceptAttribute/ConceptAttributeModule/ConceptAttributeModule.ts`:

```ts
import { match } from "ts-pattern";
import { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule.ts";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { ValuePickerRuleType } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types.ts";
import type {
  ConceptAttributeModel,
  ConceptAttributeValueShape,
} from "$/models/ontology/ConceptAttribute/ConceptAttribute.types.ts";

function _getValueShape(
  attribute: Readonly<Pick<ConceptAttributeModel["Read"], "isArray">>,
): ConceptAttributeValueShape {
  return attribute.isArray ? "list" : "single";
}

function _valueShapeToIsArray(valueShape: ConceptAttributeValueShape): boolean {
  return match(valueShape)
    .with("single", () => {
      return false;
    })
    .with("list", () => {
      return true;
    })
    .exhaustive();
}

function _getOutputDataType(
  options: Readonly<{
    valueShape: ConceptAttributeValueShape;
    ruleType: ValuePickerRuleType;
    columnDataType: AvaDataType.T;
  }>,
): AvaDataType.T {
  return match(options.valueShape)
    .with("single", () => {
      return ValuePickerRule.getOutputDataType({
        ruleType: options.ruleType,
        columnDataType: options.columnDataType,
      });
    })
    .with("list", () => {
      // A list holds the column's own values, so one value has its type.
      return options.columnDataType;
    })
    .exhaustive();
}

/**
 * Reads and derives a case type field's value shape. Use it wherever a field
 * is designed, stored, or read, for example to decide a new field's stored
 * `is_array` and `data_type`, or whether a query column is a list.
 */
export const ConceptAttributeModule = {
  /** A field's value shape, read from its stored columns. */
  getValueShape: _getValueShape,

  /** The stored `is_array` for a value shape. */
  valueShapeToIsArray: _valueShapeToIsArray,

  /**
   * The `data_type` a dataset-column field stores: the type of one value as
   * the concept view emits it. `ruleType` is what the field's draft holds;
   * a list ignores it.
   */
  getOutputDataType: _getOutputDataType,
};
```

Replace `shared/models/ontology/ConceptAttribute/ConceptAttribute.ts` with:

```ts
/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  ConceptAttributeId,
  ConceptAttributeModel,
  ConceptAttributeValueShape,
} from "$/models/ontology/ConceptAttribute/ConceptAttribute.types.ts";
import type { Simplify } from "type-fest";

export { ConceptAttributeModule as ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttributeModule/ConceptAttributeModule.ts";

export namespace ConceptAttribute {
  export type T<K extends keyof ConceptAttributeModel = "Read"> = Simplify<
    ConceptAttributeModel[K]
  >;
  export type Id = ConceptAttributeId;
  export type ValueShape = ConceptAttributeValueShape;
}
```

- [ ] **Step 5: Run the tests and the type-check**

Run: `pnpm test:frontend ConceptAttributeModule`
Expected: PASS.

Run: `pnpm type-check`
Expected: PASS, including `deno check` (the module is importable from edge functions).

- [ ] **Step 6: Commit**

```bash
git add shared/models/ontology/ConceptAttribute
git commit -m "feat(joined-cases): give case type fields a value shape" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: A list field's mapping stores no rule

**Files:**
- Modify: `supabase/schemas/30.attribute_mappings__dataset_column.sql`
- Modify: `supabase/schemas/50.rpc_concepts__create.sql`
- Generate: `supabase/migrations/<timestamp>_list_field_value_rules.sql`
- Test: `supabase/tests/database/rpc_concepts__create.test.sql`
- Generate: `apps/desktop/migrations/*.gen.sql`

Load the `supabase-declarative-schema` skill now. This task does not regenerate `shared/types/database.types.ts`; Task 3 does, together with the model it changes.

- [ ] **Step 1: Check the switch**

Run: `ava supabase status`
Expected: the first line names the `feat-joined-cases` project. If it says `This is the develop local Supabase`, run `ava supabase switch` and check again. Do not continue until it names the branch's project.

- [ ] **Step 2: Write the failing pgTAP assertions**

In `supabase/tests/database/rpc_concepts__create.test.sql`, change `select plan (15);` to `select plan (21);`, and insert this block after assertion 15 and before `select * from finish ();`:

```sql
-- 16. A list field keeps every value, so its mapping names no rule.
select lives_ok (
  $t16$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"ac000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  select public.rpc_concepts__create (
    '{"id":"ac004007-0000-4000-8000-000000000007","workspace_id":"ac001001-0000-4000-8000-000000000001","name":"List case type","description":null,"allow_manual_creation":false,"default_status_id":"ac005010-0000-4000-8000-000000000010"}'::jsonb,
    '[{"id":"ac006007-0000-4000-8000-000000000007","name":"County","description":null,"data_type":"varchar","mapping_type":"dataset_column","is_label":true,"is_identifier":true,"is_array":false,"allow_manual_edit":false},{"id":"ac006008-0000-4000-8000-000000000008","name":"Daily new cases","description":null,"data_type":"bigint","mapping_type":"dataset_column","is_label":false,"is_identifier":false,"is_array":true,"allow_manual_edit":false}]'::jsonb,
    '[{"concept_attribute_id":"ac006007-0000-4000-8000-000000000007","value_picker_rule_type":"first","dataset_id":"ac007002-0000-4000-8000-000000000002","dataset_column_id":"ac008002-0000-4000-8000-000000000002"},{"concept_attribute_id":"ac006008-0000-4000-8000-000000000008","dataset_id":"ac007002-0000-4000-8000-000000000002","dataset_column_id":"ac008003-0000-4000-8000-000000000003"}]'::jsonb,
    '[]'::jsonb,
    '[{"id":"ac005010-0000-4000-8000-000000000010","name":"Active","description":null,"color":"#40c057","position":0}]'::jsonb
  );
  $t16$,
  'a Case Types editor creates a case type with a list field'
);

reset role;

-- 17.
select is (
  (
    select count(*)::int
    from public.attribute_mappings__dataset_column
    where
      concept_attribute_id = 'ac006008-0000-4000-8000-000000000008'::uuid
      and value_picker_rule_type is null
  ),
  1,
  'a list field''s mapping stores no value rule'
);

-- 18. A list field whose mapping names a rule.
select throws_ok (
  $t18$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"ac000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  select public.rpc_concepts__create (
    '{"id":"ac004008-0000-4000-8000-000000000008","workspace_id":"ac001001-0000-4000-8000-000000000001","name":"List with a rule","description":null,"allow_manual_creation":false,"default_status_id":"ac005011-0000-4000-8000-000000000011"}'::jsonb,
    '[{"id":"ac006009-0000-4000-8000-000000000009","name":"County","description":null,"data_type":"varchar","mapping_type":"dataset_column","is_label":true,"is_identifier":true,"is_array":false,"allow_manual_edit":false},{"id":"ac006010-0000-4000-8000-000000000010","name":"Daily new cases","description":null,"data_type":"bigint","mapping_type":"dataset_column","is_label":false,"is_identifier":false,"is_array":true,"allow_manual_edit":false}]'::jsonb,
    '[{"concept_attribute_id":"ac006009-0000-4000-8000-000000000009","value_picker_rule_type":"first","dataset_id":"ac007002-0000-4000-8000-000000000002","dataset_column_id":"ac008002-0000-4000-8000-000000000002"},{"concept_attribute_id":"ac006010-0000-4000-8000-000000000010","value_picker_rule_type":"sum","dataset_id":"ac007002-0000-4000-8000-000000000002","dataset_column_id":"ac008003-0000-4000-8000-000000000003"}]'::jsonb,
    '[]'::jsonb,
    '[{"id":"ac005011-0000-4000-8000-000000000011","name":"Active","description":null,"color":"#40c057","position":0}]'::jsonb
  );
  $t18$,
  '23514',
  'A dataset field has a value rule exactly when it keeps one value',
  'a list field that names a value rule is refused'
);

-- 19. A field that keeps one value, with no rule.
select throws_ok (
  $t19$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"ac000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  select public.rpc_concepts__create (
    '{"id":"ac004010-0000-4000-8000-000000000010","workspace_id":"ac001001-0000-4000-8000-000000000001","name":"Single without a rule","description":null,"allow_manual_creation":false,"default_status_id":"ac005012-0000-4000-8000-000000000012"}'::jsonb,
    '[{"id":"ac006011-0000-4000-8000-000000000011","name":"County","description":null,"data_type":"varchar","mapping_type":"dataset_column","is_label":true,"is_identifier":true,"is_array":false,"allow_manual_edit":false}]'::jsonb,
    '[{"concept_attribute_id":"ac006011-0000-4000-8000-000000000011","dataset_id":"ac007002-0000-4000-8000-000000000002","dataset_column_id":"ac008002-0000-4000-8000-000000000002"}]'::jsonb,
    '[]'::jsonb,
    '[{"id":"ac005012-0000-4000-8000-000000000012","name":"Active","description":null,"color":"#40c057","position":0}]'::jsonb
  );
  $t19$,
  '23514',
  'A dataset field has a value rule exactly when it keeps one value',
  'a single-value field without a value rule is refused'
);

-- 20. A list field as the label and identifier.
select throws_ok (
  $t20$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"ac000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  select public.rpc_concepts__create (
    '{"id":"ac004011-0000-4000-8000-000000000011","workspace_id":"ac001001-0000-4000-8000-000000000001","name":"List label","description":null,"allow_manual_creation":false,"default_status_id":"ac005013-0000-4000-8000-000000000013"}'::jsonb,
    '[{"id":"ac006012-0000-4000-8000-000000000012","name":"County","description":null,"data_type":"varchar","mapping_type":"dataset_column","is_label":true,"is_identifier":true,"is_array":true,"allow_manual_edit":false}]'::jsonb,
    '[{"concept_attribute_id":"ac006012-0000-4000-8000-000000000012","dataset_id":"ac007002-0000-4000-8000-000000000002","dataset_column_id":"ac008002-0000-4000-8000-000000000002"}]'::jsonb,
    '[]'::jsonb,
    '[{"id":"ac005013-0000-4000-8000-000000000013","name":"Active","description":null,"color":"#40c057","position":0}]'::jsonb
  );
  $t20$,
  '23514',
  'A list field cannot be the label or an identifier',
  'a list field that is the label is refused'
);

-- 21.
select is (
  (
    select count(*)::int
    from public.concepts
    where id in (
      'ac004008-0000-4000-8000-000000000008'::uuid,
      'ac004010-0000-4000-8000-000000000010'::uuid,
      'ac004011-0000-4000-8000-000000000011'::uuid
    )
  ),
  0,
  'a refused list or value rule leaves no case type behind'
);
```

- [ ] **Step 3: Run pgTAP to see them fail**

Run: `ava supabase status` (names `feat-joined-cases`), then `pnpm test:db`
Expected: FAIL in `rpc_concepts__create.test.sql`. Assertion 16 fails with `null value in column "value_picker_rule_type" ... violates not-null constraint`, so 17 counts 0; 19 and 20 fail on the same not-null violation (`23502`, not `23514`); 18 lives instead of throwing.

- [ ] **Step 4: Make the rule nullable**

In `supabase/schemas/30.attribute_mappings__dataset_column.sql`, replace the column line

```sql
  value_picker_rule_type public.attribute_mappings__value_picker_rule_type not null,
```

with

```sql
  -- The rule that reduces the field's rows to one value. Null for a field
  -- that keeps every value; `rpc_concepts__create` enforces which is which.
  value_picker_rule_type public.attribute_mappings__value_picker_rule_type,
```

- [ ] **Step 5: Add the two checks to the RPC**

In `supabase/schemas/50.rpc_concepts__create.sql`, insert this block after the `attribute_mappings__manual_entry` insert and before `return v_concept_id;`:

```sql
  -- A list field keeps every value, so its mapping names no rule, and every
  -- other dataset field reduces its rows with exactly one. The rule and
  -- `is_array` live in different tables, so no constraint can say this.
  if exists (
    select 1
    from public.attribute_mappings__dataset_column m
    join public.concept_attributes a on a.id = m.concept_attribute_id
    where
      a.concept_id = v_concept_id
      and a.is_array = (m.value_picker_rule_type is not null)
  ) then
    raise exception 'A dataset field has a value rule exactly when it keeps one value'
      using errcode = '23514', hint = 'value_rule_mismatch';
  end if;

  -- The label names a record and an identifier matches rows to it, so
  -- neither can hold a list.
  if exists (
    select 1
    from public.concept_attributes a
    where
      a.concept_id = v_concept_id
      and a.is_array
      and (a.is_label or a.is_identifier)
  ) then
    raise exception 'A list field cannot be the label or an identifier'
      using errcode = '23514', hint = 'list_field_is_key_or_label';
  end if;
```

Extend the function's docstring: after the paragraph that ends "never from their own payloads.", add

```sql
 *
 * A field that keeps every value (`is_array`) stores no value rule, every
 * other dataset field stores one, and a list is never the label or an
 * identifier. Each is refused with errcode `23514` and the hint
 * `value_rule_mismatch` or `list_field_is_key_or_label`.
```

- [ ] **Step 6: Generate the migration**

Run, in this order:

```bash
ava supabase status
pnpm db:reset
pnpm db:new-migration list_field_value_rules
```

Expected: a new `supabase/migrations/<timestamp>_list_field_value_rules.sql` containing `alter column "value_picker_rule_type" drop not null` on `attribute_mappings__dataset_column` and a `create or replace function "public"."rpc_concepts__create"`.

Run: `rg -n -i "drop (table|column|function|policy|type|trigger|index)" supabase/migrations/*_list_field_value_rules.sql`
Expected: no output. Any `drop` other than `drop not null` is the shared-stack bug in `CLAUDE.md`: reset, regenerate, compare.

- [ ] **Step 7: Apply it and run pgTAP**

Run: `pnpm db:reset`, then `pnpm test:db`
Expected: PASS, including the migration upgrade tests.

- [ ] **Step 8: Regenerate the desktop SQLite migrations**

Run: `pnpm desktop:sqlite:gen-migrations`, then `pnpm desktop:sqlite:check-migrations`
Expected: the check passes. The generator may or may not emit a new file for the nullability change; commit whatever it writes.

- [ ] **Step 9: Commit**

```bash
git add supabase/schemas/30.attribute_mappings__dataset_column.sql supabase/schemas/50.rpc_concepts__create.sql supabase/migrations/*_list_field_value_rules.sql supabase/tests/database/rpc_concepts__create.test.sql apps/desktop/migrations
git commit -m "feat(joined-cases): store no value rule for a field that keeps every value" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The client reads a missing rule as missing, and the view reads fields by shape

**Files:**
- Generate: `shared/types/database.types.ts`
- Modify: `shared/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types.ts`
- Modify: `shared/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappingParsers.ts`
- Test: `shared/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappingParsers.test.ts` (new)
- Test: `src/clients/ontology/ConceptClient.test.ts`
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/buildAttributeValueSql.ts`
- Test: `src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/buildAttributeValueSql.executed.test.ts`
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql.ts`
- Test: `src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql.executed.test.ts`
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata.ts`
- Test: `src/clients/qetl/QueryMediator/conceptRelation/__tests__/conceptAttributeColumns.integration.executed.test.ts`
- Modify (fixtures): `src/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery.test.ts`, `src/clients/qetl/QueryMediator/__tests__/QueryMediator.concepts.test.ts`
- Modify: `src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/generateIndividuals.ts`
- Test: `src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/generateIndividuals.test.ts`

Plan 1 Tasks 1 to 3 left `buildAttributeValueSql` taking `valuePickerRuleType` and `isArray`, with the list arm inside it, and `ConceptAttributeColumn`'s `dataset_column` arm carrying `valuePickerRuleType` and `isArray`. This task replaces `isArray` with `valueShape` in both, so a list carries no rule.

- [ ] **Step 1: Write the failing parser and client tests**

Create `shared/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappingParsers.test.ts`:

```ts
/**
 * A field that keeps every value stores no value rule. The parsers must keep
 * that absence, or a list would read back with a rule nobody chose.
 */
import { describe, expect, it } from "vitest";
import { DatasetColumnMappingParsers } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappingParsers.ts";

describe("DatasetColumnMappingParsers", () => {
  it("reads a mapping with no value rule as having none", () => {
    const mapping = DatasetColumnMappingParsers.fromDBReadToModelRead({
      id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
      workspace_id: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
      concept_attribute_id: "cccccccc-3333-4333-8333-cccccccccccc",
      value_picker_rule_type: null,
      dataset_id: "dddddddd-4444-4444-8444-dddddddddddd",
      dataset_column_id: "eeeeeeee-5555-4555-8555-eeeeeeeeeeee",
      created_at: "2026-11-06T00:00:00+00:00",
      updated_at: "2026-11-06T00:00:00+00:00",
    });

    expect(mapping.valuePickerRuleType).toBeUndefined();
  });
});
```

In `src/clients/ontology/ConceptClient.test.ts`, add inside `describe("ConceptClient.create", ...)`:

```ts
  it("sends a mapping that names no value rule without one", async () => {
    rpcMock.mockReturnValue({
      throwOnError: () => {
        return Promise.resolve({ data: CONCEPT_ID });
      },
    });

    await ConceptClient.create({
      concept: Model.make("Concept", {
        id: CONCEPT_ID,
        workspaceId: WORKSPACE_ID,
        name: "Facility",
        description: undefined,
        allowManualCreation: false,
        defaultStatusId: STATUS_ID,
      }),
      statuses: [],
      attributes: [],
      mappings: [
        {
          type: "dataset_column",
          conceptAttributeId: KEY_ATTRIBUTE_ID,
          workspaceId: WORKSPACE_ID,
          valuePickerRuleType: undefined,
          datasetId: DATASET_ID,
          datasetColumnId: COLUMN_ID,
        },
      ],
    });

    const [, args] = rpcMock.mock.calls.at(-1)!;
    expect(args.p_dataset_column_mappings[0]).not.toHaveProperty(
      "value_picker_rule_type",
    );
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm test:frontend DatasetColumnMappingParsers ConceptClient`
Expected: FAIL. The parser reads `most_frequent` (`DatasetColumnMappingParsers.ts:52`), and the insert parser sends `value_picker_rule_type: "most_frequent"` (`:58-64`).

- [ ] **Step 3: Write the failing value SQL and view tests**

In `buildAttributeValueSql.executed.test.ts` (plan 1 Task 1), change `BASE_OPTIONS`' `isArray: false,` to `valueShape: "single",`, change the override in "keeps every non-NULL value in file order as a list..." from `{ isArray: true }` to `{ valueShape: "list" }`, and add:

```ts
  // One value needs a rule to pick it. A guessed rule would answer with a
  // value nobody chose, so the SQL is refused rather than built.
  it("refuses to read one value without a value rule", () => {
    expect(() => {
      return buildAttributeValueSql({
        ...BASE_OPTIONS,
        valuePickerRuleType: undefined,
      });
    }).toThrow(/names no value rule/);
  });

  // A list keeps every value whatever rule it is handed.
  it("keeps every value of a list even when it is handed a rule", async () => {
    const records = await _readRecords({
      regions: { valueShape: "list", valuePickerRuleType: "max" },
    });

    expect(_getColumn(records, "regions").p1).toEqual(["North", "South"]);
  });
```

In `buildConceptViewSql.executed.test.ts`, make each column fixture state its shape: in `AGE`, `REGION`, and plan 1's `NICKNAME`, replace `isArray: false,` with `valueShape: "single",` (each keeps its `valuePickerRuleType`); replace `TAGS` with

```ts
const TAGS: ConceptAttributeColumn = {
  kind: "dataset_column",
  attributeId: "attr-tags" as ConceptAttribute.Id,
  attributeName: "tags",
  selectColumnName: "tag",
  datasetId: DATASET_A,
  primaryKeyColumnName: "person_id",
  valueShape: "list",
};
```

add `valueShape: "single",` after `duckDbDataType` in `NOTE` and in the `status` unmapped column of "keeps the spine's status when an attribute column is named status", and in "leaves NULL values out of a list column" replace `isArray: true` with `valueShape: "list"`. Then add below `NOTE`:

```ts
const NOTES: ConceptAttributeColumn = {
  kind: "unmapped",
  attributeId: "attr-notes" as ConceptAttribute.Id,
  attributeName: "notes",
  duckDbDataType: "VARCHAR",
  valueShape: "list",
};
```

and this test after "emits an unmapped attribute as a typed NULL column":

```ts
  // A list field with nothing to read is an empty list of its type, not a
  // NULL scalar, so SQL that treats it as a list, as chat is told to, binds.
  it("emits an unmapped list attribute as an empty typed list", async () => {
    const rows = await withDuckDb(async (connection) => {
      await _seed(connection);
      await connection.run(
        buildConceptViewSql({
          viewName: CONCEPT_VIEW,
          spineTableName: SPINE,
          attributeColumns: [NOTES],
        }),
      );
      const reader = await connection.runAndReadAll(
        `SELECT external_id, len("notes") AS note_count FROM "${CONCEPT_VIEW}" ORDER BY external_id`,
      );
      return reader.getRowObjects().map(_normalize);
    });

    expect(rows).toEqual([
      { external_id: "p1", note_count: 0 },
      { external_id: "p2", note_count: 0 },
      { external_id: "p3", note_count: 0 },
    ]);
  });
```

In `conceptAttributeColumns.integration.executed.test.ts`, add `valueShape: "single",` to the expected column in "emits a manual-entry attribute as a column that reads no dataset" (after `duckDbDataType`), and add after "refuses a mapping whose dataset column no longer exists":

```ts
  // A field that keeps one value needs a rule to pick it. Guessing one would
  // answer with a value nobody chose, so the planner refuses the concept,
  // naming the field.
  it("refuses a single-value attribute whose mapping names no value rule", () => {
    const metadata = _metadata({
      attributes: [PERSON_ID, AGE],
      mappings: [
        PERSON_ID_MAPPING,
        {
          ...AGE_MAPPING,
          mapping: { ...AGE_MAPPING.mapping, valuePickerRuleType: undefined },
        },
      ],
    });

    expect(() => {
      return makeConceptAttributeColumnsFromMetadata(metadata);
    }).toThrow(/'age'.*names no value rule/);
  });

  // A list field created before lists stored no rule still has one. Its
  // column carries none, so the view keeps every value.
  it("drops the stored rule of a list attribute from its column", () => {
    const metadata = _metadata({
      attributes: [PERSON_ID, TAGS],
      mappings: [
        PERSON_ID_MAPPING,
        {
          ...TAGS_MAPPING,
          mapping: { ...TAGS_MAPPING.mapping, valuePickerRuleType: "sum" },
        },
      ],
    });

    const tags = makeConceptAttributeColumnsFromMetadata(
      metadata,
    ).attributeColumns.find((column) => {
      return column.attributeName === "tags";
    });

    expect(tags).toMatchObject({ kind: "dataset_column", valueShape: "list" });
    expect(tags).not.toHaveProperty("valuePickerRuleType");
  });
```

In `getNeededColumnsFromQuery.test.ts` and `QueryMediator.concepts.test.ts`, replace `isArray: false,` in `CONCEPT_PLAN.attributeColumns[0]` with `valueShape: "single",`, keeping its `valuePickerRuleType`.

- [ ] **Step 4: Write the failing Sync test**

In `generateIndividuals.test.ts`, add:

```ts
  // The label names each record with one value. A label whose mapping names
  // no rule cannot pick one, so the sync fails rather than guessing.
  it("refuses to sync a case type whose label names no value rule", async () => {
    const concept = _makeConcept();
    const attributes = concept.attributes.map((attribute) => {
      return attribute.isLabel && attribute.mapping.type === "dataset_column"
        ? {
            ...attribute,
            mapping: { ...attribute.mapping, valuePickerRuleType: undefined },
          }
        : attribute;
    });

    await expect(
      generateIndividuals({ ...concept, attributes }),
    ).rejects.toThrow(/names no value rule/);
  });
```

- [ ] **Step 5: Run the engine and Sync tests to see them fail**

Run: `pnpm test:executed buildAttributeValueSql buildConceptViewSql conceptAttributeColumns`
Expected: FAIL. `buildAttributeValueSql` reads `isArray`, which no fixture sets now, so every list test reads one value; it does not throw without a rule; "emits an unmapped list attribute as an empty typed list" reads `note_count: null`; the planner neither throws for `age` nor drops the list's rule.

Run: `pnpm test:frontend generateIndividuals`
Expected: FAIL. Plan 1's `_buildReducedValueSql` matches no rule for `undefined`, so the sync throws ts-pattern's `Pattern matching error` rather than an error naming the missing rule.

- [ ] **Step 6: Regenerate the database types**

Run: `pnpm db:gen-types`
Expected: in `shared/types/database.types.ts`, `attribute_mappings__dataset_column`'s `Row.value_picker_rule_type` gains `| null`, and `Insert` and `Update` make it optional.

- [ ] **Step 7: Let the model and parsers carry no rule**

In `DatasetColumnMapping.types.ts`, replace

```ts
  /** Rule to pick which value to use when multiple are found */
  valuePickerRuleType: ValuePickerRuleType;
```

with

```ts
  /**
   * Rule to pick which value to use when multiple are found. Undefined for a
   * field that keeps every value.
   */
  valuePickerRuleType: ValuePickerRuleType | undefined;
```

In `DatasetColumnMappingParsers.ts`:

- In `DBReadSchema`, make the rule `value_picker_rule_type: z.enum(DatasetColumnMappings.ValuePickerTypes).nullable(),`.
- In `fromDBReadToModelRead`, delete the line `valuePickerRuleType: obj.valuePickerRuleType ?? "most_frequent",`. `nullsToUndefinedDeep` already turns NULL into `undefined`.
- Replace `fromModelInsertToDBInsert` with:

```ts
    fromModelInsertToDBInsert: pipe(
      snakeCaseKeysDeep,
      excludeUndefinedDeep,
      omitProps("type"),
    ),
```

- [ ] **Step 8: Read a value by its shape**

In `buildAttributeValueSql.ts`, add the type imports

```ts
import type { ValuePickerRuleType } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
```

(drop the `DatasetColumnMapping` type import if nothing else uses it), and in `AttributeValueSqlOptions` replace the `valuePickerRuleType` and `isArray` members with:

```ts
  /** Keep one value, picked by `valuePickerRuleType`, or every value as a list. */
  valueShape: ConceptAttribute.ValueShape;
  /** How one record's rows reduce to one value. Required for one value; a list ignores it. */
  valuePickerRuleType: ValuePickerRuleType | undefined;
```

In `_buildReducedValueSql`, type its `valuePickerRuleType` option as `ValuePickerRuleType`. In `buildAttributeValueSql`, replace the `const body = options.isArray ? ... : _buildReducedValueSql(...)` expression with:

```ts
  const body = match(options.valueShape)
    .with("list", () => {
      // `list()` over no rows is NULL. A record with no values gets an empty
      // list, which reads as "none" rather than "unknown".
      return `SELECT COALESCE(list(${value} ORDER BY ${DATASET_ALIAS}.file_row_number), []) FROM ${parts.rowsView} ${DATASET_ALIAS} WHERE ${parts.rowFilter}`;
    })
    .with("single", () => {
      const { valuePickerRuleType } = options;
      // A guessed rule would answer with a value nobody chose.
      if (valuePickerRuleType === undefined) {
        throw new Error(
          `Column '${options.outputColumnName}' keeps one value, but names no value rule.`,
        );
      }
      return _buildReducedValueSql({ parts, valuePickerRuleType });
    })
    .exhaustive();
```

Keep every other line plan 1 and plan 2 wrote in this file.

- [ ] **Step 9: Build the view's columns by shape**

In `buildConceptViewSql.ts`, add the imports

```ts
import { match } from "ts-pattern";
import type { ValuePickerRuleType } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types";
```

remove the now unused `DatasetColumnMapping` type import, and replace the `ConceptAttributeColumn` type with:

```ts
/**
 * How a dataset-column attribute's rows become its value: reduced to one
 * value by a rule, or kept whole as a list. Built from the attribute's value
 * shape by `makeConceptAttributeColumnsFromMetadata` and read by the view's
 * selectors.
 */
export type ConceptAttributeValueRule =
  | { valueShape: "single"; valuePickerRuleType: ValuePickerRuleType }
  | { valueShape: "list" };

/** One column of the concept relation, already resolved to what it reads. */
export type ConceptAttributeColumn =
  | ({
      kind: "dataset_column";
      /**
       * The attribute this column holds. It survives a renamed column, so a
       * reader of the view maps a column back to its attribute by this.
       */
      attributeId: ConceptAttribute.Id;
      /** The relation's column name, which is the attribute's name. */
      attributeName: string;
      /** The contributing dataset's column this attribute reads. */
      selectColumnName: string;
      datasetId: string;
      /** The dataset column mapped to the concept's identifier attribute. */
      primaryKeyColumnName: string;
    } & ConceptAttributeValueRule)
  | {
      /**
       * An attribute with no dataset contribution to read, which today means a
       * manual-entry mapping. It becomes a typed NULL, or an empty list for a
       * list attribute, so the relation's schema is stable whether or not a
       * value exists, rather than the column vanishing and breaking a saved
       * query.
       */
      kind: "unmapped";
      /** The attribute this column holds, as on the other arm. */
      attributeId: ConceptAttribute.Id;
      attributeName: string;
      duckDbDataType: DuckDbDataType;
      valueShape: ConceptAttribute.ValueShape;
    };
```

Replace plan 1's `_buildColumnSelector` with the two functions below:

```ts
function _buildColumnSelector(column: ConceptAttributeColumn): string {
  if (column.kind === "unmapped") {
    return _buildUnmappedSelector(column);
  }
  // Single values and lists alike: one function owns every value rule, so the
  // view and everything that reads it agree with Sync on every value.
  return buildAttributeValueSql({
    selectColumnName: column.selectColumnName,
    primaryKeyColumnName: column.primaryKeyColumnName,
    datasetId: column.datasetId,
    valueShape: column.valueShape,
    // A list column carries no rule.
    valuePickerRuleType:
      "valuePickerRuleType" in column ? column.valuePickerRuleType : undefined,
    outputColumnName: column.attributeName,
    externalIdsTable: SPINE_ALIAS,
    externalIdColumn: EXTERNAL_ID_COLUMN,
  });
}

/**
 * The typed column for an attribute with nothing to read. A list attribute
 * is an empty list of its type rather than NULL, which is what every list
 * holds when no value exists, so SQL that reads it as a list still binds.
 */
function _buildUnmappedSelector(
  column: Extract<ConceptAttributeColumn, { kind: "unmapped" }>,
): string {
  const alias = quoteSqlIdentifier(column.attributeName);
  return match(column.valueShape)
    .with("single", () => {
      return `CAST(NULL AS ${column.duckDbDataType}) AS ${alias}`;
    })
    .with("list", () => {
      return `CAST([] AS ${column.duckDbDataType}[]) AS ${alias}`;
    })
    .exhaustive();
}
```

- [ ] **Step 10: Derive each column's rule from the attribute's shape**

In `makeConceptAttributeColumnsFromMetadata.ts`:

- Change `import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";` to a value import, and add:

```ts
import { match } from "ts-pattern";
import type { ValuePickerRuleType } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types";
import type { ConceptAttributeValueRule } from "@/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql";
```

- In `_buildUnmappedColumn`, add `valueShape: ConceptAttribute.getValueShape(attribute),` to the returned object.
- Add above `_buildAttributeColumn`:

```ts
/**
 * How one dataset-column attribute's rows become its value, from the
 * attribute's value shape. A list keeps every value and drops any rule its
 * mapping still stores. A single value needs a rule, and an attribute without
 * one is a broken ontology: guessing a rule would answer with a value nobody
 * chose, so it throws, naming the attribute.
 */
function _getValueRule(
  options: Readonly<{
    attribute: ConceptAttribute.T;
    mapping: DatasetColumnMapping;
  }>,
): ConceptAttributeValueRule {
  const { attribute } = options;
  const ruleType: ValuePickerRuleType | undefined =
    options.mapping.valuePickerRuleType;
  return match(ConceptAttribute.getValueShape(attribute))
    .with("single", (): ConceptAttributeValueRule => {
      if (ruleType === undefined) {
        throw new Error(
          `Concept attribute '${attribute.name}' (${attribute.id}) keeps one ` +
            `value, but its mapping names no value rule.`,
        );
      }
      return { valueShape: "single", valuePickerRuleType: ruleType };
    })
    .with("list", (): ConceptAttributeValueRule => {
      return { valueShape: "list" };
    })
    .exhaustive();
}
```

- In `_buildAttributeColumn`'s returned `column`, replace the two lines `valuePickerRuleType: mapping.valuePickerRuleType,` and `isArray: attribute.isArray,` with `..._getValueRule({ attribute, mapping }),`.

- [ ] **Step 11: Name Sync's label read as one value**

In `generateIndividuals.ts`, in plan 1's `buildAttributeValueSql({ ... })` call for the record name, replace `isArray: false,` with `valueShape: "single",`. Its `valuePickerRuleType: labelMapping.valuePickerRuleType` now has the type `ValuePickerRuleType | undefined`, and `buildAttributeValueSql` throws when it is undefined, which is the refusal the Step 4 test expects. Creation already refuses a list label (Task 2).

- [ ] **Step 12: Run the type-check**

Run: `pnpm type-check`
Expected: PASS. Plan 1 deleted `AttributeAssertionClient` and the legacy readers, so `buildAttributeValueSql`, the view, and Sync are the only code that reads a mapping's rule into SQL. The concept creator form and the video adapter only hold the rule in a draft, so the wider type compiles there.

- [ ] **Step 13: Run the tests**

Run: `pnpm test:frontend DatasetColumnMappingParsers ConceptClient generateIndividuals getNeededColumnsFromQuery QueryMediator`
Expected: PASS.

Run: `pnpm test:executed buildAttributeValueSql buildConceptViewSql conceptAttributeColumns structuredQueryConcepts`
Expected: PASS.

- [ ] **Step 14: Commit**

```bash
git add shared/types/database.types.ts shared/models/ontology/AttributeMapping/DatasetColumnMapping src/clients/ontology/ConceptClient.test.ts src/clients/qetl/QueryMediator src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals
git commit -m "feat(joined-cases): read each case type field by its value shape" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: List result columns are marked, and list dates read as days

**Files:**
- Modify: `src/clients/DuckDbClient/duckDbArrowResults/duckDbArrowResults.ts`
- Test: `src/clients/DuckDbClient/duckDbArrowResults/duckDbArrowResults.test.ts`
- Modify: `src/clients/DuckDbClient/arrowFieldToQueryResultField.ts`
- Modify: `shared/models/queries/QueryResult/QueryResult.types.ts`

Plan 1 Task 7 moved `duckDbArrowResults.ts` into its own directory and made every list cell a plain array. This task adds the two things it does not do: a list result column is described as one, and a list's dates and timestamps arrive as ISO strings.

- [ ] **Step 1: Write the failing tests**

In `duckDbArrowResults.test.ts`, add `vi` to the `vitest` import, add `import type { ILogger } from "@avandar/logger";`, and add inside `describe("arrowTableToJS", ...)`:

```ts
  // A list result column is described as text (below), so an epoch number in
  // it would read as a count.
  it("returns the dates in a list cell as calendar days", () => {
    const visits = arrow.vectorFromArray(
      [[new Date("2026-01-05T00:00:00Z"), new Date("2026-02-01T00:00:00Z")]],
      new arrow.List(new arrow.Field("item", new arrow.DateDay(), true)),
    );

    expect(arrowTableToJS(new arrow.Table({ visits })).data).toEqual([
      { visits: ["2026-01-05", "2026-02-01"] },
    ]);
  });

  it("returns the timestamps in a list cell as ISO strings", () => {
    const seenAt = arrow.vectorFromArray(
      [[Date.UTC(2026, 0, 5, 10, 30)]],
      new arrow.List(
        new arrow.Field("item", new arrow.TimestampMillisecond(), true),
      ),
    );

    expect(arrowTableToJS(new arrow.Table({ seenAt })).data).toEqual([
      { seenAt: ["2026-01-05T10:30:00.000Z"] },
    ]);
  });

  it("describes a list column as a text list without logging an error", () => {
    const logger = { error: vi.fn() } as unknown as ILogger;
    const symptoms = arrow.vectorFromArray(
      [["Rash"]],
      new arrow.List(new arrow.Field("item", new arrow.Utf8(), true)),
    );

    const result = arrowTableToJS(new arrow.Table({ Symptoms: symptoms }), {
      logger,
    });

    expect(result.columns).toEqual([
      { name: "Symptoms", dataType: "varchar", isArray: true },
    ]);
    expect(logger.error).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm test:frontend duckDbArrowResults`
Expected: FAIL. The dates and timestamps come back as epoch numbers (`1767571200000`), and the column has no `isArray` and logs `Unhandleable arrow type`.

- [ ] **Step 3: Read a list's dates and timestamps as ISO strings**

In `duckDbArrowResults.ts`, add below plan 1's `_hasToJson`:

```ts
/**
 * One element of a LIST cell. A list result column is described as text, so
 * its dates and timestamps become ISO strings rather than epoch numbers that
 * nothing downstream could tell from a count.
 */
function _toJsListItem(
  options: Readonly<{ itemType: arrow.DataType; item: unknown }>,
): unknown {
  const { itemType, item } = options;
  if (item === null || item === undefined) {
    return null;
  }
  if (arrow.DataType.isDate(itemType)) {
    return new Date(item as number).toISOString().slice(0, 10);
  }
  if (arrow.DataType.isTimestamp(itemType)) {
    return new Date(item as number).toISOString();
  }
  return _toJsValueFromArrowValue(
    item instanceof arrow.Vector || !_hasToJson(item) ? item : item.toJSON(),
  );
}
```

and in `_toJsValueFromArrowValue`'s `arrow.Vector` branch, keep plan 1's comment and change the `Array.from` callback to:

```ts
    return Array.from(value as Iterable<unknown>, (item) => {
      return _toJsListItem({ itemType: value.type, item });
    });
```

A list cell's vector is typed by its element, so `value.type` is the element type.

- [ ] **Step 4: Describe list columns**

In `shared/models/queries/QueryResult/QueryResult.types.ts`, replace `QueryResultColumn` with:

```ts
export type QueryResultColumn = {
  name: string;
  dataType: AvaDataTypeT;
  /**
   * True for a LIST column, such as a case type field that keeps every
   * value. Its `dataType` is `varchar` because a list renders as text.
   * Controls that build SQL from a column's values, like a dashboard filter,
   * leave it out. Absent means false.
   */
  isArray?: boolean;
};
```

In `arrowFieldToQueryResultField.ts`, delete `arrow.Type.List,` from the "Unhandleable arrow type" arm, and at the start of the function body add:

```ts
  // A LIST column renders as text wherever a result is shown, and is marked
  // so the controls that would put its values into SQL can refuse it.
  if (field.type.typeId === arrow.Type.List) {
    return { name: field.name, dataType: "varchar", isArray: true };
  }
```

- [ ] **Step 5: Run the tests**

Run: `pnpm test:frontend duckDbArrowResults DuckDbClient`
Expected: PASS, plan 1's list tests included.

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/clients/DuckDbClient/duckDbArrowResults src/clients/DuckDbClient/arrowFieldToQueryResultField.ts shared/models/queries/QueryResult/QueryResult.types.ts
git commit -m "feat(joined-cases): mark list result columns and read list dates as days" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The Data Explorer and dashboards offer only what works on a list

**Files:**
- Modify: `shared/models/queries/QueryColumn/QueryColumnModule.ts`
- Test: `shared/models/queries/QueryColumn/QueryColumn.test.ts`
- Modify: `src/views/DataExplorerApp/AggregationSelect.tsx`
- Modify: `src/views/DataExplorerApp/QueryForm/ManualQueryForm/AggregationFields.tsx`
- Modify: `src/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField.tsx`
- Test: `src/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField.test.tsx`
- Modify: `src/lib/ui/viz/makeDataGridColumnDefs/makeDataGridColumnDefs.ts`
- Test: `src/lib/ui/viz/makeDataGridColumnDefs/makeDataGridColumnDefs.test.ts`
- Modify: `src/views/DashboardApp/AvaPage/pfields/LocalFiltersPField/LocalFilterEditor.tsx`
- Modify: `src/views/DashboardApp/AvaPage/pfields/LocalFiltersPField/LocalFiltersPField.tsx`
- Test: `src/views/DashboardApp/AvaPage/pfields/LocalFiltersPField/LocalFilterEditor.test.tsx` (new)

- [ ] **Step 1: Write the failing query column tests**

Append to `shared/models/queries/QueryColumn/QueryColumn.test.ts`, adding `describe` to the `vitest` import and these imports:

```ts
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute.ts";
```

```ts
function _fieldColumn(
  options: Readonly<{ name: string; dataType: AvaDataType.T; isArray: boolean }>,
): QueryColumn.T {
  return QueryColumn.makeFromConceptAttribute(
    Model.make("ConceptAttribute", {
      id: `attr_${options.name}`,
      conceptId: "concept_1",
      workspaceId: "workspace_1",
      name: options.name,
      description: undefined,
      createdAt: "2026-11-06T00:00:00Z",
      updatedAt: "2026-11-06T00:00:00Z",
      dataType: options.dataType,
      mappingType: "dataset_column",
      isLabel: false,
      isIdentifier: false,
      allowManualEdit: false,
      isArray: options.isArray,
    }) as ConceptAttribute.T,
  );
}

const DAILY_CASES_LIST = _fieldColumn({
  name: "Daily new cases",
  dataType: "bigint",
  isArray: true,
});
const DAILY_CASES_TOTAL = _fieldColumn({
  name: "Total cases",
  dataType: "bigint",
  isArray: false,
});

describe("QueryColumn and list fields", () => {
  it("offers a list field only grouping and counting", () => {
    expect(QueryColumn.getValidAggregations(DAILY_CASES_LIST)).toEqual([
      "none",
      "group_by",
      "count",
    ]);
    expect(QueryColumn.getValidAggregations(DAILY_CASES_TOTAL)).toContain(
      "sum",
    );
  });

  it("never treats a list of numbers as numeric", () => {
    expect(QueryColumn.isNumeric(DAILY_CASES_LIST)).toBe(false);
    expect(QueryColumn.isNumeric(DAILY_CASES_TOTAL)).toBe(true);
  });

  it("treats only a field that keeps every value as a list", () => {
    expect(QueryColumn.isList(DAILY_CASES_LIST)).toBe(true);
    expect(QueryColumn.isList(DAILY_CASES_TOTAL)).toBe(false);
  });
});
```

- [ ] **Step 2: Write the failing control tests**

In `QueryFiltersField.test.tsx`, add the import `import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";`, this helper after `_column`, and the test:

```ts
function _listFieldColumn(name: string): QueryColumn.T {
  return QueryColumn.makeFromConceptAttribute(
    Model.make("ConceptAttribute", {
      id: `attr_${name}`,
      conceptId: "concept_1",
      workspaceId: "workspace_1",
      name,
      description: undefined,
      createdAt: "2026-11-06T00:00:00Z",
      updatedAt: "2026-11-06T00:00:00Z",
      dataType: "varchar",
      mappingType: "dataset_column",
      isLabel: false,
      isIdentifier: false,
      allowManualEdit: false,
      isArray: true,
    }) as ConceptAttribute.T,
  );
}
```

```tsx
  // Every filter operator fails on a list in DuckDB, so a field that keeps
  // every value is not offered.
  it("leaves a field that keeps every value out of the column dropdown", async () => {
    render(
      <AvandarAppProvider>
        <QueryFiltersField
          columns={[...COLUMNS, _listFieldColumn("Symptoms")]}
          value={ONE_TEXT_RULE}
          onChange={vi.fn()}
        />
      </AvandarAppProvider>,
    );
    fireEvent.click(screen.getByLabelText("Column", { selector: "input" }));

    expect(
      await screen.findByRole("option", { name: "Admin2" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Symptoms" })).toBeNull();
  });
```

In `makeDataGridColumnDefs.test.ts`, add inside `describe("makeDataGridColumnDefs", ...)`:

```ts
  it("shows a list cell's values separated by semicolons and an empty list as blank", () => {
    const [columnDef] = makeDataGridColumnDefs({
      columnNames: ["Daily new cases"],
      data: [{ "Daily new cases": [31, 1234] }],
      dateColumns: undefined,
      dateFormat: "YYYY-MM-DD",
    });

    expect(columnDef!.valueFormatter({ value: [31, 1234] })).toBe(
      "31; 1,234",
    );
    expect(columnDef!.valueFormatter({ value: [] })).toBe("");
  });
```

If `formatChartNumber(1234)` renders differently in this locale, take its output for `1234` and keep `"31; "` before it.

Create `src/views/DashboardApp/AvaPage/pfields/LocalFiltersPField/LocalFilterEditor.test.tsx`:

```tsx
/**
 * A local filter puts its column's values into `IN`, `ILIKE`, or `=`, which
 * all fail on a list, so a list column is never offered.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { LocalFilterEditor } from "@/views/DashboardApp/AvaPage/pfields/LocalFiltersPField/LocalFilterEditor";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";

const COUNTY_ID = "qc_county" as QueryColumn.Id;

const COLUMNS: QueryResult.ColumnWithId[] = [
  { id: COUNTY_ID, name: "County", dataType: "varchar" },
  {
    id: "qc_cases" as QueryColumn.Id,
    name: "Daily new cases",
    dataType: "varchar",
    isArray: true,
  },
];

describe("LocalFilterEditor", () => {
  it("offers no list column to filter on", async () => {
    render(
      <LocalFilterEditor
        columns={COLUMNS}
        filter={{
          id: "filter_1",
          label: "",
          columnId: COUNTY_ID,
          mode: "select_single",
          optionsRaw: "",
          defaultValue: "",
        }}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText("Column", { selector: "input" }));

    expect(
      await screen.findByRole("option", { name: "County" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Daily new cases" }),
    ).toBeNull();
  });
});
```

- [ ] **Step 3: Run them to see them fail**

Run: `pnpm test:frontend QueryColumn QueryFiltersField makeDataGridColumnDefs LocalFilterEditor`
Expected: FAIL. `QueryColumn.getValidAggregations` and `QueryColumn.isList` are not functions; `isNumeric` is true for the list; `Symptoms` and `Daily new cases` are offered; the grid cell reads `31,1234`.

- [ ] **Step 4: Teach query columns about lists**

In `QueryColumnModule.ts`, add the imports

```ts
import { match } from "ts-pattern";
import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute.ts";
```

add above `export const QueryColumnModule`:

```ts
function _isList(column: QueryColumn.T): boolean {
  const { baseColumn } = column;
  if (baseColumn.__type !== "ConceptAttribute") {
    return false;
  }
  return match(ConceptAttribute.getValueShape(baseColumn))
    .with("single", () => {
      return false;
    })
    .with("list", () => {
      return true;
    })
    .exhaustive();
}

/** Grouping and counting work on a whole list; number aggregates do not. */
const LIST_AGGREGATIONS: readonly QueryAggregationType.T[] = [
  "none",
  "group_by",
  "count",
];
```

replace `isNumeric` with

```ts
  isNumeric: (column: QueryColumn.T): boolean => {
    // A list of numbers is not a number: summing or charting it fails.
    return (
      !_isList(column) && AvaDataType.isNumeric(column.baseColumn.dataType)
    );
  },
```

and add to the module object:

```ts
  /**
   * Whether the column is a case type field that keeps every value, which a
   * query reads as a DuckDB list. Use it to keep a list out of an operation
   * that fails on one, for example a filter.
   */
  isList: _isList,

  /**
   * The aggregations a column can take in a query: a list's are grouping and
   * counting, any other column's follow its data type.
   */
  getValidAggregations: (
    column: QueryColumn.T,
  ): readonly QueryAggregationType.T[] => {
    return _isList(column)
      ? LIST_AGGREGATIONS
      : AvaDataType.getValidQueryAggregations(column.baseColumn.dataType);
  },
```

- [ ] **Step 5: Give the aggregation picker its valid aggregations**

In `AggregationSelect.tsx`, replace the `dataType: AvaDataType.T;` prop with

```ts
  /** The aggregations this column can take, for example from `QueryColumn.getValidAggregations`. */
  validAggregations: readonly QueryAggregationType.T[];
```

destructure `validAggregations` instead of `dataType`, delete the line `const validAggregations = AvaDataTypeFns.getValidQueryAggregations(dataType);`, and delete the two now unused `AvaDataType` imports.

In `AggregationFields.tsx`, add `import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";` and replace `dataType={column.baseColumn.dataType}` with `validAggregations={QueryColumn.getValidAggregations(column)}`.

- [ ] **Step 6: Keep lists out of the filter picker**

In `QueryFiltersField.tsx`, add after the `translations` memo:

```ts
  // Every filter operator fails on a list in DuckDB, so a field that keeps
  // every value cannot be filtered on here.
  const filterableColumns = useMemo(() => {
    return columns.filter((column) => {
      return !QueryColumn.isList(column);
    });
  }, [columns]);
```

and use `filterableColumns` in place of `columns` inside the `columnTypes` and `fields` memos (both bodies and dependency arrays). The `columns.length === 0` empty state keeps reading `columns`.

- [ ] **Step 7: Render list cells in the grid**

In `makeDataGridColumnDefs.ts`, add above `makeDataGridColumnDefs`:

```ts
/**
 * The text of one non-date cell. A list, such as a case type field that
 * keeps every value, shows its values separated by semicolons, which never
 * collide with a number's thousands separator; an empty list is blank.
 */
function _formatCellValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(_formatCellValue).join("; ");
  }
  return typeof value === "number"
    ? formatChartNumber(value)
    : value == null
      ? ""
      : String(value);
}
```

and replace the non-date `valueFormatter` with:

```ts
        : (params: { value: unknown }) => {
            return _formatCellValue(params.value);
          },
```

- [ ] **Step 8: Keep list columns out of dashboard local filters**

In `LocalFilterEditor.tsx`, replace the column `Select`'s `data` with:

```ts
          // A local filter's IN, ILIKE, or = fails on a list column.
          data={columns
            .filter((column) => {
              return !column.isArray;
            })
            .map((column) => {
              return { value: column.id, label: column.name };
            })}
```

In `LocalFiltersPField.tsx`, replace `const firstColumn = columns[0];` in `addFilter` with:

```ts
    const firstColumn = columns.find((column) => {
      return !column.isArray;
    });
```

- [ ] **Step 9: Run the tests and the type-check**

Run: `pnpm test:frontend QueryColumn QueryFiltersField makeDataGridColumnDefs LocalFilterEditor ManualQueryForm`
Expected: PASS.

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add shared/models/queries/QueryColumn src/views/DataExplorerApp/AggregationSelect.tsx src/views/DataExplorerApp/QueryForm src/lib/ui/viz/makeDataGridColumnDefs src/views/DashboardApp/AvaPage/pfields/LocalFiltersPField
git commit -m "feat(joined-cases): offer list fields only the explorer operations that work on them" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The chat contract carries a value shape

**Files:**
- Modify: `shared/types/chat.types.ts`
- Modify: `supabase/functions/chat/PostChatMessages/parsing/parseProposeCaseType.ts`
- Test: `supabase/functions/chat/PostChatMessages/parsing/parseProposeCaseType.test.ts`
- Modify: `supabase/functions/chat/PostChatMessages/parsing/parseCreateCaseTypes.ts`
- Test: `supabase/functions/chat/PostChatMessages/parsing/parseCreateCaseTypes.test.ts`
- Modify (fixtures): `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftBlock.test.tsx`, `src/components/ChatPanel/CaseTypeDraftBlock/useCaseTypeDraftEditor.test.ts`, `src/views/OntologyDesignerApp/proposedCaseTypeToCreatedCaseType/proposedCaseTypeToCreatedCaseType.test.ts`

- [ ] **Step 1: Write the failing parser tests**

In `parseProposeCaseType.test.ts`, add the constant `const SYMPTOMS_COLUMN_ID = "3c4d5e6f-aaaa-4bbb-8ccc-ddddeeeeffff";` and this helper below the constants:

```ts
/** A one-dataset proposal whose join key is the deaths key and label is State. */
function _proposeWithAttributes(attributes: readonly unknown[]): string {
  return JSON.stringify({
    name: "Measles case",
    sourceDatasets: [
      { datasetId: DEATHS_DATASET_ID, primaryKeyColumnId: DEATHS_KEY_COLUMN_ID },
    ],
    labelColumnId: STATE_COLUMN_ID,
    attributes,
    manualEntryAttributes: [],
  });
}

function _attribute(
  columnId: string,
  name: string,
  valueShape?: unknown,
): Record<string, unknown> {
  return {
    datasetId: DEATHS_DATASET_ID,
    columnId,
    name,
    isIncluded: true,
    valuePickerRuleType: "first",
    ...(valueShape === undefined ? {} : { valueShape }),
  };
}
```

Add to `describe("parseProposeCaseType", ...)`:

```ts
  it("reads a proposed list field as keeping every value", () => {
    const parsed = parseProposeCaseType(
      _proposeWithAttributes([
        _attribute(STATE_COLUMN_ID, "State"),
        _attribute(SYMPTOMS_COLUMN_ID, "Symptoms", "list"),
      ]),
    );

    expect(parsed?.attributes[1]?.valueShape).toBe("list");
  });

  it("reads a field with no value shape, or an unknown one, as keeping one value", () => {
    const parsed = parseProposeCaseType(
      _proposeWithAttributes([
        _attribute(STATE_COLUMN_ID, "State"),
        _attribute(SYMPTOMS_COLUMN_ID, "Symptoms", "many"),
      ]),
    );

    expect(
      parsed?.attributes.map((attribute) => {
        return attribute.valueShape;
      }),
    ).toEqual(["single", "single"]);
  });

  it("keeps the label column and every join key to one value even when proposed as lists", () => {
    const parsed = parseProposeCaseType(
      _proposeWithAttributes([
        _attribute(DEATHS_KEY_COLUMN_ID, "County code", "list"),
        _attribute(STATE_COLUMN_ID, "State", "list"),
      ]),
    );

    expect(
      parsed?.attributes.map((attribute) => {
        return attribute.valueShape;
      }),
    ).toEqual(["single", "single"]);
  });
```

In the existing test "includes attributes by default and falls back to most_frequent", rename it to "includes attributes by default as one value and falls back to most_frequent" and add `valueShape: "single",` to its expected attribute, before `valuePickerRuleType`.

In `parseCreateCaseTypes.test.ts`, add `const CASES_COLUMN_ID = "2b3c4d5e-aaaa-4bbb-8ccc-ddddeeeeffff";` and:

```ts
  it("carries a field that keeps every value", () => {
    const parsed = parseCreateCaseTypes(
      JSON.stringify({
        cases: [
          {
            name: "County",
            identities: [
              { datasetId: DATASET_ID, primaryKeyColumnId: PK_COLUMN_ID },
            ],
            attributes: [
              {
                name: "Daily new cases",
                kind: "dataset_column",
                datasetId: DATASET_ID,
                columnId: CASES_COLUMN_ID,
                valueShape: "list",
              },
            ],
          },
        ],
      }),
    );

    expect(parsed?.[0]?.attributes[0]).toMatchObject({ valueShape: "list" });
  });

  it("keeps a join key and the label to one value", () => {
    const parsed = parseCreateCaseTypes(
      JSON.stringify({
        cases: [
          {
            name: "County",
            identities: [
              { datasetId: DATASET_ID, primaryKeyColumnId: PK_COLUMN_ID },
            ],
            attributes: [
              {
                name: "County",
                kind: "dataset_column",
                datasetId: DATASET_ID,
                columnId: PK_COLUMN_ID,
                valueShape: "list",
              },
              {
                name: "Label",
                kind: "dataset_column",
                datasetId: DATASET_ID,
                columnId: CASES_COLUMN_ID,
                isLabel: true,
                valueShape: "list",
              },
            ],
          },
        ],
      }),
    );

    expect(
      parsed?.[0]?.attributes.map((attribute) => {
        return "valueShape" in attribute ? attribute.valueShape : undefined;
      }),
    ).toEqual([undefined, undefined]);
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm test:frontend parseProposeCaseType parseCreateCaseTypes`
Expected: FAIL. No parsed attribute has `valueShape`.

- [ ] **Step 3: Add the contract types**

In `shared/types/chat.types.ts`, add after `ChatCaseValuePickerRuleType`:

```ts
/**
 * How many values a chat-drafted field keeps for one case: `single` reduces
 * the dataset's rows with a value picker, `list` keeps every value. Mirrors
 * `ConceptAttribute.ValueShape`.
 */
export type ChatCaseValueShape = "single" | "list";
```

In the `dataset_column` arm of `ChatCreatedCaseAttribute`, replace `valuePickerRuleType?: ChatCaseValuePickerRuleType;` with:

```ts
      /** Absent means `single`. A join key or the label is always `single`. */
      valueShape?: ChatCaseValueShape;
      /** Absent for a list, which keeps every value. */
      valuePickerRuleType?: ChatCaseValuePickerRuleType;
```

In `ChatProposedCaseAttribute`, replace `valuePickerRuleType: ChatCaseValuePickerRuleType;` with:

```ts
  /** Whether the field keeps one value or every value. */
  valueShape: ChatCaseValueShape;
  /**
   * The rule that picks one value. Kept for a list too, so the card can
   * switch the field back to one value without asking for a rule.
   */
  valuePickerRuleType: ChatCaseValuePickerRuleType;
```

- [ ] **Step 4: Parse and coerce the proposal**

In `parseProposeCaseType.ts`, add `ChatCaseValueShape` to the `$/types/chat.types.ts` type import, and add above `_parseAttribute`:

```ts
/**
 * Anything but an explicit list keeps one value, which is the safe reading
 * of a malformed proposal: the user can still switch it in the card.
 */
function _asValueShape(value: unknown): ChatCaseValueShape {
  return value === "list" ? "list" : "single";
}
```

In `_parseAttribute`'s returned object, add `valueShape: _asValueShape(record.valueShape),` before `valuePickerRuleType`. Add above `parseProposeCaseType`:

```ts
/**
 * A join key matches rows to a case and the label names it, and neither can
 * be a list, so those columns keep one value whatever the model proposed.
 */
function _withKeyAndLabelColumnsSingle(
  options: Readonly<{
    attributes: readonly ChatProposedCaseAttribute[];
    sourceDatasets: readonly ChatCaseSourceDataset[];
    labelColumnId: string | undefined;
  }>,
): ChatProposedCaseAttribute[] {
  const singleColumnIds = new Set([
    ...options.sourceDatasets.map((sourceDataset) => {
      return sourceDataset.primaryKeyColumnId;
    }),
    ...(options.labelColumnId ? [options.labelColumnId] : []),
  ]);
  return options.attributes.map((attribute) => {
    return singleColumnIds.has(attribute.columnId)
      ? { ...attribute, valueShape: "single" }
      : attribute;
  });
}
```

In `parseProposeCaseType`, replace `attributes,` in the returned object with:

```ts
    attributes: _withKeyAndLabelColumnsSingle({
      attributes,
      sourceDatasets,
      labelColumnId,
    }),
```

- [ ] **Step 5: Parse and coerce created case types**

In `parseCreateCaseTypes.ts`, in `_parseDatasetColumnAttribute`'s returned object, add before the `isLabel` spread:

```ts
    // A label names a case, so it never keeps every value.
    ...(raw.valueShape === "list" && raw.isLabel !== true
      ? { valueShape: "list" as const }
      : {}),
```

Add above `_parseCaseType`:

```ts
/**
 * A join key matches rows to a case, so a dataset column that is one keeps
 * one value whatever the model sent.
 */
function _withoutListJoinKeys(
  attributes: readonly ChatCreatedCaseAttribute[],
  identities: readonly ChatCaseSourceDataset[],
): ChatCreatedCaseAttribute[] {
  const joinKeyColumnIds = new Set(
    identities.map((identity) => {
      return identity.primaryKeyColumnId;
    }),
  );
  return attributes.map((attribute) => {
    if (
      attribute.kind !== "dataset_column" ||
      !joinKeyColumnIds.has(attribute.columnId)
    ) {
      return attribute;
    }
    const { valueShape: _valueShape, ...singleAttribute } = attribute;
    return singleAttribute;
  });
}
```

In `_parseCaseType`'s returned object, replace `attributes,` with `attributes: _withoutListJoinKeys(attributes, identities),`.

- [ ] **Step 6: Give every proposed attribute fixture a shape**

The new required field breaks fixtures typed `ChatProposedCaseType`. In `CaseTypeDraftBlock.test.tsx` and `useCaseTypeDraftEditor.test.ts`, every `valuePickerRuleType:` line is in a draft fixture, so run:

```bash
perl -0pi -e 's/^(\s*)(valuePickerRuleType: "[a-z_]+",\n)/$1valueShape: "single",\n$1$2/mg' src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftBlock.test.tsx src/components/ChatPanel/CaseTypeDraftBlock/useCaseTypeDraftEditor.test.ts
```

In `proposedCaseTypeToCreatedCaseType.test.ts`, add `valueShape: "single",` above each `valuePickerRuleType` inside `makeDraft` only (five attributes). Leave the two `toMatchObject` expectations alone.

- [ ] **Step 7: Run the tests and the type-check**

Run: `pnpm test:frontend parseProposeCaseType parseCreateCaseTypes CaseTypeDraftBlock useCaseTypeDraftEditor proposedCaseTypeToCreatedCaseType`
Expected: PASS.

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add shared/types/chat.types.ts supabase/functions/chat/PostChatMessages/parsing src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftBlock.test.tsx src/components/ChatPanel/CaseTypeDraftBlock/useCaseTypeDraftEditor.test.ts src/views/OntologyDesignerApp/proposedCaseTypeToCreatedCaseType/proposedCaseTypeToCreatedCaseType.test.ts
git commit -m "feat(joined-cases): let chat drafts say a field keeps every value" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Chat proposes list fields

**Files:**
- Modify: `supabase/functions/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.ts`
- Test: `supabase/functions/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.test.ts`
- Modify: `supabase/functions/chat/PostChatMessages/prompt/buildCaseManagerSystemPrompt.ts`
- Test: `supabase/functions/chat/PostChatMessages/prompt/buildCaseManagerSystemPrompt.test.ts`

- [ ] **Step 1: Write the failing tests**

In `makeChatToolConfigFromOptions.test.ts`, add:

```ts
  it("lets proposeCaseType mark a field as keeping every value", () => {
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
                properties: Record<string, { enum?: readonly string[] }>;
                required: readonly string[];
              };
            };
          };
        };
      };
    }>;
    const propose = tools.find((tool) => {
      return tool.function.name === "proposeCaseType";
    });
    const attributeSchema =
      propose?.function.parameters.properties.attributes?.items;

    expect(attributeSchema?.properties.valueShape?.enum).toEqual([
      "single",
      "list",
    ]);
    expect(attributeSchema?.required).toContain("valueShape");
  });
```

In `buildCaseManagerSystemPrompt.test.ts`, add:

```ts
  it("tells the model when a field should keep every value", () => {
    const prompt = buildCaseManagerSystemPrompt({
      datasets: [],
      columns: [],
      concepts: [],
    });

    expect(prompt).toContain("Set `valueShape` to `list` only when");
    expect(prompt).toContain("always for the label column and every join key");
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm test:frontend makeChatToolConfigFromOptions buildCaseManagerSystemPrompt`
Expected: FAIL. The schema has no `valueShape`, and the prompt has no list guidance.

- [ ] **Step 3: Add `valueShape` to both tool schemas**

In `makeChatToolConfigFromOptions.ts`, in the `proposeCaseType` attribute `properties`, add after `isIncluded`:

```ts
                valueShape: {
                  type: "string",
                  enum: ["single", "list"],
                  description:
                    "single keeps one value per case, chosen by valuePickerRuleType. list keeps every value the case has, in dataset order. Use list only when one case genuinely has several values of this column and each one matters, such as symptoms recorded at several visits. Never list the label column or a join key.",
                },
```

Append to the `valuePickerRuleType` description: `" For a list, still give the rule the field would use with one value, so the user can switch it back."`. Add `"valueShape",` to that item's `required` array, after `"isIncluded",`.

In the `createCaseTypes` attribute `properties`, add after `isLabel`:

```ts
                      valueShape: {
                        type: "string",
                        enum: ["single", "list"],
                      },
```

- [ ] **Step 4: Add the prompt guidance**

In `buildCaseManagerSystemPrompt.ts`, in `caseManagerRules`:

- In the goal sentence, replace `every attribute worth mapping with its value picker,` with `every attribute worth mapping with its value picker, or as a list of every value,`.
- After the bullet that begins `- Choose the value picker per column:`, add:

```
- Set \`valueShape\` to \`list\` only when one case can genuinely have several values of the column and a person would want to see each of them, not a summary: symptoms recorded at several visits, every phone number, every test date. Judge this from column names, dataset descriptions, and the case type's grain. Keep \`single\` for anything that is one fact per case (age, county, name), for measures you summarize with a value picker (totals, averages, latest), and always for the label column and every join key. A list keeps every non-empty value in dataset order; still give it the value picker it would use if the user switches it to one value.
```

- [ ] **Step 5: Run the tests**

Run: `pnpm test:frontend makeChatToolConfigFromOptions buildCaseManagerSystemPrompt`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/chat/PostChatMessages/prompt
git commit -m "feat(joined-cases): ask chat to propose list fields where a case has several values" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Chat's list fields reach the insert

**Files:**
- Modify: `src/views/OntologyDesignerApp/proposedCaseTypeToCreatedCaseType/proposedCaseTypeToCreatedCaseType.ts`
- Test: `src/views/OntologyDesignerApp/proposedCaseTypeToCreatedCaseType/proposedCaseTypeToCreatedCaseType.test.ts`
- Modify: `src/views/OntologyDesignerApp/createdCaseTypeToFormValues/createdCaseTypeToFormValues.ts`
- Test: `src/views/OntologyDesignerApp/createdCaseTypeToFormValues/createdCaseTypeToFormValues.test.ts`
- Modify: `src/views/OntologyDesignerApp/insertConceptFromFormValues/insertConceptFromFormValues.ts`
- Test: `src/views/OntologyDesignerApp/insertConceptFromFormValues/insertConceptFromFormValues.test.ts`

- [ ] **Step 1: Write the failing conversion tests**

In `proposedCaseTypeToCreatedCaseType.test.ts`, add:

```ts
  it("carries a field switched to every value without a value rule", () => {
    const draft = makeDraft();
    const created = proposedCaseTypeToCreatedCaseType({
      ...draft,
      attributes: draft.attributes.map((attribute) => {
        return attribute.columnId === POPULATION_COLUMN_ID
          ? { ...attribute, valueShape: "list" }
          : attribute;
      }),
    });
    const population = created.attributes.find((attribute) => {
      return attribute.name === "Population";
    });

    expect(population).toMatchObject({ valueShape: "list" });
    expect(population).not.toHaveProperty("valuePickerRuleType");
  });

  it("keeps the label and every join key to one value", () => {
    const draft = makeDraft();
    const created = proposedCaseTypeToCreatedCaseType({
      ...draft,
      attributes: draft.attributes.map((attribute) => {
        return { ...attribute, valueShape: "list" };
      }),
    });

    expect(
      created.attributes
        .filter((attribute) => {
          return ["State", "County code", "Census county code"].includes(
            attribute.name,
          );
        })
        .map((attribute) => {
          return "valueShape" in attribute ? attribute.valueShape : undefined;
        }),
    ).toEqual(["single", "single", "single"]);
  });
```

In `createdCaseTypeToFormValues.test.ts`, add:

```ts
  it("makes a field marked every value a list typed as its column", () => {
    const formValues = createdCaseTypeToFormValues({
      caseType: {
        ..._covidCase(),
        identities: [
          { datasetId: DATASET_ID, primaryKeyColumnId: PK_COLUMN_ID },
          {
            datasetId: CENSUS_DATASET_ID,
            primaryKeyColumnId: CENSUS_KEY_COLUMN_ID,
          },
        ],
        attributes: [
          {
            name: "Population",
            kind: "dataset_column",
            datasetId: CENSUS_DATASET_ID,
            columnId: POPULATION_COLUMN_ID,
            valueShape: "list",
            valuePickerRuleType: "sum",
          },
        ],
      },
      workspaceId: WORKSPACE_ID,
      columns: COLUMNS,
    });
    const population = formValues.attributes.find((attribute) => {
      return attribute.name === "Population";
    });

    expect(population?.isArray).toBe(true);
    expect(population?.dataType).toBe("bigint");
  });

  it("keeps a join key and the label to one value even when marked every value", () => {
    const formValues = createdCaseTypeToFormValues({
      caseType: _covidCase({
        attributes: [
          {
            name: "Case id",
            kind: "dataset_column",
            datasetId: DATASET_ID,
            columnId: PK_COLUMN_ID,
            valueShape: "list",
          },
          {
            name: "Case status",
            kind: "dataset_column",
            datasetId: DATASET_ID,
            columnId: STATUS_COLUMN_ID,
            isLabel: true,
            valueShape: "list",
          },
        ],
      }),
      workspaceId: WORKSPACE_ID,
      columns: COLUMNS,
    });

    expect(
      formValues.attributes.map((attribute) => {
        return attribute.isArray;
      }),
    ).toEqual([false, false]);
  });
```

In `insertConceptFromFormValues.test.ts`, add the imports `import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";` and `import type { DatasetColumnId } from "$/models/datasets/DatasetColumn/DatasetColumn.types";`, and:

```ts
  it("writes no value rule into the mapping of a field that keeps every value", async () => {
    generateIndividualsMock.mockResolvedValue(undefined);
    const listAttributeId = uuid<ConceptAttributeId>();
    const formValues = _makeFormValues();
    const listAttribute = {
      ...formValues.attributes[0]!,
      id: listAttributeId,
      name: "Daily new cases",
      dataType: "bigint" as const,
      mappingType: "dataset_column" as const,
      isLabel: false,
      isArray: true,
      mappings: {
        manualEntry: {
          type: "manual_entry" as const,
          conceptAttributeId: listAttributeId,
        },
        datasetColumn: {
          type: "dataset_column" as const,
          conceptAttributeId: listAttributeId,
          valuePickerRuleType: "sum" as const,
          datasetId: uuid<DatasetId>(),
          datasetColumnId: uuid<DatasetColumnId>(),
        },
      },
    };

    await insertConceptFromFormValues({
      ...formValues,
      attributes: [...formValues.attributes, listAttribute],
    });

    const [{ mappings }] = conceptCreateMock.mock.calls[0]!;
    const listMapping = mappings.find(
      (mapping: { conceptAttributeId: string }) => {
        return mapping.conceptAttributeId === listAttributeId;
      },
    );
    expect(listMapping).toMatchObject({
      type: "dataset_column",
      workspaceId: WORKSPACE_ID,
    });
    expect(listMapping.valuePickerRuleType).toBeUndefined();
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm test:frontend proposedCaseTypeToCreatedCaseType createdCaseTypeToFormValues insertConceptFromFormValues`
Expected: FAIL. No created attribute carries `valueShape`; the form attribute is `isArray: false`; the list mapping keeps `sum`.

- [ ] **Step 3: Carry the shape from the card**

In `proposedCaseTypeToCreatedCaseType.ts`, add `import { match } from "ts-pattern";`, add `ChatCaseValueShape` to the type import, and replace `_toDatasetColumnAttribute` with:

```ts
function _toDatasetColumnAttribute(options: {
  attribute: ChatProposedCaseAttribute;
  isLabel: boolean;
  isJoinKey: boolean;
}): ChatCreatedCaseAttribute {
  const { attribute, isLabel, isJoinKey } = options;
  // A join key matches rows to a case and the label names it, so neither is
  // ever a list, whatever the card held.
  const valueShape: ChatCaseValueShape =
    isLabel || isJoinKey ? "single" : attribute.valueShape;
  return {
    name: attribute.name,
    kind: "dataset_column",
    datasetId: attribute.datasetId,
    columnId: attribute.columnId,
    valueShape,
    // A list keeps every value, so the rule the card held is not stored.
    ...match(valueShape)
      .with("single", () => {
        return { valuePickerRuleType: attribute.valuePickerRuleType };
      })
      .with("list", () => {
        return {};
      })
      .exhaustive(),
    ...(attribute.description ? { description: attribute.description } : {}),
    ...(isLabel ? { isLabel: true } : {}),
  };
}
```

In `proposedCaseTypeToCreatedCaseType`, add before `datasetAttributes`:

```ts
  const joinKeyColumnIds = new Set(
    sourceDatasets.map((sourceDataset) => {
      return sourceDataset.primaryKeyColumnId;
    }),
  );
```

and pass `isJoinKey: joinKeyColumnIds.has(attribute.columnId),` to `_toDatasetColumnAttribute`. Update the function's docstring sentence "the card's per-column value pickers are carried through" to "each column's value shape and, for one value, its value picker are carried through".

- [ ] **Step 4: Shape the form values**

In `createdCaseTypeToFormValues.ts`, add `import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";` and replace `_makeMappedAttribute` and its options with:

```ts
type MappedAttributeOptions = {
  conceptId: ConceptId;
  name: string;
  description: string | undefined;
  column: CatalogColumn;
  isIdentifier: boolean;
  isLabel: boolean;
  valueShape: ConceptAttribute.ValueShape;
  valuePickerRuleType: ValuePickerRuleType;
};

function _makeMappedAttribute(
  options: MappedAttributeOptions,
): AttributeFormValues {
  const conceptAttributeId = uuid<ConceptAttributeId>();
  // An identifier matches rows to a record and the label names it, so
  // neither is ever a list.
  const valueShape: ConceptAttribute.ValueShape =
    options.isIdentifier || options.isLabel ? "single" : options.valueShape;
  return Model.make("ConceptAttribute", {
    id: conceptAttributeId,
    conceptId: options.conceptId,
    name: ConceptStatus.toNonReservedAttributeName(options.name),
    description: options.description,
    dataType: ConceptAttribute.getOutputDataType({
      valueShape,
      ruleType: options.valuePickerRuleType,
      columnDataType: options.column.dataType,
    }),
    mappingType: "dataset_column",
    isIdentifier: options.isIdentifier,
    isLabel: options.isLabel,
    allowManualEdit: false,
    isArray: ConceptAttribute.valueShapeToIsArray(valueShape),
    mappings: {
      manualEntry: {
        type: "manual_entry",
        conceptAttributeId,
      },
      datasetColumn: {
        type: "dataset_column",
        conceptAttributeId,
        valuePickerRuleType: options.valuePickerRuleType,
        datasetId: options.column.datasetId,
        datasetColumnId: options.column.id,
      },
    },
  } as const);
}
```

This replaces plan 2's `dataType: ValuePickerRule.getOutputDataType(...)`; remove that import if nothing else uses it. In `_makeMissingIdentifierAttributes`, pass `valueShape: "single",`. In `_attributesFromCaseType`, pass `valueShape: attribute.valueShape ?? "single",`.

- [ ] **Step 5: Drop a list's rule at the insert**

In `insertConceptFromFormValues.ts`, add `import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";`, add above `_mappingsFromAttributes`:

```ts
/**
 * The mapping row of one dataset-column field, or undefined when the field
 * has no column yet. A field that keeps every value stores no rule: its
 * draft holds one only so the user can switch it back to one value.
 */
function _datasetColumnMappingFromAttribute(
  attribute: ConceptFormSubmitValues["attributes"][number],
  workspaceId: Workspace.Id,
): AttributeMapping<"Insert"> | undefined {
  const datasetColumnMapping = attribute.mappings.datasetColumn;
  if (!hasPropKeys(datasetColumnMapping, ["datasetId", "datasetColumnId"])) {
    return undefined;
  }
  return match(ConceptAttribute.getValueShape(attribute))
    .with("single", () => {
      return { ...datasetColumnMapping, workspaceId };
    })
    .with("list", () => {
      return {
        ...datasetColumnMapping,
        valuePickerRuleType: undefined,
        workspaceId,
      };
    })
    .exhaustive();
}
```

and replace the `.with("dataset_column", ...)` arm in `_mappingsFromAttributes` with:

```ts
        .with("dataset_column", () => {
          return _datasetColumnMappingFromAttribute(attribute, workspaceId);
        })
```

- [ ] **Step 6: Run the tests and the type-check**

Run: `pnpm test:frontend proposedCaseTypeToCreatedCaseType createdCaseTypeToFormValues insertConceptFromFormValues CaseTypeDraftBlock`
Expected: PASS.

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/views/OntologyDesignerApp/proposedCaseTypeToCreatedCaseType src/views/OntologyDesignerApp/createdCaseTypeToFormValues src/views/OntologyDesignerApp/insertConceptFromFormValues
git commit -m "feat(joined-cases): create chat's list fields with no value rule" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: The draft card switches a field between one value and every value

**Files:**
- Create: `src/components/caseFields/ValueShapeControl/ValueShapeControl.tsx`
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/useCaseTypeDraftEditor.ts`
- Test: `src/components/ChatPanel/CaseTypeDraftBlock/useCaseTypeDraftEditor.test.ts`
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftAttributeRow.tsx`
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftCard.module.css`
- Test: `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftBlock.test.tsx`
- Generate: `src/i18n/locales/*`

- [ ] **Step 1: Write the failing editor tests**

In `useCaseTypeDraftEditor.test.ts`, add:

```ts
  it("switches a field to every value and back, keeping its value picker", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.setAttributeValueShape(POPULATION_COLUMN_ID, "list");
    });
    const listed = result.current.draft.attributes.find((attribute) => {
      return attribute.columnId === POPULATION_COLUMN_ID;
    });
    expect(listed?.valueShape).toBe("list");

    act(() => {
      result.current.setAttributeValueShape(POPULATION_COLUMN_ID, "single");
    });
    const single = result.current.draft.attributes.find((attribute) => {
      return attribute.columnId === POPULATION_COLUMN_ID;
    });
    expect(single).toMatchObject({
      valueShape: "single",
      valuePickerRuleType: "max",
    });
  });

  it("keeps a field to one value once it becomes the label", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.setAttributeValueShape(POPULATION_COLUMN_ID, "list");
    });
    act(() => {
      result.current.setLabelColumnId(POPULATION_COLUMN_ID);
    });

    expect(
      result.current.draft.attributes.find((attribute) => {
        return attribute.columnId === POPULATION_COLUMN_ID;
      })?.valueShape,
    ).toBe("single");
  });

  it("keeps a field to one value once it becomes a join key", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.setAttributeValueShape(POPULATION_COLUMN_ID, "list");
    });
    act(() => {
      result.current.setPrimaryKeyColumnId(
        CENSUS_DATASET_ID,
        POPULATION_COLUMN_ID,
      );
    });

    expect(
      result.current.draft.attributes.find((attribute) => {
        return attribute.columnId === POPULATION_COLUMN_ID;
      })?.valueShape,
    ).toBe("single");
  });

  it("refuses to make the label keep every value", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.setAttributeValueShape(STATE_COLUMN_ID, "list");
    });

    expect(
      result.current.draft.attributes.find((attribute) => {
        return attribute.columnId === STATE_COLUMN_ID;
      })?.valueShape,
    ).toBe("single");
  });
```

- [ ] **Step 2: Write the failing card tests**

In `CaseTypeDraftBlock.test.tsx`, add `within` to the `@/test-utils` import, this helper below `makeDraft`:

```ts
function _getValueShapeControl(fieldName: string): HTMLElement {
  return screen.getByRole("radiogroup", {
    name: `One value or every value for ${fieldName}`,
  });
}
```

and these tests:

```tsx
  it("persists a field switched to every value as a list without a value rule", async () => {
    render(<CaseTypeDraftBlock />);

    fireEvent.click(
      within(_getValueShapeControl("Population")).getByRole("radio", {
        name: "Every value",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Create case type" }));

    await waitFor(() => {
      expect(applyCreatedCaseTypesMock).toHaveBeenCalled();
    });
    const [call] = applyCreatedCaseTypesMock.mock.calls;
    const population = call?.[0].caseTypes[0].attributes.find(
      (attribute: { name: string }) => {
        return attribute.name === "Population";
      },
    );
    expect(population).toMatchObject({ valueShape: "list" });
    expect(population).not.toHaveProperty("valuePickerRuleType");
  });

  it("hides the value picker of a field that keeps every value", () => {
    render(<CaseTypeDraftBlock />);
    expect(
      screen.queryAllByLabelText("Value to keep for Population"),
    ).not.toHaveLength(0);

    fireEvent.click(
      within(_getValueShapeControl("Population")).getByRole("radio", {
        name: "Every value",
      }),
    );

    expect(
      screen.queryAllByLabelText("Value to keep for Population"),
    ).toHaveLength(0);
  });

  it("locks the label and each join key to one value", () => {
    render(<CaseTypeDraftBlock />);

    for (const fieldName of ["State", "County code", "Census county code"]) {
      expect(
        within(_getValueShapeControl(fieldName)).getByRole("radio", {
          name: "Every value",
        }),
      ).toBeDisabled();
    }
  });
```

- [ ] **Step 3: Run them to see them fail**

Run: `pnpm test:frontend useCaseTypeDraftEditor CaseTypeDraftBlock`
Expected: FAIL. `setAttributeValueShape` is not a function, and no radiogroup named `One value or every value for Population` exists.

- [ ] **Step 4: Write the shared control**

Create `src/components/caseFields/ValueShapeControl/ValueShapeControl.tsx`:

```tsx
import { objectKeys } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { SegmentedControl } from "@mantine/core";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { ReactNode } from "react";

type Props = {
  /** The field's name, which names the control for assistive technology. */
  fieldName: string;
  value: ConceptAttribute.ValueShape;
  onChange: (valueShape: ConceptAttribute.ValueShape) => void;
  /** Locks the choice, for example on a join key, which keeps one value. */
  disabled?: boolean;
};

/**
 * Chooses whether a case type field keeps one value per record or every
 * value. Use it wherever a field is designed, for example the chat draft
 * card or the case type form.
 */
export function ValueShapeControl({
  fieldName,
  value,
  onChange,
  disabled = false,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const labelsByValueShape: Record<ConceptAttribute.ValueShape, string> = {
    single: t`One value`,
    list: t`Every value`,
  };
  return (
    <SegmentedControl
      size="xs"
      aria-label={t`One value or every value for ${fieldName}`}
      data={objectKeys(labelsByValueShape).map((valueShape) => {
        return { value: valueShape, label: labelsByValueShape[valueShape] };
      })}
      value={value}
      disabled={disabled}
      onChange={(nextValue) => {
        onChange(nextValue as ConceptAttribute.ValueShape);
      }}
    />
  );
}
```

- [ ] **Step 5: Let the editor switch shapes**

In `useCaseTypeDraftEditor.ts`, add `ChatCaseValueShape` to the `$/types/chat.types` type import, add to `CaseTypeDraftEditor`:

```ts
  setAttributeValueShape: (
    columnId: string,
    valueShape: ChatCaseValueShape,
  ) => void;
```

replace `_withIncludedColumn` with:

```ts
/**
 * Forces a column into the mapped set as one value. A join key is what
 * matches its dataset's rows to a case, and the label names the case, so
 * neither can point at an excluded column or at one that keeps every value.
 */
function _withKeyOrLabelColumn(
  draft: ChatProposedCaseType,
  columnId: string,
): ChatProposedCaseType {
  return _mapAttribute(draft, columnId, (attribute) => {
    return { ...attribute, isIncluded: true, valueShape: "single" };
  });
}

/** Whether a column is the draft's label or one of its join keys. */
function _isKeyOrLabelColumn(
  draft: ChatProposedCaseType,
  columnId: string,
): boolean {
  return (
    draft.labelColumnId === columnId ||
    draft.sourceDatasets.some((sourceDataset) => {
      return sourceDataset.primaryKeyColumnId === columnId;
    })
  );
}
```

use `_withKeyOrLabelColumn` in `setPrimaryKeyColumnId` and `setLabelColumnId` where `_withIncludedColumn` was, and add to the returned editor after `setAttributeValuePicker`:

```ts
    setAttributeValueShape: (columnId, valueShape) => {
      setDraft((current) => {
        // The card locks these columns; this keeps the draft right even if a
        // caller does not.
        if (valueShape !== "single" && _isKeyOrLabelColumn(current, columnId)) {
          return current;
        }
        return _mapAttribute(current, columnId, (attribute) => {
          return { ...attribute, valueShape };
        });
      });
    },
```

- [ ] **Step 6: Put the switch in the row**

Replace the body of `CaseTypeDraftAttributeRow` from `return (` to the end with the version below (imports: add `import { match } from "ts-pattern";` and `import { ValueShapeControl } from "@/components/caseFields/ValueShapeControl/ValueShapeControl";`, keep the rest). Update the docstring to "One attribute in the draft card: whether to map it, what to call it, whether it keeps one value or every value, and for one value, which to keep."

```tsx
  return (
    <div
      className={clsx(css.attributeRow, {
        [css.attributeRowExcluded!]: !attribute.isIncluded,
      })}
    >
      <Checkbox
        className={css.includeCheckbox}
        checked={attribute.isIncluded}
        // A join key matches its dataset's rows to a case, so it stays mapped.
        disabled={isPrimaryKey}
        aria-label={t`Include ${attribute.name}`}
        onChange={() => {
          editor.toggleAttribute(attribute.columnId);
        }}
      />
      <div>
        <TextInput
          size="xs"
          value={attribute.name}
          aria-label={t`Name for ${columnLabel}`}
          error={
            attribute.isIncluded &&
            ConceptStatus.isReservedAttributeName(attribute.name)
              ? t`Every case type already has a status. Choose another name.`
              : undefined
          }
          onChange={(event) => {
            editor.setAttributeName(
              attribute.columnId,
              event.currentTarget.value,
            );
          }}
        />
        <Group gap={4} mt={2}>
          <Text size="xs" c="dimmed" className={css.columnHint}>
            {columnLabel}
          </Text>
          {isPrimaryKey ? (
            <Text size="xs" c="blue.7">
              {t`join key`}
            </Text>
          ) : null}
          {isLabelColumn ? (
            <Text size="xs" c="blue.7">
              {t`label`}
            </Text>
          ) : null}
        </Group>
        <div className={css.valueControls}>
          <ValueShapeControl
            fieldName={attribute.name}
            value={attribute.valueShape}
            // A join key matches rows to a case and the label names it, so
            // both keep one value.
            disabled={isPrimaryKey || isLabelColumn}
            onChange={(valueShape) => {
              editor.setAttributeValueShape(attribute.columnId, valueShape);
            }}
          />
          {match(attribute.valueShape)
            .with("single", () => {
              return (
                <Select
                  className={css.ruleSelect}
                  size="xs"
                  data={valuePickerOptions}
                  value={attribute.valuePickerRuleType}
                  allowDeselect={false}
                  aria-label={t`Value to keep for ${attribute.name}`}
                  onChange={(value) => {
                    if (value) {
                      editor.setAttributeValuePicker(
                        attribute.columnId,
                        value as ChatCaseValuePickerRuleType,
                      );
                    }
                  }}
                />
              );
            })
            .with("list", () => {
              return null;
            })
            .exhaustive()}
        </div>
      </div>
    </div>
  );
```

If plan 2 changed the `Select`'s `data` (rule options per column type), keep its expression.

In `CaseTypeDraftCard.module.css`, replace `.attributeRow` with the rules below and add the three new classes after `.attributeRowExcluded`:

```css
.attributeRow {
  align-items: start;
  display: grid;
  gap: var(--mantine-spacing-xs);
  grid-template-columns: auto minmax(0, 1fr);
}

/* Lines the checkbox up with the name input beside it */
.includeCheckbox {
  margin-top: 5px;
}

.valueControls {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--mantine-spacing-xs);
  margin-top: var(--mantine-spacing-xs);
}

.ruleSelect {
  width: 8.5rem;
}
```

- [ ] **Step 7: Run the tests**

Run: `pnpm test:frontend useCaseTypeDraftEditor CaseTypeDraftBlock`
Expected: PASS.

- [ ] **Step 8: Extract and compile the catalogs**

Run: `pnpm i18n:extract && pnpm i18n:compile`
Expected: `src/i18n/locales/en/messages.po` gains `One value`, `Every value`, and `One value or every value for {fieldName}`, each with a `#: src/components/caseFields/ValueShapeControl/ValueShapeControl.tsx` reference.

- [ ] **Step 9: Commit**

```bash
git add src/components/caseFields src/components/ChatPanel/CaseTypeDraftBlock src/i18n/locales
git commit -m "feat(joined-cases): switch a draft field between one value and every value" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: The case type form uses the same switch

**Files:**
- Create: `src/views/OntologyDesignerApp/ConceptCreatorView/keepKeyAndLabelFieldsSingle/keepKeyAndLabelFieldsSingle.ts`
- Test: `src/views/OntologyDesignerApp/ConceptCreatorView/keepKeyAndLabelFieldsSingle/keepKeyAndLabelFieldsSingle.test.ts`
- Modify: `src/views/OntologyDesignerApp/ConceptCreatorView/index.tsx`
- Modify: `src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator.tsx`
- Generate: `src/i18n/locales/*`

- [ ] **Step 1: Write the failing test**

Create `keepKeyAndLabelFieldsSingle/keepKeyAndLabelFieldsSingle.test.ts`:

```ts
/**
 * The form lets any dataset field keep every value, but a key matches rows
 * to a record and the label names it, so the submit keeps those to one.
 */
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { makeDefaultDatasetColumnAttribute } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import { keepKeyAndLabelFieldsSingle } from "@/views/OntologyDesignerApp/ConceptCreatorView/keepKeyAndLabelFieldsSingle/keepKeyAndLabelFieldsSingle";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumnRead } from "$/models/datasets/DatasetColumn/DatasetColumn.types";
import type { ConceptId } from "$/models/ontology/Concept/Concept.types";

const CONCEPT_ID = uuid<ConceptId>();
const DATASET = { id: uuid<Dataset.Id>() } as Dataset.T;

function _listField(options: { name: string; isIdentifier?: boolean }) {
  return {
    ...makeDefaultDatasetColumnAttribute({
      conceptId: CONCEPT_ID,
      name: options.name,
      dataset: DATASET,
      datasetColumn: {
        id: uuid(),
        name: options.name,
        dataType: "varchar",
      } as DatasetColumnRead,
      isIdentifier: options.isIdentifier,
    }),
    isArray: true,
  };
}

describe("keepKeyAndLabelFieldsSingle", () => {
  it("keeps an identifier and the label to one value", () => {
    const key = _listField({ name: "County", isIdentifier: true });
    const label = _listField({ name: "Name" });

    const fields = keepKeyAndLabelFieldsSingle({
      attributes: [key, label],
      labelAttributeId: label.id,
    });

    expect(
      fields.map((field) => {
        return field.isArray;
      }),
    ).toEqual([false, false]);
  });

  it("leaves any other field keeping every value", () => {
    const symptoms = _listField({ name: "Symptoms" });

    const fields = keepKeyAndLabelFieldsSingle({
      attributes: [symptoms],
      labelAttributeId: undefined,
    });

    expect(fields[0]?.isArray).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm test:frontend keepKeyAndLabelFieldsSingle`
Expected: FAIL. Vitest cannot resolve the module.

- [ ] **Step 3: Write the helper**

Create `keepKeyAndLabelFieldsSingle/keepKeyAndLabelFieldsSingle.ts`:

```ts
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { AttributeFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";

/**
 * The form's fields with every identifier and the label set to keep one
 * value. An identifier matches rows to a record and the label names it, so
 * neither can be a list, and `rpc_concepts__create` refuses one that is.
 * Called by the concept creator's submit transform.
 */
export function keepKeyAndLabelFieldsSingle(
  options: Readonly<{
    attributes: readonly AttributeFormValues[];
    labelAttributeId: ConceptAttribute.Id | undefined;
  }>,
): AttributeFormValues[] {
  return options.attributes.map((attribute) => {
    return attribute.isIdentifier || attribute.id === options.labelAttributeId
      ? { ...attribute, isArray: false }
      : attribute;
  });
}
```

- [ ] **Step 4: Use it, and derive the data type from the shape, at submit**

In `ConceptCreatorView/index.tsx`'s `transformValues`, wrap the finished `allAttributes` chain (after the step that sets `isLabel` on the label) with `keepKeyAndLabelFieldsSingle({ attributes: ..., labelAttributeId: values.labelAttributeId })`, and import it.

Plan 2 derives each dataset field's `dataType` from its rule with `ValuePickerRule.getOutputDataType({ ruleType, columnDataType })` (find it with `rg -n "getOutputDataType" src/views/OntologyDesignerApp/ConceptCreatorView`). Make it run after `keepKeyAndLabelFieldsSingle`, and replace the call with

```ts
ConceptAttribute.getOutputDataType({
  valueShape: ConceptAttribute.getValueShape(attribute),
  ruleType,
  columnDataType,
})
```

passing the same `ruleType` and `columnDataType` plan 2 passes, and importing `ConceptAttribute` as a value from `$/models/ontology/ConceptAttribute/ConceptAttribute`.

- [ ] **Step 5: Replace the form's checkbox with the switch**

In `DatasetColumnMappingCreator.tsx`:

- Add `import { match } from "ts-pattern";`, `import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";`, and `import { ValueShapeControl } from "@/components/caseFields/ValueShapeControl/ValueShapeControl";`. Remove `Checkbox` and `Tooltip` from the Mantine import only if nothing else uses them (the `Allow manual edit` checkbox still does).
- Replace the `isArray` and `onlyAllowOneValue` constants with:

```ts
  const valueShape = ConceptAttribute.getValueShape({
    isArray:
      conceptForm.getValues().datasetColumnAttributes[attributeIdx]?.isArray ??
      false,
  });
```

- Replace the `Tooltip` holding the "Only allow one value" checkbox, and the `{onlyAllowOneValue && (...)}` block after it, with:

```tsx
        <ValueShapeControl
          key={attributeKeys.isArray}
          fieldName={attributeName}
          value={valueShape}
          onChange={(nextValueShape) => {
            conceptForm.setFieldValue(
              `datasetColumnAttributes.${attributeIdx}.isArray`,
              ConceptAttribute.valueShapeToIsArray(nextValueShape),
            );
          }}
        />

        {match(valueShape)
          .with("single", () => {
            return (
              <Select
                key={mappingKeys.valuePickerRuleType}
                data={valuePickerOptions}
                label={t`If there are multiple ${attributeName} values for one ${state.singularConceptName}, then...`}
                placeholder={t`Select rule (e.g. most frequent)`}
                {...mappingInputProps.valuePickerRuleType()}
              />
            );
          })
          .with("list", () => {
            return null;
          })
          .exhaustive()}
```

- [ ] **Step 6: Run the tests, the type-check, and the catalogs**

Run: `pnpm test:frontend keepKeyAndLabelFieldsSingle conceptFormTypes`
Expected: PASS.

Run: `pnpm type-check`
Expected: PASS.

Run: `pnpm i18n:extract && pnpm i18n:compile`
Expected: `Only allow one value` and its tooltip message leave `messages.po` (obsolete), and nothing else changes.

- [ ] **Step 7: Commit**

```bash
git add src/views/OntologyDesignerApp/ConceptCreatorView src/i18n/locales
git commit -m "feat(joined-cases): use the one value or every value switch in the case type form" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: The record page lists every value

**Files:**
- Create: `src/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldValue.tsx`
- Create: `src/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldValueList.tsx`
- Create: `src/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldValue.module.css`
- Test: `src/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldValue.test.tsx`
- Modify: `src/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail.tsx`
- Test: `src/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail.test.tsx`
- Modify: `src/views/IndividualManagerApp/SingleIndividualView/useRecordFields/makeCaseDetailsRowsFromAttributes/makeCaseDetailsRowsFromAttributes.ts`
- Test: `src/views/IndividualManagerApp/SingleIndividualView/useRecordFields/makeCaseDetailsRowsFromAttributes/makeCaseDetailsRowsFromAttributes.test.ts`
- Modify: `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeAttributesList.tsx`
- Generate: `src/i18n/locales/*`

Plan 1 Tasks 10 to 12 left the rail rendering each `CaseDetailsRow` (`id`, `name`, `value`, `sourceNames`) with a dimmed "No value" for a NULL or missing value and `unknownToString` otherwise, the rows built by `makeCaseDetailsRowsFromAttributes` inside `useRecordFields`. This task gives each row its field's shape and moves the value rendering into `RecordFieldValue`, which keeps plan 1's "No value" and adds the list.

- [ ] **Step 1: Write the failing tests**

Create `RecordFieldValue/RecordFieldValue.test.tsx`:

```tsx
/**
 * A field that keeps every value shows each one on the record page, and a
 * long list starts collapsed so it does not push the other facts away.
 */
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@/test-utils";
import { RecordFieldValue } from "@/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldValue";

const DAILY_CASES = [31, 48, 12, 9, 40, 22, 17];

function _getListItems(fieldName: string): string[] {
  return within(screen.getByRole("list", { name: fieldName }))
    .getAllByRole("listitem")
    .map((item) => {
      return item.textContent ?? "";
    });
}

describe("RecordFieldValue", () => {
  it("shows a single value as text", () => {
    render(
      <RecordFieldValue fieldName="County" valueShape="single" value="Alameda" />,
    );

    expect(screen.getByText("Alameda")).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("lists each value of a field that keeps every value, in order", () => {
    render(
      <RecordFieldValue
        fieldName="Daily new cases"
        valueShape="list"
        value={[31, 48]}
      />,
    );

    expect(_getListItems("Daily new cases")).toEqual(["31", "48"]);
  });

  it("shows the first five values of a long list until asked for all", () => {
    render(
      <RecordFieldValue
        fieldName="Daily new cases"
        valueShape="list"
        value={DAILY_CASES}
      />,
    );
    expect(_getListItems("Daily new cases")).toEqual([
      "31",
      "48",
      "12",
      "9",
      "40",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Show all 7 values" }));
    expect(_getListItems("Daily new cases")).toHaveLength(7);

    fireEvent.click(screen.getByRole("button", { name: "Show fewer" }));
    expect(_getListItems("Daily new cases")).toHaveLength(5);
  });

  it("says a list field with no values has no value", () => {
    render(
      <RecordFieldValue fieldName="Symptoms" valueShape="list" value={[]} />,
    );

    expect(screen.getByText("No value")).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
```

In `CaseDetailsRail.test.tsx`, add `valueShape: "single",` to every row plan 1's tests pass, and add:

```tsx
  it("lists every value of a field that keeps every value", () => {
    render(
      <CaseDetailsRail
        attributes={[
          {
            id: uuid<ConceptAttribute.Id>(),
            name: "Daily new cases",
            valueShape: "list",
            value: [31, 48],
            sourceNames: ["County cases"],
          },
        ]}
      />,
    );

    expect(
      screen.getAllByRole("listitem").map((item) => {
        return item.textContent;
      }),
    ).toEqual(["31", "48"]);
  });
```

In `makeCaseDetailsRowsFromAttributes.test.ts`, give plan 1's `_makeAttribute` an `isArray?: boolean` option (passed as `isArray: options.isArray ?? false`), and add:

```ts
  it("gives each row its field's value shape", () => {
    const county = _makeAttribute({ name: "county" });
    const dailyCases = _makeAttribute({ name: "daily cases", isArray: true });

    const rows = makeCaseDetailsRowsFromAttributes({
      attributes: [county, dailyCases],
      valuesByAttributeId: {
        [county.id]: "Alameda",
        [dailyCases.id]: [31, 48],
      },
      mappings: [],
      datasets: [],
    });

    expect(
      rows.map((row) => {
        return [row.name, row.valueShape];
      }),
    ).toEqual([
      ["county", "single"],
      ["daily cases", "list"],
    ]);
  });
```

If plan 1's `makeCaseDetailsRowsFromAttributes` options differ from these four, match the existing tests' call.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm test:frontend RecordFieldValue CaseDetailsRail makeCaseDetailsRowsFromAttributes`
Expected: FAIL. Vitest cannot resolve `RecordFieldValue`; the rail renders `[31, 48]` as one line (`31;48`); rows have no `valueShape`.

- [ ] **Step 3: Write the list**

Create `RecordFieldValue/RecordFieldValue.module.css`:

```css
.valueList {
  display: flex;
  flex-direction: column;
  gap: 2px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.toggle {
  margin-top: 2px;
  padding-inline: 0;
}
```

Create `RecordFieldValue/RecordFieldValueList.tsx`:

```tsx
import { unknownToString } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { useId, useState } from "react";
import css from "@/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldValue.module.css";
import type { ReactNode } from "react";

/** How many values of a list show before the rest are tucked away. */
const COLLAPSED_VALUE_COUNT = 5;

type Props = {
  /** The field's name, which names the list for assistive technology. */
  fieldName: string;
  /** At least one value; `RecordFieldValue` handles an empty list. */
  values: readonly unknown[];
};

/**
 * Every value of a list field on the record page, one per line. A list
 * longer than five starts collapsed behind a toggle, because the rail is a
 * narrow reference column and a long list would push the record's other
 * facts out of view. Rendered by `RecordFieldValue`.
 */
export function RecordFieldValueList({
  fieldName,
  values,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const listId = useId();
  const [isExpanded, setIsExpanded] = useState(false);
  const isCollapsible = values.length > COLLAPSED_VALUE_COUNT;
  const shownValues =
    isCollapsible && !isExpanded
      ? values.slice(0, COLLAPSED_VALUE_COUNT)
      : values;
  return (
    <>
      <ul id={listId} aria-label={fieldName} className={css.valueList}>
        {shownValues.map((value, index) => {
          // Values repeat (the same symptom at two visits), and the list
          // only grows or shrinks at its end, so the position is the key.
          return <li key={index}>{unknownToString(value)}</li>;
        })}
      </ul>
      {isCollapsible ? (
        <Button
          className={css.toggle}
          variant="subtle"
          color="neutral"
          size="compact-xs"
          aria-expanded={isExpanded}
          aria-controls={listId}
          onClick={() => {
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? t`Show fewer` : t`Show all ${values.length} values`}
        </Button>
      ) : null}
    </>
  );
}
```

- [ ] **Step 4: Write the field value**

Create `RecordFieldValue/RecordFieldValue.tsx`:

```tsx
import { isNullish, unknownToString } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { match } from "ts-pattern";
import { RecordFieldValueList } from "@/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldValueList";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { ReactNode } from "react";

type Props = {
  fieldName: string;
  valueShape: ConceptAttribute.ValueShape;
  value: unknown;
};

/**
 * One field's value on the record page, shaped by the field: one value as
 * text, every value of a list field as a list, and a dimmed "No value" when
 * there is none (a NULL, a record missing from the view, or an empty list).
 * Rendered by the record page's details rail.
 */
export function RecordFieldValue({
  fieldName,
  valueShape,
  value,
}: Readonly<Props>): ReactNode {
  if (isNullish(value) || (Array.isArray(value) && value.length === 0)) {
    return (
      <Text span c="dimmed">
        <Trans>No value</Trans>
      </Text>
    );
  }
  return match(valueShape)
    .with("single", () => {
      return unknownToString(value);
    })
    .with("list", () => {
      return (
        <RecordFieldValueList
          fieldName={fieldName}
          values={Array.isArray(value) ? value : [value]}
        />
      );
    })
    .exhaustive();
}
```

- [ ] **Step 5: Give each row its shape, and render it in the rail**

In `CaseDetailsRail.tsx`, add to `CaseDetailsRow`, after `value`:

```ts
  /** Whether the field keeps one value or every value. */
  valueShape: ConceptAttribute.ValueShape;
```

import `RecordFieldValue`, and in `CaseDetailsRail` replace plan 1's

```tsx
                {isNullish(attribute.value) ? (
                  <Text span c="dimmed">
                    <Trans>No value</Trans>
                  </Text>
                ) : (
                  unknownToString(attribute.value)
                )}
```

with

```tsx
                <RecordFieldValue
                  fieldName={attribute.name}
                  valueShape={attribute.valueShape}
                  value={attribute.value}
                />
```

Remove `isNullish` and `unknownToString` from the `@avandar/utils` import if nothing else in the file uses them.

In `makeCaseDetailsRowsFromAttributes.ts`, add `import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";` (a value import; change the type import if there is one) and add to each returned row, after `value`:

```ts
        valueShape: ConceptAttribute.getValueShape(attribute),
```

- [ ] **Step 6: Mark list fields on the case type page**

In `CaseTypeAttributesList.tsx`, add `import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";` and `import { match } from "ts-pattern";`, and in `AttributeChips`, after the `isLabel` badge, add:

```tsx
      {match(ConceptAttribute.getValueShape(attribute))
        .with("single", () => {
          return null;
        })
        .with("list", () => {
          return (
            <Badge variant="light" color="neutral" size="sm">
              <Trans>Every value</Trans>
            </Badge>
          );
        })
        .exhaustive()}
```

- [ ] **Step 7: Run the tests and the type-check**

Run: `pnpm test:frontend RecordFieldValue CaseDetailsRail makeCaseDetailsRowsFromAttributes useRecordFields SingleIndividualView`
Expected: PASS.

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 8: Extract and compile the catalogs**

Run: `pnpm i18n:extract && pnpm i18n:compile`
Expected: `Show fewer` and `Show all {0} values` appear with references to `RecordFieldValueList.tsx`; `No value` gains a reference to `RecordFieldValue.tsx` (and loses `CaseDetailsRail.tsx`); `Every value` gains a reference to `CaseTypeAttributesList.tsx`.

- [ ] **Step 9: Commit**

```bash
git add src/views/IndividualManagerApp/SingleIndividualView src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeAttributesList.tsx src/i18n/locales
git commit -m "feat(joined-cases): list every value of a list field on the record page" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Chat's SQL context marks list fields

**Files:**
- Modify: `shared/models/chat/SqlTableAlias/SqlTableAlias.types.ts`
- Modify: `shared/models/chat/SqlTableAlias/SqlTableAliasModule.ts`
- Test: `shared/models/chat/SqlTableAlias/SqlTableAlias.test.ts`
- Modify: `supabase/functions/chat/PostChatMessages/schema/fetchWorkspaceSchema.ts`
- Test: `supabase/functions/chat/PostChatMessages/schema/fetchWorkspaceSchema.test.ts`
- Modify: `supabase/functions/chat/utils/buildSqlSystemPrompt/buildSqlSystemPrompt.ts`
- Test: `supabase/functions/chat/utils/buildSqlSystemPrompt/buildSqlSystemPrompt.test.ts`
- Modify: `shared/types/offlineChat.types.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/fetchOfflineChatSchema.ts`
- Test: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/fetchOfflineChatSchema.test.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/buildOfflinePrompts/buildOfflinePrompts.ts`
- Test: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/buildOfflinePrompts/buildOfflinePrompts.test.ts`

- [ ] **Step 1: Write the failing tests**

In `SqlTableAlias.test.ts`, add to `describe("SqlTableAlias.formatSchemaBlock", ...)`:

```ts
  it("marks a field that keeps every value as a list", () => {
    const aliases = SqlTableAlias.fromConcepts([
      { id: CONCEPT_B.id, name: "Measles case" },
    ]);
    const block = SqlTableAlias.formatSchemaBlock({
      aliases,
      columns: [],
      conceptAttributes: [
        { concept_id: CONCEPT_B.id, name: "age" },
        { concept_id: CONCEPT_B.id, name: "Symptoms", is_array: true },
      ],
    });

    expect(block).toBe("- c0: Measles case (age, Symptoms (list))");
  });
```

and a new block:

```ts
describe("SqlTableAlias.formatListFieldNote", () => {
  it("explains list SQL only when a field is a list", () => {
    expect(
      SqlTableAlias.formatListFieldNote([
        { concept_id: CONCEPT_B.id, name: "Symptoms", is_array: true },
      ]),
    ).toContain('list_contains("field", \'value\')');
    expect(
      SqlTableAlias.formatListFieldNote([
        { concept_id: CONCEPT_B.id, name: "age" },
      ]),
    ).toBe("");
  });
});
```

In `fetchWorkspaceSchema.test.ts`, make `createFakeClient` record what each table selects: add `selectedColumnsByTable: Record<string, string>` to its return type, create `const selectedColumnsByTable: Record<string, string> = {};` beside `queriedTables`, return it, and change the chain's `select` to:

```ts
          select: (columns: string) => {
            selectedColumnsByTable[table] = columns;
            return chain;
          },
```

Then add:

```ts
  it("asks for each field's list flag along with its name", async () => {
    const fake = createFakeClient({
      datasets: [],
      dataset_columns: [],
      concepts: [{ id: CONCEPT_ID, name: "Case" }],
      concept_attributes: [
        { concept_id: CONCEPT_ID, name: "Symptoms", is_array: true },
      ],
      concept_statuses: [],
    });

    const schema = await fetchWorkspaceSchema({
      supabaseClient: fake.supabaseClient,
      workspaceId: WORKSPACE_ID,
    });

    expect(fake.selectedColumnsByTable.concept_attributes).toBe(
      "concept_id, name, is_array",
    );
    expect(schema.conceptAttributes).toEqual([
      { concept_id: CONCEPT_ID, name: "Symptoms", is_array: true },
    ]);
  });
```

In `buildSqlSystemPrompt.test.ts`, add:

```ts
  it("marks a list field and explains list SQL", () => {
    const conceptId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const prompt = buildSqlSystemPrompt({
      prompt: "which cases had a rash",
      datasets: [],
      columns: [],
      concepts: [{ id: conceptId, name: "Measles case" }],
      conceptAttributes: [
        { concept_id: conceptId, name: "Symptoms", is_array: true },
      ],
    });

    expect(prompt).toContain("- c0: Measles case (Symptoms (list))");
    expect(prompt).toContain("UNNEST(\"field\")");
  });
```

In `fetchOfflineChatSchema.test.ts`, add:

```ts
  it("carries whether each field keeps every value into the offline schema", async () => {
    conceptAttributeGetAllMock.mockResolvedValue([
      { conceptId: CONCEPT_ID, name: "Symptoms", isArray: true },
    ]);

    const schema = await fetchOfflineChatSchema({
      workspace: { id: WORKSPACE_ID } as Workspace.T,
      navigatorOnLine: true,
    });

    expect(schema.conceptAttributes).toEqual([
      { concept_id: CONCEPT_ID, name: "Symptoms", is_array: true },
    ]);
  });
```

In `buildOfflinePrompts.test.ts`, add to `describe("buildOfflineSqlPrompt", ...)`:

```ts
  it("marks a list field and explains list SQL offline", () => {
    const prompt = buildOfflineSqlPrompt({
      schema: {
        ...SCHEMA,
        concepts: [{ id: CONCEPT_ID, name: "Case" }],
        conceptAttributes: [
          { concept_id: CONCEPT_ID, name: "Symptoms", is_array: true },
        ],
      },
      pageContext: ChatPageContext.createDataExplorerViewContext(),
      analysisSummary: "Find cases with a rash",
      lastUserPrompt: "which cases had a rash",
    });

    expect(prompt).toContain("- c0: Case (Symptoms (list))");
    expect(prompt).toContain("list_contains");
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm test:frontend SqlTableAlias fetchWorkspaceSchema buildSqlSystemPrompt fetchOfflineChatSchema buildOfflinePrompts`
Expected: FAIL. No `(list)` marker, `formatListFieldNote` is not a function, the select is `concept_id, name`, and the offline schema has no `is_array`.

- [ ] **Step 3: Mark list fields in the schema block**

In `SqlTableAlias.types.ts`, replace `SqlTableAliasConceptAttribute` with:

```ts
/** Attribute name listed next to a concept alias in the schema block. */
export type SqlTableAliasConceptAttribute = {
  concept_id: string;
  name: string;
  /**
   * True for a field that keeps every value, which SQL reads as a list.
   * Optional, so a schema cached before fields could be lists still reads.
   */
  is_array?: boolean;
};
```

In `SqlTableAliasModule.ts`, add above `_formatSchemaBlock`:

```ts
/** How a concept field appears in the schema block; a list says so. */
function _formatConceptAttributeName(
  attribute: SqlTableAliasConceptAttribute,
): string {
  return attribute.is_array === true
    ? `${attribute.name} (list)`
    : attribute.name;
}

const LIST_FIELD_NOTE = `- A field marked (list) holds every value one record has, as a DuckDB list, and is [] when it has none. Filter with list_contains("field", 'value'), count values with len("field"), and use UNNEST("field") for one row per value. Never compare a list with =, IN, or LIKE.`;

function _formatListFieldNote(
  conceptAttributes: readonly SqlTableAliasConceptAttribute[],
): string {
  return conceptAttributes.some((attribute) => {
    return attribute.is_array === true;
  })
    ? LIST_FIELD_NOTE
    : "";
}
```

In `_formatSchemaBlock`, replace the `namesByConceptId` declaration with:

```ts
  const namesByConceptId = makeBucketMap(
    (args.conceptAttributes ?? []).map((attribute) => {
      return {
        concept_id: attribute.concept_id,
        name: _formatConceptAttributeName(attribute),
      };
    }),
    { key: "concept_id", valueKey: "name" },
  );
```

Add to `SqlTableAliasModule`:

```ts
  /**
   * The prompt note that explains list SQL, or an empty string when no
   * field is a list, so a prompt only pays for it when it applies.
   */
  formatListFieldNote: _formatListFieldNote,
```

- [ ] **Step 4: Read the flag online and add the note**

In `fetchWorkspaceSchema.ts`, add `is_array: boolean;` to the `ConceptAttribute` type and change the `concept_attributes` select to `.select("concept_id, name, is_array")`.

In `buildSqlSystemPrompt.ts`, change the local type to `type ConceptAttribute = { concept_id: string; name: string; is_array?: boolean };`, add after the `schemaBlock` declaration

```ts
  const listFieldNote = SqlTableAlias.formatListFieldNote(conceptAttributes);
```

and in the template, replace the Notes bullet

```
- The query will run in DuckDB and should only use DuckDB functions supported
  by DuckDB.
```

with

```
- The query will run in DuckDB and should only use DuckDB functions supported
  by DuckDB.
${listFieldNote ? `${listFieldNote}\n` : ""}
```

- [ ] **Step 5: Carry the flag offline and add the note**

In `shared/types/offlineChat.types.ts`, add to `OfflineChatSchemaConceptAttribute`:

```ts
  /** True for a field that keeps every value. Absent in an older cache. */
  is_array?: boolean;
```

In `fetchOfflineChatSchema.ts`'s `_mapConcepts`, return each attribute as

```ts
      return {
        concept_id: attribute.conceptId,
        name: attribute.name,
        is_array: attribute.isArray,
      };
```

In `buildOfflinePrompts.ts`, change `formatOfflineSqlSchemaNotes` to take the schema and append the note:

```ts
function formatOfflineSqlSchemaNotes(schema: OfflineChatSchema): string {
  const listFieldNote = SqlTableAlias.formatListFieldNote(
    schema.conceptAttributes ?? [],
  );
  return `Rules:
- SQL FROM / JOIN targets must be the quoted aliases above, never a label, filename, or topic word (wrong: FROM "covid_deaths"; right: FROM "t0" or FROM "c0").
- Do not invent datasets or system tables (pg_database, information_schema).
- Use only column names listed next to each alias. Never invent columns.
- Do not invent WHERE literal values unless the user named them.
- DuckDB uses LIMIT, not SELECT TOP.
- Wrap every table alias and column name in double quotes.
- One read-only SELECT or WITH. No semicolons.${listFieldNote ? `\n${listFieldNote}` : ""}`;
}
```

and pass `args.schema` at both call sites (`buildOfflineSqlPrompt` and `buildOfflineFixSqlPrompt`).

- [ ] **Step 6: Run the tests and the type-check**

Run: `pnpm test:frontend SqlTableAlias fetchWorkspaceSchema buildSqlSystemPrompt fetchOfflineChatSchema buildOfflinePrompts truncateSchemaForOffline narrowOfflineSchema ensureOfflineChatSchema`
Expected: PASS.

Run: `pnpm type-check`
Expected: PASS, including `deno check`.

- [ ] **Step 7: Commit**

```bash
git add shared/models/chat/SqlTableAlias supabase/functions/chat/PostChatMessages/schema supabase/functions/chat/utils/buildSqlSystemPrompt shared/types/offlineChat.types.ts src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn
git commit -m "feat(joined-cases): mark list fields in chat's SQL schema context" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: E2E: a list field from the chat draft on the record page

**Files:**
- Create: `tests/e2e/case-list-field.spec.ts`

The spec stubs chat: the first turn answers with a proposal that names the imported dataset's real column ids, so the spec drives the card rather than a model (as `chat-interactive-workflows.spec.ts` does). It switches **Daily new cases** to **Every value**, creates the case type, waits for the first sync through an oracle read, and opens Alameda, whose two rows in the small California CSV are `31` then `48`.

- [ ] **Step 1: Write the spec**

Create `tests/e2e/case-list-field.spec.ts`:

```ts
/*
 * A case type field switched to "Every value" in the chat draft card keeps
 * every dataset value, and the record page lists them all.
 *
 * Chat is stubbed: every message turn answers with a ready proposal naming
 * the imported dataset's real column ids, so the test drives the card, not a
 * model. The dataset is imported in `beforeAll`, in a browser context of its
 * own, so the session under test starts after it exists. Creating the case
 * type is the behavior under test, so it goes through the UI; the test only
 * reads the database to learn when the first sync has written the records,
 * and to clean up.
 */
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
  SMALL_CALIFORNIA_CSV_PATH,
} from "./helpers/constants";
import { deleteDatasetFixture } from "./helpers/deleteDatasetFixture";
import { importDatasetViaUi } from "./helpers/importDatasetViaUi";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import { installDuckDbExtensionCache } from "./setup/installDuckDbExtensionCache";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { Page } from "@playwright/test";

test.use({ trace: "retain-on-failure" });

const CASE_TYPE_NAME = "E2E county daily cases";
const KEY_COLUMN_NAME = "Admin2";
const LIST_COLUMN_NAME = "daily_new_cases";
const LIST_FIELD_NAME = "Daily new cases";
/** One record per distinct `Admin2` in the small California CSV. */
const RECORD_COUNT = 60;
const RECORD_KEY = "Alameda";
/** Alameda's `daily_new_cases`, in file order. */
const RECORD_VALUES = ["31", "48"];

/** What `beforeAll` created, so `afterAll` removes exactly that. */
const seededWorld: {
  workspaceId: string | undefined;
  datasetId: string | undefined;
  columnIdsByName: Record<string, string> | undefined;
} = { workspaceId: undefined, datasetId: undefined, columnIdsByName: undefined };

/** Oracle read: the imported dataset's column ids, by column name. */
async function _getColumnIdsByName(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  datasetId: string;
}): Promise<Record<string, string>> {
  const { data } = await options.supabaseAdminClient
    .from("dataset_columns")
    .select("id, name")
    .eq("dataset_id", options.datasetId)
    .throwOnError();
  return Object.fromEntries(
    data.map((column) => {
      return [column.name, column.id];
    }),
  );
}

/** Oracle read: how many records the case type of this name has. */
async function _countRecords(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
}): Promise<number> {
  const { data: concepts } = await options.supabaseAdminClient
    .from("concepts")
    .select("id")
    .eq("workspace_id", options.workspaceId)
    .eq("name", CASE_TYPE_NAME)
    .throwOnError();
  const conceptId = concepts[0]?.id;
  if (!conceptId) {
    return 0;
  }
  const { count } = await options.supabaseAdminClient
    .from("individuals")
    .select("id", { count: "exact", head: true })
    .eq("concept_id", conceptId)
    .throwOnError();
  return count ?? 0;
}

/** The proposal chat would make: one dataset, County as key and label. */
function _makeProposal(options: {
  datasetId: string;
  columnIdsByName: Record<string, string>;
}): unknown {
  const keyColumnId = options.columnIdsByName[KEY_COLUMN_NAME];
  const listColumnId = options.columnIdsByName[LIST_COLUMN_NAME];
  return {
    name: CASE_TYPE_NAME,
    description: "One California county's daily case counts",
    allowManualCreation: false,
    sourceDatasets: [
      { datasetId: options.datasetId, primaryKeyColumnId: keyColumnId },
    ],
    labelColumnId: keyColumnId,
    attributes: [
      {
        datasetId: options.datasetId,
        columnId: keyColumnId,
        name: "County",
        isIncluded: true,
        valueShape: "single",
        valuePickerRuleType: "first",
      },
      {
        datasetId: options.datasetId,
        columnId: listColumnId,
        name: LIST_FIELD_NAME,
        isIncluded: true,
        valueShape: "single",
        valuePickerRuleType: "sum",
      },
    ],
    manualEntryAttributes: [],
  };
}

/** Answers every chat turn with the proposal, never reaching a model. */
async function _mountProposingChat(options: {
  page: Page;
  proposal: unknown;
}): Promise<void> {
  const { page, proposal } = options;
  await page.route("**/functions/v1/chat/*/session-secret", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sessionSecret: Buffer.alloc(32, 0x42).toString("base64"),
        issuedAt: Date.now(),
      }),
    });
  });
  await page.route("**/functions/v1/chat/*/messages", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        assistantText: "Here is a draft.",
        proposedCaseType: proposal,
      }),
    });
  });
}

test.describe("Case list fields", () => {
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
      // Waits for the cloud copy: the session under test has no local one.
      await importDatasetViaUi({
        page,
        filePath: SMALL_CALIFORNIA_CSV_PATH,
        expectedRowCount: SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
        workspaceSlug,
        onDatasetCreated: (datasetId) => {
          seededWorld.datasetId = datasetId;
        },
      });
    } finally {
      await context.close();
    }

    if (!seededWorld.datasetId) {
      throw new Error("The county dataset was not created.");
    }
    seededWorld.columnIdsByName = await _getColumnIdsByName({
      supabaseAdminClient: admin,
      datasetId: seededWorld.datasetId,
    });
  });

  // Removes the case type the test created (cascading to its fields,
  // statuses, and records) and the dataset, whatever the test did.
  test.afterAll(async () => {
    const admin = createSupabaseAdminClient();
    if (seededWorld.workspaceId) {
      await admin
        .from("concepts")
        .delete()
        .eq("workspace_id", seededWorld.workspaceId)
        .eq("name", CASE_TYPE_NAME)
        .throwOnError();
    }
    if (seededWorld.datasetId && seededWorld.workspaceId) {
      await deleteDatasetFixture({
        admin,
        datasetId: seededWorld.datasetId,
        workspaceId: seededWorld.workspaceId,
      });
    }
  });

  test("a field switched to every value in the chat draft lists every value on the record page", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const { workspaceId, datasetId, columnIdsByName } = seededWorld;
    if (!workspaceId || !datasetId || !columnIdsByName) {
      throw new Error("beforeAll did not import the dataset.");
    }
    await _mountProposingChat({
      page,
      proposal: _makeProposal({ datasetId, columnIdsByName }),
    });
    await signInWithEmailPassword(page, {
      email: primaryUser.email,
      password: primaryUser.password,
      workspaceSlug,
    });

    await page.getByRole("link", { name: "Case Manager" }).click();
    // The home page and its navbar both offer New case type, and both start
    // the same design session.
    await page.getByRole("button", { name: "New case type" }).first().click();

    const valueShape = page.getByRole("radiogroup", {
      name: `One value or every value for ${LIST_FIELD_NAME}`,
    });
    await expect(valueShape).toBeVisible({ timeout: MEDIUM_WAIT });
    await valueShape.getByText("Every value", { exact: true }).click();
    await expect(
      valueShape.getByRole("radio", { name: "Every value" }),
    ).toBeChecked();
    await expect(
      page.getByLabel(`Value to keep for ${LIST_FIELD_NAME}`),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Create case type" }).click();
    await expect(page.getByText(`Created ${CASE_TYPE_NAME}`)).toBeVisible({
      timeout: MEDIUM_WAIT,
    });

    // Creating a case type syncs its records in the background. The records
    // list reads them once, so open it only after that sync has written them.
    await expect
      .poll(
        async () => {
          return _countRecords({ supabaseAdminClient: admin, workspaceId });
        },
        { timeout: LONG_WAIT },
      )
      .toBe(RECORD_COUNT);

    await page.getByRole("link", { name: CASE_TYPE_NAME, exact: true }).click();
    await page
      .getByRole("link", { name: new RegExp(`${RECORD_KEY}$`) })
      .click();

    await expect(
      page
        .getByRole("list", { name: LIST_FIELD_NAME })
        .getByRole("listitem"),
    ).toHaveText(RECORD_VALUES, { timeout: MEDIUM_WAIT });
  });
});
```

- [ ] **Step 2: See it fail on the claim it makes**

The features it covers already exist (Tasks 6 to 11 went red first in their unit tests), so check instead that its final assertion can fail. Temporarily set `RECORD_VALUES` to `["48", "31"]`, check `ava supabase status` names `feat-joined-cases` and the dev server is running, then:

Run: `pnpm test:e2e case-list-field.spec.ts`
Expected: FAIL at the last assertion, which receives `["31", "48"]`: the record page lists Alameda's values in file order. Restore `RECORD_VALUES` to `["31", "48"]`.

- [ ] **Step 3: Run it**

Check `ava supabase status` names `feat-joined-cases` and the dev server is running, then:

Run: `pnpm test:e2e case-list-field.spec.ts`
Expected: PASS, on its own, within the 45-second local timeout.

If the record count settles below 60, confirm the CSV with `cut -d, -f2 tests/data/small-california-covid-sample/small-california-covid-sample.csv | tail -n +2 | sort -u | wc -l` and use that count.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/case-list-field.spec.ts
git commit -m "test(joined-cases): a list field from the chat draft shows every value on the record page" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Documentation

**Files:**
- Modify: `docs/ontology-architecture.md`

Describe the code as it now is. No references to this plan, the spec, or gap numbers.

- [ ] **Step 1: Section 4, data model**

In the ER diagram, change `enum value_picker_rule_type` on `attribute_mappings__dataset_column` to `enum value_picker_rule_type "null for a list field"`. In the table row for `attribute_mappings__dataset_column`, append: "The value picker is NULL for a field that keeps every value (`is_array`)." In "Database-enforced integrity", add:

```markdown
- `rpc_concepts__create` refuses a dataset field whose value picker does not
  match its shape (a list names none, every other dataset field names one,
  hint `value_rule_mismatch`) and a list field that is the label or an
  identifier (hint `list_field_is_key_or_label`). Both raise `23514`. They
  check only case types created through the RPC.
```

- [ ] **Step 2: Sections 5.2 and 5.3, authoring**

In 5.2, add a bullet:

```markdown
- Each dataset field has a **One value** / **Every value** switch
  (`ValueShapeControl`); the value picker shows only for one value. The submit
  transform keeps identifiers and the label to one value
  (`keepKeyAndLabelFieldsSingle`), and `insertConceptFromFormValues` writes no
  value picker for a list.
```

In 5.3, after the sentence about `parseProposeCaseType` defaulting unknown value pickers, add: "It reads each attribute's `valueShape` (`single` unless the model said `list`) and keeps every join key and the label column to `single`." After the paragraph on `CaseTypeDraftBlock`, add: "Each attribute row has a **One value** / **Every value** switch, locked on join keys and the label; choosing a field as a join key or label switches it to one value." In the two-step conversion list, add to step 1: "It carries each attribute's `valueShape`, forced to `single` for the label and join keys, and its value picker only for one value." Add to step 2: "Each mapped attribute's `isArray` and `dataType` come from `ConceptAttribute.valueShapeToIsArray` and `ConceptAttribute.getOutputDataType`."

- [ ] **Step 3: Sections 7 and 7.1, value shapes**

At the start of section 7, add:

```markdown
A field has a **value shape** (`ConceptAttribute.ValueShape`, derived from
`is_array` by `ConceptAttribute.getValueShape`):

| Shape | `is_array` | Value picker | Value |
| --- | --- | --- | --- |
| `single` | false | required | One value, picked by the rule |
| `list` | true | NULL | Every non-NULL value in `file_row_number` order, `[]` when there is none |

A list field is never the label or an identifier. Its `data_type` is its
column's type, the type of one element.
```

In 7.1, after the rule-names paragraph, add: "Value shapes are hand-written in five places too: `ConceptAttributeValueShape`, `ChatCaseValueShape`, `parseProposeCaseType`, `parseCreateCaseTypes`, and both tool schemas in `makeChatToolConfigFromOptions.ts`. Branches on a shape are exhaustive `match`es, so widening `ConceptAttributeValueShape` makes `pnpm type-check` list every other site."

- [ ] **Step 4: Section 8, concepts as relations**

Plan 1's documentation task rewrote this section around `buildAttributeValueSql`. In the table's "View" row, make the list wording say: a list attribute reads every non-NULL value through `buildAttributeValueSql` and ignores any value picker its mapping still stores; an unmapped list attribute is `CAST([] AS <type>[])`; a single attribute with no value picker throws at planning (`makeConceptAttributeColumnsFromMetadata`) and when its SQL is built (`buildAttributeValueSql`). After the status-column paragraph, add:

```markdown
**List columns in the explorer and dashboards.** List cells reach JavaScript
as plain arrays (`arrowTableToJS`), a list's dates as `YYYY-MM-DD` and its
timestamps as ISO strings, and a list result column is
`{ dataType: "varchar", isArray: true }`. A list query column
(`QueryColumn.isList`) can be shown, sorted, grouped, and counted; it is not
offered to filters, number aggregations, chart measures
(`QueryColumn.isNumeric` is false), or dashboard local filters. The results
grid joins a list's values with `; `. Chat's schema line marks a list field
`<name> (list)` and `SqlTableAlias.formatListFieldNote` explains
`list_contains`, `len`, and `UNNEST`, online and offline.
```

- [ ] **Step 5: Section 9, UI map**

In the record page row, add `RecordFieldValue/` to the key files and append to its description: "A list field shows every value, the first five then a Show all toggle". In the case type page row, append "list fields carry an Every value badge". Under "Outside the routes", add: "- **Field value shape control**: `src/components/caseFields/ValueShapeControl/`, used by the draft card and the case type form."

- [ ] **Step 6: Section 10, invariants**

Add rows:

```markdown
| A dataset field names a value picker exactly when it keeps one value | `rpc_concepts__create`; `makeConceptAttributeColumnsFromMetadata` throws for a single field without one | Case types created before list fields could store no rule may keep an unread rule on a list field |
| A list field is never the label or an identifier | `rpc_concepts__create`; `parseProposeCaseType`, `parseCreateCaseTypes`, `useCaseTypeDraftEditor`, `proposedCaseTypeToCreatedCaseType`, `createdCaseTypeToFormValues`, `keepKeyAndLabelFieldsSingle` | Sync and record names read the label as one value |
```

In the row about `file_row_number` ordering, call them lists rather than arrays.

- [ ] **Step 7: Section 16, limitations**

Add rows:

```markdown
| A global dashboard filter bound to a list column's name | It emits `IN`, `ILIKE`, or `=`, which fail on a list, so that block's query fails | Read |
| Saving a result with a list column as a new dataset | The column is saved with a `varchar` type over a list | Read |
| The Data Explorer cannot filter inside a list | Filtering by a value a list contains needs chat SQL (`list_contains`) | Read |
```

- [ ] **Step 8: Check the document**

Run: `rg -n "isArray|is_array|list" docs/ontology-architecture.md`
Expected: every hit describes the current code; none says lists are unsupported or that only the form sets `isArray`.

Run: `rg -n "\x{2014}" docs/ontology-architecture.md` (the em dash character)
Expected: no output.

- [ ] **Step 9: Commit**

```bash
git add docs/ontology-architecture.md
git commit -m "docs(joined-cases): describe list fields in the ontology architecture" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Verification checklist

- [ ] `pnpm type-check` passes, including `deno check`.
- [ ] `pnpm lint` passes.
- [ ] `pnpm test:frontend` passes.
- [ ] `pnpm test:executed` passes.
- [ ] `ava supabase status` names `feat-joined-cases`, then `pnpm test:db` passes, including the migration upgrade tests.
- [ ] `pnpm desktop:sqlite:check-migrations` passes.
- [ ] `pnpm test:e2e case-list-field.spec.ts` passes on its own.
- [ ] `pnpm i18n:check` is clean.
- [ ] `rg -n "isArray: false" src/views/OntologyDesignerApp/createdCaseTypeToFormValues/createdCaseTypeToFormValues.ts` returns nothing.
- [ ] `git status` shows only `supabase/config.toml` modified.
- [ ] Nothing was run against production.
