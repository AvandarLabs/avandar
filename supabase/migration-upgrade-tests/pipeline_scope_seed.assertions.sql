-- Verify the seed gives each pipeline listing the scope that produced it,
-- leaves keyed and hand-curated listings alone, and seeds one checkpoint per
-- incremental drive and scope from the newest non-future update.
do $$
begin
  if (
    select pipeline_scope_keys from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-hdx-csv'
  ) is distinct from array['format:csv'] then
    raise exception 'an HDX CSV listing was not keyed format:csv';
  end if;

  if (
    select pipeline_scope_keys from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-hdx-parquet'
  ) is distinct from array['format:parquet'] then
    raise exception 'an HDX Parquet listing was not keyed format:parquet';
  end if;

  if (
    select pipeline_scope_keys from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-socrata'
  ) is distinct from array['all'] then
    raise exception 'a Socrata listing was not keyed all';
  end if;

  if (
    select pipeline_scope_keys from public.data_catalog_listings
    where parquet_file_name = 'pgtap-fixture-scope-seed.parquet'
  ) is distinct from array['all'] then
    raise exception 'a pipeline_parquet listing was not keyed all';
  end if;

  if (
    select pipeline_scope_keys from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-hdx-keyed'
  ) is distinct from array['format:csv@2'] then
    raise exception 'a listing that already had scope keys was changed';
  end if;

  if (
    select pipeline_scope_keys from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-curated'
  ) is distinct from '{}'::text[] then
    raise exception 'a listing with no pipeline was given a scope key';
  end if;

  if (
    select array_agg(scope_key || '=' || high_water_mark::text order by scope_key)
    from public.pipeline_scope_checkpoints
    where pipeline_name = 'hdx' and drive_key = 'https://pgtap-fixture-hdx.invalid'
  ) is distinct from array[
    'format:csv=2026-10-05 00:00:00+00',
    'format:parquet=2026-10-05 00:00:00+00'
  ] then
    raise exception 'the HDX drive did not get both scope checkpoints at its newest non-future update';
  end if;

  if (
    select high_water_mark from public.pipeline_scope_checkpoints
    where pipeline_name = 'socrata'
      and drive_key = 'https://pgtap-fixture-socrata.invalid'
      and scope_key = 'all'
  ) is distinct from '2026-09-01T00:00:00Z'::timestamptz then
    raise exception 'the Socrata drive did not get an all checkpoint';
  end if;

  if (
    select high_water_mark from public.pipeline_scope_checkpoints
    where pipeline_name = 'socrata'
      and drive_key = 'https://pgtap-fixture-socrata-seeded.invalid'
  ) is distinct from '2026-01-01T00:00:00Z'::timestamptz then
    raise exception 'an existing checkpoint was overwritten';
  end if;

  if exists (
    select 1 from public.pipeline_scope_checkpoints
    where drive_key = 'https://pgtap-fixture-curated.invalid'
  ) then
    raise exception 'a drive with no pipeline got a checkpoint';
  end if;
end;
$$;

rollback;
