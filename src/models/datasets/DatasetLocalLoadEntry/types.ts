import { DexieModelCRUDTypes } from "@/lib/models/DexieModelCRUDTypes";
import { DatasetId } from "../Dataset";

/**
 * This model tracks the metadata of the loading of a dataset into the
 * user's local browser and persisted into DuckDB.
 *
 * This model maps the datasetId (which came from the Dataset in Supabase) to
 * the local table name in DuckDB which stores the raw queryable data.
 */
type DatasetLocalLoadEntryRead = {
  datasetId: DatasetId;
  localTableName: string;
};

export type DatasetLocalLoadEntryModel = DexieModelCRUDTypes<{
  modelName: "DatasetLocalLoadEntry";
  primaryKey: "datasetId";
  primaryKeyType: DatasetId;
  dbTypes: {
    DBRead: DatasetLocalLoadEntryRead;
    DBUpdate: Partial<DatasetLocalLoadEntryRead>;
  };
  modelTypes: {
    Read: DatasetLocalLoadEntryRead;
    Update: Partial<DatasetLocalLoadEntryRead>;
  };
}>;

export type DatasetLocalLoadEntry<
  K extends keyof DatasetLocalLoadEntryModel = "Read",
> = DatasetLocalLoadEntryModel[K];
