import { scopePruneCountsToDeletionCounts } from "@ava-cli/PipelineCli/scopePruneCounts/scopePruneCounts";
import {
  NO_DENOMINATORS,
  NO_STAGE_TIMINGS,
} from "@etl/stores/executionRecords/executionRecords";
import type { ScopePruneCounts } from "@ava-cli/PipelineCli/ResetPipelineCli/pipelineListingsRest";
import type {
  ExecutionScope,
  ExecutionScopeStatus,
} from "@etl/stores/ExecutionStore.types";

/**
 * One drive and scope of a prune, as its execution records it: the prune's
 * counts, with the zero timings and denominators of a step that crawled
 * nothing.
 *
 * @param args.status - `succeeded` for a pair pruned or dry-run, `skipped`
 * for one a declined prune left alone.
 */
export function buildPruneExecutionScope(args: {
  driveKey: string;
  scopeKey: string;
  counts: ScopePruneCounts;
  status: ExecutionScopeStatus;
  startedAt: Date;
  finishedAt: Date;
}): ExecutionScope {
  return {
    driveKey: args.driveKey,
    scopeKey: args.scopeKey,
    status: args.status,
    error: undefined,
    windowSince: undefined,
    windowUntil: undefined,
    checkpointBefore: undefined,
    checkpointAfter: undefined,
    startedAt: args.startedAt,
    finishedAt: args.finishedAt,
    timings: NO_STAGE_TIMINGS,
    denominators: NO_DENOMINATORS,
    deletions: scopePruneCountsToDeletionCounts(args.counts),
    pipelineMetrics: {},
  };
}
