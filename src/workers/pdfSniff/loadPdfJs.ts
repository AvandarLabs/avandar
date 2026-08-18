import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
// pdfjs-dist ships no declaration file for the worker entry point itself
// (only for the main `pdf.mjs` bundle), so this import is implicitly `any`.
// @ts-expect-error -- see comment above
import { WorkerMessageHandler } from "pdfjs-dist/legacy/build/pdf.worker.mjs";
import type { PDFDocumentProxy } from "pdfjs-dist";

// pdf.js normally off-loads parsing to its own nested worker, spawned from
// `GlobalWorkerOptions.workerSrc`. This code already runs inside our sniff
// worker, and spawning a worker from a worker is supported unevenly across
// browsers, so we register the worker's message handler directly on
// `globalThis` instead. pdf.js detects this ("mainThreadWorkerMessageHandler")
// and runs the parser in-process rather than spawning anything.
const globalWithPdfjsWorker = globalThis as {
  pdfjsWorker?: { WorkerMessageHandler: typeof WorkerMessageHandler };
};
globalWithPdfjsWorker.pdfjsWorker = { WorkerMessageHandler };

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
  options: { password?: string } = {},
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
