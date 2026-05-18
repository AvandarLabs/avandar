/**
 * Formats a dashboard's ISO timestamp into a short locale-aware date
 * (e.g. "Mar 17, 2026") for use in dashboard list rows and pickers.
 * Falls back to "recently" if the input cannot be parsed.
 */
export function formatDashboardDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "recently";
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
