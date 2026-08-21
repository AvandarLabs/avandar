/** Route-adapter coverage for dashboard preview edit access. */
import { Model } from "@avandar/models";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

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

vi.mock("@/clients/dashboards/DashboardClient/DashboardClient", () => {
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

// The viewer tree pulls the whole data-explorer stack in, and none of it is
// what an access test is about. `DashboardAccessDeniedView` stays real: it is
// the thing being asserted.
vi.mock("@/views/DashboardApp/DashboardViewerView/DashboardViewerView", () => {
  return {
    DashboardViewerView: (): ReactNode => {
      return <div data-testid="dashboard-viewer" />;
    },
  };
});

vi.mock(
  "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager",
  () => {
    return {
      DataExplorerStateManager: {
        Provider: ({ children }: { children: ReactNode }): ReactNode => {
          return children;
        },
      },
    };
  },
);

const { Route } = await import("./$dashboardId");

type LoaderArgs = {
  context: { queryClient: QueryClient };
  params: { dashboardId: string; workspaceSlug: string };
};
type Loader = (args: LoaderArgs) => Promise<{
  canEdit: boolean;
  dashboard: Dashboard.T;
  isAccessDenied: boolean;
}>;

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

/** Renders the route's own component with a loader result it would produce. */
function _renderPreviewComponent(
  options: Readonly<{ isAccessDenied: boolean }>,
): void {
  vi.spyOn(Route, "useParams").mockReturnValue({ workspaceSlug: "acme" });
  vi.spyOn(Route, "useLoaderData").mockReturnValue({
    dashboard: _createDashboard(),
    canEdit: !options.isAccessDenied,
    isAccessDenied: options.isAccessDenied,
  });
  const Component = Route.options.component as () => ReactNode;
  render(<Component />);
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
      isAccessDenied: true,
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
      isAccessDenied: true,
    });
    expect(freshCanAccessResourceMock).toHaveBeenCalledWith({
      resourceId: DASHBOARD_ID,
      resourceType: "dashboard",
      minRole: "editor",
    });
    expect(userClientWithCacheMock).not.toHaveBeenCalled();
  });

  it("denies a viewer on a draft dashboard", async () => {
    // `draft` means the owner has not decided it is ready for anyone else.
    // That is the whole product meaning of the state.
    const dashboard = { ..._createDashboard(), visibility: "draft" as const };
    getByIdMock.mockResolvedValue(dashboard);
    freshCanAccessResourceMock.mockResolvedValue(false);

    const data = await _getLoader()(_createLoaderArgs());

    expect(data.isAccessDenied).toBe(true);
  });

  it("admits a viewer once the dashboard is published to the workspace", async () => {
    const dashboard = {
      ..._createDashboard(),
      visibility: "workspace" as const,
    };
    getByIdMock.mockResolvedValue(dashboard);
    freshCanAccessResourceMock.mockResolvedValue(false);

    const data = await _getLoader()(_createLoaderArgs());

    expect(data.isAccessDenied).toBe(false);
  });

  it("admits an editor on a draft, which is the whole point of preview", async () => {
    const dashboard = { ..._createDashboard(), visibility: "draft" as const };
    getByIdMock.mockResolvedValue(dashboard);
    freshCanAccessResourceMock.mockResolvedValue(true);

    const data = await _getLoader()(_createLoaderArgs());

    expect(data.isAccessDenied).toBe(false);
  });

  // The loader only computes the flag. Without these two the early return in
  // the component could be deleted and the suite would stay green while a
  // denied viewer got the dashboard rendered to them anyway.
  it("renders the access-denied view instead of the dashboard when denied", () => {
    _renderPreviewComponent({ isAccessDenied: true });

    expect(screen.getByText("You need access")).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-viewer")).toBeNull();
  });

  it("renders the dashboard when access is allowed", () => {
    _renderPreviewComponent({ isAccessDenied: false });

    expect(screen.getByTestId("dashboard-viewer")).toBeInTheDocument();
    expect(screen.queryByText("You need access")).toBeNull();
  });
});
