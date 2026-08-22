import type { XlsxSniffResult } from "@/workers/xlsxSniff.worker";

// eslint-disable-next-line import-x/extensions
import XlsxSniffWorker from "@/workers/xlsxSniff.worker.ts?worker";

/**
 * Main-thread driver for the XLSX sniff worker. Owns one worker per call
 * (workers are cheap to spawn and SheetJS is the bulk of the cost
 * anyway), spawns it, awaits the result, and terminates.
 *
 * The worker self-closes after replying, so we don't have to worry about
 * dangling postMessage listeners; the `terminate()` here is a defensive
 * fallback for the error path.
 */
export async function sniffXlsxFile(params: {
  file: File;
  sheet?: string;
  hasHeader?: boolean;
  rowsToSkip?: number;
  maxPreviewRows: number;
}): Promise<XlsxSniffResult> {
  const worker = new XlsxSniffWorker();
  try {
    const result = await new Promise<XlsxSniffResult>((resolve, reject) => {
      worker.addEventListener(
        "message",
        (
          event: MessageEvent<
            XlsxSniffResult | { type: "error"; message: string }
          >,
        ) => {
          if (event.data.type === "result") {
            resolve(event.data);
          } else {
            reject(new Error(event.data.message));
          }
        },
        { once: true },
      );
      worker.addEventListener(
        "error",
        (event) => {
          reject(new Error(event.message || "XLSX sniff worker errored"));
        },
        { once: true },
      );
      worker.postMessage({
        type: "sniff",
        file: params.file,
        sheet: params.sheet,
        hasHeader: params.hasHeader,
        rowsToSkip: params.rowsToSkip,
        maxPreviewRows: params.maxPreviewRows,
      });
    });
    return result;
  } finally {
    worker.terminate();
  }
}
