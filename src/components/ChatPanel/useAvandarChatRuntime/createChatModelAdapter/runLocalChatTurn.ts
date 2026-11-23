import { Model } from "@avandar/models";
import { createGenerationAwareExecuteSql } from "@/components/ChatPanel/useAvandarChatRuntime/createGenerationAwareExecuteSql/createGenerationAwareExecuteSql";
import { offlineChatOverflowAssistantText } from "@/components/ChatPanel/useAvandarChatRuntime/offlineChatOverflow";
import { runOfflineChatTurn } from "@/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatTurn";
import { tryExecuteOfflineSql } from "@/components/ChatPanel/useAvandarChatRuntime/tryExecuteOfflineSql";
import { LocalChatModelStore } from "@/stores/LocalChatModelStore/LocalChatModelStore";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ChatRuntimeCopy } from "@/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers";
import type { DataAgentTurnOptions } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers";
import type { ChatModelRunResult } from "@assistant-ui/react";

/** What a chat turn on the offline models needs from the adapter's turn. */
export type LocalChatTurnOptions = {
  dataAgentTurn: DataAgentTurnOptions;
  workspace: Workspace.T;
  pageContext: ChatPageContext.T;
  copy: ChatRuntimeCopy;
  isGenerationStale: () => boolean;
  finishIfCurrent: (result: ChatModelRunResult) => ChatModelRunResult;
  applyResponseIfCurrent: (
    response: ChatResponse.T,
  ) => Promise<ChatModelRunResult>;
};

/** The multi-pass offline pipeline, for chat outside the Data Explorer. */
async function _runOfflinePipelineTurn(
  options: Readonly<LocalChatTurnOptions>,
): Promise<ChatModelRunResult> {
  const { pageContext } = options;
  const offlineResult = await runOfflineChatTurn({
    workspace: options.workspace,
    pageContext,
    messages: options.dataAgentTurn.apiMessages,
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
  if (options.pageContext.app !== "data-explorer") {
    return _runOfflinePipelineTurn(options);
  }
  // Loaded on first use so the agent stays out of the main bundle.
  const { runOfflineDataAgentTurn } =
    await import("@/components/ChatPanel/useAvandarChatRuntime/runOfflineDataAgentTurn/runOfflineDataAgentTurn");
  return options.finishIfCurrent(
    await runOfflineDataAgentTurn(options.dataAgentTurn),
  );
}

/**
 * Answers one chat turn on the offline models in this browser: the offline
 * data agent in the Data Explorer, the multi-pass offline pipeline
 * elsewhere. Says what is missing when the offline models are not
 * downloaded, and turns a prompt too long for the models into a reply.
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
