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
export { withSupabaseClient } from "@clients/SupabaseCrudClient/withSupabaseClient.ts";
export type { SupabaseCrudModelSpec } from "@clients/SupabaseCrudClient/SupabaseCrudClient.types.ts";
export type { WithSupabaseClient } from "@clients/SupabaseCrudClient/withSupabaseClient.ts";

// Parser registry
export { makeParserRegistry } from "@clients/makeParserRegistry.ts";
export type { ModelCrudParserRegistry } from "@clients/makeParserRegistry.ts";

// Rdb (platform-aware) CRUD client
export {
  createRdbCrudClient,
  registerWebDbClient,
} from "@clients/RdbCrudClient/createRdbCrudClient.ts";
export type {
  RdbCrudModelSpec,
  RdbCrudClient,
} from "@clients/RdbCrudClient/RdbCrudClient.types.ts";

// Server-side API client (Postgres RPCs + Edge Functions)
export { createServerApiClient } from "@clients/ServerApiClient/createServerApiClient.ts";
export type {
  ServerApiClient,
  ServerApiFunctionRequest,
} from "@clients/ServerApiClient/ServerApiClient.types.ts";
