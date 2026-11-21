import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { test, type TestContext } from "node:test";
import { propEq } from "@avandar/utils";
import { GlobalSnapshots } from "../../__tests__/GlobalSnapshots";
import { FilmDownloads } from "../FilmDownloads";
import { FilmDownloadFixtures } from "./FilmDownloadFixtures";

type Reply = {
  status?: number;
  wait?: Promise<unknown>;
  body: Record<string, unknown>;
};

type RecordedRequest = {
  method?: string;
  url?: string;
  body?: unknown;
};

type ExportService = {
  replies: Reply[];
  requests: RecordedRequest[];
  downloads: string[];
  origin: string;
};

/** A local export service that answers each request with the next reply. */
function _createReplyServer({
  replies,
  requests,
}: Readonly<{
  replies: Reply[];
  requests: RecordedRequest[];
}>): Server {
  return createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) {
      body += chunk;
    }
    requests.push({
      method: request.method,
      url: request.url,
      body: body ? JSON.parse(body) : undefined,
    });
    const reply = replies.shift() ?? {
      status: 500,
      body: { message: "Unexpected request" },
    };
    if (reply.wait) {
      await reply.wait;
    }
    response.writeHead(reply.status ?? 200, {
      "content-type": "application/json",
    });
    response.end(JSON.stringify(reply.body));
  });
}

/** A promise with its resolver, so a test can release it later. */
function _createGate(): {
  promise: Promise<void>;
  resolve: () => void;
} {
  let resolve = () => {};
  const promise = new Promise<void>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

/** Points fetch and the page globals at the local export service. */
function _installPage({
  origin,
  downloads,
}: Readonly<{
  origin: string;
  downloads: string[];
}>): void {
  const originalFetch = globalThis.fetch;
  Object.assign(globalThis, {
    fetch: (url: string, options?: RequestInit) => {
      return originalFetch(new URL(url, origin), options);
    },
    window: { location: { origin, href: `${origin}/index.html` } },
    document: FilmDownloadFixtures.makeDocumentFromDownloads(downloads),
  });
}

test("MP4 download requests", async (suite) => {
  const { originals, server, runningService } =
    await _createDownloadReplyService();
  try {
    await _verifyCompletion({
      suite,
      service: runningService,
    });
    await _verifyRetry({
      suite,
      service: runningService,
    });
    await _verifyFailure({
      suite,
      service: runningService,
    });
    await _verifyRefreshQueue({
      suite,
      service: runningService,
    });
  } finally {
    GlobalSnapshots.restoreGlobals(originals);
    await new Promise((resolve) => {
      return server.close(resolve);
    });
  }
});

/** A job that reports one running poll and then completes. */
const FIRST_JOB_REPLIES: readonly Reply[] = [
  { body: { id: "first-job", state: "running", message: "Rendering" } },
  {
    body: {
      id: "first-job",
      state: "complete",
      message: "Ready",
      download: "/api/exports/first-job/download",
    },
  },
];

async function _verifyCompletion({
  suite,
  service,
}: Readonly<{
  suite: TestContext;
  service: Readonly<ExportService>;
}>): Promise<void> {
  const { replies, requests, downloads, origin } = service;
  await suite.test(
    "waits for completion and submits the current captions choice once",
    async () => {
      replies.push(...FIRST_JOB_REPLIES);
      const statuses: string[] = [];
      const first = FilmDownloads.downloadFilm({
        id: "avandar-home",
        options: { captions: false },
        onStatus: (status) => {
          return statuses.push(status.state);
        },
      });
      let isRefreshed = false;
      FilmDownloads.afterDownloads(() => {
        isRefreshed = true;
      });
      assert.equal(isRefreshed, false);
      const duplicate = FilmDownloads.downloadFilm({
        id: "avandar-home",
        options: { captions: false },
      });
      assert.equal(downloads.length, 0);
      await Promise.all([first, duplicate]);
      assert.equal(isRefreshed, true);
      assert.equal(requests.filter(propEq("method", "POST")).length, 1);
      assert.deepEqual(requests[0].body, {
        id: "avandar-home",
        options: { captions: false },
      });
      assert.equal(requests[1].url, "/api/exports/first-job");
      assert.deepEqual(downloads, [`${origin}/api/exports/first-job/download`]);
      assert.ok(statuses.includes("running"));
      assert.equal(statuses.at(-1), "complete");
    },
  );
}

async function _verifyRetry({
  suite,
  service,
}: Readonly<{
  suite: TestContext;
  service: Readonly<ExportService>;
}>): Promise<void> {
  const { replies, downloads } = service;
  await suite.test(
    "a busy export can be retried without downloading the failed job",
    async () => {
      const downloadCount = downloads.length;
      replies.push({
        status: 409,
        body: { message: "An export is already running. Try again." },
      });
      await assert.rejects(
        FilmDownloads.downloadFilm({ id: "motion-lab" }),
        /already running/,
      );
      assert.equal(downloads.length, downloadCount);
      replies.push({
        body: {
          id: "retry-job",
          state: "complete",
          message: "Ready",
          download: "/api/exports/retry-job/download",
        },
      });
      await FilmDownloads.downloadFilm({ id: "motion-lab" });
      assert.equal(downloads.length, downloadCount + 1);
    },
  );
}

async function _verifyFailure({
  suite,
  service,
}: Readonly<{
  suite: TestContext;
  service: Readonly<ExportService>;
}>): Promise<void> {
  const { replies, downloads } = service;
  await suite.test(
    "failed rendering never starts a file download",
    async () => {
      const downloadCount = downloads.length;
      replies.push({
        body: {
          id: "failed-job",
          state: "failed",
          message: "Frame check failed",
        },
      });
      await assert.rejects(
        FilmDownloads.downloadFilm({ id: "scene-library" }),
        /Frame check failed/,
      );
      assert.equal(downloads.length, downloadCount);
    },
  );
}

/** Replies for two overlapping exports whose second completion is gated. */
function _queueOverlappingReplies({
  replies,
  secondGate,
}: Readonly<{
  replies: Reply[];
  secondGate: Promise<unknown>;
}>): void {
  const reply = (id: string, state: string) => {
    return {
      id,
      state,
      message: state === "running" ? "Rendering" : "Ready",
      ...(state === "complete"
        ? { download: `/api/exports/${id}/download` }
        : {}),
    };
  };
  replies.push(
    { body: reply("refresh-first", "running") },
    { body: reply("refresh-second", "running") },
    { body: reply("refresh-first", "complete") },
    { wait: secondGate, body: reply("refresh-second", "complete") },
  );
}

async function _verifyRefreshQueue({
  suite,
  service,
}: Readonly<{
  suite: TestContext;
  service: Readonly<ExportService>;
}>): Promise<void> {
  await suite.test(
    "source refresh also waits for an export started after waiting began",
    async () => {
      await _assertOverlappingRefreshDownloads(service);
    },
  );
}

async function _createDownloadReplyService(): Promise<
  Readonly<{
    originals: ReturnType<typeof GlobalSnapshots.captureGlobals>;
    server: ReturnType<typeof _createReplyServer>;
    runningService: ExportService;
  }>
> {
  const service: ExportService = {
    replies: [],
    requests: [],
    downloads: [],
    origin: "",
  };
  const originals = GlobalSnapshots.captureGlobals([
    "fetch",
    "window",
    "document",
  ]);
  const server = _createReplyServer({
    replies: service.replies,
    requests: service.requests,
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const runningService = {
    ...service,
    origin: `http://127.0.0.1:${address.port}`,
  };
  _installPage({
    origin: runningService.origin,
    downloads: runningService.downloads,
  });
  return { originals, server, runningService };
}

async function _assertOverlappingRefreshDownloads(
  service: Readonly<ExportService>,
): Promise<void> {
  const secondCompletionGate = _createGate();
  _queueOverlappingReplies({
    replies: service.replies,
    secondGate: secondCompletionGate.promise,
  });
  const firstStarted = _createGate();
  const firstDownload = FilmDownloads.downloadFilm({
    id: "refresh-first",
    onStatus: (status) => {
      if (status.id) {
        firstStarted.resolve();
      }
    },
  });
  await firstStarted.promise;
  let isRefreshed = false;
  const cancel = FilmDownloads.afterDownloads(() => {
    isRefreshed = true;
  });
  const secondDownload = FilmDownloads.downloadFilm({
    id: "refresh-second",
  });
  try {
    await firstDownload;
    await new Promise((resolve) => {
      return setImmediate(resolve);
    });
    assert.equal(isRefreshed, false);
    secondCompletionGate.resolve();
    await secondDownload;
    await new Promise((resolve) => {
      return setImmediate(resolve);
    });
    assert.equal(isRefreshed, true);
  } finally {
    secondCompletionGate.resolve();
    await secondDownload;
    cancel();
  }
}
