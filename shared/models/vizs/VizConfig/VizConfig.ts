import type { OutputNameVizConfig } from "$/models/vizs/ColumnIdVizConfig/OutputNameVizConfig.types.ts";
/* eslint-disable @typescript-eslint/no-namespace */
import type {
  VizConfig as VizConfigRead,
  VizConfigRegistry,
  VizConfigType,
  VizConfigUtilRegistry,
  VizType,
} from "$/models/vizs/VizConfig/VizConfig.types.ts";

/** Types shared by all supported visualization configurations. */
export namespace VizConfig {
  export type OutputNameKeyed = OutputNameVizConfig;
  export type T = VizConfigRead;
  export type Type = VizType;
  export type Registry = VizConfigRegistry;
  export type For<TypeName extends Type> = VizConfigType<TypeName>;
  export type UtilRegistry = VizConfigUtilRegistry;
}
