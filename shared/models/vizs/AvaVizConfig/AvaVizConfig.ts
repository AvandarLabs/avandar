/* eslint-disable @typescript-eslint/no-namespace */
import type { AvaPluginVizConfig } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types.ts";
import type {
  AvaVizConfig as AvaVizConfigRead,
  AvaVizConfigRegistry,
  AvaVizConfigType,
  AvaVizConfigUtilRegistry,
  BuiltInAvaVizConfig,
  BuiltInVizType,
  VizType,
} from "$/models/vizs/AvaVizConfig/AvaVizConfig.types.ts";

/**
 * A chart's settings, one config type per viz type, with every column
 * referenced by its column ID so the chart keeps its columns through
 * renames and SQL edits.
 *
 * Use it wherever a chart is edited or saved, for example a chart on a
 * dashboard or in the Data Explorer. Renderers take the `UiVizConfig` form.
 */
export namespace AvaVizConfig {
  export type T = AvaVizConfigRead;
  export type Type = VizType;
  /** A config of a chart or table type Avandar draws itself. */
  export type BuiltIn = BuiltInAvaVizConfig;
  /** The viz type of a chart or table Avandar draws itself. */
  export type BuiltInType = BuiltInVizType;
  /** A config of a chart drawn by a plugin's chart type. */
  export type Plugin = AvaPluginVizConfig;
  export type Registry = AvaVizConfigRegistry;
  export type For<TypeName extends Type> = AvaVizConfigType<TypeName>;
  export type UtilRegistry = AvaVizConfigUtilRegistry;
}
