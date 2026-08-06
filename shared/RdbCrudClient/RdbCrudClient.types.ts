import type { ModelCrudParserRegistry } from "@clients/makeParserRegistry/makeParserRegistry.ts";
import type { ClientReturningOnlyPromises } from "@clients/ModelCrudClient/ModelCrudClient.types.ts";
import type { RegisteredSupabaseDatabase } from "@clients/Register.types.ts";
import type {
  AnySupabaseCrudModelSpec,
  SupabaseCrudClient,
} from "@clients/SupabaseCrudClient/SupabaseCrudClient.types.ts";
import type { ILogger } from "@logger/Logger.types.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmptyObject } from "type-fest";

/**
 * Model spec for `createRdbCrudClient`.
 *
 * Mirrors `createSupabaseCrudClient`'s options object structurally minus the
 * `dbClient` field — the umbrella factory injects the registered Supabase
 * client (Phase 1) or the SQLite client (Phase 2) per platform. Defined
 * structurally rather than via `Omit<Parameters<…>>` so generic inference
 * propagates `M` cleanly through `createRdbCrudClient(spec)` calls.
 */
export type RdbCrudModelSpec<
  M extends AnySupabaseCrudModelSpec,
  ExtendedQueriesClient extends ClientReturningOnlyPromises = EmptyObject,
  ExtendedMutationsClient extends ClientReturningOnlyPromises = EmptyObject,
> = {
  modelName: M["modelName"];
  tableName: M["tableName"];
  parsers: ModelCrudParserRegistry<M>;
  dbTablePrimaryKey: M["dbTablePrimaryKey"];
  queries?: (config: {
    clientLogger: ILogger;
    dbClient: SupabaseClient<RegisteredSupabaseDatabase>;
    parsers: ModelCrudParserRegistry<M>;
  }) => ExtendedQueriesClient;
  mutations?: (config: {
    clientLogger: ILogger;
    dbClient: SupabaseClient<RegisteredSupabaseDatabase>;
    parsers: ModelCrudParserRegistry<M>;
  }) => ExtendedMutationsClient;
};

/**
 * Concrete client returned by `createRdbCrudClient`.
 * For now, this is just the Supabase CRUD client. Soon it will widen into
 * a union adapter type once the SQLite-backed branch lands.
 */
export type RdbCrudClient<
  M extends AnySupabaseCrudModelSpec,
  ExtendedQueriesClient extends ClientReturningOnlyPromises = EmptyObject,
  ExtendedMutationsClient extends ClientReturningOnlyPromises = EmptyObject,
> = SupabaseCrudClient<M, ExtendedQueriesClient, ExtendedMutationsClient>;
