import type { useLingui } from "@lingui/react/macro";

type TranslateFn = ReturnType<typeof useLingui>["t"];

/**
 * Formats a dashboard's ISO timestamp into a short locale-aware date
 * (e.g. "Mar 17, 2026") for use in dashboard list rows and pickers.
 * Falls back to the translated "recently" string if the input cannot be
 * parsed. Accepts the Lingui `t` macro so the fallback can be translated.
 */
export function formatDashboardDate(
  dateString: string,
  t: TranslateFn,
): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return t`recently`;
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
