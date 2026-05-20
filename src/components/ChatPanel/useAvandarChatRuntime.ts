import { useLocalRuntime } from "@assistant-ui/react";
import { isNotNull, prop } from "@utils";
import { useMemo, useRef } from "react";
import { match } from "ts-pattern";
import { APIClient } from "@/clients/APIClient";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { dropPlanTempViews } from "@/components/ChatPanel/PlanStateManager/planExecutor";
import { PlanStateManager } from "@/components/ChatPanel/PlanStateManager/PlanStateManager";
import { useChatPageContext } from "@/components/ChatPanel/useChatPageContext";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { logAnalyticsEvent } from "@/lib/analytics/analyticsClient";
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
import type { ChatModelAdapter, ChatModelRunResult } from "@assistant-ui/react";
import type {
  ChatClarifyRequest,
  ChatClientMessage,
  ConsentAck,
} from "$/types/chat.types";

/** Audit-tagged clarification used by `ChatPanelStateManager`. */
export type ChatClarifyRequestWithAudit = ChatClarifyRequest & {
  auditId?: string;
};

const CLARIFICATION_ANSWER_RE = /^\[Clarification answer:/;

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
 * On every user turn it serializes the thread into our `ChatClientMessage`
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

  const adapter = useMemo<ChatModelAdapter>(() => {
    return {
      async run({ messages, context }): Promise<ChatModelRunResult> {
        const model = context.config?.modelName;
        const apiMessages: ChatClientMessage[] = messages
          .map((chatMsg) => {
            const content = extractText(chatMsg.content);
            if (!content) {
              return null;
            }
            return match(chatMsg.role)
              .with("system", () => {
                return { role: "system" as const, content };
              })
              .with("assistant", () => {
                return { role: "assistant" as const, content };
              })
              .with("user", () => {
                return { role: "user" as const, content };
              })
              .exhaustive();
          })
          .filter((message): message is ChatClientMessage => {
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
                    text: "(Message not sent.)",
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

        const response = await APIClient.post({
          route: "chat/:workspaceId/messages",
          pathParams: { workspaceId },
          body: {
            messages: apiMessages,
            context: currentPageContext,
            model,
            ...(consentAcks.length > 0 ? { consentAcks } : {}),
          },
        });

        let sqlApplied = false;
        if (response.generatedSql) {
          const assumptionReview = reviewGeneratedSqlAssumptions({
            sql: response.generatedSql.sql,
            messages: apiMessages,
          });

          if (assumptionReview.needsApproval) {
            if (!currentUser) {
              const assistantParts: Array<{ type: "text"; text: string }> = [
                {
                  type: "text",
                  text: `${response.assistantText}\n\n(SQL was not applied. Sign in to approve filter values.)`,
                },
              ];
              return { content: assistantParts };
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
              const assistantParts: Array<{ type: "text"; text: string }> = [
                {
                  type: "text",
                  text: `${response.assistantText}\n\n(SQL was not applied. Approve the assumed filter values to run this query.)`,
                },
              ];
              return { content: assistantParts };
            }
          }

          dataExplorerDispatch.setRawSql(response.generatedSql.sql);
          dataExplorerDispatch.setNlPrompt(response.generatedSql.prompt);
          sqlApplied = true;
          try {
            const mapping = parseSqlRef.current(response.generatedSql.sql);
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
        }

        if (response.dashboardBlock) {
          dashboardEditorDispatch.queuePendingBlock({
            pendingId: crypto.randomUUID(),
            block: buildPendingDashboardBlock(response.dashboardBlock),
          });
          void logAnalyticsEvent({
            event: "dashboard.block_added_via_chat",
            workspaceId,
            app: "dashboards",
            payload: {
              blockKind: response.dashboardBlock.kind,
              ...(response.dashboardBlock.kind === "DataViz" ?
                { vizType: response.dashboardBlock.vizType }
              : {}),
              dashboardId: currentPageContext.dashboardId,
            },
          });
        }

        if (response.plan && response.plan.steps.length > 0) {
          // A new plan replaces any prior one. Drop the old temp views
          // AND the IndexedDB materialisation so DuckDB / storage don't
          // accumulate stale `step_*` data across plans.
          const prior = planStateRef.current;
          if (prior.nodes.length > 0) {
            void dropPlanTempViews({
              planId: prior.planId ?? undefined,
              nodes: prior.nodes,
            });
          }
          planDispatch.loadPlan(response.plan);
        }

        // The backend may attach a `clarify` tool call. We surface it in the
        // panel state so the `ClarificationCard` can render above the
        // composer. The model's `assistantText` is the question itself in
        // that case — we don't double up.
        if (response.clarification) {
          // Run the bias detector on the LLM-generated question; if it
          // trips, we log but pass through. The silent-reprompt loop is
          // a Phase 1 polish item tracked in CHECKPOINTS.
          const questionBias = detectBias(response.clarification.question);
          if (questionBias.hits.length > 0) {
            console.warn(
              "[chat] LLM clarification trips bias detector — passing through for v1:",
              questionBias.hits.map((h) => {
                return h.label;
              }),
            );
          }
          // Telemetry: record the "shown" event. The PendingClarificationBlock
          // settles it with the outcome when the user answers.
          const auditId = await recordShown({
            workspaceId,
            request: response.clarification,
          });
          chatPanelDispatch.setPendingClarification({
            ...response.clarification,
            // We attach the audit id on the request object so the
            // outcome handler can update the same row.
            auditId,
          } as ChatClarifyRequestWithAudit);
        } else {
          chatPanelDispatch.setPendingClarification(undefined);
        }

        const assistantParts: Array<{ type: "text"; text: string }> = [
          { type: "text", text: response.assistantText },
        ];
        if (response.generatedSql && sqlApplied) {
          assistantParts.push({
            type: "text",
            text: `\n\`\`\`sql\n${response.generatedSql.sql}\n\`\`\``,
          });
        }

        return { content: assistantParts };
      },
    };
    // `createAppStateManager` dispatch fns are stable; refs cover the rest.
  }, [
    dataExplorerDispatch,
    dashboardEditorDispatch,
    chatPanelDispatch,
    planDispatch,
  ]);

  return useLocalRuntime(adapter);
}
