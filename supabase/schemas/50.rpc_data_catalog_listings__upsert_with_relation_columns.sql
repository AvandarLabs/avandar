/**
 * Inserts or replaces catalog listings together with their relation columns,
 * in one transaction. Each listing is upserted on its conflict key
 * (`data_catalog_listings__api_resource_unique` for an `api_resource`
 * listing, `unique_parquet_file_pipeline` for a `pipeline_parquet` one), and
 * its whole set of relation columns is replaced. A failure anywhere rolls
 * back every listing and column in the call, so a listing and its columns
 * are always written together. The column set may be empty: a listing whose
 * columns the pipeline could not learn gets them when the app verifies its
 * column types.
 *
 * Only the columns `@avandar/etl` writes (its `LISTING_CONTRACT_COLUMNS`) are
 * set on a replaced listing. Every other column, such as the app's cache
 * columns, keeps its stored value.
 *
 * Column types the app verified survive a pipeline rewrite. When an element
 * carries no `date_column_type_last_verified` and its
 * `metadata.relation_columns_sha256` (the fingerprint of the columns the
 * pipeline produces) equals the stored listing's, the pipeline's view of the
 * columns has not changed, so the stored columns and verification date are
 * kept. Otherwise the columns are replaced and the date is the element's:
 * set when the pipeline read real types, null when it only knew names.
 *
 * A listing the app marked invalid stays invalid while its
 * `date_of_last_update` is unchanged. Once the source has changed, the
 * listing is written valid again, so the app checks it anew.
 *
 * @param p_listings A JSON array. Each element is an object with `listing`,
 *   the listing's contract columns, and `relation_columns`, an array, possibly
 *   empty, of `{ column_name, display_order, original_data_type,
 *   cast_data_type }`.
 *
 * Only the stored listings' ids are returned, never the rows: returning
 * every row buffered each call's listings in a temp file and sent them all
 * back to the caller. The input array is read one element at a time for
 * the same reason.
 *
 * @returns The stored listings' ids, in input order.
 *
 * @throws When `p_listings` is not an array, when an element's
 *   `relation_columns` is not an array, and when two elements share a
 *   conflict key.
 */
create or replace function public.rpc_data_catalog_listings__upsert_with_relation_columns (p_listings jsonb) returns setof uuid as $$
declare
  v_item jsonb;
  v_index integer;
  v_input public.data_catalog_listings;
  v_stored public.data_catalog_listings;
  v_listing_id uuid;
  v_is_keeping_stored_columns boolean;
  v_written_ids uuid[] := '{}';
begin
  if p_listings is null or jsonb_typeof(p_listings) <> 'array' then
    raise exception 'rpc_data_catalog_listings__upsert_with_relation_columns needs a JSON array of listings';
  end if;

  for v_index in 0..jsonb_array_length(p_listings) - 1 loop
    v_item := p_listings -> v_index;
    if jsonb_typeof(v_item -> 'relation_columns') is distinct from 'array' then
      raise exception 'Listing "%" needs a relation_columns array, which may be empty.',
        v_item -> 'listing' ->> 'display_name';
    end if;

    v_input := jsonb_populate_record(
      null::public.data_catalog_listings,
      v_item -> 'listing'
    );

    -- Find the stored listing by its conflict key, so one upsert on `id`
    -- serves both listing kinds.
    select listing.* into v_stored
    from public.data_catalog_listings listing
    where
      case v_input.access_kind
        when 'api_resource' then
          listing.api_service = v_input.api_service and
          listing.api_base_url = v_input.api_base_url and
          listing.external_dataset_id = v_input.external_dataset_id and
          listing.api_resource_id = v_input.api_resource_id
        else
          listing.parquet_file_name = v_input.parquet_file_name and
          listing.pipeline_name = v_input.pipeline_name
      end
    for update;

    v_input.id := v_stored.id;
    v_is_keeping_stored_columns :=
      v_stored.id is not null and
      v_input.date_column_type_last_verified is null and
      v_stored.metadata ->> 'relation_columns_sha256' is not null and
      v_stored.metadata ->> 'relation_columns_sha256' =
        v_input.metadata ->> 'relation_columns_sha256';
    if v_is_keeping_stored_columns then
      v_input.date_column_type_last_verified :=
        v_stored.date_column_type_last_verified;
    end if;

    if
      v_stored.id is not null and
      v_input.date_of_last_update is not distinct from v_stored.date_of_last_update
    then
      v_input.is_invalid := v_stored.is_invalid;
      v_input.invalid_dataset_reason := v_stored.invalid_dataset_reason;
    else
      v_input.is_invalid := false;
      v_input.invalid_dataset_reason := null;
    end if;

    if v_input.id = any (v_written_ids) then
      raise exception 'Listing "%" appears twice in one call. Each listing may be written only once per call.',
        v_input.display_name;
    end if;

    insert into public.data_catalog_listings (
      id,
      access_kind,
      pipeline_name,
      pipeline_run_id,
      display_name,
      organization1_name,
      external_dataset_id,
      date_of_last_update,
      date_of_last_sync,
      external_service_name,
      source_url,
      canonical_urls,
      license,
      update_frequency,
      description,
      notes,
      metadata,
      coverage_start_date,
      coverage_end_date,
      api_service,
      api_base_url,
      api_resource_id,
      api_resource_format,
      parquet_file_name,
      pipeline_scope_keys,
      date_column_type_last_verified,
      is_invalid,
      invalid_dataset_reason,
      is_workspace_loadable,
      source_asset_type,
      source_download_url,
      organization2_name,
      organization3_name,
      organization4_name,
      domains,
      tags,
      additional_source_metadata,
      drive_id,
      companion_listings,
      api_freshness_probe
    ) values (
      coalesce(v_input.id, gen_random_uuid()),
      v_input.access_kind,
      v_input.pipeline_name,
      v_input.pipeline_run_id,
      v_input.display_name,
      v_input.organization1_name,
      v_input.external_dataset_id,
      v_input.date_of_last_update,
      v_input.date_of_last_sync,
      v_input.external_service_name,
      v_input.source_url,
      v_input.canonical_urls,
      v_input.license,
      v_input.update_frequency,
      v_input.description,
      v_input.notes,
      v_input.metadata,
      v_input.coverage_start_date,
      v_input.coverage_end_date,
      v_input.api_service,
      v_input.api_base_url,
      v_input.api_resource_id,
      v_input.api_resource_format,
      v_input.parquet_file_name,
      coalesce(v_input.pipeline_scope_keys, '{}'),
      v_input.date_column_type_last_verified,
      v_input.is_invalid,
      v_input.invalid_dataset_reason,
      coalesce(v_input.is_workspace_loadable, true),
      v_input.source_asset_type,
      v_input.source_download_url,
      v_input.organization2_name,
      v_input.organization3_name,
      v_input.organization4_name,
      v_input.domains,
      v_input.tags,
      v_input.additional_source_metadata,
      v_input.drive_id,
      coalesce(v_input.companion_listings, '[]'::jsonb),
      v_input.api_freshness_probe
    )
    on conflict (id) do update set
      access_kind = excluded.access_kind,
      pipeline_name = excluded.pipeline_name,
      pipeline_run_id = excluded.pipeline_run_id,
      display_name = excluded.display_name,
      organization1_name = excluded.organization1_name,
      external_dataset_id = excluded.external_dataset_id,
      date_of_last_update = excluded.date_of_last_update,
      date_of_last_sync = excluded.date_of_last_sync,
      external_service_name = excluded.external_service_name,
      source_url = excluded.source_url,
      canonical_urls = excluded.canonical_urls,
      license = excluded.license,
      update_frequency = excluded.update_frequency,
      description = excluded.description,
      notes = excluded.notes,
      metadata = excluded.metadata,
      coverage_start_date = excluded.coverage_start_date,
      coverage_end_date = excluded.coverage_end_date,
      api_service = excluded.api_service,
      api_base_url = excluded.api_base_url,
      api_resource_id = excluded.api_resource_id,
      api_resource_format = excluded.api_resource_format,
      parquet_file_name = excluded.parquet_file_name,
      pipeline_scope_keys = excluded.pipeline_scope_keys,
      date_column_type_last_verified = excluded.date_column_type_last_verified,
      is_invalid = excluded.is_invalid,
      invalid_dataset_reason = excluded.invalid_dataset_reason,
      is_workspace_loadable = excluded.is_workspace_loadable,
      source_asset_type = excluded.source_asset_type,
      source_download_url = excluded.source_download_url,
      organization2_name = excluded.organization2_name,
      organization3_name = excluded.organization3_name,
      organization4_name = excluded.organization4_name,
      domains = excluded.domains,
      tags = excluded.tags,
      additional_source_metadata = excluded.additional_source_metadata,
      drive_id = excluded.drive_id,
      companion_listings = excluded.companion_listings,
      api_freshness_probe = excluded.api_freshness_probe
    returning id into v_listing_id;

    v_written_ids := v_written_ids || v_listing_id;

    if v_is_keeping_stored_columns then
      return next v_listing_id;
      continue;
    end if;

    delete from public.data_catalog_listings__relation_columns relation_column
    where relation_column.catalog_listing_id = v_listing_id;

    insert into public.data_catalog_listings__relation_columns (
      catalog_listing_id,
      column_name,
      display_order,
      original_data_type,
      cast_data_type
    )
    select
      v_listing_id,
      input_column.column_name,
      input_column.display_order,
      input_column.original_data_type,
      input_column.cast_data_type
    from jsonb_to_recordset(v_item -> 'relation_columns') as input_column (
      column_name text,
      display_order integer,
      original_data_type text,
      cast_data_type public.datasets__duckdb_data_type
    );

    return next v_listing_id;
  end loop;
end;
$$ language plpgsql volatile security invoker
set
  search_path = '';

-- `service_role` only: pipelines write the catalog with the service role key.
revoke
execute on function public.rpc_data_catalog_listings__upsert_with_relation_columns (jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_data_catalog_listings__upsert_with_relation_columns (jsonb) to service_role;
