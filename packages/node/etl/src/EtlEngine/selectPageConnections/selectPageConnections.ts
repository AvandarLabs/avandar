import { OutOfOrderConnectionError } from "@etl/EtlEngine/OutOfOrderConnectionError";
import type { EtlRunWindow } from "@etl/EtlEngine/EtlEngine.types";

/** What one drive's crawl has seen so far. */
export type ConnectionSelectionState = Readonly<{
  /**
   * A repeat key for every connection this drive has returned during this
   * run: the connection id, paired with its timestamp when timestamps are
   * read. A connection modified during the crawl reappears with a newer
   * timestamp and a new key, so it is processed again rather than dropped.
   */
  seenIds: ReadonlySet<string>;
  /** The timestamp of the last connection seen, when timestamps are read. */
  lastTimestamp: Date | undefined;
  /** How many more connections the run's limit allows. */
  remaining: number;
}>;

function _buildRepeatKeyReader<TConnection>(args: {
  getConnectionId: (connection: TConnection) => string;
  getConnectionTimestamp: ((connection: TConnection) => Date) | undefined;
}): (connection: TConnection) => string {
  const { getConnectionId, getConnectionTimestamp } = args;
  if (getConnectionTimestamp === undefined) {
    return getConnectionId;
  }
  return (connection) => {
    // A JSON pair cannot collide the way a joined string could when an id
    // contains the separator.
    return JSON.stringify([
      getConnectionId(connection),
      getConnectionTimestamp(connection).getTime(),
    ]);
  };
}

function _dropRepeats<TConnection>(args: {
  page: readonly TConnection[];
  seenIds: ReadonlySet<string>;
  getRepeatKey: (connection: TConnection) => string;
}): Readonly<{ unseen: TConnection[]; knownIds: ReadonlySet<string> }> {
  const knownIds = new Set(args.seenIds);
  const unseen = args.page.filter((connection) => {
    const repeatKey = args.getRepeatKey(connection);
    if (knownIds.has(repeatKey)) {
      return false;
    }
    knownIds.add(repeatKey);
    return true;
  });
  return { unseen, knownIds };
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
      if (Number.isNaN(timestamp.getTime())) {
        throw new Error(
          `Drive ${args.driveKey} returned ${args.getConnectionId(connection)} with a timestamp that is not a valid date.`,
        );
      }
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
 * the window, then the page is trimmed to the run's remaining limit. When
 * timestamps are read, a repeat is the same id at the same timestamp, so a
 * connection that reappears with a newer timestamp is kept.
 *
 * @returns The connections to process and the drive's updated state.
 * @throws OutOfOrderConnectionError when a connection is older than the one
 * before it.
 * @throws Error when a connection's timestamp is not a valid date, because
 * it would otherwise disable the order check for the rest of the drive.
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
  const { unseen, knownIds } = _dropRepeats({
    page: args.page,
    seenIds: state.seenIds,
    getRepeatKey: _buildRepeatKeyReader(args),
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
      seenIds: knownIds,
      lastTimestamp,
      remaining: state.remaining - connections.length,
    },
  };
}
