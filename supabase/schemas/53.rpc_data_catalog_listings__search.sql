/**
 * One page of catalog listings matching a search and the catalog's filters,
 * with only the columns the catalog's list shows.
 *
 * Matching and filtering are `data_catalog_listings__search_matches`'s, so a
 * page always agrees with the counts `rpc_data_catalog_listings__search_facets`
 * reports. Every sort ends on name and id, so pages are stable.
 *
 * A page reads about as many listings as it shows, so it stays fast as the
 * catalog grows. The total is counted only up to `p_count_cap`: past that,
 * `is_total_capped` is true and `total_count` is the cap. With nothing
 * searched or filtered, the total is the whole catalog's, read from
 * `data_catalog_facet_counts`.
 *
 * @param p_query What the user typed. Accepts `websearch_to_tsquery` syntax:
 * quoted phrases, `or`, and `-word`.
 * @param p_limit Page size, clamped to between 1 and 200.
 * @param p_offset How many matches to skip, clamped to at least 0.
 * @param p_sources Level-1 organizations (`organization1_name`) to keep: the
 * catalog calls a listing's level-1 organization its source. Empty keeps
 * every source.
 * @param p_formats Upper-cased file formats to keep. Empty keeps every format.
 * @param p_updated_within `any`, `past_month`, `past_year`, or `over_a_year`.
 * @param p_is_loadable_only Whether to hide listings that cannot be loaded.
 * @param p_organization2_names Level-2 organizations (`organization2_name`)
 * to keep. Empty keeps every level-2 organization.
 * @param p_domains Topics to keep: a listing is kept when its `domains`
 * overlap them. Empty keeps every topic.
 * @param p_tags Keywords to keep: a listing is kept when its `tags` overlap
 * them. Empty keeps every keyword.
 * @param p_sort_by `relevance` (best match first), `updated` (most recently
 * updated first, undated last), or `name`. Null sorts by relevance when there
 * is a query and by name when there is not. Any other value raises `22023`
 * (invalid parameter value).
 * @param p_count_cap The most matches to count, clamped to between 1 and
 * 10,000.
 *
 * @returns One row per listing on the page, with its organization levels.
 * `total_count` and `is_total_capped` describe the matches across every page,
 * repeated on each row.
 */
create or replace function public.rpc_data_catalog_listings__search (
  p_query text,
  p_limit integer default 50,
  p_offset integer default 0,
  p_sources text[] default '{}',
  p_formats text[] default '{}',
  p_updated_within text default 'any',
  p_is_loadable_only boolean default false,
  p_organization2_names text[] default '{}',
  p_domains text[] default '{}',
  p_tags text[] default '{}',
  p_sort_by text default null,
  p_count_cap integer default 10000
) returns table (
  id uuid,
  display_name text,
  organization1_name text,
  organization2_name text,
  organization3_name text,
  organization4_name text,
  pipeline_name text,
  is_workspace_loadable boolean,
  is_invalid boolean,
  file_format text,
  last_updated_at timestamptz,
  total_count bigint,
  is_total_capped boolean
) as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_count_cap integer := least(greatest(coalesce(p_count_cap, 10000), 1), 10000);
  v_sort_by text := coalesce(
    p_sort_by,
    case
      when nullif(btrim(p_query), '') is null then 'name'
      else 'relevance'
    end
  );
  v_is_unnarrowed boolean := nullif(btrim(p_query), '') is null and
  cardinality(coalesce(p_sources, '{}')) = 0 and
  cardinality(coalesce(p_formats, '{}')) = 0 and
  coalesce(p_updated_within, 'any') = 'any' and
  cardinality(coalesce(p_organization2_names, '{}')) = 0 and
  cardinality(coalesce(p_domains, '{}')) = 0 and
  cardinality(coalesce(p_tags, '{}')) = 0;
  v_total_count bigint;
  v_is_total_capped boolean := false;
begin
  if v_sort_by not in ('relevance', 'updated', 'name') then
    raise exception 'Unknown catalog sort: %', p_sort_by
    using
      errcode = '22023';
  end if;

  if v_is_unnarrowed then
    select
      facet_count.listing_count
    into
      v_total_count
    from
      public.data_catalog_facet_counts facet_count
    where
      facet_count.facet = 'updated_within' and
      facet_count.value = 'any' and
      facet_count.is_loadable_only = coalesce(p_is_loadable_only, false);
  end if;

  if v_total_count is null then
    select
      count(*)
    into
      v_total_count
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
        v_count_cap + 1
      );

    v_is_total_capped := v_total_count > v_count_cap;
    v_total_count := least(v_total_count, v_count_cap);
  end if;

  return query
  select
    match.id,
    match.display_name,
    match.organization1_name,
    match.organization2_name,
    match.organization3_name,
    match.organization4_name,
    match.pipeline_name,
    match.is_workspace_loadable,
    match.is_invalid,
    match.file_format,
    match.last_updated_at,
    v_total_count,
    v_is_total_capped
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
      v_sort_by,
      v_limit,
      v_offset
    )
  with
    ordinality as match
  order by
    match.ordinality;
end;
$$ language plpgsql stable security invoker
set
  search_path = '';

-- `authenticated` only: unauthenticated callers cannot browse the catalog.
revoke all on function public.rpc_data_catalog_listings__search (
  text,
  integer,
  integer,
  text[],
  text[],
  text,
  boolean,
  text[],
  text[],
  text[],
  text,
  integer
)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_data_catalog_listings__search (
  text,
  integer,
  integer,
  text[],
  text[],
  text,
  boolean,
  text[],
  text[],
  text[],
  text,
  integer
) to authenticated;
