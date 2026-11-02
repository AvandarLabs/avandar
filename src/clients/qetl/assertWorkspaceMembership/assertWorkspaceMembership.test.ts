/** Tests principal-level workspace authorization for the QETL query path. */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertWorkspaceMembership } from "@/clients/qetl/assertWorkspaceMembership/assertWorkspaceMembership";
import { WorkspaceMembershipDenied } from "@/clients/qetl/assertWorkspaceMembership/WorkspaceMembershipDenied";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import type { UserId } from "$/models/User/User.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { QueryClient } from "@tanstack/react-query";

const USER_ID = "66666666-6666-4666-8666-666666666666" as UserId;
const OTHER_USER_ID = "77777777-7777-4777-8777-777777777777" as UserId;
const MEMBER_WORKSPACE_ID =
  "55555555-5555-4555-8555-555555555555" as Workspace.Id;
const FOREIGN_WORKSPACE_ID =
  "44444444-4444-4444-8444-444444444444" as Workspace.Id;

const WORKSPACES_QUERY_KEY = ["Workspace", "getWorkspacesOfCurrentUser"];

const { fetchWorkspacesMock, getCurrentSessionMock } = vi.hoisted(() => {
  return {
    fetchWorkspacesMock: vi.fn(),
    getCurrentSessionMock: vi.fn(),
  };
});

// The assertion's behavior now depends on the query client's own policy (a
// fresh entry answers without a fetch, an offline one never refetches), so the
// stand-in mirrors the `staleTime` and `networkMode` that ship in
// `src/config/AvaQueryClient.ts` instead of React Query's defaults. They are
// replicated rather than imported because importing the real module pulls in
// the whole `ServerApiClient` graph. `retry` is deliberately not mirrored:
// these tests count `queryFn` calls, and a retry would double them.
vi.mock("@/config/AvaQueryClient", async () => {
  const { QueryClient: TanstackQueryClient } =
    await import("@tanstack/react-query");
  const { getIsOnline } = await import("@avandar/browser-utils");
  return {
    AvaQueryClient: new TanstackQueryClient({
      defaultOptions: {
        queries: {
          staleTime: () => {
            return getIsOnline() ? 6 * 60 * 1000 : Number.POSITIVE_INFINITY;
          },
          networkMode: "offlineFirst",
          retry: false,
        },
      },
    }),
  };
});

// Mirrors the real `withQueryHooks` wiring: `withFetchQuery()` runs the client
// function through `queryClient.fetchQuery` under the same key `QueryKeys`
// builds, so a fetch populates the same entry a later call reads.
vi.mock("@/clients/WorkspaceClient", () => {
  return {
    WorkspaceClient: {
      QueryKeys: {
        getWorkspacesOfCurrentUser: () => {
          return WORKSPACES_QUERY_KEY;
        },
      },
      withCache: (queryClient: QueryClient) => {
        return {
          withFetchQuery: () => {
            return {
              getWorkspacesOfCurrentUser: async () => {
                return await queryClient.fetchQuery({
                  queryKey: WORKSPACES_QUERY_KEY,
                  queryFn: fetchWorkspacesMock,
                });
              },
            };
          },
        };
      },
    },
  };
});

vi.mock("@/clients/AuthClient/AuthClient", () => {
  return { AuthClient: { getCurrentSession: getCurrentSessionMock } };
});

function makeWorkspaceList(
  workspaceIds: readonly Workspace.Id[],
): Array<{ id: Workspace.Id }> {
  return workspaceIds.map((id) => {
    return { id };
  });
}

async function getThrownError(promise: Promise<unknown>): Promise<unknown> {
  return await promise.then(
    () => {
      return undefined;
    },
    (error: unknown) => {
      return error;
    },
  );
}

async function getDenialCode(promise: Promise<unknown>): Promise<unknown> {
  const error = await getThrownError(promise);
  expect(error).toBeInstanceOf(WorkspaceMembershipDenied);
  return (error as WorkspaceMembershipDenied).code;
}

beforeEach(() => {
  vi.clearAllMocks();
  AvaQueryClient.clear();
  getCurrentSessionMock.mockResolvedValue({ user: { id: USER_ID } });
  fetchWorkspacesMock.mockResolvedValue(
    makeWorkspaceList([MEMBER_WORKSPACE_ID]),
  );
});

describe("assertWorkspaceMembership", () => {
  it("rejects a user who is not a member of the workspace", async () => {
    AvaQueryClient.setQueryData(
      WORKSPACES_QUERY_KEY,
      makeWorkspaceList([MEMBER_WORKSPACE_ID]),
    );

    await expect(
      getDenialCode(
        assertWorkspaceMembership({
          workspaceId: FOREIGN_WORKSPACE_ID,
          userId: USER_ID,
        }),
      ),
    ).resolves.toBe("not-a-member");
  });

  it("allows a member of the workspace through", async () => {
    AvaQueryClient.setQueryData(
      WORKSPACES_QUERY_KEY,
      makeWorkspaceList([FOREIGN_WORKSPACE_ID, MEMBER_WORKSPACE_ID]),
    );

    await expect(
      assertWorkspaceMembership({
        workspaceId: MEMBER_WORKSPACE_ID,
        userId: USER_ID,
      }),
    ).resolves.toBe(USER_ID);
  });

  it("returns the authenticated user when no principal is named", async () => {
    AvaQueryClient.setQueryData(
      WORKSPACES_QUERY_KEY,
      makeWorkspaceList([MEMBER_WORKSPACE_ID]),
    );

    await expect(
      assertWorkspaceMembership({ workspaceId: MEMBER_WORKSPACE_ID }),
    ).resolves.toBe(USER_ID);
  });

  it("names the workspace but never the user in the denial message", async () => {
    AvaQueryClient.setQueryData(WORKSPACES_QUERY_KEY, makeWorkspaceList([]));

    const error = await getThrownError(
      assertWorkspaceMembership({
        workspaceId: FOREIGN_WORKSPACE_ID,
        userId: USER_ID,
      }),
    );

    expect(error).toBeInstanceOf(WorkspaceMembershipDenied);
    expect((error as Error).message).toContain(FOREIGN_WORKSPACE_ID);
    expect((error as Error).message).not.toContain(USER_ID);
  });

  it("reads a fresh cache entry without fetching", async () => {
    AvaQueryClient.setQueryData(
      WORKSPACES_QUERY_KEY,
      makeWorkspaceList([MEMBER_WORKSPACE_ID]),
    );

    await assertWorkspaceMembership({
      workspaceId: MEMBER_WORKSPACE_ID,
      userId: USER_ID,
    });

    expect(fetchWorkspacesMock).not.toHaveBeenCalled();
  });

  it("refetches once the cached membership list is invalidated", async () => {
    // Sign-in invalidates this key, which is how a membership change reaches
    // the assertion. A cached list must not outlive that invalidation.
    AvaQueryClient.setQueryData(
      WORKSPACES_QUERY_KEY,
      makeWorkspaceList([MEMBER_WORKSPACE_ID]),
    );
    await AvaQueryClient.invalidateQueries({
      queryKey: WORKSPACES_QUERY_KEY,
      refetchType: "none",
    });
    fetchWorkspacesMock.mockResolvedValue(makeWorkspaceList([]));

    await expect(
      getDenialCode(
        assertWorkspaceMembership({
          workspaceId: MEMBER_WORKSPACE_ID,
          userId: USER_ID,
        }),
      ),
    ).resolves.toBe("not-a-member");
    expect(fetchWorkspacesMock).toHaveBeenCalledTimes(1);
  });

  it("still denies a non-member when the fresh cache entry is an empty list", async () => {
    // An empty cached list is a real answer, not a cache miss, so it is
    // trusted rather than refetched.
    AvaQueryClient.setQueryData(WORKSPACES_QUERY_KEY, makeWorkspaceList([]));

    await expect(
      getDenialCode(
        assertWorkspaceMembership({
          workspaceId: MEMBER_WORKSPACE_ID,
          userId: USER_ID,
        }),
      ),
    ).resolves.toBe("not-a-member");
    expect(fetchWorkspacesMock).not.toHaveBeenCalled();
  });

  it("fetches on a cold cache and admits a member", async () => {
    fetchWorkspacesMock.mockResolvedValue(
      makeWorkspaceList([MEMBER_WORKSPACE_ID]),
    );

    await expect(
      assertWorkspaceMembership({
        workspaceId: MEMBER_WORKSPACE_ID,
        userId: USER_ID,
      }),
    ).resolves.toBe(USER_ID);
    expect(fetchWorkspacesMock).toHaveBeenCalledTimes(1);
  });

  it("fetches on a cold cache and rejects a non-member", async () => {
    fetchWorkspacesMock.mockResolvedValue(
      makeWorkspaceList([MEMBER_WORKSPACE_ID]),
    );

    await expect(
      getDenialCode(
        assertWorkspaceMembership({
          workspaceId: FOREIGN_WORKSPACE_ID,
          userId: USER_ID,
        }),
      ),
    ).resolves.toBe("not-a-member");
    expect(fetchWorkspacesMock).toHaveBeenCalledTimes(1);
  });

  it("pays the cold-cache fetch at most once across sequential callers", async () => {
    fetchWorkspacesMock.mockResolvedValue(
      makeWorkspaceList([MEMBER_WORKSPACE_ID]),
    );

    await assertWorkspaceMembership({
      workspaceId: MEMBER_WORKSPACE_ID,
      userId: USER_ID,
    });
    await assertWorkspaceMembership({
      workspaceId: MEMBER_WORKSPACE_ID,
      userId: USER_ID,
    });

    expect(fetchWorkspacesMock).toHaveBeenCalledTimes(1);
  });

  it("pays the cold-cache fetch at most once across concurrent callers", async () => {
    // The query path calls this from `Promise.all`-shaped work, so concurrent
    // callers on a cold cache must share one in-flight fetch.
    fetchWorkspacesMock.mockResolvedValue(
      makeWorkspaceList([MEMBER_WORKSPACE_ID]),
    );

    await expect(
      Promise.all([
        assertWorkspaceMembership({
          workspaceId: MEMBER_WORKSPACE_ID,
          userId: USER_ID,
        }),
        assertWorkspaceMembership({
          workspaceId: MEMBER_WORKSPACE_ID,
          userId: USER_ID,
        }),
        assertWorkspaceMembership({
          workspaceId: MEMBER_WORKSPACE_ID,
          userId: USER_ID,
        }),
      ]),
    ).resolves.toEqual([USER_ID, USER_ID, USER_ID]);

    expect(fetchWorkspacesMock).toHaveBeenCalledTimes(1);
  });

  it("denies with the fetch failure when the cache is cold and offline", async () => {
    fetchWorkspacesMock.mockRejectedValue(new Error("Network request failed"));

    // Offline is still a denial, but it stays distinguishable from a refusal
    // of membership so a caller can tell the two apart.
    const error = await getThrownError(
      assertWorkspaceMembership({
        workspaceId: MEMBER_WORKSPACE_ID,
        userId: USER_ID,
      }),
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(WorkspaceMembershipDenied);
    expect((error as Error).message).toBe("Network request failed");
  });

  it("rejects a principal that is not the authenticated user", async () => {
    AvaQueryClient.setQueryData(
      WORKSPACES_QUERY_KEY,
      makeWorkspaceList([MEMBER_WORKSPACE_ID]),
    );

    await expect(
      getDenialCode(
        assertWorkspaceMembership({
          workspaceId: MEMBER_WORKSPACE_ID,
          userId: OTHER_USER_ID,
        }),
      ),
    ).resolves.toBe("principal-mismatch");
  });

  it("rejects when there is no session at all", async () => {
    getCurrentSessionMock.mockResolvedValue(undefined);
    AvaQueryClient.setQueryData(
      WORKSPACES_QUERY_KEY,
      makeWorkspaceList([MEMBER_WORKSPACE_ID]),
    );

    await expect(
      getDenialCode(
        assertWorkspaceMembership({
          workspaceId: MEMBER_WORKSPACE_ID,
          userId: USER_ID,
        }),
      ),
    ).resolves.toBe("not-authenticated");
  });

  it("rejects an undefined principal with no session instead of comparing them", async () => {
    // `UserId` is only a compile-time brand, so a caller can pass `undefined`
    // at runtime. With no session both sides would be `undefined`, and a bare
    // equality check would admit the caller against a list left in the cache
    // by whoever was signed in before.
    getCurrentSessionMock.mockResolvedValue(undefined);
    AvaQueryClient.setQueryData(
      WORKSPACES_QUERY_KEY,
      makeWorkspaceList([MEMBER_WORKSPACE_ID]),
    );

    await expect(
      getDenialCode(
        assertWorkspaceMembership({
          workspaceId: MEMBER_WORKSPACE_ID,
          userId: undefined,
        }),
      ),
    ).resolves.toBe("not-authenticated");
  });

  it("rejects a session that carries no user id", async () => {
    getCurrentSessionMock.mockResolvedValue({ user: undefined });
    AvaQueryClient.setQueryData(
      WORKSPACES_QUERY_KEY,
      makeWorkspaceList([MEMBER_WORKSPACE_ID]),
    );

    await expect(
      getDenialCode(
        assertWorkspaceMembership({ workspaceId: MEMBER_WORKSPACE_ID }),
      ),
    ).resolves.toBe("not-authenticated");
  });
});
