/**
 * The values the catalog can filter by, each with how many listings it
 * would leave, for a search and the catalog's current filters.
 *
 * Each facet counts over the query and every filter except its own, so a
 * value is never a dead end and a chosen value's siblings stay visible to
 * switch to:
 *
 * - `organization1`: level-1 organizations.
 * - `organization2`: level-2 organizations.
 * - `organization2_label`: what the drives of the `organization2` listings
 *   call level 2, such as `Agency`.
 * - `domain`: one element of `domains`.
 *
 * Each facet returns at most its 100 most common values, by count
 * descending and then value. Tags are not a facet: there are thousands, and
 * the catalog reaches a tag from a listing.
 *
 * The match condition repeats `rpc_data_catalog_listings__search`'s rather
 * than calling a shared function: a function with `set search_path` is never
 * inlined, so the planner could not use the search indexes through one.
 * Change both together; `rpc_data_catalog_listings__search_facets.test.sql`
 * checks that they agree.
 *
 * @param p_query What the user typed, as the search RPC takes it.
 * @param p_organization1_names Level-1 organizations to keep.
 * @param p_organization2_names Level-2 organizations to keep.
 * @param p_domains Domains, any of which a listing must have.
 * @param p_tags Tags, any of which a listing must have.
 *
 * @returns One row per facet value.
 */
create or replace function public.rpc_data_catalog_listings__search_facets (
  p_query text,
  p_organization1_names text[] default null,
  p_organization2_names text[] default null,
  p_domains text[] default null,
  p_tags text[] default null
) returns table (facet text, value text, listing_count bigint) as $$
declare
  v_query text := nullif(btrim(p_query), '');
  v_organization1_names text[] := nullif(p_organization1_names, '{}'::text[]);
  v_organization2_names text[] := nullif(p_organization2_names, '{}'::text[]);
  v_domains text[] := nullif(p_domains, '{}'::text[]);
  v_tags text[] := nullif(p_tags, '{}'::text[]);
  v_ts_query tsquery;
begin
  if v_query is not null then
    v_ts_query := websearch_to_tsquery('english'::regconfig, v_query);
  end if;

  return query
  with matched as (
    select
      listing.organization1_name as organization1_name,
      listing.organization2_name as organization2_name,
      listing.domains as domains,
      listing.tags as tags,
      listing.drive_id as drive_id
    from public.data_catalog_listings listing
    where
      v_query is null or
      listing.search_vector @@ v_ts_query or
      v_query operator(extensions.<%) listing.display_name
  ),
  organization1_counts as (
    select
      'organization1'::text as facet_name,
      matched.organization1_name as facet_value,
      count(*) as facet_count
    from matched
    where
      (v_organization2_names is null or matched.organization2_name = any (v_organization2_names)) and
      (v_domains is null or matched.domains && v_domains) and
      (v_tags is null or matched.tags && v_tags)
    group by matched.organization1_name
    order by 3 desc, 2
    limit 100
  ),
  organization2_listings as (
    select matched.organization2_name, matched.drive_id
    from matched
    where
      matched.organization2_name is not null and
      (v_organization1_names is null or matched.organization1_name = any (v_organization1_names)) and
      (v_domains is null or matched.domains && v_domains) and
      (v_tags is null or matched.tags && v_tags)
  ),
  organization2_counts as (
    select
      'organization2'::text as facet_name,
      organization2_listings.organization2_name as facet_value,
      count(*) as facet_count
    from organization2_listings
    group by organization2_listings.organization2_name
    order by 3 desc, 2
    limit 100
  ),
  organization2_label_counts as (
    select
      'organization2_label'::text as facet_name,
      drive.organization2_label as facet_value,
      count(*) as facet_count
    from organization2_listings
    join public.data_catalog_drives drive on drive.id = organization2_listings.drive_id
    where drive.organization2_label is not null
    group by drive.organization2_label
    order by 3 desc, 2
    limit 100
  ),
  domain_counts as (
    select
      'domain'::text as facet_name,
      listing_domain.domain_value as facet_value,
      count(*) as facet_count
    from matched
    cross join lateral unnest(matched.domains) as listing_domain (domain_value)
    where
      (v_organization1_names is null or matched.organization1_name = any (v_organization1_names)) and
      (v_organization2_names is null or matched.organization2_name = any (v_organization2_names)) and
      (v_tags is null or matched.tags && v_tags)
    group by listing_domain.domain_value
    order by 3 desc, 2
    limit 100
  )
  select * from organization1_counts
  union all
  select * from organization2_counts
  union all
  select * from organization2_label_counts
  union all
  select * from domain_counts;
end;
$$ language plpgsql stable security invoker
set
  search_path = ''
set
  pg_trgm.word_similarity_threshold = 0.5;

-- `authenticated` only, like the search RPC it accompanies.
revoke
execute on function public.rpc_data_catalog_listings__search_facets (text, text[], text[], text[], text[])
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_data_catalog_listings__search_facets (text, text[], text[], text[], text[]) to authenticated;
