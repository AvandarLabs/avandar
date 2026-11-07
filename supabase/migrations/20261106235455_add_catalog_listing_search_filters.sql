drop function if exists "public"."rpc_data_catalog_listings__search"(p_query text, p_limit integer, p_offset integer);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.data_catalog_listings__is_updated_within(p_last_updated_at timestamp with time zone, p_updated_within text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select
    case p_updated_within
      when 'any' then true
      when 'past_month' then
        coalesce(p_last_updated_at >= now() - interval '31 days', false)
      when 'past_year' then
        coalesce(p_last_updated_at >= now() - interval '365 days', false)
      when 'over_a_year' then
        coalesce(p_last_updated_at < now() - interval '365 days', false)
      else false
    end;
$function$
;

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


-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.data_catalog_listings__is_updated_within(p_last_updated_at timestamp with time zone, p_updated_within text) from public, anon, authenticated, service_role;
grant EXECUTE on function public.data_catalog_listings__is_updated_within(p_last_updated_at timestamp with time zone, p_updated_within text) to "authenticated";
revoke all privileges on function public.data_catalog_listings__search_matches(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean) from public, anon, authenticated, service_role;
grant EXECUTE on function public.data_catalog_listings__search_matches(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean) to "authenticated";
revoke all privileges on function public.rpc_data_catalog_listings__search_facets(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_data_catalog_listings__search_facets(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean) to "authenticated";
revoke all privileges on function public.rpc_data_catalog_listings__search(p_query text, p_limit integer, p_offset integer, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_sort_by text) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_data_catalog_listings__search(p_query text, p_limit integer, p_offset integer, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_sort_by text) to "authenticated";
