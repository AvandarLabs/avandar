/* eslint-disable @typescript-eslint/no-namespace */
import type {
  AvaVizConfig as AvaVizConfigRead,
  AvaVizConfigRegistry,
  AvaVizConfigType,
  AvaVizConfigUtilRegistry,
  VizType,
} from "$/models/vizs/AvaVizConfig/AvaVizConfig.types.ts";

/** Types shared by all supported visualization configurations. */
export namespace AvaVizConfig {
  export type T = AvaVizConfigRead;
  export type Type = VizType;
  export type Registry = AvaVizConfigRegistry;
  export type For<TypeName extends Type> = AvaVizConfigType<TypeName>;
  export type UtilRegistry = AvaVizConfigUtilRegistry;
}
