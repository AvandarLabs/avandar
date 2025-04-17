import { CRUDModelClient } from "@/lib/clients/CRUDModelClient";
import { supabaseClient } from "@/lib/clients/supabaseClient";
import { ModelCRUDParserRegistry } from "@/lib/utils/models/crudSchemaParserFactory";
import { SupabaseCRUDModelVariants } from "@/lib/utils/models/SupabaseCRUDModelVariants";
import { castToAny } from "../utils/functions";
import type { DatabaseTableNames } from "@/lib/clients/supabaseClient";

export class SupabaseCRUDClient<
  TableName extends DatabaseTableNames,
  M extends SupabaseCRUDModelVariants<TableName>,
  ModelIdFieldType extends
    M["Read"][M["modelPrimaryKey"]] = M["Read"][M["modelPrimaryKey"]],
> implements CRUDModelClient<M, ModelIdFieldType>
{
  protected tableName: TableName;
  protected dbTablePrimaryKey: M["dbTablePrimaryKey"];
  protected parsers: ModelCRUDParserRegistry<M>;

  constructor(config: {
    tableName: TableName;
    dbTablePrimaryKey: M["dbTablePrimaryKey"];
    parserRegistry: ModelCRUDParserRegistry<M>;
  }) {
    this.tableName = config.tableName;
    this.dbTablePrimaryKey = config.dbTablePrimaryKey;
    this.parsers = config.parserRegistry;
  }

  async get(id: ModelIdFieldType): Promise<M["Read"] | undefined> {
    const { data } = await supabaseClient
      .from(this.tableName)
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

  // TODO(pablo): implement pagination
  async getAll(): Promise<Array<M["Read"]>> {
    const { data } = await supabaseClient
      .from(this.tableName)
      .select("*")
      .throwOnError();
    console.log("the data", data);
    const models = data.map((dbRow) => {
      console.log("processing this row", dbRow);
      const model = this.parsers.fromDBToModelRead.parse(dbRow);
      console.log("parsed model", model);
      return model;
    });
    console.log("the models", models);
    return models;
  }

  async insert(data: M["Insert"]): Promise<M["Read"]> {
    const dataToInsert = this.parsers.fromModelToDBInsert.parse(data);
    const { data: insertedData } = await supabaseClient
      .from(this.tableName)
      .insert(castToAny(dataToInsert))
      .select()
      .single<M["DBRead"]>()
      .throwOnError();

    const insertedModel = this.parsers.fromDBToModelRead.parse(insertedData);
    return insertedModel;
  }

  async update(id: ModelIdFieldType, data: M["Update"]): Promise<M["Read"]> {
    const dataToUpdate = this.parsers.fromModelToDBUpdate.parse(data);
    const { data: updatedData } = await supabaseClient
      .from(this.tableName)
      .update(castToAny(dataToUpdate))
      .eq(this.dbTablePrimaryKey, castToAny(id))
      .select()
      .single<M["DBRead"]>()
      .throwOnError();
    return this.parsers.fromDBToModelRead.parse(updatedData);
  }

  async delete(id: ModelIdFieldType): Promise<void> {
    await supabaseClient
      .from(this.tableName)
      .delete()
      .eq(this.dbTablePrimaryKey, castToAny(id))
      .throwOnError();
  }
}
