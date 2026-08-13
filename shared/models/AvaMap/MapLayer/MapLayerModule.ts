import { Model } from "@models/Model/Model.ts";
import { uuid } from "$/lib/uuid.ts";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.ts";
import type { ResolvedGeoBinding } from "$/models/AvaMap/MapLayer/GeoBinding.types.ts";
import type {
  MapLayerId,
  MapLayerRead,
} from "$/models/AvaMap/MapLayer/MapLayer.types.ts";
import type { QueryColumnId } from "$/models/queries/QueryColumn/QueryColumn.types.ts";

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
  resolveGeoBinding: (layer: MapLayerRead): ResolvedGeoBinding | undefined => {
    const { geoBinding, source } = layer;
    if (!geoBinding || !geoBinding.latitude || !geoBinding.longitude) {
      return undefined;
    }
    const findColumnName = (columnId: QueryColumnId): string | undefined => {
      const column = source.queryColumns.find((candidate) => {
        return candidate.id === columnId;
      });
      return column ? QueryColumn.getDerivedColumnName(column) : undefined;
    };

    const latitudeColumnName = findColumnName(geoBinding.latitude);
    const longitudeColumnName = findColumnName(geoBinding.longitude);
    return latitudeColumnName && longitudeColumnName ?
        { type: "latLngColumns", latitudeColumnName, longitudeColumnName }
      : undefined;
  },
};
