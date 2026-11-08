import type { AgentPageApp } from "$/agent/pageContext/AgentPageContext";

/** The page a pathname shows, and the ids in it. */
export type AgentPageRoute = {
  app: AgentPageApp;
  id?: string;
  /** For a case: its case type's id. */
  parentId?: string;
};

const UUID = "([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})";

/** Most specific first. Every pathname starts with the workspace slug. */
const ROUTES: ReadonlyArray<{ app: AgentPageApp; pattern: RegExp }> = [
  { app: "data-explorer", pattern: /^\/[^/]+\/data-explorer(?:\/|$)/ },
  {
    app: "dashboard",
    pattern: new RegExp(`^/[^/]+/dashboards/(?:edit|preview)/${UUID}`, "i"),
  },
  { app: "dashboard", pattern: new RegExp(`^/[^/]+/d/${UUID}`, "i") },
  { app: "dashboards", pattern: /^\/[^/]+\/dashboards(?:\/|$)/ },
  { app: "dataset", pattern: new RegExp(`^/[^/]+/data-manager/${UUID}`, "i") },
  {
    app: "data-sources",
    pattern: /^\/[^/]+\/data-(?:manager|import|sources)(?:\/|$)/,
  },
  { app: "map", pattern: new RegExp(`^/[^/]+/map/${UUID}`, "i") },
  {
    app: "case",
    pattern: new RegExp(`^/[^/]+/individual-manager/${UUID}/${UUID}`, "i"),
  },
  {
    app: "case-type",
    pattern: new RegExp(`^/[^/]+/individual-manager/${UUID}`, "i"),
  },
  { app: "case-manager", pattern: /^\/[^/]+\/ontology-designer(?:\/|$)/ },
];

/**
 * Reads which page a workspace pathname shows. A case's route holds its
 * case type id first and its own id second.
 */
export function parseAgentPageRoute(pathname: string): AgentPageRoute {
  for (const route of ROUTES) {
    const match = pathname.match(route.pattern);
    if (!match) {
      continue;
    }
    if (route.app === "case") {
      return { app: "case", id: match[2]!, parentId: match[1]! };
    }
    return match[1] ? { app: route.app, id: match[1] } : { app: route.app };
  }
  return { app: "other" };
}
