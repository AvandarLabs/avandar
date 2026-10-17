import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";

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
