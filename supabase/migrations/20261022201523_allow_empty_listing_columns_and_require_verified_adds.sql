set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.datasets__open_data__assert_listing_column_types_verified()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if exists (
    select 1
    from public.data_catalog_listings listing
    where
      listing.id = new.catalog_listing_id and
      listing.date_column_type_last_verified is null
  ) then
    raise exception 'Catalog listing % has unverified column types, so it cannot be added to a workspace yet', new.catalog_listing_id;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_data_catalog_listings__upsert_with_relation_columns(p_listings jsonb)
 RETURNS SETOF public.data_catalog_listings
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_item jsonb;
  v_input public.data_catalog_listings;
  v_stored public.data_catalog_listings;
  v_listing public.data_catalog_listings;
  v_is_keeping_stored_columns boolean;
  v_written_ids uuid[] := '{}';
begin
  if p_listings is null or jsonb_typeof(p_listings) <> 'array' then
    raise exception 'rpc_data_catalog_listings__upsert_with_relation_columns needs a JSON array of listings';
  end if;

  for v_item in select value from jsonb_array_elements(p_listings) loop
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
      external_organization_name,
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
      date_column_type_last_verified
    ) values (
      coalesce(v_input.id, gen_random_uuid()),
      v_input.access_kind,
      v_input.pipeline_name,
      v_input.pipeline_run_id,
      v_input.display_name,
      v_input.external_organization_name,
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
      v_input.date_column_type_last_verified
    )
    on conflict (id) do update set
      access_kind = excluded.access_kind,
      pipeline_name = excluded.pipeline_name,
      pipeline_run_id = excluded.pipeline_run_id,
      display_name = excluded.display_name,
      external_organization_name = excluded.external_organization_name,
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
      date_column_type_last_verified = excluded.date_column_type_last_verified
    returning * into v_listing;

    v_written_ids := v_written_ids || v_listing.id;

    if v_is_keeping_stored_columns then
      return next v_listing;
      continue;
    end if;

    delete from public.data_catalog_listings__relation_columns relation_column
    where relation_column.catalog_listing_id = v_listing.id;

    insert into public.data_catalog_listings__relation_columns (
      catalog_listing_id,
      column_name,
      display_order,
      original_data_type,
      cast_data_type
    )
    select
      v_listing.id,
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

    return next v_listing;
  end loop;
end;
$function$
;

CREATE TRIGGER tr_datasets__open_data__assert_listing_column_types_verified BEFORE INSERT OR UPDATE OF catalog_listing_id ON public.datasets__open_data FOR EACH ROW EXECUTE FUNCTION public.datasets__open_data__assert_listing_column_types_verified();



-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.datasets__open_data__assert_listing_column_types_verified() from public, anon, authenticated, service_role;
