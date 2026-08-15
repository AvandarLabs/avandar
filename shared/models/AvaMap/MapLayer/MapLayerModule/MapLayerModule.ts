import { Model } from "@avandar/models";
import { isDefined, propEq } from "@avandar/utils";
import { uuid } from "$/lib/uuid.ts";
import {
  QueryColumn, // prettier-ignore
} from "$/models/queries/QueryColumn/QueryColumn.ts";
import {
  StructuredQuery, // prettier-ignore
} from "$/models/queries/StructuredQuery/StructuredQuery.ts";
import type {
  GeoBindingColumnNames, // prettier-ignore
} from "$/models/AvaMap/MapLayer/GeoBinding.types.ts";
import type {
  MapLayerId,
  MapLayerRead,
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
      popup: { columnIds: "all", action: undefined },
      legend: {
        title: name,
        units: undefined,
        showNoData: true,
        position: "bottomRight",
      },
    } as const);
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
  makeFromDataSource: (params: {
    dataSource: QueryDataSource.T;
    name: string;
  }): MapLayerRead => {
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

  /**
   * The column names a feature's popup should show, keyed the way query
   * result rows are keyed rather than by column id.
   *
   * @param layer The layer whose popup config and query columns are read.
   * @returns `"all"` when the popup shows everything, otherwise the resolved
   * names of selected columns that are still in the layer's query.
   */
  toPopupColumnNames: (layer: MapLayerRead): readonly string[] | "all" => {
    const { columnIds } = layer.popup;
    return columnIds === "all" ? "all" : (
        columnIds
          .map((columnId) => {
            const column = layer.source.queryColumns.find(
              propEq("id", columnId),
            );
            return column ?
                QueryColumn.getDerivedColumnName(column)
              : undefined;
          })
          .filter(isDefined)
      );
  },
};
