import { Modal } from "@avandar/ui";
import { where } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Skeleton } from "@mantine/core";
import { useMemo } from "react";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import { ConceptStatusClient } from "@/clients/ontology/ConceptStatusClient";
import { EditStatusesForm } from "@/views/OntologyDesignerApp/ConceptMetaView/EditStatusesModal/EditStatusesForm/EditStatusesForm";
import { useSaveCaseTypeStatuses } from "@/views/OntologyDesignerApp/ConceptMetaView/EditStatusesModal/useSaveCaseTypeStatuses";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ReactNode } from "react";

type Props = {
  concept: Concept.T;
  opened: boolean;
  onClose: () => void;
};

/**
 * Edits a case type's statuses in a modal. The form starts from the saved
 * set each time the modal opens, because the modal unmounts it on close.
 */
export function EditStatusesModal({
  concept,
  opened,
  onClose,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const [statuses] = ConceptStatusClient.useGetAll(
    where("concept_id", "eq", concept.id),
  );
  const [recordCounts] = ConceptStatusClient.useGetRecordCounts({
    conceptId: concept.id,
  });
  const { saveStatusSet, isSaving, saveError, resetSaveError } =
    useSaveCaseTypeStatuses({ conceptId: concept.id, onSaved: onClose });
  const savedStatuses = useMemo(() => {
    return statuses ? ConceptStatus.sortByPosition(statuses) : undefined;
  }, [statuses]);
  const onCloseModal = (): void => {
    resetSaveError();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onCloseModal}
      title={t`Edit statuses`}
      size="xl"
    >
      {savedStatuses && recordCounts ? (
        <EditStatusesForm
          conceptId={concept.id}
          savedStatuses={savedStatuses}
          defaultStatusId={concept.defaultStatusId}
          recordCounts={recordCounts}
          isSaving={isSaving}
          saveError={saveError}
          onCancel={onCloseModal}
          onSave={saveStatusSet}
        />
      ) : (
        <Skeleton height={160} radius="sm" />
      )}
    </Modal>
  );
}
