import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import type { SourceVersion } from "$/models/relations/RelationCapabilities/RelationCapabilities.types";

/**
 * Reads one Postgres relation's rows into a relation.
 *
 * Injected rather than imported so this module stays free of DuckDB,
 * mirroring `acquireGoogleSheetRelation`
 * (`src/clients/google/GoogleDriveClient/`). Unlike Sheets, there is no
 * separate access token to thread through: the
 * edge function call carries the caller's own Supabase session, and the
 * edge function itself resolves the connection's decrypted password from
 * Vault server-side (spec section 5.2) - this module never sees a credential.
 */
export type PostgresRelationCsvReader<TRelation> = (
  params: Readonly<{ csvText: string }>,
) => Promise<TRelation>;

/**
 * One acquired Postgres relation. No `sourceVersion`: `freshnessSignal` is
 * `"none"` for v1 (spec section 5.3).
 */
export type AcquiredPostgresTableRelation<TRelation> = {
  relation: TRelation;
  sourceVersion: SourceVersion | undefined;
};

/**
 * Injectable in place of the real `fetch`, for tests. The minimal call
 * signature this module actually uses, not `typeof fetch` itself (whose
 * static `preconnect` member a plain stub function does not have to
 * implement).
 */
export type PostgresRowsFetch = (
  url: string,
  init?: RequestInit,
) => Promise<Response>;

/**
 * Acquires one Postgres relation: fetch its rows as CSV through the
 * `external-datasets` edge function's `rows` route, then read it.
 *
 * This is the whole connector in one function, same shape as
 * `acquireGoogleSheetRelation`: it reads no dataset record, holds no
 * connection credential, and imports no client singleton, so the wrapper
 * that eventually calls it keeps `WrapperContext` as the only source of
 * identity. `relationId` is encoded as `` `${schemaName}.${tableName}` ``,
 * per spec section 5.4.
 *
 * This route returns raw CSV text (`Content-Type: text/csv`), not a JSON
 * object, so it is fetched directly rather than through
 * `APIClient`/`supabase.functions.invoke`: that call's own content-type
 * parsing would resolve the body to a plain string before this function
 * ever saw it, and the route's declared type can only be `Response`
 * (`ExternalDatasetRoutes.types.ts`'s comment explains why). This mirrors
 * `fetchOpenDataCatalogResource.ts`, the one other raw-bytes route in this
 * codebase, including its auth pattern (a manually attached session Bearer
 * token).
 *
 * @param params The connection and relation to acquire, and the reader to
 *   read the CSV through.
 * @returns The reader's output. `sourceVersion` is always `undefined` for v1
 *   (no freshness signal).
 */
export async function acquirePostgresTableRelation<TRelation>(
  params: Readonly<{
    connectionId: string;
    schemaName: string;
    tableName: string;
    readCsv: PostgresRelationCsvReader<TRelation>;
    rowsFetch?: PostgresRowsFetch;
  }>,
): Promise<AcquiredPostgresTableRelation<TRelation>> {
  const relationId = `${params.schemaName}.${params.tableName}`;
  const doFetch = params.rowsFetch ?? fetch;

  const { data } = await AvaSupabase.db().auth.getSession();
  const accessToken = data.session?.access_token;
  if (accessToken === undefined) {
    throw new Error("No session is available to acquire a Postgres relation");
  }

  const url =
    `${AvaSupabase.getEdgeFunctionsURL()}/external-datasets/postgres/connections/` +
    `${encodeURIComponent(params.connectionId)}/relations/` +
    `${encodeURIComponent(relationId)}/rows`;
  const response = await doFetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const contentType = response.headers.get("Content-Type") ?? "";
  if (!response.ok || !contentType.includes("text/csv")) {
    const body: unknown = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "object" &&
      body.error !== null &&
      "message" in body.error
        ? String(body.error.message)
        : `Failed to read Postgres relation '${relationId}' (${response.status})`;
    throw new Error(message);
  }

  const csvText = await response.text();
  const relation = await params.readCsv({ csvText });
  return { relation, sourceVersion: undefined };
}
