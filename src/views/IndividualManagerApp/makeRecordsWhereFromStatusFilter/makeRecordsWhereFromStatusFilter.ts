import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { FiltersByColumn } from "@avandar/utils";

/**
 * The filter for one case type's records, narrowed to the chosen statuses
 * when any are chosen.
 *
 * The records list, its count, and both of their query keys use this one
 * filter, so the count in the list header always matches the rows under it.
 *
 * @param options.conceptId The case type.
 * @param options.statusIds The chosen statuses. Empty means every status.
 * @returns A `where` for `IndividualClient` queries.
 */
export function makeRecordsWhereFromStatusFilter(
  options: Readonly<{
    conceptId: Concept.Id;
    statusIds: readonly ConceptStatus.Id[];
  }>,
): { where: FiltersByColumn<Individual.T<"DBRead">> } {
  const { conceptId, statusIds } = options;
  if (statusIds.length === 0) {
    return { where: { concept_id: { eq: conceptId } } };
  }
  return {
    where: {
      concept_id: { eq: conceptId },
      // Sorted so one selection picked in a different order shares a query
      // key, and so a cache entry.
      status_id: { in: [...statusIds].sort() },
    },
  };
}
