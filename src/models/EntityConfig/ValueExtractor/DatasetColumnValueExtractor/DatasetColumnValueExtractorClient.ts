import { createSupabaseCRUDClient } from "@/lib/clients/supabase/createSupabaseCRUDClient";
import { DatasetColumnValueExtractorParsers } from "./parsers";

/**
 * Client for managing dataset column value extractor configurations
 */
export const DatasetColumnValueExtractorClient = createSupabaseCRUDClient({
  modelName: "DatasetColumnValueExtractor",
  tableName: "value_extractors__dataset_column_value",
  dbTablePrimaryKey: "id",
  parsers: DatasetColumnValueExtractorParsers,
});
