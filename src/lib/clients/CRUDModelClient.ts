import { createLogger, ILogger } from "../Logger";
import { ModelCRUDParserRegistry } from "../utils/models/ModelCRUDParserRegistry";
import { ModelCRUDTypes } from "../utils/models/ModelCRUDTypes";
import { ICRUDModelClient, ModelClientOptions } from "./ICRUDModelClient";

export class CRUDModelClient<
  M extends ModelCRUDTypes,
  ModelIdFieldType extends
    M["Read"][M["modelPrimaryKey"]] = M["Read"][M["modelPrimaryKey"]],
> implements ICRUDModelClient<M>
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
   * Validates the given model data for insertion. This is a safe validation
   * that does not throw an error. If validation fails, it will still log the
   * error.
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
    _options?: ModelClientOptions,
  ): Promise<M["Read"] | undefined> {
    throw new Error("`getById()` not implemented.");
  }

  getAll(_options?: ModelClientOptions): Promise<Array<M["Read"]>> {
    throw new Error("`getAll()` not implemented.");
  }

  insert(
    _data: M["Insert"],
    _options?: ModelClientOptions,
  ): Promise<M["Read"]> {
    throw new Error("`insert()` not implemented.");
  }

  update(
    _id: ModelIdFieldType,
    _data: M["Update"],
    _options?: ModelClientOptions,
  ): Promise<M["Read"]> {
    throw new Error("`update()` not implemented.");
  }

  delete(_id: ModelIdFieldType, _options?: ModelClientOptions): Promise<void> {
    throw new Error("`delete()` not implemented.");
  }
}
