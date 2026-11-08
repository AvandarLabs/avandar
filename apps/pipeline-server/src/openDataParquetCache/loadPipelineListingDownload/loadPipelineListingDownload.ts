import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadListingDownloadScript, readPipelineConfigFile } from "@avandar/etl";
import { assertValidPipelineName } from "@pipeline-server/routes/pipeline-name/buildPipelineModuleUrl/buildPipelineModuleUrl";
import type { ListingDownloadScript, PipelineDownloadConfig } from "@avandar/etl";

/**
 * Loads a pipeline's `download` config and its download script from
 * `apps/pipeline-server/pipelines/<name>/<name>.pipeline.yaml`. The config is
 * the only place that says how a pipeline's listings are downloaded.
 *
 * @param pipelineName - The pipeline's directory name, as a listing's
 *   `pipeline_name` records it.
 * @throws When the name is not a plain folder name, or the pipeline has no
 *   config or no `download` block.
 */
export async function loadPipelineListingDownload(
  pipelineName: string,
): Promise<{
  download: PipelineDownloadConfig;
  script: ListingDownloadScript;
}> {
  assertValidPipelineName(pipelineName);
  const configPath = fileURLToPath(
    new URL(
      `../../../pipelines/${pipelineName}/${pipelineName}.pipeline.yaml`,
      import.meta.url,
    ),
  );
  const download = existsSync(configPath)
    ? readPipelineConfigFile(configPath).download
    : undefined;
  if (download === undefined) {
    throw new Error(
      `Pipeline "${pipelineName}" has no download block in ${pipelineName}.pipeline.yaml, so its listings cannot be copied.`,
    );
  }
  const script = await loadListingDownloadScript({
    download,
    configDir: dirname(configPath),
  });
  return { download, script };
}
