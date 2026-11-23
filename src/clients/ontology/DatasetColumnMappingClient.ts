import { DatasetColumnMappingParsers } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappingParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";

/**
 * Manages dataset column value mapping configurations.
 * Use it, for example, to read column mappings for a concept attribute.
 */
export const DatasetColumnMappingClient = createRdbCrudClient({
  modelName: "DatasetColumnMapping",
  tableName: "attribute_mappings__dataset_column",
  dbTablePrimaryKey: "id",
  parsers: DatasetColumnMappingParsers,
});
