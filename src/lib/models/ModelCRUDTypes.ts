import { UnknownObject } from "$/lib/types/common";

export type ModelCRUDTypes = {
  /** The name of the model */
  modelName: string;

  /**
   * The type of the primary key field in a frontend model.
   * This refers to the actual _type_ of the primary key (e.g. a UUID),
   * not the key name.
   */
  modelPrimaryKeyType: string | number;

  /** The type returned when doing a DB `get` (Read) operation */
  DBRead: UnknownObject;

  /** The type expected when doing a DB `insert` (Create) operation */
  DBInsert: UnknownObject;

  /** The type expected when doing a DB `update` operation */
  DBUpdate: UnknownObject;

  /** The frontend model type returned from a DB `get` (Read) operation */
  Read: UnknownObject;

  /** The frontend model type expected when inserting (creating) a new model */
  Insert: UnknownObject;

  /** The frontend model type expected when updating an existing model */
  Update: UnknownObject;
};
