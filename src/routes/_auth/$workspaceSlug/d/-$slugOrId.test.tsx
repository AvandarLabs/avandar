import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { DashboardRouteOutcome } from "@/clients/dashboards/DashboardRouteResolver/DashboardRouteResolver";
import type { ComponentType } from "react";

/** Route-adapter coverage for the workspace dashboard slug-or-ID viewer. */
import { Model } from "@avandar/models";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { render, screen } from "@/test-utils";

const { makeDashboardRouteOutcomeFromWorkspaceRouteMock, routeDepsSentinel } =
  vi.hoisted(() => {
    // The resolver is mocked, so no dep is ever called here. A sentinel is what
    // makes the wiring observable: the route must hand the resolver the deps
    // that `DashboardRouteUtils` holds, not deps of its own.
    const sentinel = { sentinel: "workspace-dashboard-route-deps" };
    return {
      makeDashboardRouteOutcomeFromWorkspaceRouteMock: vi.fn<
        (
          params: Readonly<{
            slugOrId: string;
            workspaceSlug: string;
            deps: unknown;
          }>,
        ) => Promise<DashboardRouteOutcome>
      >(),
      routeDepsSentinel: sentinel,
    };
  });

vi.mock(
  "@/clients/dashboards/DashboardRouteResolver/DashboardRouteResolver",
  () => {
    return {
      DashboardRouteResolver: {
        makeDashboardRouteOutcomeFromWorkspaceRoute:
          makeDashboardRouteOutcomeFromWorkspaceRouteMock,
      },
    };
  },
);

vi.mock("@/clients/dashboards/DashboardRouteUtils/DashboardRouteUtils", () => {
  return { DashboardRouteUtils: routeDepsSentinel };
});

vi.mock(
  "@/views/DashboardApp/DashboardViewerView/DashboardAccessDeniedView/DashboardAccessDeniedView",
  async () => {
    const { createElement } = await import("react");
    return {
      DashboardAccessDeniedView: ({
        canSwitchAccount,
      }: {
        canSwitchAccount?: boolean;
      }) => {
        return createElement(
          "div",
          { "data-testid": "dashboard-access-denied" },
          canSwitchAccount ? "switch-account" : "no-account-switch",
        );
      },
    };
  },
);

vi.mock(
  "@/views/DashboardApp/DashboardViewerView/DashboardViewerView",
  async () => {
    const { createElement } = await import("react");
    return {
      DashboardViewerView: ({
        dashboard,
        mode,
      }: {
        dashboard: Dashboard.T;
        mode?: string;
      }) => {
        return createElement(
          "div",
          { "data-testid": "dashboard-viewer" },
          `${dashboard.id}:${mode}`,
        );
      },
    };
  },
);

const { Route } = await import("./$slugOrId");

type LoaderResult = Extract<
  DashboardRouteOutcome,
  { kind: "render" | "denied" }
>;
type LoaderArgs = {
  context: { queryClient: QueryClient };
  params: { slugOrId: string; workspaceSlug: string };
};
type DashboardRouteLoader = (args: LoaderArgs) => Promise<LoaderResult>;

const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111" as Dashboard.Id;
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222" as Workspace.Id;
const DASHBOARD_SLUG = "workspace-route-dashboard";
const WORKSPACE_SLUG = "acme";

function _createDashboard(): Dashboard.T {
  const now = new Date().toISOString();
  return Model.make("Dashboard", {
    id: DASHBOARD_ID,
    config: { root: { props: {} }, content: [] },
    createdAt: now,
    description: undefined,
    isPublic: false,
    isRestricted: true,
    name: "Workspace route dashboard",
    ownerId: "33333333-3333-4333-8333-333333333333" as User.Id,
    ownerProfileId: "44444444-4444-4444-8444-444444444444" as UserProfile.Id,
    slug: DASHBOARD_SLUG,
    updatedAt: now,
    visibility: "workspace",
    workspaceId: WORKSPACE_ID,
  });
}

function _createLoaderArgs(slugOrId: string): LoaderArgs {
  return {
    context: { queryClient: new QueryClient() },
    params: { slugOrId, workspaceSlug: WORKSPACE_SLUG },
  };
}

function _getLoader(): DashboardRouteLoader {
  if (Route.options.loader === undefined) {
    throw new Error("The dashboard route must define a loader.");
  }

  return Route.options.loader as DashboardRouteLoader;
}

function _getComponent(): ComponentType {
  if (Route.options.component === undefined) {
    throw new Error("The dashboard route must define a component.");
  }

  return Route.options.component;
}

function _setResolverOutcome(outcome: DashboardRouteOutcome): void {
  makeDashboardRouteOutcomeFromWorkspaceRouteMock.mockResolvedValue(outcome);
}

function _setLoaderData(outcome: LoaderResult): void {
  vi.spyOn(Route, "useLoaderData").mockReturnValue(outcome);
}

afterEach(() => {
  makeDashboardRouteOutcomeFromWorkspaceRouteMock.mockReset();
  vi.restoreAllMocks();
});

describe("/$workspaceSlug/d/$slugOrId", () => {
  it("renders the resolver dashboard in published mode with its workspace scope", async () => {
    const dashboard = _createDashboard();
    _setResolverOutcome({ kind: "render", dashboard });

    const result = await _getLoader()(_createLoaderArgs(DASHBOARD_SLUG));
    _setLoaderData(result);
    const WorkspaceDashboardPage = _getComponent();
    render(<WorkspaceDashboardPage />);

    expect(result).toEqual({ kind: "render", dashboard });
    expect(
      makeDashboardRouteOutcomeFromWorkspaceRouteMock,
    ).toHaveBeenCalledWith({
      slugOrId: DASHBOARD_SLUG,
      workspaceSlug: WORKSPACE_SLUG,
      deps: routeDepsSentinel,
    });
    expect(
      makeDashboardRouteOutcomeFromWorkspaceRouteMock.mock.calls[0]?.[0].deps,
    ).toBe(routeDepsSentinel);
    expect(screen.getByTestId("dashboard-viewer")).toHaveTextContent(
      `${dashboard.id}:published`,
    );
  });

  it("renders a denied dashboard with an account-switch action", () => {
    _setLoaderData({ kind: "denied" });
    const WorkspaceDashboardPage = _getComponent();
    render(<WorkspaceDashboardPage />);

    expect(screen.getByTestId("dashboard-access-denied")).toHaveTextContent(
      "switch-account",
    );
  });

  it("redirects a workspace dashboard ID to its canonical workspace slug", async () => {
    _setResolverOutcome({
      kind: "redirectToWorkspace",
      slugOrId: DASHBOARD_SLUG,
      workspaceSlug: WORKSPACE_SLUG,
    });

    await expect(
      _getLoader()(_createLoaderArgs(DASHBOARD_ID)),
    ).rejects.toMatchObject({
      options: {
        params: {
          slugOrId: DASHBOARD_SLUG,
          workspaceSlug: WORKSPACE_SLUG,
        },
        replace: true,
        to: "/$workspaceSlug/d/$slugOrId",
      },
    });
  });

  it("redirects a public dashboard to its public canonical URL", async () => {
    _setResolverOutcome({
      kind: "redirectToPublic",
      slugOrId: "public-dashboard",
    });

    await expect(
      _getLoader()(_createLoaderArgs("public-dashboard")),
    ).rejects.toMatchObject({
      options: {
        params: { slugOrId: "public-dashboard" },
        replace: true,
        to: "/d/$slugOrId",
      },
    });
  });

  it("redirects the unreachable sign-in outcome to the sign-in page", async () => {
    _setResolverOutcome({ kind: "signIn" });

    await expect(
      _getLoader()(_createLoaderArgs(DASHBOARD_SLUG)),
    ).rejects.toMatchObject({ options: { to: "/signin" } });
  });
});
