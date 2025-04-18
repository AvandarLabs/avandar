import { ILogger } from "../Logger";
import { ModelCRUDParserRegistry } from "../utils/models/ModelCRUDParserRegistry";
import { ModelCRUDTypes } from "../utils/models/ModelCRUDTypes";

export type ModelClientOptions = {
  enableLogger?: boolean;
};

/**
 * An interface representing a generic client for a CRUD model.
 * This interface should be implemented by any CRUD model clients to ensure
 * that the appropriate CRUD functions and types are used.
 *
 * @template M - The variants of the model
 * @template ModelIdFieldType - The type of the model's primary key field
 */
export interface ICRUDModelClient<
  M extends ModelCRUDTypes,
  ModelIdFieldType extends
    M["Read"][M["modelPrimaryKey"]] = M["Read"][M["modelPrimaryKey"]],
> {
  modelName: M["modelName"];
  logger: ILogger;

  /**
   * Validates the passed frontend model data is valid for insertion
   * into the model.
   * @param data - The data to validate
   * @returns A promise that resolves when the data is valid
   */
  validateDataForInsert(data: M["Insert"]): boolean;

  /**
   * A registry of parsers for converting between model variants and
   * database variants.
   */
  parsers: ModelCRUDParserRegistry<M>;

  /**
   * Retrieves a single model instance by its ID.
   * @param id - The unique identifier of the model to retrieve
   * @returns A promise resolving to the model instance or undefined
   * if not found
   */
  getById(
    id: ModelIdFieldType,
    options?: ModelClientOptions,
  ): Promise<M["Read"] | undefined>;

  /**
   * Retrieves all instances of the model.
   * @returns A promise resolving to an array of model instances
   */
  getAll(options?: ModelClientOptions): Promise<Array<M["Read"]>>;

  /**
   * Creates a new model instance in the data store.
   * @param data - The data to insert for the new model instance
   * @returns A promise resolving to the created model instance
   */
  insert(data: M["Insert"]): Promise<M["Read"]>;

  /**
   * Updates an existing model instance with the provided data.
   * @param id - The unique identifier of the model to update
   * @param data - The data to update on the model instance
   * @returns A promise resolving to the updated model instance
   */
  update(
    id: ModelIdFieldType,
    data: M["Update"],
    options?: ModelClientOptions,
  ): Promise<M["Read"]>;

  /**
   * Deletes a model instance from the data store.
   * @param id - The unique identifier of the model to delete
   * @returns A promise that resolves when deletion is complete
   */
  delete(id: ModelIdFieldType, options?: ModelClientOptions): Promise<void>;
}
