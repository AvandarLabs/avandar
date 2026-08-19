import { Model } from "@avandar/models";
import { isNotNull, matchLiteral, propEq } from "@avandar/utils";
import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import { APIClient } from "@/clients/APIClient";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { devLogOfflineChat } from "@/components/ChatPanel/offlineChatHelpers/devLogOfflineChat";
import { OfflineChatPickerModels } from "@/components/ChatPanel/offlineChatHelpers/OfflineChatPickerModels/OfflineChatPickerModels";
import { applyChatModelTurnResponse } from "@/components/ChatPanel/useAvandarChatRuntime/applyChatModelTurnResponse";
import { ChatAnalyticsPayloads } from "@/components/ChatPanel/useAvandarChatRuntime/ChatAnalyticsPayloads/ChatAnalyticsPayloads";
import {
  buildRetryContext,
  chatMessagesKey,
  extractText,
} from "@/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers";
import { createGenerationAwareExecuteSql } from "@/components/ChatPanel/useAvandarChatRuntime/createGenerationAwareExecuteSql/createGenerationAwareExecuteSql";
import { isNetworkChatFailure } from "@/components/ChatPanel/useAvandarChatRuntime/isNetworkChatFailure";
import { offerOfflineChatFallback } from "@/components/ChatPanel/useAvandarChatRuntime/offerOfflineChatFallback";
import { offlineChatOverflowAssistantText } from "@/components/ChatPanel/useAvandarChatRuntime/offlineChatOverflow";
import { resolveChatRuntimeMode } from "@/components/ChatPanel/useAvandarChatRuntime/resolveChatRuntimeMode/resolveChatRuntimeMode";
import { runOfflineChatTurn } from "@/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatTurn";
import { shouldSkipUserMessageConsent } from "@/components/ChatPanel/useAvandarChatRuntime/shouldSkipUserMessageConsent/shouldSkipUserMessageConsent";
import { tryExecuteOfflineSql } from "@/components/ChatPanel/useAvandarChatRuntime/tryExecuteOfflineSql";
import { decideIfDataCanCrossBoundary } from "@/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary";
import { detectBias } from "@/components/privacy/privacy-helpers/detectBias/detectBias";
import { PendingAcks } from "@/components/privacy/privacy-helpers/PendingAcks";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import { LocalChatModelStore } from "@/stores/LocalChatModelStore/LocalChatModelStore";
import { DashboardEditorStateManager } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { ChatRuntimeCopy } from "@/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers";
import type { DashboardEditorAppState } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import type { useSqlToStructuredQuery } from "@/views/DataExplorerApp/QueryForm/useSqlToStructuredQuery";
import type { ChatModelAdapter, ChatModelRunResult } from "@assistant-ui/react";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ConsentAck } from "$/types/chat.types";
import type { MutableRefObject } from "react";

type LastCompletedTurn = {
  messagesKey: string;
  response: ChatResponse.T;
};

/** Refs and dispatches the chat model adapter reads on each turn. */
export type CreateChatModelAdapterOptions = {
  chatGenerationRef: MutableRefObject<number>;
  lastTurnRef: MutableRefObject<LastCompletedTurn | undefined>;
  pageContextRef: MutableRefObject<ChatPageContext.T>;
  userRef: MutableRefObject<User.T | undefined>;
  workspaceIdRef: MutableRefObject<Workspace.Id>;
  workspaceRef: MutableRefObject<Workspace.T>;
  dashboardEditorStateRef: MutableRefObject<DashboardEditorAppState>;
  parseSqlRef: MutableRefObject<
    ReturnType<typeof useSqlToStructuredQuery>["parseSql"]
  >;
  copyRef: MutableRefObject<ChatRuntimeCopy>;
  dataExplorerDispatch: ReturnType<typeof DataExplorerStateManager.useDispatch>;
  dashboardEditorDispatch: ReturnType<
    typeof DashboardEditorStateManager.useDispatch
  >;
  chatPanelDispatch: ReturnType<typeof ChatPanelStateManager.useDispatch>;
};

/**
 * Builds the Assistant UI model adapter that posts each turn and applies
 * SQL, dashboard blocks, and clarifications to the live page.
 */
export function createChatModelAdapter(
  options: Readonly<CreateChatModelAdapterOptions>,
): ChatModelAdapter {
  const {
    chatGenerationRef,
    lastTurnRef,
    pageContextRef,
    userRef,
    workspaceIdRef,
    workspaceRef,
    dashboardEditorStateRef,
    parseSqlRef,
    copyRef,
    dataExplorerDispatch,
    dashboardEditorDispatch,
    chatPanelDispatch,
  } = options;
  return {
    run: async ({ messages, context }): Promise<ChatModelRunResult> => {
      const generation = chatGenerationRef.current;
      const isGenerationStale = (): boolean => {
        return chatGenerationRef.current !== generation;
      };
      const finishIfCurrent = (
        result: ChatModelRunResult,
      ): ChatModelRunResult => {
        return isGenerationStale() ? { content: [] } : result;
      };

      const model = context.config?.modelName;
      const apiMessages: ChatClientMessage.T[] = messages
        .map((threadMessage) => {
          const content = extractText(threadMessage.content);
          if (!content) {
            return null;
          }
          return matchLiteral(threadMessage.role, {
            system: Model.make("ChatClientMessage", {
              role: "system" as const,
              content,
            }),
            assistant: Model.make("ChatClientMessage", {
              role: "assistant" as const,
              content,
            }),
            user: Model.make("ChatClientMessage", {
              role: "user" as const,
              content,
            }),
          });
        })
        .filter((message): message is ChatClientMessage.T => {
          return isNotNull(message);
        });

      // Bias-check the latest user-typed message before it leaves the
      // browser. Clarification-answer markers and hidden view-change lines
      // skip consent here (clarification answers are pre-vetted via
      // `crossBoundary`; view events are synthetic).
      const lastUserMessage = [...apiMessages]
        .reverse()
        .find(propEq("role", "user"));
      const currentUser = userRef.current;
      const workspaceId = workspaceIdRef.current;
      const currentPageContext = pageContextRef.current;

      if (
        lastUserMessage &&
        !shouldSkipUserMessageConsent(lastUserMessage.content) &&
        currentUser
      ) {
        const biasResult = detectBias(lastUserMessage.content);
        if (biasResult.hits.length > 0) {
          const consent = await decideIfDataCanCrossBoundary({
            text: lastUserMessage.content,
            context: "user_message_text",
            workspaceId,
            userId: currentUser.id,
          });
          if (isGenerationStale()) {
            return { content: [] };
          }
          if (!consent.approved) {
            // User cancelled: end the turn with an empty assistant
            // response so the thread stays consistent. The user can
            // re-edit and try again from the composer.
            return {
              content: [
                {
                  type: "text" as const,
                  text: copyRef.current.messageNotSent,
                },
              ],
            };
          }
        }
      }

      // Collect any pre-approved consent acks that cover messages we
      // are about to send. `crossBoundary` registers acks in a
      // module-scope queue keyed by content hash; we drain matching
      // entries here and attach them to the backend request.
      const consentAcks = (
        await Promise.all(
          apiMessages.map(
            async (message, messageIndex): Promise<ConsentAck | undefined> => {
              if (message.role !== "user") {
                return undefined;
              }
              const ackToken = await PendingAcks.consumeAckForText(
                message.content,
              );
              return ackToken ?
                  {
                    ackToken,
                    scope: {
                      kind: "message_index" as const,
                      index: messageIndex,
                    },
                  }
                : undefined;
            },
          ),
        )
      ).filter((consentAck): consentAck is ConsentAck => {
        return consentAck !== undefined;
      });
      if (isGenerationStale()) {
        return { content: [] };
      }

      const initialRuntimeMode = resolveChatRuntimeMode({
        navigatorOnLine: navigator.onLine,
        selectedChatModelId: model,
      });
      devLogOfflineChat("useAvandarChatRuntime:mode", {
        mode: initialRuntimeMode,
        navigatorOnLine: navigator.onLine,
        selectedChatModelId: model,
        pageContext: currentPageContext,
      });

      if (
        lastUserMessage &&
        !shouldSkipUserMessageConsent(lastUserMessage.content)
      ) {
        void AnalyticsClient.logEvent({
          event: "chat.message_sent",
          workspaceId,
          app:
            currentPageContext.app === "data-explorer" ? "data_explorer"
            : currentPageContext.app === "dashboards" ? "dashboards"
            : currentPageContext.app === "data-sources" ? "data_sources"
            : undefined,
          payload: ChatAnalyticsPayloads.fromMessage({
            content: lastUserMessage.content,
            pageContext: currentPageContext,
            selectedModelId: model,
            runtimeMode: initialRuntimeMode,
          }),
        });
      }

      const applyResponse = async (
        response: ChatResponse.T,
      ): Promise<ChatModelRunResult> => {
        return applyChatModelTurnResponse({
          response,
          apiMessages,
          currentUser,
          currentPageContext,
          workspaceId,
          isGenerationStale,
          copyRef,
          parseSqlRef,
          dashboardEditorStateRef,
          dataExplorerDispatch,
          dashboardEditorDispatch,
          chatPanelDispatch,
        });
      };

      const applyResponseIfCurrent = async (
        response: ChatResponse.T,
      ): Promise<ChatModelRunResult> => {
        if (isGenerationStale()) {
          return { content: [] };
        }
        return finishIfCurrent(await applyResponse(response));
      };

      const runOfflineTurn = async (
        localChatModelId?: LocalChatModel.Id,
      ): Promise<ChatModelRunResult> => {
        if (isGenerationStale()) {
          return { content: [] };
        }
        if (!LocalChatModelStore.hasAnyDownloaded()) {
          return finishIfCurrent({
            content: [
              {
                type: "text",
                text: copyRef.current.offlineModelRequired,
              },
            ],
          });
        }
        try {
          const offlineResult = await runOfflineChatTurn({
            workspace: workspaceRef.current,
            pageContext: currentPageContext,
            messages: apiMessages,
            navigatorOnLine: navigator.onLine,
            localChatModelId,
            copy: copyRef.current,
            executeSql:
              currentPageContext.app === "data-explorer" ?
                createGenerationAwareExecuteSql(
                  tryExecuteOfflineSql,
                  isGenerationStale,
                )
              : undefined,
          });
          return applyResponseIfCurrent(
            Model.make("ChatResponse", {
              assistantText: offlineResult.assistantText,
              ...(offlineResult.generatedSql ?
                { generatedSql: offlineResult.generatedSql }
              : {}),
              ...(offlineResult.clarification ?
                { clarification: offlineResult.clarification }
              : {}),
            }),
          );
        } catch (error) {
          const overflowText = offlineChatOverflowAssistantText(
            error,
            copyRef.current.contextWindowExceeded,
          );
          if (overflowText) {
            return finishIfCurrent({
              content: [{ type: "text" as const, text: overflowText }],
            });
          }
          throw error;
        }
      };

      if (initialRuntimeMode.kind === "local") {
        return runOfflineTurn(initialRuntimeMode.localChatModelId);
      }

      const cloudModelId =
        model && !OfflineChatPickerModels.parseModelId(model) ?
          model
        : undefined;

      const currentMessagesKey = chatMessagesKey(apiMessages);
      const cachedTurn = lastTurnRef.current;
      const retryContext =
        cachedTurn && cachedTurn.messagesKey === currentMessagesKey ?
          buildRetryContext(cachedTurn.response)
        : undefined;

      try {
        const response = await APIClient.post({
          route: "chat/:workspaceId/messages",
          pathParams: { workspaceId },
          body: {
            messages: apiMessages,
            context: currentPageContext,
            ...(cloudModelId ? { model: cloudModelId } : {}),
            ...(consentAcks.length > 0 ? { consentAcks } : {}),
            ...(retryContext ? { retryContext } : {}),
          },
        });
        if (isGenerationStale()) {
          return { content: [] };
        }
        lastTurnRef.current = {
          messagesKey: currentMessagesKey,
          response,
        };
        return applyResponseIfCurrent(response);
      } catch (error) {
        if (isGenerationStale()) {
          return { content: [] };
        }
        const fallbackMode = resolveChatRuntimeMode({
          navigatorOnLine: navigator.onLine,
          chatPostFailed: isNetworkChatFailure(error),
          selectedChatModelId: model,
        });
        if (fallbackMode.kind === "offer_local_fallback") {
          const accepted = await offerOfflineChatFallback({
            title: copyRef.current.fallbackTitle,
            message: copyRef.current.fallbackMessage,
          });
          if (isGenerationStale()) {
            return { content: [] };
          }
          if (accepted) {
            const pickerLocalId =
              model ? OfflineChatPickerModels.parseModelId(model) : undefined;
            return runOfflineTurn(pickerLocalId);
          }
        }
        throw error;
      }
    },
  };
}
