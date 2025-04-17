import { CRUDModelVariants } from "@/lib/utils/models/CRUDModelVariants";
import {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/types/database.types";

export interface SupabaseCRUDModelVariants<
  TableName extends keyof Database["public"]["Tables"],
> extends CRUDModelVariants {
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
