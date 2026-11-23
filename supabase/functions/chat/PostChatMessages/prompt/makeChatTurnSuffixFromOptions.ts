import { buildRetryContextNote } from "@sbfn/chat/PostChatMessages/prompt/buildSystemPrompts.ts";
import { makeSpatialSqlDocumentationFromPrompt } from "@sbfn/chat/utils/buildSqlSystemPrompt/buildSqlSystemPrompt.ts";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext.ts";
import type { ChatRetryContext } from "$/types/chat.types.ts";

/**
 * The SQL the Data Explorer is showing. It stays on screen across a new chat,
 * so it may come from an earlier conversation; the model builds on it only
 * when the user refers to it.
 */
function formatPreviousSql(lastSql: string | undefined): string {
  return lastSql
    ? `The Data Explorer is showing this SQL. It may come from before this conversation, so build on it only when the user refers to it (for example "now do the same for Texas" or "make it weekly"):\n\`\`\`sql\n${lastSql}\n\`\`\``
    : "";
}

function formatLastError(lastError: string | undefined): string {
  return lastError
    ? `The last run of that SQL failed with this error. Fix it only if the user asks about that query:\n${lastError}`
    : "";
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
 * Today's date, so the model reads "last year" or "recent" against the
 * calendar it is asked in rather than a year it guesses.
 */
function formatToday(today: Date): string {
  return `Today's date: ${today.toISOString().slice(0, 10)}`;
}

/**
 * Builds the volatile turn suffix appended after committed messages: today's
 * date, plus any live SQL, error, result schema, spatial docs, or retry note
 * for this turn.
 */
export function makeChatTurnSuffixFromOptions(
  options: Readonly<{
    context: ChatPageContext.T;
    retryContext?: ChatRetryContext;
    lastUserPrompt: string;
    today?: Date;
  }>,
): string {
  const { context, retryContext, lastUserPrompt, today = new Date() } = options;
  const sections = [
    formatToday(today),
    formatPreviousSql(context.lastSql),
    formatLastError(context.lastError),
    formatResultColumns(context.lastResultColumns),
    makeSpatialSqlDocumentationFromPrompt(lastUserPrompt),
    buildRetryContextNote(retryContext).trim(),
  ].filter((section) => {
    return section.length > 0;
  });
  return `[Turn context]\n${sections.join("\n\n")}`;
}
