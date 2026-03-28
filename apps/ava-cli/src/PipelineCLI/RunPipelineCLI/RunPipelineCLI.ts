import { sendRunPipelineRequest } from "@ava-cli/PipelineCLI/sendRunPipelineRequest";
import {
  printError,
  printInfo,
  printSuccess,
} from "@ava-cli/utils/cliOutput/cliOutput";
import { Acclimate } from "@avandar/acclimate";

export async function runPipelineCommand(options: {
  name: string;
}): Promise<void> {
  const { name } = options;

  try {
    printInfo(`Running pipeline: ${name}`);
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
  .description("Run a pipeline on the pipeline-server.")
  .addPositionalArg({
    name: "name",
    required: true,
    description: "The pipeline name to run.",
    type: "string",
  })
  .action(({ name }: Readonly<{ name: string }>) => {
    return runPipelineCommand({ name });
  });
