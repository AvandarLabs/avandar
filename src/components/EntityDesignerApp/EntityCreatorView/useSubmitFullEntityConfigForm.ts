import { match } from "ts-pattern";
import {
  useMutation,
  UseMutationResultTuple,
} from "@/lib/hooks/query/useMutation";
import { hasProps } from "@/lib/utils/guards";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";
import { EntityFieldConfigClient } from "@/models/EntityConfig/EntityFieldConfig/EntityFieldConfigClient";
import { AggregationExtractorClient } from "@/models/EntityConfig/ValueExtractor/AggregationExtractor/AggregationExtractorClient";
import { AggregationExtractor } from "@/models/EntityConfig/ValueExtractor/AggregationExtractor/types";
import { DatasetColumnValueExtractorClient } from "@/models/EntityConfig/ValueExtractor/DatasetColumnValueExtractor/DatasetColumnValueExtractorClient";
import { DatasetColumnValueExtractor } from "@/models/EntityConfig/ValueExtractor/DatasetColumnValueExtractor/types";
import { ManualEntryExtractorClient } from "@/models/EntityConfig/ValueExtractor/ManualEntryExtractor/ManualEntryExtractorClient";
import { ManualEntryExtractor } from "@/models/EntityConfig/ValueExtractor/ManualEntryExtractor/types";
import { EntityConfigFormValues } from "./entityCreatorTypes";

export function useSubmitFullEntityConfigForm(): UseMutationResultTuple<
  void,
  EntityConfigFormValues
> {
  return useMutation({
    mutationFn: async (entityConfigForm: EntityConfigFormValues) => {
      // create the parent entity
      await EntityConfigClient.insert({
        data: entityConfigForm,
      });

      // create the child field entities
      await Promise.all([
        EntityFieldConfigClient.bulkInsert({
          data: entityConfigForm.fields,
        }),
      ]);

      const aggregationExtractors: Array<AggregationExtractor<"Insert">> = [];
      const manualEntryExtractors: Array<ManualEntryExtractor<"Insert">> = [];
      const datasetColumnValueExtractors: Array<
        DatasetColumnValueExtractor<"Insert">
      > = [];

      entityConfigForm.fields.forEach((field) => {
        match(field.valueExtractorType)
          .with("manual_entry", () => {
            manualEntryExtractors.push(field.manualEntryExtractor);
          })
          .with("dataset_column_value", () => {
            const { datasetColumnValueExtractor } = field;
            if (
              hasProps(
                datasetColumnValueExtractor,
                "datasetId",
                "datasetFieldId",
              )
            ) {
              datasetColumnValueExtractors.push(datasetColumnValueExtractor);
            }
          })
          .with("aggregation", () => {
            const { aggregationExtractor } = field;
            if (hasProps(aggregationExtractor, "datasetId", "datasetFieldId")) {
              aggregationExtractors.push(aggregationExtractor);
            }
          })
          .exhaustive();
      });

      // now send requests to save the extractors
      await Promise.all([
        AggregationExtractorClient.bulkInsert({
          data: aggregationExtractors,
        }),
        ManualEntryExtractorClient.bulkInsert({
          data: manualEntryExtractors,
        }),
        DatasetColumnValueExtractorClient.bulkInsert({
          data: datasetColumnValueExtractors,
        }),
      ]);

      // for each of those fields, create all their value extractors
      // 1. TODO(pablo): you are left here. Now test saving the extractors!
      // *** 2. Then test manual extractor save
      // *** 3. Then test dataset column value save
      // 4. Then have an error message for Aggregation for now.
      // 5. Then show the extractors in the View page.
      // 6. Then set up your first pipeline to populate all the entities.
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
