import type { PdfTableFingerprint } from "$/models/datasets/PdfFileDataset/PdfFileDataset.types";

async function _sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => {
      return byte.toString(16).padStart(2, "0");
    })
    .join("");
}

/**
 * Snapshots what a table contained at import time.
 *
 * Geometry alone makes a re-parse reproducible against detector changes, but
 * it cannot tell us that the geometry now resolves to something different,
 * which is what happens when a document is revised or our cell assignment
 * shifts. The fingerprint is the only mechanism that can actually notice
 * drift rather than silently importing different data under the same name.
 */
export async function computePdfTableFingerprint(table: {
  cells: ReadonlyArray<readonly string[]>;
  headerRows: number;
}): Promise<PdfTableFingerprint> {
  const headerRow = table.cells[table.headerRows - 1] ?? [];
  const dataRows = table.cells.slice(table.headerRows);

  const hash = await _sha256Hex(
    JSON.stringify({ cells: table.cells, headerRows: table.headerRows }),
  );

  return {
    headers: [...headerRow],
    shape: [dataRows.length, table.cells[0]?.length ?? 0],
    hash,
  };
}

/**
 * True when a freshly extracted table is the same as the one originally
 * imported. A false result should warn the user and ask for confirmation,
 * never silently replace their data.
 */
export function fingerprintsMatch(
  original: PdfTableFingerprint,
  fresh: PdfTableFingerprint,
): boolean {
  return original.hash === fresh.hash;
}
