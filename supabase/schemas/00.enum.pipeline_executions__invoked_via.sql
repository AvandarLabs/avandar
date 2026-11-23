/**
 * How a pipeline execution was started.
 *
 * Enum values:
 *
 * `cli_local` - The `ava` CLI ran it in its own process: `run --local`,
 *  `reset`, or `prune-retired-scopes`.
 *
 * `cli_server` - The `ava` CLI asked the pipeline server to run it.
 *
 * `http` - Any other caller of the pipeline server.
 */
create type public.pipeline_executions__invoked_via as enum('cli_local', 'cli_server', 'http');
