import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createCaptureContext } from "./createCaptureContext";

function _createContext(runDir: string) {
  return createCaptureContext({
    runDir,
    baseUrl: "http://localhost:5173",
    workspace: "capture-test",
    runLabel: "fixture",
    flowIds: ["example"],
    viewport: { width: 1600, height: 1000 },
    fixtures: { absoluteDir: runDir, relativeDir: "fixtures", files: [] },
    checkpointSettleMs: 0,
    secrets: [],
    email: "capture@example.test",
    playwrightVersion: "test",
    startedAtMs: performance.now(),
    live: { page: undefined, recordingOrigin: undefined },
  });
}

test("a capture without a recording has undefined clock, video path and browser version", () => {
  const context = _createContext("/tmp/capture-contract-test");
  assert.equal(context.videoElapsed(), undefined);
  assert.equal(context.manifest.video.rawPath, undefined);
  assert.equal(context.manifest.browser.version, undefined);
});

test("version one persisted manifests retain null evidence fields before recording starts", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "capture-contract-"),
  );
  try {
    const context = _createContext(directory);
    await context.reportSuppressed({
      sourceUrl: "http://localhost:5173/suppressed",
      method: "GET",
      reason: "test",
    });
    const manifest: {
      schemaVersion: number;
      video: { rawPath: unknown };
      browser: { version: unknown };
      networkPolicy: { suppressedRequests: Array<{ videoAtMs: unknown }> };
    } = JSON.parse(await fs.readFile(context.manifestPath, "utf8"));
    assert.equal(manifest.schemaVersion, 1);
    assert.equal(manifest.video.rawPath, null);
    assert.equal(manifest.browser.version, null);
    assert.equal(manifest.networkPolicy.suppressedRequests[0].videoAtMs, null);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
