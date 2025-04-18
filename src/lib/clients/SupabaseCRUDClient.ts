import { ICRUDModelClient } from "@/lib/clients/ICRUDModelClient";
import { SupabaseDBClient } from "@/lib/clients/SupabaseDBClient";
import { ModelCRUDParserRegistry } from "@/lib/utils/models/ModelCRUDParserRegistry";
import { SupabaseModelCRUDTypes } from "@/lib/utils/models/SupabaseModelCRUDTypes";
import { ILogger, Logger } from "../Logger";
import { castToAny } from "../utils/functions";
import type { DatabaseTableNames } from "@/lib/clients/SupabaseDBClient";

export class SupabaseCRUDClient<
  TableName extends DatabaseTableNames,
  M extends SupabaseModelCRUDTypes<TableName>,
  ModelIdFieldType extends
    M["Read"][M["modelPrimaryKey"]] = M["Read"][M["modelPrimaryKey"]],
> implements ICRUDModelClient<M>
{
  tableName: TableName;
  modelName: M["modelName"];
  dbTablePrimaryKey: M["dbTablePrimaryKey"];
  parsers: ModelCRUDParserRegistry<M>;
  logger: ILogger;

  constructor(config: {
    tableName: TableName;
    modelName: M["modelName"];
    dbTablePrimaryKey: M["dbTablePrimaryKey"];
    parserRegistry: ModelCRUDParserRegistry<M>;
  }) {
    this.tableName = config.tableName;
    this.modelName = config.modelName;
    this.dbTablePrimaryKey = config.dbTablePrimaryKey;
    this.parsers = config.parserRegistry;
    this.logger = Logger.withName(`${this.modelName}Client`);
  }

  async getById(id: ModelIdFieldType): Promise<M["Read"] | undefined> {
    const { data } = await SupabaseDBClient.from(this.tableName)
      .select("*")
      .eq(this.dbTablePrimaryKey, castToAny(id))
      .maybeSingle<M["DBRead"]>()
      .throwOnError();

    if (!data) {
      return undefined;
    }

    const model = this.parsers.fromDBToModelRead.parse(data);
    return model;
  }

  async getAll(): Promise<Array<M["Read"]>> {
    this.logger.warn("TODO(pablo): Pagination must be implemented.");

    const { data } = await SupabaseDBClient.from(this.tableName)
      .select("*")
      .throwOnError();

    this.logger.log("get all data", data);

    const models = data.map((dbRow) => {
      const model = this.parsers.fromDBToModelRead.parse(dbRow);
      return model;
    });
    return models;
  }

  async insert(data: M["Insert"]): Promise<M["Read"]> {
    const dataToInsert = this.parsers.fromModelToDBInsert.parse(data);
    const { data: insertedData } = await SupabaseDBClient.from(this.tableName)
      .insert(castToAny(dataToInsert))
      .select()
      .single<M["DBRead"]>()
      .throwOnError();

    const insertedModel = this.parsers.fromDBToModelRead.parse(insertedData);
    return insertedModel;
  }

  async update(id: ModelIdFieldType, data: M["Update"]): Promise<M["Read"]> {
    const dataToUpdate = this.parsers.fromModelToDBUpdate.parse(data);
    const { data: updatedData } = await SupabaseDBClient.from(this.tableName)
      .update(castToAny(dataToUpdate))
      .eq(this.dbTablePrimaryKey, castToAny(id))
      .select()
      .single<M["DBRead"]>()
      .throwOnError();
    return this.parsers.fromDBToModelRead.parse(updatedData);
  }

  async delete(id: ModelIdFieldType): Promise<void> {
    await SupabaseDBClient.from(this.tableName)
      .delete()
      .eq(this.dbTablePrimaryKey, castToAny(id))
      .throwOnError();
  }
}
