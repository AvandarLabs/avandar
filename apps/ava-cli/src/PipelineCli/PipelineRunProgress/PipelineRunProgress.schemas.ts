import { z } from "zod";

/**
 * What a crawl did to ease off the database: `@avandar/etl`'s
 * `EtlWriteThrottleEvent`, flattened. `writeMs` is set for a slow write,
 * and `failureCount`, `maxFailures`, and `message` for a transient failure.
 */
const WriteThrottleSchema = z.object({
  reason: z.enum(["slow_write", "transient_failure"]),
  byteBudget: z.number(),
  pauseMs: z.number(),
  writeMs: z.number().optional(),
  failureCount: z.number().optional(),
  maxFailures: z.number().optional(),
  message: z.string().optional(),
});

/**
 * A progress event as the local runner writes it to stderr: `@avandar/etl`'s
 * `EtlRunProgress`, with unset fields left out. The counts are totals for
 * the whole run so far.
 */
export const PipelineRunProgressSchema = z.object({
  stage: z.enum([
    "crawl_started",
    "page_loaded",
    "crawl_finished",
    "write_throttled",
  ]),
  driveKey: z.string(),
  scopeKey: z.string(),
  crawlNumber: z.number(),
  crawlCount: z.number(),
  limit: z.number().optional(),
  connectionsFetched: z.number(),
  relationsTransformed: z.number(),
  columnsFound: z.number(),
  status: z.string().optional(),
  throttle: WriteThrottleSchema.optional(),
});

export type PipelineRunProgress = z.infer<typeof PipelineRunProgressSchema>;
