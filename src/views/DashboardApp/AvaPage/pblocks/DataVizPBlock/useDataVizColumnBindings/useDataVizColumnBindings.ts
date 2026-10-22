import { useQuery } from "@avandar/query-hooks";
import { DataVizColumnBindings } from "../DataVizColumnBindings";
import type { ResultColumnBindings } from "$/models/queries/QueryColumnBindings/QueryColumnBindings.types";
import type { DataVizColumnBindingsOptions } from "../DataVizColumnBindings";

/** Shares unfiltered schema readiness before chart predicates can execute. */
export function useDataVizColumnBindings(
  options: Readonly<DataVizColumnBindingsOptions>,
): {
  status: "loading" | "ready" | "error";
  schema: ResultColumnBindings | undefined;
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
