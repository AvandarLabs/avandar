import { ConditionalKeys, Merge } from "type-fest";
import { UnknownObject } from "@/lib/types/common";
import { Unbrand } from "@/lib/types/utilityTypes";
import {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/types/database.types";
import { ModelCRUDTypes } from "./ModelCRUDTypes";

type DefaultModelTypes = {
  tableName: keyof Database["public"]["Tables"];
  modelName: string;
  modelPrimaryKeyType: string | number;
  modelTypes: {
    Read: UnknownObject;
    Insert: UnknownObject;
    Update: UnknownObject;
  };
};

type DefaultDBPrimaryKey<CoreTypes extends DefaultModelTypes> = {
  dbTablePrimaryKey: Extract<
    ConditionalKeys<
      Tables<CoreTypes["tableName"]>,
      Unbrand<CoreTypes["modelPrimaryKeyType"]>
    >,
    string
  >;
};

/**
 * A wrapper type to create the Supabase CRUD types for a model.
 */
export type SupabaseModelCRUDTypes<
  ModelTypes extends DefaultModelTypes = DefaultModelTypes,
  DBPrimaryKey extends
    DefaultDBPrimaryKey<ModelTypes> = DefaultDBPrimaryKey<ModelTypes>,
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

    DBRead: Tables<ModelTypes["tableName"]>;
    Read: ModelTypes["modelTypes"]["Read"];

    DBInsert: TablesInsert<ModelTypes["tableName"]>;
    Insert: ModelTypes["modelTypes"]["Insert"];

    DBUpdate: TablesUpdate<ModelTypes["tableName"]>;
    Update: ModelTypes["modelTypes"]["Update"];
  } & ExtraTypes
>;
