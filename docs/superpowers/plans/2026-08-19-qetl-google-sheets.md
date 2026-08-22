# QETL Google Sheets connector - implementation plan

**Date:** 2026-08-19
**Lane:** C, `feat/qetl-sheets`, based on `feat/qetl-impl` at `525396e0`
**Spec:** `docs/superpowers/specs/2026-08-18-qetl-google-sheets-design.md`
**Coordination:** `docs/superpowers/plans/2026-08-19-qetl-parallelization.md`
**Exit criterion:** import a Sheet through the Picker on `drive.file` alone,
reload, query it, get rows.

---

## 0. How to use this plan

Tasks run in order. Each one lists what it changes, the tests it ships, the
mutations those tests must catch, and the acceptance criteria. A task is done
when its acceptance criteria hold **and** its mutations have been run and
recorded, not when the code looks right.

### Rules that apply to every task

1. **`ava supabase switch` before task 5.** It gives this branch an isolated local
   Supabase project. Without it, another worktree's `db diff` or `db reset`
   silently reverts this migration. `ava supabase status` confirms which project
   is active; `ava supabase migrations validate` checks ordering; `ava supabase
restore` tears it down when the lane closes.
2. **Mutation-test every behavioural claim.** Break the implementation, watch the
   named test go red, restore, confirm the file is byte-identical, and record
   which mutation each test caught. Mutants live **outside the repo**, in the
   session scratch directory. Reasoning that a test would fail is not evidence.
3. **A positive control beside every negative assertion.** A
   `not.toHaveBeenCalled()` next to a mock that was never wired passes for the
   wrong reason.
4. **Test against the real reader.** XLSX assertions go through DuckDB or SheetJS,
   not through a hand-rolled formatter.
5. **Naming.** `docs/rules/typescript.md:272` and `:310` ban naming a conversion
   or lookup `resolve...` or `_resolve...`. **`probe` is reserved** for
   `RelationCachePort`; nothing here may be a probe.
6. **Pure functions do not live among client singletons.** Importing one from a
   client module has already dragged `@lingui/core/macro` into a Node test.
7. **Take what you need as arguments.** Do not re-read a record the caller
   already holds.
8. **No destructive git.** No `rm -rf`, `git clean`, `git checkout --`,
   `git stash`, `git reset --hard`, rebase, force-push or history rewriting. Do
   not push and do not open a pull request.
9. **Editor diagnostics in this repo fire spuriously.** Confirm against
   `pnpm type-check`, which also runs `deno check shared`. A file under
   `shared/` that imports `@/...` fails it.
10. **All four commands green before reporting anything done:**
    `pnpm test:frontend`, `pnpm test:executed`, `pnpm type-check`, `pnpm lint`.
    `lint` is on the list because a session once shipped a stylelint failure
    having run only the first three.

### Ownership boundary

**Do not create or edit** anything under `src/clients/qetl/`,
`shared/models/relations/`, or `src/clients/qetl/wrappers/`. If one of those
needs a change, it is a message to the integration session (spec section 8.3),
not an edit.

`src/clients/DuckDbClient/` and `src/clients/datasets/LocalDatasetClient/` are
unclaimed but shared. This plan reads from both and writes to neither.

### Baseline

All four commands were green on `525396e0` before any edit in this lane:
`test:frontend` 434 files / 2,636 tests, `test:executed` 1 file / 2 tests,
`type-check` clean, `lint` clean.

---

## Task 1: make a real `datasets__google_sheets` row readable

**Spec:** section 3.1. **Why first:** every later task that reads a Sheets
dataset row fails until this lands, and the sweep may find siblings.

### Changes

- `shared/models/datasets/GoogleSheetsDataset/GoogleSheetsDatasetParsers.ts:18`:
  `google_account_id: z.uuid()` becomes `z.string()`.
- Sweep every other parser for a Google account id typed as a UUID:

  ```bash
  grep -rn "google_account_id" shared/ src/ packages/ | grep -v node_modules
  ```

  Fix each one the same way, or record why it is correct.

### Tests

New `shared/models/datasets/GoogleSheetsDataset/GoogleSheetsDatasetParsers.test.ts`,
in the frontend project:

1. `fromDBReadToModelRead` accepts a row whose `google_account_id` is a **real
   Google `sub`** (`"108374652910384756291"`, 21 digits) and returns a model whose
   `googleAccountId` is that string unchanged.
2. Positive control: the same row with a UUID-shaped account id also parses, so
   the test is not merely asserting that validation is gone.
3. Negative control with a genuinely invalid row: a missing `google_document_id`
   still throws, so `DBReadSchema` is proven to still be running.

### Mutations to catch

| Mutation                                        | Test that must go red |
| ----------------------------------------------- | --------------------- |
| Restore `google_account_id: z.uuid()`           | Test 1                |
| Delete `google_document_id` from `DBReadSchema` | Test 3                |
| Replace `DBReadSchema` with `z.looseObject({})` | Test 3                |

### Acceptance

- Test 1 fails before the source change and passes after. Recorded, not assumed.
- The sweep's output is recorded in the task notes, including files inspected and
  found correct.
- Four commands green.

---

## Task 2: make the connector reachable on an account with no token

**Spec:** section 3.2. **Why:** the exit criterion needs a fresh `drive.file`
grant, which needs the consent flow, which is behind a hard-disabled button.

### Changes

- `src/views/DataManagerApp/DataImportView/GoogleSheetsImportView/GoogleSheetsImportView.tsx`:
  remove the connect `Button`'s `disabled` prop and the `Tooltip` that wrapped it
  to carry the maintenance notice. Drop the now-unused `Tooltip` import.

**Removed outright, not flagged.** The connector is being enabled (Pablo,
2026-08-19). The hard disable was already keeping an unfinished connector out of
users' way, so adding a feature flag for the same purpose at the moment the
feature is turned on is a knob nobody would ever set.

What still limits exposure is not a switch: `google_sheets` remains unqueryable
until the integration session replaces the throwing `acquire` (spec section 8.1),
so a user can import a Sheet and cannot yet read it back.

### Tests

Added to `GoogleSheetsImportView.test.tsx`, with
`googlePickerHarness.isGoogleAuthenticated` set to `false` so the connect branch
renders:

1. The connect button is enabled, and clicking it fetches
   `google-auth/auth-url` and navigates to the returned consent URL.
2. Positive control: the button is present and the maintenance notice is not, so
   the absence of the notice is not the absence of the whole branch.

### Mutations to catch

| Mutation                                     | Test that must go red |
| -------------------------------------------- | --------------------- |
| Restore `disabled` on the connect button     | Test 1                |
| Drop the `onClick` that fetches the auth URL | Test 1                |
| Restore the maintenance `Tooltip`            | Test 2                |

### Acceptance

- No `FeatureFlag` reference remains anywhere in the connector.
- Four commands green.

---

## Task 3: the Picker adjustments

**Spec:** sections 5.2, 10.1, 10.2. **Why here:** cheap, and the failure it
prevents (a pick that registers no grant) presents as a 404 on export that looks
like a scope problem.

### Changes

- `.env.development` and `.env.example`: `VITE_GOOGLE_PICKER_APP_ID=323714789211`
  under the existing `# Google Picker API` heading. `.env.example` gets the value
  too, since it is a public project number, not a secret.
- `src/hooks/ui/useGooglePicker.ts`:
  - a `_getGooglePickerAppId()` beside the existing `_getGooglePickerAPIKey()`,
    throwing the same shape of named error when the var is missing, so a missing
    var never reaches `setAppId` as `undefined`;
  - `.setAppId(_getGooglePickerAppId())` on the builder;
  - `onCancel?: () => void` and `onError?: (response) => void` options, invoked
    from the callback on `Action.CANCEL` and `Action.ERROR`.
- `GoogleSheetsImportView.tsx`: pass an `onCancel` that clears
  `selectedDocument` and any pending state, and an `onError` that calls
  `notifyError`.

### Tests

New `src/hooks/ui/useGooglePicker.test.ts`, with the Picker API and
`useGooglePickerAPI` stubbed by a recording builder:

1. The builder receives `setAppId` with `"323714789211"`.
2. Positive control: `setDeveloperKey` and `setOAuthToken` are still called, so a
   broken builder stub cannot pass test 1 vacuously.
3. `Action.CANCEL` invokes `onCancel` and does **not** invoke
   `onGoogleSheetPicked`; control asserts `Action.PICKED` invokes the latter.
4. `Action.ERROR` invokes `onError` and not `onGoogleSheetPicked`.
5. A missing `VITE_GOOGLE_PICKER_APP_ID` throws a named error rather than
   building a picker.

Added to `GoogleSheetsImportView.test.tsx`:

6. Dismissing the Picker leaves the view in its initial state and shows no
   notification. Positive control: a pick does notify.

### Mutations to catch

| Mutation                                                     | Test that must go red |
| ------------------------------------------------------------ | --------------------- |
| Remove `.setAppId(...)`                                      | Test 1                |
| Pass a literal `"0"` to `setAppId`                           | Test 1                |
| Drop the `CANCEL` branch                                     | Tests 3, 6            |
| Route `CANCEL` to `onGoogleSheetPicked`                      | Test 3                |
| Drop the `ERROR` branch                                      | Test 4                |
| Make `_getGooglePickerAppId` return `""` instead of throwing | Test 5                |

### Acceptance

- The Picker still opens in the running app, verified by hand against a real
  Google account.
- Four commands green.

---

## Task 4: the Drive module

**Spec:** sections 5.3, 10.3, 11.3. **Owned entirely by this lane.**

### Changes

New `src/clients/google/GoogleDriveClient/`:

- `GoogleDriveClient.types.ts`: `GoogleDriveFetch`, `GoogleDriveResponse`,
  `AcquiredGoogleSheet`, and the named error type.
- `GoogleDriveClient.ts`: `getGoogleSheetXlsxExport` and
  `getGoogleSheetVersion`, each taking `driveFetch` with a default that calls the
  real `fetch`.
- `googleDriveErrors.ts`: the status-and-reason to named-error mapping from spec
  section 10.3.
- `GoogleDriveClient.test.ts`.

Shape, restated from the spec so the implementer does not have to switch files:

```ts
export function getGoogleSheetXlsxExport(params: {
  fileId: string;
  accessToken: string;
  driveFetch?: GoogleDriveFetch;
}): Promise<AcquiredGoogleSheet>;

export function getGoogleSheetVersion(params: {
  fileId: string;
  accessToken: string;
  driveFetch?: GoogleDriveFetch;
}): Promise<SourceVersion>;
```

**No `tab` parameter.** Spec section 5.3 says why: `files.export` is
workbook-scoped, and the tab is a `read_xlsx` argument the caller passes to
`DuckDbClient.loadXlsx`.

**The version request is issued before the export request.** Spec section 5.3
gives the correctness argument: this ordering can label fresh bytes with an old
version (costing one extra export later) and can never label stale bytes with a
new version (which would serve wrong rows).

### Tests

`GoogleDriveClient.test.ts`, `driveFetch` injected, no network:

1. Export requests
   `.../files/{id}/export?mimeType=application%2Fvnd.openxmlformats-officedocument.spreadsheetml.sheet`
   with `Authorization: Bearer <token>`, and returns the response bytes unchanged
   (asserted byte for byte, not by length).
2. Version requests `.../files/{id}?fields=version` and returns
   `"42"` as a string. Assert `typeof` is `"string"`, because a `Number()`
   coercion would still pass an `==` comparison and would break `SourceVersion`'s
   equality contract on large values.
3. **Ordering:** a recording `driveFetch` shows the `fields=version` request
   before the `export` request. Positive control: exactly two requests, so a
   version-only implementation cannot pass.
4. `AcquiredGoogleSheet.sourceVersion` is the version from that same call, not a
   second read.
5. Error mapping, one case each, asserting the named error and not the message
   text alone:
   - 403 `accessNotConfigured`
   - 403 `exportSizeLimitExceeded`
   - 404 (**one** error covering both revocation and deletion, since the API gives
     no way to tell them apart)
   - 401
   - 429, and 403 `userRateLimitExceeded`
   - an unmapped 500, which must surface as a generic error rather than as one of
     the named ones
6. Positive control on the error mapping: a 200 does not throw.

### Mutations to catch

| Mutation                                               | Test that must go red |
| ------------------------------------------------------ | --------------------- |
| Drop the `mimeType` query param                        | Test 1                |
| Send the token as `?access_token=` instead of a header | Test 1                |
| Drop `fields=version`                                  | Test 2                |
| `Number(json.version)` instead of the string           | Test 2                |
| Swap the two calls so export precedes version          | Test 3                |
| Read the version a second time after the export        | Test 4                |
| Collapse 404 and 401 onto one error                    | Test 5                |
| Map an unmapped 500 onto the size-limit error          | Test 5                |
| Return early on a non-2xx without throwing             | Test 6                |

### Acceptance

- No module-level token, client singleton or `fetch` reference: `driveFetch` is a
  parameter with a default.
- Nothing imported from `src/clients/qetl/` or `shared/models/relations/` beyond
  the `SourceVersion` **type**.
- Four commands green.

---

## Task 5: the tab column, end to end

**Spec:** sections 6.1, 6.2, 6.3. **Run `ava supabase switch` first.** Use the
`supabase-declarative-schema` skill; it is mandatory for this repo.

### Changes

1. `supabase/schemas/20.datasets__google_sheets.sql`: add `sheet_name text` at
   the end of the table definition, with the comment worded to match
   `20.datasets__xlsx_file.sql:21-23`.
2. `supabase/schemas/70.rpc_datasets__add_google_sheets_dataset.sql`: add
   `p_sheet_name public.util__nullable_text` as the last parameter, insert
   `p_sheet_name.value`, add the `@param` docstring line.
   **Not `text default null`**: spec section 6.1 item 2 gives the reason and the
   neighbour that already does it this way.
3. Generate the migration, then **read the diff** for the two things spec section
   6.1 item 3 names:
   - a `drop function if exists` for the old eight-argument signature, so the
     change replaces rather than overloads. Precedent:
     `supabase/migrations/20251001090658_Added nullable arguments to rpc_datasets__add_csv_file_dataset.sql`.
     If the generator omits it, add it and say so in the task notes.
   - the four RLS policies and the `updated_at` trigger on
     `datasets__google_sheets` are **not** dropped and recreated.
4. `pnpm db:gen-types`.
5. `shared/models/datasets/GoogleSheetsDataset/GoogleSheetsDataset.types.ts`:
   `sheetName: string | null` on `GoogleSheetsDatasetRead`, `"sheetName"` added
   to the `Insert` `SetOptional` list.
6. `shared/models/datasets/GoogleSheetsDataset/GoogleSheetsDatasetParsers.ts`:
   `sheet_name: z.string().nullable()`.
7. `src/clients/datasets/DatasetClient/DatasetClient.types.ts:63-67`:
   `sheetName?: string` on `GoogleSheetsDatasetInsertParams`.
8. `src/clients/datasets/DatasetClient/createDatasetMutations.ts`
   (`_makeInsertGoogleSheetsDataset`): pass
   `p_sheet_name: { value: params.sheetName ?? null }`.

### Tests

In the task 1 parser test file:

1. A row with `sheet_name: "Q3 data"` round-trips to `sheetName: "Q3 data"`.
2. A row with `sheet_name: null` round-trips to `sheetName: null`, **not**
   `undefined` and not absent. `NULL` carries the "first tab" meaning from spec
   section 6.3, so the distinction is load-bearing.
3. The `ZodConsistencyTests` block still compiles, which is the compile-time half
   and needs no runtime test.

New or extended `createDatasetMutations` test:

4. `insertGoogleSheetsDataset({ sheetName: "Q3 data", ... })` calls the RPC with
   `p_sheet_name: { value: "Q3 data" }`, wrapper and all.
5. Omitting `sheetName` sends `{ value: null }`, not `undefined` and not a bare
   `null`.

SQL, in `supabase/tests/database/`, run with `pnpm test:db` against the isolated
local project. **`test:db` is not one of the four commands** and needs a running
local Supabase, so it is run explicitly for this task and its result recorded:

6. Calling `rpc_datasets__add_google_sheets_dataset` with a tab name stores it,
   and calling it with `null` stores `NULL`.
7. The function name resolves to **exactly one** signature, so the migration
   replaced rather than overloaded:

   ```sql
   select count(*) = 1 from pg_proc
     where proname = 'rpc_datasets__add_google_sheets_dataset';
   ```

### Mutations to catch

| Mutation                                        | Test that must go red                       |
| ----------------------------------------------- | ------------------------------------------- |
| Drop `sheet_name` from `DBReadSchema`           | Test 1 (and the type test fails to compile) |
| `z.string()` instead of `z.string().nullable()` | Test 2                                      |
| Pass `p_sheet_name: params.sheetName` unwrapped | Test 4                                      |
| `params.sheetName ?? undefined`                 | Test 5                                      |
| Remove the `drop function` from the migration   | Test 7                                      |

### Acceptance

- `ava supabase status` confirms the isolated project; `ava supabase migrations
validate` passes.
- The generated migration's diff was read and the two checks above recorded, with
  the actual statements quoted in the task notes.
- `pnpm db:gen-types` produced a `sheet_name` in `database.types.ts`.
- Four commands green.

---

## Task 6: acquire the named tab, against a real reader

**Spec:** sections 7.1, 12.2. **Why a task of its own:** this is the test that
catches "we shipped a tab column and still read tab one", which is the most
likely silent bug in the whole spec.

### Changes

None to production code. This task ships the executed test that proves the
`sheet_name`-to-`read_xlsx` contract holds against real bytes, plus the fixture
builder it needs.

Verified available before this plan committed to it: `@duckdb/node-api` is a
devDependency, `INSTALL excel; LOAD excel;` succeeds under
`withDuckDb` (`src/lib/sql/__tests__/executedDuckDb.ts`), and
`read_xlsx(..., sheet = '<name>')` returns the named tab's rows on DuckDB
`v1.5.5`. The fixture is written with SheetJS (`xlsx`, already a dependency), so
one real library writes the bytes and another reads them.

### Tests

New `src/clients/google/GoogleDriveClient/googleSheetTabAcquisition.executed.test.ts`:

1. A two-tab workbook read with `sheet` set to the **second** tab returns the
   second tab's rows and its header names, and **not** the first tab's.
2. The same workbook read with **no** `sheet` returns the first tab. This is the
   `sheet_name = NULL` contract from spec section 6.3.
3. A `sheet` naming a tab that does not exist raises, which is what the "the tab
   is gone" error in spec section 10.3 maps.
4. Positive control: both tabs are present in the fixture and each is reachable
   by name, so test 1 cannot pass because the second tab is the only one there.

### Mutations to catch

| Mutation                                             | Test that must go red |
| ---------------------------------------------------- | --------------------- |
| Drop the `sheet` argument from the query             | Test 1                |
| Hard-code the first tab's name                       | Tests 1, 4            |
| Swallow the unknown-sheet error and return zero rows | Test 3                |

### Acceptance

- Tests 1 and 2 assert **row contents**, not row counts. Two tabs with the same
  shape and different values is the fixture, so a count assertion cannot pass by
  accident.
- Four commands green, `test:executed` now with more than the harness in it.

---

## Task 7: import onto the XLSX path, with a tab selector

**Spec:** sections 7.2, 7.3, 7.4. **The largest task, and the one to cut** if the
clock runs out. The exit criterion passes without it, on the first tab.

### Changes

- `GoogleSheetsImportView.tsx`: replace the `google-sheets/:id` fetch and the
  `unparseDataset` CSV round trip with
  1. `getGoogleSheetXlsxExport`,
  2. `sniffXlsxFile` on the returned bytes for `sheets` and `defaultSheet`,
  3. a tab `Select` defaulting to `defaultSheet`,
  4. `LocalDatasetClient.startXlsxImport({ file, parseOptions: { sheet,
hasHeader } })`,
  5. `sheetName` set to the chosen tab on save.

  The `csvCellValueSchema` array parse and the `unparseDataset` call are deleted,
  not left unused.

- `DatasetImportForm.types.ts:59-63`: `GoogleSheetsLoadResult.sheetLoadMetadata`
  becomes `DuckDbLoadXlsxResult`; `rawText` becomes the workbook bytes.
- `useImportedColumns.ts:37-41`: the `google_sheets` branch joins the
  `csv_file` / `xlsx_file` branch above it if the shapes now agree.
- `useSaveDataset.ts` (`_saveGoogleSheetsDataset`): read columns from the xlsx
  result, pass `sheetName`, and pass `rowsToSkip: 0` per spec section 7.4.
- `makeDatasetImportedPayloadFromSaveResult`: follow the shape change.
- `DatasetParseControls.tsx:142-159`: the `google_sheets` branch swaps its
  rows-to-skip `NumberInput` for the tab `Select`.
- Existing tests updated in the same change:
  `useImportedColumns.test.ts:185` (_"maps google_sheets DuckDB columns using the
  CSV load shape"_, rewritten to the xlsx shape, **not** deleted),
  `makeDatasetImportedPayloadFromSaveResult.test.ts:51`,
  `GoogleSheetsImportView.test.tsx`.

**`google-sheets/:id` is not deleted.** It becomes dead code for this view;
removing an edge function is a deployment change and needs a caller sweep. Spec
section 14 item 7.

### Tests

1. `GoogleSheetsImportView`: after a pick, the tab `Select` lists every tab
   `sniffXlsxFile` reported, and defaults to `defaultSheet`.
2. Choosing the **second** tab passes that tab as `parseOptions.sheet` to
   `startXlsxImport`, and as `sheetName` to `insertGoogleSheetsDataset`. Positive
   control: the default selection passes the first tab, so a hard-coded index
   cannot satisfy both.
3. The view makes **no** request to `google-sheets/:id`. Positive control: it does
   call `getGoogleSheetXlsxExport`, so a view that renders nothing cannot pass.
4. `useImportedColumns` maps a `google_sheets` metadata object in the xlsx shape.
5. `makeDatasetImportedPayloadFromSaveResult` produces the same analytics fields
   it did on the CSV shape, so the payload contract is unchanged for consumers.
6. The rows-to-skip control is absent for `google_sheets`. Positive control: it is
   still present for `csv_file`.

### Mutations to catch

| Mutation                                              | Test that must go red |
| ----------------------------------------------------- | --------------------- |
| Hard-code `sheet: sheets[0]`                          | Test 2                |
| Drop `sheetName` from the insert params               | Test 2                |
| Restore the `google-sheets/:id` fetch                 | Test 3                |
| Read columns from the wrong result field              | Test 4                |
| Drop a field from the analytics payload               | Test 5                |
| Render the rows-to-skip control for every source type | Test 6                |

### Acceptance

- No `unparseDataset` or `csvCellValueSchema` reference remains in the view.
- The three named existing tests were rewritten, not deleted, and each still
  asserts something about `google_sheets`.
- Four commands green.

---

## Task 8: freshness, debounced, and the refresh action

**Spec:** sections 11.1, 11.2, 11.4.

### Changes

- `shared/config/GlobalAppConfig.ts`: a timing section with
  `googleSheetsFreshnessDebounceMs: 60_000`.
- New `src/clients/google/GoogleDriveClient/googleSheetFreshness.ts`: the
  debounce, as a pure function over an injected
  `Map<Dataset.Id, { checkedAt: number; version: SourceVersion }>` and an
  injected `now: () => number` defaulting to `Date.now`. Not Sheets-specific
  beyond its name, so a second version-token source can reuse it.
- `DatasetMetaView.tsx`: a `Refresh from Google Sheets` button beside
  `Delete Dataset`, rendered only when `dataset.sourceType === "google_sheets"`,
  doing the five steps in spec section 11.4.

**The debounce lives here, not in the wrapper** (spec section 11.2): this lane
cannot write the wrapper, and nothing about the policy is Sheets-specific.

### Tests

1. Two checks inside the window issue **one** Drive call and return the same
   version. Positive control: the first check does issue one.
2. A check outside the window issues a second call.
3. Boundary, with the injected clock: at 59,999 ms the cached version is reused;
   at 60,000 ms Drive is called. Both asserted, because a `<` / `<=` slip changes
   only one of them.
4. Clearing the entry forces a call even inside the window, which is what
   explicit refresh relies on.
5. Two different dataset ids do not share an entry.
6. `DatasetMetaView`: the button renders for `google_sheets` and not for
   `csv_file`; clicking it clears the debounce entry, calls `dropLocalDataset`,
   and re-acquires, in that order.

### Mutations to catch

| Mutation                                            | Test that must go red   |
| --------------------------------------------------- | ----------------------- |
| Remove the window check, always call                | Test 1                  |
| Never call after the first check                    | Test 2                  |
| `<=` instead of `<` on the window comparison        | Test 3 (one half of it) |
| Make the clear a no-op                              | Test 4                  |
| Key the map on a constant instead of the dataset id | Test 5                  |
| Render the refresh button for every source type     | Test 6                  |
| Reorder refresh so re-acquire precedes the drop     | Test 6                  |

### Acceptance

- The debounce module imports no client singleton and no `Date.now` at module
  scope.
- The 60-second window appears once, as the named `GlobalAppConfig` value.
- Four commands green.

---

## Task 9: drop `auth/spreadsheets`

**Spec:** section 9. **Last**, so the exit criterion is demonstrated on a grant
issued from the narrowed set rather than on a token that predates the change.

### Changes

- `supabase/functions/google-auth/getAuthURL.ts:26-31`:

  ```ts
  scope: ["openid", "email", "https://www.googleapis.com/auth/drive.file"],
  ```

- A comment recording what this does and does not do: new grants narrow, existing
  refresh tokens keep the wider grant until the user revokes (spec section 9.1).

### Tests

New `supabase/functions/google-auth/getAuthURL.test.ts`, in the frontend project
(which already collects `supabase/functions/**` tests):

1. The generated authorize URL's `scope` parameter contains exactly `openid`,
   `email` and `https://www.googleapis.com/auth/drive.file`, asserted by parsing
   the URL rather than by reading a constant.
2. It does **not** contain `auth/spreadsheets`. Positive control: test 1's
   membership assertion, so an empty scope list cannot pass test 2 alone.
3. `access_type=offline` and `prompt=consent` survive, since section 9.1's
   re-consent story depends on both.

**Do not assert the narrowed scope against `tokens__google.scope`.** Spec section
9.1 consequence 1: every pre-existing row still records `spreadsheets`, and that
is not a bug.

### Mutations to catch

| Mutation                        | Test that must go red |
| ------------------------------- | --------------------- |
| Restore `auth/spreadsheets`     | Test 2                |
| Remove `drive.file`             | Test 1                |
| Remove `prompt: "consent"`      | Test 3                |
| Remove `access_type: "offline"` | Test 3                |

### Acceptance

- Test 1 parses the URL. A test that asserts against the same array the source
  exports proves nothing.
- The integration session is told, in the handback, that
  `GoogleSheetsWrapper.capabilities.grantedScope` must move with this and that its
  short-form strings will not match these URLs (spec section 8.3 item 4).
- Four commands green.

---

## Task 10: the exit criterion, by hand

**Not automatable**, and it is the check that matters.

### Steps

1. A Google account that has **never** authorized Avandar, in a clean browser
   profile.
2. Connect through the flow task 2 unblocked. Confirm the consent screen asks for
   Drive file access and **not** for spreadsheet access.
3. Pick a Sheet through the Picker. Confirm `tokens__google.scope` for the new
   row contains `drive.file` and not `spreadsheets`.
4. Complete the import. Confirm `datasets__google_sheets.sheet_name` holds the tab
   the selector showed.
5. **Hard-reload.** Query the dataset in the SQL surface. Rows come back.
6. Edit a cell in the Sheet, wait past the debounce window, requery, and confirm
   the change appears. Then edit again and use `Refresh from Google Sheets` to
   confirm it appears without waiting.

### The regression guard, spec section 12.4

An **existing** `google_sheets` dataset with `sheet_name = NULL` acquires the
first tab and returns the same columns its import recorded. Run this against a
real workspace row, not a fixture. Section 6.3 is a claim about production data,
and section 3.1 is what a real row would have caught.

### Acceptance

- Steps 1 to 5 pass, on `drive.file` alone. Step 5 is the exit criterion.
- Step 6 and the regression guard pass, or their failures are reported rather
  than worked around.

---

## Task 11: hand back

### Deliverables

1. The four commands, green, with their output.
2. A list of every file changed, and of every file outside this lane's owned set
   that had to be touched, with the reason.
3. **The messages to the integration session**, which are findings and not
   requests. Spec section 8.3 has all four:
   - `relations: "named-tabs"` does not match `DatasetRelationRef`, which carries
     no tab (spec section 6.4);
   - `acquisitionUnit` describes `values.get`, not `files.export`;
   - `quotaScope` describes the Sheets pool, which this connector no longer
     touches;
   - `grantedScope`'s short strings will not equal `getAuthURL.ts`'s URLs.
     Plus the two same-change constraints in spec section 8.2, and the fact that
     `qetlDiceExtractors.characterization.test.ts` will not pass unchanged once
     acquisition works.
4. **The Vercel item**, which no agent may do: `VITE_GOOGLE_PICKER_APP_ID` =
   `323714789211`, in all three environments, with the click path in spec section
   16.1.
5. `ava supabase restore`, to release the isolated local project.

### Do not

Merge, push, rebase, or open a pull request. Report ready.

---

## Appendix: what actually shipped

Recorded after execution so a reviewer can see the delta between the plan and
the work, and so the manual steps that remain are unambiguous.

### Verification, on the final tree

| Command              | Result                                                                |
| -------------------- | --------------------------------------------------------------------- |
| `pnpm test:frontend` | 442 files, 2,707 tests passed (baseline: 434 / 2,636)                 |
| `pnpm test:executed` | 2 files, 6 tests passed (baseline: 1 / 2)                             |
| `pnpm type-check`    | clean, including `deno check shared`                                  |
| `pnpm lint`          | clean, including stylelint and React Doctor                           |
| `supabase test db`   | the new tab-contract suite passes; see the pre-existing failure below |

### Mutation proofs

Every behavioural claim was mutation-tested: 38 mutations across 11 source
files, each applied to the working tree, observed to turn a named test red, then
reverted with the restore confirmed byte-identical by SHA-256. The full table
lives in the session scratch directory as `mutation-log.md`.

Two process notes worth carrying forward:

1. **One mutation appeared uncaught and had actually not applied.** A `perl`
   substitution silently no-oped because its pattern did not span a line break in
   the source. Every mutation after that was gated on a `diff` against the saved
   baseline, so a no-op can no longer be mistaken for a gap in the tests.
2. **One mutation genuinely survived, and the surviving mutant was right.** See
   task 7's entry below.

### Deviations from the plan

| #   | Plan said                                                     | What shipped, and why                                                                                                                                                                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Task 4 delivers two Drive functions                           | It also delivers `acquireGoogleSheetRelation`, an injectable seam that takes the file id, the tab, the token and a **reader**. It is the only place that translates a `NULL` tab into `read_xlsx`'s first-sheet default, and injecting the reader is what lets the executed test drive it against a real DuckDB. Spec section 8.1 has the shape                            |
| 2   | Task 5's RPC takes the tab as the last parameter              | Done, and the generated migration was checked against both of section 6.1's criteria. It emitted `drop function if exists` for the old eight-argument signature, and it left the four RLS policies and the `updated_at` trigger untouched. A pgTAP assertion now pins the one-signature invariant so a future regeneration cannot reintroduce an overload                  |
| 3   | Task 7 keeps `useImportedColumns`'s `google_sheets` branch    | No change was needed: `DuckDbLoadXlsxResult.columns` is the same `DuckDbColumnSchema[]` the CSV result carried, so only the fixture in its test changed                                                                                                                                                                                                                    |
| 4   | Task 7 updates `makeDatasetImportedPayloadFromSaveResult`     | No change was needed either: it already read `sheetLoadMetadata.columns`, which survives the shape change                                                                                                                                                                                                                                                                  |
| 5   | Task 7 stores `parseOptions.sheetName ?? sheet`               | Ships `sheet`. A mutation that removed the preference survived every test; investigating why showed the surviving mutant was correct. Selecting a tab and saving without pressing "Process data again" would otherwise store a tab name that disagrees with the recorded columns. The new test's fixture makes the two values differ, which the original fixture could not |
| 6   | Task 8's refresh lives inline in `DatasetMetaView`            | Extracted to `useRefreshGoogleSheetDataset`, which takes the source dataset row the page has already loaded rather than re-reading it                                                                                                                                                                                                                                      |
| 7   | (not planned)                                                 | `getGoogleSheetImportErrorCopy` was first written with a threaded `t`, which `docs/rules/i18n.md:16` bans by name. Rewritten with `msg` + `i18n._`, and `pnpm i18n:extract` confirms every string now reaches the catalogs                                                                                                                                                 |
| 8   | Task 2 gates the connect button behind `enable-google-sheets` | The flag was built, then removed on Pablo's instruction (2026-08-19): the connector is being enabled, so the hard disable is gone and no flag replaces it. `FeatureFlagConfig.ts` and both `.env` files are back to their baseline apart from `VITE_GOOGLE_PICKER_APP_ID`                                                                                                  |
| 9   | Task 9 documents the scope migration for existing tokens      | Simplified. There are no existing users on the sensitive grant, because the connector shipped hard-disabled, so spec section 9.1 records that there is nothing to migrate rather than how to migrate it                                                                                                                                                                    |

### A pre-existing failure this lane did not cause

`supabase test db` fails 11 of the 30 assertions in
`supabase/tests/database/dashboards/durable_snapshot_transitions.test.sql`. Each
failure is a dashboard snapshot-transition check constraint that does not fire
(`caught: no exception, wanted: 23514`).

It is not this lane's: the diff touches no dashboards schema, and `test:db` is
not one of the four verification commands, which is the likely reason it went
unnoticed. **Reported, not fixed**, because fixing it means changing dashboard
constraints, which belongs to whoever owns that surface.

### Manual steps that remain

1. **Task 10, the exit criterion**, needs a real Google account and a browser. It
   is written out step by step in the task above and has not been run.
2. **The regression guard** needs a real workspace row with
   `sheet_name = NULL`.
3. **`VITE_GOOGLE_PICKER_APP_ID` in Vercel**, which no agent may do. Spec section
   16.1 has the value and the click path.
4. **`ava supabase restore`**, once this lane's migration no longer needs the
   isolated local project.
