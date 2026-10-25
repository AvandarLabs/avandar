import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { getEtlLoadDir, getEtlOutputDir } from "@etl/EtlEngine/etlPaths";
import type { EtlPipelineRunId } from "@etl/EtlEngine/EtlEngine.types";

/**
 * Copies a source file into the extract output directory for this run.
 *
 * @param options.pipelineName Pipeline folder name under `etl-output`.
 * @param options.pipelineRunId Run identifier.
 * @param options.sourcePath Absolute or relative path to the file to copy.
 * @param options.destinationBasename Filename in the extract directory
 * (e.g. `WDIData.csv`).
 */
export async function storeExtractedData(options: {
  pipelineName: string;
  pipelineRunId: EtlPipelineRunId;
  sourcePath: string;
  destinationBasename: string;
}): Promise<void> {
  const { pipelineName, pipelineRunId, sourcePath, destinationBasename } =
    options;
  const extractDir = getEtlOutputDir(pipelineName, pipelineRunId, "extract");
  await mkdir(extractDir, { recursive: true });
  const dest = join(extractDir, destinationBasename);
  await copyFile(sourcePath, dest);
}

/**
 * Absolute path to a Parquet file produced for the load stage.
 *
 * @param options.tableBaseName Table key without `.parquet` (matches transform
 * `name`).
 */
export function getLoadParquetPathForTable(options: {
  pipelineName: string;
  pipelineRunId: EtlPipelineRunId;
  tableBaseName: string;
}): string {
  const { pipelineName, pipelineRunId, tableBaseName } = options;
  const loadDir = getEtlLoadDir(pipelineName, pipelineRunId);
  return join(loadDir, `${tableBaseName}.parquet`);
}
