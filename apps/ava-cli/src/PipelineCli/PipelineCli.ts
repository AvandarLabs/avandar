import { PipelineListCli } from "@ava-cli/PipelineCli/PipelineListCli/PipelineListCli";
import { PruneRetiredScopesCli } from "@ava-cli/PipelineCli/PruneRetiredScopesCli/PruneRetiredScopesCli";
import { ResetPipelineCli } from "@ava-cli/PipelineCli/ResetPipelineCli/ResetPipelineCli";
import { RunPipelineCli } from "@ava-cli/PipelineCli/RunPipelineCli/RunPipelineCli";
import { Acclimate } from "@avandar/acclimate";

/** Manage pipeline-server operations. */
export const PipelineCli = Acclimate.createCLI("pipeline")
  .description("Manage and run pipelines.")
  .addCommand("list", PipelineListCli)
  .addCommand("reset", ResetPipelineCli)
  .addCommand("prune-retired-scopes", PruneRetiredScopesCli)
  .addCommand("run", RunPipelineCli);
