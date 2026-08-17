-- Renames the entity domain to Description Logic nomenclature.
--
--   entity_configs                          -> concepts
--   entity_field_configs                    -> concept_attributes
--   entities                                -> individuals
--   value_extractors__dataset_column_value  -> attribute_mappings__dataset_column
--   value_extractors__manual_entry          -> attribute_mappings__manual_entry
--
-- This migration is hand-written. `supabase db diff` cannot detect a rename,
-- so the generated version dropped all five tables and recreated them empty,
-- which would destroy every workspace's concepts and individuals. Every
-- statement below is a metadata-only rename: no table is rewritten and no row
-- is touched. The resulting object names match what a fresh `db diff` against
-- `supabase/schemas/` produces, so a diff taken after this migration is empty.

-- Tables.
alter table public.entity_configs
rename to concepts;

alter table public.entity_field_configs
rename to concept_attributes;

alter table public.entities
rename to individuals;

alter table public.value_extractors__dataset_column_value
rename to attribute_mappings__dataset_column;

alter table public.value_extractors__manual_entry
rename to attribute_mappings__manual_entry;

-- Enum types. The `dataset_column_value` member loses its `_value` suffix so
-- it matches the table it discriminates.
alter type public.entity_field_configs__value_extractor_type
rename to concept_attributes__mapping_type;

alter type public.concept_attributes__mapping_type
rename value 'dataset_column_value' to 'dataset_column';

alter type public.value_extractors__value_picker_rule_type
rename to attribute_mappings__value_picker_rule_type;

-- Columns.
alter table public.concept_attributes
rename column entity_config_id to concept_id;

alter table public.concept_attributes
rename column value_extractor_type to mapping_type;

alter table public.concept_attributes
rename column is_title_field to is_label;

alter table public.concept_attributes
rename column is_id_field to is_identifier;

alter table public.individuals
rename column entity_config_id to concept_id;

alter table public.attribute_mappings__dataset_column
rename column entity_field_config_id to concept_attribute_id;

alter table public.attribute_mappings__manual_entry
rename column entity_field_config_id to concept_attribute_id;

-- Constraints. Renaming a primary key or unique constraint renames its backing
-- index along with it, so those indexes are not renamed separately below.
alter table public.concepts
rename constraint entity_configs_pkey to concepts_pkey;

alter table public.concepts
rename constraint entity_configs_owner_id_fkey to concepts_owner_id_fkey;

alter table public.concepts
rename constraint entity_configs_workspace_id_fkey to concepts_workspace_id_fkey;

alter table public.concept_attributes
rename constraint entity_field_configs_pkey to concept_attributes_pkey;

alter table public.concept_attributes
rename constraint entity_field_configs_entity_config_id_fkey to concept_attributes_concept_id_fkey;

alter table public.concept_attributes
rename constraint entity_field_configs_workspace_id_fkey to concept_attributes_workspace_id_fkey;

alter table public.individuals
rename constraint entities_pkey to individuals_pkey;

alter table public.individuals
rename constraint entities__entity_config_external_id_unique to individuals__concept_external_id_unique;

alter table public.individuals
rename constraint entities_assigned_to_fkey to individuals_assigned_to_fkey;

alter table public.individuals
rename constraint entities_entity_config_id_fkey to individuals_concept_id_fkey;

alter table public.individuals
rename constraint entities_workspace_id_fkey to individuals_workspace_id_fkey;

alter table public.attribute_mappings__dataset_column
rename constraint value_extractors__dataset_column_value_pkey to attribute_mappings__dataset_column_pkey;

alter table public.attribute_mappings__dataset_column
rename constraint value_extractors__dataset_column_va_entity_field_config_id_fkey to attribute_mappings__dataset_column_concept_attribute_id_fkey;

alter table public.attribute_mappings__dataset_column
rename constraint value_extractors__dataset_column_val_entity_field_config_id_key to attribute_mappings__dataset_column_concept_attribute_id_key;

alter table public.attribute_mappings__dataset_column
rename constraint value_extractors__dataset_column_value_workspace_id_fkey to attribute_mappings__dataset_column_workspace_id_fkey;

alter table public.attribute_mappings__manual_entry
rename constraint value_extractors__manual_entry_pkey to attribute_mappings__manual_entry_pkey;

alter table public.attribute_mappings__manual_entry
rename constraint value_extractors__manual_entry_entity_field_config_id_fkey to attribute_mappings__manual_entry_concept_attribute_id_fkey;

alter table public.attribute_mappings__manual_entry
rename constraint value_extractors__manual_entry_entity_field_config_id_key to attribute_mappings__manual_entry_concept_attribute_id_key;

alter table public.attribute_mappings__manual_entry
rename constraint value_extractors__manual_entry_workspace_id_fkey to attribute_mappings__manual_entry_workspace_id_fkey;

-- Plain indexes. These are dropped and recreated rather than renamed with
-- `alter index`, which SQLite has no equivalent for: the desktop mirror
-- replays this history through the Postgres-to-SQLite generator, and a
-- statement it cannot express would leave the local schema carrying the old
-- index names forever. Drop-and-create costs a rebuild of four small indexes
-- and keeps both engines in step.
drop index public.idx_entity_configs__workspace_id;

create index idx_concepts__workspace_id on public.concepts (workspace_id);

drop index public.idx_entity_field_configs__entity_config_id_workspace_id;

create index idx_concept_attributes__concept_id_workspace_id on public.concept_attributes (concept_id, workspace_id);

drop index public.idx_dataset_column_value_extractors__efc_id_workspace_id;

create index idx_attribute_mappings__dataset_column__attribute_workspace on public.attribute_mappings__dataset_column (concept_attribute_id, workspace_id);

drop index public.idx_manual_entry_value_extractors__efc_id_workspace_id;

create index idx_attribute_mappings__manual_entry__attribute_workspace on public.attribute_mappings__manual_entry (concept_attribute_id, workspace_id);

-- Triggers.
alter trigger tr_entity_config__set_updated_at on public.concepts
rename to tr_concept__set_updated_at;

alter trigger tr_entity_field_config__set_updated_at on public.concept_attributes
rename to tr_concept_attribute__set_updated_at;

alter trigger tr_entities__set_updated_at on public.individuals
rename to tr_individuals__set_updated_at;

alter trigger tr_value_extractors__dataset_column_value_set_updated_at on public.attribute_mappings__dataset_column
rename to tr_attribute_mappings__dataset_column_set_updated_at;

alter trigger tr_value_extractors__manual_entry_set_updated_at on public.attribute_mappings__manual_entry
rename to tr_attribute_mappings__manual_entry_set_updated_at;

alter trigger tr_entity_field_configs__validate_title_id_fields on public.concept_attributes
rename to tr_concept_attributes__validate_label_and_identifiers;

-- Policies.
alter policy "User can SELECT entity_configs" on public.concepts
rename to "User can SELECT concepts";

alter policy "
  User can INSERT entity_configs
" on public.concepts rename to "
  User can INSERT concepts
";

alter policy "User can UPDATE entity_configs" on public.concepts
rename to "User can UPDATE concepts";

alter policy "
  User can DELETE entity_configs
" on public.concepts rename to "
  User can DELETE concepts
";

alter policy "
  User can SELECT entity_field_configs
" on public.concept_attributes rename to "
  User can SELECT concept_attributes
";

alter policy "
  User can INSERT entity_field_configs
" on public.concept_attributes rename to "
  User can INSERT concept_attributes
";

alter policy "
  User can UPDATE entity_field_configs
" on public.concept_attributes rename to "
  User can UPDATE concept_attributes
";

alter policy "
  User can DELETE entity_field_configs
" on public.concept_attributes rename to "
  User can DELETE concept_attributes
";

alter policy "User can SELECT entities in their workspace" on public.individuals
rename to "User can SELECT individuals in their workspace";

alter policy "User can INSERT entities in their workspace" on public.individuals
rename to "User can INSERT individuals in their workspace";

alter policy "User can UPDATE entities in their workspace" on public.individuals
rename to "User can UPDATE individuals in their workspace";

alter policy "User can DELETE entities in their workspace" on public.individuals
rename to "User can DELETE individuals in their workspace";

alter policy "
  User can SELECT value_extractors__dataset_column_value
" on public.attribute_mappings__dataset_column rename to "
  User can SELECT attribute_mappings__dataset_column
";

alter policy "
  User can INSERT value_extractors__dataset_column_value
" on public.attribute_mappings__dataset_column rename to "
  User can INSERT attribute_mappings__dataset_column
";

alter policy "
  User can UPDATE value_extractors__dataset_column_value
" on public.attribute_mappings__dataset_column rename to "
  User can UPDATE attribute_mappings__dataset_column
";

alter policy "
  User can DELETE value_extractors__dataset_column_value
" on public.attribute_mappings__dataset_column rename to "
  User can DELETE attribute_mappings__dataset_column
";

alter policy "
  User can SELECT value_extractors__manual_entry
" on public.attribute_mappings__manual_entry rename to "
  User can SELECT attribute_mappings__manual_entry
";

alter policy "
  User can INSERT value_extractors__manual_entry
" on public.attribute_mappings__manual_entry rename to "
  User can INSERT attribute_mappings__manual_entry
";

alter policy "
  User can UPDATE value_extractors__manual_entry
" on public.attribute_mappings__manual_entry rename to "
  User can UPDATE attribute_mappings__manual_entry
";

alter policy "
  User can DELETE value_extractors__manual_entry
" on public.attribute_mappings__manual_entry rename to "
  User can DELETE attribute_mappings__manual_entry
";

-- The validation function is renamed rather than dropped so the trigger above
-- keeps pointing at it, then replaced so its body reads the renamed columns.
alter function public.entity_field_configs__validate_title_and_id_fields ()
rename to concept_attributes__validate_label_and_identifiers;

create or replace function public.concept_attributes__validate_label_and_identifiers () returns trigger as $$
begin
  -- Count label attributes for this concept
  if (
    select count(*)
    from public.concept_attributes
    where
      public.concept_attributes.concept_id = new.concept_id and
    	public.concept_attributes.is_label
  ) != 1 then
    raise exception 'There must be exactly one label attribute per concept';
  end if;

  -- For attributes mapped from datasets, ensure each source dataset
  -- is associated with exactly one identifier attribute.
  if exists(
    select 1
    from public.concept_attributes attribute
    join public.attribute_mappings__dataset_column dataset_col_mapping
      on attribute.id = dataset_col_mapping.concept_attribute_id
    where attribute.concept_id = new.concept_id
    group by dataset_col_mapping.dataset_id
    having
      count(
        case when attribute.is_identifier then 1 end
      ) != 1
  ) then
    raise exception 'Each dataset must have exactly one identifier attribute.';
  end if;
  return new;
end;
$$ language plpgsql;
