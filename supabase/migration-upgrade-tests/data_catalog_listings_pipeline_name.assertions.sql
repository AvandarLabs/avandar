-- Verify the backfill names the pipeline on Socrata and HDX API listings that
-- have none, and leaves every other row alone: a ckan listing on another host,
-- a pipeline_parquet listing, and an API listing a pipeline already claimed.
do $$
begin
  if (
    select pipeline_name from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-socrata'
  ) is distinct from 'socrata' then
    raise exception 'a Socrata API listing was not backfilled to socrata';
  end if;

  if (
    select pipeline_name from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-hdx'
  ) is distinct from 'hdx' then
    raise exception 'an HDX API listing was not backfilled to hdx';
  end if;

  if (
    select pipeline_name from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-other'
  ) is not null then
    raise exception 'a ckan listing on another host was given a pipeline';
  end if;

  if (
    select pipeline_name from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-claimed'
  ) is distinct from 'pgtap-fixture-pipeline' then
    raise exception 'a claimed API listing had its pipeline overwritten';
  end if;

  if (
    select pipeline_name from public.data_catalog_listings
    where parquet_file_name = 'pgtap-fixture-backfill.parquet'
  ) is distinct from 'pgtap-fixture-pipeline' then
    raise exception 'a pipeline_parquet listing changed pipeline';
  end if;
end;
$$;

rollback;
