/** Shared expectations about what a snapshot transition did. */
import { expect } from "vitest";
import {
  apiPostMock,
  dbEqMock,
  dbIsMock,
  dbSelectMock,
  dbUpdateMock,
  deleteSnapshotGenerationMock,
  deleteSnapshotsMock,
  operationLog,
  persistedVisibilityState,
  uploadDatasetMock,
} from "@/clients/dashboards/DashboardClient/__tests__/DashboardClient.transitions.fixtures";
import {
  DASHBOARD,
  DASHBOARD_ID,
  DATASET_IDS,
  PREVIOUS_REVISION,
  SNAPSHOT_REVISION,
} from "@/clients/dashboards/DashboardClient/__tests__/dashboardTransitionConstants";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

/**
 * Mirrors the audience split enforced by the published bucket SELECT policies.
 * The pgTAP storage tests exercise the actual database policies; this seam
 * links client failure ordering to the persisted visibility state.
 */
export function canReadPublishedSnapshotUnderDatabasePolicy(
  options: Readonly<{
    hasDashboardAccess: boolean;
    canEdit?: boolean;
    snapshotRevision: string;
  }>,
): boolean {
  return (
    options.canEdit === true ||
    (options.snapshotRevision === persistedVisibilityState.snapshotRevision &&
      (persistedVisibilityState.current === "public" ||
        options.hasDashboardAccess))
  );
}

export function assertPublishTransition(
  options: Readonly<{
    uploadBucket: string;
    visibility: Dashboard.Visibility;
  }>,
): void {
  expect(apiPostMock).toHaveBeenCalledWith({
    route: "dashboards/validate-slug",
    body: {
      slug: "sales-overview",
      dashboardId: DASHBOARD_ID,
      visibility: options.visibility,
    },
  });
  expect(uploadDatasetMock).toHaveBeenCalledTimes(DATASET_IDS.length);
  expect(uploadDatasetMock).toHaveBeenCalledWith(
    expect.objectContaining({
      bucket: options.uploadBucket,
      snapshotRevision: SNAPSHOT_REVISION,
    }),
  );
  expect(deleteSnapshotsMock).not.toHaveBeenCalled();
  expect(dbUpdateMock).toHaveBeenCalledWith(
    expect.objectContaining({ visibility: options.visibility }),
  );
  expect(dbEqMock).toHaveBeenCalledWith("updated_at", DASHBOARD.updatedAt);
  expect(dbIsMock).toHaveBeenCalledWith("snapshot_revision", null);
  // `select("*")` with no `limit`: PostgREST rejects a limited UPDATE that
  // carries no explicit `order`, and the primary-key filter already bounds
  // the write to one row.
  expect(dbSelectMock).toHaveBeenCalledWith("*");
  expect(operationLog).toEqual([
    "validate",
    "update:undefined",
    ...Array.from({ length: DATASET_IDS.length }, () => {
      return `upload:${options.uploadBucket}`;
    }),
    `reconcile:${options.uploadBucket}`,
    `update:${options.visibility}`,
  ]);
  expect(dbUpdateMock).toHaveBeenCalledWith(
    expect.objectContaining({
      snapshotRevision: SNAPSHOT_REVISION,
      visibility: options.visibility,
    }),
  );
}

export function assertOldGenerationRevoked(): void {
  expect(deleteSnapshotGenerationMock).toHaveBeenCalledWith({
    bucket: "published",
    dashboardId: DASHBOARD_ID,
    snapshotRevision: PREVIOUS_REVISION,
  });
  expect(deleteSnapshotsMock).not.toHaveBeenCalled();
  expect(dbUpdateMock).toHaveBeenCalledWith(
    expect.objectContaining({ snapshotRevision: SNAPSHOT_REVISION }),
  );
  expect(
    canReadPublishedSnapshotUnderDatabasePolicy({
      hasDashboardAccess: false,
      snapshotRevision: PREVIOUS_REVISION,
    }),
  ).toBe(false);
  expect(
    canReadPublishedSnapshotUnderDatabasePolicy({
      hasDashboardAccess: false,
      snapshotRevision: SNAPSHOT_REVISION,
    }),
  ).toBe(true);
  expect(
    canReadPublishedSnapshotUnderDatabasePolicy({
      hasDashboardAccess: true,
      canEdit: true,
      snapshotRevision: PREVIOUS_REVISION,
    }),
  ).toBe(true);
}

export function assertFailedVisibilityUpdateCleanup(): void {
  expect(uploadDatasetMock).toHaveBeenCalledTimes(DATASET_IDS.length);
  expect(deleteSnapshotsMock).not.toHaveBeenCalled();
  expect(deleteSnapshotGenerationMock).toHaveBeenCalledWith({
    bucket: "published",
    dashboardId: DASHBOARD_ID,
    snapshotRevision: SNAPSHOT_REVISION,
  });
  expect(dbUpdateMock).toHaveBeenCalledWith(
    expect.objectContaining({ visibility: "public" }),
  );
  expect(
    canReadPublishedSnapshotUnderDatabasePolicy({
      hasDashboardAccess: false,
      snapshotRevision: SNAPSHOT_REVISION,
    }),
  ).toBe(false);
  expect(
    canReadPublishedSnapshotUnderDatabasePolicy({
      hasDashboardAccess: true,
      canEdit: true,
      snapshotRevision: SNAPSHOT_REVISION,
    }),
  ).toBe(true);
}
