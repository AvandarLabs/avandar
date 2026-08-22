import { DiscoveryContinuationMessage } from "@/components/ChatPanel/DiscoveryContinuationMessage/DiscoveryContinuationMessage";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse";
import type { ChatClarifyRequestWithAudit } from "@/components/ChatPanel/chatClarify.types";
import type { ChatModelRunResult } from "@assistant-ui/react";

export type ApplyChatTurnResponseOptions = {
  response: ChatResponse.T;
  sqlApplied: boolean;
  /**
   * Shown when generated SQL was applied to the canvas and the model did
   * not provide other assistant prose.
   */
  sqlResultsOnCanvas: string;
  handlers: {
    queueDashboardBlock: (
      block: NonNullable<ChatResponse.T["dashboardBlock"]>,
    ) => void;
    applyCreatedCaseTypes: (
      caseTypes: NonNullable<ChatResponse.T["createdCaseTypes"]>,
    ) => void;
    setPendingClarification: (
      clarification: ChatClarifyRequestWithAudit | undefined,
    ) => void;
    setPendingCaseTypeDraft: (
      draft: NonNullable<ChatResponse.T["proposedCaseType"]>,
    ) => void;
    recordClarificationShown: (
      clarification: ChatClarifyRequestWithAudit,
    ) => Promise<string | undefined>;
  };
};

type AssistantThreadTextOptions = {
  assistantText: string;
  hasGeneratedSql: boolean;
  sqlApplied: boolean;
  sqlResultsOnCanvas: string;
};

function _stripSqlFences(text: string): string {
  return text.replace(/```(?:sql)?[\s\S]*?```/gi, "").trim();
}

function _isSqlAnnouncement(text: string): boolean {
  return /^here is the sql i ran\b/i.test(text);
}

function _buildAssistantThreadText(
  options: Readonly<AssistantThreadTextOptions>,
): string {
  const withoutSql = _stripSqlFences(options.assistantText);
  const shouldUseCanvasCopy =
    options.hasGeneratedSql &&
    options.sqlApplied &&
    (withoutSql.length === 0 || _isSqlAnnouncement(withoutSql));
  return shouldUseCanvasCopy ? options.sqlResultsOnCanvas : withoutSql;
}

/**
 * Maps a `ChatResponse` (cloud or offline-shaped) into assistant-ui content and
 * dispatches canvas / panel side effects.
 */
export async function applyChatTurnResponse(
  options: Readonly<ApplyChatTurnResponseOptions>,
): Promise<ChatModelRunResult> {
  const { response, handlers, sqlApplied, sqlResultsOnCanvas } = options;

  if (response.dashboardBlock) {
    handlers.queueDashboardBlock(response.dashboardBlock);
  }

  if (response.createdCaseTypes && response.createdCaseTypes.length > 0) {
    handlers.applyCreatedCaseTypes(response.createdCaseTypes);
  }

  // A turn that proposes nothing leaves any open draft in place, so the user
  // can keep chatting about the card without it disappearing under them.
  if (response.proposedCaseType) {
    handlers.setPendingCaseTypeDraft(response.proposedCaseType);
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

  const isDiscoveryContinuation =
    response.clarification?.responseShape.kind === "discovery";

  return {
    content: [
      {
        type: "text" as const,
        text: _buildAssistantThreadText({
          assistantText: response.assistantText,
          hasGeneratedSql: Boolean(response.generatedSql),
          sqlApplied,
          sqlResultsOnCanvas,
        }),
      },
    ],
    ...(isDiscoveryContinuation
      ? { metadata: DiscoveryContinuationMessage.metadata }
      : {}),
  };
}
