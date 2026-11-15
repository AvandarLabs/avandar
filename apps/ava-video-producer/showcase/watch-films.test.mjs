import assert from "node:assert/strict";
import { test } from "node:test";
import { watchFilms } from "./watch-films.js";

const origin = "http://localhost:4173";

function createPlayer(index) {
  let source = `${origin}/live.html?id=film-${index}`;
  const messages = [];
  const navigations = [];
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
      postMessage(message, targetOrigin) {
        messages.push({ message, targetOrigin });
      },
    },
  };
}

function createClock() {
  const timers = new Map();
  let time = 0;
  let timerId = 0;
  return {
    schedule(callback, delay) {
      timerId += 1;
      timers.set(timerId, { callback, at: time + delay });
      return timerId;
    },
    cancel(id) {
      timers.delete(id);
    },
    advance(milliseconds) {
      time += milliseconds;
      for (const [id, timer] of [...timers]) {
        if (timer.at <= time) {
          timers.delete(id);
          timer.callback();
        }
      }
    },
    get pending() {
      return timers.size;
    },
  };
}

function createEnvironment(playerCount = 1) {
  const streams = [];
  const listeners = new Set();
  const clock = createClock();
  const originals = new Map(
    ["EventSource", "window", "setTimeout", "clearTimeout"].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  globalThis.EventSource = class {
    constructor(url) {
      this.url = url;
      streams.push(this);
    }
    addEventListener(name, handler) {
      this.onMessage = handler;
    }
    close() {
      this.isClosed = true;
    }
  };
  globalThis.window = {
    location: { origin, href: `${origin}/productions.html` },
    addEventListener(name, listener) {
      listeners.add(listener);
    },
    removeEventListener(name, listener) {
      listeners.delete(listener);
    },
  };
  globalThis.setTimeout = clock.schedule;
  globalThis.clearTimeout = clock.cancel;
  const players = Array.from({ length: playerCount }, (_, index) =>
    createPlayer(index),
  );
  return {
    streams,
    listeners,
    clock,
    players,
    notify(generation) {
      streams[0].onMessage({ data: generation });
    },
    acknowledge(
      requestId,
      source = players[0].contentWindow,
      messageOrigin = origin,
    ) {
      listeners.forEach((listener) =>
        listener({
          source,
          origin: messageOrigin,
          data: { type: "film-reloading", requestId },
        }),
      );
    },
    restore() {
      for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    },
  };
}

function withWatcher(playerCount, verify) {
  const environment = createEnvironment(playerCount);
  let dispose;
  try {
    dispose = watchFilms(environment.players);
    verify(environment, dispose);
  } finally {
    dispose?.();
    environment.restore();
  }
}

test("seven players share one source stream and ignore initial or repeated generations", () => {
  withWatcher(7, ({ streams, players, notify }) => {
    assert.equal(streams.length, 1);
    assert.equal(streams[0].url, "/events");
    notify("5");
    notify("5");
    assert.ok(players.every((player) => player.messages.length === 0));
    notify("6");
    notify("6");
    const requestIds = new Set();
    for (const player of players) {
      assert.equal(player.messages.length, 1);
      const { message, targetOrigin } = player.messages[0];
      assert.equal(message.type, "film-control");
      assert.equal(message.action, "reload");
      assert.equal(targetOrigin, origin);
      requestIds.add(message.requestId);
    }
    assert.equal(requestIds.size, 7);
  });
});

test("a loading or dead iframe reloads its current source when acknowledgement expires", () => {
  withWatcher(1, ({ players, notify, clock }) => {
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
  withWatcher(1, ({ players, notify, clock, acknowledge }) => {
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
  withWatcher(1, ({ players, notify, clock, acknowledge }) => {
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
  withWatcher(1, ({ players, notify, clock, acknowledge }) => {
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
  withWatcher(1, ({ players, notify }) => {
    notify("server-one:24");
    notify("server-two:0");
    assert.equal(players[0].messages.length, 1);
  });
});

test("recovery uses a newly selected source and never navigates a foreign iframe", () => {
  withWatcher(2, ({ players, notify, clock }) => {
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
  withWatcher(1, ({ streams, players, notify, clock, listeners }, dispose) => {
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
