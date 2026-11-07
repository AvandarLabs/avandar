-- Load pg_trgm into this session before a function below sets
-- `pg_trgm.word_similarity_threshold`. Until the library is loaded the
-- parameter is an unknown placeholder, and only a superuser may attach one to
-- a function, which the hosted `postgres` role is not. Calling any pg_trgm
-- function loads it and registers the parameter as user-settable.
do $$
begin
  perform extensions.word_similarity('', '');
end
$$;

drop function if exists "public"."data_catalog_listings__search_matches"(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean);

drop function if exists "public"."rpc_data_catalog_listings__search"(p_query text, p_limit integer, p_offset integer, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_sort_by text);

drop function if exists "public"."rpc_data_catalog_listings__search_facets"(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.data_catalog_listings__search_matches(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[])
 RETURNS TABLE(id uuid, display_name text, organization1_name text, organization2_name text, organization3_name text, organization4_name text, pipeline_name text, is_workspace_loadable boolean, is_invalid boolean, file_format text, last_updated_at timestamp with time zone, domains text[], tags text[], drive_id uuid, score real, passes_source boolean, passes_format boolean, passes_updated boolean, passes_loadable boolean, passes_organization2 boolean, passes_domain boolean, passes_tag boolean)
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
  v_organization2_names text[] := coalesce(p_organization2_names, '{}');
  v_domains text[] := coalesce(p_domains, '{}');
  v_tags text[] := coalesce(p_tags, '{}');
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
        listing.organization2_name,
        listing.organization3_name,
        listing.organization4_name,
        listing.pipeline_name,
        listing.is_workspace_loadable,
        listing.is_invalid,
        case
          when listing.api_resource_format is not null then upper(listing.api_resource_format)
          when listing.parquet_file_name is not null then 'PARQUET'
        end as file_format,
        coalesce(listing.date_of_last_update, listing.date_of_last_sync) as last_updated_at,
        listing.domains,
        listing.tags,
        listing.drive_id,
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
    matched.organization2_name,
    matched.organization3_name,
    matched.organization4_name,
    matched.pipeline_name,
    matched.is_workspace_loadable,
    matched.is_invalid,
    matched.file_format,
    matched.last_updated_at,
    matched.domains,
    matched.tags,
    matched.drive_id,
    matched.score,
    cardinality(v_sources) = 0 or
    matched.organization1_name = any (v_sources),
    cardinality(v_formats) = 0 or
    coalesce(matched.file_format = any (v_formats), false),
    public.data_catalog_listings__is_updated_within (matched.last_updated_at, v_updated_within),
    not v_is_loadable_only or
    not matched.is_invalid,
    cardinality(v_organization2_names) = 0 or
    coalesce(matched.organization2_name = any (v_organization2_names), false),
    cardinality(v_domains) = 0 or
    coalesce(matched.domains && v_domains, false),
    cardinality(v_tags) = 0 or
    coalesce(matched.tags && v_tags, false)
  from
    matched;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_data_catalog_listings__search(p_query text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_sources text[] DEFAULT '{}'::text[], p_formats text[] DEFAULT '{}'::text[], p_updated_within text DEFAULT 'any'::text, p_is_loadable_only boolean DEFAULT false, p_organization2_names text[] DEFAULT '{}'::text[], p_domains text[] DEFAULT '{}'::text[], p_tags text[] DEFAULT '{}'::text[], p_sort_by text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, display_name text, organization1_name text, organization2_name text, organization3_name text, organization4_name text, pipeline_name text, is_workspace_loadable boolean, is_invalid boolean, file_format text, last_updated_at timestamp with time zone, total_count bigint)
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
    match.organization2_name,
    match.organization3_name,
    match.organization4_name,
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
      p_is_loadable_only,
      p_organization2_names,
      p_domains,
      p_tags
    ) match
  where
    match.passes_source and
    match.passes_format and
    match.passes_updated and
    match.passes_loadable and
    match.passes_organization2 and
    match.passes_domain and
    match.passes_tag
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

CREATE OR REPLACE FUNCTION public.rpc_data_catalog_listings__search_facets(p_query text, p_sources text[] DEFAULT '{}'::text[], p_formats text[] DEFAULT '{}'::text[], p_updated_within text DEFAULT 'any'::text, p_is_loadable_only boolean DEFAULT false, p_organization2_names text[] DEFAULT '{}'::text[], p_domains text[] DEFAULT '{}'::text[], p_tags text[] DEFAULT '{}'::text[])
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
          p_is_loadable_only,
          p_organization2_names,
          p_domains,
          p_tags
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
        match.passes_loadable and
        match.passes_organization2 and
        match.passes_domain and
        match.passes_tag
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
        match.passes_loadable and
        match.passes_organization2 and
        match.passes_domain and
        match.passes_tag
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
        'organization2',
        match.organization2_name,
        count(*)
      from
        match
      where
        match.organization2_name is not null and
        match.passes_source and
        match.passes_format and
        match.passes_updated and
        match.passes_loadable and
        match.passes_domain and
        match.passes_tag
      group by
        match.organization2_name
      union all
      select
        'organization2',
        chosen.value,
        0
      from
        unnest(coalesce(p_organization2_names, '{}')) as chosen (value)
      union all
      select
        'organization2_label',
        drive.organization2_label,
        count(*)
      from
        match
        join public.data_catalog_drives drive on drive.id = match.drive_id
      where
        drive.organization2_label is not null and
        match.organization2_name is not null and
        match.passes_source and
        match.passes_format and
        match.passes_updated and
        match.passes_loadable and
        match.passes_domain and
        match.passes_tag
      group by
        drive.organization2_label
      union all
      select
        'domain',
        listing_domain.value,
        count(distinct match.id)
      from
        match
        cross join unnest(match.domains) as listing_domain (value)
      where
        match.passes_source and
        match.passes_format and
        match.passes_updated and
        match.passes_loadable and
        match.passes_organization2 and
        match.passes_tag
      group by
        listing_domain.value
      union all
      select
        'domain',
        chosen.value,
        0
      from
        unnest(coalesce(p_domains, '{}')) as chosen (value)
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
        match.passes_organization2 and
        match.passes_domain and
        match.passes_tag and
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
        match.passes_updated and
        match.passes_organization2 and
        match.passes_domain and
        match.passes_tag
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
revoke all privileges on function public.data_catalog_listings__search_matches(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[]) from public, anon, authenticated, service_role;
grant EXECUTE on function public.data_catalog_listings__search_matches(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[]) to "authenticated";
revoke all privileges on function public.rpc_data_catalog_listings__search_facets(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[]) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_data_catalog_listings__search_facets(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[]) to "authenticated";
revoke all privileges on function public.rpc_data_catalog_listings__search(p_query text, p_limit integer, p_offset integer, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[], p_sort_by text) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_data_catalog_listings__search(p_query text, p_limit integer, p_offset integer, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[], p_sort_by text) to "authenticated";
