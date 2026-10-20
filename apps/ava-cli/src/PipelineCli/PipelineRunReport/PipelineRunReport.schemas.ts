import { z } from "zod";

/**
 * An ISO 8601 timestamp, as `JSON.stringify` writes a `Date`. An offset is
 * accepted as well as `Z`.
 */
const _TimestampSchema = z.iso.datetime({ offset: true });

/**
 * A pipeline run's report as the pipeline server and the local runner send
 * it: `@avandar/etl`'s `EtlRunReport`, with dates as ISO 8601 strings and
 * unset fields left out. `mode` and `status` accept any string, so a value
 * the engine adds later is printed as is instead of losing the report.
 */
export const PipelineRunReportSchema = z.object({
  pipelineRunId: z.string(),
  mode: z.string(),
  drives: z.array(
    z.object({
      driveKey: z.string(),
      window: z.object({
        since: _TimestampSchema.optional(),
        until: _TimestampSchema.optional(),
      }),
      connectionsFetched: z.number(),
      relationsWritten: z.number(),
      relationsUnchanged: z.number(),
      newestTimestamp: _TimestampSchema.optional(),
      status: z.string(),
      error: z.string().optional(),
    }),
  ),
});

/** A parsed pipeline run report. */
export type PipelineRunReport = z.infer<typeof PipelineRunReportSchema>;

/**
 * A run report as the CLI received it: parsed when it matches
 * `PipelineRunReportSchema`, otherwise its JSON text, to print as is.
 */
export type ReceivedPipelineRunReport =
  | Readonly<{ isReadable: true; report: PipelineRunReport }>
  | Readonly<{ isReadable: false; json: string }>;
