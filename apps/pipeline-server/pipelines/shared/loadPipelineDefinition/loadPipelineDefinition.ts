import { dirname } from "node:path";
import { loadCatalogFieldMapper, readPipelineConfigFile } from "@avandar/etl";
import type { CatalogFieldMapper, PipelineConfig } from "@avandar/etl";

/** A pipeline's parsed config and its compiled field mapper. */
export type PipelineDefinition = Readonly<{
  config: PipelineConfig;
  mapper: CatalogFieldMapper;
}>;

/**
 * Reads one pipeline's `<pipeline>.pipeline.yaml` and compiles its field
 * mappings, importing each mapper script once. Call once per run.
 *
 * @param configPath - The YAML file's absolute path. Script paths in it are
 *   relative to its directory.
 * @returns The config and its mapper.
 * @throws When the file is invalid or a script cannot be loaded.
 */
export async function loadPipelineDefinition(
  configPath: string,
): Promise<PipelineDefinition> {
  const config = readPipelineConfigFile(configPath);
  const mapper = await loadCatalogFieldMapper({
    config,
    configDir: dirname(configPath),
  });
  return { config, mapper };
}
