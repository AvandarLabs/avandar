import { parse } from "yaml";
import { z } from "zod";
import type { EtlConfig } from "@etl/EtlConfig/EtlConfig.types";

const FormatListSchema = z.array(z.string());

const EtlConfigSchema = z
  .object({
    workspaceLoadability: z
      .strictObject({ unloadableFormats: FormatListSchema.default([]) })
      .default({ unloadableFormats: [] }),
  })
  .strict();

/**
 * Parses the shared ETL config from YAML. An empty file is a config with no
 * rules. Unknown keys are refused, so a misspelled key fails loudly rather
 * than silently loosening a rule. Per-pipeline overrides live in each
 * pipeline's own config, so a `pipelines` key is refused too.
 *
 * @param args.yamlText - The file's contents.
 * @param args.sourceName - Names the file in error messages.
 * @returns The config.
 * @throws When the YAML does not parse or does not match the config's shape.
 */
export function parseEtlConfig(args: {
  yamlText: string;
  sourceName: string;
}): EtlConfig {
  const rawConfig: unknown = parse(args.yamlText) ?? {};
  const parsed = EtlConfigSchema.safeParse(rawConfig);
  if (!parsed.success) {
    throw new Error(
      `${args.sourceName} is not a valid ETL config: ${z.prettifyError(parsed.error)}`,
    );
  }
  return parsed.data;
}
