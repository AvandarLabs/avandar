import { useLocalRuntime } from "@assistant-ui/react";
import { useLingui } from "@lingui/react/macro";
import { Model } from "@models";
import { isNotNull, matchLiteral, prop } from "@utils";
import { useMemo, useRef } from "react";
import { APIClient } from "@/clients/APIClient";
import { applyChatTurnResponse } from "@/components/ChatPanel/applyChatTurnResponse";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { dropPlanTempViews } from "@/components/ChatPanel/PlanStateManager/planExecutor";
import { PlanStateManager } from "@/components/ChatPanel/PlanStateManager/PlanStateManager";
import { useChatPageContext } from "@/components/ChatPanel/useChatPageContext";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { logAnalyticsEvent } from "@/lib/analytics/analyticsClient";
import { isNetworkChatFailure } from "@/lib/offlineChat/isNetworkChatFailure";
import { hasAnyDownloadedLocalChatModel } from "@/lib/offlineChat/localChatModelStore";
import { logOfflineChat } from "@/lib/offlineChat/offlineChatDebugLog";
import { offerOfflineChatFallback } from "@/lib/offlineChat/offlineChatFallbackToast";
import { parseOfflineChatPickerModelId } from "@/lib/offlineChat/offlineChatPickerModels";
import { resolveOfflineChatMode } from "@/lib/offlineChat/resolveOfflineChatMode";
import { runOfflineChatTurn } from "@/lib/offlineChat/runOfflineChatTurn";
import { tryExecuteOfflineSql } from "@/lib/offlineChat/tryExecuteOfflineSql";
import { detectBias } from "@/lib/privacy/biasDetector";
import { recordShown } from "@/lib/privacy/clarificationAuditLog";
import { crossBoundary } from "@/lib/privacy/crossBoundary";
import {
  buildGeneratedSqlAssumptionAckText,
  reviewGeneratedSqlAssumptions,
} from "@/lib/privacy/generatedSqlAssumptions";
import { consumeAckForText } from "@/lib/privacy/pendingAcks";
import { buildPendingDashboardBlock } from "@/views/DashboardApp/AvaPage/pblocks/buildPendingDashboardBlock";
import { DashboardEditorStateManager } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { useSqlToStructuredQuery } from "@/views/DataExplorerApp/QueryForm/useSqlToStructuredQuery";
import type { LocalChatModelId } from "@/lib/offlineChat/localChatModelCatalog";
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
 * completed turn) or a fresh user turn. Role+content is enough — the
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
  const ctx: ChatRetryContext = {};
  if (response.assistantText && response.assistantText.trim().length > 0) {
    ctx.priorAssistantText = response.assistantText.slice(0, 2000);
  }
  if (response.generatedSql?.sql) {
    ctx.priorGeneratedSql = response.generatedSql.sql.slice(0, 8000);
  }
  if (response.clarification?.question) {
    ctx.priorClarificationQuestion = response.clarification.question.slice(
      0,
      400,
    );
  }
  if (response.plan?.rootMessage) {
    ctx.priorPlanRootMessage = response.plan.rootMessage.slice(0, 800);
  }
  if (response.dashboardBlock?.kind) {
    ctx.priorDashboardBlockKind = response.dashboardBlock.kind.slice(0, 40);
  }
  return Object.keys(ctx).length > 0 ? ctx : undefined;
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
  const planDispatch = PlanStateManager.useDispatch();
  const planState = PlanStateManager.useState();
  const { t } = useLingui();
  // Refs keep the adapter instance stable while still reading fresh values
  // inside `run()`. Including `pageContext` or `parseSql` in the adapter
  // useMemo deps recreates the adapter whenever SQL or dataset metadata
  // changes, which thrashes assistant-ui's local runtime and drops side
  // effects such as `setRawSql` (CHECKPOINTS bug #29).
  const planStateRef = useRef(planState);
  planStateRef.current = planState;

  const pageContextRef = useRef(pageContext);
  pageContextRef.current = pageContext;

  const parseSqlRef = useRef(parseSql);
  parseSqlRef.current = parseSql;

  const userRef = useRef(user);
  userRef.current = user;

  const workspaceIdRef = useRef(workspace.id);
  workspaceIdRef.current = workspace.id;

  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;

  const tRef = useRef(t);
  tRef.current = t;

  // Tracks the last completed turn so we can detect "Try Again". When the
  // user clicks the reload button on an assistant message, assistant-ui
  // removes that message and re-invokes `run()` with the SAME `messages`
  // array as the previous turn — so a key match here is a reliable retry
  // signal. We surface the prior response as `retryContext` on the next
  // request so the backend can nudge the model to a different output.
  const lastTurnRef = useRef<{
    messagesKey: string;
    response: ChatResponse.T;
  } | null>(null);

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
        const lastUserMsg = [...apiMessages].reverse().find((m) => {
          return m.role === "user";
        });
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
            const consent = await crossBoundary({
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
                    text: tRef.current`(Message not sent.)`,
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
        const consentAcks: ConsentAck[] = [];
        for (let i = 0; i < apiMessages.length; i++) {
          const msg = apiMessages[i]!;
          if (msg.role !== "user") {
            continue;
          }
          const ackToken = await consumeAckForText(msg.content);
          if (ackToken) {
            consentAcks.push({
              ackToken,
              scope: { kind: "message_index", index: i },
            });
          }
        }

        if (lastUserMsg && !CLARIFICATION_ANSWER_RE.test(lastUserMsg.content)) {
          void logAnalyticsEvent({
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
            const consent = await crossBoundary({
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
            [...apiMessages].reverse().find((message) => {
              return message.role === "user";
            })?.content ?? "";
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
          void logAnalyticsEvent({
            event: "chat.sql_generated",
            workspaceId,
            app: "data_explorer",
          });
          return true;
        };

        const applyResponse = async (
          response: ChatResponse.T,
        ): Promise<ChatModelRunResult> => {
          let sqlApplied = false;
          if (response.generatedSql) {
            sqlApplied = await reviewAndApplySql(response.generatedSql.sql);
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
                void logAnalyticsEvent({
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
              loadPlan: (plan) => {
                const prior = planStateRef.current;
                if (prior.nodes.length > 0) {
                  void dropPlanTempViews({
                    planId: prior.planId ?? undefined,
                    nodes: prior.nodes,
                  });
                }
                planDispatch.loadPlan(plan);
              },
              setPendingClarification:
                chatPanelDispatch.setPendingClarification,
              recordClarificationShown: async (clarification) => {
                const questionBias = detectBias(clarification.question);
                if (questionBias.hits.length > 0) {
                  console.warn(
                    "[chat] LLM clarification trips bias detector — passing through for v1:",
                    questionBias.hits.map((hit) => {
                      return hit.label;
                    }),
                  );
                }
                return recordShown({
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
          if (!hasAnyDownloadedLocalChatModel()) {
            return {
              content: [
                {
                  type: "text",
                  text: "You are offline. Download an offline chat model using the cloud icon next to the composer before asking data questions.",
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
          model && !parseOfflineChatPickerModelId(model) ? model : undefined;

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
            const accepted = await offerOfflineChatFallback();
            if (accepted) {
              const pickerLocalId =
                model ? parseOfflineChatPickerModelId(model) : undefined;
              return runOfflineTurn(pickerLocalId);
            }
          }
          throw error;
        }
      },
    };
    // `createAppStateManager` dispatch fns are stable; refs cover the rest.
  }, [
    dataExplorerDispatch,
    dashboardEditorDispatch,
    chatPanelDispatch,
    planDispatch,
  ]);

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
): string {
  const suffix =
    user ?
      "SQL was not applied. Approve the assumed filter values to run this query."
    : "SQL was not applied. Sign in to approve filter values.";
  return `${assistantText}\n\n(${suffix})`;
}
