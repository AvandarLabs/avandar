import { createSupabaseCRUDClient } from "@/lib/clients/createSupabaseCRUDClient";
import { DatasetColumnValueExtractorConfigParsers } from "./parsers";

/**
 * Client for managing dataset column value extractor configurations
 */
export const DatasetColumnValueExtractorConfigClient = createSupabaseCRUDClient(
  {
    modelName: "DatasetColumnValueExtractorConfig",
    tableName: "value_extractor_config__dataset_column_value",
    dbTablePrimaryKey: "id",
    parsers: DatasetColumnValueExtractorConfigParsers,
  },
);
