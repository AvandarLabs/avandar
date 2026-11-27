import { ManualEntryMappingParsers } from "$/models/ontology/AttributeMapping/ManualEntryMapping/ManualEntryMappingParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";

/**
 * CRUD client for manual entry mapping configurations.
 * Use it, for example, to retrieve or insert manual entry mappings.
 */
export const ManualEntryMappingClient = createRdbCrudClient({
  modelName: "ManualEntryMapping",
  tableName: "attribute_mappings__manual_entry",
  dbTablePrimaryKey: "id",
  parsers: ManualEntryMappingParsers,
});
