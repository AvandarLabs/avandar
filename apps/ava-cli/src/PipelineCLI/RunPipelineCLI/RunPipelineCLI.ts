import {
  findAvandarRepoRoot,
  runPipelineLocal,
} from "@ava-cli/PipelineCLI/runPipelineLocal";
import { sendRunPipelineRequest } from "@ava-cli/PipelineCLI/sendRunPipelineRequest";
import {
  printError,
  printInfo,
  printSuccess,
} from "@ava-cli/utils/cliOutput/cliOutput";
import { Acclimate } from "@avandar/acclimate";

export async function runPipelineCommand(options: {
  name: string;
  local: boolean;
}): Promise<void> {
  const { name, local } = options;

  try {
    printInfo(`Running pipeline: ${name}`);
    if (local) {
      const repoRoot: string | undefined = findAvandarRepoRoot();
      if (repoRoot === undefined) {
        throw new Error(
          "Could not find the Avandar repo root (look for " +
            "pnpm-workspace.yaml and apps/pipeline-server/pipelines). " +
            "Run this command from inside the repository.",
        );
      }
      const localResult = runPipelineLocal({
        pipelineName: name,
        repoRoot,
      });
      if (!localResult.ok) {
        throw new Error(localResult.errorText);
      }
      printSuccess(localResult.pipelineRunId);
      return;
    }

    const result: string = await sendRunPipelineRequest({
      pipelineName: name,
    });
    printSuccess(result);
  } catch (error: unknown) {
    const message: string =
      error instanceof Error ? error.message : String(error);

    printError(`Failed to run pipeline: ${name}`);
    printError(message);
    throw error;
  }
}

export const RunPipelineCLI = Acclimate.createCLI("run")
  .description(
    "Run a pipeline on the pipeline-server, or use --local to run the " +
      "pipeline module via vite-node without starting the server.",
  )
  .addPositionalArg({
    name: "name",
    required: true,
    description: "The pipeline name to run.",
    type: "string",
  })
  .addOption({
    name: "--local",
    aliases: ["-l"] as const,
    type: "boolean",
    required: false,
    defaultValue: false,
    description:
      "Run the pipeline TypeScript module locally (no HTTP server required).",
  })
  .action(({ name, local }: Readonly<{ name: string; local: boolean }>) => {
    return runPipelineCommand({ name, local });
  });
