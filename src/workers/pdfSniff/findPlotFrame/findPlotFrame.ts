import type { BBox, RegionGeometry, RuleSegment } from "../pdfSniff.types";

/** Ends of an axis pair closer than this are treated as a corner. */
const CORNER_TOLERANCE = 4;

/** Two strokes of the same rule land within this many points. */
const DEDUP_TOLERANCE = 1;

/**
 * An axis must span at least this fraction of the region, otherwise it is a
 * bar edge, a month-box, or a map border rather than a plot axis.
 */
const MIN_AXIS_FRACTION = 0.5;

/** A plot must cover at least this fraction of the region on both axes. */
const MIN_FRAME_FRACTION = 0.25;

/** Ignore rules this close to the outer box when looking for an inner axis. */
const INNER_AXIS_INSET = 4;

/** An inner x-axis must span at least this fraction of the outer width. */
const INNER_AXIS_LENGTH_FRACTION = 0.75;

type AxisPair = {
  horizontal: RuleSegment;
  vertical: RuleSegment;
};

/**
 * The rectangle of a Cartesian plot, in PDF user space.
 *
 * `top` is the larger y (PDF y grows up). `gridlines` are rule positions
 * along the value axis that span the plot, including the axes themselves.
 */
export type PlotFrame = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  gridlines: number[];
};

function _length(rule: RuleSegment): number {
  return rule.span[1] - rule.span[0];
}

function _near(
  left: number,
  right: number,
  tolerance: number = CORNER_TOLERANCE,
): boolean {
  return Math.abs(left - right) <= tolerance;
}

function _isSameRule(left: RuleSegment, right: RuleSegment): boolean {
  return (
    left.orientation === right.orientation &&
    _near(left.position, right.position, DEDUP_TOLERANCE) &&
    _near(left.span[0], right.span[0], DEDUP_TOLERANCE) &&
    _near(left.span[1], right.span[1], DEDUP_TOLERANCE)
  );
}

function _dedupe(rules: readonly RuleSegment[]): RuleSegment[] {
  return rules.filter((rule, index) => {
    return !rules.slice(0, index).some((previous) => {
      return _isSameRule(previous, rule);
    });
  });
}

function _isBottomLeft(
  horizontal: RuleSegment,
  vertical: RuleSegment,
): boolean {
  return (
    _near(vertical.position, horizontal.span[0]) &&
    _near(horizontal.position, vertical.span[0])
  );
}

function _bottomLeftPairs(
  horizontals: readonly RuleSegment[],
  verticals: readonly RuleSegment[],
): AxisPair[] {
  return horizontals.flatMap((horizontal) => {
    return verticals
      .filter((vertical) => {
        return _isBottomLeft(horizontal, vertical);
      })
      .map((vertical) => {
        return { horizontal, vertical };
      });
  });
}

function _uniquePositions(positions: readonly number[]): number[] {
  return [...positions]
    .sort((left, right) => {
      return left - right;
    })
    .reduce<number[]>((unique, position) => {
      const previous = unique[unique.length - 1];
      if (
        previous === undefined ||
        !_near(previous, position, DEDUP_TOLERANCE)
      ) {
        unique.push(position);
      }
      return unique;
    }, []);
}

function _frameFromBottomLeft(
  pairs: readonly AxisPair[],
): PlotFrame | undefined {
  const origin = [...pairs].sort((left, right) => {
    return (
      _length(right.horizontal) * _length(right.vertical) -
      _length(left.horizontal) * _length(left.vertical)
    );
  })[0];
  if (origin === undefined) {
    return undefined;
  }
  const left = origin.vertical.position;
  const bottom = origin.horizontal.position;
  const right = origin.horizontal.span[1];
  const top = origin.vertical.span[1];
  if (right <= left || top <= bottom) {
    return undefined;
  }
  return { left, right, top, bottom, gridlines: [] };
}

function _isLargeEnough(frame: PlotFrame, bbox: BBox): boolean {
  const regionWidth = bbox[2] - bbox[0];
  const regionHeight = bbox[3] - bbox[1];
  return (
    frame.right - frame.left >= MIN_FRAME_FRACTION * regionWidth &&
    frame.top - frame.bottom >= MIN_FRAME_FRACTION * regionHeight
  );
}

function _shrinkToInnerXAxis(
  outer: PlotFrame,
  horizontals: readonly RuleSegment[],
): PlotFrame {
  const minLength = (outer.right - outer.left) * INNER_AXIS_LENGTH_FRACTION;
  const inner = horizontals
    .filter((rule) => {
      return (
        rule.position > outer.bottom + INNER_AXIS_INSET &&
        rule.position < outer.top - INNER_AXIS_INSET &&
        _length(rule) >= minLength
      );
    })
    .sort((left, right) => {
      return left.position - right.position;
    })[0];

  if (inner === undefined) {
    return outer;
  }
  return {
    left: inner.span[0],
    right: inner.span[1],
    top: outer.top,
    bottom: inner.position,
    gridlines: [],
  };
}

function _gridlines(
  frame: PlotFrame,
  horizontals: readonly RuleSegment[],
): number[] {
  const minLength = (frame.right - frame.left) * INNER_AXIS_LENGTH_FRACTION;
  return _uniquePositions(
    horizontals
      .filter((rule) => {
        return (
          rule.position >= frame.bottom - DEDUP_TOLERANCE &&
          rule.position <= frame.top + DEDUP_TOLERANCE &&
          _length(rule) >= minLength
        );
      })
      .map((rule) => {
        return rule.position;
      }),
  );
}

/**
 * Finds the Cartesian plot rectangle inside a region, from ruling lines.
 *
 * Returns `undefined` when the rules do not form a plot: a map's borders, a
 * bar's own rectangle, and a page edge all reach here as rules, and none of
 * those is an axis pair.
 */
export function findPlotFrame(region: RegionGeometry): PlotFrame | undefined {
  const regionWidth = region.bbox[2] - region.bbox[0];
  const regionHeight = region.bbox[3] - region.bbox[1];
  const rules = _dedupe(region.rules);
  const horizontals = rules.filter((rule) => {
    return (
      rule.orientation === "horizontal" &&
      _length(rule) >= MIN_AXIS_FRACTION * regionWidth
    );
  });
  const verticals = rules.filter((rule) => {
    return (
      rule.orientation === "vertical" &&
      _length(rule) >= MIN_AXIS_FRACTION * regionHeight
    );
  });
  const outer = _frameFromBottomLeft(_bottomLeftPairs(horizontals, verticals));
  if (outer === undefined || !_isLargeEnough(outer, region.bbox)) {
    return undefined;
  }
  const frame = _shrinkToInnerXAxis(outer, horizontals);
  if (!_isLargeEnough(frame, region.bbox)) {
    return undefined;
  }
  return { ...frame, gridlines: _gridlines(frame, horizontals) };
}
