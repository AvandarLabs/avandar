import { cleanLlmGeneratedSql } from "@sbfn/chat/utils/cleanLlmGeneratedSql/cleanLlmGeneratedSql.ts";

const FENCED_SQL_REGEX = /```(?:sql|duckdb)?\s*\n?([\s\S]*?)```/i;
const BARE_SQL_REGEX = /\b(?:WITH|SELECT)\b[\s\S]+?(?:;|$)/i;

/** SQL found in assistant text, and the text that remains without it. */
export type ExtractedAssistantSql = {
  sql: string;
  textWithoutSql: string;
};

function _removeMatchedSql(text: string, matchedSql: string): string {
  return text
    .replace(matchedSql, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extracts recognizable SQL from free-form assistant text when no tool call
 * produced a query, along with the text minus that SQL. The chat shows the
 * remaining text to the user, so a model that writes its query inline does not
 * put raw SQL (with internal table aliases) in the reply.
 */
export function extractSqlFromAssistantText(
  text: string,
): ExtractedAssistantSql | undefined {
  if (!text || text.length === 0) {
    return undefined;
  }
  const fencedSqlMatch = text.match(FENCED_SQL_REGEX);
  if (fencedSqlMatch && fencedSqlMatch[1]) {
    const cleanedSql = cleanLlmGeneratedSql(fencedSqlMatch[1])
      .replace(/;\s*$/, "")
      .trim();
    if (cleanedSql.length > 0) {
      return {
        sql: cleanedSql,
        textWithoutSql: _removeMatchedSql(text, fencedSqlMatch[0]),
      };
    }
  }
  const bareSqlMatch = text.match(BARE_SQL_REGEX);
  if (bareSqlMatch && bareSqlMatch[0]) {
    const cleanedSql = cleanLlmGeneratedSql(bareSqlMatch[0])
      .replace(/;\s*$/, "")
      .trim();
    // Guard against false positives like "Select the dataset you want".
    if (cleanedSql.length > 0 && /\b(FROM|WITH)\b/i.test(cleanedSql)) {
      return {
        sql: cleanedSql,
        textWithoutSql: _removeMatchedSql(text, bareSqlMatch[0]),
      };
    }
  }
  return undefined;
}
