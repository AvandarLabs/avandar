import type { LiveDriveScopes } from "@ava-cli/PipelineCli/fetchLivePipelineScopes/fetchLivePipelineScopes";
import type { StoredScope } from "@ava-cli/PipelineCli/ResetPipelineCli/pipelineListingsRest";

/** A drive and scope a pipeline has stored but no longer declares. */
export type RetiredScope = Readonly<{ driveKey: string; scopeKey: string }>;

/**
 * The stored drive and scope pairs that are not live, in stored order. A
 * drive the pipeline no longer lists has all of its scopes retired.
 *
 * @param args.stored - What the list RPC returned.
 * @param args.live - What the pipeline declares today.
 * @param args.scopeKey - Keep only this scope, when given.
 */
export function findRetiredScopes(args: {
  stored: readonly StoredScope[];
  live: readonly LiveDriveScopes[];
  scopeKey: string | undefined;
}): RetiredScope[] {
  const livePairs = new Set(
    args.live.flatMap((drive) => {
      return drive.scopeKeys.map((scopeKey) => {
        return JSON.stringify([drive.driveKey, scopeKey]);
      });
    }),
  );
  return args.stored
    .filter((pair) => {
      return (
        !livePairs.has(JSON.stringify([pair.drive_key, pair.scope_key])) &&
        (args.scopeKey === undefined || pair.scope_key === args.scopeKey)
      );
    })
    .map((pair) => {
      return { driveKey: pair.drive_key, scopeKey: pair.scope_key };
    });
}
