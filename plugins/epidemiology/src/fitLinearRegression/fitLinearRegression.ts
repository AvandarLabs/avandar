import {
  linearRegression,
  linearRegressionLine,
  rSquared,
} from "simple-statistics";

/** A fitted simple linear regression: its line, its fit, and its row count. */
export type LinearRegressionFit = Readonly<{
  slope: number;
  intercept: number;
  rSquared: number;
  n: number;
}>;

/**
 * Fits Y = slope * X + intercept to (X, Y) pairs by least squares. Undefined
 * when there are fewer than two points or X never varies, because no line is
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
  const line = linearRegressionLine({ m: slope, b: intercept });
  return {
    slope,
    intercept,
    rSquared: rSquared(mutablePoints, line),
    n: points.length,
  };
}
