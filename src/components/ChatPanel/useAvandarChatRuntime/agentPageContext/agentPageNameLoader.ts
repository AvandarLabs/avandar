import { DashboardClient } from "@/clients/dashboards/DashboardClient/DashboardClient";
import { AvaMapClient } from "@/clients/maps/AvaMapClient/AvaMapClient";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { AgentPageNameLoader } from "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/createAgentPageContext";

const UUID_SHAPED =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/**
 * Loads the dashboard, map, and case type names that the chat runtime's
 * per-turn page block shows, with the user's own session, so RLS decides
 * what the agent may name. A row from another workspace counts as missing,
 * as in the gadget summaries: a route can name any uuid or slug. A dashboard
 * route segment that is not a uuid is a slug, looked up among this
 * workspace's workspace-visibility dashboards, the only ones the `/d/` route
 * renders by slug.
 */
export function createAgentPageNameLoader(
  workspaceId: Workspace.Id,
): AgentPageNameLoader {
  const inWorkspace = <T extends { workspaceId: string }>(
    row: T | undefined,
  ): T | undefined => {
    return row?.workspaceId === workspaceId ? row : undefined;
  };
  return {
    getDashboard: async (idOrSlug) => {
      const row = UUID_SHAPED.test(idOrSlug)
        ? await DashboardClient.getById({ id: idOrSlug as Dashboard.Id })
        : (
            await DashboardClient.getAll({
              where: {
                slug: { eq: idOrSlug },
                visibility: { eq: "workspace" },
                workspace_id: { eq: workspaceId },
              },
            })
          )[0];
      const dashboard = inWorkspace(row);
      return dashboard
        ? {
            id: dashboard.id,
            name: dashboard.name,
            config: dashboard.config,
          }
        : undefined;
    },
    getMapName: async (id) => {
      return inWorkspace(await AvaMapClient.getById({ id: id as AvaMap.Id }))
        ?.name;
    },
    getCaseTypeName: async (id) => {
      return inWorkspace(await ConceptClient.getById({ id: id as Concept.Id }))
        ?.name;
    },
  };
}
