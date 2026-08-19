import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

export const HEATMAP_RAMPS = {
  ochre: MapLayer.defaultHeatmapRamp,
  blue: ["#eff3ff", "#bdd7e7", "#6baed6", "#2171b5", "#08306b"],
  orange: ["#feedde", "#fdbe85", "#fd8d3c", "#e6550d", "#a63603"],
} as const;
