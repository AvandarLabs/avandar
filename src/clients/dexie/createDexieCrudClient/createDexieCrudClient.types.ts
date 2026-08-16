import type { DexieCrudModelSpec } from "@/clients/dexie/DexieCrudClient/DexieCrudClient.types";
import type { DexieDBType } from "@/clients/dexie/DexieDBVersionManager";
import type { UpsertOptions } from "@avandar/clients";
import type { ILogger } from "@avandar/logger";
import type { FiltersByColumn } from "@avandar/utils";
import type { IDType, IndexableType } from "dexie";

/** The IndexedDB primary key value that addresses one row of a model. */
export type DexieKey<M extends DexieCrudModelSpec> = IDType<
  M["DBRead"],
  M["modelPrimaryKeyType"]
> &
  M["modelPrimaryKeyType"] &
  IndexableType;

/** The database, model name, and table that one CRUD operation runs against. */
export type DexieCrudOperationContext<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
> = {
  db: DB;
  modelName: M["modelName"];
  table: DB[M["modelName"]];
};

/** Parameters accepted by the generated single-row insert operation. */
export type InsertParams<M extends DexieCrudModelSpec> = UpsertOptions & {
  data: M["DBInsert"];
  logger: ILogger;
};

/** Parameters accepted by the generated multi-row insert operation. */
export type BulkInsertParams<M extends DexieCrudModelSpec> = UpsertOptions & {
  data: ReadonlyArray<M["DBInsert"]>;
  logger: ILogger;
};

/** Parameters accepted by the generated paginated read operation. */
export type GetPageParams<M extends DexieCrudModelSpec> = {
  where?: FiltersByColumn<M["DBRead"]>;
  pageSize: number;
  pageNum: number;
  logger: ILogger;
};
