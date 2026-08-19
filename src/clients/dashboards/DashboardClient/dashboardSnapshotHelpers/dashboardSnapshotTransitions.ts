import { assertIsDefined } from "@avandar/utils";
import { uuid } from "$/lib/uuid";
import { DashboardSnapshotTransition } from "@/clients/dashboards/DashboardSnapshotTransition/DashboardSnapshotTransition";
import { updateDashboardRowIfUnchanged } from "@/clients/dashboards/updateDashboardRowIfUnchanged";
import { PublicDatasetParquetStorageClient } from "@/clients/storage/PublicDatasetParquetStorageClient/PublicDatasetParquetStorageClient";
import { SnapshotStorageUtils } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import type { DashboardMutationContext } from "@/clients/dashboards/DashboardClient/DashboardClient.types";
import type {
  PublishedVisibility,
  SnapshotBucketName,
} from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import type { ILogger } from "@avandar/logger";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

type TransitionClaimOptions = {
  context: DashboardMutationContext;
  dashboard: Dashboard.T;
  kind: Dashboard.SnapshotTransitionKind;
  targetVisibility?: PublishedVisibility;
};

type DeleteStagedSnapshotOptions = {
  bucket: SnapshotBucketName;
  dashboardId: Dashboard.Id;
  logger: ILogger;
  snapshotRevision: string;
};

/** Clears every snapshot-transition column on a dashboard row. */
export const CLEAR_SNAPSHOT_TRANSITION = {
  snapshotTransitionKind: undefined,
  snapshotTransitionPriorRevision: undefined,
  snapshotTransitionPriorVisibility: undefined,
  snapshotTransitionRevision: undefined,
  snapshotTransitionTargetVisibility: undefined,
} as const;

/**
 * Applies a model update, but only while the dashboard is still the one the
 * caller read. Returns the updated model, or `undefined` when another writer
 * got there first.
 */
export async function updateDashboardModelIfUnchanged(
  options: Readonly<{
    context: DashboardMutationContext;
    dashboard: Dashboard.T;
    updateModel: Partial<Dashboard.T>;
  }>,
): Promise<Dashboard.T | undefined> {
  const dbUpdate = options.context.parsers.fromModelUpdateToDBUpdate(
    options.updateModel,
  );
  const updatedDashboard = await updateDashboardRowIfUnchanged({
    dbClient: options.context.dbClient,
    dashboard: options.dashboard,
    dbUpdate,
  });
  return updatedDashboard === undefined ? undefined : (
      options.context.parsers.fromDBReadToModelRead(updatedDashboard)
    );
}

/** Deletes the previous published generation, tolerating storage failures. */
export async function deletePriorSnapshotBestEffort(
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

/**
 * Claims a snapshot transition on a dashboard, tolerating a lost response
 * whose write in relation landed.
 */
export async function createTransitionClaim(
  options: Readonly<TransitionClaimOptions>,
): Promise<Dashboard.T> {
  const transitionRevision = uuid<"DashboardSnapshotTransition">();
  const claimedDashboard = await (async () => {
    try {
      return await updateDashboardModelIfUnchanged({
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
      const currentDashboard = await options.context.getDashboardById(
        options.dashboard.id,
      );
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
    context: DashboardMutationContext;
    dashboardId: Dashboard.Id;
  }>,
): Promise<void> {
  const deletedDashboardId = await (async (): Promise<string | undefined> => {
    try {
      const { data } = await options.context.dbClient
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
      const remainingDashboard = await options.context.getDashboardById(
        options.dashboardId,
      );
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

/**
 * Empties every snapshot bucket for a dashboard, then either deletes the row
 * or returns it to draft, depending on the claimed transition kind.
 */
export async function finishCleanupTransition(
  options: Readonly<{
    context: DashboardMutationContext;
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
      const validatedDashboard = await updateDashboardModelIfUnchanged({
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
    await _deleteDashboardAfterCleanup({
      context: options.context,
      dashboardId,
    });
    return undefined;
  }
  const updatedDashboard = await updateDashboardModelIfUnchanged({
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
    context: DashboardMutationContext;
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
    const fencedDashboard = await updateDashboardModelIfUnchanged({
      ...options,
      updateModel: { snapshotTransitionKind: "abort_publish" },
    });
    if (fencedDashboard === undefined) {
      throw new Error("Dashboard snapshot transition changed.");
    }
    return fencedDashboard;
  } catch (error: unknown) {
    const currentDashboard = await options.context.getDashboardById(
      options.dashboard.id,
    );
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

/** Rolls back a claimed publish, deleting whatever it staged. */
export async function abortPublishTransition(
  options: Readonly<{
    context: DashboardMutationContext;
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
  const clearedDashboard = await updateDashboardModelIfUnchanged({
    ...options,
    dashboard: abortingDashboard,
    updateModel: { ...CLEAR_SNAPSHOT_TRANSITION },
  });
  if (clearedDashboard === undefined) {
    throw new Error("Dashboard snapshot transition changed.");
  }
  return clearedDashboard;
}

/** Finishes whatever snapshot transition an interrupted run left behind. */
export async function recoverTransition(
  options: Readonly<{
    context: DashboardMutationContext;
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
    return await abortPublishTransition(options);
  }
  return await finishCleanupTransition(options);
}
