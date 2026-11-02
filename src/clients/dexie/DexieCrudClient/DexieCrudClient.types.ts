import type { CrudModelSpec } from "@avandar/clients";
import type { UnknownObject } from "@avandar/utils";
import type { Merge } from "type-fest";

type DefaultModelTypes = {
  modelName: string;

  /**
   * The name of the primary key of *both* the db and frontend model. They
   * should both have the same key.
   *
   * An array declares a Dexie compound primary key over those columns, in
   * order. The columns stay separate fields on the row; nothing is
   * concatenated.
   */
  primaryKey: string | readonly [string, string, ...string[]];

  /**
   * The primary key type of *both* the db and frontend model.
   * They should both have the same primary key type.
   */
  primaryKeyType: CrudModelSpec["modelPrimaryKeyType"];

  dbTypes: {
    DBRead: UnknownObject;
    DBUpdate: UnknownObject;
  };

  modelTypes: {
    Read: UnknownObject;
    Update: UnknownObject;
  };
};

/** A string field name from one model's database read shape. */
type DexieModelPrimaryKeyName<ModelTypes extends DefaultModelTypes> = Extract<
  keyof ModelTypes["dbTypes"]["DBRead"],
  string
>;

/** A compound model key containing at least two database read field names. */
type DexieCompoundModelPrimaryKey<ModelTypes extends DefaultModelTypes> =
  readonly [
    DexieModelPrimaryKeyName<ModelTypes>,
    DexieModelPrimaryKeyName<ModelTypes>,
    ...Array<DexieModelPrimaryKeyName<ModelTypes>>,
  ];

/** A scalar or compound model primary key that names database read fields. */
type DexieModelPrimaryKey<ModelTypes extends DefaultModelTypes> =
  | DexieModelPrimaryKeyName<ModelTypes>
  | DexieCompoundModelPrimaryKey<ModelTypes>;

/** Key values from the database fields named by one compound key path. */
type DexieCompoundModelPrimaryKeyType<
  ModelTypes extends DefaultModelTypes,
  PrimaryKey extends DexieCompoundModelPrimaryKey<ModelTypes>,
> = {
  [
    Index in keyof PrimaryKey
  ]: PrimaryKey[Index] extends keyof ModelTypes["dbTypes"]["DBRead"]
    ? ModelTypes["dbTypes"]["DBRead"][PrimaryKey[Index]]
    : never;
};

/**
 * The value accepted by Dexie for one model primary key.
 *
 * Scalar key paths use their selected database field type. Compound paths use
 * a tuple in the same order as the selected database fields.
 */
type DexieModelPrimaryKeyType<
  ModelTypes extends DefaultModelTypes,
  PrimaryKey extends ModelTypes["primaryKey"] = ModelTypes["primaryKey"],
> =
  PrimaryKey extends DexieCompoundModelPrimaryKey<ModelTypes>
    ? DexieCompoundModelPrimaryKeyType<ModelTypes, PrimaryKey>
    : PrimaryKey extends DexieModelPrimaryKeyName<ModelTypes>
      ? ModelTypes["dbTypes"]["DBRead"][PrimaryKey]
      : never;

/**
 * A wrapper type to create the Dexie CRUD types for a model.
 *
 * Unlike Supabase, we have complete control over insertion to the
 * database because IndexedDB is managed by the frontend. This
 * means that we can enforce that the `Insert` type always be
 * equal to the `Read` type, which is why we do not expect a
 * separate `Insert` type to be supplied here.
 *
 * This means that the frontend must always supply all necessary
 * types, such as UUIDs, when inserting models into the database,
 * but this is an okay tradeoff in order to have to manage one
 * less type. It also makes model insertion more explicit and no
 * need to rely on database behavior to fill in any default
 * values.
 */
export type DexieCrudModelSpec<
  ModelTypes extends DefaultModelTypes & {
    primaryKey: DexieModelPrimaryKey<ModelTypes>;
    primaryKeyType: DexieModelPrimaryKeyType<ModelTypes>;
  } = DefaultModelTypes,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  ExtraTypes extends object = {},
> = Merge<
  CrudModelSpec,
  {
    /** The model name. Also used as the Dexie table name. */
    modelName: ModelTypes["modelName"];

    /**
     * The type of the primary key field in a frontend model
     */
    modelPrimaryKeyType: ModelTypes["primaryKeyType"];

    /**
     * The name of the primary key field in a frontend model.
     * This will also be the primary key of the Dexie table.
     */
    modelPrimaryKey: ModelTypes["primaryKey"];

    DBRead: ModelTypes["dbTypes"]["DBRead"];
    Read: ModelTypes["modelTypes"]["Read"];

    DBUpdate: ModelTypes["dbTypes"]["DBUpdate"];
    Update: ModelTypes["modelTypes"]["Update"];

    /**
     * With Dexie (IndexedDB), the Insert type should be equal
     * to the Read type. Since the database is managed entirely
     * in the frontend, we should be in charge of supplying all
     * necessary values at insertion time.
     */
    DBInsert: ModelTypes["dbTypes"]["DBRead"];

    /**
     * With Dexie (IndexedDB), the Insert type should be equal
     * to the Read type. Since the database is managed entirely
     * in the frontend, we should be in charge of supplying all
     * necessary values at insertion time.
     */
    Insert: ModelTypes["modelTypes"]["Read"];
  } & ExtraTypes
>;
