/**
 * How a pipeline run chose each crawl's lower bound.
 *
 * Enum values:
 *
 * `full` - From the start, or from `--since`.
 *
 * `incremental` - From each scope's checkpoint.
 */
create type public.pipeline_executions__run_mode as enum('full', 'incremental');
