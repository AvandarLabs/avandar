import type { ChatModelRunResult } from "@assistant-ui/react";
import { buildPendingDashboardBlock } from "@/views/DashboardApp/AvaPage/pblocks/buildPendingDashboardBlock";
import type { ChatClarifyRequestWithAudit } from "@/components/ChatPanel/useAvandarChatRuntime";
import type { ChatResponse } from "$/types/chat.types";

export type ApplyChatTurnResponseArgs = {
  response: ChatResponse;
  sqlApplied: boolean;
  handlers: {
    queueDashboardBlock: (block: NonNullable<ChatResponse["dashboardBlock"]>) => void;
    loadPlan: (plan: NonNullable<ChatResponse["plan"]>) => void;
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

  if (response.plan && response.plan.steps.length > 0) {
    handlers.loadPlan(response.plan);
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
