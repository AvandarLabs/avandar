import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * Thrown by `assertWorkspaceRelations` when a query names a relation that does
 * not belong to the workspace it was submitted against.
 *
 * This is the **per-relation** denial, and it is a different condition from
 * `WorkspaceMembershipDenied`, which refuses the **principal**. A caller can
 * hold a perfectly good membership in workspace A and still name a dataset that
 * belongs only to workspace B; that is this class.
 *
 * As with the membership denial, a failure to *read* the workspace's dataset
 * list propagates as the underlying fetch error rather than as this type, so
 * "you may not read this" stays distinguishable from "we could not find out".
 * That distinction matters more here than it looks: the dataset list caches an
 * empty array as a success, and treating that as a denial would be
 * indistinguishable from a genuine refusal without it.
 */
export class WorkspaceRelationsDenied extends Error {
  /** The workspace the query was submitted against. */
  readonly workspaceId: Workspace.Id;

  /**
   * The referenced relations that the workspace does not contain, sorted so
   * the message is stable across runs.
   */
  readonly deniedDatasetIds: readonly Dataset.Id[];

  constructor(
    options: Readonly<{
      workspaceId: Workspace.Id;
      deniedDatasetIds: readonly Dataset.Id[];
    }>,
  ) {
    const sortedIds = [...options.deniedDatasetIds].sort();
    super(
      `Cannot query ${sortedIds.length === 1 ? "relation" : "relations"} ` +
        `${sortedIds.join(", ")} in workspace ${options.workspaceId} ` +
        `because they do not belong to it.`,
    );
    this.name = "WorkspaceRelationsDenied";
    this.workspaceId = options.workspaceId;
    this.deniedDatasetIds = sortedIds;
  }
}
