import { createSupabaseCRUDClient } from "@/lib/clients/supabase/createSupabaseCRUDClient";
import { AggregationExtractorParsers } from "./parsers";

/**
 * Client for managing aggregation extractor configurations
 */
export const AggregationExtractorClient = createSupabaseCRUDClient({
  modelName: "AggregationExtractor",
  tableName: "value_extractors__aggregation",
  dbTablePrimaryKey: "id",
  parsers: AggregationExtractorParsers,
});
