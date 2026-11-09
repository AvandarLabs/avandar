import { excludeUndefinedShallow } from "@avandar/utils";
import type { AnalyticsEventPayloads } from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type { ChatGeneratedDashboardBlock } from "$/types/chat.types";
import type { ChatRuntimeMode } from "$/types/offlineChat.types";
import type { DashboardEditorAppState } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";

type FromMessageOptions = {
  /** The message as the model reads it, with mentions named. */
  content: string;
  pageContext: ChatPageContext.T;
  runtimeMode: ChatRuntimeMode;
  /** Gadgets the message mentions. Counted, never named. */
  mentionCount?: number;
  /** Gadgets attached to the chat. Counted, never named. */
  attachedCount?: number;
};

function _fromMessage(
  options: Readonly<FromMessageOptions>,
): AnalyticsEventPayloads["chat.message_sent"] {
  return excludeUndefinedShallow({
    promptChars: options.content.length,
    pageApp: options.pageContext.app,
    runtimeMode: options.runtimeMode.kind === "local" ? "local" : "cloud",
    hasOpenDataset: options.pageContext.openDatasetId !== undefined,
    mentionCount: options.mentionCount,
    attachedCount: options.attachedCount,
  });
}

function _fromSql(sql: string): AnalyticsEventPayloads["chat.sql_generated"] {
  return { sqlChars: sql.length };
}

function _fromDashboardBlock(
  options: Readonly<{
    block: ChatGeneratedDashboardBlock;
    pageContext: ChatPageContext.T;
    editorState: DashboardEditorAppState;
  }>,
): AnalyticsEventPayloads["dashboard.block_added_via_chat"] {
  const dashboardId = options.pageContext.dashboardId;
  const editorData =
    dashboardId === options.editorState.activeDashboardId
      ? options.editorState.editorData
      : undefined;
  const blockCountAfter = editorData
    ? editorData.content.length + 1
    : undefined;

  return excludeUndefinedShallow({
    blockKind: options.block.kind,
    vizType:
      options.block.kind === "DataViz" ? options.block.vizType : undefined,
    dashboardId: dashboardId || undefined,
    blockCountAfter,
  });
}

/** Privacy-safe payload builders for browser chat analytics. */
export const ChatAnalyticsPayloads = {
  fromMessage: _fromMessage,
  fromSql: _fromSql,
  fromDashboardBlock: _fromDashboardBlock,
};
