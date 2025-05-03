import { makePipelineFromEntityConfig } from "./makePipelineFromEntityConfig";
import { BuildableEntityConfig } from "./pipelineTypes";
import { runPipeline } from "./runPipeline";

export async function generateEntities(
  entityConfig: BuildableEntityConfig,
): Promise<void> {
  const pipeline = makePipelineFromEntityConfig(entityConfig);
  await runPipeline(pipeline);
}
