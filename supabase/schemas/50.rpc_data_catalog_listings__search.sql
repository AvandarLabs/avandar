/**
 * One page of catalog listings matching a search, with only the columns the
 * catalog's list shows.
 *
 * A listing matches when `search_vector` contains the query's words, or when
 * the query is close to a word in its name: a partial word while typing, or
 * a misspelling. Matches are ordered by score, the full-text rank plus the
 * name's trigram word similarity, then by name and id, so pages are stable.
 * A blank query matches every listing and orders them by name.
 *
 * The word similarity threshold is 0.5, below `pg_trgm`'s default of 0.6, so
 * a swapped pair of letters in a short word still matches: "measels" scores
 * 0.5 against "Measles".
 *
 * @param p_query What the user typed. Accepts `websearch_to_tsquery` syntax:
 * quoted phrases, `or`, and `-word`.
 * @param p_limit Page size, clamped to between 1 and 200.
 * @param p_offset How many matches to skip, clamped to at least 0.
 *
 * @returns One row per listing on the page. `total_count` is the number of
 * matches across every page, repeated on each row.
 */
create or replace function public.rpc_data_catalog_listings__search (
  p_query text,
  p_limit integer default 50,
  p_offset integer default 0
) returns table (
  id uuid,
  display_name text,
  external_organization_name text,
  pipeline_name text,
  is_workspace_loadable boolean,
  is_invalid boolean,
  total_count bigint
) as $$
declare
  v_query text := nullif(btrim(p_query), '');
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_ts_query tsquery;
begin
  if v_query is null then
    return query
    select
      listing.id,
      listing.display_name,
      listing.external_organization_name,
      listing.pipeline_name,
      listing.is_workspace_loadable,
      listing.is_invalid,
      count(*) over ()
    from public.data_catalog_listings listing
    order by listing.display_name, listing.id
    limit v_limit
    offset v_offset;
    return;
  end if;

  v_ts_query := websearch_to_tsquery('english'::regconfig, v_query);

  return query
  select
    listing.id,
    listing.display_name,
    listing.external_organization_name,
    listing.pipeline_name,
    listing.is_workspace_loadable,
    listing.is_invalid,
    count(*) over ()
  from public.data_catalog_listings listing
  where
    listing.search_vector @@ v_ts_query or
    v_query operator(extensions.<%) listing.display_name
  order by
    ts_rank(listing.search_vector, v_ts_query) +
    extensions.word_similarity(v_query, listing.display_name) desc,
    listing.display_name,
    listing.id
  limit v_limit
  offset v_offset;
end;
$$ language plpgsql stable security invoker
set
  search_path = ''
set
  pg_trgm.word_similarity_threshold = 0.5;

-- `authenticated` only: the catalog is browsed from the app by signed-in
-- users, and row level security already lets them read every listing.
revoke
execute on function public.rpc_data_catalog_listings__search (text, integer, integer)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_data_catalog_listings__search (text, integer, integer) to authenticated;
