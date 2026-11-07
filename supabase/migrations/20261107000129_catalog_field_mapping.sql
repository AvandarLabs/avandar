drop function if exists "public"."rpc_data_catalog_listings__search"(p_query text, p_limit integer, p_offset integer);

-- `search_vector` reads `external_organization_name`, which blocks the rename
-- below. It is rebuilt after the new columns exist.
drop index if exists "public"."data_catalog_listings__search_vector";

alter table "public"."data_catalog_listings" drop column if exists "search_vector";

-- A rename, not a drop and an add, so every listing keeps its organization.
alter table "public"."data_catalog_listings" rename column "external_organization_name" to "organization1_name";

  create table "public"."data_catalog_drives" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "pipeline_name" text not null,
    "drive_key" text not null,
    "organization1_label" text,
    "organization2_label" text,
    "organization3_label" text,
    "organization4_label" text
      );


alter table "public"."data_catalog_drives" enable row level security;


alter table "public"."data_catalog_listings" add column "domains" text[];

alter table "public"."data_catalog_listings" add column "drive_id" uuid;


alter table "public"."data_catalog_listings" add column "organization2_name" text;

alter table "public"."data_catalog_listings" add column "organization3_name" text;

alter table "public"."data_catalog_listings" add column "organization4_name" text;

alter table "public"."data_catalog_listings" add column "source_metadata" jsonb;

alter table "public"."data_catalog_listings" add column "tags" text[];

-- `search_vector` reads the new columns, so it is added back once they and
-- the function it calls exist. Postgres 15 cannot change a generated
-- column's expression in place.
CREATE OR REPLACE FUNCTION public.util__text_array_to_text(p_values text[])
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select coalesce(array_to_string(p_values, ' '), '');
$function$
;

alter table "public"."data_catalog_listings" add column "search_vector" tsvector generated always as (((setweight(to_tsvector('english'::regconfig, COALESCE(display_name, ''::text)), 'A'::"char") || setweight(to_tsvector('english'::regconfig, ((((((((((((((COALESCE(organization1_name, ''::text) || ' '::text) || COALESCE(organization2_name, ''::text)) || ' '::text) || COALESCE(organization3_name, ''::text)) || ' '::text) || COALESCE(organization4_name, ''::text)) || ' '::text) || public.util__text_array_to_text(domains)) || ' '::text) || public.util__text_array_to_text(tags)) || ' '::text) || COALESCE(external_service_name, ''::text)) || ' '::text) || COALESCE(pipeline_name, ''::text))), 'B'::"char")) || setweight(to_tsvector('english'::regconfig, ((COALESCE(description, ''::text) || ' '::text) || COALESCE(notes, ''::text))), 'C'::"char"))) stored;

CREATE INDEX data_catalog_listings__search_vector ON public.data_catalog_listings USING gin (search_vector);


CREATE UNIQUE INDEX data_catalog_drives__pipeline_drive_unique ON public.data_catalog_drives USING btree (pipeline_name, drive_key);

CREATE UNIQUE INDEX data_catalog_drives_pkey ON public.data_catalog_drives USING btree (id);

CREATE INDEX data_catalog_listings__domains ON public.data_catalog_listings USING gin (domains);

CREATE INDEX data_catalog_listings__drive_id ON public.data_catalog_listings USING btree (drive_id);

CREATE INDEX data_catalog_listings__organization_levels ON public.data_catalog_listings USING btree (organization1_name, organization2_name);

CREATE INDEX data_catalog_listings__tags ON public.data_catalog_listings USING gin (tags);

alter table "public"."data_catalog_drives" add constraint "data_catalog_drives_pkey" PRIMARY KEY using index "data_catalog_drives_pkey";

alter table "public"."data_catalog_drives" add constraint "data_catalog_drives__pipeline_drive_unique" UNIQUE using index "data_catalog_drives__pipeline_drive_unique";

alter table "public"."data_catalog_listings" add constraint "data_catalog_listings_drive_id_fkey" FOREIGN KEY (drive_id) REFERENCES public.data_catalog_drives(id) ON DELETE SET NULL not valid;

alter table "public"."data_catalog_listings" validate constraint "data_catalog_listings_drive_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_data_catalog_listings__search(p_query text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_organization1_names text[] DEFAULT NULL::text[], p_organization2_names text[] DEFAULT NULL::text[], p_domains text[] DEFAULT NULL::text[], p_tags text[] DEFAULT NULL::text[])
 RETURNS TABLE(id uuid, display_name text, organization1_name text, organization2_name text, organization3_name text, organization4_name text, is_workspace_loadable boolean, is_invalid boolean, total_count bigint)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
 SET "pg_trgm.word_similarity_threshold" TO '0.5'
AS $function$
declare
  v_query text := nullif(btrim(p_query), '');
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_organization1_names text[] := nullif(p_organization1_names, '{}'::text[]);
  v_organization2_names text[] := nullif(p_organization2_names, '{}'::text[]);
  v_domains text[] := nullif(p_domains, '{}'::text[]);
  v_tags text[] := nullif(p_tags, '{}'::text[]);
  v_ts_query tsquery;
begin
  if v_query is null then
    return query
    select
      listing.id,
      listing.display_name,
      listing.organization1_name,
      listing.organization2_name,
      listing.organization3_name,
      listing.organization4_name,
      listing.is_workspace_loadable,
      listing.is_invalid,
      count(*) over ()
    from public.data_catalog_listings listing
    where
      (v_organization1_names is null or listing.organization1_name = any (v_organization1_names)) and
      (v_organization2_names is null or listing.organization2_name = any (v_organization2_names)) and
      (v_domains is null or listing.domains && v_domains) and
      (v_tags is null or listing.tags && v_tags)
    order by listing.display_name, listing.id
    limit v_limit
    offset v_offset;
    return;
  end if;

  v_ts_query := websearch_to_tsquery('english'::regconfig, v_query);

  return query
  select
    listing.id,
    listing.display_name,
    listing.organization1_name,
    listing.organization2_name,
    listing.organization3_name,
    listing.organization4_name,
    listing.is_workspace_loadable,
    listing.is_invalid,
    count(*) over ()
  from public.data_catalog_listings listing
  where
    (
      listing.search_vector @@ v_ts_query or
      v_query operator(extensions.<%) listing.display_name
    ) and
    (v_organization1_names is null or listing.organization1_name = any (v_organization1_names)) and
    (v_organization2_names is null or listing.organization2_name = any (v_organization2_names)) and
    (v_domains is null or listing.domains && v_domains) and
    (v_tags is null or listing.tags && v_tags)
  order by
    ts_rank(listing.search_vector, v_ts_query) +
    extensions.word_similarity(v_query, listing.display_name) desc,
    listing.display_name,
    listing.id
  limit v_limit
  offset v_offset;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_data_catalog_listings__search_facets(p_query text, p_organization1_names text[] DEFAULT NULL::text[], p_organization2_names text[] DEFAULT NULL::text[], p_domains text[] DEFAULT NULL::text[], p_tags text[] DEFAULT NULL::text[])
 RETURNS TABLE(facet text, value text, listing_count bigint)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
 SET "pg_trgm.word_similarity_threshold" TO '0.5'
AS $function$
declare
  v_query text := nullif(btrim(p_query), '');
  v_organization1_names text[] := nullif(p_organization1_names, '{}'::text[]);
  v_organization2_names text[] := nullif(p_organization2_names, '{}'::text[]);
  v_domains text[] := nullif(p_domains, '{}'::text[]);
  v_tags text[] := nullif(p_tags, '{}'::text[]);
  v_ts_query tsquery;
begin
  if v_query is not null then
    v_ts_query := websearch_to_tsquery('english'::regconfig, v_query);
  end if;

  return query
  with matched as (
    select
      listing.organization1_name as organization1_name,
      listing.organization2_name as organization2_name,
      listing.domains as domains,
      listing.tags as tags,
      listing.drive_id as drive_id
    from public.data_catalog_listings listing
    where
      v_query is null or
      listing.search_vector @@ v_ts_query or
      v_query operator(extensions.<%) listing.display_name
  ),
  organization1_counts as (
    select
      'organization1'::text as facet_name,
      matched.organization1_name as facet_value,
      count(*) as facet_count
    from matched
    where
      (v_organization2_names is null or matched.organization2_name = any (v_organization2_names)) and
      (v_domains is null or matched.domains && v_domains) and
      (v_tags is null or matched.tags && v_tags)
    group by matched.organization1_name
    order by 3 desc, 2
    limit 100
  ),
  organization2_listings as (
    select matched.organization2_name, matched.drive_id
    from matched
    where
      matched.organization2_name is not null and
      (v_organization1_names is null or matched.organization1_name = any (v_organization1_names)) and
      (v_domains is null or matched.domains && v_domains) and
      (v_tags is null or matched.tags && v_tags)
  ),
  organization2_counts as (
    select
      'organization2'::text as facet_name,
      organization2_listings.organization2_name as facet_value,
      count(*) as facet_count
    from organization2_listings
    group by organization2_listings.organization2_name
    order by 3 desc, 2
    limit 100
  ),
  organization2_label_counts as (
    select
      'organization2_label'::text as facet_name,
      drive.organization2_label as facet_value,
      count(*) as facet_count
    from organization2_listings
    join public.data_catalog_drives drive on drive.id = organization2_listings.drive_id
    where drive.organization2_label is not null
    group by drive.organization2_label
    order by 3 desc, 2
    limit 100
  ),
  domain_counts as (
    select
      'domain'::text as facet_name,
      listing_domain.domain_value as facet_value,
      count(*) as facet_count
    from matched
    cross join lateral unnest(matched.domains) as listing_domain (domain_value)
    where
      (v_organization1_names is null or matched.organization1_name = any (v_organization1_names)) and
      (v_organization2_names is null or matched.organization2_name = any (v_organization2_names)) and
      (v_tags is null or matched.tags && v_tags)
    group by listing_domain.domain_value
    order by 3 desc, 2
    limit 100
  )
  select * from organization1_counts
  union all
  select * from organization2_counts
  union all
  select * from organization2_label_counts
  union all
  select * from domain_counts;
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
      source_metadata,
      drive_id
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
      v_input.source_metadata,
      v_input.drive_id
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
      source_metadata = excluded.source_metadata,
      drive_id = excluded.drive_id
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

grant select on table "public"."data_catalog_drives" to "authenticated";

grant delete on table "public"."data_catalog_drives" to "service_role";

grant insert on table "public"."data_catalog_drives" to "service_role";

grant select on table "public"."data_catalog_drives" to "service_role";

grant update on table "public"."data_catalog_drives" to "service_role";


  create policy "User can select open data catalog drives"
  on "public"."data_catalog_drives"
  as permissive
  for select
  to authenticated
using (true);


CREATE TRIGGER tr__data_catalog_drives__set_updated_at BEFORE UPDATE ON public.data_catalog_drives FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();



-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.rpc_data_catalog_listings__search_facets(p_query text, p_organization1_names text[], p_organization2_names text[], p_domains text[], p_tags text[]) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_data_catalog_listings__search_facets(p_query text, p_organization1_names text[], p_organization2_names text[], p_domains text[], p_tags text[]) to "authenticated";
revoke all privileges on function public.rpc_data_catalog_listings__search(p_query text, p_limit integer, p_offset integer, p_organization1_names text[], p_organization2_names text[], p_domains text[], p_tags text[]) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_data_catalog_listings__search(p_query text, p_limit integer, p_offset integer, p_organization1_names text[], p_organization2_names text[], p_domains text[], p_tags text[]) to "authenticated";
revoke all privileges on function public.util__text_array_to_text(p_values text[]) from public, anon, authenticated, service_role;
grant EXECUTE on function public.util__text_array_to_text(p_values text[]) to "authenticated";
grant EXECUTE on function public.util__text_array_to_text(p_values text[]) to "service_role";
