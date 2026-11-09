/**
 * The keywords a user can choose in the catalog's Keywords filter that match
 * what they typed into it, with how many listings each would keep. The
 * keyword facet in `data_catalog_listings__search_facet_rows` lists only the
 * 50 keywords with the most listings, so this is how a user reaches the rest.
 *
 * A keyword matches when it contains every whitespace-separated fragment
 * typed, ignoring case, so "ferry rou" finds "Harbour Ferry Routes". Counts
 * apply the search and every filter except the keyword filter, as the
 * keyword facet's do, and a listing counts once under each of its keywords.
 *
 * @param p_tag_search What the user typed into the Keywords filter. A blank
 * value returns no keywords.
 * @param p_query What the user typed into the catalog's search. Accepts
 * `websearch_to_tsquery` syntax.
 * @param p_sources Level-1 organizations (`organization1_name`) chosen. Empty
 * keeps every source.
 * @param p_formats Upper-cased file formats chosen. Empty keeps every format.
 * @param p_updated_within `any`, `past_month`, `past_year`, or `over_a_year`.
 * Any other value raises `22023` (invalid parameter value).
 * @param p_is_loadable_only Whether listings that cannot be loaded are hidden.
 * @param p_organization2_names Level-2 organizations (`organization2_name`)
 * chosen. Empty keeps every level-2 organization.
 * @param p_domains Topics chosen. Empty keeps every topic.
 * @param p_tags Keywords chosen. They do not narrow these counts.
 *
 * @returns At most 50 matching keywords, most listings first, then by name.
 */
create or replace function public.rpc_data_catalog_listings__search_tag_options (
  p_tag_search text,
  p_query text,
  p_sources text[] default '{}',
  p_formats text[] default '{}',
  p_updated_within text default 'any',
  p_is_loadable_only boolean default false,
  p_organization2_names text[] default '{}',
  p_domains text[] default '{}',
  p_tags text[] default '{}'
) returns table (value text, listing_count bigint) as $$
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
$$ language sql stable security invoker
set
  search_path = '';

-- `authenticated` only, like the search it narrows.
revoke all on function public.rpc_data_catalog_listings__search_tag_options (
  text,
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
execute on function public.rpc_data_catalog_listings__search_tag_options (
  text,
  text,
  text[],
  text[],
  text,
  boolean,
  text[],
  text[],
  text[]
) to authenticated;
