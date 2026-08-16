import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { DashboardShareModal } from "@/views/DashboardApp/DashboardShareModal/DashboardShareModal";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactElement } from "react";

/**
 * The gates the toolbar's old Publish button carried now live here, so these
 * are the tests that keep them alive. Only the actions slot is rendered: the
 * publishing section pulls the whole dataset-slice tree in, and none of it is
 * what a gate test is about.
 */
const mocks = vi.hoisted(() => {
  return {
    isOnline: true,
    canPublishPublicly: true,
    resourceRole: "admin" as string,
    canManageShares: undefined as boolean | undefined,
    normalisedSlug: "",
    hasPendingSlugCheck: false,
    isSlugRejected: false,
    isPlanBlocked: false,
  };
});

vi.mock(
  "@/views/DashboardApp/DashboardShareModal/useShareableDashboardLimit",
  () => {
    return {
      useShareableDashboardLimit: () => {
        return {
          isBlocked: mocks.isPlanBlocked,
          maxAllowed: 1,
          subscription: undefined,
        };
      },
    };
  },
);

vi.mock(
  "@/views/DashboardApp/DashboardShareModal/ShareableLimitReachedModal",
  () => {
    return {
      ShareableLimitReachedModal: ({
        isOpened,
      }: {
        isOpened: boolean;
      }): ReactElement | null => {
        return isOpened ? <div>Shared dashboard limit reached</div> : null;
      },
    };
  },
);

vi.mock(
  "@/components/permissions/ShareResourceModal/ShareResourceModal",
  () => {
    return {
      ShareResourceModal: ({
        publishing,
        canManageShares,
      }: {
        publishing?: { actions: ReactElement };
        canManageShares?: boolean;
      }): ReactElement | null => {
        mocks.canManageShares = canManageShares;
        return publishing?.actions ?? null;
      },
    };
  },
);

vi.mock("@/hooks/permissions/useResourceRole/useResourceRole", () => {
  return {
    useResourceRole: (): readonly [string, boolean] => {
      return [mocks.resourceRole, false] as const;
    },
  };
});

vi.mock("@/lib/hooks/browser/useIsOnline/useIsOnline", () => {
  return {
    useIsOnline: (): boolean => {
      return mocks.isOnline;
    },
  };
});

vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return {
    useHasPermission: (): boolean => {
      return mocks.canPublishPublicly;
    },
  };
});

vi.mock(
  "@/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl",
  () => {
    return {
      useDashboardPublishingControl: () => {
        return {
          currentDashboard: { visibility: "draft" },
          targetVisibility: "workspace",
          actionKind: "publish_workspace",
          isBusy: false,
          normalisedSlug: mocks.normalisedSlug,
          hasPendingSlugCheck: mocks.hasPendingSlugCheck,
          isSlugRejected: mocks.isSlugRejected,
          onPrimaryAction: vi.fn(),
          onGeneralAccessChange: vi.fn(),
        };
      },
    };
  },
);

function _makeDashboard(): Dashboard.T {
  return { id: "dash-1", name: "Q3 Revenue" } as Dashboard.T;
}

function renderModal(): void {
  render(
    <DashboardShareModal
      dashboard={_makeDashboard()}
      hasUnsavedChanges={false}
      onClose={vi.fn()}
    />,
  );
}

describe("DashboardShareModal", () => {
  beforeEach(() => {
    mocks.isOnline = true;
    mocks.canPublishPublicly = true;
    mocks.resourceRole = "admin";
    mocks.canManageShares = undefined;
    mocks.normalisedSlug = "";
    mocks.hasPendingSlugCheck = false;
    mocks.isSlugRejected = false;
    mocks.isPlanBlocked = false;
  });

  it("enables publishing when saved and online", () => {
    renderModal();

    expect(
      screen.getByRole("button", { name: "Publish to workspace" }),
    ).toBeEnabled();
  });

  it("blocks publishing while the editor has unsaved changes", () => {
    // Publishing copies the PERSISTED config, so publishing dirty would ship
    // the previous version without saying so.
    render(
      <DashboardShareModal
        dashboard={_makeDashboard()}
        hasUnsavedChanges
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Publish to workspace" }),
    ).toBeDisabled();
  });

  // An editor may publish to their own workspace but may not hand out access,
  // so the modal opens for them with its sharing half read-only rather than
  // refusing to open at all.
  it("lets an editor publish while withholding share management", () => {
    mocks.resourceRole = "editor";

    renderModal();

    expect(mocks.canManageShares).toBe(false);
    expect(
      screen.getByRole("button", { name: "Publish to workspace" }),
    ).toBeEnabled();
  });

  it("allows an admin to manage shares", () => {
    renderModal();

    expect(mocks.canManageShares).toBe(true);
  });

  it("blocks publishing while offline", () => {
    mocks.isOnline = false;

    renderModal();

    expect(
      screen.getByRole("button", { name: "Publish to workspace" }),
    ).toBeDisabled();
  });

  // The button must not look clickable while the custom URL is still being
  // checked: clicking it while pending would silently do nothing, because
  // `onPrimaryAction` refuses to publish over an unresolved slug check.
  it("blocks publishing while the custom URL check is pending", () => {
    mocks.normalisedSlug = "my-dashboard";
    mocks.hasPendingSlugCheck = true;

    renderModal();

    expect(
      screen.getByRole("button", { name: "Publish to workspace" }),
    ).toBeDisabled();
  });

  // Same story for a slug the server has already rejected: the guard in
  // `onPrimaryAction` refuses to publish, so the button must say why.
  it("blocks publishing when the custom URL was rejected", () => {
    mocks.normalisedSlug = "my-dashboard";
    mocks.isSlugRejected = true;

    renderModal();

    expect(
      screen.getByRole("button", { name: "Publish to workspace" }),
    ).toBeDisabled();
  });

  // The slug flags only matter once the field holds something: an empty slug
  // clears its own pending/rejected state in the real hook, but a test double
  // could still set both, so the modal must not honor them without a slug.
  it("does not block publishing on a pending or rejected slug when the field is empty", () => {
    mocks.normalisedSlug = "";
    mocks.hasPendingSlugCheck = true;
    mocks.isSlugRejected = true;

    renderModal();

    expect(
      screen.getByRole("button", { name: "Publish to workspace" }),
    ).toBeEnabled();
  });

  // The database refuses this publish, so the button must say so before the
  // user spends a click on a failure toast.
  it("blocks publishing when the plan's shareable limit is reached", () => {
    mocks.isPlanBlocked = true;

    renderModal();

    expect(
      screen.getByRole("button", { name: "Publish to workspace" }),
    ).toBeDisabled();
  });

  // A disabled button cannot open anything, so the upgrade needs its own
  // button. It stays out of the footer until the plan is the thing blocking.
  it("offers the upgrade only when the plan is what blocks publishing", () => {
    renderModal();

    expect(screen.queryByRole("button", { name: "Upgrade plan" })).toBeNull();
  });

  it("opens the upgrade modal from the footer rather than on render", () => {
    mocks.isPlanBlocked = true;

    renderModal();

    expect(screen.queryByText("Shared dashboard limit reached")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Upgrade plan" }));
    expect(
      screen.getByText("Shared dashboard limit reached"),
    ).toBeInTheDocument();
  });

  // Offline is not something an upgrade fixes, so the plan message and its
  // upgrade button must not appear over the top of a higher-priority block.
  it("keeps the offline reason ahead of the plan limit", () => {
    mocks.isOnline = false;
    mocks.isPlanBlocked = true;

    renderModal();

    expect(screen.queryByRole("button", { name: "Upgrade plan" })).toBeNull();
  });
});
