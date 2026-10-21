import { getEtlRunFailedReport } from "@pipelines/shared/getEtlRunFailedReport/getEtlRunFailedReport";
import type { EtlRunReport } from "@avandar/etl";
import type { PipelineRunOptions } from "@pipelines/shared/PipelineRunOptions.types";

/**
 * Runs a pipeline for `scripts/runPipelineOnce.ts` and prints the run's
 * report as JSON on the last line of stdout, where `ava pipeline run
 * --local` reads it.
 *
 * When every crawl failed, the error's message goes to stderr, the report is
 * still printed, and the exit code is set to 1. The process is left to exit
 * on its own, so stdout is flushed before it does.
 *
 * @throws Any other error `run` throws.
 */
export async function runPipelineAndPrintReport(
  args: Readonly<{
    run: (options: PipelineRunOptions) => Promise<EtlRunReport>;
    options: PipelineRunOptions;
  }>,
): Promise<void> {
  try {
    const report = await args.run(args.options);
    console.log(JSON.stringify(report));
  } catch (error: unknown) {
    const failedReport = getEtlRunFailedReport(error);
    if (failedReport === undefined) {
      throw error;
    }
    console.error(error instanceof Error ? error.message : String(error));
    console.log(JSON.stringify(failedReport));
    process.exitCode = 1;
  }
}
