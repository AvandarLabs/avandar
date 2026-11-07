import { relative, sep } from "node:path";
import { makeTablerComponentNameFromIconName } from "@avandar/plugin-manifest";
import {
  PLUGIN_LOCALES_MODULE_PREFIX,
  PLUGIN_MANIFEST_MODULE_PREFIX,
} from "../pluginModuleIds";
import type { PluginDirectory } from "@avandar/plugin-manifest/node";

function _makeRootRelativePathFromPath(options: {
  path: string;
  repoRoot: string;
}): string {
  return `/${relative(options.repoRoot, options.path).split(sep).join("/")}`;
}

function _makeIndexEntrySourceFromPlugin(options: {
  plugin: PluginDirectory;
  repoRoot: string;
}): string {
  const { plugin, repoRoot } = options;
  const pluginId = plugin.compiled.manifest.id;
  const entryPath = _makeRootRelativePathFromPath({
    path: plugin.entryPath,
    repoRoot,
  });
  const manifestModuleId = `${PLUGIN_MANIFEST_MODULE_PREFIX}${pluginId}`;
  const localesModuleId = `${PLUGIN_LOCALES_MODULE_PREFIX}${pluginId}`;
  return [
    "  {",
    `    id: ${JSON.stringify(pluginId)},`,
    `    loadManifest: () => import(${JSON.stringify(manifestModuleId)}),`,
    "    loadCode: async () => {",
    "      const [code, locales] = await Promise.all([",
    `        import(${JSON.stringify(entryPath)}),`,
    `        import(${JSON.stringify(localesModuleId)}),`,
    "      ]);",
    "      return { definition: code.default, messages: locales.default };",
    "    },",
    "  },",
  ].join("\n");
}

function _getDistinctIconNamesFromPlugin(plugin: PluginDirectory): string[] {
  const { manifest } = plugin.compiled;
  return [
    ...new Set([
      manifest.icon,
      ...manifest.contributes.commands.map((command) => {
        return command.icon;
      }),
    ]),
  ];
}

/**
 * Source for `virtual:ava-plugin-index`: one entry per bundled plugin with
 * lazy `loadManifest` and `loadCode` loaders. It must contain no static
 * imports, so the main bundle carries only these few bytes per plugin.
 */
export function makeIndexModuleSourceFromPlugins(options: {
  plugins: readonly PluginDirectory[];
  repoRoot: string;
}): string {
  const { plugins, repoRoot } = options;
  const entries = plugins.map((plugin) => {
    return _makeIndexEntrySourceFromPlugin({ plugin, repoRoot });
  });
  return `export const PLUGIN_INDEX = [\n${entries.join("\n")}\n];\n`;
}

/**
 * Source for `virtual:ava-plugin-manifest/<id>`: the compiled manifest, the
 * strings it references, and the Tabler icon components it names.
 */
export function makeManifestModuleSourceFromPlugin(
  plugin: PluginDirectory,
): string {
  const { manifest, strings } = plugin.compiled;
  const iconNames = _getDistinctIconNamesFromPlugin(plugin);
  const componentNames = iconNames.map((iconName) => {
    return makeTablerComponentNameFromIconName(iconName);
  });
  const iconEntries = iconNames.map((iconName) => {
    const componentName = makeTablerComponentNameFromIconName(iconName);
    return `${JSON.stringify(iconName)}: ${componentName}`;
  });
  return [
    `import { ${componentNames.join(", ")} } from "@tabler/icons-react";`,
    `export const manifest = ${JSON.stringify(manifest)};`,
    `export const strings = ${JSON.stringify(strings)};`,
    `export const icons = { ${iconEntries.join(", ")} };`,
    "",
  ].join("\n");
}

/** Source for `virtual:ava-plugin-locales/<id>`: every locale file. */
export function makeLocalesModuleSourceFromPlugin(
  plugin: PluginDirectory,
): string {
  return `export default ${JSON.stringify(plugin.locales)};\n`;
}
