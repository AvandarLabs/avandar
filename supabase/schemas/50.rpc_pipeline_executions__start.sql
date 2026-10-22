/**
 * Records that a pipeline command started: inserts its execution row as
 * `running`, with what ran and how it was invoked.
 *
 * @param p_execution A JSON object with `pipeline_executions` columns:
 *   `id` (optional; a run passes its `pipeline_run_id`), `pipeline_name`,
 *   `command`, `run_mode`, `is_dry_run`, `is_scoped`, `is_limited`,
 *   `is_windowed`, `invoked_via`, `cli_argv`, `request_body`, `arguments`,
 *   `actor`, `host`, `code_version`, and `started_at` (defaults to now).
 *
 * @returns The execution's id.
 */
create or replace function public.rpc_pipeline_executions__start (p_execution jsonb) returns uuid as $$
declare
  v_input public.pipeline_executions;
  v_id uuid;
begin
  if jsonb_typeof(p_execution) is distinct from 'object' then
    raise exception 'rpc_pipeline_executions__start needs a JSON object';
  end if;
  v_input := jsonb_populate_record(null::public.pipeline_executions, p_execution);

  insert into public.pipeline_executions (
    id,
    pipeline_name,
    command,
    run_mode,
    is_dry_run,
    is_scoped,
    is_limited,
    is_windowed,
    invoked_via,
    cli_argv,
    request_body,
    arguments,
    actor,
    host,
    code_version,
    started_at
  ) values (
    coalesce(v_input.id, gen_random_uuid()),
    v_input.pipeline_name,
    v_input.command,
    v_input.run_mode,
    coalesce(v_input.is_dry_run, false),
    coalesce(v_input.is_scoped, false),
    coalesce(v_input.is_limited, false),
    coalesce(v_input.is_windowed, false),
    v_input.invoked_via,
    v_input.cli_argv,
    v_input.request_body,
    coalesce(v_input.arguments, '{}'::jsonb),
    v_input.actor,
    v_input.host,
    v_input.code_version,
    coalesce(v_input.started_at, now())
  )
  returning id into v_id;

  return v_id;
end;
$$ language plpgsql volatile security invoker
set
  search_path = '';

-- `service_role` only: pipelines and the `ava` CLI record executions with
-- the service role key.
revoke
execute on function public.rpc_pipeline_executions__start (jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_pipeline_executions__start (jsonb) to service_role;
