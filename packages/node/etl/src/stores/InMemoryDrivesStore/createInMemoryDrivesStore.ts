import { randomUUID } from "node:crypto";
import type { DriveRow, DrivesStore } from "@etl/stores/EtlStores.types";

/** A stored drive, with its id. */
export type StoredDriveRow = DriveRow & Readonly<{ id: string }>;

/** A drives store held in memory, plus accessors for asserting on it. */
export type InMemoryDrivesStore = DrivesStore &
  Readonly<{
    /** A copy of every drive, in the order each was first written. */
    getDrives: () => readonly StoredDriveRow[];
    /** How many times `upsert` was called. */
    getUpsertCount: () => number;
  }>;

function _buildMapKey(drive: DriveRow): string {
  return JSON.stringify([drive.pipelineName, drive.driveKey]);
}

function _copyDrive(drive: StoredDriveRow): StoredDriveRow {
  return {
    id: drive.id,
    pipelineName: drive.pipelineName,
    driveKey: drive.driveKey,
    organizationLabels: { ...drive.organizationLabels },
  };
}

/**
 * Creates a drives store that keeps drives in memory, for testing a
 * pipeline or the engine without Supabase. Values cross the store boundary
 * as copies.
 *
 * @returns The store.
 */
export function createInMemoryDrivesStore(): InMemoryDrivesStore {
  const drivesByKey = new Map<string, StoredDriveRow>();
  let upsertCount = 0;
  return {
    upsert: async (drive) => {
      upsertCount += 1;
      const key = _buildMapKey(drive);
      const id = drivesByKey.get(key)?.id ?? randomUUID();
      drivesByKey.set(key, _copyDrive({ ...drive, id }));
      return id;
    },
    getDrives: () => {
      return [...drivesByKey.values()].map(_copyDrive);
    },
    getUpsertCount: () => {
      return upsertCount;
    },
  };
}
