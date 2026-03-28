import { ModelCRUDParserRegistry } from "@clients/makeParserRegistry";
import { createModelCRUDClient } from "@clients/ModelCRUDClient/createModelCRUDClient";
import { UpsertOptions } from "@clients/ModelCRUDClient/ModelCRUDClient.types";
import { assertIsDefined } from "@utils/asserts/assertIsDefined/assertIsDefined";
import { applyFiltersToRows } from "@utils/filters/applyFiltersToRows/applyFiltersToRows";
import { isDefined } from "@utils/guards/isDefined/isDefined";
import { DexieCRUDModelSpec } from "@/clients/dexie/DexieCRUDClient.types";
import { promiseMapSequential, promiseReduce } from "@/lib/utils/promises";
import type { DexieDBType } from "@/clients/dexie/DexieDBVersionManager";
import type {
  ClientReturningOnlyPromises,
  ModelCRUDClient,
} from "@clients/ModelCRUDClient/ModelCRUDClient.types";
import type { ILogger } from "@logger/Logger.types";
import type { FiltersByColumn } from "@utils/filters/filters";
import type { EmptyObject } from "@utils/types/common.types";
import type { IDType, IndexableType, IndexSpec, UpdateSpec } from "dexie";

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

export type DexieCRUDClient<
  M extends DexieCRUDModelSpec,
  ExtendedQueriesClient extends ClientReturningOnlyPromises,
  ExtendedMutationsClient extends ClientReturningOnlyPromises,
> = ModelCRUDClient<M, ExtendedQueriesClient, ExtendedMutationsClient>;

type CreateDexieCRUDClientOptions<
  M extends DexieCRUDModelSpec,
  ExtendedQueriesClient extends ClientReturningOnlyPromises,
  ExtendedMutationsClient extends ClientReturningOnlyPromises,
  DB extends DexieDBType<M> = DexieDBType<M>,
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
  M extends DexieCRUDModelSpec,
  ExtendedQueriesClient extends ClientReturningOnlyPromises = EmptyObject,
  ExtendedMutationsClient extends ClientReturningOnlyPromises = EmptyObject,
  DB extends DexieDBType<M> = DexieDBType<M>,
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
  assertIsDefined(dbTable, `Could not find Dexie table for model ${modelName}`);

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
        const { data, upsert, onConflict } = params;
        const primKey = dbTable.schema.primKey;

        if (!upsert) {
          const insertedRowId = await dbTable.add(data);
          const insertedData = await dbTable.get(insertedRowId);
          if (!insertedData) {
            throw new Error(
              "Could not find the model that should have just been inserted.",
            );
          }
          return insertedData;
        }

        const columnNames = onConflict?.columnNames;
        const hasConflictSpec =
          onConflict !== undefined &&
          columnNames !== undefined &&
          columnNames.length > 0;

        // Upsert with no `onConflict`: replace or insert by primary key via
        // `put` only.
        if (!hasConflictSpec) {
          await dbTable.put(data);
          const pk = _extractPrimaryKeyFromRow(
            data as Record<string, unknown>,
            primKey,
          );
          if (pk === undefined) {
            throw new Error("Could not extract primary key after upsert put.");
          }
          const insertedData = await dbTable.get(
            pk as IDType<M["DBRead"], M["modelPrimaryKey"]>,
          );
          if (!insertedData) {
            throw new Error(
              "Could not find the model that should have been upserted.",
            );
          }
          return insertedData;
        }

        assertIsDefined(columnNames);
        const ignoreDuplicates = onConflict.ignoreDuplicates;

        // `onConflict.columnNames` equals the PK path: detect duplicates with
        // keyed `get` / `put` (no full-table read).
        if (_isPrimaryKeyConflictColumns(columnNames, primKey)) {
          const pk = _extractPrimaryKeyFromRow(
            data as Record<string, unknown>,
            primKey,
          );
          if (pk === undefined) {
            throw new Error("Could not extract primary key for upsert.");
          }
          const typedPk = pk as IDType<M["DBRead"], M["modelPrimaryKey"]>;
          if (ignoreDuplicates) {
            const existing = await dbTable.get(typedPk);
            if (existing) {
              return existing;
            }
            await dbTable.put(data);
            const insertedData = await dbTable.get(typedPk);
            if (!insertedData) {
              throw new Error("Could not find the model after upsert put.");
            }
            return insertedData;
          }
          await dbTable.put(data);
          const insertedData = await dbTable.get(typedPk);
          if (!insertedData) {
            throw new Error("Could not find the model after upsert put.");
          }
          return insertedData;
        }

        // `onConflict` on non-PK columns: no native keyed lookup; load rows and
        // find a duplicate in memory, then merge+`put` or `add`.
        return await db.transaction("rw", dbTable, async () => {
          const allRows = await dbTable.toArray();
          const conflict = _findConflictingRow(
            allRows as Array<Record<string, unknown>>,
            data as Record<string, unknown>,
            columnNames,
          );
          if (conflict) {
            if (ignoreDuplicates) {
              return conflict as M["DBRead"];
            }
            const merged = {
              ...conflict,
              ...data,
            } as M["DBInsert"];
            await dbTable.put(merged);
            const mergedPk = _extractPrimaryKeyFromRow(
              merged as Record<string, unknown>,
              primKey,
            );
            if (mergedPk === undefined) {
              throw new Error(
                "Could not extract primary key after conflict merge.",
              );
            }
            const updated = await dbTable.get(
              mergedPk as IDType<M["DBRead"], M["modelPrimaryKey"]>,
            );
            if (!updated) {
              throw new Error("Could not find the model after upsert merge.");
            }
            return updated;
          }
          const insertedRowId = await dbTable.add(data);
          const insertedData = await dbTable.get(insertedRowId);
          if (!insertedData) {
            throw new Error(
              "Could not find the model that should have just been inserted.",
            );
          }
          return insertedData;
        });
      },

      bulkInsert: async (
        params: UpsertOptions & {
          data: ReadonlyArray<M["DBInsert"]>;
          logger: ILogger;
        },
      ) => {
        const { data, upsert, onConflict } = params;
        const primKey = dbTable.schema.primKey;

        if (!upsert) {
          const insertedRowIds = await dbTable.bulkAdd(data, {
            allKeys: true,
          });
          const insertedData = await dbTable.bulkGet(insertedRowIds);
          if (!insertedData) {
            throw new Error(
              "Could not find the models that should have just been inserted.",
            );
          }
          return insertedData.filter(isDefined);
        }

        const columnNames = onConflict?.columnNames;
        const hasConflictSpec =
          onConflict !== undefined &&
          columnNames !== undefined &&
          columnNames.length > 0;

        // Bulk upsert with no `onConflict`: keyed `bulkPut` by primary key.
        if (!hasConflictSpec) {
          const putKeys = await dbTable.bulkPut(data, { allKeys: true });
          const insertedData = await dbTable.bulkGet(putKeys);
          if (!insertedData) {
            throw new Error(
              "Could not find the models that should have been upserted.",
            );
          }
          return insertedData.filter(isDefined);
        }

        assertIsDefined(columnNames);
        const ignoreDuplicates = onConflict.ignoreDuplicates;

        // PK conflict path: `bulkGet` existing rows by key, then `bulkPut`
        // merges or sequential `put` when ignoring duplicates.
        if (_isPrimaryKeyConflictColumns(columnNames, primKey)) {
          const keys = data.map((row) => {
            return _extractPrimaryKeyFromRow(
              row as Record<string, unknown>,
              primKey,
            );
          });
          if (
            keys.some((key) => {
              return key === undefined;
            })
          ) {
            throw new Error(
              "Could not extract primary key for every bulk upsert row.",
            );
          }
          const typedKeys = keys as Array<
            IDType<M["DBRead"], M["modelPrimaryKey"]>
          >;
          const existingRows = await dbTable.bulkGet(typedKeys);

          // Merge incoming rows with any existing row that shares the same PK.
          if (!ignoreDuplicates) {
            const merged = data.map((row, index) => {
              const existing = existingRows[index];
              if (existing) {
                return { ...existing, ...row } as M["DBInsert"];
              }
              return row;
            });
            const putKeys = await dbTable.bulkPut(merged, { allKeys: true });
            const insertedData = await dbTable.bulkGet(putKeys);
            if (!insertedData) {
              throw new Error(
                "Could not find the models after bulk upsert put.",
              );
            }
            return insertedData.filter(isDefined);
          }

          // Skip duplicates: return stored row when the PK exists; otherwise
          // insert with `put`.
          return await promiseMapSequential(
            data.map((row, index) => {
              return { index, row };
            }),
            async ({ index, row }) => {
              const existing = existingRows[index];
              if (existing) {
                return existing;
              }
              await dbTable.put(row);
              const pk = typedKeys[index];
              const inserted = await dbTable.get(pk);
              if (!inserted) {
                throw new Error(
                  "Could not find the model after bulk upsert put.",
                );
              }
              return inserted;
            },
          );
        }

        // Non-PK `onConflict`: `toArray` + ordered reduce so each item sees
        // prior inserts/merges in `working` (app-level duplicate detection).
        return await db.transaction("rw", dbTable, async () => {
          type Acc = {
            working: Array<M["DBRead"]>;
            output: Array<M["DBRead"]>;
          };
          const initialWorking = await dbTable.toArray();
          const reduced = await promiseReduce(
            data,
            async (acc: Acc, item: M["DBInsert"]) => {
              const conflict = _findConflictingRow(
                acc.working as Array<Record<string, unknown>>,
                item as Record<string, unknown>,
                columnNames,
              );
              if (conflict) {
                if (ignoreDuplicates) {
                  return {
                    working: acc.working,
                    output: [...acc.output, conflict as M["DBRead"]],
                  };
                }
                const merged = {
                  ...conflict,
                  ...item,
                } as M["DBInsert"];
                await dbTable.put(merged);
                const mergedPk = _extractPrimaryKeyFromRow(
                  merged as Record<string, unknown>,
                  primKey,
                );
                if (mergedPk === undefined) {
                  throw new Error(
                    "Could not extract primary key after bulk merge.",
                  );
                }
                const finalRow = await dbTable.get(
                  mergedPk as IDType<M["DBRead"], M["modelPrimaryKey"]>,
                );
                if (!finalRow) {
                  throw new Error(
                    "Could not find the model after bulk upsert merge.",
                  );
                }
                const conflictIndex = acc.working.findIndex((r) => {
                  return _rowsMatchOnConflictColumns(
                    r as Record<string, unknown>,
                    conflict as Record<string, unknown>,
                    columnNames,
                  );
                });
                const nextWorking = acc.working.map((r, index) => {
                  return index === conflictIndex ? finalRow : r;
                });
                return {
                  working: nextWorking,
                  output: [...acc.output, finalRow],
                };
              }
              await dbTable.add(item);
              const pk = _extractPrimaryKeyFromRow(
                item as Record<string, unknown>,
                primKey,
              );
              if (pk === undefined) {
                throw new Error(
                  "Could not extract primary key after bulk add.",
                );
              }
              const added = await dbTable.get(
                pk as IDType<M["DBRead"], M["modelPrimaryKey"]>,
              );
              if (!added) {
                throw new Error(
                  "Could not find the model that should have been added.",
                );
              }
              return {
                working: [...acc.working, added],
                output: [...acc.output, added],
              };
            },
            {
              working: initialWorking,
              output: [] as Array<M["DBRead"]>,
            },
          );
          return reduced.output;
        });
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
