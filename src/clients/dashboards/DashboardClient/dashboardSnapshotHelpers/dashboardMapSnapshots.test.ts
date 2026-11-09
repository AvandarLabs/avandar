import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { DASHBOARD } from "@/clients/dashboards/DashboardClient/__tests__/dashboardTransitionConstants";
import {
  prepareMapSnapshots,
  uploadMapSnapshots,
} from "@/clients/dashboards/DashboardClient/dashboardSnapshotHelpers/dashboardMapSnapshots";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";

const { createMapSnapshotMock, uploadMapSnapshotMock } = vi.hoisted(() => {
  return {
    createMapSnapshotMock: vi.fn(),
    uploadMapSnapshotMock: vi.fn(),
  };
});

vi.mock(
  "@/clients/maps/MapSnapshot/createMapSnapshotFromMapId/createMapSnapshotFromMapId",
  () => {
    return { createMapSnapshotFromMapId: createMapSnapshotMock };
  },
);
vi.mock(
  "@/clients/storage/PublicMapSnapshotStorageClient/PublicMapSnapshotStorageClient",
  () => {
    return {
      PublicMapSnapshotStorageClient: {
        uploadMapSnapshot: uploadMapSnapshotMock,
      },
    };
  },
);

const MAP_ID = "00000000-0000-4000-8000-0000000000f5" as AvaMap.Id;
const MAP_DASHBOARD = {
  ...DASHBOARD,
  config: {
    root: { props: { title: "Coverage" } },
    content: [
      { type: "Map", props: { id: "Map-1", mapId: MAP_ID } },
      { type: "Map", props: { id: "Map-2", mapId: MAP_ID } },
    ],
  },
};
const SNAPSHOT: MapSnapshot = {
  version: 1,
  mapId: MAP_ID,
  mapName: "Coverage risk",
  config: AvaMapConfig.makeEmpty(),
  layers: [],
};
const SNAPSHOT_REVISION = "44444444-4444-4444-8444-444444444444";

describe("dashboardMapSnapshots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMapSnapshotMock.mockResolvedValue(SNAPSHOT);
  });

  it("compiles each map once for a public publish", async () => {
    const snapshots = await prepareMapSnapshots({
      dashboard: MAP_DASHBOARD,
      visibility: "public",
    });

    expect(snapshots).toEqual([SNAPSHOT]);
    expect(createMapSnapshotMock).toHaveBeenCalledTimes(1);
    expect(createMapSnapshotMock).toHaveBeenCalledWith({
      mapId: MAP_ID,
      workspaceId: DASHBOARD.workspaceId,
    });
  });

  it("compiles nothing for a workspace publish, whose maps stay live", async () => {
    await expect(
      prepareMapSnapshots({
        dashboard: MAP_DASHBOARD,
        visibility: "workspace",
      }),
    ).resolves.toEqual([]);
    expect(createMapSnapshotMock).not.toHaveBeenCalled();
  });

  it("rejects the whole publish when any map cannot be compiled", async () => {
    createMapSnapshotMock.mockRejectedValueOnce(new Error("map failed"));

    await expect(
      prepareMapSnapshots({ dashboard: MAP_DASHBOARD, visibility: "public" }),
    ).rejects.toThrow("map failed");
  });

  it("uploads every snapshot into the staged generation", async () => {
    await uploadMapSnapshots({
      bucket: "published",
      dashboardId: DASHBOARD.id,
      snapshotRevision: SNAPSHOT_REVISION,
      mapSnapshots: [SNAPSHOT],
    });

    expect(uploadMapSnapshotMock).toHaveBeenCalledWith({
      bucket: "published",
      dashboardId: DASHBOARD.id,
      snapshotRevision: SNAPSHOT_REVISION,
      snapshot: SNAPSHOT,
    });
  });
});
