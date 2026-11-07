const MAX_SIGNIFICANT_DIGITS = 4;
const MAX_FRACTION_DIGITS = 4;

/**
 * Writes a regression statistic as text in a locale, for `FittedResult`. A
 * magnitude below 1 keeps 4 significant digits, so a small slope such as
 * 0.00001 never shows as 0. A larger one keeps 4 decimal places. The result is
 * never "-0".
 *
 * The value must be finite: `Intl` writes NaN and Infinity as symbols that
 * mean nothing as a statistic.
 */
export function makeStatisticTextFromNumber(options: {
  value: number;
  locale: string;
}): string {
  const { value, locale } = options;
  const formatOptions =
    Math.abs(value) < 1
      ? { maximumSignificantDigits: MAX_SIGNIFICANT_DIGITS }
      : { maximumFractionDigits: MAX_FRACTION_DIGITS };
  // `-0 === 0`, so a negative zero is replaced by a positive one here.
  const unsignedZeroValue = value === 0 ? 0 : value;
  return unsignedZeroValue.toLocaleString(locale, formatOptions);
}
