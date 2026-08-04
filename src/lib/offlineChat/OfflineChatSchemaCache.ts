import type { OfflineChatSchema } from "./offlineChat.types";

const CACHE_KEY_PREFIX = "avandar.offlineChat.schemaCache.";

function _buildCacheKey(workspaceId: string): string {
  return `${CACHE_KEY_PREFIX}${workspaceId}`;
}

function _read(workspaceId: string): OfflineChatSchema | undefined {
  try {
    const raw = window.sessionStorage.getItem(_buildCacheKey(workspaceId));
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

function _write(workspaceId: string, schema: OfflineChatSchema): void {
  try {
    window.sessionStorage.setItem(
      _buildCacheKey(workspaceId),
      JSON.stringify(schema),
    );
  } catch {
    // sessionStorage full: offline chat proceeds with empty schema.
  }
}

/** Session-scoped cache for offline chat schema metadata. */
export const OfflineChatSchemaCache = {
  read: _read,
  write: _write,
};
