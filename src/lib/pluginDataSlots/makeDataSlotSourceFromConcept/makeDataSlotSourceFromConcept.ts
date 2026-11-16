import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type {
  DataSlotSource,
  DataSlotSourceField,
} from "@/lib/pluginDataSlots/DataSlotSource.types";

/**
 * Makes the data slot source for a case type: one field per single-value
 * attribute, named by the column the case type's view gives it. List
 * attributes are left out, since a slot attribute holds one value per row.
 *
 * `attributes` must be every attribute of the case type, list ones
 * included, because they all claim column names in the view.
 */
export function makeDataSlotSourceFromConcept(
  options: Readonly<{
    concept: Concept.T;
    attributes: readonly ConceptAttribute.T[];
  }>,
): DataSlotSource {
  const viewColumnsById = ConceptAttribute.getViewColumnNames(
    options.attributes,
  );
  const fields = [...options.attributes]
    .sort(ConceptAttribute.compareInViewOrder)
    .filter((attribute) => {
      return !attribute.isArray;
    })
    .map((attribute): DataSlotSourceField => {
      return {
        id: attribute.id,
        columnName: viewColumnsById.get(attribute.id)!.columnName,
        label: attribute.name,
        dataType: attribute.dataType,
      };
    });
  return {
    kind: "concept",
    conceptId: options.concept.id,
    name: options.concept.name,
    fields,
  };
}
