import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
// pdfjs-dist ships no declaration file for the worker entry point itself
// (only for the main `pdf.mjs` bundle), so this import is implicitly `any`.
// @ts-expect-error -- see comment above
import { WorkerMessageHandler } from "pdfjs-dist/legacy/build/pdf.worker.mjs";
import type { PDFDocumentProxy } from "pdfjs-dist";

// pdf.js normally off-loads parsing to its own nested worker, spawned from
// `GlobalWorkerOptions.workerSrc`. Spawning a worker from a worker is
// supported unevenly across browsers, so when this module is evaluated
// inside a worker (our sniff worker, per this feature's design) we register
// the worker's message handler directly on `globalThis` instead. pdf.js
// detects this ("mainThreadWorkerMessageHandler") and parses in-process
// rather than spawning anything.
//
// This is gated to worker contexts only. Registering it unconditionally
// would also force main-thread callers into in-process parsing -- a realm-
// wide side effect with no upside there, since a real browser main thread
// can spawn a nested worker safely. `typeof importScripts === "function"`
// is the standard worker-context feature test (a `DedicatedWorkerGlobalScope`
// instanceof check would throw under jsdom, since that global doesn't exist
// there). Vitest's jsdom environment reports `importScripts` as undefined,
// same as a real main thread, so this gate does not affect the test suite:
// pdf.js still parses successfully there because it separately detects
// Node (`process` is defined under jsdom too) and falls back to a dynamic
// `import()` of its own worker module, independent of this registration.
const globalWithPdfjsWorker = globalThis as {
  pdfjsWorker?: { WorkerMessageHandler: typeof WorkerMessageHandler };
};
if (typeof (globalThis as { importScripts?: unknown }).importScripts === "function") {
  globalWithPdfjsWorker.pdfjsWorker = { WorkerMessageHandler };
}

/**
 * Opens a PDF with pdf.js.
 *
 * The installed pdfjs-dist (6.x) dropped `PDFDocumentProxy.destroy()`; the
 * loading task is now the only thing with a `destroy()` method. We patch it
 * back onto the returned document so callers get the one-call cleanup the
 * pdf.js docs still describe, instead of having to thread the loading task
 * through separately.
 */
export async function loadPdfDocument(
  data: Uint8Array,
  options: Readonly<{ password?: string }> = {},
): Promise<PDFDocumentProxy & { destroy: () => Promise<void> }> {
  const loadingTask = pdfjs.getDocument({
    data,
    password: options.password,
    useWorkerFetch: false,
    // Needed for getStructTree() to be populated.
    disableAutoFetch: false,
  });

  const doc = await loadingTask.promise;

  return Object.assign(doc, {
    destroy: () => {
      return loadingTask.destroy();
    },
  });
}
