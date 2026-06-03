import { ensureOfflineChatSchema } from "./ensureOfflineChatSchema";
import { fetchOfflineChatSchema } from "./fetchOfflineChatSchema";
import { formatOfflinePhaseAssistantText } from "./formatOfflinePhaseAssistantText";
import { readStoredLocalChatModelId } from "./localChatModelStore";
import { logOfflineChat } from "./offlineChatDebugLog";
import { OfflineChatResourceManager } from "./OfflineChatResourceManager";
import { runOfflineChatPipeline } from "./runOfflineChatPipeline";
import type { LocalChatModelId } from "./localChatModelCatalog";
import type { OfflineChatTurnResult } from "./offlineChat.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";

export type RunOfflineChatTurnArgs = {
  workspace: Workspace.T;
  pageContext: ChatPageContext.T;
  messages: readonly ChatClientMessage.T[];
  navigatorOnLine: boolean;
  localChatModelId?: LocalChatModelId;
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
    [...args.messages].reverse().find((message) => {
      return message.role === "user";
    })?.content ?? "";

  const fetchedSchema = await fetchOfflineChatSchema({
    workspace: args.workspace,
    openDatasetId: args.pageContext.openDatasetId,
    navigatorOnLine: args.navigatorOnLine,
  });
  const schema = ensureOfflineChatSchema({
    schema: fetchedSchema,
    openDatasetId: args.pageContext.openDatasetId,
  });

  logOfflineChat("runOfflineChatTurn:schema", {
    navigatorOnLine: args.navigatorOnLine,
    pageContext: args.pageContext,
    fetchedDatasetCount: fetchedSchema.datasets.length,
    schemaDatasetCount: schema.datasets.length,
    datasets: schema.datasets.map((dataset) => {
      return { id: dataset.id, name: dataset.name };
    }),
  });

  const modelId = args.localChatModelId ?? readStoredLocalChatModelId();
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
