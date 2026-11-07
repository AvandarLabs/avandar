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

  it("reports an R squared below 1 for noisy data", () => {
    const fit = fitLinearRegression([
      [1, 1],
      [2, 3],
      [3, 2],
      [4, 5],
    ]);
    expect(fit?.rSquared).toBeGreaterThan(0);
    expect(fit?.rSquared).toBeLessThan(1);
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
