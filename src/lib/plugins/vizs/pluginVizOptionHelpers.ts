/**
 * Which plugin chart type a chart uses: the plugin that bundles it and the
 * chart type's id in that plugin's manifest. Pickers and chart state use it to
 * name a plugin chart type without holding its manifest.
 */
export type PluginVizSelection = Readonly<{
  pluginId: string;
  pluginVizId: string;
}>;

const OPTION_VALUE_PREFIX = "plugin:";

/**
 * Makes the key that names a plugin chart type in plugin-keyed records, such
 * as a memory of each plugin chart's last settings. The key is
 * `<pluginId>/<pluginVizId>`.
 */
export function makePluginVizMemoryKey(selection: PluginVizSelection): string {
  return `${selection.pluginId}/${selection.pluginVizId}`;
}

/**
 * Makes the value a chart type picker stores for a plugin chart type, such as
 * `plugin:avandar.epidemiology/epicurve`, so plugin options can sit next to
 * the built-in viz types in one select.
 */
export function makePluginVizOptionValue(
  selection: PluginVizSelection,
): string {
  return `${OPTION_VALUE_PREFIX}${makePluginVizMemoryKey(selection)}`;
}

/**
 * Gets the plugin chart type a picker value names. Returns undefined for a
 * built-in viz type value, such as `bar`, and for a malformed plugin value.
 * Plugin ids and chart type ids never contain a slash, so a value with more
 * than one is malformed.
 */
export function getPluginVizSelectionFromOptionValue(
  value: string,
): PluginVizSelection | undefined {
  if (!value.startsWith(OPTION_VALUE_PREFIX)) {
    return undefined;
  }
  const parts = value.slice(OPTION_VALUE_PREFIX.length).split("/");
  const [pluginId = "", pluginVizId = ""] = parts;
  if (parts.length !== 2 || pluginId === "" || pluginVizId === "") {
    return undefined;
  }
  return { pluginId, pluginVizId };
}
