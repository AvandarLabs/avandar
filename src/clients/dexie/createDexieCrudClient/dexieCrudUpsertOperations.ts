import { isDefined, promiseMapSequential, promiseReduce } from "@avandar/utils";
import {
  addAndGet,
  findConflictingRow,
  findIndexedConflict,
  getPrimaryKey,
  putAndGet,
  rowsMatchOnConflictColumns,
} from "@/clients/dexie/createDexieCrudClient/dexieCrudRowAccess";
import type { DexieCrudOperationContext } from "@/clients/dexie/createDexieCrudClient/createDexieCrudClient.types";
import type { DexieCrudModelSpec } from "@/clients/dexie/DexieCrudClient/DexieCrudClient.types";
import type { DexieDBType } from "@/clients/dexie/DexieDBVersionManager";

type BulkAccumulator<M extends DexieCrudModelSpec> = {
  working: Array<M["DBRead"]>;
  output: Array<M["DBRead"]>;
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

/** Adds every row and returns the stored rows IndexedDB produced. */
export function bulkAddAndGet<
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

/** Puts every row and returns the stored rows IndexedDB produced. */
export function bulkPutAndGet<
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

/** Upserts one row whose conflict columns are the table's primary key. */
export async function upsertRowByPrimaryKey<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(options: Readonly<UpsertRowOptions<M, DB>>): Promise<M["DBRead"]> {
  const key = getPrimaryKey({
    context: options.context,
    row: options.data,
    message: "Could not extract primary key for upsert.",
  });
  const existing = await options.context.table.get(key);
  return options.ignoreDuplicates && existing ?
      existing
    : putAndGet({
        context: options.context,
        data: options.data,
        action: "upsert put",
      });
}

/** Upserts one row against a conflict on non-primary indexed columns. */
export async function upsertRowByIndexedConflict<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(options: Readonly<UpsertRowOptions<M, DB>>): Promise<M["DBRead"]> {
  return options.context.db.transaction(
    "rw",
    options.context.table,
    async () => {
      const conflict = await findIndexedConflict(options);
      if (!conflict) {
        return addAndGet({ context: options.context, data: options.data });
      }
      if (options.ignoreDuplicates) {
        return conflict;
      }
      return putAndGet({
        context: options.context,
        data: { ...conflict, ...options.data } as M["DBInsert"],
        action: "upsert merge",
      });
    },
  );
}

/** Upserts many rows whose conflict columns are the table's primary key. */
export async function upsertRowsByPrimaryKey<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(options: Readonly<UpsertRowsOptions<M, DB>>): Promise<Array<M["DBRead"]>> {
  const keys = options.data.map((row) => {
    return getPrimaryKey({
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
    return bulkPutAndGet({ context: options.context, data: mergedRows });
  }
  return promiseMapSequential(
    options.data.map((row, index) => {
      return { row, index };
    }),
    ({ row, index }) => {
      return (
        existingRows[index] ??
        putAndGet({
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
  const batchConflict = findConflictingRow(
    options.accumulator.working as Array<Record<string, unknown>>,
    options.item as Record<string, unknown>,
    options.columnNames,
  );
  return (
    (batchConflict as M["DBRead"] | undefined) ??
    findIndexedConflict({
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
    const added = await addAndGet({
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
  const finalRow = await putAndGet({
    context: options.context,
    data: { ...conflict, ...options.item } as M["DBInsert"],
    action: "bulk upsert merge",
  });
  const working = options.accumulator.working.filter((row) => {
    return !rowsMatchOnConflictColumns(
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

/** Upserts many rows against conflicts on non-primary indexed columns. */
export async function upsertRowsByIndexedConflict<
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
