import { useRef } from "react";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { AvailableSymbologyType } from "@/views/GisApp/panels/LayerInspector/StyleSection/SymbologyOptions/SymbologyOptions.constants";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Retains each available symbol type's settings while switching types. */
export function useSymbologyTypeChange(
  options: Readonly<{
    layer: MapLayer.T;
    onLayerChange: LayerChangeHandler;
  }>,
): (nextType: AvailableSymbologyType) => void {
  const { layer, onLayerChange } = options;
  const rememberedRef = useRef<
    Partial<Record<MapLayer.Symbology["type"], MapLayer.Symbology>>
  >({});
  rememberedRef.current[layer.symbology.type] = layer.symbology;
  const sizeColumn =
    layer.symbology.type === "proportionalSymbol" ?
      MapLayerUpdates.getQueryColumnFromLayer({
        layer: layer,
        columnId: layer.symbology.value,
      })
    : undefined;
  const valueColumn = sizeColumn ?? layer.source.queryColumns[0];
  return (nextType) => {
    onLayerChange((current) => {
      return MapLayerUpdates.withSymbologyType({
        layer: current,
        change: {
          nextType,
          valueColumn,
          remembered: rememberedRef.current[nextType],
        },
      });
    });
  };
}
