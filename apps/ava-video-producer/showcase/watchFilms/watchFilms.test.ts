import assert from "node:assert/strict";
import { test } from "node:test";
import {
  captureGlobals,
  restoreGlobals,
} from "../__tests__/restoreGlobalsHelpers";
import { watchFilms } from "./watchFilms";

const origin = "http://localhost:4173";

type FilmMessage = {
  type: string;
  action?: string;
  requestId?: string;
};
type FakePlayer = {
  messages: Array<{ message: FilmMessage; targetOrigin: string }>;
  navigations: string[];
  src: string;
  contentWindow: {
    postMessage: (message: Readonly<FilmMessage>, targetOrigin: string) => void;
  };
};
type FakeStream = {
  url: string;
  isClosed?: boolean;
  onMessage?: (event: { data: string }) => void;
};
type ReloadListener = (event: {
  source: unknown;
  origin: string;
  data: { type: string; requestId: string };
}) => void;
type ManualClock = {
  schedule: (callback: () => void, delay: number) => number;
  cancel: (id: number) => void;
  advance: (milliseconds: number) => void;
  readonly pending: number;
};
type WatchEnvironment = {
  streams: FakeStream[];
  listeners: Set<ReloadListener>;
  clock: ManualClock;
  players: FakePlayer[];
  notify: (generation: string) => void;
  acknowledge: (
    requestId: string | undefined,
    source?: unknown,
    messageOrigin?: string,
  ) => void;
  restore: () => void;
};

function _createPlayer(index: number): FakePlayer {
  let source = `${origin}/live.html?id=film-${index}`;
  const messages: FakePlayer["messages"] = [];
  const navigations: string[] = [];
  return {
    messages,
    navigations,
    get src() {
      return source;
    },
    set src(value) {
      source = value;
      navigations.push(value);
    },
    contentWindow: {
      postMessage: (message, targetOrigin) => {
        messages.push({ message, targetOrigin });
      },
    },
  };
}

/** A manual clock that fires timers only when a test advances it. */
function _createClock(): ManualClock {
  const timers = new Map<number, { callback: () => void; at: number }>();
  let time = 0;
  let timerId = 0;
  return {
    schedule: (callback: () => void, delay: number) => {
      timerId += 1;
      timers.set(timerId, { callback, at: time + delay });
      return timerId;
    },
    cancel: (id: number) => {
      timers.delete(id);
    },
    advance: (milliseconds: number) => {
      time += milliseconds;
      [...timers].forEach(([id, timer]) => {
        if (timer.at <= time) {
          timers.delete(id);
          timer.callback();
        }
      });
    },
    get pending() {
      return timers.size;
    },
  };
}

/** Installs a fake EventSource, window, and clock for one gallery. */
function _installGallery(
  streams: FakeStream[],
  listeners: Set<ReloadListener>,
): ManualClock {
  const clock = _createClock();
  Object.assign(globalThis, {
    EventSource: class {
      url: string;
      isClosed?: boolean;
      onMessage?: FakeStream["onMessage"];
      constructor(url: string) {
        this.url = url;
        streams.push(this);
      }
      addEventListener(_name: string, handler: FakeStream["onMessage"]) {
        this.onMessage = handler;
      }
      close() {
        this.isClosed = true;
      }
    },
    window: {
      location: { origin, href: `${origin}/productions.html` },
      addEventListener: (_name: string, listener: ReloadListener) => {
        listeners.add(listener);
      },
      removeEventListener: (_name: string, listener: ReloadListener) => {
        listeners.delete(listener);
      },
    },
    setTimeout: clock.schedule,
    clearTimeout: clock.cancel,
  });
  return clock;
}

function _createEnvironment(playerCount = 1): WatchEnvironment {
  const streams: FakeStream[] = [];
  const listeners = new Set<ReloadListener>();
  const originals = captureGlobals([
    "EventSource",
    "window",
    "setTimeout",
    "clearTimeout",
  ]);
  const clock = _installGallery(streams, listeners);
  const players = Array.from({ length: playerCount }, (_, index) => {
    return _createPlayer(index);
  });
  return {
    streams,
    listeners,
    clock,
    players,
    notify: (generation: string) => {
      streams[0].onMessage?.({ data: generation });
    },
    acknowledge: (
      requestId: string | undefined,
      source: unknown = players[0].contentWindow,
      messageOrigin = origin,
    ) => {
      listeners.forEach((listener) => {
        return listener({
          source,
          origin: messageOrigin,
          data: { type: "film-reloading", requestId: String(requestId) },
        });
      });
    },
    restore: () => {
      restoreGlobals(originals);
    },
  };
}

function _withWatcher(
  playerCount: number,
  verify: (environment: WatchEnvironment, dispose: () => void) => void,
): void {
  const environment = _createEnvironment(playerCount);
  let dispose: (() => void) | undefined;
  try {
    dispose = watchFilms(environment.players);
    verify(environment, dispose);
  } finally {
    dispose?.();
    environment.restore();
  }
}

test("seven players share one source stream and ignore initial or repeated generations", () => {
  _withWatcher(7, ({ streams, players, notify }) => {
    assert.equal(streams.length, 1);
    assert.equal(streams[0].url, "/events");
    notify("5");
    notify("5");
    assert.ok(
      players.every((player) => {
        return player.messages.length === 0;
      }),
    );
    notify("6");
    notify("6");
    const requestIds = new Set(
      players.map((player) => {
        assert.equal(player.messages.length, 1);
        const { message, targetOrigin } = player.messages[0];
        assert.equal(message.type, "film-control");
        assert.equal(message.action, "reload");
        assert.equal(targetOrigin, origin);
        return message.requestId;
      }),
    );
    assert.equal(requestIds.size, 7);
  });
});

test("a loading or dead iframe reloads its current source when acknowledgement expires", () => {
  _withWatcher(1, ({ players, notify, clock }) => {
    notify("1");
    notify("2");
    const source = players[0].src;
    clock.advance(999);
    assert.deepEqual(players[0].navigations, []);
    clock.advance(1);
    assert.deepEqual(players[0].navigations, [source]);
  });
});

test("a matching iframe acknowledgement cancels fallback navigation", () => {
  _withWatcher(1, ({ players, notify, clock, acknowledge }) => {
    notify("1");
    notify("2");
    assert.equal(clock.pending, 1);
    acknowledge(players[0].messages[0].message.requestId);
    clock.advance(1000);
    assert.deepEqual(players[0].navigations, []);
    assert.equal(clock.pending, 0);
  });
});

test("unrelated origins, windows, and request IDs cannot cancel recovery", () => {
  _withWatcher(1, ({ players, notify, clock, acknowledge }) => {
    notify("1");
    notify("2");
    const { requestId } = players[0].messages[0].message;
    acknowledge(requestId, players[0].contentWindow, "https://example.com");
    acknowledge(requestId, {});
    acknowledge("unrelated-request");
    clock.advance(1000);
    assert.deepEqual(players[0].navigations, [players[0].src]);
  });
});

test("new generations replace old deadlines and ignore stale acknowledgements", () => {
  _withWatcher(1, ({ players, notify, clock, acknowledge }) => {
    notify("1");
    notify("2");
    const staleRequestId = players[0].messages[0].message.requestId;
    clock.advance(500);
    notify("3");
    acknowledge(staleRequestId);
    clock.advance(500);
    assert.deepEqual(players[0].navigations, []);
    clock.advance(500);
    assert.deepEqual(players[0].navigations, [players[0].src]);
  });
});

test("a server restart generation still requests player refresh", () => {
  _withWatcher(1, ({ players, notify }) => {
    notify("server-one:24");
    notify("server-two:0");
    assert.equal(players[0].messages.length, 1);
  });
});

test("recovery uses a newly selected source and never navigates a foreign iframe", () => {
  _withWatcher(2, ({ players, notify, clock }) => {
    notify("1");
    notify("2");
    players[0].src = `${origin}/live.html?id=another-film`;
    players[1].src = "https://example.com/";
    clock.advance(1000);
    assert.deepEqual(players[0].navigations, [players[0].src, players[0].src]);
    assert.deepEqual(players[1].navigations, ["https://example.com/"]);
  });
});

test("disposing the watcher clears listeners and pending fallback navigations", () => {
  _withWatcher(1, ({ streams, players, notify, clock, listeners }, dispose) => {
    notify("1");
    notify("2");
    assert.equal(clock.pending, 1);
    assert.equal(listeners.size, 1);
    dispose();
    clock.advance(1000);
    assert.equal(streams[0].isClosed, true);
    assert.equal(listeners.size, 0);
    assert.equal(clock.pending, 0);
    assert.deepEqual(players[0].navigations, []);
  });
});
