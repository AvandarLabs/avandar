import { where } from "@utils/filters/where/where";
import { prop } from "@utils/objects/hofs/prop/prop";
import { makeBucketRecord } from "@utils/objects/makeBucketRecord/makeBucketRecord";
import { objectKeys } from "@utils/objects/objectKeys";
import { promiseFlatMap } from "@utils/promises/promiseFlatMap/promiseFlatMap";
import { EntityFieldConfigParsers } from "$/models/EntityConfig/EntityFieldConfig/EntityFieldConfigParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { match } from "ts-pattern";
import { DatasetColumnValueExtractorClient } from "@/clients/entity-configs/DatasetColumnValueExtractorClient";
import { ManualEntryExtractorClient } from "@/clients/entity-configs/ManualEntryExtractorClient";
import { removeDuplicates } from "@/lib/utils/arrays/removeDuplicates/removeDuplicates";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { EntityFieldConfig } from "$/models/EntityConfig/EntityFieldConfig/EntityFieldConfig";
import type {
  EntityFieldValueExtractor,
  ValueExtractorType,
} from "$/models/EntityConfig/ValueExtractor/ValueExtractor.types";

export const EntityFieldConfigClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "EntityFieldConfig",
    tableName: "entity_field_configs",
    dbTablePrimaryKey: "id",
    parsers: EntityFieldConfigParsers,
    queries: ({ clientLogger }) => {
      /**
       * Given a list of entity field configs, fetch all the value extractors
       * for those fields.
       */
      return {
        getAllValueExtractors: async (params: {
          fields: readonly EntityFieldConfig.T[] | undefined;
        }): Promise<EntityFieldValueExtractor[]> => {
          const logger = clientLogger.appendName("getAllValueExtractors");
          const { fields: inputFields } = params;
          if (!inputFields) {
            return [];
          }
          const fields = removeDuplicates(inputFields, {
            hashFn: prop("id"),
          });
          const fieldIds = fields.map(prop("id"));

          // Bucket each field by value extractor type, so we only query for
          // the extractor types that we need
          const fieldsByValueExtractorType = makeBucketRecord(fields, {
            keyFn: prop("valueExtractorType"),
          });

          logger.log("Fetching value extractors for fields", {
            fieldIds,
          });

          // Now make one query per extractor type
          const valueExtractors = await promiseFlatMap(
            objectKeys(fieldsByValueExtractorType),
            async (
              valueExtractorType: ValueExtractorType,
            ): Promise<EntityFieldValueExtractor[]> => {
              const extractors = await match(valueExtractorType)
                .with("manual_entry", () => {
                  return ManualEntryExtractorClient.getAll(
                    where("entity_field_config_id", "in", fieldIds),
                  );
                })
                .with("dataset_column_value", () => {
                  return DatasetColumnValueExtractorClient.getAll(
                    where("entity_field_config_id", "in", fieldIds),
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
  }),
  {
    queryFns: ["getAllValueExtractors"],
  },
);
