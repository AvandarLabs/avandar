import type { BBox, PathMark, RegionGeometry } from "../pdfSniff.types";

/** Edges this close together are the same edge. */
const EDGE_TOLERANCE = 1;

/** Bars whose thickness differs by less than this are the same family. */
const THICKNESS_TOLERANCE = 1;

/**
 * Below this many bars a "family" is two boxes that happen to line up: a
 * panel and its border, or a legend swatch beside a title rule.
 */
const MIN_BARS = 3;

/**
 * A family whose bars are all the same length encodes nothing. It is a stack
 * of table cells, a row of tiles, or the same rectangle painted twice.
 */
const MIN_DISTINCT_LENGTHS = 2;

/** One rectangle of a bar family, already resolved to its value edge. */
export type Bar = {
  bbox: BBox;
  /**
   * Centre along the category axis, which is the coordinate a bar shares
   * with its own name and its own printed figure.
   */
  categoryCenter: number;
  /** The edge the value is read off: the right edge, or a column's top. */
  freeEdge: number;
};

/** A set of congruent bars growing from one shared edge. */
export type BarFamily = {
  /** `bar` grows rightwards from a shared left edge, `column` upwards. */
  orientation: "bar" | "column";
  /** The shared edge every bar grows from, and so the value origin. */
  baseline: number;
  /** Ordered along the category axis, ascending. */
  bars: readonly Bar[];
};

type Orientation = BarFamily["orientation"];

function _isCorner(point: { x: number; y: number }, bbox: BBox): boolean {
  return (
    (Math.abs(point.x - bbox[0]) <= EDGE_TOLERANCE ||
      Math.abs(point.x - bbox[2]) <= EDGE_TOLERANCE) &&
    (Math.abs(point.y - bbox[1]) <= EDGE_TOLERANCE ||
      Math.abs(point.y - bbox[3]) <= EDGE_TOLERANCE)
  );
}

/**
 * True when a mark is a filled, axis-aligned rectangle.
 *
 * Tested against the mark's own points rather than its box, because every
 * mark has a box: a triangle and a blob would both pass a box-only test and
 * neither is a bar.
 */
function _isRectangle(mark: PathMark): boolean {
  return (
    mark.kind === "closed" &&
    mark.isFilled &&
    mark.points.length >= 4 &&
    mark.points.length <= 5 &&
    mark.points.every((point) => {
      return _isCorner(point, mark.bbox);
    })
  );
}

function _barOf(bbox: BBox, orientation: Orientation): Bar {
  return orientation === "bar" ?
      {
        bbox,
        categoryCenter: (bbox[1] + bbox[3]) / 2,
        freeEdge: bbox[2],
      }
    : { bbox, categoryCenter: (bbox[0] + bbox[2]) / 2, freeEdge: bbox[3] };
}

function _baselineOf(bbox: BBox, orientation: Orientation): number {
  return orientation === "bar" ? bbox[0] : bbox[1];
}

function _thicknessOf(bbox: BBox, orientation: Orientation): number {
  return orientation === "bar" ? bbox[3] - bbox[1] : bbox[2] - bbox[0];
}

/**
 * Collapses bars that occupy the same category row.
 *
 * The same rectangle is routinely painted more than once (a fill and then a
 * stroke of the same box), and a chart with two bars on one row is a stacked
 * chart, which this reader does not claim to understand.
 */
function _oneBarPerRow(bars: readonly Bar[], thickness: number): Bar[] {
  return [...bars]
    .sort((left, right) => {
      return left.categoryCenter - right.categoryCenter;
    })
    .reduce<Bar[]>((kept, bar) => {
      const previous = kept[kept.length - 1];
      if (
        previous === undefined ||
        bar.categoryCenter - previous.categoryCenter > thickness / 2
      ) {
        kept.push(bar);
      }
      return kept;
    }, []);
}

function _distinctLengths(bars: readonly Bar[], baseline: number): number {
  return new Set(
    bars.map((bar) => {
      return Math.round(bar.freeEdge - baseline);
    }),
  ).size;
}

function _familyFrom(
  seed: BBox,
  boxes: readonly BBox[],
  orientation: Orientation,
): BarFamily | undefined {
  const baseline = _baselineOf(seed, orientation);
  const thickness = _thicknessOf(seed, orientation);
  const members = boxes.filter((bbox) => {
    return (
      Math.abs(_baselineOf(bbox, orientation) - baseline) <= EDGE_TOLERANCE &&
      Math.abs(_thicknessOf(bbox, orientation) - thickness) <=
        THICKNESS_TOLERANCE &&
      _barOf(bbox, orientation).freeEdge > baseline + EDGE_TOLERANCE
    );
  });
  const bars = _oneBarPerRow(
    members.map((bbox) => {
      return _barOf(bbox, orientation);
    }),
    thickness,
  );
  if (
    bars.length < MIN_BARS ||
    _distinctLengths(bars, baseline) < MIN_DISTINCT_LENGTHS
  ) {
    return undefined;
  }
  return { orientation, baseline, bars };
}

function _totalLength(family: BarFamily): number {
  return family.bars.reduce((sum, bar) => {
    return sum + (bar.freeEdge - family.baseline);
  }, 0);
}

/**
 * Finds the bars of a bar or column chart among a region's retained marks.
 *
 * A bar chart is the one chart type whose marks say what they are without
 * any text: congruent rectangles, all growing from one shared edge, each on
 * its own row, and not all the same length. Everything that fails one of
 * those is left alone, because a panel, a table's ruled cells and a legend's
 * swatches are all rectangles too.
 *
 * Returns the largest family found, or `undefined` when the region holds no
 * bars, so the caller can fall through to reading the text.
 */
export function findBarFamily(region: RegionGeometry): BarFamily | undefined {
  const boxes = region.marks.filter(_isRectangle).map((mark) => {
    return mark.bbox;
  });
  const families = boxes.flatMap((seed) => {
    return (["bar", "column"] as const).flatMap((orientation) => {
      const family = _familyFrom(seed, boxes, orientation);
      return family === undefined ? [] : [family];
    });
  });
  return families.sort((left, right) => {
    return (
      right.bars.length - left.bars.length ||
      _totalLength(right) - _totalLength(left)
    );
  })[0];
}
