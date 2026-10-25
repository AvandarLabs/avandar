import { ETL_SCOPE_KEY_PATTERN } from "@etl/EtlEngine/etlScopes";

/**
 * Throws unless `scopeKey` is a key a pipeline could declare, so a typo
 * fails before any request instead of matching nothing.
 */
export function assertValidScopeKey(scopeKey: string): void {
  if (!ETL_SCOPE_KEY_PATTERN.test(scopeKey)) {
    throw new Error(
      `Invalid scope key: ${scopeKey}. A scope key is 1 to 64 lowercase ` +
        "letters, digits, and . _ : @ -, starting with a letter or digit.",
    );
  }
}
