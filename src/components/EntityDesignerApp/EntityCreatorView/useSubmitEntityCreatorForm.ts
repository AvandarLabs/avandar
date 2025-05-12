import { match } from "ts-pattern";
import {
  useMutation,
  UseMutationResultTuple,
} from "@/lib/hooks/query/useMutation";
import { hasProps, isNotUndefined } from "@/lib/utils/guards";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";
import { EntityFieldConfigClient } from "@/models/EntityConfig/EntityFieldConfig/EntityFieldConfigClient";
import { EntityFieldValueExtractor } from "@/models/EntityConfig/ValueExtractor/types";
import { ValueExtractorClient } from "@/models/EntityConfig/ValueExtractor/ValueExtractorClient";
import { EntityConfigFormValues } from "./entityCreatorTypes";

export function useSubmitEntityCreatorForm(): UseMutationResultTuple<
  void,
  EntityConfigFormValues
> {
  return useMutation({
    mutationFn: async (entityConfigForm: EntityConfigFormValues) => {
      // Insert the parent entity
      await EntityConfigClient.insert({
        data: entityConfigForm,
      });

      // Insert the child field entities
      await EntityFieldConfigClient.bulkInsert({
        data: entityConfigForm.fields,
      });

      // Insert the value extractors
      // First, get all value extractors from the fields. Filter out any
      // that don't have the necessary required properties
      const extractorsToCreate: Array<EntityFieldValueExtractor<"Insert">> =
        entityConfigForm.fields
          .map((field) => {
            const { options, extractors } = field;
            return match(options.valueExtractorType)
              .with("manual_entry", () => {
                return extractors.manualEntry;
              })
              .with("dataset_column_value", () => {
                const datasetColumnValueExtractor =
                  extractors.datasetColumnValue;
                if (
                  hasProps(
                    datasetColumnValueExtractor,
                    "datasetId",
                    "datasetFieldId",
                  )
                ) {
                  return datasetColumnValueExtractor;
                }
                return undefined;
              })
              .with("aggregation", () => {
                const aggregationExtractor = extractors.aggregation;
                if (
                  hasProps(aggregationExtractor, "datasetId", "datasetFieldId")
                ) {
                  return aggregationExtractor;
                }
                return undefined;
              })
              .exhaustive();
          })
          .filter(isNotUndefined);

      // Send the bulk insert requrest
      await ValueExtractorClient.bulkInsert({
        data: extractorsToCreate,
      });
    },

    onError: async (_error, entityConfigForm) => {
      // Roll back all changes
      await Promise.all([
        EntityConfigClient.delete({ id: entityConfigForm.id }),
        EntityFieldConfigClient.bulkDelete({
          ids: entityConfigForm.fields.map((f) => {
            return f.id;
          }),
        }),
      ]);
    },

    queryToInvalidate: EntityConfigClient.QueryKeys.getAll(),
  });
}
