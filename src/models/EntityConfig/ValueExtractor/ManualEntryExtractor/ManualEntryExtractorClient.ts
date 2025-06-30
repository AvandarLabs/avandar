import { createSupabaseCRUDClient } from "@/lib/clients/supabase/SupabaseCRUDClient";
import { ManualEntryExtractorParsers } from "./parsers";

/**
 * Client for managing manual entry extractor configurations
 */
export const ManualEntryExtractorClient = createSupabaseCRUDClient({
  modelName: "ManualEntryExtractor",
  tableName: "value_extractors__manual_entry",
  dbTablePrimaryKey: "id",
  parsers: ManualEntryExtractorParsers,
});
