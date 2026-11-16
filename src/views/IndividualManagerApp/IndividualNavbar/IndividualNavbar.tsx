import { makeIdLookupMap, where } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Loader, Stack } from "@mantine/core";
import { keepPreviousData } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import { ConceptStatusClient } from "@/clients/ontology/ConceptStatusClient";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { AppListPane } from "@/components/layouts/AppListPane/AppListPane";
import { AssigneeFilter } from "@/views/IndividualManagerApp/IndividualNavbar/AssigneeFilter/AssigneeFilter";
import { filterToKnownStatusIds } from "@/views/IndividualManagerApp/IndividualNavbar/filterToKnownStatusIds/filterToKnownStatusIds";
import { IndividualNavbarRows } from "@/views/IndividualManagerApp/IndividualNavbar/IndividualNavbarRows";
import { StatusFilter } from "@/views/IndividualManagerApp/IndividualNavbar/StatusFilter/StatusFilter";
import { makeRecordsListWhere } from "@/views/IndividualManagerApp/makeRecordsListWhere/makeRecordsListWhere";
import { useConceptIndividuals } from "@/views/IndividualManagerApp/useConceptIndividuals";
import { useVirtualIndividualLinks } from "@/views/IndividualManagerApp/useVirtualIndividualLinks";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { AssigneeFilter as AssigneeChoice } from "@/views/IndividualManagerApp/makeRecordsListWhere/makeRecordsListWhere";
import type { ReactNode } from "react";

const NO_STATUSES: readonly ConceptStatus.T[] = [];

const ANYONE: AssigneeChoice = { kind: "anyone" };

/**
 * What the list says when nothing matches. `undefined` leaves the rows'
 * default, which is for a case type with no records at all.
 */
function _makeEmptyMessage(
  hasStatuses: boolean,
  assignee: AssigneeChoice,
): ReactNode {
  const hasAssignee = assignee.kind !== "anyone";
  if (hasStatuses && hasAssignee) {
    return <Trans>No records match these filters</Trans>;
  }
  if (assignee.kind === "unassigned") {
    return <Trans>No records are unassigned</Trans>;
  }
  if (assignee.kind === "member") {
    return <Trans>No records are assigned to this person</Trans>;
  }
  return hasStatuses ? (
    <Trans>No records have these statuses</Trans>
  ) : undefined;
}

type Props = {
  concept: Concept.T;
};

/**
 * The master pane of the records workspace: one case type's records, each
 * marked with its status, narrowed by a status filter and an assignee filter.
 *
 * The filters always show. Unlike a dataset list, narrowing by status is
 * what this list is for, so it does not wait for the list to grow long. Its
 * state lives here, and this pane stays mounted while the user moves between
 * records, so the filter survives those clicks. The header count is the
 * number of records the filter matches, read with the same filter the rows
 * use.
 */
export function IndividualNavbar({ concept }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const [pickedStatusIds, setPickedStatusIds] = useState<ConceptStatus.Id[]>(
    [],
  );
  const [assignee, setAssignee] = useState<AssigneeChoice>(ANYONE);
  const [members] = WorkspaceClient.useGetUsersForWorkspace({
    workspaceId: concept.workspaceId,
  });
  const membersById = useMemo(() => {
    return members
      ? new Map(
          members.map((member) => {
            return [member.userId, member] as const;
          }),
        )
      : undefined;
  }, [members]);
  const [statuses = NO_STATUSES] = ConceptStatusClient.useGetAll(
    where("concept_id", "eq", concept.id),
  );
  const sortedStatuses = useMemo(() => {
    return ConceptStatus.sortByPosition(statuses);
  }, [statuses]);
  const statusesById = useMemo(() => {
    return makeIdLookupMap(sortedStatuses);
  }, [sortedStatuses]);
  const statusIds = useMemo(() => {
    return filterToKnownStatusIds({
      statusIds: pickedStatusIds,
      statuses: sortedStatuses,
    });
  }, [pickedStatusIds, sortedStatuses]);
  const [matchingCount] = IndividualClient.useGetCount({
    ...makeRecordsListWhere({
      conceptId: concept.id,
      statusIds,
      assignee,
    }),
    useQueryOptions: { placeholderData: keepPreviousData },
  });
  const records = useConceptIndividuals({
    conceptId: concept.id,
    statusIds,
    assignee,
  });
  const { parentRef, individualLinks, listHeight } = useVirtualIndividualLinks({
    concept,
    statusesById,
    membersById,
    ...records,
  });

  return (
    <AppListPane
      title={concept.name}
      count={matchingCount ?? undefined}
      action={
        records.isLoading ? (
          <Loader size={14} role="status" aria-label={t`Loading records`} />
        ) : null
      }
      bodyRef={parentRef}
      filter={
        <Stack gap="xs">
          <StatusFilter
            statuses={sortedStatuses}
            selectedStatusIds={statusIds}
            onChange={setPickedStatusIds}
          />
          <AssigneeFilter
            members={members}
            value={assignee}
            onChange={setAssignee}
          />
        </Stack>
      }
    >
      <IndividualNavbarRows
        isLoading={records.isLoading}
        hasRecords={records.allIndividuals.length > 0}
        emptyMessage={_makeEmptyMessage(statusIds.length > 0, assignee)}
        links={individualLinks}
        listHeight={listHeight}
      />
    </AppListPane>
  );
}
