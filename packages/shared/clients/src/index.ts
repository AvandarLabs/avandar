// Overrideable register for Supabase database types
export type { Register } from "@clients/Register.types.ts";

// Base service client
export { createServiceClient } from "@clients/ServiceClient/createServiceClient.ts";
export type { ServiceClient } from "@clients/ServiceClient/ServiceClient.types.ts";

// Base CRUD client
export { createModelCrudClient } from "@clients/ModelCrudClient/createModelCrudClient.ts";
export type { CrudModelSpec } from "@clients/ModelCrudClient/ModelCrudClient.types.ts";
export type { ClientReturningOnlyPromises } from "@clients/ModelCrudClient/ModelCrudClient.types.ts";
export type { ModelCrudClient } from "@clients/ModelCrudClient/ModelCrudClient.types.ts";
export type { UpsertOptions } from "@clients/ModelCrudClient/ModelCrudClient.types.ts";

// Supabase client
export { createSupabaseCrudClient } from "@clients/SupabaseCrudClient/createSupabaseCrudClient.ts";
export type { AnySupabaseCrudModelSpec } from "@clients/SupabaseCrudClient/SupabaseCrudClient.types.ts";
export type { SupabaseCrudClient } from "@clients/SupabaseCrudClient/SupabaseCrudClient.types.ts";
export type { SupabaseCrudModelSpec } from "@clients/SupabaseCrudClient/SupabaseCrudClient.types.ts";

// SQLite client (desktop)
export { createSqliteCrudClient } from "@clients/SqliteCrudClient/createSqliteCrudClient.ts";

// Parser registry
export { makeParserRegistry } from "@clients/makeParserRegistry/makeParserRegistry.ts";
export type { ModelCrudParserRegistry } from "@clients/makeParserRegistry/makeParserRegistry.ts";

// Mixins
export { withSupabaseClient } from "@clients/mixins/withSupabaseClient.ts";
export type { WithSupabaseClient } from "@clients/mixins/withSupabaseClient.ts";


// Supabase database registration
export type {
  RegisteredSupabaseDatabase,
  RegisteredSupabaseDatabaseTableNames,
} from "@clients/Register.types.ts";

export type { SqliteTransport } from "@clients/SqliteCrudClient/SqliteTransport.types.ts";
