import { invariant } from "@tanstack/react-router";
import { DatasetClient } from "@/clients/datsets/DatasetClient";
import { DatasetRawDataClient } from "@/clients/datsets/DatasetRawDataClient";
import { PullDataStepConfig } from "../pipelineTypes";
import { PipelineContext } from "./runPipeline";

export async function runDataPullStep(
  stepConfig: PullDataStepConfig,
  context: PipelineContext,
): Promise<PipelineContext> {
  if (stepConfig.sourceType !== "local") {
    throw new Error("Only local datasets are supported for now");
  }

  const dataset = await DatasetClient.getWithColumns({
    id: stepConfig.datasetId,
  });
  invariant(dataset, `Could not find dataset with ID ${stepConfig.datasetId}`);

  const datasetRawData = await DatasetRawDataClient.getParsedRawData({
    datasetId: dataset.id,
  });

  return context.storeDataset({
    ...dataset,
    data: datasetRawData,
  });
}
