import { fileURLToPath } from "node:url";
import { getWorkspaceLoadabilityRules, readEtlConfigFile } from "@avandar/etl";
import type { EtlWorkspaceLoadabilityRules } from "@avandar/etl";

/** The ETL config every pipeline in this server shares. */
const ETL_CONFIG_PATH = fileURLToPath(
  new URL("../../etl.config.yaml", import.meta.url),
);

/**
 * The formats a workspace cannot load from one pipeline's listings, as
 * `pipelines/etl.config.yaml` declares them globally and for that pipeline.
 *
 * @param pipelineName - The pipeline whose overrides apply.
 * @returns The rules to pass to the pipeline's engine.
 * @throws When the config file cannot be read or is invalid.
 */
export function getPipelineWorkspaceLoadability(
  pipelineName: string,
): EtlWorkspaceLoadabilityRules {
  return getWorkspaceLoadabilityRules({
    config: readEtlConfigFile(ETL_CONFIG_PATH),
    pipelineName,
  });
}
