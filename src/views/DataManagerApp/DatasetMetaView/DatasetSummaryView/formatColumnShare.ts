/**
 * Formats a 0-to-1 share of rows as a percentage.
 *
 * One formatter for every share in the summary, because the same fact used
 * to be rounded two ways on one screen: the sentence said a value appeared
 * in "12%" of rows while the bar beneath it read "11.8%".
 *
 * Small shares keep two decimals so a rare value does not collapse to 0%.
 */
export function formatColumnShare(share: number, locale: string): string {
  if (!Number.isFinite(share)) {
    return "–";
  }
  const percent = share * 100;
  const fractionDigits = percent > 0 && percent < 1 ? 2 : 1;
  return `${percent.toLocaleString(locale, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: 0,
  })}%`;
}
