# F5 Map Block in Dashboards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a dashboard show a GIS map as a block: live for workspace viewers, and as a protected, pre-rendered snapshot on a public dashboard, added from the GIS export sheet or the dashboard editor.

**Architecture:** A read-only `MapViewer` (GIS-owned) draws a map from either live layer queries (through the same `useMapLayerRendering` and `MapSourceHydration` the GIS app uses) or a `MapSnapshot` file, and a new `MapPBlock` picks the mode from the page's `AvaPageMetadata`. Publishing a dashboard to the web compiles each map block's visible layers through the viewer's own query and render path (`runMapLayerQuery` + `makeLayerRender`), re-applies sensitivity defensively, cuts properties to popup columns, and writes one JSON file per map into the existing dashboard snapshot generation (`dashboards/<id>/revisions/<rev>/maps/<mapId>.json`) in the `published` bucket. The only schema change teaches the two snapshot path parsers that path, so every existing storage policy covers it unchanged.

**Tech Stack:** React 19, Puck (`@puckeditor/core` 0.21), MapLibre GL 5, Mantine, Lingui, TanStack Query (`@avandar/query-hooks`), Zod 4, Supabase Storage + pgTAP, Vitest, Playwright.

**Spec:** [workflow-b-map-features-design.md](workflow-b-map-features-design.md) §7

**Depends on:** no `AvaMapConfig` version of its own. Built after F1 (V6), F3 (V7), and F4 (V8); every config read and write goes through `AvaMapConfigSchema.toJson` / `fromJson`, which follow whatever version is current. F3's layer spatial filters ride on `MapLayer.T` and the query path this plan reuses, so they publish without extra work (see the merge note in Task 5).

**Schema work:** yes, function-only. `util__storage_object_dashboard_id` and `util__storage_object_snapshot_revision` learn the map snapshot path. No table, policy, or bucket changes.

---

## File structure

Created:

| File | Responsibility |
| --- | --- |
| `supabase/tests/database/dashboards/storage_map_snapshot_paths.test.sql` | pgTAP: map snapshot paths parse, anon can read a committed public map snapshot only, an admin can stage one |
| `supabase/migrations/<timestamp>_dashboard_map_snapshot_paths.sql` | Generated: the two replaced path parser functions |
| `src/clients/maps/MapSnapshot/MapSnapshot.types.ts` | `MapSnapshot` and `MapSnapshotLayer` types |
| `src/clients/maps/MapSnapshot/MapSnapshotJson/MapSnapshotJson.ts` (+ `.test.ts`) | Serialize and validate a snapshot file |
| `src/clients/maps/MapSnapshot/createPublicMapConfigFromMapConfig/createPublicMapConfigFromMapConfig.ts` (+ `.test.ts`) | Strip layer sources from a config before it goes public |
| `src/clients/maps/MapSnapshot/compileMapSnapshot/compileMapSnapshot.ts` (+ `.test.ts`) | Compile a map's visible layers into protected output |
| `src/clients/maps/MapSnapshot/compileMapSnapshot/applySnapshotSensitivity.ts` | Jitter spatial points of `jitter` layers, refuse non-areas for `aggregateOnly` |
| `src/clients/maps/MapSnapshot/compileMapSnapshot/cutSnapshotFeatureProperties.ts` | Keep popup, paint, and reserved render properties only |
| `src/clients/maps/MapSnapshot/createMapSnapshotFromMapId/createMapSnapshotFromMapId.ts` (+ `.test.ts`) | Load a map, hydrate it, run its queries, compile |
| `src/clients/maps/MapSnapshot/getMapSnapshotLayerSummaries/getMapSnapshotLayerSummaries.ts` (+ `.test.ts`) | Layer name and feature count for the publish preview |
| `src/clients/maps/getDatasetIdsFromMapConfig/getDatasetIdsFromMapConfig.ts` (+ `.test.ts`) | Every dataset a map's layers read |
| `src/clients/storage/PublicMapSnapshotStorageClient/PublicMapSnapshotStorageClient.ts` (+ `.test.ts`) | Upload, download, and delete map snapshot files |
| `src/clients/dashboards/DashboardMapBlocks/DashboardMapBlocks.ts` (+ `.test.ts`) | Find map blocks and map ids in a saved dashboard config |
| `src/clients/dashboards/DashboardClient/dashboardSnapshotHelpers/dashboardMapSnapshots.ts` (+ `.test.ts`) | Compile (public only) and upload a dashboard's map snapshots |
| `src/clients/dashboards/DashboardClient/__tests__/DashboardClient.publishMapSnapshots.test.ts` | Publish stages map snapshots inside the claimed revision |
| `src/views/GisApp/layers/useMapLayersData/runMapLayerQuery.ts` | One layer's query, callable outside React |
| `src/views/GisApp/layers/createMapOverlayFromMapConfig.ts` | The map-level overlay every layer query reads |
| `src/views/GisApp/layers/useMapLayerRendering.ts` | Load layer data and derive the map spec (shared by GIS and `MapViewer`) |
| `src/views/GisApp/useGisApp/MapSourceHydration/useHydratedMapSources/useHydratedMapConfig.ts` | Hydrate a config from workspace column metadata, no editor needed |
| `src/views/GisApp/MapViewer/MapViewer.types.ts` | `MapViewerSource`, `MapViewerCamera`, `MapViewerDisplay` |
| `src/views/GisApp/MapViewer/MapViewer.tsx` | Picks live or snapshot mode |
| `src/views/GisApp/MapViewer/LiveMapViewer.tsx` | Resolves the map, shows no-access |
| `src/views/GisApp/MapViewer/LiveMapViewerContent.tsx` | Draws a live map |
| `src/views/GisApp/MapViewer/useLiveMapViewerState.ts` | Live hydration, rendering, in-memory legends, dataset access |
| `src/views/GisApp/MapViewer/SnapshotMapViewer.tsx` | Downloads a snapshot |
| `src/views/GisApp/MapViewer/SnapshotMapViewerContent.tsx` | Draws a snapshot with no DuckDB |
| `src/views/GisApp/MapViewer/MapViewerFrame.tsx` | Canvas, legend, popup, furniture |
| `src/views/GisApp/MapViewer/MapViewerLegend.tsx` | Legend over the canvas |
| `src/views/GisApp/MapViewer/MapViewerPopupCard.tsx` | Clicked feature's popup columns |
| `src/views/GisApp/MapViewer/MapViewerFurniture.tsx` | Attribution, plus disclaimer when a disputed boundary is drawn |
| `src/views/GisApp/MapViewer/MapViewerState.tsx` | Loading, no access, missing snapshot |
| `src/views/GisApp/MapViewer/MapViewer.module.css` | Viewer layout |
| `src/views/GisApp/MapViewer/MapViewer.test.tsx` | Live, snapshot, no access, disclaimer |
| `src/views/GisApp/MapViewer/mapViewerCameraToViewState/mapViewerCameraToViewState.ts` (+ `.test.ts`) | Saved view or bookmark to a camera |
| `src/views/GisApp/MapViewer/getMapViewerPopupFromClick/getMapViewerPopupFromClick.ts` (+ `.test.ts`) | Popup rows from a clicked feature |
| `src/views/GisApp/MapViewer/createSnapshotLayerQueryStates/createSnapshotLayerQueryStates.ts` (+ `.test.ts`) | Snapshot layers as render query states |
| `src/views/GisApp/MapViewer/useMapInteractionMode/useMapInteractionMode.ts` (+ `.test.ts`) | Pan and zoom on or off |
| `src/views/GisApp/export/AddMapToDashboardModal/AddMapToDashboardModal.tsx` (+ `.test.tsx`) | Pick or create a dashboard for this map |
| `src/views/GisApp/export/AddMapToDashboardModal/useAddMapToDashboard.tsx` | The insert and update mutations plus the toast |
| `src/views/GisApp/export/AddMapToDashboardModal/MapPBlockDashboardConfigs/MapPBlockDashboardConfigs.ts` (+ `.test.ts`) | Build a map block and add it to page data |
| `src/views/DashboardApp/AvaPage/pblocks/MapPBlock/MapPBlock.tsx` (+ `.test.tsx`) | The dashboard block |
| `src/views/DashboardApp/AvaPage/pblocks/MapPBlock/MapPBlockEmptyState.tsx` | Block with no map picked |
| `src/views/DashboardApp/AvaPage/pblocks/MapPBlock/useMapPBlockConfig.tsx` | Puck component config |
| `src/views/DashboardApp/AvaPage/pblocks/MapPBlock/parseMapPBlockSettings/parseMapPBlockSettings.ts` (+ `.test.ts`) | Block props schema and defaults |
| `src/views/DashboardApp/AvaPage/pblocks/MapPBlock/createMapViewerSourceFromMetadata/createMapViewerSourceFromMetadata.ts` (+ `.test.ts`) | Surface to live or snapshot |
| `src/views/DashboardApp/AvaPage/pfields/MapPickerPField/MapPickerPField.tsx` | Map picker field |
| `src/views/DashboardApp/AvaPage/pfields/MapViewPField/MapViewPField.tsx` | Saved view or bookmark field |
| `src/views/DashboardApp/DashboardShareModal/DashboardMapAudienceAlert/DashboardMapAudienceAlert.tsx` (+ `.test.tsx`) | Share modal warning |
| `src/views/DashboardApp/DashboardShareModal/DashboardMapAudienceAlert/useLimitedAudienceMapNames.ts` | Maps some recipients cannot open |
| `src/views/DashboardApp/DashboardShareModal/DashboardMapAudienceAlert/getLimitedAudienceMapNames/getLimitedAudienceMapNames.ts` (+ `.test.ts`) | Pure audience rule |
| `src/views/DashboardApp/DashboardShareModal/PublishMapLayersPreview/PublishMapLayersPreview.tsx` | Publish preview of map layers |
| `src/views/DashboardApp/DashboardShareModal/PublishMapLayersPreview/PublishMapLayersList.tsx` | One map's layers and counts |
| `tests/e2e/dashboard-map-block.spec.ts` | Export sheet to dashboard, member view, publish, signed-out view |

Modified:

| File | Change |
| --- | --- |
| `supabase/schemas/16.utils.resource-permissions.sql` (lines 1224-1251, 1270-1292) | Path parsers accept `revisions/<rev>/maps/<mapId>.json` |
| `src/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils.ts` (+ test) | Map snapshot path and folder helpers |
| `src/clients/storage/PublicDatasetParquetStorageClient/PublicDatasetParquetStorageClient.ts` (`_deleteSnapshotGeneration`, ~line 340) | A generation delete also removes its map snapshots |
| `src/clients/storage/PublicDatasetParquetStorageClient/__tests__/PublicDatasetParquetStorageClient.fixtures.ts` + `.cleanup.test.ts` | Empty-folder default listing; map cleanup test |
| `src/views/GisApp/layers/MapLayerDataResult.types.ts` | `snapshot` data variant |
| `src/views/GisApp/layers/useAvaMapRender/makeLayerRender.ts` (+ `useAvaMapRender.test.ts`) | Reads snapshot data, returns `featureCollection` |
| `src/views/GisApp/layers/PersistedLayerLegends/PersistedLayerLegends.ts` (+ test) | Pure `withLegendUpdates` |
| `src/views/GisApp/layers/useMapLayersData/useMapLayersData.ts` | Calls `runMapLayerQuery` |
| `src/views/GisApp/useGisApp/useGisAppRendering.ts` | Delegates to `useMapLayerRendering` |
| `src/views/GisApp/useGisApp/MapSourceHydration/useHydratedMapSources/useHydratedMapSources.ts` | Delegates to `useHydratedMapConfig` |
| `src/clients/dashboards/DashboardClient/publishDashboard.ts` | Compiles and uploads map snapshots |
| `src/clients/dashboards/DashboardClient/__tests__/DashboardClient.transitions.fixtures.ts` | Mocks the map snapshot helpers |
| `src/views/DashboardApp/AvaPage/AvaPage.types.ts` | `Map` in `PBlockPropsRegistry` |
| `src/views/DashboardApp/DashboardEditorView/useDashboardPuckConfig/useDashboardPuckConfig.tsx` | Registers the Map block |
| `src/views/GisApp/export/ExportSheet/ExportSheet.tsx` (+ test) | "Add to dashboard" in the footer |
| `src/views/GisApp/GisAppMapShell.tsx` | Opens the add-to-dashboard modal |
| `src/views/DashboardApp/DashboardShareModal/PublishingSection.tsx` (+ test) | Alert and map preview |
| `src/i18n/locales/*/messages.po` | Generated by `pnpm i18n:extract` |
| `docs/measles-demo/pr-feature-log.md` | F5 entry |

No `AvaPage` migration: adding a block type is additive, and no saved page holds a `Map` block yet.

---

## Task 0: Workspace

**Files:** none.

- [ ] **Step 1: Create the worktree.** Load the `using-wt` skill, then:

```bash
wt new feat/dashboard-map-block demo/measles
```

- [ ] **Step 2: Isolate the local database.** This plan changes two functions, so it needs its own stack before any `pnpm db:*` command:

```bash
ava supabase status
```

If the first line does not name this branch's own project (it says `This is the develop local Supabase` instead), run:

```bash
ava supabase switch
ava supabase status
```

Do not continue until status names `feat-dashboard-map-block`. If `ava` is missing, run `pnpm build:ava-cli` first. Load the `supabase-declarative-schema` skill now; Task 1 follows it.

- [ ] **Step 3: Confirm the test runner.**

```bash
pnpm vitest run src/views/GisApp/layers/classifyLayerValues
```

Expected: all tests pass.

- [ ] **Step 4 (optional, manual QA only):** load the Workflow B listings with the mirror-catalog scripts (ask Pablo for the folder): `REPO=$PWD bash <mirror-catalog>/load-local.sh`. Unit and e2e tests in this plan do not need them.

---

## Task 1: Snapshot storage paths accept map snapshots

**Files:**
- Modify: `supabase/schemas/16.utils.resource-permissions.sql:1224-1251` and `:1270-1292`
- Create: `supabase/tests/database/dashboards/storage_map_snapshot_paths.test.sql`
- Create (generated): `supabase/migrations/<timestamp>_dashboard_map_snapshot_paths.sql`

- [ ] **Step 1: Write the failing pgTAP test.** Create `supabase/tests/database/dashboards/storage_map_snapshot_paths.test.sql`:

```sql
\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

-- A public dashboard's map is published as one JSON file per map, named
-- `dashboards/<dashboardId>/revisions/<revision>/maps/<mapId>.json`, in the
-- same snapshot buckets as its datasets. The path parsers decide which
-- dashboard and generation every storage policy checks, so they are what has
-- to recognise the name.
select plan(8);

select is(
  public.util__storage_object_dashboard_id (
    'dashboards/f5004001-0000-4000-8000-000000000001/revisions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/maps/f5008001-0000-4000-8000-000000000001.json'
  ),
  'f5004001-0000-4000-8000-000000000001'::uuid,
  'extracts the dashboard id from a map snapshot path'
);

select is(
  public.util__storage_object_snapshot_revision (
    'dashboards/f5004001-0000-4000-8000-000000000001/revisions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/maps/f5008001-0000-4000-8000-000000000001.json'
  ),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
  'extracts the revision from a map snapshot path'
);

select is(
  public.util__storage_object_dashboard_id (
    'dashboards/f5004001-0000-4000-8000-000000000001/maps/f5008001-0000-4000-8000-000000000001.json'
  ),
  null::uuid,
  'rejects a map snapshot outside a revision folder'
);

select is(
  public.util__storage_object_snapshot_revision (
    'dashboards/f5004001-0000-4000-8000-000000000001/revisions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/maps/f5008001-0000-4000-8000-000000000001.parquet'
  ),
  null::uuid,
  'rejects a map snapshot that is not JSON'
);

select is(
  public.util__storage_object_dashboard_id (
    'dashboards/f5004001-0000-4000-8000-000000000001/revisions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/maps/not-a-map.json'
  ),
  null::uuid,
  'rejects a malformed map id'
);

insert into auth.users (id, email, aud, role)
values
  ('f5000001-0000-4000-8000-000000000001'::uuid, 'f5_owner@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values (
  'f5001001-0000-4000-8000-000000000001'::uuid,
  'f5000001-0000-4000-8000-000000000001'::uuid,
  'F5 workspace',
  'f5-map-snapshot-paths'
);

insert into public.role_groups (id, workspace_id, name, is_builtin)
values ('f500cf01-0000-4000-8000-000000000001'::uuid, 'f5001001-0000-4000-8000-000000000001'::uuid, 'F5 admin', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values ('f500cf01-0000-4000-8000-000000000001'::uuid, 'dashboards'::public.app_type, 'admin'::public.role_level);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values (
  'f5002001-0000-4000-8000-000000000001'::uuid,
  'f5001001-0000-4000-8000-000000000001'::uuid,
  'f5000001-0000-4000-8000-000000000001'::uuid,
  'f500cf01-0000-4000-8000-000000000001'::uuid
);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values (
  'f5003001-0000-4000-8000-000000000001'::uuid,
  'f5000001-0000-4000-8000-000000000001'::uuid,
  'f5001001-0000-4000-8000-000000000001'::uuid,
  'f5002001-0000-4000-8000-000000000001'::uuid,
  'F5 Owner',
  'F5 Owner'
);

insert into public.dashboards (
  id, workspace_id, owner_id, owner_profile_id, name, config, visibility,
  is_restricted, snapshot_revision
)
values (
  'f5004001-0000-4000-8000-000000000001'::uuid,
  'f5001001-0000-4000-8000-000000000001'::uuid,
  'f5000001-0000-4000-8000-000000000001'::uuid,
  'f5003001-0000-4000-8000-000000000001'::uuid,
  'F5 public dashboard',
  '{}'::jsonb,
  'public'::public.dashboard_visibility,
  false,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid
);

insert into storage.buckets (id, name, public)
values ('published', 'published', false)
on conflict (id) do nothing;

insert into storage.objects (bucket_id, name, owner)
values
  (
    'published',
    'dashboards/f5004001-0000-4000-8000-000000000001/revisions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/maps/f5008001-0000-4000-8000-000000000001.json',
    'f5000001-0000-4000-8000-000000000001'::uuid
  ),
  (
    'published',
    'dashboards/f5004001-0000-4000-8000-000000000001/revisions/cccccccc-cccc-4ccc-8ccc-ccccccccccc1/maps/f5008001-0000-4000-8000-000000000001.json',
    'f5000001-0000-4000-8000-000000000001'::uuid
  );

-- Anonymous visitors read only the committed generation --------------------

set local role anon;

select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published'
      and name = 'dashboards/f5004001-0000-4000-8000-000000000001/revisions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/maps/f5008001-0000-4000-8000-000000000001.json'
  ),
  1,
  'an anonymous visitor can read the committed map snapshot of a public dashboard'
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published'
      and name = 'dashboards/f5004001-0000-4000-8000-000000000001/revisions/cccccccc-cccc-4ccc-8ccc-ccccccccccc1/maps/f5008001-0000-4000-8000-000000000001.json'
  ),
  0,
  'an anonymous visitor cannot read a map snapshot from another generation'
);

reset role;

-- An admin with an open public publish claim can stage a map snapshot -----

update public.dashboards
set
  snapshot_transition_kind = 'publish',
  snapshot_transition_revision = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  snapshot_transition_prior_revision = snapshot_revision,
  snapshot_transition_prior_visibility = visibility,
  snapshot_transition_target_visibility = 'public'::public.dashboard_visibility
where id = 'f5004001-0000-4000-8000-000000000001'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"f5000001-0000-4000-8000-000000000001"}',
  true
);

select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'published',
      'dashboards/f5004001-0000-4000-8000-000000000001/revisions/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1/maps/f5008001-0000-4000-8000-000000000001.json'
    )$$,
  'a dashboards admin with an open public claim can stage a map snapshot'
);

reset role;

select * from finish();

rollback;
```

- [ ] **Step 2: Run it and watch it fail.**

```bash
ava supabase status   # must name feat-dashboard-map-block
supabase test db supabase/tests/database/dashboards/storage_map_snapshot_paths.test.sql
```

Expected: FAIL on tests 1, 2, 6, and 8 (`got: NULL`, a count of 0, and an RLS `new row violates row-level security policy`).

- [ ] **Step 3: Replace both parsers in the declarative schema.** In `supabase/schemas/16.utils.resource-permissions.sql`, replace the docstring and body of `util__storage_object_dashboard_id` (lines 1224-1251) with:

```sql
/**
 * Extracts a dashboard UUID from a published snapshot object path.
 *
 * Versioned snapshot objects are named
 * `dashboards/<dashboardId>/revisions/<revision>/datasets/<datasetId>.parquet`
 * for a dataset and
 * `dashboards/<dashboardId>/revisions/<revision>/maps/<mapId>.json` for a
 * map's rendered output. Legacy objects use
 * `dashboards/<dashboardId>/datasets/<datasetId>.parquet`. Map snapshots have
 * no legacy form.
 *
 * Returns NULL for any name that does not match that shape, including a
 * non-UUID id segment. NULL is DENY in the storage policies that call this:
 * an object whose dashboard cannot be identified is not one we can prove the
 * caller may read. Returning NULL rather than casting blindly also keeps a
 * malformed upload a policy denial instead of a storage error.
 *
 * @param p_object_name The `storage.objects.name` value.
 * @returns The dashboard UUID, or NULL when the path is not a snapshot path.
 */
create or replace function public.util__storage_object_dashboard_id (p_object_name text) returns uuid language sql immutable
set
  search_path = public as $$
  select case
    when p_object_name ~
      '^dashboards/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/revisions/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/datasets/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.parquet$'
      or p_object_name ~
      '^dashboards/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/revisions/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/maps/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.json$'
      or p_object_name ~
      '^dashboards/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/datasets/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.parquet$'
    then split_part(p_object_name, '/', 2)::uuid
    else null
  end;
$$;
```

Then replace the docstring and body of `util__storage_object_snapshot_revision` (lines 1270-1292) with:

```sql
/**
 * Extracts a revision UUID from an exact published snapshot object path.
 *
 * Accepts a revisioned dataset Parquet or a revisioned map JSON. Exact legacy
 * dataset paths map to the all-zero UUID reserved for the legacy generation.
 * Returns NULL for malformed or extended paths so storage policies fail closed
 * instead of authorizing an object whose generation is ambiguous.
 *
 * @param p_object_name The `storage.objects.name` value.
 * @returns The snapshot revision, or NULL when the path is not exact.
 */
create or replace function public.util__storage_object_snapshot_revision (p_object_name text) returns uuid language sql immutable
set
  search_path = public as $$
  select case
    when p_object_name ~
      '^dashboards/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/revisions/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/datasets/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.parquet$'
      or p_object_name ~
      '^dashboards/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/revisions/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/maps/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.json$'
    then split_part(p_object_name, '/', 4)::uuid
    when p_object_name ~
      '^dashboards/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/datasets/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.parquet$'
    then '00000000-0000-0000-0000-000000000000'::uuid
    else null
  end;
$$;
```

Leave the `revoke` and `grant` statements after each function untouched; `create or replace` keeps them.

- [ ] **Step 4: Generate the migration.** Per the `supabase-declarative-schema` skill, reset immediately before diffing:

```bash
ava supabase status   # must name feat-dashboard-map-block
pnpm db:reset
pnpm db:new-migration dashboard_map_snapshot_paths
```

Open the generated `supabase/migrations/<timestamp>_dashboard_map_snapshot_paths.sql`. It must contain exactly the two `create or replace function` statements. A `drop` of anything is the shared-stack bug: stop, re-check `ava supabase status`, reset, and regenerate.

- [ ] **Step 5: Apply and run.**

```bash
pnpm db:reset
supabase test db supabase/tests/database/dashboards/storage_map_snapshot_paths.test.sql
supabase test db supabase/tests/database/dashboards/storage_snapshot_generations.test.sql
supabase test db supabase/tests/database/dashboards/storage_published_buckets.test.sql
```

Expected: all three files PASS. `pnpm db:gen-types` is not needed: no signature changed.

- [ ] **Step 6: Commit.**

```bash
git add supabase/schemas/16.utils.resource-permissions.sql supabase/migrations/*_dashboard_map_snapshot_paths.sql supabase/tests/database/dashboards/storage_map_snapshot_paths.test.sql
git commit -m "feat(dashboards): accept map snapshot paths in the snapshot buckets"
```

---

## Task 2: The map snapshot file

**Files:**
- Create: `src/clients/maps/MapSnapshot/MapSnapshot.types.ts`
- Create: `src/clients/maps/MapSnapshot/MapSnapshotJson/MapSnapshotJson.ts`, `MapSnapshotJson.test.ts`
- Create: `src/clients/maps/MapSnapshot/createPublicMapConfigFromMapConfig/createPublicMapConfigFromMapConfig.ts`, `createPublicMapConfigFromMapConfig.test.ts`

- [ ] **Step 1: Write the types.** `src/clients/maps/MapSnapshot/MapSnapshot.types.ts`:

```ts
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { PointAggregation } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/PointAggregate.types";

/**
 * One layer of a published map: the features a viewer would draw, with the
 * layer's sensitivity policy already applied and its properties cut to what
 * its popup and paint read.
 */
export type MapSnapshotLayer = {
  layerId: MapLayer.Id;
  featureCollection: GeoJSON.FeatureCollection;

  /** Set when DuckDB aggregated the layer's points into cells. */
  aggregation: PointAggregation | undefined;
};

/**
 * A map's rendered output, frozen when a dashboard is published to the web.
 * A public page draws it without DuckDB and without the map's datasets.
 */
export type MapSnapshot = {
  version: 1;
  mapId: AvaMap.Id;
  mapName: string;

  /** The map's config with every layer's source query stripped. */
  config: AvaMapConfig.T;
  layers: readonly MapSnapshotLayer[];
};
```

- [ ] **Step 2: Write the failing JSON test.** `src/clients/maps/MapSnapshot/MapSnapshotJson/MapSnapshotJson.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { MapSnapshotJson } from "@/clients/maps/MapSnapshot/MapSnapshotJson/MapSnapshotJson";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";

const SCHOOLS_LAYER = MapLayer.makeEmpty("Schools");

const SNAPSHOT: MapSnapshot = {
  version: 1,
  mapId: "00000000-0000-4000-8000-0000000000f5" as AvaMap.Id,
  mapName: "Coverage risk",
  config: AvaMapConfig.withLayerAdded({
    config: AvaMapConfig.makeEmpty(),
    layer: SCHOOLS_LAYER,
  }),
  layers: [
    {
      layerId: SCHOOLS_LAYER.id,
      featureCollection: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            id: 0,
            geometry: { type: "Point", coordinates: [-73.98, 40.75] },
            properties: { school_name: "PS 11" },
          },
        ],
      },
      aggregation: undefined,
    },
  ],
};

describe("MapSnapshotJson", () => {
  it("reads back the features and layer names it wrote", () => {
    const restored = MapSnapshotJson.fromJson(MapSnapshotJson.toJson(SNAPSHOT));

    expect(restored.layers[0]?.featureCollection).toEqual(
      SNAPSHOT.layers[0]?.featureCollection,
    );
    expect(restored.config.layers.map(MapLayer.toPopupColumnNames)).toEqual([
      "all",
    ]);
    expect(restored.config.layers[0]?.name).toBe("Schools");
  });

  it("keeps a layer's point aggregation", () => {
    const aggregation = {
      cellsAcross: 64,
      aggregatedRowCount: 12_000,
      didCoarsenGrid: false,
    };
    const snapshot: MapSnapshot = {
      ...SNAPSHOT,
      layers: [{ ...SNAPSHOT.layers[0]!, aggregation }],
    };

    expect(
      MapSnapshotJson.fromJson(MapSnapshotJson.toJson(snapshot)).layers[0]
        ?.aggregation,
    ).toEqual(aggregation);
  });

  it("rejects a layer whose features are not a FeatureCollection", () => {
    const tampered = JSON.parse(MapSnapshotJson.toJson(SNAPSHOT));
    tampered.layers[0].featureCollection = { type: "Feature" };

    expect(() => {
      return MapSnapshotJson.fromJson(JSON.stringify(tampered));
    }).toThrow();
  });
});
```

- [ ] **Step 3: Run it.** `pnpm vitest run src/clients/maps/MapSnapshot/MapSnapshotJson` Expected: FAIL, `Failed to resolve import ".../MapSnapshotJson"`.

- [ ] **Step 4: Implement.** `src/clients/maps/MapSnapshot/MapSnapshotJson/MapSnapshotJson.ts`:

```ts
import { isPlainObject } from "@avandar/utils";
import { z } from "zod";
import { uuidType } from "$/lib/zodHelpers";
import { AvaMapConfigSchema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";

const FeatureCollectionSchema = z.custom<GeoJSON.FeatureCollection>(
  (value) => {
    return (
      isPlainObject(value) &&
      value.type === "FeatureCollection" &&
      Array.isArray(value.features)
    );
  },
);

const PointAggregationSchema = z.object({
  cellsAcross: z.number(),
  aggregatedRowCount: z.number(),
  didCoarsenGrid: z.boolean(),
});

const MapSnapshotFileSchema = z.object({
  version: z.literal(1),
  mapId: uuidType<AvaMap.Id>(),
  mapName: z.string(),
  config: z.unknown(),
  layers: z.array(
    z.object({
      layerId: uuidType<MapLayer.Id>(),
      featureCollection: FeatureCollectionSchema,
      aggregation: PointAggregationSchema.optional(),
    }),
  ),
});

function _toJson(snapshot: Readonly<MapSnapshot>): string {
  return JSON.stringify({
    ...snapshot,
    config: AvaMapConfigSchema.toJson(snapshot.config),
  });
}

function _fromJson(text: string): MapSnapshot {
  const parsed = MapSnapshotFileSchema.parse(JSON.parse(text));
  return {
    version: parsed.version,
    mapId: parsed.mapId,
    mapName: parsed.mapName,
    config: AvaMapConfigSchema.fromJson(parsed.config),
    layers: parsed.layers.map((layer) => {
      return {
        layerId: layer.layerId,
        featureCollection: layer.featureCollection,
        aggregation: layer.aggregation,
      };
    }),
  };
}

/** Reads and writes the JSON file a published map snapshot is stored as. */
export const MapSnapshotJson = {
  /** Serializes a snapshot, its config through the map config schema. */
  toJson: _toJson,

  /** Validates a stored snapshot and migrates its config to the current one. */
  fromJson: _fromJson,
};
```

- [ ] **Step 5: Run it.** `pnpm vitest run src/clients/maps/MapSnapshot/MapSnapshotJson` Expected: 3 passed.

- [ ] **Step 6: Write the failing source-stripping test.** `src/clients/maps/MapSnapshot/createPublicMapConfigFromMapConfig/createPublicMapConfigFromMapConfig.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { createPublicMapConfigFromMapConfig } from "@/clients/maps/MapSnapshot/createPublicMapConfigFromMapConfig/createPublicMapConfigFromMapConfig";
import { createQueryableLayer } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData.fixtures";

describe("createPublicMapConfigFromMapConfig", () => {
  it("drops each layer's data source and filters but keeps its columns", () => {
    const layer = createQueryableLayer();
    const config = AvaMapConfig.withLayerAdded({
      config: AvaMapConfig.makeEmpty(),
      layer,
    });

    const publicLayer = createPublicMapConfigFromMapConfig(config).layers[0]!;

    expect(publicLayer.source.dataSource).toBeUndefined();
    expect(publicLayer.source.filters).toEqual(
      StructuredQuery.makeEmpty().filters,
    );
    expect(publicLayer.source.queryColumns).toEqual(layer.source.queryColumns);
    expect(publicLayer.geoBinding).toEqual(layer.geoBinding);
  });
});
```

- [ ] **Step 7: Run it.** `pnpm vitest run src/clients/maps/MapSnapshot/createPublicMapConfigFromMapConfig` Expected: FAIL, import not found.

- [ ] **Step 8: Implement.** `createPublicMapConfigFromMapConfig.ts`:

```ts
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

/**
 * Builds the config a public map page is drawn from. Each layer keeps its
 * styling, binding, legend, and query columns (the renderer resolves paint
 * and popup columns through them) but loses its data source, filters, and
 * joins, which name datasets and filter values the page has no reason to see.
 */
export function createPublicMapConfigFromMapConfig(
  config: Readonly<AvaMapConfig.T>,
): AvaMapConfig.T {
  return {
    ...config,
    layers: config.layers.map((layer) => {
      return {
        ...layer,
        source: {
          ...StructuredQuery.makeEmpty(),
          queryColumns: layer.source.queryColumns,
        },
      };
    }),
  };
}
```

- [ ] **Step 9: Run it.** Same command. Expected: 1 passed.

- [ ] **Step 10: Commit.**

```bash
git add src/clients/maps/MapSnapshot
git commit -m "feat(gis): define the published map snapshot file"
```

---

## Task 3: Map snapshot storage

**Files:**
- Modify: `src/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils.ts` (after `_getPublicDatasetParquetStoragePath`, and the exported object)
- Modify: `src/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils.test.ts`
- Create: `src/clients/storage/PublicMapSnapshotStorageClient/PublicMapSnapshotStorageClient.ts`, `PublicMapSnapshotStorageClient.test.ts`

- [ ] **Step 1: Failing path test.** Append to `SnapshotStorageUtils.test.ts`, and add `import type { AvaMap } from "$/models/AvaMap/AvaMap";` to its imports:

```ts
describe("map snapshot paths", () => {
  it("names a map snapshot inside its revision's maps folder", () => {
    expect(
      SnapshotStorageUtils.getPublicMapSnapshotStoragePath({
        dashboardId: DASHBOARD_ID,
        snapshotRevision: SNAPSHOT_REVISION,
        mapId: "44444444-4444-4444-8444-444444444444" as AvaMap.Id,
      }),
    ).toBe(
      `dashboards/${DASHBOARD_ID}/revisions/${SNAPSHOT_REVISION}/maps/44444444-4444-4444-8444-444444444444.json`,
    );
  });
});
```

Run: `pnpm vitest run src/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils` Expected: FAIL, `getPublicMapSnapshotStoragePath is not a function`.

- [ ] **Step 2: Implement the helpers.** In `SnapshotStorageUtils.ts`, add `import type { AvaMap } from "$/models/AvaMap/AvaMap";` and, after `_getPublicDatasetParquetStoragePath`:

```ts
/** Gets the folder holding one snapshot generation's map snapshots. */
function _getPublicMapSnapshotFolder(
  options: Readonly<{ dashboardId: Dashboard.Id; snapshotRevision: string }>,
): string {
  return `dashboards/${options.dashboardId}/revisions/${options.snapshotRevision}/maps`;
}

/**
 * Gets the object storage path for a published map snapshot. Maps were never
 * published before revision folders existed, so there is no legacy form.
 */
function _getPublicMapSnapshotStoragePath(
  options: Readonly<{
    dashboardId: Dashboard.Id;
    snapshotRevision: string;
    mapId: AvaMap.Id;
  }>,
): string {
  return `${_getPublicMapSnapshotFolder(options)}/${options.mapId}.json`;
}
```

and add to the exported `SnapshotStorageUtils` object:

```ts
  /** Gets the folder holding one generation's map snapshots. */
  getPublicMapSnapshotFolder: _getPublicMapSnapshotFolder,
  /** Gets the object path for a published map snapshot. */
  getPublicMapSnapshotStoragePath: _getPublicMapSnapshotStoragePath,
```

Run the same command. Expected: all pass.

- [ ] **Step 3: Failing client test.** `src/clients/storage/PublicMapSnapshotStorageClient/PublicMapSnapshotStorageClient.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapSnapshotJson } from "@/clients/maps/MapSnapshot/MapSnapshotJson/MapSnapshotJson";
import { PublicMapSnapshotStorageClient } from "@/clients/storage/PublicMapSnapshotStorageClient/PublicMapSnapshotStorageClient";
import { SnapshotStorageUtils } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";

const { downloadMock, listMock, removeMock, uploadMock } = vi.hoisted(() => {
  return {
    downloadMock: vi.fn(),
    listMock: vi.fn(),
    removeMock: vi.fn(),
    uploadMock: vi.fn(),
  };
});

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: () => {
        return {
          storage: {
            from: () => {
              return {
                download: downloadMock,
                list: listMock,
                remove: removeMock,
                upload: uploadMock,
              };
            },
          },
        };
      },
    },
  };
});

const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111" as Dashboard.Id;
const MAP_ID = "22222222-2222-4222-8222-222222222222" as AvaMap.Id;
const REVISION = "33333333-3333-4333-8333-333333333333";
const MAP_PATH = `dashboards/${DASHBOARD_ID}/revisions/${REVISION}/maps/${MAP_ID}.json`;
const GENERATION = {
  bucket: SnapshotStorageUtils.PUBLIC_BUCKET_NAME,
  dashboardId: DASHBOARD_ID,
  snapshotRevision: REVISION,
};
const SNAPSHOT: MapSnapshot = {
  version: 1,
  mapId: MAP_ID,
  mapName: "Coverage risk",
  config: AvaMapConfig.makeEmpty(),
  layers: [],
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("PublicMapSnapshotStorageClient", () => {
  it("uploads the serialized snapshot to its revision's maps folder", async () => {
    uploadMock.mockResolvedValue({ error: null });

    await PublicMapSnapshotStorageClient.uploadMapSnapshot({
      ...GENERATION,
      snapshot: SNAPSHOT,
    });

    const [objectPath, body] = uploadMock.mock.calls[0]!;
    expect(objectPath).toBe(MAP_PATH);
    expect(JSON.parse(await (body as Blob).text()).mapName).toBe(
      "Coverage risk",
    );
  });

  it("returns undefined when the generation has no snapshot for the map", async () => {
    downloadMock.mockResolvedValue({
      data: null,
      error: { message: "Object not found" },
    });

    await expect(
      PublicMapSnapshotStorageClient.downloadMapSnapshot({
        ...GENERATION,
        mapId: MAP_ID,
      }),
    ).resolves.toBeUndefined();
  });

  it("parses a downloaded snapshot", async () => {
    downloadMock.mockResolvedValue({
      data: new Blob([MapSnapshotJson.toJson(SNAPSHOT)]),
      error: null,
    });

    const snapshot = await PublicMapSnapshotStorageClient.downloadMapSnapshot({
      ...GENERATION,
      mapId: MAP_ID,
    });

    expect(snapshot?.mapName).toBe("Coverage risk");
  });

  it("removes a generation's map snapshots after the delete check passes", async () => {
    const assertCanDelete = vi.fn().mockResolvedValue(undefined);
    listMock.mockResolvedValue({
      data: [{ name: `${MAP_ID}.json` }],
      error: null,
    });
    removeMock.mockResolvedValue({ data: [{ name: MAP_PATH }], error: null });

    await PublicMapSnapshotStorageClient.deleteMapSnapshotsForGeneration({
      ...GENERATION,
      assertCanDelete,
    });

    expect(assertCanDelete).toHaveBeenCalledOnce();
    expect(removeMock).toHaveBeenCalledWith([MAP_PATH]);
  });

  it("does not look for map snapshots in the legacy generation", async () => {
    await PublicMapSnapshotStorageClient.deleteMapSnapshotsForGeneration({
      ...GENERATION,
      snapshotRevision: SnapshotStorageUtils.LEGACY_SNAPSHOT_REVISION,
    });

    expect(listMock).not.toHaveBeenCalled();
  });
});
```

Run: `pnpm vitest run src/clients/storage/PublicMapSnapshotStorageClient` Expected: FAIL, import not found.

- [ ] **Step 4: Implement.** `src/clients/storage/PublicMapSnapshotStorageClient/PublicMapSnapshotStorageClient.ts`:

```ts
import { MIMEType } from "@avandar/utils";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import { MapSnapshotJson } from "@/clients/maps/MapSnapshot/MapSnapshotJson/MapSnapshotJson";
import { SnapshotStorageUtils } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";
import type { SnapshotBucketName } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";

/** One snapshot generation in one bucket. */
type SnapshotGeneration = {
  bucket: SnapshotBucketName;
  dashboardId: Dashboard.Id;
  snapshotRevision: string;
};

/**
 * Page size for listing a generation's maps. A dashboard shows a handful of
 * maps, so one page always covers them.
 */
const MAP_LIST_PAGE_SIZE = 1000;

async function _uploadMapSnapshot(
  options: Readonly<SnapshotGeneration & { snapshot: MapSnapshot }>,
): Promise<void> {
  const objectPath = SnapshotStorageUtils.getPublicMapSnapshotStoragePath({
    dashboardId: options.dashboardId,
    snapshotRevision: options.snapshotRevision,
    mapId: options.snapshot.mapId,
  });
  const body = new Blob([MapSnapshotJson.toJson(options.snapshot)], {
    type: MIMEType.APPLICATION_JSON,
  });
  const { error } = await AvaSupabase.db()
    .storage.from(options.bucket)
    .upload(objectPath, body, {
      contentType: MIMEType.APPLICATION_JSON,
      upsert: true,
    });
  if (error) {
    throw new Error(error.message);
  }
}

async function _downloadMapSnapshot(
  options: Readonly<SnapshotGeneration & { mapId: AvaMap.Id }>,
): Promise<MapSnapshot | undefined> {
  const objectPath = SnapshotStorageUtils.getPublicMapSnapshotStoragePath(
    options,
  );
  const { data, error } = await AvaSupabase.db()
    .storage.from(options.bucket)
    .download(objectPath);
  if (error || !data) {
    return undefined;
  }
  return MapSnapshotJson.fromJson(await data.text());
}

async function _listMapSnapshotPaths(
  options: Readonly<SnapshotGeneration>,
): Promise<string[]> {
  const folderPath = SnapshotStorageUtils.getPublicMapSnapshotFolder(options);
  const { data, error } = await AvaSupabase.db()
    .storage.from(options.bucket)
    .list(folderPath, {
      limit: MAP_LIST_PAGE_SIZE,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? [])
    .filter((file) => {
      return file.name.endsWith(".json");
    })
    .map((file) => {
      return `${folderPath}/${file.name}`;
    });
}

async function _deleteMapSnapshotsForGeneration(
  options: Readonly<
    SnapshotGeneration & { assertCanDelete?: () => Promise<void> }
  >,
): Promise<void> {
  if (options.snapshotRevision === SnapshotStorageUtils.LEGACY_SNAPSHOT_REVISION) {
    return;
  }
  const objectPaths = await _listMapSnapshotPaths(options);
  if (objectPaths.length === 0) {
    return;
  }
  await options.assertCanDelete?.();
  const { error } = await AvaSupabase.db()
    .storage.from(options.bucket)
    .remove(objectPaths);
  if (error) {
    throw new Error(
      `Failed to clear map snapshots from ${options.bucket} for dashboard ${options.dashboardId}: ${error.message}`,
    );
  }
}

/** Stores the rendered map files a public dashboard snapshot carries. */
export const PublicMapSnapshotStorageClient = {
  /** Writes one map snapshot into a staged generation. */
  uploadMapSnapshot: _uploadMapSnapshot,

  /** Reads one map snapshot, or `undefined` when the generation has none. */
  downloadMapSnapshot: _downloadMapSnapshot,

  /** Removes every map snapshot in one generation. */
  deleteMapSnapshotsForGeneration: _deleteMapSnapshotsForGeneration,
};
```

Run: `pnpm vitest run src/clients/storage/PublicMapSnapshotStorageClient` Expected: 5 passed.

- [ ] **Step 5: Commit.**

```bash
git add src/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils src/clients/storage/PublicMapSnapshotStorageClient
git commit -m "feat(dashboards): store map snapshots beside published datasets"
```

---

## Task 4: Deleting a generation also deletes its map snapshots

**Files:**
- Modify: `src/clients/storage/PublicDatasetParquetStorageClient/PublicDatasetParquetStorageClient.ts` (`_deleteSnapshotGeneration`)
- Modify: `src/clients/storage/PublicDatasetParquetStorageClient/__tests__/PublicDatasetParquetStorageClient.fixtures.ts`
- Test: `src/clients/storage/PublicDatasetParquetStorageClient/__tests__/PublicDatasetParquetStorageClient.cleanup.test.ts`

Every cleanup path (post-commit prior generation, aborted publish, unpublish, delete) goes through `_deleteSnapshotGeneration`, so map files are removed with no change to the transition code.

- [ ] **Step 1: Make unlisted folders read as empty in the fixture.** In the fixtures' `vi.hoisted` block, replace `const mockedList = vi.fn();` with:

```ts
    // A folder no scenario mentions lists as empty, so a generation delete
    // that also looks in the maps folder finds nothing there by default.
    const mockedList = vi.fn(async () => {
      return { data: [], error: null };
    });
```

- [ ] **Step 2: Failing test.** Append inside the `describe` of `PublicDatasetParquetStorageClient.cleanup.test.ts`:

```ts
  it("removes a generation's map snapshots along with its datasets", async () => {
    const mapPath = `dashboards/${DASHBOARD_ID}/revisions/${OLD_SNAPSHOT_REVISION}/maps/66666666-6666-4666-8666-666666666666.json`;
    listMock.mockImplementation(async (folderPath: string) => {
      if (folderPath.endsWith("/datasets")) {
        return { data: [{ name: `${DATASET_ID}.parquet` }], error: null };
      }
      if (folderPath.endsWith("/maps")) {
        return {
          data: [{ name: "66666666-6666-4666-8666-666666666666.json" }],
          error: null,
        };
      }
      return { data: [], error: null };
    });
    configureSuccessfulRemove();

    await PublicDatasetParquetStorageClient.deleteSnapshotGeneration({
      bucket: SnapshotStorageUtils.PUBLIC_BUCKET_NAME,
      dashboardId: DASHBOARD_ID,
      snapshotRevision: OLD_SNAPSHOT_REVISION,
    });

    expect(removeMock).toHaveBeenCalledWith([mapPath]);
  });
```

Run: `pnpm vitest run src/clients/storage/PublicDatasetParquetStorageClient` Expected: the new test FAILS (`removeMock` never received the map path); the rest pass.

- [ ] **Step 3: Implement.** In `PublicDatasetParquetStorageClient.ts`, add `import { PublicMapSnapshotStorageClient } from "@/clients/storage/PublicMapSnapshotStorageClient/PublicMapSnapshotStorageClient";` and replace `_deleteSnapshotGeneration` with:

```ts
/** Removes one immutable snapshot generation: its datasets and its maps. */
async function _deleteSnapshotGeneration(
  options: Readonly<DeleteSnapshotGenerationOptions>,
): Promise<void> {
  const datasetIds = await _listDatasetIdsForDashboard(options);
  await _deleteDatasets({ ...options, datasetIds });
  await PublicMapSnapshotStorageClient.deleteMapSnapshotsForGeneration(options);
}
```

- [ ] **Step 4: Run.** Same command. Expected: every test in the folder passes.

- [ ] **Step 5: Commit.**

```bash
git add src/clients/storage/PublicDatasetParquetStorageClient
git commit -m "feat(dashboards): clear map snapshots with their snapshot generation"
```

---

## Task 5: One layer query, callable outside React

Pure refactor: the existing `useMapLayersData` tests are the guard.

**Files:**
- Create: `src/views/GisApp/layers/useMapLayersData/runMapLayerQuery.ts`
- Create: `src/views/GisApp/layers/createMapOverlayFromMapConfig.ts`
- Modify: `src/views/GisApp/layers/useMapLayersData/useMapLayersData.ts`

- [ ] **Step 1: Baseline.** `pnpm vitest run src/views/GisApp/layers/useMapLayersData` Expected: all pass. Note the count.

- [ ] **Step 2: Create `runMapLayerQuery.ts`.**

```ts
import { makeIdLookupMap } from "@avandar/utils";
import { compileMapLayerSpatialQuery } from "@/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery";
import { getResolvedMapLayerMetadata } from "@/clients/maps/MapLayerSpatialQuery/getResolvedMapLayerMetadata/getResolvedMapLayerMetadata";
import { parseMapLayerSpatialResult } from "@/clients/maps/MapLayerSpatialQuery/parseMapLayerSpatialResult/parseMapLayerSpatialResult";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { runLatLngLayer } from "./runLatLngLayer";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { MapOverlay } from "@/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types";
import type { MapLayerDataResult } from "@/views/GisApp/layers/MapLayerDataResult.types";

/** Everything a layer query reads besides the layer itself. */
export type MapLayerQueryContext = {
  /** The whole layer stack, which buffer layers resolve their source from. */
  stack: readonly MapLayer.T[];
  workspaceId: Workspace.Id;
  zoomBand: number;
  simplificationReferenceLatitude: number;
  datasets: readonly Dataset.T[];
  datasetColumns: readonly DatasetColumn.T[];
  overlay: MapOverlay;
};

/** True when a layer's geometry comes from DuckDB Spatial rather than rows. */
export function isSpatialMapLayerBinding(layer: MapLayer.T): boolean {
  return (
    layer.geoBinding !== undefined && layer.geoBinding.type !== "latLngColumns"
  );
}

/** Walks bufferOfLayer links to the layer whose metadata should compile. */
function _getLeafSpatialSource(
  layer: MapLayer.T,
  stack: readonly MapLayer.T[],
): MapLayer.T {
  const byId = makeIdLookupMap(stack);
  const seen = new Set<MapLayer.Id>();
  let current = layer;
  while (current.geoBinding?.type === "bufferOfLayer") {
    if (seen.has(current.id)) {
      return current;
    }
    seen.add(current.id);
    const source = byId.get(current.geoBinding.layerId);
    if (!source) {
      return current;
    }
    current = source;
  }
  return current;
}

/** Compiles, executes, and parses one spatial layer. */
async function _runSpatialLayer(
  options: Readonly<{
    layer: MapLayer.T;
    context: MapLayerQueryContext;
    signal: AbortSignal | undefined;
  }>,
): Promise<MapLayerDataResult> {
  const { layer, context } = options;
  const metadata = getResolvedMapLayerMetadata({
    layer: _getLeafSpatialSource(layer, context.stack),
    datasets: context.datasets,
    datasetColumns: context.datasetColumns,
  });
  if (metadata.type === "rebindRequired") {
    throw new Error(`Map geometry requires rebinding: ${metadata.reason}`);
  }
  const plan = compileMapLayerSpatialQuery({
    layer,
    metadata,
    zoomBand: context.zoomBand,
    simplificationReferenceLatitude: context.simplificationReferenceLatitude,
    overlay: context.overlay,
    stack: context.stack,
  });
  const queryResult = await WorkspaceQuerySession.runQuery({
    rawSql: plan.rawSql,
    workspaceId: context.workspaceId,
    signal: options.signal,
  });
  return {
    type: "spatial",
    ...parseMapLayerSpatialResult({ queryResult, family: plan.family }),
  };
}

/**
 * Runs one map layer's query exactly the way the map draws it: a spatial
 * binding through DuckDB Spatial, anything else through the lat/lng path.
 * Used by `useMapLayersData` and by the publish-time map compiler.
 */
export async function runMapLayerQuery(
  options: Readonly<{
    layer: MapLayer.T;
    context: MapLayerQueryContext;
    signal?: AbortSignal;
  }>,
): Promise<MapLayerDataResult> {
  if (isSpatialMapLayerBinding(options.layer)) {
    return await _runSpatialLayer({ ...options, signal: options.signal });
  }
  return await runLatLngLayer({
    layer: options.layer,
    workspaceId: options.context.workspaceId,
    overlay: options.context.overlay,
    zoomBand: options.context.zoomBand,
    signal: options.signal,
  });
}
```

- [ ] **Step 3: Rewire `useMapLayersData.ts`.**
  1. Delete `RunSpatialLayerOptions`, `_isSpatialBinding`, `_getLeafSpatialSource`, and `_runSpatialLayer`.
  2. Replace the imports of `makeIdLookupMap`, `compileMapLayerSpatialQuery`, `getResolvedMapLayerMetadata`, `parseMapLayerSpatialResult`, `WorkspaceQuerySession`, and `runLatLngLayer` with `import { isSpatialMapLayerBinding, runMapLayerQuery } from "./runMapLayerQuery";`.
  3. Replace every `_isSpatialBinding(layer)` call (in `_layerNeedsSpatial` and in `placeholderData`) with `isSpatialMapLayerBinding(layer)`.
  4. Replace the `queryFn` in `_createLayerQuery` with:

```ts
    queryFn: async ({ signal }): Promise<MapLayerDataResult> => {
      return await runMapLayerQuery({
        layer,
        context: {
          stack: context.layers,
          workspaceId: context.workspaceId,
          zoomBand: context.zoomBand,
          simplificationReferenceLatitude:
            context.simplificationReferenceLatitude,
          datasets: context.datasets,
          datasetColumns: context.datasetColumns,
          overlay: context.overlay,
        },
        signal,
      });
    },
```

- [ ] **Step 4: Create `src/views/GisApp/layers/createMapOverlayFromMapConfig.ts`.**

```ts
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapOverlay } from "@/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types";

/**
 * The map-level overlay every layer query reads. The live map and the
 * publish-time compiler both build it here, so a public snapshot is filtered
 * by exactly what the author sees.
 */
export function createMapOverlayFromMapConfig(
  config: Readonly<AvaMapConfig.T>,
): MapOverlay {
  return { aoi: config.aoi, timeRange: config.timeRange };
}
```

Merge note for F3: if F3 adds a field to `MapOverlay` and fills it in `useGisAppRendering`, fill it here instead; Task 13 moves that call site onto this function.

- [ ] **Step 5: Run.** `pnpm vitest run src/views/GisApp/layers/useMapLayersData` Expected: same count as Step 1, all pass.

- [ ] **Step 6: Commit.**

```bash
git add src/views/GisApp/layers/useMapLayersData src/views/GisApp/layers/createMapOverlayFromMapConfig.ts
git commit -m "refactor(gis): run one layer query outside React"
```

---

## Task 6: The renderer reads snapshot data and returns its features

**Files:**
- Modify: `src/views/GisApp/layers/MapLayerDataResult.types.ts`
- Modify: `src/views/GisApp/layers/useAvaMapRender/makeLayerRender.ts`
- Test: `src/views/GisApp/layers/useAvaMapRender/useAvaMapRender.test.ts`

- [ ] **Step 1: Failing test.** Append to `useAvaMapRender.test.ts`, and add `import { createQueryableLayer } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData.fixtures";`:

```ts
describe("useAvaMapRender snapshot layers", () => {
  it("draws a snapshot's points where the snapshot put them", () => {
    const layer = MapLayer.withSensitivity(createQueryableLayer(), {
      mode: "jitter",
      radiusMeters: 500,
    });
    const snapshotGeometry: GeoJSON.Point = {
      type: "Point",
      coordinates: [-73.9812, 40.7514],
    };
    const { result } = renderHook(() => {
      return useAvaMapRender({
        mapConfig: {
          ...AvaMapConfig.makeEmpty(),
          layers: [layer],
        },
        layerQueryStates: new Map([
          [
            layer.id,
            {
              data: {
                type: "snapshot",
                featureCollection: {
                  type: "FeatureCollection",
                  features: [
                    {
                      type: "Feature",
                      id: 0,
                      geometry: snapshotGeometry,
                      properties: {},
                    },
                  ],
                },
                aggregation: undefined,
              },
              isLoading: false,
              isRefreshing: false,
              error: undefined,
              refetch: () => {
                return undefined;
              },
            },
          ],
        ]),
      });
    });

    const source = result.current.spec.sources[MapLayerIds.toSourceId(layer.id)];
    expect(source?.data.features[0]?.geometry).toEqual(snapshotGeometry);
  });
});
```

Run: `pnpm vitest run src/views/GisApp/layers/useAvaMapRender` Expected: FAIL, `source` is `undefined` (the layer renders empty).

- [ ] **Step 2: Add the variant.** In `MapLayerDataResult.types.ts`, add a third member to the union:

```ts
  | {
      /**
       * Features compiled when a dashboard was published, with the layer's
       * sensitivity already applied. Drawn as given: never re-jittered.
       */
      type: "snapshot";
      featureCollection: GeoJSON.FeatureCollection;
      aggregation: PointAggregation | undefined;
    };
```

(Move the trailing `;` from the `spatial` member to this one.)

- [ ] **Step 3: Teach `makeLayerRender`.**
  1. Change `type LayerRender = {` to `export type LayerRender = {` and add, after `layerSpec`:

```ts
  /** The features this layer draws, after sensitivity and classification. */
  featureCollection: GeoJSON.FeatureCollection;
```

  2. In `_getLayerGeometry`, replace the `if (options.queryState?.data?.type === "spatial") { return { featureCollection: options.queryState.data.featureCollection, ...` opening with:

```ts
  const data = options.queryState?.data;
  if (data?.type === "spatial" || data?.type === "snapshot") {
    return {
      featureCollection: data.featureCollection,
      drops: [],
      error: undefined,
    };
  }
```

  3. Add above `makeLayerRender` (with `import type { MapLayerDataResult } from "@/views/GisApp/layers/MapLayerDataResult.types";` and `import type { PointAggregation } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/PointAggregate.types";`):

```ts
/** How DuckDB aggregated the layer's points, when it did. */
function _getAggregation(
  data: MapLayerDataResult | undefined,
): PointAggregation | undefined {
  if (data?.type === "rows" || data?.type === "snapshot") {
    return data.aggregation;
  }
  return undefined;
}
```

     and replace `const aggregation = queryState?.data?.type === "rows" ? queryState.data.aggregation : undefined;` with `const aggregation = _getAggregation(queryState?.data);`.
  4. In the returned object, add `featureCollection: geometry.featureCollection,` after `layerSpec`.

- [ ] **Step 4: Run.** `pnpm vitest run src/views/GisApp/layers/useAvaMapRender` Expected: all pass.

- [ ] **Step 5: Commit.**

```bash
git add src/views/GisApp/layers/MapLayerDataResult.types.ts src/views/GisApp/layers/useAvaMapRender
git commit -m "feat(gis): draw published map snapshots through the layer renderer"
```

---

## Task 7: Apply legend updates without persisting them

**Files:**
- Modify: `src/views/GisApp/layers/PersistedLayerLegends/PersistedLayerLegends.ts`
- Test: `src/views/GisApp/layers/PersistedLayerLegends/PersistedLayerLegends.test.tsx`

- [ ] **Step 1: Failing test.** Append:

```ts
describe("PersistedLayerLegends.withLegendUpdates", () => {
  it("writes an update whose fingerprint matches and skips a stale one", () => {
    const current = MapLayer.makeEmpty("Coverage");
    const stale = MapLayer.makeEmpty("Schools");
    const entries = [
      { type: "value" as const, color: "#c92a2a", label: "Below 95%", count: 4 },
    ];
    const mapConfig = {
      ...AvaMapConfig.makeEmpty(),
      layers: [current, stale],
    } satisfies AvaMapConfig.T;

    const updated = PersistedLayerLegends.withLegendUpdates({
      mapConfig,
      legendUpdates: new Map([
        [
          current.id,
          {
            layerFingerprint:
              PersistedLayerLegends.makeFingerprintFromMapLayer(current),
            breaks: [],
            entries,
            sizeStops: [],
          },
        ],
        [
          stale.id,
          {
            layerFingerprint: "an older layer",
            breaks: [],
            entries,
            sizeStops: [],
          },
        ],
      ]),
    });

    expect(updated.layers[0]!.legend.entries).toEqual(entries);
    expect(updated.layers[1]!.legend.entries).toEqual([]);
  });
});
```

Run: `pnpm vitest run src/views/GisApp/layers/PersistedLayerLegends` Expected: FAIL, `withLegendUpdates is not a function`.

- [ ] **Step 2: Implement.** In `PersistedLayerLegends.ts`, add above `usePersistedLayerLegends`:

```ts
/** Applies every legend update whose fingerprint still matches its layer. */
function _withLegendUpdates(
  options: Readonly<{
    mapConfig: AvaMapConfig.T;
    legendUpdates: ReadonlyMap<MapLayer.Id, LayerLegendUpdate>;
  }>,
): AvaMapConfig.T {
  const layers = options.mapConfig.layers.map((layer) => {
    const update = options.legendUpdates.get(layer.id);
    if (
      !update ||
      update.layerFingerprint !== _makeFingerprintFromMapLayer(layer) ||
      _isLegendEqual(layer, update)
    ) {
      return layer;
    }
    return {
      ...layer,
      legend: {
        ...layer.legend,
        breaks: update.breaks,
        entries: update.entries,
        sizeStops: update.sizeStops,
      },
    } as MapLayer.T;
  });
  return { ...options.mapConfig, layers };
}
```

In `usePersistedLayerLegends`, replace the whole `updateConfig((current) => { ... });` call with:

```ts
      updateConfig((current) => {
        return _withLegendUpdates({ mapConfig: current, legendUpdates });
      });
```

Add to the exported object:

```ts
  /** Applies matching legend updates to a config without persisting them. */
  withLegendUpdates: _withLegendUpdates,
```

- [ ] **Step 3: Run.** Same command. Expected: all pass.

- [ ] **Step 4: Commit.**

```bash
git add src/views/GisApp/layers/PersistedLayerLegends
git commit -m "refactor(gis): apply layer legend updates as a pure function"
```

---

## Task 8: The map snapshot compiler

**Files:**
- Create: `src/clients/maps/MapSnapshot/compileMapSnapshot/compileMapSnapshot.ts`
- Create: `src/clients/maps/MapSnapshot/compileMapSnapshot/applySnapshotSensitivity.ts`
- Create: `src/clients/maps/MapSnapshot/compileMapSnapshot/cutSnapshotFeatureProperties.ts`
- Test: `src/clients/maps/MapSnapshot/compileMapSnapshot/compileMapSnapshot.test.ts`

Why `applySnapshotSensitivity` exists: the row path (`makeFeatureCollectionFromRows`) jitters lat/lng points, but nothing jitters points a spatial query returns (a WKT `geometryColumn` point layer set to Displace). The compiler fails closed for public output either way.

- [ ] **Step 1: Failing tests.** `compileMapSnapshot.test.ts`:

```ts
import { Model } from "@avandar/models";
import { describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import { compileMapSnapshot } from "@/clients/maps/MapSnapshot/compileMapSnapshot/compileMapSnapshot";
import { SensitivityViolationError } from "@/views/GisApp/layers/SensitivityViolationError";
import {
  createGridBinLayer,
  createQueryableLayer,
  createSpatialLayer,
} from "@/views/GisApp/layers/useMapLayersData/useMapLayersData.fixtures";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";
import type { MapLayerDataResult } from "@/views/GisApp/layers/MapLayerDataResult.types";

const MAP_ID = "00000000-0000-4000-8000-0000000000f5" as AvaMap.Id;
const SCHOOL: readonly [number, number] = [-73.9812, 40.7514];
const JITTER = { mode: "jitter", radiusMeters: 500 } as const;
const UNIT_CELL: GeoJSON.Polygon = {
  type: "Polygon",
  coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
};

function _makeTextQueryColumn(name: string): QueryColumn.T {
  const now = new Date().toISOString();
  return QueryColumn.makeFromDatasetColumn(
    Model.make("DatasetColumn", {
      id: uuid<DatasetColumn.Id>(),
      datasetId: uuid<Dataset.Id>(),
      workspaceId: uuid<Workspace.Id>(),
      createdAt: now,
      updatedAt: now,
      name,
      originalName: name,
      originalDataType: "VARCHAR",
      dataType: "varchar",
      detectedDataType: "VARCHAR",
      description: undefined,
      columnIdx: 2,
    }),
  );
}

function _rows(
  rows: ReadonlyArray<Record<string, unknown>>,
  aggregation?: Extract<MapLayerDataResult, { type: "rows" }>["aggregation"],
): MapLayerDataResult {
  return {
    type: "rows",
    queryResult: {
      ...QueryResult.makeEmpty(),
      data: [...rows],
      numRows: rows.length,
    },
    didAutoLimit: false,
    aggregation,
  };
}

function _spatial(features: GeoJSON.Feature[]): MapLayerDataResult {
  return {
    type: "spatial",
    featureCollection: { type: "FeatureCollection", features },
    diagnostics: {
      sourceCount: features.length,
      parsedCount: features.length,
      invalidCount: 0,
      observedFamilies: [],
      hasMixedFamilies: false,
    },
  };
}

function _feature(
  geometry: GeoJSON.Geometry,
  properties: GeoJSON.GeoJsonProperties = {},
): GeoJSON.Feature {
  return { type: "Feature", id: 0, geometry, properties };
}

/** A lat/lng school layer whose popup lists latitude and the school name. */
function _makeSchoolLayer(sensitivity: MapLayer.Sensitivity): MapLayer.T {
  const base = createQueryableLayer();
  const nameColumn = _makeTextQueryColumn("school_name");
  const latitude = base.source.queryColumns[0]!;
  return MapLayer.withSensitivity(
    {
      ...base,
      source: {
        ...base.source,
        queryColumns: [...base.source.queryColumns, nameColumn],
      },
      popup: { columnIds: [latitude.id, nameColumn.id], action: undefined },
    },
    sensitivity,
  );
}

async function _compile(
  layer: MapLayer.T,
  result: MapLayerDataResult,
): Promise<MapSnapshot> {
  return await compileMapSnapshot({
    mapId: MAP_ID,
    mapName: "Coverage risk",
    mapConfig: AvaMapConfig.withLayerAdded({
      config: AvaMapConfig.makeEmpty(),
      layer,
    }),
    runLayerQuery: async () => {
      return result;
    },
  });
}

function _firstPoint(snapshot: MapSnapshot): GeoJSON.Position | undefined {
  const geometry = snapshot.layers[0]?.featureCollection.features[0]?.geometry;
  return geometry?.type === "Point" ? geometry.coordinates : undefined;
}

describe("compileMapSnapshot", () => {
  it("publishes a displaced lat/lng layer's points away from their source", async () => {
    const snapshot = await _compile(
      _makeSchoolLayer(JITTER),
      _rows([{ lat: SCHOOL[1], lon: SCHOOL[0], school_name: "PS 11" }]),
    );

    const point = _firstPoint(snapshot);
    expect(point).not.toEqual([...SCHOOL]);
    expect(Math.abs(point![0]! - SCHOOL[0])).toBeLessThan(0.01);
    expect(Math.abs(point![1]! - SCHOOL[1])).toBeLessThan(0.01);
  });

  it("displaces points a spatial query returned for a displaced layer", async () => {
    const layer = MapLayer.withSensitivity(createSpatialLayer(), JITTER);

    const snapshot = await _compile(
      layer,
      _spatial([_feature({ type: "Point", coordinates: [...SCHOOL] })]),
    );

    expect(_firstPoint(snapshot)).not.toEqual([...SCHOOL]);
  });

  it("publishes only areas for an aggregate-only layer", async () => {
    const points = createQueryableLayer();
    const layer = MapLayer.withSensitivity(
      createGridBinLayer(points, {
        type: "latLngColumns",
        latitude: points.source.queryColumns[0]!.id,
        longitude: points.source.queryColumns[1]!.id,
      }),
      { mode: "aggregateOnly", minCellCount: 5, minGeoLevel: "admin2" },
    );

    const snapshot = await _compile(layer, _spatial([_feature(UNIT_CELL)]));

    const geometryTypes = snapshot.layers[0]!.featureCollection.features.map(
      (feature) => {
        return feature.geometry.type;
      },
    );
    expect(geometryTypes).toEqual(["Polygon"]);
  });

  it("refuses to publish a point from an aggregate-only layer", async () => {
    const points = createQueryableLayer();
    const layer = MapLayer.withSensitivity(
      createGridBinLayer(points, {
        type: "latLngColumns",
        latitude: points.source.queryColumns[0]!.id,
        longitude: points.source.queryColumns[1]!.id,
      }),
      { mode: "aggregateOnly", minCellCount: 5, minGeoLevel: "admin2" },
    );

    await expect(
      _compile(
        layer,
        _spatial([
          _feature(UNIT_CELL),
          _feature({ type: "Point", coordinates: [...SCHOOL] }),
        ]),
      ),
    ).rejects.toBeInstanceOf(SensitivityViolationError);
  });

  it("keeps only a spatial layer's popup columns and render properties", async () => {
    const base = createSpatialLayer();
    const nameColumn = _makeTextQueryColumn("school_name");
    const layer: MapLayer.T = {
      ...base,
      source: {
        ...base.source,
        queryColumns: [...base.source.queryColumns, nameColumn],
      },
      popup: { columnIds: [nameColumn.id], action: undefined },
    };

    const snapshot = await _compile(
      layer,
      _spatial([
        _feature(
          { type: "Point", coordinates: [...SCHOOL] },
          {
            school_name: "PS 11",
            home_address: "1 Main St",
            __avandar_feature_id: "f-1",
          },
        ),
      ]),
    );

    expect(snapshot.layers[0]!.featureCollection.features[0]!.properties).toEqual(
      { school_name: "PS 11", __avandar_feature_id: "f-1" },
    );
  });

  it("drops a displaced layer's coordinate columns from its properties", async () => {
    const snapshot = await _compile(
      _makeSchoolLayer(JITTER),
      _rows([{ lat: SCHOOL[1], lon: SCHOOL[0], school_name: "PS 11" }]),
    );

    expect(
      snapshot.layers[0]!.featureCollection.features[0]!.properties,
    ).toEqual({ school_name: "PS 11" });
  });

  it("carries a DuckDB-aggregated layer's aggregation", async () => {
    const aggregation = {
      cellsAcross: 64,
      aggregatedRowCount: 12_000,
      didCoarsenGrid: false,
    };

    const snapshot = await _compile(
      _makeSchoolLayer({ mode: "exact" }),
      _rows([{ lat: SCHOOL[1], lon: SCHOOL[0], point_count: 12_000 }], aggregation),
    );

    expect(snapshot.layers[0]!.aggregation).toEqual(aggregation);
  });

  it("does not query or publish a hidden layer", async () => {
    const layer = { ..._makeSchoolLayer({ mode: "exact" }), isVisible: false };
    const runLayerQuery = vi.fn();

    const snapshot = await compileMapSnapshot({
      mapId: MAP_ID,
      mapName: "Coverage risk",
      mapConfig: AvaMapConfig.withLayerAdded({
        config: AvaMapConfig.makeEmpty(),
        layer,
      }),
      runLayerQuery,
    });

    expect(runLayerQuery).not.toHaveBeenCalled();
    expect(snapshot.layers).toEqual([]);
  });

  it("strips layer sources from the published config", async () => {
    const snapshot = await _compile(
      _makeSchoolLayer({ mode: "exact" }),
      _rows([{ lat: SCHOOL[1], lon: SCHOOL[0], school_name: "PS 11" }]),
    );

    expect(snapshot.config.layers[0]!.source.dataSource).toBeUndefined();
  });
});
```

Run: `pnpm vitest run src/clients/maps/MapSnapshot/compileMapSnapshot` Expected: FAIL, import not found.

- [ ] **Step 2: Implement `applySnapshotSensitivity.ts`.**

```ts
import { match } from "ts-pattern";
import { jitterCoordinate } from "@/views/GisApp/layers/jitterCoordinate/jitterCoordinate";
import { SensitivityViolationError } from "@/views/GisApp/layers/SensitivityViolationError";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

const AREA_GEOMETRY_TYPES: ReadonlySet<string> = new Set([
  "Polygon",
  "MultiPolygon",
]);

function _jitterPosition(
  options: Readonly<{
    position: GeoJSON.Position;
    radiusMeters: number;
    seed: string;
  }>,
): GeoJSON.Position {
  const [longitude = 0, latitude = 0] = options.position;
  const displaced = jitterCoordinate({
    longitude,
    latitude,
    radiusMeters: options.radiusMeters,
    seed: options.seed,
  });
  return [displaced.longitude, displaced.latitude];
}

function _jitterGeometry(
  options: Readonly<{
    geometry: GeoJSON.Geometry;
    radiusMeters: number;
    seed: string;
  }>,
): GeoJSON.Geometry {
  const { geometry, radiusMeters, seed } = options;
  if (geometry.type === "Point") {
    return {
      type: "Point",
      coordinates: _jitterPosition({
        position: geometry.coordinates,
        radiusMeters,
        seed,
      }),
    };
  }
  if (geometry.type === "MultiPoint") {
    return {
      type: "MultiPoint",
      coordinates: geometry.coordinates.map((position, positionIndex) => {
        return _jitterPosition({
          position,
          radiusMeters,
          seed: `${seed}:${positionIndex}`,
        });
      }),
    };
  }
  return geometry;
}

function _jitterPoints(
  options: Readonly<{
    layer: MapLayer.T;
    featureCollection: GeoJSON.FeatureCollection;
    radiusMeters: number;
  }>,
): GeoJSON.FeatureCollection {
  return {
    ...options.featureCollection,
    features: options.featureCollection.features.map(
      (feature, featureIndex) => {
        return {
          ...feature,
          geometry: _jitterGeometry({
            geometry: feature.geometry,
            radiusMeters: options.radiusMeters,
            seed: `${options.layer.id}:${featureIndex}`,
          }),
        };
      },
    ),
  };
}

function _assertOnlyAreas(
  options: Readonly<{
    layer: MapLayer.T;
    featureCollection: GeoJSON.FeatureCollection;
  }>,
): void {
  const hasNonArea = options.featureCollection.features.some((feature) => {
    return !AREA_GEOMETRY_TYPES.has(feature.geometry.type);
  });
  if (hasNonArea) {
    throw new SensitivityViolationError("aggregateOnly", options.layer.name);
  }
}

/**
 * Enforces a layer's sensitivity policy on features about to be published.
 *
 * A `jitter` layer's spatial-query points are displaced here, because the
 * spatial path does not displace them; row-based points arrive already
 * displaced (`isAlreadyProtected`) and are left alone so they are not moved
 * twice. An `aggregateOnly` layer must hold areas only, and anything else
 * stops the publish rather than going out.
 */
export function applySnapshotSensitivity(
  options: Readonly<{
    layer: MapLayer.T;
    featureCollection: GeoJSON.FeatureCollection;
    isAlreadyProtected: boolean;
  }>,
): GeoJSON.FeatureCollection {
  const { layer, featureCollection } = options;
  return match(layer.sensitivity)
    .with({ mode: "exact" }, () => {
      return featureCollection;
    })
    .with({ mode: "jitter" }, (policy) => {
      return options.isAlreadyProtected
        ? featureCollection
        : _jitterPoints({
            layer,
            featureCollection,
            radiusMeters: policy.radiusMeters,
          });
    })
    .with({ mode: "aggregateOnly" }, () => {
      _assertOnlyAreas({ layer, featureCollection });
      return featureCollection;
    })
    .exhaustive();
}
```

- [ ] **Step 3: Implement `cutSnapshotFeatureProperties.ts`.**

```ts
import { isDefined, propEq } from "@avandar/utils";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { MapLayerSpatialFeatureProperties } from "@/clients/maps/MapLayerSpatialQuery/MapLayerSpatialQuery.constants";
import { PointAggregateProperties } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/PointAggregate.constants";
import { getPaintValueColumnName } from "@/views/GisApp/layers/useAvaMapRender/getPaintValueColumnName";

/** Properties the renderer itself writes and reads, never source columns. */
const RENDER_PROPERTY_NAMES: readonly string[] = [
  ...Object.values(MapLayerSpatialFeatureProperties),
  ...Object.values(PointAggregateProperties),
];

function _getColorValueColumnName(layer: MapLayer.T): string | undefined {
  const { symbology } = layer;
  if (
    !("color" in symbology) ||
    symbology.color.type === "single" ||
    symbology.color.value.type !== "queryColumn"
  ) {
    return undefined;
  }
  const columnId = symbology.color.value.column;
  const column = layer.source.queryColumns.find(propEq("id", columnId));
  return column ? QueryColumn.getDerivedColumnName(column) : undefined;
}

function _getAllowedPropertyNames(
  layer: MapLayer.T,
): ReadonlySet<string> | "all" {
  const propertyNames = MapLayer.toPropertyColumnNames(layer);
  if (propertyNames === "all") {
    return "all";
  }
  const paintNames = [
    getPaintValueColumnName(layer),
    _getColorValueColumnName(layer),
  ].filter(isDefined);
  return new Set([...propertyNames, ...paintNames, ...RENDER_PROPERTY_NAMES]);
}

/** A protected layer's bound coordinate columns, which must not go public. */
function _getCoordinateColumnNames(layer: MapLayer.T): ReadonlySet<string> {
  if (layer.sensitivity.mode === "exact") {
    return new Set();
  }
  const binding = MapLayer.toGeoBinding(layer);
  return new Set(
    binding ? [binding.latitudeColumnName, binding.longitudeColumnName] : [],
  );
}

/**
 * Cuts each feature's properties to what the layer's popup shows and its
 * paint reads, and never lets a displaced or aggregated layer publish the
 * coordinate columns it is bound to.
 */
export function cutSnapshotFeatureProperties(
  options: Readonly<{
    layer: MapLayer.T;
    featureCollection: GeoJSON.FeatureCollection;
  }>,
): GeoJSON.FeatureCollection {
  const allowed = _getAllowedPropertyNames(options.layer);
  const forbidden = _getCoordinateColumnNames(options.layer);
  return {
    ...options.featureCollection,
    features: options.featureCollection.features.map((feature) => {
      const properties = feature.properties
        ? Object.fromEntries(
            Object.entries(feature.properties).filter(([name]) => {
              return (
                !forbidden.has(name) &&
                (allowed === "all" || allowed.has(name))
              );
            }),
          )
        : feature.properties;
      return { ...feature, properties };
    }),
  };
}
```

- [ ] **Step 4: Implement `compileMapSnapshot.ts`.**

```ts
import { noop, prop } from "@avandar/utils";
import { applySnapshotSensitivity } from "@/clients/maps/MapSnapshot/compileMapSnapshot/applySnapshotSensitivity";
import { cutSnapshotFeatureProperties } from "@/clients/maps/MapSnapshot/compileMapSnapshot/cutSnapshotFeatureProperties";
import { createPublicMapConfigFromMapConfig } from "@/clients/maps/MapSnapshot/createPublicMapConfigFromMapConfig/createPublicMapConfigFromMapConfig";
import { createLayerGeometryCache } from "@/views/GisApp/layers/createLayerGeometryCache/createLayerGeometryCache";
import { PersistedLayerLegends } from "@/views/GisApp/layers/PersistedLayerLegends/PersistedLayerLegends";
import { makeLayerRender } from "@/views/GisApp/layers/useAvaMapRender/makeLayerRender";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type {
  MapSnapshot,
  MapSnapshotLayer,
} from "@/clients/maps/MapSnapshot/MapSnapshot.types";
import type { MapLayerDataResult } from "@/views/GisApp/layers/MapLayerDataResult.types";
import type { LayerLegendUpdate } from "@/views/GisApp/layers/PersistedLayerLegends/PersistedLayerLegends";
import type { LayerRender } from "@/views/GisApp/layers/useAvaMapRender/makeLayerRender";
import type { MapLayerQueryState } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData";

type RunLayerQuery = (layer: MapLayer.T) => Promise<MapLayerDataResult>;

type CompiledLayer = {
  snapshotLayer: MapSnapshotLayer;
  legendUpdate: LayerLegendUpdate | undefined;
};

function _makeReadyQueryState(data: MapLayerDataResult): MapLayerQueryState {
  return {
    data,
    isLoading: false,
    isRefreshing: false,
    error: undefined,
    refetch: noop,
  };
}

function _assertLayerRendered(
  options: Readonly<{ layer: MapLayer.T; render: LayerRender }>,
): void {
  if (options.render.viewState.status !== "error") {
    return;
  }
  throw (
    options.render.viewState.error ??
    new Error(
      `Cannot publish: map layer "${options.layer.name}" could not be drawn.`,
    )
  );
}

async function _compileLayer(
  options: Readonly<{ layer: MapLayer.T; runLayerQuery: RunLayerQuery }>,
): Promise<CompiledLayer> {
  const { layer } = options;
  const data = await options.runLayerQuery(layer);
  const render = makeLayerRender({
    layer,
    layerQueryStates: new Map([[layer.id, _makeReadyQueryState(data)]]),
    geometryCache: createLayerGeometryCache(),
  });
  _assertLayerRendered({ layer, render });
  const protectedFeatures = applySnapshotSensitivity({
    layer,
    featureCollection: render.featureCollection,
    isAlreadyProtected: data.type === "rows",
  });
  return {
    snapshotLayer: {
      layerId: layer.id,
      featureCollection: cutSnapshotFeatureProperties({
        layer,
        featureCollection: protectedFeatures,
      }),
      aggregation: data.type === "rows" ? data.aggregation : undefined,
    },
    legendUpdate: render.legendUpdate,
  };
}

async function _compileVisibleLayers(
  options: Readonly<{
    mapConfig: AvaMapConfig.T;
    runLayerQuery: RunLayerQuery;
  }>,
): Promise<CompiledLayer[]> {
  const compiledLayers: CompiledLayer[] = [];
  for (const layer of options.mapConfig.layers.filter(prop("isVisible"))) {
    // Layers compile one at a time so DuckDB holds one layer's rows at once.
    // react-doctor-disable-next-line
    compiledLayers.push(
      await _compileLayer({ layer, runLayerQuery: options.runLayerQuery }),
    );
  }
  return compiledLayers;
}

/**
 * Compiles a map into what a public page may show: every visible layer run
 * through the same query and render path the live map uses, its sensitivity
 * enforced again, its properties cut to its popup, its legend baked in, and
 * the config stripped of source queries. Throws rather than publish a layer
 * it could not draw.
 */
export async function compileMapSnapshot(
  options: Readonly<{
    mapId: AvaMap.Id;
    mapName: string;
    mapConfig: AvaMapConfig.T;
    runLayerQuery: RunLayerQuery;
  }>,
): Promise<MapSnapshot> {
  const compiledLayers = await _compileVisibleLayers(options);
  const legendUpdates = new Map(
    compiledLayers.flatMap((compiled) => {
      return compiled.legendUpdate
        ? [[compiled.snapshotLayer.layerId, compiled.legendUpdate] as const]
        : [];
    }),
  );
  const configWithLegends = PersistedLayerLegends.withLegendUpdates({
    mapConfig: options.mapConfig,
    legendUpdates,
  });
  return {
    version: 1,
    mapId: options.mapId,
    mapName: options.mapName,
    config: createPublicMapConfigFromMapConfig(configWithLegends),
    layers: compiledLayers.map(prop("snapshotLayer")),
  };
}
```

- [ ] **Step 5: Run.** `pnpm vitest run src/clients/maps/MapSnapshot/compileMapSnapshot` Expected: 9 passed.

- [ ] **Step 6: Commit.**

```bash
git add src/clients/maps/MapSnapshot/compileMapSnapshot
git commit -m "feat(gis): compile a map into protected public output"
```

---

## Task 9: Load and compile a map by id

**Files:**
- Create: `src/clients/maps/getDatasetIdsFromMapConfig/getDatasetIdsFromMapConfig.ts`, `getDatasetIdsFromMapConfig.test.ts`
- Create: `src/clients/maps/MapSnapshot/createMapSnapshotFromMapId/createMapSnapshotFromMapId.ts`, `createMapSnapshotFromMapId.test.ts`

- [ ] **Step 1: Failing dataset id test.** `getDatasetIdsFromMapConfig.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { getDatasetIdsFromMapConfig } from "@/clients/maps/getDatasetIdsFromMapConfig/getDatasetIdsFromMapConfig";
import { createQueryableLayer } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData.fixtures";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

describe("getDatasetIdsFromMapConfig", () => {
  it("lists each source and boundary dataset once", () => {
    const points = createQueryableLayer();
    const boundaryDatasetId = uuid<Dataset.Id>();
    const zips: MapLayer.T = {
      ...MapLayer.createArea("ZIP codes"),
      geoBinding: {
        type: "joinToBoundaries",
        dataKeyColumn: uuid<QueryColumn.Id>(),
        boundary: {
          datasetId: boundaryDatasetId,
          geometryColumnId: uuid<DatasetColumn.Id>(),
          geometryEncoding: "wkt",
          keyColumnId: uuid<DatasetColumn.Id>(),
          displayNameColumnId: undefined,
          simplification: { tolerancePixels: 1 },
        },
        matching: "exact",
        aggregation: {
          operation: "count",
          outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
        },
      },
    };
    const config = {
      ...AvaMapConfig.makeEmpty(),
      layers: [points, { ...points, id: uuid<MapLayer.Id>() }, zips],
    };

    expect(getDatasetIdsFromMapConfig(config)).toEqual([
      points.source.dataSource!.id,
      boundaryDatasetId,
    ]);
  });
});
```

Run: `pnpm vitest run src/clients/maps/getDatasetIdsFromMapConfig` Expected: FAIL, import not found.

- [ ] **Step 2: Implement.**

```ts
import { Model } from "@avandar/models";
import { isDefined } from "@avandar/utils";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

function _getSourceDatasetId(layer: MapLayer.T): Dataset.Id | undefined {
  const source = layer.source.dataSource;
  return source && Model.isOfModelType(source, "Dataset")
    ? source.id
    : undefined;
}

function _getBoundaryDatasetId(layer: MapLayer.T): Dataset.Id | undefined {
  const binding = layer.geoBinding;
  return binding?.type === "joinToBoundaries" ||
    binding?.type === "aggregatePointsToBoundaries"
    ? binding.boundary.datasetId
    : undefined;
}

/**
 * Every dataset a map's layers read: each layer's source and each boundary
 * set it joins to. A viewer missing any of them cannot draw the map.
 */
export function getDatasetIdsFromMapConfig(
  config: Readonly<AvaMapConfig.T>,
): Dataset.Id[] {
  return Array.from(
    new Set(
      config.layers.flatMap((layer) => {
        return [_getSourceDatasetId(layer), _getBoundaryDatasetId(layer)].filter(
          isDefined,
        );
      }),
    ),
  );
}
```

Run the same command. Expected: 1 passed.

- [ ] **Step 3: Failing loader test.** `createMapSnapshotFromMapId.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { createMapSnapshotFromMapId } from "@/clients/maps/MapSnapshot/createMapSnapshotFromMapId/createMapSnapshotFromMapId";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Workspace } from "$/models/Workspace/Workspace";

const { compileMapSnapshotMock, getMapByIdMock } = vi.hoisted(() => {
  return { compileMapSnapshotMock: vi.fn(), getMapByIdMock: vi.fn() };
});

vi.mock("@/clients/maps/AvaMapClient/AvaMapClient", () => {
  return { AvaMapClient: { getById: getMapByIdMock } };
});
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return { DatasetClient: { getAll: vi.fn().mockResolvedValue([]) } };
});
vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return { DatasetColumnClient: { getAll: vi.fn().mockResolvedValue([]) } };
});
vi.mock("@/clients/ontology/ConceptAttributeClient", () => {
  return { ConceptAttributeClient: { getAll: vi.fn().mockResolvedValue([]) } };
});
vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return { DuckDbClient: { ensureSpatial: vi.fn().mockResolvedValue(true) } };
});
vi.mock(
  "@/clients/maps/MapSnapshot/compileMapSnapshot/compileMapSnapshot",
  () => {
    return { compileMapSnapshot: compileMapSnapshotMock };
  },
);

const WORKSPACE_ID = "00000000-0000-4000-8000-0000000000aa" as Workspace.Id;
const MAP = {
  id: "00000000-0000-4000-8000-0000000000f5" as AvaMap.Id,
  name: "Coverage risk",
  workspaceId: WORKSPACE_ID,
  config: AvaMapConfig.makeEmpty(),
};

describe("createMapSnapshotFromMapId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("compiles the map under its own name", async () => {
    getMapByIdMock.mockResolvedValue(MAP);
    compileMapSnapshotMock.mockResolvedValue({ mapId: MAP.id });

    await createMapSnapshotFromMapId({
      mapId: MAP.id,
      workspaceId: WORKSPACE_ID,
    });

    expect(compileMapSnapshotMock).toHaveBeenCalledWith(
      expect.objectContaining({ mapId: MAP.id, mapName: "Coverage risk" }),
    );
  });

  it("refuses a map the publisher cannot read", async () => {
    getMapByIdMock.mockResolvedValue(undefined);

    await expect(
      createMapSnapshotFromMapId({ mapId: MAP.id, workspaceId: WORKSPACE_ID }),
    ).rejects.toThrow("unavailable");
    expect(compileMapSnapshotMock).not.toHaveBeenCalled();
  });

  it("refuses a map from another workspace", async () => {
    getMapByIdMock.mockResolvedValue({
      ...MAP,
      workspaceId: "00000000-0000-4000-8000-0000000000bb" as Workspace.Id,
    });

    await expect(
      createMapSnapshotFromMapId({ mapId: MAP.id, workspaceId: WORKSPACE_ID }),
    ).rejects.toThrow("outside this workspace");
  });
});
```

Run: `pnpm vitest run src/clients/maps/MapSnapshot/createMapSnapshotFromMapId` Expected: FAIL, import not found.

- [ ] **Step 4: Implement.**

```ts
import { where } from "@avandar/utils";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { AvaMapClient } from "@/clients/maps/AvaMapClient/AvaMapClient";
import { compileMapSnapshot } from "@/clients/maps/MapSnapshot/compileMapSnapshot/compileMapSnapshot";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { createMapOverlayFromMapConfig } from "@/views/GisApp/layers/createMapOverlayFromMapConfig";
import {
  isSpatialMapLayerBinding,
  runMapLayerQuery,
} from "@/views/GisApp/layers/useMapLayersData/runMapLayerQuery";
import { MapSourceHydration } from "@/views/GisApp/useGisApp/MapSourceHydration/MapSourceHydration";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";
import type { MapLayerQueryContext } from "@/views/GisApp/layers/useMapLayersData/runMapLayerQuery";

type MapQueryInputs = {
  config: AvaMapConfig.T;
  datasets: Dataset.T[];
  datasetColumns: DatasetColumn.T[];
};

async function _loadMapQueryInputs(avaMap: AvaMap.T): Promise<MapQueryInputs> {
  const inWorkspace = where("workspace_id", "eq", avaMap.workspaceId);
  const [datasets, datasetColumns, conceptAttributes] = await Promise.all([
    DatasetClient.getAll(inWorkspace),
    DatasetColumnClient.getAll(inWorkspace),
    ConceptAttributeClient.getAll(inWorkspace),
  ]);
  const { config } = MapSourceHydration.fromMetadata({
    config: avaMap.config,
    datasetColumns,
    conceptAttributes,
  });
  return { config, datasets, datasetColumns };
}

async function _assertSpatialAvailable(config: AvaMapConfig.T): Promise<void> {
  const needsSpatial =
    config.aoi !== undefined ||
    config.layers.some((layer) => {
      return layer.isVisible && isSpatialMapLayerBinding(layer);
    });
  if (needsSpatial && !(await DuckDbClient.ensureSpatial())) {
    throw new Error(
      "Cannot publish: this map needs DuckDB Spatial, which this browser could not load.",
    );
  }
}

function _createQueryContext(
  options: Readonly<{ inputs: MapQueryInputs; workspaceId: Workspace.Id }>,
): MapLayerQueryContext {
  const { config, datasets, datasetColumns } = options.inputs;
  return {
    stack: config.layers,
    workspaceId: options.workspaceId,
    zoomBand: Math.max(0, Math.min(24, Math.floor(config.view.zoom))),
    simplificationReferenceLatitude: config.view.center[1],
    datasets,
    datasetColumns,
    overlay: createMapOverlayFromMapConfig(config),
  };
}

/**
 * Loads a map the publisher can read, hydrates it like the GIS app does, and
 * compiles it at its saved view. Throws when the map is missing, outside the
 * dashboard's workspace, or cannot be queried, so a publish never goes out
 * with a map silently left behind.
 */
export async function createMapSnapshotFromMapId(
  options: Readonly<{ mapId: AvaMap.Id; workspaceId: Workspace.Id }>,
): Promise<MapSnapshot> {
  const avaMap = await AvaMapClient.getById({ id: options.mapId });
  if (!avaMap || avaMap.workspaceId !== options.workspaceId) {
    throw new Error(
      `Cannot publish: map ${options.mapId} is unavailable or outside this workspace.`,
    );
  }
  const inputs = await _loadMapQueryInputs(avaMap);
  await _assertSpatialAvailable(inputs.config);
  const context = _createQueryContext({
    inputs,
    workspaceId: avaMap.workspaceId,
  });
  return await compileMapSnapshot({
    mapId: avaMap.id,
    mapName: avaMap.name,
    mapConfig: inputs.config,
    runLayerQuery: async (layer) => {
      return await runMapLayerQuery({ layer, context });
    },
  });
}
```

- [ ] **Step 5: Run.** Same command. Expected: 3 passed.

- [ ] **Step 6: Commit.**

```bash
git add src/clients/maps/getDatasetIdsFromMapConfig src/clients/maps/MapSnapshot/createMapSnapshotFromMapId
git commit -m "feat(gis): compile a saved map by id for publishing"
```

---

## Task 10: Map block settings and finding map blocks

**Files:**
- Create: `src/views/GisApp/MapViewer/MapViewer.types.ts`
- Create: `src/views/DashboardApp/AvaPage/pblocks/MapPBlock/parseMapPBlockSettings/parseMapPBlockSettings.ts`, `parseMapPBlockSettings.test.ts`
- Create: `src/clients/dashboards/DashboardMapBlocks/DashboardMapBlocks.ts`, `DashboardMapBlocks.test.ts`

- [ ] **Step 1: Viewer types.** `src/views/GisApp/MapViewer/MapViewer.types.ts`:

```ts
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Workspace } from "$/models/Workspace/Workspace";

/** Which camera a read-only map opens on: its saved view or a bookmark. */
export type MapViewerCamera =
  | { type: "saved" }
  | { type: "bookmark"; bookmarkId: AvaMapConfig.BookmarkId };

/**
 * Where a read-only map's features come from: the live map and its datasets,
 * or the snapshot a public dashboard published.
 */
export type MapViewerSource =
  | { type: "live"; mapId: AvaMap.Id; workspaceId: Workspace.Id }
  | {
      type: "snapshot";
      mapId: AvaMap.Id;
      dashboardId: Dashboard.Id;
      snapshotRevision: string;
    };

/** How a read-only map is framed on the page. */
export type MapViewerDisplay = {
  camera: MapViewerCamera;
  heightPx: number;
  showLegend: boolean;
  isInteractive: boolean;
};
```

- [ ] **Step 2: Failing settings test.** `parseMapPBlockSettings.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAP_PBLOCK_SETTINGS,
  parseMapPBlockSettings,
} from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/parseMapPBlockSettings/parseMapPBlockSettings";

const MAP_ID = "00000000-0000-4000-8000-0000000000f5";
const BOOKMARK_ID = "00000000-0000-4000-8000-0000000000b1";

describe("parseMapPBlockSettings", () => {
  it("keeps a saved block's settings", () => {
    const saved = {
      mapId: MAP_ID,
      view: { type: "bookmark", bookmarkId: BOOKMARK_ID },
      heightPx: 600,
      showLegend: false,
      isInteractive: false,
    };

    expect(parseMapPBlockSettings({ id: "Map-1", ...saved })).toEqual(saved);
  });

  it("falls back to the defaults for missing or out-of-range display settings", () => {
    expect(parseMapPBlockSettings({ mapId: MAP_ID, heightPx: 5 })).toEqual({
      ...DEFAULT_MAP_PBLOCK_SETTINGS,
      mapId: MAP_ID,
    });
  });

  it("accepts a block whose map is not picked yet", () => {
    expect(parseMapPBlockSettings({})).toEqual(DEFAULT_MAP_PBLOCK_SETTINGS);
  });

  it("rejects a block whose map id is not a uuid", () => {
    expect(parseMapPBlockSettings({ mapId: "coverage-map" })).toBeUndefined();
  });
});
```

Run: `pnpm vitest run src/views/DashboardApp/AvaPage/pblocks/MapPBlock/parseMapPBlockSettings` Expected: FAIL, import not found.

- [ ] **Step 3: Implement.**

```ts
import { z } from "zod";
import { uuidType } from "$/lib/zodHelpers";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapViewerCamera } from "@/views/GisApp/MapViewer/MapViewer.types";

/** A dashboard Map block's saved props, apart from Puck's own `id`. */
export type MapPBlockSettings = {
  /** The map to show, or `undefined` until the author picks one. */
  mapId: AvaMap.Id | undefined;
  view: MapViewerCamera;
  heightPx: number;
  showLegend: boolean;
  isInteractive: boolean;
};

/** The block heights the editor allows, in pixels. */
export const MAP_PBLOCK_HEIGHT_RANGE = { min: 240, max: 1200 } as const;

/** A new Map block: no map yet, the saved view, legend on, interactive. */
export const DEFAULT_MAP_PBLOCK_SETTINGS: MapPBlockSettings = {
  mapId: undefined,
  view: { type: "saved" },
  heightPx: 480,
  showLegend: true,
  isInteractive: true,
};

const MapViewerCameraSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("saved") }),
  z.object({
    type: z.literal("bookmark"),
    bookmarkId: uuidType<AvaMapConfig.BookmarkId>(),
  }),
]);

const MapPBlockSettingsSchema = z.object({
  mapId: uuidType<AvaMap.Id>().optional(),
  view: MapViewerCameraSchema.catch(DEFAULT_MAP_PBLOCK_SETTINGS.view),
  heightPx: z
    .number()
    .int()
    .min(MAP_PBLOCK_HEIGHT_RANGE.min)
    .max(MAP_PBLOCK_HEIGHT_RANGE.max)
    .catch(DEFAULT_MAP_PBLOCK_SETTINGS.heightPx),
  showLegend: z.boolean().catch(DEFAULT_MAP_PBLOCK_SETTINGS.showLegend),
  isInteractive: z.boolean().catch(DEFAULT_MAP_PBLOCK_SETTINGS.isInteractive),
});

/**
 * Reads a Map block's saved props. Display settings that are missing or out
 * of range fall back to the defaults; a map id that is not a uuid makes the
 * whole block unreadable, since there is no map to fall back to.
 */
export function parseMapPBlockSettings(
  value: unknown,
): MapPBlockSettings | undefined {
  const result = MapPBlockSettingsSchema.safeParse(value);
  return result.success
    ? { ...result.data, mapId: result.data.mapId }
    : undefined;
}
```

Run the same command. Expected: 4 passed.

- [ ] **Step 4: Failing block finder test.** `src/clients/dashboards/DashboardMapBlocks/DashboardMapBlocks.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DashboardMapBlocks } from "@/clients/dashboards/DashboardMapBlocks/DashboardMapBlocks";

const FIRST_MAP = "00000000-0000-4000-8000-0000000000f5";
const SECOND_MAP = "00000000-0000-4000-8000-0000000000f6";

const CONFIG = {
  root: { props: { title: "Coverage" } },
  content: [
    { type: "Map", props: { id: "Map-1", mapId: FIRST_MAP } },
    { type: "DataViz", props: { id: "DataViz-1", mapId: SECOND_MAP } },
    {
      type: "Section",
      props: {
        id: "Section-1",
        content: [
          { type: "Map", props: { id: "Map-2", mapId: SECOND_MAP } },
          { type: "Map", props: { id: "Map-3", mapId: FIRST_MAP } },
          { type: "Map", props: { id: "Map-4" } },
          { type: "Map", props: { id: "Map-5", mapId: "not-a-map" } },
        ],
      },
    },
  ],
};

describe("DashboardMapBlocks", () => {
  it("finds readable Map blocks at any depth", () => {
    expect(
      DashboardMapBlocks.getMapBlocks(CONFIG).map((block) => {
        return block.blockId;
      }),
    ).toEqual(["Map-1", "Map-2", "Map-3", "Map-4"]);
  });

  it("lists each picked map once", () => {
    expect(DashboardMapBlocks.getMapIds(CONFIG)).toEqual([
      FIRST_MAP,
      SECOND_MAP,
    ]);
  });
});
```

Run: `pnpm vitest run src/clients/dashboards/DashboardMapBlocks` Expected: FAIL, import not found.

- [ ] **Step 5: Implement.**

```ts
import { isDefined, isPlainObject, isString, traverse } from "@avandar/utils";
import { parseMapPBlockSettings } from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/parseMapPBlockSettings/parseMapPBlockSettings";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { MapPBlockSettings } from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/parseMapPBlockSettings/parseMapPBlockSettings";

/** One Map block found in a saved dashboard page. */
export type DashboardMapBlock = {
  blockId: string;
  settings: MapPBlockSettings;
};

function _getMapBlocks(dashboardConfig: unknown): DashboardMapBlock[] {
  const blocks: DashboardMapBlock[] = [];
  traverse(dashboardConfig, (node) => {
    if (!isPlainObject(node) || node["type"] !== "Map") {
      return;
    }
    const props: unknown = node["props"];
    if (!isPlainObject(props) || !isString(props["id"])) {
      return;
    }
    const settings = parseMapPBlockSettings(props);
    if (settings) {
      blocks.push({ blockId: props["id"], settings });
    }
  });
  return blocks;
}

function _getMapIds(dashboardConfig: unknown): AvaMap.Id[] {
  return Array.from(
    new Set(
      _getMapBlocks(dashboardConfig)
        .map((block) => {
          return block.settings.mapId;
        })
        .filter(isDefined),
    ),
  );
}

/** Reads the Map blocks out of a saved dashboard page, at any depth. */
export const DashboardMapBlocks = {
  /** Every readable Map block, in document order. */
  getMapBlocks: _getMapBlocks,

  /** Each map the page's blocks show, once, in first-use order. */
  getMapIds: _getMapIds,
};
```

Run the same command. Expected: 2 passed.

- [ ] **Step 6: Commit.**

```bash
git add src/views/GisApp/MapViewer/MapViewer.types.ts src/views/DashboardApp/AvaPage/pblocks/MapPBlock/parseMapPBlockSettings src/clients/dashboards/DashboardMapBlocks
git commit -m "feat(dashboards): read map block settings from a saved dashboard"
```

---

## Task 11: Dashboard map snapshot helpers

**Files:**
- Create: `src/clients/dashboards/DashboardClient/dashboardSnapshotHelpers/dashboardMapSnapshots.ts`, `dashboardMapSnapshots.test.ts`

- [ ] **Step 1: Failing test.**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import {
  prepareMapSnapshots,
  uploadMapSnapshots,
} from "@/clients/dashboards/DashboardClient/dashboardSnapshotHelpers/dashboardMapSnapshots";
import { DASHBOARD } from "@/clients/dashboards/DashboardClient/__tests__/dashboardTransitionConstants";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";

const { createMapSnapshotMock, uploadMapSnapshotMock } = vi.hoisted(() => {
  return {
    createMapSnapshotMock: vi.fn(),
    uploadMapSnapshotMock: vi.fn(),
  };
});

vi.mock(
  "@/clients/maps/MapSnapshot/createMapSnapshotFromMapId/createMapSnapshotFromMapId",
  () => {
    return { createMapSnapshotFromMapId: createMapSnapshotMock };
  },
);
vi.mock(
  "@/clients/storage/PublicMapSnapshotStorageClient/PublicMapSnapshotStorageClient",
  () => {
    return {
      PublicMapSnapshotStorageClient: {
        uploadMapSnapshot: uploadMapSnapshotMock,
      },
    };
  },
);

const MAP_ID = "00000000-0000-4000-8000-0000000000f5" as AvaMap.Id;
const MAP_DASHBOARD = {
  ...DASHBOARD,
  config: {
    root: { props: { title: "Coverage" } },
    content: [
      { type: "Map", props: { id: "Map-1", mapId: MAP_ID } },
      { type: "Map", props: { id: "Map-2", mapId: MAP_ID } },
    ],
  },
};
const SNAPSHOT: MapSnapshot = {
  version: 1,
  mapId: MAP_ID,
  mapName: "Coverage risk",
  config: AvaMapConfig.makeEmpty(),
  layers: [],
};

describe("dashboardMapSnapshots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMapSnapshotMock.mockResolvedValue(SNAPSHOT);
  });

  it("compiles each map once for a public publish", async () => {
    const snapshots = await prepareMapSnapshots({
      dashboard: MAP_DASHBOARD,
      visibility: "public",
    });

    expect(snapshots).toEqual([SNAPSHOT]);
    expect(createMapSnapshotMock).toHaveBeenCalledWith({
      mapId: MAP_ID,
      workspaceId: DASHBOARD.workspaceId,
    });
  });

  it("compiles nothing for a workspace publish, whose maps stay live", async () => {
    await expect(
      prepareMapSnapshots({ dashboard: MAP_DASHBOARD, visibility: "workspace" }),
    ).resolves.toEqual([]);
    expect(createMapSnapshotMock).not.toHaveBeenCalled();
  });

  it("uploads every snapshot into the staged generation", async () => {
    await uploadMapSnapshots({
      bucket: "published",
      dashboardId: DASHBOARD.id,
      snapshotRevision: "44444444-4444-4444-8444-444444444444",
      mapSnapshots: [SNAPSHOT],
    });

    expect(uploadMapSnapshotMock).toHaveBeenCalledWith({
      bucket: "published",
      dashboardId: DASHBOARD.id,
      snapshotRevision: "44444444-4444-4444-8444-444444444444",
      snapshot: SNAPSHOT,
    });
  });
});
```

Run: `pnpm vitest run src/clients/dashboards/DashboardClient/dashboardSnapshotHelpers` Expected: FAIL, import not found.

- [ ] **Step 2: Implement.**

```ts
import { DashboardMapBlocks } from "@/clients/dashboards/DashboardMapBlocks/DashboardMapBlocks";
import { createMapSnapshotFromMapId } from "@/clients/maps/MapSnapshot/createMapSnapshotFromMapId/createMapSnapshotFromMapId";
import { PublicMapSnapshotStorageClient } from "@/clients/storage/PublicMapSnapshotStorageClient/PublicMapSnapshotStorageClient";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";
import type {
  PublishedVisibility,
  SnapshotBucketName,
} from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";

/**
 * Compiles every map a dashboard shows, but only for a public publish. A
 * workspace dashboard renders its maps live for viewers who can open them.
 */
export async function prepareMapSnapshots(
  options: Readonly<{
    dashboard: Dashboard.T;
    visibility: PublishedVisibility;
  }>,
): Promise<MapSnapshot[]> {
  if (options.visibility !== "public") {
    return [];
  }
  const snapshots: MapSnapshot[] = [];
  for (const mapId of DashboardMapBlocks.getMapIds(options.dashboard.config)) {
    // Maps compile one at a time so DuckDB holds one map's layers at once.
    // react-doctor-disable-next-line
    snapshots.push(
      await createMapSnapshotFromMapId({
        mapId,
        workspaceId: options.dashboard.workspaceId,
      }),
    );
  }
  return snapshots;
}

/** Writes compiled map snapshots into a staged snapshot generation. */
export async function uploadMapSnapshots(
  options: Readonly<{
    bucket: SnapshotBucketName;
    dashboardId: Dashboard.Id;
    snapshotRevision: string;
    mapSnapshots: readonly MapSnapshot[];
  }>,
): Promise<void> {
  await Promise.all(
    options.mapSnapshots.map((snapshot) => {
      return PublicMapSnapshotStorageClient.uploadMapSnapshot({
        bucket: options.bucket,
        dashboardId: options.dashboardId,
        snapshotRevision: options.snapshotRevision,
        snapshot,
      });
    }),
  );
}
```

Run the same command. Expected: 3 passed.

- [ ] **Step 3: Commit.**

```bash
git add src/clients/dashboards/DashboardClient/dashboardSnapshotHelpers/dashboardMapSnapshots.ts src/clients/dashboards/DashboardClient/dashboardSnapshotHelpers/dashboardMapSnapshots.test.ts
git commit -m "feat(dashboards): compile and stage a dashboard's map snapshots"
```

---

## Task 12: Publishing stages map snapshots

**Files:**
- Modify: `src/clients/dashboards/DashboardClient/publishDashboard.ts` (`_prepareDashboardForPublish`, `_stagePublishSnapshot`, `publishDashboard`)
- Modify: `src/clients/dashboards/DashboardClient/__tests__/DashboardClient.transitions.fixtures.ts`
- Create: `src/clients/dashboards/DashboardClient/__tests__/DashboardClient.publishMapSnapshots.test.ts`

- [ ] **Step 1: Mock the helpers in the shared fixture.** In `DashboardClient.transitions.fixtures.ts`:
  1. In the `vi.hoisted` block that returns `reconcileSnapshotsMock` and `uploadDatasetMock`, add to its destructured names and to its returned object:

```ts
    prepareMapSnapshotsMock: vi.fn(async () => {
      return [];
    }),
    uploadMapSnapshotsMock: vi.fn(async () => {
      return undefined;
    }),
```

  2. Before `export const { DashboardClient } = await import(...)`, add:

```ts
vi.mock(
  "@/clients/dashboards/DashboardClient/dashboardSnapshotHelpers/dashboardMapSnapshots",
  () => {
    return {
      prepareMapSnapshots: prepareMapSnapshotsMock,
      uploadMapSnapshots: uploadMapSnapshotsMock,
    };
  },
);
```

  3. Add `prepareMapSnapshotsMock` and `uploadMapSnapshotsMock` to the final `export { ... }` list.

- [ ] **Step 2: Failing test.** `DashboardClient.publishMapSnapshots.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import {
  DashboardClient,
  dbUpdateMock,
  operationLog,
  prepareMapSnapshotsMock,
  uploadDatasetMock,
  uploadMapSnapshotsMock,
} from "@/clients/dashboards/DashboardClient/__tests__/DashboardClient.transitions.fixtures";
import {
  DASHBOARD_ID,
  SNAPSHOT_REVISION,
} from "@/clients/dashboards/DashboardClient/__tests__/dashboardTransitionConstants";
import {
  makePublishConfig,
  setUpDashboardTransitionMocks,
} from "@/clients/dashboards/DashboardClient/__tests__/dashboardTransitionScenarios";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";

const MAP_SNAPSHOT: MapSnapshot = {
  version: 1,
  mapId: "00000000-0000-4000-8000-0000000000f5" as AvaMap.Id,
  mapName: "Coverage risk",
  config: AvaMapConfig.makeEmpty(),
  layers: [],
};

beforeEach(() => {
  setUpDashboardTransitionMocks();
});

describe("DashboardClient.publishDashboard map snapshots", () => {
  it("stages each map snapshot in the claimed public generation before reconciling", async () => {
    prepareMapSnapshotsMock.mockResolvedValueOnce([MAP_SNAPSHOT]);
    uploadMapSnapshotsMock.mockImplementationOnce(async () => {
      operationLog.push("upload-maps:published");
    });

    await DashboardClient.publishDashboard({
      dashboardId: DASHBOARD_ID,
      visibility: "public",
      publishConfig: makePublishConfig(),
    });

    expect(prepareMapSnapshotsMock).toHaveBeenCalledWith(
      expect.objectContaining({ visibility: "public" }),
    );
    expect(uploadMapSnapshotsMock).toHaveBeenCalledWith({
      bucket: "published",
      dashboardId: DASHBOARD_ID,
      snapshotRevision: SNAPSHOT_REVISION,
      mapSnapshots: [MAP_SNAPSHOT],
    });
    expect(operationLog.indexOf("upload-maps:published")).toBeLessThan(
      operationLog.indexOf("reconcile:published"),
    );
  });

  it("writes and claims nothing when a map fails to compile", async () => {
    prepareMapSnapshotsMock.mockRejectedValueOnce(
      new Error("map layer could not be drawn"),
    );

    await expect(
      DashboardClient.publishDashboard({
        dashboardId: DASHBOARD_ID,
        visibility: "public",
        publishConfig: makePublishConfig(),
      }),
    ).rejects.toThrow("map layer could not be drawn");

    expect(uploadDatasetMock).not.toHaveBeenCalled();
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });
});
```

Run: `pnpm vitest run src/clients/dashboards/DashboardClient/__tests__/DashboardClient.publishMapSnapshots.test.ts` Expected: FAIL, `prepareMapSnapshotsMock` never called.

- [ ] **Step 3: Implement.** In `publishDashboard.ts`:
  1. Add imports:

```ts
import {
  prepareMapSnapshots,
  uploadMapSnapshots,
} from "@/clients/dashboards/DashboardClient/dashboardSnapshotHelpers/dashboardMapSnapshots";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";
```

  2. In `_prepareDashboardForPublish`, extend the return type with `mapSnapshots: MapSnapshot[];`, and after `const prepared = await preparePublishSnapshot({...});` add:

```ts
  // Compiled before the claim, so a map that cannot be drawn stops the
  // publish with nothing staged and nothing to abort.
  const mapSnapshots = await prepareMapSnapshots({
    dashboard,
    visibility: options.params.visibility,
  });
```

     and return `{ dashboard, prepared, uploadBucket, mapSnapshots }`.
  3. Change `_stagePublishSnapshot`'s parameter type to `Readonly<StagePublishSnapshotOptions & { context: DashboardMutationContext; mapSnapshots: readonly MapSnapshot[] }>` and, inside its `try`, after `await uploadPreparedSnapshots({ ...options, snapshotRevision });`, add:

```ts
    await uploadMapSnapshots({
      bucket: options.bucket,
      dashboardId: options.dashboard.id,
      snapshotRevision,
      mapSnapshots: options.mapSnapshots,
    });
```

  4. In `publishDashboard`, destructure `mapSnapshots` from `_prepareDashboardForPublish(...)` and pass `mapSnapshots,` to `_stagePublishSnapshot({...})`.

- [ ] **Step 4: Run every publish test.** `pnpm vitest run src/clients/dashboards/DashboardClient` Expected: all pass, including the two new ones.

- [ ] **Step 5: Commit.**

```bash
git add src/clients/dashboards/DashboardClient
git commit -m "feat(dashboards): publish map snapshots with a public dashboard"
```

---

## Task 13: Share the GIS app's hydration and rendering

Pure refactor; the GIS tests are the guard.

**Files:**
- Create: `src/views/GisApp/useGisApp/MapSourceHydration/useHydratedMapSources/useHydratedMapConfig.ts`
- Create: `src/views/GisApp/layers/useMapLayerRendering.ts`
- Modify: `src/views/GisApp/useGisApp/MapSourceHydration/useHydratedMapSources/useHydratedMapSources.ts`
- Modify: `src/views/GisApp/useGisApp/useGisAppRendering.ts`

- [ ] **Step 1: Baseline.** `pnpm vitest run src/views/GisApp/useGisApp src/views/GisApp/__tests__` Expected: all pass. Note the count.

- [ ] **Step 2: Create `useHydratedMapConfig.ts`.** Move `useReadyMapMetadata` and `useMapSourceHydration` out of `useHydratedMapSources.ts` unchanged, and add the exported hook:

```ts
import { where } from "@avandar/utils";
import { useState } from "react";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { MapSourceHydration } from "../MapSourceHydration";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { Workspace } from "$/models/Workspace/Workspace";

/** A config hydrated from workspace metadata, plus the metadata it used. */
export type HydratedMapConfig = ReturnType<
  typeof MapSourceHydration.fromMetadata
> & {
  readyColumns: DatasetColumn.T[] | undefined;
  readyAttributes: ConceptAttribute.T[] | undefined;
};

function useReadyMapMetadata({
  config,
  workspaceId,
}: {
  config: AvaMapConfig.T;
  workspaceId: Workspace.Id;
}): {
  readyColumns: DatasetColumn.T[] | undefined;
  readyAttributes: ConceptAttribute.T[] | undefined;
} {
  const [datasetColumns, , datasetQuery] = DatasetColumnClient.useGetAll(
    where("workspace_id", "eq", workspaceId),
  );
  const [conceptAttributes, , conceptQuery] = ConceptAttributeClient.useGetAll({
    ...where("workspace_id", "eq", workspaceId),
    useQueryOptions: {
      enabled: config.layers.some((layer) => {
        return layer.source.dataSource?.__type === "Concept";
      }),
    },
  });
  const readyColumns = datasetQuery?.isSuccess ? datasetColumns : undefined;
  const readyAttributes = conceptQuery?.isSuccess
    ? conceptAttributes
    : undefined;
  return { readyColumns, readyAttributes };
}

function useMapSourceHydration({
  config,
  readyColumns,
  readyAttributes,
}: {
  config: AvaMapConfig.T;
  readyColumns: readonly DatasetColumn.T[] | undefined;
  readyAttributes: readonly ConceptAttribute.T[] | undefined;
}): ReturnType<typeof MapSourceHydration.fromMetadata> {
  const [previousHydrationState, setPreviousHydrationState] = useState(() => {
    return {
      input: config,
      readyColumns,
      readyAttributes,
      result: MapSourceHydration.fromMetadata({
        config: config,
        datasetColumns: readyColumns,
        conceptAttributes: readyAttributes,
      }),
    };
  });
  let result = previousHydrationState.result;
  if (
    previousHydrationState.input !== config ||
    previousHydrationState.readyColumns !== readyColumns ||
    previousHydrationState.readyAttributes !== readyAttributes
  ) {
    result = MapSourceHydration.fromMetadata({
      config: config,
      previousInput: previousHydrationState.input,
      previousConfig: previousHydrationState.result.config,
      datasetColumns: readyColumns,
      conceptAttributes: readyAttributes,
    });
    setPreviousHydrationState({
      input: config,
      readyColumns,
      readyAttributes,
      result,
    });
  }
  return result;
}

/**
 * Hydrates a map config's layer sources from the workspace's column
 * metadata, with no editor attached. The GIS editor and the read-only map
 * viewer both hydrate through this, so their layer queries match.
 */
export function useHydratedMapConfig(
  options: Readonly<{ config: AvaMapConfig.T; workspaceId: Workspace.Id }>,
): HydratedMapConfig {
  const { readyColumns, readyAttributes } = useReadyMapMetadata(options);
  const result = useMapSourceHydration({
    config: options.config,
    readyColumns,
    readyAttributes,
  });
  return { ...result, readyColumns, readyAttributes };
}
```

- [ ] **Step 3: Slim `useHydratedMapSources.ts`.** Delete `useReadyMapMetadata` and `useMapSourceHydration` and the now-unused imports (`where`, `useState`, `DatasetColumnClient`, `ConceptAttributeClient`); add `import { useHydratedMapConfig } from "./useHydratedMapConfig";`; replace the body of `useHydratedMapSources` with:

```ts
  const hydration = useHydratedMapConfig({
    config: editor.mapConfig,
    workspaceId,
  });
  useMissingFilterNotification(hydration.issues);
  const updateConfig = useHydratedUpdateConfig({
    updateEditorConfig: editor.updateConfig,
    latestHydration: {
      previousInput: editor.mapConfig,
      previousConfig: hydration.config,
      readyColumns: hydration.readyColumns,
      readyAttributes: hydration.readyAttributes,
    },
  });
  return { ...editor, mapConfig: hydration.config, updateConfig };
```

- [ ] **Step 4: Create `src/views/GisApp/layers/useMapLayerRendering.ts`.**

```ts
import { where } from "@avandar/utils";
import { useMemo } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { createMapOverlayFromMapConfig } from "@/views/GisApp/layers/createMapOverlayFromMapConfig";
import { useAvaMapRender } from "@/views/GisApp/layers/useAvaMapRender/useAvaMapRender";
import { useMapLayersData } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { AvaMapRender } from "@/views/GisApp/layers/useAvaMapRender/useAvaMapRender";
import type { MapLayerQueryState } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData";

/** Loaded layer data plus the renderable map specification. */
export type MapLayerRendering = AvaMapRender & {
  layerFeatureCollections: Map<MapLayer.Id, GeoJSON.FeatureCollection>;
};

/** Collects already-loaded spatial FeatureCollections, keyed by layer. */
function _getSpatialFeatureCollections(
  layerQueryStates: ReadonlyMap<MapLayer.Id, MapLayerQueryState>,
): Map<MapLayer.Id, GeoJSON.FeatureCollection> {
  const collections = new Map<MapLayer.Id, GeoJSON.FeatureCollection>();
  layerQueryStates.forEach((state, layerId) => {
    if (state.data?.type === "spatial") {
      collections.set(layerId, state.data.featureCollection);
    }
  });
  return collections;
}

/**
 * Runs every layer's query and derives the map spec from the results. The
 * GIS editor and the read-only map viewer both draw through this, so the
 * same map cannot render differently in the two places.
 */
export function useMapLayerRendering(
  options: Readonly<{
    mapConfig: AvaMapConfig.T;
    workspaceId: Workspace.Id;
    view: AvaMapConfig.ViewState;
    hiddenAnnotationFeatureIds?: readonly AvaMapConfig.AnnotationFeatureId[];
  }>,
): MapLayerRendering {
  const [datasets = []] = DatasetClient.useGetAll(
    where("workspace_id", "eq", options.workspaceId),
  );
  const [datasetColumns = []] = DatasetColumnClient.useGetAll(
    where("workspace_id", "eq", options.workspaceId),
  );
  const zoomBand = Math.max(0, Math.min(24, Math.floor(options.view.zoom)));
  const simplificationReferenceLatitude = useMemo(() => {
    return options.view.center[1];
    // Capture latitude only when a new integer zoom band begins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomBand]);
  const layerQueryStates = useMapLayersData({
    layers: options.mapConfig.layers,
    workspaceId: options.workspaceId,
    zoom: options.view.zoom,
    simplificationReferenceLatitude,
    datasets,
    datasetColumns,
    overlay: createMapOverlayFromMapConfig(options.mapConfig),
  });
  const rendering = useAvaMapRender({
    layerQueryStates,
    mapConfig: options.mapConfig,
    hiddenAnnotationFeatureIds: options.hiddenAnnotationFeatureIds,
  });
  return {
    ...rendering,
    layerFeatureCollections: _getSpatialFeatureCollections(layerQueryStates),
  };
}
```

- [ ] **Step 5: Slim `useGisAppRendering.ts`.** Replace the whole file with:

```ts
import { FitBoundsRequest } from "@/views/GisApp/layers/FitBoundsRequest/FitBoundsRequest";
import { PersistedLayerLegends } from "@/views/GisApp/layers/PersistedLayerLegends/PersistedLayerLegends";
import { useMapLayerRendering } from "@/views/GisApp/layers/useMapLayerRendering";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayerRendering } from "@/views/GisApp/layers/useMapLayerRendering";
import type { useAvaMapEditor } from "@/views/GisApp/useAvaMapEditor/useAvaMapEditor";
import type { GisAppChrome } from "@/views/GisApp/useGisApp/useGisAppChrome";

/** Loaded layer data plus the renderable map specification. */
export type GisAppRendering = MapLayerRendering;

/**
 * Loads layer data and derives the renderable map state from it, then does
 * what only the editor does: persists derived legends and fits new layers.
 */
export function useGisAppRendering(
  options: Readonly<{
    avaMap: AvaMap.T;
    chrome: GisAppChrome;
    editor: ReturnType<typeof useAvaMapEditor>;
    hiddenAnnotationFeatureIds?: readonly AvaMapConfig.AnnotationFeatureId[];
  }>,
): GisAppRendering {
  const rendering = useMapLayerRendering({
    mapConfig: options.editor.mapConfig,
    workspaceId: options.avaMap.workspaceId,
    view: options.editor.mapConfig.view,
    hiddenAnnotationFeatureIds: options.hiddenAnnotationFeatureIds,
  });
  PersistedLayerLegends.usePersistedLayerLegends({
    mapConfig: options.editor.mapConfig,
    legendUpdates: rendering.legendUpdates,
    updateConfig: options.editor.updateConfig,
  });
  FitBoundsRequest.useAutoFitNewLayers({
    layerBounds: rendering.layerBounds,
    requestFitBounds: options.chrome.requestFitBounds,
  });
  return rendering;
}
```

- [ ] **Step 6: Run.** Same command as Step 1. Expected: same count, all pass. Also `pnpm vitest run src/views/GisApp/useGisApp/MapSourceHydration`.

- [ ] **Step 7: Commit.**

```bash
git add src/views/GisApp/useGisApp src/views/GisApp/layers/useMapLayerRendering.ts
git commit -m "refactor(gis): share map hydration and rendering outside the editor"
```

---

## Task 14: Viewer helpers

**Files:**
- Create: `src/views/GisApp/MapViewer/mapViewerCameraToViewState/mapViewerCameraToViewState.ts` (+ `.test.ts`)
- Create: `src/views/GisApp/MapViewer/getMapViewerPopupFromClick/getMapViewerPopupFromClick.ts` (+ `.test.ts`)
- Create: `src/views/GisApp/MapViewer/createSnapshotLayerQueryStates/createSnapshotLayerQueryStates.ts` (+ `.test.ts`)
- Create: `src/views/GisApp/MapViewer/useMapInteractionMode/useMapInteractionMode.ts` (+ `.test.ts`)

- [ ] **Step 1: Failing tests.**

`mapViewerCameraToViewState.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { mapViewerCameraToViewState } from "@/views/GisApp/MapViewer/mapViewerCameraToViewState/mapViewerCameraToViewState";

const BRONX_VIEW = { center: [-73.86, 40.84] as [number, number], zoom: 12 };
const BOOKMARK = AvaMapConfig.makeBookmark({ name: "Bronx", view: BRONX_VIEW });
const CONFIG = { ...AvaMapConfig.makeEmpty(), bookmarks: [BOOKMARK] };

describe("mapViewerCameraToViewState", () => {
  it("opens on a bookmark's view", () => {
    expect(
      mapViewerCameraToViewState({
        camera: { type: "bookmark", bookmarkId: BOOKMARK.id },
        config: CONFIG,
      }),
    ).toEqual(BRONX_VIEW);
  });

  it("falls back to the saved view when the bookmark was deleted", () => {
    expect(
      mapViewerCameraToViewState({
        camera: { type: "bookmark", bookmarkId: BOOKMARK.id },
        config: { ...CONFIG, bookmarks: [] },
      }),
    ).toEqual(CONFIG.view);
  });
});
```

Before writing, open `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.ts` around `makeBookmark` (line 222) and match its argument shape; if it takes positional arguments, build the bookmark literally instead: `{ id: uuid<AvaMapConfig.BookmarkId>(), name: "Bronx", view: BRONX_VIEW }`.

`getMapViewerPopupFromClick.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import { getMapViewerPopupFromClick } from "@/views/GisApp/MapViewer/getMapViewerPopupFromClick/getMapViewerPopupFromClick";

const LAYER = MapLayer.makeEmpty("Schools");
const CONFIG = AvaMapConfig.withLayerAdded({
  config: AvaMapConfig.makeEmpty(),
  layer: LAYER,
});
const FEATURE: GeoJSON.Feature = {
  type: "Feature",
  geometry: { type: "Point", coordinates: [0, 0] },
  properties: {
    school_name: "PS 11",
    enrolled: 412,
    __avandar_feature_id: "f-1",
  },
};

describe("getMapViewerPopupFromClick", () => {
  it("lists a clicked feature's columns without render bookkeeping", () => {
    expect(
      getMapViewerPopupFromClick({
        config: CONFIG,
        feature: FEATURE,
        renderedLayerId: MapLayerIds.toLayerId(LAYER.id),
      }),
    ).toEqual({
      layerName: "Schools",
      rows: [
        { name: "school_name", value: "PS 11" },
        { name: "enrolled", value: "412" },
      ],
    });
  });

  it("ignores a click on something that is not a data layer", () => {
    expect(
      getMapViewerPopupFromClick({
        config: CONFIG,
        feature: FEATURE,
        renderedLayerId: MapLayerIds.annotationFillLayer,
      }),
    ).toBeUndefined();
  });
});
```

`createSnapshotLayerQueryStates.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { createSnapshotLayerQueryStates } from "@/views/GisApp/MapViewer/createSnapshotLayerQueryStates/createSnapshotLayerQueryStates";
import type { AvaMap } from "$/models/AvaMap/AvaMap";

describe("createSnapshotLayerQueryStates", () => {
  it("hands each snapshot layer to the renderer as finished snapshot data", () => {
    const layer = MapLayer.makeEmpty("Schools");
    const featureCollection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [],
    };

    const states = createSnapshotLayerQueryStates({
      version: 1,
      mapId: "00000000-0000-4000-8000-0000000000f5" as AvaMap.Id,
      mapName: "Coverage risk",
      config: AvaMapConfig.makeEmpty(),
      layers: [{ layerId: layer.id, featureCollection, aggregation: undefined }],
    });

    expect(states.get(layer.id)).toMatchObject({
      data: { type: "snapshot", featureCollection, aggregation: undefined },
      isLoading: false,
      error: undefined,
    });
  });
});
```

`useMapInteractionMode.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@/test-utils";
import {
  MAP_INTERACTION_HANDLER_NAMES,
  useMapInteractionMode,
} from "@/views/GisApp/MapViewer/useMapInteractionMode/useMapInteractionMode";

function _makeMap(): Record<
  (typeof MAP_INTERACTION_HANDLER_NAMES)[number],
  { enable: ReturnType<typeof vi.fn>; disable: ReturnType<typeof vi.fn> }
> {
  return Object.fromEntries(
    MAP_INTERACTION_HANDLER_NAMES.map((handlerName) => {
      return [handlerName, { enable: vi.fn(), disable: vi.fn() }];
    }),
  ) as ReturnType<typeof _makeMap>;
}

describe("useMapInteractionMode", () => {
  it("turns every pan, zoom, and rotate handler off for a fixed picture", () => {
    const map = _makeMap();

    renderHook(() => {
      useMapInteractionMode({
        mapInstance: { mapRef: { current: map } },
        isInteractive: false,
      });
    });

    MAP_INTERACTION_HANDLER_NAMES.forEach((handlerName) => {
      expect(map[handlerName].disable).toHaveBeenCalledOnce();
    });
  });

  it("turns them back on for an interactive map", () => {
    const map = _makeMap();

    renderHook(() => {
      useMapInteractionMode({
        mapInstance: { mapRef: { current: map } },
        isInteractive: true,
      });
    });

    expect(map.scrollZoom.enable).toHaveBeenCalledOnce();
  });
});
```

Run: `pnpm vitest run src/views/GisApp/MapViewer` Expected: FAIL, four imports not found.

- [ ] **Step 2: Implement the four helpers.**

`mapViewerCameraToViewState.ts`:

```ts
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapViewerCamera } from "@/views/GisApp/MapViewer/MapViewer.types";

/**
 * The camera a read-only map opens on. A bookmark the author has since
 * deleted falls back to the map's saved view rather than to nowhere.
 */
export function mapViewerCameraToViewState(
  options: Readonly<{ camera: MapViewerCamera; config: AvaMapConfig.T }>,
): AvaMapConfig.ViewState {
  const { camera, config } = options;
  if (camera.type === "saved") {
    return config.view;
  }
  const bookmark = config.bookmarks.find((candidate) => {
    return candidate.id === camera.bookmarkId;
  });
  return bookmark?.view ?? config.view;
}
```

`getMapViewerPopupFromClick.ts`:

```ts
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { MapLayerSpatialFeatureProperties } from "@/clients/maps/MapLayerSpatialQuery/MapLayerSpatialQuery.constants";
import { PointAggregateProperties } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/PointAggregate.constants";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

/** What a read-only map shows for one clicked feature. */
export type MapViewerPopup = {
  layerName: string;
  rows: ReadonlyArray<{ name: string; value: string }>;
};

const RENDER_PROPERTY_NAMES: ReadonlySet<string> = new Set([
  ...Object.values(MapLayerSpatialFeatureProperties),
  ...Object.values(PointAggregateProperties),
]);

function _formatPropertyValue(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

/**
 * The popup for a click on a read-only map: the clicked layer's popup
 * columns, in popup order, read from the feature. `undefined` when the click
 * did not land on a data layer.
 */
export function getMapViewerPopupFromClick(
  options: Readonly<{
    config: AvaMapConfig.T;
    feature: GeoJSON.Feature;
    renderedLayerId: string;
  }>,
): MapViewerPopup | undefined {
  const layer = options.config.layers.find((candidate) => {
    return (
      MapLayerIds.toLayerId(candidate.id) === options.renderedLayerId ||
      MapLayerIds.getUnclusteredLayerIdFromLayerId(candidate.id) ===
        options.renderedLayerId
    );
  });
  if (!layer) {
    return undefined;
  }
  const properties = options.feature.properties ?? {};
  const popupNames = MapLayer.toPopupColumnNames(layer);
  const names = (
    popupNames === "all" ? Object.keys(properties) : popupNames
  ).filter((name) => {
    return name in properties && !RENDER_PROPERTY_NAMES.has(name);
  });
  return {
    layerName: layer.name,
    rows: names.map((name) => {
      return { name, value: _formatPropertyValue(properties[name]) };
    }),
  };
}
```

`createSnapshotLayerQueryStates.ts`:

```ts
import { noop } from "@avandar/utils";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";
import type { MapLayerQueryState } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData";

/**
 * Presents a snapshot's layers to the layer renderer as finished queries, so
 * a public map is drawn by the same code as a live one, with no DuckDB.
 */
export function createSnapshotLayerQueryStates(
  snapshot: Readonly<MapSnapshot>,
): Map<MapLayer.Id, MapLayerQueryState> {
  return new Map(
    snapshot.layers.map((snapshotLayer) => {
      return [
        snapshotLayer.layerId,
        {
          data: {
            type: "snapshot",
            featureCollection: snapshotLayer.featureCollection,
            aggregation: snapshotLayer.aggregation,
          },
          isLoading: false,
          isRefreshing: false,
          error: undefined,
          refetch: noop,
        },
      ];
    }),
  );
}
```

`useMapInteractionMode.ts`:

```ts
import { useEffect } from "react";
import type { RefObject } from "react";

/** MapLibre's camera gesture handlers, all of which a fixed picture turns off. */
export const MAP_INTERACTION_HANDLER_NAMES = [
  "boxZoom",
  "doubleClickZoom",
  "dragPan",
  "dragRotate",
  "keyboard",
  "scrollZoom",
  "touchZoomRotate",
  "touchPitch",
] as const;

type MapInteractionTarget = Record<
  (typeof MAP_INTERACTION_HANDLER_NAMES)[number],
  { enable: () => void; disable: () => void }
>;

/**
 * Turns a map's pan, zoom, and rotate gestures on or off. Re-applies whenever
 * the map instance changes, because the instance is created after the first
 * render.
 */
export function useMapInteractionMode(
  options: Readonly<{
    mapInstance: {
      mapRef: RefObject<MapInteractionTarget | null | undefined>;
    };
    isInteractive: boolean;
  }>,
): void {
  const { mapInstance, isInteractive } = options;
  useEffect(
    function applyMapInteractionMode() {
      const map = mapInstance.mapRef.current;
      if (!map) {
        return;
      }
      MAP_INTERACTION_HANDLER_NAMES.forEach((handlerName) => {
        if (isInteractive) {
          map[handlerName].enable();
        } else {
          map[handlerName].disable();
        }
      });
    },
    [mapInstance, isInteractive],
  );
}
```

- [ ] **Step 3: Run.** `pnpm vitest run src/views/GisApp/MapViewer` Expected: 7 passed.

- [ ] **Step 4: Commit.**

```bash
git add src/views/GisApp/MapViewer
git commit -m "feat(gis): add read-only map viewer helpers"
```

---

## Task 15: The read-only `MapViewer`

Before this task read `docs/design/app-view-layout.md`, the Named Rules in `DESIGN.md`, and `docs/design/gis/feature-home-inventory.md` §1.4 and §2 ("map, legend, and attribution only, with no panels"). Load the `impeccable` skill: this is a new surface.

**Files:** every `src/views/GisApp/MapViewer/*.tsx` and `MapViewer.module.css` in the file table; test `MapViewer.test.tsx`.

- [ ] **Step 1: Failing component test.** `src/views/GisApp/MapViewer/MapViewer.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { render, screen, waitFor } from "@/test-utils";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import { createQueryableLayer } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData.fixtures";
import { MapViewer } from "@/views/GisApp/MapViewer/MapViewer";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";
import type {
  MapViewerDisplay,
  MapViewerSource,
} from "@/views/GisApp/MapViewer/MapViewer.types";

const {
  downloadMapSnapshotMock,
  useGetDatasetsMock,
  useGetMapByIdMock,
  useMapCanvasSpy,
  useMapLayerRenderingMock,
} = vi.hoisted(() => {
  return {
    downloadMapSnapshotMock: vi.fn(),
    useGetDatasetsMock: vi.fn(),
    useGetMapByIdMock: vi.fn(),
    useMapCanvasSpy: vi.fn(),
    useMapLayerRenderingMock: vi.fn(),
  };
});

vi.mock("maplibre-gl/dist/maplibre-gl.css", () => {
  return {};
});
vi.mock("@/views/GisApp/MapCanvas/useMapCanvas", () => {
  return {
    useMapCanvas: (options: unknown) => {
      useMapCanvasSpy(options);
      return {
        containerRef: { current: null },
        mapInstance: { mapRef: { current: undefined } },
      };
    },
  };
});
vi.mock("@/clients/maps/AvaMapClient/AvaMapClient", () => {
  return { AvaMapClient: { useGetById: useGetMapByIdMock } };
});
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return { DatasetClient: { useGetAll: useGetDatasetsMock } };
});
vi.mock(
  "@/views/GisApp/useGisApp/MapSourceHydration/useHydratedMapSources/useHydratedMapConfig",
  () => {
    return {
      useHydratedMapConfig: ({ config }: { config: AvaMapConfig.T }) => {
        return {
          config,
          issues: [],
          readyColumns: [],
          readyAttributes: [],
        };
      },
    };
  },
);
vi.mock("@/views/GisApp/layers/useMapLayerRendering", () => {
  return { useMapLayerRendering: useMapLayerRenderingMock };
});
vi.mock(
  "@/views/GisApp/useRequestSpatialExtension/useRequestSpatialExtension",
  () => {
    return { useRequestSpatialExtension: vi.fn() };
  },
);
vi.mock(
  "@/clients/storage/PublicMapSnapshotStorageClient/PublicMapSnapshotStorageClient",
  () => {
    return {
      PublicMapSnapshotStorageClient: {
        downloadMapSnapshot: downloadMapSnapshotMock,
      },
    };
  },
);

const WORKSPACE_ID = "00000000-0000-4000-8000-0000000000aa" as Workspace.Id;
const MAP_ID = "00000000-0000-4000-8000-0000000000f5" as AvaMap.Id;
const DISPLAY: MapViewerDisplay = {
  camera: { type: "saved" },
  heightPx: 400,
  showLegend: true,
  isInteractive: true,
};
const LIVE_SOURCE: MapViewerSource = {
  type: "live",
  mapId: MAP_ID,
  workspaceId: WORKSPACE_ID,
};
const SNAPSHOT_SOURCE: MapViewerSource = {
  type: "snapshot",
  mapId: MAP_ID,
  dashboardId: "00000000-0000-4000-8000-0000000000d1" as Dashboard.Id,
  snapshotRevision: "00000000-0000-4000-8000-0000000000e1",
};

function _makeMap(layers: readonly MapLayer.T[]): AvaMap.T {
  return {
    id: MAP_ID,
    name: "Coverage risk",
    workspaceId: WORKSPACE_ID,
    config: { ...AvaMapConfig.makeEmpty(), layers: [...layers] },
  } as AvaMap.T;
}

function _makeRendering(hasDrawnDisputedFeature = false): unknown {
  return {
    spec: { sources: {}, layers: [] },
    interactiveLayerIds: [],
    layerViewStates: new Map(),
    layerBounds: new Map(),
    legendUpdates: new Map(),
    hasDrawnDisputedFeature,
    layerFeatureCollections: new Map(),
  };
}

function _render(source: MapViewerSource): void {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MapViewer source={source} display={DISPLAY} />
    </QueryClientProvider>,
  );
}

describe("MapViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGetDatasetsMock.mockReturnValue([[], false]);
    useMapLayerRenderingMock.mockReturnValue(_makeRendering());
  });

  it("shows a live map's legend and attribution to a viewer with access", () => {
    useGetMapByIdMock.mockReturnValue([
      _makeMap([MapLayer.makeEmpty("Schools")]),
      false,
    ]);

    _render(LIVE_SOURCE);

    expect(
      screen.getByRole("region", { name: "Map of Coverage risk" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Schools")).toBeInTheDocument();
    expect(
      screen.getByText("MapLibre, OpenStreetMap contributors"),
    ).toBeInTheDocument();
  });

  it("tells a viewer who cannot read the map that they have no access", () => {
    useGetMapByIdMock.mockReturnValue([undefined, false]);

    _render(LIVE_SOURCE);

    expect(
      screen.getByText("You don't have access to this map"),
    ).toBeInTheDocument();
    expect(useMapCanvasSpy).not.toHaveBeenCalled();
  });

  it("tells a viewer who cannot read a layer's dataset that they have no access", () => {
    useGetMapByIdMock.mockReturnValue([
      _makeMap([createQueryableLayer()]),
      false,
    ]);

    _render(LIVE_SOURCE);

    expect(
      screen.getByText("You don't have access to this map"),
    ).toBeInTheDocument();
  });

  it("shows the map's disclaimer when a disputed boundary is drawn", () => {
    const map = _makeMap([MapLayer.makeEmpty("Districts")]);
    useGetMapByIdMock.mockReturnValue([
      {
        ...map,
        config: {
          ...map.config,
          exportLayout: {
            ...map.config.exportLayout,
            disclaimer: "Lines are not borders.",
          },
        },
      },
      false,
    ]);
    useMapLayerRenderingMock.mockReturnValue(_makeRendering(true));

    _render(LIVE_SOURCE);

    expect(screen.getByText("Lines are not borders.")).toBeInTheDocument();
  });

  it("draws a public map from its snapshot without running layer queries", async () => {
    const layer = createQueryableLayer();
    const point: GeoJSON.Point = { type: "Point", coordinates: [-73.98, 40.75] };
    const snapshot: MapSnapshot = {
      version: 1,
      mapId: MAP_ID,
      mapName: "Coverage risk",
      config: { ...AvaMapConfig.makeEmpty(), layers: [layer] },
      layers: [
        {
          layerId: layer.id,
          featureCollection: {
            type: "FeatureCollection",
            features: [
              { type: "Feature", id: 0, geometry: point, properties: {} },
            ],
          },
          aggregation: undefined,
        },
      ],
    };
    downloadMapSnapshotMock.mockResolvedValue(snapshot);

    _render(SNAPSHOT_SOURCE);

    await waitFor(() => {
      const spec = useMapCanvasSpy.mock.lastCall?.[0]?.spec;
      expect(
        spec?.sources[MapLayerIds.toSourceId(layer.id)]?.data.features[0]
          ?.geometry,
      ).toEqual(point);
    });
    expect(useMapLayerRenderingMock).not.toHaveBeenCalled();
  });

  it("explains a map that was added after the last publish", async () => {
    downloadMapSnapshotMock.mockResolvedValue(undefined);

    _render(SNAPSHOT_SOURCE);

    expect(
      await screen.findByText(
        "This map was added after the dashboard was last published. Publish again to show it here.",
      ),
    ).toBeInTheDocument();
  });
});
```

Run: `pnpm vitest run src/views/GisApp/MapViewer/MapViewer.test.tsx` Expected: FAIL, `MapViewer` not found.

- [ ] **Step 2: Styles.** `MapViewer.module.css`:

```css
.mapViewer {
  display: flex;
  flex-direction: column;
  gap: var(--mantine-spacing-xxs);
}

.mapViewerCanvas {
  border: 1px solid var(--ava-border-default);
  border-radius: var(--mantine-radius-sm);
  overflow: hidden;
  position: relative;
  width: 100%;
}

/* A fixed picture offers no zoom buttons, since nothing on it moves. */
.mapViewerCanvas--fixed :global(.maplibregl-ctrl-top-right) {
  display: none;
}

.mapViewerLegend {
  bottom: var(--mantine-spacing-sm);
  max-height: calc(100% - 2 * var(--mantine-spacing-sm));
  overflow: auto;
  position: absolute;
  right: var(--mantine-spacing-sm);
  z-index: 1;
}

.mapViewerPopup {
  left: var(--mantine-spacing-sm);
  max-width: 280px;
  position: absolute;
  top: var(--mantine-spacing-sm);
  z-index: 2;
}

.mapViewerState {
  align-items: center;
  border: 1px dashed var(--ava-border-default);
  border-radius: var(--mantine-radius-sm);
  display: flex;
  justify-content: center;
  padding: var(--mantine-spacing-md);
}
```

- [ ] **Step 3: Leaf components.**

`MapViewerState.tsx`:

```tsx
import { matchLiteral } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Loader, Stack, Text } from "@mantine/core";
import { IconLock } from "@tabler/icons-react";
import css from "@/views/GisApp/MapViewer/MapViewer.module.css";
import type { ReactNode } from "react";

type Props = {
  kind: "loading" | "noAccess" | "missingSnapshot";
  heightPx: number;
};

/** What a map block shows instead of a map: loading, no access, or no snapshot. */
export function MapViewerState({ kind, heightPx }: Props): ReactNode {
  const { t } = useLingui();
  return (
    <div className={css.mapViewerState} style={{ minHeight: heightPx }}>
      {matchLiteral(kind, {
        loading: () => {
          return <Loader size="sm" aria-label={t`Loading the map`} />;
        },
        noAccess: () => {
          return (
            <Stack align="center" gap={4}>
              <IconLock size={24} aria-hidden />
              <Text fw={600} size="sm">
                <Trans>You don't have access to this map</Trans>
              </Text>
              <Text size="xs" c="dimmed" ta="center">
                <Trans>
                  Ask the map's owner to share the map and its data with you.
                </Trans>
              </Text>
            </Stack>
          );
        },
        missingSnapshot: () => {
          return (
            <Text size="sm" c="dimmed" ta="center">
              <Trans>
                This map was added after the dashboard was last published.
                Publish again to show it here.
              </Trans>
            </Text>
          );
        },
      })}
    </div>
  );
}
```

`MapViewerLegend.tsx`:

```tsx
import { prop } from "@avandar/utils";
import { useMemo, useState } from "react";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import css from "@/views/GisApp/MapViewer/MapViewer.module.css";
import { MapLegend } from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegend";
import type { ReactNode } from "react";

type Props = { config: AvaMapConfig.T; hasDrawnDisputedFeature: boolean };

/** The GIS legend, floating over a read-only map's canvas. */
export function MapViewerLegend({
  config,
  hasDrawnDisputedFeature,
}: Props): ReactNode {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const layers = useMemo(() => {
    return AvaMapConfig.toStackOrder(config).filter(prop("isVisible"));
  }, [config]);
  return (
    <div className={css.mapViewerLegend}>
      <MapLegend
        layers={layers}
        hasDrawnDisputedFeature={hasDrawnDisputedFeature}
        isCollapsed={isCollapsed}
        onToggleCollapsed={() => {
          setIsCollapsed((current) => {
            return !current;
          });
        }}
      />
    </div>
  );
}
```

`MapViewerFurniture.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { useBasemapAttribution } from "@/views/GisApp/useBasemapAttribution";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ReactNode } from "react";

type Props = { config: AvaMapConfig.T; hasDrawnDisputedFeature: boolean };

/**
 * Attribution under a read-only map, plus the map's boundary disclaimer
 * whenever a disputed or undetermined boundary is drawn, matching the GIS
 * bottom bar.
 */
export function MapViewerFurniture({
  config,
  hasDrawnDisputedFeature,
}: Props): ReactNode {
  const { t } = useLingui();
  const attribution = useBasemapAttribution(config.basemap);
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed">
        {attribution}
      </Text>
      {hasDrawnDisputedFeature ? (
        <Text size="xs" c="dimmed">
          {config.exportLayout.disclaimer ??
            t`The boundaries and names shown do not imply official endorsement or acceptance.`}
        </Text>
      ) : null}
    </Stack>
  );
}
```

`MapViewerPopupCard.tsx`:

```tsx
import { Paper } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { CloseButton, Group, Stack, Text } from "@mantine/core";
import css from "@/views/GisApp/MapViewer/MapViewer.module.css";
import type { MapViewerPopup } from "@/views/GisApp/MapViewer/getMapViewerPopupFromClick/getMapViewerPopupFromClick";
import type { ReactNode } from "react";

type Props = { popup: MapViewerPopup; onClose: () => void };

/** A clicked feature's popup columns, pinned to the map's corner. */
export function MapViewerPopupCard({ popup, onClose }: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Paper
      className={css.mapViewerPopup}
      p="xs"
      role="region"
      aria-label={popup.layerName}
    >
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Text size="sm" fw={600}>
          {popup.layerName}
        </Text>
        <CloseButton size="sm" aria-label={t`Close`} onClick={onClose} />
      </Group>
      <Stack gap={2} mt={4}>
        {popup.rows.map((row) => {
          return (
            <Text key={row.name} size="xs">
              <Text span fw={600} size="xs">
                {row.name}
              </Text>{" "}
              {row.value}
            </Text>
          );
        })}
      </Stack>
    </Paper>
  );
}
```

- [ ] **Step 4: The frame.** `MapViewerFrame.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import clsx from "clsx";
import { useState } from "react";
import { MapCanvasSurface } from "@/views/GisApp/MapCanvas/MapCanvasSurface/MapCanvasSurface";
import { useMapCanvas } from "@/views/GisApp/MapCanvas/useMapCanvas";
import { getMapViewerPopupFromClick } from "@/views/GisApp/MapViewer/getMapViewerPopupFromClick/getMapViewerPopupFromClick";
import css from "@/views/GisApp/MapViewer/MapViewer.module.css";
import { MapViewerFurniture } from "@/views/GisApp/MapViewer/MapViewerFurniture";
import { MapViewerLegend } from "@/views/GisApp/MapViewer/MapViewerLegend";
import { MapViewerPopupCard } from "@/views/GisApp/MapViewer/MapViewerPopupCard";
import { useMapInteractionMode } from "@/views/GisApp/MapViewer/useMapInteractionMode/useMapInteractionMode";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { AvaMapRender } from "@/views/GisApp/layers/useAvaMapRender/useAvaMapRender";
import type { MapViewerPopup } from "@/views/GisApp/MapViewer/getMapViewerPopupFromClick/getMapViewerPopupFromClick";
import type { MapViewerDisplay } from "@/views/GisApp/MapViewer/MapViewer.types";
import type { ReactNode } from "react";

type Props = {
  mapName: string;
  config: AvaMapConfig.T;
  rendering: AvaMapRender;
  initialView: AvaMapConfig.ViewState;
  onViewChange: (view: AvaMapConfig.ViewState) => void;
  display: MapViewerDisplay;
};

/**
 * A read-only map: the canvas, its legend, a click popup, and its
 * attribution. No panels, tools, or editing.
 */
export function MapViewerFrame(props: Props): ReactNode {
  const { config, display, rendering } = props;
  const { t } = useLingui();
  const [popup, setPopup] = useState<MapViewerPopup | undefined>();
  const { containerRef, mapInstance } = useMapCanvas({
    basemap: config.basemap,
    view: props.initialView,
    spec: rendering.spec,
    fitBoundsRequest: undefined,
    interactiveLayerIds: display.isInteractive
      ? rendering.interactiveLayerIds
      : [],
    onFeatureClick: (feature, renderedLayerId) => {
      setPopup(getMapViewerPopupFromClick({ config, feature, renderedLayerId }));
    },
    onViewChange: props.onViewChange,
  });
  useMapInteractionMode({ mapInstance, isInteractive: display.isInteractive });
  return (
    <section aria-label={t`Map of ${props.mapName}`} className={css.mapViewer}>
      <div
        className={clsx(
          css.mapViewerCanvas,
          !display.isInteractive && css["mapViewerCanvas--fixed"],
        )}
        style={{ height: display.heightPx }}
      >
        <MapCanvasSurface containerRef={containerRef} />
        {display.showLegend ? (
          <MapViewerLegend
            config={config}
            hasDrawnDisputedFeature={rendering.hasDrawnDisputedFeature}
          />
        ) : null}
        {popup ? (
          <MapViewerPopupCard
            popup={popup}
            onClose={() => {
              setPopup(undefined);
            }}
          />
        ) : null}
      </div>
      <MapViewerFurniture
        config={config}
        hasDrawnDisputedFeature={rendering.hasDrawnDisputedFeature}
      />
    </section>
  );
}
```

- [ ] **Step 5: Live mode.** `useLiveMapViewerState.ts`:

```ts
import { prop, where } from "@avandar/utils";
import { useMemo, useState } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { getDatasetIdsFromMapConfig } from "@/clients/maps/getDatasetIdsFromMapConfig/getDatasetIdsFromMapConfig";
import { PersistedLayerLegends } from "@/views/GisApp/layers/PersistedLayerLegends/PersistedLayerLegends";
import { useMapLayerRendering } from "@/views/GisApp/layers/useMapLayerRendering";
import { mapViewerCameraToViewState } from "@/views/GisApp/MapViewer/mapViewerCameraToViewState/mapViewerCameraToViewState";
import { useHydratedMapConfig } from "@/views/GisApp/useGisApp/MapSourceHydration/useHydratedMapSources/useHydratedMapConfig";
import { useRequestSpatialExtension } from "@/views/GisApp/useRequestSpatialExtension/useRequestSpatialExtension";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayerRendering } from "@/views/GisApp/layers/useMapLayerRendering";
import type { MapViewerCamera } from "@/views/GisApp/MapViewer/MapViewer.types";

/** Whether the viewer can read every dataset the map's layers read. */
type MapDatasetAccess = "loading" | "granted" | "denied";

/** Everything a live read-only map needs to draw. */
export type LiveMapViewerState = {
  config: AvaMapConfig.T;
  rendering: MapLayerRendering;
  initialView: AvaMapConfig.ViewState;
  onViewChange: (view: AvaMapConfig.ViewState) => void;
  datasetAccess: MapDatasetAccess;
};

function useMapDatasetAccess(avaMap: AvaMap.T): MapDatasetAccess {
  const [datasets, isLoading] = DatasetClient.useGetAll(
    where("workspace_id", "eq", avaMap.workspaceId),
  );
  if (isLoading || !datasets) {
    return "loading";
  }
  const readableIds = new Set(datasets.map(prop("id")));
  return getDatasetIdsFromMapConfig(avaMap.config).every((datasetId) => {
    return readableIds.has(datasetId);
  })
    ? "granted"
    : "denied";
}

/**
 * Hydrates and renders a live map exactly like the GIS app, but keeps derived
 * legends and camera moves in memory: a viewer never writes to the map.
 */
export function useLiveMapViewerState(
  options: Readonly<{ avaMap: AvaMap.T; camera: MapViewerCamera }>,
): LiveMapViewerState {
  const { avaMap, camera } = options;
  useRequestSpatialExtension();
  const initialView = useMemo(() => {
    return mapViewerCameraToViewState({ camera, config: avaMap.config });
  }, [camera, avaMap.config]);
  const [currentView, setCurrentView] = useState(initialView);
  const hydration = useHydratedMapConfig({
    config: avaMap.config,
    workspaceId: avaMap.workspaceId,
  });
  const rendering = useMapLayerRendering({
    mapConfig: hydration.config,
    workspaceId: avaMap.workspaceId,
    view: currentView,
  });
  const config = useMemo(() => {
    return PersistedLayerLegends.withLegendUpdates({
      mapConfig: hydration.config,
      legendUpdates: rendering.legendUpdates,
    });
  }, [hydration.config, rendering.legendUpdates]);
  const datasetAccess = useMapDatasetAccess(avaMap);
  return {
    config,
    rendering,
    initialView,
    onViewChange: setCurrentView,
    datasetAccess,
  };
}
```

`LiveMapViewerContent.tsx`:

```tsx
import { MapViewerFrame } from "@/views/GisApp/MapViewer/MapViewerFrame";
import { MapViewerState } from "@/views/GisApp/MapViewer/MapViewerState";
import { useLiveMapViewerState } from "@/views/GisApp/MapViewer/useLiveMapViewerState";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { MapViewerDisplay } from "@/views/GisApp/MapViewer/MapViewer.types";
import type { ReactNode } from "react";

type Props = { avaMap: AvaMap.T; display: MapViewerDisplay };

/** A live map the viewer can read, or no-access when a dataset is hidden. */
export function LiveMapViewerContent({ avaMap, display }: Props): ReactNode {
  const state = useLiveMapViewerState({ avaMap, camera: display.camera });
  if (state.datasetAccess === "denied") {
    return <MapViewerState kind="noAccess" heightPx={display.heightPx} />;
  }
  return (
    <MapViewerFrame
      mapName={avaMap.name}
      config={state.config}
      rendering={state.rendering}
      initialView={state.initialView}
      onViewChange={state.onViewChange}
      display={display}
    />
  );
}
```

`LiveMapViewer.tsx`:

```tsx
import { AvaMapClient } from "@/clients/maps/AvaMapClient/AvaMapClient";
import { LiveMapViewerContent } from "@/views/GisApp/MapViewer/LiveMapViewerContent";
import { MapViewerState } from "@/views/GisApp/MapViewer/MapViewerState";
import type {
  MapViewerDisplay,
  MapViewerSource,
} from "@/views/GisApp/MapViewer/MapViewer.types";
import type { ReactNode } from "react";

type Props = {
  source: Extract<MapViewerSource, { type: "live" }>;
  display: MapViewerDisplay;
};

/**
 * Resolves a live map with the viewer's own access. RLS makes a restricted
 * map and a deleted one look the same, so both show no-access, as does a map
 * from another workspace.
 */
export function LiveMapViewer({ source, display }: Props): ReactNode {
  const [avaMap, isLoadingMap] = AvaMapClient.useGetById({ id: source.mapId });
  if (isLoadingMap) {
    return <MapViewerState kind="loading" heightPx={display.heightPx} />;
  }
  if (!avaMap || avaMap.workspaceId !== source.workspaceId) {
    return <MapViewerState kind="noAccess" heightPx={display.heightPx} />;
  }
  return <LiveMapViewerContent avaMap={avaMap} display={display} />;
}
```

- [ ] **Step 6: Snapshot mode.** `SnapshotMapViewerContent.tsx`:

```tsx
import { noop } from "@avandar/utils";
import { useMemo } from "react";
import { useAvaMapRender } from "@/views/GisApp/layers/useAvaMapRender/useAvaMapRender";
import { createSnapshotLayerQueryStates } from "@/views/GisApp/MapViewer/createSnapshotLayerQueryStates/createSnapshotLayerQueryStates";
import { mapViewerCameraToViewState } from "@/views/GisApp/MapViewer/mapViewerCameraToViewState/mapViewerCameraToViewState";
import { MapViewerFrame } from "@/views/GisApp/MapViewer/MapViewerFrame";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";
import type { MapViewerDisplay } from "@/views/GisApp/MapViewer/MapViewer.types";
import type { ReactNode } from "react";

type Props = { snapshot: MapSnapshot; display: MapViewerDisplay };

/** Draws a published snapshot through the live renderer, with no queries. */
export function SnapshotMapViewerContent({
  snapshot,
  display,
}: Props): ReactNode {
  const layerQueryStates = useMemo(() => {
    return createSnapshotLayerQueryStates(snapshot);
  }, [snapshot]);
  const rendering = useAvaMapRender({
    mapConfig: snapshot.config,
    layerQueryStates,
  });
  const initialView = useMemo(() => {
    return mapViewerCameraToViewState({
      camera: display.camera,
      config: snapshot.config,
    });
  }, [display.camera, snapshot.config]);
  return (
    <MapViewerFrame
      mapName={snapshot.mapName}
      config={snapshot.config}
      rendering={rendering}
      initialView={initialView}
      onViewChange={noop}
      display={display}
    />
  );
}
```

`SnapshotMapViewer.tsx`:

```tsx
import { useQuery } from "@avandar/query-hooks";
import { SnapshotStorageUtils } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import { PublicMapSnapshotStorageClient } from "@/clients/storage/PublicMapSnapshotStorageClient/PublicMapSnapshotStorageClient";
import { MapViewerState } from "@/views/GisApp/MapViewer/MapViewerState";
import { SnapshotMapViewerContent } from "@/views/GisApp/MapViewer/SnapshotMapViewerContent";
import type {
  MapViewerDisplay,
  MapViewerSource,
} from "@/views/GisApp/MapViewer/MapViewer.types";
import type { ReactNode } from "react";

type Props = {
  source: Extract<MapViewerSource, { type: "snapshot" }>;
  display: MapViewerDisplay;
};

/**
 * Downloads a public dashboard's map snapshot. A generation is immutable, so
 * the file never goes stale once read.
 */
export function SnapshotMapViewer({ source, display }: Props): ReactNode {
  const [download, isLoading] = useQuery({
    queryKey: [
      "map-snapshot",
      source.dashboardId,
      source.snapshotRevision,
      source.mapId,
    ],
    queryFn: async () => {
      // Wrapped because a query may not resolve to `undefined`.
      return {
        snapshot: await PublicMapSnapshotStorageClient.downloadMapSnapshot({
          bucket: SnapshotStorageUtils.PUBLIC_BUCKET_NAME,
          dashboardId: source.dashboardId,
          snapshotRevision: source.snapshotRevision,
          mapId: source.mapId,
        }),
      };
    },
    staleTime: Infinity,
  });
  if (!download?.snapshot) {
    return (
      <MapViewerState
        kind={isLoading ? "loading" : "missingSnapshot"}
        heightPx={display.heightPx}
      />
    );
  }
  return (
    <SnapshotMapViewerContent snapshot={download.snapshot} display={display} />
  );
}
```

- [ ] **Step 7: The switch.** `MapViewer.tsx`:

```tsx
import "maplibre-gl/dist/maplibre-gl.css";
import { LiveMapViewer } from "@/views/GisApp/MapViewer/LiveMapViewer";
import { SnapshotMapViewer } from "@/views/GisApp/MapViewer/SnapshotMapViewer";
import type {
  MapViewerDisplay,
  MapViewerSource,
} from "@/views/GisApp/MapViewer/MapViewer.types";
import type { ReactNode } from "react";

type Props = { source: MapViewerSource; display: MapViewerDisplay };

/**
 * A read-only GIS map for surfaces outside the GIS app, such as a dashboard
 * block: live from the map and its datasets, or from a published snapshot
 * that needs no DuckDB.
 */
export function MapViewer({ source, display }: Props): ReactNode {
  return source.type === "live" ? (
    <LiveMapViewer source={source} display={display} />
  ) : (
    <SnapshotMapViewer source={source} display={display} />
  );
}
```

- [ ] **Step 8: Run.** `pnpm vitest run src/views/GisApp/MapViewer` Expected: all pass (6 new plus 7 from Task 14).

- [ ] **Step 9: Commit.**

```bash
git add src/views/GisApp/MapViewer
git commit -m "feat(gis): add a read-only map viewer with live and snapshot modes"
```

---

## Task 16: The dashboard Map block

**Files:**
- Create: `src/views/DashboardApp/AvaPage/pblocks/MapPBlock/MapPBlock.tsx`, `MapPBlock.test.tsx`, `MapPBlockEmptyState.tsx`, `useMapPBlockConfig.tsx`
- Create: `src/views/DashboardApp/AvaPage/pblocks/MapPBlock/createMapViewerSourceFromMetadata/createMapViewerSourceFromMetadata.ts` (+ `.test.ts`)
- Create: `src/views/DashboardApp/AvaPage/pfields/MapPickerPField/MapPickerPField.tsx`, `src/views/DashboardApp/AvaPage/pfields/MapViewPField/MapViewPField.tsx`
- Modify: `src/views/DashboardApp/AvaPage/AvaPage.types.ts`
- Modify: `src/views/DashboardApp/DashboardEditorView/useDashboardPuckConfig/useDashboardPuckConfig.tsx` (imports, ~line 393, `categories.content.components` ~line 697, `components` ~line 1164, deps ~line 1589)

- [ ] **Step 1: Failing surface test.** `createMapViewerSourceFromMetadata.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createMapViewerSourceFromMetadata } from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/createMapViewerSourceFromMetadata/createMapViewerSourceFromMetadata";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Workspace } from "$/models/Workspace/Workspace";

const MAP_ID = "00000000-0000-4000-8000-0000000000f5" as AvaMap.Id;
const DASHBOARD_ID = "00000000-0000-4000-8000-0000000000d1" as Dashboard.Id;
const WORKSPACE_ID = "00000000-0000-4000-8000-0000000000aa" as Workspace.Id;

describe("createMapViewerSourceFromMetadata", () => {
  it("reads a public page's map from its snapshot", () => {
    expect(
      createMapViewerSourceFromMetadata({
        mapId: MAP_ID,
        metadata: {
          auth: "public",
          dashboardId: DASHBOARD_ID,
          snapshotRevision: "rev-1",
        },
      }),
    ).toEqual({
      type: "snapshot",
      mapId: MAP_ID,
      dashboardId: DASHBOARD_ID,
      snapshotRevision: "rev-1",
    });
  });

  it.each(["workspace", "workspace_published"] as const)(
    "draws a %s page's map live",
    (auth) => {
      expect(
        createMapViewerSourceFromMetadata({
          mapId: MAP_ID,
          metadata:
            auth === "workspace"
              ? { auth, dashboardId: DASHBOARD_ID, workspaceId: WORKSPACE_ID }
              : {
                  auth,
                  dashboardId: DASHBOARD_ID,
                  workspaceId: WORKSPACE_ID,
                  snapshotRevision: "rev-1",
                },
        }),
      ).toEqual({ type: "live", mapId: MAP_ID, workspaceId: WORKSPACE_ID });
    },
  );
});
```

Run: `pnpm vitest run src/views/DashboardApp/AvaPage/pblocks/MapPBlock/createMapViewerSourceFromMetadata` Expected: FAIL, import not found.

- [ ] **Step 2: Implement.**

```ts
import { match, P } from "ts-pattern";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaPageMetadata } from "@/views/DashboardApp/AvaPage/useAvaPageMetadata";
import type { MapViewerSource } from "@/views/GisApp/MapViewer/MapViewer.types";

/**
 * Where a Map block draws from. A public page has no access to maps or
 * datasets, so it reads the published snapshot. Every workspace surface,
 * including a workspace-published dashboard, draws the map live.
 */
export function createMapViewerSourceFromMetadata(
  options: Readonly<{ metadata: AvaPageMetadata; mapId: AvaMap.Id }>,
): MapViewerSource {
  const { mapId } = options;
  return match(options.metadata)
    .with({ auth: "public" }, (metadata) => {
      return {
        type: "snapshot" as const,
        mapId,
        dashboardId: metadata.dashboardId,
        snapshotRevision: metadata.snapshotRevision,
      };
    })
    .with({ auth: P.union("workspace", "workspace_published") }, (metadata) => {
      return {
        type: "live" as const,
        mapId,
        workspaceId: metadata.workspaceId,
      };
    })
    .exhaustive();
}
```

Run. Expected: 3 passed.

- [ ] **Step 3: Failing block test.** `MapPBlock.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { MapPBlock } from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/MapPBlock";
import { DEFAULT_MAP_PBLOCK_SETTINGS } from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/parseMapPBlockSettings/parseMapPBlockSettings";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { PuckContext } from "@puckeditor/core";

const { mapViewerSpy } = vi.hoisted(() => {
  return { mapViewerSpy: vi.fn() };
});

vi.mock("@/views/GisApp/MapViewer/MapViewer", () => {
  return {
    MapViewer: (props: unknown) => {
      mapViewerSpy(props);
      return <div>map viewer</div>;
    },
  };
});

const MAP_ID = "00000000-0000-4000-8000-0000000000f5" as AvaMap.Id;
const DASHBOARD_ID = "00000000-0000-4000-8000-000000000001";

function _puck(isEditing: boolean): PuckContext {
  return {
    renderDropZone: () => {
      return null;
    },
    metadata: {
      auth: "public",
      dashboardId: DASHBOARD_ID,
      snapshotRevision: "00000000-0000-4000-8000-000000000003",
    },
    isEditing,
    dragRef: null,
  };
}

describe("MapPBlock", () => {
  it("tells the author that dashboard filters do not reach the map", () => {
    render(
      <MapPBlock
        id="Map-1"
        {...DEFAULT_MAP_PBLOCK_SETTINGS}
        mapId={MAP_ID}
        puck={_puck(true)}
      />,
    );

    expect(
      screen.getByText("Dashboard filters don't apply to this map yet."),
    ).toBeInTheDocument();
  });

  it("shows readers the map without the authoring note", () => {
    render(
      <MapPBlock
        id="Map-1"
        {...DEFAULT_MAP_PBLOCK_SETTINGS}
        mapId={MAP_ID}
        puck={_puck(false)}
      />,
    );

    expect(
      screen.queryByText("Dashboard filters don't apply to this map yet."),
    ).not.toBeInTheDocument();
    expect(mapViewerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        source: expect.objectContaining({ type: "snapshot", mapId: MAP_ID }),
      }),
    );
  });

  it("asks the author to pick a map before one is chosen", () => {
    render(
      <MapPBlock id="Map-1" {...DEFAULT_MAP_PBLOCK_SETTINGS} puck={_puck(true)} />,
    );

    expect(
      screen.getByText("Pick a map in this block's settings."),
    ).toBeInTheDocument();
  });
});
```

Run: `pnpm vitest run src/views/DashboardApp/AvaPage/pblocks/MapPBlock/MapPBlock.test.tsx` Expected: FAIL, import not found.

- [ ] **Step 4: Implement the block.** `MapPBlockEmptyState.tsx`:

```tsx
import { Trans } from "@lingui/react/macro";
import { Center, Text } from "@mantine/core";
import type { ReactNode } from "react";

type Props = { heightPx: number };

/** A Map block whose author has not picked a map yet. */
export function MapPBlockEmptyState({ heightPx }: Props): ReactNode {
  return (
    <Center
      mih={heightPx}
      bd="1px dashed var(--ava-border-default)"
      bdrs="sm"
      p="md"
    >
      <Text size="sm" c="dimmed">
        <Trans>Pick a map in this block's settings.</Trans>
      </Text>
    </Center>
  );
}
```

`MapPBlock.tsx`:

```tsx
import { Trans } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { createMapViewerSourceFromMetadata } from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/createMapViewerSourceFromMetadata/createMapViewerSourceFromMetadata";
import { MapPBlockEmptyState } from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/MapPBlockEmptyState";
import { useAvaPageMetadata } from "@/views/DashboardApp/AvaPage/useAvaPageMetadata";
import { MapViewer } from "@/views/GisApp/MapViewer/MapViewer";
import type { MapPBlockSettings } from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/parseMapPBlockSettings/parseMapPBlockSettings";
import type { WithPuckProps } from "@puckeditor/core";
import type { ReactElement } from "react";

/** A saved Map block's props. */
export type Props = MapPBlockSettings;

/**
 * Shows a GIS map on a dashboard: live on workspace surfaces, from the
 * published snapshot on a public page. Dashboard filters do not reach it, and
 * the editor says so.
 */
export function MapPBlock(
  props: Readonly<WithPuckProps<Props & { id: string }>>,
): ReactElement {
  const metadata = useAvaPageMetadata(props.puck);
  const display = useMemo(() => {
    return {
      camera: props.view,
      heightPx: props.heightPx,
      showLegend: props.showLegend,
      isInteractive: props.isInteractive,
    };
  }, [props.view, props.heightPx, props.showLegend, props.isInteractive]);
  return (
    <Stack gap="xxs">
      {props.mapId === undefined ? (
        <MapPBlockEmptyState heightPx={props.heightPx} />
      ) : (
        <MapViewer
          source={createMapViewerSourceFromMetadata({
            metadata,
            mapId: props.mapId,
          })}
          display={display}
        />
      )}
      {props.puck.isEditing ? (
        <Text size="xs" c="dimmed">
          <Trans>Dashboard filters don't apply to this map yet.</Trans>
        </Text>
      ) : null}
    </Stack>
  );
}
```

Run Step 3's command. Expected: 3 passed.

- [ ] **Step 5: The fields.** `src/views/DashboardApp/AvaPage/pfields/MapPickerPField/MapPickerPField.tsx`:

```tsx
import { Select } from "@avandar/ui";
import { where } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { AvaMapClient } from "@/clients/maps/AvaMapClient/AvaMapClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaPageFieldProps } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { ReactElement } from "react";

type Props = AvaPageFieldProps<AvaMap.Id | undefined>;

/** Picks which of the workspace's maps a Map block shows. */
export function MapPickerPField({
  value,
  onChange,
  readOnly,
}: Props): ReactElement {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [avaMaps = [], isLoading] = AvaMapClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  return (
    <Select
      label={t`Map`}
      placeholder={isLoading ? t`Loading maps` : t`Pick a map`}
      data={avaMaps.map((avaMap) => {
        return { value: avaMap.id, label: avaMap.name };
      })}
      value={value ?? null}
      searchable
      nothingFoundMessage={t`No maps match`}
      disabled={readOnly}
      onChange={(selectedId) => {
        onChange(
          avaMaps.find((avaMap) => {
            return avaMap.id === selectedId;
          })?.id,
        );
      }}
    />
  );
}
```

`src/views/DashboardApp/AvaPage/pfields/MapViewPField/MapViewPField.tsx`:

```tsx
import { Select } from "@avandar/ui";
import { isPlainObject } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { uuidType } from "$/lib/zodHelpers";
import { AvaMapClient } from "@/clients/maps/AvaMapClient/AvaMapClient";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { AvaPageFieldProps } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { MapViewerCamera } from "@/views/GisApp/MapViewer/MapViewer.types";
import type { ReactElement } from "react";

type Props = AvaPageFieldProps<MapViewerCamera>;

/** Select value standing for the map's saved view. */
const SAVED_VIEW_VALUE = "saved";

/** Reads the picked map id the block config puts in this field's metadata. */
function _getMapIdFromFieldMetadata(metadata: unknown): AvaMap.Id | undefined {
  const parsed = uuidType<AvaMap.Id>().safeParse(
    isPlainObject(metadata) ? metadata.mapId : undefined,
  );
  return parsed.success ? parsed.data : undefined;
}

function _selectValueToCamera(
  options: Readonly<{
    selectedValue: string | null;
    bookmarks: readonly AvaMapConfig.Bookmark[];
  }>,
): MapViewerCamera {
  const bookmark = options.bookmarks.find((candidate) => {
    return candidate.id === options.selectedValue;
  });
  return bookmark
    ? { type: "bookmark", bookmarkId: bookmark.id }
    : { type: "saved" };
}

/** Picks whether a Map block opens on the map's saved view or a bookmark. */
export function MapViewPField({
  field,
  value,
  onChange,
  readOnly,
}: Props): ReactElement {
  const { t } = useLingui();
  const mapId = _getMapIdFromFieldMetadata(field.metadata);
  const [avaMap] = AvaMapClient.useGetById({
    id: mapId,
    useQueryOptions: { enabled: mapId !== undefined },
  });
  const bookmarks = avaMap?.config.bookmarks ?? [];
  return (
    <Select
      label={t`Opens on`}
      data={[
        { value: SAVED_VIEW_VALUE, label: t`The map's saved view` },
        ...bookmarks.map((bookmark) => {
          return { value: bookmark.id, label: bookmark.name };
        }),
      ]}
      value={value.type === "saved" ? SAVED_VIEW_VALUE : value.bookmarkId}
      allowDeselect={false}
      disabled={readOnly || mapId === undefined}
      onChange={(selectedValue) => {
        onChange(_selectValueToCamera({ selectedValue, bookmarks }));
      }}
    />
  );
}
```

- [ ] **Step 6: The Puck config.** `useMapPBlockConfig.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import { MapPBlock } from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/MapPBlock";
import {
  DEFAULT_MAP_PBLOCK_SETTINGS,
  MAP_PBLOCK_HEIGHT_RANGE,
} from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/parseMapPBlockSettings/parseMapPBlockSettings";
import { MapPickerPField } from "@/views/DashboardApp/AvaPage/pfields/MapPickerPField/MapPickerPField";
import { MapViewPField } from "@/views/DashboardApp/AvaPage/pfields/MapViewPField/MapViewPField";
import type { Props as MapPBlockProps } from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/MapPBlock";
import type { ComponentConfig } from "@puckeditor/core";

/**
 * Builds the Puck component config for the dashboard's Map block: the map
 * picker, which camera it opens on, its height, legend, and interaction. The
 * camera field reads the picked map's bookmarks through its metadata, and
 * changing the map resets the camera to the new map's saved view.
 */
export function useMapPBlockConfig(): ComponentConfig<MapPBlockProps> {
  const { t } = useLingui();
  return useMemo(() => {
    return {
      label: t`Map`,
      fields: {
        mapId: { label: t`Map`, type: "custom", render: MapPickerPField },
        view: { label: t`Opens on`, type: "custom", render: MapViewPField },
        heightPx: {
          label: t`Height in pixels`,
          type: "number",
          min: MAP_PBLOCK_HEIGHT_RANGE.min,
          max: MAP_PBLOCK_HEIGHT_RANGE.max,
        },
        showLegend: {
          label: t`Legend`,
          type: "radio",
          options: [
            { label: t`Show`, value: true },
            { label: t`Hide`, value: false },
          ],
        },
        isInteractive: {
          label: t`Interaction`,
          type: "radio",
          options: [
            { label: t`Pan, zoom, and popups`, value: true },
            { label: t`Fixed picture`, value: false },
          ],
        },
      },
      defaultProps: DEFAULT_MAP_PBLOCK_SETTINGS,
      resolveFields: (data, { fields }) => {
        return {
          ...fields,
          view: { ...fields.view, metadata: { mapId: data.props.mapId } },
        };
      },
      resolveData: (data, { changed, trigger }) => {
        const isNewMap = trigger !== "load" && changed.mapId === true;
        return {
          props: isNewMap
            ? { ...data.props, view: DEFAULT_MAP_PBLOCK_SETTINGS.view }
            : data.props,
        };
      },
      render: MapPBlock,
    };
  }, [t]);
}
```

If `pnpm tsc -b --force` reports that Puck maps the branded `AvaMap.Id` prop to an object type (the same problem `useDataVizPBlockConfig` documents), register the render the way that file does, with its comment:

```tsx
      // Puck maps branded strings as objects. Runtime serialized IDs remain
      // strings.
      render: MapPBlock as unknown as ComponentConfig<MapPBlockProps>["render"],
```

- [ ] **Step 7: Register the block.** In `AvaPage.types.ts`, add `import type { Props as MapPBlockProps } from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/MapPBlock";` and `Map: MapPBlockProps;` to `PBlockPropsRegistry` (after `ListBlock`). In `useDashboardPuckConfig.tsx`:
  1. `import { useMapPBlockConfig } from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/useMapPBlockConfig";`
  2. After `const filterFieldConfig = useFilterPBlockConfig();`: `const mapFieldConfig = useMapPBlockConfig();`
  3. In `categories.content.components`, insert `"Map",` after `"Filter",`.
  4. In `components`, after `Filter: filterFieldConfig,`: `Map: mapFieldConfig,`.
  5. Add `mapFieldConfig,` to the `useMemo` dependency list after `filterFieldConfig,`.

- [ ] **Step 8: Run.**

```bash
pnpm vitest run src/views/DashboardApp/AvaPage src/views/DashboardApp/DashboardEditorView src/views/DashboardApp/DashboardViewerView
pnpm tsc -b --force
```

Expected: tests pass; `tsc` reports no errors.

- [ ] **Step 9: Commit.**

```bash
git add src/views/DashboardApp/AvaPage src/views/DashboardApp/DashboardEditorView/useDashboardPuckConfig/useDashboardPuckConfig.tsx
git commit -m "feat(dashboards): add a Map block to dashboards"
```

---

## Task 17: "Add to dashboard" from the export sheet

**Files:**
- Create: `src/views/GisApp/export/AddMapToDashboardModal/MapPBlockDashboardConfigs/MapPBlockDashboardConfigs.ts` (+ `.test.ts`)
- Create: `src/views/GisApp/export/AddMapToDashboardModal/useAddMapToDashboard.tsx`, `AddMapToDashboardModal.tsx`, `AddMapToDashboardModal.test.tsx`
- Modify: `src/views/GisApp/export/ExportSheet/ExportSheet.tsx` (+ `ExportSheet.test.tsx`)
- Modify: `src/views/GisApp/GisAppMapShell.tsx`

- [ ] **Step 1: Failing config test.** `MapPBlockDashboardConfigs.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { MapPBlockDashboardConfigs } from "@/views/GisApp/export/AddMapToDashboardModal/MapPBlockDashboardConfigs/MapPBlockDashboardConfigs";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaPageData } from "@/views/DashboardApp/AvaPage/AvaPage.types";

const MAP_ID = "00000000-0000-4000-8000-0000000000f5" as AvaMap.Id;

describe("MapPBlockDashboardConfigs", () => {
  it("appends a map block after a page's existing blocks", () => {
    const pageData = MapPBlockDashboardConfigs.createPageData({
      dashboardName: "Coverage risk",
      mapId: MAP_ID,
    });
    const withHeading: AvaPageData = {
      ...pageData,
      content: [
        {
          type: "HeadingBlock",
          props: { id: "h-1", text: "Week 34", level: 2, align: "left" },
        },
      ],
    };

    const updated = MapPBlockDashboardConfigs.appendToPageData({
      pageData: withHeading,
      mapId: MAP_ID,
    });

    expect(
      updated.content.map((item) => {
        return item.type;
      }),
    ).toEqual(["HeadingBlock", "Map"]);
    expect(updated.content[1]?.props).toMatchObject({
      mapId: MAP_ID,
      view: { type: "saved" },
      heightPx: 480,
    });
  });

  it("starts a new dashboard titled with its name and holding the map", () => {
    const pageData = MapPBlockDashboardConfigs.createPageData({
      dashboardName: "Coverage risk",
      mapId: MAP_ID,
    });

    expect(pageData.root.props?.title).toBe("Coverage risk");
    expect(pageData.content).toHaveLength(1);
    expect(pageData.content[0]?.type).toBe("Map");
  });
});
```

Run: `pnpm vitest run src/views/GisApp/export/AddMapToDashboardModal/MapPBlockDashboardConfigs` Expected: FAIL, import not found.

- [ ] **Step 2: Implement.**

```ts
import { DashboardConfigs } from "$/models/Dashboard/DashboardConfig/DashboardConfigs";
import { DEFAULT_MAP_PBLOCK_SETTINGS } from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/parseMapPBlockSettings/parseMapPBlockSettings";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaPageData } from "@/views/DashboardApp/AvaPage/AvaPage.types";

function _createMapPBlockItem(mapId: AvaMap.Id): AvaPageData["content"][number] {
  return {
    type: "Map",
    props: {
      ...DEFAULT_MAP_PBLOCK_SETTINGS,
      id: `Map-${crypto.randomUUID()}`,
      mapId,
    },
  };
}

function _appendToPageData(
  options: Readonly<{ pageData: AvaPageData; mapId: AvaMap.Id }>,
): AvaPageData {
  return {
    ...options.pageData,
    content: [...options.pageData.content, _createMapPBlockItem(options.mapId)],
  };
}

function _createPageData(
  options: Readonly<{ dashboardName: string; mapId: AvaMap.Id }>,
): AvaPageData {
  const emptyPageData = DashboardConfigs.makeEmpty() as AvaPageData;
  return {
    ...emptyPageData,
    root: {
      ...emptyPageData.root,
      props: { ...emptyPageData.root.props, title: options.dashboardName },
    },
    content: [_createMapPBlockItem(options.mapId)],
  } as AvaPageData;
}

/** Builds dashboard pages that show a map, for "Add to dashboard". */
export const MapPBlockDashboardConfigs = {
  /** A page with a new Map block after its existing blocks. */
  appendToPageData: _appendToPageData,

  /** A new page titled with the dashboard's name, holding one Map block. */
  createPageData: _createPageData,
};
```

Run the same command. Expected: 2 passed.

- [ ] **Step 3: Failing modal test.** `AddMapToDashboardModal.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@/test-utils";
import { AddMapToDashboardModal } from "@/views/GisApp/export/AddMapToDashboardModal/AddMapToDashboardModal";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { UserId } from "$/models/User/User.types";
import type { UserProfileId } from "$/models/User/UserProfile.types";
import type { Workspace } from "$/models/Workspace/Workspace";

const { insertMock, updateMock, useGetAllMock } = vi.hoisted(() => {
  return {
    insertMock: vi.fn(),
    updateMock: vi.fn(),
    useGetAllMock: vi.fn(),
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return {
        id: "00000000-0000-4000-8000-0000000000aa" as Workspace.Id,
        slug: "test-ws",
      };
    },
  };
});
vi.mock("@/hooks/users/useCurrentUserProfile", () => {
  return {
    useCurrentUserProfile: () => {
      return [
        {
          userId: "00000000-0000-4000-8000-0000000000bb" as UserId,
          profileId: "00000000-0000-4000-8000-0000000000cc" as UserProfileId,
        },
        false,
      ];
    },
  };
});
vi.mock("@/clients/dashboards/DashboardClient/DashboardClient", () => {
  return {
    DashboardClient: {
      QueryKeys: {
        getAll: () => {
          return ["dashboards"];
        },
      },
      useGetAll: (...args: unknown[]) => {
        return useGetAllMock(...args);
      },
      useInsert: () => {
        return [insertMock, false];
      },
      useUpdate: () => {
        return [updateMock, false];
      },
    },
  };
});
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => {
      return vi.fn();
    },
  };
});

const MAP_ID = "00000000-0000-4000-8000-0000000000f5" as AvaMap.Id;
const DASHBOARD = {
  __type: "Dashboard",
  id: "00000000-0000-4000-8000-000000000001",
  name: "Weekly coverage",
  config: {
    root: { props: { title: "Weekly coverage" } },
    content: [{ type: "HeadingBlock", props: { id: "h-1", text: "Week 34" } }],
  },
  updatedAt: "2026-11-02T00:00:00.000Z",
  createdAt: "2026-11-01T00:00:00.000Z",
} as unknown as Dashboard.T;

function _render(): void {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <AddMapToDashboardModal
        mapId={MAP_ID}
        workspaceSlug="test-ws"
        onClose={vi.fn()}
      />
    </QueryClientProvider>,
  );
}

describe("AddMapToDashboardModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds a Map block to the picked dashboard", async () => {
    useGetAllMock.mockReturnValue([[DASHBOARD], false]);
    _render();

    fireEvent.click(
      within(screen.getByRole("listbox")).getAllByRole("option")[0]!,
    );
    fireEvent.click(screen.getByRole("button", { name: /save to dashboard/i }));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledOnce();
    });
    const { id, data } = updateMock.mock.calls[0]![0];
    const content = (data.config as { content: Array<{ type: string; props: { mapId?: string } }> }).content;
    expect(id).toBe(DASHBOARD.id);
    expect(content.at(-1)).toMatchObject({ type: "Map", props: { mapId: MAP_ID } });
  });

  it("creates a dashboard holding the map when there are none yet", async () => {
    useGetAllMock.mockReturnValue([[], false]);
    _render();

    fireEvent.click(screen.getByRole("button", { name: /create dashboard & save/i }));

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledOnce();
    });
    const { data } = insertMock.mock.calls[0]![0];
    expect(
      (data.config as { content: Array<{ type: string }> }).content[0]?.type,
    ).toBe("Map");
  });
});
```

Run: `pnpm vitest run src/views/GisApp/export/AddMapToDashboardModal/AddMapToDashboardModal.test.tsx` Expected: FAIL, import not found.

- [ ] **Step 4: Implement the mutations hook.** `useAddMapToDashboard.tsx`:

```tsx
import { Model } from "@avandar/models";
import { useLingui } from "@lingui/react/macro";
import { Anchor } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useNavigate } from "@tanstack/react-router";
import { DashboardClient } from "@/clients/dashboards/DashboardClient/DashboardClient";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifyError } from "@/utils/notifications/notify";
import { upgradeAvaPageData } from "@/views/DashboardApp/AvaPage/utils/upgradeAvaPageData";
import { MapPBlockDashboardConfigs } from "@/views/GisApp/export/AddMapToDashboardModal/MapPBlockDashboardConfigs/MapPBlockDashboardConfigs";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type {
  AvaPageData,
  AvaPageGenericData,
} from "@/views/DashboardApp/AvaPage/AvaPage.types";

type AddMapToDashboardActions = {
  addToDashboard: (dashboard: Dashboard.T) => void;
  createDashboard: (dashboardName: string) => void;
  isAdding: boolean;
  isCreating: boolean;
};

/** Stores page data as a dashboard's JSON config, as the explorer's save does. */
function _pageDataToDashboardConfig(
  pageData: AvaPageData,
): Dashboard.T["config"] {
  return pageData as unknown as Dashboard.T["config"];
}

function useShowMapAddedToast(
  workspaceSlug: string,
): (options: { dashboardId: Dashboard.Id; title: string }) => void {
  const { t } = useLingui();
  const navigate = useNavigate();
  return (options) => {
    notifications.show({
      color: "green",
      title: options.title,
      message: (
        <Anchor
          size="sm"
          onClick={() => {
            navigate({
              to: "/$workspaceSlug/dashboards/edit/$dashboardId",
              params: { workspaceSlug, dashboardId: options.dashboardId },
            });
          }}
        >
          {t`Open dashboard`}
        </Anchor>
      ),
    });
  };
}

/**
 * Adds a map to an existing dashboard, or creates a dashboard holding it,
 * then offers a link to the dashboard editor.
 */
export function useAddMapToDashboard(
  options: Readonly<{
    mapId: AvaMap.Id;
    workspaceSlug: string;
    onClose: () => void;
  }>,
): AddMapToDashboardActions {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [userProfile] = useCurrentUserProfile();
  const showMapAddedToast = useShowMapAddedToast(options.workspaceSlug);
  const [insertDashboard, isCreating] = DashboardClient.useInsert({
    queriesToInvalidate: [DashboardClient.QueryKeys.getAll()],
    onSuccess: (dashboard) => {
      showMapAddedToast({
        dashboardId: dashboard.id,
        title: t`Created "${dashboard.name}" with this map`,
      });
      options.onClose();
    },
    onError: (error) => {
      notifyError(t`Could not create the dashboard: ${error.message}`);
    },
  });
  const [updateDashboard, isAdding] = DashboardClient.useUpdate({
    queriesToInvalidate: [DashboardClient.QueryKeys.getAll()],
    onSuccess: (dashboard) => {
      showMapAddedToast({
        dashboardId: dashboard.id,
        title: t`Added this map to "${dashboard.name}"`,
      });
      options.onClose();
    },
    onError: (error) => {
      notifyError(t`Could not add the map: ${error.message}`);
    },
  });
  return {
    addToDashboard: (dashboard) => {
      const pageData = MapPBlockDashboardConfigs.appendToPageData({
        pageData: upgradeAvaPageData(
          dashboard.config as unknown as AvaPageGenericData,
        ),
        mapId: options.mapId,
      });
      updateDashboard({
        id: dashboard.id,
        data: { config: _pageDataToDashboardConfig(pageData) },
      });
    },
    createDashboard: (dashboardName) => {
      if (!userProfile) {
        notifyError(t`Your user profile is not loaded yet. Please retry.`);
        return;
      }
      const now = new Date().toISOString();
      insertDashboard({
        data: Model.make("Dashboard", {
          workspaceId: workspace.id,
          ownerId: userProfile.userId,
          ownerProfileId: userProfile.profileId,
          name: dashboardName,
          description: undefined,
          slug: undefined,
          config: _pageDataToDashboardConfig(
            MapPBlockDashboardConfigs.createPageData({
              dashboardName,
              mapId: options.mapId,
            }),
          ),
          createdAt: now,
          updatedAt: now,
        }),
      });
    },
    isAdding,
    isCreating,
  };
}
```

This hook is over 45 lines. Split `addToDashboard` and `createDashboard` bodies into module-level `_createAddToDashboard(...)` / `_createCreateDashboard(...)` factories if the linter or review flags it; keep the behavior above.

- [ ] **Step 5: Implement the modal body.** `AddMapToDashboardModal.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { useState } from "react";
import { DashboardClient } from "@/clients/dashboards/DashboardClient/DashboardClient";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { SaveToDashboardCreateMode } from "@/views/DataExplorerApp/SaveToDashboardModal/SaveToDashboardCreateMode";
import { SaveToDashboardListMode } from "@/views/DataExplorerApp/SaveToDashboardModal/SaveToDashboardListMode";
import { useAddMapToDashboard } from "@/views/GisApp/export/AddMapToDashboardModal/useAddMapToDashboard";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { ReactNode } from "react";

type Props = { mapId: AvaMap.Id; workspaceSlug: string; onClose: () => void };

/**
 * The body of the "Add to dashboard" modal: pick one of your dashboards or
 * create one, using the same pickers as the explorer's "Save to dashboard".
 */
export function AddMapToDashboardModal({
  mapId,
  workspaceSlug,
  onClose,
}: Props): ReactNode {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [userProfile, isLoadingUserProfile] = useCurrentUserProfile();
  const [dashboards = [], isLoadingDashboards] = DashboardClient.useGetAll({
    where: userProfile
      ? {
          workspace_id: { eq: workspace.id },
          owner_id: { eq: userProfile.userId },
        }
      : undefined,
    useQueryOptions: { enabled: userProfile !== undefined },
  });
  const [isCreateMode, setIsCreateMode] = useState(false);
  const actions = useAddMapToDashboard({ mapId, workspaceSlug, onClose });
  const isLoading = isLoadingUserProfile || isLoadingDashboards;
  const isMutating = actions.isAdding || actions.isCreating;
  const hasDashboards = dashboards.length > 0;
  return (
    <Stack gap="md">
      <Text c="dimmed" size="sm">
        {t`Pick a dashboard to add this map to, or create one.`}
      </Text>
      {isCreateMode || (!isLoading && !hasDashboards) ? (
        <SaveToDashboardCreateMode
          defaultName={t`Untitled dashboard`}
          isCreating={actions.isCreating}
          isDisabled={isMutating}
          showEmptyStateBanner={!hasDashboards}
          onBack={
            hasDashboards
              ? () => {
                  setIsCreateMode(false);
                }
              : undefined
          }
          onCancel={onClose}
          onSubmit={actions.createDashboard}
        />
      ) : (
        <SaveToDashboardListMode
          dashboards={dashboards}
          isLoading={isLoading}
          isSaving={actions.isAdding}
          isDisabled={isMutating}
          onSwitchToCreate={() => {
            setIsCreateMode(true);
          }}
          onCancel={onClose}
          onSelectAndSave={actions.addToDashboard}
        />
      )}
    </Stack>
  );
}
```

Run Step 3's command. Expected: 2 passed.

- [ ] **Step 6: Failing export sheet test.** In `ExportSheet.test.tsx`, add `onAddToDashboard: () => { return; },` to the object `_props` returns, then append inside `describe("ExportSheet")`:

```tsx
  it("offers to add the map to a dashboard from its footer", () => {
    const onAddToDashboard = vi.fn();
    render(
      <ExportSheet
        {...(_props({}) as Props)}
        onAddToDashboard={onAddToDashboard}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add to dashboard" }));

    expect(onAddToDashboard).toHaveBeenCalledOnce();
  });
```

Run: `pnpm vitest run src/views/GisApp/export/ExportSheet` Expected: FAIL, no "Add to dashboard" button.

- [ ] **Step 7: Add the footer button.** In `ExportSheet.tsx`: add `onAddToDashboard: () => void;` to `Props` (after `onConfigChange`), destructure it, and after the `Download PDF` button add:

```tsx
        <Button variant="default" onClick={onAddToDashboard}>
          {t`Add to dashboard`}
        </Button>
```

Update the docstring's last sentence: "Its footer also hands the map to a dashboard through `onAddToDashboard`."

- [ ] **Step 8: Wire the shell.** In `GisAppMapShell.tsx`:
  1. Imports: `import { Modal } from "@mantine/core";` and `import { AddMapToDashboardModal } from "@/views/GisApp/export/AddMapToDashboardModal/AddMapToDashboardModal";`.
  2. State: `const [isAddToDashboardOpen, setIsAddToDashboardOpen] = useState(false);`.
  3. On `<ExportSheet ... />` add:

```tsx
            onAddToDashboard={() => {
              setIsExportOpen(false);
              setIsAddToDashboardOpen(true);
            }}
```

  4. After `</ExportSheet>`'s closing tag (inside the `featureDrawer` fragment):

```tsx
          <Modal
            opened={isAddToDashboardOpen}
            onClose={() => {
              setIsAddToDashboardOpen(false);
            }}
            title={t`Add to dashboard`}
          >
            <AddMapToDashboardModal
              mapId={app.avaMap.id}
              workspaceSlug={workspace.slug}
              onClose={() => {
                setIsAddToDashboardOpen(false);
              }}
            />
          </Modal>
```

- [ ] **Step 9: Run.**

```bash
pnpm vitest run src/views/GisApp/export src/views/GisApp/GisApp.test.tsx
```

Expected: all pass.

- [ ] **Step 10: Commit.**

```bash
git add src/views/GisApp/export src/views/GisApp/GisAppMapShell.tsx
git commit -m "feat(gis): add a map to a dashboard from the export sheet"
```

---

## Task 18: Share modal warns about maps not everyone can open

**Files:**
- Create: `src/views/DashboardApp/DashboardShareModal/DashboardMapAudienceAlert/getLimitedAudienceMapNames/getLimitedAudienceMapNames.ts` (+ `.test.ts`)
- Create: `.../DashboardMapAudienceAlert/useLimitedAudienceMapNames.ts`, `DashboardMapAudienceAlert.tsx`, `DashboardMapAudienceAlert.test.tsx`
- Modify: `src/views/DashboardApp/DashboardShareModal/PublishingSection.tsx` (+ `PublishingSection.test.tsx`)

The rule mirrors gadgets' `has_limited_audience` ([gadgets.md](gadgets.md)): a map has a limited audience when it is restricted, when a dataset it reads is restricted, or when the author cannot even read it.

- [ ] **Step 1: Failing rule test.** `getLimitedAudienceMapNames.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { getLimitedAudienceMapNames } from "@/views/DashboardApp/DashboardShareModal/DashboardMapAudienceAlert/getLimitedAudienceMapNames/getLimitedAudienceMapNames";
import { createQueryableLayer } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData.fixtures";
import type { AvaMap } from "$/models/AvaMap/AvaMap";

const OPEN_MAP_ID = "00000000-0000-4000-8000-0000000000f1" as AvaMap.Id;
const HIDDEN_MAP_ID = "00000000-0000-4000-8000-0000000000f2" as AvaMap.Id;

function _makeMap(overrides: Partial<AvaMap.T>): AvaMap.T {
  return {
    id: OPEN_MAP_ID,
    name: "Open map",
    isRestricted: false,
    config: AvaMapConfig.makeEmpty(),
    ...overrides,
  } as AvaMap.T;
}

describe("getLimitedAudienceMapNames", () => {
  it("names a restricted map", () => {
    expect(
      getLimitedAudienceMapNames({
        mapIds: [OPEN_MAP_ID],
        maps: [_makeMap({ name: "Case homes", isRestricted: true })],
        datasets: [],
        unavailableMapLabel: "a map you cannot open",
      }),
    ).toEqual(["Case homes"]);
  });

  it("names a map whose dataset is restricted", () => {
    const layer = createQueryableLayer();
    const dataset = { ...layer.source.dataSource!, isRestricted: true };

    expect(
      getLimitedAudienceMapNames({
        mapIds: [OPEN_MAP_ID],
        maps: [
          _makeMap({
            name: "Schools",
            config: { ...AvaMapConfig.makeEmpty(), layers: [layer] },
          }),
        ],
        datasets: [dataset],
        unavailableMapLabel: "a map you cannot open",
      }),
    ).toEqual(["Schools"]);
  });

  it("labels a map the author cannot read", () => {
    expect(
      getLimitedAudienceMapNames({
        mapIds: [HIDDEN_MAP_ID],
        maps: [],
        datasets: [],
        unavailableMapLabel: "a map you cannot open",
      }),
    ).toEqual(["a map you cannot open"]);
  });

  it("names nothing when every map and dataset is open", () => {
    expect(
      getLimitedAudienceMapNames({
        mapIds: [OPEN_MAP_ID],
        maps: [_makeMap({})],
        datasets: [],
        unavailableMapLabel: "a map you cannot open",
      }),
    ).toEqual([]);
  });
});
```

Run: `pnpm vitest run src/views/DashboardApp/DashboardShareModal/DashboardMapAudienceAlert` Expected: FAIL, import not found.

- [ ] **Step 2: Implement the rule.**

```ts
import { getDatasetIdsFromMapConfig } from "@/clients/maps/getDatasetIdsFromMapConfig/getDatasetIdsFromMapConfig";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

function _hasLimitedDataset(
  options: Readonly<{ avaMap: AvaMap.T; datasets: readonly Dataset.T[] }>,
): boolean {
  return getDatasetIdsFromMapConfig(options.avaMap.config).some((datasetId) => {
    const dataset = options.datasets.find((candidate) => {
      return candidate.id === datasetId;
    });
    return !dataset || dataset.isRestricted;
  });
}

/**
 * The maps on a dashboard that some of its audience cannot open: restricted
 * maps, maps reading a restricted dataset, and maps the author cannot read
 * (shown with `unavailableMapLabel`, since their names are hidden).
 */
export function getLimitedAudienceMapNames(
  options: Readonly<{
    mapIds: readonly AvaMap.Id[];
    maps: readonly AvaMap.T[];
    datasets: readonly Dataset.T[];
    unavailableMapLabel: string;
  }>,
): string[] {
  return options.mapIds.flatMap((mapId) => {
    const avaMap = options.maps.find((candidate) => {
      return candidate.id === mapId;
    });
    if (!avaMap) {
      return [options.unavailableMapLabel];
    }
    return avaMap.isRestricted ||
      _hasLimitedDataset({ avaMap, datasets: options.datasets })
      ? [avaMap.name]
      : [];
  });
}
```

Run the same command. Expected: 4 passed.

- [ ] **Step 3: Failing component test.** `DashboardMapAudienceAlert.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { render, screen } from "@/test-utils";
import { DashboardMapAudienceAlert } from "@/views/DashboardApp/DashboardShareModal/DashboardMapAudienceAlert/DashboardMapAudienceAlert";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

const { useGetMapsMock } = vi.hoisted(() => {
  return { useGetMapsMock: vi.fn() };
});

vi.mock("@/clients/maps/AvaMapClient/AvaMapClient", () => {
  return { AvaMapClient: { useGetAll: useGetMapsMock } };
});
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAll: () => {
        return [[], false];
      },
    },
  };
});

const MAP_ID = "00000000-0000-4000-8000-0000000000f5";
const DASHBOARD = {
  id: "00000000-0000-4000-8000-000000000001",
  config: {
    root: { props: { title: "Coverage" } },
    content: [{ type: "Map", props: { id: "Map-1", mapId: MAP_ID } }],
  },
} as unknown as Dashboard.T;

describe("DashboardMapAudienceAlert", () => {
  beforeEach(() => {
    useGetMapsMock.mockReturnValue([
      [
        {
          id: MAP_ID,
          name: "Case homes",
          isRestricted: true,
          config: AvaMapConfig.makeEmpty(),
        },
      ],
      false,
    ]);
  });

  it("warns that some readers cannot open a restricted map", () => {
    render(
      <DashboardMapAudienceAlert
        dashboard={DASHBOARD}
        targetVisibility="workspace"
      />,
    );

    expect(screen.getByText(/cannot open Case homes/)).toBeInTheDocument();
  });

  it("stays quiet for a public dashboard, whose maps are published as snapshots", () => {
    render(
      <DashboardMapAudienceAlert dashboard={DASHBOARD} targetVisibility="public" />,
    );

    expect(screen.queryByText(/cannot open Case homes/)).not.toBeInTheDocument();
  });
});
```

Run the same command. Expected: FAIL, component not found.

- [ ] **Step 4: Implement.** `useLimitedAudienceMapNames.ts`:

```ts
import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import { DashboardMapBlocks } from "@/clients/dashboards/DashboardMapBlocks/DashboardMapBlocks";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { AvaMapClient } from "@/clients/maps/AvaMapClient/AvaMapClient";
import { getDatasetIdsFromMapConfig } from "@/clients/maps/getDatasetIdsFromMapConfig/getDatasetIdsFromMapConfig";
import { getLimitedAudienceMapNames } from "@/views/DashboardApp/DashboardShareModal/DashboardMapAudienceAlert/getLimitedAudienceMapNames/getLimitedAudienceMapNames";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

/** Names of the dashboard's maps that some of its audience cannot open. */
export function useLimitedAudienceMapNames(dashboard: Dashboard.T): string[] {
  const { t } = useLingui();
  const mapIds = useMemo(() => {
    return DashboardMapBlocks.getMapIds(dashboard.config);
  }, [dashboard.config]);
  const [maps = []] = AvaMapClient.useGetAll({
    where: { id: { in: mapIds } },
    useQueryOptions: { enabled: mapIds.length > 0 },
  });
  const datasetIds = useMemo(() => {
    return Array.from(
      new Set(
        maps.flatMap((avaMap) => {
          return getDatasetIdsFromMapConfig(avaMap.config);
        }),
      ),
    );
  }, [maps]);
  const [datasets = []] = DatasetClient.useGetAll({
    where: { id: { in: datasetIds } },
    useQueryOptions: { enabled: datasetIds.length > 0 },
  });
  return getLimitedAudienceMapNames({
    mapIds,
    maps,
    datasets,
    unavailableMapLabel: t`a map you cannot open`,
  });
}
```

`DashboardMapAudienceAlert.tsx`:

```tsx
import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useLimitedAudienceMapNames } from "@/views/DashboardApp/DashboardShareModal/DashboardMapAudienceAlert/useLimitedAudienceMapNames";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

type Props = {
  dashboard: Dashboard.T;
  targetVisibility: Dashboard.Visibility;
};

/**
 * Warns, without blocking, that some people who can open this dashboard
 * cannot open one of its maps and will see the no-access state in its place.
 * Silent for a public dashboard, whose maps are published as snapshots.
 */
export function DashboardMapAudienceAlert({
  dashboard,
  targetVisibility,
}: Props): ReactNode {
  const { t, i18n } = useLingui();
  const mapNames = useLimitedAudienceMapNames(dashboard);
  if (targetVisibility === "public" || mapNames.length === 0) {
    return null;
  }
  const mapList = new Intl.ListFormat(i18n.locale, {
    type: "conjunction",
  }).format(mapNames);
  return (
    <Callout
      color="warning"
      icon={<IconAlertTriangle size={20} />}
      title={t`Not everyone can see every map`}
      titleOrder={5}
      titleSize="sm"
      message={t`Some people who can open this dashboard cannot open ${mapList}. They will see "You don't have access to this map" in its place.`}
      messageSize="sm"
    />
  );
}
```

Run the same command. Expected: 6 passed.

- [ ] **Step 5: Mount it.** In `PublishingSection.tsx`, import `DashboardMapAudienceAlert` and render it directly after `<Divider />`:

```tsx
      <DashboardMapAudienceAlert
        dashboard={publishing.currentDashboard}
        targetVisibility={publishing.targetVisibility}
      />
```

In `PublishingSection.test.tsx`, add beside the other module mocks:

```tsx
vi.mock(
  "@/views/DashboardApp/DashboardShareModal/DashboardMapAudienceAlert/DashboardMapAudienceAlert",
  () => {
    return {
      DashboardMapAudienceAlert: () => {
        return null;
      },
    };
  },
);
```

- [ ] **Step 6: Run.** `pnpm vitest run src/views/DashboardApp/DashboardShareModal` Expected: all pass.

- [ ] **Step 7: Commit.**

```bash
git add src/views/DashboardApp/DashboardShareModal
git commit -m "feat(dashboards): warn when shared readers cannot open a dashboard map"
```

---

## Task 19: Publish preview lists map layers and counts

**Files:**
- Create: `src/clients/maps/MapSnapshot/getMapSnapshotLayerSummaries/getMapSnapshotLayerSummaries.ts` (+ `.test.ts`)
- Create: `src/views/DashboardApp/DashboardShareModal/PublishMapLayersPreview/PublishMapLayersPreview.tsx`, `PublishMapLayersList.tsx`
- Modify: `src/views/DashboardApp/DashboardShareModal/PublishingSection.tsx` (+ test)

- [ ] **Step 1: Failing test.**

```ts
import { describe, expect, it } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { getMapSnapshotLayerSummaries } from "@/clients/maps/MapSnapshot/getMapSnapshotLayerSummaries/getMapSnapshotLayerSummaries";
import type { AvaMap } from "$/models/AvaMap/AvaMap";

describe("getMapSnapshotLayerSummaries", () => {
  it("counts each published layer's features under its name", () => {
    const layer = MapLayer.makeEmpty("Schools");
    const point: GeoJSON.Feature = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [0, 0] },
      properties: {},
    };

    expect(
      getMapSnapshotLayerSummaries({
        version: 1,
        mapId: "00000000-0000-4000-8000-0000000000f5" as AvaMap.Id,
        mapName: "Coverage risk",
        config: AvaMapConfig.withLayerAdded({
          config: AvaMapConfig.makeEmpty(),
          layer,
        }),
        layers: [
          {
            layerId: layer.id,
            featureCollection: {
              type: "FeatureCollection",
              features: [point, point],
            },
            aggregation: undefined,
          },
        ],
      }),
    ).toEqual([{ layerId: layer.id, layerName: "Schools", featureCount: 2 }]);
  });
});
```

Run: `pnpm vitest run src/clients/maps/MapSnapshot/getMapSnapshotLayerSummaries` Expected: FAIL, import not found.

- [ ] **Step 2: Implement.**

```ts
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";

/** One published layer as the publish preview lists it. */
export type MapSnapshotLayerSummary = {
  layerId: MapLayer.Id;
  layerName: string;
  featureCount: number;
};

/** Each published layer's name and how many features it puts on the web. */
export function getMapSnapshotLayerSummaries(
  snapshot: Readonly<MapSnapshot>,
): MapSnapshotLayerSummary[] {
  return snapshot.layers.map((snapshotLayer) => {
    const layer = snapshot.config.layers.find((candidate) => {
      return candidate.id === snapshotLayer.layerId;
    });
    return {
      layerId: snapshotLayer.layerId,
      layerName: layer?.name ?? "",
      featureCount: snapshotLayer.featureCollection.features.length,
    };
  });
}
```

Run. Expected: 1 passed.

- [ ] **Step 3: The preview components.** `PublishMapLayersList.tsx`:

```tsx
import { Plural } from "@lingui/react/macro";
import { List, Stack, Text } from "@mantine/core";
import { getMapSnapshotLayerSummaries } from "@/clients/maps/MapSnapshot/getMapSnapshotLayerSummaries/getMapSnapshotLayerSummaries";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";
import type { ReactNode } from "react";

type Props = { snapshot: MapSnapshot };

/** One map's published layers and their feature counts. */
export function PublishMapLayersList({ snapshot }: Props): ReactNode {
  return (
    <Stack gap={2}>
      <Text size="sm" fw={500}>
        {snapshot.mapName}
      </Text>
      <List size="xs" spacing={2}>
        {getMapSnapshotLayerSummaries(snapshot).map((summary) => {
          return (
            <List.Item key={summary.layerId}>
              {summary.layerName}:{" "}
              <Plural
                value={summary.featureCount}
                one="# feature"
                other="# features"
              />
            </List.Item>
          );
        })}
      </List>
    </Stack>
  );
}
```

`PublishMapLayersPreview.tsx`:

```tsx
import { useQuery } from "@avandar/query-hooks";
import { Trans, useLingui } from "@lingui/react/macro";
import { Group, Loader, Stack, Text, Title } from "@mantine/core";
import { IconMap } from "@tabler/icons-react";
import { useMemo } from "react";
import { prepareMapSnapshots } from "@/clients/dashboards/DashboardClient/dashboardSnapshotHelpers/dashboardMapSnapshots";
import { DashboardMapBlocks } from "@/clients/dashboards/DashboardMapBlocks/DashboardMapBlocks";
import { PublishMapLayersList } from "@/views/DashboardApp/DashboardShareModal/PublishMapLayersPreview/PublishMapLayersList";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

type Props = { dashboard: Dashboard.T };

/**
 * Shows, before a public publish, exactly what each map will put on the web:
 * it compiles the maps the way publishing will and lists every layer with its
 * feature count.
 */
export function PublishMapLayersPreview({ dashboard }: Props): ReactNode {
  const { t } = useLingui();
  const mapIds = useMemo(() => {
    return DashboardMapBlocks.getMapIds(dashboard.config);
  }, [dashboard.config]);
  const [snapshots, isLoading, query] = useQuery({
    queryKey: ["publish-map-preview", dashboard.id, dashboard.updatedAt],
    queryFn: async () => {
      return await prepareMapSnapshots({ dashboard, visibility: "public" });
    },
    enabled: mapIds.length > 0,
    staleTime: Infinity,
  });
  if (mapIds.length === 0) {
    return null;
  }
  return (
    <Stack gap="xs">
      <Group gap={6} align="center">
        <IconMap size={16} aria-hidden />
        <Title order={5} fw={600}>
          <Trans>Maps</Trans>
        </Title>
      </Group>
      <Text size="xs" c="dimmed">
        <Trans>
          Maps are published as what they show: each layer's shapes and popup
          columns, with displaced and aggregated layers already protected. The
          data behind them is not published.
        </Trans>
      </Text>
      {isLoading ? (
        <Loader size="xs" aria-label={t`Checking what each map publishes`} />
      ) : null}
      {query.isError ? (
        <Text size="xs" c="danger">
          <Trans>
            A map could not be prepared for publishing. Open it in Maps to
            check its layers.
          </Trans>
        </Text>
      ) : null}
      {(snapshots ?? []).map((snapshot) => {
        return <PublishMapLayersList key={snapshot.mapId} snapshot={snapshot} />;
      })}
    </Stack>
  );
}
```

- [ ] **Step 4: Mount it.** In `PublishingSection.tsx`, inside the `advanced` `Accordion.Panel`, wrap the existing `PublishSliceSection` and add the preview:

```tsx
            <Stack gap="lg">
              <PublishSliceSection
                dashboard={publishing.currentDashboard}
                publishConfig={publishing.publishConfig}
                onChange={publishing.onPublishConfigChange}
              />
              {publishing.targetVisibility === "public" ? (
                <PublishMapLayersPreview
                  dashboard={publishing.currentDashboard}
                />
              ) : null}
            </Stack>
```

In `PublishingSection.test.tsx`, add:

```tsx
vi.mock(
  "@/views/DashboardApp/DashboardShareModal/PublishMapLayersPreview/PublishMapLayersPreview",
  () => {
    return {
      PublishMapLayersPreview: () => {
        return <div>Maps</div>;
      },
    };
  },
);
```

- [ ] **Step 5: Run.** `pnpm vitest run src/views/DashboardApp/DashboardShareModal src/clients/maps/MapSnapshot` Expected: all pass.

- [ ] **Step 6: Commit.**

```bash
git add src/clients/maps/MapSnapshot/getMapSnapshotLayerSummaries src/views/DashboardApp/DashboardShareModal
git commit -m "feat(dashboards): preview each map layer a public publish exposes"
```

---

## Task 20: End to end

**Files:**
- Create: `tests/e2e/dashboard-map-block.spec.ts`

Preconditions (dataset import, map seed, layer set to Displace) run in `beforeAll` in their own browser context, like `dashboard-public-link-data.spec.ts`. The second test seeds its dashboard with a Map block (a precondition) and drives the publish through the UI.

- [ ] **Step 1: Write the spec.**

```ts
/*
 * A map added to a dashboard from the GIS export sheet renders live for a
 * workspace member. Published to the web, the same kind of dashboard shows a
 * signed-out visitor the map's rendered output: points displaced, no dataset
 * downloaded.
 *
 * The dataset, the map, and its displaced point layer are built in
 * `beforeAll`, in a browser context of its own, because they are
 * preconditions rather than the behavior under test.
 */
import { expect, test } from "./fixtures/e2eWithGlobalViewerMembership.fixture";
import { signInWithEmailPassword, switchToWorkspaceUser } from "./helpers/auth";
import {
  GIS_LAT_LNG_POINTS_CSV_PATH,
  GIS_LAT_LNG_POINTS_ROW_COUNT,
} from "./helpers/constants";
import { DashboardSeedHelpers } from "./helpers/DashboardSeedHelpers";
import { deleteDatasetAndShares } from "./helpers/datasetSharingCleanup";
import { deleteMapsByIds } from "./helpers/deleteMapsByIds";
import { importDatasetViaUi } from "./helpers/importDatasetViaUi";
import { parseDashboardIdFromEditorUrl } from "./helpers/parseDashboardIdFromEditorUrl";
import { seedAvaMap } from "./helpers/seedAvaMap";
import {
  deleteAllDashboardsForOwner,
  deleteDashboardsByIds,
} from "./helpers/seedDashboard";
import { openShareModal, setGeneralAccess } from "./helpers/shareModalFlow";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import { installDuckDbExtensionCache } from "./setup/installDuckDbExtensionCache";
import type { Page } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";

const DATASET_NAME = "lat-lng-points.csv";
const MAP_NAME = "E2E map block";
const PUBLIC_SNAPSHOT_BUCKET = "published";

/** The fixture's eight points, `[longitude, latitude]`. */
const SOURCE_COORDINATES: ReadonlyArray<readonly [number, number]> = [
  [0.5, 0.5],
  [0.7, 0.7],
  [0.9, 0.9],
  [1.1, 1.1],
  [1.3, 1.3],
  [2.5, 0.5],
  [4.5, 0.5],
  [2.7, 0.7],
];

/** What `beforeAll` created, so `afterAll` removes exactly that. */
const seededWorld: {
  workspaceId: string | undefined;
  mapId: string | undefined;
  datasetId: string | undefined;
} = { workspaceId: undefined, mapId: undefined, datasetId: undefined };

/** Every point coordinate in the page's map sources. */
async function _readRenderedPoints(
  page: Page,
): Promise<Array<[number, number]>> {
  return page.evaluate(() => {
    const sources = window.__avandarE2EMap?.getStyle().sources ?? {};
    return Object.values(sources).flatMap((source) => {
      if (source.type !== "geojson" || typeof source.data !== "object") {
        return [];
      }
      const data = source.data as GeoJSON.FeatureCollection;
      return data.features.flatMap((feature) => {
        return feature.geometry.type === "Point"
          ? [
              [
                feature.geometry.coordinates[0]!,
                feature.geometry.coordinates[1]!,
              ] as [number, number],
            ]
          : [];
      });
    });
  });
}

function _isSourceCoordinate(coordinate: readonly [number, number]): boolean {
  return SOURCE_COORDINATES.some(([longitude, latitude]) => {
    return (
      Math.abs(coordinate[0] - longitude) < 1e-9 &&
      Math.abs(coordinate[1] - latitude) < 1e-9
    );
  });
}

/** Adds the dataset as a layer and sets its handling to Displace. */
async function _buildDisplacedPointLayer(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Maps" }).click();
  await page.getByRole("link", { name: `Open the map ${MAP_NAME}` }).click();
  const mapRegion = page.getByRole("region", { name: new RegExp(MAP_NAME) });
  await mapRegion.getByRole("button", { name: "Add a layer" }).click();
  await page.getByPlaceholder("Search data sources").click();
  await page.getByRole("option", { name: DATASET_NAME }).click();
  const inspector = page.getByRole("region", { name: "Layer" });
  await expect(inspector.getByText("8 of 8 rows mapped")).toBeVisible({
    timeout: LONG_WAIT,
  });
  await inspector.getByRole("button", { name: /^Sensitivity/ }).click();
  await inspector.getByRole("combobox", { name: "Handling" }).click();
  await page.getByRole("option", { name: "Displace" }).click();
  await expect(
    page.getByRole("status", { name: "All changes saved" }),
  ).toBeVisible({ timeout: MEDIUM_WAIT });
}

/** Removes a dashboard, its shares, and its published map snapshots. */
async function _deleteDashboard(
  options: Readonly<{ admin: SupabaseClient; dashboardId: string | undefined }>,
): Promise<void> {
  const { admin, dashboardId } = options;
  if (dashboardId === undefined) {
    return;
  }
  const { data: dashboard } = await admin
    .from("dashboards")
    .select("snapshot_revision")
    .eq("id", dashboardId)
    .maybeSingle();
  if (dashboard?.snapshot_revision) {
    const mapsFolder = `dashboards/${dashboardId}/revisions/${dashboard.snapshot_revision}/maps`;
    const { data: objects } = await admin.storage
      .from(PUBLIC_SNAPSHOT_BUCKET)
      .list(mapsFolder);
    const objectPaths = (objects ?? []).map((object) => {
      return `${mapsFolder}/${object.name}`;
    });
    if (objectPaths.length > 0) {
      await admin.storage.from(PUBLIC_SNAPSHOT_BUCKET).remove(objectPaths);
    }
  }
  await admin
    .from("resource_shares")
    .delete()
    .eq("resource_type", "dashboard")
    .eq("resource_id", dashboardId);
  await deleteDashboardsByIds({ admin, dashboardIds: [dashboardId] });
}

test.describe("dashboard map block", () => {
  test.beforeAll(async ({ browser, e2eWorkerDb }, testInfo) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    seededWorld.workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });
    seededWorld.mapId = await seedAvaMap({
      admin,
      workspaceId: seededWorld.workspaceId,
      ownerEmail: primaryUser.email,
      name: MAP_NAME,
    });
    const context = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
      reducedMotion: "reduce",
    });
    await installDuckDbExtensionCache(context);
    try {
      const page = await context.newPage();
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });
      seededWorld.datasetId = await importDatasetViaUi({
        page,
        workspaceSlug,
        filePath: GIS_LAT_LNG_POINTS_CSV_PATH,
        expectedRowCount: GIS_LAT_LNG_POINTS_ROW_COUNT,
      });
      await _buildDisplacedPointLayer(page);
    } finally {
      await context.close();
    }
  });

  test.afterAll(async () => {
    const admin = createSupabaseAdminClient();
    await deleteMapsByIds({
      admin,
      mapIds: seededWorld.mapId ? [seededWorld.mapId] : [],
    });
    if (seededWorld.datasetId) {
      await deleteDatasetAndShares({
        supabaseAdminClient: admin,
        datasetId: seededWorld.datasetId,
      });
    }
  });

  test("a workspace member sees the live map added from the export sheet", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    const { workspaceSlug, primaryUser, secondaryUser } = e2eWorkerDb;
    const { admin, workspaceId } = e2eViewerMembership;
    let dashboardId: string | undefined;
    try {
      // No dashboards, so the modal opens straight on "create".
      await deleteAllDashboardsForOwner({
        admin,
        workspaceId,
        ownerEmail: primaryUser.email,
      });
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });
      await page.getByRole("link", { name: "Maps" }).click();
      await page.getByRole("link", { name: `Open the map ${MAP_NAME}` }).click();
      await page.getByRole("button", { name: "Export", exact: true }).click();
      await page
        .getByRole("dialog", { name: "Export" })
        .getByRole("button", { name: "Add to dashboard" })
        .click();
      const addDialog = page.getByRole("dialog", { name: "Add to dashboard" });
      await addDialog
        .getByRole("textbox", { name: "Dashboard name" })
        .fill("E2E coverage dashboard");
      await addDialog
        .getByRole("button", { name: "Create dashboard & save" })
        .click();
      await page.getByText("Open dashboard").click();
      await expect(page).toHaveURL(/\/dashboards\/edit\//, {
        timeout: LONG_WAIT,
      });
      dashboardId = parseDashboardIdFromEditorUrl(page.url());

      const editorFrame = page.locator("iframe").first().contentFrame();
      await expect(
        editorFrame.getByRole("region", { name: `Map of ${MAP_NAME}` }),
      ).toBeVisible({ timeout: LONG_WAIT });
      await expect(
        editorFrame.getByText("Dashboard filters don't apply to this map yet."),
      ).toBeVisible();

      await openShareModal(page);
      await setGeneralAccess(page, "Workspace", "viewer");
      const shareDialog = page.getByRole("dialog", { name: /^Share / });
      await shareDialog
        .getByRole("button", { name: "Publish to workspace" })
        .click();
      await expect(shareDialog).toContainText(
        "This dashboard is published to your workspace",
        { timeout: LONG_WAIT },
      );

      await switchToWorkspaceUser(page, {
        email: secondaryUser.email,
        password: secondaryUser.password,
        workspaceSlug,
      });
      await page.goto(`/${workspaceSlug}/d/${dashboardId}`, {
        waitUntil: "domcontentloaded",
      });
      await expect(
        page.getByRole("region", { name: `Map of ${MAP_NAME}` }),
      ).toBeVisible({ timeout: LONG_WAIT });
      await expect
        .poll(
          async () => {
            return (await _readRenderedPoints(page)).length;
          },
          { timeout: LONG_WAIT },
        )
        .toBe(SOURCE_COORDINATES.length);
    } finally {
      await _deleteDashboard({ admin, dashboardId });
    }
  });

  test("a signed-out visitor sees the published map's displaced points and no dataset", async ({
    browser,
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }, testInfo) => {
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const { admin, workspaceId } = e2eViewerMembership;
    const mapId = seededWorld.mapId;
    if (!mapId) {
      throw new Error("beforeAll did not seed the map.");
    }
    let dashboardId: string | undefined;
    const visitorContext = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
    });
    try {
      const owner = await DashboardSeedHelpers.getOwner({
        admin,
        ownerEmail: primaryUser.email,
        workspaceId,
      });
      dashboardId = await DashboardSeedHelpers.insertDashboard({
        admin,
        config: DashboardSeedHelpers.makeDashboardConfigFromContent({
          content: [
            {
              type: "Map",
              props: {
                id: "Map-e2e",
                mapId,
                view: { type: "saved" },
                heightPx: 420,
                showLegend: true,
                isInteractive: true,
              },
            },
          ],
          title: "E2E public map",
        }),
        failureMessage: "Failed to seed the map dashboard",
        isRestricted: false,
        missingRowMessage: "Map dashboard seed returned no row",
        name: "E2E public map",
        owner,
        slug: `e2e-map-${crypto.randomUUID().slice(0, 8)}`,
        workspaceId,
        visibility: "draft",
      });

      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });
      await page.goto(`/${workspaceSlug}/dashboards/edit/${dashboardId}`, {
        waitUntil: "domcontentloaded",
      });
      await openShareModal(page);
      const shareDialog = page.getByRole("dialog", { name: /^Share / });
      await shareDialog
        .getByRole("combobox", { name: "General access" })
        .click();
      await page.getByRole("option", { name: "Anyone with the link" }).click();
      await shareDialog.getByRole("button", { name: "Advanced options" }).click();
      await expect(shareDialog).toContainText(`${DATASET_NAME}: 8 features`, {
        timeout: LONG_WAIT,
      });
      await expect(
        shareDialog.getByLabel("Custom URL is available"),
      ).toBeVisible({ timeout: MEDIUM_WAIT });
      await shareDialog.getByRole("button", { name: "Publish publicly" }).click();
      await expect(shareDialog).toContainText("This dashboard is public", {
        timeout: LONG_WAIT,
      });

      await installDuckDbExtensionCache(visitorContext);
      const visitor = await visitorContext.newPage();
      const storageRequestUrls: string[] = [];
      visitor.on("request", (request) => {
        if (request.url().includes("/storage/v1/object/")) {
          storageRequestUrls.push(request.url());
        }
      });
      await visitor.goto(`/d/${dashboardId}`, { waitUntil: "domcontentloaded" });
      await expect(
        visitor.getByRole("region", { name: `Map of ${MAP_NAME}` }),
      ).toBeVisible({ timeout: LONG_WAIT });
      await expect
        .poll(
          async () => {
            return (await _readRenderedPoints(visitor)).length;
          },
          { timeout: LONG_WAIT },
        )
        .toBe(SOURCE_COORDINATES.length);

      const publicPoints = await _readRenderedPoints(visitor);
      expect(publicPoints.filter(_isSourceCoordinate)).toEqual([]);
      expect(
        storageRequestUrls.some((url) => {
          return url.includes(`/maps/${mapId}.json`);
        }),
      ).toBe(true);
      expect(
        storageRequestUrls.filter((url) => {
          return url.includes("/datasets/");
        }),
      ).toEqual([]);
    } finally {
      await visitorContext.close();
      await _deleteDashboard({ admin, dashboardId });
    }
  });
});
```

- [ ] **Step 2: Run it alone.**

```bash
pnpm test:e2e dashboard-map-block.spec.ts
```

Expected: 2 passed. If a selector differs from the live UI (the inspector's Sensitivity header, the toast link), inspect with the Playwright MCP headlessly, save screenshots under `.temp/feat-dashboard-map-block/`, and fix the selector, not the timeout.

- [ ] **Step 3: Run the neighbouring specs this feature touches, one at a time.**

```bash
pnpm test:e2e dashboard-public-link-data.spec.ts
pnpm test:e2e dashboard-workspace-publishing.spec.ts
pnpm test:e2e gis-export-layout.spec.ts
```

Expected: each passes.

- [ ] **Step 4: Commit.**

```bash
git add tests/e2e/dashboard-map-block.spec.ts
git commit -m "test(dashboards): cover a map block from export sheet to public page"
```

---

## Task 21: Translations, types, lint, format, log

**Files:** `src/i18n/locales/*/messages.po` (generated), `docs/measles-demo/pr-feature-log.md`.

- [ ] **Step 1: Extract strings.** `pnpm i18n:extract` Then confirm `src/i18n/locales/en/messages.po` has `#:` references for `MapViewerState.tsx`, `MapPBlock.tsx`, `useMapPBlockConfig.tsx`, `DashboardMapAudienceAlert.tsx`, `PublishMapLayersPreview.tsx`, `ExportSheet.tsx`, and `useAddMapToDashboard.tsx`.

- [ ] **Step 2: Type check.** `pnpm tsc -b --force` Expected: no errors.

- [ ] **Step 3: Lint and format.** `pnpm lint` then `pnpm format`. Re-run Step 2 if formatting changed code.

- [ ] **Step 4: Run every unit test this plan touched.**

```bash
pnpm vitest run src/clients/maps src/clients/storage src/clients/dashboards src/views/GisApp src/views/DashboardApp
```

Expected: all pass.

- [ ] **Step 5: Log the feature.** Add an `F<next number>: Map block in dashboards` section to `docs/measles-demo/pr-feature-log.md`, following the format of its last entry: status `not started`, depends on the F1, F3, and F4 entries, the commits from this branch grouped by PR-sized feature with one note per file, and `supabase/migrations/*_dashboard_map_snapshot_paths.sql` listed as regenerated (not copied) per step 5 of that log's instructions.

- [ ] **Step 6: Commit.**

```bash
git add src/i18n/locales docs/measles-demo/pr-feature-log.md
git commit -m "chore(i18n): extract map block strings and log the feature"
```

---

## Self-review

### Spec coverage

| Spec §7 item | Task |
| --- | --- |
| 7.2 "Add to dashboard" in the export sheet footer: pick or create, append a map block, link to it | 17 |
| 7.2 "Map" in the Puck block list with a map picker | 16 |
| 7.3 `MapPBlock` props `mapId`, `view` (saved or bookmark), `heightPx`, `showLegend`, `isInteractive` | 10, 16 |
| 7.3 `MapViewer` extracted: canvas, legend, attribution, no panels or tools | 15 |
| 7.3 `MapViewer` reuses `useGisAppRendering` and `MapSourceHydration` | 13 (`useMapLayerRendering`, `useHydratedMapConfig` shared by both), 15 |
| 7.3 Disclaimer under the block when a disputed boundary is drawn | 15 (`MapViewerFurniture`, test) |
| 7.4 Live map on workspace dashboards | 15, 16 (`createMapViewerSourceFromMetadata`) |
| 7.4 "You don't have access to this map" for missing map or dataset access | 15 (three no-access tests) |
| 7.4 Share modal warns about maps a recipient cannot see | 18 |
| 7.4 "Filters don't apply" note in the editor | 16 |
| 7.5 Public dashboard publishes rendered output, not sources | 8, 11, 12 |
| 7.5 Saved AOI, time range, spatial filters, sensitivity applied | 5, 8, 9 (same query path and overlay as the live map) |
| 7.5 One GeoJSON feature collection per layer, the map config, the legend | 2, 8 (legend baked through `withLegendUpdates`, Task 7) |
| 7.5 Properties cut to popup columns | 8 (`cutSnapshotFeatureProperties`, two tests) |
| 7.5 Public viewer renders without DuckDB or spatial | 6, 14, 15 (snapshot test asserts no layer rendering hook runs) |
| 7.5 Republish refreshes; never live on a public page | 4, 12 (new generation per publish, old one deleted with its maps) |
| 7.5 Publish preview lists each map layer and its count | 19, 20 |
| 7.6 Unit: block props parsing | 10 |
| 7.6 Unit: jitter layer's published coordinates differ from source | 8 (lat/lng rows and spatial points) |
| 7.6 Unit: `aggregateOnly` publishes only areas | 8 (areas only, and a point is refused) |
| 7.6 Component: `MapViewer` live, snapshot, no-access | 15 |
| 7.6 pgTAP only if the snapshot needs a new storage path | 1 (it does: the path parsers) |
| 7.6 E2E: add from export sheet, member view, publish, signed-out load | 20 |

### Schema decision

The existing snapshot storage is reused: same buckets, same revision folders, same nine policies. The two path parser functions only recognised `datasets/<uuid>.parquet`, so every storage policy (anon read, staged editor read, admin write, cleanup delete) would have denied a map file. Teaching both parsers the `revisions/<rev>/maps/<uuid>.json` shape is the whole change. Storing the map in the dashboard row's `config` was rejected: anyone who can read the row would download every map's features, including editors of a draft.

### Not verifiable from code

1. **Live GIS gap, out of scope:** a `geometryColumn` point layer set to Displace is drawn at exact coordinates in the GIS app (only the lat/lng row path calls `jitterCoordinate`). The publish compiler jitters those points (Task 8), but a live workspace dashboard shows what the GIS app shows. Worth its own fix.
2. **MapLibre inside Puck's editor iframe:** `maplibre-gl.css` is imported at runtime; whether Puck copies it into the canvas iframe (it needed `CanvasAgGridStyles` for AG Grid's runtime styles) is unverified. The e2e editor assertion only checks the region and note, not the visual.
3. **Puck APIs:** boolean `radio` options, `field.metadata` reaching a custom field's `render`, and `resolveData`'s `changed.mapId` on a new map were read from the 0.21 type definitions, not exercised. Task 16 includes the fallback cast if Puck mis-maps the branded `mapId`.
4. **`AvaMapConfig.makeBookmark` signature** (Task 14 test) was not opened; the task says to match it or build the bookmark literally.
5. **e2e selectors:** the Sensitivity section header name, the toast's "Open dashboard" link, the "Add to dashboard" modal title, and whether a Global Viewer member has Maps viewer access were not run. The beforeAll (import plus layer) may exceed the 45 s local budget.
6. **`Blob.text()`** under the Vitest DOM environment (Task 3 test) is assumed available.
7. **Seeded schema v2 dashboard config** with a `Map` block (Task 20) is assumed to pass through `AvaPageData` migrations untouched, since they only rewrite `DataViz` props.
8. **Preview cost:** the publish preview runs the full compile in the share modal when "Advanced options" opens on a public target. Fine for Workflow B's handful of layers; untested on large maps.
9. **Snapshot fidelity:** layers are compiled at the map's saved zoom, so polygon simplification and point aggregation on a public page do not refine on zoom-in.
10. **Duplicate DOM id:** `MapLegend` renders `id="gis-legend"`; two Map blocks on one page duplicate it.
11. **F3 merge:** if F3 extends `MapOverlay` in `useGisAppRendering`, that must move into `createMapOverlayFromMapConfig` (Task 5 note).
12. Concept (case type) layer sources are not covered by the dataset no-access check; a viewer without case access sees those layers fail rather than the no-access state.
