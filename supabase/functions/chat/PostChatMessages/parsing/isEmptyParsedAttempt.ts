import type { ParsedAttempt } from "@sbfn/chat/PostChatMessages/parsing/parseOpenRouterResponse.ts";

/** Returns whether an OpenRouter attempt produced no usable response. */
export function isEmptyParsedAttempt(parsedAttempt: ParsedAttempt): boolean {
  return (
    !parsedAttempt.generatedSql &&
    !parsedAttempt.clarification &&
    !parsedAttempt.dashboardBlock &&
    parsedAttempt.text.length === 0
  );
}
