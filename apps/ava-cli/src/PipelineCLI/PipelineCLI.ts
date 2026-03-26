import { Acclimate } from "@avandar/acclimate";
import { PipelineListCLI } from "@ava-cli/PipelineCLI/PipelineListCLI/PipelineListCLI";
import { RunPipelineCLI } from "@ava-cli/PipelineCLI/RunPipelineCLI/RunPipelineCLI";

/** Manage pipeline-server operations. */
export const PipelineCLI = Acclimate.createCLI("pipeline")
  .description("Manage and run pipelines.")
  .addCommand("list", PipelineListCLI)
  .addCommand("run", RunPipelineCLI);
