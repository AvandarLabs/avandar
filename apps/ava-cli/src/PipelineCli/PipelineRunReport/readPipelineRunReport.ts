import { PipelineRunReportSchema } from "@ava-cli/PipelineCli/PipelineRunReport/PipelineRunReport.schemas";
import type { ReceivedPipelineRunReport } from "@ava-cli/PipelineCli/PipelineRunReport/PipelineRunReport.schemas";

/**
 * Reads a run report from parsed JSON. A value that does not match the
 * schema is kept as its JSON text, so it can still be printed after a run
 * that finished.
 */
export function readPipelineRunReport(
  value: unknown,
): ReceivedPipelineRunReport {
  const result = PipelineRunReportSchema.safeParse(value);
  return result.success
    ? { isReadable: true, report: result.data }
    : { isReadable: false, json: JSON.stringify(value) };
}
