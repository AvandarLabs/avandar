import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Creates paint compatible with one direct geometry family. */
export function withGeometryFamilySymbology(
  options: Readonly<{
    layer: MapLayer.T;
    family: MapLayer.GeometryFamily;
  }>,
): MapLayer.Symbology {
  const { layer, family } = options;
  const color =
    (
      layer.symbology.type !== "heatmap" &&
      layer.symbology.color.type === "single"
    ) ?
      layer.symbology.color
    : { type: "single" as const, color: MapLayer.defaultSymbolColor };
  const stroke =
    layer.symbology.type === "heatmap" ?
      MapLayer.createDefaultFillSymbology().stroke
    : layer.symbology.stroke;
  if (family === "polygon") {
    return { ...MapLayer.createDefaultFillSymbology(), color, stroke };
  }
  if (family === "line") {
    return { type: "line", color, stroke };
  }
  return {
    type: "circle",
    radius: MapLayer.defaultSymbolRadius,
    color,
    stroke,
  };
}
