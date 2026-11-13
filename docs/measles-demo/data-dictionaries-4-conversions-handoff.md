# Data Dictionaries 4: Conversions, plan-writing handoff

This file briefs a new session that will **write the implementation plan**
for slice 4 of data dictionaries. Do not implement anything in that session:
the deliverable is the plan, plus the spec edits and owner questions it
raises. Delete this file in the plan's first commit, or fold anything still
useful into the plan.

## The ask

Write `docs/measles-demo/data-dictionaries-4-conversions-plan.md` in this
worktree (`feat/dictionary-conversions`, branched from `demo/measles` at
`6518c3aa5`). Model it on
[data-dictionaries-3-attach-plan.md](data-dictionaries-3-attach-plan.md):
the same header (Goal, Architecture, Tech Stack, Spec, Scope, Builds on),
"Before you start", house conventions, a lessons table, numbered tasks with
checkbox steps and exact file paths, a batch table, Refinements (where the
plan overrides the spec, and why), spec edits, and a table of open questions
for the owner, each with a recommended answer.

Load these skills in the plan-writing session:

- `writing-plans` for the plan's shape. The plan will be executed later with
  `subagent-driven-development`, so make each task self-contained.
- `brainstorming` only if a design question cannot be settled from the spec.
- `supabase-declarative-schema` and `supabase-postgres-best-practices`
  before writing the schema tasks.
- `impeccable` before designing the new surfaces (the Unmatched values step,
  the preview drawer, and the Save as cards). They are new surfaces, not
  restyles.

Owner preferences that shaped slices 1 to 3:

- Put every open question in one table with a recommendation. The owner has
  so far approved the recommendations as a set ("do as recommended").
- Prefer decisions settled by an executed test over decisions argued in prose
  (open decision 1 below asks for exactly that).
- Offline parity by default: anything that works online also works offline
  and on the desktop app, unless a network is strictly required.

## Where things stand

On `demo/measles` (local, not yet pushed when this was written):

| Feature | What it built | Plan |
|---|---|---|
| F129 | Dictionaries, entries, code lists, codings; the Dictionary view | [data-dictionaries-1-dictionaries-plan.md](data-dictionaries-1-dictionaries-plan.md) |
| F130 | Learning a dictionary from datasets: profiling, matching, AI suggestions | [data-dictionaries-2-inference-plan.md](data-dictionaries-2-inference-plan.md) |
| F131 | Attaching dictionaries as reference: bindings, the apply flow (Match columns, Attach), the code-list popover, the rail group, Used by, Ask Avandar context | [data-dictionaries-3-attach-plan.md](data-dictionaries-3-attach-plan.md) |
| F132 | The slice 3 follow-ups: entry descriptions in the Description column, `rpc_datasets__get_editable_ids`, and tags on grouped SQL results | none; see its section in [pr-feature-log.md](pr-feature-log.md) |

The prototype that slices 1 to 3 compared against
(`.impeccable/mocks/prototype/data-dictionaries.html`) was gitignored and no
longer exists on this machine. The spec's section 7 is the only description
of the conversion surfaces. Where the plan needs a visual, design it with
`impeccable` and say so in the plan.

## Slice 4 scope

From spec section 16, item 4:

- The `valueMapping` projection: a `CASE` over a normalized key in the view
  QETL builds at load time (spec 6.2).
- Ordered `ENUM` output for ordered lists (spec 6.4, open decision 1).
- Linked datasets: a virtual dataset over the source with live convert
  bindings, and `datasets__virtual.linked_source_dataset_id` (spec 5.3).
- Converting in place, with pinned pairs and **Re-apply** (spec 6.6).
- Unmatched values: the step, its four resolutions, and `value_overrides`
  (spec 7.5).
- The preview drawer (spec 7.5).
- Keep-original columns: `<column>_original`, and
  `dataset_columns.dictionary_binding_id` (spec 5.2).
- The virtual dataset freshness signal (spec 6.1: a virtual dataset's cached
  materialization is never invalidated today).
- The synced-data warning on **Change <dataset>** (spec 6.6 and 7.5).
- Restoring the dataset menu's "Turn codes into labels and add column
  descriptions" sub-line (spec 7.4 and 13, owner decision 6 of slice 3).
- Settling open decision 5 (re-pointing a binding whose code list is
  deleted).

Out of scope: crosswalks (slice 5), "Add from datasets into an existing
dictionary" (its own small piece), and everything in spec section 17.

## Read first

The spec, [data-dictionaries-design.md](data-dictionaries-design.md):
sections 3 (decisions), 4 (vocabulary), 5.2 and 5.3 (bindings, linked
datasets), all of 6, 7.4 and 7.5, 11 (permissions), 12 (offline), 13 (copy),
14 (edge cases), 15 (testing), 16, and 18 (open decisions).

The slice 3 plan's closing sections, which record what was deferred to this
slice and why: "Refinements", "Spec edits made with this plan", "Owner
decisions kept", and "Owner decisions on the open questions".

Repo rules: `AGENTS.md` (also `CLAUDE.md`), `docs/rules/typescript.md`,
`docs/rules/sql.md`, `docs/rules/testing.md`, `docs/rules/e2e-testing.md`,
`docs/rules/i18n.md`, `docs/design/app-view-layout.md`, the Named Rules in
`DESIGN.md`, [qetl-architecture.md](../qetl-architecture.md), and
[permissions-architecture.md](../permissions-architecture.md).

## Code to read before planning

Paths are from the repo root. Verify each before the plan names it.

Load-time projection (where conversions land):

- `src/clients/qetl/QueryMediator/QueryMediator.types.ts`: `ColumnReplacement`
  (today `originalName`, `alias`, `dataType`), which spec 6.2 extends with
  `valueMapping`.
- `src/clients/qetl/QueryMediator/relationLoading/getColumnReplacementsFromColumns/`
  and its callers, `relationLoading/RelationLoading.ts` and
  `src/clients/dashboards/DashboardClient/dashboardSnapshotHelpers/dashboardPublishSnapshots.ts`.
- `src/clients/DuckDbClient/duckDbSqlText.ts` and `duckDbParquetLoad.ts`:
  `getParquetProjectionClauses`, which renders the view.
- `src/clients/qetl/wrappers/VirtualDatasetWrapper/VirtualDatasetWrapper.ts`
  (`freshnessSignal: "none"`) and `src/clients/qetl/wrappers/createDefaultRegistry.ts`.

Bindings (slice 3):

- `supabase/schemas/00.enum.dataset_columns__binding_mode.sql`,
  `00.enum.dataset_columns__binding_direction.sql`,
  `30.dataset_columns__dictionary_bindings.sql`, and
  `50.rpc_dataset_columns__apply_dictionaries.sql`. The RPC refuses `convert`
  with `binding_mode_unsupported`. The table lacks `keeps_original`,
  `value_overrides`, and `pinned_pairs`, by design: each can be added
  without a destructive migration.
- Its pgTAP tests in `supabase/tests/database/dictionary_bindings/` and
  `supabase/tests/database/permissions/rls_dataset_columns__dictionary_bindings.test.sql`.
- `shared/models/dataDictionaries/DictionaryBinding/`, `ColumnCodes/`, and
  `DictionaryMatch/`.
- `apps/desktop/sync/syncable-tables.ts` (bindings sync to the desktop).

The apply flow and its surfaces:

- `src/views/DataManagerApp/ApplyDictionariesView/`: the reducer, the two
  steps (`MatchColumnsStep/`, `AttachStep/`), `useAttachDictionaries.ts`,
  `useApplyAccess.ts`, and the stepper. Slice 3 hid the convert controls
  rather than disabling them; this slice brings them back.
- `src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/ApplyDictionaryMenuItem.tsx`
  (the reference-only sub-line to restore).
- `src/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes/` (the rail
  group, which must show "Linked dataset" and "Converted this dataset ·
  version n") and `src/views/DataManagerApp/DataDictionaryView/DictionaryUsedByTab/`
  (status and **Re-apply**).
- `src/components/dataDictionaries/CodeListPopover/` ("The values were
  converted to these labels.").

Ask Avandar:

- `shared/agent/dataAgent/buildDataAgentSystemPrompt.ts` and
  `dataAgentTools.ts`. The current prompt is `data-agent-v5`. Shipped
  versions are frozen and SHA-pinned in tests, so a prompt change for
  converted columns is a new version (`data-agent-v6`), served by the `chat`
  edge function before the frontend asks for it.
- The offline paths that read code lists:
  `src/lib/agent/dataAgent/offline/` and the `lookup_values` tool.

## Questions the plan must answer

From spec section 18:

1. **Anonymous `ENUM` casts in a view.** Settle with an executed DuckDB-WASM
   test, with the `VARCHAR` plus sort-key fallback ready.
2. **Bindings in the relation cache key.** Confirm that every QETL entry point
   passes bindings to `getColumnReplacementsFromColumns`: the Data Explorer,
   dashboard blocks, maps, published snapshots, and the agent's `run_query`,
   online and offline. Also confirm that a binding or code-list change
   invalidates the loaded view.
3. **Re-pointing a binding whose code list is deleted** (open decision 5),
   alongside pinning, since a pinned convert binding must never be
   re-pointed.

Likely new ones to put in the owner table:

- How Ask Avandar describes a converted column: it holds labels now, so the
  code list matters less, but filters must use labels. Does that need
  `data-agent-v6`, and what do the evals check?
- Whether `dataset_columns.data_type` changes on apply (spec 6.3) and how
  removing a binding restores it.
- Linked dataset naming, where it appears in the Data Sources list, and what
  happens to it when its source is deleted.
- Offline and desktop: converting an offline-only upload in place, and syncing
  the new binding columns and `linked_source_dataset_id`.
- Delivery: whether slice 4 is one PR or splits, for example the projection
  and linked datasets first, then converting in place with Re-apply and the
  warning. Slice 3 was about 30 tasks.

## Working notes from slices 1 to 3

- **Schema work needs a switch.** Before any migration, run
  `ava supabase switch` in this worktree and confirm `ava supabase status`
  names `feat-dictionary-conversions`. Then `pnpm db:reset` right before
  `pnpm db:new-migration <name>`. Never stage `supabase/config.toml`.
- **`wt new` takes the type separately.** `wt new feat <name> <base>`. Passing
  `feat/<name>` produces `feat/feat/<name>`.
- **Run the desktop SQLite generator after a migration.**
  `pnpm desktop:sqlite:gen-migrations` regenerates every twin. Two older
  twins (`20261109134745_...` and `20261109155144_...`) churn by a comment
  count. Restore them rather than committing the drift.
- **Verify types with `tsc -b --force`.** Plain `tsc -b` can report clean from
  a stale cache.
- **Run `test:db` alone.** Run in parallel with the frontend suite, it once
  failed in `workspace_invites_rls` ("cannot accumulate empty arrays"). The
  failure did not reproduce in three later runs.
- **Mantine `Select` options in tests.** Unit tests see the dropdown mounted
  but hidden. Read options with `queryAllByRole("option", { hidden: true })`.
- **Known failure.** `test:frontend` fails on
  `src/routes/_auth/$workspaceSlug/dashboards/edit/-$dashboardId.test.tsx`
  (maplibre `createObjectURL`). It is not yours to fix.
- **The pre-push hook mutates the tree.** It adds machine translations and
  formats. Expect that on push.
- **The `demo-measles` local stack lacks the dictionary migrations.** It
  stops at `20261109225409`. Its own switch on this branch will not have
  that gap.
- **Feature log.** Slice 4 becomes F133 in
  [pr-feature-log.md](pr-feature-log.md), grouped by feature with per-area
  commit SHAs. The plan's final task should write that entry, as slice 3's
  Task 29 did.
