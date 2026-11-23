import type {
  CheckpointKey,
  CheckpointStore,
  StoredCheckpoint,
} from "@etl/stores/EtlStores.types";

/** A checkpoint store held in memory, plus accessors for asserting on it. */
export type InMemoryCheckpointStore = CheckpointStore &
  Readonly<{
    /** A copy of every checkpoint, in the order its key was first written. */
    getCheckpoints: () => readonly StoredCheckpoint[];
    /** How many times `write` was called. */
    getWriteCount: () => number;
  }>;

function _buildMapKey(key: CheckpointKey): string {
  return JSON.stringify([key.pipelineName, key.driveKey, key.scopeKey]);
}

function _copyCheckpoint(checkpoint: StoredCheckpoint): StoredCheckpoint {
  return {
    pipelineName: checkpoint.pipelineName,
    driveKey: checkpoint.driveKey,
    scopeKey: checkpoint.scopeKey,
    highWaterMark: new Date(checkpoint.highWaterMark.getTime()),
    pipelineRunId: checkpoint.pipelineRunId,
  };
}

/**
 * Creates a checkpoint store that keeps checkpoints in memory, for testing a
 * pipeline or the engine without Supabase. Values cross the store boundary
 * as copies, and an invalid date is rejected the way Postgres rejects it.
 *
 * @param options.checkpoints - Checkpoints to start with.
 * @returns The store.
 */
export function createInMemoryCheckpointStore(
  options: Readonly<{ checkpoints?: readonly StoredCheckpoint[] }> = {},
): InMemoryCheckpointStore {
  const checkpointsByKey = new Map<string, StoredCheckpoint>(
    (options.checkpoints ?? []).map((checkpoint) => {
      return [_buildMapKey(checkpoint), _copyCheckpoint(checkpoint)];
    }),
  );
  let writeCount = 0;
  return {
    read: async (key) => {
      const stored = checkpointsByKey.get(_buildMapKey(key));
      return stored === undefined
        ? undefined
        : new Date(stored.highWaterMark.getTime());
    },
    write: async (checkpoint) => {
      if (Number.isNaN(checkpoint.highWaterMark.getTime())) {
        throw new Error(
          `Checkpoint ${_buildMapKey(checkpoint)} has an invalid high-water mark.`,
        );
      }
      writeCount += 1;
      checkpointsByKey.set(
        _buildMapKey(checkpoint),
        _copyCheckpoint(checkpoint),
      );
    },
    getCheckpoints: () => {
      return [...checkpointsByKey.values()].map(_copyCheckpoint);
    },
    getWriteCount: () => {
      return writeCount;
    },
  };
}
