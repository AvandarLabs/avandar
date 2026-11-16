import type { Concept } from "$/models/ontology/Concept/Concept";
import type { Individual } from "$/models/ontology/Individual/Individual";

/** The loaded records of one case type, in the order they were given. */
export type CaseTypeRecordGroup = {
  conceptId: Concept.Id;
  records: Individual.T[];
};

/**
 * Groups records by case type, in the order each case type first appears.
 *
 * The queue asks the database for `concept_id` then `name`, so a case type's
 * rows arrive together. The map still appends if a later page repeats one,
 * which keeps a split page in the section it already opened.
 */
export function groupRecordsByCaseType(
  records: readonly Individual.T[],
): CaseTypeRecordGroup[] {
  const groups: CaseTypeRecordGroup[] = [];
  const indexByConceptId = new Map<Concept.Id, number>();
  for (const record of records) {
    const existingIndex = indexByConceptId.get(record.conceptId);
    if (existingIndex === undefined) {
      indexByConceptId.set(record.conceptId, groups.length);
      groups.push({ conceptId: record.conceptId, records: [record] });
      continue;
    }
    groups[existingIndex]?.records.push(record);
  }
  return groups;
}
