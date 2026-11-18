# `demo/measles` PR feature log

> **WARNING: KNOWN PRIVACY GAP, DEMO ONLY. FIX BEFORE THIS REACHES `develop`.**
>
> Crosswalk layouts and mappings are readable by every Data Sources viewer,
> even when the member dataset is restricted to other people. A viewer who
> cannot open a restricted dataset can still read its **column names, source
> columns, and fill rules** when that dataset is alone in its layout. The
> membership rows themselves stay hidden. We accepted this for the
> `demo/measles` demo only. Hiding layouts from viewers is not a fix: the save
> payload would lose them and `rpc_crosswalks__save` would delete them.
> A real fix needs a different mechanism (for example, per-layout read
> filtering plus a save that preserves layouts the caller cannot see).
> Details: [design doc section 11](data-dictionaries-design.md#11-permissions-and-rls)


The running list of features built on `demo/measles` that must each land
in `develop` as their own PR. When every feature below reads `merged`,
everything this branch built is in `develop`.

Bug fixes ready to port to `develop`, and the PR and Linear status of
each, are tracked in [bug-log.md](bug-log.md).

Out of scope: the Postgres connector. It came in through
`1d8678750 Merge branch 'feat/postgres-connector'`, again through
`5ccb9b54e`, and into `feat/statuses` through `b903cbd9f`. Its 90 commits
(everything reachable from those merges' second parents that `develop` lacks)
merge on their own branch. Also out of scope: `refactor/query-column-id`,
whose 19 commits came in through `feat/statuses`. It is on `develop` as #304,
and `50c5c9ad7` records it as superseded.

Branch base: `9cc48c3e4`, where the branch left `develop`. `develop` has been
merged in twice since (`56f31f603` and `f920d223c`), so the merge-base is now
`fb5d2ca5f`. Last updated against `34798387c`.

## How to use this log (for the agent building a PR)

1. Pick the first feature in **Merge order** whose status is `not started` and
   whose `Depends on` features are all `merged`.
2. Branch from an up-to-date `develop`:
   `git switch -c <prefix>/<slug> origin/develop`, inside a worktree created
   with the `using-wt` skill.
3. Read every commit listed under the feature with `git show <sha>`, and read
   each listed file at its final state with
   `git show demo/measles:<path>`.
4. Rebuild the feature on the new branch. Two rules decide what to copy:
   - **Default:** take the file's final content on `demo/measles`.
   - **Shared files:** some files hold code from several features (see
     **Files shared by several features**). For those, take only the hunks
     this feature owns. Hunks belonging to a feature that is not merged yet
     stay out.
   - Never cherry-pick a commit marked `MIXED` whole.
5. Schema changes:
   - Edit `supabase/schemas/` and regenerate the migration with the
     `supabase-declarative-schema` skill, after
     `ava supabase status` / `ava supabase switch`.
   - **Except rename migrations and `STORAGE-` migrations.** Those are
     hand-written: port their SQL and give them a new timestamp. The schema
     diff would turn a rename into a drop-and-create, which loses data.
6. Regenerate, never copy, generated files:
   - `shared/types/database.types.ts`: `pnpm db:gen-types`
   - `apps/desktop/migrations/*.gen.sql`: `pnpm desktop:sqlite:gen-migrations`
   - `src/i18n/locales/*/messages.{po,ts}`: `pnpm i18n:extract && pnpm i18n:compile`
   - `pnpm-lock.yaml`: `pnpm install` or `pnpm add`
7. Run the feature's **Verification** commands. Open the PR with the
   Conventional Commits title given.
8. Update this log on `demo/measles`: set the status to `PR open` with the
   PR link, then to `merged` once it merges.

## Features

| ID | Feature | Status | Depends on | Linear |
|---|---|---|---|---|
| F1 | `@avandar/modules` factory and mixin refactor | not started | none | [AVA-383](https://linear.app/avandar/issue/AVA-383) |
| F2 | `HttpClientFactory` with rate limiting, and open data read through it | not started | F1, F3 | |
| F3 | Move `shared/open-data` to `shared/connectors/open-data` | not started | none | |
| F4 | The drive concept: data catalog listings schema, drive index infrastructure | not started | F3 | [AVA-381](https://linear.app/avandar/issue/AVA-381) (follow-up) |
| F5 | ~~Rename the `external-datasets` edge function to `connectors`~~ | dropped: the Postgres branch carries it | | |
| F6 | Socrata connector and drive index pipeline | not started | F2, F4, F10 | [AVA-382](https://linear.app/avandar/issue/AVA-382) (licensing) |
| F7 | HDX (CKAN) connector refactor and drive index pipeline | not started | F2, F4, F10 | [AVA-382](https://linear.app/avandar/issue/AVA-382) (licensing) |
| F8 | Open-data write-back cache | not started | F4, F6 | |
| F9 | Measles demo docs: use case, specs, plans | not started | every other feature | |
| F10 | Pipeline run options: `ava pipeline run --limit` and `.env.pipelines.local` | not started | F4 | |
| F11 | Live progress output for `ava pipeline run` | not started | F10, F50, F51, F55 | |
| F12 | Invalid catalog listings, and DuckDB-parsed column type samples | not started | F4, F7, F53, F54 | [AVA-396](https://linear.app/avandar/issue/AVA-396) (follow-up) |
| F13 | Demo deployment: `demo/*` branches deploy to `demo.avandarlabs.com` | not started | none | |
| F14 | Show only the plan picker when a workspace has no active plan | merged: [#314](https://github.com/AvandarLabs/avandar/pull/314) | none | |
| F15 | `ava --env <name>` loads any `.env.<name>`, replacing `--staging` and `--prod` | PR open: [#319](https://github.com/AvandarLabs/avandar/pull/319) | none, but see its section for hunks in files `develop` lacks | |
| F16 | Index every catalog asset behind `is_workspace_loadable`, and add the NY State Socrata portals | not started | F4, F6, F7, F12, F55 | |
| F17 | Search the catalog in Postgres and load listings as the user scrolls | not started | F4, F12, F16 | |
| F18 | Case comments and the case activity feed | not started | none | |
| F19 | Open data catalog browser: full-height three-pane layout with search, filters, and sort | not started | F12, F16, F17 | |
| F20 | Phone widths: Data Sources shows one pane at a time, and the slate stays on screen | not started | none | |
| F21 | Gadget references: link and embed dashboards, tiles, datasets, maps, case types, and cases in a case comment | not started | F18 | |
| F22 | AI harness audit: 15 chat and Data Explorer bug fixes and 8 harness improvements | not started | none (see its section for order within it) | |
| F23 | Catalog field mapping: per-pipeline YAML metadata mapping, drives, and publisher, agency, topic, and keyword filters | not started | F4, F6, F7, F16, F17, F19, F55 | |
| F24 | ODC listing data preview and full-screen detail | not started | F12, F16, F19, F23 | |
| F25 | Cached Parquet copies of ODC listings, built by the pipeline server | not started | F12, F23, F55 | |
| F26 | The pipeline server loads into the Supabase project each run names | not started | F55 | |
| F27 | Pipeline runs pace their writes to the database and retry transient failures | not started | F4, F11, F23, F53, F55 | |
| F28 | Build an ODC listing's Parquet copy from a column type sample that holds the whole source | not started | F12, F24, F25 | |
| F29 | API-backed listing copies expire, so workspaces see a changed source | not started | F25 | |
| F30 | WHO GHO pipeline, recommended listings, and listing freshness probes | not started | F4, F16, F17, F19, F23, F24, F25, F28, F29, F42 | |
| F31 | Threshold colors: map config version 6 with one color and label per graduated class | not started | none (its e2e spec needs F19, F25) | |
| F32 | Add places to a map: click, coordinates, or address search, stored as a dataset | not started | none (its e2e spec needs no catalog) | |
| F33 | Filter a map layer by another layer, and the feature list: map config version 7 | not started | F31 | |
| F34 | Feature list in the export PDF: map config version 8 | not started | F33 | |
| F35 | Map block on dashboards, with privacy-filtered map snapshots for public publishes | not started | F31, F33, F34 | |
| F36 | Hide the Get started checklist while a drawer is open | not started | none | |
| F37 | Type API-backed Parquet blobs so DuckDB loads them | not started | none (bug on `develop`) | |
| F38 | `ava pipeline run` waits up to two hours for the server and shows non-JSON server errors | not started | none (bug on `develop`) | |
| F39 | The pipeline server rejects pipeline names that are not a plain folder name | not started | none (bug on `develop`) | |
| F40 | Index catalog relation columns by listing | not started | F4 | |
| F41 | `ava supabase sql` replaces the `db:sql` scripts | not started | none | |
| F42 | Retry HTTP 429 with exponential backoff, and use it for HDX | not started | F2, F7 | |
| F43 | CKAN and Socrata discovery page oldest-modified first, with timestamps | not started | F6, F7 | |
| F44 | API listings name their pipeline, and the high-water mark index | not started | F4 | |
| F45 | The ETL engine owns the Supabase load (`world-bank__wdi` moves onto it) | not started | F1, F4, F10, F44 | |
| F46 | `ava pipeline reset` deletes a pipeline's catalog listings | not started | F44 | |
| F47 | `ava pipeline run --incremental`, `--since`, and `--until` | not started | F10, F38, F45 | |
| F48 | The Socrata pipeline crawls on the engine, resumable and incremental | not started | F6, F43, F45, F47 | |
| F49 | The HDX pipeline crawls on the engine by `metadata_modified`, and the HDX drive is switched on | not started | F7, F42, F43, F45, F47, F48 | |
| F50 | Each run's per-drive report, printed by `ava pipeline run` | not started | F38, F47, F48, F49 | |
| F51 | Crawl scopes with per-scope checkpoints | not started | F48, F49, F50 | |
| F52 | `ava pipeline prune-retired-scopes` and `ava pipeline reset --scope` | not started | F39, F46, F51 | |
| F53 | Each listing and its relation columns are written in one transaction, and Socrata and HDX listings carry their columns | not started | F51 | |
| F54 | Column type verification: unverified columns are verified in the browser before a listing is added | not started | F8, F52, F53 | [AVA-394](https://linear.app/avandar/issue/AVA-394), [AVA-395](https://linear.app/avandar/issue/AVA-395) (follow-ups) |
| F55 | Pipeline executions: every run is recorded with its invocation, timings, and counts | not started | F50, F54 | |
| F56 | `ava pipeline reset` and `prune-retired-scopes` are recorded as executions | not started | F46, F52, F55 | |
| F57 | Case Types and Case Records app roles | not started | none | |
| F58 | Case statuses data model: one status set per case type, a status on every record, atomic case type creation | not started | F57 | |
| F59 | Edit a case type's statuses: status components, the create form, and the case type page | not started | F57, F58 | |
| F60 | Work records by status: the records list status filter and the record page status control | not started | F57, F58, F59, F18 | |
| F61 | A built-in status column for case types in the Data Explorer and every concept relation | not started | F58, F63 | |
| F62 | Chat sees each case type's statuses and proposes a status set | not started | F57, F58, F59, F61 | |
| F63 | Read a loaded concept spine back as trusted internal SQL | not started | none | |
| F64 | Stop CaseTypeDraftBlock toasts outliving the test file | not started | none | |
| F65 | An `is` null filter and ordered pages in `@avandar/utils` and `@avandar/clients` | not started | none | |
| F66 | Assign a record to one member, the Assigned to me queue, and the assignee filter | not started | F57, F59, F60, F65, F18 | |
| F67 | Let a drafted case type change its datasets | not started | F62, F71 to F75 | |
| F68 | Pin case details above the activity feed | not started | F18, F19, F60, F66, F71 to F75 | |
| F69 | Public snapshot reads refuse case type views, internal tables, and SQL analyzer bypasses | not started (bug is on `develop`) | F22 BUG-001 (`2193d0ef4`) | |
| F70 | DuckDB results read list, struct, decimal, date, and time values correctly | not started (bug is on `develop`) | none | |
| F71 | One NULL-ignoring value rule function for case type views and Sync, records read by key, and spine restrictions | not started | F57 to F62, F1 | |
| F72 | The record page reads field values from the case type view | not started | F70, F71, F18, F57 to F62 | |
| F73 | Typed value rules: only the rules a column's type allows, each with its own output type | not started | F70, F71, F57 to F62, F22 | |
| F74 | List fields: a case type field that keeps every value | not started | F70, F71, F72, F73, F57 to F62, F22 | |
| F75 | Per-period fields: one value per day, week, month, quarter, or year | not started | F74 (and everything F74 needs) | |
| F76 | Joined cases plans for multi-source fields, on-demand record names, and key matching | not started (docs only) | F72 | |
| F77 | PDF table assistant on its own route | not started | none (needs `supabase/functions/_shared/assertMeetsMinAppRole.ts` from the Postgres branch, or port that file) | |
| F78 | Keep a case's id out of the view-change lines sent to the model | not started | F22 (BUG-015's adapter line; see its section) | |
| F79 | One series per category when charting a long result | not started | none | |
| F80 | An "Answer offline" button on the offline fallback offer | not started | none | |
| F81 | Headless eval of the chat harness and the PDF table assistant | not started | F22, F77, F57 to F62 | |
| F82 | Pi data agent for Data Explorer chat behind a switch, with a server-built prompt and tools | not started | F22, F81 | |
| F83 | Offline data agent on in-browser models | not started | F82 | |
| F84 | Offline mode replaces the model picker, and chat answers on Claude Haiku 5.5 | not started | F77, F78, F80, F82, F83, F57 to F62, F94 | |
| F85 | Agent query results as gadget cards in the chat | not started | F21, F79 | |
| F86 | Page-agnostic agent: the current page in every turn, results in the chat | not started | F21, F78, F84, F85 | |
| F87 | Column-aware placeholders keep personal values in page SQL on the device | not started | F86 | |
| F88 | Agent docs: architecture, decisions, eval, roadmap, and the page-agnostic agent specs | not started | F87, F89 to F91 | |
| F89 | Mentioned and attached gadgets reach the agent: ref tokens, `<attached>` and `<mentioned>` blocks, prompt v3 | not started | F81 to F85, F86 and F87, F21, F22 | |
| F90 | Chat composer with `@` mentions of gadgets, and mention chips in sent messages | not started | F89, F21 | |
| F91 | Chat context tray and "Add context" picker, kept per chat | not started | F89, F90, F21 (with its `ee2206125` addendum) | |
| F92 | Show the chat's empty state while a thread holds only hidden messages | not started (the bug is on `develop`) | none | |
| F93 | Let the slate's neutral.7 edge render | not started (the bug is on `develop`) | none | |
| F94 | Fuse the chat aside into the slate, and polish the chat panel | not started | F92, F93 | |
| F95 | Answer column comparisons from the schema, in today's chat and in the agent | not started | F22, F89 | |
| F96 | Plugin packages: `@avandar/plugin-manifest`, `@avandar/plugin-sdk`, and `@avandar/plugin-ui` | not started | none | |
| F97 | Bundle listed plugins as lazy chunks, check the bundle in CI, and restrict plugin imports | not started | F96 | |
| F98 | `plugin_installations`: per-workspace plugin installs with settings-admin RLS | not started | none | |
| F99 | Plugin host and the Data Explorer toolbar slot | not started | F96, F97, F98 | |
| F100 | Settings → Plugins tab | not started | F98, F99 | |
| F101 | Epidemiology plugin with linear regression | not started | F97, F99, F100 | |
| F102 | `ava plugin init` and `ava plugin validate` | not started | F96, F97 | |
| F103 | Split `VisualizationContainer` into `BuiltInVizContainer` and `UiVizConfigRenderer` | not started | none | |
| F104 | Bar gap setting for bar charts | not started | F103 | |
| F105 | Chart types in plugin manifests and the SDK, and `@avandar/plugin-ui/charts` | not started | F96, F97, F99, F100 | |
| F106 | Draw stored plugin charts in every visualization container | not started | F104, F105 (and see F21 in its section) | |
| F107 | Pick and configure plugin chart types in the Data Explorer and on dashboards | not started | F106 (and see F21 in its section) | |
| F108 | Epicurve and rate plot charts in the epidemiology plugin | not started | F101, F106, F107, F127 (see Open decisions for its e2e helpers) | |
| F109 | Plugin cards list what a plugin adds and the data it reads | not started | F100, F105 | |
| F110 | Derived columns: `avandar.dataExplorer.addColumns` with Undo | not started | F99, F101, F107, F109 | |
| F111 | Incidence rates with Byar intervals and rolling averages in the epidemiology plugin | not started | F108, F110 | |
| F112 | Plugin docs: authoring guide, package docs, and the plugin design specs and plans | not started | F96 to F111 | |
| F113 | Public dashboards: a signed-out visitor can run a published chart's query, including on a renamed column | not started (no PR; the bug is on `develop`) | none (see its section for the Postgres branch files it is written against) | |
| F114 | Displace moves geometry-column points, and is refused for lines and polygons | not started (no PR; the bug is on `develop`) | none | |
| F115 | Bind a geometry column automatically when a dataset has no latitude and longitude columns | not started | none | |
| F116 | A layer popup shows every source column by default | not started (no PR; the 12-column cap is on `develop`) | none | |
| F117 | Graduated and categorical color can classify a numeric source column that is not in the query yet | not started (no PR; the bug is on `develop`) | none (port note for before or after F31) | |
| F118 | `TruncatedText` fills its parent and shows the full text on hover by default | not started | none | |
| F119 | Edit a layer inside the layers panel, with the layer list kept on screen | not started | F31, F32, F33, F34, F35, F118 | |
| F120 | Drop the import page's header band | not started | none | |
| F121 | Show the full text of a truncated dataset name or grid column title | not started | F118 (see its section for the F22 and F23 hunks) | |
| F122 | Add a dataset from a pasted file link | not started | the Postgres branch (`validateHostNotPrivate`, `fetchEdgeFunctionRoute`) | |
| F123 | Hide the Data Explorer's form approximation badge while the drawer is collapsed | not started | none | |
| F124 | Exclude built `dist` folders from the Deno type check | not started | none | |
| F125 | Resolve the video adapter's imports when ESLint lints a batch | not started | none | |
| F126 | Per-branch local Supabase through `.env.development` overrides, with `ava supabase start`, `stop`, `prune`, and `switch remote` | PR open: [#320](https://github.com/AvandarLabs/avandar/pull/320), needs a `develop` merge and one more commit (see its section) | none | |
| F127 | E2E stability: stable map `updateConfig`, job progress re-render, Featurebase stub, pinned CI runners | PR open: [#321](https://github.com/AvandarLabs/avandar/pull/321) | none | |
| F128 | Multiple chats, a closed-chat archive, and session titles | not started | F91, F89, F90, F81 to F87, F94, F57 | |
| F129 | Data dictionaries: entries and reusable two-way code lists under Data Sources | not started | none | |
| F130 | Learn a data dictionary from datasets: profiling, matching, and suggested labels online and offline | not started | F129 | |
| F131 | Apply a dictionary to a dataset as reference: code lists on the dataset page, in the Data Explorer, and in Ask Avandar online and offline | not started | F129, F130 | |
| F132 | Data dictionary follow-ups: entry descriptions in the Description column, only editable datasets in Apply to a dataset, and tags on grouped SQL results | not started | F131 | |
| F133 | Convert coded columns with a dictionary into a linked dataset that follows it: the load-time conversion, ordered lists, unmatched values, the preview, and the dataset and dictionary surfaces | not started | F131, F132 | |
| F134 | Convert a dataset in place with a dictionary, pinned to the version applied, with the synced-data warning and Re-apply | not started | F133 | |
| F136 | Crosswalks: map datasets with different column layouts onto one reference layout and save a combined dataset, with Export mapping, the stale banner, and Used by | not started | F129, F130, F131, F132, F133, F134 | |
| F137 | Crosswalks at scale: meaning suggestions for mappings, a virtualized layout list past 100 layouts, per-dataset progress while combining, and the 100-dataset materialization measurement | not started | F136 | |
| F139 | Dashboard blocks from any page, online and offline: `add_dashboard_block`, prompt v6, and the confirm card | not started | F81 to F87, F89 to F91, F128, F22 | |

Follow-up after F1: [AVA-384](https://linear.app/avandar/issue/AVA-384), which
moves `ServiceClient`, `withQueryHooks` and `withLogger` onto the new factory
API. It's new work, not something this branch built.

## Merge order

| Order | Feature | Why here |
|---|---|---|
| 1 | F1 | Self-contained. Its only callers outside the package (QueryMediator, EtlEngine) already exist in `develop`. |
| 2 | F3 | A pure move. Every open-data PR after it edits paths under `shared/connectors/open-data`. F1 and F3 can go in either order. |
| 3 | F2 | Needs F1 (it is built on `createModuleFactory`) and F3 (it rewrites the moved open-data files onto the HttpClient). |
| 4 | F4 | Renames the schema that F6, F7 and F8 extend, and adds the shared pipeline upsert that F6 and F7 call. Schema lands before code that uses it. |
| 5 | F10 | Runner plumbing (`--limit`, `PipelineRunOptions`, `.env.pipelines.local`) that F6 and F7 use. Its new files live in `apps/pipeline-server/pipelines/shared/`, which F4 creates. |
| 6 | F6 | Needs F2 (`OpenDataHttp` is a `Pick` of `HttpClient`), F4 (the `data_catalog_listings` table and the shared upsert) and F10 (`PipelineRunOptions`, `getOptionalEnvVar`). |
| 7 | F7 | Same dependencies as F6. Independent of F6, so the two can merge in either order. |
| 8 | F8 | Adds columns to the F4 table, and its freshness check reads Socrata metadata through F6's `SocrataClient`. |
| any | F37 | Self-contained qetl fix. The untyped Parquet blob is on `develop` too, so it can merge first. |
| any | F38 | Self-contained CLI fix to `sendRunPipelineRequest.ts`. Both bugs are on `develop`, so it can merge first. F47 and F50 later rewrite the file and must keep it. |
| any | F39 | Self-contained pipeline server hardening. The unchecked `:pipelineName` import is on `develop`, so it can merge first. F52 reuses its `buildPipelineModuleUrl`. |
| after F4 | F40 | One index on the relation columns table. After F4 it is created under its final name. Before F4 it would also need renaming in F4's hand-written rename migration. |
| any | F41 | Self-contained CLI command. Rebase on #320 if that merges first (both edit `SupabaseCli.ts` and `package.json`). Carries F15's hunk if F15 merges first. |
| after F7 | F42 | Adds a mixin to F2's `HttpClientFactory` and wires it into F7's HDX client. |
| after F7 | F43 | Extends F6's and F7's discovery clients. F48 and F49 need it. |
| after F8 | F44 | Relaxes a check on the F4 table next to F8's cache CHECKs, and adds an index. Schema before the engine that writes it. |
| after F44 | F45 | The engine writes `pipeline_name` on API rows and reads F44's index. Replaces develop's module-based `EtlEngine` (built on F1) and F4's WDI load. |
| after F44 | F46 | Selects listings by `pipeline_name`, which only F44's backfill sets on older API rows. Independent of F45. |
| after F45 | F47 | `PipelineRunOptions` becomes the engine's `EtlRunOptions`. Replaces F10's `parsePipelineRunLimit`. |
| after F47 | F48 | Socrata's `run()` takes `EtlRunOptions` and its extract reads F43's ordered results. |
| after F48 | F49 | Deletes F4's shared upsert, which only the pre-engine Socrata pipeline still used until F48. |
| after F49 | F50 | Changes every pipeline's `run()` (WDI, Socrata, HDX on the engine) to return its report. |
| after F50 | F51 | Turns the per-drive report into per-crawl lines and resumes from checkpoints. |
| directly after F51 | F52 | Until F52, `ava pipeline reset` deletes listings but leaves F51's checkpoints, so the next incremental run would skip them. Do not deploy F51 alone. |
| after F52 | F53 | Its engine and store changes sit on F51's scoped crawl. |
| after F53 | F54 | Extends F53's upsert function. Its pgTAP fixture edit lands in F52's scopes test. Must deploy with its frontend (see its Rollout). |
| after F54 | F55 | Its stage timers wrap the load code F53 and F54 left, and it adds durations to F50's report. |
| after F55 | F56 | Records F46's reset and F52's prune through F55's tables and functions. |
| after F55 | F11 | Needs F10's local runner and `--limit`, F51's scope crawl (`crawlScope`) it hooks into, and F55's crawl metrics and run recording in the same files. Can merge any time after those, before F9. |
| after F54 | F12 | Extends F54's column type verification route and the F4 listings table, and F53's upsert function. Merge after the verification feature it rewrites. |
| any | F13 | Self-contained CI and scripts. Merge before the next demo branch is cut from `develop`, so it inherits the workflow. |
| any | F14 | Self-contained billing UI fix. The bug is already on `develop`, so it can merge first. |
| any | F15 | Self-contained CLI change. Its hunks in `ava supabase sql`, `ava pipeline reset`, and `ava pipeline prune-retired-scopes` go with whichever of F15 and those commands lands on `develop` second. |
| 11 | F16 | Extends the F4 listings table and upsert, both F6 and F7 pipelines, and F12's invalid-listing UI. Merge after all four. |
| 12 | F17 | Adds a column and indexes to the F4 listings table, and rewrites the catalog list that F12 and F16 extended. Merge after both. |
| 13 | F19 | Moves the catalog browser onto F17's server search: its filters, facets, and sort become search parameters, and its list keeps F17's infinite scroll. Merge after F17. |
| any | F18 | Self-contained: new tables, the record page feed, and one shared client typing fix. It touches no other feature's files. F60, F66, F68, and F72 build on its record page, so it merges before them. |
| any | F20 | Self-contained layout fix. The slate overflowing the bottom of a phone screen is already on `develop`, so it can merge first. |
| after F18 | F21 | Extends F18's rich text model, editor, and comment triggers, so it cannot land first. Otherwise self-contained. |
| any | F22 | Chat and Data Explorer code that every other feature leaves alone. Its own PRs go in the order its section gives. |
| 14 | F23 | Renames a column that F4, F6, F7, F16, F17 and F19 all read, replaces the hardcoded drive lists F6 and F7 added (`configuredDrives.ts` and `hdxDrive.ts`), and extends the search and filter rail F17 and F19 built. Merge after all of them. |
| 15 | F24 | Adds the data preview and full-screen modal to the detail pane F19 built and F23 regrouped. Merge after both. |
| after F23 and F55 | F25 | Adds the `download` blocks to F23's pipeline YAML files and a build route to the pipeline server, and its Dockerfile and README edits sit on F55's `AVA_CODE_VERSION` lines. F28, F29, and F30 build on it. |
| after F55 | F26 | Edits `getPipelineEtlDestination.ts` and each pipeline's `run.ts` as F52 and F55 left them. Its `odc-parquet-cache-spec.md` and runbook hunks go with F25. |
| 16 | F27 | Rewrites the write loop in `loadRelationsPage` that F45 built, F53 rewrote, and F23's byte cap changed, and adds a stage to the progress events F11 added. Merge after F23. |
| after F25 | F28 | Extends F25's copy request, build route, and build, and the column type sample F12 reworked. The pipeline server half must deploy before the edge function half: an older build route refuses the new `completeSampleCsv` key. |
| 17 | F29 | Changes how `DatasetParquetWrapper` and the pipeline server's copy store treat F25's Parquet copies. Merge after F25. |
| 18 | F30 | Extends the listings table, upsert, model and catalog detail that F4, F16, F17, F19, F23 and F24 built, the copy builder and `parquet-cache` route F25 and F28 changed, and reads F29's max age. Merge after all of them. |
| any | F31 | Self-contained GIS change: the map config version 6 migration, the graduated class editor, and three bug fixes. Its e2e spec adds listings through the catalog, so run that spec after F19 and F25. |
| any | F32 | Self-contained: one schema migration, one new edge function, and a new map tool. It adds an ordinary `latLngColumns` layer, so it needs no map config version and merges before or after F31. |
| after F31 | F33 | Map config version 7 migrates from version 6, which F31 introduces. Its e2e spec needs the catalog browser (F19) and Parquet copies (F25). |
| after F33 | F34 | Map config version 8 migrates from version 7, and the PDF list runs F33's feature list query and cell formatting. Its e2e spec imports a CSV, so it needs no catalog. |
| after F34 | F35 | Its "Add to dashboard" lives in F34's export sheet footer, and its snapshots bake F31's threshold colors and run F33's spatial filter query. It adds two schema migrations and its e2e spec imports a CSV, so it needs no catalog. |
| any | F36 | Self-contained fix to the onboarding checklist and the theme, both already on `develop`. The bug (the checklist covering a right-side drawer's footer) is on `develop` too, so it can merge first. |
| any | F63 | Self-contained DuckDB client fix. The bug (every case type query with records fails with `uninspectable-source`) is on `develop`, so it can merge first. F61 needs it. |
| any | F64 | Test-only fix to a `develop` test file. The leaked toast timer is on `develop` too, so it can merge first. |
| any | F65 | Self-contained package change. Merge before F66, which filters on `is: null` and orders the queue's pages. |
| any | F57 | Self-contained permissions change. It has no dependency, and F58 to F62 and F66 all check its roles. Merge F58 soon after it (see F57's known gap). |
| after F57 | F58 | Its status-change trigger checks `case_records` editor and its save RPC checks `case_types` editor. Merge before F18 if possible, so F18 keeps its tip `seedCaseRecord.ts` and `14cd6eed9` (see the F18 addendum). |
| after F58 | F59 | The status components and the Edit statuses modal need F58's model, client, and `rpc_concept_statuses__save`. |
| after F59 and F18 | F60 | Reuses F59's `StatusBadge`, `StatusDot`, `invalidateCaseStatusQueries`, and E2E seeding helper, and adds its status control to F18's `AppView` record page. |
| after F58 and F63 | F61 | Reads F58's `status_id` and statuses into the concept spine. Without F63 the spine cannot be read back, so its E2E spec fails. Independent of F59 and F60. |
| after F59 and F61 | F62 | The draft card edits proposed statuses with F59's `StatusSetEditor`, and chat's schema line points the model at F61's `status` column. |
| after F60 and F65 | F66 | Extends F60's records list filter and record header, and needs F65's `is` operator and `orderBy`. |
| after F62 and F71 to F75 | F67 | Its diff is against a draft card that already carries F62's status section and F71 to F75' per-period and value-shape controls. |
| after F66, F19, and F71 to F75 | F68 | Uses F19's `isFillHeight`, moves F18's rail into a band, and its test mocks F60's, F66's, and F71 to F75' record page hooks. |
| after F22 BUG-001 | F69 | Security fix to code already on `develop`. It rewrites `_getFunctionArgumentFromIndexes`, which F22's BUG-001 (`fix/analyzer-function-from`, `2193d0ef4`) adds to `duckDbSqlSources.ts`. Otherwise self-contained, so it can merge before any joined-cases work. |
| any | F70 | Self-contained fix to `arrowTableToJS`, already on `develop`: any query returning a non-empty list throws there, and a DECIMAL loses its scale. Merge before F72, F73, and F74, which rely on it. |
| after F57 to F62 | F71 | The concept relation files it rewrites (`loadConceptSpine`, `getConceptRelationPlansFromSql`, `buildConceptViewSql`, `makeConceptAttributeColumnsFromMetadata`, `generateIndividuals`) carry the status column F57 to F62 adds. |
| after F71 and F18 | F72 | Reads values through F71's restricted spine and key batches, and rewrites the record page that F57 to F62 and F18 rebuilt (`useHydratedIndividual.ts`, `CaseDetailsRail.tsx`). Needs F70 for list cells. |
| after F72 | F73 | Changes F71's value SQL and the case type form and draft card. Its replay test seeds `concept_statuses`, so F57 to F62 must be on `develop`. Needs F70's decimal fix: dropping the `DOUBLE` cast exposes it. |
| after F73 | F74 | Builds on F73's rule table and form fields, F72's record page, and F70's list results. Its regenerated `rpc_concepts__create` has F57 to F62's `p_statuses` signature. |
| after F74 | F75 | Per-period fields are lists of (period, value) pairs: every file F75 touches was last shaped by F74. |
| after F75, or hold | F76 | Docs for work that is not built. Needs the umbrella spec and plan index, which land with F72. |
| any | F79 | Self-contained Data Explorer chart fix. The bug (a long result drawn as one jagged series) is on `develop`, so it can merge first. F85 reuses its hook. |
| any | F80 | Self-contained. The bug (the offline offer has no accept button) is on `develop`. Its hunks go on `develop`'s `createChatModelAdapter.ts` path. |
| any | F77 | Self-contained fix for a bug on `develop`. Needs `assertMeetsMinAppRole.ts` (Postgres branch) or ports it. |
| after F22 | F78 | Fix for a bug on `develop`. Its `_userModelContent` keeps the discovery-continuation branch F22's BUG-015 wrote. |
| after F22, F77 | F81 | `runChatTurn` moves code F22 (BUG-010, C4) and F57 to F62 wrote in `PostChatMessages.ts`. The baseline harness imports F22's discovery helpers. The PDF eval runs F77's route code. |
| after F81 | F82 | Its `pi` harness extends F81's eval. Its agent imports F22's `QueryErrorKind`, `buildCandidateLookupSqlFromDiscovery`, and `getLastQuestionFromMessages`. |
| after F82 | F83 | Extends F82's agent core (preview rows, `plan_query`) and harness. |
| after F83 | F84 | Moves `createChatModelAdapter.ts`, so F78's and F80's hunks must already be in it. Its WebLLM engine implements F83's `LocalLlm`, and its offline turn runs F83's agent. Deletes `ChatModelStorage`, which `develop`'s PDF assistant used until F77. |
| after F79 | F85 | Its card splits long results with F79's hook. Needs F21's gadget card. |
| after F84, F85 | F86 | Edits the adapter at F84's path and F84's offline agent turn, and writes F85's result parts. |
| after F86 | F87 | Rewrites F86's page block and host. Merge it right after F86, before anyone turns the agent switch on, since F86 sends page SQL with only pattern-based redaction. F89 to F91 builds on F87. |
| after F87 and F89 to F91 | F88 | The docs describe all of D1 and F89 to F91, whose commits edit the same files. |
| any | F92 | Self-contained fix: one component and one new helper. The bug is on `develop`, so it can merge first. |
| any | F93 | Self-contained fix in the theme and the slate's stylesheet. The bug is on `develop`, so it can merge first. |
| after F92 and F93, before F81 to F85 | F94 | Shares `AppSlate.module.css`, `Theme.ts`, and `DESIGN.md` hunks with F93, and its restyled empty state only shows once F92 is in. F81 to F85's `5f51ce819` deletes the model picker F94 restyles and puts `OfflineModeControl` into the composer foot F94 built, so F94 first keeps both diffs as written. |
| after F86 and F87, F21, F22 | F89 | Extends the page block, turn text, prompt, adapter, and agent turn that F81 to F85 and F86 and F87 built, reads F21's `Gadget` model, and extends F22's `getLastQuestionFromMessages` and `applyChatModelTurnResponse.ts`. |
| after F89 | F90 | The composer writes F89's ref tokens, and only F89 makes the agent and today's chat read them without leaking names. Extends F21's `@` menu. |
| after F90 and F21's `ee2206125` | F91 | Mounts the tray in F90's composer and fills F89's `<attached>` block. Its picker finds saved tiles only with `ee2206125`. Its e2e spec drives mentions and the tray together. |
| after F22 and F89 | F95 | Edits F22's Data Explorer prompt and `applyChatModelTurnResponse.ts`, and F89's prompt v3 and eval categories. |
| any | F96 | Self-contained packages with their own tests. Carries the `ensureChangesets` private-package skip, so it must not be split from it. |
| any | F98 | Self-contained schema, model, and client. Nothing reads it until F99. |
| any | F103 | Pure refactor. `develop`'s `VisualizationContainer.tsx` and its CSS module are identical to `bd4c8907e^`, so the commit applies as is. |
| after F103 | F104 | Its renderer hunk lives in `UiVizConfigRenderer.tsx`, which F103 creates. |
| after F96 | F97 | The Vite plugin reads manifests through `@avandar/plugin-manifest/node`, and `PluginIndex.types.ts` imports both new packages. |
| after F97, F98 | F99 | The host reads installs (F98) and the virtual plugin index (F97). |
| after F99 | F100 | The tab uses F99's `loadManifestModules`, `getPluginInstallStatusFromInstallation`, and `pluginIndexHelpers`. |
| after F100 | F101 | First plugin in `plugins/bundled.yaml`. Its e2e spec installs it from F100's tab and runs it from F99's toolbar. |
| after F97 | F102 | Reads `plugins/bundled.yaml` and runs ESLint with F97's plugin import rules. Lands before or after F101. |
| after F100 | F105 | Adds `vizTypes: []` to manifest fixtures in F99 and F100 test files, and icons to F97's module sources. |
| after F104, F105 | F106 | Maps a chart spec's `barGap` (F104) into a built-in bar chart and reads F105's manifest chart types. F21: see the shared files rows. |
| after F106 | F107 | Replaces F106's `null` plugin settings subform with the real form, and builds on F106's viz config union. |
| after F101, F107, F127 | F108 | Declares chart types in F101's plugin. Its e2e spec picks the epicurve through F107's picker. |
| after F100, F105 | F109 | Lists F105's chart types on F100's card, and replaces F100's `getContributionCountsFromManifest`. |
| after F107, F109 | F110 | Edits the Data Explorer state files F107 changed, and adds a row to F109's `PluginDataAccessSection.tsx`. |
| after F108, F110 | F111 | Calls F110's `addColumns`. Its e2e spec draws the incidence columns as F108's rate plot. |
| after F111 | F112 | Docs last: the authoring guide and package docs describe the merged features as a whole. |
| any | F113 | The bug is on `develop`, so it can merge first. It edits `QueryMediator`, `PublicQuerySession`, and the relation loader, which F1 and the Postgres branch also edit: take only its hunks. |
| any, before F33 | F114 | The bug is on `develop` and the files are unchanged there. F33 and F35 later extend `displaceSpatialFeatures`, so landing first keeps their PRs on the final shape. |
| any | F115 | Self-contained on `develop`: every file it edits is unchanged there since the branch base. |
| any, before F33 | F116 | The 12-column popup cap is on `develop`. Two of its test files are also edited by F33. |
| any, before F31 | F117 | The bug is on `develop`. If it lands first, port it without F31's `classLabels` and `GraduatedClassList` (see its section). If F31 lands first, take the final files. |
| any, before F119 | F118 | Self-contained `@avandar/ui` change. F119, and F121's grid titles, sidebar names, and catalog list names, which `52c823754` moved onto it, need it first. |
| after F35 | F119 | Rewrites the panels F32 to F35 add to, edits the e2e specs of F31 to F34, and removes the inspector slot from `GisAppMapShell.tsx`, which F32 to F35 all edit. Needs F118 for its truncated names. |
| any, before F19 | F120 | Self-contained change to `DataImportView.tsx`, which `develop` has. F19's tab spacing addendum (`4c7c9d760`) sizes the tab strip for a page with no header band. |
| after F118 | F121 | UI change on files `develop` has, rendering F118's `TruncatedText`. Its `makeDataGridColumnDefs` hunks go with whichever of F121 and F22 lands second, and its `DataCatalogListingList.tsx` hunk with whichever of F121 and F23 lands second. |
| after the Postgres branch | F122 | Its edge function guards hosts with the Postgres branch's `supabase/functions/_shared/validateHostNotPrivate.ts`, and its client extends the Postgres branch's `src/clients/fetchEdgeFunctionRoute/`. |
| any | F123 | The badge showing on a collapsed drawer is on `develop`, so it can merge first. |
| any | F124 | The failing `deno check` of built `packages/**/dist` output is on `develop`, so it can merge first. |
| any | F125 | The unresolved adapter imports in a batch lint are on `develop`, so it can merge first. |
| any | F126 | PR #320 is open. Merge `develop` into it first: `develop`'s `183a41c50` rewrote the same `AGENTS.md` section. Coordinate with F15 (#319), which edits `apps/ava-cli/src/main.ts` and `apps/ava-cli/README.md` too. |
| any, before F35 | F127 | PR #321 is open and fixes bugs that are on `develop`. F35's `aad4d700d` later splits `useHydratedMapSources.ts`, so F35 is easier to port once this is in. |
| after F91, F94, F57 | F128 | Makes F91's tray and the thread per session, adds tabs to F94's panel header, and starts a case-design session from F57's New case type controls. Its title excerpt masks F89 and F90's mention tokens. |
| any | F129 | Adds its own tables, models, clients, route, and view, so it can merge first. It edits `DataManagerApp.tsx`, `DatasetNavbar.tsx`, and the generated schema files, so take only its hunks if F20 or F121 landed first. |
| after F129 | F130 | Builds on F129's tables, save RPC, models, and Dictionary view. Changes the save RPC's pair check (migration). Deploy the migration, then the `chat` edge function, then the frontend. |
| after F130 | F131 | Builds on F129's tables and Dictionary view and F130's profiling, create flow, and dataset menu item. Adds the bindings table and the apply RPC (migration) and prompt `data-agent-v5`, which is the plugin AI tools' `data-agent-v4` plus the coded-column rules. Deploy the migration, then the `chat` edge function (it serves v5 and reads bindings, and the new frontend asks for v5), then the frontend. |
| after F131 | F132 | Builds on F131's bound-column name, Apply to a dataset dialog, and Data Explorer tags. Adds `rpc_datasets__get_editable_ids` (migration). Deploy the migration, then the frontend: the new dialog calls the RPC. |
| after F132 | F133 | Builds on F131's bindings, apply RPC, apply flow, popover, rail, and Used by, and F132's editable-ids RPC. Adds the conversion columns, the keep-original link, `linked_source_dataset_id`, pin-on-delete triggers, and three RPCs (migration). Deploy the migration, then the `chat` edge function (it reads the new binding columns and describes a converted column by its labels), then the frontend. |
| after F133 | F134 | Frontend only: F133's migration already carries the pinned columns and `rpc_dataset_columns__reapply_dictionary`. Deploy the frontend. |
| after F134 | F136 | Builds on F130's scorer and pick table, F131's bindings, popover, and Used by, F133's `ColumnConversion`, linked-dataset creation, virtual dataset freshness, and `clearCachedDatasetRows`, and F134's Re-apply in Used by. Adds five crosswalk tables and two RPCs (migration) and the desktop sync entries. Deploy the migration, then the frontend; the desktop app syncs the new tables from its next build. |
| after F136 | F137 | Frontend only: F136's migration carries everything it reads. Deploy the frontend; the `chat` function is unchanged (same prompt, same route). |
| after F128, F131 | F139 | Stores each session's dashboard card statuses beside its thread and tray, and adds the card to F128's panel. Its e2e specs read F128's session tabs. Its prompt `data-agent-v6` is F131's `data-agent-v5` plus the dashboard rules, and its proxy adds the dashboard tool to the plugin AI tools' per-version list, so it ships after F131 and the plugin AI tools. Deploy the `chat` edge function (it serves v6), then the frontend (it asks for v6). |
| 19 | F9 | Last, because the docs describe the merged features. |

F5 is dropped: the Postgres branch carries the `external-datasets` to
`connectors` rename.

## Files shared by several features

Take only your feature's hunks from these files. The last feature in the
"Owners" column, by merge order, brings the file to its final state.

| File (final path) | Owners, in merge order | Each owner's hunks |
|---|---|---|
| `shared/connectors/open-data/acquireOpenDataResource.ts` | F3, F4, F6, F8 | F3: move and `ckan*` field rename. F4: `DataCatalog*` names. F6: dispatch by `api_service`, Socrata branch. F8: the shared `formatToContentKind` import and the `OpenDataApiAccessFor` type. |
| `shared/connectors/open-data/acquireOpenDataResource.test.ts` | F3, F2, F4, F6, F8 | F2: `getJson` becomes `get`. F6: Socrata dispatch cases. F8: cache-column fixtures. |
| `supabase/functions/open-data/OpenDataRoutes.ts` | F3, F2, F4, F8 | F2: the `HttpClientFactory.create` line. F4: listing renames. F8: cache-aware acquisition wiring. |
| `supabase/functions/open-data/statusFromOpenDataFailure/statusFromOpenDataFailure.ts` | F3, F6 | F6: Socrata failure codes (`d9f488ff1`). |
| `shared/connectors/open-data/openDataErrors.ts` | F3, F6 | F6: Socrata failure codes. |
| `shared/connectors/open-data/CkanClient/CkanClient.ts` | F3, F2, F7 | F2: `get`. F7: `ckanActionApiHelpers` refactor. |
| `shared/models/data-catalog-listings/DataCatalogListing/*` | F3, F4, F6, F8, F17, F19 | F3: `OpenDataAccess` field rename (`65b4cc8ad`). F4: the rename itself. F6: the `socrata` `api_service` arm. F8: cache fields. F17: `search_vector` in `DBReadSchema` and dropped by `fromDBReadToModelRead`, and the `SearchResult` type. F19: `SearchResult`'s `fileFormat` and `lastUpdatedAt`, and the `SearchFilters`, `SortBy`, `UpdatedWithin`, `FacetOption`, and `SearchFacets` types. |
| `src/views/DataManagerApp/DataImportView/DataCatalogView/{DataCatalogView,DataCatalogListingList/DataCatalogListingList}.tsx` and their CSS modules | F12, F16, F17, F19 | F12 and F16: see their sections. F17: server search through `useDataCatalogSearch`, the infinite-scroll list, and the by-id detail fetch. F19: the full-height three-pane layout, filters, facets, sort, and the filter drawer, all on F17's search. |
| `supabase/schemas/00.enum.data_catalog_listings__api_service.sql` | F4, F6 | F4: rename. F6: the `socrata` value. |
| `supabase/schemas/10.data_catalog_listings.sql` | F4, F8, F17 | F4: rename and the non-partial `api_resource` unique index. F8: cache columns and their CHECK clauses. F17: the `search_vector` column and its two GIN indexes. |
| `supabase/tests/database/data_catalog_listings_access.test.sql` | F4, F8 | F4: rename and the index test. F8: cache-column and `pipeline_access_complete` tests. |
| `apps/pipeline-server/pipelines/world-bank__wdi/run.ts` | F1, F4, F10 | F1: `EtlEngine.create(name, { state })`. F4: `createSupabaseAdminClient` import from `pipelines/shared`. F10: `run(options)` rejecting `--limit`. |
| `shared/types/database.types.ts` | F4, F6, F8, F17, F19 | Generated: regenerate in each. |
| `src/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingDetail/DataCatalogListingDetail.tsx` | F12, F16, F19, F23 | F12: `DataCatalogInvalidNotice`. F16: `DataCatalogUnsupportedNotice`, the `isWorkspaceLoadable` guard on the invalid notice, and `!listing.isWorkspaceLoadable` in `isAddBlocked`. F19: the scrolling body, pinned foot, back button, and fact list. F23: the Published by, About, Source, and Technical details groups, the clickable topic and keyword chips, and the drive read. F24: the expand button, the `preview`, `isExpanded`, and `onExpand` props, `ListingDescription`, the `factsRail` split, and the data preview section. |
| `supabase/schemas/11.data_catalog_listings.sql` (F4, F8, F17 know it as `10.data_catalog_listings.sql`) | F4, F8, F17, F23 | F23: the rename to `11.` (so `10.data_catalog_drives.sql` sorts first), `external_organization_name` becomes `organization1_name`, the new organization, `domains`, `tags`, `source_metadata`, and `drive_id` columns, the wider `search_vector`, and the filter indexes. |
| `supabase/schemas/51.data_catalog_listings__search_matches.sql`, `52.rpc_data_catalog_listings__search.sql`, `52.rpc_data_catalog_listings__search_facets.sql` | F19, F23 | F23: the `organization1_name` rename, the level-2, topic, and keyword filters and facets, and the organization columns in the output. |
| `apps/pipeline-server/pipelines/etl.config.yaml`, `packages/node/etl/src/EtlConfig/**` | F16, F23 | F23: per-pipeline loadability overrides move into each `<pipeline>.pipeline.yaml`, and the config parser, field mapper, and organization label lookup are added. |
| `apps/pipeline-server/pipelines/{socrata,hdx}/**` and `packages/node/etl/src/{EtlEngine,stores}/**` | F6, F7, F10, F16, F23 | F23: YAML drives and mappers replace the hardcoded drive lists in `configuredDrives.ts` and `hdxDrive.ts`, the engine writes each drive row and `drive_id`, and listing rows carry the new columns. |


### ETL engine and pipelines (F37 to F56)

| File (final path) | Owners, in merge order | Each owner's hunks |
|---|---|---|
| `apps/pipeline-server/pipelines/hdx/createHdxHttpClient/createHdxHttpClient.ts` and its test | F7, F42, F49 | F7: the rate-limited client with no API key (as of `127b6c0d9`). F42: `withRetryOnTooManyRequests` and the `sleep` param. F49: the 128 MB response cap. |
| `shared/connectors/open-data/CkanDiscoveryClient/*` | F7, F43, F49, F51, F23 | F43: `searchDatasets` with the keyset cursor, required filter, and skipped datasets. F49: drops `listDatasets` (`package_list`). F51: the `resourceFormats` filter. F23: `sourceRecord`. |
| `shared/connectors/open-data/SocrataDiscoveryClient/*` | F6, F43, F51, F53, F16, F23 | F43: `order`, `createdAt`/`updatedAt`, `resultSetSize`, skipped results. F51: `categories` and `tags`. F53: the column fields. F16 and F23: see their sections. |
| `shared/connectors/open-data/CkanClient/*` (adds to the existing `CkanClient.ts` row) | F3, F2, F7, F43, F53, F23 | F43: `createCkanPackageFromWire/` extracted from `CkanClient.ts`. F53: the `fs_check_info` headers and `readHdxFileHeaders/`. |
| `packages/node/etl/README.md` | F45, F51, F53, F54, F55, F16, F23, F27 | F45: the rewrite for the new engine. F51: scopes and checkpoints. F53: one-transaction writes. F54: verified and empty column sets. F55: execution recording. |
| `packages/node/etl/src/EtlEngine/{EtlEngine.types.ts,createEtlEngine/**,crawlScope/crawlScope.ts,loadRelationsPage/**}`, `packages/node/etl/src/stores/**`, `packages/node/etl/src/index.ts` | F45, F51, F53, F54, F55, F11, F16, F23, F25, F27, F30 | F45 creates them (`crawlScope.ts` is F45's `crawlDrive/crawlDrive.ts`, renamed by F51). Each later A feature's hunks are in its section. This corrects the log's "`loadRelationsPage` that F4 built": F45 built it and F53 rewrote its write loop. |
| `apps/pipeline-server/pipelines/{socrata,hdx}/**` (replaces the existing row's owner list) | F6, F7, F42, F48, F49, F50, F51, F52, F53, F54, F55, F16, F23, F25, F26 | F48 and F49 move each pipeline onto the engine (F6's and F7's enumerate-and-upsert files are deleted). F50: `run()` returns the report. F51: scopes. F52: `listScopes`. F53 and F54: columns. F55: resource sizes. |
| `apps/pipeline-server/pipelines/world-bank__wdi/run.ts` (replaces the existing row) | F1, F4, F10, F45, F47, F50, F52, F26 | F45: `createWdiEtlEngine(getPipelineEtlDestination())`. F47: passes `options` through. F50: returns the report. F52: `listScopes`. |
| `apps/pipeline-server/pipelines/shared/getPipelineEtlDestination/*` | F45, F51, F53, F55, F23, F26 | F45: the file. F51: `checkpointsTable`. F53: `upsertListingsFunction`. F55: the execution store. |
| `apps/pipeline-server/src/routes/pipeline-name/{registerPipelineRoutes.ts,run/run.ts}` and their tests | F10, F39, F47, F50, F51, F52, F55, F25, F26 | F39: the name check and its 400. F47: the run body schema and 400 for bad options. F50: the report in the response. F51: `scopes`. F52: `GET /:pipelineName/scopes`. F55: the server invocation. |
| `scripts/runPipelineOnce.ts` | F10, F47, F50, F51, F55 | F47: strict flags. F50: prints the report. F51: `--scopes`. F55: the local invocation. |
| `apps/ava-cli/src/PipelineCli/{RunPipelineCli/RunPipelineCli.ts,runPipelineLocal.ts,sendRunPipelineRequest.ts}` and their tests | F10, F38, F47, F50, F51, F55, F11, F26 | F38: the error body and the undici `Agent`. F47: the new flags. F50: the report. F51: `--scope`. F55: the CLI invocation. |
| `apps/ava-cli/src/PipelineCli/PipelineRunReport/**` | F50, F51, F55, F11 | F50: the files. F51: one line per crawl. F55: durations. F11: the skipped-crawl label. |
| `apps/ava-cli/src/PipelineCli/ResetPipelineCli/*` | F46, F52, F56, F15 | F46: the command. F52: checkpoints first, `--scope`, `announcePostgrestTarget`. F56: recording. F15: `getLoadedEnvName` and the help text. |
| `apps/ava-cli/src/PipelineCli/PruneRetiredScopesCli/PruneRetiredScopesCli.ts` | F52, F56, F15 | F52: the command. F56: recording. F15: `!AvaEnv.isLocal()` and the help text. |
| `apps/ava-cli/src/SupabaseCli/SupabaseSqlCli/*` | F41, F15 | F15: `!AvaEnv.isLocal()`, `getLoadedEnvName()`, and the help text. |
| `apps/pipeline-server/README.md` | F10, F50, F51, F52, F53, F54, F55, F16, F23, F25, F26, F27 | F10: the API-key bullet as `127b6c0d9` rewrote it. F50: run modes and report lines (`27501de72`). F51: scopes (`6c9450fd6`). F52: reset `--scope`, prune, and the deploy-order paragraph. F53: how listings get columns. F54: unverified text columns. F55: "Execution history" and the `AVA_CODE_VERSION` deploy line. |
| `supabase/schemas/11.data_catalog_listings.sql` (`10.` before F23; adds to the existing row) | F4, F8, F44, F51, F54, F12, F16, F17, F23 | F44: the relaxed `data_catalog_listings__api_access_complete`, the `data_catalog_listings__pipeline_drive_last_update` index, the column comments. F51: `pipeline_scope_keys` and the index and `date_of_last_update` comments. F54: `date_column_type_last_verified`. |
| `supabase/tests/database/data_catalog_listings_access.test.sql` | F4, F8, F44 | F44: API listings may name their pipeline, and the index test. |
| `supabase/schemas/50.rpc_data_catalog_listings__upsert_with_relation_columns.sql` and its pgTAP test | F53, F54, F12, F16, F23, F25, F30 | F53: the function. F54: keeps verified columns, accepts an empty column list. |
| `supabase/schemas/50.rpc_data_catalog_listings__write_verified_column_types.sql` and its pgTAP test | F54, F12, F23 | F54: the function. F12: clears the invalid mark. |
| `supabase/schemas/20.datasets__open_data.sql` | F4, F54, F16 | F54: the verified-only add trigger. |
| `supabase/tests/database/rpc_data_catalog_listings__pipeline_scopes.test.sql` | F52, F54, F23 | F54: a fixture update. |
| `supabase/tests/database/permissions/exact_data_api_grants.test.sql` | F4, F51, F55, F18, F21, F131, F136 | F51: `pipeline_scope_checkpoints`. F55: the two execution tables. F131: `dataset_columns__dictionary_bindings` as select-only (`cefb14f16`). F136: `crosswalks` and its four child tables, the children as select-only (`0342d9410`). |
| `apps/desktop/sync/syncable-tables.ts` | F4, F51, F55, F18, F21, F23 | F51 and F55: their service-role tables in `EXCLUDED_TABLES`. |
| `apps/desktop/scripts/gen-sqlite-migrations/getManualMigrationBodyFromSourceFile.ts` | F51, F23 | F51: the `pipeline_scope_keys` SQLite override, keyed by its migration's filename. |
| `scripts/test-dashboard-publishing-migrations.sh` | F44, F51, F23 | F44 and F51: the replay of their hand-written backfill migrations, keyed by filename. |
| `shared/models/data-catalog-listings/DataCatalogListing/*` (adds to the existing row) | F3, F4, F6, F8, F44, F51, F54, F12, F17, F19 | F44: `pipelineName` and `dateOfLastUpdate` docs. F51: `pipelineScopeKeys`. F54: `dateColumnTypeLastVerified`. |
| `supabase/functions/open-data/OpenDataRoutes.ts` and `OpenDataRoutes.types.ts` (adds to the existing row) | F3, F2, F4, F8, F54, F12, F25, F28, F30 | F54: the `column-type-sample` and `column-types` routes. |
| `src/views/DataManagerApp/DataImportView/DataCatalogView/{DataCatalogView.tsx,DataCatalogListingDetail/DataCatalogListingDetail.tsx}` (adds to the two existing rows) | F4, F54, F12, F16, F17, F19, F23, F24, F25 | F54: the dwell verification, the coordinator, waiting before Add, and the Columns section. |
| `src/lib/openData/{verifyOpenDataColumnTypes/**,createColumnTypeVerificationCoordinator/**,ColumnTypeVerifications.ts}` | F54, F12, F16, F17, F24, F28 | F54 creates them. |
| `apps/pipeline-server/Dockerfile` | F55, F25 | F55: the `AVA_CODE_VERSION` build arg. |
| `shared/types/database.types.ts` | F44, F51, F52, F53, F54, F55 (and the existing owners) | Generated: regenerate in each. |

### Case statuses and assignment (F57 to F68)

| File (final path) | Owners, in merge order | Each owner's hunks |
|---|---|---|
| `supabase/schemas/20.individuals.sql` | F57, F58, F21, F66 | F57: the three write policies (`case_types` editor or `case_records` editor to insert and update, `case_records` admin to delete). F58: `status_id`, `individuals__status_fkey`, `idx_individuals__concept_id_status_id`, the `individuals__set_default_status` and `individuals__check_status_change` triggers, and dropping the free-text `status` column `develop` has. F21: `idx_individuals__workspace_id`. F66: `individuals__check_assignment_change`, its trigger, and `idx_individuals__workspace_id_assigned_to`. |
| `supabase/schemas/10.concepts.sql` | F57, F58 | F57: write policies on `case_types` roles. F58: `default_status_id` and its deferred composite FK. |
| `supabase/schemas/20.concept_attributes.sql`, `30.attribute_mappings__dataset_column.sql` | F57, F58, F71 to F75 | F57: write policies. F58 (`concept_attributes` only): the `concept_attributes__name_not_reserved` check and the trigger comment that names `rpc_concepts__create`. F71 to F75: period and date column fields. |
| `supabase/schemas/50.rpc_concepts__create.sql` and `supabase/tests/database/rpc_concepts__create.test.sql` | F58, F71 to F75 | F58: the whole RPC. F71 to F75: per-period fields, no value rule for every-value fields, list key refusals. |
| `supabase/tests/database/permissions/rls_{concepts,concept_attributes,attribute_mappings__dataset_column,attribute_mappings__manual_entry,individuals}.test.sql` | F57, F58 | F57: the role assertions (`1eefc5ddb`, `e476a3aea`, `276ba8a41`, `a144db68c`, `d493f4ce0`). F58: fixtures that give each case type a default status (`2f7e4dd9d`). |
| `scripts/test-dashboard-publishing-migrations.sh` | F44, F51, F57, F58, F23, F71 to F75 | F57: the `case_app_roles_backfill` replay. F58: the `case_statuses_backfill` replay. Each block names its backfill migration's file, so update the path to the regenerated timestamp. |
| `tests/e2e/helpers/insertE2ECaseType.ts` | F57, F58 | F57: the helper as of `35c4cbc1d` (direct inserts). F58: seeds through `rpc_concepts__create` (`bbde69d01`, final). |
| `apps/desktop/sync/syncable-tables.ts` | F58, F18, F21, F35, others | F58: `concept_statuses` in `ACTIVE_TABLES` and its comment line. |
| `src/views/IndividualManagerApp/SingleIndividualView/index.tsx` | F18, F60, F71 to F75, F66, F68 | F18: the `AppView` page, feed, and rail. F60: the statuses fetch, `RecordStatusControl` as the header's `titleAccessory`, and `RecordFactsGroup` as the rail's child. F71 to F75: `useRecordFields`. F66: the `Group` wrapper and `RecordAssigneeControl`. F68: the details band and activity pane. |
| `src/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail.tsx` | F18, F60, F71 to F75, F68 | F60: the `children` prop ("Further rail groups"). F71 to F75: `RecordFieldValue`, source lists, load error. F68: the doc comment. |
| `src/views/IndividualManagerApp/index.tsx` | F18, F60 | F18: the non-scrolling outlet column. F60: the `IndividualNavbar/IndividualNavbar` import and `key={concept.id}`. |
| `src/views/IndividualManagerApp/IndividualNavbar/{IndividualNavbar,IndividualNavbarRows}.tsx`, `useConceptIndividuals.ts`, `useVirtualIndividualLinks.tsx` | F60, F66 | F60: the `AppListPane` list, status filter, count, and status dots. F66: the assignee filter, the assignee under each row, and `makeRecordsListWhere`. |
| `src/views/IndividualManagerApp/invalidateCaseStatusQueries/*` | F59, F66 | F59: the status keys (record loader, records list and count, Data Explorer queries). F66: the assignee queue and filter keys. |
| `src/routes/_auth/$workspaceSlug/individual-manager/$conceptId/index.tsx` | F57, F18, F60 | F57: hide the Case Manager link without `case_types` access. F18: `DetailPaneMessage` (`f8e28eda0`). F60: `useConceptIndividuals({ conceptId })`. |
| `src/components/ChatPanel/CaseTypeDraftBlock/*` | F64, F57, F62, F71 to F75, F67 | F64: the `notify` mock in the test. F57: hide Create case type without `case_types` editor. F62: `CaseTypeDraftStatusSection` and the status set in the editor. F71 to F75: value shape and per-period controls. F67: the dataset picker, switching, and join-key choice. |
| `src/views/OntologyDesignerApp/ConceptCreatorView/{index.tsx,conceptFormTypes.ts}`, `createdCaseTypeToFormValues/*`, `insertConceptFromFormValues/*`, `ConceptMetaView/generateIndividuals/*` | F58, F59, F62, F71 to F75 | F58: statuses on the form values, the default set, creation through the RPC, the reserved-name check, and Sync omitting `status_id`. F59 (`index.tsx` only): `ConceptStatusesFieldset`. F62 (`createdCaseTypeToFormValues` only): chat's statuses. F71 to F75: value shapes and periods. |
| `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeActions.{tsx,test.tsx}` | F57, F58, F59 | F57: hide what a role cannot use. F58: fixture `defaultStatusId`. F59: the rebuilt header actions and overflow menu. |
| `src/components/layouts/RootLayout/makeMainNavbarLinksFromPermissions.ts`, `WorkspaceLayout/WorkspaceLayout.test.ts` | F57, F66 | F57: case links only with a case role. F66: the Assigned to me link. |
| `shared/models/Permissions/PermissionsModule/PermissionRegistry.ts` | F57, F96 to F102 | F57: the `case_types__*` and `case_records__*` keys. |
| `packages/shared/clients/src/SupabaseCrudClient/createSupabaseCrudClient.ts` | F18, F65 | F18: the column-keyed filter iteration. F65: the `is` arm and `orderBy`. |
| `src/clients/qetl/QueryMediator/conceptRelation/**`, `tests/integration/queries/*`, `shared/models/queries/{QueryColumn,ConceptStatusColumn}/**`, `src/clients/queries/runStructuredQuery/*` | F58 (one fixture), F61, F71 to F75 | F61: the status column, `spineRows`, `toCsvRows`, `status` in every view. F71 to F75: list and per-period fields, case-insensitive names, spine restrictions, and the `uuid`-free `ConceptStatusColumn` imports (`f39ebdd30`). |
| `shared/models/chat/SqlTableAlias/*`, `fetchWorkspaceSchema.ts`, `buildSqlSystemPrompt.ts`, the offline chat schema files, `parseProposeCaseType.ts`, `buildCaseManagerSystemPrompt.ts`, `makeChatToolConfigFromOptions.ts`, `shared/types/{chat,offlineChat}.types.ts` | F62, F71 to F75, F81 to F85 | F62: statuses in the schema line and in `proposeCaseType`. The others add field shapes and alias mapping. |
| `tests/e2e/helpers/CaseTypeSeedHelpers.ts` | F61, F71 to F75 | F61: the helper and its cleanup (`cbf0b48b0`, `16e56ced1`, `b7172aafa`). F71 to F75: per-month fields (`ee2f4a4ad`). |
| `apps/ava-video-producer/avandar-adapter/CasesScreen/*` | F18, F60, F71 to F75 | F60: `CasesScreen.{tsx,module.css}` stop importing the deleted `IndividualNavbar.module.css` (`e43da0e95`). F18: `RecordDetail.tsx`. |
| `src/components/layouts/AppView/AppViewBody/AppViewBody.module.css` | F19, F68, F131 | F19: `isFillHeight`. F68: `noPadding` plus fill-height drops the trailing padding. F131: the rail width reads `--ava-app-view-rail-width`, so the Apply view can widen it (`dd1bc5bec`). |
| `src/components/layouts/AppView/AppViewHeader/{AppViewHeader.tsx,AppViewHeader.module.css,AppViewHeader.test.tsx}` | F131 | F131: an optional `breadcrumb` shown small above the title (`dd1bc5bec`). Shared layout, so any later feature that changes the header band takes this hunk too. |
| `docs/ontology-architecture.md` | F58, F59, F60, F61, F62, F18, F71 to F75, F66, F68 | F58: `e229237bf`. F59 and F60: their screen rows of `9396bce96`. F61 and F62: their halves of `a55c41a73`. F66: the assignee filter (`4ac9b2821`). F68: the details band (`cb76ac57a`). |
| `docs/production-plan-world-humanitarian-day.md` | F18, F21, F61, F66, others | F61: the roadmap hunks of `a55c41a73` (P5b.1 done, and the P5c.3 to P5c.9 status notes). F66: P5c.3, P5c.6, and P5c.8 (`f177ec60b`). |
| `shared/types/database.types.ts`, `apps/desktop/migrations/*.gen.sql`, `src/i18n/locales/*/messages.{po,ts}`, `src/routeTree.gen.ts` | F57, F58, F59, F60, F62, F66, F67, F131, F132, F133, F134, F136, F137 | Generated: regenerate in each. F131: regenerate for its migration, route, and messages. F132: regenerate for its migration and messages. F133: regenerate for its migration and messages. F134: messages only. F136: regenerate for its migration, route, and messages. F137: messages only (`abdafb519`). |

### Joined cases (F69 to F76)

| File (final path) | Owners, in merge order | Each owner's hunks |
|---|---|---|
| `src/clients/DuckDbClient/duckDbRawQuery.ts` | F69, F70 | F69: `RawQueryReadScope`, `_getReadScope`, `_assertPublicReadAnalysis` (no non-dataset relation, no internal table, one plain query). F70: the `duckDbArrowResults/duckDbArrowResults` import path. |
| `src/clients/DuckDbClient/duckDbSqlText.ts` | F69, F71, F75, F133 | F69: `isStagingIndividualsTableName` needs a UUID suffix (`025b6de3d`). F71: `getEntityKeyComparisonSql` quotes with `quoteSqlIdentifier` (`4a2334cf8`). F75: `DATASET_ALIAS`, `buildTextExtremeSql` moved here from `buildAttributeValueSql.ts`, zoned timestamp handling (`2faaf6679`). F133: `getQueryStringFromParams` substitutes each parameter once and literally (`0d11e2dba`), and the conversion projection, kept-`ENUM`-values queries, and `ava_raw_` view names (`b603b61b8`, `b195ad2e8`). |
| `src/clients/maps/MapLayerSpatialQuery/compileBufferOfLayerQuery/compileBufferOfLayerQuery.test.ts` | F69, F33 | F69: the expected analysis gains `internalTableNames: []`. F33: its buffer tests. |
| `src/clients/DuckDbClient/duckDbArrowResults/duckDbArrowResults.{ts,test.ts}` | F70, F75 | F70: the move into the folder, lists as plain arrays, struct and map rows, decimals through the exact decimal string, list dates, timestamps, and times as text (state at `8da6e68d4`). F75: dates inside list elements and struct fields as text (`e2570144f`), decimals inside a MAP or UNION keep their scale (`ae30326dd`). |
| `shared/models/queries/QueryResult/QueryResult.types.ts` | F70, F75 | F70: `isArray` on a result field. F75: `bucketGrain`. |
| `src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/buildAttributeValueSql.{ts,executed.test.ts}` | F71, F73, F74, F75 | F71: the file and the NULL rule. F73: each rule's own output type, alphabetical text `max`/`min`. F74: read by value shape. F75: the per-period branch (`buildTextExtremeSql` leaves for `duckDbSqlText.ts`). |
| `src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql.{ts,executed.test.ts}` | F57 to F62, F71, F73, F74, F75 | F57 to F62: the status column. F71: `attributeId` on columns, case-insensitive reserved names, values from `buildAttributeValueSql`, exported `EXTERNAL_ID_COLUMN`. F73: rule types and tests (incl. `f1bd3ada5`'s test tidy). F74: value shape, view column names from `ConceptAttribute.getViewColumnNames`. F75: per-period columns. |
| `src/clients/qetl/QueryMediator/conceptRelation/{makeConceptAttributeColumnsFromMetadata.ts,__tests__/conceptAttributeColumns.integration.executed.test.ts}` | F57 to F62, F71, F72, F73, F74, F75 | F71: `attributeId`, case-insensitive suffixing. F72: comment and test-comment wording after `AttributeAssertionClient` is deleted. F73: refuse a disallowed rule (`3e6d417c8`, `5213b4e02`), column Ava type. F74: value shape, shared view column names. F75: per-period columns and the date column. |
| `src/clients/qetl/QueryMediator/conceptRelation/{getConceptRelationPlansFromSql/*,loadConceptSpine/loadConceptSpine.ts,conceptRelation.types.ts,getConceptAttributeColumnsFromConceptId.ts}` | F57 to F62, F71, F72, F74, F75 | F57 to F62: status name in the spine. F71: `ConceptSpineRestriction`, restricted spines, the collision message. F72: `a9730f086`'s hunk, comment updates (`c6b410ad3`). F74: `61bf863d9` in `loadConceptSpine.ts`. F75: fetch the date column (`b27358007`, `394d9090c`). |
| `src/clients/qetl/QueryMediator/{QueryMediator.ts,QueryMediator.types.ts,queryRunner.ts}`, `src/clients/qetl/QueryMediator/relationLoading/createRegistryForFetch.ts`, `src/clients/qetl/wrappers/createDefaultRegistry.ts` | F1, Postgres branch, F71, F133, F137 | F1: named create calls (`9377eb6c8`). Postgres branch: the registry and relation-loading refactor (`createRegistryForFetch.ts` exists only there; later `86f234dc1` and `ba9724f2a` also touch these files). F71: `conceptSpineRestrictions` plumbing, refusing a restriction without a planner, the nested-query comment, removing `ConceptWrapper` from the registry. F133: `valueMapping` and `originalCopyDataType` on a column replacement, the catalog read with projection keys in `queryRunner.ts`, and a nested query's dependency stale-at in `createRegistryForFetch.ts` and `createDefaultRegistry.ts` (`b603b61b8`, `3bdccd425`, `59c506f64`, `62bedf4ee`). F137: `onRelationFetched` in `QueryMediator.types.ts`, `QueryMediator.ts`, `queryRunner.ts`, and `createRegistryForFetch.ts`, so a nested virtual query reports its datasets too (`d4c1773ff`, `90f964bd4`). `createDefaultRegistry.ts` is not touched. |
| `src/clients/queries/runStructuredQuery/{runStructuredQueryWithMetadata.ts,runStructuredQuery.types.ts,runStructuredQuery.test.ts}` | F57 to F62, F71, F74, F75 | F71: out-of-sync case types run as SQL over the view, `executedSql` returned (`2c00baf97`), the dropped sort. F74: suffixed and duplicate field tests. F75: one fixture field. |
| `src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/generateIndividuals.{ts,test.ts}` | F57 to F62, F71, F73, F74, F75 | F71: Sync names from `buildAttributeValueSql`. F73: column Ava type for text `max`/`min`. F74: value shape. F75: fixture fields. |
| `src/views/IndividualManagerApp/SingleIndividualView/{index.tsx,CaseDetailsRail.tsx,CaseDetailsRail.test.tsx,CaseDetailsRail.module.css}` | F57 to F62, F18, F72, F74, F75, F68, F66 | F72: `useRecordFields`, "No value", every source, the load-failure callout and retry. F74: `DetailsStatus`, source list named "Sources of <field>", heading order, `RecordFieldValue`. F75: per-period rows. Later: `cb76ac57a` (pin case details above the activity feed) and `3284a4b46` (assign a record from its header), F68 and F66. |
| `src/views/IndividualManagerApp/SingleIndividualView/{RecordFieldValue/*,useRecordFields/**}` | F72, F74, F75 | F72: `useRecordFields`, `makeCaseDetailsRowsFromAttributes`. F74: `RecordFieldValue`, `RecordFieldValueList`, `dataType` on rows, `compareInViewOrder`. F75: `RecordFieldBucketedValue`, `RecordFieldPeriodTable/`. |
| `src/components/ChatPanel/CaseTypeDraftBlock/**` | F57 to F62, F73, F74, F75, F67 | F73: allowed rules, `CaseTypeDraftValueRuleSelect`, locked join keys (`07587ee65`). F74: the one value or every value switch, the `CaseTypeDraftAttributeRow/` split. F75: period and date column controls, Create disabled while a period field is incomplete. Later: `696870a50` (a drafted case type changes its datasets, F67). |
| `src/views/OntologyDesignerApp/ConceptCreatorView/**`, `{createdCaseTypeToFormValues,insertConceptFromFormValues,proposedCaseTypeToCreatedCaseType}/*` | F57 to F62, F73, F74, F75 | F73: allowed rules, locked ID rule, `withFieldDataTypes`, the `DatasetColumnMappingCreator/` folder. F74: value shape switch, `ValueRuleField`, `ValueShapeFields`, `keepKeyAndLabelFieldsSingle`, no rule for lists. F75: `PerPeriodFields`, `formShapeFields`, `createBucketColumnValidator`. |
| `supabase/functions/chat/PostChatMessages/{parsing/parseProposeCaseType.*,prompt/buildCaseManagerSystemPrompt.*,prompt/makeChatToolConfigFromOptions.*}` | F57 to F62, F73, F74, F75 | F73: allowed rules per column type. F74: list fields. F75: per-period fields. |
| `supabase/functions/chat/PostChatMessages/{PostChatMessages.ts,parsing/parseOpenRouterResponse.*,runChatAttemptsWithEscalation/*}` | F22, F73 | F73: catalog columns are passed to and required by the proposal parser (`53bb9e0ba`, `ae1bf2bd5`). `7bcaa6da0` also reformats `parseOpenRouterResponse.test.ts` (F22's file). |
| `shared/models/chat/SqlTableAlias/*`, `shared/types/offlineChat.types.ts`, `fetchOfflineChatSchema/*`, `buildOfflinePrompts/*`, `supabase/functions/chat/PostChatMessages/schema/fetchWorkspaceSchema.*`, `supabase/functions/chat/utils/buildSqlSystemPrompt/*` | F57 to F62, F81 to F85, F74, F75, F131 | F57 to F62: statuses in the SQL context (`fb1740d52`, `accbed4fc`). F81 to F85: offline mode (`5f51ce819`), later `4f17f2f48` and `f98d6a64b`. F74: list markers and view column names. F75: per-period markers and notes. F131: the code list sub-line under a bound column in the legacy schema block, and the browser loading column codes for it (`b878e5416`, `5ba9698b6`); `fetchWorkspaceSchema.ts` reads them in the `chat` function (`90aac2562`). |
| `shared/types/chat.types.ts` | F22, F57 to F62, F74, F75 | F74: a field that keeps every value. F75: period and date column on proposed and created fields. |
| `shared/models/ontology/{ConceptAttribute/**,AttributeMapping/DatasetColumnMapping/**}`, `shared/models/queries/{QueryColumn/**,QueryResultColumnBindings/**}` | `refactor/query-column-id` (on `develop`), F57 to F62, F74, F75 | F74: value shape, view column names, `sourceColumnName`/`resultColumnName`, list checks. F75: `bucketGrain`, `bucketColumnId`, period labels on projection descriptors. |
| `src/lib/ui/viz/{makeDataGridColumnDefs/*,DataGrid.tsx}`, `src/components/VisualizationContainer/**` | F22, F74, F75, F103 to F108, F121 | F74: list cells drop NULL items, saved list columns. F75: period labels. Later: `bd4c8907e` splits `VisualizationContainer.tsx`, so F75's period formatter wiring lives in `UiVizConfigRenderer/UiVizConfigRenderer.tsx` at the tip; `899d290e8` and `52c823754` touch the grid. `7bcaa6da0` reformats `makeDataGridColumnDefs.{ts,test.ts}` (F22). |
| `supabase/schemas/{30.attribute_mappings__dataset_column.sql,50.rpc_concepts__create.sql}`, `supabase/tests/database/rpc_concepts__create.test.sql` | F57 to F62, F74, F75 | F57 to F62: `rpc_concepts__create` with `p_statuses`, editor-only writes. F74: nullable rule, the two list checks. F75: `bucket_column_id`, its trigger, the RPC writing it. |
| `apps/desktop/scripts/gen-sqlite-migrations/getManualMigrationBodyFromSourceFile.ts` | F23 and earlier owners, F74, `43573a2ec` | F74: the `list_field_value_rules` SQLite body. `43573a2ec` only rekeys it to `20261109030001_`. |
| `scripts/test-dashboard-publishing-migrations.sh` | F57 to F62, F23, F73 | F73: the `value_rule_data_types` replay. |
| `docs/ontology-architecture.md` | F72, F73, F74, F75, F68, F66 | F72: one value implementation, the record page read path. F73: typed rules. F74: list fields. F75: per-period fields. Later `cb76ac57a`, `4ac9b2821`, and the formatting commit `7de8d8910`. |
| `apps/ava-video-producer/avandar-adapter/{CasesScreen/RecordDetail.tsx,AttributeMappingScreen/*}` | F18, F72, F73, F74, F75 | F72: `sourceNames`. F73: `DatasetColumnMappingCreator` props and path. F74: title field single, `dataType`, list value. F75: one row field. |
| `src/views/DataManagerApp/DatasetMetaView/useRefreshPostgresTableDataset/useRefreshPostgresTableDataset.ts` | Postgres branch, F72 | F72: the `invalidateDatasetRowQueries/` import path. |
| `tests/e2e/helpers/{CaseTypeSeedHelpers.ts,constants.ts}` | F57 to F62, F31, F33, F75 | F75: per-period seeding and the bucketed visits constants. |
| `shared/types/database.types.ts`, `src/i18n/locales/*/messages.{po,ts}`, `apps/desktop/migrations/*.gen.sql` | F72 to F75 | Generated: regenerate in each. |

### AI data agent (F77 to F88)

| File (final path) | Owners, in merge order | Each owner's hunks |
|---|---|---|
| `supabase/functions/chat/ChatRoutes.ts` | F77, F82, F128 | F77: the `/:workspaceId/extract-measurements` route. F82: the `/:workspaceId/agent/:promptId/api/stream` route (`2fb2a1f91`, path from `a673d31ad`). F128: the `/:workspaceId/title/:promptId` route (`0fa1c05f1`). |
| `supabase/functions/chat/ChatRoutes.types.ts` | F77, F82, F84, F128 | F77: the extract-measurements body and return type. F82: the agent stream route type. F84: the "Ignored" doc on `model` (`7ea18c278`). F128: the title route type. |
| `supabase/functions/chat/PostChatMessages/PostChatMessages.ts` | F22, F57 to F62, F71 to F75, F81, F84 | F22: BUG-010 and C4 hunks. F57 to F62 (`fb1740d52`): `conceptStatuses`. F71 to F75 (`53bb9e0ba`): `columns`. F81: the turn logic moves into `runChatTurn` (`d5d37b8c8`), carrying the earlier hunks with it. F84: `ChatModelOption.Catalog.defaultId` replaces `enforceChatModelAllowlist` (`7ea18c278`). |
| `supabase/functions/chat/PostChatMessages/runChatTurn/runChatTurn.ts` | F81, F71 to F75 | F81 creates it. F71 to F75: the `columns: options.schema.columns` argument, resolved into this file in merge `32e728a51`. |
| `supabase/functions/chat/PostChatMessages/runChatAttemptsWithEscalation/runChatAttemptsWithEscalation.{ts,test.ts}` | F81, F71 to F75 | F81: per-call `OpenRouterUsage` (`d5d37b8c8`, `658b112f4`). F71 to F75 (`53bb9e0ba`, `ae1bf2bd5`): catalog `columns`. |
| `supabase/functions/chat/PostChatMessages/prompt/buildSystemPrompts.ts` | F22, `11816d5d0` | F22's C4 PR takes `7589f0885` (see the F22 addendum). |
| `src/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter.ts`, moved to `createChatModelAdapter/createChatModelAdapter.ts` by F84 | F22, F80, F78, F82, F84, F86, F89 to F91 | F22: BUG-015's discovery-continuation content. F80: `action: copyRef.current.fallbackAction`. F78: `_userModelContent` and `ChatViewEvent.toModelContent`. F82: the `DataAgentFeature` branch that runs `runDataAgentTurn` in the Data Explorer (`2fb2a1f91`, `658b112f4`). F84: the move and rewrite (`5f51ce819`); keep F78's and F80's hunks when moving it. F86: every page, the page capture, the offline offer on network failure, and the agent-failure replies. F89 to F91: mentions and the tray. |
| `src/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter/createChatModelAdapter.test.ts` | F84, F86, F89 to F91 | F84 creates it. F86: `9f24d9779`, `f1b04d4dd`, `3615d4be7`, `228a6a51c`, and F78's case id cases (`1f0734f04`, `49164114f`), which need this file. |
| `src/components/ChatPanel/useAvandarChatRuntime/useAvandarChatRuntime.ts` | F22, F80, F84, F86, F89 to F91 | F80: the two `fallbackAction` copies. F84: offline mode (`5f51ce819`). F86: `9f24d9779`, `228a6a51c`. |
| `src/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers.ts` | F22, F80, F86 | F22: BUG-012. F80: `fallbackAction` on `ChatRuntimeCopy`. F86: the agent-failure copy (`228a6a51c`). |
| `src/components/ChatPanel/useAvandarChatRuntime/waitForAppliedSqlOutcome/waitForAppliedSqlOutcome.ts` | F22, F82, F85 | F22: BUG-011. F82: `readAppliedSqlResult`. F85: the doc note that a mounted result card matches too (`ad9df5c53`). |
| `src/components/ChatPanel/ChatThread/Composer/Composer.tsx` | F94, F84, F86, F89 to F91 | F94 (`f2e44f2e4`): the panel polish. F84: `OfflineModeControl` replaces `ChatModelPicker`. F86: input on every page with the switch on (`eb4428ac3`). |
| `src/components/ChatPanel/ChatModelPicker/**` | F94, F84 | F94 (`f2e44f2e4`) edits `ChatModelPickerView.tsx`. F84 deletes the folder. |
| `shared/types/offlineChat.types.ts` | F57 to F62, F71 to F75, F84, F131 | F57 to F62 (`accbed4fc`) and F71 to F75: schema fields. F84: the offline bundle types (`5f51ce819`). F131: the optional column codes on the offline schema's columns (`b878e5416`). |
| `shared/models/chat/SqlTableAlias/{SqlTableAliasModule.ts,SqlTableAlias.test.ts}` | F57 to F62, F71 to F75, F86, F131 | F57 to F62 (`fb1740d52`) and F71 to F75 (`01fd6a86e`, `8297e7a9b`, `8c2a2e369`, `3d0332c7e`): schema context. F86: the alias-to-table and table-to-alias mapping (`4f17f2f48`, `f98d6a64b`). F131: the codes line under a bound column, capped and escaped (`b878e5416`, `5ba9698b6`). |
| `src/lib/agent/dataAgent/createDataAgent/createDataAgent.ts` | F82, F83, F86, `11816d5d0`, F131 | F83: `previewRowCount`, `queryTools`, and the `plan_query` tool list. F86: the `promptId` option (`8dc294b2c`, `02a76d122`) and rejecting a failed model call (`25467983a`). `7beccfb8d` (a `demo/measles` formatting commit) reformats two lines. F131: passing the column codes to `lookup_values` (`c38cd98ec`). |
| `src/lib/agent/dataAgent/createDataAgentTools/runQueryTool.ts` | F82, F83, `11816d5d0` | F83: `_describePreview`, `_describeRowsForCheck`, the `previewRowCount` branch, and `previewRowCount` on `QueryToolContext`. |
| `src/lib/agent/dataAgent/DataAgentHost.ts` | F82, F83, F87 | F83: `previewRowCount` and `previewRows`. F87: placeholder-aware hooks (`8745f3feb`). |
| `src/lib/agent/dataAgent/createDataAgentTools/lookupValuesTool.ts` | F82, F87, F131 | F87: held placeholders (`8745f3feb`, `8240b7e58`). F131: answering from a code list without a query or approval (`c38cd98ec`). |
| `src/lib/agent/dataAgent/createDataAgentTools/dataAgentTools.test.ts` | F82, F83, `11816d5d0` | F83: the `plan_query` cases (`50fbf4a34`). |
| `src/lib/agent/dataAgent/browser/{createBrowserDataAgentHost.ts,DataAgentFeature.ts}` | F82, F86 | F86: `showQuery` routing (`2dcba8303`, `3c49bb065`) and the every-page doc (`5bb545747`). |
| `shared/agent/dataAgent/{buildDataAgentSystemPrompt.ts,buildDataAgentSystemPrompt.test.ts,dataAgentTools.ts}` | F82, F86, F87, F89 to F91, `11816d5d0` | F82: v1, the shared tools (`a673d31ad`). F86: prompt v2 and its page rules, the alias rule, the v1 pin. F87: the placeholder rules. F89 to F91: v3. |
| `supabase/functions/chat/PostAgentStream/{PostAgentStream.ts,buildDataAgentProxyContext.ts,buildDataAgentProxyContext.test.ts}` | F82, F86, F89 to F91 | F86: serving v1 and v2 (`8dc294b2c`, `a18b30610`). |
| `src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn/runDataAgentTurn.{ts,test.ts}` | F82, F86, F87, F89 to F91 | F86: the page and per-turn results (`897e2b897`, `3c49bb065`), the first redaction (`a556fdde6`), the alias line (`0cd0688c4`). F87: the vault (`897504c9a`, `8745f3feb`). |
| `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers.{ts,test.ts}` | F82, F84, F86, F87, F89 to F91 | F82: the helpers `5f51ce819` extracted from `runDataAgentTurn`. F84: `DataAgentDatasetCache` in `loadDataAgentDatasets` (`ae8656e77`). F86: `2dcba8303`, `897e2b897`, `3c49bb065`, `fb7d6f61f`, `1f0734f04`'s test. F87: `897504c9a`. `7beccfb8d` reformats one line. |
| `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/{createConversationAgentHost.ts,createConversationAgentHost.test.ts,dataAgentConversation.types.ts}` | F86, F87, F89 to F91 | F86 creates them. F87: the placeholder-restoring host and vault per conversation (`897504c9a`). |
| `src/components/ChatPanel/useAvandarChatRuntime/runOfflineDataAgentTurn/runOfflineDataAgentTurn.{ts,test.ts}` | F84, F86, F87 | F86: `897e2b897`, `3c49bb065`, `fb7d6f61f`. F87: `8745f3feb` (test). |
| `src/lib/agent/dataAgent/offline/offlineDataAgent.test.ts` | F83, F86 | F86: the failed-model-call case (`25467983a`). |
| `shared/agent/pageContext/buildAgentPageContextBlock.{ts,test.ts}` | F86, F87, F89 to F91 | F86: the block, escaping, `redactSqlLiterals`, the dataset line (`0cd0688c4`). F87: placeholders and masks (`897504c9a`, `8745f3feb`, `8240b7e58`). |
| `src/components/ChatPanel/useAvandarChatRuntime/agentPageContext/{createAgentPageContext.ts,extractDashboardTiles.ts,extractDashboardTiles.test.ts}` | F86, F89 to F91 | F89 to F91 adds the mentioned gadgets' loader (`aa6085f74`, `00dea0eeb`). |
| `src/components/privacy/privacy-helpers/detectPii/detectPii.ts` | F86, F87 | F86: `isPersonalDataText` (`a556fdde6`). F87: `PII_COLUMN_NAME_KEYWORDS` (`8745f3feb`). |
| `src/clients/dashboards/findDashboardTile/findDashboardTile.ts` | F21, `9abd59155`, F96 to F112, F86 | F86: exports `collectDataVizNodes` (`8c95f1cb1`). F96 to F112 (`ee9692bc1`, `3cde82485`): plugin chart tiles. |
| `src/components/RichText/Gadget/GadgetCard/GadgetCardHeader.tsx` | F21, F85 | F85: `definition` narrowed to the four fields the header draws (`63d934d75`). |
| `shared/analytics/AnalyticsEvents/AnalyticsEvents.types.ts` | F85, F96 to F112, F89 to F91 | F85: the `chat_result` query surface. |
| `src/components/ChatPanel/useAvandarChatRuntime/ChatAnalyticsPayloads/ChatAnalyticsPayloads.{ts,test.ts}` | F84, F89 to F91 | F84: no picked model in the payload. |
| `src/views/DataExplorerApp/DataExplorerApp.tsx` | F79, F96 to F112 | F79: `useCategorySplitChartInput` and `splitColumnName`. F96 to F112 (`e257d718f`): toolbar commands. |
| `src/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawer.tsx` | F79, F96 to F112 | F79: `splitColumnName`. F96 to F112 (`dea616802`): plugin chart types. |
| `scripts/ai-eval/runEval.ts` | F81, F82, F83, F86, F89 to F91, `11816d5d0` | F81: the runner and `baseline`. F82: `pi`. F83: `pi-local`. F86: the `P` questions (`192d58d29`). |
| `scripts/ai-eval/EvalQuestion.ts` | F81, F86, F87, F89 to F91, `11816d5d0` | F86: page context fields (`192d58d29`). F87: P07's field (`2f7200add`). |
| `scripts/ai-eval/harnesses/pi/PiHarness.ts` | F82, F83, F86, F87, F89 to F91 | F83: `previewRows`, `createPiConversation`. F86: page blocks and failed calls as misses (`192d58d29`, `b3f6f748d`). F87: the stricter page privacy (`a556fdde6`'s detector line is superseded; `2f7200add`, `c8328eb38`). |
| `scripts/ai-eval/harnesses/pi/PiHarness.test.ts` | F86, F87, F89 to F91 | F86 creates it (`b3f6f748d`). F87: `2f7200add`, `27e1dabf6`. |
| `scripts/ai-eval/covid/covidPageQuestions.ts` | F86, F87, F89 to F91 | F86: P01 to P06. F87: P07. |
| `scripts/ai-eval/covid/covidQuestions.ts`, `harnesses/baseline/BaselineHarness.ts`, `runtime/gradeEvalAnswer.ts` | F81, F86, F89 to F91, `11816d5d0` | F86: two lines in `covidQuestions.ts` and the baseline's page questions (`192d58d29`). |
| `package.json`, `pnpm-lock.yaml` | F82 (and every feature that adds a dependency) | F82: `@earendil-works/pi-agent-core`, `@earendil-works/pi-ai`, `@earendil-works/pi-schema`, all `1.5.0`. Regenerate the lockfile. |
| `deno.json`, `supabase/functions/chat/deno.json` | F2, Postgres branch, F96 to F112, F82 | F82: the five `@earendil-works/*` import map entries. |
| `tests/e2e/agent-chat-result.spec.ts` | F86, F89 to F91 | F86 creates it (`edb8e8ca0`, `5bb545747`). |
| `docs/ai-agent/**` | F88, F89 to F91 | See F88. |
| `src/i18n/locales/*/messages.{po,ts}` | F79, F80, F84, F85, F86 | Generated: regenerate in each. |

### AI agent context and the chat panel (F89 to F95, F128, F139)

| File (final path) | Owners, in merge order | Each owner's hunks |
|---|---|---|
| `src/components/ChatPanel/ChatThread/Composer/Composer.tsx` | F94, F81 to F85, F86 and F87, F90, F91, F128 | F128: the composer picked from the selected session's kind (`4a57ac447`). F94: the `composerActions` foot replaces the `Group`, and the send icon's stroke (`f2e44f2e4`). F81 to F85: `OfflineModeControl` in place of `ChatModelPicker` (`5f51ce819`). F86 and F87: the composer is enabled on every page but the case designer with the agent on (`eb4428ac3`). F90: `ChatComposerEditor` with the agent on, and chat gadget chips only (`9cc4cb5e2`, `cf595bb2b`). F91: `ChatContextTray` above the input (`bc8a9f05f`). |
| `src/components/ChatPanel/ChatThread/Composer/Composer.module.css` | F94, F90 | F94: the raised field and the split foot. F90: the editor, chip, and placeholder styles. |
| `src/components/ChatPanel/ChatThread/Composer/Composer.test.tsx` | F86 and F87, F90, F91, F128 | F86 and F87: `eb4428ac3`. F90: the editor with the agent on. F91: the tray mount. F128: the session-kind cases. |
| `src/components/ChatPanel/ChatEmptyState/ChatEmptyState.tsx` | F94, F90 | F94: one quiet suggestion list above the composer ("Try asking"). F90: the agent-on copy that invites a question on every page and mentions `@` (`05efea0f2`). |
| `src/components/ChatPanel/useAvandarChatRuntime/useAvandarChatRuntime.ts` | F22, F81 to F85, F86 and F87, F89, F91, F128, F139 | F89: an empty `contextTrayRef` passed to `createChatModelAdapter` (`b3b7dacd4`). F91: the tray read from `ChatPanelStateManager`, hydrated once from `ChatContextTrayStore` and persisted (`15508bb95`, `65523931a`). F128: the thread and tray keyed by the selected session, pending cards kept across a switch, the kickoff run, and the title request. F139: the open editor and the session passed to the adapter (`9647073b9`). |
| `src/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.mocks.tsx` | F22, F91, F128 | F91: the `contextTray` state and store mocks. F128: the session provider mocks. |
| `src/components/ChatPanel/{ChatContextTrayStore,ChatPanelStateManager,ChatPanelProvider}/**`, `ChatThread/ChatContextTray/__tests__/ChatContextTrayTestFixtures.tsx`, `__tests__/useAvandarChatRuntime.contextTray.test.tsx`, `src/components/Nux/NuxTour/useNuxOpenChatPanel/useNuxOpenChatPanel.test.tsx` | F91, F128 | F128: the session id in the tray key, `ChatSessionProvider` mounted in the panel provider, and the session fields in the test fixtures. |
| `src/components/ChatPanel/ChatThreadStore/ChatThreadStore.{ts,test.ts}` | F85, F128 | F128: the session id in the key, `readRecord` and `writeRecord`, and the legacy reads the migration uses. |
| `src/components/ChatPanel/ChatSessionStore/ChatSessionStore.{ts,test.ts}` | F128, F139 | F128 creates it. F139: archiving and deleting a session also clear its dashboard card statuses (`3a504765e`). |
| `src/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResultPart.tsx` | F85, F139 | F139: `AgentQueryResultBody` is exported, so the dashboard card previews a chart the same way (`e14c2b6a8`). |
| `src/components/ChatPanel/{ChatPanel/ChatPanel.tsx,ChatPanelHeader/ChatPanelHeader.tsx}` | F94, F128 | F128: the session strip in the header and the panel. |
| `src/views/OntologyDesignerApp/NewCaseTypeButton.{tsx,test.tsx}`, `src/routes/_auth/$workspaceSlug/ontology-designer/{index.tsx,-index.test.tsx}` | F57, F128 | F128: New case type and the home card start a case-design session. |
| `tests/e2e/case-list-field.spec.ts` | F74, F75, F128 | F128: the Dock-by-Enter hunk of `b503e1762`. F74 takes its record-link hunk. |
| `src/components/ChatPanel/useAvandarChatRuntime/applyChatModelTurnResponse.ts`, `applyChatModelTurnResponse.test.ts` (new in F89) | F22, F89, F95 | F22: BUG-012's `explorerResponse` and BUG-014's labels. F89: `questionLabel` (`de3ff542e`) and the new test file. F95: a schema turn applies no SQL, and its tests. |
| `src/components/ChatPanel/useAvandarChatRuntime/getLastQuestionFromMessages/*` | F22, F89 | F22: the file itself (BUG-014). F89: tokens read as `@Name` (`c757b60a7`). |
| `src/components/ChatPanel/useAvandarChatRuntime/{createChatModelAdapter,runDataAgentTurn,runOfflineDataAgentTurn,dataAgentTurnHelpers,agentPageContext,ChatAnalyticsPayloads}/**` | F81 to F85, F86 and F87, F89, F128, F139 | F89: everything its commits add: the per-turn gadget load, mention naming off the agent path, offline answer marking, the mention and attached counts. F128: the title request after a reply, and case-manager context for case-design turns. F139: the open editor and the session passed to the adapter (`9647073b9`), the offline turn on every page with the page in context (`8ae87e837`), the card lines and device-turn blocks built in `buildAgentTurnInputs.ts` (`ac7b47425`, `218f476aa`), and the host that places dashboard blocks, with `showQueryInChat.ts` (`a666b6ba9`). |
| `shared/agent/pageContext/{buildAgentPageContextBlock,buildAgentTurnText}.ts`, `buildAgentTurnText.test.ts` | F86 and F87, F89, F139 | F89: the text helpers move to `agentBlockText.ts`, every block shares one redaction pass, and the turn text adds `<attached>` and `<mentioned>`. F139: the dashboard card lines in the turn text, and the short line for a block that did not change since the last turn (`8ff40bbe7`). |
| `shared/agent/dataAgent/{buildDataAgentSystemPrompt.ts,buildDataAgentSystemPrompt.test.ts,dataAgentTools.ts,dataAgentTools.test.ts}` | F81 to F85, F86 and F87, F89, F95, F131, F139 | F89: `ATTACHED_AND_MENTIONED_RULES`, `data-agent-v3` served and used. F95: `SCHEMA_ANSWER_RULES` appended to v3 and the `run_query` description. F131: prompt `data-agent-v5`, the plugin AI tools' v4 plus CODED COLUMNS, with a code list sub-line per bound column, served beside v1 to v4. v4 is SHA-pinned as shipped (`03ca7f39c`, `5ba9698b6`, `b60b9206d`). F139: prompt `data-agent-v6`, v5's instructions plus `add_dashboard_block`'s rules, with each version's own built-in tool list (v1 to v5 keep the three) (`114376fb4`, `a693f179c`, `9e46d4924`, `834bef76f`), and the per-version tool tests (`114376fb4`). |
| `shared/analytics/AnalyticsEvents/AnalyticsEvents.types.ts` | F86 and F87, F110 and F111 (`b3f267300`), F89 | F89: `mentionCount` and `attachedCount` on `ChatMessageSentPayload`. |
| `scripts/ai-eval/{EvalQuestion.ts,runEval.ts,covid/covidQuestions.ts,runtime/gradeEvalAnswer.ts}`, `runtime/gradeEvalAnswer.test.ts` (new in F89) | F81 to F85, F86 and F87, F89, F95, F131, F139 | F89: the `mentions` category, M01 to M06, and their grading. F95: the `schema` category, `gradeText`, S01 and S02. F131: the `coded` category and the coded-column runner options in `EvalQuestion.ts` and `runEval.ts` (`5ce5ba8a2`, `c567ca769`). F139: the `dashboard` category, D01 to D09, `gradeDashboardWrites`, the dashboard support in `EvalHarness.ts`, and the dashboard tests (`51d5145f9`, `38d7683f3`). |
| `scripts/ai-eval/harnesses/pi/PiHarness.{ts,test.ts}`, `scripts/ai-eval/covid/covidPageQuestions.ts` | F81 to F85, F86 and F87, F89, F131, F139 | F89: mention and tray context in the Pi harness; page question helpers move to `covidQuestionHelpers.ts`. F131: the column codes in the Pi harness's datasets (`5ce5ba8a2`). F139: dashboard blocks in the Pi harnesses, and the device check that real values stay on the device (`390264f2e`, `a54d46891`). `PiLocalHarness.ts` gets one line (`390264f2e`). |
| `scripts/ai-eval/harnesses/baseline/BaselineHarness.ts`, `src/lib/agent/dataAgent/{DataAgentRunState.ts,createDataAgent/createDataAgent.ts,createDataAgentTools/runQueryTool.ts}` | F81 to F85, F95, F139 | F95: user texts kept across a run, and a schema turn answered without a query. F139: `baselinePageContext` and the dashboard questions, with `DenoChatTurnRunner.ts` (`51d5145f9`); the dashboard tool's run state, its offer by prompt version, and the shared run cap `MAX_QUERY_RUNS_PER_ANSWER` (`927a968b5`, `35acb82c6`). |
| `supabase/functions/chat/PostChatMessages/prompt/buildSystemPrompts.ts`, `supabase/functions/chat/buildDataExplorerToolDefinitions/buildDataExplorerToolDefinitions.ts` | F22, F95 | F95: the schema paragraph after ANALYST CHECKS, and the `generateSql` description. |
| `tests/e2e/agent-chat-result.spec.ts` | F86 and F87, F89, F90, F91, F131, F139 | F89: the `data-agent-v3` route (`29e2bd92a`). F90: the message box found by its "Message" label (`5f10894c5`). F91: the `openAgentChat` helper (`15369dc2b`). F131: the `data-agent-v5` route (`03ca7f39c`, `b60b9206d`). F139: the `data-agent-v6` route (`a693f179c`). |
| `shared/agent/mentions/buildAgentContextBlocks.{ts,test.ts}` | F89, F139 | F89 creates it. F139: an offline turn caps the chart SQL its blocks keep, through `offlineContextBudget.ts` (`5412ad50c`). |
| `supabase/functions/chat/PostAgentStream/buildDataAgentProxyContext.{ts,test.ts}` | F82, F86, F89 to F91, F139 | F139: each prompt version is served its own tool list, and the proxy checks tool calls against that version's list (`7d60451b6`). |
| `src/lib/agent/dataAgent/{DataAgentHost.ts,browser/createBrowserDataAgentHost.ts}` | F82, F83, F86, F87, F139 | F139: the dashboard method on the host (`927a968b5`), and the browser host's block placement (`a666b6ba9`). |
| `src/lib/agent/dataAgent/offline/{offlineDataAgent.test.ts,buildOfflineDataAgentSystemPrompt/buildOfflineDataAgentSystemPrompt.ts,classifyOfflineMessage/classifyOfflineMessage.ts,createOfflineDataAgent/createOfflineDataAgent.ts}` | F83, F86, F139 | F86: the failed-model-call case (`25467983a`). F139: blocks and dashboards in the offline prompt, and a router rule that sends a message naming a dashboard to the data agent (`628843924`). The dashboard text joins the offline prompt only on a turn with blocks or a dashboard in the message (`7c4f95033`). |
| `src/lib/agent/dataAgent/pagePrivacy/{SqlPlaceholderVault,createPlaceholderRestoringHost}.{ts,test.ts}` | F87, F139 | F87 creates them. F139: `unmaskText` restores the names the agent writes (`7fee248f9`), and the host restores placeholders in dashboard blocks (`c3c2e936c`). |
| `tests/e2e/agent-chat-mentions.spec.ts` | F91, F139 | F91 creates it. F139: the `data-agent-v6` route (`a693f179c`). |
| `tests/e2e/agent-chat-sessions.spec.ts` | F128, F139 | F128 creates it. F139: the `data-agent-v6` route (`a693f179c`). |
| `src/components/RichText/MentionMenu/{createMentionMenuSuggestion.ts,MentionMenuList/MentionMenuFooter.tsx,MentionMenuList/MentionMenuList.tsx}` | F21, F90 | F90: `variant: "chat"`: no people, an allowed-types filter, links only, one Enter hint, no audience hint. |
| `docs/measles-demo/gadgets.md` | F21, F91 | F91: the chat `@` menu and tray paragraph, and the Notes line (`1f3bc348d`). |
| `src/components/AppShell/AppShell.tsx`, `src/components/layouts/AppSlate/AppSlate.tsx` | F20, F94 | F20: `--ava-shell-main-offset-top`. F94: the `chat-fused` mod and the aside's z-index; the slate's `.frame` class. The hunks sit next to each other; apply by hand when F20 is not merged. |
| `src/components/layouts/AppSlate/AppSlate.module.css` | F93, F94 | F93: `--ava-paper-border-color` on `.slate` and the nested `.mantine-Paper-root` reset. F94: `.frame`, the inline-end radius and border-width variables, and the transitions. |
| `src/config/Theme/{Theme.ts,Theme.test.ts,index.ts}` | F93, F94, F36 | F93: Paper `borderColor` reads `--ava-paper-border-color` first, and its test. F94: `APP_CHAT_ASIDE_Z_INDEX`, its export, and its test. F36: the Drawer root marker class. |
| `DESIGN.md` | Postgres branch, F93, F94 | Postgres branch: the copy-rule Do and Don't. F93: the paragraph on `--ava-paper-border-color` in the slate section. F94: the Gutter Rule exception and the fused-aside sentences in the slate shadow paragraph. |
| `docs/app-shell-nomenclature.md` | F94, F36 | F94: the fused chat aside row, the `APP_CHAT_ASIDE_Z_INDEX` tier, the stacking rule, and the Do line. F36: the checklist entries. |
| `docs/ai-agent/{README.md,decisions.md,roadmap.md,eval.md}`, `docs/ai-agent/specs/{phase-1.md,phase-1a.md}` | F81 to F85, F86 and F87, F89, F95, F128, F139 | F128: D43, and the 1C rows in `roadmap.md` and `phase-1.md`. F89: D40 to D42, the 1A and 1B roadmap rows, "What keeps the agent off", the 1E row, the Phase 1B eval section, and the M questions. F95: the S questions and the category list in `eval.md`. F139: D44, the 1D rows in `roadmap.md` and `phase-1.md`, and the Phase 1D eval section. |

### Plugins (F96 to F112)

| File (final path) | Owners, in merge order | Each owner's hunks |
|---|---|---|
| `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.{ts,test.ts}` | F96, F105, F110 | F96: the schema with `PLUGIN_PERMISSIONS = ["data:context"]`, commands, and menus. F105: `contributes.vizTypes` and the `PluginVizTypeSchema`, `manifestFieldSchemas`, and `getIssuesFromVizTypes` imports. F110: `query:addColumns` in `PLUGIN_PERMISSIONS`. |
| `packages/shared/plugin-manifest/{README.md,src/index.ts,src/runtime.ts,src/compileManifest/compileManifest.{ts,test.ts},src/node/readPluginDirectory.ts,src/node/__tests__/readPluginFolders.integration.test.ts}` | F96, F105 | F105: chart type exports, and the chart type string and icon checks (`dd43666ab`, `b4d5dfce0`). |
| `packages/web/plugin-sdk/src/{PluginApi.types.ts,index.ts}` | F96, F105, F110 | F96: the `AvandarApi`, `PluginDefinition` with `commands`, and its exports. F105: `vizTypes` on the definition and the `PluginViz.types` and `PluginVizContext` exports. F110: the derived column types, `dataExplorer.addColumns`, and `ui.closeModal`. |
| `packages/web/plugin-sdk/{README.md,src/AvandarContext/*,src/definePlugin/*}` | F96, F105 | F105: chart type support and the chart component translator (`3f057f9a5`, `ec660ffb9`). |
| `packages/web/plugin-sdk/src/PluginError/PluginError.ts` | F96, F110 | F110: the derived column error codes (`3b2e41020`). |
| `packages/web/plugin-ui/{package.json,tsup.config.ts,README.md,src/index.ts}` | F96, F105, F110 | F105: the `./charts` export, the `recharts` peer, and the test setup. F110: the `SegmentedControl` export and its README line (`eac9021ac`). |
| `scripts/vite-plugin-ava-plugins/makePluginModuleSources/*` | F97, F105 | F105: chart type icons in the generated manifest module. |
| `scripts/vite-plugin-ava-plugins/checkPluginBundle/*` | F97, F106 | F106: the lazy chart runtime is exempt from the host budget, and the raised budget (`7fff401e6`, `cf754c23d`). |
| `eslint/plugin-restrictions.{js,test.js}` | F97, F105 | F105: `@avandar/plugin-ui/charts` in `APPROVED_PLUGIN_IMPORT_PATTERNS` and the message. |
| `src/lib/plugins/PluginErrorBoundary/PluginErrorBoundary.tsx` | F99, F106 | F106: containment for chart runtimes and transform charts (`a299f9e34`, `cf1cfa6a2`). |
| `src/lib/plugins/{makePluginApi,runPluginCommand,PluginMenuSlot/PluginMenuSlot,PluginMenuSlot/usePluginCommandRunner}/*` | F99, F105, F110 | F105: one fixture in `runPluginCommand.test.ts`. F110: the Data Explorer bridge, `addColumns`, `closeModal`, and the modal-member extraction. |
| `src/lib/plugins/{PluginHost/__tests__/pluginHostMenuItems.integration.test.tsx,getMenuItemsFromActivePlugins/getMenuItemsFromActivePlugins.test.ts}` | F99, F105 | F105: `vizTypes: []` in fixtures. |
| `src/lib/plugins/getContributionCountsFromManifest/*` | F100, F105, F109 | F100 creates it. F105: a `vizTypes` fixture. F109 deletes it for `getContributionsFromManifest`. |
| `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/**` | F100, F105, F109, F110 | F105: `vizTypes: []` in `PluginDetails.test.tsx` and `WorkspacePluginsTab.test.tsx`. F109: the `PluginDetails/` folder, `PluginManifestSummary.tsx`, `PluginSettingsCard.tsx`, and the tab test. F110: the `query:addColumns` label in `PluginDataAccessSection.tsx` and its test. |
| `src/views/DataExplorerApp/DataExplorerApp.tsx` | F99, F110, F81 to F85, F131 | F99: the toolbar slot and plugin context. F110: the plugin bridge. F81 to F85 (`7f06c7c6c`, `8301ced8f`): category split charts. F131: `useExplorerColumnCodes` and the `ColumnCodesContext` provider around the grid (`e82540818`, `26061b590`). |
| `src/views/DataExplorerApp/DataExplorerStateManager/{DataExplorerStateManager.tsx,dataExplorerStateHelpers.ts,DataExplorerAppState.types.ts}` | F106, F107, F110 | F106: `ee9692bc1`'s plugin guard in type switching and URL restore. F107: plugin chart config memory (`75465118b`, `9f67f0efa`, `7b97f5b5e`). F110: `applyDerivedColumnsSql`, `restoreDerivedColumnsSnapshot`, and the snapshot type. |
| `src/views/DataExplorerApp/DataExplorerDrawer/{DataExplorerDrawer.tsx,DataExplorerDrawerRail/*}` | F107, F81 to F85, F123 | F107: the rail takes `vizConfig` and `columns` instead of `vizType` (`dea616802`). F81 to F85 `8301ced8f` and the `15410276a` badge fix own the rest. |
| `src/components/VisualizationContainer/VisualizationContainer.tsx` | F103, F106 | F106: plugin configs go to `PluginVizRenderer`. |
| `src/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer.{tsx,test.tsx}` | F103, F104, F106 | F104: `barGap` passed to `BarChart`. F106: the built-in type narrowing (`a1f6586a2`). |
| `src/components/VisualizationContainer/VizSettingsForm/VizSettingsFormBody/VizSettingsFormBody.{tsx,test.tsx}` | F104, F106, F107 | F104: the bar gap smoke test. F106: a plugin config renders no subform. F107: it renders `PluginVizSettingsForm`. |
| `src/components/VisualizationContainer/__tests__/VisualizationContainer{.test,TestFixtures}.tsx` | F106, F71 to F75 | F106: plugin chart cases. F71 to F75 `00a93b53d` owns the rest. |
| `shared/models/vizs/{UiVizConfig/UiVizConfig.types.ts,AvaBarChartVizConfig/*,AvaVizConfig/__tests__/AvaVizConfigs.convertVizConfig.test.ts}` | F104, F106 | F104: `barGap`. F106: the plugin member and `BuiltInType` narrowing. |
| `src/lib/ui/viz/{BarChart/BarChart.tsx,renderXYComposite.tsx}` | F104, F22 | F104: `barGap` to `barCategoryGap: 0`. `f35ddf949` and `7bcaa6da0` hunks are not F104's. |
| `src/lib/ui/viz/ChartConstants.ts` | F105, F22 | F105: the comment pointing at `useChartTheme`. |
| `src/clients/dashboards/findDashboardTile/findDashboardTile.{ts,test.ts}`, `src/components/RichText/Gadget/useGadgetSummaries/{useGadgetSummaries.ts,__tests__/useGadgetSummaries.dashboards.test.tsx}` | F21, F106, F107, F81 to F85 | F21 creates them. F106 (`ee9692bc1`): narrow the tile's `vizType` to `AvaVizConfig.BuiltInType`. F107 (`3cde82485`): read `"plugin"` and label it "Plugin chart". F81 to F85 `8c95f1cb1`: slugged dashboards. If F21 is on `develop` first, F106 and F107 carry their hunks. If F21 lands after F107, F21 takes the final files and F106 and F107 skip these hunks. |
| `src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/{DataVizPBlock.tsx,__tests__/DataVizPBlock.test.tsx}` | F21, F106 | F21: `data-tile-id` (`170aef3b2`). F106: an empty table stands in for a plugin chart until bindings resolve, and the invalid-settings test (`e763d1c32`). |
| `apps/ava-video-producer/avandar-adapter/{shell-aliases.json,shims/pluginIndex.ts,ExplorerScreen/ExplorerScreen.tsx}` | F106, F107 | F106: alias `virtual:ava-plugin-index` to an empty shim (`0709ea1a4`). F107: `ExplorerScreen` passes `vizConfig` and `columns` to the drawer rail (`dea616802`). |
| `plugins/bundled.yaml` | F97, F101 | F97: `plugins: []`. F101: `- epidemiology`. |
| `plugins/epidemiology/{ava.yaml,locales/en.json,src/index.tsx,src/index.test.tsx}` | F101, F108, F110, F111 | F101: regression. F108: the two `vizTypes`, their strings, and `bdb15ff8b`'s description. F110: `closeModal` in the test's mocked API. F111: the two commands, `query:addColumns`, their strings, and `f6fecb818`'s line-list wording. |
| `plugins/epidemiology/src/RegressionModal/RegressionModal.test.tsx` | F101, F110 | F110: `closeModal` in the mocked API (`3b2e41020`). |
| `src/lib/plugins/derivedColumns/assertSingleSqlExpression/assertSingleSqlExpression.test.ts` | F110, F111 | F111: the row-count window case from `f6fecb818`. |
| `shared/analytics/AnalyticsEvents/AnalyticsEvents.types.ts` | F81 to F85, F110 | F110: the `plugin_command` query trigger. F81 to F85 `b3b7dacd4`, `63d934d75` own the rest. |
| `package.json` | F96, F97, others | F96: the three `@avandar/plugin-*` `workspace:*` dependencies. F97: the `check:plugin-bundle` script. |
| `vite.config.ts` | F96, F97 | F96: the three plugin package aliases. F97: `runnerImport` of the Vite plugin, the async config, the plugin registration, and the `virtual:ava-plugin-index` Vitest alias. |
| `deno.json` | F2, F96, F81 to F85 | F2: `bottleneck`. F96: the three `@avandar/plugin-manifest` maps, `@plugin-manifest/`, and `yaml`. |
| `.github/workflows/pr-develop.yaml` | F97, others | F97: the `pnpm check:plugin-bundle` step. `b4622f582` (runner pin) is not F97's. |
| `eslint.config.js` | F97, others | F97: the `pluginRestrictions` import and spread. `776f94b11` is not F97's. |
| `apps/desktop/sync/syncable-tables.ts` | F4, F21, F35, F98, others, F131, F136 | F98: `plugin_installations` in `EXCLUDED_TABLES`. F131: `dataset_columns__dictionary_bindings` in `ACTIVE_TABLES` (`cefb14f16`). F136: the five crosswalk tables in `ACTIVE_TABLES` and the comment line that names them (`0342d9410`). |
| `shared/models/Permissions/PermissionsModule/PermissionRegistry.ts` | F57 to F62, F98 | F98: `settings__can_manage_plugins`. |
| `apps/ava-cli/{package.json,src/main.ts}` | F15, F102, others | F102: the `@avandar/plugin-manifest` and `yaml` dependencies, the `PluginCli` import, and `.addCommand("plugin", PluginCli)`. |
| `AGENTS.md` (also loaded as `CLAUDE.md`) | F21, F112, others | F112: the "How to write a bundled plugin" line. |

### GIS and public dashboard fixes (F113 to F119)

| File (final path) | Owners, in merge order | Each owner's hunks |
|---|---|---|
| `src/clients/qetl/QueryMediator/QueryMediator.ts`, `QueryMediator.types.ts`, `queryRunner.ts` | F1, F113, F71 to F75, Postgres branch, F133, F137 | F1: the named `create("QueryMediator", { state })` call (`QueryMediator.ts`). F113: the `datasetColumnSource` option, its `DatasetColumnSource` type, and the `stored` skip in `_getParquetNeededByDatasetId`. F71 to F75: spine restrictions (`1ee2e4b2a`). Postgres branch: the `RelationLoading` module call sites (`b72a4d9fb`). F133: `QueryMediator.types.ts` and `queryRunner.ts` only, the same hunks as in the row above (`b603b61b8`, `3bdccd425`, `59c506f64`, `62bedf4ee`). F137: the same hunks as in the row above, minus `createDefaultRegistry.ts`: the `onRelationFetched` callback type, its pass-through, and its call from `queryRunner.ts`, with `notifyRelationFetched` so a failing listener cannot affect a query (`d4c1773ff`, `90f964bd4`). |
| `src/clients/qetl/QueryMediator/relationLoading.ts` on `develop` (`relationLoading/RelationLoading.ts` on `demo/measles`) | F113, Postgres branch, F133, F137 | F113: return early from `loadRelationBytes` when there are no relations, and skip the catalog read when `datasetColumnSource` is `stored`. Postgres branch: the move into the `RelationLoading` module and `getColumnReplacementsFromColumns`. F133: the projection key recorded per loaded view and the rebuild when it changes, conversions in a load, and virtual definitions as storage keys (`59c506f64`, `b66609496`, `62bedf4ee`). F137: a dataset is reported to `onRelationFetched` as its bytes arrive, before they are loaded into DuckDB (`d4c1773ff`, `90f964bd4`). |
| `src/clients/qetl/PublicQuerySession/PublicQuerySession.ts`, `__tests__/PublicQuerySession.test.ts` | F1, F113 | F1: the named create call. F113: `datasetColumnSource: "stored"` and the test that runs a public query through the real mediator without reading `dataset_columns`. |
| `src/clients/qetl/QueryMediator/__tests__/relationCacheProjection.test.ts` | F1, F113 | F1: the named create call. F113: the no-dataset query test and the "dataset column source" `describe` block. |
| `src/clients/dashboards/DashboardClient/dashboardSnapshotHelpers/dashboardPublishSnapshots.ts`, `DashboardClient.types.ts` | Postgres branch, F113, F133 | Postgres branch: the `match` on `sourceType` and the Google Sheets and Postgres whole-dataset slices (`90952bf3c`). F113: `hasColumnReplacements`, `datasetIdsWithColumnReplacements`, and `_getDatasetIdsWithColumnReplacements`. F133: `dashboardPublishSnapshots.ts` only, a dataset with a convert binding is sliced through the workspace query (`cac36bd9c`). |
| `src/views/GisApp/layers/displaceSpatialFeatures/displaceSpatialFeatures.{ts,test.ts}` | F114, F33, F35 | F114: the new file. F33: buffer unit and label fixture fields (`8654bc93f`) and buffered lat/lng layers (`a48efb85f`). F35: the per-map salt (`35ccfc7da`), the coordinate seed (`47055e3ea`), and the radius key (`bd9b706c7`). |
| `src/views/GisApp/layers/useMapLayersData/useMapLayersData.{ts,test.ts}` | F114, F33, F35 | F114: `displaceSpatialFeatures` in `_runSpatialLayer` and its tests. F33: the spatial filter and the popup-all widened query (including `5f934b1ac`'s test). F35: the `runMapLayerQuery` extraction and `jitterSalt`. |
| `src/views/GisApp/panels/LayerInspector/DataSection/__tests__/DataSection.geometry.test.tsx` | F116, F33 | F116: "puts every source column on a geometry layer's popup". F33: the default popup fields test (`8efa8a80d`). `2658b9b29` only reformats F116's test. |
| `src/views/GisApp/layers/MapLayerUpdates/__tests__/MapLayerUpdates.popup.test.ts` | F116, F33 | F116: the two new `withDefaultPopupColumns` tests. F33: `spatialFilter` and buffer fields in fixtures (`8654bc93f`). |
| `src/views/GisApp/panels/LayerInspector/ClassificationEditor/{ClassificationColorModeSelect.tsx,GraduatedControls/GraduatedControls.tsx,ClassificationEditor.test.tsx}` | F117, F31 | F117: `getNumericLayerColumns`, the `CreatedColor` return that adds the chosen column to the query, `GraduatedMeasureSelect` in `GraduatedControls`, and the two "numeric source column" tests (in their `32a16aa59` form). F31: presets, `classLabels`, `GraduatedClassList`, and the highlight shortcut. |
| `src/views/GisApp/GisAppMapShell.tsx` | F32, F33, F34, F35, F119 | F119: only the removed `GisAppLayerInspector` import and `inspector` slot. |
| `src/views/GisApp/useGisApp/useGisAppState.ts`, `useGisApp/useGisApp.test.ts` | F32, F33, F35, F119 | F32: the place tool state (`2fd2013e8`). F33: the feature list state (`bae548159`). F35: `jitterSalt` (`ee5bfe961`). F119: `useLayerPanelPage` and `openLayerSettings` in place of `expandPanel("inspector")`. |
| `src/views/GisApp/places/usePlacesActions.{ts,test.tsx}` | F32, F119 | F32: everything else, including `da00a84f2`. F119: one `app.openLayerSettings()` call after a places layer is added, and its mock. |
| `src/views/GisApp/useGisAppLayerActions.tsx`, `useGisAppLayerDeletion.test.ts`, `panels/LayerPanel/LayerActionsMenu/LayerActionsMenu.tsx` | F33, F119 | F33: the feature list menu item and closing it on delete (`bae548159`, `82060dc5b`). F119: opening the settings on add, and the menu's `className`. |
| `src/views/GisApp/panels/LayerPanel/LayerRow/LayerRowSelection/LayerRowSelection.tsx`, `panels/LayerInspector/LayerInspectorBody/LayerInspectorSections.tsx`, `shell/MapShell/MapShell.module.css` | F33, F119 | F33: area counts (`33f87025a`), the spatial filter section (`a56919bdd`), legend clearance (`0b7e2f726`). F119: `TruncatedText` names, the settings-page sections, and the single-panel shell. |
| `tests/e2e/gis-threshold-colors.spec.ts`, `gis-places.spec.ts`, `gis-feature-list.spec.ts`, `gis-export-feature-list.spec.ts` | F31, F32, F33, F34 (one each), F119 | F119: the layer settings region and Back steps from `4de947922` and `665aebff0`. F33 also owns `913b0b9bc` and `1de371b42` in `gis-feature-list.spec.ts`. |
| `src/components/RichText/RichTextComposer/RichTextComposer.test.tsx` | F18, F21 | F18 creates it (`cbe8aa972`). F21 adds the gadget tests, then `8759d0245` deletes it and splits it into `RichTextComposer/__tests__/`. Final state: deleted. |
| `supabase/schemas/23.comments__audit_triggers.sql` | F18, F21 | F18: the mention and audit triggers. F21: `comments__sync_gadget_refs`, including the tile-only sub id rule (`0c7f2b0ef`, `6e16a4cc3`). |

### Import, Data Explorer, and developer tooling (F120 to F127)

| File (final path) | Owners, in merge order | Each owner's hunks |
|---|---|---|
| `src/views/DataManagerApp/DataImportView/DataImportView.tsx` | F14 (merged), F120, F19 | F14: the dataset limit prompt. F120: no `AppViewHeader`, a visually hidden `h1`. F19: `isFillHeight` and the `DataImportTabs/` import path. |
| `src/views/DataManagerApp/DataImportView/DataImportTabs/DataImportTabs.{tsx,module.css}` | Postgres branch, F19, F23 | Postgres branch: the Connectors tab's `Stack` with `PostgresConnectorImportView` and `ConnectorsAdvisory`. F19: the CSS module and the fill-height panel, plus its `4c7c9d760` addendum (the `list` class and the panel padding). F23: its `9987ef9da` addendum (the tab-row `DataCatalogSearchField` in `listRightSection`, and the `search` state passed to `DataCatalogView`). |
| `src/views/DataExplorerApp/OpenDatasetDrawer/OpenDatasetModal.module.css` | F19 | F19 and its `4c7c9d760` addendum (`--ava-content-gutter` on `.importPanel` for every tab). |
| `src/views/DataManagerApp/DatasetNavbar/DatasetNavbar.tsx` | Postgres branch, F20, F121, F129, F136 | Postgres branch: the `postgres_table` source icon. F20: the phone layout lines. F121: `DatasetNavbarName` on `TruncatedText`. F129: a Dictionaries group after the dataset groups, and its filter and rows. F136: a Crosswalks group after Dictionaries, shown to Data Sources editors (`a2c127a26`). |
| `src/lib/ui/viz/DataGrid.tsx`, `src/lib/ui/viz/makeDataGridColumnDefs/makeDataGridColumnDefs.{ts,test.ts}` | F22, F71 to F75, F121 | F22 (BUG-003 and its follow-ups): extracts `makeDataGridColumnDefs`. F71 to F75: per-period formatters. F121: `headerComponentParams.innerHeaderComponent: DataGridColumnTitle`, and in `makeDataGridColumnDefs` only a docstring sentence and a renamed test. |
| `packages/web/ui/src/text/TruncatedText.tsx` | F118, F119, F121 | F118: `tooltipLabel`, the full-width root class, `withFullTextTooltip` defaulting to true. F119 and F121 only call it. |
| `src/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingList/DataCatalogListingList.tsx` | F17, F19, F23, F121 | F23: its `9987ef9da` addendum's one-line `DataCatalogListingName`. F121: `52c823754` moves that name onto `TruncatedText`, which goes with whichever of F23 and F121 lands second. |
| `src/lib/openData/fetchCatalogListingPreview/fetchCatalogListingPreview.{ts,test.ts}` | F24, F25, F30 | F24: its `95924d4fd` addendum (`dateColumnNames` is a list). F30: its `70a5a9480` addendum (a stored copy first, `CatalogListingPreviewSource`, `isCatalogListingSampleFormat`). |
| `src/views/DataManagerApp/DataImportView/DataCatalogView/useCatalogListingPreview/useCatalogListingPreview.ts` | F24, F30 | F30: its `70a5a9480` addendum (stored and live queries, `isRecheckingColumns`). |
| `src/lib/openData/fetchOpenDataColumnTypeSample/fetchOpenDataColumnTypeSample.ts` | F24, F28 | F24: its `3f344c3b1` addendum (shared reads, the 14-minute reuse, gateway retries). F28: the complete-sample hunks. |
| `src/components/providers/AvandarQueryClientProvider/queryPersister/queryPersister.ts` | F23, F24 | F23: `CACHE_SCHEMA_VERSION` `v10` (`dbf921eda`). F24: `v11` and the Set-shaped preview test (`95924d4fd`). |
| `src/views/DataManagerApp/DataImportView/AGENTS.md` | F24, F28, F122 | F24: the `DataCatalogView` sentence. F28: the complete-sample note. F122: the pasted link paragraph. |
| `src/clients/fetchEdgeFunctionRoute/fetchEdgeFunctionRoute.ts` | Postgres branch, F122 | Postgres branch: creates it (`20a52c7cc`). F122: the `method`, `body`, and `headers` options. |
| `supabase/config.toml` | F25, F122 | F25: the `STORAGE-` migrations in `[db.seed] sql_paths`. F122: `[functions.file-url]`. |
| `tests/e2e/odc-parquet-copy.spec.ts` | F23, F25 | F23's `9987ef9da` addendum drops the "Filters" region from the search locator. F25 owns the spec and takes its final file. |
| `tests/e2e/data-catalog-filters.spec.ts` | F23 | F23, plus its addenda `0f41fef3a`, `9987ef9da`, and `632415e08`. |
| `apps/desktop/scripts/gen-sqlite-migrations/getManualMigrationBodyFromSourceFile.ts` | F23, F71 to F75 | F23: the catalog field mapping body. F71 to F75: the `list_field_value_rules` override, keyed `20261109030001_list_field_value_rules.sql` since `43573a2ec`. |
| `AGENTS.md` (the Supabase section) | `develop` (`183a41c50`), F126 | `develop`: the "switch only when the branch changes what the stack is built from" rule. F126: the env-based wording (status headline, no `config.toml` rewrite, no restore before merge, `--branch`). The final section is `demo/measles`'s at `34798387c`. |
| `apps/ava-cli/src/main.ts`, `apps/ava-cli/README.md` | F15, F126 | F15: `--env` replaces `--staging` and `--prod`. F126: `CommandHelp.handleArgv` and the per-branch Supabase commands. Whichever lands second resolves. |
| `packages/shared/utils/src/types/Empty/Empty.ts` | `develop` (`9a8b24233`, #315), F126, F127 | All three rewrap the same docstring. `develop` already wraps it within 80 columns: F126's `48ad53a7b` and F127's `d45e26490` take `develop`'s wrap. |
| `src/views/GisApp/useGisApp/MapSourceHydration/useHydratedMapSources/useHydratedMapSources.ts` | F127, F35 | F127: the stable `updateConfig` (plus `d45e26490`'s `HydrationInputs` names, which only PR #321 has). F35: `aad4d700d` moves the config hydration into `useHydratedMapConfig.ts`. |
| `.github/workflows/pr-develop.yaml` | F127, F96 to F112 | F127: `ubuntu-24.04` and the timeout. F96 to F112: `pnpm check:plugin-bundle`. |
| `.github/workflows/demo.yaml` | F13, F25 | F13, plus its `2efc74421` addendum (Supabase CLI 2.114.0). F25: `AVA_PIPELINE_SERVER_URL`. |

### Data dictionaries (F129 to F138)

| File (final path) | Owners, in merge order | Each owner's hunks |
|---|---|---|
| `src/views/DataManagerApp/DatasetMetaView/DatasetMetaView.tsx` | Postgres branch, F21, F24, F131, F133, F134 | Postgres branch: the `postgres_table` source labels (`a0b8f1646`, `20a52c7cc`). F21: the shared source labels (`af925c7e6`). F24: the catalog preview (`d8a72da58`). F131: `useDatasetColumnCodes` and the codes passed to the column list and rail (`6248dc0f6`). F133: `useLinkedDatasets` and the linked datasets passed to the rail (`76d145c3e`). F134: the columns ordered by `column_idx` with `toColumnsInTableOrder` (`25da4ee87`). |
| `src/views/DataManagerApp/DatasetMetaView/DatasetMetadataList.tsx`, `src/views/DataManagerApp/DatasetMetaView/DatasetSourceRail.tsx` | Postgres branch, F131, F132, F133, F134, F136 | Postgres branch: the `postgres_table` arm (`a0b8f1646`). F131: `BoundColumnName` in the Columns list with its meta line, and the rail's Dictionaries group (`6248dc0f6`, `e26030a83`). F132: `DatasetMetadataList.tsx` only, the Description column's `renderValue` that shows the entry's description, and `BoundColumnName` without it (`22804b213`). F133: `DatasetMetadataList.tsx` passes `datasetId` to `BoundColumnName` and shows a converted column's read-only type with `ConvertedTypeNote` (`7663ab9e0`); `DatasetSourceRail.tsx` adds the `VirtualDataset` arm with `LinkedSourceFact` and the linked datasets (`76d145c3e`). F134: `DatasetSourceRail.tsx` only, the dataset passed to the Dictionaries group, which offers Re-apply (`6f5fd62a8`). F136: `DatasetSourceRail.tsx` only, `CombinedByFact` in the rail of a combined dataset (`539d28a69`). |
| `src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/DatasetActionsMenu.tsx` | Postgres branch, F130, F131, F133, F136 | Postgres branch: the refresh menu items (`20a52c7cc`). F130: `CreateDictionaryMenuItem` (`4ff06c4ca`). F131: `DictionaryMenuItems`, which offers Apply a dictionary and hides Create once one is applied (`32098fc2b`, `e26030a83`). F133: `DeleteDatasetConfirmBody` names the linked datasets, and Delete waits for them (`402335d0b`, `6705c3e3c`). F136: `DatasetActionsMenu.tsx` and `DictionaryMenuItems.tsx` hide Apply a dictionary on a combined dataset through `useCombiningCrosswalk` (`539d28a69`, `2b5ebde5e`), with `DatasetActionsMenu.test.tsx`. |
| `src/lib/ui/viz/DataGridColumnTitle/DataGridColumnTitle.tsx` | F23, F121, F131 | F23: the layer list (`52c823754`). F121: the truncated title tooltip. F131: the code list tag read from `ColumnCodesContext` (`e82540818`). |
| `src/config/AppLinks/AppLinks.tsx` | F66, F129, F130, F131, F136 | F66: Assigned to me. F129: the dictionary view. F130: the create route. F131: `dataManagerApplyDictionaries` (`23d401540`). F136: `dataManagerCrosswalkView` and `dataManagerNewCrosswalk` (`a2c127a26`), with `AppLinks.test.ts`. |
| `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers.ts` | F82, F87, F89, F128, F131 | F131: loading the workspace's column codes into the agent's datasets (`fb01c764b`). |
| `supabase/functions/chat/PostAgentStream/loadDataAgentDatasets.ts` | F82, F131 | F131: `loadColumnCodes` with the caller's own client (`90aac2562`). |
| `src/lib/agent/dataAgent/offline/{profileOfflineDatasets,buildOfflineDataAgentSystemPrompt,findQuestionValues}/*.ts` | F82, F83, F131 | F131: code lists in the offline profile, question values matched by label, and the capped code lines (`513e88d44`, `5ba9698b6`). |
| `scripts/ai-eval/harnesses/pi/PiLocalHarness.ts`, `scripts/ai-eval/runtime/EvalDatabase.ts` | F81, F83, F131, F133 | F131: column codes in the local harness, and the measles workspace's bindings in the eval database (`5ce5ba8a2`, `c567ca769`). F133: `EvalDatabase.ts` only, a column's `sourceSql` for the converted copy of the line list (`da036466e`). |
| `tests/e2e/agent-chat-sessions.spec.ts`, `tests/e2e/agent-chat-mentions.spec.ts` | F91, F128, F131 | F91 owns mentions and F128 owns sessions. F131: the `data-agent-v5` route (`03ca7f39c`, `b60b9206d`). |
| `tests/e2e/dictionary-create-from-dataset.spec.ts`, `src/views/DataManagerApp/NewDictionaryFromDatasetsView/{SaveStep/SaveStep.tsx,ProposalStepBody.tsx,useCreateDictionary.ts,useNewDictionaryFlow.ts,newDictionaryReducer/newDictionaryReducer.ts}` | F130, F131 | F131: "Apply it to <dataset> next" on Save, `useOpenAfterCreate`, and the spec expecting Apply after a save (`242d427ef`, `ec386f1f6`, `d6f624f77`, `0a70cfcc6`). |
| `src/views/DataManagerApp/DataDictionaryView/{DataDictionaryEditor,DataDictionaryHeader,DictionaryUsedByTab}/*` | F129, F131, F133, F134, F136 | F129: the editor, header, and placeholder Used by tab. F131: the Used by count and table, and Apply to a dataset (`b278896db`, `ec386f1f6`, `c6ed4e267`). F133: `DataDictionaryEditor.tsx` passes the dictionary's version to `useDictionaryUsage`, and Used by says Reference or Linked and whether a dataset is behind, in `HowAppliedCell.tsx` and `UsageStatusCell.tsx` (`238ee4188`). F134: `DataDictionaryEditor.tsx` passes the dictionary's name to `useDictionaryUsage`, and Used by offers Re-apply under a behind status, set in ink (`6f5fd62a8`, `1f2459c4a`, `83af03334`). F136: `useDictionaryUsage/` reads crosswalks, and Used by lists a combined dataset as Crosswalk with its status and Open crosswalk, in `HowAppliedCell.tsx`, `UsageStatusCell.tsx`, `DictionaryUsedByTable.tsx`, and the new `OpenCrosswalkLink.tsx` (`539d28a69`, `2b5ebde5e`). |
| `src/clients/dataDictionaries/DictionaryBindingClient.ts` | F131, F133, F134 | F131: reading and applying bindings (`ab41fb10f`). F133: conversions and added values in the apply call, and the linked-dataset apply (`5a2d003f1`). F134: `reapplyDictionary`, which calls `rpc_dataset_columns__reapply_dictionary` (`c055c0854`). |
| `src/clients/qetl/QueryMediator/QueryableRelationColumns/QueryableRelationColumns.ts`, `src/clients/qetl/QueryMediator/getRelationSources.ts`, `src/lib/dataDictionaries/loadColumnReplacements/loadColumnReplacements.ts`, `docs/qetl-architecture.md` | F133, F134, F137 | F133: see its rendering and loading area. F134: a table loaded outside the recorder counts as current only when the dataset needs no replacements, and the columns are read with `fetchQuery` once invalidated (`35db27b15`, `1ca97e30f`). F137: `docs/qetl-architecture.md` only, a Progress paragraph on the `onRelationFetched` callback (`d4c1773ff`, `90f964bd4`). |
| `src/views/DataManagerApp/DataDictionaryView/useSaveDataDictionary.ts` | F129, F131, F133 | F129: the save hook and its refresh of the dictionary, entries, code lists, and codings. F131: the refresh also covers the bindings, so Used by is current after a save removes an entry (`ca665cb44`). F133: a save also refreshes the dataset columns and the cached rows, so converted datasets show the new labels (`238ee4188`). |
| `src/clients/datasets/DatasetClient/{DatasetClient.ts,createDatasetQueries.ts}` | Postgres branch, F132 | Postgres branch: the Postgres table source (`581fa414b`). F132: the `getEditableIds` query (`051931742`). |
| `shared/models/queries/QueryResultColumnBindings/QueryResultColumnBindings.types.ts` | F75, F132 | F75: `bucketGrain` (`00a93b53d`). F132: the `ProjectionDescriptor` docstring names `count(*)` (`b78b7b893`). |
| `src/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/ColumnSection/ColumnSection.tsx` | F131, F133 | F131: the code list tag beside a bound column's name (`6248dc0f6`). F133: the tag gets `datasetId`, so its popover can count unlabeled values (`7663ab9e0`). |
| `supabase/schemas/50.rpc_data_dictionaries__save.sql` | F129, F130, F133 | F129: the save RPC. F130: its pair check. F133: re-pointing reference bindings and re-deriving converted columns' types after a save (`90c9e86b5`). Regenerate each migration, never copy it. |
| `src/clients/DuckDbClient/duckDbParquetLoad.ts` | F63, F133 | F63: see its section. F133: the kept `ENUM` values read before the view is built, and the `ava_raw_` view of the values as stored (`b195ad2e8`). |
| `src/clients/DuckDbClient/arrowFieldToQueryResultField.ts` | F70, F133 | F70: list, struct, decimal, date, and time fields. F133: a dictionary-encoded text field (an `ENUM`) is `varchar` (`cac36bd9c`). |
| `src/lib/sql/DuckDbSqlAnalyzer/duckDbSqlSources.ts` | F22's BUG-001, F69, F133 | F22's BUG-001 and F69: see F69's section. F133: an `ava_raw_<datasetId>` view is reported as a read of its dataset, like `ava_rows_` (`b195ad2e8`). |
| `src/lib/dataDictionaries/ColumnProfileSql/{ColumnProfileSql.ts,__tests__/ColumnProfileSql.test.ts}` | F130, F133, F136 | F136: `DATE_FORMATS` is exported and `buildDateSampleSql` reads a column's date samples for date-format detection (`6ab82052e`, `66caa70bc`). |
| `src/views/DataManagerApp/NewDictionaryFromDatasetsView/PickDatasetsStep/{PickDatasetsTable.tsx,PickDatasetRow.tsx,PickDatasetsStep.module.css}` | F130, F136 | F136: the `isLocked`, `lockedReason`, and `unavailableReason` row props, so the crosswalk's Add datasets modal can show a dataset that is already added or cannot be picked (`70e95bce5`, `66caa70bc`). |
| `src/views/DataManagerApp/DatasetMetaView/clearCachedDatasetRows.ts` (with `.test.ts`, `useRefreshGoogleSheetDataset.test.ts`, `useRefreshPostgresTableDataset.test.ts`) | F133, F136 | F133: a refresh also clears the linked datasets that read the dataset. F136: it also clears the combined datasets that read it (`539d28a69`, `2b5ebde5e`). |
| `shared/models/dataDictionaries/DictionaryMatch/DictionaryMatchModule/{DictionaryMatchModule.ts,DictionaryMatchModule.test.ts}` | F131, F136 | F136: `getBestCodeList`, which picks the code list a set of values fits best (`464e93afc`). |
| `shared/models/datasets/AvaDataType/{AvaDataTypeModule.ts,AvaDataTypeModule.test.ts}` | F136 | F136 adds `toDuckDbTypeSql` (`ccbfd332d`). Listed because the test file is new. |
| `shared/models/Permissions/PermissionsModule/{PermissionRegistry.ts,__tests__/PermissionsModule.test.ts}` | F129, F136 | F129: the dictionary keys. F136: `data_sources__can_edit_crosswalks` for Data Sources editors and admins (`a2c127a26`). |
| `src/views/DataManagerApp/DataManagerToolbarActions/{DataManagerToolbarActions.tsx,DataManagerToolbarActions.test.tsx}`, `src/views/DataManagerApp/DataManagerApp.tsx`, `src/views/DataManagerApp/useListPaneToggle/{useListPaneToggle.ts,useListPaneToggle.test.ts}` | F129, F130, F136 | F136: `NewCrosswalkButton.tsx` after New dictionary, the Crosswalks list through the new `useDataManagerLists/`, and the list pane collapsing on the crosswalk routes (`a2c127a26`). |
| `tests/e2e/helpers/{constants.ts,seedDataDictionary.ts}` | F130, F131, F133, F136 | F136: the crosswalk line list paths in `constants.ts`, and a second coding per seeded entry in `seedDataDictionary.ts` (`7acb100b3`). |
| `src/lib/dataDictionaries/DictionarySuggestions/{DictionarySuggestions.ts,DictionarySuggestions.test.ts}` | F130, F137 | F130: the create flow's suggestions run online with consent, or offline, and the later fixes to its request limits and consent (`620305730`, `7e28f1fe4`, `730e17cb8`, `931a5dcb1`, `0485db5ed`, `fc3ac948c`, `8081e5d87`, `5c6667f23`). F137: `makeMatchesRequestFromColumns`, which builds a meaning request from two sets of columns for the crosswalk (`a66ba38e8`). |
| `src/clients/qetl/WorkspaceQuerySession/{WorkspaceQuerySession.ts,WorkspaceQuerySession.membership.test.ts}` | F1, F71 to F75, F137 | F1: the named create call (`9377eb6c8`). F71 to F75: spine restrictions pass through `runQuery` (`1ee2e4b2a`). F137: `runQuery` accepts `onRelationFetched` and passes it to the mediator (`d4c1773ff`). |

---

## F1: `@avandar/modules` factory and mixin refactor

**Purpose:** Rebuild every module layer on each state change, and give
`createModuleFactory` a typed, unbounded mixin tuple. **Value:** This fixes
real bugs (setters dropping mixins, shadowed getters) and is the base the
HttpClient builds on.

**PR title:** `feat(modules)!: rebuild modules on every state change and add typed factory mixins`

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `3f8fb4154` | feat(modules): add the module and mixin type model | all |
| `4669a8b40` | feat(modules): rebuild every layer of a module on each state change | all |
| `85638b7f1` | feat(modules): give factories a typed default state and mixin tuple | all |
| `cb7701ab4` | feat(modules)!: export the rebuilt module and factory API | all |
| `aba430eff` | fix(modules): reject member overrides by spreading and reserved keys from mixins | all |
| `9377eb6c8` | refactor: move createModuleFactory callers to named create calls | all (13 files) |

**Files:**
- `packages/shared/modules/**`
- `packages/node/etl/src/EtlEngine/EtlEngine.ts` and `EtlEngine.test.ts`
- `src/clients/qetl/QueryMediator/QueryMediator.ts`, `QueryMediator.coordination.test.ts`, `__tests__/QueryMediator.concepts.test.ts`, `__tests__/relationCacheOrdering.test.ts`, `__tests__/relationCacheProjection.test.ts`
- `src/clients/qetl/PublicQuerySession/PublicQuerySession.ts`, `__tests__/PublicQuerySession.test.ts`, `__tests__/PublicQuerySession.race.test.ts`
- `src/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession.ts`, `WorkspaceQuerySession.coordination.test.ts`
- `apps/pipeline-server/pipelines/world-bank__wdi/run.ts`: only the `EtlEngine.create` hunk (shared file)

**Schema:** none.

**Docs:** `packages/shared/modules/README.md`. The design and plan are in F9.

**Verification:**
```sh
pnpm test:modules && pnpm --filter @avandar/modules type-check && pnpm --filter @avandar/modules build
pnpm test:etl && pnpm test:clients && pnpm test:logger && pnpm --filter @avandar/query-hooks test
pnpm vitest run src/clients && pnpm type-check
```

---

## F2: `HttpClientFactory` with rate limiting, and open data read through it

**Purpose:** A small `fetch`-based client built on `createModuleFactory`, with
named auth strategies, a response size cap, middlewares and a Bottleneck
`withRateLimit` mixin. The existing open-data code moves onto it.
**Value:** No axios. Credentials never leave `baseUrl`'s origin. Pipelines can
stay under API rate limits.

**PR title:** `feat(http-client): add HttpClientFactory with rate limiting and read open data through it`

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `f54603af8` | feat(http-client): add HttpClientFactory with a withRateLimit mixin | all |
| `625458385` | fix(http-client): keep URLs out of network errors and tidy redirect handling | all |
| `55a5fb54b` | refactor(open-data): read open data through HttpClientFactory and rate-limit the pipelines | **MIXED**, see below |

**Files:**
- `shared/utils/HttpClientFactory/**`
- `package.json`: the `"bottleneck": "^2.19.5"` dependency. Install it with `pnpm add -w bottleneck@^2.19.5`, which also updates `pnpm-lock.yaml`.
- `deno.json`: the `"bottleneck": "npm:bottleneck@2"` import.
- From `55a5fb54b`, only these:
  - `shared/connectors/open-data/CkanClient/CkanClient.types.ts`: `OpenDataHttp` as `Pick<HttpClient, "get" | "getBytes">`
  - `CkanClient/CkanClient.ts` and `CkanClient.test.ts`: `getJson` becomes `get`
  - `acquireOpenDataResource.test.ts`: `getJson` becomes `get`
  - `supabase/functions/open-data/OpenDataRoutes.ts`: the `HttpClientFactory.create("OpenDataRouteHttpClient", ...)` hunk
  - Delete `shared/connectors/open-data/createOpenDataHttp.ts` and `createOpenDataHttp.test.ts`.

  Its Socrata, HDX and freshness-token files go with F6, F7 and F8.

**Schema:** none.

**Docs:** the design and plan are in F9.

**Verification:**
```sh
pnpm vitest run shared/utils/HttpClientFactory shared/connectors/open-data && pnpm type-check
```

**Addendum: follow-up commits mapped on 2026-11-10.** Port these with F2.

Add to **Commits to read**:

| SHA | Subject | Take |
|---|---|---|
| `9f0a7ef06` | test(utils): drive withRateLimit spacing tests with a fake clock | All of it. The spacing tests compared `performance.now()` readings against a real-timer threshold and failed intermittently under a full suite run. They now run on a fake clock and assert exact virtual-time gaps and request counts. |
| `648d48a35` | chore: apply formatter and wrap long comments | MIXED (formatting only): its `shared/utils/HttpClientFactory/**` hunks. Take the final files. |

Files: no addition (`shared/utils/HttpClientFactory/**` already covers
`mixins/withRateLimit/withRateLimit.test.ts`).

---

## F3: Move `shared/open-data` to `shared/connectors/open-data`

**Purpose:**
- Move the open-data code under `shared/connectors/`.
- Rename `OpenDataAccess`'s CKAN-specific fields (`ckanDatasetId`, `ckanResourceId`) to protocol-neutral `externalDatasetId` / `apiResourceId`.

**Value:** One home for every external-source connector, and an access shape
that Socrata reuses. It's a pure refactor with no behavior change, so a small
review.

**PR title:** `refactor(open-data): move shared/open-data under shared/connectors and make OpenDataAccess protocol-neutral`

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `65b4cc8ad` | refactor(open-data): rename OpenDataAccess's ckan-named fields to protocol-generic names | all, applied to the `develop`-era `catalog-entries` model path |
| `710de67b1` | refactor: move shared/open-data to shared/connectors/open-data | all (renames plus import updates in `DatasetParquetWrapper.ts`, `src/lib/openData/*`, `OpenDataRoutes.ts`, `statusFromOpenDataFailure*`, `docs/qetl-architecture.md`) |
| `d8f5edfde` | docs: rewrap a comment that exceeded 80 chars after the open-data path rename | all |

**Schema:** none.

**Verification:**
```sh
pnpm vitest run shared/connectors/open-data src/lib/openData src/clients/qetl/wrappers && pnpm type-check
```

---

## F4: The drive concept: data catalog listings schema and drive index infrastructure

**Purpose:**
- Rename `catalog_entries__open_data` / `catalog_entries__dataset_column` to `data_catalog_listings` / `data_catalog_listings__relation_columns`, and rename the TypeScript models, clients and views to `DataCatalog*`.
- Make the `api_resource` unique index non-partial, so PostgREST upserts can target it.
- Add the shared pipeline code that upserts drive index rows.
- Document the Service / Drive / Connection / Relation vocabulary.

**Value:** The catalog becomes a service-agnostic drive index that any
connector's pipeline can fill.

**PR title:** `feat(data-catalog): introduce drives and rename catalog entries to data catalog listings`

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `4ffd5a2c3`, `35ab72be8`, `44fb01349`, `7fc9dcd94`, `486c3619e` | connector nomenclature docs | `docs/measles-demo/connector-nomenclature.md` (final), and the `docs/qetl-architecture.md` hunks from `35ab72be8` |
| `fed658747` | docs: move branch-created markdown into docs/measles-demo | **MIXED**: only `connector-nomenclature.md` and the `docs/qetl-architecture.md` hunk |
| `974635361`, `03cf621ed` | hierarchy and rename docs | **MIXED**: only `connector-nomenclature.md`. The `open-data-catalog-architecture.md` hunks go to F9. |
| `95c0ef5a3` | feat(open-data): add the metacatalog pipeline's upsert function | history only: the final file is `pipelines/shared/upsertDataCatalogListingRows/` |
| `95fdec9ef` | fix(open-data): make the api_resource unique index non-partial | schema and test hunks. Its `.gen.sql` is regenerated. |
| `a4fcff8b9` | docs(open-data): correct an overclaiming comment and a now-stale 'partial index' reference | the schema comment, plus the comment in the shared upsert's final file |
| `99a93590b` | refactor(open-data): rename catalog_entries to catalog_listings | schema, model, client and view renames. **Hand-written rename migrations:** compose them with `65b671f52`. |
| `3ab3a4d90` | refactor(open-data): rename catalog entry to catalog listing in TypeScript | **MIXED**, see below |
| `e4f2f2251` | chore(i18n): regenerate catalogs for the catalog-listing UI string | regenerate, don't copy |
| `65b671f52` | refactor(open-data): rename catalog_listings schema to data_catalog_listings | schema, tests, `syncable-tables.ts`. **Hand-written rename migration.** |
| `535293bb4` | refactor(open-data): rename catalog listing identifiers to DataCatalog* in TypeScript | all except hunks in files F4 doesn't own yet (Socrata or cache code in `acquireOpenDataResource*`, `readOpenDataFreshnessToken*`) |
| `8e676399c` | refactor(open-data): split the metacatalog pipeline into hdx and socrata | **MIXED**: only `pipelines/shared/**` and `world-bank__wdi/catalogOpenDataInsert.ts` |

**`3ab3a4d90` files owned by F4:**
- the `shared/models/...` renames
- `src/clients/**`
- `src/views/DataManagerApp/DataImportView/**`
- `src/lib/openData/*`
- `shared/models/datasets/OpenDataDataset/*`
- `supabase/functions/open-data/OpenDataRoutes.types.ts`
- the rename hunks in `OpenDataRoutes.ts` and `acquireOpenDataResource*`
- `apps/pipeline-server/pipelines/shared/createSupabaseAdminClient.ts`
- `world-bank__wdi/catalogOpenDataInsert.ts` and `run.ts` (the `createSupabaseAdminClient` move)
- `supabase/functions/connectors/ExternalDatasetRoutes.types.ts` (a comment rename). If the Postgres branch hasn't renamed `external-datasets` to `connectors` yet, apply it to `supabase/functions/external-datasets/ExternalDatasetRoutes.types.ts`.

Its CKAN files go to F7 and `makeListingRowFromSocrataResult` to F6.

**Final files to take:**
- **Schemas:**
  - `supabase/schemas/00.enum.data_catalog_listings__access_kind.sql`
  - `00.enum.data_catalog_listings__api_service.sql`: the rename only
  - `10.data_catalog_listings.sql`: without the cache columns
  - `20.data_catalog_listings__relation_columns.sql`
  - `20.datasets__open_data.sql`
  - `70.rpc_datasets__add_open_data_dataset.sql`
- **Database tests:**
  - `supabase/tests/database/data_catalog_listings_access.test.sql`: without the cache tests
  - `supabase/tests/database/permissions/exact_data_api_grants.test.sql`
- **Models:** `shared/models/data-catalog-listings/**`, without the Socrata and cache fields
- **Clients:** `src/clients/data-catalog-listings/*`
- **Views:** `src/views/DataManagerApp/DataImportView/DataCatalogView/**`, `DataImportTabs/DataImportTabs.tsx`
- **Desktop sync:** `apps/desktop/sync/syncable-tables.ts`
- **Pipeline code:**
  - `apps/pipeline-server/pipelines/shared/DataCatalogListingRow.types.ts`
  - `pipelines/shared/upsertDataCatalogListingRows/*`
  - `pipelines/shared/createSupabaseAdminClient.ts`
- **Docs:**
  - `docs/adding-new-data-source-types.md`
  - `src/views/DataManagerApp/DataImportView/AGENTS.md`

**Migrations:** write **one** hand-written rename migration that goes straight
from `catalog_entries*` to `data_catalog_listings*`. Compose it from:
- `supabase/migrations/20261017112819_rename_catalog_entries_to_catalog_listings.sql`
- `20261017113718_rename_add_open_data_dataset_catalog_entry_param.sql` (the RPC is dropped and re-created with `p_catalog_listing_id`)
- `20261017121944_rename_catalog_listings_to_data_catalog_listings.sql`

Skip the intermediate `catalog_listings` names. Then regenerate the
non-partial index change (`20261017015400_*`) declaratively. Regenerate every
`apps/desktop/migrations/*.gen.sql` mirror.

**Uncommitted on the branch:** none. The section 6.7 pipeline invariant
(`a325df511`) goes to F9.

**Verification:**
```sh
ava supabase status            # must read green (switched) before any db command
pnpm db:reset && pnpm test:db && pnpm db:gen-types
pnpm desktop:sqlite:check-migrations && pnpm i18n:check
pnpm vitest run shared src/clients src/views/DataManagerApp && pnpm test:pipeline-server && pnpm type-check
```

**Addendum: follow-up commits mapped on 2026-11-10.** Port these with F4.

Correction to **Final files to take**: four of F4's pipeline files are
deleted at the tip, so take them as of `f78be622b`, not the final state:
- `apps/pipeline-server/pipelines/shared/DataCatalogListingRow.types.ts`, `upsertDataCatalogListingRows/*`, `createSupabaseAdminClient.ts`: F49 deletes them (`f5ef918fb`).
- `apps/pipeline-server/pipelines/world-bank__wdi/catalogOpenDataInsert.ts`: F45 deletes it (`60a12a7be`).

`supabase/schemas/11.data_catalog_listings.sql` and
`data_catalog_listings_access.test.sql`: leave out F44's, F51's, and F54's
hunks (see **Files shared by several features**).
`docs/measles-demo/connector-nomenclature.md`: `27501de72`, `90c27cf9b`,
and `6c9450fd6` added text about F49 and F51. Take the file as of
`f78be622b`; F9 brings it to its final state.

---

## F5: dropped

The `external-datasets` to `connectors` edge-function rename (`b3da0b439`,
`4617cf53b`) only touches Postgres-connector code. The Postgres branch carries
it, so nothing here is ported.

---

## F10: Pipeline run options: `ava pipeline run --limit` and `.env.pipelines.local`

**Purpose:** `ava pipeline run <name> --limit <n>` stops a pipeline after `n`
datasets, in `--local` mode and through the pipeline-server. Pipeline-only
secrets (API keys) live in a gitignored `.env.pipelines.local`, copied from
the committed `.env.pipelines.example`. **Value:** a pipeline can be tried
against a real source in seconds instead of a full run, and API keys stay out
of `.env.development`.

**PR title:** `feat(pipelines): add ava pipeline run --limit and a .env.pipelines.local secrets file`

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `eba708217` | feat(pipelines): add ava pipeline run --limit and a .env.pipelines.local secrets file | all |

**Files:**
- `apps/ava-cli/src/PipelineCli/RunPipelineCli/RunPipelineCli.ts` and its test, `runPipelineLocal.ts`, `sendRunPipelineRequest.ts`
- `apps/pipeline-server/src/routes/pipeline-name/registerPipelineRoutes.ts` and its test, `run/run.ts`
- `apps/pipeline-server/pipelines/shared/PipelineRunOptions.types.ts`, `parsePipelineRunLimit/**`, `getOptionalEnvVar/**`
- `apps/pipeline-server/pipelines/world-bank__wdi/run.ts`: only the `run(options)` hunk that rejects `--limit` (shared file)
- `scripts/runPipelineOnce.ts`
- `.env.pipelines.example`, `.gitignore` (the `.env.pipelines.local` line), `package.json` (the `-e .env.pipelines.local` in `dev:pipeline-server` and `dev:pipeline-server-prod`)
- `apps/pipeline-server/README.md`: the API-key bullet and the "Running one pipeline" section

**Schema:** none.

**Notes:**
- `.env.pipelines.local` never overrides a key `.env.development` defines: `runPipelineOnce.ts` loads it with `process.loadEnvFile`, which keeps existing variables, and `dotenv-cli` loads it before `.env.development`.
- The `ava` binary is built (`pnpm build:ava-cli`). Test the new flag with this worktree's build, `node apps/ava-cli/dist/main.cjs pipeline run ...`, or rebuild.

**Verification:**
```sh
pnpm test:pipeline-server && pnpm --filter @avandar/ava-cli test && pnpm exec tsc -b --noEmit
pnpm --filter @avandar/ava-cli build && node apps/ava-cli/dist/main.cjs pipeline run world-bank__wdi --local --limit 1   # expect the "does not support --limit" error
```

**Addendum: follow-up commits mapped on 2026-11-10.** Port these with F10.

| SHA | Subject | Take |
|---|---|---|
| `127b6c0d9` | (F7's addendum commit) | **MIXED:** only `.env.pipelines.example` and the `apps/pipeline-server/README.md` API-key bullet, which now names only `SOCRATA_APP_TOKEN`. |
| `1fb64a3b6` | updated env pipelines example | All of it (`.env.pipelines.example` wording; drops the Fly secrets line). |

Correction: take `.env.pipelines.example` and the README bullet as of
`1fb64a3b6`. Take F10's other files as of `eba708217`, not the final state:
F47 deletes `parsePipelineRunLimit/**` and turns `PipelineRunOptions.types.ts`
into `EtlRunOptions`, and F38, F47, F50, F51, F55, F11, and F26 extend
`RunPipelineCli.ts`, `runPipelineLocal.ts`, `sendRunPipelineRequest.ts`,
`registerPipelineRoutes.ts`, `run/run.ts`, and `scripts/runPipelineOnce.ts`.

---

## F11: Live progress output for `ava pipeline run`

**Purpose:** `ava pipeline run --local` prints progress while the run goes:
each crawl's drive and scope as it starts and ends, page updates (at most
every 5 seconds) with the percent of the `--limit` reached (or of crawls done
when there is no limit), datasets, tables, columns, and elapsed time, and a
"still running" line after 15 seconds without output. A server run prints the
heartbeat only, since the server streams nothing. A crawl the limit skipped
now reads `(pipeline dataset limit reached)`. **Value:** a long run that has
hung is easy to tell apart from a slow one.

**PR title:** `feat(pipelines): print live progress during ava pipeline run`

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `f2db070a7` | feat(pipelines): print live progress during ava pipeline run | all |

**Files:**
- `packages/node/etl/src/EtlEngine/EtlEngine.types.ts`: the `onProgress` option on `EtlRunOptions` and the `EtlRunProgress` type
- `packages/node/etl/src/EtlEngine/createRunProgressReporter/**`
- `packages/node/etl/src/EtlEngine/crawlScope/crawlScope.ts`: `onPageLoaded`, `CrawledPageCounts`, `_countPage`
- `packages/node/etl/src/EtlEngine/createEtlEngine/createEtlEngine.ts` and its test (the `progress` describe)
- `packages/node/etl/src/index.ts`: the `EtlRunProgress` export
- `apps/pipeline-server/pipelines/shared/runPipelineAndPrintReport/**`: `PIPELINE_PROGRESS_LINE_PREFIX` and the stderr writer
- `apps/ava-cli/src/PipelineCli/PipelineRunProgress/**`
- `apps/ava-cli/src/PipelineCli/runPipelineLocal.ts` and its test: async `spawn` that streams stderr
- `apps/ava-cli/src/PipelineCli/RunPipelineCli/RunPipelineCli.ts` and its test
- `apps/ava-cli/src/PipelineCli/PipelineRunReport/printPipelineRunReport.ts` and its test: the skipped-crawl label

**Schema:** none.

**Notes:**
- The progress line prefix, `ava-pipeline-progress `, is written in both `runPipelineAndPrintReport.ts` and `runPipelineLocal.ts`, since `ava-cli` does not depend on `@avandar/etl`. Keep them in sync.
- Columns count what `transform` declares. HDX CSV resources declare none at crawl time, so an HDX CSV crawl shows 0 columns.

**Verification:**
```sh
pnpm --filter @avandar/etl exec vitest run && pnpm test:pipeline-server && pnpm --filter @avandar/ava-cli test && pnpm exec tsc -b --noEmit
pnpm --filter @avandar/ava-cli build && node apps/ava-cli/dist/main.cjs pipeline run hdx --local --limit 10
```

---

## F12: Invalid catalog listings, and DuckDB-parsed column type samples

**Purpose:** a catalog listing whose dataset cannot be loaded is marked
`is_invalid` with an `invalid_dataset_reason` (`empty_dataset`,
`dataset_not_found`, `authorization_required`, `unsupported_format`,
`external_host`, `unparseable_dataset`, `unreachable_dataset`), and the
catalog shows it as indexed but not loadable, with the reason, a list
marker, and Add blocked. The `column-type-sample` route stops parsing CSV:
it sends the file's first bytes gzipped, and the browser's DuckDB finds the
delimiter, quoting, and header. **Value:** empty or dead HDX files say why
instead of showing a generic error, and semicolon-delimited files or files
with a blank header cell verify instead of failing.

**PR title:** `feat(open-data): mark unloadable catalog listings and let DuckDB parse samples`

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `f5f14f86e` | feat(db): track catalog listings whose dataset cannot be loaded | all |
| `a2ba0d281` | feat(open-data): mark unloadable catalog listings and let DuckDB parse samples | all |

**Files:**
- `supabase/schemas/00.enum.data_catalog_listings__invalid_dataset_reason.sql`, `supabase/schemas/50.rpc_data_catalog_listings__mark_invalid.sql`
- `supabase/schemas/10.data_catalog_listings.sql`: the two columns and `data_catalog_listings__invalid_reason_complete`
- `supabase/schemas/50.rpc_data_catalog_listings__upsert_with_relation_columns.sql`: keep the mark until `date_of_last_update` changes
- `supabase/schemas/50.rpc_data_catalog_listings__write_verified_column_types.sql`: clear the mark
- `supabase/tests/database/rpc_data_catalog_listings__mark_invalid.test.sql`, and the new cases in the upsert and write-verified tests
- `shared/connectors/open-data/openDataErrors.ts`: `resource-empty`, `resource-authorization-required`, `ckan-unreachable`
- `shared/connectors/open-data/acquireOpenDataColumnTypeSample/**`: raw bytes and phase-aware failure codes
- `shared/connectors/open-data/failureToInvalidDatasetReason/**`
- `shared/connectors/open-data/parseCsvHeaderLine/**`: deleted
- `shared/models/data-catalog-listings/DataCatalogListing/*`: `isInvalid`, `invalidDatasetReason`, `InvalidDatasetReason`, and fixture updates in the open-data tests
- `supabase/functions/open-data/`: `gzipBytes/**`, `respondWithSampleFailure/**`, `columnTypeVerification/columnTypeVerification.ts`, `columnTypeSampleToken/**`, `readByteRangeOverHttp/**`, `statusFromOpenDataFailure/**`, `OpenDataRoutes.ts` and `OpenDataRoutes.types.ts` (the `unparseable` route)
- `src/lib/openData/verifyOpenDataColumnTypes/**`, `src/lib/openData/createColumnTypeVerificationCoordinator/**`, `src/lib/openData/ColumnTypeVerifications.ts`
- `src/views/DataManagerApp/DataImportView/DataCatalogView/`: `DataCatalogInvalidNotice/**`, `DataCatalogListingDetail/DataCatalogListingDetail.tsx`, `DataCatalogListingList/DataCatalogListingList.tsx`, `DataCatalogView.tsx`

**Schema:** yes. Regenerate the migration with `supabase-declarative-schema`; do not copy `20261023164104_mark_invalid_catalog_listings.sql`. Regenerate `shared/types/database.types.ts`, the desktop SQLite migration, and the Lingui catalogs.

**Notes:**
- The sample token vouches only for the listing and its expiry, not for column names: the browser's DuckDB names the columns, trusted as its types already are.
- An unreachable file host is marked right away. AVA-396 adds the scheduled recheck. A CKAN API outage and any Socrata failure leave the listing valid.

**Verification:**
```sh
supabase test db supabase/tests/database/rpc_data_catalog_listings__mark_invalid.test.sql supabase/tests/database/rpc_data_catalog_listings__upsert_with_relation_columns.test.sql supabase/tests/database/rpc_data_catalog_listings__write_verified_column_types.test.sql
pnpm exec vitest run shared/connectors/open-data shared/models/data-catalog-listings supabase/functions/open-data src/lib/openData src/views/DataManagerApp/DataImportView/DataCatalogView
pnpm exec tsc -b --noEmit && pnpm type-check:deno
```

---

## F6: Socrata connector and drive index pipeline

**Purpose:**
- Read Socrata datasets live (`SocrataClient`, freshness versions).
- Search Socrata's Discovery API (`SocrataDiscoveryClient`, with offset pagination).
- Dispatch `acquireOpenDataResource` by `api_service`.
- Add the `socrata` pipeline, which fills the drive index for configured portals. It's rate-limited to 1 request per second.

**Value:** NYC Open Data and other Socrata portals, including measles-relevant
CDC data, become discoverable and queryable.

**PR title:** `feat(open-data): add the Socrata connector and drive index pipeline`

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `b6c762bea` | feat(open-data): add socrata to the api_service enum | schema and model hunks. Regenerate the migration (its original file was later folded into `20261016200226` by `8a03ff77f`). |
| `d9f488ff1` | feat(open-data): add SocrataClient and its source version builder | all |
| `0f049804c` | fix(open-data): narrow SocrataClient's try/catch to the HTTP call only | all |
| `d18182615` | feat(open-data): add SocrataDiscoveryClient for live metacatalog search | all |
| `2b6e880ad` | docs(open-data): clarify SocrataDiscoveryClient's error-handling docstring | all |
| `b5f73b744` | feat(open-data): dispatch acquireOpenDataResource by api_service | the Socrata hunks |
| `825a40edd` | refactor(open-data): rename buildSocrataSourceVersion to follow make-From naming | **MIXED**: not `readOpenDataFreshnessToken.ts` (F8) |
| `15af8ff45` | docs(open-data): add missing type docstrings | **MIXED**: only `SocrataClient.test.ts` and `SocrataDiscoveryClient.types.ts` |
| `8a03ff77f` | chore(open-data): consolidate the socrata-enum and cache-column migrations | **MIXED**: history only. Regenerate the enum migration in F6 and the cache migration in F8. |
| `bd18f6843` | refactor(open-data): rename buildSocrataSourceVersion files to match their export | **MIXED**: not `readOpenDataFreshnessToken.ts` |
| `5f654e6bb` | refactor(open-data): group same-base-name pairs into their own directories | **MIXED**: only `makeSourceVersionFromSocrataViewMetadata/*` |
| `f9ebb56ee` | feat(open-data): make SocrataDiscoveryClient.search's query optional, add offset pagination | all |
| `bacd26d11`, `41f8ee9d2` | the drive registry and its tests | history only: final files under `pipelines/socrata/configuredDrives/` |
| `941909da8`, `d73296150` | `run()` entry point, fail-fast note | history only: the final file is `pipelines/socrata/run.ts` |
| `d6ef8d173` | fix(open-data): ship the drive registry empty | **MIXED**: history only for `configuredDrives`, superseded by the NYC drive in `b989283ed`. Its doc hunks go to F9. |
| `3ab3a4d90` | (F4's rename commit) | **MIXED**: only `makeListingRowFromSocrataResult/*` |
| `8e676399c` | refactor(open-data): split the metacatalog pipeline into hdx and socrata | **MIXED**: only `pipelines/socrata/**` |
| `55a5fb54b` | (F2's commit) | **MIXED**: only `SocrataClient/*`, `SocrataDiscoveryClient/*` and `pipelines/socrata/run.ts` |

**Final files to take:**
- `shared/connectors/open-data/SocrataClient/*`
- `SocrataDiscoveryClient/*`
- `makeSourceVersionFromSocrataViewMetadata/*`
- `openDataErrors.ts`: Socrata codes
- `statusFromOpenDataFailure.ts`: Socrata codes
- `acquireOpenDataResource.ts` and its test: Socrata hunks
- `apps/pipeline-server/pipelines/socrata/**`
- the `socrata` value in `00.enum.data_catalog_listings__api_service.sql`
- the `socrata` arm in `shared/models/data-catalog-listings/**`

**Also take:**
- `b989283ed` feat(socrata): add the NYC Open Data drive to the Socrata pipeline. All of it: `configuredDrives.ts` gains the NYC drive and an updated docstring.

- `b7cbe395a` feat(socrata): honor --limit and send SOCRATA_APP_TOKEN in the Socrata pipeline. All of it: `socrata/run.ts`, `createSocrataHttpClient/**`, `enumerateSocrataDrive/**`.
- From `7dbb2210a` (**MIXED**), only the formatting of `SocrataClient*`, `SocrataDiscoveryClient*` and `makeSourceVersionFromSocrataViewMetadata.ts`. Taking the final file state includes it.

**Verification:**
```sh
ava supabase status && pnpm db:reset && pnpm test:db && pnpm db:gen-types && pnpm desktop:sqlite:check-migrations
pnpm vitest run shared/connectors/open-data && pnpm test:pipeline-server && pnpm type-check
ava pipeline run socrata --local --limit 3   # smoke test against the switched local Supabase
```

**Addendum: follow-up commits mapped on 2026-11-10.** Port these with F6.

Correction: take `apps/pipeline-server/pipelines/socrata/**` and
`shared/connectors/open-data/SocrataDiscoveryClient/*` as of `f78be622b`
(the same as `b7cbe395a` for these files), not the final state. F43 adds
ordering and timestamps, F48 deletes `enumerateSocrataDrive/` and
`makeListingRowFromSocrataResult/` and rewrites `run.ts`, and F51, F53, F16,
and F23 extend the rest.

---

## F7: HDX (CKAN) connector refactor and drive index pipeline

**Purpose:**
- List every dataset in a CKAN drive (`CkanDiscoveryClient`).
- Share CKAN action-API helpers.
- Export the readable-resource rule (`isReadableCkanResource`).
- Add the generic `hdx` pipeline, rate-limited to 1 request per second, which replaces the hardcoded `hdx__sudan-cholera-2025` pipeline.

**Value:** HDX becomes a drive the catalog can enumerate instead of a single
hand-written pipeline. `HDX_DRIVE` ships `undefined`, because HDX's full
catalog of more than 42,000 datasets needs retry and backoff first.

**PR title:** `feat(open-data): add CKAN drive discovery and the HDX drive index pipeline`

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `02f62705b` | docs: add measles outbreak response use-case plan, delete HDX Sudan pipeline | **MIXED**: only the deletion of `apps/pipeline-server/pipelines/hdx__sudan-cholera-2025/*`. The use-case doc goes to F9. |
| `e1c29aabe` | feat(open-data): export isReadableCkanResource | all, superseded by its own directory in `3ab3a4d90` |
| `390ff7002` | refactor(open-data): clarify isReadableCkanResource's docstring | all |
| `9ff0eae4f` | feat(open-data): add CkanDiscoveryClient | all |
| `3dc9793f2` | style(open-data): fix import ordering in CkanDiscoveryClient | all |
| `82792a8ea`, `353532875`, `74bda82b5` | metacatalog row builders | history only: the final file is `pipelines/hdx/makeCkanListingRowsFromPackage/` |
| `3ab3a4d90` | (F4's rename commit) | **MIXED**: only `ckanActionApiHelpers.ts`, the helper hunks in `CkanClient.ts` and `CkanDiscoveryClient.ts`, `isReadableCkanResource/*`, `getCkanResourceFromPackage.ts` (and test) and `makeCkanListingRowsFromPackage/*` |
| `8e676399c` | (split commit) | **MIXED**: only `pipelines/hdx/**` |
| `55a5fb54b` | (F2's commit) | **MIXED**: only `CkanDiscoveryClient/*` and `pipelines/hdx/run.ts` |

**Final files to take:**
- `shared/connectors/open-data/CkanDiscoveryClient/*`
- `ckanActionApiHelpers.ts`
- `isReadableCkanResource/*`
- `getCkanResourceFromPackage.ts` (and test)
- `CkanClient.ts`: the helper hunks
- `apps/pipeline-server/pipelines/hdx/**`
- delete `apps/pipeline-server/pipelines/hdx__sudan-cholera-2025/`

**Also take:**
- `f78be622b` feat(hdx): honor --limit and send HDX_API_KEY in the HDX pipeline. All of it: `hdx/run.ts`, `createHdxHttpClient/**`.
- From `7dbb2210a` (**MIXED**), only the import-order fix in `shared/connectors/open-data/buildCkanSourceVersion.ts`. Taking the final file state includes it.

**Schema:** none.

**Verification:**
```sh
pnpm vitest run shared/connectors/open-data && pnpm test:pipeline-server && pnpm type-check
```

**Addendum: follow-up commits mapped on 2026-11-10.** Port these with F7.

| SHA | Subject | Take |
|---|---|---|
| `127b6c0d9` | refactor(hdx): drop HDX_API_KEY from the HDX pipeline | **MIXED:** `createHdxHttpClient/*` and `hdx/run.ts` here. The `.env.pipelines.example` and `apps/pipeline-server/README.md` hunks go with F10. |

Correction: HDX API tokens only grant write access and do not raise read
limits, so the final HDX pipeline sends no key. Take `f78be622b` for
`--limit` only: `hdx/run.ts` and `createHdxHttpClient/**` as of
`127b6c0d9`. The Purpose's "send `HDX_API_KEY`" no longer holds, and the
PR title should drop it. Take `apps/pipeline-server/pipelines/hdx/**`,
`shared/connectors/open-data/CkanDiscoveryClient/*`, and `CkanClient.ts` as
of `127b6c0d9` (code identical to `f78be622b` for the last two), not the
final state: F42, F43, F49, F51, F53, F54, F55, F16, and F23 extend them.

---

## F8: Open-data write-back cache

**Purpose:**
- Cache a live open-data read as an object in a private `open-data-catalog` storage bucket.
- Record what is cached in new `data_catalog_listings` columns (`cached_object_path`, `cached_source_version`, `cached_at`).
- Revalidate with a per-service freshness token.

**Value:** Repeat reads of the same listing skip the upstream API.

**PR title:** `feat(open-data): cache live open-data reads in a private storage bucket`

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `1e4a65af2` | feat(open-data): add write-back cache columns | all hunks, retargeted from `catalog_entries__open_data` to `data_catalog_listings` |
| `4fdb7bb95` | test(open-data): fix pipeline cache-rejection test | all |
| `5d02bd761` | feat(open-data): add the private open-data-catalog storage bucket | all. **`STORAGE-` migration: port by hand and re-timestamp.** |
| `96a22e318` | test(open-data): also check with_check in the open-data-catalog policy regression test | all |
| `43603d540` | feat(open-data): add AvandarSupabaseStorageClient | all |
| `1caf40543` | feat(open-data): add the cache-aside orchestration function | all |
| `56bf8be2a` | refactor(open-data): share the format-to-contentKind rule | all |
| `b52ac9ebb` | feat(open-data): wire the write-back cache into the open-data route | all |
| `9b7b48b68` | refactor(open-data): share the OpenDataApiAccessFor narrowing type | all |
| `2782b5a4e` | docs(open-data): correct the freshness-token reuse claim | **MIXED**: only `readOpenDataFreshnessToken.ts`. The doc hunks go to F9. |
| `0ad1d9b30`, `7d7f0a2f5`, `e827be1ce`, `70ffeb000` | cache refactors and route extraction | all |
| `825a40edd`, `bd18f6843` | (F6's renames) | **MIXED**: only `readOpenDataFreshnessToken.ts` |
| `15af8ff45` | (docstrings) | **MIXED**: only `AvandarSupabaseStorageClient.types.ts` |
| `5f654e6bb` | (directory grouping) | **MIXED**: only `acquireOpenDataResourceWithCache/*`, `readOpenDataFreshnessToken/*` and the `OpenDataRoutes.ts` import hunk |
| `8a03ff77f` | (migration consolidation) | **MIXED**: history only. Regenerate the cache-column migration. |
| `ed2fac644` | chore(desktop): generate the missing SQLite mirror for earlier migrations | **MIXED**: history only. Regenerate the mirrors. Its `20261015*` Postgres mirrors belong to the Postgres branch. |

**Final files to take:**
- `supabase/migrations/20261016203000_STORAGE-open-data-catalog-bucket.sql`: ported, new timestamp
- `supabase/tests/database/permissions/storage_open_data_catalog_bucket.test.sql`
- the cache columns and CHECK clauses in `supabase/schemas/10.data_catalog_listings.sql`, plus their tests
- `shared/connectors/open-data/AvandarSupabaseStorageClient/*`
- `acquireOpenDataResourceWithCache/*`
- `readOpenDataFreshnessToken/*`
- `formatToContentKind.ts`
- the cache hunks in `acquireOpenDataResource.ts`, `OpenDataRoutes.ts` and `shared/models/data-catalog-listings/**`

**Also take:** from `7dbb2210a` (**MIXED**), only the formatting of
`AvandarSupabaseStorageClient.ts` and its test. Taking the final file state
includes it.

**Verification:**
```sh
ava supabase status && pnpm db:reset && pnpm test:db && pnpm db:gen-types && pnpm desktop:sqlite:check-migrations
pnpm vitest run shared/connectors/open-data && pnpm type-check
```

---

## F9: Measles demo docs

**Purpose:** Land the branch's specs, plans and use case. **Value:** They
record why the merged features look the way they do.

Before this PR, decide whether these files stay in `docs/measles-demo/` or
move into `docs/`. The `docs/measles-demo/` location is a rule for this
branch only. `pr-feature-log.md` itself stays off `develop`.

**PR title:** `docs(open-data): add the measles use case and the open-data, drive and modules specs`

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `02f62705b` | (use case) | **MIXED**: only `docs/use-cases/measles-outbreak-response.md`, final path `docs/measles-demo/measles-outbreak-response.md` |
| `4394fa51d`, `0ccd9fde8`, `736286fb4`, `d7ac9fe00`, `9398548cd` | architecture spec | `docs/measles-demo/open-data-catalog-architecture.md` (final) |
| `fed658747`, `974635361`, `03cf621ed`, `d6ef8d173`, `2782b5a4e` | (mixed doc commits) | **MIXED**: only the `open-data-catalog-architecture.md`, `open-data-catalog-architecture-plan.md`, `open-data-prebuilt-metacatalog-plan.md` and use-case hunks |
| `42214ab6b`, `0aa16256e` | architecture implementation plan | `docs/measles-demo/open-data-catalog-architecture-plan.md` |
| `9ae975a73` | prebuilt metacatalog plan | `docs/measles-demo/open-data-prebuilt-metacatalog-plan.md` |
| `6053f4772`, `8297adad6` | modules and HttpClient design and plan | `docs/measles-demo/modules-factory-and-http-client-design.md`, `modules-factory-and-http-client-plan.md` |
| `045066166` | docs(open-data): handoff brief for the next data-catalog rename pass | nothing: `03cf621ed` deleted the file |
| `e1976a576`, `465b72ddb` | catalog search design | `docs/measles-demo/catalog-search-design.md` (final). `465b72ddb` is **MIXED**: only that file. |

**Also take:**
`a325df511` docs(open-data): document what every drive index pipeline must
write. All of it: section 6.7 of `open-data-catalog-architecture.md`, the
drive index invariant (AVA-381).

**Addendum: follow-up commits mapped on 2026-11-10.** Port these with F9.

| SHA | Subject | Take |
|---|---|---|
| `27501de72` | docs(pipelines): describe engine-owned loading and incremental runs | **MIXED:** only the `docs/measles-demo/open-data-catalog-architecture.md` and `connector-nomenclature.md` hunks. The README hunk goes with F50. |
| `11fe0ce62` | docs(measles-demo): describe CKAN search paging accurately | All of it. |
| `90c27cf9b` | (F49's commit) | **MIXED:** only the `connector-nomenclature.md` hunk. |
| `a2e4dd81f` | docs(measles-demo): describe the engine's upsert and plain unique index | All of it. |
| `6c9450fd6` | (F51's docs) | **MIXED:** only the `docs/measles-demo/` hunks. |

Files additions: `docs/measles-demo/connector-nomenclature.md` (final,
after F4 took it as of `f78be622b`).

Rows for its Commits table:

| SHA | Subject | Take |
|---|---|---|
| `eee3e5b14` | docs(measles-demo): add case management roadmap for contact tracing | All of it: `docs/measles-demo/case-management-roadmap.md` (new). Its statements are dated 2026-11-09, before assignment (F66) shipped: it still says nothing writes `assigned_to`, so refresh that row when porting. |
| `f177ec60b` | docs(cases): plan assigning a record to one member | MIXED: only the `docs/measles-demo/measles-outbreak-response.md` hunk (the assignment gap note). The rest is F66. |

Files addition: `docs/measles-demo/case-management-roadmap.md`.

Add to F9's Commits table:

| SHA | Subject | Take |
|---|---|---|
| `007216462` | docs(joined-cases): describe one value implementation and the record page's read path | MIXED: only `docs/measles-demo/open-data-catalog-architecture.md`. The pushdown row stops citing `ConceptWrapper`, which F71 deletes. F9 merges last and takes the file's final content, so nothing else is needed. |

Add to **Commits to read** (docs only):

| SHA | Subject | Take |
|---|---|---|
| `b6442f167` | docs(measles-demo): plan indexing every catalog asset behind a loadable flag | All of it (`open-data-catalog-architecture.md`, F16's plan). |
| `a77136b07` | docs(measles-demo): design YAML field mapping for catalog metadata | All of it: `catalog-field-mapping-design.md` (F23). |
| `8329e0576` | docs(measles-demo): name organization levels organization1_name so they round-trip | All of it (F23's design). |
| `48c1ffa7b` | docs(measles-demo): keep display_name in code and map NYS office levels by script | All of it (F23's design). |
| `2dae1f192` | docs(measles-demo): plan catalog field mapping implementation | All of it: `catalog-field-mapping-plan.md` (F23). |
| `82129b68d` | docs(measles-demo): fold catalog search, filters, and metadata display into the field mapping design | All of it: the F23 design and plan, and `catalog-search-design.md`. |
| `0f41fef3a` | feat(data-catalog): turn the filter rail's facets into searchable comboboxes | MIXED: only the `catalog-field-mapping-design.md` hunk. The rest is F23. |
| `e90102595` | docs(measles-demo): spec the five Workflow B map features | All of it: `workflow-b-map-features-design.md` (the design for F31 to F35). |
| `5a8b796ac` | docs(measles-demo): plan the five Workflow B map features | All of it: the five `workflow-b-f*-plan.md` files and the design's hunk. |
| `d36a1a470` | docs(measles-demo): spec shapefile import for catalog listings | All of it: `shapefile-import-design.md`. Nothing on the branch builds it yet. |
| `7a5aa29fa` | docs(measles-demo): rename branch references to demo/measles | MIXED: the `modules-factory-and-http-client-{design,plan}.md` and `open-data-catalog-architecture.md` hunks. The `docs/superpowers/` plans and specs are F45 to F53 and F55 and F56 docs. The `pr-feature-log.md` hunk is branch-only. |

---

## F13: Demo deployment for `demo/*` branches

**Purpose:** Every push to a `demo/*` branch creates or updates that demo's
Supabase branch on staging (migrations, edge function secrets, functions,
Auth URLs), then builds the app against it and deploys it to the Vercel
`demo` environment at `demo.avandarlabs.com`. **Value:** A new demo is a new
`demo/*` branch cut from `develop`, with no CI, Vercel or Supabase changes.

**PR title:** `feat(ci): deploy demo/* branches to demo.avandarlabs.com`

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `69cbdad98` | feat(ci): deploy demo/* branches to demo.avandarlabs.com | All of it except `scripts/demo/loadLocalDataIntoDemoBranch.sh`, which was later deleted |
| `a8ebe196c` | fix(ci): stop recording demo deploys as staging deployments | All of it |
| `815e2f8e5` | fix(ci): catch a bad Vercel team ID early and keep Sensitive placeholders out of the demo build | All of it |
| `b9780a05e` | fix(ci): give demo edge functions the real Supabase secret key | All of it |

**Files:** `.github/workflows/demo.yaml`,
`scripts/demo/ensureSupabaseBranch.sh`. Demo data is created by hand in the
hosted demo, not copied from a local database. Vercel settings stay in the
dashboard, not `vercel.json`, since the repo is public. The setup runbook
is kept out of the repo for the same reason.

**Verification:** `shellcheck -x scripts/demo/*.sh`. Then push a throwaway
`demo/*` branch and confirm the **CI/CD for Demos** run deploys it.

**Addendum: follow-up commits mapped on 2026-11-10.** Port these with F13.

Add to **Commits to read**:

| SHA | Subject | Take |
|---|---|---|
| `f1c068132` | chore(demo): remove the local-to-demo data loader | Nothing to port: it deletes `scripts/demo/loadLocalDataIntoDemoBranch.sh`, which F13 already leaves out, and updates this log (branch-only). |
| `2efc74421` | fix(ci): bump the demo deploy's Supabase CLI to 2.114.0 | All of it. CLI 2.98.2 applied the import map in random order when bundling, so `@avandar/utils/sql` sometimes resolved through `@avandar/utils` and the `connectors` function failed with "Module not found". 2.114.0 matches the `supabase` devDependency. |

---

## F14: Show only the plan picker when a workspace has no active plan

Status: merged into `develop` as [#314](https://github.com/AvandarLabs/avandar/pull/314) (`ded7b45cc`).

**Purpose:** A workspace with no subscription row, or an inactive one, gets
the blocking "Select your plan" modal from the root layout. The import view
also opened "Dataset limit reached" on top of it, since the optimistic
`canAddDatasets` fallback reports `false` for a missing subscription.
`SubscriptionModule.shouldPromptForDatasetLimitUpgrade` now opens the dataset
limit modal only for an active plan at its dataset cap. **Value:** A new
workspace sees one modal, not two, and is never told it hit a limit it has
not reached.

**PR title:** `fix(billing): show only the plan picker when a workspace has no active plan`

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `30c62fefb` | fix(billing): show only the plan picker when a workspace has no active plan | All of it |
| `b8cc02d97` | refactor(billing): take the dataset limit prompt options as Readonly | All of it |

**Files:**
`shared/models/Subscription/SubscriptionModule/SubscriptionModule.ts`,
`shared/models/Subscription/SubscriptionModule/SubscriptionModule.test.ts`,
`src/views/DataManagerApp/DataImportView/DataImportView.tsx`.

**Verification:**
`npx vitest run shared/models/Subscription/SubscriptionModule/SubscriptionModule.test.ts`.

---

## F15: `ava --env <name>` loads any `.env.<name>`

**Purpose:** Replace the `--staging` and `--prod` global flags with one
`--env <name>` option that loads `.env.<name>` from the repo root. With no
`--env`, the CLI loads `.env.development`. `--staging` and `--prod` are
refused with the `--env` that replaces them, and `.gitignore` covers every
`.env.*` file except the examples. **Value:** Pointing `ava` at a new
deployment, such as a demo's Supabase branch, only takes a new env file:
`ava pipeline run socrata --local --env demo`.

**PR title:** `feat(ava-cli)!: replace --staging and --prod with a global --env <name>`

**PR:** [#319](https://github.com/AvandarLabs/avandar/pull/319), branch
`feat/ava-env-flag`, built from `develop` as `77f0ee7a5`. It carries every
hunk below in files `develop` has, and none of the hunks in files it lacks.
Its README example runs `world-bank__wdi --env staging` instead of `socrata`.

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `78c8296ef` | feat(ava-cli)!: replace --staging and --prod with a global --env <name> | All of it, except the hunks in files `develop` lacks (below) |

**Files:**
- On `develop`: `.gitignore`, `docs/google-sheets-e2e.md`,
  `apps/ava-cli/README.md`, `apps/ava-cli/src/main.ts`,
  `apps/ava-cli/src/AvaEnv/AvaEnv.ts` and `AvaEnv.test.ts`,
  `GoogleTokenGetCli.ts`, `SupabaseRunCli.ts`, and
  `SupabaseRunCli/supabase-script-runner/main.ts`.
- Not on `develop` yet: `SupabaseSqlCli.ts`, `ResetPipelineCli.ts`,
  `PruneRetiredScopesCli.ts` (each with its test), and
  `announcePostgrestTarget.ts`. `SupabaseSqlCli.ts` is F41's.
  `ResetPipelineCli.ts` is F46's (the `_announceTarget` hunk and help text)
  until F52 moves `_announceTarget` into `announcePostgrestTarget.ts`.
  `PruneRetiredScopesCli.ts` and `announcePostgrestTarget.ts` are F52's.
  Whichever of F15 and those lands second carries these hunks:
  `AvaEnv.getLoadedEnvTarget()` becomes `AvaEnv.getLoadedEnvName()`, and a
  `!== "local"` check becomes `!AvaEnv.isLocal()`.
- The README's pipeline example names `socrata`, which F6 adds. Use
  `world-bank__wdi` instead if F6 has not merged.

**Schema:** none.

**Verification:**
```sh
pnpm test:ava-cli && pnpm exec tsc --noEmit -p tsconfig.node.json
pnpm --filter @avandar/ava-cli build
node apps/ava-cli/dist/main.cjs supabase sql "select 1" --staging   # refused, names --env staging
```

---

## F16: Index every catalog asset behind `is_workspace_loadable`

**Purpose:** Pipelines list every asset a drive has instead of skipping the
ones Avandar cannot load. `data_catalog_listings` gains
`is_workspace_loadable`, `source_asset_type`, and `source_download_url`. An
unloadable listing shows up in catalog search labelled "Not supported yet",
links to the original through `source_url`, cannot be added (UI and a
database trigger), and is never sampled. The flag comes from the pipeline's
own verdict per asset plus a shared YAML file of unloadable formats,
`apps/pipeline-server/pipelines/etl.config.yaml`, with per-pipeline
overrides, read by `@avandar/etl`. Socrata now crawls `data.ny.gov` and
`health.data.ny.gov` too, and HDX gains a `format:other` scope. **Value:**
Maps, PDFs, spreadsheets, and links stop silently disappearing from search,
and supporting a format later is a data migration, not a re-crawl.

**PR title:** `feat(catalog): index every catalog asset and flag which ones a workspace can load`

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `bc393997a` | feat(catalog): store whether a workspace can load each catalog listing | All of it. Regenerate the migration, types, and desktop migration. |
| `bdba34bb7` | feat(etl): decide each listing's workspace loadability from a shared YAML config | All of it. The lockfile hunk only adds `yaml` and `zod` to `packages/node/etl`: re-add them with `pnpm add`, then restore `pnpm-workspace.yaml`, which `pnpm add` rewrites. |
| `184db8124` | feat(socrata): index every portal asset and add the NY State portals | All of it |
| `706b0c2dc` | feat(hdx): list unreadable and non-CSV resources as unloadable | All of it |
| `ba841747c` | feat(catalog): show unsupported catalog listings with a link to the original | All of it. Regenerate the `.po` catalogs. |
| `71279818a` | docs(catalog): document indexing every asset behind is_workspace_loadable | The two READMEs. The `open-data-catalog-architecture.md` hunk goes with F9. |

**Files:** `supabase/schemas/10.data_catalog_listings.sql`,
`20.datasets__open_data.sql`,
`50.rpc_data_catalog_listings__upsert_with_relation_columns.sql`, the pgTAP
test `data_catalog_listings_workspace_loadable.test.sql`,
`packages/node/etl/src/EtlConfig/**` and the row contract files it touches,
`apps/pipeline-server/pipelines/etl.config.yaml`,
`pipelines/shared/getPipelineWorkspaceLoadability/`, the Socrata and HDX
pipeline files, `shared/connectors/open-data/SocrataDiscoveryClient/`, the
`DataCatalogListing` model and parsers, `verifyOpenDataColumnTypes.ts`, and
the `DataCatalogView` list, detail, view, and new
`DataCatalogUnsupportedNotice`.

**Schema:** `20261106212011_index_unsupported_catalog_listings.sql` (adds
three columns, relaxes `data_catalog_listings__api_access_complete` so an
unloadable API listing needs no format, and replaces the upsert RPC and the
add trigger).

**Verification:**
```sh
pnpm --filter @avandar/etl test && pnpm --filter @avandar/etl test:supabase
pnpm --filter @avandar/pipeline-server test
pnpm vitest run src/lib/openData src/views/DataManagerApp/DataImportView shared/connectors/open-data shared/models/data-catalog-listings
pnpm test:db
ava pipeline run socrata --local --limit 400   # maps, files, and links land with is_workspace_loadable false
```

**Addendum: follow-up commits mapped on 2026-11-10.** Port these with F16.

Add to **Commits to read**:

| SHA | Subject | Take |
|---|---|---|
| `34a34d84b` | chore(catalog): apply the pre-push formatter to the loadability changes | Formatting: take the final files. |
| `f5f1a5975` | chore(i18n): translate the unsupported catalog listing copy | Regenerate the `.po` catalogs. |

---

## F17: Search the catalog in Postgres and load listings as the user scrolls

**Purpose:** The catalog view stops loading every listing (5,000+) and
fuzzy-searching them in the browser with Fuse. Postgres matches whole words
through a weighted `search_vector` column (name, then publisher, then
description), and partial or misspelled words in a listing's name through
`pg_trgm` at a 0.5 word-similarity threshold. One RPC,
`rpc_data_catalog_listings__search`, returns ranked pages of slim rows with
a total count. The view loads 50 at a time with `useInfiniteQuery` as the
user scrolls, renders only the rows in view with `@tanstack/react-virtual`,
and reads the selected listing in full by id. **Value:** Browser memory goes
to DuckDB instead of three copies of the catalog (rows, Fuse index, DOM).
Design: `docs/measles-demo/catalog-search-design.md` (goes with F9).

**PR title:** `feat(catalog): search the catalog in Postgres and load listings as the user scrolls`

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `e1976a576` | docs(measles-demo): design backend catalog search with infinite scroll | Nothing: goes with F9. |
| `465b72ddb` | feat(catalog): search catalog listings in Postgres with full-text and trigram matching | All of it. Regenerate the migration and types. The design doc hunk goes with F9. |
| `e36e0ae9b` | feat(catalog): search the catalog on the server and load listings as the user scrolls | All of it. Regenerate the `.po` catalogs. |
| `7e24c81fb` | fix(desktop): skip tsvector columns and GIN indexes when mirroring migrations to SQLite | All of it. Regenerate the desktop migration. Without this, the generator mirrors the Postgres-only column into SQLite. |

**Files:** `supabase/schemas/00.extension.pg_trgm.sql`,
`10.data_catalog_listings.sql`, `50.rpc_data_catalog_listings__search.sql`,
the pgTAP test `rpc_data_catalog_listings__search.test.sql`, the
`DataCatalogListing` model, types, and parsers,
`src/clients/data-catalog-listings/DataCatalogListingClient.ts` and
`createDataCatalogSearchPage/`, `src/lib/openData/ColumnTypeVerifications.ts`
(invalidates every listing query, not just `getAll`), the `DataCatalogView`
view, list, CSS modules, and new `useDataCatalogSearch/`, and
`apps/desktop/scripts/gen-sqlite-migrations/parse.ts` with its test.

**Schema:** `20261106223031_add_catalog_listing_search.sql` (installs
`pg_trgm` in `extensions`, adds the generated `search_vector` column and two
GIN indexes, and adds the RPC with `execute` for `authenticated` only).

**Verification:**
```sh
pnpm vitest run src/clients/data-catalog-listings src/views/DataManagerApp/DataImportView/DataCatalogView src/lib/openData shared/models/data-catalog-listings
pnpm --filter @avandar/desktop test
supabase test db supabase/tests/database/rpc_data_catalog_listings__search.test.sql
pnpm test:db
```

---

## F18: Case comments and the case activity feed

**Purpose:** Members comment on a case record in a TipTap 3 editor with
markdown shortcuts and paste, `@` mentions of workspace members, and six
LinkedIn-style reactions; authors edit and delete their own comments. Each
case has an activity feed built on an append-only `activity_events` log that
only database triggers write, with every earlier comment body kept in
`comment_revisions`. The record page moves onto `AppView`: the feed and a
docked composer in the content column, the case's fields in the rail.
**Value:** Teams work a case in one place, every change is auditable, and
status changes, field edits, and third-party history become new event kinds
instead of a rewrite.

**PR title:** `feat(comments): add case comments and the case activity feed`

**Built on:** `feat/comments`, merged into this branch at `e331cbdcc`. Its
own commits are `2bf68f2d8..3b1f51e55` (the merge's first parent), plus
`72484297d` here, which repoints the video producer's cases adapter at the
new record page components. That commit only matters if F17 lands after the
video producer app; otherwise drop it.

**Commits to read:** all of these, oldest first. They contain no other
feature's work.

| SHA | Subject |
|---|---|
| `bdb358aa5` | docs(comments): add the case comments and activity feed design |
| `0b9dc72ac` | docs(comments): add the Phase 1 implementation plan |
| `29b92190b` | chore(comments): add TipTap mention, markdown, and static renderer packages |
| `8febd4749` | feat(comments): add comments, reactions, mentions, and the activity event log |
| `3bb232d67` | test(comments): cover mention quotes, moves, size limits, and reaction ownership |
| `f0a927dd4` | fix(comments): close audit gaps and harden case activity schema |
| `27732d21e` | feat(comments): add the RichTextDocument model |
| `28a3b1537` | feat(comments): add Comment, CommentReaction, and ActivityEvent models |
| `572b0e076` | feat(comments): add comment, reaction, and activity clients |
| `b62108262` | fix(clients): stop filter iteration from depending on shared columns |
| `a1d7b5226` | docs(comments): record the keyset feed cursor and stricter parsing in the plan |
| `3453b9e43` | fix(comments): page the case feed on a full keyset and harden rich text parsing |
| `a4cca25a8` | feat(comments): add the userMention node and its chip |
| `d7fe28ee0` | feat(comments): add the @ mention typeahead |
| `5c66c6616` | feat(comments): add the shared rich text extension list and markdown paste |
| `afdf6928e` | feat(comments): render stored rich text without an editor |
| `cbe8aa972` | feat(comments): add the rich text composer |
| `fd7b95dcc` | fix(comments): harden the rich text composer, links, and typeahead a11y |
| `d83c45c69` | feat(comments): add LinkedIn-style comment reactions |
| `e41dd5f9a` | feat(comments): add the comment card with edit and delete |
| `1672a9003` | fix(comments): restore bare-domain autolinks and fix typeahead ARIA |
| `4634a4cfb` | fix(comments): validate links pasted over a selection or from HTML |
| `f186419ad` | feat(comments): add the case activity feed and docked composer |
| `adfeef536` | chore(comments): exclude case activity tables from desktop sync |
| `433ad3bf2` | docs(comments): document the case activity architecture and update the roadmap |
| `cefe28df1` | fix(comments): keep the feed on fetch errors and stop endless linked-comment seeking |
| `49a10f5b3` | fix(comments): make reactions optimistic and keyboard accessible |
| `bad6eed59` | fix(comments): keep focus on comment cards and fade the link highlight |
| `6338644a6` | fix(comments): debounce case drafts and keep the offline notice announced |
| `6bf6bcd30` | fix(comments): keep scroll in the case feed and split its components |
| `56e27bfb4` | feat(comments): move the record page onto AppView with the activity feed |
| `61060fe1b` | chore(comments): extract case activity messages |
| `03b48ed92` | docs(comments): document the comment link param and drop stale ActivityBlock references |
| `13637421a` | fix(comments): make reaction toggles and feed recovery robust |
| `363b050c0` | test(comments): cover posting, reacting, editing, and deleting a case update |
| `b1ab68a92` | fix(comments): polish the record page loading and rail |
| `075842ef4` | docs(comments): tidy the comment link and measles snapshot notes |
| `5593c7d71` | chore(comments): extract case activity messages |
| `66e4ef03e` | fix(comments): use a pale wash for the highlighted mention option |
| `7dbf30fde` | fix(comments): tolerate malformed comment bodies |
| `85630644f` | fix(comments): always load a fresh case feed |
| `0ed68d1c8` | fix(comments): keep authors pending while members load |
| `cd8ee49aa` | chore(clients): add a changeset for the CRUD client filter typing fix |
| `f84397fc1` | chore(deps): use caret ranges for the new TipTap packages |
| `06a782e78` | fix(comments): keep case drafts per member |
| `77e7fc591` | fix(comments): name a member by email when they have no name |
| `c048ed081` | docs(comments): match the highlight, cursor, and draft key notes to the code |
| `f8e28eda0` | fix(comments): let detail pane messages scroll when the pane is short |
| `bf85931e0` | chore(comments): format the review fixes and fix their lint |
| `3b1f51e55` | chore(i18n): extract the comment loading and member messages |
| `72484297d` | fix(video): render the cases record detail with the new record page components |
| `14cd6eed9` | test(comments): give the case activity tests' case types a default status |

`14cd6eed9` only matters where case types require a default status, which
the case statuses work adds. If F18 lands first, drop it and apply it with
case statuses instead.

**Files:** `supabase/schemas/00.enum.{activity_events__kind,activity_events__source,comment_reactions__kind,comment_revisions__reason}.sql`,
`21.comments.sql`, `22.{comment_revisions,comment_reactions,comment_mentions,activity_events}.sql`,
`23.comments__audit_triggers.sql`, `50.rpc_activity_events__get_case_page.sql`,
pgTAP tests under `supabase/tests/database/case_activity/` and
`permissions/rls_case_activity.test.sql` (plus the `exact_data_api_grants`
edits), `shared/models/{RichTextDocument,comments,activity}/**`,
`src/clients/{comments,activity}/**`, `src/components/RichText/**`,
`src/views/IndividualManagerApp/**` (record page, feed, details rail,
outlet layout, `DetailPaneMessage`), the `$individualId` route search param,
`apps/desktop/sync/syncable-tables.ts`, `tests/e2e/case-activity.spec.ts`
and `tests/e2e/helpers/seedCaseRecord.ts`, the four new `@tiptap/*`
dependencies, and `packages/shared/clients/src/SupabaseCrudClient/createSupabaseCrudClient.ts`
with its `@avandar/clients` patch changeset.

**Docs:** `docs/measles-demo/case-activity-architecture.md`,
`docs/measles-demo/case-comments-design.md`, and
`docs/measles-demo/case-comments-plan.md` are new on this branch, so port
them to `docs/` (and the spec and plan to `docs/superpowers/`) in the PR,
fixing the links in `AGENTS.md`, `docs/ontology-architecture.md`,
`docs/production-plan-world-humanitarian-day.md`, and the two schema
comments that point at the architecture doc. The one-line note in
`docs/measles-demo/measles-outbreak-response.md` is branch-only: don't port it.

**Schema:** one migration, `20261106223652_case_comments.sql`. Regenerate it
on the PR branch after `ava supabase switch`, rather than copying it, so it
sorts after whatever `develop` has then.

**Verification:**
```sh
pnpm test:db
pnpm vitest run shared/models/RichTextDocument shared/models/comments shared/models/activity src/components/RichText src/views/IndividualManagerApp
pnpm test:desktop
pnpm i18n:check
pnpm test:e2e case-activity.spec.ts
```

**Addendum: follow-up commits mapped on 2026-11-10.** Port these with F18.

Correction to its Merge order row ("nothing depends on it"): F60, F66, F68, and
F71 to F75 all extend F18's record page, so F18 lands before F60. F58 should
land before F18 if possible.

Correction to its Files: the tip's record page files are reconciled with case
statuses in the merge `29c0212f4` (read its message). When taking them from the
tip, leave out:
- `SingleIndividualView/index.tsx`: the statuses fetch, `RecordStatusControl`
  as `titleAccessory`, and `RecordFactsGroup` (F60); the `Group` and
  `RecordAssigneeControl` (F66); `useRecordFields` (F71 to F75); the
  details band (F68). F18's own version is at `3b1f51e55`.
- `CaseDetailsRail.tsx`: the `children` prop (F60) and the field value,
  source list, and load error changes (F71 to F75).
- `tests/e2e/helpers/seedCaseRecord.ts`: if F58 is not on `develop` yet, take it
  as of `3b1f51e55` (direct inserts) and drop `14cd6eed9`, as its section
  already says. If F58 is on `develop`, take the tip file, which creates the case
  type through `rpc_concepts__create` with a default status.

Add to **Commits to read**:

| SHA | Subject | Take |
|---|---|---|
| `35e1acd07` | docs(measles-demo): move the case comments docs here and log them as feature F17 | MIXED: the moves of `case-comments-design.md` and `case-comments-plan.md` into `docs/measles-demo/`, the `case-activity-architecture.md` link, and the link fixes in `AGENTS.md`, `docs/ontology-architecture.md`, `docs/production-plan-world-humanitarian-day.md`, `00.enum.activity_events__kind.sql`, and `22.activity_events.sql` are what F18's **Docs** paragraph already asks for (port them to `docs/`, fixing those links). The `measles-outbreak-response.md` line and `pr-feature-log.md` are branch-only. |

---

## F19: Open data catalog browser

**Purpose:** The Open data tab was a fixed 22 to 30rem bordered box holding
one unfiltered list of every listing. It becomes a three-pane browser that
fills the height and width of its host: a filter rail (search, source,
format, last updated, hide unloadable), a virtualized results list with a
live count, removable filter chips, and sort, and a detail pane whose "Add to
workspace" is pinned at its foot. Facet counts are computed against every
other active filter. Container queries fold the rail into a drawer, and then
stack results and detail, so the same component fits the Import page and the
Data Explorer's Open dataset modal, which grows to nearly full screen while
the catalog shows. **Value:** A catalog of thousands is searchable and
narrowable instead of a scroll, and its size and every filter's effect are
visible at a glance.

It runs on F17's server search. Postgres filters, sorts, and counts the
facets: `data_catalog_listings__search_matches` says whether each match
passes each filter, `rpc_data_catalog_listings__search` keeps the rows that
pass all of them, and `rpc_data_catalog_listings__search_facets` counts each
facet against every other filter. The list loads 50 at a time as it scrolls.

**PR title:** `feat(data-catalog): full-height catalog browser with filters and sort`

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `da3f88cf5` | feat(data-catalog): full-height catalog browser with filters and sort | All of it. Regenerate the `.po` catalogs. |
| `7c3b22068` | fix(data-catalog): paint the catalog to the view's edges instead of framing it | All of it |
| `61499d842` | fix(data-catalog): show one pane at a time on phones | MIXED: only the three `DataCatalogView` stylesheets. The rest is F20. |
| `76c3de1ab` | Merge branch 'demo/measles' of https://github.com/AvandarLabs/avandar into demo/measles | The F16 hunks it carried into `DataCatalogListingList.tsx` and `DataCatalogListingDetail.tsx`, which go with F16 or F19, whichever lands second. |
| `c2055f851` | chore(data-catalog): translate the catalog browser copy and apply the pre-push formatter | MIXED: everything except the `DataManagerApp.tsx` reformat, which is F20. Regenerate the `.po` catalogs, then keep its hand-corrected `sw`, `zh-Hans`, `es`, `fr`, and `pt` strings. |
| `c0f7b1954` | feat(catalog): filter, sort, and facet catalog search in Postgres | All of it. Regenerate the migration and types after F17's. |
| `3440d68b6` | feat(data-catalog): run the catalog browser on server search | All of it. Regenerate the `.po` catalogs. |
| `051a30ebf` | fix(catalog): hide datasets no workspace can add when loadable only is on | All of it, folded into this PR's search schema rather than a migration of its own. Needs F16's `is_workspace_loadable`. |

**Files:** everything under
`src/views/DataManagerApp/DataImportView/DataCatalogView/` except
`DataCatalogInvalidNotice/`, `DataCatalogUnsupportedNotice/`,
`useVerifyColumnTypesOnDwell/`, `readCatalogColumnsForAdding/`, and
`buildOpenDataDatasetColumnInputs.ts`; `DataImportTabs/`,
`DataImportView.tsx`; `AppViewBody.tsx` and its stylesheet (the
`isFillHeight` prop and the `--ava-content-gutter` property);
`OpenDatasetDrawer/OpenDatasetModal.tsx`, its stylesheet, and
`ImportDatasetView.tsx`. From the server search: `supabase/schemas/`
`50.data_catalog_listings__is_updated_within.sql`,
`51.data_catalog_listings__search_matches.sql`, and the two `52.rpc_*`
search files (F17's `50.rpc_data_catalog_listings__search.sql` moves to
`52.`), the pgTAP test `rpc_data_catalog_listings__search_filters.test.sql`
and the signature in `rpc_data_catalog_listings__search.test.sql`,
`src/clients/data-catalog-listings/` (`buildDataCatalogSearchFilterArgs/`,
`createDataCatalogSearchFacets/`, and the client's `search` and
`searchFacets`), and `useDataCatalogSearch/useDataCatalogFacets.ts`.

**Schema:** `20261106235455_add_catalog_listing_search_filters.sql` (replaces
F17's three-argument search with the filtered one, and adds the facet RPC
and its two helpers, `execute` for `authenticated` only). Regenerate it after
F17's migration, rather than copying it.
`20261107193803_catalog_loadable_filter_checks_workspace_loadable.sql` is a
fix on top of it: loadable only, and the `unloadable` count, also leave out
listings with `is_workspace_loadable` false. A PR built from the final schema
files already has it.

**Verification:**
```sh
pnpm vitest run src/views/DataManagerApp src/views/DataExplorerApp src/components/layouts src/clients/data-catalog-listings
supabase test db supabase/tests/database/rpc_data_catalog_listings__search.test.sql supabase/tests/database/rpc_data_catalog_listings__search_filters.test.sql supabase/tests/database/rpc_data_catalog_listings__search_loadable.test.sql
pnpm test:db
pnpm test:e2e csv-import.spec.ts
pnpm test:e2e data-explorer-query-drawer.spec.ts
pnpm test:e2e nux-first-milestone.spec.ts
```
Then open the Open data tab with a catalog of a few thousand listings at
1440px, 1100px, and 390px wide, and in the Data Explorer's Open dataset
modal.

**Addendum: follow-up commits mapped on 2026-11-10.** Port these with F19.

Add to **Commits to read**:

| SHA | Subject | Take |
|---|---|---|
| `88c2d2080` | fix(db): load pg_trgm before the catalog search migration sets its threshold | All of it, applied to the regenerated `*_add_catalog_listing_search_filters.sql`: add its hand-written `do $$ begin perform extensions.word_similarity('', ''); end $$;` block before the first function, then regenerate the desktop mirror. `data_catalog_listings__search_matches` sets `pg_trgm.word_similarity_threshold`, and in a session that has not loaded `pg_trgm` only a superuser may attach that placeholder to a function, so the hosted deploy failed with "permission denied to set parameter". |
| `4c7c9d760` | fix(data-import): tighten the space around the import tabs | All of it. The tab strip takes 12px above and below, sized from the host's `--ava-content-gutter`, and the Open dataset modal declares that gutter for every import tab, so its tabs stop shifting 4px when the catalog opens. Needs F120 (no header band). Its Connectors tab `Stack` exists only with the Postgres branch: without it, drop `pt="lg"` from `GoogleSheetsImportView` instead. |

**Depends on:** add F120.

**Files:** add the `list: css.dataImportTabsList` class and the
`.dataImportTabs .dataImportTabsList` rule in
`DataImportTabs/DataImportTabs.{tsx,module.css}`, and the `.importPanel`
gutter in `OpenDatasetDrawer/OpenDatasetModal.module.css`.

---

## F20: Phone widths show one Data Sources pane at a time

**Purpose:** Below 48em, Data Sources showed its dataset list beside the open
page, leaving the page about 150px wide. The list now shows alone on the app's
home while there are datasets, and any page under it (a dataset, the import
flow) takes the full width. Separately, the slate was sized to a full viewport
while `AppShell.Main` sits 30px down under the mobile header, so every phone
view ran off the bottom edge. Main now publishes that offset as
`--ava-shell-main-offset-top`, and the slate and Main's minimum height
subtract it. **Value:** Phone layouts are readable, and the bottom of every
app is on screen.

**PR title:** `fix(layout): stack Data Sources panes on phones and keep the slate on screen`

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `61499d842` | fix(data-catalog): show one pane at a time on phones | MIXED: `AppShell.tsx`, `AppSlate.tsx`, `DataManagerApp.tsx`, `DataManagerApp.module.css`, and `DatasetNavbar.tsx`. The `DataCatalogView` stylesheets are F19. |
| `c2055f851` | chore(data-catalog): translate the catalog browser copy and apply the pre-push formatter | MIXED: only the `DataManagerApp.tsx` reformat. |

**Files:** `src/components/AppShell/AppShell.tsx`,
`src/components/layouts/AppSlate/AppSlate.tsx`,
`src/views/DataManagerApp/DataManagerApp.tsx`,
`DataManagerApp.module.css`, `DatasetNavbar/DatasetNavbar.tsx`.

**Verification:**
```sh
pnpm vitest run src/components src/views/DataManagerApp
pnpm test:e2e nux-first-milestone.spec.ts
pnpm test:e2e gis-map-layers.spec.ts   # its narrow-screen case runs the mobile shell
```
Then open Data Sources at 390px wide: the home shows only the list, a dataset
or Import data shows only the page, and the slate's bottom gutter is visible.

---

## F21: Gadget references in case comments

**Purpose:** A case comment links or embeds a dashboard, a single dashboard
tile, a dataset, a map, a case type, or another case. Typing `@` searches
teammates and these gadgets together. Enter inserts an inline link chip and
Shift+Enter an embed card with key facts, and the editor switches either one
to the other. Opening a tile lands on the dashboard preview scrolled to the
tile and highlighted. The stored document never holds a gadget's or a
member's name, and a reader who cannot open a gadget sees "Unavailable".
**Value:** Case discussion points straight at the evidence (the chart, the
dataset, the related case) instead of describing it, without leaking
restricted resources to teammates who cannot see them.

**PR title:** `feat(comments): link and embed dashboards, datasets, maps, and cases in case comments`

**Built on:** `feat/comment-embeds`, branched from `demo/measles` after F18.
See [gadgets.md](gadgets.md) for the as-built reference and
[gadget-references-design.md](gadget-references-design.md) for the design.

**Commits to read:** all of these, oldest first. They contain no other
feature's work. The last two, which write this entry and add the end-to-end
spec, follow `375cbf2e0`:
`docs(measles-demo): document gadgets and log gadget references` and
`test(comments): cover linking and embedding gadgets in a case comment`.

| SHA | Subject |
|---|---|
| `50a83a3df` | docs(measles-demo): design gadget references in case comments |
| `7c6e2c9cb` | docs(measles-demo): plan gadget references in case comments |
| `ec1a3dfed` | feat(comments): add gadget search and mirror comment gadget references |
| `862453ca2` | fix(comments): harden gadget search and cover its edge cases |
| `a3865dbfa` | feat(comments): add the Gadget model |
| `393375afe` | feat(comments): store gadget links and embeds in rich text documents |
| `c299ebaf8` | feat(comments): add the gadget search client |
| `c8dbed637` | feat(comments): find dashboard tiles in a dashboard config |
| `af925c7e6` | refactor(datasets): share dataset source labels |
| `cc29f02fb` | fix(comments): make gadget nodes strict and check gadget types against the database |
| `b7aaf7f39` | feat(comments): resolve gadget references into summaries |
| `05244612e` | feat(comments): render gadget chips and cards |
| `82f2a3d77` | fix(comments): translate gadget states as whole phrases and trim chip queries |
| `02fa1f61d` | feat(comments): add gadget link and embed nodes |
| `7cad621e1` | fix(comments): keep gadget chips in the editor from navigating and tidy the embed switch |
| `4cbc6753f` | fix(comments): avoid the internal word gadget in unavailable copy |
| `07a7ffd6f` | feat(comments): search gadgets from the @ menu |
| `ed3a4041c` | fix(comments): keep the @ menu highlight and results steady while searching |
| `170aef3b2` | feat(dashboards): scroll to and highlight a linked tile in the dashboard preview |
| `a1f8e67bc` | fix(comments): make stored mentions strict so they can never carry a name |
| `375cbf2e0` | chore(comments): extract gadget messages |

**Files:** `supabase/schemas/00.enum.gadget_type.sql`,
`22.comment_gadget_refs.sql`, `50.rpc_gadgets__search.sql`, the
`comments__sync_gadget_refs` trigger in `23.comments__audit_triggers.sql`,
the `idx_individuals__workspace_id` index in `20.individuals.sql`, pgTAP
tests under `supabase/tests/database/gadgets/` (plus the
`exact_data_api_grants` edit), `shared/models/gadgets/Gadget/**`, the gadget
and strict-mention hunks of `shared/models/RichTextDocument/**`,
`src/clients/gadgets/searchGadgets/**`,
`src/clients/dashboards/findDashboardTile/**`,
`src/components/RichText/Gadget/**`, `src/components/RichText/MentionMenu/**`
(which replaces `UserMention/UserMentionList*` and
`UserMention/createUserMentionSuggestion.ts`), the gadget hunks of
`createRichTextExtensions.ts`, `RichTextComposer`, `RichTextView`, and
`UserMention/filterMentionCandidates.ts`,
`src/components/RichText/__tests__/gadgetDisplaySwitch.integration.test.tsx`,
`src/hooks/datasets/useDatasetSourceLabels.ts` with the
`DatasetMetaView.tsx` refactor that uses it, the `?tile=` handling in
`src/routes/_auth/$workspaceSlug/dashboards/preview/$dashboardId.tsx`,
`DashboardViewerView/{DashboardViewerView,DashboardViewerContent}.tsx` and
`useHighlightTile.{ts,module.css,test.tsx}`, the `data-tile-id` in
`DataVizPBlock/DataVizPBlock/{DataVizContent,DataVizPBlock}.tsx`, small
hunks in the case feed (`CaseActivityComposer.tsx`,
`CaseActivityFeedEmptyState.tsx`, `CommentCardBody.tsx`,
`CaseActivityFeed.test.tsx`), `comment_gadget_refs` in
`apps/desktop/sync/syncable-tables.ts`, and
`tests/e2e/case-gadgets.spec.ts` with
`tests/e2e/helpers/seedDashboardWithTile.ts`.

**Docs:** `docs/measles-demo/gadgets.md`,
`docs/measles-demo/gadget-references-design.md`, and
`docs/measles-demo/gadget-references-plan.md` are new on this branch. Port
them with F18's docs, and port the "Gadget references" section of
`case-activity-architecture.md`, the gadgets line in `AGENTS.md`, and the
gadget references bullet under P5c.2 in
`docs/production-plan-world-humanitarian-day.md`.

**Schema:** one migration, `20261107004932_gadget_references.sql` (and its
desktop mirror `apps/desktop/migrations/20261107004932_gadget_references.gen.sql`).
Regenerate both on the PR branch after `ava supabase switch`, rather than
copying them, so they sort after whatever `develop` has then.

**Verification:**
```sh
pnpm test:db
pnpm vitest run shared/models/gadgets shared/models/RichTextDocument src/clients/gadgets src/clients/dashboards/findDashboardTile src/components/RichText src/views/DashboardApp/DashboardViewerView src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock src/views/IndividualManagerApp
pnpm test:desktop
pnpm i18n:check
pnpm test:e2e case-gadgets.spec.ts
pnpm test:e2e case-activity.spec.ts
```

**Addendum: follow-up commits mapped on 2026-11-10.** Port these with F21.

Rows for its Commits table:

| SHA | Subject | Take |
|---|---|---|
| `102defcc6` | test(gadgets): give the gadget tests' case types a default status | All of it, if F58 is on `develop` when F21 is built. Otherwise drop it here and apply it with F58, like F18's `14cd6eed9`. |

Files addition: none beyond `supabase/tests/database/gadgets/{comment_gadget_refs,gadgets_search}.test.sql`,
which F21 already owns.

Add to F21's "Commits to read" table:

| SHA | Subject |
|---|---|
| `ee2206125` | fix(gadgets): find dashboard tiles by their stored prompt |

Take: only `supabase/schemas/50.rpc_gadgets__search.sql` and
`supabase/tests/database/gadgets/gadgets_search.test.sql`. Bug fix: saved
dashboard configs are snake-cased on write, so a DataViz tile's prompt is
stored under `nl_query`, and the search read only `nlQuery`, so it never
returned a saved tile (in the comment `@` menu, and in F90's and F91's chat
menu and picker). It now reads `nl_query` and falls back to `nlQuery`. The
pgTAP fixtures use the stored spelling, plus one camelCased tile for the
fallback. It came in on `feat/agent-context` (`4eddab717`).

Files additions: none new. Both files are already under F21's
`50.rpc_gadgets__search.sql` and `supabase/tests/database/gadgets/` entries.

Correction to F21's Schema line: `demo/measles` now has three gadget
migrations, `20261107004932_gadget_references.sql`,
`20261107024831_gadget_refs_require_sub_id_only_for_tiles.sql` (`0c7f2b0ef`),
and `20261109134745_gadgets_search_stored_prompt.sql` (`ee2206125`), each with an `apps/desktop/migrations/*.gen.sql` mirror. Do not
port them: F21's one regenerated migration includes this fix once the schema
file has it. Two later edits matter when regenerating: `33d66ec77` added a pg_trgm preload block to the top of
`20261109134745_gadgets_search_stored_prompt.sql`, because hosted Supabase
rejects the function-level `pg_trgm.word_similarity_threshold` until the
library is loaded, so F21's regenerated migration needs the same block. The
desktop mirror `20261109134745_gadgets_search_stored_prompt.gen.sql` was
generated later by `b9dc62743`: regenerate it with
`pnpm desktop:sqlite:gen-migrations`, never copy.

Correction to "Commits to read": F21 is all 47 commits of
`feat/comment-embeds` (`git log --oneline a7626f991^1..a7626f991^2`), branched
at `b2fcba4a1` and merged into `demo/measles` in `a7626f991`. Replace the
sentence that names the last two by subject with the rows below, appended
after `375cbf2e0`. Add a Take column: "All of it" for the 21 rows already
listed.

| SHA | Subject | Take |
|---|---|---|
| `428060a69` | docs(measles-demo): document gadgets and log gadget references | MIXED: `docs/measles-demo/gadgets.md` (new), the "Gadget references" section of `docs/measles-demo/case-activity-architecture.md`, the gadgets line in `AGENTS.md`, and the gadget references bullet in `docs/production-plan-world-humanitarian-day.md` go here (see Docs). The `docs/measles-demo/pr-feature-log.md` hunk is branch-only: never port. |
| `43982e31d` | test(comments): cover linking and embedding gadgets in a case comment | All of it: `tests/e2e/case-gadgets.spec.ts` and `tests/e2e/helpers/seedDashboardWithTile.ts` (both new). |
| `c212f382d` | docs(measles-demo): note multi-word @ queries as a gadget follow-up | All of it (`gadgets.md`). |
| `371c85b45` | test(dashboards): stub the preview route search and cover the linked tile id | All of it. |
| `30a23ebf4` | test(comments): stub jsdom rect measuring so the composer tests leave no stray errors | History: `8759d0245` moves the stub into `RichTextComposer/__tests__/RichTextComposerTestFixtures.tsx`. Port the final files. |
| `94cb448be` | fix(gadgets): pin the first row so late gadget results never move the highlight | All of it. |
| `81bb394ac` | fix(gadgets): keep search rank within Dashboards and ask for every type's rows | All of it. `f0f050c2d` later derives the limit from the type list. |
| `f8995b094` | fix(gadgets): keep the @ menu inside short viewports and scroll the highlight into view | History in part: `4f292d6e8` moves the scroll from `MentionMenuOption` into `useMentionMenuNavigation`. Port the final files. |
| `8dfa33a21` | fix(gadgets): treat a gadget from another workspace as unavailable | All of it. |
| `19bbe9c23` | fix(gadgets): copy gadget nodes as their plain-text noun | All of it. |
| `9abd59155` | refactor(gadgets): read a tile's viz type against the known list in one place | All of it. |
| `649a87232` | chore(gadgets): hoist the highlight class and use an ellipsis in the searching row | All of it, except the `.po` catalogs: regenerate them. |
| `115fe9d07` | chore(gadgets): format the groups list | All of it (formatting only). |
| `4f292d6e8` | fix(gadgets): keep the pinned row in view and let the menu flip above the caret | All of it. |
| `3443e9acf` | fix(gadgets): keep the @ menu positioned as it resizes and scroll only its own list | All of it. |
| `da5876de3` | fix(gadgets): anchor the @ menu to the caret's line so a flipped menu leaves it visible | All of it. |
| `0c7f2b0ef` | fix(gadgets): only keep a ref's sub id for dashboard tiles in the sync trigger | All of the schema and pgTAP changes. Do not copy its migration or desktop mirror: see Schema. |
| `8759d0245` | test(gadgets): split the composer and summary tests by concern | All of it: deletes `RichTextComposer.test.tsx` (F18 creates it) and `useGadgetSummaries.test.tsx`, and adds their `__tests__/` folders. |
| `a0e9a0a87` | chore(i18n): translate the gadget and case activity copy | Regenerate, never copy. Mostly F21's gadget strings and F18's case activity strings, plus reference-line churn in other features' entries. |
| `3b3254ec1` | test(gadgets): cover cross-workspace maps and case types and rename the summary fixtures | All of it. |
| `5d9d74af4` | test(gadgets): split the mention menu list tests by concern and restore their spies | All of it: deletes `MentionMenuList.test.tsx` and adds `MentionMenuList/__tests__/`. |
| `56656523f` | fix(gadgets): apply the menu's height floor only when the other side has more room | All of it: `getMenuMaxHeight.ts` and its test (new). |
| `f0f050c2d` | refactor(gadgets): derive the search limit from the gadget type list | All of it. |
| `6e16a4cc3` | test(gadgets): cover an empty tile sub id and reflow the sync trigger docstring | All of it. |
| `75256f92c` | docs(gadgets): note the sub id rule, workspace check, and search limit sync | All of it (`gadgets.md`). |
| `6b0f8de9b` | feat(gadgets): list people first in the @ menu so late gadget results never move the highlight | All of it, including the `gadget-references-design.md` and `gadgets.md` edits. |

**Files additions:**
- `src/components/RichText/RichTextComposer/__tests__/{RichTextComposer.content.test.tsx,RichTextComposer.gadgets.test.tsx,RichTextComposer.submit.test.tsx,RichTextComposerTestFixtures.tsx}`
  (new), with `RichTextComposer/RichTextComposer.test.tsx` deleted.
- `src/components/RichText/Gadget/useGadgetSummaries/__tests__/` (new), with
  `useGadgetSummaries.test.tsx` deleted.
- `src/components/RichText/MentionMenu/MentionMenuList/__tests__/` (new) and
  `MentionMenuList/getMenuMaxHeight.ts` (new), with `MentionMenuList.test.tsx`
  deleted.
- `src/routes/_auth/$workspaceSlug/dashboards/preview/-$dashboardId.test.tsx`
  (on `develop`; only the search stub and linked tile id case).
- `supabase/tests/database/gadgets/comment_gadget_refs.test.sql`: the
  tile-only sub id and empty sub id cases.

**Schema correction:** the branch now has two migrations,
`20261107004932_gadget_references.sql` and
`20261107024831_gadget_refs_require_sub_id_only_for_tiles.sql` (which
replaces `comments__sync_gadget_refs` so only `dashboard_tile` refs keep a
`sub_id`), each with an `apps/desktop/migrations/*.gen.sql` mirror. Regenerate
one migration from the final `supabase/schemas/` on the PR branch: it already
carries the tile-only rule. Never copy either.

**Verification addition:**
```sh
pnpm vitest run 'src/routes/_auth/$workspaceSlug/dashboards/preview'
```

Add to **Commits to read**:

| SHA | Subject | Take |
|---|---|---|
| `b28efac88` | fix(db): load pg_trgm before the gadget migration sets its threshold | All of it, applied to the regenerated `*_gadget_references.sql`: add the hand-written `pg_trgm` load block before the gadget search function, then regenerate the desktop mirror. Same cause as F19's `88c2d2080`. |

`ee2206125` (fix(gadgets): find dashboard tiles by their stored prompt) is
part of this addendum, so F21 also takes `33d66ec77`'s hunk for
`20261109134745_gadgets_search_stored_prompt.sql` (the same load block) and
`b9dc62743`'s `apps/desktop/migrations/20261109134745_gadgets_search_stored_prompt.gen.sql`
(regenerate it).

---

## F23: Catalog field mapping

**Purpose:** Each drive-index pipeline maps its source's dataset records
onto a common catalog metadata schema through one YAML file beside it,
`socrata.pipeline.yaml` and `hdx.pipeline.yaml`. A mapping is a dotted path
into the source record, a constant, or a script under `mappers/`. The YAML
also lists the pipeline's drives (replacing `configuredDrives.ts` and
`hdxDrive.ts`) and each drive's organization labels, and a new
`data_catalog_drives` table records them. `data_catalog_listings` renames
`external_organization_name` to `organization1_name`, gains
`organization2_name` to `organization4_name`, `domains`, `tags`, the raw
`source_metadata`, and `drive_id`, and `search_vector` weighs the new text.
Search gains level-2 organization, topic, and keyword filters, and the
facets that count them. The catalog shows a listing's two deepest
organization levels in each row. Its rail gains Publisher (the old Source
filter, relabelled), a level-2 filter, Topic, and Keywords. Its detail pane
groups a listing into Published by, About, Source, and Technical details,
with topic and keyword chips that add a filter. **Value:** Listings stop
being a name and one hardcoded organization. A new portal or a corrected
field is a config edit, search matches a listing's agency, topics, and
keywords, and a user can narrow thousands of listings by who published them
and what they cover. Design: `docs/measles-demo/catalog-field-mapping-design.md` and its
plan `catalog-field-mapping-plan.md` (both go with F9).

**PR title:** `feat(catalog)!: map catalog metadata from per-pipeline YAML and filter by it`

**Depends on:** F16 (the loadability config and flags it extends) and F19
(`feat/catalog-filters`: the match function, the search RPCs, the facets, and
the filter rail it extends). Merge after both, and after F17.

**Commits to read:** all 37 non-merge commits of
`feat/catalog-field-mapping` since `b2fcba4a1`. The merge commit
`9766851e7` brought `demo/measles` and F19's work into the branch. Those
commits belong to the features that own them, not here.

*The pipeline config parser and the field mapper (`@avandar/etl`):*

| SHA | Subject | Take |
|---|---|---|
| `9b62c64da` | feat(etl): parse per-pipeline catalog field mapping configs | All of it |
| `24af95af7` | feat(etl): read catalog field paths and coerce mapped values | All of it |
| `5bb703a2b` | chore(etl): format the pipeline config parser | Formatting: take the final file |
| `2fedf1ba9` | fix(etl): reject non-ISO dates and undefined list items in catalog coercion | All of it |
| `b191f4cbf` | feat(etl): compile pipeline field mappings, importing each script once | All of it |
| `f82a67efb` | refactor(etl): name the drive label lookup getOrganizationLabelsFromDrive | All of it |
| `bf8e7cfa2` | fix(etl): name the config file on YAML errors and explain non-text values | All of it |
| `26993b266` | refactor(etl)!: read per-pipeline loadability overrides from the pipeline config | All of it. Its `etl.config.yaml` and `getPipelineWorkspaceLoadability` hunks are in F16's files: apply on top of F16. |
| `6a0bcbfba` | docs(etl): point the loadability comment at the pipeline config | All of it |
| `e8e592d1a` | docs(etl): document pipeline configs, field mapping, and drives | All of it (`packages/node/etl/README.md`) |

*The schema (rename, drives table, new columns, filtered search):*

| SHA | Subject | Take |
|---|---|---|
| `c59864844` | feat(db)!: add catalog drives, organization levels, and filtered search; rename external_organization_name | History: built on the pre-merge search. Do not port it. Port the final `supabase/schemas/` files, the pgTAP tests, the upgrade tests, and the desktop manual-migration body. |
| `4291d2500` | chore(catalog): apply the formatter to the catalog schema and label tests | History: formatting of `c59864844`'s files. |
| `2b7199729` | fix(db): keep the catalog migration's desktop body and replay the production shape | History: its desktop body and upgrade-test prelude changes are in the final files. |
| `5ebe11ba5` | fix(db)!: rebuild the catalog field mapping migration on filtered search | The final rename migration and its upgrade test. Hand-write the rename: port its SQL, give it a new timestamp. |
| `80a6e1ffe` | feat(catalog): filter and facet catalog search by agency, topic, and keyword | All of it. Regenerate the migration, types, and desktop migration after the rename migration. |
| `b1a8199b7` | test(db): check every new listing column starts empty after the rename | All of it |

*The ETL engine and its stores write the new columns and the drive:*

| SHA | Subject | Take |
|---|---|---|
| `b5a03820b` | feat(etl): write organization levels, domains, tags, and the source record | All of it |
| `4d4b6b49b` | feat(etl): record each drive's organization labels and link listings to it | All of it |
| `937a118f7` | fix(etl): write a drive row only for crawls that run | All of it |

*The sources keep their raw record, and the pipelines read YAML:*

| SHA | Subject | Take |
|---|---|---|
| `2020b4642` | feat(open-data): keep each Socrata and CKAN result's raw record | All of it |
| `c99e46b54` | test(open-data): give hand-built source fixtures their raw record | All of it |
| `5e3b6ee3d` | feat(socrata): map catalog metadata from socrata.pipeline.yaml | All of it. The lockfile hunk adds a dependency to `apps/pipeline-server`: re-add it with `pnpm add`, then restore `pnpm-workspace.yaml`. |
| `8578eaecb` | fix(pipelines): keep out-of-range HTML entities and restore warn spies | All of it |
| `bcac141e7` | feat(hdx): map catalog metadata from hdx.pipeline.yaml | All of it |
| `79dc85076` | fix(hdx): read only HDX's own update frequency codes | All of it |
| `d50583f7e` | fix(socrata): read a health dataset's office from either metadata key | All of it |
| `7f2d6dc8e` | fix(hdx): map topics, data source, coverage dates, and caveats | All of it. Supersedes `bcac141e7`'s `domains` mapping: HDX's groups (countries) become keywords, and topics come from `hdxTopics`' tag-to-topic table. |
| `d9c3bf6c0` | fix(hdx): store each listing's package with only its own resource | All of it. Without it, a package's write grows with the square of its resource count (each listing stored every resource), which ran the demo database out of memory on WHO's country packages. |
| `62ffe547a` | fix(etl): cap each listings write at 4 MiB of JSON | All of it (`loadRelationsPage` and its test, and the `@avandar/etl` README's **Writes** paragraph). It edits a file F4 owns: apply it on top of F54's final `loadRelationsPage.ts`. F27 replaces its fixed cap with the throttle's budget. |
| `c75d19331` | fix(hdx): leave license text and file check reports out of source_metadata | All of it. On demo, `license_other` and `fs_check_info` were 55% of HDX's raw JSON. |
| `8e707d700` | fix(hdx): leave mapped and repeated package fields out of source_metadata | All of it. Drops `notes` and `caveats` (already in `description` and `notes`) and narrows `organization`, `tags`, and `groups` to the keys the mappers read. Sizing and the demo disk analysis: `docs/measles-demo/etl-disk-footprint.md`. |
| `ec060372c` | docs(measles): explain the HDX disk footprint and how a full run fits | Branch-only: the demo instance's numbers and recovery steps. Port only if `develop` gets the same HDX sizing question. |
| `4d1d2a7d5` | feat(etl): leave the paths a field mapping consumes out of a source record | All of it: `omitRecordPaths/`, `CatalogFieldMapper.omitMappedPaths`, a script's `reads` export, `additionalSourceMetadata.omit` in the config parser and types, and the two new loader fixtures. |
| `2d61eb961` | refactor(catalog)!: keep only unmapped source fields in additional_source_metadata | All of it. Supersedes `d9c3bf6c0`, `c75d19331`, and `8e707d700`'s trims of `source_metadata`: port the final `makeApiResourceRelationsFromCkanPackage.ts`, not theirs. `source_metadata` becomes `additional_source_metadata` (the schema, both pipelines, the scripts' `reads`, `hdx.pipeline.yaml`'s `omit`, the `DataCatalogListing` model, the technical details' "More from the source" label and its translations), and the listings upsert returns ids (the schema, its pgTAP test, both listings stores and their tests). It also fixes `catalog_field_mapping.prelude.sql` for the new column and return type. |

*The app reads the renamed column, the drives, and the new filters:*

| SHA | Subject | Take |
|---|---|---|
| `4499fcec1` | refactor(catalog): read organization1_name and the new listing columns | All of it, but it edits files other features own (the pipelines, the `DataCatalogListing` model, and the `DataCatalogView` list and detail): apply its hunks on top of them. |
| `68b003a2f` | feat(catalog): read catalog drives and their organization labels | All of it |
| `d64d11d83` | feat(catalog): send the agency, topic, and keyword filters and read their facets | All of it. Regenerate the `.po` catalogs. |
| `d90481335` | feat(catalog): filter by publisher, agency, topic, and keyword in the rail | All of it. Regenerate the `.po` catalogs. |
| `14984e21b` | fix(catalog): let keyboard and screen reader users remove filter chips | All of it |
| `ef758d937` | feat(catalog): show publisher, topics, keywords, and source in the listing detail | All of it. Regenerate the `.po` catalogs. |
| `6c43b5a65` | chore(catalog): apply the formatter to the results header test | Formatting: take the final file |
| `d7fd436a8` | fix(catalog): keep the source record as the source sent it | All of it |
| `bc4baf853` | test(catalog): filter the open data catalog by publisher, agency, and keyword end to end | All of it |
| `ad6d300a7` | feat(catalog): offer keywords in the rail and return every facet in one value | All of it. Supersedes `d90481335`'s Keywords chips (`DataCatalogKeywordFacet.tsx` is deleted) and moves the facet rows into `52.data_catalog_listings__search_facet_rows.sql`, with the RPC in `53.`. Regenerate the migration, types, desktop migration, and `.po` catalogs. |
| `dbf921eda` | fix(catalog): bust the persisted query cache for the new facet shape | All of it. Must ship with `ad6d300a7`: it bumps `CACHE_SCHEMA_VERSION` so browsers drop facets cached without `tags`. If `develop` has bumped the version since, bump to the next one instead of taking `v10`. |
| `a8e99dc8a` | feat(catalog): search keywords on the server and count every facet in one pass | All of it, on top of `ad6d300a7`. Adds `52.rpc_data_catalog_listings__search_tag_options.sql`, rewrites `52.data_catalog_listings__search_facet_rows.sql`, and adds `useDataCatalogKeywordOptions`. `catalog-search-performance.md` goes with F9. Regenerate the migration, types, and desktop migration. Built on `feat/catalog-keyword-search`. |
| `6c0ac89b9` | feat(catalog): keep catalog search fast as the catalog grows | All of it, on top of `a8e99dc8a`. Adds `10.data_catalog_facet_counts.sql`, `50.data_catalog_listings__updated_window.sql`, `52.data_catalog_facet_counts__refresh.sql`, `53.data_catalog_listings__count_facet.sql`, and `54.data_catalog_listings__facet_value_rows.sql`, renumbers the other search schemas and `rpc_pipeline_executions__finish`, adds the listings' new indexes, and excludes `data_catalog_facet_counts` from desktop sync. The populate migration is hand-written. Regenerate the rest. Built on `feat/catalog-scalable-search`. |
| `db8d5f86c` | fix(db): load pg_trgm before the scalable search migration sets its threshold | All of it. Hand-written header on the generated migration, as the earlier catalog search migrations have. |
| `4fd222156` | fix(catalog): read the update windows once per facet count refresh | All of it. The generated `20261109082121_faster_catalog_facet_counts_refresh.sql` replaces only the refresh. |

*Docs, which go with F9:*

| SHA | Subject | Take |
|---|---|---|
| `9545f385a` | docs(measles-demo): use the getOrganizationLabelsFromDrive name | Nothing: goes with F9. |
| `7ff389c30` | docs(measles-demo): build catalog filters on the merged filter rail and search | Nothing: goes with F9. |

No commit is `MIXED`: every hunk belongs to F23. Several edit files other
features own, so apply them on top of those features' final files rather than
copying a file whole (see **Files shared by several features**).

**Files:** `packages/node/etl/src/EtlConfig/**` (the pipeline config parser,
`buildCatalogFieldPathReader`, `coerceCatalogFieldValue`,
`loadCatalogFieldMapper`, `getOrganizationLabelsFromDrive`),
`packages/node/etl/src/EtlEngine/**` and `stores/**` (the drives store, the
row contract and `listingContractColumns`), `packages/node/etl/README.md`,
`apps/pipeline-server/pipelines/{socrata,hdx}/**` (the two
`.pipeline.yaml` files, `mappers/`, `run.ts`, and the engine factories),
`pipelines/shared/htmlToPlainText/`, `pipelines/etl.config.yaml`,
`apps/pipeline-server/README.md`,
`shared/connectors/open-data/{CkanClient,CkanDiscoveryClient,SocrataDiscoveryClient}/`
(`sourceRecord`), the `DataCatalogListing` and new `DataCatalogDrive` models,
`src/clients/data-catalog-listings/` (`DataCatalogDriveClient.ts`,
`buildDataCatalogSearchFilterArgs/`, `createDataCatalogSearchFacets/`,
`createDataCatalogSearchPage/`), the `DataCatalogView` rail, list, detail,
`buildOrganizationLine/`, `DataCatalogMetadataChips/`, `getSourceHost/`, and
`formatCatalogListingDate.ts`, `tests/e2e/data-catalog-filters.spec.ts`,
`supabase/schemas/00.util__text_array_to_text.sql`, `10.data_catalog_drives.sql`,
`11.data_catalog_listings.sql`, the three search schemas, the pgTAP test
`data_catalog_drives.test.sql`, and the search and filter pgTAP tests,
`supabase/migration-upgrade-tests/catalog_field_mapping.*`, and
`apps/desktop/scripts/gen-sqlite-migrations/getManualMigrationBodyFromSourceFile.ts`.

**Schema:** `20261107180000_catalog_field_mapping.sql` (renames
`external_organization_name`, adds the drives table and the new listing
columns, rebuilds `search_vector`, and replaces the search functions on the
renamed column) and `20261107180100_catalog_search_organization_filters.sql`
(adds the level-2, topic, and keyword parameters and facets). Hand-write the
first, because the schema diff would turn the rename into a drop and a
create: confirm the result has no `drop column` of a data column. Regenerate
the second after it. Both land after F16, F17 and F19's migrations. Then
`20261109020452_drop_catalog_upsert_for_return_type_change.sql`
(hand-written: the diff cannot change a function's return type) and
`20261109020622_catalog_additional_source_metadata.sql` (generated after it;
its `drop column source_metadata` is intended, since the old values hold
mapped fields the new column must not). Last,
`20261109041614_catalog_facets_as_one_value_with_keywords.sql` (generated:
it drops the row-returning facet RPC and recreates it returning `jsonb`, over
the new `data_catalog_listings__search_facet_rows`), then
`20261109052742_catalog_single_pass_facets_and_keyword_search.sql`
(generated: the one-pass facet rows and the keyword search RPC), then
`20261109065256_catalog_scalable_search.sql` (generated, plus the
hand-written pg_trgm load header) and
`20261109065300_populate_catalog_facet_counts.sql` (hand-written: fills the
summary table once).

**Verification:**
```sh
pnpm --filter @avandar/etl test && pnpm --filter @avandar/etl test:supabase
pnpm --filter @avandar/pipeline-server test
pnpm vitest run src/clients/data-catalog-listings src/views/DataManagerApp shared/models/data-catalog-listings shared/connectors/open-data
pnpm test:db
pnpm exec tsc -b --force
pnpm test:e2e data-catalog-filters.spec.ts
ava pipeline run socrata --local --limit 20   # local stack only: rows carry organization1_name to 3, domains, tags
```
Then open the Open data tab with a few hundred listings: before typing,
Publisher and Keywords are offered. Choose a publisher, then its agency, then
click a keyword on a listing, clear the filters, and pick a keyword from the
Keywords facet.

**Rollout:** Deploy the two migrations, the frontend, and the
pipeline-server together, with no pipeline run in between. An old
pipeline-server still writes `external_organization_name`, so its inserts fail
on the `NOT NULL` `organization1_name`. An old frontend's `DBReadSchema`
rejects the new listing shape, so the catalog would not load.

**Follow-ups found in review, not done here:**
- `ava pipeline run --local` discards the runner's warnings on a successful
  run (`runPipelineLocal.ts` keeps stderr only for a failed run). Mapping
  warnings are invisible unless the runner is run directly. The pipeline
  server README says how.
- `DataCatalogListingDetail` is still over the 45-line function rule.
- The production pipeline-server Dockerfile may not resolve the
  `@pipelines/*` and `$/` aliases the new mapper imports use. Raised in
  review, unverified: build the image and run one pipeline in it before
  deploying.
- Backfill the demo instance with one full (non-incremental) run of each
  pipeline. Incremental runs only touch datasets that changed, so unchanged
  listings keep empty new columns. Socrata was backfilled on 2026-11-07.
  HDX's first demo run (2026-11-08) failed partway, before `d9c3bf6c0`, and
  left 11,983 listings storing whole packages. Change detection ignores
  `source_metadata`, so a later run does not shrink them: reset HDX on demo
  (`ava pipeline reset hdx --env demo`) before its next full run.
  Run `95f18055` later filled the demo branch's disk (`53100`) at about
  1.2 GB of database plus WAL. A complete HDX run is about 191k listings,
  roughly 1.45 GB of database and 2.5 GB of disk with WAL after
  `8e707d700`. The branch's `/data` volume was 8.4 GB with 6.3 GB free on
  2026-11-09, so it fits, but what filled it at 22:41 UTC is unexplained.
  See
  `docs/measles-demo/etl-disk-footprint.md` for the recovery steps and the
  GeoTIFF trade-off.
- `hdxTopics`' tag-to-topic table covers HDX's 150-tag vocabulary as of
  2026-11-08. A tag HDX adds later gets no topic until it is added there.
- Removing one of two chosen publishers leaves the agencies chosen under it
  selected, which can empty the list.
- No automated test runs the mapper loader under Bun. It was verified
  manually.
- `docs/measles-demo/catalog-search-performance.md` (goes with F9) records
  how catalog search stays bounded as the catalog grows, what was rejected,
  and the work held back: refreshing the summary outside the finish call and
  building indexes concurrently before the catalog reaches millions of
  listings, keyset paging, and server-side search for publishers.

**Addendum: follow-up commits mapped on 2026-11-10.** Port these with F23.

Add to **Commits to read**:

*The filter rail's facets become searchable comboboxes (between
`d90481335` and `ad6d300a7`, which builds its Keywords facet on them, so it
cannot be left out):*

| SHA | Subject | Take |
|---|---|---|
| `0f41fef3a` | feat(data-catalog): turn the filter rail's facets into searchable comboboxes | MIXED: everything except the `catalog-field-mapping-design.md` hunk, which goes with F9. Publisher, the second organization level, Topic, and Format become multi-select comboboxes (`DataCatalogFacetSelect`, `DataCatalogFacetOption`), Last updated a single-select one (`DataCatalogUpdatedWithinSelect`). `tokenSearch` narrows by every fragment, accent-insensitively and inside words, and ranks word-start matches first. `DataCatalogCheckboxFacet.tsx` is deleted. Regenerate the `.po` catalogs. |
| `9686c9756` | Updated translations | Regenerate. |
| `774651c7d` | updated formatting | Formatting: take the final `tokenSearch.test.ts`. |

*Listing names on one line, and search on the tab row:*

| SHA | Subject | Take |
|---|---|---|
| `9987ef9da` | fix(catalog): clip long dataset names and move search onto the tab row | MIXED: everything except `tests/e2e/odc-parquet-copy.spec.ts`, which goes with F25 (it merges after F23 and takes its final spec). Long names wrapped inside virtualized rows and overlapped the next result: each name is one line with its full title on hover, and the search moves out of the rail into the new `DataCatalogSearchField` in the Import tabs' `listRightSection`, hidden while the catalog is empty (`onCatalogEmptyChange`). Needs F19's `4c7c9d760` addendum (the tab list class). `52c823754` later moves `DataCatalogListingName` onto `TruncatedText` (see F121). |
| `a65316adc` | fix(catalog): assert the listing name class exists in its test | All of it (`css.dataCatalogListingListName!`, for `tsc -b`). |
| `8a83f8705` | chore(i18n): point the catalog search strings at their new component | Regenerate. |

*Counts:*

| SHA | Subject | Take |
|---|---|---|
| `632415e08` | fix(catalog): show only the datasets in view | All of it. The results header stated "X of Y datasets", where Y included listings the default filter hides. It now says only "X datasets" (or "X+ datasets" when capped), and `numCatalogListings` and `isNarrowed` are gone from `DataCatalogResultsHeader`. Regenerate the `.po` catalogs. |
| `921c48634` | chore(i18n): translate the catalog keyword and capped count strings | Regenerate. |
| `b9dc62743` | feat(catalog): keep filters selectable while search counts reload | MIXED: everything except `apps/desktop/migrations/20261109134745_gadgets_search_stored_prompt.gen.sql` (see F21's addendum). A common word scanned unloadable listings until the facet query timed out and the dropdowns emptied. Two partial GIN indexes hold only loadable, valid listings. Search and facet counts cap at 5,000. Once 50 listings match the words, name similarity is skipped. A search with no filter chosen counts every facet from one read (`55.data_catalog_listings__facets_for_one_search.sql`, new). `useDataCatalogFacets` keeps the last counts through a failed refresh, does not retry, and reports `isCountLoading`, and the rail keeps its options selectable while counts reload. Regenerate the migration, types, desktop migration, and `.po` catalogs. |
| `33d66ec77` | fix(db): load pg_trgm before setting its threshold in new migrations | MIXED: the hand-written load block at the top of `20261109155144_catalog_loadable_search.sql` goes here. The `20261109134745_gadgets_search_stored_prompt.sql` block goes with `ee2206125` (F21's addendum). |
| `7d23b72ef` | fixed formatting | MIXED (formatting only): `DataCatalogFacetSelect.tsx` here. `ChatComposerOverlay.module.css` is F94, `SingleIndividualView.module.css` is F68. |

*Pipelines and tests:*

| SHA | Subject | Take |
|---|---|---|
| `fd5747eef` | chore(socrata): apply the formatter to the office mapper test | Formatting: take the final file. |
| `34b6a1aed` | fix(test): isolate the catalog field mapping upgrade fixture from real listings | All of it (`catalog_field_mapping.{prelude,assertions}.sql`). |
| `9b720351b` | fix(pipeline-server): record drives only for pipelines that have them | All of it. World Bank WDI has no drive, so `getPipelineEtlDestination` no longer gives it a drives store, and the Socrata and HDX `run.ts` pass theirs. F26's hunks in the same file go on top. |
| `778b8f5ef` | fix(desktop): generate SQLite migrations for additional_source_metadata | Regenerate the desktop mirrors of `20261109020452` and `20261109020622`. |
| `46bbed589` | chore(i18n): translate the new catalog strings | Regenerate (drops the obsolete "Source record" and translates F25's four strings). |
| `0358516c9` | docs(measles): record what the space savings measured and changed | Branch-only, like `ec060372c`: `etl-disk-footprint.md`. |

**Files:** add `DataCatalogFilterRail/{DataCatalogFacetSelect,DataCatalogFacetOption,DataCatalogUpdatedWithinSelect}.tsx`,
`facetDropdownProps.ts`, and `tokenSearch/` (new); `DataCatalogCheckboxFacet.tsx`
(deleted); `DataCatalogSearchField/DataCatalogSearchField.tsx` (new);
`DataCatalogListingList.{tsx,module.css}` and `DataCatalogListingList.test.tsx`
(new); the tab-row search in `DataImportTabs/DataImportTabs.{tsx,module.css}`;
`DataCatalogResultsHeader.{tsx,test.tsx}`; `useDataCatalogSearch/{useDataCatalogFacets,useDataCatalogKeywordOptions,useDataCatalogSearch}.ts`;
`supabase/schemas/55.data_catalog_listings__facets_for_one_search.sql` (new)
and the `b9dc62743` hunks of `11.data_catalog_listings.sql`,
`52.data_catalog_listings__search_matches.sql`,
`53.rpc_data_catalog_listings__search.sql`,
`55.data_catalog_listings__search_facet_rows.sql`,
`55.rpc_data_catalog_listings__search_tag_options.sql`, and
`rpc_data_catalog_listings__search.test.sql`;
`apps/pipeline-server/pipelines/shared/getPipelineEtlDestination/`.

**Schema:** add, after `20261109082121_faster_catalog_facet_counts_refresh.sql`:
`20261109155144_catalog_loadable_search.sql` (generated, plus the
hand-written `pg_trgm` load header from `33d66ec77`): the two partial GIN
indexes, `data_catalog_listings__facets_for_one_search`, the 5,000 count
cap, and the 50-match name similarity cutoff.

**Verification:** add
`supabase test db supabase/tests/database/rpc_data_catalog_listings__search.test.sql`,
then search a common word such as "health" with Loadable only on: the
counts settle, and the dropdowns stay open and selectable while they
reload.

---

## F24: ODC listing data preview and full-screen detail

**Purpose:** An Open Data Catalog (ODC) listing's detail pane showed its
columns but none of its rows. It now reads the listing's first 200 rows with
DuckDB, without adding it to the workspace, and shows them in a "Data
preview" section that says it holds only the first 200 rows. An API-backed
CSV listing is read from the start-of-file sample its column types are
verified from (`fetchOpenDataColumnTypeSample`, shared with
`verifyOpenDataColumnTypes`), so a source of any size previews. Any other
API-backed listing is read whole through the `open-data` edge function's
resource route (Parquet through a new `DuckDbClient.previewParquetBlob`), and
a pipeline listing from its Parquet URL. The section is the one a workspace
dataset's Metadata tab now uses too (`DatasetPreviewSection`). An expand
button opens the detail in a near-full-screen modal with the description
unfolded and the fact groups in a rail beside the columns and preview.
**Value:** A user can see what a dataset actually contains before adding it,
and read a long description and a wide preview without the narrow pane
cramping them.

**PR title:** `feat(data-catalog): preview an ODC listing's first 200 rows and open it full screen`

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `d8a72da58` | feat(data-catalog): preview an ODC listing's first 200 rows and open it full screen | All of it. Regenerate the `.po` catalogs. |
| `6b815b3d3` | fix(data-catalog): preview an API-backed CSV listing from the start of its file | All of it. |
| `99929aeb3` | docs: define ODC and track asking about an ODC listing before adding it | MIXED: the `production-plan-world-humanitarian-day.md` P6.8 bullet only. The `connector-nomenclature.md` ODC line goes with F9. |

**Files:** `src/clients/DuckDbClient/previewParquetBlob/`, the
`previewParquetBlob` method in `DuckDbClient.ts`,
`src/lib/openData/fetchCatalogListingPreview/`,
`src/lib/openData/fetchOpenDataColumnTypeSample/` and the sample read it
replaces in `verifyOpenDataColumnTypes.ts`,
`src/components/DatasetPreviewSection/`,
`DataCatalogView/useCatalogListingPreview/`, `DataCatalogView.tsx` and its
stylesheet (the `detailProps` object and the modal),
`DataCatalogListingDetail.tsx`, its stylesheet and test (the F24 hunks
listed under **Files shared by several features**), `DatasetMetaView.tsx`
(the preview section swap), and the `DataCatalogView` sentence in
`src/views/DataManagerApp/DataImportView/AGENTS.md`.

**Schema:** none.

**Verification:**
```sh
pnpm vitest run src/views/DataManagerApp src/components/DatasetPreviewSection src/lib/openData src/clients/DuckDbClient
```
Then open the Open data tab, select a loadable listing, and check that the
pane shows "Data preview, First 200 rows" with the cap note, that the expand
button opens the modal with the rail beside the content, and that a
workspace dataset's Metadata tab still shows its preview.

**Addendum: follow-up commits mapped on 2026-11-10.** Port these with F24.

Add to **Commits to read**:

| SHA | Subject | Take |
|---|---|---|
| `6ac1bc1ee` | updated translations | Regenerate (the `DatasetPreviewSection` and full-screen strings). |
| `c12067c82` | lint error fixes | Formatting: take the final `fetchCatalogListingPreview.test.ts`. |
| `3f344c3b1` | fix(open-data): share one column-type sample and retry gateway rejections | All of it. The preview and the column-type check each downloaded 10,000 rows, and a Socrata 503 on the second read left the columns unconfirmed while the preview showed data. Overlapping reads for one listing now share one request, a sample is reused for 14 minutes (inside the 15-minute token), and a 502, 503, or 504 is tried up to three times with backoff. Adds `clearOpenDataColumnTypeSampleCache` for tests and the new `fetchOpenDataColumnTypeSample.test.ts`. |
| `95924d4fd` | fix(catalog): keep a listing preview from crashing after it is cached | All of it. `dateColumnNames` was a `Set`. The persisted query cache stores JSON, so it came back as `{}` and the grid crashed calling `.has` when the listing opened again. It is now a list, `DataCatalogListingDetail` builds the Set (and treats anything else as no date columns), and `CACHE_SCHEMA_VERSION` goes from F23's `v10` to `v11`: bump to the next version after whatever `develop` has. |

**Files:** add `fetchOpenDataColumnTypeSample.test.ts` (new), the
`clearOpenDataColumnTypeSampleCache` call in `verifyOpenDataColumnTypes.test.ts`,
`queryPersister.{ts,test.ts}`, and `_dateColumnNamesForGrid` in
`DataCatalogListingDetail.{tsx,test.tsx}`.

**Verification:** add
`pnpm vitest run src/components/providers/AvandarQueryClientProvider/queryPersister src/lib/openData/fetchOpenDataColumnTypeSample`,
then open a listing with a date column, reload the page, and open it again.

---

## F25: Cached Parquet copies of ODC listings

Status: in progress. The pipeline server builds copies on request through
`POST /open-data-cache/:catalogListingId/build`, and the `open-data` edge
function requests them through
`POST /data-catalog-listings/:id/parquet-cache`. Workspaces read API-backed
listings only from their copies: the 25 MB relay, its raw-bytes cache, and
the `cached_*` columns are removed. An E2E test adds a listing whose copy has
several parts and checks every part loads, in order.

**Purpose:** An API-backed Open Data Catalog (ODC) listing is relayed whole
through the `open-data` edge function, capped at 25 MB, on every load. The
pipeline server now builds a Parquet copy of a listing's whole source into
the public `opendata` bucket, as a folder of parts of about 32 MB, with no
size limit of its own. It knows no API: each pipeline's manifest has a
`download` block saying whether its API pages and naming a download script
in the pipeline's folder. Socrata pages by row id with its declared column
types, so a copy needs about one part of disk. CKAN files are gzipped on disk
and split. The database claims one build per listing and records the copy.
The app downloads a copy's parts from Storage, merges them in DuckDB, waits
while a copy builds, and starts the build when a listing is added to a
workspace, saying when its data is still being prepared. The server deploys from a template filled by a gitignored
`.env.pipeline-server.prod`, and its Docker image now starts.
**Value:** Large listings, such as NYC's DOB Violations (2.48M rows), can be
added to a workspace and load from Storage instead of the source.

**PR title:** `feat(open-data): build cached Parquet copies of ODC listings on the pipeline server`

**Commits to read** (all from `feat/odc-parquet-cache`, merged in
`a9d2ec770`):

| SHA | Subject | Take |
|---|---|---|
| `250bb9ff4` | docs: spec cached Parquet copies of ODC listings and track retesting unreachable ones | All of it. |
| `ff8a6b290` | feat(pipeline-server): build a Parquet copy of an API-backed ODC listing's whole source | All of it, as reworked by the commits below. |
| `1c0e71558` | fix(storage): let only the service role write to the opendata bucket | All of it. Its own PR if it should ship first. |
| `3eb5699bf` | fix(pipeline-server): read an ODC source in DuckDB's strict mode with a pinned dialect | All of it. |
| `f9be62403` | feat(db): record ODC listings' Parquet copies and claim their builds | All of it. Its migration was replaced by `f08646466`'s. |
| `4de621ec7` | docs: record the ODC Parquet cache's CSV reading rules, build claims, and DOB measurements | All of it. |
| `a8c892a97` | chore(pipeline-server): keep one machine always running | All of it, superseded by `2c4fa5ec8`'s template. |
| `5520abf86` | feat(etl): let a pipeline manifest declare how its listings are downloaded | All of it. Bumps `@avandar/etl` (minor). |
| `f08646466` | refactor(db): store an ODC Parquet copy as a folder of parts | All of it. |
| `0211408e1` | feat(pipeline-server): copy ODC listings page by page, as each manifest says | All of it. |
| `2c4fa5ec8` | chore(pipeline-server): deploy from a template filled by a gitignored env file | All of it. |
| `d74b62ca8` | docs: record the paged ODC copy design and add the pipeline server Fly runbook | All of it. |
| `5685fb84c` | chore: keep env files and installed modules out of Docker build contexts | All of it. |
| `d3dd08b56` | fix(pipeline-server): make the Docker image start and run DuckDB | All of it. |
| `513873f61` | fix(pipeline-server): hoist DuckDB in the image, and fail the build if it cannot resolve | All of it. Merged in `7e428d400`. |
| `3ca228aae` | feat(pipeline-server): build ODC listings' Parquet copies on request | All of it. Merged in `42754c16c`. |
| `e86a92b21` | feat(pipeline-server): keep a listing's columns when its copy shares none of them | All of it, including the P6.11 roadmap item. Merged in `42754c16c`. |
| `b1c3a196b` | feat(open-data): request an ODC listing's Parquet copy from the pipeline server | All of it. Merged in `3600d91d9`. |
| `2e0039c62` | feat(open-data): load ODC listings from their Parquet copies | All of it, including the four new messages in every `src/i18n/locales/*/messages.po` and `messages.ts`. Merged in `cc10b08f2`. |
| `a285a3612` | docs: record how the app reads ODC listings' Parquet copies | All of it. Merged in `cc10b08f2`. |
| `86f234dc1` | refactor(open-data): remove the 25 MB relay and its raw-bytes cache | All of it, including the desktop SQLite migrations it adds for the earlier F25 migrations. Merged in `ba9724f2a`. |
| `8c6ea04f2` | test(open-data): add an ODC listing and load its multi-part Parquet copy end to end | All of it. Merged in `121737460`. |
| `37c7cb7d1` | Merge branch 'demo/measles' into feat/odc-parquet-cache, and remove the empty open-data-catalog bucket | Its own changes only: `20261109030000_STORAGE-drop-open-data-catalog-bucket.sql`, its `sql_paths` entry in `supabase/config.toml`, the rewritten `storage_open_data_catalog_bucket.test.sql`, and the regenerated `database.types.ts`. Merged in `ba9724f2a`. |

**Files:** `apps/pipeline-server/src/openDataParquetCache/`,
`apps/pipeline-server/pipelines/socrata/download/`,
`apps/pipeline-server/pipelines/hdx/download/`, the `download` blocks in
`socrata.pipeline.yaml` and `hdx.pipeline.yaml`,
`packages/node/etl/src/ListingDownload/`, the `download` field in
`PipelineConfig.types.ts` and `parsePipelineConfig.ts`,
`apps/pipeline-server/deploy/`, `apps/pipeline-server/Dockerfile`, the
`duckdb` dependency in `apps/pipeline-server/package.json` and its lockfile
entry, `.dockerignore`, `.env.pipeline-server.prod.example` and its
`.gitignore` exception, the `deploy:pipeline-server` script in
`package.json`, the deleted `apps/pipeline-server/fly.production.toml`, the
Fly section of `apps/pipeline-server/README.md`, the `parquetCache*` fields
in `DataCatalogListing.types.ts` and `DataCatalogListingParsers.ts` and the
fixtures that list them, `shared/connectors/open-data/buildParquetCachePartPath/`,
`supabase/functions/open-data/requestParquetCache/`,
`supabase/functions/open-data/startParquetCopyBuild/`, the parquet-cache
route in `OpenDataRoutes.ts` and `OpenDataRoutes.types.ts`, the pipeline
server section of `.env.example.edge`, the `AVA_PIPELINE_SERVER_URL` lines
in `.github/workflows/demo.yaml`, `src/lib/openData/requestOpenDataParquetCopy/`,
`src/lib/openData/fetchOpenDataParquetCopy/`,
`src/clients/DuckDbClient/mergeParquetBlobs/` and `mergeParquetBlobs` in
`DuckDbClient.ts`, the copy options in `DatasetParquetWrapper.ts`,
`createDefaultRegistry.ts`, and `createRegistryForFetch.ts`,
`src/views/DataManagerApp/DataImportView/DataCatalogView/requestParquetCopyForAdding/`
and its call in `DataCatalogView.tsx`, the four new catalog messages,
`docs/measles-demo/odc-parquet-cache-spec.md`,
`docs/measles-demo/pipeline-server-fly-runbook.md`, and the P6.9 and P6.10
bullets in `production-plan-world-humanitarian-day.md`.

**Schema:** `00.enum.data_catalog_listings__parquet_cache_status.sql`, the
`parquet_cache_*` columns and constraints in `11.data_catalog_listings.sql`,
the three `50.rpc_data_catalog_listings__*_parquet_cache.sql` RPCs,
migrations `20261107220000_STORAGE-opendata-service-role-writes-only.sql`
(hand-written, in `[db.seed] sql_paths`, mirrored in `99.storage.sql`) and
`20261108195431_odc_parquet_cache.sql`, `20261109021620_drop_odc_raw_bytes_cache.sql`
(drops `cached_object_path`, `cached_source_version`, and `cached_at`), and
`20261109030000_STORAGE-drop-open-data-catalog-bucket.sql` (hand-written, in
`[db.seed] sql_paths`; deletes the `open-data-catalog` bucket once it is
empty), their desktop `.gen.sql` files, the rewritten
`storage_open_data_catalog_bucket.test.sql`, the copy-column cases in
`data_catalog_listings_access.test.sql` and
`rpc_data_catalog_listings__upsert_with_relation_columns.test.sql`, and
`supabase/tests/database/rpc_data_catalog_listings__parquet_cache.test.sql`.

**Verification:**
```sh
pnpm --filter @avandar/pipeline-server test
pnpm --filter @avandar/etl test
pnpm exec vitest run supabase/functions/open-data shared/connectors/open-data
pnpm exec vitest run src/clients/qetl src/lib/openData src/clients/DuckDbClient src/views/DataManagerApp/DataImportView
pnpm test:executed src/clients/DuckDbClient/mergeParquetBlobs
pnpm test:e2e odc-parquet-copy.spec.ts
supabase test db supabase/tests/database/rpc_data_catalog_listings__parquet_cache.test.sql
```
Then build the image (`docker build -f apps/pipeline-server/Dockerfile .`),
run it, and check `/healthz` answers `{"ok":true}`. In the app, add an
API-backed listing that has no copy: a "Preparing your data" notification
appears, and opening the dataset downloads its parts from the `opendata`
bucket, with no request to the `/resource` relay.

**Addendum: follow-up commits mapped on 2026-11-10.** Port these with F25.

Add to **Commits to read**:

| SHA | Subject | Take |
|---|---|---|
| `e490f4055` | fix lints and format | Formatting: take the final files (`deploy/deployScripts.test.ts`, the Socrata and HDX `download/` scripts, `convertToParquetParts`, `loadPipelineListingDownload`). |
| `fa0b35adf` | fix(desktop): generate SQLite migrations for the latest demo migrations | MIXED, regenerate: the mirrors of `20261107220000_STORAGE-opendata-service-role-writes-only` and `20261108195431_odc_parquet_cache` here. `20261108031541_correct_value_rule_data_types` is F71 to F75. |
| `3e399a6ea` | docs: record that a migration removes the emptied open-data-catalog bucket | All of it (`odc-parquet-cache-spec.md`). |
| `9987ef9da` | fix(catalog): clip long dataset names and move search onto the tab row | MIXED: only `tests/e2e/odc-parquet-copy.spec.ts` (the search box is no longer inside the "Filters" region). The rest is F23. |

---

## F26: The pipeline server loads into the Supabase project each run names

**Purpose:** The pipeline server read one Supabase project from its own
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, so a server could only ever
load into that project. It now keeps no Supabase credentials. Every run
sends its project's URL and service role key in the `X-Ava-Supabase-Url` and
`X-Ava-Supabase-Service-Role-Key` headers (headers, because a run records its
body), and a run without them is refused with 400. `ava pipeline run` sends
the loaded env file's `VITE_SUPABASE_API_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
**Value:** One deployed server loads into demo, production, or a local
stack, whichever its caller holds the key for.

**PR title:** `feat(pipeline-server): load into the Supabase project each run names`

**Commits to read** (from `feat/pipeline-supabase-target`, merged in
`d0af42ce6`):

| SHA | Subject | Take |
|---|---|---|
| `38ab31ad4` | feat(pipeline-server): load into the Supabase project each run names | All of it. The `odc-parquet-cache-spec.md` and runbook hunks go with F25. |

**Files:** `apps/pipeline-server/src/routes/pipeline-name/readSupabaseTarget/`,
`registerPipelineRoutes.ts` and its test, `run/run.ts` and its test,
`pipelines/shared/PipelineRunOptions.types.ts`,
`getPipelineEtlDestination.ts` and its test, each pipeline's `run.ts` and
its new `run.test.ts`, `apps/ava-cli/src/PipelineCli/sendRunPipelineRequest.ts`
and its test, `RunPipelineCli.test.ts`, and the Supabase paragraphs in
`apps/pipeline-server/README.md`, `apps/ava-cli/README.md`, and
`.env.pipeline-server.prod.example`.

**Schema:** none.

**Verification:**
```sh
pnpm --filter @avandar/pipeline-server test
pnpm --filter @avandar/ava-cli test
```

---

## F27: Pipeline runs pace their writes to the database and retry transient failures

**Purpose:** A pipeline run sent fixed-size writes as fast as the database
answered and stopped at the first slow or failed request. On demo (Micro
compute) two HDX runs stopped partway: a 100 MB write ran the database out
of memory, and later 4 MB writes stalled or timed out once the database fell
behind. Now each crawl has a write throttle (`createWriteThrottle`) that
grows its byte budget after fast writes, halves it and pauses after slow
ones, and after a transient failure quarters it, waits with exponential
backoff, and retries. A Supabase store marks a failure a retry can fix as
`EtlTransientStoreError` (no response, 408, 429, 5xx, statement or lock
timeout, connection errors). Reads, write batches, checkpoint reads and
writes, the drive row, and the run's history all retry. A failed batch is
retried from the same listing, so every listing is written once and in
order. `ava pipeline run` prints each retry and slow write. **Value:** A
slow database slows a run down instead of stopping it, the database is not
pushed into a crash, and no data is lost: only the 8th transient failure in
a row stops a crawl, with its checkpoint intact. Design:
`docs/measles-demo/etl-adaptive-write-throttle.md` (goes with F9).

**PR title:** `feat(etl): pace pipeline writes to the database and retry transient failures`

**Depends on:** F4 (the listings store and `loadRelationsPage`), F11 (the
progress events it adds a stage to), and F23 (whose 4 MiB cap it replaces).

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `4dc0c52d5` | feat(etl): mark store failures a retry can fix as EtlTransientStoreError | All of it |
| `d9f53c30b` | feat(etl): pace store writes to the database and retry transient failures | All of it |
| `59ded1ac8` | feat(ava-cli): print when a pipeline run slows its writes or retries one | All of it |
| `aa5eefaa6` | fix(etl): retry a crawl's drive row write when it fails transiently | All of it |
| `0a828d45c` | fix(etl): retry run history writes that fail transiently | All of it |
| `2a627e438` | docs(etl): describe how pipeline runs pace writes and retry failures | `MIXED`: `apps/pipeline-server/README.md` goes here. `docs/measles-demo/etl-adaptive-write-throttle.md` goes with F9. |

**Files:** `packages/node/etl/src/EtlEngine/writeThrottle/`,
`packages/node/etl/src/stores/EtlTransientStoreError.ts`,
`throwOnSupabaseError/` and its new test, the four `Supabase*Store` files
(each passes the response `status`), `createNeverFatalExecutionStore/`,
`loadRelationsPage/`, `crawlScope/crawlScope.ts`, `createEtlEngine/`,
`createRunProgressReporter/`, `recordRunExecution/createRunExecutionRecorder.ts`,
`crawlMetrics/crawlMetrics.ts` (`SYSTEM_CLOCK.sleep`), `EtlEngine.types.ts`
(`EtlClock.sleep`, the `write_throttled` stage), `src/index.ts`, and the
`@avandar/etl` README; `apps/ava-cli/src/PipelineCli/PipelineRunProgress/`;
and the pacing paragraph of `apps/pipeline-server/README.md`.

**Schema:** none.

**Verification:**
```sh
pnpm --filter @avandar/etl test
pnpm --filter @avandar/pipeline-server test
pnpm --filter @avandar/ava-cli test
pnpm exec tsc -b --force --noEmit
pnpm build:ava-cli
```
Then, on a switched local stack only, give the role PostgREST connects as a
short statement timeout, run a pipeline, and re-run it with the timeout
restored: the re-run must write nothing and find every listing unchanged.
```sh
psql "$LOCAL_DB_URL" -c "alter role authenticator set statement_timeout = '60ms'" \
  -c "select pg_terminate_backend(pid) from pg_stat_activity where usename = 'authenticator'"
ava pipeline run hdx --local --scope format:csv --since 2026-10-14T00:00:00Z --until 2026-11-01T00:00:00Z --limit 400
psql "$LOCAL_DB_URL" -c "alter role authenticator set statement_timeout = '8s'" \
  -c "select pg_terminate_backend(pid) from pg_stat_activity where usename = 'authenticator'"
ava pipeline run hdx --local --scope format:csv --since 2026-10-14T00:00:00Z --until 2026-11-01T00:00:00Z --limit 400
```

**Follow-ups, not done here:**
- Under a statement timeout far below the 2 s slow-write line, the budget
  saws between failing and recovering, since each fast write grows it
  back. A hosted database's 8 s timeout makes the slow-write path act
  first, so this was left as is.
- Waits for the drive row and the run history are retried but not
  reported as progress, since no crawl has started yet or every crawl has
  ended.

---

## F29: API-backed listing copies expire, so workspaces see a changed source

**Purpose:** A Parquet copy of an API-backed listing (F25) that was current
when a workspace loaded it had no max age, so the workspace never asked the
`parquet-cache` route again and kept the old rows until IndexedDB evicted
them. A current copy now expires after
`GlobalAppConfig.timing.openDataCopyMaxAgeMs` (15 minutes); a stale one
still expires after 5. Copy parts are uploaded with a one-year
`cacheControl`, since each build writes its own folder, so re-checking an
unchanged copy reads its parts from the browser cache.
**Value:** Socrata, HDX and GHO datasets pick up source changes within
15 minutes, at the cost of one route call when nothing changed.

**PR title:** `fix(open-data): re-check API-backed listing copies after 15 minutes`

**Commits to read** (from `feat/gho-pipeline`):

| SHA | Subject | Take |
|---|---|---|
| `dc5174b7c` | fix(open-data): re-check API-backed listing copies after 15 minutes | All of it, except `openDataFreshnessRecheckAfterMs` in `GlobalAppConfig.ts`, which goes with F30. |

**Files:** `shared/config/GlobalAppConfig.ts` (`openDataCopyMaxAgeMs`),
`src/clients/qetl/wrappers/DatasetParquetWrapper/DatasetParquetWrapper.ts`
and its test, `src/clients/qetl/wrappers/datasetSourceTypeContract.test.ts`
(comment only), and
`apps/pipeline-server/src/openDataParquetCache/createSupabaseParquetCopyStore/createSupabaseParquetCopyStore.ts`
and its new test (only the upload test and `COPY_PART_CACHE_CONTROL_SECONDS`;
the probe read goes with F30).

**Schema:** none.

**Verification:**
```sh
npx vitest run src/clients/qetl/wrappers
pnpm --filter @avandar/pipeline-server test
```

**Addendum: follow-up commits mapped on 2026-11-10.** Port these with F29.

Add to **Commits to read**:

| SHA | Subject | Take |
|---|---|---|
| `90ecc24f2` | updated lint and formatting | MIXED (formatting only): `DatasetParquetWrapper.ts` and the import order in `createSupabaseParquetCopyStore.test.ts` here. Take the final files. |

---

## F30: WHO GHO pipeline, recommended listings, and listing freshness probes

**Purpose:** Adds the World Health Organization's Global Health Observatory
to the catalog as a drive: each of its 3,091 indicators and 202 dimension
value lists becomes an OData listing (`api_service = 'odata'`) with column
types declared from GHO's schema. Listings can name recommended listings in
the same drive (`companion_listings`), which the catalog detail shows with
why and an Add button, and which the "Dataset added" notification offers to
add too. Pipelines can write a freshness probe onto a listing
(`api_freshness_probe`) that the edge function and copy builder run with no
code per API, and the `parquet-cache` route reuses a listing's last check
for 15 minutes. The copy builder reads JSON sources. Spec:
`docs/measles-demo/gho-pipeline-spec.md`.
**Value:** Measles case counts and every other WHO indicator can be added
to a workspace and joined to country names, without a hardcoded connector.

**PR title:** `feat(open-data): add the WHO GHO pipeline and recommended listings`

**Commits to read** (from `feat/gho-pipeline`):

| SHA | Subject | Take |
|---|---|---|
| `781a48f9e` | docs(open-data): spec the WHO GHO pipeline, recommended listings, and copy freshness | All of it. The `production-plan-world-humanitarian-day.md` and `open-data-catalog-architecture.md` hunks go with F9. |
| `f42fe266e` | docs(open-data): record the GHO spec's decisions | All of it. |
| `905503037` | feat(open-data): store listing companions and freshness probes | All of it. |
| `6dde864dd` | feat(catalog): recommend listings to add together, and say when a listing has no data | All of it. |
| `3f74d5002` | feat(open-data): copy JSON sources, and check freshness by each listing's own probe | All of it. |
| `66be5b816` | feat(pipelines): add the WHO GHO pipeline | All of it. |
| `93382fb3e` | feat(open-data): throttle freshness checks per listing, and sample OData listings | All of it. |
| `a72e8a6c7` | test(catalog): add a recommended listing from the notification after adding an indicator | All of it. |
| `14750a83a` | perf(pipelines): probe GHO indicators eight at a time | All of it. |
| `dc5174b7c` | fix(open-data): re-check API-backed listing copies after 15 minutes | Only `openDataFreshnessRecheckAfterMs` in `GlobalAppConfig.ts` (the rest is F29). |

**Files:** `apps/pipeline-server/pipelines/gho/`;
`supabase/schemas/00.enum.data_catalog_listings__api_service.sql`,
`11.data_catalog_listings.sql`,
`50.rpc_data_catalog_listings__upsert_with_relation_columns.sql`,
`50.rpc_data_catalog_listings__write_parquet_cache.sql`, and the new
`50.rpc_data_catalog_listings__get_companions.sql` and
`50.rpc_data_catalog_listings__record_freshness_check.sql`, with their pgTAP
tests; `shared/connectors/open-data/readFreshnessProbeToken/`,
`readOpenDataFreshnessToken`, `acquireOpenDataColumnTypeSample`,
`openDataErrors.ts` and the two failure-code switches;
`shared/models/data-catalog-listings/DataCatalogListing/`;
`packages/node/etl` (relation companions and probes, the JSON
`ListingDownload` variant); the pipeline server's copy builder
(`convertJsonFileToParquetParts`, probe checks, `copy-too-large`) and the
probe read in `createSupabaseParquetCopyStore`;
`supabase/functions/open-data/requestParquetCache` and `OpenDataRoutes.ts`;
`src/clients/data-catalog-listings/`; the catalog view's
`DataCatalogRecommendedListings/`, `useAddCatalogListing/`,
`useCatalogListingCompanions/`, `getCompanionsToRecommend/`,
`notifyDatasetAdded/`, `DataCatalogListingDetail`,
`DataCatalogUnsupportedNotice` and `DataCatalogView.tsx`;
`fetchCatalogListingPreview`; `tests/e2e/odc-recommended-listings.spec.ts`.

**Schema:** migration `20261109082310_gho_listing_companions_and_freshness_probes.sql`
(regenerate it; it adds an enum value by rename-and-recreate). Regenerate
`shared/types/database.types.ts` and the desktop SQLite mirror.

**Verification:**
```sh
pnpm --filter @avandar/pipeline-server test
npx vitest run packages/node/etl shared/connectors/open-data supabase/functions/open-data shared/models/data-catalog-listings src/views/DataManagerApp/DataImportView src/lib/openData
pnpm test:db
pnpm test:e2e odc-recommended-listings.spec.ts
ava pipeline run gho --local   # about 10 minutes against the real API
```

**Follow-ups, not done here:** the deferred items in the spec's section 9
(paged JSON downloads, cross-drive recommendations, passing join pairs to
chat, a Refresh action for open data datasets, moving CKAN and Socrata onto
listing probes) and P6.13, partitioned live connections.

**Addendum: follow-up commits mapped on 2026-11-10.** Port these with F30.

Add to **Commits to read**:

| SHA | Subject | Take |
|---|---|---|
| `455f1469d` | docs(open-data): mark the GHO spec built and log it as F28 and F29 | MIXED: only `gho-pipeline-spec.md` (status: built, the 55-minute full run, the companions RPC's file name). Its status line names "F28 and F29" and links `pr-feature-log.md`, which stays off `develop`: drop that sentence when porting. The `pr-feature-log.md` hunk is branch-only. |
| `8e50a5047` | updated translations | Regenerate (the recommended listings and "no data" strings). |
| `70a5a9480` | gho pipeline catalog changes | All of it. The catalog preview reads a listing's stored Parquet copy when one exists, so opening it does not call the source API. A CSV or OData listing with no copy reads the column-type sample route. While a column recheck reads the source, the copy stays up and the recheck's rows replace it only if they differ. `fetchCatalogListingPreview` gains `source` (`stored-copy` or `live-sample`) and exports `isCatalogListingSampleFormat`. `useCatalogListingPreview` runs a stored and a live query and takes `isRecheckingColumns`, which `DataCatalogView` passes from the verification status. Adds `useCatalogListingPreview.test.tsx`. Its `gho-pipeline-spec.md` and `odc-parquet-cache-spec.md` hunks describe this and go with it. |
| `90ecc24f2` | updated lint and formatting | MIXED (formatting only): `createSupabaseParquetCopyStore.ts` (the probe read) and the `parquet_cache_check_complete` constraint in `11.data_catalog_listings.sql` here. Take the final files. |

**Files:** add `useCatalogListingPreview/useCatalogListingPreview.{ts,test.tsx}`
and the `isRecheckingColumns` call in `DataCatalogView.tsx`.

---

## F31: Threshold colors (map config version 6)

Status: not started. Built on `feat/gis-threshold-colors`, branched from
`demo/measles` at `b0b9f00b2`. The commits below are all of
`git log --oneline b0b9f00b2..feat/gis-threshold-colors --no-merges`.

**Purpose:** A graduated map layer could only take a preset ramp, so a
choropleth could not say "red below 95%, neutral at or above". Map config
version 6 stores exactly one color per class in `ramp` and an optional legend
label per class in `classLabels`. A preset is now a UI action that rewrites
the colors. Changing the class count resamples them from the preset they came
from, or from the hand-edited colors. New `red`, `redBlue`, and `threshold`
presets and a Reverse button sit next to the ramp select. Each class gets a
swatch with a color picker and a label input. "Highlight values below" sets one
break, applies the threshold preset, and labels the classes `Below 95%` and
`95% or above` (a layer whose values all lie in [0, 1] takes the percent and
stores the fraction). The labels flow into the persisted legend, so the live
map, the PDF, and the embed match. Migration 5 to 6 resamples every saved
graduated ramp to its class count.
**Value:** A "below the 95% herd immunity line" map is two clicks, and any
class can carry its own color and wording.

**PR title:** `feat(gis): threshold colors with per-class colors and labels`

**Depends on:** none for the map half. The `useAddCatalogListing` fix and the
e2e spec need the catalog browser (F19) and Parquet copies (F25), because the
spec adds two open data listings through the UI.

**Commits to read** (from `feat/gis-threshold-colors`; none is `MIXED`):

| SHA | Subject | Take |
|---|---|---|
| `5f4250a84` | feat(gis): resample graduated color ramps to one color per class | All of it: `graduatedColorHelpers.ts`, its `MapLayerModule` export, and the resampling tests. |
| `202c82504` | feat(gis): add per-class legend labels to graduated colors | All of it: `classLabels` on the graduated `ColorSpec` and the fixtures that now carry it. |
| `02d0bd709` | feat(gis): add map config version 6 with one color and label per class | All of it: `AvaMapConfigV6Schema.ts`, the 5 to 6 migration, and the version 6 suites. |
| `0a722b58c` | feat(gis): add red, red-blue, and threshold graduated ramp presets | All of it, including deleting `GraduatedControls.constants.ts`. |
| `4ce3228ba` | style(gis): format graduated ramp presets | All of it. |
| `15f784063` | feat(gis): fit graduated colors to the class count and edit each class | All of it: `graduatedColorUpdates.ts` and `withLayerColor`. |
| `54a354ede` | feat(gis): write custom class labels into the classified legend | All of it. |
| `eb9849e67` | feat(gis): expose the classified value range on the layer view state | All of it. |
| `f1b5167a1` | feat(gis): pick and reverse graduated ramp presets | All of it. |
| `ad57a6aff` | feat(gis): edit each graduated class's color and legend label | All of it: `GraduatedClassList`, `GraduatedClassRow`, and the stylesheet. |
| `27ca7659e` | feat(gis): add the highlight values below shortcut | All of it: `HighlightValuesBelowInput.tsx` and its wiring. |
| `513d3ebca` | fix(gis): store highlight percents without float drift | All of it. |
| `0032f6c3c` | chore(i18n): extract the class color strings | Only the `LayerSymbology.types.ts` doc change. Regenerate the `.po` catalogs, never copy them. |
| `46cfb9346` | fix(catalog): refresh dataset columns after adding a catalog listing | All of it. Bug fix: after "Add to workspace" the dataset's columns were stale until a reload. |
| `6c287ea2c` | fix(gis): keep point geometry column ids stable when aggregating to boundaries | All of it. Bug fix: `findSourceColumnId.ts` keeps the point geometry column ids from changing. |
| `41def8b14` | test(gis): cover a ZIP choropleth legend that reads Below 95% | All of it: the e2e spec, the two Parquet fixtures, and the seeding helper. |
| `304a04257` | fix(gis): let point geometry bindings round-trip through saved map config | All of it. Bug fix: `AvaMapConfigV2Schema.ts` dropped point geometry bindings on save and load. |

**Files:**
- Model: `shared/models/AvaMap/MapLayer/LayerSymbology.types.ts`,
  `MapLayer/MapLayerModule/{graduatedColorHelpers.ts,MapLayerModule.ts}` and
  `__tests__/MapLayerModule.graduatedColor.test.ts`.
- Config version 6: `AvaMapConfig/AvaMapConfig.types.ts`,
  `AvaMapConfigModule/AvaMapConfigModule.{ts,test.ts}`, and under
  `AvaMapConfigSchema/`: `AvaMapConfigV6Schema.ts` (new),
  `AvaMapConfigSchema.ts`, `migrateAvaMapConfig.ts`, and the test folder's
  `v6SchemaSuites.ts` (new), `schemaTestFixtures.ts`,
  `AvaMapConfigSchema.test.ts`, `v4SchemaSuites.ts`, `v5SchemaSuites.ts`.
- Point geometry round trip (`304a04257`): `AvaMapConfigV2Schema.ts` and the
  test folder's `pointGeometrySchemaSuites.ts` (new).
- Presets: `src/views/GisApp/layers/GraduatedRamps/GraduatedRamps.{ts,test.ts}`
  (new), and `GraduatedControls.constants.ts` (deleted).
- Updaters: `src/views/GisApp/layers/MapLayerUpdates/{graduatedColorUpdates.ts
  (new),layerMetaUpdates.ts,MapLayerUpdates.ts}` and
  `__tests__/MapLayerUpdates.graduatedColor.test.ts` (new).
- Rendering: `classifyLayerValues/classifyLayerValues.{ts,test.ts}`,
  `useAvaMapRender/{classifyLayerGeometry.ts,makeLayerRender.ts,
  useAvaMapRender.test.ts}`, and `MapLayerViewState.types.ts`.
- Inspector UI under `src/views/GisApp/panels/LayerInspector/`:
  `ClassificationEditor/{ClassificationEditor.tsx,ClassificationEditor.test.tsx,
  ClassificationColorModeSelect.tsx}`, `GraduatedControls/{GraduatedControls.tsx,
  GraduatedMethodControls.tsx,GraduatedRampSelect.tsx,
  HighlightValuesBelowInput.tsx (new)}`,
  `GraduatedControls/GraduatedClassList/{GraduatedClassList.tsx,
  GraduatedClassRow.tsx,GraduatedClassList.module.css}` (new), and
  `LayerInspectorBody/LayerInspectorFocusedView.tsx`.
- Point aggregation fix (`6c287ea2c`): `DataSection/PointAggregationControls/
  {findSourceColumnId.ts (new),PointAggregationControls.tsx,
  PointAggregationControls.test.tsx,PointCoordinateSelect.tsx,
  PointInputControls.tsx}`.
- Catalog fix (`46cfb9346`): `src/views/DataManagerApp/DataImportView/
  DataCatalogView/useAddCatalogListing/useAddCatalogListing.{ts,test.ts}`.
- Test fixtures and seeding helper (`41def8b14`): `tests/e2e/gis-threshold-colors.spec.ts`,
  `tests/e2e/helpers/seedOpenDataListingCopy.ts` (writes a local Parquet file
  into the `opendata` bucket as a listing's copy, so the spec needs no
  network), the `tests/e2e/helpers/constants.ts` additions, and
  `tests/data/gis-threshold-colors/{modzcta-manhattan,
  school-immunization-manhattan}.parquet`. Port the Parquet files as binaries.
- Fixtures that gained `classLabels` (inside the commits above):
  `getResolvedMapLayerMetadata.test.ts`, `MapLayerUpdates.classification.test.ts`,
  `MapLayerUpdates.symbology.test.ts`, `makeLayerSpecFromMapLayer.fill.test.ts`.
- `src/i18n/locales/*/messages.po`: regenerate with
  `pnpm i18n:extract && pnpm i18n:compile`, never copy (`0032f6c3c`).

**Schema:** none. Map config version 6 is stored in the existing `config`
JSON, and the 5 to 6 migration runs on read.

**Verification:**
```sh
pnpm i18n:extract
pnpm eslint shared/models/AvaMap src/views/GisApp
pnpm tsc -b --force
pnpm vitest run shared/models/AvaMap src/views/GisApp src/clients/maps
pnpm vitest run src/views/DataManagerApp/DataImportView/DataCatalogView/useAddCatalogListing
pnpm test:e2e gis-threshold-colors.spec.ts
```

**Addendum: follow-up commits mapped on 2026-11-10.** Port these with F31.

`68ac2ee28` is on `feat/gis-threshold-colors` and in its `81f57a979` merge,
but the section's commit table stops before it.

| SHA | Subject | Take |
|---|---|---|
| `68ac2ee28` | fix(gis): clear class labels when the classification intervals change | All of it. Bug fix: a class label written for one interval stayed on its class after the breaks or the class count changed, so it labeled a different interval. |

**Files:** no additions (`layerMetaUpdates.ts` and
`__tests__/MapLayerUpdates.graduatedColor.test.ts` are already listed).

Note: F117 also edits `ClassificationColorModeSelect.tsx`,
`GraduatedControls.tsx`, and `ClassificationEditor.test.tsx`. Take only
F31's hunks there if F117 is not merged yet.

---

## F32: Places: add real exposure sites to a map

Status: not started. Built on `feat/gis-places`, branched at `959281871`. The
commits below are all of
`git log --oneline 959281871..feat/gis-places --no-merges`.

**Purpose:** A user adds sites to a map by clicking the map, typing
coordinates, or searching an address, and the sites are stored as an ordinary
dataset. A places dataset is a virtual dataset (`datasets__virtual`, flagged
`is_places`) whose `raw_sql` is a typed `VALUES` query. Every edit reads the
rows through `WorkspaceQuerySession`, rewrites `raw_sql`, and drops each cached
copy of the rows so the map, Data Explorer, and charts re-read it. A new
`geocode` edge function proxies address search to Geoapify behind a provider
interface and never logs the query. The "Add a place" tool opens a popover
(dataset, location, form), the Go-to tool offers "Add a place here" on a
coordinate, and the feature inspector edits, moves, and deletes a place.
**Value:** A user plots real exposure sites in under a minute, and buffers,
filters, and dashboards read them like any other dataset.

**PR title:** `feat(gis): add places to a map by click, coordinates, or address`

**Depends on:** none.

**Commits to read** (from `feat/gis-places`; none is `MIXED`):

| SHA | Subject | Take |
|---|---|---|
| `d89306675` | test(places): prove a VALUES virtual dataset loads through QETL | All of it. |
| `18c5e527c` | feat(places): flag virtual datasets as places and add their create RPC | All of it. |
| `e87246716` | feat(places): read is_places on the VirtualDataset model | All of it. |
| `f341e1571` | feat(places): define place rows, the store contract, and the places columns | All of it. |
| `ebfdb24a3` | style(places): format the places model and types | All of it. |
| `07428ecea` | feat(places): validate and normalize place form input | All of it. |
| `7ca7ca38f` | feat(places): add, replace, and remove place rows under a 500-row cap | All of it. |
| `a266f04ae` | fix(places): reject impossible place dates | All of it. |
| `13b8b33e6` | feat(places): write place rows as a typed VALUES query | All of it. |
| `2128f6805` | feat(places): read place rows back from their stored SQL | All of it. |
| `01202ef45` | fix(places): satisfy strict indexing in the date check | All of it. |
| `1f4e0ed46` | feat(places): store places as a rewritable VALUES virtual dataset | All of it. |
| `270ec04ec` | feat(geocode): look up addresses through Geoapify behind a provider interface | All of it. |
| `02dbcfa0c` | fix(geocode): time out and sanitize Geoapify failures | All of it. |
| `99576284b` | feat(geocode): add an address search edge function that never logs queries | All of it. |
| `37afbce81` | fix(ci): keep a demo Geoapify key set outside GitHub | All of it. |
| `a451a2caf` | test(geocode): narrow provider errors for deno check | All of it. |
| `27461b421` | feat(gis): add a place tool mode whose click picks a point | All of it. |
| `2fd2013e8` | feat(gis): hold the place tool's draft in the GIS app state | All of it. |
| `431c77779` | feat(gis): build a bound point layer for a places dataset | All of it. |
| `977754da6` | feat(gis): drop every cached copy of a places dataset after an edit | All of it. |
| `6d2b7bd55` | feat(gis): wire places writes and the place tool controller into the map shell | All of it. |
| `cb65051a0` | fix(gis): do not report a saved place as failed when only the refresh fails | All of it. |
| `d360ace96` | feat(gis): add the place form with exposure window and OSM credit | All of it. |
| `91be74135` | feat(gis): search public addresses for a place, with privacy help and OSM credit | All of it. |
| `846be95b2` | fix(gis): tighten address search links and results semantics | All of it. |
| `5e56afbc9` | feat(gis): add the Add a place tool to the map tool cluster | All of it. |
| `21e1d9064` | fix(gis): anchor the Add a place popover to its tool button | All of it. |
| `2d379041a` | fix(gis): keep the place tool on the location step while datasets refetch | All of it. |
| `0578ef139` | fix(gis): show full address search results | All of it. |
| `e75ad44fb` | feat(gis): title the place tool popover | All of it. |
| `4007ac589` | style(gis): format the place tool test | All of it. |
| `8483a18c6` | feat(gis): turn a Go-to coordinate into a place in one click | All of it. |
| `cf4a00d8a` | feat(gis): edit, move, and delete a place from the feature inspector | All of it. |
| `7e888f8f5` | fix(gis): close the feature inspector after deleting its place | All of it. |
| `1e4fb4114` | fix(gis): keep the place id out of every place table | All of it. |
| `5df59981e` | test(gis): cover adding, searching, editing, and deleting places end to end | All of it. |
| `68bbc6c06` | test(gis): always clean up seeded places maps | All of it. |
| `a4cb2b15d` | docs(gis): record how a tool takes a point the user places | All of it. |
| `a83898e9f` | style(places): format the row edits test | All of it. |
| `e1b652bce` | chore(i18n): extract the place tool strings | All of it. |

**Files:**
- Schema: `supabase/schemas/20.datasets__virtual.sql`,
  `supabase/schemas/70.rpc_datasets__add_places_dataset.sql` (new) and
  `supabase/tests/database/rpc_datasets__add_places_dataset.test.sql` (new).
- Places core: `src/clients/places/**` (new), and `is_places` on
  `shared/models/datasets/VirtualDataset/{VirtualDataset.types.ts,
  VirtualDatasetParsers.ts}`.
- Edge function: `supabase/functions/geocode/**` (new), the
  `[functions.geocode]` block in `supabase/config.toml`, `GEOAPIFY_API_KEY=` in
  `.env.example.edge`, the demo Geoapify key line in
  `.github/workflows/demo.yaml`, and `GeocodeAPI` in
  `src/types/http-api.types.ts`.
- GIS app: `src/views/GisApp/places/**` (new), `MapToolMode.types.ts`,
  `mapToolCursor`, `MapCanvas/useMapToolGestures/**`,
  `useGisApp/useGisAppState.ts`, `GisAppMapShell.tsx`,
  `GisAppMapToolCluster.tsx`, `shell/MapToolCluster/**` (`PlaceMapTool/**`
  new, `GoToMapTool/**`), `panels/FeatureInspector/**`
  (`PlaceFeatureActions/` new, cluster table columns) and
  `panels/LayerInspector/PopupSection`.
- Docs: `docs/design/gis/feature-home-inventory.md`.
- Tests: `tests/e2e/places-values-dataset.spec.ts` and
  `tests/e2e/gis-places.spec.ts`. The second stubs address search in the
  browser, so CI needs no Geoapify key.
- `src/i18n/locales/*/messages.po`: regenerate with
  `pnpm i18n:extract && pnpm i18n:compile`, never copy.

**Schema:** `supabase/migrations/20261109103343_add_places_datasets.sql` and
its desktop twin `apps/desktop/migrations/20261109103343_add_places_datasets.gen.sql`.
Regenerate both with the `supabase-declarative-schema` skill, then
`pnpm db:gen-types` and `pnpm desktop:sqlite:gen-migrations`. Never copy them.

**Secrets:** `GEOAPIFY_API_KEY`. Set it on each Supabase project with
`supabase secrets set GEOAPIFY_API_KEY=<key> --project-ref <ref>` and in
`.env.development.edge` locally, then `pnpm fns:update-env`. Without it,
address search returns an error and click and coordinate entry still work.

**Verification:**
```sh
pnpm i18n:extract
pnpm eslint src/clients/places src/views/GisApp supabase/functions/geocode
pnpm tsc -b --force
pnpm vitest run src/views/GisApp src/clients/places supabase/functions/geocode shared/models
deno check supabase/functions/geocode
pnpm test:e2e gis-places.spec.ts
```

**Addendum: follow-up commits mapped on 2026-11-10.** Port these with F32.

Both are on `feat/gis-places` and in its `99b55870d` merge.

| SHA | Subject | Take |
|---|---|---|
| `a43ee4c48` | fix(gis): keep typed place details when changing the location | All of it. Bug fix: going back to the location step cleared the name and dates already typed. `clearCoordinate` now takes the current values. |
| `da00a84f2` | refactor(gis): share the places layer check and tidy places actions | All of it. |

**Files additions:** `src/views/GisApp/places/getPlacesLayerDatasetId/getPlacesLayerDatasetId.{ts,test.ts}`
(new), and `shell/MapToolCluster/PlaceMapTool/PlaceToolSteps.test.tsx`
(already under `PlaceMapTool/**`).

Note: F119 adds one `app.openLayerSettings()` line to `usePlacesActions.ts`
and its test. Leave it out of F32.

---

## F33: Filter a map layer by another layer, and the feature list (map config version 7)

Status: not started. Built on `feat/gis-filter-by-layer`, branched from
`demo/measles` at `81f57a979`. The commits below are all of
`git log --oneline 81f57a979..feat/gis-filter-by-layer --no-merges`. This
branch carried only F31 in the log, so F33 is the next free number here. If
`demo/measles` already has an F32 or F33, renumber on merge.

**Purpose:** A layer can keep only the features inside another layer's
polygons (for example schools within half a mile of exposure sites).
`MapLayerCommon.spatialFilter` names a polygon-output layer, and map config
version 7 persists it plus a buffer's distance unit and ring label. Every
spatial compile is wrapped once in a filter pass, and latitude/longitude layers
get the same predicate. The buffer tool takes m, km, ft, or mi, can buffer
latitude/longitude layers, labels its rings, and offers to filter another layer
by the new buffer. A layer's menu opens a feature list drawer: rows after the
AOI, time, and spatial filters, sortable, downloadable as CSV, with distance to
the nearest buffered site and its label. Jitter layers show a count only, and
aggregate-only layers offer no list.
**Value:** "Which schools are within half a mile of these sites, and how far
is each?" is one buffer, one filter, and one table.

**PR title:** `feat(gis): filter a map layer by another layer and list its features`

**Depends on:** F31 (map config version 6 is the base for version 7).

**Commits to read** (from `feat/gis-filter-by-layer`; none is `MIXED`):

| SHA | Subject | Take |
|---|---|---|
| `8654bc93f` | feat(gis): add spatial filter and buffer unit and label fields to map layers | All of it. |
| `69af8ce4c` | feat(gis): add buffer unit conversions and geometry kind checks to MapLayer | All of it. |
| `5b079fe06` | feat(gis): detect spatial filter cycles and list filter candidates | All of it. |
| `1a119476f` | feat(gis): add AvaMapConfig v7 with spatial filters and buffer units | All of it. |
| `3ac204a71` | feat(gis): clear dangling spatial filters and insert labelled buffers | All of it. |
| `bff134fd7` | feat(gis): add feature source and spatial filter SQL helpers | All of it. |
| `62999adfc` | refactor(gis): resolve compile metadata from a map layer in the client | All of it. |
| `8f96a6860` | feat(gis): compile map layers with their spatial filter | All of it. |
| `40a11ae9f` | feat(gis): apply spatial filters to latitude and longitude layers | All of it. |
| `a48efb85f` | feat(gis): buffer latitude and longitude layers and label rings | All of it. |
| `e9f13eed4` | fix(gis): never buffer the exact points of a displaced layer | All of it. |
| `1032b913d` | feat(gis): draw map layers through their spatial filter | All of it. |
| `e29e4d9f0` | fix(gis): key filtered layers on their whole filter chain | All of it. |
| `2a5d0bbe4` | feat(gis): define the map layer feature list contract | All of it. |
| `8f8c3e42d` | feat(gis): compile feature list SQL with nearest-site distance | All of it. |
| `949b09b45` | perf(gis): project feature list geometries once before measuring | All of it. |
| `e313d9956` | feat(gis): compile a listable layer as a filtered feature source | All of it. |
| `e6ed4b39d` | feat(gis): fetch a map layer's feature list and feature count | All of it. |
| `32868e6b1` | fix(gis): refuse nearest-site distances from a displaced layer | All of it. |
| `a56919bdd` | feat(gis): let a layer show only features inside another layer | All of it. |
| `002fef777` | fix(gis): let a stale spatial filter be cleared | All of it. |
| `e9525ea37` | feat(gis): buffer in friendly units, label rings, and offer to filter by a buffer | All of it. |
| `d329090ab` | fix(gis): anchor the buffer popover to its tool button | All of it. |
| `9bb38103f` | fix(gis): keep buffer distances within limits in the chosen unit | All of it. |
| `6a2b02de2` | fix(gis): show a buffer's distance in its own unit in the inspector | All of it. |
| `3b38c9149` | fix(gis): keep focus and explain empty targets in the buffer filter step | All of it. |
| `bae548159` | feat(gis): open a layer's feature list from its menu | All of it. |
| `6c5c13fdb` | feat(gis): add the feature list drawer | All of it. |
| `82060dc5b` | fix(gis): close a layer's feature list when the layer is deleted | All of it. |
| `7bb0c99d4` | fix(gis): refetch a feature list only when its result can change | All of it. |
| `e5ab6a793` | fix(gis): keep the buffer tool open while picking from its selects | All of it. |
| `73a136fb9` | feat(gis): show the feature list drawer under the map | All of it. |
| `8efa8a80d` | fix(gis): give geometry-column layers default popup fields | All of it. |
| `0b7e2f726` | fix(gis): keep the legend clear of the layer list when the feature list is open | All of it. |
| `771b78dc7` | test(gis): frame both buffer rings in the feature list screenshot | All of it. |
| `463a4ad4f` | fix(gis): query every source column when a popup shows all fields | All of it. |
| `b210d3bcf` | test(gis): frame the rings before showing a listed feature | All of it. |
| `9856a6b7c` | fix(gis): show a listed feature in place of the list, with a way back | All of it. |
| `e9aaebffc` | fix(gis): name feature list rows by a name-like column | All of it. |
| `33f87025a` | fix(gis): count a layer's areas as areas in the layer list | All of it. |
| `7608b1fa9` | test(gis): show a listed feature in the list's place and come back | All of it. |
| `e89152e5e` | fix(gis): never widen a displaced layer's popup and never save widened columns | All of it. |
| `5844fdab3` | chore(i18n): extract the filter by layer strings | All of it. |

**Files:**
- Model: `shared/models/AvaMap/MapLayer/` (`GeoBinding.types.ts`,
  `MapLayer.types.ts`, `MapLayer.ts`, `MapLayerModule/`), and
  `AvaMapConfig/` (`hasSpatialFilterCycle`,
  `getSpatialFilterCandidatesFromLayers`, `AvaMapConfigSchema/AvaMapConfigV7Schema.ts`,
  `migrateAvaMapConfig.ts`, `AvaMapConfigModule`, `overlayConfigUpdaters`, and
  the version 7 suites).
- Spatial query client: `src/clients/maps/MapLayerSpatialQuery/` (feature
  source and spatial filter SQL helpers, `compileSpatialFilteredQuery`,
  `getCompileMetadataFromMapLayer`, lat/lng overlay and layer source
  compilers, buffer compiler).
- Feature list client: `src/clients/maps/MapLayerFeatureList/` (contract
  types, SQL compiler, `fetchMapLayerFeatureList`, count, sort, access).
- GIS app: `src/views/GisApp/` (layer updates, `useMapLayersData`, filter
  select in the layer inspector, buffer tool, feature list drawer and state,
  layer menu item, map shell wiring).
- E2E and fixtures: `tests/e2e/gis-feature-list.spec.ts`,
  `tests/data/gis/nyc-exposure-sites.csv`, `tests/data/gis/README.md`,
  `tests/e2e/helpers/constants.ts`.
- `src/i18n/locales/*/messages.po`: regenerate with
  `pnpm i18n:extract && pnpm i18n:compile`, never copy.

**Schema:** none. Map config version 7 is stored in the existing `config`
JSON, and the 6 to 7 migration runs on read.

**Verification:**
```sh
pnpm i18n:extract
pnpm eslint shared/models/AvaMap src/views/GisApp src/clients/maps
pnpm tsc -b --force
pnpm vitest run shared/models/AvaMap src/views/GisApp src/clients/maps
pnpm test:executed src/clients/maps
pnpm test:e2e gis-feature-list.spec.ts
```

**Addendum: follow-up commits mapped on 2026-11-10.** Port these with F33.

All six are on `feat/gis-filter-by-layer` and in its `cd546fdea` merge, after
the section's table was written.

| SHA | Subject | Take |
|---|---|---|
| `913b0b9bc` | fix(gis): offer every site column as a ring label and keep it queried | All of it. Bug fix: the buffer tool offered only queried columns as ring labels, and the label column could drop out of the sites query. |
| `2642310ca` | fix(gis): measure distances from the same sites the rings are drawn around | All of it. Bug fix: nearest-site distance ran on the sites layer's own spatial filter, while its rings are drawn around every site. |
| `fcc1a6469` | test: fix type errors in classification and case detail tests | History, not F33: superseded by `32a16aa59` in the `cd546fdea` merge. See F117. |
| `c542a859d` | fix(gis): never list a layer's geometry or coordinate columns | All of it: `getFeatureListQueryColumns` (new) replaces the inline column choice in `fetchMapLayerFeatureList.ts`. |
| `1de371b42` | test(gis): seed the exposure sites so the feature list spec tests the list | All of it. Port `tests/data/gis/nyc-exposure-sites.parquet` as a binary. |
| `5f934b1ac` | test(gis): run a popup-all layer's widened query once across re-renders | All of it. |

**Files additions:**
- `src/views/GisApp/layers/getBufferLabelColumnsFromMapLayer/getBufferLabelColumnsFromMapLayer.ts` (new).
- `src/views/GisApp/layers/getQueryLayersFromMapLayers/getQueryLayersFromMapLayers.{ts,test.ts}`
  (F33 creates it in `e89152e5e`; F34 and F35 extend it).
- `src/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferMapTool.{tsx,test.tsx}`.
- `src/clients/maps/MapLayerFeatureList/getFeatureListQueryColumns/getFeatureListQueryColumns.{ts,test.ts}` (new).
- `tests/data/gis/nyc-exposure-sites.parquet` (new, binary) and
  `GIS_NYC_EXPOSURE_SITES_PARQUET_PATH` in `tests/e2e/helpers/constants.ts`.

---

## F34: Feature list in the export PDF (map config version 8)

Status: not started. Built on `feat/gis-pdf-feature-list`, branched from
`demo/measles` at `cd546fdea`. The commits below are all of
`git log --oneline cd546fdea..feat/gis-pdf-feature-list --no-merges`, except
the ones that only update this log. If `demo/measles` already has an F34, renumber
on merge.

**Purpose:** The export sheet gains an "Include a feature list" section: pick
a listable layer, its columns, a sort, and a row cap (200 by default, 1,000 at
most). `ExportLayout.featureList` persists the choice in map config version 8,
and is cleared when its layer is removed. At download the PDF runs F33's
feature list query with the on-screen filters, formats cells as the drawer
does, and prints the rows as a table on the pages after the map and any legend
overflow page. The table repeats its header on every page, wraps long cells,
drops columns that do not fit, and opens with a line such as "16 features in
Schools within 0.5 mi of Exposure sites". A note points at the CSV when rows
or columns are cut. Every page carries "Page n of N" and the footer.
**Value:** Field teams get the candidate list in the same PDF as the map,
filtered exactly as on screen, without a separate CSV.

**Design:** `docs/measles-demo/workflow-b-map-features-design.md` §6. Plan:
`docs/measles-demo/workflow-b-f4-pdf-feature-list-plan.md`.

**PR title:** `feat(gis): print a layer's feature list in the export PDF`

**Depends on:** F33 (map config version 7 is the base for version 8, and the
PDF list calls `fetchMapLayerFeatureList` and `formatFeatureListCell`).

**Commits to read** (from `feat/gis-pdf-feature-list`; none is `MIXED`):

| SHA | Subject | Take |
|---|---|---|
| `b1b36a800` | feat(gis): persist an export feature list in map config version 8 | All of it. |
| `3970e3f64` | feat(gis): cap an export feature list at 1,000 rows | All of it. |
| `a6d405596` | feat(gis): clear the export feature list when its layer is removed | All of it. |
| `1e22d6c5b` | feat(gis): word the PDF feature list summary and truncation note | All of it. |
| `f5ba8b0b2` | feat(gis): lay out the PDF feature table across pages | All of it. |
| `cf8108950` | feat(gis): print the feature list pages in the export PDF | All of it. |
| `8222ca084` | fix(gis): keep PDF table columns readable | All of it. |
| `a090f2594` | feat(gis): fetch the export feature list at download time | All of it. |
| `fbc225e45` | feat(gis): fetch the feature list rows when downloading the PDF | All of it. |
| `9ea58f26a` | feat(gis): add feature list defaults and edits for the export sheet | All of it. |
| `f06e989c9` | feat(gis): add "Include a feature list" to the export sheet | All of it. |
| `dd79c5c7b` | fix(gis): name what the PDF feature list counts | All of it. |
| `37aaf0f10` | chore(i18n): extract the PDF feature list strings | All of it. |
| `74d888249` | test(gis): assert the exported PDF carries the feature list pages | All of it. |
| `d649a4496` | fix(gis): offer the same columns in the export sheet as the PDF prints | All of it. |

**Files:**
- Model: `shared/models/AvaMap/AvaMapConfig/` (`ExportLayout.types.ts`,
  `AvaMapConfigValues.ts`, `AvaMapConfig.ts`, `AvaMapConfig.types.ts`,
  `AvaMapConfigSchema/AvaMapConfigV8Schema.ts`, `migrateAvaMapConfig.ts`,
  `AvaMapConfigSchema.ts`, `AvaMapConfigModule/` and `exportLayoutUpdaters/`,
  and the schema test suites and fixtures).
- PDF: `src/views/GisApp/export/` (`getExportFeatureTableCopy`,
  `loadExportFeatureTable`, `composeExportPdf/` with
  `drawExportFeatureTable` and `createPdfTextMeasurer`,
  `useExportPdfDownload`).
- Export sheet: `src/views/GisApp/export/ExportFeatureListConfig/` and
  `src/views/GisApp/export/ExportSheet/` (`ExportSheetFeatureList*.tsx`,
  `updateExportFeatureList.ts`, `ExportSheetControls.tsx`,
  `ExportSheet.tsx`, `updateExportLayout.ts`).
- GIS app: `src/views/GisApp/GisAppMapShell.tsx` and
  `src/views/GisApp/layers/getQueryLayersFromMapLayers/`.
- E2E: `tests/e2e/gis-export-feature-list.spec.ts`.
- `src/i18n/locales/*/messages.po`: regenerate with
  `pnpm i18n:extract && pnpm i18n:compile`, never copy.

**Schema:** none. Map config version 8 is stored in the existing `config`
JSON, and the 7 to 8 migration runs on read.

**Verification:**
```sh
pnpm i18n:extract
pnpm eslint shared/models/AvaMap src/views/GisApp src/clients/maps
pnpm tsc -b --force
pnpm vitest run shared/models/AvaMap src/views/GisApp src/clients/maps
pnpm test:e2e gis-export-feature-list.spec.ts
pnpm test:e2e gis-export-pdf.spec.ts
```

---

## F35: Map block in dashboards

Status: not started. Built on `feat/dashboard-map-block`, branched from
`demo/measles` at `fc48eb670`. The commits below are all of
`git log --oneline fc48eb670..feat/dashboard-map-block --no-merges`, except
the formatting-only commit and the ones that only update this log. Two merges of
`demo/measles` into the branch carry no changes of their own. If `demo/measles`
already has an F35, renumber on merge.

**Purpose:** A dashboard can hold a Map block. The export sheet's footer gains
"Add to dashboard": pick or create a dashboard and the map is appended as a
Map block, with a link to open it. On a workspace dashboard the block draws the
live map through a read-only `MapViewer` (canvas, legend, attribution, no
panels or tools), and a reader without access to the map or its datasets sees
"You don't have access to this map". Publishing a dashboard to the public
compiles each Map block into a privacy-filtered snapshot instead: one GeoJSON
feature collection per layer plus the map config and legend, written beside the
published datasets. The compile applies the saved AOI, time range, spatial
filters, and sensitivity, keeps only popup columns, refuses names on the
forbidden property list, and displaces points with an HMAC jitter keyed by the
map's secret salt and seeded by the layer, the radius, and each point's own
coordinates, so the same point lands in the same place on every publish. The
salt lives in `map_jitter_salts`, which only map editors can read, through
`rpc_maps__get_or_create_jitter_salt`. It refuses to publish when a map's
filters no longer apply or when the publisher cannot edit the map, and names
the map that blocked it. A reader who cannot edit a map sees the live map
displaced with a throwaway salt. The public page draws the snapshot without
DuckDB or spatial. The share modal warns when shared readers cannot open a
dashboard's map, and the publish preview lists each map layer a public publish
exposes with its feature count.
**Value:** A situation map sits on the dashboard the response team already
reads, live inside the workspace and safe to publish, without a separate
export.

**Design:** `docs/measles-demo/workflow-b-map-features-design.md` §7. Plan:
`docs/measles-demo/workflow-b-f5-dashboard-map-block-plan.md`.

**PR title:** `feat(dashboards): add a map block to dashboards`

**Depends on:** F34 (the export sheet footer holds "Add to dashboard"), F33 (the
snapshot compile reuses the spatial filter query path), and F31 (map config
version 6 threshold colors are part of the legend a snapshot bakes). The
dashboard publish pipeline and `AvaPage` blocks this builds on are not
tracked in this log.

**Commits to read** (from `feat/dashboard-map-block`; none is `MIXED`):

| SHA | Subject | Take |
|---|---|---|
| `e3ae5747e` | feat(dashboards): accept map snapshot paths in the snapshot buckets | All of it. |
| `30a1c1e66` | feat(gis): define the published map snapshot file | All of it. |
| `330e54c04` | feat(dashboards): store map snapshots beside published datasets | All of it. |
| `9624ea09f` | feat(dashboards): clear map snapshots with their snapshot generation | All of it. |
| `fa48af5a7` | refactor(gis): run one layer query outside React | All of it. |
| `25d85e69c` | feat(gis): draw published map snapshots through the layer renderer | All of it. |
| `ec0724ef6` | refactor(gis): apply layer legend updates as a pure function | All of it. |
| `7ccebc416` | feat(gis): compile a map into protected public output | All of it. |
| `35ccfc7da` | feat(gis): salt map displacement with a per-map secret | All of it. |
| `2fa28196e` | fix(gis): publish only what a public map draws | All of it. |
| `d9308a376` | feat(gis): compile a saved map by id for publishing | All of it. |
| `e124d8f4a` | feat(dashboards): read map block settings from a saved dashboard | All of it. |
| `bcb8f2776` | fix(gis): refuse to publish a map whose filters no longer apply | All of it. |
| `a01e65b2d` | feat(dashboards): compile and stage a dashboard's map snapshots | All of it. |
| `01d482e12` | feat(dashboards): publish map snapshots with a public dashboard | All of it. |
| `4591b5355` | feat(dashboards): name the map that stops a dashboard from publishing | All of it. |
| `cec1745e8` | fix(dashboards): wait for every map upload before failing a publish | All of it. |
| `aad4d700d` | refactor(gis): share map hydration and rendering outside the editor | All of it. |
| `8b48a13bc` | test(gis): keep the shared map rendering stable across renders | All of it. |
| `a35f7b898` | feat(gis): add read-only map viewer helpers | All of it. |
| `177135dd0` | fix(gis): keep internal and location fields out of map viewer popups | All of it. |
| `550ceef12` | feat(gis): add a read-only map viewer with live and snapshot modes | All of it. |
| `8a55b9562` | fix(gis): wait for access before drawing a viewer map and close its popup with Escape | All of it. |
| `c7ee91e36` | feat(dashboards): add a Map block to dashboards | All of it. |
| `33e89c633` | fix(dashboards): keep the map popup and block notes inside the block | All of it. |
| `d8b7496fc` | fix(dashboards): keep the map legend clear of the zoom controls | All of it. |
| `ad9faeec1` | fix(gis): scope the map viewer popup keyboard handling | All of it. |
| `f112e664b` | refactor(dashboards): split the map viewer and block config into smaller units | All of it. |
| `13ebfefc7` | feat(gis): add a map to a dashboard from the export sheet | All of it. |
| `b1da1b229` | fix(gis): size the add to dashboard modal like the explorer's | All of it. |
| `a02d200d2` | fix(gis): fit the camera only to layers added in this session | All of it. |
| `a3712257a` | fix(gis): save the camera after an instant fit to a new layer | All of it. |
| `183124966` | feat(dashboards): warn when shared readers cannot open a dashboard map | All of it. |
| `1c3f735fc` | fix(dashboards): count unreadable maps once in the audience warning | All of it. |
| `4557a9d5d` | feat(dashboards): preview each map layer a public publish exposes | All of it. |
| `8efde477a` | fix(dashboards): avoid repeating 'cannot open' in the map audience warning | All of it. |
| `8c2d21839` | fix(dashboards): recompile the publish map preview each time it opens | All of it. |
| `c337161bb` | test(dashboards): cover a map block from export sheet to public page | All of it. |
| `13a441c57` | chore(i18n): extract map block strings | All of it. |
| `ee5bfe961` | fix(maps): keep the jitter salt readable only by map editors | All of it. Replaces `35ccfc7da`'s `maps.jitter_salt` column and migration. |
| `47055e3ea` | fix(maps): seed jitter from each point's own coordinates | All of it. |
| `5bbf3920a` | fix(maps): fail a map snapshot cleanup that storage did not finish | All of it. |
| `59590bf43` | refactor(maps): share one lookup for a map layer column's name | All of it. |
| `bd9b706c7` | fix(maps): key jitter by the displacement radius too | All of it. |

**Files:**
- Storage paths: `supabase/schemas/16.utils.resource-permissions.sql`,
  `src/clients/storage/` (`SnapshotStorageUtils`,
  `PublicDatasetParquetStorageClient`, `PublicMapSnapshotStorageClient`).
- Jitter salt: `supabase/schemas/17.map_jitter_salts.sql` (table, editor-only
  SELECT policy, insert trigger on `maps`),
  `supabase/schemas/50.rpc_maps__get_or_create_jitter_salt.sql`,
  `AvaMapClient.getJitterSalt`, `apps/desktop/sync/syncable-tables.ts`
  (excludes the table from desktop sync), the map route loader
  (`src/routes/_auth/$workspaceSlug/map/$mapId.tsx`), `GisApp` and
  `useGisApp*` (take `jitterSalt`), `LiveMapViewer`,
  `layers/resolveRenderJitterSalt/` (throwaway salt for non-editors).
- Jitter seed: `src/views/GisApp/layers/buildJitterSeed/` (layer, radius, and
  coordinates), `jitterCoordinate/` (`jitterCoordinate`, `buildHmacSha256`),
  `displaceSpatialFeatures`, and `makeFeatureCollectionFromRows`.
- Snapshot compile: `src/clients/maps/MapSnapshot/` (`MapSnapshot.types.ts`,
  `MapSnapshotJson/`, `MapSnapshotPublishError.ts`, `compileMapSnapshot/`,
  `applySnapshotSensitivity`, `cutSnapshotFeatureProperties`,
  `getForbiddenMapPropertyNames`, `getMapLayerColumnNameById/`,
  `createMapSnapshotFromMapId/` (reads the salt, refuses a non-editor),
  `createPublicMapConfigFromMapConfig/`, `getMapSnapshotLayerSummaries/`,
  `getDatasetIdsFromMapConfig/`).
- Publish: `src/clients/dashboards/DashboardClient/` (`publishDashboard.ts`,
  `dashboardMapSnapshots/`, the transition fixtures and snapshot tests) and
  `DashboardMapBlocks/`.
- Shared rendering: `src/views/GisApp/layers/` (`runMapLayerQuery`,
  `useMapLayersData`, `useMapLayerRendering`, `useAvaMapRender`,
  `createMapOverlayFromMapConfig`, `makeFeatureCollectionFromRows`,
  `PersistedLayerLegends`, `createLayerGeometryCache`,
  `MapLayerDataResult.types.ts`), `useHydratedMapSources/useHydratedMapConfig.ts`,
  and `useGisApp/useGisAppRendering.ts`.
- Viewer: `src/views/GisApp/MapViewer/` (`MapViewer` with its live and
  snapshot variants, frame, furniture, legend, popup card, state,
  `getMapViewerPopupFromClick`, `useMapInteractionMode`,
  `useMapViewerPopupKeyboard`, `createSnapshotLayerQueryStates`,
  `mapViewerCameraToViewState`).
- Dashboard block: `src/views/DashboardApp/AvaPage/` (`AvaPage.types.ts`,
  `pblocks/MapPBlock/`, `pfields/MapPickerPField`, `pfields/MapViewPField`,
  `useDashboardPuckConfig.tsx`).
- Share modal: `src/views/DashboardApp/DashboardShareModal/`
  (`DashboardMapAudienceAlert`, `getLimitedAudienceMapNames`,
  `useLimitedAudienceMapNames`, `PublishMapLayersPreview`,
  `PublishMapLayersList`, `PublishingSection.tsx`,
  `usePublishDashboardMutation`).
- Add to dashboard: `src/views/GisApp/export/ExportSheet/ExportSheet.tsx`
  and `src/views/GisApp/export/AddMapToDashboardModal/`
  (`AddMapToDashboardModal`, `useAddMapToDashboard`,
  `MapPBlockDashboardConfigs`).
- GIS fixes: `src/views/GisApp/GisAppMapShell.tsx`,
  `layers/FitBoundsRequest/` (fit the camera only to layers added this
  session), `MapCanvas/useMapViewSync/` (save the camera after an instant fit).
- E2E and test fixtures: `tests/e2e/dashboard-map-block.spec.ts`,
  `supabase/tests/database/dashboards/storage_map_snapshot_paths.test.sql`,
  `supabase/tests/database/permissions/rls_map_jitter_salts.test.sql`,
  `exact_data_api_grants.test.sql` (the new table's grants), and the
  `jitterSalt` arguments the GIS fixtures and tests pass.
- `src/i18n/locales/*/messages.po`: regenerate with
  `pnpm i18n:extract && pnpm i18n:compile`, never copy.

**Schema:** two migrations. Regenerate both, never copy:
`supabase/migrations/*_dashboard_map_snapshot_paths.sql` teaches
`util__storage_object_dashboard_id` and its sibling path parser the
`revisions/<rev>/maps/<uuid>.json` shape, so the existing storage policies
cover map files. `supabase/migrations/*_add_map_jitter_salts.sql`
(`20261109225409` on the branch) creates `map_jitter_salts`, its editor-only
policy, the insert trigger on `maps`, and
`rpc_maps__get_or_create_jitter_salt`. It needs no backfill: the RPC creates a
salt the first time an editor reads one for an older map. Regenerate
`shared/types/database.types.ts` with `pnpm db:gen-types` and the desktop
SQLite migration with `pnpm desktop:sqlite:gen-migrations`.

**Verification:**
```sh
pnpm i18n:extract
pnpm eslint shared/models/AvaMap src/views/GisApp src/views/DashboardApp src/clients/maps src/clients/storage src/clients/dashboards
pnpm tsc -b --force
pnpm vitest run src/clients/maps src/clients/storage src/clients/dashboards src/views/GisApp src/views/DashboardApp
pnpm test:db
pnpm test:e2e dashboard-map-block.spec.ts
```

**Addendum: follow-up commits mapped on 2026-11-10.** Port these with F35.

| SHA | Subject | Take |
|---|---|---|
| `6750ada0a` | chore: format map viewer popup test | All of it (formatting only, `MapViewer/getMapViewerPopupFromClick/getMapViewerPopupFromClick.test.ts`). This is the formatting-only commit the section's status line leaves out. |
| `be7486e01` | fix(gis): satisfy stylelint in MapViewer styles | All of it. Committed directly on `demo/measles`. Bug fix: `pnpm lint:css` rejected MapLibre's class name and the rule order in `MapViewer.module.css`. |

**Files:** no additions (`src/views/GisApp/MapViewer/` is listed).
**Verification addition:** `pnpm lint:css`.

### Correction to the Branch coverage checklist

In "From `fix/measles-followups`", the `665aebff0` line says "Port it with
whichever PR carries `4de947922`". That PR is F119. `4de947922` was committed
directly on `demo/measles` and no feature owned it until now.

---

## F36: Hide the Get started checklist while a drawer is open

Status: not started. Built on `fix/measles-followups`, branched from
`demo/measles`.

**PR title:** `fix(nux): hide the Get started checklist while a drawer is open`

**Depends on:** none.

The Get started checklist sits above modals on purpose, so tour text stays
readable. That also put it above every Mantine `Drawer`, and in the bottom
right corner it covered the footer of right-side drawers: the map Export
sheet's "Download PDF" and "Add to dashboard", the plugin drawer, the
workspace user permissions drawer, and the data catalog filters drawer. The
checklist and its collapsed "Get started" button now hide while any drawer is
open and come back when it closes.

| Commit | Subject | What to take |
|---|---|---|
| `64291f509` | fix(nux): hide the Get started checklist while a drawer is open | All of it. |

**Files:**
- `src/config/Theme/Theme.ts`: gives every Drawer root a marker class at
  theme level, so drawers that pass their own `classNames` keep theirs.
- `src/components/Nux/NuxChecklistPanel/*`: a shared `createDialogPresence`
  factory (the modal detection, lifted unchanged) and a drawer presence store
  built on it. The checklist panel and dock button hide while a drawer is open.
- `docs/app-shell-nomenclature.md`: the checklist entries describe the new
  behavior.

**Verification:** `pnpm vitest run src/components/Nux src/config/Theme`,
`pnpm test:e2e nux-first-milestone.spec.ts`, and opening the map Export sheet
with the checklist showing: its footer buttons must be clickable.

## Notes for ETL engine and pipelines (F37 to F56)

All 152 commits were made directly on `demo/measles` between F7's
`f78be622b` (2026-10-19) and F11's `f2db070a7` (2026-10-22), with no merge in
between (`git rev-list --first-parent --count 127b6c0d9^..4190870fe` is 152).
So every snapshot `git show <sha>:<path>` named in F37 to F56 holds only
their work on top of F1 to F10. None of it is on `develop`, and no PR exists for any
of it (`gh pr list --state all --limit 60`; open PRs #319 and #320 touch
neighbouring CLI files, see F41 and Open decisions).

---

## F37: Type API-backed Parquet blobs so DuckDB loads them

Status: not started. Committed directly on `demo/measles` on 2026-10-22.
The bug is on `develop` too: `develop`'s `DatasetParquetWrapper.ts` builds
`new Blob([copy])` with no type, and `relationLoading.ts` serves cached
payloads as stored.

**Purpose:** An API-backed listing whose resource is Parquet was wrapped in
an untyped `Blob`, and `registerParquetFile` refuses any blob not typed as
Parquet, so every query on such a dataset failed. The wrapper now types the
blob it builds. The relation cache also re-types a payload it serves, since
the failed loads had already cached untyped payloads.
**Value:** Parquet resources from an open data API load.

**Design:** none.

**PR title:** `fix(qetl): type API-backed Parquet blobs so DuckDB loads them`

**Depends on:** none.

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `130e1bbb7` | fix(qetl): type API-backed Parquet resources so DuckDB loads them | All of it, ported to `develop`'s paths (below). |

**Files:**
- `src/clients/qetl/wrappers/DatasetParquetWrapper/DatasetParquetWrapper.ts` and its test: `_parquetBlobFromBytes` types the blob.
- `src/clients/qetl/QueryMediator/relationLoading.ts` on `develop` (on `demo/measles` the Postgres branch moved it to `relationLoading/RelationLoading.ts`): `_asParquetBlob` in `_readStorageCacheHit`.
- The cache test (`relationLoading/relationLoading.test.ts` in the commit, now `RelationLoading.test.ts`): put it next to `develop`'s `relationLoading.ts` and point its `vi.mock` paths at `develop`'s modules.

**Schema:** none.

**Notes:** F25 later removes `_parquetBlobFromBytes` with the 25 MB relay.
The cache hunk stays.

**Verification:**
```sh
pnpm vitest run src/clients/qetl/wrappers/DatasetParquetWrapper src/clients/qetl/QueryMediator
pnpm type-check
```

---

## F38: `ava pipeline run` waits up to two hours for the server and shows non-JSON server errors

Status: not started. Committed directly on `demo/measles` on 2026-10-20,
inside the F47 and F50 work. Both bugs are on `develop`: its
`sendRunPipelineRequest.ts` reads an error body with `res.json()` and then
`res.text()` (the second read fails on a used stream, so a plain-text error
shows only `HTTP <status>`), and it calls `fetch` with undici's default
300 s headers timeout.

**Purpose:** A pipeline server error that is not JSON is shown as its text,
and a JSON one as its `error` string, reading the body once. The run request
uses its own undici `Agent` with two-hour headers and body timeouts, because
the server answers only when the run ends. `@avandar/ava-cli` gains `undici`
and requires Node 22. **Value:** a long server run no longer fails in the
CLI while the server keeps writing, and a server error says what went wrong.

**Design:** none.

**PR title:** `fix(ava-cli): wait up to two hours for a pipeline server run and show non-JSON errors`

**Depends on:** none.

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `b557227ac` | fix(ava-cli): show a pipeline server error even when it is not JSON | The `_readErrorBody` and `_readJsonErrorMessage` hunk of `sendRunPipelineRequest.ts` and the two `RunPipelineCli.test.ts` cases, ported to `develop`'s simpler file (no run options or report there). Its `runPipelineLocal.test.ts` hunk goes with F47, which creates that test. |
| `25ea2d4c8` | fix(ava-cli): wait up to two hours for a pipeline server run response | The `Agent` hunk of `sendRunPipelineRequest.ts`, the `undici` dependency, and its test, ported the same way. Re-add `undici@^7.30.1` with `pnpm add --filter @avandar/ava-cli`, then restore `pnpm-workspace.yaml`, which `pnpm add` rewrites. |
| `c6c553c16` | chore(ava-cli): require Node 22 to match the repo and undici | All of it (`apps/ava-cli/package.json` `engines`). |

**Files:** `apps/ava-cli/src/PipelineCli/sendRunPipelineRequest.ts`,
`apps/ava-cli/src/PipelineCli/sendRunPipelineRequest.test.ts` (new on
`develop`), `apps/ava-cli/src/PipelineCli/RunPipelineCli/RunPipelineCli.test.ts`,
`apps/ava-cli/package.json`, `pnpm-lock.yaml` (regenerate).

**Schema:** none.

**Verification:**
```sh
pnpm test:ava-cli && pnpm exec tsc --noEmit -p tsconfig.node.json
pnpm --filter @avandar/ava-cli build
```

---

## F39: The pipeline server rejects pipeline names that are not a plain folder name

Status: not started. Committed directly on `demo/measles` on 2026-10-21,
inside the F52 work. The bug is on `develop`: `run/run.ts` builds
`../../../../pipelines/${pipelineName}/run.ts` from the decoded
`:pipelineName` parameter and imports it, so a name such as `../x` reaches a
dynamic import.

**Purpose:** `buildPipelineModuleUrl` builds a pipeline's module URL and
throws `InvalidPipelineNameError` unless the name is lowercase letters,
digits, `_`, and `-`. The run route checks the name first and answers 400 for
it, as it does for bad run options. **Value:** a request can only ever import
a pipeline's own `run.ts`.

**Design:** none.

**PR title:** `fix(pipeline-server): reject pipeline names that are not a plain folder name`

**Depends on:** none.

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `3a9d283d4` | fix(pipeline-server): reject pipeline names that are not a plain folder name | `buildPipelineModuleUrl/buildPipelineModuleUrl.ts` and its test as of this commit, used by `develop`'s `run/run.ts` in place of `_getPipelineModuleURL` (that extraction is `9d87db866`'s, which F52 otherwise carries), plus the run-route hunks and tests of `registerPipelineRoutes.ts`. The `listScopes` route it also guards goes with F52. |

**Files:**
`apps/pipeline-server/src/routes/pipeline-name/buildPipelineModuleUrl/`
(new), `run/run.ts`, `registerPipelineRoutes.ts` and
`registerPipelineRoutes.test.ts`.

**Schema:** none.

**Verification:**
```sh
pnpm test:pipeline-server
```

---

## F40: Index catalog relation columns by listing

Status: not started. Committed directly on `demo/measles` on 2026-10-22.
`develop`'s `catalog_entries__dataset_column` has no index on
`catalog_entry_id` either, though its pipelines delete and re-insert
columns by it.

**Purpose:** `data_catalog_listings__relation_columns` gains an index on
`(catalog_listing_id, display_order)`. A listing's columns are read in
display order, replaced on every write, and deleted by cascade with their
listing, all by `catalog_listing_id`. **Value:** column reads and rewrites
stay fast as the drive index grows to thousands of listings.

**Design:** none.

**PR title:** `fix(db): index catalog relation columns by listing`

**Depends on:** F4 (the table's final name). Merged before F4, the index
goes on `catalog_entries__dataset_column (catalog_entry_id, display_order)`
and F4's hand-written rename migration must rename it.

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `4190870fe` | fix(db): index catalog relation columns by listing | The schema hunk. Regenerate the migration and its desktop mirror. |

**Files:** `supabase/schemas/20.data_catalog_listings__relation_columns.sql`.

**Schema:** regenerate `20261022234346_add_relation_columns_listing_index.sql`
with the `supabase-declarative-schema` skill, and its desktop mirror with
`pnpm desktop:sqlite:gen-migrations`.

**Verification:**
```sh
ava supabase status && pnpm db:reset && pnpm test:db && pnpm desktop:sqlite:check-migrations
```

---

## F41: `ava supabase sql` replaces the `db:sql` scripts

Status: not started. Committed directly on `demo/measles` on 2026-10-19.
`develop` still has `db:sql` and `db:sql-cmd`. Open PR #320
(`refactor/sb-switch-env`) also edits `SupabaseCli.ts` and `package.json`,
and changes how the switch reaches the env files: rebase on it if it merges
first, and check that `SUPABASE_POSTGRES_URL` still names the switched
database.

**Purpose:** `ava supabase sql "<sql>"` runs SQL with `psql -c`, and
`ava supabase sql` with no SQL opens a psql shell, against the database
`SUPABASE_POSTGRES_URL` names, so it follows `ava supabase switch`. It
refuses `--staging`, `--prod`, and any URL whose host is not loopback, and
passes psql's exit code on. The `db:sql` and `db:sql-cmd` scripts, which
hardcoded the shared stack's port 54322, are removed. **Value:** ad hoc SQL
reaches this worktree's stack, never a deployed one.

**Design:** none.

**PR title:** `feat(ava-cli): add ava supabase sql and drop the db:sql scripts`

**Depends on:** none. If F15 (#319) merges first, this PR carries F15's
hunk in `SupabaseSqlCli.ts`: `!AvaEnv.isLocal()`, `getLoadedEnvName()`, and
the help text naming `--env`.

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `5b06704b5` | feat(ava-cli): add ava supabase sql and drop the db:sql scripts | All of it. |

**Files:** `apps/ava-cli/src/SupabaseCli/SupabaseSqlCli/` (new),
`apps/ava-cli/src/SupabaseCli/SupabaseCli.ts` (the `sql` command),
`package.json` (the two removed scripts).

**Schema:** none.

**Verification:**
```sh
pnpm test:ava-cli
pnpm --filter @avandar/ava-cli build && node apps/ava-cli/dist/main.cjs supabase sql "select 1"   # local stack only
```

---

## F42: Retry HTTP 429 with exponential backoff, and use it for HDX

Status: not started. Committed directly on `demo/measles` on 2026-10-20.

**Purpose:** A new `withRetryOnTooManyRequests` mixin for `HttpClientFactory`
retries a request answered with 429, waiting `initialDelayMs` and doubling
the wait after each retry, for APIs that rate-limit without a `Retry-After`
header. It is applied before `withRateLimit`, so each retry is scheduled
through the limiter. The HDX client retries a 429 up to three times, after
5, 10, and 20 seconds. **Value:** a full HDX crawl survives HDX's rate
limiter instead of failing on its first 429.

**Design:** spec `2026-10-20-etl-engine-supabase-load-and-incremental-runs-design.md`
section 4 (HDX rate limit), which goes with F45.

**PR title:** `feat(http-client): retry HTTP 429 with exponential backoff and use it for HDX`

**Depends on:** F2 (`HttpClientFactory` and its mixins, built on F1's
`Mixin` type) and F7 (`createHdxHttpClient`).

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `c1f3ec8b2` | feat(http): retry HTTP 429 with exponential backoff, and use it for HDX | All of it. |

**Files:**
`shared/utils/HttpClientFactory/mixins/withRetryOnTooManyRequests/` (new),
`apps/pipeline-server/pipelines/hdx/createHdxHttpClient/createHdxHttpClient.ts`
and its test (as of `c1f3ec8b2`; F49 adds the 128 MB cap).

**Schema:** none.

**Notes:** F30's `createGhoHttpClient` uses this mixin too.

**Verification:**
```sh
pnpm vitest run shared/utils/HttpClientFactory && pnpm test:pipeline-server && pnpm type-check:deno
```

---

## F43: CKAN and Socrata discovery page oldest-modified first, with timestamps

Status: not started. Committed directly on `demo/measles` on 2026-10-20.

**Purpose:**
- `CkanDiscoveryClient.searchDatasets` reads one page of `package_search`
  sorted by `metadata_modified asc, name asc`, as full datasets with their
  resources. It takes an inclusive `modifiedSince`, an exclusive
  `modifiedBefore`, and an `after` cursor that is a keyset filter on both
  sort fields, so a page of equal timestamps never repeats. The keyset
  filter is required when paging, and a dataset that fails validation is
  skipped without blocking the cursor. `parseCkanTimestamp` reads CKAN's
  naive UTC timestamps, and `createCkanPackageFromWire` is shared with
  `CkanClient`.
- `SocrataDiscoveryClient.search` takes an `order` (for example
  `updatedAt ASC`), returns each result's `createdAt` and `updatedAt`, the
  search's `resultSetSize`, and `skippedResults` for results that failed
  validation, instead of failing the page.

**Value:** a crawl can walk either source oldest-modified first and resume
from a timestamp, which F48 and F49 build on.

**Design:** spec `2026-10-20-...-design.md` sections 4 and 8.4 (goes with F45).

**PR title:** `feat(open-data): page CKAN and Socrata discovery oldest-modified first`

**Depends on:** F6 and F7 (the two discovery clients).

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `41deaa888` | feat(open-data): page CKAN package_search oldest-modified first with a keyset cursor | All of it. |
| `79f908243` | fix(connectors): require the keyset filter and skip invalid CKAN datasets without blocking the cursor | All of it. |
| `e96a8c604` | feat(open-data): order Socrata Discovery results and return timestamps and totals | All of it, including the fixture and destructuring hunks in F6's `enumerateSocrataDrive/` and `makeListingRowFromSocrataResult/` test, which F48 later deletes. |
| `58dc6286c` | fix(connectors): skip malformed Socrata results instead of failing the page | All of it. |

**Files** (as of `58dc6286c`):
- `shared/connectors/open-data/CkanDiscoveryClient/*`, `CkanClient/CkanClient.ts`, `CkanClient/createCkanPackageFromWire/` (new), `parseCkanTimestamp/` (new)
- `shared/connectors/open-data/SocrataDiscoveryClient/*`
- `apps/pipeline-server/pipelines/socrata/enumerateSocrataDrive/*` and `makeListingRowFromSocrataResult/makeListingRowFromSocrataResult.test.ts`: the fixture hunks only

**Schema:** none.

**Verification:**
```sh
pnpm vitest run shared/connectors/open-data && pnpm test:pipeline-server && pnpm type-check:deno
```

---

## F44: API listings name their pipeline, and the high-water mark index

Status: not started. Committed directly on `demo/measles` on 2026-10-20.

**Purpose:** `data_catalog_listings__api_access_complete` forced
`pipeline_name` and `pipeline_run_id` to null on every `api_resource`
listing, so a Socrata or HDX row could not say which pipeline wrote it. The
check now allows them. A new index on
`(pipeline_name, api_base_url, date_of_last_update)` serves the engine's
high-water mark (and later F51's checkpoint seed and F52's scope lookups).
A hand-written migration sets `pipeline_name` to `socrata` on Socrata
listings and to `hdx` on `data.humdata.org` CKAN listings that have none,
and a migration upgrade test replays it and proves it leaves rows that
already name a pipeline alone. **Value:** incremental runs
and `ava pipeline reset` can scope every listing by `pipeline_name`.

**Design:** spec `2026-10-20-...-design.md` section 5.6 (goes with F45).

**PR title:** `feat(db): let API listings name their pipeline`

**Depends on:** F4 (the table and check).

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `13c6454d8` | feat(db): let API listings name their pipeline and index the high-water mark | All of it. Regenerate the migration. |
| `a39b22b35` | docs(db): describe the relaxed pipeline columns accurately | All of it. |
| `63c280dfc` | feat(db): backfill pipeline_name on existing Socrata and HDX listings | All of it. **Hand-written data migration:** port it with a new timestamp after the generated one, and update its entry in `scripts/test-dashboard-publishing-migrations.sh`. |
| `350ffc900` | test(db): prove the pipeline_name backfill leaves claimed rows alone | All of it. |
| `f5ffe8b01` | (F51's types and mirrors commit) | **MIXED (regenerate):** only the two desktop mirrors of this feature's migrations. |

**Files** (as of `350ffc900`):
- `supabase/schemas/11.data_catalog_listings.sql` (`10.` before F23): the relaxed check, the index, the `pipeline_name`, `pipeline_run_id`, and `date_of_last_update` comments
- `supabase/tests/database/data_catalog_listings_access.test.sql`: the new cases
- `supabase/migration-upgrade-tests/data_catalog_listings_pipeline_name.{prelude,assertions}.sql` (new) and their entry in `scripts/test-dashboard-publishing-migrations.sh`
- `shared/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.types.ts`: doc comments only

**Schema:** regenerate `20261020174133_relax_api_listing_pipeline_columns.sql`
with the `supabase-declarative-schema` skill. Hand-port
`20261020174732_backfill_api_listing_pipeline_name.sql`. Regenerate both
desktop mirrors (`pnpm desktop:sqlite:gen-migrations`). `database.types.ts`
does not change (no column changes), but run `pnpm db:gen-types` to confirm.

**Verification:**
```sh
ava supabase status && pnpm db:reset && pnpm test:db && pnpm db:gen-types && pnpm desktop:sqlite:check-migrations
supabase test db supabase/tests/database/data_catalog_listings_access.test.sql
```

---

## F45: The ETL engine owns the Supabase load

Status: not started. Committed directly on `demo/measles` on 2026-10-20.
`develop` has the module-based `EtlEngine` (`EtlEngine.ts`,
`EtlEngine.test.ts`) and WDI's hand-written `catalogOpenDataInsert.ts`.

**Purpose:** `@avandar/etl` becomes a library for pipelines whose load lands
in Supabase, in the connector vocabulary (drive, connection, relation).
`EtlEngine.create` takes one config: `listDrives` and `getDriveKey`,
`extract` (pages of connections for a run window), `getConnectionId`,
`transform` (each connection to zero or more relations: an `api_resource`
listing or a `pipeline_parquet` CSV), a Supabase destination (URL, service
role key, listings and relation columns tables, bucket), and optional
`incremental` config (`getConnectionTimestamp`). `run({ mode, since, until,
limit })` crawls each drive oldest first, one page at a time:
- It selects the page's connections, refusing out-of-order or invalid
  timestamps (`OutOfOrderConnectionError`), and applies the window and the
  limit. A connection that reappears at the same timestamp is dropped, one
  modified mid-crawl is processed again.
- It builds each relation's contract row and skips rows that equal the
  stored ones, compared the way Postgres stores them.
- It converts, hashes, and uploads Parquet relations, re-uploading when the
  bucket or path changes.
- It writes only changed rows and their relation columns, repairing columns
  a failed write left behind.
- An incremental run starts each drive at its high-water mark, the newest
  `date_of_last_update` the drive's rows hold, ignoring future-dated rows.

A failed drive is reported without stopping the others. When every drive
fails, `run()` throws `EtlRunFailedError` carrying the report and each
drive's error. Invalid options throw `EtlRunOptionsError` before any drive is
listed. In-memory and Supabase listings and object stores implement the
engine's stores, and a `test:supabase` suite runs the Supabase ones against
the local stack. `world-bank__wdi` moves onto the engine, which now writes
its listings, relation columns, and Parquet objects, and a limited run copies
only the CSVs it uses. **Value:** pipelines stop hand-coding their load, any
run can resume after a cancel or `--limit`, and every later pipeline feature
here builds on it.

**Design:** `docs/superpowers/specs/2026-10-20-etl-engine-supabase-load-and-incremental-runs-design.md`
and `docs/superpowers/plans/2026-10-20-etl-engine-supabase-load-and-incremental-runs.md`.
Both go in this PR (final files). They also describe F42 to F44 and F46 to
F50.

**PR title:** `feat(etl)!: replace the module-based EtlEngine with an engine that owns the Supabase load`

**Depends on:** F1 (`develop`'s `EtlEngine` is built on F1's factory, which
this replaces), F4 (the listings tables), F10 (`getOptionalEnvVar` and
WDI's `run(options)`), and F44 (the engine writes `pipeline_name` on API
rows, reads F44's index, and its Supabase suite needs the relaxed check).

**Commits to read** (none is `MIXED` unless marked):

| SHA | Subject | Take |
|---|---|---|
| `250e388e6` | docs(etl): spec engine-owned Supabase load and incremental pipeline runs | The final spec. |
| `e5614e292` | docs(etl): give every spec behavior a named test and record default decisions | The final spec. |
| `0b31621e2` | docs(etl): settle the spec details the implementation plan depends on | The final spec. |
| `1466a40ad` | docs(etl): add the implementation plan for engine-owned loads and incremental runs | All of it. |
| `51e82a6ed` | feat(etl): add the engine's public types, output contract, and in-memory stores | All of it. |
| `96ec5db4e` | test(etl): make the in-memory stores behave like Postgres | All of it. |
| `e098ed325` | feat(etl): resolve each drive's run window from mode, since, and high-water mark | All of it. |
| `d3ae27ade` | feat(etl): build contract rows from relations and detect unchanged rows | All of it. |
| `f34df03d6` | fix(etl): compare listing metadata the way Postgres stores it | All of it. |
| `b67c03152` | feat(etl): build, hash, and upload Parquet relations with engine metadata | All of it. |
| `926777301` | fix(etl): re-upload Parquet when its bucket or path changes | All of it. |
| `e7d4d3a97` | feat(etl): load one page of relations, writing only rows that changed | All of it. |
| `3669c70bc` | fix(etl): repair relation columns that a failed write left behind | All of it. |
| `1d543718b` | feat(etl): select a page's connections, enforcing order, window, and limit | All of it. |
| `4d845cbbc` | fix(etl): refuse connections whose timestamp is not a valid date | All of it. |
| `d31be0613` | feat(etl): add Supabase-backed listings and object stores with an integration suite | All of it. |
| `7934e1d10` | fix(etl): read every matching listing and harden the Supabase stores | All of it. |
| `32d952e8d` | feat(etl): crawl drives page by page and run incrementally from the high-water mark | All of it. |
| `447a923c5` | fix(etl): keep drive errors and validate the run limit | All of it. |
| `0e9d22567` | fix(etl): protect the high-water mark from reappearing and newer relations | All of it. |
| `60a12a7be` | feat(etl)!: replace the module-based EtlEngine with an engine that owns the Supabase load | All of it. |
| `162f89fd4` | fix(pipelines): convert uppercase WDI CSVs and treat blank destination env as unset | All of it. |
| `cefa9b6bc` | docs(etl): document the engine's run modes and output contract | All of it. |
| `22ec45482` | chore(etl): drop the unused @avandar/modules dependency | All of it. Regenerate `pnpm-lock.yaml`. |
| `e29c2f497` | docs(etl): correct how gaps and column sets are repaired | All of it. |
| `ed6632628` | docs(etl): make the usage example self-contained | All of it. |
| `0654d32fb` | (F47's run options commit) | **MIXED:** only its `packages/node/etl/**` hunks: `EtlRunOptionsError` and the engine's option checks in `createEtlEngine` and its test, and the `index.ts` export. |
| `83eb49cde` | docs(etl): record the decisions made while implementing the spec | The final spec. |
| `27b983170` | fix(etl): ignore future-dated rows when reading the high-water mark | All of it. |
| `b1a48ef06` | refactor(etl): share error names, the chunk helper, and the Parquet path | **MIXED:** its `packages/node/etl/**` hunks here. Its `getEtlRunFailedReport.ts`, `registerPipelineRoutes.ts`, and `scripts/runPipelineOnce.ts` hunks go with F50. |
| `2660c1b71` | fix(pipeline-server): copy only the WDI CSVs a limited run uses | All of it. |

**Files:** port each file as it stands at the SHA given, not its final
state. Every later A feature extends these files.
- `packages/node/etl/**` as of `b1a48ef06`:
  - `package.json` (`test:supabase`; `@avandar/modules` dropped), `vitest.config.ts` (excludes `*.supabase.test.ts`), `vitest.supabase.config.ts` and `vitest.supabase.setup.ts` (new), `README.md`
  - `src/EtlEngine/`: `EtlEngine.ts` (rewritten), `EtlEngine.test.ts` (deleted), new `EtlEngine.types.ts`, `EtlRunFailedError.ts`, `EtlRunOptionsError.ts`, `OutOfOrderConnectionError.ts`, `etlFileHelpers.ts` and test, `etlPaths.test.ts`, `transformedCsvsToParquetBlobs.test.ts`, and the folders `createEtlEngine/`, `crawlDrive/` (F51 renames it to `crawlScope/`), `resolveRunWindow/`, `selectPageConnections/`, `buildListingRowFromRelation/`, `isListingRowUnchanged/`, `prepareParquetRelation/`, `loadRelationsPage/`
  - `src/stores/` (new): `EtlStores.types.ts`, `listingContractColumns.ts`, `assertOneListingKind.ts` (F53 deletes it), `buildListingKeyFromRow/`, `InMemoryListingsStore/`, `InMemoryObjectStore/`, `SupabaseListingsStore/` (`createSupabaseListingsStore.ts`, `__tests__/createSupabaseListingsStore.test.ts`, `__tests__/createSupabaseListingsStore.supabase.test.ts`), `SupabaseObjectStore/`
  - `src/utils/splitIntoChunks/` (new), `src/index.ts`
- `apps/pipeline-server/pipelines/shared/getPipelineEtlDestination/` (new) as of `162f89fd4`
- `apps/pipeline-server/pipelines/world-bank__wdi/`: `createWdiEtlEngine/` (new) as of `2660c1b71`; `getWdiYearCoverageFromCsv/` and `makeWdiParquetRelation/` (new) as of `162f89fd4`; `run.ts` as of `60a12a7be`; `catalogOpenDataInsert.ts` (deleted)
- `apps/pipeline-server/vitest.config.ts` as of `60a12a7be`
- the spec and plan above (final)

**Schema:** none (F44 carries it).

**Notes:**
- `@avandar/etl` is published, so the `!` in the PR title drives a minor
  bump through the auto-changeset step (pre-1.0).
- F1's `EtlEngine.ts` and `EtlEngine.test.ts` hunks are replaced here.

**Verification:**
```sh
ava supabase status   # switched local stack with F44's migrations applied
pnpm --filter @avandar/etl test && pnpm --filter @avandar/etl test:supabase
pnpm test:pipeline-server && pnpm exec tsc -b --force --noEmit
ava pipeline run world-bank__wdi --local --limit 1   # local stack only, with a CSV in WDI's input directory: one Parquet listing and its columns
```

---

## F46: `ava pipeline reset` deletes a pipeline's catalog listings

Status: not started. Committed directly on `demo/measles` on 2026-10-19 and
2026-10-20.

**Purpose:** `ava pipeline reset <name>` deletes the `data_catalog_listings`
rows a pipeline wrote, selected by `pipeline_name`, so the pipeline can run
again from an empty catalog. A hand-curated listing has no `pipeline_name`
and is never selected. It talks to PostgREST with the env file's service
role key, names the database it is about to change (with a warning on
production), asks for confirmation, and when workspaces use some of the
listings asks whether to keep those listings or delete them with their
workspace datasets. **Value:** a pipeline can be re-crawled from scratch
without hand-written SQL.

**Design:** spec `2026-10-20-...-design.md` section 5.9 (goes with F45).

**PR title:** `feat(ava-cli): add ava pipeline reset to delete a pipeline's catalog listings`

**Depends on:** F44 (older API listings get `pipeline_name` only from F44's
backfill). If F15 (#319) merges first, take its `ResetPipelineCli.ts` hunks:
`AvaEnv.getLoadedEnvName()` in `_announceTarget` and the help text naming
`--env`.

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `8d249121c` | feat(ava-cli): add ava pipeline reset to delete a pipeline's catalog listings | All of it, as reworked by the two below. |
| `4c23b1950` | refactor(ava-cli): scope ava pipeline reset by pipeline_name for every pipeline | All of it. |
| `1a9f117b5` | docs(ava-cli): say how ava pipeline reset selects listings | All of it. |

**Files** (as of `1a9f117b5`): `apps/ava-cli/src/PipelineCli/ResetPipelineCli/`
(new: `ResetPipelineCli.ts` and test, `pipelineListingsRest.ts`,
`resetPipelinePrompts.ts`), `apps/ava-cli/src/PipelineCli/PipelineCli.ts`
(the `reset` command).

**Schema:** none.

**Verification:**
```sh
pnpm test:ava-cli
pnpm build:ava-cli && ava pipeline reset socrata   # local stack only: answer no, nothing is deleted
```

---

## F47: `ava pipeline run --incremental`, `--since`, and `--until`

Status: not started. Committed directly on `demo/measles` on 2026-10-20.

**Purpose:** A run takes the engine's run options end to end.
`PipelineRunOptions` becomes `EtlRunOptions` (`mode`, `since`, `until`,
`limit`). `parsePipelineRunOptions` validates them: `since` and `until` are
ISO 8601 with a timezone, `--since` cannot be combined with `--incremental`,
`limit` is a positive integer. The pipeline server's run route accepts
`incremental`, `since`, `until`, and `limit` in its body and answers 400 for
invalid options (and for an `EtlRunOptionsError`). `scripts/runPipelineOnce.ts`
parses the same flags strictly from argv and prints the usage line on a bad
one. `ava pipeline run` gains `--incremental`, `--since`, and `--until` and
passes them to the server or the local runner. **Value:** a run can pick up
only what changed, or a given time window.

**Design:** spec `2026-10-20-...-design.md` section 5.9 (goes with F45).

**PR title:** `feat(pipelines): add --incremental, --since, and --until to ava pipeline run`

**Depends on:** F10 (`--limit` and `parsePipelineRunLimit`, which this
replaces), F38 (its fixes to `sendRunPipelineRequest.ts`), and F45
(`EtlRunOptions`, `EtlRunOptionsError`).

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `0a9635802` | feat(pipelines): accept incremental, since, and until from the server and local runner | All of it. |
| `0654d32fb` | fix(pipelines): reject invalid run options with a 400 and parse flags strictly | **MIXED:** everything except `packages/node/etl/**`, which F45 carries. |
| `84fcad302` | feat(ava-cli): add --incremental, --since, and --until to ava pipeline run | All of it. |
| `b557227ac` | (F38's fix) | **MIXED:** only its `runPipelineLocal.test.ts` hunk (`clearAllMocks`). The rest is F38, and this feature's `sendRunPipelineRequest.ts` snapshot already holds it. |

**Files:**
- `apps/pipeline-server/pipelines/shared/`: `PipelineRunOptions.types.ts` as of `0a9635802`; `parsePipelineRunOptions/` and `readRawPipelineRunOptionsFromArgv/` (new) as of `0654d32fb`; `parsePipelineRunLimit/` (deleted)
- `apps/pipeline-server/src/routes/pipeline-name/registerPipelineRoutes.ts` and test, `run/run.ts` and test, `scripts/runPipelineOnce.ts`, all as of `0654d32fb`
- `apps/pipeline-server/pipelines/{hdx,socrata,world-bank__wdi}/run.ts`: the `run(options = { mode: "full" })` hunks of `0a9635802`
- `apps/ava-cli/src/PipelineCli/`: `PipelineRunRequestOptions.types.ts` (new), `RunPipelineCli/RunPipelineCli.ts` and test, `runPipelineLocal.ts` and `runPipelineLocal.test.ts` (new), `sendRunPipelineRequest.ts`, all as of `b557227ac`. That snapshot predates F38's `Agent` (`25ea2d4c8`): keep F38's `Agent` when replacing the file.

**Schema:** none.

**Verification:**
```sh
pnpm test:pipeline-server && pnpm test:ava-cli && pnpm --filter @avandar/etl test
pnpm build:ava-cli && ava pipeline run world-bank__wdi --local --incremental   # rejected: WDI runs full only
```

---

## F48: The Socrata pipeline crawls on the engine, resumable and incremental

Status: not started. Committed directly on `demo/measles` on 2026-10-20.

**Purpose:** `socrata` stops enumerating every drive into memory and
upserting once at the end. `createSocrataEtlEngine` runs it on F45's engine:
`extractSocrataDrive` pages each configured drive's Discovery results by
`updatedAt ASC` (1,000 a page, offset paging up to Socrata's 10,000 cap),
and `makeApiResourceRelationFromSocrataResult` turns each result into an
`api_resource` relation. Each page reaches 20 results back into the one
before it, so a dataset that moves mid-crawl is not skipped at a boundary;
the overlap is matched on id and update time, and a drive fails (with its
loaded prefix intact) when a page shares nothing with the previous page's
overlap. **Value:** a cancelled, limited, or incremental Socrata run resumes
where it stopped instead of starting over.

**Design:** spec `2026-10-20-...-design.md` section 5.8 (goes with F45).

**PR title:** `feat(socrata): crawl each drive by updatedAt on the engine, resumable and incremental`

**Depends on:** F6 (the pipeline), F43 (ordered Discovery results with
timestamps), F45 (the engine), F47 (`PipelineRunOptions` is `EtlRunOptions`).

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `433d75be8` | feat(socrata): crawl each drive by updatedAt on the engine, resumable and incremental | All of it. Its `configuredDrives.ts` hunk is History once F23 replaces the drive list with `socrata.pipeline.yaml`. |
| `cb0d665c5` | fix(pipelines): fail a Socrata drive when page overlap is lost | All of it. |
| `6413090e2` | fix(pipelines): match Socrata page overlap on id and update time | All of it. |

**Files** (as of `6413090e2`, `run.ts` and `configuredDrives.ts` as of
`433d75be8`): `apps/pipeline-server/pipelines/socrata/`:
`createSocrataEtlEngine/`, `extractSocrataDrive/`,
`makeApiResourceRelationFromSocrataResult/` (new), `run.ts`,
`configuredDrives/configuredDrives.ts`; `enumerateSocrataDrive/` and
`makeListingRowFromSocrataResult/` (deleted).

**Schema:** none.

**Verification:**
```sh
pnpm test:pipeline-server
ava pipeline run socrata --local --limit 20 && ava pipeline run socrata --local --incremental --limit 20   # local stack only: the second run resumes
```

---

## F49: The HDX pipeline crawls on the engine by `metadata_modified`, and the HDX drive is switched on

Status: not started. Committed directly on `demo/measles` on 2026-10-20.

**Purpose:** `hdx` drops `package_list` plus one `package_show` per dataset
(28k requests, which HDX's rate limiter refused) for F43's `package_search`
keyset crawl on F45's engine: `extractHdxDatasets` pages by
`metadata_modified` 100 rows at a time in a loop that releases earlier pages,
`getHdxDatasetTimestamp` reads each dataset's timestamp, and
`makeApiResourceRelationsFromCkanPackage` (renamed from
`makeCkanListingRowsFromPackage`) makes one relation per readable resource.
The HDX client allows 128 MB responses (HDX's per-resource reports make a
100-row page up to 63 MB). A short first page warns only on a crawl from the
start. `HDX_DRIVE` is defined, so the pipeline crawls `data.humdata.org`
(about 280 requests for a full crawl at one per second). F4's shared upsert
(`upsertDataCatalogListingRows`, `DataCatalogListingRow.types.ts`,
`createSupabaseAdminClient.ts`) is deleted, since no pipeline uses it now,
and `CkanDiscoveryClient.listDatasets` goes with it. **Value:** HDX becomes
a drive the catalog can index at all, and resumes like Socrata.

**Design:** spec `2026-10-20-...-design.md` section 5.7 (goes with F45).

**PR title:** `feat(hdx): crawl HDX by metadata_modified with keyset paging, and switch the drive on`

**Depends on:** F7 (the pipeline), F42 (429 retry in the HDX client), F43
(CKAN keyset search), F45, F47, and F48 (until Socrata moves onto the
engine it still calls the shared upsert this deletes).

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `f5ef918fb` | feat(hdx): crawl HDX by metadata_modified with keyset paging, and switch the drive on | All of it. Its `hdxDrive.ts` hunk is History once F23 moves the drive to `hdx.pipeline.yaml`. |
| `7d6ad437d` | fix(hdx): page HDX in a loop so earlier pages are released | All of it. |
| `0653bb018` | fix(hdx): warn about a short first page only on a crawl from the start | All of it. |
| `90c27cf9b` | fix(hdx): page package_search 100 rows at a time with a 128 MB limit | **MIXED:** its `hdx/**` hunks here (`hdxDrive.ts` again History after F23). Its spec hunk is in the final spec F45 takes, and its `connector-nomenclature.md` hunk goes with F9. |

**Files** (as of `90c27cf9b`, `run.ts` as of `f5ef918fb`):
- `apps/pipeline-server/pipelines/hdx/`: `createHdxEtlEngine/`, `extractHdxDatasets/`, `getHdxDatasetTimestamp/`, `makeApiResourceRelationsFromCkanPackage/` (new; its test is the renamed `makeCkanListingRowsFromPackage.test.ts`), `createHdxHttpClient/`, `hdxDrive.ts`, `run.ts`; `makeCkanListingRowsFromPackage/makeCkanListingRowsFromPackage.ts` (deleted)
- `apps/pipeline-server/pipelines/shared/{DataCatalogListingRow.types.ts,createSupabaseAdminClient.ts,upsertDataCatalogListingRows/}` (deleted)
- `shared/connectors/open-data/CkanDiscoveryClient/*` as of `f5ef918fb`

**Schema:** none.

**Verification:**
```sh
pnpm vitest run shared/connectors/open-data && pnpm test:pipeline-server && pnpm type-check:deno
ava pipeline run hdx --local --limit 10   # local stack only
```

---

## F50: Each run's per-drive report, printed by `ava pipeline run`

Status: not started. Committed directly on `demo/measles` on 2026-10-20.

**Purpose:** Every pipeline's `run()` returns the engine's report. The
pipeline server answers `POST /<name>/run` with it as JSON, and
`scripts/runPipelineOnce.ts` prints it on the last line of stdout. When every
drive failed, both still send it (the server as the 500 body, the runner
before exiting 1). `ava pipeline run` reads it with a schema and prints one
line per drive: its window, how many datasets it fetched, and how many
listings it wrote or left unchanged, then each failed drive's error. A run
where every drive failed exits 1 without a stack trace, and a report or error
that cannot be parsed is still shown readably. **Value:** a run says what it
did per drive, and a failure says which drive and why.

**Design:** spec `2026-10-20-...-design.md` section 5.9 (goes with F45).

**PR title:** `feat(pipelines): return each run's per-drive report and print it in ava pipeline run`

**Depends on:** F38 (its `sendRunPipelineRequest.ts` fixes), F47, F48, and
F49 (it changes each pipeline's `run()` as those left it).

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `2c673882b` | feat(pipelines): return each run's per-drive report and print it in ava pipeline run | All of it. |
| `1eaa32e26` | fix(ava-cli): keep the run report and its error readable when parsing fails | All of it. |
| `27501de72` | docs(pipelines): describe engine-owned loading and incremental runs | **MIXED:** only the `apps/pipeline-server/README.md` "Running one pipeline" hunk. Its `docs/measles-demo/` hunks go with F9. |
| `d83a8fc7a` | docs(ava-cli): describe --limit for every pipeline | All of it. |
| `6808d2a5a` | fix(ava-cli): exit 1 without a stack trace when every drive fails | All of it. |
| `b1a48ef06` | (F45's refactor) | **MIXED:** only `getEtlRunFailedReport.ts`, `registerPipelineRoutes.ts`, and `scripts/runPipelineOnce.ts`: they use F45's exported error names. |

**Files:**
- `apps/ava-cli/src/PipelineCli/` as of `c6c553c16`: `PipelineRunReport/` (new: `PipelineRunFailedError.ts`, `PipelineRunReport.schemas.ts`, `printPipelineRunReport.ts`, `readPipelineRunReport.ts`, and their tests), `RunPipelineCli/RunPipelineCli.ts` and test, `runPipelineLocal.ts` and test, `sendRunPipelineRequest.ts` and its test
- `apps/pipeline-server/pipelines/shared/getEtlRunFailedReport/` and `runPipelineAndPrintReport/` (new) as of `b1a48ef06`
- `apps/pipeline-server/src/routes/pipeline-name/registerPipelineRoutes.ts` and test, `run/run.ts`, `scripts/runPipelineOnce.ts`, all as of `b1a48ef06`
- `apps/pipeline-server/pipelines/{hdx,socrata,world-bank__wdi}/run.ts` as of `2c673882b`
- `apps/pipeline-server/README.md`: the `27501de72` hunk

**Schema:** none.

**Verification:**
```sh
pnpm test:pipeline-server && pnpm test:ava-cli
pnpm build:ava-cli && ava pipeline run socrata --local --limit 5   # local stack only: one line per drive
```

---

## F51: Crawl scopes with per-scope checkpoints

Status: not started. Committed directly on `demo/measles` on 2026-10-21 and
2026-10-22.

**Purpose:** The unit of crawling and resuming becomes a **scope**, a named
slice of one drive. A pipeline declares each drive's scopes (the default is
one scope, `all`), and each `(pipeline, drive, scope)` has a checkpoint in a
new service-role-only `pipeline_scope_checkpoints` table, so a scope added
later crawls from the start on its own while the others resume. Every
listing records the scopes that produced it in `pipeline_scope_keys`.
- **Engine:** `resolveDriveScopes` validates each drive's scopes
  (`assertValidScopeKeys`, and two drives may not share a key),
  `selectRequestedScopes` applies a run's `scopes` option, `crawlScope`
  (renamed from `crawlDrive`) crawls one scope, and `checkpointRules` and
  `crawlCheckpoint` decide when a checkpoint advances, so a scope that
  matched nothing still advances. In-memory and Supabase checkpoint stores
  (`throwOnSupabaseError` shared). The report lists one entry per crawl.
- **Sources:** `CkanDiscoveryClient` filters by `resourceFormats`
  (`res_format`), `SocrataDiscoveryClient` by `categories` and `tags`.
- **Pipelines:** HDX crawls `format:csv` and `format:parquet` (`hdxScopes.ts`).
  A Socrata drive may declare category and tag scopes (an empty filter is no
  filter).
- **CLI and server:** a `scopes` run option, `ava pipeline run --scope a,b`,
  and one report line per crawl.
- **Migration:** a hand-written seed records `pipeline_scope_keys` on the
  listings HDX and Socrata already wrote and seeds each drive's checkpoints
  from its newest `date_of_last_update`, so the first scoped run resumes. A
  migration upgrade test replays it against production-shaped listings.

**Value:** adding a format or a category to a pipeline backfills just that
slice, instead of being skipped below the drive's old high-water mark.

**Design:** `docs/superpowers/specs/2026-10-21-etl-crawl-scopes-design.md`
and `docs/superpowers/plans/2026-10-21-etl-crawl-scopes.md` (final files,
in this PR).

**PR title:** `feat(etl)!: crawl and resume each scope of each drive from its own checkpoint`

**Depends on:** F48 and F49 (their pipelines gain scopes) and F50 (the
report becomes per crawl). Merge F52 directly after it.

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `f56586619` | docs(etl): design crawl scopes and per-scope checkpoints | The final spec. |
| `63796aaf7` | docs(etl): plan crawl scopes and per-scope checkpoints | All of it. |
| `6c6f074ea` | feat(db): add per-scope pipeline checkpoints and listing scope keys | All of it. Regenerate the migration. |
| `d40428a5e` | fix(db): name the checkpoints trigger by convention and tighten its tests | All of it. Its migration rename is moot: regenerate. |
| `1175e4f3e` | feat(db): seed scope keys and checkpoints from existing listings | All of it. **Hand-written data migration:** port it with a new timestamp after the generated one, and update its replay entry in `scripts/test-dashboard-publishing-migrations.sh`. |
| `00d000fc7` | test(db): replay the scope seed against production-shaped listings | All of it. |
| `f5ffe8b01` | feat(db): regenerate types and mirror scope keys to the desktop | **MIXED (regenerate):** the model, parser, and fixture hunks and `syncable-tables.ts` here. Regenerate the types and mirrors. Two mirrors belong to F44's migrations and one to F52's. |
| `0fde4531a` | fix(desktop): mirror pipeline_scope_keys with an empty default on existing installs | All of it. Re-key the override in `getManualMigrationBodyFromSourceFile.ts` to the regenerated migration's filename. |
| `fed919f65` | feat(etl): add the checkpoint store contract and an in-memory store | All of it. |
| `53653586f` | feat(etl): add a Supabase checkpoint store | All of it. |
| `442ae47e7` | feat(etl): record the producing scope on every listing row | All of it. |
| `407586af0` | feat(etl): add scope-key validation and checkpoint rules | All of it. |
| `6121f20d3` | test(etl): pin checkpoint and scope-key boundaries, and skip invalid timestamps | All of it. |
| `102ae3680` | feat(etl): resume incremental crawls from stored checkpoints | All of it. |
| `b0034cd31` | feat(etl): crawl and resume each scope of each drive | All of it. |
| `2a202707c` | feat(open-data): search CKAN datasets by resource format | All of it. |
| `30c346e6e` | feat(open-data): search Socrata datasets by category and tag | All of it. |
| `0b17c8011` | feat(pipeline-server): crawl HDX one scope per resource format | All of it. |
| `938b6c562` | feat(pipeline-server): let Socrata drives declare category and tag scopes | All of it. Its `configuredDrives.ts` drive list is History once F23 lands; the `SocrataScope` type survives. |
| `07ac569a0` | feat(pipeline-server): accept a scopes run option | All of it. |
| `37a68d075` | feat(ava-cli): run pipeline scopes and print one report line per crawl | All of it. |
| `8464c8f72` | fix(pipeline-server): treat an empty Socrata scope filter as no filter | All of it. |
| `6c9450fd6` | docs(etl): describe crawl scopes, checkpoints, and pruning | **MIXED:** the `packages/node/etl/README.md`, `configuredDrives.ts`, schema comment, and spec hunks here, and its `apps/pipeline-server/README.md` hunk except the `reset --scope` and `prune-retired-scopes` lines and sentences, which go with F52. Its `docs/measles-demo/` hunks go with F9. |
| `1f105542c` | docs(etl): fix stale scope and checkpoint wording | All of it. |
| `3dd6f9b4a` | docs(etl): prune, not reset, reads live scopes | The final spec. |
| `e76e74fc6` | refactor(etl): call the run window's lower bound a checkpoint | All of it. |
| `b2830c4af` | docs(etl): document deploy order and operator limits for crawl scopes | **MIXED:** the spec hunk here (final spec). The README deploy-order paragraph goes with F52. |
| `ebf121b34` | fix(etl): refuse two drives with the same key | All of it, applied by hand: its `createEtlEngine.test.ts` context at that commit already holds F53 to F55 tests. |

**Files:** port each file as it stands at the SHA given.
- `packages/node/etl/**` as of `e76e74fc6`, plus `ebf121b34`'s hunks in `resolveDriveScopes.ts` and `createEtlEngine.test.ts`. New: `EtlEngine/{assertValidScopeKeys,checkpointRules,crawlCheckpoint,resolveDriveScopes,selectRequestedScopes}/`, `EtlEngine/etlScopes.ts`, `EtlEngine/crawlScope/crawlScope.ts` (renamed from `crawlDrive/crawlDrive.ts`), `stores/{InMemoryCheckpointStore,SupabaseCheckpointStore,throwOnSupabaseError}/`. Changed: `EtlEngine.types.ts`, `EtlRunFailedError.ts`, `OutOfOrderConnectionError.ts`, `createEtlEngine/`, `resolveRunWindow/`, `buildListingRowFromRelation/`, `loadRelationsPage/`, `prepareParquetRelation/`, `stores/{EtlStores.types.ts,listingContractColumns.ts,InMemoryListingsStore/,SupabaseListingsStore/}`, the `isListingRowUnchanged` and `buildListingKeyFromRow` tests, `index.ts`, `README.md`.
- `shared/connectors/open-data/{CkanDiscoveryClient,SocrataDiscoveryClient}/*` as of `30c346e6e`
- `apps/pipeline-server/pipelines/hdx/{createHdxEtlEngine,extractHdxDatasets,makeApiResourceRelationsFromCkanPackage}/` and `hdx/hdxScopes.ts` and test (new) as of `0b17c8011`
- `apps/pipeline-server/pipelines/socrata/{configuredDrives,createSocrataEtlEngine,extractSocrataDrive}/` as of `1f105542c`
- `apps/pipeline-server/pipelines/shared/{getPipelineEtlDestination,getEtlRunFailedReport,runPipelineAndPrintReport,parsePipelineRunOptions,readRawPipelineRunOptionsFromArgv}/`, `apps/pipeline-server/src/routes/pipeline-name/{registerPipelineRoutes.ts,run/run.ts}` with their tests, and `scripts/runPipelineOnce.ts`, all as of `07ac569a0`
- `apps/ava-cli/src/PipelineCli/{RunPipelineCli/,PipelineRunReport/,PipelineRunRequestOptions.types.ts,runPipelineLocal.ts,runPipelineLocal.test.ts,sendRunPipelineRequest.ts,sendRunPipelineRequest.test.ts}` as of `37a68d075`
- DB: `supabase/schemas/10.pipeline_scope_checkpoints.sql` (new), the `pipeline_scope_keys` column and comments in `11.data_catalog_listings.sql`, `supabase/tests/database/pipeline_scope_checkpoints.test.sql` (new), the checkpoints line in `permissions/exact_data_api_grants.test.sql`, `supabase/migration-upgrade-tests/pipeline_scope_seed.{prelude,assertions}.sql` (new) and their `scripts/test-dashboard-publishing-migrations.sh` entry
- Desktop: `apps/desktop/sync/syncable-tables.ts` (`pipeline_scope_checkpoints` excluded), `apps/desktop/scripts/gen-sqlite-migrations/getManualMigrationBodyFromSourceFile.ts` (the override)
- Model: `shared/models/data-catalog-listings/DataCatalogListing/{DataCatalogListing.types.ts,DataCatalogListingParsers.ts}` (`pipelineScopeKeys`), and the fixtures in `DataCatalogListingModule.test.ts`, `DataCatalogListingParsers.test.ts`, and the three `shared/connectors/open-data` tests (`acquireOpenDataResource.test.ts` and `acquireOpenDataResourceWithCache.test.ts` are deleted later by F25)
- `apps/pipeline-server/README.md`: the scopes hunk of `6c9450fd6`
- the spec and plan (final)

**Schema:** regenerate `20261021204651_add_pipeline_scope_checkpoints.sql`
(the table and `pipeline_scope_keys`) with the `supabase-declarative-schema`
skill. Hand-port `20261021211630_seed_pipeline_scope_keys_and_checkpoints.sql`
after it. Regenerate the desktop mirrors; the generated
`pipeline_scope_keys` statement cannot be added to a desktop that already
holds listings, so keep the override. `pnpm db:gen-types`.

**Rollout:** run the migrations before deploying the pipeline server, run no
pipeline while migrating, then rebuild `ava` (`pnpm build:ava-cli`) on every
machine that runs it: an old CLI cannot parse the `crawls` report. Deploy
together with F52.

**Verification:**
```sh
ava supabase status && pnpm db:reset && pnpm test:db && pnpm db:gen-types && pnpm desktop:sqlite:check-migrations
supabase test db supabase/tests/database/pipeline_scope_checkpoints.test.sql
pnpm --filter @avandar/etl test && pnpm --filter @avandar/etl test:supabase
pnpm test:pipeline-server && pnpm test:ava-cli
pnpm vitest run shared/connectors/open-data shared/models/data-catalog-listings && pnpm exec tsc -b --force --noEmit
pnpm build:ava-cli && ava pipeline run hdx --local --scope format:parquet --limit 5   # local stack only
```

---

## F52: `ava pipeline prune-retired-scopes` and `ava pipeline reset --scope`

Status: not started. Committed directly on `demo/measles` on 2026-10-21.

**Purpose:** Removing a scope from a pipeline only stops crawling it. Two
new database functions clean up after it.
`rpc_data_catalog_listings__list_pipeline_scopes` lists each drive's scopes
in the listings and checkpoints. `rpc_data_catalog_listings__prune_pipeline_scope`
removes one scope from one drive or every drive: it deletes listings only
that scope produced, keeps any a workspace uses, detaches the scope from
listings another scope also produces, and deletes its checkpoints. It
returns real row counts, has a dry run, and locks the candidate listings
before its hashed in-use check. The pipeline server answers
`GET /:pipelineName/scopes` with the scopes a pipeline declares today
(`scripts/listPipelineScopes.ts` does the same locally).
- `ava pipeline prune-retired-scopes <name> [--scope] [--dry-run] [--local]`
  compares those live scopes with the database's, prints what each retired
  scope's prune would do, and asks before pruning. It skips a scope whose
  prune would only keep listings workspaces use.
- `ava pipeline reset` now deletes the pipeline's checkpoints before its
  listings, so a failed reset never leaves a checkpoint past deleted
  listings, and `--scope <key>` resets one scope through the prune function.
- Both validate `--scope` as a scope key before any request, and the in-use
  lookup refuses a possibly truncated answer.

**Value:** a pipeline's scopes can change without leaving orphaned listings,
and never at a workspace's expense.

**Design:** spec `2026-10-21-etl-crawl-scopes-design.md` section 5.7 (goes
with F51).

**PR title:** `feat(ava-cli): add ava pipeline prune-retired-scopes and ava pipeline reset --scope`

**Depends on:** F39 (`buildPipelineModuleUrl`), F46 (reset), F51
(checkpoints and scope keys). If F15 (#319) merges first, take its hunks in
`announcePostgrestTarget.ts`, `PruneRetiredScopesCli.ts` (`!AvaEnv.isLocal()`
and the help text), and the reset help text.

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `ad2196653` | feat(db): add RPCs that list and prune a pipeline's scopes | All of it. Regenerate the migration. |
| `63a32c5b7` | fix(db): prune scopes with real row counts, a hashed in-use check, and row locks | All of it. Its migration rename is moot: regenerate. |
| `3eefb63b4` | test(db): cover the every-drive detach and a null dry-run flag in scope pruning | All of it. |
| `9d87db866` | feat(pipeline-server): list a pipeline's live scopes on the server and locally | All of it, except the `buildPipelineModuleUrl/` extraction if F39 already brought it. |
| `3a9d283d4` | (F39's fix) | **MIXED:** only the `listScopes` route's name check in `registerPipelineRoutes.ts` and its tests. The rest is F39. |
| `3e76bc06f` | feat(ava-cli): reset pipeline checkpoints first, and reset one scope | All of it. |
| `54a788cbc` | feat(ava-cli): add ava pipeline prune-retired-scopes | All of it. |
| `180c21dfc` | test(ava-cli): pin reset --scope keep and decline paths | All of it. |
| `1c2f49a4e` | fix(ava-cli): explain unreadable live scopes and cover prune failure paths | All of it. |
| `9faf59ea9` | fix(ava-cli): validate --scope and skip retired scopes only workspaces still hold | All of it. |
| `6c9450fd6` | (F51's docs) | **MIXED:** only the `reset --scope` and `prune-retired-scopes` lines and sentences in `apps/pipeline-server/README.md`. |
| `b2830c4af` | (F51's docs) | **MIXED:** only the README deploy-order paragraph. |

**Files:**
- `apps/ava-cli/src/PipelineCli/` as of `9faf59ea9`: `PruneRetiredScopesCli/` (new: `PruneRetiredScopesCli.ts`, `findRetiredScopes.ts`, tests), `fetchLivePipelineScopes/`, `scopePruneCounts/`, `announcePostgrestTarget/`, `assertValidScopeKey/` (new), `ResetPipelineCli/{ResetPipelineCli.ts,ResetPipelineCli.test.ts,pipelineListingsRest.ts}`, `PipelineCli.ts`; and `apps/ava-cli/vitest.config.ts` (the `node` aliases, for `@etl`)
- `apps/pipeline-server/src/routes/pipeline-name/`: `listScopes/` (new), `registerPipelineRoutes.ts` and test, `run/run.ts`; `apps/pipeline-server/pipelines/{hdx,socrata,world-bank__wdi}/run.ts` (`listScopes` exports), all as of `3a9d283d4`; `scripts/listPipelineScopes.ts` (new)
- `supabase/schemas/50.rpc_data_catalog_listings__list_pipeline_scopes.sql` and `50.rpc_data_catalog_listings__prune_pipeline_scope.sql` (new) as of `63a32c5b7`; `supabase/tests/database/rpc_data_catalog_listings__pipeline_scopes.test.sql` (new) as of `3eefb63b4`
- `apps/pipeline-server/README.md`: the hunks above

**Schema:** regenerate `20261021210723_add_pipeline_scope_rpcs.sql` (both
functions, `service_role` only) with the `supabase-declarative-schema` skill,
its desktop mirror, and `database.types.ts`.

**Verification:**
```sh
ava supabase status && pnpm db:reset && pnpm test:db && pnpm db:gen-types
supabase test db supabase/tests/database/rpc_data_catalog_listings__pipeline_scopes.test.sql
pnpm test:ava-cli && pnpm test:pipeline-server
pnpm build:ava-cli && ava pipeline prune-retired-scopes hdx --local --dry-run && ava pipeline reset hdx --scope format:parquet   # local stack only
```

---

## F53: Each listing and its relation columns are written in one transaction, and Socrata and HDX listings carry their columns

Status: not started. Committed directly on `demo/measles` on 2026-10-22.

**Purpose:** `rpc_data_catalog_listings__upsert_with_relation_columns`
upserts a batch of listings and replaces each one's relation columns in one
transaction, so a crash can no longer leave a listing without its columns.
The engine's listings store calls it through one `upsertListingsWithColumns`
(replacing `upsertRows` and `replaceRelationColumns`), `output.relationColumnsTable`
becomes `output.upsertListingsFunction`, and writes are batched by listing
and column counts. Every API relation must now declare columns, so the two
pipelines learn them:
- **Socrata:** the Discovery API's column lists become relation columns,
  named by field name (what the CSV export's header uses) and cast from
  Socrata's data type. Computed region columns are dropped, and a dataset
  with no other column is not listed.
- **HDX:** columns come from the headers HDX's file structure check
  recorded (`fs_check_info`, read by `readHdxFileHeaders`). When those are
  missing or would not match what DuckDB names the columns,
  `createHdxFileColumnReader` reads them with DuckDB from the file itself (a
  Parquet footer or a CSV sample, HTTPS on the drive only). A resource with
  no readable columns is logged and not listed.

`2c8328f68` read each Socrata dataset's CSV header instead, and `045fb6499`
reverted it because one request per dataset made a 15-dataset crawl take 79
seconds: nothing of the pair is ported. **Value:** API listings arrive with
their columns, atomically, which column verification (F54) builds on.

**Design:** none. The crawl-scopes spec lists API relation columns as
separate work; `apps/pipeline-server/README.md` describes the result.

**PR title:** `feat(etl)!: write each listing and its relation columns in one transaction`

**Depends on:** F51 (the engine and store code these changes sit on).

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `e175b8ab7` | feat(db): upsert catalog listings and their relation columns in one transaction | All of it. Regenerate the migration, types, and desktop mirror. |
| `39cf8f119` | feat(etl)!: write each listing and its relation columns in one transaction | All of it. It does not build alone: the pipelines need the next two. |
| `ae40971ef` | feat(pipelines): write each Socrata listing's columns | All of it. |
| `f0876906e` | feat(pipelines): write each HDX listing's columns | All of it. |
| `2c8328f68` | fix(pipelines): name Socrata columns by the CSV export's header | History: reverted by `045fb6499`. Port nothing. |
| `e094f2afa` | docs(pipelines): describe how Socrata and HDX listings get their columns | All of it. |
| `045fb6499` | fix(pipelines): stop reading each Socrata dataset's CSV header at ingestion | History: an exact revert of `2c8328f68`. Port nothing. |

**Files** (as of `045fb6499`):
- `supabase/schemas/50.rpc_data_catalog_listings__upsert_with_relation_columns.sql` and `supabase/tests/database/rpc_data_catalog_listings__upsert_with_relation_columns.test.sql` (new)
- `packages/node/etl/`: `EtlEngine.types.ts`, `createEtlEngine/`, `loadRelationsPage/`, the `buildListingRowFromRelation` test, `stores/{EtlStores.types.ts,InMemoryListingsStore/,SupabaseListingsStore/}`, `stores/assertOneListingKind.ts` (deleted), `index.ts`, `README.md`
- `shared/connectors/open-data/SocrataDiscoveryClient/*` (column fields), `CkanClient/{CkanClient.schemas.ts,CkanClient.types.ts,CkanClient.test.ts,createCkanPackageFromWire/}`, `CkanClient/readHdxFileHeaders/` (new)
- `apps/pipeline-server/pipelines/socrata/{createSocrataEtlEngine,makeApiResourceRelationFromSocrataResult}/` and the `extractSocrataDrive` test
- `apps/pipeline-server/pipelines/hdx/{createHdxEtlEngine,makeApiResourceRelationsFromCkanPackage}/`, `createHdxFileColumnReader/` and `readHdxResourceColumns/` (new)
- `apps/pipeline-server/pipelines/shared/getPipelineEtlDestination/getPipelineEtlDestination.ts`, the `createWdiEtlEngine` test, `apps/pipeline-server/README.md` (`e094f2afa`)

**Schema:** regenerate `20261022154515_upsert_listings_with_relation_columns.sql`
with the `supabase-declarative-schema` skill, its desktop mirror, and
`database.types.ts`.

**Notes:** F23 caps each write at 4 MiB of JSON (`62ffe547a`) and F27
replaces that cap with its throttle's budget, both on top of this write
loop. Neither removes it.

**Rollout:** deploy the migration before the pipeline server: the new
server calls the function.

**Verification:**
```sh
ava supabase status && pnpm db:reset && pnpm test:db && pnpm db:gen-types && pnpm desktop:sqlite:check-migrations
supabase test db supabase/tests/database/rpc_data_catalog_listings__upsert_with_relation_columns.test.sql
pnpm --filter @avandar/etl test && pnpm --filter @avandar/etl test:supabase
pnpm test:pipeline-server && pnpm vitest run shared/connectors/open-data && pnpm type-check:deno
ava pipeline run socrata --local --limit 5   # local stack only: each listing has relation columns
```

---

## F54: Column type verification: unverified columns are verified in the browser before a listing is added

Status: not started. Committed directly on `demo/measles` on 2026-10-22.
F12 (2026-10-23) rewrites much of it.

**Purpose:** Pipelines often know a column's name but not its type.
`data_catalog_listings.date_column_type_last_verified` records when a
listing's column types were last checked against the source's real data;
a listing is stale when it is older than `date_of_last_update`.
- **Pipelines and engine:** API relations carry `columnTypesVerifiedAt`.
  Socrata columns are written as text with Socrata's type label as the
  original type, HDX header columns as text, both unverified. HDX columns
  read from the file and WDI's Parquet columns are verified when written.
  A relation may have no columns: an HDX CSV with no recorded headers is no
  longer downloaded at ingestion, it is listed with no columns. The change
  check ignores the verification date, and a pipeline rewrite keeps
  verified columns while its own column fingerprint is unchanged.
- **Database:** `rpc_data_catalog_listings__write_verified_column_types`
  replaces a listing's columns with verified types. The upsert function
  keeps verified columns and accepts an empty column list. A new trigger on
  `datasets__open_data` refuses to add a listing whose types are
  unverified. Existing Parquet listings are backfilled as verified.
- **Edge function:** `GET /data-catalog-listings/:id/column-type-sample`
  answers with the first 10,000 rows of a Socrata export or the first 5 MB
  of a CKAN CSV (`readByteRangeOverHttp`), plus a token signed with
  `SB_SECRET_KEY` over its header (`columnTypeSampleToken`).
  `POST .../column-types` writes types the browser inferred, only when the
  column names match the signed header.
- **App:** after an unverified or stale API-backed CSV listing stays open 3
  seconds, `verifyOpenDataColumnTypes` fetches the sample, infers types in
  DuckDB, and posts them. One coordinator runs each listing's verification
  once at a time, shared by the dwell and "Add to workspace", which waits
  for it and saves the verified columns. The detail pane gains a Columns
  section that says when types are being checked or could not be.

**Value:** datasets added from the catalog start with real column types,
not text, and never with columns the source does not have.

**Design:** none. The roadmap's P6.6 (server-side inference, AVA-394) and
P6.7 (one verification at a time, AVA-395) bullets record the follow-ups.

**PR title:** `feat(open-data): verify catalog listings' column types before they are added`

**Depends on:** F52 (one fixture edit lands in its scopes test), F53 (the
upsert function and listings that carry columns), and F8 (the
`OpenDataRoutes.ts` cache wiring the new routes sit next to).

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `865001558` | feat(db): record when a catalog listing's column types were last verified | All of it. Regenerate the column and function migration; hand-port the backfill. |
| `f7d812312` | feat(etl): record whether each listing's column types are verified | All of it. |
| `3eb2b93b4` | feat(pipelines): ingest unknown column types as unverified text | All of it. |
| `4acf51569` | feat(open-data): serve column type samples and accept verified types | All of it. F12 later deletes `parseCsvHeaderLine/` and reworks the sample route. |
| `1adad898f` | feat(open-data): verify a catalog listing's column types after 3 seconds open | All of it. |
| `af962709f` | docs: add server-side column type inference and verification locking to the roadmap | All of it (the P6.6 and P6.7 bullets). |
| `5875b828c` | docs: link the column type roadmap items to their Linear issues | All of it. |
| `12bc34a7c` | feat(db): allow listings with no columns, and add only verified ones to workspaces | All of it. Regenerate the migration. |
| `c8171afa7` | feat(etl): allow a relation with no columns | All of it. |
| `7ed0ede68` | feat(pipelines): list HDX CSVs without headers with no columns instead of reading them | All of it. |
| `3a78453f6` | feat(open-data): show column type checks in the catalog, and wait for them before adding | All of it. |
| `e58ed9d70` | chore(i18n): regenerate catalogs for the catalog column type strings | Regenerate the `.po` catalogs, never copy them. |

**Files** (as of `e58ed9d70`):
- DB: the `date_column_type_last_verified` column in `11.data_catalog_listings.sql`; `50.rpc_data_catalog_listings__write_verified_column_types.sql` (new); `50.rpc_data_catalog_listings__upsert_with_relation_columns.sql`; the trigger in `20.datasets__open_data.sql`; tests `rpc_data_catalog_listings__write_verified_column_types.test.sql` and `datasets__open_data_column_types_verified.test.sql` (new), and the new cases in `rpc_data_catalog_listings__upsert_with_relation_columns.test.sql` and `rpc_data_catalog_listings__pipeline_scopes.test.sql`
- `packages/node/etl/`: `EtlEngine.types.ts`, `buildListingRowFromRelation/`, `isListingRowUnchanged/`, `loadRelationsPage/`, `stores/{EtlStores.types.ts,listingContractColumns.ts,InMemoryListingsStore/,SupabaseListingsStore/}`, the `buildListingKeyFromRow` test, `index.ts`, `README.md`
- `apps/pipeline-server/pipelines/socrata/makeApiResourceRelationFromSocrataResult/`, `hdx/{makeApiResourceRelationsFromCkanPackage,readHdxResourceColumns,createHdxFileColumnReader}/`, the `createHdxEtlEngine` and `createWdiEtlEngine` tests, and `apps/pipeline-server/README.md` (`3eb2b93b4`, `7ed0ede68`)
- `shared/connectors/open-data/acquireOpenDataColumnTypeSample/` and `parseCsvHeaderLine/` (new)
- `supabase/functions/open-data/`: `columnTypeSampleToken/`, `columnTypeVerification/`, `readByteRangeOverHttp/` (new), `OpenDataRoutes.ts`, `OpenDataRoutes.types.ts`
- `src/lib/openData/`: `verifyOpenDataColumnTypes/`, `createColumnTypeVerificationCoordinator/`, `ColumnTypeVerifications.ts` (new)
- `src/views/DataManagerApp/DataImportView/DataCatalogView/`: `useVerifyColumnTypesOnDwell/`, `readCatalogColumnsForAdding/`, `DataCatalogListingColumns/` (new), `DataCatalogView.tsx`, `DataCatalogListingDetail/DataCatalogListingDetail.tsx`
- `shared/models/data-catalog-listings/DataCatalogListing/{DataCatalogListing.types.ts,DataCatalogListingParsers.ts}` (`dateColumnTypeLastVerified`) and the same fixtures as F51
- `docs/production-plan-world-humanitarian-day.md`: the P6.6 and P6.7 bullets
- `src/i18n/locales/*/messages.{po,ts}`: regenerate

**Schema:** regenerate `20261022194116_verify_catalog_listing_column_types.sql`
and `20261022201523_allow_empty_listing_columns_and_require_verified_adds.sql`
with the `supabase-declarative-schema` skill. Hand-port
`20261022194200_backfill_parquet_listing_column_type_verification.sql` (a
data migration) between them. Regenerate the desktop mirrors and
`database.types.ts`.

**Rollout:** deploy the migrations, the `open-data` edge function, and the
frontend together. Existing API listings start unverified, and the new
trigger refuses to add them from a frontend that does not verify first.

**Verification:**
```sh
ava supabase status && pnpm db:reset && pnpm test:db && pnpm db:gen-types && pnpm desktop:sqlite:check-migrations
supabase test db supabase/tests/database/rpc_data_catalog_listings__write_verified_column_types.test.sql supabase/tests/database/datasets__open_data_column_types_verified.test.sql
pnpm --filter @avandar/etl test && pnpm --filter @avandar/etl test:supabase && pnpm test:pipeline-server
pnpm vitest run shared/connectors/open-data shared/models/data-catalog-listings supabase/functions/open-data src/lib/openData src/views/DataManagerApp/DataImportView/DataCatalogView
pnpm type-check && pnpm i18n:check
```
Then open an unverified Socrata listing in the catalog: after 3 seconds its
Columns section shows real types, and "Add to workspace" on another
unverified listing waits for its check before saving.

---

## F55: Pipeline executions: every run is recorded with its invocation, timings, and counts

Status: not started. Committed directly on `demo/measles` on 2026-10-22.

**Purpose:** Two service-role-only tables keep an audit trail.
`pipeline_executions` has one row per pipeline per command: what ran, how it
was invoked (the exact CLI argv or HTTP body, the parsed options, and the
commit), the outcome, wall-clock and stage timings, totals, and the
pipeline's catalog counts afterwards. `pipeline_execution_scopes` has one row
per drive and scope an execution worked on, with its window, checkpoints,
outcome, timings, and the pages, datasets, listings, columns, and bytes that
explain them. Three functions write them (`rpc_pipeline_executions__start`,
`__record_scope`, `__finish`), validating every argument against fixed keys;
`start` fails a pipeline's executions that made no progress for 24 hours.
- **Engine:** a per-crawl metrics recorder with an injectable clock times
  each crawl's stages and counts what they worked on, and a run recorder
  writes the run's start, each crawl, and the outcome through an execution
  store wrapped so recording never fails or slows the run.
- **Pipelines:** server and local runs record their invocation. HDX reports
  resource sizes and Parquet footer reads. The Docker image takes an
  `AVA_CODE_VERSION` build arg.
- **CLI:** `ava pipeline run` sends its invocation (argv, and for a local
  run the checkout's commit) and prints how long each crawl and the run
  took.

Nothing in the app reads the tables. **Value:** "when did this drive last
run", "why did that run take three hours", and "who ran what with which
flags" each become one query.

**Design:** `docs/superpowers/specs/2026-10-22-pipeline-executions-design.md`
and `docs/superpowers/plans/2026-10-22-pipeline-executions.md` (final
files, in this PR).

**PR title:** `feat(etl): record every pipeline run in pipeline_executions`

**Depends on:** F50 (the report it adds durations to) and F54 (its stage
timers wrap the load code F53 and F54 left).

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `17eead07d` | docs(etl): design an audit trail of pipeline executions | The final spec. |
| `5d14ce37a` | docs(etl): plan the pipeline executions audit trail | All of it. |
| `61c32d2cf` | feat(db): add pipeline execution tables | All of it. Regenerate the migration. |
| `714a981b4` | fix(db): constrain pipeline execution scope rows and finish times | All of it. |
| `4417f6cec` | feat(db): add functions that record pipeline executions | All of it. |
| `7fc0c5696` | fix(db): validate arguments to the pipeline execution functions | All of it. |
| `a21527017` | feat(etl): add execution store types and a never-fatal wrapper | All of it. |
| `29d6f2fbf` | fix(etl): make the in-memory execution store match the database functions | All of it. |
| `6ec0ece39` | feat(etl): record executions through the Supabase functions | All of it. |
| `a85a9f299` | feat(etl): add a per-crawl metrics recorder with an injectable clock | All of it. |
| `b4ee3b097` | feat(etl): time each crawl's stages and count what they worked on | All of it. |
| `304711591` | feat(etl): record each run's start, crawls, and outcome | All of it. |
| `34d77ddda` | fix(etl): record the setup time a run spent before listing failed | All of it. |
| `28072f714` | feat(pipelines): record server and local runs with their invocation | All of it. Its README deploy line names `fly.production.toml`, which F25 deletes. |
| `b54f1a9bc` | feat(pipelines): report HDX resource sizes and Parquet footer reads | All of it. |
| `fc3619295` | feat(ava-cli): send the CLI's invocation with every pipeline run | All of it. |
| `316403228` | feat(ava-cli): print how long each crawl and run took | All of it. |
| `0e5e96f06` | fix(ava-cli): round durations at unit boundaries and skip negative ones | All of it. |
| `4bef0f045` | docs(etl): record the pipeline executions planning refinements | The final spec. |
| `599cb5d23` | fix(etl): record the executing checkout's commit, whole-byte sizes, and fix review nits | All of it. |
| `97370f5a1` | fix(ava-cli): read the commit only for a local pipeline run | **MIXED:** `RunPipelineCli.ts`, its test, and `buildCliInvocation/` here. The `recordCliExecution/runRecordedCliCommand.ts` hunk goes with F56. |
| `87eb24b13` | fix(etl): close abandoned executions and tighten pipeline execution constraints | All of it. Regenerate. |

**Files** (as of `87eb24b13`):
- DB: `supabase/schemas/00.enum.{pipeline_executions__command,pipeline_executions__invoked_via,pipeline_executions__run_mode,pipeline_executions__status,pipeline_execution_scopes__status}.sql`, `10.pipeline_executions.sql`, `11.pipeline_execution_scopes.sql`, `50.rpc_pipeline_executions__{start,record_scope,finish}.sql` (all new; F23 renumbers `finish` to `53.` and adds its facet refresh), `supabase/tests/database/pipeline_executions.test.sql` (new), the two tables in `permissions/exact_data_api_grants.test.sql`
- `packages/node/etl/`: `stores/{ExecutionStore.types.ts,executionRecords/,createNeverFatalExecutionStore/,InMemoryExecutionStore/,SupabaseExecutionStore/}` and `EtlEngine/{crawlMetrics,recordRunExecution}/` (new); `EtlEngine.types.ts`, `crawlScope/crawlScope.ts`, `createEtlEngine/`, `loadRelationsPage/`, `prepareParquetRelation/`, `index.ts`, `README.md`
- `apps/pipeline-server/`: `pipelines/shared/readLocalRunInvocation/` and `src/routes/pipeline-name/buildServerRunInvocation/` (new), `registerPipelineRoutes.ts`, `run/run.ts`, their tests, `pipelines/shared/getPipelineEtlDestination/`, the `getEtlRunFailedReport` and `runPipelineAndPrintReport` tests, `pipelines/hdx/{createHdxEtlEngine,makeApiResourceRelationsFromCkanPackage,readHdxResourceColumns}/`, `Dockerfile`, `README.md` ("Execution history" and the deploy line), and `scripts/runPipelineOnce.ts`
- `apps/ava-cli/src/PipelineCli/`: `buildCliInvocation/` (new), `RunPipelineCli/`, `runPipelineLocal.ts` and test, `sendRunPipelineRequest.ts` and test, `PipelineRunReport/{PipelineRunReport.schemas.ts,printPipelineRunReport.ts}` and tests
- `apps/desktop/sync/syncable-tables.ts`: both tables in `EXCLUDED_TABLES`
- the spec and plan (final)

**Schema:** the tables are new on `develop`, so regenerate one migration
from the final schema files (in place of `20261022215809_add_pipeline_executions.sql`,
`20261022220852_add_pipeline_execution_functions.sql`, and
`20261022233029_harden_pipeline_executions.sql`) with the
`supabase-declarative-schema` skill, then its desktop mirror and
`database.types.ts`.

**Rollout:** deploy the migration before the pipeline server, and build the
image with `--build-arg AVA_CODE_VERSION=$(git rev-parse HEAD)` so server
runs record their commit.

**Verification:**
```sh
ava supabase status && pnpm db:reset && pnpm test:db && pnpm db:gen-types && pnpm desktop:sqlite:check-migrations
supabase test db supabase/tests/database/pipeline_executions.test.sql
pnpm --filter @avandar/etl test && pnpm --filter @avandar/etl test:supabase
pnpm test:pipeline-server && pnpm test:ava-cli && pnpm exec tsc -b --force --noEmit
pnpm build:ava-cli && ava pipeline run socrata --local --limit 5   # local stack only: durations print
ava supabase sql "select pipeline_name, status, invoked_via from pipeline_executions order by started_at desc limit 1"   # needs F41
```

---

## F56: `ava pipeline reset` and `prune-retired-scopes` are recorded as executions

Status: not started. Committed directly on `demo/measles` on 2026-10-22.

**Purpose:** `ava pipeline reset` and `ava pipeline prune-retired-scopes`
record themselves in F55's tables through PostgREST
(`createPostgrestExecutionStore`), wrapped by `runRecordedCliCommand`. A
reset notes each delete as it completes, so a reset that fails midway still
records what it deleted. A prune records one scope row per pruned pair,
including a scope whose prune failed, and dry runs, empty prunes, and
declined confirmations are recorded too. Ctrl+C at a prompt records the
command as cancelled and still exits. Each recording call is abandoned after
10 seconds, so recording never hangs a command. **Value:** every command
that changes the catalog leaves a record of who ran it and what it removed.

**Design:** spec `2026-10-22-pipeline-executions-design.md` section 5.7
(goes with F55).

**PR title:** `feat(ava-cli): record pipeline resets and prunes as executions`

**Depends on:** F46 and F52 (the two commands) and F55 (the tables,
functions, and the `@etl` store types the CLI imports).

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `76546c10c` | feat(ava-cli): record pipeline resets as executions | All of it. |
| `ec52c6afa` | test(ava-cli): cover recorded deletions and failed recording on reset | All of it. |
| `bd6ec7ad8` | feat(ava-cli): record retired-scope prunes as executions | All of it. |
| `7267a976e` | test(ava-cli): cover partial, scoped, empty, and declined prune records | All of it. |
| `97370f5a1` | (F55's commit) | **MIXED:** only `recordCliExecution/runRecordedCliCommand.ts`. |
| `ec76fc7cf` | fix(ava-cli): record a failed reset's deletions, Ctrl+C as cancelled, and time out recording calls | All of it. |
| `4472b0018` | fix(ava-cli): record a retired scope whose prune failed | All of it. |

**Files** (as of `4472b0018`): `apps/ava-cli/src/PipelineCli/recordCliExecution/`
(new: `createPostgrestExecutionStore.ts`, `runRecordedCliCommand.ts` and
test), `ResetPipelineCli/{ResetPipelineCli.ts,ResetPipelineCli.test.ts,pipelineListingsRest.ts}`,
`PruneRetiredScopesCli/{PruneRetiredScopesCli.ts,PruneRetiredScopesCli.test.ts}`,
`PruneRetiredScopesCli/buildPruneExecutionScope.ts` and test (new),
`scopePruneCounts/`.

**Schema:** none (F55's functions).

**Verification:**
```sh
pnpm test:ava-cli
pnpm build:ava-cli && ava pipeline reset socrata   # local stack only: answer no
ava supabase sql "select command, status from pipeline_executions order by started_at desc limit 1"   # needs F41: reset, cancelled
```

---

## F57: Case Types and Case Records app roles

Status: not started. Built on `feat/statuses`, merged into `demo/measles` in
`b0c502912`. Read that merge's message and `50c5c9ad7`'s: `50c5c9ad7` records
`refactor/query-column-id` as already in `develop` (#304), so `b0c502912`
replays only `feat/statuses`' own commits, `git log --no-merges
50c5c9ad7..a1f0eef72` (99, oldest `bb394143d`). `feat/statuses` is four plans
(`docs/superpowers/plans/2026-10-25-case-statuses.md`). F57 is plan 1: commits
`a30e0c0e3` to `35c4cbc1d` plus `2be8294d7`. Its hunks are
`git diff bb394143d 35c4cbc1d` plus `git show 2be8294d7`, minus the plan 2 to 4
files and `95d7c6739`'s `RelationLoading.test.ts` line wrap, on the branch's
pre-merge paths. Not on `develop`, no
PR: `develop`'s `app_type` ends at `gis`, and any workspace member may write
case types and records.

**Purpose:** Two app roles gate case management. `case_types` ("Case Types")
decides who opens the Case Manager and a case type page (viewer), creates and
edits case types and syncs records (editor), and deletes a case type (admin).
`case_records` ("Case Records") decides who opens the Records pages (viewer),
edits and syncs records (editor), and deletes one (admin). The enum gains both
values in a migration of their own, the built-in role groups are seeded with
them (Global Admin, Editor, and Viewer get admin, editor, and viewer), and a
backfill gives every existing custom group its `data_sources` role in both
apps. Write policies on `concepts`, `concept_attributes`, both
`attribute_mappings__*` tables, and `individuals` check those roles, and every
UPDATE policy gets both `using` and `with check`. Reads stay membership-based,
so the Data Explorer and chat keep querying case types. The Case Manager,
create, and Records routes are guarded through `RouteMiddleware`, the sidebar
and Spotlight show case links only to members with a case role, and controls a
role cannot use are hidden, not disabled (New case type, Delete, Refresh
records, Edit case type on a Records page, and Create case type in chat's draft
card). A records-only member who opens `/individual-manager` sees "Pick a case
type" instead of being sent to a Case Manager they cannot open.
**Value:** Teams can let investigators work records without letting them
redesign case types, which status changes (F58) and assignment (F66) build on.

**Design:** `docs/superpowers/specs/2026-10-25-case-statuses-design.md` §4
(except §4.5). Plans: `docs/superpowers/plans/2026-10-25-case-statuses.md`
(overview) and `2026-10-25-case-statuses-1-app-roles.md`.

**Why its own PR:** It changes who may write five tables and the role matrix of
every workspace, which is its own review, and the plan was written to leave
`develop` working after it. Statuses need it (F58's trigger checks
`case_records` editor), not the other way round. Known gap until F58 lands (from
the plan overview): a `case_types` editor who is not an admin cannot delete a
concept, so `rollbackConceptFormInsert` fails for them after a failed creation.
F58 deletes the rollback by making creation one RPC, so merge F58 soon after.

**PR title:** `feat(permissions): add Case Types and Case Records app roles`

**Depends on:** none.

**Commits to read** (from `feat/statuses`; `a30e0c0e3` and `d47ff1618` are MIXED by file):

| SHA | Subject | Take |
|---|---|---|
| `a30e0c0e3` | docs(case-statuses): design configurable per-case-type statuses | All of it: the spec, which F58 to F62 also cite. |
| `d47ff1618` | docs(case-statuses): plan configurable case statuses in four parts | MIXED: only `2026-10-25-case-statuses.md` and `2026-10-25-case-statuses-1-app-roles.md`. Plan 2 is F58, plan 3 is F59, plan 4 is F61. |
| `9cb013f99` | feat(case-statuses): add case_types and case_records to app_type | All of it. The migration is hand-written (see Schema). Regenerate types and the desktop mirror. |
| `0d3b6f6da` | feat(case-statuses): seed case app roles for built-in role groups | All of it. Regenerate the migration and mirror. |
| `2ae31269e` | feat(case-statuses): backfill case app roles for existing role groups | All of it. The migration is hand-written DML; regenerate the mirror. |
| `1eefc5ddb` | feat(case-statuses): require case_types roles to write concepts | All of it. Regenerate the migration and mirror. |
| `e476a3aea` | test(case-statuses): restore the rollback in the concepts RLS test | All of it. |
| `276ba8a41` | feat(case-statuses): require case_types editor to write case type attributes | All of it. Regenerate the migration and mirror. |
| `a144db68c` | feat(case-statuses): require case_types editor to write attribute mappings | All of it. Regenerate the migration and mirror. |
| `d493f4ce0` | feat(case-statuses): require a case app editor to write records | All of it. Regenerate the migration and mirror. |
| `9dafc18cc` | feat(case-statuses): add the case apps to roles, keys, and labels | All of it. |
| `64d173922` | feat(case-statuses): guard the Case Manager and Records routes on case app roles | All of it. |
| `78c372229` | feat(case-statuses): show case navigation only to members with a case role | All of it. |
| `90123a9f9` | feat(case-statuses): hide case type controls a role cannot use | All of it. |
| `563266bcb` | feat(case-statuses): hide Create case type in the draft card without case_types editor | All of it. |
| `eb3c68cc9` | feat(case-statuses): hide Case Manager links on Records pages without case_types access | All of it. |
| `ed8667816` | test(case-statuses): cover Case Manager and Records route permissions | All of it. |
| `d917ab50e` | docs(case-statuses): document the case_types and case_records apps | All of it. |
| `35c4cbc1d` | chore(case-statuses): shorten a doc comment past the max line length | All of it. |
| `2be8294d7` | fix(case-statuses): keep records-only users on the records home | All of it. Bug fix to this feature. |
| `108f4b2ee` | chore(case-statuses): extract the records home messages | Regenerate the `.po` catalogs. |
| `158c0049a` | chore(case-statuses): format the case status files with oxfmt | MIXED (formatting only): `WorkspaceLayout.tsx`, `-caseAppRouteGuards.test.tsx`, and `ontology-designer/-index.test.tsx` here. Run the formatter. |

**Files:**
- Schema: `supabase/schemas/00.enum.app_type.sql`,
  `05.utils.seed-workspace-role-groups.sql`, and the write policies in
  `10.concepts.sql`, `20.concept_attributes.sql`,
  `30.attribute_mappings__dataset_column.sql`,
  `30.attribute_mappings__manual_entry.sql`, and `20.individuals.sql`; the
  `app` column comment in `30.usage_analytics_events.sql`.
- Migration upgrade test: `supabase/migration-upgrade-tests/case_app_roles_backfill.{prelude,assertions}.sql`
  (new) and its block in `scripts/test-dashboard-publishing-migrations.sh`.
- pgTAP: `supabase/tests/database/permissions/case_app_roles.test.sql` (new),
  and `rls_concepts.test.sql`, `rls_concept_attributes.test.sql`,
  `rls_attribute_mappings__dataset_column.test.sql`,
  `rls_attribute_mappings__manual_entry.test.sql`, `rls_individuals.test.sql`.
- Roles and keys: `shared/models/Permissions/Permissions.types.ts`,
  `PermissionsModule/PermissionRegistry.ts`,
  `PermissionsModule/RolesMatrixModule/preset-role-matrices.ts`,
  `PermissionsModule/__tests__/PermissionsModule.appAccess.test.ts`,
  `shared/copy/appLabel.ts`, `src/views/WorkspaceSettingsPage/WorkspaceRolesTab/WorkspaceRolesTab.tsx`,
  and the fixtures in `src/hooks/permissions/useHasPermission/useHasPermission.test.tsx`,
  `src/hooks/permissions/useIsGlobalAdmin/useIsGlobalAdmin.test.tsx`, and
  `supabase/functions/workspaces/makeRoleGroupIdFromAcceptedInvite/makeRoleGroupIdFromAcceptedInvite.test.ts`.
- Routes: `src/utils/RouteMiddleware.ts`; under
  `src/routes/_auth/$workspaceSlug/`: `ontology-designer/{route,index,concept-creator}.tsx`,
  `individual-manager/index.tsx`, `individual-manager/$conceptId/{route,index}.tsx`,
  and the tests `-caseAppRouteGuards.test.tsx`, `ontology-designer/-index.test.tsx`,
  `individual-manager/-index.test.tsx`, `individual-manager/$conceptId/-index.test.tsx` (all new).
- Navigation: `src/components/layouts/RootLayout/makeMainNavbarLinksFromPermissions.ts`,
  `WorkspaceLayout/WorkspaceLayout.{tsx,test.ts}`,
  `useSpotlightActions/useSpotlightActions.{tsx,test.tsx}`, and
  `src/test-utils/{index.ts,makeHasPermissionFromAppRoles.ts (new)}`.
- Hidden controls: `src/views/OntologyDesignerApp/NewCaseTypeButton.tsx` and
  its test (new), `CaseTypeHome/CaseTypeHome.{tsx,test.tsx}`,
  `ConceptMetaView/CaseTypeActions.tsx` and its test (new),
  `src/views/IndividualManagerApp/EditCaseTypeButton.tsx` and its test (new),
  `src/components/ChatPanel/CaseTypeDraftBlock/{CaseTypeDraftBlock.tsx,CaseTypeDraftCard.tsx,CaseTypeDraftBlock.test.tsx}`.
- E2E: `tests/e2e/workspace-app-permissions-matrix.spec.ts`,
  `tests/e2e/helpers/{workspaceAppRouteExpectations.ts,assignE2ESecondaryMemberRole.ts}`,
  and `tests/e2e/helpers/insertE2ECaseType.ts` (new) as of `35c4cbc1d`
  (`git show 35c4cbc1d:tests/e2e/helpers/insertE2ECaseType.ts`). F58 rewrites it.
- Docs: `docs/permissions-architecture.md`, the spec, and plans overview and 1.

**Schema:** seven migrations on the branch. Port in this order:
1. `20261026104214_add_case_app_type_enum_values.sql` is hand-written
   (`alter type ... add value`). A new enum label must be committed before
   anything uses it (PG 55P04), so it stays alone. Port its SQL with a new
   timestamp.
2. Generate one migration from the schema files with the
   `supabase-declarative-schema` skill: the seeding function and the RLS
   policies (on the branch, `20261026105652`, `20261026110306`,
   `20261026110740`, `20261026111132`, `20261026111524`).
3. `20261026105957_backfill_case_app_role_group_app_roles.sql` is hand-written
   DML that calls the seeding helper. Port it with a new timestamp after step
   2, and point the `case_app_roles_backfill` block of
   `scripts/test-dashboard-publishing-migrations.sh` at the new file name.

Regenerate `shared/types/database.types.ts` (`pnpm db:gen-types`) and the
desktop mirrors (`pnpm desktop:sqlite:gen-migrations`).

**Verification:**
```sh
pnpm test:db
pnpm vitest run shared/models/Permissions src/hooks/permissions src/components/layouts/RootLayout src/views/OntologyDesignerApp src/views/IndividualManagerApp/EditCaseTypeButton.test.tsx src/components/ChatPanel/CaseTypeDraftBlock supabase/functions/workspaces 'src/routes/_auth/$workspaceSlug'
pnpm tsc -b --force
pnpm desktop:sqlite:check-migrations
pnpm i18n:check
pnpm test:e2e workspace-app-permissions-matrix.spec.ts
```

---

## F58: Case statuses data model

Status: not started. Built on `feat/statuses`, merged into `demo/measles` in
`b0c502912` (see F57 for how the commits were found). F58 is plan 2: commits
`aeee941df` to `e229237bf`, whose hunks are `git diff 203b8ec28 e229237bf`
(pre-merge paths). Not on `develop`, no PR. `develop` has the free-text
`individuals.status` (`'active'` by default, from #301) that this replaces.

**Purpose:** Every case type gets its own status set in a new
`concept_statuses` table (name, description, palette color, position).
`concepts.default_status_id` and `individuals.status_id` point into it through
composite foreign keys, so a record can only hold a status of its own case
type and the default cannot be deleted. A trigger fills a new record's status
with the default, so Sync never sends one, and a second trigger refuses a
status change by a signed-in user who is not a Case Records editor (a Case
Types editor may still sync). Existing case types get Active and Inactive plus
one status per other free-text value their records held, records are mapped by
name, attributes named `status` become `status (attribute)`, and then the
columns become `not null`, `individuals.status` is dropped, and the attribute
name `status` is reserved. `rpc_concepts__create` writes a case type, its
statuses, attributes, and mappings in one transaction (the client rollback is
deleted), and `rpc_concept_statuses__save` saves a whole status set, moving the
records of each removed status to a named replacement, with stable error hints.
The `ConceptStatus` model (palette, ordering, set validation, save payload,
reserved names), `ConceptStatusClient` (record counts per status, set saves),
and `makeDefaultStatusDrafts` (translated Active and Inactive) back it. New case
types, from the form or chat, start with the default set, and the form rejects
a hand-named field called "status".
**Value:** A case type can say what stages its records move through, and the
database enforces that every record is in exactly one of them.

**Design:** spec §4.5, §5, §6, §7, §11. Plan:
`docs/superpowers/plans/2026-10-25-case-statuses-2-data-model.md`.

**PR title:** `feat(case-statuses): give every case type its own status set`

**Depends on:** F57 (the status-change trigger checks `case_records` editor,
and `concept_statuses` RLS and the save RPC check `case_types` editor).

**Commits to read** (from `feat/statuses`; none is MIXED except `158c0049a`):

| SHA | Subject | Take |
|---|---|---|
| `d47ff1618` | docs(case-statuses): plan configurable case statuses in four parts | MIXED: only `2026-10-25-case-statuses-2-data-model.md`. |
| `aeee941df` | feat(case-statuses): add concept_statuses and a default status per case type | All of it. Regenerate the migration (see Schema). |
| `804cd886d` | feat(case-statuses): give records a status of their own case type | All of it. Regenerate the migration. |
| `14a6f1656` | feat(case-statuses): backfill statuses for existing case types and records | All of it. The migration is hand-written DML. |
| `2f7e4dd9d` | feat(case-statuses): require a status on every case type and record | All of it, including the fixture hunks in F57's RLS tests and `individuals__sync_upsert_contract.test.sql`. |
| `bbde69d01` | feat(case-statuses): create a case type and its statuses in one transaction | All of it, including moving `insertE2ECaseType.ts` onto the RPC. |
| `e6f911168` | feat(case-statuses): save a case type's status set in one transaction | All of it. |
| `fa37cd06f` | fix(case-statuses): lock the case type only after the role check | All of it. Fold into the save RPC rather than a migration of its own. |
| `9eaa7a911` | chore(case-statuses): regenerate database types and the desktop mirror | Only the `syncable-tables.ts` hunk. Regenerate the types and mirrors. |
| `9a4a0a92c` | feat(case-statuses): add the ConceptStatus model | All of it. |
| `e359d4f61` | feat(case-statuses): add the status palette and ordering helpers | All of it. |
| `882ca3b23` | feat(case-statuses): validate status sets and build the save payload | All of it. |
| `67bf56ec4` | feat(case-statuses): build the default status set for new case types | All of it. |
| `e62cf3e7a` | feat(case-statuses): carry statuses on case types, records, and new case type forms | All of it. |
| `f04021b10` | refactor(case-statuses): narrow the sync insert row cast | All of it. |
| `481067218` | feat(case-statuses): add ConceptStatusClient with record counts and set saves | All of it. |
| `9b8a47869` | feat(case-statuses): create case types through rpc_concepts__create | All of it. |
| `82c5899df` | feat(case-statuses): create a case type in one call and drop the client rollback | All of it. |
| `5562f56d1` | feat(case-statuses): reject a case type field named status | All of it. |
| `17041d641` | chore(case-statuses): extract and compile translations | Regenerate the `.po` catalogs. |
| `e229237bf` | docs(case-statuses): describe statuses in the ontology architecture | All of it. |
| `158c0049a` | chore(case-statuses): format the case status files with oxfmt | MIXED (formatting only): `IndividualParsers.ts`, `generateIndividuals.test.ts`, `insertE2ECaseType.ts` here. |

Later features (F71 to F75) rewrote several of these files. For any file in
the shared files table, take F58's hunks from `git diff 50c5c9ad7 b0c502912 --
<path>` (statuses as it landed, on `develop`'s layout) rather than the tip.

**Files:**
- Schema: `supabase/schemas/11.concept_statuses.sql` (new),
  `50.rpc_concepts__create.sql` (new), `50.rpc_concept_statuses__save.sql`
  (new), and F58's hunks of `10.concepts.sql`, `20.individuals.sql`, and
  `20.concept_attributes.sql`.
- Migration upgrade test: `supabase/migration-upgrade-tests/case_statuses_backfill.{prelude,assertions}.sql`
  (new) and its block in `scripts/test-dashboard-publishing-migrations.sh`.
- pgTAP: `supabase/tests/database/{concept_statuses__integrity,individuals__status,rpc_concepts__create,rpc_concept_statuses__save}.test.sql`
  and `permissions/rls_concept_statuses.test.sql` (all new), plus fixture
  hunks in `individuals__sync_upsert_contract.test.sql` and F57's five RLS tests.
- Desktop: `concept_statuses` in `apps/desktop/sync/syncable-tables.ts`.
- Models: `shared/models/ontology/ConceptStatus/{ConceptStatus.ts,ConceptStatus.types.ts,ConceptStatusParsers.ts,ConceptStatusParsers.test.ts,ConceptStatusModule/ConceptStatusModule.{ts,test.ts}}`
  (new), `Concept/{Concept.types.ts,ConceptParsers.ts,ConceptParsers.test.ts (new)}`,
  `Individual/{Individual.types.ts,IndividualParsers.ts,IndividualParsers.test.ts (new)}`.
- Clients: `src/clients/ontology/{ConceptStatusClient.ts,ConceptStatusClient.test.ts,ConceptClient.test.ts}`
  (new) and `ConceptClient.ts`.
- Creation: `src/views/OntologyDesignerApp/makeDefaultStatusDrafts/` (new),
  `ConceptCreatorView/{conceptFormTypes.ts,conceptFormTypes.test.ts (new),useSubmitConceptCreatorForm.ts,index.tsx}`,
  `applyCreatedCaseTypes/applyCreatedCaseTypes.ts`,
  `insertConceptFromFormValues/insertConceptFromFormValues.{ts,test.ts}`,
  `createdCaseTypeToFormValues/createdCaseTypeToFormValues.{ts,test.ts}`.
- Sync: `ConceptMetaView/generateIndividuals/{generateIndividuals.ts,generateIndividuals.test.ts,diffStagedIndividualsHelpers/diffStagedIndividualsHelpers.ts}`.
- Fixtures: `src/clients/queries/runStructuredQuery/runStructuredQuery.test.ts`,
  `src/views/IndividualManagerApp/EditCaseTypeButton.test.tsx`,
  `ConceptMetaView/CaseTypeActions.test.tsx`.
- E2E helper: `tests/e2e/helpers/insertE2ECaseType.ts` (final).
- If F18 or F21 is already on `develop`: the `rpc_concepts__create` hunk of
  `tests/e2e/helpers/seedCaseRecord.ts` (written in the merge `29c0212f4`),
  `14cd6eed9`, and `102defcc6`, since their case types then need a default status.
- Docs: `docs/ontology-architecture.md` (`e229237bf`) and plan 2.

**Schema:** seven migrations on the branch. The backfill has to run between
adding the columns and constraining them, so generate in two passes:
1. Generate from an intermediate schema: `11.concept_statuses.sql` final,
   `concepts.default_status_id` and `individuals.status_id` nullable (with their
   FKs, index, and both triggers), `individuals.status` still present, and no
   reserved-name check (on the branch `20261026114447_add_concept_statuses.sql`
   and `20261026114856_add_individuals_status_id.sql`).
2. Port `20261026115137_backfill_case_statuses.sql` (hand-written DML, `db diff`
   never emits it) with a new timestamp, and point the `case_statuses_backfill`
   block of `scripts/test-dashboard-publishing-migrations.sh` at it.
3. Generate from the final schema files: `not null`, dropping
   `individuals.status`, the reserved-name check, and both RPCs (on the branch
   `20261026115457`, `20261026115925`, `20261026120513`, `20261026120916`).

Regenerate `shared/types/database.types.ts` and the desktop mirrors. The
desktop app is pre-release, so the column drop is fine there.

**Verification:**
```sh
pnpm test:db
pnpm vitest run shared/models/ontology src/clients/ontology src/views/OntologyDesignerApp src/views/IndividualManagerApp/EditCaseTypeButton.test.tsx src/clients/queries/runStructuredQuery
pnpm tsc -b --force
pnpm desktop:sqlite:check-migrations
pnpm test:desktop
pnpm i18n:check
pnpm test:e2e workspace-app-permissions-matrix.spec.ts
```
Then create a case type from the form and from chat, and check it has Active
(default) and Inactive.

---

## F59: Edit a case type's statuses

Status: not started. Built on `feat/statuses`, merged into `demo/measles` in
`b0c502912` (see F57). F59 is the editing half of plan 3 (commits `4c964881b` to
`69973360f`, see the table). Not on `develop`, no PR.

**Purpose:** Shared status components land in `src/components/caseStatuses/`:
`StatusDot`, `StatusBadge` (description in a tooltip on hover and focus),
`StatusColorPicker` over the eight-color palette with accessible color names,
and `StatusSetEditor`, one row per status with a keyboard-reorderable drag
handle, swatch, name, description, a "Default status" radio group, and remove,
with inline validation. In edit mode, removing a status that still has records
asks where those records go. The create-case-type form gains a Statuses
fieldset prefilled with the default set. The case type page moves onto
`AppView`: a header with View records, Refresh records (shown with either sync
key), and an overflow menu holding Delete; Description, Attributes, and a
Statuses section listing each status's badge, description, record count, and
default marker; and a rail. Edit statuses (Case Types editor) opens the editor
in a modal that warns a rename changes what saved filters match, saves through
`rpc_concept_statuses__save`, maps its error hints to copy, and invalidates the
status-dependent queries in one place (`invalidateCaseStatusQueries`).
**Value:** Teams set up and change their own workflow per case type without
losing records.

**Design:** spec §8.1, §8.2, §8.4, §11. Plan:
`docs/superpowers/plans/2026-10-25-case-statuses-3-screens.md` (shared with F60).

**PR title:** `feat(case-statuses): edit a case type's statuses`

**Depends on:** F57 (Edit statuses and the case type page's controls are
role-gated) and F58 (model, client, save RPC).

**Commits to read** (from `feat/statuses`):

| SHA | Subject | Take |
|---|---|---|
| `d47ff1618` | docs(case-statuses): plan configurable case statuses in four parts | MIXED: only `2026-10-25-case-statuses-3-screens.md`. |
| `4c964881b` | feat(case-statuses): add the status color dot | All of it. |
| `32263d65b` | feat(case-statuses): add the status badge | All of it. |
| `a1ae252d0` | feat(case-statuses): add the status color picker | All of it. |
| `a0cebe006` | feat(case-statuses): add the status set editor | All of it. |
| `930ccb92a` | feat(case-statuses): ask where a removed status's records go | All of it. |
| `c034c752c` | test(case-statuses): assert a removed status without records leaves the editor | All of it. |
| `47ea01e68` | feat(case-statuses): edit statuses on the create-case-type form | All of it. |
| `f945ce6d0` | feat(case-statuses): invalidate status-dependent queries in one place | All of it. F60 and F66 also call it. |
| `683477d03` | feat(case-statuses): list a case type's statuses with their record counts | All of it. |
| `94b058b7b` | feat(case-statuses): add the Edit statuses form | All of it. |
| `bf1c0a3a8` | feat(case-statuses): edit a case type's statuses in a modal | All of it. |
| `ed660118e` | feat(case-statuses): rebuild the case type page with a Statuses section | All of it. |
| `4410e70b9` | chore(case-statuses): extract and compile status screen messages | Regenerate the `.po` catalogs (shared with F60). |
| `d19590fff` | test(case-statuses): seed a case type with statuses and records for E2E specs | All of it. F60's specs use it too. |
| `69973360f` | test(case-statuses): cover editing a case type's statuses end to end | All of it. |
| `9396bce96` | docs(case-statuses): map the status screens in the ontology architecture doc | MIXED: the case type page and create form rows. The records list and record page rows are F60. |
| `158c0049a` | chore(case-statuses): format the case status files with oxfmt | MIXED (formatting only): the `caseStatuses/` files, `ConceptStatusesFieldset`, `ConceptCreatorView/index.tsx`, `CaseTypeStatusList.tsx` here. |

**Files:**
- `src/components/caseStatuses/{StatusDot,StatusBadge,StatusColorPicker,StatusSetEditor}/**`
  and `useStatusColorLabels.ts` (all new).
- Create form: `src/views/OntologyDesignerApp/ConceptCreatorView/ConceptStatusesFieldset/`
  and `getStatusSetValueFromFormValues/` (new), and F59's hunk of `ConceptCreatorView/index.tsx`.
- Case type page: under `src/views/OntologyDesignerApp/ConceptMetaView/`:
  `CaseTypeStatusList/`, `EditStatusesModal/` (`EditStatusesModal.tsx`,
  `useSaveCaseTypeStatuses.ts`, `EditStatusesForm/{EditStatusesForm.tsx,EditStatusesForm.test.tsx,RenameWarning.tsx,SaveErrorCallout.tsx}`),
  `CaseTypeStatusesSection.tsx`, `CaseTypeActionsMenu.tsx`, `CaseTypeRail.tsx`,
  `RefreshRecordsButton.tsx` (all new), `CaseTypeActions.{tsx,test.tsx}`,
  `ViewRecordsButton.tsx`, `index.tsx`; and `src/views/OntologyDesignerApp/index.tsx`.
- `src/views/IndividualManagerApp/invalidateCaseStatusQueries/` (new), without
  F66's assignee keys.
- E2E: `tests/e2e/case-statuses-edit.spec.ts`,
  `tests/e2e/helpers/insertE2ECaseTypeWithRecords.ts` (both new).
- Docs: F59's rows of `docs/ontology-architecture.md`, and plan 3.

**Schema:** none.

**Verification:**
```sh
pnpm vitest run src/components/caseStatuses src/views/OntologyDesignerApp src/views/IndividualManagerApp/invalidateCaseStatusQueries
pnpm tsc -b --force
pnpm i18n:check
pnpm test:e2e case-statuses-edit.spec.ts
```

---

## F60: Work records by status

Status: not started. Built on `feat/statuses`, merged into `demo/measles` in
`b0c502912` (see F57). F60 is the records half of plan 3. Its record page was
then reconciled with F18's in the merge `29c0212f4`: read that merge's
message ("Record page: ... RecordRail becomes RecordFactsGroup inside
CaseDetailsRail"). Not on `develop`, no PR.

**Purpose:** The records list moves into `AppListPane`. Its header shows the
case type and how many records match the filter, a status multi-select (each
option a color dot, name, and description tooltip) filters both the rows and
the count (`status_id in (...)`), filter ids for deleted statuses are dropped,
and each row carries its status dot with the status name as its accessible
label. The list pane is keyed by case type, so its filter starts empty for each
one. `AppViewHeader` gains a `titleAccessory` slot and `AppListPane` exposes its
body element. On the record page the status sits beside the name: a menu
button named `Status: <current status>` for a Case Records editor and a badge
for everyone else, each status's description on hover and focus. A pick saves
at once, shows optimistically, rolls back with a toast on failure, ignores a
second pick while the first saves, and refreshes every view that shows the
status. The rail gains a Record group (source ID, created, updated, missing
from source since).
**Value:** Investigators triage a case type by stage and move a case forward
from the case itself.

**Design:** spec §8.5, §8.6, §11. Plan: plan 3 (ported with F59).

**PR title:** `feat(case-statuses): filter records by status and change a record's status`

**Depends on:** F57, F58, F59 (`StatusBadge`, `StatusDot`,
`invalidateCaseStatusQueries`, `insertE2ECaseTypeWithRecords`), and F18. Land
F18 first: the tip record page is F18's `AppView` page plus F60's hunks, so F60
then adds only the status control and the Record group. If F60 must land before
F18, port the record page as `b0c502912` has it (`RecordRail/`,
`RecordDetailsSection.tsx`, `useHydratedIndividual.ts`, the `ActivityBlock.tsx`
change, `$individualId.tsx`), and F18 then takes `29c0212f4`'s resolution.

**Commits to read** (from `feat/statuses`):

| SHA | Subject | Take |
|---|---|---|
| `c512695b2` | feat(case-statuses): filter the records list query by status | All of it. `makeRecordsWhereFromStatusFilter/` is deleted at the tip (F66 replaces it with `makeRecordsListWhere/`): port it from `b0c502912`. |
| `c91adbeb2` | feat(layouts): add a header title accessory and a list pane body ref | All of it. |
| `3d562f251` | feat(case-statuses): add the records status filter | All of it. |
| `974e00b5c` | feat(case-statuses): rebuild the records list with a status filter and count | All of it, including deleting `IndividualNavbar.{tsx,module.css}`. |
| `58d2907bf` | fix(case-statuses): drop filter ids for deleted statuses | All of it. |
| `4ec396d3f` | feat(case-statuses): add the record status control | All of it. |
| `47ea31c62` | feat(case-statuses): save a record's status optimistically | All of it. |
| `119770c34` | fix(case-statuses): ignore status picks while a save is in flight | All of it. |
| `132390a02` | feat(case-statuses): add the record page rail | History: became `RecordFactsGroup/` in `29c0212f4`. Port `RecordFactsGroup/` from the tip. |
| `51da35e78` | feat(case-statuses): rebuild the record page with a status control | History: superseded by F18's page and `29c0212f4`. Take only the status hunks of `SingleIndividualView/index.tsx` as the tip has them. |
| `cd56d3d95` | test(case-statuses): cover changing a record's status end to end | All of it. |
| `e4f948826` | test(case-statuses): cover filtering the records list by status end to end | All of it. |
| `9396bce96` | docs(case-statuses): map the status screens in the ontology architecture doc | MIXED: the records list and record page rows. The rest is F59. |
| `e43da0e95` | fix(case-statuses): keep the video cases screen's sidebar styles after the records list move | All of it. |
| `4410e70b9` | chore(case-statuses): extract and compile status screen messages | Regenerate the `.po` catalogs. |
| `158c0049a` | chore(case-statuses): format the case status files with oxfmt | MIXED (formatting only): `makeRecordsWhereFromStatusFilter.test.ts` here. |

**Files:**
- Layout: `src/components/layouts/AppView/AppViewHeader/{AppViewHeader.tsx,AppViewHeader.module.css,AppViewHeader.test.tsx (new)}`,
  `src/components/layouts/AppListPane/AppListPane.tsx`.
- Records list: `src/views/IndividualManagerApp/IndividualNavbar/{IndividualNavbar.tsx,IndividualNavbar.module.css,IndividualNavbarRows.tsx,StatusFilter/,filterToKnownStatusIds/}`
  (new; `src/views/IndividualManagerApp/IndividualNavbar.{tsx,module.css}` deleted),
  `makeRecordsWhereFromStatusFilter/` (new, from `b0c502912`),
  `useConceptIndividuals.ts`, `useVirtualIndividualLinks.tsx` (renamed from
  `.ts`), `index.tsx`, and `src/routes/_auth/$workspaceSlug/individual-manager/$conceptId/index.tsx`
  (the `useConceptIndividuals({ conceptId })` call). Leave out F66's assignee hunks.
- Record page: `SingleIndividualView/RecordStatusControl/`,
  `useRecordStatusChange/`, `RecordFactsGroup/` (all new), F60's hunks of
  `SingleIndividualView/index.tsx`, and the `children` prop of `CaseDetailsRail.tsx`.
- Video producer: `apps/ava-video-producer/avandar-adapter/CasesScreen/CasesScreen.{tsx,module.css}`.
- E2E: `tests/e2e/case-statuses-record.spec.ts`, `tests/e2e/case-statuses-list-filter.spec.ts` (new).
- Docs: F60's rows of `docs/ontology-architecture.md`.

**Schema:** none.

**Verification:**
```sh
pnpm vitest run src/components/layouts/AppView src/views/IndividualManagerApp
pnpm tsc -b --force
pnpm type-check:video-producer
pnpm i18n:check
pnpm test:e2e case-statuses-list-filter.spec.ts
pnpm test:e2e case-statuses-record.spec.ts
pnpm test:e2e case-activity.spec.ts
```

---

## F61: A built-in status column for case types in the Data Explorer

Status: not started. Built on `feat/statuses`, merged into `demo/measles` in
`b0c502912` (see F57). F61 is the Data Explorer half of plan 4. The merge moved
`toCsvRows.ts` and its executed test into `conceptRelation/toCsvRows/` to match
`develop`'s one-directory-per-function layout from #304, so the commits below
name older paths. Not on `develop`, no PR.

**Purpose:** Every case type's view in the Data Explorer gets a `status` column
holding each record's status name. It is a new `ConceptStatusColumn` base
column whose id is the case type's id, offered after the attributes
(`makeQueryColumnsFromConcept`), so a selected status column survives a
refetch of the column list and a restore from the URL. Filters, grouping, and
aggregation work unchanged because they read only `name` and `dataType`. The
concept spine now carries each record's external id and status name
(`ConceptRelationPlan.spineRows`, loaded as two-column CSV by `toCsvRows` with
the same quoting rules as `toCsvColumn`), and every concept view selects
`status`; `makeConceptAttributeColumnsFromMetadata` reserves the name. The
legacy `_runConceptQuery` path skips the column. Filters match the status name,
so renaming a status changes what a saved `status = '...'` filter matches.
**Value:** Teams count and chart cases by stage in the Data Explorer and on
dashboards.

**Design:** spec §9, §11. Plan:
`docs/superpowers/plans/2026-10-25-case-statuses-4-explorer-and-chat.md` (shared with F62).

**PR title:** `feat(case-statuses): add a status column to case types in the Data Explorer`

**Depends on:** F58 (`status_id` and the statuses the planner reads) and F63
(without it the loaded spine cannot be read back, so any case type query with
records fails).

**Commits to read** (from `feat/statuses`):

| SHA | Subject | Take |
|---|---|---|
| `d47ff1618` | docs(case-statuses): plan configurable case statuses in four parts | MIXED: only `2026-10-25-case-statuses-4-explorer-and-chat.md`. |
| `943def816` | docs(case-statuses): mark list filtering partially done in the roadmap step | All of it (plan 4). |
| `2614eb6a7` | feat(case-statuses): add the built-in status query column | All of it. `QueryColumnBindings/` is `QueryResultColumnBindings/` on `develop`. |
| `317dced4a` | feat(case-statuses): offer the status column for every case type in the Data Explorer | All of it. |
| `e5c1809e4` | feat(case-statuses): restore the status column from a Data Explorer URL | All of it. |
| `5bc44f249` | test(case-statuses): pin the legacy concept query skipping the status column | All of it. |
| `977f75cee` | feat(case-statuses): add a multi-column CSV writer for concept spines | All of it, at the final paths `conceptRelation/toCsvRows/toCsvRows.{ts,executed.test.ts}`. |
| `2f79432e5` | feat(case-statuses): load each record's status name into the concept spine | All of it. |
| `fa346a4f3` | feat(case-statuses): expose status in every concept relation | All of it, at the final paths under `conceptRelation/buildConceptViewSql/` and `conceptRelation/__tests__/`. |
| `736b1ce78` | test(case-statuses): filter and group a case type by status in executed queries | All of it. |
| `cbf0b48b0` | test(case-statuses): group a case type by status in the Data Explorer end to end | All of it. |
| `a55c41a73` | docs(case-statuses): document the status column and chat statuses, and update the roadmap | MIXED: the status column, QETL, invariant, and testing hunks of `docs/ontology-architecture.md`, and the roadmap hunks. The chat hunks are F62. |
| `16e56ced1` | test(case-statuses): fix type errors in the status column seed helper and the leasing stub | MIXED: only `tests/e2e/helpers/CaseTypeSeedHelpers.ts`. The leasing test is F63. |
| `b7172aafa` | test(case-statuses): clean up a partly seeded case type | All of it. |

Take F61's hunks of the QETL and query column files from
`git diff 50c5c9ad7 b0c502912 -- <path>`: F71 to F75 rewrote most of them later.

**Files:**
- Model: `shared/models/queries/ConceptStatusColumn/**` (new),
  `QueryColumn/{QueryColumn.types.ts,QueryColumnModule.ts}`,
  `QueryColumn/QueryColumnReconciliation/QueryColumnReconciliation.test.ts`,
  `QueryResultColumnBindings/makeProjectionDescriptorsFromStructuredQuery/makeProjectionDescriptorsFromStructuredQuery.test.ts`.
- Data Explorer: `src/views/DataExplorerApp/makeQueryColumnsFromConcept/` (new),
  `useQueryColumnsForDataSource.ts`, `getRestoredColumnsFromUrl/getRestoredColumnsFromUrl.{ts,test.ts}`,
  `useDataExplorerUrlSync.ts`, `QueryForm/QueryFiltersField/QueryFiltersField.test.tsx`.
- Queries: `src/clients/queries/runStructuredQuery/{runStructuredQueryWithMetadata.ts,runStructuredQuery.test.ts}`.
- QETL under `src/clients/qetl/QueryMediator/`: `conceptRelation/toCsvRows/`
  (new), `conceptRelation/{toCsvColumn/toCsvColumn.ts,conceptRelation.types.ts,loadConceptRelations.ts,makeConceptAttributeColumnsFromMetadata.ts}`,
  `conceptRelation/getConceptRelationPlansFromSql/`, `conceptRelation/loadConceptSpine/`,
  `conceptRelation/buildConceptViewSql/`, `conceptRelation/__tests__/conceptAttributeColumns.integration.executed.test.ts`,
  `__tests__/QueryMediator.concepts.test.ts`, `expandRelationRefs/expandRelationRefs.test.ts`,
  `getNeededColumnsFromQuery/getNeededColumnsFromQuery.test.ts`.
- Integration: `tests/integration/queries/{StructuredQueryTestFixtures.ts,structuredQueryConcepts.executed.test.ts}`.
- E2E: `tests/e2e/case-statuses-data-explorer.spec.ts`, `tests/e2e/helpers/CaseTypeSeedHelpers.ts` (new).
- Docs: F61's hunks of `docs/ontology-architecture.md` and
  `docs/production-plan-world-humanitarian-day.md`, and plan 4.

**Schema:** none.

**Verification:**
```sh
pnpm vitest run shared/models/queries src/views/DataExplorerApp src/clients/queries src/clients/qetl/QueryMediator
pnpm test:executed src/clients/qetl/QueryMediator/conceptRelation tests/integration/queries
pnpm tsc -b --force
pnpm test:e2e case-statuses-data-explorer.spec.ts
```

---

## F62: Chat sees each case type's statuses and proposes a status set

Status: not started. Built on `feat/statuses`, merged into `demo/measles` in
`b0c502912` (see F57). F62 is the chat half of plan 4. Not on `develop`, no PR.

**Purpose:** Chat's schema line for each case type lists its statuses in
position order (`- c0: Cholera case (age, status: Suspected | Confirmed)`),
online through `fetchWorkspaceSchema` and `SqlTableAlias` (used by chat and by
the queries edge function's SQL generation) and offline through
`fetchOfflineChatSchema`, `truncateSchemaForOffline` (keeps the status field),
and `narrowOfflineSchema` (moved into its own folder with a test). The Case
Manager's `proposeCaseType` tool gains `statuses` and `defaultStatusName`, the
prompt asks for a status set with one-sentence descriptions when the case type
implies a workflow, and `parseProposedCaseStatuses` keeps a set only when it is
valid as a whole (1 to 12 statuses, unique names, the default among them,
palette colors with missing ones filled). An attribute named "status" is
renamed to "status (attribute)". The draft card lists the proposed statuses
(or the translated default set) as badges with their descriptions and swaps in
`StatusSetEditor` on Edit statuses, and the created case type carries that set
(`makeStatusSetValueFromChatStatuses`).
**Value:** Chat can answer "how many cases are confirmed" and design a case
type with its workflow in one step.

**Design:** spec §8.3, §10. Plan: plan 4 (ported with F61).

**PR title:** `feat(chat): show case type statuses to chat and let it propose a status set`

**Depends on:** F58 (`ConceptStatus` palette and reserved names, creation with
statuses), F59 (`StatusSetEditor` and `StatusBadge` in the draft card), F61 (the
schema line points the model at the concept view's `status` column), and F57
(`563266bcb` shares the draft card).

**Commits to read** (from `feat/statuses`):

| SHA | Subject | Take |
|---|---|---|
| `fb1740d52` | feat(case-statuses): show each case type's statuses in chat's schema context | All of it. |
| `accbed4fc` | feat(case-statuses): show each case type's statuses in offline chat | All of it, including moving `narrowOfflineSchema.ts` into `narrowOfflineSchema/`. |
| `1483ef6e1` | feat(case-statuses): parse a status set from a chat case type proposal | All of it. |
| `5c9fd45c8` | feat(case-statuses): let chat propose a status set for a new case type | All of it. |
| `9de9c1ebd` | feat(case-statuses): create chat-drafted case types with their proposed statuses | All of it. |
| `2a9d61037` | feat(case-statuses): show and edit proposed statuses in the chat draft card | All of it. |
| `6de5df170` | chore(case-statuses): extract chat status messages | Regenerate the `.po` catalogs. |
| `a55c41a73` | docs(case-statuses): document the status column and chat statuses, and update the roadmap | MIXED: only the chat hunks of `docs/ontology-architecture.md` (case manager prompt, parser, draft card, the two-step conversion, and the "Chat" layer step). |

Take F62's hunks of the chat files from `git diff 50c5c9ad7 b0c502912 --
<path>`: F71 to F75 and F81 to F85 changed them later.

**Files:**
- Schema context: `shared/models/chat/SqlTableAlias/{SqlTableAlias.ts,SqlTableAlias.types.ts,SqlTableAliasModule.ts,SqlTableAlias.test.ts}`,
  `supabase/functions/chat/PostChatMessages/{PostChatMessages.ts,schema/fetchWorkspaceSchema.{ts,test.ts}}`,
  `supabase/functions/chat/utils/buildSqlSystemPrompt/buildSqlSystemPrompt.{ts,test.ts}`,
  `supabase/functions/queries/QueriesRoutes.ts`.
- Offline: `shared/types/offlineChat.types.ts`; under
  `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/`:
  `ensureOfflineChatSchema/ensureOfflineChatSchema.{ts,test.ts}`,
  `fetchOfflineChatSchema/{OfflineChatSchemaCache.ts,fetchOfflineChatSchema.ts,fetchOfflineChatSchema.test.ts (new),truncateSchemaForOffline/truncateSchemaForOffline.{ts,test.ts}}`,
  `runOfflineChatPipeline/{runOfflineChatPipeline.ts,buildOfflinePrompts/buildOfflinePrompts.{ts,test.ts},narrowOfflineSchema/narrowOfflineSchema.{ts,test.ts (new)}}`
  (`runOfflineChatPipeline/narrowOfflineSchema.ts` moved).
- Proposals: `shared/types/chat.types.ts`, `supabase/functions/chat/PostChatMessages/parsing/{parseProposeCaseType.{ts,test.ts},parseProposedCaseStatuses.ts (new)}`,
  `prompt/{buildCaseManagerSystemPrompt,makeChatToolConfigFromOptions}.{ts,test.ts}`.
- Draft to case type: `src/views/OntologyDesignerApp/makeStatusSetValueFromChatStatuses/` (new),
  `createdCaseTypeToFormValues/`, `proposedCaseTypeToCreatedCaseType/`.
- Draft card: `src/components/ChatPanel/CaseTypeDraftBlock/{CaseTypeDraftStatusSection.tsx (new),CaseTypeDraftCard.tsx,CaseTypeDraftCard.module.css,CaseTypeDraftAttributeRow.tsx,CaseTypeDraftManualEntrySection.tsx,useCaseTypeDraftEditor.{ts,test.ts},CaseTypeDraftBlock.test.tsx}`.
- Docs: F62's hunks of `docs/ontology-architecture.md`.

**Schema:** none.

**Verification:**
```sh
pnpm vitest run shared/models/chat supabase/functions/chat src/components/ChatPanel src/views/OntologyDesignerApp
pnpm tsc -b --force
pnpm type-check:deno
pnpm i18n:check
```
Then ask the Case Manager chat to design a measles case type and check the card
proposes statuses, and ask the Data Explorer chat how many records of a case
type are in each status.

---

## F63: Read a loaded concept spine back as trusted internal SQL

Status: not started. Built on `feat/statuses`, merged into `demo/measles` in
`b0c502912`. The bug is on `develop`: `loadConceptSpine` calls
`DuckDbClient.loadCsv`, whose `_getCsvLoadResult` reads the new table back with
`getTableSchema` (`DESCRIBE`) and `getTableRowCount` through untrusted
`runRawQuery`, and `develop`'s own `DuckDbSqlAnalyzer.test.ts` asserts that a
spine name (`concept_<id>__individuals`) is `uninspectable-source`. No PR. The
files' diff from `develop` is exactly this fix.

**Purpose:** The CSV and Parquet loaders read back the table they just created
through a new `getLoadedDuckDbTableShape` (`duckDbTableIntrospection.ts`),
which runs the `DESCRIBE` and `count(*)` as trusted internal SQL, like the
statements that created the table. A concept spine's name deliberately
resolves to no relation, so the fail-closed analyzer refused both reads and
every case type query with records failed in the browser with
`uninspectable-source`. A table named after a dataset is still analyzed as that
dataset's read, so its lease still applies.
**Value:** Case type queries in the Data Explorer, dashboards, and chat run
again.

**PR title:** `fix(qetl): read a loaded concept spine back as trusted internal SQL`

**Depends on:** none.

**Commits to read** (from `feat/statuses`):

| SHA | Subject | Take |
|---|---|---|
| `eedcf5d22` | fix(case-statuses): read back a loaded concept spine as trusted internal SQL | All of it. |
| `16e56ced1` | test(case-statuses): fix type errors in the status column seed helper and the leasing stub | MIXED: only `src/clients/DuckDbClient/__tests__/DuckDbClient.datasetLeasing.test.ts`. `CaseTypeSeedHelpers.ts` is F61. |
| `6782d4d61` | test(case-statuses): explain the client stub casts | All of it. |

**Files:** `src/clients/DuckDbClient/{duckDbTableIntrospection.ts,duckDbCsvLoad.ts,duckDbParquetLoad.ts}`,
`src/clients/DuckDbClient/{duckDbCsvLoad.test.ts,duckDbParquetLoad.test.ts}` (new),
`src/clients/DuckDbClient/__tests__/DuckDbClient.datasetLeasing.test.ts`.

**Schema:** none.

**Verification:**
```sh
pnpm vitest run src/clients/DuckDbClient src/clients/qetl/QueryMediator
pnpm tsc -b --force
```
Then, on `develop` before and after, sync a case type with records and query
it in the Data Explorer: before, it fails with `uninspectable-source`.

---

## F64: Stop CaseTypeDraftBlock toasts outliving the test file

Status: not started. Committed straight to `demo/measles`, and reached its
first-parent history through `01a85ba5e`. The leak is on `develop`: `develop`'s
`CaseTypeDraftBlock.test.tsx` clicks Create case type four times with real
Mantine toasts (`useCaseTypeDraftCreation` calls `notifySuccess`), and
`develop` uses `@mantine/notifications` 9.2. No PR.

**Purpose:** Creating a case type shows a toast. Mantine 9.2's
`NotificationContainer` schedules its auto-close timer from two mount effects
into one ref, so one 4s timer per toast is never cleared, and the module-global
store remounts queued toasts on later renders. When the worker outlives jsdom
teardown, those timers fail the run with "window is not defined" although
every test passed. The test now mocks `@/utils/notifications/notify`.
Assertions are unchanged.
**Value:** The frontend suite stops failing for a reason no test asserts.

**PR title:** `test(chat): stop CaseTypeDraftBlock toasts outliving the test file`

**Depends on:** none.

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `d56634ab9` | test(chat): stop CaseTypeDraftBlock toasts outliving the test file | All of it. It inserts one `vi.mock` block before the `DatasetColumnClient` mock, which `develop`'s file also has. |

**Files:** `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftBlock.test.tsx`.

**Schema:** none.

**Verification:**
```sh
pnpm vitest run src/components/ChatPanel/CaseTypeDraftBlock
pnpm test:frontend
```

---

## F65: An `is` null filter and ordered pages in `@avandar/utils` and `@avandar/clients`

Status: not started. Built on `feat/individual-assignment`, merged into
`demo/measles` in `47414c244`. The commits are the three package commits of
`git log --no-merges 47414c244^1..47414c244^2`. Not on `develop`, no PR:
`develop`'s `FilterOperator` is `eq` and `in` only, and `getPage` takes no order.

**Purpose:** `@avandar/utils` filters gain an `is` operator whose only value is
`null` (`NULL_OPERATORS`, `NullOperator`, `FilterOperatorRecord`, `where`, the
operator guards, `bucketFiltersByColumn`, `bucketFiltersByOperator`, and
`doesValuePassFilters`), because `eq` with `null` is not SQL `is null`. The
Supabase and SQLite CRUD clients translate it to `is null` and bind no value.
`getPage` takes an optional `orderBy` list of columns and directions, applied
before the page window (`.order` on Supabase, an `order by` on SQLite that
refuses a column name outside `^[a-z_][a-z0-9_]*$`). An unordered page is
unchanged.
**Value:** Callers can ask for unassigned rows and for a stable page order,
which F66's assignee filter and queue need.

**PR title:** `feat(clients): add an is-null filter and ordered pages`

**Depends on:** none. `release-packages.yaml` infers the minor bump for both
packages from the PR title, so no `pnpm changeset` is needed.

**Commits to read** (from `feat/individual-assignment`):

| SHA | Subject | Take |
|---|---|---|
| `e89d8cc03` | feat(filters): match an empty column with is null | All of it. |
| `3626c3db9` | fix(filters): keep an is-null filter when bucketing by operator | All of it. Bug fix to `e89d8cc03`. |
| `f6357351c` | feat(clients): order a page when the caller names columns | All of it. |

**Files:**
- `packages/shared/utils/src/filters/{filters.ts,where/where.ts,isArrayValueOperator/isArrayValueOperator.ts,isSingleValueOperator/isSingleValueOperator.ts,bucketFiltersByColumn/bucketFiltersByColumn.ts,bucketFiltersByOperator/bucketFiltersByOperator.{ts,test.ts},doesValuePassFilters/doesValuePassFilters.{ts,test.ts},applyFiltersToRows/applyFiltersToRows.test.ts}`,
  `packages/shared/utils/README.md`.
- `packages/shared/clients/src/{ModelCrudClient/ModelCrudClient.types.ts,ModelCrudClient/createModelCrudClient.ts,SqliteCrudClient/createSqliteCrudClient.{ts,test.ts}}`,
  F65's hunks of `SupabaseCrudClient/createSupabaseCrudClient.ts` (the `is` arm
  and `orderBy`; the filter iteration rewrite there is F18's),
  `packages/shared/clients/README.md`.

**Schema:** none.

**Verification:**
```sh
pnpm test:utils
pnpm test:clients
pnpm tsc -b --force
pnpm type-check:deno
```

---

## F66: Assign a record to one member, the Assigned to me queue, and the assignee filter

Status: not started. Built on `feat/individual-assignment`, merged into
`demo/measles` in `47414c244`. The commits are
`git log --no-merges 47414c244^1..47414c244^2` minus F65's three, plus the
desktop mirror `2dab001f8` (branch `chore/desktop-individuals-migration`,
reached `demo/measles` through `46b8476e0`). Not on `develop`, no PR.
`develop` has `individuals.assigned_to` (Sync leaves it alone since #301), with
no writer and no UI.

**Purpose:** A Case Records editor assigns a record to one workspace member, or
clears it, from a control right after the status control in the record header:
a menu of members by display name with Unassigned first for editors, plain text
for everyone else, "Former member" for someone who left. The pick saves at
once, a second pick waits for the first, and a failure restores the previous
assignee with a toast. A trigger refuses an assignee change by anyone who is
not a Case Records editor (so a Case Types editor can still sync) and an
assignee who is not a member of the record's workspace. "Assigned to me" is a
sidebar destination above the case types for anyone who can view records: it
pages through every record assigned to the signed-in user in this workspace,
grouped by case type, with a count and the status dot on each row. A case
type's records list gains an assignee filter (Anyone, Unassigned, or a member)
under the status filter, the count uses the same filter
(`makeRecordsListWhere`, which replaces `makeRecordsWhereFromStatusFilter`),
and each row names its assignee. No notifications, no activity event, no user
groups.
**Value:** A lead hands cases to investigators, and each investigator works a
personal queue.

**Design:** `docs/superpowers/specs/2026-11-08-individual-assignment-design.md`.
Plan: `docs/superpowers/plans/2026-11-08-individual-assignment.md`.

**PR title:** `feat(cases): assign a record to one member and list it under Assigned to me`

**Depends on:** F65 (`is: null` for Unassigned, `orderBy` for the queue), F60
(the records list, its count, and the record header it extends), F59
(`StatusDot` in the queue, `invalidateCaseStatusQueries`), F57
(`case_records__can_edit_record`, the sidebar links), and F18 (the record
page).

**Commits to read** (from `feat/individual-assignment`; `f177ec60b` is MIXED):

| SHA | Subject | Take |
|---|---|---|
| `f177ec60b` | docs(cases): plan assigning a record to one member | MIXED: the spec, the plan, and the `docs/production-plan-world-humanitarian-day.md` hunk. The `docs/measles-demo/measles-outbreak-response.md` hunk is F9. |
| `9ddbcd1f1` | feat(cases): guard who a record can be assigned to | All of it. Regenerate the migration. |
| `4ac9b2821` | feat(cases): filter a case type's records by assignee | All of it, including deleting `makeRecordsWhereFromStatusFilter/`. |
| `145f99853` | feat(cases): refresh assignee lists after a record is assigned | All of it. |
| `3284a4b46` | feat(cases): assign a record from its header | All of it. |
| `3d95f6258` | fix(cases): show the assignee trigger while members load | All of it. |
| `8a46bfebd` | feat(cases): show and filter who a record is assigned to | All of it. |
| `fae9e5bda` | feat(cases): list the records assigned to the signed-in user | All of it except `src/routeTree.gen.ts`, which regenerates. |
| `8a6d52a85` | refactor(cases): split the assigned queue sections to stay under the function length limit | All of it. |
| `83a923cce` | feat(cases): add assignment copy to the message catalogs | Regenerate the `.po` catalogs. |
| `0fd662f5a` | fix(cases): keep Assigned to me inside this workspace | All of it except the compiled catalogs, which regenerate. |
| `2dab001f8` | chore(desktop): generate the SQLite migration for individuals assignment | Regenerate with `pnpm desktop:sqlite:gen-migrations`. |

**Files:**
- Schema: F66's hunks of `supabase/schemas/20.individuals.sql`;
  `supabase/tests/database/individuals__assignment.test.sql` (new).
- Header control: `src/views/IndividualManagerApp/SingleIndividualView/RecordAssigneeControl/`
  and `useRecordAssigneeChange/` (new), and the `Group` wrapper and assignee
  control in `SingleIndividualView/index.tsx`.
- Records list: `IndividualNavbar/AssigneeFilter/AssigneeFilter.tsx` (new),
  F66's hunks of `IndividualNavbar/{IndividualNavbar,IndividualNavbarRows}.tsx`,
  `useConceptIndividuals.ts`, `useVirtualIndividualLinks.tsx`,
  `makeRecordsListWhere/` (new), and `makeRecordsWhereFromStatusFilter/` (deleted).
- Queue: `src/views/IndividualManagerApp/AssignedToMeView/` and
  `groupRecordsByCaseType/` (new), `src/routes/_auth/$workspaceSlug/individual-manager/assigned.tsx`
  (new), `src/config/AppLinks/AppLinks.tsx`, `src/config/NavbarLinks/NavbarLinks.tsx`,
  `src/components/layouts/RootLayout/{makeMainNavbarLinksFromPermissions.ts,WorkspaceLayout/WorkspaceLayout.test.ts}`.
- Cache: F66's hunks of `invalidateCaseStatusQueries/invalidateCaseStatusQueries.{ts,test.ts}`.
- Docs: the spec and plan, F66's hunks of `docs/ontology-architecture.md` and
  `docs/production-plan-world-humanitarian-day.md`.

**Schema:** one migration, `20261109032546_individuals_assignment.sql` (the
`individuals__check_assignment_change` trigger and
`idx_individuals__workspace_id_assigned_to`). Regenerate it with the
`supabase-declarative-schema` skill, and its desktop mirror with
`pnpm desktop:sqlite:gen-migrations`. Regenerate `src/routeTree.gen.ts` (the
route generator runs with `pnpm dev` or `pnpm build`).

**Verification:**
```sh
pnpm test:db
pnpm vitest run src/views/IndividualManagerApp src/components/layouts/RootLayout
pnpm tsc -b --force
pnpm desktop:sqlite:check-migrations
pnpm i18n:check
pnpm test:e2e case-statuses-list-filter.spec.ts
pnpm test:e2e case-statuses-record.spec.ts
```
Then, as a Case Records editor, assign a record to a second member, reload,
and check it under that member's Assigned to me and under the Unassigned and
member filters.

---

## F67: Let a drafted case type change its datasets

Status: not started. Built on `feat/case-draft-edit-sources`, merged into
`demo/measles` in `9b3c922f5` (one commit). Not on `develop`, no PR.

**Purpose:** The Case Manager chat's draft card could only remove a dataset,
so changing one meant discarding the suggestion. The card now reads every
workspace dataset with its columns (`DatasetClient.useGetAllDatasetsWithColumns`).
Each source section can switch to another dataset the draft does not already
use, pick its join key from that dataset's columns (keeping a key the model
named that the catalog lacks), and add one of its columns as a field. A
picker joins one more dataset (`CaseTypeDraftDatasetPicker`), and a draft can
drop to "No datasets" while it is edited. Switching or removing a dataset
drops its fields and, when its column leaves, the label.
**Value:** A suggestion that picked the wrong dataset is fixed in place instead
of being asked for again.

**PR title:** `feat(case-manager): let a drafted case type change its datasets`

**Depends on:** F62 (the card's status section) and F71 to F75 (the card's
value-shape and per-period controls, and `makeDateColumnOptions`). Its diff is
against that card.

**Commits to read** (from `feat/case-draft-edit-sources`):

| SHA | Subject | Take |
|---|---|---|
| `696870a50` | feat(case-manager): let a drafted case type change its datasets | All of it. Regenerate the `.po` catalogs the merge `9b3c922f5` extracted. |

**Files:** `src/components/ChatPanel/CaseTypeDraftBlock/{CaseTypeDraftBlock.tsx,CaseTypeDraftBlock.test.tsx,CaseTypeDraftCard.tsx,CaseTypeDraftCard.module.css,CaseTypeDraftDatasetPicker.tsx (new),CaseTypeDraftSourceSection.tsx,useCaseTypeDraftEditor.ts,useCaseTypeDraftEditor.test.ts}`.

**Schema:** none.

**Verification:**
```sh
pnpm vitest run src/components/ChatPanel/CaseTypeDraftBlock
pnpm tsc -b --force
pnpm i18n:check
```

---

## F68: Pin case details above the activity feed

Status: not started. Committed straight to `demo/measles` (`cb76ac57a`). Not
on `develop`, no PR.

**Purpose:** The record page's fields were a narrow rail beside the feed. They
now sit in a fixed band (15rem, scrolling on its own) above the activity feed,
which scrolls separately underneath, so reading a long update never moves the
fields off screen. In the band, each fact spans the content width with its
label on one line. `AppViewBody` with both `noPadding` and `isFillHeight` drops
its trailing padding so the regions reach the slate's bottom.
`docs/design/app-view-layout.md` records the record page as the exception to
"detail views get a rail".
**Value:** The facts someone reads while working a case stay in view.

**PR title:** `feat(cases): pin case details above the activity feed`

**Depends on:** F18 (the record page, feed, and `CaseDetailsRail` it moves),
F19 (`AppViewBody`'s `isFillHeight`), and F60 (`RecordFactsGroup`). Its new
`SingleIndividualView.test.tsx` mocks F60's `useRecordStatusChange`, F66's
`useRecordAssigneeChange`, and F71 to F75' `useRecordFields` (rows with
`dataType`, `valueShape`, `bucketGrain`, `sourceNames`), and its
`docs/ontology-architecture.md` row describes F71 to F75' field values, so
land it after F66 and F71 to F75, or trim those mocks and that row.

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `cb76ac57a` | feat(cases): pin case details above the activity feed | All of it. |

**Files:** `src/views/IndividualManagerApp/SingleIndividualView/{index.tsx,SingleIndividualView.module.css,SingleIndividualView.test.tsx (new),CaseDetailsRail.tsx,RecordFactsGroup/RecordFactsGroup.tsx}`
(the last two are doc comments), `src/components/layouts/AppView/AppViewBody/AppViewBody.module.css`,
`docs/design/app-view-layout.md`, `docs/ontology-architecture.md` (the record page row).

**Schema:** none.

**Verification:**
```sh
pnpm vitest run src/views/IndividualManagerApp/SingleIndividualView src/components/layouts/AppView
pnpm test:e2e case-activity.spec.ts
pnpm test:e2e record-page-field-values.spec.ts
```
Then open a record with many fields and a long feed at 1440px and 390px wide:
the band keeps its height and both regions scroll on their own.

---

## Notes for Joined cases (F69 to F76)

Source: `feat/joined-cases`, merged into `demo/measles` three times:
`dbd4ab1bc` (34 commits from `88f1b1a79..f84e126b9`), `32e728a51` (30
commits from `dbd4ab1bc..db45a9262`), and `ae039326d` (66 commits from
`32e728a51..0a3c63c54`, through `a6cc4629c Merge branch 'demo/measles' into
feat/joined-cases`). Between the second and third merge the branch was
fast-forwarded to `demo/measles`. Three docs commits (`7bcaa6da0`,
`c2bd1aeff`, `3a5fe4e6b`) were made directly on `demo/measles` and add the
branch's specs and plans under `docs/superpowers/`. Plans 1 to 4 were built;
plans 5 to 7 were not.

None of this work is on `develop`, and no open or merged PR covers any of it
(`gh pr list --state all --limit 60`, plus searches for "joined", "analyzer",
"snapshot", "value rule", "concept view", "record page"). `develop` already
has the concept view itself (`buildConceptViewSql.ts`), the SQL analyzer,
public snapshot reads, `docs/ontology-architecture.md`, and incremental Sync
(PR #301). Everything except F69 and F70 is built on F57 to F62.

---

## F69: Public snapshot reads refuse case type views, internal tables, and SQL analyzer bypasses

Status: not started. Built on `feat/joined-cases`, merged into `demo/measles`
in `ae039326d` (through `a6cc4629c`). The commits are the first four of
`git log --reverse 32e728a51..0a3c63c54`. The bug is on `develop`:
`develop`'s `src/clients/DuckDbClient/duckDbRawQuery.ts` checks, in public
mode, only that each dataset table a statement reads belongs to the snapshot,
and ignores every other relation and internal table the analyzer reports. No
PR.

**Purpose:** A public dashboard runs its SQL in the viewer's browser DuckDB.
That DuckDB instance can also hold what the viewer's own workspace session
built there: case type `concept_<id>` views, individuals staging tables, and
`reject_errors`/`reject_scans`. Public mode now refuses any relation that is
not a dataset and any internal table (the analyzer reports them in a required
`internalTableNames`), allows exactly one plain query, and requires a
staging table name to end in a UUID. Review then found 16 places where the
hand-written tokenizer read SQL differently from DuckDB and so missed a
private read, each confirmed against DuckDB and now closed: `TABLE`,
`PIVOT_WIDER`, `PIVOT_LONGER`, and `SHOW` read as sources; a CTE's scope
starts after its body (a recursive CTE's at its last top-level `UNION`); only
`WITH` lists declare CTEs; only symbol tokens count as structure; a
parenthesized join's first table and a table after a join's `ON` are read; a
line comment ends at `\r`; dollar quotes, E strings, and nested block comments
are refused; every statement must start with a read keyword; `PRAGMA`,
transaction, and `PREPARE`/`EXECUTE` statements are refused.
**Value:** A dashboard author can no longer write public SQL that shows a
viewer data from that viewer's own workspace. Nothing left the viewer's
browser before, but the public page could display it.

**Design:** `docs/superpowers/specs/2026-11-06-joined-cases-3-list-fields-design.md`
section 11, note 1 (ported with F74). The follow-up, a stronger boundary than a
hand tokenizer, is not built.

**PR title:** `fix(sql): refuse case type views and internal tables in public snapshot reads`

**Depends on:** F22's BUG-001 (`2193d0ef4`, `fix/analyzer-function-from`):
`6fb1b0fbd` rewrites the `_getFunctionArgumentFromIndexes` that BUG-001 adds
to `duckDbSqlSources.ts`, and the analyzer tests sit beside its EXTRACT
cases. Nothing else.

**Commits to read** (from `feat/joined-cases`; none is `MIXED`):

| SHA | Subject | Take |
|---|---|---|
| `a2601ad2a` | fix(joined-cases): refuse case type views in public snapshot reads | All of it. |
| `f0780197f` | fix(joined-cases): refuse internal tables in public snapshot reads | All of it. |
| `025b6de3d` | fix(joined-cases): close public snapshot read bypasses in the SQL analyzer | All of it: `RawQueryReadScope`, `isSinglePlainQuery`, the UUID staging suffix, `duckDbSqlCteScopes.ts`, `duckDbSqlStatements.ts`, and `duckDbSqlSyntax.ts` (new). |
| `6fb1b0fbd` | fix(joined-cases): read only symbols as SQL structure in the analyzer | All of it, including the `compileBufferOfLayerQuery.test.ts` expectation. |

**Files:**
- `src/clients/DuckDbClient/duckDbRawQuery.ts`: the public read checks.
- `src/clients/DuckDbClient/duckDbSqlText.ts`: only the
  `STAGING_INDIVIDUALS_ID_REGEX` hunk.
- `src/lib/sql/DuckDbSqlAnalyzer/`: `DuckDbSqlAnalyzer.ts`,
  `DuckDbSqlAnalyzer.types.ts` (`internalTableNames`),
  `DuckDbSqlAnalyzer.test.ts`, `duckDbSqlSources.ts`, `duckDbSqlCteScopes.ts`,
  `duckDbSqlStatements.ts`, `duckDbSqlSyntax.ts` (new), `duckDbSqlTokens.ts`
  (`isSymbolToken`), `duckDbSqlIdentifiers.ts`, `duckDbSqlMutations.ts`.
- Tests: `src/clients/DuckDbClient/__tests__/DuckDbClient.publicSnapshotReads.test.ts`
  and `src/clients/maps/MapLayerSpatialQuery/compileBufferOfLayerQuery/compileBufferOfLayerQuery.test.ts`.

**Schema:** none.

**Verification:**
```sh
pnpm eslint src/clients/DuckDbClient src/lib/sql src/clients/maps/MapLayerSpatialQuery
pnpm tsc -b --force
pnpm vitest run src/clients/DuckDbClient src/lib/sql src/clients/maps/MapLayerSpatialQuery
```

---

## F70: DuckDB results read list, struct, decimal, date, and time values correctly

Status: not started. Built on `feat/joined-cases`. Its commits came in all
three merges: lists and structs in `dbd4ab1bc`, decimals in `32e728a51`, and
list dates and times in `ae039326d`. The bug is on `develop`:
`develop`'s `src/clients/DuckDbClient/duckDbArrowResults.ts` calls
`item.toJSON()` on every list element, so any non-empty list column throws
`item.toJSON is not a function` (an empty number list becomes a typed array),
and it reads a DECIMAL through `valueOf()`, which drops its scale (2.25 reads
as 225). No PR.

**Purpose:** `arrowTableToJS` returns a LIST column as a plain array and
recurses into vectors, struct rows, and map rows, so a struct's fields, a list
of structs, and a decimal inside a list convert like top-level values. A
DECIMAL converts through its exact decimal string and keeps its scale, at top
level and inside lists and structs. A list's dates arrive as `YYYY-MM-DD`,
timestamps as ISO strings, and times as `HH:MM:SS(.ffffff)` clock times.
`arrowFieldToQueryResultField` reports a LIST column as `varchar` with
`isArray: true` instead of logging "Unhandleable arrow type", so controls that
build SQL from a column's values can refuse it.
**Value:** Any query that returns a case type list field, or a DECIMAL, works
and shows the right numbers in the Data Explorer, dashboards, and maps.

**Design:** `docs/superpowers/specs/2026-11-06-joined-cases-1-record-page-concept-view-design.md`
section 4.6 and section 11 note 4 (ported with F72).

**PR title:** `fix(duckdb): read list, struct, and decimal values from query results`

**Depends on:** none.

**Commits to read** (from `feat/joined-cases`; one is `MIXED`):

| SHA | Subject | Take |
|---|---|---|
| `2ce4d5056` | fix(joined-cases): return list columns from DuckDB as plain arrays | All of it: moves `duckDbArrowResults.ts` into `duckDbArrowResults/` and updates its two importers. |
| `e55e7aa68` | fix(joined-cases): convert structs and decimals inside DuckDB lists | All of it. |
| `5200756d3` | test(joined-cases): scale-free decimal list test and clearer struct test name | All of it. |
| `05bfcf835` | fix(joined-cases): keep a DECIMAL value's scale when reading DuckDB results | All of it. |
| `f1bd3ada5` | fix(joined-cases): round DuckDB decimals exactly and tidy the view tests | MIXED: `duckDbArrowResults.{ts,test.ts}` here; the `buildConceptViewSql.executed.test.ts` tidy goes to F73. |
| `f98170b51` | feat(joined-cases): mark list result columns and read list dates as days | All of it. |
| `8da6e68d4` | fix(joined-cases): read a list's times as clock times | All of it. |

**Files:**
- `src/clients/DuckDbClient/duckDbArrowResults/duckDbArrowResults.ts` (moved
  from `src/clients/DuckDbClient/duckDbArrowResults.ts`) and
  `duckDbArrowResults.test.ts` (new): take them as `8da6e68d4` left them. F75
  adds its own hunks later.
- The import path in `src/clients/DuckDbClient/duckDbRawQuery.ts` and
  `src/clients/DuckDbClient/duckDbStructuredQuery.ts`.
- `src/clients/DuckDbClient/arrowFieldToQueryResultField.ts`.
- `shared/models/queries/QueryResult/QueryResult.types.ts`: only `isArray`.

**Schema:** none.

**Verification:**
```sh
pnpm eslint src/clients/DuckDbClient shared/models/queries/QueryResult
pnpm tsc -b --force
pnpm vitest run src/clients/DuckDbClient shared/models/queries/QueryResult
```

---

## F71: One NULL-ignoring value rule function for case type views and Sync, records read by key, and spine restrictions

Status: not started. Built on `feat/joined-cases`, merged into `demo/measles`
in `dbd4ab1bc`, plus one fix (`2c00baf97`) from the third merge
(`ae039326d`). `develop` has the concept view but none of this.

**Purpose:** `buildAttributeValueSql` is now the only code that turns a
field's mapped rows into its value. The case type view (`concept_<id>`) and
Sync's record name both use it. Every rule ignores NULL, and a list keeps
every non-NULL value in file order and is `[]` when there is none. Each view
column carries its field's `attributeId`. Column names compare without regard
to case, as DuckDB does: a field named `EXTERNAL_ID` becomes `EXTERNAL_ID_2`,
and `age` and `Age` become `age` and `Age_2`. `getIndividualsByExternalIds`
reads records by key in batches of 50, reading a key that starts with a space
or tab, or holds `"` or `\`, by equality because PostgREST would misread it in
an `in` list. A workspace query can pass `conceptSpineRestrictions` to narrow a
case type's spine to the records it names (at most 500 unique keys). An empty
restriction loads no records, a restriction on SQL that reads no such case
type is refused, a session with no planner refuses one, and a nested
virtual-dataset query never receives it because its bytes are cached without
it. Out-of-sync case type structured queries now run as SQL over the view and
return the SQL they ran, instead of a fallback that ignored filters,
grouping, aggregation, and sort. The concept wrapper, registered but never
resolved, is deleted. A key column whose name holds `"` now compiles.
**Value:** One definition of a field's value, so the view, Sync, and (after
F72) the record page cannot disagree, and a screen can compute values for a
few records without computing the whole case type.

**Design:** `docs/superpowers/specs/2026-11-06-joined-cases-1-record-page-concept-view-design.md`
sections 4.2 to 4.4 and 4.8, and plan
`docs/superpowers/plans/2026-11-06-joined-cases-1-record-page-concept-view.md`.
Both files land with F72.

**PR title:** `feat(cases): compute case type values with one rule function and read chosen records`

**Depends on:** F57 to F62: the spine and view files this rewrites
(`loadConceptSpine.ts`, `getConceptRelationPlansFromSql.ts`,
`conceptRelation.types.ts`, `buildConceptViewSql.ts`,
`makeConceptAttributeColumnsFromMetadata.ts`, `generateIndividuals.ts`) carry
its status column, and `runStructuredQuery.test.ts` carries its status-column
test. F1: `QueryMediator.ts` and `WorkspaceQuerySession.ts` use F1's named
create calls. The Postgres branch also owns hunks in four files here (see
Files); this feature does not need it.

**Commits to read** (from `feat/joined-cases`; two are `MIXED`):

| SHA | Subject | Take |
|---|---|---|
| `4a2334cf8` | feat(joined-cases): read attribute values with one NULL-ignoring rule function | All of it: `buildAttributeValueSql` with its executed tests, and the quoted key comparison in `duckDbSqlText.ts`. |
| `1c905fc42` | feat(joined-cases): carry each attribute's id on its concept view column | All of it. |
| `630e8391c` | fix(joined-cases): compare concept view column names without regard to case | All of it. |
| `db758628c` | feat(joined-cases): build the concept view and Sync names from buildAttributeValueSql | All of it. |
| `e061cf266` | docs(joined-cases): reword two stale comments in the concept view | All of it. |
| `e2afada6b` | feat(joined-cases): read a concept's records by key in bounded batches | All of it. |
| `aa5cb7870` | fix(joined-cases): read keys with leading whitespace by equality | All of it. |
| `a54e44a67` | feat(joined-cases): restrict a concept's spine to the records a caller names | All of it. |
| `0e73b5f77` | fix(joined-cases): count each restricted key once and pin empty restrictions | All of it. |
| `1ee2e4b2a` | feat(joined-cases): pass spine restrictions from a workspace query to the concept planner | All of it. |
| `a127eb738` | test(joined-cases): pin spine restriction boundaries and keep them out of nested queries | All of it. The 3-line comment in `src/clients/qetl/QueryMediator/relationLoading/createRegistryForFetch.ts` is in a Postgres-branch file: on `develop`, put it beside the nested Parquet query's `runQuery` call wherever that lives. |
| `ae5c9577c` | refactor(joined-cases): run out-of-sync case type queries as SQL over the view | All of it. |
| `03200ef38` | docs(joined-cases): describe the query runner's single SQL path | All of it. |
| `7b7a14fc3` | refactor(joined-cases): remove the concept wrapper no query path resolves | All of it. |
| `007216462` | docs(joined-cases): describe one value implementation and the record page's read path | MIXED: only `docs/qetl-architecture.md`. Its wrappers row says "and Postgres wrappers"; on `develop` list only Parquet, virtual, and Sheets. `ontology-architecture.md` and `description-logic-nomenclature.md` go to F72, `open-data-catalog-architecture.md` to F9. |
| `2c11911b6` | refactor(joined-cases): drop helpers and a sort the deleted readers left behind | MIXED: the `buildConceptViewSql.ts` comment and the `runStructuredQueryWithMetadata.ts` sort removal here; deleting the two `higherOrderFuncs.ts` files goes to F72, because only `AttributeAssertionClient` used them. |
| `2c00baf97` | fix(joined-cases): return the SQL an out-of-sync structured query ran | All of it. Fixes `ae5c9577c`: `executedSql` was undefined on that path. |

**Files:**
- Value SQL: `src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/buildAttributeValueSql.{ts,executed.test.ts}`
  (new) and the `getEntityKeyComparisonSql` hunk of
  `src/clients/DuckDbClient/duckDbSqlText.ts`.
- View: `conceptRelation/buildConceptViewSql/buildConceptViewSql.{ts,executed.test.ts}`,
  `conceptRelation/makeConceptAttributeColumnsFromMetadata.ts`,
  `conceptRelation/__tests__/conceptAttributeColumns.integration.executed.test.ts`.
- Sync: `src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/generateIndividuals.ts`.
- Records by key: `conceptRelation/getIndividualsByExternalIds/getIndividualsByExternalIds.{ts,test.ts}` (new).
- Spine restrictions: `conceptRelation/conceptRelation.types.ts`,
  `conceptRelation/getConceptAttributeColumnsFromConceptId.ts` (new),
  `conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql.{ts,test.ts}`,
  `conceptRelation/loadConceptSpine/loadConceptSpine.ts`,
  `src/clients/qetl/QueryMediator/{QueryMediator.ts,QueryMediator.types.ts,queryRunner.ts}`,
  `QueryMediator/__tests__/QueryMediator.concepts.test.ts`,
  `QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery.test.ts`,
  `src/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession.{ts,membership.test.ts}`.
  `QueryMediator.types.ts` and `queryRunner.ts` also hold Postgres-branch hunks.
- One SQL path: `src/clients/queries/runStructuredQuery/{runStructuredQueryWithMetadata.ts,runStructuredQuery.types.ts,runStructuredQuery.test.ts}`.
- Concept wrapper (deleted): `src/clients/qetl/wrappers/ConceptWrapper/{ConceptWrapper.ts,ConceptWrapper.test.ts,buildConceptQueryResult.ts}`;
  `src/clients/qetl/wrappers/createDefaultRegistry.{ts,test.ts}` stop
  registering it (the `.ts` also holds Postgres-branch hunks).
- Docs: `docs/qetl-architecture.md`.

**Schema:** none.

**Verification:**
```sh
pnpm eslint src/clients/qetl src/clients/queries src/clients/DuckDbClient src/views/OntologyDesignerApp/ConceptMetaView
pnpm tsc -b --force
pnpm vitest run src/clients/qetl src/clients/queries src/views/OntologyDesignerApp/ConceptMetaView
pnpm test:executed src/clients/qetl/QueryMediator/conceptRelation tests/integration/queries
```

---

## F72: The record page reads field values from the case type view

Status: not started. Built on `feat/joined-cases`, merged into `demo/measles`
in `dbd4ab1bc`. The plan docs come from the three direct docs commits.
`develop` has none of it.

**Purpose:** `ConceptRecordValuesClient.getConceptRecordValues` reads a few
records' field values from the case type view through F71's restricted spine:
it checks the 500-record cap before any read, runs the column read and the
value read concurrently, and throws when the two disagree (a field was edited
between them), which a retry recovers from. The record page's `useRecordFields`
loads the values and the source datasets together. Its Details rail lists
every field in view order, shows a dimmed "No value" for an empty one, names
every dataset a field reads (de-duplicated by dataset id), and shows a
callout with a retry that re-runs only the failed reads. A failed source read
shows the fields without source names. A Google Sheets or Postgres refresh
that changes rows now marks record values stale. The record page's own value
reader is deleted (`AttributeAssertionClient`, the `AttributeAssertion` model,
and `useHydratedIndividual.ts`): it disagreed with the view on NULL under
`most_frequent`, ignored list fields, threw on manual-entry fields, and
spliced the record key into SQL as an unescaped literal.
**Value:** The record page shows the same value the Data Explorer and
dashboards show for every field, including lists and manual-entry fields.

**Design:** umbrella spec `docs/superpowers/specs/2026-11-06-joined-cases-design.md`,
plan index `docs/superpowers/plans/2026-11-06-joined-cases.md`, spec
`docs/superpowers/specs/2026-11-06-joined-cases-1-record-page-concept-view-design.md`
(sections 4.5, 4.7, 11), and plan
`docs/superpowers/plans/2026-11-06-joined-cases-1-record-page-concept-view.md`.
All four land with this PR. Take their final content. Decide with the user
whether `docs/superpowers/` is their home on `develop`, as F9 asks for
`docs/measles-demo/`.

**PR title:** `feat(cases): read the record page's field values from the case type view`

**Depends on:** F71 (restricted spines, `getIndividualsByExternalIds`,
`buildAttributeValueSql`), F70 (list cells reach the rail as arrays), F18 (the
AppView record page and `CaseDetailsRail` this rewrites, `56e27bfb4`),
F57 to F62 (the record page with a status control and
`useHydratedIndividual.ts`, `51da35e78`; the `toCsvRows` rename).

**Commits to read** (from `feat/joined-cases` and the direct docs commits; five are `MIXED`):

| SHA | Subject | Take |
|---|---|---|
| `42b5838cb` | feat(joined-cases): read records' field values from the concept view | All of it. |
| `a9730f086` | fix(joined-cases): detect field changes between the record values reads | All of it, including its `getConceptRelationPlansFromSql.ts` hunk. |
| `058361a3a` | feat(joined-cases): refresh record values when a dataset refresh changes rows | All of it. The `useRefreshPostgresTableDataset.ts` import is in a Postgres-branch file: it goes with whichever of the two lands second. |
| `c76f10aed` | test(joined-cases): seed two case types in the record values invalidation test | All of it. |
| `d603051d6` | feat(joined-cases): show no value, every source, and a load failure in the record rail | All of it, including the video producer's `RecordDetail.tsx`. |
| `361ce0bbf` | fix(joined-cases): keep the rail's retry button its own width and key duplicate dataset names | All of it. |
| `7fb5d941a` | feat(joined-cases): build record rail rows from field values and mappings | All of it. |
| `dd43976eb` | test(joined-cases): cover source name order, missing datasets and manual-entry mappings | All of it. |
| `55d2c39d0` | feat(joined-cases): read the record page's fields from the concept view | All of it: deletes `useHydratedIndividual.ts`. |
| `50a48e324` | fix(joined-cases): load the record page's fields and sources together and retry only failed reads | All of it. |
| `c6b410ad3` | refactor(joined-cases): delete the record page's own value reader and the assertion model | All of it: the deletions, plus comment and test-mock cleanups in five files. |
| `7df906a03` | test(joined-cases): show a record's field value and source on its page end to end | All of it. |
| `007216462` | docs(joined-cases): describe one value implementation and the record page's read path | MIXED: only `docs/ontology-architecture.md` and `docs/description-logic-nomenclature.md`. |
| `107c3ad32` | fix(joined-cases): pass lint and translate the record load failure | All of it. |
| `2c11911b6` | refactor(joined-cases): drop helpers and a sort the deleted readers left behind | MIXED: only the deletion of `shared/lib/strings/higherOrderFuncs.ts` and `src/lib/utils/sets/higherOrderFuncs.ts`. |
| `0e066cb61` | docs(joined-cases): record what the record page work shipped and its follow-ups | All of it. |
| `f84e126b9` | docs(joined-cases): show "No value" for a record's empty fields | All of it. |
| `7bcaa6da0` | Fixed lint and added specs and plans | MIXED: only the umbrella spec, the plan index, and spec and plan 1 (final content). Other docs go to F73 to F76; the source hunks are F22 formatting. |
| `3a5fe4e6b` | docs(joined-cases): reconcile the joined cases specs and plans | MIXED (docs): only the umbrella spec's hunks. |
| `db45a9262` | docs(joined-cases): carry the plan 1 and 2 follow-ups into plans 3 to 6 | MIXED (docs): only the plan index hunk. |

**Files:**
- Client: `src/clients/ontology/ConceptRecordValuesClient/{ConceptRecordValuesClient.ts,ConceptRecordValuesClient.types.ts,ConceptRecordValuesClient.test.ts}`
  and `makeConceptRecordValuesFromRows/makeConceptRecordValuesFromRows.{ts,test.ts}` (all new).
- Record page: `src/views/IndividualManagerApp/SingleIndividualView/index.tsx`,
  `CaseDetailsRail.{tsx,test.tsx,module.css}`,
  `useRecordFields/useRecordFields.{ts,test.ts}` (new),
  `useRecordFields/makeCaseDetailsRowsFromAttributes/makeCaseDetailsRowsFromAttributes.{ts,test.ts}` (new),
  `useHydratedIndividual.ts` (deleted). Take the rail and page as `f84e126b9`
  left them; F74 and F75 change them later, and so do F66 and F68.
- Refresh: `src/views/DataManagerApp/DatasetMetaView/invalidateDatasetRowQueries/invalidateDatasetRowQueries.{ts,test.ts}`
  (moved into its folder; the test is new), `useRefreshGoogleSheetDataset.ts`,
  and the import in `useRefreshPostgresTableDataset/useRefreshPostgresTableDataset.ts`.
- Deleted reader: `shared/models/ontology/AttributeAssertion/{AttributeAssertion.ts,AttributeAssertion.types.ts}`,
  `src/clients/ontology/AttributeAssertionClient/AttributeAssertionClient.ts`,
  `src/clients/ontology/AttributeAssertionClient/getAttributeAssertions/{getAttributeAssertions.ts,getDatasetColumnAssertions.ts,getSQLSelectOfMapping.ts}`,
  `shared/lib/strings/higherOrderFuncs.ts`, `src/lib/utils/sets/higherOrderFuncs.ts`.
- Cleanups after the deletion (comments and mocks only):
  `conceptRelation/loadConceptSpine/loadConceptSpine.ts`,
  `conceptRelation/makeConceptAttributeColumnsFromMetadata.ts`,
  `conceptRelation/toCsvRows/toCsvRows.ts`,
  `conceptRelation/__tests__/conceptAttributeColumns.integration.executed.test.ts`,
  `src/clients/queries/runColumnSchemaQuery/runColumnSchemaQuery.test.ts`,
  `src/views/GisApp/layers/useMapLayersData/useMapLayersData.test.ts`, and the
  `a9730f086` hunk of `getConceptRelationPlansFromSql.ts`.
- Video producer: `apps/ava-video-producer/avandar-adapter/CasesScreen/RecordDetail.tsx` (`sourceNames`).
- E2E: `tests/e2e/record-page-field-values.spec.ts` (new).
- Docs: the four plan docs above, `docs/ontology-architecture.md`,
  `docs/description-logic-nomenclature.md`, and the record-field exception in
  `docs/design/app-view-layout.md`.
- `src/i18n/locales/*/messages.po`: regenerate, never copy.

**Schema:** none.

**Verification:**
```sh
pnpm i18n:extract
pnpm eslint src/clients/ontology src/views/IndividualManagerApp src/views/DataManagerApp/DatasetMetaView
pnpm tsc -b --force
pnpm type-check:video-producer
pnpm vitest run src/clients/ontology src/clients/qetl src/views/IndividualManagerApp src/views/DataManagerApp/DatasetMetaView
pnpm test:executed src/clients/qetl/QueryMediator/conceptRelation
pnpm test:e2e record-page-field-values.spec.ts
pnpm test:e2e case-activity.spec.ts
```

---

## F73: Typed value rules: only the rules a column's type allows, each with its own output type

Status: not started. Built on `feat/joined-cases`, merged into `demo/measles`
in `32e728a51`, plus one fix (`07587ee65`) from the third merge. `develop` has
none of it.

**Purpose:** `ValuePickerRule` holds one table: for each rule, the column
types it allows and the type it outputs (`count` is `bigint`, `sum` and `avg`
are `double`, every other rule keeps the column's type), with
`DEFAULT_RULE_TYPE` (`most_frequent`) allowed for every type. The case type
view emits each rule's own type instead of casting `max` and `min` to
`DOUBLE`, so they work on dates and text. Text `max` and `min` compare
alphabetically, ignoring case and accents, through `arg_max`/`arg_min` over
`{k: lower(strip_accents(CAST(v AS VARCHAR))), v}`, so the "Alphabetically
first/last" labels are true. The planner refuses a rule a column's type does
not allow, with a message saying how that arises. Chat's case manager is told
which rules each column type allows, its proposal parser requires the
catalog columns and holds each proposed rule to its column type, and a
chat-created field stores its rule's output type. An identifier always uses
the default rule, so it shows the record's key. The draft card and the case
type form offer only allowed rules. An ID field's rule is locked to the
default with the note "ID fields keep their value as is.", as soon as the ID
is picked, and the draft card locks a join key's rule the same way. A
hand-written migration replaces stored rules a column's type does not allow
with `most_frequent` and corrects every dataset-column field's stored
`data_type`.
**Value:** A user can no longer pick a rule that fails or silently changes a
value's type, and every field's stored type matches what its queries return.

**Design:** `docs/superpowers/specs/2026-11-06-joined-cases-2-typed-value-rules-design.md`
(section 11 lists what was built) and
`docs/superpowers/plans/2026-11-06-joined-cases-2-typed-value-rules.md`. Port
both with this PR.

**PR title:** `feat(cases): offer only the value rules a column's type allows, and type each rule's output`

**Depends on:** F71 (`buildAttributeValueSql`, the view, Sync), F70 (dropping
the `DOUBLE` cast exposes the DECIMAL scale bug F70 fixes), F57 to F62
(the draft card, chat proposal, form, and `createdCaseTypeToFormValues` files
carry its status work, and the migration's replay prelude inserts
`concept_statuses`), F22 (`PostChatMessages.ts` and
`parseOpenRouterResponse.ts` carry its chat fixes).

**Commits to read** (from `feat/joined-cases`; three are `MIXED`):

| SHA | Subject | Take |
|---|---|---|
| `c901aed35` | feat(joined-cases): add the ValuePickerRule output type table | All of it. |
| `039ca86f1` | docs(joined-cases): document ValuePickerRule on its exported keys | All of it. |
| `29f0fd872` | docs(joined-cases): document DEFAULT_RULE_TYPE on its exported key | All of it. |
| `15a951dee` | feat(joined-cases): emit each value rule's own type from the concept view | All of it. |
| `8541e48fe` | test(joined-cases): name the value rule type tests after what they assert | All of it. |
| `f1bd3ada5` | fix(joined-cases): round DuckDB decimals exactly and tidy the view tests | MIXED: only `buildConceptViewSql.executed.test.ts`. The Arrow hunks are F70. |
| `3e6d417c8` | feat(joined-cases): refuse a value rule its column type does not allow | All of it. |
| `5213b4e02` | fix(joined-cases): describe how a disallowed value rule arises | All of it. |
| `53bb9e0ba` | feat(joined-cases): hold chat-proposed value rules to their column types | All of it. |
| `ae1bf2bd5` | refactor(joined-cases): require catalog columns when parsing a proposed case type | All of it. |
| `393b8c2d3` | feat(joined-cases): tell the case manager model which rules each column type allows | All of it. |
| `8ea59f53c` | feat(joined-cases): store each chat-created field's rule output type | All of it. |
| `1e23bd0b0` | fix(joined-cases): keep an identifier's column type and tidy chat field rules | All of it. |
| `9988d2bd6` | feat(joined-cases): offer only allowed value rules in the case type draft card | All of it. |
| `1a156719a` | refactor(joined-cases): split the draft card's value rule select | All of it: `CaseTypeDraftValueRuleSelect.tsx` (new). |
| `821b7a481` | feat(joined-cases): offer only allowed value rules in the case type form | All of it, including the video producer's `MappingFields.tsx`. |
| `6c359c9bc` | fix(joined-cases): show that an ID field keeps its value in the case type form | All of it. |
| `0c4c2213f` | fix(joined-cases): lock an ID field's rule as soon as the ID is picked | All of it. |
| `89ef1ec8e` | refactor(joined-cases): give DatasetColumnMappingCreator its own folder | All of it. |
| `4186228e6` | feat(joined-cases): correct stored value rules and field data types | All of it: the hand-written migration, its replay prelude and assertions, and the replay entry in `scripts/test-dashboard-publishing-migrations.sh`. |
| `f0c077233` | fix(joined-cases): give stored identifier fields their key column's values | All of it. |
| `ecf877dfe` | test(joined-cases): cover every guard in the value rule migration replay | All of it. |
| `a4ed6c2bb` | docs(joined-cases): describe typed value rules in the ontology architecture | All of it. |
| `fb0ea09c7` | docs(joined-cases): record how typed value rules were built | All of it. |
| `d85b30ab3` | fix(joined-cases): align the post-migration check with the value rule migration | All of it. |
| `ba5110cef` | feat(joined-cases): compare text alphabetically under max and min | All of it. |
| `52f58146c` | fix(joined-cases): compare non-VARCHAR text columns alphabetically, faster | All of it. |
| `0ade60caa` | docs(joined-cases): record the alphabetical text comparison decision | All of it. |
| `07587ee65` | fix(joined-cases): show a draft join key keeping its value as is | All of it. From the third merge; it fixes this feature's draft card, which showed a join key's proposed rule although creation saves the default. |
| `fa90bd778` | feat(joined-cases): store no value rule for a field that keeps every value | MIXED: only `apps/desktop/migrations/20261108031541_correct_value_rule_data_types.gen.sql`, this feature's desktop mirror that the second merge forgot. Regenerate it. Everything else is F74. |
| `7bcaa6da0` | Fixed lint and added specs and plans | MIXED: only spec and plan 2 (final content). |

**Files:**
- Model: `shared/models/ontology/ValuePickerRule/ValuePickerRule.ts` and
  `ValuePickerRuleModule/ValuePickerRuleModule.{ts,test.ts}` (all new).
- Engine: `buildAttributeValueSql.{ts,executed.test.ts}`,
  `buildConceptViewSql.{ts,executed.test.ts}`,
  `makeConceptAttributeColumnsFromMetadata.ts`,
  `__tests__/conceptAttributeColumns.integration.executed.test.ts`,
  `QueryMediator/__tests__/QueryMediator.concepts.test.ts`,
  `getNeededColumnsFromQuery/getNeededColumnsFromQuery.test.ts`, and
  `src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/generateIndividuals.{ts,test.ts}`.
- Chat: under `supabase/functions/chat/`: `PostChatMessages/PostChatMessages.ts`,
  `PostChatMessages/parsing/{parseOpenRouterResponse,parseProposeCaseType}.{ts,test.ts}`,
  `PostChatMessages/runChatAttemptsWithEscalation/runChatAttemptsWithEscalation.{ts,test.ts}`,
  `PostChatMessages/prompt/{buildCaseManagerSystemPrompt,makeChatToolConfigFromOptions}.{ts,test.ts}`,
  `chatWorkspaceDatasetScoping.test.ts`; and
  `src/views/OntologyDesignerApp/createdCaseTypeToFormValues/createdCaseTypeToFormValues.{ts,test.ts}`.
- Draft card: `src/components/ChatPanel/CaseTypeDraftBlock/{CaseTypeDraftAttributeRow.tsx,CaseTypeDraftBlock.tsx,CaseTypeDraftBlock.test.tsx,CaseTypeDraftCard.tsx,CaseTypeDraftSourceSection.tsx,CaseTypeDraftValueRuleSelect.tsx (new),useValuePickerOptions.ts}`.
  This feature edits `CaseTypeDraftAttributeRow.tsx` at that path; F74 later
  splits it into `CaseTypeDraftAttributeRow/`.
- Form: `src/views/OntologyDesignerApp/ConceptCreatorView/{index.tsx,conceptFormTypes.ts,conceptFormTypes.test.ts}`,
  `DatasetColumnAttributesBlock/{index.tsx,index.test.tsx (new)}`,
  `DatasetColumnAttributesBlock/DatasetColumnMappingCreator/DatasetColumnMappingCreator.{tsx,test.tsx}`
  (moved into its folder by `89ef1ec8e`), and
  `apps/ava-video-producer/avandar-adapter/AttributeMappingScreen/MappingFields.tsx`.
- Migration: `supabase/migrations/20261108031541_correct_value_rule_data_types.sql`,
  `supabase/migration-upgrade-tests/value_rule_data_types.{prelude,assertions}.sql` (new),
  the replay entry in `scripts/test-dashboard-publishing-migrations.sh`, and the
  desktop mirror.
- Docs: spec and plan 2, `docs/ontology-architecture.md` (typed rules sections).
- `src/i18n/locales/*/messages.po`: regenerate.

**Schema:** one hand-written data migration,
`20261108031541_correct_value_rule_data_types.sql`. `db diff` never emits DML,
so port its SQL by hand with a new timestamp that sorts after everything on
`develop`, and change the path in `scripts/test-dashboard-publishing-migrations.sh`
to match, or the replay runs the wrong file. Each statement skips rows that
are already right, so a re-run changes nothing: the demo database, which ran
it under its old name, is safe when `develop` merges back. The desktop mirror
is a header with no statements: regenerate it with
`pnpm desktop:sqlite:gen-migrations`. No `database.types.ts` change.

**Verification:**
```sh
pnpm i18n:extract
pnpm eslint shared/models/ontology src/clients/qetl src/components/ChatPanel/CaseTypeDraftBlock src/views/OntologyDesignerApp supabase/functions/chat
pnpm type-check
pnpm vitest run shared/models/ontology/ValuePickerRule src/clients/qetl src/components/ChatPanel/CaseTypeDraftBlock src/views/OntologyDesignerApp supabase/functions/chat
pnpm test:executed src/clients/qetl/QueryMediator/conceptRelation
pnpm test:db
pnpm desktop:sqlite:gen-migrations && pnpm desktop:sqlite:check-migrations
```

---

## F74: List fields: a case type field that keeps every value

Status: not started. Built on `feat/joined-cases`, merged into `demo/measles`
in `ae039326d` (through `a6cc4629c`). The commits are
`git log --reverse 6fb1b0fbd..4636237d5` minus `2c00baf97` (F71), `f98170b51`
and `8da6e68d4` (F70), and `07587ee65` (F73). Its end-to-end spec never ran
green on the branch: the local stack stopped answering
(`docs/superpowers/specs/2026-11-06-joined-cases-4-bucketed-list-fields-design.md`
section 12, follow-up 1). `develop` has none of it.

**Purpose:** A case type field can keep every value instead of one. Each field
has a value shape (`ConceptAttribute.getValueShape`: single or list). A list
field stores no value rule: `value_picker_rule_type` is nullable, and
`rpc_concepts__create` refuses a dataset field whose rule does not match its
shape (`value_rule_mismatch`) and a list that is the title or an identifier
(`list_field_is_key_or_label`). The view reads each field by its shape, and an
unmapped list is a typed empty list. Chat proposes list fields where a case
has several values and creates them with no rule. The draft card and the
case type form have a "one value" or "every value" switch, locked with a note
for ID fields and the title. In the Data Explorer a list takes only `none`,
group by, and count, stays out of filters, and a saved aggregation or filter
it cannot take is reset or dropped with a translated reason. Dashboard local
filters, and the GIS measure, operation, time, size-by, disputed status, and
join key pickers, leave lists out. The record page lists every value of a list
("Show all <n> values"), shows each value by its field's type (numbers grouped
and at full precision, dates in UTC, times as clock times, empty text as no
value), names each field's sources as a list "Sources of <field>", and fixes
its heading order (`Callout` gains `titleOrder`). Chat's SQL context lists
each field under its view column name and marks lists, online and offline.
Fields whose names collide (case-insensitively, or with `external_id` or
`status`) now read their own view column in structured queries, map layers,
and chat, and duplicates get distinct result names (`Age_2`). The SQLite
mirror rebuilds `attribute_mappings__dataset_column` to allow a NULL rule.
**Value:** A case can hold every symptom, lab result, or contact a dataset has
for it, and every screen shows and queries that list without failing.

**Design:** `docs/superpowers/specs/2026-11-06-joined-cases-3-list-fields-design.md`
(section 11 lists what was built) and
`docs/superpowers/plans/2026-11-06-joined-cases-3-list-fields.md`. Port both.

**PR title:** `feat(cases): let a case type field keep every value`. It must be
`feat`: `Callout.titleOrder` is a new `@avandar/ui` API and needs a minor bump.

**Depends on:** F73 (rule table, `ValueRuleField` is split out of its form
field, `CaseTypeDraftValueRuleSelect`), F72 (the record page it extends), F71
(the view), F70 (list results and `isArray`), F57 to F62 (the
regenerated `rpc_concepts__create` has its `p_statuses` signature, the view
reserves its `status` column, `ConceptStatusColumn`), F22
(`makeDataGridColumnDefs.ts` and `chat.types.ts` carry its fixes),
F81 to F85 (offline mode in `offlineChat.types.ts`, `5f51ce819`).

**Commits to read** (from `feat/joined-cases`; three are `MIXED`):

| SHA | Subject | Take |
|---|---|---|
| `70e272e31` | feat(joined-cases): give case type fields a value shape | All of it: `ConceptAttributeModule` (new). |
| `a9ac71872` | refactor(joined-cases): read the value rule type from its model namespace | All of it. |
| `fa90bd778` | feat(joined-cases): store no value rule for a field that keeps every value | MIXED: everything except `apps/desktop/migrations/20261108031541_correct_value_rule_data_types.gen.sql` (F73). Regenerate the migration and its desktop mirror; port the SQLite override by hand (see Schema). |
| `1b4c2a237` | test(joined-cases): cover each list key refusal on its own | All of it (the migration hunk is regenerated). |
| `dd7dcd208` | feat(joined-cases): read each case type field by its value shape | All of it; regenerate `database.types.ts`. |
| `dc4f42613` | refactor(joined-cases): tidy value-shape reading | All of it. |
| `124dcdea8` | fix(joined-cases): read a renamed case type field from its own view column | All of it: `ConceptAttribute.getViewColumnNames`, `QueryColumn.sourceColumnName`, `refreshSource`. |
| `61bf863d9` | fix(joined-cases): give each duplicate case type field its own result name | All of it. |
| `5d503667e` | feat(joined-cases): offer list fields only the explorer operations that work on them | All of it. |
| `5988015be` | fix(joined-cases): keep list fields out of the map pickers that need a number or a key | All of it. |
| `2b159f28c` | fix(joined-cases): keep saved list field queries and filters from failing | All of it. |
| `f2de00df8` | fix(joined-cases): reset only a list field's unsupported aggregation | All of it. |
| `cb9347bc1` | feat(joined-cases): let chat drafts say a field keeps every value | All of it. |
| `cc90d0952` | refactor(joined-cases): pass join key filtering its options as one object | All of it. |
| `600919e1d` | feat(joined-cases): ask chat to propose list fields where a case has several values | All of it. |
| `f9acf73be` | feat(joined-cases): create chat's list fields with no value rule | All of it. |
| `741ea37a2` | refactor(joined-cases): tidy the chat list field path | All of it. |
| `ad2514c21` | feat(joined-cases): switch a draft field between one value and every value | All of it. |
| `7e8b34742` | feat(joined-cases): use the one value or every value switch in the case type form | All of it. |
| `dca25d3d2` | fix(joined-cases): lock the title field to one value in the case type form | All of it: splits `CaseTypeDraftAttributeRow.tsx` into `CaseTypeDraftAttributeRow/` and moves `ValueShapeControl.tsx` up to `src/components/caseFields/`. |
| `cf957485b` | fix(joined-cases): name the record page's sources and fix its heading order | All of it. Uses `ConceptAttribute.compareInViewOrder` from `124dcdea8`. |
| `02f9b46e3` | fix(joined-cases): show record page values by their field's type | All of it. |
| `5c15b6668` | feat(joined-cases): list every value of a list field on the record page | All of it. |
| `ed92f4de3` | fix(joined-cases): show record values at full precision in every language | All of it. |
| `01fd6a86e` | feat(joined-cases): mark list fields in chat's SQL schema context | All of it. |
| `8297e7a9b` | fix(joined-cases): give chat each case type field's view column name | All of it. |
| `921d72f0a` | test(joined-cases): a list field from the chat draft shows every value on the record page | All of it. |
| `f39ebdd30` | fix(joined-cases): keep the chat edge function's model imports free of uuid | All of it. Fixes `124dcdea8`: importing `ConceptStatusColumn` pulled `shared/lib/uuid.ts` into the chat and queries edge functions, which then failed at boot although `deno check` passed. |
| `c72cebb2a` | docs(joined-cases): describe list fields in the ontology architecture | All of it. |
| `63c8753b7` | docs(joined-cases): record how list fields were built | All of it. |
| `4636237d5` | fix(joined-cases): tidy list field leftovers | All of it. |
| `7bcaa6da0` | Fixed lint and added specs and plans | MIXED: only spec and plan 3 (final content). |
| `db45a9262` | docs(joined-cases): carry the plan 1 and 2 follow-ups into plans 3 to 6 | MIXED (docs): only plan 3. |

**Files:**
- Value shape and view column names: `shared/models/ontology/ConceptAttribute/{ConceptAttribute.ts,ConceptAttribute.types.ts}`,
  `ConceptAttributeModule/ConceptAttributeModule.{ts,test.ts}` (new),
  `shared/models/ontology/Concept/ConceptModule.ts` (`RECORD_KEY_COLUMN_NAME`,
  `STATUS_COLUMN_NAME`), `shared/models/queries/ConceptStatusColumn/{ConceptStatusColumnModule.ts,ConceptStatusColumn.test.ts}`
  (F57 to F62's files), `shared/models/ontology/AttributeMapping/DatasetColumnMapping/{DatasetColumnMapping.types.ts,DatasetColumnMappingParsers.ts,DatasetColumnMappingParsers.test.ts (new)}`.
- Storage: `supabase/schemas/30.attribute_mappings__dataset_column.sql`,
  `supabase/schemas/50.rpc_concepts__create.sql`,
  `supabase/tests/database/rpc_concepts__create.test.sql`,
  `src/clients/ontology/ConceptClient.test.ts`, the override in
  `apps/desktop/scripts/gen-sqlite-migrations/getManualMigrationBodyFromSourceFile.ts`.
- Engine: `buildAttributeValueSql.{ts,executed.test.ts}`,
  `buildConceptViewSql.{ts,executed.test.ts}`,
  `makeConceptAttributeColumnsFromMetadata.ts`, `loadConceptSpine.ts`,
  `conceptAttributeColumns.integration.executed.test.ts`,
  `QueryMediator.concepts.test.ts`, `getNeededColumnsFromQuery.test.ts`,
  `generateIndividuals.{ts,test.ts}`, `makeConceptRecordValuesFromRows.test.ts`.
- Queries read the field's own column: `shared/models/queries/QueryColumn/{QueryColumn.types.ts,QueryColumnModule.ts,QueryColumn.test.ts,QueryColumn.fixtures.ts (new)}`,
  `QueryColumn/QueryColumnReconciliation/QueryColumnReconciliation.{ts,test.ts}`,
  `shared/models/queries/QueryResultColumnBindings/makeProjectionDescriptorsFromStructuredQuery/*`,
  `shared/models/queries/StructuredQuery/structuredQueryToSql/{structuredQueryToSql.ts,makeSqlExpressionFromQueryColumn.ts}`,
  `src/clients/queries/runStructuredQuery/runStructuredQuery.test.ts`,
  `src/views/DataExplorerApp/{DataExplorerStateManager/DataExplorerSourceActions.ts,QueryColumnMultiSelect/QueryColumnMultiSelect.tsx,QueryColumnSingleSelect/QueryColumnSingleSelect.tsx,getRestoredColumnsFromUrl/getRestoredColumnsFromUrl.ts,makeQueryColumnsFromConcept/*}`,
  `src/views/GisApp/panels/LayerInspector/useLayerSourceColumns.ts`,
  `src/views/GisApp/useGisApp/MapSourceHydration/MapSourceHydration.{ts,test.ts}`,
  `tests/integration/queries/{StructuredQueryTestFixtures.ts,structuredQueryConcepts.executed.test.ts}`.
- Lists in results and controls: `shared/models/queries/QueryResult/{QueryResultModule.ts,QueryResult.test.ts (new)}`,
  `shared/models/queries/StructuredQuery/normalizeQueryFilters/normalizeQueryFilters.{ts,test.ts}`,
  `src/lib/ui/viz/makeDataGridColumnDefs/makeDataGridColumnDefs.{ts,test.ts}`,
  `src/views/DataExplorerApp/{AggregationSelect.tsx,QueryForm/ManualQueryForm/AggregationFields.{tsx,test.tsx (new)},QueryForm/ManualQueryForm/ManualQueryFormView/useManualQueryFilterState.ts,QueryForm/QueryFiltersField/QueryFiltersField.{tsx,test.tsx},makeExecutableQueryFromManualQuery/makeExecutableQueryFromManualQuery.{ts,test.ts}}`,
  `src/views/DashboardApp/AvaPage/pfields/LocalFiltersPField/{LocalFilterEditor.tsx,LocalFiltersPField.tsx,LocalFiltersPField.test.tsx (new)}`,
  `src/views/DashboardApp/DashboardFilterStateManager/makeLocalFilterColumnBindingsFromLocalFilters/*`,
  `src/views/GisApp/layers/isMapTimeColumn/isMapTimeColumn.{ts,test.ts}`, and under
  `src/views/GisApp/panels/LayerInspector/`:
  `DataSection/AreaAggregationControls/{AggregationMeasureSelect,AggregationOperationSelect}.tsx`
  with their tests (new), `DataSection/BoundaryJoinControls/BoundaryJoinKeyFields.tsx`,
  `DataSection/DisputedStatusControls/DisputedStatusControls.tsx`,
  `DataSection/__tests__/DataSection.disputed.test.tsx`,
  `StyleSection/ProportionalSymbolControls/ProportionalSymbolControls.tsx`.
- Chat drafts: `shared/types/chat.types.ts`,
  `supabase/functions/chat/PostChatMessages/parsing/{parseCreateCaseTypes,parseProposeCaseType}.{ts,test.ts}`,
  `PostChatMessages/prompt/{buildCaseManagerSystemPrompt,makeChatToolConfigFromOptions}.{ts,test.ts}`,
  `src/views/OntologyDesignerApp/{createdCaseTypeToFormValues,insertConceptFromFormValues,proposedCaseTypeToCreatedCaseType}/*.{ts,test.ts}`.
- Chat SQL context: `shared/models/chat/SqlTableAlias/{SqlTableAlias.types.ts,SqlTableAliasModule.ts,SqlTableAlias.test.ts}`,
  `shared/types/offlineChat.types.ts`,
  `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/*`,
  `.../runOfflineChatPipeline/buildOfflinePrompts/*`,
  `supabase/functions/chat/PostChatMessages/schema/fetchWorkspaceSchema.{ts,test.ts}`,
  `supabase/functions/chat/utils/buildSqlSystemPrompt/buildSqlSystemPrompt.{ts,test.ts}`.
- Draft card: `src/components/caseFields/ValueShapeControl.tsx` (new),
  `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftAttributeRow/{CaseTypeDraftAttributeRow,AttributeNameFields,AttributeValueControls}.tsx`
  (new; `CaseTypeDraftAttributeRow.tsx` deleted), `CaseTypeDraftBlock.test.tsx`,
  `CaseTypeDraftCard.module.css`, `CaseTypeDraftSourceSection.tsx`,
  `CaseTypeDraftValueRuleSelect.tsx`, `useCaseTypeDraftEditor.{ts,test.ts}`.
- Form: `src/views/OntologyDesignerApp/ConceptCreatorView/{index.tsx,conceptFormTypes.ts}`,
  `DatasetColumnAttributesBlock/{index.tsx,index.test.tsx}`,
  `DatasetColumnAttributesBlock/DatasetColumnMappingCreator/{DatasetColumnMappingCreator.tsx,DatasetColumnMappingCreator.test.tsx,ValueRuleField.tsx (new),ValueShapeFields.tsx (new)}`,
  `keepKeyAndLabelFieldsSingle/keepKeyAndLabelFieldsSingle.{ts,test.ts}` (new),
  `ConceptMetaView/CaseTypeAttributesList.tsx`,
  `apps/ava-video-producer/avandar-adapter/AttributeMappingScreen/{AttributeMappingScreen,MappingFields}.tsx`.
- Record page: `src/components/caseFields/createFieldValueFormatter/createFieldValueFormatter.{ts,test.ts}`
  and `useFieldValueFormatter/useFieldValueFormatter.{ts,test.ts}` (new),
  `src/views/IndividualManagerApp/SingleIndividualView/{CaseDetailsRail.tsx,CaseDetailsRail.test.tsx,CaseDetailsRail.module.css}`,
  `DetailsStatus/DetailsStatus.{tsx,module.css}` (new),
  `RecordFieldValue/{RecordFieldValue.tsx,RecordFieldValue.test.tsx,RecordFieldValueList.tsx,RecordFieldValueList.module.css}` (new),
  `useRecordFields/makeCaseDetailsRowsFromAttributes/*`,
  `useRecordFields/useRecordFields.test.ts`,
  `packages/web/ui/src/Callout/Callout.{tsx,test.tsx (new)}`,
  `apps/ava-video-producer/avandar-adapter/CasesScreen/RecordDetail.tsx`.
- E2E: `tests/e2e/case-list-field.spec.ts` (new).
- Docs: spec and plan 3, `docs/ontology-architecture.md` (list sections).
- Regenerate: `shared/types/database.types.ts`, the desktop mirror,
  `src/i18n/locales/*/messages.po`.

**Schema:** one generated migration. Edit the two schema files and the pgTAP
test, then regenerate after `ava supabase switch`. On the branch it was
`20261108154602_list_field_value_rules.sql`; the merge `a6cc4629c` renamed it
to `20261109030000_`, and `43573a2ec` to `20261109030001_` because
the first name collided with a deployed `STORAGE-` migration. Port neither
rename: the PR's own timestamp replaces both. Generate it only once
F57 to F62 is on `develop`, because it replaces `rpc_concepts__create`
with the `p_statuses` signature. Desktop: the migration's `ALTER COLUMN ...
drop not null` has no SQLite equivalent, so copy the
`list_field_value_rules` entry of `getManualMigrationBodyFromSourceFile.ts`
(a table rebuild) and key it by the regenerated file's exact name, then run
`pnpm desktop:sqlite:gen-migrations`. Regenerate `database.types.ts` with
`pnpm db:gen-types`.

**Verification:**
```sh
pnpm i18n:extract
pnpm lint
pnpm type-check
deno info supabase/functions/chat/index.ts > /dev/null
deno info supabase/functions/queries/index.ts > /dev/null
pnpm vitest run shared/models src/clients src/components/caseFields src/components/ChatPanel src/lib/ui/viz src/views/DataExplorerApp src/views/DashboardApp src/views/GisApp src/views/IndividualManagerApp src/views/OntologyDesignerApp supabase/functions/chat
pnpm test:ui
pnpm test:executed src/clients/qetl tests/integration/queries
pnpm test:db
pnpm desktop:sqlite:gen-migrations && pnpm desktop:sqlite:check-migrations
pnpm test:desktop
pnpm test:e2e case-list-field.spec.ts
pnpm test:e2e record-page-field-values.spec.ts
```

---

## F75: Per-period fields: one value per day, week, month, quarter, or year

Status: not started. Built on `feat/joined-cases`, merged into `demo/measles`
in `ae039326d` (through `a6cc4629c`). The commits are all of
`git log --reverse 4636237d5..0a3c63c54`. Its end-to-end spec never ran green
on the branch, and `pnpm test:db` last passed after the RPC change (spec 4
section 12, follow-up 1). `develop` has none of it.

**Purpose:** A field can keep one value per period of a date column of its
dataset, for example "the monthly average of temperature". The field stores a
`bucket_grain` (`day`, `week`, `month`, `quarter`, `year`) and its mapping a
`bucket_column_id`. Check constraints make such a field a dataset list that is
neither the title nor an identifier. A trigger, scoped to the mapping's
workspace, requires the date column exactly when the field has a period and
refuses a column that is not a date. `rpc_concepts__create` writes both in one
transaction. The view computes a `STRUCT(bucket DATE, value T)[]` with
`buildBucketedListValueSql`, applying the field's rule within each period.
Zoned timestamps bucket in UTC, and text `max`/`min` match single values. The
planner fetches and loads the date column. The Arrow reader turns dates inside
lists and structs into text, and decimals inside a MAP or UNION keep their
scale. The record page shows a period and value table with the six most
recent periods, an inline "Show all <n> <periods>" toggle, and period labels
in the reader's language. The Data Explorer grid labels periods the same way
(`Jan 2026: 38.5; Feb 2026: 37.9`). The draft card and the form gain period
and date column pickers, explain why a per-period field cannot be saved, and
drop the period when a field becomes a key or the title. Chat proposes a
per-period field only when its date column is a catalog `date` or `timestamp`
column of the field's dataset, and its SQL context explains how to read one.
**Value:** A case type can carry a trend per case (monthly visits, weekly
doses) without a separate dataset or a stored value.

**Design:** `docs/superpowers/specs/2026-11-06-joined-cases-4-bucketed-list-fields-design.md`
(section 12 lists what was built and the review findings) and
`docs/superpowers/plans/2026-11-06-joined-cases-4-bucketed-list-fields.md`.
Port both.

**PR title:** `feat(cases): let a case type field keep one value per day, week, month, quarter, or year`

**Depends on:** F74 (the value shape, lists in the view, the form and draft
card controls it extends), and through it F70 to F73. F57 to F62 (the
RPC signature, `CaseTypeSeedHelpers.ts`), F22 (`DataGrid.tsx`,
`makeDataGridColumnDefs.ts`).

**Commits to read** (from `feat/joined-cases` and the direct docs commits; three are `MIXED`):

| SHA | Subject | Take |
|---|---|---|
| `930639e26` | feat(joined-cases): store a field's period and its mapping's date column | All of it, except that its migration is history: `d90dea2ea` regenerated it, and this PR regenerates it again. |
| `d90dea2ea` | fix(joined-cases): scope the bucket column check to the mapping's workspace | All of it (schema and pgTAP). Its migration rename is history. |
| `034266fca` | feat(joined-cases): create a case type's per-period fields in one transaction | All of it. |
| `08bfb2f36` | feat(joined-cases): carry a field's period and date column through the models | All of it; regenerate `database.types.ts`. |
| `e2570144f` | feat(joined-cases): read per-period values and date column types | All of it. |
| `ae30326dd` | fix(joined-cases): keep the scale of decimals inside a map or union | All of it. |
| `3effd4525` | feat(joined-cases): compute a per-period field's values in DuckDB | All of it. |
| `f50428652` | feat(joined-cases): name and label periods in the reader's language | All of it. |
| `354522b07` | feat(joined-cases): show a per-period field as a period and value table | All of it. |
| `2faaf6679` | fix(joined-cases): bucket zoned timestamps in UTC | All of it. |
| `9bb88ad6d` | feat(joined-cases): add the period and date column pickers | All of it. |
| `37b48ca32` | feat(joined-cases): add per-period fields to every place a field's shape decides | All of it, including its edit to `tests/e2e/case-list-field.spec.ts`. |
| `b27358007` | fix(joined-cases): fetch and load the date column a per-period field reads | All of it. |
| `5e6ddf489` | feat(joined-cases): let chat propose a field per month or another period | All of it. |
| `94183f354` | fix(joined-cases): drop a period when a form field becomes a key or the title | All of it. |
| `394d9090c` | refactor(joined-cases): split per-period branches under the length limit | All of it. |
| `9eeb81c1b` | fix(joined-cases): keep the case type form from saving an incomplete per-period field | All of it. |
| `b5d1c3af8` | fix(joined-cases): show why a per-period field cannot be saved | All of it. |
| `8c2a2e369` | feat(joined-cases): tell chat how to read a per-period field | All of it. |
| `00a93b53d` | feat(joined-cases): label a per-period field's periods in the Data Explorer | All of it. Its `VisualizationContainer.tsx` hunk lives in `src/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer.tsx` at the tip, after F103 to F108 split the container (`bd4c8907e`): port it to whichever file holds the data grid on `develop` then. |
| `4f6ac415c` | refactor(joined-cases): share the period value formatter from caseFields | All of it. |
| `ee2f4a4ad` | test(joined-cases): show a per-month field on the record page and in the Data Explorer | All of it: the spec, the CSV fixture, and the seed helper. |
| `6b7d3e910` | docs(joined-cases): describe per-period fields in the ontology architecture | All of it. |
| `7ffba17c1` | fix(joined-cases): drop the deprecated clip from the period table caption | All of it. |
| `1236c2789` | docs(joined-cases): record how per-period fields were built | All of it. |
| `3d0332c7e` | fix(joined-cases): tidy per-period leftovers | All of it. |
| `0a3c63c54` | docs(joined-cases): note per-period review findings | All of it. |
| `7bcaa6da0` | Fixed lint and added specs and plans | MIXED: only spec and plan 4 (final content). |
| `c2bd1aeff` | updated plans | MIXED (docs): only spec and plan 4. Plan 5 goes to F76. |
| `db45a9262` | docs(joined-cases): carry the plan 1 and 2 follow-ups into plans 3 to 6 | MIXED (docs): only plan 4. |

**Files:**
- Schema: `supabase/schemas/00.enum.concept_attributes__bucket_grain.sql` (new),
  `20.concept_attributes.sql`, `30.attribute_mappings__dataset_column.sql`,
  `50.rpc_concepts__create.sql`, `supabase/tests/database/concept_attributes__bucketed_list.test.sql`
  (new), `rpc_concepts__create.test.sql`.
- Models: `shared/models/ontology/ConceptAttribute/{ConceptAttribute.ts,ConceptAttribute.types.ts,ConceptAttributeParsers.ts,ConceptAttributeParsers.test.ts (new)}`,
  `ConceptAttributeModule/ConceptAttributeModule.{ts,test.ts}`,
  `AttributeMapping/DatasetColumnMapping/{DatasetColumnMapping.types.ts,DatasetColumnMappingParsers.ts,DatasetColumnMappingParsers.test.ts}`,
  `shared/models/queries/QueryColumn/{QueryColumnModule.ts,QueryColumn.test.ts,QueryColumn.fixtures.ts}`,
  `shared/models/queries/QueryResult/QueryResult.types.ts` (`bucketGrain`),
  `shared/models/queries/QueryResultColumnBindings/{QueryResultColumnBindings.types.ts,makeProjectionDescriptorsFromStructuredQuery/*,reconcileQueryResultColumnBindings/*}`.
- Engine: `conceptRelation/buildBucketedListValueSql/buildBucketedListValueSql.{ts,executed.test.ts}` (new),
  `buildAttributeValueSql.ts`, `buildConceptViewSql.ts`,
  `makeConceptAttributeColumnsFromMetadata.ts`,
  `getConceptAttributeColumnsFromConceptId.ts`,
  `getConceptRelationPlansFromSql/getConceptRelationPlansFromSql.test.ts`,
  `getNeededColumnsFromQuery/getNeededColumnsFromQuery.{ts,test.ts}`,
  `__tests__/conceptAttributeColumns.integration.executed.test.ts`,
  `__tests__/perPeriodConceptQuery.integration.executed.test.ts` (new),
  `src/clients/DuckDbClient/duckDbSqlText.ts`,
  `src/clients/DuckDbClient/duckDbArrowResults/duckDbArrowResults.{ts,test.ts}`,
  `src/clients/queries/runStructuredQuery/runStructuredQuery.test.ts`.
- Period labels: `src/components/caseFields/{useBucketGrainLabels/useBucketGrainLabels.ts,useBucketPeriodFormatter/useBucketPeriodFormatter.{ts,test.ts},useBucketValueFormatter/useBucketValueFormatter.ts}` (new).
- Record page: `src/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldBucketedValue.tsx` (new),
  `RecordFieldValue/RecordFieldPeriodTable/{RecordFieldPeriodTable.tsx,RecordFieldPeriodTable.test.tsx,RecordFieldPeriodTable.module.css,PeriodTable.tsx,PeriodTableToggle.tsx,buildPeriodShowAllLabel.ts,usePeriodTableCaption.ts}` (new),
  `RecordFieldValue/RecordFieldValue.{tsx,test.tsx}`,
  `CaseDetailsRail.{tsx,test.tsx}`,
  `useRecordFields/makeCaseDetailsRowsFromAttributes/*`,
  `apps/ava-video-producer/avandar-adapter/CasesScreen/RecordDetail.tsx`.
- Data Explorer grid: `src/components/VisualizationContainer/useDataGridPeriodFormatters/useDataGridPeriodFormatters.{ts,test.ts}` (new),
  the wiring in `VisualizationContainer.tsx` (see `00a93b53d`),
  `__tests__/VisualizationContainer.test.tsx`, `src/lib/ui/viz/DataGrid.tsx`,
  `src/lib/ui/viz/makeDataGridColumnDefs/makeDataGridColumnDefs.{ts,test.ts}`,
  `src/views/DataExplorerApp/{getRestoredColumnsFromUrl/getRestoredColumnsFromUrl.test.ts,makeQueryColumnsFromConcept/makeQueryColumnsFromConcept.test.ts}`.
- Pickers and form: `src/components/caseFields/PeriodControls/{PeriodControls.tsx,PeriodControls.test.tsx,PeriodSelect.tsx,DateColumnSelect.tsx}` (new),
  `src/components/caseFields/makeDateColumnOptions/makeDateColumnOptions.{ts,test.ts}` (new),
  `src/components/caseFields/ValueShapeControl.tsx`,
  `src/views/OntologyDesignerApp/ConceptCreatorView/{index.tsx,createBucketColumnValidator/createBucketColumnValidator.ts (new),keepKeyAndLabelFieldsSingle/*}`,
  `DatasetColumnAttributesBlock/{index.tsx,index.test.tsx}`,
  `DatasetColumnAttributesBlock/DatasetColumnMappingCreator/{DatasetColumnMappingCreator.test.tsx,ValueRuleField.tsx,ValueShapeFields.tsx,PerPeriodFields.tsx (new),formShapeFields.ts (new)}`,
  `ConceptMetaView/{CaseTypeAttributesList.tsx,generateIndividuals/generateIndividuals.test.ts}`.
- Draft card: `CaseTypeDraftBlock/CaseTypeDraftAttributeRow/{AttributeValueControls.tsx,CaseTypeDraftAttributeRow.tsx,AttributeValueShapeControl.tsx (new),PerPeriodValueControls.tsx (new)}`,
  `CaseTypeDraftBlock/{CaseTypeDraftBlock.tsx,CaseTypeDraftBlock.test.tsx,CaseTypeDraftCard.tsx,CaseTypeDraftSourceSection.tsx,useCaseTypeDraftEditor.ts,useCaseTypeDraftEditor.test.ts}`.
- Chat: `shared/types/chat.types.ts`, `parseProposeCaseType.{ts,test.ts}`,
  `buildCaseManagerSystemPrompt.{ts,test.ts}`, `makeChatToolConfigFromOptions.{ts,test.ts}`,
  `{createdCaseTypeToFormValues,insertConceptFromFormValues,proposedCaseTypeToCreatedCaseType}/*`,
  and the SQL context files F74 lists (`SqlTableAlias/*`, `offlineChat.types.ts`,
  `fetchOfflineChatSchema/*`, `buildOfflinePrompts/*`, `fetchWorkspaceSchema.*`,
  `buildSqlSystemPrompt.*`).
- E2E: `tests/e2e/case-bucketed-fields.spec.ts` (new),
  `tests/data/case-bucketed-visits/{case-bucketed-visits.csv,README.md}` (new),
  `tests/e2e/helpers/CaseTypeSeedHelpers.ts`, `tests/e2e/helpers/constants.ts`,
  and the one-line edit to `tests/e2e/case-list-field.spec.ts`.
- Docs: spec and plan 4, `docs/ontology-architecture.md` (per-period sections).
- Regenerate: `shared/types/database.types.ts`, the desktop mirrors,
  `src/i18n/locales/*/messages.po`.

**Schema:** regenerate from the schema files above after F74, with the
`supabase-declarative-schema` skill. On the branch this was two migrations,
both renamed by the merge `a6cc4629c`:
`20261109030100_add_bucketed_list_fields.sql` (first `20261108191738_`, then
`20261108193037_` when `d90dea2ea` regenerated it) and
`20261109030200_rpc_concepts__create_writes_bucket_columns.sql`. One
regenerated migration is fine. It creates the enum, the two columns, the two
check constraints, the `attribute_mappings__dataset_column__validate_bucket_column`
trigger and function (`security definer`, `search_path ''`), and replaces
`rpc_concepts__create`. No data moves. Regenerate the desktop mirror with
`pnpm desktop:sqlite:gen-migrations` and `database.types.ts` with
`pnpm db:gen-types`.

**Verification:**
```sh
pnpm i18n:extract
pnpm lint
pnpm type-check
pnpm vitest run shared/models src/clients src/components src/lib/ui/viz src/views/DataExplorerApp src/views/IndividualManagerApp src/views/OntologyDesignerApp supabase/functions/chat
pnpm test:executed src/clients/qetl
pnpm test:db
pnpm desktop:sqlite:gen-migrations && pnpm desktop:sqlite:check-migrations
pnpm test:e2e case-bucketed-fields.spec.ts
pnpm test:e2e case-list-field.spec.ts
pnpm test:e2e record-page-field-values.spec.ts
```

---

## F76: Joined cases plans for multi-source fields, on-demand record names, and key matching

Status: not started. Committed directly on `demo/measles` (`7bcaa6da0`,
`c2bd1aeff`, `3a5fe4e6b`) and updated on `feat/joined-cases` (`db45a9262`,
merged in `32e728a51`). None of this work is built.

**Purpose:** Three designs and plans that follow F75: a field that reads
several datasets or columns (multi-source fields), a record name computed when
it is read instead of stored by Sync, and keys that match across datasets
after normalization or a translation table.
**Value:** Records why the joined-cases features look the way they do and
what comes next.

**Design:** the files are the design.

**PR title:** `docs(cases): plan multi-source fields, on-demand record names, and key matching`

**Depends on:** F72 (the umbrella spec and plan index they refer to), and F75 in
spirit: the plans assume plans 1 to 4 have landed.

**Commits to read** (all four are `MIXED (docs)`):

| SHA | Subject | Take |
|---|---|---|
| `7bcaa6da0` | Fixed lint and added specs and plans | MIXED: only specs and plans 5, 6, and 7. |
| `c2bd1aeff` | updated plans | MIXED (docs): only plan 5. |
| `3a5fe4e6b` | docs(joined-cases): reconcile the joined cases specs and plans | MIXED (docs): plans and specs 5, 6, and 7. The umbrella spec hunk goes to F72. |
| `db45a9262` | docs(joined-cases): carry the plan 1 and 2 follow-ups into plans 3 to 6 | MIXED (docs): only plans 5 and 6. |

**Files:** final content of
`docs/superpowers/plans/2026-11-06-joined-cases-{5-multi-source-fields,6-on-demand-record-names,7-key-matching}.md`
and `docs/superpowers/specs/2026-11-06-joined-cases-{5-multi-source-fields,6-on-demand-record-names,7-key-matching}-design.md`.

**Schema:** none.

**Verification:**
```sh
ls docs/superpowers/plans/2026-11-06-joined-cases-*.md docs/superpowers/specs/2026-11-06-joined-cases-*-design.md
```

---

## Notes for AI data agent (F77 to F88)

Scope: the AI data agent. `feat/pi-agent` (21 commits, merged into
`demo/measles` in `64bc1c78d`, `b32bf6834`, and `2329454f0`) and
`feat/agent-default` (68 commits, merged in `cc3833377`).

Two snapshots matter for every section below, because later branches edit
the same files:

- `dcedc1ca6` is the `feat/pi-agent` tip. Use it as the final state for
  F77, F81, F82, F83, and F84 files.
- `8301ced8f` is the `feat/agent-default` tip. Use it as the final state for
  F78, F79, F85, F86, and F87 files. `34798387c` also carries
  F89 to F91 (`feat/agent-context`), `11816d5d0` (from
  `feat/case-draft-edit-sources`), and F96 to F112 hunks in many of these
  files, so do not port them from `34798387c`.

None of F77 to F88 is on `develop`, and no open or merged PR covers
any of them (`gh pr list --state all --limit 60`). PR #271 ("Simplify model
catalog", merged) is the `develop` model picker that F84 removes.

---

## F77: PDF table assistant on its own route

Status: not started. Built on `feat/pi-agent`, merged into `demo/measles` in
`b32bf6834`. The bug is on `develop`: `runRegionModelAssist.ts` there is
identical to the branch base and still posts the prompt to
`chat/:workspaceId/messages`.

**Purpose:** In PDF import, the assistant that reads the figures the
rule-based extractor missed in a region the user drew sent its prompt as a
chat message. The `chat` function made the model call its SQL tool, so the
JSON reply landed in `generatedSql`, the app read an empty `assistantText`,
and the assistant added no rows. The browser now posts the region's text,
the figures the rules already found, and the consent ack token to
`POST /chat/:workspaceId/extract-measurements` (`PostExtractMeasurements`).
The route requires a Data Sources editor, verifies that the ack is for
exactly that text, builds the prompt on the server
(`buildMeasurementExtractionMessage`), and answers with the default chat
model and no tools. The prompt now says which numbers are not measurements,
how to read a decimal point the PDF lost, where the subject goes, and never
to fill in missing digits. `sendOpenRouterRequest` also returns the tokens
and cost OpenRouter billed (`OpenRouterUsage`).
**Value:** The PDF table assistant works again. On F81's PDF eval, Haiku 5.5
found 63 of 63 required figures over three runs with no fabricated rows,
against 15 of 42 before.

**Design:** decision D32 in `docs/ai-agent/decisions.md` and "PDF table
assistant" in `docs/ai-agent/eval.md` (both land with F88).

**PR title:** `fix(pdf-import): give the PDF table assistant its own route`

**Depends on:** nothing unmerged in this log. `PostExtractMeasurements`
calls `supabase/functions/_shared/assertMeetsMinAppRole.ts`, which the
Postgres branch adds (`a4136f2e5`). If that branch has not landed, port the
file (final at `34798387c`) with this PR. The route answers with
`ChatModelOption.Catalog.defaultId`, which is Claude Sonnet 5 on `develop`
until F84 makes it Claude Haiku 5.5.

**Commits to read** (from `feat/pi-agent`; two are MIXED):

| SHA | Subject | Take |
|---|---|---|
| `ff6cd3f8c` | fix(pdf-import): give the PDF table assistant its own route, and evaluate it | MIXED: `shared/agent/measurementExtraction/`, `supabase/functions/chat/PostExtractMeasurements/`, the route hunks of `ChatRoutes.ts` and `ChatRoutes.types.ts`, `runRegionModelAssist.{ts,test.ts}`, `tableToMeasurements.ts`, and the deletion of `makeRegionPromptFromRegionText.ts` go here. `scripts/ai-eval/**`, `DenoChatTurnRunner.ts`, and `supabase/functions/_eval/runChatTurnCli.ts` go to F81. |
| `d5d37b8c8` | feat(ai-eval): add a headless eval of the chat harness and a Pi-based data agent | MIXED: only `openRouter/OpenRouterUsage.ts` and the usage hunk of `openRouter/sendOpenRouterRequest.ts`. The rest is F81 and F82. |
| `7ea18c278` | feat(chat): answer every chat turn with the server's default model | History for this feature: its `runRegionModelAssist.{ts,test.ts}` hunks are superseded by `ff6cd3f8c`. The rest is F84. |

**Files:**
- Prompt (new): `shared/agent/measurementExtraction/MeasurementExtractionPrompt.ts`.
- Route (new): `supabase/functions/chat/PostExtractMeasurements/{PostExtractMeasurements.ts,runMeasurementExtraction.ts,runMeasurementExtraction.test.ts}`,
  and its hunks in `supabase/functions/chat/ChatRoutes.ts` and
  `ChatRoutes.types.ts`.
- Usage: `supabase/functions/chat/PostChatMessages/openRouter/OpenRouterUsage.ts`
  (new) and `sendOpenRouterRequest.ts`.
- Browser: `src/views/DataManagerApp/DataImportView/ManualUploadView/PdfTablePicker/runRegionModelAssist/runRegionModelAssist.{ts,test.ts}`,
  `src/workers/pdfSniff/llm/tableToMeasurements.ts` (new), and
  `src/workers/pdfSniff/llm/makeRegionPromptFromRegionText.ts` (deleted).
- `supabase/functions/_shared/assertMeetsMinAppRole.ts`, only if the
  Postgres branch has not brought it.

**Schema:** none.

**Verification:**
```sh
pnpm vitest run supabase/functions/chat/PostExtractMeasurements src/views/DataManagerApp/DataImportView/ManualUploadView/PdfTablePicker
pnpm type-check:deno
pnpm tsc -b --force
```
Then import a PDF, draw a box around a passage the rules flag as under-read,
and run the assistant: it adds rows.

---

## F78: Keep a case's id out of the view-change lines sent to the model

Status: not started. Built on `feat/agent-default`, merged into
`demo/measles` in `cc3833377`. The bug is on `develop`: `ChatViewEvent.ts`
there is identical and writes the full route.

**Purpose:** The chat stores a hidden `[View changed: app=...; route=...;
dataset=...; dashboard=...]` line each time the user moves to another page,
and sends it with every chat request. On a case page the route held the
case's own id, so today's chat requests (and the agent's recap) carried it
to the model. `ChatViewEvent.format` now writes a case route as
`/individual-manager/<conceptId>/<case>`, anchored on the workspace slug
segment so a slug named `individual-manager` cannot hide the concept id.
`ChatViewEvent.toModelContent` rewrites lines stored before the change,
matching on the line's `route=` field. The adapter's new `_userModelContent`
rewrites a user message only when it is a view-change line (the metadata
flag, or the line prefix when metadata was lost), so typed text is never
changed. Two cases of one type now format the same, so moving between them
adds no line.
**Value:** A case's id, which leads to a person, never reaches a hosted
model.

**Design:** the Privacy table in `docs/ai-agent/specs/phase-1a.md` (lands
with F88).

**PR title:** `fix(chat): keep a case's id out of the view-change lines sent to the model`

**Depends on:** F22's BUG-015 (`87602b004`) wrote the
`DiscoveryContinuationMessage` branch that `_userModelContent` keeps. If
F22 has not merged, write `_userModelContent` without that branch and
BUG-015 adds it.

**Commits to read** (from `feat/agent-default`; both MIXED):

| SHA | Subject | Take |
|---|---|---|
| `1f0734f04` | fix(ai-agent): keep a case's id out of view-change lines | MIXED: `ChatViewEvent.{ts,test.ts}` and the `ChatViewEvent.toModelContent` call go here, on `develop`'s path `src/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter.ts`. Its `createChatModelAdapter/createChatModelAdapter.test.ts` cases need the test file F84 creates, so they land with F86's copy of that file. Its `dataAgentTurnHelpers.test.ts` hunk (the agent's recap) is F86. |
| `49164114f` | fix(ai-agent): anchor the case id pattern on the workspace slug | MIXED: `ChatViewEvent.{ts,test.ts}` and the adapter's `_userModelContent` go here (same path). Its `createChatModelAdapter.test.ts` cases land with F86. Its `shared/agent/dataAgent/buildDataAgentSystemPrompt.test.ts` hunk is F86. |

**Files:**
- `src/components/ChatPanel/ChatViewEvent/ChatViewEvent.{ts,test.ts}`.
- `src/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter.ts`
  (`develop`'s path): `_userModelContent` and its call.

**Schema:** none.

**Verification:**
```sh
pnpm vitest run src/components/ChatPanel/ChatViewEvent src/components/ChatPanel/useAvandarChatRuntime
pnpm tsc -b --force
```

---

## F79: One series per category when charting a long result

Status: not started. Built on `feat/agent-default`, merged into
`demo/measles` in `cc3833377`. The bug is on `develop`: `DataExplorerApp.tsx`
there hands the result to `VisualizationContainer` unchanged, so a
(week, district, cases) result drawn as a line chart is one jagged series.

**Purpose:** When a bar, line, or area chart has one series and the result
is long (an X column, a text category column, and one numeric value),
`makeWideResultFromLongResult` reshapes it into one series per category. The
eight categories with the largest totals keep their own series, the rest
join an "Other" series in a neutral color, and empty text gets a blank
label. `useCategorySplitChartInput` applies this to the Data Explorer
canvas only: the stored chart config, the table, saving, and the drawer keep
the result as the query returned it. The drawer's chart settings
(`VizTabPanel`) say "Drawn as one series per <column>". Dates are read in
the shapes DuckDB returns them.
**Value:** A "by district over time" question draws a readable chart instead
of one zig-zag line.

**PR title:** `fix(viz): draw one series per category when charting a long result`

**Depends on:** none.

**Commits to read** (from `feat/agent-default`; both MIXED):

| SHA | Subject | Take |
|---|---|---|
| `7f06c7c6c` | fix(ai-agent): draw one series per category in chat and explorer charts | MIXED: `makeWideResultFromLongResult/*`, `useCategorySplitChartInput.ts`, `DataExplorerApp.tsx`, and `__tests__/explorerCategorySplitChart.integration.test.tsx` go here. `useAgentQueryResultView.{ts,test.tsx}` go to F85. Regenerate the catalogs. |
| `8301ced8f` | fix(ai-agent): explain split charts in the drawer and cover real date shapes | MIXED: the `VisualizationContainer` files, `useCategorySplitChartInput.test.tsx`, `DataExplorerApp.tsx`, `DataExplorerDrawer.{tsx,test.tsx}`, `VizTabPanel.{tsx,module.css,test.tsx}`, and the integration test go here. `useAgentQueryResultView.{ts,test.tsx}` go to F85. |

**Files:**
- `src/components/VisualizationContainer/makeWideResultFromLongResult/makeWideResultFromLongResult.{ts,test.ts}` (new).
- `src/components/VisualizationContainer/useCategorySplitChartInput/useCategorySplitChartInput.{ts,test.tsx}` (new).
- `src/views/DataExplorerApp/DataExplorerApp.tsx` and
  `src/views/DataExplorerApp/__tests__/explorerCategorySplitChart.integration.test.tsx` (new).
- `src/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawer.{tsx,test.tsx}`
  and `VizTabPanel/VizTabPanel.{tsx,module.css,test.tsx}` (the test is new).
- `src/i18n/locales/*/messages.po`: regenerate.

**Schema:** none.

**Verification:**
```sh
pnpm i18n:extract && pnpm i18n:compile
pnpm vitest run src/components/VisualizationContainer src/views/DataExplorerApp
pnpm tsc -b --force
```

---

## F80: An "Answer offline" button on the offline fallback offer

Status: not started. Built on `feat/pi-agent`, merged into `demo/measles` in
`64bc1c78d`. The bug is on `develop`: `offerOfflineChatFallback.ts` there
shows a notification with only a close button, which resolves the offer as
declined.

**Purpose:** When a chat request fails on the network and offline models are
downloaded, the chat offers to answer offline. The notification now has an
"Answer offline" button that accepts the offer and hides the notification
(`offerOfflineChatFallback.tsx`, which replaces the `.ts` file). Its label
comes from the chat runtime's copy (`ChatRuntimeCopy.fallbackAction`).
**Value:** The offline fallback can actually be used.

**PR title:** `fix(chat): let people accept the offer to answer a failed message offline`

**Depends on:** none. Apply the adapter hunk to `develop`'s
`src/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter.ts`.

**Commits to read** (from `feat/pi-agent`; MIXED):

| SHA | Subject | Take |
|---|---|---|
| `ae8656e77` | fix(chat): let offline answers start without a connection | MIXED: `offerOfflineChatFallback.tsx` (replaces `offerOfflineChatFallback.ts`), `offerOfflineChatFallback.test.tsx`, `fallbackAction` in `chatRuntimeTurnHelpers.ts`, the `action:` line in the adapter, and the two `fallbackAction` copies in `useAvandarChatRuntime.ts` go here. `DataAgentDatasetCache.ts` and the `dataAgentTurnHelpers.{ts,test.ts}` hunks go to F84. Regenerate the catalogs. |

**Files:**
- `src/components/ChatPanel/useAvandarChatRuntime/offerOfflineChatFallback.tsx`
  (replaces `offerOfflineChatFallback.ts`) and `offerOfflineChatFallback.test.tsx` (new).
- `src/components/ChatPanel/useAvandarChatRuntime/{chatRuntimeTurnHelpers.ts,useAvandarChatRuntime.ts,createChatModelAdapter.ts}`.
- `src/i18n/locales/*/messages.po`: regenerate.

**Schema:** none.

**Verification:**
```sh
pnpm i18n:extract && pnpm i18n:compile
pnpm vitest run src/components/ChatPanel/useAvandarChatRuntime
pnpm tsc -b --force
```
Then, with an offline model downloaded, go offline, send a message, and click
"Answer offline": the turn runs locally.

---

## F81: Headless eval of the chat harness and the PDF table assistant

Status: not started. Built on `feat/pi-agent`, merged into `demo/measles` in
`64bc1c78d` and `b32bf6834`.

**Purpose:** `pnpm vite-script scripts/ai-eval/runEval.ts` asks the 45 COVID
audit questions from `docs/ai-harness-audit/` through a harness, runs the
SQL each answer produced in DuckDB over a local copy of the three JHU files,
and grades it against ground-truth SQL with graders that accept any
reasonable result shape (long or wide, months as dates or text, ratios or
percents). Each question also has a clarification policy, graded apart from
the answer (needless and missed questions), and a script for a simulated
user who answers question cards. A run writes every answer with its SQL, a
result preview, the questions asked, tokens, billed cost, and latency to
`.temp/ai-eval/runs/<time>-<label>/`. The `baseline` harness runs today's
`chat` edge function code in a Deno child process
(`supabase/functions/_eval/runChatTurnCli.ts`, a CLI, not a deployed
function) and plays the Data Explorer's part: alias rewriting, local
lookups, automatic matches, question cards, and the consent check on filter
values. So the eval and the HTTP route share one code path, `PostChatMessages`
moves its turn logic into `runChatTurn`, and `runChatAttemptsWithEscalation`
adds up each call's `OpenRouterUsage`. A second runner,
`scripts/ai-eval/pdf/runPdfAssistEval.ts`, grades the PDF table assistant
(F77) on 17 hand-labelled regions from six reports and papers, and checks
121 held-out regions for fabricated figures. It needs the JHU CSVs in
`~/cleaned-test-data` and `OPEN_ROUTER_API_KEY` (read from
`.env.development.edge`); it is a developer tool, not part of CI.
**Value:** Every later change to the chat and the agent is measured against
ground truth, with its cost, before it ships (decision D16). It found the
N11 county bug that F22's addendum fixes and the PDF assistant bug F77 fixes.

**Design:** `docs/ai-agent/eval.md` and decisions D16, D17, and D21 in
`docs/ai-agent/decisions.md` (land with F88).

**PR title:** `feat(ai-eval): add a headless eval of the chat harness and the PDF table assistant`

**Depends on:** F22 (`runChatTurn` moves BUG-010's and C4's code out of
`PostChatMessages.ts`; the baseline harness imports BUG-009's
`buildCandidateLookupSqlFromDiscovery` and `DiscoveryCandidateValues` and
BUG-015's `reviewGeneratedSqlAssumptions`). F77 (the PDF eval runs
`runMeasurementExtraction`, and `runChatTurnCli.ts` imports it).
F57 to F62 wrote the `conceptStatuses` line that `runChatTurn` carries,
and F71 to F75 the `columns` argument: leave out whichever has not
merged.

**Commits to read** (from `feat/pi-agent`; take eval files at `dcedc1ca6`,
then drop the `pi` and `pi-local` harness wiring from `runEval.ts`, which F82
and F83 add back):

| SHA | Subject | Take |
|---|---|---|
| `d5d37b8c8` | feat(ai-eval): add a headless eval of the chat harness and a Pi-based data agent | MIXED: `scripts/ai-eval/{EvalQuestion.ts,covid/*,grading/*,harnesses/EvalHarness.ts,harnesses/baseline/*,runtime/*,runEval.ts}` (without the `pi` harness), `supabase/functions/_eval/runChatTurnCli.ts`, `PostChatMessages.ts`, `runChatTurn/runChatTurn.ts`, and `runChatAttemptsWithEscalation.{ts,test.ts}` go here. F77: `OpenRouterUsage.ts`, `sendOpenRouterRequest.ts`. F82: `package.json`, `pnpm-lock.yaml`, `src/lib/agent/**`, `harnesses/pi/*`. |
| `658b112f4` | feat(ai-agent): document the agent architecture, decisions, and eval results | MIXED: `EvalQuestion.ts`, `covid/*`, `grading/*` with the new `ResultChecks.test.ts`, `harnesses/baseline/*`, `runEval.ts`, `runtime/{gradeEvalAnswer,resolveEvalDiscovery,summarizeEvalRun}.ts`, and `runChatAttemptsWithEscalation.test.ts` go here. F82: `harnesses/pi/PiHarness.ts`, every `src/` file, `supabase/functions/chat/PostAgentStream/*`, both `deno.json`. F88: `docs/ai-agent/*`. |
| `64b6a003e` | fix(ai-eval): keep at most 50,000 rows of a result | All of it. |
| `21153bf8b` | chore(ai-eval): wrap the eval CLI's usage comment to the line limit | All of it. |
| `ff6cd3f8c` | fix(pdf-import): give the PDF table assistant its own route, and evaluate it | MIXED: `scripts/ai-eval/pdf/**` (new), `runtime/readOpenRouterApiKey.ts` (new), the `runEval.ts` hunk that moves the key reader out, `harnesses/baseline/DenoChatTurnRunner.ts`, and `runChatTurnCli.ts`'s extract-measurements mode go here. The rest is F77. |
| `de18389c8` | docs(ai-agent): record D04 and the PDF assistant's eval, and archive its runs | MIXED: `pdf/{gradePdfAssist,runPdfAssistEval,summarizePdfAssistRun}.ts` go here. F88: `docs/ai-agent/*.md`. Branch-only: `archiveEvalRuns.ts` and `docs/ai-agent/eval-runs/**` (see Open questions). |

**Files:**
- Eval core (new): `scripts/ai-eval/{EvalQuestion.ts,runEval.ts}`,
  `scripts/ai-eval/covid/{covidQuestions.ts,covidTruthSql.ts,covidWorkspace.ts}`,
  `scripts/ai-eval/grading/{ResultChecks.ts,ResultChecks.test.ts,ResultMatchers.ts}`,
  `scripts/ai-eval/harnesses/EvalHarness.ts`,
  `scripts/ai-eval/harnesses/baseline/{BaselineHarness.ts,DenoChatTurnRunner.ts}`,
  `scripts/ai-eval/runtime/{EvalDatabase.ts,SimulatedUser.ts,gradeEvalAnswer.ts,resolveEvalDiscovery.ts,runEvalSql.ts,summarizeEvalRun.ts,readOpenRouterApiKey.ts}`.
- PDF eval (new): `scripts/ai-eval/pdf/{gradePdfAssist.ts,gradePdfAssist.test.ts,pdfAssistCases.ts,pdfAssistHoldoutRegions.json,pdfAssistSetups.ts,preparePdfAssistCase.ts,runPdfAssistEval.ts,summarizePdfAssistRun.ts}`.
  The PDFs are under `public/test-data/pdf/`, already on `develop`.
- Deno CLI (new): `supabase/functions/_eval/runChatTurnCli.ts`.
- Chat function: `supabase/functions/chat/PostChatMessages/PostChatMessages.ts`,
  `runChatTurn/runChatTurn.ts` (new), and
  `runChatAttemptsWithEscalation/runChatAttemptsWithEscalation.{ts,test.ts}`.
- Not ported by default: `scripts/ai-eval/archiveEvalRuns.ts` (it writes the
  run archive into `docs/ai-agent/eval-runs/`).

**Schema:** none.

**Verification:**
```sh
pnpm vitest run scripts/ai-eval supabase/functions/chat/PostChatMessages
pnpm type-check:deno
pnpm tsc -b --force
# Needs ~/cleaned-test-data and OPEN_ROUTER_API_KEY. About $0.06 and 2 to 5 minutes.
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness baseline --model anthropic/claude-haiku-5.5 --concurrency 6
pnpm vite-script scripts/ai-eval/pdf/runPdfAssistEval.ts -- --setup extract-route --model anthropic/claude-haiku-5.5 --repeat 1
```

---

## F82: Pi data agent for Data Explorer chat behind a switch

Status: not started. Built on `feat/pi-agent`, merged into `demo/measles` in
`64bc1c78d` and `b32bf6834`. `feat/pi-agent` continued from its first merge
`64bc1c78d`, so `git log 774651c7d..dcedc1ca6` also lists `demo/measles`
work: its own commits are the 21 listed in F77 to F88.

**Purpose:** With the switch on (`localStorage["avandar:data-agent"] = "on"`
in a browser, or `VITE_AVA_DATA_AGENT=on` at build time), Data Explorer chat
runs through a data agent built on Pi (`@earendil-works/pi-agent-core`,
pinned at 1.5.0). The agent loop runs in the browser (`src/lib/agent/dataAgent`)
with three tools: `run_query` applies the SQL to the explorer and returns
only the row count and column names, so a hosted model never sees rows, and
a clean result ends the turn; `lookup_values` finds how named values are
stored, on the device, and asks the user when it cannot settle; `ask_user`
shows a question card. Query errors go back with literals removed
(`sanitizeQueryError`), filter values need the user's consent before they
cross, and an answer is capped at six model calls. Claude Haiku 5.5
answers, and Claude Sonnet 5.5 takes over after a failed or empty query
(`shared/agent/DataAgentModelRoster.ts`). Model calls go through a new
`chat` edge function route, `POST /chat/:workspaceId/agent/:promptId/api/stream`
(`PostAgentStream`), which speaks Pi's `streamProxy` wire format. The proxy
holds the OpenRouter key, accepts only the roster's models with an output
cap, refuses contexts over 400,000 characters and callers below Data
Explorer viewer, and builds the prompt and tools itself (D04): it reads the
workspace's datasets with the caller's permissions (`loadDataAgentDatasets`),
renders them with the shared `buildDataAgentSystemPrompt` (columns in column
order, so the prompt stays cached), sends the shared tool definitions
(`shared/agent/dataAgent/dataAgentTools.ts`), keeps only the conversation
from the browser, and refuses calls to tools the agent does not have. The
path names the prompt version (`data-agent-v1`). The agent's code loads with
a dynamic import, so it stays out of the main bundle. The eval gains a `pi`
harness that runs the same agent in Node against DuckDB.
**Value:** 45 of 45 questions on four of five runs at about $0.0003 a
question and 2.2 to 2.4 s at the median, against $0.024 and 4.4 s for
today's chat on Sonnet 5. Off for everyone until the switch is set.

**Design:** `docs/ai-agent/architecture.md`, decisions D01 to D15 and D04 in
`docs/ai-agent/decisions.md`, and `docs/ai-agent/spike-findings.md` (land
with F88).

**PR title:** `feat(ai-agent): answer Data Explorer chat with a Pi-based data agent behind a switch`

**Depends on:** F22 (`lookupValuesTool.ts` imports BUG-009's
`buildCandidateLookupSqlFromDiscovery`, `sanitizeQueryError.ts` imports
BUG-002's `QueryErrorKind`, `dataAgentTurnHelpers.ts` imports BUG-014's
`getLastQuestionFromMessages`, and the adapter and `waitForAppliedSqlOutcome.ts`
carry F22 hunks). F81 (the `pi` harness runs on its eval). Like F77, the
proxy calls `assertMeetsMinAppRole.ts` from the Postgres branch.

**Commits to read** (from `feat/pi-agent`; take files at `dcedc1ca6`, then
leave out F83's on-device hunks: `previewRowCount` and `previewRows` in
`DataAgentHost.ts`, `createDataAgent.ts`, `runQueryTool.ts` (`_describePreview`,
`_describeRowsForCheck`, the `previewRowCount` branch of `_toToolResult`),
and `PiHarness.ts`'s eval host; `queryTools`, the `plan` branch of
`_createTools`, and the `createPlanQueryTool` import in `createDataAgent.ts`;
the `plan_query` cases in `dataAgentTools.test.ts`; and the `pi-local`
harness in `runEval.ts`):

| SHA | Subject | Take |
|---|---|---|
| `d5d37b8c8` | feat(ai-eval): add a headless eval of the chat harness and a Pi-based data agent | MIXED: `package.json` (three `@earendil-works/pi-*` deps), `pnpm-lock.yaml` (regenerate), `src/lib/agent/dataAgent/**`, `harnesses/pi/{PiHarness,piEvalConfigs}.ts`, and the `pi` harness in `runEval.ts` go here. F81 and F77 take the rest. |
| `2fb2a1f91` | feat(chat): run Data Explorer chat through the Pi data agent behind a switch | All of it. The adapter hunk goes on `develop`'s `createChatModelAdapter.ts` path. Its `deno.json` array reformatting is undone by `658b112f4`. |
| `658b112f4` | feat(ai-agent): document the agent architecture, decisions, and eval results | MIXED: `harnesses/pi/PiHarness.ts`, every `src/` file (tests for the tools, prompt, and sanitizer; the query summary as the reply), `PostAgentStream.ts`, `toProxyEvent.test.ts`, and both `deno.json` go here. F81: the other eval files and `runChatAttemptsWithEscalation.test.ts`. F88: `docs/ai-agent/*`. |
| `5f51ce819` | feat(chat): replace the model picker with offline mode | MIXED: only `dataAgentTurnHelpers/dataAgentTurnHelpers.{ts,test.ts}` (new) and the slimmer `runDataAgentTurn.ts` that uses them. The rest is F84. |
| `a673d31ad` | feat(ai-agent): build the agent's prompt and tools on the server (D04) | All of it except the one-line import moves in `src/lib/agent/dataAgent/offline/*` and `planQueryTool.ts`, which F83's final files carry. It moves `buildDataAgentSystemPrompt.{ts,test.ts}` from `src/lib/agent/dataAgent/buildDataAgentSystemPrompt/` to `shared/agent/dataAgent/`. |

**Files:**
- Dependencies: `package.json` (`@earendil-works/pi-agent-core`,
  `@earendil-works/pi-ai`, `@earendil-works/pi-schema`, all `1.5.0`; add the
  exact versions by hand and run `pnpm install`), `pnpm-lock.yaml`
  (regenerate), and `deno.json` and `supabase/functions/chat/deno.json` (the
  `pi-agent-core`, `pi-ai`, `pi-schema`, `pi-ai/models`, and
  `pi-ai/providers/openrouter` import map entries).
- Shared (new): `shared/agent/DataAgentModelRoster.ts`,
  `shared/agent/dataAgent/{buildDataAgentSystemPrompt.ts,buildDataAgentSystemPrompt.test.ts,dataAgentTools.ts}`.
- Browser agent (new): `src/lib/agent/dataAgent/{DataAgentHost.ts,DataAgentRunState.ts}`,
  `browser/{DataAgentFeature.ts,createBrowserDataAgentHost.ts}`,
  `createDataAgent/createDataAgent.ts`,
  `createDataAgentTools/{askUserTool.ts,lookupValuesTool.ts,runQueryTool.ts,dataAgentTools.test.ts}`,
  `sanitizeQueryError/sanitizeQueryError.{ts,test.ts}`.
- Chat runtime: `src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn/runDataAgentTurn.ts`
  (new), `dataAgentTurnHelpers/dataAgentTurnHelpers.{ts,test.ts}` (new;
  leave out `ae8656e77`'s `DataAgentDatasetCache` hunks, which are F84),
  `waitForAppliedSqlOutcome/waitForAppliedSqlOutcome.ts`
  (`readAppliedSqlResult`), and the agent branch in `createChatModelAdapter.ts`
  (`develop`'s path).
- Proxy (new): `supabase/functions/chat/PostAgentStream/{PostAgentStream.ts,agentStreamTypes.ts,toProxyEvent.ts,toProxyEvent.test.ts,buildDataAgentProxyContext.ts,buildDataAgentProxyContext.test.ts,loadDataAgentDatasets.ts}`,
  and the route in `ChatRoutes.ts` and `ChatRoutes.types.ts`.
- Eval (new): `scripts/ai-eval/harnesses/pi/{PiHarness.ts,piEvalConfigs.ts}`,
  and the `pi` harness in `runEval.ts`.

**Schema:** none.

**Verification:**
```sh
pnpm install
pnpm vitest run src/lib/agent shared/agent supabase/functions/chat/PostAgentStream src/components/ChatPanel/useAvandarChatRuntime scripts/ai-eval
pnpm type-check:deno
pnpm tsc -b --force
# Needs ~/cleaned-test-data and OPEN_ROUTER_API_KEY. About $0.01.
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config haiku-sonnet --concurrency 6
```
Then serve the chat function (`pnpm fns:serve`), open the Data Explorer, run
`localStorage.setItem("avandar:data-agent", "on")`, reload, and ask a
question: the explorer shows the result.

---

## F83: Offline data agent on in-browser models

Status: not started. Built on `feat/pi-agent`, merged into `demo/measles` in
`64bc1c78d`.

**Purpose:** The data agent can run on small models in the browser through
WebLLM. `createLocalModelStreamFn` is a Pi stream function over a `LocalLlm`
(an interface F84's WebLLM engine implements). It decodes each step under a
JSON Schema of the agent's actions, closes braces a model left open, and
sends a tool call it still cannot read back as a failed call so the model
tries again. `createOfflineDataAgent` runs the same Pi agent with help a
hosted model never gets: it profiles the datasets on the device
(`profileOfflineDatasets`, without example values of many-valued columns),
finds the question's stored values in the data and keeps the longest match
(`findQuestionValues`, so "York" no longer matches inside "New York"),
shows the model the first rows of each result so it can check them
(`previewRowCount`), requires a query before it replies to a data question,
and routes each message by rules first, asking the model only when unsure
(`classifyOfflineMessage`). Small models answer with `plan_query`: they fill
slots (measures, filters, period, time grain, groups, calculation, order)
and tested code (`queryPlan/compileQueryPlan`) compiles them to DuckDB SQL,
including per-person rates, ratios across datasets, rolling averages,
running totals, and each group's top row. Every filter value is checked
against the data before the query runs. `run_query` stays for what a plan
cannot express. The system prompt stays the same for a whole conversation
and the model's own output is replayed verbatim, so WebLLM reuses its
cached prompt (0.5 s instead of 6 s per step). The eval gains a `pi-local`
harness that runs the models with WebLLM in a headless Chromium with WebGPU.
**Value:** Qwen3 4B answers 26 of the 45 questions with no needless
questions, in a median 15 s, from a 2.2 GB download, and nothing leaves the
computer. No UI yet: F84 uses it.

**Design:** decisions D25 to D30 in `docs/ai-agent/decisions.md` and
"Offline mode" in `docs/ai-agent/eval.md` (land with F88).

**PR title:** `feat(ai-agent): run the data agent on in-browser models`

**Depends on:** F82 (the agent core it extends and the `pi` harness's
`createPiConversation`).

**Commits to read** (from `feat/pi-agent`; take files at `dcedc1ca6`; none
is MIXED except `0889d1de0`):

| SHA | Subject | Take |
|---|---|---|
| `df1af310d` | feat(ai-agent): run the Pi data agent on in-browser models for offline mode | All of it, including the on-device hunks in `DataAgentHost.ts`, `createDataAgent.ts`, `runQueryTool.ts`, `PiHarness.ts`, and `runEval.ts` that F82 leaves out. |
| `414d8b1e7` | feat(ai-agent): answer offline questions from query plans, faster | All of it. |
| `50fbf4a34` | fix(ai-agent): stop small models copying examples, guessing values, and over-asking | All of it. |
| `1afe39e97` | fix(ai-agent): keep the longest stored-value match in an offline question | All of it. |
| `2f4e90630` | fix(ai-agent): retry a local model's unreadable tool call instead of ending | All of it. |
| `0889d1de0` | docs(ai-agent): record the offline mode decisions, model sweep, and roadmap | MIXED: `PiLocalHarness.ts` (the `qwen3-qwen35` config) and the one-line rule in `buildOfflineDataAgentSystemPrompt.ts` go here. `docs/ai-agent/*` goes to F88. |

**Files:**
- Local models (new): `src/lib/agent/localModels/LocalLlm.ts`,
  `src/lib/agent/localModels/createLocalModelStreamFn/{createLocalModelStreamFn.ts,createLocalModelStreamFn.test.ts,localActionFormat.ts,toLocalLlmMessages.ts}`.
- Offline agent (new): `src/lib/agent/dataAgent/offline/{offlineDataAgent.test.ts,buildOfflineDataAgentSystemPrompt/{buildOfflineDataAgentSystemPrompt.ts,offlinePlanInstructions.ts},classifyOfflineMessage/classifyOfflineMessage.ts,createOfflineDataAgent/createOfflineDataAgent.ts,findQuestionValues/findQuestionValues.ts,profileOfflineDatasets/profileOfflineDatasets.ts}`.
- Query plans (new): `src/lib/agent/dataAgent/queryPlan/{QueryPlan.ts,compileQueryPlan/{compileQueryPlan.ts,compileQueryPlan.test.ts,queryPlanSqlParts.ts,resolveQueryPlan.ts}}`,
  `src/lib/agent/dataAgent/createDataAgentTools/planQueryTool.ts`.
- On-device hunks: `DataAgentHost.ts`, `createDataAgent.ts`, `runQueryTool.ts`,
  `dataAgentTools.test.ts`.
- Eval: `scripts/ai-eval/harnesses/pi/PiLocalHarness.ts` (new),
  `scripts/ai-eval/runtime/WebLlmBrowser.ts` (new), `runEval.ts` (`pi-local`),
  and `PiHarness.ts` (`previewRows`, exported `createPiConversation`).

**Schema:** none.

**Verification:**
```sh
pnpm vitest run src/lib/agent scripts/ai-eval
pnpm tsc -b --force
# No API key. 20 to 40 minutes; needs Playwright's chromium (WebGPU) and downloads the model once.
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi-local --config single --model Qwen3-4B-q4f16_1-MLC --concurrency 1
```

---

## F84: Offline mode replaces the model picker, and chat answers on Claude Haiku 5.5

Status: not started. Built on `feat/pi-agent`, merged into `demo/measles` in
`64bc1c78d`. `develop` still has the model picker from PR #271.

**Purpose:** Avandar chooses every chat model, so the composer's model picker
is gone (D22). The `chat` edge function answers every turn with
`ChatModelOption.Catalog.defaultId`, now Claude Haiku 5.5 (added to the
catalog), and ignores a `model` a client sends; the request schema still
accepts it, so older clients validate. `enforceChatModelAllowlist` is
deleted. The one choice left is offline mode (D23). The composer's
`OfflineModeControl` opens a dialog that explains it, downloads or removes
the offline bundle as one progress job, toggles offline mode, shows when
chat runs offline, and explains when the browser cannot run the models.
`LocalChatModel` holds only the bundle (`OFFLINE_MODEL_BUNDLE` in
`LocalChatModel.constants.ts`: Qwen3 4B for answering and routing; a test
keeps the bundle under 4,500 MB of model memory, to fit a 16 GB computer).
`OfflineChatEngineStore` owns one WebLLM engine that implements F83's
`LocalLlm`, swaps the resident model per request, and still serves the
existing multi-pass offline pipeline. `OfflineModeStore` keeps the choice,
and `resolveChatRuntimeMode` runs a turn locally when offline mode is on, or
when the browser is offline and the bundle is downloaded. In the Data
Explorer a local turn runs F83's offline agent (`runOfflineDataAgentTurn`),
sharing dataset loading, the host, and conversation handling with F82's
`runDataAgentTurn`. The workspace's dataset list is kept for the tab
(`DataAgentDatasetCache`), so offline answers still start after the
connection drops. Other pages keep the old offline pipeline.
**Value:** One less decision for users, and today's chat costs about 1/18th
as much: Haiku 5.5 scored 44 and 45 of 45 on F81's eval, against Sonnet 5's
44 and 44 (D31). F77's PDF assistant moves to Haiku 5.5 with it.

**Design:** decisions D22 to D24 and D31 in `docs/ai-agent/decisions.md`
(land with F88).

**PR title:** `feat(chat): replace the model picker with offline mode, and answer chat on Claude Haiku 5.5`

**Depends on:** F83 (`LocalLlm`, the offline agent), F82
(`dataAgentTurnHelpers`, `runDataAgentTurn`), F77 (`runRegionModelAssist.ts`
must stop importing `ChatModelStorage`, which this deletes), F78 and F80
(keep their hunks when moving `createChatModelAdapter.ts`). F57 to F62
and F71 to F75 edited `shared/types/offlineChat.types.ts`, and
F94 (`f2e44f2e4`) edited `Composer.tsx` and `ChatModelPickerView.tsx`:
take only this feature's hunks if they have not merged.

**Commits to read** (from `feat/pi-agent`; take files at `dcedc1ca6`; four
are MIXED):

| SHA | Subject | Take |
|---|---|---|
| `7ea18c278` | feat(chat): answer every chat turn with the server's default model | MIXED: `ChatModelOptionModule.ts`, the `ChatRoutes.types.ts` `model` doc, `PostChatMessages.ts`, and the deletion of `enforceChatModelAllowlist/` go here. Its `runRegionModelAssist.{ts,test.ts}` hunks are history (F77 supersedes them). |
| `5f51ce819` | feat(chat): replace the model picker with offline mode | MIXED: everything except `dataAgentTurnHelpers/dataAgentTurnHelpers.{ts,test.ts}` and the `runDataAgentTurn.ts` slimming, which are F82. Moves `createChatModelAdapter.ts` into `createChatModelAdapter/`. Regenerate the catalogs. |
| `ae8656e77` | fix(chat): let offline answers start without a connection | MIXED: `dataAgentTurnHelpers/DataAgentDatasetCache.ts` and its `dataAgentTurnHelpers.{ts,test.ts}` hunks go here. The "Answer offline" button is F80. |
| `bbf3d435a` | feat(chat): answer chat with Claude Haiku 5.5 instead of Claude Sonnet 5 | MIXED: `ChatModelOptionModule.{ts,test.ts}` go here. `docs/ai-agent/*` goes to F88. |

**Files:**
- Server model: `shared/models/chat/ChatModelOption/ChatModelOptionModule/ChatModelOptionModule.{ts,test.ts}`,
  `supabase/functions/chat/PostChatMessages/PostChatMessages.ts`,
  `supabase/functions/chat/ChatRoutes.types.ts`, and
  `supabase/functions/chat/PostChatMessages/enforceChatModelAllowlist/` (deleted).
- Offline bundle: `shared/models/chat/LocalChatModel/{LocalChatModel.constants.ts (new),LocalChatModel.ts,LocalChatModel.types.ts,LocalChatModelModule/LocalChatModelModule.{ts,test.ts}}`
  and `shared/types/offlineChat.types.ts`.
- Composer control (new): `src/components/ChatPanel/OfflineModeControl/{OfflineModeControl.tsx,OfflineModeControl.module.css,OfflineModeControl.test.tsx,OfflineModeDialog.tsx,OfflineModeToggle.tsx,OfflineModeSetupButton.tsx,OfflineModeBusyButton.tsx,useOfflineModeControlState.ts,useOfflineModelActions.ts}`,
  wired in `src/components/ChatPanel/ChatThread/Composer/Composer.tsx`.
- Stores: `src/stores/OfflineModeStore/OfflineModeStore.{ts,test.ts}` (new),
  `src/stores/OfflineChatEngineStore/{OfflineChatEngineStore.ts,OfflineChatEngineStore.test.ts,deleteLocalChatModelCache/*}`,
  `src/stores/OfflineChatEngineStore/createLocalModelRuntime/{createLocalModelRuntime.ts,createMockLocalModelRuntime.ts,createWebLlmModelRuntime.ts,createWebLlmModelRuntime.test.ts,offlineChatContextWindow.ts}`
  (new) and `isOfflineChatMockForced.ts` (moved from `createOfflineChatEngine/`),
  `src/stores/LocalChatModelStore/LocalChatModelStore.{ts,test.ts}`.
- Hooks: `src/hooks/localChatModels/{useIsOfflineBundleDownloaded.ts,useIsOfflineModeOn.ts}`
  (new) and `useOfflineChatEngineStatus.ts`.
- Chat runtime: `src/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter/{createChatModelAdapter.ts (moved),createChatModelAdapter.test.ts (new),runLocalChatTurn.ts (new)}`,
  `runOfflineDataAgentTurn/runOfflineDataAgentTurn.{ts,test.ts}` (new),
  `dataAgentTurnHelpers/DataAgentDatasetCache.ts` (new) and its hunks in
  `dataAgentTurnHelpers.{ts,test.ts}`, `resolveChatRuntimeMode/*`,
  `runOfflineChatTurn/runOfflineChatTurn.ts`,
  `runOfflineChatPipeline/runOfflineChatPipeline.test.ts`,
  `ChatAnalyticsPayloads/*`, and `useAvandarChatRuntime.ts`.
- Deleted: `src/components/ChatPanel/{ChatModelPicker,ChatModelStorage,OfflineChatDownloadControl,useChatModelCatalog}/**`,
  `src/components/ChatPanel/offlineChatHelpers/OfflineChatPickerModels/**`,
  `src/hooks/localChatModels/useLocalChatModelCopy/`,
  `src/lib/localModels/ModelPickerCopy/`, and
  `src/stores/OfflineChatEngineStore/createOfflineChatEngine/**`.
- `src/i18n/locales/*/messages.po`: regenerate.

**Schema:** none.

**Verification:**
```sh
pnpm i18n:extract && pnpm i18n:compile
pnpm vitest run src/components/ChatPanel src/stores src/hooks/localChatModels shared/models/chat supabase/functions/chat
pnpm type-check:deno
pnpm tsc -b --force
```
Then, in Chrome or Edge with WebGPU, open the chat, click **Offline**, then
**Download offline models** (about 2.2 GB), turn offline mode on, and ask a
question in the Data Explorer.

---

## F85: Agent query results as gadget cards in the chat

Status: not started. Built on `feat/agent-default`, merged into
`demo/measles` in `cc3833377`.

**Purpose:** A chat message can carry an agent query result as an
assistant-ui data part (`AgentQueryResult`, version 1: the SQL, chart type,
title, and whether it shows as an embed or a link; never rows or dataset
ids). `AssistantMessage` draws it with F21's gadget visuals: an inline chip
that opens the query in the Data Explorer through its URL params, or an
embed card with `GadgetCardHeader` over a live body that re-runs the SQL in
DuckDB-Wasm through `useDataQuery` and draws it with `VisualizationContainer`.
`useAgentQueryResultView` builds the chart config and splits long results by
category with F79's hook. The card code loads on first use
(`AgentQueryResultPartLazy`) behind a placeholder of the card's size, so the
chart libraries stay out of the app shell's bundle and nothing shifts. The
query's cache key is stable, so reopening a thread does not re-run a cached
result. A failed re-run shows "This result could not be loaded" and is
recorded under the Data Explorer app with the new query surface
`chat_result`. `ChatThreadStore` persists the part, so a reloaded thread
re-runs it.
**Value:** The agent can answer outside the Data Explorer (F86) without
moving the user, and its results stay live. Nothing writes these parts until
F86.

**Design:** "The result card" in `docs/ai-agent/specs/phase-1a.md` and D36
in `docs/ai-agent/decisions.md` (land with F88).

**PR title:** `feat(ai-agent): show agent query results in the chat as gadget cards`

**Depends on:** F21 (`GadgetCardHeader`, the gadget card and chip CSS, the
gadget registry), F79 (`useCategorySplitChartInput`).

**Commits to read** (from `feat/agent-default`; take files at `8301ced8f`):

| SHA | Subject | Take |
|---|---|---|
| `f253fa169` | feat(ai-agent): store agent query results in the chat thread | All of it. |
| `63d934d75` | feat(ai-agent): draw agent results in the chat as gadget cards | All of it. |
| `168af0f5b` | feat(ai-agent): show agent results inside assistant messages | All of it. Regenerate the catalogs. |
| `8b07b0c08` | fix(ai-agent): import the chart config type from its model | All of it. |
| `ad9df5c53` | fix(ai-agent): cache chat results and steady the result card | All of it, including the doc note in `waitForAppliedSqlOutcome.ts`. Regenerate the catalogs. |
| `726022388` | fix(ai-agent): load the chat result card on first use | All of it. |
| `7f06c7c6c` | fix(ai-agent): draw one series per category in chat and explorer charts | MIXED: only `useAgentQueryResultView.{ts,test.tsx}`. The rest is F79. |
| `8301ced8f` | fix(ai-agent): explain split charts in the drawer and cover real date shapes | MIXED: only `useAgentQueryResultView.{ts,test.tsx}`. The rest is F79. |

**Files:**
- `src/components/ChatPanel/ChatThread/AgentQueryResultPart/{AgentQueryResult.ts,AgentQueryResult.test.ts,agentQueryResultDefinition.ts,AgentQueryResultPart.tsx,AgentQueryResultPart.module.css,AgentQueryResultPart.test.tsx,AgentQueryResultPartLazy.tsx,AgentQueryResultPartLazy.test.tsx,useAgentQueryResultView.ts,useAgentQueryResultView.test.tsx}` (new).
- `src/components/ChatPanel/ChatThread/AssistantMessage/AssistantMessage.{tsx,test.tsx}`.
- `src/components/ChatPanel/ChatThreadStore/ChatThreadStore.test.ts`.
- `src/components/RichText/Gadget/GadgetCard/GadgetCardHeader.tsx`.
- `shared/analytics/AnalyticsEvents/AnalyticsEvents.types.ts` and
  `src/views/DataExplorerApp/useDataQueryAnalytics/useDataQueryAnalytics.{ts,test.ts}`.
- `src/components/ChatPanel/useAvandarChatRuntime/waitForAppliedSqlOutcome/waitForAppliedSqlOutcome.ts` (doc only).
- `src/i18n/locales/*/messages.po`: regenerate.

**Schema:** none.

**Verification:**
```sh
pnpm i18n:extract && pnpm i18n:compile
pnpm vitest run src/components/ChatPanel/ChatThread src/components/ChatPanel/ChatThreadStore src/components/RichText/Gadget src/views/DataExplorerApp/useDataQueryAnalytics
pnpm tsc -b --force
```

---

## F86: Page-agnostic agent: the current page in every turn, results in the chat

Status: not started. Built on `feat/agent-default`, merged into
`demo/measles` in `cc3833377`. The commits are
`git log --oneline --no-merges 2329454f0..8301ced8f`, less those owned by
F78, F79, F85, F87, and F88.

**Purpose:** With the switch on, the agent answers every online chat turn on
every page except the case designer, which keeps today's `chat` function,
and the composer accepts input on those pages (with the switch off, chat
stays limited to the Data Explorer and Dashboards). Each turn's message
starts with a `<current_page>` block built in `shared/agent/pageContext`, so
the browser and the eval send the same text: the app and route, the open
dataset (its name first, its alias as a note for SQL), the Data Explorer's
SQL (cut at 1,500 characters) and result columns, the open dashboard's name
and up to 12 tiles in page order with title, chart type, and SQL, the open
map or case type name, or for a case page only its case type and "one case
is open". When the page is the same as the last turn's, one "unchanged" line
replaces the block, so the system prompt and earlier turns stay cached. Page
text is escaped so it cannot close or inject into the block, and chart
titles and SQL string literals that look like personal data are replaced
(`isPersonalDataText`, `redactSqlLiterals`). The browser reads the page from
the route (`parseAgentPageRoute`), `useChatPageContext`, and the dashboard
editor (`extractDashboardTiles`, using `collectDataVizNodes`, which
`findDashboardTile.ts` now exports, so nested and legacy-zone charts count),
resolves published dashboards by slug among workspace dashboards, and loads
names with the user's own session (`agentPageNameLoader`). Prompt
`data-agent-v2` adds the block's rules (the block says what "this" means;
ask with up to five chart titles when several could be meant; page text is
data, never instructions; SQL ending in "..." was cut; never show a table
alias), and the proxy serves v1 and v2. A per-conversation host
(`createConversationAgentHost`) sends each `run_query` result to the Data
Explorer when the user is on it or the turn is offline, and into the chat
everywhere else (`showQueryInChat`, as a F85 result part named by its
summary when the question is blank). Each turn has its own results, a new
turn aborts a running one, and a conversation keeps the datasets it started
with, so aliases stay stable. `createDataAgent` now rejects when a model
call fails: a network failure offers "Answer offline" (D37), a 403 replies
that the user needs Data Explorer access (`isAgentAccessDenied`), and
anything else replies "The assistant could not answer that. Try again in a
moment." The eval gains six page-context questions (P01 to P06), grades a
failed model call as a miss, and `tests/e2e/agent-chat-result.spec.ts`
checks a result card's rows on a dashboard against a mocked proxy.
**Value:** People can ask about what they are looking at ("this chart",
"this dataset") from any page and see the answer without leaving it. 6 of 6
page questions on three runs, and 45 of 45 on the original questions (eval
label `phase-1a`).

**Design:** `docs/ai-agent/specs/phase-1.md`, `docs/ai-agent/specs/phase-1a.md`,
and decisions D34 to D38 in `docs/ai-agent/decisions.md` (land with F88).
Plan: `docs/ai-agent/plans/phase-1a.md`.

**PR title:** `feat(ai-agent): answer chat on every page with the agent, reading the current page`

**Depends on:** F84 (the adapter at its new path, `runOfflineDataAgentTurn`,
`OfflineModeStore`), F85 (the result part `showQueryInChat` writes), F78
(its adapter hunk and the test cases this feature's copy of
`createChatModelAdapter.test.ts` carries), and F21 (`findDashboardTile.ts`;
`9abd59155` from `feat/comment-embeds` also edits it). F57 to F62 and
F71 to F75 edited `SqlTableAliasModule.ts`.

**Commits to read** (from `feat/agent-default`). Take files only this
feature touches at `8301ced8f`. For the files F87 also changes
(`buildAgentPageContextBlock.{ts,test.ts}`, `buildDataAgentSystemPrompt.{ts,test.ts}`,
`runDataAgentTurn.{ts,test.ts}`, `createConversationAgentHost.{ts,test.ts}`,
`dataAgentConversation.types.ts`, `dataAgentTurnHelpers.{ts,test.ts}`,
`runOfflineDataAgentTurn.test.ts`, `detectPii.ts`, `EvalQuestion.ts`,
`covidPageQuestions.ts`, and `PiHarness.{ts,test.ts}`), take them at
`eb4428ac3`, the last F86 commit before F87, then apply the later F86 hunks
listed below (`0cd0688c4`, `ba695a978`, and the F86 hunks of `1f0734f04`
and `49164114f`). One is MIXED:

| SHA | Subject | Take |
|---|---|---|
| `4f17f2f48` | feat(ai-agent): map DuckDB table names back to prompt aliases | All of it. |
| `cd1f46dbf` | feat(ai-agent): describe the current page at the start of each turn | All of it. |
| `f98d6a64b` | fix(ai-agent): keep page block names and SQL on their own lines | All of it. |
| `80addd33c` | fix(ai-agent): keep page block column names on one line | All of it. |
| `8dc294b2c` | feat(ai-agent): add prompt v2 that reads the current page block | All of it. |
| `a18b30610` | feat(ai-agent): serve data agent prompts v1 and v2 from the proxy | All of it. |
| `61ae43579` | fix(ai-agent): stop page SQL from closing the page block | All of it. |
| `73e907a7b` | fix(ai-agent): escape line separators in page block names | All of it. |
| `02a76d122` | fix(ai-agent): tighten prompt v2's current page rules | All of it. |
| `9dd609fc5` | feat(ai-agent): read the current page from the route and dashboard | All of it. |
| `4dcd837ee` | feat(ai-agent): build the agent's page context from page state | All of it. |
| `2dcba8303` | feat(ai-agent): send agent results to the explorer or the chat by page | All of it. |
| `8c95f1cb1` | fix(ai-agent): read slugged dashboards and nested charts into the page context | All of it, including `collectDataVizNodes` in `findDashboardTile.ts`. |
| `897e2b897` | feat(ai-agent): carry the page and results through each agent turn | All of it. |
| `d295a92c0` | fix(ai-agent): pick the workspace dashboard for a slug | All of it. |
| `9f24d9779` | feat(ai-agent): answer chat on every page with the agent | All of it. |
| `f1b04d4dd` | fix(ai-agent): offer offline answers when the agent cannot be reached | All of it. |
| `3c49bb065` | fix(ai-agent): keep agent turns and aliases consistent | All of it. |
| `192d58d29` | test(ai-eval): add six page-context questions for the agent | All of it. |
| `97c721a90` | test(ai-eval): grade page question P02 by state | All of it. |
| `fb7d6f61f` | fix(ai-agent): give each agent turn its own results | All of it. |
| `66b2347ad` | fix(ai-agent): name chat results by their summary when the question is blank | All of it. |
| `edb8e8ca0` | test(ai-agent): browser spec for agent results on a dashboard | All of it. |
| `7e7ea9e26` | fix(ai-agent): escape page tags written with spaces in page SQL | All of it. |
| `a556fdde6` | fix(ai-agent): redact personal data in dashboard charts in the page block | All of it. F87 later deletes `redactSqlLiterals.{ts,test.ts}`; `isPersonalDataText` stays. |
| `25467983a` | fix(ai-agent): reject the agent's answer when a model call fails | All of it. |
| `3615d4be7` | fix(ai-agent): read the route and dashboard editor with the page context | All of it. |
| `5bb545747` | test(ai-agent): check the chat result's rows in the browser spec | All of it. |
| `228a6a51c` | fix(ai-agent): reply when the agent cannot answer | MIXED: the `src/` files go here (regenerate the catalogs). `docs/ai-agent/{decisions.md,specs/phase-1a.md}` go to F88. |
| `b3f6f748d` | fix(ai-eval): grade a failed model call as a miss instead of ending the run | All of it. |
| `eb4428ac3` | fix(ai-agent): let people ask the agent from every page | All of it. |
| `0cd0688c4` | fix(ai-agent): name datasets, not their table aliases, to the user | All of it: three small hunks on top of F86's `eb4428ac3` files (the dataset line, prompt v2's alias rule, and its test). |
| `ba695a978` | test(ai-agent): pin prompt v1's exact text | All of it. |
| `1f0734f04` | fix(ai-agent): keep a case's id out of view-change lines | MIXED: only the `dataAgentTurnHelpers.test.ts` hunk (the recap) and the `createChatModelAdapter.test.ts` cases. The rest is F78. |
| `49164114f` | fix(ai-agent): anchor the case id pattern on the workspace slug | MIXED: only the `buildDataAgentSystemPrompt.test.ts` hunk and the `createChatModelAdapter.test.ts` cases. The rest is F78. |

**Files:**
- Page block (new): `shared/agent/pageContext/{AgentPageContext.ts,buildAgentPageContextBlock.ts,buildAgentPageContextBlock.test.ts,buildAgentTurnText.ts,buildAgentTurnText.test.ts,redactSqlLiterals.ts,redactSqlLiterals.test.ts}`
  (F87 deletes the last two), and
  `shared/models/chat/SqlTableAlias/{SqlTableAliasModule.ts,SqlTableAlias.test.ts}`.
- Prompt v2: `shared/agent/dataAgent/{buildDataAgentSystemPrompt.ts,buildDataAgentSystemPrompt.test.ts,dataAgentTools.ts}`,
  `src/lib/agent/dataAgent/createDataAgent/{createDataAgent.ts,createDataAgent.test.ts (new)}`,
  and `supabase/functions/chat/PostAgentStream/{PostAgentStream.ts,buildDataAgentProxyContext.ts,buildDataAgentProxyContext.test.ts}`.
- Page reading (new): `src/components/ChatPanel/useAvandarChatRuntime/agentPageContext/{agentPageNameLoader.ts,agentPageNameLoader.test.ts,createAgentPageContext.ts,createAgentPageContext.test.ts,extractDashboardTiles.ts,extractDashboardTiles.test.ts,parseAgentPageRoute.ts,parseAgentPageRoute.test.ts}`,
  and `src/clients/dashboards/findDashboardTile/findDashboardTile.ts`.
- Turns: `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/{createConversationAgentHost.ts,createConversationAgentHost.test.ts,showQueryInChat.ts,showQueryInChat.test.ts,dataAgentConversation.types.ts}`
  (new), `dataAgentTurnHelpers.{ts,test.ts}`,
  `runDataAgentTurn/runDataAgentTurn.{ts,test.ts (new)}`,
  `runOfflineDataAgentTurn/runOfflineDataAgentTurn.{ts,test.ts}`,
  `src/lib/agent/dataAgent/browser/{createBrowserDataAgentHost.ts,DataAgentFeature.ts}`,
  and `src/lib/agent/dataAgent/offline/offlineDataAgent.test.ts`.
- Chat entry: `src/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter/createChatModelAdapter.{ts,test.ts}`,
  `chatRuntimeTurnHelpers.ts`, `useAvandarChatRuntime.ts`,
  `isAgentAccessDenied.{ts,test.ts}` (new), `isNetworkChatFailure.test.ts`
  (new), and `src/components/ChatPanel/ChatThread/Composer/Composer.{tsx,test.tsx (new)}`.
- Privacy helper: `src/components/privacy/privacy-helpers/detectPii/detectPii.{ts,test.ts}`
  (`isPersonalDataText`).
- Eval: `scripts/ai-eval/covid/covidPageQuestions.ts` (new),
  `scripts/ai-eval/{EvalQuestion.ts,runEval.ts,covid/covidQuestions.ts,harnesses/baseline/BaselineHarness.ts}`,
  and `scripts/ai-eval/harnesses/pi/{PiHarness.ts,PiHarness.test.ts (new)}`.
- E2E (new): `tests/e2e/agent-chat-result.spec.ts`.
- `src/i18n/locales/*/messages.po`: regenerate.

**Schema:** none.

**Verification:**
```sh
pnpm i18n:extract && pnpm i18n:compile
pnpm vitest run shared/agent shared/models/chat/SqlTableAlias src/lib/agent src/components/ChatPanel src/clients/dashboards src/components/privacy supabase/functions/chat/PostAgentStream scripts/ai-eval
pnpm type-check:deno
pnpm tsc -b --force
pnpm test:e2e agent-chat-result.spec.ts
# Needs ~/cleaned-test-data and OPEN_ROUTER_API_KEY.
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config haiku-sonnet --questions P
```

---

## F87: Column-aware placeholders keep personal values in page SQL on the device

Status: not started. Built on `feat/agent-default`, merged into
`demo/measles` in `cc3833377`.

**Purpose:** Page SQL (dashboard tiles and the explorer's query) now reaches
the hosted model with personal values swapped for `'<value N>'`
placeholders, replacing F86's pattern-only redaction.
`findSensitiveSqlLiterals` fails closed: it hides every literal in an
expression that reads a personal column or an alias (any operator, function,
`CASE`, `BETWEEN`, or cast), every `VALUES` literal, strings whose value
looks personal, typed and dollar-quoted literals, and every literal in SQL
that cannot be parsed. Personal columns are matched as whole words after
normalizing spreadsheet headers (`isPersonalColumnName`, on `detectPii`'s
keywords), so `stage` and `Population` are not flagged. Comments are
dropped. Each conversation keeps a `SqlPlaceholderVault` that records each
value's kind and why it is held, and `createPlaceholderRestoringHost`
restores the values before `run_query` and value lookups run, so the
explorer and the result card get the real SQL while the model never sees
it. Result column names, preview cells, and errors from a restored query are
masked before the model reads them. Only values a chart's SQL compares are
masked as words in titles and page names, so page text stays readable.
Integers keep every digit. SQL with an unknown placeholder, or one inside a
longer string, fails without running. Prompt v2 tells the agent to keep
placeholders as written, that they can appear anywhere in page text, and
never to ask the user for a hidden value. The eval gains P07 (a chart
filtered on a personal column), and the Pi harness builds page blocks with
the same privacy.
**Value:** A dashboard over a case list can be on screen while people ask the
agent, without names, phone numbers, or ids reaching the model (D39). Two
adversarial reviews found and closed leaks; what stays open is listed in
`docs/ai-agent/specs/phase-1a-redaction.md`.

**Design:** `docs/ai-agent/specs/phase-1a-redaction.md` and D39 in
`docs/ai-agent/decisions.md` (land with F88).

**PR title:** `feat(ai-agent): keep personal values in page SQL on the device`

**Depends on:** F86 (the page block, host, and prompt v2 it rewrites).

**Commits to read** (from `feat/agent-default`; take files at `8301ced8f`;
none is MIXED):

| SHA | Subject | Take |
|---|---|---|
| `897504c9a` | feat(ai-agent): keep personal values in page SQL on the device | All of it, including deleting `redactSqlLiterals.{ts,test.ts}`. |
| `2f7200add` | test(ai-eval): ask P07 about a chart filtered on a personal column | All of it. |
| `8dba93314` | fix(ai-agent): tell prompt v2 to keep page placeholders as written | All of it. |
| `27e1dabf6` | test(ai-eval): keep P07's county out of the chart title | All of it. |
| `8745f3feb` | fix(ai-agent): close the page placeholder leaks found in review | All of it. Deletes `SqlStringLiterals.{ts,test.ts}` that `897504c9a` added. |
| `4b835b702` | fix(ai-agent): tell prompt v2 how to use placeholders safely | All of it. |
| `c8328eb38` | test(ai-eval): build eval page blocks with the stricter page privacy | All of it. |
| `8240b7e58` | fix(ai-agent): keep page text readable and large ids exact in redaction | All of it. |
| `9bb72e310` | fix(ai-agent): say placeholders can appear anywhere in page text | All of it. |
| `b7576f4bd` | fix(ai-agent): scope prompt v2's "never ask" to placeholders | All of it. |

**Files:**
- Page privacy (new): `src/lib/agent/dataAgent/pagePrivacy/{SqlPlaceholderVault.ts,SqlPlaceholderVault.test.ts,createPlaceholderRestoringHost.ts,createPlaceholderRestoringHost.test.ts,findSensitiveSqlLiterals.ts,findSensitiveSqlLiterals.test.ts,isPersonalColumnName.ts,isPersonalColumnName.test.ts,pageBlockPrivacy.test.ts,pageSqlLeaks.test.ts,__tests__/placeholderRoundTrip.executed.test.ts}`.
- Page block: `shared/agent/pageContext/SqlLiterals.{ts,test.ts}` (new),
  `buildAgentPageContextBlock.{ts,test.ts}`, and `redactSqlLiterals.{ts,test.ts}` (deleted).
- Prompt v2: `shared/agent/dataAgent/buildDataAgentSystemPrompt.{ts,test.ts}`.
- Host and turns: `src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn/runDataAgentTurn.{ts,test.ts}`,
  `dataAgentTurnHelpers/{createConversationAgentHost.ts,createConversationAgentHost.test.ts,dataAgentConversation.types.ts,dataAgentTurnHelpers.ts,dataAgentTurnHelpers.test.ts}`,
  `runOfflineDataAgentTurn/runOfflineDataAgentTurn.test.ts`,
  `__tests__/explorerPageBlock.integration.test.tsx` (new),
  `src/lib/agent/dataAgent/{DataAgentHost.ts,createDataAgentTools/lookupValuesTool.ts}`,
  and `src/components/privacy/privacy-helpers/detectPii/detectPii.ts`
  (`PII_COLUMN_NAME_KEYWORDS`).
- Eval: `scripts/ai-eval/{EvalQuestion.ts,covid/covidPageQuestions.ts,harnesses/pi/PiHarness.ts,harnesses/pi/PiHarness.test.ts}`.

**Schema:** none.

**Verification:**
```sh
pnpm vitest run src/lib/agent/dataAgent shared/agent src/components/ChatPanel/useAvandarChatRuntime src/components/privacy/privacy-helpers/detectPii scripts/ai-eval
pnpm test:executed src/lib/agent/dataAgent/pagePrivacy
pnpm tsc -b --force
pnpm test:e2e agent-chat-result.spec.ts
# Needs ~/cleaned-test-data and OPEN_ROUTER_API_KEY.
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config haiku-sonnet --questions P
```

---

## F88: Agent docs: architecture, decisions, eval, roadmap, and the page-agnostic agent specs

Status: not started. Built on `feat/pi-agent` and `feat/agent-default`,
merged into `demo/measles` in `64bc1c78d`, `b32bf6834`, `2329454f0`, and
`cc3833377`. F89 to F91 (`feat/agent-context`) keeps editing the same
files after `cc3833377`.

**Purpose:** `docs/ai-agent/` explains the agent work for whoever picks it
up next. `README.md` gives the results in one table and how to try the agent
and offline mode. `architecture.md` is the target design: the agent loop in
the browser, the proxy, the tools, the privacy boundary, the model policy,
and the cost model. `decisions.md` logs every decision (D01 to D42; D41 and
D42 are F89 to F91's) with alternatives and costs. `eval.md` holds
the results, the online and offline model sweeps, the method in full (data
checksums, graders, metrics, versions), and the command behind every
number. `roadmap.md` is the approved plan to one Avandar agent (D33),
including what must happen before the agent reaches paying users (metering
and plan budgets). `spike-findings.md` covers bundle size, Deno, prompt
caching, and the browser run. `specs/phase-1.md`, `specs/phase-1a.md`, and
`specs/phase-1a-redaction.md` specify the page-agnostic agent and its
placeholders, and `plans/phase-1a.md` is its implementation plan.
**Value:** The reasoning and the evidence behind F77 to F87 stay with the
code.

**PR title:** `docs(ai-agent): document the agent's architecture, decisions, eval, and roadmap`

**Depends on:** F87 and F89 to F91 (their docs commits edit the same
files; one docs PR for both is simplest).

**Commits to read** (take the files at their final state; seven are MIXED):

| SHA | Subject | Take |
|---|---|---|
| `658b112f4` | feat(ai-agent): document the agent architecture, decisions, and eval results | MIXED: only `docs/ai-agent/{README,architecture,decisions,eval,spike-findings}.md`. |
| `0889d1de0` | docs(ai-agent): record the offline mode decisions, model sweep, and roadmap | MIXED: only `docs/ai-agent/*`. |
| `bbf3d435a` | feat(chat): answer chat with Claude Haiku 5.5 instead of Claude Sonnet 5 | MIXED: only `docs/ai-agent/{README,decisions}.md`. |
| `91ca087ec` | docs(ai-eval): document the eval method in full and archive every run | MIXED: only `docs/ai-agent/{README,eval}.md`. `archiveEvalRuns.ts` and `eval-runs/**` are branch-only. |
| `de18389c8` | docs(ai-agent): record D04 and the PDF assistant's eval, and archive its runs | MIXED: only `docs/ai-agent/*.md`. |
| `dcedc1ca6` | docs(ai-agent): write up the plan to the full agent, and a handoff to start it | All of it except `HANDOFF.md`, which `fb7f700d0` deletes. |
| `c98fd45e1` | docs(ai-agent): reshape Phase 1 and spec the page-agnostic agent | All of it. |
| `fb7f700d0` | docs(ai-agent): plan the page-agnostic agent and retire the handoff | All of it. |
| `3eb472fc3` | docs(ai-agent): record phase 1A results and mark it done | All of it. |
| `cee040239` | docs(ai-agent): record the review fixes in the phase 1A spec | All of it. |
| `228a6a51c` | fix(ai-agent): reply when the agent cannot answer | MIXED: only `docs/ai-agent/{decisions.md,specs/phase-1a.md}`. |
| `a545592d6` | docs(ai-agent): design column-aware placeholders for personal values in page SQL | All of it. |
| `43374bb44` | docs(ai-agent): record page placeholders (D39) and the P07 runs | MIXED: the four `.md` files. Its three `eval-runs/` files are branch-only. |
| `a07ceef38` | docs(ai-agent): record the placeholder review fixes and what stays open | All of it. |
| `8215d680b` | docs(ai-agent): record the second placeholder review | All of it. |
| `c99cc385b` | docs(ai-agent): record the alias and case id fixes | All of it. |

**Files:**
- `docs/ai-agent/{README.md,architecture.md,decisions.md,eval.md,roadmap.md,spike-findings.md}`.
- `docs/ai-agent/specs/{phase-1.md,phase-1a.md,phase-1a-redaction.md}` and
  `docs/ai-agent/plans/phase-1a.md` (see Open questions).
- F89 to F91's `specs/phase-1b.md` and `plans/phase-1b.md`, if this
  PR carries both features' docs.
- Not ported: `docs/ai-agent/HANDOFF.md` (added and deleted twice) and
  `docs/ai-agent/eval-runs/**` (branch-only).
- Before porting, rewrite the README's status line ("spike on
  `feat/pi-agent`") and the links into `eval-runs/` in `README.md` and
  `eval.md` ("Run archive", "Reproducing every result").

**Schema:** none.

**Verification:**
```sh
grep -rn "eval-runs/" docs/ai-agent
grep -rn "HANDOFF" docs/ai-agent
```
Each hit must be a link that resolves on `develop` or a sentence that names
the `demo/measles` archive.

---

## F89: Mentioned and attached gadgets reach the agent

Status: not started. Built on `feat/agent-context`, merged into `demo/measles`
in `4eddab717`. The branch's commits are
`git log --oneline --no-merges 4eddab717^1..4eddab717^2` (57). They split
into F89, F90, and F91; the HANDOFF commits are branch-only. One merge of
`demo/measles` into the branch (`8afeaa6b0`) resolved only translation
catalogs. `develop` has none of it (`shared/agent/` does not exist there) and
no PR is open.

**Purpose:** The page-agnostic agent now reads what the user points it at,
not only the page. A chat message can hold ref tokens such as
`@{dataset:<uuid>}` or `@{dashboard_tile:<uuid>/<block id>}`
(`ChatMentionToken`), and the chat carries a tray of up to five attached
refs. Each turn, `createAgentGadgetContextLoader` loads every ref with the
user's own session, so RLS applies, and checks its workspace. The turn text
is `<current_page>`, `<attached>`, `<mentioned>`, then the message with each
token as `@"Name"`. Only metadata is sent: a dashboard's tiles (title, chart
type, SQL), a tile with its dashboard's name, a dataset's alias in the
conversation, a map's layers, a case type's field names, or "an unavailable
dashboard" with no name. The first five mentions are described, each
dashboard lists at most 12 tiles, at most 24 tiles in all, and SQL is cut at
1,500 characters. A mention of the tray or the page's own dashboard is one
pointer line. Every gadget's SQL is redacted into the conversation's
placeholder vault before any cap or mask, so a value a capped chart filters
on is still hidden in every title. Block tags hidden with invisible
characters are escaped, in linear time. Prompt `data-agent-v3` reads both
blocks and is served beside v1 and v2. Today's hosted chat hears each
mention by its type only (`@"a dataset"`), and every offline answer is marked
in its message metadata and replaced by a fixed line on hosted requests.
Labels show tokens as `@Name`, and analytics carry only `mentionCount` and
`attachedCount`. The eval gains M01 to M06 (`--questions M`).
**Value:** The agent can answer about a dashboard, tile, dataset, map, or
case type that is not on screen, with the same privacy guarantees as the
page block, and without names or ids reaching a hosted model.

**Design:** `docs/ai-agent/specs/phase-1b.md` (with its three privacy review
rounds). Plan: `docs/ai-agent/plans/phase-1b.md`. Decisions D41 and D42 in
`docs/ai-agent/decisions.md`.

**PR title:** `feat(ai-agent): send mentioned and attached gadgets to the agent`

**Depends on:** F86 and F87 (the page block, its redaction
vault, the turn text, `extractDashboardTiles`, the agent turn, prompt v2,
and `agent-chat-result.spec.ts`), F81 to F85 (the agent, the proxy, and the
eval), F21 (the `Gadget` model and `isGadgetRef`), and F22
(`getLastQuestionFromMessages` from BUG-014, and the
`applyChatModelTurnResponse.ts` that F89 extends).

**Commits to read** (from `feat/agent-context`; `966cb0dab`, `d7f6ed19f`,
`83b016c7d`, `e6bc263c4`, `ba4c249a0`, and `1f3bc348d` are MIXED):

| SHA | Subject | Take |
|---|---|---|
| `966cb0dab` | docs(ai-agent): hand off the agent work after Phase 1A | MIXED: `docs/ai-agent/roadmap.md` and `docs/ai-agent/specs/phase-1a.md` (1A's live checks) go here. `HANDOFF.md` is branch-only. |
| `d7f6ed19f` | docs(ai-agent): record the push and widen 1E to parity | MIXED: `decisions.md` (D40), `roadmap.md`, and `specs/phase-1.md` go here. `HANDOFF.md` is branch-only. |
| `61e3e0c55` | docs(ai-agent): spec Phase 1B, attachable context | All of it. |
| `83b016c7d` | docs(ai-agent): plan Phase 1B and retire the handoff | MIXED: `plans/phase-1b.md` (new) and `roadmap.md` ("What keeps the agent off") go here. Deleting `HANDOFF.md` and its `README.md` row is branch-only. |
| `a29760351` | refactor(ai-agent): share block text helpers across agent blocks | All of it: `agentBlockText.ts` (new) and the `buildAgentPageContextBlock.ts` refactor. |
| `508ff35f7` | feat(ai-agent): write chat mentions as ref tokens | All of it. |
| `0648bf6b8` | feat(ai-agent): describe a mentioned gadget's metadata | All of it. |
| `598480e32` | docs(ai-agent): restore the escape names in block text comments | All of it. |
| `d41a41a23` | fix(ai-agent): harden block text escaping and cover token casing | All of it. |
| `5f7c6c227` | feat(ai-agent): build attached and mentioned blocks with the page block | All of it. |
| `874225776` | feat(ai-agent): send attached and mentioned blocks in the turn text | All of it. |
| `b6971cf01` | fix(ai-agent): count only described mentions and cover every gadget kind | All of it. |
| `29e2bd92a` | feat(ai-agent): prompt v3 reads attached and mentioned blocks | All of it, including the `data-agent-v3` route in `tests/e2e/agent-chat-result.spec.ts`. |
| `aa6085f74` | feat(ai-agent): load mentioned gadgets' metadata with the user's access | All of it. |
| `cd228766b` | feat(ai-agent): load a turn's attached and mentioned gadgets once | All of it. |
| `00dea0eeb` | test(ai-agent): tighten the gadget loader's tests | All of it. |
| `c757b60a7` | feat(ai-agent): send attached and mentioned gadgets to the agent | All of it. |
| `b3b7dacd4` | feat(ai-agent): load mentions once per turn and name them off the agent path | All of it. Its `useAvandarChatRuntime.ts` hunk passes an empty `contextTrayRef`; F91 replaces it with the tray's state. |
| `de3ff542e` | fix(ai-agent): read the page at send time and close mention review items | All of it, including the new `applyChatModelTurnResponse.test.ts`. |
| `d6089cd2e` | test(ai-agent): mention questions in the eval | All of it: `covidMentionQuestions.ts` and `covidQuestionHelpers.ts` (new). |
| `dc52a7faf` | test(ai-agent): tighten the mention eval | All of it. |
| `5032224a0` | test(ai-agent): check M06 restores its placeholder | All of it. |
| `e6bc263c4` | fix(ai-agent): drop chat chips whose token would not parse | MIXED: `shared/agent/mentions/ChatMentionToken.{ts,test.ts}` (`isTokenizable`) go here. The composer files go to F90. |
| `8a947bd50` | fix(ai-agent): escape block tags spelled with any invisible character | History: `6662ee978` and then `f7b98feda` rewrite its pattern. Port the final `agentBlockText.ts`. |
| `378d5b84f` | fix(ai-agent): redact SQL a cap leaves out before masking names | All of it, including `src/lib/agent/dataAgent/pagePrivacy/mentionPrivacyLeaks.test.ts` (new). |
| `4647de9b0` | test(ai-agent): use the case gadget type in the token test | All of it. |
| `8687e83e9` | fix(ai-agent): name mentions by type in today's chat | All of it. |
| `eaf9e4720` | docs(ai-agent): record the mention privacy review and its fixes | All of it. |
| `6662ee978` | fix(ai-agent): escape block tags hidden by invisible characters | All of it. `f7b98feda` rewrites the pattern, so port the final `agentBlockText.ts`; keep its privacy tests. |
| `1881f7888` | fix(ai-agent): keep offline replies' gadget names off hosted requests | History: `529de7ef3` deletes its `replaceGadgetNames.{ts,test.ts}` and the name scrub. Port the final files. |
| `c1bfd669b` | docs(ai-agent): record the second mention privacy review round | All of it. |
| `529de7ef3` | fix(ai-agent): keep offline answers out of hosted requests | All of it: `OfflineAnswerMessage.{ts,test.ts}` (new). |
| `f7b98feda` | fix(ai-agent): escape block tags in linear time | All of it. |
| `009cc73c8` | docs(ai-agent): record the third mention privacy review round | All of it. |
| `ba4c249a0` | docs(ai-agent): record the Phase 1B eval | MIXED: only the Phase 1B section of `docs/ai-agent/eval.md`. The six `eval-runs/2026-11-09T11-*` folders and their `eval-runs/README.md` rows stay branch-only. |
| `4d21a6583` | fix(ai-agent): let dashboard charts with no SQL skip the chart budget | All of it. |
| `1f3bc348d` | docs(ai-agent): mark Phase 1B built | MIXED: `docs/ai-agent/{decisions,roadmap}.md` and `specs/phase-1b.md` go here. The `docs/measles-demo/gadgets.md` hunk goes to F91. |
| `14b498708` | fix(ai-agent): load mentions on demand and count the asked question | All of it. |
| `5c088efc5` | docs(ai-agent): align the Phase 1B docs with the build | All of it. |

**Files:**
- Shared layer (new): `shared/agent/mentions/{ChatMentionToken,AgentGadgetContext,buildAgentContextBlocks}.{ts,test.ts}`
  and `shared/agent/pageContext/agentBlockText.{ts,test.ts}`.
- Shared layer (changed): `shared/agent/pageContext/{buildAgentPageContextBlock.ts,buildAgentTurnText.ts,buildAgentTurnText.test.ts}`,
  `shared/agent/dataAgent/{buildDataAgentSystemPrompt.ts,buildDataAgentSystemPrompt.test.ts,dataAgentTools.ts}`,
  `shared/analytics/AnalyticsEvents/AnalyticsEvents.types.ts`, and
  `supabase/functions/chat/PostAgentStream/buildDataAgentProxyContext.test.ts`.
- Runtime (new): `src/components/ChatPanel/useAvandarChatRuntime/agentMentions/{createAgentGadgetContextLoader,loadTurnGadgetContext}.{ts,test.ts}`,
  `src/components/ChatPanel/OfflineAnswerMessage/OfflineAnswerMessage.{ts,test.ts}`,
  and `src/components/ChatPanel/useAvandarChatRuntime/applyChatModelTurnResponse.test.ts`.
- Runtime (changed), under `src/components/ChatPanel/useAvandarChatRuntime/`:
  `applyChatModelTurnResponse.ts`, `useAvandarChatRuntime.ts` (the
  `b3b7dacd4` hunk only), `createChatModelAdapter/createChatModelAdapter.{ts,test.ts}`,
  `runDataAgentTurn/runDataAgentTurn.{ts,test.ts}`,
  `dataAgentTurnHelpers/{createConversationAgentHost.ts,createConversationAgentHost.test.ts,dataAgentConversation.types.ts,dataAgentTurnHelpers.ts,dataAgentTurnHelpers.test.ts}`,
  `getLastQuestionFromMessages/getLastQuestionFromMessages.{ts,test.ts}`,
  `agentPageContext/{createAgentPageContext.ts,extractDashboardTiles.ts,extractDashboardTiles.test.ts}`,
  and `ChatAnalyticsPayloads/ChatAnalyticsPayloads.{ts,test.ts}`.
- Privacy tests: `src/lib/agent/dataAgent/pagePrivacy/mentionPrivacyLeaks.test.ts`
  (new) and `pageBlockPrivacy.test.ts`.
- Eval: `scripts/ai-eval/{EvalQuestion.ts,runEval.ts}`,
  `scripts/ai-eval/covid/{covidMentionQuestions.ts (new),covidQuestionHelpers.ts (new),covidPageQuestions.ts,covidQuestions.ts}`,
  `scripts/ai-eval/harnesses/pi/PiHarness.{ts,test.ts}`, and
  `scripts/ai-eval/runtime/gradeEvalAnswer.{ts,test.ts (new)}`.
- E2E: `tests/e2e/agent-chat-result.spec.ts` (the v3 route).
- Docs: `docs/ai-agent/specs/phase-1b.md` (new),
  `docs/ai-agent/plans/phase-1b.md` (new), and F89's hunks in
  `docs/ai-agent/{README.md,decisions.md,roadmap.md,eval.md}`,
  `specs/phase-1.md`, and `specs/phase-1a.md`. Drop the `README.md` row for
  `HANDOFF.md`: the file was deleted in `43e0df775` but the row survived.

**Schema:** none. Prompt v3 is code, and the tray lives in the browser.

**Verification:**
```sh
pnpm vitest run shared/agent src/components/ChatPanel/useAvandarChatRuntime src/components/ChatPanel/OfflineAnswerMessage src/lib/agent/dataAgent/pagePrivacy scripts/ai-eval supabase/functions/chat/PostAgentStream
pnpm tsc -b --force
pnpm type-check:deno
pnpm test:e2e agent-chat-result.spec.ts
# Needs the JHU CSVs in ~/cleaned-test-data and OPEN_ROUTER_API_KEY in .env.development.edge
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config haiku-sonnet --questions M
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config haiku-sonnet --questions P
```

---

## F90: Chat composer with `@` mentions of gadgets

Status: not started. Built on `feat/agent-context`, merged into
`demo/measles` in `4eddab717` (see F89 for how the commits were split).
`develop` has none of it and no PR is open.

**Purpose:** With the agent switch on, the chat's textarea becomes a TipTap
editor (`ChatComposerEditor`) that still sends through assistant-ui. Typing
`@` opens the case comment `@` menu in a chat variant: dashboards, tiles,
datasets, maps, and case types only, never teammates or cases, links only,
one Enter hint and no audience hint. Enter sends and Shift+Enter adds a
line; while the menu is open both insert the highlighted row. Each chip is
written into the message text as a ref token, never a name, and the editor
keeps only chat gadget chips whose token parses back to the same ref, so a
pasted case, an embed, or a tile with an unparseable block id never reaches
the text. Sent user messages draw each token as a chip with the gadget's
current name, or its "Unavailable" label. The empty state, with the agent
on, invites a question on every page and says to type `@`. With the switch
off, today's textarea stays.
**Value:** The user can point the agent at a chart or dataset in the
message itself, the way they already reference gadgets in a case comment.

**Design:** `docs/ai-agent/specs/phase-1b.md` (ported with F89), "Components"
and "Tokens".

**PR title:** `feat(ai-agent): mention gadgets with @ in the chat composer`

**Depends on:** F89 (`ChatMentionToken`, `MAX_DESCRIBED_MENTIONS`, and the
adapter that reads tokens safely), F21 (`GadgetLink`, `GadgetChip`,
`createGadgetRefFromAttrs`, and the `MentionMenu` it extends), and F81 to F85
(`DataAgentFeature`, the switch that shows the editor).

**Commits to read** (from `feat/agent-context`; `65523931a` and `e6bc263c4`
are MIXED, `91eaf6399` is translation-only):

| SHA | Subject | Take |
|---|---|---|
| `039287fb4` | feat(ai-agent): a chat variant of the @ menu | All of it, including the new `createMentionMenuSuggestion.test.tsx` and `MentionMenuFooter.test.tsx`. |
| `65523931a` | fix(ai-agent): never overwrite the stored tray on mount | MIXED: only `src/components/RichText/MentionMenu/createMentionMenuSuggestion.test.tsx` goes here. `useAvandarChatRuntime.ts` and its `contextTray` test go to F91. |
| `9cc4cb5e2` | feat(ai-agent): a chat composer with @ mentions | All of it. |
| `dde81c437` | feat(ai-agent): draw mentions as chips in sent messages | All of it. |
| `cf595bb2b` | fix(ai-agent): accept only chat gadget chips in the composer | All of it, including deleting `MessageTextPart/MessageTextPart.tsx` and moving its stylesheet to `UserMessage/UserMessageTextPart.module.css`. |
| `91eaf6399` | chore(i18n): translate the chat mention and tray strings | Regenerate, never copy. Its strings belong to F90 (composer, menu footer) and F91 (tray, picker). |
| `5f10894c5` | test(ai-agent): find the agent message box by its label | All of it. |
| `e6bc263c4` | fix(ai-agent): drop chat chips whose token would not parse | MIXED: `ChatComposerEditor.test.tsx`, `createChatComposerExtensions.ts`, and `serializeChatComposerDocument.{ts,test.ts}` go here. `ChatMentionToken.*` goes to F89. |
| `05efea0f2` | fix(chat): invite a question on every page in the empty state with the agent on | All of it, including the new `ChatEmptyState.test.tsx`. Regenerate the catalogs. |

**Files:**
- Composer, under `src/components/ChatPanel/ChatThread/Composer/`:
  `ChatComposerEditor.tsx`, `ChatComposerEditor.test.tsx`,
  `ChatGadgetLinkView.tsx`, `createChatComposerExtensions.ts`,
  `serializeChatComposerDocument.{ts,test.ts}`, `useChatComposerEditor.ts`
  (all new), and the F90 hunks of `Composer.tsx`, `Composer.module.css`,
  and `Composer.test.tsx`.
- `src/components/ChatPanel/useChatPanelComposerAutoFocus/useChatPanelComposerAutoFocus.{ts,test.ts}`.
- Sent messages: `src/components/ChatPanel/ChatThread/UserMessage/{UserMessage.tsx,UserMessageTextPart.tsx (new),UserMessageTextPart.test.tsx (new),UserMessageTextPart.module.css (moved from MessageTextPart/MessageTextPart.module.css)}`,
  and `src/components/ChatPanel/ChatThread/MessageTextPart/MessageTextPart.tsx` (deleted).
- The `@` menu: `src/components/RichText/MentionMenu/{createMentionMenuSuggestion.ts,createMentionMenuSuggestion.test.tsx (new)}`
  and `MentionMenuList/{MentionMenuFooter.tsx,MentionMenuList.tsx,__tests__/MentionMenuFooter.test.tsx (new)}`.
- Empty state: `src/components/ChatPanel/ChatEmptyState/ChatEmptyState.{tsx,test.tsx (new)}`.
- E2E: `tests/e2e/agent-chat-result.spec.ts` (the label locator).
- `src/i18n/locales/*/messages.{po,ts}`: regenerate with
  `pnpm i18n:extract && pnpm i18n:compile`, never copy.

**Schema:** none.

**Verification:**
```sh
pnpm i18n:extract
pnpm vitest run src/components/ChatPanel/ChatThread/Composer src/components/ChatPanel/ChatThread/UserMessage src/components/ChatPanel/useChatPanelComposerAutoFocus src/components/ChatPanel/ChatEmptyState src/components/RichText
pnpm tsc -b --force
pnpm lint:css
pnpm test:e2e agent-chat-result.spec.ts
pnpm test:e2e case-gadgets.spec.ts
```

---

## F91: Chat context tray and "Add context" picker

Status: not started. Built on `feat/agent-context`, merged into
`demo/measles` in `4eddab717` (see F89 for how the commits were split).
`develop` has none of it and no PR is open.

**Purpose:** Above the chat composer, with the agent switch on, a tray holds
up to five gadgets the user wants the agent to keep in mind for the whole
chat, as chips with remove buttons. "Add context" opens a picker: a search
box over the gadget search, and before typing, "On this page" (the page's
dashboard, its tiles, or its dataset or map) then "Recent". Items already
attached show as added. The tray is stored per workspace and user in
localStorage as refs only (`ChatContextTrayStore`), hydrated once on mount
without writing the store, and emptied by a new chat. Each turn sends it as
F89's `<attached>` block: in full when it changed, one "unchanged" line
otherwise, and "Nothing is attached any more" once after it empties. A
mocked-proxy browser spec mentions and attaches gadgets and checks what the
proxy receives.
**Value:** Context the user pins once stays with every question in the
chat, without retyping a mention each time.

**Design:** `docs/ai-agent/specs/phase-1b.md` (ported with F89).

**PR title:** `feat(ai-agent): keep a tray of attached gadgets in the chat`

**Depends on:** F89 (the `<attached>` block, `MAX_ATTACHED_GADGETS`, and the
adapter's `contextTrayRef`), F90 (the composer the tray mounts in, and the
mention flow the e2e spec drives), F21 (`searchGadgets`, `GadgetChip`,
`gadgetRegistry`, `collectDataVizNodes`, and `ee2206125`, without which the
picker never finds a saved tile), and F86 and F87
(`parseAgentPageRoute`, which "On this page" reads).

**Commits to read** (from `feat/agent-context`; `65523931a` and `1f3bc348d`
are MIXED, `91eaf6399` is translation-only):

| SHA | Subject | Take |
|---|---|---|
| `15508bb95` | feat(ai-agent): keep the chat's context tray per chat | All of it. |
| `65523931a` | fix(ai-agent): never overwrite the stored tray on mount | MIXED: `useAvandarChatRuntime.ts` and `__tests__/useAvandarChatRuntime.contextTray.test.tsx` go here. `createMentionMenuSuggestion.test.tsx` goes to F90. |
| `bc8a9f05f` | feat(ai-agent): a context tray and picker in the chat composer | All of it, including the `Composer.tsx` and `Composer.test.tsx` hunks that mount the tray. |
| `91eaf6399` | chore(i18n): translate the chat mention and tray strings | Regenerate, never copy (see F90). |
| `0dd8d6dbb` | fix(ai-agent): tighten the context picker | All of it. Regenerate the catalogs. |
| `65e4e186e` | refactor(ai-agent): tidy the context picker | All of it. |
| `6455be1fe` | test(ai-agent): mention and attach gadgets in the chat | All of it. |
| `15369dc2b` | test(ai-agent): assert what the tray and mentions send | All of it: `tests/e2e/helpers/openAgentChat.ts` (new), and its use in both agent specs. |
| `5ea052633` | fix(chat): keep the loading skeleton out of a paragraph in the context picker | All of it. |
| `1f3bc348d` | docs(ai-agent): mark Phase 1B built | MIXED: only the `docs/measles-demo/gadgets.md` hunk. The `docs/ai-agent/` files go to F89. |

**Files:**
- Tray and picker (new), under `src/components/ChatPanel/ChatThread/ChatContextTray/`:
  `ChatContextTray.tsx`, `ChatContextTray.module.css`,
  `ChatContextPicker.tsx`, `ChatContextPickerOptions.tsx`,
  `useChatContextPageRefs.{ts,test.ts}`, `useChatContextSearch.{ts,test.tsx}`,
  and `__tests__/{ChatContextPicker.test.tsx,ChatContextTray.test.tsx,ChatContextTrayTestFixtures.tsx}`.
- Storage and state: `src/components/ChatPanel/ChatContextTrayStore/ChatContextTrayStore.{ts,test.ts}`
  (new), `src/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager.tsx`
  and `ChatPanelStateManager.test.tsx` (new),
  `src/components/ChatPanel/ChatPanelProvider/ChatPanelProvider.tsx`, and the
  `contextTray` fixture field in
  `src/components/Nux/NuxTour/useNuxOpenChatPanel/useNuxOpenChatPanel.test.tsx`.
- Runtime: the tray hunks of
  `src/components/ChatPanel/useAvandarChatRuntime/useAvandarChatRuntime.ts`,
  `__tests__/useAvandarChatRuntime.contextTray.test.tsx` (new), and
  `__tests__/useAvandarChatRuntime.mocks.tsx`.
- Composer: the tray hunks of `src/components/ChatPanel/ChatThread/Composer/Composer.{tsx,test.tsx}`.
- E2E: `tests/e2e/agent-chat-mentions.spec.ts` (new),
  `tests/e2e/helpers/openAgentChat.ts` (new), and the helper's use in
  `tests/e2e/agent-chat-result.spec.ts`.
- Docs: the chat paragraph and the Notes line in
  `docs/measles-demo/gadgets.md`.
- `src/i18n/locales/*/messages.{po,ts}`: regenerate with
  `pnpm i18n:extract && pnpm i18n:compile`, never copy.

**Schema:** none. The tray is in localStorage.

**Verification:**
```sh
pnpm i18n:extract
pnpm vitest run src/components/ChatPanel src/components/Nux/NuxTour/useNuxOpenChatPanel
pnpm tsc -b --force
pnpm lint:css
pnpm test:e2e agent-chat-mentions.spec.ts
pnpm test:e2e agent-chat-result.spec.ts
```

---

## F92: Show the chat's empty state while a thread holds only hidden messages

Status: not started. Built on `feat/chat-panel` as one hunk of `f2e44f2e4`,
merged into `demo/measles` in `e12cfa634`. The bug is on `develop`: its
`ChatThread.tsx` still wraps `ChatEmptyState` in `ThreadPrimitive.Empty`,
and `develop` already syncs hidden view-change messages into the thread. No
PR.

**PR title:** `fix(chat): show the empty state while a thread holds only hidden messages`

**Depends on:** none.

Hidden messages (view-change events, the Case Manager kickoff, discovery
continuations) count as messages to assistant-ui, so its `isEmpty` turned
false as soon as the page context synced, and the empty state with its
starter prompts never showed. `ChatThread` now shows the empty state while
every message is hidden, through `isChatThreadVisiblyEmpty`, which reuses
`isHiddenChatThreadMessage`.

| Commit | Subject | What to take |
|---|---|---|
| `f2e44f2e4` | feat(chat): fuse the chat aside into the slate and polish the panel | MIXED: only `src/components/ChatPanel/ChatThread/ChatThread.tsx` and `isChatThreadVisiblyEmpty.{ts,test.ts}` (new). Everything else is F94. |

**Files:**
- `src/components/ChatPanel/ChatThread/ChatThread.tsx`
- `src/components/ChatPanel/ChatThread/isChatThreadVisiblyEmpty.ts` (new)
- `src/components/ChatPanel/ChatThread/isChatThreadVisiblyEmpty.test.ts` (new)

**Schema:** none.

**Verification:**
```sh
pnpm vitest run src/components/ChatPanel/ChatThread
pnpm tsc -b --force
pnpm test:e2e unified-chat-session.spec.ts
```
Then open the chat in the Data Explorer with no messages: the empty state and
its starter prompts show.

---

## F93: Let the slate's neutral.7 edge render

Status: not started. Built on `feat/chat-panel` as the theme half of
`ade8c76cc`, merged into `demo/measles` in `e12cfa634`. The bug is on
`develop`: its `Theme.ts` sets every Paper's `borderColor` to
`--ava-border-default` inline, and its `AppSlate.module.css` neutral.7 border
loses to that. No PR.

**PR title:** `fix(app-shell): let the slate's neutral.7 edge render`

**Depends on:** none.

The theme's Paper `styles` render inline, so no CSS module can override a
Paper's border color, and the slate wore a pale card outline on the dark
shell instead of its neutral.7 edge. The theme now reads
`--ava-paper-border-color` first and falls back to `--ava-border-default`.
The slate sets the variable to neutral.7 and resets it for every Paper inside
it, since custom properties inherit.

| Commit | Subject | What to take |
|---|---|---|
| `ade8c76cc` | fix(app-shell): let the slate's neutral.7 edge actually render | MIXED: `Theme.ts` (the Paper `borderColor`), the new case in `Theme.test.ts`, the `--ava-paper-border-color` line in `.slate` and the nested `.mantine-Paper-root` reset in `AppSlate.module.css`, and the new paragraph in `DESIGN.md`'s slate section. Its fused-chat hunks go to F94. |

**Files:**
- `src/config/Theme/Theme.ts`, `src/config/Theme/Theme.test.ts`
- `src/components/layouts/AppSlate/AppSlate.module.css`
- `DESIGN.md` (the paragraph that starts "The `neutral.7` edge needs a hook")

Read `docs/design/app-view-layout.md` and the Named Rules in `DESIGN.md`
before editing `src/components/layouts/` (repo rule).

**Schema:** none.

**Verification:**
```sh
pnpm vitest run src/config/Theme
pnpm lint:css
pnpm tsc -b --force
```
Then check the slate on the dark shell: its edge is neutral.7, and Papers
inside a view keep the default edge.

---

## F94: Fuse the chat aside into the slate, and polish the chat panel

Status: not started. Built on `feat/chat-panel`, merged into `demo/measles`
in `e12cfa634` (all of `git log --oneline --no-merges e12cfa634^1..e12cfa634^2`),
plus `c34347c60`, a later direct commit on `demo/measles` that fixes it. The
merge resolved only translation catalogs. `develop` has none of it and no PR
is open.

**Purpose:** The open chat aside reads as the slate's right-hand pane
instead of a second floating card. The shell root carries `data-chat-fused`
while the chat is open beside the slate on a non-mobile screen. The slate
then drops its inline-end gutter, border, and corners, and the chat takes
that edge with the slate's neutral.7 border, corners, and shadow, sits one
tier above the slate (`APP_CHAT_ASIDE_Z_INDEX`, 151), and draws the light
hairline between them. The gutter closes and reopens in step with Mantine's
slide. The chat header matches the slate toolbar's band. Inside the panel,
suggestions are one quiet list above the composer ("Try asking"), assistant
replies sit flush while user turns get a pale bubble, the composer is a
raised field with the model picker and send split across its foot, and
markdown regains list markers and readable inline code. In Case Manager's
expanded composer, the dimming overlay now runs under the panel to the
viewport edge, so no strip of page shows through the panel's transparent
gutter.
**Value:** The shell reads as one surface with the chat open, and the chat
panel matches the rest of the design system.

**Design:** the Gutter Rule and slate sections of `DESIGN.md`, and
`docs/app-shell-nomenclature.md`, both updated here.

**PR title:** `feat(chat): fuse the chat aside into the slate and polish the panel`

**Depends on:** F92 (the restyled empty state shows only once it renders) and
F93 (the same `AppSlate.module.css`, `Theme.ts`, and `DESIGN.md` hunks sit on
top of F93's). Its `AppShell.tsx` and `AppSlate.tsx` hunks sit next to F20's;
apply by hand if F20 is not merged.

**Commits to read** (from `feat/chat-panel`, plus `c34347c60`; `f2e44f2e4`
and `ade8c76cc` are MIXED):

| SHA | Subject | Take |
|---|---|---|
| `f2e44f2e4` | feat(chat): fuse the chat aside into the slate and polish the panel | MIXED: everything except `ChatThread.tsx` and `isChatThreadVisiblyEmpty.*` (F92). Take `ChatModelPickerView.tsx` only if F81 to F85 is not merged yet: its `5f51ce819` deletes the model picker. Regenerate the catalogs. |
| `a59cd56cd` | fix(chat): line the fused chat's top and bottom edges up with the slate | History: `ade8c76cc` puts the `.shell` border back to neutral.7 once the slate's edge renders. Port the final files. |
| `ade8c76cc` | fix(app-shell): let the slate's neutral.7 edge actually render | MIXED: the fused-chat hunks go here: `--ava-slate-inline-end-border-width` in `AppShell.module.css`, the `border-inline-end-width` line in `AppSlate.module.css`, `ChatPanel.module.css`, the `DESIGN.md` shadow sentence, and `docs/app-shell-nomenclature.md`. The theme half is F93. |
| `c34347c60` | fix(chat): dim the slate all the way up to the expanded panel | All of it. Bug fix to this feature: `f2e44f2e4`'s `.dockComposer` gives the expanded panel a transparent inline-start gutter, and the overlay stopped at the aside's outer edge. |

**Files:**
- Shell: `src/components/AppShell/AppShell.{tsx,module.css}`,
  `src/components/layouts/AppSlate/AppSlate.{tsx,module.css}`, and
  `src/config/Theme/{Theme.ts,Theme.test.ts,index.ts}` (`APP_CHAT_ASIDE_Z_INDEX`).
- Chat panel, under `src/components/ChatPanel/`:
  `ChatPanel/ChatPanel.{tsx,module.css}`,
  `ChatPanelHeader/ChatPanelHeader.{tsx,module.css}`,
  `ChatEmptyState/ChatEmptyState.{tsx,module.css}`,
  `ChatThread/ChatThread.module.css`,
  `ChatThread/AssistantMessage/AssistantMessage.module.css`,
  `ChatThread/UserMessage/UserMessage.module.css`,
  `ChatThread/MarkdownTextPart/MarkdownTextPart.module.css`,
  `ChatThread/Composer/Composer.{tsx,module.css}`,
  `ChatComposerOverlay/ChatComposerOverlay.module.css`, and
  `ChatModelPicker/ChatModelPickerView/ChatModelPickerView.tsx` (see above).
- Docs: `DESIGN.md` (the Gutter Rule exception and the fused-aside sentences)
  and `docs/app-shell-nomenclature.md` (the chat aside row, the
  `APP_CHAT_ASIDE_Z_INDEX` tier, the stacking rule, and the Do line).
- `src/i18n/locales/*/messages.{po,ts}`: regenerate with
  `pnpm i18n:extract && pnpm i18n:compile`, never copy ("Try asking"
  replaces "Try one of these").

Read `docs/design/app-view-layout.md` and the Named Rules in `DESIGN.md`
before editing `src/components/layouts/` (repo rule).

**Schema:** none.

**Verification:**
```sh
pnpm i18n:extract
pnpm vitest run src/config/Theme src/components/AppShell src/components/ChatPanel
pnpm lint:css
pnpm tsc -b --force
pnpm test:e2e unified-chat-session.spec.ts
pnpm test:e2e chat-interactive-workflows.spec.ts
```
Then open the chat beside a view: the slate and the chat read as one surface
with no gutter between them, and closing it reopens the gutter. In Case
Manager, expand the composer: the dim reaches the panel with no sharp strip.

---

## F95: Answer column comparisons from the schema

Status: not started. A direct commit on `demo/measles`, `11816d5d0`. It is
not part of F22: the COVID audit's bug log and improvements list do not
include it, and it edits F89's prompt v3 and eval categories. `develop` has
none of it and no PR is open.

**Purpose:** "Can these two datasets be appended?" ran SQL and painted a
failed query in the Data Explorer. A question about the columns themselves
(which columns a dataset has, whether two datasets share columns, whether
their rows can be stacked) is now answered in prose from the schema already
in the prompt, and so is a "Try again" that follows one.
`isSchemaAnswerTurn` matches those questions. In today's chat, the prompt and
the `generateSql` description say so, and `applyChatModelTurnResponse.ts`
applies no SQL on such a turn. In the agent, prompt v3 gains a SCHEMA
section, the `run_query` description says the same, the run state keeps the
conversation's user texts, and `runQueryForUser` returns a "answer in plain
text" result instead of running the query. The eval adds S01 and S02
(`--questions S`), graded on the reply text, where any query shown fails.
**Value:** A schema question gets a direct answer that names the matching
and differing columns, instead of a failed query in the explorer.

**PR title:** `fix(chat): answer column comparisons from the schema`

**Depends on:** F22 (its hunks edit the ANALYST CHECKS rules from
`8a15a3d6b` in `buildSystemPrompts.ts`, and BUG-012's `explorerResponse` in
`applyChatModelTurnResponse.ts`) and F89 (prompt v3, and the `mentions`
category and `gradeEvalAnswer.test.ts` it extends). Also F81 to F85 for
`src/lib/agent/dataAgent` and the eval harnesses.

**Commits to read** (a direct commit on `demo/measles`; not MIXED):

| SHA | Subject | Take |
|---|---|---|
| `11816d5d0` | fix(chat): answer column comparisons from the schema | All of it. Move the `/** v3: ... */` docstring back onto `DATA_AGENT_INSTRUCTIONS_V3` (the commit left it above `SCHEMA_ANSWER_RULES`), and see Open questions on the prompt version. |

**Files:**
- New: `src/lib/agent/schemaAnswer/isSchemaAnswerTurn.{ts,test.ts}`,
  `scripts/ai-eval/covid/covidSchemaQuestions.{ts,test.ts}`.
- Today's chat: `supabase/functions/chat/PostChatMessages/prompt/buildSystemPrompts.ts`,
  `makeChatTurnSuffixFromOptions.test.ts`,
  `supabase/functions/chat/buildDataExplorerToolDefinitions/buildDataExplorerToolDefinitions.{ts,test.ts}`,
  and `src/components/ChatPanel/useAvandarChatRuntime/applyChatModelTurnResponse.{ts,test.ts}`.
- Agent: `shared/agent/dataAgent/{buildDataAgentSystemPrompt.ts,buildDataAgentSystemPrompt.test.ts,dataAgentTools.ts}`,
  `src/lib/agent/dataAgent/{DataAgentRunState.ts,DataAgentRunState.test.ts}`,
  `createDataAgent/createDataAgent.ts`, and
  `createDataAgentTools/{runQueryTool.ts,dataAgentTools.test.ts}`.
- Eval: `scripts/ai-eval/{EvalQuestion.ts,runEval.ts}`,
  `covid/covidQuestions.ts`, `harnesses/baseline/BaselineHarness.ts`, and
  `runtime/gradeEvalAnswer.{ts,test.ts}`.
- Docs: the category list and the S01 and S02 paragraph in
  `docs/ai-agent/eval.md`.

**Schema:** none.

**Verification:**
```sh
pnpm vitest run src/lib/agent scripts/ai-eval shared/agent/dataAgent src/components/ChatPanel/useAvandarChatRuntime supabase/functions/chat
pnpm tsc -b --force
pnpm type-check:deno
# Needs the JHU CSVs in ~/cleaned-test-data and OPEN_ROUTER_API_KEY in .env.development.edge
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config haiku-sonnet --questions S
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness baseline --model anthropic/claude-sonnet-5 --questions S
```

---

## Notes for Plugins (F96 to F112)

The plugin ecosystem: `feat/plugins-core` (58 commits, merged in
`942bbc4ce`), `feat/plugins-viz` (53, merged in `c339e8704`),
`feat/plugins-columns` (30, merged in `e2f65917e`), the `fix/plugin-card`
follow-ups, and two direct commits. 147 commits, 17 features. `develop` has
none of it: it lacks `packages/shared/plugin-manifest`,
`packages/web/plugin-sdk`, `packages/web/plugin-ui`, `plugins/`, and
`docs/plugin-authoring.md`, and `gh pr list --state all` shows no plugin PR.

Three rules that apply to every section below:

- **Pin reads to each branch's tip when a later branch changed the file.**
  `feat/plugins-viz` and `feat/plugins-columns` edit many files that
  `feat/plugins-core` created. For an F96 to F102 file, read it at `03b37bec9`
  (the `feat/plugins-core` tip), not at `34798387c`. For an F103 to F108 file,
  read it at `617af6600` (the `feat/plugins-viz` tip). A section says so where
  it matters.
- **Package PR titles.** F96, F105, and F110 are the only features that touch
  `packages/**`, and they touch only `@avandar/plugin-manifest`,
  `@avandar/plugin-sdk`, and `@avandar/plugin-ui`. All three are
  `"private": true` and on the `.changeset/config.json` `ignore` list. F96 also
  teaches `scripts/ci/ensure-changesets/ensureChangesets.ts` to skip private
  packages (`makePackageNameByDirFromEntries`). So `release-packages.yaml`
  writes no auto-changeset for any of these PRs, and the title type bumps no
  version. Title them by what they do (`feat`). F96 must carry that skip, or
  merge after a PR that does: without it, `ensureChangesets` on `develop`
  would name the ignored plugin packages in an `auto-pr-<n>.md` changeset,
  and `changeset version` rejects a changeset that mixes ignored and
  non-ignored packages. If a plugin package ever drops `private`, its PRs'
  titles start to set bumps (`feat` is minor; before `1.0.0`, `!` is minor
  too).
- **Lockfile.** Never copy `pnpm-lock.yaml`. `d6508f5e8` rebuilt it from
  `demo/measles`, so it carries every other feature's dependencies. Edit the
  `package.json` files by hand and run `pnpm install`, which adds only this
  PR's importers. Avoid `pnpm add`: it rewrites `pnpm-workspace.yaml`
  (drops its comments, bumps the catalog). PRs that change dependencies: F96,
  F101, F102, F105.

---

## F96: Plugin packages: `@avandar/plugin-manifest`, `@avandar/plugin-sdk`, and `@avandar/plugin-ui`

Status: not started. Built on `feat/plugins-core`, merged into `demo/measles`
in `942bbc4ce`. The branch is `git log --oneline 01a85ba5e..03b37bec9` (58
commits), where `01a85ba5e` is where it left `demo/measles`. The commits below
are this feature's share. `develop` has none of it, and no PR exists.

**Purpose:** Three new workspace packages that a bundled plugin is written
against. `@avandar/plugin-manifest` (`packages/shared`) holds the strict Zod
schema for a plugin's `ava.yaml` (an id in `publisher.name` form, version,
engines, entry, icon, permissions, commands, and per-slot menus), the
structured `when` evaluator that checks a menu item's condition against a
slot's facts and hides it when the condition names a missing fact, and
`compileManifest`, which parses `ava.yaml` as strict YAML 1.2, resolves
`%key%` strings against `locales/*.json`, checks Tabler icon names, and
reports a malformed file by path. Its `node` entry reads plugin folders and
`plugins/bundled.yaml` from disk and checks a plugin's dependencies against
an approved list. Its `runtime` entry is the browser-safe part, with no Zod or
YAML. `@avandar/plugin-sdk` (`packages/web`) exports `definePlugin`, the
`avandar` API types (`context`, `workspace`, `data.fetchRows`,
`ui.openModal`, `ui.openDrawer`, `ui.notify`, `i18n.t`), `PluginError`, a
translator that falls back by language and never throws, and context hooks.
`@avandar/plugin-ui` re-exports the Mantine components plugin UI may render.
All three are `private`, on the Changesets `ignore` list, and skipped by
`ensureChangesets`. `pnpm verify:packages` now also fails when a
`plugins/*/package.json` is publishable.
**Value:** The contract every plugin and the plugin host build on, with the
manifest checks in one place that the Vite build, the CLI, and Deno can all
run.

**Design:** `docs/superpowers/specs/2026-11-06-plugin-ecosystem-design.md`,
`docs/superpowers/specs/2026-11-06-plugins-1a-core-commands-design.md`, plan
`docs/superpowers/plans/2026-11-06-plugins-1a-core-commands.md`. F112 ports
them.

**PR title:** `feat(plugins): add the plugin manifest, SDK, and UI packages`.
No auto-changeset: see the package PR titles rule at the top.

**Depends on:** none.

**Commits to read** (from `feat/plugins-core`; read files at `03b37bec9`):

| SHA | Subject | Take |
|---|---|---|
| `7af7485b8` | chore(plugins): scaffold plugin-manifest, plugin-sdk, and plugin-ui packages | All of it except `pnpm-lock.yaml` (regenerate). Includes `pnpm-workspace.yaml`'s `plugins/*` and `tsconfig.app.json`'s `./plugins/*/src`, harmless before F101 adds a plugin. |
| `2824503bc` | chore(plugins): wire plugin-manifest into Deno and guard plugin publishing | All of it except `pnpm-lock.yaml`. `createPackageDirToName` is History: `b8db0c7ac` renames it. |
| `044802683` | feat(plugins): evaluate structured when conditions against slot facts | All of it. |
| `71a880439` | fix(plugins): hide contributions whose when condition names a missing fact | All of it. |
| `114f469e3` | feat(plugins): add the strict plugin manifest schema | All of it. History for `collectWhenConditionIssues.ts`, renamed by `fc6a1dfd9`. |
| `fcc896eea` | fix(plugins): reject unusable when values and explain schema errors | All of it. |
| `13eb8b306` | feat(plugins): compile ava.yaml as strict YAML 1.2 with locale checks | All of it. History for the helper names `fc6a1dfd9` changes. |
| `fc6a1dfd9` | refactor(plugins): name manifest helpers per conventions and harden locale checks | All of it. |
| `3d0590103` | feat(plugins): read and validate plugin folders from disk | All of it. |
| `65591d76e` | fix(plugins): report malformed plugin files by path | All of it. |
| `77a180571` | feat(plugins): expose plugin-manifest runtime, node, and main entries | All of it. |
| `e55ac5594` | refactor(plugins): replace star export in plugin-manifest entry | All of it. |
| `21a358aeb` | feat(plugins): add the plugin SDK API, translator, and context hooks | All of it. |
| `08bdac5c9` | fix(plugins): make the plugin translator fall back by language and never throw | All of it except `pnpm-lock.yaml`. |
| `abc285297` | fix(plugins): import each Tabler icon once and match icon files exactly | MIXED: only `packages/shared/plugin-manifest/src/node/readPluginDirectory.ts` and its integration test. The `makePluginModuleSources` files are F97. |
| `cc85e9762` | fix(plugins): address review cleanups for the plugin core | MIXED: only `deno.json`, the Deno edge function template, `scripts/verify-packages.sh`, and the `packages/web/plugin-sdk` files. The regression statistic files are F101, the `src/lib/plugins` tests are F99, `WorkspacePluginsTab*` is F100, and `pnpm-lock.yaml` is regenerated. |
| `e583ed6d9` | docs(plugins): describe plugin packages as they work today | MIXED: only `packages/web/plugin-sdk/README.md`, `packages/web/plugin-ui/README.md`, and `packages/web/plugin-ui/src/index.ts`. `eslint/plugin-restrictions.js` is F97. |
| `b8db0c7ac` | fix(plugins): keep toolbar buttons during a run and guard late modals | MIXED: only the `scripts/ci/ensure-changesets` rename to `makePackageNameByDirFromEntries`. The `makeOptimizeDepsEntriesFromPlugins` rename is F97, the `makePluginApi` and `useDataExplorerPluginContext` files are F99. |

**Files:**
- `packages/shared/plugin-manifest/**` (new): `package.json`, `LICENSE`,
  `README.md`, `tsconfig.json`, `tsconfig.build.json`, `tsup.config.ts`,
  `vitest.config.ts`, `src/{index,runtime}.ts`, `src/node/{index,
  readBundledPlugins,readPluginDirectory}.ts`,
  `src/node/__tests__/readPluginFolders.integration.test.ts`,
  `src/PluginManifest/{PluginManifestSchema,PluginManifestSchema.test,
  getIssuesFromWhenCondition}.ts`, `src/SlotFacts/SlotFactRegistry.ts`,
  `src/WhenCondition/**`, `src/compileManifest/**`, `src/dependencies/**`,
  `src/icons/**`, `src/strings/**`, `src/yaml/parseStrictYaml/**`. Read at
  `03b37bec9`: F105 and F110 add chart types and `query:addColumns` later.
- `packages/web/plugin-sdk/**` (new): the package files,
  `src/{index,PluginApi.types}.ts`, `src/AvandarContext/**`,
  `src/PluginError/**`, `src/definePlugin/**`, `src/makePluginTranslator/**`.
  Read at `03b37bec9`.
- `packages/web/plugin-ui/**` (new): the package files and `src/index.ts`
  without `SegmentedControl` (F110 adds it). Read at `03b37bec9`.
- Publishing guard: `.changeset/config.json` (`ignore`),
  `scripts/ci/ensure-changesets/ensureChangesets.ts`,
  `scripts/ci/ensure-changesets/makePackageNameByDirFromEntries/{makePackageNameByDirFromEntries,makePackageNameByDirFromEntries.test}.ts`
  (new), `scripts/verify-packages.sh`, `docs/releasing-packages.md`.
- Wiring: the `package.json` dependencies, `pnpm-workspace.yaml`,
  `tsconfig.base.json`, `tsconfig.app.json`, `tests/vitestAliases.ts`, the
  alias lines in `vite.config.ts`, the `deno.json` maps and `yaml`,
  `scripts/edge-functions/newEdgeFunction/templates/deno.json.template.txt`,
  and `eslint/deno-restrictions.js` (plugin-sdk and plugin-ui are
  browser-only).
- `pnpm-lock.yaml`: regenerate with `pnpm install`.

**Schema:** none.

**Verification:**
```sh
pnpm install
pnpm --filter @avandar/plugin-manifest test
pnpm --filter @avandar/plugin-sdk test
pnpm --filter @avandar/plugin-ui type-check
pnpm vitest run scripts/ci/ensure-changesets
pnpm type-check:deno
pnpm verify:packages
pnpm tsc -b --force
```

---

## F97: Bundle listed plugins as lazy chunks, check the bundle in CI, and restrict plugin imports

Status: not started. Built on `feat/plugins-core`, merged into `demo/measles`
in `942bbc4ce` (see F96 for the commit range). `develop` has none of it, and
no PR exists.

**Purpose:** `plugins/bundled.yaml` lists the plugin folders this deployment
bundles. A Vite plugin (`scripts/vite-plugin-ava-plugins`) compiles each
listed plugin's `ava.yaml` and generates `virtual:ava-plugin-index`: one entry
per plugin whose manifest (with its Tabler icons and locales) and code each
load as their own lazy chunk. It reloads when a plugin folder is added or
deleted, shows manifest errors, and pre-bundles plugin dependencies when the
dev server starts. `pnpm check:plugin-bundle` builds the app and fails when
plugin code reaches any chunk the app can load other than that plugin's own;
CI runs it. An ESLint rule lets plugin code import only the SDK, plugin UI,
React, approved npm packages, and files inside the plugin's own folder.
**Value:** Plugins cost nothing in the main bundle, and a plugin cannot reach
into app code.

**PR title:** `feat(plugins): bundle listed plugins as lazy chunks and check them in CI`

**Depends on:** F96 (the folder readers and package types).

**Commits to read** (from `feat/plugins-core`; read files at `03b37bec9`):

| SHA | Subject | Take |
|---|---|---|
| `d5f2c470c` | feat(plugins): generate the virtual plugin index, manifest, and locale modules | All of it. |
| `abc285297` | fix(plugins): import each Tabler icon once and match icon files exactly | MIXED: only `makePluginModuleSources.{ts,test.ts}`. The `readPluginDirectory` files are F96. |
| `8220a5835` | feat(plugins): check that plugin code stays out of the main bundle | All of it. |
| `e8024d551` | feat(plugins): bundle listed plugins as lazy chunks and check it in CI | All of it. `plugins/bundled.yaml` starts as `plugins: []`. |
| `5e6ed2d2f` | fix(plugins): reload bundled plugins on add and delete and surface manifest errors | All of it. |
| `1bb349841` | chore(plugins): restrict plugin imports to the SDK and approved packages | All of it. |
| `e9fe1149e` | fix(plugins): pre-bundle plugin dependencies when the dev server starts | All of it. History for the `makeOptimizeDepsEntries` name, renamed by `b8db0c7ac`. |
| `e583ed6d9` | docs(plugins): describe plugin packages as they work today | MIXED: only `eslint/plugin-restrictions.js`. The rest is F96. |
| `10c78e807` | fix(plugins): check every chunk the app can load for plugin code | MIXED: everything except `docs/plugin-authoring.md`, which is F112. |
| `63a5dfbc4` | fix(plugins): keep plugin imports inside the plugin's own folder | MIXED: only the two `eslint/plugin-restrictions` files. `docs/plugin-authoring.md` is F112. |
| `b8db0c7ac` | fix(plugins): keep toolbar buttons during a run and guard late modals | MIXED: only the `makeOptimizeDepsEntriesFromPlugins` rename and the `vitePluginAvaPlugins.ts` import. The rest is F96 and F99. |

**Files:**
- `scripts/vite-plugin-ava-plugins/` (new): `vitePluginAvaPlugins.ts`,
  `pluginModuleIds.ts`, `makePluginModuleSources/`,
  `makeOptimizeDepsEntriesFromPlugins/`, `checkPluginBundle/`. Read
  `makePluginModuleSources` and `checkPluginBundle` at `03b37bec9`: F105 and
  F106 extend them.
- `vite.config.ts`, `package.json` (`check:plugin-bundle`), and
  `.github/workflows/pr-develop.yaml` (the `pnpm check:plugin-bundle` step).
- `plugins/bundled.yaml` (new, `plugins: []`).
- `src/lib/plugins/PluginIndex.types.ts`, `src/types/virtualAvaPluginIndex.d.ts`,
  and `src/test-utils/virtualAvaPluginIndexStub.ts` (all new).
- `eslint/plugin-restrictions.js` and `eslint/plugin-restrictions.test.js`
  (new, at `03b37bec9`), and their import in `eslint.config.js`.

**Schema:** none.

**Verification:**
```sh
pnpm vitest run scripts/vite-plugin-ava-plugins eslint/plugin-restrictions.test.js
pnpm check:plugin-bundle
pnpm eslint scripts/vite-plugin-ava-plugins eslint vite.config.ts
pnpm tsc -b --force
```

---

## F98: `plugin_installations`: per-workspace plugin installs with settings-admin RLS

Status: not started. Built on `feat/plugins-core`, merged into `demo/measles`
in `942bbc4ce` (see F96 for the commit range). `develop` has none of it, and
no PR exists.

**Purpose:** One row per plugin installed in a workspace: `plugin_id` (checked
to `publisher.name` form), `installed_version`, `is_enabled`, the
`granted_permissions` an admin approved, and `installed_by`. Every workspace
member can read the workspace's installs. Only a settings admin
(`util__can_manage_workspace_settings`) can insert, update, or delete them,
and an insert must name the caller as installer. A trigger stops an install
from moving to another workspace or plugin id. The `PluginInstallation` model,
its parsers (which never send null install fields), and
`PluginInstallationClient` read and write it, and the new
`settings__can_manage_plugins` permission gates the UI. The table is excluded
from desktop sync.
**Value:** A workspace chooses which bundled plugins run, and approves what
each may read, without a deploy.

**PR title:** `feat(plugins): add plugin installations with settings-admin RLS`

**Depends on:** none.

**Commits to read** (from `feat/plugins-core`):

| SHA | Subject | Take |
|---|---|---|
| `cb1e457ab` | feat(plugins): add plugin_installations with settings-admin RLS | The schema and the pgTAP test. Regenerate the migration and `database.types.ts`. |
| `79b553235` | fix(plugins): test plugin install RLS edge cases and pin installer and plugin id | The schema and test changes. Its migration rename is History. |
| `3cb73c871` | feat(plugins): add the PluginInstallation model, client, and manage permission | All of it. |
| `b2e94d8fa` | fix(plugins): never send null install fields and exclude installs from desktop sync | All of it. |
| `ed615dd94` | docs(plugins): describe plugin behavior as it is today | MIXED: only the comment in `supabase/schemas/10.plugin_installations.sql`. The docs are F112. |
| `3c37b67d4` | fix(plugins): restamp the plugin_installations migration after demo/measles | History: a rename only. Port nothing. |
| `d6508f5e8` | fix(plugins): rebuild the lockfile from demo/measles | MIXED: its desktop mirror is F98's, regenerated. Its `pnpm-lock.yaml` is regenerated in each PR that changes dependencies (see the lockfile rule at the top). |
| `ae600bc3e` | fix(plugins): restamp the plugin_installations migration after demo/measles | History: a rename only. Port nothing. |
| `03b37bec9` | fix(plugins): restamp the plugin_installations migration after demo/measles | History: a rename only. Port nothing. |

**Files:**
- `supabase/schemas/10.plugin_installations.sql` (new) and
  `supabase/tests/database/permissions/rls_plugin_installations.test.sql`
  (new).
- `shared/models/PluginInstallation/{PluginInstallation,PluginInstallation.types,PluginInstallationParsers,PluginInstallationParsers.test}.ts`
  (new) and `src/clients/plugins/PluginInstallationClient/PluginInstallationClient.ts`
  (new).
- `shared/models/Permissions/PermissionsModule/PermissionRegistry.ts`
  (`settings__can_manage_plugins`) and `apps/desktop/sync/syncable-tables.ts`
  (`EXCLUDED_TABLES`).
- Generated: `supabase/migrations/*_add_plugin_installations.sql`,
  `apps/desktop/migrations/*_add_plugin_installations.gen.sql`,
  `shared/types/database.types.ts`.

**Schema:** one migration, `20261109035052_add_plugin_installations.sql` on
the branch. It is not a rename or `STORAGE-` migration, so regenerate it,
never copy it. The branch renamed it three times (`3c37b67d4`, `ae600bc3e`,
`03b37bec9`, from `20261107043137` to `20261107194614` to `20261109020254` to
`20261109035052`) only so it sorted after migrations that reached
`demo/measles` while the branch was open; port none of those renames. On the
PR branch, run `ava supabase status` and `ava supabase switch`, set
`supabase/schemas/10.plugin_installations.sql` to its final state, then
`pnpm db:reset` and regenerate the migration with the
`supabase-declarative-schema` skill, so it takes a timestamp after
`develop`'s newest. Check that it drops nothing. Then
`pnpm desktop:sqlite:gen-migrations` (the mirror has no schema-shape
statements, since the table is not synced) and `pnpm db:gen-types`.
`exact_data_api_grants.test.sql` needs no change: the table has the standard
`authenticated` and `service_role` grants.

**Verification:**
```sh
supabase test db supabase/tests/database/permissions/rls_plugin_installations.test.sql
pnpm test:db
pnpm vitest run shared/models/PluginInstallation
pnpm desktop:sqlite:check-migrations
pnpm test:desktop
pnpm tsc -b --force
```

---

## F99: Plugin host and the Data Explorer toolbar slot

Status: not started. Built on `feat/plugins-core`, merged into `demo/measles`
in `942bbc4ce` (see F96 for the commit range). `develop` has none of it, and
no PR exists.

**Purpose:** `PluginHost`, mounted in the workspace layout, fetches the
workspace's installs (refetched on mount, so a reload never shows stale
ones), matches each to a bundled plugin, loads each manifest on its own so one
broken plugin hides only itself, and keeps the installs whose status is
`installed`: enabled, and with every permission the manifest asks for
granted. Manifests stay out of the persisted query cache. The Data Explorer
toolbar slot shows each live plugin's commands whose `when` condition holds
for the current result's facts (`hasResult`, `rowCount`, `columnCount`,
`numericColumnCount`, `dateColumnCount`), as inline buttons with an overflow
menu. Running a command lazy-loads the plugin's code chunk (cached),
registers the current result under a query handle only then, and passes the
command a scoped `avandar` API: `data.fetchRows` reads only that handle and
only its own columns, `ui.openModal` and `ui.openDrawer` render the plugin's
React content inside an error boundary (the drawer remounts per open and
closes on a workspace switch), plus `ui.notify` and `i18n.t`. Buttons stay
while a command runs, and a modal that resolves after the slot is gone is
dropped.
**Value:** Plugin commands run against what the user is looking at, without
reaching any other data.

**PR title:** `feat(plugins): run plugin commands from the Data Explorer toolbar`

**Depends on:** F96, F97 (the virtual plugin index and its types), F98 (installs
and the permission).

**Commits to read** (from `feat/plugins-core`; read files at `03b37bec9`):

| SHA | Subject | Take |
|---|---|---|
| `dc8d63a32` | feat(plugins): cache plugin chunks and select active installs | All of it. History for `pluginIndex.ts`, renamed by `17752b9a6`. |
| `17752b9a6` | refactor(plugins): split plugin selection modules and pin cache and status edge cases | All of it, including the comment in F97's `virtualAvaPluginIndexStub.ts`. |
| `43597b963` | feat(plugins): scope fetchRows to the invocation's query handle | All of it. |
| `77688ebe9` | fix(plugins): treat a NaN fetch limit as unset and project only own columns | All of it. |
| `7e532e86b` | feat(plugins): build the scoped avandar API and run plugin commands | All of it. |
| `59991ae7e` | fix(plugins): remount drawer content per open and close it on workspace switch | All of it. |
| `aed99cebd` | feat(plugins): add PluginHost and the plugin menu slot | All of it. |
| `35368fa30` | fix(plugins): load plugin manifests independently and harden the menu slot | All of it. |
| `fdb6440a7` | feat(plugins): mount the plugin host and the Data Explorer toolbar slot | All of it. |
| `1d69cf6cc` | fix(plugins): keep plugin manifests out of the persisted query cache and polish the plugins tab | MIXED: only the `src/lib/plugins` files (`PluginHost`, `PluginMenuSlot`, `isPluginIconComponent`). The `WorkspacePluginsTab` files are F100. |
| `7eae7f73e` | fix(plugins): refetch plugin installs on mount so a reload never shows stale installs | MIXED: only `PluginHost.tsx` and its integration test. `WorkspacePluginsTab*` is F100. |
| `cc85e9762` | fix(plugins): address review cleanups for the plugin core | MIXED: only `PluginDrawerHost.test.tsx`, `pluginHostMenuItems.integration.test.tsx`, and `makePluginApi.test.tsx`. See F96 for the rest. |
| `d740c81d9` | fix(plugins): register query results only when a plugin command runs | All of it. |
| `b8db0c7ac` | fix(plugins): keep toolbar buttons during a run and guard late modals | MIXED: only `makePluginApi.{tsx,test.tsx}` and `useDataExplorerPluginContext.{ts,test.ts}`. The rest is F96 and F97. |

**Files:**
- `src/lib/plugins/` (new), at `03b37bec9`: `PluginHost/**`,
  `PluginMenuSlot/**`, `PluginDrawerHost/**`, `PluginErrorBoundary/`,
  `QueryHandleRegistry/`, `fetchRowsForInvocation/`, `makePluginApi/`,
  `runPluginCommand/`, `makePluginModuleCache/`, `loadManifestModules/`,
  `getActivePluginsFromLoadablePlugins/`, `getLoadablePluginsFromInstallations/`,
  `getPluginInstallStatusFromInstallation/`, `getMenuItemsFromActivePlugins/`,
  `isPluginIconComponent/`, and `pluginIndexHelpers.ts`. Not
  `PluginIndex.types.ts` (F97) or `getContributionCountsFromManifest/` (F100).
- `src/components/layouts/RootLayout/WorkspaceLayoutContents.tsx` (mounts the
  host and the drawer host).
- `src/views/DataExplorerApp/DataExplorerApp.tsx` (the toolbar slot hunks
  only), `makeToolbarFactsFromQueryResult/` (new), and
  `useDataExplorerPluginContext/` (new).
- `src/i18n/locales/*/messages.{po,ts}`: regenerate (`5b035cb6d`,
  `4bfc2bed4`).

**Schema:** none.

**Verification:**
```sh
pnpm vitest run src/lib/plugins src/views/DataExplorerApp
pnpm i18n:extract && pnpm i18n:compile
pnpm check:plugin-bundle
pnpm tsc -b --force
```

---

## F100: Settings → Plugins tab

Status: not started. Built on `feat/plugins-core`, merged into `demo/measles`
in `942bbc4ce` (see F96 for the commit range). `develop` has none of it, and
no PR exists.

**Purpose:** Workspace settings gains a Plugins tab that lists every plugin
this deployment bundles as a card with its icon, name, description, version,
status (not installed, installed, disabled, needs review, unavailable), the
permissions it asks for, and how many commands it adds. A user with
`settings__can_manage_plugins` can install, review newly requested
permissions, enable, disable, and uninstall, each behind a confirm dialog.
Cached cards stay when a background refetch fails; the error shows only when
there is no data.
**Value:** Admins turn plugins on per workspace and see what each will read
before they approve it.

**PR title:** `feat(plugins): install and manage bundled plugins in Settings`

**Depends on:** F98 (installs and the permission), F99 (`loadManifestModules`,
`getPluginInstallStatusFromInstallation`, `pluginIndexHelpers`).

**Commits to read** (from `feat/plugins-core`; read files at `03b37bec9`):

| SHA | Subject | Take |
|---|---|---|
| `57aee8816` | feat(plugins): add the Settings → Plugins tab | All of it. |
| `1d69cf6cc` | fix(plugins): keep plugin manifests out of the persisted query cache and polish the plugins tab | MIXED: only the `src/views/WorkspaceSettingsPage/WorkspacePluginsTab` files. The `src/lib/plugins` files are F99. |
| `7eae7f73e` | fix(plugins): refetch plugin installs on mount so a reload never shows stale installs | MIXED: only `WorkspacePluginsTab.{tsx,test.tsx}`. |
| `cc85e9762` | fix(plugins): address review cleanups for the plugin core | MIXED: only `WorkspacePluginsTab.{tsx,test.tsx}`. |

**Files:**
- `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/**` (new) at
  `03b37bec9`, including `PluginSettingsCard/PluginDetails.{tsx,test.tsx}`,
  which F109 later replaces with a `PluginDetails/` folder.
- `src/lib/plugins/getContributionCountsFromManifest/*` (new) at `03b37bec9`.
- `src/views/WorkspaceSettingsPage/WorkspaceSettingsPage.tsx` (the tab).
- `src/i18n/locales/*/messages.{po,ts}`: regenerate (`5b035cb6d`,
  `4bfc2bed4`).

**Schema:** none.

**Verification:**
```sh
pnpm vitest run src/views/WorkspaceSettingsPage src/lib/plugins
pnpm i18n:extract && pnpm i18n:compile
pnpm tsc -b --force
```

---

## F101: Epidemiology plugin with linear regression

Status: not started. Built on `feat/plugins-core`, merged into `demo/measles`
in `942bbc4ce` (see F96 for the commit range). `develop` has none of it, and
no PR exists.

**Purpose:** The first bundled plugin, `plugins/epidemiology`
(`avandar.epidemiology`). Its "Linear regression" toolbar command shows when
the result has at least two numeric columns. The modal picks a predictor and
an outcome, reads the rows through `fetchRows`, fits with `simple-statistics`,
and shows the slope, intercept, R², and rows used. It never shows NaN: it
reports why a fit failed, writes floating point noise as 0, and uses
scientific notation for very small values. `plugins/bundled.yaml` lists it.
**Value:** A working reference plugin, and a regression a data analyst can
run on any query result.

**PR title:** `feat(plugins): add the epidemiology plugin with linear regression`

**Depends on:** F97 (bundling and import rules), F99 (the toolbar slot and
API), F100 (the e2e spec installs it from Settings).

**Commits to read** (from `feat/plugins-core`; read files at `03b37bec9`):

| SHA | Subject | Take |
|---|---|---|
| `0cd3454a5` | feat(plugins): add the epidemiology plugin with linear regression | All of it except `pnpm-lock.yaml` (regenerate). |
| `656189166` | fix(plugins): split the regression modal and never show NaN statistics | All of it. |
| `cc85e9762` | fix(plugins): address review cleanups for the plugin core | MIXED: only `makeStatisticTextFromNumber.{ts,test.ts}`. |
| `b178c89bb` | test(plugins): cover installing epidemiology and fitting a regression | All of it. |

**Files:**
- `plugins/epidemiology/` (new) at `03b37bec9`: `package.json`,
  `tsconfig.json`, `ava.yaml`, `locales/en.json`, `src/index.{tsx,test.tsx}`,
  `src/RegressionModal/**`, `src/fitLinearRegression/**`,
  `src/makeRegressionPointsFromRows/**`. F108, F110, and F111 extend
  `ava.yaml`, `en.json`, and `index.*`.
- `plugins/bundled.yaml` (`- epidemiology`).
- `tests/e2e/plugins-epidemiology-regression.spec.ts` (new).
- `pnpm-lock.yaml`: regenerate (`simple-statistics`).

**Schema:** none.

**Verification:**
```sh
pnpm install
pnpm vitest run plugins/epidemiology
pnpm eslint plugins/epidemiology
pnpm check:plugin-bundle
pnpm test:e2e plugins-epidemiology-regression.spec.ts
```

---

## F102: `ava plugin init` and `ava plugin validate`

Status: not started. Built on `feat/plugins-core`, merged into `demo/measles`
in `942bbc4ce` (see F96 for the commit range). `develop` has none of it, and
no PR exists.

**Purpose:** `ava plugin init <name>` scaffolds `plugins/<name>` with a
working hello command and adds it to `plugins/bundled.yaml` once, keeping the
file's comments and order. The scaffold passes validation as written.
`ava plugin validate [name]` checks a plugin's manifest, locales, icons, and
approved dependencies, then runs `tsc` and ESLint on it. With no name it
validates every bundled plugin and exits nonzero when any fails. Both print
their own help, ask for missing values in a terminal, and print the exact
invocation to try when there is no terminal.
**Value:** A new plugin starts valid, and authors catch manifest mistakes
before a build does.

**PR title:** `feat(ava-cli): add ava plugin init and ava plugin validate`

**Depends on:** F96 (`@avandar/plugin-manifest/node`), F97 (`bundled.yaml` and
the plugin import rules). Before or after F101.

**Commits to read** (from `feat/plugins-core`):

| SHA | Subject | Take |
|---|---|---|
| `0c5fee801` | feat(plugins): add ava plugin init and ava plugin validate | All of it except `pnpm-lock.yaml` (regenerate). In `apps/ava-cli/src/main.ts`, take only the import and `.addCommand("plugin", PluginCli)`. |

**Files:**
- `apps/ava-cli/src/PluginCli/**` (new): `PluginCli.ts`, `PluginCliHelpers.ts`,
  `makePluginCommandHelpText.ts`, `InitPluginCli/`, `ValidatePluginCli/`,
  `runPluginCommandAction/`.
- `apps/ava-cli/src/main.ts`, `apps/ava-cli/package.json`
  (`@avandar/plugin-manifest`, `yaml`), `apps/ava-cli/tsup.config.ts`
  (`noExternal`).
- `pnpm-lock.yaml`: regenerate.

**Schema:** none.

**Verification:**
```sh
pnpm install
pnpm test:ava-cli
pnpm build:ava-cli
ava plugin validate
```

---

## F103: Split `VisualizationContainer` into `BuiltInVizContainer` and `UiVizConfigRenderer`

Status: not started. Built on `feat/plugins-viz`, cut from the tip of
`feat/plugins-core` (`03b37bec9`) and merged into `demo/measles` in
`c339e8704`. The branch is `git log --oneline 03b37bec9..617af6600` (53
commits). `develop` has none of it, and no PR exists.

**Purpose:** `VisualizationContainer` keeps its props and behavior, and its
body moves into `BuiltInVizContainer` (data limit, settings, and the chart)
and `UiVizConfigRenderer` (one `UiVizConfig` to one chart component), with a
renderer test. No user-visible change.
**Value:** The seam F106 uses to route plugin charts elsewhere, and a smaller
component to review.

**PR title:** `refactor(viz): split VisualizationContainer into BuiltInVizContainer and UiVizConfigRenderer`

**Depends on:** none. `develop`'s `VisualizationContainer.tsx` and
`VisualizationContainer.module.css` are identical to `bd4c8907e^`.

**Commits to read** (from `feat/plugins-viz`):

| SHA | Subject | Take |
|---|---|---|
| `bd4c8907e` | refactor(viz): split VisualizationContainer into BuiltInVizContainer and UiVizConfigRenderer | All of it, as of `bd4c8907e` (`git show bd4c8907e`), not the final files, which carry F104 and F106 hunks. |

**Files:**
- `src/components/VisualizationContainer/BuiltInVizContainer/BuiltInVizContainer.tsx`
  (new), `UiVizConfigRenderer/UiVizConfigRenderer.{tsx,module.css,test.tsx}`
  (new), `VisualizationContainer.tsx`, and `VisualizationContainer.module.css`
  (deleted).

**Schema:** none.

**Verification:**
```sh
pnpm vitest run src/components/VisualizationContainer src/views/DataExplorerApp src/views/DashboardApp
pnpm tsc -b --force
```

---

## F104: Bar gap setting for bar charts

Status: not started. Built on `feat/plugins-viz`, merged into `demo/measles`
in `c339e8704` (see F103 for the commit range). `develop` has none of it, and
no PR exists.

**Purpose:** A bar chart's Style settings gain "Bar gap": Default or None.
None draws neighboring categories touching (`barCategoryGap: 0`), as an
epicurve or a histogram needs. It is an optional `barGap` on the bar
`AvaVizConfig` and `UiVizConfig`, so stored charts are unchanged.
**Value:** Histogram-style bar charts, and the setting F106 maps a plugin
chart spec's `barGap` onto.

**PR title:** `feat(viz): add a bar gap setting to the bar chart`

**Depends on:** F103 (the renderer hunk is in `UiVizConfigRenderer.tsx`).

**Commits to read** (from `feat/plugins-viz`):

| SHA | Subject | Take |
|---|---|---|
| `d4cae2303` | feat(viz): add a bar gap setting to the bar chart | All of it. In `BarChart.tsx` and `renderXYComposite.tsx` take only the `barGap` hunks: `f35ddf949` and `7bcaa6da0` changed those files on `demo/measles` too. |

**Files:**
- `shared/models/vizs/AvaBarChartVizConfig/{AvaBarChartVizConfig.types,AvaBarChartVizConfigs}.ts`,
  `shared/models/vizs/UiVizConfig/UiVizConfig.types.ts`,
  `shared/copy/vizSettingControlLabel/vizSettingControlLabel.ts`
  ("Bar gap", "Default", "None").
- `src/lib/ui/viz/BarChart/BarChart.tsx`, `src/lib/ui/viz/renderXYComposite.tsx`,
  `UiVizConfigRenderer.tsx`.
- Tests: `AvaVizConfigs.convertVizConfig.test.ts`, `makeAxisDescriptors.test.ts`,
  `UiVizConfigRenderer.test.tsx`, `VizSettingsFormBody.test.tsx`,
  `BarChart/__tests__/{BarChart.test,BarChartTestFixtures}.tsx`.
- `src/i18n/locales/*/messages.{po,ts}`: regenerate (`fb497aab7`).

**Schema:** none. `barGap` is optional in the stored config JSON.

**Verification:**
```sh
pnpm vitest run src/lib/ui/viz/BarChart shared/models/vizs src/components/VisualizationContainer
pnpm i18n:extract && pnpm i18n:compile
pnpm tsc -b --force
```

---

## F105: Chart types in plugin manifests and the SDK, and `@avandar/plugin-ui/charts`

Status: not started. Built on `feat/plugins-viz`, merged into `demo/measles`
in `c339e8704` (see F103 for the commit range). `develop` has none of it, and
no PR exists.

**Purpose:** A manifest can declare `contributes.vizTypes`: each chart type
has an id, title, icon, `render: transform` or `render: component`, and
settings with a control (a column picker for numeric, temporal, text, or any
columns, or a segmented control), `required`, and `default`.
`compileManifest` checks chart type strings and icons, and the Vite module
sources import chart type icons. `definePlugin({ vizTypes })` takes a
transform (rows to a built-in bar, line, or area chart spec, with
`xColumnType`, `series`, `layout`, and `barGap`) or a React component. Chart
components get the plugin's translator through `PluginVizContext`.
`@avandar/plugin-ui/charts` exports a curated set of Recharts components and
`useChartTheme` (Avandar's chart colors), and the import rule allows it.
**Value:** The authoring contract for plugin charts, testable before the app
draws them.

**Design:** `docs/superpowers/specs/2026-11-07-plugins-1b-viz-types-design.md`,
plan `docs/superpowers/plans/2026-11-07-plugins-1b-part-a-viz-types.md`.
F112 ports them.

**PR title:** `feat(plugins): declare chart types in plugin manifests and add @avandar/plugin-ui/charts`.
No auto-changeset: see the package PR titles rule at the top.

**Depends on:** F96, F97 (module sources and import rules), F99 and F100 (it adds
`vizTypes: []` to their test fixtures).

**Commits to read** (from `feat/plugins-viz`; read files at `617af6600`):

| SHA | Subject | Take |
|---|---|---|
| `dd43666ab` | feat(plugins): declare chart types in the plugin manifest | All of it, including the `vizTypes: []` fixtures in F99 and F100 test files. |
| `b4d5dfce0` | feat(plugins): check chart type strings and icons when compiling plugins | All of it. |
| `3f057f9a5` | feat(plugins): let definePlugin declare chart types | All of it. |
| `ec660ffb9` | feat(plugins): give plugin chart components a translator | MIXED: everything except `docs/avandar-packages.md`, which is F112. |
| `959a8c124` | feat(plugins): add @avandar/plugin-ui/charts | MIXED: everything except `docs/avandar-packages.md` (F112). Regenerate `pnpm-lock.yaml`. |
| `10ea5d684` | docs(plugins): correct the chart type reference | MIXED: only `packages/web/plugin-sdk/src/PluginViz.types.ts`. `docs/plugin-authoring.md` is F112. |
| `340032505` | docs(plugins): point the plugin and built-in chart palettes at each other | All of it (two comments). |

**Files:**
- `packages/shared/plugin-manifest/`: `src/PluginManifest/{PluginVizTypeSchema,getIssuesFromVizTypes,manifestFieldSchemas}.ts`
  (new), and the F105 hunks of `PluginManifestSchema.{ts,test.ts}`,
  `src/{index,runtime}.ts`, `compileManifest/compileManifest.{ts,test.ts}`,
  `node/readPluginDirectory.ts`, `node/__tests__/readPluginFolders.integration.test.ts`,
  and `README.md`. Leave out `query:addColumns` (F110).
- `packages/web/plugin-sdk/`: `src/PluginViz.types.ts` (new),
  `src/PluginVizContext/*` (new), and the F105 hunks of
  `src/{index,PluginApi.types}.ts`, `src/AvandarContext/*`,
  `src/definePlugin/*`, and `README.md`.
- `packages/web/plugin-ui/`: `src/charts.ts` (new),
  `src/useChartTheme/*` (new), `vitest.config.ts` (new), `package.json`,
  `tsup.config.ts`, and the charts line of `README.md`.
- `scripts/vite-plugin-ava-plugins/makePluginModuleSources/*`,
  `eslint/plugin-restrictions.{js,test.js}`, and the comment in
  `src/lib/ui/viz/ChartConstants.ts`.
- Fixtures: `src/lib/plugins/{PluginHost/__tests__/pluginHostMenuItems.integration.test.tsx,getMenuItemsFromActivePlugins/getMenuItemsFromActivePlugins.test.ts,runPluginCommand/runPluginCommand.test.ts,getContributionCountsFromManifest/getContributionCountsFromManifest.test.ts}`,
  `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/{PluginSettingsCard/PluginDetails.test.tsx,WorkspacePluginsTab.test.tsx}`.
- `pnpm-lock.yaml`: regenerate.

**Schema:** none.

**Verification:**
```sh
pnpm install
pnpm --filter @avandar/plugin-manifest test
pnpm --filter @avandar/plugin-sdk test
pnpm --filter @avandar/plugin-ui test
pnpm vitest run scripts/vite-plugin-ava-plugins eslint/plugin-restrictions.test.js src/lib/plugins src/views/WorkspaceSettingsPage
pnpm verify:packages
pnpm tsc -b --force
```

---

## F106: Draw stored plugin charts in every visualization container

Status: not started. Built on `feat/plugins-viz`, merged into `demo/measles`
in `c339e8704` (see F103 for the commit range). `develop` has none of it, and
no PR exists.

**Purpose:** `AvaVizConfig` and `UiVizConfig` gain a `vizType: "plugin"`
member that names `pluginId` and `pluginVizId` and keeps column settings by
column ID apart from other settings, so ID-to-name conversion and
provisional ID remapping work without the plugin's manifest. Sites that only
handle built-in charts narrow to `AvaVizConfig.BuiltInType`.
`VisualizationContainer` sends a plugin config to `PluginVizRenderer`, which
finds the chart type in the bundled index and lazy-loads the plugin's chart
runtime (its own chunk, exempt from the host bundle budget). A transform's
output spec becomes a built-in bar, line, or area chart
(`makeUiVizConfigFromPluginChartSpec`, which maps `barGap`). A component
chart renders inside an error boundary that also contains throwing getters.
The chart area stays empty until result columns arrive, and a placeholder
says when the plugin is missing, its code failed to load, it crashed (and
recovers on a type change), its saved settings are invalid, or a required
setting is unset ("Choose a {settingLabel}"). Dashboard blocks draw plugin
charts the same way. Product films alias `virtual:ava-plugin-index` to an
empty index, so a plugin chart in a film shows the missing-plugin
placeholder.
**Value:** A saved plugin chart draws in the Data Explorer, on workspace
dashboards, and on public dashboards.

**PR title:** `feat(plugins): draw stored plugin charts`

**Depends on:** F104 (`barGap` in the bar `UiVizConfig`), F105 (chart types in
the manifest and SDK), F99 (`PluginErrorBoundary`). F21: if F21 is on
`develop` first, carry `ee9692bc1`'s two hunks in `findDashboardTile.ts` and
`useGadgetSummaries.ts`; if not, skip them (see the shared files rows).

**Commits to read** (from `feat/plugins-viz`; read files at `617af6600`):

| SHA | Subject | Take |
|---|---|---|
| `a1f6586a2` | feat(plugins): add plugin viz config types and narrow built-in viz sites | All of it. |
| `ee9692bc1` | feat(plugins): add the plugin member to the viz config unions | All of it. Its `findDashboardTile.ts` and `useGadgetSummaries.ts` hunks depend on F21 (see Depends on). |
| `9031570ea` | feat(plugins): build plugin viz configs from manifest settings | All of it. |
| `1dd400d89` | feat(plugins): look up plugin chart types from the bundled index | MIXED: only `getPluginVizTypeFromManifest/`, `pluginVizOptionHelpers.{ts,test.ts}`, and `usePluginVizType/`. `usePluginVizOptions/` is F107. `useVizTypeLabel/` is History (`908600a65` deletes it). |
| `7fb513a5f` | feat(plugins): turn plugin chart specs into built-in chart configs | All of it. |
| `fca18585b` | refactor(plugins): use make names for chart spec helpers | All of it. |
| `a299f9e34` | feat(plugins): add the lazily loaded plugin chart runtime | All of it. |
| `f3702ffe9` | fix(plugins): contain throwing getters in plugin chart definitions | All of it. |
| `53e3aeb60` | feat(plugins): draw stored plugin charts in the visualization container | All of it. |
| `2d72a1e76` | fix(plugins): recover crashed plugin charts on type changes | All of it. |
| `d696602d1` | fix(plugins): wait for result columns before drawing plugin charts | All of it. |
| `2acb89096` | fix(plugins): leave the chart area empty until result columns arrive | All of it. |
| `7fff401e6` | feat(plugins): exempt the lazy plugin chart runtime from the host budget | All of it. |
| `cf754c23d` | chore(plugins): raise the plugin host budget for plugin charts | All of it. |
| `cf1cfa6a2` | fix(plugins): contain a crash while drawing a transform chart | All of it. |
| `e763d1c32` | fix(plugins): show invalid settings for a stored plugin chart without column settings | All of it. |
| `0709ea1a4` | fix(video-producer): resolve the plugin index for product charts | All of it. Not a separate PR: `develop`'s product charts never import `virtual:ava-plugin-index`, so the shim is needed only once this PR makes `VisualizationContainer` reach `pluginIndexHelpers`. |
| `908600a65` | refactor(plugins): remove the unused useVizTypeLabel hook | Nothing to port: it deletes what `1dd400d89` added. |
| `2016faa93` | fix(plugins): word the unset-setting prompt for any setting label | MIXED: only `PluginVizMissingSettings.tsx` and `PluginVizRenderer.test.tsx`. The doc line is F112. |

**Files:**
- Model: `shared/models/vizs/AvaPluginVizConfig/**` (new),
  `shared/models/vizs/doesDataTypeMatchColumnPicker/*` (new), the plugin
  hunks of `shared/models/vizs/AvaVizConfig/{AvaVizConfig,AvaVizConfig.types,AvaVizConfigs,IAvaVizConfigModule,makeColumnSlotsFromAvaVizConfig}.ts`,
  `makeAvaVizConfigFromUiVizConfig/*`, `makeUiVizConfigFromAvaVizConfig/*`,
  `remapProvisionalColumnIdsInAvaVizConfig/*`,
  `__tests__/AvaVizConfigs.{convertVizConfig,pluginConfigs}.test.ts`,
  `UiVizConfig/UiVizConfig.types.ts`, `getAxisRolesFromVizType/`, the
  `BuiltInType` narrowing in every `Ava*VizConfigs.ts`,
  `shared/config/GlobalVizConfig.ts`, and `shared/copy/vizTypeLabel.ts`.
- Rendering: `src/lib/plugins/vizs/{PluginVizPlaceholder,PluginVizRenderer,PluginVizRuntime,loadPluginVizRuntime,makeUiVizConfigFromPluginChartSpec,PluginChartSpecSchema,getPluginVizTypeFromManifest,usePluginVizType}/`
  and `pluginVizOptionHelpers.{ts,test.ts}` (all new),
  `src/lib/plugins/PluginErrorBoundary/PluginErrorBoundary.tsx`.
- Container: `VisualizationContainer.tsx`,
  `BuiltInVizContainer/BuiltInVizContainer.tsx`,
  `UiVizConfigRenderer/UiVizConfigRenderer.tsx`, the plugin case in
  `VizSettingsForm/VizSettingsFormBody/VizSettingsFormBody.tsx` (renders no
  subform), `VizSettingsForm/Control/ColumnPickerControl.tsx`, and
  `__tests__/VisualizationContainer{.test,TestFixtures}.tsx`.
- Dashboards and explorer: `DataVizPBlock/DataVizPBlock/{DataVizPBlock.tsx,__tests__/DataVizPBlock.test.tsx}`,
  `DataVizPBlock/makeDataVizPBlockStateFromProps/{makeDataVizPBlockStateFromProps,synchronizeUiVizType}.ts`,
  `AvaPageDataMigrationV5/AvaPageDataMigrationV5.test.ts`, and `ee9692bc1`'s
  hunks in `DataExplorerStateManager.tsx`.
- Bundle check: `scripts/vite-plugin-ava-plugins/checkPluginBundle/*`.
- Films: `apps/ava-video-producer/avandar-adapter/shell-aliases.json` and
  `apps/ava-video-producer/avandar-adapter/shims/pluginIndex.ts` (new).
- F21 files, conditionally: `src/clients/dashboards/findDashboardTile/findDashboardTile.ts`,
  `src/components/RichText/Gadget/useGadgetSummaries/useGadgetSummaries.ts`.
- `src/i18n/locales/*/messages.{po,ts}`: regenerate (`fb497aab7`,
  `617af6600`, `4bfc2bed4`).

**Schema:** none. Plugin chart configs live in the existing viz config JSON.

**Verification:**
```sh
pnpm vitest run shared/models/vizs src/lib/plugins src/components/VisualizationContainer src/views/DashboardApp/AvaPage src/views/DataExplorerApp/DataExplorerStateManager scripts/vite-plugin-ava-plugins
pnpm check:plugin-bundle
pnpm type-check:video-producer
pnpm i18n:extract && pnpm i18n:compile
pnpm tsc -b --force
```

---

## F107: Pick and configure plugin chart types in the Data Explorer and on dashboards

Status: not started. Built on `feat/plugins-viz`, merged into `demo/measles`
in `c339e8704` (see F103 for the commit range). `develop` has none of it, and
no PR exists.

**Purpose:** The visualization type picker lists the chart types of the
workspace's installed plugins after the built-in ones, in the Data Explorer
and in a dashboard chart block's new "Chart type" field. Picking one draws
its settings form from the manifest: column pickers offer only columns of the
requested data type, and segmented controls carry their captions. The Data
Explorer remembers each plugin chart's settings when the user switches type
and back, restores them from the URL, and drops a remembered column setting
whose column left the result. Gadget summaries call a plugin chart tile
"Plugin chart", since its title lives in a lazily loaded manifest.
**Value:** A user can make, edit, and save a plugin chart with no code.

**PR title:** `feat(plugins): pick and configure plugin chart types in the Data Explorer and on dashboards`

**Depends on:** F106. F21: carry `3cde82485` only if F21 is on `develop`
first; otherwise F21 takes the final gadget files (see the shared files
rows).

**Commits to read** (from `feat/plugins-viz`; read files at `617af6600`):

| SHA | Subject | Take |
|---|---|---|
| `1dd400d89` | feat(plugins): look up plugin chart types from the bundled index | MIXED: only `src/lib/plugins/vizs/usePluginVizOptions/`. The rest is F106. |
| `042119c16` | feat(plugins): draw plugin chart settings forms from the manifest | All of it. |
| `c2e6e7cdf` | feat(plugins): caption segmented plugin chart settings | All of it. |
| `a807740d9` | test(plugins): isolate the plugin settings loading test | All of it. |
| `75465118b` | feat(plugins): remember plugin chart configs in the Data Explorer | All of it. |
| `9f67f0efa` | refactor(plugins): extract the plugin chart memory remap | All of it. |
| `7b97f5b5e` | fix(plugins): drop remembered plugin column settings whose column left the result | All of it. |
| `dea616802` | feat(plugins): list plugin chart types in the visualization type picker | All of it, including `ExplorerScreen.tsx` in the video producer. In `DataExplorerDrawer.tsx` and `DataExplorerDrawerRail.*` take only the `vizConfig` and `columns` hunks. |
| `82daa1e8d` | feat(plugins): pick plugin chart types for dashboard charts | All of it. |
| `20e4f3203` | docs(plugins): clarify the dashboard plugin chart pick | All of it (two code comments). |
| `3cde82485` | feat(plugins): name plugin chart tiles in gadget summaries | All of it, if F21 is on `develop` (see Depends on). |

**Files:**
- Settings form: `src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/**`
  (new) and `VizSettingsFormBody/VizSettingsFormBody.{tsx,test.tsx}`.
- Picker: `VizSettingsForm/VizTypeSelect/VizTypeSelect.{tsx,test.tsx}` and
  `src/lib/plugins/vizs/usePluginVizOptions/*` (new).
- Data Explorer: `DataExplorerStateManager/{DataExplorerStateManager.tsx,dataExplorerStateHelpers.ts,DataExplorerAppState.types.ts}`
  and `__tests__/DataExplorerStateManager.pluginVizConfigMemory.test.tsx`
  (new), `DataExplorerUrlState.ts`,
  `__tests__/explorerUrlChartRestore.integration.test.tsx`,
  `DataExplorerDrawer/DataExplorerDrawer.tsx`,
  `DataExplorerDrawer/DataExplorerDrawerRail/DataExplorerDrawerRail.{tsx,test.tsx}`,
  `SaveToDashboardModal/createDataVizBlock/createDataVizBlock.test.ts`.
- Dashboards: `AvaPage/pfields/VizTypePField/{VizTypePField.tsx,VizTypePField.test.tsx,useVizTypePFieldConfig.tsx}`
  (new), `pfields/useDataVizAuthoring/useDataVizAuthoring.ts`,
  `pfields/VizConfigPField/VizConfigPField.test.tsx`,
  `pblocks/DataVizPBlock/useDataVizPBlockConfig.tsx`, and
  `makeDataVizPBlockStateFromProps.test.ts`.
- Gadgets (F21 files): `findDashboardTile.{ts,test.ts}`,
  `useGadgetSummaries.ts`, `__tests__/useGadgetSummaries.dashboards.test.tsx`.
- Films: `apps/ava-video-producer/avandar-adapter/ExplorerScreen/ExplorerScreen.tsx`.
- `src/i18n/locales/*/messages.{po,ts}`: regenerate (`fb497aab7`, `4bfc2bed4`).

**Schema:** none.

**Verification:**
```sh
pnpm vitest run src/components/VisualizationContainer src/views/DataExplorerApp src/views/DashboardApp/AvaPage src/lib/plugins/vizs src/clients/dashboards/findDashboardTile src/components/RichText/Gadget
pnpm type-check:video-producer
pnpm i18n:extract && pnpm i18n:compile
pnpm tsc -b --force
```

---

## F108: Epicurve and rate plot charts in the epidemiology plugin

Status: not started. Built on `feat/plugins-viz`, merged into `demo/measles`
in `c339e8704` (see F103 for the commit range), plus `bdb15ff8b` from
`fix/plugin-card`. `develop` has none of it, and no PR exists.

**Purpose:** The epidemiology plugin declares two chart types. "Epicurve" is
a transform: it buckets a date column by day, epi week, or month, counts rows
or sums an optional case count column, stacks by an optional text column,
keeps the latest buckets when there are too many, and draws a stacked bar
chart with no gap between bars. "Rate plot" is a component built on
`@avandar/plugin-ui/charts`: one point per label with optional lower and upper
whiskers, sorted by rate or label, with formatted ticks and a label axis
sized to its labels. The plugin description now says what it does.
**Value:** The two charts an outbreak response team reads first, available
in the Data Explorer and on dashboards.

**PR title:** `feat(plugins): add epicurve and rate plot charts to the epidemiology plugin`

**Depends on:** F101 (the plugin), F106 (drawing), F107 (the e2e spec picks
the epicurve in the Data Explorer). The e2e spec also imports
`tests/e2e/setup/stubFeaturebaseSdk.ts` (open PR #321, `fix/e2e-stability`)
and `tests/e2e/helpers/parseDashboardIdFromEditorUrl.ts` (`3400e8f2f`,
the Postgres branch's `3400e8f2f`, not on `develop`). If either is not merged first,
carry it here: the helper is three lines.

**Commits to read** (from `feat/plugins-viz`; read files at `617af6600`):

| SHA | Subject | Take |
|---|---|---|
| `a890a4b83` | feat(plugins): bucket epicurve dates by day, epi week, and month | All of it. |
| `2daf9d445` | feat(plugins): add the epicurve transform | All of it. |
| `55a95eea7` | fix(plugins): keep the latest epicurve buckets and speed up stacking | All of it. |
| `8bb6ddc28` | test(plugins): pin the epicurve window edges | All of it. |
| `173e7ab93` | feat(plugins): add the rate plot chart component | All of it. |
| `cedfac631` | fix(plugins): format rate plot ticks and size its label axis | All of it. |
| `a7a8ad12f` | test(plugins): guard the rate plot clamp test | All of it. |
| `c825a6095` | feat(plugins): declare the epicurve and rate plot chart types | All of it. |
| `849806e21` | test(plugins): cover an epicurve from the Data Explorer on a public dashboard | All of it. |
| `5aad741f1` | test(plugins): harden the epicurve E2E cleanup | All of it. |
| `bdb15ff8b` | fix(epidemiology): describe what the plugin does in its description | All of it (on `fix/plugin-card`). Its description names the epicurve and rate plot, so it lands with them. |

**Files:**
- `plugins/epidemiology/src/epicurve/**` (new),
  `plugins/epidemiology/src/ratePlot/**` (new),
  `plugins/epidemiology/src/getNumberFromCellValue/*` (new).
- The chart hunks of `plugins/epidemiology/{ava.yaml,locales/en.json,src/index.tsx,src/index.test.tsx}`
  (read at `617af6600`, then apply `bdb15ff8b`'s description).
- `tests/e2e/plugins-epidemiology-epicurve.spec.ts` (new).

**Schema:** none.

**Verification:**
```sh
pnpm vitest run plugins/epidemiology
pnpm eslint plugins/epidemiology
pnpm check:plugin-bundle
pnpm test:e2e plugins-epidemiology-epicurve.spec.ts
```

---

## F109: Plugin cards list what a plugin adds and the data it reads

Status: not started. Built on `fix/plugin-card` (`ea01f019d`, `a6a0cbc1c`,
`79a56b139`), pushed straight to `demo/measles` and joined in `0a5cc10d9`.
`develop` has none of it, and no PR exists.

**Purpose:** F100's plugin card only counted Data Explorer buttons. It now names
each addition by its localized title ("Data Explorer toolbar: Linear
regression", "Chart types: Epicurve, Rate plot") and says what data the
plugin and its charts can read, behind an accessible "See more" disclosure
that keeps the card compact. `getContributionsFromManifest` replaces
`getContributionCountsFromManifest`.
**Value:** An admin can tell what a plugin does before installing it.

**PR title:** `fix(plugins): list what a plugin adds and the data it reads on its card`

**Depends on:** F100 (the card), F105 (manifest chart types).

**Commits to read** (from `fix/plugin-card`):

| SHA | Subject | Take |
|---|---|---|
| `ea01f019d` | fix(plugins): list what a plugin adds and the data it reads on its card | All of it. Regenerate the `.po` catalogs. |
| `a6a0cbc1c` | refactor(plugins): split the plugin details card | All of it. |
| `79a56b139` | chore(i18n): translate the plugin card strings | Regenerate: translation only, for this feature's strings. |

**Files:**
- `src/lib/plugins/getContributionsFromManifest/*` (new) and
  `src/lib/plugins/getContributionCountsFromManifest/*` (deleted).
- `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/{PluginDetails,PluginAdditionsSection,PluginDataAccessSection,PluginDetailsSection,PluginDetailsToggle}.tsx`
  and `PluginDetails.test.tsx` (new; read `PluginDataAccessSection.tsx` and
  the test at `a6a0cbc1c`, since F110 adds a row), the old
  `PluginSettingsCard/PluginDetails.{tsx,test.tsx}` (deleted),
  `PluginManifestSummary.tsx`, `PluginSettingsCard.tsx`, and
  `WorkspacePluginsTab.test.tsx`.
- `src/i18n/locales/*/messages.{po,ts}`: regenerate.

**Schema:** none.

**Verification:**
```sh
pnpm vitest run src/lib/plugins/getContributionsFromManifest src/views/WorkspaceSettingsPage
pnpm i18n:extract && pnpm i18n:compile
pnpm tsc -b --force
pnpm test:e2e plugins-epidemiology-regression.spec.ts
```

---

## F110: Derived columns: `avandar.dataExplorer.addColumns` with Undo

Status: not started. Built on `feat/plugins-columns`, branched from
`demo/measles` at `921c48634` and merged in `e2f65917e`. The branch is
`git log --oneline 921c48634..68906f8d6` (30 commits). `develop` has none of
it, and no PR exists.

**Purpose:** A plugin that asks for the new `query:addColumns` permission can
call `avandar.dataExplorer.addColumns(columns)` from a toolbar command. Each
column is a name and one DuckDB SQL expression. The host checks that each
expression is a single expression (no statements, no trailing `QUALIFY`,
`WINDOW`, or `INTO`) and calls no denied function (file readers, query and
scanner functions, checkpoint, and variable functions), rejects a malformed
input or a name that clashes with a result column or `__ava_row` with
`InvalidExpression`, and wraps the Data Explorer's SQL to add the columns.
The Data Explorer runs the new SQL, keeps the chart, and moves its column
bindings to the new SQL so passed-through columns keep their IDs (the
`useQueryResultColumnBindings` seed fix). A notification names the added
columns and offers Undo, which restores the earlier SQL, query, chart, and
bindings. A call after the Data Explorer is gone is rejected. Plugins also get
`ui.closeModal` and `SegmentedControl`, the query runs report a
`plugin_command` analytics trigger, and the plugin card lists
`query:addColumns`.
**Value:** Plugins compute new columns in the database, inside the user's
query, with a one-click undo.

**Design:** `docs/superpowers/specs/2026-11-07-plugins-1b-viz-types-design.md`
(derived columns part), plan
`docs/superpowers/plans/2026-11-09-plugins-1b-part-b-derived-columns.md`.
F112 ports them.

**PR title:** `feat(plugins): let toolbar commands add derived columns, with Undo`.
No auto-changeset: see the package PR titles rule at the top.

**Depends on:** F99 (the command runner and API), F101 (the regression tests'
mocked API gains `closeModal`), F107 (it edits the Data Explorer state files
after F107's hunks), F109 (it adds a row to `PluginDataAccessSection.tsx`).

**Commits to read** (from `feat/plugins-columns`):

| SHA | Subject | Take |
|---|---|---|
| `3b2e41020` | feat(plugins): add the derived column SDK types and ui.closeModal | All of it, including the two epidemiology test mocks. |
| `3dbe52687` | feat(plugins): add the query:addColumns permission | All of it. |
| `eac9021ac` | feat(plugin-ui): export SegmentedControl | MIXED: only `packages/web/plugin-ui/{src/index.ts,README.md}`. The two docs are F112. |
| `e9cf18584` | feat(plugins): check that a derived column is one SQL expression | All of it. |
| `79fd44b9e` | fix(plugins): reject trailing qualify, window, and into clauses in derived column expressions | All of it. |
| `82201dce7` | feat(plugins): wrap the Data Explorer SQL with derived columns | All of it. |
| `2145fb80e` | fix(plugins): reject a result column named __ava_row when adding columns | All of it. |
| `4c8fa630d` | feat(plugins): give toolbar commands avandar.dataExplorer.addColumns | All of it. |
| `b3f267300` | feat(data-explorer): apply and undo a plugin's derived columns SQL | All of it. In `AnalyticsEvents.types.ts` take only `plugin_command`. |
| `6df574a84` | fix(data-explorer): keep column IDs when the explorer wraps its SQL | All of it. Not a `develop` bug: the changed branch in `useQueryResultColumnBindings` only runs once `b3f267300` re-keys bindings to wrapped SQL. |
| `e257d718f` | feat(data-explorer): let toolbar commands add columns, with Undo | All of it. In `DataExplorerApp.tsx` take only the bridge hunks. |
| `6236d0d1e` | fix(plugins): deny file and query functions in derived column expressions | MIXED: only the `src/lib/plugins/derivedColumns` files. The two docs are F112. |
| `346156b3c` | fix(plugins): reject addColumns once the Data Explorer is gone | All of it. |
| `1763a2514` | test(plugins): cover saving derived columns to a dashboard | All of it. |
| `70d25526d` | refactor(plugins): extract the modal members of the plugin UI API | All of it. |
| `759baddf6` | fix(plugins): reject malformed addColumns input with InvalidExpression | All of it. |
| `635dc1fe2` | fix(plugins): deny database scanner, checkpoint, and variable functions | MIXED: only `assertSingleSqlExpression.{ts,test.ts}`. The two docs are F112. |
| `2a914b721` | chore(i18n): extract and compile the derived column strings | Regenerate. |

**Files:**
- Packages: the F110 hunks of `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.{ts,test.ts}`,
  `packages/web/plugin-sdk/src/{PluginApi.types,index}.ts`,
  `packages/web/plugin-sdk/src/PluginError/PluginError.ts`, and
  `packages/web/plugin-ui/{src/index.ts,README.md}`.
- Host: `src/lib/plugins/derivedColumns/**` (new),
  `src/lib/plugins/DataExplorerBridge.types.ts` (new), and the F110 hunks of
  `src/lib/plugins/{makePluginApi,runPluginCommand,PluginMenuSlot/PluginMenuSlot,PluginMenuSlot/usePluginCommandRunner}/*`.
- Data Explorer: `useDataExplorerPluginBridge/` (new),
  `notifyDerivedColumnsAdded/` (new),
  `__tests__/pluginDerivedColumns.integration.test.tsx` (new),
  `DataExplorerStateManager/__tests__/DataExplorerStateManager.derivedColumns.test.tsx`
  (new), the F110 hunks of `DataExplorerApp.tsx`,
  `DataExplorerStateManager/{DataExplorerStateManager.tsx,dataExplorerStateHelpers.ts,DataExplorerAppState.types.ts}`,
  and `useQueryResultColumnBindings/useQueryResultColumnBindings.{ts,test.ts}`.
- `shared/analytics/AnalyticsEvents/AnalyticsEvents.types.ts`
  (`plugin_command`).
- `PluginSettingsCard/PluginDetails/{PluginDataAccessSection.tsx,PluginDetails.test.tsx}`.
- `plugins/epidemiology/src/{index.test.tsx,RegressionModal/RegressionModal.test.tsx}`
  (`closeModal` in the mocked API).
- `src/i18n/locales/*/messages.{po,ts}`: regenerate.

**Schema:** none.

**Verification:**
```sh
pnpm --filter @avandar/plugin-manifest test
pnpm --filter @avandar/plugin-sdk test
pnpm vitest run src/lib/plugins src/views/DataExplorerApp src/views/WorkspaceSettingsPage plugins/epidemiology
pnpm vitest run --config vitest.executed.config.ts src/lib/plugins/derivedColumns
pnpm i18n:extract && pnpm i18n:compile
pnpm tsc -b --force
```

---

## F111: Incidence rates with Byar intervals and rolling averages in the epidemiology plugin

Status: not started. Built on `feat/plugins-columns`, merged into
`demo/measles` in `e2f65917e` (see F110 for the commit range), plus
`f6fecb818`, committed directly on `demo/measles`. `develop` has none of it,
and no PR exists.

**Purpose:** Two new epidemiology toolbar commands add columns through
`addColumns`. "Incidence rate" (shows with a numeric column) takes a case
count column and a population from a column or a fixed value, and a rate
base (per 1,000, per 100,000, and so on), and adds a rate column with Byar
95% confidence bounds. "Rolling average" (shows with a date column) averages
a value over a date range window of days or weeks up to each row's date,
optionally per group. With no value column it counts each row as 1, so a
line list needs no count column, and the epicurve's count setting now says
it can be left empty. Column names are slugged from their labels.
**Value:** The rates and smoothed counts an outbreak report needs, computed
in DuckDB, ready to chart as a rate plot or a line.

**PR title:** `feat(plugins): add incidence rate and rolling average columns to the epidemiology plugin`

**Depends on:** F110 (`addColumns` and `query:addColumns`), F108 (its e2e spec
draws the incidence columns as a rate plot with whiskers).

**Commits to read** (from `feat/plugins-columns`, plus one direct commit):

| SHA | Subject | Take |
|---|---|---|
| `f73f974e8` | feat(plugins): slug column names for derived epidemiology columns | All of it. |
| `5fc9b9157` | feat(plugins): make incidence rate columns with Byar intervals | All of it. |
| `ae53082ba` | feat(plugins): make a rolling average column over a date range window | All of it. |
| `53e0763b0` | test(epidemiology): say the Byar reference values are computed from the formula | All of it. |
| `e2fb0c30c` | feat(plugins): add the incidence modal to the epidemiology plugin | All of it. |
| `c76834875` | feat(plugins): add the rolling average modal to the epidemiology plugin | All of it. |
| `5048ca1a7` | feat(plugins): add incidence and rolling average commands to epidemiology | All of it. |
| `f1fe6522a` | test(plugins): cover incidence columns drawn as a rate plot with whiskers | All of it. |
| `b38e51f07` | test(plugins): delete the incidence spec's install only when it made one | All of it. |
| `68906f8d6` | test(plugins): mark the incidence spec's install as soon as it is confirmed | All of it. |
| `f6fecb818` | feat(plugins): count each line-list row when no value column is set | All of it (direct on `demo/measles`). Its `viz.epicurve.countColumn` label is a one-line F108 string that rides here, and its `assertSingleSqlExpression.test.ts` case is in F110's file. |

**Files:**
- `plugins/epidemiology/src/incidence/**`, `src/rollingAverage/**`, and
  `src/derivedColumns/**` (all new).
- The F111 hunks of `plugins/epidemiology/{ava.yaml,locales/en.json,src/index.tsx,src/index.test.tsx}`
  (final state at `34798387c`).
- `src/lib/plugins/derivedColumns/assertSingleSqlExpression/assertSingleSqlExpression.test.ts`
  (one case).
- `tests/e2e/plugins-epidemiology-incidence.spec.ts` (new).

**Schema:** none.

**Verification:**
```sh
pnpm vitest run plugins/epidemiology src/lib/plugins/derivedColumns
pnpm vitest run --config vitest.executed.config.ts plugins/epidemiology
pnpm eslint plugins/epidemiology
pnpm check:plugin-bundle
pnpm test:e2e plugins-epidemiology-incidence.spec.ts
```

---

## F112: Plugin docs: authoring guide, package docs, and the plugin design specs and plans

Status: not started. Built across `feat/plugins-core`, `feat/plugins-viz`, and
`feat/plugins-columns`. `docs/plugin-authoring.md` is new on this branch:
`develop` has neither it nor any of the specs and plans below, and no PR
exists.

**Purpose:** `docs/plugin-authoring.md` walks a developer through writing a
bundled plugin: create it with `ava plugin init`, lay out the code, write the
manifest, decide when a command shows, write the command, add columns to the
Data Explorer query, declare and draw a chart type, translate strings, stay
within the import allowlist, and validate. `docs/avandar-packages.md`
documents the three plugin packages, and `AGENTS.md` links the guide. The
specs and plans record the plugin ecosystem design and each slice.
**Value:** One place that tells a plugin author what works today.

**PR title:** `docs(plugins): add the plugin authoring guide and the plugin ecosystem design`

**Depends on:** F96 to F111. Every doc commit only ever touched plugin text, so
take the final files whole instead of carving them across the code PRs.

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `ffd438917` | docs: add plugin ecosystem design spec | All of it. |
| `da96709f3` | docs: replace anchor links in plugin ecosystem spec | All of it. |
| `15c74a8b5` | docs: add plugins slice 1a spec and update plugin ecosystem design | All of it. |
| `a2ff05a14` | docs: add plugins slice 1a implementation plan | All of it. |
| `a51663498` | docs(plugins): add the plugin authoring guide and package docs | All of it, including the `AGENTS.md` line. |
| `10c78e807` | fix(plugins): check every chunk the app can load for plugin code | MIXED: only `docs/plugin-authoring.md`. The rest is F97. |
| `63a5dfbc4` | fix(plugins): keep plugin imports inside the plugin's own folder | MIXED: only `docs/plugin-authoring.md`. The rest is F97. |
| `ed615dd94` | docs(plugins): describe plugin behavior as it is today | MIXED: everything except the schema comment, which is F98. |
| `bb4055778` | docs(plugins): add the slice 1b viz types and derived columns spec | All of it. |
| `9519c319b` | docs(plugins): add the slice 1b part A implementation plan | All of it. |
| `ec660ffb9` | feat(plugins): give plugin chart components a translator | MIXED: only `docs/avandar-packages.md`. The rest is F105. |
| `959a8c124` | feat(plugins): add @avandar/plugin-ui/charts | MIXED: only `docs/avandar-packages.md`. The rest is F105. |
| `51ba361df` | docs(plugins): document plugin chart types | All of it. |
| `10ea5d684` | docs(plugins): correct the chart type reference | MIXED: only `docs/plugin-authoring.md`. `PluginViz.types.ts` is F105. |
| `2016faa93` | fix(plugins): word the unset-setting prompt for any setting label | MIXED: only `docs/plugin-authoring.md`. The rest is F106. |
| `669e679c6` | docs(plugins): add the derived columns implementation plan | All of it. |
| `eac9021ac` | feat(plugin-ui): export SegmentedControl | MIXED: only `docs/avandar-packages.md` and `docs/plugin-authoring.md`. The rest is F110. |
| `7a8adcbf9` | docs(plugins): document avandar.dataExplorer.addColumns | All of it. |
| `6236d0d1e` | fix(plugins): deny file and query functions in derived column expressions | MIXED: only `docs/plugin-authoring.md` and the part B plan. The rest is F110. |
| `635dc1fe2` | fix(plugins): deny database scanner, checkpoint, and variable functions | MIXED: only `docs/plugin-authoring.md` and the part B plan. The rest is F110. |

**Files:**
- `docs/plugin-authoring.md` (new), the plugin package sections and tree
  lines of `docs/avandar-packages.md`, and the plugin authoring line in
  `AGENTS.md`.
- `docs/superpowers/specs/2026-11-06-plugin-ecosystem-design.md`,
  `2026-11-06-plugins-1a-core-commands-design.md`,
  `2026-11-07-plugins-1b-viz-types-design.md` (all new).
- `docs/superpowers/plans/2026-11-06-plugins-1a-core-commands.md`,
  `2026-11-07-plugins-1b-part-a-viz-types.md`,
  `2026-11-09-plugins-1b-part-b-derived-columns.md` (all new; see Open
  questions).

**Schema:** none.

**Verification:**
```sh
pnpm build:ava-cli
ava plugin validate epidemiology
git grep -n 'plugin-authoring.md' -- AGENTS.md docs packages
```

---

## F113: Public dashboards run their queries for a signed-out visitor

Status: not started. Committed on `fix/public-queries` (no local or remote
ref is left), branched at `b32bf6834`. The branch reached `demo/measles`
through `origin/demo/measles`: `63d39f21e` merged `origin/demo/measles` into
it, `fa0b35adf` was committed on top, and `61ac622a0` merged that into the
local `demo/measles`. The branch's other two commits, `3ddcf3949` (Deno type
check excludes `dist`) and `9f0a7ef06` (`withRateLimit` fake clock), are not
public query work: they are F124 and an F2 addendum. No PR exists.

**Purpose:** A visitor with no session who opened a dashboard published to
the web saw every chart fail with "permission denied for table
dataset_columns". The public query session ran the workspace runner, which
reads the dataset column catalog, and `anon` has no grant on that table. Now:
the relation loader reads the catalog only when it has relations to load, so
a literal `VALUES` query or a query whose datasets are already in DuckDB
never reads it. `QueryMediator` takes a `datasetColumnSource` option
(`catalog` by default), and `PublicQuerySession` sets it to `stored`, so a
snapshot relation loads as its Parquet holds it: no catalog read, no renames,
no casts. Because a snapshot is now loaded as stored, a whole-dataset
(`all_columns`) slice of a CSV, XLSX, PDF, or open data dataset is copied
from the stored upload Parquet only when the catalog renames and casts
nothing, by the same rule a workspace query applies on load. Otherwise the
slice is read through the workspace query, as every narrower slice already
is. Snapshots published earlier keep their old shape until the dashboard is
published again.
**Value:** A dashboard shared to the web shows its charts to the people it was
shared with, including charts on a column the owner renamed.

**PR title:** `fix(dashboards): let a signed-out visitor run a public dashboard's queries`

**Depends on:** none. The bug is on `develop`: its `relationLoading.ts`
`loadRelationBytes` reads `dataset_columns` unconditionally,
`queryRunner.ts` `_getParquetNeededByDatasetId` reads it for any finite
column set, `PublicQuerySession` passes no column source, and
`dashboardPublishSnapshots.ts` copies the stored Parquet for every
`all_columns` slice. The commits are written against Postgres branch files
that `develop` lacks (see Files), so port the hunks onto `develop`'s shapes.

**Commits to read** (from `fix/public-queries`; none is `MIXED`):

| SHA | Subject | Take |
|---|---|---|
| `312177096` | fix(dashboards): skip the dataset column read when a query loads no relation | All of it, ported: the early return goes in `develop`'s `relationLoading.ts` `loadRelationBytes`. Its `RelationLoading.test.ts` cases go in a test beside that file. |
| `8d984fd79` | fix(dashboards): load public snapshot relations without the column catalog | All of it, ported the same way: `datasetColumnSource` on `QueryMediator`, `QetlRunnerOptions`, `queryRunner.ts`, and `loadRelationBytes`, and `stored` in `PublicQuerySession`. |
| `8acb26a6e` | fix(dashboards): publish a renamed dataset's whole slice in query shape | All of it, ported: on `develop`, add `!options.hasColumnReplacements` to the `all_columns` condition in `_getSnapshotDatasetBlob`, and export the replacement rule `develop` keeps private as `_getColumnReplacements` (see Files). Its tests live in the Postgres branch's `DashboardClient.publishSnapshotSources.test.ts`: put them in a new test file under `__tests__/`. |
| `cc6e1281a` | test(dashboards): cover a signed-out visitor reading a public chart's rows | All of it: `tests/e2e/dashboard-public-link-data.spec.ts` (new). Every helper it imports is on `develop`. |
| `fb605d7ad` | test(dashboards): tighten the public query tests | All of it, in the ported test files. |

**Files:**
- Loader: `src/clients/qetl/QueryMediator/relationLoading/RelationLoading.ts`
  and `RelationLoading.test.ts` on `demo/measles`. Both come from the
  Postgres branch (`b72a4d9fb`). On `develop` the code is
  `src/clients/qetl/QueryMediator/relationLoading.ts`.
- Column replacement rule: `relationLoading/getColumnReplacementsFromColumns/getColumnReplacementsFromColumns.ts`
  on `demo/measles` (Postgres branch, `a4180255f`). Its body is identical to
  `develop`'s private `_getColumnReplacements`. Create the file at that same
  path with that same content, so the Postgres branch later adds an identical
  file instead of a conflicting one.
- Mediator: `src/clients/qetl/QueryMediator/{QueryMediator.ts,QueryMediator.types.ts,queryRunner.ts}`
  and `__tests__/relationCacheProjection.test.ts`.
- Public session: `src/clients/qetl/PublicQuerySession/PublicQuerySession.ts`
  and `__tests__/PublicQuerySession.test.ts`.
- Publish: `src/clients/dashboards/DashboardClient/DashboardClient.types.ts`,
  `dashboardSnapshotHelpers/dashboardPublishSnapshots.ts`, and
  `__tests__/DashboardClient.publishSnapshotSources.test.ts` (Postgres branch
  file, see the commit table).
- E2E: `tests/e2e/dashboard-public-link-data.spec.ts` (new).

**Schema:** none.

**Verification:**
```sh
pnpm eslint src/clients/qetl src/clients/dashboards
pnpm tsc -b --force
pnpm vitest run src/clients/qetl src/clients/dashboards
pnpm test:e2e dashboard-public-link-data.spec.ts
pnpm test:e2e dashboard-workspace-publishing.spec.ts
pnpm test:e2e dashboard-private-snapshot-bucket.spec.ts
```

---

## F114: Displace moves geometry-column points, and is refused for lines and polygons

Status: not started. Built on `fix/gis-displace-wkt-points`, branched at
`a46a7fbd8`, merged into `demo/measles` in `c9034a5e3`. The commits are all of
`git log --oneline c9034a5e3^1..c9034a5e3^2`.

**Purpose:** A layer set to Displace whose points come from a WKT, WKB, or
GeoJSON column was drawn at its exact coordinates, because jitter only ran on
the latitude/longitude path. Spatial query results now pass through
`displaceSpatialFeatures`, which moves each point with the same
`jitterCoordinate` seed a latitude/longitude row gets, before the map, popups,
or map tools read them. A Displace layer that draws lines, polygons, or
buffers around points cannot be displaced point by point, so it fails closed
with a `jitterRequiresPoints` `SensitivityViolationError` and the status card
says to pick another handling option. The Sensitivity section disables
Displace, and says why, for a layer that draws lines or polygons straight from
a geometry column.
**Value:** "Displace" now protects every point layer, not only
latitude/longitude ones, and never silently draws exact sensitive geometry.

**PR title:** `fix(gis): displace geometry-column points and refuse Displace for lines and polygons`

**Depends on:** none. The bug is on `develop`: `useMapLayersData.ts`,
`SensitivityViolationError.ts`, `MapErrorStatus.tsx`, and
`SensitivitySection/*` are unchanged there from this branch's base.

**Commits to read** (from `fix/gis-displace-wkt-points`; none is `MIXED`):

| SHA | Subject | Take |
|---|---|---|
| `ad7b8ff31` | fix(gis): displace geometry-column points on jitter-mode layers | All of it. |
| `5e701c785` | fix(gis): disable Displace for line and polygon geometry layers | All of it, except the `.po` catalogs: regenerate them. |

**Files:**
- `src/views/GisApp/layers/displaceSpatialFeatures/displaceSpatialFeatures.{ts,test.ts}`
  (new). Take the file as `ad7b8ff31` and `5e701c785` leave it. F33 and F35
  extend it later (see Files shared by several features).
- `src/views/GisApp/layers/SensitivityViolationError.ts`.
- `src/views/GisApp/layers/useMapLayersData/useMapLayersData.{ts,test.ts}`:
  only the `displaceSpatialFeatures` call in `_runSpatialLayer` and its tests.
- `src/views/GisApp/panels/MapStatusCard/{MapErrorStatus.tsx,MapStatusCard.test.tsx}`.
- `src/views/GisApp/panels/LayerInspector/SensitivitySection/{SensitivityModeSelect.tsx,SensitivitySection.tsx,SensitivitySection.test.tsx}`.
- `src/i18n/locales/*/messages.po`: regenerate with
  `pnpm i18n:extract && pnpm i18n:compile`, never copy.

**Schema:** none.

**Verification:**
```sh
pnpm i18n:extract
pnpm eslint src/views/GisApp
pnpm tsc -b --force
pnpm vitest run src/views/GisApp/layers src/views/GisApp/panels/MapStatusCard src/views/GisApp/panels/LayerInspector/SensitivitySection
```

---

## F115: Bind a geometry column automatically when a dataset has no latitude and longitude columns

Status: not started. Committed directly on `demo/measles` (`d49b604ea`, no
feature branch).

**Purpose:** A new map layer on a dataset with no latitude/longitude columns
waited for the user to choose Geometry by hand. NY immunization surveys store
each point in one location column. The layer now samples candidate columns
(`buildGeometrySampleSql`), classifies each value's encoding (WKT, WKB hex,
GeoJSON) and geometry family (`classifyGeometryValue`), picks a column
(`getGeometryBindingGuessFromColumns`), decides whether to bind it or leave
the choice to the user (`decideMapBindingAction`), and binds it with default
popup columns (`applyDetectedGeometryBinding`). The coordinate guess now
falls through to this geometry guess, and the Geometry binding select shows
the detected encoding.
**Value:** A survey with a location column maps on the first try, with no
manual binding.

**PR title:** `feat(gis): bind a geometry column when a dataset has no latitude and longitude columns`

**Depends on:** none. Every file it edits is unchanged on `develop` since
the branch base, and every import it adds exists there.

**Commits to read** (direct on `demo/measles`; not `MIXED`):

| SHA | Subject | Take |
|---|---|---|
| `d49b604ea` | feat(gis): bind a geometry column when lat/lng columns are absent | All of it. |

**Files:**
- `src/views/GisApp/layers/getGeoBindingGuessFromColumns/` (new):
  `applyDetectedGeometryBinding.ts`, `buildGeometrySampleSql.{ts,test.ts}`,
  `classifyGeometryValue.{ts,test.ts}`, `decideMapBindingAction.{ts,test.ts}`,
  `getGeometryBindingGuessFromColumns.{ts,test.ts}`.
- `src/views/GisApp/panels/LayerInspector/DataSection/`:
  `useGeometryBindingGuess.ts` (new), `useCoordinateBindingGuess.ts`,
  `CoordinateBindingControls.tsx`,
  `GeometryBindingTypeSelect/GeometryBindingTypeSelect.tsx`, and
  `__tests__/{DataSection.coordinates.test.tsx,DataSection.fixtures.tsx,DataSection.mapLayerUpdatesMock.ts}`.

**Schema:** none.

**Verification:**
```sh
pnpm eslint src/views/GisApp
pnpm tsc -b --force
pnpm vitest run src/views/GisApp/layers/getGeoBindingGuessFromColumns src/views/GisApp/panels/LayerInspector/DataSection
pnpm test:e2e gis-geometry-column.spec.ts
pnpm test:e2e gis-geometry-crs.spec.ts
pnpm test:e2e gis-map-layers.spec.ts
```

---

## F116: A layer popup shows every source column by default

Status: not started. Committed directly on `demo/measles` (`8b73410cd`, no
feature branch).

**Purpose:** The default popup selected the source's first twelve columns,
so a clicked feature hid the rest of its row. `withDefaultPopupColumns` now
selects every source column while the popup is still the default, and treats
a saved popup that is exactly the first twelve source columns, in order, as
that old default and widens it too. Any other explicit choice is kept. A
geometry-column layer that is already bound (for example a derived dataset of
the same table) never runs a binding guess, so the Data section's new
`useGeometryPopupColumns` fills its popup the same way when the source
columns load.
**Value:** Clicking a school or a site shows the whole record, not an
arbitrary first twelve fields.

**PR title:** `fix(gis): show every source column in a layer's popup`

**Depends on:** none. The 12-column cap (`DEFAULT_POPUP_COLUMN_LIMIT`) is on
`develop`, and every file this commit edits is unchanged there. Its docstring
mentions "the binding guess", which on `develop` is only the latitude and
longitude guess until F115 lands.

**Commits to read** (direct on `demo/measles`; not `MIXED`):

| SHA | Subject | Take |
|---|---|---|
| `8b73410cd` | fix(gis): show every source column in a geometry layer popup | All of it. |

**Files:**
- `src/views/GisApp/layers/MapLayerUpdates/queryPopupUpdates.ts` and
  `__tests__/MapLayerUpdates.popup.test.ts` (shared with F33).
- `src/views/GisApp/panels/LayerInspector/DataSection/useGeometryPopupColumns.ts`
  (new), `DataSection.tsx`, and `__tests__/DataSection.geometry.test.tsx`
  (shared with F33).

**Schema:** none. A saved popup of exactly the first twelve columns is
widened on edit, not migrated.

**Verification:**
```sh
pnpm eslint src/views/GisApp
pnpm tsc -b --force
pnpm vitest run src/views/GisApp/layers/MapLayerUpdates src/views/GisApp/panels/LayerInspector/DataSection
pnpm test:e2e gis-geometry-column.spec.ts
pnpm test:e2e gis-map-layers.spec.ts
```

---

## F117: Classify a numeric source column that is not in the query yet

Status: not started. Committed directly on `demo/measles` (`8ca35d1cc`, no
feature branch).

**Purpose:** Choosing Graduated (or Categorical) color did nothing when the
layer's query held only its geometry column, because the default measure was
the first numeric query column. The default now comes from
`getNumericLayerColumns`, which lists the query's numeric columns first and
then the rest of the source's numeric columns, and the chosen column is added
to the query (`withQueryColumn`) together with the new color. Graduated
controls gain a Measure select (`GraduatedMeasureSelect`) to switch the
classified field to any numeric source column.
**Value:** A survey layer can be colored by its immunization rate without
first adding that column to the query by hand.

**PR title:** `fix(gis): classify by a numeric source column that is not in the query yet`

**Depends on:** none. The bug is on `develop`:
`ClassificationColorModeSelect.tsx` there reads
`layer.source.queryColumns.find(QueryColumn.isNumeric)`. The commit was
written on top of F31's versions of its files. To land before F31, port onto
`develop`'s files: `_makeGraduatedColor` uses `GRADUATED_RAMPS.blue` from
`GraduatedControls.constants.ts` and has no `classLabels`, `GraduatedControls`
has no `GraduatedClassList`, and the two new tests' fixtures drop
`classLabels`. If F31 lands first, take the final files.

**Commits to read** (direct on `demo/measles`; none is `MIXED` here):

| SHA | Subject | Take |
|---|---|---|
| `8ca35d1cc` | fix(gis): classify a numeric source column that is not in the query yet | All of it. |
| `fcc1a6469` | test: fix type errors in classification and case detail tests | History: the `cd546fdea` merge resolved its `ClassificationEditor.test.tsx` hunk to `32a16aa59`'s version (mapped to F117 and F68 in the coverage checklist). Port the final test hunks, which carry `sensitivity: { mode: "exact" }` and the `(column: QueryColumn.T)` annotations. Its `SingleIndividualView.test.tsx` hunk is F68, also superseded by `32a16aa59`. |

**Files:**
- `src/views/GisApp/panels/LayerInspector/ClassificationEditor/getNumericLayerColumns.ts` (new).
- `ClassificationEditor/GraduatedControls/GraduatedMeasureSelect.tsx` (new).
- `ClassificationEditor/ClassificationColorModeSelect.tsx`,
  `ClassificationEditor/GraduatedControls/GraduatedControls.tsx`, and
  `ClassificationEditor/ClassificationEditor.test.tsx`: only the hunks above
  (shared with F31).
- `src/i18n/locales/*/messages.po` (the `Measure` label): regenerate with
  `pnpm i18n:extract && pnpm i18n:compile`, never copy.

**Schema:** none.

**Verification:**
```sh
pnpm i18n:extract
pnpm eslint src/views/GisApp
pnpm tsc -b --force
pnpm vitest run src/views/GisApp/panels/LayerInspector/ClassificationEditor
pnpm test:e2e gis-point-classification.spec.ts
pnpm test:e2e gis-choropleth-suppression.spec.ts
```

---

## F118: `TruncatedText` fills its parent and shows the full text on hover

Status: not started. Part of `52c823754`, committed directly on
`demo/measles` (no feature branch). That commit is `MIXED`: this feature is
its `packages/web/ui` half.

**Purpose:** `@avandar/ui`'s `TruncatedText` capped itself at 250px and
showed no tooltip unless asked. It now fills its parent's width
(`TruncatedText.module.css`, `min-width: 0`), shows the full text on hover
when the line is clipped (`withFullTextTooltip` defaults to `true`), and takes
an optional `tooltipLabel` that replaces the tooltip and shows even when the
text fits, for a row that explains a state such as "unavailable offline".
`EditableDisplayText` uses it instead of its own `useCheckTruncatedText`
wiring, and `NavLinkList` lets a link's body and label shrink so the ellipsis
applies. The README documents the component.
**Value:** One component for every one-line name that may clip, so the
layer list, data grid titles, catalog list, and sidebar stop each rebuilding
truncation and tooltips.

**PR title:** `feat(ui)!: make TruncatedText fill its parent and show its full text on hover`
(`!` because the `maw` 250 default and the `withFullTextTooltip = false`
default are gone, which changes every existing caller's layout and hover.)

**Depends on:** none. Every `packages/web/ui` file it edits is unchanged on
`develop` since the branch base. On `develop` its callers are `NavLinkList`,
`TruncatedFileInputValue`, and `ChatEmptyState`, which already pass
`maw="100%"` or `withFullTextTooltip` explicitly.

**Commits to read** (direct on `demo/measles`):

| SHA | Subject | Take |
|---|---|---|
| `52c823754` | feat(gis): keep the layer list visible while a layer is open | MIXED: only `packages/web/ui/**` here. The `src/views/GisApp/**` files are F119. `src/lib/ui/viz/{DataGrid.tsx,DataGrid.test.tsx,DataGridColumnTitle/*,makeDataGridColumnDefs/*}` are F121. `DataCatalogListingList.tsx` and `DatasetNavbar.tsx` are F121. |

**Files:**
- `packages/web/ui/src/text/TruncatedText.tsx`,
  `TruncatedText.module.css` (new), `TruncatedText.test.tsx` (new; `27e850068`
  reformats it).
- `packages/web/ui/src/EditableDisplayText/EditableDisplayText.tsx`.
- `packages/web/ui/src/router-links/NavLinkList.tsx` and
  `NavLinkList.module.css` (new).
- `packages/web/ui/README.md`.

**Schema:** none.

**Verification:**
```sh
pnpm test:ui
pnpm --filter @avandar/ui type-check
pnpm eslint packages/web/ui
pnpm tsc -b --force
```

---

## F119: Edit a layer inside the layers panel

Status: not started. Committed directly on `demo/measles`: `4de947922`
(parent `fc48eb670`, no feature branch; `git branch -a --contains` lists only
`demo/measles`, its remote, and branches cut from it later), then
`d1ab6cfea`, `52c823754`, and `34798387c`. `665aebff0`, from
`fix/measles-followups` (merged in `60453be0e`), updates two specs for it.

**Purpose:** The map had two floating panels, the layer list and the layer
inspector. The inspector panel is gone: opening a layer shows its settings
inside the Layers panel, under the list, and the list stays on screen. The
settings header pins the layer's name, as an `h3` that truncates with a
tooltip, next to a Back control that leaves a focused screen
(classification, validation report, match report) or closes the settings.
Adding a layer or a places layer, drawing an annotation, reviewing a filter,
and the map clicks that used to expand the inspector now open the settings
(`useLayerPanelPage`, `openLayerSettings`). A boundary join that matches no
rows opens its match report (`useUnmatchedJoinReport`). Layer and annotation
names in the list truncate through `TruncatedText` with a full-name tooltip.
**Value:** One panel to read and edit layers, and the list never disappears
while a layer is open.

**PR title:** `feat(gis): edit a layer inside the layers panel`

**Depends on:** F118 (`TruncatedText` defaults the rows and title rely on),
F32 (`usePlacesActions`, `gis-places.spec.ts`), F33 (feature list drawer
wiring, `LayerInspectorSections`, `gis-feature-list.spec.ts`), F34
(`gis-export-feature-list.spec.ts`), F31 (`gis-threshold-colors.spec.ts`), and
F35 (both edit `GisAppMapShell.tsx`, and `dashboard-map-block.spec.ts` needs
the same region update; see Verification).

**Commits to read** (direct on `demo/measles`, plus `665aebff0`):

| SHA | Subject | Take |
|---|---|---|
| `4de947922` | feat(gis): edit a layer from the layers panel | All of it, except the `.po` catalogs: regenerate them. History in part: `52c823754` moves the settings under the list instead of replacing it. Port the final files. |
| `d1ab6cfea` | fix(gis): type the layer panel test render helper as RenderResult | All of it. |
| `665aebff0` | test(gis): follow the layers panel's settings page in the places and layers specs | All of it. |
| `52c823754` | feat(gis): keep the layer list visible while a layer is open | MIXED: only `src/views/GisApp/**` here. `packages/web/ui/**` is F118. The data grid, catalog list, and dataset navbar files go to their own features (see F118). |
| `34798387c` | fix(gis): render the layer settings title in a real h3 | All of it. |

**Files:**
- Layers panel: `src/views/GisApp/panels/LayerPanel/` with
  `LayerSettingsPanel.{tsx,module.css}`, `LayerEditorFrame.tsx`,
  `layerPanelNavigation.{ts,test.ts}`, `useLayerPanelPage.ts`, and
  `useUnmatchedJoinReport.{ts,test.tsx}` (all new), plus `LayerPanel.tsx`,
  `LayerPanel.module.css`, `LayerActionsMenu/LayerActionsMenu.tsx`,
  `LayerRow/LayerVisibilityButton.tsx`,
  `LayerRow/LayerRowSelection/LayerRowSelection.tsx`, and
  `AnnotationLayerRow/AnnotationLayerRow.tsx`.
- `src/views/GisApp/GisAppLayerPanel.tsx`, `GisAppLayerPanel.test.tsx` (new;
  `27e850068` reformats it), `GisAppLayerInspector/GisAppLayerInspector.tsx`
  (deleted), `GisAppLayerInspector/AnnotationInspectorPanel.tsx`, and the
  `inspector` slot removal in `GisAppMapShell.tsx`.
- Inspector body: `panels/LayerInspector/LayerInspector.{tsx,test.tsx}` and
  `LayerInspectorBody/{LayerInspectorBody.module.css,LayerInspectorSections.tsx}`.
- Shell: `shell/MapChromePanel/{MapChromePanel.tsx,MapChromePanel.module.css,MapChromePanelHeader.tsx}`
  and `shell/MapShell/{MapShell.tsx,MapShell.module.css,MapShellChrome.tsx}`.
- State: `useGisApp/{useGisAppState.ts,useGisAppMapCallbacks.ts,useGisApp.test.ts}`,
  `useGisAppLayerActions.tsx`, `useGisAppLayerDeletion.test.ts`, and the
  `openLayerSettings` line in `places/usePlacesActions.{ts,test.tsx}`.
- E2E: `tests/e2e/gis-{annotations,aoi-filter,boundary-join,buffer-layer,choropleth-suppression,cluster,coordinate-validation,disputed-boundaries,export-feature-list,export-pdf,feature-list,geometry-column,geometry-crs,goto,grid-bin-suppression,heatmap,map-layers,places,point-classification,threshold-colors,time-range}.spec.ts`.
- `src/i18n/locales/*/messages.po`: regenerate with
  `pnpm i18n:extract && pnpm i18n:compile`, never copy.

**Schema:** none.

**Verification:** run each spec on its own. Expect to fix the specs first:
after `52c823754` the open layer's settings are no longer a region of their
own, but the specs `4de947922` updated look them up with
`getByRole("region", { name: <layer name>, exact: true })`, and
`dashboard-map-block.spec.ts` (F35) still looks for the old
`getByRole("region", { name: "Layer" })`. No commit on `demo/measles` updates
them after `52c823754`.
```sh
pnpm i18n:extract
pnpm eslint src/views/GisApp
pnpm lint:css
pnpm tsc -b --force
pnpm vitest run src/views/GisApp
pnpm test:e2e gis-map-layers.spec.ts
pnpm test:e2e gis-places.spec.ts
pnpm test:e2e gis-annotations.spec.ts
pnpm test:e2e gis-aoi-filter.spec.ts
pnpm test:e2e gis-boundary-join.spec.ts
pnpm test:e2e gis-feature-list.spec.ts
pnpm test:e2e dashboard-map-block.spec.ts
```

---

## F120: Drop the import page's header band

Status: not started. Committed directly to `demo/measles` as `a45381954`,
with no branch. `develop` still shows the header band.

**Purpose:** The Import data page opened with a header band: the "Import
data" title and the sentence "Upload a file, connect an external source, or
browse the open data catalog.", which restated the Upload, Connectors, and
Open data tabs right below it and pushed every import flow down the page.
The band is gone, so the tabs are the first thing in the view. The page
keeps "Import data" as a visually hidden `h1`, so screen readers still get a
page title.
**Value:** More of each import flow is on screen, and the page keeps its
accessible name.

**PR title:** `feat(data-import): drop the import page's header band`

**Depends on:** none. F19's tab spacing addendum (`4c7c9d760`) assumes this
has merged.

**Commits to read** (direct on `demo/measles`):

| SHA | Subject | Take |
|---|---|---|
| `a45381954` | feat(data-import): drop the import page's header band | `DataImportView.tsx` only. Its `.po` hunks just drop the removed sentence: regenerate the catalogs. |

**Files:**
- `src/views/DataManagerApp/DataImportView/DataImportView.tsx`: remove
  `AppViewHeader` and its import, use `Trans` without `useLingui`, and add
  `<VisuallyHidden component="h1">`. Keep `develop`'s own import of
  `DataImportTabs` (the older `DataImportView/DataImportTabs.tsx` path) if
  F19 has not merged.

**Schema:** none.

**Verification:**
```sh
pnpm i18n:extract && pnpm i18n:compile
pnpm vitest run src/views/DataManagerApp/DataImportView
pnpm test:e2e csv-import.spec.ts
```
Then open Import data: the tabs sit at the top of the view, and a screen
reader lists an "Import data" heading.

---

## F121: Show the full text of a truncated dataset name or grid column title

Status: not started. `5517ffb21` was committed directly to `demo/measles`.
`899d290e8` was built on `feat/column-title-tooltip` and merged in
`0cd5ba996`. `52c823754` (direct, split across F118, F119, and this feature) then moved
both onto a reworked `TruncatedText`, and
`27e850068` formatted two of its files. `develop` has none of it.

**Purpose:** A long dataset name in the Data Sources sidebar ended in an
ellipsis that could only be read by opening the dataset, and a data grid
column title clipped by its width could not be read at all. Hovering a
clipped name now shows it in full. The sidebar's `DatasetNavbarName` and the
grid's new `DataGridColumnTitle` (an AG Grid `innerHeaderComponent`, so
sort, filter, and resize stay on the grid's own header) both render
`@avandar/ui`'s `TruncatedText`, which shows its tooltip only while the text
is clipped. An offline dataset keeps its "not available offline" tooltip
through `TruncatedText`'s new `tooltipLabel`, which shows even when the name
fits. The `TruncatedText` behavior they rely on (filling its parent, the default
full-text tooltip, and `tooltipLabel`) is F118.
**Value:** Long names, which open data has plenty of, can be read where
they are listed.

**PR title:** `feat(ui): show the full text when a dataset name or column title is truncated`

**Depends on:** F118 (the `TruncatedText` it renders). The `makeDataGridColumnDefs` hunks need F22 (BUG-003
creates that file): if F22 has not merged, leave them for F22. The
`DataCatalogListingList.tsx` hunk needs F23's `9987ef9da` addendum: if F23
has not merged, leave it for F23.

**Commits to read** (`52c823754` and `27e850068` are `MIXED`):

| SHA | Subject | Take |
|---|---|---|
| `5517ffb21` | feat(data-sources): show the full dataset name when the sidebar label is truncated | All of it (`DatasetNavbar.tsx`, `DatasetNavbar.module.css`, and the new `DatasetNavbar.test.tsx`), then `52c823754`'s rewrite of `DatasetNavbarName` on top. |
| `899d290e8` | feat(data-grid): show the full title when a column header is truncated | History: `52c823754` replaced its grid tooltip (`headerTooltip`, `tooltipShowMode`, `tooltipShowDelay`) with `DataGridColumnTitle`. Port the final `DataGrid.tsx` hunk and the new `DataGrid.test.tsx`, not this commit. |
| `52c823754` | feat(gis): keep the layer list visible while a layer is open | MIXED. Only `src/lib/ui/viz/DataGrid.{tsx,test.tsx}`, `src/lib/ui/viz/DataGridColumnTitle/`, `src/lib/ui/viz/makeDataGridColumnDefs/makeDataGridColumnDefs.{ts,test.ts}`, `src/views/DataManagerApp/DatasetNavbar/DatasetNavbar.tsx`, and `DataCatalogListingList.tsx` (see Depends on). `packages/web/ui/**` is F118, and everything under `src/views/GisApp/` is F119. |
| `27e850068` | lints and formats | MIXED (formatting only): `src/lib/ui/viz/DataGridColumnTitle/DataGridColumnTitle.tsx` here. `packages/web/ui/src/text/TruncatedText.test.tsx` is F118, and `src/views/GisApp/GisAppLayerPanel.test.tsx` is F119. |

**Files:**
- `src/views/DataManagerApp/DatasetNavbar/DatasetNavbar.tsx`,
  `DatasetNavbar.module.css`, `DatasetNavbar.test.tsx` (new).
- `src/lib/ui/viz/DataGrid.tsx` (the `defaultColDef.headerComponentParams`
  and the docstring. Apply them to `develop`'s inline column defs if F22 has
  not merged), `DataGrid.test.tsx` (new), and
  `src/lib/ui/viz/DataGridColumnTitle/DataGridColumnTitle.{tsx,module.css}`
  (new).
- `src/lib/ui/viz/makeDataGridColumnDefs/makeDataGridColumnDefs.ts` (one
  docstring sentence) and its test (the renamed first case), only once F22
  is in.

**Schema:** none.

**Verification:**
```sh
pnpm vitest run src/views/DataManagerApp/DatasetNavbar src/lib/ui/viz
pnpm exec tsc -b --force
```
Then hover a long name in the Data Sources list and a clipped column title
in a dataset preview: each shows the full text, and a name that fits shows
no tooltip.

---

## F122: Add a dataset from a pasted file link

Status: not started. Built on `feat/dataset-from-url` (`ab762459c`, merged
in `c41ad886c`), then `fix/lint-before-push` (`40ff4ed9b`, merged in
`fd88bbd6a`) and `fix/file-url-types` (`fca0202f7`, merged in `959281871`).
`develop` has no `file-url` function and no `shared/fileUrl/`.

**Purpose:** On the Upload tab a user can paste a public link instead of
dropping a file. The new `file-url` edge function (`POST /acquire`, signed-in
callers only) downloads it: private and link-local hosts are refused before
any connection opens, every redirect is checked again, and a body past
128 MB is refused before it is buffered. GitHub file pages, Google Drive and
Sheets links, Dropbox share links, and Socrata and CKAN dataset pages are
resolved to their download URLs. The browser sniffs the returned bytes and
shows the same review form a dropped file gets. A ZIP, gzip, or tar archive,
or a portal page with more than one data file, asks which one to import and
then continues as a single file. The link is not stored, and a refresh does
not fetch it again.
**Value:** Data that lives at a URL (a GitHub CSV, a shared Drive sheet, a
portal download) can be imported without saving it to disk first.

**PR title:** `feat(import): add a dataset from a pasted file link`

**Depends on:** the Postgres branch, for
`supabase/functions/_shared/validateHostNotPrivate.ts` (the host guard) and
`src/clients/fetchEdgeFunctionRoute/` (which this extends with `method`,
`body`, and `headers`). Its `DataImportView/AGENTS.md` paragraph sits after
F24's sentence, but stands on its own.

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `ab762459c` | feat(import): add a dataset from a pasted file link | All of it. Regenerate the `.po` catalogs. The lockfile hunk adds `fflate@0.8.3` to the root `package.json`: re-add it with `pnpm add fflate@0.8.3`, then restore `pnpm-workspace.yaml`, which `pnpm add` rewrites. |
| `40ff4ed9b` | chore(lint): format and fix lint in the pasted file link import | All of it: formatting and lint fixes on the files above. |
| `fca0202f7` | fix(import): type the pasted file link bytes and loader result for the build | All of it. |
| `21f372b78` | updated translations | Regenerate. Its one `LayerInspector` and one `MapStatusCard` entry are F113 to F119. |

**Files:**
- `shared/fileUrl/**` (new): `PastedFileUrl.ts` (`FILE_URL_MAX_BYTES`),
  `AcquiredPastedFile.ts`, `PrivateFileHostError.ts`, `acquirePastedFile/`,
  `acquiredFileResponse.ts`, `ckanImportResources.ts`,
  `classifyDownloadedBytes.ts`, `contentDispositionFileName.ts`,
  `fetchPublicBytes.ts`, `importableMediaType.ts`, `readArchive/`, and
  `resolvePastedFileUrl/`, with their tests.
- `supabase/functions/file-url/` (new: `index.ts`, `FileUrlRoutes.ts`,
  `FileUrlRoutes.types.ts`, `deno.json`) and its `[functions.file-url]`
  block in `supabase/config.toml`. Per `AGENTS.md`, run
  `ava supabase switch` before editing `config.toml`.
- `src/clients/fileUrl/requestFileFromUrl.ts` (new) and the
  `fetchEdgeFunctionRoute.ts` options.
- `src/views/DataManagerApp/DataImportView/ManualUploadView/`:
  `FileUrlField/`, `FileUrlChoice/`, `useFileUrlImport/`,
  `fileUrlErrorMessage.ts` (new), and the hunks in `ManualUploadView.tsx`,
  `ManualUploadView.test.tsx`, `UploadedFileBar/UploadedFileBar.tsx`,
  `useLoadManualUploadFile/useLoadManualUploadFile.ts`
  (`clearLoadedFile`), and `useManualUploadParse/useManualUploadParse.ts`
  (`clearParsedFile`).
- `src/views/DataManagerApp/DataImportView/AGENTS.md`: the pasted link
  paragraph.
- `package.json`: `fflate`.

**Schema:** none. One new edge function, deployed by the existing
`supabase functions deploy` steps.

**Verification:**
```sh
pnpm vitest run shared/fileUrl src/views/DataManagerApp/DataImportView/ManualUploadView
pnpm exec tsc -b --force
pnpm type-check:deno
pnpm i18n:extract && pnpm i18n:compile
```
Then, with `pnpm fns:serve` running, paste a GitHub CSV file page, a public
Drive sheet, and a ZIP holding two CSVs on the Upload tab: the first two
open the review form, the ZIP asks which file to import, and
`http://127.0.0.1/...` is refused.

---

## F123: Hide the Data Explorer's form approximation badge while the drawer is collapsed

Status: not started. Committed directly to `demo/measles` as `15410276a`.
The bug is on `develop`: its `DataExplorerDrawerRail.tsx` renders the badge
whenever the SQL is out of sync, collapsed or not, and its test asserts that.

**Purpose:** When the SQL could not be represented in the manual query form,
the Data Explorer drawer's rail showed a "form is an approximation" badge
even while the drawer was collapsed, with no tab open for it to describe.
The badge now hides with the tab-scoped control while the drawer is shut,
and returns on either tab once it opens.
**Value:** A collapsed drawer shows only its toggle.

**PR title:** `fix(data-explorer): hide the form approximation badge while the drawer is collapsed`

**Depends on:** none.

**Commits to read** (direct on `demo/measles`):

| SHA | Subject | Take |
|---|---|---|
| `15410276a` | fix(data-explorer): hide the form approximation badge while the drawer is collapsed | All of it. |

**Files:**
`src/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawerRail/DataExplorerDrawerRail.tsx`
and `DataExplorerDrawerRail.test.tsx`.

**Schema:** none.

**Verification:**
```sh
pnpm vitest run src/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawerRail
pnpm test:e2e data-explorer-query-drawer.spec.ts
```

---

## F124: Exclude built `dist` folders from the Deno type check

Status: not started. Committed directly to `demo/measles` as `3ddcf3949`.
The bug is on `develop`: `pnpm type-check:deno` runs
`deno check shared supabase/functions packages/shared`, and `develop`'s
`deno.json` has no `exclude`.

**Purpose:** `deno check` walks `packages/shared`, so after any package
build it also checked the emitted `dist/*.d.ts` and `dist/*.js`. Chunked
declaration output refers to hashed files with no matching declaration, so
the check failed with TS2307 and TS2305. `deno.json` now excludes
`packages/**/dist/`.
**Value:** `pnpm type-check` passes after `pnpm build:packages`.

**PR title:** `fix(build): exclude built dist folders from the Deno type check`

**Depends on:** none.

**Commits to read** (direct on `demo/measles`):

| SHA | Subject | Take |
|---|---|---|
| `3ddcf3949` | fix(build): exclude built dist folders from the Deno type check | All of it. |

**Files:** `deno.json`.

**Schema:** none.

**Verification:**
```sh
pnpm build:packages && pnpm type-check:deno
```

---

## F125: Resolve the video adapter's imports when ESLint lints a batch

Status: not started. Committed directly to `demo/measles` as `776f94b11`.
The bug is on `develop`: it has the same adapter, producer test, and
resolver project list.

**Purpose:** The pre-push hook lints every changed file in one ESLint run.
Linting a producer test first caches `apps/ava-video-producer`'s tsconfig,
which maps no `@/`, and the import resolver then reuses it for
`apps/ava-video-producer/avandar-adapter/`, so every `@/` and `$/` import
there reads as unresolved. The adapter gets its own tsconfig, extending
`tsconfig.app.json`, listed in the resolver's projects ahead of the
producer's. A test lints a producer test and then an adapter screen in one
process.
**Value:** A push that touches the video producer and its adapter no longer
fails lint on imports that resolve.

**PR title:** `fix(eslint): resolve video adapter imports during batch lint`

**Depends on:** none.

**Commits to read** (direct on `demo/measles`):

| SHA | Subject | Take |
|---|---|---|
| `776f94b11` | fix(eslint): resolve video adapter imports during batch lint | All of it. |

**Files:** `apps/ava-video-producer/avandar-adapter/tsconfig.json` (new),
`eslint.config.js` (one `project` entry), and
`eslint/adapter-import-resolution.test.js` (new).

**Schema:** none.

**Verification:**
```sh
pnpm exec vitest run eslint/adapter-import-resolution.test.js
pnpm exec eslint apps/ava-video-producer/tests/avandar-scenes.test.ts apps/ava-video-producer/avandar-adapter/ExplorerScreen/ExplorerScreen.tsx
```

---

## F126: Per-branch local Supabase through `.env.development` overrides

Status: PR open: [#320](https://github.com/AvandarLabs/avandar/pull/320),
branch `refactor/sb-switch-env`, head `72ae3d7e0`. That head is exactly what
`15ba9b8f9` merged into `demo/measles`: every commit below except the last
two is in the PR, and `git diff 72ae3d7e0 34798387c` over the PR's files
shows only other features' hunks (F15's `--env`, F96 to F112' `ava plugin`,
the `ava supabase sql` command). Left to land, in this order:
1. Merge `develop` into the PR. `AGENTS.md` conflicts with `develop`'s
   `183a41c50` (Merge docs/switch-rule), which rewrote the same Supabase
   section for the `config.toml` era. Resolve it to `demo/measles`'s
   Supabase section at `34798387c`, which is `develop`'s rule reworded for
   env-based switching by `934f97657`: keep "Switch only when the branch
   changes what the local stack is built from" and its list, say
   `ava supabase status` "advises `ava supabase switch`" (not "reads
   yellow"), keep step 2's "This is the develop local Supabase" wording,
   replace the hand-edit warning with "never change the project id or ports
   in `supabase/config.toml` ... and never edit the `ava supabase switch`
   block in `.env.development`", drop the "A switch rewrites
   `supabase/config.toml`" paragraph and the two restore-before-merge
   bullets, and add `--branch <name>` and "Leave the switch in place". The
   other `AGENTS.md` lines `demo/measles` has (case activity, gadgets,
   plugin authoring, Copy and nomenclature) belong to F18, F21, F96 to F112,
   and the Postgres branch.
2. `packages/shared/utils/src/types/Empty/Empty.ts` also conflicts:
   `develop`'s #315 (`9a8b24233`) already wrapped that docstring within 80
   columns, so take `develop`'s version and drop `48ad53a7b`'s.
3. Add `9aa783706` to the PR: the `PsqlUtils` tests read the developer's
   switch from the real environment once this PR's `PsqlUtils.ts` prefers
   `SUPABASE_PROJECT_ID` and `SUPABASE_DB_PORT`. The bug only exists with
   this PR, not on `develop`.

**Purpose:** `ava supabase switch` moves a worktree onto its own local
Supabase project by writing override variables into `.env.development`, so
`supabase/config.toml` never changes and nothing needs restoring before a
commit or merge. Child `supabase` processes ignore overrides inherited from
another worktree. New `ava supabase start` and `stop` run a branch's
project, `prune` deletes projects whose branch or worktree is gone (never a
live branch's), and `switch remote` points a worktree's app at a hosted
project while `require-local-supabase.sh` makes `pnpm test:db`,
`db:reset`, `db:seed`, and the other database scripts refuse to run.
`ava supabase status` and the new commands share terminal styling,
`--help` screens that refuse unknown flags, a `--branch` option, and a
keyboard menu. The git hooks and `validate-standard-local-config.sh` check
the env-based switch instead of a rewritten `config.toml`.
**Value:** Several worktrees can each run their own stack without a
tracked file changing, and stale stacks can be found and removed.

**PR title:** `refactor: Local supabase switching should use env vars instead of config.toml`
(the open PR's title, which passes `lint-pr-title`).

**Depends on:** none. Overlaps F15 (#319) in `apps/ava-cli/src/main.ts`
and `apps/ava-cli/README.md`: whichever lands second resolves, keeping
F15's `--env` global option and this PR's `CommandHelp.handleArgv` call.

**Commits to read** (all of `refactor/sb-switch-env`, merged in
`15ba9b8f9`. The branch's `develop` merge `85d5a2b70` carries no changes of
its own):

| SHA | Subject | Take |
|---|---|---|
| `d7bccdc7a` | refactor(ava-cli): switch Supabase projects through .env.development overrides | All of it (in PR #320). |
| `53e3a96bd` | feat(ava-cli): add supabase start, stop, prune, and switch remote | All of it (in PR #320). |
| `9df3ac671` | docs(ava-cli): document the per-branch Supabase commands | All of it (in PR #320). |
| `9392f7933` | docs: align agent Supabase rules with env-based switching | In PR #320. Its `AGENTS.md` hunk is superseded: resolve to `demo/measles`'s section (step 1 above). |
| `c59fc2a69` | fix(ava-cli): keep a live branch's project out of prune and fit menu lines | All of it (in PR #320). |
| `85622bec6` | fix(ava-cli): harden prune, remote switches, and legacy restores | All of it (in PR #320). |
| `ee44640c5` | docs(ava-cli): describe prune's selection accurately | All of it (in PR #320). |
| `9673272e6` | refactor(ava-cli): apply the avandar-code-review findings | All of it (in PR #320). |
| `48ad53a7b` | chore(utils): wrap empty-guard docstrings to 80 columns | In PR #320, but redundant now: take `develop`'s `Empty.ts` (step 2 above). |
| `72ae3d7e0` | refactor(ava-cli): apply code review fixes to the Supabase switch CLI | All of it (in PR #320). |
| `9aa783706` | fix(scripts): stop PsqlUtils tests reading the developer's Supabase switch | All of it. Not in PR #320 yet (`fix/psql-test-env`, merged in `17d72d6e4`). |
| `934f97657` | docs(agents): switch local Supabase only for instance-changing work | Nothing as a commit: its result is the `AGENTS.md` resolution in step 1 (`docs/switch-rule-measles`, merged in `6089af0ff`). |

**Files:** as PR #320 lists them:
- `apps/ava-cli/src/SupabaseCli/`: `SupabaseBranchTarget.ts`,
  `SupabaseCli.ts`, `SupabaseLifecycleCli.ts`, `SupabaseRestoreCli.ts`,
  `SupabaseStatusCli.ts`, `SupabaseSwitchCli/` (with
  `SupabaseSwitchRemoteCli.ts` and `runSupabaseSwitch/`),
  `SupabaseTargetHeadline/`, `SupabasePruneCli/` (`DockerInventory/`,
  `PruneCandidateText/`, `PruneDeletion.ts`, `PrunePlanReader.ts`,
  `PruneSelection/`, `SupabasePrunePlan/`), and under
  `SupabaseLocalEnvironment/`: `BranchWorktrees/`, `ExistingSwitch/`,
  `SupabaseBackupStore.ts`, `SupabaseCommandOutput/`, `SupabaseConfig/`,
  `SupabaseConfigOverrides/` (new), `SupabaseLocalEnvironment.{ts,types.ts,constants.ts}`
  and its `.restore`, `.restoreManifest`, `.restoreRecovery`, `.switch`,
  `.switchEnvironment`, `.switchRemote`, `.switchRollback`, and
  `.switchSeed` tests, `SupabaseLocalEnvironmentFixtures.ts`,
  `SupabaseProjectPaths.ts`, `SupabaseRemoteSwitch/`,
  `SupabaseRestorePreparation.ts`, `SupabaseStatus/` (with `__tests__/`),
  `SupabaseSwitchPreparation.ts`, `SupabaseSwitchState.ts`, and
  `createSupabaseLocalEnvironmentIo/`.
- `apps/ava-cli/src/utils/{CliTheme,CommandHelp,TerminalMenu}/` (new),
  `apps/ava-cli/src/main.ts`, `apps/ava-cli/README.md`.
- `.githooks/{pre-commit,pre-merge-commit,pre-push}`.
- `scripts/db/utils/PsqlUtils/PsqlUtils.{ts,test.ts}`,
  `scripts/seedDatabaseScript.ts`,
  `scripts/supabase/require-local-supabase/` (new),
  `scripts/supabase/validate-standard-local-config/` (moved into its own
  folder), and the `package.json` scripts that call them.
- `AGENTS.md` (the Supabase section), `docs/ontology-architecture.md` (one
  line), and `packages/shared/utils/src/{guards/isNotEmpty/isNotEmpty.ts,types/Empty/Empty.ts}`
  (take `develop`'s).

**Schema:** none.

**Verification:**
```sh
pnpm test:ava-cli
pnpm exec vitest run scripts/db/utils/PsqlUtils scripts/supabase
pnpm build:ava-cli
ava supabase status
ava supabase switch --help    # prints help and exits
ava supabase prune --bogus    # refused as an unknown flag
```
Then, in a throwaway worktree, run `ava supabase switch`: `git status`
shows no tracked change, `.env.development` holds the switch block, and
`ava supabase status` names the branch's project.

---

## F127: E2E stability fixes

Status: PR open: [#321](https://github.com/AvandarLabs/avandar/pull/321),
branch `fix/e2e-stability`, head `d45e26490`. `demo/measles` merged the
branch in `29d38e6a4` at `b4622f582`, so the PR holds every commit below
plus one more, `d45e26490` (refactor: apply code review fixes to hydrated
updateConfig and utils docs), which `demo/measles` never got: it names the
hydration input shape `HydrationInputs` and the configs `hydratedConfig` and
`updatedConfig`, and rewraps the `@avandar/utils` empty-guard docstrings.
Nothing on `demo/measles` from this branch is missing from the PR. Left to
land: merge `develop` into the PR, taking `develop`'s `Empty.ts` (its #315
already rewrapped that docstring), and merge it. The bugs are on `develop`
(the drawing one is a regression from #304).

**Purpose:** `useHydratedMapSources` returned a new `updateConfig` on every
render, so a re-render mid-gesture (a pointer move updating the coordinate
readout) detached and re-attached the map tools and dropped an
in-progress area or polygon: area annotations and AOI filters could not be
drawn. `updateConfig` is now one stable callback that reads the latest
hydration inputs from a ref. The job progress panel stayed on screen at
100% after a job finished, because its store kept the same snapshot. The
store now carries a version that changes on every update. E2E page loads no
longer wait on the Featurebase SDK, which a fixture stubs. The e2e CI jobs
run on `ubuntu-24.04`, where Playwright can install Chromium, and
production's e2e job gets the same 70-minute budget as staging and PR
checks.
**Value:** Drawing on maps works again, and the e2e suite stops failing
for reasons unrelated to the code under test.

**PR title:** `fix: E2E stability fixes` (the open PR's title).

**Depends on:** none. F35's `aad4d700d` later moves the config hydration
into `useHydratedMapConfig.ts`: when F35 ports it after this PR, keep
`d45e26490`'s names.

**Commits to read** (all of `fix/e2e-stability`, merged in `29d38e6a4`. Its
`develop` merge `66dce6a28` carries no changes of its own):

| SHA | Subject | Take |
|---|---|---|
| `6bb05b9a9` | fix(gis): keep hydrated updateConfig stable so area drawing survives re-renders | All of it (in PR #321). |
| `38fadfcc4` | fix: re-render the job progress panel when a job changes | All of it (in PR #321). |
| `80a95aec1` | test(e2e): stub the Featurebase SDK so page loads never wait on it | All of it (in PR #321). |
| `b6f55cc47` | refactor: apply code review fixes for e2e stability | All of it (in PR #321). |
| `b4622f582` | fix(ci): pin e2e runners to ubuntu-24.04 and give production e2e the full suite budget | All of it (in PR #321). |

**Files:** `src/views/GisApp/useGisApp/MapSourceHydration/useHydratedMapSources/useHydratedMapSources.{ts,test.tsx}`,
`src/components/JobProgressPanel/JobProgressPanel.{tsx,test.tsx}`,
`src/lib/utils/state/JobProgressStore/JobProgressStore.ts`,
`tests/e2e/fixtures/e2e.fixture.ts`, `tests/e2e/setup/stubFeaturebaseSdk.ts`
(new), and `.github/workflows/{pr-develop,production,staging}.yaml`.

**Schema:** none.

**Verification:**
```sh
pnpm vitest run src/components/JobProgressPanel src/views/GisApp/useGisApp/MapSourceHydration
pnpm test:e2e gis-aoi-filter.spec.ts
pnpm test:e2e gis-annotations.spec.ts
```
Then confirm PR #321's e2e jobs run on `ubuntu-24.04`.

---

## F128: Multiple chats, a closed-chat archive, and session titles

Status: not started. Built on `feat/agent-sessions`, merged into
`demo/measles` on 2026-11-11 (`git log --merges --grep agent-sessions
demo/measles` finds the merge). `develop` has none of it and no PR is open.
This is Phase 1C of the agent roadmap (decision D43).

**Purpose:** The chat panel keeps several chats per workspace and user.
Up to three open chats show as tabs, the rest in an overflow list, and a
closed chat goes to an archive of 50 in this browser, where it can be
reopened or deleted. One localStorage index
(`ava.chat.sessions.{workspaceId}.{userId}`) holds the selected id, the
open ids in display order, the archived ids newest first, and each
session's kind (`data` or `case-design`) and title. Each session keeps its
own thread and context tray, under the old keys plus the session id. On
first load the pre-session thread and tray become the first session, and
the old keys are cleared only after every new write succeeds. New chat adds
an empty data session without changing the panel's layout. New case type,
from the navbar or the Case Manager home card, adds a case-design session,
selects it, expands the panel, and starts the kickoff run once. The
composer follows the selected session's kind, and a case-design turn sends
the case manager page context from any page. After a session's first
stored assistant reply, while its title is still a placeholder, the app
asks the new `chat/:workspaceId/title/:promptId` route (`chat-title-v1`,
Claude Haiku 5.5) for a title from a redacted excerpt. The route requires a
workspace membership but no Data Explorer role. Offline answers are titled
on the device.
**Value:** A person can keep separate threads for separate questions, and
starting a case type no longer wipes the chat they were in.

**Design:** `docs/ai-agent/specs/phase-1c.md` and D43 in
`docs/ai-agent/decisions.md`. The task plan is `docs/ai-agent/plans/phase-1c.md`
(see Open decisions).

**PR title:** `feat(ai-agent): keep several chats and an archive of closed chats`

**Depends on:** F91 (`ChatContextTrayStore`, `ChatPanelStateManager`, and
the tray that becomes per session), F89 and F90 (the redaction and mention
tokens the title excerpt masks), F81 to F85 and F86 and F87 (the agent
turn, offline turn, and adapter that request titles), F94 (the panel header
and the expand and dock layout the tabs sit in), and F57 (`NewCaseTypeButton`
and the Case Manager home).

**Commits to read** (all of `feat/agent-sessions`; `ab02f9641` and
`b503e1762` are MIXED, `c40ebd3b3` carries the translations):

| SHA | Subject | Take |
|---|---|---|
| `c7b6361c3` | docs(ai-agent): spec multiple chat sessions | All of it. |
| `5046a6245` | feat(chat): add the session index | All of it. |
| `e7b1a271f` | fix(chat): keep visible session order on select | All of it. |
| `a7a3fea55` | feat(chat): store each thread under a session id | All of it. |
| `77a2d0079` | feat(chat): store each context tray under a session id | All of it. |
| `e8f40371c` | fix(chat): return true when a tray write has no identity | All of it. |
| `d097c1428` | feat(chat): migrate today's chat into the first session | All of it. |
| `ec0ba39fa` | fix(chat): retry failed session migration | All of it. |
| `f3e9970ac` | feat(chat): keep the open session in the chat provider | All of it. |
| `12de35a3e` | feat(chat): switch the open thread when the session changes | All of it. |
| `5dd397580` | fix(chat): preserve pending cards when switching sessions | All of it. |
| `4a57ac447` | feat(chat): pick the composer from the session kind | All of it. |
| `1610d30e6` | feat(chat): show open sessions and the archive | All of it. |
| `62a813f82` | fix(chat): avoid nested archive controls | All of it. |
| `a660bfa3f` | feat(chat): build a redacted excerpt for session titles | All of it. |
| `19911de3f` | fix(chat): redact assistant mention tokens in title excerpts | All of it. |
| `0fa1c05f1` | feat(chat): serve the chat-title-v1 prompt | All of it. |
| `84ef1e615` | fix(chat): require title workspace membership | All of it. |
| `2cadf0fad` | feat(chat): name a session after its first reply | All of it. |
| `775a28b92` | fix(chat): title hosted and offline replies | All of it. |
| `21778456f` | test(chat): cover session tabs and the archive in the browser | All of it. |
| `8b9f5970b` | test(chat): assert session navigation reaches data explorer | All of it. |
| `ab02f9641` | fix(chat): clear session typecheck errors | MIXED: the four `ChatPanel` files go here. The `src/views/GisApp/GisAppLayerPanel.test.tsx` return type is F119's, and `demo/measles` already had the same fix. |
| `c40ebd3b3` | docs(ai-agent): mark multiple chat sessions built | The roadmap's 1C row. Regenerate the catalogs. |
| `5d49c7760` | fix(chat): keep the selected chat when a background tab closes | All of it. |
| `ddd22a0b7` | fix(chat): mount chat sessions on pages outside a workspace | All of it. |
| `8bc905e0d` | fix(chat): detect the workspace route by its slug param | All of it. |
| `d70c09fba` | fix(chat): start the case-design kickoff run for a new session | All of it. |
| `a960b44c3` | fix(chat): start a case-design session from the New case type card | All of it. |
| `0186ff705` | fix(chat): send case-design turns the case manager context | All of it. |
| `bdc692ce0` | docs(ai-agent): hand off the unfinished Phase 1C work | Branch-only. `908e2f911` deletes the handoff and its README row. |
| `62a4e3db1` | test(chat): count only chat turn posts after Try again | All of it. |
| `125fd3f05` | test(chat): read the selected session's thread key in the harness | All of it. |
| `b503e1762` | test(cases): dock chat and open the record in the list field spec | MIXED: the Dock-by-Enter hunk goes here, since F94's expanded panel covers the overlay's click point. The record-link hunk goes with F74, because F66's assignee line made `/Alameda$/` miss. Whichever of F74 and F128 lands second takes both. |
| `83439ad65` | docs(ai-agent): record the fixed Phase 1C test failures | Branch-only. |
| `7f0c4a2f6` | docs(ai-agent): name demo/measles as the Phase 1C target | Branch-only. |
| `908e2f911` | docs(ai-agent): remove the Phase 1C handoff | Only the `specs/phase-1c.md` status line. |

**Files:**
- Session model and storage (new): `src/components/ChatPanel/ChatSessionIndex/ChatSessionIndex.{ts,test.ts}`,
  `ChatSessionStore/ChatSessionStore.{ts,test.ts}`, and the session-id keys in
  `ChatThreadStore/ChatThreadStore.{ts,test.ts}` and
  `ChatContextTrayStore/ChatContextTrayStore.{ts,test.ts}`.
- Provider (new): `src/components/ChatPanel/ChatSessionProvider/{ChatSessionProvider.tsx,useChatSessions.ts,ChatSessionProvider.test.tsx,ChatSessionProvider.noWorkspace.test.tsx}`,
  mounted from `ChatPanelProvider/ChatPanelProvider.tsx`, and the session
  hunks of `ChatPanelStateManager/ChatPanelStateManager.{tsx,test.tsx}`.
- Tabs and archive (new): `src/components/ChatPanel/ChatThread/ChatSessionStrip/`
  (`ChatSessionStrip.{tsx,module.css,test.tsx}`, `ChatSessionTabs.tsx`,
  `ChatSessionTab.tsx`, `ChatSessionOverflowMenu.tsx`,
  `ArchivedChatSessionsMenu.tsx`, `ArchivedChatSessionRow.tsx`), mounted from
  `ChatPanel/ChatPanel.tsx` and `ChatPanelHeader/ChatPanelHeader.tsx`.
- Composer: the session-kind hunks of `ChatThread/Composer/Composer.{tsx,test.tsx}`.
- Runtime: the session hunks of `useAvandarChatRuntime/useAvandarChatRuntime.ts`,
  `createChatModelAdapter/createChatModelAdapter.{ts,test.ts}`,
  `runDataAgentTurn/runDataAgentTurn.{ts,test.ts}`,
  `runOfflineDataAgentTurn/runOfflineDataAgentTurn.{ts,test.ts}`,
  `dataAgentTurnHelpers/{dataAgentTurnHelpers.ts,dataAgentConversation.types.ts}`,
  and `requestStoredSessionTitle.ts` (new).
- Runtime tests: `__tests__/useAvandarChatRuntime.sessions.test.tsx` and
  `__tests__/chatSessionTitle.integration.test.ts` (new), and the session
  hunks of `__tests__/useAvandarChatRuntime.{mocks.tsx,harness.tsx,contextTray.test.tsx,retryContext.test.tsx}`,
  `ChatThread/ChatContextTray/__tests__/ChatContextTrayTestFixtures.tsx`, and
  `src/components/Nux/NuxTour/useNuxOpenChatPanel/useNuxOpenChatPanel.test.tsx`.
- Titles: `shared/agent/chatTitle/{buildChatSessionTitleExcerpt,chatTitlePrompt}.{ts,test.ts}` (new),
  `src/components/ChatPanel/ChatSessionTitle/requestChatSessionTitle.{ts,test.ts}` (new),
  `supabase/functions/chat/PostChatTitle/PostChatTitle.{ts,test.ts}` (new), and
  the title route in `supabase/functions/chat/ChatRoutes.{ts,types.ts}`.
- New case type: `src/views/OntologyDesignerApp/NewCaseTypeButton.{tsx,test.tsx}` and
  `src/routes/_auth/$workspaceSlug/ontology-designer/{index.tsx,-index.test.tsx}`.
- E2E: `tests/e2e/agent-chat-sessions.spec.ts` (new), and the Dock hunk of
  `tests/e2e/case-list-field.spec.ts`.
- Docs: `docs/ai-agent/specs/phase-1c.md` (new), D43 in `decisions.md`, the
  1C rows in `roadmap.md` and `specs/phase-1.md`.
- `src/i18n/locales/*/messages.{po,ts}`: regenerate with
  `pnpm i18n:extract && pnpm i18n:compile`, never copy.

**Schema:** none. Sessions, threads, trays, and the archive are in
localStorage. Chat history in the database is future work F4 in
`docs/ai-agent/roadmap.md`, not this log's F4.

**Known gaps** (triaged at the branch review and left on purpose): the
archive dropdown is still `role="menu"` with no menu items, and the tab
strip's close buttons sit inside `role="tablist"` with no `tabpanel` or
arrow-key roving. A title is requested after an error reply too. The title
excerpt uses the latest raw user text, not the hosted turn's
`_userModelContent`. Switching tabs mid-reply cancels the run and keeps the
partial answer. Reloading while a kickoff run is in flight can append the
kickoff again. Duplicate ids in `openIds` are not removed, and a session row
in neither the open nor the archived ids is never removed. The provider
value is not memoized. `docs/ontology-architecture.md` still describes
`caseDesignSessionNonce`.

**Verification:**
```sh
pnpm i18n:extract
pnpm vitest run src/components/ChatPanel shared/agent/chatTitle src/views/OntologyDesignerApp 'src/routes/_auth/$workspaceSlug/ontology-designer'
pnpm type-check:deno
pnpm tsc -b --force
pnpm test:e2e agent-chat-sessions.spec.ts
pnpm test:e2e case-list-field.spec.ts
```

---

## F129: Data dictionaries: entries and reusable two-way code lists under Data Sources

Status: not started. Built on `feat/data-dictionaries`, branched from
`demo/measles` at `17695206f`. No PR is open.

**Purpose:** Data Sources editors can create and edit a dictionary of the
columns a data source uses. Only its owner or a Data Sources admin can delete
it. Each entry has a name, the other column names it also
matches, a kind (categorical, ordered, number, date, text, or identifier), a
description, and for a number a unit and valid range. A categorical or ordered
entry uses a code list, and can also recognize other code lists that write the
same values another way. A code list is a set of code and label pairs that
work both ways: codes turn into labels, and labels turn back into codes, with
other accepted spellings and a missing flag per value. A code list can be
ordered, and the order is the scale's order. Data Sources lists dictionaries
in their own group beside the datasets and has a New dictionary button. The
dictionary page has Entries, Code lists, and Used by tabs, edits everything as
one draft, and saves it in one call that bumps a version number, so a refused
save changes nothing. The Used by tab and its rail are placeholders: applying a
dictionary to a dataset is a later slice.
**Value:** A team writes down what its codes mean once, in words a colleague
can read, and later features can apply that to datasets.

**Design:** `docs/measles-demo/data-dictionaries-design.md`. The task plan is
`docs/measles-demo/data-dictionaries-1-dictionaries-plan.md`.

**PR title:** `feat(data-dictionaries): add dictionaries with entries and two-way code lists`

**Depends on:** none. It reuses the Data Sources shell, the workspace
permission registry, and the desktop sync manifest, all on `develop`.

**Files, by area** (`DataDictionaryView/` is
`src/views/DataManagerApp/DataDictionaryView/`):

- Docs: the design and the slice 1 plan in `docs/measles-demo/`
  (`02fc120d4`, `d9b8db8c1`).
- Schema (`868246766`, `25ba3a15a`): `supabase/schemas/` files
  `00.enum.data_dictionaries__entry_kind.sql`, `10.data_dictionaries.sql`,
  `20.data_dictionaries__code_lists.sql`, `20.data_dictionaries__entries.sql`,
  `21.data_dictionaries__entry_codings.sql`, and
  `50.rpc_data_dictionaries__save.sql`, the generated
  `supabase/migrations/20261112000050_data_dictionaries.sql`, its desktop twin
  `apps/desktop/migrations/20261112000050_data_dictionaries.gen.sql`, and
  `apps/desktop/sync/syncable-tables.ts` (the four tables in `ACTIVE_TABLES`).
  Regenerate the migration with `supabase-declarative-schema`, never copy it.
  The tests are `supabase/tests/database/data_dictionaries/` and the two
  files under `supabase/tests/database/permissions/`.
- Models (`51737369d`, `026a6464b`, `edd6e04f1`, `0ed027e9f`):
  `shared/models/dataDictionaries/{DataDictionary,DataDictionaryCodeList,DataDictionaryEntry,DataDictionaryEntryCoding}/`.
  `DataDictionaryModule` holds the draft helpers: `toDraft`, `findDraftIssues`,
  `buildSavePayload`, and the code list and entry edits.
- Permission and clients (`83517d8d7`): `data_sources__can_view_dictionaries`
  and `data_sources__can_edit_dictionaries` in `PermissionRegistry.ts` and its
  test, and `src/clients/dataDictionaries/`
  (the dictionary, code list, entry, and coding clients).
- Route and links (`2e493e446`): the `dictionaries/$dictionaryId` route,
  `AppLinks.dataManagerDictionaryView`, and the generated `routeTree.gen.ts`.
- Data Sources (`6c56716e9`, `040296614`): the Dictionaries group in
  `DatasetNavbar`, the New dictionary button in `DataManagerApp.tsx`, and
  `NewDataDictionaryModal/`. The list now counts datasets and dictionaries
  under an "All data" heading, so `tests/e2e/csv-parse-options.spec.ts` and
  `apps/ava-video-producer/capture-flows/avandar.mjs` look for that heading.
- Dictionary view (`b3baec9f6`, `9c809d65f`, `97a45702d`):
  `DataDictionaryView.tsx`, the header, actions menu, rail, save bar, the
  draft, save, and copy hooks, and the editor with its tabs. A save bar that
  holds back edits made while a save is in flight is `97a45702d`.
- Entries and code lists (`89c67d87f`, `819fd719c`): `DictionaryEntriesTab/`,
  `DictionaryEntryPane/`, `DictionaryCodeListsTab/`, and `CodeListEditor/`
  (paste a list, reorder with a drag handle or Alt and an arrow key).
- Review fixes (`3371677a9`, `9eb35d66c`, `63f5f3ce6`): a failed refetch no
  longer replaces the editor, the moved value's handle keeps focus after a
  reorder, pair issues describe their input instead of an alert, counts are
  pluralized, rows without a handle are plain list items, and the entries
  table leaves room for its description column.
- Final review fixes (`d99733e9e`, `67d676981`, `7f7b05317`, `ca737d329`,
  `523c94032`, `ffb06c60e`, `8b4044f69`): the actions menu shows only to the
  owner or a Data Sources admin (`useCanDeleteDictionary`), matching the delete
  policy. i18n placeholders are named and the rename and delete failures use
  fixed copy. The four dictionary queries refetch on mount, so a quick reload
  after a save never shows the pre-save snapshot. A reorder no longer steals
  focus in another code list. The entries table uses a short kind label. A
  failed create shows an error. `DataManagerToolbarActions` is extracted from
  `DataManagerApp.tsx`.
- Translations (`d7d0bddec`, `81cfaa4aa`): `src/i18n/locales/*/messages.{po,ts}`,
  regenerated with `pnpm i18n:extract && pnpm i18n:compile`, never copied.
- E2E: `tests/e2e/data-dictionary-edit.spec.ts` (new).
- Generated: `shared/types/database.types.ts` (`pnpm db:gen-types`).

**Schema:** yes. Four tables (`data_dictionaries`,
`data_dictionaries__code_lists`, `data_dictionaries__entries`,
`data_dictionaries__entry_codings`), one enum
(`data_dictionaries__entry_kind`), and one RPC, `rpc_data_dictionaries__save`,
with six helpers (`data_dictionaries__check_code_lists`, `__check_pairs`,
`__check_entries`, `__check_codings`, `__write_code_lists`, and
`__write_entries`). The RPC requires an editor on Data Sources, locks the
dictionary so two saves run one at a time, checks the whole draft before it
writes, and returns the new version.

**Known gaps:** the Used by tab and rail show no datasets yet. Applying a
dictionary to a dataset, crosswalks, and creating a dictionary from a dataset
are later slices of the design.

**Verification:**
```sh
pnpm vitest run src/views/DataManagerApp shared/models/dataDictionaries src/clients/dataDictionaries
pnpm tsc -b --force
pnpm test:db
pnpm i18n:check
pnpm test:e2e data-dictionary-edit.spec.ts
pnpm test:e2e csv-import.spec.ts
```

---

## F130: Learn a data dictionary from datasets

Status: not started. Built on `feat/dictionary-inference`, branched from
`demo/measles` at `5516a9e6e`. No PR is open.

**Purpose:** A team creates a data dictionary from one or more datasets in four
steps: Pick datasets, Review columns, Label values, and Save. Coded and ordered
columns are found on the device, columns that match across datasets are merged
into one entry, and labels are suggested online or by the offline model. Only
column names and the values of short coded columns are ever sent. Review shows
each entry as "Needs labels" or "Description", and Label values has a
full-height flank headed "Code lists to label" with an "X of Y done" count.
Focus moves to the step heading when the step changes. Keep apart is
remembered, so a meaning match that arrives late never rejoins columns the user
split. A list that cannot get suggestions says why (`getLabelsBlockReason`:
personal, code too long, or too large for the model). The consent result is
`approved`, `declined`, `ack_missing`, or `edited`. A save that fails after the
dictionary row was created deletes it again, and reports
`DictionaryLeftBehindError` if even that fails. On-device requests fit the
8,192-token window, and the date sample is the same on every profile. A column
with a different value on every row never sends its values, whatever kind the
user sets, and a failed read returns to Pick instead of waiting forever.

**Value:** A team no longer types a code list by hand. It reads what its
datasets already use, labels the values once, and saves a dictionary that other
datasets can use.

**Design:** `docs/measles-demo/data-dictionaries-design.md`. The task plan is
`docs/measles-demo/data-dictionaries-2-inference-plan.md`.

**PR title:** `feat(data-dictionaries): learn a dictionary from datasets`

**Depends on:** F129.

**Files, by area** (`NewDictionaryFromDatasetsView/` is
`src/views/DataManagerApp/NewDictionaryFromDatasetsView/`):

- Docs: the plan and the design in `docs/measles-demo/`
  (`c04ba61f7`, `16500c850`, `e129ff5e5`, `0ca89d343`, `89b3f501b`), and this log.
- Save RPC schema, migration, desktop twin, and pgTAP (`85ebdc88e`):
  `supabase/schemas/50.rpc_data_dictionaries__save.sql`,
  `supabase/migrations/20261112201046_data_dictionaries_blank_labels.sql`,
  `apps/desktop/migrations/20261112201046_data_dictionaries_blank_labels.gen.sql`,
  and `supabase/tests/database/data_dictionaries/rpc_data_dictionaries__save.test.sql`.
- Slice 1 changed for blank labels (`1dd448967`, `c13c23137`):
  `DataDictionaryModule` (`findDraftWarnings`), the code list parsers,
  `useDictionaryCopy.ts`, `CodeListEditor/`, and `DictionaryEntriesTab/` mark a
  value "Needs a label" without blocking Save.
- Shared models (`eb5a1d0dc`, `301d160d6`, `b6de24b37`, `93ae735a2`,
  `95d251232`, `6d2929ff0`, `9e27c69f9`, `d6b4dd5b4`, `7dd21b046`, `d28401d6c`,
  `8081e5d87`, `75d8842db`, `01078e74e`):
  `shared/models/dataDictionaries/ColumnProfile/` and
  `shared/models/dataDictionaries/DictionaryProposal/` (clustering, shared code
  lists, the save draft, and the review edits).
- Suggestions prompt and the `chat` route (`0fefb48c6`, `9988d01ae`,
  `bcd7ef0d0`, `c0702775f`, `7e28f1fe4`, `e245efbe0`, `0485db5ed`, `e3e018a33`,
  `8081e5d87`, `5c6667f23`, `8ff76eade`):
  `shared/agent/dictionarySuggestions/dictionarySuggestionsPrompt.ts`,
  `supabase/functions/chat/PostDictionarySuggestions/`, `ChatRoutes.ts`,
  `ChatRoutes.types.ts`, and `supabase/functions/chat/deno.json` (the `uuid`
  entry the prompt's imports need, without which the whole `chat` function
  fails to boot). `8ff76eade` also adds `OpenRouterApiError.ts` next to
  `sendOpenRouterRequest.ts`, which now throws it with the same message, so the
  route can answer a provider failure with its status alone.
- Profiling and suggestions libraries (`1df554069`, `620305730`, `19fc3b528`,
  `151f6e8d4`, `faa20cc5e`, `730e17cb8`, `7683b6501`, `931a5dcb1`, `fc3ac948c`, `8081e5d87`, `5c6667f23`):
  `src/lib/dataDictionaries/` (`profileDatasetColumns`, `ColumnProfileSql`,
  `DictionarySuggestions`), `useIsMounted.ts`, and `resolveChatRuntimeMode.ts`.
- Consent context (`620305730`): `dictionary_suggestions` in
  `ConsentAuditEntry.constants.ts`, `decideIfDataCanCrossBoundary.tsx`, and
  `ConsentLogPanel.tsx`.
- Create flow view (`cd6d25328`, `d33a6491e`, `3e19ea548`, `d2330bc58`,
  `ae8c0a965`, `583d461f8`, `03c38daaa`, `82dfaebc9`, `d8c2888d6`, `b41950d2a`,
  `3fcba873e`, `a482b13c9`, `6ed86bd2a`, `d44e43d05`, `c37c915c5`, `b183467f8`,
  `ec26ed15c`, `4e10c05a4`, `c1fe425ab`, `064e89ba5`, `32cd7c8f2`, `7f37dac18`,
  `39a5005ee`, `6f36c1d48`, `e5f9e159d`):
  `NewDictionaryFromDatasetsView/` (the reducer, the read, suggest, and save
  hooks, and the four step folders), the
  `dictionaries/new` route, `AppLinks.tsx`, and the generated `routeTree.gen.ts`.
- Data Sources entry points (`4ff06c4ca`, `cdcbda201`, `14d07dc17`): `NewDictionaryMenu.tsx`
  and `ListToggleButton.tsx` in `DataManagerToolbarActions/`,
  `useListPaneToggle/`, `DataManagerApp.tsx`, and
  `DatasetActionsMenu/CreateDictionaryMenuItem.tsx`.
- E2E and fixture (`4ff06c4ca`, `9163c3405`):
  `tests/e2e/dictionary-create-from-dataset.spec.ts` (new),
  `tests/e2e/data-dictionary-edit.spec.ts` (through the New dictionary menu),
  `tests/e2e/helpers/constants.ts`, and
  `tests/data/measles-line-list-small/measles-line-list-small.csv`.
- Translations (`4c8886f20`, `8780c13fd`): `src/i18n/locales/*/messages.{po,ts}`,
  regenerated with `pnpm i18n:extract && pnpm i18n:compile`, never copied.

**Schema:** yes, one migration (`data_dictionaries_blank_labels`) that replaces
`data_dictionaries__check_pairs` so a value may be saved with a blank label
(label uniqueness ignores blanks, and a blank code is still refused), plus its
desktop SQLite twin. No table, column, or policy changes.

**Deploy:** the migration first (the frontend saves blank labels, which the old
function refuses), then the `chat` edge function (new route
`/:workspaceId/dictionary-suggestions/:promptId`, which requires an ack token,
so the frontend must ship with or after it), then the frontend.

**Known gaps:** applying a dictionary and hiding the dataset menu item once one
is applied are slice 3. Add from datasets into an existing dictionary is a
separate small piece after slice 3 and will update "Made from". Slice 4 must
decide what a blank-label value does in each conversion direction.

**Verification:**
```sh
ava supabase status
pnpm lint
pnpm exec tsc -b --force --noEmit && pnpm type-check:deno
pnpm test:frontend
pnpm vitest run --config vitest.executed.config.ts src/lib/dataDictionaries
pnpm test:db
ava supabase migrations validate
pnpm desktop:sqlite:gen-migrations
pnpm i18n:check
pnpm test:e2e dictionary-create-from-dataset.spec.ts
pnpm test:e2e data-dictionary-edit.spec.ts
pnpm test:e2e csv-import.spec.ts
```

---

## F131: Apply a dictionary to a dataset as reference

Status: not started. Built on `feat/attach-dictionaries`, branched from
`demo/measles` at `71a2a4769`. No PR is open.

**Purpose:** Someone who can edit a dataset applies one or more dictionaries
to it from its ⋯ menu ("Apply a dictionary"), from a dictionary's "Apply to a
dataset", or right after creating one ("Apply it to <dataset> next" on Save).
Columns are matched to dictionary entries on the device, in two steps: Match
columns and Attach. Attaching stores a reference binding per column and
changes no value. Bound columns show their code list in a popover on the
dataset page, the Data Summary, and the Data Explorer grid. The popover opens
on hover, focus, or click, tracks each separately, closes on Escape pressed on
the tag, and scrolls a long list inside. The dataset rail and the dictionary's
Used by tab show where a dictionary is applied, and the menu hides "Create a
dictionary from this dataset" once one is. Ask Avandar reads the code lists
online through prompt `data-agent-v5` and offline through its profile,
question values, and `lookup_values`. Code lines cap each code and label at 60
characters, spend at most 4,000 characters per prompt, and quote a label
holding `,`, `=`, `[`, or `]`. The apply view refuses a dataset the user
cannot edit, and says so when the dataset role cannot be read at all.

**Value:** A coded column explains itself wherever it is read, and "how many
female cases" becomes `"GENDER" = 2` without anyone remembering the code.

**Design:** `docs/measles-demo/data-dictionaries-design.md`. The task plan is
`docs/measles-demo/data-dictionaries-3-attach-plan.md`.

**PR title:** `feat(data-dictionaries): apply dictionaries to datasets as reference`

**Depends on:** F129 and F130.

**Files, by area** (`ApplyDictionariesView/` is
`src/views/DataManagerApp/ApplyDictionariesView/`, `DatasetMetaView/` is
`src/views/DataManagerApp/DatasetMetaView/`, and `SM/` is
`shared/models/dataDictionaries/`):

- Docs: the plan and the design in `docs/measles-demo/` (`bed2f076d`,
  `a9ae31115`, `3c52a7a02`), and this log.
- Schema, migration, desktop twin, sync list, and pgTAP (`cefb14f16`,
  `977afc66c`): `supabase/schemas/00.enum.dataset_columns__binding_mode.sql`,
  `00.enum.dataset_columns__binding_direction.sql`,
  `30.dataset_columns__dictionary_bindings.sql`, and
  `50.rpc_dataset_columns__apply_dictionaries.sql`; the generated
  `supabase/migrations/20261113022522_dictionary_bindings.sql` and its twin
  `apps/desktop/migrations/20261113022522_dictionary_bindings.gen.sql`;
  `apps/desktop/sync/syncable-tables.ts`; and the tests
  `supabase/tests/database/dictionary_bindings/rpc_dataset_columns__apply_dictionaries.test.sql`,
  `supabase/tests/database/permissions/rls_dataset_columns__dictionary_bindings.test.sql`,
  and `exact_data_api_grants.test.sql`. `977afc66c` renames the workspace
  guard trigger to `..._keep_workspace_id`, validates each payload with
  `binding_payload_invalid`, and locks the dataset with `for no key update`.
  Regenerate the migration with `supabase-declarative-schema`, never copy it.
- Shared models (`5d7844ff8`, `0d803155b`, `b552bb594`, `6d2ee2909`,
  `cf77967dc`, `aa1e1a7f7`, `5ba9698b6`): `SM/DictionaryBinding/`,
  `SM/ColumnCodes/`, `SM/DictionaryMatch/` (`DictionaryMatchFit` includes
  `not_compared`, ranked below a real fit, and keeps its code list), and
  `getNameScore` exported from `SM/ColumnProfile/ColumnProfileModule/`.
- Client, loaders, and hooks (`ab41fb10f`, `1c2efd54e`, `aa1e1a7f7`,
  `676e8992f`): `src/clients/dataDictionaries/DictionaryBindingClient.ts`,
  `src/lib/dataDictionaries/loadColumnCodes/`,
  `src/hooks/datasets/useCanEditDataset/`,
  `src/hooks/dataDictionaries/useDatasetColumnCodes/`, and
  `useDatasetHasBindings.ts`. `676e8992f` also makes
  `src/hooks/permissions/useResourceRole/useResourceRole.ts` return `isError`.
- The popover (`1f92ec43b`, `e26030a83`, `5a3f40cb2`):
  `src/components/dataDictionaries/CodeListPopover/`.
- The dataset page and menu (`6248dc0f6`, `32098fc2b`, `e26030a83`, `b4c794528`):
  `DatasetMetaView/DatasetColumnCodes/`, `DatasetMetaView.tsx`,
  `DatasetMetadataList.tsx`, `DatasetSourceRail.tsx`,
  `DatasetSummaryView/DatasetSummaryView.tsx`,
  `DatasetSummaryView/ColumnSection/ColumnSection.tsx`, and
  `DatasetActionsMenu/` (`ApplyDictionaryMenuItem.tsx`,
  `DictionaryMenuItems.tsx`, `CreateDictionaryMenuItem.tsx`,
  `DatasetActionsMenu.tsx`).
- The route, link, and list toggle (`23d401540`):
  `src/routes/_auth/$workspaceSlug/data-manager/$datasetId_.apply-dictionaries.tsx`,
  `AppLinks.tsx`, the generated `routeTree.gen.ts`, and
  `src/views/DataManagerApp/useListPaneToggle/`.
- The apply flow (`449065183`, `157a44711`, `ecf9e6762`, `30d4772d5`,
  `571f3fae0`, `9966923a7`, `676e8992f`, `9cd6e8d9d`): `ApplyDictionariesView/`
  (the reducer, defaults, lookups, the data, profile, flow, access, and
  attach hooks, the header and step bar, `MatchColumnsStep/`, and
  `AttachStep/`). The access hook has a `failed` state for a role read that
  fails. A column two dictionaries tie on goes to the one whose chip comes
  first (most columns covered). The header leads back to the dataset from a
  breadcrumb, and the selected column sits in the body's rail, as in the
  prototype (`dd1bc5bec`, `7af52f65b`).
- The Save step (`242d427ef`, `ec386f1f6`):
  `src/views/DataManagerApp/NewDictionaryFromDatasetsView/` (`SaveStep/`,
  `ProposalStepBody.tsx`, `useCreateDictionary.ts`, `useNewDictionaryFlow.ts`,
  `useOpenAfterCreate.ts`, and the reducer).
- The Dictionary view (`b278896db`, `ec386f1f6`, `c6ed4e267`, `ca665cb44`):
  `src/views/DataManagerApp/DataDictionaryView/` (`ApplyToDatasetButton/`,
  `DictionaryUsedByTab/` with its loading and error states,
  `useDictionaryUsage/`, `DataDictionaryHeader/`, and the editor and its
  tabs). F129's `useSaveDataDictionary.ts` now also refreshes the bindings,
  so Used by is current after a save removes an entry.
- The Data Explorer (`e82540818`, `26061b590`):
  `src/lib/dataDictionaries/getResultColumnCodes/`,
  `src/lib/ui/viz/DataGridColumnTitle/` (`ColumnCodesContext.ts`,
  `DataGridColumnTitle.tsx`), `src/views/DataExplorerApp/useExplorerColumnCodes/`,
  and `DataExplorerApp.tsx`.
- Prompt v5 and the `chat` function (`03ca7f39c`, `90aac2562`, `5ba9698b6`,
  `d8c0d6849`, `b60b9206d`): `shared/agent/dataAgent/{buildDataAgentSystemPrompt,dataAgentTools}.ts`,
  `supabase/functions/chat/utils/loadColumnCodes/`,
  `PostAgentStream/loadDataAgentDatasets.ts`, and
  `PostChatMessages/schema/fetchWorkspaceSchema.ts`.
- The legacy schema block and offline pipeline (`b878e5416`, `5ba9698b6`):
  `shared/models/chat/SqlTableAlias/SqlTableAliasModule.ts`,
  `shared/types/offlineChat.types.ts`, and
  `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/`.
- The browser's agent datasets (`fb01c764b`):
  `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers.ts`.
- The offline agent (`513e88d44`, `5ba9698b6`):
  `src/lib/agent/dataAgent/offline/{profileOfflineDatasets,buildOfflineDataAgentSystemPrompt,findQuestionValues}/`.
- `lookup_values` (`c38cd98ec`, `d8c0d6849`):
  `src/lib/agent/dataAgent/createDataAgentTools/lookupValuesTool.ts` and
  `createDataAgent/createDataAgent.ts`.
- Evals (`5ce5ba8a2`, `c567ca769`, `f5749bc3c`, `78f110d9b`, `92225ff65`):
  `scripts/ai-eval/measles/`, `EvalQuestion.ts`, `runEval.ts`,
  `runtime/EvalDatabase.ts`, `harnesses/pi/{PiHarness,PiLocalHarness}.ts`,
  `docs/ai-agent/eval.md`, and `docs/ai-agent/eval-runs/`. The coded-column
  graders check only the count. The page and mention questions were rerun to
  7 of 7 after one P04 miss and one M05 grader false positive. These runs
  used the coded-column prompt before the merge with the plugin AI tools,
  when it was v3 plus CODED COLUMNS and named v4. It ships as v5, which also
  carries v4's plugin-tool bullet, and has not been rerun.
- E2E (`03ca7f39c`, `d6f624f77`, `8cd68ca59`, `0a70cfcc6`):
  `tests/e2e/dictionary-apply-reference.spec.ts` (new),
  `tests/e2e/helpers/seedDataDictionary.ts` (new),
  `dictionary-create-from-dataset.spec.ts` (saving opens Apply first), and
  `agent-chat-{result,sessions,mentions}.spec.ts` (the `data-agent-v5` route).
- Translations (`2cbf5c9a4`): `src/i18n/locales/*/messages.{po,ts}`,
  regenerated with `pnpm i18n:extract && pnpm i18n:compile`, never copied.
- Generated: `shared/types/database.types.ts` (`pnpm db:gen-types`).

**Schema:** yes, one migration (`dictionary_bindings`) with two enums
(`dataset_columns__binding_mode`, `dataset_columns__binding_direction`), the
`dataset_columns__dictionary_bindings` table (select-only for signed-in users,
following the dataset's visibility), its triggers (the workspace guard, and
removing reference bindings when a dictionary or entry is deleted), and
`rpc_dataset_columns__apply_dictionaries`, which replaces a dataset's bindings
whole and accepts `reference` only. Plus its desktop SQLite twin and the table
in `apps/desktop/sync/syncable-tables.ts`.

**Deploy:** the migration first, then the `chat` edge function, then the
frontend. The plugin AI tools' prompt `data-agent-v4` must be deployed first
or in the same deploy, since v5 builds on it. Tabs opened before the deploy
keep asking for v3 or v4, which the function still serves.

**Known gaps:** conversions, linked datasets, unmatched values, the preview
drawer, Re-apply, and the synced-data warning are slice 4. Crosswalks are
slice 5. "Add from datasets" into an existing dictionary is a separate small
piece. The slice 3 follow-ups in spec section 16: the entry description in
the Description column, "Apply to a dataset" listing only editable datasets,
and tags on grouped SQL results, all three built in F132. Re-pointing a binding whose code list is
deleted, and the menu's conversion sub-line, come with conversions.

**Verification:**
```sh
ava supabase status
pnpm lint
pnpm exec tsc -b --force --noEmit && pnpm type-check:deno
deno info --config supabase/functions/chat/deno.json supabase/functions/chat/index.ts 2>&1 | grep -iE "error|not found|unable to"
pnpm test:frontend
pnpm vitest run --config vitest.executed.config.ts src/lib/agent/dataAgent/pagePrivacy src/lib/dataDictionaries
pnpm test:db
ava supabase migrations validate
pnpm desktop:sqlite:gen-migrations
pnpm test:desktop
pnpm i18n:check
pnpm test:e2e dictionary-apply-reference.spec.ts
pnpm test:e2e dictionary-create-from-dataset.spec.ts
pnpm test:e2e data-dictionary-edit.spec.ts
pnpm test:e2e agent-chat-result.spec.ts
pnpm test:e2e agent-chat-sessions.spec.ts
pnpm test:e2e agent-chat-mentions.spec.ts
pnpm test:e2e data-explorer-grid-layout.spec.ts
pnpm test:e2e web-offline-mode.spec.ts
```

---

## F132: Data dictionary follow-ups

Status: not started. Built on `feat/dictionary-followups`, branched from
`demo/measles` at `72f90d8fe`. No PR is open.

**Purpose:** The three small follow-ups F131 left for its slice. A bound
column with no description of its own shows its dictionary entry's
description in the dataset's Description column, captioned "From
<dictionary>", instead of under the column name. The Dictionary view's
"Apply to a dataset" dialog offers only the datasets the user can edit, read
in one call, and says "You can't edit any dataset in this workspace" when
there are none. A grouped SQL result in the Data Explorer, such as
`SELECT "GENDER", count(*) FROM ... GROUP BY 1`, tags its grouped column with
its code list.

**Value:** A coded column reads the same in every place, the dialog no longer
offers datasets the apply view then refuses, and the most common question
about a coded column (how many of each) shows what the codes mean.

**Design:** `docs/measles-demo/data-dictionaries-design.md`, sections 7.2,
7.4, and 16.

**PR title:** `feat(data-dictionaries): finish the attach-as-reference follow-ups`

**Depends on:** F131.

**Files, by area:**

- Entry descriptions (`22804b213`): `packages/web/ui/src/ObjectDescriptionList/`
  (`ObjectDescriptionList.types.ts`, `ValueItemContainer.tsx`,
  `ObjectDescriptionListBlock.tsx`, `PrimitiveValueItem/PrimitiveValueItem.tsx`,
  `DescribableValueArrayBlock/ObjectArrayBlock/ObjectTableRow.tsx`, and the new
  `ObjectDescriptionList.test.tsx`): `renderValue` and `renderEditableValue`
  get a third argument, the object the value is a key of. Then
  `src/views/DataManagerApp/DatasetMetaView/DatasetMetadataList.tsx` and its
  new test, and `DatasetColumnCodes/BoundColumnName.{tsx,test.tsx}`.
- Editable datasets, schema (`091fd74ed`):
  `supabase/schemas/50.rpc_datasets__get_editable_ids.sql`, the generated
  `supabase/migrations/20261113154906_datasets_get_editable_ids.sql` and its
  twin `apps/desktop/migrations/20261113154906_datasets_get_editable_ids.gen.sql`,
  `shared/types/database.types.ts`, and
  `supabase/tests/database/datasets/rpc_datasets__get_editable_ids.test.sql`.
  The RPC runs as the caller and keeps the datasets that
  `util__auth_user_can_update_resource` allows.
- Editable datasets, client and dialog (`051931742`):
  `src/clients/datasets/DatasetClient/{DatasetClient.ts,createDatasetQueries.ts}`
  (`getEditableIds`) and
  `src/views/DataManagerApp/DataDictionaryView/ApplyToDatasetButton/ApplyToDatasetModal.{tsx,test.tsx}`.
- Grouped SQL tags (`b78b7b893`):
  `shared/models/queries/QueryResultColumnBindings/makeProjectionDescriptorsFromSql/`
  reads `count(*)` (keyed as a count of `*`, named by its alias or DuckDB's
  `count_star()`) and a `GROUP BY` position, plus the docstring in
  `QueryResultColumnBindings.types.ts` and new cases in
  `src/lib/dataDictionaries/getResultColumnCodes/getResultColumnCodes.test.ts`.
  Raw SQL with `count(*)` now also keeps stable column IDs across runs.
- E2E (`055064f62`): `tests/e2e/dictionary-apply-reference.spec.ts` runs a
  grouped count in the Data Explorer and finds the entry's description in
  `case_id`'s own row.
- Translations (`670dc704f`) and this log.

**Schema:** yes, one migration (`datasets_get_editable_ids`) with one RPC,
`authenticated` only. Regenerate it with `supabase-declarative-schema`.

**Deploy:** the migration, then the frontend.

**Known gaps:** none of the three is partial. `count(*)` with `FILTER`,
`DISTINCT`, or a window still yields no projections, as does grouping by an
expression.

**Verification:** `pnpm lint`, `pnpm exec tsc -b --force --noEmit`,
`pnpm type-check:deno`, `pnpm i18n:check`, `pnpm test:frontend` (only the
known maplibre `-$dashboardId.test.tsx` failure), `pnpm vitest run` in
`packages/web/ui`, `pnpm test:db` on the branch's switched stack, and one at a
time `dictionary-apply-reference`, `data-dictionary-edit`,
`dictionary-create-from-dataset`, and `data-explorer-grid-layout` e2e specs.

---

## F133: Convert coded columns with a dictionary

Status: built on `feat/dictionary-conversions`, branched from `demo/measles`
at `6518c3aa5`. No PR is open.

**Purpose:** Someone who can edit a dataset converts its coded columns from
**Apply a dictionary**, now three steps (Match columns, Unmatched values,
Save as). A workspace admin saves the conversions as a new linked dataset
that reads the source and follows the dictionary; the source keeps the code
lists as reference. Conversions run when a dataset loads, as a `CASE` in the
view QETL builds, so stored data never changes. Ordered lists become an
`ENUM` of their labels and kept values, built at load, so they sort in list
order. Unmatched values are listed with row counts and kept, mapped to a
label, added to the list, or emptied. A preview drawer shows the result
before saving. A linked dataset's rail names the dataset it reads, the
source's rail names its linked datasets, the popover says the values were
converted and counts the values with no label, a converted column's type is
read-only, Used by says Reference or Linked, and the delete confirmation
names linked datasets. A loaded view records its projection and rebuilds on
the next query after a binding or code-list change; published snapshots read
converted datasets through the query; a virtual dataset's cache follows its
SQL and its dependencies' age. Ask Avandar describes a converted column by
its labels with no new prompt version. View templates substitute parameters
once and literally.

**Value:** "1 means Male" is applied once and every chart, filter, export,
and answer reads Male, while the original upload stays untouched and the
linked dataset keeps up with the dictionary.

**Design:** `docs/measles-demo/data-dictionaries-design.md` and
`docs/measles-demo/data-dictionaries-4-conversions-plan.md` (Part A).

**PR title:** `feat(data-dictionaries): convert coded columns into linked datasets`

**Depends on:** F131 and F132.

**Files, by area** (`ApplyDictionariesView/` is
`src/views/DataManagerApp/ApplyDictionariesView/`, `DatasetMetaView/` is
`src/views/DataManagerApp/DatasetMetaView/`, `QM/` is
`src/clients/qetl/QueryMediator/`, and `SM/` is
`shared/models/dataDictionaries/`):

- Docs (`fdf05e0b1`, `80eab168c`, `b37474687`): the handoff and the plan
  in `docs/measles-demo/data-dictionaries-4-conversions-{handoff,plan}.md`,
  the spec edits in `data-dictionaries-design.md`, and this log. The QETL
  pipeline notes in `docs/qetl-architecture.md` (`b195ad2e8`, `59c506f64`,
  `3315d7b01`, `b66609496`, `62bedf4ee`).
- Templating (`0d11e2dba`): `src/clients/DuckDbClient/duckDbSqlText.ts`
  (`getQueryStringFromParams` substitutes each parameter once and
  literally) and its test.
- Schema, migration, desktop twin, and pgTAP (`90c9e86b5`):
  `supabase/schemas/20.dataset_columns.sql`, `20.datasets__virtual.sql`,
  `30.dataset_columns__dictionary_bindings.sql`,
  `50.rpc_data_dictionaries__save.sql`,
  `50.rpc_dataset_columns__apply_dictionaries.sql`,
  `50.rpc_dataset_columns__reapply_dictionary.sql`,
  `51.rpc_dataset_columns__apply_dictionaries.sql`, and
  `52.rpc_dataset_columns__apply_dictionaries_as_linked_dataset.sql`; the
  generated `supabase/migrations/20261113181028_dictionary_conversions.sql`
  and its twin
  `apps/desktop/migrations/20261113181028_dictionary_conversions.gen.sql`;
  `shared/types/database.types.ts`; and the tests under
  `supabase/tests/database/dictionary_bindings/` (`dictionary_changes`,
  `managed_columns`, `rpc_dataset_columns__apply_dictionaries`,
  `..._apply_dictionaries__convert`,
  `..._apply_dictionaries_as_linked_dataset`, and
  `..._reapply_dictionary`) and `supabase/tests/database/permissions/`
  (`rls_data_dictionaries__code_lists__linked`,
  `rls_dataset_columns__dictionary_bindings`). Regenerate the migration
  with `supabase-declarative-schema`, never copy it.
- Desktop SQLite generator (`660875fdd`):
  `apps/desktop/scripts/gen-sqlite-migrations/transpile.ts` turns sqlglot's
  `DEFAULT CAST('<literal>' AS <type>)` into `DEFAULT '<literal>'` (an empty
  array into `'[]'`) instead of dropping it, with the new `transpile.test.ts`
  and a `runGenerator.test.ts` case that adds the column to a table holding a
  row. Without it the `value_overrides` ADD COLUMN was `NOT NULL` with no
  default, which SQLite refuses on a desktop database that already holds
  bindings. Regenerating also restores the defaults in six older `.gen.sql`
  files (`20250929162612`, `20260819055319`, `20261109082310`,
  `20261112000050`, `20261113022522`, and `20261113181028`). The desktop
  tracks applied migrations by name, so the older files change only fresh
  installs. `pnpm desktop:sqlite:check-migrations` still reports
  `20261109134745` and `20261109155144`, whose header counts drifted before
  this branch.
- Schema fixes from the final review (`cfbd887a4`): the generated
  `supabase/migrations/20261113232435_dictionary_conversion_fixes.sql` and
  its twin
  `apps/desktop/migrations/20261113232435_dictionary_conversion_fixes.gen.sql`,
  `shared/types/database.types.ts`, the matching edits to
  `supabase/schemas/{30.dataset_columns__dictionary_bindings,50.rpc_data_dictionaries__save,51.rpc_dataset_columns__apply_dictionaries,52.rpc_dataset_columns__apply_dictionaries_as_linked_dataset}.sql`,
  and the tests `dictionary_changes` and
  `..._apply_dictionaries__convert`. `sync_live_types` types a column from
  `coalesce(pinned_pairs, live pairs)`, so a save that edits a list and
  deletes its entry leaves the right `data_type` (the save pinned the
  entry's convert bindings to the list's new pairs, and re-typing then
  skipped them). Both apply RPCs check the Data Sources editor right after
  they authorize the dataset, before any binding is read, when the call adds
  values.
- Shared models (`12f5ee41a`, `029a31457`, `54af33e5f`, `cb3521097`,
  `55ab3f63e`):
  `SM/DictionaryBinding/`, `SM/DataDictionaryCodeList/`,
  `shared/models/datasets/DatasetColumn/`,
  `shared/models/datasets/VirtualDataset/`, and the new
  `SM/ColumnConversion/` (the `WHEN` clauses, output type, and `ENUM`
  labels, with codes trimmed the way SQL trims them). `12f5ee41a` also
  touches `ApplyDictionariesView/AttachStep/` for the new binding fields.
  `cb3521097` applies a map override whose code differs from a pair only in
  case or surrounding spaces, as the apply RPC already accepts it, where the
  lookup was exact and the override did nothing. `55ab3f63e` reads an
  ordered column as text when a kept value holds a NUL character or the
  column keeps more than 1,000 values, since either broke the `ENUM`
  literal and the dataset's view failed to build. The kept values read, in
  `src/clients/DuckDbClient/duckDbSqlText.ts` with its tests, now stops one
  past the cap.
- Rendering and loading (`b603b61b8`, `b195ad2e8`, `3bdccd425`,
  `59c506f64`, `f25b4dcf3`, `9d5fe22f3`, `b66609496`):
  `src/clients/DuckDbClient/{duckDbSqlText,duckDbParquetLoad,duckDbClientOperations}.ts`
  with `duckDbSqlText.executed.test.ts`, `QM/QueryMediator.types.ts`,
  `QM/relationLoading/getColumnReplacementsFromColumns/` (with
  `getColumnReplacementsFromColumns.conversions.executed.test.ts`),
  `QM/relationLoading/RelationLoading.ts`, `QM/queryRunner.ts`,
  `QM/getRelationSources.ts`, `QM/QueryableRelationColumns/`, the
  projection tests under `QM/__tests__/`,
  `src/lib/sql/DuckDbSqlAnalyzer/duckDbSqlSources.ts` (the `ava_raw_` view
  reads its dataset), `src/lib/dataDictionaries/loadColumnReplacements/`,
  and `src/clients/datasets/LocalDatasetClient/runBackgroundParquetTranscoding.ts`
  (keep-original copies are left out of reconciliation).
- Virtual dataset freshness (`62bedf4ee`, `caa91553b`, `69227a33e`):
  `src/clients/qetl/wrappers/VirtualDatasetWrapper/`,
  `src/clients/qetl/wrappers/createDefaultRegistry.ts`,
  `QM/relationLoading/createRegistryForFetch.ts`,
  `QM/relationLoading/getVirtualRelationDefinitions/`, and
  `DatasetMetaView/clearCachedDatasetRows.ts` (a refresh also clears the
  linked datasets that read the dataset).
- Results and snapshots (`cac36bd9c`):
  `src/clients/DuckDbClient/arrowFieldToQueryResultField.ts` (an `ENUM` is
  text) and
  `src/clients/dashboards/DashboardClient/dashboardSnapshotHelpers/dashboardPublishSnapshots.ts`
  with its tests.
- Column codes (`537edd1d2`): `SM/ColumnCodes/`, both `loadColumnCodes/`
  (`src/lib/dataDictionaries/` and `supabase/functions/chat/utils/`), and
  the tests that read them.
- The binding client (`5a2d003f1`):
  `src/clients/dataDictionaries/DictionaryBindingClient.ts`,
  `ApplyDictionariesView/invalidateAfterApply/`, and
  `useAttachDictionaries.ts`.
- The apply flow (`83781324c`, `4863ee56b`, `b67aea4cd`, `e1e0e0442`,
  `8c7fa2781`, `d36ba57fd`, `7bc391c64`, `63a08980e`, `ae54962d0`,
  `4ce941af3`, `3f668c259`, `161f24881`, `7f073e8d6`, `1c320c62d`,
  `dbc4f876c`, `39bbce3dd`, `2b5a84053`, `73c7c4ade`, `2a9bc0850`,
  `8c5e74acf`, `a95df8b8e`, `a7daa8a7d`): `ApplyDictionariesView/` (the reducer, defaults, inputs,
  targets, the profile, unmatched-value, and preview reads,
  `MatchColumnsStep/`, `UnmatchedValuesStep/`, `PreviewDrawer/`,
  `SaveAsStep/`, the header, stepper, step heading, facts, and step
  labels), `src/lib/dataDictionaries/{ColumnProfileSql,profileDatasetColumns}/`,
  and `src/hooks/workspaces/useCanCreateDatasets/` with
  `src/hooks/datasets/useIsUnderDatasetLimit/useIsUnderDatasetLimit.ts`.
  `1c320c62d` profiles a converted column as its stored type, so Apply on a
  linked dataset can read its columns. `dbc4f876c` keeps the preview's
  hidden text inside the drawer. The final review fixed these:
  `39bbce3dd` drops a saved map override to a code its list no longer
  holds when the flow opens, and never sends it, since the RPC refused every
  save with `binding_payload_invalid`. `2b5a84053` forgets a removed
  dictionary's value resolutions along with its picks, so a later pick of
  the same column does not inherit them. `73c7c4ade` keeps Save and Attach
  disabled until the unmatched values read lands, because until then
  overrides and added pairs held lowercased keys, not the stored text.
  `2a9bc0850` counts a pending Add to list code that is not a whole number
  when offering Keep as is, since it makes a whole-number column text.
  `8c5e74acf` blocks saving when two values add one code to a list with
  different labels (new `AddedCodeConflictCallout.tsx`, the conflicted
  inputs name the code, and two columns adding the very same pair still
  save). `a95df8b8e` formats these fixes, and `a7daa8a7d` extracts their
  messages into the translation catalogs.
- The dataset page (`402335d0b`, `76d145c3e`, `7663ab9e0`, `6705c3e3c`,
  `dbc4f876c`): `DatasetMetaView/DatasetActionsMenu/`
  (`ApplyDictionaryMenuItem.tsx`, `DatasetActionsMenu.tsx`,
  `DeleteDatasetConfirmBody.tsx`), `DatasetMetaView/DatasetColumnCodes/`
  (`BoundColumnName.tsx`, `ConvertedTypeNote.tsx`,
  `DatasetDictionariesRailGroup.tsx`, `DictionaryUseNote.tsx`,
  `describeDictionaryUses/`), `LinkedSourceFact.tsx`,
  `DatasetSourceRail.tsx`, `DatasetMetaView.tsx`,
  `DatasetMetadataList.tsx`,
  `DatasetSummaryView/ColumnSection/ColumnSection.tsx`, and
  `src/hooks/datasets/useLinkedDatasets/`.
- The popover (`7663ab9e0`, `127334468`, `53e713f24`, `313b13d14`):
  `src/components/dataDictionaries/CodeListPopover/` (the converted note,
  `UnlabeledValuesNote.tsx`, `useUnlabeledValueCount.ts`,
  `buildUnlabeledValueCountSql/`, and the keyboard path into and out of the
  link).
- The Dictionary view (`238ee4188`):
  `src/views/DataManagerApp/DataDictionaryView/` (`useDictionaryUsage/`,
  `DictionaryUsedByTab/` with `HowAppliedCell.tsx` and
  `UsageStatusCell.tsx`, `DataDictionaryEditor/DataDictionaryEditor.tsx`,
  and `useSaveDataDictionary.ts`, which now also refreshes the dataset
  columns and the cached rows). `a62e71b49` adds
  `DataDictionaryActionsMenu/invalidateAfterDictionaryDelete.ts`:
  deleting a dictionary removes its reference bindings and pins its convert
  bindings on the server, so the dataset bindings, columns, and rows are
  refreshed too, where only the dictionary list was.
- Test docstrings (`e6aebba2b`): the tests for `CodeListPopover`,
  `DatasetDictionariesRailGroup`, `describeDictionaryUses`,
  `DatasetMetadataList`, and `LinkedSourceFact` no longer name plan tasks.
- Evals (`da036466e`, `8f6abcc07`, `f05473c46`, `682fbf212`):
  `scripts/ai-eval/measles/`, `scripts/ai-eval/runtime/EvalDatabase.ts`
  (a column's `sourceSql`), `docs/ai-agent/eval.md`, and
  `docs/ai-agent/eval-runs/` (the converted-column runs).
- E2E (`161f24881`, `766c39961`, `029c51b19`):
  `tests/e2e/dictionary-apply-linked.spec.ts` (new) and
  `dictionary-apply-reference.spec.ts` (the three-step flow).
- Translations (`c9e47cd9f`, `a7daa8a7d`): `src/i18n/locales/*/messages.{po,ts}`,
  regenerated with `pnpm i18n:extract && pnpm i18n:compile`, never copied.

**Schema:** yes, two migrations. `dictionary_conversions` holds the binding's
`keeps_original`, `value_overrides`, `pinned_pairs`, `pinned_is_ordered`, and
`replaced_data_type` with the reference-only check;
`dataset_columns.dictionary_binding_id` and
`datasets__virtual.linked_source_dataset_id`, both managed; the
pin-on-delete triggers that replace the remove-reference ones; the
re-pointing of reference bindings and the re-derived types in
`rpc_data_dictionaries__save`; and `rpc_dataset_columns__apply_dictionaries`
(now with conversions and added pairs),
`rpc_dataset_columns__apply_dictionaries_as_linked_dataset`, and
`rpc_dataset_columns__reapply_dictionary` (used from F134).
`dictionary_conversion_fixes` retypes columns from `coalesce(pinned_pairs,
live pairs)` and adds the Data Sources editor check to both apply RPCs. Each
has its desktop SQLite twin. Regenerate each migration with
`supabase-declarative-schema`, never copy it.

**Deploy:** both migrations together first, then the `chat` edge function,
then the frontend. Tabs opened before the deploy send the old two-argument apply
call, which the new RPC's defaulted third argument still accepts.

**Known gaps:** converting in place, its synced-data warning, and Re-apply
are F134 (the RPCs are here). Pipelines (`packages/node/etl`,
`apps/pipeline-server`) read stored files and see raw values, as they do for
renames. Another user's open tab follows a code-list edit when its cached
list goes stale (6 minutes online) or on reload. "Restore original values"
as its own action, write-back to live sources, crosswalks (slice 5), and
"Add from datasets" into an existing dictionary stay out. A linked dataset's
cached rows do not follow a rename or cast on its source's columns, as for
any virtual dataset. A published snapshot stores an ordered column as text,
so a public chart sorts its labels alphabetically unless the chart sorts
explicitly. Every workspace query reads its datasets' bindings and code
lists, mostly from the query cache; a refetch past the 6-minute stale time
happens while the query holds its DuckDB lease. The offline
agent missed D04 in the converted-columns eval (recorded, not gated).
Several deleted dictionaries in one dataset's rail collapse into one "A
deleted dictionary" row. A linked dataset's page and preview list a
converted column whose type changes (`GENDER` and `ses_cat`, whole numbers
to text) after its other columns, in the order the load-time view selects
them; `column_idx` keeps the source's order. The Data Summary
shows only a column's most common values, so an ordered list's order shows
in a grouped query, not there. A workspace member who is not an admin never
reaches the disabled Save as card on an upload: Convert all and the row
chips are already disabled at Match columns, with the same reason. After a
reload, queries on an offline-only upload fail. This predates this feature,
and F135 (`fix/offline-upload-reload`) fixes it.
Shift+Tab is the only way back from the code-list popover's link to its tag.
Tab from the link continues to the next control.

**Verification:**
```sh
ava supabase status
pnpm lint
pnpm exec tsc -b --force --noEmit && pnpm type-check:deno
deno info --config supabase/functions/chat/deno.json supabase/functions/chat/index.ts 2>&1 | grep -iE "error|not found|unable to"
pnpm test:frontend
pnpm vitest run --config vitest.executed.config.ts src/clients/qetl src/clients/DuckDbClient src/lib/dataDictionaries src/components/dataDictionaries src/lib/agent/dataAgent/pagePrivacy
pnpm vitest run scripts/ai-eval
pnpm test:db
ava supabase migrations validate
pnpm desktop:sqlite:gen-migrations
pnpm test:desktop
pnpm i18n:check
pnpm test:e2e dictionary-apply-linked.spec.ts
pnpm test:e2e dictionary-apply-reference.spec.ts
pnpm test:e2e dictionary-create-from-dataset.spec.ts
pnpm test:e2e data-dictionary-edit.spec.ts
pnpm test:e2e data-explorer-grid-layout.spec.ts
pnpm test:e2e data-explorer-query-drawer.spec.ts
pnpm test:e2e dashboard-workspace-publishing.spec.ts
pnpm test:e2e web-offline-mode.spec.ts
pnpm test:e2e agent-chat-result.spec.ts
```

## F134: Convert a dataset in place

Status: built on `feat/dictionary-conversions` after F133's commits. Split
into its own PR from the commits after F133's log entry (`a77b2eed9`). No
PR is open.

**Purpose:** An upload, synced or offline only, is converted in place from
Save as's **Change <dataset>** card, whose copy depends on where the dataset
lives: a synced upload "Rewrites the uploaded data in place. It is synced to
the workspace, so this changes it for everyone who uses it.", and an offline
upload "It is offline only, so nobody else is affected." A synced upload
needs "I understand this changes <dataset> for the whole workspace" ticked
before **Change n columns** enables. A live connection and a dataset a
linked dataset reads cannot be changed in place, and the disabled card says
why ("<source> data can't be changed from Avandar yet, so a linked dataset
is the only option for now.", or "<linked dataset> reads this dataset, so
converting it here would convert twice. Change the linked dataset instead.",
with "A linked dataset" until the name loads). The
conversion is pinned to the dictionary version applied, so later edits do
not reach it. The dataset rail and Used by say "Applied version n, now
version m" and offer **Re-apply** to someone who can edit the dataset, with
a confirmation on a synced upload, read when Re-apply is clicked. A dataset
converted in the session that uploaded it shows the conversion: a table an
upload's transcode loaded outside the queryable tier's recorder counts as
current only while the dataset needs no renames, casts, or conversions, and
a conversion reads the dataset's columns with `fetchQuery`, so it no longer
takes a column's pre-conversion type from invalidated cached rows. The
dataset page shows a converted column's new type as soon as the refetch
lands, and keeps its columns in table order.

**Value:** A team that wants one dataset of labels, not two, gets it without
re-uploading, and a dictionary edit never changes a shared dataset without
someone choosing to.

**Design:** `docs/measles-demo/data-dictionaries-design.md` (sections 6.6
and 7.5) and `docs/measles-demo/data-dictionaries-4-conversions-plan.md`
(Part B).

**PR title:** `feat(data-dictionaries): convert datasets in place and re-apply dictionaries`

**Depends on:** F133.

**Files, by area** (`ApplyDictionariesView/` is
`src/views/DataManagerApp/ApplyDictionariesView/`, `DatasetMetaView/` is
`src/views/DataManagerApp/DatasetMetaView/`, and `DataDictionaryView/` is
`src/views/DataManagerApp/DataDictionaryView/`):

- Profiling a converted dataset (`0e7c23ed4`):
  `ApplyDictionariesView/useDatasetProfiles.ts` and its test (a converted
  column without a replaced type is profiled as detected).
- The client and hook (`c055c0854`):
  `src/clients/dataDictionaries/DictionaryBindingClient.ts`
  (`reapplyDictionary`) and
  `src/hooks/dataDictionaries/useReapplyDictionary/`.
- The Save as card (`08af7bcc8`, `79d071a55`, `27deb6c7e`):
  `ApplyDictionariesView/SaveAsStep/{ChangeDatasetCard,SaveTargetCards}.tsx`
  with `ChangeDatasetCard.test.tsx`, and
  `ApplyDictionariesView/applyTargets/` with `useApplyTargets.ts`.
  `27deb6c7e` makes the Change card name the linked dataset that reads this
  one and say that converting here would convert twice, falling back to "A
  linked dataset" while the name has not loaded.
- Re-apply (`6f5fd62a8`, `1f2459c4a`, `83af03334`):
  `src/components/dataDictionaries/ReapplyButton/`,
  `DataDictionaryView/DictionaryUsedByTab/` (`DictionaryUsedByTab.tsx`,
  `DictionaryUsedByTable.tsx`, `UsageStatusCell.tsx`),
  `DataDictionaryView/useDictionaryUsage/`,
  `DataDictionaryView/DataDictionaryEditor/DataDictionaryEditor.tsx`,
  `DatasetMetaView/DatasetColumnCodes/` (`DatasetDictionariesRailGroup.tsx`,
  `DictionaryUseNote.tsx`), and `DatasetMetaView/DatasetSourceRail.tsx`.
  `83af03334` sets "Applied version n, now version m" in ink, not warning
  yellow, which was about 1.6:1 on white.
- Showing a conversion in the uploading session (`35db27b15`, `1ca97e30f`):
  `src/clients/qetl/QueryMediator/QueryableRelationColumns/`,
  `src/clients/qetl/QueryMediator/getRelationSources.ts` (docstring),
  `src/lib/dataDictionaries/loadColumnReplacements/`, the QETL tests that
  stub the recorder (`QueryMediator.coordination.test.ts`, and
  `__tests__/{QueryMediator.concepts,relationCacheOrdering,relationCacheProjection,probeRelationCache}.test.ts`),
  and `docs/qetl-architecture.md`.
- The dataset page after converting (`b2c351b6c`, `25da4ee87`):
  `packages/web/ui/src/ObjectDescriptionList/DescribableValueArrayBlock/ObjectArrayBlock/ObjectTableRow.tsx`
  with `ObjectDescriptionList.test.tsx` (an editable row shows its current
  data outside edit mode, so a converted column's type is not stale until a
  reload), and `DatasetMetaView/DatasetMetaView.tsx` with
  `DatasetMetaView/toColumnsInTableOrder/` (columns by `column_idx`, since
  Postgres returns an updated row last).
- E2E (`e24570b96`): `tests/e2e/dictionary-apply-in-place.spec.ts` (new).
- Translations (`3db99f7b8`): `src/i18n/locales/*/messages.{po,ts}`,
  regenerated with `pnpm i18n:extract && pnpm i18n:compile`, never copied.

**Schema:** none. F133's migration carries the pinned columns and
`rpc_dataset_columns__reapply_dictionary`.

**Deploy:** the frontend.

**Known gaps:** "Restore original values" as its own action stays on the
roadmap; switching a converted column back to Reference only in Apply
already restores its values. Write-back to live sources stays out. A
dataset whose import set a rename or cast, uploaded and then taken offline
before its first catalog query, is no longer served from its
transcode-loaded table: the rebuild needs the file. Before, it was served
without its projection, which was wrong. `b2c351b6c` changes the published
`@avandar/ui` package, so its auto-changeset bumps a patch.

**Verification:**
```sh
ava supabase status
pnpm lint
pnpm exec tsc -b --force --noEmit && pnpm type-check:deno
deno info --config supabase/functions/chat/deno.json supabase/functions/chat/index.ts 2>&1 | grep -iE "error|not found|unable to"
pnpm test:frontend
pnpm --filter @avandar/ui test
pnpm vitest run --config vitest.executed.config.ts src/clients/qetl src/clients/DuckDbClient src/lib/dataDictionaries src/components/dataDictionaries src/lib/agent/dataAgent/pagePrivacy
pnpm vitest run scripts/ai-eval
pnpm test:db
ava supabase migrations validate
pnpm desktop:sqlite:gen-migrations
pnpm test:desktop
pnpm i18n:check
pnpm test:e2e dictionary-apply-in-place.spec.ts
pnpm test:e2e dictionary-apply-linked.spec.ts
pnpm test:e2e dictionary-apply-reference.spec.ts
pnpm test:e2e dictionary-create-from-dataset.spec.ts
pnpm test:e2e data-dictionary-edit.spec.ts
pnpm test:e2e data-explorer-grid-layout.spec.ts
pnpm test:e2e dashboard-workspace-publishing.spec.ts
pnpm test:e2e web-offline-mode.spec.ts
```

---

## F135: Offline-only uploads keep their rows after a reload

Status: not started. Built on `fix/offline-upload-reload`, branched from
`demo/measles` at `6518c3aa5`. No PR is open.

**Purpose:** A CSV, Excel, or PDF dataset kept offline ("This computer only")
showed its rows only in the tab that uploaded it. After a reload its column
summaries and every new query failed, because the dataset Parquet wrapper
downloaded every uploaded file from cloud storage, where an offline-only file
has nothing. The wrapper now reads the Parquet this device kept
(`LocalDataset.parquetData`) when the file's source record says it was never
stored. It waits for a transcode a reload resumed first. When a download
fails for any other file, it falls back to the same local copy, which also
covers a cached source record that has not yet seen the file made
offline-only.

**Value:** Offline-only datasets, the option for data that must not leave the
device, keep working across reloads.

**PR title:** `fix(datasets): read an offline-only upload's rows from this device after a reload`

**Depends on:** nothing beyond `demo/measles`.

**Files, by area** (`cf84a5af0`):

- `src/clients/qetl/wrappers/DatasetParquetWrapper/DatasetParquetWrapper.ts`:
  `_readStoredFileParquet`, `_isKeptOffline`, and `_findLocalParquet`.
- `src/clients/qetl/wrappers/DatasetParquetWrapper/DatasetParquetWrapper.test.ts`:
  the local read, the resumed-transcode wait, the missing-copy error, and the
  fallback when storage has no copy or the download fails.
- `tests/e2e/offline-only-upload-reload.spec.ts`: uploads with cloud storage
  off, reloads, and reads a column summary. The preview's rows come back from
  the persisted query cache, so the spec asserts on a summary first read
  after the reload. It waits for the persister to write the workspace's
  dataset list first: a reload within its 1-second throttle restores a list
  without the new dataset, and the workspace check then denies the query.

**Schema:** none.

**Deploy:** the frontend.

**Known gaps:** a reload within a second of saving a dataset restores a
workspace dataset list without it, so its queries are denied until that list
refetches. That is the persister throttle `ALWAYS_REFETCH_ON_MOUNT` describes,
not this fix.

**Verification:** `pnpm exec tsc -b --force --noEmit`, `pnpm vitest run
src/clients/qetl src/clients/datasets`, and `pnpm test:e2e
offline-only-upload-reload.spec.ts`, which fails on the old wrapper (no column
summary after the reload) and passes on this one. The e2e ran against
`feat/dictionary-conversions`' switched stack, because the shared `avandar`
stack predates `demo/measles`' migrations.

## F136: Crosswalks and the combined dataset

Status: built on `feat/crosswalks`, branched from `demo/measles` at
`ea3481332`. No PR is open.

**Purpose:** A Data Sources editor opens **New crosswalk**, adds datasets
whose columns are named differently (`zip_code`, `zip`, `postal_code`), and
maps them onto one reference layout, one layout family at a time: datasets
with the same column names are mapped once, together. Step 1 groups the
datasets into layouts and suggests the reference that covers the most columns
of the others. Step 2 prefills every layout by name and type, then by values
once the layout is read, and carries fills over from the most similar layout
already mapped. Each column is filled from a source column (with a date
format, zero padding, a factor, or trimming, or translated through a
dictionary code list), a fixed value, a Combine expression, or nothing, with a
before/after example from the SQL the combined dataset runs. Step 3 previews
the stacked rows and saves a combined dataset: a virtual dataset that stacks
every mapped dataset with `UNION ALL BY NAME`, with codes reconciled to the
governing entry's primary list as labels or codes, a `source_dataset` column,
and reference bindings on its coded columns, so the code-list tag, Ask
Avandar, and Used by work with no new agent code. **Export mapping**
downloads the mapping as CSV. A fingerprint of each embedded code list drives
a banner when a list changed, and Used by lists the combined dataset as
Crosswalk with that status. The combined dataset's rail names its crosswalk,
Apply a dictionary is hidden on it, and refreshing a source clears its cached
rows.

**Value:** A hundred line lists exported by different systems become one
dataset to chart, filter, and ask about, with "1", "M", and "Male" all
reading Male, and a mapping a colleague can review.

**Design:** `docs/measles-demo/data-dictionaries-design.md` and
`docs/measles-demo/data-dictionaries-5-crosswalks-plan.md` (Part A).

**PR title:** `feat(crosswalks): combine datasets with different layouts through a crosswalk`

**Depends on:** F129 to F134.

**Files, by area** (`SC/` is `shared/models/crosswalks/`, `LC/` is
`src/lib/crosswalks/`, `CV/` is `src/views/DataManagerApp/CrosswalkView/`,
`DatasetMetaView/` is `src/views/DataManagerApp/DatasetMetaView/`, and
`DataDictionaryView/` is `src/views/DataManagerApp/DataDictionaryView/`):

- Docs (`b2e9fa801`, `d37ab2627`, `28f1c1a28`, and the commit that adds
  this entry): the plan in
  `docs/measles-demo/data-dictionaries-5-crosswalks-plan.md`, the spec edits in
  `data-dictionaries-design.md`, and this log.
- Schema, migration, desktop twin, and pgTAP (`0342d9410`, `3ac14c859`): the
  four `supabase/schemas/00.enum.crosswalks__*.sql` files, `11.crosswalks.sql`,
  `20.crosswalks__layouts.sql`, `21.crosswalks__columns.sql`,
  `21.crosswalks__datasets.sql`, `22.crosswalks__mappings.sql`,
  `50.rpc_crosswalks__save.sql`, and
  `71.rpc_crosswalks__save_combined_dataset.sql`; the generated
  `supabase/migrations/20261114171619_crosswalks.sql` and its twin
  `apps/desktop/migrations/20261114171619_crosswalks.gen.sql`;
  `apps/desktop/sync/syncable-tables.ts`; `shared/types/database.types.ts`;
  `supabase/tests/database/permissions/{rls_crosswalks,rls_crosswalks__children,exact_data_api_grants}.test.sql`;
  and
  `supabase/tests/database/crosswalks/{rpc_crosswalks__save,rpc_crosswalks__save_combined_dataset}.test.sql`.
  `3ac14c859` is the review fix: the hints `crosswalk_has_unreadable_datasets`
  and `output_dataset_in_crosswalk`, a membership keeping its id when its
  layout drops, null payload sets refused, and `id` guarded. Regenerate the
  migration with `supabase-declarative-schema`, never copy it.
- Shared models (`ccbfd332d`, `26df590ec`, `8c0e55864`, `464e93afc`,
  `57f9c5d94`, `fc0b4d11d`): `shared/utils/fnv1a64Hex/`,
  `shared/models/datasets/AvaDataType/AvaDataTypeModule.ts`
  (`toDuckDbTypeSql`), `SC/{Crosswalk,CrosswalkLayout,CrosswalkDataset,CrosswalkColumn,CrosswalkMapping,CrosswalkMatch,CrosswalkSql}/`,
  and `shared/models/dataDictionaries/DictionaryMatch/DictionaryMatchModule/DictionaryMatchModule.ts`
  (`getBestCodeList`). `fc0b4d11d` matches DuckDB's names and types when
  grouping and stacking datasets, and `CrosswalkSql` reports
  `column_types_differ` for a dataset whose column type cannot stack.
- The browser engine (`4c6ba16e5`, `286f5b38a`, `6ab82052e`, `ea5e6e4aa`,
  `b1aa292dc`, `1fea566ce`, `1cc63fd7e`, `539d28a69`, `2b5ebde5e`):
  `LC/{CrosswalkDraft,validateCombineExpression,compileCrosswalk,detectDateFormats,toDateFormatLabel,buildCodeListLookups,clearCombinedDatasetCaches,buildMappingCsvRows,isCrosswalkStale}/`,
  with the executed tests `LC/__tests__/CrosswalkSql.executed.test.ts` and
  `LC/detectDateFormats/DateFormatSql/DateFormatSql.executed.test.ts`;
  `src/lib/dataDictionaries/ColumnProfileSql/ColumnProfileSql.ts`
  (`DATE_FORMATS`, `buildDateSampleSql`). Layout keys and fills never trim
  names. `2b5ebde5e` closes the CSV formula escape gap in
  `buildMappingCsvRows` and tightens the combined dataset checks.
- Clients (`f9388a8da`): `src/clients/crosswalks/`.
- Permission, routes, and the list (`a2c127a26`): `PermissionRegistry.ts`,
  `AppLinks.tsx`, `src/routes/_auth/$workspaceSlug/data-manager/crosswalks/{new,$crosswalkId}.tsx`,
  `useListPaneToggle/`, `DatasetNavbar/`, `DataManagerToolbarActions/`
  (`NewCrosswalkButton.tsx`), `DataManagerApp.tsx`,
  `src/views/DataManagerApp/useDataManagerLists/`, and the committed
  `src/routeTree.gen.ts`.
- The crosswalk view (`4ce1905f4`, `b25b27a8c`, `70e95bce5`, `1ea150498`,
  `8a6d1f1c1`, `34c6bec75`, `66caa70bc`, `b1aa292dc`, `bf6902357`,
  `1fea566ce`, `c27deb99f`, `1cc63fd7e`, `539d28a69`, `07770e7a1`,
  `2b5ebde5e`): `CV/` (the reducer, the loading hooks, the shell and header
  with `ExportMapping/` and `CrosswalkStaleBanner/`, `layoutLabel/`, the
  three steps, and the fixtures in `CV/__tests__/` and
  `CV/MapLayoutsStep/__tests__/`), and step 1's locked rows in
  `NewDictionaryFromDatasetsView/PickDatasetsStep/{PickDatasetsTable,PickDatasetRow}.tsx`.
  `34c6bec75` serializes saves and saves before a step change. `07770e7a1`
  makes the reducer re-choose a guessed code list from the values once a
  column is governed, and mark a re-governed column's cleared fills with
  reason `name_and_type`. `flow.selectLayout` opens the layout even when its
  save fails.
- The combined dataset elsewhere (`539d28a69`, `2b5ebde5e`):
  `src/hooks/crosswalks/`, `DataDictionaryView/useDictionaryUsage/`,
  `DataDictionaryView/DictionaryUsedByTab/` (`HowAppliedCell.tsx`,
  `UsageStatusCell.tsx`, `DictionaryUsedByTable.tsx`, `OpenCrosswalkLink.tsx`),
  `DatasetMetaView/CombinedByFact/`, `DatasetMetaView/DatasetSourceRail.tsx`,
  `DatasetMetaView/DatasetActionsMenu/{DatasetActionsMenu,DictionaryMenuItems}.tsx`,
  and `DatasetMetaView/clearCachedDatasetRows.ts`.
- E2E (`7acb100b3`): `tests/e2e/crosswalk-map-and-combine.spec.ts`,
  `tests/data/crosswalk-line-lists/`, `tests/e2e/helpers/constants.ts`, and
  `tests/e2e/helpers/seedDataDictionary.ts` (a second coding per entry).
- Translations (`5fd4700d7`): `src/i18n/locales/*/messages.{po,ts}`,
  regenerated with `pnpm i18n:extract && pnpm i18n:compile`, never copied.
  The extraction left each locale's new messages untranslated, since
  machine translations are added by the pre-push hook.

**Schema:** yes, one migration (`crosswalks`): four enums; `crosswalks` with
its managed `output_dataset_id`, `compiled_at`, and `compiled_code_lists`; the
four select-only child tables; `rpc_crosswalks__save` and
`rpc_crosswalks__save_combined_dataset`; and its desktop SQLite twin.
Regenerate it with `supabase-declarative-schema`, never copy it.

**Deploy:** the migration, then the frontend. No edge function changes: Ask
Avandar reads the combined dataset's reference bindings as it reads any
dataset's. The desktop app syncs the five tables from its next build.

**Known gaps:** AI meaning suggestions for mappings, the virtualized layout
list past 100 layouts, per-dataset progress while combining, and the
100-dataset measurement are F137. The first combine of many datasets reads
them one at a time and can take minutes. A combined dataset's rail and popover
say its codes are "Attached as reference · data unchanged", though the
crosswalk translated them; the values shown are right. A code list the viewer
cannot read counts as changed in the stale banner and Used by. Refreshing a
source clears the combined dataset's cached rows in this tab; another tab
follows through the virtual dataset's dependency staleness. A dataset whose
columns changed since it was mapped is left out until it is removed and added
again. Export mapping exports the draft as shown, unsaved edits included.
Layouts and mappings are visible to Data Sources viewers even when every
member dataset is restricted: the column names, source columns, and fills of
a restricted dataset that is alone in its layout are readable, while the
membership rows stay hidden. This is accepted, since hiding layouts from
viewers would hide them from the save payload, and the save would then delete
them. The lock order between combining and a
dataset delete is not settled. On the desktop, the unique-index ordering
exposure and `updated_at` churn come from the park-names step of the column
reconcile. Combine matches columns by name, so a column the user renamed in
the combined dataset loses its description on the next combine. In Codes mode
a value that matches no pair of its list passes through as text. Two editors
saving one crosswalk at once: the last save wins. Removing a column drops its
mappings without asking. `rpc_dataset_columns__apply_dictionaries` does not
refuse a combined dataset, so only the interface hides Apply a dictionary on
one. Refreshing a source does not reach a combined dataset through a linked
dataset. `validateCombineExpression` accepts aggregates and bare identifiers
that fail when the combine runs. Going Back, or leaving the page, with unsaved
edits has no unload guard. `ava supabase migrations
validate` check 5 fails on storage migrations that predate this work.
Side-by-side joins, write-back to live sources, and "Add from datasets" into
an existing dictionary stay out.

**Not done:** the headless screenshots of the crosswalk steps and the look-at-it
comparison against spec section 7.6 (Task 27, Steps 1 and 2) were never taken,
because the Playwright MCP was unavailable. That includes the keyboard-only
pass, the narrow stub at 900 px, the offline Map step, the non-admin Create
button, and the opened Export mapping CSV. The Playwright spec exercises the
map and combine flow, and `impeccable detect` reports nothing on the touched
folders.

**Verification:**
```sh
ava supabase status
pnpm lint
pnpm exec tsc -b --force --noEmit && pnpm type-check:deno
pnpm test:frontend
pnpm vitest run --config vitest.executed.config.ts src/lib/crosswalks src/lib/dataDictionaries src/clients/qetl src/components/dataDictionaries
pnpm test:db
ava supabase migrations validate
pnpm desktop:sqlite:gen-migrations
pnpm desktop:sqlite:check-migrations
pnpm test:desktop
pnpm i18n:check
pnpm test:e2e crosswalk-map-and-combine.spec.ts
pnpm test:e2e dictionary-apply-linked.spec.ts
pnpm test:e2e dictionary-apply-reference.spec.ts
pnpm test:e2e data-dictionary-edit.spec.ts
pnpm test:e2e web-offline-mode.spec.ts
```

## F137: Crosswalks at scale

Status: built on `feat/crosswalks` after F136's commits. Split into its own PR
from the commits after F136's log entry (`253e60d0b`). No PR is open.

**Purpose:** **Suggest matches** in step 2 asks the suggestion model which of
a layout's unused columns mean the combined dataset's unfilled columns (`dob`
and `birth_date`), through the create flow's `dictionary-suggestions-v1`
prompt and consent gate, online or on the offline model. Each pair becomes a
suggested fill marked "Meaning" that the user accepts or rejects, and a
governed column gets the code list that fits the source's values. Only names,
kinds, and the codes of short coded columns not named after a person are sent.
With no model, or after a decline, the button is off and says why. Past 100
layouts the stub renders only the rows in view, keeping the listbox's keyboard
and `aria-setsize`. Step 3 says "Read {count} of {total} datasets" with a bar
while the preview reads, from a new `onRelationFetched` callback threaded from
`WorkspaceQuerySession.runQuery` through relation loading, including nested
virtual queries. The 100-dataset measurement and its decision are in
`docs/measles-demo/crosswalks-materialization.md`.

**Value:** A state combining a hundred county line lists maps columns with
unrelated names without hunting for them, keeps a usable stub at any size, and
sees the first combine progress instead of a spinner. The measurement settles
open decision 4 with numbers.

**Design:** `docs/measles-demo/data-dictionaries-design.md` (sections 8.4, 9,
14, and 18) and `docs/measles-demo/data-dictionaries-5-crosswalks-plan.md`
(Part B).

**PR title:** `feat(crosswalks): suggest matches, scale the layout list, and measure combining at 100 datasets`

**Depends on:** F136.

**Files, by area** (`CV/` is `src/views/DataManagerApp/CrosswalkView/`,
`LC/` is `src/lib/crosswalks/`, and `QM/` is `src/clients/qetl/QueryMediator/`):

- Meaning suggestions (`a66ba38e8`): `DictionarySuggestions.ts` gains
  `makeMatchesRequestFromColumns` (in `src/lib/dataDictionaries/DictionarySuggestions/`,
  with its test); `LC/makeCrosswalkMatchesRequest/` and
  `LC/__tests__/meaningMatchFixtures.ts`; the `meaning_matches_found` action in
  `CV/crosswalkReducer/crosswalkReducer.types.ts`, its `HANDLERS` entry in
  `crosswalkReducer.ts`, and `applyMeaningMatches` in
  `CV/crosswalkReducer/prefillCrosswalkLayout.ts`;
  `CV/MapLayoutsStep/useCrosswalkMeaningMatches/useCrosswalkMeaningMatches.ts`
  with `useCrosswalkSuggestionConsent`,
  `CV/MapLayoutsStep/SuggestMatchesButton/SuggestMatchesButton.tsx`, the
  `MapLayoutsFooter.tsx` slot, and `MapLayoutsStep.tsx`.
- The long stub (`ff2cb68a9`):
  `CV/MapLayoutsStep/LayoutStub/LayoutStubList/LayoutStubList.tsx`,
  `LayoutStub.tsx`, `LayoutStubRow.tsx` (the row's `positionInList`),
  `useLayoutListKeyboard.ts` (`scrollToLayout`), and `LayoutStub.module.css`.
- Review fix for the two above (`a648f3e87`): a cut meaning request keeps both
  sides of a pair and the button says why it is off
  (`LC/makeCrosswalkMatchesRequest/`, `SuggestMatchesButton.tsx`,
  `useCrosswalkMeaningMatches.ts`), and `LayoutStubList.tsx` clears
  `aria-activedescendant` when its row is outside the window.
- Combining progress (`d4c1773ff`, `90f964bd4`): `QM/QueryMediator.types.ts`
  (`onRelationFetched`), `QM/QueryMediator.ts`, `QM/queryRunner.ts`,
  `QM/relationLoading/RelationLoading.ts`,
  `QM/relationLoading/createRegistryForFetch.ts`,
  `src/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession.ts`,
  `QM/notifyRelationFetched/notifyRelationFetched.ts` (`90f964bd4`: a failing
  listener cannot affect a combine, and a stale read is ignored),
  `docs/qetl-architecture.md`,
  `CV/CombineStep/useCombiningProgress/useCombiningProgress.ts`,
  `CV/CombineStep/CombiningProgress/CombiningProgress.tsx`,
  `CV/CombineStep/useCombinedPreview/useCombinedPreview.ts`,
  `CV/CombineStep/CombinedPreview/CombinedPreview.tsx`, and
  `CV/CombineStep/CombineStep.tsx`, with the tests beside each and
  `QM/__tests__/relationFetchedProgress.test.ts`.
- The measurement (`f02460f56`, `2cccdd0bf`):
  `LC/combinedPreviewTiming/combinedPreviewTiming.ts` (the
  `crosswalks:combined-preview` performance measure, used in
  `useCombinedPreview.ts`), `scripts/crosswalks/{seedCrosswalkMeasurement,cleanupCrosswalkMeasurement,measurementOutput}.ts`,
  `scripts/crosswalks/crosswalkMeasurementPlan/`,
  `scripts/crosswalks/requireLocalSupabase/`,
  `docs/measles-demo/crosswalks-materialization.md`, and the spec's section 18
  and roadmap in `docs/measles-demo/data-dictionaries-design.md`.
- Translations (`abdafb519`): `src/i18n/locales/*/messages.{po,ts}`,
  regenerated with `pnpm i18n:extract && pnpm i18n:compile`, never copied. The
  extraction left each locale's new messages untranslated, since machine
  translations are added by the pre-push hook.
- Docs (the commit that adds this entry): this log, and the Part B status line
  in `data-dictionaries-design.md`.

**Schema:** none. F136's migration carries everything Part B reads, and Part B
adds no table, column, RPC, or desktop twin.

**Deploy:** the frontend only. The `chat` function is unchanged (same prompt,
same route).

**Known gaps:**

- **Measurement decision for the owner.** The 100-dataset measurement ran cold
  and throttled at 67.7 s, 100% "reading", and the rule as written (build
  parallel acquisition above 60 s with at least 70% reading) says to build it.
  But the timer's `readingMs` starts at the preview's start, so it counts the
  DuckDB engine and Parquet extension download (about 36 s, before the first
  dataset) as reading. Read strictly as dataset downloads, about 32 s for 100
  datasets read one at a time, which is under the 60 s line, and a session
  whose DuckDB is already running does not pay the other 36 s. The doc records
  the rule as met. Whether to schedule parallel acquisition is the owner's
  call, and nothing in this PR builds it.
- The measurement used the branch's local Supabase and DevTools throttling
  (Fast 4G) as a stand-in for production, on one machine.
- **Suggest matches** `foundCount` ("Found 3 more matches") counts the pairs
  the model returned, not the fills that were applied, so it can exceed what
  the user sees when a pair is dropped.
- `aria-activedescendant` on the long layout list can name an off-screen
  virtual row. It is cleared when the row is outside the rendered window, so
  a screen reader announces nothing for it until the row scrolls back.
- The progress line says "Read N of M" when a dataset's bytes arrive, before
  they are loaded into DuckDB.
- A nested query can report a dataset more than once. The hook de-duplicates
  by dataset.
- A meaning reply that arrives after the user leaves the layout is applied to
  that layout, but on return the button shows idle rather than "Found".
- A meaning match suggests the source column and, for a governed column, a
  code list, but never a conversion (a date format or padding). The user sets
  those in the pane. Suggestions run once per press, for the selected layout
  only, not across every layout.

**Not done:** the headless screenshots of the new controls and the look-at-it
comparison against spec sections 7.6 and 8.4 (Task 33, Steps 1 and 2) were
never taken, because the Playwright MCP was unavailable. That includes the
ready, consent, found, offline, and nothing-left states of **Suggest matches**,
the long stub, and the combining progress line at 1280 px. `impeccable detect`
reports nothing on `CV/MapLayoutsStep` and `CV/CombineStep`.

**Verification:**
```sh
ava supabase status
pnpm lint
pnpm exec tsc -b --force --noEmit && pnpm type-check:deno
pnpm test:frontend
pnpm vitest run --config vitest.executed.config.ts src/lib/crosswalks src/lib/dataDictionaries src/clients/qetl src/components/dataDictionaries
pnpm test:db
pnpm test:desktop
pnpm i18n:check
pnpm test:e2e crosswalk-map-and-combine.spec.ts
pnpm test:e2e dictionary-apply-linked.spec.ts
pnpm test:e2e dictionary-apply-reference.spec.ts
pnpm test:e2e data-dictionary-edit.spec.ts
pnpm test:e2e web-offline-mode.spec.ts
```

Results at the commit that adds this entry:

- `ava supabase status` names `feat-crosswalks` as the branch's switched
  project. `pnpm lint` exits 0 (react-doctor's advisory report only).
  `tsc -b --force --noEmit` and `pnpm type-check:deno` exit 0.
- `pnpm test:frontend`: 1402 files and 10728 tests pass. The one failing file
  is the known maplibre suite,
  `src/routes/_auth/$workspaceSlug/dashboards/edit/-$dashboardId.test.tsx`
  (`window.URL.createObjectURL is not a function`).
- The executed tests (`vitest.executed.config.ts`): 14 files, 139 tests pass.
  `pnpm vitest run scripts/ai-eval`: 9 files, 74 tests pass.
- `pnpm test:db`: 119 files, 1739 tests, PASS. `pnpm test:desktop`: 13 files,
  95 tests pass. `pnpm i18n:check` exits 0.
- `pnpm desktop:sqlite:check-migrations` reports drift in two twins that Part B
  does not touch (`20261109134745_gadgets_search_stored_prompt.gen.sql` and
  `20261109155144_catalog_loadable_search.gen.sql`). Part B changes nothing
  under `supabase/` or `apps/desktop/`, so the drift is not from this work.
  Part B ran no `gen-migrations` or `migrations validate`, since it has no
  schema change.
- E2E, one at a time and headless: `crosswalk-map-and-combine.spec.ts` passes
  (37.7 s), `dictionary-apply-linked.spec.ts` passes (11.9 s),
  `dictionary-apply-reference.spec.ts` passes (2 tests, 15.1 s and 5.5 s),
  `data-dictionary-edit.spec.ts` passes (10.5 s), and
  `web-offline-mode.spec.ts` passes (7.5 s).
- Timings from the measurement (medians of three, in
  `docs/measles-demo/crosswalks-materialization.md`): cold throttled 67.7 s,
  cold unthrottled 2.1 s, warm storage tier 1.3 s, hot 0.2 s.

---

## F138: Data dictionary QA fixes and the Describe columns step

Status: merged into `demo/measles` on 2026-11-17 (merges `c924b731a`,
`52c4b9bc1`, `b55c4c8a1`, `1841f8f7b`). No PR is open.

**Purpose:** Fixes from a QA pass over the new-dictionary flow. The Review
step is one table whose rows never move when their kind changes, with a
select-all checkbox and separate Entry name and Column source columns. The
UI says "Source value" and "Target value" instead of "code" and "label",
since a dictionary can map labels to codes or one code system to another.
A new Describe columns step lets every entry, including text, number, and
date columns, get a description, with per-entry Suggest and Suggest all that
never rewrites a user's text without asking. Smaller fixes: rounded corners
on the Map values sidebar, Apply a dictionary hidden when the workspace has
no dictionaries, and an info tooltip on Missing value.

**Value:** Changing a kind no longer looks like the column vanished,
description-only columns clearly belong to the dictionary, and the copy no
longer assumes which side of a mapping is human-readable.

**Design:** `docs/measles-demo/data-dictionaries-describe-step-design.md`, and
`docs/measles-demo/data-dictionaries-design.md` sections 4, 13, and 17 (new
roadmap item: display-only target values).

**PR title:** `feat(data-dictionaries): describe every entry, and say source and target values`

**Depends on:** F130, F131, F133, F136 (the copy touches the apply flow,
popovers, and crosswalk surfaces).

**Files, by area:**

- Apply a dictionary hidden with no dictionaries (`c0c167cdb`): new
  `src/hooks/dataDictionaries/useWorkspaceHasDictionaries.ts`,
  `DatasetActionsMenu/DictionaryMenuItems.tsx`, `DatasetActionsMenu.test.tsx`.
- Sidebar radius and Missing value tooltip (`b7a5ecd23`, `a85653a71`):
  `LabelValuesStep/LabelValuesStep.module.css`, new
  `LabelValuesStep/MissingValueHeader.tsx`, `LabelValuesTable.tsx`,
  `LabelValuesStep.test.tsx`.
- One Review table (`4b3fbdbc9`, `5efefef4d`): `ReviewColumnsStep/`
  (`ReviewSections.tsx` deleted, `ReviewEntriesSection.tsx` renamed to
  `ReviewEntriesTable.tsx`, `reviewSectionHelpers.ts` renamed to
  `reviewEntriesHelpers.ts`, `ReviewEntriesTableHead.tsx`, `ReviewEntryRow.tsx`,
  `EntryNameCell.tsx`, the CSS module, tests), `newDictionaryReducer/`
  (`set_all_entries_included`), and the heading the
  `dictionary-create-from-dataset` e2e spec waits on.
- Source and target value copy (`a9bc5a112`, `a15fcbf2a`): new
  `src/components/dataDictionaries/ValueSideHint/`, copy-only edits across
  `NewDictionaryFromDatasetsView/`, `DataDictionaryView/`,
  `ApplyDictionariesView/`, `CrosswalkView/`, `src/components/dataDictionaries/`,
  and e2e assertions. Internal names (`code`, `label`, `decode`/`encode`) are
  unchanged. The merge `b55c4c8a1` resolves its conflicts with the Review
  table: take the merge's versions of `ReviewEntryRow.tsx`,
  `ReviewColumnsStep.test.tsx`, and the e2e spec.
- Describe columns step (`1f85358db`, `c22c998ff`, `c59f4d38f`, `f1228986f`):
  new `NewDictionaryFromDatasetsView/DescribeColumnsStep/`, step wiring in
  `NewDictionaryStepper.tsx`, `useNewDictionaryFlow.ts`,
  `useNewDictionaryStepLabels.ts`, `ProposalStepBody.tsx`, `SaveFooter.tsx`,
  `LabelValuesFooter.tsx`, `EntryDescriptionField.tsx` deleted; the describe
  task and prompt `dictionary-suggestions-v2` in
  `shared/agent/dictionarySuggestions/dictionarySuggestionsPrompt.ts`;
  `isRewriteAllowed` in `DictionaryProposalModule.ts`;
  `makeDescribeRequestFromEntry` in
  `src/lib/dataDictionaries/DictionarySuggestions/`; v1 refusing describe in
  `supabase/functions/chat/PostDictionarySuggestions/`; the Review intro and
  last-cell copy; the "Keep apart" alignment.
- Translations (`0f03b42d5`, `7012e9ba1`, `ec290523a`) and this log.

**Schema:** none.

**Deploy:** the `chat` edge function (new prompt version), then the frontend.

**Known gaps:** no e2e spec was run and the UI was only screenshotted in
preview harnesses, because the shared local stack lacked this branch's
dictionary schema. Run `dictionary-create-from-dataset.spec.ts` on a switched
stack before building the PR. Charts still show the target side of a
reference-attached column (see the roadmap item).

**Verification:** `pnpm exec tsc -b --force`, `deno check`, eslint and
stylelint on changed files, and vitest over `src/views/DataManagerApp`,
`src/components/dataDictionaries`, and the shared dictionary prompt and model.

---

## F139: Dashboard blocks from any page, online and offline

Status: not started. Built on `feat/agent-dashboards`, rebased onto
`demo/measles` at `bfc73f1ef` on 2026-11-18, and not merged into it. This is
Phase 1D of the agent roadmap (decision D44).

**Purpose:** The agent adds one block to a dashboard from any page, with the
`add_dashboard_block` tool and today's ten block kinds. The target is the
dashboard open in the editor, a mentioned or attached dashboard, or one the
user names. The open editor gets the block unsaved, as today's chat does,
because Save confirms it. Any other dashboard gets a confirm card in the
chat: Confirm saves the block to that dashboard and links to it. The browser
finds the dashboard on the device by name, and the model never sees row
values. The offline agent gets the same tool and card on every page. Prompt
`data-agent-v6`, F131's v5 plus the dashboard rules, is served beside v1 to
v5 with its own built-in tool list, and only v6 serves `add_dashboard_block`.

**Value:** A person can ask for a chart or table on a dashboard from any page,
online or offline, and see it added without leaving the chat.

**Eval:** The final runs are on prompt v6 (2026-11-18), recorded in
`docs/ai-agent/eval.md` (`#phase-1d`). Dashboard questions D01 to D09 scored
9/9 on each of three runs, M01 to M06 (with M03b) 7/7, and the 45 questions
45/45, so those bars are met. The offline 45 scored 26/45 against a bar of
26, which is met after a fix (25/45 before it: the offline prompt now carries
the context and dashboard rules only on a turn with blocks or a dashboard in
the message). The offline dashboard questions scored 6/9. The P bar of 7/7
is **missed**: P01 to P07 scored 6/7, because P04 ("make this a pie chart"
with two charts) answered without asking which chart, and it does so on 5 of
10 runs of v5 and of v6 against 0 of 10 on v3 and v4, so the drop came with v5 (the
coded-column rules from `demo/measles`), not with the dashboard rules. The earlier
runs (2026-11-17, before the rebase, on the dashboard prompt as first
numbered: v3 plus the dashboard rules) are kept in `eval.md` as history.

**Design:** `docs/ai-agent/specs/phase-1d.md` and D44 in
`docs/ai-agent/decisions.md`. The task plan is `docs/ai-agent/plans/phase-1d.md`
(see Open decisions).

**PR title:** `feat(ai-agent): add dashboard blocks from any page, online and offline`

**Depends on:** F128 (the card's statuses live in the per-session stores F128
made, and the thread and tray are per session), F89 to F91 (mentions, the
tray, and the `<attached>` block), F81 to F87 (the agent turn, the offline
agent, the adapter, and the page placeholders), F22 (the chat runtime it
extends), F131 (prompt `data-agent-v6` is F131's `data-agent-v5` plus the
dashboard rules), and the plugin AI tools (the proxy lists plugin tools after
v6's built-in tools, and `RESERVED_AI_TOOL_NAMES` now reserves
`add_dashboard_block`).

**Commits to read** (all of `feat/agent-dashboards` after the rebase, oldest
first. The rebase dropped `51c2eab67`, whose v3 freeze test `demo/measles`
already has, and `1a9a157d5`, whose formatting `demo/measles` already has):

| SHA | Subject | Take |
|---|---|---|
| `6bd24f3ef` | docs(ai-agent): add the Phase 1D spec and D44 | All of it. Its `README.md`, `roadmap.md`, and `specs/phase-1.md` hunks are one line each, in the shared rows below. |
| `51d5145f9` | test(ai-eval): add the dashboard questions and today's chat baseline | All of it. Its `eval-runs/` files are the `phase-1d_today-dashboards` runs. |
| `38d7683f3` | docs(ai-agent): revise the Phase 1D spec after a review against the code | All of it. |
| `7ff571d3b` | docs(ai-agent): add the Phase 1D plan | All of it. The plan is open decision 11. |
| `d2eb28953` | updated formatting | All of it: the three `eval-runs/*phase-1d_today-dashboards/summary.json` files. Its harness and `agent-chat-sessions.spec.ts` formatting hunks were already on `demo/measles`. |
| `f7833abf3` | refactor(chat): share dashboard block parsing between the chat and the agent | All of it. |
| `fcb28845e` | fix(chat): read a null block kind as a chart | All of it. |
| `114376fb4` | feat(ai-agent): add add_dashboard_block under prompt data-agent-v6 | All of it. |
| `7d60451b6` | feat(chat): serve and check agent tools per prompt version | All of it. |
| `7fee248f9` | feat(ai-agent): restore placeholders in names the agent writes | All of it. |
| `b31623f6e` | feat(ai-agent): resolve the dashboard the agent names on the device | All of it. |
| `927a968b5` | feat(ai-agent): add the add_dashboard_block tool | All of it. |
| `35acb82c6` | feat(ai-agent): offer the dashboard tool by prompt version | All of it. |
| `c3c2e936c` | feat(ai-agent): restore placeholders in dashboard blocks on the device | All of it. |
| `8ff40bbe7` | feat(ai-agent): tell the agent what the user did with a dashboard card | All of it. |
| `5412ad50c` | feat(ai-agent): cap chart SQL in an offline turn's blocks | All of it. |
| `390264f2e` | test(ai-eval): let the Pi harnesses add dashboard blocks | All of it. |
| `a54d46891` | test(ai-eval): prove device conversations keep real values | All of it. |
| `3a504765e` | feat(chat): keep dashboard card statuses per chat session | All of it. Its `ChatSessionStore.ts` hunks are the shared row below. |
| `5094600c0` | feat(dashboards): append an agent's block to a dashboard safely | All of it. |
| `71cd93da0` | feat(chat): store the agent's dashboard cards as message parts | All of it. |
| `a666b6ba9` | feat(ai-agent): place dashboard blocks from the browser host | All of it. |
| `218f476aa` | refactor(ai-agent): move the agent's turn blocks into their own module | All of it. |
| `ac7b47425` | feat(ai-agent): send card lines and build device turns' blocks | All of it. |
| `9be11f176` | test(ai-agent): pin hosted masking and device names in turn inputs | All of it. |
| `e14c2b6a8` | feat(chat): confirm the agent's dashboard blocks on a card | All of it. Its `messages.po` hunks are regenerated, never copied. |
| `002238bbf` | fix(chat): load the dashboard card lazily and manage its focus | All of it. Its catalogs are regenerated, never copied. |
| `9647073b9` | feat(ai-agent): give agent turns the open editor and the session | All of it. |
| `628843924` | feat(ai-agent): teach the offline agent blocks and dashboards | All of it. |
| `8ae87e837` | feat(ai-agent): answer offline on every page with the page in context | All of it. |
| `a693f179c` | feat(ai-agent): use prompt data-agent-v6 in the browser | All of it. Its three e2e spec hunks are in the shared rows below. |
| `9e46d4924` | fix(ai-agent): tighten prompt v6's dashboard rules | All of it. |
| `834bef76f` | fix(ai-agent): tighten prompt v6's dashboard rules | All of it. |
| `01aab917e` | docs(ai-agent): record the Phase 1D agent and offline eval | All of it. Its `eval.md` and `eval-runs/` hunks are F139's. |
| `a1e7e9153` | test(e2e): add a chart to a named dashboard through the agent | All of it. |
| `dd4e24a3e` | docs(ai-agent): mark Phase 1D built and log it as F139 | All of it. |
| `a94600bcb` | fix(ai-agent): reset the dashboard block at the start of each run | All of it. |
| `236fd09f1` | fix(plugin-manifest): reserve add_dashboard_block for the data agent | All of it. |

**Files:**
- Shared parsing (new): `shared/agent/dashboardBlocks/{DashboardBlockFields,dashboardCardLine}.{ts,test.ts}`.
  `DashboardBlockFields` holds the block fields the chat and the agent both parse,
  moved out of `supabase/functions/chat/PostChatMessages/parsing/parseDashboardBlock.ts`.
  `shared/utils/cleanLlmGeneratedSql/cleanLlmGeneratedSql.ts` (new) and
  `supabase/functions/chat/utils/cleanLlmGeneratedSql/cleanLlmGeneratedSql.ts` share the SQL cleanup.
- Prompt, tools, and proxy (shared rows below): `shared/agent/dataAgent/{buildDataAgentSystemPrompt,dataAgentTools}.{ts,test.ts}`,
  and `supabase/functions/chat/PostAgentStream/buildDataAgentProxyContext.{ts,test.ts}`.
- Turn text and context (shared rows below): `shared/agent/pageContext/buildAgentTurnText.{ts,test.ts}`,
  `shared/agent/mentions/buildAgentContextBlocks.{ts,test.ts}`, and
  `src/lib/agent/dataAgent/offline/offlineContextBudget.ts` (new), which caps offline chart SQL.
- Target and placement (new): `src/lib/agent/dataAgent/dashboards/resolveAgentDashboardTarget.{ts,test.ts}`,
  `src/lib/agent/dataAgent/createDataAgentTools/addDashboardBlockTool.{ts,test.ts}`,
  `src/clients/dashboards/agentDashboards/agentDashboards.{ts,test.ts}` (the safe append and the edit-rights check),
  and `src/components/ChatPanel/useAvandarChatRuntime/dashboardBlocks/addAgentDashboardBlock.{ts,test.ts}`.
- Browser agent (shared rows below): `src/lib/agent/dataAgent/{DataAgentHost,DataAgentRunState}.ts`,
  `createDataAgent/createDataAgent.{ts,test.ts}`, `createDataAgentTools/runQueryTool.ts`,
  `browser/createBrowserDataAgentHost.ts`, and `pagePrivacy/{SqlPlaceholderVault,createPlaceholderRestoringHost}.{ts,test.ts}`.
- Offline agent (shared rows below): `offline/offlineDataAgent.test.ts`,
  `offline/buildOfflineDataAgentSystemPrompt/buildOfflineDataAgentSystemPrompt.ts`,
  `offline/classifyOfflineMessage/classifyOfflineMessage.ts`, and `offline/createOfflineDataAgent/createOfflineDataAgent.ts`.
- Chat runtime (shared rows below): `useAvandarChatRuntime/createChatModelAdapter/{createChatModelAdapter,runLocalChatTurn}.{ts,test.ts}`,
  `runOfflineDataAgentTurn/runOfflineDataAgentTurn.{ts,test.ts}`,
  `runDataAgentTurn/runDataAgentTurn.ts`, `dataAgentTurnHelpers/{buildAgentTurnInputs (new),dataAgentTurnHelpers,createConversationAgentHost,dataAgentConversation.types,showQueryInChat}.{ts,test.ts}`,
  and `useAvandarChatRuntime.ts`.
- Card (new): `src/components/ChatPanel/ChatThread/AgentDashboardBlockPart/{AgentDashboardBlockPart.{tsx,test.tsx,module.css},AgentDashboardBlockPartLazy.{tsx,test.tsx},AgentDashboardBlock.{ts,test.ts},confirmAgentDashboardCard.{ts,test.ts}}`,
  and `src/components/ChatPanel/AgentDashboardCardStore/AgentDashboardCardStore.{ts,test.ts}`
  (each session's card statuses, cleared with the session). `ChatThread/AssistantMessage/AssistantMessage.{tsx,test.tsx}` renders the card.
  `ChatThread/AgentQueryResultPart/AgentQueryResultPart.tsx` exports its chart body for the card.
- Session store (shared row below): `src/components/ChatPanel/ChatSessionStore/ChatSessionStore.{ts,test.ts}`.
- Eval (new): `scripts/ai-eval/covid/covidDashboardQuestions.{ts,test.ts}` (D01 to D09),
  `scripts/ai-eval/runtime/gradeDashboardWrites.{ts,test.ts}`, and
  `scripts/ai-eval/harnesses/baseline/baselinePageContext.{ts,test.ts}`. Eval (shared rows below):
  `EvalQuestion.ts`, `runEval.ts`, `covid/covidQuestions.ts`, `harnesses/EvalHarness.ts`,
  `harnesses/baseline/{BaselineHarness,DenoChatTurnRunner}.ts`,
  `harnesses/pi/{PiHarness,PiLocalHarness}.{ts,test.ts}`, and `runtime/gradeEvalAnswer.ts`.
- E2E: `tests/e2e/agent-dashboard-block.spec.ts` (new), and the v6 route hunks of the three agent specs (shared rows below).
- Plugin manifest: `packages/shared/plugin-manifest/src/PluginManifest/{makeComparableAiToolName.ts,PluginManifestSchema.test.ts}` (`add_dashboard_block` reserved).
- Docs: `docs/ai-agent/specs/phase-1d.md` and `docs/ai-agent/plans/phase-1d.md` (new), D44 in `decisions.md`,
  the 1D rows in `roadmap.md` and `specs/phase-1.md`, the Phase 1D section of `eval.md`,
  and the `phase-1d` run folders under `docs/ai-agent/eval-runs/`.
- `src/i18n/locales/*/messages.{po,ts}`: regenerate with `pnpm i18n:extract && pnpm i18n:compile`, never copy.

**Schema:** none. Confirm writes the existing dashboard row. The card's statuses
are in the browser, per chat session.

**Known gaps** (open, not part of this feature's acceptance):
- P04 scores 5 of 10 on v6 (and on v5), where v3 and v4 score 10 of 10. The P bar of 7/7 is missed, and no prompt was changed for it.
- The offline 45 scored 25/45 before the offline prompt fix and 26/45 after it, against a bar of 26. N01 now misses because `add_dashboard_block` is in every offline turn's tool list.
- The offline D questions scored 6/9. D04 gave a reply with no block, and D08 and D09 ended with no reply and no block.
- The D08 grader pattern (`NOT_FOUND_PATTERN`) was widened in `9925721e3`, and D08 passed 3 of 3 on v6.
- Updated 2026-11-18: a hosted turn shows real values in replies, a query's summary, and a question card's text and option labels. The message that posts a picked option still reads `<value N>` in the thread, since the option goes back to the model with no consent check.
- A chart result gives the model no row count or columns, where the spec calls for them.
- `dashboard_card` is not in `PLAIN_BLOCK_TAG_START` (`shared/agent/pageContext/agentBlockText.ts`), so tile SQL could forge a card line.
- The card's strings are untranslated in the non-English `.po` files until `pnpm translations` runs.
- Prompt v6 is fixed once it is pushed to the demo.
- The final eval ran on v6 (2026-11-18). The 2026-11-17 runs used the prompt as first numbered (v3 plus the dashboard rules).

**Verification:**
```sh
pnpm exec tsc -b --force --noEmit
pnpm i18n:check
pnpm vitest run shared/agent src/lib/agent src/components/ChatPanel src/clients/dashboards scripts/ai-eval supabase/functions/chat
pnpm test:e2e agent-dashboard-block.spec.ts
pnpm test:e2e agent-chat-result.spec.ts
pnpm test:e2e agent-chat-mentions.spec.ts
pnpm test:e2e agent-chat-sessions.spec.ts
```
The eval commands are in `docs/ai-agent/eval.md#reproducing-every-result`.

---

## Open decisions

Questions the 2026-11-10 mapping could not settle from the code alone. Each
needs a decision before its feature's PR is built.

### ETL engine and pipelines (F37 to F56)

1. **F1 and F45.** F1 must merge before F45, since `develop`'s `EtlEngine`
   uses the old factory API, but F45 replaces F1's `EtlEngine.ts` hunk and
   deletes `EtlEngine.test.ts`. If F45 follows F1 quickly, F1 can skip its
   `EtlEngine` hunks, at the cost of `develop` not building between the two.
2. **F39 and F52 share `buildPipelineModuleUrl`.** F39 extracts it from
   `run/run.ts` as a `develop` fix, as `9d87db866` later did. The alternative
   is for F39 to add `assertValidPipelineName` inline and for F52 to extract
   both.
3. **F38 under F47.** F38 lands on a `sendRunPipelineRequest.ts` that F47 and
   F50 later replace with snapshots, and F47's snapshot (`b557227ac`)
   predates F38's `Agent`, so F47 must keep it (its section says so). Folding
   F38 into F47 is simpler but leaves both bugs on `develop` until F47.
4. **F51 and F52 as one PR?** They are split for review size, but F51 must not
   deploy without F52: until F52, `ava pipeline reset` leaves F51's
   checkpoints behind. Combine them if "merge directly after" is too fragile.

### Case statuses and assignment (F57 to F68)

1. **Review size.** F59 and F60, and F61 and F62, follow the branch's plans 3
   and 4 but are split further (about 2.9k, 2.3k, 1.6k, and 1.4k lines with
   tests). Each pair merges cleanly as one PR if preferred.
2. **F18 before F60.** F60 assumes F18 lands first. Otherwise F60 has to port
   the superseded record page from `b0c502912`, which is throwaway work.
3. **Confirm F63 and F64 on `develop`.** Both bugs were found by reading the
   code, not reproduced: `develop`'s loader runs `DESCRIBE` untrusted on a
   name its analyzer test calls uninspectable, and `develop`'s test mounts real
   Mantine 9.2 toasts. Run one case type query and
   `pnpm vitest run src/components/ChatPanel/CaseTypeDraftBlock` on `develop`
   before opening them as fixes.
4. **F68's fixtures.** Its test mocks and doc row assume the record page shape
   F71 to F75 build (`RecordFieldValue`, `useRecordFields`). Trim them if F68
   should merge earlier.
5. **`f39ebdd30`** is in F74, since it fixes F74's `124dcdea8`. If the `uuid`
   import it removes already breaks the chat edge function with F61 alone
   (F61 adds `ConceptStatusColumn`), move it to an F61 addendum.

### Joined cases (F69 to F76)

1. **`develop` bugs fixed only inside larger features.** Each fix is written
   against code `develop` lacks, so none is its own `fix(...)` feature. Decide
   whether any is worth a hand-written `develop` fix first:
   - The record page splices a record's key into DuckDB SQL unescaped
     (`develop:src/clients/ontology/AttributeAssertionClient/AttributeAssertionClient.ts:214`),
     so a key holding `'` breaks the page. F71 and F72 delete that reader.
   - Two fields of one case type with the same name read the same view column
     in a structured query, because `makeSqlExpressionFromQueryColumn.ts`
     reads `baseColumn.name`. F74's `124dcdea8` and `61bf863d9` fix it.
   - Field names that differ only by case, or a field named like
     `EXTERNAL_ID`, clash in the view. F71's `630e8391c` fixes it.
2. **F70's `isArray` marker.** F70 includes `f98170b51`'s list result marker,
   which only F74's dashboard filters read. Move it to F74 to keep F70 to
   conversions only.
3. **F76: unbuilt plans on `develop`?** `develop` keeps plans under
   `docs/superpowers/plans/`, so F76 is a docs feature. The alternative is to
   keep them on `demo/measles` until the work is built.
4. **F74's and F75's e2e specs never passed.** `case-list-field.spec.ts` and
   `case-bucketed-fields.spec.ts` did not get past sign-in on an overloaded
   machine. Expect to debug them. `case-list-field.spec.ts` passed on
   2026-11-11 after `b503e1762` (see F128): Enter docks the expanded chat,
   and the record link is found by its exact key, since F66 adds the
   assignee to the link's name.
5. **Unfixed findings from the branch's notes:** a stronger public read
   boundary than the hand tokenizer, a mapping that can reference another
   workspace's field when it has no date column, and nothing refusing a later
   `bucket_grain` change on a mapped field. Decide whether these become Linear
   issues.

### AI data agent and agent context (F77 to F95, F128, F139)

1. **Eval run archive.** `docs/ai-agent/eval-runs/` is 266 generated files,
   about 5 MB. Recommended: keep it and `scripts/ai-eval/archiveEvalRuns.ts`
   branch-only, and have F88 point `eval.md`'s run archive section, its four
   `eval-runs/` links (lines 13, 601, 615, and 616 at `34798387c`), and the
   README's `eval-runs/` row at `demo/measles` at a pinned SHA. To keep it on
   `develop` instead, port `archiveEvalRuns.ts` (final at `c1f714c4f`) with
   F81 and the folder with F88, or port only `eval-runs/README.md`.
2. **Plans.** `docs/ai-agent/plans/phase-1a.md` (3,332 lines, behind F86 and
   F87) and `phase-1b.md` (4,042 lines, behind F89 to F91, and listed in F89
   today). Port both with their docs, or keep both on the branch.
3. **Prompt versions.** The proxy serves `data-agent-v1`, `v2`, and `v3`
   because demo tabs opened before a deploy kept naming the old version.
   Nothing on `develop` has served any of them. Port as built, or collapse to
   one version, which rewrites F82's, F86's, F87's, and F89's prompt and proxy
   tests. The plugin AI tools add `data-agent-v4` and F131 adds
   `data-agent-v5`. F139 adds `data-agent-v6`, v5 plus the dashboard rules
   (`114376fb4`, served by `7d60451b6`), so v4 to v6 join this list, and
   only v6 serves `add_dashboard_block`.
4. **F95 and prompt v3.** `11816d5d0` appended `SCHEMA_ANSWER_RULES` to v3
   after v3 was pushed to the demo. If F89 and F95 ship in one deploy, keep
   the rules in v3. If F89 deploys first, F95 adds `data-agent-v4` and keeps
   serving v3.
5. **F84 changes chat for every `develop` user.** It removes PR #271's model
   picker and moves today's chat and the PDF assistant to Claude Haiku 5.5,
   which decisions D22, D23, and D31 approved for the demo. Confirm it should
   ship to production as is.
6. **F86 and F87.** Split for review size. F86 alone sends page SQL with
   pattern-based redaction only, though the agent is off by default. Merge
   them back to back, or as one PR.
7. **`assertMeetsMinAppRole.ts`.** F77's and F82's routes call
   `supabase/functions/_shared/assertMeetsMinAppRole.ts`, which only the
   Postgres branch adds (`a4136f2e5`). Whichever of F77 and the Postgres
   branch lands first carries it.
8. **F92 and F93.** Split out of F94 because their bugs are on `develop`. Each
   is three files or fewer and folds back into F94 if fewer PRs are preferred.
9. **`gadgets.md`.** `1f3bc348d`'s paragraph describes both F90's chat `@`
   menu and F91's tray, so it is F91's. If F90 ships long before F91, port its
   first three sentences with F90.
10. **F128's plan.** `docs/ai-agent/plans/phase-1c.md`, committed after
    the branch merged, sits behind F128 the way `phase-1a.md` and
    `phase-1b.md` sit behind their features. Decide it with item 2.
11. **F139's plan.** `docs/ai-agent/plans/phase-1d.md`, committed on this
    branch, sits behind F139 the way `phase-1c.md` sits behind F128. Decide it
    with item 10.

### Plugins (F96 to F112)

1. **The three plugin plans.** `docs/superpowers/plans/2026-11-06-plugins-1a-core-commands.md`
   (7,122 lines), `2026-11-07-plugins-1b-part-a-viz-types.md` (16,664), and
   `2026-11-09-plugins-1b-part-b-derived-columns.md` (7,238). Port them with
   F112, or keep them on `demo/measles`.
2. **F99 and F100 as one PR?** They are split for review size (about 4,100 and
   1,800 lines with tests), but neither is usable in the UI until both land.
3. **Docs timing.** F112 lands last, so `develop` has plugin code with no
   authoring guide until then. The alternative is a core-only guide with
   F102 (sections 1 to 5 and 9 to 11), with F107 and F110 adding their
   sections.

### GIS and public dashboard fixes (F113 to F119)

1. **F113 and the Postgres branch.** F113's commits are written against
   `relationLoading/RelationLoading.ts`, `getColumnReplacementsFromColumns`,
   and `DashboardClient.publishSnapshotSources.test.ts`, which the Postgres
   branch adds. If that branch merges first, take those files' final hunks.
   Otherwise port as the section says.
2. **F119's e2e specs probably fail today.** After `52c823754`, no element in
   an open layer's settings has the region role that about 20
   `gis-*.spec.ts` files and `dashboard-map-block.spec.ts:118` look up.
   Confirm with `pnpm test:e2e gis-cluster.spec.ts` on `demo/measles`, and fix
   the specs there or in F119's PR.
3. **F118's `!` and its callers.** Dropping the 250px cap and defaulting the
   tooltip on changes every existing `TruncatedText` caller, including
   `TruncatedFileInputValue` on `develop`. Keep the `!` or title it
   `feat(ui):` (before `1.0.0` both bump the minor), and decide whether
   `TruncatedFileInputValue` should pass `withFullTextTooltip={false}`.
4. **F115 and F116.** Committed a minute apart for the same survey data, and
   split because F116's bug is on `develop`. They combine into one
   `feat(gis)` PR cleanly.

### Import, Data Explorer, and developer tooling (F120 to F127)

1. **`b9dc62743`.** It is in F23's addendum, like `6c0ac89b9` and
   `4fd222156`. It could be its own `perf(catalog)` PR right after F23 if F23
   is too large to review.
2. **Supabase CLI on `develop`.** `pr-develop.yaml`, `staging.yaml`, and
   `production.yaml` still pin 2.98.2, whose import map ordering broke
   bundling on demo (`2efc74421`). Nothing on `develop` fails yet, but the
   Postgres branch's `connectors` function would. Ship a `fix(ci)` bump to
   2.114.0 with or before the Postgres branch?
3. **PR #320's title** is `refactor: ...`, but the PR adds four commands.
   `feat(ava-cli):` describes it better.

### Settled while mapping

- `52c823754` is split three ways: `packages/web/ui/**` is F118, the
  `src/views/GisApp/**` files are F119, and the data grid, sidebar, and
  catalog list hunks are F121, which depends on F118.
- `ee2206125` is in F21's addendum, so F21 also takes its pieces in
  `33d66ec77` and `b9dc62743`.
- `32a16aa59` is split between F117 (`ClassificationEditor.test.tsx`) and
  F68 (`SingleIndividualView.test.tsx`).
- F88 merges after F89 to F91 and brings the shared `docs/ai-agent/` files to
  their final state. F89 takes only its own hunks, per the shared files
  table. `7beccfb8d` is in the coverage checklist.
- F108's e2e spec uses `stubFeaturebaseSdk.ts` from F127 (PR #321), so F108
  merges after F127. It carries the three-line
  `parseDashboardIdFromEditorUrl.ts` helper unless the Postgres branch, which
  adds it in `3400e8f2f`, lands first.

---

## Branch coverage checklist

Every non-Postgres commit in `9cc48c3e4..HEAD` (89, oldest first) and the
feature(s) it feeds. "History" means the commit's files were later superseded:
port the final files, not the commit.

| # | SHA | Feature(s) |
|---|---|---|
| 1 | `02f62705b` | F7, F9 (MIXED) |
| 2 | `4ffd5a2c3` | F4 |
| 3 | `35ab72be8` | F4 |
| 4 | `44fb01349` | F4 |
| 5 | `7fc9dcd94` | F4 |
| 6 | `4394fa51d` | F9 |
| 7 | `fed658747` | F4, F9 (MIXED) |
| 8 | `0ccd9fde8` | F9 |
| 9 | `736286fb4` | F9 |
| 10 | `42214ab6b` | F9 |
| 11 | `65b4cc8ad` | F3 |
| 12 | `710de67b1` | F3 |
| 13 | `0aa16256e` | F9 |
| 14 | `b3da0b439` | F5 |
| 15 | `4617cf53b` | F5 |
| 16 | `b6c762bea` | F6 |
| 17 | `1e4a65af2` | F8 |
| 18 | `486c3619e` | F4 |
| 19 | `4fdb7bb95` | F8 |
| 20 | `5d02bd761` | F8 |
| 21 | `96a22e318` | F8 |
| 22 | `d9f488ff1` | F6 |
| 23 | `0f049804c` | F6 |
| 24 | `d18182615` | F6 |
| 25 | `2b6e880ad` | F6 |
| 26 | `b5f73b744` | F6 |
| 27 | `43603d540` | F8 |
| 28 | `1caf40543` | F8 |
| 29 | `56bf8be2a` | F8 |
| 30 | `b52ac9ebb` | F8 |
| 31 | `9b7b48b68` | F8 |
| 32 | `2782b5a4e` | F8, F9 (MIXED) |
| 33 | `0ad1d9b30` | F8 |
| 34 | `7d7f0a2f5` | F8 |
| 35 | `825a40edd` | F6, F8 (MIXED) |
| 36 | `15af8ff45` | F6, F8 (MIXED) |
| 37 | `8a03ff77f` | F6, F8 (MIXED, history) |
| 38 | `e827be1ce` | F8 |
| 39 | `70ffeb000` | F8 |
| 40 | `bd18f6843` | F6, F8 (MIXED) |
| 41 | `5f654e6bb` | F6, F8 (MIXED) |
| 42 | `d8f5edfde` | F3 |
| 43 | `d7ac9fe00` | F9 |
| 44 | `9ae975a73` | F9 |
| 45 | `e1c29aabe` | F7 |
| 46 | `390ff7002` | F7 |
| 47 | `f9ebb56ee` | F6 |
| 48 | `9ff0eae4f` | F7 |
| 49 | `3dc9793f2` | F7 |
| 50 | `bacd26d11` | F6 (history) |
| 51 | `41f8ee9d2` | F6 (history) |
| 52 | `82792a8ea` | F6, F7 (history) |
| 53 | `353532875` | F6, F7 (history) |
| 54 | `74bda82b5` | F6, F7 (history) |
| 55 | `95c0ef5a3` | F4 (history) |
| 56 | `95fdec9ef` | F4 |
| 57 | `ed2fac644` | F8, Postgres branch (MIXED, regenerate) |
| 58 | `a4fcff8b9` | F4 |
| 59 | `941909da8` | F6, F7 (history) |
| 60 | `d6ef8d173` | F6, F9 (MIXED) |
| 61 | `d73296150` | F6, F7 (history) |
| 62 | `99a93590b` | F4 |
| 63 | `3ab3a4d90` | F4, F6, F7 (MIXED) |
| 64 | `e4f2f2251` | F4 (regenerate) |
| 65 | `974635361` | F4, F9 (MIXED) |
| 66 | `045066166` | none: added then deleted by `03cf621ed` |
| 67 | `65b671f52` | F4 |
| 68 | `535293bb4` | F4 |
| 69 | `8e676399c` | F4, F6, F7 (MIXED) |
| 70 | `03cf621ed` | F4, F9 (MIXED) |
| 71 | `6053f4772` | F9 |
| 72 | `8297adad6` | F9 |
| 73 | `3f8fb4154` | F1 |
| 74 | `4669a8b40` | F1 |
| 75 | `85638b7f1` | F1 |
| 76 | `cb7701ab4` | F1 |
| 77 | `9377eb6c8` | F1 |
| 78 | `f54603af8` | F2 |
| 79 | `55a5fb54b` | F2, F6, F7 (MIXED) |
| 80 | `9398548cd` | F9 |
| 81 | `aba430eff` | F1 |
| 82 | `625458385` | F2 |
| 83 | `b989283ed` | F6 |
| 84 | `a325df511` | F9 |
| 85 | `b4b039511` | branch-only: this log. Don't port. |
| 86 | `7dbb2210a` | F6, F7, F8 (MIXED, formatting only). Its other files are Postgres-branch formatting and `supabase/config.toml`: see below. |
| 87 | `eba708217` | F10 |
| 88 | `b7cbe395a` | F6 |
| 89 | `f78be622b` | F7 |

Commits of `feat/catalog-field-mapping` since its base `b2fcba4a1`
(37, oldest first), numbered on from the table above. They sit on top of
`feat/catalog-filters` (F19), which came in through the `9766851e7` merge.
Its commits are covered by F19, not numbered here.

| # | SHA | Feature(s) |
|---|---|---|
| 90 | `9b62c64da` | F23 |
| 91 | `24af95af7` | F23 |
| 92 | `5bb703a2b` | F23 |
| 93 | `2fedf1ba9` | F23 |
| 94 | `b191f4cbf` | F23 |
| 95 | `f82a67efb` | F23 |
| 96 | `9545f385a` | F9 |
| 97 | `c59864844` | F23 (history) |
| 98 | `4291d2500` | F23 (history) |
| 99 | `2b7199729` | F23 (history) |
| 100 | `4499fcec1` | F23 |
| 101 | `b5a03820b` | F23 |
| 102 | `4d4b6b49b` | F23 |
| 103 | `937a118f7` | F23 |
| 104 | `26993b266` | F23 |
| 105 | `6a0bcbfba` | F23 |
| 106 | `e8e592d1a` | F23 |
| 107 | `2020b4642` | F23 |
| 108 | `c99e46b54` | F23 |
| 109 | `5e3b6ee3d` | F23 |
| 110 | `8578eaecb` | F23 |
| 111 | `bcac141e7` | F23 |
| 112 | `7ff389c30` | F9 |
| 113 | `79dc85076` | F23 |
| 114 | `bf8e7cfa2` | F23 |
| 115 | `5ebe11ba5` | F23 |
| 116 | `80a6e1ffe` | F23 |
| 117 | `b1a8199b7` | F23 |
| 118 | `68b003a2f` | F23 |
| 119 | `d64d11d83` | F23 |
| 120 | `d90481335` | F23 |
| 121 | `14984e21b` | F23 |
| 122 | `ef758d937` | F23 |
| 123 | `6c43b5a65` | F23 |
| 124 | `d7fd436a8` | F23 |
| 125 | `bc4baf853` | F23 |
| 126 | `d50583f7e` | F23 |
| 127 | `7f2d6dc8e` | F23 |
| 128 | `d9c3bf6c0` | F23 |
| 129 | `62ffe547a` | F23 |
| 130 | `c75d19331` | F23 |
| 131 | `4dc0c52d5` | F27 |
| 132 | `d9f53c30b` | F27 |
| 133 | `59ded1ac8` | F27 |
| 134 | `aa5eefaa6` | F27 |
| 135 | `0a828d45c` | F27 |
| 136 | `2a627e438` | F27, F9 (MIXED) |
| 137 | `8e707d700` | F23 |
| 138 | `ec060372c` | F23 |
| 139 | `4d1d2a7d5` | F23 |
| 140 | `2d61eb961` | F23 |
| 141 | `dbf921eda` | F23 |
| 142 | `0c650a020` | F9 |

F18's commits came in through the `e331cbdcc` merge and are listed in full
under F18 above rather than numbered here. F21's commits are listed in full
under F21 in the same way, F25's (merged in `a9d2ec770`) under F25,
F26's (merged in `d0af42ce6`) under F26, and F29's and F30's (from
`feat/gho-pipeline`) under F29 and F30, and F31's (from
`feat/gis-threshold-colors`) under F31, F34's (from
`feat/gis-pdf-feature-list`) under F34, and F35's (from
`feat/dashboard-map-block`) under F35.

`051a30ebf`, from `fix/catalog-loadable-filter`, fixes F19's loadable-only
filter and is listed under F19.

From `fix/measles-followups`:
- `423d01075` types F25's `READY_ANSWER` test fixture so `pnpm type-check:deno`
  passes. It touches only
  `supabase/functions/open-data/requestParquetCache/requestParquetCache.test.ts`
  and goes with F25.
- `665aebff0` updates `tests/e2e/gis-places.spec.ts` and
  `tests/e2e/gis-map-layers.spec.ts` for `4de947922` (editing a layer from the
  layers panel), which opens a new layer's settings page and shows Latitude
  and Longitude as selects. Port it with whichever PR carries `4de947922`.
- `64291f509` is F36.

Commits that only update this log are branch-only and are not listed.

Features mapped on 2026-11-10 list their commits in full in their own
sections, and follow-up fixes to F2 to F35 sit in each section's addendum.
Where they came from:
- Direct commits from 2026-10-19 to 2026-10-22 (`127b6c0d9` to `4190870fe`):
  F37 to F56.
- `feat/statuses` (merged in `b0c502912`), `feat/individual-assignment`
  (`47414c244`), `feat/case-draft-edit-sources` (`9b3c922f5`), and direct case
  commits: F57 to F68.
- `feat/joined-cases` (merged in `dbd4ab1bc`, `32e728a51`, and `ae039326d`):
  F69 to F76.
- `feat/pi-agent` (merged in `64bc1c78d`, `b32bf6834`, and `2329454f0`) and
  `feat/agent-default` (`cc3833377`): F77 to F88.
- `feat/agent-context` (`4eddab717`) and `feat/chat-panel` (`e12cfa634`): F89
  to F95.
- `feat/agent-sessions` (merged on 2026-11-11): F128. Its commits are listed
  in full under F128.
- `feat/plugins-core` (`942bbc4ce`), `feat/plugins-viz` (`c339e8704`), and
  `feat/plugins-columns` (`e2f65917e`): F96 to F112.
- `fix/gis-displace-wkt-points` (`c9034a5e3`), the public dashboard query
  fixes, and direct GIS commits: F113 to F119. The rest of
  `feat/comment-embeds` is in F21's addendum.
- `refactor/sb-switch-env` (`15ba9b8f9`), `fix/e2e-stability` (`29d38e6a4`),
  `feat/dataset-from-url` (`c41ad886c`), `feat/column-title-tooltip`
  (`0cd5ba996`), and direct import and Data Explorer commits: F120 to F127.
- The single-commit chat and Data Explorer branches merged on 2026-11-06
  (`feat/chat-*`, `feat/chart-sample-long-series`, and their `fix/*`
  siblings) are F22's. `docs/ai-harness-audit/bug-log.md` and
  `harness-improvements.md` name each one's merge commit.

Merge commits are not listed. Several resolved conflicts by hand in files
that are not generated, for example `56f31f603` and `f920d223c` (the
`develop` merges), `b0c502912`, `29c0212f4`, `9766851e7`, `436cc6aa9`,
`2035e2627`, `b3ef55c55`, and `a6cc4629c`. The final-content rule in "How to
use this log" already carries those resolutions. When a shared file's history
is unclear, list a merge's own changes with
`git diff-tree --cc --name-only <merge>`.

Commits that no feature section lists, mostly translation, formatting, and
branch-only eval archives:

| SHA | Feature(s) | Note |
|---|---|---|
| `61e1444fd` | F23 (MIXED, docs) | `catalog-field-mapping-{design,plan}.md`, `catalog-search-design.md`, `connector-nomenclature.md`, `open-data-catalog-architecture.md`, and the `apps/pipeline-server/README.md` field mapping paragraph. The log hunk is branch-only. |
| `4d359d430` | F23 (MIXED, docs) | `catalog-field-mapping-design.md`: HDX's topic, data source, coverage, and notes mapping. The log hunk is branch-only. |
| `bad8021c3` | F23 (MIXED, docs) | `catalog-field-mapping-design.md`: the HDX write-size fixes. The demo HDX reset notes and the log hunk are branch-only. |
| `b3d52a8e4` | branch-only | `etl-disk-footprint.md`: the demo instance's disk sizing, like `ec060372c`. |
| `f92c131ff` | branch-only | `etl-disk-footprint.md`: the demo branch's 8 GB volume, like `ec060372c`. |
| `92fb49e1c` | F9 (MIXED, docs) | `catalog-search-performance.md`, which goes with F9. The log hunk is branch-only. |
| `56df839d2` | F9 (MIXED, docs) | `catalog-search-performance.md`: the benchmark on demo. The log hunk is branch-only. |
| `80c9c90b7` | regenerate | Translation-only, every feature in the catalogs at the time. |
| `2e5214b8a` | MIXED (formatting only) | No case file. Formats F1 (`packages/shared/modules`), F2 (`HttpClientFactory`), F6 and F7 (Socrata and HDX pipelines, `CkanDiscoveryClient`), F10 and F11 (`ava-cli` pipeline run), F12 (`failureToInvalidDatasetReason`), F45 to F53 (`packages/node/etl`), the Postgres branch (`PostgresConnector*`, `50.rpc_connections__*`), and `develop`'s query sessions. `demo/measles` already had the same text, so `b0c502912` carried nothing; each owner runs the formatter. |
| `707ed2f5c` | branch-only | Eval run archive. |
| `c1f714c4f` | branch-only | `archiveEvalRuns.ts` only. Port with F81 if the archive is kept. |
| `bcaa6e350` | branch-only | Eval run archive. |
| `f9ae9af3e` | branch-only | Eval run archive. |
| `c59726056` | branch-only | Eval run archive. |
| `58ec07208` | branch-only | Eval run archive. |
| `06358f741` | branch-only | Formats 29 archived Phase 1A eval run summaries (F86 and F87's archive). Eval run archives stay branch-only. |
| `f636ca4f1` | branch-only | Re-adds `HANDOFF.md` and its `README.md` row; `43e0df775` deletes the file. |
| `027361e5e` | branch-only | Formats the Phase 1B eval run summaries. |
| `4bf0637ab` | regenerate the Postgres branch, F12, F54 | Translations of the Postgres connector copy, `DataCatalogInvalidNotice`, `DataCatalogListingColumns`, and source labels. |
| `75c511d65` | MIXED (formatting only) the Postgres branch, F4 | Import order in `DatasetClient.types.ts` between the Postgres branch's `DatabaseConnection` and F4's `DataCatalogListing` imports. Whichever lands second. |
| `e3e72940a` | regenerate F94 | Drops the obsolete "Try one of these" after `f2e44f2e4`. |
| `25466ba17` | regenerate F19, F23, F94, F57 to F68 | Drops obsolete `#~` entries only. Nothing to port. |
| `acbe227d8` | regenerate F81 to F85 | Drops the offline and local chat model strings after the `feat/pi-agent` merge. |
| `7beccfb8d` | MIXED (formatting only) F81 to F85 | `docs/ai-agent/eval-runs/**/summary.json`, `dataAgentTurnHelpers.ts`, `createDataAgent.ts`. |
| `43573a2ec` | F71 to F75 | Renames `20261109030000_list_field_value_rules.sql` to `20261109030001_...`, its desktop mirror, and the hand-written SQLite override key in `getManualMigrationBodyFromSourceFile.ts`. A PR regenerates the migration: rekey the override to the new name. |
| `ce256e01d` | regenerate F96 to F112 | Derived column strings. |
| `d38c878ae` | regenerate F31 | Threshold color strings. |
| `70617ed2f` | regenerate F32, F33 | Places and map tool strings. |
| `2658b9b29` | F116 | Formatting of `DataSection.geometry.test.tsx` after `8b73410cd`. |
| `2b031816d` | regenerate F67, F68, F113 to F119 | |
| `32a16aa59` | MIXED: F117, F68 | `ClassificationEditor.test.tsx` types (with `8ca35d1cc`), `SingleIndividualView.test.tsx` class assertions (with `cb76ac57a`). |
| `263adf8a3` | regenerate F33, F34, F119 | |
| `ec2f0ea2c` | regenerate F35 | |
| `861ba7c6f` | regenerate F119 | After `52c823754`. |

**Not part of any feature:**
- `b920bee1b` (desktop SQLite generator catch-up) is on the Postgres branch.
- `7dbb2210a`'s non-open-data files (`db_connections*`, `PostgresTableWrapper*`, the Postgres import views, `supabase/functions/connectors/*`, `supabase/functions/_shared/*`, `createRegistryForFetch.ts`, `http-api.types.ts`, `ConnectorsAdvisory.tsx`, `save*Dataset.ts`, `postgres-connector-option-a-prototype.html`, `tests/e2e/postgres-connector-import.spec.ts`) are formatting and Postgres work. They belong to the Postgres branch, not to any feature here.
- `supabase/config.toml`: `7dbb2210a` committed this branch's Supabase switch (project `feat-demo-measles`, ports 553xx). Never port it. Run `ava supabase restore` and commit the standard config before this branch itself is ever merged anywhere. Done in `f710dcb68`.

## F28: Build an ODC listing's Parquet copy from a sample that holds the whole source

Status: not started. Built on `feat/catalog-complete-sample`, branched from
`demo/measles`.

**Purpose:** The column type sample reads up to 10,000 Socrata rows or the
first 5 MB of a CKAN file. For a small listing that read is the whole
source, yet the Parquet copy build read the source again, and a flaky
source could fail the second read: Borough Boundaries (`gthc-hcne`) could
not be added because Socrata intermittently answers 503 for its
geometry-heavy rows. The sample route now says when a sample is complete
and signs the SHA-256 of its text into the sample token. The browser hands
the text back to `/parquet-cache` right after writing the verified column
types, and on "Add to workspace" when the preview read a complete sample.
The edge function copies the text only when the token vouches for exactly
that text, forwards it to the pipeline server as `completeSampleCsv`, and
lets a failed build retry at once. **Value:** small listings get their copy
the moment their columns are checked, with no second read of the source,
and no caller can put rows of its own into a copy every workspace reads.
Design: `docs/measles-demo/odc-parquet-cache-spec.md`, "A complete sample
becomes the copy".

**PR title:** `feat(open-data): build a listing's Parquet copy from a sample that holds the whole source`

**Depends on:** F12 (the column type sample route and token), F24 (the
preview that reads the sample), and F25 (the copy request, build route,
and build).

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `0a25bc0df` | feat(open-data): build a listing's Parquet copy from a sample that holds the whole source | All of it, including the `DataImportView/CLAUDE.md` note and the spec section. |

## F22: AI harness audit fixes

Status: not started. Branch base for each PR: `develop`.

The COVID audit in [`docs/ai-harness-audit/`](../ai-harness-audit/README.md)
produced one branch per fix, each merged into `demo/measles`. Every entry in
[`bug-log.md`](../ai-harness-audit/bug-log.md) and
[`harness-improvements.md`](../ai-harness-audit/harness-improvements.md)
names its branch, its merge commit on `demo/measles`, its tests, and the PR
title to use. Each is its own PR.

Order: the bugs first, BUG-001 to BUG-015, then the improvements, C1 to C7.
Later entries edit the same files as earlier ones
(`buildSystemPrompts.ts`, `parseOpenRouterResponse.ts`, `parseClarify.ts`,
`applyChatModelTurnResponse.ts`, `makeDataGridColumnDefs.ts`, the
discovery components), so taking them in order keeps each diff small.
BUG-007 and its follow-up `c0c08b571` go together, as do C2 and
`fix/summary-test-types`, and the three C4 branches.

Regenerate the Lingui catalogs (`pnpm translations <path>`) in each PR that
adds user-facing strings: BUG-002, BUG-004, BUG-011, BUG-012, C7, and the
chart sampling change in C4.

**Addendum: follow-up commits mapped on 2026-11-10.** Port these with F22.

`7bcaa6da0 Fixed lint and added specs and plans` reformats 11 files that F22
branches own. It is formatting only (`oxfmt` line wrapping and one import
line). Take it with each branch's PR, or let `pnpm format` produce it:

| SHA | Subject | Take |
|---|---|---|
| `7bcaa6da0` | Fixed lint and added specs and plans | MIXED (formatting only): `src/clients/DuckDbClient/projectParquetBlob/projectParquetBlob.ts` (`fix/projection-real-columns`), `src/components/ChatPanel/ChatThread/RegenerateErrorBanner/RegenerateErrorBanner.test.tsx` (`fix/readable-query-errors`), `src/components/ChatPanel/PendingClarificationBlock/useDiscoveryResolver.test.tsx` (`fix/discovery-candidate-lookup`), `src/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.retryContext.test.tsx` (`fix/new-chat-retry-context`), `src/lib/ui/viz/{AreaChart.tsx,BarChart/BarChart.tsx,LineChart/LineChart.tsx}` (`fix/naive-date-display`), `src/lib/ui/viz/makeDataGridColumnDefs/makeDataGridColumnDefs.{ts,test.ts}` (`fix/grid-number-display`), `supabase/functions/chat/PostChatMessages/parsing/parseOpenRouterResponse.test.ts` (`fix/chat-sql-text-leak`), `supabase/functions/chat/PostChatMessages/prompt/annotateClarificationAnswersForModel.test.ts` (`fix/clarification-answer-loop`). The `docs/superpowers/` files go to F72 to F76. |

F69 also depends on F22's BUG-001 (`fix/analyzer-function-from`): merge
BUG-001 before F69.

Add to the C4 analyst rules PR (`feat/chat-analyst-rules`,
`feat/chat-analyst-rules-followup`, `feat/chat-analyst-rules-precision`;
merges `99718c133`, `ac4bcd6cf`, `636222c88`):

| SHA | Subject | Take |
|---|---|---|
| `7589f0885` | fix(chat): filter a county on its state too, and spell out New York City | All of it: one bullet in the ANALYST CHECKS block of `supabase/functions/chat/PostChatMessages/prompt/buildSystemPrompts.ts`, which C4 adds. It sits after the population and "Unassigned" bullets from C4's follow-up branches, so it goes in C4's last PR. Found by F81's eval question N11 (decision D21); N11 then passed 4 of 4 on Claude Sonnet 5 and GPT-5.6 Terra. Built on `feat/pi-agent`, merged in `64bc1c78d`. |

Files: no addition. `supabase/functions/chat/PostChatMessages/prompt/buildSystemPrompts.ts`
is already C4's.

Merge-order note: every F22 merge is an ancestor of `feat/pi-agent`'s base
(`774651c7d`), and F81, F82, F84, and F86 edit or import F22's code in
`PostChatMessages.ts`, `createChatModelAdapter.ts`, `useAvandarChatRuntime.ts`,
`chatRuntimeTurnHelpers.ts`, `waitForAppliedSqlOutcome.ts`, and the
discovery helpers. They must merge after all of F22. F78 must follow
BUG-015 (or drop one branch, see F78). F77, F79, and F80 do not depend on
F22.

Add to **Commits to read** (the audit's own docs, port with the first F22
PR or with F9):

| SHA | Subject | Take |
|---|---|---|
| `e22d4d456` | docs(ai-harness-audit): log the COVID audit plan, bugs 001-006, and non-ideal responses | All of it: `docs/ai-harness-audit/{README,bug-log,non-ideal-responses}.md`. |
| `17f021fd3` | docs(ai-harness-audit): log bugs 007-009 and non-ideal responses 008-011 | All of it. |
| `b77df54fc` | docs(ai-harness-audit): log bugs 010-013, non-ideal responses 012-019, permission findings, and categories | All of it. |
| `4082d9175` | docs(ai-harness-audit): log bugs 014-015, harness improvements, and final results | All of it, including the new `harness-improvements.md`. |
| `128aaa9e3` | chore(chat): apply the pre-push formatter to the audit's chat files | Formatting: take the final files (`applyChatModelTurnResponse.ts`, `createChatModelAdapter.ts`, `useAvandarChatRuntime.ts`, `buildDataExplorerToolDefinitions.ts`). |

F121's `makeDataGridColumnDefs` docstring sentence and renamed test land
with whichever of F22 (BUG-003) and F121 merges second.
