import { isDefined } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useCallback } from "react";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { DiscoveryResolver } from "@/components/ChatPanel/chatClarify.types";

/**
 * Creates the callback that turns a discovery query into clarification
 * options.
 *
 * The lookup runs through `WorkspaceQuerySession`, like the Data Explorer's
 * own queries, so a dataset the explorer has not opened yet is loaded into
 * DuckDB first and only this workspace's datasets can be read.
 */
export function useDiscoveryResolver(
  workspaceId: Workspace.Id,
): DiscoveryResolver {
  const { t } = useLingui();

  return useCallback<DiscoveryResolver>(
    async function resolveDiscoveryOptions(options) {
      try {
        const queryResult = await WorkspaceQuerySession.runQuery<
          Record<string, unknown>
        >({ rawSql: options.query, workspaceId });
        const values = queryResult.data
          .map((row) => {
            const rowKeys = Object.keys(row);
            const value = rowKeys.length > 0 ? row[rowKeys[0]!] : undefined;
            return value === null || value === undefined
              ? undefined
              : String(value);
          })
          .filter(isDefined)
          .filter((value) => {
            return value.length > 0;
          });
        const seenValues = new Set<string>();
        const deduplicatedValues: string[] = [];
        for (const value of values) {
          if (!seenValues.has(value)) {
            seenValues.add(value);
            deduplicatedValues.push(value);
            if (deduplicatedValues.length >= 100) {
              break;
            }
          }
        }
        return { values: deduplicatedValues };
      } catch (error) {
        return {
          error:
            error instanceof Error ? error.message : t`Discovery query failed.`,
        };
      }
    },
    [t, workspaceId],
  );
}
