# `feat/demo/measles` PR feature log

The running list of features built on `feat/demo/measles` that must each land
in `develop` as their own PR. When every feature below reads `merged`,
everything this branch built is in `develop`.

Out of scope: the Postgres connector. It came in through
`1d8678750 Merge branch 'feat/postgres-connector'`, and its 20 commits
(everything reachable from `1d8678750^2` that `develop` lacks) merge on their
own branch.

Branch base: `9cc48c3e4` (merge-base with `develop`). Last updated against
`a325df511`.

## How to use this log (for the agent building a PR)

1. Pick the first feature in **Merge order** whose status is `not started` and
   whose `Depends on` features are all `merged`.
2. Branch from an up-to-date `develop`:
   `git switch -c <prefix>/<slug> origin/develop`, inside a worktree created
   with the `using-wt` skill.
3. Read every commit listed under the feature with `git show <sha>`, and read
   each listed file at its final state with
   `git show feat/demo/measles:<path>`.
4. Rebuild the feature on the new branch. Two rules decide what to copy:
   - **Default:** take the file's final content on `feat/demo/measles`.
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
8. Update this log on `feat/demo/measles`: set the status to `PR open` with the
   PR link, then to `merged` once it merges.

## Features

| ID | Feature | Status | Depends on | Linear |
|---|---|---|---|---|
| F1 | `@avandar/modules` factory and mixin refactor | not started | none | [AVA-383](https://linear.app/avandar/issue/AVA-383) |
| F2 | `HttpClientFactory` with rate limiting, and open data read through it | not started | F1, F3 | |
| F3 | Move `shared/open-data` to `shared/connectors/open-data` *(proposed, confirm with user)* | not started | none | |
| F4 | The drive concept: data catalog listings schema, drive index infrastructure | not started | F3 | [AVA-381](https://linear.app/avandar/issue/AVA-381) (follow-up) |
| F5 | Rename the `external-datasets` edge function to `connectors` *(proposed, confirm with user)* | not started | Postgres branch | |
| F6 | Socrata connector and drive index pipeline | not started | F2, F4 | [AVA-382](https://linear.app/avandar/issue/AVA-382) (licensing) |
| F7 | HDX (CKAN) connector refactor and drive index pipeline | not started | F2, F4 | [AVA-382](https://linear.app/avandar/issue/AVA-382) (licensing) |
| F8 | Open-data write-back cache *(proposed, confirm with user)* | not started | F4, F6 | |
| F9 | Measles demo docs: use case, specs, plans *(proposed, confirm with user)* | not started | F1 to F8 | |

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
| 5 | F6 | Needs F2 (`OpenDataHttp` is a `Pick` of `HttpClient`) and F4 (the `data_catalog_listings` table and the shared upsert). |
| 6 | F7 | Same dependencies as F6. Independent of F6, so the two can merge in either order. |
| 7 | F8 | Adds columns to the F4 table, and its freshness check reads Socrata metadata through F6's `SocrataClient`. |
| 8 | F5 | Any time after the Postgres branch merges. Every file it touches is Postgres code. See F4's note about `ExternalDatasetRoutes.types.ts`. |
| 9 | F9 | Last, because the docs describe the merged features. |

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
| `shared/models/data-catalog-listings/DataCatalogListing/*` | F3, F4, F6, F8 | F3: `OpenDataAccess` field rename (`65b4cc8ad`). F4: the rename itself. F6: the `socrata` `api_service` arm. F8: cache fields. |
| `supabase/schemas/00.enum.data_catalog_listings__api_service.sql` | F4, F6 | F4: rename. F6: the `socrata` value. |
| `supabase/schemas/10.data_catalog_listings.sql` | F4, F8 | F4: rename and the non-partial `api_resource` unique index. F8: cache columns and their CHECK clauses. |
| `supabase/tests/database/data_catalog_listings_access.test.sql` | F4, F8 | F4: rename and the index test. F8: cache-column and `pipeline_access_complete` tests. |
| `apps/pipeline-server/pipelines/world-bank__wdi/run.ts` | F1, F4 | F1: `EtlEngine.create(name, { state })`. F4: `createSupabaseAdminClient` import from `pipelines/shared`. |
| `shared/types/database.types.ts` | F4, F6, F8 | Generated: regenerate in each. |

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

## F3: Move `shared/open-data` to `shared/connectors/open-data` *(proposed, confirm with user)*

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
- `supabase/functions/connectors/ExternalDatasetRoutes.types.ts` (a comment rename). If F5 hasn't merged, apply it to `supabase/functions/external-datasets/ExternalDatasetRoutes.types.ts`.

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

## F5: Rename the `external-datasets` edge function to `connectors` *(proposed, confirm with user)*

**Purpose:** Rename the edge function that proxies external databases.
**Value:** The name matches the connector nomenclature. Every file it touches
is Postgres-connector code, so it can't merge before the Postgres branch.
Folding these two commits into `feat/postgres-connector` before that branch
merges is the simpler alternative.

**PR title:** `refactor(connectors): rename the external-datasets edge function to connectors`

**Commits to read:**

| SHA | Subject | Take |
|---|---|---|
| `b3da0b439` | refactor: rename external-datasets edge function to connectors | all (renames under `supabase/functions/`, Postgres wrapper and view call sites, `src/types/http-api.types.ts`, db_connections schema comments, RLS test, e2e spec) |
| `4617cf53b` | refactor: finish external-datasets to connectors rename in DatabaseConnection error messages | all |

**Schema:** comment-only edits in `supabase/schemas/20.db_connections.sql`,
`21.db_connections__postgres.sql` and `50.rpc_db_connections__*`.
Comments inside function bodies count as schema changes, so regenerate the
migration declaratively.

**Verification:**
```sh
pnpm type-check && pnpm test:db && pnpm test:e2e postgres-connector-import.spec.ts
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

**Uncommitted on the branch:**
- Formatting-only edits to `SocrataClient*`, `SocrataDiscoveryClient*` and `makeSourceVersionFromSocrataViewMetadata.ts` (import order, line wrapping). Running Prettier reproduces them.

**Verification:**
```sh
ava supabase status && pnpm db:reset && pnpm test:db && pnpm db:gen-types && pnpm desktop:sqlite:check-migrations
pnpm vitest run shared/connectors/open-data && pnpm test:pipeline-server && pnpm type-check
ava pipeline run socrata --local   # smoke test against the switched local Supabase
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

**Uncommitted on the branch:** a formatting-only edit to
`shared/connectors/open-data/buildCkanSourceVersion.ts` (import order).
Running Prettier reproduces it.

**Schema:** none.

**Verification:**
```sh
pnpm vitest run shared/connectors/open-data && pnpm test:pipeline-server && pnpm type-check
```

---

## F8: Open-data write-back cache *(proposed, confirm with user)*

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

**Uncommitted on the branch:** formatting-only edits to
`AvandarSupabaseStorageClient.ts` and its test. Running Prettier reproduces
them.

**Verification:**
```sh
ava supabase status && pnpm db:reset && pnpm test:db && pnpm db:gen-types && pnpm desktop:sqlite:check-migrations
pnpm vitest run shared/connectors/open-data && pnpm type-check
```

---

## F9: Measles demo docs *(proposed, confirm with user)*

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

**Also take:**
`a325df511` docs(open-data): document what every drive index pipeline must
write. All of it: section 6.7 of `open-data-catalog-architecture.md`, the
drive index invariant (AVA-381).

---

## Branch coverage checklist

Every non-Postgres commit in `9cc48c3e4..HEAD` (84, oldest first) and the
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

**Not part of any feature:**
- `b920bee1b` (desktop SQLite generator catch-up) is on the Postgres branch.
- The formatting-only uncommitted edits outside open-data (`createRegistryForFetch.ts`, `http-api.types.ts`, `ConnectorsAdvisory.tsx`, `save*Dataset.ts`, `supabase/functions/_shared/*`) are Postgres-branch or repo-wide Prettier churn.
- The remaining uncommitted files (`db_connections*`, `PostgresTableWrapper*`, Postgres views, `supabase/functions/connectors/*` Postgres code, `postgres-connector-option-a-prototype.html`, `tests/e2e/postgres-connector-import.spec.ts`) belong to the Postgres branch.
- `supabase/config.toml` is this branch's Supabase switch and is never committed.
