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

// What `definePlugin` returns for a plugin that declares nothing, so the host
// accepts the code module of a plugin with no entry like any other.
const EMPTY_DEFINITION_SOURCE =
  '{ kind: "avandar-plugin", commands: {}, vizTypes: {}, aiTools: {} }';

function _makeLoadCodeSourceLinesFromPlugin(options: {
  plugin: PluginDirectory;
  repoRoot: string;
}): string[] {
  const { plugin, repoRoot } = options;
  const localesModuleId = `${PLUGIN_LOCALES_MODULE_PREFIX}${plugin.compiled.manifest.id}`;
  if (plugin.entryPath === undefined) {
    return [
      "    loadCode: async () => {",
      `      const locales = await import(${JSON.stringify(localesModuleId)});`,
      `      return { definition: ${EMPTY_DEFINITION_SOURCE}, messages: locales.default };`,
      "    },",
    ];
  }
  const entryPath = _makeRootRelativePathFromPath({
    path: plugin.entryPath,
    repoRoot,
  });
  return [
    "    loadCode: async () => {",
    "      const [code, locales] = await Promise.all([",
    `        import(${JSON.stringify(entryPath)}),`,
    `        import(${JSON.stringify(localesModuleId)}),`,
    "      ]);",
    "      return { definition: code.default, messages: locales.default };",
    "    },",
  ];
}

function _makeLoadContentUrlsSourceLinesFromPlugin(options: {
  plugin: PluginDirectory;
  repoRoot: string;
}): string[] {
  const { plugin, repoRoot } = options;
  const contentEntries = Object.entries(plugin.contentPathsById);
  if (contentEntries.length === 0) {
    return [];
  }
  // `?url` makes Vite emit each file as an asset and import only its URL, so
  // no content bytes reach a JavaScript chunk.
  const importLines = contentEntries.map(([, path]) => {
    const rootRelativePath = _makeRootRelativePathFromPath({ path, repoRoot });
    return `        import(${JSON.stringify(`${rootRelativePath}?url`)}),`;
  });
  const urlProperties = contentEntries.map(([contentId], index) => {
    return `${JSON.stringify(contentId)}: urls[${index}].default`;
  });
  return [
    "    loadContentUrls: async () => {",
    "      const urls = await Promise.all([",
    ...importLines,
    "      ]);",
    `      return { ${urlProperties.join(", ")} };`,
    "    },",
  ];
}

function _makeIndexEntrySourceFromPlugin(options: {
  plugin: PluginDirectory;
  repoRoot: string;
}): string {
  const pluginId = options.plugin.compiled.manifest.id;
  const manifestModuleId = `${PLUGIN_MANIFEST_MODULE_PREFIX}${pluginId}`;
  return [
    "  {",
    `    id: ${JSON.stringify(pluginId)},`,
    `    loadManifest: () => import(${JSON.stringify(manifestModuleId)}),`,
    ..._makeLoadCodeSourceLinesFromPlugin(options),
    ..._makeLoadContentUrlsSourceLinesFromPlugin(options),
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
      ...manifest.contributes.vizTypes.map((vizType) => {
        return vizType.icon;
      }),
    ]),
  ];
}

type IconBinding = { iconName: string; componentName: string };

function _getIconBindingsFromPlugin(plugin: PluginDirectory): IconBinding[] {
  return _getDistinctIconNamesFromPlugin(plugin).map((iconName) => {
    return {
      iconName,
      componentName: makeTablerComponentNameFromIconName(iconName),
    };
  });
}

/**
 * Source for `virtual:ava-plugin-index`: one entry per bundled plugin with
 * lazy `loadManifest` and `loadCode` loaders. A plugin with no entry gets a
 * `loadCode` that loads only its locales and returns a definition with no
 * handlers, and a plugin with content gets a `loadContentUrls` that resolves
 * each content id to its file's URL. It must contain no static imports, so
 * the main bundle carries only these few bytes per plugin.
 * `vitePluginAvaPlugins`'s `load` hook calls it.
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
 * `vitePluginAvaPlugins`'s `load` hook calls it.
 */
export function makeManifestModuleSourceFromPlugin(
  plugin: PluginDirectory,
): string {
  const { manifest, strings } = plugin.compiled;
  const iconBindings = _getIconBindingsFromPlugin(plugin);
  // Different icon names can map to one component (`number-1` and `number1`),
  // and importing the same binding twice is a syntax error.
  const componentNames = [
    ...new Set(
      iconBindings.map((binding) => {
        return binding.componentName;
      }),
    ),
  ];
  const iconEntries = iconBindings.map((binding) => {
    return `${JSON.stringify(binding.iconName)}: ${binding.componentName}`;
  });
  return [
    `import { ${componentNames.join(", ")} } from "@tabler/icons-react";`,
    `export const manifest = ${JSON.stringify(manifest)};`,
    `export const strings = ${JSON.stringify(strings)};`,
    `export const icons = { ${iconEntries.join(", ")} };`,
    "",
  ].join("\n");
}

/**
 * Source for `virtual:ava-plugin-locales/<id>`: every locale file.
 * `vitePluginAvaPlugins`'s `load` hook calls it.
 */
export function makeLocalesModuleSourceFromPlugin(
  plugin: PluginDirectory,
): string {
  return `export default ${JSON.stringify(plugin.locales)};\n`;
}
