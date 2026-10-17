drop index if exists "public"."catalog_entries__open_data__api_resource_unique";

CREATE UNIQUE INDEX catalog_entries__open_data__api_resource_unique ON public.catalog_entries__open_data USING btree (api_service, api_base_url, external_dataset_id, api_resource_id);

