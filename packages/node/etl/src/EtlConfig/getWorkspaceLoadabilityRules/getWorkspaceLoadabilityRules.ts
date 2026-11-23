import type {
  EtlConfig,
  EtlPipelineWorkspaceLoadability,
  EtlWorkspaceLoadabilityRules,
} from "@etl/EtlConfig/EtlConfig.types";

/**
 * A format as the rules compare it: trimmed, lowercase, and with no leading
 * dot, so `PDF`, `pdf`, and `.pdf` are one format.
 */
export function normalizeEtlFormat(format: string): string {
  return format.trim().toLowerCase().replace(/^\./, "");
}

/**
 * The loadability rules one pipeline's engine applies: the shared
 * config's global unloadable formats, minus the ones the pipeline can
 * load anyway, plus the pipeline's own.
 *
 * @param args.config - The shared ETL config.
 * @param args.pipelineOverrides - The pipeline config's
 *   `workspaceLoadability`. Omit for none.
 * @returns The rules, with every format normalized and listed once.
 */
export function getWorkspaceLoadabilityRules(args: {
  config: EtlConfig;
  pipelineOverrides?: EtlPipelineWorkspaceLoadability;
}): EtlWorkspaceLoadabilityRules {
  const overrides = args.pipelineOverrides ?? {};
  const loadableFormats = new Set(
    (overrides.loadableFormats ?? []).map(normalizeEtlFormat),
  );
  const unloadableFormats = [
    ...args.config.workspaceLoadability.unloadableFormats,
    ...(overrides.unloadableFormats ?? []),
  ]
    .map(normalizeEtlFormat)
    .filter((format) => {
      return !loadableFormats.has(format);
    });
  return { unloadableFormats: [...new Set(unloadableFormats)] };
}
