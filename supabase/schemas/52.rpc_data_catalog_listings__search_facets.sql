/**
 * What each of the catalog's filters would keep, for a search and the
 * filters already chosen. Each facet is counted against every other filter
 * but not its own, so choosing one source never makes the other sources read
 * as empty.
 *
 * Matching and filtering are `data_catalog_listings__search_matches`'s, so
 * these counts always agree with the pages `rpc_data_catalog_listings__search`
 * returns for the same arguments.
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
 */
create or replace function public.rpc_data_catalog_listings__search_facets (
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
$$ language sql stable security invoker
set
  search_path = '';

-- `authenticated` only, like the search it counts for.
revoke all on function public.rpc_data_catalog_listings__search_facets (
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
execute on function public.rpc_data_catalog_listings__search_facets (
  text,
  text[],
  text[],
  text,
  boolean,
  text[],
  text[],
  text[]
) to authenticated;
