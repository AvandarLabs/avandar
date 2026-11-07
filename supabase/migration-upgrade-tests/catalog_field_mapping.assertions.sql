-- Verify the rename kept every organization name and the new columns start
-- empty.
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
      and (drive_id is not null or domains is not null or source_metadata is not null)
  ) then
    raise exception 'a new column was not empty after the migration';
  end if;

  if to_regprocedure(
    'public.rpc_data_catalog_listings__search(text, integer, integer)'
  ) is not null then
    raise exception 'the three-argument search RPC was not dropped';
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
end;
$$;

rollback;
