import { useRef } from "react";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

type AvailableType = "circle" | "proportionalSymbol";

/** Retains each available symbol type's settings while switching types. */
export function useSymbologyTypeChange(
  layer: MapLayer.T,
  onLayerChange: LayerChangeHandler,
): (nextType: AvailableType) => void {
  const rememberedRef = useRef<
    Partial<Record<MapLayer.Symbology["type"], MapLayer.Symbology>>
  >({});
  rememberedRef.current[layer.symbology.type] = layer.symbology;
  const sizeColumn =
    layer.symbology.type === "proportionalSymbol" ?
      MapLayerUpdates.findQueryColumn(layer, layer.symbology.value)
    : undefined;
  const valueColumn = sizeColumn ?? layer.source.queryColumns[0];
  return (nextType) => {
    onLayerChange((current) => {
      return MapLayerUpdates.withSymbologyType(current, {
        nextType,
        valueColumn,
        remembered: rememberedRef.current[nextType],
      });
    });
  };
}
