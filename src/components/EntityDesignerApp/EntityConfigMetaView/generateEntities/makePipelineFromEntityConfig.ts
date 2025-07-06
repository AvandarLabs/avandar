import { isNotUndefined } from "@/lib/utils/guards";
import { uuid } from "@/lib/utils/uuid";
import { FieldDataType } from "@/models/LocalDataset/LocalDatasetField/types";
import { LocalDataset, LocalDatasetId } from "@/models/LocalDataset/types";
import { BuildableEntityConfig, Pipeline, PipelineStep } from "./pipelineTypes";

function _makeDataPullStep(datasetId: LocalDatasetId): PipelineStep {
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
        datasetId,

        // for now we only support pulling from local datasets
        datasetType: "local",
      },
    },
  };
}

function _makeOutputDatasetStep({
  name,
  datasetId,
  datasetName,
  datasetType,
  description,
  contextValueKey,
  fieldsToWrite,
}: {
  name: string;
  datasetId: string;
  datasetName: string;
  datasetType: LocalDataset["datasetType"];
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
        datasetId,
        createdAt: new Date(),
        updatedAt: new Date(),
        datasetName,
        datasetType,
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
  const datasetsToLoad = new Set<LocalDatasetId>(
    entityConfig.fields
      .map((field) => {
        return field.valueExtractor.type === "dataset_column_value" ?
            field.valueExtractor.datasetId
          : undefined;
      })
      .filter(isNotUndefined),
  );

  const dataPullSteps = [...datasetsToLoad].map(_makeDataPullStep);

  return {
    id: uuid(),
    workspaceId: entityConfig.workspaceId,
    name: `Pipeline for ${entityConfig.name}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    relationships: {
      steps: [
        // first, pull all the data
        ...dataPullSteps,

        // Create all the entities
        _makeCreateEntitiesStep(entityConfig),

        // create the entities dataset, with one row per entity
        _makeOutputDatasetStep({
          datasetType: "entities",
          name: `Save entity dataset for entity ${entityConfig.name}`,
          datasetId: `entities__${entityConfig.id}`,
          datasetName: `${entityConfig.name} (Internal)`,
          description: `All the entities for ${entityConfig.name}`,
          contextValueKey: "entities",
          fieldsToWrite: [
            { name: "id", dataType: "string" },
            { name: "externalId", dataType: "string" },
            { name: "workspaceId", dataType: "string" },
            { name: "name", dataType: "string" },
            { name: "entityConfigId", dataType: "string" },
            { name: "assignedTo", dataType: "string" },
            { name: "status", dataType: "string" },
            { name: "createdAt", dataType: "date" },
            { name: "updatedAt", dataType: "date" },
          ],
        }),

        // create the entity field values dataset, with one row per
        // field value per entity. So there will be O(N*M) rows, where
        // N is the number of entities and M is the number of fields per entity.
        _makeOutputDatasetStep({
          datasetType: "entity_field_values",
          name: `Save entity field values dataset for entity ${entityConfig.name}`,
          datasetId: `entity_field_values__${entityConfig.id}`,
          datasetName: `${entityConfig.name} (Field values)`,
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

        // create the queryable entities dataset, with one row per entity
        _makeOutputDatasetStep({
          datasetType: "entities_queryable",
          name: `Save queryable entities dataset for entity ${entityConfig.name}`,
          datasetId: `entities_queryable__${entityConfig.id}`,
          datasetName: entityConfig.name,
          description: `All the queryable entities for ${entityConfig.name}`,
          contextValueKey: "queryableEntities",
          fieldsToWrite: [
            ...entityConfig.fields.map((field) => {
              return {
                name: field.name,
                dataType: field.options.baseDataType,
              };
            }),
            { name: "assignedTo", dataType: "string" },
            { name: "status", dataType: "string" },
            { name: "createdAt", dataType: "date" },
            { name: "updatedAt", dataType: "date" },
          ],
        }),
      ],
    },
  };
}
