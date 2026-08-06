import { ManualEntryExtractorParsers } from "$/models/EntityConfig/ValueExtractor/ManualEntryExtractor/ManualEntryExtractorParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";

/**
 * Client for managing manual entry extractor configurations
 */
export const ManualEntryExtractorClient = createRdbCrudClient({
  modelName: "ManualEntryExtractor",
  tableName: "value_extractors__manual_entry",
  dbTablePrimaryKey: "id",
  parsers: ManualEntryExtractorParsers,
});
