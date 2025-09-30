import Dexie, { IDType, UpdateSpec } from "dexie";
import { EmptyObject } from "type-fest";
import { ILogger } from "@/lib/Logger";
import { DexieModelCRUDTypes } from "@/lib/models/DexieModelCRUDTypes";
import { ModelCRUDParserRegistry } from "@/lib/models/makeParserRegistry";
import { applyFiltersToRows } from "@/lib/utils/filters/applyFiltersToRows";
import { FiltersByColumn } from "@/lib/utils/filters/filtersByColumn";
import { isDefined } from "@/lib/utils/guards";
import {
  createModelCRUDClient,
  HookableClient,
  ModelCRUDClient,
  UpsertOptions,
} from "../createModelCRUDClient";
import { DexieModelTable } from "./defineDexieDBVersion";

export type DexieCRUDClient<
  M extends DexieModelCRUDTypes,
  ExtendedQueriesClient extends HookableClient,
  ExtendedMutationsClient extends HookableClient,
> = ModelCRUDClient<M, ExtendedQueriesClient, ExtendedMutationsClient>;

type CreateDexieCRUDClientOptions<
  M extends DexieModelCRUDTypes,
  ExtendedQueriesClient extends HookableClient,
  ExtendedMutationsClient extends HookableClient,
  DB extends Dexie & DexieModelTable<M> = Dexie & DexieModelTable<M>,
> = {
  /** The dexie database that backs this client */
  db: DB;

  /**
   * The name of the model, which is also the name of the Dexie table,
   * that this client will interact with.
   */
  modelName: M["modelName"];

  /**
   * A registry of parsers for converting between model variants and
   * database variants.
   */
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
    dbTable: DB[M["modelName"]];
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
    dbTable: DB[M["modelName"]];
  }) => ExtendedMutationsClient;
};

/**
 * Creates a client for a model that maps to a Dexie table.
 */
export function createDexieCRUDClient<
  M extends DexieModelCRUDTypes,
  ExtendedQueriesClient extends HookableClient = EmptyObject,
  ExtendedMutationsClient extends HookableClient = EmptyObject,
  DB extends Dexie & DexieModelTable<M> = Dexie & DexieModelTable<M>,
>({
  db,
  modelName,
  parsers,
  queries,
  mutations,
}: CreateDexieCRUDClientOptions<
  M,
  ExtendedQueriesClient,
  ExtendedMutationsClient,
  DB
>): DexieCRUDClient<M, ExtendedQueriesClient, ExtendedMutationsClient> {
  const dbTable = db[modelName];
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

    crudFunctions: {
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

      insert: async (
        params: UpsertOptions & { data: M["DBInsert"]; logger: ILogger },
      ) => {
        if (params.upsert) {
          // TODO(jpsyx): implement upsert
          throw new Error("Upsert is not implemented for Dexie");
        }

        const insertedRowId = await dbTable.add(params.data);
        const insertedData = await dbTable.get(insertedRowId);
        if (!insertedData) {
          throw new Error(
            "Could not find the model that should have just been inserted.",
          );
        }
        return insertedData;
      },

      bulkInsert: async (
        params: UpsertOptions & {
          data: ReadonlyArray<M["DBInsert"]>;
          logger: ILogger;
        },
      ) => {
        if (params.upsert) {
          // TODO(jpsyx): implement upsert
          throw new Error("Upsert is not implemented for Dexie");
        }

        const insertedRowIds = await dbTable.bulkAdd(params.data, {
          allKeys: true,
        });
        const insertedData = await dbTable.bulkGet(insertedRowIds);
        if (!insertedData) {
          throw new Error(
            "Could not find the models that should have just been inserted.",
          );
        }
        return insertedData.filter(isDefined);
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
    },
  });

  return modelClient;
}
