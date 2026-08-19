import { prop } from "@avandar/utils";
import { reviewGeneratedSqlAssumptions } from "@/components/privacy/privacy-helpers/generatedSqlAssumptions/generatedSqlAssumptions";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse";
import type { User } from "$/models/User/User";
import type { ChatRetryContext } from "$/types/chat.types";
import type { OfflineChatPipelineCopy } from "$/types/offlineChat.types";

/** Translated strings the chat adapter interpolates into assistant turns. */
export type ChatRuntimeCopy = OfflineChatPipelineCopy & {
  messageNotSent: string;
  offlineModelRequired: string;
  sqlApprovalRequired: string;
  sqlSignInRequired: string;
  sqlResultsOnCanvas: string;
  fallbackTitle: string;
  fallbackMessage: string;
};

/**
 * Computes a stable key for a `messages` array so we can tell whether
 * an incoming `run()` is a "Try Again" (same messages as the last
 * completed turn) or a fresh user turn. Role and content are enough: the
 * runtime adapter never sees structured metadata that would change
 * without the content also changing.
 */
export function chatMessagesKey(
  messages: readonly ChatClientMessage.T[],
): string {
  return messages
    .map((message) => {
      return `${message.role}\u0001${message.content}`;
    })
    .join("\u0002");
}

/**
 * Maps a previously-returned `ChatResponse` to the compact retry
 * context shape the backend wants. Returns `undefined` when the
 * previous turn produced nothing worth telling the model about.
 */
export function buildRetryContext(
  response: ChatResponse.T,
): ChatRetryContext | undefined {
  const retryContext: ChatRetryContext = {
    ...(response.assistantText?.trim() ?
      { priorAssistantText: response.assistantText.slice(0, 2000) }
    : {}),
    ...(response.generatedSql?.sql ?
      { priorGeneratedSql: response.generatedSql.sql.slice(0, 8000) }
    : {}),
    ...(response.clarification?.question ?
      {
        priorClarificationQuestion: response.clarification.question.slice(
          0,
          400,
        ),
      }
    : {}),
    ...(response.dashboardBlock?.kind ?
      { priorDashboardBlockKind: response.dashboardBlock.kind.slice(0, 40) }
    : {}),
  };
  return Object.keys(retryContext).length > 0 ? retryContext : undefined;
}

/** Joins text parts from an assistant-ui message into one string. */
export function extractText(parts: ReadonlyArray<{ type: string }>): string {
  return parts
    .filter((part): part is { type: "text"; text: string } => {
      return part.type === "text";
    })
    .map(prop("text"))
    .join("\n");
}

/**
 * Returns whether generated SQL was blocked because assumed filter values
 * still need sign-in or explicit approval.
 */
export function assumptionNeedsSignInOrApproval(
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

/**
 * Appends the SQL-not-applied suffix for the current auth state.
 */
export function buildSqlNotAppliedAssistantText(
  assistantText: string,
  user: User.T | undefined,
  copy: Readonly<{
    sqlApprovalRequired: string;
    sqlSignInRequired: string;
  }>,
): string {
  const suffix = user ? copy.sqlApprovalRequired : copy.sqlSignInRequired;
  return `${assistantText}\n\n(${suffix})`;
}
