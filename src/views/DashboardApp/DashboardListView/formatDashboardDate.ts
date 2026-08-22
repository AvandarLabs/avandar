import type { I18n } from "@lingui/core";

import { msg } from "@lingui/core/macro";

/**
 * Formats a dashboard's ISO timestamp into a short locale-aware date
 * (e.g. "Mar 17, 2026") for use in dashboard list rows and pickers.
 * Falls back to the translated "recently" string if the input cannot be
 * parsed. Accepts the Lingui `i18n` instance so the fallback can be translated.
 */
export function formatDashboardDate(dateString: string, i18n: I18n): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return i18n._(msg`recently`);
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
