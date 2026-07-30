import { cleanLlmGeneratedSql } from "@sbfn/chat/utils/cleanLlmGeneratedSql/cleanLlmGeneratedSql.ts";

const FENCED_SQL_REGEX = /```(?:sql|duckdb)?\s*\n?([\s\S]*?)```/i;
const BARE_SQL_REGEX = /\b(?:WITH|SELECT)\b[\s\S]+?(?:;|$)/i;

/**
 * Extracts recognizable SQL from free-form assistant text when no tool call
 * produced a query.
 */
export function extractSqlFromAssistantText(text: string): string | undefined {
  if (!text || text.length === 0) {
    return undefined;
  }
  const fencedSqlMatch = text.match(FENCED_SQL_REGEX);
  if (fencedSqlMatch && fencedSqlMatch[1]) {
    const cleanedSql = cleanLlmGeneratedSql(fencedSqlMatch[1])
      .replace(/;\s*$/, "")
      .trim();
    if (cleanedSql.length > 0) {
      return cleanedSql;
    }
  }
  const bareSqlMatch = text.match(BARE_SQL_REGEX);
  if (bareSqlMatch && bareSqlMatch[0]) {
    const cleanedSql = cleanLlmGeneratedSql(bareSqlMatch[0])
      .replace(/;\s*$/, "")
      .trim();
    // Guard against false positives like "Select the dataset you want".
    if (cleanedSql.length > 0 && /\b(FROM|WITH)\b/i.test(cleanedSql)) {
      return cleanedSql;
    }
  }
  return undefined;
}
