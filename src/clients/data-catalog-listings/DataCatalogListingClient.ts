import { DataCatalogListingParsers } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListingParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { buildDataCatalogSearchFilterArgs } from "@/clients/data-catalog-listings/buildDataCatalogSearchFilterArgs/buildDataCatalogSearchFilterArgs";
import { createDataCatalogSearchFacets } from "@/clients/data-catalog-listings/createDataCatalogSearchFacets/createDataCatalogSearchFacets";
import { createDataCatalogSearchPage } from "@/clients/data-catalog-listings/createDataCatalogSearchPage/createDataCatalogSearchPage";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { DataCatalogSearchPage } from "@/clients/data-catalog-listings/createDataCatalogSearchPage/createDataCatalogSearchPage";

export const DataCatalogListingClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "DataCatalogListing",
    tableName: "data_catalog_listings",
    dbTablePrimaryKey: "id",
    parsers: DataCatalogListingParsers,
    queries: ({ clientLogger, dbClient }) => {
      return {
        /**
         * One page of listings matching `query` and `filters`, in `sortBy`
         * order. Rows carry only the columns the catalog's list shows.
         */
        search: async ({
          query,
          filters,
          sortBy,
          pageSize,
          pageNum,
        }: {
          query: string;
          filters: Readonly<DataCatalogListing.SearchFilters>;
          sortBy: DataCatalogListing.SortBy;
          pageSize: number;
          pageNum: number;
        }): Promise<DataCatalogSearchPage> => {
          const logger = clientLogger.appendName("search");
          logger.log("Searching catalog listings", {
            query,
            filters,
            sortBy,
            pageNum,
          });

          const { data: dbRows } = await dbClient
            .rpc("rpc_data_catalog_listings__search", {
              p_query: query,
              p_limit: pageSize,
              p_offset: pageNum * pageSize,
              p_sort_by: sortBy,
              ...buildDataCatalogSearchFilterArgs(filters),
            })
            .throwOnError();

          return createDataCatalogSearchPage({
            dbRows: dbRows ?? [],
            pageNum,
            pageSize,
          });
        },

        /**
         * What each filter would keep for `query` and `filters`, counted
         * against every other filter, plus the whole catalog's size.
         */
        searchFacets: async ({
          query,
          filters,
        }: {
          query: string;
          filters: Readonly<DataCatalogListing.SearchFilters>;
        }): Promise<DataCatalogListing.SearchFacets> => {
          const logger = clientLogger.appendName("searchFacets");
          logger.log("Counting catalog facets", { query, filters });

          const { data: dbFacetRows } = await dbClient
            .rpc("rpc_data_catalog_listings__search_facets", {
              p_query: query,
              ...buildDataCatalogSearchFilterArgs(filters),
            })
            .throwOnError();

          return createDataCatalogSearchFacets(dbFacetRows);
        },
      };
    },
  }),
);
