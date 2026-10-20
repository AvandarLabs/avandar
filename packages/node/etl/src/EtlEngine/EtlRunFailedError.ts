import type { EtlRunReport } from "@etl/EtlEngine/EtlEngine.types";

/** Every drive of a run failed. Carries the run's report. */
export class EtlRunFailedError extends Error {
  /** The run's report, with each drive's error. */
  readonly report: EtlRunReport;

  constructor(report: EtlRunReport) {
    const failures = report.drives
      .map((drive) => {
        return `${drive.driveKey}: ${drive.error ?? "unknown error"}`;
      })
      .join("; ");
    super(`Every drive failed. ${failures}`);
    this.name = "EtlRunFailedError";
    this.report = report;
  }
}
