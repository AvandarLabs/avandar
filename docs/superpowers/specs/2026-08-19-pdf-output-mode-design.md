# PDF import: a row shape chosen from what was detected

Date: 2026-08-19
Status: approved

## The problem

Drawing a box over a line chart and being offered "Keep the printed table"
describes something that does not exist. A chart has no printed table. The
control is wrong in three separate ways:

1. **The default is fixed.** `outputMode` defaults to `"natural"` in four
   places (`useLoadManualUploadFile`, `useSaveDataset`,
   `createDatasetMutations`, and the control itself) regardless of what the
   regions were detected as.
2. **The labels claim something false.** Only `extractGridTable` reads columns
   off the page. The other three extractors synthesise a schema:
   `extractLabelledGraphic` emits `label, value`; `extractRepeatingBlocks`
   emits `number, heading, ...fields`; `extractProseMeasures` emits
   `subject, metric, value, unit, source_text`. "Keep the printed columns" is
   a truthful description of exactly one of the four.
3. **The choice is sometimes a no-op.** `combineRegions` unions only when every
   populated table shares one header key. Otherwise it falls through to the
   14-column observation schema whatever the control says, silently.

The meaning of the two modes is also not constant. For a grid table it is a
wide-to-long reshape. For a chart the rows are already one per reading, so the
only change is the added unit, page and document columns. One fixed pair of
labels cannot be honest about both.

## Decisions

- **Detection-driven labels.** The two options are named from what was
  detected, and their descriptions are read from the actual extracted header
  row rather than hardcoded, so they cannot drift from the data.
- **Locked, not hidden, when "keep" is unavailable.** The control stays
  visible, the keep option is disabled, and the reason is stated along with how
  to get the choice back. This is the only behaviour that never lies.
- **Default: keep only for real tables.** Keep the printed columns by default
  only when every region that produced rows was read as `grid_table` and all of
  them share one header key. Everything else defaults to one row per number.
  Rationale: `grid_table` is the only shape whose columns are real, and it is
  the only shape `classifyRegion` ever returns at `high` confidence. Existing
  table imports are unaffected.
- **A user's choice survives re-parse**, mirroring `isShapeUserChosen`.

## Architecture

### One rule, one implementation

`combineRegions` owns the union rule today in a private `_headerKey`. Anything
that needs to know whether "keep" is available must not reimplement it, for the
reason already recorded in `PdfParseControls`: a second implementation of the
union rule drifts from the first. So:

- `combineRegions.ts` exports `getPrintedColumnKey(table)` (the former
  `_headerKey`) and `canKeepPrintedColumns({ tables })`, and uses the latter for
  its own `shouldUnion`.

### The resolver

New pure module `src/workers/pdfSniff/resolveOutputMode/resolveOutputMode.ts`:

```ts
resolveOutputMode({ tables, shapesByRegionId, chosenMode }) => {
  mode: PdfOutputMode,                    // what combineRegions is given
  isKeepAvailable: boolean,
  keepBlockedBy: "no_rows" | "mixed_columns" | undefined,
  populatedShapes: readonly PdfRegionShape[],  // distinct, in region order
  keepColumns: readonly string[],         // the header row keep would produce
}
```

Rules, in order:

1. `populated` = tables with more than a header row.
2. `isKeepAvailable` = `canKeepPrintedColumns({ tables })`.
3. Not available: `mode = "observations"`, and `keepBlockedBy` is `"no_rows"`
   when nothing produced rows, `"mixed_columns"` otherwise.
4. Available and `chosenMode` given: `mode = chosenMode`.
5. Available, no choice: `mode` is `"natural"` when every populated region's
   shape is `grid_table`, else `"observations"`.

Both the worker and the control call this, so the mode the dataset is built
with and the mode the control displays cannot disagree.

### Detection reaches the copy

`RegionClassification` gains `graphicKind?: GraphicType`, set from the
`detectGraphicType` call `classifyRegion` already makes in its graphic branch.
Classifications are recomputed per extraction and are not persisted, so this
needs no migration. It is what lets the control say "a line or area chart"
rather than "a graphic".

### Data flow

- The worker resolves the mode before calling `combineRegions`, passing
  `request.outputMode` as `chosenMode`. A request carrying no mode therefore
  gets the detected default.
- `PdfFileLoadResult` gains `outputMode`, taken from `combined.outputMode`,
  which is the mode the extraction actually used.
- `_toDataSourceMetadata` seeds `parseOptions.outputMode` from the load result
  rather than defaulting to `"natural"`, for the same reason it already takes
  `regions` from the load result: it is what the extraction really did.
- `parseOptions` gains `isOutputModeUserChosen`. `useLoadManualUploadFile`
  passes `outputMode` to the worker only when that flag is set; otherwise it
  passes `undefined` so detection re-decides. Without the flag, the resolved
  mode from the previous extraction would come back as a "choice" and the
  default could never change after a region was added.
- The flag is not persisted. A saved dataset's stored `outputMode` is itself the
  record of the decision.

### The control

`Radio.Group` with two options replaces the `SegmentedControl`: the accepted
design needs a per-option description and a per-option disabled state, and
`SegmentedControl` supports neither.

Group label, from the single distinct populated shape, or the region count when
they differ:

| Detected           | Group label                    | Keep option                    | Normalise option             |
| ------------------ | ------------------------------ | ------------------------------ | ---------------------------- |
| `grid_table`       | Rows from this table           | Keep the table's columns       | One row per number           |
| `labelled_graphic` | Rows from this chart / graphic | Readings only                  | Readings with source columns |
| `repeating_blocks` | Rows from these blocks         | Keep the block fields          | One row per number           |
| `prose_measures`   | Rows from this text            | Keep the measurements as found | One row per number           |
| mixed or none      | Rows from these N regions      | Keep the printed columns       | One row per number           |

"chart" is used when `graphicKind` is a known chart kind, "graphic" otherwise.
Each option's description lists the columns it produces: the keep option from
`keepColumns`, the normalise option from the observation header.

Below the group: the reason when locked, naming the disagreeing regions and how
to recover the choice, and otherwise a line saying the shape was chosen from
what was detected.

## Testing

- `resolveOutputMode`: one case per rule, including a chart defaulting to
  observations, a single table defaulting to natural, a table spanning pages
  defaulting to natural, mixed columns forcing observations, and a user choice
  beating detection.
- `combineRegions`: `canKeepPrintedColumns` agrees with `shouldUnion` on the
  existing fixtures.
- `classifyRegion`: a chart region reports its `graphicKind`.
- `PdfParseControls`: labels follow the detected shape; the keep option is
  disabled with a reason when columns disagree; toggling sets
  `isOutputModeUserChosen` and re-parses.
- `useLoadManualUploadFile`: a chart region seeds `parseOptions.outputMode` as
  `observations`; a user-chosen mode is forwarded to the worker and a
  detected one is not.

## Out of scope

- Per-region output modes. The saved dataset is one table with one schema, so
  two regions choosing differently would still need reconciling.
- Making the observation schema the universal default. That is a deliberate
  product direction, not a side effect of this fix.
