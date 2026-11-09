/**
 * The options one of the catalog's value facets offers, with how many
 * listings each would keep where that can be known cheaply. A facet is
 * counted against the search and every filter but its own.
 *
 * Where the counts come from:
 *
 * - When nothing narrows the facet but the loadable switch (and, for the
 *   level-2 facets, the chosen publishers), the counts are the whole
 *   catalog's, read from `data_catalog_facet_counts`.
 * - Otherwise, when few enough listings match to count them
 *   (`data_catalog_listings__count_facet`), the counts are exact.
 * - Otherwise, the options are the whole catalog's values from
 *   `data_catalog_facet_counts`, ranked by their catalog-wide counts, with
 *   no count. Such an option may keep no listings.
 *
 * Each chosen value is always listed, so a user can unchoose it: with its
 * count when it has one, 0 when counted with no matches, or no count.
 *
 * @param p_facet `source`, `format`, `organization2`, `organization2_label`,
 * `domain`, or `tag`.
 * @param p_is_catalog_wide Whether nothing narrows the facet but the
 * loadable switch and, for the level-2 facets, the chosen publishers.
 * @param p_parent_values The chosen publishers, which the level-2 facets'
 * catalog-wide counts are read under. Empty reads every publisher's.
 * @param p_chosen_values The facet's chosen values.
 * @param p_value_limit The most options to return, besides the chosen ones.
 * Null returns every option.
 * @param p_value_search Keeps only options containing every
 * whitespace-separated fragment of it, ignoring case. Null keeps every
 * option.
 * @param p_count_cap The most matches to count.
 *
 * The rest are the search and filters to count against, with the facet's
 * own filter cleared, as `data_catalog_listings__search_matches` takes them.
 *
 * @returns One row per option, most listings first, then options with no
 * count by their catalog-wide counts, then by value. `listing_count` is null
 * where the count is not known.
 */
create or replace function public.data_catalog_listings__facet_value_rows (
  p_facet text,
  p_is_catalog_wide boolean,
  p_parent_values text[],
  p_chosen_values text[],
  p_value_limit integer,
  p_value_search text,
  p_count_cap integer,
  p_query text,
  p_sources text[],
  p_formats text[],
  p_updated_within text,
  p_is_loadable_only boolean,
  p_organization2_names text[],
  p_domains text[],
  p_tags text[]
) returns table (value text, listing_count bigint) as $$
  with
    typed_fragment as (
      select
        lower(fragment.value) as value
      from
        regexp_split_to_table(btrim(coalesce(p_value_search, '')), '\s+') as fragment (value)
      where
        fragment.value <> ''
    ),
    counted as (
      select
        *
      from
        public.data_catalog_listings__count_facet (
          p_facet,
          p_query,
          p_sources,
          p_formats,
          p_updated_within,
          p_is_loadable_only,
          p_organization2_names,
          p_domains,
          p_tags,
          p_count_cap
        )
      where
        not p_is_catalog_wide
    ),
    is_counted as (
      select
        p_is_catalog_wide or
        exists (
          select
            1
          from
            counted
          where
            counted.is_counted
        ) as value
    ),
    catalog_count as (
      select
        facet_count.value,
        sum(facet_count.listing_count)::bigint as listing_count
      from
        public.data_catalog_facet_counts facet_count
      where
        facet_count.facet = p_facet and
        facet_count.is_loadable_only = coalesce(p_is_loadable_only, false) and
        (
          cardinality(coalesce(p_parent_values, '{}')) = 0 or
          facet_count.parent_value = any (p_parent_values)
        )
      group by
        facet_count.value
    ),
    option_row as (
      select
        counted.value,
        counted.listing_count,
        counted.listing_count as rank_count
      from
        counted
      where
        counted.is_counted
      union all
      select
        catalog_count.value,
        case
          when p_is_catalog_wide then catalog_count.listing_count
        end,
        catalog_count.listing_count
      from
        catalog_count
      where
        p_is_catalog_wide or
        not (
          select
            is_counted.value
          from
            is_counted
        )
    ),
    searched_option as (
      select
        *
      from
        option_row
      where
        option_row.value is not null and
        not exists (
          select
            1
          from
            typed_fragment
          where
            strpos(lower(option_row.value), typed_fragment.value) = 0
        )
    ),
    top_option as (
      select
        *
      from
        searched_option
      order by
        searched_option.rank_count desc,
        searched_option.value
      limit
        p_value_limit
    ),
    chosen_option as (
      select
        searched_option.*
      from
        searched_option
      where
        searched_option.value = any (coalesce(p_chosen_values, '{}'))
      union all
      select
        chosen.value,
        case
          when (
            select
              is_counted.value
            from
              is_counted
          ) then 0::bigint
        end,
        0::bigint
      from
        unnest(coalesce(p_chosen_values, '{}')) as chosen (value)
    ),
    final_option as (
      select
        *
      from
        top_option
      union all
      select
        *
      from
        chosen_option
    )
  select
    final_option.value,
    max(final_option.listing_count)
  from
    final_option
  group by
    final_option.value
  order by
    max(final_option.listing_count) desc nulls last,
    max(final_option.rank_count) desc,
    final_option.value;
$$ language sql stable security invoker
set
  search_path = '';

-- `authenticated` only: the catalog's facet RPCs run as the caller.
revoke all on function public.data_catalog_listings__facet_value_rows (
  text,
  boolean,
  text[],
  text[],
  integer,
  text,
  integer,
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
execute on function public.data_catalog_listings__facet_value_rows (
  text,
  boolean,
  text[],
  text[],
  integer,
  text,
  integer,
  text,
  text[],
  text[],
  text,
  boolean,
  text[],
  text[],
  text[]
) to authenticated;
