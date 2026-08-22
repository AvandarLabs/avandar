# QETL Google Sheets acquisition - design

**Status:** Draft for review. Revised 2026-08-19 in `feat/qetl-sheets` (lane C).
**Author:** pablo@avandarlabs.com (brainstormed with Claude). Revision by the
lane C session.
**Date:** 2026-08-18, revised 2026-08-19
**Spec:** 4 of 6. Parent: `.temp/qetl/final_proposal.md` (revision 6),
section 11 (capability contract), section 11.2 (the two acquisition modes),
Phase 1 (lines 1593-1618)
**Related:**
`docs/superpowers/specs/2026-08-18-qetl-relation-registry-design.md` (spec 1,
ships the `GoogleSheetsWrapper` that still throws),
`docs/superpowers/specs/2026-08-18-qetl-relation-cache-design.md` (spec 2, owns
the relation cache, the cache key and the source version token),
`docs/superpowers/specs/2026-08-18-qetl-spec-decisions-log.md` (the decisions
log, whose section 3 resolves this spec's console prerequisites),
`docs/superpowers/plans/2026-08-19-qetl-parallelization.md` (lane C's ownership
boundary),
`docs/superpowers/plans/2026-08-19-qetl-google-sheets.md` (this spec's
implementation plan)

---

## 0. What changed in the 2026-08-19 revision

The 2026-08-18 draft was written before the QETL work was split into lanes and
before anyone read the model layer's Zod parsers. Both facts moved the design.
This section is the changelog, so a reviewer who read the draft can see the
delta without diffing.

The verbatim draft is preserved outside the repo at the lane C session's scratch
directory as `spec4.md`.

| #   | Change                                                                                                                                                                                                                                      | Why                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **New blocker found: `GoogleSheetsDatasetParsers` cannot parse a real row.** `google_account_id` is validated with `z.uuid()`, but the column holds a Google `sub`. See section 3.1                                                         | Proven, not inferred. This alone makes the exit criterion unreachable, and the draft did not mention it                                                                                                                                                                                                                                                                                     |
| 2   | **Second blocker found: the "Connect to Google Sheets" button was hard-disabled.** `GoogleSheetsImportView.tsx:369` set `disabled` unconditionally. See section 3.2                                                                         | A user with no existing token could not reach the Picker at all, so "import through the Picker" was not demonstrable on a fresh account. Removed outright, not flagged                                                                                                                                                                                                                      |
| 3   | **This lane ships no `SourceWrapper` and touches no `QetlClient` file.** Draft sections 5.3 and 7.1, and draft minimum-path steps 5, 6, 10 and 11, all edited files that belong to other lanes. Replaced by section 8, the integration seam | `docs/superpowers/plans/2026-08-19-qetl-parallelization.md:212` and the lane C handoff both make `src/clients/qetl/` off-limits here                                                                                                                                                                                                                                                        |
| 4   | **The tab list comes from the exported workbook, not from the Sheets API.** Draft section 7.2 item 1 fetched `availableSheets` from `google-sheets/:id`. See section 7.2                                                                    | `sniffXlsxFile` already returns `sheets: string[]` (`src/workers/xlsxSniff.worker.ts:30`). Using it removes the connector's last Sheets API call, so `drive.file` sufficiency stops depending on a scope claim about `spreadsheets.get`, and the project-global 300 reads/minute quota leaves the connector entirely                                                                        |
| 5   | **`p_sheet_name` is `public.util__nullable_text`, not `text default null`.** See section 6.1                                                                                                                                                | `supabase/schemas/50.rpc_util_types.sql:16` exists precisely because Supabase's type generator will not emit a nullable parameter for a bare `text`. `rpc_datasets__add_xlsx_file_dataset` already uses the wrapper for the identical column                                                                                                                                                |
| 6   | **The scope reduction has nothing to migrate.** See section 9.1                                                                                                                                                                             | Removing a scope from the authorization request does not narrow a refresh token already granted under the wider set, so an earlier revision worked through that migration in detail. It does not apply: the connector shipped hard-disabled, so there are no existing users on the sensitive grant (Pablo, 2026-08-19) and every token from here forward is `drive.file` only               |
| 7   | **Losing the per-file grant presents as 404, not 403.** Draft section 9.3 offered both. See section 10.3                                                                                                                                    | Under `drive.file` a non-granted file is invisible, so Drive answers "not found". The consequence is that revocation and deletion are indistinguishable to us, which changes the error copy                                                                                                                                                                                                 |
| 8   | **The 10 MB cap cannot be pre-checked, and the error is the only signal.** See section 11.3                                                                                                                                                 | The cap is on the size of the _rendered_ XLSX, which is unknown before the call. `maxBytesPerCall` is documentation, not an enforceable guard                                                                                                                                                                                                                                               |
| 9   | **`File.version` false positives are guaranteed, not merely possible.** See section 11.1                                                                                                                                                    | Drive documents `version` as reflecting "every change made to the file on the server, even those not visible to the user"                                                                                                                                                                                                                                                                   |
| 10  | **Four corrections handed to the integration session rather than applied here.** See section 8.3                                                                                                                                            | They are edits to `GoogleSheetsWrapper` and to `shared/models/relations/`, both outside this lane                                                                                                                                                                                                                                                                                           |
| 11  | **Stale line references fixed and every code block labelled.** `qetlDiceExtractors.ts` throws at `:131`, not `:107`. Section 15 states the compile status of every snippet                                                                  | Draft snippets were shipped uncompiled in QETL plan tasks 5, 7, 11 and 14, and the repo had to be declared the authority                                                                                                                                                                                                                                                                    |
| 12  | **`rows_to_skip` is dropped for `google_sheets`, as the draft decided, and the reason is now proven rather than assumed.** See section 7.4                                                                                                  | This revision set out to overturn the draft's regression by carrying the skip through `read_xlsx`'s `range`. Executed against the pinned DuckDB, that does not work: every open-ended range form is either rejected or pads the result to the sheet's maximum extent. The draft's decision stands, and section 7.4 now records the measurements and the exact recipe a follow-up would need |
| 13  | **A new row stores the tab that was read, not the tab that was selected.** See section 6.3                                                                                                                                                  | Found by a surviving mutation during implementation, not by reading the code: the two differ when a user picks a tab and saves without re-parsing, and storing the selection would leave `sheet_name` disagreeing with `dataset_columns`                                                                                                                                                    |
| 14  | **Error copy uses `msg` + `i18n._`, not a threaded `t`.** See section 10.3                                                                                                                                                                  | The first implementation passed `t` into a helper, which `docs/rules/i18n.md:16` bans by name: the extractor cannot follow a macro out of its lexical scope, so every string would have stayed untranslated in all six non-English locales while still rendering in English. Caught because the strings came back empty in the jsdom tests                                                  |

---

## 1. Problem

Google Sheets is the only source type in `datasets.source_type` that cannot be
queried. It can be **imported** and it cannot be **read back**, and the reason
is not a missing feature: it is that the import path and the query path use
different mechanisms, and only one of them was ever built.

### 1.1 Import works, acquisition throws

`GoogleSheetsImportView.tsx` fetches the sheet through the
`google-sheets/:id` route, which
`supabase/functions/google-sheets/GoogleSheetsRoutes.ts` serves by calling
Sheets `spreadsheets.get` for the tab list and `spreadsheets.values.get` for the
**first GRID tab only** (`sheets[0]`, at `GoogleSheetsRoutes.ts:66`). The rows
come back as a 2-D array, are turned into CSV text by `unparseDataset`, wrapped
in a `File`, and driven through `LocalDatasetClient.startCsvImport`. That works,
and it is what makes a Google Sheet importable today.

The query path is a different mechanism entirely. `qetlFactLoading.ts:132`:

```ts
.with({ sourceType: "google_sheets" }, () => {
  throw new Error("Google Sheets data fetching is not supported yet");
})
```

and `qetlDiceExtractors.ts:131` throws in the same shape one step earlier. So a
Sheet can be imported and then never queried, on any device, including the one
that imported it.

Both throws are locked in by
`src/clients/qetl/QetlClient/__tests__/qetlDiceExtractors.characterization.test.ts`,
which asserts the current behaviour deliberately so a later refactor can be
checked against it. Those tests are the integration session's to update, not
this lane's; section 8.2 says so explicitly.

### 1.2 There is no cloud copy to fall back on

`useSaveDataset.ts` excludes Google Sheets from the Parquet upload by name:

```ts
if (
  options.params.sourceType === "google_sheets" ||
  !options.params.onlineStorageAllowed
) {
  return;
}
void DatasetParquetStorageClient.startDatasetUpload({ ... });
```

So unlike `csv_file` and `xlsx_file` there is no object-storage copy for
`_downloadStoredDatasetFact` to fetch. That exclusion is correct and should stay
(a Sheet is reconstructable from Drive, so retaining a copy buys nothing and
costs freshness), but it means acquisition must come from Drive or from nowhere.

### 1.3 The local copy exists and is unreachable

`startCsvImport` writes a Dexie row with the source bytes and, in the
background, the transcoded Parquet. `qetlFactLoading.ts` has a `_getCachedFact`
that reads exactly that row. But `getDiceExtractors` throws **before**
`_fetchExtractor` runs, so the local Parquet is never consulted. This is the
ordering bug spec 1's section 5 names: source dispatch sits between the two
cache tiers. Spec 2 fixes the ordering. This spec must not depend on that fix,
and does not.

### 1.4 The scope Avandar requests today is wider than the job needs

`supabase/functions/google-auth/getAuthURL.ts:26-31` requests, verbatim:

```ts
scope: [
  "openid",
  "email",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
],
```

`auth/spreadsheets` is a **Sensitive** scope granting read-write on every
spreadsheet in the user's Drive, forever. Proposal section 11 records that
sensitive-scope review requires showing that a narrower scope cannot do the job,
and a narrower scope demonstrably can: `auth/drive.file` is already in the list
and is **Non-sensitive**.

### 1.5 A relation is a tab, and the model cannot say which one

`datasets__google_sheets` has `google_document_id` and `rows_to_skip` and
nothing that names a tab. A spreadsheet has many tabs; a relation is one tab.
Today the edge function silently picks `sheets[0]`, which is why proposal
section 11 calls this "the no column names the tab problem".

---

## 2. Goals and non-goals

**Goals.**

1. **Acquire a Google Sheet relation** through Drive `files.export` to XLSX, on
   `auth/drive.file` alone, with the Google Picker as the selection and grant
   mechanism.
2. **Name the tab** in the dataset model, so a relation is one tab and not
   "whatever is first".
3. **Reuse the existing XLSX ingest path** rather than writing a parser.
4. **Freshness**: Drive `File.version`, checked with a debounce, plus an
   explicit-refresh action in the dataset page.
5. **Drop `auth/spreadsheets`** from the requested scope set, and say what that
   does and does not do to accounts that are already connected.
6. **Named error states** for every failure a user can actually hit, including a
   cancelled Picker and an oversized export.
7. **Unblock the two defects in section 3**, without which none of the above is
   demonstrable.

**Non-goals.** Each is named so this spec stays bounded:

- **The `SourceWrapper`, the registry and the mediator.** This lane delivers a
  plain module and a documented seam (section 8). It writes no wrapper, edits no
  file under `src/clients/qetl/`, and edits nothing under
  `shared/models/relations/`.
- The relation cache, the cache key, and where the source version token is
  stored (**spec 2**). This spec produces the token and states its type; spec 2
  stores and compares it.
- Authorization and the cache-probe reordering (spec 2).
- Paging a sheet above the 10 MB export limit (section 14).
- Write-back to a sheet. Reachable on `drive.file` later without a new review
  (proposal section 11); not built.
- The per-service quota counter (declared by spec 1, not counted anywhere yet).
  Section 10.4 explains why Sheets no longer needs it urgently.
- Multiple Google accounts per user. The repo already carries three
  `TODO(jpsyx)` markers for this; this spec keeps taking `tokens[0]`.

**Behaviour change budget: small and named.** Four behaviours change, in
sections 3.1, 6.3, 7.3 and 7.4: reading a Sheets dataset row starts working at
all, the tab becomes explicit for new imports, column types are re-detected by
`read_xlsx` instead of by CSV sniffing, and **new Sheets imports lose the
rows-to-skip control**. The last one is a feature removal, it is the only one
that costs a user anything, and section 7.4 argues it rather than burying it.

---

## 3. Two blocking defects the draft did not know about

Both are in this lane's owned set, both are cheap, and the exit criterion is
unreachable while either stands. They come first in the plan for that reason.

### 3.1 Every read of a real `datasets__google_sheets` row throws

`shared/models/datasets/GoogleSheetsDataset/GoogleSheetsDatasetParsers.ts:18`:

```ts
const DBReadSchema = z.object({
  // ...
  google_account_id: z.uuid(),
  // ...
});
```

The column is `text`, and it holds a Google account id, not a UUID.
`supabase/functions/google-auth-callback/GoogleAuthCallbackRoutes.ts:64` sets it
from the OAuth id token:

```ts
const googleAccountID = payload.sub;
```

A Google `sub` is a numeric string of about 21 digits. `makeParserRegistry`
runs `DBReadSchema.parse` on **every** read
(`packages/shared/clients/src/makeParserRegistry/makeParserRegistry.ts:185`),
and `createDatasetQueries.ts:36` routes `getSourceDataset` for `google_sheets`
through `GoogleSheetsDatasetClient.getOne`. So any code path that reads a
Sheets dataset's source row raises a `ZodError` before it sees
`googleDocumentId`.

**Proven, not argued.** Under this repo's pinned Zod:

```text
z.uuid()  on "108374652910384756291"                     -> false
z.uuid()  on "2f8a1b3c-4d5e-4f60-8a91-b2c3d4e5f607"      -> true
z.string() on "108374652910384756291"                    -> true
```

Why no test caught it: `GoogleSheetsImportView.test.tsx:166` and `:332` both
use `google_account_id: "00000000-0000-4000-8000-000000000099"`, a UUID. The
fixture was built to satisfy the schema rather than to match the database, which
is the failure mode `docs/rules/testing.md` warns about and the reason this
spec's tests use a real `sub` shape.

**Fix:** `google_account_id: z.string()`, matching the column type and matching
what `tokens__google.google_account_id` actually stores. No migration; the
database was always right.

**Blast radius beyond Sheets.** `tokens__google.google_account_id` is the
foreign key target, and it is `text`. Any other parser that types a Google
account id as a UUID has the same defect. The plan includes a sweep
(section 13, task 1) rather than assuming Sheets is the only one.

### 3.2 The Picker is unreachable on an account with no token

`GoogleSheetsImportView.tsx:366-397` renders, for a user who is not yet Google
authenticated, a `Tooltip` reading _"Google sheets connector is disabled while
this feature is under maintenance."_ wrapped around a `Button` whose first prop
is `disabled`. The `onClick` that fetches `google-auth/auth-url` and redirects
to consent is present and unreachable.

The exit criterion is _import a Sheet through the Picker on `drive.file` alone_.
Demonstrating "on `drive.file` alone" wants a token granted from the narrowed
scope set (section 9.1), and a new grant needs the consent flow, which needs
this button. An account that happens to hold an old token can reach the Picker,
but it holds an `auth/spreadsheets` grant, so it cannot demonstrate the claim.

**Fix:** remove `disabled` and the maintenance tooltip outright. The connector is
being enabled (Pablo, 2026-08-19), so there is no flag: the button works, and the
`Tooltip` wrapper that only ever carried the maintenance notice goes with it.

An earlier revision of this spec put the removal behind an `enable-google-sheets`
feature flag. That is no longer the design. The flag existed to keep an
unfinished connector out of users' way, and the hard disable was already doing
that job; adding a second switch for the same purpose, at the moment the feature
is turned on, is a knob nobody would ever set.

---

## 4. Prerequisites: all satisfied, none blocking

The 2026-08-18 draft's section 3 listed Google Cloud console work. The decisions
log section 3 closed all of it (Pablo, 2026-08-18). Restated here so nobody
re-requests it:

| #   | Item                                                                 | State                                                                                                                       |
| --- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | Google Drive API enabled on the project behind `GOOGLE_CLIENT_ID`    | **Done.** Project number `323714789211`, verified as the numeric prefix of `GOOGLE_CLIENT_ID` in `.env.development.edge:30` |
| 2   | Picker API enabled, API key not restricted away from Drive or Picker | **Done and verified clean**                                                                                                 |
| 3   | `VITE_GOOGLE_PICKER_API_KEY` present                                 | **Present** in `.env.development:16` and `.env.example:20`                                                                  |
| 4   | Scope reduction needs console action                                 | **No.** A narrower request is always allowed                                                                                |

**One item is not console work and is not a file edit either.** `.env.production`
and `.env.staging` are gitignored (`.gitignore:29-31`) and neither carries
`VITE_GOOGLE_PICKER_API_KEY`, so the picker's public vars reach production
through Vercel environment variables. `VITE_GOOGLE_PICKER_APP_ID` therefore
needs a Vercel entry before the connector works anywhere but localhost.

**This session will not touch the Vercel console.** The exact values and click
path are in section 16, for Pablo to apply.

---

## 5. Architecture

```text
  Import (once, per relation)             Acquisition (every cache miss)
  ---------------------------             ------------------------------
  Google Picker (setAppId + drive.file)   getGoogleSheetXlsxExport
    -> per-file grant, file id, name        -> version read, then export
  getGoogleSheetXlsxExport                -> { xlsxBytes, sourceVersion }
    -> { xlsxBytes, sourceVersion }       -> caller: DuckDbClient.loadXlsx(
  sniffXlsxFile(bytes)                         fileBytes, sheet: sheetName)
    -> sheets[]: the user picks a tab     -> { parquetBlob, sourceVersion }
  LocalDatasetClient.startXlsxImport      -> spec 2's cache stores it under
    -> columns, preview, parquet               (relation, sourceVersion, ...)
  rpc_datasets__add_google_sheets_dataset
    (google_document_id, sheet_name)
```

Notice what is absent: the Sheets API. Import and acquisition now use the same
two Drive calls and the same local parser, so the two paths cannot disagree
about what a tab contains, and `drive.file` sufficiency does not rest on a claim
about `spreadsheets.get`.

### 5.1 Why `drive.file` plus the Picker works, and neither half alone

This is the load-bearing interaction of the whole design, so it is stated
plainly.

`auth/drive.file` is a **per-file** scope. It grants the application access to
exactly those files the user has explicitly opened with, or created through,
that application, and to nothing else. It cannot list a Drive, cannot search a
Drive, and cannot read a file the user has not handed over. That is what makes
it Non-sensitive: the user, not the app, decides the extent of the grant, one
file at a time.

The consequence is that **the app has no way to discover a file id on its own.**
`drive.file` alone is therefore useless for an import UI: there is nothing to
show the user.

The Google Picker closes exactly that gap. The Picker is Google's own UI, served
in a Google-hosted iframe. Avandar never sees the user's file list; Google
renders it, having authenticated the user itself. When the user selects a file,
two things happen at once: Avandar receives the file id in the callback, **and
Google records a per-file `drive.file` grant** for the OAuth client that
supplied the token to `setOAuthToken`. Selection and authorization are the same
act.

Three properties follow, and each one is load-bearing later in this spec:

1. **The grant is durable and not session-bound.** It attaches to the OAuth
   grant, not to a browser tab, so a file picked on a laptop is acquirable after
   a reload, from another device, and from an edge function, until the user
   revokes it. This is what makes the exit bar ("import through the Picker,
   reload, query it") satisfiable at all.
2. **The grant is per-file, so loss of access is per-file.** A file the user
   deletes or removes from Avandar's access fails on that file and no other.
   Section 10.3 turns that into a recoverable error with the Picker as the fix,
   which is possible only because re-granting is one pick.
3. **Enumeration stays impossible, deliberately.** Avandar can never present
   "all your spreadsheets". Every relation traces to a deliberate human
   selection. This is a feature to say out loud in the review submission, not a
   limitation to work around.

The repo already has the Picker wired: `src/hooks/ui/useGooglePicker.ts` builds
a `DocsView(ViewId.SPREADSHEETS)`, sets the OAuth token and developer key, caps
`setMaxItems(1)`, and fires `onGoogleSheetPicked` on `Action.PICKED`. Nothing in
this design needs a new Picker integration, only the three adjustments in
section 5.2.

### 5.2 Three adjustments to the existing Picker

1. **`setAppId(<project number>)`.** Google's Picker guide is explicit that
   `PickerBuilder.setAppId` takes the Cloud project number and that it is what
   _"allows the app to access the user's files"_, and that the same Cloud project
   must hold both the client id and the app id. The current builder
   (`useGooglePicker.ts:75-93`) sets `setOAuthToken` and `setDeveloperKey` and
   **not** `setAppId`. The method exists in this repo's type definitions
   (`src/lib/types/google-picker.ts:225`) and is called nowhere. Add it, sourced
   from a new `VITE_GOOGLE_PICKER_APP_ID`. Section 15 records this as the
   highest-likelihood demo-night failure, because a pick that does not register
   a grant produces a 404 on export that looks like a scope problem and is not.
2. **Handle `Action.CANCEL`.** The callback today only branches on `PICKED`
   (`useGooglePicker.ts:82`), so a cancel is silently dropped. That is the right
   user-visible behaviour (cancel is not an error) but the caller must clear any
   pending state. Add an `onCancel` option. Section 10.1.
3. **Handle `Action.ERROR`.** `GPickerAction.ERROR` exists
   (`src/lib/types/google-picker.ts:453`) and is likewise dropped. A Picker that
   fails to open because the app id and client id disagree reports here, and
   silently swallowing it is exactly how adjustment 1 gets misdiagnosed. Route
   it to an `onError` option that notifies.

### 5.3 The Drive module

`src/clients/google/GoogleDriveClient/`, two functions, no state, no singleton
import, HTTP injected:

```ts
/** The transport a Drive call uses. Injected so tests need no network. */
export type GoogleDriveFetch = (params: {
  url: string;
  accessToken: string;
}) => Promise<GoogleDriveResponse>;

/** Whole workbook as XLSX bytes, plus the version it was exported at. */
export function getGoogleSheetXlsxExport(params: {
  fileId: string;
  accessToken: string;
  driveFetch: GoogleDriveFetch;
}): Promise<AcquiredGoogleSheet>;

/** Drive `File.version`: opaque, monotonic, compared only for equality. */
export function getGoogleSheetVersion(params: {
  fileId: string;
  accessToken: string;
  driveFetch: GoogleDriveFetch;
}): Promise<SourceVersion>;
```

```ts
/** One workbook's bytes and the source version they belong to. */
export type AcquiredGoogleSheet = {
  xlsxBytes: Uint8Array<ArrayBuffer>;
  sourceVersion: SourceVersion;
};
```

Both take the token as an argument and neither reads it from a module global, so
`WrapperContext` stays the only source of identity when the wrapper calls in
(spec 1, section 4.2: injected, never imported). `driveFetch` is likewise a
parameter, with a default that calls the real `fetch`, so the unit tests need
neither network nor a Google account.

**No `tab` parameter, and that is deliberate.** The lane C handoff describes the
module as taking "a document id, a tab and an auth token". The tab plays no part
in either Drive call: `files.export` is workbook-scoped and returns every tab in
one response, and the tab is a `read_xlsx` argument consumed later by
`DuckDbClient.loadXlsx`. Taking an unused parameter would violate the "never
re-read what the caller already has" rule in the opposite direction, by making
the seam wider than the work. The tab travels beside the bytes, not through
them; section 8.1 shows the two-line call site.

Endpoints, so the implementer does not have to look them up:

| Call    | Request                                                                                                                                                                                                              |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Export  | `GET https://www.googleapis.com/drive/v3/files/{fileId}/export?mimeType=application%2Fvnd.openxmlformats-officedocument.spreadsheetml.sheet` with `Authorization: Bearer <token>`; the response body is the workbook |
| Version | `GET https://www.googleapis.com/drive/v3/files/{fileId}?fields=version` with the same header; the response is `{ "version": "42" }`                                                                                  |

**The version is read before the export, not after, and this ordering is a
correctness decision.** Read after, and a file edited between the two calls
labels stale bytes with the new version: the cache then believes it is fresh and
serves wrong rows. Read before, and the same edit labels fresh bytes with the
old version: the next freshness check sees a change and re-exports once. One
ordering costs an unnecessary export in a rare race; the other serves wrong
data. Section 12.2 tests it.

---

### 5.4 Module layout

```text
src/clients/google/GoogleDriveClient/               new, owned by this lane
  GoogleDriveClient.types.ts                        transport + result types
  GoogleDriveClient.ts                              version + export, no state
  GoogleDriveError.ts                               the error class and its codes
  getGoogleDriveErrorFromResponse.ts                status and reason to code
  acquireGoogleSheetRelation.ts                     the seam (section 8.1)
  googleSheetFreshness.ts                           the debounce (section 11.2)
  GoogleDriveClient.test.ts                         transport injected
  acquireGoogleSheetRelation.test.ts                seam, reader spied
  acquireGoogleSheetRelation.executed.test.ts       seam, real DuckDB reader
  googleSheetFreshness.test.ts                      clock injected

src/hooks/ui/useGooglePicker.ts                     setAppId, cancel, error

src/views/DataManagerApp/
  DataImportView/GoogleSheetsImportView/            gate, tab selector, xlsx
  DatasetMetaView/DatasetMetaView.tsx               refresh action (11.4)

shared/models/datasets/GoogleSheetsDataset/         sheetName, parser fix (3.1)
shared/config/GlobalAppConfig.ts                    the debounce window

supabase/schemas/
  20.datasets__google_sheets.sql                    + sheet_name
  70.rpc_datasets__add_google_sheets_dataset.sql    + p_sheet_name
supabase/migrations/
  <timestamp>_add_sheet_name_to_google_sheets_datasets.sql   generated

supabase/functions/google-auth/getAuthURL.ts        drop auth/spreadsheets
```

Nothing lands in `shared/models/relations/` or `src/clients/qetl/`. This spec
adds no type to the capability contract and writes no wrapper: only a real
implementation the wrapper calls, and the four findings in section 8.3.

## 6. The schema change: a tab column

### 6.1 What changes, and in which files

The repo uses the **declarative schema** workflow: the source of truth is
`supabase/schemas/`, and migrations are **generated** from it, never
hand-written as the primary artifact (`docs/adding-new-data-source-types.md`
section 2). The `supabase-declarative-schema` skill is mandatory for this repo,
and `ava supabase switch` must run first so this branch has an isolated local
project.

1. **`supabase/schemas/20.datasets__google_sheets.sql`** (the declarative
   change). Add one column at the end of the table definition, worded to match
   `20.datasets__xlsx_file.sql:21-23`, which already carries the identical
   concept:

   ```sql
   -- Name of the spreadsheet tab that backs this relation. Nullable when the
   -- default tab was used (e.g. the first tab in the workbook).
   sheet_name text
   ```

2. **`supabase/schemas/70.rpc_datasets__add_google_sheets_dataset.sql`**. Add
   `p_sheet_name public.util__nullable_text` as the last parameter, pass
   `p_sheet_name.value` into the insert, and add the `@param` line to the
   docstring block that file already maintains.

   **Not `p_sheet_name text default null`**, which is what the draft proposed.
   `supabase/schemas/50.rpc_util_types.sql:1-16` documents why: Supabase's
   TypeScript generator will not emit a nullable parameter, so a nullable text
   argument is wrapped in a one-field composite and passed as `{ value }`.
   `rpc_datasets__add_xlsx_file_dataset` already does exactly this for the
   identical `sheet_name` column (`70.rpc_datasets__add_xlsx_file_dataset.sql:29`
   and `:61`), and `createDatasetMutations.ts:106` already calls it as
   `p_sheet_name: { value: params.sheetName ?? null }`. Following the neighbour
   costs nothing and keeps one convention.

3. **A generated migration.** Run the declarative workflow to produce
   `supabase/migrations/<UTC timestamp>_add_sheet_name_to_google_sheets_datasets.sql`.

   **Review the generated diff for two specific things**, because `supabase db
diff` cannot see intent:

   - **A `drop function if exists` for the old eight-argument signature.**
     `create or replace function` with a different argument list creates an
     _overload_ rather than replacing, and two overloads reachable by name make
     PostgREST ambiguous. The precedent is
     `supabase/migrations/20251001090658_Added nullable arguments to rpc_datasets__add_csv_file_dataset.sql`,
     whose first statement is exactly that drop. If the generator does not emit
     it, add it, and say so in the plan's task record.
   - **The four RLS policies and the `updated_at` trigger on
     `datasets__google_sheets` are not dropped and recreated.** An `alter table
... add column` should not touch them. If the diff rewrites them, it is
     doing more than asked.

4. **`pnpm db:gen-types`**, so `shared/types/database.types.ts` carries the new
   column and the new RPC argument. The current generated block for
   `datasets__google_sheets` is at `database.types.ts:629-659` and has no
   `sheet_name`.

### 6.2 Model layer

| File                                                                                                       | Change                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared/models/datasets/GoogleSheetsDataset/GoogleSheetsDataset.types.ts`                                  | Add `sheetName: string \| null` to `GoogleSheetsDatasetRead` with a doc comment; add `"sheetName"` to the `SetOptional` list in `Insert` (currently `"createdAt" \| "id" \| "rowsToSkip" \| "updatedAt"`)                                                                                                                       |
| `shared/models/datasets/GoogleSheetsDataset/GoogleSheetsDatasetParsers.ts`                                 | Add `sheet_name: z.string().nullable()` to `DBReadSchema`, **and** fix `google_account_id` per section 3.1. The `ZodConsistencyTests` type test at the bottom of that file fails to compile if the first is forgotten, which is the intended guard; nothing at compile time catches the second, which is why section 3.1 exists |
| `src/clients/datasets/DatasetClient/createDatasetMutations.ts` (the `_makeInsertGoogleSheetsDataset` body) | Pass `p_sheet_name: { value: params.sheetName ?? null }`                                                                                                                                                                                                                                                                        |
| `src/clients/datasets/DatasetClient/DatasetClient.types.ts:63-67`                                          | Add `sheetName?: string` to `GoogleSheetsDatasetInsertParams`, matching `XlsxDatasetInsertParams:56`                                                                                                                                                                                                                            |

`rows_to_skip` stays on the table and stays applied (section 7.4).

### 6.3 What happens to existing `google_sheets` rows

**No backfill, and that is by design.** The new column is nullable with no
default, so the `alter table` is instant and takes no lock of consequence, and
every existing row gets `sheet_name = NULL`.

`NULL` means "the first tab", which is **exactly** what those rows already got:
`GoogleSheetsRoutes.ts:44-66` reads `sheets[0]` after filtering to `sheetType
=== "GRID"`. So no data migration and no rewrite of stored metadata.

**A new row stores the tab that was _read_, not the tab that was _selected_.**
The two diverge when a user picks a different tab and saves without pressing
"Process data again": the columns recorded in `dataset_columns` are still the
parsed tab's, so recording the newly selected name would leave `sheet_name`
disagreeing with the stored schema, and acquisition would then read a tab whose
columns were never validated. `_saveGoogleSheetsDataset` therefore reads
`sheetLoadMetadata.sheet`, which is what `read_xlsx` actually loaded.

This is not a refinement thought up while writing the spec. The first
implementation preferred the selection, a mutation that removed the preference
survived every test, and investigating why showed the surviving mutant was the
correct code. The test that now covers it uses a fixture where the selected and
parsed tabs differ, which is what the original fixture could not express.

One honest caveat, unchanged from the draft and worth keeping. `NULL` resolves
through two slightly different "first" definitions: the old import path meant
_the first GRID tab as the Sheets API orders them_, while `read_xlsx` with no
`sheet` argument means _the first sheet in the exported workbook_. These agree
unless the workbook's first tab is not a GRID (a chart-only tab, for instance),
which is rare and which the user can fix in one action once the tab selector
exists. The mitigation is cheap and worth taking: **new rows always write a
concrete tab name and never `NULL`.** `NULL` then exists only as a legacy value,
with a shrinking blast radius instead of a permanent one.

### 6.4 How a tab maps onto `relations: "named-tabs"`, and where that breaks

`GoogleSheetsWrapper` declares `relations: "named-tabs"`, documented in
`shared/models/relations/RelationCapabilities/RelationCapabilities.types.ts:24-27`
as _"How many relations one `RelationRef` exposes ... a Google spreadsheet is
many, one per named tab."_

**A `RelationRef` cannot express a tab today.**
`shared/models/relations/RelationRef/RelationRef.types.ts:10-13`:

```ts
export type DatasetRelationRef = {
  kind: "dataset";
  id: Dataset.Id;
};
```

There is no tab component, and no other kind carries one. So the mapping this
spec actually implements is:

> One `datasets__google_sheets` row is one tab. `sheet_name` names it. One
> `DatasetRelationRef` therefore exposes exactly **one** relation, and a
> workbook with three imported tabs is three dataset rows with three refs.

That is a coherent design and it is what the tab column delivers. It is also not
`"named-tabs"` as the capability type defines it: by that definition Sheets is
`"single"`, because the ref-to-relation ratio is one to one. The discrepancy is
not cosmetic, because a consumer written against `"named-tabs"` would expect to
enumerate relations from one ref and would find no field to enumerate over.

`shared/models/relations/` is a frozen contract in this lane and
`GoogleSheetsWrapper` belongs to the registry branch, so this spec does not
change either. It is handed to the integration session as item 1 of section 8.3.

The wasteful consequence, recorded rather than fixed: three imported tabs of one
workbook are three datasets that each export the same workbook, because export
is workbook-scoped. Correct, wasteful, and the fix (a workbook-level export
cache keyed on file id plus version) is a follow-up (section 14 item 5).

---

## 7. Reusing the existing XLSX ingest path

### 7.1 The claim, verified against the code

The claim is that `files.export` yields XLSX, `xlsx_file` datasets already work,
therefore no new parser is needed. **Verified, and more directly than
expected.**

`src/clients/DuckDbClient/duckDbXlsxLoad.ts` exposes `loadXlsxIntoDuckDb`, which
`DuckDbClient.ts:267` surfaces as `DuckDbClient.loadXlsx`. Three properties of
its signature make it a drop-in for acquisition:

1. **It accepts raw bytes.** `DuckDbLoadXlsxOptions` is a union of
   `{ file: File }` and `{ fileBytes: Uint8Array<ArrayBuffer> }`
   (`duckDbXlsxLoad.ts:32-35`). The export response needs no `File` wrapper.
2. **It takes the tab.** `sheet?: string`, documented as _"Worksheet name for
   `read_xlsx`. Omit to load the first sheet (DuckDb default)"_, and passed
   through as `sheet = '<escaped>'` in `_transcodeXlsxToParquet`, escaped with
   `escapeSqlSingleQuotedLiteral`.
3. **It returns exactly what acquisition must return.**
   `DuckDbLoadXlsxResult.parquetData: Blob`, documented as _"The transcoded
   parquet bytes for the loaded sheet ... Callers persist this Blob (e.g. into
   IndexedDB) instead of re-running the conversion later"_. `AcquiredRelation`
   in `SourceWrapper.types.ts:21-25` wants `{ ref, parquetBlob, sourceVersion }`.
   The Blob is the same value.

It also takes the `datasetDuckDbLease`, which `_fetchExtractor` already holds,
so no lease plumbing changes. The transcode is `COPY (SELECT * FROM
read_xlsx(...)) TO ... (FORMAT PARQUET, COMPRESSION ZSTD)`, streamed, with peak
memory bounded by the Parquet output rather than the workbook.

**One accepted inefficiency, unchanged from the draft.**
`loadXlsxIntoDuckDb` registers the table as a side effect, and then
`loadDiceFacts` calls `DuckDbClient.loadParquet` on the same `tableName` to
apply `columnReplacements`. The table is therefore created twice from the same
Parquet. It is correct (the second load replaces the first) and it costs one
extra Parquet scan of an at-most-10 MB export. Optimizing it means teaching
`loadXlsx` a "transcode only, do not register" mode, which is a follow-up.

### 7.2 Import moves onto the same parser, and the tab list comes from the bytes

If import keeps sniffing CSV while acquisition parses XLSX, then the columns
recorded in `dataset_columns` at import time are produced by a **different**
type inference than the rows produced at query time. Names still agree (both
take header row 1), and `_getColumnReplacements` in `qetlFactLoading.ts` casts
each column to its stored `dataType`, so the divergence largely self-corrects.
But "largely self-corrects" is not a property to ship when the fix is to delete
code.

So `GoogleSheetsImportView.tsx` changes to:

1. Export the workbook once through `getGoogleSheetXlsxExport`.
2. **Read the tab list out of those bytes** with the existing `sniffXlsxFile`,
   whose result type already carries `sheets: string[]` and `defaultSheet`
   (`src/workers/xlsxSniff.worker.ts:28-40`, surfaced through
   `src/clients/datasets/xlsxSniff.ts:14`).
3. Let the user pick a tab (a `Select`, defaulting to `defaultSheet`).
4. Call `LocalDatasetClient.startXlsxImport({ file, parseOptions: { sheet,
hasHeader } })` instead of `startCsvImport`, wrapping the bytes in a `File`
   because that mutation takes one (`LocalDatasetClient.ts:232-261`).
5. Save with `sheetName` set to the chosen tab.

**This is the change the draft got wrong, and the correction matters.** The draft
fetched `availableSheets` from the `google-sheets/:id` route, which calls Sheets
`spreadsheets.get`. Reading the tab list from the exported workbook instead has
three consequences, all good:

- **`drive.file` sufficiency stops resting on a scope claim.** The draft's
  argument that dropping `auth/spreadsheets` is safe depended on
  `spreadsheets.get` accepting `drive.file`. That is what Google's scope tables
  say, and it is a claim this spec no longer has to bet a demo on, because it
  makes no Sheets API call at all.
- **The project-global quota leaves the connector.** Sheets' 300 reads per
  minute per project is shared across every tenant and is the dangerous number
  in the whole proposal. After this change the connector's only quota is Drive's,
  which is roughly three orders of magnitude larger.
- **Import and acquisition see the same tab names.** They read the same bytes
  with the same library family, so a tab name stored at import is a tab name
  `read_xlsx` can find. Going through the Sheets API for the list and DuckDB for
  the read left room for exactly the mismatch section 10.3's "tab is gone" error
  exists to catch.

`sniffXlsxFile` runs in a browser worker, so it is not usable from Node. That is
fine and is the reason the Drive module does not depend on it (section 5.3):
the module returns bytes, and the browser decides what to do with them.

**`google-sheets/:id` becomes dead code for this view.** This spec does not
delete the route: it is an edge function, deleting it is a deployment change,
and the route may have other callers to confirm. Section 14 item 7 records it.

The typing changes this forces, because `google_sheets` metadata is currently
declared with the **CSV** load shape:

| File                                                                                                                | Change                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DatasetImportForm.types.ts:59-63`                                                                                  | `GoogleSheetsLoadResult.sheetLoadMetadata` becomes `DuckDbLoadXlsxResult`; `rawText: string` becomes the workbook bytes                                             |
| `useImportedColumns.ts:37-41`                                                                                       | The `google_sheets` branch reads the xlsx shape. The `csv_file` and `xlsx_file` branch immediately above it is the template, and `google_sheets` may simply join it |
| `useSaveDataset.ts` (`_saveGoogleSheetsDataset`)                                                                    | Read columns from the xlsx result and pass `sheetName`                                                                                                              |
| `makeDatasetImportedPayloadFromSaveResult`                                                                          | Analytics payload follows the same shape change                                                                                                                     |
| `DatasetParseControls.tsx:142-159`                                                                                  | The `google_sheets` branch swaps its rows-to-skip `NumberInput` for a tab `Select` (section 7.4)                                                                    |
| `useImportedColumns.test.ts`, `makeDatasetImportedPayloadFromSaveResult.test.ts`, `GoogleSheetsImportView.test.tsx` | These assert the CSV shape and must be updated in the same change                                                                                                   |

That is six files plus three test files: contained, mechanical, and typed
end-to-end, so the compiler enumerates the work. It is the largest single piece
of this spec, and section 16 says what to do if the clock runs out.

### 7.3 The one behaviour change users can see

Column types are re-detected. A column that CSV sniffing called `VARCHAR`
because every cell arrived as a string may be `DOUBLE` or `DATE` once
`read_xlsx` reads the cell's real type from the workbook. For a **new** import
that is strictly better. For an **existing** dataset it does not apply at all,
because the stored `dataset_columns` win: `_getColumnReplacements` casts each
acquired column to its recorded `dataType`. Section 12.4's regression guard
checks that against a real row rather than a fixture.

### 7.4 `rows_to_skip` is dropped for Sheets, and here is the measurement

The CSV path applies `numRowsToSkip` (`LocalDatasetClient.ts:206`). The XLSX
path **does not**: `_makeStartXlsxImport` passes only `sheet` and `hasHeader`,
and `runBackgroundParquetTranscoding` reads `numRowsToSkip` only on the CSV
branch. So `datasets__xlsx_file.rows_to_skip` is already a column that is written
and never applied, and moving Sheets onto the XLSX path **loses skip-rows support
that Sheets has today.**

The draft chose to hide the control and write `rows_to_skip = 0`, noting that the
alternative (expressing the skip through `read_xlsx`'s `range`) needed the
open-ended A1 syntax verified against the pinned DuckDB, which it had not done.

**This revision set out to overturn that and could not.** The verification was
run, against real workbook bytes in the node executed project on DuckDB
`v1.5.5`, and it says the draft was right:

| `read_xlsx(..., header = true, sheet = 'Only', range = ...)` | Result                                                                        |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `range = 'A3:'`                                              | **Rejected.** `Binder Error: Invalid range 'A3:' specified`                   |
| `range = 'A3'`                                               | **Rejected.** `Binder Error: Invalid range 'A3' specified`                    |
| `range = '3:'`                                               | **Rejected.** `Binder Error: Invalid range '3:' specified`                    |
| `range = 'A3:B5'` (exact)                                    | Correct: 2 rows, 2 columns, headers from row 3                                |
| `range = 'A3:B1000'` (row bound too high)                    | 2 real rows followed by **998 all-NULL rows**                                 |
| `range = 'A3:B'` (row bound omitted)                         | Same padding: rows to the sheet's maximum extent                              |
| `range = 'A3:B', stop_at_empty = true`                       | Correct: 2 rows, 2 columns                                                    |
| `range = 'A3:Z', stop_at_empty = true`                       | 2 rows and **26 columns**: `colA`, `colB`, then phantom `C2`, `_1`, `_2`, ... |
| `range = 'A3:XFD', stop_at_empty = true`                     | 2 rows and **16,384 columns**                                                 |

So `range` is usable only when **both** bounds are exact. `stop_at_empty = true`
solves the row bound and does nothing for the column bound: an over-wide end
column produces phantom columns named after empty header cells, which would land
in `dataset_columns` and in every query built on the dataset.

The transcode does not know the sheet's used range. Getting it means a prior
SheetJS pass (`worksheet['!ref']`), a new `range` option on
`DuckDbClient.loadXlsx`, and the same option threaded through
`runBackgroundParquetTranscoding` so the persisted Parquet matches the preview.
That is three files outside this lane's owned set, in service of a feature whose
workaround is "delete the preamble rows in the Google Sheet", which takes five
seconds and which a Google Sheets user (unlike a CSV-on-disk user) can actually
do.

**Chosen, following the draft:** hide the rows-to-skip control for
`google_sheets` imports and write `rows_to_skip = 0`. The column stays on the
table; removing a column is a larger and riskier change than leaving a now-unread
one.

**The follow-up now has a recipe rather than a question** (section 14 item 2).
Skip _n_ rows is:

```text
range = 'A<n+1>:<lastUsedColumn><lastUsedRow>'
```

with the two bounds read from SheetJS's `!ref`, or `range =
'A<n+1>:<lastUsedColumn>'` with `stop_at_empty = true` if only the column bound
is available. Fixing it once fixes `xlsx_file` too.

---

## 8. The integration seam

**This lane writes no `SourceWrapper` and touches no file under
`src/clients/qetl/` or `shared/models/relations/.`** The draft's section 5.3 and
its minimum-path steps 5, 6 and 11 all did. This section replaces them.

### 8.1 What the integration session writes

`GoogleSheetsWrapper` on `feat/qetl-registry` currently throws from both
`describe` and `acquire`, deliberately, because the registry validates at
construction and rejects a declared capability whose backing method is missing.

This lane ships `acquireGoogleSheetRelation`, which is the whole connector
behind one call. It takes the file id, the tab, the token and a **reader**, and
returns whatever the reader produced beside the Drive version:

```ts
export type GoogleSheetXlsxReader<TRelation> = (
  params: Readonly<{
    xlsxBytes: Uint8Array<ArrayBuffer>;
    sheet: string | undefined;
  }>,
) => Promise<TRelation>;

export function acquireGoogleSheetRelation<TRelation>(
  params: Readonly<{
    fileId: string;
    accessToken: string;
    sheetName: string | null;
    readXlsx: GoogleSheetXlsxReader<TRelation>;
    driveFetch?: GoogleDriveFetch;
  }>,
): Promise<{ relation: TRelation; sourceVersion: SourceVersion }>;
```

The reader is injected rather than imported so this module stays free of DuckDB.
The browser passes an adapter over `DuckDbClient.loadXlsx`; the executed test
passes one over a real DuckDB running in Node, which is how the tab contract is
verified against a real reader (section 12.2).

Replacing the throwing `acquire` body is then a few lines:

```ts
// UNVERIFIED: illustrative, not compiled. It imports two modules that do not
// coexist on any branch yet (this lane has the acquisition module; the registry
// branch has the wrapper). The repo is the authority.
acquire: async (req, ctx) => {
  const dataset = /* the caller already holds this; do not re-read it */;
  const { relation, sourceVersion } = await acquireGoogleSheetRelation({
    fileId: dataset.googleDocumentId,
    accessToken: await getGoogleAccessToken(dataset.googleAccountId),
    sheetName: dataset.sheetName,
    readXlsx: ({ xlsxBytes, sheet }) => {
      return DuckDbClient.loadXlsx({
        tableName: req.ref.id,
        fileBytes: xlsxBytes,
        sheet,
        hasHeader: true,
        datasetDuckDbLease: /* the lease the caller holds */,
      });
    },
  });
  return { ref: req.ref, parquetBlob: relation.parquetData, sourceVersion };
},
```

Two things about the shape. The source dataset **arrives from the caller**: the
wrapper must not fetch it, because an earlier cutover had wrappers re-reading the
dataset record and added queries the old path never made. And the wrapper passes
`dataset.sheetName` straight through, `null` included:
`acquireGoogleSheetRelation` owns the translation from a `NULL` tab name to
`read_xlsx`'s first-sheet default, and it is the only place that should, because
a caller that dropped it would silently read tab one for every dataset.

`readFreshness` is the same two lines around `getGoogleSheetVersion`, wrapped in
the debounce this lane ships (section 11.2).

### 8.2 What must land in the same change, or something goes red

1. **`getAuthURL.ts` and `GoogleSheetsWrapper.capabilities.grantedScope`.**
   Spec 1's testing table requires that `grantedScope` matches what
   `getAuthURL.ts` actually requests. This lane edits `getAuthURL.ts`
   (section 9), so the wrapper's declaration and that assertion move with it.
   See section 8.3 item 4 for a string-form mismatch that will bite.
2. **The declared capability and the working `acquire`.** Flipping
   `wholeRelationAcquirable` and replacing the throwing body are one change; the
   registry throws at construction if they are split.
3. **`qetlDiceExtractors.characterization.test.ts`.** It asserts the current
   throw on purpose. When acquisition starts working, that file records the new
   behaviour. It is not this lane's to edit and it will not pass unchanged.

### 8.3 Four corrections handed to the integration session

Each is a file this lane does not own. They are findings, not requests.

1. **`relations: "named-tabs"` does not match `DatasetRelationRef`.** Section 6.4
   has the argument. Either `RelationRef` gains a tab component or the
   capability is `"single"`. As written, a consumer that trusts `"named-tabs"`
   has nothing to enumerate.
2. **`acquisitionUnit` describes the wrong transport.** The wrapper declares
   `{ kind: "whole-range", positionalSubranges: true }`, which is `values.get`.
   This design uses `files.export`, which returns the whole workbook in one call
   and offers no positional subrange at all: `{ kind: "whole-relation" }`.
3. **`quotaScope` describes the wrong pool.** The wrapper declares
   `{ kind: "project-global", readsPerMinute: 300 }`, which is the Sheets API.
   After section 7.2 the connector makes no Sheets call, so this is Drive's
   pool. `{ kind: "per-host", host: "www.googleapis.com" }` is the honest
   declaration, and the 300-per-minute risk row can leave the register.
4. **`grantedScope` uses short names where `getAuthURL.ts` uses URLs.** The
   wrapper declares `["openid", "email", "auth/drive.file"]`;
   `getAuthURL.ts` requests `"https://www.googleapis.com/auth/drive.file"`. The
   assertion in 8.2 item 1 compares the two and fails on the string form unless
   one side normalizes. Cheapest fix: declare the full URLs, since that is what
   the request literally sends.

### 8.4 What spec 2 gets from this lane

1. **The source version token for a Google Sheets relation is the Drive
   `File.version` string, verbatim.** Not hashed, not parsed to a number, not
   combined with a timestamp. Opaque and compared by equality, as
   `RelationCapabilities.types.ts:15` requires.
2. **Acquisition is whole-relation and column projection is ignorable.**
   `AcquireRequest.columns` may be `"all"` or a list; this source returns every
   column either way, because `read_xlsx` reads the tab and a returned superset
   satisfies a subset (`SourceWrapper.types.ts:30-35`).
3. **Expect the token to change more often than the rows do** (section 11.1), so
   any Sheets cache-hit-rate metric reads pessimistic by design.
4. **The version is read before the bytes** (section 5.3), so a token can be one
   version behind its bytes and never one ahead. Spec 2's comparison is safe in
   that direction and only that direction.

If spec 2 lands first, nothing here changes. If this lands first, spec 2 gains a
source with a real freshness token to test against instead of only
`freshnessSignal: "none"` sources.

---

## 9. The scope reduction, and what it does not do

### 9.1 There is nothing to migrate

`getAuthURL.ts:26-31` drops to:

```ts
scope: ["openid", "email", "https://www.googleapis.com/auth/drive.file"],
```

An earlier revision of this spec worked through what removing a scope does to
refresh tokens that were granted under the wider set: it narrows _new_ grants
only, and an existing token keeps the wider grant, with
`tokens__google.scope` still recording it, until the user revokes or
re-consents.

**None of that applies here.** The connector shipped hard-disabled (section 3.2),
which is exactly why: there are no existing users on the sensitive grant (Pablo,
2026-08-19). Every `tokens__google` row created from this change forward carries
`drive.file` and not `auth/spreadsheets`, so there is no population to migrate,
no residual sensitive grant to track, and no revoke-and-re-consent decision to
schedule.

Two things still hold and are worth keeping:

1. **Assert the scope against what `getAuthURL` requests, not against stored
   scopes.** Not because old rows disagree (there are none) but because a test
   that reads the database is testing the database, while the thing this change
   controls is the authorization request. That is what section 12.1 specifies.
2. **Nothing in the codebase needs `auth/spreadsheets`.** The one caller of the
   Sheets API is `google-sheets/:id`, which this design stops using entirely
   (section 7.2). It stays deployed as dead code, not as a dependency
   (section 14 item 7).

### 9.2 The 14-day offline authorization window, stated explicitly

Accepted as drafted, and the decisions log (section 1.3) asks for it to be
documented rather than left implicit in a risk row.

`getAuthURL.ts:24` sets `access_type: "offline"`, so Avandar holds a refresh
token and can acquire without the user present. Revocation is immediate while
online: `getGoogleTokens` refreshes anything within five minutes of expiry
(`getGoogleTokens.ts:8`), and a revoked grant fails that refresh. Offline, the
last locally cached copy of a relation remains readable for up to **14 days**
before eviction makes the loss of authorization sticky. That is the window in
which a user who revokes access can still see previously acquired rows on a
device that never reconnects.

### 9.3 Tokens, unchanged

The existing flow is sound and this spec adds nothing to it:

- `google-auth/tokens` (`GoogleAuthRoutes.ts:32-39`) returns the user's tokens
  and refreshes anything within `TOKEN_REFRESH_THRESHOLD` of expiry, so a caller
  can assume the token it receives is valid. Acquisition calls it and uses
  `tokens[0]`, matching every other consumer in the repo.
- `tokens__google.scope` stores the space-separated granted scopes, so a support
  question ("does Avandar still have access?") is answerable from the database,
  subject to section 9.1 consequence 1.
- If the refresh itself fails, Google has revoked the grant and the only remedy
  is re-consent through `google-auth/auth-url`. Surface that as a **reconnect**
  action, not a generic error. Note that `getGoogleTokens` currently swallows a
  failed refresh and returns the stale token (`getGoogleTokens.ts:73-77`), so the
  browser sees a 401 from Drive rather than an error from our own endpoint.
  Mapping that 401 to "reconnect" (section 10.3) is what makes the behaviour
  correct without changing the edge function.

---

## 10. Errors, and what the user sees

### 10.1 The Picker was cancelled

`GPickerResponseObject.action === Action.CANCEL`. **No error, no toast**: a
cancel is a decision, not a failure. The only requirement is that the calling
view clears whatever pending state it set before opening the Picker, so no
spinner is orphaned. Today `useGooglePicker`'s callback ignores every
non-`PICKED` action, which is nearly right; it needs to invoke an `onCancel` so
the view can reset. Test: open the Picker, dismiss it, and assert the import
view is back to its initial state with no notification shown, with a positive
control asserting that a _pick_ does show one.

### 10.2 The Picker itself failed

`Action.ERROR`. This is a real failure and it must be loud, because the most
likely cause is the `setAppId` mismatch in section 5.2 item 1 and a silent
failure there costs an evening. Notify with the raw Picker error in the log.

### 10.3 Export and version errors

| Failure                                                                                                   | What the user sees                                                                                                                          | Recovery                                                                                                                              |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Drive API disabled on the project (403 `accessNotConfigured`)                                             | _"Google Drive access is not configured for this deployment."_                                                                              | None for the user. Log loudly; this is a deployment error masquerading as a permission error                                          |
| Export over the limit (403 `exportSizeLimitExceeded`, message _"This file is too large to be exported."_) | _"This sheet is too large to import. Google can export at most 10 MB at a time."_                                                           | Split the sheet, or wait for the paging follow-up (section 14 item 1)                                                                 |
| **No per-file grant, or the file was deleted (404)**                                                      | _"Avandar cannot open this Google Sheet. It may have been deleted, or its access may have been removed."_ with a **Reconnect sheet** action | Reopen the Picker for that dataset. Only possible because the grant is per-file and re-granting is one pick (section 5.1, property 2) |
| Token expired or revoked (401)                                                                            | _"Your Google connection expired."_ with a **Reconnect Google** action                                                                      | The existing consent flow. See section 9.3 on why this arrives as a 401 rather than as our own error                                  |
| Rate limited (429, or 403 `userRateLimitExceeded`)                                                        | _"Google is rate limiting this request. Retrying."_                                                                                         | One retry with backoff, then a plain error. Rare, now that the connector is on Drive's pool                                           |
| The stored tab is gone (renamed or deleted; `read_xlsx` errors on an unknown sheet)                       | _"The tab 'Q3 data' is no longer in this spreadsheet."_ with a **Choose a tab** action                                                      | Reselect from the tab list, which updates `sheet_name`                                                                                |
| Network failure mid-export                                                                                | The generic import error already in the view                                                                                                | Retry                                                                                                                                 |

All of these use `notifyError({ title, message })` from
`@/utils/notifications/notify`, which is the pattern
`GoogleSheetsImportView.tsx` already follows. The mapping itself lives in
`getGoogleSheetImportErrorCopy`, which branches on `GoogleDriveError.code` and
never on message prose.

**The copy is defined with `msg` and resolved with `i18n._`, not with a threaded
`t`.** `docs/rules/i18n.md:16` bans passing the translation function into a
helper: `t` is a macro, the extractor cannot follow it across a function
boundary, and the strings would silently never reach the catalogs while still
rendering in English. The first implementation did exactly that and the strings
came back empty in the jsdom tests. `pnpm i18n:extract` now lists
`getGoogleSheetImportErrorCopy.ts` as a `#:` reference for each of these
messages, which is the check `docs/rules/i18n.md` asks for.

**The 404 row is a correction to the draft**, which offered "404, or 403
`insufficientFilePermissions`". Under `drive.file` a file the app was never
granted is not merely forbidden, it is **invisible**: Drive answers 404, because
answering 403 would confirm the file exists to an app with no right to know. The
consequence is that **we cannot distinguish a revoked grant from a deleted
file**, so one message must cover both without guessing. It happens that one
recovery covers both too: re-picking either re-grants the same file or lets the
user choose a different one.

`getGoogleSheetXlsxExport` therefore maps 404 to a single named error, and the
implementation must not invent a distinction the API does not give it.

### 10.4 What leaves the risk register

Proposal section 11 flags Sheets' project-global 300 reads per minute as the
dangerous quota, shared across every tenant. Section 7.2 removes the last Sheets
call from the connector, so this connector's exposure is Drive's pool, which is
roughly three orders of magnitude larger. That is why the per-service quota
counter (spec 1's open item 4) stops being urgent here. It is still needed for
spec 5's open data APIs, which do rate-limit and do return 429.

---

## 11. Freshness

**Resolved by the proposal, line 1601.** Phase 1 reads: _"Drive `File.version`
freshness with a debounced check and an explicit-refresh menu item"_. This closes
`.temp/qetl/review/open-questions.md` question 3 ("latest possible on every
query, session snapshot, or an explicit user refresh"). Neither
latest-on-every-query nor a session snapshot is the design.

### 11.1 What `File.version` is, and its one flaw

Drive documents `File.version` as _"A monotonically increasing version number
for the file. This reflects every change made to the file on the server, even
those not visible to the user."_ It is an int64 delivered as a JSON string. One
metadata `GET` with `fields=version` retrieves it, so it is orders of magnitude
cheaper than an export.

Its flaw, recorded so nobody debugs it twice: **it increments on changes that do
not touch cell values**, and Google says so in the field's own documentation. So
false positives are not a possibility to guard against, they are guaranteed. The
draft called this "can report changed when the rows are identical"; the
documentation is stronger than that.

The cost of a false positive is one re-export. The cost of a false negative would
be wrong rows. It errs in the safe direction, which is the right trade for a
freshness token, and it is why section 5.3 also orders the two calls to err the
same way.

### 11.2 The debounce

The debounce exists because a dashboard with six Sheets-backed charts would
otherwise issue six version checks per render pass.

- **Scope:** per dataset id, per browser tab, in a module-level
  `Map<Dataset.Id, { checkedAt: number; version: SourceVersion }>`.
- **Window:** 60 seconds, as a named constant, added to `GlobalAppConfig` rather
  than left inline. `shared/config/GlobalAppConfig.ts` has no timing section
  today; this adds one.
- **Rule:** inside the window, reuse the last known version without calling
  Drive. Outside it, call `getGoogleSheetVersion` once and update the entry.
- **Clock injected.** The debounce takes a `now: () => number` parameter
  defaulting to `Date.now`, so its tests do not depend on fake timers and can
  assert the boundary exactly (at 59,999 ms reuse; at 60,000 ms call).
- Deliberately **not** persisted. A page reload paying one extra metadata call
  is a fine trade against a persistence format spec 2 may want to own.

**It lives in this lane, not in the wrapper.** The draft put the debounce inside
`GoogleSheetsWrapper`, which this lane cannot write. It ships here as a pure
function beside the Drive module and the wrapper wires it, which is also better
placed: nothing about the policy is Sheets-specific, so a second version-token
source can reuse it.

The debounce is a **read-throttle on the version check, not a staleness
allowance**: a user who edits a sheet and re-queries within the window sees the
previous data for up to 60 seconds, and the explicit refresh is the escape hatch
that makes that acceptable.

### 11.3 The 10 MB export ceiling, and why it cannot be pre-checked

Google's Drive documentation states plainly that exported content is limited to
10 MB, and exceeding it returns HTTP 403 with reason `exportSizeLimitExceeded`
and message _"This file is too large to be exported."_ Field reports exist of
the limit biting below 10 MB, so the number is a documented ceiling rather than a
guaranteed allowance.

**The cap is on the size of the rendered XLSX, which nothing tells us in
advance.** `files.get` reports `size` for binary blobs, not for Google Workspace
files, and the XLSX rendering of a Sheet has no stable relationship to the
Sheet's cell count: formatting, merged ranges and formulas all move it. So:

- There is **no client-side pre-check**, and the implementation must not pretend
  to one. The 403 is the signal.
- `maxBytesPerCall: 10 * 1024 * 1024` in the capability record is **documentation
  for a human and a planner**, not a guard the code enforces. It is discoverable
  rather than folkloric, which is its whole value.
- Above the ceiling, the user gets the named error in section 10.3 and no
  partial import. Failing whole is correct here: `rowIdentity: "none"` and
  `multiCallAtomicity: false` mean a partial workbook cannot be soundly
  completed later.

The demo Sheet is comfortably under 10 MB (decisions log, section 3), so the
fallback stays out of scope (section 14 item 1).

### 11.4 The explicit-refresh action, and exactly where it lives

**Location: `src/views/DataManagerApp/DatasetMetaView/DatasetMetaView.tsx`**, in
the action row that today holds only the `Delete Dataset` button. A `Refresh from
Google Sheets` button sits beside it, rendered only when `dataset.sourceType ===
"google_sheets"`. That is the dataset detail page a user reaches by clicking a
dataset in the Data Manager, so it is where someone who has just edited a sheet
will look.

Why not the other two candidates:

- **`ResyncDatasetsBlock`** is the "your local data is missing, re-upload it"
  modal. It is fed by `useSyncLocalDatasets`, which queries `source_type: { in:
["csv_file", "xlsx_file"] }` and carries the comment `TODO(jpsyx): add syncing
google sheets from backend`. Google Sheets datasets never appear there and
  should not start to: with acquisition working, a missing local copy for a Sheet
  is not a user problem, it is a cache miss that resolves itself. Leave that
  query alone.
- **A per-chart refresh in a dashboard** is a bigger surface (per-relation
  invalidation across many charts) and belongs after spec 2 makes invalidation a
  first-class operation.

What refresh does, in order:

1. Clears the debounce entry for that dataset.
2. `LocalDatasetClient.dropLocalDataset({ datasetId })`, an existing mutation.
3. Drops the DuckDB table, so the in-memory copy goes too.
4. Re-acquires immediately (export, `loadXlsx`, store), and shows the refreshed
   row count and column set.
5. Notifies success, or one of the section 10 errors.

**None of that touches spec 2's cache.** Once spec 2 lands, the same button will
instead invalidate the cache entry and let the normal miss path re-acquire, which
is strictly better and strictly later. Building it as a direct
drop-and-reacquire now means the demo does not block on another lane, and the
follow-up is deleting steps 2 and 3 in favour of one cache call.

---

## 12. Testing

The exit criterion is precise: **import a Sheet through the Picker on
`drive.file` alone, reload, query it, get rows.** That is a manual end-to-end
check and it is the one that matters. The automated tests around it:

### 12.1 Unit, no network

| Area                                  | Test                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GoogleDriveClient` export            | `driveFetch` injected. Asserts the URL carries the XLSX `mimeType`, the header carries the bearer token, and the returned bytes are the response body unchanged                                                                                                                                                      |
| `GoogleDriveClient` version           | Asserts the request carries `fields=version` and that the returned `SourceVersion` is the response's `version` string verbatim, not coerced to a number                                                                                                                                                              |
| **Call ordering**                     | With a `driveFetch` that records call order, asserts the version request precedes the export request (section 5.3). Positive control: both calls happen                                                                                                                                                              |
| Error mapping                         | Each row of section 10.3 asserted case by case, from a `driveFetch` that returns that status and body. The 404 case asserts **one** error covering both revocation and deletion, since the API gives no way to tell them apart                                                                                       |
| Scope declaration                     | `getAuthURL` requests exactly `openid`, `email`, `https://www.googleapis.com/auth/drive.file`. Asserted on the generated URL, not on a constant                                                                                                                                                                      |
| Tab column                            | `GoogleSheetsDatasetParsers` round-trips `sheet_name` present and `null`. `ZodConsistencyTests` covers the type side at compile time                                                                                                                                                                                 |
| **`google_account_id` (section 3.1)** | The parser accepts a **real Google `sub`** (a 21-digit numeric string), with a positive control that a valid row still parses. This is the test whose absence let the defect ship: a UUID fixture passes either way                                                                                                  |
| Picker `setAppId`                     | The builder receives `setAppId` with the configured app id. A positive control asserts `setDeveloperKey` is still called, so a broken builder mock cannot pass both                                                                                                                                                  |
| Picker cancel and error               | `Action.CANCEL` invokes `onCancel` and shows no notification; `Action.ERROR` invokes `onError` and does. Each with the other as its control                                                                                                                                                                          |
| Debounce                              | Two checks inside the window issue one Drive call; outside it, two. Boundary asserted at 59,999 ms and 60,000 ms with the injected clock. Explicit refresh always issues one                                                                                                                                         |
| Import path                           | `GoogleSheetsImportView.test.tsx` asserts the xlsx metadata shape and that the tab the user selects reaches `startXlsxImport` and `insertGoogleSheetsDataset`. `useImportedColumns.test.ts`'s _"maps google_sheets DuckDB columns using the CSV load shape"_ case is rewritten to the xlsx shape rather than deleted |

**Every negative assertion carries a positive control.** A
`not.toHaveBeenCalled()` beside a mock that was never wired passes for the wrong
reason, and that is the specific failure a code-quality review found in every
task of the phase-1 session.

### 12.2 Executed, against a real reader

Using the node vitest project (`vitest.executed.config.ts`, `*.executed.test.ts`,
`withDuckDb` from `src/lib/sql/__tests__/executedDuckDb.ts`):

- A fixture workbook with **two tabs**, read with `sheet` set to the **second**
  tab, returns the second tab's rows and not the first's. This is the test that
  would catch "we shipped a tab column and still read tab one", which is the most
  likely silent bug in this spec.
- The same workbook read with no `sheet` returns the first tab, which is the
  `sheet_name = NULL` contract from section 6.3.

**This is a real reader, verified available.** `@duckdb/node-api` is a
devDependency, `INSTALL excel; LOAD excel;` succeeds in the node harness, and
`read_xlsx(..., sheet = '<name>')` returns the named tab's rows. Checked in this
worktree before the plan committed to it, because the plan's whole shape depends
on it. The fixture is written with SheetJS (`xlsx`, already a dependency), so the
bytes are produced by one real library and read by another, which is the property
that caught two bugs in the CSV writer that a string assertion would have passed.

### 12.3 Mutation proof, not reasoning

Every behavioural claim above is mutation-tested: break the implementation,
watch the specific test go red, restore, confirm byte-identical, and record which
mutation each test caught. Mutants live **outside the repo**, in the session
scratch directory. Reasoning that a test would fail is not evidence, and a
code-quality review found a real defect in every single task of the phase-1
session, most often exactly this.

### 12.4 Manual regression against production data

An existing `google_sheets` dataset with `sheet_name = NULL` acquires the first
tab and returns the same columns the import recorded. **Verify against a real
workspace row, not a fixture**, because the whole point of section 6.3 is a claim
about production data, and because section 3.1 is what a real row would have
caught.

---

## 13. Sequencing

The plan is `docs/superpowers/plans/2026-08-19-qetl-google-sheets.md`. Its shape,
so this spec is readable alone:

1. **Section 3's two defects**, because nothing is demonstrable until they are
   fixed, and because the `z.uuid()` sweep may find more than one.
2. **Picker: `setAppId`, cancel, error**, plus the env var. Cheap, and the
   failure it prevents is the one that looks like something else.
3. **The Drive module.** Pure, injected, unit-tested, no repo dependency beyond
   types.
4. **Schema and model:** `sheet_name`, the RPC, the generated migration, types.
5. **Import onto the XLSX path**, with the tab selector, and the rows-to-skip
   control hidden per section 7.4. The largest step.
6. **The debounce and the refresh action.**
7. **The scope reduction**, last, so the exit criterion is demonstrated on a
   fresh narrow grant rather than on a token that predates the change.

Steps 1 to 4 are the demo path. 5 is the one to cut if the clock runs out
(section 16).

---

## 14. What this spec deliberately leaves open

Recorded so the next reader does not mistake silence for an answer.

1. **Sheets above 10 MB are not importable.** `files.export` refuses (section
   11.3) and there is no fallback. The two candidates are Sheets `values.get`
   with paged A1 ranges, which re-introduces the project-global quota and the
   `multiCallAtomicity: false` problem, and Drive's `files.download`, a
   long-running operation that has neither the size cap nor a client here. The
   user sees a named error meanwhile.
2. **`rows_to_skip` is applied for neither `google_sheets` nor `xlsx_file`**
   (section 7.4). Sheets loses a working control here, which is the one
   user-visible cost in this spec. The follow-up has a verified recipe and needs
   the sheet's used range from SheetJS plus a `range` option on
   `DuckDbClient.loadXlsx` and on `runBackgroundParquetTranscoding`. One fix
   serves both source types.
3. **Only the first Google account is used.** Three `TODO(jpsyx)` markers already
   record this; acquisition adds a fourth caller of `tokens[0]` rather than
   fixing it.
4. **The debounce is per browser tab and not persisted.** Two open tabs each keep
   their own window. Harmless (the cost is one extra metadata call) and
   deliberately not solved in a way spec 2 might have to undo.
5. **A workbook is exported once per imported tab.** Section 6.4. The fix is a
   workbook-level export cache keyed on file id plus version, which is spec 2's
   natural home.
6. **No write-back.** Reachable on `drive.file` without a new review, per
   proposal section 11. Recorded there and here so nobody re-requests
   `auth/spreadsheets` for it.
7. **`google-sheets/:id` becomes dead code and is not deleted.** After section
   7.2 nothing in the import or acquisition path calls it. Deleting an edge
   function is a deployment change and needs a caller sweep first.
8. **Pre-existing `auth/spreadsheets` grants are not revoked.** Section 9.1,
   consequence 3. Known residual, not a surprise.
9. **`sniffXlsxFile` parses the workbook a second time.** Import now runs
   SheetJS for the tab list and preview and DuckDB for the transcode, over the
   same bytes. Acceptable for a 10 MB ceiling, and the alternative (asking DuckDB
   for the sheet list) is a new query path for one string array.

---

## 15. Risks

Every code block in this document is either a quotation from the repo, with a
file and line reference, or explicitly labelled `UNVERIFIED`. The only
`UNVERIFIED` block is the illustrative `acquire` body in section 8.1, which
cannot compile anywhere because it imports two modules that do not yet coexist on
one branch. **The repo is the authority.** QETL plan tasks 5, 7, 11 and 14
shipped sample code that did not compile, and a banner had to be added saying so.

| Risk                                                                                                                                            | Mitigation                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The Picker does not register a `drive.file` grant** because `setAppId` is missing, producing a 404 on export from a file the user just picked | Section 5.2 item 1, done first in the plan. Verify by exporting immediately after a fresh pick, in a browser profile that has never authorized Avandar. Section 5.2 item 3 makes the Picker's own error loud so this is not misdiagnosed. **Highest-likelihood demo-night failure**                                   |
| `VITE_GOOGLE_PICKER_APP_ID` is set locally and forgotten in Vercel, so the connector works on localhost and 404s in staging                     | Section 16 gives Pablo the value and the click path. The env read throws a named error when the var is missing, rather than passing `undefined` to `setAppId`                                                                                                                                                         |
| The import refactor (section 7.2) is larger than the clock allows                                                                               | Section 13 puts acquisition before the import change, so the demo works on today's import path (first tab, `sheet_name = NULL`) even if the refactor is unfinished                                                                                                                                                    |
| Column types differ between CSV-sniffed import metadata and `read_xlsx` acquisition, on datasets imported before this change                    | `_getColumnReplacements` casts each column to its stored `dataType`, so the stored schema wins. Section 12.4 checks a real row                                                                                                                                                                                        |
| Existing rows resolve `NULL` to a different "first tab" than the old import did                                                                 | Section 6.3. Rare, user-fixable in one action, and new rows never write `NULL`                                                                                                                                                                                                                                        |
| `File.version` changes without the rows changing, so refreshes happen more often than needed                                                    | Accepted deliberately, and guaranteed rather than possible (section 11.1). A false positive costs one export; a false negative would serve wrong rows                                                                                                                                                                 |
| The generated migration creates an RPC overload instead of replacing the function, and PostgREST goes ambiguous                                 | Section 6.1 item 3 names the exact statement to look for and the migration that sets the precedent                                                                                                                                                                                                                    |
| Someone re-opens the `rows_to_skip` question and re-derives the same dead end                                                                   | Section 7.4 records the measurements against DuckDB `v1.5.5`, including the recipe that does work and the three files it would need                                                                                                                                                                                   |
| A 10 MB export sounds generous and is not, for a wide sheet                                                                                     | Named error (section 10.3), no client-side pre-check pretending otherwise (section 11.3), and the ceiling declared as `maxBytesPerCall` so it is discoverable                                                                                                                                                         |
| The connector goes live to every workspace                                                                                                      | **Intended.** The connector is being enabled (section 3.2), so the hard disable is removed outright and there is no flag. What limits exposure is that `google_sheets` is still unqueryable until the integration session lands the wrapper body (section 8.1): a user can import a Sheet and cannot yet read it back |

---

## 16. Minimum demo path, and what Pablo must do

The smallest ordered set that gets a real Sheet imported and queried. Effort
figures assume one implementer who has read sections 5 to 11.

| #   | Step                                                                                                                                 | Effort | Notes                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Section 3.1: the parser fix and the sweep                                                                                            | 30 min | Nothing reads a Sheets dataset row until this lands                                                                                                                        |
| 2   | Section 3.2: remove the hard disable from the connect button                                                                         | 15 min | No fresh grant is possible without it                                                                                                                                      |
| 3   | `.setAppId()` plus `VITE_GOOGLE_PICKER_APP_ID` in `.env.development` and `.env.example`                                              | 20 min | Cheap, and it is the failure that looks like something else                                                                                                                |
| 4   | The Drive module (section 5.3) with the error mapping from section 10.3                                                              | 60 min | Two fetches, injected transport, ordering test                                                                                                                             |
| 5   | Schema and model: `sheet_name`, the RPC, the generated migration, `pnpm db:gen-types`                                                | 60 min | `ava supabase switch` first. Review the diff per section 6.1 item 3                                                                                                        |
| 6   | **Demo checkpoint: exit criterion.** Fresh Google account, connect, pick a Sheet, hard-reload, query it in the SQL surface, get rows | 15 min | Needs the integration session's wrapper body, or a temporary local call from the import view for the checkpoint only                                                       |
| 7   | The tab selector and the XLSX import switch (sections 7.2, 7.4)                                                                      | 2 h    | The largest step. Cut it first; step 6 passes without it, using the first tab. Cutting it also keeps the rows-to-skip control, which is the one thing this step takes away |
| 8   | Debounce and the refresh action (sections 11.2, 11.4)                                                                                | 75 min | Skippable for a demo; without it refresh is the only freshness mechanism                                                                                                   |
| 9   | Drop `auth/spreadsheets` (section 9)                                                                                                 | 10 min | Last, so step 6 is demonstrated on a narrow grant. Coordinate with section 8.2 item 1                                                                                      |

**What the demo shows if only steps 1 to 6 land:** a Google Sheet imported
through the Picker, surviving a reload, queried in SQL, returning rows, with the
acquisition itself using nothing but `drive.file`. That is the proposal's Phase 1
exit criterion for this connector, met exactly.

### 16.1 The one thing an agent cannot do

`VITE_GOOGLE_PICKER_APP_ID` must be added as a Vercel environment variable, or
the Picker registers no grant outside localhost.

- **Name:** `VITE_GOOGLE_PICKER_APP_ID`
- **Value:** `323714789211`
- **Environments:** Production, Preview and Development (all three; it is the
  same Cloud project everywhere)
- **Click path:** Vercel dashboard, select the Avandar web project, **Settings**,
  **Environment Variables**, **Add New**, enter the name and value above, tick
  all three environment checkboxes, **Save**. A redeploy is required for it to
  reach the bundle, because `VITE_`-prefixed variables are inlined at build time.

While checking that screen it is worth confirming `VITE_GOOGLE_PICKER_API_KEY` is
present in the same three environments, since it is absent from `.env.production`
and `.env.staging` and must therefore already be coming from Vercel.
