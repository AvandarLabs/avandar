import { makeProjectionDescriptorsFromSql } from "$/models/queries/QueryResultColumnBindings/makeProjectionDescriptorsFromSql/makeProjectionDescriptorsFromSql";
import { reconcileQueryResultColumnBindings } from "$/models/queries/QueryResultColumnBindings/reconcileQueryResultColumnBindings/reconcileQueryResultColumnBindings";
import { createQueryMetadataProvenance } from "@/clients/queries/createQueryMetadataProvenance";
import { runQuerySchema } from "@/clients/queries/runQuerySchema/runQuerySchema";
import { normalizeSqlForSubquery } from "@/lib/sql/normalizeSqlForSubquery";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type {
  QueryResultColumnBindings,
  ProjectionDescriptor,
  QueryResultColumnBindingRegistry,
} from "$/models/queries/QueryResultColumnBindings/QueryResultColumnBindings.types";
import type { QueryMetadataProvenance } from "@/clients/queries/createQueryMetadataProvenance";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";
import type { QueryClient } from "@tanstack/react-query";

type CreateSchemaOptions = {
  options: Readonly<DataVizColumnBindingsOptions>;
  columns: readonly QueryResult.Column[];
  previous: QueryResultColumnBindingRegistry | undefined;
  metadataProvenance: QueryMetadataProvenance;
};

type RefreshOptions = {
  options: Readonly<DataVizColumnBindingsOptions>;
  queryClient: QueryClient;
  result: Readonly<
    QueryResult.T & {
      executedSql: string | undefined;
      metadataProvenance?: QueryMetadataProvenance;
    }
  >;
  expectedSql: string;
};

/** Query ownership and identity seeds used for unfiltered schema discovery. */
export type DataVizColumnBindingsOptions = {
  scopeKey: string;
  rawSql: string;
  initialRegistry: QueryResultColumnBindingRegistry | undefined;
  auth: StructuredQueryAuth;
  projections: readonly ProjectionDescriptor[];
};
type VerifiedSchema = QueryResultColumnBindings & {
  metadataProvenance: QueryMetadataProvenance;
  rawColumns: readonly QueryResult.Column[];
};
const DISCOVERY_QUERY_KEY = "data-viz-column-bindings-v2";

type DiscoveryOptions = {
  queryKey: readonly [string, StructuredQueryAuth, string, string];
  queryFn: () => Promise<VerifiedSchema>;
  meta: { persist: false };
  staleTime: number;
};

function _createSchema({
  options,
  columns,
  previous,
  metadataProvenance,
}: CreateSchemaOptions): VerifiedSchema {
  const schema = reconcileQueryResultColumnBindings({
    scopeKey: options.scopeKey,
    sqlKey: normalizeSqlForSubquery(options.rawSql),
    columns,
    projections:
      options.projections.length > 0
        ? options.projections
        : makeProjectionDescriptorsFromSql({ sql: options.rawSql, columns }),
    previous,
  });
  return { ...schema, rawColumns: columns, metadataProvenance };
}

async function _discoverSchema(
  options: Readonly<DataVizColumnBindingsOptions>,
): Promise<VerifiedSchema> {
  const columns = await runQuerySchema({
    rawSql: normalizeSqlForSubquery(options.rawSql),
    auth: options.auth,
  });
  return _createSchema({
    options: options,
    columns: columns,
    previous: options.initialRegistry,
    metadataProvenance: createQueryMetadataProvenance(),
  });
}
function _getQueryOptions(
  options: Readonly<DataVizColumnBindingsOptions>,
): DiscoveryOptions {
  return {
    // Saved registries seed identities without splitting the discovery cache.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [
      DISCOVERY_QUERY_KEY,
      options.auth,
      options.scopeKey,
      normalizeSqlForSubquery(options.rawSql),
    ],
    queryFn: () => {
      return _discoverSchema(options);
    },
    meta: { persist: false },
    staleTime: Infinity,
  };
}
async function _get({
  options,
  queryClient,
}: Readonly<{
  options: Readonly<DataVizColumnBindingsOptions>;
  queryClient: QueryClient;
}>): Promise<QueryResultColumnBindings> {
  return await queryClient.ensureQueryData(_getQueryOptions(options));
}

/** Updates verified metadata only for the SQL executed by the owning block. */
function _refresh({
  options,
  queryClient,
  result,
  expectedSql,
}: Readonly<RefreshOptions>): void {
  const provenance = result.metadataProvenance;
  if (result.executedSql !== expectedSql || !provenance) {
    return;
  }
  queryClient.setQueryData<VerifiedSchema>(
    [
      DISCOVERY_QUERY_KEY,
      options.auth,
      options.scopeKey,
      normalizeSqlForSubquery(options.rawSql),
    ],
    (previous) => {
      if (
        !previous ||
        provenance.session !== previous.metadataProvenance.session ||
        provenance.sequence <= previous.metadataProvenance.sequence
      ) {
        return previous;
      }
      return JSON.stringify(previous.rawColumns) ===
        JSON.stringify(result.columns)
        ? { ...previous, metadataProvenance: provenance }
        : _createSchema({
            options: options,
            columns: result.columns,
            previous: previous.registry,
            metadataProvenance: provenance,
          });
    },
  );
}
/**
 * Shares verified output identities across renderer, editor, and save paths.
 */
export const DataVizColumnBindings = {
  /** Returns the common unfiltered discovery query and cache policy. */
  getQueryOptions: _getQueryOptions,
  /** Reuses or discovers the owning query's output identities. */
  get: _get,
  /** Publishes newer execution metadata for the same query owner. */
  refresh: _refresh,
};
