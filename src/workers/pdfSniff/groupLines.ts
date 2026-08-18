import type { TextItem, TextLine } from "./types";

/** Baselines within this many points belong to the same visual line. */
const LINE_TOLERANCE = 3;

/**
 * Groups text items into visual lines, top to bottom, each sorted left to
 * right.
 *
 * Every extractor needs this and none of them should reimplement it: the
 * tolerance is the difference between reading a table row correctly and
 * emitting one row per cell.
 */
export function groupLines(items: readonly TextItem[]): readonly TextLine[] {
  const buckets: TextItem[][] = [];

  for (const item of items) {
    const existing = buckets.find((bucket) => {
      const head = bucket[0];
      return head !== undefined && Math.abs(head.y - item.y) <= LINE_TOLERANCE;
    });
    if (existing) {
      existing.push(item);
    } else {
      buckets.push([item]);
    }
  }

  return buckets
    .map((bucket): TextLine => {
      const sorted = [...bucket].sort((a, b) => {
        return a.x - b.x;
      });
      return {
        // The mean baseline is steadier than the first item's, which matters
        // when a line starts with a superscript.
        y:
          sorted.reduce((sum, i) => {
            return sum + i.y;
          }, 0) / sorted.length,
        items: sorted,
        text: sorted
          .map((i) => {
            return i.text;
          })
          .join(" ")
          .replace(/\s+/gu, " ")
          .trim(),
      };
    })
    .sort((a, b) => {
      // y grows upward in PDF space, so larger y is higher and sorts first.
      return b.y - a.y;
    });
}
