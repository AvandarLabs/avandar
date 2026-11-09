# `demo/measles` PR feature log

The running list of features built on `demo/measles` that must each land
in `develop` as their own PR. When every feature below reads `merged`,
everything this branch built is in `develop`.

Out of scope: the Postgres connector. It came in through
`1d8678750 Merge branch 'feat/postgres-connector'`, and its 20 commits
(everything reachable from `1d8678750^2` that `develop` lacks) merge on their
own branch.

Branch base: `9cc48c3e4` (merge-base with `develop`). Last updated against
`f78be622b`.

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
| F11 | Live progress output for `ava pipeline run` | not started | F10, the ETL engine's per-scope crawl (`crawlScope`), which this log does not map yet | |
| F12 | Invalid catalog listings, and DuckDB-parsed column type samples | not started | F4, F7, and the column type verification feature (`verifyOpenDataColumnTypes`, `rpc_data_catalog_listings__write_verified_column_types`), which this log does not map yet | [AVA-396](https://linear.app/avandar/issue/AVA-396) (follow-up) |
| F13 | Demo deployment: `demo/*` branches deploy to `demo.avandarlabs.com` | not started | none | |
| F14 | Show only the plan picker when a workspace has no active plan | PR open: [#314](https://github.com/AvandarLabs/avandar/pull/314) | none | |
| F15 | `ava --env <name>` loads any `.env.<name>`, replacing `--staging` and `--prod` | PR open: [#319](https://github.com/AvandarLabs/avandar/pull/319) | none, but see its section for hunks in files `develop` lacks | |
| F16 | Index every catalog asset behind `is_workspace_loadable`, and add the NY State Socrata portals | not started | F4, F6, F7, F12 | |
| F17 | Search the catalog in Postgres and load listings as the user scrolls | not started | F4, F12, F16 | |
| F18 | Case comments and the case activity feed | not started | none | |
| F19 | Open data catalog browser: full-height three-pane layout with search, filters, and sort | not started | F12, F16, F17 | |
| F20 | Phone widths: Data Sources shows one pane at a time, and the slate stays on screen | not started | none | |
| F21 | Gadget references: link and embed dashboards, tiles, datasets, maps, case types, and cases in a case comment | not started | F18 | |
| F22 | AI harness audit: 15 chat and Data Explorer bug fixes and 8 harness improvements | not started | none (see its section for order within it) | |
| F23 | Catalog field mapping: per-pipeline YAML metadata mapping, drives, and publisher, agency, topic, and keyword filters | not started | F4, F6, F7, F16, F17, F19 | |
| F24 | ODC listing data preview and full-screen detail | not started | F12, F16, F19, F23 | |
| F27 | Pipeline runs pace their writes to the database and retry transient failures | not started | F4, F11, F23 | |
| F28 | Build an ODC listing's Parquet copy from a column type sample that holds the whole source | not started | F12, F24, F25 | |

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
| 9 | F11 | Needs F10's local runner and `--limit`, and the ETL engine's scope crawl it hooks into. Can merge any time after those, before F9. |
| 10 | F12 | Extends the column type verification route and the F4 listings table. Merge after the verification feature it rewrites. |
| any | F13 | Self-contained CI and scripts. Merge before the next demo branch is cut from `develop`, so it inherits the workflow. |
| any | F14 | Self-contained billing UI fix. The bug is already on `develop`, so it can merge first. |
| any | F15 | Self-contained CLI change. Its hunks in `ava supabase sql`, `ava pipeline reset`, and `ava pipeline prune-retired-scopes` go with whichever of F15 and those commands lands on `develop` second. |
| 11 | F16 | Extends the F4 listings table and upsert, both F6 and F7 pipelines, and F12's invalid-listing UI. Merge after all four. |
| 12 | F17 | Adds a column and indexes to the F4 listings table, and rewrites the catalog list that F12 and F16 extended. Merge after both. |
| 13 | F19 | Moves the catalog browser onto F17's server search: its filters, facets, and sort become search parameters, and its list keeps F17's infinite scroll. Merge after F17. |
| any | F18 | Self-contained: new tables, the record page feed, and one shared client typing fix. It touches no other feature's files, and nothing depends on it. |
| any | F20 | Self-contained layout fix. The slate overflowing the bottom of a phone screen is already on `develop`, so it can merge first. |
| after F18 | F21 | Extends F18's rich text model, editor, and comment triggers, so it cannot land first. Otherwise self-contained. |
| any | F22 | Chat and Data Explorer code that every other feature leaves alone. Its own PRs go in the order its section gives. |
| 14 | F23 | Renames a column that F4, F6, F7, F16, F17 and F19 all read, replaces the hardcoded drive lists F6 and F7 added (`configuredDrives.ts` and `hdxDrive.ts`), and extends the search and filter rail F17 and F19 built. Merge after all of them. |
| 15 | F24 | Adds the data preview and full-screen modal to the detail pane F19 built and F23 regrouped. Merge after both. |
| 16 | F27 | Rewrites the write loop in `loadRelationsPage` that F4 built and F23's byte cap changed, and adds a stage to the progress events F11 added. Merge after F23. |
| after F25 | F28 | Extends F25's copy request, build route, and build, and the column type sample F12 reworked. The pipeline server half must deploy before the edge function half: an older build route refuses the new `completeSampleCsv` key. |
| 17 | F9 | Last, because the docs describe the merged features. |

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

---

## F14: Show only the plan picker when a workspace has no active plan

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
  `announcePostgrestTarget.ts`. They come from the `ava supabase sql` command
  and the pipeline executions work, which this log does not map yet. Whichever
  of F15 and those lands second carries these hunks:
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
| `62ffe547a` | fix(etl): cap each listings write at 4 MiB of JSON | All of it (`loadRelationsPage` and its test, and the `@avandar/etl` README's **Writes** paragraph). It edits a file F4 owns: apply it on top of F4's final `loadRelationsPage.ts`. F27 replaces its fixed cap with the throttle's budget. |
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
under F21 in the same way, F25's (merged in `a9d2ec770`) under F25, and
F26's (merged in `d0af42ce6`) under F26.

`051a30ebf`, from `fix/catalog-loadable-filter`, fixes F19's loadable-only
filter and is listed under F19.

Commits that only update this log are branch-only and are not listed.

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

