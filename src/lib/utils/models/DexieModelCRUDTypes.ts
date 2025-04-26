import { Merge } from "type-fest";
import { UnknownObject } from "@/lib/types/common";
import { ModelCRUDTypes } from "@/lib/utils/models/ModelCRUDTypes";

/**
 * A wrapper type to create the Dexie CRUD types for a model.
 *
 * Unlike Supabase, we have complete control over insertion to the
 * database because IndexedDB is managed by the frontend. This means
 * that we can enforce that the `Insert` type always be equal to the
 * `Read` type, which is why we do not expect a separate `Insert`
 * type to be supplied here.
 *
 * This means that the frontend must always supply all necessary types,
 * such as UUIDs, when inserting models into the database, but this is
 * an okay tradeoff in order to have to manage one less type. It also
 * makes model insertion more explicit and no need to rely on database
 * behavior to fill in any default values.
 */
export type DexieModelCRUDTypes<
  CoreTypes extends {
    modelName: string;

    /**
     * The primary key type of *both* the db and frontend model.
     * They should both have the same primary key type.
     */
    primaryKeyType: string;
  } = {
    modelName: string;
    primaryKeyType: string;
  },
  DBTypes extends {
    DBRead: UnknownObject;
    DBUpdate: UnknownObject;
  } = {
    DBRead: UnknownObject;
    DBUpdate: UnknownObject;
  },
  ModelTypes extends {
    Read: UnknownObject;
    Update: UnknownObject;
  } = {
    Read: UnknownObject;
    Update: UnknownObject;
  },
  PrimaryKeys extends {
    /**
     * The name of the string literal primary key of *both* the db and
     * frontend model. They should both have the same key.
     */
    primaryKey: string;
  } = {
    primaryKey: string;
  },
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  ExtraTypes extends object = {},
> = Merge<
  ModelCRUDTypes,
  {
    /** The model name. Also used as the Dexie table name. */
    modelName: CoreTypes["modelName"];

    /** The type of the primary key field in a frontend model */
    modelPrimaryKeyType: CoreTypes["primaryKeyType"];

    /**
     * The name of the primary key field in a frontend model.
     * This will also be the primary key of the Dexie table.
     */
    modelPrimaryKey: PrimaryKeys["primaryKey"];

    DBRead: DBTypes["DBRead"];
    DBUpdate: DBTypes["DBUpdate"];
    Read: ModelTypes["Read"];
    Update: ModelTypes["Update"];

    /**
     * With Dexie (IndexedDB), the Insert type should be equal to the Read
     * type. Since the database is managed entirely in the frontend,
     * we should be in charge of supplying all necessary values at
     * insertion time.
     */
    DBInsert: DBTypes["DBRead"];

    /**
     * With Dexie (IndexedDB), the Insert type should be equal to the Read
     * type. Since the database is managed entirely in the frontend,
     * we should be in charge of supplying all necessary values at
     * insertion time.
     */
    Insert: ModelTypes["Read"];
  } & ExtraTypes
>;
