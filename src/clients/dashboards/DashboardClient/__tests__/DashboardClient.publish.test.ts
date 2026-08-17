import { beforeEach, describe, expect, it } from "vitest";
import {
  apiPostMock,
  DashboardClient,
  dbUpdateMock,
  deleteSnapshotGenerationMock,
  deleteSnapshotsMock,
  getDashboardByIdMock,
  getDatasetsMock,
  operationLog,
  reconcileSnapshotsMock,
  uploadDatasetMock,
} from "@/clients/dashboards/DashboardClient/__tests__/DashboardClient.transitions.fixtures";
import { assertPublishTransition } from "@/clients/dashboards/DashboardClient/__tests__/dashboardTransitionAssertions";
import {
  DASHBOARD,
  DASHBOARD_ID,
  DATASET_IDS,
  PREVIOUS_REVISION,
  SNAPSHOT_REVISION,
} from "@/clients/dashboards/DashboardClient/__tests__/dashboardTransitionConstants";
import {
  makeCsvDataset,
  makePublishConfig,
  setUpDashboardTransitionMocks,
} from "@/clients/dashboards/DashboardClient/__tests__/dashboardTransitionScenarios";

beforeEach(() => {
  setUpDashboardTransitionMocks();
});

describe("DashboardClient.publishDashboard", () => {
  it.each([
    {
      visibility: "public" as const,
      uploadBucket: "published",
    },
    {
      visibility: "workspace" as const,
      uploadBucket: "published-private",
    },
  ])(
    "validates and transitions snapshots before publishing to $visibility",
    async ({ visibility, uploadBucket }) => {
      await DashboardClient.publishDashboard({
        dashboardId: DASHBOARD_ID,
        visibility,
        slug: { action: "set", value: "sales-overview" },
        publishConfig: makePublishConfig(),
      });

      assertPublishTransition({ visibility, uploadBucket });
    },
  );

  it("reconciles removed datasets after uploads on a same-audience republish", async () => {
    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      visibility: "public",
      isPublic: true,
      snapshotRevision: PREVIOUS_REVISION,
    });

    await DashboardClient.publishDashboard({
      dashboardId: DASHBOARD_ID,
      visibility: "public",
      publishConfig: makePublishConfig(),
    });

    expect(reconcileSnapshotsMock).toHaveBeenCalledWith({
      bucket: "published",
      dashboardId: DASHBOARD_ID,
      snapshotRevision: SNAPSHOT_REVISION,
      datasetIds: DATASET_IDS,
    });
    expect(operationLog.indexOf("reconcile:published")).toBeGreaterThan(
      operationLog.lastIndexOf("upload:published"),
    );
    expect(deleteSnapshotGenerationMock).toHaveBeenCalledWith({
      bucket: "published",
      dashboardId: DASHBOARD_ID,
      snapshotRevision: PREVIOUS_REVISION,
    });
    expect(deleteSnapshotsMock).not.toHaveBeenCalled();
  });

  it("rejects a dangling configured dataset before any storage write", async () => {
    const danglingDatasetId = DATASET_IDS[3];
    const resolvedDatasetIds = DATASET_IDS.slice(0, -1);
    getDatasetsMock.mockResolvedValueOnce(
      resolvedDatasetIds.map(makeCsvDataset),
    );

    await expect(
      DashboardClient.publishDashboard({
        dashboardId: DASHBOARD_ID,
        visibility: "public",
        publishConfig: makePublishConfig(),
      }),
    ).rejects.toThrow(String(danglingDatasetId));

    expect(uploadDatasetMock).not.toHaveBeenCalled();
    expect(reconcileSnapshotsMock).not.toHaveBeenCalled();
    expect(deleteSnapshotsMock).not.toHaveBeenCalled();
    expect(deleteSnapshotGenerationMock).not.toHaveBeenCalled();
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });

  it("does not clear the other bucket or commit when target reconciliation fails", async () => {
    reconcileSnapshotsMock.mockRejectedValueOnce(
      new Error("reconciliation failed"),
    );

    await expect(
      DashboardClient.publishDashboard({
        dashboardId: DASHBOARD_ID,
        visibility: "workspace",
        publishConfig: makePublishConfig(),
      }),
    ).rejects.toThrow("reconciliation failed");

    expect(uploadDatasetMock).toHaveBeenCalledTimes(DATASET_IDS.length);
    expect(deleteSnapshotsMock).not.toHaveBeenCalled();
    expect(dbUpdateMock).toHaveBeenCalledTimes(3);
    expect(deleteSnapshotGenerationMock).toHaveBeenCalledWith({
      bucket: "published-private",
      dashboardId: DASHBOARD_ID,
      snapshotRevision: SNAPSHOT_REVISION,
    });
  });

  it("does not touch storage when target slug validation fails", async () => {
    apiPostMock.mockResolvedValueOnce({ isValid: false, reason: "taken" });

    await expect(
      DashboardClient.publishDashboard({
        dashboardId: DASHBOARD_ID,
        visibility: "workspace",
        slug: { action: "set", value: "sales-overview" },
        publishConfig: makePublishConfig(),
      }),
    ).rejects.toThrow("sales-overview");

    expect(uploadDatasetMock).not.toHaveBeenCalled();
    expect(deleteSnapshotsMock).not.toHaveBeenCalled();
    expect(deleteSnapshotGenerationMock).not.toHaveBeenCalled();
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects an empty explicit slug before touching storage", async () => {
    apiPostMock.mockResolvedValueOnce({ isValid: false, reason: "invalid" });

    await expect(
      DashboardClient.publishDashboard({
        dashboardId: DASHBOARD_ID,
        visibility: "public",
        slug: { action: "set", value: "" },
        publishConfig: makePublishConfig(),
      }),
    ).rejects.toThrow('custom URL ""');

    expect(apiPostMock).toHaveBeenCalledWith({
      route: "dashboards/validate-slug",
      body: {
        slug: "",
        dashboardId: DASHBOARD_ID,
        visibility: "public",
      },
    });
    expect(uploadDatasetMock).not.toHaveBeenCalled();
    expect(deleteSnapshotsMock).not.toHaveBeenCalled();
    expect(deleteSnapshotGenerationMock).not.toHaveBeenCalled();
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });

  it("skips slug validation when clearing and persists slug removal", async () => {
    await DashboardClient.publishDashboard({
      dashboardId: DASHBOARD_ID,
      visibility: "workspace",
      slug: { action: "clear" },
      publishConfig: makePublishConfig(),
    });

    expect(apiPostMock).not.toHaveBeenCalled();
    expect(dbUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ slug: undefined, visibility: "workspace" }),
    );
  });

  it("validates a preserved slug before touching storage", async () => {
    apiPostMock.mockResolvedValueOnce({ isValid: false, reason: "taken" });

    await expect(
      DashboardClient.publishDashboard({
        dashboardId: DASHBOARD_ID,
        visibility: "public",
        publishConfig: makePublishConfig(),
      }),
    ).rejects.toThrow("existing-slug");

    expect(apiPostMock).toHaveBeenCalledWith({
      route: "dashboards/validate-slug",
      body: {
        slug: "existing-slug",
        dashboardId: DASHBOARD_ID,
        visibility: "public",
      },
    });
    expect(uploadDatasetMock).not.toHaveBeenCalled();
    expect(deleteSnapshotsMock).not.toHaveBeenCalled();
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });
});
