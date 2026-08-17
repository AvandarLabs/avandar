import type { DatasetColumnMappingModel } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types.ts";
import type { ManualEntryMappingModel } from "$/models/ontology/AttributeMapping/ManualEntryMapping/ManualEntryMapping.types.ts";
import type { Enums } from "$/types/database.types.ts";

export type AttributeMappingType = Enums<"concept_attributes__mapping_type">;

/**
 * Registry that maps mapping types to their CRUD model definitions.
 */
export type AttributeMappingModelRegistry = {
  manual_entry: ManualEntryMappingModel;
  dataset_column: DatasetColumnMappingModel;
};

/**
 * Attribute mapping registry to access a mapping model with a CRUD
 * method passed as a generic.
 */
export type AttributeMappingRegistry<
  T extends "Read" | "Insert" | "Update" = "Read",
> = {
  [K in AttributeMappingType]: AttributeMappingModelRegistry[K][T];
};

/**
 * Get an attribute mapping model with a CRUD method and AttributeMappingType
 * passed as generics. This is a helpful type to also get the union of all
 * mapping models given a CRUD method.
 *
 * For example:
 * ```
 * // Union of all attribute mapping "Read" models
 * AttributeMapping<"Read">
 * ```
 */
export type AttributeMapping<
  T extends "Read" | "Insert" | "Update" = "Read",
  MappingType extends AttributeMappingType = AttributeMappingType,
> = AttributeMappingRegistry<T>[MappingType];

export type AttributeMappingId =
  AttributeMappingRegistry<"Read">[AttributeMappingType]["id"];
