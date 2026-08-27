import { createServiceClient } from "@avandar/clients";
import { withLogger } from "@avandar/logger";
import { withQueryHooks } from "@avandar/query-hooks";
import { isDefined, promiseMap } from "@avandar/utils";
import { LocalPublicDatasetClient } from "@/clients/datasets/LocalPublicDatasetClient/LocalPublicDatasetClient";
import { DatasetDuckDbCoordinator } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type { SnapshotBucketName } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import type { LocalPublicDataset } from "@/models/LocalPublicDataset/LocalPublicDataset";
import type { ServiceClient } from "@avandar/clients";
import type { ILogger, WithLogger } from "@avandar/logger";
import type { WithQueryHooks } from "@avandar/query-hooks";

type LoadDatasetsToMemoryParams = {
  bucket: SnapshotBucketName;
  dashboardId: Dashboard.Id;
  datasetIds: readonly Dataset.Id[];
  snapshotRevision: string;
};

async function _getSnapshotDataset(
  options: Readonly<{
    datasetId: Dataset.Id;
    params: LoadDatasetsToMemoryParams;
  }>,
): Promise<LocalPublicDataset.T> {
  const { datasetId, params } = options;
  const { bucket, dashboardId, snapshotRevision } = params;
  const cachedDataset = await LocalPublicDatasetClient.getById({
    id: [dashboardId, datasetId],
  });
  if (
    cachedDataset?.bucket === bucket &&
    cachedDataset.snapshotRevision === snapshotRevision
  ) {
    return cachedDataset;
  }

  try {
    return await LocalPublicDatasetClient.fetchPublicDatasetToIndexedDB({
      bucket,
      dashboardId,
      datasetId,
      snapshotRevision,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Public dataset parquet is missing from public storage. Dataset: ${datasetId}. Error: ${errorMessage}`,
    );
  }
}

async function _dropFailedDatasetLoad(
  options: Readonly<{
    datasetId: Dataset.Id;
    datasetDuckDbLease: DatasetDuckDbLease;
  }>,
): Promise<void> {
  try {
    await DuckDbClient.dropTableViewAndFile({
      tableOrViewName: options.datasetId,
      datasetDuckDbLease: options.datasetDuckDbLease,
    });
  } catch {
    DatasetDuckDbCoordinator.markDatasetDuckDbTableInvalid(options.datasetId);
  }
}

async function _loadDatasetToMemory(
  options: Readonly<{
    datasetId: Dataset.Id;
    params: LoadDatasetsToMemoryParams;
    datasetDuckDbLease: DatasetDuckDbLease;
  }>,
): Promise<Dataset.Id | undefined> {
  const { datasetId, params, datasetDuckDbLease } = options;
  const isAlreadyInMemory = await DuckDbClient.hasTableOrView(datasetId);
  const owner = {
    bucket: params.bucket,
    dashboardId: params.dashboardId,
    snapshotRevision: params.snapshotRevision,
  };
  if (
    isAlreadyInMemory &&
    DatasetDuckDbCoordinator.isPublicSnapshotDatasetOwner({ datasetId, owner })
  ) {
    return;
  }
  DatasetDuckDbCoordinator.clearPublicSnapshotDatasetOwner(datasetId);
  if (isAlreadyInMemory) {
    await DuckDbClient.dropTableViewAndFile({
      tableOrViewName: datasetId,
      datasetDuckDbLease,
    });
  }

  const publicDataset = await _getSnapshotDataset({ datasetId, params });
  try {
    await DuckDbClient.loadParquet({
      tableName: datasetId,
      blob: publicDataset.parquetData,
      datasetDuckDbLease,
    });
  } catch (error: unknown) {
    await _dropFailedDatasetLoad({ datasetId, datasetDuckDbLease });
    throw error;
  }
  DatasetDuckDbCoordinator.setPublicSnapshotDatasetOwner({ datasetId, owner });
  return datasetId;
}

type LocalPublicDatasetRawDataClientMutations = {
  /**
   * Loads the given public datasets into DuckDB memory.
   *
   * @param params The load parameters.
   * @param params.bucket Which snapshot bucket the dashboard's data lives in.
   * @param params.dashboardId The public dashboard being viewed.
   * @param params.datasetIds The dataset IDs to load.
   */
  loadDatasetsToMemory: (
    params: Readonly<LoadDatasetsToMemoryParams>,
  ) => Promise<{ loadedDatasetIds: Dataset.Id[] }>;
};

type LocalRawQueryClient = WithLogger<
  WithQueryHooks<
    ServiceClient<"LocalRawQueryClient"> &
      LocalPublicDatasetRawDataClientMutations,
    never,
    "loadDatasetsToMemory"
  >
>;

function _createLocalRawQueryClientMutations(
  clientLogger: ILogger,
): LocalPublicDatasetRawDataClientMutations {
  const loadWithLease = async (
    options: Readonly<{
      params: LoadDatasetsToMemoryParams;
      datasetDuckDbLease: DatasetDuckDbLease;
    }>,
  ): Promise<{ loadedDatasetIds: Dataset.Id[] }> => {
    const { params, datasetDuckDbLease } = options;
    clientLogger.log("Loading public datasets to memory", params);
    const loadedDatasetIds = (
      await promiseMap(params.datasetIds, async (datasetId) => {
        return await _loadDatasetToMemory({
          datasetId,
          params,
          datasetDuckDbLease,
        });
      })
    ).filter(isDefined);
    return { loadedDatasetIds };
  };

  return {
    loadDatasetsToMemory: async (params) => {
      const { runCoordinatedDatasetDuckDbOperation } = DatasetDuckDbCoordinator;
      return await runCoordinatedDatasetDuckDbOperation({
        datasetIds: params.datasetIds,
        operation: async (datasetDuckDbLease) => {
          return await loadWithLease({ params, datasetDuckDbLease });
        },
      });
    },
  };
}

function _createLocalRawQueryClient(): LocalRawQueryClient {
  const baseClient = createServiceClient("LocalRawQueryClient");

  return withLogger(baseClient, (clientLogger) => {
    const logger = clientLogger.appendName("loadDatasetsToMemory");
    const mutations = _createLocalRawQueryClientMutations(logger);

    return withQueryHooks(
      { ...baseClient, ...mutations },
      {
        queryFns: [],
        mutationFns: ["loadDatasetsToMemory"],
      },
    );
  });
}

/**
 * Ensures published snapshot datasets are available in DuckDB for viewers.
 * Dataset downloads use the caller's storage access, including authenticated
 * access for workspace-published snapshots.
 */
export const LocalPublicDatasetRawDataClient = _createLocalRawQueryClient();
