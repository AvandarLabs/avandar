import { SupabaseDBClient } from "@/lib/clients/SupabaseDBClient";
import { ModelCRUDParserRegistry } from "@/lib/utils/models/ModelCRUDParserRegistry";
import { SupabaseModelCRUDTypes } from "@/lib/utils/models/SupabaseModelCRUDTypes";
import { ILogger } from "../Logger";
import { castToAny } from "../utils/functions";
import { ModelCRUDClient } from "./CRUDModelClient";
import { ModelCRUDClientOptions } from "./ICRUDModelClient";
import type { DatabaseTableNames } from "@/lib/clients/SupabaseDBClient";

export class SupabaseCRUDClient<
  TableName extends DatabaseTableNames,
  M extends SupabaseModelCRUDTypes<TableName>,
  ModelIdFieldType extends
    M["Read"][M["modelPrimaryKey"]] = M["Read"][M["modelPrimaryKey"]],
> extends ModelCRUDClient<M> {
  tableName: TableName;
  dbTablePrimaryKey: M["dbTablePrimaryKey"];

  constructor(config: {
    tableName: TableName;
    modelName: M["modelName"];
    dbTablePrimaryKey: M["dbTablePrimaryKey"];
    parserRegistry: ModelCRUDParserRegistry<M>;
  }) {
    super({
      modelName: config.modelName,
      parserRegistry: config.parserRegistry,
    });
    this.tableName = config.tableName;
    this.dbTablePrimaryKey = config.dbTablePrimaryKey;
  }

  async getById(
    id: ModelIdFieldType,
    _options?: ModelCRUDClientOptions,
  ): Promise<M["Read"] | undefined> {
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

  async getAll(options?: ModelCRUDClientOptions): Promise<Array<M["Read"]>> {
    this.logger.warn("TODO(pablo): Pagination must be implemented.");

    const result = await this.logger.withConditionalLogging(
      options?.enableLogger,
      async (logger: ILogger) => {
        const { data } = await SupabaseDBClient.from(this.tableName)
          .select("*")
          .throwOnError();

        logger.log(`All ${this.modelName}s from db`, data);

        const models = data.map((dbRow) => {
          const model = this.parsers.fromDBToModelRead.parse(dbRow);
          return model;
        });

        return models;
      },
    );

    return result;
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
