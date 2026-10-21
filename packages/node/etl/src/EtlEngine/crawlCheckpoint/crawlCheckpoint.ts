import {
  getAdvancedCheckpoint,
  isCrawlContiguousWithCheckpoint,
} from "@etl/EtlEngine/checkpointRules/checkpointRules";
import { resolveRunWindow } from "@etl/EtlEngine/resolveRunWindow/resolveRunWindow";
import type {
  EtlPipelineRunId,
  EtlRunOptions,
  EtlRunWindow,
} from "@etl/EtlEngine/EtlEngine.types";
import type {
  CheckpointKey,
  CheckpointStore,
} from "@etl/stores/EtlStores.types";

/**
 * One crawl's checkpoint: where it is stored, its value now, and whether
 * this crawl's pages may move it.
 */
export type CrawlCheckpoint = Readonly<{
  store: CheckpointStore;
  key: CheckpointKey;
  current: Date | undefined;
  canAdvance: boolean;
}>;

/** Where a crawl starts, and the checkpoint it advances. */
export type CrawlStart = Readonly<{
  window: EtlRunWindow;
  /** Undefined when there is no checkpoint store to read. */
  checkpoint: CrawlCheckpoint | undefined;
}>;

/**
 * Reads a crawl's checkpoint and resolves its window from it. With no
 * checkpoint store, as for a pipeline without incremental config, the
 * window is the run's own bounds.
 *
 * @param args.store - Where the checkpoint is kept, if anywhere.
 * @param args.key - The crawl's pipeline, drive, and scope.
 * @param args.options - The run's options.
 * @returns The window and the checkpoint.
 * @throws Whatever reading the checkpoint throws.
 */
export async function readCrawlStart(args: {
  store: CheckpointStore | undefined;
  key: CheckpointKey;
  options: EtlRunOptions;
}): Promise<CrawlStart> {
  const { store, options } = args;
  if (store === undefined) {
    return {
      window: resolveRunWindow({ options, highWaterMark: undefined }),
      checkpoint: undefined,
    };
  }
  const stored = await store.read(args.key);
  const window = resolveRunWindow({ options, highWaterMark: stored });
  return {
    window,
    checkpoint: {
      store,
      key: args.key,
      current: stored,
      canAdvance: isCrawlContiguousWithCheckpoint({
        windowSince: window.since,
        storedCheckpoint: stored,
      }),
    },
  };
}

/**
 * Moves a crawl's checkpoint past a page that finished loading, and writes
 * it, when the page's timestamps carry it forward (see
 * `getAdvancedCheckpoint`).
 *
 * @param args.checkpoint - The crawl's checkpoint before the page.
 * @param args.pageTimestamps - The timestamps of the page's connections.
 * @param args.syncedAt - When the run started.
 * @param args.pipelineRunId - Written with the checkpoint.
 * @returns The checkpoint as it now stands.
 * @throws Whatever writing the checkpoint throws.
 */
export async function advanceCrawlCheckpoint(args: {
  checkpoint: CrawlCheckpoint | undefined;
  pageTimestamps: readonly Date[];
  syncedAt: Date;
  pipelineRunId: EtlPipelineRunId;
}): Promise<CrawlCheckpoint | undefined> {
  const { checkpoint } = args;
  if (checkpoint === undefined || !checkpoint.canAdvance) {
    return checkpoint;
  }
  const nextCheckpoint = getAdvancedCheckpoint({
    current: checkpoint.current,
    pageTimestamps: args.pageTimestamps,
    syncedAt: args.syncedAt,
  });
  if (nextCheckpoint === undefined) {
    return checkpoint;
  }
  await checkpoint.store.write({
    ...checkpoint.key,
    highWaterMark: nextCheckpoint,
    pipelineRunId: args.pipelineRunId,
  });
  return { ...checkpoint, current: nextCheckpoint };
}
