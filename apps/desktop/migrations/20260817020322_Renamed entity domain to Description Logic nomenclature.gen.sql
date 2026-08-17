-- Generated from supabase/migrations/20260817020322_Renamed entity domain to Description Logic nomenclature.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 20
-- Statements dropped (RLS/funcs/triggers/data/etc.): 50
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
ALTER TABLE entity_configs RENAME TO concepts;

ALTER TABLE entity_field_configs RENAME TO concept_attributes;

ALTER TABLE entities RENAME TO individuals;

ALTER TABLE value_extractors__dataset_column_value RENAME TO attribute_mappings__dataset_column;

ALTER TABLE value_extractors__manual_entry RENAME TO attribute_mappings__manual_entry;

ALTER TABLE concept_attributes RENAME COLUMN entity_config_id TO concept_id;

ALTER TABLE concept_attributes RENAME COLUMN value_extractor_type TO mapping_type;

ALTER TABLE concept_attributes RENAME COLUMN is_title_field TO is_label;

ALTER TABLE concept_attributes RENAME COLUMN is_id_field TO is_identifier;

ALTER TABLE individuals RENAME COLUMN entity_config_id TO concept_id;

ALTER TABLE attribute_mappings__dataset_column RENAME COLUMN entity_field_config_id TO concept_attribute_id;

ALTER TABLE attribute_mappings__manual_entry RENAME COLUMN entity_field_config_id TO concept_attribute_id;

DROP INDEX idx_entity_configs__workspace_id;

CREATE INDEX idx_concepts__workspace_id ON concepts(workspace_id);

DROP INDEX idx_entity_field_configs__entity_config_id_workspace_id;

CREATE INDEX idx_concept_attributes__concept_id_workspace_id ON concept_attributes(concept_id, workspace_id);

DROP INDEX idx_dataset_column_value_extractors__efc_id_workspace_id;

CREATE INDEX idx_attribute_mappings__dataset_column__attribute_workspace ON attribute_mappings__dataset_column(concept_attribute_id, workspace_id);

DROP INDEX idx_manual_entry_value_extractors__efc_id_workspace_id;

CREATE INDEX idx_attribute_mappings__manual_entry__attribute_workspace ON attribute_mappings__manual_entry(concept_attribute_id, workspace_id);
