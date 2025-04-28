import { ModelCRUDTypes } from "../utils/models/ModelCRUDTypes";
import { BaseClient } from "./BaseClient";
import { HookableFnName } from "./withQueryHooks";

/**
 * A base generic client for a model with CRUD operations.
 * This interface does not make any assumptions of what the backing data store
 * of the model is.
 */
export type ModelCRUDClient<M extends ModelCRUDTypes> = {
  /**
   * Retrieves a single model instance by its ID.
   * @param params - The parameters for the operation
   * @param params.id - The unique identifier of the model to retrieve.
   * If the `id` is undefined, the function will return undefined.
   * This is helpful to support `useQuery` hooks that may not have an id
   * yet on the first render.
   * @returns A promise resolving to the model instance or undefined
   * if not found
   */
  getById(params: {
    id: M["modelPrimaryKeyType"] | undefined;
  }): Promise<M["Read"] | undefined>;

  /**
   * Retrieves all instances of the model.
   * @returns A promise resolving to an array of model instances
   */
  getAll(): Promise<Array<M["Read"]>>;

  /**
   * Creates a new model instance in the data store.
   * @param data - The data to insert for the new model instance
   * @returns A promise resolving to the created model instance
   */
  insert(params: { data: M["Insert"] }): Promise<M["Read"]>;

  /**
   * Inserts multiple new model instances in the data store.
   * @param params - The parameters for the operation
   * @param params.data - An array of data objects to insert.
   * @returns A promise resolving to an array of the created model instances
   */
  bulkInsert(params: {
    data: ReadonlyArray<M["Insert"]>;
  }): Promise<Array<M["Read"]>>;

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
} & BaseClient;

/**
 * A default list of query functions to turn into `use` hooks in a CRUD client.
 * They will wrap `useQuery`.
 */
export const DEFAULT_QUERY_FN_NAMES = [
  "getById",
  "getAll",
] as const satisfies ReadonlyArray<
  HookableFnName<ModelCRUDClient<ModelCRUDTypes>>
>;
export type DefaultQueryFnName = (typeof DEFAULT_QUERY_FN_NAMES)[number];

/**
 * A default list of mutation functions to turn into `use` hooks in a CRUD
 * client. They will wrap `useMutation`.
 */
export const DEFAULT_MUTATION_FN_NAMES = [
  "insert",
  "bulkInsert",
  "update",
  "delete",
  "bulkDelete",
] as const satisfies ReadonlyArray<
  HookableFnName<ModelCRUDClient<ModelCRUDTypes>>
>;
export type DefaultMutationFnName = (typeof DEFAULT_MUTATION_FN_NAMES)[number];
