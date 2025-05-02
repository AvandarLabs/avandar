import { ConditionalKeys, Merge } from "type-fest";
import { DatabaseTableNames } from "@/lib/clients/SupabaseDBClient";
import { UnknownObject } from "@/lib/types/common";
import { Unbrand } from "@/lib/types/utilityTypes";
import {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/types/database.types";
import { ModelCRUDTypes } from "./ModelCRUDTypes";

/**
 * A wrapper type to create the Supabase CRUD types for a model.
 */
export type SupabaseModelCRUDTypes<
  CoreTypes extends {
    tableName: keyof Database["public"]["Tables"];
    modelName: string;
    modelPrimaryKeyType: string | number;
  } = {
    tableName: DatabaseTableNames;
    modelName: string;
    modelPrimaryKeyType: string | number;
  },
  ModelTypes extends {
    Read: UnknownObject;
    Insert: UnknownObject;
    Update: UnknownObject;
  } = {
    Read: UnknownObject;
    Insert: UnknownObject;
    Update: UnknownObject;
  },
  PrimaryKeys extends {
    dbTablePrimaryKey: Extract<
      ConditionalKeys<
        Tables<CoreTypes["tableName"]>,
        Unbrand<CoreTypes["modelPrimaryKeyType"]>
      >,
      string
    >;
  } = {
    dbTablePrimaryKey: Extract<
      ConditionalKeys<
        Tables<CoreTypes["tableName"]>,
        Unbrand<CoreTypes["modelPrimaryKeyType"]>
      >,
      string
    >;
  },
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  ExtraTypes extends object = {},
> = Merge<
  ModelCRUDTypes,
  {
    /** The name of the table in Supabase */
    tableName: CoreTypes["tableName"];

    /** The name of the model */
    modelName: CoreTypes["modelName"];

    /**
     * The type of the primary key field in a frontend model.
     * This refers to the actual _type_ of the primary key (e.g. a UUID),
     * not the key name.
     */
    modelPrimaryKeyType: CoreTypes["modelPrimaryKeyType"];

    /**
     * The name of the primary key column in the Supabase table.
     * This refers to the actual string literal key name.
     */
    dbTablePrimaryKey: PrimaryKeys["dbTablePrimaryKey"];

    DBRead: Tables<CoreTypes["tableName"]>;
    DBInsert: TablesInsert<CoreTypes["tableName"]>;
    DBUpdate: TablesUpdate<CoreTypes["tableName"]>;
    Read: ModelTypes["Read"];
    Insert: ModelTypes["Insert"];
    Update: ModelTypes["Update"];
  } & ExtraTypes
>;
