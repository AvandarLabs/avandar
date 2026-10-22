import type { ScopePruneCounts } from "@ava-cli/PipelineCli/ResetPipelineCli/pipelineListingsRest";
import type { ExecutionDeletionCounts } from "@etl/stores/ExecutionStore.types";

/**
 * One line saying what pruning a scope does, such as
 * `delete 3 listing(s), keep 1 a workspace uses, ...`.
 */
export function describeScopePruneCounts(counts: ScopePruneCounts): string {
  return [
    `delete ${counts.listings_deleted} listing(s)`,
    `keep ${counts.listings_kept_in_use} a workspace uses`,
    `detach ${counts.listings_detached} another scope still produces`,
    `delete ${counts.checkpoints_deleted} checkpoint(s)`,
  ].join(", ");
}

/** Whether pruning a scope would change nothing at all. */
export function isScopePruneEmpty(counts: ScopePruneCounts): boolean {
  return (
    counts.listings_deleted === 0 &&
    counts.listings_kept_in_use === 0 &&
    counts.listings_detached === 0 &&
    counts.checkpoints_deleted === 0
  );
}

/** A prune's counts, as a pipeline execution records them. */
export function scopePruneCountsToDeletionCounts(
  counts: ScopePruneCounts,
): ExecutionDeletionCounts {
  return {
    listingsDeleted: counts.listings_deleted,
    listingsKeptInUse: counts.listings_kept_in_use,
    listingsDetached: counts.listings_detached,
    checkpointsDeleted: counts.checkpoints_deleted,
  };
}
