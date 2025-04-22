import { createSupabaseCRUDClient } from "@/lib/clients/SupabaseCRUDClient";
import { ManualEntryExtractorConfigParsers } from "./ManualEntryExtractorConfigParsers";

/**
 * Client for managing manual entry extractor configurations
 */
export const ManualEntryExtractorConfigClient = createSupabaseCRUDClient({
  modelName: "ManualEntryExtractorConfig",
  tableName: "value_extractor_config__manual_entry",
  dbTablePrimaryKey: "id",
  parsers: ManualEntryExtractorConfigParsers,
});
