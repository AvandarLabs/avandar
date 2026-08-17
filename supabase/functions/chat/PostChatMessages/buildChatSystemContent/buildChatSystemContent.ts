import {
  dashboardsSystemPrefix,
  dataExplorerSystemPrefix,
  genericSystemPrompt,
} from "@sbfn/chat/PostChatMessages/prompt/buildSystemPrompts.ts";

/**
 * Words that suggest the user is refining the previous turn rather than asking
 * something new. Carrying the prior SQL into every turn would be dishonest
 * token spend, so this is the relevance gate that decides when to include it.
 */
const REFINEMENT_HINTS =
  /^\s*(now|instead|also|actually|and|but|wait)\b|\b(it|that|this query|this one|the result|the previous|same|earlier|again|now also|drop|add|clean|remove)\b/i;

/**
 * Assembles the system message for one chat turn.
 *
 * The three optional context blocks are additive and only ever apply on the
 * Data Explorer surface: the prior SQL when the message reads as a refinement
 * of it, the prior runtime error when there is one to fix, and the columns the
 * user is currently looking at. That last block is the source of truth for
 * "what is on the canvas right now", because manual SQL edits and pill swaps
 * can make the visible columns diverge from the dataset schemas.
 */
export function buildChatSystemContent(
  options: Readonly<{
    isDataExplorer: boolean;
    isDashboards: boolean;
    sqlSystemPrompt: string;
    lastSql: string | undefined;
    lastError: string | undefined;
    lastResultColumns:
      | ReadonlyArray<{ name: string; dataType: string }>
      | undefined;
    lastUserPrompt: string;
    retryContextNote: string;
  }>,
): string {
  const {
    isDataExplorer,
    isDashboards,
    sqlSystemPrompt,
    lastSql,
    lastError,
    lastResultColumns,
    lastUserPrompt,
    retryContextNote,
  } = options;

  const hasLastSql = typeof lastSql === "string" && lastSql.length > 0;
  const isLikelyRefinement =
    isDataExplorer && hasLastSql && REFINEMENT_HINTS.test(lastUserPrompt);

  const refinementContext =
    isLikelyRefinement ?
      `\n\nThe user's previous turn produced this SQL, and the current message looks like a refinement of it. When generating SQL, edit this prior query rather than starting over.\n\nPrevious SQL:\n\`\`\`sql\n${lastSql}\n\`\`\``
    : "";

  const errorContext =
    isDataExplorer && hasLastSql && lastError ?
      `\n\nThe previous SQL failed at runtime with this error. Use the error to fix the query.\n\nPrevious SQL:\n\`\`\`sql\n${lastSql}\n\`\`\`\n\nError:\n${lastError}`
    : "";

  const resultColumnsContext =
    isDataExplorer && lastResultColumns && lastResultColumns.length > 0 ?
      `\n\nThe user is currently looking at a result with these columns:\n${lastResultColumns
        .map((column) => {
          return `- ${column.name} (${column.dataType})`;
        })
        .join(
          "\n",
        )}\n\nWhen answering or generating new SQL, treat this as the live result schema.`
    : "";

  return (
    (isDataExplorer ?
      `${dataExplorerSystemPrefix}\n\n${sqlSystemPrompt}${refinementContext}${errorContext}${resultColumnsContext}`
    : isDashboards ? `${dashboardsSystemPrefix}\n\n${sqlSystemPrompt}`
    : genericSystemPrompt) + retryContextNote
  );
}
