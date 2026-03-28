import { createSupabaseCRUDClient } from "@clients/SupabaseCRUDClient/createSupabaseCRUDClient";
import { where } from "@utils/filters/where/where";
import { prop } from "@utils/objects/hofs/prop/prop";
import { makeBucketRecord } from "@utils/objects/makeBucketRecord/makeBucketRecord";
import { objectKeys } from "@utils/objects/objectKeys";
import { EntityFieldConfigParsers } from "$/models/EntityConfig/EntityFieldConfig/EntityFieldConfigParsers";
import { match } from "ts-pattern";
import { DatasetColumnValueExtractorClient } from "@/clients/entity-configs/DatasetColumnValueExtractorClient";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";
import { removeDuplicates } from "@/lib/utils/arrays/removeDuplicates/removeDuplicates";
import { promiseFlatMap } from "@/lib/utils/promises";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import { ManualEntryExtractorClient } from "@/clients/entity-configs/ManualEntryExtractorClient";
import type { EntityFieldConfig } from "$/models/EntityConfig/EntityFieldConfig/EntityFieldConfig.types";
import type {
  EntityFieldValueExtractor,
  ValueExtractorType,
} from "$/models/EntityConfig/ValueExtractor/ValueExtractor.types";

export const EntityFieldConfigClient = createUsableServiceClient(
  createSupabaseCRUDClient({
    dbClient: AvaSupabase.DB,
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
          fields: readonly EntityFieldConfig[] | undefined;
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
