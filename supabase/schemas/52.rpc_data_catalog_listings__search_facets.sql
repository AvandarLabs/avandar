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
 *
 * @returns Facet rows ordered by facet, then most listings first, then value.
 */
create or replace function public.rpc_data_catalog_listings__search_facets (
  p_query text,
  p_sources text[] default '{}',
  p_formats text[] default '{}',
  p_updated_within text default 'any',
  p_is_loadable_only boolean default false
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
$$ language sql stable security invoker
set
  search_path = '';

-- `authenticated` only, like the search it counts for.
revoke all on function public.rpc_data_catalog_listings__search_facets (text, text[], text[], text, boolean)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_data_catalog_listings__search_facets (text, text[], text[], text, boolean) to authenticated;
