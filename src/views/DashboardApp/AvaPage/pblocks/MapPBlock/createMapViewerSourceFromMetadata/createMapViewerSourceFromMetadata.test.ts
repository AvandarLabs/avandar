import { describe, expect, it } from "vitest";
import { createMapViewerSourceFromMetadata } from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/createMapViewerSourceFromMetadata/createMapViewerSourceFromMetadata";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Workspace } from "$/models/Workspace/Workspace";

const MAP_ID = "00000000-0000-4000-8000-0000000000f5" as AvaMap.Id;
const DASHBOARD_ID = "00000000-0000-4000-8000-0000000000d1" as Dashboard.Id;
const WORKSPACE_ID = "00000000-0000-4000-8000-0000000000aa" as Workspace.Id;

describe("createMapViewerSourceFromMetadata", () => {
  it("reads a public page's map from its snapshot", () => {
    expect(
      createMapViewerSourceFromMetadata({
        mapId: MAP_ID,
        metadata: {
          auth: "public",
          dashboardId: DASHBOARD_ID,
          snapshotRevision: "rev-1",
        },
      }),
    ).toEqual({
      type: "snapshot",
      mapId: MAP_ID,
      dashboardId: DASHBOARD_ID,
      snapshotRevision: "rev-1",
    });
  });

  it.each(["workspace", "workspace_published"] as const)(
    "draws a %s page's map live",
    (auth) => {
      expect(
        createMapViewerSourceFromMetadata({
          mapId: MAP_ID,
          metadata:
            auth === "workspace"
              ? { auth, dashboardId: DASHBOARD_ID, workspaceId: WORKSPACE_ID }
              : {
                  auth,
                  dashboardId: DASHBOARD_ID,
                  workspaceId: WORKSPACE_ID,
                  snapshotRevision: "rev-1",
                },
        }),
      ).toEqual({ type: "live", mapId: MAP_ID, workspaceId: WORKSPACE_ID });
    },
  );
});
