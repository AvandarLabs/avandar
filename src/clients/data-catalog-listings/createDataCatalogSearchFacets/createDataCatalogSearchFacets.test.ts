import { describe, expect, it } from "vitest";
import { createDataCatalogSearchFacets } from "@/clients/data-catalog-listings/createDataCatalogSearchFacets/createDataCatalogSearchFacets";
import type { DataCatalogSearchFacetDBRow } from "@/clients/data-catalog-listings/createDataCatalogSearchFacets/createDataCatalogSearchFacets";

function _row(
  facet: string,
  value: string | null,
  listingCount: number,
): DataCatalogSearchFacetDBRow {
  return { facet, value, listing_count: listingCount };
}

describe("createDataCatalogSearchFacets", () => {
  it("keeps each facet's options in the order Postgres ranked them", () => {
    const facets = createDataCatalogSearchFacets([
      _row("source", "World Bank", 40),
      _row("source", "City of New York", 12),
      _row("format", "CSV", 30),
      _row("format", "PARQUET", 22),
    ]);

    expect(facets.sources).toEqual([
      { value: "World Bank", count: 40 },
      { value: "City of New York", count: 12 },
    ]);
    expect(facets.formats).toEqual([
      { value: "CSV", count: 30 },
      { value: "PARQUET", count: 22 },
    ]);
  });

  it("reads the update windows into the camel-cased names the filters use", () => {
    const facets = createDataCatalogSearchFacets([
      _row("updated_within", "any", 52),
      _row("updated_within", "past_month", 4),
      _row("updated_within", "past_year", 31),
      _row("updated_within", "over_a_year", 21),
    ]);

    expect(facets.updatedWithin).toEqual({
      any: 52,
      pastMonth: 4,
      pastYear: 31,
      overAYear: 21,
    });
  });

  it("reads the unloadable count and the whole catalog's size", () => {
    const facets = createDataCatalogSearchFacets([
      _row("unloadable", null, 3),
      _row("catalog", null, 5012),
    ]);

    expect(facets.numUnloadable).toBe(3);
    expect(facets.numCatalogListings).toBe(5012);
  });

  it("counts zero for every facet Postgres returned no row for", () => {
    const facets = createDataCatalogSearchFacets([]);

    expect(facets).toEqual({
      sources: [],
      formats: [],
      updatedWithin: { any: 0, pastMonth: 0, pastYear: 0, overAYear: 0 },
      numUnloadable: 0,
      numCatalogListings: 0,
    });
  });
});
