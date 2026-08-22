import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Workspace } from "$/models/Workspace/Workspace";

import { afterEach, describe, expect, it, vi } from "vitest";

import { DashboardRouteUtils } from "./DashboardRouteUtils";

const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111" as Dashboard.Id;
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222" as Workspace.Id;

const {
  getByIdMock,
  getAllMock,
  getCurrentSessionMock,
  getFreshViewerWorkspacesMock,
  getViewerWorkspacesMock,
  withCacheMock,
  withFetchQueryMock,
} = vi.hoisted(() => {
  const viewerWorkspacesMock = vi.fn();
  const fetchQueryMock = vi.fn(() => {
    return { getWorkspacesOfCurrentUser: viewerWorkspacesMock };
  });

  return {
    getByIdMock: vi.fn(),
    getAllMock: vi.fn(),
    getCurrentSessionMock: vi.fn(),
    getFreshViewerWorkspacesMock: vi.fn(),
    getViewerWorkspacesMock: viewerWorkspacesMock,
    withCacheMock: vi.fn(() => {
      return { withFetchQuery: fetchQueryMock };
    }),
    withFetchQueryMock: fetchQueryMock,
  };
});

vi.mock("@/clients/AuthClient/AuthClient", () => {
  return { AuthClient: { getCurrentSession: getCurrentSessionMock } };
});

vi.mock("@/clients/dashboards/DashboardClient/DashboardClient", () => {
  return { DashboardClient: { getAll: getAllMock, getById: getByIdMock } };
});

vi.mock("@/clients/WorkspaceClient", () => {
  return {
    WorkspaceClient: {
      getWorkspacesOfCurrentUser: getFreshViewerWorkspacesMock,
      withCache: withCacheMock,
    },
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("DashboardRouteUtils", () => {
  it("binds an ID lookup to the dashboard client", async () => {
    getByIdMock.mockResolvedValue(undefined);

    await DashboardRouteUtils.getById(DASHBOARD_ID);

    expect(getByIdMock).toHaveBeenCalledWith({ id: DASHBOARD_ID });
  });

  it("keeps public slug reads in the public namespace", async () => {
    getAllMock.mockResolvedValue([]);

    await DashboardRouteUtils.findBySlug({ slug: "q3", visibility: "public" });

    expect(getAllMock).toHaveBeenCalledWith({
      where: {
        slug: { eq: "q3" },
        visibility: { eq: "public" },
      },
    });
  });

  it("scopes workspace slug reads to their workspace", async () => {
    getAllMock.mockResolvedValue([]);

    await DashboardRouteUtils.findBySlug({
      slug: "q3",
      visibility: "workspace",
      workspaceId: WORKSPACE_ID,
    });

    expect(getAllMock).toHaveBeenCalledWith({
      where: {
        slug: { eq: "q3" },
        visibility: { eq: "workspace" },
        workspace_id: { eq: WORKSPACE_ID },
      },
    });
  });

  it("uses fresh membership instead of stale route-cache membership", async () => {
    const staleWorkspaces = [{ id: WORKSPACE_ID, slug: "acme" }];
    const freshWorkspaces: Workspace.T[] = [];
    getViewerWorkspacesMock.mockResolvedValue(staleWorkspaces);
    getFreshViewerWorkspacesMock.mockResolvedValue(freshWorkspaces);

    await expect(DashboardRouteUtils.getViewerWorkspaces()).resolves.toEqual(
      freshWorkspaces,
    );

    expect(getFreshViewerWorkspacesMock).toHaveBeenCalledOnce();
    expect(withCacheMock).not.toHaveBeenCalled();
    expect(withFetchQueryMock).not.toHaveBeenCalled();
    expect(getViewerWorkspacesMock).not.toHaveBeenCalled();
  });

  it("derives authentication from the current session user", async () => {
    getCurrentSessionMock.mockResolvedValue({ user: { id: "user-id" } });

    await expect(DashboardRouteUtils.isAuthenticated()).resolves.toBe(true);

    getCurrentSessionMock.mockResolvedValue(undefined);

    await expect(DashboardRouteUtils.isAuthenticated()).resolves.toBe(false);
  });
});
