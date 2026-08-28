# Data import views

One tab per data source, all rendered by
[`DataImportTabs.tsx`](DataImportTabs.tsx). This file is the rule for how a
source-specific import view is built, so a reader who knows one of them knows
all of them, and so a new source is a copy of an existing shape rather than a
new invention.

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

Three parts, in this order, and nothing else in the view:

1. **A loader hook**, `useLoad<Source>`, in its own directory beside the view.
   It owns every piece of state the import has, runs the acquisition and the
   sniff, and returns them. The view holds no import state of its own.
2. **The view**, which renders the source picker, wires the picker's callbacks
   to the hook, and gates the form on the hook's values.
3. **A private `_<Source>ImportForm` component** in the view file, which
   renders `DatasetImportForm` from already-narrowed props. The gate does the
   narrowing, so this component never repeats it.

The loader hook returns these, named the same way in every view:

| Field | What it is |
| --- | --- |
| the retained source | The bytes or handle a re-parse reads again: `uploadedFile` on the manual path, `exportedWorkbook` on the Sheets path |
| `previewRows` | The rows the sniff produced |
| `dataSourceMetadata` | What the form saves from |
| `setDataSourceMetadata` | Handed to the form's `onDataSourceMetadataChange` |
| `isLoading<Source>` | True while the sniff is in flight |
| `onRequestDataReparse` | Takes the form's `FileParseOptions`, re-runs the sniff against the retained source |

The two current implementations, side by side:

| | `ManualUploadView` | `GoogleSheetsImportView` |
| --- | --- | --- |
| Source picker | `FileUploadForm` | `useGooglePicker` |
| Loader hook | `useManualUploadParse` over `useLoadManualUploadFile` | `useLoadGoogleSheet` |
| Retained source | `uploadedFile` | `exportedWorkbook` |
| Gate | `previewRows && uploadedFile && dataSourceMetadata` | `previewRows && dataSourceMetadata && exportedWorkbook` |

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

**Keep the source bytes so a re-parse never re-acquires them.** Choosing a
different tab, delimiter or page range must read what is already in hand. A
re-parse that goes back to the network is a bug even when it works, because it
can fail for reasons the first read already ruled out.

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
   if it is local, and keep the field names above.
2. Add the `DataSourceMetadata` and `ParseOptions` members for the source in
   [`DatasetImportForm.types.ts`](DatasetImportForm/DatasetImportForm.types.ts)
   and [`useSaveDataset`](DatasetImportForm/useSaveDataset/useSaveDataset.ts).
3. Register the tab in [`DataImportTabs.tsx`](DataImportTabs.tsx).
4. Write the unit test against real bytes, and an e2e spec. Tag the spec
   `@third-party` only if it reaches a real external service, and read
   [`docs/rules/e2e-testing.md`](../../../../docs/rules/e2e-testing.md) first.
5. Update the side-by-side table above, so this file keeps describing every
   view rather than the two that were here first.
