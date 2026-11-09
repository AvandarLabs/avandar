# F2 Places Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A user adds real exposure sites to a map by clicking, typing coordinates, or searching an address, and the sites are stored as an ordinary dataset that buffers, filters, Data Explorer, and dashboards can all read.

**Architecture:** A places dataset is a virtual dataset (`datasets__virtual`, flagged `is_places`) whose `raw_sql` is a typed `VALUES` query. The GIS app reads the rows by running that SQL through `WorkspaceQuerySession`, applies one edit (add, replace, remove), rewrites `raw_sql`, then drops every cached copy of the dataset's rows so the map, Data Explorer, and charts re-read it. A new "Add a place" tool-cluster tool (`MapToolMode` `{ type: "place" }`) drives a popover (dataset, location, form); a new `geocode` edge function proxies address search to Geoapify behind a provider interface.

**Tech Stack:** React 19, Mantine, Lingui, TanStack Query (`@avandar/query-hooks`), MapLibre, DuckDB-WASM (QETL), Supabase (Postgres, pgTAP, Deno edge functions via `MiniServer`), zod 4, Vitest, Playwright.

**Spec:** [workflow-b-map-features-design.md](workflow-b-map-features-design.md) §4

**Depends on:** nothing. F2 makes no `AvaMapConfig` change (no new config version); it works on any config version F1 (V6) or F3 (V7) leaves behind, because it only adds an ordinary `latLngColumns` layer.

**Decision gate:** Task 1 is a spike. If it passes, run the **virtual branch** (Tasks 2 to 24). If it fails, run the **CSV fallback branch**: Tasks C2, C3, C9, and C16 replace Tasks 2, 3, 9, and the store import in Task 16, and every other task runs unchanged. The fallback is fully specified at the end of this plan.

---

## File structure

### Spike

| File | Responsibility |
| --- | --- |
| Create `src/clients/places/__tests__/valuesVirtualDataset.integration.executed.test.ts` | Proves a pure `VALUES` query has no QETL dependencies and produces typed Parquet columns. |
| Create `tests/e2e/places-values-dataset.spec.ts` | Proves a seeded `VALUES` virtual dataset loads through the real browser QETL path. |

### Schema (virtual branch)

| File | Responsibility |
| --- | --- |
| Modify `supabase/schemas/20.datasets__virtual.sql` | Adds `is_places boolean not null default false`. |
| Create `supabase/schemas/70.rpc_datasets__add_places_dataset.sql` | Creates a virtual dataset flagged as places, atomically. |
| Create `supabase/tests/database/rpc_datasets__add_places_dataset.test.sql` | pgTAP: flag, columns, authorization, untouched plain RPC. |
| Generated `supabase/migrations/<timestamp>_add_places_datasets.sql` | Output of `pnpm db:new-migration`. |
| Generated `shared/types/database.types.ts` | Output of `pnpm db:gen-types`. |
| Generated `apps/desktop/migrations/<timestamp>_add_places_datasets.gen.sql` | Output of `pnpm desktop:sqlite:gen-migrations`. |
| Modify `shared/models/datasets/VirtualDataset/VirtualDataset.types.ts` | `isPlaces` on the model. |
| Modify `shared/models/datasets/VirtualDataset/VirtualDatasetParsers.ts` | `is_places` in the DB read schema. |

### Places core (`src/clients/places/`)

| File | Responsibility |
| --- | --- |
| Create `places.types.ts` | `PlaceInput`, `PlaceRow`, `PlaceCoordinate`, `PlacesStore`. |
| Create `places.constants.ts` | `PLACES_MAX_ROWS` (500), `PLACES_COLUMNS`, `PLACES_DATASET_COLUMNS`. |
| Create `validatePlaceInput/validatePlaceInput.ts` (+ test) | Trims, bounds-checks, and normalizes form input. |
| Create `PlaceRowEdits/PlaceRowEdits.ts` (+ test) | Add, replace, remove one row; enforces the 500-row cap. |
| Create `buildPlacesValuesSql/buildPlacesValuesSql.ts` (+ test) | Rows to the typed `VALUES` SQL, every text value through `quoteSqlLiteral`. |
| Create `buildPlacesReadSql.ts` | Wraps stored SQL so timestamps come back as `YYYY-MM-DDTHH:mm` text. |
| Create `parsePlaceRowsFromQueryRows/parsePlaceRowsFromQueryRows.ts` (+ test) | Query rows to `PlaceRow[]`, refusing anything that is not a places row. |
| Create `__tests__/placesSqlRoundTrip.integration.executed.test.ts` | Real DuckDB: written SQL reads back identical rows and types. |
| Create `VirtualPlacesStore/VirtualPlacesStore.ts` (+ test) | Create, read, write a places dataset; list places dataset ids. |

### Edge function (`supabase/functions/geocode/`)

| File | Responsibility |
| --- | --- |
| Create `index.ts`, `deno.json`, `.npmrc` | Function entry and import map (copied from `support`). |
| Create `GeocoderProvider.types.ts` | `GeocodeBiasBox`, `GeocodeCandidate`, `GeocoderProvider`. |
| Create `createGeoapifyGeocoder/createGeoapifyGeocoder.ts` (+ test) | Geoapify implementation of `GeocoderProvider`. |
| Create `GeocodeRoutes/GeocodeRoutes.types.ts` | `GeocodeAPI` contract. |
| Create `GeocodeRoutes/GeocodeRoutes.ts` (+ test) | `POST /geocode/search`; never logs the query. |
| Modify `supabase/config.toml` (append) | `[functions.geocode]` block. |
| Modify `.env.example.edge` (append) | `GEOAPIFY_API_KEY=` with no value. |
| Modify `src/types/http-api.types.ts` | Registers `GeocodeAPI` with `APIClient`. |

### GIS app

| File | Responsibility |
| --- | --- |
| Modify `src/views/GisApp/tools/MapToolMode.types.ts` | Adds `{ type: "place" }`. |
| Modify `src/views/GisApp/tools/mapToolCursor/mapToolCursor.test.ts` | Crosshair for the place tool. |
| Create `src/views/GisApp/MapCanvas/useMapToolGestures/attachPlaceGestures/attachPlaceGestures.ts` (+ test) | One click picks a point; Escape returns to Pan. |
| Modify `src/views/GisApp/MapCanvas/useMapToolGestures/useMapToolGestures.ts` | Registers the place gesture and `onPlacePicked`. |
| Modify `src/views/GisApp/MapCanvas/useMapCanvas.ts` | Threads `onPlacePicked`. |
| Create `src/views/GisApp/places/PlaceTool.types.ts` | Draft, state, controller, and inspector handler types. |
| Create `src/views/GisApp/places/placeDraftReducer/placeDraftReducer.ts` (+ test) | Pure draft state machine. |
| Create `src/views/GisApp/places/usePlaceToolState.ts` | `useReducer` over the draft with stable dispatchers. |
| Modify `src/views/GisApp/useGisApp/useGisAppState.ts` | Owns `placeToolState`, passes `onPlacePicked` to the canvas. |
| Create `src/views/GisApp/places/createPlacesLayer/createPlacesLayer.ts` (+ test) | Places dataset to a bound point layer. |
| Create `src/views/GisApp/places/getPlacesLayerDatasetIds/getPlacesLayerDatasetIds.ts` (+ test) | Places datasets a map already shows. |
| Create `src/views/GisApp/places/refreshPlacesDatasetCaches/refreshPlacesDatasetCaches.ts` (+ test) | Drops every cached copy of a places dataset's rows. |
| Create `src/views/GisApp/places/usePlacesActions.ts` | Create dataset, add layer, save, delete, load for edit. |
| Create `src/views/GisApp/places/useRefreshPlacesOnMapOpen.ts` | Fresh places rows each time a map opens. |
| Create `src/views/GisApp/places/usePlaceTool.ts` | Composes the `PlaceToolController`. |
| Modify `src/views/GisApp/GisAppMapShell.tsx` | Builds the controller, hands it to the cluster and inspector. |
| Modify `src/views/GisApp/GisAppMapToolCluster.tsx`, `shell/MapToolCluster/MapToolCluster.tsx`, `shell/MapToolCluster/MapToolClusterToolbar.tsx` | Wire `placeTool`. |
| Create `src/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceMapTool.tsx` (+ test) | Tool button and popover. |
| Create `.../PlaceMapTool/PlaceMapToolTrigger.tsx` | The cluster button. |
| Create `.../PlaceMapTool/PlaceToolSteps.tsx` | Picks the popover step. |
| Create `.../PlaceMapTool/PlaceDatasetStep.tsx` | Choose or create a places dataset. |
| Create `.../PlaceMapTool/PlaceLocationStep.tsx` | Click, coordinates, or address. |
| Create `.../PlaceMapTool/PlaceForm/PlaceForm.tsx`, `PlaceFormFields.tsx` (+ test) | Name, address, dates, notes; validation messages. |
| Create `.../PlaceMapTool/AddressSearchField/AddressSearchField.tsx`, `AddressSearchResults.tsx`, `useAddressSearch.ts` (+ test) | Address search, privacy help, OSM attribution. |
| Modify `.../GoToMapTool/GoToMapTool.tsx` (+ test), create `GoToAddPlaceButton.tsx` | "Add a place here" on a coordinate result. |
| Create `src/views/GisApp/panels/FeatureInspector/PlaceFeatureActions/PlaceFeatureActions.tsx` (+ test) | Edit, Move, Delete. |
| Modify `src/views/GisApp/panels/FeatureInspector/FeatureInspector.tsx` | Renders place actions for places layers. |
| Create `tests/e2e/gis-places.spec.ts` | Click, coordinates, stubbed address search, edit, delete. |
| Modify `docs/design/gis/feature-home-inventory.md` | Records the point-input tool decision (§5). |

---

## Task 0: Workspace

**Files:** none.

- [ ] **Step 1: Create the worktree.** Load the `using-wt` skill first, then run:

```bash
wt new feat/gis-places demo/measles
```

Expected: a new worktree on branch `feat/gis-places`, based on `demo/measles`. Run every later command from that worktree's root.

- [ ] **Step 2: Isolate the database (this feature has schema work).** Before any `pnpm db:*`, `supabase start`, `supabase stop`, `supabase test db`, or `supabase db diff`:

```bash
ava supabase status
```

If the first line says `This is the develop local Supabase`, run:

```bash
ava supabase switch
ava supabase status
```

Expected: the first line names the project `feat-gis-places`. Do not continue until it does. If `ava` is not on `PATH`, run `pnpm build:ava-cli` first. Never edit `supabase/config.toml` ports or project id.

- [ ] **Step 3: Install and baseline.**

```bash
pnpm install
pnpm vitest run src/views/GisApp/tools/parseMapGoToQuery
pnpm test:executed src/clients/qetl/QueryMediator/relationLoading/getColumnReplacementsFromColumns
```

Expected: both report `1 passed`. (`test:executed` is `vitest run --config vitest.executed.config.ts`.)

- [ ] **Step 4 (optional, demo data only).** Load the Workflow B catalog listings for manual checks near NYC schools with the mirror-catalog scripts (ask Pablo for the folder): `REPO=$PWD bash <mirror-catalog>/load-local.sh`. No test in this plan depends on them.

---

## Task 1: Spike, a `VALUES` virtual dataset loads through QETL

The question: does a virtual dataset whose `raw_sql` reads no relation load, and do its Parquet columns carry exactly the types the dataset's `dataset_columns` will declare? If yes, the column list can be written by hand (`PLACES_DATASET_COLUMNS`) with `detected_data_type` equal to `data_type`, so relation loading applies no casts.

**Files:**
- Create: `src/clients/places/__tests__/valuesVirtualDataset.integration.executed.test.ts`
- Create: `tests/e2e/places-values-dataset.spec.ts`

- [ ] **Step 1: Write the executed spike test.**

```ts
// src/clients/places/__tests__/valuesVirtualDataset.integration.executed.test.ts
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DuckDbSqlAnalyzer } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer";
import { withDuckDb } from "../../../../tests/integration/queries/executedDuckDb";

/**
 * A places dataset's stored SQL reads no relation, so QETL must load it
 * without dependencies, and the Parquet it writes must keep the declared
 * column types.
 */

const STORED_VALUES_SQL = `SELECT * FROM (VALUES
  (CAST('p1' AS VARCHAR), 'O''Brien''s Café', CAST(NULL AS VARCHAR), CAST(40.7603 AS DOUBLE), CAST(-73.9885 AS DOUBLE), CAST('2026-10-02T18:00' AS TIMESTAMP), CAST(NULL AS TIMESTAMP), CAST(NULL AS VARCHAR))
) AS places(place_id, name, address, latitude, longitude, starts_at, ends_at, notes)`;

const EXPECTED_COLUMN_TYPES = {
  place_id: "VARCHAR",
  name: "VARCHAR",
  address: "VARCHAR",
  latitude: "DOUBLE",
  longitude: "DOUBLE",
  starts_at: "TIMESTAMP",
  ends_at: "TIMESTAMP",
  notes: "VARCHAR",
};

async function _describeParquetRoundTrip(): Promise<Record<string, string>> {
  const parquetPath = path.join(
    mkdtempSync(path.join(tmpdir(), "ava-places-spike-")),
    "places.parquet",
  );
  return await withDuckDb(async (connection) => {
    await connection.run(
      `COPY (${STORED_VALUES_SQL}) TO '${parquetPath}' (FORMAT PARQUET)`,
    );
    const described = await connection.runAndReadAll(
      `DESCRIBE SELECT * FROM '${parquetPath}'`,
    );
    return Object.fromEntries(
      described.getRowObjects().map((column) => {
        return [String(column.column_name), String(column.column_type)];
      }),
    );
  });
}

describe("a VALUES virtual dataset", () => {
  it("names no dataset QETL would have to load first", () => {
    expect(DuckDbSqlAnalyzer.getReadDatasetIdsFromSql(STORED_VALUES_SQL)).toEqual(
      [],
    );
  });

  it("writes Parquet whose column types match the declared places columns", async () => {
    expect(await _describeParquetRoundTrip()).toEqual(EXPECTED_COLUMN_TYPES);
  });
});
```

- [ ] **Step 2: Run it.**

```bash
pnpm test:executed src/clients/places/__tests__/valuesVirtualDataset.integration.executed.test.ts
```

Expected: `2 passed`. (The analyzer and DuckDB were checked by hand while writing this plan, so the expected outcome is green. A red here is the spike failing, not a test bug: stop and read the decision rule in Step 6.)

- [ ] **Step 3: Write the browser spike spec.** It seeds a `VALUES` virtual dataset before the page loads (Arrange, allowed by `docs/rules/e2e-testing.md`), then reads it through the Data Explorer UI, which is the real QETL path (`VirtualDatasetWrapper`, relation cache, `loadParquet` with column replacements).

```ts
// tests/e2e/places-values-dataset.spec.ts
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { runSqlOverDataset } from "./helpers/dataExplorerFlow";
import { deleteDatasetAndShares } from "./helpers/datasetSharingCleanup";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT } from "./helpers/timeouts";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

const DATASET_NAME = "E2E VALUES places spike";
const PLACE_NAME = "O'Brien's Café";
const RAW_SQL = `SELECT * FROM (VALUES (CAST('p1' AS VARCHAR), 'O''Brien''s Café', CAST(40.7603 AS DOUBLE))) AS places(place_id, name, latitude)`;

/** Inserts a virtual dataset owned by the workspace owner, before page load. */
async function _seedValuesDataset(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
}): Promise<string> {
  const { supabaseAdminClient, workspaceId } = options;
  const { data: workspace } = await supabaseAdminClient
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single()
    .throwOnError();
  const { data: profile } = await supabaseAdminClient
    .from("user_profiles")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", workspace.owner_id)
    .single()
    .throwOnError();
  const { data: dataset } = await supabaseAdminClient
    .from("datasets")
    .insert({
      workspace_id: workspaceId,
      owner_id: workspace.owner_id,
      owner_profile_id: profile.id,
      name: DATASET_NAME,
      source_type: "virtual",
    })
    .select("id")
    .single()
    .throwOnError();
  await supabaseAdminClient
    .from("dataset_columns")
    .insert(
      [
        ["place_id", "VARCHAR", "varchar"],
        ["name", "VARCHAR", "varchar"],
        ["latitude", "DOUBLE", "double"],
      ].map(([name, duckDbType, dataType], columnIdx) => {
        return {
          dataset_id: dataset.id,
          workspace_id: workspaceId,
          original_name: name!,
          name: name!,
          original_data_type: duckDbType!,
          detected_data_type: duckDbType as "VARCHAR" | "DOUBLE",
          data_type: dataType as "varchar" | "double",
          column_idx: columnIdx,
        };
      }),
    )
    .throwOnError();
  await supabaseAdminClient
    .from("datasets__virtual")
    .insert({ dataset_id: dataset.id, workspace_id: workspaceId, raw_sql: RAW_SQL })
    .throwOnError();
  return dataset.id;
}

test("a VALUES virtual dataset shows its rows in the Data Explorer", async ({
  page,
  e2eWorkerDb,
}) => {
  const supabaseAdminClient = createSupabaseAdminClient();
  const { primaryUser, workspaceSlug } = e2eWorkerDb;
  let datasetId = "";
  try {
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient,
      slug: workspaceSlug,
    });
    datasetId = await _seedValuesDataset({ supabaseAdminClient, workspaceId });
    await signInWithEmailPassword(page, {
      email: primaryUser.email,
      password: primaryUser.password,
      workspaceSlug,
    });
    await runSqlOverDataset({
      page,
      datasetName: DATASET_NAME,
      columnName: "name",
      sql: `SELECT name, typeof(latitude) AS latitude_type FROM "${datasetId}"`,
    });
    await expect(page.getByRole("gridcell")).toHaveText(
      [PLACE_NAME, "DOUBLE"],
      { timeout: LONG_WAIT },
    );
  } finally {
    if (datasetId) {
      await deleteDatasetAndShares({ supabaseAdminClient, datasetId });
    }
  }
});
```

- [ ] **Step 4: Start the app stack and run the spec.** (Local Supabase is already switched, Task 0.)

```bash
pnpm test:e2e places-values-dataset.spec.ts
```

Expected: `1 passed`.

- [ ] **Step 5: Commit.**

```bash
git add src/clients/places/__tests__/valuesVirtualDataset.integration.executed.test.ts tests/e2e/places-values-dataset.spec.ts
git commit -m "test(places): prove a VALUES virtual dataset loads through QETL"
```

- [ ] **Step 6: Decide.**
  - Both green: continue with Task 2 (virtual branch).
  - Either red because the analyzer refuses the SQL, the Parquet types differ, or the Data Explorer cannot read the dataset: keep both tests (they document the failure; mark the failing `it` / `test` with `.fails` and a comment naming the observed error), then jump to **CSV fallback branch** at the end of this plan and do C2, C3, C9 in place of 2, 3, 9, and C16 inside Task 16.

---

## Task 2: Schema, `is_places` and `rpc_datasets__add_places_dataset`

**Files:**
- Modify: `supabase/schemas/20.datasets__virtual.sql:19-20` (column list end)
- Create: `supabase/schemas/70.rpc_datasets__add_places_dataset.sql`
- Test: `supabase/tests/database/rpc_datasets__add_places_dataset.test.sql`
- Generated: migration, `shared/types/database.types.ts`, desktop `.gen.sql`

Why a new RPC rather than a new argument on `rpc_datasets__add_virtual_dataset`: `supabase/tests/database/datasets__virtual_contract.test.sql` pins that RPC to six arguments. Why an RPC rather than insert-then-update from the client: the flag and the dataset are created in one transaction, so a failed second call cannot leave an unflagged, uneditable places dataset behind. It is a peer of the other `70.rpc_datasets__add_*` files (all depend only on `60.rpc_datasets__add_dataset.sql`), so it takes index `70`.

- [ ] **Step 1: Write the failing pgTAP test.**

```sql
-- supabase/tests/database/rpc_datasets__add_places_dataset.test.sql
\set ON_ERROR_STOP on

/**
 * `rpc_datasets__add_places_dataset` creates a virtual dataset flagged as a
 * places dataset, with its columns, in one call. Only a workspace admin may
 * create one, and the plain virtual dataset RPC still leaves the flag off.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('a7000001-0000-4000-8000-000000000001'::uuid, 'places_owner@test.dev', 'authenticated', 'authenticated'),
  ('a7000002-0000-4000-8000-000000000002'::uuid, 'places_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values ('a7001001-0000-4000-8000-000000000001'::uuid, 'a7000001-0000-4000-8000-000000000001'::uuid, 'places ws', 'places-ws')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values ('a7002001-0000-4000-8000-000000000001'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7000001-0000-4000-8000-000000000001'::uuid, null)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values ('a7003001-0000-4000-8000-000000000001'::uuid, 'a7000001-0000-4000-8000-000000000001'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7002001-0000-4000-8000-000000000001'::uuid, 'Places Owner', 'Places Owner')
on conflict (id) do nothing;

select plan (7);

-- 1.
select has_column (
  'public',
  'datasets__virtual',
  'is_places',
  'datasets__virtual has an is_places flag'
);

-- 2.
select col_default_is (
  'public',
  'datasets__virtual',
  'is_places',
  'false',
  'is_places defaults to false'
);

-- 3.
select lives_ok (
  $t3$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select public.rpc_datasets__add_places_dataset (
    'a7004001-0000-4000-8000-000000000001'::uuid,
    'a7001001-0000-4000-8000-000000000001'::uuid,
    'Exposure sites',
    '',
    array[
      row('place_id', 'place_id', '', 'VARCHAR', 'VARCHAR', 'varchar', 0)::public.dataset_column_input,
      row('latitude', 'latitude', '', 'DOUBLE', 'DOUBLE', 'double', 1)::public.dataset_column_input
    ],
    'SELECT CAST(NULL AS VARCHAR) AS place_id, CAST(NULL AS DOUBLE) AS latitude WHERE false'
  );
  $t3$,
  'the workspace owner creates a places dataset'
);

reset role;

-- 4.
select is (
  (select is_places from public.datasets__virtual where dataset_id = 'a7004001-0000-4000-8000-000000000001'::uuid),
  true,
  'the places RPC flags its virtual row'
);

-- 5.
select is (
  (select count(*)::integer from public.dataset_columns where dataset_id = 'a7004001-0000-4000-8000-000000000001'::uuid),
  2,
  'the places RPC writes the columns it was given'
);

-- 6.
select lives_ok (
  $t6$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select public.rpc_datasets__add_virtual_dataset (
    'a7004002-0000-4000-8000-000000000002'::uuid,
    'a7001001-0000-4000-8000-000000000001'::uuid,
    'Plain query',
    '',
    array[row('one', 'one', '', 'INTEGER', 'INTEGER', 'bigint', 0)::public.dataset_column_input],
    'SELECT 1 AS one'
  );
  reset role;
  do $check$
  begin
    if (select is_places from public.datasets__virtual where dataset_id = 'a7004002-0000-4000-8000-000000000002'::uuid) then
      raise exception 'plain virtual dataset was flagged as places';
    end if;
  end
  $check$;
  $t6$,
  'the plain virtual RPC leaves is_places false'
);

reset role;

-- 7.
select throws_ok (
  $t7$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  select public.rpc_datasets__add_places_dataset (
    'a7004003-0000-4000-8000-000000000003'::uuid,
    'a7001001-0000-4000-8000-000000000001'::uuid,
    'Not mine',
    '',
    array[]::public.dataset_column_input[],
    'SELECT 1 AS one'
  );
  $t7$,
  'The requesting user is not an admin of this workspace',
  'a user outside the workspace cannot create a places dataset'
);

reset role;

select * from finish();

rollback;
```

- [ ] **Step 2: Run it to see it fail.** Re-check the switch first (`ava supabase status`, Task 0 Step 2).

```bash
supabase test db supabase/tests/database/rpc_datasets__add_places_dataset.test.sql
```

Expected: FAIL at test 1 (`Column public.datasets__virtual.is_places should exist`) and at test 3 (`function public.rpc_datasets__add_places_dataset ... does not exist`).

- [ ] **Step 3: Add the column.** In `supabase/schemas/20.datasets__virtual.sql`, replace the end of the column list:

```sql
  -- The query that was used to generate the dataset
  raw_sql text not null,
  -- True for a places dataset: `raw_sql` is a `VALUES` list of hand-placed
  -- sites that the map's "Add a place" tool rewrites on every edit.
  is_places boolean not null default false
);
```

- [ ] **Step 4: Add the RPC.**

```sql
-- supabase/schemas/70.rpc_datasets__add_places_dataset.sql
/**
 * Add a places dataset to a workspace: a virtual dataset whose defining SQL is
 * a `VALUES` list of hand-placed sites, flagged so the map's "Add a place"
 * tool may rewrite it. The GIS app calls this when a user creates a dataset
 * such as "Exposure sites".
 *
 * @param p_columns The fixed places columns.
 * @param p_raw_sql The `VALUES` query that holds the places.
 *
 * @returns The created dataset.
 */
create or replace function public.rpc_datasets__add_places_dataset (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_columns public.dataset_column_input[],
  p_raw_sql text
) returns public.datasets as $$
declare
  v_dataset public.datasets;
begin
  v_dataset := public.rpc_datasets__add_dataset(
    p_dataset_id,
    p_workspace_id,
    p_dataset_name,
    p_dataset_description,
    'virtual',
    p_columns
  );

  insert into public.datasets__virtual(
    dataset_id,
    workspace_id,
    raw_sql,
    is_places
  ) values (
    v_dataset.id,
    p_workspace_id,
    p_raw_sql,
    true
  );

  return v_dataset;
end;
$$ language plpgsql security invoker;

-- `authenticated` only, the one role that calls this as an rpc.
revoke
execute on function public.rpc_datasets__add_places_dataset (
  uuid,
  uuid,
  text,
  text,
  public.dataset_column_input[],
  text
)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_datasets__add_places_dataset (
  uuid,
  uuid,
  text,
  text,
  public.dataset_column_input[],
  text
) to authenticated;
```

No comment goes inside the `$$ ... $$` body: a body comment is itself a schema change in `db diff`.

- [ ] **Step 5: Generate the migration and types.** Load the `supabase-declarative-schema` skill. Re-check `ava supabase status` names `feat-gis-places`. Then, with nothing in between:

```bash
pnpm db:reset
pnpm db:new-migration add_places_datasets
pnpm db:gen-types
pnpm desktop:sqlite:gen-migrations
```

Expected: one new `supabase/migrations/*_add_places_datasets.sql` containing `alter table "public"."datasets__virtual" add column "is_places" boolean not null default false`, the new function, and its `revoke`/`grant`. It must contain no `drop` of anything this task did not touch; if it does, the stack was shared: reset, regenerate, compare. `shared/types/database.types.ts` gains `is_places` on `datasets__virtual` and `rpc_datasets__add_places_dataset`. A new `apps/desktop/migrations/*_add_places_datasets.gen.sql` adds the column for the desktop mirror (the desktop is pre-release, so this is fine).

- [ ] **Step 6: Run the tests.**

```bash
supabase test db supabase/tests/database/rpc_datasets__add_places_dataset.test.sql
supabase test db supabase/tests/database/datasets__virtual_contract.test.sql
```

Expected: `7/7` and `3/3` pass.

- [ ] **Step 7: Commit.**

```bash
git add supabase/schemas/20.datasets__virtual.sql supabase/schemas/70.rpc_datasets__add_places_dataset.sql supabase/tests/database/rpc_datasets__add_places_dataset.test.sql supabase/migrations shared/types/database.types.ts apps/desktop/migrations
git commit -m "feat(places): flag virtual datasets as places and add their create RPC"
```

---

## Task 3: `isPlaces` on the `VirtualDataset` model

**Files:**
- Modify: `shared/models/datasets/VirtualDataset/VirtualDataset.types.ts:12-55`
- Modify: `shared/models/datasets/VirtualDataset/VirtualDatasetParsers.ts:14-21`

The "test" here is the compile-time `ZodConsistencyTests` block at the bottom of `VirtualDatasetParsers.ts`, which fails `tsc` once `database.types.ts` has `is_places` and the zod schema does not.

- [ ] **Step 1: See it fail.**

```bash
pnpm tsc -b --force 2>&1 | grep -n "VirtualDatasetParsers" | head -5
```

Expected: an error inside `ZodConsistencyTests` in `VirtualDatasetParsers.ts` (the `DBReadSchema` lacks `is_places`).

- [ ] **Step 2: Add the field to the model.** In `VirtualDataset.types.ts`, after `rawSql`:

```ts
    /** The raw SQL query that was used to generate the dataset. */
    rawSql: string;

    /**
     * True for a places dataset, whose `rawSql` is a `VALUES` list the map's
     * "Add a place" tool rewrites. Read by the GIS app to decide which
     * datasets it may edit; every other reader treats it as a plain query.
     */
    isPlaces: boolean;
```

and make it optional on insert:

```ts
      Insert: SetOptional<
        VirtualDatasetRead,
        "id" | "createdAt" | "updatedAt" | "isPlaces"
      >;
```

- [ ] **Step 3: Add the column to the parser.** In `VirtualDatasetParsers.ts`:

```ts
const DBReadSchema = z.object({
  id: z.uuid(),
  dataset_id: z.uuid(),
  workspace_id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
  raw_sql: z.string(),
  is_places: z.boolean(),
});
```

`camelCaseKeysDeep` already maps `is_places` to `isPlaces`.

- [ ] **Step 4: Verify.**

```bash
pnpm tsc -b --force
pnpm vitest run src/clients/qetl/wrappers/VirtualDatasetWrapper src/clients/qetl/QueryMediator/__tests__/getRelationSources.test.ts
```

Expected: no type errors; both suites pass.

- [ ] **Step 5: Commit.**

```bash
git add shared/models/datasets/VirtualDataset
git commit -m "feat(places): read is_places on the VirtualDataset model"
```

---

## Task 4: Places types and constants

**Files:**
- Create: `src/clients/places/places.types.ts`
- Create: `src/clients/places/places.constants.ts`

Types and constants carry no behavior to test; Tasks 5 to 9 test them through the functions that use them. The column list deliberately adds `place_id` to the spec's seven columns: Edit, Move, and Delete need a stable identity for one row, and a full-tuple match would break on two identical rows and on how timestamps reach feature properties.

- [ ] **Step 1: Write the types.**

```ts
// src/clients/places/places.types.ts
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";

/** A point on the map, in WGS 84 degrees. */
export type PlaceCoordinate = { latitude: number; longitude: number };

/**
 * One place as the place form produces it, before it has an identity. Text
 * fields left empty are `undefined`, which is stored as SQL `NULL`.
 */
export type PlaceInput = {
  name: string;
  address: string | undefined;
  latitude: number;
  longitude: number;

  /** Local wall-clock time, `YYYY-MM-DDTHH:mm`, as a `datetime-local` writes it. */
  startsAt: string | undefined;

  /** Local wall-clock time, `YYYY-MM-DDTHH:mm`. */
  endsAt: string | undefined;
  notes: string | undefined;
};

/** One stored place: its input plus the id that Edit, Move, and Delete use. */
export type PlaceRow = PlaceInput & { placeId: string };

/** Who is reading or writing a places dataset, and which one. */
type PlacesStoreTarget = Readonly<{
  workspaceId: Workspace.Id;
  userId: User.Id;
  datasetId: Dataset.Id;
}>;

/**
 * Where a places dataset's rows live. The GIS app's place tool reads and
 * rewrites rows only through this, so the storage behind it (a virtual
 * dataset, or a rewritten CSV dataset) can change without touching the UI.
 */
export type PlacesStore = {
  createPlacesDataset: (
    options: Readonly<{
      workspaceId: Workspace.Id;
      userId: User.Id;
      datasetName: string;
    }>,
  ) => Promise<Dataset.T>;
  readPlaces: (options: PlacesStoreTarget) => Promise<PlaceRow[]>;
  writePlaces: (
    options: PlacesStoreTarget & Readonly<{ rows: readonly PlaceRow[] }>,
  ) => Promise<void>;

  /** Ids of the workspace's places datasets. A React hook. */
  usePlacesDatasetIds: (workspaceId: Workspace.Id) => ReadonlySet<Dataset.Id>;
};
```

- [ ] **Step 2: Write the constants.**

```ts
// src/clients/places/places.constants.ts
import type { DatasetColumnInput } from "@/clients/datasets/DatasetClient/DatasetClient.types";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";

/** Most places one places dataset holds: it is for hand-placed sites, not imports. */
export const PLACES_MAX_ROWS = 500;

/**
 * Every places column, in stored order, with the DuckDB type its SQL casts
 * to. `buildPlacesValuesSql` writes tuples in this order.
 */
export const PLACES_COLUMNS = [
  { name: "place_id", duckDbType: "VARCHAR", dataType: "varchar" },
  { name: "name", duckDbType: "VARCHAR", dataType: "varchar" },
  { name: "address", duckDbType: "VARCHAR", dataType: "varchar" },
  { name: "latitude", duckDbType: "DOUBLE", dataType: "double" },
  { name: "longitude", duckDbType: "DOUBLE", dataType: "double" },
  { name: "starts_at", duckDbType: "TIMESTAMP", dataType: "timestamp" },
  { name: "ends_at", duckDbType: "TIMESTAMP", dataType: "timestamp" },
  { name: "notes", duckDbType: "VARCHAR", dataType: "varchar" },
] as const satisfies ReadonlyArray<{
  name: string;
  duckDbType: "VARCHAR" | "DOUBLE" | "TIMESTAMP";
  dataType: AvaDataType.T;
}>;

/**
 * The `dataset_columns` a places dataset is created with. The detected type
 * equals the stored type because the `VALUES` SQL casts every value, so
 * relation loading applies no cast.
 */
export const PLACES_DATASET_COLUMNS: readonly DatasetColumnInput[] =
  PLACES_COLUMNS.map((column, columnIdx) => {
    return {
      original_name: column.name,
      name: column.name,
      description: "",
      original_data_type: column.duckDbType,
      detected_data_type: column.duckDbType,
      data_type: column.dataType,
      column_idx: columnIdx,
    };
  });
```

- [ ] **Step 3: Type check.**

```bash
pnpm tsc -b --force
```

Expected: no errors.

- [ ] **Step 4: Commit.**

```bash
git add src/clients/places/places.types.ts src/clients/places/places.constants.ts
git commit -m "feat(places): define place rows, the store contract, and the places columns"
```

---

## Task 5: `validatePlaceInput`

**Files:**
- Create: `src/clients/places/validatePlaceInput/validatePlaceInput.ts`
- Test: `src/clients/places/validatePlaceInput/validatePlaceInput.test.ts`

- [ ] **Step 1: Write the failing test.**

```ts
// src/clients/places/validatePlaceInput/validatePlaceInput.test.ts
import { describe, expect, it } from "vitest";
import { validatePlaceInput } from "@/clients/places/validatePlaceInput/validatePlaceInput";

const DRAFT = {
  name: "  Restaurant, W 46th St  ",
  address: "",
  latitude: 40.7603,
  longitude: -73.9885,
  startsAt: "2026-10-02T18:00",
  endsAt: "2026-10-02T22:00",
  notes: "",
};

describe("validatePlaceInput", () => {
  it("trims the name and stores empty text as undefined", () => {
    expect(validatePlaceInput(DRAFT)).toEqual({
      type: "valid",
      input: {
        name: "Restaurant, W 46th St",
        address: undefined,
        latitude: 40.7603,
        longitude: -73.9885,
        startsAt: "2026-10-02T18:00",
        endsAt: "2026-10-02T22:00",
        notes: undefined,
      },
    });
  });

  it("drops the seconds a datetime-local input may add", () => {
    const result = validatePlaceInput({ ...DRAFT, startsAt: "2026-10-02T18:00:30" });
    expect(result.type === "valid" ? result.input.startsAt : undefined).toBe(
      "2026-10-02T18:00",
    );
  });

  it("removes NUL characters a pasted name may carry", () => {
    const result = validatePlaceInput({ ...DRAFT, name: "Caf\u0000é" });
    expect(result.type === "valid" ? result.input.name : undefined).toBe("Café");
  });

  it.each([
    [{ name: "   " }, "nameRequired"],
    [{ name: "x".repeat(201) }, "nameTooLong"],
    [{ address: "x".repeat(501) }, "addressTooLong"],
    [{ notes: "x".repeat(2001) }, "notesTooLong"],
    [{ latitude: 90.0001 }, "latitudeOutOfRange"],
    [{ latitude: Number.NaN }, "latitudeOutOfRange"],
    [{ longitude: -180.5 }, "longitudeOutOfRange"],
    [{ startsAt: "10/02/2026" }, "invalidDateTime"],
    [{ endsAt: "2026-10-02T17:00" }, "endsBeforeStarts"],
  ])("refuses %o as %s", (override, reason) => {
    expect(validatePlaceInput({ ...DRAFT, ...override })).toEqual({
      type: "invalid",
      reason,
    });
  });
});
```

- [ ] **Step 2: Run it.**

```bash
pnpm vitest run src/clients/places/validatePlaceInput
```

Expected: FAIL, `Failed to resolve import "@/clients/places/validatePlaceInput/validatePlaceInput"`.

- [ ] **Step 3: Implement.**

```ts
// src/clients/places/validatePlaceInput/validatePlaceInput.ts
import type { PlaceInput } from "@/clients/places/places.types";

const MAX_NAME_LENGTH = 200;
const MAX_ADDRESS_LENGTH = 500;
const MAX_NOTES_LENGTH = 2000;
const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

/** The place form's raw field values, every text field as typed. */
export type PlaceInputDraft = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  startsAt: string;
  endsAt: string;
  notes: string;
};

/** Why a draft cannot be saved. The form translates each into a message. */
export type PlaceInputInvalidReason =
  | "nameRequired"
  | "nameTooLong"
  | "addressTooLong"
  | "notesTooLong"
  | "latitudeOutOfRange"
  | "longitudeOutOfRange"
  | "invalidDateTime"
  | "endsBeforeStarts";

/** A saveable `PlaceInput`, or the first reason the draft is not one. */
export type PlaceInputValidation =
  | { type: "valid"; input: PlaceInput }
  | { type: "invalid"; reason: PlaceInputInvalidReason };

function _cleanText(value: string): string | undefined {
  const cleaned = value.replaceAll("\u0000", "").trim();
  return cleaned === "" ? undefined : cleaned;
}

function _cleanDateTime(value: string): string | undefined | "invalid" {
  const trimmed = value.trim();
  if (trimmed === "") {
    return undefined;
  }
  return DATE_TIME_PATTERN.test(trimmed) ? trimmed.slice(0, 16) : "invalid";
}

function _isInRange(value: number, limit: number): boolean {
  return Number.isFinite(value) && value >= -limit && value <= limit;
}

function _getLengthReason(
  options: Readonly<{ name: string; address?: string; notes?: string }>,
): PlaceInputInvalidReason | undefined {
  if (options.name.length > MAX_NAME_LENGTH) {
    return "nameTooLong";
  }
  if ((options.address?.length ?? 0) > MAX_ADDRESS_LENGTH) {
    return "addressTooLong";
  }
  return (options.notes?.length ?? 0) > MAX_NOTES_LENGTH
    ? "notesTooLong"
    : undefined;
}

/**
 * Turns the place form's fields into a `PlaceInput` that is safe to write
 * into a places dataset, or says why it is not. Use it before any place is
 * added or replaced, for example from the place form's submit handler.
 */
export function validatePlaceInput(
  draft: Readonly<PlaceInputDraft>,
): PlaceInputValidation {
  const name = _cleanText(draft.name);
  const address = _cleanText(draft.address);
  const notes = _cleanText(draft.notes);
  const startsAt = _cleanDateTime(draft.startsAt);
  const endsAt = _cleanDateTime(draft.endsAt);
  if (name === undefined) {
    return { type: "invalid", reason: "nameRequired" };
  }
  const lengthReason = _getLengthReason({ name, address, notes });
  if (lengthReason) {
    return { type: "invalid", reason: lengthReason };
  }
  if (!_isInRange(draft.latitude, 90)) {
    return { type: "invalid", reason: "latitudeOutOfRange" };
  }
  if (!_isInRange(draft.longitude, 180)) {
    return { type: "invalid", reason: "longitudeOutOfRange" };
  }
  if (startsAt === "invalid" || endsAt === "invalid") {
    return { type: "invalid", reason: "invalidDateTime" };
  }
  if (startsAt !== undefined && endsAt !== undefined && endsAt < startsAt) {
    return { type: "invalid", reason: "endsBeforeStarts" };
  }
  return {
    type: "valid",
    input: { name, address, latitude: draft.latitude, longitude: draft.longitude, startsAt, endsAt, notes },
  };
}
```

- [ ] **Step 4: Run it.**

```bash
pnpm vitest run src/clients/places/validatePlaceInput
```

Expected: `12 passed`.

- [ ] **Step 5: Commit.**

```bash
git add src/clients/places/validatePlaceInput
git commit -m "feat(places): validate and normalize place form input"
```

---

## Task 6: `PlaceRowEdits` and the 500-row cap

**Files:**
- Create: `src/clients/places/PlaceRowEdits/PlaceRowEdits.ts`
- Test: `src/clients/places/PlaceRowEdits/PlaceRowEdits.test.ts`

- [ ] **Step 1: Write the failing test.**

```ts
// src/clients/places/PlaceRowEdits/PlaceRowEdits.test.ts
import { describe, expect, it } from "vitest";
import { PlaceRowEdits } from "@/clients/places/PlaceRowEdits/PlaceRowEdits";
import type { PlaceInput, PlaceRow } from "@/clients/places/places.types";

const PLACE: PlaceInput = {
  name: "Clinic",
  address: undefined,
  latitude: 40.7,
  longitude: -73.9,
  startsAt: undefined,
  endsAt: undefined,
  notes: undefined,
};

function _makeRows(count: number): PlaceRow[] {
  return Array.from({ length: count }, (_unused, index) => {
    return { ...PLACE, placeId: `p${index}` };
  });
}

describe("PlaceRowEdits", () => {
  it("appends a new place with its id", () => {
    expect(
      PlaceRowEdits.withPlaceAdded({ rows: _makeRows(1), placeId: "new", place: PLACE }),
    ).toEqual({ type: "ok", rows: [..._makeRows(1), { ...PLACE, placeId: "new" }] });
  });

  it("refuses the 501st place", () => {
    expect(
      PlaceRowEdits.withPlaceAdded({ rows: _makeRows(500), placeId: "new", place: PLACE }),
    ).toEqual({ type: "limitReached" });
  });

  it("replaces only the place with the matching id, keeping its position", () => {
    const result = PlaceRowEdits.withPlaceReplaced({
      rows: _makeRows(3),
      placeId: "p1",
      place: { ...PLACE, name: "Moved clinic", latitude: 41 },
    });
    expect(result.type === "ok" ? result.rows.map((row) => row.name) : []).toEqual([
      "Clinic",
      "Moved clinic",
      "Clinic",
    ]);
  });

  it("reports a replaced place that someone else already deleted", () => {
    expect(
      PlaceRowEdits.withPlaceReplaced({ rows: _makeRows(1), placeId: "gone", place: PLACE }),
    ).toEqual({ type: "notFound" });
  });

  it("removes the place with the matching id", () => {
    const result = PlaceRowEdits.withPlaceRemoved({ rows: _makeRows(2), placeId: "p0" });
    expect(result).toEqual({ type: "ok", rows: [{ ...PLACE, placeId: "p1" }] });
  });

  it("reports a removed place that is already gone", () => {
    expect(PlaceRowEdits.withPlaceRemoved({ rows: [], placeId: "p0" })).toEqual({
      type: "notFound",
    });
  });
});
```

- [ ] **Step 2: Run it.**

```bash
pnpm vitest run src/clients/places/PlaceRowEdits
```

Expected: FAIL, cannot resolve `PlaceRowEdits`.

- [ ] **Step 3: Implement.**

```ts
// src/clients/places/PlaceRowEdits/PlaceRowEdits.ts
import { propEq } from "@avandar/utils";
import { PLACES_MAX_ROWS } from "@/clients/places/places.constants";
import type { PlaceInput, PlaceRow } from "@/clients/places/places.types";

/** The rows after one edit, or why the edit did not apply. */
export type PlaceEditResult =
  | { type: "ok"; rows: PlaceRow[] }
  | { type: "limitReached" }
  | { type: "notFound" };

function _withPlaceAdded(
  options: Readonly<{ rows: readonly PlaceRow[]; placeId: string; place: PlaceInput }>,
): PlaceEditResult {
  if (options.rows.length >= PLACES_MAX_ROWS) {
    return { type: "limitReached" };
  }
  return {
    type: "ok",
    rows: [...options.rows, { ...options.place, placeId: options.placeId }],
  };
}

function _withPlaceReplaced(
  options: Readonly<{ rows: readonly PlaceRow[]; placeId: string; place: PlaceInput }>,
): PlaceEditResult {
  if (!options.rows.some(propEq("placeId", options.placeId))) {
    return { type: "notFound" };
  }
  return {
    type: "ok",
    rows: options.rows.map((row) => {
      return row.placeId === options.placeId
        ? { ...options.place, placeId: options.placeId }
        : row;
    }),
  };
}

function _withPlaceRemoved(
  options: Readonly<{ rows: readonly PlaceRow[]; placeId: string }>,
): PlaceEditResult {
  if (!options.rows.some(propEq("placeId", options.placeId))) {
    return { type: "notFound" };
  }
  return {
    type: "ok",
    rows: options.rows.filter((row) => {
      return row.placeId !== options.placeId;
    }),
  };
}

/**
 * Applies one edit to a places dataset's rows and enforces its 500-place
 * cap. Use it between reading the rows and rewriting them, for example when
 * the place tool saves or deletes a place.
 */
export const PlaceRowEdits = {
  withPlaceAdded: _withPlaceAdded,
  withPlaceReplaced: _withPlaceReplaced,
  withPlaceRemoved: _withPlaceRemoved,
};
```

- [ ] **Step 4: Run it.**

```bash
pnpm vitest run src/clients/places/PlaceRowEdits
```

Expected: `6 passed`.

- [ ] **Step 5: Commit.**

```bash
git add src/clients/places/PlaceRowEdits
git commit -m "feat(places): add, replace, and remove place rows under a 500-row cap"
```

---

## Task 7: `buildPlacesValuesSql`

**Files:**
- Create: `src/clients/places/buildPlacesValuesSql/buildPlacesValuesSql.ts`
- Test: `src/clients/places/buildPlacesValuesSql/buildPlacesValuesSql.test.ts`

Every value is a typed cast (`CAST(... AS VARCHAR|DOUBLE|TIMESTAMP)`), so a column whose values are all `NULL` still has its declared type, and an empty dataset (which `VALUES` cannot express) is a typed `SELECT ... WHERE false`.

- [ ] **Step 1: Write the failing test.**

```ts
// src/clients/places/buildPlacesValuesSql/buildPlacesValuesSql.test.ts
import { describe, expect, it } from "vitest";
import { buildPlacesValuesSql } from "@/clients/places/buildPlacesValuesSql/buildPlacesValuesSql";
import type { PlaceRow } from "@/clients/places/places.types";

const ROW: PlaceRow = {
  placeId: "p1",
  name: "O'Brien's Café 🍕",
  address: undefined,
  latitude: 40.7603,
  longitude: -73.9885,
  startsAt: "2026-10-02T18:00",
  endsAt: undefined,
  notes: undefined,
};

describe("buildPlacesValuesSql", () => {
  it("writes one typed tuple per place in the places column order", () => {
    expect(buildPlacesValuesSql([ROW])).toBe(
      "SELECT * FROM (VALUES\n" +
        "  ('p1', 'O''Brien''s Café 🍕', CAST(NULL AS VARCHAR), CAST(40.7603 AS DOUBLE), CAST(-73.9885 AS DOUBLE), CAST('2026-10-02T18:00' AS TIMESTAMP), CAST(NULL AS TIMESTAMP), CAST(NULL AS VARCHAR))\n" +
        ") AS places(place_id, name, address, latitude, longitude, starts_at, ends_at, notes)",
    );
  });

  it("doubles a quote that would otherwise end the literal early", () => {
    const sql = buildPlacesValuesSql([
      { ...ROW, notes: "x'); DROP TABLE places; --" },
    ]);
    expect(sql).toContain("'x''); DROP TABLE places; --'");
  });

  it("writes an empty places dataset as a typed query with no rows", () => {
    expect(buildPlacesValuesSql([])).toBe(
      "SELECT CAST(NULL AS VARCHAR) AS place_id, CAST(NULL AS VARCHAR) AS name, CAST(NULL AS VARCHAR) AS address, CAST(NULL AS DOUBLE) AS latitude, CAST(NULL AS DOUBLE) AS longitude, CAST(NULL AS TIMESTAMP) AS starts_at, CAST(NULL AS TIMESTAMP) AS ends_at, CAST(NULL AS VARCHAR) AS notes WHERE false",
    );
  });

  it("refuses a coordinate that is not a finite number", () => {
    expect(() => {
      return buildPlacesValuesSql([{ ...ROW, latitude: Number.NaN }]);
    }).toThrow("A place coordinate must be a finite number.");
  });

  it("refuses more than 500 places", () => {
    const rows = Array.from({ length: 501 }, (_unused, index) => {
      return { ...ROW, placeId: `p${index}` };
    });
    expect(() => {
      return buildPlacesValuesSql(rows);
    }).toThrow("A places dataset holds at most 500 places.");
  });
});
```

- [ ] **Step 2: Run it.**

```bash
pnpm vitest run src/clients/places/buildPlacesValuesSql
```

Expected: FAIL, cannot resolve `buildPlacesValuesSql`.

- [ ] **Step 3: Implement.**

```ts
// src/clients/places/buildPlacesValuesSql/buildPlacesValuesSql.ts
import { prop } from "@avandar/utils";
import { quoteSqlLiteral } from "@avandar/utils/sql";
import { PLACES_COLUMNS, PLACES_MAX_ROWS } from "@/clients/places/places.constants";
import type { PlaceRow } from "@/clients/places/places.types";

function _textLiteral(value: string | undefined): string {
  return value === undefined ? "CAST(NULL AS VARCHAR)" : quoteSqlLiteral(value);
}

function _doubleLiteral(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error("A place coordinate must be a finite number.");
  }
  return `CAST(${value.toString()} AS DOUBLE)`;
}

function _timestampLiteral(value: string | undefined): string {
  return value === undefined
    ? "CAST(NULL AS TIMESTAMP)"
    : `CAST(${quoteSqlLiteral(value)} AS TIMESTAMP)`;
}

function _rowToValuesTuple(row: PlaceRow): string {
  const values = [
    _textLiteral(row.placeId),
    _textLiteral(row.name),
    _textLiteral(row.address),
    _doubleLiteral(row.latitude),
    _doubleLiteral(row.longitude),
    _timestampLiteral(row.startsAt),
    _timestampLiteral(row.endsAt),
    _textLiteral(row.notes),
  ];
  return `(${values.join(", ")})`;
}

function _buildEmptyPlacesSql(): string {
  const columns = PLACES_COLUMNS.map((column) => {
    return `CAST(NULL AS ${column.duckDbType}) AS ${column.name}`;
  });
  return `SELECT ${columns.join(", ")} WHERE false`;
}

/**
 * Writes a places dataset's rows as the `VALUES` query stored in its
 * `raw_sql`. Text goes through `quoteSqlLiteral`, so a value can never end
 * its literal early, and every value is cast so each column keeps its type.
 * Use it whenever a places dataset is created or edited.
 */
export function buildPlacesValuesSql(rows: readonly PlaceRow[]): string {
  if (rows.length > PLACES_MAX_ROWS) {
    throw new Error(`A places dataset holds at most ${PLACES_MAX_ROWS} places.`);
  }
  if (rows.length === 0) {
    return _buildEmptyPlacesSql();
  }
  const columnNames = PLACES_COLUMNS.map(prop("name")).join(", ");
  const tuples = rows.map(_rowToValuesTuple).join(",\n  ");
  return `SELECT * FROM (VALUES\n  ${tuples}\n) AS places(${columnNames})`;
}
```

- [ ] **Step 4: Run it.**

```bash
pnpm vitest run src/clients/places/buildPlacesValuesSql
```

Expected: `5 passed`.

- [ ] **Step 5: Commit.**

```bash
git add src/clients/places/buildPlacesValuesSql
git commit -m "feat(places): write place rows as a typed VALUES query"
```

---

## Task 8: Read SQL, row parsing, and the real-DuckDB round trip

**Files:**
- Create: `src/clients/places/buildPlacesReadSql.ts`
- Create: `src/clients/places/parsePlaceRowsFromQueryRows/parsePlaceRowsFromQueryRows.ts`
- Test: `src/clients/places/parsePlaceRowsFromQueryRows/parsePlaceRowsFromQueryRows.test.ts`
- Test: `src/clients/places/__tests__/placesSqlRoundTrip.integration.executed.test.ts`

- [ ] **Step 1: Write the failing parser test.**

```ts
// src/clients/places/parsePlaceRowsFromQueryRows/parsePlaceRowsFromQueryRows.test.ts
import { describe, expect, it } from "vitest";
import { parsePlaceRowsFromQueryRows } from "@/clients/places/parsePlaceRowsFromQueryRows/parsePlaceRowsFromQueryRows";

const QUERY_ROW = {
  place_id: "p1",
  name: "Clinic",
  address: null,
  latitude: 40.7,
  longitude: -73.9,
  starts_at: "2026-10-02T18:00",
  ends_at: null,
  notes: "",
};

describe("parsePlaceRowsFromQueryRows", () => {
  it("maps snake_case query columns to a place row, nulls to undefined", () => {
    expect(parsePlaceRowsFromQueryRows([QUERY_ROW])).toEqual([
      {
        placeId: "p1",
        name: "Clinic",
        address: undefined,
        latitude: 40.7,
        longitude: -73.9,
        startsAt: "2026-10-02T18:00",
        endsAt: undefined,
        notes: undefined,
      },
    ]);
  });

  it("refuses a row from a dataset that is not a places dataset", () => {
    expect(() => {
      return parsePlaceRowsFromQueryRows([{ one: 1 }]);
    }).toThrow("This dataset's rows are not places.");
  });
});
```

- [ ] **Step 2: Run it.**

```bash
pnpm vitest run src/clients/places/parsePlaceRowsFromQueryRows
```

Expected: FAIL, cannot resolve the module.

- [ ] **Step 3: Implement the read SQL and the parser.**

```ts
// src/clients/places/buildPlacesReadSql.ts
import { normalizeSqlForSubquery } from "@avandar/utils/sql";

/**
 * Wraps a places dataset's stored SQL (or any SQL returning the places
 * columns) so its timestamps come back as `YYYY-MM-DDTHH:mm` text, the shape
 * a `datetime-local` input and `PlaceRow` use. Use it to read places for
 * editing, never to display them.
 */
export function buildPlacesReadSql(placesSql: string): string {
  return (
    "SELECT place_id, name, address, latitude, longitude, " +
    "strftime(starts_at, '%Y-%m-%dT%H:%M') AS starts_at, " +
    "strftime(ends_at, '%Y-%m-%dT%H:%M') AS ends_at, notes " +
    `FROM (${normalizeSqlForSubquery(placesSql)}) AS stored_places`
  );
}
```

```ts
// src/clients/places/parsePlaceRowsFromQueryRows/parsePlaceRowsFromQueryRows.ts
import { z } from "zod";
import type { PlaceRow } from "@/clients/places/places.types";

const OptionalTextSchema = z
  .string()
  .nullable()
  .transform((value) => {
    return value === null || value === "" ? undefined : value;
  });

const PlaceQueryRowSchema = z.object({
  place_id: z.string(),
  name: z.string(),
  address: OptionalTextSchema,
  latitude: z.number(),
  longitude: z.number(),
  starts_at: OptionalTextSchema,
  ends_at: OptionalTextSchema,
  notes: OptionalTextSchema,
});

/**
 * Turns the rows `buildPlacesReadSql` returns into place rows. Throws when a
 * row lacks the places columns, which is how the place tool refuses to edit
 * a dataset whose SQL was replaced by something that is not a places list.
 */
export function parsePlaceRowsFromQueryRows(
  rows: ReadonlyArray<Readonly<Record<string, unknown>>>,
): PlaceRow[] {
  const parsed = z.array(PlaceQueryRowSchema).safeParse(rows);
  if (!parsed.success) {
    throw new Error("This dataset's rows are not places.");
  }
  return parsed.data.map((row) => {
    return {
      placeId: row.place_id,
      name: row.name,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      notes: row.notes,
    };
  });
}
```

- [ ] **Step 4: Run the parser test.**

```bash
pnpm vitest run src/clients/places/parsePlaceRowsFromQueryRows
```

Expected: `2 passed`.

- [ ] **Step 5: Write the round-trip executed test.** It spans `buildPlacesValuesSql`, `buildPlacesReadSql`, `parsePlaceRowsFromQueryRows`, and `PLACES_COLUMNS`, so it is an integration test in `src/clients/places/__tests__/`.

```ts
// src/clients/places/__tests__/placesSqlRoundTrip.integration.executed.test.ts
import { describe, expect, it } from "vitest";
import { buildPlacesReadSql } from "@/clients/places/buildPlacesReadSql";
import { buildPlacesValuesSql } from "@/clients/places/buildPlacesValuesSql/buildPlacesValuesSql";
import { parsePlaceRowsFromQueryRows } from "@/clients/places/parsePlaceRowsFromQueryRows/parsePlaceRowsFromQueryRows";
import { PLACES_COLUMNS } from "@/clients/places/places.constants";
import { withDuckDb } from "../../../../tests/integration/queries/executedDuckDb";
import type { PlaceRow } from "@/clients/places/places.types";

/**
 * What the place tool writes into `raw_sql` is what it reads back: quotes,
 * unicode, empty optional fields, and an empty dataset all survive DuckDB.
 */

const ROWS: PlaceRow[] = [
  {
    placeId: "p1",
    name: "O'Brien's Café 🍕",
    address: "W 46th St, New York",
    latitude: 40.7603,
    longitude: -73.9885,
    startsAt: "2026-10-02T18:00",
    endsAt: "2026-10-02T22:00",
    notes: "Exposure 10/02 6-10pm",
  },
  {
    placeId: "p2",
    name: "École \"Saint-Jean\"",
    address: undefined,
    latitude: -12.5,
    longitude: 179.999,
    startsAt: undefined,
    endsAt: undefined,
    notes: undefined,
  },
];

async function _readBack(rows: readonly PlaceRow[]): Promise<PlaceRow[]> {
  return await withDuckDb(async (connection) => {
    const result = await connection.runAndReadAll(
      buildPlacesReadSql(buildPlacesValuesSql(rows)),
    );
    return parsePlaceRowsFromQueryRows(result.getRowObjectsJson());
  });
}

async function _describe(rows: readonly PlaceRow[]): Promise<string[][]> {
  return await withDuckDb(async (connection) => {
    const described = await connection.runAndReadAll(
      `DESCRIBE ${buildPlacesValuesSql(rows)}`,
    );
    return described.getRowObjects().map((column) => {
      return [String(column.column_name), String(column.column_type)];
    });
  });
}

describe("places SQL round trip", () => {
  it("reads back exactly the rows it wrote", async () => {
    expect(await _readBack(ROWS)).toEqual(ROWS);
  });

  it("reads back no rows from an empty places dataset", async () => {
    expect(await _readBack([])).toEqual([]);
  });

  it.each([
    ["with places", ROWS],
    ["when empty", []],
  ])("declares the places columns and types %s", async (_label, rows) => {
    expect(await _describe(rows)).toEqual(
      PLACES_COLUMNS.map((column) => {
        return [column.name, column.duckDbType];
      }),
    );
  });
});
```

- [ ] **Step 6: Run it.**

```bash
pnpm test:executed src/clients/places/__tests__/placesSqlRoundTrip.integration.executed.test.ts
```

Expected: `4 passed`. (`getRowObjectsJson()` returns DOUBLE as a number and TIMESTAMP text as formatted by `strftime`; checked against `@duckdb/node-api` while writing this plan.)

- [ ] **Step 7: Commit.**

```bash
git add src/clients/places/buildPlacesReadSql.ts src/clients/places/parsePlaceRowsFromQueryRows src/clients/places/__tests__/placesSqlRoundTrip.integration.executed.test.ts
git commit -m "feat(places): read place rows back from their stored SQL"
```

---

## Task 9: `VirtualPlacesStore`

**Files:**
- Create: `src/clients/places/VirtualPlacesStore/VirtualPlacesStore.ts`
- Test: `src/clients/places/VirtualPlacesStore/VirtualPlacesStore.test.ts`

- [ ] **Step 1: Write the failing test.**

```ts
// src/clients/places/VirtualPlacesStore/VirtualPlacesStore.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildPlacesValuesSql } from "@/clients/places/buildPlacesValuesSql/buildPlacesValuesSql";
import { PLACES_DATASET_COLUMNS } from "@/clients/places/places.constants";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";

const mocks = vi.hoisted(() => {
  return {
    rpc: vi.fn(),
    getAll: vi.fn(),
    update: vi.fn(),
    runQuery: vi.fn(),
  };
});

vi.mock("$/ServerApiClient", () => {
  return { createServerApiClient: () => { return { rpc: mocks.rpc }; } };
});

vi.mock("$/models/datasets/Dataset/DatasetParsers", () => {
  return {
    DatasetParsers: {
      fromDBReadToModelRead: (row: unknown) => {
        return row;
      },
    },
  };
});

vi.mock("@/clients/datasets/source-datasets/VirtualDatasetClient", () => {
  return {
    VirtualDatasetClient: { getAll: mocks.getAll, update: mocks.update },
  };
});

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: mocks.runQuery } };
});

const { VirtualPlacesStore } =
  await import("@/clients/places/VirtualPlacesStore/VirtualPlacesStore");

const TARGET = {
  workspaceId: "33333333-3333-4333-8333-333333333333" as Workspace.Id,
  userId: "44444444-4444-4444-8444-444444444444" as User.Id,
  datasetId: "11111111-1111-4111-8111-111111111111" as Dataset.Id,
};

const STORED_SQL = "SELECT * FROM (VALUES ('p1')) AS places(place_id)";

describe("VirtualPlacesStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAll.mockResolvedValue([
      { id: "virtual-row", rawSql: STORED_SQL, isPlaces: true },
    ]);
  });

  it("creates a places dataset with the places columns and no places", async () => {
    mocks.rpc.mockResolvedValue({ id: TARGET.datasetId });
    await VirtualPlacesStore.createPlacesDataset({
      workspaceId: TARGET.workspaceId,
      userId: TARGET.userId,
      datasetName: "Exposure sites",
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "rpc_datasets__add_places_dataset",
      expect.objectContaining({
        p_workspace_id: TARGET.workspaceId,
        p_dataset_name: "Exposure sites",
        p_columns: PLACES_DATASET_COLUMNS,
        p_raw_sql: buildPlacesValuesSql([]),
      }),
    );
  });

  it("reads places by running the stored SQL with readable timestamps", async () => {
    mocks.runQuery.mockResolvedValue({ data: [] });
    await VirtualPlacesStore.readPlaces(TARGET);
    expect(mocks.runQuery).toHaveBeenCalledWith({
      workspaceId: TARGET.workspaceId,
      rawSql: expect.stringContaining(`FROM (${STORED_SQL}) AS stored_places`),
    });
  });

  it("rewrites the stored SQL of the dataset's virtual row", async () => {
    await VirtualPlacesStore.writePlaces({ ...TARGET, rows: [] });
    expect(mocks.update).toHaveBeenCalledWith({
      id: "virtual-row",
      data: { rawSql: buildPlacesValuesSql([]) },
    });
  });

  it("refuses to edit a virtual dataset that is not a places dataset", async () => {
    mocks.getAll.mockResolvedValue([
      { id: "virtual-row", rawSql: "SELECT 1", isPlaces: false },
    ]);
    await expect(
      VirtualPlacesStore.writePlaces({ ...TARGET, rows: [] }),
    ).rejects.toThrow("is not a places dataset");
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it.**

```bash
pnpm vitest run src/clients/places/VirtualPlacesStore
```

Expected: FAIL, cannot resolve `VirtualPlacesStore`.

- [ ] **Step 3: Implement.**

```ts
// src/clients/places/VirtualPlacesStore/VirtualPlacesStore.ts
import { prop, where } from "@avandar/utils";
import { useMemo } from "react";
import { uuid } from "$/lib/uuid";
import { DatasetParsers } from "$/models/datasets/Dataset/DatasetParsers";
import { createServerApiClient } from "$/ServerApiClient";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { buildPlacesReadSql } from "@/clients/places/buildPlacesReadSql";
import { buildPlacesValuesSql } from "@/clients/places/buildPlacesValuesSql/buildPlacesValuesSql";
import { parsePlaceRowsFromQueryRows } from "@/clients/places/parsePlaceRowsFromQueryRows/parsePlaceRowsFromQueryRows";
import { PLACES_DATASET_COLUMNS } from "@/clients/places/places.constants";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { VirtualDataset } from "$/models/datasets/VirtualDataset/VirtualDataset";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { DatasetDBRead } from "@/clients/datasets/DatasetClient/DatasetClient.types";
import type { PlacesStore } from "@/clients/places/places.types";

const serverApi = createServerApiClient();

/** The dataset's virtual row, read fresh so an edit never starts from stale SQL. */
async function _getPlacesVirtualDataset(
  datasetId: Dataset.Id,
): Promise<VirtualDataset.T> {
  const [virtualDataset] = await VirtualDatasetClient.getAll(
    where("dataset_id", "eq", datasetId),
  );
  if (!virtualDataset?.isPlaces) {
    throw new Error(`Dataset '${datasetId}' is not a places dataset.`);
  }
  return virtualDataset;
}

const _createPlacesDataset: PlacesStore["createPlacesDataset"] = async (
  options,
) => {
  const dataset = await serverApi.rpc<DatasetDBRead>(
    "rpc_datasets__add_places_dataset",
    {
      p_dataset_id: uuid<Dataset.Id>(),
      p_workspace_id: options.workspaceId,
      p_dataset_name: options.datasetName,
      p_dataset_description: "",
      p_columns: PLACES_DATASET_COLUMNS.map((column) => {
        return { ...column, description: column.description ?? null };
      }),
      p_raw_sql: buildPlacesValuesSql([]),
    },
  );
  return DatasetParsers.fromDBReadToModelRead(dataset);
};

const _readPlaces: PlacesStore["readPlaces"] = async (options) => {
  const virtualDataset = await _getPlacesVirtualDataset(options.datasetId);
  const result = await WorkspaceQuerySession.runQuery({
    workspaceId: options.workspaceId,
    rawSql: buildPlacesReadSql(virtualDataset.rawSql),
  });
  return parsePlaceRowsFromQueryRows(result.data);
};

const _writePlaces: PlacesStore["writePlaces"] = async (options) => {
  const virtualDataset = await _getPlacesVirtualDataset(options.datasetId);
  await VirtualDatasetClient.update({
    id: virtualDataset.id,
    data: { rawSql: buildPlacesValuesSql(options.rows) },
  });
};

function _usePlacesDatasetIds(workspaceId: Workspace.Id): ReadonlySet<Dataset.Id> {
  const [virtualDatasets] = VirtualDatasetClient.useGetAll({
    where: { workspace_id: { eq: workspaceId }, is_places: { eq: true } },
  });
  return useMemo(() => {
    return new Set((virtualDatasets ?? []).map(prop("datasetId")));
  }, [virtualDatasets]);
}

/**
 * A places dataset stored as a virtual dataset whose `raw_sql` is a `VALUES`
 * list. Every write replaces the whole list; callers drop cached copies of
 * the rows afterwards (see `refreshPlacesDatasetCaches`).
 */
export const VirtualPlacesStore: PlacesStore = {
  createPlacesDataset: _createPlacesDataset,
  readPlaces: _readPlaces,
  writePlaces: _writePlaces,
  usePlacesDatasetIds: _usePlacesDatasetIds,
};
```

Note: the test asserts `p_columns: PLACES_DATASET_COLUMNS`; since every constant column already has `description: ""`, the mapped array equals it.

- [ ] **Step 4: Run it and type check.**

```bash
pnpm vitest run src/clients/places/VirtualPlacesStore
pnpm tsc -b --force
```

Expected: `4 passed`; no type errors. If `serverApi.rpc` is typed against the RPC name union, `rpc_datasets__add_places_dataset` resolves because Task 2 regenerated `database.types.ts`.

- [ ] **Step 5: Commit.**

```bash
git add src/clients/places/VirtualPlacesStore
git commit -m "feat(places): store places as a rewritable VALUES virtual dataset"
```

---

## Task 10: Geocoder provider (Geoapify)

**Files:**
- Create: `supabase/functions/geocode/GeocoderProvider.types.ts`
- Create: `supabase/functions/geocode/createGeoapifyGeocoder/createGeoapifyGeocoder.ts`
- Test: `supabase/functions/geocode/createGeoapifyGeocoder/createGeoapifyGeocoder.test.ts`

Edge function tests run under Vitest (Node), like `supabase/functions/dashboards/DashboardsRoutes/DashboardsRoutes.test.ts`, so the provider takes `fetchFn` instead of touching `Deno` or the network.

The box is sent as Geoapify's `bias=rect:` (prefer results in the view) rather than `filter=rect:` (only results in the view), because the spec calls it a bias box: a user zoomed onto one block must still find an address two blocks away. Switching to a hard filter is the one-word change `bias` to `filter` in `_buildSearchUrl`.

- [ ] **Step 1: Write the provider types.**

```ts
// supabase/functions/geocode/GeocoderProvider.types.ts

/** A map view in WGS 84 degrees, used to prefer nearby results. */
export type GeocodeBiasBox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

/** One address match, as the place tool shows it. */
export type GeocodeCandidate = {
  label: string;
  latitude: number;
  longitude: number;

  /** The provider's confidence, 0 to 1. */
  confidence: number;
};

/**
 * Looks up an address. The `geocode` route depends only on this, so the
 * provider (Geoapify today) can be swapped without a client release.
 */
export type GeocoderProvider = {
  search: (
    options: Readonly<{ text: string; biasBox: GeocodeBiasBox | undefined }>,
  ) => Promise<GeocodeCandidate[]>;
};
```

- [ ] **Step 2: Write the failing test.**

```ts
// supabase/functions/geocode/createGeoapifyGeocoder/createGeoapifyGeocoder.test.ts
import { describe, expect, it, vi } from "vitest";
import { createGeoapifyGeocoder } from "@sbfn/geocode/createGeoapifyGeocoder/createGeoapifyGeocoder.ts";

const ADDRESS = "350 W 46th St, New York";

function _respondWith(body: unknown, status = 200): typeof fetch {
  return vi.fn(async () => {
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
}

function _requestedUrl(fetchFn: typeof fetch): URL {
  return new URL(String(vi.mocked(fetchFn).mock.calls[0]![0]));
}

describe("createGeoapifyGeocoder", () => {
  it("maps Geoapify results to candidates", async () => {
    const fetchFn = _respondWith({
      results: [
        { formatted: "350 West 46th Street, New York, NY 10036, United States of America", lat: 40.76, lon: -73.99, rank: { confidence: 0.95 } },
        { formatted: "West 46th Street, New York", lat: 40.75, lon: -73.98 },
      ],
    });
    const geocoder = createGeoapifyGeocoder({ apiKey: "test-key", fetchFn });
    expect(await geocoder.search({ text: ADDRESS, biasBox: undefined })).toEqual([
      { label: "350 West 46th Street, New York, NY 10036, United States of America", latitude: 40.76, longitude: -73.99, confidence: 0.95 },
      { label: "West 46th Street, New York", latitude: 40.75, longitude: -73.98, confidence: 0 },
    ]);
  });

  it("asks for at most five JSON results, biased to the map view", async () => {
    const fetchFn = _respondWith({ results: [] });
    const geocoder = createGeoapifyGeocoder({ apiKey: "test-key", fetchFn });
    await geocoder.search({
      text: ADDRESS,
      biasBox: { west: -74.1, south: 40.6, east: -73.8, north: 40.9 },
    });
    const url = _requestedUrl(fetchFn);
    expect(url.origin + url.pathname).toBe("https://api.geoapify.com/v1/geocode/search");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      text: ADDRESS,
      limit: "5",
      format: "json",
      apiKey: "test-key",
      bias: "rect:-74.1,40.6,-73.8,40.9",
    });
  });

  it("returns no candidates when Geoapify finds nothing", async () => {
    const geocoder = createGeoapifyGeocoder({ apiKey: "k", fetchFn: _respondWith({ results: [] }) });
    expect(await geocoder.search({ text: ADDRESS, biasBox: undefined })).toEqual([]);
  });

  it("fails with a message that never repeats the searched address", async () => {
    const geocoder = createGeoapifyGeocoder({
      apiKey: "k",
      fetchFn: _respondWith({ error: "Unauthorized" }, 401),
    });
    const error = await geocoder
      .search({ text: ADDRESS, biasBox: undefined })
      .catch((caught: unknown) => {
        return caught as Error;
      });
    expect(error.message).toBe("The address search provider answered 401.");
    expect(error.message).not.toContain("46th");
  });

  it("fails on a response it does not recognize", async () => {
    const geocoder = createGeoapifyGeocoder({
      apiKey: "k",
      fetchFn: _respondWith({ results: [{ formatted: 3 }] }),
    });
    await expect(
      geocoder.search({ text: ADDRESS, biasBox: undefined }),
    ).rejects.toThrow("The address search provider sent an unexpected response.");
  });
});
```

- [ ] **Step 3: Run it.**

```bash
pnpm vitest run supabase/functions/geocode/createGeoapifyGeocoder
```

Expected: FAIL, cannot resolve `createGeoapifyGeocoder.ts`.

- [ ] **Step 4: Implement.**

```ts
// supabase/functions/geocode/createGeoapifyGeocoder/createGeoapifyGeocoder.ts
import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { BAD_GATEWAY } from "@sbfn/_shared/httpCodes.ts";
import { z } from "zod";
import type {
  GeocodeBiasBox,
  GeocodeCandidate,
  GeocoderProvider,
} from "@sbfn/geocode/GeocoderProvider.types.ts";

const GEOAPIFY_SEARCH_URL = "https://api.geoapify.com/v1/geocode/search";
const MAX_CANDIDATES = 5;

const GeoapifyResponseSchema = z.object({
  results: z
    .array(
      z.object({
        formatted: z.string(),
        lat: z.number(),
        lon: z.number(),
        rank: z.object({ confidence: z.number().optional() }).optional(),
      }),
    )
    .default([]),
});

function _buildSearchUrl(
  options: Readonly<{ apiKey: string; text: string; biasBox: GeocodeBiasBox | undefined }>,
): URL {
  const url = new URL(GEOAPIFY_SEARCH_URL);
  url.searchParams.set("text", options.text);
  url.searchParams.set("limit", String(MAX_CANDIDATES));
  url.searchParams.set("format", "json");
  url.searchParams.set("apiKey", options.apiKey);
  const box = options.biasBox;
  if (box) {
    url.searchParams.set("bias", `rect:${box.west},${box.south},${box.east},${box.north}`);
  }
  return url;
}

function _toCandidate(
  result: z.infer<typeof GeoapifyResponseSchema>["results"][number],
): GeocodeCandidate {
  return {
    label: result.formatted,
    latitude: result.lat,
    longitude: result.lon,
    confidence: result.rank?.confidence ?? 0,
  };
}

/**
 * The Geoapify (OpenStreetMap-based) `GeocoderProvider`. Its results may be
 * stored with OpenStreetMap attribution, which places need. Errors never
 * carry the searched text, because it can be an address.
 */
export function createGeoapifyGeocoder(
  options: Readonly<{ apiKey: string; fetchFn: typeof fetch }>,
): GeocoderProvider {
  return {
    search: async ({ text, biasBox }) => {
      const response = await options.fetchFn(
        _buildSearchUrl({ apiKey: options.apiKey, text, biasBox }),
      );
      if (!response.ok) {
        throw new AvaHTTPError(
          `The address search provider answered ${response.status}.`,
          BAD_GATEWAY,
        );
      }
      const parsed = GeoapifyResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        throw new AvaHTTPError(
          "The address search provider sent an unexpected response.",
          BAD_GATEWAY,
        );
      }
      return parsed.data.results.slice(0, MAX_CANDIDATES).map(_toCandidate);
    },
  };
}
```

- [ ] **Step 5: Run it.**

```bash
pnpm vitest run supabase/functions/geocode/createGeoapifyGeocoder
```

Expected: `5 passed`.

- [ ] **Step 6: Commit.**

```bash
git add supabase/functions/geocode/GeocoderProvider.types.ts supabase/functions/geocode/createGeoapifyGeocoder
git commit -m "feat(geocode): look up addresses through Geoapify behind a provider interface"
```

---

## Task 11: The `geocode` edge function route

**Files:**
- Create: `supabase/functions/geocode/GeocodeRoutes/GeocodeRoutes.types.ts`
- Create: `supabase/functions/geocode/GeocodeRoutes/GeocodeRoutes.ts`
- Test: `supabase/functions/geocode/GeocodeRoutes/GeocodeRoutes.test.ts`
- Create: `supabase/functions/geocode/index.ts`, `supabase/functions/geocode/deno.json`, `supabase/functions/geocode/.npmrc`
- Modify: `supabase/config.toml` (append after the last `[functions.*]` block)
- Modify: `.env.example.edge` (append)
- Modify: `src/types/http-api.types.ts:1-35`

The route is `POST`, not `GET`: a `GET` puts the address in the URL, and request URLs land in the platform's function logs. `MiniServer` itself logs only the route pattern (`Received request for path: '/search'`), and `responseError` logs the error message, which never contains the text (Task 10). Requests need a signed-in user: the route does not call `disableJWTVerification`.

- [ ] **Step 1: Write the API contract.**

```ts
// supabase/functions/geocode/GeocodeRoutes/GeocodeRoutes.types.ts
import type { APITypeDef } from "@sbfn/_shared/MiniServer/api.types.ts";
import type {
  GeocodeBiasBox,
  GeocodeCandidate,
} from "@sbfn/geocode/GeocoderProvider.types.ts";

/** HTTP contract for the address search used by the map's place tool. */
export type GeocodeAPI = APITypeDef<
  "geocode",
  ["/search"],
  {
    /**
     * Up to five address matches for `text`, preferring ones inside
     * `biasBox`. A POST so the address never appears in a URL.
     */
    "/search": {
      POST: {
        body: { text: string; biasBox?: GeocodeBiasBox };
        returnType: { candidates: GeocodeCandidate[] };
      };
    };
  }
>;
```

- [ ] **Step 2: Write the failing route test.**

```ts
// supabase/functions/geocode/GeocodeRoutes/GeocodeRoutes.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GeocoderProvider } from "@sbfn/geocode/GeocoderProvider.types.ts";

vi.mock("@sbfn/_shared/MiniServer/MiniServer.ts", () => {
  return {
    defineRoutes: (functionName: string, routes: Record<string, unknown>) => {
      return { [functionName]: routes };
    },
    POST: () => {
      const handler = {
        action: (action: unknown) => {
          return { state: { action } };
        },
        bodySchema: () => {
          return handler;
        },
      };
      return handler;
    },
  };
});

const { createGeocodeRoutes, GeocodeSearchBodySchema } =
  await import("@sbfn/geocode/GeocodeRoutes/GeocodeRoutes.ts");

const ADDRESS = "350 W 46th St, New York";

async function _search(geocoder: GeocoderProvider): Promise<unknown> {
  const routes = createGeocodeRoutes({
    getGeocoder: () => {
      return geocoder;
    },
  });
  return await routes.geocode["/search"].POST.state.action({
    body: { text: ADDRESS, biasBox: undefined },
  } as never);
}

describe("GeocodeRoutes /search", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the provider's candidates", async () => {
    const candidate = { label: "350 W 46th St", latitude: 40.76, longitude: -73.99, confidence: 0.9 };
    const result = await _search({ search: vi.fn(async () => { return [candidate]; }) });
    expect(result).toEqual({ candidates: [candidate] });
  });

  it("never writes the searched text to the logs, even when the provider fails", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((method) => {
      return vi.spyOn(console, method).mockImplementation(() => {
        return undefined;
      });
    });
    await _search({
      search: vi.fn(async () => {
        throw new Error("The address search provider answered 500.");
      }),
    }).catch(() => {
      return undefined;
    });
    const logged = spies.flatMap((spy) => {
      return spy.mock.calls.flat().map(String);
    });
    expect(logged.some((line) => { return line.includes("46th"); })).toBe(false);
  });

  it("trims the text and refuses an empty or overlong search", () => {
    expect(GeocodeSearchBodySchema.parse({ text: "  W 46th St  " }).text).toBe("W 46th St");
    expect(GeocodeSearchBodySchema.safeParse({ text: "   " }).success).toBe(false);
    expect(GeocodeSearchBodySchema.safeParse({ text: "x".repeat(201) }).success).toBe(false);
  });

  it("refuses a bias box outside WGS 84 bounds", () => {
    expect(
      GeocodeSearchBodySchema.safeParse({
        text: "W 46th St",
        biasBox: { west: -190, south: 40, east: -73, north: 41 },
      }).success,
    ).toBe(false);
  });
});
```

- [ ] **Step 3: Run it.**

```bash
pnpm vitest run supabase/functions/geocode/GeocodeRoutes
```

Expected: FAIL, cannot resolve `GeocodeRoutes.ts`.

- [ ] **Step 4: Implement the route.**

```ts
// supabase/functions/geocode/GeocodeRoutes/GeocodeRoutes.ts
import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { SERVICE_UNAVAILABLE } from "@sbfn/_shared/httpCodes.ts";
import { defineRoutes, POST } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { createGeoapifyGeocoder } from "@sbfn/geocode/createGeoapifyGeocoder/createGeoapifyGeocoder.ts";
import { z } from "zod";
import type { GeocodeAPI } from "@sbfn/geocode/GeocodeRoutes/GeocodeRoutes.types.ts";
import type { GeocoderProvider } from "@sbfn/geocode/GeocoderProvider.types.ts";

/** The `/search` body: a trimmed address of 1 to 200 characters and a view box. */
export const GeocodeSearchBodySchema = z.object({
  text: z.string().trim().min(1).max(200),
  biasBox: z
    .object({
      west: z.number().min(-180).max(180),
      south: z.number().min(-90).max(90),
      east: z.number().min(-180).max(180),
      north: z.number().min(-90).max(90),
    })
    .optional(),
});

function _createGeocoderFromEnv(): GeocoderProvider {
  const apiKey = Deno.env.get("GEOAPIFY_API_KEY");
  if (!apiKey) {
    throw new AvaHTTPError("Address search is not configured.", SERVICE_UNAVAILABLE);
  }
  return createGeoapifyGeocoder({ apiKey, fetchFn: fetch });
}

/**
 * Builds the `geocode` routes around a geocoder. Injected so a test can run
 * the route without `Deno.env` or the network; production passes the
 * Geoapify geocoder read from the `GEOAPIFY_API_KEY` secret.
 */
export function createGeocodeRoutes(
  options: Readonly<{ getGeocoder: () => GeocoderProvider }>,
) {
  return defineRoutes<GeocodeAPI>("geocode", {
    "/search": {
      POST: POST("/search")
        .bodySchema(GeocodeSearchBodySchema)
        .action(async ({ body }) => {
          // The text can be an address. It is passed to the provider and
          // nowhere else: never log it, never put it in an error.
          const candidates = await options.getGeocoder().search({
            text: body.text,
            biasBox: body.biasBox,
          });
          return { candidates };
        }),
    },
  });
}

/** The deployed `geocode` routes, backed by Geoapify. */
export const GeocodeRoutes = createGeocodeRoutes({
  getGeocoder: _createGeocoderFromEnv,
});
```

If `defineRoutes` cannot infer the return type without an annotation and ESLint's explicit-return-type rule fires on `createGeocodeRoutes`, annotate it as `ReturnType<typeof defineRoutes<GeocodeAPI>>`.

- [ ] **Step 5: Run it.**

```bash
pnpm vitest run supabase/functions/geocode/GeocodeRoutes
```

Expected: `4 passed`.

- [ ] **Step 6: Add the entry, import map, and config.**

```ts
// supabase/functions/geocode/index.ts
import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { GeocodeRoutes } from "@sbfn/geocode/GeocodeRoutes/GeocodeRoutes.ts";

MiniServer(GeocodeRoutes).serve();
```

```bash
cp supabase/functions/support/deno.json supabase/functions/geocode/deno.json
cp supabase/functions/support/.npmrc supabase/functions/geocode/.npmrc
```

Append to `supabase/config.toml` (after `[functions.support]`; touch nothing else in the file):

```toml

[functions.geocode]
enabled = true
verify_jwt = false
import_map = "./functions/geocode/deno.json"
entrypoint = "./functions/geocode/index.ts"
```

(`verify_jwt = false` matches every other function here: `MiniServer`'s `authMiddleware` verifies the JWT itself.)

Append to `.env.example.edge`:

```bash

# ==============================================================================
# Address search (map place tool)
# ==============================================================================
# Geoapify API key for the `geocode` function. Leave empty to turn address
# search off: the route then answers 503 and the place tool still accepts map
# clicks and typed coordinates.
GEOAPIFY_API_KEY=
```

- [ ] **Step 7: Register the API with the web client.** In `src/types/http-api.types.ts`, add the import beside the others and the type to `FullAPI`:

```ts
import type { GeocodeAPI } from "@sbfn/geocode/GeocodeRoutes/GeocodeRoutes.types";
```

```ts
type FullAPI = SupportAPI &
  HealthzAPI &
  QueriesAPI &
  ChatAPI &
  DashboardsApi &
  ConnectorsApi &
  WorkspacesAPI &
  GoogleAuthAPI &
  GoogleAuthCallbackAPI &
  GoogleSheetsAPI &
  GeocodeAPI &
  OpenDataAPI &
  PolarPublicAPI &
  SubscriptionsAPI;
```

- [ ] **Step 8: Type check.**

```bash
pnpm tsc -b --force
```

Expected: no errors; `APIClient.post({ route: "geocode/search", ... })` now type checks.

- [ ] **Step 9: Commit.**

```bash
git add supabase/functions/geocode supabase/config.toml .env.example.edge src/types/http-api.types.ts
git commit -m "feat(geocode): add an address search edge function that never logs queries"
```

---

## Task 12: The `place` map tool mode and its click gesture

**Files:**
- Modify: `src/views/GisApp/tools/MapToolMode.types.ts:4-11`
- Test: `src/views/GisApp/tools/mapToolCursor/mapToolCursor.test.ts` (add one case)
- Create: `src/views/GisApp/MapCanvas/useMapToolGestures/attachPlaceGestures/attachPlaceGestures.ts`
- Test: `src/views/GisApp/MapCanvas/useMapToolGestures/attachPlaceGestures/attachPlaceGestures.test.ts`
- Modify: `src/views/GisApp/MapCanvas/useMapToolGestures/useMapToolGestures.ts:23-79,108-170,215-243`
- Modify: `src/views/GisApp/MapCanvas/useMapCanvas.ts:21-139`

`useMapInstance` already skips feature hit-testing in any non-pan mode, and `useMapPanPolicy` already disables drag-pan outside Pan, so the place mode needs neither change.

- [ ] **Step 1: Write the failing gesture test.**

```ts
// src/views/GisApp/MapCanvas/useMapToolGestures/attachPlaceGestures/attachPlaceGestures.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { attachPlaceGestures } from "@/views/GisApp/MapCanvas/useMapToolGestures/attachPlaceGestures/attachPlaceGestures";
import { createFakeMap } from "@/views/GisApp/shell/MapToolCluster/createFakeMap";

function _attach(): {
  fakeMap: ReturnType<typeof createFakeMap>;
  onPlacePicked: ReturnType<typeof vi.fn>;
  onMapToolModeChange: ReturnType<typeof vi.fn>;
  detach: () => void;
} {
  const fakeMap = createFakeMap();
  const onPlacePicked = vi.fn();
  const onMapToolModeChange = vi.fn();
  const detach = attachPlaceGestures(fakeMap.map, {
    onPlacePicked,
    onMapToolModeChange,
  });
  return { fakeMap, onPlacePicked, onMapToolModeChange, detach };
}

describe("attachPlaceGestures", () => {
  afterEach(() => {
    document.querySelectorAll("canvas").forEach((canvas) => {
      canvas.remove();
    });
  });

  it("picks the clicked point and returns to Pan", () => {
    const { fakeMap, onPlacePicked, onMapToolModeChange } = _attach();
    fakeMap.emitClick(-73.9885, 40.7603);
    expect(onPlacePicked).toHaveBeenCalledWith({ latitude: 40.7603, longitude: -73.9885 });
    expect(onMapToolModeChange).toHaveBeenCalledWith({ type: "pan" });
  });

  it("returns to Pan on Escape without picking a point", () => {
    const { onPlacePicked, onMapToolModeChange } = _attach();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onMapToolModeChange).toHaveBeenCalledWith({ type: "pan" });
    expect(onPlacePicked).not.toHaveBeenCalled();
  });

  it("stops listening for clicks once detached", () => {
    const { fakeMap, detach } = _attach();
    detach();
    expect(fakeMap.map.off).toHaveBeenCalledWith("click", expect.any(Function));
  });
});
```

Add to `src/views/GisApp/tools/mapToolCursor/mapToolCursor.test.ts`, inside its existing `describe`:

```ts
  it("shows a crosshair while the place tool waits for a click", () => {
    expect(
      mapToolCursor({
        mapToolMode: { type: "place" },
        isAltPanHeld: false,
        isPointerDown: false,
      }),
    ).toBe("crosshair");
  });
```

- [ ] **Step 2: Run them.**

```bash
pnpm vitest run src/views/GisApp/MapCanvas/useMapToolGestures/attachPlaceGestures src/views/GisApp/tools/mapToolCursor
```

Expected: FAIL: `attachPlaceGestures` cannot be resolved, and the cursor test fails type checking at `{ type: "place" }` (Vitest still runs it; it fails only if the cursor is wrong, so after Step 3 it must pass).

- [ ] **Step 3: Add the mode and the gesture.**

```ts
// src/views/GisApp/tools/MapToolMode.types.ts
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

/** Discriminated union of GIS map interaction modes. */
export type MapToolMode =
  | { type: "pan" }
  | { type: "aoi" }
  | { type: "measure" }
  | { type: "buffer" }
  | { type: "annotate"; kind: AvaMapConfig.AnnotationKind }
  | { type: "erase" }
  | { type: "goto" }
  | { type: "place" };
```

`mapToolCursor` needs no change: its `.otherwise` already answers `"crosshair"`.

```ts
// src/views/GisApp/MapCanvas/useMapToolGestures/attachPlaceGestures/attachPlaceGestures.ts
import type { PlaceCoordinate } from "@/clients/places/places.types";
import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";
import type { Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";

/** What the place tool's click gesture reports to. */
export type PlaceGestureCallbacks = {
  onPlacePicked: (coordinate: PlaceCoordinate) => void;
  onMapToolModeChange: (mode: MapToolMode) => void;
};

/**
 * Arms the "Add a place" tool: the next map click becomes the place's
 * location and the tool returns to Pan; Escape cancels. Registered by
 * `useMapToolGestures` while the mode is `{ type: "place" }`.
 */
export function attachPlaceGestures(
  map: MapLibreMap,
  callbacks: PlaceGestureCallbacks,
): () => void {
  const onClick = (event: MapMouseEvent): void => {
    callbacks.onPlacePicked({
      latitude: event.lngLat.lat,
      longitude: event.lngLat.lng,
    });
    callbacks.onMapToolModeChange({ type: "pan" });
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      callbacks.onMapToolModeChange({ type: "pan" });
    }
  };
  map.on("click", onClick);
  window.addEventListener("keydown", onKeyDown);
  return () => {
    map.off("click", onClick);
    window.removeEventListener("keydown", onKeyDown);
  };
}
```

- [ ] **Step 4: Register it in `useMapToolGestures.ts`.** Make these edits:

Imports:

```ts
import { attachPlaceGestures } from "@/views/GisApp/MapCanvas/useMapToolGestures/attachPlaceGestures/attachPlaceGestures";
import type { PlaceCoordinate } from "@/clients/places/places.types";
```

`Options` gains (after `onEditingTextFeatureIdChange`):

```ts
  /** Receives the point the place tool's click picked. */
  onPlacePicked?: (coordinate: PlaceCoordinate) => void;
```

`_attachGesturesForMode` gains a sixth parameter and a branch. Change its signature's last line from `  },\n): (() => void) | undefined {` to:

```ts
  },
  onPlacePicked: (coordinate: PlaceCoordinate) => void,
): (() => void) | undefined {
```

and add, before `.with({ type: "erase" }, ...)`:

```ts
    .with({ type: "place" }, () => {
      return attachPlaceGestures(map, {
        onPlacePicked,
        onMapToolModeChange: aoiCallbacks.onMapToolModeChange,
      });
    })
```

`RegisterToolGesturesOptions` gains `onPlacePicked: (coordinate: PlaceCoordinate) => void;`. In `useRegisterToolGestures`, destructure `onPlacePicked`, pass it as the last argument to `_attachGesturesForMode(...)`, and add `onPlacePicked` to the effect's dependency array.

`useMapToolGestures` destructures `onPlacePicked = noop` and passes `onPlacePicked` into `useRegisterToolGestures({ ... })`.

- [ ] **Step 5: Thread it through `useMapCanvas.ts`.** `MapCanvasOptions` gains:

```ts
  /** Receives the point the "Add a place" tool's click picked. */
  onPlacePicked?: (coordinate: PlaceCoordinate) => void;
```

`CanvasToolOverlayOptions` gains `onPlacePicked: (coordinate: PlaceCoordinate) => void;`. `useMapCanvasToolOverlays` passes `onPlacePicked: options.onPlacePicked` into `useMapToolGestures({ ... })`. `useMapCanvas` destructures `onPlacePicked = noop` and passes `onPlacePicked` into `useMapCanvasToolOverlays({ ... })`. Add `import type { PlaceCoordinate } from "@/clients/places/places.types";`.

- [ ] **Step 6: Run the tests and type check.**

```bash
pnpm vitest run src/views/GisApp/MapCanvas src/views/GisApp/tools src/views/GisApp/shell/MapToolCluster
pnpm tsc -b --force
```

Expected: all pass, including `3 passed` for `attachPlaceGestures` and the new cursor case; no type errors (the exhaustive `match` in `_attachGesturesForMode` now covers `place`).

- [ ] **Step 7: Commit.**

```bash
git add src/views/GisApp/tools src/views/GisApp/MapCanvas
git commit -m "feat(gis): add a place tool mode whose click picks a point"
```

---

## Task 13: Place draft state and its wiring into the GIS app state

**Files:**
- Create: `src/views/GisApp/places/PlaceTool.types.ts`
- Create: `src/views/GisApp/places/placeDraftReducer/placeDraftReducer.ts`
- Test: `src/views/GisApp/places/placeDraftReducer/placeDraftReducer.test.ts`
- Create: `src/views/GisApp/places/usePlaceToolState.ts`
- Modify: `src/views/GisApp/useGisApp/useGisAppState.ts:20-31,42-49,105-123,182-262`

The draft lives in `useGisAppState` (not in the tool) because three surfaces write it: the map click (canvas), the Go-to box, and the feature inspector's Edit and Move. Only the pure state lives there; the data-dependent controller is built in `GisAppMapShell` (Task 16), which keeps `useGisApp.test.ts`'s mocks untouched.

- [ ] **Step 1: Write the types.**

```ts
// src/views/GisApp/places/PlaceTool.types.ts
import type { PlaceCoordinate, PlaceInput, PlaceRow } from "@/clients/places/places.types";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { GeocodeBiasBox } from "@sbfn/geocode/GeocoderProvider.types";

/** The place form's text fields, as typed. */
export type PlaceDraftValues = {
  name: string;
  address: string;
  startsAt: string;
  endsAt: string;
  notes: string;
};

/** The place being added, edited, or moved, while the place tool is open. */
export type PlaceDraft = {
  /** The dataset an edit or move writes to; a new place uses the map's. */
  datasetId: Dataset.Id | undefined;

  /** The place being edited or moved; `undefined` for a new place. */
  placeId: string | undefined;
  coordinate: PlaceCoordinate | undefined;
  values: PlaceDraftValues;

  /** True when the address came from address search, which needs OSM attribution. */
  isAddressFromSearch: boolean;
};

/** The draft and the only ways to change it. `undefined` draft means closed. */
export type PlaceToolState = {
  draft: PlaceDraft | undefined;
  startNew: () => void;
  startEdit: (options: { datasetId: Dataset.Id; row: PlaceRow }) => void;
  startMove: (options: { datasetId: Dataset.Id; row: PlaceRow }) => void;
  onPlacePicked: (coordinate: PlaceCoordinate) => void;
  onSearchResultPicked: (options: {
    coordinate: PlaceCoordinate;
    address: string;
  }) => void;
  clearCoordinate: () => void;
  close: () => void;
};

/** A place shown on the map: its dataset and its row id. */
export type PlaceFeatureTarget = { datasetId: Dataset.Id; placeId: string };

/** What the feature inspector may do to a clicked place. */
export type PlaceFeatureActionHandlers = {
  placesDatasetIds: ReadonlySet<Dataset.Id>;
  onEdit: (target: PlaceFeatureTarget) => void;
  onMove: (target: PlaceFeatureTarget) => void;
  onDelete: (target: PlaceFeatureTarget) => void;
};

/**
 * Everything the "Add a place" tool and the feature inspector need, built
 * by `usePlaceTool` from the GIS app state.
 */
export type PlaceToolController = {
  state: PlaceToolState;
  isArmed: boolean;
  isSaving: boolean;

  /** The places dataset a new place is saved to: the first one on the map. */
  targetDatasetId: Dataset.Id | undefined;
  placesDatasetOptions: ReadonlyArray<{ value: Dataset.Id; label: string }>;
  getBiasBox: () => GeocodeBiasBox | undefined;
  armMapPick: () => void;
  createPlacesDataset: (datasetName: string) => void;
  addPlacesLayer: (datasetId: Dataset.Id) => void;
  savePlace: (input: PlaceInput) => void;
  featureActions: PlaceFeatureActionHandlers;
};
```

- [ ] **Step 2: Write the failing reducer test.**

```ts
// src/views/GisApp/places/placeDraftReducer/placeDraftReducer.test.ts
import { describe, expect, it } from "vitest";
import { placeDraftReducer } from "@/views/GisApp/places/placeDraftReducer/placeDraftReducer";
import type { PlaceRow } from "@/clients/places/places.types";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const DATASET_ID = "11111111-1111-4111-8111-111111111111" as Dataset.Id;
const ROW: PlaceRow = {
  placeId: "p1",
  name: "Clinic",
  address: undefined,
  latitude: 40.7,
  longitude: -73.9,
  startsAt: "2026-10-02T18:00",
  endsAt: undefined,
  notes: "Side door",
};
const NYC = { latitude: 40.7603, longitude: -73.9885 };

describe("placeDraftReducer", () => {
  it("opens an empty draft for a new place", () => {
    expect(placeDraftReducer(undefined, { type: "startNew" })).toEqual({
      datasetId: undefined,
      placeId: undefined,
      coordinate: undefined,
      values: { name: "", address: "", startsAt: "", endsAt: "", notes: "" },
      isAddressFromSearch: false,
    });
  });

  it("opens an edit with the row's values and location", () => {
    const draft = placeDraftReducer(undefined, { type: "startEdit", datasetId: DATASET_ID, row: ROW });
    expect(draft).toMatchObject({
      datasetId: DATASET_ID,
      placeId: "p1",
      coordinate: { latitude: 40.7, longitude: -73.9 },
      values: { name: "Clinic", startsAt: "2026-10-02T18:00", endsAt: "", notes: "Side door" },
    });
  });

  it("opens a move with the row's values but no location yet", () => {
    const draft = placeDraftReducer(undefined, { type: "startMove", datasetId: DATASET_ID, row: ROW });
    expect(draft?.coordinate).toBeUndefined();
    expect(draft?.values.name).toBe("Clinic");
  });

  it("starts a new place from a picked point when nothing is open", () => {
    expect(placeDraftReducer(undefined, { type: "pickCoordinate", coordinate: NYC })?.coordinate).toEqual(NYC);
  });

  it("keeps a move's values when its new point is picked", () => {
    const moving = placeDraftReducer(undefined, { type: "startMove", datasetId: DATASET_ID, row: ROW });
    const picked = placeDraftReducer(moving, { type: "pickCoordinate", coordinate: NYC });
    expect(picked).toMatchObject({ placeId: "p1", coordinate: NYC, values: { name: "Clinic" } });
  });

  it("fills the address from a search result and marks it for attribution", () => {
    const draft = placeDraftReducer(undefined, {
      type: "pickSearchResult",
      coordinate: NYC,
      address: "350 West 46th Street",
    });
    expect(draft).toMatchObject({
      coordinate: NYC,
      values: { address: "350 West 46th Street" },
      isAddressFromSearch: true,
    });
  });

  it("forgets the location when the user changes it", () => {
    const editing = placeDraftReducer(undefined, { type: "startEdit", datasetId: DATASET_ID, row: ROW });
    expect(placeDraftReducer(editing, { type: "clearCoordinate" })?.coordinate).toBeUndefined();
  });

  it("closes the draft", () => {
    const editing = placeDraftReducer(undefined, { type: "startNew" });
    expect(placeDraftReducer(editing, { type: "close" })).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run it.**

```bash
pnpm vitest run src/views/GisApp/places/placeDraftReducer
```

Expected: FAIL, cannot resolve `placeDraftReducer`.

- [ ] **Step 4: Implement the reducer and the hook.**

```ts
// src/views/GisApp/places/placeDraftReducer/placeDraftReducer.ts
import { match } from "ts-pattern";
import type { PlaceCoordinate, PlaceRow } from "@/clients/places/places.types";
import type { PlaceDraft } from "@/views/GisApp/places/PlaceTool.types";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** Every change the place tool, map, Go-to box, or inspector makes to a draft. */
export type PlaceDraftAction =
  | { type: "startNew" }
  | { type: "startEdit"; datasetId: Dataset.Id; row: PlaceRow }
  | { type: "startMove"; datasetId: Dataset.Id; row: PlaceRow }
  | { type: "pickCoordinate"; coordinate: PlaceCoordinate }
  | { type: "pickSearchResult"; coordinate: PlaceCoordinate; address: string }
  | { type: "clearCoordinate" }
  | { type: "close" };

function _createNewDraft(): PlaceDraft {
  return {
    datasetId: undefined,
    placeId: undefined,
    coordinate: undefined,
    values: { name: "", address: "", startsAt: "", endsAt: "", notes: "" },
    isAddressFromSearch: false,
  };
}

function _createDraftFromRow(
  options: Readonly<{ datasetId: Dataset.Id; row: PlaceRow; keepsCoordinate: boolean }>,
): PlaceDraft {
  const { row } = options;
  return {
    datasetId: options.datasetId,
    placeId: row.placeId,
    coordinate: options.keepsCoordinate
      ? { latitude: row.latitude, longitude: row.longitude }
      : undefined,
    values: {
      name: row.name,
      address: row.address ?? "",
      startsAt: row.startsAt ?? "",
      endsAt: row.endsAt ?? "",
      notes: row.notes ?? "",
    },
    isAddressFromSearch: false,
  };
}

/**
 * The place tool's draft state machine, used by `usePlaceToolState`. A
 * picked point with no open draft starts a new place, so a map click or a
 * Go-to result can open the tool by itself.
 */
export function placeDraftReducer(
  draft: PlaceDraft | undefined,
  action: PlaceDraftAction,
): PlaceDraft | undefined {
  return match(action)
    .with({ type: "startNew" }, () => {
      return _createNewDraft();
    })
    .with({ type: "startEdit" }, (edit) => {
      return _createDraftFromRow({ ...edit, keepsCoordinate: true });
    })
    .with({ type: "startMove" }, (move) => {
      return _createDraftFromRow({ ...move, keepsCoordinate: false });
    })
    .with({ type: "pickCoordinate" }, (pick) => {
      return { ...(draft ?? _createNewDraft()), coordinate: pick.coordinate };
    })
    .with({ type: "pickSearchResult" }, (pick) => {
      const base = draft ?? _createNewDraft();
      return {
        ...base,
        coordinate: pick.coordinate,
        values: { ...base.values, address: pick.address },
        isAddressFromSearch: true,
      };
    })
    .with({ type: "clearCoordinate" }, () => {
      return draft ? { ...draft, coordinate: undefined } : draft;
    })
    .with({ type: "close" }, () => {
      return undefined;
    })
    .exhaustive();
}
```

```ts
// src/views/GisApp/places/usePlaceToolState.ts
import { useMemo, useReducer } from "react";
import { placeDraftReducer } from "@/views/GisApp/places/placeDraftReducer/placeDraftReducer";
import type { PlaceToolState } from "@/views/GisApp/places/PlaceTool.types";

/**
 * Holds the place tool's draft. The setters never change identity, so the
 * map's click gesture is not re-registered on every keystroke. Owned by
 * `useGisAppState`.
 */
export function usePlaceToolState(): PlaceToolState {
  const [draft, dispatch] = useReducer(placeDraftReducer, undefined);
  const setters = useMemo((): Omit<PlaceToolState, "draft"> => {
    return {
      startNew: () => { dispatch({ type: "startNew" }); },
      startEdit: (options) => { dispatch({ type: "startEdit", ...options }); },
      startMove: (options) => { dispatch({ type: "startMove", ...options }); },
      onPlacePicked: (coordinate) => { dispatch({ type: "pickCoordinate", coordinate }); },
      onSearchResultPicked: (options) => { dispatch({ type: "pickSearchResult", ...options }); },
      clearCoordinate: () => { dispatch({ type: "clearCoordinate" }); },
      close: () => { dispatch({ type: "close" }); },
    };
  }, []);
  return useMemo(() => {
    return { draft, ...setters };
  }, [draft, setters]);
}
```

(oxfmt will expand the one-line arrow bodies; the code is identical.)

- [ ] **Step 5: Wire it into `useGisAppState.ts`.**
  - Import `usePlaceToolState` and `import type { PlaceToolState } from "@/views/GisApp/places/PlaceTool.types";` and `import type { PlaceCoordinate } from "@/clients/places/places.types";`.
  - `UseGisAppCanvasOptions` gains `onPlacePicked: (coordinate: PlaceCoordinate) => void;`.
  - `GisAppStateExtras` gains `placeToolState: PlaceToolState;`.
  - In `useGisAppCanvas`, add `onPlacePicked: options.onPlacePicked,` to the `useMapCanvas({ ... })` call.
  - In `useGisAppState`, after `const toolMode = useGisAppToolMode();` add `const placeToolState = usePlaceToolState();`; pass `onPlacePicked: placeToolState.onPlacePicked,` to `useGisAppCanvas({ ... })`; add `placeToolState,` to the returned object.

- [ ] **Step 6: Run the tests and type check.**

```bash
pnpm vitest run src/views/GisApp/places/placeDraftReducer src/views/GisApp/useGisApp
pnpm tsc -b --force
```

Expected: `8 passed` for the reducer; `useGisApp.test.ts` still passes (its `useMapCanvas` mock ignores the new option); no type errors.

- [ ] **Step 7: Commit.**

```bash
git add src/views/GisApp/places/PlaceTool.types.ts src/views/GisApp/places/placeDraftReducer src/views/GisApp/places/usePlaceToolState.ts src/views/GisApp/useGisApp/useGisAppState.ts
git commit -m "feat(gis): hold the place tool's draft in the GIS app state"
```

---

## Task 14: `createPlacesLayer` and `getPlacesLayerDatasetIds`

**Files:**
- Create: `src/views/GisApp/places/createPlacesLayer/createPlacesLayer.ts`
- Test: `src/views/GisApp/places/createPlacesLayer/createPlacesLayer.test.ts`
- Create: `src/views/GisApp/places/getPlacesLayerDatasetIds/getPlacesLayerDatasetIds.ts`
- Test: `src/views/GisApp/places/getPlacesLayerDatasetIds/getPlacesLayerDatasetIds.test.ts`

The layer is built from the same `MapLayerUpdates` the inspector uses (`withGeoBindingAxis`, `withPopupColumns`, `withTimeColumn`), so it is exactly the layer a user would get by binding the columns by hand: a `latLngColumns` point layer, every column in its popup, and `starts_at` as its time column for the map's time slider.

- [ ] **Step 1: Write the failing tests.**

```ts
// src/views/GisApp/places/createPlacesLayer/createPlacesLayer.test.ts
import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { PLACES_COLUMNS } from "@/clients/places/places.constants";
import { createPlacesLayer } from "@/views/GisApp/places/createPlacesLayer/createPlacesLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

const NOW = "2026-11-09T00:00:00.000Z";
const WORKSPACE_ID = uuid<Workspace.Id>();
const DATASET: Dataset.T = Model.make("Dataset", {
  id: uuid<Dataset.Id>(),
  createdAt: NOW,
  updatedAt: NOW,
  dateOfLastSync: undefined,
  description: undefined,
  isRestricted: false,
  name: "Exposure sites",
  sourceType: "virtual",
  ownerId: uuid<User.Id>(),
  ownerProfileId: uuid<UserProfile.Id>(),
  workspaceId: WORKSPACE_ID,
});

function _createColumns(names: readonly string[]): DatasetColumn.T[] {
  return PLACES_COLUMNS.filter((column) => {
    return names.includes(column.name);
  }).map((column, columnIdx) => {
    return Model.make("DatasetColumn", {
      id: uuid<DatasetColumn.Id>(),
      datasetId: DATASET.id,
      workspaceId: WORKSPACE_ID,
      createdAt: NOW,
      updatedAt: NOW,
      name: column.name,
      originalName: column.name,
      originalDataType: column.duckDbType,
      dataType: column.dataType,
      detectedDataType: column.duckDbType,
      description: undefined,
      columnIdx,
    });
  });
}

function _columnName(layer: MapLayer.T, columnId: QueryColumn.Id | undefined): string | undefined {
  const column = layer.source.queryColumns.find((candidate) => {
    return candidate.id === columnId;
  });
  return column ? QueryColumn.getDerivedColumnName(column) : undefined;
}

const ALL_COLUMNS = _createColumns(PLACES_COLUMNS.map((column) => { return column.name; }));

describe("createPlacesLayer", () => {
  it("binds latitude and longitude as a point layer named after the dataset", () => {
    const layer = createPlacesLayer({ dataset: DATASET, datasetColumns: ALL_COLUMNS });
    const binding = layer.geoBinding?.type === "latLngColumns" ? layer.geoBinding : undefined;
    expect(layer.name).toBe("Exposure sites");
    expect(_columnName(layer, binding?.latitude)).toBe("latitude");
    expect(_columnName(layer, binding?.longitude)).toBe("longitude");
  });

  it("filters by the exposure start on the map's time slider", () => {
    const layer = createPlacesLayer({ dataset: DATASET, datasetColumns: ALL_COLUMNS });
    expect(_columnName(layer, layer.timeColumn)).toBe("starts_at");
  });

  it("shows every places column, place_id included, in the popup", () => {
    const layer = createPlacesLayer({ dataset: DATASET, datasetColumns: ALL_COLUMNS });
    const popupIds = layer.popup.columnIds === "all" ? [] : layer.popup.columnIds;
    expect(popupIds.map((columnId) => { return _columnName(layer, columnId); })).toEqual(
      PLACES_COLUMNS.map((column) => { return column.name; }),
    );
  });

  it("refuses a dataset without coordinate columns", () => {
    expect(() => {
      return createPlacesLayer({ dataset: DATASET, datasetColumns: _createColumns(["name"]) });
    }).toThrow("has no latitude and longitude columns");
  });
});
```

```ts
// src/views/GisApp/places/getPlacesLayerDatasetIds/getPlacesLayerDatasetIds.test.ts
import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { getPlacesLayerDatasetIds } from "@/views/GisApp/places/getPlacesLayerDatasetIds/getPlacesLayerDatasetIds";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

function _createDataset(name: string): Dataset.T {
  return Model.make("Dataset", {
    id: uuid<Dataset.Id>(),
    createdAt: "2026-11-09T00:00:00.000Z",
    updatedAt: "2026-11-09T00:00:00.000Z",
    dateOfLastSync: undefined,
    description: undefined,
    isRestricted: false,
    name,
    sourceType: "virtual",
    ownerId: uuid<User.Id>(),
    ownerProfileId: uuid<UserProfile.Id>(),
    workspaceId: uuid<Workspace.Id>(),
  });
}

describe("getPlacesLayerDatasetIds", () => {
  it("lists each places dataset shown on the map once, in layer order", () => {
    const placesDataset = _createDataset("Exposure sites");
    const otherDataset = _createDataset("Schools");
    const layers = [
      MapLayer.fromDataSource({ dataSource: otherDataset, name: "Schools" }),
      MapLayer.fromDataSource({ dataSource: placesDataset, name: "Exposure sites" }),
      MapLayer.fromDataSource({ dataSource: placesDataset, name: "Exposure sites copy" }),
      MapLayer.makeEmpty("Empty"),
    ];
    expect(
      getPlacesLayerDatasetIds({ layers, placesDatasetIds: new Set([placesDataset.id]) }),
    ).toEqual([placesDataset.id]);
  });
});
```

- [ ] **Step 2: Run them.**

```bash
pnpm vitest run src/views/GisApp/places/createPlacesLayer src/views/GisApp/places/getPlacesLayerDatasetIds
```

Expected: FAIL, both modules unresolved.

- [ ] **Step 3: Implement.**

```ts
// src/views/GisApp/places/createPlacesLayer/createPlacesLayer.ts
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

/**
 * A point layer showing a places dataset: bound by `latitude` and
 * `longitude`, every column in its popup, and `starts_at` driving the map's
 * time slider. The place tool adds it when a places dataset is created or
 * chosen for a map.
 */
export function createPlacesLayer(
  options: Readonly<{ dataset: Dataset.T; datasetColumns: readonly DatasetColumn.T[] }>,
): MapLayer.T {
  const columns = options.datasetColumns
    .filter((column) => {
      return column.datasetId === options.dataset.id;
    })
    .sort((left, right) => {
      return left.columnIdx - right.columnIdx;
    })
    .map(QueryColumn.makeFromDatasetColumn);
  const findColumn = (name: string): QueryColumn.T | undefined => {
    return columns.find((column) => {
      return QueryColumn.getDerivedColumnName(column) === name;
    });
  };
  const latitude = findColumn("latitude");
  const longitude = findColumn("longitude");
  if (!latitude || !longitude) {
    throw new Error(`Dataset '${options.dataset.id}' has no latitude and longitude columns.`);
  }
  const empty = MapLayer.fromDataSource({ dataSource: options.dataset, name: options.dataset.name });
  const withLatitude = MapLayerUpdates.withGeoBindingAxis({ layer: empty, axis: "latitude", column: latitude });
  const withBoth = MapLayerUpdates.withGeoBindingAxis({ layer: withLatitude, axis: "longitude", column: longitude });
  const withPopup = MapLayerUpdates.withPopupColumns({ layer: withBoth, columns });
  const startsAt = findColumn("starts_at");
  return startsAt
    ? MapLayerUpdates.withTimeColumn({ layer: withPopup, column: startsAt })
    : withPopup;
}
```

`.sort` is safe here: it sorts the new array `.filter` returned, not the caller's.

```ts
// src/views/GisApp/places/getPlacesLayerDatasetIds/getPlacesLayerDatasetIds.ts
import { Model } from "@avandar/models";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/**
 * The places datasets a map already shows, each once, in layer order. The
 * first is where the place tool saves a new place; all of them get a fresh
 * read when the map opens.
 */
export function getPlacesLayerDatasetIds(
  options: Readonly<{
    layers: readonly MapLayer.T[];
    placesDatasetIds: ReadonlySet<Dataset.Id>;
  }>,
): Dataset.Id[] {
  const datasetIds = options.layers.flatMap((layer) => {
    const dataSource = layer.source.dataSource;
    return dataSource &&
      Model.isOfModelType(dataSource, "Dataset") &&
      options.placesDatasetIds.has(dataSource.id)
      ? [dataSource.id]
      : [];
  });
  return [...new Set(datasetIds)];
}
```

- [ ] **Step 4: Run them.**

```bash
pnpm vitest run src/views/GisApp/places/createPlacesLayer src/views/GisApp/places/getPlacesLayerDatasetIds
```

Expected: `4 passed` and `1 passed`.

- [ ] **Step 5: Commit.**

```bash
git add src/views/GisApp/places/createPlacesLayer src/views/GisApp/places/getPlacesLayerDatasetIds
git commit -m "feat(gis): build a bound point layer for a places dataset"
```

---

## Task 15: `refreshPlacesDatasetCaches`

**Files:**
- Create: `src/views/GisApp/places/refreshPlacesDatasetCaches/refreshPlacesDatasetCaches.ts`
- Test: `src/views/GisApp/places/refreshPlacesDatasetCaches/refreshPlacesDatasetCaches.test.ts`

A virtual dataset's materialization never goes stale on its own (`VirtualDatasetWrapper` declares `freshnessSignal: "none"`), and its `raw_sql` is read with `ensureQueryData`, which returns cached data even when invalidated. So after a write the GIS app must: evict the relation cache and DuckDB table (`clearCachedDatasetRows`), **remove** (not invalidate) the cached virtual rows, mark every row query stale (`invalidateDatasetRowQueries`), and mark every map layer query stale (keys are `[workspaceId, "mapLayerData", ...]` from `MapLayerData.getQueryKeyFromMapLayer`).

- [ ] **Step 1: Write the failing test.**

```ts
// src/views/GisApp/places/refreshPlacesDatasetCaches/refreshPlacesDatasetCaches.test.ts
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";

const mocks = vi.hoisted(() => {
  return { clearCachedDatasetRows: vi.fn(), invalidateDatasetRowQueries: vi.fn() };
});

vi.mock("@/views/DataManagerApp/DatasetMetaView/clearCachedDatasetRows", () => {
  return { clearCachedDatasetRows: mocks.clearCachedDatasetRows };
});

vi.mock(
  "@/views/DataManagerApp/DatasetMetaView/invalidateDatasetRowQueries/invalidateDatasetRowQueries",
  () => {
    return { invalidateDatasetRowQueries: mocks.invalidateDatasetRowQueries };
  },
);

vi.mock("@/clients/datasets/source-datasets/VirtualDatasetClient", () => {
  return { VirtualDatasetClient: { getClientName: () => { return "VirtualDatasetClient"; } } };
});

const { refreshPlacesDatasetCaches } =
  await import("@/views/GisApp/places/refreshPlacesDatasetCaches/refreshPlacesDatasetCaches");

const OPTIONS = {
  datasetId: "11111111-1111-4111-8111-111111111111" as Dataset.Id,
  userId: "44444444-4444-4444-8444-444444444444" as User.Id,
  workspaceId: "33333333-3333-4333-8333-333333333333" as Workspace.Id,
};

function _seedQueryClient(): QueryClient {
  const queryClient = new QueryClient();
  queryClient.setQueryData(["VirtualDatasetClient", "getAll", { where: {} }], [{ rawSql: "old" }]);
  queryClient.setQueryData([OPTIONS.workspaceId, "mapLayerData", "layer-1"], { type: "rows" });
  queryClient.setQueryData(["DashboardClient", "getAll"], []);
  return queryClient;
}

describe("refreshPlacesDatasetCaches", () => {
  it("drops this tab's cached rows for the dataset", async () => {
    await refreshPlacesDatasetCaches({ queryClient: _seedQueryClient(), ...OPTIONS });
    expect(mocks.clearCachedDatasetRows).toHaveBeenCalledWith(OPTIONS);
  });

  it("removes cached virtual rows so the next read fetches the new SQL", async () => {
    const queryClient = _seedQueryClient();
    await refreshPlacesDatasetCaches({ queryClient, ...OPTIONS });
    expect(queryClient.getQueryData(["VirtualDatasetClient", "getAll", { where: {} }])).toBeUndefined();
  });

  it("marks map layer queries stale and leaves unrelated queries alone", async () => {
    const queryClient = _seedQueryClient();
    await refreshPlacesDatasetCaches({ queryClient, ...OPTIONS });
    expect(queryClient.getQueryState([OPTIONS.workspaceId, "mapLayerData", "layer-1"])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["DashboardClient", "getAll"])?.isInvalidated).toBe(false);
  });

  it("marks every dataset row query stale", async () => {
    const queryClient = _seedQueryClient();
    await refreshPlacesDatasetCaches({ queryClient, ...OPTIONS });
    expect(mocks.invalidateDatasetRowQueries).toHaveBeenCalledWith(queryClient);
  });
});
```

- [ ] **Step 2: Run it.**

```bash
pnpm vitest run src/views/GisApp/places/refreshPlacesDatasetCaches
```

Expected: FAIL, module unresolved.

- [ ] **Step 3: Implement.**

```ts
// src/views/GisApp/places/refreshPlacesDatasetCaches/refreshPlacesDatasetCaches.ts
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { clearCachedDatasetRows } from "@/views/DataManagerApp/DatasetMetaView/clearCachedDatasetRows";
import { invalidateDatasetRowQueries } from "@/views/DataManagerApp/DatasetMetaView/invalidateDatasetRowQueries/invalidateDatasetRowQueries";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { QueryClient } from "@tanstack/react-query";

/** Second element of every map layer data query key. */
const MAP_LAYER_DATA_KEY_MARKER = "mapLayerData";

/**
 * Drops every copy of a places dataset's rows this tab holds, so the map,
 * Data Explorer, and charts re-read the places just written. Called by the
 * place tool after each save or delete, and once per places dataset when a
 * map opens.
 */
export async function refreshPlacesDatasetCaches(
  options: Readonly<{
    queryClient: QueryClient;
    datasetId: Dataset.Id;
    userId: User.Id;
    workspaceId: Workspace.Id;
  }>,
): Promise<void> {
  const { queryClient, datasetId, userId, workspaceId } = options;
  await clearCachedDatasetRows({ datasetId, userId, workspaceId });
  // Removed, not invalidated: QETL reads `raw_sql` with `ensureQueryData`,
  // which serves cached data even after an invalidation.
  queryClient.removeQueries({ queryKey: [VirtualDatasetClient.getClientName()] });
  await invalidateDatasetRowQueries(queryClient);
  await queryClient.invalidateQueries({
    predicate: (query) => {
      return query.queryKey[1] === MAP_LAYER_DATA_KEY_MARKER;
    },
  });
}
```

- [ ] **Step 4: Run it.**

```bash
pnpm vitest run src/views/GisApp/places/refreshPlacesDatasetCaches
```

Expected: `4 passed`.

- [ ] **Step 5: Commit.**

```bash
git add src/views/GisApp/places/refreshPlacesDatasetCaches
git commit -m "feat(gis): drop every cached copy of a places dataset after an edit"
```

---

## Task 16: Places actions, the controller, and the shell wiring

**Files:**
- Create: `src/views/GisApp/places/usePlacesActions.ts`
- Create: `src/views/GisApp/places/useRefreshPlacesOnMapOpen.ts`
- Create: `src/views/GisApp/places/usePlaceTool.ts`
- Modify: `src/views/GisApp/GisAppMapShell.tsx:83-178`
- Modify: `src/views/GisApp/GisAppMapToolCluster.tsx`
- Modify: `src/views/GisApp/shell/MapToolCluster/MapToolCluster.tsx:11-93`
- Modify: `src/views/GisApp/shell/MapToolCluster/MapToolClusterToolbar.tsx:20-92`

These hooks compose already-tested units (store, edits, layer builder, cache refresh, reducer) with React Query and the app state. Their behavior is proven end to end by `tests/e2e/gis-places.spec.ts` (Task 22); this task's gate is the type check plus the existing GIS suites staying green.

- [ ] **Step 1: Write `usePlacesActions.ts`.**

```ts
// src/views/GisApp/places/usePlacesActions.ts
import { useMutation } from "@avandar/query-hooks";
import { propEq, where } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { PlaceRowEdits } from "@/clients/places/PlaceRowEdits/PlaceRowEdits";
import { PLACES_MAX_ROWS } from "@/clients/places/places.constants";
import { VirtualPlacesStore as PlacesStore } from "@/clients/places/VirtualPlacesStore/VirtualPlacesStore";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { Logger } from "@/utils/Logger";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { createPlacesLayer } from "@/views/GisApp/places/createPlacesLayer/createPlacesLayer";
import { refreshPlacesDatasetCaches } from "@/views/GisApp/places/refreshPlacesDatasetCaches/refreshPlacesDatasetCaches";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { PlaceEditResult } from "@/clients/places/PlaceRowEdits/PlaceRowEdits";
import type { PlaceInput, PlaceRow } from "@/clients/places/places.types";
import type { PlaceFeatureTarget, PlaceToolController } from "@/views/GisApp/places/PlaceTool.types";
import type { GisAppState } from "@/views/GisApp/useGisApp/useGisApp";
import type { QueryClient } from "@tanstack/react-query";

type PlacesSession = {
  workspaceId: Workspace.Id;
  userId: User.Id;
  queryClient: QueryClient;
};

type SavePlaceVariables = {
  datasetId: Dataset.Id;
  placeId: string | undefined;
  input: PlaceInput;
};

function usePlacesSession(app: GisAppState): PlacesSession {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  return {
    workspaceId: app.avaMap.workspaceId,
    userId: user!.id as User.Id,
    queryClient,
  };
}

function _addLayer(app: GisAppState, layer: MapLayer.T): void {
  app.updateConfig((current) => {
    return AvaMapConfig.withLayerAdded({ config: current, layer });
  });
  app.setSelectedLayerId(layer.id);
}

/** Reads the rows, applies one edit, and writes them back when it applied. */
async function _editPlaces(
  options: Readonly<{
    session: PlacesSession;
    datasetId: Dataset.Id;
    edit: (rows: readonly PlaceRow[]) => PlaceEditResult;
  }>,
): Promise<PlaceEditResult["type"]> {
  const { session, datasetId } = options;
  const target = { workspaceId: session.workspaceId, userId: session.userId, datasetId };
  const result = options.edit(await PlacesStore.readPlaces(target));
  if (result.type !== "ok") {
    return result.type;
  }
  await PlacesStore.writePlaces({ ...target, rows: result.rows });
  await refreshPlacesDatasetCaches({ ...target, queryClient: session.queryClient });
  return "ok";
}

function _applySave(variables: SavePlaceVariables) {
  return (rows: readonly PlaceRow[]): PlaceEditResult => {
    return variables.placeId === undefined
      ? PlaceRowEdits.withPlaceAdded({ rows, placeId: uuid(), place: variables.input })
      : PlaceRowEdits.withPlaceReplaced({ rows, placeId: variables.placeId, place: variables.input });
  };
}

function useCreatePlacesDataset(app: GisAppState, session: PlacesSession) {
  const { t } = useLingui();
  return useMutation({
    mutationFn: async (datasetName: string): Promise<MapLayer.T> => {
      const dataset = await PlacesStore.createPlacesDataset({
        workspaceId: session.workspaceId,
        userId: session.userId,
        datasetName,
      });
      const datasetColumns = await DatasetColumnClient.getAll(
        where("dataset_id", "eq", dataset.id),
      );
      return createPlacesLayer({ dataset, datasetColumns });
    },
    queriesToInvalidate: [
      DatasetClient.QueryKeys.getAll(),
      DatasetColumnClient.QueryKeys.getAll(),
      [VirtualDatasetClient.getClientName()],
    ],
    onSuccess: (layer) => {
      _addLayer(app, layer);
    },
    onError: (error) => {
      Logger.error(error, { devMsg: "Places dataset creation failed" });
      notifyError(t`Could not create the places dataset.`);
    },
  });
}

function useSavePlace(app: GisAppState, session: PlacesSession) {
  const { t } = useLingui();
  const maxPlaces = PLACES_MAX_ROWS;
  return useMutation({
    mutationFn: async (variables: SavePlaceVariables) => {
      return await _editPlaces({ session, datasetId: variables.datasetId, edit: _applySave(variables) });
    },
    onSuccess: (outcome) => {
      if (outcome === "ok") {
        notifySuccess(t`Place saved.`);
        app.placeToolState.close();
        return;
      }
      notifyError(
        outcome === "limitReached"
          ? t`A places dataset holds at most ${maxPlaces} places.`
          : t`This place no longer exists. Someone may have deleted it.`,
      );
    },
    onError: (error) => {
      Logger.error(error, { devMsg: "Saving a place failed" });
      notifyError(t`Could not save the place.`);
    },
  });
}

function useDeletePlace(session: PlacesSession) {
  const { t } = useLingui();
  return useMutation({
    mutationFn: async (target: PlaceFeatureTarget) => {
      return await _editPlaces({
        session,
        datasetId: target.datasetId,
        edit: (rows) => {
          return PlaceRowEdits.withPlaceRemoved({ rows, placeId: target.placeId });
        },
      });
    },
    onSuccess: (outcome) => {
      notifySuccess(outcome === "ok" ? t`Place deleted.` : t`This place was already deleted.`);
    },
    onError: (error) => {
      Logger.error(error, { devMsg: "Deleting a place failed" });
      notifyError(t`Could not delete the place.`);
    },
  });
}

function useLoadPlace(app: GisAppState, session: PlacesSession) {
  const { t } = useLingui();
  return useMutation({
    mutationFn: async (variables: { target: PlaceFeatureTarget; mode: "edit" | "move" }) => {
      const rows = await PlacesStore.readPlaces({
        workspaceId: session.workspaceId,
        userId: session.userId,
        datasetId: variables.target.datasetId,
      });
      return rows.find(propEq("placeId", variables.target.placeId));
    },
    onSuccess: (row, { target, mode }) => {
      if (!row) {
        notifyError(t`This place no longer exists. Someone may have deleted it.`);
        return;
      }
      app.closeInspector();
      const open = mode === "edit" ? app.placeToolState.startEdit : app.placeToolState.startMove;
      open({ datasetId: target.datasetId, row });
    },
    onError: (error) => {
      Logger.error(error, { devMsg: "Loading a place failed" });
      notifyError(t`Could not open the place.`);
    },
  });
}

/**
 * The place tool's writes: create a places dataset, show one on the map,
 * save a place, and the inspector's Edit, Move, and Delete. Used only by
 * `usePlaceTool`.
 */
export function usePlacesActions(
  options: Readonly<{
    app: GisAppState;
    datasets: readonly Dataset.T[];
    datasetColumns: readonly DatasetColumn.T[];
    placesDatasetIds: ReadonlySet<Dataset.Id>;
    targetDatasetId: Dataset.Id | undefined;
  }>,
): Pick<PlaceToolController, "isSaving" | "createPlacesDataset" | "addPlacesLayer" | "savePlace" | "featureActions"> {
  const { app } = options;
  const session = usePlacesSession(app);
  const [createDataset, isCreating] = useCreatePlacesDataset(app, session);
  const [savePlace, isSavingPlace] = useSavePlace(app, session);
  const [deletePlace, isDeleting] = useDeletePlace(session);
  const [loadPlace, isLoading] = useLoadPlace(app, session);
  return {
    isSaving: isCreating || isSavingPlace || isDeleting || isLoading,
    createPlacesDataset: createDataset,
    addPlacesLayer: (datasetId) => {
      const dataset = options.datasets.find(propEq("id", datasetId));
      if (dataset) {
        _addLayer(app, createPlacesLayer({ dataset, datasetColumns: options.datasetColumns }));
      }
    },
    savePlace: (input) => {
      const draft = app.placeToolState.draft;
      const datasetId = draft?.datasetId ?? options.targetDatasetId;
      if (draft && datasetId) {
        savePlace({ datasetId, placeId: draft.placeId, input });
      }
    },
    featureActions: {
      placesDatasetIds: options.placesDatasetIds,
      onEdit: (target) => { loadPlace({ target, mode: "edit" }); },
      onMove: (target) => { loadPlace({ target, mode: "move" }); },
      onDelete: (target) => { deletePlace(target); },
    },
  };
}
```

The store is imported under the alias `PlacesStore` so the CSV fallback (C16) is a one-line import change. If ESLint's `react-hooks` or explicit-return-type rules flag the private `use*` hooks for missing return types, annotate each as `UseMutationResultTuple<TData, TVariables>` from `@avandar/query-hooks` with the `mutationFn` types shown.

- [ ] **Step 2: Write `useRefreshPlacesOnMapOpen.ts`.**

```ts
// src/views/GisApp/places/useRefreshPlacesOnMapOpen.ts
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { refreshPlacesDatasetCaches } from "@/views/GisApp/places/refreshPlacesDatasetCaches/refreshPlacesDatasetCaches";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * Re-reads each places dataset a map shows, once per map open. A teammate's
 * edit rewrites `raw_sql` but cannot clear this browser's cached copy, so
 * without this the map would keep showing the places as they were. Cheap:
 * a places dataset is at most 500 rows of SQL. Used only by `usePlaceTool`.
 */
export function useRefreshPlacesOnMapOpen(
  options: Readonly<{
    placesLayerDatasetIds: readonly Dataset.Id[];
    userId: User.Id | undefined;
    workspaceId: Workspace.Id;
  }>,
): void {
  const queryClient = useQueryClient();
  const refreshedIdsRef = useRef(new Set<Dataset.Id>());
  const { userId, workspaceId } = options;
  const datasetIdsKey = options.placesLayerDatasetIds.join(",");
  useEffect(
    function refreshEachPlacesDatasetOnce() {
      if (!userId || datasetIdsKey === "") {
        return;
      }
      const idsToRefresh = (datasetIdsKey.split(",") as Dataset.Id[]).filter((datasetId) => {
        return !refreshedIdsRef.current.has(datasetId);
      });
      idsToRefresh.forEach((datasetId) => {
        refreshedIdsRef.current.add(datasetId);
        void refreshPlacesDatasetCaches({ queryClient, datasetId, userId, workspaceId });
      });
    },
    [datasetIdsKey, queryClient, userId, workspaceId],
  );
}
```

- [ ] **Step 3: Write `usePlaceTool.ts`.**

```ts
// src/views/GisApp/places/usePlaceTool.ts
import { where } from "@avandar/utils";
import { useMemo } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { VirtualPlacesStore as PlacesStore } from "@/clients/places/VirtualPlacesStore/VirtualPlacesStore";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { getPlacesLayerDatasetIds } from "@/views/GisApp/places/getPlacesLayerDatasetIds/getPlacesLayerDatasetIds";
import { usePlacesActions } from "@/views/GisApp/places/usePlacesActions";
import { useRefreshPlacesOnMapOpen } from "@/views/GisApp/places/useRefreshPlacesOnMapOpen";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { PlaceToolController } from "@/views/GisApp/places/PlaceTool.types";
import type { GisAppState } from "@/views/GisApp/useGisApp/useGisApp";
import type { GeocodeBiasBox } from "@sbfn/geocode/GeocoderProvider.types";

function _clamp(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value));
}

/** The current map view as a geocoder bias box, clamped to WGS 84 bounds. */
function _getBiasBox(app: GisAppState): GeocodeBiasBox | undefined {
  const bounds = app.mapInstance.mapRef.current?.getBounds();
  if (!bounds) {
    return undefined;
  }
  return {
    west: _clamp(bounds.getWest(), 180),
    south: _clamp(bounds.getSouth(), 90),
    east: _clamp(bounds.getEast(), 180),
    north: _clamp(bounds.getNorth(), 90),
  };
}

function _toDatasetOptions(
  datasets: readonly Dataset.T[],
  placesDatasetIds: ReadonlySet<Dataset.Id>,
): Array<{ value: Dataset.Id; label: string }> {
  return datasets
    .filter((dataset) => {
      return placesDatasetIds.has(dataset.id);
    })
    .map((dataset) => {
      return { value: dataset.id, label: dataset.name };
    });
}

/**
 * Builds the "Add a place" tool's controller from the GIS app state: which
 * places datasets exist and which one this map saves to, plus every write.
 * Called once by `GisAppMapShell`, which hands it to the tool cluster and the
 * feature inspector.
 */
export function usePlaceTool(app: GisAppState): PlaceToolController {
  const workspaceId = app.avaMap.workspaceId;
  const user = useCurrentUser();
  const placesDatasetIds = PlacesStore.usePlacesDatasetIds(workspaceId);
  const [datasets = []] = DatasetClient.useGetAll(where("workspace_id", "eq", workspaceId));
  const [datasetColumns = []] = DatasetColumnClient.useGetAll(where("workspace_id", "eq", workspaceId));
  const placesLayerDatasetIds = useMemo(() => {
    return getPlacesLayerDatasetIds({ layers: app.mapConfig.layers, placesDatasetIds });
  }, [app.mapConfig.layers, placesDatasetIds]);
  const targetDatasetId = placesLayerDatasetIds[0];
  const actions = usePlacesActions({ app, datasets, datasetColumns, placesDatasetIds, targetDatasetId });
  useRefreshPlacesOnMapOpen({ placesLayerDatasetIds, userId: user?.id as User.Id | undefined, workspaceId });
  return {
    ...actions,
    state: app.placeToolState,
    isArmed: app.mapToolMode.type === "place",
    targetDatasetId,
    placesDatasetOptions: _toDatasetOptions(datasets, placesDatasetIds),
    getBiasBox: () => {
      return _getBiasBox(app);
    },
    armMapPick: () => {
      app.setMapToolMode({ type: "place" });
    },
  };
}
```

- [ ] **Step 4: Wire the shell and the cluster.**

`GisAppMapShell.tsx`: import `usePlaceTool`; in `GisAppMapShell`, after `const layerActions = useGisAppLayerActions(app);` add `const placeTool = usePlaceTool(app);`; change `toolCluster={<GisAppMapToolCluster app={app} />}` to `toolCluster={<GisAppMapToolCluster app={app} placeTool={placeTool} />}`. Do not touch `<FeatureInspector ... />` yet: Task 21 adds its `placeActions` prop and passes `placeTool.featureActions` there.

`GisAppMapToolCluster.tsx`:

```tsx
import { ClearAoiButton } from "@/views/GisApp/shell/ClearAoiButton/ClearAoiButton";
import { MapToolCluster } from "@/views/GisApp/shell/MapToolCluster/MapToolCluster";
import type { PlaceToolController } from "@/views/GisApp/places/PlaceTool.types";
import type { GisAppState } from "@/views/GisApp/useGisApp/useGisApp";
import type { ReactNode } from "react";

/** Map-tool cluster, AOI clear control, and invalid-ring status. */
export function GisAppMapToolCluster({
  app,
  placeTool,
}: {
  app: GisAppState;
  placeTool: PlaceToolController;
}): ReactNode {
  return (
    <>
      <ClearAoiButton aoi={app.mapConfig.aoi} updateConfig={app.updateConfig} />
      {app.invalidRingStatus ? (
        <div role="status">{app.invalidRingStatus}</div>
      ) : null}
      <MapToolCluster
        mapToolMode={app.mapToolMode}
        onMapToolModeChange={app.setMapToolMode}
        selectedLayer={app.selectedLayer}
        updateConfig={app.updateConfig}
        measureVertices={app.measureVertices}
        layers={app.mapConfig.layers}
        featureCollections={app.layerFeatureCollections}
        requestFitBounds={app.requestFitBounds}
        placeTool={placeTool}
      />
    </>
  );
}
```

`MapToolCluster.tsx`: `Props` gains `placeTool?: PlaceToolController;` (type import from `@/views/GisApp/places/PlaceTool.types`); destructure `placeTool` and pass `placeTool={placeTool}` to `<MapToolClusterToolbar ... />`.

`MapToolClusterToolbar.tsx`: `Props` gains `placeTool?: PlaceToolController;`; destructure it. The JSX changes in Task 19 (the tool) and Task 20 (Go to). For now add nothing to the JSX.

- [ ] **Step 5: Type check and run the GIS suites.**

```bash
pnpm tsc -b --force
pnpm vitest run src/views/GisApp
```

Expected: no type errors; every GIS suite passes (`MapToolCluster.test.tsx`'s spec-order test is unchanged because no `placeTool` is passed there).

- [ ] **Step 6: Commit.**

```bash
git add src/views/GisApp/places src/views/GisApp/GisAppMapShell.tsx src/views/GisApp/GisAppMapToolCluster.tsx src/views/GisApp/shell/MapToolCluster/MapToolCluster.tsx src/views/GisApp/shell/MapToolCluster/MapToolClusterToolbar.tsx
git commit -m "feat(gis): wire places writes and the place tool controller into the map shell"
```

---
## Task 17: The place form

Before any UI task (17 to 21), read `docs/design/app-view-layout.md`, the Named Rules in `DESIGN.md`, and `docs/design/gis/feature-home-inventory.md` §3.7 (the tool cluster). The place tool is a tool-cluster popover like Buffer's, not a slate view, so it reuses `BufferMapToolPopover`'s shape: `Popover` `position="top"`, `p="sm"` dropdown, `size="xs"` controls, neutral buttons with one primary action (The One Blue Rule).

**Files:**
- Create: `src/views/GisApp/shell/MapToolCluster/PlaceMapTool/OpenStreetMapAttribution.tsx`
- Create: `src/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceForm/PlaceForm.tsx`
- Create: `src/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceForm/PlaceFormFields.tsx`
- Test: `src/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceForm/PlaceForm.test.tsx`

- [ ] **Step 1: Write the failing test.**

```tsx
// src/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceForm/PlaceForm.test.tsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { PlaceForm } from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceForm/PlaceForm";
import type { PlaceDraft } from "@/views/GisApp/places/PlaceTool.types";

const NYC = { latitude: 40.7603, longitude: -73.9885 };
const NEW_DRAFT: PlaceDraft = {
  datasetId: undefined,
  placeId: undefined,
  coordinate: NYC,
  values: { name: "", address: "", startsAt: "", endsAt: "", notes: "" },
  isAddressFromSearch: false,
};

function _renderForm(draft: PlaceDraft = NEW_DRAFT): { onSubmit: ReturnType<typeof vi.fn>; onChangeLocation: ReturnType<typeof vi.fn> } {
  const onSubmit = vi.fn();
  const onChangeLocation = vi.fn();
  render(
    <PlaceForm
      draft={draft}
      coordinate={NYC}
      isSaving={false}
      onChangeLocation={onChangeLocation}
      onSubmit={onSubmit}
    />,
  );
  return { onSubmit, onChangeLocation };
}

function _type(name: RegExp, value: string): void {
  fireEvent.change(screen.getByRole("textbox", { name }), { target: { value } });
}

describe("PlaceForm", () => {
  it("asks for a name before saving", async () => {
    const { onSubmit } = _renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Save place" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Give the place a name.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("saves the typed fields with the picked location", () => {
    const { onSubmit } = _renderForm();
    _type(/Place name/, "Restaurant, W 46th St");
    _type(/Notes/, "Exposure 10/02 6-10pm");
    fireEvent.click(screen.getByRole("button", { name: "Save place" }));
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Restaurant, W 46th St",
      address: undefined,
      latitude: 40.7603,
      longitude: -73.9885,
      startsAt: undefined,
      endsAt: undefined,
      notes: "Exposure 10/02 6-10pm",
    });
  });

  it("refuses an exposure that ends before it starts", async () => {
    _renderForm({
      ...NEW_DRAFT,
      values: { ...NEW_DRAFT.values, name: "Clinic", startsAt: "2026-10-02T18:00", endsAt: "2026-10-02T17:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save place" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The exposure must end after it starts.");
  });

  it("starts an edit from the place's saved values", () => {
    _renderForm({ ...NEW_DRAFT, placeId: "p1", values: { ...NEW_DRAFT.values, name: "Clinic" } });
    expect(screen.getByRole("textbox", { name: /Place name/ })).toHaveValue("Clinic");
  });

  it("credits OpenStreetMap only for an address that came from search", () => {
    _renderForm({ ...NEW_DRAFT, isAddressFromSearch: true });
    expect(screen.getByRole("link", { name: "© OpenStreetMap contributors" })).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/copyright",
    );
  });

  it("goes back to choosing a location", () => {
    const { onChangeLocation } = _renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Change location" }));
    expect(onChangeLocation).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it.**

```bash
pnpm vitest run src/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceForm
```

Expected: FAIL, `PlaceForm` unresolved.

- [ ] **Step 3: Implement.**

```tsx
// src/views/GisApp/shell/MapToolCluster/PlaceMapTool/OpenStreetMapAttribution.tsx
import { useLingui } from "@lingui/react/macro";
import { Anchor } from "@mantine/core";
import type { ReactNode } from "react";

/**
 * The OpenStreetMap credit that geocoded addresses must carry, shown under
 * address search results and under an address filled from them.
 */
export function OpenStreetMapAttribution(): ReactNode {
  const { t } = useLingui();
  return (
    <Anchor
      href="https://www.openstreetmap.org/copyright"
      target="_blank"
      rel="noreferrer"
      size="xs"
      c="dimmed"
    >
      {t`© OpenStreetMap contributors`}
    </Anchor>
  );
}
```

```tsx
// src/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceForm/PlaceFormFields.tsx
import { useLingui } from "@lingui/react/macro";
import { Textarea, TextInput } from "@mantine/core";
import { OpenStreetMapAttribution } from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/OpenStreetMapAttribution";
import type { PlaceDraftValues } from "@/views/GisApp/places/PlaceTool.types";
import type { FormType } from "@avandar/ui/hooks";
import type { ReactNode } from "react";

type Props = {
  form: FormType<PlaceDraftValues>;
  isAddressFromSearch: boolean;
};

/** The place form's inputs: name, address, exposure window, and notes. */
export function PlaceFormFields({ form, isAddressFromSearch }: Props): ReactNode {
  const { t } = useLingui();
  return (
    <>
      <TextInput size="xs" withAsterisk label={t`Place name`} key={form.key("name")} {...form.getInputProps("name")} />
      <TextInput size="xs" label={t`Address`} key={form.key("address")} {...form.getInputProps("address")} />
      {isAddressFromSearch ? <OpenStreetMapAttribution /> : null}
      <TextInput size="xs" type="datetime-local" label={t`Exposure starts`} key={form.key("startsAt")} {...form.getInputProps("startsAt")} />
      <TextInput size="xs" type="datetime-local" label={t`Exposure ends`} key={form.key("endsAt")} {...form.getInputProps("endsAt")} />
      <Textarea size="xs" autosize minRows={2} label={t`Notes`} key={form.key("notes")} {...form.getInputProps("notes")} />
    </>
  );
}
```

```tsx
// src/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceForm/PlaceForm.tsx
import { useForm } from "@avandar/ui/hooks";
import { matchLiteral } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Button, Group, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { validatePlaceInput } from "@/clients/places/validatePlaceInput/validatePlaceInput";
import { PlaceFormFields } from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceForm/PlaceFormFields";
import type { PlaceCoordinate, PlaceInput } from "@/clients/places/places.types";
import type { PlaceInputInvalidReason } from "@/clients/places/validatePlaceInput/validatePlaceInput";
import type { PlaceDraft, PlaceDraftValues } from "@/views/GisApp/places/PlaceTool.types";
import type { I18n } from "@lingui/core";
import type { ReactNode } from "react";

type Props = {
  draft: PlaceDraft;
  coordinate: PlaceCoordinate;
  isSaving: boolean;
  onChangeLocation: () => void;
  onSubmit: (input: PlaceInput) => void;
};

function _reasonToMessage(reason: PlaceInputInvalidReason, i18n: I18n): string {
  return matchLiteral(reason, {
    nameRequired: i18n._(msg`Give the place a name.`),
    nameTooLong: i18n._(msg`Keep the name under 200 characters.`),
    addressTooLong: i18n._(msg`Keep the address under 500 characters.`),
    notesTooLong: i18n._(msg`Keep the notes under 2,000 characters.`),
    latitudeOutOfRange: i18n._(msg`The latitude must be between -90 and 90.`),
    longitudeOutOfRange: i18n._(msg`The longitude must be between -180 and 180.`),
    invalidDateTime: i18n._(msg`Enter each exposure time as a date and a time.`),
    endsBeforeStarts: i18n._(msg`The exposure must end after it starts.`),
  });
}

/**
 * Names and dates one place at a picked location, then hands a validated
 * `PlaceInput` to `onSubmit`. Shown by the place tool once a location is set.
 */
export function PlaceForm({ draft, coordinate, isSaving, onChangeLocation, onSubmit }: Props): ReactNode {
  const { t, i18n } = useLingui();
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const form = useForm<PlaceDraftValues>({ initialValues: draft.values });
  const latitude = coordinate.latitude.toFixed(5);
  const longitude = coordinate.longitude.toFixed(5);
  return (
    <form
      onSubmit={form.onSubmit((values) => {
        const result = validatePlaceInput({ ...values, ...coordinate });
        if (result.type === "invalid") {
          setErrorMessage(_reasonToMessage(result.reason, i18n));
          return;
        }
        setErrorMessage(undefined);
        onSubmit(result.input);
      })}
    >
      <Stack gap="xs">
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Text size="xs" c="dimmed">{t`Location: ${latitude}, ${longitude}`}</Text>
          <Button size="compact-xs" variant="subtle" color="neutral" onClick={onChangeLocation}>
            {t`Change location`}
          </Button>
        </Group>
        <PlaceFormFields form={form} isAddressFromSearch={draft.isAddressFromSearch} />
        {errorMessage ? (
          <Text size="xs" c="danger" role="alert">{errorMessage}</Text>
        ) : null}
        <Button type="submit" size="xs" loading={isSaving}>{t`Save place`}</Button>
      </Stack>
    </form>
  );
}
```

- [ ] **Step 4: Run it.**

```bash
pnpm vitest run src/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceForm
```

Expected: `6 passed`.

- [ ] **Step 5: Commit.**

```bash
git add src/views/GisApp/shell/MapToolCluster/PlaceMapTool/OpenStreetMapAttribution.tsx src/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceForm
git commit -m "feat(gis): add the place form with exposure window and OSM credit"
```

---

## Task 18: Address search field and its client hook

**Files:**
- Create: `src/views/GisApp/shell/MapToolCluster/PlaceMapTool/AddressSearchField/useAddressSearch.ts`
- Create: `src/views/GisApp/shell/MapToolCluster/PlaceMapTool/AddressSearchField/AddressSearchResults.tsx`
- Create: `src/views/GisApp/shell/MapToolCluster/PlaceMapTool/AddressSearchField/AddressSearchField.tsx`
- Test: `src/views/GisApp/shell/MapToolCluster/PlaceMapTool/AddressSearchField/AddressSearchField.test.tsx`

The hook is the only browser caller of the `geocode` function. Its query opts out of the persisted React Query cache (`meta: { persist: false }`, honored by `AvandarQueryClientProvider`'s `shouldDehydrateQuery`) and is forgotten after a minute, so typed addresses never reach IndexedDB.

- [ ] **Step 1: Write the failing test.**

```tsx
// src/views/GisApp/shell/MapToolCluster/PlaceMapTool/AddressSearchField/AddressSearchField.test.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return { post: vi.fn() };
});

vi.mock("@/clients/APIClient", () => {
  return { APIClient: { post: mocks.post } };
});

const { AddressSearchField } =
  await import("@/views/GisApp/shell/MapToolCluster/PlaceMapTool/AddressSearchField/AddressSearchField");

const BIAS_BOX = { west: -74.1, south: 40.6, east: -73.8, north: 40.9 };
const CANDIDATE = {
  label: "350 West 46th Street, New York, NY 10036, United States of America",
  latitude: 40.7603,
  longitude: -73.9885,
  confidence: 0.95,
};

function _renderField(): ReturnType<typeof vi.fn> {
  const onPick = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<AddressSearchField biasBox={BIAS_BOX} onPick={onPick} />, {
    wrapper: function QueryWrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    },
  });
  return onPick;
}

function _search(text: string): void {
  fireEvent.change(screen.getByRole("textbox", { name: "Search an address" }), {
    target: { value: text },
  });
}

describe("AddressSearchField", () => {
  beforeEach(() => {
    mocks.post.mockReset();
    mocks.post.mockResolvedValue({ candidates: [CANDIDATE] });
  });

  it("searches the typed address with the map view as its bias", async () => {
    _renderField();
    _search("W 46th St");
    await screen.findByRole("button", { name: CANDIDATE.label }, { timeout: 2000 });
    expect(mocks.post).toHaveBeenCalledWith({
      route: "geocode/search",
      body: { text: "W 46th St", biasBox: BIAS_BOX },
    });
  });

  it("credits OpenStreetMap under the results", async () => {
    _renderField();
    _search("W 46th St");
    await screen.findByRole("button", { name: CANDIDATE.label }, { timeout: 2000 });
    expect(screen.getByRole("link", { name: "© OpenStreetMap contributors" })).toBeVisible();
  });

  it("picks a result", async () => {
    const onPick = _renderField();
    _search("W 46th St");
    fireEvent.click(await screen.findByRole("button", { name: CANDIDATE.label }, { timeout: 2000 }));
    expect(onPick).toHaveBeenCalledWith(CANDIDATE);
  });

  it("does not search fewer than three characters", async () => {
    _renderField();
    _search("W4");
    await new Promise((resolve) => {
      setTimeout(resolve, 700);
    });
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("warns that the search is for public places, not home addresses", () => {
    _renderField();
    expect(screen.getByText(/never type a person's home address/)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run it.**

```bash
pnpm vitest run src/views/GisApp/shell/MapToolCluster/PlaceMapTool/AddressSearchField
```

Expected: FAIL, `AddressSearchField` unresolved.

- [ ] **Step 3: Implement.**

```ts
// src/views/GisApp/shell/MapToolCluster/PlaceMapTool/AddressSearchField/useAddressSearch.ts
import { useQuery } from "@avandar/query-hooks";
import { useDebouncedValue } from "@mantine/hooks";
import { APIClient } from "@/clients/APIClient";
import type { GeocodeBiasBox, GeocodeCandidate } from "@sbfn/geocode/GeocoderProvider.types";

const MIN_SEARCH_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 400;
const EMPTY_CANDIDATES: readonly GeocodeCandidate[] = [];

/**
 * Searches an address through the `geocode` edge function while the user
 * types, preferring matches inside `biasBox`. Kept out of the persisted
 * query cache because the text can be an address. Used by
 * `AddressSearchField`.
 */
export function useAddressSearch(
  options: Readonly<{ text: string; biasBox: GeocodeBiasBox | undefined }>,
): { candidates: readonly GeocodeCandidate[]; isSearching: boolean; isError: boolean } {
  const [debouncedText] = useDebouncedValue(options.text.trim(), SEARCH_DEBOUNCE_MS);
  const isEnabled = debouncedText.length >= MIN_SEARCH_LENGTH;
  const [data, isLoading, queryResult] = useQuery({
    queryKey: ["geocode", "search", debouncedText, options.biasBox],
    queryFn: async () => {
      return await APIClient.post({
        route: "geocode/search",
        body: { text: debouncedText, biasBox: options.biasBox },
      });
    },
    enabled: isEnabled,
    meta: { persist: false },
    staleTime: 60_000,
    gcTime: 60_000,
  });
  return {
    candidates: isEnabled ? (data?.candidates ?? EMPTY_CANDIDATES) : EMPTY_CANDIDATES,
    isSearching: isEnabled && isLoading,
    isError: queryResult.isError,
  };
}
```

```tsx
// src/views/GisApp/shell/MapToolCluster/PlaceMapTool/AddressSearchField/AddressSearchResults.tsx
import { Button, Stack } from "@mantine/core";
import { OpenStreetMapAttribution } from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/OpenStreetMapAttribution";
import type { GeocodeCandidate } from "@sbfn/geocode/GeocoderProvider.types";
import type { ReactNode } from "react";

type Props = {
  candidates: readonly GeocodeCandidate[];
  onPick: (candidate: GeocodeCandidate) => void;
};

/** The address matches to pick from, with the OpenStreetMap credit they need. */
export function AddressSearchResults({ candidates, onPick }: Props): ReactNode {
  return (
    <Stack gap={2}>
      {candidates.map((candidate) => {
        return (
          <Button
            key={`${candidate.label}-${candidate.latitude}-${candidate.longitude}`}
            size="compact-xs"
            variant="subtle"
            color="neutral"
            justify="flex-start"
            aria-label={candidate.label}
            onClick={() => {
              onPick(candidate);
            }}
          >
            {candidate.label}
          </Button>
        );
      })}
      <OpenStreetMapAttribution />
    </Stack>
  );
}
```

```tsx
// src/views/GisApp/shell/MapToolCluster/PlaceMapTool/AddressSearchField/AddressSearchField.tsx
import { useLingui } from "@lingui/react/macro";
import { Loader, Stack, TextInput } from "@mantine/core";
import { useState } from "react";
import { AddressSearchResults } from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/AddressSearchField/AddressSearchResults";
import { useAddressSearch } from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/AddressSearchField/useAddressSearch";
import type { GeocodeBiasBox, GeocodeCandidate } from "@sbfn/geocode/GeocoderProvider.types";
import type { ReactNode } from "react";

type Props = {
  biasBox: GeocodeBiasBox | undefined;
  onPick: (candidate: GeocodeCandidate) => void;
};

/**
 * Finds a public place by address for the place tool. Its help text says
 * the search leaves Avandar, so contact home addresses (protected health
 * information) must never be typed here.
 */
export function AddressSearchField({ biasBox, onPick }: Props): ReactNode {
  const { t } = useLingui();
  const [text, setText] = useState("");
  const { candidates, isSearching, isError } = useAddressSearch({ text, biasBox });
  return (
    <Stack gap={4}>
      <TextInput
        size="xs"
        label={t`Search an address`}
        description={t`For public places only. The search goes to an outside service, so never type a person's home address.`}
        value={text}
        onChange={(event) => {
          setText(event.currentTarget.value);
        }}
        rightSection={isSearching ? <Loader size="xs" /> : null}
        error={isError ? t`Address search is not available right now.` : undefined}
      />
      {candidates.length > 0 ? (
        <AddressSearchResults candidates={candidates} onPick={onPick} />
      ) : null}
    </Stack>
  );
}
```

- [ ] **Step 4: Run it.**

```bash
pnpm vitest run src/views/GisApp/shell/MapToolCluster/PlaceMapTool/AddressSearchField
```

Expected: `5 passed`.

- [ ] **Step 5: Commit.**

```bash
git add src/views/GisApp/shell/MapToolCluster/PlaceMapTool/AddressSearchField
git commit -m "feat(gis): search public addresses for a place, with privacy help and OSM credit"
```

---

## Task 19: The "Add a place" tool

**Files:**
- Create: `src/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceMapTool.tsx`
- Create: `src/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceMapToolTrigger.tsx`
- Create: `src/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceToolSteps.tsx`
- Create: `src/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceDatasetStep.tsx`
- Create: `src/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceLocationStep.tsx`
- Test: `src/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceMapTool.test.tsx`
- Modify: `src/views/GisApp/shell/MapToolCluster/MapToolClusterToolbar.tsx` (JSX after `<BufferMapTool ... />`)
- Test: `src/views/GisApp/shell/MapToolCluster/MapToolCluster.test.tsx` (add one case)

- [ ] **Step 1: Write the failing tests.**

```tsx
// src/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceMapTool.test.tsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PlaceDraft, PlaceToolController } from "@/views/GisApp/places/PlaceTool.types";

vi.mock(
  "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/AddressSearchField/AddressSearchField",
  () => {
    return {
      AddressSearchField: () => {
        return <div data-testid="address-search" />;
      },
    };
  },
);

const { PlaceMapTool } =
  await import("@/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceMapTool");

const DATASET_ID = "11111111-1111-4111-8111-111111111111" as Dataset.Id;
const NEW_DRAFT: PlaceDraft = {
  datasetId: undefined,
  placeId: undefined,
  coordinate: undefined,
  values: { name: "", address: "", startsAt: "", endsAt: "", notes: "" },
  isAddressFromSearch: false,
};

function _createController(overrides: Partial<PlaceToolController> = {}): PlaceToolController {
  return {
    state: {
      draft: undefined,
      startNew: vi.fn(),
      startEdit: vi.fn(),
      startMove: vi.fn(),
      onPlacePicked: vi.fn(),
      onSearchResultPicked: vi.fn(),
      clearCoordinate: vi.fn(),
      close: vi.fn(),
    },
    isArmed: false,
    isSaving: false,
    targetDatasetId: undefined,
    placesDatasetOptions: [],
    getBiasBox: () => {
      return undefined;
    },
    armMapPick: vi.fn(),
    createPlacesDataset: vi.fn(),
    addPlacesLayer: vi.fn(),
    savePlace: vi.fn(),
    featureActions: { placesDatasetIds: new Set(), onEdit: vi.fn(), onMove: vi.fn(), onDelete: vi.fn() },
    ...overrides,
  };
}

function _withDraft(draft: PlaceDraft, overrides: Partial<PlaceToolController> = {}): PlaceToolController {
  const controller = _createController(overrides);
  return { ...controller, state: { ...controller.state, draft } };
}

describe("PlaceMapTool", () => {
  it("opens a new place from the tool button", () => {
    const controller = _createController();
    render(<PlaceMapTool controller={controller} />);
    fireEvent.click(screen.getByRole("button", { name: "Add a place" }));
    expect(controller.state.startNew).toHaveBeenCalled();
  });

  it("asks for a places dataset first, suggesting Exposure sites", () => {
    const controller = _withDraft(NEW_DRAFT);
    render(<PlaceMapTool controller={controller} />);
    expect(screen.getByRole("textbox", { name: "New places dataset name" })).toHaveValue("Exposure sites");
    fireEvent.click(screen.getByRole("button", { name: "Create places dataset" }));
    expect(controller.createPlacesDataset).toHaveBeenCalledWith("Exposure sites");
  });

  it("waits for a map click when asked", () => {
    const controller = _withDraft(NEW_DRAFT, { targetDatasetId: DATASET_ID });
    render(<PlaceMapTool controller={controller} />);
    fireEvent.click(screen.getByRole("button", { name: "Click the map" }));
    expect(controller.armMapPick).toHaveBeenCalled();
  });

  it("uses typed coordinates as the place's location", () => {
    const controller = _withDraft(NEW_DRAFT, { targetDatasetId: DATASET_ID });
    render(<PlaceMapTool controller={controller} />);
    const input = screen.getByRole("textbox", { name: "Latitude and longitude" });
    fireEvent.change(input, { target: { value: "40.7603, -73.9885" } });
    fireEvent.submit(input.closest("form")!);
    expect(controller.state.onPlacePicked).toHaveBeenCalledWith({ latitude: 40.7603, longitude: -73.9885 });
  });

  it("explains a typed value that is not a coordinate", () => {
    const controller = _withDraft(NEW_DRAFT, { targetDatasetId: DATASET_ID });
    render(<PlaceMapTool controller={controller} />);
    const input = screen.getByRole("textbox", { name: "Latitude and longitude" });
    fireEvent.change(input, { target: { value: "WD-10" } });
    fireEvent.submit(input.closest("form")!);
    expect(screen.getByText("Type a latitude and longitude, like 40.7603, -73.9885.")).toBeVisible();
    expect(controller.state.onPlacePicked).not.toHaveBeenCalled();
  });

  it("shows the place form once the place has a location", () => {
    const controller = _withDraft(
      { ...NEW_DRAFT, coordinate: { latitude: 40.7603, longitude: -73.9885 } },
      { targetDatasetId: DATASET_ID },
    );
    render(<PlaceMapTool controller={controller} />);
    expect(screen.getByRole("textbox", { name: /Place name/ })).toBeVisible();
  });

  it("gets out of the way while waiting for the map click", () => {
    const controller = _withDraft(NEW_DRAFT, { targetDatasetId: DATASET_ID, isArmed: true });
    render(<PlaceMapTool controller={controller} />);
    expect(screen.queryByRole("button", { name: "Click the map" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add a place" })).toHaveAttribute("aria-pressed", "true");
  });
});
```

Add to `MapToolCluster.test.tsx`, inside `describe("MapToolCluster", ...)` (repeat the controller builder locally so the test reads on its own):

```tsx
  it("places Add a place right after Buffer when the map can hold places", () => {
    const placeTool = {
      state: {
        draft: undefined,
        startNew: vi.fn(),
        startEdit: vi.fn(),
        startMove: vi.fn(),
        onPlacePicked: vi.fn(),
        onSearchResultPicked: vi.fn(),
        clearCoordinate: vi.fn(),
        close: vi.fn(),
      },
      isArmed: false,
      isSaving: false,
      targetDatasetId: undefined,
      placesDatasetOptions: [],
      getBiasBox: () => {
        return undefined;
      },
      armMapPick: vi.fn(),
      createPlacesDataset: vi.fn(),
      addPlacesLayer: vi.fn(),
      savePlace: vi.fn(),
      featureActions: { placesDatasetIds: new Set(), onEdit: vi.fn(), onMove: vi.fn(), onDelete: vi.fn() },
    } satisfies PlaceToolController;
    render(
      <MapToolCluster
        mapToolMode={{ type: "pan" }}
        onMapToolModeChange={vi.fn()}
        placeTool={placeTool}
      />,
    );
    const labels = within(screen.getByRole("toolbar", { name: "Map tools" }))
      .getAllByRole("button")
      .map((button) => {
        return button.getAttribute("aria-label");
      });
    expect(labels.indexOf("Add a place")).toBe(
      labels.findIndex((label) => {
        return label?.startsWith("Buffer around a layer") ?? false;
      }) + 1,
    );
  });
```

and the type import at the top of that file: `import type { PlaceToolController } from "@/views/GisApp/places/PlaceTool.types";`.

- [ ] **Step 2: Run them.**

```bash
pnpm vitest run src/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceMapTool.test.tsx src/views/GisApp/shell/MapToolCluster/MapToolCluster.test.tsx
```

Expected: FAIL: `PlaceMapTool` unresolved; the cluster case fails with `-1` not equal to the Buffer index plus one.

- [ ] **Step 3: Implement the tool.**

```tsx
// src/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceMapToolTrigger.tsx
import { Tooltip } from "@avandar/ui";
import { IconMapPinPlus } from "@tabler/icons-react";
import css from "@/views/GisApp/shell/MapToolCluster/MapToolCluster.module.css";
import type { ReactNode } from "react";

type Props = {
  label: string;
  isOpen: boolean;
  isArmed: boolean;
  onClick: () => void;
};

/** Cluster button for "Add a place": opens the place popover, pressed while a map click is awaited. */
export function PlaceMapToolTrigger({ label, isOpen, isArmed, onClick }: Props): ReactNode {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        className={css.mapToolClusterTool}
        aria-label={label}
        aria-expanded={isOpen}
        aria-pressed={isArmed}
        onClick={onClick}
      >
        <IconMapPinPlus size={17} stroke={1.6} />
      </button>
    </Tooltip>
  );
}
```

```tsx
// src/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceDatasetStep.tsx
import { useLingui } from "@lingui/react/macro";
import { Button, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import { useState } from "react";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PlaceToolController } from "@/views/GisApp/places/PlaceTool.types";
import type { ReactNode } from "react";

type Props = { controller: PlaceToolController };

/** Chooses the places dataset this map saves to, or creates one. */
export function PlaceDatasetStep({ controller }: Props): ReactNode {
  const { t } = useLingui();
  const [datasetName, setDatasetName] = useState(() => {
    return t`Exposure sites`;
  });
  const [existingDatasetId, setExistingDatasetId] = useState<string | null>(null);
  return (
    <Stack gap="sm">
      <Text size="xs">{t`Places are saved in a dataset, so any map, chart, or query can use them.`}</Text>
      {controller.placesDatasetOptions.length > 0 ? (
        <Group align="flex-end" gap="xs" wrap="nowrap">
          <Select size="xs" label={t`Places dataset`} data={[...controller.placesDatasetOptions]} value={existingDatasetId} onChange={setExistingDatasetId} />
          <Button
            size="xs"
            variant="default"
            disabled={existingDatasetId === null}
            onClick={() => {
              if (existingDatasetId) {
                controller.addPlacesLayer(existingDatasetId as Dataset.Id);
              }
            }}
          >
            {t`Add to map`}
          </Button>
        </Group>
      ) : null}
      <Group align="flex-end" gap="xs" wrap="nowrap">
        <TextInput size="xs" label={t`New places dataset name`} value={datasetName} onChange={(event) => { setDatasetName(event.currentTarget.value); }} />
        <Button
          size="xs"
          loading={controller.isSaving}
          disabled={datasetName.trim() === ""}
          onClick={() => {
            controller.createPlacesDataset(datasetName.trim());
          }}
        >
          {t`Create places dataset`}
        </Button>
      </Group>
    </Stack>
  );
}
```

```tsx
// src/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceLocationStep.tsx
import { useLingui } from "@lingui/react/macro";
import { Button, Stack, TextInput } from "@mantine/core";
import { IconPointer } from "@tabler/icons-react";
import { useState } from "react";
import { AddressSearchField } from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/AddressSearchField/AddressSearchField";
import { parseMapGoToQuery } from "@/views/GisApp/tools/parseMapGoToQuery/parseMapGoToQuery";
import type { PlaceToolController } from "@/views/GisApp/places/PlaceTool.types";
import type { ReactNode } from "react";

type Props = { controller: PlaceToolController };

/** Sets a place's location three ways: a map click, typed coordinates, or an address. */
export function PlaceLocationStep({ controller }: Props): ReactNode {
  const { t } = useLingui();
  const [coordinateText, setCoordinateText] = useState("");
  const [coordinateError, setCoordinateError] = useState<string | undefined>(undefined);
  const [biasBox] = useState(controller.getBiasBox);
  return (
    <Stack gap="sm">
      <Button size="xs" variant="default" leftSection={<IconPointer size={14} />} onClick={controller.armMapPick}>
        {t`Click the map`}
      </Button>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const parsed = parseMapGoToQuery(coordinateText);
          if (parsed.type === "coordinate") {
            controller.state.onPlacePicked({ latitude: parsed.latitude, longitude: parsed.longitude });
            return;
          }
          setCoordinateError(
            parsed.type === "invalid" && parsed.reason === "outOfRange"
              ? t`That coordinate is out of range.`
              : t`Type a latitude and longitude, like 40.7603, -73.9885.`,
          );
        }}
      >
        <TextInput
          size="xs"
          label={t`Latitude and longitude`}
          description={t`Press Enter to use it.`}
          value={coordinateText}
          error={coordinateError}
          onChange={(event) => {
            setCoordinateText(event.currentTarget.value);
            setCoordinateError(undefined);
          }}
        />
      </form>
      <AddressSearchField
        biasBox={biasBox}
        onPick={(candidate) => {
          controller.state.onSearchResultPicked({
            coordinate: { latitude: candidate.latitude, longitude: candidate.longitude },
            address: candidate.label,
          });
        }}
      />
    </Stack>
  );
}
```

```tsx
// src/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceToolSteps.tsx
import { PlaceDatasetStep } from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceDatasetStep";
import { PlaceForm } from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceForm/PlaceForm";
import { PlaceLocationStep } from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceLocationStep";
import type { PlaceToolController } from "@/views/GisApp/places/PlaceTool.types";
import type { ReactNode } from "react";

type Props = { controller: PlaceToolController };

/**
 * The place popover's current step: a places dataset first (unless the draft
 * edits one already), then a location, then the form.
 */
export function PlaceToolSteps({ controller }: Props): ReactNode {
  const draft = controller.state.draft;
  if (!draft) {
    return null;
  }
  if (!draft.datasetId && !controller.targetDatasetId) {
    return <PlaceDatasetStep controller={controller} />;
  }
  if (!draft.coordinate) {
    return <PlaceLocationStep controller={controller} />;
  }
  return (
    <PlaceForm
      key={draft.placeId ?? "new"}
      draft={draft}
      coordinate={draft.coordinate}
      isSaving={controller.isSaving}
      onChangeLocation={controller.state.clearCoordinate}
      onSubmit={controller.savePlace}
    />
  );
}
```

```tsx
// src/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceMapTool.tsx
import { useLingui } from "@lingui/react/macro";
import { Popover } from "@mantine/core";
import { PlaceMapToolTrigger } from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceMapToolTrigger";
import { PlaceToolSteps } from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceToolSteps";
import type { PlaceToolController } from "@/views/GisApp/places/PlaceTool.types";
import type { ReactNode } from "react";

type Props = { controller: PlaceToolController };

/**
 * "Add a place": writes a point into a places dataset by map click, typed
 * coordinates, or address search. The popover hides while a map click is
 * awaited and reopens on the clicked point.
 */
export function PlaceMapTool({ controller }: Props): ReactNode {
  const { t } = useLingui();
  const label = t`Add a place`;
  const isOpen = controller.state.draft !== undefined && !controller.isArmed;
  return (
    <Popover
      opened={isOpen}
      onDismiss={controller.state.close}
      position="top"
      width={320}
      withArrow
      shadow="md"
      withinPortal
      transitionProps={{ duration: 0 }}
    >
      <Popover.Target>
        <PlaceMapToolTrigger
          label={label}
          isOpen={isOpen}
          isArmed={controller.isArmed}
          onClick={isOpen ? controller.state.close : controller.state.startNew}
        />
      </Popover.Target>
      <Popover.Dropdown p="sm">
        <PlaceToolSteps controller={controller} />
      </Popover.Dropdown>
    </Popover>
  );
}
```

- [ ] **Step 4: Put it in the toolbar.** In `MapToolClusterToolbar.tsx`, import `PlaceMapTool` and render it directly after `<BufferMapTool ... />`:

```tsx
      <BufferMapTool
        selectedLayer={selectedLayer}
        onBufferConfirm={onBufferConfirm}
      />
      {placeTool ? <PlaceMapTool controller={placeTool} /> : null}
```

- [ ] **Step 5: Run the tests.**

```bash
pnpm vitest run src/views/GisApp/shell/MapToolCluster
```

Expected: `7 passed` in `PlaceMapTool.test.tsx`; every `MapToolCluster.test.tsx` case passes, the original spec-order case unchanged.

- [ ] **Step 6: Commit.**

```bash
git add src/views/GisApp/shell/MapToolCluster/PlaceMapTool src/views/GisApp/shell/MapToolCluster/MapToolClusterToolbar.tsx src/views/GisApp/shell/MapToolCluster/MapToolCluster.test.tsx
git commit -m "feat(gis): add the Add a place tool to the map tool cluster"
```

---

## Task 20: "Add a place here" on a Go-to coordinate

**Files:**
- Create: `src/views/GisApp/shell/MapToolCluster/GoToMapTool/GoToAddPlaceButton.tsx`
- Modify: `src/views/GisApp/shell/MapToolCluster/GoToMapTool/GoToMapTool.tsx:16-184`
- Test: `src/views/GisApp/shell/MapToolCluster/GoToMapTool/GoToMapTool.test.tsx` (add cases)
- Modify: `src/views/GisApp/shell/MapToolCluster/MapToolClusterToolbar.tsx` (`<GoToMapTool ... />`)

- [ ] **Step 1: Add the failing cases** inside `GoToMapTool.test.tsx`'s top-level `describe`:

```tsx
  it("offers to add a place at a coordinate it flew to", () => {
    const onAddPlaceAt = vi.fn();
    render(<GoToMapTool requestFitBounds={vi.fn()} onAddPlaceAt={onAddPlaceAt} />);
    _submitGoTo("40.7603, -73.9885");
    fireEvent.click(screen.getByRole("button", { name: "Add a place here" }));
    expect(onAddPlaceAt).toHaveBeenCalledWith({ latitude: 40.7603, longitude: -73.9885 });
  });

  it("offers no place before a coordinate is found", () => {
    render(<GoToMapTool requestFitBounds={vi.fn()} onAddPlaceAt={vi.fn()} />);
    _submitGoTo("200, 200");
    expect(screen.queryByRole("button", { name: "Add a place here" })).not.toBeInTheDocument();
  });

  it("offers no place where places cannot be added", () => {
    render(<GoToMapTool requestFitBounds={vi.fn()} />);
    _submitGoTo("40.7603, -73.9885");
    expect(screen.queryByRole("button", { name: "Add a place here" })).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run them.**

```bash
pnpm vitest run src/views/GisApp/shell/MapToolCluster/GoToMapTool
```

Expected: FAIL in the first new case: no button named "Add a place here".

- [ ] **Step 3: Implement.**

```tsx
// src/views/GisApp/shell/MapToolCluster/GoToMapTool/GoToAddPlaceButton.tsx
import { Tooltip } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { ActionIcon } from "@mantine/core";
import { IconMapPinPlus } from "@tabler/icons-react";
import type { ReactNode } from "react";

/** Turns the coordinate Go-to just flew to into a new place, in one click. */
export function GoToAddPlaceButton({ onClick }: { onClick: () => void }): ReactNode {
  const { t } = useLingui();
  const label = t`Add a place here`;
  return (
    <Tooltip label={label}>
      <ActionIcon size="sm" variant="subtle" color="neutral" aria-label={label} onClick={onClick}>
        <IconMapPinPlus size={14} stroke={1.6} />
      </ActionIcon>
    </Tooltip>
  );
}
```

In `GoToMapTool.tsx`:
1. Add imports: `import { GoToAddPlaceButton } from "@/views/GisApp/shell/MapToolCluster/GoToMapTool/GoToAddPlaceButton";` and `import type { PlaceCoordinate } from "@/clients/places/places.types";`.
2. `Props` gains:

```ts
  /** Starts a new place at a coordinate result. Omitted where places cannot be added. */
  onAddPlaceAt?: (coordinate: PlaceCoordinate) => void;
```

3. Replace `GoToSubmitResult` and `GoToSubmitOptions`:

```ts
type GoToSubmitResult =
  | { type: "bounds"; bounds: MapBounds; coordinate: PlaceCoordinate | undefined }
  | { type: "error"; reason: GoToErrorReason };

type GoToSubmitOptions = {
  query: string;
  layers: readonly MapLayer.T[];
  featureCollections: ReadonlyMap<MapLayer.Id, GeoJSON.FeatureCollection>;
  i18n: I18n;
  requestFitBounds: (bounds: MapBounds) => void;
  setError: (error: string | undefined) => void;
  setLastCoordinate: (coordinate: PlaceCoordinate | undefined) => void;
};
```

4. In `_getPcodeSubmitResult`, change the last line to `return { type: "bounds", bounds, coordinate: undefined };`.
5. In `_getGoToSubmitResult`, the `coordinate` branch returns:

```ts
    .with({ type: "coordinate" }, (coordinate) => {
      return {
        type: "bounds" as const,
        bounds: _makePaddedCoordinateBounds(coordinate.longitude, coordinate.latitude),
        coordinate: { latitude: coordinate.latitude, longitude: coordinate.longitude },
      };
    })
```

6. Replace `_onGoToSubmit`:

```ts
function _onGoToSubmit(options: GoToSubmitOptions): void {
  const result = _getGoToSubmitResult(options);
  if (!result || result.type === "error") {
    options.setError(result ? _errorMessageFromReason(result.reason, options.i18n) : undefined);
    options.setLastCoordinate(undefined);
    return;
  }
  options.setError(undefined);
  options.setLastCoordinate(result.coordinate);
  options.requestFitBounds(result.bounds);
}
```

7. Replace the component:

```tsx
/** Search field that flies the camera to a coordinate or P-code. */
export function GoToMapTool({
  layers = EMPTY_LAYERS,
  featureCollections = EMPTY_FEATURE_COLLECTIONS,
  requestFitBounds,
  onAddPlaceAt,
}: Readonly<Props>): ReactNode {
  const { i18n } = useLingui();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [lastCoordinate, setLastCoordinate] = useState<PlaceCoordinate | undefined>(undefined);
  const label = i18n._(msg`Go to a coordinate or P-code`);
  return (
    <form
      className={css.goToMapTool}
      onSubmit={(event) => {
        event.preventDefault();
        _onGoToSubmit({ query, layers, featureCollections, i18n, requestFitBounds, setError, setLastCoordinate });
      }}
    >
      <TextInput
        aria-label={label}
        placeholder={label}
        size="xs"
        value={query}
        error={error}
        rightSection={
          lastCoordinate && onAddPlaceAt ? (
            <GoToAddPlaceButton
              onClick={() => {
                onAddPlaceAt(lastCoordinate);
                setLastCoordinate(undefined);
              }}
            />
          ) : undefined
        }
        onChange={(event) => {
          setQuery(event.currentTarget.value);
          setError(undefined);
          setLastCoordinate(undefined);
        }}
      />
    </form>
  );
}
```

8. In `MapToolClusterToolbar.tsx`, pass the handler:

```tsx
      <GoToMapTool
        layers={layers}
        featureCollections={featureCollections}
        requestFitBounds={requestFitBounds}
        onAddPlaceAt={placeTool?.state.onPlacePicked}
      />
```

`onPlacePicked` with no open draft starts a new place at that point (Task 13 reducer), so the place popover opens on the dataset step or straight on the form.

- [ ] **Step 4: Run them.**

```bash
pnpm vitest run src/views/GisApp/shell/MapToolCluster/GoToMapTool src/views/GisApp/shell/MapToolCluster/MapToolCluster.test.tsx
```

Expected: all pass, including the three new cases.

- [ ] **Step 5: Commit.**

```bash
git add src/views/GisApp/shell/MapToolCluster/GoToMapTool src/views/GisApp/shell/MapToolCluster/MapToolClusterToolbar.tsx
git commit -m "feat(gis): turn a Go-to coordinate into a place in one click"
```

---

## Task 21: Edit, Move, and Delete in the feature inspector

**Files:**
- Create: `src/views/GisApp/panels/FeatureInspector/PlaceFeatureActions/PlaceFeatureActions.tsx`
- Test: `src/views/GisApp/panels/FeatureInspector/PlaceFeatureActions/PlaceFeatureActions.test.tsx`
- Modify: `src/views/GisApp/panels/FeatureInspector/FeatureInspector.tsx:1-98`
- Test: `src/views/GisApp/panels/FeatureInspector/FeatureInspector.test.tsx` (add cases)
- Modify: `src/views/GisApp/GisAppMapShell.tsx` (`<FeatureInspector ... />`)

- [ ] **Step 1: Write the failing tests.**

```tsx
// src/views/GisApp/panels/FeatureInspector/PlaceFeatureActions/PlaceFeatureActions.test.tsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@/test-utils";
import { PlaceFeatureActions } from "@/views/GisApp/panels/FeatureInspector/PlaceFeatureActions/PlaceFeatureActions";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PlaceFeatureActionHandlers } from "@/views/GisApp/places/PlaceTool.types";

const TARGET = {
  datasetId: "11111111-1111-4111-8111-111111111111" as Dataset.Id,
  placeId: "p1",
};

function _renderActions(): PlaceFeatureActionHandlers {
  const handlers: PlaceFeatureActionHandlers = {
    placesDatasetIds: new Set([TARGET.datasetId]),
    onEdit: vi.fn(),
    onMove: vi.fn(),
    onDelete: vi.fn(),
  };
  render(<PlaceFeatureActions target={TARGET} handlers={handlers} />);
  return handlers;
}

describe("PlaceFeatureActions", () => {
  it("edits the clicked place", () => {
    const handlers = _renderActions();
    fireEvent.click(screen.getByRole("button", { name: "Edit place" }));
    expect(handlers.onEdit).toHaveBeenCalledWith(TARGET);
  });

  it("moves the clicked place", () => {
    const handlers = _renderActions();
    fireEvent.click(screen.getByRole("button", { name: "Move place" }));
    expect(handlers.onMove).toHaveBeenCalledWith(TARGET);
  });

  it("deletes the clicked place only after confirming", async () => {
    const handlers = _renderActions();
    fireEvent.click(screen.getByRole("button", { name: "Delete place" }));
    expect(handlers.onDelete).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(handlers.onDelete).toHaveBeenCalledWith(TARGET);
  });
});
```

Add to `FeatureInspector.test.tsx` (new imports: `import { Model } from "@avandar/models";`, `import { uuid } from "$/lib/uuid";`, and types `Dataset`, `User`, `UserProfile`, `Workspace`):

```tsx
function _makePlacesLayer(datasetId: Dataset.Id): MapLayer.T {
  const layer = MapLayer.makeEmpty("Exposure sites");
  const dataset = Model.make("Dataset", {
    id: datasetId,
    createdAt: "2026-11-09T00:00:00.000Z",
    updatedAt: "2026-11-09T00:00:00.000Z",
    dateOfLastSync: undefined,
    description: undefined,
    isRestricted: false,
    name: "Exposure sites",
    sourceType: "virtual",
    ownerId: uuid<User.Id>(),
    ownerProfileId: uuid<UserProfile.Id>(),
    workspaceId: uuid<Workspace.Id>(),
  });
  return { ...layer, source: { ...layer.source, dataSource: dataset } };
}

describe("FeatureInspector place actions", () => {
  const placesDatasetId = uuid<Dataset.Id>();
  const placeActions = {
    placesDatasetIds: new Set([placesDatasetId]),
    onEdit: vi.fn(),
    onMove: vi.fn(),
    onDelete: vi.fn(),
  };
  const placeFeature: GeoJSON.Feature = {
    type: "Feature",
    properties: { place_id: "p1", name: "Clinic" },
    geometry: { type: "Point", coordinates: [-73.9885, 40.7603] },
  };

  it("offers Edit, Move, and Delete for a place from a places dataset", () => {
    _renderInspector({ feature: placeFeature, layer: _makePlacesLayer(placesDatasetId), placeActions });
    expect(screen.getByRole("button", { name: "Edit place" })).toBeVisible();
  });

  it("offers no place actions for a dataset that is not a places dataset", () => {
    _renderInspector({ feature: placeFeature, layer: _makePlacesLayer(uuid<Dataset.Id>()), placeActions });
    expect(screen.queryByRole("button", { name: "Edit place" })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them.**

```bash
pnpm vitest run src/views/GisApp/panels/FeatureInspector
```

Expected: FAIL: `PlaceFeatureActions` unresolved; `FeatureInspector` has no `placeActions` prop.

- [ ] **Step 3: Implement.**

```tsx
// src/views/GisApp/panels/FeatureInspector/PlaceFeatureActions/PlaceFeatureActions.tsx
import { useLingui } from "@lingui/react/macro";
import { Button, Group, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import type { PlaceFeatureActionHandlers, PlaceFeatureTarget } from "@/views/GisApp/places/PlaceTool.types";
import type { ReactNode } from "react";

type Props = {
  target: PlaceFeatureTarget;
  handlers: PlaceFeatureActionHandlers;
};

/**
 * Edit, Move, and Delete for a place clicked on the map. Every action
 * rewrites the place's dataset, so it changes every map and chart using it.
 */
export function PlaceFeatureActions({ target, handlers }: Props): ReactNode {
  const { t } = useLingui();
  const onDeleteClick = (): void => {
    modals.openConfirmModal({
      title: t`Delete this place?`,
      children: (
        <Text size="sm">
          {t`The place is removed from its dataset, so it disappears from every map and chart that uses it.`}
        </Text>
      ),
      labels: { confirm: t`Delete`, cancel: t`Cancel` },
      confirmProps: { color: "danger" },
      onConfirm: () => {
        handlers.onDelete(target);
      },
    });
  };
  return (
    <Group gap="xs">
      <Button size="xs" variant="default" onClick={() => { handlers.onEdit(target); }}>{t`Edit place`}</Button>
      <Button size="xs" variant="default" onClick={() => { handlers.onMove(target); }}>{t`Move place`}</Button>
      <Button size="xs" variant="subtle" color="danger" onClick={onDeleteClick}>{t`Delete place`}</Button>
    </Group>
  );
}
```

In `FeatureInspector.tsx`:
- Imports: `import { Model } from "@avandar/models";`, `import { PlaceFeatureActions } from "@/views/GisApp/panels/FeatureInspector/PlaceFeatureActions/PlaceFeatureActions";`, `import type { PlaceFeatureActionHandlers, PlaceFeatureTarget } from "@/views/GisApp/places/PlaceTool.types";`.
- `Props` gains:

```ts
  /** Edit, Move, and Delete for places; omitted where places cannot be edited. */
  placeActions?: PlaceFeatureActionHandlers;
```

- Above `FeatureInspector`, add:

```ts
/** The clicked place, when the feature is a row of a places dataset. */
function _getPlaceTarget(
  options: Readonly<{
    layer: MapLayer.T | undefined;
    properties: Record<string, unknown>;
    placeActions: PlaceFeatureActionHandlers | undefined;
  }>,
): PlaceFeatureTarget | undefined {
  const dataSource = options.layer?.source.dataSource;
  const placeId = options.properties.place_id;
  if (!options.placeActions || !dataSource || typeof placeId !== "string") {
    return undefined;
  }
  return Model.isOfModelType(dataSource, "Dataset") &&
    options.placeActions.placesDatasetIds.has(dataSource.id)
    ? { datasetId: dataSource.id, placeId }
    : undefined;
}
```

- Destructure `placeActions` in the component, compute `const placeTarget = _getPlaceTarget({ layer, properties, placeActions });`, and render after `<FeatureAction ... />`:

```tsx
              {placeTarget && placeActions ? (
                <PlaceFeatureActions target={placeTarget} handlers={placeActions} />
              ) : null}
```

In `GisAppMapShell.tsx`, add `placeActions={placeTool.featureActions}` to `<FeatureInspector ... />`.

- [ ] **Step 4: Run them and type check.**

```bash
pnpm vitest run src/views/GisApp/panels/FeatureInspector
pnpm tsc -b --force
```

Expected: `3 passed` for `PlaceFeatureActions`; `FeatureInspector.test.tsx` passes with the two new cases; no type errors.

- [ ] **Step 5: Commit.**

```bash
git add src/views/GisApp/panels/FeatureInspector src/views/GisApp/GisAppMapShell.tsx
git commit -m "feat(gis): edit, move, and delete a place from the feature inspector"
```

---

## Task 22: End-to-end places flows

**Files:**
- Create: `tests/e2e/gis-places.spec.ts`

Drives the whole feature through the UI. Only setup (seeding the empty map) and teardown (deleting the map and the places dataset the UI created) touch the database directly; `raw_sql` is read as an oracle. Address search is stubbed at the browser boundary with `page.route` (CI holds no `GEOAPIFY_API_KEY`; the provider mapping is unit-tested in Task 10).

- [ ] **Step 1: Write the spec.**

```ts
// tests/e2e/gis-places.spec.ts
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { deleteDatasetAndShares } from "./helpers/datasetSharingCleanup";
import { deleteMapsByIds } from "./helpers/deleteMapsByIds";
import { seedAvaMap } from "./helpers/seedAvaMap";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import { E2E_ONLINE_TAG } from "./setup/ensureE2EViteFeatureFlags/ensureE2EViteFeatureFlags";
import type { E2EWorkerDb } from "./fixtures/e2e.fixture";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { Locator, Page } from "@playwright/test";

const MAP_NAME = "E2E GIS places";
const GEOCODE_CANDIDATE = {
  label: "350 West 46th Street, New York, NY 10036, United States of America",
  latitude: 40.7603,
  longitude: -73.9885,
  confidence: 0.95,
};

type PlacesSession = {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
  mapId: string;
  datasetName: string;
};

function _mapRegion(page: Page): Locator {
  return page.getByRole("region", { name: new RegExp(MAP_NAME) });
}

function _layerRow(page: Page, layerName: string): Locator {
  return page
    .getByRole("region", { name: "Layers" })
    .getByRole("listitem")
    .filter({ has: page.getByText(layerName, { exact: true }) });
}

/** Seeds an empty map, signs in, and opens it. */
async function _openSeededMap(page: Page, e2eWorkerDb: E2EWorkerDb): Promise<PlacesSession> {
  const supabaseAdminClient = createSupabaseAdminClient();
  const { primaryUser, workspaceSlug } = e2eWorkerDb;
  const workspaceId = await getWorkspaceIdBySlug({ supabaseAdminClient, slug: workspaceSlug });
  const mapId = await seedAvaMap({
    admin: supabaseAdminClient,
    workspaceId,
    ownerEmail: primaryUser.email,
    name: MAP_NAME,
  });
  await signInWithEmailPassword(page, {
    email: primaryUser.email,
    password: primaryUser.password,
    workspaceSlug,
  });
  await page.getByRole("link", { name: "Maps" }).click();
  await page.getByRole("link", { name: `Open the map ${MAP_NAME}` }).click();
  await expect(_mapRegion(page)).toBeVisible({ timeout: LONG_WAIT });
  return { supabaseAdminClient, workspaceId, mapId, datasetName: `E2E exposure sites ${Date.now()}` };
}

/** Creates a places dataset through the tool and waits for its layer. */
async function _createPlacesDataset(page: Page, datasetName: string): Promise<void> {
  await page.getByRole("button", { name: "Add a place" }).click();
  await page.getByRole("textbox", { name: "New places dataset name" }).fill(datasetName);
  await page.getByRole("button", { name: "Create places dataset" }).click();
  await expect(_layerRow(page, datasetName)).toBeVisible({ timeout: LONG_WAIT });
}

async function _clickCanvasFraction(page: Page, xFraction: number, yFraction: number): Promise<void> {
  const mapCanvas = _mapRegion(page).locator(".maplibregl-canvas");
  const canvasBox = await mapCanvas.boundingBox();
  if (!canvasBox) {
    throw new Error("MapLibre canvas was not visible for the place click.");
  }
  await mapCanvas.click({
    position: { x: canvasBox.width * xFraction, y: canvasBox.height * yFraction },
    force: true,
  });
}

async function _savePlace(page: Page, placeName: string): Promise<void> {
  await page.getByRole("textbox", { name: /Place name/ }).fill(placeName);
  await page.getByRole("button", { name: "Save place" }).click();
  await expect(page.getByText("Place saved.")).toBeVisible({ timeout: LONG_WAIT });
}

/** Features in the layer's GeoJSON source, read off the live MapLibre map. */
async function _readLayerFeatureCount(page: Page, layerName: string): Promise<number | undefined> {
  const describedBy = await _layerRow(page, layerName)
    .getByRole("button", { name: `Reorder layer ${layerName}` })
    .getAttribute("aria-describedby");
  const layerId = describedBy?.match(/^layer-(.+)-drag-instructions$/)?.[1];
  if (!layerId) {
    return undefined;
  }
  return page.evaluate((sourceId) => {
    const source = window.__avandarE2EMap?.getStyle()?.sources[sourceId];
    if (!source || source.type !== "geojson" || typeof source.data !== "object") {
      return undefined;
    }
    return (source.data as GeoJSON.FeatureCollection).features.length;
  }, `ava-map-source-${layerId}`);
}

async function _expectFeatureCount(page: Page, layerName: string, count: number): Promise<void> {
  await expect
    .poll(async () => {
      return await _readLayerFeatureCount(page, layerName);
    }, { timeout: LONG_WAIT })
    .toBe(count);
}

/** The places dataset's stored SQL, read as an oracle. */
async function _readStoredSql(session: PlacesSession): Promise<string> {
  const { data: dataset } = await session.supabaseAdminClient
    .from("datasets")
    .select("id")
    .eq("workspace_id", session.workspaceId)
    .eq("name", session.datasetName)
    .single()
    .throwOnError();
  const { data: virtualDataset } = await session.supabaseAdminClient
    .from("datasets__virtual")
    .select("raw_sql")
    .eq("dataset_id", dataset.id)
    .single()
    .throwOnError();
  return virtualDataset.raw_sql;
}

async function _cleanUp(session: PlacesSession | undefined): Promise<void> {
  if (!session) {
    return;
  }
  await deleteMapsByIds({ admin: session.supabaseAdminClient, mapIds: [session.mapId] });
  const { data: datasets } = await session.supabaseAdminClient
    .from("datasets")
    .select("id")
    .eq("workspace_id", session.workspaceId)
    .eq("name", session.datasetName)
    .throwOnError();
  for (const dataset of datasets ?? []) {
    await deleteDatasetAndShares({ supabaseAdminClient: session.supabaseAdminClient, datasetId: dataset.id });
  }
}

test(
  "places added by a map click and by typed coordinates land in the dataset and on the map",
  { tag: E2E_ONLINE_TAG },
  async ({ page, e2eWorkerDb }) => {
    let session: PlacesSession | undefined;
    try {
      session = await _openSeededMap(page, e2eWorkerDb);
      await _createPlacesDataset(page, session.datasetName);

      await page.getByRole("button", { name: "Click the map" }).click();
      await _clickCanvasFraction(page, 0.5, 0.5);
      await _savePlace(page, "Clicked restaurant");
      await _expectFeatureCount(page, session.datasetName, 1);

      await page.getByRole("button", { name: "Add a place" }).click();
      const coordinates = page.getByRole("textbox", { name: "Latitude and longitude" });
      await coordinates.fill("40.7603, -73.9885");
      await coordinates.press("Enter");
      await _savePlace(page, "O'Brien's Café");
      await _expectFeatureCount(page, session.datasetName, 2);

      const storedSql = await _readStoredSql(session);
      expect(storedSql).toContain("'Clicked restaurant'");
      expect(storedSql).toContain("'O''Brien''s Café'");
    } finally {
      await _cleanUp(session);
    }
  },
);

test(
  "a place from address search keeps the address and credits OpenStreetMap",
  { tag: E2E_ONLINE_TAG },
  async ({ page, e2eWorkerDb }) => {
    let session: PlacesSession | undefined;
    try {
      await page.route("**/functions/v1/geocode/search", async (route) => {
        if (route.request().method() !== "POST") {
          await route.fallback();
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ candidates: [GEOCODE_CANDIDATE] }),
        });
      });
      session = await _openSeededMap(page, e2eWorkerDb);
      await _createPlacesDataset(page, session.datasetName);

      await page.getByRole("textbox", { name: "Search an address" }).fill("350 W 46th St");
      await expect(page.getByRole("link", { name: "© OpenStreetMap contributors" })).toBeVisible({ timeout: MEDIUM_WAIT });
      await page.getByRole("button", { name: GEOCODE_CANDIDATE.label }).click();
      await expect(page.getByRole("textbox", { name: "Address" })).toHaveValue(GEOCODE_CANDIDATE.label);
      await _savePlace(page, "Restaurant, W 46th St");
      await _expectFeatureCount(page, session.datasetName, 1);

      expect(await _readStoredSql(session)).toContain(`'${GEOCODE_CANDIDATE.label}'`);
    } finally {
      await _cleanUp(session);
    }
  },
);

test(
  "a place clicked on the map can be renamed and then deleted",
  { tag: E2E_ONLINE_TAG },
  async ({ page, e2eWorkerDb }) => {
    let session: PlacesSession | undefined;
    try {
      session = await _openSeededMap(page, e2eWorkerDb);
      await _createPlacesDataset(page, session.datasetName);
      await page.getByRole("button", { name: "Click the map" }).click();
      await _clickCanvasFraction(page, 0.5, 0.5);
      await _savePlace(page, "Clinic");
      await _expectFeatureCount(page, session.datasetName, 1);

      await _clickCanvasFraction(page, 0.5, 0.5);
      await page.getByRole("button", { name: "Edit place" }).click();
      const nameField = page.getByRole("textbox", { name: /Place name/ });
      await expect(nameField).toHaveValue("Clinic");
      await _savePlace(page, "Clinic, side door");
      await expect.poll(async () => {
        return await _readStoredSql(session!);
      }, { timeout: LONG_WAIT }).toContain("'Clinic, side door'");

      await _clickCanvasFraction(page, 0.5, 0.5);
      await page.getByRole("button", { name: "Delete place" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
      await _expectFeatureCount(page, session.datasetName, 0);
    } finally {
      await _cleanUp(session);
    }
  },
);
```

- [ ] **Step 2: Run each spec on its own.** (Local Supabase switched; app dev server per `pnpm test:e2e`'s runner.)

```bash
pnpm test:e2e gis-places.spec.ts
pnpm test:e2e places-values-dataset.spec.ts
```

Expected: `3 passed` and `1 passed`, each test under the 45 s local timeout. If the third test cannot hit the point at the canvas centre, the clicked place is not centred: add a Go-to step to `40.7603, -73.9885` before the click and use the typed-coordinate path to create the place instead (both are UI flows). Diagnose any flake per `docs/rules/e2e-testing.md` before changing waits.

- [ ] **Step 3: Commit.**

```bash
git add tests/e2e/gis-places.spec.ts
git commit -m "test(gis): cover adding, searching, editing, and deleting places end to end"
```

---

## Task 23: Record the point-input decision in the GIS inventory

**Files:**
- Modify: `docs/design/gis/feature-home-inventory.md:281`

- [ ] **Step 1: Replace the "Decision needed" cell of the isochrone row** with:

```markdown
Resolved for point input by "Add a place" (`docs/measles-demo/workflow-b-map-features-design.md` §4.4): a tool-cluster tool whose input is a point the user places writes rows into a dataset and makes sure a layer shows that dataset, rather than becoming a geo-binding type. The tool arms `MapToolMode` `{ type: "place" }`, and one map click, typed coordinates, or an address result sets the point. An isochrone follows the same shape: a tool that takes a placed point and writes a polygon layer, as Buffer writes one from a layer.
```

- [ ] **Step 2: Commit.**

```bash
git add docs/design/gis/feature-home-inventory.md
git commit -m "docs(gis): record how a tool takes a point the user places"
```

---

## Task 24: Translations, formatting, and full verification

**Files:**
- Modify: `src/i18n/locales/*/messages.po` (generated by extract)

- [ ] **Step 1: Extract strings.**

```bash
pnpm i18n:extract
grep -n "Add a place here\|© OpenStreetMap contributors\|never type a person's home address" src/i18n/locales/en/messages.po
```

Expected: each string appears with a `#:` reference to its new file.

- [ ] **Step 2: Format and lint the changed files.**

```bash
pnpm format
pnpm lint
```

Expected: no errors in files this plan created or changed.

- [ ] **Step 3: Type check and run every suite this feature touches.**

```bash
pnpm tsc -b --force
pnpm vitest run src/clients/places src/views/GisApp supabase/functions/geocode
pnpm test:executed src/clients/places
supabase test db supabase/tests/database/rpc_datasets__add_places_dataset.test.sql
```

Expected: no type errors; all Vitest, executed, and pgTAP tests pass.

- [ ] **Step 4: Commit.**

```bash
git add src/i18n/locales
git commit -m "chore(i18n): extract the place tool strings"
```

- [ ] **Step 5: Hand off what code cannot do.** Pablo sets the `GEOAPIFY_API_KEY` secret on each Supabase project (`supabase secrets set GEOAPIFY_API_KEY=<key> --project-ref <ref>`) and in `.env.development.edge` locally, then `pnpm fns:update-env`. Never set it from an agent: it is a production write.

---

## CSV fallback branch (only if Task 1 fails)

Same UI, same tests from Task 4 onward; only storage changes. A places dataset becomes a `csv_file` dataset whose CSV is rebuilt and re-imported on every edit (the `useRefreshGoogleSheetDataset` path: `LocalDatasetClient.startCsvImport` with the same dataset id, then `DatasetParquetStorageClient.startDatasetUpload`). Two behavior differences, both stated in the UI copy below: a CSV dataset cannot be empty (a header-only CSV does not sniff reliably), so the dataset is created with the first place, and the last place cannot be deleted.

### Task C2 (replaces Task 2): `is_places` on `datasets__csv_file`

**Files:**
- Modify: `supabase/schemas/20.datasets__csv_file.sql` (append to the column list, line 36)
- Create: `supabase/tests/database/datasets__csv_file_is_places.test.sql`
- Generated: migration, `shared/types/database.types.ts`, desktop `.gen.sql`

- [ ] **Step 1: Write the failing test.**

```sql
-- supabase/tests/database/datasets__csv_file_is_places.test.sql
\set ON_ERROR_STOP on

/** A CSV dataset can be flagged as a places dataset, off by default. */
begin;

select plan (2);

select has_column ('public', 'datasets__csv_file', 'is_places', 'datasets__csv_file has an is_places flag');

select col_default_is ('public', 'datasets__csv_file', 'is_places', 'false', 'is_places defaults to false');

select * from finish();

rollback;
```

- [ ] **Step 2: Run it** after `ava supabase status` names `feat-gis-places`:

```bash
supabase test db supabase/tests/database/datasets__csv_file_is_places.test.sql
```

Expected: FAIL, column does not exist.

- [ ] **Step 3: Append the column** to the end of `datasets__csv_file`'s column list (after `timestamp_format`, adding a comma to that line):

```sql
  -- True for a places dataset: the map's "Add a place" tool rebuilds this
  -- CSV from its rows on every edit.
  is_places boolean not null default false
```

- [ ] **Step 4: Generate.**

```bash
pnpm db:reset
pnpm db:new-migration add_places_csv_datasets
pnpm db:gen-types
pnpm desktop:sqlite:gen-migrations
supabase test db supabase/tests/database/datasets__csv_file_is_places.test.sql
```

Expected: the migration adds only the column; test `2/2` passes.

- [ ] **Step 5: Commit.**

```bash
git add supabase/schemas/20.datasets__csv_file.sql supabase/tests/database/datasets__csv_file_is_places.test.sql supabase/migrations shared/types/database.types.ts apps/desktop/migrations
git commit -m "feat(places): flag CSV datasets as places"
```

### Task C3 (replaces Task 3): `isPlaces` on `CsvFileDataset`

**Files:**
- Modify: `shared/models/datasets/CsvFileDataset/CsvFileDataset.types.ts` (after `isInCloudStorage`; and the `Insert` line)
- Modify: `shared/models/datasets/CsvFileDataset/CsvFileDatasetParsers.ts:19-36`

- [ ] **Step 1:** `pnpm tsc -b --force`; expected: `ZodConsistencyTests` error in `CsvFileDatasetParsers.ts`.
- [ ] **Step 2:** In the model, after `isInCloudStorage: boolean;` add:

```ts
    /** True for a places dataset, whose CSV the map's place tool rebuilds on every edit. */
    isPlaces: boolean;
```

and change `Insert` to `SetOptional<CsvFileDatasetRead, "createdAt" | "id" | "updatedAt" | "isPlaces">;`.
- [ ] **Step 3:** Add `is_places: z.boolean(),` to `DBReadSchema` after `timestamp_format`.
- [ ] **Step 4:** `pnpm tsc -b --force`; expected: clean.
- [ ] **Step 5:**

```bash
git add shared/models/datasets/CsvFileDataset
git commit -m "feat(places): read is_places on the CsvFileDataset model"
```

### Task C9 (replaces Task 9): `CsvPlacesStore`

**Files:**
- Create: `src/clients/places/buildPlacesCsv/buildPlacesCsv.ts` (+ test)
- Create: `src/clients/places/CsvPlacesStore/CsvPlacesStore.ts` (+ test)
- Modify: `src/clients/places/places.constants.ts` (add `PLACES_CSV_DATASET_COLUMNS`)

- [ ] **Step 1: Write the failing CSV test.**

```ts
// src/clients/places/buildPlacesCsv/buildPlacesCsv.test.ts
import { describe, expect, it } from "vitest";
import { buildPlacesCsv } from "@/clients/places/buildPlacesCsv/buildPlacesCsv";

describe("buildPlacesCsv", () => {
  it("writes a header and one quoted-where-needed line per place, empty for missing values", () => {
    expect(
      buildPlacesCsv([
        {
          placeId: "p1",
          name: "O'Brien's, \"Café\"",
          address: undefined,
          latitude: 40.7603,
          longitude: -73.9885,
          startsAt: "2026-10-02T18:00",
          endsAt: undefined,
          notes: "line one\nline two",
        },
      ]),
    ).toBe(
      "place_id,name,address,latitude,longitude,starts_at,ends_at,notes\n" +
        "p1,\"O'Brien's, \"\"Café\"\"\",,40.7603,-73.9885,2026-10-02T18:00,,\"line one\nline two\"\n",
    );
  });
});
```

- [ ] **Step 2:** `pnpm vitest run src/clients/places/buildPlacesCsv`; expected: FAIL, unresolved.
- [ ] **Step 3: Implement it.**

```ts
// src/clients/places/buildPlacesCsv/buildPlacesCsv.ts
import { prop } from "@avandar/utils";
import { PLACES_COLUMNS } from "@/clients/places/places.constants";
import type { PlaceRow } from "@/clients/places/places.types";

function _csvField(value: string | number | undefined): string {
  if (value === undefined) {
    return "";
  }
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * Writes a places dataset's rows as RFC 4180 CSV in the places column order,
 * for the CSV-backed places store to re-import on every edit.
 */
export function buildPlacesCsv(rows: readonly PlaceRow[]): string {
  const header = PLACES_COLUMNS.map(prop("name")).join(",");
  const lines = rows.map((row) => {
    return [row.placeId, row.name, row.address, row.latitude, row.longitude, row.startsAt, row.endsAt, row.notes]
      .map(_csvField)
      .join(",");
  });
  return `${[header, ...lines].join("\n")}\n`;
}
```

- [ ] **Step 4:** Append to `places.constants.ts`:

```ts
/**
 * The `dataset_columns` of a CSV-backed places dataset. Every column is
 * declared as detected `VARCHAR`, so relation loading always casts to the
 * stored type whatever DuckDB's sniff inferred on that edit.
 */
export const PLACES_CSV_DATASET_COLUMNS: readonly DatasetColumnInput[] =
  PLACES_DATASET_COLUMNS.map((column) => {
    return { ...column, original_data_type: "VARCHAR", detected_data_type: "VARCHAR" };
  });
```

- [ ] **Step 5: Write the failing store test.**

```ts
// src/clients/places/CsvPlacesStore/CsvPlacesStore.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";

const mocks = vi.hoisted(() => {
  return {
    evict: vi.fn(),
    dropLocalDataset: vi.fn(),
    startCsvImport: vi.fn(),
    startDatasetUpload: vi.fn(),
    runQuery: vi.fn(),
  };
});

vi.mock("@/clients/qetl/RelationCache/DexieRelationCache/DexieRelationCache", () => {
  return { DexieRelationCache: { evict: mocks.evict } };
});
vi.mock("@/clients/datasets/LocalDatasetClient/LocalDatasetClient", () => {
  return { LocalDatasetClient: { dropLocalDataset: mocks.dropLocalDataset, startCsvImport: mocks.startCsvImport } };
});
vi.mock("@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient", () => {
  return { DatasetParquetStorageClient: { startDatasetUpload: mocks.startDatasetUpload } };
});
vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: mocks.runQuery } };
});
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return { DatasetClient: { insertCsvFileDataset: vi.fn() } };
});
vi.mock("@/clients/datasets/source-datasets/CsvFileDatasetClient", () => {
  return { CsvFileDatasetClient: { getAll: vi.fn(), update: vi.fn(), useGetAll: vi.fn() } };
});

const { CsvPlacesStore } = await import("@/clients/places/CsvPlacesStore/CsvPlacesStore");

const TARGET = {
  workspaceId: "33333333-3333-4333-8333-333333333333" as Workspace.Id,
  userId: "44444444-4444-4444-8444-444444444444" as User.Id,
  datasetId: "11111111-1111-4111-8111-111111111111" as Dataset.Id,
};
const ROW = {
  placeId: "p1", name: "Clinic", address: undefined, latitude: 40.7, longitude: -73.9,
  startsAt: undefined, endsAt: undefined, notes: undefined,
};

describe("CsvPlacesStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("re-imports the rebuilt CSV under the same dataset id and uploads it", async () => {
    await CsvPlacesStore.writePlaces({ ...TARGET, rows: [ROW] });
    const file = mocks.startCsvImport.mock.calls[0]![0].file as File;
    expect(await file.text()).toContain("p1,Clinic,,40.7,-73.9,,,");
    expect(mocks.startCsvImport).toHaveBeenCalledWith(expect.objectContaining({ datasetId: TARGET.datasetId }));
    expect(mocks.startDatasetUpload).toHaveBeenCalledWith({
      workspaceId: TARGET.workspaceId, datasetId: TARGET.datasetId, sourceType: "csv_file",
    });
  });

  it("refuses to leave a CSV places dataset empty", async () => {
    await expect(CsvPlacesStore.writePlaces({ ...TARGET, rows: [] })).rejects.toThrow("keeps at least one place");
    expect(mocks.startCsvImport).not.toHaveBeenCalled();
  });

  it("drops the cached copy before reading, so the read is fresh", async () => {
    mocks.runQuery.mockResolvedValue({ data: [] });
    await CsvPlacesStore.readPlaces(TARGET);
    expect(mocks.evict).toHaveBeenCalled();
    expect(mocks.dropLocalDataset).toHaveBeenCalledWith({ datasetId: TARGET.datasetId });
    expect(mocks.runQuery).toHaveBeenCalledWith({
      workspaceId: TARGET.workspaceId,
      rawSql: expect.stringContaining(`FROM (SELECT * FROM "${TARGET.datasetId}") AS stored_places`),
    });
  });
});
```

- [ ] **Step 6:** `pnpm vitest run src/clients/places/CsvPlacesStore`; expected: FAIL, unresolved.
- [ ] **Step 7: Implement it.** `createPlacesDataset` here takes the first place's row as the dataset's content, so the C16 swap passes it (see C16).

```ts
// src/clients/places/CsvPlacesStore/CsvPlacesStore.ts
import { MIMEType, prop, where } from "@avandar/utils";
import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { useMemo } from "react";
import { uuid } from "$/lib/uuid";
import { makePrincipalKeyFromWorkspaceSession } from "$/models/relations/RelationCacheKey/RelationCacheKey";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { CsvFileDatasetClient } from "@/clients/datasets/source-datasets/CsvFileDatasetClient";
import { buildPlacesCsv } from "@/clients/places/buildPlacesCsv/buildPlacesCsv";
import { buildPlacesReadSql } from "@/clients/places/buildPlacesReadSql";
import { parsePlaceRowsFromQueryRows } from "@/clients/places/parsePlaceRowsFromQueryRows/parsePlaceRowsFromQueryRows";
import { PLACES_CSV_DATASET_COLUMNS } from "@/clients/places/places.constants";
import { DexieRelationCache } from "@/clients/qetl/RelationCache/DexieRelationCache/DexieRelationCache";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { PlaceRow, PlacesStore } from "@/clients/places/places.types";

type CsvTarget = Readonly<{ workspaceId: Workspace.Id; userId: User.Id; datasetId: Dataset.Id }>;

async function _dropLocalCopy(target: CsvTarget): Promise<void> {
  await DexieRelationCache.evict(
    [{ kind: "dataset", id: target.datasetId }],
    makePrincipalKeyFromWorkspaceSession({ workspaceId: target.workspaceId, userId: target.userId }),
  );
  await LocalDatasetClient.dropLocalDataset({ datasetId: target.datasetId });
}

async function _importPlacesCsv(target: CsvTarget, rows: readonly PlaceRow[]) {
  const file = new File([buildPlacesCsv(rows)], `${target.datasetId}.csv`, { type: MIMEType.TEXT_CSV });
  const sniff = await LocalDatasetClient.startCsvImport({ ...target, file, parseOptions: {} });
  return { sniff, sizeInBytes: file.size };
}

const _writePlaces: PlacesStore["writePlaces"] = async (options) => {
  if (options.rows.length === 0) {
    throw new Error("A CSV places dataset keeps at least one place.");
  }
  await _dropLocalCopy(options);
  await _importPlacesCsv(options, options.rows);
  await DatasetParquetStorageClient.startDatasetUpload({
    workspaceId: options.workspaceId,
    datasetId: options.datasetId,
    sourceType: "csv_file",
  });
};

const _readPlaces: PlacesStore["readPlaces"] = async (options) => {
  await _dropLocalCopy(options);
  const result = await WorkspaceQuerySession.runQuery({
    workspaceId: options.workspaceId,
    rawSql: buildPlacesReadSql(`SELECT * FROM ${quoteSqlIdentifier(options.datasetId)}`),
  });
  return parsePlaceRowsFromQueryRows(result.data);
};

async function _createPlacesDatasetWithRows(
  options: Readonly<{ workspaceId: Workspace.Id; userId: User.Id; datasetName: string; rows: readonly PlaceRow[] }>,
): Promise<Dataset.T> {
  const target = { workspaceId: options.workspaceId, userId: options.userId, datasetId: uuid<Dataset.Id>() };
  const { sniff, sizeInBytes } = await _importPlacesCsv(target, options.rows);
  const dataset = await DatasetClient.insertCsvFileDataset({
    datasetId: target.datasetId,
    workspaceId: target.workspaceId,
    datasetName: options.datasetName,
    datasetDescription: "",
    columns: PLACES_CSV_DATASET_COLUMNS,
    isInCloudStorage: false,
    sizeInBytes,
    parseOptions: {
      rowsToSkip: sniff.csvSniff.SkipRows,
      delimiter: sniff.csvSniff.Delimiter,
      quoteChar: sniff.csvSniff.Quote,
      escapeChar: sniff.csvSniff.Escape,
      newlineDelimiter: sniff.csvSniff.NewLineDelimiter,
      commentChar: sniff.csvSniff.Comment,
      hasHeader: sniff.csvSniff.HasHeader,
      dateFormat: sniff.csvSniff.DateFormat ?? undefined,
      timestampFormat: sniff.csvSniff.TimestampFormat ?? undefined,
    },
  });
  const [csvFileDataset] = await CsvFileDatasetClient.getAll(where("dataset_id", "eq", dataset.id));
  await CsvFileDatasetClient.update({ id: csvFileDataset!.id, data: { isPlaces: true } });
  await DatasetParquetStorageClient.startDatasetUpload({ workspaceId: target.workspaceId, datasetId: dataset.id, sourceType: "csv_file" });
  return dataset;
}

function _usePlacesDatasetIds(workspaceId: Workspace.Id): ReadonlySet<Dataset.Id> {
  const [csvFileDatasets] = CsvFileDatasetClient.useGetAll({
    where: { workspace_id: { eq: workspaceId }, is_places: { eq: true } },
  });
  return useMemo(() => {
    return new Set((csvFileDatasets ?? []).map(prop("datasetId")));
  }, [csvFileDatasets]);
}

/**
 * A places dataset stored as a CSV dataset that is rebuilt and re-imported
 * on every edit. Used only when a `VALUES` virtual dataset cannot load. It
 * cannot be empty: it is created with its first place and keeps at least one.
 */
export const CsvPlacesStore = {
  createPlacesDatasetWithRows: _createPlacesDatasetWithRows,
  readPlaces: _readPlaces,
  writePlaces: _writePlaces,
  usePlacesDatasetIds: _usePlacesDatasetIds,
};
```

- [ ] **Step 8:** `pnpm vitest run src/clients/places/buildPlacesCsv src/clients/places/CsvPlacesStore && pnpm tsc -b --force`; expected: `1 passed`, `3 passed`, no type errors.
- [ ] **Step 9:**

```bash
git add src/clients/places/buildPlacesCsv src/clients/places/CsvPlacesStore src/clients/places/places.constants.ts
git commit -m "feat(places): store places as a CSV dataset rebuilt on each edit"
```

### Task C16 (inside Task 16): use the CSV store and defer creation to the first place

Apply while doing Task 16:

1. In `usePlacesActions.ts` and `usePlaceTool.ts`, replace `import { VirtualPlacesStore as PlacesStore } from "@/clients/places/VirtualPlacesStore/VirtualPlacesStore";` with `import { CsvPlacesStore as PlacesStore } from "@/clients/places/CsvPlacesStore/CsvPlacesStore";`.
2. `PlaceToolController` (Task 13 types) gains `pendingDatasetName: string | undefined;`. `PlaceDatasetStep`'s "Create places dataset" calls `controller.createPlacesDataset(name)`, which in this branch only stores the name (`useState` in `usePlaceTool`) instead of calling the store, and `PlaceToolSteps` treats `pendingDatasetName !== undefined` as having a target dataset.
3. `useSavePlace`'s `mutationFn`, when `variables.datasetId` is `undefined` and `pendingDatasetName` is set, calls `PlacesStore.createPlacesDatasetWithRows({ workspaceId, userId, datasetName: pendingDatasetName, rows: [{ ...variables.input, placeId: uuid() }] })`, then builds and adds the layer exactly as `useCreatePlacesDataset` does in Task 16 Step 1, then refreshes caches. `savePlace` in `usePlacesActions` passes `datasetId: draft.datasetId ?? options.targetDatasetId` (possibly `undefined`) through.
4. `useDeletePlace`: when `withPlaceRemoved` would leave zero rows, return a new outcome `"lastPlace"` without writing, and notify `t\`A places dataset keeps at least one place. Delete the dataset in Data Manager instead.\``.
5. The Task 22 spec's `_createPlacesDataset` helper then waits for the layer after the first `_savePlace` instead of after "Create places dataset", and the delete test asserts the "keeps at least one place" message instead of a feature count of 0.

---

## Self-review

### Spec coverage (§4)

| Spec item | Task |
| --- | --- |
| §4.1 add exposure sites by click, coordinates, or address search | 12, 19, 18, 22 |
| §4.1 sites are ordinary data (buffers, filters, Data Explorer, dashboards) | 2, 9 (virtual dataset), 1 (Data Explorer reads it), 14 (ordinary `latLngColumns` layer) |
| §4.2 virtual dataset holding a `VALUES` query | 7, 9 |
| §4.2 add, move, delete rewrite `raw_sql` | 6, 16, 21 |
| §4.2 every value through `quoteSqlLiteral`; coordinates validated numbers | 5, 7, 8 |
| §4.2 at most 500 rows | 6, 7 |
| §4.2 `is_places` boolean default false on `datasets__virtual` | 2, 3 |
| §4.2 verify early that a no-relation virtual dataset loads and its columns are right; CSV fallback | 1, C2, C3, C9, C16 |
| §4.3 columns name, address, latitude, longitude, starts_at, ends_at, notes | 4 (plus `place_id`, see below) |
| §4.3 `starts_at` works with the time slider | 14 |
| §4.4 tool-cluster tool "Add a place", `MapToolMode` `{ type: "place" }` | 12, 19 |
| §4.4.1 first time: choose a places dataset or create "Exposure sites", add a point layer with `latLngColumns` | 14, 16, 19 |
| §4.4.2 click, coordinates via `parseMapGoToQuery`, or address search | 12, 19, 18 |
| §4.4.3 small form: name, dates, notes | 17 |
| §4.4.4 clicking a place offers Edit, Move, Delete | 21, 16 |
| §4.4 Go to gains "Add a place here" | 20 |
| §4.4 settles the inventory's point-input question | 23 |
| §4.5 `supabase/functions/geocode/`, query plus optional bias box, up to five `{ label, latitude, longitude, confidence }` | 10, 11 |
| §4.5 browser never calls the provider; key on the server (`GEOAPIFY_API_KEY`) | 11, 18 |
| §4.5 Geoapify behind a provider interface | 10 |
| §4.5 "© OpenStreetMap contributors" under address results | 17, 18 |
| §4.5 privacy help text; route does not log query strings | 18, 11 |
| §4.6 unit: SQL generation and quoting (quotes, unicode, empty notes), coordinate validation, 500 cap | 7, 8, 5, 6 |
| §4.6 edge: provider mapping, errors and empty results, no query logging | 10, 11 |
| §4.6 component: place form, edit and delete | 17, 21 |
| §4.6 e2e: add by click, then by coordinates; address search against a stubbed provider | 22 |

### Deliberate departures

- **`place_id` column.** Added to the spec's seven so Edit, Move, and Delete address one row reliably. It shows up in popups, Data Explorer, and chat like any column.
- **Bias, not filter.** The geocoder sends `bias=rect:` (the spec's "bias box") rather than the `filter=rect:` in the task brief, so addresses just outside the view are still found. One-word change in `_buildSearchUrl` if a hard filter is wanted.
- **POST route.** `/geocode/search` is a POST so the address never sits in a URL that platform logs record.

### Could not verify in code

1. Task 1's outcome in the browser. The node-side half was run while writing this plan (`DuckDbSqlAnalyzer.getReadDatasetIdsFromSql` returns `[]` for the stored shape and for `buildPlacesReadSql`'s wrapper; DuckDB keeps all eight types through Parquet; `'2026-10-02T18:00'` casts to `TIMESTAMP`; `strftime` gives `2026-10-02T18:00`). The DuckDB-WASM, relation cache, and Data Explorer half is what the e2e spike exists to prove.
2. Geoapify's response shape (`results[].formatted`, `lat`, `lon`, `rank.confidence` with `format=json`), the `bias=rect:` parameter, and whether Geoapify's free tier also requires a "Powered by Geoapify" credit. No network call was made. Check the provider docs before signing up; the attribution is one more line in `OpenStreetMapAttribution`.
3. That `supabase test db <file>` accepts a single path in this CLI version (otherwise run `pnpm test:db`).
4. That a lat/lng layer's MapLibre source is `ava-map-source-<layerId>` holding raw features at the seeded zoom (copied from `gis-buffer-layer.spec.ts`, which reads polygon layers), and that a click at the canvas centre hits a single point there (Task 22 Step 2 gives the fallback).
5. That Mantine's `Popover.Target` accepts `PlaceMapToolTrigger` without `forwardRef`; it mirrors `BufferMapToolTrigger`, which works today.
6. Cross-user freshness outside the GIS app. A teammate's edit reaches this browser's map on the next map open (`useRefreshPlacesOnMapOpen`), but Data Explorer and dashboards in an already-open tab keep the cached copy until reload, because `VirtualDatasetWrapper` reports `freshnessSignal: "none"`. Concurrent edits are last-write-wins. Neither is fixed here.
7. Permissions: creating a places dataset needs workspace admin (`rpc_datasets__add_dataset`'s check), and editing needs dataset editor (`datasets__virtual` update policy). A viewer sees the tool and gets an error toast; hiding it for viewers is not in this plan.
8. Data Explorer's "Save" over a places dataset can replace its `VALUES` SQL with any query; the place tool then refuses to edit it (`parsePlaceRowsFromQueryRows` throws) rather than corrupting it. No guard stops the overwrite itself.
9. Logging F2 in `docs/measles-demo/pr-feature-log.md` happens when the branch merges into `demo/measles`, so it is not a task here.
