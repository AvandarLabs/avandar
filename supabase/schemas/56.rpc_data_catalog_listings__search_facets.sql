/**
 * What each of the catalog's filters would keep, for a search and the
 * filters already chosen: the rows of
 * `data_catalog_listings__search_facet_rows`, which documents each facet.
 *
 * The rows come back as one JSON array rather than a set of rows. With
 * nothing searched there are thousands of them, and the Data API cuts any set
 * off at its `max_rows`, which silently dropped whole facets.
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
 * @returns A JSON array of `{ facet, value, listing_count }` objects, in the
 * order `data_catalog_listings__search_facet_rows` returns them.
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
) returns jsonb as $$
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'facet',
          facet_row.facet,
          'value',
          facet_row.value,
          'listing_count',
          facet_row.listing_count
        )
        order by
          facet_row.row_num
      ),
      '[]'::jsonb
    )
  from
    public.data_catalog_listings__search_facet_rows (
      p_query,
      p_sources,
      p_formats,
      p_updated_within,
      p_is_loadable_only,
      p_organization2_names,
      p_domains,
      p_tags
    )
  with
    ordinality as facet_row (facet, value, listing_count, row_num);
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
