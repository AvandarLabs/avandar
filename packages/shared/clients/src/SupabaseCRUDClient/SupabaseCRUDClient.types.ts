import type {
  ClientReturningOnlyPromises,
  ModelCRUDClient,
} from "../ModelCRUDClient/ModelCRUDClient.types.ts";
import type {
  RegisteredSupabaseDatabase,
  RegisteredSupabaseDatabaseTableNames,
  RegisteredSupabaseTableInsert,
  RegisteredSupabaseTableRow,
  RegisteredSupabaseTableUpdate,
} from "../Register.types.ts";
import type { UnknownObject } from "@utils/types/common.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

type DefaultModelTypes = {
  tableName: RegisteredSupabaseDatabaseTableNames;
  modelName: string;
  modelPrimaryKeyType: string | number;
  modelTypes: {
    Read: UnknownObject;
    Insert: UnknownObject;
    Update: UnknownObject;
  };
};

type DefaultDBPrimaryKey<
  TableName extends RegisteredSupabaseDatabaseTableNames,
> = {
  dbTablePrimaryKey: keyof RegisteredSupabaseTableRow<TableName>;
};

/**
 * A wrapper type to create the Supabase CRUD types for a model.
 */
export type SupabaseCRUDClientModelSpec<
  ModelTypes extends DefaultModelTypes,
  DBPrimaryKey extends DefaultDBPrimaryKey<ModelTypes["tableName"]>,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  ExtraTypes extends object = {},
> = {
  /** The name of the model */
  modelName: ModelTypes["modelName"];

  /**
   * The type of the primary key field in a frontend model.
   * This refers to the actual _type_ of the primary key
   * (e.g. a UUID), not the key name.
   */
  modelPrimaryKeyType: ModelTypes["modelPrimaryKeyType"];

  /** The name of the table in Supabase */
  tableName: ModelTypes["tableName"];

  /**
   * The name of the primary key column in the Supabase
   * table. This refers to the actual string literal key
   * name.
   */
  dbTablePrimaryKey: DBPrimaryKey["dbTablePrimaryKey"];

  DBRead: RegisteredSupabaseTableRow<ModelTypes["tableName"]>;
  Read: ModelTypes["modelTypes"]["Read"];

  DBInsert: RegisteredSupabaseTableInsert<ModelTypes["tableName"]>;
  Insert: ModelTypes["modelTypes"]["Insert"];

  DBUpdate: RegisteredSupabaseTableUpdate<ModelTypes["tableName"]>;
  Update: ModelTypes["modelTypes"]["Update"];
} & ExtraTypes;

export type AnySupabaseCRUDClientModelSpec =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SupabaseCRUDClientModelSpec<any, any>;

export type SupabaseCRUDClient<
  M extends AnySupabaseCRUDClientModelSpec,
  ExtendedQueriesClient extends ClientReturningOnlyPromises,
  ExtendedMutationsClient extends ClientReturningOnlyPromises,
> = ModelCRUDClient<M, ExtendedQueriesClient, ExtendedMutationsClient> & {
  setDBClient: (
    dbClient: SupabaseClient<RegisteredSupabaseDatabase>,
  ) => SupabaseCRUDClient<M, ExtendedQueriesClient, ExtendedMutationsClient>;
};
