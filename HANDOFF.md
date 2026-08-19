# PDF Geometry: Reading Charts, Maps and Graphics From Vector Data

**Branch:** `feat/pdf-geometry`, based on `develop` at `d062dbc24` (the commit
that merged `feat/pdf-import`).
**Written:** 2026-08-19.

**Status:** phases 0, 1 and 2 are implemented and merged to `develop`. Phase 3
is implemented on the branch. See section 10 for what each phase turned out to
mean; the phase headings there carry the outcome. Sections 1 to 9 are the
original plan and have not been rewritten, so where the plan and the code
differ, the code is right and section 10 says why.

> **You have roughly 4 hours to a demo.** Section 10 is the time-boxed plan.
> Read sections 1 to 4 first (they are short and they change what you build),
> then go straight to section 10. Sections 5 to 9 are the reference material
> you will need while implementing.

---

## 1. The one-sentence version

We already have every number in these charts sitting in the PDF as exact vector
coordinates, and we throw it away in a single function before any extractor can
see it. Fixing that turns "chart reading" from guesswork into arithmetic.

---

## 2. What is broken, concretely

Test document: `public/test-data/pdf/gate/ocha-sudan-cholera-update-2025-07-03.pdf`
(the gate fixture, already committed). This is the same document as
`Sudan_Cholera_Operational_Update_3 July 2025 (3).pdf`.

Observed by hand on the **page 1 "Cholera cases trend"** area chart:

- the chart **title** is read as a value
- the **month names** (January to June) are read as values
- **"February" is missed entirely**
- the **x-axis week numbers** (1 to 26, the epi weeks) are never recognised as
  labels
- **no cholera counts are extracted at all**, because none are printed

The **page 3 "Funding by pillar"** bar chart works, but only by luck: it prints
`3M`, `2M`, `1M` next to each bar, so proximity pairing has real text to pair.
Take those labels away and it fails exactly like the trend chart.

That is the general case we need to solve: **the value is encoded in the
geometry, not in the text.**

---

## 3. Root cause: the retention funnel

`src/workers/pdfSniff/extractPageGeometry/extractPageGeometry.ts`

Every vector path in the page passes through `_pushIfAxisAligned` (line 144),
which keeps a segment **only** if it is near axis-aligned and long enough:

```ts
const MAX_RULE_THICKNESS = 3;   // line 11
const MIN_RULE_LENGTH = 8;      // line 14

if (dy <= MAX_RULE_THICKNESS && dx >= MIN_RULE_LENGTH) → horizontal rule
if (dx <= MAX_RULE_THICKNESS && dy >= MIN_RULE_LENGTH) → vertical rule
// everything else is silently dropped
```

Survivors are flattened to `RuleSegment` (`pdfSniff.types.ts:45`):

```ts
{
  (orientation, position, span);
} // no colour, no fill/stroke, no path grouping
```

Consequences:

| Chart element                           | Fate today                                                    |
| --------------------------------------- | ------------------------------------------------------------- |
| Line/area polyline (sloped)             | dropped, every segment is diagonal                            |
| Area fill (closed path)                 | dropped                                                       |
| Data point markers (circles, `curveTo`) | dropped                                                       |
| Bar rectangles                          | edges may survive as 4 unrelated segments; no rect, no colour |
| Bars shorter than 8pt                   | dropped entirely                                              |
| Gridlines and axes                      | kept (this is all we have)                                    |

So for the trend chart the extractor genuinely receives **no data marks at
all**, only text. That is why it grabs the title and the months: text is
literally the only thing it can see.

**This is a retention problem, not an inference problem.** The information is
in the content stream. We discard it 100 lines before anyone could use it.

---

## 4. Facts already verified (do not re-litigate these)

Measured on the gate document. These are why the plan is worth doing:

1. **Page 1's chart is vector, not raster.** The page contains exactly one
   image (1080x272 JPEG), which is the hero photo at the top. The chart is
   drawn with path operators.
2. **The axis labels are real text.** `pdftotext` yields
   `10,000 | 8,000 | 6,000 | 4,000 | 2,000 | 0`, plus `Week`, `1..26`, and the
   month names. Six labelled y-ticks, when calibration needs two. You can fit
   on two and **verify against the other four**.
3. **"February" is in the text layer.** So that bug is ours, in association,
   not a missing-data problem. The stream interleaves as
   `1|2|3|January|4|5|6|7|8|February|9...`, month labels arriving after their
   weeks, which is what confuses line grouping.
4. **`classifyRegion` is text-only.** It consults `region.rules` solely for the
   `grid_table` test; every other branch looks at word counts and numeric
   density. It has never seen a mark. This is why a choropleth, a KPI tile row,
   a bar chart and a line chart all collapse into `labelled_graphic`.

---

## 5. The algorithm

One shared spine, plus a small per-type mark reader. The spine is the expensive
part and it is written once.

### Step 0. Retain the geometry (the enabling change)

Add a `marks` channel to `PageGeometry` beside `rules`. Do **not** remove or
change `rules`: the grid-table path and the gate depend on it.

```ts
export type PathMark = {
  kind: "polyline" | "closed";
  /** Ordered points in PDF user space, y already normalised like TextItem. */
  points: readonly { x: number; y: number }[];
  bbox: BBox;
  isFilled: boolean;
  /** sRGB 0-255, from the active fill colour at paint time. Null if unknown. */
  fill: readonly [number, number, number] | null;
};
```

Implementation notes:

- Build marks in the same `constructPath` loop that already exists. You are
  currently discarding `currentX/currentY` transitions that are not
  axis-aligned; collect them into a subpath instead.
- `curveTo` / `quadraticCurveTo`: flatten to a few sample points, or just take
  the endpoints. For marker circles the **bbox centre is what you want**, and
  endpoints alone give you that.
- Fill colour needs tracking `OPS.setFillRGBColor` (and `setFillGray`) as you
  walk the operator list, holding the current value. Colour is only needed for
  legend matching (Tier 3), so **skip it if time is short** and set `fill:
null`.
- Cap the number of marks per page (a few thousand) so a pathological vector
  map cannot blow up memory. Record that you truncated.

### Step 1. Find the plot frame

From the existing `rules`, with no new data:

- the **axes** are the longest horizontal and longest vertical rule whose ends
  meet near a common corner (within a few points)
- the **gridlines** are the family of parallel rules of near-equal length and
  near-even spacing

Output a `PlotFrame { left, right, top, bottom, gridlines: number[] }`.

If no frame is found, bail out to today's behaviour. That keeps everything
additive.

### Step 2. Calibrate the axes (exact, not estimated)

Take numeric text items immediately outside the frame (left of `left` for y,
below `bottom` for x). Pair each parsed number with its baseline coordinate and
fit:

```
value = a * position + b
```

Least squares over all available ticks. Then **verify by back-projection**: the
fit must place every gridline on its own tick value. Report the max residual.

- If residuals are large but structured, retry against `log(value)` and prefer
  whichever fits.
- If fewer than two numeric ticks parse, calibration **fails**. Say so; do not
  guess. This is where the manual two-point hint (section 8) takes over.

This step is the heart of the whole thing. Once `a` and `b` are known, reading a
value is arithmetic with sub-pixel error, typically well under 1% of a tick
interval.

### Step 3. Partition text by position relative to the frame

This alone fixes three of the four observed failures and **needs no marks**.

| Where the text sits                            | Role                         |
| ---------------------------------------------- | ---------------------------- |
| inside the frame                               | data label                   |
| left of frame, numeric, right-aligned          | y tick label                 |
| below frame, evenly spaced                     | x tick label (the epi weeks) |
| below the x tick row, spanning several of them | x group label (the months)   |
| above the frame, larger font                   | title                        |
| below everything, small font                   | source note / footnote       |

Title-as-value, months-as-values and week-numbers-not-recognised are all one
missing concept: the frame. Feed only "data label" text to the existing
proximity pairing, and drop the rest into metadata.

The "missed February" bug likely also dies here, because month labels stop
competing with week labels for the same row. If it survives, look at
`groupLines`' 3pt baseline tolerance fusing the two x rows.

### Step 4. Read the marks (the only type-specific part)

| Type         | Marks to find                                        | Value                                |
| ------------ | ---------------------------------------------------- | ------------------------------------ |
| Bar / column | congruent filled rects sharing one baseline          | calibrate(free edge)                 |
| Line / area  | **marker centres preferred**, else polyline vertices | calibrate(y)                         |
| Scatter      | congruent small marks, no shared baseline            | calibrate both axes                  |
| Pie / donut  | arcs closing a ring                                  | sweep angle; self-calibrating at 360 |
| Heatmap      | grid of rects with varying fill                      | fill colour vs legend ramp           |
| Choropleth   | irregular polygons, small fill palette               | fill colour vs legend ramp           |

Two traps worth stating:

- For an **area chart**, the fill path includes the baseline return along the
  x-axis. Do not treat those vertices as data. Prefer the markers; if you must
  use the polyline, isolate the top boundary.
- **Pie/donut and maps have no Cartesian axis**, so step 2 does not apply. Their
  calibration source is different: 360 degrees for pie, and the **legend** for
  maps and heatmaps. On page 1 the map legend is already text
  (`10 - 500 | 1,000 - 5,000 | 6,000 - 10,000 | 11,000 - 13,000 | > 22,000`)
  above a colour ramp, so it is a colour-to-bucket lookup table.

### Step 5. Flag by back-projection error

Reuse the existing `PdfCellFlag` machinery. Flag any extracted point whose value
does not reproduce its own geometry within tolerance, and any chart where
calibration residuals were high. Keep the house rule: **flag, never silently
drop, and never silently guess.**

---

## 6. Detecting the visualization type

Possible algorithmically, and better than a dropdown, but **only once marks are
retained**. Discriminators, all deterministic:

- perpendicular long rules meeting at a corner + evenly spaced parallel
  gridlines → Cartesian chart
- many congruent rects on a shared baseline → bar (orientation says bar vs
  column)
- one long polyline, many vertices, optional closed fill beneath → line / area
- congruent small marks scattered in 2D, no shared baseline → scatter
- arcs closing a ring, no frame → pie / donut
- many irregular closed polygons, small fill palette, legend present →
  choropleth
- no marks at all, numbers plus short captions → KPI tiles

Confidence should come from how many features agree. Keep populating the
existing `evidence: string[]`, which is already the right UI surface: it tells
the user _why_ we guessed, so overriding it is an informed act.

**The dropdown is a confirmation with override, not the primary input.**

---

## 7. Shape taxonomy: maps are not currently a thing

Today `extractLabelledGraphic`'s own docstring says it "Reads a map, chart or
KPI tile whose values are text at coordinates". One code path for all three,
built on `assembleQuantities` then `pairByProximity` (nearest label wins, with a
0.8 ambiguity ratio flagging near-ties).

That is correct for KPI tiles, tolerable for the choropleth (state numbers
really are printed beside state names), and wrong for every chart without data
labels.

Proposed taxonomy. `PdfRegionShape` currently lives at
`shared/models/datasets/PdfFileDataset/PdfFileDataset.types.ts:41`:

```
keep:  grid_table · repeating_blocks · prose_measures
split: labelled_graphic  →  kpi_tiles
                         +  cartesian_chart  (subtype: bar|column|line|area|scatter)
                         +  part_of_whole    (pie|donut)
                         +  thematic_map     (choropleth)
```

Making `thematic_map` first-class also fixes a **known open divergence**: the
handoff for pdf-import records `NORTH KORDOFAN Khartoum` as a fused label and
says the real fix is "for association to distinguish a point annotation from an
area label". A map-aware reader has exactly that: a capital-city marker is a
small distinct glyph, a state label sits near a polygon centroid. Geometry
separates them; text proximity cannot.

**Adding enum values is a database change.** `PdfRegionShape` is persisted.
Adding values means a migration, and per the repo's rules enum **value
additions must be hand-written** (`db diff` renames and drops the type, which
fails on dependent function signatures). See
`supabase/migrations/20260819000000_add_pdf_file_source_type_enum_value.sql`
for the pattern. **For the demo, avoid this entirely**: keep the existing enum
and carry the finer type in the region's JSON payload. Do the enum split later.

---

## 8. User hints, ranked by payoff

1. **Two-point manual calibration.** "Click two points on the axis, type their
   values." Highest value per unit of effort. It makes _any_ chart readable,
   removes the whole failure class where tick detection fails, and it is the
   **only mechanism that works identically for vector and raster**, because the
   user clicks the rendered page rather than the geometry. This is the
   insurance policy for the entire feature.
2. **Axis role confirmation.** Let the user drag a box over the y tick labels
   and the x tick labels. Converts step 3 from inference into fact.
3. **Chart type dropdown.** Selects the mark reader. Pre-fill from detection.
4. **Scale type (linear/log) and "baseline is zero".** Tiny, and removes the
   main systematic-error class.
5. **Series count, stacked vs grouped.** Only matters for multi-series.

---

## 9. UI changes

Files: `src/views/DataManagerApp/DataImportView/ManualUploadView/PdfTablePicker/`
(`PdfRegionCard.tsx`, `PdfRegionPicker/`, `PdfPagePreview.tsx`,
`PdfRegionOverlay/`) and
`src/views/DataManagerApp/DataImportView/DatasetImportForm/PdfParseControls/`.

**On the region card (`PdfRegionCard.tsx`)**

- Show the detected type with its `evidence` line (already the pattern), plus a
  **"Read as" dropdown** to override.
- When a Cartesian chart is detected, show a **calibration strip**: "y axis:
  0 to 10,000, linear, fits 6 ticks (max error 0.3pt)". This is the trust
  signal, and it is what makes the demo persuasive.
- When calibration fails, show **"Calibrate manually"** rather than an error.

**Calibration overlay (new, on `PdfPagePreview` / `PdfRegionOverlay`)**

- Two-click flow: click a point on the axis, type its value, repeat. Draw the
  two reference points and the implied scale.
- **Reuse `PdfRegionOverlay`'s coordinate mapping.** Do not write new pointer
  maths. There is a documented trap here: Mantine's `--mantine-scale` is 0.9 for
  viewports 1200-1408px and 0.8 for 768-1200px, so a canvas whose bitmap is
  420px wide renders at 378 CSS px. The overlay already measures its own
  rendered size against the page height it is given. Naive division by the
  bitmap scale silently decodes every click to the wrong coordinates, and jsdom
  cannot catch it because `getBoundingClientRect()` returns zeros.

**Output mode (small, high value, already plumbed)**

`outputMode` ("natural" | "observations") is threaded end to end (parse options
→ worker → `combineRegions` → the `datasets__pdf_file.output_mode` column) but
**no UI ever sets it**. The only assignment is
`useLoadManualUploadFile.ts:217`, `outputMode: pdfRequest?.outputMode ?? "natural"`.

The observations schema only appears today when two regions disagree, because of
`combineRegions.ts:144`:

```ts
const shouldUnion =
  params.outputMode !== "observations" && headerKeys.size === 1;
```

One region always has one header key, so it always unions to "natural". Adding a
toggle is a genuinely small change and gives the demo a nice "one region, rich
schema" moment. Caveat: `doc_org` in observations output reads the PDF `Author`
field, which is unreliable (a person's name in one gate doc, null in the other).

---

## 10. The 4-hour plan

Be honest with yourself: the full section 5 pipeline is **not** a 4-hour job.
This ordering front-loads visible wins and keeps a working demo at every stop.

### Phase 0 (about 45 min): plot frame + text roles. No new geometry.

Highest ratio of visible improvement to risk. Uses only existing `rules`.

- implement `findPlotFrame(region)` from existing rules
- implement `partitionTextByFrame(region, frame)` (section 5 step 3)
- feed only "data label" text into the existing `extractLabelledGraphic` path

**Demo value:** the trend chart stops reporting the title and months as values,
and the week numbers become labels. Visible, immediate, and low risk.

### Phase 1 (about 75 min): marks + calibration + line/area reader.

This is the money shot: real weekly case counts from a chart that prints none.

- add the `marks` channel (section 5 step 0), `fill: null` is fine for now
- implement `calibrateAxis` with back-projection verification
- implement a `cartesian_chart` reader for line/area using marker centres
- output one row per week with `week`, `value`, and a confidence flag

**Demo value:** 26 rows of real data extracted from an unlabelled chart, with a
stated error bound.

### Phase 2 (about 45 min): manual two-point calibration.

The robustness story, and your safety net if Phase 1's tick detection is flaky
on the demo document.

- overlay flow + "Calibrate manually" affordance
- feed the manual `a`/`b` into the same reader

**Demo value:** "and when it cannot work it out, you tell it two numbers and it
still works." Also covers raster charts.

### Phase 3 (DONE): type detection + dropdown, bar reader.

- `detectGraphicType` runs the section 6 discriminators and its sentence is
  appended to `classifyRegion`'s `evidence`. It names only `bar_chart`,
  `column_chart` and `line_area_chart`, and says `unknown` for everything
  else. The choropleth and the KPI tiles are both `unknown`, deliberately: the
  section 6 choropleth discriminator is not implementable on the gate document
  because **the map's state shapes never reach us as polygons at all**. Page 1
  yields 122 marks in total, the map region holding one background rect, 18
  copies of the same full-map clip box, and the capital-city markers. This is
  the section 15 case, and it is the one measurement in this document that
  contradicts the vector assumption. A KPI-tile discriminator was tried and
  backed out: separating one tile row from one map needed an area threshold
  tuned to exactly two data points, and a type nothing acts on is a claim not
  worth making.
- `findBarFamily` finds congruent filled rectangles growing from one shared
  edge, one per row, not all the same length. `readBarChart` reads them.
- **The bar reader does not calibrate against an axis on this document,
  because the funding chart has none.** It has no plot frame at all: five bars
  at a shared left edge of 357.5, lengths 48.7 / 48.7 / 48.7 / 97.3 / 146.0,
  and the only numbers anywhere are the `3M` / `2M` / `1M` printed on the bars
  themselves. So the value scale is fitted through those, and the framed path
  (`findPlotFrame` plus the numeric ticks on the value side) is covered by a
  synthetic test rather than a document. Order of preference is the user's two
  points, then the document's axis, then the printed figures.
- **A printed figure is reported as printed.** The calibration checks it
  rather than replacing it, and only a bar with no figure beside it is read
  off the scale. The fit through the funding chart's five bars is out by
  0.0004 pt, which is the demo's trust signal: the document's own numbers and
  its own geometry agree to a thousandth of a point.
- A per-row disagreement is only flagged when the scale came from somewhere
  other than those same figures. Fitted through the bar labels, least squares
  spreads one wrong label across every row, so that case is one region-level
  flag instead.
- This changed the funding-bars gate test. **Not one value moved**: all six
  are still the hand-read figures. What went away is five
  `ambiguous_association` flags, because reading the bars removes the distance
  contest that produced them. The test now also pins the residual and the
  `Others` row, which is printed as `0` and drawn as nothing.
- The `outputMode` toggle from section 9 is on `PdfParseControls`, and goes
  through the ordinary re-parse rather than reshaping rows on the main thread.

### Still not done

Everything in "Explicitly NOT in the 4 hours" below, plus: the framed bar
chart path has no real document behind it, and `readCartesianChart` still
hard-codes a `week` column header, which is right for the gate document and
wrong for the next one.

### Explicitly NOT in the 4 hours

Maps as a first-class shape, the enum split and its migration, pie/donut, colour
legend matching, heatmaps, multi-series, log axes, OCR. Say so out loud in the
demo rather than letting them be discovered.

---

## 11. Do not break the gate

`src/workers/pdfSniff/gateDocuments.test.ts` is the **merge gate**, 17 tests. It
must stay green. Run it constantly:

```bash
pnpm vitest run src/workers/pdfSniff/gateDocuments.test.ts
```

**There is a landmine.** Line 521:

```ts
it("does NOT extract the weekly trend chart", async () => {
```

with the comment "Shape 4 is deferred. Asserting its absence keeps that a
decision rather than something that quietly half-works ... any weekly figure
here would be an interpolated guess at a bar's height."

That test **will fail the moment Phase 1 works**, and that is correct. It is the
test whose belief this branch overturns. Interpolation against a verified
calibration is not a guess; it is arithmetic with a measurable residual.
**Update that test to assert the extracted values, do not delete it.**

Two gifts already in that file:

- `OCHA_TREND: BBox = [30, 55, 570, 215]` (line 199), the trend chart region,
  ready to use
- `OCHA_BARS: BBox = [300, 300, 570, 440]` (line 196), the funding bars

The other 16 tests cover the choropleth, the funding bars, the KPI tiles, the
pillars and the IMC prose. If any of those move, you have changed behaviour you
did not intend. Everything in this plan should be **additive**: when no plot
frame is found, fall through to today's code path exactly.

---

## 12. Verification

```bash
pnpm vitest run src/workers/pdfSniff/          # unit tests for the new code
pnpm vitest run src/workers/pdfSniff/gateDocuments.test.ts   # THE GATE
pnpm exec tsc -b --noEmit
pnpm exec eslint .
```

The gate fixtures are committed except the IMC PDF, which is gitignored. If you
need it: `pnpm fetch-gate-fixtures`. Without it, two gate tests skip with a
clear banner and the other 15 still run.

**Do not use Playwright for this work.** It is too slow for the iteration loop
and nothing here needs a browser. Unit-test against the committed geometry.

---

## 13. Repo conventions that will bite

- `@typescript-eslint/array-type` is `array-simple`: `readonly T[]` for simple
  element types, `ReadonlyArray<T>` / `Array<T>` for object literals, unions and
  nested arrays. Wrong either way is an error.
- `arrow-body-style: ["error", "always"]`: block bodies with explicit `return`.
- Components return `ReactNode` with `Readonly<Props>`, never `JSX.Element`.
- `@testing-library/user-event` is **not installed**. Use `fireEvent` from
  `@/test-utils`, and `pickMantineSelectOption` for Mantine selects.
- `shared/` cannot import from `src/`. `deno check shared` enforces it and the
  Deno import map has `$/` but no `@/`. This passes `tsc` and only explodes at
  `pnpm type-check:deno`. Persisted types live in
  `shared/models/datasets/PdfFileDataset/`.
- pdf.js 6.x: runtime imports must use `pdfjs-dist/legacy/build/pdf.mjs` (the
  modern build touches `DOMMatrix` at module scope and jsdom lacks it).
  `constructPath` args are `[paintOp, [pathData], minMax]`, and the path opcodes
  are an **unexported internal enum** (`DRAW_OPS` in
  `extractPageGeometry.ts:41`: moveTo 0, lineTo 1, curveTo 2, quadraticCurveTo 3,
  closePath 4), distinct from the public `OPS` numbering. If you upgrade
  `pdfjs-dist`, re-verify that mapping.

---

## 14. Key file anchors

| What                                    | Where                                                                         |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| **The retention funnel (start here)**   | `src/workers/pdfSniff/extractPageGeometry/extractPageGeometry.ts:144`         |
| Draw opcodes                            | same file, `:41`                                                              |
| `RuleSegment` / `PageGeometry`          | `src/workers/pdfSniff/pdfSniff.types.ts:45` / `:54`                           |
| Shape enum (persisted)                  | `shared/models/datasets/PdfFileDataset/PdfFileDataset.types.ts:41`            |
| Classifier cascade (text-only today)    | `src/workers/pdfSniff/classifyRegion/classifyRegion.ts`                       |
| Extractors                              | `src/workers/pdfSniff/extractors/`                                            |
| Proximity pairing + ambiguity flag      | `src/workers/pdfSniff/pairByProximity/`                                       |
| Output-mode union rule                  | `src/workers/pdfSniff/combineRegions/combineRegions.ts:144`                   |
| Output-mode default (never overridden)  | `.../ManualUploadView/useLoadManualUploadFile/useLoadManualUploadFile.ts:217` |
| Region picker UI                        | `.../ManualUploadView/PdfTablePicker/`                                        |
| Coordinate mapping (Mantine scale trap) | `.../PdfTablePicker/PdfRegionOverlay/`                                        |
| Parse controls                          | `.../DatasetImportForm/PdfParseControls/`                                     |
| **The gate**                            | `src/workers/pdfSniff/gateDocuments.test.ts`                                  |

---

## 15. If the vector assumption fails

Everything above assumes vector marks. A chart exported as a single image
XObject defeats every branch of it, and that is common in the wild (dashboard
screenshots, Tableau/Power BI/Grafana exports, and **canvas-based web charts
such as Chart.js even when printed to PDF**, because a canvas is already a
bitmap). SVG-based web charts such as D3 and Highcharts survive as vector.

We verified the gate document is vector, and UN situation reports as a genre are
professionally laid out and usually will be. We have **not** measured a base rate
across a real corpus, and no number should be invented for one.

Two consequences:

1. **Detect and say so.** `PageGeometry.looksScanned` and `detectTextLayer`
   already do this at page level. Extend the idea to the region: if a drawn
   region is covered by an image XObject and holds few marks, report "this
   region is a picture, I cannot read values from it" rather than returning
   nothing. That matches the honesty principle throughout this codebase.
2. **Phase 2 is the answer, not a fallback.** Manual two-point calibration works
   on a raster chart exactly as well as a vector one.

Worth doing soon, though not before the demo: point a short script at 30 or 40
ReliefWeb PDFs and count vector path ops against image XObjects per chart
region. That turns the biggest unknown in this plan into a number in an
afternoon, and it tells you whether to invest in readers or in the manual path.

---

## 16. Why not just use an LLM

Considered and rejected for **value reading**, deliberately.

An LLM cannot measure pixel positions and will produce plausible round numbers.
That is the single most dangerous failure mode for an import tool: confidently
wrong data carrying no flag. It is directly contrary to the gate's "zero
silently wrong" standard.

The LLM path that already exists (`runRegionModelAssist`, opt-in, consent-gated,
offered only when rules leave a coverage flag) is the right shape for what LLMs
are actually good at here: naming the metric and units from surrounding prose,
choosing which region is the chart, and cross-checking extracted values against
figures quoted in the body text.

**Keep value reading geometric.**
