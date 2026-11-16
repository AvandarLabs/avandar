import { describe, expect, it } from "vitest";
import { createDataCatalogSearchFacets } from "@/clients/data-catalog-listings/createDataCatalogSearchFacets/createDataCatalogSearchFacets";
import type { DataCatalogSearchFacetDBRow } from "@/clients/data-catalog-listings/createDataCatalogSearchFacets/createDataCatalogSearchFacets";

function _row(
  facet: string,
  value: string | null,
  listingCount: number | null,
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

  it("reads the second organization level, its labels, and the topics", () => {
    const facets = createDataCatalogSearchFacets([
      _row("organization2", "Taxi and Limousine Commission", 80),
      _row("organization2", "Department of Health", 12),
      _row("organization2_label", "Agency", 90),
      _row("organization2_label", "Department", 2),
      _row("domain", "Transportation", 95),
      _row("domain", "Health", 12),
    ]);

    expect(facets.organization2).toEqual([
      { value: "Taxi and Limousine Commission", count: 80 },
      { value: "Department of Health", count: 12 },
    ]);
    expect(facets.organization2Labels).toEqual(["Agency", "Department"]);
    expect(facets.domains).toEqual([
      { value: "Transportation", count: 95 },
      { value: "Health", count: 12 },
    ]);
  });

  it("reads the keywords", () => {
    const facets = createDataCatalogSearchFacets([
      _row("tag", "taxi", 40),
      _row("tag", "for hire", 12),
    ]);

    expect(facets.tags).toEqual([
      { value: "taxi", count: 40 },
      { value: "for hire", count: 12 },
    ]);
  });

  it("lists the labels with the most listings first", () => {
    const facets = createDataCatalogSearchFacets([
      _row("organization2_label", "Department", 2),
      _row("organization2_label", "Agency", 90),
    ]);

    expect(facets.organization2Labels).toEqual(["Agency", "Department"]);
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
      organization2: [],
      organization2Labels: [],
      domains: [],
      tags: [],
      formats: [],
      updatedWithin: { any: 0, pastMonth: 0, pastYear: 0, overAYear: 0 },
      numUnloadable: 0,
      numCatalogListings: 0,
    });
  });

  it("reads the JSON array the RPC returns", () => {
    const facets = createDataCatalogSearchFacets(
      JSON.parse(
        '[{"facet": "source", "value": "World Bank", "listing_count": 40},' +
          ' {"facet": "catalog", "value": null, "listing_count": 5012}]',
      ),
    );

    expect(facets.sources).toEqual([{ value: "World Bank", count: 40 }]);
    expect(facets.numCatalogListings).toBe(5012);
  });

  it("counts zero for every facet when the RPC returns null", () => {
    expect(createDataCatalogSearchFacets(null).numCatalogListings).toBe(0);
  });

  it("throws when the RPC returns something other than facet rows", () => {
    expect(() => {
      return createDataCatalogSearchFacets([{ facet: "source" }]);
    }).toThrow();
  });

  it("leaves out the counts Postgres could not count", () => {
    const facets = createDataCatalogSearchFacets([
      _row("source", "World Bank", null),
      _row("updated_within", "any", null),
      _row("unloadable", null, null),
    ]);

    expect(facets.sources).toEqual([{ value: "World Bank", count: undefined }]);
    expect(facets.updatedWithin.any).toBeUndefined();
    expect(facets.numUnloadable).toBeUndefined();
  });
});
