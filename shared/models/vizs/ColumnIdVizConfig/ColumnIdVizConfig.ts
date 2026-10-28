/* eslint-disable @typescript-eslint/no-namespace */
import type {
  ColumnIdVizConfig as ColumnIdVizConfigRead,
  ColumnIdXYSeries,
  ColumnIdScatterSeries,
  ColumnIdBubbleSeries,
  ColumnIdRadarSeries,
} from "$/models/vizs/ColumnIdVizConfig/ColumnIdVizConfig.types.ts";
import type { NameResolvedVizConfig } from "$/models/vizs/ColumnIdVizConfig/NameResolvedVizConfig.types.ts";

/**
 * Chart configuration whose column slots store column IDs, plus its
 * name-resolved form.
 */
export namespace ColumnIdVizConfig {
  export type T = ColumnIdVizConfigRead;
  export type Type = T["vizType"];
  export type For<TypeName extends Type> = Extract<T, { vizType: TypeName }>;
  export type NameResolved = NameResolvedVizConfig;
  export type XYSeries = ColumnIdXYSeries;
  export type ScatterSeries = ColumnIdScatterSeries;
  export type BubbleSeries = ColumnIdBubbleSeries;
  export type RadarSeries = ColumnIdRadarSeries;
}
