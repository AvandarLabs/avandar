/** Route-adapter coverage for the public dashboard slug-or-ID viewer. */
import { Model } from "@avandar/models";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import type { DashboardRouteOutcome } from "@/clients/dashboards/DashboardRouteResolver/DashboardRouteResolver";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ComponentType } from "react";

const { makeDashboardRouteOutcomeFromPublicRouteMock, routeDepsSentinel } =
  vi.hoisted(() => {
    // The resolver is mocked, so no dep is ever called here. A sentinel is what
    // makes the wiring observable: the route must hand the resolver the deps
    // that `dashboardRouteDeps` holds, not deps of its own.
    const sentinel = { sentinel: "public-dashboard-route-deps" };
    return {
      makeDashboardRouteOutcomeFromPublicRouteMock:
        vi.fn<
          (
            params: Readonly<{ slugOrId: string; deps: unknown }>,
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
        makeDashboardRouteOutcomeFromPublicRoute:
          makeDashboardRouteOutcomeFromPublicRouteMock,
      },
    };
  },
);

vi.mock("@/clients/dashboards/dashboardRouteDeps/dashboardRouteDeps", () => {
  return { dashboardRouteDeps: routeDepsSentinel };
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

type LoaderArgs = {
  context: { queryClient: QueryClient; user: undefined };
  location: { href: string };
  params: { slugOrId: string };
};
type DashboardRouteLoader = (
  args: LoaderArgs,
) => Promise<Extract<DashboardRouteOutcome, { kind: "render" | "denied" }>>;

const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111" as Dashboard.Id;
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222" as Workspace.Id;
const DASHBOARD_SLUG = "route-dashboard";

function _createDashboard(): Dashboard.T {
  const now = new Date().toISOString();
  return Model.make("Dashboard", {
    id: DASHBOARD_ID,
    config: { root: { props: {} }, content: [] },
    createdAt: now,
    description: undefined,
    isPublic: true,
    isRestricted: false,
    name: "Route dashboard",
    ownerId: "33333333-3333-4333-8333-333333333333" as User.Id,
    ownerProfileId: "44444444-4444-4444-8444-444444444444" as UserProfile.Id,
    slug: DASHBOARD_SLUG,
    updatedAt: now,
    visibility: "public",
    workspaceId: WORKSPACE_ID,
  });
}

function _createLoaderArgs(slugOrId: string): LoaderArgs {
  return {
    context: {
      queryClient: new QueryClient(),
      user: undefined,
    },
    location: { href: `https://app.avandar.test/d/${slugOrId}` },
    params: { slugOrId },
  };
}

function _getLoader(): DashboardRouteLoader {
  if (Route.options.loader === undefined) {
    throw new Error("The dashboard route must define a loader.");
  }

  // Route options also allow object loaders; this route defines a function.
  return Route.options.loader as DashboardRouteLoader;
}

function _getComponent(): ComponentType {
  if (Route.options.component === undefined) {
    throw new Error("The dashboard route must define a component.");
  }

  return Route.options.component;
}

function _setResolverOutcome(outcome: DashboardRouteOutcome): void {
  makeDashboardRouteOutcomeFromPublicRouteMock.mockResolvedValue(outcome);
}

function _setLoaderData(
  outcome: Extract<DashboardRouteOutcome, { kind: "render" | "denied" }>,
): void {
  vi.spyOn(Route, "useLoaderData").mockReturnValue(outcome);
}

afterEach(() => {
  makeDashboardRouteOutcomeFromPublicRouteMock.mockReset();
  vi.restoreAllMocks();
});

describe("/d/$slugOrId", () => {
  it("renders the resolver's dashboard and supplies published viewer mode", async () => {
    const dashboard = _createDashboard();
    _setResolverOutcome({ kind: "render", dashboard });

    const result = await _getLoader()(_createLoaderArgs(DASHBOARD_SLUG));
    _setLoaderData(result);
    const DashboardVanityPage = _getComponent();
    render(<DashboardVanityPage />);

    expect(result).toEqual({ kind: "render", dashboard });
    expect(makeDashboardRouteOutcomeFromPublicRouteMock).toHaveBeenCalledWith({
      slugOrId: DASHBOARD_SLUG,
      deps: routeDepsSentinel,
    });
    expect(
      makeDashboardRouteOutcomeFromPublicRouteMock.mock.calls[0]?.[0].deps,
    ).toBe(routeDepsSentinel);
    expect(screen.getByTestId("dashboard-viewer")).toHaveTextContent(
      `${dashboard.id}:published`,
    );
  });

  it("renders a denied dashboard with an account-switch action", () => {
    _setLoaderData({ kind: "denied" });
    const DashboardVanityPage = _getComponent();
    render(<DashboardVanityPage />);

    expect(screen.getByTestId("dashboard-access-denied")).toHaveTextContent(
      "switch-account",
    );
  });

  it("redirects a public dashboard ID to its canonical slug", async () => {
    _setResolverOutcome({
      kind: "redirectToPublic",
      slugOrId: "canonical-dashboard",
    });

    await expect(
      _getLoader()(_createLoaderArgs(DASHBOARD_ID)),
    ).rejects.toMatchObject({
      options: {
        params: { slugOrId: "canonical-dashboard" },
        replace: true,
        to: "/d/$slugOrId",
      },
    });
  });

  it("redirects a workspace dashboard to its workspace route", async () => {
    _setResolverOutcome({
      kind: "redirectToWorkspace",
      slugOrId: "workspace-dashboard",
      workspaceSlug: "acme",
    });

    await expect(
      _getLoader()(_createLoaderArgs("workspace-dashboard")),
    ).rejects.toMatchObject({
      options: {
        params: {
          slugOrId: "workspace-dashboard",
          workspaceSlug: "acme",
        },
        replace: true,
        to: "/$workspaceSlug/d/$slugOrId",
      },
    });
  });

  it("redirects anonymous viewers to sign in with the current location", async () => {
    _setResolverOutcome({ kind: "signIn" });
    const locationHref = "https://app.avandar.test/d/private-dashboard";

    await expect(
      _getLoader()(_createLoaderArgs("private-dashboard")),
    ).rejects.toMatchObject({
      options: {
        search: { redirect: locationHref },
        to: "/signin",
      },
    });
  });
});
