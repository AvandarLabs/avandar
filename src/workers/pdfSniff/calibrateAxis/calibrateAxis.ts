/**
 * A linear (or log-linear) map from a PDF-space position to a tick value.
 *
 * `value = a * position + b` on a linear axis. `maxResidual` is the largest
 * gap, in PDF points, between a tick's position and the position the fit
 * would give that tick's value.
 */
export type AxisCalibration = {
  a: number;
  b: number;
  maxResidual: number;
  scale: "linear" | "log";
};

export type AxisTick = {
  position: number;
  value: number;
};

type Acc = {
  count: number;
  sumX: number;
  sumY: number;
  sumXy: number;
  sumX2: number;
};

function _emptyAcc(): Acc {
  return { count: 0, sumX: 0, sumY: 0, sumXy: 0, sumX2: 0 };
}

function _fitLinear(ticks: readonly AxisTick[]): AxisCalibration | undefined {
  if (ticks.length < 2) {
    return undefined;
  }
  const acc = ticks.reduce<Acc>((totals, tick) => {
    return {
      count: totals.count + 1,
      sumX: totals.sumX + tick.position,
      sumY: totals.sumY + tick.value,
      sumXy: totals.sumXy + tick.position * tick.value,
      sumX2: totals.sumX2 + tick.position * tick.position,
    };
  }, _emptyAcc());
  const denominator = acc.count * acc.sumX2 - acc.sumX * acc.sumX;
  if (denominator === 0) {
    return undefined;
  }
  const a = (acc.count * acc.sumXy - acc.sumX * acc.sumY) / denominator;
  const b = (acc.sumY - a * acc.sumX) / acc.count;
  if (a === 0) {
    return undefined;
  }
  const maxResidual = Math.max(
    ...ticks.map((tick) => {
      return Math.abs(tick.position - (tick.value - b) / a);
    }),
  );
  return { a, b, maxResidual, scale: "linear" };
}

function _fitLog(ticks: readonly AxisTick[]): AxisCalibration | undefined {
  const positive = ticks.filter((tick) => {
    return tick.value > 0;
  });
  const linearOfLog = _fitLinear(
    positive.map((tick) => {
      return { position: tick.position, value: Math.log(tick.value) };
    }),
  );
  if (linearOfLog === undefined) {
    return undefined;
  }
  const maxResidual = Math.max(
    ...positive.map((tick) => {
      const predicted = (Math.log(tick.value) - linearOfLog.b) / linearOfLog.a;
      return Math.abs(tick.position - predicted);
    }),
  );
  return { ...linearOfLog, maxResidual, scale: "log" };
}

/**
 * Least-squares fit of tick values against their positions.
 *
 * Prefers a linear fit. If that residual is large and every tick is positive,
 * retries against `log(value)` and keeps whichever fits.
 */
export function calibrateAxis(
  ticks: readonly AxisTick[],
): AxisCalibration | undefined {
  const linear = _fitLinear(ticks);
  if (linear === undefined) {
    return undefined;
  }
  const linearIsTight = linear.maxResidual <= 1;
  if (linearIsTight) {
    return linear;
  }
  const logFit = _fitLog(ticks);
  if (logFit !== undefined && logFit.maxResidual < linear.maxResidual) {
    return logFit;
  }
  return linear;
}

/**
 * Reads a value from a calibrated position.
 */
export function applyCalibration(
  calibration: AxisCalibration,
  position: number,
): number {
  const linear = calibration.a * position + calibration.b;
  return calibration.scale === "log" ? Math.exp(linear) : linear;
}
