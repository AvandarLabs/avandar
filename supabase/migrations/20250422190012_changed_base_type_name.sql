create type "public"."entity_field_config__base_data_type" as enum ('string', 'number', 'date');

alter table "public"."entity_field_configs" drop column "base_type";

alter table "public"."entity_field_configs" add column "base_data_type" entity_field_config__base_data_type not null;

drop type "public"."entity_field_config__base_type";


