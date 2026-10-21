/** The `name` of the error a pipeline name that is not a folder name throws. */
export const INVALID_PIPELINE_NAME_ERROR_NAME = "InvalidPipelineNameError";

/**
 * A pipeline name may only be a plain folder name, so a decoded URL
 * parameter such as `../hdx` or `hdx?x` never reaches a dynamic import.
 */
const _PIPELINE_NAME_PATTERN = /^[a-z0-9_-]+$/;

/**
 * Throws when a pipeline name is not a plain folder name of lowercase
 * letters, digits, `_` and `-`.
 *
 * @param pipelineName - The pipeline's directory name.
 * @throws An error named `INVALID_PIPELINE_NAME_ERROR_NAME` when the name
 * holds any other character.
 */
export function assertValidPipelineName(pipelineName: string): void {
  if (!_PIPELINE_NAME_PATTERN.test(pipelineName)) {
    const error = new Error(
      `Pipeline name ${JSON.stringify(pipelineName)} may only hold lowercase letters, digits, "_" and "-".`,
    );
    error.name = INVALID_PIPELINE_NAME_ERROR_NAME;
    throw error;
  }
}

/**
 * The URL of a pipeline's module,
 * `apps/pipeline-server/pipelines/<name>/run.ts`.
 *
 * @param pipelineName - The pipeline's directory name.
 * @returns The module's file URL.
 * @throws An error named `INVALID_PIPELINE_NAME_ERROR_NAME` when the name is
 * not a plain folder name of lowercase letters, digits, `_` and `-`.
 */
export function buildPipelineModuleUrl(pipelineName: string): URL {
  assertValidPipelineName(pipelineName);
  return new URL(
    `../../../../pipelines/${pipelineName}/run.ts`,
    import.meta.url,
  );
}
