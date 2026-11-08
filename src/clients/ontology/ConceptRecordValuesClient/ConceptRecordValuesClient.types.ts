import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

/**
 * One record's field values, as its case type's concept view computes them.
 *
 * `ConceptRecordValuesClient.getConceptRecordValues` returns one per requested
 * record, and a screen reads a field's value by the field's id, for example
 * the record page's Details rail. A field with no value holds `null`. A field
 * the view did not return has no key.
 */
export type ConceptRecordValues = {
  externalId: string;
  valuesByAttributeId: Partial<Record<ConceptAttribute.Id, unknown>>;
};
