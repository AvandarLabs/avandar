/* eslint-disable @typescript-eslint/no-namespace */
import type {
  BoundVizConfig as BoundVizConfigRead,
  BoundXYSeries,
  BoundScatterSeries,
  BoundBubbleSeries,
  BoundRadarSeries,
} from "$/models/vizs/BoundVizConfig/BoundVizConfig.types.ts";
import type {
  LegacyVizConfig,
  ResolvedVizConfig,
} from "$/models/vizs/BoundVizConfig/LegacyVizConfig.types.ts";

/** Stable chart configuration and its ingress and renderer representations. */
export namespace BoundVizConfig {
  export type T = BoundVizConfigRead;
  export type Type = T["vizType"];
  export type For<TypeName extends Type> = Extract<T, { vizType: TypeName }>;
  export type Legacy = LegacyVizConfig;
  export type Resolved = ResolvedVizConfig;
  export type XYSeries = BoundXYSeries;
  export type ScatterSeries = BoundScatterSeries;
  export type BubbleSeries = BoundBubbleSeries;
  export type RadarSeries = BoundRadarSeries;
}
