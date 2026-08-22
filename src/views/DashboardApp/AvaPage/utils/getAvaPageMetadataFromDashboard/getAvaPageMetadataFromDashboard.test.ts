import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Workspace } from "$/models/Workspace/Workspace";

import { describe, expect, it } from "vitest";

import { getAvaPageMetadataFromDashboard } from "@/views/DashboardApp/AvaPage/utils/getAvaPageMetadataFromDashboard/getAvaPageMetadataFromDashboard";

const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111" as Dashboard.Id;
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222" as Workspace.Id;
const SNAPSHOT_REVISION = "33333333-3333-4333-8333-333333333333";

function _makeDashboard(
  visibility: Dashboard.Visibility,
): Parameters<typeof getAvaPageMetadataFromDashboard>[0]["dashboard"] {
  // The metadata resolver reads only the dashboard identity, workspace, and
  // visibility. Keeping this fixture focused makes those routing inputs clear.
  return {
    id: DASHBOARD_ID,
    snapshotRevision: SNAPSHOT_REVISION,
    updatedAt: "2026-08-14T01:00:00.000Z",
    workspaceId: WORKSPACE_ID,
    visibility,
  };
}

describe("getAvaPageMetadataFromDashboard", () => {
  it("always reads live workspace data in the editor", () => {
    (["draft", "workspace", "public"] as const).forEach((visibility) => {
      expect(
        getAvaPageMetadataFromDashboard({
          dashboard: _makeDashboard(visibility),
          surface: "editor",
        }),
      ).toEqual({
        auth: "workspace",
        workspaceId: "22222222-2222-4222-8222-222222222222",
        dashboardId: "11111111-1111-4111-8111-111111111111",
      });
    });
  });

  it("reads the private snapshot for a workspace-published dashboard", () => {
    expect(
      getAvaPageMetadataFromDashboard({
        dashboard: _makeDashboard("workspace"),
        surface: "published",
      }),
    ).toEqual({
      auth: "workspace_published",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      dashboardId: "11111111-1111-4111-8111-111111111111",
      snapshotRevision: SNAPSHOT_REVISION,
    });
  });

  it("reads the public snapshot for a public dashboard", () => {
    expect(
      getAvaPageMetadataFromDashboard({
        dashboard: _makeDashboard("public"),
        surface: "published",
      }),
    ).toEqual({
      auth: "public",
      workspaceId: undefined,
      dashboardId: "11111111-1111-4111-8111-111111111111",
      snapshotRevision: SNAPSHOT_REVISION,
    });
  });

  it("falls back to live data when previewing a draft", () => {
    expect(
      getAvaPageMetadataFromDashboard({
        dashboard: _makeDashboard("draft"),
        surface: "preview",
      }),
    ).toEqual({
      auth: "workspace",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      dashboardId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("shows what a viewer sees when previewing a published dashboard", () => {
    expect(
      getAvaPageMetadataFromDashboard({
        dashboard: _makeDashboard("workspace"),
        surface: "preview",
      }),
    ).toEqual({
      auth: "workspace_published",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      dashboardId: "11111111-1111-4111-8111-111111111111",
      snapshotRevision: SNAPSHOT_REVISION,
    });
  });

  it("rejects published metadata without a committed snapshot pointer", () => {
    expect(() => {
      getAvaPageMetadataFromDashboard({
        dashboard: {
          ..._makeDashboard("public"),
          snapshotRevision: undefined,
        },
        surface: "published",
      });
    }).toThrow("snapshotRevision");
  });
});
