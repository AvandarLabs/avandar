/** Route-adapter coverage for dashboard preview edit access. */
import { Model } from "@avandar/models";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

const {
  canAccessResourceMock,
  freshCanAccessResourceMock,
  getByIdMock,
  userClientWithCacheMock,
  userClientWithFetchQueryMock,
} = vi.hoisted(() => {
  return {
    canAccessResourceMock: vi.fn(),
    freshCanAccessResourceMock: vi.fn(),
    getByIdMock: vi.fn(),
    userClientWithCacheMock: vi.fn(),
    userClientWithFetchQueryMock: vi.fn(),
  };
});

vi.mock("@/clients/dashboards/DashboardClient", () => {
  return { DashboardClient: { getById: getByIdMock } };
});

vi.mock("@/clients/UserClient", () => {
  return {
    UserClient: {
      canAccessResource: freshCanAccessResourceMock,
      withCache: userClientWithCacheMock,
    },
  };
});

const { Route } = await import("./$dashboardId");

type LoaderArgs = {
  context: { queryClient: QueryClient };
  params: { dashboardId: string; workspaceSlug: string };
};
type Loader = (
  args: LoaderArgs,
) => Promise<{ canEdit: boolean; dashboard: Dashboard.T }>;

const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111" as Dashboard.Id;
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222" as Workspace.Id;

function _createDashboard(): Dashboard.T {
  const now = new Date().toISOString();
  return Model.make("Dashboard", {
    id: DASHBOARD_ID,
    config: { root: { props: {} }, content: [] },
    createdAt: now,
    description: undefined,
    isPublic: false,
    isRestricted: true,
    name: "Dashboard preview route",
    ownerId: "33333333-3333-4333-8333-333333333333" as User.Id,
    ownerProfileId: "44444444-4444-4444-8444-444444444444" as UserProfile.Id,
    slug: "dashboard-preview-route",
    updatedAt: now,
    visibility: "draft",
    workspaceId: WORKSPACE_ID,
  });
}

function _getLoader(): Loader {
  if (Route.options.loader === undefined) {
    throw new Error("The dashboard preview route must define a loader.");
  }

  return Route.options.loader as Loader;
}

function _createLoaderArgs(): LoaderArgs {
  return {
    context: { queryClient: new QueryClient() },
    params: { dashboardId: DASHBOARD_ID, workspaceSlug: "acme" },
  };
}

beforeEach(() => {
  getByIdMock.mockResolvedValue(_createDashboard());
  userClientWithCacheMock.mockReturnValue({
    withFetchQuery: userClientWithFetchQueryMock,
  });
  userClientWithFetchQueryMock.mockReturnValue({
    canAccessResource: canAccessResourceMock,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("/$workspaceSlug/dashboards/preview/$dashboardId", () => {
  it("provides viewer edit access to the preview component", async () => {
    const dashboard = _createDashboard();
    getByIdMock.mockResolvedValue(dashboard);
    canAccessResourceMock.mockResolvedValue(false);
    freshCanAccessResourceMock.mockResolvedValue(false);

    await expect(_getLoader()(_createLoaderArgs())).resolves.toEqual({
      canEdit: false,
      dashboard,
    });
    expect(freshCanAccessResourceMock).toHaveBeenCalledWith({
      resourceId: DASHBOARD_ID,
      resourceType: "dashboard",
      minRole: "editor",
    });
  });

  it("checks current preview edit access without reusing a cached permission", async () => {
    const dashboard = _createDashboard();
    getByIdMock.mockResolvedValue(dashboard);
    canAccessResourceMock.mockResolvedValue(true);
    freshCanAccessResourceMock.mockResolvedValue(false);

    await expect(_getLoader()(_createLoaderArgs())).resolves.toEqual({
      canEdit: false,
      dashboard,
    });
    expect(freshCanAccessResourceMock).toHaveBeenCalledWith({
      resourceId: DASHBOARD_ID,
      resourceType: "dashboard",
      minRole: "editor",
    });
    expect(userClientWithCacheMock).not.toHaveBeenCalled();
  });
});
