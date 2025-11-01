import { removeDuplicates } from "@tiptap/react";
import { match } from "ts-pattern";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { DatasetRawDataClient } from "@/clients/datasets/DatasetRawDataClient";
import { assertIsDefined } from "@/lib/utils/asserts";
import { where } from "@/lib/utils/filters/filterBuilders";
import { isDefined } from "@/lib/utils/guards/guards";
import { makeIdLookupMap } from "@/lib/utils/maps/builders";
import {
  makeBucketRecord,
  makeIdLookupRecord,
} from "@/lib/utils/objects/builders";
import { prop } from "@/lib/utils/objects/higherOrderFuncs";
import { objectEntries } from "@/lib/utils/objects/misc";
import { promiseFlatMap } from "@/lib/utils/promises";
import { DatasetId } from "@/models/datasets/Dataset";
import { DatasetColumn } from "@/models/datasets/DatasetColumn";
import { EntityConfigId } from "@/models/EntityConfig";
import { EntityFieldConfigClient } from "@/clients/entities/EntityFieldConfigClient";
import {
  EntityFieldConfig,
  EntityFieldConfigId,
} from "@/models/EntityConfig/EntityFieldConfig/EntityFieldConfig.types";
import { DatasetColumnValueExtractorClient } from "@/clients/entity-configs/DatasetColumnValueExtractorClient";
import { DatasetColumnValueExtractor } from "@/models/EntityConfig/ValueExtractor/DatasetColumnValueExtractor/DatasetColumnValueExtractor.types";

type FieldWithDatasetExtractor = {
  fieldConfig: EntityFieldConfig;
  extractor: DatasetColumnValueExtractor;
};

/**
 * Generate the nested SQL 'SELECT' statement to extract values using
 * a dataset column extractor's `ruleType`.
 *
 * The output SQL of this function will only work if it is included as a
 * subquery of a larger query that has a table called `external_ids` with
 * a column called `external_id`. The names of these identifiers can be
 * changed in `externalIdsTable` and `externalIdsColumn`, but it is still
 * a requirement that the outer query be a table of external IDs.
 */
export function getSQLSelectOfExtractor({
  selectColumnName,
  primaryKeyColumnName,
  datasetId,
  ruleType,
  outputColumnName,
  externalIdsTable = "external_ids",
  externalIdColumn = "external_id",
}: {
  selectColumnName: string;
  primaryKeyColumnName: string;
  datasetId: string;
  ruleType: DatasetColumnValueExtractor["valuePickerRuleType"];
  outputColumnName: string;
  externalIdsTable?: string;
  externalIdColumn?: string;
}): string {
  return match(ruleType)
    .with("first", () => {
      return `
        -- Get the first value
        (
          SELECT "${selectColumnName}",
          FROM "${datasetId}" dataset
          WHERE
            "${externalIdsTable}"."${externalIdColumn}" = dataset."${primaryKeyColumnName}"
          LIMIT 1
        ) AS "${outputColumnName}"
      `;
    })
    .with("most_frequent", () => {
      return `
        -- Get the most frequent value
        (
          SELECT "${selectColumnName}"
          FROM "${datasetId}" dataset
          WHERE
            "${externalIdsTable}"."${externalIdColumn}" = dataset."${primaryKeyColumnName}"
          GROUP BY "${selectColumnName}"
          ORDER BY COUNT(*) DESC, "${selectColumnName}"
          LIMIT 1
        ) AS "${outputColumnName}"
      `;
    })
    .with("sum", () => {
      return `
        -- Get the sum of the values
        (
          SELECT CAST(SUM("${selectColumnName}") AS DOUBLE)
          FROM "${datasetId}" dataset
          WHERE
            "${externalIdsTable}"."${externalIdColumn}" = dataset."${primaryKeyColumnName}"
        ) AS "${outputColumnName}"
      `;
    })
    .with("avg", () => {
      return `
        -- Get the average of the values
        (
          SELECT CAST(AVG("${selectColumnName}") AS DOUBLE)
          FROM "${datasetId}" dataset
          WHERE
            "${externalIdsTable}"."${externalIdColumn}" = dataset."${primaryKeyColumnName}"
        ) AS "${outputColumnName}"
      `;
    })
    .with("count", () => {
      return `
        -- Get the count of the values
        (
          SELECT CAST(COUNT("${selectColumnName}") AS DOUBLE)
          FROM "${datasetId}" dataset
          WHERE
            "${externalIdsTable}"."${externalIdColumn}" = dataset."${primaryKeyColumnName}"
        ) AS "${outputColumnName}"
      `;
    })
    .with("max", () => {
      return `
        -- Get the maximum value
        (
          SELECT CAST(MAX("${selectColumnName}") AS DOUBLE)
          FROM "${datasetId}" dataset
          WHERE
            "${externalIdsTable}"."${externalIdColumn}" = dataset."${primaryKeyColumnName}"
        ) AS "${outputColumnName}"
      `;
    })
    .with("min", () => {
      return `
        -- Get the minimum value
        (
          SELECT CAST(MIN("${selectColumnName}") AS DOUBLE)
          FROM "${datasetId}" dataset
          WHERE
            "${externalIdsTable}"."${externalIdColumn}" = dataset."${primaryKeyColumnName}"
        ) AS "${outputColumnName}"
      `;
    })
    .exhaustive(() => {
      throw new Error(`Invalid rule type: "${ruleType}"`);
    });
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
        FROM "$datasetId$"
      )
      SELECT
        external_ids.external_id,
        $columnSelectors$
      FROM external_ids
    `,
    queryArgs: {
      datasetId,
      primaryKeyColumnName,
      columnSelectors: requestedFields
        .map((field) => {
          const fieldId = field.fieldConfig.id;
          const colName = field.datasetColumn.name;
          const sqlStatement = getSQLSelectOfExtractor({
            selectColumnName: colName,
            primaryKeyColumnName,
            datasetId: datasetId,
            ruleType: field.extractor.valuePickerRuleType,
            outputColumnName: fieldId,
            externalIdsTable: "external_ids",
            externalIdColumn: "external_id",
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
    where("entity_field_config_id", "in", primaryKeyFields.map(prop("id"))),
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
  const primaryKeyFieldsWithExtractors = await _getPrimaryKeyFieldExtractors(
    entityConfigId,
  );

  // Get all metadata of the columns we need to extract
  const allColumnIds = removeDuplicates([
    ...primaryKeyFieldsWithExtractors.map(prop("extractor.datasetColumnId")),
    ...fieldsWithExtractors.map(prop("extractor.datasetColumnId")),
  ]);
  const datasetColumnsById = makeIdLookupRecord(
    await DatasetColumnClient.getAll(where("id", "in", allColumnIds)),
    { key: "id" },
  );

  // get all requested and primary fields with their associated dataset columns
  const requestedFields = fieldsWithExtractors.map((field) => {
    return {
      ...field,
      datasetColumn: datasetColumnsById[field.extractor.datasetColumnId]!,
    };
  });
  const primaryKeyFields = primaryKeyFieldsWithExtractors.map((field) => {
    return {
      ...field,
      datasetColumn: datasetColumnsById[field.extractor.datasetColumnId]!,
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
    keyFn: prop("extractor.datasetId"),
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
