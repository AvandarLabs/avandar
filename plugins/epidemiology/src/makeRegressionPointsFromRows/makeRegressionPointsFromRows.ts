function _getFiniteNumberFromValue(value: unknown): number | undefined {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }
  if (
    typeof value !== "number" &&
    typeof value !== "bigint" &&
    typeof value !== "string"
  ) {
    return undefined;
  }
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

/**
 * Makes the (X, Y) pairs a regression fits from query result rows. It reads
 * two columns and skips every row where either value is missing or not a
 * finite number, so the caller can pass a raw result as it came back from
 * `avandar.data.fetchRows`.
 *
 * Every value becomes a double, so a bigint above 2^53 loses precision. That
 * is acceptable here because the regression itself computes in double
 * precision.
 */
export function makeRegressionPointsFromRows(options: {
  rows: ReadonlyArray<Readonly<Record<string, unknown>>>;
  xColumn: string;
  yColumn: string;
}): Array<readonly [number, number]> {
  return options.rows.flatMap((row) => {
    const x = _getFiniteNumberFromValue(row[options.xColumn]);
    const y = _getFiniteNumberFromValue(row[options.yColumn]);
    return x === undefined || y === undefined ? [] : [[x, y] as const];
  });
}
