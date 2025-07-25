import { match } from "ts-pattern";
import { createSupabaseCRUDClient } from "@/lib/clients/supabase/createSupabaseCRUDClient";
import { makeBucketRecordFromList } from "@/lib/utils/objects/builders";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { objectKeys } from "@/lib/utils/objects/misc";
import { promiseFlatMap } from "@/lib/utils/promises";
import { AggregationExtractorClient } from "../ValueExtractor/AggregationExtractor/AggregationExtractorClient";
import { DatasetColumnValueExtractorClient } from "../ValueExtractor/DatasetColumnValueExtractor/DatasetColumnValueExtractorClient";
import { ManualEntryExtractorClient } from "../ValueExtractor/ManualEntryExtractor/ManualEntryExtractorClient";
import {
  EntityFieldValueExtractor,
  ValueExtractorType,
} from "../ValueExtractor/types";
import { EntityFieldConfigParsers } from "./parsers";
import { EntityFieldConfig } from "./types";

export const EntityFieldConfigClient = createSupabaseCRUDClient({
  modelName: "EntityFieldConfig",
  tableName: "entity_field_configs",
  dbTablePrimaryKey: "id",
  parsers: EntityFieldConfigParsers,
  queries: ({ clientLogger }) => {
    return {
      getAllValueExtractors: async ({
        fields,
      }: {
        fields: readonly EntityFieldConfig[] | undefined;
      }): Promise<EntityFieldValueExtractor[]> => {
        const logger = clientLogger.appendName("getAllValueExtractors");
        if (!fields) {
          return [];
        }

        // Bucket each field by value extractor type, so we only query for
        // the extractor types that we need
        const fieldsByValueExtractorType = makeBucketRecordFromList(fields, {
          keyFn: getProp("options.valueExtractorType"),
        });
        const fieldIds = fields.map(getProp("id"));

        logger.log("Fetching value extractors for fields", {
          fieldIds,
        });

        const whereInFieldIds = {
          where: {
            entity_field_config_id: {
              in: fieldIds,
            },
          },
        };

        // Now make one query per extractor type
        const valueExtractors = await promiseFlatMap(
          objectKeys(fieldsByValueExtractorType),
          async (
            valueExtractorType: ValueExtractorType,
          ): Promise<EntityFieldValueExtractor[]> => {
            const extractors = await match(valueExtractorType)
              .with("aggregation", () => {
                return AggregationExtractorClient.getAll(whereInFieldIds);
              })
              .with("manual_entry", () => {
                return ManualEntryExtractorClient.getAll(whereInFieldIds);
              })
              .with("dataset_column_value", () => {
                return DatasetColumnValueExtractorClient.getAll(
                  whereInFieldIds,
                );
              })
              .exhaustive();
            return extractors;
          },
        );

        logger.log("Received value extractors", valueExtractors);
        return valueExtractors;
      },
    };
  },
});
