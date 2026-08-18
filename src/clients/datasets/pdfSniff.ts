// eslint-disable-next-line import-x/extensions
import PdfSniffWorker from "@/workers/pdfSniff.worker.ts?worker";
import type {
  PdfSniffError,
  PdfSniffProgress,
  PdfSniffResult,
} from "@/workers/pdfSniff.worker";

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
      worker.addEventListener(
        "message",
        (
          event: MessageEvent<
            PdfSniffResult | PdfSniffProgress | PdfSniffError
          >,
        ) => {
          const data = event.data;
          if (data.type === "progress") {
            params.onProgress?.(data);
            return;
          }
          if (data.type === "result") {
            resolve(data);
            return;
          }
          reject(new PdfSniffRejection(data));
        },
      );
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
