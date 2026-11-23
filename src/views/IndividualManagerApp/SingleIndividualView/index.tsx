import { where } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Group } from "@mantine/core";
import { useMemo } from "react";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import { ConceptStatusClient } from "@/clients/ontology/ConceptStatusClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { AppView } from "@/components/layouts/AppView/AppView";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { AppViewHeader } from "@/components/layouts/AppView/AppViewHeader/AppViewHeader";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { CaseActivityFeed } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityFeed";
import { CaseDetailsRail } from "@/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail";
import { RecordAssigneeControl } from "@/views/IndividualManagerApp/SingleIndividualView/RecordAssigneeControl/RecordAssigneeControl";
import { RecordFactsGroup } from "@/views/IndividualManagerApp/SingleIndividualView/RecordFactsGroup/RecordFactsGroup";
import { RecordStatusControl } from "@/views/IndividualManagerApp/SingleIndividualView/RecordStatusControl/RecordStatusControl";
import css from "@/views/IndividualManagerApp/SingleIndividualView/SingleIndividualView.module.css";
import { useRecordAssigneeChange } from "@/views/IndividualManagerApp/SingleIndividualView/useRecordAssigneeChange/useRecordAssigneeChange";
import { useRecordFields } from "@/views/IndividualManagerApp/SingleIndividualView/useRecordFields/useRecordFields";
import { useRecordStatusChange } from "@/views/IndividualManagerApp/SingleIndividualView/useRecordStatusChange/useRecordStatusChange";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { UserProfile } from "$/models/User/UserProfile";

/** Stands in for the members until they load, one array for every render. */
const EMPTY_MEMBERS: readonly UserProfile.WithRole[] = [];

type Props = {
  concept: Concept.T;
  individual: Individual.T;

  /** A comment to scroll to and highlight, from a copied comment link. */
  highlightedCommentId: string | undefined;
};

/**
 * A case's record page: its name, status, and case type in the header band,
 * its fields and record facts in a fixed band above the activity, and the
 * activity feed and composer in the scrolling region under that band.
 *
 * The fields are read through the case type's concept view, so they show the
 * values the Data Explorer and chat see. The status control is a menu for a
 * Case Records editor and a badge for everyone else. A change saves at once
 * and refreshes every view that shows the record's status, this page's loader
 * included. The assignee control follows the status control and is a menu of
 * the workspace's members for the same editors, and plain text for everyone
 * else.
 */
export function SingleIndividualView({
  concept,
  individual,
  highlightedCommentId,
}: Props): JSX.Element {
  const { t } = useLingui();
  const recordFields = useRecordFields({ concept, individual });
  const [members, isLoadingMembers, membersQuery] =
    WorkspaceClient.useGetUsersForWorkspace({
      workspaceId: individual.workspaceId,
      useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
    });
  const [statuses] = ConceptStatusClient.useGetAll(
    where("concept_id", "eq", concept.id),
  );
  const canChangeStatus = useHasPermission("case_records__can_edit_record");
  const { displayedStatusId, isSaving, changeStatus } =
    useRecordStatusChange(individual);
  const assignee = useRecordAssigneeChange(individual);
  const sortedStatuses = useMemo(() => {
    return statuses ? ConceptStatus.sortByPosition(statuses) : undefined;
  }, [statuses]);

  return (
    <AppView>
      <AppViewHeader
        title={individual.name}
        titleAccessory={
          <Group gap="xs" wrap="nowrap">
            {sortedStatuses ? (
              <RecordStatusControl
                statuses={sortedStatuses}
                currentStatusId={displayedStatusId}
                canEdit={canChangeStatus}
                isSaving={isSaving}
                onChange={changeStatus}
              />
            ) : null}
            <RecordAssigneeControl
              members={
                isLoadingMembers ? undefined : (members ?? EMPTY_MEMBERS)
              }
              isMembersError={membersQuery.isError}
              assigneeId={assignee.displayedAssigneeId}
              canEdit={canChangeStatus}
              isSaving={assignee.isSaving}
              onChange={assignee.changeAssignee}
            />
          </Group>
        }
        facts={[concept.name]}
      />
      {
        // Fill the body and drop its padding. Each region below pays the
        // gutter itself, and the activity region omits the bottom so the
        // composer's dock sits flush with the scroller.
      }
      <AppViewBody noPadding isFillHeight>
        <div className={css.column}>
          <section className={css.detailsBand} aria-label={t`Details`}>
            <CaseDetailsRail
              attributes={recordFields.rows}
              loadError={
                recordFields.isLoadError
                  ? {
                      isRetrying: recordFields.isRetrying,
                      onRetry: recordFields.retry,
                    }
                  : undefined
              }
            >
              <RecordFactsGroup individual={individual} />
            </CaseDetailsRail>
          </section>
          <section className={css.activityPane} aria-label={t`Activity`}>
            <CaseActivityFeed
              workspaceId={individual.workspaceId}
              individualId={individual.id}
              members={
                isLoadingMembers ? undefined : (members ?? EMPTY_MEMBERS)
              }
              highlightedCommentId={highlightedCommentId}
            />
          </section>
        </div>
      </AppViewBody>
    </AppView>
  );
}
