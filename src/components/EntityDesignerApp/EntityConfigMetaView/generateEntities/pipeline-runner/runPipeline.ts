import { match } from "ts-pattern";
import { Logger } from "@/lib/Logger";
import { getErrorMap } from "@/lib/models/makeParserRegistry";
import { UnknownObject, UUID } from "@/lib/types/common";
import { isNotNullOrUndefined, isPlainObject } from "@/lib/utils/guards";
import { constant } from "@/lib/utils/higherOrderFuncs";
import { promiseReduce } from "@/lib/utils/promises";
import { unknownToString } from "@/lib/utils/strings/transformations";
import { uuid } from "@/lib/utils/uuid";
import { EntityId } from "@/models/Entity/types";
import { EntityFieldConfigId } from "@/models/EntityConfig/EntityFieldConfig/types";
import { LocalDatasetClient } from "@/models/LocalDataset/LocalDatasetClient";
import { ParsedLocalDatasetSchema } from "@/models/LocalDataset/parsers";
import {
  LocalDatasetId,
  ParsedLocalDataset,
} from "@/models/LocalDataset/types";
import { asLocalDatasetId, unparseDataset } from "@/models/LocalDataset/utils";
import { UserId } from "@/models/User/types";
import { WorkspaceId } from "@/models/Workspace/types";
import {
  OutputDatasetsStepConfig,
  Pipeline,
  PipelineStep,
} from "../pipelineTypes";
import { runCreateEntitiesStep } from "./runCreateEntitiesStep";
import { runDataPullStep } from "./runDataPullStep";

export type EntityFieldValueNativeType =
  | string
  | number
  | boolean
  | null
  | undefined;

export type EntityFieldValue = {
  id: UUID<"EntityFieldValue">;
  workspaceId: WorkspaceId;
  entityId: EntityId;
  entityFieldConfigId: EntityFieldConfigId;
  value?: EntityFieldValueNativeType;
  valueSet: EntityFieldValueNativeType[];
  datasourceId: LocalDatasetId;
};

export type EntityComment = {
  id: UUID<"EntityComment">;
  entityId: EntityId;
  ownerId: UserId;
  createdAt: Date;
  updatedAt: Date;
  content: string;
};

export type PipelineContext = {
  // getters
  getContextValues: () => UnknownObject;
  getContextValue: (key: string) => unknown;
  getDataset: (id: LocalDatasetId) => ParsedLocalDataset;
  getErrors: () => PipelineRunError[];
  getCurrentStep: () => PipelineStep | undefined;
  getWorkspaceId: () => WorkspaceId;

  // setters
  setContextValue: (key: string, value: unknown) => PipelineContext;
  storeDataset: (dataset: ParsedLocalDataset) => PipelineContext;
  addErrors: (errors: string[]) => PipelineContext;
  setCurrentStep: (step: PipelineStep) => PipelineContext;
};

type PipelineRunError = {
  stepName: string;
  message: string;
};

type PipelineContextState = {
  // TODO(jpsyx): break up `contextValues` into several other dictionaries.
  // And also have a catch-all `extraMetadata` or something like that.
  contextValues?: UnknownObject;
  errors?: PipelineRunError[];
  currentStep?: PipelineStep | undefined;
  workspaceId: WorkspaceId;
};

function createPipelineContext(state: PipelineContextState): PipelineContext {
  const {
    contextValues = {},
    errors = [],
    currentStep = undefined,
    workspaceId,
  } = state;
  const setContextValue = (key: string, value: unknown) => {
    const newContextValues = { ...contextValues, [key]: value };
    return createPipelineContext({
      contextValues: newContextValues,
      errors,
      currentStep,
      workspaceId,
    });
  };

  const getContextValue = (key: string) => {
    return contextValues[key];
  };

  const getCurrentStep = constant(currentStep);

  return {
    // Getters
    getContextValue,
    getCurrentStep,
    getContextValues: constant(contextValues),
    getDataset: (id: LocalDatasetId): ParsedLocalDataset => {
      const maybeDataset = getContextValue(`datasetId:${id}`);
      return ParsedLocalDatasetSchema.parse(maybeDataset, {
        errorMap: getErrorMap("ParsedLocalDataset", "ParsedLocalDatasetSchema"),
      });
    },
    getErrors: constant(errors),
    getWorkspaceId: constant(workspaceId),

    // Setters - these should all be immutable
    setContextValue,
    storeDataset: (dataset: ParsedLocalDataset): PipelineContext => {
      return setContextValue(`datasetId:${dataset.id}`, dataset);
    },
    addErrors: (errorsToAdd: string[]): PipelineContext => {
      const pipelineErrorsToAdd = errorsToAdd.map((error) => {
        return {
          stepName: getCurrentStep()?.name ?? "none",
          message: error,
        };
      });
      const newErrors = [...errors, ...pipelineErrorsToAdd];
      return createPipelineContext({ ...state, errors: newErrors });
    },
    setCurrentStep: (step: PipelineStep): PipelineContext => {
      return createPipelineContext({ ...state, currentStep: step });
    },
  };
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
          newRow[field.name] = unknownToString(row[field.name], {
            undefinedString: "",
            nullString: "",
          });
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
    id: asLocalDatasetId(stepConfig.datasetId),
    workspaceId: context.getWorkspaceId(),
    datasetType: stepConfig.datasetType,
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

export function runPipelineStep(
  pipelineStep: PipelineStep,
  context: PipelineContext,
): Promise<PipelineContext> {
  Logger.log(pipelineStep.type, `[starting]`, pipelineStep.name);
  const result = match(pipelineStep)
    .with({ type: "pull_data" }, async ({ relationships: { stepConfig } }) => {
      return runDataPullStep(stepConfig, context);
    })
    .with({ type: "create_entities" }, ({ relationships: { stepConfig } }) => {
      return runCreateEntitiesStep(stepConfig, context);
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
    createPipelineContext({ workspaceId: pipeline.workspaceId }),
  );
  return results;
}
