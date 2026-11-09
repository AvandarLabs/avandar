/**
 * What each of the catalog's filters would keep, for a search and the
 * filters already chosen. Each facet is counted against every other filter
 * but not its own, so choosing one source never makes the other sources read
 * as empty.
 *
 * Matching and filtering are `data_catalog_listings__search_matches`'s, so
 * these counts always agree with the pages `rpc_data_catalog_listings__search`
 * returns for the same arguments. The matches are read once: each facet is a
 * grouping set of one aggregation, and topics and keywords are grouped by a
 * listing's whole list before the lists are split, so a blank search over the
 * whole catalog is one pass rather than one per facet.
 *
 * Facets:
 *
 * `source`: one row per level-1 organization with matches, plus each
 * chosen source even at 0, so a user can always unchoose what they chose.
 *
 * `format`: one row per upper-cased file format, plus each chosen format even
 * at 0. Listings with no format are not counted.
 *
 * `organization2`: one row per level-2 organization with matches, plus each
 * chosen level-2 organization even at 0. Listings with no level 2 are not
 * counted.
 *
 * `organization2_label`: one row per name the matching listings' drives give
 * level 2 (`data_catalog_drives.organization2_label`), counted over the same
 * listings as `organization2`, so the catalog can label that filter.
 *
 * `domain`: one row per topic with matches, plus each chosen topic even at
 * 0. A listing counts once under each of its topics, even when its source
 * repeats one.
 *
 * `tag`: one row for each of the 50 keywords with the most matches, plus
 * each chosen keyword with its count, even at 0. A listing counts once under
 * each of its keywords, even when its source repeats one. Keywords run to
 * thousands, so the rest are found by
 * `rpc_data_catalog_listings__search_tag_options`.
 *
 * `updated_within`: one row per window (`any`, `past_month`, `past_year`,
 * `over_a_year`). The windows are cumulative.
 *
 * `unloadable`: one row, `value` null, counting the listings that cannot be
 * loaded and that loadable-only would hide.
 *
 * `catalog`: one row, `value` null, counting every listing in the catalog,
 * unsearched and unfiltered, so the list can say how much it narrowed.
 *
 * @param p_query What the user typed. Accepts `websearch_to_tsquery` syntax.
 * @param p_sources Level-1 organizations (`organization1_name`) chosen. Empty
 * keeps every source.
 * @param p_formats Upper-cased file formats chosen. Empty keeps every format.
 * @param p_updated_within `any`, `past_month`, `past_year`, or `over_a_year`.
 * Any other value raises `22023` (invalid parameter value).
 * @param p_is_loadable_only Whether listings that cannot be loaded are hidden.
 * @param p_organization2_names Level-2 organizations (`organization2_name`)
 * chosen. Empty keeps every level-2 organization.
 * @param p_domains Topics chosen. Empty keeps every topic.
 * @param p_tags Keywords chosen. Empty keeps every keyword.
 *
 * @returns Facet rows ordered by facet, then most listings first, then value.
 * A broad search returns more rows than the Data API's row cap, so
 * `rpc_data_catalog_listings__search_facets` returns them as one value.
 */
create or replace function public.data_catalog_listings__search_facet_rows (
  p_query text,
  p_sources text[] default '{}',
  p_formats text[] default '{}',
  p_updated_within text default 'any',
  p_is_loadable_only boolean default false,
  p_organization2_names text[] default '{}',
  p_domains text[] default '{}',
  p_tags text[] default '{}'
) returns table (
  facet text,
  value text,
  listing_count bigint
) as $$
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
$$ language sql stable security invoker
set
  search_path = '';

-- `authenticated` only: `rpc_data_catalog_listings__search_facets` runs as
-- the caller.
revoke all on function public.data_catalog_listings__search_facet_rows (
  text,
  text[],
  text[],
  text,
  boolean,
  text[],
  text[],
  text[]
)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.data_catalog_listings__search_facet_rows (
  text,
  text[],
  text[],
  text,
  boolean,
  text[],
  text[],
  text[]
) to authenticated;
