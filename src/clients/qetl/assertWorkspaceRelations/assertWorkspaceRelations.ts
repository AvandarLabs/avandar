import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Workspace } from "$/models/Workspace/Workspace";

import { prop, where } from "@avandar/utils";

import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { WorkspaceRelationsDenied } from "@/clients/qetl/assertWorkspaceRelations/WorkspaceRelationsDenied";
import { AvaQueryClient } from "@/config/AvaQueryClient";

/**
 * Rejects a query that names a relation outside `workspaceId`, and returns the
 * referenced relations once every one of them is accounted for.
 *
 * This is the **per-relation** half of authorization, and it is the one
 * `assertWorkspaceMembership` explicitly does not cover: membership asserts the
 * caller may act in the named workspace, and says nothing about which relations
 * a given statement went on to name. Both must run.
 *
 * **This fails closed.** The previous behaviour intersected the statement's
 * table references with the workspace's dataset list and silently dropped
 * whatever was left over, so a reference to another workspace's dataset
 * produced a query missing a dependency rather than a refusal. Two things were
 * wrong with that. A denial was indistinguishable from a typo, because both
 * surfaced later as a DuckDB "table not found". And a dropped reference was
 * still a reference: the table it names may already be resident in this tab's
 * DuckDB from an earlier session, in which case the statement reads it. Naming
 * the offending relations and refusing is both safer and more truthful.
 *
 * Only dataset ids reach here: string literals and UUID-shaped CTE aliases
 * are excluded, and prefixed views such as `concept_<uuid>` are not dataset
 * ids. `ava_rows_<uuid>` is reported as its dataset, which is a read of that
 * file. So every id checked here is a dataset reference by the invariant
 * `RelationRef.fromTableName` encodes, and a denial cannot be triggered by
 * SQL that merely mentions a UUID.
 *
 * **Freshness.** The dataset list is read with `fetchQuery`, not
 * `ensureQueryData`. `ensureQueryData` resolves from any present cache entry
 * regardless of how stale it is, so a dataset removed from the workspace stayed
 * authorized until the entry was evicted. `fetchQuery` honors `staleTime` and
 * invalidation, which makes revocation land while online at the same freshness
 * the membership check already has. Offline, `AvaQueryClient` sets `staleTime`
 * to infinity, so the answer is as old as the persisted entry: that is the
 * accepted offline authorization window, not a gap introduced here.
 *
 * @param options.workspaceId The workspace the statement was submitted against.
 * @param options.referencedDatasetIds Bare-UUID table references from the SQL.
 * @returns The referenced relations, deduplicated, all of them authorized.
 * @throws WorkspaceRelationsDenied if any reference is outside the workspace.
 * Rethrows the underlying error if the dataset list could not be read.
 */
export async function assertWorkspaceRelations(
  options: Readonly<{
    workspaceId: Workspace.Id;
    referencedDatasetIds: readonly string[];
  }>,
): Promise<Dataset.Id[]> {
  const referencedIds = Array.from(
    new Set(options.referencedDatasetIds),
  ) as Dataset.Id[];

  // A statement naming no relation cannot name an unauthorized one, and asking
  // for the dataset list to prove that would put a read on every such query.
  if (referencedIds.length === 0) {
    return [];
  }

  const workspaceDatasetIds = new Set(
    (
      await DatasetClient.withCache(AvaQueryClient)
        .withFetchQuery()
        .getAll(where("workspace_id", "eq", options.workspaceId))
    ).map(prop("id")),
  );

  const deniedDatasetIds = referencedIds.filter((datasetId) => {
    return !workspaceDatasetIds.has(datasetId);
  });

  // An empty workspace list is an answer (deny every reference), never a cache
  // miss worth retrying, exactly as it is for membership.
  if (deniedDatasetIds.length > 0) {
    throw new WorkspaceRelationsDenied({
      workspaceId: options.workspaceId,
      deniedDatasetIds,
    });
  }

  return referencedIds;
}
