/**
 * Which pipeline command an execution was.
 *
 * Enum values:
 *
 * `run` - `ava pipeline run`, locally or through the pipeline server.
 *
 * `reset` - `ava pipeline reset`, for the whole pipeline or one scope.
 *
 * `prune_retired_scopes` - `ava pipeline prune-retired-scopes`.
 */
create type public.pipeline_executions__command as enum('run', 'reset', 'prune_retired_scopes');
