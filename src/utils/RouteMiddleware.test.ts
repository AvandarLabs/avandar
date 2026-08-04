import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$/env/getSupabaseApiUrl.ts", () => {
  return {
    getSupabaseApiUrl: () => {
      return "http://test.local";
    },
  };
});

vi.mock("$/env/getSupabaseApiKey.ts", () => {
  return {
    getSupabaseApiKey: () => {
      return "test-anon-key";
    },
  };
});

const {
  getWorkspacesOfCurrentUserMock,
  getCurrentSessionMock,
  getUserAppRolesMock,
  canAccessResourceMock,
} = vi.hoisted(() => {
  return {
    getWorkspacesOfCurrentUserMock: vi.fn(),
    getCurrentSessionMock: vi.fn(),
    getUserAppRolesMock: vi.fn(),
    canAccessResourceMock: vi.fn(),
  };
});

vi.mock("@/clients/WorkspaceClient", () => {
  return {
    WorkspaceClient: {
      withCache: () => {
        return {
          withFetchQuery: () => {
            return {
              getWorkspacesOfCurrentUser: getWorkspacesOfCurrentUserMock,
            };
          },
        };
      },
    },
  };
});

vi.mock("@/clients/AuthClient/AuthClient", () => {
  return {
    AuthClient: {
      getCurrentSession: getCurrentSessionMock,
    },
  };
});

vi.mock("@/clients/UserClient", () => {
  return {
    UserClient: {
      withCache: () => {
        return {
          withFetchQuery: () => {
            return {
              getUserAppRoles: getUserAppRolesMock,
              canAccessResource: canAccessResourceMock,
            };
          },
        };
      },
    },
  };
});

const { RouteMiddleware } = await import("./RouteMiddleware");

const WORKSPACE = { id: "ws-1", slug: "acme" };
const SIGNED_IN_SESSION = { user: { id: "user-1" } };

const defaultLoadContext = {
  context: { queryClient: {} as never },
  params: { workspaceSlug: "acme", datasetId: "ds-1" },
};

describe("RouteMiddleware.checkUserPermissions", () => {
  beforeEach(() => {
    getWorkspacesOfCurrentUserMock.mockReset();
    getCurrentSessionMock.mockReset();
    getUserAppRolesMock.mockReset();
    canAccessResourceMock.mockReset();
  });

  it("returns normally when the parent app permission key matches", async () => {
    getWorkspacesOfCurrentUserMock.mockResolvedValue([WORKSPACE]);
    getCurrentSessionMock.mockResolvedValue(SIGNED_IN_SESSION);
    getUserAppRolesMock.mockResolvedValue({
      data_sources: "viewer",
    });
    canAccessResourceMock.mockResolvedValue(false);

    const guard = RouteMiddleware.BeforeLoad.checkUserPermissions({
      permissionKey: "data_sources__can_list_sources",
      appLabel: "Data Sources",
    });
    await expect(guard(defaultLoadContext)).resolves.toBeUndefined();
    expect(canAccessResourceMock).not.toHaveBeenCalled();
  });

  it("falls back to canAccessResource when the parent app permission is missing and the fallback grants access", async () => {
    getWorkspacesOfCurrentUserMock.mockResolvedValue([WORKSPACE]);
    getCurrentSessionMock.mockResolvedValue(SIGNED_IN_SESSION);
    getUserAppRolesMock.mockResolvedValue({});
    canAccessResourceMock.mockResolvedValue(true);

    const guard = RouteMiddleware.BeforeLoad.checkUserPermissions({
      permissionKey: "data_sources__can_list_sources",
      appLabel: "Data Sources",
      resourceFallback: {
        type: "dataset",
        idParam: "datasetId",
        minRole: "viewer",
      },
    });
    await expect(guard(defaultLoadContext)).resolves.toBeUndefined();
    expect(canAccessResourceMock).toHaveBeenCalledWith({
      resourceType: "dataset",
      resourceId: "ds-1",
      minRole: "viewer",
    });
  });

  it("redirects to access-denied when both parent and fallback miss", async () => {
    getWorkspacesOfCurrentUserMock.mockResolvedValue([WORKSPACE]);
    getCurrentSessionMock.mockResolvedValue(SIGNED_IN_SESSION);
    getUserAppRolesMock.mockResolvedValue({});
    canAccessResourceMock.mockResolvedValue(false);

    const guard = RouteMiddleware.BeforeLoad.checkUserPermissions({
      permissionKey: "data_sources__can_list_sources",
      appLabel: "Data Sources",
      resourceFallback: {
        type: "dataset",
        idParam: "datasetId",
        minRole: "viewer",
      },
    });

    await expect(guard(defaultLoadContext)).rejects.toMatchObject({
      options: {
        to: "/$workspaceSlug/access-denied",
        params: { workspaceSlug: "acme" },
        search: { app: "Data Sources" },
      },
    });
  });

  it("does not call canAccessResource when the route has no resource id param", async () => {
    getWorkspacesOfCurrentUserMock.mockResolvedValue([WORKSPACE]);
    getCurrentSessionMock.mockResolvedValue(SIGNED_IN_SESSION);
    getUserAppRolesMock.mockResolvedValue({});
    canAccessResourceMock.mockResolvedValue(true);

    const guard = RouteMiddleware.BeforeLoad.checkUserPermissions({
      permissionKey: "data_sources__can_list_sources",
      appLabel: "Data Sources",
      resourceFallback: {
        type: "dataset",
        idParam: "datasetId",
        minRole: "viewer",
      },
    });

    await expect(
      guard({
        context: { queryClient: {} as never },
        params: { workspaceSlug: "acme" },
      }),
    ).rejects.toMatchObject({
      options: { to: "/$workspaceSlug/access-denied" },
    });
    expect(canAccessResourceMock).not.toHaveBeenCalled();
  });
});
