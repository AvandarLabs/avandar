# Remove Chat Planning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the chat panel's multi-step planning feature, UI, API surface,
and stored data while preserving clarification, privacy, dashboard chat,
offline chat, and one-shot SQL generation.

**Architecture:** Excise the feature vertically at its API, frontend, storage,
schema, dependency, translation, test, and documentation seams. Preserve
adjacent chat behavior with focused regression tests. Perform destructive data
cleanup through a generated Supabase migration and a tested Dexie version
upgrade.

**Tech Stack:** TypeScript 5.9, React 19, Vitest, Dexie 4, Lingui 6, Deno edge
functions, Supabase CLI, PostgreSQL/pgTAP, pnpm.

## Global Constraints

- Do not commit, push, merge, or create a pull request.
- Do not access or modify the Supabase production database.
- Do not access Vercel.
- Author schema changes only in `supabase/schemas/`, then generate the
  migration with `supabase db diff`.
- Do not hand-edit generated `shared/types/database.types.ts` or compiled
  Lingui `messages.ts` files.
- Preserve privacy audits, PII exposure approval, clarification questions,
  dashboard chat, offline chat, and SQL generation.
- Delete existing planning data without conversion.
- Do not change unrelated code.

---

### Task 1: Lock the Preserved Chat Response Contract

**Files:**

- Create:
  `src/components/ChatPanel/applyChatTurnResponse/applyChatTurnResponse.test.ts`
- Move:
  `src/components/ChatPanel/applyChatTurnResponse.ts` to
  `src/components/ChatPanel/applyChatTurnResponse/applyChatTurnResponse.ts`
- Modify:
  `src/components/ChatPanel/useAvandarChatRuntime.ts`

**Interfaces:**

- Consumes: `ChatResponse.T`, `ChatClarifyRequestWithAudit`,
  `ChatModelRunResult`.
- Produces:
  `applyChatTurnResponse(args: ApplyChatTurnResponseArgs):
Promise<ChatModelRunResult>`.
- The handler contract contains only `queueDashboardBlock`,
  `setPendingClarification`, and `recordClarificationShown`.

- [ ] **Step 1: Write the preserved-behavior test first**

  Create a Vitest test that builds these handlers:

  ```ts
  const handlers = {
    queueDashboardBlock: vi.fn(),
    setPendingClarification: vi.fn(),
    recordClarificationShown: vi.fn().mockResolvedValue("audit-1"),
  } satisfies ApplyChatTurnResponseArgs["handlers"];
  ```

  Cover three independent behaviors:
  1. A generated SQL response appends a fenced SQL block when `sqlApplied` is
     true.
  2. A clarification is audited and installed as pending state.
  3. A dashboard block is queued.

- [ ] **Step 2: Verify the type-level RED state**

  Run:

  ```bash
  pnpm type-check
  ```

  Expected: FAIL because the desired handler object omits the currently
  required `loadPlan` handler.

- [ ] **Step 3: Remove plan dispatch from the response mapper**

  Move the implementation beside its test. Change the handler type to:

  ```ts
  handlers: {
    queueDashboardBlock: (
      block: NonNullable<ChatResponse.T["dashboardBlock"]>,
    ) => void;
    setPendingClarification: (
      clarification: ChatClarifyRequestWithAudit | undefined,
    ) => void;
    recordClarificationShown: (
      clarification: ChatClarifyRequestWithAudit,
    ) => Promise<string | undefined>;
  };
  ```

  Delete the `response.plan` branch. Update
  `useAvandarChatRuntime.ts` to import the moved mapper and remove
  `PlanStateManager`, `dropPlanTempViews`, plan state refs, plan dispatch, plan
  retry context, and the `loadPlan` handler.

- [ ] **Step 4: Verify GREEN**

  Run:

  ```bash
  pnpm vitest run \
    src/components/ChatPanel/applyChatTurnResponse/applyChatTurnResponse.test.ts
  pnpm type-check
  ```

  Expected: the new test and type-check pass after the shared response type is
  completed in Task 2. If Task 1 type-check remains red solely because
  `ChatResponse.plan` still exists, record that expected dependency and run
  the final green check immediately after Task 2.

### Task 2: Remove Planning from Shared Types and the Chat Edge Function

**Files:**

- Modify:
  `shared/models/chat/ChatResponse/ChatResponse.types.ts`
- Modify:
  `shared/types/chat.types.ts`
- Modify:
  `supabase/functions/chat/chat.types.ts`
- Modify:
  `supabase/functions/chat/chat.routes.ts`
- Modify:
  `src/lib/offlineChat/buildOfflinePrompts.ts`
- Create:
  `supabase/functions/chat/dataExplorerToolDefinitions/dataExplorerToolDefinitions.ts`
- Create:
  `supabase/functions/chat/dataExplorerToolDefinitions/dataExplorerToolDefinitions.test.ts`

**Interfaces:**

- `ChatResponse.T` retains `assistantText`, `generatedSql`, `clarification`,
  and `dashboardBlock`.
- `ChatRetryContext` retains prior assistant text, generated SQL,
  clarification question, and dashboard block kind.
- `ChatAPI` retains `/models`, `/:workspaceId/messages`, and
  `/:workspaceId/session-secret`.
- `buildDataExplorerToolDefinitions()` returns the actual tool definitions
  installed on Data Explorer requests.

- [ ] **Step 1: Write the Data Explorer tool contract test**

  Import `buildDataExplorerToolDefinitions` and assert:

  ```ts
  expect(
    buildDataExplorerToolDefinitions().map((tool) => {
      return tool.function.name;
    }),
  ).toEqual(["generateSql", "clarify"]);
  ```

  This desired public contract contains no retired feature names.

- [ ] **Step 2: Verify RED**

  Run:

  ```bash
  pnpm vitest run \
    supabase/functions/chat/dataExplorerToolDefinitions/dataExplorerToolDefinitions.test.ts
  ```

  Expected: FAIL because the tool-definition module does not exist.

- [ ] **Step 3: Remove planning contracts and route behavior**

  Delete:
  - `ChatPlan`, `ChatPlanStep`, `SchemaDriftReport`, `RegeneratedStep`, and
    `RegeneratePlanResponse`;
  - `ChatResponse.plan`;
  - `ChatRetryContext.priorPlanRootMessage`;
  - plan constants and `_parseProposePlan`;
  - the `MULTI-STEP PLANS` prompt block;
  - the `proposePlan` tool schema, parsing, terminal-tool branch, fallback
    text, and response property;
  - `/:workspaceId/regenerate-plan` and its API type.

  Move the existing `generateSql` and `clarify` JSON schemas into
  `buildDataExplorerToolDefinitions` and use that function as the actual Data
  Explorer `requestBody.tools` value. Keep `addDashboardBlock` unchanged.
  In `buildOfflinePrompts.ts`, remove only planning language while preserving
  the instruction to generate one DuckDB query.

- [ ] **Step 4: Verify GREEN and preserved chat regressions**

  Run:

  ```bash
  pnpm vitest run \
    supabase/functions/chat/dataExplorerToolDefinitions/dataExplorerToolDefinitions.test.ts \
    supabase/functions/chat/utils/buildSqlSystemPrompt.test.ts \
    src/components/ChatPanel/ClarificationCard/clarificationAnswer.test.ts \
    src/lib/offlineChat/buildOfflinePrompts.test.ts \
    src/lib/offlineChat/runOfflineChatPipeline.test.ts
  pnpm type-check
  ```

  Expected: all tests and type-check pass.

### Task 3: Delete the Frontend Planning Feature and Sandbox

**Files:**

- Delete: `src/components/ChatPanel/PlanFlowView/`
- Delete: `src/components/ChatPanel/PlanStateManager/`
- Delete: `src/sandbox/`
- Delete: `public/sandbox-executor.html`
- Modify:
  `src/components/ChatPanel/ChatPanelProvider/ChatPanelProvider.tsx`
- Modify:
  `src/views/DataExplorerApp/DataExplorerApp.tsx`
- Modify:
  `src/views/DataExplorerApp/OpenDatasetDrawer/SavedDatasetsView.tsx`
- Modify:
  `src/views/DataExplorerApp/SaveAsNewDatasetForm/SaveAsNewDatasetForm.tsx`
- Modify:
  `src/lib/privacy/crossBoundary.tsx`
- Modify:
  `src/views/WorkspaceSettingsPage/PrivacyLogTab/PrivacyLogTab.tsx`

**Interfaces:**

- `ChatPanelProvider` wraps available chat content directly in
  `ChatPanelStateManager.Provider`.
- `SaveAsNewDatasetForm` accepts query rows, columns, date columns, raw SQL,
  and `onSaveSuccess`; it has no plan snapshot.
- `CrossBoundaryContext` retains discovery clarification, generated SQL
  assumptions, user messages, and clarification answers.

- [ ] **Step 1: Delete the planning modules and sandbox**

  Delete both plan directories, all colocated planning tests, the sandbox
  directory, and the sandbox HTML entry.

- [ ] **Step 2: Remove frontend integration points**

  Simplify `ChatPanelProvider`, remove `PlanFlowView` and plan snapshot
  creation from Data Explorer, and remove the `planSnapshot` prop and
  plan-specific explanatory UI from `SaveAsNewDatasetForm`.

- [ ] **Step 3: Remove the planning-only privacy context**

  Delete `plan_step_input` from `CrossBoundaryContext`, its request
  documentation, and the Privacy Log label. Do not change the remaining
  privacy contexts.

- [ ] **Step 4: Verify preserved frontend behavior**

  Run:

  ```bash
  pnpm vitest run \
    src/components/ChatPanel/applyChatTurnResponse/applyChatTurnResponse.test.ts \
    src/components/ChatPanel/ClarificationCard/clarificationAnswer.test.ts \
    src/lib/privacy/ackToken.test.ts \
    src/lib/privacy/ackTokenRoundtrip.test.ts \
    src/lib/privacy/generatedSqlAssumptions.test.ts \
    src/lib/privacy/piiDetector.test.ts \
    src/views/DashboardApp/DashboardEditorView/DashboardChatPendingBlocksSync.test.tsx
  pnpm type-check
  ```

  Expected: all tests and type-check pass with no imports from deleted
  modules.

### Task 4: Remove Virtual-Dataset Planning Persistence

**Files:**

- Modify:
  `shared/models/datasets/VirtualDataset/VirtualDataset.types.ts`
- Modify:
  `shared/models/datasets/VirtualDataset/VirtualDatasetParsers.ts`
- Modify:
  `src/clients/datasets/DatasetClient.ts`
- Modify:
  `supabase/schemas/20.datasets__virtual.sql`
- Modify:
  `supabase/schemas/70.rpc_datasets__add_virtual_dataset.sql`
- Generate: `supabase/migrations/<timestamp>_remove_chat_planning.sql`
- Generate: `shared/types/database.types.ts`
- Create:
  `supabase/tests/database/datasets__virtual_contract.test.sql`

**Interfaces:**

- `VirtualDatasetRead` ends with `rawSql: string`.
- `insertVirtualDataset` accepts `datasetId`, `workspaceId`, `datasetName`,
  `datasetDescription`, `columns`, and `rawSql`.
- `rpc_datasets__add_virtual_dataset` accepts exactly six parameters and
  inserts only `dataset_id`, `workspace_id`, and `raw_sql`.

- [ ] **Step 1: Write the failing pgTAP contract**

  Add a transaction-scoped pgTAP test with:

  ```sql
  select plan(2);

  select hasnt_column(
    'public',
    'datasets__virtual',
    'plan_steps',
    'datasets__virtual has no planning payload'
  );

  select has_function(
    'public',
    'rpc_datasets__add_virtual_dataset',
    array[
      'uuid',
      'uuid',
      'text',
      'text',
      'dataset_column_input[]',
      'text'
    ],
    'virtual dataset RPC keeps the six-argument contract'
  );
  ```

- [ ] **Step 2: Verify RED against the current local schema**

  Run:

  ```bash
  supabase start
  pnpm exec supabase test db \
    supabase/tests/database/datasets__virtual_contract.test.sql
  ```

  Expected: FAIL because `plan_steps` exists.

- [ ] **Step 3: Update the declarative schema and TypeScript model**

  Remove `plan_steps`, `p_plan_steps`, the `ChatPlan` imports, custom parser
  handling, and the client parameter. Restore the parser to normal deep
  camel/snake conversion for `rawSql`.

- [ ] **Step 4: Generate and inspect the migration**

  Run:

  ```bash
  supabase stop
  supabase db diff -f remove_chat_planning
  ```

  If the repository's empty `db.migrations.schema_paths` prevents the
  declarative diff, temporarily set it to `["./schemas/*.sql"]`, generate the
  diff, and restore `supabase/config.toml` immediately. Do not retain a config
  change.

  Inspect the generated migration. It must:
  - drop the seven-argument RPC overload;
  - drop `public.datasets__virtual.plan_steps`;
  - retain or recreate the six-argument `security invoker` RPC;
  - contain no unrelated schema changes.

  If the generator emits unrelated changes, stop and diagnose rather than
  hand-editing the migration.

- [ ] **Step 5: Apply locally, regenerate types, and verify GREEN**

  Run:

  ```bash
  supabase start
  supabase migration up --local
  pnpm db:gen-types
  pnpm test:db
  pnpm type-check
  ```

  Expected: pgTAP and type-check pass; generated types contain neither
  `plan_steps` nor `p_plan_steps`.

### Task 5: Delete the Two Planning IndexedDB Databases

**Files:**

- Create:
  `src/db/dexie/deleteObsoleteIndexedDBs/deleteObsoleteIndexedDBs.ts`
- Create:
  `src/db/dexie/deleteObsoleteIndexedDBs/deleteObsoleteIndexedDBs.test.ts`
- Modify: `src/db/dexie/dexieVersions.ts`

**Interfaces:**

- Produces:
  `deleteObsoleteIndexedDBs(): Promise<void>`.
- Dexie schema `v6` has the same application models and indexes as `v5`.
- The `v6` upgrader deletes `AvandarPlanStepDB` and
  `AvandarPlanAnnotationDB` without copying data.

- [ ] **Step 1: Write the failing deletion test**

  Mock `Dexie.delete`, call `deleteObsoleteIndexedDBs`, and assert:

  ```ts
  expect(deleteDatabase).toHaveBeenCalledTimes(2);
  expect(deleteDatabase).toHaveBeenCalledWith("AvandarPlanStepDB");
  expect(deleteDatabase).toHaveBeenCalledWith("AvandarPlanAnnotationDB");
  ```

- [ ] **Step 2: Verify RED**

  Run:

  ```bash
  pnpm vitest run \
    src/db/dexie/deleteObsoleteIndexedDBs/deleteObsoleteIndexedDBs.test.ts
  ```

  Expected: FAIL because the cleanup module does not exist.

- [ ] **Step 3: Implement minimal destructive cleanup and register v6**

  Implement:

  ```ts
  const OBSOLETE_INDEXED_DB_NAMES = [
    "AvandarPlanStepDB",
    "AvandarPlanAnnotationDB",
  ] as const;

  /** Deletes obsolete IndexedDB databases that contain retired feature data. */
  export async function deleteObsoleteIndexedDBs(): Promise<void> {
    await Promise.all(
      OBSOLETE_INDEXED_DB_NAMES.map(async (databaseName) => {
        await Dexie.delete(databaseName);
      }),
    );
  }
  ```

  Add `v6` to `Schemas`, duplicate the `v5` model/index declaration, call the
  cleanup in the `v6` upgrader, and set
  `CURRENT_AVA_DEXIE_VERSION = "v6"`.

- [ ] **Step 4: Verify GREEN**

  Run:

  ```bash
  pnpm vitest run \
    src/db/dexie/deleteObsoleteIndexedDBs/deleteObsoleteIndexedDBs.test.ts
  pnpm type-check
  ```

  Expected: the deletion test and type-check pass.

### Task 6: Remove Planning Dependencies and Translation Messages

**Files:**

- Modify: `package.json`
- Generate: `pnpm-lock.yaml`
- Modify source catalogs: `src/i18n/locales/*/messages.po`
- Never edit: `src/i18n/locales/*/messages.ts`

**Interfaces:**

- Remove `@xyflow/react`, `@react-pdf/renderer`, and `pyodide`.
- Keep `html-to-image`, `jspdf`, and `roughjs`.

- [ ] **Step 1: Remove only planning-exclusive packages**

  Run:

  ```bash
  pnpm remove @xyflow/react @react-pdf/renderer pyodide
  ```

- [ ] **Step 2: Clean obsolete Lingui messages**

  Run:

  ```bash
  pnpm i18n:extract-clean
  ```

  Inspect the catalog diff and verify it removes planning UI messages without
  deleting unrelated translations.

- [ ] **Step 3: Verify package and catalog integrity**

  Run:

  ```bash
  pnpm install --frozen-lockfile
  pnpm i18n:check
  ```

  Expected: install and catalog check pass. Confirm the three removed packages
  are absent while shared dashboard export packages remain.

### Task 7: Remove Planning Specifications and Mixed-Document Sections

**Files:**

- Delete: `docs/deslop/033-chat-plan-propose.md`
- Delete: `docs/deslop/034-chat-plan-canvas.md`
- Delete: `docs/deslop/035-chat-plan-step-materialization.md`
- Delete: `docs/deslop/036-chat-plan-virtual-dataset-persistence.md`
- Delete: `docs/deslop/037-chat-plan-schema-drift-regen.md`
- Delete: `docs/deslop/038-chat-plan-branching.md`
- Delete: `docs/deslop/039-chat-plan-python-sandbox.md`
- Delete: `docs/deslop/040-chat-plan-approval-gate.md`
- Delete: `docs/deslop/041-chat-plan-annotations.md`
- Delete: `docs/deslop/042-chat-plan-png-pdf-export.md`
- Delete: `docs/deslop/043-chat-multi-language-plans.md`
- Modify:
  `docs/superpowers/specs/2026-05-19-chat-interactive-workflows-design.md`
- Modify: `docs/ict4d-demo/CHECKPOINTS.md`
- Modify: `docs/ict4d-demo/FEATURE_CHECKLIST.md`
- Modify: `docs/deslop/ALL_FEATURES.md`
- Modify: `docs/deslop/GROUP-3-ai-chat-panel.md`
- Modify: `docs/deslop/STATE.md`
- Modify other mixed documents only when the final planning-reference scan
  identifies a concrete planning section.

**Interfaces:**

- Mixed documentation continues to describe privacy phases, clarification,
  dashboard chat, offline chat, and SQL generation.
- Rows 33 through 43 are removed from the de-slopping inventory rather than
  marked deferred.

- [ ] **Step 1: Delete planning-only specifications**

  Remove all eleven dedicated planning documents.

- [ ] **Step 2: Surgically edit mixed documents**

  Delete planning phases, checkpoints, feature rows, dependencies, file maps,
  manual test cases, and package instructions. Update counts and headings so
  the remaining documents are internally consistent.

- [ ] **Step 3: Scan documentation**

  Run:

  ```bash
  rg -n -i \
    'proposePlan|PlanStateManager|PlanFlowView|plan_steps|plan step|multi-step plan|schema-drift regen|sandbox-executor' \
    docs \
    --glob '!superpowers/plans/2026-07-27-remove-chat-planning.md' \
    --glob '!superpowers/specs/2026-07-27-remove-chat-planning-design.md'
  ```

  Expected: no live feature specification remains. Generic project-management
  uses of the word “planning” and unrelated billing “plan” references are
  allowed.

### Task 8: Final Verification and Decision Log

**Files:**

- Create:
  `.difit/feat/remove-planning_explanations.md`

**Interfaces:**

- Decision log uses the required
  `path:Lx-Ly` followed by `{CHANGE_TYPE}: explanation` format.

- [ ] **Step 1: Run production-code residue scans**

  Run:

  ```bash
  rg -n \
    'ChatPlan|ChatPlanStep|PlanStateManager|PlanFlowView|proposePlan|regenerate-plan|priorPlanRootMessage|planSteps|plan_steps|p_plan_steps|plan_step_input|AvandarPlanStepDB|AvandarPlanAnnotationDB' \
    src shared supabase package.json \
    --glob '!migrations/*.sql' \
    --glob '!tests/database/datasets__virtual_contract.test.sql'
  ```

  Expected: only the two obsolete IndexedDB names remain in the one-time
  cleanup module/test. Historical migration files may retain old schema
  history. No production planning feature or API symbols remain.

- [ ] **Step 2: Run focused regression suites**

  Run:

  ```bash
  pnpm vitest run \
    src/components/ChatPanel \
    src/lib/privacy \
    src/lib/offlineChat \
    src/views/DashboardApp/DashboardEditorView/DashboardChatPendingBlocksSync.test.tsx \
    supabase/functions/chat
  ```

  Expected: all focused tests pass.

- [ ] **Step 3: Run static and build verification**

  Run:

  ```bash
  pnpm format
  pnpm lint
  pnpm type-check
  pnpm build
  pnpm i18n:check
  git diff --check
  ```

  Expected: every command passes.

- [ ] **Step 4: Run React diagnostics**

  Run the repository's React Doctor skill/command against the changed React
  code and fix only findings caused by this removal.

- [ ] **Step 5: Run targeted E2E tests one by one**

  Preserve the two clarification tests in
  `tests/e2e/chat-interactive-workflows.spec.ts` and delete the planning test.
  Run each remaining test separately:

  ```bash
  pnpm test:e2e tests/e2e/chat-interactive-workflows.spec.ts \
    --grep "fixed-options clarification appears inline"
  pnpm test:e2e tests/e2e/chat-interactive-workflows.spec.ts \
    --grep "fixed-options clarification accepts a custom"
  ```

  Expected: both tests pass. Use Playwright MCP for localhost browser
  interaction if diagnosis is needed.

- [ ] **Step 6: Write the decision log and review the final diff**

  Record the high-level API, data, UI, dependency, test, and documentation
  changes in `.difit/feat/remove-planning_explanations.md`. Then run:

  ```bash
  git status --short
  git diff --stat
  git diff --check
  ```

  Confirm there are no unrelated changes and leave the branch dirty for user
  review.
