import { createSupabaseCRUDClient } from "@/lib/clients/SupabaseCRUDClient";
import { AdjacentFieldExtractorParsers } from "./parsers";

/**
 * Client for managing adjacent field extractor configurations
 */
export const AdjacentFieldExtractorConfigClient = createSupabaseCRUDClient({
  modelName: "AdjacentFieldExtractorConfig",
  tableName: "value_extractor_config__adjacent_field",
  dbTablePrimaryKey: "id",
  parsers: AdjacentFieldExtractorParsers,
});
