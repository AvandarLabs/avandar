import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import type {
  Browser,
  BrowserContext,
  BrowserContextOptions,
  Page,
  PageScreenshotOptions,
  Request,
  Route,
} from "@playwright/test";

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

/** What the mock recorded for one request sent through the network guard. */
export type DispatchResult = {
  continued: boolean;
  aborted: boolean;
  fulfilled?: FakeFulfillOptions;
};

/** Minimal stand-in for a Playwright `Video`; only `saveAs`/`path` are used. */
type FakeVideo = {
  saveAs: (path: string) => Promise<void>;
  path: () => Promise<string>;
};

/**
 * The screenshot options the mock reads. The rest of
 * `PageScreenshotOptions` is unused.
 */
type FakeScreenshotOptions = Pick<PageScreenshotOptions, "animations"> & {
  path: string;
};

/**
 * The subset of a Playwright `Page` the capture runner drives: navigation,
 * readiness waits, locator stubs for narration/password masking, and
 * screenshotting.
 */
type FakePage = Pick<Page, "url" | "waitForTimeout"> & {
  goto: (url: string) => Promise<void>;
  video: () => FakeVideo;
  evaluate: () => Promise<void>;
  locator: () => { innerText: () => Promise<string> };
  getByText: () => Record<string, never>;
  screenshot: (options: FakeScreenshotOptions) => Promise<void>;
};

/**
 * The subset of a Playwright `BrowserContext` the capture runner manages:
 * network routing for the policy guard, storage-state capture, and lifecycle.
 */
export type FakeContext = Pick<
  BrowserContext,
  "setDefaultTimeout" | "setDefaultNavigationTimeout" | "close"
> & {
  options: BrowserContextOptions;
  route: (pattern: string, handler: FakeRouteHandler) => Promise<void>;
  routeWebSocket: () => Promise<void>;
  dispatchRequest: (url: string, method?: string) => Promise<DispatchResult>;
  newPage: () => Promise<FakePage>;
  storageState: () => Promise<{
    cookies: Array<{ name: string; value: string }>;
    origins: unknown[];
  }>;
};

/**
 * The subset of a Playwright `Browser` the capture runner receives from its
 * caller.
 */
type FakeBrowser = Pick<Browser, "version" | "close"> & {
  newContext: (options?: BrowserContextOptions) => Promise<FakeContext>;
};

/**
 * The fake as the Playwright browser `runCapture` accepts. It implements only
 * the browser, context, and page members a capture run calls, so it cannot
 * satisfy Playwright's full types.
 */
function _asBrowser(browser: FakeBrowser): Browser {
  return browser as unknown as Browser;
}

/** A video that may only be saved after its context closed. */
function _createFakeVideo(events: string[], contextNumber: number): FakeVideo {
  return {
    saveAs: async (path: string) => {
      assert.ok(
        events.includes(`close-${contextNumber}`),
        "video must be finalized before saveAs",
      );
      events.push("video-save");
      await writeFile(path, "unit-test-video-placeholder");
    },
    path: async () => {
      throw new Error("remote video path unavailable");
    },
  };
}

/** A page that records waits and writes placeholder screenshots. */
function _createFakePage(events: string[], video: FakeVideo): FakePage {
  let currentUrl = "about:blank";
  return {
    goto: async (url: string) => {
      currentUrl = url;
    },
    url: () => {
      return currentUrl;
    },
    video: () => {
      return video;
    },
    evaluate: async () => {
      events.push("fonts-ready");
    },
    waitForTimeout: async (milliseconds: number) => {
      events.push(`settle-${milliseconds}`);
    },
    locator: () => {
      return {
        innerText: async () => {
          return "Visible result for user@example.test with capture-test-password";
        },
      };
    },
    getByText: () => {
      return {};
    },
    screenshot: async ({ path, animations }) => {
      assert.equal(animations, "disabled");
      await writeFile(path, "unit-test-image-placeholder");
    },
  };
}

/** Sends one request through the installed guard and records its outcome. */
async function _dispatchThroughGuard({
  routeHandler,
  url,
  method,
}: Readonly<{
  routeHandler: FakeRouteHandler | undefined;
  url: string;
  method: string;
}>): Promise<DispatchResult> {
  assert.ok(routeHandler, "network guard must be installed first");
  const result: DispatchResult = { continued: false, aborted: false };
  await routeHandler({
    request: () => {
      return {
        url: () => {
          return url;
        },
        method: () => {
          return method;
        },
        resourceType: () => {
          return "fetch";
        },
      };
    },
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
}

/** A browser context whose guard requests can be dispatched by hand. */
function _createFakeContext(
  events: string[],
  options: Readonly<{ contextNumber: number; settings: BrowserContextOptions }>,
): FakeContext {
  const page = _createFakePage(
    events,
    _createFakeVideo(events, options.contextNumber),
  );
  let routeHandler: FakeRouteHandler | undefined;
  return {
    options: options.settings,
    setDefaultTimeout() {},
    setDefaultNavigationTimeout() {},
    route: async (_pattern, handler) => {
      routeHandler = handler;
    },
    routeWebSocket: async () => {},
    dispatchRequest: (url: string, method = "POST") => {
      return _dispatchThroughGuard({ routeHandler, url, method });
    },
    newPage: async () => {
      return page;
    },
    storageState: async () => {
      return {
        cookies: [{ name: "session", value: "never-persist-this" }],
        origins: [],
      };
    },
    close: async () => {
      events.push(`close-${options.contextNumber}`);
    },
  };
}

/**
 * Creates a caller-owned fake browser that records lifecycle events and its
 * contexts. Use it to run `runCapture` without launching Chromium. The
 * returned `browser` is typed as the Playwright browser `runCapture`
 * accepts.
 */
export function createFakeBrowser(): {
  browser: Browser;
  events: string[];
  contexts: FakeContext[];
} {
  const events: string[] = [];
  const contexts: FakeContext[] = [];
  const browser: FakeBrowser = {
    version: () => {
      return "fake-browser-for-lifecycle-unit-test";
    },
    close: async () => {
      events.push("browser-close");
    },
    newContext: async (settings = {}) => {
      const context = _createFakeContext(events, {
        contextNumber: contexts.length,
        settings,
      });
      contexts.push(context);
      return context;
    },
  };
  return { browser: _asBrowser(browser), events, contexts };
}
