import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { prop } from "@avandar/utils";
import { FilmDownloads } from "../FilmDownloads";
import {
  configuredExportRequest,
  type ExportRequest,
  type MemoryExports,
  FilmDownloadFixtures,
} from "./FilmDownloadFixtures";

type OverlappingRequestCase = {
  suite: TestContext;
  exports: MemoryExports;
  request: ExportRequest;
  name: string;
  change: Record<string, unknown>;
};

type RequestCase = {
  suite: TestContext;
  exports: MemoryExports;
  request: ExportRequest;
};

/** Option changes that each make an export distinct from the configured one. */
const DISTINCT_OPTION_CHANGES: ReadonlyArray<
  readonly [string, Record<string, unknown>]
> = [
  [
    "authored input",
    {
      input: {
        ...configuredExportRequest.options.input,
        prompt: "Where should this draft go?",
      },
    },
  ],
  [
    "array order",
    {
      input: {
        ...configuredExportRequest.options.input,
        branches: [...configuredExportRequest.options.input.branches].reverse(),
      },
    },
  ],
  ["schema version", { schemaVersion: 2 }],
  ["accent", { accent: "#654321" }],
  ["background", { background: "#000000" }],
  ["caption choice", { captions: true }],
  ["additional options", { quality: "high" }],
  ["value types", { values: ["12", 12, null, false] }],
];

test("configured MP4 request ownership", async (suite) => {
  const exports = FilmDownloadFixtures.makeMemoryExports(suite);
  for (const [name, change] of DISTINCT_OPTION_CHANGES) {
    await _verifyOverlappingRequests({
      suite,
      exports,
      request: configuredExportRequest,
      name,
      change,
    });
  }
  await _verifyIdenticalRequests({
    suite,
    exports,
    request: configuredExportRequest,
  });
  await _verifyReorderedRequest({
    suite,
    exports,
    request: configuredExportRequest,
  });
  await _verifyRequestCleanup({
    suite,
    exports,
    request: configuredExportRequest,
  });
});

async function _verifyOverlappingRequests({
  suite,
  exports,
  request,
  name,
  change,
}: Readonly<OverlappingRequestCase>): Promise<void> {
  await suite.test(`keeps overlapping ${name} exports separate`, async () => {
    const first = exports.start(request);
    const secondRequest = {
      ...request,
      options: { ...request.options, ...change },
    };
    const second = exports.start(secondRequest);
    let isRefreshed = false;
    FilmDownloads.afterDownloads(() => {
      isRefreshed = true;
    });
    assert.deepEqual(exports.requests.map(prop("body")), [
      request,
      secondRequest,
    ]);
    exports.complete({ index: 1, id: "second" });
    assert.equal((await second).id, "second");
    assert.equal(isRefreshed, false);
    assert.deepEqual(exports.downloads, ["https://atlas.test/second"]);
    exports.complete({ index: 0, id: "first" });
    assert.equal((await first).id, "first");
    assert.equal(isRefreshed, true);
    assert.deepEqual(exports.downloads, [
      "https://atlas.test/second",
      "https://atlas.test/first",
    ]);
  });
}

async function _verifyIdenticalRequests({
  suite,
  exports,
  request,
}: Readonly<RequestCase>): Promise<void> {
  await suite.test(
    "coalesces identical separately allocated requests",
    async () => {
      const first = exports.start(request);
      const duplicate = exports.start(structuredClone(request));
      assert.equal(exports.requests.length, 1);
      exports.complete({ index: 0, id: "shared" });
      assert.equal((await first).id, "shared");
      assert.equal((await duplicate).id, "shared");
      assert.deepEqual(exports.downloads, ["https://atlas.test/shared"]);
    },
  );
}

/** The configured request with every object's keys written in reverse. */
const REORDERED_REQUEST: ExportRequest = {
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
        { outcome: "Notebook", condition: "Still exploring", id: "rough" },
        { outcome: "Review", condition: "Ready to share", id: "ready" },
      ],
      prompt: "Where does the sketch belong?",
    },
    schemaVersion: 1,
  },
  id: "decision-fork",
};

async function _verifyReorderedRequest({
  suite,
  exports,
  request,
}: Readonly<RequestCase>): Promise<void> {
  await suite.test(
    "coalesces identical requests with reordered object keys",
    async () => {
      const first = exports.start(request);
      const duplicate = exports.start(REORDERED_REQUEST);
      assert.equal(exports.requests.length, 1);
      exports.complete({ index: 0, id: "reordered" });
      await Promise.all([first, duplicate]);
      assert.deepEqual(exports.downloads, ["https://atlas.test/reordered"]);
    },
  );
}

async function _verifyRequestCleanup({
  suite,
  exports,
  request,
}: Readonly<RequestCase>): Promise<void> {
  for (const state of ["complete", "failed"]) {
    await suite.test(
      `clears ${state} requests so they can be retried`,
      async () => {
        const first = exports.start(request);
        exports.complete({ index: 0, id: "settled", state });
        if (state === "complete") {
          await first;
        } else {
          await assert.rejects(first, /Frame check failed/);
        }
        const retry = exports.start(request);
        assert.equal(exports.requests.length, 2);
        exports.complete({ index: 1, id: "retried" });
        assert.equal((await retry).id, "retried");
        assert.equal(exports.downloads.at(-1), "https://atlas.test/retried");
      },
    );
  }
}
