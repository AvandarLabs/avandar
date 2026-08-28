# Data import views

This file contains rules for how to build source-specific import views.
This ensures that new sources copy an existing shape and keeps import views
symmetrical rather than each doing their own inventions.

## Which views this governs

A **sniffed import view** acquires bytes from somewhere, sniffs them into a
preview, and hands the result to
[`DatasetImportForm`](DatasetImportForm/DatasetImportForm.tsx) for the user to
name, adjust and save. `ManualUploadView` and `GoogleSheetsImportView` are
both of these, and any new connector will be too.

`OpenDataCatalogView` is deliberately not one. It adds an already-modeled
catalog entry to the workspace, so it never sniffs, never previews, and never
renders `DatasetImportForm`. Do not force it into the shape below, and do not
take it as the example to copy.

## The shape

Two parts, in this order, and nothing else in the view:

1. **A loader hook**, `useLoad<Source>`, in its own directory beside the view.
   It owns every piece of state the import has, runs the acquisition and the
   sniff, and returns them. The view holds no import state of its own.
2. **The view**, which renders the source picker, wires the picker's callbacks
   to the hook, and renders `DatasetImportForm` inline behind the gate. Do not
   wrap that form in a private sub-component: the gate has already narrowed
   the values it needs, so a wrapper only re-declares them as props and adds a
   hop between the gate and the form it guards.

The loader hook returns these, named the same way in every view:

| Field | What it is |
| --- | --- |
| the retained source | What a re-parse reads again: `uploadedFile` on the manual path, the picked file plus its chosen tab on the Sheets path |
| `previewRows` | The rows the sniff produced |
| `dataSourceMetadata` | What the form saves from |
| `setDataSourceMetadata` | Handed to the form's `onDataSourceMetadataChange` |
| `isLoading<Source>` | True while the sniff is in flight |
| `onRequestDataReparse` | Takes the form's `FileParseOptions`, re-runs the sniff against the retained source |

The two current implementations, side by side:

| | `ManualUploadView` | `GoogleSheetsImportView` |
| --- | --- | --- |
| Source picker | `FileUploadForm` | `useGooglePicker`, then a tab dropdown |
| Loader hook | `useManualUploadParse` over `useLoadManualUploadFile` | `useLoadGoogleSheet` |
| Retained source | `uploadedFile` | `pickedSheet` plus the chosen tab |
| Gate | `previewRows && uploadedFile && dataSourceMetadata` | `previewRows && dataSourceMetadata && pickedSheet` |

The manual path splits its hook in two because it branches over CSV, XLSX and
PDF; the Sheets path has one source format and one hook. Split only when a
view has that much to branch over.

## Rules

**Preview rows come from the sniff, never from a query.** The dataset table
named after `datasetId` is written by the background parquet transcoding, not
by the sniff, so during an import it does not exist yet. A view that reads
`DatasetQueryClient.useGetPreviewData` here gets nothing back, its gate never
opens, and the user sees a success notification over an empty panel. Carry the
rows on the load result and read them from there.

**Derive `previewRows` from the load result rather than keeping it in its own
state,** unless the source genuinely produces rows outside the metadata, as
the manual path's PDF branch does. Two pieces of state for one sniff can
disagree about whether a preview exists; one cannot.

**Keep local source bytes so a re-parse never re-reads them from disk.**
Choosing a different delimiter or page range must read the `File` already in
hand.

A remote source is the exception, and Sheets is one: a tab is its own download,
the sheet may have changed since the last one, and the alternative is holding a
whole workbook to serve one tab. Re-download there, and pay for it by never
downloading anything the user did not ask for.

**One dataset is one tab.** Ask which tab before downloading, not after. The
Sheets API's properties-only read (`getGoogleSheetTabs`) lists a workbook's tabs
without a single cell, so there is no excuse for fetching a workbook to find out
what is in it. A one-tab workbook has nothing to ask about and must not grow a
click.

**Prefer CSV to xlsx for a remote spreadsheet.** DuckDB's CSV reader types each
column from the data, and widens a column to text when its sniff sample sees a
value that does not fit. `read_xlsx` has to be told to read everything as text,
because its inference aborts the whole import on the first cell that does not
match. A tab downloaded as CSV therefore arrives with real types; the same tab
inside an exported workbook arrives as text.

**Pass values a mutation needs as parameters, not from state.** A mutation
created during the render before a pick closes over the state as it was then,
which reads as the previous source's value rather than as an obvious error.
`spreadsheetName` is threaded through `exportGoogleSheet` for exactly this
reason.

**A new dataset id per parse, and drop the old local dataset first.** Every
re-parse writes a new local dataset, so `datasetIdToDrop` is not optional
housekeeping.

**Do not mock the seam you are testing.** A unit test that stubs the hook's
data source proves only that the stub works. `GoogleSheetsImportView.test.tsx`
drives real workbook bytes through a real sniff for this reason, and the
`@third-party` e2e spec covers what no stub can.

## Adding a new import view

1. Copy `GoogleSheetsImportView` if the source is remote, `ManualUploadView`
   if it is local, and keep the field names above. A remote source that has
   sub-parts (tabs, sheets, tables) lists them first and imports one.
2. Add the `DataSourceMetadata` and `ParseOptions` members for the source in
   [`DatasetImportForm.types.ts`](DatasetImportForm/DatasetImportForm.types.ts)
   and [`useSaveDataset`](DatasetImportForm/useSaveDataset/useSaveDataset.ts).
3. Register the tab in [`DataImportTabs.tsx`](DataImportTabs.tsx).
4. Write the unit test against real bytes, and an e2e spec. Tag the spec
   `@third-party` only if it reaches a real external service, and read
   [`docs/rules/e2e-testing.md`](../../../../docs/rules/e2e-testing.md) first.
5. Update the side-by-side table above, so this file keeps describing every
   view rather than the two that were here first.
