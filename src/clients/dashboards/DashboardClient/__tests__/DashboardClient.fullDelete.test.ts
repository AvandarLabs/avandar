import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DashboardClient,
  dbDeleteEqMock,
  dbDeleteMock,
  dbDeleteSelectMock,
  dbDeleteSingleMock,
  dbDeleteThrowOnErrorMock,
  dbThrowOnErrorMock,
  dbUpdateMock,
  deleteDashboardMock,
  deleteSnapshotsMock,
  getDashboardByIdMock,
  operationLog,
  persistedVisibilityState,
  uploadDatasetMock,
  uuidMock,
} from "@/clients/dashboards/DashboardClient/__tests__/DashboardClient.transitions.fixtures";
import {
  CLEANUP_REVISION,
  DASHBOARD,
  DASHBOARD_ID,
  PREVIOUS_REVISION,
} from "@/clients/dashboards/DashboardClient/__tests__/dashboardTransitionConstants";
import {
  configurePausedBroadCleanup,
  makePublishConfig,
  setUpDashboardTransitionMocks,
} from "@/clients/dashboards/DashboardClient/__tests__/dashboardTransitionScenarios";

beforeEach(() => {
  setUpDashboardTransitionMocks();
});

describe("DashboardClient.fullDelete", () => {
  it("does not expose raw delete mutations that bypass snapshot cleanup", () => {
    // A positive control: the CRUD stand-in really does hand these keys over,
    // so the absences below are production's `omit` list and not a gap in the
    // mock.
    expect(DashboardClient).toHaveProperty("getById");
    expect(DashboardClient).not.toHaveProperty("delete");
    expect(DashboardClient).not.toHaveProperty("bulkDelete");
    expect(DashboardClient).not.toHaveProperty("useDelete");
    expect(DashboardClient).not.toHaveProperty("useBulkDelete");
  });

  it("resumes cleanup when a lost CAS response already revoked access", async () => {
    uuidMock.mockReturnValueOnce(CLEANUP_REVISION);
    getDashboardByIdMock
      .mockResolvedValueOnce({
        ...DASHBOARD,
        snapshotRevision: PREVIOUS_REVISION,
        visibility: "public",
      })
      .mockResolvedValueOnce({
        ...DASHBOARD,
        snapshotRevision: PREVIOUS_REVISION,
        snapshotTransitionKind: "delete",
        snapshotTransitionPriorRevision: PREVIOUS_REVISION,
        snapshotTransitionPriorVisibility: "public",
        snapshotTransitionRevision: CLEANUP_REVISION,
        visibility: "draft",
        updatedAt: "2026-08-14T00:00:01.000Z",
      });
    dbThrowOnErrorMock.mockRejectedValueOnce(new Error("response lost"));

    await DashboardClient.fullDelete({ id: DASHBOARD_ID });

    expect(deleteSnapshotsMock).toHaveBeenCalledTimes(2);
    expect(dbDeleteMock).toHaveBeenCalledOnce();
    expect(dbDeleteEqMock).toHaveBeenCalledWith("id", DASHBOARD_ID);
  });

  it("revokes snapshot access before clearing buckets and deleting", async () => {
    uuidMock.mockReturnValueOnce(CLEANUP_REVISION);
    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      snapshotRevision: PREVIOUS_REVISION,
      visibility: "public",
    });

    await DashboardClient.fullDelete({ id: DASHBOARD_ID });

    expect(operationLog).toEqual([
      "update:draft",
      "clear:published",
      "clear:published-private",
      "delete-row",
    ]);
    expect(dbUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshotTransitionRevision: CLEANUP_REVISION,
        visibility: "draft",
      }),
    );
    expect(dbDeleteSelectMock).toHaveBeenCalledWith("id");
    expect(dbDeleteSingleMock).toHaveBeenCalledOnce();
    expect(deleteDashboardMock).not.toHaveBeenCalled();
  });

  it("rejects a definite zero-row delete even when a reread would hide the row", async () => {
    uuidMock.mockReturnValueOnce(CLEANUP_REVISION);
    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      snapshotRevision: PREVIOUS_REVISION,
      visibility: "public",
    });
    persistedVisibilityState.isDashboardDeleted = true;
    const cardinalityError = Object.assign(new Error("zero rows"), {
      code: "PGRST116",
    });
    dbDeleteThrowOnErrorMock.mockRejectedValueOnce(cardinalityError);

    await expect(DashboardClient.fullDelete({ id: DASHBOARD_ID })).rejects.toBe(
      cardinalityError,
    );
    expect(getDashboardByIdMock).toHaveBeenCalledOnce();
  });

  it("rejects a successful delete response for a different dashboard", async () => {
    uuidMock.mockReturnValueOnce(CLEANUP_REVISION);
    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      snapshotRevision: PREVIOUS_REVISION,
      visibility: "public",
    });
    dbDeleteThrowOnErrorMock.mockResolvedValueOnce({
      data: { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" },
    });

    await expect(
      DashboardClient.fullDelete({ id: DASHBOARD_ID }),
    ).rejects.toThrow("Dashboard delete returned an unexpected row");
    expect(getDashboardByIdMock).toHaveBeenCalledOnce();
  });

  it("accepts a lost final-delete response when the dashboard is gone", async () => {
    uuidMock.mockReturnValueOnce(CLEANUP_REVISION);
    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      snapshotRevision: PREVIOUS_REVISION,
      visibility: "public",
    });
    dbDeleteThrowOnErrorMock.mockImplementationOnce(async () => {
      operationLog.push("delete-row");
      persistedVisibilityState.isDashboardDeleted = true;
      throw new Error("response lost");
    });

    await expect(
      DashboardClient.fullDelete({ id: DASHBOARD_ID }),
    ).resolves.toBeUndefined();
    expect(getDashboardByIdMock).toHaveBeenCalledTimes(2);
  });

  it("leaves an inaccessible draft row when snapshot cleanup fails", async () => {
    uuidMock.mockReturnValueOnce(CLEANUP_REVISION);
    deleteSnapshotsMock.mockRejectedValueOnce(new Error("cleanup failed"));

    await expect(
      DashboardClient.fullDelete({ id: DASHBOARD_ID }),
    ).rejects.toThrow("cleanup failed");

    expect(dbDeleteMock).not.toHaveBeenCalled();
    expect(persistedVisibilityState.current).toBe("draft");
    expect(persistedVisibilityState.snapshotRevision).toBeUndefined();
    expect(persistedVisibilityState.snapshotTransitionRevision).toBe(
      CLEANUP_REVISION,
    );

    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      snapshotTransitionKind: "delete",
      snapshotTransitionPriorVisibility: "draft",
      snapshotTransitionRevision: CLEANUP_REVISION,
      visibility: "draft",
      updatedAt: persistedVisibilityState.updatedAt,
    });
    await DashboardClient.fullDelete({ id: DASHBOARD_ID });
    expect(dbDeleteMock).toHaveBeenCalledOnce();
  });

  it("blocks a cross-device publication throughout broad cleanup", async () => {
    const { releaseCleanup } = configurePausedBroadCleanup();

    const deletePromise = DashboardClient.fullDelete({ id: DASHBOARD_ID });
    await vi.waitFor(() => {
      expect(deleteSnapshotsMock).toHaveBeenCalledTimes(1);
    });

    const publishPromise = DashboardClient.publishDashboard({
      dashboardId: DASHBOARD_ID,
      visibility: "public",
      publishConfig: makePublishConfig(),
    });
    await vi.waitFor(() => {
      expect(deleteSnapshotsMock).toHaveBeenCalledTimes(2);
    });
    expect(uploadDatasetMock).not.toHaveBeenCalled();

    releaseCleanup();
    await expect(publishPromise).rejects.toThrow("Expected dashboard");
    await deletePromise;
    expect(dbDeleteMock).toHaveBeenCalled();
  });
});
