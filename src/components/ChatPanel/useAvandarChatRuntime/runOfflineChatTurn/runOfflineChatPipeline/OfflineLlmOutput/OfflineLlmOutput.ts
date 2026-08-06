import type { OfflineAnalyzeResult } from "$/types/offlineChat.types";

function _parseAnalyzeJson(raw: string): OfflineAnalyzeResult | undefined {
  const trimmed = raw.trim();
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd <= jsonStart) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as {
      summary?: unknown;
      proceed?: unknown;
      tableName?: unknown;
      clarifyQuestion?: unknown;
      clarifyOptions?: unknown;
    };
    if (typeof parsed.summary !== "string") {
      return undefined;
    }
    const proceed = parsed.proceed === true;
    const clarifyQuestion =
      typeof parsed.clarifyQuestion === "string" ?
        parsed.clarifyQuestion.trim()
      : undefined;
    const clarifyOptions =
      Array.isArray(parsed.clarifyOptions) ?
        parsed.clarifyOptions
          .filter((option): option is string => {
            return typeof option === "string";
          })
          .slice(0, 6)
      : undefined;
    const tableName =
      typeof parsed.tableName === "string" ?
        parsed.tableName.trim()
      : undefined;
    return {
      summary: parsed.summary.trim(),
      proceed,
      ...(tableName ? { tableName } : {}),
      ...(clarifyQuestion ? { clarifyQuestion } : {}),
      ...(clarifyOptions && clarifyOptions.length >= 2 ?
        { clarifyOptions }
      : {}),
    };
  } catch {
    return undefined;
  }
}

function _extractSql(raw: string): string | undefined {
  const fenceMatch = /```(?:sql)?\s*([\s\S]*?)```/i.exec(raw);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }
  const selectMatch = /(SELECT[\s\S]+)/i.exec(raw);
  if (selectMatch?.[1]) {
    return selectMatch[1].trim();
  }
  return undefined;
}

function _stripSqlFence(raw: string): string {
  return raw.replace(/```(?:sql)?[\s\S]*?```/gi, "").trim();
}

/** Parsers and normalizers for text returned by an offline model. */
export const OfflineLlmOutput = {
  parseAnalyzeJson: _parseAnalyzeJson,
  extractSql: _extractSql,
  stripSqlFence: _stripSqlFence,
};
