import {
  findAvandarRepoRoot,
  runPipelineLocal,
} from "@ava-cli/PipelineCli/runPipelineLocal";
import { sendRunPipelineRequest } from "@ava-cli/PipelineCli/sendRunPipelineRequest";
import {
  printError,
  printInfo,
  printSuccess,
} from "@ava-cli/utils/cliOutput/cliOutput";
import { Acclimate } from "@avandar/acclimate";

/**
 * Runs a pipeline, on the pipeline-server or locally through vite-node.
 *
 * @param options.name - The pipeline's directory name.
 * @param options.local - Run it in-process instead of on the server.
 * @param options.limit - Process at most this many datasets.
 */
export async function runPipelineCommand(options: {
  name: string;
  local: boolean;
  limit?: number;
}): Promise<void> {
  const { name, local, limit } = options;

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
        limit,
      });
      if (!localResult.ok) {
        throw new Error(localResult.errorText);
      }
      printSuccess(localResult.pipelineRunId);
      return;
    }

    const result: string = await sendRunPipelineRequest({
      pipelineName: name,
      limit,
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

export const RunPipelineCli = Acclimate.createCLI("run")
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
  .addOption({
    name: "--limit",
    type: "number",
    required: false,
    description:
      "Process at most this many datasets. For testing a pipeline without " +
      "a full run. The hdx and socrata pipelines support it.",
    parser: (value: string) => {
      return Number(value);
    },
    validator: (value: number) => {
      return (
        (Number.isInteger(value) && value >= 1) ||
        "--limit must be a positive integer."
      );
    },
  })
  .action(
    ({
      name,
      local,
      limit,
    }: Readonly<{ name: string; local: boolean; limit?: number }>) => {
      return runPipelineCommand({ name, local, limit });
    },
  );
