/**
 * The keywords a user can choose in the catalog's Keywords filter that match
 * what they typed into it, with how many listings each would keep where that
 * can be known cheaply. The keyword facet in
 * `data_catalog_listings__search_facet_rows` lists only the 50 keywords with
 * the most listings, so this is how a user reaches the rest.
 *
 * A keyword matches when it contains every whitespace-separated fragment
 * typed, ignoring case, so "ferry rou" finds "Harbour Ferry Routes". Options
 * and counts follow `data_catalog_listings__facet_value_rows`, against the
 * search and every filter but the keyword filter: the catalog's counts when
 * nothing else narrows the keywords, exact counts when few enough listings
 * match, and otherwise the catalog's keywords with no count.
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
 * `listing_count` is null where the count is not known.
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
  select
    option.value,
    option.listing_count
  from
    public.data_catalog_listings__facet_value_rows (
      'tag',
      nullif(btrim(p_query), '') is null and
      cardinality(coalesce(p_sources, '{}')) = 0 and
      cardinality(coalesce(p_formats, '{}')) = 0 and
      coalesce(p_updated_within, 'any') = 'any' and
      cardinality(coalesce(p_organization2_names, '{}')) = 0 and
      cardinality(coalesce(p_domains, '{}')) = 0,
      '{}',
      '{}',
      50,
      p_tag_search,
      10000,
      p_query,
      p_sources,
      p_formats,
      p_updated_within,
      p_is_loadable_only,
      p_organization2_names,
      p_domains,
      '{}'
    ) as option
  where
    btrim(coalesce(p_tag_search, '')) <> ''
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
