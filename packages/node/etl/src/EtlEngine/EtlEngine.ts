import { createEtlEngine } from "@etl/EtlEngine/createEtlEngine/createEtlEngine";
import {
  getLoadParquetPathForTable,
  storeExtractedData,
} from "@etl/EtlEngine/etlFileHelpers";

/**
 * The ETL engine. `create` builds one pipeline's engine, which crawls its
 * drives and loads every relation into Supabase (see the README). The two
 * helpers manage files under `etl-output/` for pipelines that produce
 * Parquet.
 */
export const EtlEngine = {
  create: createEtlEngine,
  storeExtractedData,
  getLoadParquetPathForTable,
} as const;
