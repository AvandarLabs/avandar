import { ETL_SCOPE_KEY_PATTERN } from "@etl/EtlEngine/etlScopes";

/**
 * Checks one drive's scope keys: there is at least one, each matches
 * `ETL_SCOPE_KEY_PATTERN`, and none repeats.
 *
 * @param args.driveKey - Named in the error.
 * @param args.scopeKeys - The keys the drive's `listScopes` returned.
 * @throws Naming the drive and the first invalid or repeated key.
 */
export function assertValidScopeKeys(args: {
  driveKey: string;
  scopeKeys: readonly string[];
}): void {
  const { driveKey } = args;
  if (args.scopeKeys.length === 0) {
    throw new Error(
      `Drive ${driveKey} declares no scopes, so there is nothing to crawl.`,
    );
  }
  const seenKeys = new Set<string>();
  args.scopeKeys.forEach((scopeKey) => {
    if (!ETL_SCOPE_KEY_PATTERN.test(scopeKey)) {
      throw new Error(
        `Drive ${driveKey} declares the scope key ${JSON.stringify(scopeKey)}, which is not valid: use 1 to 64 lowercase letters, digits, and . _ : @ -, starting with a letter or digit.`,
      );
    }
    if (seenKeys.has(scopeKey)) {
      throw new Error(
        `Drive ${driveKey} declares the scope key ${scopeKey} more than once.`,
      );
    }
    seenKeys.add(scopeKey);
  });
}
