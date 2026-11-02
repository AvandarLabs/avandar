import { buildRetryContextNote } from "@sbfn/chat/PostChatMessages/prompt/buildSystemPrompts.ts";
import { makeSpatialSqlDocumentationFromPrompt } from "@sbfn/chat/utils/buildSqlSystemPrompt/buildSqlSystemPrompt.ts";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext.ts";
import type { ChatRetryContext } from "$/types/chat.types.ts";

function formatPreviousSql(lastSql: string | undefined): string {
  return lastSql ? `Previous SQL:\n\`\`\`sql\n${lastSql}\n\`\`\`` : "";
}

function formatLastError(lastError: string | undefined): string {
  return lastError ? `Error:\n${lastError}` : "";
}

function formatResultColumns(
  lastResultColumns: ChatPageContext.T["lastResultColumns"],
): string {
  const lines = lastResultColumns
    ?.map((column) => {
      return `- ${column.name} (${column.dataType})`;
    })
    .join("\n");
  return lines
    ? `The user is currently looking at a result with these columns:\n${lines}`
    : "";
}

/**
 * Builds the volatile turn suffix appended after committed messages. Empty
 * when there is no live SQL, error, result schema, spatial docs, or retry
 * note for this turn.
 */
export function makeChatTurnSuffixFromOptions(
  options: Readonly<{
    context: ChatPageContext.T;
    retryContext?: ChatRetryContext;
    lastUserPrompt: string;
  }>,
): string {
  const { context, retryContext, lastUserPrompt } = options;
  const sections = [
    formatPreviousSql(context.lastSql),
    formatLastError(context.lastError),
    formatResultColumns(context.lastResultColumns),
    makeSpatialSqlDocumentationFromPrompt(lastUserPrompt),
    buildRetryContextNote(retryContext).trim(),
  ].filter((section) => {
    return section.length > 0;
  });
  return sections.length === 0
    ? ""
    : `[Turn context]\n${sections.join("\n\n")}`;
}
