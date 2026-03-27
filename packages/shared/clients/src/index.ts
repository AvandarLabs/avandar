// Overrideable register for Supabase database types
export type { Register } from "@clients/Register.types.ts";

// Base service client
export { createServiceClient } from "@clients/ServiceClient/createServiceClient.ts";
export type { ServiceClient } from "@clients/ServiceClient/ServiceClient.types.ts";

// Base CRUD client
export { createModelCRUDClient } from "@clients/ModelCRUDClient/createModelCRUDClient.ts";
export type { CRUDModelSpec } from "@clients/ModelCRUDClient/ModelCRUDClient.types.ts";
export type { ClientReturningOnlyPromises } from "@clients/ModelCRUDClient/ModelCRUDClient.types.ts";
export type { ModelCRUDClient } from "@clients/ModelCRUDClient/ModelCRUDClient.types.ts";
export type { UpsertOptions } from "@clients/ModelCRUDClient/ModelCRUDClient.types.ts";

// Supabase client
export { createSupabaseCRUDClient } from "@clients/SupabaseCRUDClient/createSupabaseCRUDClient.ts";
export { withSupabaseClient } from "@clients/SupabaseCRUDClient/withSupabaseClient.ts";
export type { SupabaseCRUDModelSpec } from "@clients/SupabaseCRUDClient/SupabaseCRUDClient.types.ts";
export type { WithSupabaseClient } from "@clients/SupabaseCRUDClient/withSupabaseClient.ts";

// Parser registry
export { makeParserRegistry } from "@clients/makeParserRegistry.ts";
export type { ModelCRUDParserRegistry } from "@clients/makeParserRegistry.ts";
