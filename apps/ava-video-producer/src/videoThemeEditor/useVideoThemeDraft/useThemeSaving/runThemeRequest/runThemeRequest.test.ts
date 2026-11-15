import assert from "node:assert/strict";
import test from "node:test";
import { ThemeApiError } from "../../../ThemeApi/ThemeApi";
import { createRequestHarness } from "../createRequestHarness";
import { runThemeRequest } from "./runThemeRequest";

test("a request that succeeds resolves true and ends saved", async () => {
  const harness = createRequestHarness();
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
  const harness = createRequestHarness();
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
  const harness = createRequestHarness();
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

test("a request that throws a plain error ends in a failed status with code 0", async () => {
  const harness = createRequestHarness();
  const didSucceed = await runThemeRequest({
    ...harness,
    request: async () => {
      throw new Error("base theme missing");
    },
  });
  assert.equal(didSucceed, false);
  assert.deepEqual(harness.statuses.at(-1), {
    kind: "failed",
    status: 0,
    issues: [],
  });
});

test("a request marked as a create reports its failure as a create failure", async () => {
  const harness = createRequestHarness();
  const didSucceed = await runThemeRequest({
    ...harness,
    failureKind: "createFailed",
    request: async () => {
      throw new ThemeApiError(409, "exists", []);
    },
  });
  assert.equal(didSucceed, false);
  assert.deepEqual(harness.statuses.at(-1), {
    kind: "createFailed",
    status: 409,
    issues: [],
  });
});
