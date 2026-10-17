import { useQuery } from "@avandar/query-hooks";
import { describeSqlProjections } from "$/models/queries/QueryColumnBindings/describeSqlProjections/describeSqlProjections";
import { reconcileResultBindings } from "$/models/queries/QueryColumnBindings/reconcileResultBindings/reconcileResultBindings";
import { createQueryMetadataProvenance } from "@/clients/queries/createQueryMetadataProvenance";
import { runQuerySchema } from "@/clients/queries/runQuerySchema/runQuerySchema";
import { normalizeSqlForSubquery } from "@/lib/sql/normalizeSqlForSubquery";
import type {
  BoundResultSchema,
  ProjectionDescriptor,
  ResultBindingRegistry,
} from "$/models/queries/QueryColumnBindings/QueryColumnBindings";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { QueryMetadataProvenance } from "@/clients/queries/createQueryMetadataProvenance";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";
import type { QueryClient } from "@tanstack/react-query";

type Options = {
  scopeKey: string;
  rawSql: string;
  initialRegistry: ResultBindingRegistry | undefined;
  auth: StructuredQueryAuth;
  projections: readonly ProjectionDescriptor[];
};

const DISCOVERY_QUERY_KEY = "data-viz-column-bindings-v2";

type VerifiedSchema = BoundResultSchema & {
  metadataProvenance: QueryMetadataProvenance;
  rawColumns: readonly QueryResult.Column[];
};

function _createSchema(
  options: Readonly<Options>,
  columns: readonly QueryResult.Column[],
  previous: ResultBindingRegistry | undefined,
  metadataProvenance: QueryMetadataProvenance,
): VerifiedSchema {
  const schema = reconcileResultBindings({
    scopeKey: options.scopeKey,
    sqlKey: normalizeSqlForSubquery(options.rawSql),
    columns,
    projections:
      options.projections.length > 0
        ? options.projections
        : describeSqlProjections({ sql: options.rawSql, columns }),
    previous,
  });
  return { ...schema, rawColumns: columns, metadataProvenance };
}

async function _discoverSchema(
  options: Readonly<Options>,
): Promise<VerifiedSchema> {
  const columns = await runQuerySchema({
    rawSql: normalizeSqlForSubquery(options.rawSql),
    auth: options.auth,
  });
  return _createSchema(
    options,
    columns,
    options.initialRegistry,
    createQueryMetadataProvenance(),
  );
}

/**
 * Shares unfiltered output identities across chart/settings consumers. Only
 * `ready` permits predicate execution. Errors use the query error reporter.
 * Persist `schema.registry` with its block scope, never the auth cache key.
 * Persisted registries seed identity history only. Every uncached scope/SQL
 * discovers actual metadata before allowing filtered execution.
 */
export function useDataVizColumnBindings(options: Readonly<Options>): {
  status: "loading" | "ready" | "error";
  schema: BoundResultSchema | undefined;
  error: Error | undefined;
} {
  const { auth, scopeKey } = options;
  const sqlKey = normalizeSqlForSubquery(options.rawSql);
  const [schema, , query] = useQuery({
    enabled: sqlKey.length > 0,
    // Registry/projection inputs seed identity only. Keying by saved state
    // would rediscover on explicit saves and split renderer/settings identity.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [DISCOVERY_QUERY_KEY, auth, scopeKey, sqlKey],
    queryFn: async () => {
      return _discoverSchema(options);
    },
    meta: { persist: false },
    staleTime: Infinity,
    retry: false,
  });
  return {
    status: query.isError ? "error" : schema ? "ready" : "loading",
    schema: query.isError ? undefined : schema,
    error: query.error ?? undefined,
  };
}

/** Reuses the renderer's discovery cache during an authorized editor change. */
export async function getDataVizColumnBindings(
  options: Readonly<Options>,
  queryClient: QueryClient,
): Promise<BoundResultSchema> {
  const sqlKey = normalizeSqlForSubquery(options.rawSql);
  return await queryClient.ensureQueryData({
    // Registry/projection inputs seed identity only. Keying by saved state
    // would rediscover on explicit saves and split renderer/settings identity.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [DISCOVERY_QUERY_KEY, options.auth, options.scopeKey, sqlKey],
    queryFn: () => {
      return _discoverSchema(options);
    },
    meta: { persist: false },
    staleTime: Infinity,
  });
}

/** Updates verified metadata only for the SQL executed by the owning block. */
export function refreshDataVizColumnBindings(
  options: Readonly<Options>,
  queryClient: QueryClient,
  result: Readonly<
    QueryResult.T & {
      executedSql: string | undefined;
      metadataProvenance?: QueryMetadataProvenance;
    }
  >,
  expectedSql: string,
): void {
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
        : _createSchema(options, result.columns, previous.registry, provenance);
    },
  );
}
