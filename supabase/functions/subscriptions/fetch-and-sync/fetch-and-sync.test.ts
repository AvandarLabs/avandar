import { prop, propEq } from "@avandar/utils";
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

function _makePolarSubscription(
  options: Readonly<{ workspaceId: string; status?: string }>,
): Record<string, unknown> {
  const { workspaceId, status = "active" } = options;
  return {
    id: _toPolarSubscriptionId(workspaceId),
    product: {
      id: "polar-product-id",
      metadata: { featurePlanType: "premium" },
    },
    metadata: { userId: USER_ID, workspaceId },
    status,
    customer: { id: "polar-customer-id", email: "owner@example.com" },
    seats: 1,
    startedAt: new Date("2026-01-01T00:00:00Z"),
    endsAt: null,
    endedAt: null,
    currentPeriodStart: new Date("2026-01-01T00:00:00Z"),
    currentPeriodEnd: new Date("2027-01-01T00:00:00Z"),
  };
}

function _toPolarSubscriptionId(workspaceId: string): string {
  return `polar-subscription-${workspaceId}`;
}

type SubscriptionRow = Readonly<{
  id: string;
  workspace_id: string;
  polar_subscription_id: string | null;
  subscription_status: string;
}>;

/** The `subscriptions` fields these tests check on a written row. */
type RowFields = {
  workspace_id: string;
  subscription_status: string;
};

/**
 * The fields a sync wrote to one `subscriptions` row, and the id of the row
 * it updated (`undefined` for an insert).
 */
type WrittenRow = Readonly<RowFields & { updatedRowId: string | undefined }>;

/**
 * Creates an admin client over a `subscriptions` table holding
 * `existingRows` that records the fields of every row it inserts or updates.
 */
function _createFakeAdminClient(
  options: Readonly<{
    existingRows: readonly SubscriptionRow[];
    writtenRows: WrittenRow[];
  }>,
): unknown {
  const { existingRows, writtenRows } = options;
  const toWriteResult = (row: RowFields) => {
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
  };
  const table = {
    select: () => {
      return {
        eq: (column: keyof SubscriptionRow, value: string) => {
          return {
            maybeSingle: () => {
              return {
                throwOnError: async () => {
                  const matchingRow = existingRows.find(propEq(column, value));
                  return { data: matchingRow ?? null };
                },
              };
            },
          };
        },
      };
    },
    insert: (row: RowFields) => {
      writtenRows.push({ ...row, updatedRowId: undefined });
      return toWriteResult(row);
    },
    update: (row: RowFields) => {
      return {
        eq: (_column: "id", rowId: string) => {
          writtenRows.push({ ...row, updatedRowId: rowId });
          return toWriteResult(row);
        },
      };
    },
  };
  return {
    from: () => {
      return table;
    },
  };
}

async function _runFetchAndSync(
  options: Readonly<{
    queryParams: Readonly<{ userId: string; workspaceId?: string }>;
    existingRows?: readonly SubscriptionRow[];
  }>,
): Promise<WrittenRow[]> {
  const writtenRows: WrittenRow[] = [];
  // The fake admin client implements only the query chain this action
  // calls, and the user carries only its id.
  await FetchAndSyncUserSubscriptions.state.action({
    queryParams: options.queryParams,
    supabaseAdminClient: _createFakeAdminClient({
      existingRows: options.existingRows ?? [],
      writtenRows,
    }),
    user: { id: USER_ID },
  } as Parameters<typeof FetchAndSyncUserSubscriptions.state.action>[0]);
  return writtenRows;
}

describe("FetchAndSyncUserSubscriptions", () => {
  it("writes only the given workspace's subscription", async () => {
    vi.mocked(PolarClient.getSubscriptionsByUserId).mockResolvedValue([
      _makePolarSubscription({ workspaceId: WORKSPACE_A_ID }),
      _makePolarSubscription({ workspaceId: WORKSPACE_B_ID }),
    ] as never);

    const writtenRows = await _runFetchAndSync({
      queryParams: { userId: USER_ID, workspaceId: WORKSPACE_A_ID },
    });

    expect(writtenRows.map(prop("workspace_id"))).toEqual([WORKSPACE_A_ID]);
  });

  it("writes every workspace's subscription when no workspace is given", async () => {
    vi.mocked(PolarClient.getSubscriptionsByUserId).mockResolvedValue([
      _makePolarSubscription({ workspaceId: WORKSPACE_A_ID }),
      _makePolarSubscription({ workspaceId: WORKSPACE_B_ID }),
    ] as never);

    const writtenRows = await _runFetchAndSync({
      queryParams: { userId: USER_ID },
    });

    expect(writtenRows.map(prop("workspace_id"))).toEqual([
      WORKSPACE_A_ID,
      WORKSPACE_B_ID,
    ]);
  });

  it("keeps a workspace's Free plan when the Polar plan it replaced syncs as canceled", async () => {
    vi.mocked(PolarClient.getSubscriptionsByUserId).mockResolvedValue([
      _makePolarSubscription({
        workspaceId: WORKSPACE_A_ID,
        status: "canceled",
      }),
    ] as never);

    const writtenRows = await _runFetchAndSync({
      queryParams: { userId: USER_ID },
      existingRows: [
        {
          id: "free-row",
          workspace_id: WORKSPACE_A_ID,
          polar_subscription_id: null,
          subscription_status: "active",
        },
      ],
    });

    expect(writtenRows).toEqual([]);
  });

  it("does not record a canceled Polar plan for a workspace with no plan", async () => {
    vi.mocked(PolarClient.getSubscriptionsByUserId).mockResolvedValue([
      _makePolarSubscription({
        workspaceId: WORKSPACE_A_ID,
        status: "canceled",
      }),
    ] as never);

    const writtenRows = await _runFetchAndSync({
      queryParams: { userId: USER_ID },
    });

    expect(writtenRows).toEqual([]);
  });

  it("records a cancellation on the row that still tracks the Polar plan", async () => {
    vi.mocked(PolarClient.getSubscriptionsByUserId).mockResolvedValue([
      _makePolarSubscription({
        workspaceId: WORKSPACE_A_ID,
        status: "canceled",
      }),
    ] as never);

    const writtenRows = await _runFetchAndSync({
      queryParams: { userId: USER_ID },
      existingRows: [
        {
          id: "premium-row",
          workspace_id: WORKSPACE_A_ID,
          polar_subscription_id: _toPolarSubscriptionId(WORKSPACE_A_ID),
          subscription_status: "active",
        },
      ],
    });

    expect(writtenRows).toEqual([
      expect.objectContaining({
        updatedRowId: "premium-row",
        subscription_status: "canceled",
      }),
    ]);
  });
});
