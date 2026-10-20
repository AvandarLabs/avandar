-- The `socrata` and `hdx` pipelines wrote their `api_resource` listings
-- before an API listing could name its pipeline. Record which pipeline owns
-- each one, so incremental runs and `ava pipeline reset` can scope rows by
-- `pipeline_name`. Only rows with no pipeline yet are touched, so this is
-- safe to replay.
update public.data_catalog_listings
set
  pipeline_name = 'socrata'
where
  access_kind = 'api_resource' and
  api_service = 'socrata' and
  pipeline_name is null;

update public.data_catalog_listings
set
  pipeline_name = 'hdx'
where
  access_kind = 'api_resource' and
  api_service = 'ckan' and
  api_base_url = 'https://data.humdata.org' and
  pipeline_name is null;
