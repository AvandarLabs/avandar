import { useMutation, UseMutationResultTuple } from "@avandar/query-hooks";
import { isDefined, prop } from "@avandar/utils";
import { match } from "ts-pattern";
import { AttributeMappingClient } from "@/clients/ontology/AttributeMappingClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { hasPropKeys } from "@/lib/utils/guards/guards";
import type { ConceptFormSubmitValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import type { AttributeMapping } from "$/models/ontology/AttributeMapping/AttributeMapping.types";

export function useSubmitConceptCreatorForm(): UseMutationResultTuple<
  void,
  ConceptFormSubmitValues
> {
  const workspaceId = useCurrentWorkspace().id;

  return useMutation({
    mutationFn: async (conceptFormValues: ConceptFormSubmitValues) => {
      // Insert the parent individual
      await ConceptClient.insert({
        data: { workspaceId, ...conceptFormValues },
      });
      const { attributes } = conceptFormValues;

      // Insert the child attribute individuals
      await ConceptAttributeClient.bulkInsert({
        data: attributes.map((attribute) => {
          return { workspaceId, ...attribute };
        }),
      });

      // Insert the value mappings
      // First, get all value mappings from the attributes. Filter out any
      // that don't have the necessary required properties
      const mappingsToCreate: Array<AttributeMapping<"Insert">> = attributes
        .map((attribute) => {
          const { mappingType, mappings } = attribute;
          return match(mappingType)
            .with("manual_entry", () => {
              return { ...mappings.manualEntry, workspaceId };
            })
            .with("dataset_column", () => {
              const datasetColumnMapping = mappings.datasetColumn;

              if (
                hasPropKeys(datasetColumnMapping, [
                  "datasetId",
                  "datasetColumnId",
                ])
              ) {
                return { ...datasetColumnMapping, workspaceId };
              }

              return undefined;
            })
            .exhaustive();
        })
        .filter(isDefined);

      // Send the bulk insert requrest
      await AttributeMappingClient.bulkInsert({
        data: mappingsToCreate,
      });
    },

    onError: async (_error, conceptFormValues) => {
      const { attributes } = conceptFormValues;

      // Roll back all changes
      await Promise.all([
        ConceptClient.delete({ id: conceptFormValues.id }),
        ConceptAttributeClient.bulkDelete({
          ids: attributes.map(prop("id")),
        }),
      ]);
    },

    queryToInvalidate: ConceptClient.QueryKeys.getAll(),
  });
}
