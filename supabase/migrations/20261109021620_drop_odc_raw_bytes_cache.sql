alter table "public"."data_catalog_listings" drop constraint "data_catalog_listings__cache_complete";

alter table "public"."data_catalog_listings" drop constraint "data_catalog_listings__pipeline_access_complete";

alter table "public"."data_catalog_listings" drop column "cached_at";

alter table "public"."data_catalog_listings" drop column "cached_object_path";

alter table "public"."data_catalog_listings" drop column "cached_source_version";

alter table "public"."data_catalog_listings" add constraint "data_catalog_listings__pipeline_access_complete" CHECK (((access_kind <> 'pipeline_parquet'::public.data_catalog_listings__access_kind) OR ((parquet_file_name IS NOT NULL) AND (pipeline_name IS NOT NULL) AND (pipeline_run_id IS NOT NULL) AND (api_service IS NULL) AND (api_base_url IS NULL) AND (api_resource_id IS NULL) AND (api_resource_format IS NULL) AND (parquet_cache_status IS NULL) AND (parquet_cache_folder_path IS NULL)))) not valid;

alter table "public"."data_catalog_listings" validate constraint "data_catalog_listings__pipeline_access_complete";

