/**
 * Worker that extracts the metadata + first N rows from an XLSX workbook
 * without blocking the main thread. We use SheetJS (`xlsx`) inside the
 * worker — SheetJS isn't a streaming parser, but the parse runs off the
 * main thread, so the UI stays responsive even for ~100 MB workbooks.
 *
 * Lifecycle: main thread sends `{ file, sheet?, hasHeader?, maxPreviewRows }`,
 * worker replies with `{ sheets, defaultSheet, columns, previewRows }`,
 * then terminates. One worker per import.
 *
 * Why this is a worker and not a main-thread call:
 *   - SheetJS parsing on a 100 MB XLSX can take 10-20s of pure JS work.
 *     On the main thread that freezes input, navigation, and animation.
 *   - The XLSX format requires a full sheet-XML parse — there's no
 *     "first 200 rows" partial-decode mode. Moving the parse off-thread
 *     is the only practical way to keep the import form responsive.
 */
import * as XLSX from "xlsx";

type SniffRequest = {
  type: "sniff";
  file: File;
  sheet?: string;
  hasHeader?: boolean;
  maxPreviewRows: number;
};

export type XlsxSniffResult = {
  type: "result";
  sheets: string[];
  defaultSheet: string;
  /** Inferred column names, in order. */
  columns: string[];
  /**
   * Up to `maxPreviewRows` rows. Each row is an object keyed by column
   * name, mirroring the shape DuckDB's `runQuery` returns so the same UI
   * component can render either source.
   */
  previewRows: Array<Record<string, unknown>>;
};

type SniffErrorResponse = {
  type: "error";
  message: string;
};

type SniffResponse = XlsxSniffResult | SniffErrorResponse;

self.addEventListener("message", async (event: MessageEvent<SniffRequest>) => {
  const req = event.data;
  if (req.type !== "sniff") {
    return;
  }

  try {
    const arrayBuf = await req.file.arrayBuffer();
    // `dense: true` builds the worksheet as an array of arrays rather than
    // an object keyed by cell address, which is more memory efficient on
    // large sheets. We also disable formula evaluation since we only need
    // raw values for preview.
    const workbook = XLSX.read(arrayBuf, {
      type: "array",
      dense: true,
      cellFormula: false,
      cellHTML: false,
      cellStyles: false,
    });
    const sheets = workbook.SheetNames;
    const defaultSheet =
      req.sheet && sheets.includes(req.sheet) ? req.sheet : (sheets[0] ?? "");

    const worksheet = workbook.Sheets[defaultSheet];
    if (!worksheet) {
      const reply: SniffResponse = {
        type: "error",
        message: `Worksheet "${defaultSheet}" not found in workbook.`,
      };
      (self as DedicatedWorkerGlobalScope).postMessage(reply);
      (self as DedicatedWorkerGlobalScope).close();
      return;
    }

    const hasHeader = req.hasHeader ?? true;
    // `sheet_to_json` with `range` constrains how many rows we materialize
    // into JS objects. Without this we'd build a JSON copy of the entire
    // sheet just to throw most of it away.
    const headerRowCount = hasHeader ? 1 : 0;
    const rowsToTake = req.maxPreviewRows + headerRowCount;
    const previewRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      worksheet,
      {
        header: hasHeader ? undefined : "A",
        range: rowsToTake,
        defval: null,
        raw: true,
      },
    );

    // Derive column order from the first row's keys. SheetJS preserves
    // insertion order, which matches the XLSX cell order in `dense` mode.
    const firstRow = previewRows[0] as Record<string, unknown> | undefined;
    const columns = firstRow ? Object.keys(firstRow) : [];

    const reply: SniffResponse = {
      type: "result",
      sheets,
      defaultSheet,
      columns,
      previewRows: previewRows.slice(0, req.maxPreviewRows),
    };
    (self as DedicatedWorkerGlobalScope).postMessage(reply);
  } catch (e) {
    const reply: SniffResponse = {
      type: "error",
      message: e instanceof Error ? e.message : String(e),
    };
    (self as DedicatedWorkerGlobalScope).postMessage(reply);
  } finally {
    (self as DedicatedWorkerGlobalScope).close();
  }
});
