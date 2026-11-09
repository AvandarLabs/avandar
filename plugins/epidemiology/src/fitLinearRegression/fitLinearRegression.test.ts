import { describe, expect, it } from "vitest";
import { fitLinearRegression } from "./fitLinearRegression";

describe("fitLinearRegression", () => {
  it("recovers an exact line", () => {
    const points = [1, 2, 3, 4, 5].map((x) => {
      return [x, 2 * x + 1] as const;
    });
    const fit = fitLinearRegression(points);
    expect(fit?.slope).toBeCloseTo(2);
    expect(fit?.intercept).toBeCloseTo(1);
    expect(fit?.rSquared).toBeCloseTo(1);
    expect(fit?.n).toBe(5);
  });

  it("fits the least-squares line and R squared of noisy data", () => {
    const fit = fitLinearRegression([
      [1, 1],
      [2, 3],
      [3, 2],
      [4, 5],
    ]);
    expect(fit?.slope).toBeCloseTo(1.1);
    expect(fit?.intercept).toBeCloseTo(0);
    expect(fit?.rSquared).toBeCloseTo(0.6914, 4);
    expect(fit?.n).toBe(4);
  });

  it("fits a flat line with an undefined R squared when Y never varies", () => {
    const fit = fitLinearRegression([
      [1, 5],
      [2, 5],
      [3, 5],
    ]);
    expect(fit?.slope).toBe(0);
    expect(fit?.intercept).toBe(5);
    expect(fit?.rSquared).toBeUndefined();
  });

  it("returns undefined when the slope and intercept overflow", () => {
    expect(
      fitLinearRegression([
        [1e200, 1e300],
        [2e200, 3e300],
        [3e200, 2e300],
      ]),
    ).toBeUndefined();
  });

  it("returns undefined for fewer than two points", () => {
    expect(fitLinearRegression([])).toBeUndefined();
    expect(fitLinearRegression([[1, 1]])).toBeUndefined();
  });

  it("returns undefined when X never varies", () => {
    expect(
      fitLinearRegression([
        [1, 1],
        [1, 2],
      ]),
    ).toBeUndefined();
  });
});
