import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { Workspace } from "$/models/Workspace/Workspace";

/** Who is asking, which decides which QETL client answers. */
export type StructuredQueryAuth =
  | { auth: "workspace"; workspaceId: Workspace.Id }
  | {
      auth: "public";
      publicAvaPageId: Dashboard.Id;
      snapshotRevision: string;
    }
  | {
      auth: "workspace_published";
      publicAvaPageId: Dashboard.Id;
      snapshotRevision: string;
    };

/**
 * Inputs to {@link runStructuredQueryWithMetadata}: the query to execute,
 * optional caller-supplied raw SQL, and who is asking (which decides which
 * QETL client answers and whether a structured query is even permitted).
 */
export type RunStructuredQueryParams = StructuredQueryAuth & {
  query: StructuredQuery.Partial;
  rawSql: string | undefined;

  /**
   * When true, `rawSql` came from the manual form and the row-count guard may
   * replace it with bounded SQL before execution.
   */
  isStructuredQueryInSync?: boolean;
};

/** A query result plus the execution relations analytics records about it. */
export type RunStructuredQueryResult = {
  result: QueryResult.T<UnknownRow>;
  /**
   * True when the large-dataset guard replaced the caller's query with a
   * bounded one. Analytics records this so an unexpectedly small row count can
   * be told apart from a genuinely small dataset.
   */
  didAutoLimit: boolean;
};
