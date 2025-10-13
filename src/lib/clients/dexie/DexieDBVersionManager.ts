import Dexie, { EntityTable, Transaction } from "dexie";
import { UnionToIntersection } from "type-fest";
import { DexieModelCRUDTypes } from "@/lib/models/DexieModelCRUDTypes";
import { assertIsDefined } from "@/lib/utils/asserts";
import { identity } from "@/lib/utils/misc";
import { objectKeys } from "@/lib/utils/objects/misc";

/**
 * A record of Dexie tables representing CRUD models.
 * Each key is a model name and the values are Dexie tables type definitions.
 *
 */
type DexieModelTableRecord<M extends DexieModelCRUDTypes> = UnionToIntersection<
  // we use a distributive conditional here to create a union of records, so we
  // can then intersect them all together. This way we can ensure each model
  // name is associated to its correct model type, rather than being a union
  // of all model types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  M extends any ?
    {
      [K in M["modelName"]]: EntityTable<M["DBRead"], M["modelPrimaryKey"]>;
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
export type DexieDBType<M extends DexieModelCRUDTypes> = Dexie &
  DexieModelTableRecord<M> & {
    meta: DexieMetaTable;
  };

type DBSchemaType = {
  version: number;
  models: readonly [DexieModelCRUDTypes, ...DexieModelCRUDTypes[]];
};

type DBSchemaConfig<DBSchema extends DBSchemaType = DBSchemaType> =
  // we use a conditional here intentionally so that if `DBSchema` is a union,
  // it will get distributed. This will keep the union discriminated rather than
  // merged into one single object with each key unioned.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DBSchema extends any ?
    {
      /** The base unconfigured Dexie DB */
      db: Dexie;

      /** The version of the Dexie DB to register */
      version: DBSchema["version"];

      /** The models to register */
      models: {
        [M in DBSchema["models"][number] as M["modelName"]]: {
          primaryKey: M["modelPrimaryKey"];
        };
      };

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
  models: readonly [DexieModelCRUDTypes, ...DexieModelCRUDTypes[]];
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
    VersionNum extends keyof DBSchemaRegistry extends (
      `v${infer V extends number}`
    ) ?
      V
    : never,
    DBSchema extends
      DBSchemaRegistry[`v${VersionNum}`] = DBSchemaRegistry[`v${VersionNum}`],
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

function createDexieDBVersionManager<
  DBSchemaRegistry extends GenericDexieDBSchemaRegistry,
>(): DexieDBVersionManager<DBSchemaRegistry> {
  // Registry of all registered Dexie versions.
  const registeredDexieDBVersions: Record<
    `v${number}`,
    DexieDBType<SchemasOfRegistry<DBSchemaRegistry>["models"][number]>
  > = {};

  function _registerDexieDBVersion<
    CurrentDBSchema extends SchemasOfRegistry<DBSchemaRegistry>,
  >(
    config: DBSchemaConfig<CurrentDBSchema>,
  ): DexieDBType<CurrentDBSchema["models"][number]> {
    const { db, version, models } = config;
    const dexieTableDefs = { meta: "&key" };

    objectKeys(models).forEach((modelName) => {
      // The & prefix is used by Dexie to know that this primary key should
      // be unique
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore This is safe
      dexieTableDefs[modelName] = `&${models[modelName].primaryKey}`;
    });

    db.version(version)
      .stores(dexieTableDefs)
      .upgrade(async (tx: Transaction) => {
        // check if the meta table exists
        const metaTableExists = tx.db.tables.some((table) => {
          return table.name === "meta";
        });
        if (metaTableExists) {
          // write the current version to the meta table
          await tx
            .table("meta")
            .put({ key: "version", value: String(version) });
        }

        // run the user-defined upgrade function
        if (config.upgrader) {
          await config.upgrader(tx);
        }

        // reload the page to clear the cache and start fresh
        window.location.reload();
      });
    const castedDB = db as DexieDBType<CurrentDBSchema["models"][number]>;

    // store the database in the registry
    registeredDexieDBVersions[`v${version}`] = castedDB;
    return castedDB;
  }

  const registerVersions = (
    dbSchemas: ReadonlyArray<
      DBSchemaConfig<SchemasOfRegistry<DBSchemaRegistry>>
    >,
  ): void => {
    dbSchemas.forEach((dbSchema) => {
      _registerDexieDBVersion(dbSchema);
    });
  };

  const getVersion = <
    Version extends Extract<keyof DBSchemaRegistry, `v${number}`> = Extract<
      keyof DBSchemaRegistry,
      `v${number}`
    >,
  >(
    version: Version,
  ): DexieDBType<DBSchemaRegistry[Version]["models"][number]> => {
    const db = registeredDexieDBVersions[version as `v${number}`];
    assertIsDefined(db, `Could not find a Dexie DB with version ${version}`);
    return db as DexieDBType<DBSchemaRegistry[Version]["models"][number]>;
  };

  return {
    registerVersions,
    getVersion,
    defineVersion: identity,
  };
}

export const DexieDBVersionManager = {
  make: <
    DBSchemaRegistry extends GenericDexieDBSchemaRegistry,
  >(): DexieDBVersionManager<DBSchemaRegistry> => {
    return createDexieDBVersionManager<DBSchemaRegistry>();
  },
};
