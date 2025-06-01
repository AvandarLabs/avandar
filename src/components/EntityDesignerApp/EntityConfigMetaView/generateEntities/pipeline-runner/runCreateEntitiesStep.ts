import { match } from "ts-pattern";
import { Logger } from "@/lib/Logger";
import { CSVCellValue, CSVRow } from "@/lib/types/common";
import { assert, isNotNullOrUndefined } from "@/lib/utils/guards";
import { makeBucketMapFromList } from "@/lib/utils/maps/builders";
import { getProp, propEquals } from "@/lib/utils/objects/higherOrderFuncs";
import { uuid } from "@/lib/utils/uuid";
import { Entity, EntityId } from "@/models/Entity/types";
import { DatasetColumnValueExtractor } from "@/models/EntityConfig/ValueExtractor/DatasetColumnValueExtractor/types";
import { LocalDatasetField } from "@/models/LocalDataset/LocalDatasetField/types";
import { ParsedLocalDataset } from "@/models/LocalDataset/types";
import {
  BuildableEntityConfig,
  BuildableFieldConfig,
  CreateEntitiesStepConfig,
} from "../pipelineTypes";
import {
  EntityFieldValue,
  EntityFieldValueNativeType,
  PipelineContext,
} from "./runPipeline";

function _getEntityIdField(
  entityConfig: BuildableEntityConfig,
): BuildableFieldConfig {
  const field = entityConfig.fields.find(propEquals("options.isIdField", true));
  if (!field) {
    throw new Error("Entity must have an ID field configured");
  }
  return field;
}

function _getSourceDatasetFromField(
  field: BuildableFieldConfig,
  context: PipelineContext,
): ParsedLocalDataset {
  if (field.valueExtractor.type !== "dataset_column_value") {
    throw new Error(
      "Cannot extract a primary key if the ID field is not configured with a dataset column value extractor",
    );
  }
  return context.getDataset(field.valueExtractor.datasetId);
}

function _getDatasetColumnFromFieldConfig(
  dataset: ParsedLocalDataset,
  entityFieldConfig: BuildableFieldConfig,
): LocalDatasetField {
  const { valueExtractor } = entityFieldConfig;

  assert(
    valueExtractor.type === "dataset_column_value",
    "Cannot extract a primary key if the ID field is not configured as a dataset column value extractor",
  );

  // get the dataset column corresponding to this entity field's value extractor
  const datasetColumn = dataset.fields.find((column) => {
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
  entityExternalId: CSVCellValue;
  sourceDatasetExternalIdColumn: LocalDatasetField;
  valueExtractor: DatasetColumnValueExtractor;
  context: PipelineContext;

  /**
   * A subset of rows from the source dataset that match the external
   * id of the entity we are extracting the field value for.
   */
  sourceDatasetRows: CSVRow[];
}): EntityFieldValue | undefined {
  const {
    entityId,
    entityExternalId,
    valueExtractor,
    sourceDatasetExternalIdColumn,
    sourceDatasetRows,
    context,
  } = params;
  const { datasetId, datasetFieldId, valuePickerRuleType } = valueExtractor;
  const sourceDataset = context.getDataset(datasetId);
  const datasetColumnToExtract = sourceDataset.fields.find((column) => {
    return column.id === datasetFieldId;
  });

  assert(
    datasetColumnToExtract !== undefined,
    "Could not find a column in the dataset that matches the entity field's value extractor configuration",
  );

  assert(
    sourceDatasetRows.every((sourceRow) => {
      return sourceRow[sourceDatasetExternalIdColumn.name] === entityExternalId;
    }),
    "All external IDs in the `sourceDatasetRows` match the entity external ID",
  );

  // now we need to go through the `sourceDatasetRows` (which are rows
  // that match the entity we want to associate with this field), and
  // extract the requested field value from each row.
  // Then we have to decide which value to use based on the value picker
  // rule type.
  return match(valuePickerRuleType)
    .with("first", () => {
      const firstRow = sourceDatasetRows[0];
      if (!firstRow) {
        return undefined;
      }
      const extractedValue = firstRow[datasetColumnToExtract.name];
      return {
        id: uuid<"EntityFieldValue">(),
        entityId,
        value: extractedValue,
        valueSet: [extractedValue],
        datasourceId: datasetId,
        entityFieldConfigId: valueExtractor.entityFieldConfigId,
      };
    })
    .with("most_frequent", () => {
      const valueSet = sourceDatasetRows.map((row) => {
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
        id: uuid<"EntityFieldValue">(),
        entityId,
        value: mostFrequentValue,
        valueSet: [...counts.keys()],
        datasourceId: datasetId,
        entityFieldConfigId: valueExtractor.entityFieldConfigId,
      };
    })
    .exhaustive();
}

export function runCreateEntitiesStep(
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

  const entityIdField = _getEntityIdField(entityConfig);
  const externalIdSourceDataset = _getSourceDatasetFromField(
    entityIdField,
    context,
  );
  const datasetExternalIdColumn = _getDatasetColumnFromFieldConfig(
    externalIdSourceDataset,
    entityIdField,
  );

  const externalIdsToSourceDatasetRows = makeBucketMapFromList(
    externalIdSourceDataset.data,
    { keyFn: getProp(datasetExternalIdColumn.name) },
  );

  // now report on any errors and remove them from our bucket
  if (externalIdsToSourceDatasetRows.has(undefined)) {
    errors.push("Found `undefined` values in the id field");
    externalIdsToSourceDatasetRows.delete(undefined);
  }
  if (externalIdsToSourceDatasetRows.has("")) {
    errors.push("Found empty string values in the id field");
    externalIdsToSourceDatasetRows.delete("");
  }
  if (externalIdsToSourceDatasetRows.size === 0) {
    errors.push("No valid ids found in the id field");
  }

  const entities: Entity[] = [];
  const allEntityFieldValues: EntityFieldValue[] = [];
  const queryableEntities: Array<Entity & Record<string, unknown>> = [];

  // each external id we found is 1 valid entity. So now we iterate through each
  // one, collect the fields, and create the necessary entity and field value
  // datasets
  externalIdsToSourceDatasetRows.forEach((sourceDatasetRows, externalId) => {
    if (!externalId) {
      return;
    }

    const entityId = uuid<"Entity">();
    const fieldNameToValueDict: Record<string, EntityFieldValueNativeType> = {};

    let entityName: string = String(externalId); // falback value

    // now collect all the fields for this entity
    entityConfig.fields.forEach((fieldConfig) => {
      const { valueExtractor } = fieldConfig;

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
              entityExternalId: String(externalId),
              sourceDatasetRows,

              // TODO(jpsyx): this is incorrect and should change soon. Each
              // field can point to a different dataset, so we need to figure
              // out the external id column for *that* dataset. For now,
              // we're just assuming its always the same dataset, and therefore
              // the same external id column. This is safe for now because we
              // only allow entities to configure a single source dataset.
              // We will have to change this when we allow fields to pull
              // from different source datasets.
              sourceDatasetExternalIdColumn: datasetExternalIdColumn,
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

    // construct the entity object
    const entity = {
      id: entityId, // the internal id
      name: entityName,
      externalId: String(externalId),
      entityConfigId: entityConfig.id,

      // TODO(jpsyx): eventually the status should come from a
      // configured list and not hardcoded to "active"
      status: "active",
      assignedTo: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    entities.push(entity);

    // finally, construct the queryable entity object
    const queryableEntity = {
      ...entity,
      ...fieldNameToValueDict,
    };
    queryableEntities.push(queryableEntity);
  });

  return Promise.resolve(
    // TODO(jpsyx): eventually store this in some Collections
    // dictionary or some way to infer the type back. Perhaps
    // specifically an EntitiesCollection dictionary in the context.
    context
      .setContextValue("entities", entities)
      .setContextValue("entityFieldValues", allEntityFieldValues)
      .setContextValue("queryableEntities", queryableEntities)
      .addErrors(errors),
  );
}
