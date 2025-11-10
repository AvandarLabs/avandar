drop trigger if exists "tr_value_extractors__aggregation_set_updated_at" on "public"."value_extractors__aggregation";

drop policy "
  User can DELETE value_extractors__aggregation
" on "public"."value_extractors__aggregation";

drop policy "
  User can INSERT value_extractors__aggregation
" on "public"."value_extractors__aggregation";

drop policy "
  User can SELECT value_extractors__aggregation
" on "public"."value_extractors__aggregation";

drop policy "
  User can UPDATE value_extractors__aggregation
" on "public"."value_extractors__aggregation";

revoke delete on table "public"."value_extractors__aggregation" from "anon";

revoke insert on table "public"."value_extractors__aggregation" from "anon";

revoke references on table "public"."value_extractors__aggregation" from "anon";

revoke select on table "public"."value_extractors__aggregation" from "anon";

revoke trigger on table "public"."value_extractors__aggregation" from "anon";

revoke truncate on table "public"."value_extractors__aggregation" from "anon";

revoke update on table "public"."value_extractors__aggregation" from "anon";

revoke delete on table "public"."value_extractors__aggregation" from "authenticated";

revoke insert on table "public"."value_extractors__aggregation" from "authenticated";

revoke references on table "public"."value_extractors__aggregation" from "authenticated";

revoke select on table "public"."value_extractors__aggregation" from "authenticated";

revoke trigger on table "public"."value_extractors__aggregation" from "authenticated";

revoke truncate on table "public"."value_extractors__aggregation" from "authenticated";

revoke update on table "public"."value_extractors__aggregation" from "authenticated";

revoke delete on table "public"."value_extractors__aggregation" from "service_role";

revoke insert on table "public"."value_extractors__aggregation" from "service_role";

revoke references on table "public"."value_extractors__aggregation" from "service_role";

revoke select on table "public"."value_extractors__aggregation" from "service_role";

revoke trigger on table "public"."value_extractors__aggregation" from "service_role";

revoke truncate on table "public"."value_extractors__aggregation" from "service_role";

revoke update on table "public"."value_extractors__aggregation" from "service_role";

alter table "public"."entity_field_configs" drop constraint "metrics_cant_be_ids";

alter table "public"."entity_field_configs" drop constraint "metrics_cant_be_titles";

alter table "public"."entity_field_configs" drop constraint "metrics_dont_allow_manual_edit";

alter table "public"."value_extractors__aggregation" drop constraint "value_extractors__aggregation_entity_field_config_id_fkey";

alter table "public"."value_extractors__aggregation" drop constraint "value_extractors__aggregation_entity_field_config_id_key";

alter table "public"."value_extractors__aggregation" drop constraint "value_extractors__aggregation_workspace_id_fkey";

alter table "public"."value_extractors__aggregation" drop constraint "value_extractors__aggregation_pkey";

drop index if exists "public"."idx_value_extractors__aggregation__entity_field_config_id_works";

drop index if exists "public"."value_extractors__aggregation_entity_field_config_id_key";

drop index if exists "public"."value_extractors__aggregation_pkey";

drop table "public"."value_extractors__aggregation";

alter type "public"."entity_field_configs__value_extractor_type" rename to "entity_field_configs__value_extractor_type__old_version_to_be_dropped";

create type "public"."entity_field_configs__value_extractor_type" as enum ('dataset_column_value', 'manual_entry');

alter type "public"."value_extractors__value_picker_rule_type" rename to "value_extractors__value_picker_rule_type__old_version_to_be_dropped";

create type "public"."value_extractors__value_picker_rule_type" as enum ('most_frequent', 'first', 'sum', 'avg', 'count', 'max', 'min');

alter table "public"."entity_field_configs" alter column value_extractor_type type "public"."entity_field_configs__value_extractor_type" using value_extractor_type::text::"public"."entity_field_configs__value_extractor_type";

alter table "public"."value_extractors__dataset_column_value" alter column value_picker_rule_type type "public"."value_extractors__value_picker_rule_type" using value_picker_rule_type::text::"public"."value_extractors__value_picker_rule_type";

drop type "public"."entity_field_configs__value_extractor_type__old_version_to_be_dropped";

drop type "public"."value_extractors__value_picker_rule_type__old_version_to_be_dropped";

alter table "public"."entity_field_configs" drop column "base_data_type";

alter table "public"."entity_field_configs" drop column "class";

alter table "public"."entity_field_configs" add column "data_type" datasets__ava_data_type not null;

alter table "public"."entity_field_configs" alter column "allow_manual_edit" drop default;

alter table "public"."entity_field_configs" alter column "is_array" set not null;

alter table "public"."entity_field_configs" alter column "is_id_field" drop default;

alter table "public"."entity_field_configs" alter column "is_title_field" drop default;

alter table "public"."value_extractors__dataset_column_value" drop column "dataset_field_id";

alter table "public"."value_extractors__dataset_column_value" add column "dataset_column_id" uuid not null;

drop type "public"."entity_field_configs__base_data_type";

drop type "public"."entity_field_configs__class";

drop type "public"."value_extractors__aggregation_type";


