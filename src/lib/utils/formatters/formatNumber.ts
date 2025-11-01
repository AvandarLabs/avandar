export type SignDisplay = "auto" | "always" | "exceptZero" | "negative";

const DEFAULT_CURRENCY = "USD";

/**
 * Union of valid ECMA-402 units
 * @see {@link https://tc39.es/ecma402/#table-sanctioned-simple-unit-identifiers | ECMA-402}
 */
type ValidNumberUnit =
  | "percent"
  | "bit"
  | "byte"
  | "kilobit"
  | "kilobyte"
  | "megabit"
  | "megabyte"
  | "gigabit"
  | "gigabyte"
  | "terabit"
  | "terabyte"
  | "meter"
  | "kilometer"
  | "centimeter"
  | "millimeter"
  | "inch"
  | "foot"
  | "yard"
  | "mile"
  | "gram"
  | "kilogram"
  | "milligram"
  | "ton"
  | "ounce"
  | "pound"
  | "stone"
  | "liter"
  | "milliliter"
  | "cubic-meter"
  | "cubic-centimeter"
  | "cubic-inch"
  | "cubic-foot"
  | "cubic-yard"
  | "gallon"
  | "quart"
  | "pint"
  | "cup"
  | "fluid-ounce"
  | "hour"
  | "minute"
  | "second"
  | "millisecond"
  | "microsecond"
  | "nanosecond"
  | "day"
  | "week"
  | "month"
  | "year"
  | "degree"
  | "radian"
  | "gradian"
  | "arc-minute"
  | "arc-second"
  | "watt"
  | "kilowatt"
  | "megawatt"
  | "gigawatt"
  | "volt"
  | "ampere"
  | "ohm"
  | "pascal"
  | "bar"
  | "atmosphere"
  | "hertz"
  | "megahertz"
  | "gigahertz"
  | "bit-per-second"
  | "kilobit-per-second"
  | "megabit-per-second"
  | "gigabit-per-second"
  | "mile-per-hour"
  | "kilometer-per-hour"
  | "meter-per-second";

/**
 * Options for how currency is displayed.
 */
type FormatCurrencyOptions = {
  /**
   * ISO 4217 currency code used when `style` is "currency".
   *
   * Examples (locale: 'en-US'):
   * - currency: 'USD' → "$1,234.56"
   * - currency: 'EUR' → "€1,234.56"
   * - currency: 'JPY' → "¥1,235" (no fraction digits by currency default)
   * @defaultValue "USD"
   */
  currency?: string;

  /**
   * Controls how the currency is displayed.
   * - "symbol": localized symbol (e.g., "$", "€", "CA$")
   * - "narrowSymbol": narrow symbol where available
   *   (e.g., "$" instead of "CA$")
   * - "code": currency code (e.g., "USD 1,234.56")
   * - "name": localized currency name (e.g., "1,234.56 US dollars")
   *
   * Examples (locale: 'en-US') with currency 'CAD':
   * - currencyDisplay: 'symbol' → "CA$1,234.56"
   * - currencyDisplay: 'narrowSymbol' → "$1,234.56"
   * - currencyDisplay: 'code' → "CAD 1,234.56"
   * - currencyDisplay: 'name' → "1,234.56 Canadian dollars"
   */
  currencyDisplay?: "symbol" | "narrowSymbol" | "code" | "name";

  /**
   * Controls how negative currency values are displayed.
   * - "standard": uses a minus sign (e.g., "-$1,234.56")
   * - "accounting": uses parentheses (e.g., "($1,234.56)")
   */
  currencySign?: "standard" | "accounting";
};

/**
 * Options for how the units of a number are displayed.
 */
type NumberUnitOptions = {
  /**
   * The unit to display with the number. Only valid ECMA-402 units are
   * supported.
   * @see {@link https://tc39.es/ecma402/#table-sanctioned-simple-unit-identifiers | ECMA-402}
   */
  unit?: ValidNumberUnit;

  /**
   * Controls the display width of the unit when `style` is "unit".
   * - "short": abbreviated, e.g., "42 MB", "10 km"
   * - "long": full name, e.g., "42 megabytes", "10 kilometers"
   * - "narrow": minimal width, often no space, e.g., "42MB", "10km"
   *
   * Examples (locale: 'en-US'):
   * - unit: 'megabyte', 'short'  → "42 MB"
   * - unit: 'megabyte', 'long'   → "42 megabytes"
   * - unit: 'megabyte', 'narrow' → "42MB"
   * - unit: 'kilometer', 'short'  → "10 km"
   * - unit: 'kilometer', 'long'   → "10 kilometers"
   * - unit: 'kilometer', 'narrow' → "10km"
   */
  unitDisplay?: "short" | "long" | "narrow";
};

/** Options for how to display the numeric notation */
type NotationOptions = {
  /**
   * Controls numeric notation style.
   * - "standard": regular formatting (e.g., 1200 → "1,200")
   * - "compact": locale-aware compact form
   *   (e.g., 1200 → "1.2K" in 'en-US')
   *
   * **NOTE:** `"compact"` pairs with `compactDisplay` to choose short vs long
   * labels.
   *
   * @defaultValue "standard"
   */
  notation?: "standard" | "compact";

  /**
   * Display width for compact notation. Only used when `notation` is
   * `"compact"`.
   * - "short": e.g., 1,200 → "1.2K"
   * - "long": e.g., 1,200 → "1.2 thousand"
   */
  compactDisplay?: "short" | "long";
};

/** Options for how to display or group digits */
type DigitsAndGroupingOptions = {
  /**
   * Minimum fraction digits to show.
   * - Pads with trailing zeros if needed.
   * - Common for currencies (e.g., 2) or precise metrics.
   *
   * @example
   * formatNumber(12.3, {
   *   locale: 'en-US', minimumFractionDigits: 2
   * }) // "12.30"
   */
  minimumFractionDigits?: number;

  /**
   * Maximum fraction digits to show.
   * - Extra decimals are rounded according to `roundingMode`.
   * - Combine with `minimumFractionDigits` to fix a range.
   *
   * @example
   * formatNumber(12.3456, {
   *   locale: 'en-US', maximumFractionDigits: 2
   * }) // "12.35"
   */
  maximumFractionDigits?: number;

  /**
   * Minimum number of integer digits.
   * - Pads with leading zeros if needed (e.g., 7 → "007").
   *
   * @example
   * formatNumber(7, {
   *   locale: 'en-US', minimumIntegerDigits: 3
   * }) // "007"
   */
  minimumIntegerDigits?: number;

  /**
   * Controls thousands grouping separators.
   * - true: always group (locale aware), e.g., "12,345".
   * - false: never group, e.g., "12345".
   * - "min2": show grouping only if the number would produce
   *   at least two grouping separators in this locale
   *   (e.g., en-US groups 1,234,567 but not 12,345).
   * @defaultValue true
   * @example
   * formatNumber(12345, {
   *   locale: 'en-US', useGrouping: true
   * }) // "12,345"
   * @example
   * formatNumber(12345, {
   *   locale: 'en-US', useGrouping: false
   * }) // "12345"
   * @example
   * formatNumber(12345, {
   *   locale: 'en-US', useGrouping: 'min2'
   * }) // "12345"
   * @example
   * formatNumber(1234567, {
   *   locale: 'en-US', useGrouping: 'min2'
   * }) // "1,234,567"
   */
  useGrouping?: boolean | "min2";
};

/**
 * These are a typed, lightweight veneer over Intl.NumberFormatOptions.
 * Only common fields are exposed to keep bundle size and API simple.
 */
export type FormatNumberOptions =
  & {
    /**
     * Locale(s) used for formatting. Locales must be specified as BCP 47 tags.
     * If an array is provided, the first locale that is supported will be used
     * (this is how you can specify fallbacks).
     *
     * If `undefined`, the environment default locale will be used.
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Glossary/BCP_47_language_tag | BCP 47 language tag}
     */
    locale?: string | string[];

    /**
     * High level format style.
     * - "decimal": plain numbers
     * - "currency": needs `currency`
     * - "percent": 0.25 → "25%"
     * - "unit": needs `unit` options (see {@link ValidNumberUnit} and
     *   {@link NumberUnitOptions})

     * @defaultValue "decimal"
     */
    style?: "decimal" | "currency" | "percent" | "unit";

    /**
     * Rounding strategy for fraction trimming.
     * Examples assume maximumFractionDigits: 1.
     * - ceil (1.21 → 1.3)
     * - floor (1.21 → 1.2)
     * - expand (-1.21 → -1.3)
     * - trunc (-1.21 → -1.2)
     * - halfCeil (1.25 → 1.3)
     * - halfFloor (1.25 → 1.2)
     * - halfExpand (1.25 → 1.3)
     * - halfTrunc (1.25 → 1.2)
     * - halfEven (1.25 → 1.2)
     */
    roundingMode?:
      | "ceil"
      | "floor"
      | "expand"
      | "trunc"
      | "halfCeil"
      | "halfFloor"
      | "halfExpand"
      | "halfTrunc"
      | "halfEven";

    /**
     * Trailing zeros behavior.
     * - "auto": keep zeros per locale and options
     * - "stripIfInteger": remove if result is an integer
     */
    trailingZeroDisplay?: "auto" | "stripIfInteger";

    /**
     * Sign rendering policy.
     * - "auto": negatives only
     * - "always": always show sign
     * - "exceptZero": signs for non-zero values
     * - "negative": parentheses for negatives in some locales
     */
    signDisplay?: "auto" | "always" | "exceptZero" | "negative";
  }
  & NotationOptions
  & DigitsAndGroupingOptions
  & FormatCurrencyOptions
  & NumberUnitOptions;

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
  const formatter: Intl.NumberFormat | undefined = formatterCache.get(
    formatterKey,
  );
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
