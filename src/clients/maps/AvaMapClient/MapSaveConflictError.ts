import type { AvaMap } from "$/models/AvaMap/AvaMap";

/** Indicates that a map changed after the editor loaded it. */
export class MapSaveConflictError extends Error {
  /** Creates an error for a stale map revision. */
  constructor(mapId: AvaMap.Id) {
    super(`Map ${mapId} changed before this save completed.`);
    this.name = "MapSaveConflictError";
  }
}
