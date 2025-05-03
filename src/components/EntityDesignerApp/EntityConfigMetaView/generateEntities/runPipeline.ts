import { match } from "ts-pattern";
import { Logger } from "@/lib/Logger";
import { CSVCellValue, CSVRow, UnknownObject, UUID } from "@/lib/types/common";
import { isNotNullOrUndefined, isPlainObject } from "@/lib/utils/guards";
import {
  makeBucketsFromList,
  makeObjectFromList,
} from "@/lib/utils/objects/builders";
import { getProp, propIsTrue } from "@/lib/utils/objects/higherOrderFuncs";
import { objectKeys } from "@/lib/utils/objects/misc";
import { promiseReduce } from "@/lib/utils/promises";
import { unknownToString } from "@/lib/utils/strings";
import { uuid } from "@/lib/utils/uuid";
import { EntityFieldConfigId } from "@/models/EntityConfig/EntityFieldConfig/types";
import { EntityConfigId } from "@/models/EntityConfig/types";
import { LocalDatasetClient } from "@/models/LocalDataset/LocalDatasetClient";
import { LocalDatasetField } from "@/models/LocalDataset/LocalDatasetField/types";
import { ParsedLocalDatasetSchema } from "@/models/LocalDataset/parsers";
import {
  LocalDatasetId,
  ParsedLocalDataset,
} from "@/models/LocalDataset/types";
import { unparseDataset } from "@/models/LocalDataset/utils";
import { UserId } from "@/models/User";
import {
  BuildableEntityConfig,
  BuildableFieldConfig,
  CreateEntitiesStepConfig,
  CreateFieldStepConfig,
  OutputDatasetsStepConfig,
  Pipeline,
  PipelineStep,
} from "./pipelineTypes";

type EntityFieldValue = {
  id: UUID<"EntityFieldValue">;
  entityId: UUID<"Entity">;
  entityFieldConfigId: EntityFieldConfigId;
  value: unknown;
  valueSet: unknown[];
  datasourceId: LocalDatasetId;
};

type EntityComment = {
  id: UUID<"EntityComment">;
  entityId: UUID<"Entity">;
  ownerId: UserId;
  createdAt: Date;
  updatedAt: Date;
  content: string;
};

type Entity = {
  id: UUID<"Entity">;
  externalId: string; // this is the id we get from the source dataset
  entityConfigId: EntityConfigId;
  assignedTo: UserId | null;
  createdAt: Date;
  updatedAt: Date;

  relationships: {
    entityConfig: BuildableEntityConfig;
    comments: EntityComment[];
  };
};

type PipelineContext = {
  // getters
  getContextValues: () => UnknownObject;
  getContextValue: (key: string) => unknown;
  getDataset: (id: LocalDatasetId) => ParsedLocalDataset;
  getErrors: () => PipelineRunError[];
  getCurrentStep: () => PipelineStep | undefined;

  // setters
  setContextValue: (key: string, value: unknown) => PipelineContext;
  storeDataset: (dataset: ParsedLocalDataset) => PipelineContext;
  addErrors: (errors: string[]) => PipelineContext;
  setCurrentStep: (step: PipelineStep) => PipelineContext;
};

function _getEntityIdField(
  entityConfig: BuildableEntityConfig,
): BuildableFieldConfig | undefined {
  const field = entityConfig.fields.find(propIsTrue("isIdField"));
  return field;
}

function _getDatasetExternalIdColumn(
  dataset: ParsedLocalDataset,
  entityIdField: BuildableFieldConfig | undefined,
): LocalDatasetField | undefined {
  if (!entityIdField) {
    throw new Error(
      "Cannot identify primary key in a dataset if no entity field is configured as the ID field",
    );
  }

  if (entityIdField.valueExtractorType !== "dataset_column_value") {
    throw new Error(
      "Cannot extract a primary key if the ID field is not configured as a dataset column value extractor",
    );
  }

  // get the dataset field which corresponds to our entity config's ID field
  const datasetIdField = dataset.fields.find((field) => {
    return field.id === entityIdField.valueExtractor.datasetFieldId;
  });
  return datasetIdField;
}

function _bucketDatasetRowsByExternalId(
  dataset: ParsedLocalDataset,
  entityConfig: BuildableEntityConfig,
): Map<string | null | undefined, CSVRow[]> {
  // Get the entity's id field
  const entityIdField = _getEntityIdField(entityConfig);
  const datasetExternalIdColumn = _getDatasetExternalIdColumn(
    dataset,
    entityIdField,
  );
  if (!datasetExternalIdColumn) {
    throw new Error(
      "Could not find a column in the dataset that matches the entity ID field's value extractor configuration",
    );
  }

  // we don't take into account the entityIdField's value picker rule because
  // for an ID field, we should always treat each ID value uniquely.
  // TODO(pablo): disable value picker rule for ID fields in the UI. It doesn't
  // make sense there.
  return makeBucketsFromList({
    list: dataset.data,
    keyFn: getProp(datasetExternalIdColumn.name),
    collectNullableKeys: true,
  });
}

type PipelineRunError = {
  stepName: string;
  message: string;
};

type PipelineContextState = {
  // TODO(pablo): break up `contextValues` into several other dictionaries.
  // And also have a catch-all `extraMetadata` or something like that.
  contextValues: UnknownObject;
  errors: PipelineRunError[];
  currentStep: PipelineStep | undefined;
};

function createPipelineContext(
  state: PipelineContextState = {
    contextValues: {},
    errors: [],
    currentStep: undefined,
  },
): PipelineContext {
  const setContextValue = (key: string, value: unknown) => {
    const newContextValues = { ...state.contextValues, [key]: value };
    return createPipelineContext({ ...state, contextValues: newContextValues });
  };

  const getContextValue = (key: string) => {
    return state.contextValues[key];
  };

  const getCurrentStep = () => {
    return state.currentStep;
  };

  return {
    // Getters
    getContextValue,
    getCurrentStep,
    getContextValues: () => {
      return state.contextValues;
    },
    getDataset: (id: LocalDatasetId): ParsedLocalDataset => {
      const maybeDataset = getContextValue(`datasetId:${id}`);
      return ParsedLocalDatasetSchema.parse(maybeDataset);
    },
    getErrors: () => {
      return state.errors;
    },

    // Setters - these should all be immutable
    setContextValue,
    storeDataset: (dataset: ParsedLocalDataset): PipelineContext => {
      return setContextValue(`datasetId:${dataset.id}`, dataset);
    },
    addErrors: (errors: string[]): PipelineContext => {
      const pipelineErrors = errors.map((error) => {
        return {
          stepName: getCurrentStep()?.name ?? "none",
          message: error,
        };
      });
      const newErrors = [...state.errors, ...pipelineErrors];
      return createPipelineContext({ ...state, errors: newErrors });
    },
    setCurrentStep: (step: PipelineStep): PipelineContext => {
      return createPipelineContext({ ...state, currentStep: step });
    },
  };
}

export function _runCreateFieldStep(
  stepConfig: CreateFieldStepConfig,
  context: PipelineContext,
): Promise<PipelineContext> {
  Logger.log("Value extractor type", stepConfig.valueExtractorType);

  // our goal is to create this array of entity field values (one field value
  // per entity) and store it in the context.
  const entityFieldValues: EntityFieldValue[] = [];

  // Get the step's extractor type. This will tell us how we have
  // To generate the field values
  match(stepConfig)
    .with({ valueExtractorType: "manual_entry" }, () => {
      Logger.log(
        "Skipping value extraction for field configured as 'manual_entry'",
      );
      // manual entries do not have any values to generate with a pipeline
      return Promise.resolve(context);
    })
    .with({ valueExtractorType: "dataset_column_value" }, (config) => {
      const {
        relationships: { valueExtractor, entityConfig },
      } = config;

      const { datasetId, datasetFieldId, valuePickerRuleType } = valueExtractor;

      // data should be loaded already, so lets fetch it
      const dataset = context.getDataset(datasetId);

      // go through all rows and extract the column this value
      // extractor points to
      const datasetFieldToExtract = dataset.fields.find((field) => {
        return field.id === datasetFieldId;
      });

      if (!datasetFieldToExtract) {
        throw new Error(
          `Could not find field ${datasetFieldId} in dataset ${datasetId}`,
        );
      }

      // at this point our entities should have gotten stored already
      // TODO(pablo): we are coercing a type here. it's not safe. fix this.
      // TODO(pablo): do not hard code this key
      const entities = context.getContextValue(
        "entities",
      ) as unknown as Entity[];

      // get the entity's id field so we know what column in the dataset to
      // look at for the external ID. We need this so we can match the
      // extracted value back to the correct entity.
      const entityIdField = _getEntityIdField(entityConfig);
      const datasetExternalIdColumn = _getDatasetExternalIdColumn(
        dataset,
        entityIdField,
      );
      if (!datasetExternalIdColumn) {
        throw new Error(
          "Could not find a column in the dataset that matches the entity ID field's value extractor configuration",
        );
      }

      const externalIdToEntityDict: Record<string, Entity> = makeObjectFromList(
        { list: entities, keyFn: getProp("externalId") },
      );

      // now we need to go through the dataset and extract the field value
      // for each external ID
      match(valuePickerRuleType)
        .with("first", () => {
          for (const row of dataset.data) {
            const seenExternalIds = new Set<string>();
            const externalId = row[datasetExternalIdColumn.name];
            if (externalId && !seenExternalIds.has(externalId)) {
              const matchingEntity = externalIdToEntityDict[externalId];
              if (matchingEntity) {
                const extractedValue = row[datasetFieldToExtract.name];
                const entityFieldValue: EntityFieldValue = {
                  id: uuid(),
                  entityId: matchingEntity.id,
                  value: extractedValue,
                  valueSet: [extractedValue],
                  datasourceId: datasetId,
                  entityFieldConfigId: config.entityFieldConfigId,
                };
                seenExternalIds.add(externalId);
                entityFieldValues.push(entityFieldValue);

                // once we've collected one field ID for each entity, we can
                // stop. No need to see the rest of the dataset.
                if (seenExternalIds.size === entities.length) {
                  break;
                }
              }
            }
          }
        })

        .with("most_frequent", () => {
          const externalIdToExtractedValues: Record<string, CSVCellValue[]> =
            {};

          // this value extractor rule is less efficient because we have to
          // go through the entire dataset and then pick the most frequent
          // value that matched to an entity.
          dataset.data.forEach((row) => {
            const externalId = row[datasetExternalIdColumn.name];
            if (externalId) {
              const matchingEntity = externalIdToEntityDict[externalId];
              if (matchingEntity) {
                const extractedValue = row[datasetFieldToExtract.name];
                const valueSet = externalIdToExtractedValues[externalId] ?? [];
                valueSet.push(extractedValue);
                externalIdToExtractedValues[externalId] = valueSet;
              }
            }
          });

          // now that all value sets are created, we can count the most frequent
          // value for each entity and generate its entity field value
          objectKeys(externalIdToExtractedValues).forEach((externalId) => {
            const matchingEntity = externalIdToEntityDict[externalId];
            if (matchingEntity) {
              const valueSet = externalIdToExtractedValues[externalId] ?? [];
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

              // now create the entity field with our most frequent value
              const entityFieldValue: EntityFieldValue = {
                id: uuid(),
                entityId: matchingEntity.id,
                value: mostFrequentValue,
                valueSet: [...counts.keys()],
                datasourceId: datasetId,
                entityFieldConfigId: config.entityFieldConfigId,
              };
              entityFieldValues.push(entityFieldValue);
            }
          });
        })
        .exhaustive();
    })

    .with({ valueExtractorType: "aggregation" }, () => {
      throw new Error("Aggregation value extractors are not implemented yet");
    })
    .exhaustive();

  const currentFieldValues = context.getContextValue("entityFieldValues") ?? [];

  // dangerously mutating the currentFieldValues array because it is more
  // performant than using immutability here
  if (Array.isArray(currentFieldValues)) {
    currentFieldValues.push(...entityFieldValues);
  }

  return Promise.resolve(
    context.setContextValue("entityFieldValues", currentFieldValues),
  );
}

export async function _runOutputDatasetsStep(
  stepConfig: OutputDatasetsStepConfig,
  context: PipelineContext,
): Promise<PipelineContext> {
  const { datasetName, contextValueKey, columnsToWrite } = stepConfig;
  const errors: string[] = [];
  const rows = context.getContextValue(contextValueKey);

  if (!Array.isArray(rows)) {
    throw new Error(
      "Cannot output dataset if the context value to store is not an array",
    );
  }

  if (columnsToWrite.length === 0) {
    throw new Error("Cannot output dataset if no headers were found");
  }

  const rowsToWrite = rows
    .map((row: unknown) => {
      // verify this is an object
      if (isPlainObject(row)) {
        const newRow: Record<string, string> = {};
        columnsToWrite.forEach((field) => {
          newRow[field.name] = unknownToString(row[field.name]);
        });

        return newRow;
      }
      errors.push(`Row is not an object. Expected object, got ${typeof row}`);
      return undefined;
    })
    .filter(isNotNullOrUndefined);

  const dataAsString = unparseDataset({
    datasetType: "text/csv",
    data: rowsToWrite,
  });

  const sizeInBytes = new TextEncoder().encode(dataAsString).length;

  const parsedLocalDataset: ParsedLocalDataset = {
    id: uuid(),
    createdAt: new Date(),
    updatedAt: new Date(),
    name: datasetName,
    description: "",
    sizeInBytes,
    mimeType: "text/csv",
    delimiter: ",",
    firstRowIsHeader: true,
    fields: columnsToWrite.map((field) => {
      return {
        id: uuid(),
        name: field.name,
        dataType: field.dataType,
      };
    }),
    data: rowsToWrite,
  };

  // now write the data to the database for future retrieval
  Logger.log("Inserting new dataset to the local", datasetName);
  await LocalDatasetClient.insert({
    data: { ...parsedLocalDataset, data: dataAsString },
  });

  return context.addErrors(errors).storeDataset(parsedLocalDataset);
}

export function _runCreateEntitiesStep(
  stepConfig: CreateEntitiesStepConfig,
  context: PipelineContext,
): Promise<PipelineContext> {
  const { entityConfig } = stepConfig;
  if (!entityConfig.datasetId) {
    throw new Error(
      "Cannot create entities if no source dataset is configured for this  entity",
    );
  }

  // Now that we know the id field, let's pull the data and get all unique ids
  // The data should have already been loaded, so we'll pull it from the context
  const dataset = context.getDataset(entityConfig.datasetId);

  // TODO(pablo): this could just be a set. we do not need to create buckets.
  // now iterate over entire dataset and extract unique id values
  const idsToRows = _bucketDatasetRowsByExternalId(dataset, entityConfig);

  const errors: string[] = [];

  // now report on any errors and remove them from our bucket
  if (idsToRows.has(null)) {
    errors.push("Found null values in the id field");
    idsToRows.delete(null);
  }

  if (idsToRows.has(undefined)) {
    errors.push("Found undefined values in the id field");
    idsToRows.delete(undefined);
  }

  if (idsToRows.has("")) {
    errors.push("Found empty string values in the id field");
    idsToRows.delete("");
  }

  if (idsToRows.size === 0) {
    errors.push("No valid ids found in the id field");
  }

  const entityIds = [...idsToRows.keys()].filter(isNotNullOrUndefined);

  const entities = entityIds.map((id): Entity => {
    return {
      id: uuid(), // our internal id
      externalId: String(id),
      entityConfigId: entityConfig.id,
      assignedTo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      relationships: {
        comments: [],
        entityConfig: entityConfig,
      },
    };
  });

  return Promise.resolve(
    // TODO(pablo): eventually store this in some Collections
    // dictionary or some way to infer the type back. Perhaps
    // specifically an EntitiesCollection dictionary in the context.
    context.setContextValue("entities", entities).addErrors(errors),
  );
}

export function runPipelineStep(
  pipelineStep: PipelineStep,
  context: PipelineContext,
): Promise<PipelineContext> {
  Logger.log(pipelineStep.type, `[starting]`, pipelineStep.name);
  const result = match(pipelineStep)
    .with({ type: "pull_data" }, async ({ relationships: { stepConfig } }) => {
      if (stepConfig.datasetType !== "local") {
        throw new Error("Only local datasets are supported for now");
      }

      const dataset = await LocalDatasetClient.getParsedLocalDataset({
        id: stepConfig.datasetId,
      });

      return context.setContextValue(
        `datasetId:${stepConfig.datasetId}`,
        dataset,
      );
    })
    .with({ type: "create_entities" }, ({ relationships: { stepConfig } }) => {
      return _runCreateEntitiesStep(stepConfig, context);
    })
    .with({ type: "create_field" }, ({ relationships: { stepConfig } }) => {
      return _runCreateFieldStep(stepConfig, context);
    })
    .with({ type: "output_datasets" }, ({ relationships: { stepConfig } }) => {
      return _runOutputDatasetsStep(stepConfig, context);
    })
    .exhaustive(() => {
      Logger.error("Unknown pipeline step type", pipelineStep);
      throw new Error(
        `Pipeline failed to run. Unknown pipeline step type: '${pipelineStep.type}'`,
      );
    });

  Logger.log(pipelineStep.type, `[finished]`, pipelineStep.name);

  return result;
}

export async function runPipeline(
  pipeline: Pipeline,
): Promise<PipelineContext> {
  Logger.log("Pipeline to run", pipeline);

  const results = await promiseReduce(
    pipeline.relationships.steps,
    (step, context) => {
      return runPipelineStep(step, context.setCurrentStep(step));
    },
    createPipelineContext(),
  );
  return results;
}
