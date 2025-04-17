import { Merge } from "type-fest";
import { ModelCRUDTypes } from "@/lib/utils/models/ModelCRUDTypes";
import {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/types/database.types";

export type SupabaseModelCRUDTypes<
  TableName extends keyof Database["public"]["Tables"],
> = Merge<
  ModelCRUDTypes,
  {
    /** The name of the table in Supabase */
    tableName: TableName;

    /** The name of the primary key column in the Supabase table */
    dbTablePrimaryKey: Extract<keyof Tables<TableName>, string>;

    /**
     * The name of the primary key field in a frontend model.
     * It must be the same type or subtype of the `dbTablePrimaryKey`
     */
    modelPrimaryKey: Extract<keyof Tables<TableName>, string>;

    DBRead: Tables<TableName>;
    DBInsert: TablesInsert<TableName>;
    DBUpdate: TablesUpdate<TableName>;
  }
>;
