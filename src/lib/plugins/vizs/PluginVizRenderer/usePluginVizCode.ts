import { useQuery } from "@avandar/query-hooks";
import { useEffect, useMemo } from "react";
import { PluginModuleCache } from "@/lib/plugins/makePluginModuleCache/makePluginModuleCache";
import { loadPluginVizRuntime } from "@/lib/plugins/vizs/loadPluginVizRuntime/loadPluginVizRuntime";
import { Logger } from "@/utils/Logger";
import type {
  PluginCodeModule,
  PluginIndexEntry,
} from "@/lib/plugins/PluginIndex.types";
import type { PluginVizRuntimeApi } from "@/lib/plugins/vizs/loadPluginVizRuntime/loadPluginVizRuntime";
import type { PluginMessages, PluginVizDefinition } from "@avandar/plugin-sdk";
import type { UseQueryResultTuple } from "@avandar/query-hooks";

/**
 * Where loading a plugin chart's code stands, for `PluginVizCodeLoader` to
 * branch on.
 *
 * - `loading`: the runtime or the plugin's code chunk is downloading.
 * - `failed`: a chunk failed to load. `retry` loads both again.
 * - `ready`: carries the runtime, the plugin's messages, and the chart's
 *   definition, which is undefined when the code declares no usable chart
 *   under the chart type's id.
 */
export type PluginVizCodeLookup =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "failed"; retry: () => void }>
  | Readonly<{
      status: "ready";
      runtime: PluginVizRuntimeApi;
      messages: PluginMessages;
      definition: PluginVizDefinition | undefined;
    }>;

type LoadedPluginVizCode = Readonly<{
  runtime: PluginVizRuntimeApi;
  codeModule: PluginCodeModule;
}>;

const LOADING: PluginVizCodeLookup = { status: "loading" };

async function _loadPluginVizCode(
  entry: PluginIndexEntry,
): Promise<LoadedPluginVizCode> {
  const [runtime, codeModule] = await Promise.all([
    loadPluginVizRuntime(),
    PluginModuleCache.loadCode(entry),
  ]);
  return { runtime, codeModule };
}

function _getLookupFromLoadedCode(options: {
  loadedCode: LoadedPluginVizCode;
  vizId: string;
}): PluginVizCodeLookup {
  const { loadedCode, vizId } = options;
  const { runtime, codeModule } = loadedCode;
  return {
    status: "ready",
    runtime,
    messages: codeModule.messages,
    definition: runtime.getPluginVizDefinitionFromCodeModule({
      codeModule,
      vizId,
    }),
  };
}

function useLoadedPluginVizCode(
  entry: PluginIndexEntry,
): UseQueryResultTuple<LoadedPluginVizCode> {
  return useQuery({
    // The plugin id identifies the entry. Its other fields are the chunk
    // loaders, which do not change what the query loads.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ["plugins", "vizCode", entry.id],
    queryFn: () => {
      return _loadPluginVizCode(entry);
    },
    // Never written to disk. The runtime and the code module hold
    // functions, which JSON persistence cannot keep.
    meta: { persist: false },
    // A failed load shows its Retry button at once instead of retrying out
    // of sight first.
    retry: false,
    staleTime: Infinity,
    // Modules of functions give structural sharing nothing to reuse.
    structuralSharing: false,
  });
}

/**
 * Loads the plugin chart runtime and a plugin's code, each at most once per
 * session, and finds the chart definition the code declares under `vizId`.
 * Lets `PluginVizCodeLoader` draw a stored plugin chart without the plugin
 * host. Both loaders forget a failed attempt, so `retry` loads again. A
 * missing definition is logged with the plugin and chart ids.
 */
export function usePluginVizCode(options: {
  entry: PluginIndexEntry;
  vizId: string;
}): PluginVizCodeLookup {
  const { entry, vizId } = options;
  const [loadedCode, _isLoading, { isError, isFetching, refetch }] =
    useLoadedPluginVizCode(entry);
  const lookup = useMemo((): PluginVizCodeLookup => {
    if (loadedCode !== undefined) {
      return _getLookupFromLoadedCode({ loadedCode, vizId });
    }
    if (isError && !isFetching) {
      return {
        status: "failed",
        retry: () => {
          void refetch();
        },
      };
    }
    return LOADING;
  }, [loadedCode, vizId, isError, isFetching, refetch]);
  const isDefinitionMissing =
    lookup.status === "ready" && lookup.definition === undefined;

  useEffect(
    function logMissingDefinition() {
      if (isDefinitionMissing) {
        Logger.error("Plugin code declares no such chart", {
          pluginId: entry.id,
          pluginVizId: vizId,
        });
      }
    },
    [isDefinitionMissing, entry.id, vizId],
  );

  return lookup;
}
