create type "public"."entity_field_config__base_type" as enum ('string', 'number', 'date');

create type "public"."entity_field_config__class" as enum ('dimension', 'metric');

create type "public"."entity_field_config__extractor_type" as enum ('adjacent_field', 'manual_entry', 'aggregation');

create type "public"."value_extractor_config__aggregation_type" as enum ('sum', 'max', 'count');

create type "public"."value_extractor_config__value_picker_rule_type" as enum ('most_frequent', 'first');

alter table "public"."entity_field_configs" drop constraint "entity_field_configs_class_check";

alter table "public"."entity_field_configs" drop constraint "entity_field_configs_extractor_type_check";

alter table "public"."value_extractor_config__adjacent_field" drop constraint "value_extractor_config__adjacent_field_value_picker_rule_check";

alter table "public"."value_extractor_config__aggregation" drop constraint "value_extractor_config__aggregation_aggregation_type_check";

alter table "public"."entity_field_configs" drop constraint "id_field_is_dimension";

alter table "public"."entity_field_configs" drop constraint "title_field_is_dimension";

alter table "public"."entity_field_configs" alter column "base_type" set data type entity_field_config__base_type using "base_type"::entity_field_config__base_type;

alter table "public"."entity_field_configs" alter column "class" set data type entity_field_config__class using "class"::entity_field_config__class;

alter table "public"."entity_field_configs" alter column "extractor_type" set data type entity_field_config__extractor_type using "extractor_type"::entity_field_config__extractor_type;

alter table "public"."value_extractor_config__adjacent_field" drop column "value_picker_rule";

alter table "public"."value_extractor_config__adjacent_field" add column "value_picker_rule_type" value_extractor_config__value_picker_rule_type not null;

alter table "public"."value_extractor_config__aggregation" alter column "aggregation_type" set data type value_extractor_config__aggregation_type using "aggregation_type"::value_extractor_config__aggregation_type;

alter table "public"."entity_field_configs" add constraint "id_field_is_dimension" CHECK ((is_id_field AND (class = 'dimension'::entity_field_config__class))) not valid;

alter table "public"."entity_field_configs" validate constraint "id_field_is_dimension";

alter table "public"."entity_field_configs" add constraint "title_field_is_dimension" CHECK ((is_title_field AND (class = 'dimension'::entity_field_config__class))) not valid;

alter table "public"."entity_field_configs" validate constraint "title_field_is_dimension";


