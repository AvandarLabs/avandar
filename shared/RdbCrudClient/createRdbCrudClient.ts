import {
  createSqliteCrudClient,
  createSupabaseCrudClient,
} from "@avandar/clients";
import { AvaSupabase } from "$/db/supabase/AvaSupabase.ts";
import { isDesktop } from "$/platform/isDesktop.ts";
import { ipcSqliteTransport } from "$/RdbCrudClient/ipcSqliteTransport.ts";
import type {
  AnySupabaseCrudModelSpec,
  ClientReturningOnlyPromises,
  SupabaseCrudClient,
} from "@avandar/clients";
import type { RdbCrudModelSpec } from "$/RdbCrudClient/RdbCrudClient.types.ts";
import type { EmptyObject } from "type-fest";

/**
 * Platform-aware CRUD client factory.
 *
 * On web, delegates to {@link createSupabaseCrudClient}. On the
 * Electrobun desktop shell (where `isDesktop()` is true), delegates to
 * {@link createSqliteCrudClient} so reads and writes hit the local
 * SQLite mirror through the typed IPC bridge instead of Supabase REST.
 *
 * Both branches return the same `SupabaseCrudClient<…>` shape so the
 * call sites under `src/clients/**` stay unchanged.
 *
 * Consumers pass the spec WITHOUT a `dbClient` field; the factory
 * injects the shared `AvaSupabase` singleton. The SQLite client still
 * accepts the Supabase handle because its escape-hatch `queries` and
 * `mutations` factories receive it: for now those escape hatches
 * target Supabase REST in both branches, and the sync engine will
 * eventually route them through the local mirror.
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
  const dbClient = AvaSupabase.db();
  if (isDesktop()) {
    return createSqliteCrudClient<
      M,
      ExtendedQueriesClient,
      ExtendedMutationsClient
    >({
      ...modelSpec,
      dbClient,
      sqliteTransport: ipcSqliteTransport,
    });
  }
  return createSupabaseCrudClient<
    M,
    ExtendedQueriesClient,
    ExtendedMutationsClient
  >({
    ...modelSpec,
    dbClient,
  });
}
