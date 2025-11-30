import { Logger } from "$/lib/Logger/Logger";
import { RegistryOfArrays } from "$/lib/types/utilityTypes";
import { objectKeys } from "$/lib/utils/objects/objectKeys/objectKeys";
import { match } from "ts-pattern";
import { Simplify } from "type-fest";
import { EntityFieldConfigClient } from "@/clients/entities/EntityFieldConfigClient";
import {
  makeBucketRecord,
  makeIdLookupRecord,
} from "@/lib/utils/objects/builders";
import { promiseFlatMap } from "@/lib/utils/promises";
import { EntityConfigId } from "@/models/EntityConfig";
import {
  EntityFieldConfig,
  EntityFieldConfigId,
} from "@/models/EntityConfig/EntityFieldConfig/EntityFieldConfig.types";
import { EntityFieldValueExtractorRegistry } from "@/models/EntityConfig/ValueExtractor/types";
import { getDatasetColumnFieldValues } from "./getDatasetColumnFieldValues";

async function _getEntityFieldValuesByExtractorType({
  entityConfigId,
  requestedFields,
  extractorsByType,
}: {
  entityConfigId: EntityConfigId;
  requestedFields: readonly EntityFieldConfig[];
  extractorsByType: Simplify<
    Partial<RegistryOfArrays<EntityFieldValueExtractorRegistry>>
  >;
}): Promise<Array<Record<EntityFieldConfigId, unknown>>> {
  const requestedFieldsById = makeIdLookupRecord(requestedFields, {
    key: "id",
  });

  const fieldValues = await promiseFlatMap(
    objectKeys(extractorsByType),
    async (extractorType) => {
      return match(extractorType)
        .with("dataset_column_value", async (type) => {
          const extractors = extractorsByType[type]!;
          const fieldsWithExtractors = extractors.map((extractor) => {
            return {
              fieldConfig: requestedFieldsById[extractor.entityFieldConfigId]!,
              extractor,
            };
          });

          return getDatasetColumnFieldValues({
            entityConfigId,
            fieldsWithExtractors,
          });
        })
        .with("manual_entry", async (type) => {
          throw new Error(`Extracting ${type} types are not supported yet.`);
        })
        .exhaustive();
    },
  );
  return fieldValues;
}

/**
 * Get all entity field values of an entity config.
 * Returns an array of rows, where each row column key is an entity field id.
 */
export async function getEntityFieldValues({
  entityConfigId,
  entityFieldConfigs,
}: {
  entityConfigId: EntityConfigId;
  entityFieldConfigs: readonly EntityFieldConfig[];
}): Promise<Array<Record<EntityFieldConfigId, unknown>>> {
  const valueExtractors = await EntityFieldConfigClient.getAllValueExtractors({
    fields: entityFieldConfigs,
  });

  // bucket the extractors by type
  const valueExtractorsByType = makeBucketRecord(valueExtractors, {
    key: "type",
  }) as Partial<RegistryOfArrays<EntityFieldValueExtractorRegistry>>;

  const fieldValues = await _getEntityFieldValuesByExtractorType({
    entityConfigId,
    requestedFields: entityFieldConfigs,
    extractorsByType: valueExtractorsByType,
  });

  Logger.log("Retrieved requested field values", fieldValues);
  return fieldValues;
}
