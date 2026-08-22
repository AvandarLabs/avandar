# Chat Concept Aliases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chat schema blocks and SQL rewrite cover concepts as `c0`, `c1`, … that become `concept_<uuid>` before execution.

**Architecture:** Extend `SqlTableAlias` with a discriminated dataset/concept entry, assign `cN` by sorted concept id, and rewrite through `RelationRef.toTableName`. The same alias list feeds cloud chat, the leftover generate-SQL route, and offline prompts.

**Tech Stack:** TypeScript, Vitest, `SqlTableAlias`, `RelationRef`, Supabase edge functions, ConceptClient / ConceptAttributeClient.

## Global Constraints

- Import models from `MyModel.ts`, never `*.types.ts`, outside model folders.
- TDD: failing test first, watch it fail, then minimal production code.
- Do not touch Case Manager UI.
- Do not invent a second alias scheme.
- Do not send raw row / individual / mapping values in the prompt.
- Do not hard-code the `concept_` table-name prefix; use `RelationRef.toTableName`.
- Dataset aliases stay `tN` sorted by dataset id; concept aliases are `cN` sorted by concept id.
- No production DB writes. No switched `supabase/config.toml` commits.
- Stay in `/Users/juanpablosarmiento/src/worktrees/avandar/feat/chat-concept-aliases`.

---

## File map

- Modify: `shared/models/chat/SqlTableAlias/SqlTableAlias.types.ts`
- Modify: `shared/models/chat/SqlTableAlias/SqlTableAlias.ts`
- Modify: `shared/models/chat/SqlTableAlias/SqlTableAliasModule.ts`
- Modify: `shared/models/chat/SqlTableAlias/SqlTableAlias.test.ts`
- Modify: `supabase/functions/chat/PostChatMessages/schema/fetchWorkspaceSchema.ts`
- Create: `supabase/functions/chat/PostChatMessages/schema/fetchWorkspaceSchema.test.ts`
- Modify: `supabase/functions/chat/utils/buildSqlSystemPrompt/buildSqlSystemPrompt.ts`
- Modify: `supabase/functions/chat/utils/buildSqlSystemPrompt/buildSqlSystemPrompt.test.ts`
- Modify: `supabase/functions/chat/PostChatMessages/parsing/parseOpenRouterResponse.ts`
- Modify: `supabase/functions/chat/PostChatMessages/parsing/parseOpenRouterResponse.test.ts`
- Modify: `supabase/functions/chat/PostChatMessages/runChatAttemptsWithEscalation/runChatAttemptsWithEscalation.ts`
- Modify: `supabase/functions/chat/PostChatMessages/runChatAttemptsWithEscalation/runChatAttemptsWithEscalation.test.ts`
- Modify: `supabase/functions/chat/PostChatMessages/PostChatMessages.ts`
- Modify: `supabase/functions/queries/QueriesRoutes.ts`
- Modify: `shared/types/offlineChat.types.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/fetchOfflineChatSchema.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/OfflineChatSchemaCache.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/truncateSchemaForOffline/truncateSchemaForOffline.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/narrowOfflineSchema.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/ensureOfflineChatSchema/ensureOfflineChatSchema.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/buildOfflinePrompts/buildOfflinePrompts.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/buildOfflinePrompts/buildOfflinePrompts.test.ts`
- Modify: `src/components/ChatPanel/offlineChatHelpers/matchOfflineDatasetTable.ts`
- Modify: `src/components/ChatPanel/offlineChatHelpers/repairOfflineGeneratedSql/repairOfflineGeneratedSql.ts`
- Create: `STATUS.md`

---

### Task 1: SqlTableAlias concepts

**Files:**

- Modify: `shared/models/chat/SqlTableAlias/SqlTableAlias.types.ts`
- Modify: `shared/models/chat/SqlTableAlias/SqlTableAlias.ts`
- Modify: `shared/models/chat/SqlTableAlias/SqlTableAliasModule.ts`
- Test: `shared/models/chat/SqlTableAlias/SqlTableAlias.test.ts`

**Interfaces:**

- Consumes: `RelationRef.toTableName(ref: RelationRef.T): string`
- Produces: `SqlTableAlias.fromConcepts`, `SqlTableAlias.fromSchema`, concept rewrite via `applyToSql`

- [ ] **Step 1: Write the failing tests**

Add to `SqlTableAlias.test.ts` (keep existing dataset tests). Use these fixtures:

```ts
const CONCEPT_A = {
  id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  name: "Household",
};
const CONCEPT_B = {
  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  name: "Case",
};
```

Tests:

```ts
describe("SqlTableAlias.fromConcepts", () => {
  it("assigns cN by concept id so input order does not change aliases", () => {
    const forward = SqlTableAlias.fromConcepts([CONCEPT_A, CONCEPT_B]);
    const reverse = SqlTableAlias.fromConcepts([CONCEPT_B, CONCEPT_A]);
    expect(forward).toEqual(reverse);
    expect(forward[0]).toMatchObject({
      kind: "concept",
      alias: "c0",
      conceptId: CONCEPT_B.id,
      name: "Case",
    });
    expect(forward[1]).toMatchObject({
      kind: "concept",
      alias: "c1",
      conceptId: CONCEPT_A.id,
      name: "Household",
    });
  });
});

describe("SqlTableAlias.fromSchema", () => {
  it("lists dataset aliases then concept aliases", () => {
    const aliases = SqlTableAlias.fromSchema({
      datasets: [DATASET_B],
      concepts: [CONCEPT_B],
    });
    expect(aliases.map((entry) => entry.alias)).toEqual(["t0", "c0"]);
  });
});

describe("SqlTableAlias.formatSchemaBlock", () => {
  it("lists concept attribute names without concept UUIDs", () => {
    const aliases = SqlTableAlias.fromConcepts([CONCEPT_B]);
    const block = SqlTableAlias.formatSchemaBlock({
      aliases,
      columns: [],
      conceptAttributes: [
        { concept_id: CONCEPT_B.id, name: "onset_date" },
        { concept_id: CONCEPT_B.id, name: "status" },
      ],
    });
    expect(block).toContain("- c0: Case (onset_date, status)");
    expect(block).not.toContain(CONCEPT_B.id);
  });
});

describe("SqlTableAlias.applyToSql", () => {
  it("rewrites concept aliases to concept table names", () => {
    const aliases = SqlTableAlias.fromConcepts([CONCEPT_B]);
    const sql = SqlTableAlias.applyToSql('SELECT c0.status FROM "c0"', aliases);
    expect(sql).toBe(
      `SELECT "concept_${CONCEPT_B.id}".status FROM "concept_${CONCEPT_B.id}"`,
    );
  });

  it("rewrites c10 before c1 so shorter aliases cannot steal a prefix", () => {
    const concepts = Array.from({ length: 11 }, (_, index) => {
      const suffix = String(index).padStart(12, "0");
      return {
        id: `cccccccc-cccc-4ccc-8ccc-${suffix}`,
        name: `Concept ${index}`,
      };
    });
    const aliases = SqlTableAlias.fromConcepts(concepts);
    const sql = SqlTableAlias.applyToSql('SELECT 1 FROM "c10"', aliases);
    const concept10Id = concepts.sort((left, right) => {
      return left.id.localeCompare(right.id);
    })[10]!.id;
    expect(sql).toBe(`SELECT 1 FROM "concept_${concept10Id}"`);
    expect(sql).not.toContain('"c1"');
    expect(sql).not.toContain(
      `concept_${concepts.sort((left, right) => left.id.localeCompare(right.id))[1]!.id}`,
    );
  });
});
```

Fix the `c10` test so it computes `sorted` once:

```ts
it("rewrites c10 before c1 so shorter aliases cannot steal a prefix", () => {
  const concepts = Array.from({ length: 11 }, (_, index) => {
    const suffix = String(index).padStart(12, "0");
    return {
      id: `cccccccc-cccc-4ccc-8ccc-${suffix}`,
      name: `Concept ${index}`,
    };
  });
  const sorted = [...concepts].sort((left, right) => {
    return left.id.localeCompare(right.id);
  });
  const aliases = SqlTableAlias.fromConcepts(concepts);
  const sql = SqlTableAlias.applyToSql('SELECT 1 FROM "c10"', aliases);
  expect(sql).toBe(`SELECT 1 FROM "concept_${sorted[10]!.id}"`);
  expect(sql).not.toContain(`concept_${sorted[1]!.id}`);
});
```

Also extend the existing `fromDatasets` order test to accept `kind: "dataset"` on entries (toEqual between forward/reverse still holds).

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run shared/models/chat/SqlTableAlias/SqlTableAlias.test.ts`
Expected: FAIL because `fromConcepts` / `fromSchema` are not defined.

- [ ] **Step 3: Implement types and module**

`SqlTableAlias.types.ts`:

```ts
export type SqlTableAliasT =
  | {
      kind: "dataset";
      alias: string;
      datasetId: string;
      name: string;
    }
  | {
      kind: "concept";
      alias: string;
      conceptId: string;
      name: string;
    };

export type SqlTableAliasDataset = {
  id: string;
  name: string;
};

export type SqlTableAliasConcept = {
  id: string;
  name: string;
};

export type SqlTableAliasConceptAttribute = {
  concept_id: string;
  name: string;
};
```

`SqlTableAlias.ts` namespace: export `Concept` and `ConceptAttribute` types next to `Dataset`.

`SqlTableAliasModule.ts`:

- Import `RelationRef` from `$/models/relations/RelationRef/RelationRef.ts`.
- `_fromDatasets` adds `kind: "dataset"`.
- Add `_fromConcepts` mirroring `_fromDatasets` with `c${index}` and `conceptId`.
- Add `_fromSchema({ datasets, concepts })` concatenating the two.
- `_getDatasetIdFromAlias` only matches `kind: "dataset"`.
- `_formatSchemaBlock` accepts optional `conceptAttributes` (default `[]`). Dataset lines use `columns` keyed by `dataset_id`. Concept lines use `conceptAttributes` keyed by `concept_id`.
- `_applyToSql` replaces with `"${RelationRef.toTableName(...)}"`:
  - dataset: `{ kind: "dataset", id: entry.datasetId }`
  - concept: `{ kind: "concept", id: entry.conceptId }`
- Export `fromConcepts` and `fromSchema`.
- Update the module docstring to mention `tN` and `cN`.

Keep functions ≤ 45 lines. Extract `_tableNameForAlias(entry)` if `_applyToSql` would exceed that.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run shared/models/chat/SqlTableAlias/SqlTableAlias.test.ts`
Expected: PASS, including existing dataset rewrite to a bare UUID.

- [ ] **Step 5: Commit**

```bash
git add shared/models/chat/SqlTableAlias
git commit -m "feat: assign cN concept aliases in SqlTableAlias"
```

---

### Task 2: fetchWorkspaceSchema loads concepts

**Files:**

- Modify: `supabase/functions/chat/PostChatMessages/schema/fetchWorkspaceSchema.ts`
- Test: `supabase/functions/chat/PostChatMessages/schema/fetchWorkspaceSchema.test.ts`

**Interfaces:**

- Consumes: Task 1 types (`SqlTableAlias.Concept` shape `{ id, name }`)
- Produces: `{ datasets, columns, concepts, conceptAttributes }`

- [ ] **Step 1: Write the failing test**

Create `fetchWorkspaceSchema.test.ts` with a chainable fake client whose `from(table)` returns rows for that table. Cover:

1. Workspace with no datasets and one concept still returns that concept and its attribute names.
2. Attribute query is not made when there are no concepts (assert `from` was not called with `concept_attributes` in that case — or return empty `conceptAttributes` without needing `.in`).
3. Returned `conceptAttributes` contain `concept_id` and `name` only (no extra row-value fields in the fixture, and the function does not select them).

```ts
it("returns concepts when the workspace has no datasets", async () => {
  const conceptId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const schema = await fetchWorkspaceSchema({
    supabaseClient: createFakeClient({
      datasets: [],
      dataset_columns: [],
      concepts: [{ id: conceptId, name: "Case" }],
      concept_attributes: [{ concept_id: conceptId, name: "status" }],
    }),
    workspaceId: "wwwwwwww-wwww-4www-8www-wwwwwwwwwwww",
  });
  expect(schema.concepts).toEqual([{ id: conceptId, name: "Case" }]);
  expect(schema.conceptAttributes).toEqual([
    { concept_id: conceptId, name: "status" },
  ]);
});
```

The fake must support `.select().eq().in().throwOnError()` chaining. `throwOnError` resolves `{ data: rows }`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run supabase/functions/chat/PostChatMessages/schema/fetchWorkspaceSchema.test.ts`
Expected: FAIL because the return type has no `concepts`.

- [ ] **Step 3: Implement fetch**

Change `fetchWorkspaceSchema` to:

- Query `datasets` and `concepts` (`id, name`) in parallel, both filtered by `workspace_id`.
- If datasets exist, query `dataset_columns` as today.
- If concepts exist, query `concept_attributes` for `concept_id, name` filtered by `workspace_id` and `concept_id IN (...)`.
- If datasets is empty, `columns` is `[]`. If concepts is empty, `conceptAttributes` is `[]`.
- Do not early-return on empty datasets before loading concepts.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run supabase/functions/chat/PostChatMessages/schema/fetchWorkspaceSchema.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/chat/PostChatMessages/schema
git commit -m "feat: load concept names into the chat schema fetch"
```

---

### Task 3: Cloud prompt and rewrite

**Files:**

- Modify: `supabase/functions/chat/utils/buildSqlSystemPrompt/buildSqlSystemPrompt.ts`
- Modify: `supabase/functions/chat/utils/buildSqlSystemPrompt/buildSqlSystemPrompt.test.ts`
- Modify: `supabase/functions/chat/PostChatMessages/parsing/parseOpenRouterResponse.ts`
- Modify: `supabase/functions/chat/PostChatMessages/parsing/parseOpenRouterResponse.test.ts`
- Modify: `supabase/functions/chat/PostChatMessages/runChatAttemptsWithEscalation/runChatAttemptsWithEscalation.ts`
- Modify: `supabase/functions/chat/PostChatMessages/runChatAttemptsWithEscalation/runChatAttemptsWithEscalation.test.ts`
- Modify: `supabase/functions/chat/PostChatMessages/PostChatMessages.ts`

**Interfaces:**

- Consumes: `fetchWorkspaceSchema` concepts + `SqlTableAlias.fromSchema`
- Produces: system prompt listing `cN`; parsed SQL using `concept_<uuid>`

- [ ] **Step 1: Write failing tests**

`buildSqlSystemPrompt.test.ts`:

```ts
it("lists concept aliases and attribute names without concept UUIDs", () => {
  const conceptId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const prompt = buildSqlSystemPrompt({
    prompt: "count cases",
    datasets: [],
    columns: [],
    concepts: [{ id: conceptId, name: "Case" }],
    conceptAttributes: [{ concept_id: conceptId, name: "status" }],
  });
  expect(prompt).toContain("- c0: Case (status)");
  expect(prompt).toContain("c0, c1");
  expect(prompt).not.toContain(conceptId);
});
```

`parseOpenRouterResponse.test.ts`:

```ts
it("rewrites generateSql concept aliases to concept table names", () => {
  const conceptId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const parsed = parseOpenRouterResponse({
    message: {
      tool_calls: [
        {
          function: {
            name: "generateSql",
            arguments: JSON.stringify({
              sql: 'SELECT "status" FROM "c0" LIMIT 10',
            }),
          },
        },
      ],
    },
    attemptText: "",
    lastUserPrompt: "preview cases",
    priorClarifications: 0,
    concepts: [{ id: conceptId, name: "Case" }],
  });
  expect(parsed.generatedSql?.sql).toContain(`FROM "concept_${conceptId}"`);
  expect(parsed.generatedSql?.sql).not.toContain('"c0"');
});
```

`runChatAttemptsWithEscalation.test.ts`: add a test that `concepts` is forwarded to `parseOpenRouterResponse`, matching the existing datasets test.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run supabase/functions/chat/utils/buildSqlSystemPrompt/buildSqlSystemPrompt.test.ts supabase/functions/chat/PostChatMessages/parsing/parseOpenRouterResponse.test.ts supabase/functions/chat/PostChatMessages/runChatAttemptsWithEscalation/runChatAttemptsWithEscalation.test.ts`
Expected: FAIL on missing `concepts` option / no rewrite.

- [ ] **Step 3: Implement**

`buildSqlSystemPrompt`:

- Options gain `concepts?: readonly { id: string; name: string }[]` and `conceptAttributes?: readonly { concept_id: string; name: string }[]` (default `[]`).
- `SqlTableAlias.fromSchema({ datasets, concepts })`.
- `formatSchemaBlock({ aliases, columns, conceptAttributes })`.
- Notes mention `t0, t1, …` for datasets and `c0, c1, …` for concepts.
- Header can stay "Available datasets:" only if concept lines still appear under it; prefer "Available datasets and concepts:".

`parseOpenRouterResponse`:

- Options gain `concepts?: ReadonlyArray<{ id: string; name: string }>`.
- `applySqlTableAliasesToParsedAttempt` takes both lists. Skip rewrite only when both are empty. Otherwise `fromSchema` + `applyToSql`.

`runChatAttemptsWithEscalation`:

- Options gain `concepts?: ReadonlyArray<{ id: string; name: string }>`.
- Pass `concepts` into `parseOpenRouterResponse`.

`PostChatMessages.ts`:

- `buildSqlSystemPrompt({ ..., concepts: schema.concepts, conceptAttributes: schema.conceptAttributes })`.
- `runChatAttemptsWithEscalation({ ..., datasets: schema.datasets, concepts: schema.concepts })`.

- [ ] **Step 4: Run tests to verify they pass**

Run the three test files from Step 2.
Expected: PASS. Existing dataset rewrite tests still pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/chat
git commit -m "feat: rewrite chat concept aliases before SQL leaves the edge"
```

---

### Task 4: Leftover generate-SQL route

**Files:**

- Modify: `supabase/functions/queries/QueriesRoutes.ts`

**Interfaces:**

- Consumes: `fetchWorkspaceSchema`, `SqlTableAlias.fromSchema`
- Produces: generate route SQL with concept table names

- [ ] **Step 1: Write a failing characterization if a route test exists; otherwise pin via a small extracted helper test**

There is no `QueriesRoutes` test file. Add `supabase/functions/queries/QueriesRoutes.sqlWithRelationIds.test.ts` that imports nothing private — instead extract `_sqlWithRelationIds` only if needed.

Keep the route file as the owner. Change `_sqlWithDatasetIds` to use `fromSchema` and pass concepts. Add a colocated test file that re-implements the rewrite assertion through `SqlTableAlias` as the route will call it:

Prefer: change `_fetchWorkspaceQuerySchema` to call `fetchWorkspaceSchema`, then:

```ts
SqlTableAlias.applyToSql(
  cleanLlmGeneratedSql(sql),
  SqlTableAlias.fromSchema({
    datasets,
    concepts: schema.concepts,
  }),
);
```

And `buildSqlSystemPrompt({ prompt, datasets, columns, concepts, conceptAttributes })`.

Because the route is I/O-heavy, the behavioral pin is Task 1 + Task 3. For this task, add a unit test file `QueriesRoutes.aliasRewrite.test.ts` that documents the rewrite the route must apply:

```ts
it("generate-route rewrite turns c0 into a concept table name", () => {
  const conceptId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const sql = SqlTableAlias.applyToSql(
    'SELECT 1 FROM "c0"',
    SqlTableAlias.fromSchema({
      datasets: [],
      concepts: [{ id: conceptId, name: "Case" }],
    }),
  );
  expect(sql).toBe(`SELECT 1 FROM "concept_${conceptId}"`);
});
```

That test would pass from Task 1. Instead, after editing the route, grep the route for `fromDatasets` and confirm it is gone.

Implement the route change; do not add a tautological extra test. Verification: `rg "fromDatasets" supabase/functions/queries/QueriesRoutes.ts` returns no matches, and `fromSchema` is present.

- [ ] **Step 2: Implement the route**

- Import `fetchWorkspaceSchema`.
- Replace `_fetchWorkspaceQuerySchema` with `fetchWorkspaceSchema`.
- Pass `concepts` and `conceptAttributes` into `buildSqlSystemPrompt`.
- Replace `_sqlWithDatasetIds` with apply using `fromSchema({ datasets, concepts })`.

- [ ] **Step 3: Typecheck the queries function files if a targeted command exists; otherwise rely on vitest of chat tests plus `pnpm exec vitest run shared/models/chat/SqlTableAlias/SqlTableAlias.test.ts`**

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/queries/QueriesRoutes.ts
git commit -m "feat: rewrite concept aliases on the leftover generate-SQL route"
```

---

### Task 5: Offline prompts and repair

**Files:**

- Modify: `shared/types/offlineChat.types.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/fetchOfflineChatSchema.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/OfflineChatSchemaCache.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/truncateSchemaForOffline/truncateSchemaForOffline.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/narrowOfflineSchema.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/ensureOfflineChatSchema/ensureOfflineChatSchema.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/buildOfflinePrompts/buildOfflinePrompts.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/buildOfflinePrompts/buildOfflinePrompts.test.ts`
- Modify: `src/components/ChatPanel/offlineChatHelpers/matchOfflineDatasetTable.ts`
- Modify: `src/components/ChatPanel/offlineChatHelpers/repairOfflineGeneratedSql/repairOfflineGeneratedSql.ts`

**Interfaces:**

- Consumes: `SqlTableAlias.fromSchema`, `RelationRef.toTableName`, ConceptClient
- Produces: offline schema block with `cN`; repair that does not smash `concept_<uuid>`

- [ ] **Step 1: Write failing offline prompt test**

In `buildOfflinePrompts.test.ts`, extend `SCHEMA` (or add `SCHEMA_WITH_CONCEPT`) and assert `buildOfflineSqlPrompt` contains `- c0: Case (status)` and does not contain the concept UUID.

Also add a `matchOfflineDatasetTable` test (create `matchOfflineDatasetTable.test.ts` if missing) that `"c0"` against a schema with a concept does **not** return a dataset when `preferredDatasetId` is set.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/buildOfflinePrompts/buildOfflinePrompts.test.ts`
Expected: FAIL because schema has no concepts / prompt has no `c0`.

- [ ] **Step 3: Implement**

`OfflineChatSchema`:

```ts
export type OfflineChatSchemaConcept = { id: string; name: string };
export type OfflineChatSchemaConceptAttribute = {
  concept_id: string;
  name: string;
};
export type OfflineChatSchema = {
  datasets: readonly OfflineChatSchemaDataset[];
  columns: readonly OfflineChatSchemaColumn[];
  concepts: readonly OfflineChatSchemaConcept[];
  conceptAttributes: readonly OfflineChatSchemaConceptAttribute[];
};
```

Cache read: if `concepts` / `conceptAttributes` are missing arrays, coerce to `[]`.

`fetchOfflineChatSchema`: after datasets, `ConceptClient.getAll(where("workspace_id", "eq", args.workspace.id))` and `ConceptAttributeClient.getAll(where("workspace_id", "eq", args.workspace.id))`. Map to `{ id, name }` and `{ concept_id, name }`. Empty fallback includes empty concept arrays.

`truncateSchemaForOffline`: pass concepts through (`schema.concepts.slice(0, MAX_DATASETS)`), keep attributes whose `concept_id` is in the kept set.

`narrowOfflineSchema`: keep `concepts` and `conceptAttributes` unchanged.

`ensureOfflineChatSchema`: preserve concept fields (`args.schema.concepts ?? []`).

`buildOfflinePrompts`: `aliasesFromSchema` uses `fromSchema`. `formatSchema` header can say datasets and concepts. Notes mention `c0` as well as `t0`.

`repairOfflineGeneratedSql`:

- `fromSchema` instead of `fromDatasets`.
- `buildAllowedTableIdSet` adds `RelationRef.toTableName({ kind: "concept", id: concept.id })` for each concept.

`matchOfflineDatasetTable`: after stripping quotes, if `SqlTableAlias.fromConcepts(args.concepts ?? []).some(alias === ref)` OR `RelationRef.fromTableName(ref)?.kind === "concept"`, return `undefined` immediately (do not fall through to preferred dataset). Add an optional `concepts` argument; pass it from repair's remap path.

To avoid changing every matchOfflineDatasetTable caller, accept optional `concepts: readonly { id: string; name: string }[]` defaulting to `[]`. Repair remap must pass `args.schema.concepts`.

- [ ] **Step 4: Run tests**

Run: `pnpm exec vitest run src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/buildOfflinePrompts/buildOfflinePrompts.test.ts src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/truncateSchemaForOffline/truncateSchemaForOffline.test.ts src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/ensureOfflineChatSchema/ensureOfflineChatSchema.test.ts src/components/ChatPanel/offlineChatHelpers/matchOfflineDatasetTable.ts`

Also run any `matchOfflineDatasetTable.test.ts` if created.

Expected: PASS. Truncate test still under `MAX_SCHEMA_BLOCK_CHARS`.

- [ ] **Step 5: Commit**

```bash
git add shared/types/offlineChat.types.ts src/components/ChatPanel
git commit -m "feat: include concept aliases in offline chat prompts"
```

---

### Task 6: STATUS.md

**Files:**

- Create: `STATUS.md`

- [ ] **Step 1: Write STATUS.md** summarizing what shipped, how to demo (`FROM "c0"` becomes `concept_<uuid>`), and files touched.

- [ ] **Step 2: Commit**

```bash
git add STATUS.md
git commit -m "docs: record chat concept alias status"
```
