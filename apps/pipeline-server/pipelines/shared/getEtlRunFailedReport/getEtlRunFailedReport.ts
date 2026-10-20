import type { EtlRunReport } from "@avandar/etl";

/** The name of the engine's error for a run where every drive failed. */
const _ETL_RUN_FAILED_ERROR_NAME = "EtlRunFailedError";

/**
 * The report an `EtlRunFailedError` carries, so a run where every drive
 * failed can still show what each drive did. Matches the error by name, not
 * `instanceof`, in case `@avandar/etl` loads twice.
 *
 * @returns The report, or `undefined` for any other error.
 */
export function getEtlRunFailedReport(
  error: unknown,
): EtlRunReport | undefined {
  if (
    !(error instanceof Error) ||
    error.name !== _ETL_RUN_FAILED_ERROR_NAME ||
    !("report" in error)
  ) {
    return undefined;
  }
  return error.report as EtlRunReport;
}
