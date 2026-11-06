import { useEffect, useMemo, useRef } from "react";
import {
  clearCaseActivityDraftIfUnchanged,
  loadCaseActivityDraft,
  saveCaseActivityDraft,
} from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityComposer/caseActivityDraftStorage";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument";
import type { Workspace } from "$/models/Workspace/Workspace";

/** How long typing must pause before the draft is written. */
const SAVE_DELAY_MS = 300;

type PendingDraft = {
  workspaceId: Workspace.Id;
  individualId: Individual.Id;
  document: RichTextDocument.T;
};

type CaseActivityDraft = {
  initialDraft: RichTextDocument.T | undefined;
  /** Writes the draft once typing pauses, or when the composer goes away. */
  saveDraft: (document: RichTextDocument.T) => void;
  /** Forgets the draft if it still holds the update that was just posted. */
  clearPostedDraft: (postedDocument: RichTextDocument.T) => void;
};

/** The case's unsent update on this device, saved as the member types. */
export function useCaseActivityDraft(
  workspaceId: Workspace.Id,
  individualId: Individual.Id,
): CaseActivityDraft {
  const initialDraft = useMemo(() => {
    return loadCaseActivityDraft(workspaceId, individualId);
  }, [workspaceId, individualId]);
  // The pending draft carries its own case, so a flush that runs after a
  // case switch still writes it to the case it was typed in.
  const pendingDraftRef = useRef<PendingDraft | undefined>(undefined);
  const timerRef = useRef<number | undefined>(undefined);

  const flushDraft = useMemo(() => {
    return () => {
      window.clearTimeout(timerRef.current);
      const pendingDraft = pendingDraftRef.current;
      pendingDraftRef.current = undefined;
      if (pendingDraft) {
        saveCaseActivityDraft(
          pendingDraft.workspaceId,
          pendingDraft.individualId,
          pendingDraft.document,
        );
      }
    };
  }, []);

  useEffect(() => {
    return flushDraft;
  }, [flushDraft, workspaceId, individualId]);

  return {
    initialDraft,
    saveDraft: (document) => {
      pendingDraftRef.current = { workspaceId, individualId, document };
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(flushDraft, SAVE_DELAY_MS);
    },
    clearPostedDraft: (postedDocument) => {
      flushDraft();
      clearCaseActivityDraftIfUnchanged(
        workspaceId,
        individualId,
        postedDocument,
      );
    },
  };
}
