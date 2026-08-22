import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useState } from "react";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { applyCreatedCaseTypes } from "@/views/OntologyDesignerApp/applyCreatedCaseTypes/applyCreatedCaseTypes";
import { proposedCaseTypeToCreatedCaseType } from "@/views/OntologyDesignerApp/proposedCaseTypeToCreatedCaseType/proposedCaseTypeToCreatedCaseType";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ChatProposedCaseType } from "$/types/chat.types";

/**
 * Persists a reviewed draft through the same path the concept creator form
 * uses, and clears the card only once the insert succeeds so a failure leaves
 * the user's edits recoverable.
 */
export function useCaseTypeDraftCreation(workspaceId: Workspace.Id): {
  isCreating: boolean;
  createCaseType: (draft: ChatProposedCaseType) => Promise<void>;
} {
  const dispatch = ChatPanelStateManager.useDispatch();
  const [isCreating, setIsCreating] = useState(false);

  return {
    isCreating,
    createCaseType: async (draft) => {
      setIsCreating(true);
      try {
        await applyCreatedCaseTypes({
          caseTypes: [proposedCaseTypeToCreatedCaseType(draft)],
          workspaceId,
        });
        dispatch.setPendingCaseTypeDraft(undefined);
        notifySuccess(i18n._(msg`Created ${draft.name}`));
      } catch {
        notifyError({
          title: i18n._(msg`Could not create that case type`),
        });
      } finally {
        setIsCreating(false);
      }
    },
  };
}
