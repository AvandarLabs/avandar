import { describe, expect, it, vi } from "vitest";

vi.mock("@sbfn/_shared/MiniServer/MiniServer.ts", () => {
  return {
    GET: () => {
      const handler = {
        action: (action: unknown) => {
          return { state: { action } };
        },
        querySchema: () => {
          return handler;
        },
      };
      return handler;
    },
  };
});

vi.mock("@sbfn/_shared/PolarClient/PolarClient.ts", () => {
  return { PolarClient: { getSubscriptionsByUserId: vi.fn() } };
});

const { FetchAndSyncUserSubscriptions } =
  await import("@sbfn/subscriptions/fetch-and-sync/fetch-and-sync.ts");
const { PolarClient } =
  await import("@sbfn/_shared/PolarClient/PolarClient.ts");

const USER_ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_A_ID = "22222222-2222-4222-8222-222222222222";
const WORKSPACE_B_ID = "33333333-3333-4333-8333-333333333333";

function _makePolarSubscription(workspaceId: string): Record<string, unknown> {
  return {
    id: `polar-subscription-${workspaceId}`,
    product: {
      id: "polar-product-id",
      metadata: { featurePlanType: "premium" },
    },
    metadata: { userId: USER_ID, workspaceId },
    status: "active",
    customer: { id: "polar-customer-id", email: "owner@example.com" },
    seats: 1,
    startedAt: new Date("2026-01-01T00:00:00Z"),
    endsAt: null,
    endedAt: null,
    currentPeriodStart: new Date("2026-01-01T00:00:00Z"),
    currentPeriodEnd: new Date("2027-01-01T00:00:00Z"),
  };
}

/**
 * Creates an admin client over an empty `subscriptions` table that records
 * the workspace of every row inserted into it.
 */
function _createFakeAdminClient(insertedWorkspaceIds: string[]): unknown {
  const emptyLookup = {
    throwOnError: async () => {
      return { data: null };
    },
  };
  const query = {
    select: () => {
      return query;
    },
    eq: () => {
      return query;
    },
    maybeSingle: () => {
      return emptyLookup;
    },
    insert: (row: { workspace_id: string }) => {
      insertedWorkspaceIds.push(row.workspace_id);
      return {
        select: () => {
          return {
            single: () => {
              return {
                throwOnError: async () => {
                  return { data: row };
                },
              };
            },
          };
        },
      };
    },
  };
  return {
    from: () => {
      return query;
    },
  };
}

async function _runFetchAndSync(
  queryParams: Readonly<{ userId: string; workspaceId?: string }>,
): Promise<string[]> {
  const insertedWorkspaceIds: string[] = [];
  // The fake admin client implements only the query chain this action
  // calls, and the user carries only its id.
  await FetchAndSyncUserSubscriptions.state.action({
    queryParams,
    supabaseAdminClient: _createFakeAdminClient(insertedWorkspaceIds),
    user: { id: USER_ID },
  } as Parameters<typeof FetchAndSyncUserSubscriptions.state.action>[0]);
  return insertedWorkspaceIds;
}

describe("FetchAndSyncUserSubscriptions", () => {
  it("writes only the given workspace's subscription", async () => {
    vi.mocked(PolarClient.getSubscriptionsByUserId).mockResolvedValue([
      _makePolarSubscription(WORKSPACE_A_ID),
      _makePolarSubscription(WORKSPACE_B_ID),
    ] as never);

    expect(
      await _runFetchAndSync({ userId: USER_ID, workspaceId: WORKSPACE_A_ID }),
    ).toEqual([WORKSPACE_A_ID]);
  });

  it("writes every workspace's subscription when no workspace is given", async () => {
    vi.mocked(PolarClient.getSubscriptionsByUserId).mockResolvedValue([
      _makePolarSubscription(WORKSPACE_A_ID),
      _makePolarSubscription(WORKSPACE_B_ID),
    ] as never);

    expect(await _runFetchAndSync({ userId: USER_ID })).toEqual([
      WORKSPACE_A_ID,
      WORKSPACE_B_ID,
    ]);
  });
});
