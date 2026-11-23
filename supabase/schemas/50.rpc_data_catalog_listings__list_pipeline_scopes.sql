/**
 * Every drive and scope pair a pipeline has stored: the scopes in its
 * listings' `pipeline_scope_keys`, by `api_base_url`, and the scopes it has a
 * checkpoint for. `ava pipeline prune-retired-scopes` compares these with the
 * scopes the pipeline declares today to find the retired ones.
 *
 * A listing with a null `api_base_url` (every `pipeline_parquet` listing)
 * belongs to no drive and is not listed.
 *
 * @param p_pipeline_name The pipeline, as `pipeline_name` names it.
 *
 * @returns One row per distinct pair, ordered by drive, then scope.
 */
create or replace function public.rpc_data_catalog_listings__list_pipeline_scopes (p_pipeline_name text) returns table (drive_key text, scope_key text) as $$
  select stored.drive_key, stored.scope_key
  from (
    select
      listing.api_base_url as drive_key,
      unnest(listing.pipeline_scope_keys) as scope_key
    from public.data_catalog_listings listing
    where
      listing.pipeline_name = p_pipeline_name and
      listing.api_base_url is not null
    union
    select scope_checkpoint.drive_key, scope_checkpoint.scope_key
    from public.pipeline_scope_checkpoints scope_checkpoint
    where scope_checkpoint.pipeline_name = p_pipeline_name
  ) stored
  order by stored.drive_key, stored.scope_key;
$$ language sql stable security invoker
set
  search_path = '';

-- `service_role` only: the `ava` CLI calls this with the service role key.
revoke
execute on function public.rpc_data_catalog_listings__list_pipeline_scopes (text)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_data_catalog_listings__list_pipeline_scopes (text) to service_role;
