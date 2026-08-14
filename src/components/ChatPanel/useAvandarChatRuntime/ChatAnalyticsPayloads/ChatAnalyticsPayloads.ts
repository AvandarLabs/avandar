import type { DashboardEditorAppState } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import type { AnalyticsEventPayloads } from "$/analytics/analyticsEvents/analyticsEvents";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type { ChatGeneratedDashboardBlock } from "$/types/chat.types";
import type { ChatRuntimeMode } from "$/types/offlineChat.types";

function _fromMessage(options: {
  content: string;
  pageContext: ChatPageContext.T;
  selectedModelId?: string;
  runtimeMode: ChatRuntimeMode;
}): AnalyticsEventPayloads["chat.message_sent"] {
  return {
    promptChars: options.content.length,
    pageApp: options.pageContext.app,
    ...(options.selectedModelId ? { modelId: options.selectedModelId } : {}),
    runtimeMode: options.runtimeMode.kind === "local" ? "local" : "cloud",
    hasOpenDataset: options.pageContext.openDatasetId !== undefined,
  };
}

function _fromSql(sql: string): AnalyticsEventPayloads["chat.sql_generated"] {
  return { sqlChars: sql.length };
}

function _fromDashboardBlock(options: {
  block: ChatGeneratedDashboardBlock;
  pageContext: ChatPageContext.T;
  editorState: DashboardEditorAppState;
}): AnalyticsEventPayloads["dashboard.block_added_via_chat"] {
  const dashboardId = options.pageContext.dashboardId;
  const editorData =
    dashboardId === options.editorState.activeDashboardId ?
      options.editorState.editorData
    : undefined;
  const blockCountAfter =
    editorData ? editorData.content.length + 1 : undefined;

  return {
    blockKind: options.block.kind,
    ...(options.block.kind === "DataViz" ?
      { vizType: options.block.vizType }
    : {}),
    ...(dashboardId ? { dashboardId } : {}),
    ...(blockCountAfter !== undefined ? { blockCountAfter } : {}),
  };
}

/** Privacy-safe payload builders for browser chat analytics. */
export const ChatAnalyticsPayloads = {
  fromMessage: _fromMessage,
  fromSql: _fromSql,
  fromDashboardBlock: _fromDashboardBlock,
};
