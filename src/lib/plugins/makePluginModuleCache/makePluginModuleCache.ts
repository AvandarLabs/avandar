import type {
  PluginCodeModule,
  PluginIndexEntry,
  PluginManifestModule,
} from "@/lib/plugins/PluginIndex.types";

type PluginModuleCacheApi = Readonly<{
  loadManifest: (entry: PluginIndexEntry) => Promise<PluginManifestModule>;
  loadCode: (entry: PluginIndexEntry) => Promise<PluginCodeModule>;
}>;

function _loadOnce<T>(options: {
  cache: Map<string, Promise<T>>;
  key: string;
  load: () => Promise<T>;
}): Promise<T> {
  const { cache, key, load } = options;
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const pending = load().catch((error: unknown) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, pending);
  return pending;
}

/**
 * Makes a cache that loads each plugin's manifest and code chunks at most once
 * per session, such as the app-wide `PluginModuleCache`. A failed load is
 * forgotten so the next attempt retries the network.
 */
export function makePluginModuleCache(): PluginModuleCacheApi {
  const manifests = new Map<string, Promise<PluginManifestModule>>();
  const codeModules = new Map<string, Promise<PluginCodeModule>>();
  return {
    loadManifest: (entry) => {
      return _loadOnce({
        cache: manifests,
        key: entry.id,
        load: entry.loadManifest,
      });
    },
    loadCode: (entry) => {
      return _loadOnce({
        cache: codeModules,
        key: entry.id,
        load: entry.loadCode,
      });
    },
  };
}

/**
 * The app-wide plugin module cache. Use it to load a bundled plugin's manifest
 * or code so each chunk is fetched once however many views ask for it.
 */
export const PluginModuleCache = makePluginModuleCache();
