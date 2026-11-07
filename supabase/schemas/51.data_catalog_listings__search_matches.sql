/**
 * Every catalog listing that matches a search, with what the catalog's
 * filters read from it and whether it passes each one. The search RPC keeps
 * the rows that pass every filter, and the facet RPC counts the rows that
 * pass every filter but one, so the two always agree on what a filter keeps.
 *
 * A listing matches when `search_vector` contains the query's words, or when
 * the query is close to a word in its name: a partial word while typing, or
 * a misspelling. `score` is the full-text rank plus the name's trigram word
 * similarity. A blank query matches every listing, each with a score of 0.
 *
 * The word similarity threshold is 0.5, below `pg_trgm`'s default of 0.6, so
 * a swapped pair of letters in a short word still matches: "measels" scores
 * 0.5 against "Measles".
 *
 * @param p_query What the user typed. Accepts `websearch_to_tsquery` syntax:
 * quoted phrases, `or`, and `-word`.
 * @param p_sources Level-1 organizations (`organization1_name`) to keep: the
 * catalog calls a listing's level-1 organization its source. Empty keeps
 * every source.
 * @param p_formats Upper-cased file formats to keep. Empty keeps every format.
 * @param p_updated_within A window of
 * `data_catalog_listings__is_updated_within`. Any other value raises
 * `22023` (invalid parameter value).
 * @param p_is_loadable_only Whether listings that cannot be loaded fail.
 * @param p_organization2_names Level-2 organizations (`organization2_name`)
 * to keep. Empty keeps every level-2 organization.
 * @param p_domains Topics to keep: a listing passes when its `domains`
 * overlap them. Empty keeps every topic.
 * @param p_tags Keywords to keep: a listing passes when its `tags` overlap
 * them. Empty keeps every keyword.
 *
 * @returns One row per matching listing. `file_format` is the listing's
 * format upper-cased, `PARQUET` for a pipeline file, or null when it has
 * none. `last_updated_at` is the source's update date, otherwise Avandar's
 * last sync. `domains`, `tags`, and `drive_id` are the listing's own, for the
 * facets to count by.
 */
create or replace function public.data_catalog_listings__search_matches (
  p_query text,
  p_sources text[],
  p_formats text[],
  p_updated_within text,
  p_is_loadable_only boolean,
  p_organization2_names text[],
  p_domains text[],
  p_tags text[]
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
  domains text[],
  tags text[],
  drive_id uuid,
  score real,
  passes_source boolean,
  passes_format boolean,
  passes_updated boolean,
  passes_loadable boolean,
  passes_organization2 boolean,
  passes_domain boolean,
  passes_tag boolean
) as $$
declare
  v_query text := nullif(btrim(p_query), '');
  v_sources text[] := coalesce(p_sources, '{}');
  v_formats text[] := coalesce(p_formats, '{}');
  v_updated_within text := coalesce(p_updated_within, 'any');
  v_is_loadable_only boolean := coalesce(p_is_loadable_only, false);
  v_organization2_names text[] := coalesce(p_organization2_names, '{}');
  v_domains text[] := coalesce(p_domains, '{}');
  v_tags text[] := coalesce(p_tags, '{}');
  v_ts_query tsquery;
begin
  if v_updated_within not in ('any', 'past_month', 'past_year', 'over_a_year') then
    raise exception 'Unknown catalog update window: %', p_updated_within
    using
      errcode = '22023';
  end if;

  if v_query is not null then
    v_ts_query := websearch_to_tsquery('english'::regconfig, v_query);
  end if;

  return query
  with
    matched as (
      select
        listing.id,
        listing.display_name,
        listing.organization1_name,
        listing.organization2_name,
        listing.organization3_name,
        listing.organization4_name,
        listing.pipeline_name,
        listing.is_workspace_loadable,
        listing.is_invalid,
        case
          when listing.api_resource_format is not null then upper(listing.api_resource_format)
          when listing.parquet_file_name is not null then 'PARQUET'
        end as file_format,
        coalesce(listing.date_of_last_update, listing.date_of_last_sync) as last_updated_at,
        listing.domains,
        listing.tags,
        listing.drive_id,
        case
          when v_query is null then 0::real
          else ts_rank(listing.search_vector, v_ts_query) + extensions.word_similarity(v_query, listing.display_name)
        end as score
      from
        public.data_catalog_listings listing
      where
        v_query is null or
        listing.search_vector @@ v_ts_query or
        v_query operator(extensions.<%) listing.display_name
    )
  select
    matched.id,
    matched.display_name,
    matched.organization1_name,
    matched.organization2_name,
    matched.organization3_name,
    matched.organization4_name,
    matched.pipeline_name,
    matched.is_workspace_loadable,
    matched.is_invalid,
    matched.file_format,
    matched.last_updated_at,
    matched.domains,
    matched.tags,
    matched.drive_id,
    matched.score,
    cardinality(v_sources) = 0 or
    matched.organization1_name = any (v_sources),
    cardinality(v_formats) = 0 or
    coalesce(matched.file_format = any (v_formats), false),
    public.data_catalog_listings__is_updated_within (matched.last_updated_at, v_updated_within),
    not v_is_loadable_only or
    not matched.is_invalid,
    cardinality(v_organization2_names) = 0 or
    coalesce(matched.organization2_name = any (v_organization2_names), false),
    cardinality(v_domains) = 0 or
    coalesce(matched.domains && v_domains, false),
    cardinality(v_tags) = 0 or
    coalesce(matched.tags && v_tags, false)
  from
    matched;
end;
$$ language plpgsql stable security invoker
set
  search_path = ''
set
  pg_trgm.word_similarity_threshold = 0.5;

-- `authenticated` only: the catalog's search and facet RPCs run as the
-- caller, and row level security already lets a signed-in user read every
-- listing.
revoke all on function public.data_catalog_listings__search_matches (
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
execute on function public.data_catalog_listings__search_matches (
  text,
  text[],
  text[],
  text,
  boolean,
  text[],
  text[],
  text[]
) to authenticated;
