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
import { getColumnReplacementsFromColumns } from "@/clients/qetl/QueryMediator/relationLoading/getColumnReplacementsFromColumns/getColumnReplacementsFromColumns";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import { OpenDatasetParquetStorageClient } from "@/clients/storage/OpenDatasetParquetStorageClient/OpenDatasetParquetStorageClient";
import { PublicDatasetParquetStorageClient } from "@/clients/storage/PublicDatasetParquetStorageClient/PublicDatasetParquetStorageClient";
import { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import { notifyError } from "@/utils/notifications/notify";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
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
  /** Whether the dataset's catalog renames or casts a stored column. */
  hasColumnReplacements: boolean;
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
  datasetIdsWithColumnReplacements: ReadonlySet<Dataset.Id>;
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
    catalogListingId: openDataDataset.catalogListingId,
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

/**
 * The parquet a dataset's snapshot is published from.
 *
 * A snapshot is loaded into DuckDB as it is stored, with no renames or casts,
 * so it must already have the column names and types the dashboard's queries
 * use. A stored upload Parquet keeps the original headers and types, so it is
 * copied only when the column catalog changes none of them.
 */
async function _getSnapshotDatasetBlob(
  options: Readonly<SnapshotDatasetOptions>,
): Promise<Blob> {
  const { dataset, slice } = options;
  const canCopyStoredParquet =
    slice.mode === "all_columns" && !options.hasColumnReplacements;
  return await match(dataset.sourceType)
    .with("virtual", () => {
      return _getVirtualDatasetSnapshotBlob(options);
    })
    .with("google_sheets", "postgres_table", () => {
      // Acquired live at query time, so there is no parquet in Storage to
      // copy: every slice is read through the workspace query.
      return _queryDatasetSnapshotBlob(options);
    })
    .with("csv_file", "xlsx_file", "pdf_file", () => {
      // A whole-dataset slice with no renamed or cast column is copied from
      // the parquet already stored for the upload; anything else is queried.
      return canCopyStoredParquet
        ? DatasetParquetStorageClient.downloadDataset({
            workspaceId: options.workspaceId,
            datasetId: dataset.id,
            throwIfNotFound: true,
          })
        : _queryDatasetSnapshotBlob(options);
    })
    .with("open_data", () => {
      return canCopyStoredParquet
        ? _downloadOpenDataSnapshot(dataset)
        : _queryDatasetSnapshotBlob(options);
    })
    // Exhaustive, so a new source type has to choose where its rows come from.
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

/**
 * The datasets whose column catalog renames or casts a stored column, by the
 * same rule a workspace query applies when it loads the dataset.
 */
function _getDatasetIdsWithColumnReplacements(
  columns: readonly DatasetColumn.T[],
): ReadonlySet<Dataset.Id> {
  return new Set(
    columns
      .filter((column) => {
        return getColumnReplacementsFromColumns([column]).length > 0;
      })
      .map(prop("datasetId")),
  );
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
  return {
    columnsByDataset,
    datasetIdsWithColumnReplacements:
      _getDatasetIdsWithColumnReplacements(columns),
    datasets,
    datasetIds,
    publishConfig,
    referenced,
  };
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
          hasColumnReplacements: options.datasetIdsWithColumnReplacements.has(
            dataset.id,
          ),
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
    datasetIdsWithColumnReplacements:
      options.prepared.datasetIdsWithColumnReplacements,
    datasets: options.prepared.datasets,
    logger: options.logger,
    publishConfig: options.prepared.publishConfig,
    referenced: options.prepared.referenced,
    snapshotRevision: options.snapshotRevision,
  });
}
