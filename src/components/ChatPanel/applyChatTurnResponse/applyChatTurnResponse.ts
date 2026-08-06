import { isDefined } from "@utils";
import type { ChatClarifyRequestWithAudit } from "@/components/ChatPanel/chatClarify.types";
import type { ChatModelRunResult } from "@assistant-ui/react";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse";

export type ApplyChatTurnResponseOptions = {
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
  options: Readonly<ApplyChatTurnResponseOptions>,
): Promise<ChatModelRunResult> {
  const { response, handlers, sqlApplied } = options;

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

  const assistantParts = [
    { type: "text" as const, text: response.assistantText },
    response.generatedSql && sqlApplied ?
      {
        type: "text" as const,
        text: `\n\`\`\`sql\n${response.generatedSql.sql}\n\`\`\``,
      }
    : undefined,
  ].filter(isDefined);

  return { content: assistantParts };
}
