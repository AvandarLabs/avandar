/**
 * Whether a crawl may advance its checkpoint: only when it covers everything
 * since the stored checkpoint. A crawl from the start does. A crawl from an
 * explicit `since` does when it starts at or before the stored checkpoint.
 * One that starts later would skip what lies between, and with no stored
 * checkpoint it would claim everything before its `since`.
 *
 * @param args.windowSince - The crawl's lower bound.
 * @param args.storedCheckpoint - The checkpoint when the crawl started.
 * @returns `true` when the crawl's pages may move the checkpoint.
 */
export function isCrawlContiguousWithCheckpoint(args: {
  windowSince: Date | undefined;
  storedCheckpoint: Date | undefined;
}): boolean {
  const { windowSince, storedCheckpoint } = args;
  if (windowSince === undefined) {
    return true;
  }
  return (
    storedCheckpoint !== undefined &&
    windowSince.getTime() <= storedCheckpoint.getTime()
  );
}

/**
 * Where a checkpoint moves after a page has loaded: to the page's newest
 * connection timestamp that is no later than `syncedAt`, when that is later
 * than the current checkpoint. A timestamp that is not a valid date, or later
 * than the sync time, is ignored. Both are bad source timestamps, and
 * following a late one would skip real changes until the clock caught up.
 *
 * @param args.current - The checkpoint before the page.
 * @param args.pageTimestamps - The timestamps of the page's connections.
 * @param args.syncedAt - When the run started.
 * @returns The new checkpoint, or `undefined` when it does not move.
 */
export function getAdvancedCheckpoint(args: {
  current: Date | undefined;
  pageTimestamps: readonly Date[];
  syncedAt: Date;
}): Date | undefined {
  const syncedTime = args.syncedAt.getTime();
  const newestTimestamp = args.pageTimestamps.reduce<Date | undefined>(
    (latest, timestamp) => {
      const timestampTime = timestamp.getTime();
      if (Number.isNaN(timestampTime) || timestampTime > syncedTime) {
        return latest;
      }
      return latest === undefined || timestampTime > latest.getTime()
        ? timestamp
        : latest;
    },
    undefined,
  );
  if (newestTimestamp === undefined) {
    return undefined;
  }
  if (
    args.current !== undefined &&
    newestTimestamp.getTime() <= args.current.getTime()
  ) {
    return undefined;
  }
  return newestTimestamp;
}
