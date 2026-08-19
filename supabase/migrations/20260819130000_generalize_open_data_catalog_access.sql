create type "public"."catalog_entries__open_data__access_kind" as enum ('pipeline_parquet', 'api_resource');

create type "public"."catalog_entries__open_data__api_service" as enum ('ckan');

alter table "public"."catalog_entries__open_data" add column "access_kind" public.catalog_entries__open_data__access_kind not null default 'pipeline_parquet'::public.catalog_entries__open_data__access_kind;

alter table "public"."catalog_entries__open_data" add column "api_base_url" text;

alter table "public"."catalog_entries__open_data" add column "api_resource_format" text;

alter table "public"."catalog_entries__open_data" add column "api_resource_id" text;

alter table "public"."catalog_entries__open_data" add column "api_service" public.catalog_entries__open_data__api_service;

alter table "public"."catalog_entries__open_data" alter column "parquet_file_name" drop not null;

alter table "public"."catalog_entries__open_data" alter column "pipeline_name" drop not null;

alter table "public"."catalog_entries__open_data" alter column "pipeline_run_id" drop not null;

CREATE UNIQUE INDEX catalog_entries__open_data__api_resource_unique ON public.catalog_entries__open_data USING btree (api_service, api_base_url, external_dataset_id, api_resource_id) WHERE (access_kind = 'api_resource'::public.catalog_entries__open_data__access_kind);

alter table "public"."catalog_entries__open_data" add constraint "catalog_entries__open_data__api_access_complete" CHECK (((access_kind <> 'api_resource'::public.catalog_entries__open_data__access_kind) OR ((api_service IS NOT NULL) AND (api_base_url IS NOT NULL) AND (api_resource_id IS NOT NULL) AND (api_resource_format IS NOT NULL) AND (external_dataset_id IS NOT NULL) AND (parquet_file_name IS NULL) AND (pipeline_name IS NULL) AND (pipeline_run_id IS NULL)))) not valid;

alter table "public"."catalog_entries__open_data" validate constraint "catalog_entries__open_data__api_access_complete";

alter table "public"."catalog_entries__open_data" add constraint "catalog_entries__open_data__api_base_url_is_https" CHECK (((api_base_url IS NULL) OR (api_base_url ~~ 'https://%'::text))) not valid;

alter table "public"."catalog_entries__open_data" validate constraint "catalog_entries__open_data__api_base_url_is_https";

alter table "public"."catalog_entries__open_data" add constraint "catalog_entries__open_data__pipeline_access_complete" CHECK (((access_kind <> 'pipeline_parquet'::public.catalog_entries__open_data__access_kind) OR ((parquet_file_name IS NOT NULL) AND (pipeline_name IS NOT NULL) AND (pipeline_run_id IS NOT NULL) AND (api_service IS NULL) AND (api_base_url IS NULL) AND (api_resource_id IS NULL) AND (api_resource_format IS NULL)))) not valid;

alter table "public"."catalog_entries__open_data" validate constraint "catalog_entries__open_data__pipeline_access_complete";

