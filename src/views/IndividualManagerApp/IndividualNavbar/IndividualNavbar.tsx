import { makeIdLookupMap, where } from "@avandar/utils";
import { Loader } from "@mantine/core";
import { keepPreviousData } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import { ConceptStatusClient } from "@/clients/ontology/ConceptStatusClient";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { AppListPane } from "@/components/layouts/AppListPane/AppListPane";
import { IndividualNavbarRows } from "@/views/IndividualManagerApp/IndividualNavbar/IndividualNavbarRows";
import { StatusFilter } from "@/views/IndividualManagerApp/IndividualNavbar/StatusFilter/StatusFilter";
import { makeRecordsWhereFromStatusFilter } from "@/views/IndividualManagerApp/makeRecordsWhereFromStatusFilter/makeRecordsWhereFromStatusFilter";
import { useConceptIndividuals } from "@/views/IndividualManagerApp/useConceptIndividuals";
import { useVirtualIndividualLinks } from "@/views/IndividualManagerApp/useVirtualIndividualLinks";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ReactNode } from "react";

const NO_STATUSES: readonly ConceptStatus.T[] = [];

type Props = {
  concept: Concept.T;
};

/**
 * The master pane of the records workspace: one case type's records, each
 * marked with its status, narrowed by a status filter.
 *
 * The filter always shows. Unlike a dataset list, narrowing by status is
 * what this list is for, so it does not wait for the list to grow long. Its
 * state lives here, and this pane stays mounted while the user moves between
 * records, so the filter survives those clicks. The header count is the
 * number of records the filter matches, read with the same filter the rows
 * use.
 */
export function IndividualNavbar({ concept }: Readonly<Props>): ReactNode {
  const [statusIds, setStatusIds] = useState<ConceptStatus.Id[]>([]);
  const [statuses = NO_STATUSES] = ConceptStatusClient.useGetAll(
    where("concept_id", "eq", concept.id),
  );
  const sortedStatuses = useMemo(() => {
    return ConceptStatus.sortByPosition(statuses);
  }, [statuses]);
  const statusesById = useMemo(() => {
    return makeIdLookupMap(sortedStatuses);
  }, [sortedStatuses]);
  const [matchingCount] = IndividualClient.useGetCount({
    ...makeRecordsWhereFromStatusFilter({ conceptId: concept.id, statusIds }),
    useQueryOptions: { placeholderData: keepPreviousData },
  });
  const records = useConceptIndividuals({ conceptId: concept.id, statusIds });
  const { parentRef, individualLinks, listHeight } = useVirtualIndividualLinks(
    { concept, statusesById, ...records },
  );

  return (
    <AppListPane
      title={concept.name}
      count={matchingCount ?? undefined}
      action={records.isLoading ? <Loader size={14} /> : null}
      bodyRef={parentRef}
      filter={
        <StatusFilter
          statuses={sortedStatuses}
          selectedStatusIds={statusIds}
          onChange={setStatusIds}
        />
      }
    >
      <IndividualNavbarRows
        isLoading={records.isLoading}
        hasRecords={records.allIndividuals.length > 0}
        isFiltered={statusIds.length > 0}
        links={individualLinks}
        listHeight={listHeight}
      />
    </AppListPane>
  );
}
