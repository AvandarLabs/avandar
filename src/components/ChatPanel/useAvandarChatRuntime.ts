import { useLocalRuntime } from "@assistant-ui/react";
import { useLingui } from "@lingui/react/macro";
import { Model } from "@models";
import { isNotNull, matchLiteral, prop, propEq } from "@utils";
import { useEffect, useMemo, useRef } from "react";
import { APIClient } from "@/clients/APIClient";
import { ClarificationAuditEntryClient } from "@/clients/privacy/ClarificationAuditEntryClient/ClarificationAuditEntryClient";
import { applyChatTurnResponse } from "@/components/ChatPanel/applyChatTurnResponse/applyChatTurnResponse";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { useChatPageContext } from "@/components/ChatPanel/useChatPageContext";
import { decideIfDataCanCrossBoundary } from "@/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary";
import { detectBias } from "@/components/privacy/privacy-helpers/detectBias/detectBias";
import {
  buildGeneratedSqlAssumptionAckText,
  reviewGeneratedSqlAssumptions,
} from "@/components/privacy/privacy-helpers/generatedSqlAssumptions/generatedSqlAssumptions";
import { PendingAcks } from "@/components/privacy/privacy-helpers/PendingAcks";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import { isNetworkChatFailure } from "@/lib/offlineChat/isNetworkChatFailure";
import { LocalChatModelStore } from "@/lib/offlineChat/LocalChatModelStore/LocalChatModelStore";
import { logOfflineChat } from "@/lib/offlineChat/logOfflineChat";
import { offerOfflineChatFallback } from "@/lib/offlineChat/offerOfflineChatFallback";
import { OfflineChatPickerModels } from "@/lib/offlineChat/offlineChatPickerModels";
import { resolveOfflineChatMode } from "@/lib/offlineChat/resolveOfflineChatMode";
import { runOfflineChatTurn } from "@/lib/offlineChat/runOfflineChatTurn";
import { tryExecuteOfflineSql } from "@/lib/offlineChat/tryExecuteOfflineSql";
import { buildPendingDashboardBlock } from "@/views/DashboardApp/AvaPage/pblocks/buildPendingDashboardBlock/buildPendingDashboardBlock";
import { DashboardEditorStateManager } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { useSqlToStructuredQuery } from "@/views/DataExplorerApp/QueryForm/useSqlToStructuredQuery";
import type { LocalChatModelId } from "@/lib/offlineChat/LocalChatModelCatalog/LocalChatModelCatalog";
import type { ChatModelAdapter, ChatModelRunResult } from "@assistant-ui/react";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse";
import type { User } from "$/models/User/User";
import type {
  ChatClarifyRequest,
  ChatRetryContext,
  ConsentAck,
} from "$/types/chat.types";

/** Audit-tagged clarification used by `ChatPanelStateManager`. */
export type ChatClarifyRequestWithAudit = ChatClarifyRequest & {
  auditId?: string;
};

const CLARIFICATION_ANSWER_RE = /^\[Clarification answer:/;

/**
 * Computes a stable key for a `messages` array so we can tell whether
 * an incoming `run()` is a "Try Again" (same messages as the last
 * completed turn) or a fresh user turn. Role and content are enough: the
 * runtime adapter never sees structured metadata that would change
 * without the content also changing.
 */
function chatMessagesKey(messages: readonly ChatClientMessage.T[]): string {
  return messages
    .map((m) => {
      return `${m.role}\u0001${m.content}`;
    })
    .join("\u0002");
}

/**
 * Maps a previously-returned `ChatResponse` to the compact retry
 * context shape the backend wants. Returns `undefined` when the
 * previous turn produced nothing worth telling the model about.
 */
function buildRetryContext(
  response: ChatResponse.T,
): ChatRetryContext | undefined {
  const retryContext: ChatRetryContext = {
    ...(response.assistantText?.trim() ?
      { priorAssistantText: response.assistantText.slice(0, 2000) }
    : {}),
    ...(response.generatedSql?.sql ?
      { priorGeneratedSql: response.generatedSql.sql.slice(0, 8000) }
    : {}),
    ...(response.clarification?.question ?
      {
        priorClarificationQuestion: response.clarification.question.slice(
          0,
          400,
        ),
      }
    : {}),
    ...(response.dashboardBlock?.kind ?
      { priorDashboardBlockKind: response.dashboardBlock.kind.slice(0, 40) }
    : {}),
  };
  return Object.keys(retryContext).length > 0 ? retryContext : undefined;
}

function extractText(parts: ReadonlyArray<{ type: string }>): string {
  return parts
    .filter((p): p is { type: "text"; text: string } => {
      return p.type === "text";
    })
    .map(prop("text"))
    .join("\n");
}

/**
 * The Assistant UI runtime for the Avandar chat panel.
 *
 * On every user turn it serializes the thread into our `ChatClientMessage.T`
 * shape, posts to the `chat/:workspaceId/messages` edge function along with
 * the current page context, and renders the assistant reply. If the model
 * called `generateSql`, the SQL and prompt are pushed into
 * `DataExplorerStateManager`, which causes the canvas to re-run the query
 * automatically through the existing `useDataQuery` pipeline.
 */
export function useAvandarChatRuntime(): ReturnType<typeof useLocalRuntime> {
  const workspace = useCurrentWorkspace();
  const user = useCurrentUser();
  const pageContext = useChatPageContext();
  const dataExplorerDispatch = DataExplorerStateManager.useDispatch();
  const dashboardEditorDispatch = DashboardEditorStateManager.useDispatch();
  const chatPanelDispatch = ChatPanelStateManager.useDispatch();
  const { parseSql } = useSqlToStructuredQuery();
  const { t } = useLingui();
  // Refs keep the adapter instance stable while still reading fresh values
  // inside `run()`. Including `pageContext` or `parseSql` in the adapter
  // useMemo deps recreates the adapter whenever SQL or dataset metadata
  // changes, which thrashes assistant-ui's local runtime and drops side
  // effects such as `setRawSql` (CHECKPOINTS bug #29).
  const pageContextRef = useRef(pageContext);
  const parseSqlRef = useRef(parseSql);
  const userRef = useRef(user);
  const workspaceIdRef = useRef(workspace.id);
  const workspaceRef = useRef(workspace);
  const copyRef = useRef({
    messageNotSent: t`(Message not sent.)`,
    offlineModelRequired: t`You are offline. Download an offline chat model using the cloud icon next to the composer before asking data questions.`,
    sqlApprovalRequired: t`SQL was not applied. Approve the assumed filter values to run this query.`,
    sqlSignInRequired: t`SQL was not applied. Sign in to approve filter values.`,
    fallbackTitle: t`Chat request failed`,
    fallbackMessage: t`The cloud assistant is unreachable. Use your downloaded on-device model for this message?`,
    replying: t`Replying…`,
    understandingQuestion: t`Understanding your question…`,
    writingQuery: t`Writing query…`,
    generatingSql: t`Generating SQL…`,
    repairingQuery: t`Repairing query…`,
    fixingQuery: t`Fixing query…`,
    noSql: t`I could not produce SQL offline. Try rephrasing or reconnect to use cloud chat.`,
    metadataQuery: t`Here is a query based on your workspace metadata.`,
  });

  useEffect(
    function synchronizeChatRuntimeDependencies() {
      pageContextRef.current = pageContext;
      parseSqlRef.current = parseSql;
      userRef.current = user;
      workspaceIdRef.current = workspace.id;
      workspaceRef.current = workspace;
      copyRef.current = {
        messageNotSent: t`(Message not sent.)`,
        offlineModelRequired: t`You are offline. Download an offline chat model using the cloud icon next to the composer before asking data questions.`,
        sqlApprovalRequired: t`SQL was not applied. Approve the assumed filter values to run this query.`,
        sqlSignInRequired: t`SQL was not applied. Sign in to approve filter values.`,
        fallbackTitle: t`Chat request failed`,
        fallbackMessage: t`The cloud assistant is unreachable. Use your downloaded on-device model for this message?`,
        replying: t`Replying…`,
        understandingQuestion: t`Understanding your question…`,
        writingQuery: t`Writing query…`,
        generatingSql: t`Generating SQL…`,
        repairingQuery: t`Repairing query…`,
        fixingQuery: t`Fixing query…`,
        noSql: t`I could not produce SQL offline. Try rephrasing or reconnect to use cloud chat.`,
        metadataQuery: t`Here is a query based on your workspace metadata.`,
      };
    },
    [pageContext, parseSql, t, user, workspace],
  );

  // Tracks the last completed turn so we can detect "Try Again". When the
  // user clicks the reload button on an assistant message, assistant-ui
  // removes that message and re-invokes `run()` with the SAME `messages`
  // array as the previous turn, so a key match here is a reliable retry
  // signal. We surface the prior response as `retryContext` on the next
  // request so the backend can nudge the model to a different output.
  const lastTurnRef = useRef<
    | {
        messagesKey: string;
        response: ChatResponse.T;
      }
    | undefined
  >(undefined);

  const adapter: ChatModelAdapter = useMemo(() => {
    return {
      run: async ({ messages, context }): Promise<ChatModelRunResult> => {
        const model = context.config?.modelName;
        const apiMessages: ChatClientMessage.T[] = messages
          .map((chatMsg) => {
            const content = extractText(chatMsg.content);
            if (!content) {
              return null;
            }
            return matchLiteral(chatMsg.role, {
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
        // browser. Clarification-answer markers (`[Clarification answer:
        // ...]`) are pre-vetted upstream via `crossBoundary`, so we don't
        // double-check them here.
        const lastUserMsg = [...apiMessages]
          .reverse()
          .find(propEq("role", "user"));
        const currentUser = userRef.current;
        const workspaceId = workspaceIdRef.current;
        const currentPageContext = pageContextRef.current;

        if (
          lastUserMsg &&
          !CLARIFICATION_ANSWER_RE.test(lastUserMsg.content) &&
          currentUser
        ) {
          const biasResult = detectBias(lastUserMsg.content);
          if (biasResult.hits.length > 0) {
            const consent = await decideIfDataCanCrossBoundary({
              text: lastUserMsg.content,
              context: "user_message_text",
              workspaceId,
              userId: currentUser.id,
            });
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
              async (
                message,
                messageIndex,
              ): Promise<ConsentAck | undefined> => {
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

        if (lastUserMsg && !CLARIFICATION_ANSWER_RE.test(lastUserMsg.content)) {
          void AnalyticsClient.logEvent({
            event: "chat.message_sent",
            workspaceId,
            app:
              currentPageContext.app === "data-explorer" ? "data_explorer"
              : currentPageContext.app === "dashboards" ? "dashboards"
              : currentPageContext.app === "data-sources" ? "data_sources"
              : undefined,
            payload: { app: currentPageContext.app },
          });
        }

        const reviewAndApplySql = async (sql: string): Promise<boolean> => {
          const assumptionReview = reviewGeneratedSqlAssumptions({
            sql,
            messages: apiMessages,
          });
          if (assumptionReview.needsApproval) {
            if (!currentUser) {
              return false;
            }
            const consent = await decideIfDataCanCrossBoundary({
              values: assumptionReview.unapprovedValues,
              text: buildGeneratedSqlAssumptionAckText(
                assumptionReview.unapprovedValues,
              ),
              context: "generated_sql_assumptions",
              workspaceId,
              userId: currentUser.id,
              explicitConsentRequired: assumptionReview.assumptionCapReached,
            });
            if (!consent.approved) {
              return false;
            }
          }
          const prompt =
            [...apiMessages].reverse().find(propEq("role", "user"))?.content ??
            "";
          dataExplorerDispatch.setRawSql(sql);
          dataExplorerDispatch.setNlPrompt(prompt);
          try {
            const mapping = parseSqlRef.current(sql);
            dataExplorerDispatch.applySqlMapping({
              query: mapping.query,
              isFullyMapped: mapping.isFullyMapped,
              unmappedReasons: mapping.unmappedReasons,
            });
          } catch {
            // ignore; the structured form will simply be out of sync.
          }
          void AnalyticsClient.logEvent({
            event: "chat.sql_generated",
            workspaceId,
            app: "data_explorer",
          });
          return true;
        };

        const applyResponse = async (
          response: ChatResponse.T,
        ): Promise<ChatModelRunResult> => {
          const sqlApplied =
            response.generatedSql ?
              await reviewAndApplySql(response.generatedSql.sql)
            : false;
          if (response.generatedSql) {
            if (
              response.generatedSql &&
              !sqlApplied &&
              assumptionNeedsSignInOrApproval(response, apiMessages)
            ) {
              return {
                content: [
                  {
                    type: "text",
                    text: buildSqlNotAppliedAssistantText(
                      response.assistantText,
                      currentUser ?? undefined,
                      copyRef.current,
                    ),
                  },
                ],
              };
            }
          }

          return applyChatTurnResponse({
            response,
            sqlApplied,
            handlers: {
              queueDashboardBlock: (block) => {
                dashboardEditorDispatch.queuePendingBlock({
                  pendingId: crypto.randomUUID(),
                  block: buildPendingDashboardBlock(block),
                });
                void AnalyticsClient.logEvent({
                  event: "dashboard.block_added_via_chat",
                  workspaceId,
                  app: "dashboards",
                  payload: {
                    blockKind: block.kind,
                    ...(block.kind === "DataViz" ?
                      { vizType: block.vizType }
                    : {}),
                    dashboardId: currentPageContext.dashboardId,
                  },
                });
              },
              setPendingClarification:
                chatPanelDispatch.setPendingClarification,
              recordClarificationShown: async (clarification) => {
                const questionBias = detectBias(clarification.question);
                if (questionBias.hits.length > 0) {
                  console.warn(
                    "[chat] LLM clarification trips bias detector; passing through:",
                    questionBias.hits.map(prop("label")),
                  );
                }
                return ClarificationAuditEntryClient.recordShown({
                  workspaceId,
                  request: clarification,
                });
              },
            },
          });
        };

        const runOfflineTurn = async (
          localChatModelId?: LocalChatModelId,
        ): Promise<ChatModelRunResult> => {
          if (!LocalChatModelStore.hasAnyDownloaded()) {
            return {
              content: [
                {
                  type: "text",
                  text: copyRef.current.offlineModelRequired,
                },
              ],
            };
          }
          const offlineResult = await runOfflineChatTurn({
            workspace: workspaceRef.current,
            pageContext: currentPageContext,
            messages: apiMessages,
            navigatorOnLine: navigator.onLine,
            localChatModelId,
            copy: copyRef.current,
            executeSql:
              currentPageContext.app === "data-explorer" ?
                tryExecuteOfflineSql
              : undefined,
          });
          return applyResponse(
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
        };

        const mode = resolveOfflineChatMode({
          navigatorOnLine: navigator.onLine,
          selectedChatModelId: model,
        });
        logOfflineChat("useAvandarChatRuntime:mode", {
          mode,
          navigatorOnLine: navigator.onLine,
          selectedChatModelId: model,
          pageContext: currentPageContext,
        });
        if (mode.kind === "local") {
          return runOfflineTurn(mode.localChatModelId);
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
          lastTurnRef.current = {
            messagesKey: currentMessagesKey,
            response,
          };
          return applyResponse(response);
        } catch (error) {
          const fallbackMode = resolveOfflineChatMode({
            navigatorOnLine: navigator.onLine,
            chatPostFailed: isNetworkChatFailure(error),
            selectedChatModelId: model,
          });
          if (fallbackMode.kind === "offer_local_fallback") {
            const accepted = await offerOfflineChatFallback({
              title: copyRef.current.fallbackTitle,
              message: copyRef.current.fallbackMessage,
            });
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
    // `createAppStateManager` dispatch fns are stable; refs cover the rest.
  }, [dataExplorerDispatch, dashboardEditorDispatch, chatPanelDispatch]);

  // `useLocalRuntime` builds an Assistant UI runtime that keeps thread state
  // in the browser and routes each turn through the adapter's `run` function.
  return useLocalRuntime(adapter);
}

function assumptionNeedsSignInOrApproval(
  response: ChatResponse.T,
  messages: readonly ChatClientMessage.T[],
): boolean {
  if (!response.generatedSql) {
    return false;
  }
  const assumptionReview = reviewGeneratedSqlAssumptions({
    sql: response.generatedSql.sql,
    messages,
  });
  return assumptionReview.needsApproval;
}

function buildSqlNotAppliedAssistantText(
  assistantText: string,
  user: User.T | undefined,
  copy: {
    sqlApprovalRequired: string;
    sqlSignInRequired: string;
  },
): string {
  const suffix = user ? copy.sqlApprovalRequired : copy.sqlSignInRequired;
  return `${assistantText}\n\n(${suffix})`;
}
