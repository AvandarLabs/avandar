import { groupLines } from "../groupLines";
import { normalizeCellValue } from "../normalizeCellValue";
import type { BBox, ExtractedTable, RegionGeometry, TextLine } from "../types";

/** Left edges within this many points belong to the same column. */
const COLUMN_TOLERANCE = 6;

/** Fewer than this many lines is not a table. */
const MIN_ROWS = 2;

/**
 * Fraction of rows that must have an item at a position for it to count as a
 * column. Prose aligns occasionally; a real column is populated consistently.
 */
const MIN_COLUMN_OCCUPANCY = 0.6;

function _deriveColumns(lines: readonly TextLine[]): number[] {
  const clusters: Array<{ position: number; rows: Set<number> }> = [];

  lines.forEach((line, rowIndex) => {
    for (const item of line.items) {
      const existing = clusters.find((cluster) => {
        return Math.abs(cluster.position - item.x) <= COLUMN_TOLERANCE;
      });
      if (existing) {
        existing.rows.add(rowIndex);
      } else {
        clusters.push({ position: item.x, rows: new Set([rowIndex]) });
      }
    }
  });

  return clusters
    .filter((cluster) => {
      return cluster.rows.size / lines.length >= MIN_COLUMN_OCCUPANCY;
    })
    .map((cluster) => {
      return cluster.position;
    })
    .sort((a, b) => {
      return a - b;
    });
}

/**
 * Reads a region of aligned cells into rows and columns.
 *
 * Takes a grid from `options` when one is available, because a detector that
 * drew an outline for the user has already committed to specific boundaries,
 * and silently re-deriving different ones would produce a table that does not
 * match the picture they approved.
 */
export function extractGridTable(
  region: RegionGeometry,
  options: {
    regionId: string;
    gridX?: readonly number[];
    headerRows?: number;
  },
): ExtractedTable {
  const lines = groupLines(region.textItems);
  const columns =
    options.gridX && options.gridX.length > 0 ?
      [...options.gridX]
    : _deriveColumns(lines);

  if (lines.length < MIN_ROWS || columns.length < 2) {
    return {
      regionId: options.regionId,
      cells: [],
      headerRows: 0,
      flags: [],
      extractedBy: "rules",
      rowProvenance: [],
    };
  }

  const cells = lines.map((line) => {
    const rowCells = Array.from({ length: columns.length }, () => {
      return "";
    });
    for (const item of line.items) {
      // The rightmost column at or left of the item, so a value indented
      // slightly inside its column still lands in it.
      let columnIndex = 0;
      for (let c = 0; c < columns.length; c += 1) {
        if (item.x >= columns[c]! - COLUMN_TOLERANCE) {
          columnIndex = c;
        }
      }
      const existing = rowCells[columnIndex]!;
      rowCells[columnIndex] =
        existing === "" ? item.text : `${existing} ${item.text}`;
    }
    return rowCells.map((value) => {
      return normalizeCellValue(value);
    });
  });

  const headerRows = options.headerRows ?? 1;
  const rowProvenance: Array<{ page: number; bbox: BBox }> = lines
    .slice(headerRows)
    .map((line) => {
      const xs = line.items.flatMap((i) => {
        return [i.x, i.x + i.width];
      });
      return {
        page: region.pageIndex,
        bbox: [
          Math.min(...xs),
          line.y,
          Math.max(...xs),
          line.y + (line.items[0]?.height ?? 10),
        ] as BBox,
      };
    });

  return {
    regionId: options.regionId,
    cells,
    headerRows,
    flags: [],
    extractedBy: "rules",
    rowProvenance,
  };
}
