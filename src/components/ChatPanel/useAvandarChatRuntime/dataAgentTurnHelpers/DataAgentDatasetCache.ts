import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";

const CACHE_KEY_PREFIX = "avandar.dataAgent.datasets.";

function _buildCacheKey(workspaceId: string): string {
  return `${CACHE_KEY_PREFIX}${workspaceId}`;
}

function _isDataset(value: unknown): value is DataAgentDataset {
  const candidate = value as Partial<DataAgentDataset> | null;
  return (
    typeof candidate?.id === "string" &&
    typeof candidate.name === "string" &&
    Array.isArray(candidate.columns)
  );
}

function _read(workspaceId: string): DataAgentDataset[] | undefined {
  try {
    const raw = window.sessionStorage.getItem(_buildCacheKey(workspaceId));
    const parsed: unknown = raw ? JSON.parse(raw) : undefined;
    return Array.isArray(parsed) && parsed.every(_isDataset)
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
}

function _write(
  workspaceId: string,
  datasets: readonly DataAgentDataset[],
): void {
  try {
    window.sessionStorage.setItem(
      _buildCacheKey(workspaceId),
      JSON.stringify(datasets),
    );
  } catch {
    // Storage full or disabled: offline answers need a connection to start.
  }
}

/**
 * The workspace's datasets and columns as the data agent last loaded them,
 * kept for this browser tab so the offline agent can answer after the
 * connection drops. Same lifetime as the offline chat's schema cache.
 */
export const DataAgentDatasetCache = {
  read: _read,
  write: _write,
};
