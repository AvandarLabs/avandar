import type { ChatClarifyRequestWithAudit } from "@/components/ChatPanel/chatClarify.types";
import type { ChatModelRunResult } from "@assistant-ui/react";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse";

export type ApplyChatTurnResponseArgs = {
  response: ChatResponse.T;
  sqlApplied: boolean;
  handlers: {
    queueDashboardBlock: (
      block: NonNullable<ChatResponse.T["dashboardBlock"]>,
    ) => void;
    setPendingClarification: (
      clarification: ChatClarifyRequestWithAudit | undefined,
    ) => void;
    recordClarificationShown: (
      clarification: ChatClarifyRequestWithAudit,
    ) => Promise<string | undefined>;
  };
};

/**
 * Maps a `ChatResponse` (cloud or offline-shaped) into assistant-ui content and
 * dispatches canvas / panel side effects.
 */
export async function applyChatTurnResponse(
  args: ApplyChatTurnResponseArgs,
): Promise<ChatModelRunResult> {
  const { response, handlers } = args;
  const sqlApplied = args.sqlApplied;

  if (response.dashboardBlock) {
    handlers.queueDashboardBlock(response.dashboardBlock);
  }

  if (response.clarification) {
    const auditId = await handlers.recordClarificationShown(
      response.clarification as ChatClarifyRequestWithAudit,
    );
    handlers.setPendingClarification({
      ...response.clarification,
      auditId,
    });
  } else {
    handlers.setPendingClarification(undefined);
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
}
