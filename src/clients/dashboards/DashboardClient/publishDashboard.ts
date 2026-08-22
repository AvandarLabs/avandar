import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type {
  DashboardMutationContext,
  PreparedPublishSnapshot,
  PublishCommitOptions,
  PublishDashboardParams,
  StagePublishSnapshotOptions,
} from "@/clients/dashboards/DashboardClient/DashboardClient.types";
import type { SnapshotBucketName } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import type { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import type { ILogger } from "@avandar/logger";

import { assertIsDefined } from "@avandar/utils";

import {
  preparePublishSnapshot,
  uploadPreparedSnapshots,
} from "@/clients/dashboards/DashboardClient/dashboardSnapshotHelpers/dashboardPublishSnapshots";
import {
  abortPublishTransition,
  CLEAR_SNAPSHOT_TRANSITION,
  createTransitionClaim,
  deletePriorSnapshotBestEffort,
  recoverTransition,
  updateDashboardModelIfUnchanged,
} from "@/clients/dashboards/DashboardClient/dashboardSnapshotHelpers/dashboardSnapshotTransitions";
import { DashboardSliceBuilder } from "@/clients/dashboards/DashboardSliceBuilder/DashboardSliceBuilder";
import { DashboardSnapshotTransition } from "@/clients/dashboards/DashboardSnapshotTransition/DashboardSnapshotTransition";
import { PublicDatasetParquetStorageClient } from "@/clients/storage/PublicDatasetParquetStorageClient/PublicDatasetParquetStorageClient";

type PublishUpdateModelOptions = {
  dashboard: Dashboard.T;
  params: PublishDashboardParams;
  publishConfig: PublishSliceConfig.Dashboard;
  snapshotRevision: string;
};

function _getPublishUpdateModel(
  options: Readonly<PublishUpdateModelOptions>,
): Partial<Dashboard.T> {
  const { dashboard, params, publishConfig, snapshotRevision } = options;
  const nextConfig = params.publishConfig
    ? DashboardSliceBuilder.writeDashboardPublishConfig({
        dashboardConfig: dashboard.config,
        publishConfig,
      })
    : undefined;
  return {
    visibility: params.visibility,
    snapshotRevision,
    ...CLEAR_SNAPSHOT_TRANSITION,
    ...(params.slug
      ? { slug: params.slug.action === "set" ? params.slug.value : undefined }
      : {}),
    ...(nextConfig ? { config: nextConfig } : {}),
  };
}

async function _getDashboardForPublish(
  options: Readonly<{
    context: DashboardMutationContext;
    dashboardId: Dashboard.Id;
    logger: ILogger;
  }>,
): Promise<Dashboard.T> {
  const dashboard = await options.context.getDashboardById(options.dashboardId);
  assertIsDefined(dashboard, { name: "dashboard" });
  if (dashboard.snapshotTransitionKind === undefined) {
    return dashboard;
  }
  const recoveredDashboard = await recoverTransition({
    ...options,
    dashboard,
  });
  assertIsDefined(recoveredDashboard, { name: "dashboard" });
  return recoveredDashboard;
}

async function _validatePublishSlug(
  options: Readonly<{
    context: DashboardMutationContext;
    dashboard: Dashboard.T;
    params: PublishDashboardParams;
  }>,
): Promise<void> {
  const slugToValidate =
    options.params.slug?.action === "set"
      ? options.params.slug.value
      : options.params.slug?.action === "clear"
        ? undefined
        : options.dashboard.slug;
  if (slugToValidate === undefined) {
    return;
  }
  const slugCheck = await options.context.validateDashboardSlug({
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
    context: DashboardMutationContext;
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
  await _validatePublishSlug({
    context: options.context,
    dashboard,
    params: options.params,
  });
  const prepared = await preparePublishSnapshot({
    dashboard,
    incomingPublishConfig: options.params.publishConfig,
  });
  const { uploadBucket } =
    DashboardSnapshotTransition.makeSnapshotTransitionPlanFromVisibility(
      options.params.visibility,
    );
  return { dashboard, prepared, uploadBucket };
}

async function _stagePublishSnapshot(
  options: Readonly<
    StagePublishSnapshotOptions & { context: DashboardMutationContext }
  >,
): Promise<{ claimedDashboard: Dashboard.T; snapshotRevision: string }> {
  const claimedDashboard = await createTransitionClaim({
    context: options.context,
    dashboard: options.dashboard,
    kind: "publish",
    targetVisibility: options.visibility,
  });
  assertIsDefined(claimedDashboard.snapshotTransitionRevision, {
    name: "snapshotTransitionRevision",
  });
  const snapshotRevision = claimedDashboard.snapshotTransitionRevision;
  try {
    await uploadPreparedSnapshots({ ...options, snapshotRevision });
    await PublicDatasetParquetStorageClient.reconcileDatasetsForDashboard({
      bucket: options.bucket,
      dashboardId: options.dashboard.id,
      snapshotRevision,
      datasetIds: options.prepared.datasetIds,
    });
  } catch (error: unknown) {
    await abortPublishTransition({
      context: options.context,
      dashboard: claimedDashboard,
      logger: options.logger,
    });
    throw error;
  }
  return { claimedDashboard, snapshotRevision };
}

async function _getPublishOutcomeAfterError(
  options: Readonly<
    PublishCommitOptions & {
      context: DashboardMutationContext;
      error: unknown;
    }
  >,
): Promise<Dashboard.T> {
  const currentDashboard = await (async () => {
    try {
      return await options.context.getDashboardById(options.dashboardId);
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
    await abortPublishTransition({
      context: options.context,
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
  options: Readonly<
    PublishCommitOptions & { context: DashboardMutationContext }
  >,
): Promise<Dashboard.T> {
  try {
    const updatedDashboard = await updateDashboardModelIfUnchanged({
      context: options.context,
      dashboard: options.claimedDashboard,
      updateModel: options.updateModel,
    });
    if (updatedDashboard !== undefined) {
      return updatedDashboard;
    }
  } catch (error: unknown) {
    return await _getPublishOutcomeAfterError({ ...options, error });
  }
  await abortPublishTransition({
    context: options.context,
    dashboard: options.claimedDashboard,
    logger: options.logger,
  });
  throw new Error(
    "Dashboard changed while this publication was being prepared.",
  );
}

/** Publishes a dashboard by staging a snapshot and committing it atomically. */
export async function publishDashboard(
  options: Readonly<{
    context: DashboardMutationContext;
    params: PublishDashboardParams;
  }>,
): Promise<Dashboard.T> {
  const logger = options.context.clientLogger.appendName("publishDashboard");
  const { dashboard, prepared, uploadBucket } =
    await _prepareDashboardForPublish({
      context: options.context,
      logger,
      params: options.params,
    });
  const { claimedDashboard, snapshotRevision } = await _stagePublishSnapshot({
    bucket: uploadBucket,
    context: options.context,
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
    context: options.context,
    dashboardId: options.params.dashboardId,
    logger,
    snapshotRevision,
    updateModel,
    visibility: options.params.visibility,
  });
  await deletePriorSnapshotBestEffort({ dashboard, logger });
  return updatedDashboard;
}
