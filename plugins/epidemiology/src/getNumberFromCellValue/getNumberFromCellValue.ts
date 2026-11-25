/**
 * Reads a query result cell as a finite number, for charts that sum or plot
 * values, such as case counts or rates. Numbers, bigints, and numeric text
 * count, so a raw row from a chart's input can be read as is. Blank text,
 * other types, and values that are not finite are undefined. A bigint above
 * 2^53 rounds to the nearest double.
 */
export function getNumberFromCellValue(value: unknown): number | undefined {
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
