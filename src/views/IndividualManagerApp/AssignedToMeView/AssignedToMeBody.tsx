import { AssignedRecordGroups } from "@/views/IndividualManagerApp/AssignedToMeView/AssignedRecordGroups";
import {
  AssignedToMeEmpty,
  AssignedToMeError,
  AssignedToMeLoading,
} from "@/views/IndividualManagerApp/AssignedToMeView/AssignedToMeStates";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { useAssignedRecords } from "@/views/IndividualManagerApp/AssignedToMeView/useAssignedRecords";
import type { CaseTypeRecordGroup } from "@/views/IndividualManagerApp/groupRecordsByCaseType/groupRecordsByCaseType";
import type { ReactNode } from "react";

type Props = {
  assigned: ReturnType<typeof useAssignedRecords>;
  groups: readonly CaseTypeRecordGroup[];
  conceptsById: ReadonlyMap<Concept.Id, Concept.T>;
  statusesById: ReadonlyMap<ConceptStatus.Id, ConceptStatus.T>;
};

/**
 * What the queue shows under the header: a loading placeholder, the failure
 * with a retry, an empty note, or the case type sections.
 */
export function AssignedToMeBody({
  assigned,
  groups,
  conceptsById,
  statusesById,
}: Readonly<Props>): ReactNode {
  if (assigned.isLoading && assigned.records.length === 0) {
    return <AssignedToMeLoading />;
  }
  if (assigned.isError) {
    return <AssignedToMeError onRetry={assigned.refetch} />;
  }
  if (assigned.records.length === 0) {
    return <AssignedToMeEmpty />;
  }

  return (
    <AssignedRecordGroups
      groups={groups}
      conceptsById={conceptsById}
      statusesById={statusesById}
      hasNextPage={assigned.hasNextPage}
      isFetchingNextPage={assigned.isFetchingNextPage}
      onShowMore={assigned.fetchNextPage}
    />
  );
}
