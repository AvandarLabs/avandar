import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";
import type { DashboardFilterTargets } from "@/views/DashboardApp/DashboardFilterStateManager/resolveDashboardFilterBindings/resolveDashboardFilterBindings";
import type { QueryClient } from "@tanstack/react-query";

type Scope = { id: string; auth: StructuredQueryAuth; rawSql: string };
type Memory = { rawSql: string; targets: DashboardFilterTargets };
const memories = new WeakMap<QueryClient, Map<string, Memory>>();

function _buildScopeKey({ id, auth }: Readonly<Scope>): string {
  return JSON.stringify([
    id,
    auth.auth,
    auth.auth === "workspace" ? auth.workspaceId : auth.publicAvaPageId,
    auth.auth === "workspace" ? undefined : auth.snapshotRevision,
  ]);
}

/** Session-only target ownership shared by rendering and explicit edits. */
export const DataVizRuntimeTargets = {
  /** Retains bound IDs. Only unbound names retry on SQL edits. */
  get(
    queryClient: QueryClient,
    scope: Readonly<Scope>,
  ): DashboardFilterTargets | undefined {
    const memory = memories.get(queryClient)?.get(_buildScopeKey(scope));
    if (!memory || memory.rawSql === scope.rawSql) {
      return memory?.targets;
    }
    return Object.fromEntries(
      Object.entries(memory.targets).map(([id, target]) => {
        return [
          id,
          target.kind === "unresolved"
            ? { kind: "legacy" as const, columnName: target.columnName }
            : target,
        ];
      }),
    );
  },
  /** Retains identities without saving the document or viewer values. */
  set(
    queryClient: QueryClient,
    scope: Readonly<Scope>,
    targets: DashboardFilterTargets,
  ): void {
    const memory = memories.get(queryClient) ?? new Map<string, Memory>();
    memory.set(_buildScopeKey(scope), { rawSql: scope.rawSql, targets });
    memories.set(queryClient, memory);
  },
};
