/**
 * Every catalog facet for one typed search that has no publisher, topic,
 * keyword, format, or freshness chosen, from a single read of the matches.
 *
 * The read stops at `p_count_cap + 1`. At or under the cap, each option's
 * count is exact. Past the cap, the options are the catalog's values from
 * `data_catalog_facet_counts` and the counts are null: the options stay
 * selectable, and the list says the total is capped rather than waiting to
 * count them. Keywords and level-2 organizations stay at their 50 most
 * common, as `data_catalog_listings__search_facet_rows` does.
 *
 * @param p_query What the user typed. Accepts `websearch_to_tsquery` syntax.
 * @param p_is_loadable_only Whether listings that cannot be loaded are hidden.
 * @param p_count_cap The most matches to count.
 *
 * @returns Facet rows in facet order: source, format, organization2,
 * organization2_label, domain, tag, then the four update windows. The caller
 * adds the unloadable and catalog rows.
 */
create or replace function public.data_catalog_listings__facets_for_one_search (
  p_query text,
  p_is_loadable_only boolean,
  p_count_cap integer
) returns table (
  facet text,
  value text,
  listing_count bigint
) as $$
  with
    matches as materialized (
      select
        *
      from
        public.data_catalog_listings__search_matches (
          p_query,
          '{}',
          '{}',
          'any',
          coalesce(p_is_loadable_only, false),
          '{}',
          '{}',
          '{}',
          null,
          p_count_cap + 1,
          0
        )
    ),
    is_over_cap as (
      select
        count(*) > p_count_cap as value
      from
        matches
    ),
    exact as (
      select
        *
      from
        matches
      where
        not (
          select
            is_over_cap.value
          from
            is_over_cap
        )
    ),
    catalog_option as (
      select
        facet_count.facet,
        facet_count.value,
        sum(facet_count.listing_count)::bigint as rank_count
      from
        public.data_catalog_facet_counts facet_count
      where
        facet_count.is_loadable_only = coalesce(p_is_loadable_only, false) and
        facet_count.value is not null and
        facet_count.facet in (
          'source',
          'format',
          'organization2',
          'organization2_label',
          'domain',
          'tag'
        )
      group by
        facet_count.facet,
        facet_count.value
    ),
    facet_option as (
      select
        'source' as facet,
        exact.organization1_name as value,
        count(*)::bigint as listing_count,
        count(*)::bigint as rank_count,
        null::integer as value_limit
      from
        exact
      where
        exact.organization1_name is not null
      group by
        exact.organization1_name
      union all
      select
        'format',
        exact.file_format,
        count(*)::bigint,
        count(*)::bigint,
        null::integer
      from
        exact
      where
        exact.file_format is not null
      group by
        exact.file_format
      union all
      select
        'organization2',
        exact.organization2_name,
        count(*)::bigint,
        count(*)::bigint,
        50
      from
        exact
      where
        exact.organization2_name is not null
      group by
        exact.organization2_name
      union all
      select
        'organization2_label',
        drive.organization2_label,
        count(*)::bigint,
        count(*)::bigint,
        null::integer
      from
        exact
        join public.data_catalog_drives drive on drive.id = exact.drive_id
      where
        exact.organization2_name is not null and
        drive.organization2_label is not null
      group by
        drive.organization2_label
      union all
      select
        'domain',
        listing_domain.value,
        count(*)::bigint,
        count(*)::bigint,
        null::integer
      from
        exact
        cross join lateral (
          select distinct
            unnest(exact.domains)
        ) as listing_domain (value)
      where
        listing_domain.value is not null
      group by
        listing_domain.value
      union all
      select
        'tag',
        listing_tag.value,
        count(*)::bigint,
        count(*)::bigint,
        50
      from
        exact
        cross join lateral (
          select distinct
            unnest(exact.tags)
        ) as listing_tag (value)
      where
        listing_tag.value is not null
      group by
        listing_tag.value
      union all
      select
        catalog_option.facet,
        catalog_option.value,
        null::bigint,
        catalog_option.rank_count,
        case
          when catalog_option.facet in ('organization2', 'tag') then 50
        end
      from
        catalog_option
      where
        (
          select
            is_over_cap.value
          from
            is_over_cap
        )
    ),
    ranked_option as (
      select
        facet_option.facet,
        facet_option.value,
        facet_option.listing_count,
        facet_option.rank_count,
        row_number() over (
          partition by
            facet_option.facet
          order by
            facet_option.rank_count desc,
            facet_option.value
        ) as value_rank,
        facet_option.value_limit
      from
        facet_option
    ),
    ordered_row as (
    select
      ranked_option.facet,
      ranked_option.value,
      ranked_option.listing_count,
      case ranked_option.facet
        when 'source' then 1
        when 'format' then 2
        when 'organization2' then 3
        when 'organization2_label' then 4
        when 'domain' then 5
        when 'tag' then 6
      end as facet_order,
      ranked_option.value_rank
    from
      ranked_option
    where
      ranked_option.value_limit is null or
      ranked_option.value_rank <= ranked_option.value_limit
    union all
    select
      'updated_within',
      update_window.name,
      case
        when not (
          select
            is_over_cap.value
          from
            is_over_cap
        ) then coalesce(window_count.listing_count, 0)
      end,
      7,
      update_window.window_order
    from
      unnest(
        array['any', 'past_month', 'past_year', 'over_a_year']
      ) with ordinality as update_window (name, window_order)
      left join (
        select
          update_window.name,
          count(*)::bigint as listing_count
        from
          exact
          cross join unnest(array['any', 'past_month', 'past_year', 'over_a_year']) as update_window (name)
        where
          public.data_catalog_listings__is_updated_within (exact.last_updated_at, update_window.name)
        group by
          update_window.name
      ) as window_count on window_count.name = update_window.name
  )
select
  ordered_row.facet,
  ordered_row.value,
  ordered_row.listing_count
from
  ordered_row
order by
  ordered_row.facet_order,
  ordered_row.value_rank;
$$ language sql stable security invoker
set
  search_path = '';

-- `authenticated` only: the catalog's facet RPCs run as the caller.
revoke all on function public.data_catalog_listings__facets_for_one_search (text, boolean, integer)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.data_catalog_listings__facets_for_one_search (text, boolean, integer) to authenticated;
