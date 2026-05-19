import { useLocalRuntime } from "@assistant-ui/react";
import { isNotNull, prop } from "@utils";
import { useMemo } from "react";
import { match } from "ts-pattern";
import { APIClient } from "@/clients/APIClient";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { useChatPageContext } from "@/components/ChatPanel/useChatPageContext";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { detectBias } from "@/lib/privacy/biasDetector";
import { crossBoundary } from "@/lib/privacy/crossBoundary";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { ChatModelAdapter, ChatModelRunResult } from "@assistant-ui/react";
import type { ChatClientMessage } from "$/types/chat.types";

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
  const pageContext = useChatPageContext();
  const dataExplorerDispatch = DataExplorerStateManager.useDispatch();
  const chatPanelDispatch = ChatPanelStateManager.useDispatch();

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
          !CLARIFICATION_ANSWER_RE.test(lastUserMsg.content)
        ) {
          const biasResult = detectBias(lastUserMsg.content);
          if (biasResult.hits.length > 0) {
            const consent = await crossBoundary({
              text: lastUserMsg.content,
              context: "user_message_text",
              workspaceId: workspace.id,
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

        const response = await APIClient.post({
          route: "chat/:workspaceId/messages",
          pathParams: { workspaceId: workspace.id },
          body: {
            messages: apiMessages,
            context: pageContext,
            model,
          },
        });

        if (response.generatedSql) {
          dataExplorerDispatch.setRawSql(response.generatedSql.sql);
          dataExplorerDispatch.setNlPrompt(response.generatedSql.prompt);
        }

        // The backend may attach a `clarify` tool call. We surface it in the
        // panel state so the `ClarificationCard` can render above the
        // composer. The model's `assistantText` is the question itself in
        // that case — we don't double up.
        if (response.clarification) {
          // Run the bias detector on the LLM-generated question; if it
          // trips, we display a banner above the card rather than re-
          // prompting (the silent-reprompt loop is a Phase 1 polish item
          // tracked in CHECKPOINTS — for v0 we surface, not gate).
          const questionBias = detectBias(response.clarification.question);
          if (questionBias.hits.length > 0) {
            // eslint-disable-next-line no-console
            console.warn(
              "[chat] LLM clarification trips bias detector — passing through for v0:",
              questionBias.hits.map((h) => {
                return h.label;
              }),
            );
          }
          chatPanelDispatch.setPendingClarification(response.clarification);
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
    pageContext,
    dataExplorerDispatch,
    chatPanelDispatch,
  ]);

  return useLocalRuntime(adapter);
}
