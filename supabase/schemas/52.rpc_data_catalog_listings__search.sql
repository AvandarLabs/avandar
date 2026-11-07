/**
 * One page of catalog listings matching a search and the catalog's filters,
 * with only the columns the catalog's list shows.
 *
 * Matching and filtering are `data_catalog_listings__search_matches`'s, so a
 * page always agrees with the counts `rpc_data_catalog_listings__search_facets`
 * reports. Every sort ends on name and id, so pages are stable.
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
 * @param p_sort_by `relevance` (best match first), `updated` (most recently
 * updated first, undated last), or `name`. Null sorts by relevance when there
 * is a query and by name when there is not. Any other value raises `22023`
 * (invalid parameter value).
 *
 * @returns One row per listing on the page. `total_count` is the number of
 * matches across every page, repeated on each row.
 */
create or replace function public.rpc_data_catalog_listings__search (
  p_query text,
  p_limit integer default 50,
  p_offset integer default 0,
  p_sources text[] default '{}',
  p_formats text[] default '{}',
  p_updated_within text default 'any',
  p_is_loadable_only boolean default false,
  p_sort_by text default null
) returns table (
  id uuid,
  display_name text,
  organization1_name text,
  pipeline_name text,
  is_workspace_loadable boolean,
  is_invalid boolean,
  file_format text,
  last_updated_at timestamptz,
  total_count bigint
) as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_sort_by text := coalesce(
    p_sort_by,
    case
      when nullif(btrim(p_query), '') is null then 'name'
      else 'relevance'
    end
  );
begin
  if v_sort_by not in ('relevance', 'updated', 'name') then
    raise exception 'Unknown catalog sort: %', p_sort_by
    using
      errcode = '22023';
  end if;

  return query
  select
    match.id,
    match.display_name,
    match.organization1_name,
    match.pipeline_name,
    match.is_workspace_loadable,
    match.is_invalid,
    match.file_format,
    match.last_updated_at,
    count(*) over ()
  from
    public.data_catalog_listings__search_matches (
      p_query,
      p_sources,
      p_formats,
      p_updated_within,
      p_is_loadable_only
    ) match
  where
    match.passes_source and
    match.passes_format and
    match.passes_updated and
    match.passes_loadable
  order by
    case
      when v_sort_by = 'relevance' then match.score
    end desc nulls last,
    case
      when v_sort_by = 'updated' then match.last_updated_at
    end desc nulls last,
    match.display_name,
    match.id
  limit
    v_limit
  offset
    v_offset;
end;
$$ language plpgsql stable security invoker
set
  search_path = '';

-- `authenticated` only: the catalog is browsed from the app by signed-in
-- users, and row level security already lets them read every listing.
revoke all on function public.rpc_data_catalog_listings__search (
  text,
  integer,
  integer,
  text[],
  text[],
  text,
  boolean,
  text
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
  text
) to authenticated;
