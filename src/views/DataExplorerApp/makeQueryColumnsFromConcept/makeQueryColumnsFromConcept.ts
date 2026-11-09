import { ConceptStatusColumn } from "$/models/queries/ConceptStatusColumn/ConceptStatusColumn";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

/**
 * Every column a case type offers to a query: one per attribute, then the
 * built-in `status` column every case type has.
 */
export function makeQueryColumnsFromConcept(
  options: Readonly<{
    conceptId: Concept.Id;
    attributes: readonly ConceptAttribute.T[];
  }>,
): QueryColumn.T[] {
  return [
    ...QueryColumn.makeFromConceptAttributes(options.attributes),
    QueryColumn.makeFromConceptStatusColumn(
      ConceptStatusColumn.fromConceptId(options.conceptId),
    ),
  ];
}
