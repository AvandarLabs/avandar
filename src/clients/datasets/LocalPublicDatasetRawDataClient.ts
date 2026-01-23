import { isDefined } from "$/lib/utils/guards/isDefined";
import { BaseClient, createBaseClient } from "@/lib/clients/BaseClient";
import { WithLogger, withLogger } from "@/lib/clients/withLogger";
import { WithQueryHooks } from "@/lib/clients/withQueryHooks/types";
import { withQueryHooks } from "@/lib/clients/withQueryHooks/withQueryHooks";
import { promiseMap } from "@/lib/utils/promises";
import { DuckDBClient } from "../DuckDBClient";
import { LocalPublicDatasetClient } from "./LocalPublicDatasetClient";
import type { DashboardId } from "@/models/Dashboard/Dashboard.types";
import type { DatasetId } from "@/models/datasets/Dataset";
import type { LocalPublicDataset } from "@/models/datasets/LocalPublicDataset";

type LocalPublicDatasetRawDataClientMutations = {
  /**
   * Loads the given public datasets into DuckDB memory.
   *
   * @param params The load parameters.
   * @param params.dashboardId The public dashboard being viewed.
   * @param params.datasetIds The dataset IDs to load.
   */
  loadDatasetsToMemory: (params: {
    dashboardId: DashboardId;
    datasetIds: readonly DatasetId[];
  }) => Promise<{ loadedDatasetIds: readonly DatasetId[] }>;
};

type ILocalPublicDatasetRawQueryClient = BaseClient &
  LocalPublicDatasetRawDataClientMutations;

function createLocalPublicDatasetRawQueryClient(): WithLogger<
  WithQueryHooks<
    ILocalPublicDatasetRawQueryClient,
    never,
    "loadDatasetsToMemory"
  >
> {
  const baseClient = createBaseClient("LocalPublicDatasetRawQuery");

  return withLogger(baseClient, (clientLogger) => {
    const mutations: LocalPublicDatasetRawDataClientMutations = {
      loadDatasetsToMemory: async (params) => {
        const logger = clientLogger.appendName("loadDatasetsToMemory");
        logger.log("Loading public datasets to memory", params);
        const { dashboardId, datasetIds } = params;

        const loadedDatasetIds = (
          await promiseMap(datasetIds, async (datasetId) => {
            const isAlreadyInMemory: boolean =
              await DuckDBClient.hasTableOrView(datasetId);
            if (isAlreadyInMemory) {
              return;
            }

            const publicDatasetId: string = `${dashboardId}/${datasetId}`;
            const cachedDataset = await LocalPublicDatasetClient.getById({
              id: publicDatasetId,
            });

            let publicDataset: LocalPublicDataset;

            if (cachedDataset) {
              publicDataset = cachedDataset;
            } else {
              try {
                publicDataset =
                  await LocalPublicDatasetClient.fetchPublicDatasetToIndexedDB({
                    dashboardId,
                    datasetId,
                  });
              } catch (error: unknown) {
                const errorMessage: string =
                  error instanceof Error ? error.message : String(error);

                throw new Error(
                  "Public dataset parquet is missing from public storage. " +
                    `Dataset: ${datasetId}. ` +
                    `Error: ${errorMessage}`,
                );
              }
            }

            await DuckDBClient.loadParquet({
              tableName: datasetId,
              blob: publicDataset.parquetData,
            });

            return datasetId;
          })
        ).filter(isDefined);
        return { loadedDatasetIds };
      },
    };

    return withQueryHooks(
      { ...baseClient, ...mutations } as ILocalPublicDatasetRawQueryClient,
      {
        queryFns: [],
        mutationFns: ["loadDatasetsToMemory"],
      },
    );
  });
}

/**
 * Ensures public datasets are available in DuckDB for public viewers.
 *
 * This client is intentionally auth-free: it will only use IndexedDB and the
 * public storage bucket to load parquet blobs.
 */
export const LocalPublicDatasetRawDataClient =
  createLocalPublicDatasetRawQueryClient();
