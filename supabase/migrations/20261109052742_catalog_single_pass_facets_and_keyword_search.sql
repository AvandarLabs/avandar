set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_data_catalog_listings__search_tag_options(p_tag_search text, p_query text, p_sources text[] DEFAULT '{}'::text[], p_formats text[] DEFAULT '{}'::text[], p_updated_within text DEFAULT 'any'::text, p_is_loadable_only boolean DEFAULT false, p_organization2_names text[] DEFAULT '{}'::text[], p_domains text[] DEFAULT '{}'::text[], p_tags text[] DEFAULT '{}'::text[])
 RETURNS TABLE(value text, listing_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with
    typed_fragment as (
      select
        lower(fragment.value) as value
      from
        regexp_split_to_table(btrim(coalesce(p_tag_search, '')), '\s+') as fragment (value)
      where
        fragment.value <> ''
    ),
    tag_group as (
      select
        match.tags,
        count(*) filter (
          where
            match.passes_source and
            match.passes_format and
            match.passes_updated and
            match.passes_loadable and
            match.passes_organization2 and
            match.passes_domain
        ) as num_tag_matches
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
        ) as match
      where
        exists (
          select
            1
          from
            typed_fragment
        )
      group by
        match.tags
    ),
    tag_count as (
      select
        listing_tag.value,
        sum(tag_group.num_tag_matches)::bigint as listing_count
      from
        tag_group
        cross join lateral (
          select distinct
            unnest(tag_group.tags)
        ) as listing_tag (value)
      where
        not exists (
          select
            1
          from
            typed_fragment
          where
            strpos(lower(listing_tag.value), typed_fragment.value) = 0
        )
      group by
        listing_tag.value
    )
  select
    tag_count.value,
    tag_count.listing_count
  from
    tag_count
  where
    tag_count.listing_count > 0
  order by
    tag_count.listing_count desc,
    tag_count.value
  limit
    50;
$function$
;

CREATE OR REPLACE FUNCTION public.data_catalog_listings__search_facet_rows(p_query text, p_sources text[] DEFAULT '{}'::text[], p_formats text[] DEFAULT '{}'::text[], p_updated_within text DEFAULT 'any'::text, p_is_loadable_only boolean DEFAULT false, p_organization2_names text[] DEFAULT '{}'::text[], p_domains text[] DEFAULT '{}'::text[], p_tags text[] DEFAULT '{}'::text[])
 RETURNS TABLE(facet text, value text, listing_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with
    facet_group as (
      select
        grouping(match.organization1_name) = 0 as is_source_group,
        grouping(match.file_format) = 0 as is_format_group,
        grouping(match.organization2_name) = 0 as is_organization2_group,
        grouping(drive.organization2_label) = 0 as is_organization2_label_group,
        grouping(match.domains) = 0 as is_domain_group,
        grouping(match.tags) = 0 as is_tag_group,
        match.organization1_name,
        match.file_format,
        match.organization2_name,
        drive.organization2_label,
        match.domains,
        match.tags,
        count(*) filter (
          where
            match.passes_format and
            match.passes_updated and
            match.passes_loadable and
            match.passes_organization2 and
            match.passes_domain and
            match.passes_tag
        ) as num_source_matches,
        count(*) filter (
          where
            match.passes_source and
            match.passes_updated and
            match.passes_loadable and
            match.passes_organization2 and
            match.passes_domain and
            match.passes_tag
        ) as num_format_matches,
        count(*) filter (
          where
            match.passes_source and
            match.passes_format and
            match.passes_updated and
            match.passes_loadable and
            match.passes_domain and
            match.passes_tag
        ) as num_organization2_matches,
        count(*) filter (
          where
            match.passes_source and
            match.passes_format and
            match.passes_updated and
            match.passes_loadable and
            match.passes_organization2 and
            match.passes_tag
        ) as num_domain_matches,
        count(*) filter (
          where
            match.passes_source and
            match.passes_format and
            match.passes_updated and
            match.passes_loadable and
            match.passes_organization2 and
            match.passes_domain
        ) as num_tag_matches,
        count(*) filter (
          where
            match.passes_source and
            match.passes_format and
            match.passes_loadable and
            match.passes_organization2 and
            match.passes_domain and
            match.passes_tag
        ) as num_updated_any_matches,
        count(*) filter (
          where
            match.passes_source and
            match.passes_format and
            match.passes_loadable and
            match.passes_organization2 and
            match.passes_domain and
            match.passes_tag and
            public.data_catalog_listings__is_updated_within (match.last_updated_at, 'past_month')
        ) as num_updated_past_month_matches,
        count(*) filter (
          where
            match.passes_source and
            match.passes_format and
            match.passes_loadable and
            match.passes_organization2 and
            match.passes_domain and
            match.passes_tag and
            public.data_catalog_listings__is_updated_within (match.last_updated_at, 'past_year')
        ) as num_updated_past_year_matches,
        count(*) filter (
          where
            match.passes_source and
            match.passes_format and
            match.passes_loadable and
            match.passes_organization2 and
            match.passes_domain and
            match.passes_tag and
            public.data_catalog_listings__is_updated_within (match.last_updated_at, 'over_a_year')
        ) as num_updated_over_a_year_matches,
        count(*) filter (
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
        ) as num_unloadable_matches
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
        ) as match
        left join public.data_catalog_drives drive on drive.id = match.drive_id and
        match.organization2_name is not null
      group by
        grouping sets (
          (match.organization1_name),
          (match.file_format),
          (match.organization2_name),
          (drive.organization2_label),
          (match.domains),
          (match.tags),
          ()
        )
    ),
    total_group as (
      select
        *
      from
        facet_group
      where
        not facet_group.is_source_group and
        not facet_group.is_format_group and
        not facet_group.is_organization2_group and
        not facet_group.is_organization2_label_group and
        not facet_group.is_domain_group and
        not facet_group.is_tag_group
    ),
    domain_count as (
      select
        listing_domain.value,
        sum(facet_group.num_domain_matches)::bigint as listing_count
      from
        facet_group
        cross join lateral (
          select distinct
            unnest(facet_group.domains)
        ) as listing_domain (value)
      where
        facet_group.is_domain_group
      group by
        listing_domain.value
    ),
    tag_count as (
      select
        listing_tag.value,
        sum(facet_group.num_tag_matches)::bigint as listing_count
      from
        facet_group
        cross join lateral (
          select distinct
            unnest(facet_group.tags)
        ) as listing_tag (value)
      where
        facet_group.is_tag_group
      group by
        listing_tag.value
    ),
    facet_counts as (
      select
        'source' as facet,
        facet_group.organization1_name as value,
        facet_group.num_source_matches as listing_count
      from
        facet_group
      where
        facet_group.is_source_group and
        facet_group.num_source_matches > 0
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
        facet_group.file_format,
        facet_group.num_format_matches
      from
        facet_group
      where
        facet_group.is_format_group and
        facet_group.file_format is not null and
        facet_group.num_format_matches > 0
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
        facet_group.organization2_name,
        facet_group.num_organization2_matches
      from
        facet_group
      where
        facet_group.is_organization2_group and
        facet_group.organization2_name is not null and
        facet_group.num_organization2_matches > 0
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
        facet_group.organization2_label,
        facet_group.num_organization2_matches
      from
        facet_group
      where
        facet_group.is_organization2_label_group and
        facet_group.organization2_label is not null and
        facet_group.num_organization2_matches > 0
      union all
      select
        'domain',
        domain_count.value,
        domain_count.listing_count
      from
        domain_count
      where
        domain_count.listing_count > 0
      union all
      select
        'domain',
        chosen.value,
        0
      from
        unnest(coalesce(p_domains, '{}')) as chosen (value)
      union all
      (
        select
          'tag',
          tag_count.value,
          tag_count.listing_count
        from
          tag_count
        where
          tag_count.listing_count > 0
        order by
          tag_count.listing_count desc,
          tag_count.value
        limit
          50
      )
      union all
      select
        'tag',
        tag_count.value,
        tag_count.listing_count
      from
        tag_count
      where
        tag_count.value = any (coalesce(p_tags, '{}'))
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
        update_window.listing_count
      from
        total_group
        cross join lateral (
          values
            ('any', total_group.num_updated_any_matches),
            ('past_month', total_group.num_updated_past_month_matches),
            ('past_year', total_group.num_updated_past_year_matches),
            ('over_a_year', total_group.num_updated_over_a_year_matches)
        ) as update_window (name, listing_count)
      union all
      select
        'unloadable',
        null,
        total_group.num_unloadable_matches
      from
        total_group
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
revoke all privileges on function public.rpc_data_catalog_listings__search_tag_options(p_tag_search text, p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[]) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_data_catalog_listings__search_tag_options(p_tag_search text, p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[]) to "authenticated";
