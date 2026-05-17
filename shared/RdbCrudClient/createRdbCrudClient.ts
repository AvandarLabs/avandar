import { createSupabaseCrudClient } from "@clients/SupabaseCrudClient/createSupabaseCrudClient.ts";
import { AvaSupabase } from "$/db/supabase/AvaSupabase.ts";
import { isDesktop } from "$/platform/isDesktop.ts";
import type { ClientReturningOnlyPromises } from "@clients/ModelCrudClient/ModelCrudClient.types.ts";
import type { RdbCrudModelSpec } from "$/RdbCrudClient/RdbCrudClient.types.ts";
import type {
  AnySupabaseCrudModelSpec,
  SupabaseCrudClient,
} from "@clients/SupabaseCrudClient/SupabaseCrudClient.types.ts";
import type { EmptyObject } from "type-fest";

/**
 * Platform-aware CRUD client factory.
 *
 * For now, we always return the Supabase-backed client. Soon, this will
 * branch on {@link isDesktop} and return a SQLite-backed client when
 * running on the Electrobun desktop shell.
 *
 * Consumers pass the spec WITHOUT a `dbClient` field; the factory injects the
 * shared `AvaSupabase` singleton. This makes the migration from
 * `createSupabaseCrudClient` to `createRdbCrudClient` purely mechanical —
 * every call site drops the explicit `dbClient: AvaSupabase.db()` field.
 *
 * @param modelSpec - CRUD spec (CRUD models, names, and primary keys)
 * @returns The Supabase-backed CRUD client (for now. Soon to be a union)
 */
export function createRdbCrudClient<
  M extends AnySupabaseCrudModelSpec,
  ExtendedQueriesClient extends ClientReturningOnlyPromises = EmptyObject,
  ExtendedMutationsClient extends ClientReturningOnlyPromises = EmptyObject,
>(
  modelSpec: RdbCrudModelSpec<
    M,
    ExtendedQueriesClient,
    ExtendedMutationsClient
  >,
): SupabaseCrudClient<M, ExtendedQueriesClient, ExtendedMutationsClient> {
  // For now, both web and desktop fall through to the Supabase factory.
  // Soon, this we will introduce a SQLite-backed branch here for desktop:
  //   if (isDesktop()) return createSqliteCrudClient(spec);
  return createSupabaseCrudClient<
    M,
    ExtendedQueriesClient,
    ExtendedMutationsClient
  >({
    ...modelSpec,
    dbClient: AvaSupabase.db(),
  });
}
