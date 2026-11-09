import { isPlainObject, isString } from "@avandar/utils";
import { useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";
import { collectDataVizNodes } from "@/clients/dashboards/findDashboardTile/findDashboardTile";
import { parseAgentPageRoute } from "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/parseAgentPageRoute";
import { useChatPageContext } from "@/components/ChatPanel/useChatPageContext";
import { DashboardEditorStateManager } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { DashboardEditorAppState } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";

const UUID_SHAPED =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/** Charts from the open dashboard the picker lists before any search. */
const MAX_PAGE_TILE_REFS = 12;

type BuildChatContextPageRefsOptions = Readonly<{
  pathname: string;
  chatPageContext: ChatPageContext.T;
  dashboardEditorState: Pick<
    DashboardEditorAppState,
    "activeDashboardId" | "editorData"
  >;
}>;

function _hasPrompt(nlQuery: unknown): boolean {
  if (!isPlainObject(nlQuery)) {
    return false;
  }
  const prompt: unknown = nlQuery["prompt"];
  return isString(prompt) && prompt.trim() !== "";
}

function _buildTileRefs(
  dashboardId: string,
  editorData: unknown,
): Gadget.Ref[] {
  return collectDataVizNodes(editorData)
    .flatMap(({ props }): Gadget.Ref[] => {
      const id = props["id"];
      return isString(id) && _hasPrompt(props["nlQuery"])
        ? [{ gadgetType: "dashboard_tile", gadgetId: dashboardId, subId: id }]
        : [];
    })
    .slice(0, MAX_PAGE_TILE_REFS);
}

/** A ref to one gadget by id, or nothing when the id is not a uuid. */
function _buildSingleRef(
  gadgetType: Gadget.Type,
  id: string | undefined,
): Gadget.Ref[] {
  return id !== undefined && UUID_SHAPED.test(id)
    ? [{ gadgetType, gadgetId: id.toLowerCase(), subId: null }]
    : [];
}

function _buildDashboardRefs(
  dashboardId: string,
  editorState: BuildChatContextPageRefsOptions["dashboardEditorState"],
): Gadget.Ref[] {
  const dashboardRefs = _buildSingleRef("dashboard", dashboardId);
  const isEditorOnThisDashboard =
    dashboardRefs.length > 0 && editorState.activeDashboardId === dashboardId;
  return isEditorOnThisDashboard
    ? [
        ...dashboardRefs,
        ..._buildTileRefs(dashboardId.toLowerCase(), editorState.editorData),
      ]
    : dashboardRefs;
}

/**
 * What the context picker lists under "On this page": the open dashboard
 * and its charts (from the editor's live data, only charts with a prompt,
 * as gadget search does, at most 12), or the open dataset, map, or case
 * type. A dashboard opened by its published slug lists nothing, since the
 * picker needs its id. A case lists its case type, never the case itself.
 */
export function buildChatContextPageRefs(
  options: BuildChatContextPageRefsOptions,
): Gadget.Ref[] {
  const route = parseAgentPageRoute(options.pathname);
  switch (route.app) {
    case "dashboard":
      return _buildDashboardRefs(route.id, options.dashboardEditorState);
    case "data-explorer":
      return _buildSingleRef("dataset", options.chatPageContext.openDatasetId);
    case "dataset":
      return _buildSingleRef("dataset", route.id);
    case "map":
      return _buildSingleRef("map", route.id);
    case "case-type":
      return _buildSingleRef("concept", route.id);
    case "case":
      return _buildSingleRef("concept", route.parentId);
    default:
      return [];
  }
}

/** The gadgets on the current page that the context picker offers first. */
export function useChatContextPageRefs(): Gadget.Ref[] {
  const pathname = useRouterState({
    select: (state) => {
      return state.location.pathname;
    },
  });
  const chatPageContext = useChatPageContext();
  const { activeDashboardId, editorData } =
    DashboardEditorStateManager.useState();
  return useMemo(() => {
    return buildChatContextPageRefs({
      pathname,
      chatPageContext,
      dashboardEditorState: { activeDashboardId, editorData },
    });
  }, [pathname, chatPageContext, activeDashboardId, editorData]);
}
