# GIS Wave B: geometry and choropleth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the persisted Wave A map editor into a safe, diagnosable area
mapping tool that renders geometry columns, joins and aggregates workspace data
to boundaries, classifies polygon values, and suppresses sensitive source
records before they leave DuckDB.

**Architecture:** `AvaMapConfig` version 2 stores stable geometry and boundary
references, classification settings, and persisted legend output. A dedicated
GIS compiler wraps the existing structured-query SQL in spatial CTEs and emits
one standardized result envelope. `useMapLayersData` selects the current
latitude/longitude path or the new spatial path, while the render pipeline
consumes both through one runtime result union. Pure classification code assigns
feature classes, a small persistence hook writes derived breaks and ordered
legend entries through the existing autosave controller, and MapLibre receives
circle, line, or fill specifications. Aggregate-only layers are structurally
limited to area-producing bindings and are suppressed in SQL.

**Tech Stack:** TypeScript, React 19, DuckDB-WASM Spatial, MapLibre GL JS,
TanStack Query, Mantine, Lingui, Zod, Vitest, Testing Library, and Playwright.
No Supabase schema or production database changes are part of this plan.

**Approved design:**
`docs/superpowers/specs/2026-08-14-gis-wave-b-design.md`

**Current foundation:** Wave A at commit `e1f29cbe` supplies the version 1 map
config, latitude/longitude layers, multi-layer query caching, MapLibre circle
rendering, inspector sections, legends, status surfaces, and autosave.

---

## Global constraints

- Read and follow `AGENTS.md`, `docs/rules/typescript.md`,
  `docs/rules/testing.md`, `docs/rules/e2e-testing.md`, `docs/rules/css.md`,
  `docs/rules/i18n.md`, and `docs/rules/sql.md` before implementation.
- Use red/green TDD. Add a failing behavioral test before each production
  behavior, run it to confirm the intended failure, implement only enough to
  pass, then rerun the focused file.
- Keep every function at 45 lines or fewer. Exported interfaces need docstrings.
  Non-exported top-level helpers use an underscore prefix.
- `shared/**` imports use explicit `.ts` extensions. `src/**` imports omit them.
- Import models through their namespace entry, except inside the model's own
  folder. Do not add barrels.
- Do not manually edit generated `*.gen.*` files or Lingui `messages.ts` files.
- All user-visible copy uses Lingui. Run extraction and compilation after UI
  tasks.
- Use CSS Modules and Mantine tokens. Inline style is limited to runtime values
  such as a classification swatch color.
- Do not add `d3-array` or another classification dependency. The lockfile has
  transitive copies, but this feature needs a small deterministic pure module
  and should not expand the direct dependency surface.
- Do not add a Supabase migration, schema file, database type change, RPC, or
  production database write.
- Treat configured geometry as EPSG:4326. CRS detection and reprojection
  controls are deferred and must not be added under this plan.
- Latitude/longitude layers must remain operational while DuckDB Spatial is
  loading or unavailable.
- Spatial failure must preserve configuration. Never silently fall back to
  client-side matching, client-side suppression, or a weaker geometry path.
- A control may become usable only when its model, execution, diagnostics,
  rendering, and focused tests are present.
- Run Playwright specs one file at a time. Keep local timeouts at 45 seconds or
  less. Every database mutation in a spec must be cleaned up in `finally`.
- The commit commands in this plan are review checkpoint suggestions. Do not
  run them unless the user separately authorizes commits. Without that
  authorization, leave the worktree dirty for review.

## Reference behavior

The spatial compiler should follow the current DuckDB interfaces rather than
inventing client-side equivalents:

- Geometry constructors and exporters:
  <https://duckdb.org/docs/stable/core_extensions/spatial/functions>
- Extension metadata, including the `loaded` field from
  `duckdb_extensions()`:
  <https://duckdb.org/docs/current/sql/meta/duckdb_table_functions>
- Unicode and accent helpers used by normalized-name matching:
  <https://duckdb.org/docs/stable/sql/functions/text>
- JSON constructors and aggregates used by the result envelope:
  <https://duckdb.org/docs/stable/data/json/creating_json> and
  <https://duckdb.org/docs/stable/data/json/json_functions>

Use these operations in the compiler:

- WKT: `TRY(ST_GeomFromText(CAST(value AS VARCHAR)))`
- Binary WKB: `TRY(ST_GeomFromWKB(value))`
- Hexadecimal WKB: strip an optional `0x` prefix, then use
  `TRY(ST_GeomFromHEXWKB(value))`
- GeoJSON: `TRY(ST_GeomFromGeoJSON(CAST(value AS VARCHAR)))`
- Family validation: `ST_GeometryType`
- Standard output: `ST_AsGeoJSON`
- Point assignment: `ST_Within`
- Simplification: transform to EPSG:3857, use
  `ST_SimplifyPreserveTopology`, then transform back with `always_xy = true`

## Reserved result contract

All spatial queries return the same aliases. Define them once in
`MapLayerSpatialQuery.constants.ts`; tests should import the constants instead
of repeating strings.

```ts
export const MapLayerSpatialQueryColumns = {
  featureCollection: "__avandar_feature_collection",
  diagnostics: "__avandar_diagnostics",
} as const;

export const MapLayerSpatialFeatureProperties = {
  boundaryName: "__avandar_boundary_name",
  classIndex: "__avandar_class_index",
  contributorCount: "__avandar_contributor_count",
  denominator: "__avandar_denominator",
  featureId: "__avandar_feature_id",
  state: "__avandar_state",
  value: "__avandar_value",
} as const;
```

The SQL returns exactly one row containing a GeoJSON FeatureCollection JSON
value and a diagnostics JSON value. This remains true for zero features, so an
unmatched dataset can still explain itself. The application parses both before
rendering. Raw point rows in an aggregate-only layer never appear in either
payload.

`contributorCount` is present only for reportable value and no-data features.
A suppressed feature carries `state = "suppressed"` but no exact contributor
count or protected metric. Its only count-like disclosure is the configured
statement that the area has fewer contributors than the minimum threshold.

## Stage 1: persisted contracts and compatibility

### Task 1: Add the Wave B map-layer type contracts and immutable defaults

**Files:**

- Modify: `shared/models/AvaMap/MapLayer/GeoBinding.types.ts`
- Modify: `shared/models/AvaMap/MapLayer/LayerSymbology.types.ts`
- Modify: `shared/models/AvaMap/MapLayer/LegendConfig.types.ts`
- Modify: `shared/models/AvaMap/MapLayer/MapLayer.types.ts`
- Modify: `shared/models/AvaMap/MapLayer/MapLayer.ts`
- Modify: `shared/models/AvaMap/MapLayer/MapLayerModule/MapLayerModule.ts`
- Modify: `shared/models/AvaMap/MapLayer/MapLayerModule/MapLayerModule.test.ts`

- [x] **Step 1: Write failing constructor and invariant tests**

Add tests showing that a new layer still defaults to an exact circle with no
binding, that a default area layer has fill symbology and an empty persisted
legend output, and that aggregate-only construction cannot retain a point-only
binding.

```ts
it("creates an area layer with an area-producing binding", () => {
  const layer = MapLayer.createArea("Cases by district");
  expect(layer.symbology.type).toBe("fill");
  expect(layer.legend.breaks).toEqual([]);
  expect(layer.legend.entries).toEqual([]);
});

it("removes a point binding when aggregate-only is selected", () => {
  const layer = MapLayer.withSensitivity(_makeCoordinateLayer(), {
    mode: "aggregateOnly",
    minCellCount: 5,
    minGeoLevel: "district",
  });
  expect(layer.geoBinding).toBeUndefined();
  expect(layer.symbology.type).toBe("fill");
});
```

- [x] **Step 2: Run the focused test and confirm RED**

Run:

```bash
pnpm test:frontend MapLayerModule.test.ts
```

Expected: failure because `makeArea`, area bindings, fill symbology, and legend
output fields do not exist.

- [x] **Step 3: Add exact shared contracts**

Use stable model identifiers and discriminated unions. Keep the nested
`MapLayer.version` at 1: version 2 belongs to the containing config and owns
the migration from the old layer shape.

```ts
export type GeometryEncoding = "wkt" | "wkb" | "geojson";
export type GeometryFamily = "point" | "line" | "polygon";
export type GeometrySimplification = { tolerancePixels: number };

export type GeometryColumnBinding = {
  type: "geometryColumn";
  column: QueryColumn.Id;
  encoding: GeometryEncoding;
  family: GeometryFamily;
  simplification: GeometrySimplification | undefined;
};

export type BoundarySourceRef = {
  datasetId: Dataset.Id;
  geometryColumnId: DatasetColumn.Id;
  geometryEncoding: GeometryEncoding;
  keyColumnId: DatasetColumn.Id;
  displayNameColumnId: DatasetColumn.Id | undefined;
  simplification: GeometrySimplification;
};

export type AreaAggregationOutputId = UUID<"AreaAggregationOutput">;

export type AreaAggregation =
  | { operation: "count"; outputValueId: AreaAggregationOutputId }
  | {
      operation: "sum" | "avg" | "min" | "max";
      measureColumn: QueryColumn.Id;
      outputValueId: AreaAggregationOutputId;
    };

export type BoundaryJoinBinding = {
  type: "joinToBoundaries";
  dataKeyColumn: QueryColumn.Id;
  boundary: BoundarySourceRef;
  matching: "exact" | "normalizedName";
  aggregation: AreaAggregation;
};

export type PointBinding =
  | LatLngColumnsBinding
  | (Omit<GeometryColumnBinding, "family" | "simplification"> & {
      family: "point";
    });

export type PointAggregationBinding = {
  type: "aggregatePointsToBoundaries";
  points: PointBinding;
  boundary: BoundarySourceRef;
  aggregation: AreaAggregation;
};
```

Add `GeoBinding` as the union of latitude/longitude, geometry column, boundary
join, and point aggregation. Add namespace exports for every public related
type used outside the model folder.

Make the aggregate-only constraint structural in `MapLayerRead`, not just an
updater convention:

```ts
type LayerProtectionAndRendering =
  | {
      sensitivity: ExactSensitivity | JitterSensitivity;
      geoBinding: GeoBinding | undefined;
      symbology: LayerSymbology;
    }
  | {
      sensitivity: AggregateOnlySensitivity;
      geoBinding: AreaGeoBinding | undefined;
      symbology: FillSymbology;
    };
```

Combine this union with the common versioned layer fields. The version 2 Zod
schema in Task 2 mirrors the same union, so invalid persisted combinations fail
at the JSON boundary instead of relying on React to repair them.

Define value and normalization references without storing column names:

```ts
export type LayerValueRef =
  | { type: "queryColumn"; column: QueryColumn.Id }
  | {
      type: "areaAggregation";
      outputValueId: AreaAggregationOutputId;
    };

export type NormalizationRef =
  | { type: "queryColumn"; column: QueryColumn.Id }
  | { type: "boundaryColumn"; column: DatasetColumn.Id };
```

Expand color and symbology contracts:

```ts
export type NoDataStyle = { color: string; label: string };

export type ColorSpec =
  | { type: "single"; color: string }
  | {
      type: "categorical";
      value: LayerValueRef;
      categories: readonly CategoryColor[];
      other: { color: string; label: string };
      noData: NoDataStyle;
    }
  | {
      type: "graduated";
      value: LayerValueRef;
      ramp: readonly string[];
      classification: ClassificationConfig;
      normalization: NormalizationConfig | undefined;
      noData: NoDataStyle;
    };

export type LayerSymbology =
  | CircleSymbology
  | ProportionalSymbolSymbology
  | { type: "line"; color: ColorSpec; stroke: StrokeSpec }
  | { type: "fill"; color: ColorSpec; stroke: StrokeSpec; opacity: number };
```

`ClassificationConfig` is a union of `quantile`, `equalInterval`, `jenks`, and
`standardDeviation` with `classCount`, plus `manual` with a strictly ordered
`breaks` array. Cap automatic class counts at 7 in schema validation and UI.
Categorical assignments cap at 3 named values plus Other.

Default `other.label` and `noData.label` values are empty overrides. Components
use translated `Other` and `No data` fallbacks for empty overrides, so a model
constructor does not freeze English copy into persisted configuration.

Persist derived legend output independently from editable settings:

```ts
export type LegendBreak = {
  lower: number | undefined;
  upper: number | undefined;
};

export type LegendEntry = {
  type: "value" | "noData" | "suppressed";
  color: string;
  label: string;
  count: number;
};
```

Add `breaks` and `entries` to `LegendConfig`. `makeEmpty` keeps current Wave A
behavior. `createArea` uses fill, a single default color, and the same exact
sensitivity. `withSensitivity` enforces the structural rule: selecting
aggregate-only clears latitude/longitude or point-geometry bindings and changes
non-area symbology to fill. Returning to exact or jitter does not guess a
point binding.

- [x] **Step 4: Run the model tests and confirm GREEN**

Run:

```bash
pnpm test:frontend MapLayerModule.test.ts
```

Expected: all MapLayer module tests pass.

- [x] **Step 5: Format and lint the task files**

Run:

```bash
pnpm exec prettier --write shared/models/AvaMap/MapLayer
pnpm exec eslint --fix shared/models/AvaMap/MapLayer
```

- [ ] **Step 6: Optional authorized checkpoint commit**

```bash
git add shared/models/AvaMap/MapLayer
git commit -m "feat(gis): add wave b layer contracts"
```

### Task 2: Advance `AvaMapConfig` to version 2 and migrate version 1 maps

**Files:**

- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfig.types.ts`
- Modify:
  `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.ts`
- Modify:
  `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.test.ts`
- Modify:
  `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.ts`
- Modify:
  `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test.ts`
- Modify: `shared/models/AvaMap/AvaMapRowParsing.test.ts`
- Modify: `src/clients/maps/AvaMapClient/AvaMapClient.test.ts`

- [x] **Step 1: Write migration tests first**

Cover an empty version 1 map and a version 1 map with a Wave A layer. Assert
that parsing returns version 2, retains the old basemap, view, query, binding,
symbology, popup, and sensitivity, and adds empty legend breaks and entries.
Change the future-version rejection case from version 2 to version 3.

Add a version 1 aggregate-only point layer. Its migration must preserve the
protective policy, clear the unsafe point binding, and use default fill so it is
blocked awaiting an area binding. It must never migrate to exact or jitter and
must never become renderable as raw points.

Also assert that `toJson` always emits version 2, version 2 rejects unknown
fields, a malformed version 1 layer still rejects, and save serialization sends
the normalized version 2 config.

- [x] **Step 2: Run focused tests and confirm RED**

```bash
pnpm test:frontend AvaMapConfigSchema.test.ts
pnpm test:frontend AvaMapConfigModule.test.ts
pnpm test:frontend AvaMapRowParsing.test.ts
pnpm test:frontend AvaMapClient.test.ts
```

Expected: assertions expecting version 2 and migrated legend output fail.

- [x] **Step 3: Implement an explicit version boundary**

Keep a strict private `ConfigV1Schema` matching the current persisted shape.
Build a strict `ConfigV2Schema` from the Task 1 unions. Do not make new fields
optional merely to accept old JSON.

```ts
function _migrateVersion1Layer(layer: ConfigV1Layer): MapLayer.T {
  const legend = { ...layer.legend, breaks: [], entries: [] };
  if (layer.sensitivity.mode !== "aggregateOnly") {
    return { ...layer, legend };
  }
  return {
    ...layer,
    geoBinding: undefined,
    symbology: MapLayer.createDefaultFillSymbology(),
    legend,
  };
}

function _migrateVersion1(config: ConfigV1): AvaMapConfigRead {
  return {
    ...config,
    version: 2,
    layers: config.layers.map(_migrateVersion1Layer),
  };
}

function _parseCurrentConfig(json: unknown): AvaMapConfigRead {
  const versioned = ConfigVersionSchema.parse(json);
  return versioned.version === 1 ?
      ConfigV2Schema.parse(_migrateVersion1(ConfigV1Schema.parse(json)))
    : ConfigV2Schema.parse(json);
}
```

Set `CurrentAvaMapConfigVersion = 2`; update `makeEmpty` to emit version 2.
`fromJson` migrates v1 and parses v2. `toJson` accepts only the current model,
validates it with `ConfigV2Schema`, and emits version 2.

- [x] **Step 4: Run the focused tests and confirm GREEN**

Run the four commands from Step 2. Expected: all pass.

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add shared/models/AvaMap src/clients/maps/AvaMapClient/AvaMapClient.test.ts
git commit -m "feat(gis): migrate map config to version two"
```

## Stage 2: spatial capability and safe compiler boundary

### Task 3: Expose DuckDB Spatial as a tri-state capability

**Files:**

- Create:
  `src/clients/DuckDbClient/DuckDbSpatialAvailability/DuckDbSpatialAvailability.ts`
- Create:
  `src/clients/DuckDbClient/DuckDbSpatialAvailability/DuckDbSpatialAvailability.test.ts`
- Modify: `src/clients/DuckDbClient/DuckDbClient.ts`
- Modify: `src/clients/DuckDbClient/DuckDbClient.types.ts`
- Modify:
  `src/clients/DuckDbClient/shouldLoadDuckDbNetworkExtensions.test.ts`

- [x] **Step 1: Test all transitions**

The store starts at `loading`, notifies subscribers only on a changed value,
becomes `available` after a successful Spatial load, and becomes `unavailable`
when loading is disabled, a pthread bundle prevents network extensions, or the
load throws. A DuckDB core initialization failure may reject normally, but it
must leave Spatial unavailable rather than indefinitely loading.

- [x] **Step 2: Run and confirm RED**

```bash
pnpm test:frontend DuckDbSpatialAvailability.test.ts
pnpm test:frontend shouldLoadDuckDbNetworkExtensions.test.ts
```

Expected: the new store and transitions are missing.

- [x] **Step 3: Implement the external store and client integration**

```ts
export type DuckDbSpatialAvailability = "loading" | "available" | "unavailable";

export type DuckDbSpatialAvailabilityStore = {
  getSnapshot: () => DuckDbSpatialAvailability;
  set: (value: DuckDbSpatialAvailability) => void;
  subscribe: (listener: () => void) => () => void;
};
```

Expose `DuckDbClient.getSpatialAvailability()` and
`DuckDbClient.subscribeSpatialAvailability(listener)`. Set `unavailable`
before skipping the load. Change `loadOptionalExtension` to return a boolean;
set Spatial to `available` only after `LOAD spatial` succeeds. Keep Excel's
existing best-effort behavior.

Do not issue a separate capability query on every layer. The successful load
is the primary signal; a focused client test may use `duckdb_extensions()` to
verify that this signal agrees with DuckDB.

- [x] **Step 4: Run and confirm GREEN**

Run the two Step 2 commands. Expected: all pass.

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add src/clients/DuckDbClient
git commit -m "feat(gis): expose duckdb spatial availability"
```

### Task 4: Add resolved metadata and SQL-safety primitives

**Files:**

- Create:
  `src/clients/maps/MapLayerSpatialQuery/MapLayerSpatialQuery.constants.ts`
- Create:
  `src/clients/maps/MapLayerSpatialQuery/MapLayerSpatialQuery.types.ts`
- Create:
  `src/clients/maps/MapLayerSpatialQuery/escapeSqlStringLiteral.ts`
- Create:
  `src/clients/maps/MapLayerSpatialQuery/escapeSqlStringLiteral.test.ts`
- Create:
  `src/clients/maps/MapLayerSpatialQuery/getResolvedMapLayerMetadata.ts`
- Create:
  `src/clients/maps/MapLayerSpatialQuery/getResolvedMapLayerMetadata.test.ts`

- [x] **Step 1: Write failing safety and resolution tests**

Test single-quote escaping, source query-column ID to derived-name resolution,
boundary dataset-column ID to current-name resolution, missing datasets,
deleted columns, a non-dataset source on a boundary-dependent binding, and an
aggregation measure that is not numeric.

Add a rename case that keeps the same dataset-column ID with a new name and
asserts resolution and compilation use the new quoted name without changing
the persisted boundary reference.

Use names containing quotes and SQL punctuation in tests. Assert compiled
metadata retains the name as data and never exposes an unquoted fragment.

- [x] **Step 2: Run and confirm RED**

```bash
pnpm test:frontend escapeSqlStringLiteral.test.ts
pnpm test:frontend getResolvedMapLayerMetadata.test.ts
```

- [x] **Step 3: Implement exact runtime contracts**

```ts
export type ResolvedBoundarySource = {
  datasetId: Dataset.Id;
  datasetName: string;
  geometryColumnName: string;
  geometryEncoding: MapLayer.GeometryEncoding;
  keyColumnName: string;
  displayNameColumnName: string | undefined;
  simplification: MapLayer.GeometrySimplification;
};

export type MapLayerSpatialQueryPlan = {
  rawSql: string;
  family: MapLayer.GeometryFamily;
  sourcePropertyColumnNames: readonly string[];
  zoomBand: number;
  simplificationReferenceLatitude: number;
};
```

`getResolvedMapLayerMetadata` takes the layer plus already-loaded datasets and
columns. It returns a discriminated success or a `rebindRequired` diagnostic;
it does not fetch or compile. Resolve IDs immediately before compilation.

Use `quoteSqlIdentifier` from `@avandar/utils/sql` for every dataset, CTE,
column, and alias. Use `escapeSqlStringLiteral` only for compiler-owned scalar
literals. No UI file may import either SQL helper.

- [x] **Step 4: Run and confirm GREEN**

Run both Step 2 commands. Expected: all pass.

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add src/clients/maps/MapLayerSpatialQuery
git commit -m "feat(gis): add safe spatial query metadata"
```

## Stage 3: geometry-column vertical slice

### Task 5: Compile and parse WKT, WKB, and GeoJSON geometry layers

**Files:**

- Create:
  `src/clients/maps/MapLayerSpatialQuery/buildGeometryExpression.ts`
- Create:
  `src/clients/maps/MapLayerSpatialQuery/buildGeometryExpression.test.ts`
- Create:
  `src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery.ts`
- Create:
  `src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery.test.ts`
- Create:
  `src/clients/maps/MapLayerSpatialQuery/parseMapLayerSpatialResult.ts`
- Create:
  `src/clients/maps/MapLayerSpatialQuery/parseMapLayerSpatialResult.test.ts`
- Create:
  `src/views/GisApp/layers/MapLayerDataResult.types.ts`

- [x] **Step 1: Write compiler and parser tests**

Test all three encodings, binary WKB, hex WKB, optional `0x`, empty input,
invalid geometry, expected single and multi family acceptance, mixed-family
rejection, and standardized GeoJSON output. Assert the generated SQL quotes a
hostile column name and contains no unquoted copy.

Parser tests cover malformed JSON, wrong envelope shape, no features, mixed
families, and valid FeatureCollection plus diagnostics.

- [x] **Step 2: Run and confirm RED**

```bash
pnpm test:frontend buildGeometryExpression.test.ts
pnpm test:frontend compileMapLayerSpatialQuery.test.ts
pnpm test:frontend parseMapLayerSpatialResult.test.ts
```

- [x] **Step 3: Implement geometry SQL as a source-query wrapper**

Compile the layer's current `StructuredQuery.Partial` with
`structuredQueryToSql`. Place it in a `source_rows` CTE, derive a `geometry`
column once, classify geometry family, and construct one result envelope. Use
these concrete compiler stages:

1. `source_rows`: the exact SQL returned by `structuredQueryToSql`.
2. `parsed_rows`: all source properties plus the encoding-specific expression
   aliased to a compiler-owned quoted `geometry` identifier.
3. `typed_rows`: add `ST_GeometryType(geometry)` and the mapped point, line, or
   polygon family.
4. `diagnostic_summary`: count source rows, null or failed parses, valid parses,
   and each observed family.
5. `feature_rows`: for the configured family only, use `json_object` to build a
   GeoJSON Feature with `json(ST_AsGeoJSON(geometry))` and `to_json` for the
   selected popup properties.
6. Final `SELECT`: use `json_group_array` over `feature_rows`, wrap it in a
   `json_object` with `type = FeatureCollection`, cross join the single
   `diagnostic_summary` row, and alias the two values with
   `MapLayerSpatialQueryColumns`.

Build each CTE with short compiler helpers that accept already-quoted
identifiers. The final query must always select one row. Use an explicitly
typed empty JSON array when `feature_rows` is empty.

For a direct geometry-column layer, properties contain only popup-selected
query columns plus the reserved properties. For a grouped boundary layer,
properties contain boundary identity or display name, safe aggregate output,
state, and applicable reserved values. Never choose an arbitrary source row's
popup property to represent an aggregated area.

The FeatureCollection contains only rows whose geometry parses and belongs to
the configured family. The diagnostics contain source count, parsed count,
invalid count, observed families, and mixed-family state. If a nonconfigured
family exists, return diagnostics but an empty FeatureCollection. Single and
multi variants map to the same point, line, or polygon family.

Define the runtime result union:

```ts
export type MapLayerDataResult =
  | { type: "rows"; queryResult: QueryResult.T<UnknownRow> }
  | {
      type: "spatial";
      featureCollection: GeoJSON.FeatureCollection;
      diagnostics: MapLayerSpatialDiagnostics;
    };
```

- [x] **Step 4: Run and confirm GREEN**

Run all three Step 2 commands. Expected: all pass.

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add src/clients/maps/MapLayerSpatialQuery src/views/GisApp/layers/MapLayerDataResult.types.ts
git commit -m "feat(gis): compile geometry column layers"
```

### Task 6: Route spatial layers through QETL and render line and fill geometry

**Files:**

- Modify: `src/views/GisApp/layers/useMapLayersData/MapLayerData.ts`
- Modify: `src/views/GisApp/layers/useMapLayersData/useMapLayersData.ts`
- Modify: `src/views/GisApp/layers/useMapLayersData/useMapLayersData.test.ts`
- Modify: `src/views/GisApp/layers/useAvaMapRender.ts`
- Modify: `src/views/GisApp/layers/MapLayerViewState.types.ts`
- Modify:
  `src/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types.ts`
- Modify:
  `src/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer.ts`
- Modify:
  `src/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer.test.ts`
- Modify:
  `src/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeMapSpecFromLayerSpecs.test.ts`
- Modify: `src/views/GisApp/useGisApp.ts`

- [x] **Step 1: Add failing routing and rendering tests**

Assert that latitude/longitude uses `runStructuredQuery` without consulting
Spatial; geometry columns wait while capability is loading; unavailable
capability produces an actionable error without executing QETL; available
capability compiles and runs raw SQL through `WorkspaceQetlClient`.

Add MapLibre tests for point geometry as circle, line geometry as line, and
polygon geometry as fill plus outline. Assert layer order and interactive IDs
remain stable in mixed Wave A and Wave B stacks.

- [x] **Step 2: Run and confirm RED**

```bash
pnpm test:frontend useMapLayersData.test.ts
pnpm test:frontend makeLayerSpecFromMapLayer.test.ts
pnpm test:frontend makeMapSpecFromLayerSpecs.test.ts
```

- [x] **Step 3: Integrate the result union**

Change `MapLayerQueryState.queryResult` to `data: MapLayerDataResult | undefined`.
For spatial bindings:

1. Resolve stable IDs to names.
2. Require `DuckDbClient.getSpatialAvailability() === "available"`.
3. Compile with the current integer zoom band.
4. Execute `WorkspaceQetlClient.runQuery({ rawSql, workspaceId })`.
5. Parse the result envelope before caching it.

Subscribe to availability with `useSyncExternalStore`. Include workspace ID,
layer source, binding, sensitivity, Spatial availability, and integer zoom band
plus its captured simplification reference latitude in the query key. Exclude
colors, legend title, and other display-only settings.

Keep `createLayerGeometryCache` only for the row result. Spatial results already
contain GeoJSON and should enter rendering directly. Extend `MapLayerViewState`
with spatial diagnostics, contributor count, no-data count, suppressed count,
and match health. Preserve existing drop fields for Wave A.

Expand `MapLayerSpec` to a union of MapLibre circle, line, and fill layer
specifications. Split short private helpers by symbology type while retaining
one exhaustive exported `makeLayerSpecFromMapLayer` entry.

- [x] **Step 4: Run and confirm GREEN**

Run all three Step 2 commands, then:

```bash
pnpm test:frontend useAvaMapRender
pnpm test:frontend MapCanvas
```

Expected: focused render and canvas tests pass.

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add src/views/GisApp/layers src/views/GisApp/useGisApp.ts
git commit -m "feat(gis): render spatial map layers"
```

### Task 7: Add accessible geometry-column controls

**Files:**

- Modify:
  `src/views/GisApp/panels/LayerInspector/DataSection/DataSection.tsx`
- Modify:
  `src/views/GisApp/panels/LayerInspector/DataSection/DataSection.test.tsx`
- Create:
  `src/views/GisApp/panels/LayerInspector/DataSection/GeometryBindingTypeSelect.tsx`
- Create:
  `src/views/GisApp/panels/LayerInspector/DataSection/GeometryColumnControls.tsx`
- Create:
  `src/views/GisApp/panels/LayerInspector/DataSection/SimplificationControls.tsx`
- Modify:
  `src/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates.ts`
- Modify:
  `src/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates.test.ts`

- [x] **Step 1: Add failing updater and component tests**

Test switching between coordinates and geometry column, selecting the source
column, encoding and expected family, selecting all required query columns,
clearing incompatible fields, identity-preserving no-op updates, disabled
Spatial loading state, and unavailable error copy. Test native labels and
descriptions rather than implementation selectors.

- [x] **Step 2: Run and confirm RED**

```bash
pnpm test:frontend MapLayerUpdates.test.ts
pnpm test:frontend DataSection.test.tsx
```

- [x] **Step 3: Implement the complete control path**

Replace the read-only Geometry select with choices for latitude/longitude and
geometry column. Keep boundary choices hidden until Tasks 9 and 10 finish.
Geometry controls include source column, WKT/WKB/GeoJSON, point/line/polygon,
and an advanced disclosure containing simplification for line or polygon.
Default new line and polygon bindings to 0.75 pixels; a value of zero disables
simplification. They use `useLayerSourceColumns` and `MapLayerUpdates`; they
never assemble SQL.

When aggregate-only is active, do not offer point or line output. Show the
translated explanation that an area-producing binding is required.

Keep every spatial option visible while capability is loading or unavailable,
but disable selection with translated loading or unavailable descriptions. Do
not hide the feature based on the capability state.

- [x] **Step 4: Run and confirm GREEN**

Run both Step 2 commands. Expected: all pass.

- [x] **Step 5: Extract and compile copy**

```bash
pnpm i18n:extract
pnpm i18n:compile
```

Do not manually edit generated catalogs.

- [ ] **Step 6: Optional authorized checkpoint commit**

```bash
git add shared/models/AvaMap src/views/GisApp/layers/MapLayerUpdates src/views/GisApp/panels/LayerInspector/DataSection src/i18n/locales
git commit -m "feat(gis): add geometry column controls"
```

## Stage 4: workspace boundary joins and diagnostics

### Task 8: Resolve workspace boundary datasets and compile key joins

**Files:**

- Create:
  `src/views/GisApp/panels/LayerInspector/DataSection/useBoundarySourceOptions.ts`
- Create:
  `src/views/GisApp/panels/LayerInspector/DataSection/useBoundarySourceOptions.test.tsx`
- Create:
  `src/clients/maps/MapLayerSpatialQuery/buildNormalizedBoundaryKey.ts`
- Create:
  `src/clients/maps/MapLayerSpatialQuery/buildNormalizedBoundaryKey.test.ts`
- Modify:
  `src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery.ts`
- Modify:
  `src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery.test.ts`
- Modify:
  `src/clients/maps/MapLayerSpatialQuery/parseMapLayerSpatialResult.test.ts`

- [x] **Step 1: Write failing resolver and join tests**

Test workspace filtering, dataset labels, geometry/key/display column grouping,
and loading or missing-column states. Compiler tests cover exact matching,
normalized matching, repeated source rows aggregated per boundary, unmatched
data keys, unmatched boundaries, duplicate boundary keys, ambiguous matches,
null keys, an empty join, invalid boundary geometry, and a boundary dataset that
contains a non-polygon family.

Use `Nord-Kivu`, `Nord Kivu`, `NORD KIVU`, and decomposed and precomposed
accented forms in normalized-name tests. Include two distinct boundary keys
that normalize to the same value and assert neither auto-matches.

Normalized matching must have one documented behavior in SQL and tests: cast to
string, apply `nfc_normalize`, apply `strip_accents`, lowercase, replace
punctuation with a space, collapse repeated whitespace, trim, then compare.
Exact matching compares the unmodified values and never matches nulls.

- [x] **Step 2: Run and confirm RED**

```bash
pnpm test:frontend useBoundarySourceOptions.test.tsx
pnpm test:frontend buildNormalizedBoundaryKey.test.ts
pnpm test:frontend compileMapLayerSpatialQuery.test.ts
```

- [x] **Step 3: Implement the join CTEs and diagnostic payload**

Load dataset metadata using `DatasetClient.useGetAll` filtered by workspace and
`DatasetColumnClient.useGetAll` for those IDs. Do not change the dataset model.

The compiler extends Task 5 with concrete join stages: `source_rows` holds the
structured query; `boundary_rows` selects and parses the configured boundary
columns from the quoted dataset ID; `boundary_key_counts` finds duplicate exact
or normalized keys; `unambiguous_boundaries` excludes duplicate keys;
`matched_rows` joins source rows only to unambiguous boundaries; `area_values`
groups the configured operation by boundary feature ID; and
`match_diagnostics` calculates match totals and capped samples. The final
feature and diagnostic JSON expressions use the same envelope from Task 5.

Diagnostics include counts and capped key samples for:

- matched source keys
- unmatched source keys
- boundaries with no source match
- duplicate boundary keys
- source keys matching multiple boundaries

Cap each sample list at 20 and include total counts so large datasets do not
inflate the result. Any duplicate boundary key that makes a source key match
multiple polygons is ambiguous and does not render a value for those polygons.
Distinct boundary keys that collapse to one normalized key are also ambiguous.
Diagnostic samples must be non-sensitive. Under aggregate-only, return category
counts without raw source-key samples.

- [x] **Step 4: Run and confirm GREEN**

Run all three Step 2 commands. Expected: all pass.

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add src/clients/maps/MapLayerSpatialQuery src/views/GisApp/panels/LayerInspector/DataSection/useBoundarySourceOptions*
git commit -m "feat(gis): compile boundary key joins"
```

### Task 9: Add boundary join controls and the match report

**Files:**

- Create:
  `src/views/GisApp/panels/LayerInspector/DataSection/BoundarySourceControls.tsx`
- Create:
  `src/views/GisApp/panels/LayerInspector/DataSection/BoundaryJoinControls.tsx`
- Create:
  `src/views/GisApp/panels/LayerInspector/DataSection/AreaAggregationControls.tsx`
- Create:
  `src/views/GisApp/panels/LayerInspector/MatchReport/MatchReport.tsx`
- Create:
  `src/views/GisApp/panels/LayerInspector/MatchReport/MatchReport.test.tsx`
- Create:
  `src/views/GisApp/panels/LayerInspector/MatchReport/MatchReport.module.css`
- Modify:
  `src/views/GisApp/panels/LayerInspector/DataSection/DataSection.tsx`
- Modify:
  `src/views/GisApp/panels/LayerInspector/DataSection/DataSection.test.tsx`
- Modify:
  `src/views/GisApp/panels/LayerInspector/LayerInspector.tsx`
- Modify:
  `src/views/GisApp/panels/LayerInspector/LayerInspectorBody.tsx`
- Modify: `src/views/GisApp/GisAppLayerInspector.tsx`
- Modify: `src/views/GisApp/useGisApp.ts`
- Modify:
  `src/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates.ts`
- Modify:
  `src/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates.test.ts`

- [x] **Step 1: Add failing UI and update tests**

Cover complete boundary-reference updates, exact/normalized matching, count and
numeric measure selection, stable source query columns, rebind-required states,
and opening and closing the report. Assert changing an aggregation operation or
measure preserves its `outputValueId`, while creating a new area binding mints
one branded ID. The report must distinguish unmatched,
duplicate, and ambiguous samples and show totals even when samples are capped.

- [x] **Step 2: Run and confirm RED**

```bash
pnpm test:frontend MapLayerUpdates.test.ts
pnpm test:frontend DataSection.test.tsx
pnpm test:frontend MatchReport.test.tsx
```

- [x] **Step 3: Implement one complete boundary-join flow**

Reveal `Join to boundaries` in the geometry selector. Require dataset,
geometry column and encoding, boundary key, optional display name, data key,
matching mode, and area aggregation. Disable completion while required
metadata is unresolved.

Add inspector-local view state:

```ts
type LayerInspectorView = { type: "sections" } | { type: "matchReport" };
```

The report occupies the existing inspector body and has a translated Back
button. Open it from Data diagnostics, the selected-layer lead status, and the
layer status badge. Do not create a modal or mutate persistent panel-collapse
preferences.

When a completed join has source rows but zero unambiguous matches, open the
report automatically once for that result fingerprint. Track the fingerprint
in inspector-local state so rerenders and autosave do not repeatedly reopen a
report the author closed.

- [x] **Step 4: Run and confirm GREEN**

Run all three Step 2 commands. Expected: all pass.

- [x] **Step 5: Extract, compile, and lint styles**

```bash
pnpm i18n:extract
pnpm i18n:compile
pnpm lint:css
```

- [ ] **Step 6: Optional authorized checkpoint commit**

```bash
git add src/views/GisApp src/i18n/locales
git commit -m "feat(gis): add boundary join diagnostics"
```

## Stage 5: point aggregation and query-level privacy

### Task 10: Compile point-in-polygon aggregation and suppression

**Files:**

- Modify:
  `src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery.ts`
- Modify:
  `src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery.test.ts`
- Modify:
  `src/clients/maps/MapLayerSpatialQuery/parseMapLayerSpatialResult.test.ts`
- Modify:
  `shared/models/AvaMap/MapLayer/MapLayerModule/MapLayerModule.test.ts`
- Modify:
  `src/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates.test.ts`

- [x] **Step 1: Write privacy-first failing tests**

Cover latitude/longitude and point-geometry input, `ST_Within`, count, sum,
average, minimum, maximum, null measures, zero contributors, multipoints, points
outside every boundary, points contained by overlapping boundaries, and an
incorrect line or polygon geometry source rejected as non-point input.

For aggregate-only, assert SQL applies the minimum contributor count before
constructing result properties. Assert suppressed features expose only boundary
identity, geometry, and `state = "suppressed"`; exact contributor count, value,
source fields, and raw point coordinates are absent. Assert the diagnostic JSON
also omits source values, source keys, coordinates, exact below-threshold
counts, and any metric from which the count could be reconstructed.

- [x] **Step 2: Run and confirm RED**

```bash
pnpm test:frontend compileMapLayerSpatialQuery.test.ts
pnpm test:frontend MapLayerModule.test.ts
pnpm test:frontend MapLayerUpdates.test.ts
```

- [x] **Step 3: Implement the aggregation pipeline**

Use parsed point and boundary CTEs. Join with `ST_Within(point, boundary)` and
aggregate by a stable boundary feature ID. `COUNT(*)` is calculated separately
from the selected value operation. For sum, average, minimum, and maximum,
exclude null measure values from the value calculation while retaining their
rows in contributor count. If every measure is null and the area is not
suppressed, emit `state = "noData"`.

A point contained by more than one boundary is ambiguous: exclude it from every
area and increment an overlap diagnostic rather than double counting it. A
point outside all boundaries increments the outside-boundary diagnostic.

For aggregate-only:

```sql
CASE
  WHEN contributor_count < minimum_count THEN 'suppressed'
  WHEN non_null_measure_count = 0 THEN 'noData'
  ELSE 'value'
END
```

Apply the state before building JSON. The `value` expression is `NULL` for
suppressed and no-data rows. The contributor-count expression is also `NULL`
for suppressed rows. Diagnostics may report the total number of suppressed
areas but never their individual contributor counts. Never return a raw
source-row FeatureCollection as an intermediate application result.

- [x] **Step 4: Run and confirm GREEN**

Run all three Step 2 commands. Expected: all pass.

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add shared/models/AvaMap/MapLayer src/clients/maps/MapLayerSpatialQuery src/views/GisApp/layers/MapLayerUpdates
git commit -m "feat(gis): aggregate points with sql suppression"
```

### Task 11: Add point aggregation controls and enforce aggregate-only end to end

**Files:**

- Create:
  `src/views/GisApp/panels/LayerInspector/DataSection/PointAggregationControls.tsx`
- Modify:
  `src/views/GisApp/panels/LayerInspector/DataSection/DataSection.tsx`
- Modify:
  `src/views/GisApp/panels/LayerInspector/DataSection/DataSection.test.tsx`
- Modify:
  `src/views/GisApp/panels/LayerInspector/SensitivitySection/SensitivityModeSelect.tsx`
- Modify:
  `src/views/GisApp/panels/LayerInspector/SensitivitySection/AggregateSensitivityControls.tsx`
- Modify:
  `src/views/GisApp/panels/LayerInspector/SensitivitySection/SensitivitySection.test.tsx`
- Modify:
  `src/views/GisApp/panels/LayerPanel/LayerRow/LayerStatusBadge/LayerStatusBadge.tsx`
- Modify:
  `src/views/GisApp/panels/LayerPanel/LayerRow/LayerStatusBadge/LayerStatusBadge.test.tsx`

- [x] **Step 1: Write failing flow tests**

Test selecting point aggregation, choosing coordinate or point-geometry input,
choosing a boundary, and selecting every aggregation operation. Test that
switching an existing point layer to aggregate-only clears its point binding,
uses fill, prompts for an area-producing binding, and cannot render until that
binding is complete. Test suppression and no-data area counts in the status
badge. Test that tightening sensitivity applies immediately, while relaxing
aggregate-only to exact or jitter requires the existing confirmation pattern
and leaves the configuration unchanged when cancelled.

- [x] **Step 2: Run and confirm RED**

```bash
pnpm test:frontend DataSection.test.tsx
pnpm test:frontend SensitivitySection.test.tsx
pnpm test:frontend LayerStatusBadge.test.tsx
```

- [x] **Step 3: Implement the complete authoring path**

Reveal `Aggregate points to boundaries` in the geometry selector. Reuse
boundary and aggregation controls, with a nested point-binding selector.
Aggregate-only copy must state the actual rule and minimum contributor count.
Do not offer a client-side preview of suppressed points or an exact count for a
suppressed area. Keep point and sized symbology visible but disabled with the
area-binding explanation while aggregate-only is active.

Status priority is: rebind required, Spatial unavailable, query error,
suppressed, no-data, partial match, ready. Keep the full explanation in the
inspector and use concise accessible badge labels in the layer stack.

- [x] **Step 4: Run and confirm GREEN**

Run all three Step 2 commands. Expected: all pass.

- [x] **Step 5: Extract and compile copy**

```bash
pnpm i18n:extract
pnpm i18n:compile
```

- [ ] **Step 6: Optional authorized checkpoint commit**

```bash
git add src/views/GisApp src/i18n/locales
git commit -m "feat(gis): add private area aggregation flow"
```

## Stage 6: classification, choropleths, and legends

### Task 12: Implement deterministic classification and normalization

**Files:**

- Create:
  `src/views/GisApp/layers/classifyLayerValues/classifyLayerValues.ts`
- Create:
  `src/views/GisApp/layers/classifyLayerValues/classifyLayerValues.test.ts`
- Create:
  `src/views/GisApp/layers/classifyLayerValues/makeJenksBreaks.ts`
- Create:
  `src/views/GisApp/layers/classifyLayerValues/makeJenksBreaks.test.ts`
- Create:
  `src/views/GisApp/layers/classifyLayerValues/normalizeLayerValue.ts`
- Create:
  `src/views/GisApp/layers/classifyLayerValues/normalizeLayerValue.test.ts`
- Modify:
  `src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery.ts`
- Modify:
  `src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery.test.ts`

- [x] **Step 1: Write table-driven failing tests**

Cover quantile, equal interval, Jenks, standard deviation, and manual breaks;
duplicates; negative values; one unique value; fewer unique values than classes;
null and nonnumeric values; deterministic tie handling; and empty input.
Add a dataset with more than 5,000 values and assert Jenks uses exactly 5,000
evenly ranked samples, returns the same breaks on repeated calls, and reports
that sampling occurred. Cover all-equal, all-null, and low-distinct-count
inputs as explicit degenerate results.

Normalization tests cover multipliers 1, 1,000, and 100,000, negative
denominators, and null or zero denominator as no-data. For boundary joins,
query-column denominators are aggregated consistently with the value rows;
boundary denominators are read once per polygon. Point aggregation permits
only boundary denominators. A negative nonzero denominator follows arithmetic
division; null and zero are no-data.

- [x] **Step 2: Run and confirm RED**

```bash
pnpm test:frontend classifyLayerValues.test.ts
pnpm test:frontend makeJenksBreaks.test.ts
pnpm test:frontend normalizeLayerValue.test.ts
```

- [x] **Step 3: Implement exact algorithms**

Return one structure used by both painting and persistence:

```ts
export type LayerClassification = {
  breaks: readonly MapLayer.LegendBreak[];
  entries: readonly MapLayer.LegendEntry[];
  classIndexByFeatureId: ReadonlyMap<string, number>;
  sourceValueCount: number;
  classifiedValueCount: number;
  distinctValueCount: number;
  didSample: boolean;
  recommendation: "classified" | "singleColor" | "noData";
};
```

Algorithm definitions:

- Equal interval divides `[min, max]` into equal widths.
- Quantile uses sorted finite values and nearest-rank cut positions; advance a
  cut past equal values so one value never spans two classes.
- Jenks uses dynamic programming over sorted finite values and chooses the
  lowest within-class squared deviation; ties choose the lower cut index. When
  more than 5,000 finite values exist, sample 5,000 evenly spaced ranks from the
  sorted array, including both endpoints.
- Standard deviation creates centered thresholds at half-standard-deviation
  increments and trims unused outer classes. Zero deviation yields one class.
- Manual uses exactly the author's strictly increasing cut values.

Every boundary is represented once. Use lower-inclusive, upper-exclusive
ranges except the last range, which includes its upper value. Labels are built
from the same break objects used for class assignment.

Categorical classification keeps the first three configured categories in
author order, then Other. Null remains no-data and never falls into Other.

Clamp requested class count to the number of distinct finite values. One unique
value returns a structured single-color recommendation. All-null input returns
only no-data. Include `sourceValueCount`, `classifiedValueCount`,
`distinctValueCount`, and `didSample` in the classification result for the
editor explanation.

Before classification, extend the spatial compiler to emit the reserved
denominator property. A geometry-column layer reads a query-column denominator
from the same feature. A boundary join accepts a prepared-data denominator only
when all non-null values for that area agree, otherwise it emits no-data and an
inconsistent-denominator diagnostic. A boundary-column denominator is read once
from the boundary row. Point aggregation permits only the boundary-column path.

- [x] **Step 4: Run and confirm GREEN**

Run all three Step 2 commands. Expected: all pass.

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add src/views/GisApp/layers/classifyLayerValues
git commit -m "feat(gis): classify choropleth values"
```

### Task 13: Paint choropleths and persist the exact active legend

**Files:**

- Modify: `src/views/GisApp/layers/useAvaMapRender.ts`
- Create:
  `src/views/GisApp/layers/usePersistedLayerLegends/usePersistedLayerLegends.ts`
- Create:
  `src/views/GisApp/layers/usePersistedLayerLegends/usePersistedLayerLegends.test.tsx`
- Modify:
  `src/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer.ts`
- Modify:
  `src/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer.test.ts`
- Modify:
  `src/views/GisApp/panels/LegendPanel/MapLegend/MapLegendGroup.tsx`
- Modify:
  `src/views/GisApp/panels/LegendPanel/MapLegend/MapLegend.test.tsx`
- Modify:
  `src/views/GisApp/panels/LegendPanel/MapLegend/MapLegend.module.css`
- Modify: `src/views/GisApp/useGisApp.ts`

- [x] **Step 1: Write failing render, persistence, and legend tests**

Test graduated and categorical MapLibre expressions, Other, no-data, and
suppressed states. Assert suppressed styling cannot be mistaken for a numeric
class. Test that a derived legend update writes once, an equal update preserves
object identity and does not autosave, a changed result updates breaks and
entries together, and a stale query result cannot overwrite a newer layer
configuration.

Test ordered legend rows, counts, units, no-data visibility, a distinct
suppressed pattern, and accessible labels.

- [x] **Step 2: Run and confirm RED**

```bash
pnpm test:frontend makeLayerSpecFromMapLayer.test.ts
pnpm test:frontend usePersistedLayerLegends.test.tsx
pnpm test:frontend MapLegend.test.tsx
```

- [x] **Step 3: Derive once and share the result**

`useAvaMapRender` classifies spatial features and adds the reserved class-index
property without changing source properties. It returns `legendUpdates` keyed
by layer ID, with a fingerprint of the source, binding, symbology, sensitivity,
and query result that produced them.

`usePersistedLayerLegends` runs after render derivation, compares breaks and
entries by value, verifies that the layer fingerprint still matches, and calls
the existing `editor.updateConfig` once for all changed layers. This one
immutable update writes active breaks and ordered entries together through the
existing 800 ms autosave. It must not clear a previously saved legend while a
query is loading or unavailable.

MapLibre fill-color expressions branch first on `__avandar_state`, then on
`__avandar_class_index`. Legend rendering reads persisted entries, not a second
classification calculation.

- [x] **Step 4: Run and confirm GREEN**

Run all three Step 2 commands, then:

```bash
pnpm test:frontend useAvaMapEditor.test.ts
```

Expected: legend and autosave tests pass without duplicate saves.

- [x] **Step 5: Lint CSS and optionally checkpoint**

```bash
pnpm lint:css
```

If commits are authorized:

```bash
git add src/views/GisApp
git commit -m "feat(gis): render and persist choropleth legends"
```

### Task 14: Add the focused classification editor

**Files:**

- Create:
  `src/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationEditor.tsx`
- Create:
  `src/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationEditor.test.tsx`
- Create:
  `src/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationEditor.module.css`
- Create:
  `src/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationHistogram.tsx`
- Create:
  `src/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationBreakList.tsx`
- Create:
  `src/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationBreakHandles.tsx`
- Create:
  `src/views/GisApp/panels/LayerInspector/ClassificationEditor/NormalizationControls.tsx`
- Create:
  `src/views/GisApp/panels/LayerInspector/ClassificationEditor/CategoricalControls.tsx`
- Create:
  `src/views/GisApp/panels/LayerInspector/ClassificationEditor/NoDataControls.tsx`
- Modify:
  `src/views/GisApp/panels/LayerInspector/StyleSection/StyleSection.tsx`
- Modify:
  `src/views/GisApp/panels/LayerInspector/StyleSection/StyleSection.test.tsx`
- Modify:
  `src/views/GisApp/panels/LayerInspector/StyleSection/SymbologyTypeControl.tsx`
- Modify:
  `src/views/GisApp/panels/LayerInspector/LayerInspector.tsx`
- Modify:
  `src/views/GisApp/panels/LayerInspector/LayerInspectorBody.tsx`
- Modify:
  `src/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates.ts`
- Modify:
  `src/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates.test.ts`

- [x] **Step 1: Write failing behavior and accessibility tests**

Cover opening the editor from polygon fill style, returning to sections,
single/categorical/graduated modes, method and class count, ramp selection,
manual break validation, numeric and boundary denominator options, multiplier,
three-category cap, Other, no-data, histogram summaries, and the visible notice
when Jenks sampled more than 5,000 values. Cover all-equal, single-value,
all-null, and class-count-clamped explanations.

Assert each input has a visible label, errors are associated with the relevant
field, keyboard users can reach every control, and no English display literal
bypasses Lingui. Test pointer movement of a break handle, Arrow movement by one
histogram bin, Shift plus Arrow movement by ten bins, visible focus, ordinal and
current value in each accessible handle name, reduced-motion behavior, and an
`aria-live` announcement when moving a handle switches the method to Manual.

- [x] **Step 2: Run and confirm RED**

```bash
pnpm test:frontend ClassificationEditor.test.tsx
pnpm test:frontend StyleSection.test.tsx
pnpm test:frontend MapLayerUpdates.test.ts
```

- [x] **Step 3: Implement the focused inspector view**

Extend `LayerInspectorView` with `{ type: "classification" }`. Render the
editor in the inspector body, not a modal. The Style section opens it only for
polygon fill. Line layers keep single color. Point categorical remains absent.

Use structured values in non-component modules and translate labels inside the
components. Updating a classification setting clears only incompatible derived
legend output; the render persistence hook supplies the replacement atomically.
Manual breaks must be finite and strictly increasing before the update applies.
Render break handles over the histogram and keep the editable numeric break
list synchronized with them. Pointer and keyboard movement both change the
method to Manual through one updater. If values are all equal or only one finite
value exists, offer single color instead of displaying unusable handles.

- [x] **Step 4: Run and confirm GREEN**

Run all three Step 2 commands. Expected: all pass.

- [x] **Step 5: Extract, compile, and lint**

```bash
pnpm i18n:extract
pnpm i18n:compile
pnpm lint:css
```

- [ ] **Step 6: Optional authorized checkpoint commit**

```bash
git add src/views/GisApp src/i18n/locales
git commit -m "feat(gis): add choropleth classification editor"
```

## Stage 7: zoom simplification and complete operational states

### Task 15: Add topology-preserving integer zoom-band simplification

**Files:**

- Create:
  `src/clients/maps/MapLayerSpatialQuery/getSimplificationTolerance.ts`
- Create:
  `src/clients/maps/MapLayerSpatialQuery/getSimplificationTolerance.test.ts`
- Modify:
  `src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery.ts`
- Modify:
  `src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery.test.ts`
- Modify: `src/views/GisApp/layers/useMapLayersData/MapLayerData.ts`
- Modify: `src/views/GisApp/layers/useMapLayersData/useMapLayersData.test.ts`
- Modify: `src/views/GisApp/useGisApp.ts`
- Modify: `src/clients/DuckDbClient/DuckDbClient.ts`
- Create: `src/clients/DuckDbClient/abortDuckDbQuery/abortDuckDbQuery.ts`
- Create:
  `src/clients/DuckDbClient/abortDuckDbQuery/abortDuckDbQuery.test.ts`
- Modify: `src/clients/qetl/QetlClient.ts`
- Modify: `src/clients/qetl/WorkspaceQetlClient.ts`

- [x] **Step 1: Write failing tolerance and cache tests**

Test tolerance at zoom 0, mid zoom, and high zoom, clamped integer bands,
disabled simplification, 0.75 pixel default, and identical query keys within a
band. Assert crossing a band causes one refetch after `moveend`; fractional
movement inside a band causes none. Test both boundary and geometry-column line
or polygon paths. Assert the map center latitude captured on entry to a zoom
band affects tolerance. Assert a superseded query calls DuckDB cancellation and
the previous FeatureCollection remains rendered until its replacement arrives.

- [x] **Step 2: Run and confirm RED**

```bash
pnpm test:frontend getSimplificationTolerance.test.ts
pnpm test:frontend compileMapLayerSpatialQuery.test.ts
pnpm test:frontend useMapLayersData.test.ts
pnpm test:frontend abortDuckDbQuery.test.ts
```

- [x] **Step 3: Implement the zoom contract**

Use MapLibre's 512-pixel world tile convention:

```ts
const WEB_MERCATOR_WORLD_METERS = 40_075_016.68557849;

export function getSimplificationTolerance(
  zoomBand: number,
  centerLatitude: number,
  tolerancePixels: number,
): number {
  const clampedLatitude = Math.max(
    -85.051129,
    Math.min(85.051129, centerLatitude),
  );
  const latitudeScale = Math.cos((clampedLatitude * Math.PI) / 180);
  return (
    (WEB_MERCATOR_WORLD_METERS / (512 * 2 ** zoomBand)) *
    latitudeScale *
    tolerancePixels
  );
}
```

The compiler transforms EPSG:4326 geometry to EPSG:3857 with `always_xy`, runs
`ST_SimplifyPreserveTopology`, and transforms back. Do not simplify points.
Use the integer floor of the persisted map zoom, clamped to the supported
MapLibre range. Capture center latitude when the map first loads and whenever it
enters a new integer zoom band; panning inside the same band retains that
reference latitude. The existing `moveend` view update is the debounce boundary,
so do not add a timer on every map movement.

Pass TanStack Query's `AbortSignal` through `WorkspaceQetlClient`, `QetlClient`,
and `DuckDbClient.runRawQuery`. Register a one-shot abort listener that calls
`AsyncDuckDBConnection.cancelSent()` and always removes the listener in
`finally`. Check `signal.throwIfAborted()` before dataset loading and before
starting SQL. Use TanStack Query `placeholderData` to retain the preceding
spatial result for the same layer while a new zoom-band request is fetching;
expose `isRefreshing` separately instead of changing a rendered ready layer to
empty.

- [x] **Step 4: Run and confirm GREEN**

Run all four Step 2 commands. Expected: all pass.

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add src/clients/maps/MapLayerSpatialQuery src/views/GisApp/layers src/views/GisApp/useGisApp.ts
git commit -m "feat(gis): simplify boundaries by zoom band"
```

### Task 16: Complete error, no-data, suppression, and match-health surfaces

**Files:**

- Modify:
  `src/views/GisApp/panels/LayerInspector/LayerLeadStatus.tsx`
- Modify:
  `src/views/GisApp/panels/LayerPanel/LayerRow/LayerStatusBadge/LayerStatusBadge.tsx`
- Modify:
  `src/views/GisApp/panels/MapStatusCard/MapStatusCard.tsx`
- Modify:
  `src/views/GisApp/panels/MapStatusCard/MapStatusCard.test.tsx`
- Modify:
  `src/views/GisApp/panels/LegendPanel/MapLegend/MapLegendGroup.tsx`
- Modify:
  `src/views/GisApp/panels/LegendPanel/MapLegend/MapLegend.test.tsx`
- Modify: `src/views/GisApp/GisAppStatusCard.tsx`

- [x] **Step 1: Add failing cross-surface state tests**

Cover Spatial loading and unavailable, rebind required, invalid geometry,
mixed geometry families, zero matches, partial matches, duplicate boundary
keys, no-data, suppressed areas, all-suppressed layers, and retry. Assert the
same underlying `MapLayerViewState` produces compatible wording and counts in
the layer row, inspector, map status card, and legend.

- [x] **Step 2: Run and confirm RED**

```bash
pnpm test:frontend LayerStatusBadge.test.tsx
pnpm test:frontend MapStatusCard.test.tsx
pnpm test:frontend MapLegend.test.tsx
```

- [x] **Step 3: Implement state prioritization once**

Add a pure `getMapLayerOperationalState` helper beside
`MapLayerViewState.types.ts` and test it directly. Components translate and
format that structured state. Unavailable Spatial copy must explain that the
layer configuration is saved and the author can retry after connectivity or
extension availability returns. Match issues link to the Task 9 report.

Suppressed areas use a hatch or similar CSS pattern with text, not color alone.
No-data and suppressed legend rows remain distinct even if their configured
colors happen to match.

- [x] **Step 4: Run and confirm GREEN**

Run all three Step 2 commands. Expected: all pass.

- [x] **Step 5: Extract, compile, and lint**

```bash
pnpm i18n:extract
pnpm i18n:compile
pnpm lint:css
```

- [ ] **Step 6: Optional authorized checkpoint commit**

```bash
git add src/views/GisApp src/i18n/locales
git commit -m "feat(gis): surface spatial layer health"
```

## Stage 8: focused end-to-end proof and final verification

### Task 17: Add small GIS fixtures and opt-in Spatial Playwright execution

**Files:**

- Create: `tests/data/gis-wave-b/gis-wave-b-geometry.csv`
- Create: `tests/data/gis-wave-b/gis-wave-b-boundaries.csv`
- Create: `tests/data/gis-wave-b/gis-wave-b-points.csv`
- Create: `tests/data/gis-wave-b/gis-wave-b-summary.csv`
- Create: `tests/e2e/helpers/importDatasetViaUi.ts`
- Modify: `tests/e2e/helpers/constants.ts`
- Modify: `tests/e2e/gis-map-layers.spec.ts`
- Modify: `tests/e2e/setup/ensureE2EViteFeatureFlags.ts`
- Create: `tests/e2e/setup/ensureE2EViteFeatureFlags.test.ts`
- Modify: `playwright.config.ts`
- Create: `tests/e2e/gis-geometry-column.spec.ts`
- Create: `tests/e2e/gis-boundary-join.spec.ts`
- Create: `tests/e2e/gis-choropleth-suppression.spec.ts`

- [x] **Step 1: Extract the existing UI import helper with no behavior change**

Move `_importSampleCsv` from `gis-map-layers.spec.ts` into a parameterized
helper accepting file path, expected row count, and workspace slug. Keep the
existing Wave A spec green before adding new fixtures.

Run:

```bash
pnpm test:e2e tests/e2e/gis-map-layers.spec.ts
```

Expected: the existing focused GIS spec passes.

- [x] **Step 2: Test Spatial flag opt-in before implementation**

Add unit tests that an offline E2E run adds `disable-duckdb-spatial`, while a
normal run removes that flag even if it came from `.env.development`. Add a
config predicate that also disables web-server reuse, preventing connection to
an already running Vite server with the old flag.

Superseded: this step originally opted *in* to Spatial through a
`PLAYWRIGHT_ENABLE_DUCKDB_SPATIAL` variable. The shipped design inverts it.
Spatial is on for a bare `pnpm test:e2e`, and `pnpm test:e2e:offline` opts out.
See `ensureE2EViteFeatureFlags.ts`.

Run:

```bash
pnpm test:frontend ensureE2EViteFeatureFlags.test.ts
```

Expected before implementation: the opt-in test fails.

- [x] **Step 3: Implement the isolated runner behavior**

Playwright loads the Spatial extension by default, so these specs need no
extra opt-in:

```bash
pnpm test:e2e tests/e2e/gis-geometry-column.spec.ts
```

In `playwright.config.ts`, set `reuseExistingServer` to false for the Vite
server. Offline runs skip these specs by `grepInvert` on the `@online` tag
rather than letting them time out.

- [x] **Step 4: Create minimal deterministic fixtures**

Use no more than 12 rows per file. Boundaries are nonoverlapping simple WKT
polygons with stable codes, names, and numeric population. Geometry rows cover
point, line, polygon, invalid WKT, hexadecimal WKB with and without `0x`,
GeoJSON, numeric value, and category fields. Point rows create one value area,
one no-data area, and one area below the contributor threshold. Summary rows
include exact, normalized-only, diacritic-only, unmatched, duplicate, and null
keys.

- [x] **Step 5: Write the geometry-column E2E flow**

Through the UI: import the geometry fixture, open a version 1 seeded map, add a
layer, select WKT geometry and polygon family, confirm geometry diagnostics and
the polygon, then switch the same layer to hexadecimal WKB and GeoJSON columns
and confirm each real DuckDB path renders. Leave GeoJSON selected, wait for
autosave, reload, and confirm binding and geometry persist. Clean map and
dataset rows in `finally`.

- [x] **Step 6: Write the boundary-join E2E flow**

Through the UI: import summary and boundary fixtures, configure normalized key
matching and count aggregation, confirm polygons and partial-match status, open
the match report, and verify unmatched and ambiguous examples. Reload only for
the persistence assertion. Clean every created row in `finally`.

- [x] **Step 7: Write the choropleth and suppression E2E flow**

Through the UI: import point and boundary fixtures, select aggregate points to
boundaries, set aggregate-only and a minimum count, choose graduated fill and
normalization, verify value/no-data/suppressed legend rows, verify the
suppressed area has no popup source fields, protected metric, or exact
contributor count, wait for autosave, and reload to confirm identical breaks.
Clean every created row in `finally`.

- [ ] **Step 8: Run each Spatial E2E file separately**

Blocked on 2026-08-14: the running local Supabase database does not have the
repository's `20260814144449_maps_table.sql` migration applied, so every spec
fails in `seedAvaMap` before browser interaction. The migration histories also
diverge, so this worktree did not mutate or reset the shared local database.

```bash
pnpm test:e2e tests/e2e/gis-geometry-column.spec.ts
pnpm test:e2e tests/e2e/gis-boundary-join.spec.ts
pnpm test:e2e tests/e2e/gis-choropleth-suppression.spec.ts
```

Expected: each file passes independently within the configured local 45-second
per-test ceiling. Do not run the full E2E suite.

- [ ] **Step 9: Optional authorized checkpoint commit**

```bash
git add playwright.config.ts tests/data/gis-wave-b tests/e2e
git commit -m "test(gis): cover wave b spatial flows"
```

### Task 18: Run the Wave B regression and quality gate

**Files:**

- Verify all files changed by Tasks 1 through 17
- Update this plan's checkboxes during execution

- [x] **Step 1: Run focused model and client groups**

```bash
pnpm test:frontend AvaMap
pnpm test:frontend MapLayer
pnpm test:frontend DuckDbSpatial
pnpm test:frontend MapLayerSpatialQuery
pnpm test:frontend classifyLayerValues
```

Expected: all focused tests pass.

- [x] **Step 2: Run focused GIS component and render groups**

```bash
pnpm test:frontend src/views/GisApp
```

Expected: all GIS Vitest files pass.

- [x] **Step 3: Verify translation catalogs**

```bash
pnpm i18n:check
```

Expected: extraction leaves no uncommitted catalog difference beyond the
intended Wave B catalog changes already present in the worktree.

- [x] **Step 4: Type-check, lint, and build**

```bash
pnpm type-check
pnpm lint
pnpm build
```

Expected: every command exits zero. Review the nonblocking React Doctor output
from `pnpm lint`; resolve new Wave B diagnostics even though the script itself
does not fail on them.

- [ ] **Step 5: Run the four focused GIS E2E files one at a time**

Blocked by the same unapplied maps-table migration described in Task 17.

```bash
pnpm test:e2e tests/e2e/gis-map-layers.spec.ts
pnpm test:e2e tests/e2e/gis-geometry-column.spec.ts
pnpm test:e2e tests/e2e/gis-boundary-join.spec.ts
pnpm test:e2e tests/e2e/gis-choropleth-suppression.spec.ts
```

Expected: every file passes independently. Do not replace these commands with
the full Playwright suite.

- [x] **Step 6: Audit scope and generated files**

```bash
git status --short
git diff --stat
git diff --check
git diff --name-only | rg '(\.gen\.|/messages\.ts$)' || true
git diff --name-only | rg '^(supabase/|shared/types/database\.types\.ts$)' || true
```

Expected: `git diff --check` is clean; no generated file was manually edited;
no Supabase schema, migration, or generated database type changed.

- [x] **Step 7: Review the approved cut line**

Confirm every included item in design sections 3 through 10 has an implemented
task and passing evidence. Confirm deferred items remain absent: dataset-level
sensitivity, catalogs or HDX, CRS controls, coordinate validation report, grid
or hex binning, clustering, heatmaps, point categorical styling, geometry
editing, and Supabase schema changes.

- [ ] **Step 8: Optional authorized final checkpoint commit**

Only if commits were explicitly authorized and there are verified remaining
changes:

```bash
git add docs/superpowers/plans/2026-08-14-gis-wave-b-geometry-and-choropleth.md shared/models/AvaMap src/clients/DuckDbClient src/clients/maps/MapLayerSpatialQuery src/views/GisApp src/i18n/locales playwright.config.ts tests/data/gis-wave-b tests/e2e
git commit -m "feat(gis): complete wave b area mapping"
```

## Implementation review checklist

Before calling Wave B complete, verify all of the following from code and test
output:

- Every valid version 1 map parses as version 2 without behavior loss.
- Version 2 JSON is strict and future versions reject.
- Wave A latitude/longitude layers do not depend on Spatial availability.
- WKT, binary WKB, hex WKB, and GeoJSON all standardize to GeoJSON.
- Single and multi geometries share a family; mixed families fail visibly.
- Boundary references persist IDs and resolve current names at execution time.
- Exact and normalized joins report unmatched, duplicate, and ambiguous keys.
- Count, sum, average, minimum, and maximum retain contributor count.
- Aggregate-only source rows are suppressed inside SQL and never reach React.
- Null or zero normalization denominators are no-data, never infinity.
- Quantile, equal interval, Jenks, standard deviation, and manual breaks are
  deterministic and share one result with map paint and legend persistence.
- Categorical polygon styling has at most three named values plus Other.
- Real value, no-data, and suppressed states are visibly and semantically
  distinct.
- Saved breaks and ordered legend entries survive reload unchanged.
- Simplification uses 0.75 pixels, integer zoom bands, and topology preservation.
- Loading, unavailable, rebind-required, invalid, no-match, partial-match,
  no-data, suppressed, and ready states are actionable.
- Every display string uses Lingui and every interactive control is keyboard and
  screen-reader accessible.
- No deferred capability or Supabase schema change entered the diff.

## Plan handoff

Execute tasks in order. Stages 1 and 2 are hard prerequisites. Within each
later stage, do not expose the UI choice until that stage's compiler, parser,
diagnostics, renderer, and focused tests are green. Stop at every task boundary
for review when using `superpowers:executing-plans`.
