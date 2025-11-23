import { Merge } from "type-fest";
import { DatabaseTableNames } from "@/db/supabase/AvaSupabase";
import { UnknownObject } from "@/lib/types/common";
import { Database, Tables } from "@/types/database.types";
import { ModelCRUDTypes } from "./ModelCRUDTypes";

type DefaultModelTypes = {
  tableName: DatabaseTableNames;
  modelName: string;
  modelPrimaryKeyType: string | number;
  modelTypes: {
    Read: UnknownObject;
    Insert: UnknownObject;
    Update: UnknownObject;
  };
};

type DefaultDBPrimaryKey<TableName extends DatabaseTableNames> = {
  dbTablePrimaryKey: keyof Tables<TableName>;
};

/**
 * A wrapper type to create the Supabase CRUD types for a model.
 */
export type SupabaseModelCRUDTypes<
  ModelTypes extends DefaultModelTypes,
  DBPrimaryKey extends DefaultDBPrimaryKey<ModelTypes["tableName"]>,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  ExtraTypes extends object = {},
> = Merge<
  ModelCRUDTypes,
  {
    /** The name of the table in Supabase */
    tableName: ModelTypes["tableName"];

    /** The name of the model */
    modelName: ModelTypes["modelName"];

    /**
     * The type of the primary key field in a frontend model.
     * This refers to the actual _type_ of the primary key (e.g. a UUID),
     * not the key name.
     */
    modelPrimaryKeyType: ModelTypes["modelPrimaryKeyType"];

    /**
     * The name of the primary key column in the Supabase table.
     * This refers to the actual string literal key name.
     */
    dbTablePrimaryKey: DBPrimaryKey["dbTablePrimaryKey"];

    DBRead: Database["public"]["Tables"][ModelTypes["tableName"]]["Row"];
    Read: ModelTypes["modelTypes"]["Read"];

    DBInsert: Database["public"]["Tables"][ModelTypes["tableName"]]["Insert"];
    Insert: ModelTypes["modelTypes"]["Insert"];

    DBUpdate: Database["public"]["Tables"][ModelTypes["tableName"]]["Update"];
    Update: ModelTypes["modelTypes"]["Update"];
  } & ExtraTypes
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySupabaseModelCRUDTypes = SupabaseModelCRUDTypes<any, any>;
