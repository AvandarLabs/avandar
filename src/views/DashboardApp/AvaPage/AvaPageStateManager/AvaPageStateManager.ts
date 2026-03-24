import { AvaRouter } from "@/config/AvaRouter";
import { createAppStateManager } from "@/lib/utils/state/createAppStateManager";
import type { Workspace } from "$/models/Workspace/Workspace";

type AvaPageState = {
  access: { mode: "public" } | { mode: "workspace"; workspaceId: Workspace.Id };
};

const WORKSPACE_LAYOUT_ROUTE_ID = "/_auth/$workspaceSlug";

/**
 * Reads optional `workspaceId` from the current URL search string.
 */
function _getWorkspaceIdFromSearch(
  searchStr: string,
): Workspace.Id | undefined {
  const trimmed = searchStr.startsWith("?") ? searchStr.slice(1) : searchStr;
  const workspaceId = new URLSearchParams(trimmed).get("workspaceId");

  if (!workspaceId) {
    return undefined;
  }

  return workspaceId as Workspace.Id;
}

/**
 * Derives AvaPage access mode from TanStack Router's current URL state.
 *
 * Uses `AvaRouter.state` so this can run inside `useReducer` init (no hooks).
 */
function _getInitialAccessFromRouter(): AvaPageState["access"] {
  const { location, matches } = AvaRouter.state;
  const workspaceIdFromSearch = _getWorkspaceIdFromSearch(location.searchStr);

  // first we check if the URL search params already give us the info we need
  // to determine if we are in a public or workspace dashboard
  if (workspaceIdFromSearch) {
    return { mode: "workspace", workspaceId: workspaceIdFromSearch };
  }

  if (location.pathname.startsWith("/public/dashboards/")) {
    return { mode: "public" };
  }

  const workspaceLayoutMatch = matches.find((match) => {
    return match.routeId === WORKSPACE_LAYOUT_ROUTE_ID;
  });
  const workspaceFromLoader = workspaceLayoutMatch?.loaderData as
    | Workspace.WithSubscription
    | undefined;

  if (workspaceFromLoader?.id) {
    return { mode: "workspace", workspaceId: workspaceFromLoader.id };
  }

  throw new Error("No access mode found");
}

export const AvaPageStateManager = createAppStateManager({
  name: "AvaPage",
  initArg: undefined,
  initFn: (): AvaPageState => {
    return {
      access: _getInitialAccessFromRouter(),
    };
  },
  actions: {},
});
