import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { ConceptStatusClient } from "@/clients/ontology/ConceptStatusClient";
import { Logger } from "@/utils/Logger";
import { notifySuccess } from "@/utils/notifications/notify";
import { invalidateCaseStatusQueries } from "@/views/IndividualManagerApp/invalidateCaseStatusQueries/invalidateCaseStatusQueries";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";

type SaveCaseTypeStatuses = {
  saveStatusSet: (payload: ConceptStatus.SavePayload) => void;
  isSaving: boolean;
  /** The last save's failure, until the next save or `resetSaveError`. */
  saveError: unknown;
  resetSaveError: () => void;
};

/**
 * Saves a case type's status set in one call, then refreshes every view of
 * its statuses and records.
 *
 * A failure is logged, not toasted: the Edit statuses form shows it as
 * translated copy above its Save button, next to what needs fixing.
 *
 * @param options.conceptId The case type.
 * @param options.onSaved Called after a save and its refresh succeed.
 */
export function useSaveCaseTypeStatuses(
  options: Readonly<{ conceptId: Concept.Id; onSaved: () => void }>,
): SaveCaseTypeStatuses {
  const { conceptId, onSaved } = options;
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [saveStatusSet, isSaving, mutation] =
    ConceptStatusClient.useSaveStatusSet({
      onSuccess: async () => {
        await invalidateCaseStatusQueries({
          queryClient,
          router,
          conceptId,
          change: "statusSet",
        });
        notifySuccess(t`Statuses saved`);
        onSaved();
      },
      onError: (error) => {
        Logger.error(error, { devMsg: "Saving case type statuses failed" });
      },
    });

  return {
    saveStatusSet,
    isSaving,
    saveError: mutation.error ?? undefined,
    resetSaveError: mutation.reset,
  };
}
