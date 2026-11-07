/**
 * Formats a catalog date as a short date in the reader's locale (e.g.
 * "Mar 17, 2026"), the precision a user needs to judge freshness.
 */
export function formatCatalogListingDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
