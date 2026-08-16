import { Model } from "@avandar/models";
import { describe, expect, it, vi } from "vitest";
import { DashboardRouteResolver } from "@/clients/dashboards/DashboardRouteResolver/DashboardRouteResolver";
import type { DashboardRouteDeps } from "@/clients/dashboards/DashboardRouteResolver/DashboardRouteResolver";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Workspace } from "$/models/Workspace/Workspace";

const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111" as Dashboard.Id;
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222" as Workspace.Id;
const OTHER_WORKSPACE_ID =
  "33333333-3333-4333-8333-333333333333" as Workspace.Id;

function _createDashboard(
  params: Readonly<{
    visibility: Dashboard.Visibility;
    slug?: string;
    workspaceId?: Workspace.Id;
  }>,
): Dashboard.T {
  return Model.make("Dashboard", {
    id: DASHBOARD_ID,
    workspaceId: params.workspaceId ?? WORKSPACE_ID,
    config: {},
    createdAt: "2026-08-14T00:00:00.000Z",
    description: undefined,
    visibility: params.visibility,
    isPublic: params.visibility === "public",
    isRestricted: false,
    name: "Dashboard",
    ownerId: "44444444-4444-4444-8444-444444444444" as Dashboard.T["ownerId"],
    ownerProfileId:
      "55555555-5555-4555-8555-555555555555" as Dashboard.T["ownerProfileId"],
    slug: params.slug,
    updatedAt: "2026-08-14T00:00:00.000Z",
  });
}

function _createDeps(
  overrides: Readonly<Partial<DashboardRouteDeps>> = {},
): DashboardRouteDeps {
  return {
    getById: vi.fn().mockResolvedValue(undefined),
    findBySlug: vi.fn().mockResolvedValue([]),
    getViewerWorkspaces: vi
      .fn()
      .mockResolvedValue([{ id: WORKSPACE_ID, slug: "acme" }]),
    isAuthenticated: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("DashboardRouteResolver.makeDashboardRouteOutcomeFromPublicRoute", () => {
  it("renders a public dashboard reached by its slug", async () => {
    const dashboard = _createDashboard({ visibility: "public", slug: "q3" });
    const outcome =
      await DashboardRouteResolver.makeDashboardRouteOutcomeFromPublicRoute({
        slugOrId: "q3",
        deps: _createDeps({
          findBySlug: vi.fn().mockResolvedValue([dashboard]),
        }),
      });

    expect(outcome).toEqual({ kind: "render", dashboard });
  });

  it("canonicalizes a public id onto its slug URL", async () => {
    const dashboard = _createDashboard({ visibility: "public", slug: "q3" });
    const getById = vi.fn().mockResolvedValue(dashboard);
    const findBySlug = vi.fn().mockResolvedValue([]);
    const outcome =
      await DashboardRouteResolver.makeDashboardRouteOutcomeFromPublicRoute({
        slugOrId: DASHBOARD_ID,
        deps: _createDeps({ getById, findBySlug }),
      });

    expect(outcome).toEqual({ kind: "redirectToPublic", slugOrId: "q3" });
    expect(getById).toHaveBeenCalledWith(DASHBOARD_ID);
    expect(findBySlug).not.toHaveBeenCalled();
  });

  it("renders a public dashboard by id when it has no slug", async () => {
    const dashboard = _createDashboard({ visibility: "public" });
    const outcome =
      await DashboardRouteResolver.makeDashboardRouteOutcomeFromPublicRoute({
        slugOrId: DASHBOARD_ID,
        deps: _createDeps({ getById: vi.fn().mockResolvedValue(dashboard) }),
      });

    expect(outcome).toEqual({ kind: "render", dashboard });
  });

  it("forwards a stale public id after a dashboard becomes workspace-only", async () => {
    const dashboard = _createDashboard({ visibility: "workspace", slug: "q3" });
    const outcome =
      await DashboardRouteResolver.makeDashboardRouteOutcomeFromPublicRoute({
        slugOrId: DASHBOARD_ID,
        deps: _createDeps({ getById: vi.fn().mockResolvedValue(dashboard) }),
      });

    expect(outcome).toEqual({
      kind: "redirectToWorkspace",
      workspaceSlug: "acme",
      slugOrId: "q3",
    });
  });

  it("forwards a stale public slug after a dashboard becomes workspace-only", async () => {
    const dashboard = _createDashboard({ visibility: "workspace", slug: "q3" });
    const findBySlug = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([dashboard]);
    const outcome =
      await DashboardRouteResolver.makeDashboardRouteOutcomeFromPublicRoute({
        slugOrId: "q3",
        deps: _createDeps({ findBySlug }),
      });

    expect(outcome).toEqual({
      kind: "redirectToWorkspace",
      workspaceSlug: "acme",
      slugOrId: "q3",
    });
    expect(findBySlug).toHaveBeenNthCalledWith(1, {
      slug: "q3",
      visibility: "public",
    });
    expect(findBySlug).toHaveBeenNthCalledWith(2, {
      slug: "q3",
      visibility: "workspace",
    });
  });

  it("makes anonymous missing and inaccessible links indistinguishable", async () => {
    // The inaccessible case must really exist as a workspace dashboard,
    // otherwise both halves would take the same missing-dashboard path and the
    // comparison below would only prove that a code path equals itself.
    const inaccessibleDashboard = _createDashboard({
      visibility: "workspace",
      slug: "q3",
    });
    const anonymousDeps = _createDeps({
      getById: vi.fn().mockResolvedValue(undefined),
      findBySlug: vi.fn().mockResolvedValue([]),
      isAuthenticated: vi.fn().mockResolvedValue(false),
    });
    const inaccessibleDeps = _createDeps({
      getById: vi.fn().mockResolvedValue(undefined),
      findBySlug: vi
        .fn()
        .mockImplementation(
          async (params: Readonly<{ visibility: "public" | "workspace" }>) => {
            return params.visibility === "workspace" ?
                [inaccessibleDashboard]
              : [];
          },
        ),
      isAuthenticated: vi.fn().mockResolvedValue(false),
    });

    const [missingOutcome, inaccessibleOutcome] = await Promise.all([
      DashboardRouteResolver.makeDashboardRouteOutcomeFromPublicRoute({
        slugOrId: "does-not-exist",
        deps: anonymousDeps,
      }),
      DashboardRouteResolver.makeDashboardRouteOutcomeFromPublicRoute({
        slugOrId: inaccessibleDashboard.slug ?? "q3",
        deps: inaccessibleDeps,
      }),
    ]);

    expect(missingOutcome).toEqual({ kind: "signIn" });
    expect(inaccessibleOutcome).toEqual({ kind: "signIn" });
    expect(inaccessibleOutcome).toEqual(missingOutcome);
  });

  it("does not guess between duplicate workspace slugs", async () => {
    const findBySlug = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        _createDashboard({ visibility: "workspace", slug: "q3" }),
        _createDashboard({
          visibility: "workspace",
          slug: "q3",
          workspaceId: OTHER_WORKSPACE_ID,
        }),
      ]);
    const outcome =
      await DashboardRouteResolver.makeDashboardRouteOutcomeFromPublicRoute({
        slugOrId: "q3",
        deps: _createDeps({ findBySlug }),
      });

    expect(outcome).toEqual({ kind: "denied" });
  });

  it("denies drafts because they have no viewer URL", async () => {
    const outcome =
      await DashboardRouteResolver.makeDashboardRouteOutcomeFromPublicRoute({
        slugOrId: DASHBOARD_ID,
        deps: _createDeps({
          getById: vi
            .fn()
            .mockResolvedValue(
              _createDashboard({ visibility: "draft", slug: "q3" }),
            ),
        }),
      });

    expect(outcome).toEqual({ kind: "denied" });
  });
});

describe("DashboardRouteResolver.makeDashboardRouteOutcomeFromWorkspaceRoute", () => {
  it("renders a workspace dashboard reached by its slug", async () => {
    const dashboard = _createDashboard({ visibility: "workspace", slug: "q3" });
    const outcome =
      await DashboardRouteResolver.makeDashboardRouteOutcomeFromWorkspaceRoute({
        slugOrId: "q3",
        workspaceSlug: "acme",
        deps: _createDeps({
          findBySlug: vi.fn().mockResolvedValue([dashboard]),
        }),
      });

    expect(outcome).toEqual({ kind: "render", dashboard });
  });

  it("forwards a stale workspace id after a dashboard becomes public", async () => {
    const dashboard = _createDashboard({ visibility: "public", slug: "q3" });
    const outcome =
      await DashboardRouteResolver.makeDashboardRouteOutcomeFromWorkspaceRoute({
        slugOrId: DASHBOARD_ID,
        workspaceSlug: "acme",
        deps: _createDeps({ getById: vi.fn().mockResolvedValue(dashboard) }),
      });

    expect(outcome).toEqual({ kind: "redirectToPublic", slugOrId: "q3" });
  });

  it("forwards a stale workspace slug after a dashboard becomes public", async () => {
    const dashboard = _createDashboard({ visibility: "public", slug: "q3" });
    const findBySlug = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([dashboard]);
    const outcome =
      await DashboardRouteResolver.makeDashboardRouteOutcomeFromWorkspaceRoute({
        slugOrId: "q3",
        workspaceSlug: "acme",
        deps: _createDeps({ findBySlug }),
      });

    expect(outcome).toEqual({ kind: "redirectToPublic", slugOrId: "q3" });
    expect(findBySlug).toHaveBeenNthCalledWith(1, {
      slug: "q3",
      visibility: "workspace",
      workspaceId: WORKSPACE_ID,
    });
    expect(findBySlug).toHaveBeenNthCalledWith(2, {
      slug: "q3",
      visibility: "public",
    });
  });

  it("denies a workspace dashboard id belonging to another workspace", async () => {
    const dashboard = _createDashboard({
      visibility: "workspace",
      slug: "q3",
      workspaceId: OTHER_WORKSPACE_ID,
    });
    const outcome =
      await DashboardRouteResolver.makeDashboardRouteOutcomeFromWorkspaceRoute({
        slugOrId: DASHBOARD_ID,
        workspaceSlug: "acme",
        deps: _createDeps({ getById: vi.fn().mockResolvedValue(dashboard) }),
      });

    expect(outcome).toEqual({ kind: "denied" });
  });

  it("denies a non-member before looking up a dashboard", async () => {
    const getById = vi.fn().mockResolvedValue(undefined);
    const findBySlug = vi.fn().mockResolvedValue([]);
    const outcome =
      await DashboardRouteResolver.makeDashboardRouteOutcomeFromWorkspaceRoute({
        slugOrId: "q3",
        workspaceSlug: "not-mine",
        deps: _createDeps({ getById, findBySlug }),
      });

    expect(outcome).toEqual({ kind: "denied" });
    expect(getById).not.toHaveBeenCalled();
    expect(findBySlug).not.toHaveBeenCalled();
  });

  it("canonicalizes a workspace id onto its slug URL", async () => {
    const dashboard = _createDashboard({ visibility: "workspace", slug: "q3" });
    const outcome =
      await DashboardRouteResolver.makeDashboardRouteOutcomeFromWorkspaceRoute({
        slugOrId: DASHBOARD_ID,
        workspaceSlug: "acme",
        deps: _createDeps({ getById: vi.fn().mockResolvedValue(dashboard) }),
      });

    expect(outcome).toEqual({
      kind: "redirectToWorkspace",
      workspaceSlug: "acme",
      slugOrId: "q3",
    });
  });

  it("denies a draft reached through a workspace URL", async () => {
    const outcome =
      await DashboardRouteResolver.makeDashboardRouteOutcomeFromWorkspaceRoute({
        slugOrId: DASHBOARD_ID,
        workspaceSlug: "acme",
        deps: _createDeps({
          getById: vi
            .fn()
            .mockResolvedValue(
              _createDashboard({ visibility: "draft", slug: "q3" }),
            ),
        }),
      });

    expect(outcome).toEqual({ kind: "denied" });
  });
});
