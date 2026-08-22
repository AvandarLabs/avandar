import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactElement, ReactNode } from "react";

import { Model } from "@avandar/models";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TestProviders } from "@/test-utils";

const { navigateMock, puckRenderMock, publishedDatasetsState } = vi.hoisted(
  () => {
    return {
      navigateMock: vi.fn(),
      puckRenderMock: vi.fn(),
      publishedDatasetsState: {
        isLoadingDatasets: false,
        error: undefined as Error | undefined,
      },
    };
  },
);

const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111" as Dashboard.Id;
const WORKSPACE_ID = "44444444-4444-4444-8444-444444444444" as Workspace.Id;
const SNAPSHOT_REVISION = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

vi.mock("@puckeditor/core/puck.css", () => {
  return {};
});

vi.mock("@puckeditor/core", async () => {
  const { createElement } = await import("react");
  type Props = { metadata: unknown };
  return {
    Render: ({ metadata }: Props): ReactElement => {
      puckRenderMock(metadata);
      return createElement("div", { "data-testid": "dashboard-render" });
    },
  };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const { createElement } = await import("react");
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({ children, to }: { children: ReactNode; to: string }) => {
      return createElement("a", { href: to }, children);
    },
    useNavigate: (): typeof navigateMock => {
      return navigateMock;
    },
  };
});

vi.mock(
  "@/views/DashboardApp/DashboardEditorView/useDashboardPuckConfig/useDashboardPuckConfig",
  () => {
    return {
      useDashboardPuckConfig: (): Record<string, unknown> => {
        return {};
      },
    };
  },
);

vi.mock(
  "@/views/DashboardApp/DashboardViewerView/useEnsurePublishedDashboardDatasets/useEnsurePublishedDashboardDatasets",
  () => {
    return {
      // The real hook returns an object that the view destructures by name. A
      // tuple would type-check here (`vi.mock` factories are not checked
      // against the real module) but hand the view `undefined` for every
      // field, silently disabling its loading and error branches.
      useEnsurePublishedDashboardDatasets: (): {
        isLoadingDatasets: boolean;
        error: Error | undefined;
      } => {
        return { ...publishedDatasetsState };
      },
    };
  },
);

vi.mock("@/views/DashboardApp/AvaPage/utils/upgradeAvaPageData", () => {
  return {
    upgradeAvaPageData: <T,>(data: T): T => {
      return data;
    },
  };
});

vi.mock(
  "@/views/DashboardApp/AvaPage/migrations/getVersionFromAvaPageData",
  () => {
    return {
      getVersionFromAvaPageData: (): number => {
        return 1;
      },
    };
  },
);

const { DashboardViewerView } = await import("./DashboardViewerView");

function _createDashboard(
  options: Readonly<{
    visibility: Dashboard.Visibility;
    snapshotRevision?: string | undefined;
  }>,
): Dashboard.T {
  const { visibility, snapshotRevision = SNAPSHOT_REVISION } = options;
  const now = new Date().toISOString();
  return Model.make("Dashboard", {
    id: DASHBOARD_ID,
    config: { root: { props: {} }, content: [] },
    createdAt: now,
    description: undefined,
    isPublic: visibility === "public",
    isRestricted: false,
    name: "Dashboard",
    ownerId: "22222222-2222-4222-8222-222222222222" as User.Id,
    ownerProfileId: "33333333-3333-4333-8333-333333333333" as UserProfile.Id,
    slug: "dashboard",
    snapshotRevision,
    updatedAt: now,
    workspaceId: WORKSPACE_ID,
    visibility,
  });
}

function _renderViewer(
  props: Partial<Parameters<typeof DashboardViewerView>[0]> = {},
): void {
  render(
    <TestProviders>
      <DashboardViewerView
        dashboard={_createDashboard({ visibility: "draft" })}
        workspaceSlug="acme"
        {...props}
      />
    </TestProviders>,
  );
}

describe("DashboardViewerView", () => {
  beforeEach(() => {
    navigateMock.mockClear();
    puckRenderMock.mockClear();
    publishedDatasetsState.isLoadingDatasets = false;
    publishedDatasetsState.error = undefined;
  });

  it("holds back the dashboard until its published datasets have loaded", () => {
    publishedDatasetsState.isLoadingDatasets = true;
    _renderViewer({
      dashboard: _createDashboard({ visibility: "public" }),
      mode: "published",
    });

    expect(screen.getByText("Loading dashboard datasets")).toBeInTheDocument();
    // Rendering the blocks before their data exists would show a dashboard of
    // empty visualizations that looks like a published dashboard with no data.
    expect(screen.queryByTestId("dashboard-render")).not.toBeInTheDocument();
  });

  it("denies a draft that reaches a published viewer", () => {
    _renderViewer({
      dashboard: _createDashboard({ visibility: "draft" }),
      mode: "published",
    });

    expect(
      screen.getByRole("heading", { name: "You need access" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-render")).not.toBeInTheDocument();
  });

  it("denies a published dashboard without a committed snapshot revision", () => {
    _renderViewer({
      dashboard: {
        ..._createDashboard({ visibility: "public" }),
        snapshotRevision: undefined,
      },
      mode: "published",
    });

    expect(
      screen.getByRole("heading", { name: "You need access" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-render")).not.toBeInTheDocument();
  });

  it.each([
    [
      "public",
      {
        auth: "public",
        workspaceId: undefined,
        dashboardId: DASHBOARD_ID,
        snapshotRevision: SNAPSHOT_REVISION,
      },
    ],
    [
      "workspace",
      {
        auth: "workspace_published",
        workspaceId: WORKSPACE_ID,
        dashboardId: DASHBOARD_ID,
        snapshotRevision: SNAPSHOT_REVISION,
      },
    ],
  ] as const)(
    "renders a %s dashboard with its published metadata",
    (visibility, metadata) => {
      _renderViewer({
        dashboard: _createDashboard({ visibility }),
        mode: "published",
      });

      expect(screen.getByTestId("dashboard-render")).toBeInTheDocument();
      expect(puckRenderMock).toHaveBeenLastCalledWith(metadata);
    },
  );

  it.each([
    [
      "draft",
      "Not yet published. Viewers will not see this.",
      {
        auth: "workspace",
        workspaceId: WORKSPACE_ID,
        dashboardId: DASHBOARD_ID,
      },
    ],
    [
      "public",
      "This dashboard is published publicly.",
      {
        auth: "public",
        workspaceId: undefined,
        dashboardId: DASHBOARD_ID,
        snapshotRevision: SNAPSHOT_REVISION,
      },
    ],
    [
      "workspace",
      "Published to your workspace.",
      {
        auth: "workspace_published",
        workspaceId: WORKSPACE_ID,
        dashboardId: DASHBOARD_ID,
        snapshotRevision: SNAPSHOT_REVISION,
      },
    ],
  ] as const)(
    "shows the %s publication status and metadata in preview mode",
    (visibility, status, metadata) => {
      _renderViewer({
        dashboard: _createDashboard({ visibility }),
        mode: "preview",
      });

      expect(screen.getByText(status)).toBeInTheDocument();
      expect(puckRenderMock).toHaveBeenLastCalledWith(metadata);
    },
  );

  it("hides the editor button when the previewer cannot edit", () => {
    _renderViewer({ canEdit: false, mode: "preview" });

    expect(
      screen.queryByRole("button", { name: "Back to editor" }),
    ).not.toBeInTheDocument();
  });

  it("returns an editor who can edit to the dashboard editor", () => {
    _renderViewer({ canEdit: true, mode: "preview" });

    fireEvent.click(screen.getByRole("button", { name: "Back to editor" }));

    expect(navigateMock).toHaveBeenCalledWith({
      to: "/$workspaceSlug/dashboards/edit/$dashboardId",
      params: {
        workspaceSlug: "acme",
        dashboardId: DASHBOARD_ID,
      },
    });
  });
});
