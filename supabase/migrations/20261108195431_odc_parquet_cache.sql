create type "public"."data_catalog_listings__parquet_cache_status" as enum ('building', 'ready', 'failed');

alter table "public"."data_catalog_listings" drop constraint "data_catalog_listings__pipeline_access_complete";

alter table "public"."data_catalog_listings" add column "parquet_cache_build_id" uuid;

alter table "public"."data_catalog_listings" add column "parquet_cache_build_started_at" timestamp with time zone;

alter table "public"."data_catalog_listings" add column "parquet_cache_built_at" timestamp with time zone;

alter table "public"."data_catalog_listings" add column "parquet_cache_byte_size" bigint;

alter table "public"."data_catalog_listings" add column "parquet_cache_failure_code" text;

alter table "public"."data_catalog_listings" add column "parquet_cache_folder_path" text;

alter table "public"."data_catalog_listings" add column "parquet_cache_part_count" integer;

alter table "public"."data_catalog_listings" add column "parquet_cache_row_count" bigint;

alter table "public"."data_catalog_listings" add column "parquet_cache_source_version" text;

alter table "public"."data_catalog_listings" add column "parquet_cache_status" public.data_catalog_listings__parquet_cache_status;

alter table "public"."data_catalog_listings" add constraint "data_catalog_listings__parquet_cache_copy_complete" CHECK ((((parquet_cache_folder_path IS NULL) AND (parquet_cache_part_count IS NULL) AND (parquet_cache_source_version IS NULL) AND (parquet_cache_built_at IS NULL) AND (parquet_cache_row_count IS NULL) AND (parquet_cache_byte_size IS NULL)) OR ((parquet_cache_folder_path IS NOT NULL) AND (parquet_cache_part_count > 0) AND (parquet_cache_source_version IS NOT NULL) AND (parquet_cache_built_at IS NOT NULL) AND (parquet_cache_row_count IS NOT NULL) AND (parquet_cache_byte_size IS NOT NULL)))) not valid;

alter table "public"."data_catalog_listings" validate constraint "data_catalog_listings__parquet_cache_copy_complete";

alter table "public"."data_catalog_listings" add constraint "data_catalog_listings__parquet_cache_status_complete" CHECK ((((parquet_cache_status IS NULL) AND (parquet_cache_build_id IS NULL) AND (parquet_cache_build_started_at IS NULL) AND (parquet_cache_failure_code IS NULL) AND (parquet_cache_folder_path IS NULL)) OR ((parquet_cache_status = 'building'::public.data_catalog_listings__parquet_cache_status) AND (parquet_cache_build_id IS NOT NULL) AND (parquet_cache_build_started_at IS NOT NULL) AND (parquet_cache_failure_code IS NULL)) OR ((parquet_cache_status = 'ready'::public.data_catalog_listings__parquet_cache_status) AND (parquet_cache_build_id IS NULL) AND (parquet_cache_folder_path IS NOT NULL) AND (parquet_cache_failure_code IS NULL)) OR ((parquet_cache_status = 'failed'::public.data_catalog_listings__parquet_cache_status) AND (parquet_cache_build_id IS NULL) AND (parquet_cache_failure_code IS NOT NULL)))) not valid;

alter table "public"."data_catalog_listings" validate constraint "data_catalog_listings__parquet_cache_status_complete";

alter table "public"."data_catalog_listings" add constraint "data_catalog_listings__pipeline_access_complete" CHECK (((access_kind <> 'pipeline_parquet'::public.data_catalog_listings__access_kind) OR ((parquet_file_name IS NOT NULL) AND (pipeline_name IS NOT NULL) AND (pipeline_run_id IS NOT NULL) AND (api_service IS NULL) AND (api_base_url IS NULL) AND (api_resource_id IS NULL) AND (api_resource_format IS NULL) AND (cached_object_path IS NULL) AND (cached_source_version IS NULL) AND (cached_at IS NULL) AND (parquet_cache_status IS NULL) AND (parquet_cache_folder_path IS NULL)))) not valid;

alter table "public"."data_catalog_listings" validate constraint "data_catalog_listings__pipeline_access_complete";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_data_catalog_listings__fail_parquet_cache(p_catalog_listing_id uuid, p_build_id uuid, p_failure_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if p_catalog_listing_id is null or p_build_id is null or p_failure_code is null then
    raise exception 'rpc_data_catalog_listings__fail_parquet_cache needs every argument';
  end if;

  update public.data_catalog_listings listing
  set
    parquet_cache_status = 'failed',
    parquet_cache_build_id = null,
    parquet_cache_failure_code = p_failure_code
  where
    listing.id = p_catalog_listing_id and
    listing.parquet_cache_build_id = p_build_id;

  return found;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_data_catalog_listings__request_parquet_cache(p_catalog_listing_id uuid, p_lost_build_after interval)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_listing public.data_catalog_listings;
  v_build_id uuid;
begin
  if p_catalog_listing_id is null or p_lost_build_after is null then
    raise exception 'rpc_data_catalog_listings__request_parquet_cache needs a listing id and a lost build interval';
  end if;

  select listing.* into v_listing
  from public.data_catalog_listings listing
  where listing.id = p_catalog_listing_id
  for update;

  if v_listing.id is null then
    raise exception 'Catalog listing % does not exist', p_catalog_listing_id;
  end if;

  if v_listing.access_kind <> 'api_resource' then
    raise exception 'Catalog listing % is not API-backed, so it has no Parquet copy to build',
      p_catalog_listing_id;
  end if;

  -- `clock_timestamp`, not `now`: a claim and a lost-build reclaim in one
  -- transaction must still see time pass.
  if
    v_listing.parquet_cache_status = 'building' and
    v_listing.parquet_cache_build_started_at > clock_timestamp() - p_lost_build_after
  then
    return null;
  end if;

  v_build_id := gen_random_uuid();

  update public.data_catalog_listings listing
  set
    parquet_cache_status = 'building',
    parquet_cache_build_id = v_build_id,
    parquet_cache_build_started_at = clock_timestamp(),
    parquet_cache_failure_code = null
  where listing.id = p_catalog_listing_id;

  return v_build_id;
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
    parquet_cache_byte_size = p_byte_size
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
revoke all privileges on function public.rpc_data_catalog_listings__fail_parquet_cache(p_catalog_listing_id uuid, p_build_id uuid, p_failure_code text) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_data_catalog_listings__fail_parquet_cache(p_catalog_listing_id uuid, p_build_id uuid, p_failure_code text) to "service_role";
revoke all privileges on function public.rpc_data_catalog_listings__request_parquet_cache(p_catalog_listing_id uuid, p_lost_build_after interval) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_data_catalog_listings__request_parquet_cache(p_catalog_listing_id uuid, p_lost_build_after interval) to "service_role";
revoke all privileges on function public.rpc_data_catalog_listings__write_parquet_cache(p_catalog_listing_id uuid, p_build_id uuid, p_folder_path text, p_part_count integer, p_source_version text, p_row_count bigint, p_byte_size bigint) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_data_catalog_listings__write_parquet_cache(p_catalog_listing_id uuid, p_build_id uuid, p_folder_path text, p_part_count integer, p_source_version text, p_row_count bigint, p_byte_size bigint) to "service_role";
