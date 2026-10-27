import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import {
  configuredExportRequest,
  createMemoryExports,
} from "./download.fixtures.mjs";

const { downloadFilm, afterDownloads } = await import(
  new URL("./download.js", import.meta.url)
);

test("MP4 download requests", async (suite) => {
  const requests = [];
  const downloads = [];
  const replies = [];
  const originals = new Map(
    ["fetch", "window", "document"].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    requests.push({
      method: request.method,
      url: request.url,
      body: body ? JSON.parse(body) : null,
    });
    const reply = replies.shift() || {
      status: 500,
      body: { message: "Unexpected request" },
    };
    if (reply.wait) await reply.wait;
    response.writeHead(reply.status ?? 200, {
      "content-type": "application/json",
    });
    response.end(JSON.stringify(reply.body));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (url, options) =>
    originalFetch(new URL(url, origin), options);
  globalThis.window = { location: { origin, href: `${origin}/index.html` } };
  globalThis.document = {
    body: { append() {} },
    createElement() {
      return {
        click() {
          downloads.push(this.href);
        },
        remove() {},
      };
    },
  };
  try {
    await verifyCompletion(suite, { replies, requests, downloads, origin });
    await verifyRetry(suite, { replies, downloads });
    await verifyFailure(suite, { replies, downloads });
    await verifyRefreshQueue(suite, { replies });
  } finally {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
    await new Promise((resolve) => server.close(resolve));
  }
});

async function verifyCompletion(
  suite,
  { replies, requests, downloads, origin },
) {
  await suite.test(
    "waits for completion and submits the current captions choice once",
    async () => {
      replies.push(
        { body: { id: "first-job", state: "running", message: "Rendering" } },
        {
          body: {
            id: "first-job",
            state: "complete",
            message: "Ready",
            download: "/api/exports/first-job/download",
          },
        },
      );
      const statuses = [];
      const first = downloadFilm({
        id: "avandar-home",
        options: { captions: false },
        onStatus: (status) => statuses.push(status.state),
      });
      let refreshed = false;
      afterDownloads(() => {
        refreshed = true;
      });
      assert.equal(refreshed, false);
      const duplicate = downloadFilm({
        id: "avandar-home",
        options: { captions: false },
      });
      assert.equal(downloads.length, 0);
      await Promise.all([first, duplicate]);
      assert.equal(refreshed, true);
      assert.equal(
        requests.filter((request) => request.method === "POST").length,
        1,
      );
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

async function verifyRetry(suite, { replies, downloads }) {
  await suite.test(
    "a busy export can be retried without downloading the failed job",
    async () => {
      const downloadCount = downloads.length;
      replies.push({
        status: 409,
        body: { message: "An export is already running. Try again." },
      });
      await assert.rejects(
        downloadFilm({ id: "motion-lab" }),
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
      await downloadFilm({ id: "motion-lab" });
      assert.equal(downloads.length, downloadCount + 1);
    },
  );
}

async function verifyFailure(suite, { replies, downloads }) {
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
        downloadFilm({ id: "scene-library" }),
        /Frame check failed/,
      );
      assert.equal(downloads.length, downloadCount);
    },
  );
}

async function verifyRefreshQueue(suite, { replies }) {
  await suite.test(
    "source refresh also waits for an export started after waiting began",
    async () => {
      let releaseSecond;
      const secondGate = new Promise((resolve) => {
        releaseSecond = resolve;
      });
      replies.push(
        {
          body: { id: "refresh-first", state: "running", message: "Rendering" },
        },
        {
          body: {
            id: "refresh-second",
            state: "running",
            message: "Rendering",
          },
        },
        {
          body: {
            id: "refresh-first",
            state: "complete",
            message: "Ready",
            download: "/api/exports/refresh-first/download",
          },
        },
        {
          wait: secondGate,
          body: {
            id: "refresh-second",
            state: "complete",
            message: "Ready",
            download: "/api/exports/refresh-second/download",
          },
        },
      );
      let startedFirst;
      const firstReady = new Promise((resolve) => {
        startedFirst = resolve;
      });
      const first = downloadFilm({
        id: "refresh-first",
        onStatus: (status) => {
          if (status.id) startedFirst();
        },
      });
      await firstReady;
      let refreshed = false;
      const cancel = afterDownloads(() => {
        refreshed = true;
      });
      const second = downloadFilm({ id: "refresh-second" });
      try {
        await first;
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(refreshed, false);
        releaseSecond();
        await second;
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(refreshed, true);
      } finally {
        releaseSecond();
        await second;
        cancel();
      }
    },
  );
}

test("configured MP4 request ownership", async (suite) => {
  const exports = createMemoryExports(suite);
  const request = configuredExportRequest;
  for (const [name, change] of [
    [
      "authored input",
      {
        input: {
          ...request.options.input,
          prompt: "Where should this draft go?",
        },
      },
    ],
    [
      "array order",
      {
        input: {
          ...request.options.input,
          branches: [...request.options.input.branches].reverse(),
        },
      },
    ],
    ["schema version", { schemaVersion: 2 }],
    ["accent", { accent: "#654321" }],
    ["background", { background: "#000000" }],
    ["caption choice", { captions: true }],
    ["additional options", { quality: "high" }],
    ["value types", { values: ["12", 12, null, false] }],
  ]) {
    await verifyOverlappingRequests(suite, exports, request, name, change);
  }
  await verifyIdenticalRequests(suite, exports, request);
  await verifyReorderedRequest(suite, exports, request);
  await verifyRequestCleanup(suite, exports, request);
});

async function verifyOverlappingRequests(
  suite,
  exports,
  request,
  name,
  change,
) {
  await suite.test(`keeps overlapping ${name} exports separate`, async () => {
    const first = exports.start(request);
    const secondRequest = {
      ...request,
      options: { ...request.options, ...change },
    };
    const second = exports.start(secondRequest);
    let refreshed = false;
    afterDownloads(() => {
      refreshed = true;
    });
    assert.deepEqual(
      exports.requests.map(({ body }) => body),
      [request, secondRequest],
    );
    exports.complete(1, "second");
    assert.equal((await second).id, "second");
    assert.equal(refreshed, false);
    assert.deepEqual(exports.downloads, ["https://atlas.test/second"]);
    exports.complete(0, "first");
    assert.equal((await first).id, "first");
    assert.equal(refreshed, true);
    assert.deepEqual(exports.downloads, [
      "https://atlas.test/second",
      "https://atlas.test/first",
    ]);
  });
}

async function verifyIdenticalRequests(suite, exports, request) {
  await suite.test(
    "coalesces identical separately allocated requests",
    async () => {
      const first = exports.start(request);
      const duplicate = exports.start(JSON.parse(JSON.stringify(request)));
      assert.equal(exports.requests.length, 1);
      exports.complete(0, "shared");
      assert.equal((await first).id, "shared");
      assert.equal((await duplicate).id, "shared");
      assert.deepEqual(exports.downloads, ["https://atlas.test/shared"]);
    },
  );
}

async function verifyReorderedRequest(suite, exports, request) {
  await suite.test(
    "coalesces identical requests with reordered object keys",
    async () => {
      const first = exports.start(request);
      const duplicate = exports.start({
        options: {
          captions: false,
          background: "#ffffff",
          accent: "#123456",
          input: {
            showUnchosenOutcomes: true,
            selectionLabel: "Selected",
            scenarioLabel: "Fictional sketch",
            selectedBranchId: "ready",
            branches: [
              {
                outcome: "Notebook",
                condition: "Still exploring",
                id: "rough",
              },
              { outcome: "Review", condition: "Ready to share", id: "ready" },
            ],
            prompt: "Where does the sketch belong?",
          },
          schemaVersion: 1,
        },
        id: "decision-fork",
      });
      assert.equal(exports.requests.length, 1);
      exports.complete(0, "reordered");
      await Promise.all([first, duplicate]);
      assert.deepEqual(exports.downloads, ["https://atlas.test/reordered"]);
    },
  );
}

async function verifyRequestCleanup(suite, exports, request) {
  for (const state of ["complete", "failed"]) {
    await suite.test(
      `clears ${state} requests so they can be retried`,
      async () => {
        const first = exports.start(request);
        exports.complete(0, "settled", state);
        if (state === "complete") await first;
        else await assert.rejects(first, /Frame check failed/);
        const retry = exports.start(request);
        assert.equal(exports.requests.length, 2);
        exports.complete(1, "retried");
        assert.equal((await retry).id, "retried");
        assert.equal(exports.downloads.at(-1), "https://atlas.test/retried");
      },
    );
  }
}
