import { beforeEach, describe, expect, it } from "vitest";

import {
  DashboardClient,
  dbEqMock,
  dbUpdateMock,
  deleteSnapshotsMock,
  getDashboardByIdMock,
  operationLog,
  persistedVisibilityState,
  uuidMock,
} from "@/clients/dashboards/DashboardClient/__tests__/DashboardClient.transitions.fixtures";
import {
  CLEANUP_REVISION,
  DASHBOARD,
  DASHBOARD_ID,
  PREVIOUS_REVISION,
} from "@/clients/dashboards/DashboardClient/__tests__/dashboardTransitionConstants";
import { setUpDashboardTransitionMocks } from "@/clients/dashboards/DashboardClient/__tests__/dashboardTransitionScenarios";

beforeEach(() => {
  setUpDashboardTransitionMocks();
});

describe("DashboardClient.unpublishDashboard", () => {
  it("claims cleanup with CAS before clearing every generation", async () => {
    uuidMock.mockReturnValueOnce(CLEANUP_REVISION);
    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      snapshotRevision: PREVIOUS_REVISION,
      visibility: "workspace",
    });
    await DashboardClient.unpublishDashboard({ dashboardId: DASHBOARD_ID });

    expect(operationLog).toEqual([
      "update:draft",
      "clear:published",
      "clear:published-private",
      "update:draft",
    ]);
    expect(dbUpdateMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        snapshotTransitionRevision: CLEANUP_REVISION,
        visibility: "draft",
      }),
    );
    expect(dbUpdateMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        snapshotRevision: undefined,
        snapshotTransitionRevision: undefined,
        visibility: "draft",
      }),
    );
    expect(dbEqMock).toHaveBeenCalledWith(
      "snapshot_revision",
      PREVIOUS_REVISION,
    );
  });

  it("revalidates the exact cleanup claim with CAS before removals", async () => {
    uuidMock.mockReturnValueOnce(CLEANUP_REVISION);
    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      snapshotRevision: PREVIOUS_REVISION,
      visibility: "workspace",
    });
    deleteSnapshotsMock.mockImplementation(
      async ({ assertCanDelete, bucket }) => {
        operationLog.push(`clear:${String(bucket)}`);
        await assertCanDelete();
      },
    );

    await DashboardClient.unpublishDashboard({ dashboardId: DASHBOARD_ID });

    expect(dbUpdateMock).toHaveBeenCalledTimes(4);
    expect(dbUpdateMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        snapshotTransitionRevision: CLEANUP_REVISION,
      }),
    );
    expect(dbUpdateMock).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        snapshotTransitionRevision: CLEANUP_REVISION,
      }),
    );
  });

  it("keeps the cleanup claim unpublished when broad cleanup fails", async () => {
    uuidMock.mockReturnValueOnce(CLEANUP_REVISION);
    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      snapshotRevision: PREVIOUS_REVISION,
      visibility: "public",
    });
    persistedVisibilityState.snapshotRevision = PREVIOUS_REVISION;
    deleteSnapshotsMock.mockRejectedValueOnce(new Error("cleanup failed"));

    await expect(
      DashboardClient.unpublishDashboard({ dashboardId: DASHBOARD_ID }),
    ).rejects.toThrow("cleanup failed");

    expect(dbUpdateMock).toHaveBeenCalledTimes(1);
    expect(dbUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshotTransitionRevision: CLEANUP_REVISION,
        visibility: "draft",
      }),
    );
    expect(deleteSnapshotsMock).toHaveBeenCalledTimes(2);
    expect(persistedVisibilityState.current).toBe("draft");
    expect(persistedVisibilityState.snapshotRevision).toBe(PREVIOUS_REVISION);
    expect(persistedVisibilityState.snapshotTransitionRevision).toBe(
      CLEANUP_REVISION,
    );

    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      snapshotRevision: PREVIOUS_REVISION,
      snapshotTransitionKind: "unpublish",
      snapshotTransitionPriorRevision: PREVIOUS_REVISION,
      snapshotTransitionPriorVisibility: "public",
      snapshotTransitionRevision: CLEANUP_REVISION,
      visibility: "draft",
      updatedAt: persistedVisibilityState.updatedAt,
    });
    await DashboardClient.unpublishDashboard({ dashboardId: DASHBOARD_ID });
    expect(deleteSnapshotsMock).toHaveBeenCalledTimes(4);
    expect(persistedVisibilityState.snapshotRevision).toBeUndefined();
  });
});
