import type {
  PluginManifest,
  PluginVizType,
} from "@avandar/plugin-manifest/runtime";

/**
 * Gets the chart type a plugin's manifest declares under `pluginVizId`, for
 * example to read its title and settings before drawing a stored plugin
 * chart. Returns undefined when the manifest declares no chart type with that
 * id.
 */
export function getPluginVizTypeFromManifest(options: {
  manifest: PluginManifest;
  pluginVizId: string;
}): PluginVizType | undefined {
  const { manifest, pluginVizId } = options;
  return manifest.contributes.vizTypes.find((vizType) => {
    return vizType.id === pluginVizId;
  });
}
