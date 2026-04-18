import { makeBucketRecord } from "@utils/objects/makeBucketRecord/makeBucketRecord";
import { makeIdLookupRecord } from "@utils/objects/makeIdLookupRecord/makeIdLookupRecord";
import { objectKeys } from "@utils/objects/objectKeys";
import { match } from "ts-pattern";
import { EntityFieldConfigClient } from "@/clients/entities/EntityFieldConfigClient";
import { getDatasetColumnFieldValues } from "@/clients/entities/EntityFieldValueClient/getEntityFieldValues/getDatasetColumnFieldValues";
import { promiseFlatMap } from "@/lib/utils/promises";
import { Logger } from "@/utils/Logger";
import type { RegistryOfArrays } from "@utils/types/utilities.types";
import type { EntityConfigId } from "$/models/EntityConfig/EntityConfig.types";
import type { EntityFieldConfig } from "$/models/EntityConfig/EntityFieldConfig/EntityFieldConfig";
import type { EntityFieldValueExtractorRegistry } from "$/models/EntityConfig/ValueExtractor/ValueExtractor.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { Simplify } from "type-fest";

async function _getEntityFieldValuesByExtractorType({
  entityConfigId,
  workspaceId,
  requestedFields,
  extractorsByType,
}: {
  entityConfigId: EntityConfigId;
  workspaceId: Workspace.Id;
  requestedFields: readonly EntityFieldConfig.T[];
  extractorsByType: Simplify<
    Partial<RegistryOfArrays<EntityFieldValueExtractorRegistry>>
  >;
}): Promise<Array<Record<EntityFieldConfig.Id, unknown>>> {
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
            workspaceId,
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
  workspaceId,
}: {
  entityConfigId: EntityConfigId;
  entityFieldConfigs: readonly EntityFieldConfig.T[];
  workspaceId: Workspace.Id;
}): Promise<Array<Record<EntityFieldConfig.Id, unknown>>> {
  const valueExtractors = await EntityFieldConfigClient.getAllValueExtractors({
    fields: entityFieldConfigs,
  });

  // bucket the extractors by type
  const valueExtractorsByType = makeBucketRecord(valueExtractors, {
    key: "type",
  }) as Partial<RegistryOfArrays<EntityFieldValueExtractorRegistry>>;

  const fieldValues = await _getEntityFieldValuesByExtractorType({
    entityConfigId,
    workspaceId,
    requestedFields: entityFieldConfigs,
    extractorsByType: valueExtractorsByType,
  });

  Logger.log("Retrieved requested field values", fieldValues);
  return fieldValues;
}
