import { Model } from "@avandar/models";
import { propEq } from "@avandar/utils";
import { uuid } from "$/lib/uuid.ts";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.ts";
import type { GeoBindingColumnNames } from "$/models/AvaMap/MapLayer/GeoBinding.types.ts";
import type {
  MapLayerId,
  MapLayerRead,
} from "$/models/AvaMap/MapLayer/MapLayer.types.ts";

/** Fallback symbol color when the author has not picked one. */
const DEFAULT_SYMBOL_COLOR = "#3b82f6";

/** Fallback circle radius, in pixels. */
const DEFAULT_SYMBOL_RADIUS = 6;

/** Fallback smallest radius of a proportional symbol, in pixels. */
const DEFAULT_MIN_SYMBOL_RADIUS = 4;

/** Fallback largest radius of a proportional symbol, in pixels. */
const DEFAULT_MAX_SYMBOL_RADIUS = 24;

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
   * The layer's geo binding restated in the column names its result rows are
   * keyed by, rather than the column ids the layer persists.
   * @param layer The layer whose binding and query columns are read.
   * @returns The binding's column names, or `undefined` when the layer has no
   * binding or a bound column is absent from the layer's query.
   */
  toGeoBinding: (layer: MapLayerRead): GeoBindingColumnNames | undefined => {
    const { geoBinding, source } = layer;
    if (!geoBinding || !geoBinding.latitude || !geoBinding.longitude) {
      return undefined;
    }
    const findColumnName = (columnId: QueryColumn.Id): string | undefined => {
      const column = source.queryColumns.find(propEq("id", columnId));
      return column ? QueryColumn.getDerivedColumnName(column) : undefined;
    };

    const latitudeColumnName = findColumnName(geoBinding.latitude);
    const longitudeColumnName = findColumnName(geoBinding.longitude);
    return latitudeColumnName && longitudeColumnName ?
        { type: "latLngColumns", latitudeColumnName, longitudeColumnName }
      : undefined;
  },
};
