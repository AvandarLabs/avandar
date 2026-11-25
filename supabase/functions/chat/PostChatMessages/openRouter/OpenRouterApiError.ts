/**
 * What `sendOpenRouterRequest` throws when OpenRouter answers with a failing
 * status. The message is the upstream error text, which can echo part of the
 * request. A route that must not pass that text on, for example one whose
 * prompt holds a user's column names, catches it and reads only `status`.
 */
export class OpenRouterApiError extends Error {
  constructor(
    public readonly status: number,
    errorText: string,
  ) {
    super(`OpenRouter API error: ${errorText}`);
  }
}
