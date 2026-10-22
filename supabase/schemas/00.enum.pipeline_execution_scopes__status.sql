/**
 * How one drive and scope of a pipeline execution ended.
 *
 * Enum values:
 *
 * `succeeded` - Crawled, or pruned, without error.
 *
 * `failed` - Failed partway; the row records what finished before.
 *
 * `skipped` - Not crawled, because the run's limit was already reached.
 */
create type public.pipeline_execution_scopes__status as enum('succeeded', 'failed', 'skipped');
