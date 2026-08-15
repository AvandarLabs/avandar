import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
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
  };
});

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
});
