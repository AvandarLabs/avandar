import { Acclimate } from "@avandar/acclimate";
import { PipelineListCLI } from "./PipelineListCLI/PipelineListCLI";
import { RunPipelineCLI } from "./RunPipelineCLI/RunPipelineCLI";

/** Manage pipeline-server operations. */
export const PipelineCLI = Acclimate.createCLI("pipeline")
  .description("Manage and run pipelines.")
  .addCommand("list", PipelineListCLI)
  .addCommand("run", RunPipelineCLI);
