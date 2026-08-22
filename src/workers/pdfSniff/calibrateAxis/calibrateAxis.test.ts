import { describe, expect, it } from "vitest";

import { applyCalibration, calibrateAxis } from "./calibrateAxis";

describe("calibrateAxis", () => {
  it("fits a line through two ticks", () => {
    const fit = calibrateAxis([
      { position: 100, value: 0 },
      { position: 200, value: 1000 },
    ]);

    expect(fit).toBeDefined();
    expect(applyCalibration(fit!, 100)).toBeCloseTo(0, 5);
    expect(applyCalibration(fit!, 200)).toBeCloseTo(1000, 5);
    expect(applyCalibration(fit!, 150)).toBeCloseTo(500, 5);
    expect(fit!.maxResidual).toBeCloseTo(0, 5);
    expect(fit!.scale).toBe("linear");
  });

  it("fits the OCHA trend y-ticks with sub-point residual", () => {
    const fit = calibrateAxis([
      { position: 180.5, value: 10000 },
      { position: 162.8, value: 8000 },
      { position: 145.0, value: 6000 },
      { position: 127.3, value: 4000 },
      { position: 109.6, value: 2000 },
      { position: 91.8, value: 0 },
    ]);

    expect(fit).toBeDefined();
    expect(fit!.scale).toBe("linear");
    expect(fit!.maxResidual).toBeLessThan(1);
    expect(applyCalibration(fit!, 91.8)).toBeCloseTo(0, -2);
    expect(applyCalibration(fit!, 180.5)).toBeCloseTo(10000, -2);
  });

  it("returns undefined when fewer than two ticks parse", () => {
    expect(calibrateAxis([{ position: 100, value: 0 }])).toBeUndefined();
    expect(calibrateAxis([])).toBeUndefined();
  });
});
