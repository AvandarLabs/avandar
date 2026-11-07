/**
 * One page of catalog listings matching a search and the catalog's filters,
 * with only the columns the catalog's list shows.
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
 * Filters narrow the matches. A listing must have one of
 * `p_organization1_names` as its level-1 organization, one of
 * `p_organization2_names` as its level-2 organization, at least one of
 * `p_domains`, and at least one of `p_tags`. A null or empty filter is no
 * filter, and filters apply to a blank query too.
 * `rpc_data_catalog_listings__search_facets` repeats this function's match
 * condition, so change both together.
 *
 * @param p_query What the user typed. Accepts `websearch_to_tsquery` syntax:
 * quoted phrases, `or`, and `-word`.
 * @param p_limit Page size, clamped to between 1 and 200.
 * @param p_offset How many matches to skip, clamped to at least 0.
 * @param p_organization1_names Level-1 organizations to keep.
 * @param p_organization2_names Level-2 organizations to keep.
 * @param p_domains Domains, any of which a listing must have.
 * @param p_tags Tags, any of which a listing must have.
 *
 * @returns One row per listing on the page, with its organization levels.
 * `total_count` is the number of matches across every page, repeated on each
 * row.
 */
create or replace function public.rpc_data_catalog_listings__search (
  p_query text,
  p_limit integer default 50,
  p_offset integer default 0,
  p_organization1_names text[] default null,
  p_organization2_names text[] default null,
  p_domains text[] default null,
  p_tags text[] default null
) returns table (
  id uuid,
  display_name text,
  organization1_name text,
  organization2_name text,
  organization3_name text,
  organization4_name text,
  is_workspace_loadable boolean,
  is_invalid boolean,
  total_count bigint
) as $$
declare
  v_query text := nullif(btrim(p_query), '');
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_organization1_names text[] := nullif(p_organization1_names, '{}'::text[]);
  v_organization2_names text[] := nullif(p_organization2_names, '{}'::text[]);
  v_domains text[] := nullif(p_domains, '{}'::text[]);
  v_tags text[] := nullif(p_tags, '{}'::text[]);
  v_ts_query tsquery;
begin
  if v_query is null then
    return query
    select
      listing.id,
      listing.display_name,
      listing.organization1_name,
      listing.organization2_name,
      listing.organization3_name,
      listing.organization4_name,
      listing.is_workspace_loadable,
      listing.is_invalid,
      count(*) over ()
    from public.data_catalog_listings listing
    where
      (v_organization1_names is null or listing.organization1_name = any (v_organization1_names)) and
      (v_organization2_names is null or listing.organization2_name = any (v_organization2_names)) and
      (v_domains is null or listing.domains && v_domains) and
      (v_tags is null or listing.tags && v_tags)
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
    listing.organization1_name,
    listing.organization2_name,
    listing.organization3_name,
    listing.organization4_name,
    listing.is_workspace_loadable,
    listing.is_invalid,
    count(*) over ()
  from public.data_catalog_listings listing
  where
    (
      listing.search_vector @@ v_ts_query or
      v_query operator(extensions.<%) listing.display_name
    ) and
    (v_organization1_names is null or listing.organization1_name = any (v_organization1_names)) and
    (v_organization2_names is null or listing.organization2_name = any (v_organization2_names)) and
    (v_domains is null or listing.domains && v_domains) and
    (v_tags is null or listing.tags && v_tags)
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
execute on function public.rpc_data_catalog_listings__search (
  text,
  integer,
  integer,
  text[],
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
execute on function public.rpc_data_catalog_listings__search (
  text,
  integer,
  integer,
  text[],
  text[],
  text[],
  text[]
) to authenticated;
