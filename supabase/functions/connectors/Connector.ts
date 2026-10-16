import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "$/types/database.types.ts";

/** Widens per future connector (MySQL, MSSQL, Snowflake, ...). */
export type ConnectorType = "postgres";

/** One pickable child object under a connection - a table/view, a sheet tab. */
export type ConnectorRelation = {
  /** Opaque to callers; the `postgres` connector encodes `"schema.table"`. */
  relationId: string;
  /** What the picker shows, e.g. "public.customers". */
  label: string;
  /** Connector-specific, e.g. `"table" | "view"` for postgres. */
  kind: string;
};

/**
 * A single column in a relation's preview, as the edge function reports it.
 * Deliberately not the browser-only `DuckDbColumnSchema`
 * (`src/clients/DuckDbClient/DuckDbClient.types.ts`) - edge functions only
 * resolve `$/` (`shared/`) and `@sbfn/` (`supabase/functions/`), so they
 * cannot import from `src/`. The real, DuckDB-typed schema is derived once
 * the `rows` route's CSV is transcoded client-side, exactly like Google
 * Sheets; this preview type exists only to describe what the picker shows
 * before that happens.
 */
export type ConnectorPreviewColumn = {
  columnName: string;
  /**
   * The source database's own type name, e.g. Postgres's
   * `information_schema.columns.data_type`.
   */
  sourceType: string;
};

export type ConnectorErrorCode =
  | "auth_failed"
  | "unreachable"
  | "ssl_required"
  | "timeout"
  | "too_large"
  | "unknown";

/** A connector failure with a specific, user-facing reason attached. */
export class ConnectorError extends Error {
  constructor(
    public readonly code: ConnectorErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Everything a connector implementation needs from the caller, resolved
 * once per request by `ConnectorRoutes.ts` before dispatching into the
 * registry. The QETL mediator never learns any of this exists - this
 * context lives entirely at the HTTP boundary, one layer below it.
 */
export type ConnectorContext = {
  workspaceId: string;
  /**
   * User-scoped client (the caller's own session) - for the app-role check
   * only. Never used to touch Vault or open a live connection.
   */
  supabaseClient: AvaSupabaseClient;
  /**
   * Service-role client - the only client allowed to read/write
   * `connections`, `connections__postgres`, and Vault.
   */
  supabaseAdminClient: SupabaseClient<Database>;
};

export type Connector = {
  testAndSaveConnection: (
    context: ConnectorContext,
    input: Record<string, unknown>,
  ) => Promise<{
    connectionId: string;
    relations: ConnectorRelation[];
  }>;
  listRelations: (
    context: ConnectorContext,
    connectionId: string,
  ) => Promise<ConnectorRelation[]>;
  previewRelation: (
    context: ConnectorContext,
    connectionId: string,
    relationId: string,
  ) => Promise<{
    columns: ConnectorPreviewColumn[];
    previewRows: Array<Record<string, unknown>>;
  }>;
  /** Returns the full relation as CSV text - what `acquire` calls. */
  getRelationRows: (
    context: ConnectorContext,
    connectionId: string,
    relationId: string,
  ) => Promise<string>;
};
