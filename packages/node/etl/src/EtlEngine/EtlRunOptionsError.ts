/**
 * The `name` of every `EtlRunOptionsError`. Match on it rather than with
 * `instanceof` when the package may be loaded more than once.
 */
export const ETL_RUN_OPTIONS_ERROR_NAME = "EtlRunOptionsError";

/**
 * A run's options are invalid for this engine, such as an incremental run of
 * a pipeline with no incremental config. Thrown before any drive is listed,
 * so a caller can answer it as a bad request rather than a failed run.
 * Match it by `ETL_RUN_OPTIONS_ERROR_NAME` when the package may be loaded
 * more than once.
 */
export class EtlRunOptionsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = ETL_RUN_OPTIONS_ERROR_NAME;
  }
}
