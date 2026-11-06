import { useEffect, useMemo, useRef } from "react";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import {
  clearCaseActivityDraftIfUnchanged,
  loadCaseActivityDraft,
  saveCaseActivityDraft,
} from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityComposer/caseActivityDraftStorage";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { CaseActivityDraftScope } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityComposer/caseActivityDraftStorage";

/** How long typing must pause before the draft is written. */
const SAVE_DELAY_MS = 300;

type PendingDraft = {
  scope: CaseActivityDraftScope;
  document: RichTextDocument.T;
};

type CaseActivityDraft = {
  initialDraft: RichTextDocument.T | undefined;
  /** Writes the draft once typing pauses, or when the composer goes away. */
  saveDraft: (document: RichTextDocument.T) => void;
  /** Forgets the draft if it still holds the update that was just posted. */
  clearPostedDraft: (postedDocument: RichTextDocument.T) => void;
};

/**
 * The signed-in member's unsent update for a case on this device, saved as
 * they type. Without a signed-in member nothing is loaded or saved.
 */
export function useCaseActivityDraft(
  workspaceId: Workspace.Id,
  individualId: Individual.Id,
): CaseActivityDraft {
  const userId = useCurrentUser()?.id;
  const scope = useMemo((): CaseActivityDraftScope | undefined => {
    return userId === undefined
      ? undefined
      : { userId, workspaceId, individualId };
  }, [userId, workspaceId, individualId]);
  const initialDraft = useMemo(() => {
    return scope === undefined ? undefined : loadCaseActivityDraft(scope);
  }, [scope]);
  // The pending draft carries its own scope, so a flush that runs after a
  // case switch still writes it to the case it was typed in.
  const pendingDraftRef = useRef<PendingDraft | undefined>(undefined);
  const timerRef = useRef<number | undefined>(undefined);

  const flushDraft = useMemo(() => {
    return () => {
      window.clearTimeout(timerRef.current);
      const pendingDraft = pendingDraftRef.current;
      pendingDraftRef.current = undefined;
      if (pendingDraft) {
        saveCaseActivityDraft(pendingDraft.scope, pendingDraft.document);
      }
    };
  }, []);

  useEffect(() => {
    return flushDraft;
  }, [flushDraft, scope]);

  return {
    initialDraft,
    saveDraft: (document) => {
      if (scope === undefined) {
        return;
      }
      pendingDraftRef.current = { scope, document };
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(flushDraft, SAVE_DELAY_MS);
    },
    clearPostedDraft: (postedDocument) => {
      flushDraft();
      if (scope !== undefined) {
        clearCaseActivityDraftIfUnchanged(scope, postedDocument);
      }
    },
  };
}
