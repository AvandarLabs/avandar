import { readFileSync } from "node:fs";
import { parseEtlConfig } from "@etl/EtlConfig/parseEtlConfig/parseEtlConfig";
import type { EtlConfig } from "@etl/EtlConfig/EtlConfig.types";

/**
 * Reads and parses the shared ETL config file.
 *
 * @param filePath - The YAML file, such as `etl.config.yaml`.
 * @returns The config.
 * @throws When the file cannot be read or is not a valid config.
 */
export function readEtlConfigFile(filePath: string): EtlConfig {
  return parseEtlConfig({
    yamlText: readFileSync(filePath, "utf8"),
    sourceName: filePath,
  });
}
