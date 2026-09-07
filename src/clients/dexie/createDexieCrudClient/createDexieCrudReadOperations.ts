import { isEmptyFiltersObject } from "@avandar/utils";
import { getFilteredDexieCollection } from "@/clients/dexie/createDexieCrudClient/dexieCrudRowAccess";
import type {
  DexieCrudOperationContext,
  DexieKey,
  GetPageParams,
} from "@/clients/dexie/createDexieCrudClient/createDexieCrudClient.types";
import type { DexieCrudModelSpec } from "@/clients/dexie/DexieCrudClient/DexieCrudClient.types";
import type { DexieDBType } from "@/clients/dexie/DexieDBVersionManager";
import type { ILogger } from "@avandar/logger";
import type { FiltersByColumn } from "@avandar/utils";

function _createGetByIdOperation<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(context: Readonly<DexieCrudOperationContext<M, DB>>) {
  return async (
    params: Readonly<{
      id: M["modelPrimaryKeyType"] | null | undefined;
      logger: ILogger;
    }>,
  ): Promise<M["DBRead"] | undefined> => {
    if (params.id === undefined || params.id === null) {
      return undefined;
    }
    return (await context.table.get(params.id as DexieKey<M>)) ?? undefined;
  };
}

function _createGetCountOperation<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(context: Readonly<DexieCrudOperationContext<M, DB>>) {
  return async (
    params: Readonly<{
      where?: FiltersByColumn<M["DBRead"]>;
      logger: ILogger;
    }>,
  ): Promise<number> => {
    return !params.where || isEmptyFiltersObject(params.where)
      ? context.table.count()
      : getFilteredDexieCollection({ context, where: params.where }).count();
  };
}

function _createGetPageOperation<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(context: Readonly<DexieCrudOperationContext<M, DB>>) {
  return async (
    params: Readonly<GetPageParams<M>>,
  ): Promise<Array<M["DBRead"]>> => {
    const startIndex = params.pageNum * params.pageSize;
    const collection =
      !params.where || isEmptyFiltersObject(params.where)
        ? context.table.toCollection()
        : getFilteredDexieCollection({ context, where: params.where });
    return collection.offset(startIndex).limit(params.pageSize).toArray();
  };
}

/** Builds the read half of a model's Dexie-backed CRUD operations. */
export function createDexieCrudReadOperations<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(
  context: Readonly<DexieCrudOperationContext<M, DB>>,
): {
  getById: ReturnType<typeof _createGetByIdOperation<M, DB>>;
  getCount: ReturnType<typeof _createGetCountOperation<M, DB>>;
  getPage: ReturnType<typeof _createGetPageOperation<M, DB>>;
} {
  return {
    getById: _createGetByIdOperation(context),
    getCount: _createGetCountOperation(context),
    getPage: _createGetPageOperation(context),
  };
}
