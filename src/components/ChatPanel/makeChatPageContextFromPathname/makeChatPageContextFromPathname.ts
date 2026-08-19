import { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";

/**
 * Inputs for mapping a workspace pathname and explorer state into page
 * context.
 */
export type MakeChatPageContextFromPathnameOptions = {
  pathname: string;
  openDatasetId?: string;
  lastSql?: string;
  lastResultColumns?: ChatPageContext.ResultColumn[];
  lastError?: string;
};

/** Maps a workspace pathname plus explorer state into ChatPageContext. */
export function makeChatPageContextFromPathname(
  options: Readonly<MakeChatPageContextFromPathnameOptions>,
): ChatPageContext.T {
  const { pathname, openDatasetId, lastSql, lastResultColumns, lastError } =
    options;

  if (pathname.includes("/data-explorer")) {
    return ChatPageContext.createDataExplorerViewContext({
      openDatasetId,
      lastSql,
      lastResultColumns,
      lastError,
    });
  }
  if (pathname.includes("/dashboards")) {
    const dashboardId = pathname.match(
      /\/dashboards\/edit\/([0-9a-f-]{36})/i,
    )?.[1];
    return ChatPageContext.createDashboardsViewContext({ dashboardId });
  }
  if (
    pathname.includes("/data-manager") ||
    pathname.includes("/data-import") ||
    pathname.includes("/data-sources")
  ) {
    return ChatPageContext.createDataSourcesViewContext();
  }
  return ChatPageContext.createOtherViewContext();
}
