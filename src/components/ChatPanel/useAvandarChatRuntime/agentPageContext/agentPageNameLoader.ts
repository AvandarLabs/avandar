import { DashboardClient } from "@/clients/dashboards/DashboardClient/DashboardClient";
import { AvaMapClient } from "@/clients/maps/AvaMapClient/AvaMapClient";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { AgentPageNameLoader } from "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/createAgentPageContext";

/**
 * Loads page names with the user's own session, so RLS decides what the
 * agent may name. A row from another workspace counts as missing, as in the
 * gadget summaries: a route can name any uuid.
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
    getDashboard: async (id) => {
      const dashboard = inWorkspace(
        await DashboardClient.getById({ id: id as Dashboard.Id }),
      );
      return dashboard
        ? { name: dashboard.name, config: dashboard.config }
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
