import { createSupabaseCRUDClient } from "@/lib/clients/SupabaseCRUDClient";
import { AggregationExtractorConfigParsers } from "./AggregationExtractorConfigParsers";

/**
 * Client for managing aggregation extractor configurations
 */
export const AggregationExtractorConfigClient = createSupabaseCRUDClient({
  modelName: "AggregationExtractorConfig",
  tableName: "value_extractor_config__aggregation",
  dbTablePrimaryKey: "id",
  parsers: AggregationExtractorConfigParsers,
});
