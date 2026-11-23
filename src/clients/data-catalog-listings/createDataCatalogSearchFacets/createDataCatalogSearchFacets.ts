import { z } from "zod";
import { UPDATED_WITHIN_DB_VALUES } from "@/clients/data-catalog-listings/buildDataCatalogSearchFilterArgs/buildDataCatalogSearchFilterArgs";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";

const DataCatalogSearchFacetDBRowsSchema = z.array(
  z.object({
    facet: z.string(),
    value: z.string().nullable(),
    listing_count: z.number().nullable(),
  }),
);

/**
 * One facet row in the JSON array `rpc_data_catalog_listings__search_facets`
 * returns. `value` is null on the `unloadable` and `catalog` rows, and
 * `listing_count` is null where too many listings match to count them.
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
      return {
        value: dbRow.value ?? "",
        count: dbRow.listing_count ?? undefined,
      };
    });
}

function _toValuesByCount(
  dbRows: readonly DataCatalogSearchFacetDBRow[],
  facet: string,
): string[] {
  return _toFacetOptions(dbRows, facet)
    .toSorted((optionA, optionB) => {
      return (optionB.count ?? 0) - (optionA.count ?? 0);
    })
    .map((option) => {
      return option.value;
    });
}

/**
 * A row's count: 0 when Postgres returned no row, undefined when it returned
 * the row without a count.
 */
function _toCount(
  dbRow: DataCatalogSearchFacetDBRow | undefined,
): number | undefined {
  return dbRow === undefined ? 0 : (dbRow.listing_count ?? undefined);
}

function _toSingleCount(
  dbRows: readonly DataCatalogSearchFacetDBRow[],
  facet: string,
): number | undefined {
  return _toCount(
    dbRows.find((dbRow) => {
      return dbRow.facet === facet;
    }),
  );
}

function _toUpdatedWithinCount(
  dbRows: readonly DataCatalogSearchFacetDBRow[],
  updatedWithin: DataCatalogListing.UpdatedWithin,
): number | undefined {
  return _toCount(
    dbRows.find((dbRow) => {
      return (
        dbRow.facet === "updated_within" &&
        dbRow.value === UPDATED_WITHIN_DB_VALUES[updatedWithin]
      );
    }),
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
    numCatalogListings: _toSingleCount(dbRows, "catalog") ?? 0,
  };
}
