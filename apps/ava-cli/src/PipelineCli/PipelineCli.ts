import { PipelineListCli } from "@ava-cli/PipelineCli/PipelineListCli/PipelineListCli";
import { ResetPipelineCli } from "@ava-cli/PipelineCli/ResetPipelineCli/ResetPipelineCli";
import { RunPipelineCli } from "@ava-cli/PipelineCli/RunPipelineCli/RunPipelineCli";
import { Acclimate } from "@avandar/acclimate";

/** Manage pipeline-server operations. */
export const PipelineCli = Acclimate.createCLI("pipeline")
  .description("Manage and run pipelines.")
  .addCommand("list", PipelineListCli)
  .addCommand("reset", ResetPipelineCli)
  .addCommand("run", RunPipelineCli);
