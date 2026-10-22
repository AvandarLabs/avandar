/**
 * Where a pipeline execution stands.
 *
 * Enum values:
 *
 * `running` - Started and not finished. A row left running long after it
 *  started belongs to a process that crashed or was killed.
 *
 * `succeeded` - Finished, and every crawl or step succeeded.
 *
 * `partially_failed` - A run where some crawls failed and some did not.
 *
 * `failed` - Every crawl failed, or the command threw.
 *
 * `cancelled` - The user declined a reset or prune at its confirmation.
 */
create type public.pipeline_executions__status as enum(
  'running',
  'succeeded',
  'partially_failed',
  'failed',
  'cancelled'
);
