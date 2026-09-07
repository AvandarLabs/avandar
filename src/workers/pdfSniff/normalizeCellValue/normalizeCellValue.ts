/** Tokens that mean "no value" in a table cell. */
const NULL_TOKENS = new Set([
  "",
  "-",
  "–",
  "—",
  "−",
  "n/a",
  "na",
  "n.a.",
  "nil",
  "null",
]);

/** Characters journals use to attach a footnote to a value. */
const FOOTNOTE_MARKERS = /[*†‡§¶#¹²³⁴⁵⁶⁷⁸⁹⁰]+$/u;

/** Currency symbols we strip before attempting to read a number. */
const CURRENCY_SYMBOLS = /[$€£¥₹]/gu;

/** A number with optional sign, thousands separators, and decimals. */
const NUMERIC_PATTERN = /^-?\d+(\.\d+)?$/u;

/**
 * Collapses every whitespace flavour, including non-breaking spaces, to a
 * single ASCII space and trims the ends.
 */
function _collapseWhitespace(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

/**
 * Removes thousands separators only where the grouping is unambiguous:
 * a comma followed by exactly three digits, repeated to the end of the
 * integer part. `1,234` and `1,234,567` qualify; `1,5` does not, because in
 * much of the world that is a decimal comma and rewriting it to `15` would
 * multiply the value by ten.
 */
function _stripThousandsSeparators(value: string): string {
  if (!/^-?\d{1,3}(,\d{3})+(\.\d+)?$/u.test(value)) {
    return value;
  }
  return value.replace(/,/gu, "");
}

/**
 * Normalises one extracted PDF cell into something DuckDB's CSV sniffer can
 * type correctly, without changing any digit a reader would see in the
 * document.
 *
 * The guiding rule is conservatism: when a value is ambiguous we return it
 * unchanged and let it land as text, because a column that needs a manual
 * cast is a nuisance, while a silently rescaled number is a wrong answer.
 */
export function normalizeCellValue(rawValue: string): string {
  const collapsed = _collapseWhitespace(rawValue);

  if (NULL_TOKENS.has(collapsed.toLowerCase())) {
    return "";
  }

  // Unicode minus to ASCII hyphen, before any numeric test.
  let value = collapsed.replace(/−/gu, "-");

  // Accounting negative, but only when the parentheses wrap everything.
  // "361 (84.7)" is a count and a percent, not a negative number.
  const isFullyParenthesised = /^\((.*)\)$/u.test(value);
  let isAccountingNegative = false;
  if (isFullyParenthesised) {
    const inner = value.slice(1, -1).trim();
    const innerLooksNumeric = /^[$€£¥₹]?\s*[\d,.\s]+$/u.test(inner);
    if (innerLooksNumeric) {
      isAccountingNegative = true;
      value = inner;
    }
  }

  // Strip a trailing footnote marker, but only if what remains is numeric.
  // "Gao*" is a place name; "45.3*" is a measurement with a footnote.
  const withoutMarker = value.replace(FOOTNOTE_MARKERS, "").trim();
  const markerStrippedCandidate = _stripThousandsSeparators(
    withoutMarker.replace(CURRENCY_SYMBOLS, "").replace(/\s*%$/u, "").trim(),
  );
  if (
    withoutMarker !== value &&
    NUMERIC_PATTERN.test(markerStrippedCandidate)
  ) {
    value = withoutMarker;
  }

  // Currency and percent. Percent is stripped without rescaling: 12% is 12.
  const withoutCurrency = value.replace(CURRENCY_SYMBOLS, "").trim();
  const withoutPercent = withoutCurrency.replace(/\s*%$/u, "").trim();
  const candidate = _stripThousandsSeparators(withoutPercent);

  if (NUMERIC_PATTERN.test(candidate)) {
    return isAccountingNegative
      ? `-${candidate.replace(/^-/u, "")}`
      : candidate;
  }

  // Not a number we recognise. Return the collapsed original so nothing is
  // silently altered, undoing the accounting-negative unwrap if we did one.
  return isAccountingNegative ? collapsed : value;
}
