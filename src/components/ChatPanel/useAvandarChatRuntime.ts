import { useLocalRuntime } from "@assistant-ui/react";
import { isDefined, isNotNull, matchLiteral, prop } from "@utils";
import { useMemo } from "react";
import { APIClient } from "@/clients/APIClient";
import { useChatPageContext } from "@/components/ChatPanel/useChatPageContext";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { ChatModelAdapter, ChatModelRunResult } from "@assistant-ui/react";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage";

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
  const pageContext = useChatPageContext();
  const dataExplorerDispatch = DataExplorerStateManager.useDispatch();

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

        const response = await APIClient.post({
          route: "chat/:workspaceId/messages",
          pathParams: { workspaceId: workspace.id },
          body: {
            messages: apiMessages,
            context: pageContext,
            model: model ?? undefined,
          },
        });

        // if we have received SQL from the backend, we will dispatch this to
        // the data explorer so it can run the query locally
        if (response.generatedSql) {
          dataExplorerDispatch.setRawSql(response.generatedSql.sql);
          dataExplorerDispatch.setNlPrompt(response.generatedSql.prompt);
        }

        const assistantParts = [
          { type: "text" as const, text: response.assistantText },
          response.generatedSql ?
            {
              type: "text" as const,

              // render sql as markdown code block
              text: `\n\`\`\`sql\n${response.generatedSql.sql}\n\`\`\``,
            }
          : undefined,
        ].filter(isDefined);

        return { content: assistantParts };
      },
    };
  }, [workspace.id, pageContext, dataExplorerDispatch]);

  // `useLocalRuntime` builds an Assistant UI runtime that keeps thread state
  // in the browser and routes each turn through the adapter's `run` function.
  return useLocalRuntime(adapter);
}
