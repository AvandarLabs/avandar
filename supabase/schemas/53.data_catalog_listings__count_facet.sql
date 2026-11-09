/**
 * How many listings carry each value of one catalog facet, among the
 * listings that match a search and filters, but only when there are few
 * enough of them to count quickly. Reads at most `p_count_cap + 1` listings,
 * so it costs the same however large the catalog grows.
 *
 * Facets:
 *
 * `source`, `format`, `organization2`: one row per value with matches.
 * Listings with no format or no level 2 are not counted.
 *
 * `organization2_label`: one row per name the listings' drives give level 2.
 *
 * `domain`, `tag`: one row per topic or keyword. A listing counts once under
 * each of its topics or keywords, even when its source repeats one.
 *
 * `updated_within`: one row per window with matches.
 *
 * `unloadable`: one row, `value` null, counting the listings that cannot be
 * loaded.
 *
 * Pass the filters a facet is counted against: the caller clears the
 * facet's own filter.
 *
 * @param p_facet One of the facets above.
 * @param p_count_cap The most matches to count.
 *
 * @returns The counts with `is_counted` true, or, when more than
 * `p_count_cap` listings match, a single row with `is_counted` false and no
 * value or count.
 */
create or replace function public.data_catalog_listings__count_facet (
  p_facet text,
  p_query text,
  p_sources text[],
  p_formats text[],
  p_updated_within text,
  p_is_loadable_only boolean,
  p_organization2_names text[],
  p_domains text[],
  p_tags text[],
  p_count_cap integer
) returns table (
  value text,
  listing_count bigint,
  is_counted boolean
) as $$
  with
    match as materialized (
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
          p_tags,
          null,
          p_count_cap + 1
        )
    ),
    match_size as (
      select
        count(*) <= p_count_cap as is_counted
      from
        match
    ),
    facet_value as (
      select
        match.organization1_name as value
      from
        match
      where
        p_facet = 'source'
      union all
      select
        match.file_format
      from
        match
      where
        p_facet = 'format' and
        match.file_format is not null
      union all
      select
        match.organization2_name
      from
        match
      where
        p_facet = 'organization2' and
        match.organization2_name is not null
      union all
      select
        drive.organization2_label
      from
        match
        join public.data_catalog_drives drive on drive.id = match.drive_id
      where
        p_facet = 'organization2_label' and
        match.organization2_name is not null and
        drive.organization2_label is not null
      union all
      select
        listing_domain.value
      from
        match
        cross join lateral (
          select distinct
            unnest(match.domains)
        ) as listing_domain (value)
      where
        p_facet = 'domain'
      union all
      select
        listing_tag.value
      from
        match
        cross join lateral (
          select distinct
            unnest(match.tags)
        ) as listing_tag (value)
      where
        p_facet = 'tag'
      union all
      select
        update_window.name
      from
        match
        cross join unnest(array['any', 'past_month', 'past_year', 'over_a_year']) as update_window (name)
      where
        p_facet = 'updated_within' and
        public.data_catalog_listings__is_updated_within (match.last_updated_at, update_window.name)
      union all
      select
        null
      from
        match
      where
        p_facet = 'unloadable' and
        (
          not match.is_workspace_loadable or
          match.is_invalid
        )
    )
  select
    facet_value.value,
    count(*),
    true
  from
    facet_value
  where
    (
      select
        match_size.is_counted
      from
        match_size
    )
  group by
    facet_value.value
  union all
  select
    null,
    null,
    false
  where
    not (
      select
        match_size.is_counted
      from
        match_size
    );
$$ language sql stable security invoker
set
  search_path = '';

-- `authenticated` only: the catalog's facet RPCs run as the caller.
revoke all on function public.data_catalog_listings__count_facet (
  text,
  text,
  text[],
  text[],
  text,
  boolean,
  text[],
  text[],
  text[],
  integer
)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.data_catalog_listings__count_facet (
  text,
  text,
  text[],
  text[],
  text,
  boolean,
  text[],
  text[],
  text[],
  integer
) to authenticated;
