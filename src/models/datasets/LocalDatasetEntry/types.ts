import { DexieModelCRUDTypes } from "@/lib/models/DexieModelCRUDTypes";
import { DatasetId } from "../Dataset";

/**
 * This model tracks the metadata of a locally-loaded dataset into the user's
 * local browser and persisted into DuckDB.
 *
 * This model maps the datasetId (which came from the Dataset in Supabase) to
 * the local table name in DuckDB which stores the raw queryable data.
 */
type LocalDatasetEntryDBRead = {
  /** The dataset id from the backend */
  datasetId: DatasetId;

  /** The local table name in DuckDB that holds the raw data */
  localTableName: string;
};

export type LocalDatasetEntryModel = DexieModelCRUDTypes<{
  modelName: "LocalDatasetEntry";
  primaryKey: "datasetId";
  primaryKeyType: DatasetId;
  dbTypes: {
    DBRead: LocalDatasetEntryDBRead;
    DBUpdate: Partial<LocalDatasetEntryDBRead>;
  };
  modelTypes: {
    Read: LocalDatasetEntryDBRead;
    Update: Partial<LocalDatasetEntryDBRead>;
  };
}>;

export type LocalDatasetEntry<K extends keyof LocalDatasetEntryModel = "Read"> =
  LocalDatasetEntryModel[K];
