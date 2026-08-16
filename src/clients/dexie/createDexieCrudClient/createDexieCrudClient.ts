import { createModelCrudClient } from "@avandar/clients";
import {
  assertIsDefined,
  isDefined,
  isEmptyFiltersObject,
  promiseMapSequential,
  promiseReduce,
} from "@avandar/utils";
import { assertDexieColumnsAreIndexed } from "@/clients/dexie/dexieColumnIsIndexed";
import {
  buildFilteredDexieCollection,
  findFirstConflictingRowByIndexedColumns,
} from "@/clients/dexie/dexieFilteredCollection";
import type { DexieCrudModelSpec } from "@/clients/dexie/DexieCrudClient/DexieCrudClient.types";
import type { DexieDBType } from "@/clients/dexie/DexieDBVersionManager";
import type {
  ClientReturningOnlyPromises,
  ModelCrudClient,
  ModelCrudParserRegistry,
  UpsertOptions,
} from "@avandar/clients";
import type { ILogger } from "@avandar/logger";
import type { EmptyObject, FiltersByColumn } from "@avandar/utils";
import type {
  IDType,
  IndexableType,
  IndexSpec,
  Table,
  UpdateSpec,
} from "dexie";

/**
 * Reads the IndexedDB primary key value from a row using the table key path.
 */
function _extractPrimaryKeyFromRow(
  row: Record<string, unknown>,
  primKey: IndexSpec,
): IndexableType | undefined {
  const { keyPath } = primKey;
  if (keyPath === undefined) {
    return undefined;
  }
  if (typeof keyPath === "string") {
    return row[keyPath] as IndexableType;
  }
  return keyPath.map((key) => {
    return row[key];
  }) as IndexableType;
}

/**
 * Returns whether two rows match on every `onConflict.columnNames` field.
 */
function _rowsMatchOnConflictColumns(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  columnNames: readonly string[],
): boolean {
  return columnNames.every((col) => {
    return Object.is(a[col], b[col]);
  });
}

/**
 * Returns the first stored row that conflicts with `newRow` on `columnNames`.
 */
function _findConflictingRow<T extends Record<string, unknown>>(
  rows: readonly T[],
  newRow: T,
  columnNames: readonly string[],
): T | undefined {
  return rows.find((row) => {
    return _rowsMatchOnConflictColumns(row, newRow, columnNames);
  });
}

/**
 * Returns whether `columnNames` matches the table primary key path exactly.
 */
function _isPrimaryKeyConflictColumns(
  columnNames: readonly string[],
  primKey: IndexSpec,
): boolean {
  const { keyPath } = primKey;
  if (keyPath === undefined) {
    return false;
  }
  if (typeof keyPath === "string") {
    return columnNames.length === 1 && columnNames[0] === keyPath;
  }
  if (columnNames.length !== keyPath.length) {
    return false;
  }
  return keyPath.every((col, index) => {
    return col === columnNames[index];
  });
}

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

type DexieKey<M extends DexieCrudModelSpec> = IDType<
  M["DBRead"],
  M["modelPrimaryKeyType"]
> &
  M["modelPrimaryKeyType"] &
  IndexableType;

type InsertParams<M extends DexieCrudModelSpec> = UpsertOptions & {
  data: M["DBInsert"];
  logger: ILogger;
};

type BulkInsertParams<M extends DexieCrudModelSpec> = UpsertOptions & {
  data: ReadonlyArray<M["DBInsert"]>;
  logger: ILogger;
};

type GetPageParams<M extends DexieCrudModelSpec> = {
  where?: FiltersByColumn<M["DBRead"]>;
  pageSize: number;
  pageNum: number;
  logger: ILogger;
};

type BulkAccumulator<M extends DexieCrudModelSpec> = {
  working: Array<M["DBRead"]>;
  output: Array<M["DBRead"]>;
};

type UpsertIndexedBatchRowOptions<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
> = {
  context: DexieCrudOperationContext<M, DB>;
  accumulator: BulkAccumulator<M>;
  item: M["DBInsert"];
  columnNames: readonly string[];
  ignoreDuplicates: boolean;
};

type DexieCrudOperationContext<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
> = {
  db: DB;
  modelName: M["modelName"];
  table: DB[M["modelName"]];
};

type UpsertRowOptions<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
> = {
  context: DexieCrudOperationContext<M, DB>;
  data: M["DBInsert"];
  columnNames: readonly string[];
  ignoreDuplicates: boolean;
};

type UpsertRowsOptions<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
> = {
  context: DexieCrudOperationContext<M, DB>;
  data: ReadonlyArray<M["DBInsert"]>;
  columnNames: readonly string[];
  ignoreDuplicates: boolean;
};

function _getFilteredDexieCollection<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(
  options: Readonly<{
    context: DexieCrudOperationContext<M, DB>;
    where: FiltersByColumn<M["DBRead"]>;
  }>,
) {
  return buildFilteredDexieCollection(
    String(options.context.modelName),
    options.context.table as unknown as Table<M["DBRead"], IndexableType>,
    options.where,
  );
}

async function _getRequiredRow<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(
  options: Readonly<{
    context: DexieCrudOperationContext<M, DB>;
    key: DexieKey<M>;
    message: string;
  }>,
): Promise<M["DBRead"]> {
  const row = await options.context.table.get(options.key);
  if (!row) {
    throw new Error(options.message);
  }
  return row;
}

function _getPrimaryKey<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(
  options: Readonly<{
    context: DexieCrudOperationContext<M, DB>;
    row: M["DBInsert"];
    message: string;
  }>,
): DexieKey<M> {
  const key = _extractPrimaryKeyFromRow(
    options.row as Record<string, unknown>,
    options.context.table.schema.primKey,
  );
  if (key === undefined) {
    throw new Error(options.message);
  }
  return key as DexieKey<M>;
}

async function _addAndGet<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(
  options: Readonly<{
    context: DexieCrudOperationContext<M, DB>;
    data: M["DBInsert"];
  }>,
): Promise<M["DBRead"]> {
  const key = await options.context.table.add(options.data);
  return _getRequiredRow({
    context: options.context,
    key: key as DexieKey<M>,
    message: "Could not find the model that should have just been inserted.",
  });
}

async function _putAndGet<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(
  options: Readonly<{
    context: DexieCrudOperationContext<M, DB>;
    data: M["DBInsert"];
    action: string;
  }>,
): Promise<M["DBRead"]> {
  await options.context.table.put(options.data);
  const key = _getPrimaryKey({
    context: options.context,
    row: options.data,
    message: `Could not extract primary key after ${options.action}.`,
  });
  return _getRequiredRow({
    context: options.context,
    key,
    message: `Could not find the model after ${options.action}.`,
  });
}

async function _findIndexedConflict<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(
  options: Readonly<{
    context: DexieCrudOperationContext<M, DB>;
    data: M["DBInsert"];
    columnNames: readonly string[];
  }>,
): Promise<M["DBRead"] | undefined> {
  const row = await findFirstConflictingRowByIndexedColumns(
    String(options.context.modelName),
    options.context.table as Table<Record<string, unknown>, IndexableType>,
    options.data as Record<string, unknown>,
    options.columnNames,
  );
  return row as M["DBRead"] | undefined;
}

async function _upsertRowByPrimaryKey<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(options: Readonly<UpsertRowOptions<M, DB>>): Promise<M["DBRead"]> {
  const key = _getPrimaryKey({
    context: options.context,
    row: options.data,
    message: "Could not extract primary key for upsert.",
  });
  const existing = await options.context.table.get(key);
  if (options.ignoreDuplicates && existing) {
    return existing;
  }
  return _putAndGet({
    context: options.context,
    data: options.data,
    action: "upsert put",
  });
}

async function _upsertRowByIndexedConflict<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(options: Readonly<UpsertRowOptions<M, DB>>): Promise<M["DBRead"]> {
  return options.context.db.transaction(
    "rw",
    options.context.table,
    async () => {
      const conflict = await _findIndexedConflict(options);
      if (!conflict) {
        return _addAndGet({ context: options.context, data: options.data });
      }
      if (options.ignoreDuplicates) {
        return conflict;
      }
      return _putAndGet({
        context: options.context,
        data: { ...conflict, ...options.data } as M["DBInsert"],
        action: "upsert merge",
      });
    },
  );
}

function _bulkAddAndGet<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(
  options: Readonly<{
    context: DexieCrudOperationContext<M, DB>;
    data: ReadonlyArray<M["DBInsert"]>;
  }>,
): Promise<Array<M["DBRead"]>> {
  return options.context.table
    .bulkAdd(options.data, { allKeys: true })
    .then(async (keys) => {
      return (await options.context.table.bulkGet(keys)).filter(isDefined);
    });
}

function _bulkPutAndGet<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(
  options: Readonly<{
    context: DexieCrudOperationContext<M, DB>;
    data: ReadonlyArray<M["DBInsert"]>;
  }>,
): Promise<Array<M["DBRead"]>> {
  return options.context.table
    .bulkPut(options.data, { allKeys: true })
    .then(async (keys) => {
      return (await options.context.table.bulkGet(keys)).filter(isDefined);
    });
}

async function _upsertRowsByPrimaryKey<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(options: Readonly<UpsertRowsOptions<M, DB>>): Promise<Array<M["DBRead"]>> {
  const keys = options.data.map((row) => {
    return _getPrimaryKey({
      context: options.context,
      row,
      message: "Could not extract primary key for every bulk upsert row.",
    });
  });
  const existingRows = await options.context.table.bulkGet(keys);
  if (!options.ignoreDuplicates) {
    const mergedRows = options.data.map((row, index) => {
      return existingRows[index] ?
          ({ ...existingRows[index], ...row } as M["DBInsert"])
        : row;
    });
    return _bulkPutAndGet({ context: options.context, data: mergedRows });
  }
  return promiseMapSequential(
    options.data.map((row, index) => {
      return { row, index };
    }),
    ({ row, index }) => {
      return (
        existingRows[index] ??
        _putAndGet({
          context: options.context,
          data: row,
          action: "bulk upsert put",
        })
      );
    },
  );
}

async function _getBatchConflict<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(
  options: Readonly<
    Pick<
      UpsertIndexedBatchRowOptions<M, DB>,
      "context" | "accumulator" | "item" | "columnNames"
    >
  >,
): Promise<M["DBRead"] | undefined> {
  const batchConflict = _findConflictingRow(
    options.accumulator.working as Array<Record<string, unknown>>,
    options.item as Record<string, unknown>,
    options.columnNames,
  );
  return (
    (batchConflict as M["DBRead"] | undefined) ??
    _findIndexedConflict({
      context: options.context,
      data: options.item,
      columnNames: options.columnNames,
    })
  );
}

async function _upsertIndexedBatchRow<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(
  options: Readonly<UpsertIndexedBatchRowOptions<M, DB>>,
): Promise<BulkAccumulator<M>> {
  const conflict = await _getBatchConflict(options);
  if (!conflict) {
    const added = await _addAndGet({
      context: options.context,
      data: options.item,
    });
    return {
      working: [...options.accumulator.working, added],
      output: [...options.accumulator.output, added],
    };
  }
  if (options.ignoreDuplicates) {
    return {
      ...options.accumulator,
      output: [...options.accumulator.output, conflict],
    };
  }
  const finalRow = await _putAndGet({
    context: options.context,
    data: { ...conflict, ...options.item } as M["DBInsert"],
    action: "bulk upsert merge",
  });
  const working = options.accumulator.working.filter((row) => {
    return !_rowsMatchOnConflictColumns(
      row as Record<string, unknown>,
      conflict as Record<string, unknown>,
      options.columnNames,
    );
  });
  return {
    working: [...working, finalRow],
    output: [...options.accumulator.output, finalRow],
  };
}

async function _upsertRowsByIndexedConflict<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(options: Readonly<UpsertRowsOptions<M, DB>>): Promise<Array<M["DBRead"]>> {
  return options.context.db.transaction(
    "rw",
    options.context.table,
    async () => {
      const accumulator = await promiseReduce(
        options.data,
        (currentAccumulator, item) => {
          return _upsertIndexedBatchRow({
            ...options,
            accumulator: currentAccumulator,
            item,
          });
        },
        { working: [], output: [] } as BulkAccumulator<M>,
      );
      return accumulator.output;
    },
  );
}

function _createDexieCrudReadOperations<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(options: Readonly<{ context: DexieCrudOperationContext<M, DB> }>) {
  return {
    getById: _createGetByIdOperation(options),
    getCount: _createGetCountOperation(options),
    getPage: _createGetPageOperation(options),
  };
}

function _createGetByIdOperation<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(options: Readonly<{ context: DexieCrudOperationContext<M, DB> }>) {
  return async (
    params: Readonly<{
      id: M["modelPrimaryKeyType"] | null | undefined;
      logger: ILogger;
    }>,
  ): Promise<M["DBRead"] | undefined> => {
    if (params.id === undefined || params.id === null) {
      return undefined;
    }
    return (
      (await options.context.table.get(params.id as DexieKey<M>)) ?? undefined
    );
  };
}

function _createGetCountOperation<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(options: Readonly<{ context: DexieCrudOperationContext<M, DB> }>) {
  return async (
    params: Readonly<{
      where?: FiltersByColumn<M["DBRead"]>;
      logger: ILogger;
    }>,
  ): Promise<number> => {
    if (!params.where || isEmptyFiltersObject(params.where)) {
      return options.context.table.count();
    }
    return _getFilteredDexieCollection({
      context: options.context,
      where: params.where,
    }).count();
  };
}

function _createGetPageOperation<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(options: Readonly<{ context: DexieCrudOperationContext<M, DB> }>) {
  return async (
    params: Readonly<GetPageParams<M>>,
  ): Promise<Array<M["DBRead"]>> => {
    const startIndex = params.pageNum * params.pageSize;
    const collection =
      !params.where || isEmptyFiltersObject(params.where) ?
        options.context.table.toCollection()
      : _getFilteredDexieCollection({
          context: options.context,
          where: params.where,
        });
    return collection.offset(startIndex).limit(params.pageSize).toArray();
  };
}

function _createDexieCrudMutationOperations<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(options: Readonly<{ context: DexieCrudOperationContext<M, DB> }>) {
  return {
    insert: _createInsertOperation(options),
    bulkInsert: _createBulkInsertOperation(options),
    update: _createUpdateOperation(options),
    delete: _createDeleteOperation(options),
    bulkDelete: _createBulkDeleteOperation(options),
  };
}

function _createInsertOperation<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(options: Readonly<{ context: DexieCrudOperationContext<M, DB> }>) {
  return async (params: Readonly<InsertParams<M>>): Promise<M["DBRead"]> => {
    if (!params.upsert) {
      return _addAndGet({ context: options.context, data: params.data });
    }
    const onConflict = params.onConflict;
    const columnNames = onConflict?.columnNames;
    if (!columnNames?.length) {
      return _putAndGet({
        context: options.context,
        data: params.data,
        action: "upsert put",
      });
    }
    assertDexieColumnsAreIndexed(
      String(options.context.modelName),
      options.context.table,
      columnNames,
    );
    const upsertOptions = {
      context: options.context,
      data: params.data,
      columnNames,
      ignoreDuplicates: onConflict?.ignoreDuplicates ?? false,
    };
    return (
        _isPrimaryKeyConflictColumns(
          columnNames,
          options.context.table.schema.primKey,
        )
      ) ?
        _upsertRowByPrimaryKey(upsertOptions)
      : _upsertRowByIndexedConflict(upsertOptions);
  };
}

function _createBulkInsertOperation<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(options: Readonly<{ context: DexieCrudOperationContext<M, DB> }>) {
  return async (
    params: Readonly<BulkInsertParams<M>>,
  ): Promise<Array<M["DBRead"]>> => {
    if (!params.upsert) {
      return _bulkAddAndGet({ context: options.context, data: params.data });
    }
    const onConflict = params.onConflict;
    const columnNames = onConflict?.columnNames;
    if (!columnNames?.length) {
      return _bulkPutAndGet({ context: options.context, data: params.data });
    }
    assertDexieColumnsAreIndexed(
      String(options.context.modelName),
      options.context.table,
      columnNames,
    );
    const upsertOptions = {
      context: options.context,
      data: params.data,
      columnNames,
      ignoreDuplicates: onConflict?.ignoreDuplicates ?? false,
    };
    return (
        _isPrimaryKeyConflictColumns(
          columnNames,
          options.context.table.schema.primKey,
        )
      ) ?
        _upsertRowsByPrimaryKey(upsertOptions)
      : _upsertRowsByIndexedConflict(upsertOptions);
  };
}

function _createUpdateOperation<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(options: Readonly<{ context: DexieCrudOperationContext<M, DB> }>) {
  return async (
    params: Readonly<{
      id: M["modelPrimaryKeyType"];
      data: M["DBUpdate"];
      logger: ILogger;
    }>,
  ): Promise<M["DBRead"]> => {
    const key = params.id as DexieKey<M>;
    await options.context.table.update(
      key,
      params.data as UpdateSpec<M["DBRead"]>,
    );
    return _getRequiredRow({
      context: options.context,
      key,
      message: `Could not retrieve updated record with id ${params.id}`,
    });
  };
}

function _createDeleteOperation<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(options: Readonly<{ context: DexieCrudOperationContext<M, DB> }>) {
  return async (
    params: Readonly<{ id: M["modelPrimaryKeyType"]; logger: ILogger }>,
  ): Promise<void> => {
    return options.context.table.delete(params.id as DexieKey<M>);
  };
}

function _createBulkDeleteOperation<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(options: Readonly<{ context: DexieCrudOperationContext<M, DB> }>) {
  return async (
    params: Readonly<{
      ids: ReadonlyArray<M["modelPrimaryKeyType"]>;
      logger: ILogger;
    }>,
  ): Promise<void> => {
    return options.context.table.bulkDelete(params.ids as Array<DexieKey<M>>);
  };
}

function _createDexieCrudOperations<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(options: Readonly<{ db: DB; modelName: M["modelName"] }>) {
  const table = options.db[options.modelName];
  assertIsDefined(
    table,
    `Could not find Dexie table for model ${options.modelName}`,
  );
  const context = { db: options.db, modelName: options.modelName, table };
  return {
    table,
    ..._createDexieCrudReadOperations({ context }),
    ..._createDexieCrudMutationOperations({ context }),
  };
}

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
  const { db, modelName, parsers, queries, mutations } = options;
  const operations = _createDexieCrudOperations<M, DB>({ db, modelName });
  return createModelCrudClient({
    modelName,
    parsers,
    additionalQueries:
      queries ?
        ({ clientLogger }) => {
          return queries({
            logger: clientLogger,
            db,
            dbTable: operations.table,
          });
        }
      : undefined,
    additionalMutations:
      mutations ?
        ({ clientLogger }) => {
          return mutations({
            logger: clientLogger,
            db,
            dbTable: operations.table,
          });
        }
      : undefined,
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
