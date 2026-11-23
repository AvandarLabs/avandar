alter type "public"."data_catalog_listings__api_service" rename to "data_catalog_listings__api_service__old_version_to_be_dropped";

create type "public"."data_catalog_listings__api_service" as enum ('ckan', 'socrata', 'odata');

alter table "public"."data_catalog_listings" alter column api_service type "public"."data_catalog_listings__api_service" using api_service::text::"public"."data_catalog_listings__api_service";

drop type "public"."data_catalog_listings__api_service__old_version_to_be_dropped";

alter table "public"."data_catalog_listings" add column "api_freshness_probe" jsonb;

alter table "public"."data_catalog_listings" add column "companion_listings" jsonb not null default '[]'::jsonb;

alter table "public"."data_catalog_listings" add column "parquet_cache_checked_at" timestamp with time zone;

alter table "public"."data_catalog_listings" add column "parquet_cache_checked_source_version" text;

alter table "public"."data_catalog_listings" add constraint "data_catalog_listings__api_freshness_probe_is_object" CHECK (((api_freshness_probe IS NULL) OR (jsonb_typeof(api_freshness_probe) = 'object'::text))) not valid;

alter table "public"."data_catalog_listings" validate constraint "data_catalog_listings__api_freshness_probe_is_object";

alter table "public"."data_catalog_listings" add constraint "data_catalog_listings__companion_listings_is_array" CHECK ((jsonb_typeof(companion_listings) = 'array'::text)) not valid;

alter table "public"."data_catalog_listings" validate constraint "data_catalog_listings__companion_listings_is_array";

alter table "public"."data_catalog_listings" add constraint "data_catalog_listings__parquet_cache_check_complete" CHECK (((parquet_cache_checked_at IS NULL) = (parquet_cache_checked_source_version IS NULL))) not valid;

alter table "public"."data_catalog_listings" validate constraint "data_catalog_listings__parquet_cache_check_complete";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_data_catalog_listings__get_companions(p_catalog_listing_id uuid, p_workspace_id uuid)
 RETURNS TABLE(catalog_listing_id uuid, display_name text, is_workspace_loadable boolean, is_invalid boolean, kind text, join_on jsonb, is_in_workspace boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select
    companion.id,
    companion.display_name,
    companion.is_workspace_loadable,
    companion.is_invalid,
    member.value ->> 'kind',
    coalesce(member.value -> 'joinOn', '[]'::jsonb),
    exists (
      select 1
      from public.datasets__open_data open_data
      where
        open_data.catalog_listing_id = companion.id and
        open_data.workspace_id = p_workspace_id
    )
  from public.data_catalog_listings listing
  cross join lateral jsonb_array_elements(listing.companion_listings)
    with ordinality as member (value, position)
  join public.data_catalog_listings companion on
    companion.api_service = listing.api_service and
    companion.api_base_url = listing.api_base_url and
    companion.external_dataset_id = member.value ->> 'externalDatasetId' and
    companion.api_resource_id = member.value ->> 'apiResourceId' and
    companion.id <> listing.id
  where listing.id = p_catalog_listing_id
  order by member.position;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_data_catalog_listings__record_freshness_check(p_catalog_listing_id uuid, p_source_version text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if p_catalog_listing_id is null or p_source_version is null then
    raise exception 'rpc_data_catalog_listings__record_freshness_check needs every argument';
  end if;

  update public.data_catalog_listings listing
  set
    parquet_cache_checked_at = now(),
    parquet_cache_checked_source_version = p_source_version
  where listing.id = p_catalog_listing_id;

  return found;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_data_catalog_listings__upsert_with_relation_columns(p_listings jsonb)
 RETURNS SETOF uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_data_catalog_listings__write_parquet_cache(p_catalog_listing_id uuid, p_build_id uuid, p_folder_path text, p_part_count integer, p_source_version text, p_row_count bigint, p_byte_size bigint)
 RETURNS TABLE(is_applied boolean, previous_folder_path text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_previous_folder_path text;
begin
  if
    p_catalog_listing_id is null or
    p_build_id is null or
    p_folder_path is null or
    p_part_count is null or
    p_source_version is null or
    p_row_count is null or
    p_byte_size is null
  then
    raise exception 'rpc_data_catalog_listings__write_parquet_cache needs every argument';
  end if;

  select listing.parquet_cache_folder_path into v_previous_folder_path
  from public.data_catalog_listings listing
  where
    listing.id = p_catalog_listing_id and
    listing.parquet_cache_build_id = p_build_id
  for update;

  if not found then
    return query select false, null::text;
    return;
  end if;

  update public.data_catalog_listings listing
  set
    parquet_cache_status = 'ready',
    parquet_cache_build_id = null,
    parquet_cache_failure_code = null,
    parquet_cache_folder_path = p_folder_path,
    parquet_cache_part_count = p_part_count,
    parquet_cache_source_version = p_source_version,
    parquet_cache_built_at = now(),
    parquet_cache_row_count = p_row_count,
    parquet_cache_byte_size = p_byte_size,
    parquet_cache_checked_at = now(),
    parquet_cache_checked_source_version = p_source_version
  where listing.id = p_catalog_listing_id;

  return query select
    true,
    case
      when v_previous_folder_path is distinct from p_folder_path then v_previous_folder_path
    end;
end;
$function$
;



-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.rpc_data_catalog_listings__get_companions(p_catalog_listing_id uuid, p_workspace_id uuid) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_data_catalog_listings__get_companions(p_catalog_listing_id uuid, p_workspace_id uuid) to "authenticated";
grant EXECUTE on function public.rpc_data_catalog_listings__get_companions(p_catalog_listing_id uuid, p_workspace_id uuid) to "service_role";
revoke all privileges on function public.rpc_data_catalog_listings__record_freshness_check(p_catalog_listing_id uuid, p_source_version text) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_data_catalog_listings__record_freshness_check(p_catalog_listing_id uuid, p_source_version text) to "service_role";
