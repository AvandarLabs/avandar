import { isDefined } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useCallback } from "react";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { buildCandidateLookupSqlFromDiscovery } from "@/components/ChatPanel/PendingClarificationBlock/buildCandidateLookupSqlFromDiscovery/buildCandidateLookupSqlFromDiscovery";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { DiscoveryResolver } from "@/components/ChatPanel/chatClarify.types";

const MAX_DISCOVERY_VALUES = 100;

/** The non-empty text values of each row's first column, in row order. */
async function _runFirstColumnQuery(
  options: Readonly<{ sql: string; workspaceId: Workspace.Id }>,
): Promise<string[]> {
  const queryResult = await WorkspaceQuerySession.runQuery<
    Record<string, unknown>
  >({ rawSql: options.sql, workspaceId: options.workspaceId });
  return queryResult.data
    .map((row) => {
      const rowKeys = Object.keys(row);
      const value = rowKeys.length > 0 ? row[rowKeys[0]!] : undefined;
      return value === null || value === undefined ? undefined : String(value);
    })
    .filter(isDefined)
    .filter((value) => {
      return value.length > 0;
    });
}

/**
 * The stored values that match the prompt-derived candidates. A failed
 * lookup finds nothing rather than failing the discovery, since the
 * discovery's own list is still usable.
 */
async function _findCandidateMatches(
  options: Readonly<{
    discoveryQuery: string;
    column: string;
    candidateValues: readonly string[];
    workspaceId: Workspace.Id;
  }>,
): Promise<string[]> {
  const sql = buildCandidateLookupSqlFromDiscovery(options);
  if (sql === undefined) {
    return [];
  }
  try {
    return await _runFirstColumnQuery({
      sql,
      workspaceId: options.workspaceId,
    });
  } catch {
    return [];
  }
}

/**
 * Creates the callback that turns a discovery query into clarification
 * options.
 *
 * The lookup runs through `WorkspaceQuerySession`, like the Data Explorer's
 * own queries, so a dataset the explorer has not opened yet is loaded into
 * DuckDB first and only this workspace's datasets can be read. Stored values
 * matching the prompt-derived candidates come first, even when they sort past
 * the discovery's first 100 values.
 */
export function useDiscoveryResolver(
  workspaceId: Workspace.Id,
): DiscoveryResolver {
  const { t } = useLingui();

  return useCallback<DiscoveryResolver>(
    async function resolveDiscoveryOptions(options) {
      try {
        const listedValues = await _runFirstColumnQuery({
          sql: options.query,
          workspaceId,
        });
        const candidateMatches = await _findCandidateMatches({
          discoveryQuery: options.query,
          column: options.column,
          candidateValues: options.candidateValues ?? [],
          workspaceId,
        });
        const uniqueListedValues = Array.from(new Set(listedValues))
          .filter((value) => {
            return !candidateMatches.includes(value);
          })
          .slice(0, MAX_DISCOVERY_VALUES);
        return {
          values: [...new Set(candidateMatches), ...uniqueListedValues],
        };
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
