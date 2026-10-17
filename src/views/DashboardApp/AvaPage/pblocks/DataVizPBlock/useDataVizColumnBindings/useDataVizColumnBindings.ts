import { useQuery } from "@avandar/query-hooks";
import { describeSqlProjections } from "$/models/queries/QueryColumnBindings/describeSqlProjections/describeSqlProjections";
import { reconcileResultBindings } from "$/models/queries/QueryColumnBindings/reconcileResultBindings/reconcileResultBindings";
import { runQuerySchema } from "@/clients/queries/runQuerySchema/runQuerySchema";
import { normalizeSqlForSubquery } from "@/lib/sql/normalizeSqlForSubquery";
import type {
  BoundResultSchema,
  ProjectionDescriptor,
  ResultBindingRegistry,
} from "$/models/queries/QueryColumnBindings/QueryColumnBindings";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";
import type { QueryClient } from "@tanstack/react-query";

type Options = {
  scopeKey: string;
  rawSql: string;
  initialRegistry: ResultBindingRegistry | undefined;
  auth: StructuredQueryAuth;
  projections: readonly ProjectionDescriptor[];
};

type Discovery = {
  columns: readonly QueryResult.Column[];
  projections: readonly ProjectionDescriptor[];
  registry: ResultBindingRegistry;
};

async function _discoverSchema(
  auth: StructuredQueryAuth,
  scopeKey: string,
  sqlKey: string,
): Promise<Discovery> {
  const columns = await runQuerySchema({ rawSql: sqlKey, auth });
  const projections = describeSqlProjections({ sql: sqlKey, columns });
  const schema = reconcileResultBindings({
    scopeKey,
    sqlKey,
    columns,
    projections,
    previous: undefined,
  });
  return { columns, projections, registry: schema.registry };
}

function _bindDiscovery(
  options: Readonly<Options>,
  discovery: Readonly<Discovery>,
): BoundResultSchema {
  const sqlKey = normalizeSqlForSubquery(options.rawSql);
  const projections =
    options.projections.length > 0
      ? options.projections
      : discovery.projections;
  const previous = options.initialRegistry;
  // Opaque edits cannot inherit prior identity. Use this query's cached IDs
  // so independent consumers agree on newly discovered outputs.
  const canReconcilePrevious =
    previous?.scopeKey === options.scopeKey &&
    (projections.length > 0 || previous.sqlKey === sqlKey);
  return reconcileResultBindings({
    scopeKey: options.scopeKey,
    sqlKey,
    previous: canReconcilePrevious ? previous : discovery.registry,
    columns: discovery.columns,
    projections,
  });
}

function _getInitialDiscovery(
  options: Readonly<Options>,
): Discovery | undefined {
  const registry = options.initialRegistry;
  if (
    registry?.version !== 1 ||
    registry.scopeKey !== options.scopeKey ||
    registry.sqlKey !== normalizeSqlForSubquery(options.rawSql)
  ) {
    return undefined;
  }
  return {
    registry,
    columns: registry.columns,
    projections: describeSqlProjections({
      sql: options.rawSql,
      columns: registry.columns,
    }),
  };
}

/**
 * Shares unfiltered output identities across chart/settings consumers. Only
 * `ready` permits predicate execution. Errors use the query error reporter.
 * Persist `schema.registry` with its block scope, never the auth cache key.
 * A completed unfiltered data result can supply `initialRegistry` to skip
 * discovery. Supply the last registry to reconcile an explicit SQL edit.
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
    queryKey: ["data-viz-column-bindings", auth, scopeKey, sqlKey],
    queryFn: async () => {
      return _discoverSchema(auth, scopeKey, sqlKey);
    },
    initialData: () => {
      return _getInitialDiscovery(options);
    },
    select: (discovery) => {
      return _bindDiscovery(options, discovery);
    },
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
  const discovery = await queryClient.ensureQueryData({
    queryKey: [
      "data-viz-column-bindings",
      options.auth,
      options.scopeKey,
      sqlKey,
    ],
    queryFn: () => {
      return _discoverSchema(options.auth, options.scopeKey, sqlKey);
    },
    initialData: () => {
      return _getInitialDiscovery(options);
    },
    staleTime: Infinity,
  });
  return _bindDiscovery(options, discovery);
}
