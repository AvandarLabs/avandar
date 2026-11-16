import assert from "node:assert/strict";
import test from "node:test";
import { createObservedTokenUsage } from "./observedTokenUsage";

test("reports during one render notify subscribers once with sorted unique paths", async () => {
  const usage = createObservedTokenUsage();
  let notifications = 0;
  usage.subscribe(() => {
    notifications += 1;
  });
  usage.report("color.line");
  usage.report("color.accent");
  usage.report("color.line");
  await Promise.resolve();
  assert.equal(notifications, 1);
  assert.deepEqual(usage.getPaths(), ["color.accent", "color.line"]);
});

test("the paths snapshot keeps its identity until something new is reported", async () => {
  const usage = createObservedTokenUsage();
  usage.report("color.accent");
  await Promise.resolve();
  const first = usage.getPaths();
  usage.report("color.accent");
  await Promise.resolve();
  assert.equal(usage.getPaths(), first);
});
