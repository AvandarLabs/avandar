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

/** Rendered bytes of host code a workspace without plugins may load. */
export const HOST_BUDGET_BYTES = 24_000;

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

/** The module the command runner chunk is found by. */
const RUNNER_MODULE_SUFFIX =
  "/src/lib/plugins/runPluginCommand/runPluginCommand.ts";

/**
 * The chunks of a bundle by file name, plus the chunks the check starts its
 * walks from: the entries, the chunk holding the plugin index, and the chunk
 * holding the command runner.
 */
type ChunkGraph = Readonly<{
  chunksByFileName: ReadonlyMap<string, ChunkSummary>;
  entryFileNames: readonly string[];
  indexChunk: ChunkSummary | undefined;
  runnerChunk: ChunkSummary | undefined;
}>;

function _findChunkWithModule(options: {
  chunks: readonly ChunkSummary[];
  isModule: (moduleId: string) => boolean;
}): ChunkSummary | undefined {
  return options.chunks.find((chunk) => {
    return Object.keys(chunk.moduleLengths).some(options.isModule);
  });
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
    runnerChunk: _findChunkWithModule({
      chunks,
      isModule: (moduleId) => {
        return moduleId.endsWith(RUNNER_MODULE_SUFFIX);
      },
    }),
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
 * except a dynamic import of `skippedFileName` when one is given.
 */
function _getHostEdges(options: {
  chunk: ChunkSummary;
  graph: ChunkGraph;
  skippedFileName?: string;
}): readonly string[] {
  const { chunk, graph, skippedFileName } = options;
  if (chunk === graph.indexChunk) {
    return chunk.imports;
  }
  return [
    ...chunk.imports,
    ...chunk.dynamicImports.filter((fileName) => {
      return fileName !== skippedFileName;
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
 * Runner-only chunks: those reachable from the command runner's chunk that
 * the app cannot reach from an entry without dynamically importing that
 * chunk. A runner chunk that any reachable chunk imports statically is not
 * lazy, so then there are none.
 */
function _getRunnerOnlyFileNames(graph: ChunkGraph): Set<string> {
  const runnerFileName = graph.runnerChunk?.fileName;
  return _getFileNamesNotIn({
    fileNames: _getReachableFileNames({
      graph,
      startFileNames: runnerFileName === undefined ? [] : [runnerFileName],
      getEdges: (chunk) => {
        return _getHostEdges({ chunk, graph });
      },
    }),
    excludedFileNames: _getReachableFileNames({
      graph,
      startFileNames: graph.entryFileNames,
      getEdges: (chunk) => {
        return _getHostEdges({ chunk, graph, skippedFileName: runnerFileName });
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
 * host modules in every other chunk, except those only the lazily loaded
 * command runner reaches, must stay within the host's byte budget. Returns
 * one message per violation, for `vitePluginAvaPlugins` to fail the build.
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
  const runnerOnlyFileNames = _getRunnerOnlyFileNames(graph);
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
      return !runnerOnlyFileNames.has(chunk.fileName);
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
