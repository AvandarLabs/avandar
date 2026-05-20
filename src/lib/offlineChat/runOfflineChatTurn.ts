import { fetchOfflineChatSchema } from "./fetchOfflineChatSchema";
import { OfflineChatResourceManager } from "./OfflineChatResourceManager";
import { readStoredLocalChatModelId } from "./localChatModelStore";
import { formatOfflinePhaseAssistantText } from "./formatOfflinePhaseAssistantText";
import { runOfflineChatPipeline } from "./runOfflineChatPipeline";
import type { OfflineChatTurnResult } from "./offlineChat.types";
import type { ChatClientMessage, ChatPageContext } from "$/types/chat.types";
import type { Workspace } from "$/models/Workspace/Workspace";

export type RunOfflineChatTurnArgs = {
  workspace: Workspace.T;
  pageContext: ChatPageContext;
  messages: readonly ChatClientMessage[];
  navigatorOnLine: boolean;
  executeSql?: (
    sql: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  onPhase?: (label: string) => void;
};

/**
 * Runs the full offline chat turn: schema, engine, multi-pass pipeline.
 */
export async function runOfflineChatTurn(
  args: RunOfflineChatTurnArgs,
): Promise<OfflineChatTurnResult> {
  const lastUserPrompt =
    [...args.messages].reverse().find((message) => {return message.role === "user"})
      ?.content ?? "";

  const schema = await fetchOfflineChatSchema({
    workspace: args.workspace,
    openDatasetId: args.pageContext.openDatasetId,
    navigatorOnLine: args.navigatorOnLine,
  });

  const modelId = readStoredLocalChatModelId();
  const engine = await OfflineChatResourceManager.ensureEngine(modelId);

  const pipelineMessages = args.messages.map((message) => {
    return {
      role: message.role,
      content: message.content,
    };
  });

  const result = await runOfflineChatPipeline({
    engine,
    schema,
    pageContext: args.pageContext,
    messages: pipelineMessages,
    lastUserPrompt,
    lastSql: args.pageContext.lastSql,
    lastError: args.pageContext.lastError,
    executeSql: args.executeSql,
    onPhase: args.onPhase,
  });

  return {
    assistantText: formatOfflinePhaseAssistantText({
      phaseLabels: result.phaseLabels,
      body: result.assistantText,
    }),
    generatedSql: result.generatedSql,
    clarification: result.clarification,
  };
}
