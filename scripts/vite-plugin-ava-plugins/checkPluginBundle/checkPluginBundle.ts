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
  moduleLengths: Readonly<Record<string, number>>;
}>;

/** Rendered bytes the plugin host may add to statically loaded chunks. */
export const HOST_BUDGET_BYTES = 24_000;

/** Rendered bytes each bundled plugin may add to statically loaded chunks. */
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

function _getStaticallyReachableChunks(
  chunks: readonly ChunkSummary[],
): ChunkSummary[] {
  const chunksByFileName = new Map(
    chunks.map((chunk) => {
      return [chunk.fileName, chunk] as const;
    }),
  );
  const visited = new Set<string>();
  const pending = chunks
    .filter((chunk) => {
      return chunk.isEntry;
    })
    .map((chunk) => {
      return chunk.fileName;
    });
  while (pending.length > 0) {
    const fileName = pending.pop();
    if (fileName === undefined || visited.has(fileName)) {
      continue;
    }
    visited.add(fileName);
    pending.push(...(chunksByFileName.get(fileName)?.imports ?? []));
  }
  return chunks.filter((chunk) => {
    return visited.has(chunk.fileName);
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
        moduleLengths,
      },
    ];
  });
}

/**
 * Checks that workspaces without plugins pay nothing for them: no plugin
 * code, manifest, or locale module may be statically reachable from an entry
 * chunk, and the plugin host must stay within its byte budget. Returns one
 * message per violation.
 *
 * `pluginsDirectory` must be a real, forward-slash absolute path without a
 * trailing slash, because Vite module ids are realpathed.
 * `vitePluginAvaPlugins`'s `generateBundle` hook is the caller and builds it.
 */
export function checkPluginBundle(options: {
  chunks: readonly ChunkSummary[];
  pluginsDirectory: string;
  pluginCount: number;
}): string[] {
  const { chunks, pluginsDirectory, pluginCount } = options;
  const violations: string[] = [];
  let hostBytes = 0;
  _getStaticallyReachableChunks(chunks).forEach((chunk) => {
    Object.entries(chunk.moduleLengths).forEach(([moduleId, length]) => {
      if (_isLazyPluginModule(moduleId, pluginsDirectory)) {
        const displayId = _makeDisplayIdFromModuleId({
          moduleId,
          pluginsDirectory,
        });
        violations.push(
          `${displayId} is statically reachable from ${chunk.fileName}. Plugin code must load only through loadManifest() and loadCode().`,
        );
      }
      if (_isHostModule(moduleId)) {
        hostBytes += length;
      }
    });
  });
  const budgetBytes = HOST_BUDGET_BYTES + PER_PLUGIN_BUDGET_BYTES * pluginCount;
  if (hostBytes > budgetBytes) {
    violations.push(
      `The plugin host adds ${hostBytes} bytes to statically loaded chunks, over its ${budgetBytes} byte budget.`,
    );
  }
  return violations;
}
