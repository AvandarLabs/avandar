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
import { detectBias } from "@/lib/privacy/biasDetector";
import { recordShown } from "@/lib/privacy/clarificationAuditLog";
import { crossBoundary } from "@/lib/privacy/crossBoundary";
import { consumeAckForText } from "@/lib/privacy/pendingAcks";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
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
  const chatPanelDispatch = ChatPanelStateManager.useDispatch();
  const planDispatch = PlanStateManager.useDispatch();
  const currentPlanNodes = PlanStateManager.useState().nodes;
  // Keep a ref so the adapter can read the latest plan nodes without
  // forcing the adapter to be re-created (which would also blow away
  // assistant-ui's runtime in-flight state — see CHECKPOINTS bug #29).
  const planNodesRef = useRef(currentPlanNodes);
  planNodesRef.current = currentPlanNodes;

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
        if (
          lastUserMsg &&
          !CLARIFICATION_ANSWER_RE.test(lastUserMsg.content) &&
          user
        ) {
          const biasResult = detectBias(lastUserMsg.content);
          if (biasResult.hits.length > 0) {
            const consent = await crossBoundary({
              text: lastUserMsg.content,
              context: "user_message_text",
              workspaceId: workspace.id,
              userId: user.id,
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

        const response = await APIClient.post({
          route: "chat/:workspaceId/messages",
          pathParams: { workspaceId: workspace.id },
          body: {
            messages: apiMessages,
            context: pageContext,
            model,
            ...(consentAcks.length > 0 ? { consentAcks } : {}),
          },
        });

        if (response.generatedSql) {
          dataExplorerDispatch.setRawSql(response.generatedSql.sql);
          dataExplorerDispatch.setNlPrompt(response.generatedSql.prompt);
        }

        if (response.plan && response.plan.steps.length > 0) {
          // A new plan replaces any prior one. Drop the old temp views
          // before loading the new plan so DuckDB doesn't accumulate
          // stale `step_*` views across multiple plans.
          const priorNodes = planNodesRef.current;
          if (priorNodes.length > 0) {
            void dropPlanTempViews({ nodes: priorNodes });
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
            workspaceId: workspace.id,
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
        if (response.generatedSql) {
          assistantParts.push({
            type: "text",
            text: `\n\`\`\`sql\n${response.generatedSql.sql}\n\`\`\``,
          });
        }

        return { content: assistantParts };
      },
    };
  }, [
    workspace.id,
    user,
    pageContext,
    dataExplorerDispatch,
    chatPanelDispatch,
    planDispatch,
  ]);

  return useLocalRuntime(adapter);
}
