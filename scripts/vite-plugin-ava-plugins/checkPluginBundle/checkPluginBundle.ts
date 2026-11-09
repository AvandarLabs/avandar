import { relative } from "node:path";
import {
  PLUGIN_INDEX_MODULE_ID,
  PLUGIN_LOCALES_MODULE_PREFIX,
  PLUGIN_MANIFEST_MODULE_PREFIX,
} from "../pluginModuleIds";
import type { Rollup } from "vite";

/** The parts of a Rollup output chunk the bundle check reads. */
export type ChunkSummary = Readonly<{
  fileName: string;
  isEntry: boolean;
  imports: readonly string[];
  dynamicImports: readonly string[];
  moduleLengths: Readonly<Record<string, number>>;
}>;

/**
 * Rendered bytes of host code a workspace without plugins may load. Measured
 * at 36,053 bytes with plugin charts drawing in the Data Explorer and on
 * dashboards, rounded up to the next 1,000 bytes, plus 2,000 of headroom.
 */
export const HOST_BUDGET_BYTES = 39_000;

/** Rendered bytes each bundled plugin adds to `HOST_BUDGET_BYTES`. */
export const PER_PLUGIN_BUDGET_BYTES = 600;

/**
 * Module id fragments that mark plugin host code: the host itself, the
 * manifest package it reads, the SDK it imports for the API factory, and the
 * virtual plugin index.
 */
const HOST_MODULE_MARKERS = [
  "/src/lib/plugins/",
  "/packages/shared/plugin-manifest/",
  "/packages/web/plugin-sdk/",
  `\0${PLUGIN_INDEX_MODULE_ID}`,
];

/**
 * The modules the lazily loaded plugin runtimes are found by: the command
 * runner, which loads when a user picks a command, and the plugin chart
 * runtime, which loads when a plugin chart draws. The app reaches each only
 * through a dynamic `import()`.
 */
const LAZY_RUNTIME_MODULE_MARKERS = [
  "/src/lib/plugins/runPluginCommand/runPluginCommand.ts",
  "/src/lib/plugins/vizs/PluginVizRuntime/PluginVizRuntime.tsx",
];

/**
 * The chunks of a bundle by file name, plus the chunks the check starts its
 * walks from: the entries, the chunk holding the plugin index, and the
 * chunks holding the lazy runtimes.
 */
type ChunkGraph = Readonly<{
  chunksByFileName: ReadonlyMap<string, ChunkSummary>;
  entryFileNames: readonly string[];
  indexChunk: ChunkSummary | undefined;
  lazyRuntimeFileNames: ReadonlySet<string>;
}>;

function _findChunkWithModule(options: {
  chunks: readonly ChunkSummary[];
  isModule: (moduleId: string) => boolean;
}): ChunkSummary | undefined {
  return options.chunks.find((chunk) => {
    return Object.keys(chunk.moduleLengths).some(options.isModule);
  });
}

function _getLazyRuntimeFileNames(
  chunks: readonly ChunkSummary[],
): Set<string> {
  return new Set(
    LAZY_RUNTIME_MODULE_MARKERS.flatMap((marker) => {
      const chunk = _findChunkWithModule({
        chunks,
        isModule: (moduleId) => {
          return moduleId.endsWith(marker);
        },
      });
      return chunk === undefined ? [] : [chunk.fileName];
    }),
  );
}

function _makeChunkGraphFromChunks(
  chunks: readonly ChunkSummary[],
): ChunkGraph {
  return {
    chunksByFileName: new Map(
      chunks.map((chunk) => {
        return [chunk.fileName, chunk] as const;
      }),
    ),
    entryFileNames: chunks
      .filter((chunk) => {
        return chunk.isEntry;
      })
      .map((chunk) => {
        return chunk.fileName;
      }),
    indexChunk: _findChunkWithModule({
      chunks,
      isModule: (moduleId) => {
        return moduleId === `\0${PLUGIN_INDEX_MODULE_ID}`;
      },
    }),
    lazyRuntimeFileNames: _getLazyRuntimeFileNames(chunks),
  };
}

function _getReachableFileNames(options: {
  graph: ChunkGraph;
  startFileNames: readonly string[];
  getEdges: (chunk: ChunkSummary) => readonly string[];
}): Set<string> {
  const { graph, startFileNames, getEdges } = options;
  const reachable = new Set<string>();
  const visit = (fileName: string): void => {
    const chunk = graph.chunksByFileName.get(fileName);
    if (chunk === undefined || reachable.has(fileName)) {
      return;
    }
    reachable.add(fileName);
    getEdges(chunk).forEach(visit);
  };
  startFileNames.forEach(visit);
  return reachable;
}

/**
 * The imports the app follows from a chunk without running a plugin loader:
 * all of them except the dynamic imports of the plugin index's chunk, and
 * except dynamic imports of `skippedFileNames` when given.
 */
function _getHostEdges(options: {
  chunk: ChunkSummary;
  graph: ChunkGraph;
  skippedFileNames?: ReadonlySet<string>;
}): readonly string[] {
  const { chunk, graph, skippedFileNames } = options;
  if (chunk === graph.indexChunk) {
    return chunk.imports;
  }
  return [
    ...chunk.imports,
    ...chunk.dynamicImports.filter((fileName) => {
      return !skippedFileNames?.has(fileName);
    }),
  ];
}

function _getFileNamesNotIn(options: {
  fileNames: ReadonlySet<string>;
  excludedFileNames: ReadonlySet<string>;
}): Set<string> {
  return new Set(
    [...options.fileNames].filter((fileName) => {
      return !options.excludedFileNames.has(fileName);
    }),
  );
}

/**
 * Plugin-only chunks: those reachable from the plugin loaders (the dynamic
 * imports of the chunk holding the plugin index), through static or dynamic
 * imports, that the app cannot reach from an entry through `_getHostEdges`.
 * The app loads them only after a plugin loader runs.
 */
function _getPluginOnlyFileNames(graph: ChunkGraph): Set<string> {
  // Rollup can merge the index into a chunk shared with other modules. Every
  // dynamic import of that chunk then counts as a plugin loader.
  return _getFileNamesNotIn({
    fileNames: _getReachableFileNames({
      graph,
      startFileNames: graph.indexChunk?.dynamicImports ?? [],
      getEdges: (chunk) => {
        return [...chunk.imports, ...chunk.dynamicImports];
      },
    }),
    excludedFileNames: _getReachableFileNames({
      graph,
      startFileNames: graph.entryFileNames,
      getEdges: (chunk) => {
        return _getHostEdges({ chunk, graph });
      },
    }),
  });
}

/**
 * Lazy-runtime-only chunks: those reachable from a lazy runtime's chunk that
 * the app cannot reach from an entry without dynamically importing one of
 * those chunks. A runtime chunk that any reachable chunk imports statically
 * is not lazy, so it and the chunks it reaches count.
 */
function _getLazyRuntimeOnlyFileNames(graph: ChunkGraph): Set<string> {
  return _getFileNamesNotIn({
    fileNames: _getReachableFileNames({
      graph,
      startFileNames: [...graph.lazyRuntimeFileNames],
      getEdges: (chunk) => {
        return _getHostEdges({ chunk, graph });
      },
    }),
    excludedFileNames: _getReachableFileNames({
      graph,
      startFileNames: graph.entryFileNames,
      getEdges: (chunk) => {
        return _getHostEdges({
          chunk,
          graph,
          skippedFileNames: graph.lazyRuntimeFileNames,
        });
      },
    }),
  });
}

function _isLazyPluginModule(
  moduleId: string,
  pluginsDirectory: string,
): boolean {
  return (
    moduleId.startsWith(`${pluginsDirectory}/`) ||
    moduleId.startsWith(`\0${PLUGIN_MANIFEST_MODULE_PREFIX}`) ||
    moduleId.startsWith(`\0${PLUGIN_LOCALES_MODULE_PREFIX}`)
  );
}

function _isHostModule(moduleId: string): boolean {
  return HOST_MODULE_MARKERS.some((marker) => {
    return moduleId.includes(marker);
  });
}

function _makeDisplayIdFromModuleId(options: {
  moduleId: string;
  pluginsDirectory: string;
}): string {
  const { moduleId, pluginsDirectory } = options;
  if (moduleId.startsWith("\0")) {
    return moduleId.slice(1);
  }
  return `plugins/${relative(pluginsDirectory, moduleId)}`;
}

function _getHostBytesFromChunks(chunks: readonly ChunkSummary[]): number {
  return chunks
    .flatMap((chunk) => {
      return Object.entries(chunk.moduleLengths);
    })
    .reduce((totalBytes, [moduleId, length]) => {
      return _isHostModule(moduleId) ? totalBytes + length : totalBytes;
    }, 0);
}

/** Summarizes a Rollup bundle for `checkPluginBundle`. */
export function makeChunkSummariesFromBundle(
  bundle: Rollup.OutputBundle,
): ChunkSummary[] {
  return Object.values(bundle).flatMap((output) => {
    if (output.type !== "chunk") {
      return [];
    }
    const moduleLengths = Object.fromEntries(
      Object.entries(output.modules).map(([moduleId, info]) => {
        return [moduleId, info.renderedLength];
      }),
    );
    return [
      {
        fileName: output.fileName,
        isEntry: output.isEntry,
        imports: output.imports,
        dynamicImports: output.dynamicImports,
        moduleLengths,
      },
    ];
  });
}

/**
 * Checks that workspaces without plugins pay nothing for them. Every plugin
 * code, manifest, or locale module must sit in a plugin-only chunk: one the
 * app loads only through a plugin loader in `virtual:ava-plugin-index`. The
 * host modules in every other chunk, except those only a lazily loaded
 * runtime (the command runner or the plugin chart runtime) reaches, must
 * stay within the host's byte budget. Returns one message per violation, for
 * `vitePluginAvaPlugins` to fail the build.
 *
 * `pluginsDirectory` must be a real, forward-slash absolute path without a
 * trailing slash, because Vite module ids are realpathed.
 */
export function checkPluginBundle(options: {
  chunks: readonly ChunkSummary[];
  pluginsDirectory: string;
  pluginCount: number;
}): string[] {
  const { chunks, pluginsDirectory, pluginCount } = options;
  const graph = _makeChunkGraphFromChunks(chunks);
  const pluginOnlyFileNames = _getPluginOnlyFileNames(graph);
  const lazyRuntimeOnlyFileNames = _getLazyRuntimeOnlyFileNames(graph);
  const appChunks = chunks.filter((chunk) => {
    return !pluginOnlyFileNames.has(chunk.fileName);
  });
  const pluginViolations = appChunks.flatMap((chunk) => {
    return Object.keys(chunk.moduleLengths)
      .filter((moduleId) => {
        return _isLazyPluginModule(moduleId, pluginsDirectory);
      })
      .map((moduleId) => {
        const displayId = _makeDisplayIdFromModuleId({
          moduleId,
          pluginsDirectory,
        });
        return `${displayId} is in ${chunk.fileName}, which the app can load without any plugin. Plugin code must load only through loadManifest() and loadCode().`;
      });
  });
  const hostBytes = _getHostBytesFromChunks(
    appChunks.filter((chunk) => {
      return !lazyRuntimeOnlyFileNames.has(chunk.fileName);
    }),
  );
  const budgetBytes = HOST_BUDGET_BYTES + PER_PLUGIN_BUDGET_BYTES * pluginCount;
  return hostBytes > budgetBytes
    ? [
        ...pluginViolations,
        `The plugin host adds ${hostBytes} bytes to chunks the app can load without any plugin, over its ${budgetBytes} byte budget.`,
      ]
    : pluginViolations;
}
