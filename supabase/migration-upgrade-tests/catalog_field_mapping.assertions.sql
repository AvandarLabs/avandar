-- Verify the rename kept every organization name, the new columns start
-- empty, and the rebuilt search, source filter, and source facet read the
-- renamed column.
do $$
begin
  if (
    select organization1_name from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-rename'
  ) is distinct from 'City of New York' then
    raise exception 'the API listing lost its organization in the rename';
  end if;

  if (
    select organization1_name from public.data_catalog_listings
    where parquet_file_name = 'pgtap-fixture-rename.parquet'
  ) is distinct from 'World Bank' then
    raise exception 'the parquet listing lost its organization in the rename';
  end if;

  if exists (
    select 1 from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-rename'
      and (
        organization2_name is not null or
        organization3_name is not null or
        organization4_name is not null or
        drive_id is not null or
        domains is not null or
        tags is not null or
        source_metadata is not null
      )
  ) then
    raise exception 'a new column was not empty after the migration';
  end if;

  if not exists (
    select 1 from public.rpc_data_catalog_listings__search('"City of New York"', 50, 0)
    where id = (
      select id from public.data_catalog_listings
      where external_dataset_id = 'pgtap-fixture-rename'
    )
  ) then
    raise exception 'search did not find a listing by its renamed organization';
  end if;

  if not exists (
    select 1 from public.rpc_data_catalog_listings__search(
      p_query => 'pgtap-fixture',
      p_sources => array['World Bank']
    )
    where id = (
      select id from public.data_catalog_listings
      where parquet_file_name = 'pgtap-fixture-rename.parquet'
    )
  ) then
    raise exception 'the source filter did not keep a listing by its renamed organization';
  end if;

  if not exists (
    select 1 from public.rpc_data_catalog_listings__search_facets(p_query => 'pgtap-fixture')
    where facet = 'source' and value = 'City of New York' and listing_count >= 1
  ) then
    raise exception 'the source facet did not count a listing by its renamed organization';
  end if;
end;
$$;

rollback;
