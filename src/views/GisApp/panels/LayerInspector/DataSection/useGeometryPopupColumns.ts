import { useEffect } from "react";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";

/**
 * Fills a geometry-column layer's popup with every source column.
 *
 * The binding guess does this for a new layer. A layer that is already bound,
 * including a derived dataset of the same table, does not guess again, so a
 * popup left on the short default would keep hiding the rest of the row.
 */
export function useGeometryPopupColumns(
  options: Readonly<{
    layer: MapLayer.T;
    sourceColumns: readonly QueryColumn.T[];
    onLayerChange: LayerChangeHandler;
  }>,
): void {
  const { layer, sourceColumns, onLayerChange } = options;
  const isGeometryColumn = layer.geoBinding?.type === "geometryColumn";
  useEffect(
    function fillGeometryPopupColumns() {
      if (!isGeometryColumn || sourceColumns.length === 0) {
        return;
      }
      onLayerChange((current) => {
        if (current.geoBinding?.type !== "geometryColumn") {
          return current;
        }
        return MapLayerUpdates.withDefaultPopupColumns({
          layer: current,
          availableColumns: sourceColumns,
        });
      });
    },
    [isGeometryColumn, onLayerChange, sourceColumns],
  );
}
