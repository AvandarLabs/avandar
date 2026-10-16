import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import type {
  Browser,
  BrowserContext,
  BrowserContextOptions,
  Page,
  PageScreenshotOptions,
  Request,
  Route,
} from "@playwright/test";
import {
  CaptureRunError,
  runCapture,
} from "../scripts/capture-avandar/capture-avandar.mjs";

/** The subset of a Playwright `Request` the network-policy mock inspects. */
type FakeRequest = Pick<Request, "url" | "method" | "resourceType">;

/**
 * The subset of a Playwright `Route` the network-policy mock exercises.
 * `request` is narrowed to `FakeRequest` since the mock never builds a full
 * `Request`.
 */
type FakeRoute = Pick<Route, "continue" | "abort" | "fulfill"> & {
  request: () => FakeRequest;
};

type FakeRouteHandler = (route: FakeRoute) => Promise<void>;

/** The `route.fulfill()` options the mock actually records. */
type FakeFulfillOptions = Pick<
  NonNullable<Parameters<Route["fulfill"]>[0]>,
  "status" | "contentType" | "body" | "headers"
>;

interface DispatchResult {
  continued: boolean;
  aborted: boolean;
  fulfilled?: FakeFulfillOptions;
}

/** Minimal stand-in for a Playwright `Video`; only `saveAs`/`path` are used. */
interface FakeVideo {
  saveAs: (path: string) => Promise<void>;
  path: () => Promise<string>;
}

/** The screenshot options the mock reads; the rest of `PageScreenshotOptions` is unused. */
type FakeScreenshotOptions = Pick<PageScreenshotOptions, "animations"> & {
  path: string;
};

/**
 * The subset of a Playwright `Page` the capture runner drives: navigation,
 * readiness waits, locator stubs for narration/password masking, and
 * screenshotting.
 */
interface FakePage extends Pick<Page, "url" | "waitForTimeout"> {
  goto: (url: string) => Promise<void>;
  video: () => FakeVideo;
  evaluate: () => Promise<void>;
  locator: () => { innerText: () => Promise<string> };
  getByText: () => Record<string, never>;
  screenshot: (options: FakeScreenshotOptions) => Promise<void>;
}

/**
 * The subset of a Playwright `BrowserContext` the capture runner manages:
 * network routing for the policy guard, storage-state capture, and lifecycle.
 */
interface FakeContext
  extends Pick<
    BrowserContext,
    "setDefaultTimeout" | "setDefaultNavigationTimeout" | "close"
  > {
  options: BrowserContextOptions;
  route: (pattern: string, handler: FakeRouteHandler) => Promise<void>;
  routeWebSocket: () => Promise<void>;
  dispatchRequest: (url: string, method?: string) => Promise<DispatchResult>;
  newPage: () => Promise<FakePage>;
  storageState: () => Promise<{
    cookies: Array<{ name: string; value: string }>;
    origins: unknown[];
  }>;
}

/** The subset of a Playwright `Browser` the capture runner receives from its caller. */
interface FakeBrowser extends Pick<Browser, "version" | "close"> {
  newContext: (options?: BrowserContextOptions) => Promise<FakeContext>;
}

function fakeBrowser(): {
  browser: FakeBrowser;
  events: string[];
  contexts: FakeContext[];
} {
  const events: string[] = [];
  const contexts: FakeContext[] = [];
  const browser: FakeBrowser = {
    version: () => "fake-browser-for-lifecycle-unit-test",
    close: async () => {
      events.push("browser-close");
    },
    newContext: async (options) => {
      const number = contexts.length;
      let currentUrl = "about:blank";
      let routeHandler: FakeRouteHandler | undefined;
      const video: FakeVideo = {
        saveAs: async (path: string) => {
          assert.ok(
            events.includes(`close-${number}`),
            "video must be finalized before saveAs",
          );
          events.push("video-save");
          await writeFile(path, "unit-test-video-placeholder");
        },
        path: async () => {
          throw new Error("remote video path unavailable");
        },
      };
      const page: FakePage = {
        goto: async (url: string) => {
          currentUrl = url;
        },
        url: () => currentUrl,
        video: () => video,
        evaluate: async () => {
          events.push("fonts-ready");
        },
        waitForTimeout: async (milliseconds: number) => {
          events.push(`settle-${milliseconds}`);
        },
        locator: () => ({
          innerText: async () =>
            "Visible result for user@example.test with capture-test-password",
        }),
        getByText: () => ({}),
        screenshot: async ({ path, animations }) => {
          assert.equal(animations, "disabled");
          await writeFile(path, "unit-test-image-placeholder");
        },
      };
      const context: FakeContext = {
        options: options ?? {},
        setDefaultTimeout() {},
        setDefaultNavigationTimeout() {},
        route: async (_pattern, handler) => {
          routeHandler = handler;
        },
        routeWebSocket: async () => {},
        dispatchRequest: async (url: string, method = "POST") => {
          assert.ok(routeHandler, "network guard must be installed first");
          const result: DispatchResult = { continued: false, aborted: false };
          await routeHandler({
            request: () => ({
              url: () => url,
              method: () => method,
              resourceType: () => "fetch",
            }),
            continue: async () => {
              result.continued = true;
            },
            abort: async () => {
              result.aborted = true;
            },
            fulfill: async (response) => {
              result.fulfilled = response;
            },
          });
          return result;
        },
        newPage: async () => page,
        storageState: async () => ({
          cookies: [{ name: "session", value: "never-persist-this" }],
          origins: [],
        }),
        close: async () => {
          events.push(`close-${number}`);
        },
      };
      contexts.push(context);
      return context;
    },
  };
  return { browser, events, contexts };
}

async function captureFixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), "capture-run-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "demo-data"));
  await writeFile(join(root, "demo-data", "cases.csv"), "id\n1\n");
  return root;
}

test("runner keeps auth in memory, records after login, logs actions, finalizes video, and preserves caller browser", async (t) => {
  const root = await captureFixture(t);
  const { browser, events, contexts } = fakeBrowser();
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
      import: async (ctx: any) => {
        assert.equal(await ctx.step("read-result", async () => 42), 42);
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
    contexts.every((context) => context.options.serviceWorkers === "block"),
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
  ])
    assert.equal(manifest.includes(secret), false);
  assert.ok(result.manifest.checkpoints[0].text);
  const text = await readFile(
    join(result.runDir, result.manifest.checkpoints[0].text.path),
    "utf8",
  );
  assert.equal(text.includes("user@example.test"), false);
  assert.equal(text.includes("capture-test-password"), false);
});

test("feedback widget is fulfilled locally in both contexts and logged without invalidating evidence", async (t) => {
  const root = await captureFixture(t);
  const { browser, contexts } = fakeBrowser();
  const endpoint =
    "https://avandar.featurebase.app/api/v1/feedback/widget/config";
  const responses: any[] = [];
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
      import: async (ctx: any) => {
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
    result.manifest.networkPolicy.suppressedRequests.every(
      (request: any) =>
        request.sourceUrl === endpoint &&
        request.reason === "nonessential-feedback-widget",
    ),
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
    assert.equal(response.fulfilled.status, 200);
    assert.equal(response.fulfilled.contentType, "application/json");
    assert.deepEqual(JSON.parse(response.fulfilled.body), {});
  }
  assert.equal(
    (await readFile(result.manifestPath, "utf8")).includes("[invalid source]"),
    false,
  );
});

test("unknown external writes still fail capture and retain a useful source URL", async (t) => {
  const root = await captureFixture(t);
  const { browser, contexts } = fakeBrowser();
  const endpoint = "https://avandar.featurebase.app/api/v1/feedback/submit";
  let response: any;
  await assert.rejects(
    runCapture({
      root,
      browser,
      email: "user@example.test",
      password: "avandar",
      flowIds: ["import"],
      login: async () => {},
      flowMap: {
        import: async (ctx: any) => {
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
  assert.equal(response.continued, false);
  assert.equal(response.aborted, true);
  assert.equal(response.fulfilled, undefined);
});

test("swallowed action failures remain failed evidence and skip later flows while preserving artifacts", async (t) => {
  const root = await captureFixture(t);
  const { browser } = fakeBrowser();
  let failure: any;
  try {
    await runCapture({
      root,
      browser,
      email: "user@example.test",
      password: "capture-test-password",
      flowIds: ["import", "explorer"],
      login: async () => {},
      flowMap: {
        import: async (ctx: any) => {
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
  } catch (error) {
    failure = error;
  }
  assert.ok(failure instanceof CaptureRunError);
  assert.equal(failure.manifest.status, "failed");
  assert.deepEqual(
    failure.manifest.features.map((feature: any) => feature.status),
    ["failed", "skipped"],
  );
  assert.equal(failure.manifest.actions[0].status, "failed");
  assert.equal(failure.manifest.video.status, "saved");
  assert.equal(
    (await readFile(failure.manifestPath, "utf8")).includes(
      "capture-test-password",
    ),
    false,
  );
});
