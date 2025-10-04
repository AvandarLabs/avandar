import { removeDuplicates } from "@tiptap/react";
import { match } from "ts-pattern";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { DatasetRawDataClient } from "@/clients/datasets/DatasetRawDataClient";
import { LocalDatasetEntryClient } from "@/clients/datasets/LocalDatasetEntryClient";
import { assertIsDefined } from "@/lib/utils/asserts";
import { where } from "@/lib/utils/filters/filterBuilders";
import { isDefined } from "@/lib/utils/guards";
import { makeIdLookupMap } from "@/lib/utils/maps/builders";
import {
  makeBucketRecord,
  makeIdLookupRecord,
} from "@/lib/utils/objects/builders";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { objectEntries } from "@/lib/utils/objects/misc";
import { promiseFlatMap } from "@/lib/utils/promises";
import { DatasetId } from "@/models/datasets/Dataset";
import { DatasetColumn } from "@/models/datasets/DatasetColumn";
import { EntityConfigId } from "@/models/EntityConfig";
import { EntityFieldConfigClient } from "@/models/EntityConfig/EntityFieldConfig/EntityFieldConfigClient";
import {
  EntityFieldConfig,
  EntityFieldConfigId,
} from "@/models/EntityConfig/EntityFieldConfig/types";
import { DatasetColumnValueExtractorClient } from "@/models/EntityConfig/ValueExtractor/DatasetColumnValueExtractor/DatasetColumnValueExtractorClient";
import { DatasetColumnValueExtractor } from "@/models/EntityConfig/ValueExtractor/DatasetColumnValueExtractor/types";

type FieldWithDatasetExtractor = {
  fieldConfig: EntityFieldConfig;
  extractor: DatasetColumnValueExtractor;
};

export function getSQLSelectOfExtractor({
  selectColumnName,
  primaryKeyColumnName,
  tableName,
  ruleType,
  outputColumnName,
  externalIdsTable = "external_ids",
  externalIdsColumn = "external_id",
}: {
  selectColumnName: string;
  primaryKeyColumnName: string;
  tableName: string;
  ruleType: DatasetColumnValueExtractor["valuePickerRuleType"];
  outputColumnName: string;
  externalIdsTable?: string;
  externalIdsColumn?: string;
}): string {
  return match(ruleType)
    .with("first", () => {
      return `
        -- Get the first value
        (SELECT "${selectColumnName}"
        FROM "${tableName}" dataset
        WHERE "${externalIdsTable}"."${externalIdsColumn}" = dataset."${primaryKeyColumnName}"
        LIMIT 1) as "${outputColumnName}"
      `;
    })
    .with("most_frequent", () => {
      return `
        -- Get the most frequent value
        (SELECT "${selectColumnName}"
        FROM "${tableName}" dataset
        WHERE "${externalIdsTable}"."${externalIdsColumn}" = dataset."${primaryKeyColumnName}"
        GROUP BY "${selectColumnName}"
        ORDER BY COUNT(*) DESC, "${selectColumnName}"
        LIMIT 1) as "${outputColumnName}"
      `;
    })
    .exhaustive();
}

async function _extractFieldValuesFromDataset({
  datasetId,
  primaryKeyField,
  requestedFields,
}: {
  datasetId: DatasetId;
  primaryKeyField: {
    datasetColumn: DatasetColumn;
    fieldConfig: EntityFieldConfig;
    extractor: DatasetColumnValueExtractor;
  };
  requestedFields: ReadonlyArray<{
    datasetColumn: DatasetColumn;
    fieldConfig: EntityFieldConfig;
    extractor: DatasetColumnValueExtractor;
  }>;
}): Promise<Array<Record<EntityFieldConfigId, unknown>>> {
  // TODO(jpsyx): this should eventually be unnecessary when we just use
  // the dataset ids as the table names
  const datasetEntry = await LocalDatasetEntryClient.getById({ id: datasetId });
  assertIsDefined(datasetEntry, "Dataset not found locally");

  const datasetTableName = datasetEntry.localTableName;
  const primaryKeyColumnName = primaryKeyField.datasetColumn.name;

  // returns rows where each column is an entity field ID
  const queryResult = await DatasetRawDataClient.runLocalRawQuery<
    Record<EntityFieldConfigId, unknown>
  >({
    dependencies: [datasetId],
    query: `
      -- Get all the external IDs we will pull values for
      WITH external_ids AS (
        SELECT
          DISTINCT "$primaryKeyColumnName$" as external_id
        FROM "$datasetTableName$"
      )
      SELECT
        external_ids.external_id,
        $columnSelectors$
      FROM external_ids
    `,
    queryArgs: {
      datasetTableName,
      primaryKeyColumnName,
      columnSelectors: requestedFields
        .map((field) => {
          const fieldId = field.fieldConfig.id;
          const colName = field.datasetColumn.name;
          // TODO(jpsyx): replace this with a real extractor sql
          const sqlStatement = getSQLSelectOfExtractor({
            selectColumnName: colName,
            primaryKeyColumnName,
            tableName: datasetTableName,
            ruleType: field.extractor.valuePickerRuleType,
            outputColumnName: fieldId,
            externalIdsTable: "external_ids",
            externalIdsColumn: "external_id",
          });
          return sqlStatement;
        })
        .join(", "),
    },
  });

  return queryResult.data;
}

/**
 * Given an entity config ID, get all the primary keys fields with their
 * extractors.
 */
async function _getPrimaryKeyFieldExtractors(
  entityConfigId: EntityConfigId,
): Promise<FieldWithDatasetExtractor[]> {
  // get the ID fields that also have dataset value extractors.
  // we will need these to do other dataset queries, because we will
  // need to know which columns to look at for the primary key
  const primaryKeyFields = await EntityFieldConfigClient.getAll({
    where: {
      entity_config_id: { eq: entityConfigId },
      is_id_field: { eq: true },
      value_extractor_type: { eq: "dataset_column_value" },
    },
  });

  // now get all the extractors for these fields
  const primaryKeyExtractors = await DatasetColumnValueExtractorClient.getAll(
    where("entity_field_config_id", "in", primaryKeyFields.map(getProp("id"))),
  );

  // now group them together
  const extractorsByFieldId = makeIdLookupRecord(primaryKeyExtractors, {
    key: "entityFieldConfigId",
  });

  return primaryKeyFields
    .map((field) => {
      const extractor = extractorsByFieldId[field.id];
      if (extractor) {
        return {
          fieldConfig: field,
          extractor,
        };
      }
      return undefined;
    })
    .filter(isDefined);
}

/**
 * Given an entity config ID and a list of fields with their extractors,
 * get all the field values for those fields.
 */
export async function getDatasetColumnFieldValues({
  entityConfigId,
  fieldsWithExtractors,
}: {
  entityConfigId: EntityConfigId;
  fieldsWithExtractors: readonly FieldWithDatasetExtractor[];
}): Promise<Array<Record<EntityFieldConfigId, unknown>>> {
  const primaryKeyFieldsWithExtractors =
    await _getPrimaryKeyFieldExtractors(entityConfigId);

  // Get all metadata of the columns we need to extract
  const allColumnIds = removeDuplicates([
    ...primaryKeyFieldsWithExtractors.map(getProp("extractor.datasetFieldId")),
    ...fieldsWithExtractors.map(getProp("extractor.datasetFieldId")),
  ]);

  const datasetColumnsById = makeIdLookupRecord(
    await DatasetColumnClient.getAll(where("id", "in", allColumnIds)),
    { key: "id" },
  );

  // get all requested and primary fields with their associated dataset columns
  const requestedFields = fieldsWithExtractors.map((field) => {
    return {
      ...field,
      datasetColumn: datasetColumnsById[field.extractor.datasetFieldId]!,
    };
  });

  const primaryKeyFields = primaryKeyFieldsWithExtractors.map((field) => {
    return {
      ...field,
      datasetColumn: datasetColumnsById[field.extractor.datasetFieldId]!,
    };
  });

  // group the requested fields and primary keys by dataset IDs so we can
  // group our queries by dataset
  const primaryKeyFieldsByDatasetId = makeIdLookupMap(primaryKeyFields, {
    key: "extractor.datasetId",
  });

  // Each extractor corresponds to 1 dataset, but there can be
  // duplicate datasets, so let's bucket them by dataset.
  const requestedFieldsByDatasetId = makeBucketRecord(requestedFields, {
    keyFn: getProp("extractor.datasetId"),
  });

  // run a query for each dataset
  const fieldValueRows = await promiseFlatMap(
    objectEntries(requestedFieldsByDatasetId),
    async ([datasetId, reqFields]) => {
      const primaryKeyField = primaryKeyFieldsByDatasetId.get(datasetId);
      assertIsDefined(
        primaryKeyField,
        `Primary key field not found for dataset ${datasetId}`,
      );

      const rows = await _extractFieldValuesFromDataset({
        datasetId,
        primaryKeyField,
        requestedFields: reqFields,
      });

      return rows;
    },
  );

  return fieldValueRows;
}
