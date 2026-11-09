import type { EtlRunOptions } from "@avandar/etl";

/**
 * The Supabase project a run loads into, as its caller sent it. The server
 * keeps no Supabase credentials of its own, so one server can load into
 * any project whose caller holds its service role key.
 */
export type PipelineSupabaseTarget = Readonly<{
  /** The project's API origin, with no trailing slash. */
  url: string;
  serviceRoleKey: string;
}>;

/**
 * Options every pipeline's `run()` accepts: the engine's run options, and
 * the Supabase project to load into. A run with no `supabase` loads into
 * the project the environment names (`SUPABASE_URL`), as a local run does.
 */
export type PipelineRunOptions = EtlRunOptions &
  Readonly<{ supabase?: PipelineSupabaseTarget }>;
