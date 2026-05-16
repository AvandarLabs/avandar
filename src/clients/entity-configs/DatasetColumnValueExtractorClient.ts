import { createRdbCrudClient } from "@clients/RdbCrudClient/createRdbCrudClient";
import { DatasetColumnValueExtractorParsers } from "$/models/EntityConfig/ValueExtractor/DatasetColumnValueExtractor/DatasetColumnValueExtractorParsers";

/**
 * Client for managing dataset column value extractor configurations
 */
export const DatasetColumnValueExtractorClient = createRdbCrudClient({
  modelName: "DatasetColumnValueExtractor",
  tableName: "value_extractors__dataset_column_value",
  dbTablePrimaryKey: "id",
  parsers: DatasetColumnValueExtractorParsers,
});
