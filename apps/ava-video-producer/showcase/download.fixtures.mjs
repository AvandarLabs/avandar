import assert from "node:assert/strict";
import { downloadFilm } from "./download.js";

/** Complete fictional DecisionFork content and selected export options. */
export const configuredExportRequest = {
  id: "decision-fork",
  options: {
    schemaVersion: 1,
    input: {
      prompt: "Where does the sketch belong?",
      branches: [
        { id: "rough", condition: "Still exploring", outcome: "Notebook" },
        { id: "ready", condition: "Ready to share", outcome: "Review" },
      ],
      selectedBranchId: "ready",
      scenarioLabel: "Fictional sketch",
      selectionLabel: "Selected",
      showUnchosenOutcomes: true,
    },
    accent: "#123456",
    background: "#ffffff",
    captions: false,
  },
};

/**
 * Deferred, no-network service replies retain real request ownership behavior.
 */
export function createMemoryExports(suite) {
  const requests = [];
  const downloads = [];
  const pending = [];
  installBrowserFixture(suite, downloads);
  suite.mock.method(globalThis, "fetch", (url, init) => {
    assert.equal(url, "/api/exports");
    assert.equal(init.method, "POST");
    return new Promise((resolve) => {
      requests.push({ body: JSON.parse(init.body), resolve });
    });
  });
  suite.beforeEach(() => {
    requests.length = downloads.length = pending.length = 0;
  });
  suite.afterEach(async () => {
    for (const entry of requests)
      entry.resolve(Response.json({ state: "failed" }));
    await Promise.allSettled(pending);
  });
  return {
    requests,
    downloads,
    start(request) {
      const promise = downloadFilm(request);
      pending.push(promise);
      void promise.catch(() => {});
      return promise;
    },
    complete(index, id, state = "complete") {
      requests[index].resolve(
        Response.json({
          id,
          state,
          message: state === "failed" ? "Frame check failed" : "Ready",
          download: `/${id}`,
        }),
      );
    },
  };
}

function installBrowserFixture(suite, downloads) {
  const originals = ["window", "document"].map((key) => [
    key,
    Object.getOwnPropertyDescriptor(globalThis, key),
  ]);
  globalThis.window = {
    location: { origin: "https://atlas.test", href: "https://atlas.test/" },
  };
  globalThis.document = {
    body: { append() {} },
    createElement: () => ({
      click() {
        downloads.push(this.href);
      },
      remove() {},
    }),
  };
  suite.after(() => {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
}
