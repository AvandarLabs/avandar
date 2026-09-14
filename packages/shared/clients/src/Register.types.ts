/**
 * Consumer-facing registry interface. Augment this via declaration
 * merging to register your Supabase database type with
 * `@avandar/clients`.
 *
 * Augment the package name, not an internal file path: `@clients/*` is an
 * internal alias that does not exist for consumers. This works because the
 * published declarations are bundled into a single `dist/index.d.ts`, so
 * `Register` is genuinely *declared* in the `@avandar/clients` module rather
 * than re-exported from another one, and the augmentation merges with it.
 *
 * The augmenting file must itself be a module, i.e. contain at least one
 * top-level `import` or `export`.
 *
 * See the package README for a complete declaration-merging example.
 */

import type { UnknownObject } from "@avandar/utils";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Register {}

/**
 * Resolves the `Database` type registered by the consumer.
 * Falls back to `never` if no database has been registered.
 */
export type RegisteredSupabaseDatabase = Register extends {
  supabaseDatabase: infer DB extends UnknownObject;
}
  ? DB
  : // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any;

/**
 * Resolves the table names from the registered database.
 * Falls back to `string` if no database has been registered.
 */
export type RegisteredSupabaseDatabaseTableNames =
  RegisteredSupabaseDatabase extends {
    public: { Tables: infer T extends UnknownObject };
  }
    ? keyof T
    : string;

/**
 * Resolves a table's `Row` type from the registered database.
 */
export type RegisteredSupabaseTableRow<
  TableName extends RegisteredSupabaseDatabaseTableNames,
> = RegisteredSupabaseDatabase extends {
  public: {
    Tables: Record<TableName, { Row: infer R extends UnknownObject }>;
  };
}
  ? R
  : never;

/**
 * Resolves a table's `Insert` type from the registered
 * database.
 */
export type RegisteredSupabaseTableInsert<
  TableName extends RegisteredSupabaseDatabaseTableNames,
> = RegisteredSupabaseDatabase extends {
  public: {
    Tables: Record<TableName, { Insert: infer I extends UnknownObject }>;
  };
}
  ? I
  : never;

/**
 * Resolves a table's `Update` type from the registered
 * database.
 */
export type RegisteredSupabaseTableUpdate<
  TableName extends RegisteredSupabaseDatabaseTableNames,
> = RegisteredSupabaseDatabase extends {
  public: {
    Tables: Record<TableName, { Update: infer U extends UnknownObject }>;
  };
}
  ? U
  : never;
