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

  it("drops a repeated connection before checking order", () => {
    const { connections } = _select({
      page: [_connection("b", 1), _connection("c", 3)],
      state: _state({ seenIds: new Set(["b"]), lastTimestamp: _at(2) }),
    });

    expect(_ids(connections)).toEqual(["c"]);
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

  it("trims the page to the remaining limit and counts it down", () => {
    const { connections, state } = _select({
      page: [_connection("a", 1), _connection("b", 2), _connection("c", 3)],
      state: _state({ remaining: 2 }),
    });

    expect([_ids(connections), state.remaining]).toEqual([["a", "b"], 0]);
  });
});
