alter type "public"."catalog_entries__open_data__api_service" rename to "catalog_entries__open_data__api_service__old_version_to_be_dropped";

create type "public"."catalog_entries__open_data__api_service" as enum ('ckan', 'socrata');

alter table "public"."catalog_entries__open_data" alter column api_service type "public"."catalog_entries__open_data__api_service" using api_service::text::"public"."catalog_entries__open_data__api_service";

drop type "public"."catalog_entries__open_data__api_service__old_version_to_be_dropped";

