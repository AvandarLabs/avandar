/**
 * Recounts `data_catalog_facet_counts` from every catalog listing: each
 * facet value's listings, the update windows, the listings that cannot be
 * loaded, and the catalog's size, once counting every listing and once
 * counting only loadable ones.
 *
 * This reads the whole catalog, so it runs once at the end of each pipeline
 * run (`rpc_pipeline_executions__finish`) rather than per request. Readers
 * keep seeing the previous counts until it commits, and concurrent refreshes
 * wait for each other.
 */
create or replace function public.data_catalog_facet_counts__refresh () returns void as $$
declare
  -- The windows' dates, read once: checking each listing with
  -- `data_catalog_listings__is_updated_within` calls a function per listing
  -- and window, which made a refresh of the demo catalog take 20s, not 2s.
  v_past_month_start timestamptz := lower(public.data_catalog_listings__updated_window ('past_month'));
  v_past_year_start timestamptz := lower(public.data_catalog_listings__updated_window ('past_year'));
  v_over_a_year_end timestamptz := upper(public.data_catalog_listings__updated_window ('over_a_year'));
begin
  lock table public.data_catalog_facet_counts in exclusive mode;

  -- `where true`: the Data API loads `safeupdate`, which refuses a delete
  -- with no `where` clause.
  delete from public.data_catalog_facet_counts
  where
    true;

  insert into
    public.data_catalog_facet_counts (is_loadable_only, facet, parent_value, value, listing_count)
  with
    listing as (
      select
        listing.organization1_name,
        listing.organization2_name,
        case
          when listing.organization2_name is not null then drive.organization2_label
        end as organization2_label,
        case
          when listing.api_resource_format is not null then upper(listing.api_resource_format)
          when listing.parquet_file_name is not null then 'PARQUET'
        end as file_format,
        coalesce(listing.date_of_last_update, listing.date_of_last_sync) as last_updated_at,
        listing.is_workspace_loadable and
        not listing.is_invalid as is_loadable,
        listing.domains,
        listing.tags
      from
        public.data_catalog_listings listing
        left join public.data_catalog_drives drive on drive.id = listing.drive_id
    ),
    listing_group as (
      select
        grouping(listing.organization1_name) = 0 as is_by_source,
        grouping(listing.file_format) = 0 as is_by_format,
        grouping(listing.organization2_name) = 0 as is_by_organization2,
        grouping(listing.organization2_label) = 0 as is_by_organization2_label,
        grouping(listing.domains) = 0 as is_by_domains,
        grouping(listing.tags) = 0 as is_by_tags,
        listing.organization1_name,
        listing.file_format,
        listing.organization2_name,
        listing.organization2_label,
        listing.domains,
        listing.tags,
        count(*) as num_listings,
        count(*) filter (
          where
            listing.is_loadable
        ) as num_loadable,
        count(*) filter (
          where
            listing.last_updated_at >= v_past_month_start
        ) as num_past_month,
        count(*) filter (
          where
            listing.is_loadable and
            listing.last_updated_at >= v_past_month_start
        ) as num_loadable_past_month,
        count(*) filter (
          where
            listing.last_updated_at >= v_past_year_start
        ) as num_past_year,
        count(*) filter (
          where
            listing.is_loadable and
            listing.last_updated_at >= v_past_year_start
        ) as num_loadable_past_year,
        count(*) filter (
          where
            listing.last_updated_at < v_over_a_year_end
        ) as num_over_a_year,
        count(*) filter (
          where
            listing.is_loadable and
            listing.last_updated_at < v_over_a_year_end
        ) as num_loadable_over_a_year
      from
        listing
      group by
        grouping sets (
          (listing.organization1_name),
          (listing.file_format),
          (listing.organization1_name, listing.organization2_name),
          (listing.organization1_name, listing.organization2_label),
          (listing.domains),
          (listing.tags),
          ()
        )
    ),
    value_count as (
      select
        case
          when listing_group.is_by_organization2 then 'organization2'
          when listing_group.is_by_organization2_label then 'organization2_label'
          when listing_group.is_by_source then 'source'
          when listing_group.is_by_format then 'format'
        end as facet,
        case
          when listing_group.is_by_organization2 or listing_group.is_by_organization2_label then listing_group.organization1_name
        end as parent_value,
        case
          when listing_group.is_by_organization2 then listing_group.organization2_name
          when listing_group.is_by_organization2_label then listing_group.organization2_label
          when listing_group.is_by_source then listing_group.organization1_name
          when listing_group.is_by_format then listing_group.file_format
        end as value,
        listing_group.num_listings,
        listing_group.num_loadable
      from
        listing_group
      where
        listing_group.is_by_source or
        listing_group.is_by_format or
        listing_group.is_by_organization2 or
        listing_group.is_by_organization2_label
      union all
      select
        'domain',
        null,
        listing_domain.value,
        sum(listing_group.num_listings),
        sum(listing_group.num_loadable)
      from
        listing_group
        cross join lateral (
          select distinct
            unnest(listing_group.domains)
        ) as listing_domain (value)
      where
        listing_group.is_by_domains
      group by
        listing_domain.value
      union all
      select
        'tag',
        null,
        listing_tag.value,
        sum(listing_group.num_listings),
        sum(listing_group.num_loadable)
      from
        listing_group
        cross join lateral (
          select distinct
            unnest(listing_group.tags)
        ) as listing_tag (value)
      where
        listing_group.is_by_tags
      group by
        listing_tag.value
    ),
    total_group as (
      select
        *
      from
        listing_group
      where
        not (
          listing_group.is_by_source or
          listing_group.is_by_format or
          listing_group.is_by_organization2 or
          listing_group.is_by_organization2_label or
          listing_group.is_by_domains or
          listing_group.is_by_tags
        )
    )
  select
    variant.is_loadable_only,
    value_count.facet,
    value_count.parent_value,
    value_count.value,
    variant.listing_count
  from
    value_count
    cross join lateral (
      values
        (false, value_count.num_listings),
        (true, value_count.num_loadable)
    ) as variant (is_loadable_only, listing_count)
  where
    value_count.value is not null and
    variant.listing_count > 0
  union all
  select
    variant.is_loadable_only,
    'updated_within',
    null,
    variant.window_name,
    variant.listing_count
  from
    total_group
    cross join lateral (
      values
        (false, 'any', total_group.num_listings),
        (true, 'any', total_group.num_loadable),
        (false, 'past_month', total_group.num_past_month),
        (true, 'past_month', total_group.num_loadable_past_month),
        (false, 'past_year', total_group.num_past_year),
        (true, 'past_year', total_group.num_loadable_past_year),
        (false, 'over_a_year', total_group.num_over_a_year),
        (true, 'over_a_year', total_group.num_loadable_over_a_year)
    ) as variant (is_loadable_only, window_name, listing_count)
  union all
  select
    false,
    'unloadable',
    null,
    null,
    total_group.num_listings - total_group.num_loadable
  from
    total_group
  union all
  select
    false,
    'catalog',
    null,
    null,
    total_group.num_listings
  from
    total_group;
end;
$$ language plpgsql volatile security definer
set
  search_path = '';

-- Service role only: pipeline runs refresh the counts, through
-- `rpc_pipeline_executions__finish`.
revoke all on function public.data_catalog_facet_counts__refresh ()
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.data_catalog_facet_counts__refresh () to service_role;
