import assert from "node:assert/strict";
import test from "node:test";
import { ThemeApiError } from "../ThemeApi/ThemeApi";
import { runThemeRequest, type ThemeSaveStatus } from "./useThemeSaving";

function createHarness() {
  const statuses: ThemeSaveStatus[] = [];
  return {
    statuses,
    inFlight: { current: false },
    setStatus: (status: ThemeSaveStatus) => statuses.push(status),
  };
}

test("a request that succeeds resolves true and ends saved", async () => {
  const harness = createHarness();
  const didSucceed = await runThemeRequest({
    ...harness,
    request: async () => {},
  });
  assert.equal(didSucceed, true);
  assert.deepEqual(
    harness.statuses.map((status) => status.kind),
    ["saving", "saved"],
  );
  assert.equal(harness.inFlight.current, false);
});

test("a request the server refuses resolves false and reports its status", async () => {
  const harness = createHarness();
  const didSucceed = await runThemeRequest({
    ...harness,
    request: async () => {
      throw new ThemeApiError(409, "exists", []);
    },
  });
  assert.equal(didSucceed, false);
  assert.deepEqual(harness.statuses.at(-1), {
    kind: "failed",
    status: 409,
    issues: [],
  });
  assert.equal(harness.inFlight.current, false);
});

test("a request started while another is in flight resolves false", async () => {
  const harness = createHarness();
  harness.inFlight.current = true;
  let didRun = false;
  const didSucceed = await runThemeRequest({
    ...harness,
    request: async () => {
      didRun = true;
    },
  });
  assert.equal(didSucceed, false);
  assert.equal(didRun, false);
  assert.deepEqual(harness.statuses, []);
});
