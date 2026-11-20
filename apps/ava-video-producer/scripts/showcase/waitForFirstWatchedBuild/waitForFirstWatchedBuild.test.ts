import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import {
  type BuildEventWatcher,
  waitForFirstWatchedBuild,
} from "./waitForFirstWatchedBuild";

/** A watcher that emits the event sequence of one Rollup build cycle. */
function _createWatcher(): {
  watcher: BuildEventWatcher;
  succeed: () => void;
  fail: (error?: Error) => void;
} {
  const emitter = new EventEmitter();
  const emitCycle = (
    events: ReadonlyArray<{ code: string; error?: Error }>,
  ) => {
    [{ code: "START" }, ...events, { code: "END" }].forEach((event) => {
      emitter.emit("event", { ...event, result: { close: async () => {} } });
    });
  };
  return {
    watcher: emitter,
    succeed: () => {
      return emitCycle([{ code: "BUNDLE_START" }, { code: "BUNDLE_END" }]);
    },
    fail: (error = new Error("Build failed")) => {
      return emitCycle([{ code: "BUNDLE_START" }, { code: "ERROR", error }]);
    },
  };
}

test("only successful watched builds refresh the showcase", async () => {
  const { watcher, succeed, fail } = _createWatcher();
  let refreshCount = 0;
  const firstBuild = waitForFirstWatchedBuild(watcher, async () => {
    refreshCount += 1;
  });
  succeed();
  await firstBuild;
  assert.equal(refreshCount, 1);
  fail();
  await new Promise((resolve) => {
    return setImmediate(resolve);
  });
  assert.equal(refreshCount, 1, "A failed rebuild must not refresh pages");
  succeed();
  await new Promise((resolve) => {
    return setImmediate(resolve);
  });
  assert.equal(refreshCount, 2);
});

test("a failed first build rejects without refreshing the showcase", async () => {
  const { watcher, fail } = _createWatcher();
  let refreshCount = 0;
  const firstBuild = waitForFirstWatchedBuild(watcher, async () => {
    refreshCount += 1;
  });
  fail(new Error("Unexpected token"));
  await assert.rejects(firstBuild, /Unexpected token/);
  await new Promise((resolve) => {
    return setImmediate(resolve);
  });
  assert.equal(refreshCount, 0);
});
