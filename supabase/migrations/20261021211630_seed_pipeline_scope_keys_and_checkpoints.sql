-- Records which scope produced each listing a pipeline wrote before listings
-- carried scope keys, and seeds each incremental drive's checkpoints from the
-- newest update its listings hold, so the first scoped run resumes instead of
-- crawling from the start. The keys must match the pipelines' code: `all` is
-- the engine's default scope, and the `hdx` pipeline's scopes are
-- `format:csv` and `format:parquet` (pinned by `hdxScopes.test.ts`). Only
-- listings with no scope key yet, and drives and scopes with no checkpoint
-- yet, are touched, so this is safe to replay.
update public.data_catalog_listings
set
  pipeline_scope_keys = array['format:csv']
where
  pipeline_name = 'hdx' and
  api_resource_format = 'CSV' and
  pipeline_scope_keys = '{}';

update public.data_catalog_listings
set
  pipeline_scope_keys = array['format:parquet']
where
  pipeline_name = 'hdx' and
  api_resource_format = 'PARQUET' and
  pipeline_scope_keys = '{}';

update public.data_catalog_listings
set
  pipeline_scope_keys = array['all']
where
  pipeline_name is not null and
  pipeline_name <> 'hdx' and
  pipeline_scope_keys = '{}';

-- The unscoped HDX crawl covered both formats up to the drive's newest
-- update, so both scopes start there. A date later than now is a bad source
-- timestamp, skipped as the engine skips it.
insert into public.pipeline_scope_checkpoints
  (pipeline_name, drive_key, scope_key, high_water_mark, pipeline_run_id)
select
  drive.pipeline_name,
  drive.drive_key,
  scope.scope_key,
  drive.high_water_mark,
  'migration:seed-scope-checkpoints'
from (
  select
    listing.pipeline_name,
    listing.api_base_url as drive_key,
    max(listing.date_of_last_update) as high_water_mark
  from public.data_catalog_listings listing
  where
    listing.pipeline_name in ('socrata', 'hdx') and
    listing.api_base_url is not null and
    listing.date_of_last_update <= now()
  group by listing.pipeline_name, listing.api_base_url
) drive
join (
  values
    ('socrata', 'all'),
    ('hdx', 'format:csv'),
    ('hdx', 'format:parquet')
) as scope (pipeline_name, scope_key) on scope.pipeline_name = drive.pipeline_name
on conflict (pipeline_name, drive_key, scope_key) do nothing;
