import { Merge, SetFieldType, Simplify } from "type-fest";
import { DexieModelCRUDTypes } from "@/lib/models/DexieModelCRUDTypes";
import { MIMEType } from "@/lib/types/common";
import { Brand } from "@/lib/types/utilityTypes";
import type { CSVData } from "@/lib/types/common";
import type { LocalDatasetField } from "@/models/LocalDataset/LocalDatasetField/types";

export type LocalDatasetId = Brand<string, "LocalDatasetId">;

type DBRead = {
  id: LocalDatasetId;
  name: string;
  datasetType:
    | "upload"
    | "entities_queryable"
    | "entities"
    | "entity_field_values";
  description: string;
  createdAt: string;
  updatedAt: string;
  sizeInBytes: number;
  mimeType: MIMEType;
  delimiter: string;
  firstRowIsHeader: boolean;

  /**
   * Local datasets are stored in IndexedDB so we can store nested objects.
   * We do not have to structure this as a relational database with foreign
   * keys.
   */
  // TODO(jpsyx): rename to `columns`
  fields: readonly LocalDatasetField[];

  /**
   * All data is represented as a single string to take up less space.
   * This needs to be parsed.
   */
  data: string;
};

/**
 * Local dataset type. For now, we only support CSVs.
 *
 * This is the same as the database type, except that the dates
 * are parsed from strings to Date objects.
 */
type LocalDatasetRead = Merge<
  DBRead,
  {
    createdAt: Date;
    updatedAt: Date;
  }
>;

type LocalDatasetUpdate = Partial<LocalDatasetRead>;

export type LocalDatasetModel = DexieModelCRUDTypes<{
  modelName: "LocalDataset";
  primaryKey: "id";
  primaryKeyType: LocalDatasetId;
  dbTypes: {
    DBRead: DBRead;
    DBUpdate: Partial<DBRead>;
  };
  modelTypes: {
    Read: LocalDatasetRead;
    Update: LocalDatasetUpdate;
  };
}>;

/**
 * Metadata about the parsed file itself.
 */
export type FileMetadata = {
  name: string;
  mimeType: MIMEType;
  sizeInBytes: number;
};

export type LocalDataset<K extends keyof LocalDatasetModel = "Read"> = Simplify<
  LocalDatasetModel[K]
>;

export type ParsedLocalDataset = SetFieldType<
  LocalDataset<"Read">,
  "data",
  CSVData
>;
