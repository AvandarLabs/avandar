/** Authorization coverage for the authenticated workspace ancestor route. */
import { Model } from "@avandar/models";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";

const WORKSPACES_QUERY_KEY = [
  "Workspace",
  "getWorkspacesOfCurrentUser",
] as const;

const {
  getCachedViewerWorkspacesMock,
  getFreshViewerWorkspacesMock,
  withCacheMock,
  withFetchQueryMock,
} = vi.hoisted(() => {
  const getCachedWorkspacesMock = vi.fn();
  const fetchQueryMock = vi.fn(() => {
    return { getWorkspacesOfCurrentUser: getCachedWorkspacesMock };
  });

  return {
    getCachedViewerWorkspacesMock: getCachedWorkspacesMock,
    getFreshViewerWorkspacesMock: vi.fn(),
    withCacheMock: vi.fn(() => {
      return { withFetchQuery: fetchQueryMock };
    }),
    withFetchQueryMock: fetchQueryMock,
  };
});

vi.mock("@/clients/WorkspaceClient", () => {
  return {
    WorkspaceClient: {
      getWorkspacesOfCurrentUser: getFreshViewerWorkspacesMock,
      QueryKeys: {
        getWorkspacesOfCurrentUser: () => {
          return WORKSPACES_QUERY_KEY;
        },
      },
      withCache: withCacheMock,
    },
  };
});

vi.mock("@/components/layouts/RootLayout/RootLayout", () => {
  return { RootLayout: vi.fn() };
});

const { Route } = await import("./route");

type LoaderArgs = {
  context: { queryClient: QueryClient };
  params: { workspaceSlug: string };
};
type WorkspaceRouteLoader = (
  args: LoaderArgs,
) => Promise<Workspace.WithSubscription | undefined>;

const WORKSPACE: Workspace.WithSubscription = Model.make("Workspace", {
  id: "22222222-2222-4222-8222-222222222222" as Workspace.Id,
  ownerId: "11111111-1111-4111-8111-111111111111" as User.Id,
  name: "Acme",
  slug: "acme",
  createdAt: "2026-08-14T00:00:00.000Z",
  updatedAt: "2026-08-14T00:00:00.000Z",
  subscription: undefined,
});

function _getLoader(): WorkspaceRouteLoader {
  if (Route.options.loader === undefined) {
    throw new Error("The workspace ancestor route must define a loader.");
  }

  return Route.options.loader as WorkspaceRouteLoader;
}

function _createLoaderArgs(
  queryClient: QueryClient = new QueryClient(),
): LoaderArgs {
  return {
    context: { queryClient },
    params: { workspaceSlug: WORKSPACE.slug },
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("/$workspaceSlug ancestor route", () => {
  it("uses fresh membership when the route cache still misses the workspace", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(WORKSPACES_QUERY_KEY, []);
    getCachedViewerWorkspacesMock.mockResolvedValue([]);
    getFreshViewerWorkspacesMock.mockResolvedValue([WORKSPACE]);

    await expect(_getLoader()(_createLoaderArgs(queryClient))).resolves.toBe(
      WORKSPACE,
    );

    expect(getFreshViewerWorkspacesMock).toHaveBeenCalledOnce();
    expect(queryClient.getQueryData(WORKSPACES_QUERY_KEY)).toEqual([WORKSPACE]);
    expect(withCacheMock).not.toHaveBeenCalled();
    expect(withFetchQueryMock).not.toHaveBeenCalled();
    expect(getCachedViewerWorkspacesMock).not.toHaveBeenCalled();
  });

  it("redirects when fresh membership does not include the workspace", async () => {
    getFreshViewerWorkspacesMock.mockResolvedValue([]);

    await expect(_getLoader()(_createLoaderArgs())).rejects.toMatchObject({
      options: { to: "/invalid-workspace" },
    });
  });
});
