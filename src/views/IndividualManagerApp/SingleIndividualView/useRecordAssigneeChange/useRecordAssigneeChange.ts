import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { Logger } from "@/utils/Logger";
import { notifyError } from "@/utils/notifications/notify";
import { invalidateCaseStatusQueries } from "@/views/IndividualManagerApp/invalidateCaseStatusQueries/invalidateCaseStatusQueries";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { User } from "$/models/User/User";

/** The hint the assignment trigger raises for a non-editor. */
const RECORDS_EDITOR_REQUIRED_HINT = "case_records_editor_required";

/** The hint the assignment trigger raises for a non-member assignee. */
const ASSIGNEE_NOT_IN_WORKSPACE_HINT = "assignee_not_in_workspace";

type RecordAssigneeChange = {
  /** The assignee to show. Empty while an unassign is being saved. */
  displayedAssigneeId: string | undefined;
  /** Whether a change is being saved. Picks are ignored until it settles. */
  isSaving: boolean;
  /** Assigns the record to a member, or to no one when given `undefined`. */
  changeAssignee: (userId: User.Id | undefined) => void;
};

/** Reads the database hint off a failed write, without any of its copy. */
function _hint(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "hint" in error) {
    const hint = error.hint;
    return typeof hint === "string" ? hint : undefined;
  }
  return undefined;
}

/**
 * Changes a record's assignee the moment the user picks one.
 *
 * The picked member shows at once, and further picks are ignored until it is
 * saved. On success every view that shows the record's assignment is
 * refreshed, including the route loader that holds this record, and the
 * record's own value takes over again. On failure the record goes back to
 * the assignee it had and a toast says so, without the database's own
 * message.
 *
 * The pending value is three-state: a member's id means that member is being
 * saved, `null` means an unassign is being saved, and `undefined` means
 * nothing is in flight.
 *
 * @param individual The record, as the route loader read it.
 */
export function useRecordAssigneeChange(
  individual: Individual.T,
): RecordAssigneeChange {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [pendingAssignee, setPendingAssignee] = useState<
    User.Id | null | undefined
  >();
  const [updateIndividual, isUpdatePending] = IndividualClient.useUpdate({
    onSuccess: async () => {
      await invalidateCaseStatusQueries({
        queryClient,
        router,
        conceptId: individual.conceptId,
        change: "recordAssignment",
      });
      setPendingAssignee(undefined);
    },
    onError: (error) => {
      Logger.error(error, { devMsg: "Changing a record's assignee failed" });
      setPendingAssignee(undefined);
      const hint = _hint(error);
      notifyError({
        title: t`Assignment not changed`,
        message:
          hint === RECORDS_EDITOR_REQUIRED_HINT
            ? t`You need Case Records editor access to assign a record.`
            : hint === ASSIGNEE_NOT_IN_WORKSPACE_HINT
              ? t`That person is not a member of this workspace.`
              : t`The record keeps its previous assignee. Try again in a moment.`,
      });
    },
  });
  const displayedAssigneeId =
    pendingAssignee === undefined
      ? individual.assignedTo
      : (pendingAssignee ?? undefined);
  // The pending value stays set until the post-save refresh finishes, so it
  // also covers the moment after the write settles.
  const isSaving = isUpdatePending || pendingAssignee !== undefined;

  return {
    displayedAssigneeId,
    isSaving,
    changeAssignee: (userId) => {
      // One save at a time: a second pick could otherwise land out of order
      // and the first save's outcome would clear the second's pending state.
      if (isSaving || userId === displayedAssigneeId) {
        return;
      }
      setPendingAssignee(userId ?? null);
      updateIndividual({ id: individual.id, data: { assignedTo: userId } });
    },
  };
}
