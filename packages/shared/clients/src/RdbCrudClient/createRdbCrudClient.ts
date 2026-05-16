import { isDesktop } from "$/platform";
import { createSupabaseCrudClient } from "@clients/SupabaseCrudClient/createSupabaseCrudClient.ts";
import { getRegisteredWebDbClient } from "@clients/webDbClientRegistry.ts";
import type { ClientReturningOnlyPromises } from "@clients/ModelCrudClient/ModelCrudClient.types.ts";
import type {
  AnySupabaseCrudModelSpec,
  SupabaseCrudClient,
} from "@clients/SupabaseCrudClient/SupabaseCrudClient.types.ts";
import type { EmptyObject } from "type-fest";
import type { RdbCrudModelSpec } from "./RdbCrudClient.types.ts";

// Re-export so existing imports (`import { registerWebDbClient } from
// "@clients/RdbCrudClient/createRdbCrudClient.ts"`) keep working.
export { registerWebDbClient } from "@clients/webDbClientRegistry.ts";

/**
 * Platform-aware CRUD client factory. Phase 1 always returns the
 * Supabase-backed client (Option A in the Phase 1 plan); Phase 2 will branch
 * on {@link isDesktop} and return a SQLite-backed client when running on the
 * Electrobun desktop shell.
 *
 * Consumers pass the spec WITHOUT a `dbClient` field; the factory injects the
 * registered Supabase client. This makes the migration from
 * `createSupabaseCrudClient` to `createRdbCrudClient` purely mechanical —
 * every call site drops the explicit `dbClient: AvaSupabase.DB` field and
 * relies on the registration.
 *
 * @param spec - CRUD spec (model/table/parsers/optional queries+mutations).
 * @returns The Supabase-backed CRUD client (Phase 1; widens in Phase 2).
 * @throws Error When no web db client has been registered via
 *   {@link registerWebDbClient}.
 */
export function createRdbCrudClient<
  M extends AnySupabaseCrudModelSpec,
  ExtendedQueriesClient extends ClientReturningOnlyPromises = EmptyObject,
  ExtendedMutationsClient extends ClientReturningOnlyPromises = EmptyObject,
>(
  spec: RdbCrudModelSpec<M, ExtendedQueriesClient, ExtendedMutationsClient>,
): SupabaseCrudClient<M, ExtendedQueriesClient, ExtendedMutationsClient> {
  // Phase 1: both web and desktop fall through to the Supabase factory.
  // Phase 2 introduces the SQLite-backed branch here for desktop:
  //   if (isDesktop()) return createSqliteCrudClient(spec);
  void isDesktop;
  return createSupabaseCrudClient<
    M,
    ExtendedQueriesClient,
    ExtendedMutationsClient
  >({
    ...spec,
    dbClient: getRegisteredWebDbClient(),
  });
}
