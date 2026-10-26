# Case Statuses 4: Data Explorer and Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a case type's status a first-class `status` column in the Data Explorer and in every concept SQL relation, show each case type's allowed statuses to chat (online and offline), let chat propose a status set when it drafts a case type, and show that set in the chat draft card.

**Architecture:** A new `ConceptStatusColumn` base column (id derived from the case type's id) joins the `QueryColumn.baseColumn` union, so the Data Explorer offers `status` after a case type's attributes and reconciles it across reloads by `Model.getTypedId`. QETL's spine gains a second column: the plan reads the case type's statuses once, maps each record's `statusId` to its name, loads `external_id` and `status` as CSV, and the concept view selects `individuals."status"`. Chat's schema line lists each case type's statuses in position order. `proposeCaseType` carries an optional status set that the edge function validates and color-fills; the client turns it into a `ConceptStatus.SetValue` (or the translated default set) for the draft card and the create path.

**Tech Stack:** TypeScript, React, Mantine, TanStack Query, Lingui, DuckDB (QETL, executed tests), Deno edge functions (tested with Vitest), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-25-case-statuses-design.md` §8.3, §9, §10, §12 (executed and E2E 4), §13.1, §14. **Overview and shared names:** `docs/superpowers/plans/2026-10-25-case-statuses.md`

---

## Before you start

- Plans 1, 2 and 3 have landed on `feat/statuses`. This plan uses their names exactly as the overview's "Shared names" lists them, plus two plan 2 additions the overview records: `ConceptStatus.isReservedAttributeName(name)` (true when `name.trim().toLowerCase() === "status"`) and `ConceptStatus.toNonReservedAttributeName(name)` (`"<trimmed name> (attribute)"` for a reserved name, the name unchanged otherwise). The `ConceptStatus` module file is `shared/models/ontology/ConceptStatus/ConceptStatusModule/ConceptStatusModule.ts`; import the model through `$/models/ontology/ConceptStatus/ConceptStatus` (`.ts` suffix in `shared/` and `supabase/functions/`).
- Read the ground rules in the overview. They apply to every task here: commit by path, never `git add -A`, never stage `supabase/config.toml`, Lingui for every user-facing string, no em dashes, comments describe the code and never this plan or the spec.
- No task in this plan runs a database command. The E2E task needs the switched local stack running; check `ava supabase status` reads green first.
- Every commit command below ends with the `Co-Authored-By` trailer this session uses. If your session specifies a different trailer, use yours.
- Load the `impeccable` skill before Task 14 (it adds a section to an existing surface, the chat draft card).

### Decisions this plan locks in

| Decision | Choice | Why |
| --- | --- | --- |
| `ConceptStatusColumn` id | The case type's own id, rebranded: `uuid<ConceptStatusColumn.Id>(conceptId)` | Deterministic, a valid UUID, one per case type, and stable across reloads. `Model.getTypedId` pairs it with `__type: "ConceptStatusColumn"`, so it never equals the case type's own typed id. Within one case type no attribute shares the id, so sites that compare `baseColumn.id` alone stay correct. |
| Where the model lives | `shared/models/queries/ConceptStatusColumn/` | It exists only as a query column; it is not a database row. |
| One builder for a case type's columns | `makeQueryColumnsFromConcept` | `useQueryColumnsForDataSource` and the URL restore (`getRestoredColumnsFromUrl`) both need "attributes, then status". |
| URL restore | Includes the status column (Task 3) | Without it a Data Explorer URL naming `status` silently drops the column on reload. The spec does not list this site; it is reported as a gap. |
| Online chat status read | A separate `concept_statuses` select, not an embedded `concepts.select("..., concept_statuses (...)")` | Two foreign keys join `concepts` and `concept_statuses` (the status's case type, and the case type's default status), which makes a PostgREST embed ambiguous. A separate select also matches how `concept_attributes` is already read. |
| Status names in the chat schema line | Sorted with `ConceptStatus.sortByPosition` | One tie rule (position, then name) everywhere. |
| Invalid proposed status set | Dropped whole, never shortened | The client then fills the translated default set, which is a better start than a workflow missing a step. |
| Proposed attribute named "status" | Renamed with `ConceptStatus.toNonReservedAttributeName` | A dataset `status` column is common and the attribute name comes from it. |
| Draft card status UI | A read-only list (badge plus description) with an **Edit statuses** button that swaps in `StatusSetEditor` | The card has no separate draft and editable modes today (every attribute control is always editable), so "read-only while a draft, editor while editable" is implemented as a local toggle on the status section. Reported as a spec gap. |
| E2E case type | Reads one attribute from a real imported dataset, seeded in `beforeAll` in its own browser context | Only a dataset-backed attribute has a value to count per status. The concept list is cached for six minutes, so the case type must exist before the session under test first loads. |

## File structure

| File | Status | Responsibility |
| --- | --- | --- |
| `shared/models/queries/ConceptStatusColumn/ConceptStatusColumn.types.ts` | Create | `ConceptStatusColumnId`, `ConceptStatusColumnRead` |
| `shared/models/queries/ConceptStatusColumn/ConceptStatusColumnModule.ts` | Create | `COLUMN_NAME`, `fromConceptId` |
| `shared/models/queries/ConceptStatusColumn/ConceptStatusColumn.ts` | Create | Namespace (`T`, `Id`) merged with the module |
| `shared/models/queries/ConceptStatusColumn/ConceptStatusColumn.test.ts` | Create | Identity tests |
| `shared/models/queries/QueryColumn/QueryColumn.types.ts` | Modify | Widen `baseColumn` |
| `shared/models/queries/QueryColumn/QueryColumnModule.ts` | Modify | `makeFromConceptStatusColumn` |
| `shared/models/queries/QueryColumn/QueryColumnReconciliation/QueryColumnReconciliation.test.ts` | Modify | Status column survives a reload |
| `src/views/DataExplorerApp/makeQueryColumnsFromConcept/makeQueryColumnsFromConcept.ts` (+ `.test.ts`) | Create | A case type's query columns |
| `src/views/DataExplorerApp/useQueryColumnsForDataSource.ts` | Modify | Append the status column |
| `src/views/DataExplorerApp/getRestoredColumnsFromUrl/getRestoredColumnsFromUrl.ts` (+ test) | Modify | Restore `status` from the URL |
| `src/views/DataExplorerApp/useDataExplorerUrlSync.ts` | Modify | Pass the concept id to the restore |
| `src/clients/queries/runStructuredQuery/runStructuredQueryWithMetadata.ts` | Modify | Comment on the legacy skip |
| `src/clients/queries/runStructuredQuery/runStructuredQuery.test.ts` | Modify | Legacy path leaves `status` out |
| `src/clients/qetl/QueryMediator/conceptRelation/toCsvRows.ts` | Create | Multi-column RFC 4180 CSV |
| `src/clients/qetl/QueryMediator/conceptRelation/toCsvColumn.ts` | Modify | Delegates to `toCsvRows` |
| `src/lib/sql/__tests__/toCsvRows.executed.test.ts` | Create | Round trip through DuckDB |
| `src/clients/qetl/QueryMediator/conceptRelation/conceptRelation.types.ts` | Modify | `ConceptSpineRow`, `spineRows` |
| `src/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql.ts` (+ test) | Modify | Read statuses, build spine rows |
| `src/clients/qetl/QueryMediator/conceptRelation/loadConceptSpine/loadConceptSpine.ts` (+ test) | Modify | Two `VARCHAR` columns |
| `src/clients/qetl/QueryMediator/conceptRelation/loadConceptRelations.ts` | Modify | Pass `spineRows` |
| `src/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery.test.ts`, `src/clients/qetl/QueryMediator/__tests__/QueryMediator.concepts.test.ts`, `src/clients/qetl/QueryMediator/expandRelationRefs/expandRelationRefs.test.ts` | Modify | Plan fixtures use `spineRows` |
| `src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql.ts` | Modify | Select `status` |
| `src/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata.ts` | Modify | Reserve `status` in `takenNames` |
| `src/lib/sql/__tests__/buildConceptViewSql.executed.test.ts`, `src/lib/sql/__tests__/conceptAttributeColumns.executed.test.ts` | Modify | Spine fixtures carry `status` |
| `tests/integration/queries/StructuredQueryTestFixtures.ts`, `tests/integration/queries/structuredQueryConcepts.executed.test.ts` | Modify | Filter and group by `status` |
| `shared/models/chat/SqlTableAlias/SqlTableAlias.types.ts`, `SqlTableAlias.ts`, `SqlTableAliasModule.ts`, `SqlTableAlias.test.ts` | Modify | Status field in the schema line |
| `supabase/functions/chat/PostChatMessages/schema/fetchWorkspaceSchema.ts` (+ test) | Modify | Read `concept_statuses` |
| `supabase/functions/chat/utils/buildSqlSystemPrompt/buildSqlSystemPrompt.ts` (+ test) | Modify | Pass statuses through |
| `supabase/functions/chat/PostChatMessages/PostChatMessages.ts`, `supabase/functions/queries/QueriesRoutes.ts` | Modify | Pass `schema.conceptStatuses` |
| `shared/types/offlineChat.types.ts` | Modify | `OfflineChatSchemaConceptStatus` |
| `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/fetchOfflineChatSchema.ts` (+ new `.test.ts`), `OfflineChatSchemaCache.ts`, `truncateSchemaForOffline/truncateSchemaForOffline.ts` (+ test) | Modify | Offline statuses |
| `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/ensureOfflineChatSchema/ensureOfflineChatSchema.ts` (+ test) | Modify | Pass statuses through |
| `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/narrowOfflineSchema/narrowOfflineSchema.ts` (+ new test) | Move and modify | Pass statuses through |
| `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/buildOfflinePrompts/buildOfflinePrompts.ts` (+ test) | Modify | Status field offline |
| `shared/types/chat.types.ts` | Modify | `ChatCaseStatus`, `statuses`, `defaultStatusName` |
| `supabase/functions/chat/PostChatMessages/parsing/parseProposedCaseStatuses.ts` | Create | Validate and color-fill a proposed set |
| `supabase/functions/chat/PostChatMessages/parsing/parseProposeCaseType.ts` (+ test) | Modify | Statuses and attribute rename |
| `supabase/functions/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.ts` (+ test) | Modify | Tool schema |
| `supabase/functions/chat/PostChatMessages/prompt/buildCaseManagerSystemPrompt.ts` (+ test) | Modify | Ask for statuses |
| `src/views/OntologyDesignerApp/makeStatusSetValueFromChatStatuses/makeStatusSetValueFromChatStatuses.ts` (+ test) | Create | Chat statuses to a `SetValue` |
| `src/views/OntologyDesignerApp/createdCaseTypeToFormValues/createdCaseTypeToFormValues.ts` (+ test) | Modify | Use chat statuses |
| `src/views/OntologyDesignerApp/proposedCaseTypeToCreatedCaseType/proposedCaseTypeToCreatedCaseType.ts` (+ test) | Modify | Carry statuses |
| `src/components/ChatPanel/CaseTypeDraftBlock/useCaseTypeDraftEditor.ts` (+ test) | Modify | Status set state, reserved names |
| `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftStatusSection.tsx` | Create | Read-only list or editor |
| `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftCard.tsx`, `CaseTypeDraftCard.module.css`, `CaseTypeDraftAttributeRow.tsx`, `CaseTypeDraftManualEntrySection.tsx`, `CaseTypeDraftBlock.test.tsx` | Modify | Wire the section, flag "status" |
| `tests/e2e/helpers/CaseTypeSeedHelpers.ts` | Create | Seed and delete a case type |
| `tests/e2e/case-statuses-data-explorer.spec.ts` | Create | E2E spec 4 |
| `docs/ontology-architecture.md`, `docs/production-plan-world-humanitarian-day.md` | Modify | §14 docs |

---

### Task 1: The `ConceptStatusColumn` base column

**Files:**
- Create: `shared/models/queries/ConceptStatusColumn/ConceptStatusColumn.types.ts`
- Create: `shared/models/queries/ConceptStatusColumn/ConceptStatusColumnModule.ts`
- Create: `shared/models/queries/ConceptStatusColumn/ConceptStatusColumn.ts`
- Test: `shared/models/queries/ConceptStatusColumn/ConceptStatusColumn.test.ts`
- Modify: `shared/models/queries/QueryColumn/QueryColumn.types.ts`
- Modify: `shared/models/queries/QueryColumn/QueryColumnModule.ts`
- Test: `shared/models/queries/QueryColumn/QueryColumnReconciliation/QueryColumnReconciliation.test.ts`

- [ ] **Step 1: Write the failing identity tests**

Create `shared/models/queries/ConceptStatusColumn/ConceptStatusColumn.test.ts`:

```ts
/**
 * A case type's status column has no database row, so its identity has to be
 * derived. These pin that the derivation is stable and per case type, which
 * is what lets a selected status column survive a reload.
 */
import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { ConceptStatusColumn } from "$/models/queries/ConceptStatusColumn/ConceptStatusColumn.ts";
import type { Concept } from "$/models/ontology/Concept/Concept.ts";

const CHOLERA_ID = "cccccccc-3333-4333-8333-cccccccccccc" as Concept.Id;
const MEASLES_ID = "dddddddd-4444-4444-8444-dddddddddddd" as Concept.Id;

describe("ConceptStatusColumn.fromConceptId", () => {
  it("gives a case type's status column the same typed id on every call", () => {
    const first = ConceptStatusColumn.fromConceptId(CHOLERA_ID);
    const second = ConceptStatusColumn.fromConceptId(CHOLERA_ID);

    expect(Model.getTypedId(first)).toEqual(Model.getTypedId(second));
    expect(Model.getTypedId(first)).toEqual({
      __type: "ConceptStatusColumn",
      id: CHOLERA_ID,
    });
  });

  it("gives two case types different status column ids", () => {
    expect(ConceptStatusColumn.fromConceptId(CHOLERA_ID).id).not.toBe(
      ConceptStatusColumn.fromConceptId(MEASLES_ID).id,
    );
  });
});
```

Append this test inside the `describe("QueryColumnReconciliation", ...)` block of `shared/models/queries/QueryColumn/QueryColumnReconciliation/QueryColumnReconciliation.test.ts`, and add the two imports to the file's import block:

```ts
import { ConceptStatusColumn } from "$/models/queries/ConceptStatusColumn/ConceptStatusColumn.ts";
import type { Concept } from "$/models/ontology/Concept/Concept.ts";
```

```ts
  // The status column is rebuilt every time a case type's columns load. Its
  // projection id must carry over, or a selected `status` column would drop
  // out of the query on every refetch.
  it("keeps a case type's status column selected when its columns reload", () => {
    const conceptId = "cccccccc-3333-4333-8333-cccccccccccc" as Concept.Id;
    const sourceKey: QueryDataSource.TypedId = {
      __type: "Concept",
      id: conceptId,
    };
    const previous = QueryColumn.makeFromConceptStatusColumn(
      ConceptStatusColumn.fromConceptId(conceptId),
    );
    const incoming = QueryColumn.makeFromConceptStatusColumn(
      ConceptStatusColumn.fromConceptId(conceptId),
    );

    const columns = QueryColumnReconciliation.reconcileSourceColumns({
      sourceKey,
      previousSourceKey: { ...sourceKey },
      previous: [previous],
      incoming: [incoming],
    });

    expect(incoming.id).not.toBe(previous.id);
    expect(columns[0]?.id).toBe(previous.id);
  });
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `pnpm test:frontend ConceptStatusColumn QueryColumnReconciliation`
Expected: FAIL. Vitest cannot resolve `$/models/queries/ConceptStatusColumn/ConceptStatusColumn.ts`.

- [ ] **Step 3: Write the types**

Create `shared/models/queries/ConceptStatusColumn/ConceptStatusColumn.types.ts`:

```ts
import type { ConceptId } from "$/models/ontology/Concept/Concept.types.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";

type ModelType = "ConceptStatusColumn";

/** The status column's id, which is its case type's id rebranded. */
export type ConceptStatusColumnId = UUID<ModelType>;

/**
 * The built-in `status` column every case type offers to queries. It has no
 * database row: it stands for the status name each record carries in the
 * case type's DuckDB relation.
 */
export type ConceptStatusColumnRead = Model.Base<
  ModelType,
  {
    /** Derived from `conceptId`, so it is the same on every load. */
    id: ConceptStatusColumnId;
    conceptId: ConceptId;
    name: "status";
    dataType: "varchar";
  }
>;
```

- [ ] **Step 4: Write the module and the namespace**

Create `shared/models/queries/ConceptStatusColumn/ConceptStatusColumnModule.ts`:

```ts
import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid.ts";
import type { ConceptId } from "$/models/ontology/Concept/Concept.types.ts";
import type {
  ConceptStatusColumnId,
  ConceptStatusColumnRead,
} from "$/models/queries/ConceptStatusColumn/ConceptStatusColumn.types.ts";

const COLUMN_NAME = "status";

function _fromConceptId(conceptId: ConceptId): ConceptStatusColumnRead {
  return Model.make("ConceptStatusColumn", {
    id: uuid<ConceptStatusColumnId>(conceptId),
    conceptId,
    name: COLUMN_NAME,
    dataType: "varchar",
  });
}

/** Builders and names for a case type's built-in `status` column. */
export const ConceptStatusColumnModule = {
  /** The column's name in the case type's relation and in every query. */
  COLUMN_NAME,

  /**
   * The status column of one case type. Its id is the case type's id, so two
   * loads of the same case type produce the same typed id, and a selected
   * status column is matched back up by `Model.getTypedId` after a reload.
   */
  fromConceptId: _fromConceptId,
};
```

Create `shared/models/queries/ConceptStatusColumn/ConceptStatusColumn.ts`:

```ts
/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  ConceptStatusColumnId,
  ConceptStatusColumnRead,
} from "$/models/queries/ConceptStatusColumn/ConceptStatusColumn.types.ts";

export { ConceptStatusColumnModule as ConceptStatusColumn } from "$/models/queries/ConceptStatusColumn/ConceptStatusColumnModule.ts";

export namespace ConceptStatusColumn {
  export type T = ConceptStatusColumnRead;
  export type Id = ConceptStatusColumnId;
}
```

- [ ] **Step 5: Widen `QueryColumn.baseColumn` and add the builder**

In `shared/models/queries/QueryColumn/QueryColumn.types.ts`, add the import and widen the union:

```ts
import type { ConceptStatusColumn } from "$/models/queries/ConceptStatusColumn/ConceptStatusColumn.ts";
```

```ts
    baseColumn:
      | DatasetColumnRead
      | ConceptAttributeModel["Read"]
      | ConceptStatusColumn.T;
```

In `shared/models/queries/QueryColumn/QueryColumnModule.ts`, add the type import and a builder after `makeFromDatasetColumn`:

```ts
import type { ConceptStatusColumn } from "$/models/queries/ConceptStatusColumn/ConceptStatusColumn.ts";
```

```ts
  /**
   * Wraps a case type's built-in `status` column. Filters, grouping and
   * aggregation read only the base column's `name` and `dataType`, so the
   * status column needs no handling of its own past this point.
   */
  makeFromConceptStatusColumn: (
    column: ConceptStatusColumn.T,
  ): QueryColumn.T => {
    return Model.make("QueryColumn", {
      id: uuid<QueryColumn.Id>(),
      baseColumn: column,
      aggregation: undefined,
    });
  },
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `pnpm test:frontend ConceptStatusColumn QueryColumnReconciliation`
Expected: PASS, all tests in both files.

- [ ] **Step 7: Let the compiler list the sites the wider union reaches**

Run: `pnpm type-check`
Expected: PASS with no errors.

The grep done while writing this plan found **no exhaustive match over `baseColumn.__type`** anywhere (`Model.match`, `ts-pattern` `.exhaustive()`, or a `Record` keyed by the type). Every other reader of `baseColumn` reads only `__type`, `id`, `name` or `dataType`, which the new variant has, so none needs an edit:

| Site | Reads |
| --- | --- |
| `shared/models/queries/QueryColumn/QueryColumnReconciliation/QueryColumnReconciliation.ts` | `Model.getTypedId(baseColumn)` |
| `shared/models/queries/StructuredQuery/sqlToStructuredQuery/reconcileParsedColumns.ts` | `Model.getTypedId(baseColumn)` |
| `shared/models/queries/QueryColumnBindings/makeProjectionDescriptorsFromStructuredQuery/makeProjectionDescriptorsFromStructuredQuery.ts` | `Model.getTypedId(baseColumn)`, `name` |
| `shared/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql.ts`, `makeSqlExpressionFromQueryColumn.ts`, `makeFilterColumnFromStructuredQuery.ts`, `normalizeQueryFilters/normalizeQueryFilters.ts` | `name`, `dataType` |
| `shared/models/queries/QueryColumn/QueryColumnModule.ts` (`getDerivedColumnName`, `isNumeric`) | `name`, `dataType` |
| `src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerSourceActions.ts`, `QueryColumnMultiSelect/QueryColumnMultiSelect.tsx` | `__type`, `id` |
| `src/views/DataExplorerApp/QueryColumnSingleSelect/QueryColumnSingleSelect.tsx`, `QueryColumnMultiSelect/remapColumnsByBaseId/remapColumnsByBaseId.ts` | `id`, `name` |
| `src/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField.tsx`, `QueryForm/ManualQueryForm/AggregationFields.tsx`, `DataExplorerUrlState.ts` | `name`, `dataType` |
| `src/views/GisApp/**` (`MapSourceHydration.ts`, `TimeColumnSelect.tsx`, `DisputedColumnSelect.tsx`, `queryPopupUpdates.ts`, `runLatLngLayer.ts`, `isMapTimeColumn.ts`), `src/clients/maps/MapLayerSpatialQuery/getResolvedMapLayerMetadata/*.ts` | `__type`, `id`, `name`, `dataType` |
| `apps/ava-video-producer/avandar-adapter/Explorer.constants.ts` | builds `DatasetColumn` literals only |

Three sites build or filter concept columns and do need changes. Tasks 2, 3 and 4 make them: `useQueryColumnsForDataSource` (append the column), `getRestoredColumnsFromUrl` (restore it), and `_runConceptQuery` (leave it out). GIS's `useLayerSourceColumns` also lists concept columns; the spec scopes the status column to the Data Explorer, so GIS is left alone.

If `pnpm type-check` does report an error, it is a site added after this plan was written: add the `ConceptStatusColumn` arm there and list the file in your commit message.

- [ ] **Step 8: Commit**

```bash
git add shared/models/queries/ConceptStatusColumn shared/models/queries/QueryColumn/QueryColumn.types.ts shared/models/queries/QueryColumn/QueryColumnModule.ts shared/models/queries/QueryColumn/QueryColumnReconciliation/QueryColumnReconciliation.test.ts
git commit -m "feat(case-statuses): add the built-in status query column" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The Data Explorer offers `status` for every case type

**Files:**
- Create: `src/views/DataExplorerApp/makeQueryColumnsFromConcept/makeQueryColumnsFromConcept.ts`
- Test: `src/views/DataExplorerApp/makeQueryColumnsFromConcept/makeQueryColumnsFromConcept.test.ts`
- Modify: `src/views/DataExplorerApp/useQueryColumnsForDataSource.ts`

- [ ] **Step 1: Write the failing test**

Create `src/views/DataExplorerApp/makeQueryColumnsFromConcept/makeQueryColumnsFromConcept.test.ts`:

```ts
/**
 * A case type's query columns are its attributes followed by its built-in
 * `status` column, in that order, because the column picker lists them as
 * they come.
 */
import { Model } from "@avandar/models";
import { prop } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { makeQueryColumnsFromConcept } from "@/views/DataExplorerApp/makeQueryColumnsFromConcept/makeQueryColumnsFromConcept";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { Workspace } from "$/models/Workspace/Workspace";

const CONCEPT_ID = uuid<Concept.Id>();

function _makeAttribute(name: string): ConceptAttribute.T {
  const now = "2026-10-25T00:00:00.000Z";
  return Model.make("ConceptAttribute", {
    id: uuid<ConceptAttribute.Id>(),
    conceptId: CONCEPT_ID,
    workspaceId: uuid<Workspace.Id>(),
    name,
    description: undefined,
    createdAt: now,
    updatedAt: now,
    dataType: "varchar",
    mappingType: "manual_entry",
    isLabel: false,
    isIdentifier: false,
    allowManualEdit: true,
    isArray: false,
  });
}

describe("makeQueryColumnsFromConcept", () => {
  it("offers every attribute and then the built-in status column", () => {
    const columns = makeQueryColumnsFromConcept({
      conceptId: CONCEPT_ID,
      attributes: [_makeAttribute("age"), _makeAttribute("district")],
    });

    expect(columns.map(prop("baseColumn.name"))).toEqual([
      "age",
      "district",
      "status",
    ]);
    expect(columns.map(prop("baseColumn.__type"))).toEqual([
      "ConceptAttribute",
      "ConceptAttribute",
      "ConceptStatusColumn",
    ]);
  });

  it("offers the status column for a case type with no attributes", () => {
    const columns = makeQueryColumnsFromConcept({
      conceptId: CONCEPT_ID,
      attributes: [],
    });

    expect(columns.map(prop("baseColumn.name"))).toEqual(["status"]);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm test:frontend makeQueryColumnsFromConcept`
Expected: FAIL. Vitest cannot resolve `makeQueryColumnsFromConcept`.

- [ ] **Step 3: Implement the builder**

Create `src/views/DataExplorerApp/makeQueryColumnsFromConcept/makeQueryColumnsFromConcept.ts`:

```ts
import { ConceptStatusColumn } from "$/models/queries/ConceptStatusColumn/ConceptStatusColumn";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

/**
 * Every column a case type offers to a query: one per attribute, then the
 * built-in `status` column every case type has.
 */
export function makeQueryColumnsFromConcept(
  options: Readonly<{
    conceptId: Concept.Id;
    attributes: readonly ConceptAttribute.T[];
  }>,
): QueryColumn.T[] {
  return [
    ...options.attributes.map((attribute) => {
      return QueryColumn.makeFromConceptAttribute(attribute);
    }),
    QueryColumn.makeFromConceptStatusColumn(
      ConceptStatusColumn.fromConceptId(options.conceptId),
    ),
  ];
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `pnpm test:frontend makeQueryColumnsFromConcept`
Expected: PASS, 2 tests.

- [ ] **Step 5: Use it in `useQueryColumnsForDataSource`**

In `src/views/DataExplorerApp/useQueryColumnsForDataSource.ts`, add the import:

```ts
import { makeQueryColumnsFromConcept } from "@/views/DataExplorerApp/makeQueryColumnsFromConcept/makeQueryColumnsFromConcept";
```

Replace the hook's docstring first sentence and the `columns` memo. The docstring becomes:

```ts
/**
 * Loads every column of a data source, whether it is a Dataset or a Concept.
 * A case type's columns end with its built-in `status` column.
 *
 * Shared by the column multi-select (what the query selects) and the filter
 * panel (what the query can filter on), which are deliberately different
 * choices over the same column list.
 */
```

Replace from `const sourceType = dataSourceId?.__type;` through the end of the `useMemo` call with:

```ts
  const sourceType = dataSourceId?.__type;
  const sourceId = dataSourceId?.id;
  // Narrowed on `__type` so the id is a `Concept.Id`, which the status column
  // is derived from.
  const conceptId =
    dataSourceId?.__type === "Concept" ? dataSourceId.id : undefined;
  const columns = useMemo(() => {
    if (!sourceId) {
      return [];
    }
    return [
      ...(sourceType === "Dataset" ? (datasetColumns ?? []) : []).map(
        (column) => {
          return QueryColumnFns.makeFromDatasetColumn(column);
        },
      ),
      // The status column waits for the attributes, so a case type's columns
      // arrive together rather than `status` first and alone.
      ...(conceptId && conceptAttributes
        ? makeQueryColumnsFromConcept({
            conceptId,
            attributes: conceptAttributes,
          })
        : []),
    ];
  }, [datasetColumns, conceptAttributes, sourceType, sourceId, conceptId]);
```

- [ ] **Step 6: Type-check and rerun the Data Explorer tests that mock this hook**

Run: `pnpm type-check`
Expected: PASS.

Run: `pnpm test:frontend useSourceColumnCatalog ManualQueryForm makeQueryColumnsFromConcept`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/views/DataExplorerApp/makeQueryColumnsFromConcept src/views/DataExplorerApp/useQueryColumnsForDataSource.ts
git commit -m "feat(case-statuses): offer the status column for every case type in the Data Explorer" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: A Data Explorer URL restores the status column

**Files:**
- Modify: `src/views/DataExplorerApp/getRestoredColumnsFromUrl/getRestoredColumnsFromUrl.ts`
- Test: `src/views/DataExplorerApp/getRestoredColumnsFromUrl/getRestoredColumnsFromUrl.test.ts`
- Modify: `src/views/DataExplorerApp/useDataExplorerUrlSync.ts`

- [ ] **Step 1: Write the failing test**

Add to the `describe` block in `getRestoredColumnsFromUrl.test.ts`:

```ts
  // `status` is not an attribute, so restoring from attributes alone drops it
  // and a reload loses the column the user had selected.
  it("restores a case type's built-in status column by name", () => {
    const restored = getRestoredColumnsFromUrl({
      colNames: ["age", "status"],
      datasetColumns: undefined,
      conceptAttributes: [_makeConceptAttribute("age")],
      conceptId: uuid<Concept.Id>(),
    });

    expect(restored.map(prop("baseColumn.__type"))).toEqual([
      "ConceptAttribute",
      "ConceptStatusColumn",
    ]);
  });
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm test:frontend getRestoredColumnsFromUrl`
Expected: FAIL. TypeScript reports `conceptId` does not exist on the options type (Vitest still runs and the assertion fails with `["ConceptAttribute"]`).

- [ ] **Step 3: Implement**

Replace `src/views/DataExplorerApp/getRestoredColumnsFromUrl/getRestoredColumnsFromUrl.ts` with:

```ts
import { isNonNullish, propEq } from "@avandar/utils";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { makeQueryColumnsFromConcept } from "@/views/DataExplorerApp/makeQueryColumnsFromConcept/makeQueryColumnsFromConcept";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

type Options = {
  colNames: readonly string[] | undefined;
  datasetColumns: readonly DatasetColumn.T[] | undefined;
  conceptAttributes: readonly ConceptAttribute.T[] | undefined;
  /** The case type's id when the source is a case type, for its `status`. */
  conceptId?: Concept.Id;
};

/**
 * Resolves the column names carried in the URL back to real query columns.
 *
 * A dataset source and a concept source supply their columns through different
 * models, so both are converted before matching. A concept source also offers
 * its built-in `status` column once its id is known. Names that match nothing
 * are dropped rather than erroring: a shared URL can outlive the column it
 * names, and hydrating the rest of the query is better than failing the whole
 * restore.
 *
 * Order follows `colNames`, so the restored selection reads the way the URL
 * that produced it did.
 */
export function getRestoredColumnsFromUrl(
  options: Readonly<Options>,
): QueryColumn.T[] {
  const { colNames, datasetColumns, conceptAttributes, conceptId } = options;
  const conceptColumns =
    conceptId && conceptAttributes
      ? makeQueryColumnsFromConcept({
          conceptId,
          attributes: conceptAttributes,
        })
      : (conceptAttributes ?? []).map((col) => {
          return QueryColumn.makeFromConceptAttribute(col);
        });
  const allQueryColumns = [
    ...(datasetColumns ?? []).map((col) => {
      return QueryColumn.makeFromDatasetColumn(col);
    }),
    ...conceptColumns,
  ];

  return (colNames ?? [])
    .map((name) => {
      return allQueryColumns.find(propEq("baseColumn.name", name));
    })
    .filter(isNonNullish);
}
```

In `src/views/DataExplorerApp/useDataExplorerUrlSync.ts`, replace the `getRestoredColumnsFromUrl({ ... })` call inside `hydrateStateFromUrl` with:

```ts
          const restoredCols = getRestoredColumnsFromUrl({
            colNames: urlState.colNames,
            datasetColumns,
            conceptAttributes,
            conceptId:
              restoredDataSource?.__type === "Concept"
                ? restoredDataSource.id
                : undefined,
          });
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `pnpm test:frontend getRestoredColumnsFromUrl dataExplorerUrlHydration`
Expected: PASS.

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/DataExplorerApp/getRestoredColumnsFromUrl src/views/DataExplorerApp/useDataExplorerUrlSync.ts
git commit -m "feat(case-statuses): restore the status column from a Data Explorer URL" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The legacy concept query path leaves `status` out

**Files:**
- Test: `src/clients/queries/runStructuredQuery/runStructuredQuery.test.ts`
- Modify: `src/clients/queries/runStructuredQuery/runStructuredQueryWithMetadata.ts`

`_runConceptQuery` already narrows its columns with `Model.valIsOfModelType("ConceptAttribute")`, which drops a `ConceptStatusColumn`. This task pins that behavior with a test and documents it, so a later edit that widens the filter cannot pass the status column to `getConceptExtension` as if it were an attribute.

- [ ] **Step 1: Write the test**

Add the import to `runStructuredQuery.test.ts`:

```ts
import { ConceptStatusColumn } from "$/models/queries/ConceptStatusColumn/ConceptStatusColumn";
```

`_createConcept()` in this file was updated by plan 2 to set `defaultStatusId`; use it as it stands. Add inside `describe("runStructuredQuery", ...)`:

```ts
  // The legacy path reads attribute values by attribute id. The status column
  // has no attribute id, so handing it over would ask for a value that cannot
  // exist.
  it("leaves the status column out of the legacy attribute read", async () => {
    const concept = _createConcept();
    const ageAttribute = _createConceptAttribute(concept.id, "age");
    getConceptExtensionMock.mockResolvedValue([{ [ageAttribute.id]: 30 }]);

    const result = await runStructuredQuery({
      auth: "workspace",
      workspaceId,
      query: {
        ...StructuredQuery.makeEmpty(),
        dataSource: concept,
        queryColumns: [
          QueryColumn.makeFromConceptAttribute(ageAttribute),
          QueryColumn.makeFromConceptStatusColumn(
            ConceptStatusColumn.fromConceptId(concept.id),
          ),
        ],
      },
      rawSql: undefined,
      isStructuredQueryInSync: false,
    });

    expect(getConceptExtensionMock).toHaveBeenCalledWith(
      expect.objectContaining({ conceptAttributes: [ageAttribute] }),
    );
    expect(result.columns).toEqual([{ name: "age", dataType: "varchar" }]);
  });
```

- [ ] **Step 2: Run it**

Run: `pnpm test:frontend runStructuredQuery`
Expected: PASS. The skip already exists; to see the test guard it, temporarily replace `.filter(Model.valIsOfModelType("ConceptAttribute"))` with `.filter(() => true)` in `_runConceptQuery`, rerun, and expect FAIL with `conceptAttributes` holding two entries. Restore the filter.

- [ ] **Step 3: Document the skip**

In `runStructuredQueryWithMetadata.ts`, replace:

```ts
  const attributes = sortedQueryColumns
    .map(prop("baseColumn"))
    .filter(Model.valIsOfModelType("ConceptAttribute"));
```

with:

```ts
  // Attributes only. A case type's built-in `status` column has no attribute
  // id to read a value by, so this path leaves it out; SQL-backed queries,
  // which read the concept relation, are the ones that return it.
  const attributes = sortedQueryColumns
    .map(prop("baseColumn"))
    .filter(Model.valIsOfModelType("ConceptAttribute"));
```

- [ ] **Step 4: Commit**

```bash
git add src/clients/queries/runStructuredQuery/runStructuredQuery.test.ts src/clients/queries/runStructuredQuery/runStructuredQueryWithMetadata.ts
git commit -m "test(case-statuses): pin the legacy concept query skipping the status column" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `toCsvRows`, a multi-column CSV writer

**Files:**
- Create: `src/clients/qetl/QueryMediator/conceptRelation/toCsvRows.ts`
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/toCsvColumn.ts`
- Test: `src/lib/sql/__tests__/toCsvRows.executed.test.ts`

- [ ] **Step 1: Write the failing round-trip test**

Create `src/lib/sql/__tests__/toCsvRows.executed.test.ts`:

```ts
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
/**
 * Round-trip tests for the concept spine's multi-column CSV writer.
 *
 * Like `toCsvColumn`'s, these read the text back through DuckDB rather than
 * asserting it: the spine's grain and every record's status depend on the
 * loader agreeing with the writer, not on the writer matching an idea of
 * RFC 4180.
 */
import { toCsvRows } from "@/clients/qetl/QueryMediator/conceptRelation/toCsvRows";
import { withDuckDb } from "../../../../tests/integration/queries/executedDuckDb";

/** Writes the CSV, reads it back through DuckDB, returns the rows. */
async function _roundTrip(
  rows: ReadonlyArray<readonly string[]>,
): Promise<Array<[string | null, string | null]>> {
  const csvText = toCsvRows({ columnNames: ["external_id", "status"], rows });
  const path = join(tmpdir(), `ava-spine-rows-${rows.length}-${csvText.length}.csv`);
  writeFileSync(path, csvText, "utf8");

  return await withDuckDb(async (connection) => {
    const reader = await connection.runAndReadAll(
      `SELECT external_id, status FROM read_csv('${path}', header = true, all_varchar = true)`,
    );
    return reader.getRowObjects().map((row) => {
      return [
        row.external_id === null ? null : String(row.external_id),
        row.status === null ? null : String(row.status),
      ];
    });
  });
}

describe("toCsvRows", () => {
  it("round-trips a status containing a comma beside its id", async () => {
    await expect(
      _roundTrip([["p1", "Closed, no action"]]),
    ).resolves.toEqual([["p1", "Closed, no action"]]);
  });

  it("round-trips quotes and newlines in either column", async () => {
    await expect(
      _roundTrip([['say "hi"', "line1\nline2"]]),
    ).resolves.toEqual([['say "hi"', "line1\nline2"]]);
  });

  // The grain claim: N records in must be N rows out, in order.
  it("preserves the row count and order across awkward values", async () => {
    const rows = [
      ["plain", "Active"],
      ["O'Brien", "Ruled out"],
      ["Brien, O", "Closed, no action"],
      ["a\nb", 'Re-"opened"'],
    ];

    await expect(_roundTrip(rows)).resolves.toEqual(rows);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm test:executed toCsvRows`
Expected: FAIL. Vitest cannot resolve `@/clients/qetl/QueryMediator/conceptRelation/toCsvRows`.

- [ ] **Step 3: Implement `toCsvRows` and make `toCsvColumn` use it**

Create `src/clients/qetl/QueryMediator/conceptRelation/toCsvRows.ts`:

```ts
function _quoteCsvField(value: string): string {
  // The empty case is quoted deliberately, and it is not cosmetic. An empty
  // field written bare in a one-column file produces a line with no
  // characters, which DuckDB reads as a blank line and skips, so an empty
  // `external_id` would silently drop an individual and change the relation's
  // grain. `""` is unambiguous. Caught by the round-trip test rather than by
  // inspection, which is why that test reads the values back through a real
  // CSV parser instead of asserting the text.
  const needsQuoting =
    value === "" ||
    value.includes('"') ||
    value.includes(",") ||
    value.includes("\n") ||
    value.includes("\r");
  return needsQuoting ? `"${value.replaceAll('"', '""')}"` : value;
}

/**
 * Renders rows of values, under a header row, as RFC 4180 CSV text.
 *
 * This exists so a concept's spine can reach DuckDB without any user data
 * entering a SQL string. `external_id` and status names are user-supplied, and
 * the one place the codebase interpolates such a value into SQL today
 * (`AttributeAssertionClient`, `WHERE "<pk>" = '<externalId>'`) is an injection
 * surface. Loading the spine as a registered CSV file avoids adding a second
 * one, which is why this is a CSV writer rather than a `VALUES` builder.
 *
 * RFC 4180 quoting and nothing more: double every `"`, and wrap a field in
 * quotes when it is empty or contains a quote, a comma, a carriage return or a
 * newline. Header names are quoted by the same rule.
 */
export function toCsvRows(
  options: Readonly<{
    columnNames: readonly string[];
    rows: ReadonlyArray<readonly string[]>;
  }>,
): string {
  return [options.columnNames, ...options.rows]
    .map((fields) => {
      return fields.map(_quoteCsvField).join(",");
    })
    .join("\n");
}
```

Replace `src/clients/qetl/QueryMediator/conceptRelation/toCsvColumn.ts` with:

```ts
import { toCsvRows } from "@/clients/qetl/QueryMediator/conceptRelation/toCsvRows";

/**
 * Renders one column of values as RFC 4180 CSV text, with the quoting rules
 * of `toCsvRows`.
 */
export function toCsvColumn(
  columnName: string,
  values: readonly string[],
): string {
  return toCsvRows({
    columnNames: [columnName],
    rows: values.map((value) => {
      return [value];
    }),
  });
}
```

- [ ] **Step 4: Run both round-trip suites**

Run: `pnpm test:executed toCsvRows toCsvColumn`
Expected: PASS, all tests in both files. `toCsvColumn`'s output is unchanged for every input its suite uses, because the header `external_id` needs no quoting.

- [ ] **Step 5: Commit**

```bash
git add src/clients/qetl/QueryMediator/conceptRelation/toCsvRows.ts src/clients/qetl/QueryMediator/conceptRelation/toCsvColumn.ts src/lib/sql/__tests__/toCsvRows.executed.test.ts
git commit -m "feat(case-statuses): add a multi-column CSV writer for concept spines" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The spine carries each record's status name

**Files:**
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/conceptRelation.types.ts`
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql.ts`
- Test: `src/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql.test.ts`
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/loadConceptSpine/loadConceptSpine.ts`
- Test: `src/clients/qetl/QueryMediator/conceptRelation/loadConceptSpine/loadConceptSpine.test.ts`
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/loadConceptRelations.ts`
- Modify: `src/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery.test.ts`
- Modify: `src/clients/qetl/QueryMediator/__tests__/QueryMediator.concepts.test.ts`
- Modify: `src/clients/qetl/QueryMediator/expandRelationRefs/expandRelationRefs.test.ts`

`getConceptRelationPlansFromSql` lives in `src/` and runs only in the browser and desktop renderer, so it reads statuses with `ConceptStatusClient.getAll` directly. It must stay a plain `getAll` (not `withCache`), like the `IndividualClient.getAll` beside it, so a status renamed a moment ago shows in the next query.

- [ ] **Step 1: Write the failing plan tests**

In `getConceptRelationPlansFromSql.test.ts`:

Add `conceptStatusGetAllMock` to the `vi.hoisted` block:

```ts
const {
  conceptAttributeGetAllMock,
  getAllAttributeMappingsMock,
  datasetColumnGetAllMock,
  individualGetAllMock,
  conceptStatusGetAllMock,
} = vi.hoisted(() => {
  return {
    conceptAttributeGetAllMock: vi.fn(),
    getAllAttributeMappingsMock: vi.fn(),
    datasetColumnGetAllMock: vi.fn(),
    individualGetAllMock: vi.fn(),
    conceptStatusGetAllMock: vi.fn(),
  };
});
```

Add the mock after the `IndividualClient` mock:

```ts
vi.mock("@/clients/ontology/ConceptStatusClient", () => {
  return { ConceptStatusClient: { getAll: conceptStatusGetAllMock } };
});
```

Add constants after `WORKSPACE_ID`:

```ts
const ACTIVE_STATUS_ID = "11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const RULED_OUT_STATUS_ID = "22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
```

Replace the `individualGetAllMock.mockResolvedValue([...])` line in `beforeEach` with:

```ts
  individualGetAllMock.mockResolvedValue([
    { id: "ind-1", externalId: "p1", statusId: ACTIVE_STATUS_ID },
    { id: "ind-2", externalId: "p2", statusId: RULED_OUT_STATUS_ID },
  ]);
  conceptStatusGetAllMock.mockResolvedValue([
    { id: ACTIVE_STATUS_ID, name: "Active" },
    { id: RULED_OUT_STATUS_ID, name: "Ruled out" },
  ]);
```

In `it("reads nothing at all ...")`, add after the last `expect`:

```ts
    expect(conceptStatusGetAllMock).not.toHaveBeenCalled();
```

In `it("plans a concept the caller is allowed to read", ...)`, replace `expect(plans[0]?.externalIds).toEqual(["p1", "p2"]);` with:

```ts
    expect(
      plans[0]?.spineRows.map((row) => {
        return row.externalId;
      }),
    ).toEqual(["p1", "p2"]);
```

In `it("refuses a concept whose contributing dataset is out of reach", ...)`, add after the last `expect`:

```ts
    expect(conceptStatusGetAllMock).not.toHaveBeenCalled();
```

Add two tests at the end of the `describe`:

```ts
  it("names each record's status in its spine row", async () => {
    const { getConceptRelationPlansFromSql } =
      await import("@/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql");

    const plans = await getConceptRelationPlansFromSql({
      rawSql: `SELECT * FROM "concept_${CONCEPT_ID}"`,
      allowlist: _permissiveAllowlist(),
    });

    expect(plans[0]?.spineRows).toEqual([
      { externalId: "p1", statusName: "Active" },
      { externalId: "p2", statusName: "Ruled out" },
    ]);
    expect(conceptStatusGetAllMock).toHaveBeenCalledTimes(1);
  });

  // The composite foreign key on `individuals` rules this state out, so seeing
  // it means the set was saved between the two reads. A NULL status would
  // misreport the record, so the query fails and a retry sees both agree.
  it("refuses a record whose status is not one of the concept's statuses", async () => {
    const { getConceptRelationPlansFromSql } =
      await import("@/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql");
    conceptStatusGetAllMock.mockResolvedValue([
      { id: ACTIVE_STATUS_ID, name: "Active" },
    ]);

    await expect(
      getConceptRelationPlansFromSql({
        rawSql: `SELECT * FROM "concept_${CONCEPT_ID}"`,
        allowlist: _permissiveAllowlist(),
      }),
    ).rejects.toThrow(/is not one of the concept's statuses/);
  });
```

- [ ] **Step 2: Write the failing spine tests**

In `loadConceptSpine.test.ts`, replace the four `loadConceptSpine` tests' inputs and expectations:

Replace the first test with:

```ts
  it("loads each record's id and status as CSV text, both pinned to VARCHAR", async () => {
    const { loadConceptSpine } =
      await import("@/clients/qetl/QueryMediator/conceptRelation/loadConceptSpine/loadConceptSpine");

    const spineTableName = await loadConceptSpine({
      ref: CONCEPT_REF,
      spineRows: [
        { externalId: "p1", statusName: "Active" },
        { externalId: "Brien, O", statusName: "Closed, no action" },
      ],
      datasetDuckDbLease: LEASE,
    });

    expect(spineTableName).toBe(SPINE_TABLE);
    expect(loadCsvMock).toHaveBeenCalledWith({
      tableName: SPINE_TABLE,
      fileText:
        'external_id,status\np1,Active\n"Brien, O","Closed, no action"',
      columns: [
        ["external_id", "VARCHAR"],
        ["status", "VARCHAR"],
      ],
      datasetDuckDbLease: LEASE,
    });
  });
```

In `it("refuses an empty external id ...")`, replace `externalIds: ["p1", "", "p3"],` with:

```ts
        spineRows: [
          { externalId: "p1", statusName: "Active" },
          { externalId: "", statusName: "Active" },
          { externalId: "p3", statusName: "Active" },
        ],
```

Rename `it("creates an empty typed spine for a concept with no individuals", ...)` to `it("creates an empty spine with both typed columns for a concept with no individuals", ...)`, replace its `externalIds: [],` with `spineRows: [],`, and replace its `runRawQueryMock` expectation with:

```ts
    expect(runRawQueryMock).toHaveBeenCalledWith(
      `CREATE TABLE "${SPINE_TABLE}" ("external_id" VARCHAR, "status" VARCHAR)`,
      { datasetDuckDbLease: LEASE },
    );
```

In `it("emits DDL the SQL analyzer accepts ...")`, replace `externalIds: [],` with `spineRows: [],`.

- [ ] **Step 3: Run them to see them fail**

Run: `pnpm test:frontend getConceptRelationPlansFromSql loadConceptSpine`
Expected: FAIL. `plans[0]?.spineRows` is undefined, and `loadConceptSpine` reads `options.externalIds` (TypeError on `.filter` of undefined).

- [ ] **Step 4: Change the plan type**

In `conceptRelation.types.ts`, add above `ConceptRelationPlan`:

```ts
/** One record of a concept, as its spine loads it. */
export type ConceptSpineRow = {
  externalId: string;
  /** The record's status name, which the view exposes as `status`. */
  statusName: string;
};
```

and replace

```ts
  /** The concept's individuals, which become the spine's rows. */
  externalIds: string[];
```

with

```ts
  /** The concept's individuals, which become the spine's rows. */
  spineRows: ConceptSpineRow[];
```

- [ ] **Step 5: Build spine rows in the planner**

In `getConceptRelationPlansFromSql.ts`, add the imports:

```ts
import { ConceptStatusClient } from "@/clients/ontology/ConceptStatusClient";
import type { ConceptSpineRow } from "@/clients/qetl/QueryMediator/conceptRelation/conceptRelation.types";
```

Add this helper above `_getConceptRelationPlan`:

```ts
/**
 * One concept's records as spine rows, each carrying its status name.
 *
 * The statuses are read once and matched to records in memory. A record
 * whose status is not among them fails the query rather than loading a NULL
 * status: the composite foreign key on `individuals` rules that state out, so
 * it means the status set was saved between the two reads, and a retry sees
 * both agree.
 *
 * Both reads are plain `getAll` calls, so a status renamed a moment ago shows
 * in the next query.
 */
async function _getSpineRows(conceptId: Concept.Id): Promise<ConceptSpineRow[]> {
  const [individuals, statuses] = await Promise.all([
    IndividualClient.getAll(where("concept_id", "eq", conceptId)),
    ConceptStatusClient.getAll(where("concept_id", "eq", conceptId)),
  ]);
  const statusesById = makeIdLookupRecord(statuses, { key: "id" });
  return individuals.map((individual) => {
    const status = statusesById[individual.statusId];
    if (!status) {
      throw new Error(
        `Record '${individual.id}' of concept '${conceptId}' has status ` +
          `'${individual.statusId}', which is not one of the concept's ` +
          `statuses. Run the query again.`,
      );
    }
    return { externalId: individual.externalId, statusName: status.name };
  });
}
```

In `_getConceptRelationPlan`, replace

```ts
  const individuals = await IndividualClient.getAll(
    where("concept_id", "eq", options.ref.id),
  );

  return {
    ref: options.ref,
    contributingDatasetIds: columns.contributingDatasetIds,
    externalIds: individuals.map(prop("externalId")),
    attributeColumns: columns.attributeColumns,
  };
```

with

```ts
  return {
    ref: options.ref,
    contributingDatasetIds: columns.contributingDatasetIds,
    spineRows: await _getSpineRows(options.ref.id),
    attributeColumns: columns.attributeColumns,
  };
```

`prop` stays imported: `_getConceptRefsFromSql` still uses it.

- [ ] **Step 6: Load two spine columns**

In `loadConceptSpine.ts`, add the imports:

```ts
import { ConceptStatusColumn } from "$/models/queries/ConceptStatusColumn/ConceptStatusColumn";
import { toCsvRows } from "@/clients/qetl/QueryMediator/conceptRelation/toCsvRows";
import type { ConceptSpineRow } from "@/clients/qetl/QueryMediator/conceptRelation/conceptRelation.types";
```

and remove the `toCsvColumn` import.

Replace the constants block and its docstring:

```ts
/**
 * The spine table's name suffix, and the two columns it carries.
 *
 * `concept_<id>__individuals` deliberately keeps the `concept_` prefix:
 * `RelationRef.fromTableName` strips that prefix and then tests
 * `<id>__individuals` for UUID shape, which fails, so the spine resolves to
 * `undefined` rather than to the concept it belongs to. A name that resolved to
 * a relation would make the SQL analyzer treat the spine as a queryable
 * relation and try to load it.
 *
 * The status column takes the Data Explorer column's name, so the spine, the
 * view, and the column a user picks all say `status`.
 */
const SPINE_TABLE_SUFFIX = "__individuals";
const SPINE_KEY_COLUMN = "external_id";
const SPINE_STATUS_COLUMN = ConceptStatusColumn.COLUMN_NAME;
```

Replace `_assertExternalIdsLoadable`'s signature and first statement:

```ts
function _assertExternalIdsLoadable(
  options: Readonly<{
    spineRows: readonly ConceptSpineRow[];
    ref: ConceptRelationRef;
  }>,
): void {
  const emptyIdCount = options.spineRows.filter((row) => {
    return row.externalId === "";
  }).length;
```

(the rest of the function is unchanged).

In `_createEmptyConceptSpine`, replace the `runRawQuery` call with:

```ts
  await DuckDbClient.runRawQuery(
    `CREATE TABLE ${quoteSqlIdentifier(options.spineTableName)} ` +
      `(${quoteSqlIdentifier(SPINE_KEY_COLUMN)} VARCHAR, ` +
      `${quoteSqlIdentifier(SPINE_STATUS_COLUMN)} VARCHAR)`,
    { datasetDuckDbLease: options.datasetDuckDbLease },
  );
```

In `loadConceptSpine`'s docstring, replace the paragraph that begins "The key column is pinned to `VARCHAR`" with:

```ts
 * Both columns are pinned to `VARCHAR` rather than sniffed. The key because
 * `individuals.external_id` is `text` in Postgres and a sniffed type would vary
 * with the data: all-numeric ids would arrive as `BIGINT` on one concept and as
 * `VARCHAR` on the next. Every comparison against a dataset's key column casts
 * both sides to text (`getEntityKeyComparisonSql`), so a pinned `VARCHAR` is
 * the type that makes those comparisons mean what Postgres means. The status
 * because it is a name, whatever it looks like.
```

Replace the function's options and body:

```ts
export async function loadConceptSpine(
  options: Readonly<{
    ref: ConceptRelationRef;
    spineRows: readonly ConceptSpineRow[];
    datasetDuckDbLease: DatasetDuckDbLease;
  }>,
): Promise<string> {
  _assertExternalIdsLoadable(options);
  const spineTableName = getConceptSpineTableNameFromRef(options.ref);

  if (options.spineRows.length === 0) {
    await _createEmptyConceptSpine({
      spineTableName,
      datasetDuckDbLease: options.datasetDuckDbLease,
    });
    return spineTableName;
  }

  await DuckDbClient.loadCsv({
    tableName: spineTableName,
    fileText: toCsvRows({
      columnNames: [SPINE_KEY_COLUMN, SPINE_STATUS_COLUMN],
      rows: options.spineRows.map((row) => {
        return [row.externalId, row.statusName];
      }),
    }),
    columns: [
      [SPINE_KEY_COLUMN, "VARCHAR"],
      [SPINE_STATUS_COLUMN, "VARCHAR"],
    ],
    datasetDuckDbLease: options.datasetDuckDbLease,
  });
  return spineTableName;
}
```

In `loadConceptRelations.ts`, replace `externalIds: options.plan.externalIds,` with `spineRows: options.plan.spineRows,`.

- [ ] **Step 7: Update the other plan fixtures**

In `getNeededColumnsFromQuery.test.ts` and `__tests__/QueryMediator.concepts.test.ts`, replace `externalIds: ["p1"],` with:

```ts
  spineRows: [{ externalId: "p1", statusName: "Active" }],
```

In `expandRelationRefs.test.ts`, replace `externalIds: [],` with `spineRows: [],`.

- [ ] **Step 8: Run the QETL tests**

Run: `pnpm test:frontend conceptRelation getNeededColumnsFromQuery QueryMediator.concepts expandRelationRefs`
Expected: PASS.

Run: `pnpm type-check`
Expected: PASS. Any remaining `externalIds` reference is a compile error; fix it the same way.

- [ ] **Step 9: Commit**

```bash
git add src/clients/qetl/QueryMediator/conceptRelation/conceptRelation.types.ts src/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql src/clients/qetl/QueryMediator/conceptRelation/loadConceptSpine src/clients/qetl/QueryMediator/conceptRelation/loadConceptRelations.ts src/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery.test.ts src/clients/qetl/QueryMediator/__tests__/QueryMediator.concepts.test.ts src/clients/qetl/QueryMediator/expandRelationRefs/expandRelationRefs.test.ts
git commit -m "feat(case-statuses): load each record's status name into the concept spine" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The concept view exposes `status`

**Files:**
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql.ts`
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata.ts`
- Test: `src/lib/sql/__tests__/buildConceptViewSql.executed.test.ts`
- Test: `src/lib/sql/__tests__/conceptAttributeColumns.executed.test.ts`

- [ ] **Step 1: Give both executed suites' spines a status column and write the failing tests**

In `buildConceptViewSql.executed.test.ts`:

Replace the spine statement at the end of `_seed` with:

```ts
    CREATE TABLE "${SPINE}" AS
      SELECT * FROM (VALUES
        ('p1', 'Suspected'),
        ('p2', 'Confirmed'),
        ('p3', 'Suspected')
      ) AS t(external_id, status);
```

Update the row expectations that assert whole rows:

| Test | New expectation |
| --- | --- |
| "keeps an individual no dataset contributes to, with NULL attributes" | `expect(rows[2]).toEqual({ external_id: "p3", status: "Suspected", age: null, region: null });` |
| "resolves `first` deterministically when a key has several rows" | `expect(rows[0]).toEqual({ external_id: "p1", status: "Suspected", age: 41 });` |
| "breaks a `most_frequent` tie by value rather than arbitrarily" | `expect(rows[1]).toEqual({ external_id: "p2", status: "Confirmed", region: "East" });` |
| "collects array attributes in row order and empties to a list" | `{ external_id: "p1", status: "Suspected", tags: ["blue", "green"] }`, `{ external_id: "p2", status: "Confirmed", tags: ["red"] }`, `{ external_id: "p3", status: "Suspected", tags: [] }` |
| "emits an unmapped attribute as a typed NULL column" | `expect(rows[0]).toEqual({ external_id: "p1", status: "Suspected", note: null });` |

Add two tests at the end of the `describe`:

```ts
  // Every case type's relation has a `status` column, read from the spine,
  // whatever attributes it has. This is the column the Data Explorer offers.
  it("exposes each record's status as the status column", async () => {
    const rows = await _queryView([]);

    expect(rows).toEqual([
      { external_id: "p1", status: "Suspected" },
      { external_id: "p2", status: "Confirmed" },
      { external_id: "p3", status: "Suspected" },
    ]);
  });

  // An attribute column named `status` would give the view two columns of one
  // name, which does not compile. The spine's column wins.
  it("keeps the spine's status when an attribute column is named status", async () => {
    const rows = await _queryView([
      { kind: "unmapped", attributeName: "status", duckDbDataType: "VARCHAR" },
    ]);

    expect(rows[1]).toEqual({ external_id: "p2", status: "Confirmed" });
  });
```

In `conceptAttributeColumns.executed.test.ts`:

Replace the spine statement at the end of `_seed` with:

```ts
    CREATE TABLE "${SPINE}" AS
      SELECT
        CAST(external_id AS VARCHAR) AS external_id,
        CAST(status AS VARCHAR) AS status
      FROM (VALUES ('101', 'Active'), ('102', 'Active'), ('103', 'Inactive'))
        AS t(external_id, status);
```

In `it("matches a non-numeric external id against a numeric key column", ...)`, replace its `CREATE OR REPLACE TABLE` statement with:

```ts
        CREATE OR REPLACE TABLE "${SPINE}" AS
          SELECT
            CAST(external_id AS VARCHAR) AS external_id,
            CAST(status AS VARCHAR) AS status
          FROM (VALUES ('101', 'Active'), ('x-9', 'Active'))
            AS t(external_id, status);
```

In `it("reads every attribute against its own dataset and key column", ...)`, add `status: "Active"` to the `101` and `102` rows and `status: "Inactive"` to the `103` row. In `it("suffixes a duplicate attribute name ...")`, replace the `rows[0]` expectation with:

```ts
    expect(rows[0]).toEqual({
      external_id: "101",
      status: "Active",
      age: 41,
      age_2: 41,
      person_id: 101,
    });
```

Add a test at the end of the `describe`:

```ts
  // `status` belongs to the built-in column the view reads from the spine. An
  // attribute of that name is suffixed, so both survive and neither shadows
  // the other.
  it("suffixes an attribute named status so the built-in status keeps its name", async () => {
    const statusAttribute = _attribute({
      name: "status",
      mappingType: "manual_entry",
    });
    const metadata = _metadata({
      attributes: [PERSON_ID, statusAttribute],
      mappings: [PERSON_ID_MAPPING],
    });

    const columns = makeConceptAttributeColumnsFromMetadata(metadata);
    const rows = await _queryConcept(metadata);

    expect(columns.renamedColumns).toEqual([
      {
        attributeId: statusAttribute.id,
        requestedName: "status",
        emittedName: "status_2",
      },
    ]);
    expect(rows[0]).toEqual({
      external_id: "101",
      status: "Active",
      status_2: null,
      person_id: 101,
    });
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm test:executed buildConceptViewSql conceptAttributeColumns`
Expected: FAIL. Rows lack `status` (the view does not select it), and the `status` attribute is emitted unsuffixed.

- [ ] **Step 3: Select `status` in the view**

In `buildConceptViewSql.ts`, add the import:

```ts
import { ConceptStatusColumn } from "$/models/queries/ConceptStatusColumn/ConceptStatusColumn";
```

Replace the constants:

```ts
/** The spine's alias inside the view, and the columns it exposes. */
const SPINE_ALIAS = "individuals";
const EXTERNAL_ID_COLUMN = "external_id";
const STATUS_COLUMN = ConceptStatusColumn.COLUMN_NAME;
```

Replace the `selectors` array with:

```ts
  const selectors = [
    // The spine's key is exposed as a column because it is the join key two
    // concepts share when their identifier attributes are named differently,
    // which the joined-concepts criterion needs.
    `${SPINE_ALIAS}.${quoteSqlIdentifier(EXTERNAL_ID_COLUMN)} AS ${quoteSqlIdentifier(EXTERNAL_ID_COLUMN)}`,
    // Every record's status name: the case type's built-in `status` column.
    `${SPINE_ALIAS}.${quoteSqlIdentifier(STATUS_COLUMN)} AS ${quoteSqlIdentifier(STATUS_COLUMN)}`,
    ...orderedColumns
      .filter((column) => {
        // An attribute already named `external_id` or `status` would collide
        // with a spine column above. The spine wins: a join depends on the
        // key, and every case type's status is that column.
        return (
          column.attributeName !== EXTERNAL_ID_COLUMN &&
          column.attributeName !== STATUS_COLUMN
        );
      })
      .map(_buildColumnSelector),
  ];
```

- [ ] **Step 4: Reserve the name in column resolution**

In `makeConceptAttributeColumnsFromMetadata.ts`, add the import:

```ts
import { ConceptStatusColumn } from "$/models/queries/ConceptStatusColumn/ConceptStatusColumn";
```

Replace `const takenNames = new Set<string>();` with:

```ts
  // Seeded with the built-in status column's name, which the view reads from
  // the spine, so an attribute of that name is suffixed rather than dropped.
  // The `concept_attributes__name_not_reserved` check keeps such attributes
  // out of the database; this guards rows that predate it.
  const takenNames = new Set<string>([ConceptStatusColumn.COLUMN_NAME]);
```

- [ ] **Step 5: Run the executed suites to see them pass**

Run: `pnpm test:executed buildConceptViewSql conceptAttributeColumns toCsvColumn toCsvRows`
Expected: PASS. "emits SQL the analyzer can only accept as trusted internal SQL" and "emits columns in a stable order" still pass unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql.ts src/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata.ts src/lib/sql/__tests__/buildConceptViewSql.executed.test.ts src/lib/sql/__tests__/conceptAttributeColumns.executed.test.ts
git commit -m "feat(case-statuses): expose status in every concept relation" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Structured queries filter and group a case type by `status`

**Files:**
- Modify: `tests/integration/queries/StructuredQueryTestFixtures.ts`
- Test: `tests/integration/queries/structuredQueryConcepts.executed.test.ts`

- [ ] **Step 1: Add the status column to the fixture concept and a fixture builder**

In `StructuredQueryTestFixtures.ts`, add the import:

```ts
import { ConceptStatusColumn } from "$/models/queries/ConceptStatusColumn/ConceptStatusColumn";
```

Replace the concept table in `_FIXTURE_SQL` with:

```ts
  CREATE TABLE "${_CONCEPT_TABLE_NAME}" AS SELECT * FROM (VALUES
    ('p1', 'North', 5, 'Confirmed'),
    ('p2', 'North', 2, 'Suspected'),
    ('p3', 'South', 3, 'Confirmed'),
    ('p4', 'East', 1, 'Ruled out')
  ) AS t(external_id, region, headcount, status);
```

Add after `_makeConceptAttributeColumn`:

```ts
/**
 * A query column over the fixture concept's built-in `status` column, built
 * with the same `ConceptStatusColumn.fromConceptId` the Data Explorer uses, so
 * its name is the one the concept view emits.
 */
function _makeConceptStatusColumn(args: {
  id: string;
  aggregation?: QueryAggregationTypeT;
}): QueryColumnRead {
  return Model.make("QueryColumn", {
    id: args.id as QueryColumnId,
    baseColumn: ConceptStatusColumn.fromConceptId(_CONCEPT_ID as Concept.Id),
    aggregation: args.aggregation,
  });
}
```

Add `_makeConceptStatusColumn,` to the exported `StructuredQueryTestFixtures` object, after `_makeConceptAttributeColumn,`.

- [ ] **Step 2: Write the tests**

In `structuredQueryConcepts.executed.test.ts`, add `_makeConceptStatusColumn,` to the destructured fixtures, then append:

```ts
it("groups a Concept's records by status", async () => {
  const status = _makeConceptStatusColumn({
    id: "qc_1_status",
    aggregation: "group_by",
  });
  const records = _makeConceptAttributeColumn({
    id: "qc_2_region",
    name: "region",
    aggregation: "count",
  });

  const sql = structuredQueryToSql(
    _makeQuery({
      dataSource: _makeConcept(),
      columns: [status, records],
      orderByColumn: status.id,
      orderByDirection: "asc",
    }),
  );

  await expect(_runQuery(sql)).resolves.toEqual([
    { status: "Confirmed", "count(region)": 2 },
    { status: "Ruled out", "count(region)": 1 },
    { status: "Suspected", "count(region)": 1 },
  ]);
});

it("filters a Concept's records by status", async () => {
  const externalId = _makeConceptAttributeColumn({
    id: "qc_1_external_id",
    name: "external_id",
  });
  const status = _makeConceptStatusColumn({ id: "qc_2_status" });

  const sql = structuredQueryToSql(
    _makeQuery({
      dataSource: _makeConcept(),
      columns: [externalId],
      sourceColumns: [externalId, status],
      filters: {
        type: "group",
        combinator: "AND",
        rules: [
          {
            type: "rule",
            columnId: status.id,
            operator: "=",
            value: "Confirmed",
          },
        ],
      },
      orderByColumn: externalId.id,
      orderByDirection: "asc",
    }),
  );

  await expect(_runQuery(sql)).resolves.toEqual([
    { external_id: "p1" },
    { external_id: "p3" },
  ]);
});
```

- [ ] **Step 3: Run them**

Run: `pnpm test:executed structuredQueryConcepts structuredQueryExecution structuredQueryRoundTrip queryColumnBindings`
Expected: PASS. The existing concept cases select explicit columns, so the extra fixture column changes none of their rows. If `_makeConceptStatusColumn` does not compile without a cast, the `Model.make` return is missing a field `QueryColumnRead` requires; do not cast, fix the field.

These pass on first run because Tasks 1 and 7 built the behavior; they are the executed coverage §12 asks for. To see them guard it, temporarily rename the fixture table's `status` column to `state`, rerun, and expect FAIL with `Binder Error: Referenced column "status" not found`. Revert.

- [ ] **Step 4: Commit**

```bash
git add tests/integration/queries/StructuredQueryTestFixtures.ts tests/integration/queries/structuredQueryConcepts.executed.test.ts
git commit -m "test(case-statuses): filter and group a case type by status in executed queries" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Chat's online schema lists each case type's statuses

**Files:**
- Modify: `shared/models/chat/SqlTableAlias/SqlTableAlias.types.ts`
- Modify: `shared/models/chat/SqlTableAlias/SqlTableAlias.ts`
- Modify: `shared/models/chat/SqlTableAlias/SqlTableAliasModule.ts`
- Test: `shared/models/chat/SqlTableAlias/SqlTableAlias.test.ts`
- Modify: `supabase/functions/chat/PostChatMessages/schema/fetchWorkspaceSchema.ts`
- Test: `supabase/functions/chat/PostChatMessages/schema/fetchWorkspaceSchema.test.ts`
- Modify: `supabase/functions/chat/utils/buildSqlSystemPrompt/buildSqlSystemPrompt.ts`
- Test: `supabase/functions/chat/utils/buildSqlSystemPrompt/buildSqlSystemPrompt.test.ts`
- Modify: `supabase/functions/chat/PostChatMessages/PostChatMessages.ts`
- Modify: `supabase/functions/queries/QueriesRoutes.ts`

- [ ] **Step 1: Confirm the edge function can import the `ConceptStatus` model**

`SqlTableAliasModule` and the parser in Task 11 run in the `chat` edge function. Run:

```bash
grep -rhE '^import|^} from|^export .* from' shared/models/ontology/ConceptStatus | sed -E 's/.*from "([^"]+)".*/\1/' | sort -u
```

Expected: every specifier is `$/...`, `@avandar/models`, `@avandar/clients`, `@avandar/utils`, `@avandar/utils/zod`, `@utils/...`, `@models/...`, `zod`, `type-fest` or `ts-pattern`. All of these are mapped in `supabase/functions/chat/deno.json`. If any other bare specifier appears (for example `uuid`), stop: the edge function cannot bundle it. Report it and move that import out of the model (the default set's ids belong in `src/`, as `makeDefaultStatusDrafts` already is).

- [ ] **Step 2: Write the failing schema-line tests**

In `shared/models/chat/SqlTableAlias/SqlTableAlias.test.ts`, add to `describe("SqlTableAlias.formatSchemaBlock", ...)`:

```ts
  it("lists a case type's statuses in position order after its attributes", () => {
    const aliases = SqlTableAlias.fromConcepts([
      { id: CONCEPT_B.id, name: "Cholera case" },
    ]);
    const block = SqlTableAlias.formatSchemaBlock({
      aliases,
      columns: [],
      conceptAttributes: [
        { concept_id: CONCEPT_B.id, name: "age" },
        { concept_id: CONCEPT_B.id, name: "district" },
      ],
      conceptStatuses: [
        { concept_id: CONCEPT_B.id, name: "Ruled out", position: 2 },
        { concept_id: CONCEPT_B.id, name: "Suspected", position: 0 },
        { concept_id: CONCEPT_B.id, name: "Confirmed", position: 1 },
      ],
    });

    expect(block).toBe(
      "- c0: Cholera case (age, district, status: Suspected | Confirmed | Ruled out)",
    );
  });

  it("lists the status field alone for a case type with no attributes", () => {
    const aliases = SqlTableAlias.fromConcepts([CONCEPT_B]);
    const block = SqlTableAlias.formatSchemaBlock({
      aliases,
      columns: [],
      conceptStatuses: [
        { concept_id: CONCEPT_B.id, name: "Active", position: 0 },
        { concept_id: CONCEPT_B.id, name: "Inactive", position: 1 },
      ],
    });

    expect(block).toBe("- c0: Case (status: Active | Inactive)");
  });
```

In `fetchWorkspaceSchema.test.ts`, add:

```ts
  it("returns each case type's status names and positions", async () => {
    const fake = createFakeClient({
      datasets: [],
      dataset_columns: [],
      concepts: [{ id: CONCEPT_ID, name: "Case" }],
      concept_attributes: [],
      concept_statuses: [
        { concept_id: CONCEPT_ID, name: "Suspected", position: 0 },
        { concept_id: CONCEPT_ID, name: "Confirmed", position: 1 },
      ],
    });

    const schema = await fetchWorkspaceSchema({
      supabaseClient: fake.supabaseClient,
      workspaceId: WORKSPACE_ID,
    });

    expect(schema.conceptStatuses).toEqual([
      { concept_id: CONCEPT_ID, name: "Suspected", position: 0 },
      { concept_id: CONCEPT_ID, name: "Confirmed", position: 1 },
    ]);
  });
```

Rename `it("does not query concept attributes when the workspace has no concepts", ...)` to `it("does not query concept attributes or statuses when the workspace has no concepts", ...)` and add at its end:

```ts
    expect(schema.conceptStatuses).toEqual([]);
    expect(fake.queriedTables).not.toContain("concept_statuses");
```

In `buildSqlSystemPrompt.test.ts`, add:

```ts
  it("lists a case type's allowed statuses in the schema block", () => {
    const conceptId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const prompt = buildSqlSystemPrompt({
      prompt: "how many confirmed cases",
      datasets: [],
      columns: [],
      concepts: [{ id: conceptId, name: "Cholera case" }],
      conceptAttributes: [{ concept_id: conceptId, name: "district" }],
      conceptStatuses: [
        { concept_id: conceptId, name: "Suspected", position: 0 },
        { concept_id: conceptId, name: "Confirmed", position: 1 },
      ],
    });

    expect(prompt).toContain(
      "- c0: Cholera case (district, status: Suspected | Confirmed)",
    );
  });
```

- [ ] **Step 3: Run them to see them fail**

Run: `pnpm test:frontend SqlTableAlias fetchWorkspaceSchema buildSqlSystemPrompt`
Expected: FAIL. The block has no status field, `schema.conceptStatuses` is undefined, and `conceptStatuses` is not an accepted option.

- [ ] **Step 4: Add the type and print the field**

In `SqlTableAlias.types.ts`, append:

```ts
/** One status of a concept, listed after its attributes in the schema block. */
export type SqlTableAliasConceptStatus = {
  concept_id: string;
  name: string;
  position: number;
};
```

In `SqlTableAlias.ts`, add `SqlTableAliasConceptStatus` to the type import and to the namespace:

```ts
  export type ConceptStatus = SqlTableAliasConceptStatus;
```

In `SqlTableAliasModule.ts`, add the imports:

```ts
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus.ts";
```

and add `SqlTableAliasConceptStatus` to the `SqlTableAlias.types.ts` type import. Add this helper above `_formatSchemaBlock`:

```ts
/**
 * The `status: A | B` field for one concept, in position order, or nothing
 * for a concept with no statuses. It tells the model the values `status` can
 * hold, so a filter matches a real status name.
 */
function _buildStatusFields(
  statuses: readonly SqlTableAliasConceptStatus[],
): string[] {
  if (statuses.length === 0) {
    return [];
  }
  const names = ConceptStatus.sortByPosition(statuses).map((status) => {
    return status.name;
  });
  return [`status: ${names.join(" | ")}`];
}
```

Replace `_formatSchemaBlock` with:

```ts
function _formatSchemaBlock(
  args: Readonly<{
    aliases: readonly SqlTableAliasT[];
    columns: readonly SchemaColumn[];
    conceptAttributes?: readonly SqlTableAliasConceptAttribute[];
    conceptStatuses?: readonly SqlTableAliasConceptStatus[];
  }>,
): string {
  const namesByDatasetId = makeBucketMap(args.columns, {
    key: "dataset_id",
    valueKey: "name",
  });
  const namesByConceptId = makeBucketMap(args.conceptAttributes ?? [], {
    key: "concept_id",
    valueKey: "name",
  });
  const statusesByConceptId = makeBucketMap(args.conceptStatuses ?? [], {
    key: "concept_id",
  });
  return args.aliases
    .map((entry) => {
      const names =
        entry.kind === "dataset"
          ? (namesByDatasetId.get(entry.datasetId) ?? [])
          : [
              ...(namesByConceptId.get(entry.conceptId) ?? []),
              ..._buildStatusFields(
                statusesByConceptId.get(entry.conceptId) ?? [],
              ),
            ];
      return _formatAliasLine(entry, names);
    })
    .join("\n");
}
```

Update the module's `formatSchemaBlock` docstring to:

```ts
  /**
   * One line per alias with column or attribute names, and for a concept its
   * allowed statuses.
   */
  formatSchemaBlock: _formatSchemaBlock,
```

- [ ] **Step 5: Read statuses online**

In `fetchWorkspaceSchema.ts`, add the type after `ConceptAttribute`:

```ts
export type ConceptStatus = {
  concept_id: string;
  name: string;
  position: number;
};
```

Add `conceptStatuses: ConceptStatus[];` to `WorkspaceChatSchema`, with the docstring changed to `/** Datasets, concepts, field names, and status names a workspace chat turn may name. */`.

Replace `_fetchConcepts` with:

```ts
async function _fetchConcepts(options: {
  supabaseClient: AvaSupabaseClient;
  workspaceId: string;
}): Promise<{
  concepts: Concept[];
  conceptAttributes: ConceptAttribute[];
  conceptStatuses: ConceptStatus[];
}> {
  const { data: concepts } = await options.supabaseClient
    .from("concepts")
    .select("id, name, description")
    .eq("workspace_id", options.workspaceId)
    .throwOnError();

  if (!concepts || concepts.length === 0) {
    return { concepts: [], conceptAttributes: [], conceptStatuses: [] };
  }

  const conceptIds = concepts.map((concept: Concept) => {
    return concept.id;
  });
  // Statuses are their own select rather than a `concept_statuses (...)`
  // embed on `concepts`: two foreign keys join the tables (a status's case
  // type, and a case type's default status), which makes the embed ambiguous.
  const [{ data: conceptAttributes }, { data: conceptStatuses }] =
    await Promise.all([
      options.supabaseClient
        .from("concept_attributes")
        .select("concept_id, name")
        .eq("workspace_id", options.workspaceId)
        .in("concept_id", conceptIds)
        .throwOnError(),
      options.supabaseClient
        .from("concept_statuses")
        .select("concept_id, name, position")
        .eq("workspace_id", options.workspaceId)
        .in("concept_id", conceptIds)
        .throwOnError(),
    ]);

  return {
    concepts,
    conceptAttributes: conceptAttributes ?? [],
    conceptStatuses: conceptStatuses ?? [],
  };
}
```

- [ ] **Step 6: Pass statuses to the prompt**

In `buildSqlSystemPrompt.ts`, add the local type after `ConceptAttribute`:

```ts
type ConceptStatus = { concept_id: string; name: string; position: number };
```

Add `conceptStatuses?: readonly ConceptStatus[];` to `BuildSqlSystemPromptOptions` after `conceptAttributes`. In the function, destructure `conceptStatuses = [],` after `conceptAttributes = [],`, and pass it:

```ts
  const schemaBlock = SqlTableAlias.formatSchemaBlock({
    aliases,
    columns,
    conceptAttributes,
    conceptStatuses,
  });
```

In `PostChatMessages.ts`, add `conceptStatuses: schema.conceptStatuses,` after `conceptAttributes: schema.conceptAttributes,` in the `buildSqlSystemPrompt({ ... })` call. In `supabase/functions/queries/QueriesRoutes.ts`, add the same line after `conceptAttributes: schema.conceptAttributes,` in its `buildSqlSystemPrompt({ ... })` call.

- [ ] **Step 7: Run the tests and the Deno type-check**

Run: `pnpm test:frontend SqlTableAlias fetchWorkspaceSchema buildSqlSystemPrompt`
Expected: PASS.

Run: `pnpm type-check`
Expected: PASS, including `deno check shared supabase/functions packages/shared`.

- [ ] **Step 8: Commit**

```bash
git add shared/models/chat/SqlTableAlias supabase/functions/chat/PostChatMessages/schema supabase/functions/chat/utils/buildSqlSystemPrompt supabase/functions/chat/PostChatMessages/PostChatMessages.ts supabase/functions/queries/QueriesRoutes.ts
git commit -m "feat(case-statuses): show each case type's statuses in chat's schema context" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Chat's offline schema lists each case type's statuses

**Files:**
- Modify: `shared/types/offlineChat.types.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/fetchOfflineChatSchema.ts`
- Test: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/fetchOfflineChatSchema.test.ts` (Create)
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/OfflineChatSchemaCache.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/truncateSchemaForOffline/truncateSchemaForOffline.ts`
- Test: `.../truncateSchemaForOffline/truncateSchemaForOffline.test.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/ensureOfflineChatSchema/ensureOfflineChatSchema.ts`
- Test: `.../ensureOfflineChatSchema/ensureOfflineChatSchema.test.ts`
- Move and modify: `.../runOfflineChatPipeline/narrowOfflineSchema.ts` to `.../runOfflineChatPipeline/narrowOfflineSchema/narrowOfflineSchema.ts`
- Test: `.../runOfflineChatPipeline/narrowOfflineSchema/narrowOfflineSchema.test.ts` (Create)
- Modify: `.../runOfflineChatPipeline/runOfflineChatPipeline.ts`
- Modify: `.../runOfflineChatPipeline/buildOfflinePrompts/buildOfflinePrompts.ts`
- Test: `.../runOfflineChatPipeline/buildOfflinePrompts/buildOfflinePrompts.test.ts`

All paths below starting with `.../` are under `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/`.

- [ ] **Step 1: Move `narrowOfflineSchema` into its own directory**

It is about to get a test, and a co-named pair needs a directory.

```bash
mkdir -p src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/narrowOfflineSchema
git mv src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/narrowOfflineSchema.ts src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/narrowOfflineSchema/narrowOfflineSchema.ts
```

In `runOfflineChatPipeline.ts`, replace line 9 with:

```ts
import { narrowOfflineSchema } from "@/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/narrowOfflineSchema/narrowOfflineSchema";
```

- [ ] **Step 2: Write the failing tests**

Create `.../runOfflineChatPipeline/narrowOfflineSchema/narrowOfflineSchema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { narrowOfflineSchema } from "@/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/narrowOfflineSchema/narrowOfflineSchema";

describe("narrowOfflineSchema", () => {
  it("keeps every case type's statuses when it narrows to one dataset", () => {
    const narrowed = narrowOfflineSchema(
      {
        datasets: [
          { id: "ds-a", name: "A" },
          { id: "ds-b", name: "B" },
        ],
        columns: [],
        concepts: [{ id: "c-1", name: "Case" }],
        conceptAttributes: [],
        conceptStatuses: [{ concept_id: "c-1", name: "Active", position: 0 }],
      },
      "ds-a",
    );

    expect(narrowed.conceptStatuses).toEqual([
      { concept_id: "c-1", name: "Active", position: 0 },
    ]);
  });
});
```

Add to `ensureOfflineChatSchema.test.ts`:

```ts
  it("keeps case type statuses when it adds the open dataset", () => {
    const result = ensureOfflineChatSchema({
      schema: {
        datasets: [],
        columns: [],
        concepts: [{ id: "c-1", name: "Case" }],
        conceptStatuses: [{ concept_id: "c-1", name: "Active", position: 0 }],
      },
      openDatasetId: "ds-open",
    });

    expect(result.conceptStatuses).toEqual([
      { concept_id: "c-1", name: "Active", position: 0 },
    ]);
  });
```

Add to `truncateSchemaForOffline.test.ts`:

```ts
  it("keeps the statuses of the case types it keeps and drops the rest", () => {
    const concepts = Array.from({ length: 13 }, (_, index) => {
      return { id: `c-${index}`, name: `Case type ${index}` };
    });
    const truncated = truncateSchemaForOffline({
      datasets: [],
      columns: [],
      concepts,
      conceptStatuses: [
        { concept_id: "c-0", name: "Active", position: 0 },
        { concept_id: "c-12", name: "Active", position: 0 },
      ],
    });

    expect(truncated.conceptStatuses).toEqual([
      { concept_id: "c-0", name: "Active", position: 0 },
    ]);
  });
```

Add to `buildOfflinePrompts.test.ts`, after `SCHEMA_WITH_CONCEPT`:

```ts
const SCHEMA_WITH_STATUSES = {
  ...SCHEMA,
  concepts: [{ id: CONCEPT_ID, name: "Case" }],
  conceptAttributes: [{ concept_id: CONCEPT_ID, name: "district" }],
  conceptStatuses: [
    { concept_id: CONCEPT_ID, name: "Confirmed", position: 1 },
    { concept_id: CONCEPT_ID, name: "Suspected", position: 0 },
  ],
} as const;
```

and inside `describe("buildOfflineSqlPrompt", ...)`:

```ts
  it("lists a case type's statuses in position order offline", () => {
    const prompt = buildOfflineSqlPrompt({
      schema: SCHEMA_WITH_STATUSES,
      pageContext: ChatPageContext.createDataExplorerViewContext(),
      analysisSummary: "Count confirmed cases",
      lastUserPrompt: "how many confirmed cases",
    });

    expect(prompt).toContain("- c0: Case (district, status: Suspected | Confirmed)");
  });
```

Create `.../fetchOfflineChatSchema/fetchOfflineChatSchema.test.ts`:

```ts
/**
 * The offline schema is fetched while online and cached for later, so what it
 * carries is all an offline prompt ever sees about a case type.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchOfflineChatSchema } from "@/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/fetchOfflineChatSchema";
import type { Workspace } from "$/models/Workspace/Workspace";

const WORKSPACE_ID = "wwwwwwww-wwww-4www-8www-wwwwwwwwwwww" as Workspace.Id;
const CONCEPT_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const {
  datasetsWithColumnsMock,
  conceptGetAllMock,
  conceptAttributeGetAllMock,
  conceptStatusGetAllMock,
} = vi.hoisted(() => {
  return {
    datasetsWithColumnsMock: vi.fn(),
    conceptGetAllMock: vi.fn(),
    conceptAttributeGetAllMock: vi.fn(),
    conceptStatusGetAllMock: vi.fn(),
  };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: { getAllDatasetsWithColumns: datasetsWithColumnsMock },
  };
});
vi.mock("@/clients/ontology/ConceptClient", () => {
  return { ConceptClient: { getAll: conceptGetAllMock } };
});
vi.mock("@/clients/ontology/ConceptAttributeClient", () => {
  return { ConceptAttributeClient: { getAll: conceptAttributeGetAllMock } };
});
vi.mock("@/clients/ontology/ConceptStatusClient", () => {
  return { ConceptStatusClient: { getAll: conceptStatusGetAllMock } };
});

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  datasetsWithColumnsMock.mockResolvedValue([]);
  conceptGetAllMock.mockResolvedValue([{ id: CONCEPT_ID, name: "Case" }]);
  conceptAttributeGetAllMock.mockResolvedValue([]);
  conceptStatusGetAllMock.mockResolvedValue([
    { conceptId: CONCEPT_ID, name: "Suspected", position: 0 },
    { conceptId: CONCEPT_ID, name: "Confirmed", position: 1 },
  ]);
});

describe("fetchOfflineChatSchema", () => {
  it("carries each case type's statuses into the offline schema", async () => {
    const schema = await fetchOfflineChatSchema({
      workspace: { id: WORKSPACE_ID } as Workspace.T,
      navigatorOnLine: true,
    });

    expect(schema.conceptStatuses).toEqual([
      { concept_id: CONCEPT_ID, name: "Suspected", position: 0 },
      { concept_id: CONCEPT_ID, name: "Confirmed", position: 1 },
    ]);
  });

  it("reads no statuses for a workspace with no case types", async () => {
    conceptGetAllMock.mockResolvedValue([]);

    const schema = await fetchOfflineChatSchema({
      workspace: { id: WORKSPACE_ID } as Workspace.T,
      navigatorOnLine: true,
    });

    expect(schema.conceptStatuses).toEqual([]);
    expect(conceptStatusGetAllMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run them to see them fail**

Run: `pnpm test:frontend narrowOfflineSchema ensureOfflineChatSchema truncateSchemaForOffline buildOfflinePrompts fetchOfflineChatSchema`
Expected: FAIL. `conceptStatuses` is dropped or undefined in every result, and the offline prompt has no status field.

- [ ] **Step 4: Add the offline type**

In `shared/types/offlineChat.types.ts`, add after `OfflineChatSchemaConceptAttribute`:

```ts
export type OfflineChatSchemaConceptStatus = {
  concept_id: string;
  name: string;
  position: number;
};
```

and add to `OfflineChatSchema`:

```ts
  conceptStatuses?: readonly OfflineChatSchemaConceptStatus[];
```

- [ ] **Step 5: Fetch, cache, trim, and pass statuses through**

In `fetchOfflineChatSchema.ts`, add the imports:

```ts
import { ConceptStatusClient } from "@/clients/ontology/ConceptStatusClient";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
```

Add `conceptStatuses: [],` to `EMPTY_SCHEMA`. Replace `_mapConcepts` with:

```ts
function _mapConcepts(
  options: Readonly<{
    concepts: readonly Concept.T[];
    attributes: readonly ConceptAttribute.T[];
    statuses: readonly ConceptStatus.T[];
  }>,
): Pick<
  OfflineChatSchema,
  "concepts" | "conceptAttributes" | "conceptStatuses"
> {
  return {
    concepts: options.concepts.map((concept) => {
      return { id: concept.id, name: concept.name };
    }),
    conceptAttributes: options.attributes.map((attribute) => {
      return { concept_id: attribute.conceptId, name: attribute.name };
    }),
    conceptStatuses: options.statuses.map((status) => {
      return {
        concept_id: status.conceptId,
        name: status.name,
        position: status.position,
      };
    }),
  };
}

/** Every attribute and status in the workspace, read together. */
async function _fetchConceptDetails(workspaceId: Workspace.Id): Promise<{
  attributes: ConceptAttribute.T[];
  statuses: ConceptStatus.T[];
}> {
  const [attributes, statuses] = await Promise.all([
    ConceptAttributeClient.getAll(where("workspace_id", "eq", workspaceId)),
    ConceptStatusClient.getAll(where("workspace_id", "eq", workspaceId)),
  ]);
  return { attributes, statuses };
}
```

In `fetchOfflineChatSchema`, replace

```ts
      const attributes =
        concepts.length === 0
          ? []
          : await ConceptAttributeClient.getAll(
              where("workspace_id", "eq", args.workspace.id),
            );
      const schema: OfflineChatSchema = {
        ..._mapDatasets(datasetRows),
        ..._mapConcepts(concepts, attributes),
      };
```

with

```ts
      const conceptDetails =
        concepts.length === 0
          ? { attributes: [], statuses: [] }
          : await _fetchConceptDetails(args.workspace.id);
      const schema: OfflineChatSchema = {
        ..._mapDatasets(datasetRows),
        ..._mapConcepts({ concepts, ...conceptDetails }),
      };
```

In `OfflineChatSchemaCache.ts`, add to the object `_read` returns, after `conceptAttributes`:

```ts
      conceptStatuses: Array.isArray(parsed.conceptStatuses)
        ? parsed.conceptStatuses
        : [],
```

In `truncateSchemaForOffline.ts`, replace the last two statements with:

```ts
  const conceptAttributes = (schema.conceptAttributes ?? []).filter(
    (attribute) => {
      return keptConceptIds.has(attribute.concept_id);
    },
  );
  // Statuses are kept whole for every kept case type: they are what tells the
  // model which values `status` can hold.
  const conceptStatuses = (schema.conceptStatuses ?? []).filter((status) => {
    return keptConceptIds.has(status.concept_id);
  });

  return {
    datasets: trimmedDatasets,
    columns,
    concepts,
    conceptAttributes,
    conceptStatuses,
  };
```

In `ensureOfflineChatSchema.ts`, add `conceptStatuses: args.schema.conceptStatuses ?? [],` after `conceptAttributes` in the returned object. In `narrowOfflineSchema.ts`, add `conceptStatuses: schema.conceptStatuses ?? [],` after `conceptAttributes` in the returned object.

In `buildOfflinePrompts.ts`, replace `formatSchema`'s `formatSchemaBlock` call with:

```ts
  const block = SqlTableAlias.formatSchemaBlock({
    aliases: aliasesFromSchema(schema),
    columns: schema.columns,
    conceptAttributes: schema.conceptAttributes ?? [],
    conceptStatuses: schema.conceptStatuses ?? [],
  });
```

- [ ] **Step 6: Run the tests**

Run: `pnpm test:frontend narrowOfflineSchema ensureOfflineChatSchema truncateSchemaForOffline buildOfflinePrompts fetchOfflineChatSchema runOfflineChatPipeline`
Expected: PASS. The Phase 0 fixture length assertion in `truncateSchemaForOffline.test.ts` is unchanged because that fixture has no case types.

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add shared/types/offlineChat.types.ts src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn
git commit -m "feat(case-statuses): show each case type's statuses in offline chat" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: The edge function parses a proposed status set

**Files:**
- Modify: `shared/types/chat.types.ts`
- Create: `supabase/functions/chat/PostChatMessages/parsing/parseProposedCaseStatuses.ts`
- Modify: `supabase/functions/chat/PostChatMessages/parsing/parseProposeCaseType.ts`
- Test: `supabase/functions/chat/PostChatMessages/parsing/parseProposeCaseType.test.ts`

- [ ] **Step 1: Write the failing parser tests**

Append to `parseProposeCaseType.test.ts`:

```ts
/** A minimal valid proposal, plus whatever fields a case adds. */
function _parseWithFields(
  fields: Record<string, unknown>,
): ReturnType<typeof parseProposeCaseType> {
  return parseProposeCaseType(
    JSON.stringify({
      name: "Cholera case",
      sourceDatasets: [
        {
          datasetId: DEATHS_DATASET_ID,
          primaryKeyColumnId: DEATHS_KEY_COLUMN_ID,
        },
      ],
      attributes: [],
      manualEntryAttributes: [],
      ...fields,
    }),
  );
}

const WORKFLOW = [
  {
    name: "Suspected",
    description: "Reported but not yet tested.",
    color: "#fab005",
  },
  {
    name: "Confirmed",
    description: "A lab test came back positive.",
    color: "#fa5252",
  },
  {
    name: "Ruled out",
    description: "A lab test came back negative.",
    color: "#637c95",
  },
];

describe("parseProposeCaseType statuses", () => {
  it("keeps proposed statuses in order with the named default", () => {
    const parsed = _parseWithFields({
      statuses: WORKFLOW,
      defaultStatusName: "suspected",
    });

    expect(parsed?.statuses).toEqual(WORKFLOW);
    expect(parsed?.defaultStatusName).toBe("Suspected");
  });

  it("makes the first status the default when none is named", () => {
    const parsed = _parseWithFields({ statuses: WORKFLOW });

    expect(parsed?.defaultStatusName).toBe("Suspected");
  });

  it("fills missing colors with the palette colors the set does not use", () => {
    const parsed = _parseWithFields({
      statuses: [
        { name: "Suspected", description: "", color: "#fab005" },
        { name: "Confirmed", description: "" },
        { name: "Ruled out", description: "" },
      ],
    });

    expect(
      parsed?.statuses?.map((status) => {
        return status.color;
      }),
    ).toEqual(["#fab005", "#637c95", "#40c057"]);
  });

  it("replaces a color outside the palette with a free palette color", () => {
    const parsed = _parseWithFields({
      statuses: [{ name: "Open", description: "", color: "#123456" }],
    });

    expect(parsed?.statuses?.[0]?.color).toBe("#637c95");
  });

  it("drops the status set when two statuses share a name in any case", () => {
    const parsed = _parseWithFields({
      statuses: [
        { name: "Confirmed", description: "" },
        { name: " confirmed ", description: "" },
      ],
    });

    expect(parsed?.statuses).toBeUndefined();
    expect(parsed?.defaultStatusName).toBeUndefined();
  });

  it("drops the status set when it has more than 12 statuses", () => {
    const parsed = _parseWithFields({
      statuses: Array.from({ length: 13 }, (_, index) => {
        return { name: `Stage ${index}`, description: "" };
      }),
    });

    expect(parsed?.statuses).toBeUndefined();
  });

  it("drops the status set when the default is not one of the statuses", () => {
    const parsed = _parseWithFields({
      statuses: WORKFLOW,
      defaultStatusName: "Closed",
    });

    expect(parsed?.statuses).toBeUndefined();
  });

  it("drops the status set when a status has no name", () => {
    const parsed = _parseWithFields({
      statuses: [...WORKFLOW, { name: "  ", description: "" }],
    });

    expect(parsed?.statuses).toBeUndefined();
  });

  it("leaves statuses out when the proposal has none", () => {
    const parsed = _parseWithFields({});

    expect(parsed).toBeDefined();
    expect(parsed?.statuses).toBeUndefined();
  });
});

describe("parseProposeCaseType reserved attribute names", () => {
  it("renames a dataset attribute named status rather than dropping it", () => {
    const parsed = _parseWithFields({
      attributes: [
        {
          datasetId: DEATHS_DATASET_ID,
          columnId: STATE_COLUMN_ID,
          name: "Status",
          isIncluded: true,
          valuePickerRuleType: "most_frequent",
        },
      ],
    });

    expect(parsed?.attributes[0]?.name).toBe("Status (attribute)");
  });

  it("renames a manual-entry attribute named status", () => {
    const parsed = _parseWithFields({
      manualEntryAttributes: [{ name: " status ", isIncluded: true }],
    });

    expect(parsed?.manualEntryAttributes[0]?.name).toBe("status (attribute)");
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm test:frontend parseProposeCaseType`
Expected: FAIL. `statuses` and `defaultStatusName` are undefined in every case, and the `Status` attribute keeps its name.

- [ ] **Step 3: Extend the chat contract types**

In `shared/types/chat.types.ts`, add after `ChatCaseSourceDataset`:

```ts
/**
 * One status a chat-drafted case type starts with. `color` is always a palette
 * hex: the edge function fills one when the model leaves it out.
 */
export type ChatCaseStatus = {
  name: string;
  /** One sentence telling the people working the cases what it means. */
  description: string;
  color: string;
};
```

Add to both `ChatCreatedCaseType` and `ChatProposedCaseType`, after `attributes` (and after `manualEntryAttributes` in the proposed type):

```ts
  /**
   * The case type's statuses, in order. Absent when chat proposed none, in
   * which case the client starts the case type with its default set.
   */
  statuses?: ChatCaseStatus[];
  /** The status a new case starts in, naming one of `statuses`. */
  defaultStatusName?: string;
```

- [ ] **Step 4: Write the status set parser**

Create `supabase/functions/chat/PostChatMessages/parsing/parseProposedCaseStatuses.ts`:

```ts
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus.ts";
import type { ChatCaseStatus } from "$/types/chat.types.ts";

/** The most statuses one proposed case type may carry. */
export const MAX_PROPOSED_STATUSES = 12;

type ProposedStatus = {
  name: string;
  description: string;
  color: string | undefined;
};

function _asTrimmedString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

/** A palette hex in lowercase, or undefined for anything else. */
function _asPaletteHex(value: unknown): string | undefined {
  const hex =
    typeof value === "string" ? value.trim().toLowerCase() : undefined;
  return ConceptStatus.PALETTE.some((swatch) => {
    return swatch.hex === hex;
  })
    ? hex
    : undefined;
}

function _parseStatus(raw: unknown): ProposedStatus | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const record = raw as Record<string, unknown>;
  const name = _asTrimmedString(record.name);
  if (!name) {
    return undefined;
  }
  return {
    name,
    description: _asTrimmedString(record.description) ?? "",
    color: _asPaletteHex(record.color),
  };
}

function _hasUniqueNames(statuses: readonly ProposedStatus[]): boolean {
  const names = new Set(
    statuses.map((status) => {
      return status.name.toLowerCase();
    }),
  );
  return names.size === statuses.length;
}

/**
 * Gives every status without a color the first palette color the set does
 * not use yet, counting the colors the model chose itself.
 */
function _fillMissingColors(
  statuses: readonly ProposedStatus[],
): ChatCaseStatus[] {
  const usedColors = statuses.flatMap((status) => {
    return status.color ? [status.color] : [];
  });
  return statuses.map((status) => {
    if (status.color) {
      return { ...status, color: status.color };
    }
    const color = ConceptStatus.getNextFreeColor(usedColors);
    usedColors.push(color);
    return { name: status.name, description: status.description, color };
  });
}

/**
 * Parses the status set a `proposeCaseType` call carries, or returns undefined
 * when it carries none or an unusable one.
 *
 * All or nothing: one unusable status, a repeated name, too many statuses, or
 * a default that names none of them drops the whole set rather than keeping a
 * shortened one. The client then starts the case type with its translated
 * default set, which is a better start than a workflow missing a step.
 */
export function parseProposedCaseStatuses(
  options: Readonly<{ rawStatuses: unknown; rawDefaultStatusName: unknown }>,
): { statuses: ChatCaseStatus[]; defaultStatusName: string } | undefined {
  if (!Array.isArray(options.rawStatuses)) {
    return undefined;
  }
  const parsedStatuses = options.rawStatuses.map(_parseStatus);
  const statuses = parsedStatuses.filter((status): status is ProposedStatus => {
    return status !== undefined;
  });
  if (
    statuses.length === 0 ||
    statuses.length !== parsedStatuses.length ||
    statuses.length > MAX_PROPOSED_STATUSES ||
    !_hasUniqueNames(statuses)
  ) {
    return undefined;
  }

  const requestedDefaultName = _asTrimmedString(
    options.rawDefaultStatusName,
  )?.toLowerCase();
  const defaultStatus =
    requestedDefaultName === undefined
      ? statuses[0]
      : statuses.find((status) => {
          return status.name.toLowerCase() === requestedDefaultName;
        });
  if (!defaultStatus) {
    return undefined;
  }
  return {
    statuses: _fillMissingColors(statuses),
    defaultStatusName: defaultStatus.name,
  };
}
```

- [ ] **Step 5: Use it, and rename reserved attribute names**

In `parseProposeCaseType.ts`, replace the import block with:

```ts
import { parseProposedCaseStatuses } from "@sbfn/chat/PostChatMessages/parsing/parseProposedCaseStatuses.ts";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus.ts";
import type {
  ChatCaseSourceDataset,
  ChatCaseValuePickerRuleType,
  ChatProposedCaseAttribute,
  ChatProposedCaseType,
  ChatProposedManualEntryAttribute,
} from "$/types/chat.types.ts";
```

In `_parseAttribute`, replace `name,` in the returned object with:

```ts
    // Every case type has a built-in `status`, and a dataset `status` column
    // is common, so the attribute is renamed rather than dropped.
    name: ConceptStatus.toNonReservedAttributeName(name),
```

In `_parseManualEntryAttribute`, replace `name,` in the returned object with:

```ts
    name: ConceptStatus.toNonReservedAttributeName(name),
```

Replace everything from the `parseProposeCaseType` docstring through the end of that function with:

```ts
/**
 * The proposed dataset attributes that read a declared source. An attribute
 * naming a dataset with no join key would make the whole concept unqueryable,
 * so it is dropped here instead of surfacing later as a failed query.
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
  return _parseList(options.rawAttributes, _parseAttribute).filter(
    (attribute) => {
      return sourceDatasetIds.has(attribute.datasetId);
    },
  );
}

/**
 * Parses a `proposeCaseType` tool call into the editable draft the client
 * renders. Missing optional fields are defaulted rather than rejected so a
 * partial proposal still reaches the card, where the user can finish it.
 *
 * Attributes are held to the declared sources, and an attribute named like the
 * built-in `status` is renamed. A status set is kept only when it is valid
 * whole; otherwise the draft carries none and the client supplies the default
 * set.
 */
export function parseProposeCaseType(
  argsJson: string | undefined,
): ChatProposedCaseType | undefined {
  if (!argsJson) {
    return undefined;
  }
  let record: Record<string, unknown>;
  try {
    record = JSON.parse(argsJson) as Record<string, unknown>;
  } catch {
    return undefined;
  }

  const name = _asTrimmedString(record.name);
  const sourceDatasets = _dedupeSourceDatasets(
    _parseList(record.sourceDatasets, _parseSourceDataset),
  );
  if (!name || sourceDatasets.length === 0) {
    return undefined;
  }

  const attributes = _parseSourceAttributes({
    rawAttributes: record.attributes,
    sourceDatasets,
  });
  const labelColumnId = _asUuid(record.labelColumnId);
  const hasLabelAttribute = attributes.some((attribute) => {
    return attribute.columnId === labelColumnId;
  });
  const description = _asTrimmedString(record.description);

  return {
    name,
    allowManualCreation: record.allowManualCreation === true,
    sourceDatasets,
    attributes,
    manualEntryAttributes: _parseList(
      record.manualEntryAttributes,
      _parseManualEntryAttribute,
    ),
    ...(description ? { description } : {}),
    ...(labelColumnId && hasLabelAttribute ? { labelColumnId } : {}),
    ...parseProposedCaseStatuses({
      rawStatuses: record.statuses,
      rawDefaultStatusName: record.defaultStatusName,
    }),
  };
}
```

`caseTypeDraftIntro` below it is unchanged.

- [ ] **Step 6: Run the tests**

Run: `pnpm test:frontend parseProposeCaseType parseOpenRouterResponse parseCreateCaseTypes`
Expected: PASS.

Run: `pnpm type-check`
Expected: PASS, including the Deno check of `supabase/functions`.

- [ ] **Step 7: Commit**

```bash
git add shared/types/chat.types.ts supabase/functions/chat/PostChatMessages/parsing/parseProposedCaseStatuses.ts supabase/functions/chat/PostChatMessages/parsing/parseProposeCaseType.ts supabase/functions/chat/PostChatMessages/parsing/parseProposeCaseType.test.ts
git commit -m "feat(case-statuses): parse a status set from a chat case type proposal" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Chat asks for a status set

**Files:**
- Modify: `supabase/functions/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.ts`
- Test: `supabase/functions/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.test.ts`
- Modify: `supabase/functions/chat/PostChatMessages/prompt/buildCaseManagerSystemPrompt.ts`
- Test: `supabase/functions/chat/PostChatMessages/prompt/buildCaseManagerSystemPrompt.test.ts`

- [ ] **Step 1: Write the failing tests**

In `makeChatToolConfigFromOptions.test.ts`, extend the expected key list in `it("lets proposeCaseType prefill every field of a draft", ...)` to:

```ts
    expect(Object.keys(propose?.function.parameters.properties ?? {})).toEqual([
      "name",
      "description",
      "allowManualCreation",
      "sourceDatasets",
      "labelColumnId",
      "attributes",
      "manualEntryAttributes",
      "statuses",
      "defaultStatusName",
    ]);
```

and add:

```ts
  it("limits proposed statuses to 12 with palette colors", () => {
    const config = makeChatToolConfigFromOptions({
      clarificationCapReached: false,
      app: "case-manager",
    });
    const tools = config.tools as Array<{
      function: {
        name: string;
        parameters: {
          properties: {
            statuses?: {
              maxItems: number;
              items: {
                required: string[];
                properties: { color: { enum: string[] } };
              };
            };
          };
        };
      };
    }>;
    const statuses = tools.find((tool) => {
      return tool.function.name === "proposeCaseType";
    })?.function.parameters.properties.statuses;

    expect(statuses?.maxItems).toBe(12);
    expect(statuses?.items.required).toEqual(["name", "description"]);
    expect(statuses?.items.properties.color.enum).toEqual([
      "#637c95",
      "#40c057",
      "#228be6",
      "#12b886",
      "#fab005",
      "#fd7e14",
      "#fa5252",
      "#be4bdb",
    ]);
  });
```

In `buildCaseManagerSystemPrompt.test.ts`, add:

```ts
  it("asks for a described status set when the domain implies a workflow", () => {
    const prompt = buildCaseManagerSystemPrompt({
      datasets: [],
      columns: [],
      concepts: [],
    });

    expect(prompt).toContain("fill `statuses`");
    expect(prompt).toContain("`defaultStatusName`");
    expect(prompt).toContain("one-sentence description");
  });

  it("tells the model every case type already has a built-in status", () => {
    const prompt = buildCaseManagerSystemPrompt({
      datasets: [],
      columns: [],
      concepts: [],
    });

    expect(prompt).toContain('never propose an attribute named "status"');
  });

  it("no longer suggests a manual-entry triage status", () => {
    const prompt = buildCaseManagerSystemPrompt({
      datasets: [],
      columns: [],
      concepts: [],
    });

    expect(prompt).not.toContain("triage status");
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm test:frontend makeChatToolConfigFromOptions buildCaseManagerSystemPrompt`
Expected: FAIL. The tool has no `statuses` or `defaultStatusName`, and the prompt still says "triage status" and never mentions statuses.

- [ ] **Step 3: Add the tool parameters**

In `makeChatToolConfigFromOptions.ts`, replace the imports with:

```ts
import { prop, propEq } from "@avandar/utils";
import { buildDataExplorerToolDefinitions } from "@sbfn/chat/buildDataExplorerToolDefinitions/buildDataExplorerToolDefinitions.ts";
import { MAX_PROPOSED_STATUSES } from "@sbfn/chat/PostChatMessages/parsing/parseProposedCaseStatuses.ts";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus.ts";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext.ts";
```

In `PROPOSE_CASE_TYPE_TOOL_DEFINITIONS`, replace the `manualEntryAttributes` description with:

```ts
            description:
              "Fields users fill in by hand that no dataset column supplies, such as review notes. Never a field for where a case stands: every case type already has statuses.",
```

and add after the `manualEntryAttributes` property (inside `properties`):

```ts
          statuses: {
            type: "array",
            minItems: 1,
            maxItems: MAX_PROPOSED_STATUSES,
            description:
              "The stages one case moves through, in workflow order, when the case type implies a workflow (an investigation, an application, an enrollment). Leave it out when cases have no workflow; the case type then starts with Active and Inactive.",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description:
                    "Short status name the people working the cases already use, unique within the case type. For example Suspected.",
                },
                description: {
                  type: "string",
                  description:
                    "One sentence, written for the people working the cases, saying when a case belongs in this status. For example: A lab test came back positive.",
                },
                color: {
                  type: "string",
                  enum: ConceptStatus.PALETTE.map(prop("hex")),
                  description:
                    "Optional badge color. Leave it out to have a free color assigned.",
                },
              },
              required: ["name", "description"],
              additionalProperties: false,
            },
          },
          defaultStatusName: {
            type: "string",
            description:
              "The status a new case starts in. Must be one of `statuses`. Defaults to the first.",
          },
```

`required` is unchanged: both new fields are optional.

- [ ] **Step 4: Update the case manager prompt**

In `buildCaseManagerSystemPrompt.ts`, inside `caseManagerRules`:

Replace the sentence

```text
Your goal is a complete case type: a name, a description, every dataset that contributes fields together with the join key each one is matched on, the label column that names each case, every attribute worth mapping with its value picker, any manual-entry fields, and whether users may create cases by hand.
```

with

```text
Your goal is a complete case type: a name, a description, every dataset that contributes fields together with the join key each one is matched on, the label column that names each case, every attribute worth mapping with its value picker, any manual-entry fields, a status set when the case type has a workflow, and whether users may create cases by hand.
```

Replace the bullet

```text
- Offer manual-entry attributes only when they add something no column supplies, such as review notes or a triage status. Leave them \`isIncluded: false\` so the user opts in.
```

with

```text
- Offer manual-entry attributes only when they add something no column supplies, such as review notes. Leave them \`isIncluded: false\` so the user opts in.

Statuses:
- Every case type has a built-in status, so never propose an attribute named "status" and never offer a manual-entry field for tracking where a case stands. If a dataset has a column called status, name its attribute for what it records, such as Source status.
- When the case type implies a workflow, such as an investigation, an application, or an enrollment, fill \`statuses\` with its stages in workflow order and set \`defaultStatusName\` to the stage a new case starts in. Keep the set short and use the names the people working the cases already use.
- Give every status a one-sentence description written for the people working the cases, saying when a case belongs in that status. For example, Confirmed: "A lab test came back positive."
- Leave \`statuses\` out when cases have no workflow. The case type then starts with Active and Inactive, which the user can change.
```

- [ ] **Step 5: Run the tests**

Run: `pnpm test:frontend makeChatToolConfigFromOptions buildCaseManagerSystemPrompt`
Expected: PASS.

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/chat/PostChatMessages/prompt
git commit -m "feat(case-statuses): let chat propose a status set for a new case type" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Chat statuses reach the create path

**Files:**
- Create: `src/views/OntologyDesignerApp/makeStatusSetValueFromChatStatuses/makeStatusSetValueFromChatStatuses.ts`
- Test: `src/views/OntologyDesignerApp/makeStatusSetValueFromChatStatuses/makeStatusSetValueFromChatStatuses.test.ts`
- Modify: `src/views/OntologyDesignerApp/createdCaseTypeToFormValues/createdCaseTypeToFormValues.ts`
- Test: `src/views/OntologyDesignerApp/createdCaseTypeToFormValues/createdCaseTypeToFormValues.test.ts`
- Modify: `src/views/OntologyDesignerApp/proposedCaseTypeToCreatedCaseType/proposedCaseTypeToCreatedCaseType.ts`
- Test: `src/views/OntologyDesignerApp/proposedCaseTypeToCreatedCaseType/proposedCaseTypeToCreatedCaseType.test.ts`

- [ ] **Step 1: Write the failing conversion tests**

Create `makeStatusSetValueFromChatStatuses.test.ts`:

```ts
/**
 * Chat names its statuses and their default; the status set editor and the
 * create path need ids. These pin the conversion and its fallbacks.
 */
import { describe, expect, it } from "vitest";
import { makeStatusSetValueFromChatStatuses } from "@/views/OntologyDesignerApp/makeStatusSetValueFromChatStatuses/makeStatusSetValueFromChatStatuses";
import type { ChatCaseStatus } from "$/types/chat.types";

const WORKFLOW: ChatCaseStatus[] = [
  { name: "Suspected", description: "Reported, not tested.", color: "#fab005" },
  { name: "Confirmed", description: "Tested positive.", color: "#fa5252" },
];

describe("makeStatusSetValueFromChatStatuses", () => {
  it("keeps chat's statuses in order with their descriptions and colors", () => {
    const value = makeStatusSetValueFromChatStatuses({
      statuses: WORKFLOW,
      defaultStatusName: "Suspected",
    });

    expect(
      value.statuses.map(({ name, description, color }) => {
        return { name, description, color };
      }),
    ).toEqual(WORKFLOW);
  });

  it("makes the named status the default, matching its name in any case", () => {
    const value = makeStatusSetValueFromChatStatuses({
      statuses: WORKFLOW,
      defaultStatusName: " confirmed ",
    });

    expect(value.defaultStatusId).toBe(value.statuses[1]?.id);
  });

  it("makes the first status the default when the name matches none", () => {
    const value = makeStatusSetValueFromChatStatuses({
      statuses: WORKFLOW,
      defaultStatusName: "Closed",
    });

    expect(value.defaultStatusId).toBe(value.statuses[0]?.id);
  });

  it("gives every status its own id", () => {
    const value = makeStatusSetValueFromChatStatuses({
      statuses: WORKFLOW,
      defaultStatusName: undefined,
    });

    const ids = value.statuses.map((status) => {
      return status.id;
    });
    expect(new Set(ids).size).toBe(2);
  });

  it("falls back to the default set when chat proposed no statuses", () => {
    const value = makeStatusSetValueFromChatStatuses({});

    expect(
      value.statuses.map((status) => {
        return status.name;
      }),
    ).toEqual(["Active", "Inactive"]);
    expect(value.defaultStatusId).toBe(value.statuses[0]?.id);
  });
});
```

In `createdCaseTypeToFormValues.test.ts`, add inside the `describe`:

```ts
  it("starts a chat-created case type with the statuses chat proposed", () => {
    const formValues = createdCaseTypeToFormValues({
      caseType: _covidCase({
        statuses: [
          { name: "Suspected", description: "", color: "#fab005" },
          { name: "Confirmed", description: "", color: "#fa5252" },
        ],
        defaultStatusName: "Confirmed",
      }),
      workspaceId: WORKSPACE_ID,
      columns: COLUMNS,
    });

    expect(
      formValues.statuses.map((status) => {
        return status.name;
      }),
    ).toEqual(["Suspected", "Confirmed"]);
    expect(formValues.defaultStatusId).toBe(formValues.statuses[1]?.id);
  });

```

Plan 2 already added the test `starts a chat-created case type with the default status set`, which covers a case type chat sent no statuses for (the legacy `createCaseTypes` path). Keep it: it must still pass after Step 4.

In `proposedCaseTypeToCreatedCaseType.test.ts`, add inside its `describe`:

```ts
  it("carries the card's statuses and default into the created case type", () => {
    const created = proposedCaseTypeToCreatedCaseType(
      makeDraft({
        statuses: [
          { name: "Suspected", description: "", color: "#fab005" },
          { name: "Confirmed", description: "", color: "#fa5252" },
        ],
        defaultStatusName: "Confirmed",
      }),
    );

    expect(
      created.statuses?.map((status) => {
        return status.name;
      }),
    ).toEqual(["Suspected", "Confirmed"]);
    expect(created.defaultStatusName).toBe("Confirmed");
  });

  it("leaves statuses out when the draft has none", () => {
    const created = proposedCaseTypeToCreatedCaseType(makeDraft());

    expect(created).not.toHaveProperty("statuses");
    expect(created).not.toHaveProperty("defaultStatusName");
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm test:frontend makeStatusSetValueFromChatStatuses createdCaseTypeToFormValues proposedCaseTypeToCreatedCaseType`
Expected: FAIL. The new module cannot be resolved, chat statuses are ignored (the form gets Active and Inactive), and the created case type has no `statuses`.

- [ ] **Step 3: Write the conversion**

Create `makeStatusSetValueFromChatStatuses.ts`:

```ts
import { uuid } from "$/lib/uuid";
import { makeDefaultStatusDrafts } from "@/views/OntologyDesignerApp/makeDefaultStatusDrafts/makeDefaultStatusDrafts";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { ChatCaseStatus } from "$/types/chat.types";

/**
 * Builds an editable status set from the statuses chat proposed for a case
 * type, or the translated default set when chat proposed none.
 *
 * Chat names the default rather than pointing at an id, so it is matched by
 * name, ignoring case and surrounding spaces. A name that matches nothing
 * falls back to the first status, because a status set always has a default.
 */
export function makeStatusSetValueFromChatStatuses(
  options: Readonly<{
    statuses?: readonly ChatCaseStatus[];
    defaultStatusName?: string;
  }>,
): ConceptStatus.SetValue & { defaultStatusId: ConceptStatus.Id } {
  const drafts = (options.statuses ?? []).map((status): ConceptStatus.Draft => {
    return {
      id: uuid<ConceptStatus.Id>(),
      name: status.name,
      description: status.description,
      color: status.color,
    };
  });
  const [firstDraft] = drafts;
  if (!firstDraft) {
    return makeDefaultStatusDrafts();
  }
  const requestedDefaultName = options.defaultStatusName?.trim().toLowerCase();
  const defaultDraft =
    drafts.find((draft) => {
      return draft.name.trim().toLowerCase() === requestedDefaultName;
    }) ?? firstDraft;
  return { statuses: drafts, defaultStatusId: defaultDraft.id };
}
```

- [ ] **Step 4: Use it in `createdCaseTypeToFormValues`**

Plan 2 made `createdCaseTypeToFormValues` read its status set from `makeDefaultStatusDrafts()`. Replace the import

```ts
import { makeDefaultStatusDrafts } from "@/views/OntologyDesignerApp/makeDefaultStatusDrafts/makeDefaultStatusDrafts";
```

with

```ts
import { makeStatusSetValueFromChatStatuses } from "@/views/OntologyDesignerApp/makeStatusSetValueFromChatStatuses/makeStatusSetValueFromChatStatuses";
```

and replace the line

```ts
  const { statuses, defaultStatusId } = makeDefaultStatusDrafts();
```

with

```ts
  // Chat's statuses when it proposed some; the translated default set
  // otherwise, which is always the case for the `createCaseTypes` tool.
  const { statuses, defaultStatusId } = makeStatusSetValueFromChatStatuses(
    options.caseType,
  );
```

The `statuses` and `defaultStatusId` entries plan 2 added to the `Model.make("Concept", ...)` object stay as they are. If the function now exceeds 45 lines, move the label-and-identifier fallback (`labelAttribute`, `identifier`, `label`) into a `_markFallbackLabel(attributes)` helper that returns the label attribute; do not change its behavior.

- [ ] **Step 5: Carry statuses through `proposedCaseTypeToCreatedCaseType`**

In the returned object of `proposedCaseTypeToCreatedCaseType`, add after the `description` spread:

```ts
    ...(draft.statuses ? { statuses: draft.statuses } : {}),
    ...(draft.defaultStatusName
      ? { defaultStatusName: draft.defaultStatusName }
      : {}),
```

and extend its docstring's last sentence to: "...and every dataset still contributing keeps its join key. The card's status set travels with it."

- [ ] **Step 6: Run the tests**

Run: `pnpm test:frontend makeStatusSetValueFromChatStatuses createdCaseTypeToFormValues proposedCaseTypeToCreatedCaseType applyCreatedCaseTypes`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/views/OntologyDesignerApp/makeStatusSetValueFromChatStatuses src/views/OntologyDesignerApp/createdCaseTypeToFormValues src/views/OntologyDesignerApp/proposedCaseTypeToCreatedCaseType
git commit -m "feat(case-statuses): create chat-drafted case types with their proposed statuses" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: The chat draft card shows and edits statuses

**Files:**
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/useCaseTypeDraftEditor.ts`
- Test: `src/components/ChatPanel/CaseTypeDraftBlock/useCaseTypeDraftEditor.test.ts`
- Create: `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftStatusSection.tsx`
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftCard.tsx`
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftCard.module.css`
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftAttributeRow.tsx`
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftManualEntrySection.tsx`
- Test: `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftBlock.test.tsx`
- Modify: `src/i18n/locales/*/messages.po`, `src/i18n/locales/*/messages.ts` (generated)

Load the `impeccable` skill and read `DESIGN.md`'s Named Rules before Step 6.

- [ ] **Step 1: Write the failing editor tests**

Add the import to `useCaseTypeDraftEditor.test.ts`:

```ts
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
```

Add inside the `describe`:

```ts
  it("starts from the proposed statuses with the named default", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor({
        ...makeDraft(),
        statuses: [
          { name: "Suspected", description: "", color: "#fab005" },
          { name: "Confirmed", description: "", color: "#fa5252" },
        ],
        defaultStatusName: "Confirmed",
      });
    });

    const { statusSet } = result.current;
    expect(
      statusSet.statuses.map((status) => {
        return status.name;
      }),
    ).toEqual(["Suspected", "Confirmed"]);
    expect(statusSet.defaultStatusId).toBe(statusSet.statuses[1]?.id);
  });

  it("starts from the default statuses when the proposal has none", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    expect(
      result.current.statusSet.statuses.map((status) => {
        return status.name;
      }),
    ).toEqual(["Active", "Inactive"]);
  });

  it("carries an edited status set into the draft it creates", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });
    const [active, inactive] = result.current.statusSet.statuses;
    const edited: ConceptStatus.SetValue = {
      statuses: [{ ...active!, name: " Open " }, inactive!],
      defaultStatusId: inactive!.id,
    };

    act(() => {
      result.current.setStatusSet(edited);
    });

    expect(
      result.current.draft.statuses?.map((status) => {
        return status.name;
      }),
    ).toEqual(["Open", "Inactive"]);
    expect(result.current.draft.defaultStatusName).toBe("Inactive");
  });

  it("blocks creation while the status set has a problem", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.setStatusSet({ statuses: [], defaultStatusId: undefined });
    });

    expect(result.current.canCreate).toBe(false);
  });

  it("blocks creation while an included attribute is named status", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.setAttributeName(STATE_COLUMN_ID, " Status ");
    });

    expect(result.current.canCreate).toBe(false);
  });

  it("refuses a hand-filled field named status", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.addManualEntryAttribute("status");
    });

    expect(
      result.current.draft.manualEntryAttributes.map((attribute) => {
        return attribute.name;
      }),
    ).toEqual(["Review notes"]);
  });
```

- [ ] **Step 2: Write the failing card tests**

Add to `CaseTypeDraftBlock.test.tsx`, inside the `describe`:

```ts
  it("lists the proposed statuses with what each one means", () => {
    useChatPanelStateMock.mockReturnValue({
      pendingCaseTypeDraft: {
        ...makeDraft(),
        statuses: [
          {
            name: "Suspected",
            description: "Reported but not yet tested.",
            color: "#fab005",
          },
          {
            name: "Confirmed",
            description: "A lab test came back positive.",
            color: "#fa5252",
          },
        ],
        defaultStatusName: "Suspected",
      },
    });
    render(<CaseTypeDraftBlock />);

    const list = screen.getByRole("list", { name: "Proposed statuses" });
    expect(list).toHaveTextContent("Suspected");
    expect(list).toHaveTextContent("A lab test came back positive.");
  });

  it("lists the default statuses when the proposal has none", () => {
    render(<CaseTypeDraftBlock />);

    const list = screen.getByRole("list", { name: "Proposed statuses" });
    expect(list).toHaveTextContent("Active");
    expect(list).toHaveTextContent("Inactive");
  });

  it("swaps the list for the status editor on Edit statuses", () => {
    render(<CaseTypeDraftBlock />);

    fireEvent.click(screen.getByRole("button", { name: "Edit statuses" }));

    expect(
      screen.queryByRole("list", { name: "Proposed statuses" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("radiogroup", { name: "Default status" }),
    ).toBeInTheDocument();
  });

  it("persists the proposed statuses and default when created", async () => {
    useChatPanelStateMock.mockReturnValue({
      pendingCaseTypeDraft: {
        ...makeDraft(),
        statuses: [
          { name: "Suspected", description: "", color: "#fab005" },
          { name: "Confirmed", description: "", color: "#fa5252" },
        ],
        defaultStatusName: "Confirmed",
      },
    });
    render(<CaseTypeDraftBlock />);

    fireEvent.click(screen.getByRole("button", { name: "Create case type" }));

    await waitFor(() => {
      expect(applyCreatedCaseTypesMock).toHaveBeenCalled();
    });
    const caseType = applyCreatedCaseTypesMock.mock.calls[0]?.[0].caseTypes[0];
    expect(
      caseType.statuses.map((status: { name: string }) => {
        return status.name;
      }),
    ).toEqual(["Suspected", "Confirmed"]);
    expect(caseType.defaultStatusName).toBe("Confirmed");
  });

  it("flags an attribute renamed to status and blocks creation", () => {
    render(<CaseTypeDraftBlock />);

    fireEvent.change(screen.getByLabelText("Name for state"), {
      target: { value: "Status" },
    });

    expect(
      screen.getByText(
        "Every case type already has a status. Choose another name.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create case type" }),
    ).toBeDisabled();
  });

  it("flags a hand-filled field named status and offers no add", () => {
    render(<CaseTypeDraftBlock />);

    fireEvent.change(screen.getByLabelText("Add a field filled in by hand"), {
      target: { value: "status" },
    });

    expect(
      screen.getByText(
        "Every case type already has a status. Choose another name.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add field" })).toBeDisabled();
  });
```

The "Default status" radio group name comes from spec §8.1, which plan 3's `StatusSetEditor` implements. If plan 3 labeled it differently, assert on that label instead.

- [ ] **Step 3: Run them to see them fail**

Run: `pnpm test:frontend useCaseTypeDraftEditor CaseTypeDraftBlock`
Expected: FAIL. `statusSet` and `setStatusSet` do not exist, the card has no status list, and "Status" is accepted as an attribute name.

- [ ] **Step 4: Hold the status set in the editor**

In `useCaseTypeDraftEditor.ts`, add the imports:

```ts
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import { makeStatusSetValueFromChatStatuses } from "@/views/OntologyDesignerApp/makeStatusSetValueFromChatStatuses/makeStatusSetValueFromChatStatuses";
```

Add to `CaseTypeDraftEditor`, after `draft`:

```ts
  /** The statuses the case type starts with, as the card edits them. */
  statusSet: ConceptStatus.SetValue;
  setStatusSet: (statusSet: ConceptStatus.SetValue) => void;
```

and change `draft`'s line to carry a docstring:

```ts
  /** The draft as edited, with the card's status set written back into it. */
  draft: ChatProposedCaseType;
```

Add two helpers above `useCaseTypeDraftEditor`:

```ts
/**
 * The draft with the card's status set written back into it, so the draft the
 * card creates carries the statuses the user sees.
 */
function _withStatusSet(
  draft: ChatProposedCaseType,
  statusSet: ConceptStatus.SetValue,
): ChatProposedCaseType {
  const defaultStatus = statusSet.statuses.find((status) => {
    return status.id === statusSet.defaultStatusId;
  });
  return {
    ...draft,
    statuses: statusSet.statuses.map((status) => {
      return {
        name: status.name.trim(),
        description: status.description.trim(),
        color: status.color,
      };
    }),
    defaultStatusName: defaultStatus?.name.trim(),
  };
}

/**
 * Whether an attribute the card would create is named like the built-in
 * status, which every case type already has and which the database refuses
 * as an attribute name.
 */
function _hasReservedAttributeName(draft: ChatProposedCaseType): boolean {
  return [...draft.attributes, ...draft.manualEntryAttributes].some(
    (attribute) => {
      return (
        attribute.isIncluded &&
        ConceptStatus.isReservedAttributeName(attribute.name)
      );
    },
  );
}
```

In `useCaseTypeDraftEditor`, replace the state and reset block with:

```ts
  const proposalKey = JSON.stringify(proposedDraft);
  const [draft, setDraft] = useState(proposedDraft);
  const [statusSet, setStatusSet] = useState<ConceptStatus.SetValue>(() => {
    return makeStatusSetValueFromChatStatuses(proposedDraft);
  });
  const [appliedProposalKey, setAppliedProposalKey] = useState(proposalKey);
  if (appliedProposalKey !== proposalKey) {
    setAppliedProposalKey(proposalKey);
    setDraft(proposedDraft);
    setStatusSet(makeStatusSetValueFromChatStatuses(proposedDraft));
  }
```

Replace the start of the returned object, from `return {` through `canCreate: ...,`, with:

```ts
  return {
    draft: _withStatusSet(draft, statusSet),
    sourceGroups,
    statusSet,
    setStatusSet,
    canCreate:
      draft.name.trim().length > 0 &&
      draft.sourceDatasets.length > 0 &&
      !_hasReservedAttributeName(draft) &&
      ConceptStatus.findSetIssues({ value: statusSet }).length === 0,
```

In `addManualEntryAttribute`, replace

```ts
      const trimmedName = name.trim();
      if (trimmedName.length === 0) {
        return;
      }
```

with

```ts
      const trimmedName = name.trim();
      // Every case type has a built-in status, so a field by that name would
      // collide with it and fail to save.
      if (
        trimmedName.length === 0 ||
        ConceptStatus.isReservedAttributeName(trimmedName)
      ) {
        return;
      }
```

Update the hook's docstring with one more paragraph:

```ts
 *
 * The status set is held beside the draft, with ids, because the status set
 * editor keys its rows by id. It is written back into `draft` by name, which
 * is how chat and the create path describe statuses.
```

- [ ] **Step 5: Run the editor tests**

Run: `pnpm test:frontend useCaseTypeDraftEditor`
Expected: PASS, including the existing tests.

- [ ] **Step 6: Build the status section**

Create `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftStatusSection.tsx`:

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { StatusBadge } from "@/components/caseStatuses/StatusBadge/StatusBadge";
import { StatusSetEditor } from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor";
import css from "./CaseTypeDraftCard.module.css";
import type { CaseTypeDraftEditor } from "./useCaseTypeDraftEditor";

type Props = {
  editor: CaseTypeDraftEditor;
};

/**
 * The statuses the new case type starts with. The proposal shows as a
 * read-only list, each badge beside what it means, until the user chooses to
 * edit it; then the status set editor takes its place.
 */
export function CaseTypeDraftStatusSection({
  editor,
}: Readonly<Props>): React.ReactNode {
  const { t } = useLingui();
  const [isEditing, setIsEditing] = useState(false);
  const { statusSet } = editor;

  return (
    <Stack gap={4}>
      <Group justify="space-between" wrap="nowrap">
        <Text size="xs" fw={600} c="dimmed" tt="uppercase">
          <Trans>Statuses</Trans>
        </Text>
        {isEditing ? null : (
          <Button
            size="compact-xs"
            variant="subtle"
            onClick={() => {
              setIsEditing(true);
            }}
          >
            <Trans>Edit statuses</Trans>
          </Button>
        )}
      </Group>
      {isEditing ? (
        <StatusSetEditor value={statusSet} onChange={editor.setStatusSet} />
      ) : (
        <ul className={css.statusList} aria-label={t`Proposed statuses`}>
          {statusSet.statuses.map((status) => {
            return (
              <li key={status.id} className={css.statusRow}>
                <StatusBadge
                  name={status.name}
                  color={status.color}
                  description={status.description}
                />
                {status.id === statusSet.defaultStatusId ? (
                  <Text size="xs" c="blue.7">
                    <Trans>default</Trans>
                  </Text>
                ) : null}
                <Text size="xs" c="dimmed" className={css.columnHint}>
                  {status.description}
                </Text>
              </li>
            );
          })}
        </ul>
      )}
    </Stack>
  );
}
```

Append to `CaseTypeDraftCard.module.css`:

```css
.statusList {
  display: flex;
  flex-direction: column;
  gap: var(--mantine-spacing-xs);
  list-style: none;
  margin: 0;
  padding: 0;
}

.statusRow {
  align-items: center;
  display: flex;
  gap: var(--mantine-spacing-xs);
  min-width: 0;
}
```

In `CaseTypeDraftCard.tsx`, add the import:

```tsx
import { CaseTypeDraftStatusSection } from "./CaseTypeDraftStatusSection";
```

and render the section between the manual-entry section and the checkbox:

```tsx
            <CaseTypeDraftManualEntrySection editor={editor} />
            <CaseTypeDraftStatusSection editor={editor} />
            <Checkbox
```

- [ ] **Step 7: Flag "status" where the user types a name**

In `CaseTypeDraftAttributeRow.tsx`, add the import:

```tsx
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
```

and add an `error` prop to the name `TextInput`:

```tsx
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
```

In `CaseTypeDraftManualEntrySection.tsx`, add the same import, then inside the component after `const [newAttributeName, setNewAttributeName] = useState("");`:

```tsx
  const isNewNameReserved =
    ConceptStatus.isReservedAttributeName(newAttributeName);
```

Add to the `TextInput`:

```tsx
          error={
            isNewNameReserved
              ? t`Every case type already has a status. Choose another name.`
              : undefined
          }
```

and change the `ActionIcon`'s `disabled` to:

```tsx
          disabled={newAttributeName.trim().length === 0 || isNewNameReserved}
```

- [ ] **Step 8: Run the card tests**

Run: `pnpm test:frontend CaseTypeDraftBlock useCaseTypeDraftEditor`
Expected: PASS, including every existing test.

- [ ] **Step 9: Extract and compile the catalogs, then check the design**

Run: `pnpm i18n:extract && pnpm i18n:compile`
Expected: `src/i18n/locales/en/messages.po` gains "Statuses", "Proposed statuses", "default", and "Every case type already has a status. Choose another name." ("Edit statuses" may already exist from plan 3). Each references the new or edited file.

Run the `impeccable` detector on `src/components/ChatPanel/CaseTypeDraftBlock/` as its skill instructs, and fix anything it reports in the files this task touched.

Run: `pnpm type-check && pnpm lint`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/components/ChatPanel/CaseTypeDraftBlock src/i18n/locales
git commit -m "feat(case-statuses): show and edit proposed statuses in the chat draft card" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: E2E spec 4, grouping a case type by status

**Files:**
- Create: `tests/e2e/helpers/CaseTypeSeedHelpers.ts`
- Create: `tests/e2e/case-statuses-data-explorer.spec.ts`

The case type and its three records are preconditions, seeded directly. The behavior under test (grouping in the Data Explorer, changing a status on the record page) is driven through the UI. The record-page step uses plan 3's locators from `tests/e2e/case-statuses-record.spec.ts`: the status control is a menu button named `Status: <current status>` whose items are named by status. Plan 3's `insertE2ECaseTypeWithRecords` seeds case types with no attributes, and this spec needs a dataset-backed attribute to group by, so it keeps its own `CaseTypeSeedHelpers`.

- [ ] **Step 1: Write the seed helper**

Create `tests/e2e/helpers/CaseTypeSeedHelpers.ts`:

```ts
import { randomUUID } from "node:crypto";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

type SeedCaseTypeOverDatasetOptions = {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
  caseTypeName: string;
  datasetId: string;
  /** The dataset column whose values key, and label, each record. */
  keyColumnName: string;
  /** The name of the one attribute, read from `keyColumnName`. */
  keyAttributeName: string;
  /** One record per key, named after it. */
  recordKeys: readonly string[];
};

/** A seeded case type and its two statuses' ids. */
export type SeededCaseType = {
  conceptId: string;
  statusIdsByName: { Active: string; Inactive: string };
};

async function _getWorkspaceOwnerId(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseDBClient;
    workspaceId: string;
  }>,
): Promise<string> {
  const { data } = await options.supabaseAdminClient
    .from("workspaces")
    .select("owner_id")
    .eq("id", options.workspaceId)
    .single()
    .throwOnError();
  return data.owner_id;
}

async function _getDatasetColumnId(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseDBClient;
    datasetId: string;
    columnName: string;
  }>,
): Promise<string> {
  const { data } = await options.supabaseAdminClient
    .from("dataset_columns")
    .select("id")
    .eq("dataset_id", options.datasetId)
    .eq("name", options.columnName)
    .single()
    .throwOnError();
  return data.id;
}

/**
 * Seeds a case type whose one attribute (the label and identifier) reads a
 * dataset column, with Active (the default) and Inactive statuses and one
 * record per key. It goes through `rpc_concepts__create`, the same single
 * transaction the app uses, because a case type and its default status
 * reference each other and cannot be inserted one request at a time.
 */
async function _seedCaseTypeOverDataset(
  options: Readonly<SeedCaseTypeOverDatasetOptions>,
): Promise<SeededCaseType> {
  const { supabaseAdminClient, workspaceId } = options;
  const [ownerId, datasetColumnId] = await Promise.all([
    _getWorkspaceOwnerId({ supabaseAdminClient, workspaceId }),
    _getDatasetColumnId({
      supabaseAdminClient,
      datasetId: options.datasetId,
      columnName: options.keyColumnName,
    }),
  ]);
  const conceptId = randomUUID();
  const attributeId = randomUUID();
  const statusIdsByName = { Active: randomUUID(), Inactive: randomUUID() };

  await supabaseAdminClient
    .rpc("rpc_concepts__create", {
      p_concept: {
        id: conceptId,
        workspace_id: workspaceId,
        owner_id: ownerId,
        name: options.caseTypeName,
        description: null,
        allow_manual_creation: false,
        default_status_id: statusIdsByName.Active,
      },
      p_statuses: [
        {
          id: statusIdsByName.Active,
          workspace_id: workspaceId,
          concept_id: conceptId,
          name: "Active",
          description: "Open and being worked on.",
          color: "#40c057",
          position: 0,
        },
        {
          id: statusIdsByName.Inactive,
          workspace_id: workspaceId,
          concept_id: conceptId,
          name: "Inactive",
          description: "No longer being worked on.",
          color: "#637c95",
          position: 1,
        },
      ],
      p_attributes: [
        {
          id: attributeId,
          workspace_id: workspaceId,
          concept_id: conceptId,
          name: options.keyAttributeName,
          description: null,
          data_type: "varchar",
          mapping_type: "dataset_column",
          is_label: true,
          is_identifier: true,
          is_array: false,
          allow_manual_edit: false,
        },
      ],
      p_dataset_column_mappings: [
        {
          workspace_id: workspaceId,
          concept_attribute_id: attributeId,
          value_picker_rule_type: "first",
          dataset_id: options.datasetId,
          dataset_column_id: datasetColumnId,
        },
      ],
      p_manual_entry_mappings: [],
    })
    .throwOnError();

  // No `status_id`: the default-status trigger fills it, as it does for sync.
  await supabaseAdminClient
    .from("individuals")
    .insert(
      options.recordKeys.map((key) => {
        return {
          workspace_id: workspaceId,
          concept_id: conceptId,
          external_id: key,
          name: key,
        };
      }),
    )
    .throwOnError();

  return { conceptId, statusIdsByName };
}

/** Deletes a seeded case type, which cascades to its statuses and records. */
async function _deleteCaseType(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseDBClient;
    conceptId: string;
  }>,
): Promise<void> {
  await options.supabaseAdminClient
    .from("concepts")
    .delete()
    .eq("id", options.conceptId)
    .throwOnError();
}

/** Seeds and removes case types as E2E preconditions. */
export const CaseTypeSeedHelpers = {
  /**
   * Seeds a dataset-backed case type with Active and Inactive statuses and
   * one Active record per key.
   */
  seedCaseTypeOverDataset: _seedCaseTypeOverDataset,

  /** Deletes a seeded case type with its statuses and records. */
  deleteCaseType: _deleteCaseType,
};
```

- [ ] **Step 2: Write the spec**

Create `tests/e2e/case-statuses-data-explorer.spec.ts`:

```ts
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { CaseTypeSeedHelpers } from "./helpers/CaseTypeSeedHelpers";
import {
  SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
  SMALL_CALIFORNIA_CSV_PATH,
} from "./helpers/constants";
import {
  dismissBlockingOverlays,
  openDataExplorerDrawerTab,
} from "./helpers/dataExplorerFlow";
import { deleteDatasetFixture } from "./helpers/deleteDatasetFixture";
import { importDatasetViaUi } from "./helpers/importDatasetViaUi";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { MEDIUM_WAIT } from "./helpers/timeouts";
import { installDuckDbExtensionCache } from "./setup/installDuckDbExtensionCache";
/**
 * The Data Explorer's built-in `status` column, end to end: a case type
 * grouped by status counts its records per status, and a status changed on
 * the record page moves a record from one count to the other.
 *
 * The case type reads its one attribute from a real dataset, because only a
 * dataset-backed attribute has a value to count. The dataset is imported and
 * the case type seeded in `beforeAll`, in a browser context of its own: the
 * case type list is cached for minutes once a session loads it, so the session
 * under test has to start after the case type exists.
 */
import type { SeededCaseType } from "./helpers/CaseTypeSeedHelpers";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { Page } from "@playwright/test";

test.use({ trace: "retain-on-failure" });

const CASE_TYPE_NAME = "E2E county cases";
const KEY_COLUMN_NAME = "Admin2";
const KEY_ATTRIBUTE_NAME = "County";
const RECORD_KEYS = ["Alameda", "Alpine", "Amador"] as const;
const CHANGED_RECORD_KEY = "Alameda";
const COUNT_COLUMN_NAME = `count(${KEY_ATTRIBUTE_NAME})`;

/** What `beforeAll` created, so `afterAll` removes exactly that. */
const seededWorld: {
  workspaceId: string | undefined;
  datasetId: string | undefined;
  caseType: SeededCaseType | undefined;
} = { workspaceId: undefined, datasetId: undefined, caseType: undefined };

/** Every value rendered in one column of the results grid. */
async function _getColumnCellTexts(options: {
  page: Page;
  columnName: string;
}): Promise<string[]> {
  const { page, columnName } = options;
  const header = page.getByRole("columnheader", {
    name: columnName,
    exact: true,
  });
  const columnIndex = await header.evaluate((element) => {
    return Number(element.getAttribute("aria-colindex") ?? "0");
  });
  return page
    .locator(`[role="gridcell"][aria-colindex="${columnIndex}"]`)
    .allInnerTexts();
}

/** The grouped result as `{ <status>: <count> }`. */
async function _readStatusCounts(page: Page): Promise<Record<string, string>> {
  const [statuses, counts] = await Promise.all([
    _getColumnCellTexts({ page, columnName: "status" }),
    _getColumnCellTexts({ page, columnName: COUNT_COLUMN_NAME }),
  ]);
  return Object.fromEntries(
    statuses.map((status, index) => {
      return [status, counts[index] ?? ""];
    }),
  );
}

async function _chooseAggregation(options: {
  page: Page;
  columnName: string;
  aggregationLabel: string;
}): Promise<void> {
  const queryPanel = options.page.getByRole("tabpanel", { name: /^query$/i });
  await queryPanel
    .getByRole("combobox", { name: options.columnName, exact: true })
    .click();
  await options.page
    .getByRole("option", { name: options.aggregationLabel, exact: true })
    .click();
}

/**
 * Builds "count of County, grouped by status" over the case type in the
 * manual query form.
 */
async function _groupCaseTypeByStatus(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Data Explorer", exact: true }).click();
  await dismissBlockingOverlays(page);
  await openDataExplorerDrawerTab({ page, tab: "query" });

  const queryPanel = page.getByRole("tabpanel", { name: /^query$/i });
  const dataSourceInput = queryPanel.getByRole("combobox", {
    name: "Data source",
    exact: true,
  });
  await expect(dataSourceInput).toBeEnabled({ timeout: MEDIUM_WAIT });
  await dataSourceInput.click();
  await page.getByRole("option", { name: CASE_TYPE_NAME, exact: true }).click();

  const columnsInput = queryPanel.getByPlaceholder("Select columns to query");
  await columnsInput.fill(KEY_ATTRIBUTE_NAME);
  await page
    .getByRole("option", { name: KEY_ATTRIBUTE_NAME, exact: true })
    .click();
  await columnsInput.fill("status");
  await page.getByRole("option", { name: "status", exact: true }).click();
  await page.keyboard.press("Escape");

  await _chooseAggregation({
    page,
    columnName: "status",
    aggregationLabel: "Group by",
  });
  await _chooseAggregation({
    page,
    columnName: KEY_ATTRIBUTE_NAME,
    aggregationLabel: "Count",
  });
}

/** Opens one record from the sidebar and sets its status on the record page. */
async function _setRecordStatus(options: {
  page: Page;
  recordKey: string;
  statusName: string;
}): Promise<void> {
  const { page } = options;
  await page.getByRole("link", { name: CASE_TYPE_NAME, exact: true }).click();
  // Each row's link names the record after its status dot, and the record
  // page's status control is a menu button named "Status: <current status>".
  // Both match plan 3's `case-statuses-record.spec.ts`.
  await page
    .getByRole("link", { name: new RegExp(`${options.recordKey}$`) })
    .click();
  await page.getByRole("button", { name: /^Status: / }).click();
  await page
    .getByRole("menuitem", { name: options.statusName, exact: true })
    .click();
}

/** Oracle read: the record's saved status id. */
async function _readRecordStatusId(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  conceptId: string;
  externalId: string;
}): Promise<string> {
  const { data } = await options.supabaseAdminClient
    .from("individuals")
    .select("status_id")
    .eq("concept_id", options.conceptId)
    .eq("external_id", options.externalId)
    .single()
    .throwOnError();
  return data.status_id;
}

test.describe("Data Explorer status column", () => {
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
    seededWorld.caseType = await CaseTypeSeedHelpers.seedCaseTypeOverDataset({
      supabaseAdminClient: admin,
      workspaceId: seededWorld.workspaceId,
      caseTypeName: CASE_TYPE_NAME,
      datasetId: seededWorld.datasetId,
      keyColumnName: KEY_COLUMN_NAME,
      keyAttributeName: KEY_ATTRIBUTE_NAME,
      recordKeys: RECORD_KEYS,
    });
  });

  // Removes the case type (with its statuses, records, and the status the
  // test changed) and the dataset, whatever the test did.
  test.afterAll(async () => {
    const admin = createSupabaseAdminClient();
    if (seededWorld.caseType) {
      await CaseTypeSeedHelpers.deleteCaseType({
        supabaseAdminClient: admin,
        conceptId: seededWorld.caseType.conceptId,
      });
    }
    if (seededWorld.datasetId && seededWorld.workspaceId) {
      await deleteDatasetFixture({
        admin,
        datasetId: seededWorld.datasetId,
        workspaceId: seededWorld.workspaceId,
      });
    }
  });

  test("a status changed on the record page moves the record between the grouped status counts", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const { caseType } = seededWorld;
    if (!caseType) {
      throw new Error("beforeAll did not seed the case type.");
    }

    await signInWithEmailPassword(page, {
      email: primaryUser.email,
      password: primaryUser.password,
      workspaceSlug,
    });

    await _groupCaseTypeByStatus(page);
    await expect
      .poll(
        async () => {
          return _readStatusCounts(page);
        },
        { timeout: MEDIUM_WAIT },
      )
      .toEqual({ Active: "3" });

    await _setRecordStatus({
      page,
      recordKey: CHANGED_RECORD_KEY,
      statusName: "Inactive",
    });
    // The explorer can only see a saved change, so wait for the save itself.
    await expect
      .poll(
        async () => {
          return _readRecordStatusId({
            supabaseAdminClient: admin,
            conceptId: caseType.conceptId,
            externalId: CHANGED_RECORD_KEY,
          });
        },
        { timeout: MEDIUM_WAIT },
      )
      .toBe(caseType.statusIdsByName.Inactive);

    // The explorer keeps its query across routes; the status change
    // invalidated its result, so returning re-runs the same grouping.
    await page.getByRole("link", { name: "Data Explorer", exact: true }).click();
    await expect
      .poll(
        async () => {
          return _readStatusCounts(page);
        },
        { timeout: MEDIUM_WAIT },
      )
      .toEqual({ Active: "2", Inactive: "1" });
  });
});
```

- [ ] **Step 3: Check the switch and run the spec on its own**

Run: `ava supabase status`
Expected: the first line is green and names `feat-statuses`. If not, stop and run `ava supabase switch` per `CLAUDE.md`.

Run: `pnpm test:e2e case-statuses-data-explorer.spec.ts`
Expected: 1 passed. If the final poll times out with `{ Active: "3" }`, plan 3's invalidation of Data Explorer queries after a status change did not run; report it rather than adding a reload. If `beforeAll` exceeds 45 seconds, diagnose the slow step (the cloud poll is the usual one) rather than raising the timeout.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/helpers/CaseTypeSeedHelpers.ts tests/e2e/case-statuses-data-explorer.spec.ts
git commit -m "test(case-statuses): group a case type by status in the Data Explorer end to end" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Documentation

**Files:**
- Modify: `docs/ontology-architecture.md`
- Modify: `docs/production-plan-world-humanitarian-day.md`

Plan 2 also edited `docs/ontology-architecture.md` (the `individuals` row, section 13's status placement, section 16, the reserved name). Apply the edits below to the file as it stands; where plan 2 already reworded a sentence quoted here, add this plan's content to its wording instead of replacing it.

- [ ] **Step 1: Code layout (section 3)**

After the "**Concepts as QETL relations**" bullet, add:

```markdown
- **Data Explorer status column**: `shared/models/queries/ConceptStatusColumn/`, `src/views/DataExplorerApp/makeQueryColumnsFromConcept/`
```

Replace the "**Chat edge function pieces**" bullet with:

```markdown
- **Chat edge function pieces**: `supabase/functions/chat/PostChatMessages/parsing/parseProposeCaseType.ts`, `parseProposedCaseStatuses.ts`, `parseCreateCaseTypes.ts`, `prompt/buildCaseManagerSystemPrompt.ts`
```

In the module dependency diagram, replace `EF -- "chat.types only" --> SM` with:

```text
  EF -- "chat.types and<br/>the ConceptStatus model" --> SM
```

- [ ] **Step 2: Chat path (section 5.3)**

Append to the `parseProposeCaseType` bullet:

```markdown
  It renames an attribute named "status" to "status (attribute)"
  (`ConceptStatus.toNonReservedAttributeName`), and keeps the proposal's status
  set only when it is valid as a whole (`parseProposedCaseStatuses`: 1 to 12
  statuses, names unique case-insensitively, the default one of them, colors
  from the palette with missing ones filled by `ConceptStatus.getNextFreeColor`).
  An invalid or absent set is dropped, and the client supplies the default set.
```

Append to the `buildCaseManagerSystemPrompt` bullet:

```markdown
  It tells the model every case type already has a built-in status, and asks
  for a status set, each status with a one-sentence description for the people
  working the cases, when the case type implies a workflow.
```

After the sentence "On the client, the draft becomes `pendingCaseTypeDraft` and `CaseTypeDraftBlock` renders it.", add:

```markdown
The card lists the proposed statuses, or the translated default set for a
proposal with none, each badge beside its description, and swaps the list for
`StatusSetEditor` when the user chooses Edit statuses. An attribute or
hand-filled field named "status" is flagged and blocks Create.
```

Append to conversion step 1 ("`proposedCaseTypeToCreatedCaseType` applies the user's edits..."):

```markdown
   It also carries the card's status set as `statuses` and
   `defaultStatusName`.
```

Append to conversion step 2 ("`createdCaseTypeToFormValues` ..."):

```markdown
   It builds the status set with `makeStatusSetValueFromChatStatuses`: chat's
   statuses with fresh ids and the named default, or the default set when chat
   sent none, which is always the case for `createCaseTypes`.
```

- [ ] **Step 3: Concepts as QETL relations (section 8)**

In the first diagram, replace node `C` with:

```text
  C["Plan per concept,<br/>read from Postgres<br/>before the lease:<br/>attribute columns,<br/>contributing dataset ids,<br/>external ids and<br/>status names"]
```

In the second diagram, replace node `F` with:

```text
  F["loadConceptSpine: external ids and<br/>status names as CSV into<br/>concept_{id}__individuals,<br/>both typed VARCHAR"]
```

Replace the Planning, Column resolution, Spine and View rows of the table with:

```markdown
| Planning | `conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql.ts` | No Postgres read for SQL that names no concept; foreign concepts and contributors throw (fail closed); statuses are read once per concept and matched to each record by `statusId`, and a record whose status is missing throws |
| Column resolution | `conceptRelation/makeConceptAttributeColumnsFromMetadata.ts` | One column per attribute; one key column per dataset; `status` is taken before any attribute, and duplicate names (including an attribute named `status`) are suffixed `_2`, `_3`; manual-entry and unmapped attributes become typed NULL columns; a missing dataset column or key column throws |
| Spine | `conceptRelation/loadConceptSpine/loadConceptSpine.ts`, `conceptRelation/toCsvRows.ts` | Keys and status names travel as RFC 4180 CSV, never spliced into SQL; both columns pinned to `VARCHAR`; empty `external_id` refused; empty concept gets an empty table with both typed columns |
| View | `conceptRelation/buildConceptViewSql.ts` | `FROM` is the spine alone, every attribute a correlated subquery, so the grain is one row per individual and a missing contribution is NULL; `external_id` and `status` come from the spine and win over an attribute of the same name; attribute columns sorted by name for byte-stable SQL; array attributes as `list(... ORDER BY file_row_number)` |
```

After the "**Naming.**" paragraph, add:

```markdown
**The status column.** Every concept view has a `status` column holding each
record's status name. The Data Explorer offers it after the attributes as a
`ConceptStatusColumn` base column whose id is the case type's id, so
`Model.getTypedId` gives it the same identity on every load and a selected
status column survives a refetch of the column list or a restore from the URL
(`makeQueryColumnsFromConcept`, used by `useQueryColumnsForDataSource` and
`getRestoredColumnsFromUrl`). Filters, grouping and aggregation need nothing
special, because they read only a base column's `name` and `dataType`. The
legacy `_runConceptQuery` path reads attribute values only and leaves the
status column out. Filters match the status name, so renaming a status changes
what a saved `status = '...'` filter matches. Chat's schema line lists each
case type's statuses in position order (`- c0: Cholera case (age, status:
Suspected | Confirmed)`), online through `fetchWorkspaceSchema` and offline
through `fetchOfflineChatSchema`.
```

- [ ] **Step 4: Invariants (section 10)**

Replace the row

```markdown
| No user data spliced into concept SQL | `loadConceptSpine` loads keys as CSV through `toCsvColumn` | The record page does not yet follow it |
```

with

```markdown
| No user data spliced into concept SQL | `loadConceptSpine` loads keys and status names as CSV through `toCsvRows` | The record page does not yet follow it |
| A concept view's `status` is the record's status | `makeConceptAttributeColumnsFromMetadata` reserves the name; `buildConceptViewSql` drops an attribute column of that name | Behind the `concept_attributes__name_not_reserved` check |
```

- [ ] **Step 5: Per-case capability layers (section 13)**

Replace items 6 and 7 of "Layers a per-case capability touches" with:

```markdown
6. **QETL**, if SQL and dashboards should see the state: the spine carries
   `external_id` and the status name (`ConceptRelationPlan.spineRows`, written
   by `toCsvRows`), so a new per-case field widens the spine row type, the
   spine's columns in `loadConceptSpine`, and the view's select list, as status
   does.
7. **Chat**, if case types should propose the capability: types, parser, tool
   schema, prompt, and draft card, as status sets do
   (`parseProposedCaseStatuses`, `proposeCaseType.statuses`,
   `CaseTypeDraftStatusSection`).
```

- [ ] **Step 6: Testing (section 15)**

Replace the executed-tests row's file list with:

```markdown
| Concept view and column resolution against real DuckDB | `src/lib/sql/__tests__/buildConceptViewSql.executed.test.ts`, `conceptAttributeColumns.executed.test.ts`, `toCsvColumn.executed.test.ts`, `toCsvRows.executed.test.ts`, `tests/integration/queries/structuredQueryConcepts.executed.test.ts` | `pnpm vitest run --config vitest.executed.config.ts <files>` (or `pnpm test:executed`) |
```

and add a row after "Records UI":

```markdown
| Status column end to end | `tests/e2e/case-statuses-data-explorer.spec.ts` | `pnpm test:e2e case-statuses-data-explorer.spec.ts`, on its own |
```

- [ ] **Step 7: Roadmap**

In `docs/production-plan-world-humanitarian-day.md`:

Replace

```markdown
**Current state:** `Individual.status` is a free `string` defaulted to `active`;
status options are hard-coded in a stub UI. Nothing configurable.
```

with

```markdown
**Current state:** Status sets ship (P5b.1): each case type has its own
statuses in `concept_statuses`, and every record points at one through
`individuals.status_id`. Enumerations and relations are not configurable yet.
```

Replace

```markdown
- P5b.1 `[NEW]` Configurable **status sets** per TBox (e.g. Suspected →
  Probable → Confirmed → Recovered/Deceased for a case; org can define their
  own).
```

with

```markdown
- P5b.1 `[DONE]` Configurable **status sets** per TBox (e.g. Suspected →
  Probable → Confirmed → Recovered/Deceased for a case; org can define their
  own). Each status has a name, a description, a palette color, an order, and
  one default per case type, edited in the create form, the chat draft card,
  and the case type page. Spec:
  `docs/superpowers/specs/2026-10-25-case-statuses-design.md`.
```

Replace

```markdown
**Current state:** Case-management UI is **stubs with no backend**:
`ActivityBlock` (comments) calls `notifyNotImplemented`; `StatusPill` is a
hard-coded combobox with no persistence; `Individual.assignedTo` column exists with
no writer/UI. Greenfield.
```

with

```markdown
**Current state:** Status workflow and the records list's status filter ship
(P5c.4, and P5c.6 except the assignee filter). Comments and assignment are still **stubs with no backend**:
`ActivityBlock` (comments) calls `notifyNotImplemented`, and
`Individual.assignedTo` exists with no writer or UI.
```

Replace

```markdown
- P5c.4 `[NEW]` **Status workflow**: set/track status from the configurable set
  (P5b.1); status change history.
```

with

```markdown
- P5c.4 `[DONE, except history]` **Status workflow**: set/track status from the
  configurable set (P5b.1). A record's status changes from the record page,
  with each status's description on hover; status is a column in the Data
  Explorer and in chat's schema, and chat proposes a status set when it drafts a
  case type. Status change history moved to P5c.9.
```

Replace

```markdown
- P5c.6 `[NEW]` ABox **list/grid view** with filtering by status/assignee
  (today there's only a virtualized navbar + single-individual detail).
```

with

```markdown
- P5c.6 `[PARTIAL]` ABox **list/grid view** with filtering by status/assignee.
  Done: the records list filters by status and counts the matching records.
  Not done: filtering by assignee, which waits on assignment (P5c.3).
```

After the P5c.8 bullet, add:

```markdown
- P5c.9 `[NEW]` **Case change history**: record who changed what on a case and
  when, across status, assignment, and edits, and show it on the record page.
  Covers the status change history left out of P5c.4 and feeds P5c.5. Kept out
  of the status sets work on purpose (case statuses spec, follow-up 1).
```

- [ ] **Step 8: Check the docs for em dashes**

Run: `grep -n "$(printf '\342\200\224')" docs/ontology-architecture.md docs/production-plan-world-humanitarian-day.md`
Expected: no line this plan added. (The production plan's title line already contains one; leave it.)

- [ ] **Step 9: Commit**

```bash
git add docs/ontology-architecture.md docs/production-plan-world-humanitarian-day.md
git commit -m "docs(case-statuses): document the status column and chat statuses, and update the roadmap" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Verification checklist

- [ ] `pnpm test:frontend` passes.
- [ ] `pnpm test:executed` passes, including `toCsvRows`, `buildConceptViewSql`, `conceptAttributeColumns`, and `structuredQueryConcepts`.
- [ ] `pnpm type-check` passes, including `deno check` of `shared` and `supabase/functions`.
- [ ] `pnpm lint` passes.
- [ ] `pnpm i18n:check` is clean.
- [ ] `pnpm test:e2e case-statuses-data-explorer.spec.ts` passes, run on its own, after `ava supabase status` reads green.
- [ ] In the Data Explorer, a case type's column list ends with `status`; selecting it with Group by returns one row per status in use; reloading the page with `status` in the URL keeps it selected.
- [ ] In chat's SQL mode, the system prompt's case type line ends with `status: <names in position order>`; offline chat shows the same.
- [ ] In the Case Manager chat, a workflow domain (for example "cholera outbreak investigation") produces a draft card listing proposed statuses with descriptions; Edit statuses opens the editor; Create persists those statuses with the named default.
- [ ] A proposal without statuses shows, and creates, Active and Inactive.
- [ ] `git status` shows only `supabase/config.toml` modified.
- [ ] Nothing was run against production.
