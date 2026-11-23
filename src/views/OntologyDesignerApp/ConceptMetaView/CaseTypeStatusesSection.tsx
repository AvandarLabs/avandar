import { where } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Button, Skeleton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMemo } from "react";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import { ConceptStatusClient } from "@/clients/ontology/ConceptStatusClient";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { CaseTypeStatusList } from "@/views/OntologyDesignerApp/ConceptMetaView/CaseTypeStatusList/CaseTypeStatusList";
import { EditStatusesModal } from "@/views/OntologyDesignerApp/ConceptMetaView/EditStatusesModal/EditStatusesModal";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ReactNode } from "react";

type Props = {
  concept: Concept.T;
};

/**
 * The case type page's Statuses section. A Case Types editor gets an Edit
 * statuses action, which is hidden rather than disabled for everyone else.
 */
export function CaseTypeStatusesSection({
  concept,
}: Readonly<Props>): ReactNode {
  const canEditStatuses = useHasPermission("case_types__can_edit_case_type");
  const [isEditing, editing] = useDisclosure(false);
  const [statuses] = ConceptStatusClient.useGetAll(
    where("concept_id", "eq", concept.id),
  );
  const [recordCounts] = ConceptStatusClient.useGetRecordCounts({
    conceptId: concept.id,
  });
  const sortedStatuses = useMemo(() => {
    return statuses ? ConceptStatus.sortByPosition(statuses) : undefined;
  }, [statuses]);

  return (
    <AppViewSection
      title={<Trans>Statuses</Trans>}
      meta={sortedStatuses?.length}
      actions={
        canEditStatuses ? (
          <Button variant="default" size="compact-sm" onClick={editing.open}>
            <Trans>Edit statuses</Trans>
          </Button>
        ) : null
      }
    >
      {sortedStatuses ? (
        <CaseTypeStatusList
          statuses={sortedStatuses}
          defaultStatusId={concept.defaultStatusId}
          recordCounts={recordCounts}
        />
      ) : (
        <Skeleton height={96} radius="sm" />
      )}
      {canEditStatuses ? (
        <EditStatusesModal
          concept={concept}
          opened={isEditing}
          onClose={editing.close}
        />
      ) : null}
    </AppViewSection>
  );
}
