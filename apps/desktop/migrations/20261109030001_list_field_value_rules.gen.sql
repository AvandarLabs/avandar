-- Generated from supabase/migrations/20261109030001_list_field_value_rules.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 0
-- Statements dropped (RLS/funcs/triggers/data/etc.): 2
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 1
-- SQLite override. The Postgres migration relaxes NOT NULL on
-- `value_picker_rule_type`, which SQLite's ALTER TABLE cannot do: it supports
-- RENAME / ADD COLUMN / DROP COLUMN only, so the table is rebuilt. The
-- generator routes ALTER COLUMN to needsHandEdit for exactly this reason.
--
-- Relaxing it is not cosmetic drift. `attribute_mappings__dataset_column` is
-- listed in apps/desktop/sync/syncable-tables.ts, so rows arrive here from
-- Postgres, and a field that keeps every value stores no value rule. Left NOT
-- NULL, its insert would fail on the desktop client only.
--
-- The rebuilt table keeps the column order, declared types, and index names the
-- earlier generated migrations gave it. The Postgres function body has no
-- SQLite equivalent and is dropped, like every other function.
--
create table "attribute_mappings__dataset_column__rebuild" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "concept_attribute_id" UUID NOT NULL,
  "value_picker_rule_type" value_extractors__value_picker_rule_type,
  "dataset_id" UUID NOT NULL,
  "dataset_column_id" UUID NOT NULL
);

insert into
  "attribute_mappings__dataset_column__rebuild" (
    "id",
    "workspace_id",
    "created_at",
    "updated_at",
    "concept_attribute_id",
    "value_picker_rule_type",
    "dataset_id",
    "dataset_column_id"
  )
select
  "id",
  "workspace_id",
  "created_at",
  "updated_at",
  "concept_attribute_id",
  "value_picker_rule_type",
  "dataset_id",
  "dataset_column_id"
from
  "attribute_mappings__dataset_column";

drop table "attribute_mappings__dataset_column";

alter table "attribute_mappings__dataset_column__rebuild" rename to "attribute_mappings__dataset_column";

create unique index "value_extractors__dataset_column_value_pkey" on "attribute_mappings__dataset_column" ("id");

create unique index "value_extractors__dataset_column_val_entity_field_config_id_key" on "attribute_mappings__dataset_column" ("concept_attribute_id");

create index "idx_attribute_mappings__dataset_column__attribute_workspace" on "attribute_mappings__dataset_column" ("concept_attribute_id", "workspace_id");
