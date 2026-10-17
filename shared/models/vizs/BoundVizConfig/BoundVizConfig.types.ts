import type {
  XYSeries,
  ScatterSeries,
  BubbleSeries,
  RadarSeries,
} from "$/models/vizs/SeriesConfig.ts";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.ts";
/** Stable chart configuration. */
export type BoundVizConfig = VizConfig.T;
/** Stable XY mark settings. */
export type BoundXYSeries = XYSeries;
/** Stable scatter cloud settings. */
export type BoundScatterSeries = ScatterSeries;
/** Stable bubble cloud settings. */
export type BoundBubbleSeries = BubbleSeries;
/** Stable radar settings. */
export type BoundRadarSeries = RadarSeries;
