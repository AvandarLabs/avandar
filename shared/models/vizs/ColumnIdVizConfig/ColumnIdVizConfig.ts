/* eslint-disable @typescript-eslint/no-namespace */
import type {
  ColumnIdVizConfig as ColumnIdVizConfigRead,
  ColumnIdXYSeries,
  ColumnIdScatterSeries,
  ColumnIdBubbleSeries,
  ColumnIdRadarSeries,
} from "$/models/vizs/ColumnIdVizConfig/ColumnIdVizConfig.types.ts";
import type { OutputNameVizConfig } from "$/models/vizs/ColumnIdVizConfig/OutputNameVizConfig.types.ts";

/**
 * Chart configuration whose column slots store column IDs, plus its output
 * name form.
 */
export namespace ColumnIdVizConfig {
  export type T = ColumnIdVizConfigRead;
  export type Type = T["vizType"];
  export type For<TypeName extends Type> = Extract<T, { vizType: TypeName }>;
  export type OutputNameKeyed = OutputNameVizConfig;
  export type XYSeries = ColumnIdXYSeries;
  export type ScatterSeries = ColumnIdScatterSeries;
  export type BubbleSeries = ColumnIdBubbleSeries;
  export type RadarSeries = ColumnIdRadarSeries;
}
