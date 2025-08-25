import { match } from "ts-pattern";
import { Logger } from "@/lib/Logger";
import { RawDataRow, UUID } from "@/lib/types/common";
import { assert } from "@/lib/utils/guards";
import { constant } from "@/lib/utils/higherOrderFuncs";
import { promiseReduce } from "@/lib/utils/promises";
import { DatasetId, DatasetWithColumns } from "@/models/datasets/Dataset";
import { EntityId } from "@/models/entities/Entity";
import { UserId } from "@/models/User/types";
import { WorkspaceId } from "@/models/Workspace/types";
import { Pipeline, PipelineStep } from "../pipelineTypes";
import { runCreateEntitiesStep } from "./runCreateEntitiesStep";
import { runDataPullStep } from "./runDataPullStep";

export type EntityFieldValueNativeType =
  | string
  | number
  | boolean
  | null
  | undefined;

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
  getDataset: (id: DatasetId) => DatasetWithColumns & { data: RawDataRow[] };
  getErrors: () => PipelineRunError[];
  getCurrentStep: () => PipelineStep | undefined;
  getWorkspaceId: () => WorkspaceId;

  // setters
  storeDataset: (
    dataset: DatasetWithColumns & { data: RawDataRow[] },
  ) => PipelineContext;
  addErrors: (errors: string[]) => PipelineContext;
  setCurrentStep: (step: PipelineStep) => PipelineContext;
};

type PipelineRunError = {
  stepName: string;
  message: string;
};

type PipelineContextState = {
  datasets?: Record<DatasetId, DatasetWithColumns & { data: RawDataRow[] }>;
  errors?: PipelineRunError[];
  currentStep?: PipelineStep | undefined;
  workspaceId: WorkspaceId;
};

function createPipelineContext(state: PipelineContextState): PipelineContext {
  const {
    datasets = {},
    errors = [],
    currentStep = undefined,
    workspaceId,
  } = state;
  const getCurrentStep = constant(currentStep);

  return {
    // Getters
    getCurrentStep,
    getDataset: (
      id: DatasetId,
    ): DatasetWithColumns & { data: RawDataRow[] } => {
      const dataset = datasets[id];
      assert(!!dataset, `Could not find dataset with ID ${id}`);
      return dataset;
    },
    getErrors: constant(errors),
    getWorkspaceId: constant(workspaceId),

    // Setters - these should all be immutable
    storeDataset: (dataset: DatasetWithColumns): PipelineContext => {
      return createPipelineContext({
        ...state,
        datasets: { ...datasets, [dataset.id]: dataset },
      });
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
