import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";

/** A value a plugin chart setting holds, other than a column. */
export type PluginVizSettingValue = string | number | boolean;

/** The column data types a plugin chart's column picker can ask for. */
export type PluginVizColumnPickerDataType =
  | "numeric"
  | "any"
  | "temporal"
  | "text";

/**
 * The `AvaVizConfig` of a chart drawn by a plugin's chart type, keyed by
 * column ID. Column settings sit in their own record, so ID-to-name
 * conversion and provisional ID remapping work without loading the plugin's
 * manifest.
 *
 * Use it wherever a plugin chart is edited or saved, for example a plugin
 * chart on a dashboard. Renderers take the `UiPluginVizConfig` form.
 */
export type AvaPluginVizConfig = Readonly<{
  vizType: "plugin";

  /** The plugin's manifest id, for example `avandar.epidemiology`. */
  pluginId: string;

  /** The chart type's id within the plugin, for example `epicurve`. */
  pluginVizId: string;

  /** Column ID per column picker setting key. Unset settings are undefined. */
  columnSettings: Readonly<Record<string, QueryColumn.Id | undefined>>;

  /** Value per non-column setting key. Unset settings are undefined. */
  settings: Readonly<Record<string, PluginVizSettingValue | undefined>>;
}>;

/**
 * An `AvaPluginVizConfig` with each column ID replaced by its `QueryResult`
 * column name, the form a renderer and an Explorer URL hold.
 */
export type UiPluginVizConfig = Readonly<{
  vizType: "plugin";
  pluginId: string;
  pluginVizId: string;

  /** `QueryResult` column name per column picker setting key. */
  columnSettings: Readonly<Record<string, string | undefined>>;
  settings: Readonly<Record<string, PluginVizSettingValue | undefined>>;
}>;

/**
 * The parts of a manifest setting the viz model reads. Structural, so
 * `shared/` never imports the manifest package.
 */
export type PluginVizSettingShape = Readonly<{
  key: string;
  required: boolean;
  default?: PluginVizSettingValue;
  control: Readonly<{ kind: string; dataType?: PluginVizColumnPickerDataType }>;
}>;
