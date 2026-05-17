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
export type { SupabaseCrudModelSpec } from "@clients/SupabaseCrudClient/SupabaseCrudClient.types.ts";

// Parser registry
export { makeParserRegistry } from "@clients/makeParserRegistry.ts";
export type { ModelCrudParserRegistry } from "@clients/makeParserRegistry.ts";

// Mixins
export { withSupabaseClient } from "@clients/mixins/withSupabaseClient.ts";
export type { WithSupabaseClient } from "@clients/mixins/withSupabaseClient.ts";

// Server-side API client (Postgres RPCs + Edge Functions)
export { createServerApiClient } from "@clients/ServerApiClient/createServerApiClient.ts";
export type {
  ServerApiClient,
  ServerApiFunctionRequest,
} from "@clients/ServerApiClient/ServerApiClient.types.ts";
