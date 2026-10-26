import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { Logger } from "@/utils/Logger";
import { notifyError } from "@/utils/notifications/notify";
import { invalidateCaseStatusQueries } from "@/views/IndividualManagerApp/invalidateCaseStatusQueries/invalidateCaseStatusQueries";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Individual } from "$/models/ontology/Individual/Individual";

/** The hint the status-change trigger raises for a non-editor. */
const RECORDS_EDITOR_REQUIRED_HINT = "case_records_editor_required";

type RecordStatusChange = {
  /** The status to show: the one being saved while a save is in flight. */
  displayedStatusId: ConceptStatus.Id;
  changeStatus: (statusId: ConceptStatus.Id) => void;
};

function _isRecordsEditorRequired(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "hint" in error &&
    error.hint === RECORDS_EDITOR_REQUIRED_HINT
  );
}

/**
 * Changes a record's status the moment the user picks one.
 *
 * The picked status shows at once. On success every view of the case type's
 * statuses is refreshed, including the route loader that holds this record,
 * and the record's own value takes over again. On failure the record goes
 * back to the status it had and a toast says so, without the database's own
 * message.
 *
 * @param individual The record, as the route loader read it.
 */
export function useRecordStatusChange(
  individual: Individual.T,
): RecordStatusChange {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [pendingStatusId, setPendingStatusId] = useState<
    ConceptStatus.Id | undefined
  >();
  const [updateIndividual] = IndividualClient.useUpdate({
    onSuccess: async () => {
      await invalidateCaseStatusQueries({
        queryClient,
        router,
        conceptId: individual.conceptId,
        change: "recordStatus",
      });
      setPendingStatusId(undefined);
    },
    onError: (error) => {
      Logger.error(error, { devMsg: "Changing a record's status failed" });
      setPendingStatusId(undefined);
      notifyError({
        title: t`Status not changed`,
        message: _isRecordsEditorRequired(error)
          ? t`You need Case Records editor access to change a record's status.`
          : t`The record keeps its previous status. Try again in a moment.`,
      });
    },
  });
  const displayedStatusId = pendingStatusId ?? individual.statusId;

  return {
    displayedStatusId,
    changeStatus: (statusId) => {
      if (statusId === displayedStatusId) {
        return;
      }
      setPendingStatusId(statusId);
      updateIndividual({ id: individual.id, data: { statusId } });
    },
  };
}
