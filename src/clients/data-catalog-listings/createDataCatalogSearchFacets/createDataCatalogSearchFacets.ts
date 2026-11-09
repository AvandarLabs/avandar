import { z } from "zod";
import { UPDATED_WITHIN_DB_VALUES } from "@/clients/data-catalog-listings/buildDataCatalogSearchFilterArgs/buildDataCatalogSearchFilterArgs";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";

const DataCatalogSearchFacetDBRowsSchema = z.array(
  z.object({
    facet: z.string(),
    value: z.string().nullable(),
    listing_count: z.number(),
  }),
);

/**
 * One facet row in the JSON array `rpc_data_catalog_listings__search_facets`
 * returns. `value` is null on the `unloadable` and `catalog` rows.
 */
export type DataCatalogSearchFacetDBRow = z.infer<
  typeof DataCatalogSearchFacetDBRowsSchema
>[number];

function _toFacetOptions(
  dbRows: readonly DataCatalogSearchFacetDBRow[],
  facet: string,
): DataCatalogListing.FacetOption[] {
  return dbRows
    .filter((dbRow) => {
      return dbRow.facet === facet && dbRow.value !== null;
    })
    .map((dbRow) => {
      return { value: dbRow.value ?? "", count: dbRow.listing_count };
    });
}

function _toValuesByCount(
  dbRows: readonly DataCatalogSearchFacetDBRow[],
  facet: string,
): string[] {
  return _toFacetOptions(dbRows, facet)
    .toSorted((optionA, optionB) => {
      return optionB.count - optionA.count;
    })
    .map((option) => {
      return option.value;
    });
}

function _toSingleCount(
  dbRows: readonly DataCatalogSearchFacetDBRow[],
  facet: string,
): number {
  return (
    dbRows.find((dbRow) => {
      return dbRow.facet === facet;
    })?.listing_count ?? 0
  );
}

function _toUpdatedWithinCount(
  dbRows: readonly DataCatalogSearchFacetDBRow[],
  updatedWithin: DataCatalogListing.UpdatedWithin,
): number {
  return (
    dbRows.find((dbRow) => {
      return (
        dbRow.facet === "updated_within" &&
        dbRow.value === UPDATED_WITHIN_DB_VALUES[updatedWithin]
      );
    })?.listing_count ?? 0
  );
}

/**
 * Builds the catalog's facets from the JSON array the facet RPC returned.
 * Options keep the order Postgres ranked them in, most listings first, and a
 * facet with no rows counts zero.
 *
 * @throws When the JSON is not an array of facet rows.
 */
export function createDataCatalogSearchFacets(
  dbFacetRows: unknown,
): DataCatalogListing.SearchFacets {
  const dbRows = DataCatalogSearchFacetDBRowsSchema.parse(dbFacetRows ?? []);
  return {
    sources: _toFacetOptions(dbRows, "source"),
    organization2: _toFacetOptions(dbRows, "organization2"),
    organization2Labels: _toValuesByCount(dbRows, "organization2_label"),
    domains: _toFacetOptions(dbRows, "domain"),
    tags: _toFacetOptions(dbRows, "tag"),
    formats: _toFacetOptions(dbRows, "format"),
    updatedWithin: {
      any: _toUpdatedWithinCount(dbRows, "any"),
      pastMonth: _toUpdatedWithinCount(dbRows, "pastMonth"),
      pastYear: _toUpdatedWithinCount(dbRows, "pastYear"),
      overAYear: _toUpdatedWithinCount(dbRows, "overAYear"),
    },
    numUnloadable: _toSingleCount(dbRows, "unloadable"),
    numCatalogListings: _toSingleCount(dbRows, "catalog"),
  };
}
