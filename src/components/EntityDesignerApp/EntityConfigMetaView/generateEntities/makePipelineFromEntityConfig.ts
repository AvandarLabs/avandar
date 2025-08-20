import { isNotUndefined } from "@/lib/utils/guards";
import { uuid } from "@/lib/utils/uuid";
import { DatasetId } from "@/models/datasets/Dataset";
import { BuildableEntityConfig, Pipeline, PipelineStep } from "./pipelineTypes";

function _makeDataPullStep(datasetId: DatasetId): PipelineStep {
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
        sourceType: "local",
      },
    },
  };
}

/*
function _makeOutputDatasetStep({
  name,
  datasetId,
  datasetName,
  sourceType,
  description,
  contextValueKey,
  fieldsToWrite,
}: {
  name: string;
  datasetId: string;
  datasetName: string;
  sourceType: Dataset["sourceType"];
  description?: string;
  contextValueKey: string;
  fieldsToWrite: Array<{ name: string; dataType: DatasetColumnDataType }>;
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
        sourceType,
        contextValueKey,
        columnsToWrite: fieldsToWrite,
      },
    },
  };
}
*/

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

// TODO(jpsyx): eventually this should be entirely unnecessary because
// should use a QETL on-demand approach rather than precomputing all values
// with a monolithic pipeline that generates all entities and values.
// Values should only be generated on-demand.
// TODO(jpsyx): We should only use monolithic pipeline approach for small
// data scales. Which means we need to have some way to identify when the
// data scales AND data sources are optimal for a monolithic pipeline.
// We need some way to choose between monolithic pipeline vs. QETL on-demand.
export function makePipelineFromEntityConfig(
  entityConfig: BuildableEntityConfig,
): Pipeline {
  const datasetsToLoad = new Set<DatasetId>(
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

        /*
        // create the entities dataset, with one row per entity
        _makeOutputDatasetStep({
          sourceType: "entities",
          name: `Save entity dataset for entity ${entityConfig.name}`,
          datasetId: `entities__${entityConfig.id}`,
          datasetName: `${entityConfig.name} (Internal)`,
          description: `All the entities for ${entityConfig.name}`,
          contextValueKey: "entities",
          fieldsToWrite: [
            { name: "id", dataType: "text" },
            { name: "externalId", dataType: "text" },
            { name: "workspaceId", dataType: "text" },
            { name: "name", dataType: "text" },
            { name: "entityConfigId", dataType: "text" },
            { name: "assignedTo", dataType: "text" },
            { name: "status", dataType: "text" },
            { name: "createdAt", dataType: "date" },
            { name: "updatedAt", dataType: "date" },
          ],
        }),

        // create the entity field values dataset, with one row per
        // field value per entity. So there will be O(N*M) rows, where
        // N is the number of entities and M is the number of fields per entity.
        _makeOutputDatasetStep({
          sourceType: "entity_field_values",
          name: `Save entity field values dataset for entity
          ${entityConfig.name}`,
          datasetId: `entity_field_values__${entityConfig.id}`,
          datasetName: `${entityConfig.name} (Field values)`,
          description: `All the field values for ${entityConfig.name}`,
          contextValueKey: "entityFieldValues",
          fieldsToWrite: [
            { name: "id", dataType: "text" },
            { name: "entityId", dataType: "text" },
            { name: "entityFieldConfigId", dataType: "text" },
            { name: "value", dataType: "text" },
            { name: "valueSet", dataType: "text" },
            { name: "datasourceId", dataType: "text" },
          ],
        }),

        // create the queryable entities dataset, with one row per entity
        _makeOutputDatasetStep({
          sourceType: "entities_queryable",
          name: `Save queryable entities dataset for entity
          ${entityConfig.name}`,
          datasetId: `entities_queryable__${entityConfig.id}`,
          datasetName: entityConfig.name,
          description: `All the queryable entities for ${entityConfig.name}`,
          contextValueKey: "queryableEntities",
          fieldsToWrite: [
            ...entityConfig.fields.map((field) => {
              return {
                name: field.name,
                dataType:
                  field.options.baseDataType === "string" ?
                    ("text" as const)
                  : field.options.baseDataType,
              };
            }),
            { name: "assignedTo", dataType: "text" },
            { name: "status", dataType: "text" },
            { name: "createdAt", dataType: "date" },
            { name: "updatedAt", dataType: "date" },
          ],
        }),
        */
      ],
    },
  };
}
