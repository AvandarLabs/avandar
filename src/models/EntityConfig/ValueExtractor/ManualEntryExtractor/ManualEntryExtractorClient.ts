import { createSupabaseCRUDClient } from "@/lib/clients/createSupabaseCRUDClient";
import { ManualEntryExtractorParsers } from "./parsers";

/**
 * Client for managing manual entry extractor configurations
 */
export const ManualEntryExtractorClient = createSupabaseCRUDClient({
  modelName: "ManualEntryExtractor",
  tableName: "value_extractor__manual_entry",
  dbTablePrimaryKey: "id",
  parsers: ManualEntryExtractorParsers,
});
