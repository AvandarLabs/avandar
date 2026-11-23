import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAgentPageNameLoader } from "./agentPageNameLoader";
import type { Workspace } from "$/models/Workspace/Workspace";

const { dashboardClient, mapClient, conceptClient } = vi.hoisted(() => {
  return {
    dashboardClient: { getById: vi.fn(), getAll: vi.fn() },
    mapClient: { getById: vi.fn() },
    conceptClient: { getById: vi.fn() },
  };
});

vi.mock("@/clients/dashboards/DashboardClient/DashboardClient", () => {
  return { DashboardClient: dashboardClient };
});
vi.mock("@/clients/maps/AvaMapClient/AvaMapClient", () => {
  return { AvaMapClient: mapClient };
});
vi.mock("@/clients/ontology/ConceptClient", () => {
  return { ConceptClient: conceptClient };
});

const WORKSPACE_ID = "ws-here" as Workspace.Id;
const OTHER_WORKSPACE_ID = "ws-elsewhere";
const DASHBOARD_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";

function _dashboardRow(workspaceId: string) {
  return {
    id: DASHBOARD_ID,
    name: "Measles",
    config: { content: [] },
    workspaceId,
  };
}

describe("createAgentPageNameLoader", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns a dashboard from this workspace by id", async () => {
    dashboardClient.getById.mockResolvedValue(_dashboardRow(WORKSPACE_ID));

    const dashboard =
      await createAgentPageNameLoader(WORKSPACE_ID).getDashboard(DASHBOARD_ID);

    expect(dashboard).toEqual({
      id: DASHBOARD_ID,
      name: "Measles",
      config: { content: [] },
    });
  });

  it("treats a dashboard from another workspace as missing", async () => {
    dashboardClient.getById.mockResolvedValue(
      _dashboardRow(OTHER_WORKSPACE_ID),
    );

    const loader = createAgentPageNameLoader(WORKSPACE_ID);

    await expect(loader.getDashboard(DASHBOARD_ID)).resolves.toBeUndefined();
  });

  it("finds a dashboard by slug inside this workspace", async () => {
    dashboardClient.getAll.mockResolvedValue([_dashboardRow(WORKSPACE_ID)]);

    const dashboard =
      await createAgentPageNameLoader(WORKSPACE_ID).getDashboard(
        "measles-2026",
      );

    expect(dashboardClient.getAll).toHaveBeenCalledWith({
      where: {
        slug: { eq: "measles-2026" },
        visibility: { eq: "workspace" },
        workspace_id: { eq: WORKSPACE_ID },
      },
    });
    expect(dashboardClient.getById).not.toHaveBeenCalled();
    expect(dashboard?.id).toBe(DASHBOARD_ID);
  });

  it("treats a slug match from another workspace as missing", async () => {
    dashboardClient.getAll.mockResolvedValue([
      _dashboardRow(OTHER_WORKSPACE_ID),
    ]);

    const loader = createAgentPageNameLoader(WORKSPACE_ID);

    await expect(loader.getDashboard("measles-2026")).resolves.toBeUndefined();
  });

  it("names a map only from this workspace", async () => {
    const loader = createAgentPageNameLoader(WORKSPACE_ID);

    mapClient.getById.mockResolvedValue({
      name: "Here",
      workspaceId: WORKSPACE_ID,
    });
    await expect(loader.getMapName("map-id")).resolves.toBe("Here");

    mapClient.getById.mockResolvedValue({
      name: "There",
      workspaceId: OTHER_WORKSPACE_ID,
    });
    await expect(loader.getMapName("map-id")).resolves.toBeUndefined();
  });

  it("names a case type only from this workspace", async () => {
    const loader = createAgentPageNameLoader(WORKSPACE_ID);

    conceptClient.getById.mockResolvedValue({
      name: "Measles case",
      workspaceId: WORKSPACE_ID,
    });
    await expect(loader.getCaseTypeName("concept-id")).resolves.toBe(
      "Measles case",
    );

    conceptClient.getById.mockResolvedValue({
      name: "Other",
      workspaceId: OTHER_WORKSPACE_ID,
    });
    await expect(loader.getCaseTypeName("concept-id")).resolves.toBeUndefined();
  });
});
