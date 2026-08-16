import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DashboardClient,
  dbEqMock,
  dbThrowOnErrorMock,
  dbUpdateMock,
  deleteSnapshotGenerationMock,
  deleteSnapshotsMock,
  getDashboardByIdMock,
  operationLog,
  persistedVisibilityState,
  uploadDatasetMock,
} from "@/clients/dashboards/DashboardClient/DashboardClient.transitions.fixtures";
import {
  assertFailedVisibilityUpdateCleanup,
  assertOldGenerationRevoked,
  canReadPublishedSnapshotUnderDatabasePolicy,
} from "@/clients/dashboards/DashboardClient/dashboardTransitionAssertions";
import {
  DASHBOARD,
  DASHBOARD_ID,
  DATASET_IDS,
  PREVIOUS_REVISION,
  SNAPSHOT_REVISION,
  WINNING_REVISION,
} from "@/clients/dashboards/DashboardClient/dashboardTransitionConstants";
import {
  configureVisibilityUpdateFailure,
  makePublishConfig,
  setUpDashboardTransitionMocks,
} from "@/clients/dashboards/DashboardClient/dashboardTransitionScenarios";

beforeEach(() => {
  setUpDashboardTransitionMocks();
});

describe("DashboardClient.publishDashboard failure recovery", () => {
  it("does not clear snapshots or update visibility when an upload fails", async () => {
    uploadDatasetMock
      .mockImplementationOnce(async ({ bucket }) => {
        operationLog.push(`upload:${String(bucket)}`);
      })
      .mockRejectedValueOnce(new Error("upload failed"));

    await expect(
      DashboardClient.publishDashboard({
        dashboardId: DASHBOARD_ID,
        visibility: "public",
        publishConfig: makePublishConfig(),
      }),
    ).rejects.toThrow("upload failed");

    expect(uploadDatasetMock.mock.calls.length).toBeGreaterThan(1);
    uploadDatasetMock.mock.calls.forEach(([uploadOptions]) => {
      expect(uploadOptions).toEqual(
        expect.objectContaining({ bucket: "published" }),
      );
    });
    expect(deleteSnapshotsMock).not.toHaveBeenCalled();
    expect(deleteSnapshotGenerationMock).toHaveBeenCalledWith({
      bucket: "published",
      dashboardId: DASHBOARD_ID,
      snapshotRevision: SNAPSHOT_REVISION,
    });
    expect(dbUpdateMock).toHaveBeenCalledTimes(3);
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
  });

  it("keeps the committed generation live when post-commit cleanup fails", async () => {
    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      snapshotRevision: PREVIOUS_REVISION,
      visibility: "public",
    });
    deleteSnapshotGenerationMock.mockRejectedValueOnce(
      new Error("cleanup failed"),
    );

    await DashboardClient.publishDashboard({
      dashboardId: DASHBOARD_ID,
      visibility: "workspace",
      publishConfig: makePublishConfig(),
    });

    expect(uploadDatasetMock).toHaveBeenCalledTimes(DATASET_IDS.length);
    expect(dbUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ snapshotRevision: SNAPSHOT_REVISION }),
    );
    expect(dbUpdateMock.mock.invocationCallOrder[0]).toBeLessThan(
      deleteSnapshotGenerationMock.mock.invocationCallOrder[0] ?? 0,
    );
    expect(deleteSnapshotsMock).not.toHaveBeenCalled();
  });

  it("revokes the old generation even when post-commit cleanup fails", async () => {
    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      isPublic: true,
      snapshotRevision: PREVIOUS_REVISION,
      visibility: "public",
    });
    persistedVisibilityState.current = "public";
    persistedVisibilityState.snapshotRevision = PREVIOUS_REVISION;
    deleteSnapshotGenerationMock.mockRejectedValueOnce(
      new Error("cleanup failed"),
    );

    await DashboardClient.publishDashboard({
      dashboardId: DASHBOARD_ID,
      visibility: "public",
      publishConfig: makePublishConfig(),
    });

    expect(uploadDatasetMock).toHaveBeenCalledTimes(DATASET_IDS.length);
    expect(uploadDatasetMock).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: "published" }),
    );
    assertOldGenerationRevoked();
  });

  it("deletes only its staged generation when the visibility update fails", async () => {
    configureVisibilityUpdateFailure();

    await expect(
      DashboardClient.publishDashboard({
        dashboardId: DASHBOARD_ID,
        visibility: "public",
        publishConfig: makePublishConfig(),
      }),
    ).rejects.toThrow("update failed");

    assertFailedVisibilityUpdateCleanup();
  });

  it("recovers a prior process publish before claiming a new revision", async () => {
    persistedVisibilityState.snapshotTransitionKind = "publish";
    persistedVisibilityState.snapshotTransitionPriorVisibility = "draft";
    persistedVisibilityState.snapshotTransitionRevision = WINNING_REVISION;
    persistedVisibilityState.snapshotTransitionTargetVisibility = "public";
    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      snapshotTransitionKind: "publish",
      snapshotTransitionPriorVisibility: "draft",
      snapshotTransitionRevision: WINNING_REVISION,
      snapshotTransitionTargetVisibility: "public",
      updatedAt: "2026-08-14T00:00:01.000Z",
    });

    await DashboardClient.publishDashboard({
      dashboardId: DASHBOARD_ID,
      visibility: "public",
      publishConfig: makePublishConfig(),
    });

    expect(deleteSnapshotGenerationMock).toHaveBeenCalledWith({
      bucket: "published",
      dashboardId: DASHBOARD_ID,
      snapshotRevision: WINNING_REVISION,
    });
    expect(
      deleteSnapshotGenerationMock.mock.invocationCallOrder[0],
    ).toBeLessThan(uploadDatasetMock.mock.invocationCallOrder[0] ?? 0);
    expect(uploadDatasetMock).toHaveBeenCalledWith(
      expect.objectContaining({ snapshotRevision: SNAPSHOT_REVISION }),
    );
  });

  it("durably fences a prior publisher before deleting its staged revision", async () => {
    let releaseDelete: (() => void) | undefined;
    const deletePaused = new Promise<void>((resolve) => {
      releaseDelete = resolve;
    });
    persistedVisibilityState.snapshotTransitionKind = "publish";
    persistedVisibilityState.snapshotTransitionPriorVisibility = "draft";
    persistedVisibilityState.snapshotTransitionRevision = WINNING_REVISION;
    persistedVisibilityState.snapshotTransitionTargetVisibility = "public";
    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      snapshotTransitionKind: "publish",
      snapshotTransitionPriorVisibility: "draft",
      snapshotTransitionRevision: WINNING_REVISION,
      snapshotTransitionTargetVisibility: "public",
      updatedAt: "2026-08-14T00:00:01.000Z",
    });
    deleteSnapshotGenerationMock.mockImplementationOnce(async () => {
      await deletePaused;
    });

    const recoveryPromise = DashboardClient.publishDashboard({
      dashboardId: DASHBOARD_ID,
      visibility: "public",
      publishConfig: makePublishConfig(),
    });
    await vi.waitFor(() => {
      expect(deleteSnapshotGenerationMock).toHaveBeenCalledTimes(1);
    });

    expect(persistedVisibilityState.snapshotTransitionKind).toBe(
      "abort_publish",
    );
    expect(dbUpdateMock.mock.invocationCallOrder[0]).toBeLessThan(
      deleteSnapshotGenerationMock.mock.invocationCallOrder[0] ?? 0,
    );

    releaseDelete?.();
    await recoveryPromise;
  });

  it("fences a losing publisher before any storage write", async () => {
    persistedVisibilityState.current = "public";
    persistedVisibilityState.snapshotRevision = WINNING_REVISION;
    dbThrowOnErrorMock.mockResolvedValueOnce({ data: [] });

    await expect(
      DashboardClient.publishDashboard({
        dashboardId: DASHBOARD_ID,
        visibility: "public",
        publishConfig: makePublishConfig(),
      }),
    ).rejects.toThrow("transition could start");

    expect(uploadDatasetMock).not.toHaveBeenCalled();
    expect(deleteSnapshotGenerationMock).not.toHaveBeenCalled();
    expect(deleteSnapshotsMock).not.toHaveBeenCalled();
    expect(persistedVisibilityState.snapshotRevision).toBe(WINNING_REVISION);
  });

  it("compares a previously committed pointer as well as updated_at", async () => {
    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      snapshotRevision: PREVIOUS_REVISION,
      visibility: "public",
    });
    persistedVisibilityState.snapshotRevision = PREVIOUS_REVISION;

    await DashboardClient.publishDashboard({
      dashboardId: DASHBOARD_ID,
      visibility: "workspace",
      publishConfig: makePublishConfig(),
    });

    expect(dbEqMock).toHaveBeenCalledWith(
      "snapshot_revision",
      PREVIOUS_REVISION,
    );
    expect(dbEqMock).toHaveBeenCalledWith("updated_at", DASHBOARD.updatedAt);
    expect(dbEqMock).toHaveBeenCalledWith(
      "snapshot_revision",
      PREVIOUS_REVISION,
    );
  });
});
