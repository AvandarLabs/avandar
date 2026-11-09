/**
 * How many catalog listings each filter value keeps when nothing is searched
 * and no other filter is chosen. Counting that over the whole catalog on
 * every request would read every listing, so
 * `data_catalog_facet_counts__refresh` counts it once after each pipeline
 * run and the catalog's facets read it from here. The counts are as fresh as
 * the last refresh.
 *
 * Rows come in two variants, one counting every listing and one counting
 * only listings a workspace can load, matching the catalog's loadable-only
 * switch.
 */
create table public.data_catalog_facet_counts (
  id bigint generated always as identity primary key,
  -- Whether the row counts only listings a workspace can load
  -- (`is_workspace_loadable` and not `is_invalid`).
  is_loadable_only boolean not null,
  -- The facet, as `data_catalog_listings__search_facet_rows` names it:
  -- `source`, `format`, `organization2`, `organization2_label`, `domain`,
  -- `tag`, `updated_within`, `unloadable`, or `catalog`.
  facet text not null,
  -- The level-1 organization an `organization2` or `organization2_label`
  -- row belongs to. Null for every other facet.
  parent_value text,
  -- The filter value. Null on the `unloadable` and `catalog` rows.
  value text,
  listing_count bigint not null,
  refreshed_at timestamptz not null default now()
);

-- Serves reading one facet's values, most listings first.
create index data_catalog_facet_counts__facet_lookup on public.data_catalog_facet_counts (
  facet,
  is_loadable_only,
  listing_count desc
);

alter table public.data_catalog_facet_counts enable row level security;

-- Data API privileges.
--
-- Read-only for users: the counts are written by
-- `data_catalog_facet_counts__refresh`.
grant
select
  on table public.data_catalog_facet_counts to authenticated;

grant
select
,
  insert,
update,
delete on table public.data_catalog_facet_counts to service_role;

create policy "User can select open data catalog facet counts" on public.data_catalog_facet_counts for
select
  to authenticated using (true);
