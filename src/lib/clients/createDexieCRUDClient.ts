import Dexie, { EntityTable, IndexableTypePart } from "dexie";
import { match } from "ts-pattern";
import { ILogger } from "../Logger";
import { DexieModelCRUDTypes } from "../models/DexieModelCRUDTypes";
import { ModelCRUDParserRegistry } from "../models/makeParserRegistry";
import { UnknownObject } from "../types/common";
import { mapToArrayTuple } from "../utils/arrays";
import { applyFiltersToRows } from "../utils/filters/applyFiltersToRows";
import { bucketFiltersByOperator } from "../utils/filters/bucketFiltersByOperator";
import { FiltersByColumn } from "../utils/filters/filtersByColumn";
import { isEmptyFiltersObject } from "../utils/filters/isEmptyFiltersObject";
import { hasDefinedProps, isNotUndefined } from "../utils/guards";
import { identity } from "../utils/misc";
import { objectKeys, omit } from "../utils/objects/misc";
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
        id: M["modelPrimaryKeyType"] | undefined | null;
      }): Promise<M["Read"] | undefined> => {
        if (params.id === undefined || params.id === null) {
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
      getAll: async (params?: {
        where: FiltersByColumn<M["DBRead"]>;
      }): Promise<Array<M["Read"]>> => {
        const logger = baseLogger.appendName("getAll");

        // always log this until we implement pagination
        logger
          .setEnabled(true)
          .log("Need to implement pagination for Dexie clients");

        let query: Promise<Array<M["DBRead"]>> | undefined;
        const filtersByOperator = bucketFiltersByOperator(params?.where);

        // A limitation of Dexie is that we can only apply one filter
        // per query, so we choose the first filter with non-empty values and
        // apply it. The other filters will be applied in-memory.
        const operatorToApply = objectKeys(filtersByOperator).find(
          (operator) => {
            if (hasDefinedProps(filtersByOperator, operator)) {
              const filterTuples = filtersByOperator[operator];
              return filterTuples.length > 0;
            }
            return false;
          },
        );

        if (
          operatorToApply &&
          hasDefinedProps(filtersByOperator, operatorToApply)
        ) {
          match(operatorToApply)
            .with("eq", (op) => {
              const [columns, values] = mapToArrayTuple(
                filtersByOperator[op],
                identity,
              );
              query = dbTable
                .where(columns as string[])
                .equals(values as IndexableTypePart)
                .toArray();
            })
            .with("in", (op) => {
              const [columns, values] = mapToArrayTuple(
                filtersByOperator[op],
                identity,
              );
              query = dbTable
                .where(columns as string[])
                .anyOf(values as IndexableTypePart[])
                .toArray();
            })
            .exhaustive();
        }

        let allData = await (query ?? dbTable.toArray());

        // Now apply all the filters that did not get applied before
        // Only if we actually applied a filter
        if (operatorToApply) {
          const newFilters = omit({
            from: filtersByOperator,
            keysToDelete: [operatorToApply],
          });

          // verify that the filters object isn't empty now that we removed
          // the one operator we applied earlier
          if (!isEmptyFiltersObject(newFilters)) {
            allData = applyFiltersToRows(allData, newFilters);
          }
        }

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

      bulkInsert: async (params: {
        data: ReadonlyArray<M["Insert"]>;
      }): Promise<Array<M["Read"]>> => {
        const logger = baseLogger.appendName("bulkInsert");

        logger.log("Attempting to insert with arguments", params.data);

        const dataToInsert = params.data.map((data) => {
          return parsers.fromModelInsertToDBInsert(data);
        });

        logger.log("Sending formatted data to Dexie", dataToInsert);

        // insert data
        const modelIds = await dbTable.bulkAdd(dataToInsert, { allKeys: true });
        const insertedData = await dbTable.bulkGet(modelIds);
        if (!insertedData) {
          throw new Error(
            "Could not find the models that should have just been inserted.",
          );
        }

        logger.log("Received data from Dexie", insertedData);

        // convert the inserted data back to a ModelRead
        const insertedModels = insertedData
          .map((data) => {
            if (data) {
              return parsers.fromDBReadToModelRead(data);
            }
            return undefined;
          })
          .filter(isNotUndefined);

        return insertedModels;
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

      bulkDelete: async (params: {
        ids: ReadonlyArray<M["modelPrimaryKeyType"]>;
      }): Promise<void> => {
        const logger = baseLogger.appendName("bulkDelete");
        logger.log("Attempting to delete", params.ids);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await dbTable.bulkDelete(params.ids as any);
        logger.log("Finished `bulkDelete`");
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
