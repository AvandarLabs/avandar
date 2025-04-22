create type "public"."entity_field_config__value_extractor_type" as enum ('adjacent_field', 'manual_entry', 'aggregation');

alter table "public"."entity_field_configs" drop column "extractor_type";

alter table "public"."entity_field_configs" add column "value_extractor_type" entity_field_config__value_extractor_type not null;

drop type "public"."entity_field_config__extractor_type";


