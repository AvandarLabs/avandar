import type { ReceivedPipelineRunReport } from "@ava-cli/PipelineCli/PipelineRunReport/PipelineRunReport.schemas";

/**
 * A pipeline run failed, but still sent its report: every drive failed, and
 * the report says what each one did.
 */
export class PipelineRunFailedError extends Error {
  /** The failed run's report, as received. */
  readonly report: ReceivedPipelineRunReport;

  constructor(
    args: Readonly<{ message: string; report: ReceivedPipelineRunReport }>,
  ) {
    super(args.message);
    this.name = "PipelineRunFailedError";
    this.report = args.report;
  }
}
