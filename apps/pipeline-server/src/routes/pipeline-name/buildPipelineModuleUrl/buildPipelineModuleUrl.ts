/**
 * The URL of a pipeline's module,
 * `apps/pipeline-server/pipelines/<name>/run.ts`.
 *
 * @param pipelineName - The pipeline's directory name.
 * @returns The module's file URL.
 */
export function buildPipelineModuleUrl(pipelineName: string): URL {
  return new URL(
    `../../../../pipelines/${pipelineName}/run.ts`,
    import.meta.url,
  );
}
