import type {
  XYSeries,
  ScatterSeries,
  BubbleSeries,
  RadarSeries,
} from "$/models/vizs/SeriesConfig.ts";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.ts";
/** Chart configuration whose column slots store column IDs. */
export type ColumnIdVizConfig = VizConfig.T;
/** XY mark settings whose `key` is a column ID. */
export type ColumnIdXYSeries = XYSeries;
/** Scatter cloud settings whose keys are column IDs. */
export type ColumnIdScatterSeries = ScatterSeries;
/** Bubble cloud settings whose keys are column IDs. */
export type ColumnIdBubbleSeries = BubbleSeries;
/** Radar settings whose keys are column IDs. */
export type ColumnIdRadarSeries = RadarSeries;
