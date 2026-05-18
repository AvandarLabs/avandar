-- Generated from supabase/migrations/20251101021213_Added aggregation support for value extractors.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 9
-- Statements dropped (RLS/funcs/triggers/data/etc.): 42
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 6
drop index if exists "idx_value_extractors__aggregation__entity_field_config_id_works";

drop index if exists "value_extractors__aggregation_entity_field_config_id_key";

drop index if exists "value_extractors__aggregation_pkey";

drop table "value_extractors__aggregation";

alter table "entity_field_configs"
drop column "base_data_type";

alter table "entity_field_configs"
drop column "class";

alter table "entity_field_configs"
add column "data_type" datasets__ava_data_type not null;

alter table "value_extractors__dataset_column_value"
drop column "dataset_field_id";

alter table "value_extractors__dataset_column_value"
add column "dataset_column_id" uuid not null;
