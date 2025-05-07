import { match } from "ts-pattern";
import { createSupabaseCRUDClient } from "@/lib/clients/createSupabaseCRUDClient";
import { makeBucketsFromList } from "@/lib/utils/objects/builders";
import { getProp, getPropAt } from "@/lib/utils/objects/higherOrderFuncs";
import { objectKeys } from "@/lib/utils/objects/misc";
import { promiseFlatMap } from "@/lib/utils/promises";
import { AggregationExtractorClient } from "../ValueExtractor/AggregationExtractor/AggregationExtractorClient";
import { DatasetColumnValueExtractorClient } from "../ValueExtractor/DatasetColumnValueExtractor/DatasetColumnValueExtractorClient";
import { ManualEntryExtractorClient } from "../ValueExtractor/ManualEntryExtractor/ManualEntryExtractorClient";
import {
  EntityFieldValueExtractor,
  EntityFieldValueExtractorType,
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
        if (!fields) {
          return [];
        }

        const logger = clientLogger.appendName("getAllValueExtractors");

        // Bucket each field by value extractor type, so we only query for
        // the extractor types that we need
        const fieldsByValueExtractorType = makeBucketsFromList({
          list: fields,
          keyFn: getPropAt("options.valueExtractorType"),
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
          (
            valueExtractorType: EntityFieldValueExtractorType,
          ): Promise<EntityFieldValueExtractor[]> => {
            return match(valueExtractorType)
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
          },
        );

        logger.log("Received value extractors", valueExtractors);
        return valueExtractors;
      },
    };
  },
});
