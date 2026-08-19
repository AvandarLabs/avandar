# QETL Google Sheets acquisition - design

**Status:** Draft for review
**Author:** pablo@avandarlabs.com (brainstormed with Claude)
**Date:** 2026-08-18
**Spec:** 4 of 6. Parent: `.temp/qetl/final_proposal.md` (revision 6),
section 11 (capability contract), section 11.2 (the two acquisition modes),
Phase 1 (lines 1593-1618)
**Related:**
`docs/superpowers/specs/2026-08-18-qetl-relation-registry-design.md` (spec 1,
ships the `GoogleSheetsWrapper` that still throws),
`docs/superpowers/specs/2026-08-18-qetl-relation-cache-design.md` (spec 2, owns
the relation cache, the cache key and the source version token),
`src/clients/qetl/QetlClient/qetlFactLoading.ts:132`,
`src/clients/qetl/QetlClient/qetlDiceExtractors.ts:107`,
`supabase/schemas/20.datasets__google_sheets.sql`,
`supabase/functions/google-auth/getAuthURL.ts`,
`src/hooks/ui/useGooglePicker.ts`, `src/clients/DuckDbClient/duckDbXlsxLoad.ts`,
`.temp/qetl/review/open-questions.md` (open question 3)

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
**first GRID tab only** (`sheets[0]`). The rows come back as a 2-D array, are
turned into CSV text by `unparseDataset`, wrapped in a `File`, and driven
through `LocalDatasetClient.startCsvImport`. That works, and it is what makes a
Google Sheet importable today.

The query path is a different mechanism entirely. `qetlFactLoading.ts:132`:

```ts
.with({ sourceType: "google_sheets" }, () => {
  throw new Error("Google Sheets data fetching is not supported yet");
})
```

and `qetlDiceExtractors.ts:107` throws in the same shape one step earlier. So a
Sheet can be imported and then never queried, on any device, including the one
that imported it.

### 1.2 There is no cloud copy to fall back on

`useSaveDataset.ts:244` reads:

```ts
if (
  options.params.sourceType === "google_sheets" ||
  !options.params.onlineStorageAllowed
) {
  return;
}
void DatasetParquetStorageClient.startDatasetUpload({ ... });
```

Google Sheets is **excluded from the Parquet upload by name**, so unlike
`csv_file` and `xlsx_file` there is no object-storage copy for
`_downloadStoredDatasetFact` to fetch. That exclusion is correct and should stay
(a Sheet is reconstructable from Drive, so retaining a copy buys nothing and
costs freshness), but it means acquisition must come from Drive or from nowhere.

### 1.3 The local copy exists and is unreachable

`startCsvImport` writes a Dexie row with the source bytes and, in the
background, the transcoded Parquet. `qetlFactLoading.ts` has a `_getCachedFact`
that reads exactly that row. But `getDiceExtractors`
(`qetlDiceExtractors.ts:107`) throws **before** `_fetchExtractor` runs, so the
local Parquet is never consulted. This is the ordering bug spec 1's section 5
names: source dispatch sits between the two cache tiers. Spec 2 fixes the
ordering. This spec must not depend on that fix, and does not.

### 1.4 The scope Avandar requests today is why Google keeps saying no

`supabase/functions/google-auth/getAuthURL.ts` requests, verbatim:

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
5. **Drop `auth/spreadsheets`** from the requested scope set.
6. **Named error states** for every failure a user can actually hit, including a
   cancelled Picker and an oversized export.

**Non-goals.** Each is named so this spec stays bounded:

- The relation cache, the cache key, and where the source version token is
  stored (**spec 2**). This spec produces the token and states its type; spec 2
  stores and compares it.
- Authorization and the cache-probe reordering (spec 2).
- Paging a sheet above the 10 MB export limit through `values.get` (section 13).
- Write-back to a sheet. Reachable on `drive.file` later without a new review
  (proposal section 11); not built.
- The per-service quota counter (declared by spec 1, not counted anywhere yet).
  Section 9 explains why Sheets no longer needs it urgently.
- Multiple Google accounts per user. The repo already carries three
  `TODO(jpsyx)` markers for this; this spec keeps taking `tokens[0]`.

**Behaviour change budget: small and named.** Two behaviours change for existing
`google_sheets` datasets, both stated in section 6.3 and section 7.3:
`rows_to_skip` stops being applied (it is already unapplied for `xlsx_file`),
and column types are re-detected by `read_xlsx` instead of by CSV sniffing.

---

## 3. Blocking prerequisites only the user can perform

**Read this section first.** Everything here happens in the Google Cloud
console. An agent cannot do any of it, and the demo cannot work without item 1.

| # | Action | Where | Blocking? |
|---|---|---|---|
| 1 | **Enable the Google Drive API** on the Cloud project behind `GOOGLE_CLIENT_ID` (project number `323714789211`, read off the client id in `.env.development.edge`). Today only the Sheets API is used, so the Drive API may be disabled; `files.export` and `files.get` both 403 with `accessNotConfigured` if it is | APIs & Services > Enabled APIs > Enable APIs > Google Drive API | **Yes, hard blocker** |
| 2 | Confirm the **Picker API** is enabled and that `VITE_GOOGLE_PICKER_API_KEY` is not API-restricted away from it | APIs & Services > Credentials > the API key > API restrictions | Only if the Picker fails to open |
| 3 | Note the **project number** so the Picker can pass `setAppId` (section 5.2). It is the numeric prefix of `GOOGLE_CLIENT_ID` | Cloud console home | No, but see the risk in section 14 |
| 4 | Nothing for the scope change. Removing `auth/spreadsheets` from the request needs **no** console action and no re-verification; a narrower request is always allowed | n/a | No |

**Already done, verified in this tree, so do not re-request it:**
`VITE_GOOGLE_PICKER_API_KEY` is set in `.env.development`;
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_REDIRECT_URI` are set in
`.env.development.edge`; and `auth/drive.file` is **already in the scope list
that `getAuthURL.ts` requests today**, so every existing Google token in
`tokens__google` was granted with it. That last fact is what makes this design
implementable tonight: no user has to re-consent for acquisition to start
working.

---

## 4. Decisions (resolved)

| Decision | Resolution | Why |
|---|---|---|
| Freshness promise | **Drive `File.version` with a debounced check plus an explicit-refresh menu item.** Not latest-on-every-query, not a session snapshot | **Resolved by the proposal at line 1601** (Phase 1: *"Drive `File.version` freshness with a debounced check and an explicit-refresh menu item"*). This closes `.temp/qetl/review/open-questions.md` question 3, which had listed all three options as open. Do not reopen it |
| Transport | **Drive `files.export` to XLSX**, not Sheets `values.get` | Proposal section 11: Drive is ~1,000,000 quota units/minute/project against Sheets' 300 reads/minute/**project shared across all tenants**; one export call returns **every tab**; and the output feeds a parser this repo already has |
| Scope set | **`openid`, `email`, `auth/drive.file`** | Proposal section 11, verified against Google's scope tables: `auth/spreadsheets` is Sensitive, `auth/drive` and `auth/drive.readonly` are Restricted, `auth/drive.file` is Non-sensitive |
| Selection | **Google Picker only.** No Drive listing | Enumerating Drive needs a Restricted scope. The Picker is what makes the narrow scope sufficient (section 5.1) |
| Acquisition mode | **Whole relation, always** | `values.get` takes an A1 range, which is positional, not predicate: there is no server-side filtering to push down. Spec 1 already declares `predicatePushdown: "none"` and proposal section 11.2 selects relation acquisition from exactly that |
| Where the export call is made | **In the browser**, directly against `googleapis.com`, using the access token `google-auth/tokens` already returns | QETL acquisition runs in the browser (`QetlClient` calls `DuckDbClient`), Drive endpoints support CORS, and the frontend already holds this token for the Picker (`useGooglePicker.ts` passes `access_token` to `setOAuthToken`). Also decisive: `MiniServer`'s `responseSuccess.ts` only emits `JSON.stringify(data)`, so an edge route would have to base64 the workbook |
| Parser | **`DuckDbClient.loadXlsx`**, the existing path | Section 7 verifies it accepts raw bytes, takes a `sheet`, and returns the Parquet blob that `ExtractedFact` needs |
| Tab identity | **A tab name, nullable, meaning "the first sheet"** | Mirrors `datasets__xlsx_file.sheet_name` exactly, including its nullable semantics, and needs no backfill (section 6.3) |
| Where the version token lives | **Spec 2's cache row.** This spec only produces the value | Spec 2 owns the cache key and the source version token. Duplicating either here would create two invalidation systems |
| Does the demo depend on spec 2? | **No.** Explicit refresh drops the local dataset and re-acquires directly | Section 8.4. The demo path must not block on another lane |

---

## 5. Architecture

```text
  Import (once, per relation)            Acquisition (every cache miss)
  ---------------------------            ------------------------------
  Google Picker                          GoogleSheetsWrapper.acquire
    -> per-file drive.file grant           -> GoogleDriveClient
    -> file id + name                          .exportSpreadsheetToXlsx(fileId)
  google-sheets/:id  (tab list)          -> DuckDbClient.loadXlsx(bytes, sheet)
    -> user picks the tab                -> ExtractedFact { parquetBlob }
  Drive export -> loadXlsx(sheet)        -> spec 2's cache stores it under
    -> columns, preview, parquet              (relation, sourceVersion, ...)
  rpc_datasets__add_google_sheets_dataset
    (google_document_id, sheet_name)
```

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
2. **The grant is per-file, so revocation is per-file.** A file the user
   deletes, un-shares, or removes from Avandar's access produces a 403/404 on
   that file and no other. Section 9.2 turns that into a recoverable error with
   the Picker as the fix, which is possible only because re-granting is one
   pick.
3. **Enumeration stays impossible, deliberately.** Avandar can never present
   "all your spreadsheets". Every relation traces to a deliberate human
   selection. This is a feature to say out loud in the review submission, not a
   limitation to work around.

The repo already has the Picker wired: `src/hooks/ui/useGooglePicker.ts` builds
a `DocsView(ViewId.SPREADSHEETS)`, sets the OAuth token and developer key, caps
`setMaxItems(1)`, and fires `onGoogleSheetPicked` on `Action.PICKED`. Nothing in
this design needs a new Picker integration, only the two adjustments in section
5.2.

### 5.2 Two adjustments to the existing Picker

1. **`setAppId(<project number>)`.** The Picker documents `setAppId` as the
   Cloud project number, and it is what ties the pick to the app whose
   `drive.file` grant is being recorded. The current builder sets
   `setOAuthToken` and `setDeveloperKey` but not `setAppId`. Add it, sourced
   from a new `VITE_GOOGLE_PICKER_APP_ID` env var (the numeric prefix of
   `GOOGLE_CLIENT_ID`). Section 14 records this as the highest-likelihood
   demo-night failure, because a pick that does not register a grant produces a
   403 on export that looks like a scope problem and is not.
2. **Handle `Action.CANCEL`.** The callback today only branches on `PICKED`,
   so a cancel is silently dropped. That is the right user-visible behaviour
   (cancel is not an error) but the caller must clear any pending spinner.
   Section 9.1.

### 5.3 The wrapper

Spec 1 ships `src/clients/qetl/wrappers/GoogleSheetsWrapper/` declaring
capabilities and throwing. This spec fills in three members and changes no
declared capability except `grantedScope`:

```ts
// unchanged from spec 1 and re-verified here:
//   relations: "named-tabs"      predicatePushdown: "none"
//   aggregatePushdown: false     wholeRelationAcquirable: "yes"
//   maxBytesPerCall: 10 MB       freshnessSignal: "version-token"
//   rowIdentity: "none"          multiCallAtomicity: false
// changed by this spec:
//   grantedScope: ["openid", "email", ".../auth/drive.file"]

describe(ref, ctx): Promise<RelationSchema>;      // from dataset_columns
readFreshness(ref, ctx): Promise<SourceVersion>;  // Drive File.version
acquire(req, ctx): Promise<AcquiredRelation>;     // export -> loadXlsx
```

`maxBytesPerCall: 10 MB` is now doing real work rather than documenting the
`values.get` response cap: `files.export` refuses to export more than 10 MB of
content, and section 9.3 turns that refusal into a named error.

`grantedScope` matters procedurally. Spec 1's testing table already requires
that *"`grantedScope` matches what `getAuthURL.ts` actually requests"*. So the
edit to `getAuthURL.ts` and the edit to the wrapper's declaration **must land in
the same commit**, or that test goes red.

### 5.4 A new, small Drive client

`src/clients/google/GoogleDriveClient/` with two functions and no state:

```ts
/** Whole workbook as XLSX bytes. Every tab, one call, drive.file only. */
exportSpreadsheetToXlsx(params: {
  fileId: string;
  accessToken: string;
}): Promise<Uint8Array<ArrayBuffer>>;

/** Drive File.version: opaque, monotonic, changes on any edit. */
readFileVersion(params: {
  fileId: string;
  accessToken: string;
}): Promise<string>;
```

Endpoints, so the implementer does not have to look them up:

| Call | Request |
|---|---|
| Export | `GET https://www.googleapis.com/drive/v3/files/{fileId}/export?mimeType=application%2Fvnd.openxmlformats-officedocument.spreadsheetml.sheet` with `Authorization: Bearer <token>`; response body is the workbook |
| Version | `GET https://www.googleapis.com/drive/v3/files/{fileId}?fields=version` with the same header; response is `{ "version": "42" }` |

Both take the token as an argument and neither reads it from a module global, so
the wrapper's `WrapperContext` stays the only source of identity (spec 1,
section 4.2: injected, never imported).

---

## 6. The schema change: a tab column

### 6.1 What changes, and in which files

The repo uses the **declarative schema** workflow: the source of truth is
`supabase/schemas/`, and migrations are **generated** from it, never
hand-written as the primary artifact (`docs/adding-new-data-source-types.md`
section 2).

1. **`supabase/schemas/20.datasets__google_sheets.sql`** (the declarative
   change). Add one column at the end of the table definition, worded to match
   `20.datasets__xlsx_file.sql`, which already carries the identical concept:

   ```sql
   -- Name of the spreadsheet tab that backs this relation. Nullable when the
   -- default tab was used (e.g. the first tab in the workbook).
   sheet_name text
   ```

2. **`supabase/schemas/70.rpc_datasets__add_google_sheets_dataset.sql`**. Add
   `p_sheet_name text default null` as the **last** parameter (a defaulted
   trailing parameter keeps every existing call site compiling), pass it into
   the insert, and add the `@param` line to the docstring block that file
   already maintains.

3. **A generated migration.** Run the declarative workflow (the
   `supabase-declarative-schema` skill is mandatory for this repo) to produce
   `supabase/migrations/<UTC
   timestamp>_add_sheet_name_to_google_sheets_datasets.sql`. Following the
   existing naming style in that directory, the file will be named like
   `20260818T_add_sheet_name_to_google_sheets_datasets.sql` with the real
   timestamp the tool emits. Expected content: one `alter table ... add column`
   plus the `create or replace function` for the RPC. **Review the diff**:
   `supabase db diff` cannot see intent, and this table is referenced by RLS
   policies that must not be dropped and recreated.

4. **`pnpm db:gen-types`**, so `shared/types/database.types.ts` carries the new
   column.

### 6.2 Model layer

| File | Change |
|---|---|
| `shared/models/datasets/GoogleSheetsDataset/GoogleSheetsDataset.types.ts` | Add `sheetName: string \| null` to `GoogleSheetsDatasetRead` with a doc comment; add `"sheetName"` to the `SetOptional` list in `Insert` |
| `shared/models/datasets/GoogleSheetsDataset/GoogleSheetsDatasetParsers.ts` | Add `sheet_name: z.string().nullable()` to `DBReadSchema`. The `ZodConsistencyTests` type test at the bottom of that file fails to compile if this is forgotten, which is the intended guard |
| `src/clients/datasets/DatasetClient/createDatasetMutations.ts:121-141` | Pass `p_sheet_name: params.sheetName` in the `rpc_datasets__add_google_sheets_dataset` call |
| `src/clients/datasets/DatasetClient/DatasetClient.types.ts` | Add `sheetName` to the `insertGoogleSheetsDataset` params |

`rows_to_skip` stays on the table. It is no longer applied (section 7.3), and
removing a column is a larger and riskier change than leaving a now-unread one.

### 6.3 What happens to existing `google_sheets` rows

**Nothing, and that is by design.** The new column is nullable with no default,
so the `alter table` is instant and takes no lock of consequence, and every
existing row gets `sheet_name = NULL`.

`NULL` means "the first tab", which is **exactly** what those rows already got:
`GoogleSheetsRoutes.ts` reads `sheets[0]` after filtering to `sheetType ===
"GRID"`. So no backfill, no data migration, no rewrite of stored metadata.

One honest caveat. `NULL` resolves through two slightly different "first"
definitions: the old import path meant *the first GRID tab as the Sheets API
orders them*, while `read_xlsx` with no `sheet` argument means *the first sheet
in the exported workbook*. These agree unless the workbook's first tab is not a
GRID (a chart-only tab, for instance), which is rare and which the user can fix
in one action once the tab selector exists. The mitigation is cheap and worth
taking: **new rows always write a concrete tab name and never `NULL`.** `NULL`
then exists only as a legacy value, and the ambiguity has a shrinking blast
radius instead of a permanent one.

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
   (`duckDbXlsxLoad.ts:33-35`). The export response needs no `File` wrapper.
2. **It takes the tab.** `sheet?: string`, documented as *"Worksheet name for
   `read_xlsx`. Omit to load the first sheet (DuckDb default)"*, and passed
   through as `sheet = '<escaped>'` in `_transcodeXlsxToParquet`.
3. **It returns exactly what acquisition must return.**
   `DuckDbLoadXlsxResult.parquetData: Blob`, documented as *"The transcoded
   parquet bytes for the loaded sheet ... Callers persist this Blob (e.g. into
   IndexedDB) instead of re-running the conversion later"*. `ExtractedFact` in
   `QetlClient.types.ts` wants `{ datasetId, parquetBlob }`. It is the same
   value.

It also takes the `datasetDuckDbLease`, which `_fetchExtractor` already holds,
so no lease plumbing changes. The transcode is `COPY (SELECT * FROM
read_xlsx(...)) TO ... (FORMAT PARQUET, COMPRESSION ZSTD)`, streamed, with peak
memory bounded by the Parquet output rather than the workbook.

So the replacement for the throw at `qetlFactLoading.ts:132` is, in shape:

```ts
.with({ sourceType: "google_sheets" }, async (extractor) => {
  const bytes = await GoogleDriveClient.exportSpreadsheetToXlsx({
    fileId: extractor.sourceDataset.googleDocumentId,
    accessToken: await getAccessToken(extractor.sourceDataset.googleAccountId),
  });
  const result = await DuckDbClient.loadXlsx({
    tableName: extractor.dataset.id,
    fileBytes: bytes,
    sheet: extractor.sourceDataset.sheetName ?? undefined,
    hasHeader: true,
    datasetDuckDbLease: options.datasetDuckDbLease,
  });
  return { datasetId: extractor.dataset.id, parquetBlob: result.parquetData };
})
```

Note that `DiceExtractor` **already** has a `google_sheets` member carrying
`GoogleSheetsDataset.T` (`QetlClient.types.ts:33-37`), so the type union needs
no change: only the body of the branch. Once spec 1's registry lands, this body
moves into `GoogleSheetsWrapper.acquire` unchanged; the two are the same code in
two locations, and neither ordering blocks the other.

**One accepted inefficiency.** `loadXlsxIntoDuckDb` registers the table as a
side effect, and then `loadDiceFacts` calls `DuckDbClient.loadParquet` on the
same `tableName` to apply `columnReplacements`. The table is therefore created
twice from the same Parquet. It is correct (the second load replaces the first)
and it costs one extra Parquet scan of an at-most-10 MB export. Optimizing it
means teaching `loadXlsx` a "transcode only, do not register" mode, which is a
follow-up, not demo work.

### 7.2 Import should use the same parser, and this is the one real refactor

If import keeps sniffing CSV while acquisition parses XLSX, then the columns
recorded in `dataset_columns` at import time are produced by a **different**
type inference than the rows produced at query time. Names still agree (both
take header row 1), and `_getColumnReplacements` in `qetlFactLoading.ts` casts
each column to its stored `dataType`, so the divergence largely self-corrects.
But "largely self-corrects" is not a property to ship on the demo path when the
fix is to delete code.

So `GoogleSheetsImportView.tsx` changes to:

1. Fetch the tab list from the existing `google-sheets/:id` route, which already
   returns `availableSheets: [{ sheetId, name }]`. **No edge function change is
   required for this**; the response field exists and is currently unused.
2. Let the user pick a tab (a `Select`, defaulting to the first entry).
3. Export the workbook once through `GoogleDriveClient.exportSpreadsheetToXlsx`.
4. Call `LocalDatasetClient.startXlsxImport({ file, parseOptions: { sheet,
   hasHeader } })` instead of `startCsvImport`, wrapping the bytes in a `File`
   because that mutation takes one.
5. Save with `sheetName` set to the chosen tab.

This deletes the `unparseDataset` CSV round trip and the `csvCellValueSchema`
array parse from the view. It does, however, touch the import form's typing,
because `google_sheets` metadata is currently declared with the **CSV** load
shape:

| File | Change |
|---|---|
| `DatasetImportForm/DatasetImportForm.types.ts:66` | `sheetLoadMetadata` becomes `DuckDbLoadXlsxResult` |
| `useImportedColumns/useImportedColumns.ts:37` | The `google_sheets` branch reads the xlsx shape (the `xlsx_file` branch next to it is the template) |
| `useSaveDataset/useSaveDataset.ts:165-182` | `_saveGoogleSheetsDataset` reads columns from the xlsx result and passes `sheetName` |
| `makeDatasetImportedPayloadFromSaveResult` | Analytics payload follows the same shape change |
| `DatasetParseControls.tsx:142` | The `google_sheets` branch loses the rows-to-skip control (section 7.3) |
| `useImportedColumns.test.ts:185`, `makeDatasetImportedPayloadFromSaveResult.test.ts:51`, `GoogleSheetsImportView.test.tsx` | Existing tests assert the CSV shape and must be updated in the same commit |

That is six files plus three test files: contained, mechanical, and typed
end-to-end, so the compiler enumerates the work. It is the largest single piece
of this spec, and section 15 says what to do if the clock runs out.

### 7.3 The `rows_to_skip` regression, stated rather than hidden

The CSV path applies `numRowsToSkip` (`LocalDatasetClient.ts:206`). The XLSX
path **does not**: `_makeStartXlsxImport` passes only `sheet` and `hasHeader`,
and `runBackgroundParquetTranscoding` reads `numRowsToSkip` only on the CSV
branch (`runBackgroundParquetTranscoding.ts:135`). So
`datasets__xlsx_file.rows_to_skip` is already a column that is written and never
applied.

Moving Sheets onto the XLSX path therefore **loses skip-rows support that Sheets
has today**. Two options were considered and one is chosen:

- Express the skip through `read_xlsx`'s `range` argument. Correct in principle,
  but it needs the exact open-ended range syntax (`'A3:'` and friends) verified
  against the duckdb-wasm version this repo pins, which was not verified while
  writing this spec. Not demo work.
- **Chosen for now:** hide the rows-to-skip control for `google_sheets`
  imports and write `rows_to_skip = 0`. A user whose sheet has preamble rows
  deletes them in Google Sheets, which is a thing they can do in five seconds
  and cannot do for a CSV file on disk.

Skip-rows for XLSX and Sheets together is a follow-up (section 13), and fixing
it once fixes both source types.

---

## 8. Freshness: debounced `File.version` plus explicit refresh

**Resolved by the proposal, line 1601.** Phase 1 reads: *"Drive `File.version`
freshness with a debounced check and an explicit-refresh menu item"*. This
closes `.temp/qetl/review/open-questions.md` question 3 ("latest possible on
every query, session snapshot, or an explicit user refresh"), which the README
also flags as an unresolved product commitment. It is resolved. Neither
latest-on-every-query nor a session snapshot is the design.

### 8.1 What `File.version` is, and its one flaw

Drive's `File.version` is an opaque, monotonically increasing counter per file,
returned as a string. It is one metadata `GET` with `fields=version`, so it is
orders of magnitude cheaper than an export.

Its flaw, recorded so nobody debugs it twice: **it increments on metadata
changes too**, including some that do not touch cell values. So it can report
"changed" when the rows are identical. The cost of a false positive is one
re-export; the cost of a false negative would be wrong rows. It errs in the safe
direction, which is the right trade for a freshness token.

### 8.2 The debounce

The debounce exists because a dashboard with six Sheets-backed charts would
otherwise issue six version checks per render pass.

- Scope: per dataset id, per tab (browser tab), in a module-level
  `Map<Dataset.Id, { checkedAt: number; version: string }>` inside the wrapper.
- Window: 60 seconds, as a named constant, placed alongside the other
  `GlobalAppConfig` timing values rather than inline.
- Rule: inside the window, reuse the last known version without calling Drive.
  Outside it, call `readFileVersion` once and update the entry.
- Deliberately **not** persisted. A page reload paying one extra metadata call
  is a fine trade against a persistence format that spec 2 may want to own.

The debounce is a **read-throttle on the version check, not a staleness
allowance**: a user who edits a sheet and re-queries within the window sees the
previous data for up to 60 seconds, and the explicit refresh (section 8.3) is
the escape hatch that makes that acceptable.

### 8.3 The explicit-refresh menu item, and exactly where it lives

**Location: `src/views/DataManagerApp/DatasetMetaView/DatasetMetaView.tsx`**, in
the action row that today holds only the `Delete Dataset` button
(`DatasetMetaView.tsx:257-293`). A `Refresh from Google Sheets` button sits
beside it, rendered only when `dataset.sourceType === "google_sheets"`. That is
the dataset detail page a user reaches by clicking a dataset in the Data
Manager, so it is where someone who has just edited a sheet will look.

Why not the other two candidates:

- **`ResyncDatasetsBlock`** is the "your local data is missing, re-upload it"
  modal. It is fed by `useSyncLocalDatasets`, which queries `source_type: { in:
  ["csv_file", "xlsx_file"] }` and carries the comment `TODO(jpsyx): add syncing
  google sheets from backend`. Google Sheets datasets never appear there and
  should not start to: with acquisition working, a missing local copy for a
  Sheet is not a user problem, it is a cache miss that resolves itself. Leave
  that query alone.
- **A per-chart refresh in a dashboard** is a bigger surface (per-relation
  invalidation across many charts) and belongs after spec 2 makes invalidation a
  first-class operation.

### 8.4 What refresh does, and why it does not wait for spec 2

Explicit refresh, in order:

1. Clears the debounce entry for that dataset.
2. `LocalDatasetClient.dropLocalDataset({ datasetId })`, which is an existing
   mutation.
3. Drops the DuckDB table, so the in-memory copy goes too.
4. Re-acquires immediately (export, `loadXlsx`, store), and shows the refreshed
   row count and column set.
5. Notifies success, or one of the section 9 errors.

**None of that touches spec 2's cache.** Once spec 2 lands, the same button will
instead invalidate the cache entry and let the normal miss path re-acquire,
which is strictly better and strictly later. Building it as a direct
drop-and-reacquire now means the demo does not block on another lane, and the
follow-up is deleting steps 2 and 3 in favour of one cache call.

---

## 9. Tokens, errors, and what the user sees

### 9.1 The Picker was cancelled

`GPickerResponseObject.action === Action.CANCEL`. **No error, no toast**: a
cancel is a decision, not a failure. The only requirement is that the calling
view clears whatever pending state it set before opening the Picker, so no
spinner is orphaned. Today `useGooglePicker`'s callback ignores every
non-`PICKED` action, which is nearly right; it needs to invoke an `onCancel` so
the view can reset. Test: open the Picker, dismiss it, and assert the import
view is back to its initial state with no notification shown.

### 9.2 Tokens

The existing flow is sound and this spec adds nothing to it:

- `google-auth/tokens` (`GoogleAuthRoutes.ts`) returns the user's tokens and
  refreshes anything within `TOKEN_REFRESH_THRESHOLD` of expiry, so a caller can
  assume the token it receives is valid. Acquisition calls it and uses
  `tokens[0]`, matching every other consumer in the repo.
- `tokens__google.scope` stores the space-separated granted scopes, so a support
  question ("does Avandar still have access?") is answerable from the database.
- If the refresh itself fails, Google has revoked the grant and the only remedy
  is re-consent through `google-auth/auth-url`. Surface that as a **reconnect**
  action, not a generic error.

### 9.3 Export and version errors

| Failure | What the user sees | Recovery |
|---|---|---|
| Drive API disabled on the project (403 `accessNotConfigured`) | *"Google Drive access is not configured for this deployment."* | None for the user. Section 3 item 1. Log loudly; this is a deployment error masquerading as a permission error |
| Export over the limit (403 `exportSizeLimitExceeded`) | *"This sheet is too large to import. Google can export at most 10 MB at a time."* | Split the sheet, or wait for the `values.get` paging follow-up (section 13) |
| No per-file grant (404, or 403 `insufficientFilePermissions`) | *"Avandar no longer has access to this Google Sheet."* with a **Reconnect sheet** action | Reopen the Picker for that dataset. Only possible because the grant is per-file and re-granting is one pick (section 5.1, property 2) |
| Token expired or revoked (401) | *"Your Google connection expired."* with a **Reconnect Google** action | The existing consent flow |
| Rate limited (429, or 403 `userRateLimitExceeded`) | *"Google is rate limiting this request. Retrying."* | One retry with backoff, then a plain error. Rare: Drive's pool is ~1,000,000 units/minute/project |
| The stored tab is gone (renamed or deleted; `read_xlsx` errors on an unknown sheet) | *"The tab 'Q3 data' is no longer in this spreadsheet."* with a **Choose a tab** action | Reselect from the tab list, which updates `sheet_name` |
| Network failure mid-export | The generic import error already in the view | Retry |

All of these use `notifyError({ title, message })` from
`@/utils/notifications/notify`, which is the pattern
`GoogleSheetsImportView.tsx` already follows.

**Note what leaves the risk register.** Proposal section 11 flags Sheets'
project-global 300 reads/minute as the dangerous quota, shared across every
tenant. Moving to Drive's pool is roughly three orders of magnitude more
headroom, which is why the per-service quota counter (spec 1's open item 4)
stops being urgent for this connector. It is still needed for spec 5's open data
APIs, which do rate-limit and do return 429.

---

## 10. Module layout

```text
src/clients/google/GoogleDriveClient/               new
  GoogleDriveClient.ts                              export + version, no state
  GoogleDriveClient.test.ts                         fetch mocked, error mapping

src/clients/qetl/wrappers/GoogleSheetsWrapper/      spec 1 creates the folder
  GoogleSheetsWrapper.ts                            acquire, describe, freshness
  googleSheetsFreshness.ts                          the debounce map
  GoogleSheetsWrapper.test.ts

src/views/DataManagerApp/
  DataImportView/GoogleSheetsImportView/            tab selector, xlsx path
  DatasetMetaView/DatasetMetaView.tsx                refresh action (8.3)

supabase/schemas/
  20.datasets__google_sheets.sql                    + sheet_name
  70.rpc_datasets__add_google_sheets_dataset.sql    + p_sheet_name
supabase/migrations/
  <timestamp>_add_sheet_name_to_google_sheets_datasets.sql   generated

supabase/functions/google-auth/getAuthURL.ts        drop auth/spreadsheets
```

Nothing lands in `shared/models/relations/`: this spec adds no type to the
capability contract, only a real implementation behind it.

---

## 11. What this spec needs from spec 2

Spec 2 owns the relation cache, the cache key, and the source version token.
This spec is its first non-trivial producer, so the interface between them is:

1. **The source version token for a Google Sheets relation is the Drive
   `File.version` string, verbatim.** Not hashed, not parsed to a number, not
   combined with a timestamp. Opaque and compared by equality.
2. **`readFreshness` is implemented here and called by spec 2.** This spec never
   consults a cache (spec 1's decision: wrappers do not know about caching), so
   until spec 2 lands its only callers are inside this wrapper: the debounced
   check in section 8.2, and the explicit refresh, which bypasses the debounce.
3. **Acquisition is whole-relation and column projection is ignorable.**
   `AcquireRequest.columns` may be `"all"` or a list; this wrapper returns every
   column either way, because `read_xlsx` reads the tab and a returned superset
   satisfies a subset (spec 1, section 4.2).
4. **Spec 2 should expect the token to change more often than the rows do**
   (section 8.1), so any metric it records for cache hit rate on Sheets will
   read slightly pessimistic.

If spec 2 lands first, nothing in this spec changes. If this spec lands first,
spec 2 gains a source with a real freshness token to test against instead of
only `freshnessSignal: "none"` sources.

---

## 12. Testing

The proposal's Phase 1 exit bar for this connector is precise: **import a Sheet
through the Picker on `drive.file` alone, reload, query it, get rows.** That is
a manual end-to-end check and it is the one that matters. The automated tests
around it:

| Area | Test |
|---|---|
| `GoogleDriveClient` | `fetch` mocked. Export sends the right `mimeType` and `Authorization` header and returns bytes. `readFileVersion` requests `fields=version` and returns the string. Each error code in section 9.3 maps to its named error type, asserted case by case |
| Scope declaration | `getAuthURL.ts` requests exactly `openid`, `email`, `auth/drive.file`. This is the assertion spec 1 already specifies against `GoogleSheetsWrapper.capabilities.grantedScope`; it now has to pass with the narrowed list |
| Tab column | `GoogleSheetsDatasetParsers` round-trips `sheet_name` present and `null`. The existing `ZodConsistencyTests` block covers the type side at compile time |
| Acquisition | `DuckDbClient.loadXlsx` is called with the stored `sheetName`, and with `undefined` when it is `null`. The returned `parquetBlob` is the `loadXlsx` result's `parquetData`, not a re-transcode |
| Executed, row-level | Using spec 1's node vitest project: a fixture `.xlsx` with two tabs, acquired with `sheet` set to the **second** tab, returns the second tab's rows. This is the test that would catch "we shipped a tab column and still read tab one", which is the most likely silent bug in this spec |
| Freshness debounce | Two acquisitions inside the window issue one version call; outside the window, two. Explicit refresh always issues one |
| Picker cancel | Dismissing the Picker leaves no spinner and shows no notification |
| Import path | The updated `GoogleSheetsImportView.test.tsx` asserts the xlsx metadata shape, and `useImportedColumns.test.ts:185` (today *"maps google_sheets DuckDB columns using the CSV load shape"*) is renamed and rewritten to the xlsx shape rather than deleted |

**Regression guard:** an existing `google_sheets` dataset with `sheet_name =
NULL` acquires the first tab and returns the same columns the import recorded.
Verify against a real workspace row, not a fixture, because the whole point of
section 6.3 is a claim about production data.

---

## 13. What this spec deliberately leaves open

Recorded so the next reader does not mistake silence for an answer.

1. **Sheets above 10 MB are not importable.** `files.export` refuses, and the
   fallback (Sheets `values.get` with paged A1 ranges, proposal section 11) is
   not built. The user sees a named error instead of a broken import. The
   fallback is also where `multiCallAtomicity: false` starts to bite, since
   paged reads of a live sheet can straddle an edit.
2. **`rows_to_skip` is not applied** for `google_sheets` or `xlsx_file`
   (section 7.3). One fix serves both, and it needs `read_xlsx`'s `range` syntax
   verified against the pinned DuckDB version.
3. **Only the first Google account is used.** Three `TODO(jpsyx)` markers
   already record this; acquisition adds a fourth caller of `tokens[0]` rather
   than fixing it.
4. **The debounce is per browser tab and not persisted.** Two open tabs each
   keep their own window. Harmless (the cost is one extra metadata call) and
   deliberately not solved in a way spec 2 might have to undo.
5. **`relations: "named-tabs"` is still not modelled as one-to-many.** One
   dataset row is one tab, so importing three tabs of one workbook creates three
   datasets that each re-export the same workbook. Correct, wasteful, and the
   fix (a workbook-level export cache keyed on file id plus version) is a
   follow-up.
6. **No write-back.** Reachable on `drive.file` without a new review, per
   proposal section 11. Recorded there and here so nobody re-requests
   `auth/spreadsheets` for it.
7. **The Sheets API is still used for the tab list.** `google-sheets/:id`
   calls `spreadsheets.get`, which accepts `drive.file` (proposal section 11),
   so this is not a scope problem. It is one remaining call on the small quota
   pool, once per import.

---

## 14. Risks

| Risk | Mitigation |
|---|---|
| **The Drive API is not enabled on the Cloud project**, and the 403 reads like a permission problem, so the demo dies debugging the wrong thing | Section 3 item 1, first line of this spec's prerequisites. The error mapping in section 9.3 names `accessNotConfigured` explicitly so the message points at the console, not the scope |
| **The Picker does not register a `drive.file` grant** because `setAppId` is missing, producing a 403 on export from a file the user just picked | Section 5.2 item 1. Verify by exporting immediately after a fresh pick, in a browser profile that has never authorized Avandar. This is the highest-likelihood demo-night failure |
| The import-form refactor (section 7.2) is larger than the clock allows | Section 15 sequences acquisition before the import change, so the demo works on today's import path even if the refactor is not finished |
| Column types differ between CSV-sniffed import metadata and `read_xlsx` acquisition, on datasets imported before this change | `_getColumnReplacements` casts each column to its stored `dataType`, so the stored schema wins. Section 12's regression guard checks a real row |
| Existing `google_sheets` rows resolve `NULL` to a different "first tab" than the old import did | Section 6.3. Rare, user-fixable in one action, and new rows never write `NULL` |
| `File.version` changes without the rows changing, so refreshes happen more often than needed | Accepted deliberately: a false positive costs one export, a false negative would serve wrong rows (section 8.1) |
| Dropping `auth/spreadsheets` breaks the tab-list route | It does not: the Sheets API accepts `drive.file` (proposal section 11, verified against Google's scope tables). Covered by the exit bar, which imports on `drive.file` alone |
| A 10 MB export sounds generous and is not, for a wide sheet | Named error, and the ceiling is declared as `maxBytesPerCall` in the capability record, so it is discoverable rather than folkloric |

---

## 15. Minimum demo path

The smallest ordered set of changes that gets a real Sheet imported and queried.
Everything outside this list is spec, not demo. Effort figures assume one
implementer who has read sections 5 to 9.

| # | Step | Effort | Notes |
|---|---|---|---|
| 0 | **User: enable the Google Drive API** on the project behind `GOOGLE_CLIENT_ID` | 2 min, **user only** | Hard blocker. Section 3 item 1. Nothing below works without it |
| 1 | Add `.setAppId(<project number>)` to the Picker builder in `useGooglePicker.ts`, from a new `VITE_GOOGLE_PICKER_APP_ID` | 15 min | Section 5.2. Do it first: it is cheap and it is the failure that looks like something else |
| 2 | `GoogleDriveClient` with `exportSpreadsheetToXlsx` and `readFileVersion` | 45 min | Section 5.4. Two `fetch` calls and the error mapping from section 9.3 |
| 3 | Schema: `sheet_name` on `20.datasets__google_sheets.sql`, `p_sheet_name` on the RPC, generate the migration, `pnpm db:gen-types` | 45 min | Section 6.1. Use the `supabase-declarative-schema` skill; review the generated diff for dropped RLS policies |
| 4 | Model layer: types, `DBReadSchema`, `createDatasetMutations`, client params | 30 min | Section 6.2. The Zod type test tells you when you are done |
| 5 | **Replace the throw** at `qetlFactLoading.ts:132` with export plus `DuckDbClient.loadXlsx` | 45 min | Section 7.1. **This is the step that makes a Sheet queryable** |
| 6 | Remove the `google_sheets` throw at `qetlDiceExtractors.ts:107` and add `_getGoogleSheetsExtractors` alongside the four that exist | 20 min | Copy `_getXlsxExtractors`; the `DiceExtractor` union member already exists |
| 7 | **Demo checkpoint: exit bar.** Import a Sheet on today's CSV import path, hard-reload, query it in the SQL surface, get rows | 10 min | If this passes, the demo is safe. Steps 8 to 11 improve it |
| 8 | Tab selector in `GoogleSheetsImportView` plus the xlsx import switch, and the typing changes in section 7.2 | 2 h | The largest step. Cut it first if the clock runs out; step 7 already passes without it, using the first tab |
| 9 | `Refresh from Google Sheets` in `DatasetMetaView`, doing drop-then-reacquire | 45 min | Sections 8.3, 8.4 |
| 10 | Debounced `readFileVersion` in the wrapper | 30 min | Section 8.2. Skippable for a demo; without it, refresh is the only freshness mechanism |
| 11 | Drop `auth/spreadsheets` from `getAuthURL.ts` **and** narrow `grantedScope` in the wrapper, in one commit | 10 min | Section 5.3. No console action. Do not split the commit or spec 1's scope test goes red |

**Demo-path total, steps 0 to 7: about three hours**, of which two minutes are
the user's and cannot be started by an agent.

**What the demo shows if only steps 0 to 7 land:** a Google Sheet imported
through the Picker on a Non-sensitive scope, surviving a reload, queried in SQL,
returning rows, with no `auth/spreadsheets` grant needed for the acquisition
itself. That is the proposal's Phase 1 exit bar for this connector, met exactly.
