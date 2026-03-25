import { access, readdir } from "node:fs/promises";
import path from "node:path";
import { Acclimate } from "@avandar/acclimate";
import {
    printError,
    printSuccess,
} from "../../utils/cliOutput/cliOutput";

type GetAvailablePipelineNamesOptions = Readonly<{
  pipelinesDirPath?: string;
}>;

async function _hasRunFile(directoryPath: string): Promise<boolean> {
  try {
    await access(path.join(directoryPath, "run.ts"));
    return true;
  } catch {
    return false;
  }
}

export async function getAvailablePipelineNames(
  options: GetAvailablePipelineNamesOptions = {},
): Promise<readonly string[]> {
  const pipelinesDirPath: string =
    options.pipelinesDirPath ??
    path.join(process.cwd(), "apps/pipeline-server/pipelines");
  const entries = await readdir(pipelinesDirPath, {
    withFileTypes: true,
  });

  const pipelines = await Promise.all(
    entries.map(async (entry) => {
      if (!entry.isDirectory()) {
        return undefined;
      }

      const directoryPath: string = path.join(pipelinesDirPath, entry.name);
      const hasRunFile: boolean = await _hasRunFile(directoryPath);
      return hasRunFile ? entry.name : undefined;
    }),
  );

  return pipelines
    .filter((pipelineName): pipelineName is string => {
      return pipelineName !== undefined;
    })
    .sort();
}

export async function runPipelineList(
  options: GetAvailablePipelineNamesOptions = {},
): Promise<void> {
  try {
    const pipelines: readonly string[] =
      await getAvailablePipelineNames(options);

    if (pipelines.length === 0) {
      printSuccess("No pipelines found.");
      return;
    }

    printSuccess("Available pipelines:");
    pipelines.forEach((pipelineName) => {
      Acclimate.log(`\t${pipelineName}`);
    });
  } catch (error: unknown) {
    const message: string =
      error instanceof Error ? error.message : String(error);

    printError("Failed to list pipelines.");
    printError(message);
    throw error;
  }
}

export const PipelineListCLI = Acclimate.createCLI("list")
  .description("List all available pipelines.")
  .action(runPipelineList);
