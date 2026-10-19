import {
  assertIsDefined,
  makeBucketRecord,
  prop,
  propEq,
  where,
} from "@avandar/utils";
import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { match } from "ts-pattern";
import { DashboardSliceBuilder } from "@/clients/dashboards/DashboardSliceBuilder/DashboardSliceBuilder";
import { getDatasetIdsFromDashboardConfig } from "@/clients/dashboards/getDatasetIdsFromDashboardConfig/getDatasetIdsFromDashboardConfig";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { OpenDataDatasetClient } from "@/clients/datasets/source-datasets/OpenDataDatasetClient";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import { OpenDatasetParquetStorageClient } from "@/clients/storage/OpenDatasetParquetStorageClient/OpenDatasetParquetStorageClient";
import { PublicDatasetParquetStorageClient } from "@/clients/storage/PublicDatasetParquetStorageClient/PublicDatasetParquetStorageClient";
import { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import { notifyError } from "@/utils/notifications/notify";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type {
  PreparedPublishSnapshot,
  PublishDatasets,
  StagePublishSnapshotOptions,
} from "@/clients/dashboards/DashboardClient/DashboardClient.types";
import type { SnapshotBucketName } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import type { ILogger } from "@avandar/logger";

type SnapshotDatasetOptions = {
  availableColumns: readonly string[];
  dataset: Dataset.T;
  queriedColumns: readonly string[];
  slice: PublishSliceConfig.T;
  treatAsAllColumns: boolean;
  workspaceId: Dashboard.T["workspaceId"];
};

type UploadDatasetSnapshotOptions = SnapshotDatasetOptions & {
  bucket: SnapshotBucketName;
  dashboardId: Dashboard.Id;
  snapshotRevision: string;
};

type WorkspaceSnapshotQueryOptions = Omit<SnapshotDatasetOptions, "dataset"> & {
  baseSelectExpr: string;
};

type UploadDashboardSnapshotsOptions = {
  bucket: SnapshotBucketName;
  columnsByDataset: Record<string, readonly string[]>;
  dashboard: Dashboard.T;
  datasets: readonly Dataset.T[];
  logger: ILogger;
  publishConfig: PublishSliceConfig.Dashboard;
  referenced: ReturnType<typeof DashboardSliceBuilder.extractReferencedColumns>;
  snapshotRevision: string;
};

async function _runWorkspaceSnapshotQuery(
  options: Readonly<WorkspaceSnapshotQueryOptions>,
): Promise<Blob> {
  const materializedSql = DashboardSliceBuilder.buildSliceSql({
    baseSelectExpr: options.baseSelectExpr,
    sliceConfig: options.slice,
    availableColumns: options.availableColumns,
    queriedColumns: options.queriedColumns,
    treatAsAllColumns: options.treatAsAllColumns,
  });
  return await WorkspaceQuerySession.runQuery({
    rawSql: materializedSql,
    workspaceId: options.workspaceId,
    returnType: "parquet",
  });
}

async function _downloadOpenDataSnapshot(
  dataset: Readonly<Dataset.T>,
): Promise<Blob> {
  const localDataset = await LocalDatasetClient.getById({ id: dataset.id });
  if (localDataset?.parseStatus === "ready" && localDataset.parquetData) {
    return localDataset.parquetData;
  }
  const openDataDataset = await OpenDataDatasetClient.getOne(
    where("dataset_id", "eq", dataset.id),
  );
  assertIsDefined(openDataDataset, { name: "openDataDataset" });
  return await OpenDatasetParquetStorageClient.download({
    catalogEntryId: openDataDataset.catalogEntryId,
  });
}

async function _getVirtualDatasetSnapshotBlob(
  options: Readonly<SnapshotDatasetOptions>,
): Promise<Blob> {
  const virtualDataset = await VirtualDatasetClient.getOne(
    where("dataset_id", "eq", options.dataset.id),
  );
  assertIsDefined(virtualDataset, { name: "virtualDataset" });
  return await _runWorkspaceSnapshotQuery({
    ...options,
    baseSelectExpr: virtualDataset.rawSql,
  });
}

/**
 * Reads the slice's rows through the same workspace query a dashboard
 * widget runs, so they arrive in their query-facing shape: renamed and cast
 * columns, acquired from a live source when that is where they live.
 */
async function _queryDatasetSnapshotBlob(
  options: Readonly<SnapshotDatasetOptions>,
): Promise<Blob> {
  return await _runWorkspaceSnapshotQuery({
    ...options,
    baseSelectExpr: `SELECT * FROM "${options.dataset.id}"`,
  });
}

async function _downloadStoredDatasetSnapshot(
  options: Readonly<SnapshotDatasetOptions>,
): Promise<Blob> {
  return await DatasetParquetStorageClient.downloadDataset({
    workspaceId: options.workspaceId,
    datasetId: options.dataset.id,
    throwIfNotFound: true,
  });
}

/**
 * The parquet a dataset's snapshot is published from. A whole-dataset
 * (`all_columns`) slice of an uploaded file or an open dataset is copied
 * from the parquet already stored for it. Every other slice, and every slice
 * of a source acquired live at query time (a Google Sheet or a Postgres
 * table, which keep no parquet in Storage), is read through the workspace
 * query. The match is exhaustive, so a new source type has to choose.
 */
async function _getSnapshotDatasetBlob(
  options: Readonly<SnapshotDatasetOptions>,
): Promise<Blob> {
  const { dataset, slice } = options;
  const isWholeDataset = slice.mode === "all_columns";
  return await match(dataset.sourceType)
    .with("virtual", () => {
      return _getVirtualDatasetSnapshotBlob(options);
    })
    .with("google_sheets", "postgres_table", () => {
      return _queryDatasetSnapshotBlob(options);
    })
    .with("csv_file", "xlsx_file", "pdf_file", () => {
      return isWholeDataset
        ? _downloadStoredDatasetSnapshot(options)
        : _queryDatasetSnapshotBlob(options);
    })
    .with("open_data", () => {
      return isWholeDataset
        ? _downloadOpenDataSnapshot(dataset)
        : _queryDatasetSnapshotBlob(options);
    })
    .exhaustive();
}

async function _uploadDatasetSnapshot(
  options: Readonly<UploadDatasetSnapshotOptions>,
): Promise<void> {
  const parquetBlob = await _getSnapshotDatasetBlob(options);
  await PublicDatasetParquetStorageClient.uploadDataset({
    bucket: options.bucket,
    dashboardId: options.dashboardId,
    snapshotRevision: options.snapshotRevision,
    datasetId: options.dataset.id,
    parquetBlob,
  });
}

async function _getPublishDatasets(
  dashboard: Readonly<Dashboard.T>,
): Promise<PublishDatasets> {
  const candidateIds = getDatasetIdsFromDashboardConfig(dashboard.config);
  const datasets =
    candidateIds.length === 0
      ? []
      : await DatasetClient.getAll({
          where: {
            id: { in: candidateIds as Dataset.Id[] },
            workspace_id: { eq: dashboard.workspaceId },
          },
        });
  const datasetIds = datasets.map(prop("id"));
  const resolvedIds = new Set(datasetIds);
  const missingIds = candidateIds.filter((datasetId) => {
    return !resolvedIds.has(datasetId as Dataset.Id);
  });
  if (missingIds.length > 0) {
    throw new Error(
      `Cannot publish: configured datasets are unavailable or outside this workspace (${missingIds.join(", ")}).`,
    );
  }
  return { datasets, datasetIds };
}

/** Collects the datasets, columns, and slice config a publish will need. */
export async function preparePublishSnapshot(
  options: Readonly<{
    dashboard: Dashboard.T;
    incomingPublishConfig: PublishSliceConfig.Dashboard | undefined;
  }>,
): Promise<PreparedPublishSnapshot> {
  const { dashboard, incomingPublishConfig } = options;
  const { datasets, datasetIds } = await _getPublishDatasets(dashboard);
  const publishConfig =
    incomingPublishConfig ??
    DashboardSliceBuilder.readDashboardPublishConfig(dashboard.config);
  const referenced = DashboardSliceBuilder.extractReferencedColumns({
    dashboardConfig: dashboard.config,
    allDatasetIds: datasetIds,
  });
  const columns =
    datasetIds.length === 0
      ? []
      : await DatasetColumnClient.getAll({
          where: {
            dataset_id: { in: datasetIds },
            workspace_id: { eq: dashboard.workspaceId },
          },
        });
  const columnsByDataset = makeBucketRecord(columns, {
    key: "datasetId",
    valueKey: "name",
  });
  return { columnsByDataset, datasets, datasetIds, publishConfig, referenced };
}

async function _uploadDashboardSnapshots(
  options: Readonly<UploadDashboardSnapshotsOptions>,
): Promise<void> {
  const uploadResults = await Promise.allSettled(
    options.datasets.map(async (dataset) => {
      const slice =
        options.publishConfig.slices[dataset.id] ?? PublishSliceConfig.DEFAULT;
      try {
        await _uploadDatasetSnapshot({
          availableColumns: options.columnsByDataset[dataset.id] ?? [],
          bucket: options.bucket,
          dashboardId: options.dashboard.id,
          dataset,
          queriedColumns: Array.from(
            options.referenced.perDataset[dataset.id] ?? new Set<string>(),
          ),
          slice,
          snapshotRevision: options.snapshotRevision,
          treatAsAllColumns: options.referenced.unparseable.has(dataset.id),
          workspaceId: options.dashboard.workspaceId,
        });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        notifyError({
          title: i18n._(msg`Unable to publish dashboard`),
          message: i18n._(
            msg`Some datasets are not synced online yet or failed to publish. ${errorMessage}`,
          ),
        });
        throw error;
      }
    }),
  );
  const failedUpload = uploadResults.find(propEq("status", "rejected"));
  if (failedUpload?.status === "rejected") {
    throw failedUpload.reason;
  }
}

/** Copies each dependent dataset's parquet into the target snapshot bucket. */
export async function uploadPreparedSnapshots(
  options: Readonly<StagePublishSnapshotOptions & { snapshotRevision: string }>,
): Promise<void> {
  if (options.prepared.datasetIds.length === 0) {
    return;
  }
  options.logger.log("Copying dataset parquet blobs to the snapshot bucket", {
    dashboardId: options.dashboard.id,
    dependentDatasetIds: options.prepared.datasetIds,
    uploadBucket: options.bucket,
  });
  await _uploadDashboardSnapshots({
    bucket: options.bucket,
    columnsByDataset: options.prepared.columnsByDataset,
    dashboard: options.dashboard,
    datasets: options.prepared.datasets,
    logger: options.logger,
    publishConfig: options.prepared.publishConfig,
    referenced: options.prepared.referenced,
    snapshotRevision: options.snapshotRevision,
  });
}
