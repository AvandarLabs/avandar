/**
 * What kind of workspace record a plugin's data slot reads.
 *
 * Enum values:
 *
 * `concept` - A case type, read through its `concept_<id>` view.
 *
 * `dataset` - A dataset, read through its own relation.
 *
 * Note: Keep new values at the end. Moving one is not a rename, it forces a
 * full rebuild of the type and a rewrite of every column using it.
 */
create type public.plugin_data_slot_bindings__source_type as enum('concept', 'dataset');
