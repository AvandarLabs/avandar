import { DatasetColumnMappingParsers } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappingParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";

/**
 * Client for managing dataset column value mapping configurations
 */
export const DatasetColumnMappingClient = createRdbCrudClient({
  modelName: "DatasetColumnMapping",
  tableName: "attribute_mappings__dataset_column",
  dbTablePrimaryKey: "id",
  parsers: DatasetColumnMappingParsers,
});
