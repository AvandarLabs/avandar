import { Merge, Simplify } from "type-fest";
import { MIMEType } from "@/lib/types/common";
import { DexieModelCRUDTypes } from "@/lib/utils/models/DexieModelCRUDTypes";
import type { UUID } from "@/lib/types/common";
import type { LocalDatasetField } from "@/models/LocalDataset/LocalDatasetField/types";

export type LocalDatasetId = UUID<"LocalDataset">;

type DBRead = {
  id: LocalDatasetId;
  name: string;
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

export type LocalDatasetCRUDTypes = DexieModelCRUDTypes<
  {
    modelName: "LocalDataset";
    primaryKeyType: LocalDatasetId;
  },
  {
    DBRead: DBRead;
    DBUpdate: Partial<DBRead>;
  },
  {
    Read: LocalDatasetRead;
    Update: LocalDatasetUpdate;
  },
  {
    primaryKey: "id";
  }
>;

/**
 * Metadata about the parsed file itself.
 */
export type FileMetadata = {
  name: string;
  mimeType: MIMEType;
  sizeInBytes: number;
};

export type LocalDataset<K extends keyof LocalDatasetCRUDTypes = "Read"> =
  Simplify<LocalDatasetCRUDTypes[K]>;
