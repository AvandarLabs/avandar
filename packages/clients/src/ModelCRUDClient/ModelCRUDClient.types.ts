import type { ModelCRUDParserRegistry } from "../makeParserRegistry.ts";
import type { ServiceClient } from "../ServiceClient/ServiceClient.types.ts";
import type { ILogger } from "@avandar/logger";
import type {
  AnyFunctionWithSignature,
  EmptyObject,
  FiltersByColumn,
  UnknownObject,
} from "@avandar/utils";

/**
 * A client with only functions that have a single parameter and
 * that return a Promise.
 */
export type ClientReturningOnlyPromises = Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AnyFunctionWithSignature<[any], Promise<any>>
>;

export type ModelCRUDPage<ModelRead> = {
  /** The rows in the page */
  rows: ModelRead[];

  /**
   * The total number of rows in the data store (for the query that
   * generated this page)
   */
  totalRows: number;

  /**
   * The total number of pages in the data store (for the query that
   * generated this page)
   */
  totalPages: number;

  /** The next page number, or undefined if there is no next page */
  nextPage: number | undefined;

  /** The previous page number, or undefined if there is no previous page */
  prevPage: number | undefined;
};

export type UpsertOptions = {
  /** Whether to upsert the model if it already exists */
  upsert?: boolean;

  /**
   * The options to use for conflict resolution in an upsert.
   * This is only used if `upsert` is true.
   */
  onConflict?: {
    /**
     * The column names to check that determine if a row is a duplicate.
     * In Supabase and Postgres, these columns are required to have
     * UNIQUE constraints.
     */
    columnNames: string[];

    /**
     * What to do if a conflict is found on `conflictNames`. If
     * true, the duplicate row is ignored. If false, duplicate rows
     * are merged with existing rows (an Update operation).
     */
    ignoreDuplicates: boolean;
  };
};

export type CRUDClientModelSpec = {
  /** The name of the model */
  modelName: string;

  /**
   * The type of the primary key field in a frontend model.
   * This refers to the actual _type_ of the primary key
   * (e.g. a UUID), not the key name.
   */
  modelPrimaryKeyType: string | number;

  /** The type returned when doing a DB `get` (Read) operation */
  DBRead: UnknownObject;

  /** The type expected when doing a DB `insert` (Create) operation */
  DBInsert: UnknownObject;

  /** The type expected when doing a DB `update` operation */
  DBUpdate: UnknownObject;

  /**
   * The frontend model type returned from a DB `get` (Read)
   * operation
   */
  Read: UnknownObject;

  /**
   * The frontend model type expected when inserting (creating) a
   * new model
   */
  Insert: UnknownObject;

  /**
   * The frontend model type expected when updating an existing
   * model
   */
  Update: UnknownObject;
};

export type ModelCRUDFunctions<M extends CRUDClientModelSpec> = {
  // `Get` queries
  getById: (params: {
    id: M["modelPrimaryKeyType"] | null | undefined;
    logger: ILogger;
  }) => Promise<M["DBRead"] | undefined>;
  getCount: (params: {
    where?: FiltersByColumn<M["DBRead"]>;
    logger: ILogger;
  }) => Promise<number | null>;
  getPage: (params: {
    where?: FiltersByColumn<M["DBRead"]>;
    pageSize: number;
    pageNum: number;
    logger: ILogger;
  }) => Promise<Array<M["DBRead"]>>;

  // Mutations
  insert: (params: {
    data: M["DBInsert"];
    upsert?: boolean;
    onConflict?: {
      columnNames: string[];
      ignoreDuplicates: boolean;
    };
    logger: ILogger;
  }) => Promise<M["DBRead"]>;
  bulkInsert: (
    params: UpsertOptions & {
      data: ReadonlyArray<M["DBInsert"]>;
      logger: ILogger;
    },
  ) => Promise<Array<M["DBRead"]>>;
  update: (params: {
    id: M["modelPrimaryKeyType"];
    data: M["DBUpdate"];
    logger: ILogger;
  }) => Promise<M["DBRead"]>;
  delete: (params: {
    id: M["modelPrimaryKeyType"];
    logger: ILogger;
  }) => Promise<void>;
  bulkDelete: (params: {
    ids: ReadonlyArray<M["modelPrimaryKeyType"]>;
    logger: ILogger;
  }) => Promise<void>;
};

/**
 * A base generic client for a model with CRUD operations.
 * This interface does not make any assumptions of what the backing data store
 * of the model is.
 *
 * All of these functions will have auto-generated `useQuery` and `useMutation`
 * hooks.
 */
export type BaseModelCRUDClient<M extends CRUDClientModelSpec> = {
  /** The parsers for the model */
  parsers: ModelCRUDParserRegistry<M>;

  /**
   * The CRUD functions for the model, in case we need to work directly
   * with the CRUD-level functions and types.
   */
  crudFunctions: ModelCRUDFunctions<M>;

  /**
   * Retrieves a single model instance by its ID.
   * @param params - The parameters for the operation
   * @param params.id - The unique identifier of the model to retrieve.
   * If the `id` is nullish, the function will return undefined.
   * This is helpful to support `useQuery` hooks that may not have an id
   * yet on the first render.
   * @returns A promise resolving to the model instance or undefined
   * if not found
   */
  getById(params: {
    id: M["modelPrimaryKeyType"] | null | undefined;
  }): Promise<M["Read"] | undefined>;

  /**
   * Retrieves the total number of instances of a model.
   *
   * A `null` result on a successful query means there was no error
   * but the count could not be computed for some reason.
   *
   * @param params Optional params for the query
   * @param params.where Filters to apply.
   * @returns A promise resolving to the total number of instances
   */
  getCount(params: {
    where?: FiltersByColumn<M["DBRead"]>;
  }): Promise<number | null>;

  /**
   * Retrieves one page of instances of a model.
   *
   * @param params Optional params for the query
   * @param params.where Filters to apply. Get all instances that pass the
   * filters.
   * @param params.pageSize The number of instances to return per page.
   * @param params.pageNum The page number to return.
   *
   * @returns A promise resolving to a page of model instances
   */
  getPage(params: {
    where?: FiltersByColumn<M["DBRead"]>;
    pageSize: number;
    pageNum: number;
  }): Promise<ModelCRUDPage<M["Read"]>>;

  /**
   * Retrieves all instances of a model.
   *
   * @param params Optional params for the query
   * @param params.where Filters to apply. Get all instances that pass the
   * filters.
   *
   * @returns A promise resolving to an array of model instances
   */
  getAll(params?: {
    where?: FiltersByColumn<M["DBRead"]>;
  }): Promise<Array<M["Read"]>>;

  /**
   * Retrieves a single instance of a model.
   *
   * @param params Optional params for the query
   * @param params.where Filters to apply. If multiple instances pass the
   * filter, the first instance is returned.
   *
   * TODO(jpsyx): add a `throwIfNotFound` option to throw an error if no
   * instance is found. Allow passing an error message for that case.
   *
   * @returns A promise resolving to the model instance or undefined
   * if not found. If multiple instances pass the `where` filter, only
   * the first instance is returned.
   */
  getOne(params: {
    where?: FiltersByColumn<M["DBRead"]>;
  }): Promise<M["Read"] | undefined>;

  /**
   * Creates a new model instance in the data store.
   * @param params - The parameters for the operation
   * @param params.data - The data to insert for the new model instance
   * @param params.upsert - Whether to upsert the model if it already exists
   * @param params.onConflict - The options to use for conflict resolution
   * in an upsert. This is only used if `upsert` is true.
   * @param params.onConflict.columnNames - The column names to check that
   * determine if a row is a duplicate. In Supabase and Postgres, these
   * columns are required to have UNIQUE constraints.
   * @param params.onConflict.ignoreDuplicates - What to do if a conflict is
   * found on `conflictNames`. If true, the duplicate row is ignored. If
   * false, duplicate rows are merged with existing rows (an Update operation).
   *
   * @returns A promise resolving to the created model instance
   */
  insert(params: {
    data: M["Insert"];
    upsert?: boolean;
    onConflict?: {
      columnNames: string[];
      ignoreDuplicates: boolean;
    };
  }): Promise<M["Read"]>;

  /**
   * Inserts multiple new model instances in the data store.
   * @param params - The parameters for the operation
   * @param params.data - An array of data objects to insert.
   * @param params.upsert - Whether to upsert the model if it already exists
   * @param params.onConflict - The options to use for conflict resolution
   * in an upsert. This is only used if `upsert` is true.
   * @param params.onConflict.columnNames - The column names to check that
   * determine if a row is a duplicate. In Supabase and Postgres, these
   * columns are required to have UNIQUE constraints.
   * @param params.onConflict.ignoreDuplicates - What to do if a conflict is
   * found on `conflictNames`. If true, the duplicate row is ignored. If
   * false, duplicate rows are merged with existing rows (an Update operation).
   * @returns A promise resolving to an array of the created model instances
   */
  bulkInsert(
    params: UpsertOptions & {
      data: ReadonlyArray<M["Insert"]>;
    },
  ): Promise<Array<M["Read"]>>;

  /**
   * Updates an existing model instance with the provided data.
   * @param id - The unique identifier of the model to update
   * @param data - The data to update on the model instance
   * @returns A promise resolving to the updated model instance
   */
  update(params: {
    id: M["modelPrimaryKeyType"];
    data: M["Update"];
  }): Promise<M["Read"]>;

  /**
   * Deletes a model instance from the data store.
   * @param id - The unique identifier of the model to delete
   * @returns A promise that resolves when deletion is complete
   */
  delete(params: { id: M["modelPrimaryKeyType"] }): Promise<void>;

  /**
   * Deletes multiple model instances from the data store.
   * @param params
   * @param params.ids - An array of IDs of the models to delete
   * @returns A void promise.
   */
  bulkDelete(params: {
    ids: ReadonlyArray<M["modelPrimaryKeyType"]>;
  }): Promise<void>;
} & ServiceClient<`${M["modelName"]}Client`>;

export type ModelCRUDClient<
  M extends CRUDClientModelSpec,
  ExtendedQueriesClient extends ClientReturningOnlyPromises = EmptyObject,
  ExtendedMutationsClient extends ClientReturningOnlyPromises = EmptyObject,
> = BaseModelCRUDClient<M> & ExtendedQueriesClient & ExtendedMutationsClient;
