# Local Persistence AvaModel Audit Implementation Plan

**Design:** `docs/superpowers/specs/2026-07-27-local-persistence-avamodel-audit.md`

### Task 1: Create PlanAnnotation and PlanStepBlob AvaModels

**Files:**

- Create: `src/models/chat/PlanAnnotation/PlanAnnotation.ts`
- Create: `src/models/chat/PlanAnnotation/PlanAnnotation.types.ts`
- Create: `src/models/chat/PlanAnnotation/PlanAnnotationParsers.ts`
- Create: `src/models/chat/PlanAnnotation/PlanAnnotationParsers.test.ts`
- Create: `src/models/chat/PlanStepBlob/PlanStepBlob.ts`
- Create: `src/models/chat/PlanStepBlob/PlanStepBlob.types.ts`
- Create: `src/models/chat/PlanStepBlob/PlanStepBlobParsers.ts`
- Create: `src/models/chat/PlanStepBlob/PlanStepBlobParsers.test.ts`

- [ ] Run `ava new model` once per model and adapt the generated scaffold into
      the app-local Dexie model directories.
- [ ] Write failing parser tests for every annotation variant, Blob rows, and
      all identity conversion directions.
- [ ] Implement model namespaces, `DexieCrudModelSpec` types, branded ids, Zod
      schemas, identity parser registries, and public-interface documentation.
- [ ] Run both focused parser tests, scoped ESLint, type-check, and
      `git diff --check`.
- [ ] Commit all source changes.

### Task 2: Register both models in AvaDexie v6

**Files:**

- Modify: `src/db/dexie/dexieVersions.ts`
- Modify: `src/db/dexie/dexieVersions.test.ts`

- [ ] Extend the schema test first so v6 fails until both models, primary keys,
      indexes, v5 preservation, and the empty upgrader are correct.
- [ ] Add both models to a single v6 definition and make v6 current.
- [ ] Run the schema test, scoped ESLint, type-check, and `git diff --check`.
- [ ] Commit all source changes.

### Task 3: Create and integrate PlanAnnotationClient

**Files:**

- Create: `src/clients/chat/PlanAnnotationClient.ts`
- Create: `src/clients/chat/PlanAnnotationClient.test.ts`
- Modify:
  `src/components/ChatPanel/PlanFlowView/PlanAnnotationStateManager/PlanAnnotationStateManager.tsx`
- Modify:
  `src/components/ChatPanel/PlanFlowView/PlanAnnotationStateManager/PlanAnnotationStateManager.test.ts`
- Modify:
  `src/components/ChatPanel/PlanFlowView/PlanAnnotationOverlay.tsx`
- Modify: `src/components/ChatPanel/PlanFlowView/PlanFlowView.tsx`
- Delete: `src/components/ChatPanel/PlanFlowView/PlanAnnotationStorage.ts`

- [ ] Write failing client and consumer tests for upsert, list, delete, and
      clear behavior.
- [ ] Build the hook-enabled client with the standard Dexie client factories.
- [ ] Move persisted annotation types to the model namespace and update all
      consumers.
- [ ] Delete the legacy module after proving no imports remain.
- [ ] Run focused tests, scoped ESLint, type-check, React Doctor against the
      task base, and `git diff --check`.
- [ ] Commit all source changes.

### Task 4: Create and integrate PlanStepBlobClient

**Files:**

- Create: `src/clients/chat/PlanStepBlobClient.ts`
- Create: `src/clients/chat/PlanStepBlobClient.test.ts`
- Modify:
  `src/components/ChatPanel/PlanStateManager/planExecutor.ts`
- Modify:
  `src/components/ChatPanel/PlanStateManager/rehydratePlan.ts`
- Delete:
  `src/components/ChatPanel/PlanStateManager/PlanStepStorage.ts`

- [ ] Write failing client tests for deterministic ids, timestamps, Blob
      round-trips, list, and cleanup operations.
- [ ] Build the hook-enabled client and update imperative orchestration.
- [ ] Import persisted row types through the model namespace.
- [ ] Delete the legacy module after proving no imports remain.
- [ ] Run focused tests, scoped ESLint, type-check, and `git diff --check`.
- [ ] Commit all source changes.

### Task 5: Verify the complete persistence audit

**Files:**

- Modify: `.difit/refactor-g3/ai-chat-panel_explanations.md`

- [ ] Search product code for every standalone Dexie constructor and legacy
      database or storage-module name.
- [ ] Run all new parser, schema, client, and affected plan tests.
- [ ] Run type-check, scoped ESLint, React Doctor against the pre-audit commit,
      and `git diff --check`.
- [ ] Record the confirmed conversions and explicit exclusions in the branch
      explanation log.
- [ ] Commit any tracked source changes required by verification.
- [ ] Run final independent code review.
- [ ] Refresh the difit guide, summary, test plan, and reviewed state.
- [ ] Update the two live reviewer replies so the expanded scope is clear.

