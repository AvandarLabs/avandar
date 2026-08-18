/**
 * Worker that reads a PDF's page geometry without blocking the main thread.
 *
 * Lifecycle: main thread sends
 * `{ type: "sniff", file, pageRange?, password? }`, the worker posts zero or
 * more `progress` messages, then one `result` or `error`, then closes. One
 * worker per import, matching `xlsxSniff.worker.ts`.
 *
 * Why this is a worker: reading every page's text and operator list is, for a
 * 200-page statistical publication, seconds of pure JS. On the main thread
 * that freezes input and animation.
 *
 * Deliberately knows nothing about tables, regions or extraction. It answers
 * one question ("what is on these pages") so that later phases can add
 * extraction without touching the page loop or the error taxonomy.
 */
import { detectTextLayer } from "./pdfSniff/detectTextLayer";
import { extractPageGeometry } from "./pdfSniff/extractPageGeometry";
import { loadPdfDocument } from "./pdfSniff/loadPdfJs";
import type { PageGeometry } from "./pdfSniff/types";

/**
 * Hard cap on pages read when the user has not chosen a range. Beyond this we
 * stop and ask for a range rather than grinding for a minute.
 */
const MAX_PAGES_WITHOUT_RANGE = 50;

type SniffRequest = {
  type: "sniff";
  file: File;
  /** Inclusive, one-based, as the user would type it. */
  pageRange?: readonly [number, number];
  password?: string;
};

export type PdfSniffResult = {
  type: "result";
  pageCount: number;
  /** Geometry for the pages actually read, in page order. */
  pages: readonly PageGeometry[];
};

export type PdfSniffProgress = {
  type: "progress";
  pagesScanned: number;
  totalPages: number;
};

export type PdfSniffError = {
  type: "error";
  /**
   * Machine-readable so the UI can render a specific explanation rather than
   * a generic failure. Every one of these is a different conversation with
   * the user.
   */
  reason:
    | "no_text_layer"
    | "unreliable_text"
    | "password_required"
    | "too_many_pages"
    | "unknown";
  message: string;
  detail?: Record<string, unknown>;
};

type SniffResponse = PdfSniffResult | PdfSniffProgress | PdfSniffError;

function _post(message: SniffResponse): void {
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(message);
}

function _close(): void {
  (self as unknown as DedicatedWorkerGlobalScope).close();
}

self.addEventListener("message", async (event: MessageEvent<SniffRequest>) => {
  const request = event.data;
  if (request.type !== "sniff") {
    return;
  }

  try {
    const bytes = new Uint8Array(await request.file.arrayBuffer());
    const doc = await loadPdfDocument(bytes, { password: request.password });

    const [rangeStart, rangeEnd] = request.pageRange ?? [1, doc.numPages];
    const firstPage = Math.max(1, rangeStart);
    const lastPage = Math.min(doc.numPages, rangeEnd);
    const pageCountToScan = lastPage - firstPage + 1;

    if (!request.pageRange && pageCountToScan > MAX_PAGES_WITHOUT_RANGE) {
      _post({
        type: "error",
        reason: "too_many_pages",
        message:
          `This PDF has ${doc.numPages} pages. Choose a page range so we ` +
          "only read the part you need.",
        detail: { pageCount: doc.numPages },
      });
      _close();
      return;
    }

    const pages: PageGeometry[] = [];

    // Pages are read sequentially on purpose, so the await-in-loop here is
    // deliberate rather than an oversight. Two reasons: progress has to be
    // reported page by page, which a Promise.all cannot do; and a large
    // document read in parallel holds every page's geometry and pdf.js's
    // internal page objects in memory at once, which is exactly the case the
    // page-range cap exists to avoid.
    for (let pageNumber = firstPage; pageNumber <= lastPage; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      pages.push(await extractPageGeometry(page, pageNumber - 1));

      _post({
        type: "progress",
        pagesScanned: pageNumber - firstPage + 1,
        totalPages: pageCountToScan,
      });
    }

    // The text-layer check runs on collected geometry rather than per page,
    // because a document is only unusable when EVERY page is a scan.
    const textLayer = detectTextLayer(pages);
    if (textLayer.status === "no_text_layer") {
      _post({
        type: "error",
        reason: "no_text_layer",
        message:
          "This PDF has no text layer. It looks like a scan or photo of a " +
          "document, and we can only extract data from PDFs that contain " +
          "real text. Try re-exporting from the original source, or run OCR " +
          "first. OCR support is planned.",
        detail: {
          scannedPageCount: textLayer.scannedPageCount,
          totalPageCount: textLayer.totalPageCount,
        },
      });
      _close();
      return;
    }
    if (textLayer.status === "unreliable_text") {
      _post({
        type: "error",
        reason: "unreliable_text",
        message:
          "This PDF's text cannot be read reliably. Its embedded fonts do " +
          "not map cleanly to characters, so extracted values would be " +
          "garbled. Try re-exporting it from the original source.",
        detail: { unmappedCharRatio: textLayer.unmappedCharRatio },
      });
      _close();
      return;
    }

    _post({ type: "result", pageCount: doc.numPages, pages });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const isPasswordError = /password/i.test(message);
    _post({
      type: "error",
      reason: isPasswordError ? "password_required" : "unknown",
      message:
        isPasswordError ?
          "This PDF is password protected. Enter its password to continue."
        : message,
    });
  } finally {
    _close();
  }
});
