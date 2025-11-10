import { match } from "ts-pattern";
import { createSupabaseCRUDClient } from "@/lib/clients/supabase/createSupabaseCRUDClient";
import { removeDuplicates } from "@/lib/utils/arrays/removeDuplicates/removeDuplicates";
import { where } from "@/lib/utils/filters/filters";
import { makeBucketRecord } from "@/lib/utils/objects/builders";
import { prop } from "@/lib/utils/objects/higherOrderFuncs";
import { objectKeys } from "@/lib/utils/objects/misc";
import { promiseFlatMap } from "@/lib/utils/promises";
import { EntityFieldConfig } from "../../models/EntityConfig/EntityFieldConfig/EntityFieldConfig.types";
import { EntityFieldConfigParsers } from "../../models/EntityConfig/EntityFieldConfig/EntityFieldConfigParsers";
import { DatasetColumnValueExtractorClient } from "../entity-configs/DatasetColumnValueExtractorClient";
import { ManualEntryExtractorClient } from "../../models/EntityConfig/ValueExtractor/ManualEntryExtractor/ManualEntryExtractorClient";
import {
  EntityFieldValueExtractor,
  ValueExtractorType,
} from "../../models/EntityConfig/ValueExtractor/types";

export const EntityFieldConfigClient = createSupabaseCRUDClient({
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
});
