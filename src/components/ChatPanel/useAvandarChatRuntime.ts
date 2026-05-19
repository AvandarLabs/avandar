import { useLocalRuntime } from "@assistant-ui/react";
import { isNotNull, prop } from "@utils";
import { useMemo } from "react";
import { match } from "ts-pattern";
import { APIClient } from "@/clients/APIClient";
import { useChatPageContext } from "@/components/ChatPanel/useChatPageContext";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { ChatModelAdapter, ChatModelRunResult } from "@assistant-ui/react";
import type { ChatClientMessage } from "$/types/chat.types";

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

        const response = await APIClient.post({
          route: "chat/:workspaceId/messages",
          pathParams: { workspaceId: workspace.id },
          body: {
            messages: apiMessages,
            context: pageContext,
            ...(model ? { model } : {}),
          },
        });

        if (response.generatedSql) {
          dataExplorerDispatch.setRawSql(response.generatedSql.sql);
          dataExplorerDispatch.setNlPrompt(response.generatedSql.prompt);
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
  }, [workspace.id, pageContext, dataExplorerDispatch]);

  return useLocalRuntime(adapter);
}
