import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";

/**
 * The picked statuses the case type still has.
 *
 * A status can be deleted while it is picked in the records filter. Keeping
 * its id would narrow the list to a status no record can have, and the list
 * would go empty with nothing on screen to explain why.
 *
 * @param options.statusIds The statuses picked in the filter.
 * @param options.statuses The case type's current statuses.
 * @returns The picked ids that are still among `statuses`, in picked order.
 */
export function filterToKnownStatusIds(
  options: Readonly<{
    statusIds: readonly ConceptStatus.Id[];
    statuses: ReadonlyArray<Pick<ConceptStatus.T, "id">>;
  }>,
): ConceptStatus.Id[] {
  const knownIds = new Set(
    options.statuses.map((status) => {
      return status.id;
    }),
  );
  return options.statusIds.filter((statusId) => {
    return knownIds.has(statusId);
  });
}
