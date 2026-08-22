import { Model } from "@avandar/models";
import { isDefined, propEq } from "@avandar/utils";
import { uuid } from "$/lib/uuid.ts";
import {
  areDisputedStatusValuesDisjoint,
  canBindDisputedStatus,
  EMPTY_DISPUTED_STATUS_VALUES,
} from "$/models/AvaMap/MapLayer/MapLayerModule/disputedStatusHelpers.ts";
import {
  QueryColumn, // prettier-ignore
} from "$/models/queries/QueryColumn/QueryColumn.ts";
import {
  StructuredQuery, // prettier-ignore
} from "$/models/queries/StructuredQuery/StructuredQuery.ts";
import type {
  AreaGeoBinding,
  GeoBindingColumnNames, // prettier-ignore
} from "$/models/AvaMap/MapLayer/GeoBinding.types.ts";
import type {
  FillSymbology, // prettier-ignore
} from "$/models/AvaMap/MapLayer/LayerSymbology.types.ts";
import type {
  AggregateOnlyMapLayerRead,
  MapLayerId,
  MapLayerRead,
  StandardMapLayerRead,
} from "$/models/AvaMap/MapLayer/MapLayer.types.ts";
import type {
  QueryDataSource, // prettier-ignore
} from "$/models/queries/QueryDataSource/QueryDataSource.ts";

/** Fallback symbol color when the author has not picked one. */
const DEFAULT_SYMBOL_COLOR = "#3b82f6";

/** Fallback circle radius, in pixels. */
const DEFAULT_SYMBOL_RADIUS = 6;

/** Fallback smallest radius of a proportional symbol, in pixels. */
const DEFAULT_MIN_SYMBOL_RADIUS = 4;

/** Fallback largest radius of a proportional symbol, in pixels. */
const DEFAULT_MAX_SYMBOL_RADIUS = 24;

/** Fallback cluster radius, in pixels. */
const DEFAULT_CLUSTER_RADIUS_PX = 50;

/** Fallback heatmap radius, in pixels. */
const DEFAULT_HEATMAP_RADIUS_PX = 30;

/** Fallback grid-cell size, in meters. */
const DEFAULT_GRID_SIZE_METERS = 10_000;

/** Fallback buffer distance, in meters. */
const DEFAULT_BUFFER_DISTANCE_METERS = 1000;

/** Fallback sequential heatmap color ramp. */
const DEFAULT_HEATMAP_RAMP = [
  "#ffd4af",
  "#daa475",
  "#b97c44",
  "#9b5802",
  "#7e3500",
] as const;

/** Fallback polygon opacity when the author has not picked one. */
const DEFAULT_FILL_OPACITY = 0.72;

/** Creates the default single-color polygon paint. */
function _createDefaultFillSymbology(): FillSymbology {
  return {
    type: "fill",
    color: { type: "single", color: DEFAULT_SYMBOL_COLOR },
    stroke: { width: 1, color: "#ffffff" },
    opacity: DEFAULT_FILL_OPACITY,
  };
}

/** True when a binding produces polygon geometry. */
function _isAreaGeoBinding(
  binding: MapLayerRead["geoBinding"],
): binding is AreaGeoBinding {
  return (
    binding?.type === "joinToBoundaries" ||
    binding?.type === "aggregatePointsToBoundaries" ||
    binding?.type === "binPointsToGrid" ||
    binding?.type === "bufferOfLayer" ||
    (binding?.type === "geometryColumn" && binding.family === "polygon")
  );
}

/** Constructors, defaults, and binding helpers for map layers. */
export const MapLayerModule = {
  /** Fallback symbol color when the author has not picked one. */
  defaultSymbolColor: DEFAULT_SYMBOL_COLOR,

  /** Fallback circle radius, in pixels. */
  defaultSymbolRadius: DEFAULT_SYMBOL_RADIUS,

  /** Fallback smallest radius of a proportional symbol, in pixels. */
  defaultMinSymbolRadius: DEFAULT_MIN_SYMBOL_RADIUS,

  /** Fallback largest radius of a proportional symbol, in pixels. */
  defaultMaxSymbolRadius: DEFAULT_MAX_SYMBOL_RADIUS,

  /** Fallback cluster radius, in pixels. */
  defaultClusterRadiusPx: DEFAULT_CLUSTER_RADIUS_PX,

  /** Fallback heatmap radius, in pixels. */
  defaultHeatmapRadiusPx: DEFAULT_HEATMAP_RADIUS_PX,

  /** Fallback grid-cell size, in meters. */
  defaultGridSizeMeters: DEFAULT_GRID_SIZE_METERS,

  /** Fallback buffer distance, in meters. */
  defaultBufferDistanceMeters: DEFAULT_BUFFER_DISTANCE_METERS,

  /** Fallback sequential heatmap color ramp. */
  defaultHeatmapRamp: DEFAULT_HEATMAP_RAMP,

  /** No disputed-status values assigned: every outline renders as settled. */
  emptyDisputedStatusValues: EMPTY_DISPUTED_STATUS_VALUES,

  /** True when a layer may carry a disputed-status bind. */
  canBindDisputedStatus,

  /** True when no value appears in both the disputed and undetermined lists. */
  areDisputedStatusValuesDisjoint,

  /**
   * A new, unbound layer: visible, exact, drawn as a flat circle, with no
   * geometry columns picked yet.
   * @param name The layer's display name, already localized by the caller.
   */
  makeEmpty: (name: string): StandardMapLayerRead => {
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
      timeColumn: undefined,
      applyAoiFilter: true,
      popup: { columnIds: "all", action: undefined },
      legend: {
        title: name,
        units: undefined,
        showNoData: true,
        position: "bottomRight",
        breaks: [],
        entries: [],
        sizeStops: [],
      },
      disputedStatusColumn: undefined,
      disputedStatusValues: EMPTY_DISPUTED_STATUS_VALUES,
    } as const);
  },

  /** Creates the default single-color polygon paint. */
  createDefaultFillSymbology: (): FillSymbology => {
    return _createDefaultFillSymbology();
  },

  /** Creates an exact, unbound polygon layer for area authoring flows. */
  createArea: (name: string): StandardMapLayerRead => {
    return {
      ...MapLayerModule.makeEmpty(name),
      symbology: _createDefaultFillSymbology(),
    };
  },

  /** Applies sensitivity while preventing aggregate-only point rendering. */
  withSensitivity: (
    layer: MapLayerRead,
    sensitivity: MapLayerRead["sensitivity"],
  ): StandardMapLayerRead | AggregateOnlyMapLayerRead => {
    if (sensitivity.mode !== "aggregateOnly") {
      return { ...layer, sensitivity } as StandardMapLayerRead;
    }
    return {
      ...layer,
      sensitivity,
      geoBinding: _isAreaGeoBinding(layer.geoBinding)
        ? layer.geoBinding
        : undefined,
      symbology:
        layer.symbology.type === "fill"
          ? layer.symbology
          : _createDefaultFillSymbology(),
    } as AggregateOnlyMapLayerRead;
  },

  /**
   * A layer pointed at a data source, with no geometry bound yet.
   *
   * The add-layer flow asks for exactly one thing, the source, because it is
   * the only field with no sensible default. Everything else is edited in
   * the inspector afterwards.
   *
   * @param params.dataSource The source whose rows the layer will query.
   * @param params.name The layer's display name, already localized.
   */
  fromDataSource: (
    params: Readonly<{
      dataSource: QueryDataSource.T;
      name: string;
    }>,
  ): StandardMapLayerRead => {
    const layer = MapLayerModule.makeEmpty(params.name);
    return {
      ...layer,
      source: { ...layer.source, dataSource: params.dataSource },
    };
  },

  /**
   * The layer's geo binding restated in the column names its result rows are
   * keyed by, rather than the column ids the layer persists.
   * @param layer The layer whose binding and query columns are read.
   * @returns The binding's column names, or `undefined` when the layer has no
   * binding or a bound column is absent from the layer's query.
   */
  toGeoBinding: (layer: MapLayerRead): GeoBindingColumnNames | undefined => {
    const { geoBinding, source } = layer;
    if (
      geoBinding?.type !== "latLngColumns" ||
      !geoBinding.latitude ||
      !geoBinding.longitude
    ) {
      return undefined;
    }
    const findColumnName = (columnId: QueryColumn.Id): string | undefined => {
      const column = source.queryColumns.find(propEq("id", columnId));
      return column ? QueryColumn.getDerivedColumnName(column) : undefined;
    };

    const latitudeColumnName = findColumnName(geoBinding.latitude);
    const longitudeColumnName = findColumnName(geoBinding.longitude);
    return latitudeColumnName && longitudeColumnName
      ? { type: "latLngColumns", latitudeColumnName, longitudeColumnName }
      : undefined;
  },

  /**
   * The column names a feature's popup should show, keyed the way query
   * result rows are keyed rather than by column id.
   *
   * @param layer The layer whose popup config and query columns are read.
   * @returns `"all"` when the popup shows everything, otherwise the resolved
   * names of selected columns that are still in the layer's query.
   */
  toPopupColumnNames: (layer: MapLayerRead): string[] | "all" => {
    const { columnIds } = layer.popup;
    return columnIds === "all"
      ? "all"
      : columnIds
          .map((columnId) => {
            const column = layer.source.queryColumns.find(
              propEq("id", columnId),
            );
            return column
              ? QueryColumn.getDerivedColumnName(column)
              : undefined;
          })
          .filter(isDefined);
  },

  /**
   * Column names a feature must carry: the popup's columns plus any column
   * paint depends on. The disputed bind is here rather than in the popup so a
   * dashed casing cannot vanish because the author trimmed the popup.
   *
   * @param layer The layer whose popup config, disputed bind, and query
   * columns are read.
   * @returns `"all"` when the popup shows everything, otherwise the popup's
   * resolved column names plus the bound disputed-status column when it is a
   * query column not already among them.
   */
  toPropertyColumnNames: (layer: MapLayerRead): string[] | "all" => {
    const popupNames = MapLayerModule.toPopupColumnNames(layer);
    const reference = layer.disputedStatusColumn;
    if (popupNames === "all" || reference?.type !== "queryColumn") {
      return popupNames;
    }
    const column = layer.source.queryColumns.find(
      propEq("id", reference.column),
    );
    const name = column ? QueryColumn.getDerivedColumnName(column) : undefined;
    return name && !popupNames.includes(name)
      ? [...popupNames, name]
      : popupNames;
  },
};
