import { match } from "ts-pattern";
import { createSupabaseCRUDClient } from "@/lib/clients/createSupabaseCRUDClient";
import { makeBucketsFromList } from "@/lib/utils/objects/builders";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { promiseMap } from "@/lib/utils/promises";
import { AggregationExtractorClient } from "../ValueExtractor/AggregationExtractor/AggregationExtractorClient";
import { DatasetColumnValueExtractorClient } from "../ValueExtractor/DatasetColumnValueExtractor/DatasetColumnValueExtractorClient";
import { ManualEntryExtractorClient } from "../ValueExtractor/ManualEntryExtractor/ManualEntryExtractorClient";
import { EntityFieldValueExtractor } from "../ValueExtractor/types";
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
      }): Promise<readonly EntityFieldValueExtractor[]> => {
        if (!fields) {
          return [];
        }

        const logger = clientLogger.appendName("getAllValueExtractors");

        // get all the distinct value extractor types so we only query
        // those tables and don't waste time with other queries.
        const valueExtractorTypes = fields.map(getProp("valueExtractorType"));
        const uniqueValueExtractorTypes = Array.from(
          new Set(valueExtractorTypes),
        );

        // bucket each field by value extractor type
        const fieldsByValueExtractorType = makeBucketsFromList({
          list: fields,
          keyFn: getProp("valueExtractorType"),
        });

        logger.log("Fetching value extractors for fields", {
          fieldIds: fields.map(getProp("id")),
        });

        // now make one query for each value extractor type
        const valueExtractors = await promiseMap(
          [...uniqueValueExtractorTypes],
          async (valueExtractorType) => {
            const fieldsToQuery =
              fieldsByValueExtractorType[valueExtractorType];
            return match(valueExtractorType)
              .with("aggregation", () => {
                return AggregationExtractorClient.getAll({
                  where: {
                    entity_field_config_id: {
                      in: fieldsToQuery.map(getProp("id")),
                    },
                  },
                });
              })
              .with("manual_entry", () => {
                return ManualEntryExtractorClient.getAll({
                  where: {
                    entity_field_config_id: {
                      in: fieldsToQuery.map(getProp("id")),
                    },
                  },
                });
              })
              .with("dataset_column_value", () => {
                return DatasetColumnValueExtractorClient.getAll({
                  where: {
                    entity_field_config_id: {
                      in: fieldsToQuery.map(getProp("id")),
                    },
                  },
                });
              })
              .exhaustive();
          },
        );

        const valueExtractorsList = valueExtractors.flat();
        logger.log("Received value extractors", valueExtractorsList);
        return valueExtractorsList;
      },
    };
  },
});
