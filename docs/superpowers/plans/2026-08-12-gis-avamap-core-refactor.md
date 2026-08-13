# GIS AvaMap Core Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the GIS app's data and rendering layers on an `AvaMap` config model whose queries run through the shared structured-query executor, replacing the 553-line imperative effect with pure, tested units.

**Architecture:** A map is an `AvaMap` config holding ordered `MapLayer`s. Each layer decomposes into three independent axes: `source` (a `StructuredQuery` run through QETL), `geoBinding` (how rows become geometry), and `symbology` (how geometry is painted), with a `sensitivity` policy that constrains what painting is permitted. Data flows `source -> runStructuredQuery -> toFeatureCollection -> computeLayerStats -> createMapSpec -> syncMap`. Everything up to `syncMap` is a pure function; `syncMap` is the only code that calls MapLibre imperatively.

**Tech Stack:** TypeScript, React, MapLibre GL JS, DuckDB-WASM (via `WorkspaceQETLClient`), TanStack Query, Mantine, Lingui, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-12-gis-avamap-design.md` (Phase 1, items 1-8 and 10). Permissions (item 9) is a separate plan: `2026-08-12-gis-app-type-permissions.md`.

---

## Conventions this plan follows

Read these before Task 1. They are not negotiable and reviewers enforce them.

- **`AGENTS.md`** and **`docs/rules/typescript.md`**: no em dashes in comments, functions under 45 lines, descriptive names, docstrings on exported symbols.
- **`docs/rules/testing.md`**: no tautological tests. Never assert `typeof x === "function"` or that a non-nullable value is defined. Assert values, side effects, and error paths only.
- **Naming**: model modules use `make*` (matching `StructuredQueryModule.makeEmpty`, `QueryColumnModule.makeFromDatasetColumn`). Everything outside a model module uses `AGENTS.md` naming: `create{Type}` for objects, `build{Thing}` for strings, `to{X}` for conversions. This is why the spec's `buildLayerSpec` is implemented here as **`createLayerSpec`**.
- **Models**: import `$/models/.../MyModel.ts` (the namespace entry), never `MyModel.types.ts`, except from inside the model's own folder.
- **Styling**: CSS Modules, never inline `style={}` unless the value is computed at runtime. Never Tailwind.
- **i18n**: user-facing strings go through Lingui (`const { t } = useLingui()` in components). Model code takes strings as parameters instead of translating.
- **Import extensions are location-dependent.** Code under `shared/**` writes explicit `.ts` suffixes (it has to run under Deno), and code under `src/**` must not: `import-x/extensions` rejects them there. So the same model is imported as `"$/models/AvaMap/AvaMap.ts"` from `shared/` and `"$/models/AvaMap/AvaMap"` from `src/`. Task 2's code blocks are `shared/`; Tasks 4 onward are `src/`.
- **Line length is capped at 80 characters** by ESLint `max-len`, comments included. Some code blocks in this plan exceed it, usually in a docstring. Rewrap to fit; do not change the wording, and do not add an eslint-disable. Run `npx prettier --write <files>` and `npx eslint <files>` before committing each task.

## Commands

| Purpose | Command |
| --- | --- |
| Run one test file | `pnpm test:frontend <path-substring>` |
| Run all frontend + model tests | `pnpm test:frontend` |
| Type check | `pnpm type-check` |
| Lint | `pnpm lint` |

## Deviations from the spec (deliberate, with rationale)

1. **No `isSpatialAvailable()` probe in this phase.** Spec §5.4 lists it under Phase 1, but after the lat/lng path stops emitting `ST_*` calls, nothing in this phase consumes the probe, and a getter with no caller is dead code. Task 11 instead asserts that the compiled query for a `latLngColumns` layer contains no `ST_` call, which is the property that actually matters. The probe lands in Wave B alongside the first spatial-dependent binding.
2. **Sensitivity is enforced at runtime and by test, not yet by type narrowing.** Spec §4.3 wants `aggregateOnly` to narrow `symbology` at the type level. Narrowing requires an aggregate-capable `GeoBinding` (`joinToBoundaries` or `binned`), and neither exists until Wave B. This phase implements `exact` and `jitter` fully, and makes `aggregateOnly` **throw** from `createLayerSpec` rather than silently render points. Task 8 tests that throw. Type narrowing lands with Wave B.
3. **`ColorSpec` has only its `single` member, and `LayerSymbology` only `circle` and `proportionalSymbol`.** Categorical and graduated color, plus the other five symbology kinds, arrive with the waves that render them. Adding union members later is additive; implementing seven renderers now to satisfy exhaustiveness is not.
4. **`LegendConfig` carries no `breaks` field yet.** Frozen breaks only mean something once graduated color exists (Wave B).

---

## File structure

**Created**

| File | Responsibility |
| --- | --- |
| `shared/models/AvaMap/AvaMap.types.ts` | `AvaMapRead`, `AvaMapId`, `MapViewState`, `BasemapConfig`, `BasemapStyleKey` |
| `shared/models/AvaMap/AvaMap.ts` | `AvaMap` namespace entry |
| `shared/models/AvaMap/AvaMapModule.ts` | `makeEmpty` |
| `shared/models/AvaMap/AvaMapModule.test.ts` | defaults behavior |
| `shared/models/AvaMap/MapLayer/MapLayer.types.ts` | `MapLayerRead`, `MapLayerId`, `PopupConfig` |
| `shared/models/AvaMap/MapLayer/GeoBinding.types.ts` | `GeoBinding`, `ResolvedGeoBinding` |
| `shared/models/AvaMap/MapLayer/LayerSymbology.types.ts` | `LayerSymbology`, `ColorSpec`, `StrokeSpec` |
| `shared/models/AvaMap/MapLayer/SensitivityPolicy.types.ts` | `SensitivityPolicy` |
| `shared/models/AvaMap/MapLayer/LegendConfig.types.ts` | `LegendConfig`, `LegendPosition` |
| `shared/models/AvaMap/MapLayer/MapLayer.ts` | `MapLayer` namespace entry |
| `shared/models/AvaMap/MapLayer/MapLayerModule.ts` | `makeEmpty`, `resolveGeoBinding` |
| `shared/models/AvaMap/MapLayer/MapLayerModule.test.ts` | defaults, binding resolution |
| `src/views/GISApp/layers/jitterCoordinate/jitterCoordinate.ts` | deterministic seeded point displacement |
| `src/views/GISApp/layers/toFeatureCollection/toFeatureCollection.ts` | rows -> GeoJSON + drop report |
| `src/views/GISApp/layers/computeBounds/computeBounds.ts` | bounds for every geometry type |
| `src/views/GISApp/layers/computeLayerStats/computeLayerStats.ts` | value domain for data-driven paint |
| `src/views/GISApp/layers/createMapSpec/createLayerSpec.ts` | one layer -> MapLibre JSON |
| `src/views/GISApp/layers/createMapSpec/createMapSpec.ts` | ordered layers -> merged `MapSpec` |
| `src/views/GISApp/layers/createMapSpec/MapSpec.types.ts` | `MapSpec`, `MapSourceSpec`, `MapLayerSpec` |
| `src/views/GISApp/layers/useMapLayerData/useMapLayerData.ts` | per-layer cached query |
| `src/views/GISApp/MapCanvas/syncMap.ts` | the only imperative MapLibre caller |
| `src/views/GISApp/MapCanvas/MapCanvas.tsx` | map lifecycle, one click handler, overlays |
| `src/views/GISApp/MapCanvas/MapCanvas.module.css` | canvas + overlay styles |
| `src/views/GISApp/MapCanvas/MapStatusOverlay.tsx` | loading / empty / error / dropped-rows states |
| `src/clients/queries/runStructuredQuery/runStructuredQuery.ts` | shared executor extracted from `useDataQuery` |
| `src/clients/queries/runStructuredQuery/runStructuredQuery.test.ts` | dataset + raw-SQL routing |

**Moved** (Task 1): `src/components/GISApp/**` -> `src/views/GISApp/**`.

**Modified**: `src/routes/_auth/$workspaceSlug/map.tsx`, `src/views/DataExplorerApp/useDataQuery.tsx`.

**Deleted** (Task 13): `src/views/GISApp/DataMap/useSelectedMapDataSource.ts`, `src/views/GISApp/DataMap/DataMap.tsx`, `src/views/GISApp/DataMap/GeometryDrawer.tsx`.

---

## Task 1: Move GISApp under `src/views`

Pure relocation so every later path is final. No behavior change.

**Files:**
- Move: `src/components/GISApp/` -> `src/views/GISApp/`
- Modify: `src/routes/_auth/$workspaceSlug/map.tsx`, and the four files that self-import via `@/components/GISApp`

- [ ] **Step 1: Move the directory with git**

```bash
mkdir -p src/views
git mv src/components/GISApp src/views/GISApp
```

- [ ] **Step 2: Rewrite the import alias in every referencing file**

```bash
grep -rl "@/components/GISApp" src \
  | xargs sed -i '' 's|@/components/GISApp|@/views/GISApp|g'
```

- [ ] **Step 3: Verify no references remain**

Run: `grep -rn "@/components/GISApp" src ; echo "exit=$?"`
Expected: no output lines, `exit=1` (grep found nothing).

- [ ] **Step 4: Type check**

Run: `pnpm type-check`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add -A src/views/GISApp src/components src/routes
git commit -m "refactor(gis): move GISApp under src/views for app parity"
```

---

## Task 2: `AvaMap` and `MapLayer` config models

**Files:**
- Create: `shared/models/AvaMap/AvaMap.types.ts`, `AvaMap.ts`, `AvaMapModule.ts`
- Create: `shared/models/AvaMap/MapLayer/{MapLayer.types.ts,GeoBinding.types.ts,LayerSymbology.types.ts,SensitivityPolicy.types.ts,LegendConfig.types.ts,MapLayer.ts,MapLayerModule.ts}`
- Test: `shared/models/AvaMap/AvaMapModule.test.ts`, `shared/models/AvaMap/MapLayer/MapLayerModule.test.ts`

- [ ] **Step 1: Write the failing tests**

`shared/models/AvaMap/AvaMapModule.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { AvaMap } from "$/models/AvaMap/AvaMap.ts";

describe("AvaMap.makeEmpty", () => {
  it("starts with no layers and the avandar basemap", () => {
    const avaMap = AvaMap.makeEmpty("Cholera cases");
    expect(avaMap.layers).toEqual([]);
    expect(avaMap.basemap).toEqual({ type: "builtIn", style: "avandar" });
    expect(avaMap.name).toBe("Cholera cases");
    expect(avaMap.version).toBe(1);
  });

  it("gives each map a distinct id", () => {
    const first = AvaMap.makeEmpty("A");
    const second = AvaMap.makeEmpty("B");
    expect(first.id).not.toBe(second.id);
  });
});
```

`shared/models/AvaMap/MapLayer/MapLayerModule.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid.ts";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type {
  DatasetColumnId,
  DatasetColumnRead,
} from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

/**
 * An honest `DatasetColumnRead`, built with no cast. A cast here would hide
 * exactly the drift it looks like it is saving you from: `dataType` takes an
 * `AvaDataType` ("double"), not a loose "number", and `columnIdx` is not
 * `columnIndex`.
 */
function createNumericColumn(name: string): DatasetColumnRead {
  const now = new Date().toISOString();
  return {
    __type: "DatasetColumn",
    id: uuid<DatasetColumnId>(),
    datasetId: uuid<DatasetId>(),
    workspaceId: uuid<Workspace.Id>(),
    createdAt: now,
    updatedAt: now,
    name,
    originalName: name,
    originalDataType: "DOUBLE",
    dataType: "double",
    detectedDataType: "DOUBLE",
    description: undefined,
    columnIdx: 0,
  };
}

describe("MapLayer.makeEmpty", () => {
  it("is visible, unbound, and exact by default", () => {
    const layer = MapLayer.makeEmpty("Cases");
    expect(layer.isVisible).toBe(true);
    expect(layer.geoBinding).toBeUndefined();
    expect(layer.sensitivity).toEqual({ mode: "exact" });
    expect(layer.symbology.type).toBe("circle");
  });
});

describe("MapLayer.resolveGeoBinding", () => {
  it("maps column ids to the names rows are keyed by", () => {
    const latitude = QueryColumn.makeFromDatasetColumn(createNumericColumn("lat"));
    const longitude = QueryColumn.makeFromDatasetColumn(createNumericColumn("lon"));
    const layer = {
      ...MapLayer.makeEmpty("Cases"),
      source: {
        ...MapLayer.makeEmpty("Cases").source,
        queryColumns: [latitude, longitude],
      },
      geoBinding: {
        type: "latLngColumns" as const,
        latitude: latitude.id,
        longitude: longitude.id,
      },
    };

    expect(MapLayer.resolveGeoBinding(layer)).toEqual({
      type: "latLngColumns",
      latitudeColumnName: "lat",
      longitudeColumnName: "lon",
    });
  });

  it("returns undefined when a bound column is not in the query", () => {
    const latitude = QueryColumn.makeFromDatasetColumn(createNumericColumn("lat"));
    const layer = {
      ...MapLayer.makeEmpty("Cases"),
      geoBinding: {
        type: "latLngColumns" as const,
        latitude: latitude.id,
        longitude: latitude.id,
      },
    };
    expect(MapLayer.resolveGeoBinding(layer)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test:frontend shared/models/AvaMap`
Expected: FAIL, "Failed to resolve import `$/models/AvaMap/AvaMap.ts`".

- [ ] **Step 3: Create the layer type files**

`shared/models/AvaMap/MapLayer/GeoBinding.types.ts`:

```ts
import type { QueryColumnId } from "$/models/queries/QueryColumn/QueryColumn.types.ts";

/**
 * How a layer's rows become geometry.
 *
 * `latLngColumns` deliberately compiles to no DuckDB `ST_*` call, so a point
 * map keeps working when the optional `spatial` extension is unavailable.
 * Bindings that do need geometry functions (boundary joins, binning) are added
 * as further members of this union.
 */
export type GeoBinding = {
  type: "latLngColumns";
  latitude: QueryColumnId;
  longitude: QueryColumnId;
};

/**
 * A {@link GeoBinding} whose column ids have been resolved to the column names
 * that query result rows are actually keyed by.
 */
export type ResolvedGeoBinding = {
  type: "latLngColumns";
  latitudeColumnName: string;
  longitudeColumnName: string;
};
```

`shared/models/AvaMap/MapLayer/LayerSymbology.types.ts`:

```ts
import type { QueryColumnId } from "$/models/queries/QueryColumn/QueryColumn.types.ts";

/** Outline applied to a rendered symbol. */
export type StrokeSpec = { width: number; color: string };

/**
 * How feature color is chosen. Only a flat single color exists today;
 * categorical and graduated color arrive with choropleth support.
 */
export type ColorSpec = { type: "single"; color: string };

/**
 * How a layer's geometry is painted. `proportionalSymbol` defaults to `sqrt`
 * scaling so that symbol *area*, not radius, tracks the value: radius-linear
 * scaling visually exaggerates large values.
 */
export type LayerSymbology =
  | {
      type: "circle";
      radius: number;
      color: ColorSpec;
      stroke: StrokeSpec;
    }
  | {
      type: "proportionalSymbol";
      value: QueryColumnId;
      minRadius: number;
      maxRadius: number;
      scale: "sqrt" | "linear";
      color: ColorSpec;
      stroke: StrokeSpec;
    };
```

`shared/models/AvaMap/MapLayer/SensitivityPolicy.types.ts`:

```ts
/**
 * What rendering a layer's data permits, independent of what the author picks.
 *
 * - `exact`: render coordinates as given.
 * - `jitter`: displace each point deterministically within `radiusMeters`, so
 *   an approximate location is shown without revealing the exact one.
 * - `aggregateOnly`: exact points may never be drawn. Cells holding fewer than
 *   `minCellCount` records are suppressed rather than shown as zero.
 */
export type SensitivityPolicy =
  | { mode: "exact" }
  | { mode: "jitter"; radiusMeters: number }
  | { mode: "aggregateOnly"; minCellCount: number; minGeoLevel: string };
```

`shared/models/AvaMap/MapLayer/LegendConfig.types.ts`:

```ts
/** Where a layer's legend sits over the map, or `hidden` to omit it. */
export type LegendPosition =
  | "bottomLeft"
  | "bottomRight"
  | "topRight"
  | "hidden";

/**
 * A layer's legend. Persisted rather than derived at render time so that the
 * live map, a dashboard embed, and an exported PDF cannot disagree.
 */
export type LegendConfig = {
  title: string;
  units: string | undefined;
  showNoData: boolean;
  position: LegendPosition;
};
```

`shared/models/AvaMap/MapLayer/MapLayer.types.ts`:

```ts
import type { Model } from "@models/Model/Model.ts";
import type { UUID } from "@utils/types/common.types.ts";
import type { GeoBinding } from "$/models/AvaMap/MapLayer/GeoBinding.types.ts";
import type { LayerSymbology } from "$/models/AvaMap/MapLayer/LayerSymbology.types.ts";
import type { LegendConfig } from "$/models/AvaMap/MapLayer/LegendConfig.types.ts";
import type { SensitivityPolicy } from "$/models/AvaMap/MapLayer/SensitivityPolicy.types.ts";
import type { QueryColumnId } from "$/models/queries/QueryColumn/QueryColumn.types.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";

type ModelType = "MapLayer";
type CurrentMapLayerVersion = 1;

export type MapLayerId = UUID<ModelType>;

/**
 * Which columns a feature's popup shows. `"all"` shows every column the
 * layer's query returned.
 */
export type PopupConfig = { columnIds: readonly QueryColumnId[] | "all" };

/**
 * One layer of a map. The three axes are independent: `source` decides which
 * rows, `geoBinding` decides how those rows become geometry, and `symbology`
 * decides how that geometry is painted. `sensitivity` constrains `symbology`.
 */
export type MapLayerRead = Model.Versioned<
  ModelType,
  CurrentMapLayerVersion,
  {
    id: MapLayerId;
    name: string;
    isVisible: boolean;

    /** The query producing this layer's rows. */
    source: PartialStructuredQuery;

    /** Undefined until the author has picked geometry columns. */
    geoBinding: GeoBinding | undefined;

    symbology: LayerSymbology;
    sensitivity: SensitivityPolicy;
    popup: PopupConfig;
    legend: LegendConfig;
  }
>;
```

- [ ] **Step 4: Create the layer module and namespace**

`shared/models/AvaMap/MapLayer/MapLayerModule.ts`:

```ts
import { Model } from "@models/Model/Model.ts";
import { uuid } from "$/lib/uuid.ts";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.ts";
import type { ResolvedGeoBinding } from "$/models/AvaMap/MapLayer/GeoBinding.types.ts";
import type {
  MapLayerId,
  MapLayerRead,
} from "$/models/AvaMap/MapLayer/MapLayer.types.ts";

/** Fallback symbol color when the author has not picked one. */
export const DEFAULT_SYMBOL_COLOR = "#3b82f6";

/** Fallback circle radius, in pixels. */
export const DEFAULT_SYMBOL_RADIUS = 6;

export const MapLayerModule = {
  /**
   * A new, unbound layer: visible, exact, drawn as a flat circle, with no
   * geometry columns picked yet.
   * @param name The layer's display name, already localized by the caller.
   */
  makeEmpty: (name: string): MapLayerRead => {
    return Model.make("MapLayer", {
      id: uuid<MapLayerId>(),
      version: 1,
      name,
      isVisible: true,
      source: StructuredQuery.makeEmpty(),
      geoBinding: undefined,
      symbology: {
        type: "circle",
        radius: DEFAULT_SYMBOL_RADIUS,
        color: { type: "single", color: DEFAULT_SYMBOL_COLOR },
        stroke: { width: 1, color: "#ffffff" },
      },
      sensitivity: { mode: "exact" },
      popup: { columnIds: "all" },
      legend: {
        title: name,
        units: undefined,
        showNoData: true,
        position: "bottomRight",
      },
    } as const);
  },

  /**
   * Resolves a layer's geo binding from column ids to the column names its
   * result rows are keyed by.
   * @returns The resolved binding, or `undefined` when the layer has no
   * binding or a bound column is absent from the layer's query.
   */
  resolveGeoBinding: (
    layer: MapLayerRead,
  ): ResolvedGeoBinding | undefined => {
    const { geoBinding, source } = layer;
    if (!geoBinding) {
      return undefined;
    }
    const findColumnName = (columnId: string): string | undefined => {
      const column = source.queryColumns.find((candidate) => {
        return candidate.id === columnId;
      });
      return column ? QueryColumn.getDerivedColumnName(column) : undefined;
    };

    const latitudeColumnName = findColumnName(geoBinding.latitude);
    const longitudeColumnName = findColumnName(geoBinding.longitude);
    if (!latitudeColumnName || !longitudeColumnName) {
      return undefined;
    }
    return { type: "latLngColumns", latitudeColumnName, longitudeColumnName };
  },
};
```

`shared/models/AvaMap/MapLayer/MapLayer.ts`:

```ts
/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  MapLayerId,
  MapLayerRead,
} from "$/models/AvaMap/MapLayer/MapLayer.types.ts";

export { MapLayerModule as MapLayer } from "$/models/AvaMap/MapLayer/MapLayerModule.ts";

export namespace MapLayer {
  export type T = MapLayerRead;
  export type Id = MapLayerId;
}
```

- [ ] **Step 5: Create the map type file, module, and namespace**

`shared/models/AvaMap/AvaMap.types.ts`:

```ts
import type { Model } from "@models/Model/Model.ts";
import type { UUID } from "@utils/types/common.types.ts";
import type { MapLayerRead } from "$/models/AvaMap/MapLayer/MapLayer.types.ts";

type ModelType = "AvaMap";
type CurrentAvaMapVersion = 1;

export type AvaMapId = UUID<ModelType>;

/** Where the map is looking. `center` is `[longitude, latitude]`, MapLibre order. */
export type MapViewState = {
  center: readonly [longitude: number, latitude: number];
  zoom: number;
};

/** Keys of the basemap styles the app ships. Style URLs live in the GIS app. */
export type BasemapStyleKey =
  | "avandar"
  | "positron"
  | "bright"
  | "liberty"
  | "dark"
  | "fiord";

/**
 * The map's backdrop. `none` renders a flat background instead of tiles, which
 * is the usable fallback when tile hosts are unreachable.
 */
export type BasemapConfig =
  | { type: "builtIn"; style: BasemapStyleKey }
  | { type: "none"; background: string };

/** A saved map: a basemap, a camera position, and an ordered layer stack. */
export type AvaMapRead = Model.Versioned<
  ModelType,
  CurrentAvaMapVersion,
  {
    id: AvaMapId;
    name: string;
    basemap: BasemapConfig;
    view: MapViewState;

    /** Draw order, bottom to top. */
    layers: readonly MapLayerRead[];
  }
>;
```

`shared/models/AvaMap/AvaMapModule.ts`:

```ts
import { Model } from "@models/Model/Model.ts";
import { uuid } from "$/lib/uuid.ts";
import type {
  AvaMapId,
  AvaMapRead,
  MapViewState,
} from "$/models/AvaMap/AvaMap.types.ts";

/** Opening camera position when a map has no data to fit yet. */
export const DEFAULT_MAP_VIEW_STATE: MapViewState = {
  center: [-74.006, 40.7128],
  zoom: 10,
};

export const AvaMapModule = {
  /**
   * A new, empty map with the default basemap and camera and no layers.
   * @param name The map's display name, already localized by the caller.
   */
  makeEmpty: (name: string): AvaMapRead => {
    return Model.make("AvaMap", {
      id: uuid<AvaMapId>(),
      version: 1,
      name,
      basemap: { type: "builtIn", style: "avandar" },
      view: DEFAULT_MAP_VIEW_STATE,
      layers: [],
    } as const);
  },
};
```

`shared/models/AvaMap/AvaMap.ts`:

```ts
/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  AvaMapId,
  AvaMapRead,
  BasemapConfig,
  BasemapStyleKey,
  MapViewState,
} from "$/models/AvaMap/AvaMap.types.ts";

export { AvaMapModule as AvaMap } from "$/models/AvaMap/AvaMapModule.ts";

export namespace AvaMap {
  export type T = AvaMapRead;
  export type Id = AvaMapId;
  export type Basemap = BasemapConfig;
  export type BasemapStyle = BasemapStyleKey;
  export type ViewState = MapViewState;
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm test:frontend shared/models/AvaMap`
Expected: PASS, 5 tests.

- [ ] **Step 7: Type check and commit**

```bash
pnpm type-check
git add shared/models/AvaMap
git commit -m "feat(gis): add AvaMap and MapLayer config models"
```

---

## Task 3: `jitterCoordinate`

Deterministic displacement. A `Math.random` implementation would move points on every repaint, so the offset is derived from a seed string instead.

**Files:**
- Create: `src/views/GISApp/layers/jitterCoordinate/jitterCoordinate.ts`
- Test: `src/views/GISApp/layers/jitterCoordinate/jitterCoordinate.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { jitterCoordinate } from "@/views/GISApp/layers/jitterCoordinate/jitterCoordinate";

const kinshasa = { longitude: 15.2663, latitude: -4.4419 };

describe("jitterCoordinate", () => {
  it("returns the same displacement for the same seed", () => {
    const first = jitterCoordinate({ ...kinshasa, radiusMeters: 500, seed: "row-7" });
    const second = jitterCoordinate({ ...kinshasa, radiusMeters: 500, seed: "row-7" });
    expect(first).toEqual(second);
  });

  it("returns different displacements for different seeds", () => {
    const first = jitterCoordinate({ ...kinshasa, radiusMeters: 500, seed: "row-7" });
    const second = jitterCoordinate({ ...kinshasa, radiusMeters: 500, seed: "row-8" });
    expect(first).not.toEqual(second);
  });

  it("stays within the requested radius", () => {
    const radiusMeters = 300;
    const metersPerDegreeLatitude = 111_320;
    for (let index = 0; index < 50; index += 1) {
      const jittered = jitterCoordinate({
        ...kinshasa,
        radiusMeters,
        seed: `row-${index}`,
      });
      const deltaLatitudeMeters =
        (jittered.latitude - kinshasa.latitude) * metersPerDegreeLatitude;
      const deltaLongitudeMeters =
        (jittered.longitude - kinshasa.longitude) *
        metersPerDegreeLatitude *
        Math.cos((kinshasa.latitude * Math.PI) / 180);
      const distanceMeters = Math.hypot(deltaLatitudeMeters, deltaLongitudeMeters);
      expect(distanceMeters).toBeLessThanOrEqual(radiusMeters + 1);
    }
  });

  it("does not move the point when the radius is zero", () => {
    const jittered = jitterCoordinate({ ...kinshasa, radiusMeters: 0, seed: "row-7" });
    expect(jittered).toEqual(kinshasa);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend jitterCoordinate`
Expected: FAIL, cannot resolve `jitterCoordinate`.

- [ ] **Step 3: Write the implementation**

```ts
const METERS_PER_DEGREE_LATITUDE = 111_320;

/**
 * Hashes a string into a 32-bit unsigned integer (FNV-1a). Used to derive a
 * stable pseudo-random displacement from a row's identity, so a jittered point
 * lands in the same place on every repaint.
 */
function buildSeedHash(seed: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/**
 * Displaces a coordinate by a stable pseudo-random offset inside
 * `radiusMeters`, so an approximate location can be shown without revealing
 * the exact one.
 *
 * The offset is a function of `seed` alone, so repeated renders of the same row
 * do not make the point wander.
 *
 * @param params.seed Stable per-row identity, for example `${layerId}:${rowIndex}`.
 * @returns The displaced coordinate, unchanged when `radiusMeters` is zero.
 */
export function jitterCoordinate({
  longitude,
  latitude,
  radiusMeters,
  seed,
}: {
  longitude: number;
  latitude: number;
  radiusMeters: number;
  seed: string;
}): { longitude: number; latitude: number } {
  if (radiusMeters <= 0) {
    return { longitude, latitude };
  }
  const seedHash = buildSeedHash(seed);
  // Split the hash into two independent unit fractions: one for the bearing,
  // one for the radius. Square-rooting the radius fraction spreads points
  // uniformly over the disc instead of clustering them at the center.
  const angleFraction = (seedHash & 0xffff) / 0x10000;
  const radiusFraction = ((seedHash >>> 16) & 0xffff) / 0x10000;
  const angleRadians = angleFraction * 2 * Math.PI;
  const distanceMeters = Math.sqrt(radiusFraction) * radiusMeters;

  const deltaLatitude =
    (distanceMeters * Math.sin(angleRadians)) / METERS_PER_DEGREE_LATITUDE;
  const latitudeRadians = (latitude * Math.PI) / 180;
  const metersPerDegreeLongitude =
    METERS_PER_DEGREE_LATITUDE * Math.max(Math.cos(latitudeRadians), 1e-6);
  const deltaLongitude =
    (distanceMeters * Math.cos(angleRadians)) / metersPerDegreeLongitude;

  return {
    longitude: longitude + deltaLongitude,
    latitude: latitude + deltaLatitude,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:frontend jitterCoordinate`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/views/GISApp/layers/jitterCoordinate
git commit -m "feat(gis): add deterministic coordinate jitter"
```

### Shipped behavior beyond the code above

Code review added two things, and later tasks can rely on them:

1. **The returned coordinate is always valid WGS84.** Longitude is wrapped into
   `[-180, 180]` and latitude clamped into `[-90, 90]`. A large longitude delta
   near a pole is correct geometry (500 m east-west really is ~101° of longitude
   at 89.999° latitude), but an out-of-range coordinate is not, and
   `toFeatureCollection` would classify one as bad data and drop the row. So a
   jittered layer can never silently discard its own points.
2. **A distribution test guards the `Math.sqrt(radiusFraction)` line.** The
   radius-bound assertion alone still passes if that sqrt is deleted, because
   center-clustered points are still inside the radius. The added test samples
   500 seeds and asserts the share landing within half the radius sits between
   15% and 35%, against the 25% that uniform-over-area predicts and the ~50% a
   uniform-radius-fraction bug would give. Measured: 27.4%.

---

## Task 4: `toFeatureCollection`

Replaces the inline row loop and the silent `WHERE ... IS NOT NULL` filter. Every dropped row is reported with a reason.

**Files:**
- Create: `src/views/GISApp/layers/toFeatureCollection/toFeatureCollection.ts`
- Test: `src/views/GISApp/layers/toFeatureCollection/toFeatureCollection.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { toFeatureCollection } from "@/views/GISApp/layers/toFeatureCollection/toFeatureCollection";
import type { ResolvedGeoBinding } from "$/models/AvaMap/MapLayer/GeoBinding.types";

const binding: ResolvedGeoBinding = {
  type: "latLngColumns",
  latitudeColumnName: "lat",
  longitudeColumnName: "lon",
};

const exact = { mode: "exact" } as const;

describe("toFeatureCollection", () => {
  it("builds a point per row with the row index as the feature id", () => {
    const result = toFeatureCollection({
      rows: [{ lat: -4.44, lon: 15.27, cases: 12 }],
      binding,
      sensitivity: exact,
      layerId: "layer-1",
    });

    expect(result.featureCollection.features).toEqual([
      {
        type: "Feature",
        id: 0,
        geometry: { type: "Point", coordinates: [15.27, -4.44] },
        properties: { cases: 12 },
      },
    ]);
    expect(result.drops).toEqual([]);
  });

  it("keeps coordinate columns out of the feature properties", () => {
    const result = toFeatureCollection({
      rows: [{ lat: 1, lon: 2, cases: 3 }],
      binding,
      sensitivity: exact,
      layerId: "layer-1",
    });
    expect(result.featureCollection.features[0]?.properties).toEqual({ cases: 3 });
  });

  it("reports null coordinates instead of dropping them silently", () => {
    const result = toFeatureCollection({
      rows: [{ lat: null, lon: 2 }, { lat: 1, lon: undefined }],
      binding,
      sensitivity: exact,
      layerId: "layer-1",
    });
    expect(result.featureCollection.features).toHaveLength(0);
    expect(result.drops).toEqual([
      { reason: "nullCoordinate", count: 2, sampleRowIndexes: [0, 1] },
    ]);
  });

  it("reports non-numeric coordinates", () => {
    const result = toFeatureCollection({
      rows: [{ lat: "not a number", lon: 2 }],
      binding,
      sensitivity: exact,
      layerId: "layer-1",
    });
    expect(result.drops).toEqual([
      { reason: "nonNumericCoordinate", count: 1, sampleRowIndexes: [0] },
    ]);
  });

  it("parses numeric coordinates that arrive as strings", () => {
    const result = toFeatureCollection({
      rows: [{ lat: "-4.44", lon: "15.27" }],
      binding,
      sensitivity: exact,
      layerId: "layer-1",
    });
    expect(result.featureCollection.features[0]?.geometry).toEqual({
      type: "Point",
      coordinates: [15.27, -4.44],
    });
  });

  it("reports (0, 0) as null island rather than plotting the Atlantic", () => {
    const result = toFeatureCollection({
      rows: [{ lat: 0, lon: 0 }],
      binding,
      sensitivity: exact,
      layerId: "layer-1",
    });
    expect(result.drops).toEqual([
      { reason: "nullIsland", count: 1, sampleRowIndexes: [0] },
    ]);
  });

  it("flags a likely latitude/longitude swap", () => {
    const result = toFeatureCollection({
      rows: [{ lat: 120.5, lon: 45.1 }],
      binding,
      sensitivity: exact,
      layerId: "layer-1",
    });
    expect(result.drops).toEqual([
      { reason: "suspectedLatLngSwap", count: 1, sampleRowIndexes: [0] },
    ]);
  });

  it("reports out-of-range coordinates that are not a swap", () => {
    const result = toFeatureCollection({
      rows: [{ lat: 120.5, lon: 200.1 }],
      binding,
      sensitivity: exact,
      layerId: "layer-1",
    });
    expect(result.drops).toEqual([
      { reason: "outOfRange", count: 1, sampleRowIndexes: [0] },
    ]);
  });

  it("caps the sampled row indexes it reports", () => {
    const rows = Array.from({ length: 30 }, () => {
      return { lat: null, lon: null };
    });
    const result = toFeatureCollection({
      rows,
      binding,
      sensitivity: exact,
      layerId: "layer-1",
    });
    expect(result.drops[0]?.count).toBe(30);
    expect(result.drops[0]?.sampleRowIndexes).toHaveLength(10);
  });

  it("displaces points when the layer is jittered", () => {
    const jittered = toFeatureCollection({
      rows: [{ lat: -4.44, lon: 15.27 }],
      binding,
      sensitivity: { mode: "jitter", radiusMeters: 500 },
      layerId: "layer-1",
    });
    const [longitude, latitude] = (
      jittered.featureCollection.features[0]?.geometry as GeoJSON.Point
    ).coordinates;
    expect(longitude).not.toBe(15.27);
    expect(latitude).not.toBe(-4.44);
  });

  it("refuses to build exact points for an aggregate-only layer", () => {
    expect(() => {
      return toFeatureCollection({
        rows: [{ lat: -4.44, lon: 15.27 }],
        binding,
        sensitivity: { mode: "aggregateOnly", minCellCount: 5, minGeoLevel: "admin2" },
        layerId: "layer-1",
      });
    }).toThrow(/aggregate/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend toFeatureCollection`
Expected: FAIL, cannot resolve `toFeatureCollection`.

- [ ] **Step 3: Write the implementation**

```ts
import { jitterCoordinate } from "@/views/GISApp/layers/jitterCoordinate/jitterCoordinate";
import type { ResolvedGeoBinding } from "$/models/AvaMap/MapLayer/GeoBinding.types";
import type { SensitivityPolicy } from "$/models/AvaMap/MapLayer/SensitivityPolicy.types";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";

/** Why a source row produced no feature. */
export type DropReason =
  | "nullCoordinate"
  | "nonNumericCoordinate"
  | "outOfRange"
  | "suspectedLatLngSwap"
  | "nullIsland";

/** One reason, how many rows hit it, and a bounded sample of their indexes. */
export type GeometryDropReport = {
  reason: DropReason;
  count: number;
  sampleRowIndexes: readonly number[];
};

/** How many row indexes a single drop report keeps as a sample. */
const MAX_SAMPLE_ROW_INDEXES = 10;

/**
 * Thrown when a layer's sensitivity policy forbids the geometry it was asked
 * to produce.
 */
export class SensitivityViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SensitivityViolationError";
  }
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function classifyCoordinate(
  latitude: number,
  longitude: number,
): DropReason | undefined {
  if (latitude === 0 && longitude === 0) {
    return "nullIsland";
  }
  const isLatitudeInRange = Math.abs(latitude) <= 90;
  const isLongitudeInRange = Math.abs(longitude) <= 180;
  if (isLatitudeInRange && isLongitudeInRange) {
    return undefined;
  }
  // A latitude that would be a valid longitude, paired with a longitude that
  // would be a valid latitude, is almost always a swapped pair rather than
  // genuinely bad data.
  if (!isLatitudeInRange && isLongitudeInRange && Math.abs(longitude) <= 90) {
    return "suspectedLatLngSwap";
  }
  return "outOfRange";
}

/**
 * Converts query result rows into a GeoJSON `FeatureCollection`, reporting
 * every row it could not convert.
 *
 * Row loss is returned rather than filtered away so callers can tell the user
 * how much data is missing and why.
 *
 * @param params.layerId Used with the row index to seed jitter.
 * @throws SensitivityViolationError when the policy is `aggregateOnly`, which
 * no geometry binding can satisfy yet.
 */
export function toFeatureCollection({
  rows,
  binding,
  sensitivity,
  layerId,
}: {
  rows: readonly UnknownRow[];
  binding: ResolvedGeoBinding;
  sensitivity: SensitivityPolicy;
  layerId: string;
}): {
  featureCollection: GeoJSON.FeatureCollection;
  drops: readonly GeometryDropReport[];
} {
  if (sensitivity.mode === "aggregateOnly") {
    throw new SensitivityViolationError(
      "This layer is aggregate-only, so it cannot be drawn from individual " +
        "coordinates. Bind it to boundaries or bins instead.",
    );
  }

  const { latitudeColumnName, longitudeColumnName } = binding;
  const features: GeoJSON.Feature[] = [];
  const dropsByReason = new Map<DropReason, number[]>();

  const recordDrop = (reason: DropReason, rowIndex: number): void => {
    const existing = dropsByReason.get(reason);
    if (existing) {
      existing.push(rowIndex);
      return;
    }
    dropsByReason.set(reason, [rowIndex]);
  };

  rows.forEach((row, rowIndex) => {
    const rawLatitude = row[latitudeColumnName];
    const rawLongitude = row[longitudeColumnName];
    if (rawLatitude == null || rawLongitude == null) {
      recordDrop("nullCoordinate", rowIndex);
      return;
    }
    const latitude = toFiniteNumber(rawLatitude);
    const longitude = toFiniteNumber(rawLongitude);
    if (latitude === undefined || longitude === undefined) {
      recordDrop("nonNumericCoordinate", rowIndex);
      return;
    }
    const invalidReason = classifyCoordinate(latitude, longitude);
    if (invalidReason) {
      recordDrop(invalidReason, rowIndex);
      return;
    }

    const placed =
      sensitivity.mode === "jitter" ?
        jitterCoordinate({
          longitude,
          latitude,
          radiusMeters: sensitivity.radiusMeters,
          seed: `${layerId}:${rowIndex}`,
        })
      : { longitude, latitude };

    const properties: GeoJSON.GeoJsonProperties = { ...row };
    delete properties[latitudeColumnName];
    delete properties[longitudeColumnName];

    features.push({
      type: "Feature",
      id: rowIndex,
      geometry: { type: "Point", coordinates: [placed.longitude, placed.latitude] },
      properties,
    });
  });

  const drops = [...dropsByReason.entries()].map(([reason, rowIndexes]) => {
    return {
      reason,
      count: rowIndexes.length,
      sampleRowIndexes: rowIndexes.slice(0, MAX_SAMPLE_ROW_INDEXES),
    };
  });

  return {
    featureCollection: { type: "FeatureCollection", features },
    drops,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:frontend toFeatureCollection`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/views/GISApp/layers/toFeatureCollection
git commit -m "feat(gis): convert rows to GeoJSON with a drop report"
```

---

## Task 5: `computeBounds`

The current `calculateBounds` only reads `Point`, so any other geometry yields `Infinity`. This handles every geometry type by walking coordinates generically.

**Files:**
- Create: `src/views/GISApp/layers/computeBounds/computeBounds.ts`
- Test: `src/views/GISApp/layers/computeBounds/computeBounds.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { computeBounds } from "@/views/GISApp/layers/computeBounds/computeBounds";

function createPoint(longitude: number, latitude: number): GeoJSON.Feature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [longitude, latitude] },
    properties: {},
  };
}

describe("computeBounds", () => {
  it("returns undefined for an empty collection", () => {
    expect(
      computeBounds({ type: "FeatureCollection", features: [] }),
    ).toBeUndefined();
  });

  it("spans every point", () => {
    expect(
      computeBounds({
        type: "FeatureCollection",
        features: [createPoint(15, -4), createPoint(30, 10)],
      }),
    ).toEqual([
      [15, -4],
      [30, 10],
    ]);
  });

  it("collapses to a degenerate box for a single point", () => {
    expect(
      computeBounds({
        type: "FeatureCollection",
        features: [createPoint(15, -4)],
      }),
    ).toEqual([
      [15, -4],
      [15, -4],
    ]);
  });

  it("spans polygon rings", () => {
    const polygon: GeoJSON.Feature = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [10, 0],
            [10, 5],
            [0, 5],
            [0, 0],
          ],
        ],
      },
      properties: {},
    };
    expect(
      computeBounds({ type: "FeatureCollection", features: [polygon] }),
    ).toEqual([
      [0, 0],
      [10, 5],
    ]);
  });

  it("spans a line string", () => {
    const line: GeoJSON.Feature = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-3, 40],
          [2, 48],
        ],
      },
      properties: {},
    };
    expect(
      computeBounds({ type: "FeatureCollection", features: [line] }),
    ).toEqual([
      [-3, 40],
      [2, 48],
    ]);
  });

  it("walks geometry collections", () => {
    const collection: GeoJSON.Feature = {
      type: "Feature",
      geometry: {
        type: "GeometryCollection",
        geometries: [
          { type: "Point", coordinates: [1, 1] },
          { type: "Point", coordinates: [4, 9] },
        ],
      },
      properties: {},
    };
    expect(
      computeBounds({ type: "FeatureCollection", features: [collection] }),
    ).toEqual([
      [1, 1],
      [4, 9],
    ]);
  });

  it("ignores features with no geometry", () => {
    const withoutGeometry: GeoJSON.Feature = {
      type: "Feature",
      geometry: null as unknown as GeoJSON.Geometry,
      properties: {},
    };
    expect(
      computeBounds({
        type: "FeatureCollection",
        features: [withoutGeometry, createPoint(7, 7)],
      }),
    ).toEqual([
      [7, 7],
      [7, 7],
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend computeBounds`
Expected: FAIL, cannot resolve `computeBounds`.

- [ ] **Step 3: Write the implementation**

```ts
/** South-west then north-east corner, each `[longitude, latitude]`. */
export type MapBounds = readonly [
  southWest: readonly [number, number],
  northEast: readonly [number, number],
];

type MutableBox = {
  minLongitude: number;
  minLatitude: number;
  maxLongitude: number;
  maxLatitude: number;
  hasCoordinate: boolean;
};

/**
 * Walks an arbitrarily nested GeoJSON coordinate array, extending `box` with
 * every `[longitude, latitude]` pair it finds. Handles Point through
 * MultiPolygon without needing a case per geometry type.
 */
function extendBoxWithCoordinates(box: MutableBox, coordinates: unknown): void {
  if (!Array.isArray(coordinates)) {
    return;
  }
  const [first, second] = coordinates;
  if (typeof first === "number" && typeof second === "number") {
    box.minLongitude = Math.min(box.minLongitude, first);
    box.maxLongitude = Math.max(box.maxLongitude, first);
    box.minLatitude = Math.min(box.minLatitude, second);
    box.maxLatitude = Math.max(box.maxLatitude, second);
    box.hasCoordinate = true;
    return;
  }
  coordinates.forEach((nested) => {
    extendBoxWithCoordinates(box, nested);
  });
}

function extendBoxWithGeometry(box: MutableBox, geometry: GeoJSON.Geometry): void {
  if (geometry.type === "GeometryCollection") {
    geometry.geometries.forEach((nested) => {
      extendBoxWithGeometry(box, nested);
    });
    return;
  }
  extendBoxWithCoordinates(box, geometry.coordinates);
}

/**
 * Computes the bounding box of a feature collection, for every geometry type.
 * @returns The bounds, or `undefined` when the collection holds no usable
 * coordinate (so callers can leave the camera where it is instead of flying to
 * an infinite box).
 */
export function computeBounds(
  featureCollection: GeoJSON.FeatureCollection,
): MapBounds | undefined {
  const box: MutableBox = {
    minLongitude: Infinity,
    minLatitude: Infinity,
    maxLongitude: -Infinity,
    maxLatitude: -Infinity,
    hasCoordinate: false,
  };

  featureCollection.features.forEach((feature) => {
    if (!feature.geometry) {
      return;
    }
    extendBoxWithGeometry(box, feature.geometry);
  });

  if (!box.hasCoordinate) {
    return undefined;
  }
  return [
    [box.minLongitude, box.minLatitude],
    [box.maxLongitude, box.maxLatitude],
  ];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:frontend computeBounds`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/views/GISApp/layers/computeBounds
git commit -m "feat(gis): compute bounds for every geometry type"
```

---

## Task 6: `computeLayerStats`

Supplies the value domain that data-driven paint needs. Kept separate from `createLayerSpec` so break and domain math is tested without MapLibre JSON in the way.

**Files:**
- Create: `src/views/GISApp/layers/computeLayerStats/computeLayerStats.ts`
- Test: `src/views/GISApp/layers/computeLayerStats/computeLayerStats.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { computeLayerStats } from "@/views/GISApp/layers/computeLayerStats/computeLayerStats";

function createCollection(
  values: readonly (number | string | null)[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: values.map((cases, index) => {
      return {
        type: "Feature" as const,
        id: index,
        geometry: { type: "Point" as const, coordinates: [0, index] },
        properties: { cases },
      };
    }),
  };
}

describe("computeLayerStats", () => {
  it("returns the numeric range of the requested property", () => {
    expect(
      computeLayerStats({
        featureCollection: createCollection([4, 19, 7]),
        valueColumnName: "cases",
      }),
    ).toEqual({ valueDomain: [4, 19] });
  });

  it("ignores null and non-numeric values", () => {
    expect(
      computeLayerStats({
        featureCollection: createCollection([4, null, "n/a", 9]),
        valueColumnName: "cases",
      }),
    ).toEqual({ valueDomain: [4, 9] });
  });

  it("parses numeric strings", () => {
    expect(
      computeLayerStats({
        featureCollection: createCollection(["12", "3"]),
        valueColumnName: "cases",
      }),
    ).toEqual({ valueDomain: [3, 12] });
  });

  it("returns no domain when nothing is numeric", () => {
    expect(
      computeLayerStats({
        featureCollection: createCollection([null, "n/a"]),
        valueColumnName: "cases",
      }),
    ).toEqual({ valueDomain: undefined });
  });

  it("returns a flat domain when every value is equal", () => {
    expect(
      computeLayerStats({
        featureCollection: createCollection([5, 5, 5]),
        valueColumnName: "cases",
      }),
    ).toEqual({ valueDomain: [5, 5] });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend computeLayerStats`
Expected: FAIL, cannot resolve `computeLayerStats`.

- [ ] **Step 3: Write the implementation**

```ts
/** Summary statistics a layer's paint expressions need. */
export type LayerStats = {
  /**
   * Minimum and maximum of the layer's value column, or `undefined` when no
   * feature carries a numeric value.
   */
  valueDomain: readonly [number, number] | undefined;
};

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

/**
 * Summarizes a feature collection for data-driven paint.
 * @param params.valueColumnName Feature property to summarize, or `undefined`
 * when the symbology needs no value.
 */
export function computeLayerStats({
  featureCollection,
  valueColumnName,
}: {
  featureCollection: GeoJSON.FeatureCollection;
  valueColumnName: string | undefined;
}): LayerStats {
  if (!valueColumnName) {
    return { valueDomain: undefined };
  }
  let minimum = Infinity;
  let maximum = -Infinity;
  let hasValue = false;

  featureCollection.features.forEach((feature) => {
    const value = toFiniteNumber(feature.properties?.[valueColumnName]);
    if (value === undefined) {
      return;
    }
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
    hasValue = true;
  });

  return { valueDomain: hasValue ? [minimum, maximum] : undefined };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:frontend computeLayerStats`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/views/GISApp/layers/computeLayerStats
git commit -m "feat(gis): summarize layer value domains for data-driven paint"
```

---

## Task 7: `MapSpec` types and `createLayerSpec`

This is where the three duplicated paint blocks collapse into one pure function.

**Files:**
- Create: `src/views/GISApp/layers/createMapSpec/MapSpec.types.ts`
- Create: `src/views/GISApp/layers/createMapSpec/createLayerSpec.ts`
- Test: `src/views/GISApp/layers/createMapSpec/createLayerSpec.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { createLayerSpec } from "@/views/GISApp/layers/createMapSpec/createLayerSpec";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

/**
 * The symbology's `value` is a QueryColumnId, not the layer id: a layer id
 * there type-checks nowhere and would mask a real wiring mistake.
 */
const valueColumnId = uuid<QueryColumn.Id>();

const featureCollection: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: 0,
      geometry: { type: "Point", coordinates: [15, -4] },
      properties: { cases: 12 },
    },
  ],
};

describe("createLayerSpec", () => {
  it("names its source and layer after the layer id", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const spec = createLayerSpec({
      layer,
      featureCollection,
      stats: { valueDomain: undefined },
    });
    expect(Object.keys(spec.sources)).toEqual([`ava-map-source-${layer.id}`]);
    expect(spec.layers.map((mapLayer) => mapLayer.id)).toEqual([
      `ava-map-layer-${layer.id}`,
    ]);
  });

  it("paints a flat circle with the configured radius and color", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const spec = createLayerSpec({
      layer,
      featureCollection,
      stats: { valueDomain: undefined },
    });
    expect(spec.layers[0]?.paint["circle-radius"]).toBe(6);
    expect(spec.layers[0]?.paint["circle-color"]).toBe("#3b82f6");
  });

  it("selects features through feature-state, not a duplicate layer", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const spec = createLayerSpec({
      layer,
      featureCollection,
      stats: { valueDomain: undefined },
    });
    expect(spec.layers).toHaveLength(1);
    expect(spec.layers[0]?.paint["circle-stroke-color"]).toEqual([
      "case",
      ["boolean", ["feature-state", "isSelected"], false],
      "#ffd700",
      "#ffffff",
    ]);
  });

  it("scales proportional symbols by square root of the value", () => {
    const base = MapLayer.makeEmpty("Cases");
    const layer = {
      ...base,
      symbology: {
        type: "proportionalSymbol" as const,
        value: valueColumnId,
        minRadius: 4,
        maxRadius: 24,
        scale: "sqrt" as const,
        color: { type: "single" as const, color: "#ef4444" },
        stroke: { width: 1, color: "#ffffff" },
      },
    };
    const spec = createLayerSpec({
      layer,
      featureCollection,
      stats: { valueDomain: [0, 100] },
      valueColumnName: "cases",
    });
    expect(spec.layers[0]?.paint["circle-radius"]).toEqual([
      "interpolate",
      ["linear"],
      ["sqrt", ["max", 0, ["-", ["to-number", ["get", "cases"], 0], 0]]],
      0,
      4,
      10,
      24,
    ]);
  });

  it("falls back to the minimum radius when there is no value domain", () => {
    const base = MapLayer.makeEmpty("Cases");
    const layer = {
      ...base,
      symbology: {
        type: "proportionalSymbol" as const,
        value: valueColumnId,
        minRadius: 4,
        maxRadius: 24,
        scale: "sqrt" as const,
        color: { type: "single" as const, color: "#ef4444" },
        stroke: { width: 1, color: "#ffffff" },
      },
    };
    const spec = createLayerSpec({
      layer,
      featureCollection,
      stats: { valueDomain: undefined },
      valueColumnName: "cases",
    });
    expect(spec.layers[0]?.paint["circle-radius"]).toBe(4);
  });

  it("hides a layer that is not visible", () => {
    const layer = { ...MapLayer.makeEmpty("Cases"), isVisible: false };
    const spec = createLayerSpec({
      layer,
      featureCollection,
      stats: { valueDomain: undefined },
    });
    expect(spec.layers[0]?.layout).toEqual({ visibility: "none" });
  });

  it("refuses to draw an aggregate-only layer as symbols", () => {
    const layer = {
      ...MapLayer.makeEmpty("Protection cases"),
      sensitivity: {
        mode: "aggregateOnly" as const,
        minCellCount: 5,
        minGeoLevel: "admin2",
      },
    };
    expect(() => {
      return createLayerSpec({
        layer,
        featureCollection,
        stats: { valueDomain: undefined },
      });
    }).toThrow(/aggregate/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend createLayerSpec`
Expected: FAIL, cannot resolve `createLayerSpec`.

- [ ] **Step 3: Write the spec types**

`src/views/GISApp/layers/createMapSpec/MapSpec.types.ts`:

```ts
/** A MapLibre GeoJSON source, as plain JSON. */
export type MapSourceSpec = {
  type: "geojson";
  data: GeoJSON.FeatureCollection;
};

/** A MapLibre layer, as plain JSON. */
export type MapLayerSpec = {
  id: string;
  type: "circle";
  source: string;
  paint: Record<string, unknown>;
  layout?: Record<string, unknown>;
};

/**
 * Everything a map should be showing, as data. Producing this is pure, so paint
 * decisions are testable without a browser; applying it is `syncMap`'s job.
 */
export type MapSpec = {
  sources: Record<string, MapSourceSpec>;

  /** Draw order, bottom to top. */
  layers: readonly MapLayerSpec[];
};
```

- [ ] **Step 4: Write `createLayerSpec`**

```ts
import { SensitivityViolationError } from "@/views/GISApp/layers/toFeatureCollection/toFeatureCollection";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerStats } from "@/views/GISApp/layers/computeLayerStats/computeLayerStats";
import type {
  MapLayerSpec,
  MapSpec,
} from "@/views/GISApp/layers/createMapSpec/MapSpec.types";

/** Highlight applied to the feature the user has selected. */
const SELECTED_STROKE_COLOR = "#ffd700";

/** Builds the MapLibre source id for a layer. */
export function buildSourceId(layerId: string): string {
  return `ava-map-source-${layerId}`;
}

/** Builds the MapLibre layer id for a layer. */
export function buildLayerId(layerId: string): string {
  return `ava-map-layer-${layerId}`;
}

/**
 * Builds the `circle-radius` value. A flat circle is a constant; a
 * proportional symbol interpolates on the square root of the value so that
 * symbol area, not radius, tracks the number.
 */
function buildCircleRadius({
  symbology,
  stats,
  valueColumnName,
}: {
  symbology: MapLayer.T["symbology"];
  stats: LayerStats;
  valueColumnName: string | undefined;
}): unknown {
  if (symbology.type === "circle") {
    return symbology.radius;
  }
  const { valueDomain } = stats;
  if (!valueColumnName || !valueDomain || valueDomain[0] === valueDomain[1]) {
    return symbology.minRadius;
  }
  const [minimum, maximum] = valueDomain;
  const scaleValue =
    symbology.scale === "sqrt" ?
      (span: number) => {
        return Math.sqrt(span);
      }
    : (span: number) => {
        return span;
      };
  const normalized = [
    "max",
    0,
    ["-", ["to-number", ["get", valueColumnName], 0], minimum],
  ];
  return [
    "interpolate",
    ["linear"],
    symbology.scale === "sqrt" ? ["sqrt", normalized] : normalized,
    0,
    symbology.minRadius,
    scaleValue(maximum - minimum),
    symbology.maxRadius,
  ];
}

/**
 * Turns one layer plus its data into MapLibre sources and layers.
 *
 * Pure: the same inputs always produce the same JSON, which is what makes
 * paint decisions unit-testable.
 *
 * @param params.valueColumnName Result column backing a proportional symbol,
 * resolved by the caller from the symbology's column id.
 * @throws SensitivityViolationError when the layer's policy forbids drawing it
 * as individual symbols.
 */
export function createLayerSpec({
  layer,
  featureCollection,
  stats,
  valueColumnName,
}: {
  layer: MapLayer.T;
  featureCollection: GeoJSON.FeatureCollection;
  stats: LayerStats;
  valueColumnName?: string;
}): MapSpec {
  if (layer.sensitivity.mode === "aggregateOnly") {
    throw new SensitivityViolationError(
      `Layer "${layer.name}" is aggregate-only and cannot be drawn as ` +
        "individual symbols.",
    );
  }

  const sourceId = buildSourceId(layer.id);
  const { symbology } = layer;
  const layerSpec: MapLayerSpec = {
    id: buildLayerId(layer.id),
    type: "circle",
    source: sourceId,
    paint: {
      "circle-radius": buildCircleRadius({ symbology, stats, valueColumnName }),
      "circle-color": symbology.color.color,
      "circle-opacity": 0.8,
      "circle-stroke-width": symbology.stroke.width,
      "circle-stroke-color": [
        "case",
        ["boolean", ["feature-state", "isSelected"], false],
        SELECTED_STROKE_COLOR,
        symbology.stroke.color,
      ],
    },
    ...(layer.isVisible ? {} : { layout: { visibility: "none" } }),
  };

  return {
    sources: { [sourceId]: { type: "geojson", data: featureCollection } },
    layers: [layerSpec],
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test:frontend createLayerSpec`
Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add src/views/GISApp/layers/createMapSpec
git commit -m "feat(gis): build MapLibre layer specs as pure data"
```

---

## Task 8: `createMapSpec`

Merges per-layer specs in draw order. Trivial today with one layer, and it is what makes the multi-layer wave additive.

**Files:**
- Create: `src/views/GISApp/layers/createMapSpec/createMapSpec.ts`
- Test: `src/views/GISApp/layers/createMapSpec/createMapSpec.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { createMapSpec } from "@/views/GISApp/layers/createMapSpec/createMapSpec";
import type { MapSpec } from "@/views/GISApp/layers/createMapSpec/MapSpec.types";

function createSingleLayerSpec(id: string): MapSpec {
  return {
    sources: {
      [`source-${id}`]: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
    },
    layers: [{ id: `layer-${id}`, type: "circle", source: `source-${id}`, paint: {} }],
  };
}

describe("createMapSpec", () => {
  it("merges layer specs in the order given", () => {
    const merged = createMapSpec([
      createSingleLayerSpec("bottom"),
      createSingleLayerSpec("top"),
    ]);
    expect(merged.layers.map((layer) => layer.id)).toEqual([
      "layer-bottom",
      "layer-top",
    ]);
    expect(Object.keys(merged.sources).sort()).toEqual([
      "source-bottom",
      "source-top",
    ]);
  });

  it("returns an empty spec for no layers", () => {
    expect(createMapSpec([])).toEqual({ sources: {}, layers: [] });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend createMapSpec`
Expected: FAIL, cannot resolve `createMapSpec`.

- [ ] **Step 3: Write the implementation**

```ts
import type { MapSpec } from "@/views/GISApp/layers/createMapSpec/MapSpec.types";

/**
 * Merges per-layer specs into one map spec, preserving the given order as
 * draw order (first entry is drawn at the bottom).
 */
export function createMapSpec(layerSpecs: readonly MapSpec[]): MapSpec {
  return layerSpecs.reduce<MapSpec>(
    (merged, layerSpec) => {
      return {
        sources: { ...merged.sources, ...layerSpec.sources },
        layers: [...merged.layers, ...layerSpec.layers],
      };
    },
    { sources: {}, layers: [] },
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:frontend createMapSpec`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/views/GISApp/layers/createMapSpec/createMapSpec.ts src/views/GISApp/layers/createMapSpec/createMapSpec.test.ts
git commit -m "feat(gis): merge layer specs into an ordered map spec"
```

---

## Task 9: `syncMap`

The only imperative MapLibre caller. It registers no event listeners at all, which is how the leaked `load` handler stops being possible.

**Files:**
- Create: `src/views/GISApp/MapCanvas/syncMap.ts`
- Test: `src/views/GISApp/MapCanvas/syncMap.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";
import { syncMap } from "@/views/GISApp/MapCanvas/syncMap";
import type { MapSpec } from "@/views/GISApp/layers/createMapSpec/MapSpec.types";

/**
 * Minimal stand-in for the MapLibre surface `syncMap` touches. Records calls so
 * tests can assert on the imperative sequence.
 */
function createFakeMap() {
  const sources = new Set<string>();
  const layers = new Set<string>();
  const calls: string[] = [];
  return {
    calls,
    getSource: (id: string) => {
      return sources.has(id) ? { setData: vi.fn() } : undefined;
    },
    addSource: vi.fn((id: string) => {
      sources.add(id);
      calls.push(`addSource:${id}`);
    }),
    removeSource: vi.fn((id: string) => {
      sources.delete(id);
      calls.push(`removeSource:${id}`);
    }),
    getLayer: (id: string) => {
      return layers.has(id) ? { id } : undefined;
    },
    addLayer: vi.fn((layer: { id: string }) => {
      layers.add(layer.id);
      calls.push(`addLayer:${layer.id}`);
    }),
    removeLayer: vi.fn((id: string) => {
      layers.delete(id);
      calls.push(`removeLayer:${id}`);
    }),
    moveLayer: vi.fn((id: string) => {
      calls.push(`moveLayer:${id}`);
    }),
    setPaintProperty: vi.fn((layerId: string, property: string) => {
      calls.push(`setPaint:${layerId}:${property}`);
    }),
    setLayoutProperty: vi.fn((layerId: string, property: string) => {
      calls.push(`setLayout:${layerId}:${property}`);
    }),
  };
}

const emptyCollection: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

function createSpec(layerIds: readonly string[]): MapSpec {
  return {
    sources: Object.fromEntries(
      layerIds.map((id) => {
        return [`source-${id}`, { type: "geojson" as const, data: emptyCollection }];
      }),
    ),
    layers: layerIds.map((id) => {
      return {
        id: `layer-${id}`,
        type: "circle" as const,
        source: `source-${id}`,
        paint: { "circle-radius": 6 },
      };
    }),
  };
}

const emptySpec: MapSpec = { sources: {}, layers: [] };

describe("syncMap", () => {
  it("adds sources before the layers that use them", () => {
    const map = createFakeMap();
    syncMap({ map: map as never, previousSpec: emptySpec, nextSpec: createSpec(["a"]) });
    expect(map.calls.indexOf("addSource:source-a")).toBeLessThan(
      map.calls.indexOf("addLayer:layer-a"),
    );
  });

  it("removes layers before their sources", () => {
    const map = createFakeMap();
    const spec = createSpec(["a"]);
    syncMap({ map: map as never, previousSpec: emptySpec, nextSpec: spec });
    map.calls.length = 0;
    syncMap({ map: map as never, previousSpec: spec, nextSpec: emptySpec });
    expect(map.calls).toEqual(["removeLayer:layer-a", "removeSource:source-a"]);
  });

  it("does not re-add an unchanged layer", () => {
    const map = createFakeMap();
    const spec = createSpec(["a"]);
    syncMap({ map: map as never, previousSpec: emptySpec, nextSpec: spec });
    map.addLayer.mockClear();
    syncMap({ map: map as never, previousSpec: spec, nextSpec: spec });
    expect(map.addLayer).not.toHaveBeenCalled();
  });

  it("updates paint in place when only paint changed", () => {
    const map = createFakeMap();
    const spec = createSpec(["a"]);
    syncMap({ map: map as never, previousSpec: emptySpec, nextSpec: spec });
    const repainted: MapSpec = {
      ...spec,
      layers: [{ ...spec.layers[0]!, paint: { "circle-radius": 12 } }],
    };
    map.calls.length = 0;
    syncMap({ map: map as never, previousSpec: spec, nextSpec: repainted });
    expect(map.calls).toEqual(["setPaint:layer-a:circle-radius"]);
  });

  it("enforces draw order when layers are reordered", () => {
    const map = createFakeMap();
    const spec = createSpec(["a", "b"]);
    syncMap({ map: map as never, previousSpec: emptySpec, nextSpec: spec });
    const reordered: MapSpec = { ...spec, layers: [spec.layers[1]!, spec.layers[0]!] };
    map.calls.length = 0;
    syncMap({ map: map as never, previousSpec: spec, nextSpec: reordered });
    expect(map.calls).toEqual(["moveLayer:layer-b", "moveLayer:layer-a"]);
  });

  it("registers no event listeners", () => {
    const map = createFakeMap() as Record<string, unknown>;
    syncMap({ map: map as never, previousSpec: emptySpec, nextSpec: createSpec(["a"]) });
    expect(map.on).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend syncMap`
Expected: FAIL, cannot resolve `syncMap`.

- [ ] **Step 3: Write the implementation**

```ts
import type {
  AddLayerObject,
  GeoJSONSource,
  Map as MapLibreMap,
} from "maplibre-gl";
import type {
  MapLayerSpec,
  MapSpec,
} from "@/views/GISApp/layers/createMapSpec/MapSpec.types";

function findLayerSpec(
  spec: MapSpec,
  layerId: string,
): MapLayerSpec | undefined {
  return spec.layers.find((layer) => {
    return layer.id === layerId;
  });
}

/** Applies only the paint properties whose values differ. */
function syncPaint(
  map: MapLibreMap,
  layerSpec: MapLayerSpec,
  previousLayerSpec: MapLayerSpec | undefined,
): void {
  Object.entries(layerSpec.paint).forEach(([property, value]) => {
    const previousValue = previousLayerSpec?.paint[property];
    if (JSON.stringify(previousValue) === JSON.stringify(value)) {
      return;
    }
    map.setPaintProperty(layerSpec.id, property, value);
  });
}

/** Applies only the layout properties whose values differ. */
function syncLayout(
  map: MapLibreMap,
  layerSpec: MapLayerSpec,
  previousLayerSpec: MapLayerSpec | undefined,
): void {
  const nextLayout = layerSpec.layout ?? { visibility: "visible" };
  const previousLayout = previousLayerSpec?.layout ?? { visibility: "visible" };
  Object.entries(nextLayout).forEach(([property, value]) => {
    if (JSON.stringify(previousLayout[property]) === JSON.stringify(value)) {
      return;
    }
    map.setLayoutProperty(layerSpec.id, property, value);
  });
}

/**
 * Brings a MapLibre map in line with `nextSpec`, doing the minimum work.
 *
 * This is the only function in the GIS app that calls MapLibre imperatively.
 * It deliberately registers no event listeners: interaction handlers are
 * attached once by the canvas, so repeated syncs cannot accumulate them.
 *
 * @param params.previousSpec What was last applied, used to diff. Pass an
 * empty spec after a style reload, when the map has dropped everything.
 */
export function syncMap({
  map,
  previousSpec,
  nextSpec,
}: {
  map: MapLibreMap;
  previousSpec: MapSpec;
  nextSpec: MapSpec;
}): void {
  const nextLayerIds = new Set(
    nextSpec.layers.map((layer) => {
      return layer.id;
    }),
  );

  // Layers first, then their sources: MapLibre refuses to remove a source that
  // a layer still references.
  previousSpec.layers.forEach((layerSpec) => {
    if (!nextLayerIds.has(layerSpec.id) && map.getLayer(layerSpec.id)) {
      map.removeLayer(layerSpec.id);
    }
  });
  Object.keys(previousSpec.sources).forEach((sourceId) => {
    if (!(sourceId in nextSpec.sources) && map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
  });

  Object.entries(nextSpec.sources).forEach(([sourceId, sourceSpec]) => {
    const existingSource = map.getSource(sourceId) as GeoJSONSource | undefined;
    if (existingSource) {
      if (previousSpec.sources[sourceId]?.data !== sourceSpec.data) {
        existingSource.setData(sourceSpec.data);
      }
      return;
    }
    map.addSource(sourceId, { type: "geojson", data: sourceSpec.data });
  });

  const isReordered =
    previousSpec.layers.length === nextSpec.layers.length &&
    nextSpec.layers.some((layerSpec, index) => {
      return previousSpec.layers[index]?.id !== layerSpec.id;
    });

  nextSpec.layers.forEach((layerSpec) => {
    const previousLayerSpec = findLayerSpec(previousSpec, layerSpec.id);
    if (!map.getLayer(layerSpec.id)) {
      map.addLayer(layerSpec as unknown as AddLayerObject);
      return;
    }
    syncPaint(map, layerSpec, previousLayerSpec);
    syncLayout(map, layerSpec, previousLayerSpec);
    if (isReordered) {
      // Moving each layer to the top in order leaves them in the requested
      // bottom-to-top sequence.
      map.moveLayer(layerSpec.id);
    }
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:frontend syncMap`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/views/GISApp/MapCanvas/syncMap.ts src/views/GISApp/MapCanvas/syncMap.test.ts
git commit -m "feat(gis): sync MapLibre from a declarative map spec"
```

---

## Task 10: Extract `runStructuredQuery`

`useDataQuery` currently holds the executor inline. Extracting it means GIS reuses one implementation instead of copying the Dataset/EntityConfig branch.

**Files:**
- Create: `src/clients/queries/runStructuredQuery/runStructuredQuery.ts`
- Test: `src/clients/queries/runStructuredQuery/runStructuredQuery.test.ts`
- Modify: `src/views/DataExplorerApp/useDataQuery.tsx`

- [ ] **Step 1: Read the current executor**

Read `src/views/DataExplorerApp/useDataQuery.tsx:81-190`. The whole `queryFn` body moves into `runStructuredQuery` unchanged except that the Lingui `t` call on line 116 becomes a plain `Error`: the message is developer-facing (structured queries are unreachable on the public path) and the extracted function is not a React component.

- [ ] **Step 2: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";

const runQueryMock = vi.fn();

vi.mock("@/clients/qetl/WorkspaceQETLClient", () => {
  return { WorkspaceQETLClient: { runQuery: runQueryMock } };
});
vi.mock("@/clients/qetl/PublicQETLClient", () => {
  return { PublicQETLClient: { runQuery: vi.fn() } };
});

const { runStructuredQuery } = await import(
  "@/clients/queries/runStructuredQuery/runStructuredQuery"
);
const { StructuredQuery } = await import(
  "$/models/queries/StructuredQuery/StructuredQuery.ts"
);

describe("runStructuredQuery", () => {
  it("runs caller-supplied raw SQL verbatim", async () => {
    runQueryMock.mockResolvedValue({ id: "r1", data: [], columns: [], numRows: 0 });
    await runStructuredQuery({
      auth: "workspace",
      workspaceId: "workspace-1" as never,
      query: StructuredQuery.makeEmpty(),
      rawSql: "SELECT 1 AS one",
    });
    expect(runQueryMock).toHaveBeenCalledWith({
      rawSql: "SELECT 1 AS one",
      workspaceId: "workspace-1",
    });
  });

  it("returns an empty result when there is nothing to run", async () => {
    runQueryMock.mockClear();
    const result = await runStructuredQuery({
      auth: "workspace",
      workspaceId: "workspace-1" as never,
      query: StructuredQuery.makeEmpty(),
      rawSql: undefined,
    });
    expect(runQueryMock).not.toHaveBeenCalled();
    expect(result.numRows).toBe(0);
    expect(result.data).toEqual([]);
  });

  it("rejects a structured query on the public path", async () => {
    await expect(
      runStructuredQuery({
        auth: "public",
        publicAvaPageId: "page-1" as never,
        query: StructuredQuery.makeEmpty(),
        rawSql: undefined,
      }),
    ).rejects.toThrow(/raw SQL/i);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test:frontend runStructuredQuery`
Expected: FAIL, cannot resolve `runStructuredQuery`.

- [ ] **Step 4: Create `runStructuredQuery`**

Move the body of `useDataQuery`'s `queryFn` into this file. Keep the `Model.match` branches, `resolveManualQueryForExecution`, and `selectSqlToExecute` calls exactly as they are today.

```ts
import { Model } from "@models";
import { makeObjectFromEntries, prop, sortObjList } from "@utils";
import { uuid } from "$/lib/uuid";
import { QueryResult as QueryResultFns } from "$/models/queries/QueryResult/QueryResult";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { EntityFieldValueClient } from "@/clients/entities/EntityFieldValueClient/EntityFieldValueClient";
import { PublicQETLClient } from "@/clients/qetl/PublicQETLClient";
import { WorkspaceQETLClient } from "@/clients/qetl/WorkspaceQETLClient";
import { resolveManualQueryForExecution } from "@/views/DataExplorerApp/resolveManualQueryForExecution/resolveManualQueryForExecution";
import { selectSqlToExecute } from "@/views/DataExplorerApp/selectSqlToExecute/selectSqlToExecute";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { DashboardId } from "$/models/Dashboard/Dashboard.types";
import type {
  QueryResult,
  QueryResultColumn,
  QueryResultId,
} from "$/models/queries/QueryResult/QueryResult.types";
import type { Workspace } from "$/models/Workspace/Workspace";

/** Who is asking, which decides which QETL client answers. */
export type StructuredQueryAuth =
  | { auth: "workspace"; workspaceId: Workspace.Id }
  | { auth: "public"; publicAvaPageId: DashboardId };

export type RunStructuredQueryParams = StructuredQueryAuth & {
  query: StructuredQuery.Partial;
  rawSql: string | undefined;

  /**
   * When true, `rawSql` came from the manual form and the row-count guard may
   * replace it with bounded SQL before execution.
   */
  isStructuredQueryInSync?: boolean;
};

/**
 * Runs a structured query (or caller-supplied raw SQL) against the right QETL
 * client, resolving dataset and entity sources.
 *
 * This is the single execution path shared by the Data Explorer and the GIS
 * app. Callers wrap it in their own caching hook rather than duplicating the
 * source-resolution branches.
 */
export async function runStructuredQuery(
  params: RunStructuredQueryParams,
): Promise<QueryResult<UnknownRow>> {
  const { query, rawSql, isStructuredQueryInSync = true } = params;
  const { dataSource, queryColumns } = query;
  const sortedQueryColumns = sortObjList(queryColumns, { sortBy: prop("id") });

  const resolved =
    rawSql === undefined && params.auth === "workspace" ?
      await resolveManualQueryForExecution({
        query,
        workspaceId: params.workspaceId,
      })
    : { query, didAutoLimit: false as const };

  const sqlToRun = selectSqlToExecute({
    rawSql,
    isStructuredQueryInSync,
    executionQuery: resolved.query,
  });

  if (sqlToRun) {
    if (params.auth === "public") {
      return await PublicQETLClient.runQuery({
        rawSql: sqlToRun,
        dashboardId: params.publicAvaPageId,
      });
    }
    return await WorkspaceQETLClient.runQuery({
      rawSql: sqlToRun,
      workspaceId: params.workspaceId,
    });
  }

  if (params.auth === "public") {
    throw new Error(
      "Public queries are not supported for structured queries. " +
        "Use raw SQL instead.",
    );
  }

  if (!dataSource || sortedQueryColumns.length === 0) {
    return QueryResultFns.makeEmpty();
  }

  const { workspaceId } = params;
  const executionQueryWithSource = {
    ...resolved.query,
    dataSource,
  } as StructuredQuery.T;

  return await Model.match(dataSource, {
    Dataset: async (): Promise<QueryResult<UnknownRow>> => {
      return await WorkspaceQETLClient.runQuery({
        rawSql: StructuredQuery.toRawDuckDBQuery(executionQueryWithSource),
        workspaceId,
      });
    },

    // Entity sources resolve through EntityFieldValueClient, which may in turn
    // query many datasets.
    EntityConfig: async (entityConfig): Promise<QueryResult<UnknownRow>> => {
      const fields = sortedQueryColumns
        .map(prop("baseColumn"))
        .filter(Model.valIsOfModelType("EntityFieldConfig"));

      const rows = await EntityFieldValueClient.getAllEntityFieldValues({
        entityConfigId: entityConfig.id,
        entityFieldConfigs: fields,
        workspaceId,
      });

      const queryResultColumns: QueryResultColumn[] = fields.map((field) => {
        return { name: field.name, dataType: field.dataType };
      });

      return {
        id: uuid() as QueryResultId,
        data: rows.map((row) => {
          return makeObjectFromEntries(
            queryResultColumns.map((column) => {
              const field = fields.find((candidate) => {
                return candidate.name === column.name;
              });
              return [column.name, row[field!.id]!];
            }),
          );
        }),
        columns: queryResultColumns,
        numRows: rows.length,
      };
    },
  });
}
```

- [ ] **Step 5: Reduce `useDataQuery` to a wrapper**

Replace the whole `queryFn` in `src/views/DataExplorerApp/useDataQuery.tsx` with a call to the new function, keeping its `queryKey` exactly as it is today. Delete the now-unused imports (`Model`, `makeObjectFromEntries`, `uuid`, `QueryResultFns`, `EntityFieldValueClient`, `PublicQETLClient`, `WorkspaceQETLClient`, `resolveManualQueryForExecution`, `selectSqlToExecute`, `useLingui`) and the `t` binding.

```tsx
    queryFn: async (): Promise<QueryResult<UnknownRow>> => {
      return await runStructuredQuery(
        auth === "workspace" ?
          {
            auth: "workspace",
            workspaceId: options.workspaceId,
            query,
            rawSql,
            isStructuredQueryInSync,
          }
        : {
            auth: "public",
            publicAvaPageId: options.publicAvaPageId,
            query,
            rawSql,
            isStructuredQueryInSync,
          },
      );
    },
```

- [ ] **Step 6: Run the new test and the Data Explorer tests**

Run: `pnpm test:frontend runStructuredQuery`
Expected: PASS, 3 tests.

Run: `pnpm test:frontend DataExplorer`
Expected: PASS, no new failures.

- [ ] **Step 7: Type check and commit**

```bash
pnpm type-check
git add src/clients/queries src/views/DataExplorerApp/useDataQuery.tsx
git commit -m "refactor(queries): extract runStructuredQuery from useDataQuery"
```

---

## Task 11: `useMapLayerData`

Caches per layer, keyed on source and binding only, so editing symbology repaints without refetching. This replaces the imperative load in `useSelectedMapDataSource` and drops its Dataset-only gate.

**Files:**
- Create: `src/views/GISApp/layers/useMapLayerData/useMapLayerData.ts`
- Test: `src/views/GISApp/layers/useMapLayerData/useMapLayerData.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { buildMapLayerQueryKey, isMapLayerQueryable } from "@/views/GISApp/layers/useMapLayerData/useMapLayerData";

describe("isMapLayerQueryable", () => {
  it("is false until the layer has a data source", () => {
    expect(isMapLayerQueryable(MapLayer.makeEmpty("Cases"))).toBe(false);
  });

  it("is false when the layer has a source but no resolvable geo binding", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const withSource = {
      ...layer,
      source: { ...layer.source, dataSource: { __type: "Dataset", id: "d1" } },
    } as never;
    expect(isMapLayerQueryable(withSource)).toBe(false);
  });
});

describe("buildMapLayerQueryKey", () => {
  it("changes when the source changes", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const withLimit = { ...layer, source: { ...layer.source, limit: 500 } };
    expect(buildMapLayerQueryKey(layer)).not.toEqual(
      buildMapLayerQueryKey(withLimit),
    );
  });

  it("does not change when only symbology changes, so repaint skips refetch", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const recolored = {
      ...layer,
      symbology: {
        ...layer.symbology,
        color: { type: "single" as const, color: "#ef4444" },
      },
    };
    expect(buildMapLayerQueryKey(layer)).toEqual(
      buildMapLayerQueryKey(recolored),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend useMapLayerData`
Expected: FAIL, cannot resolve `useMapLayerData`.

- [ ] **Step 3: Write the implementation**

```ts
import { useQuery } from "@hooks";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { runStructuredQuery } from "@/clients/queries/runStructuredQuery/runStructuredQuery";
import type { UseQueryResultTuple } from "@hooks";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";

/**
 * True when a layer has everything it needs to run: a data source and a geo
 * binding whose columns are present in its query.
 */
export function isMapLayerQueryable(layer: MapLayer.T): boolean {
  return (
    layer.source.dataSource !== undefined &&
    MapLayer.resolveGeoBinding(layer) !== undefined
  );
}

/**
 * Cache key for a layer's rows. Deliberately excludes symbology, legend, and
 * popup config so restyling a layer repaints from cache instead of refetching.
 */
export function buildMapLayerQueryKey(layer: MapLayer.T): readonly unknown[] {
  return ["mapLayerData", layer.id, layer.source, layer.geoBinding];
}

/**
 * Loads one layer's rows through the shared structured-query executor.
 *
 * Any source the executor understands works here, so dataset, virtual, and
 * entity sources all render without map-specific handling.
 */
export function useMapLayerData({
  layer,
  workspaceId,
}: {
  layer: MapLayer.T;
  workspaceId: Workspace.Id;
}): UseQueryResultTuple<QueryResult<UnknownRow>> {
  return useQuery({
    enabled: isMapLayerQueryable(layer),
    queryKey: [workspaceId, ...buildMapLayerQueryKey(layer)],
    queryFn: async (): Promise<QueryResult<UnknownRow>> => {
      return await runStructuredQuery({
        auth: "workspace",
        workspaceId,
        query: layer.source,
        rawSql: undefined,
      });
    },
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:frontend useMapLayerData`
Expected: PASS, 4 tests.

- [ ] **Step 5: Add the no-spatial-SQL regression test**

Append to `src/views/GISApp/layers/useMapLayerData/useMapLayerData.test.ts`. This is the property that keeps point maps working when the optional `spatial` extension is missing, replacing the deferred capability probe.

```ts
describe("compiled SQL for a lat/lng layer", () => {
  it("uses no spatial function", async () => {
    const { StructuredQuery } = await import(
      "$/models/queries/StructuredQuery/StructuredQuery.ts"
    );
    const { QueryColumn } = await import(
      "$/models/queries/QueryColumn/QueryColumn.ts"
    );
    const { uuid } = await import("$/lib/uuid.ts");

    // Same honest fixture as the MapLayer model tests: no cast, real
    // AvaDataType, real field names.
    const createColumn = (name: string) => {
      const now = new Date().toISOString();
      return QueryColumn.makeFromDatasetColumn({
        __type: "DatasetColumn",
        id: uuid(),
        datasetId: uuid(),
        workspaceId: uuid(),
        createdAt: now,
        updatedAt: now,
        name,
        originalName: name,
        originalDataType: "DOUBLE",
        dataType: "double",
        detectedDataType: "DOUBLE",
        description: undefined,
        columnIdx: 0,
      });
    };

    const latitude = createColumn("lat");
    const longitude = createColumn("lon");
    const query = {
      ...StructuredQuery.makeEmpty(),
      dataSource: { __type: "Dataset", id: "dataset-1" },
      queryColumns: [latitude, longitude],
    } as never;

    expect(StructuredQuery.toRawDuckDBQuery(query)).not.toMatch(/ST_/i);
  });
});
```

- [ ] **Step 6: Run the tests and commit**

Run: `pnpm test:frontend useMapLayerData`
Expected: PASS, 5 tests.

```bash
git add src/views/GISApp/layers/useMapLayerData
git commit -m "feat(gis): load layer rows through the shared query executor"
```

---

## Task 12: `MapCanvas` with a single lifecycle owner

Fixes the double style path that made the style picker unsafe, and attaches exactly one click handler for all layers.

**Files:**
- Create: `src/views/GISApp/MapCanvas/MapCanvas.tsx`, `MapCanvas.module.css`
- Move: `src/views/GISApp/DataMap/{mapStyles.ts,mapColors.ts,applyMapStyles.ts,MapStylePicker.tsx}` -> `src/views/GISApp/basemap/`
- Modify: `src/views/GISApp/basemap/mapStyles.ts` (key it by the model's `BasemapStyleKey`)

- [ ] **Step 1: Move the basemap files**

```bash
mkdir -p src/views/GISApp/basemap
git mv src/views/GISApp/DataMap/mapStyles.ts src/views/GISApp/basemap/mapStyles.ts
git mv src/views/GISApp/DataMap/mapColors.ts src/views/GISApp/basemap/mapColors.ts
git mv src/views/GISApp/DataMap/applyMapStyles.ts src/views/GISApp/basemap/applyMapStyles.ts
git mv src/views/GISApp/DataMap/MapStylePicker.tsx src/views/GISApp/basemap/MapStylePicker.tsx
grep -rl "GISApp/DataMap/\(mapStyles\|mapColors\|applyMapStyles\|MapStylePicker\)" src \
  | xargs sed -i '' 's|GISApp/DataMap/mapStyles|GISApp/basemap/mapStyles|g; s|GISApp/DataMap/mapColors|GISApp/basemap/mapColors|g; s|GISApp/DataMap/applyMapStyles|GISApp/basemap/applyMapStyles|g; s|GISApp/DataMap/MapStylePicker|GISApp/basemap/MapStylePicker|g'
```

- [ ] **Step 2: Key the style table by the model's style union**

In `src/views/GISApp/basemap/mapStyles.ts`, replace the local `MapStyleKey` type and `MapStyleKeys` registry with a `satisfies` check against the model. The style keys now have one definition.

```ts
import { registry } from "@utils";
import type { AvaMap } from "$/models/AvaMap/AvaMap";

/** Basemap style URLs, keyed by the model's basemap style union. */
export const mapStyles = {
  positron: {
    url: "https://tiles.openfreemap.org/styles/positron",
    name: "Positron",
  },
  bright: {
    url: "https://tiles.openfreemap.org/styles/bright",
    name: "Bright",
  },
  liberty: {
    url: "https://tiles.openfreemap.org/styles/liberty",
    name: "Liberty",
  },
  dark: {
    url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    name: "Dark",
  },
  fiord: {
    url: "https://tiles.openfreemap.org/styles/fiord",
    name: "Fiord",
  },
  avandar: {
    url: "https://tiles.openfreemap.org/styles/bright",
    name: "Avandar",
  },
} as const satisfies Record<
  AvaMap.BasemapStyle,
  { url: string; name: string }
>;

export type MapStyleKey = AvaMap.BasemapStyle;

export const MapStyleKeys = registry<MapStyleKey>().keys(
  "avandar",
  "positron",
  "bright",
  "liberty",
  "dark",
  "fiord",
);
```

- [ ] **Step 3: Write the canvas stylesheet**

`src/views/GISApp/MapCanvas/MapCanvas.module.css`:

```css
.canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.controlPanel {
  position: absolute;
  z-index: 1;
  top: 16px;
  left: 8px;
  padding: 0 var(--mantine-spacing-xs) var(--mantine-spacing-xs);
  border: 1px solid rgb(255 255 255 / 30%);
  border-radius: 12px;
  background-color: rgb(255 255 255 / 70%);
  box-shadow: var(--mantine-shadow-md);
  backdrop-filter: blur(12px);
}

.statusOverlay {
  position: absolute;
  z-index: 2;
  right: 0;
  bottom: 24px;
  left: 0;
  display: flex;
  justify-content: center;
  pointer-events: none;
}
```

- [ ] **Step 4: Write `MapCanvas`**

The map is constructed once. `setStyle` handles style changes, and `style.load` re-applies the spec from an empty baseline because MapLibre drops sources and layers on a style swap.

```tsx
import { useLingui } from "@lingui/react/macro";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { applyMapStyles } from "@/views/GISApp/basemap/applyMapStyles";
import { mapStyles } from "@/views/GISApp/basemap/mapStyles";
import classes from "@/views/GISApp/MapCanvas/MapCanvas.module.css";
import { syncMap } from "@/views/GISApp/MapCanvas/syncMap";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { MapBounds } from "@/views/GISApp/layers/computeBounds/computeBounds";
import type { MapSpec } from "@/views/GISApp/layers/createMapSpec/MapSpec.types";
import type { StyleSpecification } from "maplibre-gl";
import type { ReactNode } from "react";

const EMPTY_MAP_SPEC: MapSpec = { sources: {}, layers: [] };

/**
 * MapLibre always needs a style, so a basemap of `none` renders a flat
 * background layer instead of tiles. That is the usable fallback when tile
 * hosts are unreachable.
 */
function buildStyle(basemap: AvaMap.Basemap): string | StyleSpecification {
  if (basemap.type === "builtIn") {
    return mapStyles[basemap.style].url;
  }
  return {
    version: 8,
    sources: {},
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": basemap.background },
      },
    ],
  };
}

/** Identity of a basemap, used to skip redundant `setStyle` calls. */
function buildStyleKey(basemap: AvaMap.Basemap): string {
  return basemap.type === "builtIn" ?
      `builtIn:${basemap.style}`
    : `none:${basemap.background}`;
}

type Props = {
  basemap: AvaMap.Basemap;
  view: AvaMap.ViewState;
  spec: MapSpec;

  /** Bounds to fly to, or `undefined` to leave the camera alone. */
  fitBounds: MapBounds | undefined;

  /** Ids of layers whose features respond to clicks. */
  interactiveLayerIds: readonly string[];
  onFeatureClick: (feature: GeoJSON.Feature) => void;
  children?: ReactNode;
};

/**
 * Owns the MapLibre instance: one construction, one style path, one click
 * handler. Rendering data is delegated to `syncMap`.
 */
export function MapCanvas({
  basemap,
  view,
  spec,
  fitBounds,
  interactiveLayerIds,
  onFeatureClick,
  children,
}: Props): JSX.Element {
  const { t } = useLingui();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const appliedSpecRef = useRef<MapSpec>(EMPTY_MAP_SPEC);
  const appliedStyleKeyRef = useRef<string | undefined>(undefined);
  const [isStyleReady, setIsStyleReady] = useState(false);

  // Latest-value refs, declared before the one-shot construction effect that
  // reads them, so its handlers stay current without re-registering.
  const interactiveLayerIdsRef = useRef(interactiveLayerIds);
  const onFeatureClickRef = useRef(onFeatureClick);
  const basemapRef = useRef(basemap);
  useEffect(() => {
    interactiveLayerIdsRef.current = interactiveLayerIds;
    onFeatureClickRef.current = onFeatureClick;
    basemapRef.current = basemap;
  }, [interactiveLayerIds, onFeatureClick, basemap]);

  // Construct the map exactly once. Style changes are handled below with
  // setStyle, so the instance survives them.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) {
      return;
    }
    const initialBasemap = basemapRef.current;
    const map = new maplibregl.Map({
      container,
      style: buildStyle(initialBasemap),
      center: [...view.center] as [number, number],
      zoom: view.zoom,
    });
    appliedStyleKeyRef.current = buildStyleKey(initialBasemap);
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");
    mapRef.current = map;

    // One map-level click handler covers every layer, present or future, so
    // adding and removing layers cannot accumulate listeners.
    const handleClick = (event: maplibregl.MapMouseEvent): void => {
      const existingLayerIds = interactiveLayerIdsRef.current.filter((layerId) => {
        return map.getLayer(layerId);
      });
      if (existingLayerIds.length === 0) {
        return;
      }
      const [feature] = map.queryRenderedFeatures(event.point, {
        layers: existingLayerIds,
      });
      if (feature) {
        onFeatureClickRef.current(feature as GeoJSON.Feature);
      }
    };
    map.on("click", handleClick);

    const handleStyleLoad = (): void => {
      // A style swap discards sources and layers, so the next sync must start
      // from an empty baseline.
      appliedSpecRef.current = EMPTY_MAP_SPEC;
      const currentBasemap = basemapRef.current;
      if (currentBasemap.type === "builtIn" && currentBasemap.style === "avandar") {
        applyMapStyles(map);
      }
      setIsStyleReady(true);
    };
    map.on("style.load", handleStyleLoad);

    return () => {
      map.off("click", handleClick);
      map.off("style.load", handleStyleLoad);
      map.remove();
      mapRef.current = null;
      appliedSpecRef.current = EMPTY_MAP_SPEC;
      appliedStyleKeyRef.current = undefined;
      setIsStyleReady(false);
    };
    // Construction is intentionally one-shot: later prop changes are applied by
    // the effects below rather than by rebuilding the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Style changes swap the style in place. `style.load` resets the applied
  // spec, and the sync effect below re-adds everything. The key check skips the
  // redundant swap on mount, where the constructor already applied the style.
  useEffect(() => {
    const map = mapRef.current;
    const nextStyleKey = buildStyleKey(basemap);
    if (!map || appliedStyleKeyRef.current === nextStyleKey) {
      return;
    }
    appliedStyleKeyRef.current = nextStyleKey;
    setIsStyleReady(false);
    map.setStyle(buildStyle(basemap));
  }, [basemap]);

  // Apply the declarative spec whenever it or the style changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isStyleReady) {
      return;
    }
    syncMap({ map, previousSpec: appliedSpecRef.current, nextSpec: spec });
    appliedSpecRef.current = spec;
  }, [spec, isStyleReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fitBounds) {
      return;
    }
    map.fitBounds(fitBounds as [[number, number], [number, number]], {
      padding: 50,
      duration: 1000,
    });
  }, [fitBounds]);

  useEffect(() => {
    const handleResize = (): void => {
      mapRef.current?.resize();
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        className={classes.canvas}
        role="application"
        aria-label={t`Map`}
      />
      {children}
    </>
  );
}
```

- [ ] **Step 5: Verify the style picker works end to end**

Run: `pnpm dev`, open `/<workspaceSlug>/map`, switch styles in the picker (it is enabled in Task 13).
Expected: the basemap changes, the data layer reappears after the swap, and the browser console stays clean.

- [ ] **Step 6: Type check and commit**

```bash
pnpm type-check
git add src/views/GISApp/MapCanvas src/views/GISApp/basemap src/views/GISApp/DataMap
git commit -m "refactor(gis): own the map lifecycle in MapCanvas"
```

---

## Task 13: Wire the pipeline into the app and delete the prototype

**Files:**
- Create: `src/views/GISApp/MapCanvas/MapStatusOverlay.tsx`
- Create: `src/views/GISApp/panels/FeatureInspector/FeatureInspector.tsx`
- Modify: `src/views/GISApp/GISApp.tsx`
- Modify: `src/views/GISApp/DataMap/QueryFormContainer/QueryFormContainer.tsx` -> moved to `src/views/GISApp/panels/LayerFormPanel/LayerFormPanel.tsx`
- Delete: `src/views/GISApp/DataMap/useSelectedMapDataSource.ts`, `src/views/GISApp/DataMap/DataMap.tsx`, `src/views/GISApp/DataMap/GeometryDrawer.tsx`

- [ ] **Step 1: Write the status overlay**

```tsx
import { useLingui } from "@lingui/react/macro";
import { Alert, Loader, Paper, Text } from "@mantine/core";
import classes from "@/views/GISApp/MapCanvas/MapCanvas.module.css";
import type { GeometryDropReport } from "@/views/GISApp/layers/toFeatureCollection/toFeatureCollection";

type Props = {
  isLoading: boolean;
  error: Error | null;
  hasBinding: boolean;
  featureCount: number;
  drops: readonly GeometryDropReport[];
};

/**
 * Reports what the map is doing when it is not simply showing data: loading,
 * failed, unconfigured, empty, or silently dropping rows.
 */
export function MapStatusOverlay({
  isLoading,
  error,
  hasBinding,
  featureCount,
  drops,
}: Props): JSX.Element | null {
  const { t } = useLingui();
  const droppedRowCount = drops.reduce((total, drop) => {
    return total + drop.count;
  }, 0);

  if (error) {
    return (
      <div className={classes.statusOverlay}>
        <Alert color="danger" title={t`Could not load map data`}>
          {error.message}
        </Alert>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className={classes.statusOverlay}>
        <Paper p="xs" radius="md" withBorder>
          <Loader size="sm" aria-label={t`Loading map data`} />
        </Paper>
      </div>
    );
  }
  if (!hasBinding) {
    return (
      <div className={classes.statusOverlay}>
        <Paper p="xs" radius="md" withBorder>
          <Text size="sm">
            {t`Pick a data source and its latitude and longitude columns to plot it.`}
          </Text>
        </Paper>
      </div>
    );
  }
  if (featureCount === 0) {
    return (
      <div className={classes.statusOverlay}>
        <Paper p="xs" radius="md" withBorder>
          <Text size="sm">{t`No mappable rows in this data source.`}</Text>
        </Paper>
      </div>
    );
  }
  if (droppedRowCount > 0) {
    return (
      <div className={classes.statusOverlay}>
        <Alert color="warning" title={t`Some rows could not be mapped`}>
          <Text size="sm">
            {t`${droppedRowCount} of ${featureCount + droppedRowCount} rows were skipped because their coordinates were missing or out of range.`}
          </Text>
        </Alert>
      </div>
    );
  }
  return null;
}
```

- [ ] **Step 2: Rename the inspector drawer**

```bash
mkdir -p src/views/GISApp/panels/FeatureInspector
git mv src/views/GISApp/DataMap/GeometryDrawer.tsx src/views/GISApp/panels/FeatureInspector/FeatureInspector.tsx
```

In the moved file, rename the component `GeometryDrawer` to `FeatureInspector`, and change the drawer title from `t`Data Point`` to `t`Feature``. Leave the rest as is.

- [ ] **Step 3: Move the form panel**

```bash
mkdir -p src/views/GISApp/panels/LayerFormPanel
git mv src/views/GISApp/DataMap/QueryFormContainer/QueryFormContainer.tsx \
  src/views/GISApp/panels/LayerFormPanel/LayerFormPanel.tsx
rmdir src/views/GISApp/DataMap/QueryFormContainer
```

Rename the component to `LayerFormPanel`. Keep its props and body unchanged: it still emits a data source, a latitude column, a longitude column, an optional size column, and a color. Task 13 Step 4 adapts those callbacks into layer edits.

- [ ] **Step 4: Rewrite `GISApp` as the composition root**

```tsx
import { useLingui } from "@lingui/react/macro";
import { Box } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useCallback, useMemo, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { AvaMap } from "$/models/AvaMap/AvaMap";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { computeBounds } from "@/views/GISApp/layers/computeBounds/computeBounds";
import { computeLayerStats } from "@/views/GISApp/layers/computeLayerStats/computeLayerStats";
import { buildLayerId, createLayerSpec } from "@/views/GISApp/layers/createMapSpec/createLayerSpec";
import { createMapSpec } from "@/views/GISApp/layers/createMapSpec/createMapSpec";
import { toFeatureCollection } from "@/views/GISApp/layers/toFeatureCollection/toFeatureCollection";
import { useMapLayerData } from "@/views/GISApp/layers/useMapLayerData/useMapLayerData";
import { MapCanvas } from "@/views/GISApp/MapCanvas/MapCanvas";
import classes from "@/views/GISApp/MapCanvas/MapCanvas.module.css";
import { MapStatusOverlay } from "@/views/GISApp/MapCanvas/MapStatusOverlay";
import { FeatureInspector } from "@/views/GISApp/panels/FeatureInspector/FeatureInspector";
import { LayerFormPanel } from "@/views/GISApp/panels/LayerFormPanel/LayerFormPanel";
import type { Workspace } from "$/models/Workspace/Workspace";

const EMPTY_FEATURE_COLLECTION: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

type Props = { workspaceId: Workspace.Id };

/**
 * The GIS app. Holds the map config in state, runs each layer's query, and
 * hands the resulting declarative spec to the canvas.
 */
export function GISApp({ workspaceId }: Props): JSX.Element {
  const { t } = useLingui();
  const [avaMap, setAvaMap] = useState(() => {
    const emptyMap = AvaMap.makeEmpty(t`Untitled map`);
    return {
      ...emptyMap,
      layers: [MapLayer.makeEmpty(t`Layer 1`)],
    };
  });
  const [selectedFeature, setSelectedFeature] = useState<GeoJSON.Feature | null>(
    null,
  );
  const [isInspectorOpen, { open: openInspector, close: closeInspector }] =
    useDisclosure(false);

  const layer = avaMap.layers[0]!;
  const [queryResult, isLoading, { error }] = useMapLayerData({
    layer,
    workspaceId,
  });

  const updateLayer = useCallback(
    (update: (current: MapLayer.T) => MapLayer.T) => {
      setAvaMap((current) => {
        return {
          ...current,
          layers: current.layers.map((candidate, index) => {
            return index === 0 ? update(candidate) : candidate;
          }),
        };
      });
    },
    [],
  );

  const resolvedBinding = MapLayer.resolveGeoBinding(layer);

  const { featureCollection, drops } = useMemo(() => {
    if (!resolvedBinding || !queryResult) {
      return { featureCollection: EMPTY_FEATURE_COLLECTION, drops: [] };
    }
    return toFeatureCollection({
      rows: queryResult.data,
      binding: resolvedBinding,
      sensitivity: layer.sensitivity,
      layerId: layer.id,
    });
  }, [resolvedBinding, queryResult, layer.sensitivity, layer.id]);

  const valueColumnName = useMemo(() => {
    if (layer.symbology.type !== "proportionalSymbol") {
      return undefined;
    }
    const column = layer.source.queryColumns.find((candidate) => {
      return candidate.id === layer.symbology.value;
    });
    return column ? QueryColumn.getDerivedColumnName(column) : undefined;
  }, [layer.symbology, layer.source.queryColumns]);

  const spec = useMemo(() => {
    return createMapSpec([
      createLayerSpec({
        layer,
        featureCollection,
        stats: computeLayerStats({ featureCollection, valueColumnName }),
        valueColumnName,
      }),
    ]);
  }, [layer, featureCollection, valueColumnName]);

  const fitBounds = useMemo(() => {
    return computeBounds(featureCollection);
  }, [featureCollection]);

  const interactiveLayerIds = useMemo(() => {
    return [buildLayerId(layer.id)];
  }, [layer.id]);

  const handleFeatureClick = useCallback(
    (feature: GeoJSON.Feature) => {
      setSelectedFeature(feature);
      openInspector();
    },
    [openInspector],
  );

  return (
    <Box w="100%" mih="100dvh" pos="relative">
      <MapCanvas
        basemap={avaMap.basemap}
        view={avaMap.view}
        spec={spec}
        fitBounds={fitBounds}
        interactiveLayerIds={interactiveLayerIds}
        onFeatureClick={handleFeatureClick}
      >
        <Box className={classes.controlPanel}>
          <LayerFormPanel
            layer={layer}
            basemap={avaMap.basemap}
            onLayerChange={updateLayer}
            onBasemapChange={(basemap) => {
              setAvaMap((current) => {
                return { ...current, basemap };
              });
            }}
          />
        </Box>
        <MapStatusOverlay
          isLoading={isLoading}
          error={error}
          hasBinding={resolvedBinding !== undefined}
          featureCount={featureCollection.features.length}
          drops={drops}
        />
      </MapCanvas>
      <FeatureInspector
        opened={isInspectorOpen}
        onClose={() => {
          closeInspector();
          setSelectedFeature(null);
        }}
        feature={selectedFeature}
      />
    </Box>
  );
}
```

- [ ] **Step 5: Adapt `LayerFormPanel` to edit the layer**

Change its props to `{ layer, basemap, onLayerChange, onBasemapChange }`, where
`onLayerChange` takes the same updater function `GISApp` passes down.

Add this helper at the top of the file. Every column the layer references must
also be in `source.queryColumns`, or `resolveGeoBinding` returns `undefined` and
the layer never runs:

```ts
/**
 * Adds `column` to the layer's query if it is not already selected. Columns a
 * layer binds to must be part of its query, or the binding cannot resolve.
 */
function withQueryColumn(layer: MapLayer.T, column: QueryColumn.T): MapLayer.T {
  const isAlreadySelected = layer.source.queryColumns.some((candidate) => {
    return candidate.id === column.id;
  });
  if (isAlreadySelected) {
    return layer;
  }
  return {
    ...layer,
    source: {
      ...layer.source,
      queryColumns: [...layer.source.queryColumns, column],
    },
  };
}
```

Then rewire each control:

- **Data source select.** Clearing the binding on a source change is what stops a
  stale column id silently producing an unqueryable layer.

```ts
onLayerChange((current) => {
  return {
    ...current,
    source: { ...current.source, dataSource, queryColumns: [] },
    geoBinding: undefined,
  };
});
```

- **Latitude select** (longitude is identical with `longitude:` in place of
  `latitude:`):

```ts
onLayerChange((current) => {
  if (!column) {
    return { ...current, geoBinding: undefined };
  }
  const withColumn = withQueryColumn(current, column);
  return {
    ...withColumn,
    geoBinding: {
      type: "latLngColumns",
      latitude: column.id,
      longitude: withColumn.geoBinding?.longitude ?? column.id,
    },
  };
});
```

  Seeding the other axis with the same id keeps the binding well-formed while
  only one column is chosen; `resolveGeoBinding` still succeeds, and the map
  simply plots on the diagonal until the second column is picked. If that
  reads wrong in use, make `geoBinding` hold optional axes instead and resolve
  only when both are set. Do not leave a half-built binding that resolves to
  `undefined` without telling the user why.

- **Symbol size select.** Keep the existing `notifyError` guard for non-numeric
  columns.

```ts
onLayerChange((current) => {
  if (!column) {
    return {
      ...current,
      symbology: {
        type: "circle",
        radius: 6,
        color: current.symbology.color,
        stroke: current.symbology.stroke,
      },
    };
  }
  const withColumn = withQueryColumn(current, column);
  return {
    ...withColumn,
    symbology: {
      type: "proportionalSymbol",
      value: column.id,
      minRadius: 4,
      maxRadius: 24,
      scale: "sqrt",
      color: current.symbology.color,
      stroke: current.symbology.stroke,
    },
  };
});
```

- **Color input:**

```ts
onLayerChange((current) => {
  return {
    ...current,
    symbology: {
      ...current.symbology,
      color: { type: "single", color },
    },
  };
});
```

- **Style picker.** Delete the `HIDE_STYLE_PICKER` constant, render
  `MapStylePicker` unconditionally, and wire its `onChange` to
  `onBasemapChange({ type: "builtIn", style })`.

- [ ] **Step 6: Pass the workspace id from the route**

`src/routes/_auth/$workspaceSlug/map.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { GISApp } from "@/views/GISApp/GISApp";

export const Route = createFileRoute("/_auth/$workspaceSlug/map")({
  component: GISAppPage,
});

function GISAppPage() {
  const workspace = useCurrentWorkspace();
  return <GISApp workspaceId={workspace.id} />;
}
```

`useCurrentWorkspace` (`src/hooks/workspaces/useCurrentWorkspace.ts:16`) returns
`Workspace.WithSubscription`, which carries `id`. It is the same hook
`DataExplorerApp.tsx:170` uses, so do not add a second workspace lookup.

- [ ] **Step 7: Delete the prototype**

```bash
git rm src/views/GISApp/DataMap/useSelectedMapDataSource.ts
git rm src/views/GISApp/DataMap/DataMap.tsx
rmdir src/views/GISApp/DataMap 2>/dev/null || true
```

- [ ] **Step 8: Verify no debug logging survives**

Run: `grep -rn "console\." src/views/GISApp ; echo "exit=$?"`
Expected: no output, `exit=1`.

- [ ] **Step 9: Verify in the browser**

Run: `pnpm dev`, open `/<workspaceSlug>/map`.
Expected, in order:
1. With nothing selected, the overlay reads "Pick a data source and its latitude and longitude columns to plot it."
2. After picking a dataset and both coordinate columns, points render and the camera fits them.
3. Clicking a point opens the feature inspector.
4. Changing the color repaints without a visible reload (the network tab shows no new query).
5. Switching basemap style keeps the points.
6. A dataset with some blank coordinates shows the "Some rows could not be mapped" warning with a count.

- [ ] **Step 10: Commit**

```bash
pnpm type-check && pnpm lint
git add -A src/views/GISApp src/routes/_auth/\$workspaceSlug/map.tsx
git commit -m "refactor(gis): render maps from the AvaMap pipeline"
```

---

## Task 14: Full verification sweep

- [ ] **Step 1: Run the whole frontend suite**

Run: `pnpm test:frontend`
Expected: PASS, no failures. If a Data Explorer test broke, the cause is Task 10's extraction: fix `runStructuredQuery` rather than the test.

- [ ] **Step 2: Type check and lint**

Run: `pnpm type-check && pnpm lint`
Expected: no errors.

- [ ] **Step 3: Confirm the prototype is gone**

```bash
git ls-files src/views/GISApp
```
Expected: no `DataMap` directory, no `useSelectedMapDataSource.ts`, no `GeometryDrawer.tsx`.

- [ ] **Step 4: Confirm the i18n catalog is current**

Run: `pnpm i18n:extract`
Expected: new GIS strings appear in `src/i18n/locales`. Commit the catalog change.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(gis): update i18n catalogs for the map refactor"
```

---

## Verification checklist

- [ ] `pnpm test:frontend` passes.
- [ ] `pnpm type-check` and `pnpm lint` pass.
- [ ] `grep -rn "console\." src/views/GISApp` returns nothing.
- [ ] The style picker is visible and switching styles keeps the data layer.
- [ ] Color changes repaint with no new query in the network tab.
- [ ] A dataset with blank coordinates surfaces a dropped-row warning with a count.
- [ ] Selecting a non-`Dataset` source (a virtual dataset) renders rather than silently doing nothing.
