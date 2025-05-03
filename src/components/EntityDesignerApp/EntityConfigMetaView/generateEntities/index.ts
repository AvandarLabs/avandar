import { makePipelineFromEntityConfig } from "./makePipelineFromEntityConfig";
import { BuildableEntityConfig } from "./pipelineTypes";
import { runPipeline } from "./runPipeline";

export function generateEntities(entityConfig: BuildableEntityConfig): void {
  const pipeline = makePipelineFromEntityConfig(entityConfig);
  runPipeline(pipeline);
}
