import type {
  PdfExtractResult,
  PdfSniffError,
  PdfSniffProgress,
  PdfSniffResult,
} from "@/workers/pdfSniff.worker/pdfSniff.worker";
import type {
  DocumentMetadata,
  PageGeometry,
  PdfRegion,
} from "@/workers/pdfSniff/pdfSniff.types";

// eslint-disable-next-line import-x/extensions
import PdfSniffWorker from "@/workers/pdfSniff.worker/pdfSniff.worker.ts?worker";

/**
 * Thrown when the worker rejects a document for a specific, explainable
 * reason. Carries the machine-readable code so the import form can render the
 * right guidance rather than a generic failure.
 */
export class PdfSniffRejection extends Error {
  readonly reason: PdfSniffError["reason"];
  readonly detail: Record<string, unknown> | undefined;

  constructor(error: PdfSniffError) {
    super(error.message);
    this.name = "PdfSniffRejection";
    this.reason = error.reason;
    this.detail = error.detail;
  }
}

type PdfSniffResponse =
  | PdfSniffResult
  | PdfExtractResult
  | PdfSniffProgress
  | PdfSniffError;

/**
 * Whether a message on the worker port is one of ours.
 *
 * The port is shared. `loadPdfDocument.ts` imports `pdf.worker.mjs` inside the
 * sniff worker, which makes pdf.js install its own handler on the same
 * global scope and post its internal protocol traffic (starting with
 * `{ action: "ready" }`) back to this listener. Those messages are not
 * responses to our request and must be ignored rather than interpreted; the
 * worker side already ignores foreign messages the same way
 * (`request.type !== "sniff"`).
 */
function _isPdfSniffResponse(data: unknown): data is PdfSniffResponse {
  if (typeof data !== "object" || data === null || !("type" in data)) {
    return false;
  }
  const { type } = data as { type: unknown };
  return (
    type === "progress" ||
    type === "result" ||
    type === "extract_result" ||
    type === "error"
  );
}

/**
 * Main-thread driver for the PDF sniff worker. Owns one worker per call,
 * spawns it, awaits the result, and terminates. Mirrors `sniffXlsxFile`.
 *
 * The worker self-closes after replying, so the `terminate()` here is a
 * defensive fallback for the error path.
 */
export async function sniffPdfFile(params: {
  file: File;
  pageRange?: readonly [number, number];
  password?: string;
  onProgress?: (progress: PdfSniffProgress) => void;
}): Promise<PdfSniffResult> {
  const worker = new PdfSniffWorker();
  try {
    return await new Promise<PdfSniffResult>((resolve, reject) => {
      worker.addEventListener("message", (event: MessageEvent<unknown>) => {
        const data = event.data;

        // Anything pdf.js posts on this shared port would otherwise fall
        // through to the reject below, which made every PDF import fail
        // with an empty-message rejection.
        if (!_isPdfSniffResponse(data)) {
          return;
        }

        if (data.type === "progress") {
          params.onProgress?.(data);
          return;
        }
        if (data.type === "result") {
          resolve(data);
          return;
        }
        if (data.type === "error") {
          reject(new PdfSniffRejection(data));
        }
      });
      worker.addEventListener(
        "error",
        (event) => {
          reject(new Error(event.message || "PDF sniff worker errored"));
        },
        { once: true },
      );
      worker.postMessage({
        type: "sniff",
        file: params.file,
        pageRange: params.pageRange,
        password: params.password,
      });
    });
  } finally {
    worker.terminate();
  }
}

/**
 * Extracts the selected regions.
 *
 * Separate from `sniffPdfFile` because the user re-extracts every time they
 * adjust a box or change a shape, and re-reading the whole document for that
 * would make the UI feel broken. The geometry the sniff already produced is
 * sent back to the worker instead.
 */
export async function extractPdfRegions(params: {
  pages: readonly PageGeometry[];
  regions: readonly PdfRegion[];
  documentMetadata: DocumentMetadata;
  outputMode?: "natural" | "observations";
}): Promise<PdfExtractResult> {
  const worker = new PdfSniffWorker();
  try {
    return await new Promise<PdfExtractResult>((resolve, reject) => {
      worker.addEventListener("message", (event: MessageEvent<unknown>) => {
        const data = event.data;

        // Same shared-port discipline as `sniffPdfFile`: pdf.js posts its own
        // protocol traffic here, and rejecting on it would fail every
        // extraction in a real browser while every unit test still passed.
        if (!_isPdfSniffResponse(data)) {
          return;
        }

        if (data.type === "extract_result") {
          resolve(data);
          return;
        }
        if (data.type === "error") {
          reject(new PdfSniffRejection(data));
        }
      });
      worker.addEventListener(
        "error",
        (event) => {
          reject(new Error(event.message || "PDF extract worker errored"));
        },
        { once: true },
      );
      worker.postMessage({
        type: "extract",
        pages: params.pages,
        regions: params.regions,
        documentMetadata: params.documentMetadata,
        outputMode: params.outputMode,
      });
    });
  } finally {
    worker.terminate();
  }
}
