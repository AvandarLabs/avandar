import { OutOfOrderConnectionError } from "@etl/EtlEngine/OutOfOrderConnectionError";
import { selectPageConnections } from "@etl/EtlEngine/selectPageConnections/selectPageConnections";
import { describe, expect, it } from "vitest";
import type { EtlRunWindow } from "@etl/EtlEngine/EtlEngine.types";
import type { ConnectionSelectionState } from "@etl/EtlEngine/selectPageConnections/selectPageConnections";

type Connection = Readonly<{ id: string; modifiedAt: Date }>;

const OPEN_WINDOW: EtlRunWindow = { since: undefined, until: undefined };

function _at(minute: number): Date {
  return new Date(Date.UTC(2026, 9, 1, 0, minute));
}

function _connection(id: string, minute: number): Connection {
  return { id, modifiedAt: _at(minute) };
}

function _state(
  overrides: Partial<ConnectionSelectionState> = {},
): ConnectionSelectionState {
  return {
    seenIds: new Set(),
    lastTimestamp: undefined,
    remaining: Number.POSITIVE_INFINITY,
    ...overrides,
  };
}

function _select(args: {
  page: readonly Connection[];
  state?: ConnectionSelectionState;
  window?: EtlRunWindow;
  isOrdered?: boolean;
}) {
  return selectPageConnections({
    page: args.page,
    driveKey: "https://data.cityofnewyork.us",
    window: args.window ?? OPEN_WINDOW,
    state: args.state ?? _state(),
    getConnectionId: (connection) => {
      return connection.id;
    },
    getConnectionTimestamp:
      args.isOrdered === false
        ? undefined
        : (connection) => {
            return connection.modifiedAt;
          },
  });
}

function _ids(connections: readonly Connection[]): string[] {
  return connections.map((connection) => {
    return connection.id;
  });
}

describe("selectPageConnections", () => {
  it("throws OutOfOrderConnectionError naming the drive for an older connection", () => {
    expect(() => {
      return _select({ page: [_connection("a", 5), _connection("b", 1)] });
    }).toThrow(OutOfOrderConnectionError);
    expect(() => {
      return _select({ page: [_connection("a", 5), _connection("b", 1)] });
    }).toThrow("https://data.cityofnewyork.us");
  });

  it("compares the first connection with the previous page's last", () => {
    expect(() => {
      return _select({
        page: [_connection("c", 1)],
        state: _state({ lastTimestamp: _at(5) }),
      });
    }).toThrow(OutOfOrderConnectionError);
  });

  it("drops a connection seen with the same timestamp before checking order", () => {
    const first = _select({ page: [_connection("b", 1), _connection("x", 2)] });

    const { connections } = _select({
      page: [_connection("b", 1), _connection("c", 3)],
      state: first.state,
    });

    expect(_ids(connections)).toEqual(["c"]);
  });

  it("keeps a connection that reappears with a newer timestamp", () => {
    const first = _select({ page: [_connection("a", 1), _connection("b", 2)] });

    const { connections } = _select({
      page: [_connection("c", 3), _connection("a", 4)],
      state: first.state,
    });

    expect(_ids(connections)).toEqual(["c", "a"]);
  });

  it("drops a repeated id at any timestamp without a timestamp reader", () => {
    const first = _select({ page: [_connection("a", 1)], isOrdered: false });

    const { connections } = _select({
      page: [_connection("a", 4), _connection("b", 2)],
      state: first.state,
      isOrdered: false,
    });

    expect(_ids(connections)).toEqual(["b"]);
  });

  it("drops a connection repeated within one page", () => {
    const { connections } = _select({
      page: [_connection("a", 1), _connection("a", 1), _connection("b", 2)],
    });

    expect(_ids(connections)).toEqual(["a", "b"]);
  });

  it("does not check order without a timestamp reader", () => {
    const { connections } = _select({
      page: [_connection("a", 5), _connection("b", 1)],
      isOrdered: false,
    });

    expect(_ids(connections)).toEqual(["a", "b"]);
  });

  it("includes a connection at exactly since", () => {
    const { connections } = _select({
      page: [_connection("a", 1), _connection("b", 5)],
      window: { since: _at(5), until: undefined },
    });

    expect(_ids(connections)).toEqual(["b"]);
  });

  it("excludes a connection at exactly until", () => {
    const { connections } = _select({
      page: [_connection("a", 1), _connection("b", 5)],
      window: { since: undefined, until: _at(5) },
    });

    expect(_ids(connections)).toEqual(["a"]);
  });

  it("throws naming the drive and connection for an invalid timestamp", () => {
    const invalidConnection: Connection = {
      id: "broken",
      modifiedAt: new Date("not a date"),
    };

    expect(() => {
      return _select({ page: [_connection("a", 1), invalidConnection] });
    }).toThrow(
      "Drive https://data.cityofnewyork.us returned broken with a timestamp that is not a valid date",
    );
  });

  it("accepts connections with equal timestamps", () => {
    const { connections } = _select({
      page: [_connection("a", 3), _connection("b", 3)],
    });

    expect(_ids(connections)).toEqual(["a", "b"]);
  });

  it("advances the last timestamp past connections outside the window", () => {
    const window: EtlRunWindow = { since: _at(10), until: undefined };
    const first = _select({ page: [_connection("a", 5)], window });

    expect([_ids(first.connections), first.state.lastTimestamp]).toEqual([
      [],
      _at(5),
    ]);
    expect(() => {
      return _select({
        page: [_connection("b", 2)],
        window,
        state: first.state,
      });
    }).toThrow(OutOfOrderConnectionError);
  });

  it("treats this page's and earlier pages' connections as repeats later", () => {
    const first = _select({ page: [_connection("x", 0)] });
    const second = _select({
      page: [_connection("a", 1), _connection("b", 2)],
      state: first.state,
    });

    const { connections } = _select({
      page: [
        _connection("x", 0),
        _connection("a", 1),
        _connection("b", 2),
        _connection("c", 3),
      ],
      state: second.state,
    });

    expect(_ids(connections)).toEqual(["c"]);
  });

  it("does not mutate the state it was given", () => {
    const seenIds = new Set(["x"]);
    const state = _state({ seenIds, lastTimestamp: _at(1), remaining: 5 });

    _select({ page: [_connection("a", 2)], state });

    expect([[...seenIds], state.lastTimestamp, state.remaining]).toEqual([
      ["x"],
      _at(1),
      5,
    ]);
  });

  it("trims the page to the remaining limit and counts it down", () => {
    const { connections, state } = _select({
      page: [_connection("a", 1), _connection("b", 2), _connection("c", 3)],
      state: _state({ remaining: 2 }),
    });

    expect([_ids(connections), state.remaining]).toEqual([["a", "b"], 0]);
  });
});
