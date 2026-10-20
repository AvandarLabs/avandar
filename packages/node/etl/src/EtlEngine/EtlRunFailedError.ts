import type { EtlRunReport } from "@etl/EtlEngine/EtlEngine.types";

/**
 * The `name` of every `EtlRunFailedError`. Match on it rather than with
 * `instanceof` when the package may be loaded more than once.
 */
export const ETL_RUN_FAILED_ERROR_NAME = "EtlRunFailedError";

/**
 * Every drive of a run failed. Carries the run's report and what each drive
 * threw, so an error's class and stack survive the run.
 */
export class EtlRunFailedError extends Error {
  /** The run's report, with each drive's error message. */
  readonly report: EtlRunReport;
  /** What each failed drive threw, in drive order. */
  readonly errors: readonly unknown[];

  constructor(
    args: Readonly<{ report: EtlRunReport; errors: readonly unknown[] }>,
  ) {
    const { report, errors } = args;
    const failures = report.drives
      .map((drive) => {
        return `${drive.driveKey}: ${drive.error ?? "unknown error"}`;
      })
      .join("; ");
    super(`Every drive failed. ${failures}`, {
      cause: new AggregateError(errors, "What each failed drive threw."),
    });
    this.name = ETL_RUN_FAILED_ERROR_NAME;
    this.report = report;
    this.errors = errors;
  }
}
