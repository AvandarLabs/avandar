import type { DataCatalogListingRead } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.types";

/**
 * How recently a listing must have been updated. The windows are cumulative:
 * a listing updated last week is also within the past year.
 */
export type CatalogUpdatedWithin = "any" | "pastMonth" | "pastYear" | "overAYear";

/** The order the catalog's results are listed in. */
export type CatalogSortBy = "relevance" | "updated" | "name";

/**
 * The narrowing a user has applied to the catalog. Values inside one facet
 * are alternatives; separate facets must all match.
 */
export type CatalogListingFilters = {
  /** External organizations to keep. Empty keeps every source. */
  sources: string[];

  /** Upper-cased file formats to keep. Empty keeps every format. */
  formats: string[];

  updatedWithin: CatalogUpdatedWithin;

  /** Whether listings whose dataset cannot be loaded are hidden. */
  isLoadableOnly: boolean;
};

/** One choosable value of a facet and how many listings it would keep. */
export type CatalogFacetOption = {
  value: string;
  count: number;
};

/** The choices each facet offers, counted against the other facets. */
export type CatalogFacets = {
  sources: CatalogFacetOption[];
  formats: CatalogFacetOption[];
  updatedWithin: Record<CatalogUpdatedWithin, number>;

  /** Unloadable listings that match everything except loadable-only. */
  numUnloadable: number;
};

/** The catalog with nothing narrowed except unloadable listings. */
export const EMPTY_CATALOG_LISTING_FILTERS: Readonly<CatalogListingFilters> = {
  sources: [],
  formats: [],
  updatedWithin: "any",
  isLoadableOnly: true,
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PAST_MONTH_DAYS = 31;
const PAST_YEAR_DAYS = 365;

type FacetKey = "sources" | "formats" | "updatedWithin" | "isLoadableOnly";

/**
 * The file format a listing's rows arrive in, upper-cased. An API resource
 * reports its own; a pipeline listing is a parquet file.
 */
export function getCatalogListingFormat(
  listing: Readonly<DataCatalogListingRead>,
): string | undefined {
  if (listing.apiResourceFormat) {
    return listing.apiResourceFormat.toUpperCase();
  }
  return listing.parquetFileName === undefined ? undefined : "PARQUET";
}

/**
 * When a listing last changed: the source's own update date when it reports
 * one, otherwise when Avandar last synced it.
 */
export function getCatalogListingUpdatedDate(
  listing: Readonly<DataCatalogListingRead>,
): Date | undefined {
  const isoDate = listing.dateOfLastUpdate ?? listing.dateOfLastSync;
  return isoDate === undefined ? undefined : new Date(isoDate);
}

function _isUpdatedWithin(options: {
  listing: Readonly<DataCatalogListingRead>;
  updatedWithin: CatalogUpdatedWithin;
  now: Date;
}): boolean {
  if (options.updatedWithin === "any") {
    return true;
  }
  const updatedDate = getCatalogListingUpdatedDate(options.listing);
  if (updatedDate === undefined) {
    return false;
  }
  const ageInMs = options.now.getTime() - updatedDate.getTime();
  const ageInDays = ageInMs / MS_PER_DAY;
  switch (options.updatedWithin) {
    case "pastMonth":
      return ageInDays <= PAST_MONTH_DAYS;
    case "pastYear":
      return ageInDays <= PAST_YEAR_DAYS;
    case "overAYear":
      return ageInDays > PAST_YEAR_DAYS;
  }
}

/** Whether a listing passes every facet except the one named in `skip`. */
function _matchesFilters(options: {
  listing: Readonly<DataCatalogListingRead>;
  filters: Readonly<CatalogListingFilters>;
  now: Date;
  skip?: FacetKey;
}): boolean {
  const { listing, filters, now, skip } = options;
  if (skip !== "isLoadableOnly" && filters.isLoadableOnly && listing.isInvalid) {
    return false;
  }
  if (
    skip !== "sources" &&
    filters.sources.length > 0 &&
    !filters.sources.includes(listing.externalOrganizationName)
  ) {
    return false;
  }
  const format = getCatalogListingFormat(listing);
  if (
    skip !== "formats" &&
    filters.formats.length > 0 &&
    (format === undefined || !filters.formats.includes(format))
  ) {
    return false;
  }
  return (
    skip === "updatedWithin" ||
    _isUpdatedWithin({ listing, updatedWithin: filters.updatedWithin, now })
  );
}

/** The listings that pass every active filter, in their incoming order. */
export function filterCatalogListings(options: {
  listings: readonly DataCatalogListingRead[];
  filters: Readonly<CatalogListingFilters>;
  now: Date;
}): DataCatalogListingRead[] {
  return options.listings.filter((listing) => {
    return _matchesFilters({ ...options, listing });
  });
}

/**
 * Counts each value of a facet, keeping chosen values even at zero so a user
 * can always uncheck what they checked. Most common first, then by name.
 */
function _countFacetValues(options: {
  values: ReadonlyArray<string | undefined>;
  chosenValues: readonly string[];
}): CatalogFacetOption[] {
  const counts = new Map<string, number>(
    options.chosenValues.map((value) => {
      return [value, 0];
    }),
  );
  options.values.forEach((value) => {
    if (value !== undefined) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  });
  return [...counts]
    .map(([value, count]) => {
      return { value, count };
    })
    .sort((optionA, optionB) => {
      return (
        optionB.count - optionA.count ||
        optionA.value.localeCompare(optionB.value)
      );
    });
}

/**
 * The options each facet offers. Each facet is counted against every other
 * active filter but not itself, so choosing one source never makes the
 * remaining sources read as empty.
 */
export function buildCatalogFacets(options: {
  listings: readonly DataCatalogListingRead[];
  filters: Readonly<CatalogListingFilters>;
  now: Date;
}): CatalogFacets {
  const { listings, filters, now } = options;
  const matchingAllBut = (skip: FacetKey) => {
    return listings.filter((listing) => {
      return _matchesFilters({ listing, filters, now, skip });
    });
  };
  const datedListings = matchingAllBut("updatedWithin");
  const countUpdatedWithin = (updatedWithin: CatalogUpdatedWithin) => {
    return datedListings.filter((listing) => {
      return _isUpdatedWithin({ listing, updatedWithin, now });
    }).length;
  };

  return {
    sources: _countFacetValues({
      values: matchingAllBut("sources").map((listing) => {
        return listing.externalOrganizationName;
      }),
      chosenValues: filters.sources,
    }),
    formats: _countFacetValues({
      values: matchingAllBut("formats").map(getCatalogListingFormat),
      chosenValues: filters.formats,
    }),
    updatedWithin: {
      any: datedListings.length,
      pastMonth: countUpdatedWithin("pastMonth"),
      pastYear: countUpdatedWithin("pastYear"),
      overAYear: countUpdatedWithin("overAYear"),
    },
    numUnloadable: matchingAllBut("isLoadableOnly").filter((listing) => {
      return listing.isInvalid;
    }).length,
  };
}

/**
 * Orders listings for display. `relevance` keeps the incoming order, which
 * is the search's ranking; listings with no update date sort last.
 */
export function sortCatalogListings(options: {
  listings: readonly DataCatalogListingRead[];
  sortBy: CatalogSortBy;
}): DataCatalogListingRead[] {
  const listings = [...options.listings];
  if (options.sortBy === "name") {
    return listings.sort((listingA, listingB) => {
      return listingA.displayName.localeCompare(listingB.displayName);
    });
  }
  if (options.sortBy === "updated") {
    return listings.sort((listingA, listingB) => {
      const timeA = getCatalogListingUpdatedDate(listingA)?.getTime() ?? 0;
      const timeB = getCatalogListingUpdatedDate(listingB)?.getTime() ?? 0;
      return timeB - timeA;
    });
  }
  return listings;
}
