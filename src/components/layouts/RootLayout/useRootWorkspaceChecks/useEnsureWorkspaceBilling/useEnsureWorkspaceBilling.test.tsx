import { Model } from "@avandar/models";
import { sleep } from "@avandar/utils";
import { modals } from "@mantine/modals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIClient } from "@/clients/APIClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { useEnsureWorkspaceBilling } from "@/components/layouts/RootLayout/useRootWorkspaceChecks/useEnsureWorkspaceBilling/useEnsureWorkspaceBilling";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { act, renderHook, waitFor } from "@/test-utils";
import type { Subscription } from "$/models/Subscription/Subscription";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";

vi.mock("@/clients/APIClient", () => {
  return { APIClient: { get: vi.fn() } };
});
vi.mock("@/hooks/users/useCurrentUser", () => {
  return { useCurrentUser: vi.fn() };
});
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return { useCurrentWorkspace: vi.fn() };
});
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useMatchRoute: () => {
      return () => {
        return false;
      };
    },
  };
});
vi.mock("@mantine/modals", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/modals")>();
  return {
    ...actual,
    modals: {
      ...actual.modals,
      open: vi.fn(() => {
        return "billing-modal";
      }),
      close: vi.fn(),
    },
  };
});

const USER_ID = "11111111-1111-4111-8111-111111111111" as User.Id;
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222" as Workspace.Id;

/** How long the simulated workspace refetch takes after invalidation. */
const WORKSPACE_REFETCH_MS = 20;

const ACTIVE_SUBSCRIPTION = Model.make("Subscription", {
  id: "33333333-3333-4333-8333-333333333333" as Subscription.Id,
  workspaceId: WORKSPACE_ID,
  subscriptionOwnerId: USER_ID,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  polarSubscriptionId: undefined,
  polarProductId: undefined,
  polarCustomerEmail: undefined,
  polarCustomerId: undefined,
  featurePlanType: "premium",
  subscriptionStatus: "active",
  maxSeatsAllowed: 1,
  maxDatasetsAllowed: 100,
  maxDashboardsAllowed: undefined,
  maxShareableDashboardsAllowed: undefined,
  startedAt: new Date("2026-01-01T00:00:00.000Z"),
  endsAt: undefined,
  endedAt: undefined,
  currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
  currentPeriodEnd: undefined,
});

function _makeWorkspace(
  subscription: Subscription.T | undefined,
): Workspace.WithSubscription {
  return Model.make("Workspace", {
    id: WORKSPACE_ID,
    ownerId: USER_ID,
    name: "Acme",
    slug: "acme",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    subscription,
  });
}

let queryClient: QueryClient;

function _renderBillingCheck(): void {
  renderHook(
    () => {
      useEnsureWorkspaceBilling();
    },
    {
      wrapper: ({ children }) => {
        return createElement(
          QueryClientProvider,
          { client: queryClient },
          children,
        );
      },
    },
  );
}

/** Lets pending query updates, renders, and queued microtasks settle. */
async function _settle(): Promise<void> {
  await act(async () => {
    await sleep(0);
  });
}

/**
 * Makes a sync that stays in flight until the test resolves it with the
 * subscriptions it found.
 */
function _mockPendingSync(): (subscriptions: unknown[]) => void {
  let resolveSync: (value: { subscriptions: unknown[] }) => void = () => {};
  // `vi.mocked` types the generic `APIClient.get` as returning
  // `Promise<never>`, so no typed promise fits without this cast.
  vi.mocked(APIClient.get).mockReturnValue(
    new Promise((resolve) => {
      resolveSync = resolve;
    }) as never,
  );
  return (subscriptions) => {
    resolveSync({ subscriptions });
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Keep results fresh indefinitely, as the app's query client does for
  // several minutes, so a cached sync result is never refetched on its own.
  queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  vi.mocked(useCurrentUser).mockReturnValue(
    Model.make("User", {
      id: USER_ID,
      aud: "authenticated",
      app_metadata: {},
      user_metadata: {},
      created_at: "2026-01-01T00:00:00.000Z",
      email: "owner@example.com",
    }),
  );
  vi.mocked(useCurrentWorkspace).mockReturnValue(_makeWorkspace(undefined));
});

describe("useEnsureWorkspaceBilling", () => {
  it("syncs only the current workspace's subscription for a workspace without a plan", async () => {
    _mockPendingSync();

    _renderBillingCheck();

    await waitFor(() => {
      expect(APIClient.get).toHaveBeenCalledWith({
        route: "subscriptions/fetch-and-sync",
        queryParams: { userId: USER_ID, workspaceId: WORKSPACE_ID },
      });
    });
  });

  it("keeps the plan picker closed when the sync recovers this workspace's plan", async () => {
    // `vi.mocked` types the generic `APIClient.get` as resolving to `never`,
    // so the sync response needs this cast.
    vi.mocked(APIClient.get).mockResolvedValue({
      subscriptions: [{ workspace_id: WORKSPACE_ID }],
    } as never);
    // Only invalidating the workspace queries refetches the workspace, and
    // that refetch lands later, carrying the recovered subscription.
    vi.spyOn(queryClient, "invalidateQueries").mockImplementation(
      async (filters) => {
        await sleep(WORKSPACE_REFETCH_MS);
        if (
          filters?.queryKey?.length === 1 &&
          filters.queryKey[0] === WorkspaceClient.getClientName()
        ) {
          vi.mocked(useCurrentWorkspace).mockReturnValue(
            _makeWorkspace(ACTIVE_SUBSCRIPTION),
          );
        }
      },
    );

    _renderBillingCheck();
    await act(async () => {
      await sleep(WORKSPACE_REFETCH_MS * 3);
    });

    expect(modals.open).not.toHaveBeenCalled();
  });

  it("opens the plan picker only after the sync finds no plan", async () => {
    const resolveSync = _mockPendingSync();

    _renderBillingCheck();
    await _settle();
    expect(modals.open).not.toHaveBeenCalled();

    resolveSync([]);
    await waitFor(() => {
      expect(modals.open).toHaveBeenCalledTimes(1);
    });
  });

  it("syncs again before opening the plan picker when a past sync found no plan", async () => {
    queryClient.setQueryData(
      ["subscriptions", "fetch-and-sync", USER_ID, WORKSPACE_ID],
      false,
    );
    const resolveSync = _mockPendingSync();

    _renderBillingCheck();
    await _settle();
    expect(modals.open).not.toHaveBeenCalled();

    resolveSync([]);
    await waitFor(() => {
      expect(modals.open).toHaveBeenCalledTimes(1);
    });
  });

  it("opens the plan picker when the sync fails", async () => {
    vi.mocked(APIClient.get).mockRejectedValue(new Error("Polar is down"));

    _renderBillingCheck();

    await waitFor(() => {
      expect(modals.open).toHaveBeenCalledTimes(1);
    });
  });

  it("neither syncs nor opens the plan picker for an active plan", async () => {
    vi.mocked(useCurrentWorkspace).mockReturnValue(
      _makeWorkspace(ACTIVE_SUBSCRIPTION),
    );

    _renderBillingCheck();
    await _settle();

    expect(APIClient.get).not.toHaveBeenCalled();
    expect(modals.open).not.toHaveBeenCalled();
  });
});
