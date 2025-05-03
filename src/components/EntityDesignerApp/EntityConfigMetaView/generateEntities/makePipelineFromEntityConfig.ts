import { match } from "ts-pattern";
import { isNotUndefined } from "@/lib/utils/guards";
import { uuid } from "@/lib/utils/uuid";
import {
  EntityFieldValueExtractorRegistry,
  EntityFieldValueExtractorType,
} from "@/models/EntityConfig/ValueExtractor/types";
import { FieldDataType } from "@/models/LocalDataset/LocalDatasetField/types";
import {
  BuildableEntityConfig,
  BuildableFieldConfig,
  Pipeline,
  PipelineStep,
  ValueExtractorInfo,
} from "./pipelineTypes";

function _makeDataPullStep(entityConfig: BuildableEntityConfig): PipelineStep {
  if (!entityConfig.datasetId) {
    throw new Error(
      "This entity configuration has no source dataset and cannot be created with a pipeline",
    );
  }

  return {
    id: uuid(),
    createdAt: new Date(),
    updatedAt: new Date(),
    name: "Pull data",
    description: "Pull data from the dataset",
    type: "pull_data",
    relationships: {
      stepConfig: {
        id: uuid(),
        createdAt: new Date(),
        updatedAt: new Date(),
        datasetId: entityConfig.datasetId,

        // for now we only support pulling from local datasets
        datasetType: "local",
      },
    },
  };
}

function _makeCreateFieldStep({
  entityConfig,
  entityFieldConfig,
}: {
  // the entire entityConfig has to be passed in because we need to be
  // able to get the ID field for this entity, so we can match extracted values
  // back to the correct entity.
  entityConfig: BuildableEntityConfig;
  entityFieldConfig: BuildableFieldConfig;
}): PipelineStep | undefined {
  const makeValueExtractorInfo = <T extends EntityFieldValueExtractorType>(
    valueExtractorType: T,
    valueExtractor: EntityFieldValueExtractorRegistry[T],
  ): ValueExtractorInfo<T> => {
    return {
      valueExtractorType,
      valueExtractorId: valueExtractor.id,
      relationships: {
        entityConfig,
        valueExtractor,
      },
    };
  };

  return {
    id: uuid(),
    name: `Create field values for ${entityFieldConfig.name}`,
    description: "Create all field values",
    type: "create_field",
    createdAt: new Date(),
    updatedAt: new Date(),
    relationships: {
      stepConfig: {
        id: uuid(),
        createdAt: new Date(),
        updatedAt: new Date(),
        entityFieldConfigId: entityFieldConfig.id,
        ...match(entityFieldConfig)
          .with(
            { valueExtractorType: "aggregation" },
            ({ valueExtractorType, valueExtractor }) => {
              return makeValueExtractorInfo(valueExtractorType, valueExtractor);
            },
          )
          .with(
            { valueExtractorType: "dataset_column_value" },
            ({ valueExtractorType, valueExtractor }) => {
              return makeValueExtractorInfo(valueExtractorType, valueExtractor);
            },
          )
          .with(
            { valueExtractorType: "manual_entry" },
            ({ valueExtractorType, valueExtractor }) => {
              return makeValueExtractorInfo(valueExtractorType, valueExtractor);
            },
          )
          .exhaustive(),
      },
    },
  };
}

function _makeOutputDatasetStep({
  name,
  datasetName,
  description,
  contextValueKey,
  fieldsToWrite,
}: {
  name: string;
  datasetName: string;
  description?: string;
  contextValueKey: string;
  fieldsToWrite: Array<{ name: string; dataType: FieldDataType }>;
}): PipelineStep {
  return {
    id: uuid(),
    name,
    description,
    type: "output_datasets",
    createdAt: new Date(),
    updatedAt: new Date(),
    relationships: {
      stepConfig: {
        id: uuid(),
        createdAt: new Date(),
        updatedAt: new Date(),
        datasetName,
        contextValueKey,
        columnsToWrite: fieldsToWrite,
      },
    },
  };
}

function _makeCreateEntitiesStep(
  entityConfig: BuildableEntityConfig,
): PipelineStep {
  return {
    id: uuid(),
    name: `Create entities for ${entityConfig.name}`,
    description: "Create all entities",
    type: "create_entities",
    createdAt: new Date(),
    updatedAt: new Date(),
    relationships: {
      stepConfig: {
        id: uuid(),
        createdAt: new Date(),
        updatedAt: new Date(),
        entityConfig,
      },
    },
  };
}

export function makePipelineFromEntityConfig(
  entityConfig: BuildableEntityConfig,
): Pipeline {
  return {
    id: uuid(),
    name: `Pipeline for ${entityConfig.name}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    relationships: {
      steps: [
        // first, pull all the data
        _makeDataPullStep(entityConfig),

        // Create all the entities
        _makeCreateEntitiesStep(entityConfig),

        // create the entities dataset with one row per entity
        _makeOutputDatasetStep({
          name: `Save entity dataset for entity ${entityConfig.name}`,
          datasetName: `entity__${entityConfig.id}`,
          description: `All the entities for ${entityConfig.name}`,
          contextValueKey: "entities",
          fieldsToWrite: [
            { name: "id", dataType: "string" },
            { name: "externalId", dataType: "string" },
            { name: "entityConfigId", dataType: "string" },
            { name: "assignedTo", dataType: "string" },
            { name: "createdAt", dataType: "date" },
            { name: "updatedAt", dataType: "date" },
          ],
        }),

        // collect the field value extractors
        ...entityConfig.fields
          .map((field) => {
            return _makeCreateFieldStep({
              entityConfig,
              entityFieldConfig: field,
            });
          })
          .filter(isNotUndefined),

        // create the entity field values dataset, with one row per field value
        _makeOutputDatasetStep({
          name: `Save entity field values dataset for entity ${entityConfig.name}`,
          datasetName: `entity_field_values__${entityConfig.id}`,
          description: `All the field values for ${entityConfig.name}`,
          contextValueKey: "entityFieldValues",
          fieldsToWrite: [
            { name: "id", dataType: "string" },
            { name: "entityId", dataType: "string" },
            { name: "entityFieldConfigId", dataType: "string" },
            { name: "value", dataType: "string" },
            { name: "valueSet", dataType: "string" },
            { name: "datasourceId", dataType: "string" },
          ],
        }),
      ],
    },
  };
}
