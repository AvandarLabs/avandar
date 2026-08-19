import type { BBox, PageGeometry, RegionGeometry, TextItem } from "../pdfSniff.types";

/**
 * Fraction of a text item's width that must fall inside the box for the item
 * to be kept.
 *
 * A user drawing a rectangle will rarely land exactly on a glyph boundary, so
 * a strict containment test drops values they clearly meant to include. A
 * majority test keeps those while still excluding a neighbouring column that
 * the box only grazes.
 */
const MIN_INSIDE_FRACTION = 0.5;

function _insideFraction(item: TextItem, bbox: BBox): number {
  const [x0, y0, x1, y1] = bbox;
  const itemRight = item.x + item.width;
  const overlapWidth = Math.min(itemRight, x1) - Math.max(item.x, x0);
  if (overlapWidth <= 0 || item.width <= 0) {
    return 0;
  }
  // Vertically we use the baseline rather than the full glyph box: ascenders
  // and descenders vary by font and would make the test unpredictable.
  if (item.y < y0 || item.y > y1) {
    return 0;
  }
  return overlapWidth / item.width;
}

/**
 * Narrows a page to one region.
 *
 * The single definition of "inside the box" in the codebase. Every extractor
 * consumes the result, so a change here changes all four shapes at once,
 * which is the intent: users expect one selection rule, not four.
 */
export function clipToRegion(options: {
  page: PageGeometry;
  bbox: BBox;
}): RegionGeometry {
  const { page, bbox } = options;
  const [x0, y0, x1, y1] = bbox;

  return {
    pageIndex: page.pageIndex,
    bbox,
    textItems: page.textItems.filter((item) => {
      return _insideFraction(item, bbox) >= MIN_INSIDE_FRACTION;
    }),
    rules: page.rules.filter((rule) => {
      if (rule.orientation === "horizontal") {
        const overlapsX = rule.span[1] >= x0 && rule.span[0] <= x1;
        return overlapsX && rule.position >= y0 && rule.position <= y1;
      }
      const overlapsY = rule.span[1] >= y0 && rule.span[0] <= y1;
      return overlapsY && rule.position >= x0 && rule.position <= x1;
    }),
  };
}
