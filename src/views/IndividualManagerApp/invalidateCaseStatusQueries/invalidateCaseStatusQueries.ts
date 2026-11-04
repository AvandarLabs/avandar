import { isPlainObject } from "@avandar/utils";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { ConceptStatusClient } from "@/clients/ontology/ConceptStatusClient";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { isDataQueryKey } from "@/views/DataExplorerApp/useDataQuery/isDataQueryKey";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { AnyRouter } from "@tanstack/react-router";

type Options = {
  queryClient: QueryClient;

  /** The app router. Its `invalidate` reloads the open route's loader. */
  router: Pick<AnyRouter, "invalidate">;

  conceptId: Concept.Id;

  /**
   * `recordStatus` after one record's status changes, `statusSet` after a
   * case type's statuses are saved.
   */
  change: "recordStatus" | "statusSet";
};

/**
 * Whether a client query reads one case type: either its params name the
 * case type (`{ conceptId }`) or its `where` filters on it, whatever else
 * the `where` narrows by, such as a status filter.
 */
function _isQueryForCaseType(
  options: Readonly<{
    queryKey: QueryKey;
    clientName: string;
    conceptId: Concept.Id;
  }>,
): boolean {
  const [keyClientName, , params] = options.queryKey;
  if (keyClientName !== options.clientName || !isPlainObject(params)) {
    return false;
  }
  if (params.conceptId === options.conceptId) {
    return true;
  }
  const { where } = params;
  return (
    isPlainObject(where) &&
    isPlainObject(where.concept_id) &&
    where.concept_id.eq === options.conceptId
  );
}

function _invalidateCaseTypeQueries(
  options: Readonly<{
    queryClient: QueryClient;
    clientName: string;
    conceptId: Concept.Id;
  }>,
): Promise<void> {
  const { queryClient, clientName, conceptId } = options;
  return queryClient.invalidateQueries({
    predicate: (query) => {
      return _isQueryForCaseType({
        queryKey: query.queryKey,
        clientName,
        conceptId,
      });
    },
  });
}

/**
 * Marks stale every query that shows a case type's statuses or the status
 * of one of its records, and reloads the open route.
 *
 * Both kinds of change refresh the case type's record lists and counts
 * (whatever status filter they use), its statuses and their record counts,
 * every Data Explorer query, and the route loader, which holds the open
 * record and the open case type. A data query's key names its SQL, not the
 * case types the SQL reads, so all of them are marked. Saving a status set
 * also refreshes the case type itself, whose default status may have moved.
 */
export async function invalidateCaseStatusQueries(
  options: Readonly<Options>,
): Promise<void> {
  const { queryClient, router, conceptId, change } = options;
  const invalidations = [
    _invalidateCaseTypeQueries({
      queryClient,
      clientName: IndividualClient.getClientName(),
      conceptId,
    }),
    _invalidateCaseTypeQueries({
      queryClient,
      clientName: ConceptStatusClient.getClientName(),
      conceptId,
    }),
    queryClient.invalidateQueries({
      predicate: (query) => {
        return isDataQueryKey(query.queryKey);
      },
    }),
    router.invalidate(),
  ];
  if (change === "statusSet") {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: [ConceptClient.getClientName()],
      }),
    );
  }
  await Promise.all(invalidations);
}
