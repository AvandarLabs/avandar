drop function if exists "public"."data_catalog_listings__search_matches"(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean);

drop function if exists "public"."rpc_data_catalog_listings__search"(p_query text, p_limit integer, p_offset integer, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_sort_by text);

-- `search_vector` reads `external_organization_name`, which blocks the rename
-- below. It is rebuilt after the new columns exist. The search functions
-- dropped above read both, and are recreated below against the new names.
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

CREATE OR REPLACE FUNCTION public.data_catalog_listings__search_matches(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean)
 RETURNS TABLE(id uuid, display_name text, organization1_name text, pipeline_name text, is_workspace_loadable boolean, is_invalid boolean, file_format text, last_updated_at timestamp with time zone, score real, passes_source boolean, passes_format boolean, passes_updated boolean, passes_loadable boolean)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
 SET "pg_trgm.word_similarity_threshold" TO '0.5'
AS $function$
declare
  v_query text := nullif(btrim(p_query), '');
  v_sources text[] := coalesce(p_sources, '{}');
  v_formats text[] := coalesce(p_formats, '{}');
  v_updated_within text := coalesce(p_updated_within, 'any');
  v_is_loadable_only boolean := coalesce(p_is_loadable_only, false);
  v_ts_query tsquery;
begin
  if v_updated_within not in ('any', 'past_month', 'past_year', 'over_a_year') then
    raise exception 'Unknown catalog update window: %', p_updated_within
    using
      errcode = '22023';
  end if;

  if v_query is not null then
    v_ts_query := websearch_to_tsquery('english'::regconfig, v_query);
  end if;

  return query
  with
    matched as (
      select
        listing.id,
        listing.display_name,
        listing.organization1_name,
        listing.pipeline_name,
        listing.is_workspace_loadable,
        listing.is_invalid,
        case
          when listing.api_resource_format is not null then upper(listing.api_resource_format)
          when listing.parquet_file_name is not null then 'PARQUET'
        end as file_format,
        coalesce(listing.date_of_last_update, listing.date_of_last_sync) as last_updated_at,
        case
          when v_query is null then 0::real
          else ts_rank(listing.search_vector, v_ts_query) + extensions.word_similarity(v_query, listing.display_name)
        end as score
      from
        public.data_catalog_listings listing
      where
        v_query is null or
        listing.search_vector @@ v_ts_query or
        v_query operator(extensions.<%) listing.display_name
    )
  select
    matched.id,
    matched.display_name,
    matched.organization1_name,
    matched.pipeline_name,
    matched.is_workspace_loadable,
    matched.is_invalid,
    matched.file_format,
    matched.last_updated_at,
    matched.score,
    cardinality(v_sources) = 0 or
    matched.organization1_name = any (v_sources),
    cardinality(v_formats) = 0 or
    coalesce(matched.file_format = any (v_formats), false),
    public.data_catalog_listings__is_updated_within (matched.last_updated_at, v_updated_within),
    not v_is_loadable_only or
    not matched.is_invalid
  from
    matched;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_data_catalog_listings__search(p_query text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_sources text[] DEFAULT '{}'::text[], p_formats text[] DEFAULT '{}'::text[], p_updated_within text DEFAULT 'any'::text, p_is_loadable_only boolean DEFAULT false, p_sort_by text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, display_name text, organization1_name text, pipeline_name text, is_workspace_loadable boolean, is_invalid boolean, file_format text, last_updated_at timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_sort_by text := coalesce(
    p_sort_by,
    case
      when nullif(btrim(p_query), '') is null then 'name'
      else 'relevance'
    end
  );
begin
  if v_sort_by not in ('relevance', 'updated', 'name') then
    raise exception 'Unknown catalog sort: %', p_sort_by
    using
      errcode = '22023';
  end if;

  return query
  select
    match.id,
    match.display_name,
    match.organization1_name,
    match.pipeline_name,
    match.is_workspace_loadable,
    match.is_invalid,
    match.file_format,
    match.last_updated_at,
    count(*) over ()
  from
    public.data_catalog_listings__search_matches (
      p_query,
      p_sources,
      p_formats,
      p_updated_within,
      p_is_loadable_only
    ) match
  where
    match.passes_source and
    match.passes_format and
    match.passes_updated and
    match.passes_loadable
  order by
    case
      when v_sort_by = 'relevance' then match.score
    end desc nulls last,
    case
      when v_sort_by = 'updated' then match.last_updated_at
    end desc nulls last,
    match.display_name,
    match.id
  limit
    v_limit
  offset
    v_offset;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_data_catalog_listings__search_facets(p_query text, p_sources text[] DEFAULT '{}'::text[], p_formats text[] DEFAULT '{}'::text[], p_updated_within text DEFAULT 'any'::text, p_is_loadable_only boolean DEFAULT false)
 RETURNS TABLE(facet text, value text, listing_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with
    match as (
      select
        *
      from
        public.data_catalog_listings__search_matches (
          p_query,
          p_sources,
          p_formats,
          p_updated_within,
          p_is_loadable_only
        )
    ),
    facet_counts as (
      select
        'source' as facet,
        match.organization1_name as value,
        count(*) as listing_count
      from
        match
      where
        match.passes_format and
        match.passes_updated and
        match.passes_loadable
      group by
        match.organization1_name
      union all
      select
        'source',
        chosen.value,
        0
      from
        unnest(coalesce(p_sources, '{}')) as chosen (value)
      union all
      select
        'format',
        match.file_format,
        count(*)
      from
        match
      where
        match.file_format is not null and
        match.passes_source and
        match.passes_updated and
        match.passes_loadable
      group by
        match.file_format
      union all
      select
        'format',
        chosen.value,
        0
      from
        unnest(coalesce(p_formats, '{}')) as chosen (value)
      union all
      select
        'updated_within',
        update_window.name,
        count(match.id)
      from
        unnest(array['any', 'past_month', 'past_year', 'over_a_year']) as update_window (name)
        left join match on match.passes_source and
        match.passes_format and
        match.passes_loadable and
        public.data_catalog_listings__is_updated_within (match.last_updated_at, update_window.name)
      group by
        update_window.name
      union all
      select
        'unloadable',
        null,
        count(*)
      from
        match
      where
        match.is_invalid and
        match.passes_source and
        match.passes_format and
        match.passes_updated
      union all
      select
        'catalog',
        null,
        count(*)
      from
        public.data_catalog_listings
    )
  select
    facet_counts.facet,
    facet_counts.value,
    max(facet_counts.listing_count) as listing_count
  from
    facet_counts
  group by
    facet_counts.facet,
    facet_counts.value
  order by
    facet_counts.facet,
    max(facet_counts.listing_count) desc,
    facet_counts.value;
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
revoke all privileges on function public.data_catalog_listings__search_matches(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean) from public, anon, authenticated, service_role;
grant EXECUTE on function public.data_catalog_listings__search_matches(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean) to "authenticated";
revoke all privileges on function public.rpc_data_catalog_listings__search(p_query text, p_limit integer, p_offset integer, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_sort_by text) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_data_catalog_listings__search(p_query text, p_limit integer, p_offset integer, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_sort_by text) to "authenticated";
revoke all privileges on function public.util__text_array_to_text(p_values text[]) from public, anon, authenticated, service_role;
grant EXECUTE on function public.util__text_array_to_text(p_values text[]) to "authenticated";
grant EXECUTE on function public.util__text_array_to_text(p_values text[]) to "service_role";
