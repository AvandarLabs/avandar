import { formatNumber } from "@utils";

/**
 * Format a numeric value for display in a chart. The rules:
 *
 * - `|x| < 1` shows 3 significant figures (e.g. `0.00123`).
 * - `1 ≤ |x| < 1_000_000` shows 2 decimal places with thousands grouping.
 * - `|x| ≥ 1_000_000` shows 0 decimal places with thousands grouping.
 *
 * Pass `compact: true` for axis ticks: values ≥ 1000 collapse to compact
 * notation (`1.5K`, `2.3M`, `1.5B`) so labels stay narrow and the chart
 * doesn't lose plot area to long numerals. Compact ticks always use 2
 * fraction digits when the scaled value is between 1 and 1000.
 */
export function formatChartNumber(
  value: unknown,
  options: { compact?: boolean } = {},
): string {
  if (typeof value !== "number") {
    return value === null || value === undefined ? "" : String(value);
  }
  if (!Number.isFinite(value)) {
    return "";
  }

  const abs = Math.abs(value);

  if (options.compact && abs >= 1000) {
    return formatNumber(value, {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    });
  }

  if (abs === 0) {
    return formatNumber(0, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  if (abs < 1) {
    const sigFigs = 3;
    const magnitude = Math.floor(Math.log10(abs));
    const decimals = Math.max(0, sigFigs - 1 - magnitude);
    return formatNumber(value, {
      minimumFractionDigits: Math.min(decimals, 20),
      maximumFractionDigits: Math.min(decimals, 20),
    });
  }

  if (abs < 1_000_000) {
    return formatNumber(value, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return formatNumber(value, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
