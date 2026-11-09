-- The catalog the way production holds it before organization levels: the
-- listings table with `external_organization_name` and none of the new
-- columns, no drives table, the search column and its index from
-- `20261106223031_add_catalog_listing_search`, and the filtered search from
-- `20261106235455_add_catalog_listing_search_filters`: the match function,
-- the eight-argument search RPC, and the five-argument facets RPC, all
-- reading `external_organization_name`. Then a listing of each kind, which
-- the migration must keep. The identifiers are `pgtap-fixture`-prefixed.
begin;

-- What this migration builds, removed first: the search column that reads
-- the new columns and the function it calls, and the search functions that
-- read `organization1_name`. The search functions are dropped by the
-- signatures the fully migrated database has, which
-- `20261107180100_catalog_search_organization_filters` widened with the
-- level-2 organization, topic, and keyword filters, and
-- `20261109065256_catalog_scalable_search` widened with a sort, a page, and
-- a count cap.
alter table public.data_catalog_listings drop column search_vector;

-- `20261109020622_catalog_additional_source_metadata` changed the upsert's
-- return type, which the migration's `create or replace` cannot change
-- back, and replaced `source_metadata` with `additional_source_metadata`,
-- which is dropped with the other new columns below.
drop function public.rpc_data_catalog_listings__upsert_with_relation_columns (jsonb);

drop function public.util__text_array_to_text (text[]);

drop function public.rpc_data_catalog_listings__search_facets (
  text,
  text[],
  text[],
  text,
  boolean,
  text[],
  text[],
  text[]
);

drop function public.rpc_data_catalog_listings__search (
  text,
  integer,
  integer,
  text[],
  text[],
  text,
  boolean,
  text[],
  text[],
  text[],
  text,
  integer
);

drop function public.data_catalog_listings__search_matches (
  text,
  text[],
  text[],
  text,
  boolean,
  text[],
  text[],
  text[],
  text,
  integer,
  integer
);

alter table public.data_catalog_listings
  drop column drive_id,
  drop column organization2_name,
  drop column organization3_name,
  drop column organization4_name,
  drop column domains,
  drop column tags,
  drop column additional_source_metadata;

drop table public.data_catalog_drives;

alter table public.data_catalog_listings
  rename column organization1_name to external_organization_name;

-- The search column and its index exactly as
-- `20261106223031_add_catalog_listing_search` created them. The column reads
-- `external_organization_name`, so the migration must drop it before the
-- rename.
alter table "public"."data_catalog_listings" add column "search_vector" tsvector generated always as (((setweight(to_tsvector('english'::regconfig, COALESCE(display_name, ''::text)), 'A'::"char") || setweight(to_tsvector('english'::regconfig, ((((COALESCE(external_organization_name, ''::text) || ' '::text) || COALESCE(external_service_name, ''::text)) || ' '::text) || COALESCE(pipeline_name, ''::text))), 'B'::"char")) || setweight(to_tsvector('english'::regconfig, ((COALESCE(description, ''::text) || ' '::text) || COALESCE(notes, ''::text))), 'C'::"char"))) stored;

CREATE INDEX data_catalog_listings__search_vector ON public.data_catalog_listings USING gin (search_vector);

-- The match function and the search and facets RPCs exactly as
-- `20261106235455_add_catalog_listing_search_filters` created them. Each
-- reads `external_organization_name`, so the migration must drop or replace
-- every one of them around the rename.
CREATE OR REPLACE FUNCTION public.data_catalog_listings__search_matches(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean)
 RETURNS TABLE(id uuid, display_name text, external_organization_name text, pipeline_name text, is_workspace_loadable boolean, is_invalid boolean, file_format text, last_updated_at timestamp with time zone, score real, passes_source boolean, passes_format boolean, passes_updated boolean, passes_loadable boolean)
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
        listing.external_organization_name,
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
    matched.external_organization_name,
    matched.pipeline_name,
    matched.is_workspace_loadable,
    matched.is_invalid,
    matched.file_format,
    matched.last_updated_at,
    matched.score,
    cardinality(v_sources) = 0 or
    matched.external_organization_name = any (v_sources),
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
 RETURNS TABLE(id uuid, display_name text, external_organization_name text, pipeline_name text, is_workspace_loadable boolean, is_invalid boolean, file_format text, last_updated_at timestamp with time zone, total_count bigint)
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
    match.external_organization_name,
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
        match.external_organization_name as value,
        count(*) as listing_count
      from
        match
      where
        match.passes_format and
        match.passes_updated and
        match.passes_loadable
      group by
        match.external_organization_name
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

revoke all privileges on function public.data_catalog_listings__search_matches(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean) from public, anon, authenticated, service_role;
grant EXECUTE on function public.data_catalog_listings__search_matches(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean) to "authenticated";
revoke all privileges on function public.rpc_data_catalog_listings__search_facets(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_data_catalog_listings__search_facets(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean) to "authenticated";
revoke all privileges on function public.rpc_data_catalog_listings__search(p_query text, p_limit integer, p_offset integer, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_sort_by text) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_data_catalog_listings__search(p_query text, p_limit integer, p_offset integer, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_sort_by text) to "authenticated";

insert into public.data_catalog_listings
  (display_name, external_organization_name, access_kind, api_service,
   api_base_url, external_dataset_id, api_resource_id, api_resource_format)
values
  ('pgtap-fixture api', 'Pgtap Fixture Rename City', 'api_resource', 'socrata',
   'https://pgtap-fixture.invalid', 'pgtap-fixture-rename',
   'pgtap-fixture-rename', 'CSV');

insert into public.data_catalog_listings
  (display_name, external_organization_name, parquet_file_name,
   pipeline_name, pipeline_run_id)
values
  ('pgtap-fixture parquet', 'Pgtap Fixture Rename Bank', 'pgtap-fixture-rename.parquet',
   'pgtap-fixture-pipeline', 'run-1');
