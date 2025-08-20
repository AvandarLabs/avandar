import Dexie, { EntityTable, Transaction } from "dexie";
import { UnionToIntersection } from "type-fest";
import { DexieModelCRUDTypes } from "@/lib/models/DexieModelCRUDTypes";
import { objectKeys } from "@/lib/utils/objects/misc";

export type DexieModelTable<M extends DexieModelCRUDTypes> = {
  [K in M["modelName"]]: EntityTable<M["DBRead"], M["modelPrimaryKey"]>;
};

type MetaTable = {
  key: string;
  value: string;
};

export function defineDexieDBVersion<
  // TableModels must be explicitly passed as a fixed tuple
  TableModels extends readonly [DexieModelCRUDTypes, ...DexieModelCRUDTypes[]],
>(options: {
  db: Dexie;
  version: number;
  models: {
    [M in TableModels[number] as M["modelName"]]: {
      primaryKey: M["modelPrimaryKey"];
    };
  };
  upgrader?: (tx: Transaction) => Promise<void> | void;
}): Dexie &
  DexieModelTable<UnionToIntersection<TableModels[number]>> & {
    meta: EntityTable<MetaTable, "key">;
  } {
  const { db, version, models } = options;

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
        await tx.table("meta").put({ key: "version", value: String(version) });
      }

      // run the user-defined upgrade function
      if (options.upgrader) {
        await options.upgrader(tx);
      }
    });

  return db as Dexie &
    DexieModelTable<UnionToIntersection<TableModels[number]>> & {
      meta: EntityTable<MetaTable, "key">;
    };
}
