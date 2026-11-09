import { DataCatalogListingParsers } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListingParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { buildDataCatalogSearchFilterArgs } from "@/clients/data-catalog-listings/buildDataCatalogSearchFilterArgs/buildDataCatalogSearchFilterArgs";
import { createDataCatalogResolvedCompanions } from "@/clients/data-catalog-listings/createDataCatalogResolvedCompanions/createDataCatalogResolvedCompanions";
import { createDataCatalogSearchFacets } from "@/clients/data-catalog-listings/createDataCatalogSearchFacets/createDataCatalogSearchFacets";
import { createDataCatalogSearchPage } from "@/clients/data-catalog-listings/createDataCatalogSearchPage/createDataCatalogSearchPage";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { Workspace } from "$/models/Workspace/Workspace";
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

        /**
         * The listings recommended alongside a listing, in the order it names
         * them, with whether each is already in `workspaceId`. A companion
         * no listing matches yet is left out.
         */
        getCompanions: async ({
          catalogListingId,
          workspaceId,
        }: {
          catalogListingId: DataCatalogListing.Id;
          workspaceId: Workspace.Id;
        }): Promise<DataCatalogListing.ResolvedCompanion[]> => {
          const logger = clientLogger.appendName("getCompanions");
          logger.log("Getting a catalog listing's companions", {
            catalogListingId,
            workspaceId,
          });

          const { data: dbRows } = await dbClient
            .rpc("rpc_data_catalog_listings__get_companions", {
              p_catalog_listing_id: catalogListingId,
              p_workspace_id: workspaceId,
            })
            .throwOnError();

          return createDataCatalogResolvedCompanions(dbRows ?? []);
        },

        /**
         * The keywords containing every fragment of `tagSearch`, at most 50,
         * each with how many listings matching `query` and every filter but
         * the keyword filter carry it.
         */
        searchTagOptions: async ({
          tagSearch,
          query,
          filters,
        }: {
          tagSearch: string;
          query: string;
          filters: Readonly<DataCatalogListing.SearchFilters>;
        }): Promise<DataCatalogListing.FacetOption[]> => {
          const logger = clientLogger.appendName("searchTagOptions");
          logger.log("Searching catalog keywords", { tagSearch, query });

          const { data: dbRows } = await dbClient
            .rpc("rpc_data_catalog_listings__search_tag_options", {
              p_tag_search: tagSearch,
              p_query: query,
              ...buildDataCatalogSearchFilterArgs(filters),
            })
            .throwOnError();

          return (dbRows ?? []).map((dbRow) => {
            // The generated type marks `listing_count` non-null, but it is
            // null where too many listings match to count them.
            const listingCount: number | null = dbRow.listing_count;
            return { value: dbRow.value, count: listingCount ?? undefined };
          });
        },
      };
    },
  }),
);
