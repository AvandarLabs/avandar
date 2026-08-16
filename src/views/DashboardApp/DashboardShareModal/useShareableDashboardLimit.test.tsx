import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { useShareableDashboardLimit } from "@/views/DashboardApp/DashboardShareModal/useShareableDashboardLimit";
import type { ResourceSharingState } from "@/clients/permissions/ResourceShareClient";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Subscription } from "$/models/Subscription/Subscription";

const DASHBOARD_ID = "11111111-2222-4333-8444-555555555555";
const OWNER_ID = "owner-1";

/**
 * The plan answer and the sharing rows the hook reads. Both are mocked because
 * the whole point of the hook is how it combines them: the backend says whether
 * one MORE dashboard may be made shareable, and the share rows say whether this
 * dashboard is already one of the ones being counted.
 */
const mocks = vi.hoisted(() => {
  return {
    isAllowed: false,
    subscription: undefined as
      | {
          id: string;
          featurePlanType: string;
          maxShareableDashboardsAllowed: number;
        }
      | undefined,
    sharingState: undefined as ResourceSharingState | undefined,
    isSharingStateFetching: false,
    permissionQueryArgs: undefined as
      | {
          subscriptionId: string;
          useQueryOptions?: { enabled?: boolean; refetchOnMount?: unknown };
        }
      | undefined,
    sharingStateQueryArgs: undefined as
      | { useQueryOptions?: { refetchOnMount?: unknown } }
      | undefined,
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "ws-1", slug: "acme", subscription: mocks.subscription };
    },
  };
});

vi.mock("@/clients/permissions/ResourceShareClient", () => {
  return {
    ResourceShareClient: {
      useGetResourceSharingState: (args: {
        useQueryOptions?: { refetchOnMount?: unknown };
      }) => {
        mocks.sharingStateQueryArgs = args;
        return [
          mocks.sharingState,
          false,
          { isFetching: mocks.isSharingStateFetching },
        ] as const;
      },
    },
  };
});

vi.mock("@/clients/SubscriptionPermissionsClient", () => {
  return {
    SubscriptionPermissionsClient: {
      useCanPublishShareableDashboard: (args: {
        subscriptionId: string;
        useQueryOptions?: { enabled?: boolean; refetchOnMount?: unknown };
      }) => {
        mocks.permissionQueryArgs = args;
        // A disabled query never resolves, so the double must answer
        // `undefined` rather than a verdict the real hook would not have.
        return [
          args.useQueryOptions?.enabled === false ?
            undefined
          : { allowed: mocks.isAllowed },
          false,
        ] as const;
      },
    },
  };
});

function makeDashboard(
  options: Readonly<{
    visibility: Dashboard.Visibility;
    isRestricted: boolean;
  }>,
): Dashboard.T {
  return {
    id: DASHBOARD_ID,
    workspaceId: "ws-1",
    name: "Q3 Revenue",
    ownerId: OWNER_ID,
    visibility: options.visibility,
    isPublic: options.visibility === "public",
    isRestricted: options.isRestricted,
  } as unknown as Dashboard.T;
}

function makeSharingState(
  options: Readonly<{
    isRestricted: boolean;
    shares: ResourceSharingState["shares"];
  }>,
): ResourceSharingState {
  return {
    isRestricted: options.isRestricted,
    ownerId: OWNER_ID,
    shares: options.shares,
  };
}

function renderLimit(
  options: Readonly<{
    dashboard: Dashboard.T;
    targetVisibility: Dashboard.Visibility;
  }>,
) {
  return renderHook(() => {
    return useShareableDashboardLimit(options);
  });
}

describe("useShareableDashboardLimit", () => {
  beforeEach(() => {
    mocks.isAllowed = false;
    mocks.sharingState = undefined;
    mocks.isSharingStateFetching = false;
    mocks.permissionQueryArgs = undefined;
    mocks.sharingStateQueryArgs = undefined;
    mocks.subscription = {
      id: "sub-1",
      featurePlanType: "free",
      maxShareableDashboardsAllowed: 1,
    };
  });

  // Republishing consumes no new allowance, so the limit must not apply even
  // when the workspace is at it. Without this a free workspace could never
  // update the one dashboard it is entitled to.
  it("does not block a dashboard that already counts as shareable", () => {
    const { result } = renderLimit({
      dashboard: makeDashboard({
        visibility: "workspace",
        isRestricted: false,
      }),
      targetVisibility: "workspace",
    });

    expect(result.current.isBlocked).toBe(false);
  });

  // A public dashboard is world-readable through the anon policy no matter
  // what its share rows say, so it counts even while restricted.
  it("does not block a public dashboard even when it is restricted", () => {
    const { result } = renderLimit({
      dashboard: makeDashboard({ visibility: "public", isRestricted: true }),
      targetVisibility: "public",
    });

    expect(result.current.isBlocked).toBe(false);
  });

  // Restricted plus a share naming somebody other than the owner is still
  // reachable by a non-owner, which is exactly what the count measures.
  it("does not block a restricted dashboard that has a non-owner share", () => {
    mocks.sharingState = makeSharingState({
      isRestricted: true,
      shares: [
        {
          id: "share-1",
          workspaceId: "ws-1",
          resourceType: "dashboard",
          resourceId: DASHBOARD_ID,
          principalType: "user",
          principalId: "someone-else",
          role: "viewer",
          requiresAppAccess: false,
        },
      ] as ResourceSharingState["shares"],
    });

    const { result } = renderLimit({
      dashboard: makeDashboard({ visibility: "workspace", isRestricted: true }),
      targetVisibility: "workspace",
    });

    expect(result.current.isBlocked).toBe(false);
  });

  // A share row naming the owner leaves the dashboard private to its owner, so
  // it does not count yet and publishing it does consume an allowance.
  it("blocks a restricted dashboard whose only share names its owner", () => {
    mocks.sharingState = makeSharingState({
      isRestricted: true,
      shares: [
        {
          id: "share-1",
          workspaceId: "ws-1",
          resourceType: "dashboard",
          resourceId: DASHBOARD_ID,
          principalType: "user",
          principalId: OWNER_ID,
          role: "admin",
          requiresAppAccess: false,
        },
      ] as ResourceSharingState["shares"],
    });

    const { result } = renderLimit({
      dashboard: makeDashboard({ visibility: "workspace", isRestricted: true }),
      targetVisibility: "public",
    });

    expect(result.current.isBlocked).toBe(true);
  });

  it("blocks a draft that would become the second shareable dashboard", () => {
    const { result } = renderLimit({
      dashboard: makeDashboard({ visibility: "draft", isRestricted: true }),
      targetVisibility: "workspace",
    });

    expect(result.current.isBlocked).toBe(true);
  });

  // Narrowing is always allowed, in the UI as in the database: a workspace over
  // its cap must always have a way back under it.
  it("does not block when the target is draft, because unpublishing is free", () => {
    const { result } = renderLimit({
      dashboard: makeDashboard({
        visibility: "workspace",
        isRestricted: false,
      }),
      targetVisibility: "draft",
    });

    expect(result.current.isBlocked).toBe(false);
  });

  // The same exemption for a dashboard that does NOT already count, which is
  // what isolates the draft guard from the already-counts one: a workspace
  // over its cap must be able to take any dashboard back to draft.
  it("does not block unpublishing a dashboard that does not yet count", () => {
    const { result } = renderLimit({
      dashboard: makeDashboard({ visibility: "workspace", isRestricted: true }),
      targetVisibility: "draft",
    });

    expect(result.current.isBlocked).toBe(false);
  });

  it("does not block when the plan still has allowance left", () => {
    mocks.isAllowed = true;

    const { result } = renderLimit({
      dashboard: makeDashboard({ visibility: "draft", isRestricted: true }),
      targetVisibility: "workspace",
    });

    expect(result.current.isBlocked).toBe(false);
  });

  // Optimistic while the answer is in flight: the database trigger is the real
  // gate, so a slow permission query must not disable the button.
  it("does not block while the permission answer is unknown", () => {
    mocks.subscription = undefined;

    const { result } = renderLimit({
      dashboard: makeDashboard({ visibility: "draft", isRestricted: true }),
      targetVisibility: "workspace",
    });

    expect(result.current.isBlocked).toBe(false);
  });

  // The exempt cases must not even ask the backend: the answer cannot change
  // the outcome, and asking would spend a request per share-modal open.
  it("skips the permission query when no allowance would be consumed", () => {
    renderLimit({
      dashboard: makeDashboard({
        visibility: "workspace",
        isRestricted: false,
      }),
      targetVisibility: "workspace",
    });

    expect(mocks.permissionQueryArgs?.useQueryOptions?.enabled).toBe(false);
  });

  // The React Query cache is persisted to IndexedDB and the persister
  // throttles its writes, so a reload straight after a share write can restore
  // the PRE-mutation rows. A restored entry counts as fresh for the whole
  // default `staleTime`, so without this option the exemption would be
  // computed from shares that no longer exist and never corrected.
  it("forces a fresh read of the share rows on mount", () => {
    renderLimit({
      dashboard: makeDashboard({ visibility: "draft", isRestricted: true }),
      targetVisibility: "workspace",
    });

    expect(mocks.sharingStateQueryArgs?.useQueryOptions).toMatchObject(
      ALWAYS_REFETCH_ON_MOUNT,
    );
  });

  // Same story for the plan verdict, which is what makes an upgrade bought in
  // `ShareableLimitReachedModal` take effect: a persisted `allowed: false`
  // would otherwise keep the publish button disabled behind an Upgrade prompt
  // that nothing on that screen can clear.
  it("forces a fresh read of the plan verdict on mount", () => {
    renderLimit({
      dashboard: makeDashboard({ visibility: "draft", isRestricted: true }),
      targetVisibility: "workspace",
    });

    expect(mocks.permissionQueryArgs?.useQueryOptions).toMatchObject(
      ALWAYS_REFETCH_ON_MOUNT,
    );
    // The refresh must not cost the exemption its skip.
    expect(mocks.permissionQueryArgs?.useQueryOptions?.enabled).toBe(true);
  });

  // The exemption is derived FROM the share rows, so while those are being
  // refetched the answer is unknown. Blocking on the snapshot that is about to
  // be replaced would put an Upgrade prompt on a dashboard that may well need
  // no allowance at all; the database trigger is the real gate.
  it("does not block while the share rows are being refetched", () => {
    mocks.isSharingStateFetching = true;

    const { result } = renderLimit({
      dashboard: makeDashboard({ visibility: "draft", isRestricted: true }),
      targetVisibility: "workspace",
    });

    expect(result.current.isBlocked).toBe(false);
  });

  it("reports the plan's shareable-dashboard allowance", () => {
    const { result } = renderLimit({
      dashboard: makeDashboard({ visibility: "draft", isRestricted: true }),
      targetVisibility: "workspace",
    });

    expect(result.current.maxAllowed).toBe(1);
    expect(result.current.subscription).toBe(
      mocks.subscription as unknown as Subscription.T,
    );
  });
});
