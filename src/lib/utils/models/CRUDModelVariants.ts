import { UnknownObject } from "@/lib/types/common";

export interface CRUDModelVariants {
  /** The name of the primary key in the db table */
  dbTablePrimaryKey: string;

  /** The name of the primary key in the frontend model */
  modelPrimaryKey: string;
  DBRead: UnknownObject;
  DBInsert: UnknownObject;
  DBUpdate: UnknownObject;
  Read: UnknownObject;
  Insert: UnknownObject;
  Update: UnknownObject;
}
