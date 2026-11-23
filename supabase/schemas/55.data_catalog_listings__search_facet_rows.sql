/**
 * What each of the catalog's filters offers, for a search and the filters
 * already chosen, with how many listings each option would keep where that
 * can be known cheaply. Each facet is counted against every other filter but
 * not its own, so choosing one source never makes the other sources read as
 * empty.
 *
 * Counting never reads the whole catalog: see
 * `data_catalog_listings__facet_value_rows` for where each count comes from.
 * In short, with nothing narrowing a facet its counts are the catalog's from
 * `data_catalog_facet_counts`; with few enough matches they are counted
 * exactly; otherwise the options carry no count (`listing_count` null).
 *
 * Facets:
 *
 * `source`: every level-1 organization, plus each chosen source.
 *
 * `format`: every upper-cased file format, plus each chosen format.
 *
 * `organization2`: the level-2 organizations under the chosen publishers,
 * plus each chosen one. With no publisher chosen, only the 50 with the most
 * listings.
 *
 * `organization2_label`: the names the drives give level 2, under the chosen
 * publishers, so the catalog can label that filter.
 *
 * `domain`: every topic, plus each chosen topic.
 *
 * `tag`: the 50 keywords with the most listings, plus each chosen keyword.
 * Keywords run to thousands, so the rest are found by
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
 * @param p_count_cap The most matches a facet counts, clamped to between 1
 * and 5,000. Past that the options stay selectable and carry no count.
 *
 * @returns Facet rows, facet by facet, each facet's options most listings
 * first. A broad search returns more rows than the Data API's row cap, so
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
  p_tags text[] default '{}',
  p_count_cap integer default 5000
) returns table (
  facet text,
  value text,
  listing_count bigint
) as $$
declare
  v_count_cap integer := least(greatest(coalesce(p_count_cap, 5000), 1), 5000);
  v_updated_within text := coalesce(p_updated_within, 'any');
  v_is_loadable_only boolean := coalesce(p_is_loadable_only, false);
  v_sources text[] := coalesce(p_sources, '{}');
  v_formats text[] := coalesce(p_formats, '{}');
  v_organization2_names text[] := coalesce(p_organization2_names, '{}');
  v_domains text[] := coalesce(p_domains, '{}');
  v_tags text[] := coalesce(p_tags, '{}');
  v_is_unsearched boolean := nullif(btrim(p_query), '') is null;
  v_has_sources boolean := cardinality(coalesce(p_sources, '{}')) > 0;
  v_has_formats boolean := cardinality(coalesce(p_formats, '{}')) > 0;
  v_has_organization2 boolean := cardinality(coalesce(p_organization2_names, '{}')) > 0;
  v_has_domains boolean := cardinality(coalesce(p_domains, '{}')) > 0;
  v_has_tags boolean := cardinality(coalesce(p_tags, '{}')) > 0;
  v_has_window boolean := coalesce(p_updated_within, 'any') <> 'any';
begin
  if v_updated_within not in ('any', 'past_month', 'past_year', 'over_a_year') then
    raise exception 'Unknown catalog update window: %', p_updated_within
    using
      errcode = '22023';
  end if;

  -- One read of the matches, shared by every facet. This is the search
  -- with no publisher, topic, keyword, format, or freshness chosen: each
  -- facet is counting that same set. A chosen filter still takes the
  -- per-facet path below, because that facet has to ignore its own filter.
  if not v_is_unsearched and not (
    v_has_sources or
    v_has_formats or
    v_has_window or
    v_has_organization2 or
    v_has_domains or
    v_has_tags
  ) then
    return query
    select
      *
    from
      public.data_catalog_listings__facets_for_one_search (
        p_query,
        v_is_loadable_only,
        v_count_cap
      );
  else
  return query
  select
    'source',
    option.value,
    option.listing_count
  from
    public.data_catalog_listings__facet_value_rows (
      'source',
      v_is_unsearched and not (
        v_has_formats or
        v_has_window or
        v_has_organization2 or
        v_has_domains or
        v_has_tags
      ),
      '{}',
      v_sources,
      null,
      null,
      v_count_cap,
      p_query,
      '{}',
      v_formats,
      v_updated_within,
      v_is_loadable_only,
      v_organization2_names,
      v_domains,
      v_tags
    ) as option;

  return query
  select
    'format',
    option.value,
    option.listing_count
  from
    public.data_catalog_listings__facet_value_rows (
      'format',
      v_is_unsearched and not (
        v_has_sources or
        v_has_window or
        v_has_organization2 or
        v_has_domains or
        v_has_tags
      ),
      '{}',
      v_formats,
      null,
      null,
      v_count_cap,
      p_query,
      v_sources,
      '{}',
      v_updated_within,
      v_is_loadable_only,
      v_organization2_names,
      v_domains,
      v_tags
    ) as option;

  return query
  select
    level2_facet.name,
    option.value,
    option.listing_count
  from
    unnest(array['organization2', 'organization2_label']) as level2_facet (name)
    cross join lateral public.data_catalog_listings__facet_value_rows (
      level2_facet.name,
      v_is_unsearched and not (
        v_has_formats or
        v_has_window or
        v_has_domains or
        v_has_tags
      ),
      v_sources,
      case
        when level2_facet.name = 'organization2' then v_organization2_names
        else '{}'
      end,
      case
        when level2_facet.name = 'organization2' and not v_has_sources then 50
      end,
      null,
      v_count_cap,
      p_query,
      v_sources,
      v_formats,
      v_updated_within,
      v_is_loadable_only,
      '{}',
      v_domains,
      v_tags
    ) as option;

  return query
  select
    'domain',
    option.value,
    option.listing_count
  from
    public.data_catalog_listings__facet_value_rows (
      'domain',
      v_is_unsearched and not (
        v_has_sources or
        v_has_formats or
        v_has_window or
        v_has_organization2 or
        v_has_tags
      ),
      '{}',
      v_domains,
      null,
      null,
      v_count_cap,
      p_query,
      v_sources,
      v_formats,
      v_updated_within,
      v_is_loadable_only,
      v_organization2_names,
      '{}',
      v_tags
    ) as option;

  return query
  select
    'tag',
    option.value,
    option.listing_count
  from
    public.data_catalog_listings__facet_value_rows (
      'tag',
      v_is_unsearched and not (
        v_has_sources or
        v_has_formats or
        v_has_window or
        v_has_organization2 or
        v_has_domains
      ),
      '{}',
      v_tags,
      50,
      null,
      v_count_cap,
      p_query,
      v_sources,
      v_formats,
      v_updated_within,
      v_is_loadable_only,
      v_organization2_names,
      v_domains,
      '{}'
    ) as option;

  if v_is_unsearched and not (
    v_has_sources or
    v_has_formats or
    v_has_organization2 or
    v_has_domains or
    v_has_tags
  ) then
    return query
    select
      'updated_within',
      update_window.name,
      coalesce(facet_count.listing_count, 0)
    from
      unnest(array['any', 'past_month', 'past_year', 'over_a_year']) as update_window (name)
      left join public.data_catalog_facet_counts facet_count on facet_count.facet = 'updated_within' and
      facet_count.value = update_window.name and
      facet_count.is_loadable_only = v_is_loadable_only;
  else
    return query
    with
      counted as materialized (
        select
          *
        from
          public.data_catalog_listings__count_facet (
            'updated_within',
            p_query,
            v_sources,
            v_formats,
            'any',
            v_is_loadable_only,
            v_organization2_names,
            v_domains,
            v_tags,
            v_count_cap
          )
      ),
      is_counted as (
        select
          coalesce(bool_or(counted.is_counted), true) as value
        from
          counted
      )
    select
      'updated_within',
      update_window.name,
      case
        when (
          select
            is_counted.value
          from
            is_counted
        ) then coalesce(counted.listing_count, 0)
      end
    from
      unnest(array['any', 'past_month', 'past_year', 'over_a_year']) as update_window (name)
      left join counted on counted.value = update_window.name;
  end if;

  end if;

  if v_is_unsearched and not (
    v_has_sources or
    v_has_formats or
    v_has_window or
    v_has_organization2 or
    v_has_domains or
    v_has_tags
  ) then
    return query
    select
      'unloadable',
      null,
      coalesce(
        (
          select
            facet_count.listing_count
          from
            public.data_catalog_facet_counts facet_count
          where
            facet_count.facet = 'unloadable'
        ),
        0
      );
  else
    return query
    select
      'unloadable',
      null,
      case
        when coalesce(bool_or(counted.is_counted), true) then coalesce(sum(counted.listing_count), 0)::bigint
      end
    from
      public.data_catalog_listings__count_facet (
        'unloadable',
        p_query,
        v_sources,
        v_formats,
        v_updated_within,
        false,
        v_organization2_names,
        v_domains,
        v_tags,
        v_count_cap
      ) as counted;
  end if;

  return query
  select
    'catalog',
    null,
    coalesce(
      (
        select
          facet_count.listing_count
        from
          public.data_catalog_facet_counts facet_count
        where
          facet_count.facet = 'catalog'
      ),
      (
        select
          count(*)
        from
          public.data_catalog_listings
      )
    );
end;
$$ language plpgsql stable security invoker
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
  text[],
  integer
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
  text[],
  integer
) to authenticated;
