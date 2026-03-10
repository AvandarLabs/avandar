import { createSupabaseCRUDClient } from "@avandar/clients";
import { DatasetColumnValueExtractorParsers } from "$/models/EntityConfig/ValueExtractor/DatasetColumnValueExtractor/DatasetColumnValueExtractorParsers";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";

/**
 * Client for managing dataset column value extractor configurations
 */
export const DatasetColumnValueExtractorClient = createSupabaseCRUDClient({
  dbClient: AvaSupabase.DB,
  modelName: "DatasetColumnValueExtractor",
  tableName: "value_extractors__dataset_column_value",
  dbTablePrimaryKey: "id",
  parsers: DatasetColumnValueExtractorParsers,
});
