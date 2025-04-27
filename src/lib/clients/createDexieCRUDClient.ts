import Dexie, { EntityTable } from "dexie";
import { ILogger } from "../Logger";
import { UnknownObject } from "../types/common";
import { DexieModelCRUDTypes } from "../utils/models/DexieModelCRUDTypes";
import { ModelCRUDParserRegistry } from "../utils/models/ModelCRUDParserRegistry";
import { BaseClient } from "./BaseClient";
import {
  DEFAULT_MUTATION_FN_NAMES,
  DEFAULT_QUERY_FN_NAMES,
  DefaultMutationFnName,
  DefaultQueryFnName,
  ModelCRUDClient,
} from "./ModelCRUDClient";
import { WithLogger, withLogger } from "./withLogger";
import {
  HookableFnName,
  WithQueryHooks,
  withQueryHooks,
} from "./withQueryHooks";

const DB_VERSION = 1;

type DexieTable<M extends DexieModelCRUDTypes> = {
  [P in M["modelName"]]: EntityTable<M["DBRead"], M["modelPrimaryKey"]>;
};

export type DexieCRUDClient<
  Client extends ModelCRUDClient<DexieModelCRUDTypes>,
  ExtendedClient extends UnknownObject = UnknownObject,
> = WithLogger<
  WithQueryHooks<
    Client,
    Extract<HookableFnName<Client>, DefaultQueryFnName>,
    Extract<HookableFnName<Client>, DefaultMutationFnName>
  > &
    WithQueryHooks<ExtendedClient & BaseClient, never, never>
>;

/**
 * Creates a client for a model that maps to a Dexie table.
 *
 * It also creates `use` hooks for the `DEFAULT_QUERY_FN_NAMES` and
 * `DEFAULT_MUTATION_FN_NAMES`.
 *
 * TODO(pablo): implement versioning for the database. It's possible that
 * the db schema may have changed by the time the user is now loading their
 * previously saved data, so we need to be able to migrate their data to a
 * newer schema version.
 */
export function createDexieCRUDClient<
  M extends DexieModelCRUDTypes,
  DB extends Dexie & DexieTable<M> = Dexie & DexieTable<M>,
  ExtendedClient extends UnknownObject = UnknownObject,
>({
  modelName,
  primaryKey,
  parsers,
  extendWith,
}: {
  modelName: M["modelName"];
  primaryKey: M["modelPrimaryKey"];

  /** A registry of parsers for converting between model variants and
   * database variants. */
  parsers: ModelCRUDParserRegistry<M>;
  extendWith?: (config: {
    logger: ILogger;
    db: DB;
    dbTable: DB["modelName"];
  }) => ExtendedClient;
}): DexieCRUDClient<ModelCRUDClient<M>, ExtendedClient> {
  const baseClient: BaseClient = {
    getClientName() {
      return `${modelName}Client`;
    },
  };

  // Create the database and set up the table
  const db = new Dexie(`${modelName}DB`) as DB;
  db.version(DB_VERSION).stores({ [modelName]: primaryKey });
  const dbTable = db[modelName as keyof DB];

  return withLogger(baseClient, (baseLogger: ILogger) => {
    const modelClient: ModelCRUDClient<M> = {
      ...baseClient,

      getById: async (params: {
        id: M["modelPrimaryKeyType"] | undefined;
      }): Promise<M["Read"] | undefined> => {
        if (params.id === undefined) {
          return undefined;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await dbTable.get(params.id as any);

        if (!data) {
          return undefined;
        }

        const model = parsers.fromDBReadToModelRead(data);
        return model;
      },

      // TODO(pablo): implement pagination
      getAll: async (): Promise<Array<M["Read"]>> => {
        const logger = baseLogger.appendName("getAll");

        // always log this untiol we implement pagination
        logger
          .setEnabled(true)
          .log("Need to implement pagination for Dexie clients");

        const allData = await dbTable.toArray();
        return allData.map((data) => {
          return parsers.fromDBReadToModelRead(data);
        });
      },

      insert: async (params: { data: M["Insert"] }): Promise<M["Read"]> => {
        const logger = baseLogger.appendName("insert");

        logger.log("Attempting to insert", params.data);

        const dataToUpdate = parsers.fromModelInsertToDBInsert(params.data);

        // insert data
        const modelId = await dbTable.add(dataToUpdate);
        const insertedData = await dbTable.get(modelId);
        if (!insertedData) {
          throw new Error(
            "Could not find the model that should have just been inserted.",
          );
        }
        logger.log(`Inserted ${modelName} into db`, insertedData);

        // convert the inserted data back to a ModelRead
        const insertedModel = parsers.fromDBReadToModelRead(insertedData);
        return insertedModel;
      },

      update: async (_params: {
        id: M["modelPrimaryKeyType"];
      }): Promise<M["Read"]> => {
        // TODO(pablo): implement update with dexie
        throw new Error("Need to implement `update` for Dexie clients");
      },

      delete: async (params: {
        id: M["modelPrimaryKeyType"];
      }): Promise<void> => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await dbTable.delete(params.id as any);
      },
    };

    // build the extended client
    const extendedClient =
      extendWith ?
        {
          ...baseClient,
          ...extendWith({
            logger: baseLogger,
            db,
            dbTable: dbTable as DB["modelName"],
          }),
        }
      : undefined;

    // Now attach the hooks
    const modelClientWithHooks = withQueryHooks(modelClient, {
      queryFns: DEFAULT_QUERY_FN_NAMES,
      mutationFns: DEFAULT_MUTATION_FN_NAMES,
    });

    const extendedClientWithHooks =
      extendedClient ?
        withQueryHooks(extendedClient, {
          queryFns: [],
          mutationFns: [],
        })
      : undefined;

    return {
      ...modelClientWithHooks,
      ...extendedClientWithHooks,
      QueryKeys: {
        ...modelClientWithHooks.QueryKeys,
        ...extendedClientWithHooks?.QueryKeys,
      },
    } as WithQueryHooks<
      ModelCRUDClient<M>,
      Extract<HookableFnName<ModelCRUDClient<M>>, DefaultQueryFnName>,
      Extract<HookableFnName<ModelCRUDClient<M>>, DefaultMutationFnName>
    > &
      WithQueryHooks<ExtendedClient & BaseClient, never, never>;
  });
}
