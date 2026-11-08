import { extractDashboardTiles } from "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/extractDashboardTiles";
import { parseAgentPageRoute } from "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/parseAgentPageRoute";
import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";
import type { AgentPageContext } from "$/agent/pageContext/AgentPageContext";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type { AgentPageRoute } from "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/parseAgentPageRoute";
import type { DashboardEditorAppState } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";

/** Loads names the page state does not hold, with the user's own access. */
export type AgentPageNameLoader = {
  getDashboard: (
    id: string,
  ) => Promise<{ name: string; config: unknown } | undefined>;
  getMapName: (id: string) => Promise<string | undefined>;
  getCaseTypeName: (id: string) => Promise<string | undefined>;
};

type CreateAgentPageContextOptions = {
  pathname: string;
  chatPageContext: ChatPageContext.T;
  dashboardEditorState: Pick<
    DashboardEditorAppState,
    "activeDashboardId" | "editorData"
  >;
  datasets: readonly DataAgentDataset[];
  loader: AgentPageNameLoader;
};

/** A name the page can do without: a failed load leaves it out. */
async function _tryLoad<T>(load: () => Promise<T>): Promise<T | undefined> {
  try {
    return await load();
  } catch {
    return undefined;
  }
}

function _findDataset(
  datasets: readonly DataAgentDataset[],
  id: string | undefined,
): AgentPageContext["dataset"] {
  const dataset = datasets.find((candidate) => {
    return candidate.id === id;
  });
  return dataset ? { id: dataset.id, name: dataset.name } : undefined;
}

async function _readDashboard(
  id: string,
  options: Readonly<CreateAgentPageContextOptions>,
): Promise<AgentPageContext["dashboard"]> {
  const { activeDashboardId, editorData } = options.dashboardEditorState;
  if (activeDashboardId === id && editorData) {
    return {
      id,
      name: String(editorData.root?.props?.title ?? ""),
      tiles: extractDashboardTiles(editorData),
    };
  }
  const saved = await _tryLoad(() => {
    return options.loader.getDashboard(id);
  });
  return saved
    ? { id, name: saved.name, tiles: extractDashboardTiles(saved.config) }
    : undefined;
}

async function _readNamed(
  id: string | undefined,
  load: (id: string) => Promise<string | undefined>,
): Promise<{ id: string; name: string } | undefined> {
  if (!id) {
    return undefined;
  }
  const name = await _tryLoad(() => {
    return load(id);
  });
  return name ? { id, name } : undefined;
}

function _readExplorer(
  chatPageContext: ChatPageContext.T,
): AgentPageContext["explorer"] {
  return {
    ...(chatPageContext.lastSql ? { sql: chatPageContext.lastSql } : {}),
    resultColumns: chatPageContext.lastResultColumns ?? [],
  };
}

async function _readPageParts(
  route: AgentPageRoute,
  options: Readonly<CreateAgentPageContextOptions>,
): Promise<Omit<AgentPageContext, "app">> {
  const { chatPageContext, datasets, loader } = options;
  switch (route.app) {
    case "data-explorer":
      return {
        dataset: _findDataset(datasets, chatPageContext.openDatasetId),
        explorer: _readExplorer(chatPageContext),
      };
    case "dataset":
      return { dataset: _findDataset(datasets, route.id) };
    case "dashboard":
      return { dashboard: await _readDashboard(route.id!, options) };
    case "map":
      return {
        map: await _readNamed(route.id, (id) => {
          return loader.getMapName(id);
        }),
      };
    case "case-type":
    case "case":
      return {
        caseType: await _readNamed(route.parentId ?? route.id, (id) => {
          return loader.getCaseTypeName(id);
        }),
      };
    default:
      return {};
  }
}

/** Drops keys whose value is undefined, so contexts compare cleanly. */
function _withoutEmpty(context: AgentPageContext): AgentPageContext {
  return Object.fromEntries(
    Object.entries(context).filter(([, value]) => {
      return value !== undefined;
    }),
  ) as AgentPageContext;
}

/**
 * What is on screen when the user sends a message, for the agent's page
 * block: the route, the Data Explorer's state, the dashboard editor's live
 * data, and names loaded with the user's access. A name that fails to load
 * is left out rather than failing the turn. A case contributes only its
 * case type, never the case's own name.
 */
export async function createAgentPageContext(
  options: Readonly<CreateAgentPageContextOptions>,
): Promise<AgentPageContext> {
  const route = parseAgentPageRoute(options.pathname);
  const parts = await _readPageParts(route, options);
  return _withoutEmpty({ app: route.app, ...parts });
}
