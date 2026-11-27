# Plugins 1d Leftovers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the open follow-ups from slice 1d: data slot binding hardening, typed permission errors for case types, dataset-ready toasts that name the dataset, readable struct cells, untranslated host error text kept apart from translated sentences, dead exports, stale doc paths, the maplibre test failure, and an audit of the LLM translations.

**Architecture:** One branch, `fix/plugins-leftovers`, cut from `origin/demo/measles` at `4b443e1ed`. Task 1 is the only schema change and the only high-risk task: composite foreign keys replace the workspace check trigger on `plugin_data_slot_bindings`, UPDATE grants narrow to the columns the app writes, and four indexes are added. The other tasks are small, independent frontend or docs changes.

**Tech Stack:** Postgres 15 (Supabase declarative schema, pgTAP), TypeScript, React, Mantine, Lingui, Vitest.

**Background reading:** the retired plugins 1d handoff ("Still open" lists the items this plan closes), `docs/rules/sql.md`, `docs/rules/testing.md`, `docs/rules/i18n.md`.

**Merge target:** `demo/measles`, only with Pablo's explicit approval. A push to `demo/**` deploys. Do not push. The branch has no upstream on purpose.

**Out of scope:** the features the 1d spec deferred (AI slot prefill, `querySlot` from AI tool handlers, the extra wizard steps, keep-or-delete at uninstall, and so on). They get their own specs.

---

## File map

| Task | Files |
| --- | --- |
| 1. Binding hardening | `supabase/schemas/10.concepts.sql`, `10.plugin_installations.sql`, `11.plugin_data_slot_bindings.sql`, `11.plugin_content_imports.sql`, a new migration, `apps/desktop/migrations/*.gen.sql` (generated), `shared/types/database.types.ts` (generated), `supabase/tests/database/permissions/rls_plugin_data_slot_bindings.test.sql`, `rpc_plugin_data_slot_bindings__save.test.sql`, `rpc_plugin_installations__install.test.sql` |
| 2. Case type `PermissionDenied` | Create `src/clients/qetl/QueryMediator/conceptRelation/ConceptRelationDenied.ts`. Modify `getConceptRelationPlansFromSql.ts` (+ test), `src/lib/plugins/dataSlots/makeDataSlotApiForInvocation/makeDataSlotApiForInvocation.ts` (+ test), `docs/plugin-authoring.md` |
| 3. Toast names the dataset | `src/clients/datasets/LocalDatasetClient/LocalDatasetClient.ts`, `runBackgroundParquetTranscoding.ts` (+ test), `.../pluginContent/importPluginContentItem/importPluginContentItem.ts` (+ test) |
| 4. Struct cells | `src/lib/ui/viz/makeDataGridColumnDefs/makeDataGridColumnDefs.ts` (+ test) |
| 5. Host error text | Create `src/components/common/UntranslatedDetail/UntranslatedDetail.tsx` (+ test). Modify `.../DataSlotBinding/DataSlotCheckPreview/DataSlotCheckPreview.tsx`, `.../pluginContent/PluginContentImportStatusText.tsx` |
| 6. Dead exports, doc paths | `packages/shared/plugin-manifest/src/PluginManifest/PluginDataSlotSchema.ts`, `src/lib/pluginDataSlots/isDataTypeAcceptedBySlotAttribute/isDataTypeAcceptedBySlotAttribute.ts`, four docs |
| 7. Maplibre test | `src/routes/_auth/$workspaceSlug/dashboards/edit/-$dashboardId.test.tsx` |
| 8. Translations | `src/i18n/locales/*/messages.po` and `messages.ts` |
| 9. Verify and hand off | the retired plugins 1d handoff |

---

### Task 0: Switch the local stack

Task 1 changes `supabase/schemas/`, so this branch needs its own stack before any edit there.

- [ ] **Step 1:** `ava supabase status`. If `ava` is missing, `pnpm build:ava-cli`. Expect the first line to say this is the develop/shared stack.
- [ ] **Step 2:** `ava supabase switch`. The project id is `fix-plugins-leftovers`.
- [ ] **Step 3:** `pnpm fns:update-env`.
- [ ] **Step 4:** `ava supabase status` again. Confirm the first line names `fix-plugins-leftovers`. Do not continue until it does.
- [ ] **Step 5:** `docker ps -q | wc -l`. If more than about 40 containers run, tell the controller: too many stacks make DB tests and E2E time out.

---

### Task 1: Harden `plugin_data_slot_bindings` (HIGH-RISK: migration, security)

Closes handoff follow-ups 1, 2 and 3.

**Why:** The workspace check is a SECURITY DEFINER BEFORE trigger. It runs before RLS `with check`, so a non-member's insert reaches the trigger and the error tells them whether a guessed install, case type, or dataset id is in the target workspace. Composite foreign keys are checked after RLS (at the end of the statement), so RLS refuses a non-member first. They also replace about 70 lines of trigger with declarative constraints. The table also grants table-wide UPDATE, and has no indexes for the FK columns.

**Design:**

- `concepts`: add `constraint concepts__id_workspace_id_key unique (id, workspace_id)`.
- `plugin_installations`: add `constraint plugin_installations__id_workspace_id_key unique (id, workspace_id)`.
- `plugin_data_slot_bindings`:
  - `installation_id`: drop the inline `references`. Add `constraint plugin_data_slot_bindings__installation_in_workspace_fkey foreign key (installation_id, workspace_id) references public.plugin_installations (id, workspace_id) on update cascade on delete cascade`.
  - `concept_id`: drop the inline `references`. Add `constraint plugin_data_slot_bindings__concept_in_workspace_fkey foreign key (concept_id, workspace_id) references public.concepts (id, workspace_id) on update cascade on delete set null (concept_id)`. The column list (Postgres 15+) keeps `workspace_id`, which is not null, out of the set-null.
  - `dataset_id`: the same shape, `plugin_data_slot_bindings__dataset_in_workspace_fkey` to `public.datasets (id, workspace_id)` with `on delete set null (dataset_id)`. `datasets__id_workspace_id_key` already exists.
  - A null `concept_id` or `dataset_id` skips its composite key (MATCH SIMPLE), which is what a deleted source needs.
  - Drop `plugin_data_slot_bindings__check_workspace` and its trigger.
  - Grants: `select, insert, delete` stay table-wide for `authenticated`. UPDATE becomes column-level: `grant update (source_type, concept_id, dataset_id, attribute_map, bound_by) on table public.plugin_data_slot_bindings to authenticated`. `bound_by` is included because `rpc_plugin_data_slot_bindings__save` sets it in its upsert (the stamp trigger then overwrites it). `service_role` keeps table-wide privileges. Moving a binding by updating `workspace_id` or `installation_id` is then refused with `42501`.
  - Indexes: `idx_plugin_data_slot_bindings__workspace_id`, `idx_plugin_data_slot_bindings__concept_id`, `idx_plugin_data_slot_bindings__dataset_id`. Because the composite keys lead with `concept_id` / `dataset_id`, single-column indexes on those serve the FK cascades. The `(installation_id, slot_id)` unique index already covers `installation_id`.
- `plugin_content_imports`: add `idx_plugin_content_imports__dataset_id on (dataset_id)`. The table's composite key to `datasets` cascades on delete and has no index on its leading column.
- Update the comments in `11.plugin_data_slot_bindings.sql`: the table docblock (workspace sentence), the `workspace_id` column comment (it named the dropped trigger), and the `check_source` docblock is unchanged. Remove the comment above the dropped trigger.

**Files:**
- Modify: `supabase/schemas/10.concepts.sql`, `supabase/schemas/10.plugin_installations.sql`, `supabase/schemas/11.plugin_data_slot_bindings.sql`, `supabase/schemas/11.plugin_content_imports.sql`
- Modify: `supabase/tests/database/permissions/rls_plugin_data_slot_bindings.test.sql`, `supabase/tests/database/rpc_plugin_data_slot_bindings__save.test.sql`, `supabase/tests/database/rpc_plugin_installations__install.test.sql`
- Generated: `supabase/migrations/<timestamp>_harden_plugin_data_slot_bindings.sql`, `apps/desktop/migrations/<timestamp>_harden_plugin_data_slot_bindings.gen.sql`, `shared/types/database.types.ts`

- [ ] **Step 1: Update the pgTAP expectations first (red).**

  In the three test files, every case that expects a cross-workspace refusal from the trigger now expects a foreign key violation, `23503`, instead of `23514`. These are:
  - `rls_plugin_data_slot_bindings.test.sql` cases 12 (other workspace's case type), 13 (dataset), and 14 (install). Read case 14's body before changing it.
  - `rpc_plugin_data_slot_bindings__save.test.sql` case 5.
  - `rpc_plugin_installations__install.test.sql`: the cases asserting `23514` for another workspace's case type or dataset. Read each `throws_ok` around lines 86-130 and 203-240. Only the cross-workspace ones change. The "names no case type" / "names no dataset" cases still expect `23514` from `check_source`.

  Case 11 (a settings admin of both workspaces moves a binding by updating `workspace_id`) now expects `42501` (no UPDATE privilege on that column). Update its comment: "Column grants alone stop it."

  Add these cases at the end of `rls_plugin_data_slot_bindings.test.sql`, and raise the `plan(N)` count by 4. Use the fixture ids the file already defines (read the setup block). `d1500004-…` is the settings admin of both workspaces, and `d150b001-…` is a binding in workspace `d1501001-…`:

  ```sql
  -- 35. A non-member's insert is refused by RLS before any key is looked up,
  -- so it cannot learn whether a guessed case type id exists.
  select throws_ok (
    $t35$
    set local role authenticated;
    select set_config('request.jwt.claims', '{"sub":"<an outsider user id from the fixtures>","role":"authenticated"}', true);
    insert into public.plugin_data_slot_bindings (workspace_id, installation_id, slot_id, source_type, concept_id)
    values ('d1501001-0000-4000-8000-000000000001'::uuid, 'd150a001-0000-4000-8000-000000000001'::uuid, 'probe', 'concept', gen_random_uuid());
    $t35$,
    '42501',
    null,
    'a non-member cannot probe for case type ids'
  );

  -- 36. Moving a binding to another install is refused by the column grants.
  select throws_ok (
    $t36$
    set local role authenticated;
    select set_config('request.jwt.claims', '{"sub":"d1500004-0000-4000-8000-000000000004","role":"authenticated"}', true);
    update public.plugin_data_slot_bindings
    set installation_id = gen_random_uuid()
    where id = 'd150b001-0000-4000-8000-000000000001'::uuid;
    $t36$,
    '42501',
    null,
    'a settings admin cannot move a binding to another install'
  );

  -- 37. The indexes that serve the foreign key cascades exist.
  select has_index ('public', 'plugin_data_slot_bindings', 'idx_plugin_data_slot_bindings__concept_id', 'concept_id is indexed');
  select has_index ('public', 'plugin_data_slot_bindings', 'idx_plugin_data_slot_bindings__dataset_id', 'dataset_id is indexed');
  ```

  Pick the outsider user from the file's fixtures (a user with no membership in `d1501001-…`). If none exists, add one to the setup block the same way the others are created. Also add `select has_index ('public', 'plugin_content_imports', 'idx_plugin_content_imports__dataset_id', 'dataset_id is indexed');` to whichever plugin content test file exists, or to this file if none does (and count it).

  Keep `reset role` followed by clearing `request.jwt.claims` in any new fixture block (handoff Environment note).

- [ ] **Step 2: Run the three files and confirm the new expectations fail.**

  `pnpm test:db` runs everything. To run one file: `supabase test db supabase/tests/database/permissions/rls_plugin_data_slot_bindings.test.sql` (repeat for the other two). Expected: the cases above fail (wrong SQLSTATE, or the indexes are missing).

- [ ] **Step 3: Edit the declarative schema** as described under **Design**. Follow `docs/rules/sql.md` and the `supabase-declarative-schema` skill. The `plugin_data_slot_bindings` table definition becomes:

  ```sql
  create table public.plugin_data_slot_bindings (
    -- Primary key
    id uuid primary key default gen_random_uuid(),
    -- Workspace of the binding. Always the install's workspace, and the
    -- workspace of the case type or dataset it reads: the composite foreign
    -- keys below enforce both.
    workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
    -- The plugin install this binding belongs to.
    installation_id uuid not null,
    -- The manifest's data slot id, e.g. `cases`.
    slot_id text not null constraint plugin_data_slot_bindings__slot_id_format check (slot_id ~ '^[a-zA-Z][a-zA-Z0-9]*$'),
    -- Whether the slot reads a case type or a dataset.
    source_type public.plugin_data_slot_bindings__source_type not null,
    -- The case type the slot reads. Null unless `source_type` is `concept`,
    -- and null again once that case type is deleted.
    concept_id uuid,
    -- The dataset the slot reads. Null unless `source_type` is `dataset`, and
    -- null again once that dataset is deleted.
    dataset_id uuid,
    -- (attribute_map, bound_by, created_at, updated_at: unchanged)
    -- (plugin_data_slot_bindings__source_matches_type: unchanged)
    -- Keeps the install in the binding's workspace, and deletes the binding
    -- with the install.
    constraint plugin_data_slot_bindings__installation_in_workspace_fkey foreign key (installation_id, workspace_id) references public.plugin_installations (id, workspace_id) on update cascade on delete cascade,
    -- Keeps the case type in the binding's workspace. Deleting it clears
    -- only `concept_id`, which the client reads as a broken binding.
    constraint plugin_data_slot_bindings__concept_in_workspace_fkey foreign key (concept_id, workspace_id) references public.concepts (id, workspace_id) on update cascade on delete set null (concept_id),
    -- Keeps the dataset in the binding's workspace. Deleting it clears only
    -- `dataset_id`.
    constraint plugin_data_slot_bindings__dataset_in_workspace_fkey foreign key (dataset_id, workspace_id) references public.datasets (id, workspace_id) on update cascade on delete set null (dataset_id),
    -- (plugin_data_slot_bindings__installation_slot_unique: unchanged)
  );
  ```

  Grants:

  ```sql
  -- Data API privileges. `anon` is intentionally omitted. `authenticated`
  -- may update only what a rebind changes, so a binding can never move to
  -- another workspace or install. `bound_by` is listed because the save rpc
  -- writes it, though the stamp trigger always overwrites it.
  grant
  select
  ,
    insert,
    delete on table public.plugin_data_slot_bindings to authenticated;

  grant
  update (
    source_type,
    concept_id,
    dataset_id,
    attribute_map,
    bound_by
  ) on table public.plugin_data_slot_bindings to authenticated;

  grant
  select
  ,
    insert,
  update,
  delete on table public.plugin_data_slot_bindings to service_role;

  create index idx_plugin_data_slot_bindings__workspace_id on public.plugin_data_slot_bindings (workspace_id);

  create index idx_plugin_data_slot_bindings__concept_id on public.plugin_data_slot_bindings (concept_id);

  create index idx_plugin_data_slot_bindings__dataset_id on public.plugin_data_slot_bindings (dataset_id);
  ```

  Check whether `scripts/db/reconcile-privileges/` (run by `pnpm test:db`) needs to know about column-level grants. Read it. If it would revoke the column grant, follow its documented way to declare it.

- [ ] **Step 4: Reset, then generate the migration.** Confirm `ava supabase status` names `fix-plugins-leftovers` first.

  ```bash
  pnpm db:reset
  pnpm db:new-migration harden_plugin_data_slot_bindings
  ```

  Read the generated migration in full. It must contain only: the two new unique constraints, the dropped inline FKs and the three new composite FKs, the dropped trigger and function, the grant changes, and the four indexes. If it drops anything else, it is the shared-stack diff bug from `CLAUDE.md`: reset and regenerate. Confirm the set-null FKs kept their `(concept_id)` / `(dataset_id)` column list. If the diff tool dropped it, edit the migration by hand to match the schema and note it in the commit body.

- [ ] **Step 5:** `pnpm db:reset`, then `pnpm db:gen-types`, then `pnpm desktop:sqlite:gen-migrations` and `pnpm desktop:sqlite:check-migrations`. Expected: the check exits 0. Commit nothing generated that changes unrelated files without reading why.

- [ ] **Step 6: Run the DB tests (green).** `pnpm test:db`. Expected: exit 0. All of the plugin suites pass, including the cases about deleting a source (`on delete set null` still keeps the binding) and the bound-by cases (31 to 34).

- [ ] **Step 7:** `pnpm db:validate-migrations` (or `node apps/ava-cli/dist/main.cjs supabase migrations validate`). Expected: exit 0.

- [ ] **Step 8: Commit.**

  ```bash
  git add supabase/schemas supabase/migrations supabase/tests apps/desktop/migrations shared/types/database.types.ts
  git commit -m "fix(plugins): keep data slot bindings in their workspace with composite keys

  Composite foreign keys replace the workspace check trigger, so RLS refuses
  a non-member before any id is looked up. UPDATE is granted only on the
  columns a rebind changes, and the foreign key columns are indexed.

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

  Never stage `supabase/config.toml` or `.env.development`.

---

### Task 2: Report an unreadable case type as `PermissionDenied`

Closes handoff follow-up 4 (the first half. The `case_records__can_view_record` half stays as the owner chose).

**Files:**
- Create: `src/clients/qetl/QueryMediator/conceptRelation/ConceptRelationDenied.ts`
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql.ts` (`_assertConceptsAllowed`, `_assertContributorsAllowed`)
- Test: `.../getConceptRelationPlansFromSql/getConceptRelationPlansFromSql.test.ts`
- Modify: `src/lib/plugins/dataSlots/makeDataSlotApiForInvocation/makeDataSlotApiForInvocation.ts` (`_getPluginErrorFromFailure`)
- Test: `.../makeDataSlotApiForInvocation/makeDataSlotApiForInvocation.test.ts`
- Modify: `docs/plugin-authoring.md:899-901`

- [ ] **Step 1: Write failing tests.** In `getConceptRelationPlansFromSql.test.ts`, next to the two tests at lines ~254 and ~277, add the class check. Keep the existing message assertions:

  ```ts
  ).rejects.toBeInstanceOf(ConceptRelationDenied);
  ```

  (one for the concept-not-allowed case, one for the contributor case, each with the same setup as its neighbour).

  In `makeDataSlotApiForInvocation.test.ts`, next to "rejects a query outside the workspace's relations with PermissionDenied":

  ```ts
  it("rejects a case type whose records the user cannot reach with PermissionDenied", async () => {
    runQueryMock.mockRejectedValue(
      new ConceptRelationDenied({
        conceptId: "concept_1" as Concept.Id,
        deniedDatasetIds: ["dataset_other" as Dataset.Id],
      }),
    );

    const error = await _getQuerySlotError("cases");

    expect(error.code).toBe("PermissionDenied");
  });
  ```

- [ ] **Step 2:** `pnpm vitest run src/clients/qetl/QueryMediator/conceptRelation src/lib/plugins/dataSlots/makeDataSlotApiForInvocation`. Expected: FAIL (the module does not exist).

- [ ] **Step 3: Create the error class**, modelled on `src/clients/qetl/assertWorkspaceRelations/WorkspaceRelationsDenied.ts`:

  ```ts
  import type { Dataset } from "$/models/datasets/Dataset/Dataset";
  import type { Concept } from "$/models/ontology/Concept/Concept";

  /**
   * Thrown when a query names a concept the caller may not read: one outside
   * the caller's allowed concepts, or one whose records come from a dataset
   * the caller cannot load. The plugin data slot runtime reports it as
   * `PermissionDenied`.
   *
   * Like `WorkspaceRelationsDenied`, this is a per-relation denial, not a
   * refusal of the principal.
   */
  export class ConceptRelationDenied extends Error {
    /** The concept the query named. */
    readonly conceptId: Concept.Id;

    /**
     * The contributing datasets the caller cannot load, sorted. Empty when the
     * concept itself is not allowed.
     */
    readonly deniedDatasetIds: readonly Dataset.Id[];

    constructor(
      options: Readonly<{
        conceptId: Concept.Id;
        deniedDatasetIds?: readonly Dataset.Id[];
      }>,
    ) {
      const sortedIds = [...(options.deniedDatasetIds ?? [])].sort();
      super(
        sortedIds.length === 0
          ? `Concept '${options.conceptId}' does not belong to this ` +
              `workspace, so it cannot be queried here.`
          : `Concept '${options.conceptId}' reads dataset(s) ` +
              `${sortedIds.join(", ")} that are not reachable from this ` +
              `workspace, so it cannot be queried here.`,
      );
      this.name = "ConceptRelationDenied";
      this.conceptId = options.conceptId;
      this.deniedDatasetIds = sortedIds;
    }
  }
  ```

  The messages keep the existing wording so other callers and tests that match on text still pass. Check `ConceptRelationRef.id`'s type. If it is not `Concept.Id`, cast at the throw site the same way the surrounding code does.

- [ ] **Step 4:** In `getConceptRelationPlansFromSql.ts`, replace the two `throw new Error(...)` calls:

  ```ts
  if (deniedRef) {
    throw new ConceptRelationDenied({ conceptId: deniedRef.id });
  }
  ```

  ```ts
  if (deniedIds.length > 0) {
    throw new ConceptRelationDenied({
      conceptId: options.ref.id,
      deniedDatasetIds: deniedIds,
    });
  }
  ```

  In `makeDataSlotApiForInvocation.ts`, `_getPluginErrorFromFailure`:

  ```ts
  if (
    error instanceof WorkspaceRelationsDenied ||
    error instanceof ConceptRelationDenied
  ) {
    return new PluginError("PermissionDenied", PERMISSION_DENIED_MESSAGE);
  }
  ```

  Update its docblock: "A denied relation or case type is a permission failure."

  Check that the error reaches `_getPluginErrorFromFailure` unwrapped: trace from `runDataSlotQuery` through the query mediator. If any layer wraps errors (`new Error(..., { cause })`), also check `error.cause` there, and add a test that throws it wrapped the way the real path does.

- [ ] **Step 5:** Rerun the Step 2 command. Expected: PASS.

- [ ] **Step 6: Docs.** In `docs/plugin-authoring.md`, the `PermissionDenied` row becomes "The current user cannot read the bound dataset or case type, including a case type whose records come from a dataset they cannot reach, or …(rest unchanged)". In the `CommandFailed` row, remove the sentence starting "That includes a case type the user can read…".

- [ ] **Step 7: Commit.** `fix(plugins): report an unreadable case type as PermissionDenied`

---

### Task 3: Name the dataset in the dataset-ready toasts

Closes handoff follow-up 6.

**Approach:** Add an optional `displayName` to the CSV import params. `runBackgroundParquetTranscoding` uses `displayName ?? file.name` in its three toasts (ready, column types updated, failed). Plugin content imports pass the dataset name. Other callers do not change, so their toasts are unchanged.

**Files:**
- Modify: `src/clients/datasets/LocalDatasetClient/LocalDatasetClient.ts` (`LocalImportParams` at ~127, `_makeStartCsvImport` at ~275)
- Modify: `src/clients/datasets/LocalDatasetClient/runBackgroundParquetTranscoding.ts`
- Test: `src/clients/datasets/LocalDatasetClient/runBackgroundParquetTranscoding.test.ts`
- Modify: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/importPluginContentItem/importPluginContentItem.ts`
- Test: `.../importPluginContentItem/importPluginContentItem.test.ts`

- [ ] **Step 1: Failing test, content import.** In `importPluginContentItem.test.ts`, add:

  ```ts
  it("names the import after the dataset, not the bundled file", async () => {
    mocks.startCsvImport.mockResolvedValue(SNIFF);

    await importPluginContentItem({ ...OPTIONS, datasetName: "Mozambique provinces" });

    expect(mocks.startCsvImport).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: "Mozambique provinces" }),
    );
  });
  ```

  Use the file's existing options constant (read the file: it may be named differently from `OPTIONS`), and whatever setup the neighbouring success test uses so the import completes.

- [ ] **Step 2: Failing test, toast.** In `runBackgroundParquetTranscoding.test.ts`, add a `describe("runBackgroundParquetTranscoding toasts")`. Mock `DuckDbClient.loadCsv` to resolve a minimal result (`{ parquetData: new Blob(), columns: [] }`, matching `DuckDbLoadCsvResult`), mock the notification helpers the module imports (`notifySuccess`, `notifyWarning`, `notifyError`), and mock `ImportJobsManager`. The file already uses a real Dexie (`fake-indexeddb`) in one test: reuse that setup and put a `LocalDataset` row first. Assert:

  ```ts
  expect(notifySuccessMock).toHaveBeenCalledWith(
    expect.objectContaining({
      message: '"Mozambique provinces" finished processing and is ready to use.',
    }),
  );
  ```

  for a call with `displayName: "Mozambique provinces"` and a file named `mz-adm1.csv`. Add a second test: without `displayName` the message names `"mz-adm1.csv"`. Use `vi.useFakeTimers()` or let the 2s `setTimeout` run out, so the job clear does not leak into later tests.

- [ ] **Step 3:** `pnpm vitest run src/clients/datasets/LocalDatasetClient/runBackgroundParquetTranscoding.test.ts src/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent`. Expected: FAIL.

- [ ] **Step 4: Implement.**

  `LocalDatasetClient.ts`:

  ```ts
  type LocalImportParams<ParseOptions> = {
    datasetId: DatasetId;
    workspaceId: Workspace.Id;
    userId: UserId;
    file: File;
    parseOptions: ParseOptions;
    /**
     * What the import's toasts call the data. Defaults to the file's name.
     * Pass it when the dataset is named before the file finishes processing.
     */
    displayName?: string;
  };
  ```

  In `_makeStartCsvImport`, pass `displayName: params.displayName` to `runBackgroundParquetTranscoding`. Also in `_makeStartXlsxImport`, for consistency, since both take `LocalImportParams`.

  `runBackgroundParquetTranscoding.ts`: add `displayName?: string` to `params` with the same doc comment, and replace `const sourceFileName = params.source.file.name;` with:

  ```ts
  const displayName = params.displayName ?? params.source.file.name;
  ```

  Rename every `sourceFileName` in the three toast messages to `displayName`. The `msg` placeholder name changes, which changes the message ids, so Task 8 extracts them.

  `importPluginContentItem.ts`: pass `displayName: options.datasetName` to `LocalDatasetClient.startCsvImport`.

- [ ] **Step 5:** Rerun Step 3. Expected: PASS. Then `pnpm vitest run src/clients/datasets` to confirm nothing else broke.

- [ ] **Step 6: Commit.** `fix(plugins): name the dataset, not the bundled file, when imported content is ready`

---

### Task 4: Show struct cells as readable text

Closes handoff follow-up 7. The check preview's `DataSlotCheckSampleTable` already formats through `makeDataGridColumnDefs`, so one change fixes both the preview and the Data Explorer grid.

**Files:**
- Modify: `src/lib/ui/viz/makeDataGridColumnDefs/makeDataGridColumnDefs.ts` (`_formatCellValue`)
- Test: `src/lib/ui/viz/makeDataGridColumnDefs/makeDataGridColumnDefs.test.ts`

- [ ] **Step 1: Failing tests.** The file's `_formatCell` helper marks the field as a date column, so add a non-date helper alongside it:

  ```ts
  function _formatPlainCell(field: string, value: unknown): string {
    const [columnDef] = makeDataGridColumnDefs({
      columnNames: [field],
      data: [{ [field]: value }],
      dateColumns: undefined,
      dateFormat: "YYYY-MM-DD",
    });
    return columnDef!.valueFormatter({ value });
  }

  describe("struct cells", () => {
    it("shows a struct as its fields, not [object Object]", () => {
      expect(_formatPlainCell("location", { lat: 1.5, lng: -2 })).toBe(
        '{"lat":1.5,"lng":-2}',
      );
    });

    it("shows a struct holding a bigint", () => {
      expect(_formatPlainCell("location", { count: 12n })).toBe(
        '{"count":"12"}',
      );
    });

    it("uses a value's own toJSON, as an Arrow struct row has", () => {
      const structRow = {
        toJSON: () => {
          return { district: "Maputo" };
        },
      };
      expect(_formatPlainCell("place", structRow)).toBe(
        '{"district":"Maputo"}',
      );
    });

    it("shows a list of structs separated by semicolons", () => {
      expect(_formatPlainCell("places", [{ id: 1 }, { id: 2 }])).toBe(
        '{"id":1}; {"id":2}',
      );
    });
  });
  ```

  Adjust the non-null assertion to the repo's lint rules if `!` is disallowed (see `docs/rules/typescript.md`). An `if (!columnDef) throw` works.

- [ ] **Step 2:** `pnpm vitest run src/lib/ui/viz/makeDataGridColumnDefs`. Expected: FAIL with `[object Object]`.

- [ ] **Step 3: Implement.** In `makeDataGridColumnDefs.ts`:

  ```ts
  /**
   * A struct cell as JSON, so its fields read as `{"lat":1.5}` rather than
   * `[object Object]`. A bigint becomes its digits. A value with its own
   * `toJSON`, such as an Arrow struct row, is read through it.
   */
  function _formatStructValue(value: object): string {
    return JSON.stringify(value, (_key, fieldValue: unknown) => {
      return typeof fieldValue === "bigint" ? String(fieldValue) : fieldValue;
    });
  }
  ```

  and in `_formatCellValue`, before the final return:

  ```ts
  if (typeof value === "object" && value !== null && !(value instanceof Date)) {
    return _formatStructValue(value);
  }
  ```

  Update `_formatCellValue`'s docblock with one sentence: "A struct shows as JSON."

- [ ] **Step 4:** Rerun Step 2. Expected: PASS, including every existing test in the file.

- [ ] **Step 5: Commit.** `fix(data-grid): show struct cells as JSON instead of [object Object]`

---

### Task 5: Keep untranslated host error text out of translated sentences

Closes handoff follow-up 12. Two places put a raw `Error.message` (English, from DuckDB, Supabase or the network) inside a translated sentence:

- `DataSlotCheckPreview.tsx:83`: ``t`Could not read these records. ${reason}` ``
- `PluginContentImportStatusText.tsx:41`: ``t`Failed: ${reason}` ``

Arbitrary host errors cannot be translated. The fix shows the translated sentence on its own, and the raw detail as a separate, labelled line marked `lang="en"`, so a translated UI never has English in mid-sentence and a screen reader pronounces the detail in English.

**Files:**
- Create: `src/components/common/UntranslatedDetail/UntranslatedDetail.tsx`
- Test: `src/components/common/UntranslatedDetail/UntranslatedDetail.test.tsx`
- Modify: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotCheckPreview/DataSlotCheckPreview.tsx`
- Modify: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/PluginContentImportStatusText.tsx`

First check that `src/components/common/` exists and is where shared small components live (`ls src/components`). If the repo puts them somewhere else, use that folder and keep the same file names.

- [ ] **Step 1: Failing test.** Read a neighbouring component test to copy the render helper the repo uses (Mantine and Lingui providers). Then:

  ```tsx
  describe("UntranslatedDetail", () => {
    it("marks the detail as English and labels it", () => {
      renderWithProviders(<UntranslatedDetail detail="HTTP 404 from storage" />);

      const detail = screen.getByText("HTTP 404 from storage");
      expect(detail).toHaveAttribute("lang", "en");
      expect(screen.getByText("Details:")).toBeInTheDocument();
    });

    it("renders nothing for an empty detail", () => {
      const { container } = renderWithProviders(<UntranslatedDetail detail="" />);

      expect(container).toBeEmptyDOMElement();
    });
  });
  ```

  If the test provider renders wrapper elements, assert `screen.queryByText("Details:")` is null instead of `toBeEmptyDOMElement`.

- [ ] **Step 2:** Run it. Expected: FAIL (module missing).

- [ ] **Step 3: Implement.**

  ```tsx
  import { Trans } from "@lingui/react/macro";
  import { Text } from "@mantine/core";

  type Props = Readonly<{
    /** Text from the host, such as an error message, that is not translated. */
    detail: string;
  }>;

  /**
   * A line of untranslated host text, such as an error message from the
   * database, kept apart from the translated sentence it explains. It is
   * marked as English, so a screen reader pronounces it correctly in any
   * language. Renders nothing for an empty detail.
   */
  export function UntranslatedDetail({ detail }: Props): JSX.Element | null {
    if (detail === "") {
      return null;
    }
    return (
      <Text size="xs" c="dimmed">
        <Trans>Details:</Trans> <span lang="en">{detail}</span>
      </Text>
    );
  }
  ```

- [ ] **Step 4:** Use it.

  `DataSlotCheckPreview.tsx`: read `Callout`'s props. If `message` accepts a `ReactNode`:

  ```tsx
  message={
    <>
      {t`Could not read these records.`}
      <UntranslatedDetail detail={reason} />
    </>
  }
  ```

  If it accepts only a string, keep ``message={t`Could not read these records.`}`` and render `<UntranslatedDetail detail={reason} />` directly below the `Callout` inside a `Stack gap="xxs"`.

  `PluginContentImportStatusText.tsx`, the `failed` branch:

  ```tsx
  .with({ kind: "failed" }, ({ reason }) => {
    return (
      <div>
        <Text size="sm" c="danger">{t`Failed`}</Text>
        <UntranslatedDetail detail={reason} />
      </div>
    );
  })
  ```

  Check the existing tests of both components (`grep -rln "Could not read these records\|Failed: " src --include='*.test.tsx'`) and update their text assertions.

- [ ] **Step 5:** Run the new test and the touched components' tests. Expected: PASS.

- [ ] **Step 6: Commit.** `fix(plugins): keep untranslated error details apart from translated sentences`

---

### Task 6: Remove dead exports and fix stale doc paths

Closes handoff follow-ups 8 and 9.

**Decision:** `DATA_SLOT_ATTRIBUTE_TYPES` stays exported. It is documented as public API in `packages/shared/plugin-manifest/README.md` (lines 28 and 45) for a published package, so removing it would be a breaking change for plugin authors. The other two are internal.

- [ ] **Step 1:** In `packages/shared/plugin-manifest/src/PluginManifest/PluginDataSlotSchema.ts`, change `export const PluginDataSlotAttributeSchema` to `const PluginDataSlotAttributeSchema`. In `src/lib/pluginDataSlots/isDataTypeAcceptedBySlotAttribute/isDataTypeAcceptedBySlotAttribute.ts`, change `export const DATA_SLOT_ACCEPTED_DATA_TYPES` to `const DATA_SLOT_ACCEPTED_DATA_TYPES`. Confirm no other file imports either: `grep -rn "PluginDataSlotAttributeSchema\|DATA_SLOT_ACCEPTED_DATA_TYPES" --include='*.ts' --include='*.tsx' . | grep -v node_modules`.
- [ ] **Step 2:** Replace the old path in the four docs:

  ```bash
  for f in docs/measles-demo/data-dictionaries-5-crosswalks-plan.md docs/measles-demo/pr-feature-log.md the retired plugins 1b handoff docs/superpowers/plans/2026-11-09-plugins-1b-part-b-derived-columns.md; do
    sed -i '' 's#src/lib/plugins/derivedColumns/assertSingleSqlExpression#src/lib/sql/assertSingleSqlExpression#g' "$f"
  done
  grep -rn "derivedColumns/assertSingleSqlExpression" docs
  ```

  Expected: the final grep prints nothing.
- [ ] **Step 3:** `cd packages/shared/plugin-manifest && pnpm vitest run && cd -`, `npx tsc -b`, and `pnpm verify:packages`. Expected: all exit 0.
- [ ] **Step 4: Commit.** `chore(plugins): drop unused exports and point docs at the moved SQL helper`

---

### Task 7: Fix the maplibre import failure in the dashboard editor route test

Closes handoff follow-up 10. `src/routes/_auth/$workspaceSlug/dashboards/edit/-$dashboardId.test.tsx` imports the route, which pulls in maplibre-gl, which calls `window.URL.createObjectURL` at module load. jsdom does not implement it. The test covers route access, not maps, so it mocks maplibre-gl the way `src/views/GisApp/MapCanvas/MapCanvasAttribution.test.ts` does.

- [ ] **Step 1:** Confirm the failure: `pnpm vitest run 'src/routes/_auth/$workspaceSlug/dashboards/edit/-$dashboardId.test.tsx'`. Expected: `TypeError: window.URL.createObjectURL is not a function`.
- [ ] **Step 2:** Add next to the other `vi.mock` calls, above `const { Route } = await import("./$dashboardId");`:

  ```ts
  // The route's editor imports maplibre-gl, which needs browser APIs jsdom
  // lacks at module load. These tests cover route access, not maps.
  vi.mock("maplibre-gl", () => {
    return { default: {} };
  });
  ```

  If the import then fails on a missing maplibre member, add that member as `vi.fn()`, as `MapCanvasAttribution.test.ts` does.
- [ ] **Step 3:** Rerun Step 1. Expected: PASS.
- [ ] **Step 4: Commit.** `test(dashboards): mock maplibre-gl in the dashboard editor route test`

---

### Task 8: Audit the 1d translations and catalog the new strings

Closes Pablo's open review of the LLM translations from `cf4b98de8`.

- [ ] **Step 1: Structural audit.** For each of `ar es fr pt sw zh-Hans zh-Hant`:

  ```bash
  git show cf4b98de8 -- src/i18n/locales/<lang>/messages.po | grep -a '^-msgid'   # expect nothing
  git show cf4b98de8 -- src/i18n/locales/<lang>/messages.po | grep -a '^[-+]msgstr' | head -200
  ```

  Every changed line must be a `msgstr`. No `msgid` is removed or changed.

- [ ] **Step 2: Placeholder audit.** For each changed entry, the `{name}` placeholders in `msgstr` must match the `msgid`'s exactly (same names, same count), and any `<0>…</0>` tags must be kept. Write a short script in the session scratchpad (not the repo) that parses each `.po`, and for every entry whose `msgstr` is non-empty compares the sets of `\{[a-zA-Z0-9_]+\}` and `<\d+>` tokens. Run it on all seven locales. Expected: no mismatches. Fix any mismatch by hand.

- [ ] **Step 3: Meaning audit.** Read the 1d strings in each locale (the entries added in `cf4b98de8`). Check for:
  - Product nouns translated inconsistently with the rest of the catalog: "case type", "dataset", "data slot", "plugin", "Settings", "Plugins".
  - A literal word-for-word translation that changes the meaning (for example "binding" rendered as a legal binding).
  - Untranslated English left in `msgstr`.

  For each locale, compare against how the existing pre-1d entries translate the same nouns (`grep -a -A1 'msgid "Case type' src/i18n/locales/<lang>/messages.po`). Fix wrong entries in place. Keep a list of what changed per locale for the commit body.

- [ ] **Step 4: Catalog the new strings from Tasks 3 and 5.** `pnpm i18n:extract`, then translate the new and changed `msgid`s (the three toasts with `{displayName}`, "Could not read these records.", "Failed", "Details:") in all seven locales by hand, following the terms from Step 3. Then `pnpm i18n:compile`. Do not leave them for the pre-push hook: this task is the audit.

- [ ] **Step 5:** `pnpm i18n:check`. Expected: exit 0.

- [ ] **Step 6: Commit.** `chore(i18n): correct the 1d translations and translate the leftover fixes' strings`, with the per-locale list of corrections in the body.

---

### Task 9: Verify everything and update the handoff

- [ ] **Step 1:** Run, one at a time, never two at once in this worktree:
  - `npx tsc -b`
  - `pnpm type-check:deno`
  - `npx eslint .`
  - `pnpm test:frontend`. Expected: the maplibre file now passes. Report any other failure with its output.
  - Plugin packages: `cd packages/shared/plugin-manifest && pnpm vitest run`, the same in `packages/web/plugin-sdk` and `packages/web/plugin-ui`.
  - `pnpm test:db`
  - `pnpm check:plugin-bundle`. The host budget is 43,000 bytes. If Task 2's import pushed it over, report the size and stop.
  - `pnpm verify:packages`
  - `pnpm desktop:sqlite:check-migrations`
- [ ] **Step 2: E2E**, one spec at a time: `pnpm test:e2e plugins-mozambique-install.spec.ts`, then `plugins-epidemiology-case-slot.spec.ts`. Check `docker ps -q | wc -l` first.
- [ ] **Step 3: Handoff.** In the retired plugins 1d handoff, move follow-ups 1 to 4 (first half), 6 to 10 and 12 from "Still open" to "Closed after the handoff was first written", each with its commit. Add one line under "Where things stand": the leftovers are on `fix/plugins-leftovers`, not merged, and they add a migration.
- [ ] **Step 4: Commit.** `docs(plugins): record the closed 1d follow-ups`
