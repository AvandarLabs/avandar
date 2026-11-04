import { where } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Stack } from "@mantine/core";
import { useMemo } from "react";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import { ConceptStatusClient } from "@/clients/ontology/ConceptStatusClient";
import { AppView } from "@/components/layouts/AppView/AppView";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { AppViewHeader } from "@/components/layouts/AppView/AppViewHeader/AppViewHeader";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { ActivityBlock } from "@/views/IndividualManagerApp/SingleIndividualView/ActivityBlock";
import { RecordDetailsSection } from "@/views/IndividualManagerApp/SingleIndividualView/RecordDetailsSection";
import { RecordRail } from "@/views/IndividualManagerApp/SingleIndividualView/RecordRail/RecordRail";
import { RecordStatusControl } from "@/views/IndividualManagerApp/SingleIndividualView/RecordStatusControl/RecordStatusControl";
import { useHydratedIndividual } from "@/views/IndividualManagerApp/SingleIndividualView/useHydratedIndividual";
import { useRecordStatusChange } from "@/views/IndividualManagerApp/SingleIndividualView/useRecordStatusChange/useRecordStatusChange";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { ReactNode } from "react";

type Props = {
  concept: Concept.T;
  individual: Individual.T;
};

/**
 * One record: its name with its status beside it, its attribute values, and
 * its activity, with where it came from in the rail.
 *
 * The status control is a menu for a Case Records editor and a badge for
 * everyone else. A change saves at once and refreshes every view that shows
 * the record's status, this page's loader included.
 */
export function SingleIndividualView({
  concept,
  individual,
}: Readonly<Props>): ReactNode {
  const [hydratedIndividual] = useHydratedIndividual({ concept, individual });
  const [statuses] = ConceptStatusClient.useGetAll(
    where("concept_id", "eq", concept.id),
  );
  const canChangeStatus = useHasPermission("case_records__can_edit_record");
  const { displayedStatusId, isSaving, changeStatus } =
    useRecordStatusChange(individual);
  const sortedStatuses = useMemo(() => {
    return statuses ? ConceptStatus.sortByPosition(statuses) : undefined;
  }, [statuses]);

  return (
    <AppView>
      <AppViewHeader
        title={individual.name}
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
      />
      <AppViewBody
        rail={<RecordRail concept={concept} individual={individual} />}
      >
        <Stack gap="xl">
          <RecordDetailsSection hydratedIndividual={hydratedIndividual} />
          <AppViewSection title={<Trans>Activity</Trans>}>
            <ActivityBlock />
          </AppViewSection>
        </Stack>
      </AppViewBody>
    </AppView>
  );
}
