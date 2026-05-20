import type { OfflineChatSchema } from "./offlineChat.types";

const CACHE_KEY_PREFIX = "avandar.offlineChat.schemaCache.";

function cacheKey(workspaceId: string): string {
  return `${CACHE_KEY_PREFIX}${workspaceId}`;
}

export function readCachedOfflineChatSchema(
  workspaceId: string,
): OfflineChatSchema | undefined {
  try {
    const raw = window.sessionStorage.getItem(cacheKey(workspaceId));
    if (!raw) {
      return undefined;
    }
    const parsed = JSON.parse(raw) as OfflineChatSchema;
    if (!Array.isArray(parsed.datasets) || !Array.isArray(parsed.columns)) {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

export function writeCachedOfflineChatSchema(
  workspaceId: string,
  schema: OfflineChatSchema,
): void {
  try {
    window.sessionStorage.setItem(
      cacheKey(workspaceId),
      JSON.stringify(schema),
    );
  } catch {
    // sessionStorage full: offline chat proceeds with empty schema.
  }
}
