import { matchLiteral, propEq } from "@avandar/utils";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Workspace } from "$/models/Workspace/Workspace";

const UUID_SHAPED =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

/** Whether a route segment belongs to the dashboard ID namespace. */
function _isUuidShaped(value: string): boolean {
  return UUID_SHAPED.test(value);
}

/** The action a dashboard viewer route must take for a route segment. */
export type DashboardRouteOutcome =
  | { kind: "render"; dashboard: Dashboard.T }
  | { kind: "redirectToPublic"; slugOrId: string }
  | { kind: "redirectToWorkspace"; workspaceSlug: string; slugOrId: string }
  | { kind: "signIn" }
  | { kind: "denied" };

/** A workspace that the current viewer belongs to. */
export type ViewerWorkspace = { id: Workspace.Id; slug: string };

type WorkspaceRouteOutcomeOptions = {
  candidate: Dashboard.T;
  workspace: ViewerWorkspace;
  workspaceSlug: string;
  slugOrId: string;
};

/** The data reads required by dashboard viewer-route resolution. */
export type IDashboardRouteUtils = {
  getById: (id: Dashboard.Id) => Promise<Dashboard.T | undefined>;
  findBySlug: (
    params: Readonly<{
      slug: string;
      visibility: "public" | "workspace";
      workspaceId?: Workspace.Id;
    }>,
  ) => Promise<Dashboard.T[]>;
  getViewerWorkspaces: () => Promise<ViewerWorkspace[]>;
  isAuthenticated: () => Promise<boolean>;
};

function _getDashboardIdFromSlugOrId(slugOrId: string): Dashboard.Id {
  return slugOrId as Dashboard.Id;
}

async function _buildWorkspaceRedirect(
  params: Readonly<{
    dashboard: Dashboard.T;
    deps: IDashboardRouteUtils;
  }>,
): Promise<DashboardRouteOutcome> {
  const { dashboard, deps } = params;
  const workspace = (await deps.getViewerWorkspaces()).find(
    propEq("id", dashboard.workspaceId),
  );

  if (workspace === undefined) {
    return (await deps.isAuthenticated()) ?
        { kind: "denied" }
      : { kind: "signIn" };
  }

  return {
    kind: "redirectToWorkspace",
    workspaceSlug: workspace.slug,
    slugOrId: dashboard.slug ?? dashboard.id,
  };
}

async function _buildPublicMissOutcome(
  params: Readonly<{
    slugOrId: string;
    deps: IDashboardRouteUtils;
  }>,
): Promise<DashboardRouteOutcome> {
  const { slugOrId, deps } = params;

  if (!(await deps.isAuthenticated())) {
    return { kind: "signIn" };
  }

  if (_isUuidShaped(slugOrId)) {
    return { kind: "denied" };
  }

  const matchingWorkspaceDashboards = await deps.findBySlug({
    slug: slugOrId,
    visibility: "workspace",
  });
  const onlyMatchingWorkspaceDashboard =
    matchingWorkspaceDashboards.length === 1 ?
      matchingWorkspaceDashboards[0]
    : undefined;

  if (onlyMatchingWorkspaceDashboard === undefined) {
    return { kind: "denied" };
  }

  return await _buildWorkspaceRedirect({
    dashboard: onlyMatchingWorkspaceDashboard,
    deps,
  });
}

/** Resolves the canonical public dashboard URL, `/d/<slugOrId>`. */
async function _makeDashboardRouteOutcomeFromPublicRoute(
  params: Readonly<{ slugOrId: string; deps: IDashboardRouteUtils }>,
): Promise<DashboardRouteOutcome> {
  const { slugOrId, deps } = params;
  const candidate =
    _isUuidShaped(slugOrId) ?
      await deps.getById(_getDashboardIdFromSlugOrId(slugOrId))
    : (await deps.findBySlug({ slug: slugOrId, visibility: "public" }))[0];

  if (candidate === undefined) {
    return await _buildPublicMissOutcome({ slugOrId, deps });
  }

  return await matchLiteral(candidate.visibility, {
    public: (): DashboardRouteOutcome => {
      if (candidate.slug !== undefined && candidate.slug !== slugOrId) {
        return { kind: "redirectToPublic", slugOrId: candidate.slug };
      }

      return { kind: "render", dashboard: candidate };
    },
    workspace: async (): Promise<DashboardRouteOutcome> => {
      return await _buildWorkspaceRedirect({ dashboard: candidate, deps });
    },
    draft: (): DashboardRouteOutcome => {
      return { kind: "denied" };
    },
  });
}

async function _getWorkspaceRouteCandidate(
  params: Readonly<{
    slugOrId: string;
    workspace: ViewerWorkspace;
    deps: IDashboardRouteUtils;
  }>,
): Promise<Dashboard.T | undefined> {
  const { slugOrId, workspace, deps } = params;

  if (_isUuidShaped(slugOrId)) {
    return await deps.getById(_getDashboardIdFromSlugOrId(slugOrId));
  }

  const workspaceDashboard = (
    await deps.findBySlug({
      slug: slugOrId,
      visibility: "workspace",
      workspaceId: workspace.id,
    })
  )[0];

  return (
    workspaceDashboard ??
    (await deps.findBySlug({ slug: slugOrId, visibility: "public" }))[0]
  );
}

function _buildWorkspaceRouteOutcome(
  params: Readonly<WorkspaceRouteOutcomeOptions>,
): DashboardRouteOutcome {
  const { candidate, workspace, workspaceSlug, slugOrId } = params;

  return matchLiteral(candidate.visibility, {
    public: (): DashboardRouteOutcome => {
      return {
        kind: "redirectToPublic",
        slugOrId: candidate.slug ?? candidate.id,
      };
    },
    workspace: (): DashboardRouteOutcome => {
      if (candidate.workspaceId !== workspace.id) {
        return { kind: "denied" };
      }

      if (candidate.slug !== undefined && candidate.slug !== slugOrId) {
        return {
          kind: "redirectToWorkspace",
          workspaceSlug,
          slugOrId: candidate.slug,
        };
      }

      return { kind: "render", dashboard: candidate };
    },
    draft: (): DashboardRouteOutcome => {
      return { kind: "denied" };
    },
  });
}

/** Resolves the workspace dashboard URL, `/<workspaceSlug>/d/<slugOrId>`. */
async function _makeDashboardRouteOutcomeFromWorkspaceRoute(
  params: Readonly<{
    slugOrId: string;
    workspaceSlug: string;
    deps: IDashboardRouteUtils;
  }>,
): Promise<DashboardRouteOutcome> {
  const { slugOrId, workspaceSlug, deps } = params;
  const workspace = (await deps.getViewerWorkspaces()).find(
    propEq("slug", workspaceSlug),
  );

  if (workspace === undefined) {
    return { kind: "denied" };
  }

  const candidate = await _getWorkspaceRouteCandidate({
    slugOrId,
    workspace,
    deps,
  });

  if (candidate === undefined) {
    return { kind: "denied" };
  }

  return _buildWorkspaceRouteOutcome({
    candidate,
    workspace,
    workspaceSlug,
    slugOrId,
  });
}

/** Resolves public and workspace dashboard viewer routes. */
export const DashboardRouteResolver = {
  /** Returns whether a route segment belongs to the dashboard ID namespace. */
  isUuidShaped: _isUuidShaped,
  /** Resolves the canonical public dashboard route. */
  makeDashboardRouteOutcomeFromPublicRoute:
    _makeDashboardRouteOutcomeFromPublicRoute,
  /** Resolves the canonical workspace dashboard route. */
  makeDashboardRouteOutcomeFromWorkspaceRoute:
    _makeDashboardRouteOutcomeFromWorkspaceRoute,
};
