import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";

/** How many organization levels the line names. */
const NUM_ORGANIZATION_LEVELS_SHOWN = 2;

/**
 * A listing's organizations as one line of text, such as "Taxi and Limousine
 * Commission (TLC) · City of New York": its two deepest levels, deepest
 * first, since the deepest level is what tells two listings from one portal
 * apart. Missing levels are skipped, so a listing with one level shows one.
 *
 * Use it wherever a listing names who published it in a single line, for
 * example a search result's facts line.
 */
export function buildOrganizationLine(
  listing: Readonly<
    Pick<
      DataCatalogListing.SearchResult,
      | "organization1Name"
      | "organization2Name"
      | "organization3Name"
      | "organization4Name"
    >
  >,
): string {
  return [
    listing.organization1Name,
    listing.organization2Name,
    listing.organization3Name,
    listing.organization4Name,
  ]
    .filter((organizationName): organizationName is string => {
      return Boolean(organizationName);
    })
    .slice(-NUM_ORGANIZATION_LEVELS_SHOWN)
    .reverse()
    .join(" · ");
}
