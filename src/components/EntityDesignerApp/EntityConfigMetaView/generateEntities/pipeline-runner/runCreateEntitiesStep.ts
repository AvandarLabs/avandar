import { match } from "ts-pattern";
import { EntityClient } from "@/clients/entities/EntityClient";
import { RawDataRow } from "@/lib/types/common";
import { assert, isNotNullOrUndefined } from "@/lib/utils/guards";
import {
  makeBucketMapFromList,
  mergeBucketMaps,
} from "@/lib/utils/maps/builders";
import { getProp, propEquals } from "@/lib/utils/objects/higherOrderFuncs";
import { objectValues } from "@/lib/utils/objects/misc";
import { mapObjectValues } from "@/lib/utils/objects/transformations";
import { uuid } from "@/lib/utils/uuid";
import { DatasetId, DatasetWithColumns } from "@/models/datasets/Dataset";
import { DatasetColumn } from "@/models/datasets/DatasetColumn";
import { Entity, EntityId } from "@/models/entities/Entity";
import {
  EntityFieldValue,
  EntityFieldValueId,
} from "@/models/entities/EntityFieldValue";
import { EntityConfigId } from "@/models/EntityConfig/types";
import { DatasetColumnValueExtractor } from "@/models/EntityConfig/ValueExtractor/DatasetColumnValueExtractor/types";
import {
  BuildableEntityConfig,
  BuildableFieldConfig,
  CreateEntitiesStepConfig,
} from "../pipelineTypes";
import { PipelineContext } from "./runPipeline";

/**
 * Given an entity config, get the IDs of all datasets that will be
 * used as data sources for this entity and map them to the EntityFieldConfig
 * that will be used as the entity's unique identifier for that dataset.
 */
function _getDatasetIdsToEntityIdFields(
  entityConfig: BuildableEntityConfig,
): Record<DatasetId, BuildableFieldConfig> {
  const datasetIdsToEntityIdFields: Record<DatasetId, BuildableFieldConfig> =
    {};

  entityConfig.fields.forEach((field) => {
    if (
      field.valueExtractor.type === "dataset_column_value" &&
      field.options.isIdField
    ) {
      datasetIdsToEntityIdFields[field.valueExtractor.datasetId] = field;
    }
  });

  return datasetIdsToEntityIdFields;
}

/**
 * Given a dataset and an entity field config, get the dataset column that will
 * populate this field's value. If the field is not configured with
 * a `dataset_column_value` extractor then throw an error.
 */
function _getDatasetColumnFromFieldConfig(
  dataset: DatasetWithColumns,
  entityFieldConfig: BuildableFieldConfig,
): DatasetColumn {
  const { valueExtractor } = entityFieldConfig;

  assert(
    valueExtractor.type === "dataset_column_value",
    "Cannot extract a primary key if the ID field is not configured as a dataset column value extractor",
  );

  // get the dataset column corresponding to this entity field's value extractor
  const datasetColumn = dataset.columns.find((column) => {
    return column.id === valueExtractor.datasetFieldId;
  });

  assert(
    datasetColumn !== undefined,
    "Could not find a column in the dataset that matches the entity field's value extractor configuration",
  );

  return datasetColumn;
}

function _extractEntityFieldValueFromDatasetRows(params: {
  entityId: EntityId;
  entityConfigId: EntityConfigId;
  valueExtractor: DatasetColumnValueExtractor;
  context: PipelineContext;

  /**
   * A subset of rows from the source dataset that match the external
   * id of the entity we are extracting the field value for.
   */
  sourceDatasetRows: Array<{
    datasetId: DatasetId;
    rowData: RawDataRow;
  }>;
}): EntityFieldValue | undefined {
  const {
    entityId,
    entityConfigId,
    valueExtractor,
    sourceDatasetRows,
    context,
  } = params;
  const { datasetId, datasetFieldId, valuePickerRuleType } = valueExtractor;
  const sourceDataset = context.getDataset(datasetId);
  const datasetColumnToExtract = sourceDataset.columns.find(
    propEquals("id", datasetFieldId),
  );

  assert(
    datasetColumnToExtract !== undefined,
    `Attempting to extract a dataset column value from a column that does not
exist in the dataset "${sourceDataset.name}". Could not find Dataset Column ID
"${datasetFieldId}"`,
  );

  // only look at the rows whose `datasetId` matches the value extractor
  // we are applying
  const eligibleSourceRows = sourceDatasetRows
    .filter((row) => {
      return row.datasetId === datasetId;
    })
    .map(getProp("rowData"));

  // now we need to go through the `eligibleSourceRows` (which are rows
  // that match the entity we want to associate with this field), and
  // extract the requested field value from each row.
  // Then we have to decide which value to use based on the value picker
  // rule type.
  return match(valuePickerRuleType)
    .with("first", (): EntityFieldValue | undefined => {
      const firstRow = eligibleSourceRows[0];
      if (!firstRow) {
        return undefined;
      }
      const extractedValue = firstRow[datasetColumnToExtract.name];
      return {
        id: uuid() as EntityFieldValueId,
        entityId,
        entityConfigId,
        value: extractedValue,
        valueSet: extractedValue ? [extractedValue] : [],
        datasetId: datasetId,
        entityFieldConfigId: valueExtractor.entityFieldConfigId,
        workspaceId: context.getWorkspaceId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    })
    .with("most_frequent", (): EntityFieldValue | undefined => {
      const valueSet = eligibleSourceRows.map((row) => {
        return row[datasetColumnToExtract.name];
      });
      const counts: Map<string | undefined, number> = new Map();
      let mostFrequentValue: string | undefined;
      valueSet.forEach((value) => {
        const currentMax = counts.get(mostFrequentValue) ?? 0;
        const newCount = (counts.get(value) ?? 0) + 1;
        counts.set(value, newCount);
        if (newCount > currentMax) {
          mostFrequentValue = value;
        }
      });

      return {
        id: uuid() as EntityFieldValueId,
        entityId,
        entityConfigId,
        value: mostFrequentValue,
        valueSet: [...counts.keys()].filter(isNotNullOrUndefined),
        datasetId: datasetId,
        entityFieldConfigId: valueExtractor.entityFieldConfigId,
        workspaceId: context.getWorkspaceId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    })
    .exhaustive();
}

export async function runCreateEntitiesStep(
  stepConfig: CreateEntitiesStepConfig,
  context: PipelineContext,
): Promise<PipelineContext> {
  const { entityConfig } = stepConfig;
  const errors: string[] = [];

  if (!entityConfig.datasets) {
    throw new Error(
      "Cannot create entities if no source datasets are configured for this entity",
    );
  }

  const sourceDatasetIdsToEntityIdFields =
    _getDatasetIdsToEntityIdFields(entityConfig);

  // now we want to build the External ID Row Group Lookup, which is a map of an
  // entity's external ID to the lsit of rows from **all** the source datasets
  // that match this external ID.
  const sourceDatasetIdsToExternalIdRowGroupLookup = mapObjectValues(
    sourceDatasetIdsToEntityIdFields,
    (entityIdField, datasetId) => {
      const sourceDataset = context.getDataset(datasetId);
      const datasetExternalIdColumn = _getDatasetColumnFromFieldConfig(
        sourceDataset,
        entityIdField,
      );

      // we know the column to use as the external ID, so we can bucket
      // all rows by that column's value
      const externalIdsToSourceDatasetRows = makeBucketMapFromList(
        sourceDataset.data,
        {
          keyFn: getProp(datasetExternalIdColumn.name),
          valueFn: (row) => {
            return {
              datasetId,
              rowData: row,
              externalIdColumn: datasetExternalIdColumn,
            };
          },
        },
      );

      // check for any errors
      if (externalIdsToSourceDatasetRows.has("")) {
        errors.push(
          `Found empty string values in the id field (${datasetExternalIdColumn.name}) in dataset "${sourceDataset.name}"`,
        );
        externalIdsToSourceDatasetRows.delete("");
      }
      if (externalIdsToSourceDatasetRows.size === 0) {
        errors.push(
          `No valid ids found in the id field (${datasetExternalIdColumn.name}) in dataset "${sourceDataset.name}"`,
        );
      }

      return externalIdsToSourceDatasetRows;
    },
  );

  // in the function above we created an externalIdRowGroupLookup for
  // each source dataset. Now we merge them all into one big lookup.

  const entities: Entity[] = [];
  const externalIdRowGroupLookup = mergeBucketMaps(
    ...objectValues(sourceDatasetIdsToExternalIdRowGroupLookup),
  );
  // const allEntityFieldValues: EntityFieldValue[] = [];
  // const queryableEntities: Array<Entity & Record<string, unknown>> = [];

  // each external id we found is 1 valid entity. So now we iterate through each
  // one, collect the configured fields values, apply the necessary value picker
  // rules (if we have multiple values for a single field), and finally create
  // the output entity and field value datasets.
  externalIdRowGroupLookup.forEach((_sourceDatasetRows, externalId) => {
    if (!externalId) {
      return;
    }

    const entityId = uuid<EntityId>();
    // const fieldNameToValueDict: Record<string, EntityFieldValueNativeType> =
    // {};

    // now collect all the fields for this entity
    const entityName: string = String(externalId); // falback value

    /*
    entityConfig.fields.forEach((fieldConfig) => {
      const { valueExtractor, entityConfigId } = fieldConfig;

      const entityFieldValue = match(valueExtractor)
        .with({ type: "manual_entry" }, () => {
          Logger.log(
            "Skipping value extraction for field configured as 'manual_entry'",
          );
          // manual entries do not have any values to generate in a pipeline
          return undefined;
        })
        .with({ type: "dataset_column_value" }, (extractor) => {
          const extractedEntityFieldValue =
            _extractEntityFieldValueFromDatasetRows({
              entityId,
              entityConfigId,
              sourceDatasetRows,
              valueExtractor: extractor,
              context,
            });
          return extractedEntityFieldValue;
        })
        .with({ type: "aggregation" }, () => {
          throw new Error(
            "Aggregation value extractors are not implemented yet",
          );
        })
        .exhaustive();

      if (entityFieldValue) {
        allEntityFieldValues.push(entityFieldValue);
        fieldNameToValueDict[fieldConfig.name] = entityFieldValue.value;
        if (
          fieldConfig.options.isTitleField &&
          isNotNullOrUndefined(entityFieldValue.value)
        ) {
          entityName = String(entityFieldValue.value);
        }
      }
    });
    */

    // construct the entity object
    const entity: Entity = {
      id: entityId, // the internal id
      workspaceId: context.getWorkspaceId(),
      name: entityName,
      externalId: String(externalId),
      entityConfigId: entityConfig.id,

      // TODO(jpsyx): eventually the status should come from a
      // configured list and not hardcoded to "active"
      status: "active",
      assignedTo: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    entities.push(entity);
  });

  // TODO(jpsyx): for now, we're just going to write everything to
  // Supabase here rather than having a separate write or output step.
  await EntityClient.bulkInsert({ data: entities });

  // TODO(jpsyx): we should be storing entities back in Supabase
  return Promise.resolve(context.addErrors(errors));
}
