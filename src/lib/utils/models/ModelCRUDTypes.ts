import { Merge } from "type-fest";
import { UnknownObject } from "@/lib/types/common";

export type ModelCRUDTypes = {
  /** The name of the primary key in the db table */
  dbTablePrimaryKey: string;

  /** The name of the primary key in the frontend model */
  modelPrimaryKey: string;

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

/**
 * Helper type to extend the base model CRUD types while enforcing
 * that the new types are valid subtypes of the extended CRUD type
 * dictionary.
 *
 * We use `Define...` as its naming convention so it will read more naturally
 * because this type should be used whenever defining a new frontend model.
 */
export type DefineModelCRUDTypes<
  BaseCRUDTypes extends ModelCRUDTypes,
  NewTypes extends Partial<BaseCRUDTypes>,
> = Merge<BaseCRUDTypes, NewTypes>;
