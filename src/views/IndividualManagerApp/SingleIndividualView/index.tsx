import { unknownToString, where } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Skeleton, VisuallyHidden } from "@mantine/core";
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
import { RecordFactsGroup } from "@/views/IndividualManagerApp/SingleIndividualView/RecordFactsGroup/RecordFactsGroup";
import { RecordStatusControl } from "@/views/IndividualManagerApp/SingleIndividualView/RecordStatusControl/RecordStatusControl";
import css from "@/views/IndividualManagerApp/SingleIndividualView/SingleIndividualView.module.css";
import { useHydratedIndividual } from "@/views/IndividualManagerApp/SingleIndividualView/useHydratedIndividual";
import { useRecordStatusChange } from "@/views/IndividualManagerApp/SingleIndividualView/useRecordStatusChange/useRecordStatusChange";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { UserProfile } from "$/models/User/UserProfile";
import type { CaseDetailsRow } from "@/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail";

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
 * its activity feed and composer in the content column, and its fields and
 * record facts in the properties rail.
 *
 * The status control is a menu for a Case Records editor and a badge for
 * everyone else. A change saves at once and refreshes every view that shows
 * the record's status, this page's loader included.
 */
export function SingleIndividualView({
  concept,
  individual,
  highlightedCommentId,
}: Props): JSX.Element {
  const { t } = useLingui();
  const [hydratedIndividual, isLoadingHydratedIndividual] =
    useHydratedIndividual({
      concept,
      individual,
    });
  const [members, isLoadingMembers] = WorkspaceClient.useGetUsersForWorkspace({
    workspaceId: individual.workspaceId,
    useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
  });
  const [statuses] = ConceptStatusClient.useGetAll(
    where("concept_id", "eq", concept.id),
  );
  const canChangeStatus = useHasPermission("case_records__can_edit_record");
  const { displayedStatusId, isSaving, changeStatus } =
    useRecordStatusChange(individual);
  const sortedStatuses = useMemo(() => {
    return statuses ? ConceptStatus.sortByPosition(statuses) : undefined;
  }, [statuses]);

  const attributeRows: CaseDetailsRow[] | undefined = useMemo(() => {
    if (!hydratedIndividual.assertions) {
      return undefined;
    }
    return hydratedIndividual.assertions.map((assertion) => {
      return {
        id: assertion.conceptAttributeId,
        name: assertion.attributeName ?? t`Loading...`,
        value: assertion.value,
        sourceName: assertion.sourceName,
      };
    });
  }, [hydratedIndividual.assertions, t]);

  return (
    <AppView>
      <AppViewHeader
        title={
          isLoadingHydratedIndividual ? (
            <>
              <Skeleton
                component="span"
                height={24}
                width={200}
                display="inline-block"
                aria-hidden
              />
              <VisuallyHidden>{t`Loading case`}</VisuallyHidden>
            </>
          ) : (
            unknownToString(hydratedIndividual.name)
          )
        }
        titleAccessory={
          sortedStatuses ? (
            <RecordStatusControl
              statuses={sortedStatuses}
              currentStatusId={displayedStatusId}
              canEdit={canChangeStatus}
              isSaving={isSaving}
              onChange={changeStatus}
            />
          ) : null
        }
        facts={[concept.name]}
      />
      {
        // The body's own padding would leave a gap under the composer, which
        // docks to the bottom of the scroller. This view pays the same gutter
        // itself, minus the bottom.
      }
      <AppViewBody
        noPadding
        rail={
          <CaseDetailsRail attributes={attributeRows}>
            <RecordFactsGroup individual={individual} />
          </CaseDetailsRail>
        }
      >
        <div className={css.content}>
          <CaseActivityFeed
            workspaceId={individual.workspaceId}
            individualId={individual.id}
            members={isLoadingMembers ? undefined : (members ?? EMPTY_MEMBERS)}
            highlightedCommentId={highlightedCommentId}
          />
        </div>
      </AppViewBody>
    </AppView>
  );
}
