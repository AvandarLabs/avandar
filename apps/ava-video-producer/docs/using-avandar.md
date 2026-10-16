# Using Avandar for product recordings

Source-audited on 14 October 2026 against the enclosing Avandar worktree. Product source is read-only during video work. Paths beginning `src/`, `shared/`, `tests/`, or `docs/` in source-reference columns refer to that product repository, not this video repository. This manual describes the local source tree, not a claim about the public deployment.

**Evidence level:** the workflows below are source-inferred, with existing product tests cited where available. They were not executed by the documentation agent. The root agent separately owns browser rehearsal and capture; its saved screenshots and capture report are the authority for runtime verification. A test's existence is not evidence it passed in this session. [Product docs review](product-docs-review.md) records stale and proposed claims.

## Local session prerequisites

| Item | Requirement or action | Evidence |
| --- | --- | --- |
| Runtime | Node >=22; pnpm pinned to 10.30.3; Bun version from `.bun-version` for scripts needing it | `package.json`, `README.md` |
| Existing app | Prefer a running local Vite server. Default frontend is `http://localhost:5173`; a switched worktree uses its configured port | `README.md`, `scripts/startAvandar.sh` |
| Data/auth | A seeded local Supabase stack matching this checkout's schema. Verify the browser's requests go to loopback, never the production project | Product `AGENTS.md`, E2E fixture docs |
| Browser | Headless Playwright MCP, using the product's canonical local seed user. Credentials are referenced by `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `TEST_WORKSPACE_SLUG` in `seed/SeedData.ts`; do not paste credentials into documentation or captures | Product `AGENTS.md` |
| AI features | Chat and AI-assisted PDF extraction require the local Edge Functions and configured provider access. Import, manual query and chart preparation can be rehearsed separately | `scripts/startAvandar.sh`, `src/components/ChatPanel/`, PDF import source |
| Maps | Browser WebGL, basemap network access, and DuckDB spatial extension for geometry operations. Wait for actual rendered map data before capturing | `src/views/GisApp/useDuckDbSpatialAvailability.ts`, `useRequestSpatialExtension/` |
| Permissions | Account must have the relevant app access and resource permissions. An absent menu is not proof a feature does not exist | `src/routes/_auth/$workspaceSlug/`, `docs/permissions-architecture.md` |

Do not run `pnpm dev` blindly to inspect an already running app. `scripts/startAvandar.sh` stops prior processes and kills listeners on its configured Vite port, copies the edge environment file, and starts multiple services. For an authorized frontend-only session against an existing local stack, `pnpm exec vite --host 127.0.0.1 --port <unused-port> --strictPort` avoids that orchestration. The product may need matching origin configuration for external OAuth, so use an already configured `localhost` origin when demonstrating Sheets.

If a fresh product development environment is needed, its own `AGENTS.md` governs setup. It documents `pnpm install`, `pnpm build:ava-cli`, isolated Supabase switching and seeding, then `pnpm dev`. Every non-`develop` product branch must pass `ava supabase status` with its own switched project before any `supabase start/stop`, reset, database tests or migration commands. Status can contain keys; keep its output out of artifacts. A video rehearsal does not authorize resetting a shared stack or altering production. Never read/copy `.env.local`, pass it to Remotion, or access Vercel.

## Route map

Replace `:workspace` and all IDs with values from the actual session. `_auth` and route-group directory names are not URL segments. Use in-app links after login to retain the loaded browser data and session.

| Product surface | Route | Source |
| --- | --- | --- |
| Sign in | `/signin` | `src/routes/signin.tsx` |
| Workspace home | `/:workspace/` | `src/routes/_auth/$workspaceSlug/index.tsx` |
| Data Sources | `/:workspace/data-manager` | `src/routes/_auth/$workspaceSlug/data-manager/index.tsx` |
| Add dataset | `/:workspace/data-manager/data-import` | `src/routes/_auth/$workspaceSlug/data-manager/data-import.tsx` |
| Dataset details | `/:workspace/data-manager/:datasetId` | `src/routes/_auth/$workspaceSlug/data-manager/$datasetId.tsx` |
| Data Explorer | `/:workspace/data-explorer` | `src/routes/_auth/$workspaceSlug/data-explorer.tsx` |
| Case Manager | `/:workspace/ontology-designer` | `src/routes/_auth/$workspaceSlug/ontology-designer/index.tsx` |
| Case type form | `/:workspace/ontology-designer/concept-creator` | `src/routes/_auth/$workspaceSlug/ontology-designer/concept-creator.tsx` |
| Case type details | `/:workspace/ontology-designer/:conceptId` | `src/routes/_auth/$workspaceSlug/ontology-designer/$conceptId.tsx` |
| Records | `/:workspace/individual-manager/:conceptId` | `src/routes/_auth/$workspaceSlug/individual-manager/$conceptId/index.tsx` |
| Record details | `/:workspace/individual-manager/:conceptId/:individualId` | `src/routes/_auth/$workspaceSlug/individual-manager/$conceptId/$individualId.tsx` |
| Dashboards | `/:workspace/dashboards` | `src/routes/_auth/$workspaceSlug/dashboards/index.tsx` |
| Edit / owner preview | `/:workspace/dashboards/edit/:dashboardId`, `/:workspace/dashboards/preview/:dashboardId` | `src/routes/_auth/$workspaceSlug/dashboards/` |
| Maps list / editor | `/:workspace/map`, `/:workspace/map/:mapId` | `src/routes/_auth/$workspaceSlug/map/` |
| Published viewer | `/d/:slugOrId`, `/:workspace/d/:slugOrId`, `/public/dashboards/:workspace/:dashboardId` | `src/routes/d/`, workspace `d/`, public dashboard route |
| Settings / profile | `/:workspace/settings/:tabName`, `/:workspace/profile` | Workspace settings/profile routes |

The sidebar, raised slate, toolbar, optional lower settings drawer and Ask Avandar aside are distinct regions. The map uses a floating toolbar. Prefer the current rendered UI over the older GIS screenshots in `docs/design/gis/current-state/`.

## Import data

Use [the Harborfield bundle](../demo-data/README.md) for a coherent fictional rehearsal. Its five CSVs total 591 data rows and cover three linked grains plus polygon and weekly summaries. Data validation is independent of any product import.

1. Click **Data Sources**, then **Add new dataset**. The import tabs are **Upload**, **Connectors**, and **Open data**.
2. Under **Upload**, choose one CSV. Selecting the file starts parsing immediately. There is no extra import-confirm step before the preview.
3. Check **Data preview**, row count and inferred column types. Fill **Dataset name** and **Description**. Put the fictional provenance in Description. Keep the date columns and numeric latitude/longitude recognizable.
4. If parsing options change, use **Process data again** and wait for the new preview. Re-parsing replaces the temporary dataset ID; use the final saved ID in later queries.
5. Review the cloud-storage choice according to the local rehearsal's intended persistence, then click **Save Dataset**. This writes metadata and may upload data to the local stack. Wait for the dataset detail route and, if enabled, the completed online-storage state.
6. Record the dataset UUID from the URL in the local session manifest. Display names are not SQL relation names. Import the remaining CSVs only if the selected story needs them.

| Import path | Current behavior | Demo boundary |
| --- | --- | --- |
| CSV | Browser parse, typed columns, adjustable parse settings, preview, save | Preferred reusable input. Validate detected dates and blank counts |
| XLSX | Sheet selection, preview and reparse; one selected sheet becomes one dataset | Current reader uses text for workbook cells. Do not promise native type inference or all sheets in one step |
| PDF | Page/region selection and extraction review are implemented | Require real source bytes and visible review. Do not imply scan OCR, automatic perfect extraction, or arbitrary row/cell editing after save |
| Google Sheets | Connector authorizes Google, Picker selects a sheet, tab selection before CSV download, preview/save, refresh path | Requires Google setup. Picker is partly stubbed in automated tests. A renamed stored tab may break refresh |
| Open data | Adds a modeled catalog entry; acquisition supports registered sources | Not arbitrary live search of all HDX resources |

Source references: `src/views/DataManagerApp/DataImportView/AGENTS.md`, `DataImportTabs.tsx`, `ManualUploadView/ManualUploadView.tsx`, `DatasetImportForm/DatasetImportForm.tsx`, `DatasetImportForm/DatasetImportActions/DatasetImportActions.tsx`, `tests/e2e/helpers/importDatasetViaUi.ts`, `tests/e2e/excel-multi-sheet-import.spec.ts`, `docs/google-sheets-e2e.md`. Do not copy test cleanup helpers that delete every dashboard or broad test state into a manual rehearsal.

## Explore, filter and visualize

1. Click **Data Explorer**. Open the lower **Query** settings tab if it is collapsed.
2. Choose the **Data source** by its actual saved name. Use **Select columns to query** to choose a small useful set. Source, Aggregations, Filters (Where), and Sort/limit controls are implemented.
3. For the first story, select `district_name` and `case_id`, set a count aggregation on `case_id`, and sort descending by the count if the actual UI exposes that derived result. For a simpler deterministic first capture, select `district_name`, `recorded_cases` from the prepared districts dataset.
4. For a precise SQL demonstration, switch **Query editor mode** to **SQL**, click **Edit query**, enter a query from [queries.sql](../demo-data/queries.sql) with the real dataset UUIDs, then **Re-run query**. Verify actual result cells before describing the answer.
5. Open visualization settings and choose a supported chart. Bar/line/area accept series, X-axis selection, legend, grid and axis controls. Scatter/bubble use numeric pairs; pie uses name/value columns. Keep a table shot to make the result auditable.
6. Use **Save** -> **Save as new dataset** for a derived result, or **Save** -> **Save to dashboard** for the current SQL and visualization. Save is disabled until a successful nonempty result exists.

Registered visualization types are table, bar, line, area, scatter, pie/donut, funnel, radar and bubble (`shared/models/vizs/VizConfig/VizConfigs.ts`). Supported manual chart types exceed the AI tool's subset. The existence of a visualization selector does not guarantee a particular query automatically configures a useful chart.

The generated data provides these checkable answers:

| Question | Expected fixture answer |
| --- | --- |
| How many recorded cases? | 240 |
| Highest all-period district total? | Eastbank 56; North Quay 51 |
| Eastbank weekly series? | 4, 5, 7, 10, 13, 17 in chronological order |
| Cases awaiting contact in imported source data? | 19, all Eastbank |
| Distinct cases with at least one visit? | 221 across 297 visits |
| Missing weekly reporting? | West Marsh, 31 August and 7 September; count cells are blank |

Sources: `src/views/DataExplorerApp/QueryForm/ManualQueryForm/ManualQueryForm.tsx`, `SqlQueryView/SqlQueryView.tsx`, `DataExplorerSaveMenu/DataExplorerSaveAsMenuItems.tsx`, `tests/e2e/excel-multi-sheet-import.spec.ts`, `docs/qetl-architecture.md`, `docs/dashboards-and-visualizations-inventory.md`.

Use explicit `AS` aliases and qualified fields in multi-source SQL. The QETL architecture audit documents projection edge cases involving unqualified columns, aliases without `AS`, typed date literals and `EXTRACT`. Use simple literal string dates or the manual filters until the selected query is rehearsed. Do not represent the local cache as continuous synchronization or automatic data freshness.

## Build a dashboard

1. Run and verify the Explorer query and chart.
2. Choose **Save** -> **Save to dashboard**. If dashboards already exist, select one or enter create mode. Otherwise the modal opens in create mode.
3. Fill **Dashboard name**, for example `Harborfield response briefing`, then **Create dashboard & save**. For an existing selection, click **Save to dashboard**.
4. Open the success link or the saved dashboard from **Dashboards**. Verify the visualization renders in the editor and owner preview. Add text explaining the fictional source and the missing West Marsh reports using the actual editor controls.
5. Inspect **Share** only when that story needs it. Publication is separate from saving an editor draft and requires explicit authorization. A video ending on a prepared local preview is complete without publishing.

The current editor supports DataViz and content blocks, filtering, chart settings, and a share/publishing surface. The older feature inventory says no unpublish, but current `DashboardShareModal/PublishingActions/PublishingActions.tsx` explicitly supports `unpublish`; its private-dashboard umbrella says all phases landed. Describe current controls after browser inspection. Never use the historical inventory's public-only wording as the final authority.

Public and internal viewers have different permission and snapshot paths. The QETL audit documents anonymous loading and concept-relation gaps. A successful owner preview does not establish public viewer functionality. Rehearse a signed-out viewer separately before making a public-sharing claim, and do not publish as part of ordinary recording preparation.

Sources: `src/views/DataExplorerApp/SaveToDashboardModal/`, `src/views/DashboardApp/DashboardEditorView/`, `src/views/DashboardApp/DashboardShareModal/`, `tests/e2e/save-to-dashboard.spec.ts`, `tests/e2e/save-to-dashboard-renders-in-editor.spec.ts`, `docs/superpowers/specs/2026-08-13-private-dashboards-design.md`.

## Create a dataset-backed case type and browse records

The safe story is **one record assembled from related source rows**. It does not demonstrate comments, assignment, automatic follow-up, or a persisted operational status workflow.

1. Import `cases.csv` and `visits.csv`. Both use text `case_id`; every visit's case has a nonblank `case_label` in cases.
2. The visible **New case type** action starts an Ask Avandar design session, which depends on AI. For deterministic preparation, open the direct `/:workspace/ontology-designer/concept-creator` form route. This form is reachable by URL/Spotlight even though the list's creation controls prefer chat.
3. Fill **Case type name** (for example `Harborfield response case`) and **Description**. Enable **Some data should come from existing datasets**.
4. Select `cases.case_label`, click **Add column as a field**, and add `district_name`, `report_date`, `support_need`, `referral_status`, plus `visits.supply_kits_delivered` or `staff_minutes` as required. Choose each field's appropriate value-picker rule. Use `sum` for total delivered kits and `first` for the case label; do not use min/max for text/date fields with the current reader.
5. Under the dataset join configuration choose `case_id` as each dataset's identifier. Choose `case_label` as the record's name/title field. Leave manual-entry fields out. Click **Create case type**.
6. On its detail page, click **Sync records** once, wait for **Finished syncing ... records**, then **View records**. Expect 240 unique case records if all imported rows and mappings were accepted.
7. Open a record and show the data-backed Details values. Compare a field to its imported source, then, if needed, query the case type in Data Explorer. SQL relation names are `concept_<conceptId>`, not the display name.

Known limitations from the current architecture audit materially affect rehearsal: Sync upserts fresh record IDs, resets `status`/`assigned_to`, and does not remove missing keys. Missing labels can fail sync after partial writes. Manual-entry fields have no value storage and can break record details. The records list has pagination/order limitations; this bundle stays under 500 records. A record's imported `referral_status` is an attribute read from CSV, separate from Avandar's own stored status column. Do not repeatedly sync a case type to show preserved history. If record details fail, capture the failure as evidence and narrow the story instead of reconstructing a successful panel in Remotion.

Sources: `src/views/OntologyDesignerApp/ConceptCreatorView/index.tsx`, `ConceptCreatorView/DatasetColumnAttributesBlock/index.tsx`, its `IdentifierBlock/` and `DatasetColumnMappingCreator.tsx`, `ConceptMetaView/CaseTypeActions.tsx`, `ConceptMetaView/generateIndividuals/index.ts`, `src/views/IndividualManagerApp/SingleIndividualView/index.tsx`, `docs/ontology-architecture.md` sections 5, 6, 9 and 16.

## Make a map

1. Click **Maps**, then **New map**. The editor creates an `Untitled map`. Set **Map name** to a descriptive fictional title.
2. Click **Add a layer**, then **Search data sources**, and choose imported cases or facilities. Confirm the Layer inspector binds **Latitude** and **Longitude** correctly, points actually render, and the layer diagnostics report the expected mapping result.
3. Add the other point dataset as a separate layer. Use layer controls to distinguish cases and facilities, then click a visible point and inspect the **Feature** panel. Pointer coordinates must come from the live rendered map, not guessed CSS offsets.
4. For districts, add the prepared district dataset and select the **geometry column** binding with `geometry`. This is a CSV containing WKT, not an arbitrary `.geojson` upload. Confirm EPSG:4326 and the six polygons. Use `recorded_cases` for the quantitative fill and retain `latest_reporting_status` as a visible attribute or annotation, because West Marsh's 25 is only the recorded four-week count.
5. Use the Layer inspector's Data, style/symbology, filters, popup and legend controls only as supported by the selected layer. Time uses `report_date` on cases; boundary joins use `district_id`. Separate small advanced stories can cover clusters, heatmaps, grids, coordinate validation, AOI, buffers, measurement and annotations after rehearsal.
6. Wait for **All changes saved**, reload, and verify title/layers survived. Avoid recording a save claim before persistence is observed.
7. For a local output, use the map PDF export, configure page and source text, preview it and inspect the saved PDF. Label the data and boundaries fictional. This exports a local artifact; it does not publish a live map.

Source evidence covers multiple layers/persistence, points, WKT/GeoJSON geometry columns, CRS validation, boundary joins/choropleth, styles, clusters/heatmaps/grids, AOI/buffers, time, annotations, measurement and PDF export. **Isochrone is explicitly a disabled reserved tool**, not an implemented travel-time calculation. Small screens can be viewing-only. Basemap labels near the invented coordinates are real geographic labels, so keep the fictional statement prominent and avoid implying that those places have these records.

Sources: `src/views/GisApp/MapListView/CreateMapButton.tsx`, `panels/LayerInspector/DataSection/DataSection.tsx`, `useAvaMapEditor/`, `shell/MapToolCluster/IsochroneMapTool.tsx`, `export/ExportSheet/`, `export/useExportPdfDownload/`, `export/composeExportPdf/`; tests `gis-map-layers.spec.ts`, `gis-boundary-join.spec.ts`, `gis-geometry-column.spec.ts`, `gis-point-classification.spec.ts`, `gis-time-range.spec.ts`, `gis-export-pdf.spec.ts`.

## Other useful feature stories

| Story | What to show | Prerequisite / caveat |
| --- | --- | --- |
| Ask a question and inspect SQL | Question, generated query, actual result, corrected chart | Cloud/offline model availability and nondeterministic wording. Do not paste an expected answer as if generated |
| Extract a report region | Select a PDF region, review actual rows, save then query | Use supplied lawful document bytes, not fabricated source-report claims. This CSV pack does not include a PDF |
| Reuse a query result | Explorer query -> Save as new dataset -> reopened result | Verify whether the saved result is virtual or materialized in that path; do not claim freshness |
| Private team briefing | Resource access controls and an authorized local viewer | Permissions and subscriptions can gate the flow; save/preview is distinct from publish |
| Guidance for a new user | Get started checklist/tour leading to first dashboard | Current NUX source exists, but overlays can obscure a planned capture. Dismiss through the actual UI when appropriate |

## Rehearsal evidence checklist

Record the local origin, product revision, viewport, language/theme, dataset IDs and names, fixture hashes, and created dashboard/map/case-type IDs in a local capture report. For each promised result, save a screenshot and its actual UI actions. Record failures and missing prerequisites explicitly. Do not turn a source-inferred step into browser-verified merely because a screenshot of its destination exists.

Use only synthetic data created for this task. Leave unrelated existing datasets and resources intact. Do not expose credentials, signed resource URLs, or auth state in committed artifacts. Keep raw product captures and session artifacts local. The sample app permits intentionally reviewed screenshots, normalized clips, finished films and sanitized provenance to be versioned; the generic kit examples remain generic.

## Browser rehearsal update, 14 October 2026

This section records the root agent's browser observations after the original source audit. It does not change the evidence level of untested workflows above. The root agent authorized and ran `pnpm dev`; the local app was running at `http://localhost:5173`, and login succeeded against the local Supabase endpoint at `http://127.0.0.1:54321` in workspace `avandar-labs`. Reuse that running session for this rehearsal instead of starting the development stack again.

| Flow | Confirmed in the root agent's local browser rehearsal | Boundary |
| --- | --- | --- |
| CSV import | Parsed the fictional case CSV, named it `Video - Harborfield cases`, saved it with cloud storage enabled against the local stack, and opened dataset `b508ca6c-f671-4c80-8202-b46e0580040b` | The dataset detail route changes to `/data-manager/<uuid>` while the page heading remains **Data Sources**. A heading matching the dataset name is not the success condition |
| Data Explorer | Selected the case dataset in Manual mode, filtered `district_name` to Eastbank and observed 56 matching rows, then ran the district aggregation and observed six result rows | The grouped query uses all districts after the Eastbank-only inspection. These are recorded cases from fictional data, not complete surveillance or population-adjusted rates |
| Chart | Selected **Bar Chart**, used the available defaults, and displayed the six-district comparison | This verifies the exercised bar-chart path, not every chart type or an AI-generated answer |
| Dashboard | Used **Save** > **Save to dashboard**, created the named dashboard, and selected **View** to reach the real dashboard preview | Saving and previewing were exercised. Publication, external sharing, and viewer access were not part of this rehearsal |
| Case Manager and maps | At this initial rehearsal, only the capture flows had been authored from source and tests | Later acceptance evidence is recorded below and in the completed capture manifests. A plan, route definition or reserved screenshot filename alone does not verify synchronization, record details, mapped layers or persistence |

The automated capture is a separate acceptance check. In local run `pilot-2026-10-14T21-47-49-089Z-4OHI64`, the `import-preview` and `import-saved` checkpoints passed and saved real screenshots, but the overall run failed later while waiting for a dataset-list network response. Its manifest is at `out/captures/pilot-2026-10-14T21-47-49-089Z-4OHI64/manifest.json`. A partial run does not verify the skipped features. The runner now uses the loaded sidebar count and rendered dataset links to accommodate cached lists; confirm that behavior in a later completed run.

### Dataset capacity in this rehearsal workspace

The browser displayed **Dataset limit reached** at five existing datasets on this workspace's current free plan. One dataset was already present and is unrelated to the video. It remains intact. The four imported fixtures fill the remaining capacity:

| Local dataset name | Fixture | Expected rows |
| --- | --- | ---: |
| `Video - Harborfield cases` | `demo-data/cases.csv` | 240 |
| `Video - Harborfield visits` | `demo-data/visits.csv` | 297 |
| `Video - Harborfield facilities` | `demo-data/facilities.csv` | 12 |
| `Video - Harborfield districts` | `demo-data/districts.csv` | 6 |

`demo-data/weekly_reports.csv` remains in the reusable fixture bundle with 36 rows, but it was not imported into this workspace. The default capture imports only the four datasets required by its current flows. This is an observed capacity boundary for this workspace and plan, not a universal product limit.

On a repeat capture, opening the upload preview for the already saved cases can surface the capacity modal. Dismiss it with Escape, capture the preview, then reuse the existing dataset. Do not save another copy, remove unrelated data, or change the plan to force the rehearsal through. If a required fixture is absent and capacity is exhausted, report the actual prerequisite instead of claiming the import succeeded.

### Case Manager acceptance evidence

Later local run `pilot-2026-10-14T22-05-23-614Z-UH8im8` passed the Case Manager flow. This supersedes the pending Case Manager status in the earlier rehearsal table; it does not verify the map flow. The capture reused the task-created case type `Video - Harborfield response case - pilot` (`0239e74b-cd03-4b78-8fa3-5cb10ff02919`) without repeating Sync. Its initial creation and one-time synchronization were exercised in run `pilot-2026-10-14T21-56-20-810Z-fRync4` before that run later failed on the map's basemap request guard.

The acceptance flow scrolled the rendered record pane, collected unique record URLs, and matched all 240 distinct record labels against `cases.csv`. It then opened **Response case 001** and independently compared the displayed values with the input CSVs: `case_label` = `Response case 001`, `district_name` = `North Quay`, imported `referral_status` = `contacted`, and `supply_kits_delivered` = `1` summed from related visits. Both source-key fields displayed `HF-0001`; the field labels identified the cases or visits dataset as appropriate. This demonstrates a record assembled from related source rows, not operational assignments, comments, or preservation of history across repeated synchronization.

The record list currently repeats pagination boundary records. Its CRUD helper uses an inclusive end index with `range(startIndex, endIndex)`, while consecutive pages start at that same boundary (`packages/shared/clients/src/SupabaseCrudClient/createSupabaseCrudClient.ts`; the consumer uses pages of 20 in `src/views/IndividualManagerApp/useConceptIndividuals.ts`). During scrolling, duplicate boundary keys can remain visible in the virtual list. Count unique record URLs and labels, never raw DOM links. Reloading the same records route restores the initial clean list; the capture does this after the 240-record assertion. No product source was changed.

### What fixture verification establishes

Capture manifests hash the local fixture input files. Those hashes establish which local bytes the rehearsal expected; reuse by dataset display name does not establish byte-for-byte identity of every persisted dataset. This rehearsal created its four fixtures through the real import UI, then checked visible results and linked record values. Future runs that reuse a modified dataset can fail those expectations. Do not describe local file hashes as a full audit of persisted cloud contents.

An import preview also displayed the fixture's `2026-08-03` date as **Aug 2, 2026** in the local browser. The fixture file retains its intended date. The current films do not narrate that displayed date as an accurate conversion; record this as an observed date-display caveat, without claiming a cause or a product fix.

### Complete browser acceptance run

Run `pilot-2026-10-14T22-11-57-800Z-Z53br8` passed all five flows together with 14 screenshot checkpoints and zero blocked network requests. The manifest is `out/captures/pilot-2026-10-14T22-11-57-800Z-Z53br8/manifest.json`. The local browser viewport was 1440 by 900. Authentication occurred before recording. This evidence supersedes the pending status in the original audit and earlier rehearsal table only for the exercised paths below.

| Accepted path | Browser assertion and visible result | Scope |
| --- | --- | --- |
| Import preview and persisted dataset | Parsed the case CSV, showed its 240-row preview, then reopened the existing named dataset | Initial saving was verified earlier; the repeat run avoided a duplicate save at the workspace capacity limit |
| Filter and aggregate | Eastbank filter returned 56 rows; all six grouped values matched: Eastbank 56, North Quay 51, South Gardens 40, Lakeside 39, Ridge 29, West Marsh 25 | The chart compares recorded fictional cases, with no population or reporting-completeness claim |
| Dashboard | Opened the task-owned dashboard in editor and owner preview with its real district chart | The repeat run reused the saved dashboard without adding another chart; no publication or viewer permissions were exercised |
| Case records | Matched 240 unique record URLs and expected labels, then checked the known record's values against cases and visits | The detailed proof and pagination limitation are recorded above |
| Point map | Displayed 240 of 240 case rows and 12 of 12 facility rows mapped; blue case symbols and larger orange facility symbols were visible | The saved name, both layers, and both mapped-row diagnostics survived a full reload |

The point map is `Video - Harborfield response map - pilot`, ID `410983b7-7f9c-430b-a38e-f3f44d70205c`. The inspector correctly bound `latitude` and `longitude`; the actual UI set case color `#228be6` and radius 4, and facility color `#f08c00` and radius 8. The accepted map screenshots were visually inspected for rendered symbols as well as diagnostic counts. Real basemap place names under the invented coordinates do not identify any real reporting area or people.

### Geometry failure and the point-map boundary

The attempted district layer selected **Geometry column**, `geometry`, **WKT**, and **Polygon**, but the current local build displayed **Could not load**. Its visible **Show details** panel reported a DuckDB Binder Error: the internal `__avandar_geometry` column was not found while a temporary view was being created. The sanitized diagnostic checkpoint is in `out/captures/pilot-2026-10-14T22-06-57-819Z-7cN7ab/`; the internal column's spelling is corroborated by `src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.constants.ts`. No successful district polygons, choropleth, spatial join, or geometry export was observed.

The capture removed only its own failing district layer through the map's **More actions** > **Delete** control. It left the imported district dataset and unrelated resources intact. An initial case point layer also showed a query failure after that geometry attempt. A later fresh page and the full accepted run rendered cases and facilities successfully. A stale temporary view, query cache, or initialization race is a possible explanation, not an established root cause. Do not present a reload as a proven general fix, and do not translate the working point-layer result into a claim that WKT works. The current map film is deliberately limited to case and facility point layers and persistence.

## Reusing the product UI in films

The six current product storyboards render actual Avandar React components with
frame-controlled fixture state. Follow [component videos](component-videos.md)
when producing these films. This manual and the browser capture pipeline remain
the reference for driving the live app and verifying real product behavior.
A component film's navigation, query result, or saved-state appearance is not
evidence that the corresponding backend operation ran during rendering.
