import { FiltersByColumn } from "@utils/filters/filters.ts";
import { omit } from "@utils/objects/omit/omit.ts";
import { withLogger } from "../../../logger/src/module-augmenters/withLogger.ts";
import { createServiceClient } from "../ServiceClient/createServiceClient.ts";
import {
  ClientReturningOnlyPromises,
  CRUDClientModelSpec,
  ModelCRUDClient,
  ModelCRUDFunctions,
  ModelCRUDPage,
  UpsertOptions,
} from "./ModelCRUDClient.types.ts";
import type { ModelCRUDParserRegistry } from "../makeParserRegistry.ts";
import type { ILogger } from "@logger/Logger.types.ts";
import type { EmptyObject } from "type-fest";

type CreateModelCRUDClientOptions<
  M extends CRUDClientModelSpec,
  ExtendedQueriesClient extends ClientReturningOnlyPromises,
  ExtendedMutationsClient extends ClientReturningOnlyPromises,
> = {
  modelName: M["modelName"];

  /** The default batch size to use in `getAll`. Defaults to 500. */
  defaultGetAllBatchSize?: number;
  parsers: ModelCRUDParserRegistry<M>;

  /**
   * Additional queries to merge into the main client. These will also have
   * auto-generated `useQuery` hooks.
   */
  additionalQueries?: (config: {
    clientLogger: ILogger;
  }) => ExtendedQueriesClient;

  /**
   * Additional mutations to merge into the main client. These will also have
   * auto-generated `useMutation` hooks.
   */
  additionalMutations?: (config: {
    clientLogger: ILogger;
  }) => ExtendedMutationsClient;

  crudFunctions: ModelCRUDFunctions<M>;
};

export function createModelCRUDClient<
  M extends CRUDClientModelSpec,
  ExtendedQueriesClient extends ClientReturningOnlyPromises = EmptyObject,
  ExtendedMutationsClient extends ClientReturningOnlyPromises = EmptyObject,
>({
  modelName,
  defaultGetAllBatchSize = 500,
  parsers,
  additionalQueries,
  additionalMutations,
  crudFunctions,
}: CreateModelCRUDClientOptions<
  M,
  ExtendedQueriesClient,
  ExtendedMutationsClient
>): ModelCRUDClient<M, ExtendedQueriesClient, ExtendedMutationsClient> {
  const _getPage = async (params: {
    where: FiltersByColumn<M["DBRead"]> | undefined;
    pageSize: number;
    pageNum: number;
    logger: ILogger;
    totalRows: number | undefined;
  }): Promise<ModelCRUDPage<M["Read"]>> => {
    const { pageNum, pageSize, logger } = params;

    logger.log("Calling `getPage` with params", omit(params, "logger"));
    const pageRows = await crudFunctions.getPage(params);

    logger.log(
      `Received ${modelName} DBRead page[${pageNum}] from database. Row count: ${pageRows.length}`,
    );

    // Now let's figure out our page metadata to return
    let totalRows = params.totalRows;
    if (totalRows === undefined) {
      if (pageNum === 0 && pageRows.length < pageSize) {
        // if we're on the first page and the number of rows we received
        // is less than the requested `pageSize`, then we can be 100% sure
        // that we have all the rows. So there's no need to send a separate
        // `getCount` query
        totalRows = pageRows.length;
      } else {
        totalRows =
          (await crudFunctions.getCount({
            where: params.where,
            logger,
          })) ?? 0;
      }
    }

    // special case for when there's 0 rows, we still say there is 1 page
    const totalPages = totalRows === 0 ? 1 : Math.ceil(totalRows / pageSize);
    const nextPage = pageNum + 1 === totalPages ? undefined : pageNum + 1;
    const prevPage = pageNum === 0 ? undefined : pageNum - 1;

    // Finally, parse the db rows into models
    const pageModels = pageRows.map((row) => {
      return parsers.fromDBReadToModelRead(row);
    });
    logger.log(
      `Parsed page [${pageNum}] of ${modelName}Read (count: ${pageRows.length})`,
    );

    return {
      rows: pageModels,
      nextPage,
      prevPage,
      totalRows,
      totalPages,
    };
  };

  const baseServiceClient = createServiceClient(`${modelName}Client`);

  return withLogger(baseServiceClient, (baseLogger: ILogger) => {
    const additionalQueriesRecord =
      additionalQueries?.({ clientLogger: baseLogger }) ?? {};
    const additionalMutationsRecord =
      additionalMutations?.({ clientLogger: baseLogger }) ?? {};

    const modelClient = {
      ...baseServiceClient,
      crudFunctions,
      getById: async (params: {
        id: M["modelPrimaryKeyType"] | null | undefined;
      }): Promise<M["Read"] | undefined> => {
        const logger = baseLogger.appendName("getById");

        logger.log("Calling `getById` with params", params);
        const dbRow = await crudFunctions.getById({
          id: params.id,
          logger,
        });

        logger.log(`Received ${modelName} DBRead`, dbRow);
        if (!dbRow) {
          return undefined;
        }
        const model = parsers.fromDBReadToModelRead(dbRow);

        logger.log(`Parsed ${modelName}Read`, model);
        return model;
      },

      getCount: async (
        params: {
          where?: FiltersByColumn<M["DBRead"]>;
        } = {},
      ): Promise<number | null> => {
        const logger = baseLogger.appendName("getCount");

        logger.log("Calling `getCount` with params", params);
        const count = await crudFunctions.getCount({
          where: params.where,
          logger,
        });

        logger.log(`${modelName} count`, count);
        return count;
      },

      getPage: async (params: {
        where?: FiltersByColumn<M["DBRead"]>;
        pageSize: number;
        pageNum: number;
      }): Promise<ModelCRUDPage<M["Read"]>> => {
        const logger = baseLogger.appendName("getPage");
        const { where, pageNum = 0, pageSize } = params;
        const page = await _getPage({
          pageNum,
          pageSize,
          where,
          logger,
          totalRows: undefined,
        });
        return page;
      },

      getAll: async (
        params: {
          where?: FiltersByColumn<M["DBRead"]>;
          batchSize?: number;
        } = {},
      ): Promise<Array<M["Read"]>> => {
        const logger = baseLogger.appendName("getAll");

        logger.log("Calling `getAll` with params", params);
        const { where, batchSize = defaultGetAllBatchSize } = params;
        const firstPage = await _getPage({
          where,
          pageSize: batchSize,
          pageNum: 0,
          logger,
          totalRows: undefined,
        });

        // Now iterate through the pages until we get the last one. We keep
        // accumulating all rows into `allRows.
        let nextPage = firstPage.nextPage;
        const allRows = firstPage.rows;
        while (nextPage !== undefined) {
          const newPage = await _getPage({
            where,
            pageSize: batchSize,
            pageNum: nextPage,
            totalRows: firstPage.totalRows,
            logger,
          });
          allRows.push(...newPage.rows);
          nextPage = newPage.nextPage;
        }

        logger.log(`Received all ${modelName}Read (count: ${allRows.length})`);
        return allRows;
      },

      getOne: async (
        params: {
          where?: FiltersByColumn<M["DBRead"]>;
        } = {},
      ): Promise<M["Read"] | undefined> => {
        const logger = baseLogger.appendName("getOne");

        logger.log("Calling `getOne` with params", params);
        const page = await _getPage({
          where: params.where,
          pageSize: 1,
          pageNum: 0,
          logger,
          totalRows: 1,
        });

        const model = page.rows[0];
        logger.log(`Received ${modelName} Read`, model);
        return model;
      },

      insert: async (
        params: UpsertOptions & {
          data: M["Insert"];
        },
      ): Promise<M["Read"]> => {
        const logger = baseLogger.appendName("insert");

        logger.log("Calling `insert` with params", params);
        const { data, ...upsertOptions } = params;
        const dbDataToInsert = parsers.fromModelInsertToDBInsert(data);

        logger.log(`Sending ${modelName} DBInsert to database`, dbDataToInsert);
        const insertedData = await crudFunctions.insert({
          data: dbDataToInsert,
          logger,
          ...upsertOptions,
        });

        logger.log(`Received ${modelName} DBRead`, insertedData);
        const insertedModel = parsers.fromDBReadToModelRead(insertedData);

        logger.log(`Parsed ${modelName}Read`, insertedModel);
        return insertedModel;
      },

      bulkInsert: async (
        params: UpsertOptions & {
          data: ReadonlyArray<M["Insert"]>;
        },
      ): Promise<Array<M["Read"]>> => {
        const logger = baseLogger.appendName("bulkInsert");

        logger.log("Calling `bulkInsert` with params", params);
        const dbDataToInsert = params.data.map(
          parsers.fromModelInsertToDBInsert,
        );

        logger.log(
          `Sending ${modelName} DBInsert list to database`,
          dbDataToInsert,
        );
        const insertedData = await crudFunctions.bulkInsert({
          data: dbDataToInsert,
          logger,
        });

        logger.log(`Received ${modelName} DBRead list`, insertedData);
        const insertedModels = insertedData.map(parsers.fromDBReadToModelRead);

        logger.log(
          `Parsed ${modelName}Read list (count: ${insertedModels.length})`,
        );
        return insertedModels;
      },

      update: async (params: {
        id: M["modelPrimaryKeyType"];
        data: M["Update"];
      }): Promise<M["Read"]> => {
        const logger = baseLogger.appendName("update");
        logger.log("Calling `update` with params", params);
        const dbDataToUpdate = parsers.fromModelUpdateToDBUpdate(params.data);

        logger.log(`Sending ${modelName} DBUpdate to database`, dbDataToUpdate);
        const updatedData = await crudFunctions.update({
          id: params.id,
          data: dbDataToUpdate,
          logger,
        });

        logger.log(`Received ${modelName} DBRead`, updatedData);
        const updatedModel = parsers.fromDBReadToModelRead(updatedData);

        logger.log(`Parsed ${modelName}Read`, updatedModel);
        return updatedModel;
      },

      delete: async (params: {
        id: M["modelPrimaryKeyType"];
      }): Promise<void> => {
        const logger = baseLogger.appendName("delete");
        logger.log("Calling `delete` with params", params);
        await crudFunctions.delete({
          id: params.id,
          logger,
        });
        logger.log("Finished `delete`");
      },

      bulkDelete: async (params: {
        ids: ReadonlyArray<M["modelPrimaryKeyType"]>;
      }): Promise<void> => {
        const logger = baseLogger.appendName("bulkDelete");
        logger.log("Calling `bulkDelete` with params", params);
        await crudFunctions.bulkDelete({
          ids: params.ids,
          logger,
        });
        logger.log("Finished `bulkDelete`");
      },

      ...additionalQueriesRecord,
      ...additionalMutationsRecord,
    };

    return {
      ...baseServiceClient,
      ...modelClient,
      parsers,
      // Using `any` here only because TypeScript is struggling with the
      // complexity of the generics and function name extractions.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  });
}
