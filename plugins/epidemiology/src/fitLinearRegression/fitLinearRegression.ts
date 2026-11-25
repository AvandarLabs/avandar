import {
  linearRegression,
  linearRegressionLine,
  rSquared,
} from "simple-statistics";

/**
 * A fitted simple linear regression: its line, its fit, and its row count.
 * The slope and intercept are always finite. R squared is undefined when it
 * has no finite value, as when Y never varies and so has no variance to
 * explain.
 */
export type LinearRegressionFit = Readonly<{
  slope: number;
  intercept: number;
  rSquared: number | undefined;
  n: number;
}>;

function _getFiniteNumberOrUndefined(value: number): number | undefined {
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Fits Y = slope * X + intercept to (X, Y) pairs by least squares. Undefined
 * when there are fewer than two points, X never varies, or the values are so
 * large that the slope or intercept overflows, because no usable line is
 * determined then.
 *
 * Use it to relate an outcome to a predictor, such as weight against age.
 */
export function fitLinearRegression(
  points: ReadonlyArray<readonly [number, number]>,
): LinearRegressionFit | undefined {
  const firstX = points[0]?.[0];
  const hasVariation = points.some((point) => {
    return point[0] !== firstX;
  });
  if (points.length < 2 || !hasVariation) {
    return undefined;
  }
  // simple-statistics takes mutable arrays and never writes to them.
  const mutablePoints = points.map((point) => {
    return [point[0], point[1]];
  });
  const { m: slope, b: intercept } = linearRegression(mutablePoints);
  if (!Number.isFinite(slope) || !Number.isFinite(intercept)) {
    return undefined;
  }
  const line = linearRegressionLine({ m: slope, b: intercept });
  return {
    slope,
    intercept,
    rSquared: _getFiniteNumberOrUndefined(rSquared(mutablePoints, line)),
    n: points.length,
  };
}
