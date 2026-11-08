import { extractDashboardTiles } from "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/extractDashboardTiles";
import { parseAgentPageRoute } from "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/parseAgentPageRoute";
import { upgradeAvaPageData } from "@/views/DashboardApp/AvaPage/utils/upgradeAvaPageData";
import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";
import type {
  AgentPageContext,
  AgentPageTile,
} from "$/agent/pageContext/AgentPageContext";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type { AgentPageRoute } from "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/parseAgentPageRoute";
import type { AvaPageGenericData } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { DashboardEditorAppState } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";

/**
 * Loads names the page state does not hold, with the user's own access. The
 * chat runtime builds one per workspace and passes it in on every turn, so
 * the agent's page block can name the dashboard, map, or case type on
 * screen. `getDashboard` takes a dashboard's id or its slug, since
 * published dashboards open at `/d/<slug>`, and may return the real id.
 */
export type AgentPageNameLoader = {
  getDashboard: (
    idOrSlug: string,
  ) => Promise<{ id?: string; name: string; config: unknown } | undefined>;
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

/** Shown when neither the editor nor the saved dashboard has a name. */
const UNTITLED_DASHBOARD_NAME = "Untitled dashboard";

/** Tiles of the editor's live data, or none when they cannot be read. */
function _extractEditorTiles(editorData: unknown): readonly AgentPageTile[] {
  try {
    return extractDashboardTiles(editorData);
  } catch {
    return [];
  }
}

/** Tiles of a saved config, or none when it cannot be upgraded. */
function _extractSavedTiles(config: unknown): readonly AgentPageTile[] {
  try {
    return extractDashboardTiles(
      upgradeAvaPageData(config as AvaPageGenericData),
    );
  } catch {
    return [];
  }
}

async function _loadSavedDashboard(
  idOrSlug: string,
  loader: AgentPageNameLoader,
): Promise<AgentPageContext["dashboard"]> {
  return await _tryLoad(async () => {
    const dashboard = await loader.getDashboard(idOrSlug);
    return dashboard
      ? {
          id: dashboard.id ?? idOrSlug,
          name: dashboard.name,
          tiles: _extractSavedTiles(dashboard.config),
        }
      : undefined;
  });
}

async function _readDashboard(
  idOrSlug: string,
  options: Readonly<CreateAgentPageContextOptions>,
): Promise<AgentPageContext["dashboard"]> {
  const { activeDashboardId, editorData } = options.dashboardEditorState;
  if (activeDashboardId !== idOrSlug || !editorData) {
    return await _loadSavedDashboard(idOrSlug, options.loader);
  }
  const editorTitle = String(editorData.root?.props?.title ?? "").trim();
  const savedName = editorTitle
    ? undefined
    : (
        await _tryLoad(() => {
          return options.loader.getDashboard(idOrSlug);
        })
      )?.name;
  return {
    id: idOrSlug,
    name: editorTitle || savedName || UNTITLED_DASHBOARD_NAME,
    tiles: _extractEditorTiles(editorData),
  };
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

function _readCaseType(
  caseTypeId: string,
  loader: AgentPageNameLoader,
): Promise<AgentPageContext["caseType"]> {
  return _readNamed(caseTypeId, (id) => {
    return loader.getCaseTypeName(id);
  });
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
      return { dashboard: await _readDashboard(route.id, options) };
    case "map":
      return {
        map: await _readNamed(route.id, (id) => {
          return loader.getMapName(id);
        }),
      };
    case "case-type":
      return { caseType: await _readCaseType(route.id, loader) };
    case "case":
      return { caseType: await _readCaseType(route.parentId, loader) };
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
