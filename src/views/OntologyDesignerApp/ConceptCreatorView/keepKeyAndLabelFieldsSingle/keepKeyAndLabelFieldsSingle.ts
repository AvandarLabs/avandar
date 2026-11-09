import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { AttributeFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";

/**
 * The form's fields with every identifier and the label set to keep one
 * value, with no period or date column. An identifier matches rows to a
 * record and the label names it, so neither can be a list of either kind,
 * and `rpc_concepts__create` refuses one that is. Called by the concept
 * creator's submit transform.
 */
export function keepKeyAndLabelFieldsSingle(
  options: Readonly<{
    attributes: readonly AttributeFormValues[];
    labelAttributeId: ConceptAttribute.Id | undefined;
  }>,
): AttributeFormValues[] {
  return options.attributes.map((attribute) => {
    return attribute.isIdentifier || attribute.id === options.labelAttributeId
      ? {
          ...attribute,
          isArray: false,
          bucketGrain: undefined,
          mappings: {
            ...attribute.mappings,
            datasetColumn: {
              ...attribute.mappings.datasetColumn,
              bucketColumnId: undefined,
            },
          },
        }
      : attribute;
  });
}
