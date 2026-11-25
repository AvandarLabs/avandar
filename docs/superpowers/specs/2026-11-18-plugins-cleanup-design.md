# Plugins: Close Every Open Follow-up Before Feature B

**Author:** Juan Pablo Sarmiento (pablo@avandarlabs.com)
**Date:** 2026-11-18
**Status:** Design approved (each open decision was approved one at a time)
**Parent:** `docs/superpowers/specs/2026-11-06-plugin-ecosystem-design.md`
**Closes follow-ups from:** `docs/superpowers/2026-11-09-plugins-1b-handoff.md`
("Open follow-ups", items 1-7), `docs/superpowers/2026-11-10-plugins-1c-handoff.md`
("Open follow-ups from 1c", items 2-7),
`docs/superpowers/specs/2026-11-16-plugins-uninstall-content-design.md`
(its known limits), and the React Doctor warning in the epidemiology plugin.

## Context

Slices 1a to 1d and the uninstall flow left a list of open follow-ups. None of
them is a new feature. This spec closes all of them, so that feature B
(`querySlot` from AI tool handlers) starts from a clean base.

Out of scope, on purpose:

- New features: B, C (AI slot prefill), the extra wizard steps, geo value
  checks, other content kinds, and slices 1e and 1f.
- `querySlot` not checking `case_records__can_view_record`. The owner chose to
  keep that.
- Enforcing that a command does not hand the `avandar` object to an AI tool
  handler. That belongs to feature B and to the Milestone 2 sandbox.

## Decisions

| # | Item | Decision |
| --- | --- | --- |
| 1 | Uninstall's limits: a dataset the user may delete but not read is reported deleted while it stays; a stale desktop mirror row reads as a permission error | One pair of SECURITY DEFINER rpcs that tell `not_found`, `forbidden`, and `allowed`/`deleted` apart. `fullDelete` uses them |
| 2 | Desktop IPC delivers replies by channel only | Route each reply by its request id |
| 3 | The shared `avandar` stack follows develop, so measles branches must switch | Change the switch rule in this branch's `CLAUDE.md` only. Never in develop |
| 4 | Host `PluginError` messages are English inside the plugin's translated sentence | The plugin picks its own translated sentence by `PluginError.code`, and shows the host message apart as an untranslated detail |
| 5 | The derived-column wrap keeps the explorer's automatic LIMIT | Wrap the SQL without the automatic limit, and apply the same limit outside the wrap |
| 6 | Column names with `;`, `--`, or `/*` can never be `addColumns` inputs | `assertSingleSqlExpression` ignores those tokens inside quoted identifiers and string literals |
| 7 | The pi eval can offer `fitRegression` to a question running at the same time as the fit question | Fit questions run on their own, after the concurrent ones |
| 8 | Small items: React Doctor array lookup, test gaps, stale group-by, Undo name, `--questions R01`, four style items, the epicurve's derived-state effect | Fix each directly |

## 1. Dataset delete without guesswork

### Problem

`DatasetClient.fullDelete` (`src/clients/datasets/DatasetClient/createDatasetMutations.ts`)
reads the row with the user's own RLS, checks admin access through
`UserClient.canAccessResource`, deletes Storage, deletes the row, and reads it
back. Two cases cannot be answered from the client:

- A user who is a dataset admin (`util__auth_user_can_delete_resource`) but
  cannot read the row (`util__auth_user_may_select_dataset` is false). The read
  returns nothing, so Storage is skipped, and Postgres' `DELETE ... WHERE`
  applies the SELECT policy too, so zero rows are deleted with no error. The
  uninstall then counts the dataset as deleted.
- On desktop, a row deleted on the server but still in the SQLite mirror. The
  mirror read finds it, the server access check says false, and the admin is
  told they lack permission. The server cannot tell "gone" from "no access".

### Design

A new enum and two rpcs in `supabase/schemas/`:

```sql
create type public.datasets__delete_status as enum ('not_found', 'forbidden', 'allowed', 'deleted');
```

`rpc_datasets__get_delete_target(p_dataset_id uuid)` returns one row
`(status datasets__delete_status, workspace_id uuid, source_type
datasets__source_type)`:

- `not_found` when no `datasets` row has that id. `workspace_id` and
  `source_type` are null.
- `forbidden` when the row exists and
  `util__auth_user_can_delete_resource('dataset', id)` is false. Both columns
  are null, so nothing about the dataset leaks.
- `allowed` otherwise, with the row's `workspace_id` and `source_type`, which
  is what the Storage cleanup needs.

`rpc_datasets__delete(p_dataset_id uuid)` returns `datasets__delete_status`:

- `not_found`, `forbidden` as above (checked again, since access can change
  between the two calls).
- `deleted` after it deletes the row.

Both are `security definer`, `set search_path = ''`, `stable` for the first
and volatile for the second, granted to `authenticated` only (revoked from
`public`, `anon`, `service_role`). Both return `forbidden` for a null
`auth.uid()`. Telling `not_found` from `forbidden` reveals whether a random
UUID is a dataset id, which an unguessable v4 id makes harmless. The docblocks
say so.

`fullDelete` becomes:

1. `target = serverApi.rpc("rpc_datasets__get_delete_target", { p_dataset_id })`.
2. `not_found`: drop the local copy (`LocalDatasetClient`, DuckDB, and the
   mirror row through `options.client.delete`), then return normally. A
   dataset already gone is a success, which fixes the stale desktop mirror.
3. `forbidden`: throw `DatasetDeleteError({ reason: "not_allowed" })`. Touch
   nothing.
4. `allowed`: delete the parquet and the retained original with the target's
   `workspace_id` and `source_type`. This no longer depends on the user being
   able to read the row.
5. `status = serverApi.rpc("rpc_datasets__delete", ...)`. `deleted` and
   `not_found` succeed. `forbidden` (access revoked mid-delete) throws
   `DatasetDeleteError({ reason: "still_present" })`, whose message already
   says the data may be gone.
6. Delete the mirror row with `options.client.delete` (a no-op on web), then
   the local copy as today.

`_assertCanDeleteDataset` and `_assertDatasetRowGone` are removed: the rpcs
answer both questions. `serverApi.rpc` already routes through IPC on desktop.

Consumers:

- `useNotifyDatasetDeleteError`: the `not_allowed` text becomes "You don't
  have permission to delete this dataset." The "or it has already been
  deleted" half is no longer true, because an already deleted dataset now
  succeeds.
- `uninstallPluginAndDeleteDatasets`: unchanged in shape. It keeps its own
  pre-read, so a dataset the admin cannot read is still reported as
  `unread` (the uninstall modal only lists readable datasets anyway).
- The uninstall spec's three "Known limit" notes are replaced by one line
  each saying how this spec closed them.

The implementer must check what `options.client.delete` does on desktop for a
row the server no longer has (it may queue a sync delete). If that would fail
or loop, delete only the local mirror row there and say so in the commit.

### Tests

- pgTAP, `supabase/tests/database/datasets/rpc_datasets__delete.test.sql`:
  each status for each rpc; a dataset admin who cannot read the row gets
  `allowed` and the row is deleted; a non-admin gets `forbidden` and the row
  stays; a missing id gets `not_found`; `anon` cannot execute either rpc.
- Vitest, `createDatasetMutations.test.ts`: the order (target, Storage, delete,
  local cleanup); `not_found` returns normally and clears the local copy
  without touching Storage; `forbidden` touches nothing; a `forbidden` from the
  delete rpc throws `still_present`; a failed parquet delete stops before the
  delete rpc.

## 2. Desktop IPC routes replies by id

### Problem

`callIpc` (`shared/platform/ipc/client.ts`) registers a one-shot listener on
`${contract}.reply` per call, and the webview bridge
(`apps/desktop/main/ipc/desktopIpcBridgeScript/desktopIpcBridgeScript.ts`)
fires every listener on that channel for the first reply and removes them
all. With two calls in flight, one resolves, the other rejects with "IPC reply
id mismatch", and any later reply has no listener.

### Design

- `IpcBridge` gains `on(channel, callback): () => void`, a persistent
  listener that returns its own unsubscribe. The bridge script implements it
  without removing itself. `once` stays for existing callers.
- `callIpc` keeps a module-level `Map<replyChannel, Map<requestId, Waiter>>`.
  The first call on a channel subscribes once with `on`. Each reply is
  delivered to the waiter with its id and removed. A reply with no waiter is
  ignored (and logged in development). When a channel has no waiters left, it
  unsubscribes.
- `__setIpcBridgeForTests` also resets the map.

### Tests

`shared/platform/ipc/client.test.ts`: two concurrent calls on one contract
whose replies arrive out of order both resolve with their own results; a
reply for an unknown id is ignored and the pending call still resolves; an
`ok: false` reply rejects only its own call. A test for the bridge script
evaluates it in jsdom and checks that `on` delivers more than once and that
its unsubscribe works. The loopback test in `createIpcServer.test.ts` is
updated if it relies on `once`.

## 3. The switch rule on demo/measles

`demo/measles` never merges into develop. The shared `avandar` stack is
migrated from develop, so it lacks demo/measles' migrations and cannot serve
any branch based on demo/measles. In this branch's `CLAUDE.md` only, the
section "Switch only when the branch changes what the local stack is built
from" is rewritten:

- On `demo/measles` and every branch based on it, run `ava supabase switch`
  before running database tests, E2E tests, the app, or any database command,
  because the shared stack follows develop.
- Develop-based branches keep the old rule. The file says that rule lives in
  develop's `CLAUDE.md`.
- The "Check the switch BEFORE any command that rebuilds, resets, or
  reseeds" section is unchanged: it already stops a command from hitting the
  shared stack.

`docs/` notes that repeat the old advice for plugin branches (the handoffs'
Environment sections) get a one-line pointer to the new rule.

## 4. Translated plugin errors in the epidemiology plugin

`useAddColumns` (`plugins/epidemiology/src/derivedColumns/useAddColumns.ts`)
stores `error.message`. Instead it stores
`{ code: PluginErrorCode | undefined; detail: string }`. The forms translate by
code with new keys in `plugins/epidemiology/locales/en.json`:

| Code | Key | English |
| --- | --- | --- |
| `InvalidExpression` | `addColumns.error.invalidExpression` | The columns could not be built from this result. |
| `InvalidHandle`, `LoadFailed` | `addColumns.error.resultChanged` | The result changed. Run the query again, then try again. |
| `PermissionDenied` | `addColumns.error.permissionDenied` | This plugin is not allowed to change the query. |
| anything else | `addColumns.error.generic` | The columns could not be added. |

`incidence.failed` and `rollingAverage.failed` are removed, along with their
`{message}` placeholder. `AddColumnsFooter` gains an `errorDetail?: string`,
shown under the translated sentence as small dimmed text with `lang="en"`, so a
screen reader reads it as English. `docs/plugin-authoring.md` gains a short
"Show errors in the user's language" section with this pattern: translate by
`PluginError.code`, and show `error.message` only as a separate detail.

## 5. The automatic LIMIT stays outside the wrap

`runStructuredQueryWithMetadata` returns `executedSql`, which includes the
explorer's automatic limit for large datasets. The result also returns:

- `unlimitedSql`: the SQL `selectSqlToExecute` builds from the query before
  `makeExecutableQueryFromManualQuery` adds the automatic limit. Equal to
  `executedSql` when no automatic limit was added.
- `autoLimit: number | undefined`: the limit it added, when it added one.

The plugin bridge (`useDataExplorerPluginBridge`) uses `unlimitedSql` as
`baseSql` and passes `autoLimit` on. `makeDerivedColumnsSqlFromColumns` takes
an optional `rowLimit` and appends `LIMIT <n>` after `ORDER BY __ava_row`.
`applyDerivedColumnsSql` compares against `unlimitedSql`, so a fresh result
still matches. A limit the user set in the query builder is not automatic and
stays inside the wrap, since the user asked for those rows.
`docs/plugin-authoring.md` replaces its note about the automatic limit.

Tests: `makeDerivedColumnsSqlFromColumns` appends the limit after the order
and not inside the source; the executed test shows a rolling average over 200
rows with an automatic limit of 100 uses all 200 rows for the 100 it returns;
`runStructuredQueryWithMetadata` returns `unlimitedSql` and `autoLimit` only
when it added the limit.

## 6. Quote-aware single-expression check

`assertSingleSqlExpression` rejects `;`, `--`, and `/*` anywhere. It now scans
the expression once with a small lexer that skips:

- double-quoted identifiers, where `""` is an escaped quote;
- single-quoted string literals, where `''` is an escaped quote.

The forbidden tokens are rejected only outside those spans. An unterminated
quote is rejected with `InvalidExpression`. The parser and the function
deny-list run as before on the full expression. `docs/plugin-authoring.md`
drops the limit on such column names.

Tests: a quoted identifier containing each token is accepted; each token
outside quotes is still rejected; `'it''s -- fine'` is accepted; an
unterminated `"` or `'` is rejected; the existing cases still pass; and in
`makeDerivedColumnsSqlFromColumns`, an input column named `a;b--c` works.

## 7. Eval: fit questions run alone

In `scripts/ai-eval/runEval.ts`, `_runAll` splits the conversations. Those
whose first question has `fitRegression` run one at a time after the
concurrent pool has finished. The rest run concurrently as today. A test shows
no conversation runs while a fit question is running.

`selectEvalQuestions` also matches a token against
`FIT_REGRESSION_QUESTIONS`' ids, so `--questions R01` selects R01, and `R`
still selects every fit question.

## 8. Small items

| Item | Fix |
| --- | --- |
| React Doctor "Array lookup inside a loop", `getColumnNamesFromColumns.ts:35` | Build a `Set` of the data types once |
| 1b test gaps | A second click on Add while adding calls `addColumns` once (both modal tests). `PluginMenuSlot` calls `getContext` before `getDataExplorerBridge` |
| Stale rolling-average group-by | Normalize at write time in `useRollingAverageForm`: picking a value or date column equal to the group-by clears the group-by |
| Undo name | The Undo button in `notifyDerivedColumnsAdded.tsx` gets `aria-label={t\`Undo added columns\`}`. The visible label stays "Undo" |
| `emitPluginAiTools.main.ts` beside its module | Move `emitPluginAiTools.ts`, `.main.ts`, and its tests into `packages/shared/plugin-manifest/src/node/emitPluginAiTools/`, and update the README command and `src/node/index.ts` |
| `PluginAiTool` export | Export it from `runtime.ts` next to `PluginCommand`. The main entry keeps exporting it. Update the README |
| Concatenated prompt bullet | `` `${PLUGIN_TOOL_BULLET}${SQL_SECTION_START}` `` in `buildDataAgentSystemPrompt.ts` |
| Imperative loop in `runFitRegression.ts` | Find the first bad column declaratively, keeping the same errors and order |
| React Doctor "Derived state stored in an effect", `useContainerWidth.ts` | Measure in the ref callback. React 19 lets a ref callback return its cleanup, so the `ResizeObserver` is created and disconnected there with no effect. The `clientWidth` rule and its comment stay |

## Docs

- The 1b and 1c handoffs: mark each closed follow-up with the commit that
  closed it.
- `docs/plugin-authoring.md`: the error pattern (section 4), the automatic
  limit (section 5), the column-name limit (section 6).
- The uninstall spec: the known limits now point here.

## Testing summary

- `supabase test db` for the new rpcs (the branch is switched).
- Vitest for every changed module, then `pnpm test:frontend`, the plugin
  packages, and `scripts/ai-eval` tests.
- `tsc -b`, `eslint`, `pnpm check:plugin-bundle`, `pnpm verify:packages`,
  `pnpm desktop:sqlite:check-migrations`, `pnpm i18n:check`.
- E2E, one at a time: `plugins-mozambique-uninstall`,
  `plugins-epidemiology-incidence`, `plugins-epidemiology-regression`.

## Branch

`fix/plugins-cleanup`, from local `demo/measles` at `17cf430c4`. It adds a
migration, so it switches its local stack first. Merge into `demo/measles`
only with Pablo's approval. A push to `demo/**` deploys.

## Done when

Every follow-up listed in the Context is closed and recorded, and feature B
can start with no open plugin follow-ups.
