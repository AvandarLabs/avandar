import { existsSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { readBundledPlugins } from "@avandar/plugin-manifest/node";
import { normalizePath } from "vite";
import {
  checkPluginBundle,
  makeChunkSummariesFromBundle,
} from "./checkPluginBundle/checkPluginBundle";
import { makeOptimizeDepsEntriesFromPlugins } from "./makeOptimizeDepsEntries/makeOptimizeDepsEntries";
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
import type { Plugin, Rollup, ViteDevServer } from "vite";

/** Rollup marks a module as virtual by prefixing its resolved id with this. */
const VIRTUAL_PREFIX = "\0";

function _isPluginVirtualId(id: string): boolean {
  return (
    id === PLUGIN_INDEX_MODULE_ID ||
    id.startsWith(PLUGIN_MANIFEST_MODULE_PREFIX) ||
    id.startsWith(PLUGIN_LOCALES_MODULE_PREFIX)
  );
}

/**
 * True for the files that define the bundled plugins and only for those under
 * `<pluginsDirectory>`: `bundled.yaml`, `<plugin>/ava.yaml`, and
 * `<plugin>/locales/<locale>.json`. An `ava.yaml` anywhere else in the repo is
 * not a plugin manifest. Both arguments must already be normalized, and
 * `pluginsDirectory` must end with a slash.
 */
function _isPluginSourceFile(options: {
  file: string;
  pluginsDirectory: string;
}): boolean {
  const { file, pluginsDirectory } = options;
  if (!file.startsWith(pluginsDirectory)) {
    return false;
  }
  const segments = file.slice(pluginsDirectory.length).split("/");
  if (segments.length === 1) {
    return segments[0] === "bundled.yaml";
  }
  if (segments.length === 2) {
    return segments[1] === "ava.yaml";
  }
  const [, folderName, localeFile = ""] = segments;
  return (
    segments.length === 3 &&
    folderName === "locales" &&
    localeFile.endsWith(".json")
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

/** The slice of the Rollup plugin context that reports a fatal error. */
type PluginErrorContext = { error: (message: string) => never };

function _findPluginOrFail(options: {
  pluginId: string;
  plugins: readonly PluginDirectory[];
  context: PluginErrorContext;
}): PluginDirectory {
  const { pluginId, plugins, context } = options;
  const plugin = plugins.find((candidate) => {
    return candidate.compiled.manifest.id === pluginId;
  });
  if (!plugin) {
    return context.error(
      `Unknown plugin id "${pluginId}". It is not listed in plugins/bundled.yaml.`,
    );
  }
  return plugin;
}

/**
 * Builds the source of a plugin virtual module from its resolved id, or
 * returns null when the id is not one of them. A resolved id with a plugin
 * prefix but an unknown plugin id fails the build through `context.error`.
 */
function _loadVirtualModule(options: {
  resolvedId: string;
  plugins: readonly PluginDirectory[];
  repoRoot: string;
  context: PluginErrorContext;
}): string | null {
  const { resolvedId, plugins, repoRoot, context } = options;
  if (!resolvedId.startsWith(VIRTUAL_PREFIX)) {
    return null;
  }
  const id = resolvedId.slice(VIRTUAL_PREFIX.length);
  if (id === PLUGIN_INDEX_MODULE_ID) {
    return makeIndexModuleSourceFromPlugins({ plugins, repoRoot });
  }
  if (id.startsWith(PLUGIN_MANIFEST_MODULE_PREFIX)) {
    const pluginId = id.slice(PLUGIN_MANIFEST_MODULE_PREFIX.length);
    return makeManifestModuleSourceFromPlugin(
      _findPluginOrFail({ pluginId, plugins, context }),
    );
  }
  if (id.startsWith(PLUGIN_LOCALES_MODULE_PREFIX)) {
    const pluginId = id.slice(PLUGIN_LOCALES_MODULE_PREFIX.length);
    return makeLocalesModuleSourceFromPlugin(
      _findPluginOrFail({ pluginId, plugins, context }),
    );
  }
  return null;
}

/** Marks every plugin virtual module in the client graph as stale. */
function _invalidatePluginModules(server: ViteDevServer): void {
  const { moduleGraph } = server.environments.client;
  moduleGraph.idToModuleMap.forEach((module, moduleId) => {
    if (
      moduleId.startsWith(VIRTUAL_PREFIX) &&
      _isPluginVirtualId(moduleId.slice(VIRTUAL_PREFIX.length))
    ) {
      moduleGraph.invalidateModule(module);
    }
  });
}

/**
 * Logs a failed plugin reload and shows it in the browser's error overlay, so
 * an invalid manifest is visible without watching the terminal.
 */
function _reportPluginReloadError(options: {
  server: ViteDevServer;
  error: unknown;
}): void {
  const { server, error } = options;
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? (error.stack ?? message) : message;
  server.config.logger.error(`[ava-plugins] ${message}`);
  server.ws.send({
    type: "error",
    err: { message, stack, plugin: "ava-plugins" },
  });
}

/**
 * Builds the dev watcher callback. Reads the bundled plugins again when a file
 * that defines them is added, removed, or changed, then invalidates the plugin
 * virtual modules and reloads the page. A read that throws keeps the previous
 * plugins and reports the error instead of reloading.
 */
function _createPluginSourceWatchHandler(options: {
  server: ViteDevServer;
  repoRoot: string;
  onPluginsReloaded: (plugins: PluginDirectory[]) => void;
}): (file: string) => void {
  const { server, repoRoot, onPluginsReloaded } = options;
  const pluginsDirectory = `${normalizePath(repoRoot)}/plugins/`;
  return (file) => {
    if (!_isPluginSourceFile({ file: normalizePath(file), pluginsDirectory })) {
      return;
    }
    try {
      onPluginsReloaded(readBundledPlugins(repoRoot));
    } catch (error) {
      _reportPluginReloadError({ server, error });
      return;
    }
    _invalidatePluginModules(server);
    server.ws.send({ type: "full-reload" });
  };
}

/**
 * Registers the plugin source handler for the watcher events that add, remove,
 * or change a file.
 */
function _watchPluginSourceFiles(options: {
  server: ViteDevServer;
  repoRoot: string;
  onPluginsReloaded: (plugins: PluginDirectory[]) => void;
}): void {
  const handlePluginSourceEvent = _createPluginSourceWatchHandler(options);
  (["add", "unlink", "change"] as const).forEach((eventName) => {
    options.server.watcher.on(eventName, handlePluginSourceEvent);
  });
}

/**
 * Fails the build through `context.error` if plugin code reaches a chunk the
 * app can load without any plugin, or the plugin host outgrows its budget.
 */
function _failOnPluginBundleViolations(options: {
  bundle: Rollup.OutputBundle;
  repoRoot: string;
  pluginCount: number;
  context: PluginErrorContext;
}): void {
  const { bundle, repoRoot, pluginCount, context } = options;
  const violations = checkPluginBundle({
    chunks: makeChunkSummariesFromBundle(bundle),
    pluginsDirectory: _makePluginsDirectoryFromRoot(repoRoot),
    pluginCount,
  });
  if (violations.length > 0) {
    context.error(`Plugin bundle check failed:\n${violations.join("\n")}`);
  }
}

/**
 * Bundles the plugins listed in `plugins/bundled.yaml`. Generates
 * `virtual:ava-plugin-index` plus one lazy manifest and locale module per
 * plugin, points Vite's dependency scan at each plugin's entry file so their
 * npm packages are pre-bundled at server start, reloads the dev server when a
 * manifest or locale file is added, removed, or changed, and when
 * `isBundleCheckEnabled` is set fails the build if plugin code reaches a chunk
 * the app can load without any plugin. The repo root is Vite's resolved
 * `root`.
 */
export function vitePluginAvaPlugins(options: {
  isBundleCheckEnabled: boolean;
}): Plugin {
  let repoRoot = process.cwd();
  let plugins: PluginDirectory[] = [];
  return {
    name: "ava-plugins",
    config(userConfig) {
      // Runs before `configResolved`, so the root is worked out the way Vite
      // does it. The bundled plugins are read again in `buildStart`.
      const configRoot = resolve(userConfig.root ?? process.cwd());
      return {
        optimizeDeps: {
          entries: makeOptimizeDepsEntriesFromPlugins({
            plugins: readBundledPlugins(configRoot),
            repoRoot: configRoot,
          }),
        },
      };
    },
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
      return _loadVirtualModule({
        resolvedId: id,
        plugins,
        repoRoot,
        context: this,
      });
    },
    configureServer(server) {
      _watchPluginSourceFiles({
        server,
        repoRoot,
        onPluginsReloaded: (reloadedPlugins) => {
          plugins = reloadedPlugins;
        },
      });
    },
    generateBundle(_outputOptions, bundle) {
      if (options.isBundleCheckEnabled) {
        _failOnPluginBundleViolations({
          bundle,
          repoRoot,
          pluginCount: plugins.length,
          context: this,
        });
      }
    },
  };
}
