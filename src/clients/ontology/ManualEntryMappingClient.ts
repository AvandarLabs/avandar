import { ManualEntryMappingParsers } from "$/models/ontology/AttributeMapping/ManualEntryMapping/ManualEntryMappingParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";

/**
 * Client for managing manual entry mapping configurations
 */
export const ManualEntryMappingClient = createRdbCrudClient({
  modelName: "ManualEntryMapping",
  tableName: "attribute_mappings__manual_entry",
  dbTablePrimaryKey: "id",
  parsers: ManualEntryMappingParsers,
});
