import type { AgentPageApp } from "$/agent/pageContext/AgentPageContext";

type AgentPageAppWithId = "dashboard" | "dataset" | "map" | "case-type";

/**
 * The page a pathname shows, and the ids in it. The chat runtime reads this
 * on every turn to decide what the agent's page block describes. A
 * dashboard's `id` may be a slug: `/d/<slugOrId>` is the viewer URL of a
 * published dashboard.
 */
export type AgentPageRoute =
  | { app: AgentPageAppWithId; id: string }
  /** A case: its own id, and its case type's id. */
  | { app: "case"; id: string; parentId: string }
  | { app: Exclude<AgentPageApp, AgentPageAppWithId | "case"> };

type RouteEntry = {
  pattern: RegExp;
  toRoute: (captures: readonly string[]) => AgentPageRoute;
};

const UUID = "([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})";
const END = "(?:/|$)";

function _appRoute(app: "data-explorer" | "dashboards" | "case-manager") {
  return (): AgentPageRoute => {
    return { app };
  };
}

function _idRoute(app: AgentPageAppWithId) {
  return ([id = ""]: readonly string[]): AgentPageRoute => {
    return { app, id };
  };
}

/** Most specific first. Every pathname starts with the workspace slug. */
const ROUTES: readonly RouteEntry[] = [
  {
    pattern: new RegExp(`^/[^/]+/data-explorer${END}`),
    toRoute: _appRoute("data-explorer"),
  },
  {
    pattern: new RegExp(
      `^/[^/]+/dashboards/(?:edit|preview)/${UUID}${END}`,
      "i",
    ),
    toRoute: _idRoute("dashboard"),
  },
  {
    pattern: new RegExp(`^/[^/]+/d/([^/]+)${END}`),
    toRoute: _idRoute("dashboard"),
  },
  {
    pattern: new RegExp(`^/[^/]+/dashboards${END}`),
    toRoute: _appRoute("dashboards"),
  },
  {
    pattern: new RegExp(`^/[^/]+/data-manager/${UUID}${END}`, "i"),
    toRoute: _idRoute("dataset"),
  },
  {
    pattern: new RegExp(`^/[^/]+/data-(?:manager|import|sources)${END}`),
    toRoute: () => {
      return { app: "data-sources" };
    },
  },
  {
    pattern: new RegExp(`^/[^/]+/map/${UUID}${END}`, "i"),
    toRoute: _idRoute("map"),
  },
  {
    pattern: new RegExp(
      `^/[^/]+/individual-manager/${UUID}/${UUID}${END}`,
      "i",
    ),
    toRoute: ([parentId = "", id = ""]) => {
      return { app: "case", id, parentId };
    },
  },
  {
    pattern: new RegExp(`^/[^/]+/individual-manager/${UUID}${END}`, "i"),
    toRoute: _idRoute("case-type"),
  },
  {
    pattern: new RegExp(`^/[^/]+/ontology-designer${END}`),
    toRoute: _appRoute("case-manager"),
  },
];

/**
 * Reads which page a workspace pathname shows. A case's route holds its
 * case type id first and its own id second.
 */
export function parseAgentPageRoute(pathname: string): AgentPageRoute {
  for (const { pattern, toRoute } of ROUTES) {
    const match = pathname.match(pattern);
    if (match) {
      return toRoute(match.slice(1));
    }
  }
  return { app: "other" };
}
