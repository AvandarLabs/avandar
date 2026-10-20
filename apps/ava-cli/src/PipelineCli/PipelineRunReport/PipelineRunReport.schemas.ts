import { z } from "zod";

/**
 * An ISO 8601 timestamp, as `JSON.stringify` writes a `Date`. An offset is
 * accepted as well as `Z`.
 */
const _TimestampSchema = z.iso.datetime({ offset: true });

/**
 * A pipeline run's report as the pipeline server and the local runner send
 * it: `@avandar/etl`'s `EtlRunReport`, with dates as ISO 8601 strings and
 * unset fields left out.
 */
export const PipelineRunReportSchema = z.object({
  pipelineRunId: z.string(),
  mode: z.enum(["full", "incremental"]),
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
      status: z.enum(["ok", "failed", "skipped"]),
      error: z.string().optional(),
    }),
  ),
});

/** A parsed pipeline run report. */
export type PipelineRunReport = z.infer<typeof PipelineRunReportSchema>;
