import type { TextLine } from "./types";

/** Left edges within this many points belong to the same column. */
export const COLUMN_TOLERANCE = 6;

/**
 * Fraction of rows that must have an item at a position for it to count as a
 * column. Prose aligns occasionally; a real column is populated consistently.
 */
const MIN_COLUMN_OCCUPANCY = 0.6;

/**
 * The x positions at which the lines of a region line up into columns.
 *
 * This is the structural premise of a grid: text that keeps returning to the
 * same left edge row after row. It lives here, rather than inside
 * `extractGridTable`, because the classifier has to ask the same question the
 * extractor does. A region classified as a grid table whose text does not line
 * up in columns is a region the grid extractor will return no rows for, so the
 * two must be deciding on the same evidence or the verdict means nothing.
 */
export function deriveColumns(lines: readonly TextLine[]): readonly number[] {
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
