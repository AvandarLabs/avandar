import { createModelCrudClient } from "@avandar/clients";
import { assertIsDefined } from "@avandar/utils";
import { createDexieCrudMutationOperations } from "@/clients/dexie/createDexieCrudClient/createDexieCrudMutationOperations";
import { createDexieCrudReadOperations } from "@/clients/dexie/createDexieCrudClient/createDexieCrudReadOperations";
import type { DexieCrudOperationContext } from "@/clients/dexie/createDexieCrudClient/createDexieCrudClient.types";
import type { DexieCrudModelSpec } from "@/clients/dexie/DexieCrudClient/DexieCrudClient.types";
import type { DexieDBType } from "@/clients/dexie/DexieDBVersionManager";
import type {
  ClientReturningOnlyPromises,
  ModelCrudClient,
  ModelCrudParserRegistry,
} from "@avandar/clients";
import type { ILogger } from "@avandar/logger";
import type { EmptyObject } from "@avandar/utils";

export type DexieCrudClient<
  M extends DexieCrudModelSpec,
  ExtendedQueriesClient extends ClientReturningOnlyPromises,
  ExtendedMutationsClient extends ClientReturningOnlyPromises,
> = ModelCrudClient<M, ExtendedQueriesClient, ExtendedMutationsClient>;

type CreateDexieCrudClientOptions<
  M extends DexieCrudModelSpec,
  ExtendedQueriesClient extends ClientReturningOnlyPromises,
  ExtendedMutationsClient extends ClientReturningOnlyPromises,
  DB extends DexieDBType<M> = DexieDBType<M>,
> = {
  /** The dexie database that backs this client */
  db: DB;

  /** The name of the model and its Dexie table. */
  modelName: M["modelName"];

  /** A registry that converts between model and database variants. */
  parsers: ModelCrudParserRegistry<M>;

  /** Additional query functions to add to the client. */
  queries?: (config: {
    logger: ILogger;
    db: DB;
    dbTable: DB[M["modelName"]];
  }) => ExtendedQueriesClient;

  /** Additional mutation functions to add to the client. */
  mutations?: (config: {
    logger: ILogger;
    db: DB;
    dbTable: DB[M["modelName"]];
  }) => ExtendedMutationsClient;
};

type ConfiguredDexieCrudClientOptions<
  M extends DexieCrudModelSpec,
  ExtendedQueriesClient extends ClientReturningOnlyPromises,
  ExtendedMutationsClient extends ClientReturningOnlyPromises,
  DB extends DexieDBType<M>,
> = CreateDexieCrudClientOptions<
  M,
  ExtendedQueriesClient,
  ExtendedMutationsClient,
  DB
>;

function _createDexieCrudOperations<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(options: Readonly<{ db: DB; modelName: M["modelName"] }>) {
  const table = options.db[options.modelName];
  assertIsDefined(
    table,
    `Could not find Dexie table for model ${options.modelName}`,
  );
  const context: DexieCrudOperationContext<M, DB> = {
    db: options.db,
    modelName: options.modelName,
    table,
  };
  return {
    table,
    ...createDexieCrudReadOperations(context),
    ...createDexieCrudMutationOperations(context),
  };
}

/**
 * Adapts the caller's optional `queries` and `mutations` factories to the
 * `createModelCrudClient` shape, which supplies a client logger instead of a
 * database handle.
 */
function _getDexieCrudClientExtensions<
  M extends DexieCrudModelSpec,
  ExtendedQueriesClient extends ClientReturningOnlyPromises,
  ExtendedMutationsClient extends ClientReturningOnlyPromises,
  DB extends DexieDBType<M>,
>(
  options: Readonly<{
    clientOptions: ConfiguredDexieCrudClientOptions<
      M,
      ExtendedQueriesClient,
      ExtendedMutationsClient,
      DB
    >;
    dbTable: DB[M["modelName"]];
  }>,
): {
  additionalQueries?: (config: {
    clientLogger: ILogger;
  }) => ExtendedQueriesClient;
  additionalMutations?: (config: {
    clientLogger: ILogger;
  }) => ExtendedMutationsClient;
} {
  const { db, queries, mutations } = options.clientOptions;
  return {
    additionalQueries:
      queries ?
        ({ clientLogger }) => {
          return queries({
            logger: clientLogger,
            db,
            dbTable: options.dbTable,
          });
        }
      : undefined,
    additionalMutations:
      mutations ?
        ({ clientLogger }) => {
          return mutations({
            logger: clientLogger,
            db,
            dbTable: options.dbTable,
          });
        }
      : undefined,
  };
}

function _createConfiguredDexieCrudClient<
  M extends DexieCrudModelSpec,
  ExtendedQueriesClient extends ClientReturningOnlyPromises,
  ExtendedMutationsClient extends ClientReturningOnlyPromises,
  DB extends DexieDBType<M>,
>(
  options: Readonly<
    ConfiguredDexieCrudClientOptions<
      M,
      ExtendedQueriesClient,
      ExtendedMutationsClient,
      DB
    >
  >,
): DexieCrudClient<M, ExtendedQueriesClient, ExtendedMutationsClient> {
  const { db, modelName, parsers } = options;
  const operations = _createDexieCrudOperations<M, DB>({ db, modelName });
  return createModelCrudClient({
    modelName,
    parsers,
    ..._getDexieCrudClientExtensions({
      clientOptions: options,
      dbTable: operations.table,
    }),
    crudFunctions: {
      getById: operations.getById,
      getCount: operations.getCount,
      getPage: operations.getPage,
      insert: operations.insert,
      bulkInsert: operations.bulkInsert,
      update: operations.update,
      delete: operations.delete,
      bulkDelete: operations.bulkDelete,
    },
  });
}

/**
 * Creates a client for a model that maps to a Dexie table.
 */
export function createDexieCrudClient<
  M extends DexieCrudModelSpec,
  ExtendedQueriesClient extends ClientReturningOnlyPromises = EmptyObject,
  ExtendedMutationsClient extends ClientReturningOnlyPromises = EmptyObject,
  DB extends DexieDBType<M> = DexieDBType<M>,
>(
  options: Readonly<
    CreateDexieCrudClientOptions<
      M,
      ExtendedQueriesClient,
      ExtendedMutationsClient,
      DB
    >
  >,
): DexieCrudClient<M, ExtendedQueriesClient, ExtendedMutationsClient> {
  return _createConfiguredDexieCrudClient(options);
}
