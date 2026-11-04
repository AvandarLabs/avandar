import { useQuery } from "@avandar/query-hooks";
import { DataVizColumnBindings } from "../DataVizColumnBindings";
import type { QueryResultColumnBindings } from "$/models/queries/QueryResultColumnBindings/QueryResultColumnBindings.types";
import type { DataVizColumnBindingsOptions } from "../DataVizColumnBindings";

/**
 * Gets the column IDs of a chart query's `QueryResult` columns through the
 * shared `DataVizColumnBindings` cache, with a loading, ready, or error
 * status. Use it to learn a chart's columns before its filtered query runs,
 * for example to bind filters to column IDs before building their SQL.
 */
export function useDataVizColumnBindings(
  options: Readonly<DataVizColumnBindingsOptions>,
): {
  status: "loading" | "ready" | "error";
  schema: QueryResultColumnBindings | undefined;
  error: Error | undefined;
} {
  const discovery = DataVizColumnBindings.getQueryOptions(options);
  const [schema, , query] = useQuery({
    ...discovery,
    enabled: discovery.queryKey[3].length > 0,
    retry: false,
  });
  return {
    status: query.isError ? "error" : schema ? "ready" : "loading",
    schema: query.isError ? undefined : schema,
    error: query.error ?? undefined,
  };
}
