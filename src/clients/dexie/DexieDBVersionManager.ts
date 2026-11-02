import { assertIsDefined, identity, objectKeys, propEq } from "@avandar/utils";
import Dexie from "dexie";
import type { DexieCrudModelSpec } from "@/clients/dexie/DexieCrudClient/DexieCrudClient.types";
import type { EntityTable, IndexableType, Table, Transaction } from "dexie";
import type { UnionToIntersection } from "type-fest";

/**
 * The Dexie table type for one model.
 *
 * A single-column key resolves to `EntityTable`. Compound keys use `Table`
 * because `EntityTable` requires its second parameter to be a `keyof T`, and
 * an array is not one. That branch names the key type directly instead.
 */
type DexieModelTable<M extends DexieCrudModelSpec> =
  M["modelPrimaryKey"] extends readonly string[]
    ? Table<M["DBRead"], M["modelPrimaryKeyType"] & IndexableType, M["DBRead"]>
    : M["modelPrimaryKey"] extends keyof M["DBRead"]
      ? EntityTable<M["DBRead"], M["modelPrimaryKey"]>
      : EntityTable<
          M["DBRead"],
          Extract<M["modelPrimaryKey"], keyof M["DBRead"]>
        >;

/**
 * A record of Dexie tables representing CRUD models.
 * Each key is a model name and the values are Dexie tables type definitions.
 */
type DexieModelTableRecord<M extends DexieCrudModelSpec> = UnionToIntersection<
  // we use a distributive conditional here to create a union of records, so
  // we can then intersect them all together. This way we can ensure each
  // model name is associated to its correct model type, rather than being a
  // union of all model types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  M extends any
    ? {
        [K in M["modelName"]]: DexieModelTable<M>;
      }
    : never
>;

/**
 * A Dexie table representing the 'meta' table.
 */
type DexieMetaTable = EntityTable<{ key: string; value: string }, "key">;

/**
 * A type representing a Dexie database with a specific union of models.
 */
export type DexieDBType<M extends DexieCrudModelSpec> = Dexie &
  DexieModelTableRecord<M> & {
    meta: DexieMetaTable;
  };

type DBSchemaType = {
  version: number;
  models: readonly [DexieCrudModelSpec, ...DexieCrudModelSpec[]];
};

/** A string field name from a schema model's database read shape. */
type DBSchemaModelKey<M extends DexieCrudModelSpec> = Extract<
  keyof M["DBRead"],
  string
>;

/** A compound Dexie key path containing at least two database read fields. */
type DBSchemaCompoundPrimaryKey<M extends DexieCrudModelSpec> = readonly [
  DBSchemaModelKey<M>,
  DBSchemaModelKey<M>,
  ...Array<DBSchemaModelKey<M>>,
];

/** A scalar or compound Dexie key path for one schema model. */
type DBSchemaPrimaryKey<M extends DexieCrudModelSpec> =
  | DBSchemaModelKey<M>
  | DBSchemaCompoundPrimaryKey<M>;

type DBSchemaConfig<DBSchema extends DBSchemaType = DBSchemaType> =
  // we use a conditional here intentionally so that if `DBSchema` is a union,
  // it will get distributed. This will keep the union discriminated rather than
  // merged into one single object with each key unioned.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DBSchema extends any
    ? {
        /** The base unconfigured Dexie DB */
        db: Dexie;

        /** The version of the Dexie DB to register */
        version: DBSchema["version"];

        /** The models to register */
        models: {
          [M in DBSchema["models"][number] as M["modelName"]]: {
            /**
             * The primary key for this historical schema version. A model can
             * be re-keyed in a later version, while older registrations must
             * preserve their original key to let Dexie run the upgrade.
             */
            primaryKey: DBSchemaPrimaryKey<M>;
            /**
             * Additional columns to index. The primary key column does not have
             * to be specified here. If it is, it'll just get ignored. Primary
             * keys are indexed automatically.
             */
            columnsToIndex?: Array<keyof M["DBRead"]>;
          };
        };

        /**
         * Names of object stores to physically delete in this version.
         *
         * `models` can only create or re-index a store, so a store whose
         * *primary key* changed cannot be expressed there. IndexedDB cannot
         * re-key a store in place and Dexie aborts the entire upgrade with
         * "Not yet support for changing primary key" when it sees one. Naming a
         * store here emits a `null` entry in Dexie's `stores()` spec, which is
         * how Dexie is told to drop the physical store.
         *
         * Dexie cannot drop and recreate the same store within a single
         * version, so a re-key takes two versions: delete the store here, then
         * declare it again under `models` in the NEXT version.
         *
         * Every row in a deleted store is destroyed, so only delete stores
         * whose contents can be derived again (for example a download cache).
         */
        modelsToDelete?: readonly string[];

        /**
         * The upgrader function to run when the Dexie DB is upgraded.
         * Refer to Dexie's Database Versioning docs for more information.
         * @see {@link https://dexie.org/docs/Tutorial/Design#database-versioning Dexie Database Versioning}
         */
        upgrader?: (tx: Transaction) => Promise<void> | void;
      }
    : never;

type GenericDexieDBSchema = {
  version: number;

  /** Models must be specified as a fixed tuple. */
  models: readonly [DexieCrudModelSpec, ...DexieCrudModelSpec[]];
};

type GenericDexieDBSchemaRegistry = Record<`v${number}`, GenericDexieDBSchema>;

type SchemasOfRegistry<Registry> = Registry[Extract<
  keyof Registry,
  `v${number}`
>];

type DexieDBVersionManager<
  DBSchemaRegistry extends GenericDexieDBSchemaRegistry,
> = {
  /**
   * Registers an array of database schemas.
   * **NOTE**: Database schemas will be registered in order, so the order of the
   * array matters.
   * @param dbSchemas The database schemas to register.
   */
  registerVersions: (
    dbSchemas: ReadonlyArray<
      DBSchemaConfig<SchemasOfRegistry<DBSchemaRegistry>>
    >,
  ) => void;

  /**
   * Defines a Dexie DB version.
   * This function is an identity function that is used to enforce type safety,
   * to make sure the database configuration is consistent with the defined
   * schema type.
   *
   * @param config The configuration for the Dexie DB version.
   * @returns The Dexie DB version configuration.
   */
  defineVersion: <
    VersionNum extends
      (keyof DBSchemaRegistry extends `v${infer V extends number}` ? V : never),
    DBSchema extends DBSchemaRegistry[`v${VersionNum}`] =
      DBSchemaRegistry[`v${VersionNum}`],
  >(
    config: DBSchemaConfig<DBSchema>,
  ) => DBSchemaConfig<DBSchema>;

  /**
   * Gets a Dexie DB with a specific version.
   * @param version The version of the Dexie DB to get.
   * @returns
   */
  getVersion: <
    Version extends Extract<keyof DBSchemaRegistry, `v${number}`> = Extract<
      keyof DBSchemaRegistry,
      `v${number}`
    >,
  >(
    version: Version,
  ) => DexieDBType<DBSchemaRegistry[Version]["models"][number]>;
};

function _getDexieTableDefinition(
  options: Readonly<{
    primaryKey: string | readonly string[];
    columnsToIndex: readonly PropertyKey[];
  }>,
): string {
  const isCompoundKey = Array.isArray(options.primaryKey);
  const primaryKeySpec = isCompoundKey
    ? `[${(options.primaryKey as readonly string[]).join("+")}]`
    : `&${options.primaryKey as string}`;
  const columnsWithoutPrimaryKey = options.columnsToIndex.filter(
    (columnName) => {
      return isCompoundKey || columnName !== options.primaryKey;
    },
  );
  return [primaryKeySpec, ...columnsWithoutPrimaryKey].join(",");
}

async function _runDexieUpgrade(
  options: Readonly<{
    transaction: Transaction;
    version: number;
    upgrader: ((transaction: Transaction) => Promise<void> | void) | undefined;
  }>,
): Promise<void> {
  const hasMetaTable = options.transaction.db.tables.some(
    propEq("name", "meta"),
  );
  if (hasMetaTable) {
    await options.transaction
      .table("meta")
      .put({ key: "version", value: String(options.version) });
  }
  await options.upgrader?.(options.transaction);
  window.location.reload();
}

type DexieVersionRecord<DBSchemaRegistry extends GenericDexieDBSchemaRegistry> =
  Record<
    `v${number}`,
    DexieDBType<SchemasOfRegistry<DBSchemaRegistry>["models"][number]>
  >;

function _registerDexieVersion<
  DBSchemaRegistry extends GenericDexieDBSchemaRegistry,
  CurrentSchema extends SchemasOfRegistry<DBSchemaRegistry>,
>(
  options: Readonly<{
    versions: DexieVersionRecord<DBSchemaRegistry>;
    config: DBSchemaConfig<CurrentSchema>;
  }>,
): DexieDBType<CurrentSchema["models"][number]> {
  // `null` is Dexie's instruction to drop a physical object store. Deletions
  // are applied before the live models so that a name appearing in both is
  // resolved in favour of the model that this version actually declares.
  const tableDefinitions: Record<string, string | null> = { meta: "&key" };
  options.config.modelsToDelete?.forEach((modelName) => {
    tableDefinitions[modelName] = null;
  });
  objectKeys(options.config.models).forEach((modelName) => {
    const model = options.config.models[modelName]!;
    tableDefinitions[modelName] = _getDexieTableDefinition({
      primaryKey: model.primaryKey,
      columnsToIndex: model.columnsToIndex ?? [],
    });
  });
  options.config.db
    .version(options.config.version)
    .stores(tableDefinitions)
    .upgrade((transaction) => {
      return _runDexieUpgrade({
        transaction,
        version: options.config.version,
        upgrader: options.config.upgrader,
      });
    });
  const database = options.config.db as DexieDBType<
    CurrentSchema["models"][number]
  >;
  options.versions[`v${options.config.version}`] = database;
  return database;
}

function _createDexieDbVersionManager<
  DBSchemaRegistry extends GenericDexieDBSchemaRegistry,
>(): DexieDBVersionManager<DBSchemaRegistry> {
  const versions: DexieVersionRecord<DBSchemaRegistry> = {};
  const registerVersions = (
    schemas: ReadonlyArray<DBSchemaConfig<SchemasOfRegistry<DBSchemaRegistry>>>,
  ): void => {
    schemas.forEach((schema) => {
      _registerDexieVersion({ versions, config: schema });
    });
  };
  const getVersion = <
    Version extends Extract<keyof DBSchemaRegistry, `v${number}`>,
  >(
    version: Version,
  ): DexieDBType<DBSchemaRegistry[Version]["models"][number]> => {
    const database = versions[version as `v${number}`];
    assertIsDefined(
      database,
      `Could not find a Dexie DB with version ${version}`,
    );
    return database as DexieDBType<DBSchemaRegistry[Version]["models"][number]>;
  };
  return {
    registerVersions,
    getVersion,
    defineVersion: identity,
  };
}

/** Creates typed Dexie database versions from a schema registry. */
export const DexieDBVersionManager = {
  /** Creates an isolated manager for one schema registry. */
  make: <
    DBSchemaRegistry extends GenericDexieDBSchemaRegistry,
  >(): DexieDBVersionManager<DBSchemaRegistry> => {
    return _createDexieDbVersionManager<DBSchemaRegistry>();
  },
};
