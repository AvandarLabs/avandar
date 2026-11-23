drop function if exists "public"."rpc_data_catalog_listings__search_facets"(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[]);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.data_catalog_listings__search_facet_rows(p_query text, p_sources text[] DEFAULT '{}'::text[], p_formats text[] DEFAULT '{}'::text[], p_updated_within text DEFAULT 'any'::text, p_is_loadable_only boolean DEFAULT false, p_organization2_names text[] DEFAULT '{}'::text[], p_domains text[] DEFAULT '{}'::text[], p_tags text[] DEFAULT '{}'::text[])
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
        'tag',
        listing_tag.value,
        count(distinct match.id)
      from
        match
        cross join unnest(match.tags) as listing_tag (value)
      where
        match.passes_source and
        match.passes_format and
        match.passes_updated and
        match.passes_loadable and
        match.passes_organization2 and
        match.passes_domain
      group by
        listing_tag.value
      union all
      select
        'tag',
        chosen.value,
        0
      from
        unnest(coalesce(p_tags, '{}')) as chosen (value)
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
        (
          not match.is_workspace_loadable or
          match.is_invalid
        ) and
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

CREATE OR REPLACE FUNCTION public.rpc_data_catalog_listings__search_facets(p_query text, p_sources text[] DEFAULT '{}'::text[], p_formats text[] DEFAULT '{}'::text[], p_updated_within text DEFAULT 'any'::text, p_is_loadable_only boolean DEFAULT false, p_organization2_names text[] DEFAULT '{}'::text[], p_domains text[] DEFAULT '{}'::text[], p_tags text[] DEFAULT '{}'::text[])
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'facet',
          facet_row.facet,
          'value',
          facet_row.value,
          'listing_count',
          facet_row.listing_count
        )
        order by
          facet_row.row_num
      ),
      '[]'::jsonb
    )
  from
    public.data_catalog_listings__search_facet_rows (
      p_query,
      p_sources,
      p_formats,
      p_updated_within,
      p_is_loadable_only,
      p_organization2_names,
      p_domains,
      p_tags
    )
  with
    ordinality as facet_row (facet, value, listing_count, row_num);
$function$
;



-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.data_catalog_listings__search_facet_rows(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[]) from public, anon, authenticated, service_role;
grant EXECUTE on function public.data_catalog_listings__search_facet_rows(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[]) to "authenticated";
revoke all privileges on function public.rpc_data_catalog_listings__search_facets(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[]) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_data_catalog_listings__search_facets(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[]) to "authenticated";
