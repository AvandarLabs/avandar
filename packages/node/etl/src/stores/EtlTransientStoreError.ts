/**
 * The `name` of every `EtlTransientStoreError`. Match on it rather than with
 * `instanceof` when the package may be loaded more than once.
 */
export const ETL_TRANSIENT_STORE_ERROR_NAME = "EtlTransientStoreError";

/**
 * A store request failed in a way a later attempt can succeed at: no
 * response, a gateway or server error, a statement or lock timeout, or a
 * dropped connection. The engine retries the request (see
 * `createWriteThrottle`). Every other store failure is a plain `Error`,
 * which fails the crawl at once.
 */
export class EtlTransientStoreError extends Error {
  /** The HTTP status, when the request got a response. */
  readonly status: number | undefined;
  /** The Postgres or PostgREST error code, when there is one. */
  readonly code: string | undefined;

  constructor(
    message: string,
    details: Readonly<{
      status: number | undefined;
      code: string | undefined;
      cause: unknown;
    }>,
  ) {
    super(message, { cause: details.cause });
    this.name = ETL_TRANSIENT_STORE_ERROR_NAME;
    this.status = details.status;
    this.code = details.code;
  }
}

/** Whether `error` is an `EtlTransientStoreError`, by its `name`. */
export function isEtlTransientStoreError(
  error: unknown,
): error is EtlTransientStoreError {
  return (
    error instanceof Error && error.name === ETL_TRANSIENT_STORE_ERROR_NAME
  );
}
