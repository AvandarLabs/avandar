import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { User } from "$/models/User/User";
import type { FiltersByColumn } from "@avandar/utils";

/**
 * Who the records list is narrowed to.
 *
 * `anyone` adds no assignee clause. `unassigned` matches an empty
 * `assigned_to`. `member` matches that user's id.
 */
export type AssigneeFilter =
  | { kind: "anyone" }
  | { kind: "unassigned" }
  | { kind: "member"; userId: User.Id };

/**
 * The filter for one case type's records.
 *
 * The records list, its count, and both of their query keys use this one
 * filter, so the count in the list header always matches the rows under it.
 * Status ids are sorted so one selection picked in a different order shares
 * a query key.
 */
export function makeRecordsListWhere(
  options: Readonly<{
    conceptId: Concept.Id;
    statusIds: readonly ConceptStatus.Id[];
    assignee: AssigneeFilter;
  }>,
): { where: FiltersByColumn<Individual.T<"DBRead">> } {
  const { conceptId, statusIds, assignee } = options;
  const where: FiltersByColumn<Individual.T<"DBRead">> = {
    concept_id: { eq: conceptId },
  };
  if (statusIds.length > 0) {
    where.status_id = { in: [...statusIds].sort() };
  }
  if (assignee.kind === "unassigned") {
    where.assigned_to = { is: null };
  }
  if (assignee.kind === "member") {
    where.assigned_to = { eq: assignee.userId };
  }
  return { where };
}
