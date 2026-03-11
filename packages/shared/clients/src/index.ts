// Overrideable register for Supabase database types
export type { Register } from "./Register.types.ts";

// Base service client
export { createServiceClient } from "./ServiceClient/createServiceClient.ts";
export type { ServiceClient } from "./ServiceClient/ServiceClient.types.ts";

// Base CRUD client
export { createModelCRUDClient } from "./ModelCRUDClient/createModelCRUDClient.ts";
export type { CRUDModelSpec } from "./ModelCRUDClient/ModelCRUDClient.types.ts";
export type { ClientReturningOnlyPromises } from "./ModelCRUDClient/ModelCRUDClient.types.ts";
export type { ModelCRUDClient } from "./ModelCRUDClient/ModelCRUDClient.types.ts";
export type { UpsertOptions } from "./ModelCRUDClient/ModelCRUDClient.types.ts";

// Supabase client
export { createSupabaseCRUDClient } from "./SupabaseCRUDClient/createSupabaseCRUDClient.ts";
export { withSupabaseClient } from "./SupabaseCRUDClient/withSupabaseClient.ts";
export type { SupabaseCRUDModelSpec } from "./SupabaseCRUDClient/SupabaseCRUDClient.types.ts";
export type { WithSupabaseClient } from "./SupabaseCRUDClient/withSupabaseClient.ts";

// Parser registry
export { makeParserRegistry } from "./makeParserRegistry.ts";
export type { ModelCRUDParserRegistry } from "./makeParserRegistry.ts";
