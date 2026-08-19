# Implementation plan: PDF row shape chosen from detection

Spec: `docs/superpowers/specs/2026-08-19-pdf-output-mode-design.md`

Ordered so each step compiles and its tests pass before the next begins.

## 1. Export the union rule from `combineRegions`

`src/workers/pdfSniff/combineRegions/combineRegions.ts`

- Rename `_headerKey` to `getPrintedColumnKey` and export it.
- Add exported `getPopulatedTables(tables)` (more than a header row) and
  `canKeepPrintedColumns({ tables })`.
- Rewrite `shouldUnion` in terms of `canKeepPrintedColumns` so there is one
  implementation.
- Export `OBSERVATION_HEADER` so the control can describe that option.

Test: existing `combineRegions.test.ts` must pass untouched, plus a case
asserting `canKeepPrintedColumns` is false for two tables with different
headers and true for the same table twice.

## 2. `resolveOutputMode`

New `src/workers/pdfSniff/resolveOutputMode/resolveOutputMode.ts` plus test.
Pure; signature and rules exactly as the spec lists.

Tests: chart defaults to observations; one grid table defaults to natural; the
same table over three pages defaults to natural; grid table plus chart forces
observations with `keepBlockedBy: "mixed_columns"`; no rows gives
`"no_rows"`; an explicit `chosenMode` wins when keep is available and is
ignored when it is not.

## 3. `graphicKind` on the classification

`src/workers/pdfSniff/classifyRegion/classifyRegion.ts`

- Add `graphicKind?: GraphicType` to `RegionClassification`.
- Populate it from the `detectGraphicType` result already computed in the
  graphic branch.

Test: a region with a plot frame and a series mark reports
`graphicKind: "line_area_chart"`.

## 4. Worker resolves before combining

`src/workers/pdfSniff.worker/pdfSniff.worker.ts`

- Build `shapesByRegionId` from `resolvedShapes`.
- Call `resolveOutputMode({ tables, shapesByRegionId, chosenMode: request.outputMode })`
  and pass `.mode` to `combineRegions`.

No behaviour change when the request carries a mode; a request without one now
gets the detected default.

## 5. Carry the resolved mode out of the load

`src/views/DataManagerApp/DataImportView/ManualUploadView/useLoadManualUploadFile/useLoadManualUploadFile.ts`

- `PdfFileLoadResult` gains `outputMode: PdfOutputMode | undefined`.
- The extracted branch sets it from `extracted.combined.outputMode`; the
  `needs_selection` branch leaves it undefined.
- `_toDataSourceMetadata` uses `pdfLoadResult.outputMode` instead of
  `pdfRequest?.outputMode ?? "natural"`, and carries
  `isOutputModeUserChosen` through from the request.
- The `pdf_file` load branch passes `outputMode` to `extractPdfRegions` only
  when `isOutputModeUserChosen` is set.

Tests: update the two existing `outputMode: "natural"` expectations; add one
asserting a chart region seeds `observations`, and one asserting a
non-user-chosen mode is not forwarded to the worker.

## 6. Thread the flag through the types

- `src/views/DataManagerApp/DataImportForm/.../useSaveDataset.ts` parse-options
  type and `src/clients/datasets/pdfSniff.ts`: add optional
  `isOutputModeUserChosen`. Save keeps writing `outputMode` only.
- Confirm `createDatasetMutations.ts`'s `?? "natural"` is now only a
  belt-and-braces fallback for a payload that never omits the mode; leave it.

## 7. The control

`src/views/DataManagerApp/DataImportView/DatasetImportForm/PdfParseControls/PdfParseControls.tsx`

- Replace the `SegmentedControl` with a `Radio.Group`.
- Derive everything from `resolveOutputMode` over
  `loadResult.tables` + `metadata.parseOptions.regions`, and the shape labels
  from the distinct populated shapes plus `classifications[].graphicKind`.
- Option descriptions from `keepColumns` and `OBSERVATION_HEADER`.
- Keep option disabled when `!isKeepAvailable`, with the reason and the
  recovery hint below the group.
- `onChange` sets `isOutputModeUserChosen: true` alongside the mode and
  re-parses through the existing `onRequestDataReparse` path.
- Extract the label and reason derivation into a sibling
  `getOutputModeCopy/getOutputModeCopy.ts` taking `i18n`, so the component
  stays readable and the copy is unit-testable.

Tests: update the existing radio-name assertion; add one per shape label pair;
one for the locked case; one asserting the flag is set on change.

## 8. Finish

- `npm run i18n:extract && npm run i18n:compile`.
- `npx vitest run` over the touched trees, `npx tsc --noEmit`, eslint, prettier.
- Commit on `develop`.
