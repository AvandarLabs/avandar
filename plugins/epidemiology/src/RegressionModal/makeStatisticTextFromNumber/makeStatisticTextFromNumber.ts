const MAX_SIGNIFICANT_DIGITS = 4;
const MAX_FRACTION_DIGITS = 4;

/** A magnitude below this is floating point noise, so it is shown as 0. */
const NOISE_MAGNITUDE = 1e-12;

/**
 * A magnitude below this, down to `NOISE_MAGNITUDE`, uses scientific notation.
 */
const SCIENTIFIC_MAGNITUDE = 1e-6;

function _getFormatOptionsFromMagnitude(
  magnitude: number,
): Intl.NumberFormatOptions {
  // A snapped zero sits below `NOISE_MAGNITUDE`, so it keeps plain notation.
  if (magnitude >= NOISE_MAGNITUDE && magnitude < SCIENTIFIC_MAGNITUDE) {
    return {
      notation: "scientific",
      maximumSignificantDigits: MAX_SIGNIFICANT_DIGITS,
    };
  }
  return magnitude < 1
    ? { maximumSignificantDigits: MAX_SIGNIFICANT_DIGITS }
    : { maximumFractionDigits: MAX_FRACTION_DIGITS };
}

/**
 * Writes a regression statistic as text in a locale, for `FittedResult`.
 * - A magnitude below 1e-12 is floating point noise and is written as 0, so a
 *   value such as 3.388e-21 never becomes a long string of zeros.
 * - From 1e-12 up to 1e-6 it uses scientific notation with 4 significant
 *   digits, such as 1.235E-8.
 * - From 1e-6 up to 1 it keeps 4 significant digits, so a small slope such as
 *   0.00001 never shows as 0.
 * - A larger magnitude keeps 4 decimal places.
 *
 * The result is never "-0". The value must be finite: `Intl` writes NaN and
 * Infinity as symbols that mean nothing as a statistic.
 */
export function makeStatisticTextFromNumber(options: {
  value: number;
  locale: string;
}): string {
  const { value, locale } = options;
  const magnitude = Math.abs(value);
  // Snapping noise to a positive zero also drops the sign of `-0`, which
  // `-0 === 0` would otherwise let through.
  const unsignedZeroValue = magnitude < NOISE_MAGNITUDE ? 0 : value;
  return unsignedZeroValue.toLocaleString(
    locale,
    _getFormatOptionsFromMagnitude(Math.abs(unsignedZeroValue)),
  );
}
