import {
  addAndGet,
  getRequiredRow,
  isPrimaryKeyConflictColumns,
  putAndGet,
} from "@/clients/dexie/createDexieCrudClient/dexieCrudRowAccess";
import {
  bulkAddAndGet,
  bulkPutAndGet,
  upsertRowByIndexedConflict,
  upsertRowByPrimaryKey,
  upsertRowsByIndexedConflict,
  upsertRowsByPrimaryKey,
} from "@/clients/dexie/createDexieCrudClient/dexieCrudUpsertOperations";
import { assertDexieColumnsAreIndexed } from "@/clients/dexie/dexieColumnIsIndexed";
import type {
  BulkInsertParams,
  DexieCrudOperationContext,
  DexieKey,
  InsertParams,
} from "@/clients/dexie/createDexieCrudClient/createDexieCrudClient.types";
import type { DexieCrudModelSpec } from "@/clients/dexie/DexieCrudClient/DexieCrudClient.types";
import type { DexieDBType } from "@/clients/dexie/DexieDBVersionManager";
import type { ILogger } from "@avandar/logger";
import type { UpdateSpec } from "dexie";

function _createInsertOperation<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(context: Readonly<DexieCrudOperationContext<M, DB>>) {
  return async (params: Readonly<InsertParams<M>>): Promise<M["DBRead"]> => {
    if (!params.upsert) {
      return addAndGet({ context, data: params.data });
    }
    const onConflict = params.onConflict;
    const columnNames = onConflict?.columnNames;
    if (!columnNames?.length) {
      return putAndGet({ context, data: params.data, action: "upsert put" });
    }
    assertDexieColumnsAreIndexed(
      String(context.modelName),
      context.table,
      columnNames,
    );
    const upsertOptions = {
      context,
      data: params.data,
      columnNames,
      ignoreDuplicates: onConflict?.ignoreDuplicates ?? false,
    };
    return (
        isPrimaryKeyConflictColumns(columnNames, context.table.schema.primKey)
      ) ?
        upsertRowByPrimaryKey(upsertOptions)
      : upsertRowByIndexedConflict(upsertOptions);
  };
}

function _createBulkInsertOperation<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(context: Readonly<DexieCrudOperationContext<M, DB>>) {
  return async (
    params: Readonly<BulkInsertParams<M>>,
  ): Promise<Array<M["DBRead"]>> => {
    if (!params.upsert) {
      return bulkAddAndGet({ context, data: params.data });
    }
    const onConflict = params.onConflict;
    const columnNames = onConflict?.columnNames;
    if (!columnNames?.length) {
      return bulkPutAndGet({ context, data: params.data });
    }
    assertDexieColumnsAreIndexed(
      String(context.modelName),
      context.table,
      columnNames,
    );
    const upsertOptions = {
      context,
      data: params.data,
      columnNames,
      ignoreDuplicates: onConflict?.ignoreDuplicates ?? false,
    };
    return (
        isPrimaryKeyConflictColumns(columnNames, context.table.schema.primKey)
      ) ?
        upsertRowsByPrimaryKey(upsertOptions)
      : upsertRowsByIndexedConflict(upsertOptions);
  };
}

function _createUpdateOperation<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(context: Readonly<DexieCrudOperationContext<M, DB>>) {
  return async (
    params: Readonly<{
      id: M["modelPrimaryKeyType"];
      data: M["DBUpdate"];
      logger: ILogger;
    }>,
  ): Promise<M["DBRead"]> => {
    const key = params.id as DexieKey<M>;
    await context.table.update(key, params.data as UpdateSpec<M["DBRead"]>);
    return getRequiredRow({
      context,
      key,
      message: `Could not retrieve updated record with id ${params.id}`,
    });
  };
}

function _createDeleteOperation<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(context: Readonly<DexieCrudOperationContext<M, DB>>) {
  return async (
    params: Readonly<{ id: M["modelPrimaryKeyType"]; logger: ILogger }>,
  ): Promise<void> => {
    return context.table.delete(params.id as DexieKey<M>);
  };
}

function _createBulkDeleteOperation<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(context: Readonly<DexieCrudOperationContext<M, DB>>) {
  return async (
    params: Readonly<{
      ids: ReadonlyArray<M["modelPrimaryKeyType"]>;
      logger: ILogger;
    }>,
  ): Promise<void> => {
    return context.table.bulkDelete(params.ids as Array<DexieKey<M>>);
  };
}

/** Builds the mutation half of a model's Dexie-backed CRUD operations. */
export function createDexieCrudMutationOperations<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(
  context: Readonly<DexieCrudOperationContext<M, DB>>,
): {
  insert: ReturnType<typeof _createInsertOperation<M, DB>>;
  bulkInsert: ReturnType<typeof _createBulkInsertOperation<M, DB>>;
  update: ReturnType<typeof _createUpdateOperation<M, DB>>;
  delete: ReturnType<typeof _createDeleteOperation<M, DB>>;
  bulkDelete: ReturnType<typeof _createBulkDeleteOperation<M, DB>>;
} {
  return {
    insert: _createInsertOperation(context),
    bulkInsert: _createBulkInsertOperation(context),
    update: _createUpdateOperation(context),
    delete: _createDeleteOperation(context),
    bulkDelete: _createBulkDeleteOperation(context),
  };
}
