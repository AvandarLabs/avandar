import { fileURLToPath } from "node:url";
import { getWorkspaceLoadabilityRules, readEtlConfigFile } from "@avandar/etl";
import type {
  EtlWorkspaceLoadabilityRules,
  PipelineConfig,
} from "@avandar/etl";

/** The ETL config every pipeline in this server shares. */
const ETL_CONFIG_PATH = fileURLToPath(
  new URL("../../etl.config.yaml", import.meta.url),
);

/**
 * The formats a workspace cannot load from one pipeline's listings:
 * `pipelines/etl.config.yaml`'s global rules with the pipeline config's
 * own `workspaceLoadability` applied.
 *
 * @param pipelineConfig - The pipeline's parsed config.
 * @returns The rules to pass to the pipeline's engine.
 * @throws When the shared config file cannot be read or is invalid.
 */
export function getPipelineWorkspaceLoadability(
  pipelineConfig: PipelineConfig,
): EtlWorkspaceLoadabilityRules {
  return getWorkspaceLoadabilityRules({
    config: readEtlConfigFile(ETL_CONFIG_PATH),
    pipelineOverrides: pipelineConfig.workspaceLoadability,
  });
}
