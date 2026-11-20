import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import { prop } from "@avandar/utils";
import { CaptureRunError } from "../scripts/captureAvandar/CaptureRunError";
import { runCapture } from "../scripts/captureAvandar/runCapture";
import {
  createFakeBrowser,
  type DispatchResult,
} from "./helpers/createFakeBrowser/createFakeBrowser";

/** A temporary capture root with one fixture CSV. */
async function _createCaptureRoot(t: TestContext): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "capture-run-"));
  t.after(() => {
    return rm(root, { recursive: true, force: true });
  });
  await mkdir(join(root, "demo-data"));
  await writeFile(join(root, "demo-data", "cases.csv"), "id\n1\n");
  return root;
}

test("runner keeps auth in memory, records after login, logs actions, finalizes video, and preserves caller browser", async (t) => {
  const root = await _createCaptureRoot(t);
  const { browser, events, contexts } = createFakeBrowser();
  const result = await runCapture({
    root,
    browser,
    email: "user@example.test",
    password: "capture-test-password",
    flowIds: ["import"],
    login: async () => {
      assert.equal(contexts.length, 1);
      assert.equal(contexts[0].options.recordVideo, undefined);
    },
    flowMap: {
      import: async (ctx) => {
        assert.equal(
          await ctx.step("read-result", async () => {
            return 42;
          }),
          42,
        );
        await ctx.checkpoint("ready", { text: true });
        await ctx.recordResource({
          kind: "dataset",
          id: "fixture-id",
          name: "Fixture dataset",
        });
      },
    },
  });
  assert.equal(result.status, "passed");
  const { storageState } = contexts[1].options;
  assert.ok(typeof storageState === "object" && storageState !== null);
  assert.equal(storageState.cookies[0].value, "never-persist-this");
  assert.ok(
    contexts.every((context) => {
      return context.options.serviceWorkers === "block";
    }),
  );
  assert.equal(events.includes("browser-close"), false);
  assert.ok(events.includes("fonts-ready") && events.includes("settle-600"));
  assert.equal(result.manifest.video.originalFps, 25);
  assert.equal(result.manifest.video.status, "saved");
  assert.equal(result.manifest.checkpoints[0].status, "passed");
  assert.ok(result.manifest.checkpoints[0].atMs !== undefined);
  assert.ok(
    result.manifest.checkpoints[0].atMs >=
      result.manifest.checkpoints[0].startedAtMs,
  );
  const manifest = await readFile(result.manifestPath, "utf8");
  for (const secret of [
    "user@example.test",
    "capture-test-password",
    "never-persist-this",
    "storageState",
  ]) {
    assert.equal(manifest.includes(secret), false);
  }
  assert.ok(result.manifest.checkpoints[0].text);
  const text = await readFile(
    join(result.runDir, result.manifest.checkpoints[0].text.path),
    "utf8",
  );
  assert.equal(text.includes("user@example.test"), false);
  assert.equal(text.includes("capture-test-password"), false);
});

test("feedback widget is fulfilled locally in both contexts and logged without invalidating evidence", async (t) => {
  const root = await _createCaptureRoot(t);
  const { browser, contexts } = createFakeBrowser();
  const endpoint =
    "https://avandar.featurebase.app/api/v1/feedback/widget/config";
  const responses: DispatchResult[] = [];
  const result = await runCapture({
    root,
    browser,
    email: "user@example.test",
    password: "avandar",
    flowIds: ["import"],
    login: async () => {
      responses.push(await contexts[0].dispatchRequest(endpoint));
    },
    flowMap: {
      import: async (ctx) => {
        await ctx.step("read-result", async () => {
          responses.push(await contexts[1].dispatchRequest(endpoint));
        });
        await ctx.checkpoint("ready");
      },
    },
  });
  assert.equal(result.status, "passed");
  assert.equal(result.manifest.video.status, "saved");
  assert.deepEqual(result.manifest.networkPolicy.blockedRequests, []);
  assert.equal(result.manifest.networkPolicy.suppressedRequests.length, 2);
  assert.ok(
    result.manifest.networkPolicy.suppressedRequests.every((request) => {
      return (
        request.sourceUrl === endpoint &&
        request.reason === "nonessential-feedback-widget"
      );
    }),
  );
  assert.equal(
    result.manifest.networkPolicy.suppressedRequests[0].videoAtMs,
    null,
  );
  assert.equal(
    typeof result.manifest.networkPolicy.suppressedRequests[1].videoAtMs,
    "number",
  );
  assert.equal(
    result.manifest.actions[0].sourceUrl,
    "http://localhost:5173/avandar-labs/",
  );
  for (const response of responses) {
    assert.equal(
      response.continued,
      false,
      "no request may leave for the feedback service",
    );
    assert.equal(response.aborted, false);
    assert.ok(response.fulfilled);
    assert.equal(response.fulfilled.status, 200);
    assert.equal(response.fulfilled.contentType, "application/json");
    assert.deepEqual(JSON.parse(String(response.fulfilled.body)), {});
  }
  assert.equal(
    (await readFile(result.manifestPath, "utf8")).includes("[invalid source]"),
    false,
  );
});

test("unknown external writes still fail capture and retain a useful source URL", async (t) => {
  const root = await _createCaptureRoot(t);
  const { browser, contexts } = createFakeBrowser();
  const endpoint = "https://avandar.featurebase.app/api/v1/feedback/submit";
  let response: DispatchResult | undefined;
  await assert.rejects(
    runCapture({
      root,
      browser,
      email: "user@example.test",
      password: "avandar",
      flowIds: ["import"],
      login: async () => {},
      flowMap: {
        import: async (ctx) => {
          await ctx.step("read-result", async () => {
            response = await contexts[1].dispatchRequest(
              `${endpoint}?token=hidden`,
            );
          });
        },
      },
    }),
    (error: unknown) => {
      assert.ok(error instanceof CaptureRunError);
      assert.equal(error.manifest.status, "failed");
      assert.equal(error.manifest.video.status, "saved");
      assert.equal(
        error.manifest.networkPolicy.blockedRequests[0].sourceUrl,
        endpoint,
      );
      assert.equal(
        error.manifest.networkPolicy.blockedRequests[0].reason,
        "external-mutation",
      );
      assert.deepEqual(error.manifest.networkPolicy.suppressedRequests, []);
      return true;
    },
  );
  assert.ok(response);
  assert.equal(response.continued, false);
  assert.equal(response.aborted, true);
  assert.equal(response.fulfilled, undefined);
});

test("swallowed action failures remain failed evidence and skip later flows while preserving artifacts", async (t) => {
  const root = await _createCaptureRoot(t);
  const { browser } = createFakeBrowser();
  const failure = await (async () => {
    try {
      await runCapture({
        root,
        browser,
        email: "user@example.test",
        password: "capture-test-password",
        flowIds: ["import", "explorer"],
        login: async () => {},
        flowMap: {
          import: async (ctx) => {
            try {
              await ctx.step("failed-save", async () => {
                throw new Error("Save failed with capture-test-password");
              });
            } catch {
              /* Exercise a swallowed action failure. */
            }
          },
          explorer: async () => {
            assert.fail("Later flow must not run");
          },
        },
      });
      return undefined;
    } catch (error) {
      return error;
    }
  })();
  assert.ok(failure instanceof CaptureRunError);
  assert.equal(failure.manifest.status, "failed");
  assert.deepEqual(failure.manifest.features.map(prop("status")), [
    "failed",
    "skipped",
  ]);
  assert.equal(failure.manifest.actions[0].status, "failed");
  assert.equal(failure.manifest.video.status, "saved");
  assert.equal(
    (await readFile(failure.manifestPath, "utf8")).includes(
      "capture-test-password",
    ),
    false,
  );
});
