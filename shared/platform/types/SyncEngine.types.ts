/**
 * Platform-agnostic sync engine surface.
 *
 * On web (Phase 1) this is a no-op stub — web behavior is unchanged.
 * On desktop (Phase 3) this is the real outbox-based engine running in Bun
 * main.
 */
export interface SyncEngine {
  enqueue(mutation: SyncMutation): Promise<void>;
  status(): SyncStatus;
  forceSync(): Promise<void>;
  onStatusChange(callback: (status: SyncStatus) => void): Unsubscribe;
}

/**
 * One pending row-level mutation queued in the desktop outbox.
 */
export type SyncMutation = {
  tableName: string;
  rowId: string;
  op: "insert" | "update" | "delete";
  payload: Readonly<Record<string, unknown>>;
};

/**
 * Snapshot of sync state surfaced to UI. Discriminated by `kind`:
 *   - `offline`: no network, nothing in-flight
 *   - `online`: network is up; `state` says whether we're catching up
 *   - `error`: last sync attempt threw; pending counts are still tracked
 */
export type SyncStatus =
  | { kind: "offline" }
  | {
      kind: "online";
      state: "idle" | "syncing";
      lastSyncedAt: number;
      pendingRows: number;
      pendingParquets: number;
      bytesUploading?: number;
    }
  | {
      kind: "error";
      lastError: string;
      pendingRows: number;
      pendingParquets: number;
    };

/**
 * Cancels an event subscription registered via `onStatusChange`.
 */
export type Unsubscribe = () => void;
