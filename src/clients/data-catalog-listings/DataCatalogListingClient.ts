import { DataCatalogListingParsers } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListingParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createDataCatalogSearchPage } from "@/clients/data-catalog-listings/createDataCatalogSearchPage/createDataCatalogSearchPage";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
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
         * One page of listings matching `query`, ranked by Postgres. A blank
         * query lists every listing by name. Rows carry only the columns the
         * catalog's list shows.
         */
        search: async ({
          query,
          pageSize,
          pageNum,
        }: {
          query: string;
          pageSize: number;
          pageNum: number;
        }): Promise<DataCatalogSearchPage> => {
          const logger = clientLogger.appendName("search");
          logger.log("Searching catalog listings", { query, pageNum });

          const { data: dbRows } = await dbClient
            .rpc("rpc_data_catalog_listings__search", {
              p_query: query,
              p_limit: pageSize,
              p_offset: pageNum * pageSize,
            })
            .throwOnError();

          return createDataCatalogSearchPage({
            dbRows: dbRows ?? [],
            pageNum,
            pageSize,
          });
        },
      };
    },
  }),
);
