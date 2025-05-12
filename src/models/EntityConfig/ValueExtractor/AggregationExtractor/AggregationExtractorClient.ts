import { createSupabaseCRUDClient } from "@/lib/clients/supabase/SupabaseCRUDClient";
import { AggregationExtractorParsers } from "./parsers";

/**
 * Client for managing aggregation extractor configurations
 */
export const AggregationExtractorClient = createSupabaseCRUDClient({
  modelName: "AggregationExtractor",
  tableName: "value_extractor__aggregation",
  dbTablePrimaryKey: "id",
  parsers: AggregationExtractorParsers,
});
