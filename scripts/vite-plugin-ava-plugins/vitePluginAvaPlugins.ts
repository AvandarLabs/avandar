import { existsSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { readBundledPlugins } from "@avandar/plugin-manifest/node";
import { normalizePath } from "vite";
import {
  checkPluginBundle,
  makeChunkSummariesFromBundle,
} from "./checkPluginBundle/checkPluginBundle";
import {
  makeIndexModuleSourceFromPlugins,
  makeLocalesModuleSourceFromPlugin,
  makeManifestModuleSourceFromPlugin,
} from "./makePluginModuleSources/makePluginModuleSources";
import {
  PLUGIN_INDEX_MODULE_ID,
  PLUGIN_LOCALES_MODULE_PREFIX,
  PLUGIN_MANIFEST_MODULE_PREFIX,
} from "./pluginModuleIds";
import type { PluginDirectory } from "@avandar/plugin-manifest/node";
import type { Plugin } from "vite";

/** Rollup marks a module as virtual by prefixing its resolved id with this. */
const VIRTUAL_PREFIX = "\0";

function _isPluginVirtualId(id: string): boolean {
  return (
    id === PLUGIN_INDEX_MODULE_ID ||
    id.startsWith(PLUGIN_MANIFEST_MODULE_PREFIX) ||
    id.startsWith(PLUGIN_LOCALES_MODULE_PREFIX)
  );
}

function _isPluginSourceFile(file: string): boolean {
  return (
    file.endsWith("/ava.yaml") ||
    file.endsWith("/plugins/bundled.yaml") ||
    (file.includes("/plugins/") && file.includes("/locales/"))
  );
}

/**
 * Vite resolves symlinks in module ids, so the directory the bundle check
 * compares them against must be resolved the same way. Falls back to the
 * unresolved path when the folder does not exist, which is a repo without any
 * plugins.
 */
function _makePluginsDirectoryFromRoot(root: string): string {
  const pluginsDirectory = join(root, "plugins");
  return normalizePath(
    existsSync(pluginsDirectory)
      ? realpathSync(pluginsDirectory)
      : pluginsDirectory,
  );
}

function _loadVirtualModule(options: {
  id: string;
  plugins: readonly PluginDirectory[];
  repoRoot: string;
}): string | undefined {
  const { id, plugins, repoRoot } = options;
  if (id === PLUGIN_INDEX_MODULE_ID) {
    return makeIndexModuleSourceFromPlugins({ plugins, repoRoot });
  }
  const findPlugin = (prefix: string) => {
    return plugins.find((plugin) => {
      return `${prefix}${plugin.compiled.manifest.id}` === id;
    });
  };
  const manifestPlugin = findPlugin(PLUGIN_MANIFEST_MODULE_PREFIX);
  if (manifestPlugin) {
    return makeManifestModuleSourceFromPlugin(manifestPlugin);
  }
  const localesPlugin = findPlugin(PLUGIN_LOCALES_MODULE_PREFIX);
  return localesPlugin
    ? makeLocalesModuleSourceFromPlugin(localesPlugin)
    : undefined;
}

/**
 * Bundles the plugins listed in `plugins/bundled.yaml`. Generates
 * `virtual:ava-plugin-index` plus one lazy manifest and locale module per
 * plugin, reloads the dev server when a manifest or locale file changes, and
 * when `isBundleCheckEnabled` is set fails the build if plugin code reaches
 * the main bundle. The repo root is Vite's resolved `root`.
 */
export function vitePluginAvaPlugins(options: {
  isBundleCheckEnabled: boolean;
}): Plugin {
  const { isBundleCheckEnabled } = options;
  let repoRoot = process.cwd();
  let plugins: PluginDirectory[] = [];
  return {
    name: "ava-plugins",
    configResolved(config) {
      repoRoot = config.root;
    },
    buildStart() {
      plugins = readBundledPlugins(repoRoot);
    },
    resolveId(id) {
      return _isPluginVirtualId(id) ? `${VIRTUAL_PREFIX}${id}` : null;
    },
    load(id) {
      if (!id.startsWith(VIRTUAL_PREFIX)) {
        return null;
      }
      return _loadVirtualModule({ id: id.slice(1), plugins, repoRoot }) ?? null;
    },
    configureServer(server) {
      server.watcher.on("change", (file) => {
        if (!_isPluginSourceFile(file)) {
          return;
        }
        try {
          plugins = readBundledPlugins(repoRoot);
        } catch (error) {
          server.config.logger.error(String(error));
          return;
        }
        server.moduleGraph.idToModuleMap.forEach((module, moduleId) => {
          if (moduleId.startsWith(`${VIRTUAL_PREFIX}virtual:ava-plugin`)) {
            server.moduleGraph.invalidateModule(module);
          }
        });
        server.ws.send({ type: "full-reload" });
      });
    },
    generateBundle(_outputOptions, bundle) {
      if (!isBundleCheckEnabled) {
        return;
      }
      const violations = checkPluginBundle({
        chunks: makeChunkSummariesFromBundle(bundle),
        pluginsDirectory: _makePluginsDirectoryFromRoot(repoRoot),
        pluginCount: plugins.length,
      });
      if (violations.length > 0) {
        this.error(`Plugin bundle check failed:\n${violations.join("\n")}`);
      }
    },
  };
}
