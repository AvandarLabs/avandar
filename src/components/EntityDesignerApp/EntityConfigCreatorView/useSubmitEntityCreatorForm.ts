import { useMutation, UseMutationResultTuple } from "@avandar/react-query";
import { isDefined, prop } from "@avandar/utils";
import { match } from "ts-pattern";
import { EntityFieldConfigClient } from "@/clients/entities/EntityFieldConfigClient";
import { EntityConfigClient } from "@/clients/entity-configs/EntityConfigClient";
import { ValueExtractorClient } from "@/clients/entity-configs/ValueExtractorClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { hasPropKeys } from "@/lib/utils/guards/guards";
import type { EntityConfigFormSubmitValues } from "./entityConfigFormTypes";
import type { EntityFieldValueExtractor } from "$/models/EntityConfig/ValueExtractor/ValueExtractor.types";

export function useSubmitEntityCreatorForm(): UseMutationResultTuple<
  void,
  EntityConfigFormSubmitValues
> {
  const workspaceId = useCurrentWorkspace().id;

  return useMutation({
    mutationFn: async (
      entityConfigFormValues: EntityConfigFormSubmitValues,
    ) => {
      // Insert the parent entity
      await EntityConfigClient.insert({
        data: { workspaceId, ...entityConfigFormValues },
      });
      const { fields } = entityConfigFormValues;

      // Insert the child field entities
      await EntityFieldConfigClient.bulkInsert({
        data: fields.map((field) => {
          return { workspaceId, ...field };
        }),
      });

      // Insert the value extractors
      // First, get all value extractors from the fields. Filter out any
      // that don't have the necessary required properties
      const extractorsToCreate: Array<EntityFieldValueExtractor<"Insert">> =
        fields
          .map((field) => {
            const { valueExtractorType, extractors } = field;
            return match(valueExtractorType)
              .with("manual_entry", () => {
                return { ...extractors.manualEntry, workspaceId };
              })
              .with("dataset_column_value", () => {
                const datasetColumnValueExtractor =
                  extractors.datasetColumnValue;

                if (
                  hasPropKeys(datasetColumnValueExtractor, [
                    "datasetId",
                    "datasetColumnId",
                  ])
                ) {
                  return { ...datasetColumnValueExtractor, workspaceId };
                }

                return undefined;
              })
              .exhaustive();
          })
          .filter(isDefined);

      // Send the bulk insert requrest
      await ValueExtractorClient.bulkInsert({
        data: extractorsToCreate,
      });
    },

    onError: async (_error, entityConfigFormValues) => {
      const { fields } = entityConfigFormValues;

      // Roll back all changes
      await Promise.all([
        EntityConfigClient.delete({ id: entityConfigFormValues.id }),
        EntityFieldConfigClient.bulkDelete({
          ids: fields.map(prop("id")),
        }),
      ]);
    },

    queryToInvalidate: EntityConfigClient.QueryKeys.getAll(),
  });
}
