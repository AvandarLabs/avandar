import {
  assertIsDefined,
  makeBucketRecord,
  omit,
  prop,
  propEq,
  where,
} from "@avandar/utils";
import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { uuid } from "$/lib/uuid";
import { DashboardParsers } from "$/models/Dashboard/DashboardParsers";
import { Dataset } from "$/models/datasets/Dataset/Dataset";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { APIClient } from "@/clients/APIClient";
import { DashboardSliceBuilder } from "@/clients/dashboards/DashboardSliceBuilder/DashboardSliceBuilder";
import { DashboardSnapshotTransition } from "@/clients/dashboards/DashboardSnapshotTransition/DashboardSnapshotTransition";
import { extractDatasetIdsFromDashboardConfig } from "@/clients/dashboards/extractDatasetIdsFromDashboardConfig/extractDatasetIdsFromDashboardConfig";
import { updateDashboardWithSnapshotCas } from "@/clients/dashboards/updateDashboardWithSnapshotCas";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { OpenDataDatasetClient } from "@/clients/datasets/source-datasets/OpenDataDatasetClient";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { WorkspaceQetlClient } from "@/clients/qetl/WorkspaceQetlClient";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import { OpenDatasetParquetStorageClient } from "@/clients/storage/OpenDatasetParquetStorageClient/OpenDatasetParquetStorageClient";
import { PublicDatasetParquetStorageClient } from "@/clients/storage/PublicDatasetParquetStorageClient/PublicDatasetParquetStorageClient";
import { SnapshotStorageUtils } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import { notifyError } from "@/utils/notifications/notify";
import type {
  PublishedVisibility,
  SnapshotBucketName,
} from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import type { ILogger } from "@avandar/logger";
import type { DashboardSlugValidationFailure } from "@sbfn/dashboards/DashboardsRoutes/DashboardsRoutes.types";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

type DashboardMutationConfig = {
  clientLogger: ILogger;
  dbClient: AvaSupabaseDBClient;
  parsers: typeof DashboardParsers;
};

type DeleteStagedSnapshotOptions = {
  bucket: SnapshotBucketName;
  dashboardId: Dashboard.Id;
  logger: ILogger;
  snapshotRevision: string;
};

type PublishDashboardParams = {
  dashboardId: Dashboard.Id;
  visibility: PublishedVisibility;
  slug?: { action: "set"; value: string } | { action: "clear" };
  publishConfig?: PublishSliceConfig.Dashboard;
};

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

type PublishDatasets = {
  datasets: Dataset.T[];
  datasetIds: Dataset.Id[];
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

type PublishCommitOptions = {
  claimedDashboard: Dashboard.T;
  dashboardId: Dashboard.Id;
  logger: ILogger;
  snapshotRevision: string;
  updateModel: Partial<Dashboard.T>;
  visibility: PublishedVisibility;
};

type PublishUpdateModelOptions = {
  dashboard: Dashboard.T;
  params: PublishDashboardParams;
  publishConfig: PublishSliceConfig.Dashboard;
  snapshotRevision: string;
};

type PreparedPublishSnapshot = PublishDatasets & {
  columnsByDataset: Record<string, string[]>;
  publishConfig: PublishSliceConfig.Dashboard;
  referenced: ReturnType<typeof DashboardSliceBuilder.extractReferencedColumns>;
};

type StagePublishSnapshotOptions = {
  bucket: SnapshotBucketName;
  dashboard: Dashboard.T;
  logger: ILogger;
  prepared: PreparedPublishSnapshot;
  visibility: PublishedVisibility;
};

type UploadPreparedSnapshotsOptions = StagePublishSnapshotOptions & {
  snapshotRevision: string;
};

type TransitionClaimOptions = {
  config: DashboardMutationConfig;
  dashboard: Dashboard.T;
  kind: Dashboard.SnapshotTransitionKind;
  targetVisibility?: PublishedVisibility;
};

type ValidateDashboardSlugOptions = {
  config: DashboardMutationConfig;
  dashboardId?: Dashboard.Id;
  slug: string;
  visibility: PublishedVisibility;
};

type DashboardMutations = {
  publishDashboard: (
    params: Readonly<PublishDashboardParams>,
  ) => Promise<Dashboard.T>;
  validateDashboardSlug: (
    options: Readonly<{
      slug: string;
      visibility: PublishedVisibility;
      dashboardId?: Dashboard.Id;
    }>,
  ) => Promise<{ isValid: true } | DashboardSlugValidationFailure>;
  unpublishDashboard: (
    params: Readonly<{ dashboardId: Dashboard.Id }>,
  ) => Promise<Dashboard.T>;
  fullDelete: (params: Readonly<{ id: Dashboard.Id }>) => Promise<void>;
};

const CLEAR_SNAPSHOT_TRANSITION = {
  snapshotTransitionKind: undefined,
  snapshotTransitionPriorRevision: undefined,
  snapshotTransitionPriorVisibility: undefined,
  snapshotTransitionRevision: undefined,
  snapshotTransitionTargetVisibility: undefined,
} as const;

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
  return await WorkspaceQetlClient.runQuery({
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

async function _getSnapshotDatasetBlob(
  options: Readonly<SnapshotDatasetOptions>,
): Promise<Blob> {
  const { dataset, slice, workspaceId } = options;
  if (dataset.sourceType === "virtual") {
    const virtualDataset = await VirtualDatasetClient.getOne(
      where("dataset_id", "eq", dataset.id),
    );
    assertIsDefined(virtualDataset, { name: "virtualDataset" });
    return await _runWorkspaceSnapshotQuery({
      ...options,
      baseSelectExpr: virtualDataset.rawSql,
    });
  }
  const hasRowFilters = slice.mode === "custom" && slice.rowFilters.length > 0;
  if (slice.mode !== "all_columns" || hasRowFilters) {
    return await _runWorkspaceSnapshotQuery({
      ...options,
      baseSelectExpr: `SELECT * FROM "${dataset.id}"`,
    });
  }
  if (dataset.sourceType === "open_data") {
    return await _downloadOpenDataSnapshot(dataset);
  }
  return await DatasetParquetStorageClient.downloadDataset({
    workspaceId,
    datasetId: dataset.id,
    throwIfNotFound: true,
  });
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
  const candidateIds = extractDatasetIdsFromDashboardConfig(dashboard.config);
  const datasets =
    candidateIds.length === 0 ?
      []
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

async function _preparePublishSnapshot(
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
    datasetIds.length === 0 ?
      []
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

function _getPublishUpdateModel(
  options: Readonly<PublishUpdateModelOptions>,
): Partial<Dashboard.T> {
  const { dashboard, params, publishConfig, snapshotRevision } = options;
  const nextConfig =
    params.publishConfig ?
      DashboardSliceBuilder.writeDashboardPublishConfig({
        dashboardConfig: dashboard.config,
        publishConfig,
      })
    : undefined;
  return {
    visibility: params.visibility,
    snapshotRevision,
    ...CLEAR_SNAPSHOT_TRANSITION,
    ...(params.slug ?
      { slug: params.slug.action === "set" ? params.slug.value : undefined }
    : {}),
    ...(nextConfig ? { config: nextConfig } : {}),
  };
}

async function _deletePriorSnapshotBestEffort(
  options: Readonly<{
    dashboard: Dashboard.T;
    logger: ILogger;
  }>,
): Promise<void> {
  const { dashboard, logger } = options;
  if (dashboard.visibility === "draft" || !dashboard.snapshotRevision) {
    return;
  }
  try {
    await PublicDatasetParquetStorageClient.deleteSnapshotGeneration({
      bucket: SnapshotStorageUtils.getSnapshotBucketNameFromVisibility(
        dashboard.visibility,
      ),
      dashboardId: dashboard.id,
      snapshotRevision: dashboard.snapshotRevision,
    });
  } catch (error: unknown) {
    logger.warn("Post-commit snapshot cleanup failed", {
      dashboardId: dashboard.id,
      error,
    });
  }
}

async function _deleteStagedSnapshotBestEffort(
  options: Readonly<DeleteStagedSnapshotOptions>,
): Promise<boolean> {
  const { bucket, dashboardId, logger, snapshotRevision } = options;
  try {
    await PublicDatasetParquetStorageClient.deleteSnapshotGeneration({
      bucket,
      dashboardId,
      snapshotRevision,
    });
    return true;
  } catch (error: unknown) {
    logger.warn("Staged snapshot cleanup failed", {
      dashboardId,
      error,
      snapshotRevision,
    });
    return false;
  }
}

async function _updateDashboardModelWithCas(
  options: Readonly<{
    config: DashboardMutationConfig;
    dashboard: Dashboard.T;
    updateModel: Partial<Dashboard.T>;
  }>,
): Promise<Dashboard.T | undefined> {
  const dbUpdate = options.config.parsers.fromModelUpdateToDBUpdate(
    options.updateModel,
  );
  const updatedDashboard = await updateDashboardWithSnapshotCas({
    dbClient: options.config.dbClient,
    dashboard: options.dashboard,
    dbUpdate,
  });
  return updatedDashboard === undefined ? undefined : (
      options.config.parsers.fromDBReadToModelRead(updatedDashboard)
    );
}

async function _createTransitionClaim(
  options: Readonly<TransitionClaimOptions>,
): Promise<Dashboard.T> {
  const transitionRevision = uuid<"DashboardSnapshotTransition">();
  const claimedDashboard = await (async () => {
    try {
      return await _updateDashboardModelWithCas({
        ...options,
        updateModel: {
          ...(options.kind === "publish" ? {} : { visibility: "draft" }),
          snapshotTransitionKind: options.kind,
          snapshotTransitionPriorRevision: options.dashboard.snapshotRevision,
          snapshotTransitionPriorVisibility: options.dashboard.visibility,
          snapshotTransitionRevision: transitionRevision,
          snapshotTransitionTargetVisibility: options.targetVisibility,
        },
      });
    } catch (error: unknown) {
      const currentDashboard = await DashboardClient.getById({
        id: options.dashboard.id,
      });
      if (
        currentDashboard?.snapshotTransitionKind !== options.kind ||
        currentDashboard.snapshotTransitionRevision !== transitionRevision
      ) {
        throw error;
      }
      return currentDashboard;
    }
  })();
  if (claimedDashboard === undefined) {
    throw new Error(
      "Dashboard changed before its snapshot transition could start.",
    );
  }
  return claimedDashboard;
}

function _assertCleanupTransition(dashboard: Readonly<Dashboard.T>): void {
  assertIsDefined(dashboard.snapshotTransitionKind, {
    name: "snapshotTransitionKind",
  });
  assertIsDefined(dashboard.snapshotTransitionRevision, {
    name: "snapshotTransitionRevision",
  });
}

function _isDefiniteDeleteCardinalityError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "PGRST116"
  );
}

async function _deleteDashboardAfterCleanup(
  options: Readonly<{
    config: DashboardMutationConfig;
    dashboardId: Dashboard.Id;
  }>,
): Promise<void> {
  const deletedDashboardId = await (async (): Promise<string | undefined> => {
    try {
      const { data } = await options.config.dbClient
        .from("dashboards")
        .delete()
        .eq("id", options.dashboardId)
        .select("id")
        .single()
        .throwOnError();
      return data.id;
    } catch (error) {
      if (_isDefiniteDeleteCardinalityError(error)) {
        throw error;
      }
      const remainingDashboard = await DashboardCrudClient.getById({
        id: options.dashboardId,
      });
      if (remainingDashboard === undefined) {
        return undefined;
      }
      throw error;
    }
  })();
  if (deletedDashboardId === undefined) {
    return;
  }
  if (deletedDashboardId !== options.dashboardId) {
    throw new Error("Dashboard delete returned an unexpected row.");
  }
}

async function _finishCleanupTransition(
  options: Readonly<{
    config: DashboardMutationConfig;
    dashboard: Dashboard.T;
  }>,
): Promise<Dashboard.T | undefined> {
  _assertCleanupTransition(options.dashboard);
  const dashboardId = options.dashboard.id;
  const cleanupKind = options.dashboard.snapshotTransitionKind;
  const cleanupRevision = options.dashboard.snapshotTransitionRevision;
  let cleanupDashboard = options.dashboard;
  await DashboardSnapshotTransition.clearAllSnapshotBuckets({
    assertCanDelete: async () => {
      const validatedDashboard = await _updateDashboardModelWithCas({
        ...options,
        dashboard: cleanupDashboard,
        updateModel: { snapshotTransitionRevision: cleanupRevision },
      });
      if (validatedDashboard === undefined) {
        throw new Error("Dashboard snapshot cleanup transition changed.");
      }
      cleanupDashboard = validatedDashboard;
    },
    dashboardId,
    deleteDatasetsForDashboard:
      PublicDatasetParquetStorageClient.deleteDatasetsForDashboard,
  });
  if (cleanupKind === "delete") {
    await _deleteDashboardAfterCleanup({ config: options.config, dashboardId });
    return undefined;
  }
  const updatedDashboard = await _updateDashboardModelWithCas({
    ...options,
    dashboard: cleanupDashboard,
    updateModel: {
      visibility: "draft",
      snapshotRevision: undefined,
      ...CLEAR_SNAPSHOT_TRANSITION,
    },
  });
  if (updatedDashboard === undefined) {
    throw new Error("Dashboard changed before snapshot cleanup could finish.");
  }
  return updatedDashboard;
}

async function _fencePublishTransitionForAbort(
  options: Readonly<{
    config: DashboardMutationConfig;
    dashboard: Dashboard.T;
  }>,
): Promise<Dashboard.T> {
  if (options.dashboard.snapshotTransitionKind === "abort_publish") {
    return options.dashboard;
  }
  if (options.dashboard.snapshotTransitionKind !== "publish") {
    throw new Error("Dashboard is not aborting a publish transition.");
  }
  try {
    const fencedDashboard = await _updateDashboardModelWithCas({
      ...options,
      updateModel: { snapshotTransitionKind: "abort_publish" },
    });
    if (fencedDashboard === undefined) {
      throw new Error("Dashboard snapshot transition changed.");
    }
    return fencedDashboard;
  } catch (error: unknown) {
    const currentDashboard = await DashboardClient.getById({
      id: options.dashboard.id,
    });
    if (
      currentDashboard?.snapshotTransitionKind !== "abort_publish" ||
      currentDashboard.snapshotTransitionRevision !==
        options.dashboard.snapshotTransitionRevision
    ) {
      throw error;
    }
    return currentDashboard;
  }
}

async function _abortPublishTransition(
  options: Readonly<{
    config: DashboardMutationConfig;
    dashboard: Dashboard.T;
    logger: ILogger;
  }>,
): Promise<Dashboard.T> {
  const abortingDashboard = await _fencePublishTransitionForAbort(options);
  assertIsDefined(abortingDashboard.snapshotTransitionRevision, {
    name: "snapshotTransitionRevision",
  });
  assertIsDefined(abortingDashboard.snapshotTransitionTargetVisibility, {
    name: "snapshotTransitionTargetVisibility",
  });
  if (abortingDashboard.snapshotTransitionTargetVisibility === "draft") {
    throw new Error("A publish transition cannot target draft.");
  }
  const didDelete = await _deleteStagedSnapshotBestEffort({
    bucket: SnapshotStorageUtils.getSnapshotBucketNameFromVisibility(
      abortingDashboard.snapshotTransitionTargetVisibility,
    ),
    dashboardId: abortingDashboard.id,
    logger: options.logger,
    snapshotRevision: abortingDashboard.snapshotTransitionRevision,
  });
  if (!didDelete) {
    throw new Error("Staged snapshot cleanup failed.");
  }
  const clearedDashboard = await _updateDashboardModelWithCas({
    ...options,
    dashboard: abortingDashboard,
    updateModel: { ...CLEAR_SNAPSHOT_TRANSITION },
  });
  if (clearedDashboard === undefined) {
    throw new Error("Dashboard snapshot transition changed.");
  }
  return clearedDashboard;
}

async function _recoverTransition(
  options: Readonly<{
    config: DashboardMutationConfig;
    dashboard: Dashboard.T;
    logger: ILogger;
  }>,
): Promise<Dashboard.T | undefined> {
  if (options.dashboard.snapshotTransitionKind === undefined) {
    return options.dashboard;
  }
  if (
    options.dashboard.snapshotTransitionKind === "publish" ||
    options.dashboard.snapshotTransitionKind === "abort_publish"
  ) {
    return await _abortPublishTransition(options);
  }
  return await _finishCleanupTransition(options);
}

async function _getDashboardForPublish(
  options: Readonly<{
    config: DashboardMutationConfig;
    dashboardId: Dashboard.Id;
    logger: ILogger;
  }>,
): Promise<Dashboard.T> {
  const dashboard = await DashboardClient.getById({ id: options.dashboardId });
  assertIsDefined(dashboard, { name: "dashboard" });
  if (dashboard.snapshotTransitionKind === undefined) {
    return dashboard;
  }
  const recoveredDashboard = await _recoverTransition({
    ...options,
    dashboard,
  });
  assertIsDefined(recoveredDashboard, { name: "dashboard" });
  return recoveredDashboard;
}

async function _validatePublishSlug(
  options: Readonly<{
    dashboard: Dashboard.T;
    params: PublishDashboardParams;
  }>,
): Promise<void> {
  const slugToValidate =
    options.params.slug?.action === "set" ? options.params.slug.value
    : options.params.slug?.action === "clear" ? undefined
    : options.dashboard.slug;
  if (slugToValidate === undefined) {
    return;
  }
  const slugCheck = await DashboardClient.validateDashboardSlug({
    slug: slugToValidate,
    visibility: options.params.visibility,
    dashboardId: options.params.dashboardId,
  });
  if (!slugCheck.isValid) {
    throw new Error(
      `Cannot publish: the custom URL "${slugToValidate}" is not available (${slugCheck.reason}).`,
    );
  }
}

async function _prepareDashboardForPublish(
  options: Readonly<{
    config: DashboardMutationConfig;
    logger: ILogger;
    params: PublishDashboardParams;
  }>,
): Promise<{
  dashboard: Dashboard.T;
  prepared: PreparedPublishSnapshot;
  uploadBucket: SnapshotBucketName;
}> {
  const dashboard = await _getDashboardForPublish({
    ...options,
    dashboardId: options.params.dashboardId,
  });
  await _validatePublishSlug({ dashboard, params: options.params });
  const prepared = await _preparePublishSnapshot({
    dashboard,
    incomingPublishConfig: options.params.publishConfig,
  });
  const { uploadBucket } =
    DashboardSnapshotTransition.makeSnapshotTransitionPlanFromVisibility(
      options.params.visibility,
    );
  return { dashboard, prepared, uploadBucket };
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

async function _uploadPreparedSnapshots(
  options: Readonly<UploadPreparedSnapshotsOptions>,
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

async function _stagePublishSnapshot(
  options: Readonly<
    StagePublishSnapshotOptions & { config: DashboardMutationConfig }
  >,
): Promise<{ claimedDashboard: Dashboard.T; snapshotRevision: string }> {
  const claimedDashboard = await _createTransitionClaim({
    config: options.config,
    dashboard: options.dashboard,
    kind: "publish",
    targetVisibility: options.visibility,
  });
  assertIsDefined(claimedDashboard.snapshotTransitionRevision, {
    name: "snapshotTransitionRevision",
  });
  const snapshotRevision = claimedDashboard.snapshotTransitionRevision;
  try {
    await _uploadPreparedSnapshots({ ...options, snapshotRevision });
    await PublicDatasetParquetStorageClient.reconcileDatasetsForDashboard({
      bucket: options.bucket,
      dashboardId: options.dashboard.id,
      snapshotRevision,
      datasetIds: options.prepared.datasetIds,
    });
  } catch (error: unknown) {
    await _abortPublishTransition({
      config: options.config,
      dashboard: claimedDashboard,
      logger: options.logger,
    });
    throw error;
  }
  return { claimedDashboard, snapshotRevision };
}

async function _getPublishOutcomeAfterError(
  options: Readonly<
    PublishCommitOptions & { config: DashboardMutationConfig; error: unknown }
  >,
): Promise<Dashboard.T> {
  const currentDashboard = await (async () => {
    try {
      return await DashboardClient.getById({ id: options.dashboardId });
    } catch (readError: unknown) {
      options.logger.warn("Publication commit outcome could not be verified", {
        dashboardId: options.dashboardId,
        error: readError,
        snapshotRevision: options.snapshotRevision,
      });
      throw options.error;
    }
  })();
  if (
    currentDashboard?.snapshotTransitionKind === "publish" &&
    currentDashboard.snapshotTransitionRevision === options.snapshotRevision
  ) {
    await _abortPublishTransition({
      config: options.config,
      dashboard: currentDashboard,
      logger: options.logger,
    });
  }
  if (
    currentDashboard?.snapshotRevision === options.snapshotRevision &&
    currentDashboard.visibility === options.visibility &&
    currentDashboard.snapshotTransitionKind === undefined
  ) {
    return currentDashboard;
  }
  throw options.error;
}

async function _commitPublishTransition(
  options: Readonly<PublishCommitOptions & { config: DashboardMutationConfig }>,
): Promise<Dashboard.T> {
  try {
    const updatedDashboard = await _updateDashboardModelWithCas({
      config: options.config,
      dashboard: options.claimedDashboard,
      updateModel: options.updateModel,
    });
    if (updatedDashboard !== undefined) {
      return updatedDashboard;
    }
  } catch (error: unknown) {
    return await _getPublishOutcomeAfterError({ ...options, error });
  }
  await _abortPublishTransition({
    config: options.config,
    dashboard: options.claimedDashboard,
    logger: options.logger,
  });
  throw new Error(
    "Dashboard changed while this publication was being prepared.",
  );
}

async function _publishDashboard(
  options: Readonly<{
    config: DashboardMutationConfig;
    params: PublishDashboardParams;
  }>,
): Promise<Dashboard.T> {
  const logger = options.config.clientLogger.appendName("publishDashboard");
  const { dashboard, prepared, uploadBucket } =
    await _prepareDashboardForPublish({
      config: options.config,
      logger,
      params: options.params,
    });
  const { claimedDashboard, snapshotRevision } = await _stagePublishSnapshot({
    bucket: uploadBucket,
    config: options.config,
    dashboard,
    logger,
    prepared,
    visibility: options.params.visibility,
  });
  const updateModel = _getPublishUpdateModel({
    dashboard,
    params: options.params,
    publishConfig: prepared.publishConfig,
    snapshotRevision,
  });
  const updatedDashboard = await _commitPublishTransition({
    claimedDashboard,
    config: options.config,
    dashboardId: options.params.dashboardId,
    logger,
    snapshotRevision,
    updateModel,
    visibility: options.params.visibility,
  });
  await _deletePriorSnapshotBestEffort({ dashboard, logger });
  return updatedDashboard;
}

async function _validateDashboardSlug(
  options: Readonly<ValidateDashboardSlugOptions>,
): Promise<{ isValid: true } | DashboardSlugValidationFailure> {
  const logger = options.config.clientLogger.appendName(
    "validateDashboardSlug",
  );
  logger.log("Checking dashboard slug availability", options);
  return APIClient.post({
    route: "dashboards/validate-slug",
    body: {
      slug: options.slug,
      dashboardId: options.dashboardId,
      visibility: options.visibility,
    },
  });
}

async function _unpublishDashboard(
  options: Readonly<{
    config: DashboardMutationConfig;
    dashboardId: Dashboard.Id;
  }>,
): Promise<Dashboard.T> {
  const logger = options.config.clientLogger.appendName("unpublishDashboard");
  logger.log("Unpublishing dashboard", { dashboardId: options.dashboardId });
  const initialDashboard = await DashboardClient.getById({
    id: options.dashboardId,
  });
  assertIsDefined(initialDashboard, { name: "dashboard" });
  if (initialDashboard.snapshotTransitionKind === "unpublish") {
    const resumedDashboard = await _finishCleanupTransition({
      config: options.config,
      dashboard: initialDashboard,
    });
    assertIsDefined(resumedDashboard, { name: "dashboard" });
    return resumedDashboard;
  }
  const dashboardForClaim =
    initialDashboard.snapshotTransitionKind === undefined ?
      initialDashboard
    : await _recoverTransition({
        config: options.config,
        dashboard: initialDashboard,
        logger,
      });
  assertIsDefined(dashboardForClaim, { name: "dashboard" });
  const claimedDashboard = await _createTransitionClaim({
    config: options.config,
    dashboard: dashboardForClaim,
    kind: "unpublish",
  });
  const updatedDashboard = await _finishCleanupTransition({
    config: options.config,
    dashboard: claimedDashboard,
  });
  assertIsDefined(updatedDashboard, { name: "dashboard" });
  return updatedDashboard;
}

async function _fullDeleteDashboard(
  options: Readonly<{
    config: DashboardMutationConfig;
    dashboardId: Dashboard.Id;
  }>,
): Promise<void> {
  const logger = options.config.clientLogger.appendName("fullDelete");
  logger.log("Deleting dashboard", { id: options.dashboardId });
  const initialDashboard = await DashboardClient.getById({
    id: options.dashboardId,
  });
  assertIsDefined(initialDashboard, { name: "dashboard" });
  if (initialDashboard.snapshotTransitionKind === "delete") {
    await _finishCleanupTransition({
      config: options.config,
      dashboard: initialDashboard,
    });
    return;
  }
  const dashboardForClaim =
    initialDashboard.snapshotTransitionKind === undefined ?
      initialDashboard
    : await _recoverTransition({
        config: options.config,
        dashboard: initialDashboard,
        logger,
      });
  if (dashboardForClaim === undefined) {
    return;
  }
  const claimedDashboard = await _createTransitionClaim({
    config: options.config,
    dashboard: dashboardForClaim,
    kind: "delete",
  });
  await _finishCleanupTransition({
    config: options.config,
    dashboard: claimedDashboard,
  });
}

function _createDashboardMutations(
  config: Readonly<DashboardMutationConfig>,
): DashboardMutations {
  return {
    publishDashboard: async (
      params: Readonly<PublishDashboardParams>,
    ): Promise<Dashboard.T> => {
      return await _publishDashboard({ config, params });
    },
    validateDashboardSlug: async (
      options: Readonly<{
        slug: string;
        visibility: PublishedVisibility;
        dashboardId?: Dashboard.Id;
      }>,
    ): Promise<{ isValid: true } | DashboardSlugValidationFailure> => {
      return await _validateDashboardSlug({ config, ...options });
    },
    unpublishDashboard: async (
      params: Readonly<{ dashboardId: Dashboard.Id }>,
    ): Promise<Dashboard.T> => {
      return await _unpublishDashboard({
        config,
        dashboardId: params.dashboardId,
      });
    },
    fullDelete: async (
      params: Readonly<{ id: Dashboard.Id }>,
    ): Promise<void> => {
      await _fullDeleteDashboard({ config, dashboardId: params.id });
    },
  };
}

const DashboardCrudClient = createRdbCrudClient({
  modelName: "Dashboard",
  tableName: "dashboards",
  dbTablePrimaryKey: "id",
  parsers: DashboardParsers,
  // dbClient is now injected by createRdbCrudClient; nothing to pass here
  mutations: _createDashboardMutations,
});

const DashboardClientWithRawDelete = createUsableServiceClient(
  DashboardCrudClient,
  {
    mutationFns: [
      "publishDashboard",
      "unpublishDashboard",
      "validateDashboardSlug",
      "fullDelete",
    ],
  },
);

export const DashboardClient = omit(DashboardClientWithRawDelete, [
  "bulkDelete",
  "delete",
  "useBulkDelete",
  "useDelete",
]);
