import assert from "node:assert/strict";
import {
  captureGlobals,
  restoreGlobals,
} from "../../__tests__/restoreGlobalsHelpers";
import { FilmDownloads, type DownloadStatus } from "../FilmDownloads";
import type { TestContext } from "node:test";

/** A request body the fixture export service receives. */
export type ExportRequest = {
  id: string;
  options: Record<string, unknown>;
};

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
} as const;

type PendingExport = {
  body: ExportRequest;
  resolve: (response: Response) => void;
};

/** The in-memory export service a suite drives one reply at a time. */
export type MemoryExports = {
  requests: PendingExport[];
  downloads: string[];
  start: (request: Readonly<ExportRequest>) => Promise<DownloadStatus>;
  complete: (
    options: Readonly<{ index: number; id: string; state?: string }>,
  ) => void;
};

/** A document whose created links record their address when clicked. */
export type DocumentFixture = {
  body: { append: () => void };
  createElement: () => {
    href: string;
    click: () => void;
    remove: () => void;
  };
};

/**
 * Creates an in-memory export service for one test suite. It stubs `fetch`
 * and the page globals, holds each export request until the test completes
 * it, and records each started download.
 *
 * Use it to check how `FilmDownloads.downloadFilm` shares or separates
 * overlapping requests, for example two exports whose options differ only in
 * key order.
 */
export function createMemoryExports(suite: TestContext): MemoryExports {
  const requests: PendingExport[] = [];
  const downloads: string[] = [];
  const pending: Array<Promise<DownloadStatus>> = [];
  installBrowserFixture(suite, downloads);
  suite.mock.method(globalThis, "fetch", (url: string, init: RequestInit) => {
    assert.equal(url, "/api/exports");
    assert.equal(init.method, "POST");
    return new Promise<Response>((resolve) => {
      requests.push({ body: JSON.parse(String(init.body)), resolve });
    });
  });
  suite.beforeEach(() => {
    requests.length = downloads.length = pending.length = 0;
  });
  suite.afterEach(async () => {
    requests.forEach((entry) => {
      entry.resolve(Response.json({ state: "failed" }));
    });
    await Promise.allSettled(pending);
  });
  return {
    requests,
    downloads,
    start: (request) => {
      const promise = FilmDownloads.downloadFilm(request);
      pending.push(promise);
      void promise.catch(() => {});
      return promise;
    },
    complete: ({ index, id, state = "complete" }) => {
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

/**
 * Replaces the browser globals a download touches with a fake page that
 * records each clicked download link.
 */
export function installBrowserFixture(
  suite: TestContext,
  downloads: string[],
): void {
  const originals = captureGlobals(["window", "document"]);
  Object.assign(globalThis, {
    window: {
      location: { origin: "https://atlas.test", href: "https://atlas.test/" },
    },
    document: createDocumentFixture(downloads),
  });
  suite.after(() => {
    restoreGlobals(originals);
  });
}

/** Creates a fake document that records each clicked download link. */
export function createDocumentFixture(downloads: string[]): DocumentFixture {
  return {
    body: { append: () => {} },
    createElement: () => {
      const link = {
        href: "",
        click: () => {
          downloads.push(link.href);
        },
        remove: () => {},
      };
      return link;
    },
  };
}
