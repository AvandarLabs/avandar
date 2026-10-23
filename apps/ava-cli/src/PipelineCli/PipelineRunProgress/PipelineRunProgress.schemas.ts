import { z } from "zod";

/**
 * A progress event as the local runner writes it to stderr: `@avandar/etl`'s
 * `EtlRunProgress`, with unset fields left out. The counts are totals for
 * the whole run so far.
 */
export const PipelineRunProgressSchema = z.object({
  stage: z.enum(["crawl_started", "page_loaded", "crawl_finished"]),
  driveKey: z.string(),
  scopeKey: z.string(),
  crawlNumber: z.number(),
  crawlCount: z.number(),
  limit: z.number().optional(),
  connectionsFetched: z.number(),
  relationsTransformed: z.number(),
  columnsFound: z.number(),
  status: z.string().optional(),
});

export type PipelineRunProgress = z.infer<typeof PipelineRunProgressSchema>;
