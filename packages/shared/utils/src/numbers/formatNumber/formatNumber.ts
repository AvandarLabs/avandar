import type { FormatNumberOptions } from "@utils/numbers/formatNumber/formatNumber.types.ts";

const DEFAULT_CURRENCY = "USD";

// Cache of Intl.NumberFormat instances keyed by a stable string of
// (locale, options).
const formatterCache: Map<string, Intl.NumberFormat> = new Map();

function _getFormatterKey(
  locale: string | string[] | undefined,
  options: Intl.NumberFormatOptions,
): string {
  // Remove undefined vals to avoid key bloat
  const cleanedOptions: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(options)) {
    if (v !== undefined) {
      cleanedOptions[k] = v;
    }
  }
  return JSON.stringify([locale ?? "default", cleanedOptions]);
}

function _getNumberFormatter(
  locale: string | string[] | undefined,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const formatterKey: string = _getFormatterKey(locale, options);
  const formatter: Intl.NumberFormat | undefined =
    formatterCache.get(formatterKey);
  if (formatter) {
    return formatter;
  }
  const newFormatter = new Intl.NumberFormat(locale, options);
  formatterCache.set(formatterKey, newFormatter);
  return newFormatter;
}

/**
 * Format a number using native Intl.NumberFormat with strict, typed options.
 * Returns an empty string for NaN/±Infinity to avoid displaying invalid values
 * in the UI.
 *
 * @see {@link FormatNumberOptions} for the options that can be passed.
 */
export function formatNumber(
  num: number,
  options: FormatNumberOptions = {},
): string {
  if (!Number.isFinite(num)) {
    return "";
  }

  const {
    locale,
    style = "decimal",
    currency,
    currencyDisplay,
    currencySign,
    unit,
    unitDisplay,
    notation = "standard",
    compactDisplay,
    minimumFractionDigits,
    maximumFractionDigits,
    minimumIntegerDigits,
    useGrouping = true,
    roundingMode,
    trailingZeroDisplay,
    signDisplay,
  } = options;

  let optionsToPass: Intl.NumberFormatOptions = {
    style,
    notation,
    compactDisplay,
    minimumFractionDigits,
    maximumFractionDigits,
    minimumIntegerDigits,
    useGrouping,
    roundingMode,
    trailingZeroDisplay,
    signDisplay,
  };

  if (style === "currency") {
    optionsToPass = {
      ...optionsToPass,
      currency: currency ?? DEFAULT_CURRENCY,
      currencyDisplay: currencyDisplay,
      currencySign: currencySign,
    };
  } else if (style === "unit" && unit) {
    optionsToPass = {
      ...optionsToPass,
      unit: unit,
      unitDisplay,
    };
  }

  const formatter: Intl.NumberFormat = _getNumberFormatter(
    locale,
    optionsToPass,
  );
  return formatter.format(num);
}

export type {
  FormatNumberOptions,
  SignDisplay,
} from "@utils/numbers/formatNumber/formatNumber.types.ts";
