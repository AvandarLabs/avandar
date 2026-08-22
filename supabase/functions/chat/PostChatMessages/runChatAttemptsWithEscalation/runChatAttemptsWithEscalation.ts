import { sendOpenRouterRequest } from "@sbfn/chat/PostChatMessages/openRouter/sendOpenRouterRequest.ts";
import { isEmptyParsedAttempt } from "@sbfn/chat/PostChatMessages/parsing/isEmptyParsedAttempt.ts";
import { parseOpenRouterResponse } from "@sbfn/chat/PostChatMessages/parsing/parseOpenRouterResponse.ts";
import type { ParsedAttempt } from "@sbfn/chat/PostChatMessages/parsing/parseOpenRouterResponse.ts";

/**
 * Runs a chat turn against OpenRouter, escalating up to three times while the
 * model returns nothing usable.
 *
 * Attempt 1 is the plain call. Attempt 2 repeats it verbatim at a higher
 * temperature, so a retry draws something meaningfully different rather than
 * the same emptiness twice. Attempt 3 forces the model to pick one of the
 * registered tools, and is skipped on the generic surface where the request
 * carries no tools to choose from.
 *
 * Returns the parsed attempt alongside how many calls it took.
 * `analytics.chat_health` averages that count into `avg_attempt_count`, which
 * is how often this escalation is visible on the dashboard. A non-2xx response
 * throws, leaving the caller to record the failure.
 */
export async function runChatAttemptsWithEscalation(
  options: Readonly<{
    requestBody: Record<string, unknown>;
    apiKey: string;
    referer: string;
    lastUserPrompt: string;
    priorClarifications: number;
    datasets?: ReadonlyArray<{ id: string; name: string }>;
    concepts?: ReadonlyArray<{ id: string; name: string }>;
    skipSqlExtraction?: boolean;
  }>,
): Promise<{ parsed: ParsedAttempt; attemptCount: number }> {
  const {
    requestBody,
    apiKey,
    referer,
    lastUserPrompt,
    priorClarifications,
    datasets,
    concepts,
    skipSqlExtraction,
  } = options;

  let attemptCount = 0;
  const runAttempt = async (
    attemptRequestBody: Record<string, unknown>,
  ): Promise<ParsedAttempt> => {
    attemptCount += 1;
    const attempt = await sendOpenRouterRequest({
      requestBody: attemptRequestBody,
      apiKey,
      referer,
    });
    return parseOpenRouterResponse({
      message: attempt.message,
      attemptText: attempt.text,
      lastUserPrompt,
      priorClarifications,
      datasets,
      concepts,
      skipSqlExtraction,
    });
  };

  let parsed = await runAttempt(requestBody);

  if (isEmptyParsedAttempt(parsed)) {
    parsed = await runAttempt({ ...requestBody, temperature: 0.5 });
  }

  const hasTools =
    Array.isArray(requestBody.tools) &&
    (requestBody.tools as unknown[]).length > 0;
  if (isEmptyParsedAttempt(parsed) && hasTools) {
    parsed = await runAttempt({
      ...requestBody,
      temperature: 0.5,
      tool_choice: "required",
    });
  }

  return { parsed, attemptCount };
}
