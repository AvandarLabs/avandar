/**
 * The formats a workspace cannot load, as one pipeline's engine applies
 * them. Each format is lowercase, with no leading dot.
 */
export type EtlWorkspaceLoadabilityRules = Readonly<{
  unloadableFormats: readonly string[];
}>;

/** One pipeline's changes to the global loadability rules. */
export type EtlPipelineWorkspaceLoadability = Readonly<{
  /** Global unloadable formats this pipeline can load anyway. */
  loadableFormats?: readonly string[];
  /** Formats this pipeline cannot load, on top of the global ones. */
  unloadableFormats?: readonly string[];
}>;

/**
 * The shared ETL config file every pipeline reads, such as
 * `etl.config.yaml`. Formats are matched case-insensitively and may be
 * written as file extensions (`.pdf`).
 */
export type EtlConfig = Readonly<{
  workspaceLoadability: Readonly<{ unloadableFormats: readonly string[] }>;
}>;
