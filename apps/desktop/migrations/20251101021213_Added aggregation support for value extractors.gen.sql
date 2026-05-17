-- Generated from supabase/migrations/20251101021213_Added aggregation support for value extractors.sql by
-- apps/desktop/scripts/gen-sqlite-migrations.ts. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 9
-- Statements dropped (RLS/funcs/triggers/data/etc.): 42
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 6
DROP INDEX IF EXISTS "idx_value_extractors__aggregation__entity_field_config_id_works";

DROP INDEX IF EXISTS "value_extractors__aggregation_entity_field_config_id_key";

DROP INDEX IF EXISTS "value_extractors__aggregation_pkey";

DROP TABLE "value_extractors__aggregation";

ALTER TABLE "entity_field_configs" DROP COLUMN "base_data_type";

ALTER TABLE "entity_field_configs" DROP COLUMN "class";

ALTER TABLE "entity_field_configs" ADD COLUMN "data_type" datasets__ava_data_type NOT NULL;

ALTER TABLE "value_extractors__dataset_column_value" DROP COLUMN "dataset_field_id";

ALTER TABLE "value_extractors__dataset_column_value" ADD COLUMN "dataset_column_id" UUID NOT NULL;
