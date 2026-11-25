/**
 * The catalog listings that match a search and pass every filter given, in
 * an optional order and page. Every catalog read goes through this one
 * function, so the list, the facet counts, and the keyword search always
 * agree on what a search and a filter keep.
 *
 * A listing matches when `search_vector` contains the query's words, or when
 * the query is close to a word in its name: a partial word while typing, or
 * a misspelling. Once 50 listings already match the words themselves, a
 * merely similar name is left out: it would not change the first page, and
 * keeping it would make the search recheck every whole-word hit. `score` is
 * the full-text rank plus the name's trigram word similarity. A blank query
 * matches every listing, each with a score of 0.
 *
 * The filters are applied as conditions on the listings rather than computed
 * for every row, and plans are made for each call's own arguments
 * (`plan_cache_mode`), so Postgres can serve a call from the listings'
 * indexes and read only the rows it returns. With a limit, a call reads about
 * as many listings as it returns, however large the catalog grows.
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
 * `data_catalog_listings__updated_window`. Any other value raises `22023`
 * (invalid parameter value).
 * @param p_is_loadable_only Whether to drop listings that cannot be loaded:
 * an asset no workspace can add (`is_workspace_loadable` false), or one whose
 * sample failed (`is_invalid`).
 * @param p_organization2_names Level-2 organizations (`organization2_name`)
 * to keep. Empty keeps every level-2 organization.
 * @param p_domains Topics to keep: a listing passes when its `domains`
 * overlap them. Empty keeps every topic.
 * @param p_tags Keywords to keep: a listing passes when its `tags` overlap
 * them. Empty keeps every keyword.
 * @param p_sort_by `relevance` (best score first), `updated` (most recently
 * updated first), or `name`, each then by name and id. Null leaves the rows
 * in no particular order, which is cheapest. Any other value raises `22023`.
 * @param p_limit The most rows to return. Null returns every match.
 * @param p_offset How many rows of the order to skip.
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
  p_tags text[],
  p_sort_by text default null,
  p_limit integer default null,
  p_offset integer default 0
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
  score real
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
  v_updated_window tstzrange;
  v_ts_query tsquery;
  -- A full page of whole-word matches. Past this, name similarity is skipped.
  v_name_similarity_limit constant integer := 50;
  v_skip_name_similarity boolean := false;
begin
  if v_updated_within not in ('any', 'past_month', 'past_year', 'over_a_year') then
    raise exception 'Unknown catalog update window: %', p_updated_within
    using
      errcode = '22023';
  end if;

  if p_sort_by is not null and p_sort_by not in ('relevance', 'updated', 'name') then
    raise exception 'Unknown catalog sort: %', p_sort_by
    using
      errcode = '22023';
  end if;

  v_updated_window := public.data_catalog_listings__updated_window (v_updated_within);

  if v_query is not null then
    v_ts_query := websearch_to_tsquery('english'::regconfig, v_query);
  end if;

  if v_ts_query is not null and numnode(v_ts_query) > 0 then
    select
      count(*) >= v_name_similarity_limit
    into
      v_skip_name_similarity
    from
      (
        select
          1
        from
          public.data_catalog_listings listing
        where
          listing.search_vector @@ v_ts_query and
          (
            cardinality(v_sources) = 0 or
            listing.organization1_name = any (v_sources)
          ) and
          (
            cardinality(v_formats) = 0 or
            case
              when listing.api_resource_format is not null then upper(listing.api_resource_format)
              when listing.parquet_file_name is not null then 'PARQUET'
            end = any (v_formats)
          ) and
          (
            v_updated_within = 'any' or
            (
              coalesce(listing.date_of_last_update, listing.date_of_last_sync) >= coalesce(lower(v_updated_window), '-infinity'::timestamptz) and
              coalesce(listing.date_of_last_update, listing.date_of_last_sync) < coalesce(upper(v_updated_window), 'infinity'::timestamptz)
            )
          ) and
          (
            not v_is_loadable_only or
            (
              listing.is_workspace_loadable and
              not listing.is_invalid
            )
          ) and
          (
            cardinality(v_organization2_names) = 0 or
            listing.organization2_name = any (v_organization2_names)
          ) and
          (
            cardinality(v_domains) = 0 or
            listing.domains && v_domains
          ) and
          (
            cardinality(v_tags) = 0 or
            listing.tags && v_tags
          )
        limit
          v_name_similarity_limit
      ) as name_similarity_probe;
  end if;

  return query
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
    listing_fact.file_format,
    listing_fact.last_updated_at,
    listing.domains,
    listing.tags,
    listing.drive_id,
    listing_fact.score
  from
    public.data_catalog_listings listing
    cross join lateral (
      select
        -- These two expressions are the ones the listings' format and
        -- last-update indexes are built on. Change them together.
        case
          when listing.api_resource_format is not null then upper(listing.api_resource_format)
          when listing.parquet_file_name is not null then 'PARQUET'
        end as file_format,
        coalesce(listing.date_of_last_update, listing.date_of_last_sync) as last_updated_at,
        case
          when v_query is null then 0::real
          else ts_rank(listing.search_vector, v_ts_query) + extensions.word_similarity(v_query, listing.display_name)
        end as score
    ) as listing_fact
  where
    (
      v_query is null or
      listing.search_vector @@ v_ts_query or
      (
        not v_skip_name_similarity and
        v_query operator(extensions.<%) listing.display_name
      )
    ) and
    (
      cardinality(v_sources) = 0 or
      listing.organization1_name = any (v_sources)
    ) and
    (
      cardinality(v_formats) = 0 or
      listing_fact.file_format = any (v_formats)
    ) and
    (
      v_updated_within = 'any' or
      (
        listing_fact.last_updated_at >= coalesce(lower(v_updated_window), '-infinity'::timestamptz) and
        listing_fact.last_updated_at < coalesce(upper(v_updated_window), 'infinity'::timestamptz)
      )
    ) and
    (
      not v_is_loadable_only or
      (
        listing.is_workspace_loadable and
        not listing.is_invalid
      )
    ) and
    (
      cardinality(v_organization2_names) = 0 or
      listing.organization2_name = any (v_organization2_names)
    ) and
    (
      cardinality(v_domains) = 0 or
      listing.domains && v_domains
    ) and
    (
      cardinality(v_tags) = 0 or
      listing.tags && v_tags
    )
  order by
    case
      when p_sort_by = 'relevance' then listing_fact.score
    end desc nulls last,
    case
      when p_sort_by = 'updated' then (
        case
          when v_query is null then listing_fact.last_updated_at
          -- A search finds its few matches through its own indexes. Adding
          -- zero hides the last-update index from this sort, or Postgres
          -- may walk that index looking for matches instead.
          else listing_fact.last_updated_at + interval '0 seconds'
        end
      )
    end desc nulls last,
    case
      when p_sort_by is not null then listing.display_name
    end,
    case
      when p_sort_by is not null then listing.id
    end
  limit
    p_limit
  offset
    coalesce(p_offset, 0);
end;
$$ language plpgsql stable security invoker
set
  search_path = ''
set
  pg_trgm.word_similarity_threshold = 0.5
set
  plan_cache_mode = force_custom_plan;

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
  text[],
  text,
  integer,
  integer
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
  text[],
  text,
  integer,
  integer
) to authenticated;
