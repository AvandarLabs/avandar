import Dexie, { EntityTable, IDType, UpdateSpec } from "dexie";
import { ILogger } from "../Logger";
import { DexieModelCRUDTypes } from "../models/DexieModelCRUDTypes";
import { ModelCRUDParserRegistry } from "../models/makeParserRegistry";
import { applyFiltersToRows } from "../utils/filters/applyFiltersToRows";
import { FiltersByColumn } from "../utils/filters/filtersByColumn";
import { isNotUndefined } from "../utils/guards";
import {
  createModelCRUDClient,
  HookableClient,
  ModelCRUDClient,
} from "./createModelCRUDClient";

const DB_VERSION = 1;

type DexieTable<M extends DexieModelCRUDTypes> = {
  [P in M["modelName"]]: EntityTable<M["DBRead"], M["modelPrimaryKey"]>;
};

export type DexieCRUDClient<
  M extends DexieModelCRUDTypes,
  ExtendedQueriesClient extends HookableClient,
  ExtendedMutationsClient extends HookableClient,
> = ModelCRUDClient<M, ExtendedQueriesClient, ExtendedMutationsClient>;

/**
 * Creates a client for a model that maps to a Dexie table.
 *
 * TODO(jpsyx): implement versioning for the database. It's possible that
 * the db schema may have changed by the time the user is now loading their
 * previously saved data, so we need to be able to migrate their data to a
 * newer schema version.
 */
export function createDexieCRUDClient<
  M extends DexieModelCRUDTypes,
  ExtendedQueriesClient extends HookableClient,
  ExtendedMutationsClient extends HookableClient,
  DB extends Dexie & DexieTable<M> = Dexie & DexieTable<M>,
>({
  modelName,
  primaryKey,
  parsers,
  queries,
  mutations,
}: {
  modelName: M["modelName"];
  primaryKey: M["modelPrimaryKey"];

  /** A registry of parsers for converting between model variants and
   * database variants. */
  parsers: ModelCRUDParserRegistry<M>;

  /**
   * Additional query functions to add to the client. These functions
   * will get wrapped in `useQuery` hooks.
   * @param config
   * @param config.logger - A logger for the client.
   * @returns An object of additional mutation functions. Each function must
   * return a promise.
   */
  queries?: (config: {
    logger: ILogger;
    db: DB;
    dbTable: DB["modelName"];
  }) => ExtendedQueriesClient;

  /**
   * Additional mutation functions to add to the client. These functions
   * will get wrapped in `useMutation` hooks.
   * @param config
   * @param config.logger - A logger for the client.
   * @returns An object of additional mutation functions. Each function must
   * return a promise.
   */
  mutations?: (config: {
    logger: ILogger;
    db: DB;
    dbTable: DB["modelName"];
  }) => ExtendedMutationsClient;
}): DexieCRUDClient<M, ExtendedQueriesClient, ExtendedMutationsClient> {
  // Create the database and set up the table
  const db = new Dexie(`${modelName}DB`) as DB;
  db.version(DB_VERSION).stores({ [modelName]: primaryKey });
  const dbTable = db[modelName] as DB["modelName"];

  const modelClient = createModelCRUDClient({
    modelName,
    parsers,
    additionalQueries:
      queries ?
        ({ clientLogger }) => {
          return queries({ logger: clientLogger, db, dbTable });
        }
      : undefined,

    additionalMutations:
      mutations ?
        ({ clientLogger }) => {
          return mutations({ logger: clientLogger, db, dbTable });
        }
      : undefined,

    getById: async (params: {
      id: M["modelPrimaryKeyType"] | null | undefined;
      logger: ILogger;
    }): Promise<M["DBRead"] | undefined> => {
      if (params.id === undefined || params.id === null) {
        return undefined;
      }
      const data = await dbTable.get(
        params.id as IDType<M["DBRead"], M["modelPrimaryKey"]>,
      );
      return data ?? undefined;
    },

    getCount: async (params: {
      where?: FiltersByColumn<M["DBRead"]>;
      logger: ILogger;
    }): Promise<number> => {
      const { where } = params;
      let allData = await dbTable.toArray();
      if (where) {
        allData = applyFiltersToRows(allData, where);
      }
      return allData.length;
    },

    getPage: async (params: {
      where?: FiltersByColumn<M["DBRead"]>;
      pageSize: number;
      pageNum: number;
      logger: ILogger;
    }) => {
      const { where, pageSize, pageNum } = params;
      let allData: Array<M["DBRead"]> = await dbTable.toArray();
      if (where) {
        allData = applyFiltersToRows(allData, where);
      }
      // Now apply the page range
      const startIndex = pageNum * pageSize;
      const endIndex = (pageNum + 1) * pageSize;
      const pageRows = allData.slice(startIndex, endIndex);
      return pageRows;
    },

    insert: async (params: { data: M["DBInsert"]; logger: ILogger }) => {
      const insertedRowId = await dbTable.add(params.data);
      const insertedData = await dbTable.get(insertedRowId);
      if (!insertedData) {
        throw new Error(
          "Could not find the model that should have just been inserted.",
        );
      }
      return insertedData;
    },

    bulkInsert: async (params: {
      data: ReadonlyArray<M["DBInsert"]>;
      logger: ILogger;
    }) => {
      const insertedRowIds = await dbTable.bulkAdd(params.data, {
        allKeys: true,
      });
      const insertedData = await dbTable.bulkGet(insertedRowIds);
      if (!insertedData) {
        throw new Error(
          "Could not find the models that should have just been inserted.",
        );
      }
      return insertedData.filter(isNotUndefined);
    },

    update: async (params: {
      id: M["modelPrimaryKeyType"];
      data: M["DBUpdate"];
      logger: ILogger;
    }): Promise<M["DBRead"]> => {
      const { id, data } = params;
      const typedId = id as IDType<M["DBRead"], M["modelPrimaryKey"]>;
      const updateData = data as UpdateSpec<M["DBRead"]>;

      await dbTable.update(typedId, updateData);
      const updated = await dbTable.get(typedId);
      if (!updated) {
        throw new Error(`Could not retrieve updated record with id ${id}`);
      }
      return updated;
    },

    delete: async (params: {
      id: M["modelPrimaryKeyType"];
      logger: ILogger;
    }): Promise<void> => {
      await dbTable.delete(
        params.id as IDType<M["DBRead"], M["modelPrimaryKey"]>,
      );
    },

    bulkDelete: async (params: {
      ids: ReadonlyArray<M["modelPrimaryKeyType"]>;
      logger: ILogger;
    }): Promise<void> => {
      await dbTable.bulkDelete(
        params.ids as Array<IDType<M["DBRead"], M["modelPrimaryKey"]>>,
      );
    },
  });

  return modelClient;
}
