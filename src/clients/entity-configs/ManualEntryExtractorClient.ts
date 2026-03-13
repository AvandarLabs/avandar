import { createSupabaseCRUDClient } from "@clients/SupabaseCRUDClient/createSupabaseCRUDClient";
import { ManualEntryExtractorParsers } from "$/models/EntityConfig/ValueExtractor/ManualEntryExtractor/ManualEntryExtractorParsers";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";

/**
 * Client for managing manual entry extractor configurations
 */
export const ManualEntryExtractorClient = createSupabaseCRUDClient({
  dbClient: AvaSupabase.DB,
  modelName: "ManualEntryExtractor",
  tableName: "value_extractors__manual_entry",
  dbTablePrimaryKey: "id",
  parsers: ManualEntryExtractorParsers,
});
