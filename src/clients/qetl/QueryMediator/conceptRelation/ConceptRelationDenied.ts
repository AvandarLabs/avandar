import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";

/**
 * Thrown when a query names a concept the caller may not read: one outside
 * the caller's allowed concepts, or one whose records come from a dataset
 * the caller cannot load. The plugin data slot runtime reports it as
 * `PermissionDenied`.
 *
 * Like `WorkspaceRelationsDenied`, this is a per-relation denial, not a
 * refusal of the principal.
 */
export class ConceptRelationDenied extends Error {
  /** The concept the query named. */
  readonly conceptId: Concept.Id;

  /**
   * The contributing datasets the caller cannot load, sorted. Empty when the
   * concept itself is not allowed.
   */
  readonly deniedDatasetIds: readonly Dataset.Id[];

  constructor(
    options: Readonly<{
      conceptId: Concept.Id;
      deniedDatasetIds?: readonly Dataset.Id[];
    }>,
  ) {
    const sortedIds = [...(options.deniedDatasetIds ?? [])].sort();
    super(
      sortedIds.length === 0
        ? `Concept '${options.conceptId}' does not belong to this ` +
            `workspace, so it cannot be queried here.`
        : `Concept '${options.conceptId}' reads dataset(s) ` +
            `${sortedIds.join(", ")} that are not reachable from this ` +
            `workspace, so it cannot be queried here.`,
    );
    this.name = "ConceptRelationDenied";
    this.conceptId = options.conceptId;
    this.deniedDatasetIds = sortedIds;
  }
}
