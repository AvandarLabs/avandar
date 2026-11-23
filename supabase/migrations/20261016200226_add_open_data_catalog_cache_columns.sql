alter type "public"."catalog_entries__open_data__api_service" rename to "catalog_entries__open_data__api_service__old_version_to_be_dropped";

create type "public"."catalog_entries__open_data__api_service" as enum ('ckan', 'socrata');

alter table "public"."catalog_entries__open_data" alter column api_service type "public"."catalog_entries__open_data__api_service" using api_service::text::"public"."catalog_entries__open_data__api_service";

drop type "public"."catalog_entries__open_data__api_service__old_version_to_be_dropped";

alter table "public"."catalog_entries__open_data" drop constraint "catalog_entries__open_data__pipeline_access_complete";

alter table "public"."catalog_entries__open_data" add column "cached_at" timestamp with time zone;

alter table "public"."catalog_entries__open_data" add column "cached_object_path" text;

alter table "public"."catalog_entries__open_data" add column "cached_source_version" text;

alter table "public"."catalog_entries__open_data" add constraint "catalog_entries__open_data__cache_complete" CHECK ((((cached_object_path IS NULL) AND (cached_source_version IS NULL) AND (cached_at IS NULL)) OR ((cached_object_path IS NOT NULL) AND (cached_source_version IS NOT NULL) AND (cached_at IS NOT NULL)))) not valid;

alter table "public"."catalog_entries__open_data" validate constraint "catalog_entries__open_data__cache_complete";

alter table "public"."catalog_entries__open_data" add constraint "catalog_entries__open_data__pipeline_access_complete" CHECK (((access_kind <> 'pipeline_parquet'::public.catalog_entries__open_data__access_kind) OR ((parquet_file_name IS NOT NULL) AND (pipeline_name IS NOT NULL) AND (pipeline_run_id IS NOT NULL) AND (api_service IS NULL) AND (api_base_url IS NULL) AND (api_resource_id IS NULL) AND (api_resource_format IS NULL) AND (cached_object_path IS NULL) AND (cached_source_version IS NULL) AND (cached_at IS NULL)))) not valid;

alter table "public"."catalog_entries__open_data" validate constraint "catalog_entries__open_data__pipeline_access_complete";
