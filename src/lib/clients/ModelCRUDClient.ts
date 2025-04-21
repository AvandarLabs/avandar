import { createLogger, ILogger } from "../Logger";
import { UnknownObject } from "../types/common";
import { ModelCRUDTypes } from "../utils/models/ModelCRUDTypes";

/**
 * A base generic client for a model with CRUD operations.
 * This interface does not make any assumptions of what the backing data store
 * of the model is.
 */
export type ModelCRUDClient<
  M extends ModelCRUDTypes,
  ModelIdFieldType extends
    M["Read"][M["modelPrimaryKey"]] = M["Read"][M["modelPrimaryKey"]],
> = {
  getModelName(): string;

  /**
   * Retrieves a single model instance by its ID.
   * @param params - The parameters for the operation
   * @param params.id - The unique identifier of the model to retrieve
   * @returns A promise resolving to the model instance or undefined
   * if not found
   */
  getById(params: { id: ModelIdFieldType }): Promise<M["Read"] | undefined>;

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
   * Updates an existing model instance with the provided data.
   * @param id - The unique identifier of the model to update
   * @param data - The data to update on the model instance
   * @returns A promise resolving to the updated model instance
   */
  update(params: {
    id: ModelIdFieldType;
    data: M["Update"];
  }): Promise<M["Read"]>;

  /**
   * Deletes a model instance from the data store.
   * @param id - The unique identifier of the model to delete
   * @returns A promise that resolves when deletion is complete
   */
  delete(params: { id: ModelIdFieldType }): Promise<void>;
};

export type WithLogger<Module extends UnknownObject> = Module & {
  /**
   * @returns A new instance of the module with the logger enabled.
   */
  withLogger: () => Module;
};

/**
 * Adds a logger that is accessible to all module functions. The logger is
 * disabled by default and becomes enabled when the user calls `.withLogger()`
 * on the module.
 *
 * For example, `MyModule.withLogger().myFunction()` will call `myFunction` with
 * the logger enabled, so any logs will now be printed.
 *
 * @param modelName The name of the model the module is for.
 * @param moduleBuilder A function that builds the module.
 * @returns The module with a `withLogger` method.
 */
export function withLogger<Module extends UnknownObject>(
  modelName: string,
  moduleBuilder: (baseLogger: ILogger) => Module,
): WithLogger<Module> {
  // initialize a logger that is disabled by default
  const logger = createLogger({
    loggerName: `${modelName}Client`,
  }).setEnabled(false);

  const baseModule = moduleBuilder(logger);
  const moduleWithEnabledLogger = moduleBuilder(logger.setEnabled(true));

  return {
    ...baseModule,

    /**
     * Enables the logger for this module.
     */
    withLogger: (): Module => {
      return moduleWithEnabledLogger;
    },
  };
}
