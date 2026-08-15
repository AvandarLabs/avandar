/** Route-adapter coverage for dashboard editor access. */
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  canAccessResourceMock,
  freshCanAccessResourceMock,
  userClientWithCacheMock,
  userClientWithFetchQueryMock,
} = vi.hoisted(() => {
  return {
    canAccessResourceMock: vi.fn(),
    freshCanAccessResourceMock: vi.fn(),
    userClientWithCacheMock: vi.fn(),
    userClientWithFetchQueryMock: vi.fn(),
  };
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

type BeforeLoadArgs = {
  context: { queryClient: QueryClient };
  params: { dashboardId: string; workspaceSlug: string };
};
type BeforeLoad = (args: BeforeLoadArgs) => Promise<void>;

const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_SLUG = "acme";

function _getBeforeLoad(): BeforeLoad {
  if (Route.options.beforeLoad === undefined) {
    throw new Error("The dashboard editor route must define beforeLoad.");
  }

  return Route.options.beforeLoad as BeforeLoad;
}

function _createBeforeLoadArgs(): BeforeLoadArgs {
  return {
    context: { queryClient: new QueryClient() },
    params: { dashboardId: DASHBOARD_ID, workspaceSlug: WORKSPACE_SLUG },
  };
}

beforeEach(() => {
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

describe("/$workspaceSlug/dashboards/edit/$dashboardId", () => {
  it("redirects a viewer-role user to the authenticated preview", async () => {
    canAccessResourceMock.mockResolvedValue(false);
    freshCanAccessResourceMock.mockResolvedValue(false);

    await expect(
      _getBeforeLoad()(_createBeforeLoadArgs()),
    ).rejects.toMatchObject({
      options: {
        params: { dashboardId: DASHBOARD_ID, workspaceSlug: WORKSPACE_SLUG },
        replace: true,
        to: "/$workspaceSlug/dashboards/preview/$dashboardId",
      },
    });
    expect(freshCanAccessResourceMock).toHaveBeenCalledWith({
      resourceId: DASHBOARD_ID,
      resourceType: "dashboard",
      minRole: "editor",
    });
  });

  it("keeps an editor-role user on the editor route", async () => {
    canAccessResourceMock.mockResolvedValue(true);
    freshCanAccessResourceMock.mockResolvedValue(true);

    await expect(
      _getBeforeLoad()(_createBeforeLoadArgs()),
    ).resolves.toBeUndefined();
  });

  it("checks current editor access without reusing a cached permission", async () => {
    canAccessResourceMock.mockResolvedValue(true);
    freshCanAccessResourceMock.mockResolvedValue(false);

    await expect(
      _getBeforeLoad()(_createBeforeLoadArgs()),
    ).rejects.toMatchObject({
      options: {
        to: "/$workspaceSlug/dashboards/preview/$dashboardId",
      },
    });
    expect(freshCanAccessResourceMock).toHaveBeenCalledWith({
      resourceId: DASHBOARD_ID,
      resourceType: "dashboard",
      minRole: "editor",
    });
    expect(userClientWithCacheMock).not.toHaveBeenCalled();
  });
});
