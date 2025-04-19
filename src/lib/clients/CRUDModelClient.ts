import { createLogger, ILogger } from "../Logger";
import { ModelCRUDParserRegistry } from "../utils/models/ModelCRUDParserRegistry";
import { ModelCRUDTypes } from "../utils/models/ModelCRUDTypes";
import { IModelCRUDClient, ModelCRUDClientOptions } from "./ICRUDModelClient";

/**
 * This is the base implementation of an ICRUDModelClient. Any CRUD clients
 * should extend this class.
 */
export class ModelCRUDClient<
  M extends ModelCRUDTypes,
  ModelIdFieldType extends
    M["Read"][M["modelPrimaryKey"]] = M["Read"][M["modelPrimaryKey"]],
> implements IModelCRUDClient<M>
{
  modelName: M["modelName"];
  logger: ILogger;
  parsers: ModelCRUDParserRegistry<M>;

  constructor(config: {
    modelName: M["modelName"];
    parserRegistry: ModelCRUDParserRegistry<M>;
  }) {
    this.modelName = config.modelName;
    this.parsers = config.parserRegistry;
    this.logger = createLogger({
      loggerName: `${this.modelName}Client`,
    });
  }

  /**
   * Validates that the given model parses correctly into a valid insertable
   * DB row. This is a safe validation that does not throw an error. If
   * validation fails, it will still log the error.
   *
   * @param model The model data to validate.
   * @returns `true` if the data is valid, `false` otherwise.
   */
  validateDataForInsert(model: M["Insert"]): boolean {
    const parseResult = this.parsers.fromModelToDBInsert.safeParse(model);
    if (parseResult.error) {
      this.logger.error(parseResult.error);
    }
    return parseResult.success;
  }

  getById(
    _id: ModelIdFieldType,
    _options?: ModelCRUDClientOptions,
  ): Promise<M["Read"] | undefined> {
    throw new Error("`getById()` not implemented.");
  }

  getAll(_options?: ModelCRUDClientOptions): Promise<Array<M["Read"]>> {
    throw new Error("`getAll()` not implemented.");
  }

  insert(
    _data: M["Insert"],
    _options?: ModelCRUDClientOptions,
  ): Promise<M["Read"]> {
    throw new Error("`insert()` not implemented.");
  }

  update(
    _id: ModelIdFieldType,
    _data: M["Update"],
    _options?: ModelCRUDClientOptions,
  ): Promise<M["Read"]> {
    throw new Error("`update()` not implemented.");
  }

  delete(
    _id: ModelIdFieldType,
    _options?: ModelCRUDClientOptions,
  ): Promise<void> {
    throw new Error("`delete()` not implemented.");
  }
}
