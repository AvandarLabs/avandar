import { EtlRunOptionsError } from "@etl/EtlEngine/EtlRunOptionsError";
import type { EtlScope } from "@etl/EtlEngine/EtlEngine.types";
import type { ResolvedDrive } from "@etl/EtlEngine/resolveDriveScopes/resolveDriveScopes";

function _listDeclaredKeys<TDrive, TScope extends EtlScope>(
  resolvedDrives: ReadonlyArray<ResolvedDrive<TDrive, TScope>>,
): ReadonlySet<string> {
  return new Set(
    resolvedDrives.flatMap((resolved) => {
      return resolved.isResolved
        ? resolved.scopes.map((scope) => {
            return scope.key;
          })
        : [];
    }),
  );
}

/**
 * Keeps only the scopes a run names, when it names any. A drive that
 * declares none of them is left out. A drive that failed before its scopes
 * were known stays, so the run still reports it.
 *
 * @param args.pipelineName - Named in the error.
 * @param args.resolvedDrives - Every drive, resolved.
 * @param args.requestedScopeKeys - `options.scopes`.
 * @returns The drives to crawl, each with only the named scopes.
 * @throws EtlRunOptionsError when a named scope is declared by no drive whose
 * scopes could be listed.
 */
export function selectRequestedScopes<TDrive, TScope extends EtlScope>(args: {
  pipelineName: string;
  resolvedDrives: ReadonlyArray<ResolvedDrive<TDrive, TScope>>;
  requestedScopeKeys: readonly string[] | undefined;
}): ReadonlyArray<ResolvedDrive<TDrive, TScope>> {
  const { requestedScopeKeys } = args;
  if (requestedScopeKeys === undefined) {
    return args.resolvedDrives;
  }
  const declaredKeys = _listDeclaredKeys(args.resolvedDrives);
  const unknownKeys = requestedScopeKeys.filter((scopeKey) => {
    return !declaredKeys.has(scopeKey);
  });
  if (unknownKeys.length > 0) {
    throw new EtlRunOptionsError(
      `The ${args.pipelineName} pipeline has no scope ${unknownKeys.join(", ")}. Its scopes are ${[...declaredKeys].join(", ") || "none"}.`,
    );
  }
  const requestedKeys = new Set(requestedScopeKeys);
  return args.resolvedDrives.flatMap(
    (resolved): Array<ResolvedDrive<TDrive, TScope>> => {
    if (!resolved.isResolved) {
      return [resolved];
    }
    const scopes = resolved.scopes.filter((scope) => {
      return requestedKeys.has(scope.key);
    });
    return scopes.length === 0 ? [] : [{ ...resolved, scopes }];
  },
  );
}
