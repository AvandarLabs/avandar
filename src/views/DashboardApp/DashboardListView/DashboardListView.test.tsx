import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { DashboardListView } from "@/views/DashboardApp/DashboardListView/DashboardListView";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

/**
 * The ownership badge is driven by a comparison against the current user's
 * profile, which arrives one tick after the dashboards do. These tests exist
 * because that gap is user-visible: the wrong default badges every card on the
 * grid and then un-badges them.
 */
const mocks = vi.hoisted(() => {
  return {
    userProfile: undefined as { userId: string } | undefined,
    isLoadingUserProfile: true,
  };
});

vi.mock("@/hooks/users/useCurrentUserProfile", () => {
  return {
    useCurrentUserProfile: (): readonly [unknown, boolean] => {
      return [mocks.userProfile, mocks.isLoadingUserProfile] as const;
    },
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", slug: "acme", name: "Acme" };
    },
  };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAll: () => {
        return [[], false] as const;
      },
    },
  };
});

vi.mock("@/clients/datasets/LocalDatasetClient/LocalDatasetClient", () => {
  return {
    LocalDatasetClient: {
      useGetAll: () => {
        return [[], false] as const;
      },
    },
  };
});

vi.mock("@/clients/dashboards/DashboardClient/DashboardClient", () => {
  return {
    DashboardClient: {
      QueryKeys: {
        getAll: () => {
          return ["dashboards"];
        },
      },
      useInsert: () => {
        return [vi.fn(), false] as const;
      },
    },
  };
});

// Only `useNavigate` is replaced: the rest of the router package is still
// imported by the UI kit, and stubbing the whole module breaks `createLink`.
vi.mock("@tanstack/react-router", async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import("@tanstack/react-router")>()),
    useNavigate: () => {
      return vi.fn();
    },
  };
});

vi.mock("@/components/layouts/AppLayout/AppLayout", () => {
  return {
    AppLayout: ({ children }: { children: ReactNode }): ReactNode => {
      return children;
    },
  };
});

function _makeDashboard(ownerId: string): Dashboard.T {
  return {
    id: `dash-${ownerId}`,
    name: `Dashboard of ${ownerId}`,
    description: undefined,
    ownerId,
    visibility: "draft",
    updatedAt: "2026-08-01T00:00:00Z",
    config: {},
  } as unknown as Dashboard.T;
}

function _renderList(dashboards: readonly Dashboard.T[]): void {
  render(
    <DashboardListView dashboards={[...dashboards]} workspaceSlug="acme" />,
  );
}

describe("DashboardListView", () => {
  beforeEach(() => {
    mocks.userProfile = undefined;
    mocks.isLoadingUserProfile = true;
  });

  it("badges nothing while the current user's profile is still loading", () => {
    // With no profile there is no owner to compare against, and guessing
    // "someone else owns this" grape-badges every card, your own included,
    // until the profile lands a tick later.
    _renderList([_makeDashboard("me"), _makeDashboard("them")]);

    expect(screen.queryByText("Shared with you")).toBeNull();
  });

  it("badges only the dashboards you do not own once the profile arrives", () => {
    mocks.userProfile = { userId: "me" };
    mocks.isLoadingUserProfile = false;

    _renderList([_makeDashboard("me"), _makeDashboard("them")]);

    expect(screen.getAllByText("Shared with you")).toHaveLength(1);
  });
});
