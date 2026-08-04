import { propEq } from "@utils";
import { ensureOfflineChatSchema } from "@/components/ChatPanel/offline-chat-helpers/ensureOfflineChatSchema/ensureOfflineChatSchema";
import { fetchOfflineChatSchema } from "./fetchOfflineChatSchema";
import { formatOfflinePhaseAssistantText } from "./formatOfflinePhaseAssistantText";
import { LocalChatModelStore } from "@/clients/LocalChatModel/LocalChatModelStore/LocalChatModelStore";
import { logOfflineChat } from "./logOfflineChat";
import { OfflineChatResourceManager } from "@/clients/LocalChatModel/OfflineChatResourceManager";
import { runOfflineChatPipeline } from "@/components/ChatPanel/offline-chat-helpers/runOfflineChatPipeline/runOfflineChatPipeline";
import type { LocalChatModelId } from "@/clients/LocalChatModel/LocalChatModelCatalog/LocalChatModelCatalog";
import type {
  OfflineChatPipelineCopy,
  OfflineChatTurnResult,
} from "@/clients/LocalChatModel/offlineChat.types";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type { Workspace } from "$/models/Workspace/Workspace";

export type RunOfflineChatTurnArgs = {
  workspace: Workspace.T;
  pageContext: ChatPageContext.T;
  messages: readonly ChatClientMessage.T[];
  navigatorOnLine: boolean;
  copy: OfflineChatPipelineCopy;
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
    [...args.messages].reverse().find(propEq("role", "user"))?.content ?? "";

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

  const modelId = args.localChatModelId ?? LocalChatModelStore.readSelectedId();
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
    copy: args.copy,
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
