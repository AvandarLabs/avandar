import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { MapLayerSpatialFeatureProperties } from "@/clients/maps/MapLayerSpatialQuery/MapLayerSpatialQuery.constants";
import type { ExpressionSpecification } from "maplibre-gl";

/** Makes color paint from flat or preclassified feature properties. */
export function makeColorExpressionFromColor(
  color: MapLayer.Color,
): string | ExpressionSpecification {
  if (color.type === "single") {
    return color.color;
  }
  const classColors =
    color.type === "graduated" ?
      color.ramp
    : color.categories.map(({ color: categoryColor }) => {
        return categoryColor;
      });
  const noDataColor = color.noData.color;
  const classMatch = [
    "match",
    ["get", MapLayerSpatialFeatureProperties.classIndex],
    ...classColors.flatMap((classColor, index) => {
      return [index, classColor];
    }),
    color.type === "categorical" ? color.other.color : noDataColor,
    // MapLibre cannot type a dynamically spread match tuple as an expression.
  ] as unknown as ExpressionSpecification;
  return [
    "case",
    ["==", ["get", MapLayerSpatialFeatureProperties.state], "suppressed"],
    "#868e96",
    ["==", ["get", MapLayerSpatialFeatureProperties.state], "noData"],
    noDataColor,
    classMatch,
  ];
}
