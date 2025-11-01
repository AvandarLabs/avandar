import { createSupabaseCRUDClient } from "@/lib/clients/supabase/createSupabaseCRUDClient";
import { DatasetColumnValueExtractorParsers } from "../../models/EntityConfig/ValueExtractor/DatasetColumnValueExtractor/DatasetColumnValueExtractorParsers";

/**
 * Client for managing dataset column value extractor configurations
 */
export const DatasetColumnValueExtractorClient = createSupabaseCRUDClient({
  modelName: "DatasetColumnValueExtractor",
  tableName: "value_extractors__dataset_column_value",
  dbTablePrimaryKey: "id",
  parsers: DatasetColumnValueExtractorParsers,
});
