import { beforeEach, describe, expect, it } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import {
  DashboardClient,
  dbUpdateMock,
  operationLog,
  persistedVisibilityState,
  prepareMapSnapshotsMock,
  reconcileSnapshotsMock,
  uploadDatasetMock,
  uploadMapSnapshotsMock,
} from "@/clients/dashboards/DashboardClient/__tests__/DashboardClient.transitions.fixtures";
import {
  DASHBOARD_ID,
  SNAPSHOT_REVISION,
} from "@/clients/dashboards/DashboardClient/__tests__/dashboardTransitionConstants";
import {
  makePublishConfig,
  setUpDashboardTransitionMocks,
} from "@/clients/dashboards/DashboardClient/__tests__/dashboardTransitionScenarios";
import { MapSnapshotPublishError } from "@/clients/maps/MapSnapshot/MapSnapshotPublishError";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";

const MAP_ID = "00000000-0000-4000-8000-0000000000f5" as AvaMap.Id;
const MAP_SNAPSHOT: MapSnapshot = {
  version: 1,
  mapId: MAP_ID,
  mapName: "Coverage risk",
  config: AvaMapConfig.makeEmpty(),
  layers: [],
};

beforeEach(() => {
  setUpDashboardTransitionMocks();
});

describe("DashboardClient.publishDashboard map snapshots", () => {
  it("stages each map snapshot in the claimed public generation before reconciling", async () => {
    prepareMapSnapshotsMock.mockResolvedValueOnce([MAP_SNAPSHOT]);
    uploadMapSnapshotsMock.mockImplementationOnce(async () => {
      operationLog.push("upload-maps:published");
    });

    await DashboardClient.publishDashboard({
      dashboardId: DASHBOARD_ID,
      visibility: "public",
      publishConfig: makePublishConfig(),
    });

    expect(prepareMapSnapshotsMock).toHaveBeenCalledWith(
      expect.objectContaining({ visibility: "public" }),
    );
    expect(uploadMapSnapshotsMock).toHaveBeenCalledWith({
      bucket: "published",
      dashboardId: DASHBOARD_ID,
      snapshotRevision: SNAPSHOT_REVISION,
      mapSnapshots: [MAP_SNAPSHOT],
    });
    expect(operationLog.indexOf("upload-maps:published")).toBeLessThan(
      operationLog.indexOf("reconcile:published"),
    );
  });

  it("writes and claims nothing when a map cannot be published", async () => {
    const publishError = new MapSnapshotPublishError({
      reason: "filtersNoLongerApply",
      mapId: MAP_ID,
      mapName: "Coverage risk",
      layerNames: ["Cases"],
    });
    prepareMapSnapshotsMock.mockRejectedValueOnce(publishError);

    await expect(
      DashboardClient.publishDashboard({
        dashboardId: DASHBOARD_ID,
        visibility: "public",
        publishConfig: makePublishConfig(),
      }),
    ).rejects.toBe(publishError);

    expect(uploadDatasetMock).not.toHaveBeenCalled();
    expect(uploadMapSnapshotsMock).not.toHaveBeenCalled();
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });

  it("aborts the claimed generation when a map snapshot fails to upload", async () => {
    uploadMapSnapshotsMock.mockRejectedValueOnce(new Error("upload failed"));

    await expect(
      DashboardClient.publishDashboard({
        dashboardId: DASHBOARD_ID,
        visibility: "public",
        publishConfig: makePublishConfig(),
      }),
    ).rejects.toThrow("upload failed");

    expect(reconcileSnapshotsMock).not.toHaveBeenCalled();
    expect(persistedVisibilityState.current).toBe("draft");
    expect(persistedVisibilityState.snapshotTransitionKind).toBeUndefined();
  });
});
