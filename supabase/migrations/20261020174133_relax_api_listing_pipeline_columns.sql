alter table "public"."data_catalog_listings" drop constraint "data_catalog_listings__api_access_complete";

CREATE INDEX data_catalog_listings__pipeline_drive_last_update ON public.data_catalog_listings USING btree (pipeline_name, api_base_url, date_of_last_update);

alter table "public"."data_catalog_listings" add constraint "data_catalog_listings__api_access_complete" CHECK (((access_kind <> 'api_resource'::public.data_catalog_listings__access_kind) OR ((api_service IS NOT NULL) AND (api_base_url IS NOT NULL) AND (api_resource_id IS NOT NULL) AND (api_resource_format IS NOT NULL) AND (external_dataset_id IS NOT NULL) AND (parquet_file_name IS NULL)))) not valid;

alter table "public"."data_catalog_listings" validate constraint "data_catalog_listings__api_access_complete";

