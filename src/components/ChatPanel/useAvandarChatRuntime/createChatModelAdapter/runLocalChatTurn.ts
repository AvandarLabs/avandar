import { Model } from "@avandar/models";
import { createGenerationAwareExecuteSql } from "@/components/ChatPanel/useAvandarChatRuntime/createGenerationAwareExecuteSql/createGenerationAwareExecuteSql";
import { offlineChatOverflowAssistantText } from "@/components/ChatPanel/useAvandarChatRuntime/offlineChatOverflow";
import { runOfflineChatTurn } from "@/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatTurn";
import { tryExecuteOfflineSql } from "@/components/ChatPanel/useAvandarChatRuntime/tryExecuteOfflineSql";
import { LocalChatModelStore } from "@/stores/LocalChatModelStore/LocalChatModelStore";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ChatRuntimeCopy } from "@/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers";
import type { AgentPageInputs } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/buildAgentTurnInputs";
import type { DataAgentTurnOptions } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers";
import type { ChatModelRunResult } from "@assistant-ui/react";

/** What a chat turn on the offline models needs from the adapter's turn. */
export type LocalChatTurnOptions = {
  dataAgentTurn: DataAgentTurnOptions;
  /** What is on screen, for the offline agent's page block. */
  page?: AgentPageInputs;
  /** A case-design session keeps today's offline pipeline. */
  isCaseDesign: boolean;
  /** The thread with mentions named, for the offline pipeline. */
  pipelineMessages: readonly ChatClientMessage.T[];
  workspace: Workspace.T;
  pageContext: ChatPageContext.T;
  copy: ChatRuntimeCopy;
  isGenerationStale: () => boolean;
  finishIfCurrent: (result: ChatModelRunResult) => ChatModelRunResult;
  applyResponseIfCurrent: (
    response: ChatResponse.T,
  ) => Promise<ChatModelRunResult>;
};

/** The multi-pass offline pipeline, for a case-design session. */
async function _runOfflinePipelineTurn(
  options: Readonly<LocalChatTurnOptions>,
): Promise<ChatModelRunResult> {
  const { pageContext } = options;
  const offlineResult = await runOfflineChatTurn({
    workspace: options.workspace,
    pageContext,
    messages: options.pipelineMessages,
    navigatorOnLine: navigator.onLine,
    copy: options.copy,
    executeSql:
      pageContext.app === "data-explorer"
        ? createGenerationAwareExecuteSql(
            tryExecuteOfflineSql,
            options.isGenerationStale,
          )
        : undefined,
  });
  return options.applyResponseIfCurrent(
    Model.make("ChatResponse", {
      assistantText: offlineResult.assistantText,
      ...(offlineResult.generatedSql
        ? { generatedSql: offlineResult.generatedSql }
        : {}),
      ...(offlineResult.clarification
        ? { clarification: offlineResult.clarification }
        : {}),
    }),
  );
}

async function _runTurnOnPage(
  options: Readonly<LocalChatTurnOptions>,
): Promise<ChatModelRunResult> {
  if (options.isCaseDesign) {
    return _runOfflinePipelineTurn(options);
  }
  // Loaded on first use so the agent stays out of the main bundle.
  const { runOfflineDataAgentTurn } =
    await import("@/components/ChatPanel/useAvandarChatRuntime/runOfflineDataAgentTurn/runOfflineDataAgentTurn");
  return options.finishIfCurrent(
    await runOfflineDataAgentTurn(options.dataAgentTurn, options.page),
  );
}

/**
 * Answers one chat turn on the offline models in this browser: the offline
 * data agent on every page of a data session, the multi-pass offline
 * pipeline for a case-design session. Says what is missing when the offline
 * models are not downloaded, and turns a prompt too long for the models
 * into a reply.
 */
export async function runLocalChatTurn(
  options: Readonly<LocalChatTurnOptions>,
): Promise<ChatModelRunResult> {
  if (options.isGenerationStale()) {
    return { content: [] };
  }
  if (!LocalChatModelStore.isBundleDownloaded()) {
    return options.finishIfCurrent({
      content: [{ type: "text", text: options.copy.offlineModelRequired }],
    });
  }
  try {
    return await _runTurnOnPage(options);
  } catch (error) {
    const overflowText = offlineChatOverflowAssistantText(
      error,
      options.copy.contextWindowExceeded,
    );
    if (overflowText) {
      return options.finishIfCurrent({
        content: [{ type: "text" as const, text: overflowText }],
      });
    }
    throw error;
  }
}
