import { OutOfOrderConnectionError } from "@etl/EtlEngine/OutOfOrderConnectionError";
import type { EtlRunWindow } from "@etl/EtlEngine/EtlEngine.types";

/** What one drive's crawl has seen so far. */
export type ConnectionSelectionState = Readonly<{
  /** Every connection id this drive has returned during this run. */
  seenIds: ReadonlySet<string>;
  /** The timestamp of the last connection seen, when timestamps are read. */
  lastTimestamp: Date | undefined;
  /** How many more connections the run's limit allows. */
  remaining: number;
}>;

function _dropRepeats<TConnection>(args: {
  page: readonly TConnection[];
  seenIds: ReadonlySet<string>;
  getConnectionId: (connection: TConnection) => string;
}): TConnection[] {
  const knownIds = new Set(args.seenIds);
  return args.page.filter((connection) => {
    const id = args.getConnectionId(connection);
    if (knownIds.has(id)) {
      return false;
    }
    knownIds.add(id);
    return true;
  });
}

function _assertOldestFirst<TConnection>(args: {
  connections: readonly TConnection[];
  driveKey: string;
  lastTimestamp: Date | undefined;
  getConnectionId: (connection: TConnection) => string;
  getConnectionTimestamp: (connection: TConnection) => Date;
}): Date | undefined {
  return args.connections.reduce<Date | undefined>(
    (previousTimestamp, connection) => {
      const timestamp = args.getConnectionTimestamp(connection);
      if (
        previousTimestamp !== undefined &&
        timestamp.getTime() < previousTimestamp.getTime()
      ) {
        throw new OutOfOrderConnectionError({
          driveKey: args.driveKey,
          connectionId: args.getConnectionId(connection),
          timestamp,
          previousTimestamp,
        });
      }
      return timestamp;
    },
    args.lastTimestamp,
  );
}

function _isInWindow(timestamp: Date, window: EtlRunWindow): boolean {
  const time = timestamp.getTime();
  return (
    (window.since === undefined || time >= window.since.getTime()) &&
    (window.until === undefined || time < window.until.getTime())
  );
}

/**
 * Picks which of a page's connections to process: repeats are dropped,
 * then (when timestamps are read) the rest must be oldest first and inside
 * the window, then the page is trimmed to the run's remaining limit.
 *
 * @returns The connections to process and the drive's updated state.
 * @throws OutOfOrderConnectionError when a connection is older than the one
 * before it.
 */
export function selectPageConnections<TConnection>(args: {
  page: readonly TConnection[];
  driveKey: string;
  window: EtlRunWindow;
  state: ConnectionSelectionState;
  getConnectionId: (connection: TConnection) => string;
  getConnectionTimestamp: ((connection: TConnection) => Date) | undefined;
}): Readonly<{
  connections: readonly TConnection[];
  state: ConnectionSelectionState;
}> {
  const { state, getConnectionId, getConnectionTimestamp } = args;
  const unseen = _dropRepeats({
    page: args.page,
    seenIds: state.seenIds,
    getConnectionId,
  });
  const lastTimestamp =
    getConnectionTimestamp === undefined
      ? undefined
      : _assertOldestFirst({
          connections: unseen,
          driveKey: args.driveKey,
          lastTimestamp: state.lastTimestamp,
          getConnectionId,
          getConnectionTimestamp,
        });
  const inWindow =
    getConnectionTimestamp === undefined
      ? unseen
      : unseen.filter((connection) => {
          return _isInWindow(getConnectionTimestamp(connection), args.window);
        });
  const connections = inWindow.slice(0, state.remaining);
  return {
    connections,
    state: {
      seenIds: new Set([...state.seenIds, ...unseen.map(getConnectionId)]),
      lastTimestamp,
      remaining: state.remaining - connections.length,
    },
  };
}
