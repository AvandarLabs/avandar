import { readFileSync } from "node:fs";
import { parsePipelineConfig } from "@etl/EtlConfig/parsePipelineConfig/parsePipelineConfig";
import type { PipelineConfig } from "@etl/EtlConfig/PipelineConfig.types";

/**
 * Reads and parses one pipeline's config file.
 *
 * @param filePath - The YAML file, such as `socrata.pipeline.yaml`.
 * @returns The config.
 * @throws When the file cannot be read or is not a valid config.
 */
export function readPipelineConfigFile(filePath: string): PipelineConfig {
  return parsePipelineConfig({
    yamlText: readFileSync(filePath, "utf8"),
    sourceName: filePath,
  });
}
