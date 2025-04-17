import { ICRUDModelClient } from "@/lib/clients/ICRUDModelClient";
import { SupabaseDBClient } from "@/lib/clients/SupabaseDBClient";
import { ModelCRUDParserRegistry } from "@/lib/utils/models/crudSchemaParserFactory";
import { SupabaseModelCRUDTypes } from "@/lib/utils/models/SupabaseModelCRUDTypes";
import { Logger } from "../Logger";
import { castToAny } from "../utils/functions";
import type { DatabaseTableNames } from "@/lib/clients/SupabaseDBClient";

export class SupabaseCRUDClient<
  TableName extends DatabaseTableNames,
  M extends SupabaseModelCRUDTypes<TableName>,
  ModelIdFieldType extends
    M["Read"][M["modelPrimaryKey"]] = M["Read"][M["modelPrimaryKey"]],
> implements ICRUDModelClient<M, ModelIdFieldType>
{
  #tableName: TableName;
  #dbTablePrimaryKey: M["dbTablePrimaryKey"];
  parsers: ModelCRUDParserRegistry<M>;

  constructor(config: {
    tableName: TableName;
    dbTablePrimaryKey: M["dbTablePrimaryKey"];
    parserRegistry: ModelCRUDParserRegistry<M>;
  }) {
    this.#tableName = config.tableName;
    this.#dbTablePrimaryKey = config.dbTablePrimaryKey;
    this.parsers = config.parserRegistry;
  }

  async get(id: ModelIdFieldType): Promise<M["Read"] | undefined> {
    const { data } = await SupabaseDBClient.from(this.#tableName)
      .select("*")
      .eq(this.#dbTablePrimaryKey, castToAny(id))
      .maybeSingle<M["DBRead"]>()
      .throwOnError();

    if (!data) {
      return undefined;
    }

    const model = this.parsers.fromDBToModelRead.parse(data);
    return model;
  }

  async getAll(): Promise<Array<M["Read"]>> {
    Logger.warn("TODO(pablo): Pagination must be implemented.");

    const { data } = await SupabaseDBClient.from(this.#tableName)
      .select("*")
      .throwOnError();
    const models = data.map((dbRow) => {
      const model = this.parsers.fromDBToModelRead.parse(dbRow);
      return model;
    });
    return models;
  }

  async insert(data: M["Insert"]): Promise<M["Read"]> {
    const dataToInsert = this.parsers.fromModelToDBInsert.parse(data);
    const { data: insertedData } = await SupabaseDBClient.from(this.#tableName)
      .insert(castToAny(dataToInsert))
      .select()
      .single<M["DBRead"]>()
      .throwOnError();

    const insertedModel = this.parsers.fromDBToModelRead.parse(insertedData);
    return insertedModel;
  }

  async update(id: ModelIdFieldType, data: M["Update"]): Promise<M["Read"]> {
    const dataToUpdate = this.parsers.fromModelToDBUpdate.parse(data);
    const { data: updatedData } = await SupabaseDBClient.from(this.#tableName)
      .update(castToAny(dataToUpdate))
      .eq(this.#dbTablePrimaryKey, castToAny(id))
      .select()
      .single<M["DBRead"]>()
      .throwOnError();
    return this.parsers.fromDBToModelRead.parse(updatedData);
  }

  async delete(id: ModelIdFieldType): Promise<void> {
    await SupabaseDBClient.from(this.#tableName)
      .delete()
      .eq(this.#dbTablePrimaryKey, castToAny(id))
      .throwOnError();
  }
}
