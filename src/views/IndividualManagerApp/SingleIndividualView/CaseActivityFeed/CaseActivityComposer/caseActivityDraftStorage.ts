import {
  isRichTextDocument,
  richTextToPlainText,
} from "$/models/RichTextDocument/RichTextDocument";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument";

function _buildDraftKey(workspaceId: string, individualId: string): string {
  return `ava:case-activity-draft:${workspaceId}:${individualId}`;
}

/** The unsent update for a case on this device, if any. */
export function loadCaseActivityDraft(
  workspaceId: string,
  individualId: string,
): RichTextDocument.T | undefined {
  try {
    const storedValue = window.localStorage.getItem(
      _buildDraftKey(workspaceId, individualId),
    );
    if (storedValue === null) {
      return undefined;
    }
    const parsedValue: unknown = JSON.parse(storedValue);
    return isRichTextDocument(parsedValue) ? parsedValue : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Keeps the unsent update for a case on this device, or forgets it once the
 * document has no text left.
 */
export function saveCaseActivityDraft(
  workspaceId: string,
  individualId: string,
  document: RichTextDocument.T,
): void {
  if (richTextToPlainText(document) === "") {
    clearCaseActivityDraft(workspaceId, individualId);
    return;
  }
  try {
    window.localStorage.setItem(
      _buildDraftKey(workspaceId, individualId),
      JSON.stringify(document),
    );
  } catch {
    // Storage can be full or blocked; a lost draft is better than a crash.
  }
}

/** Forgets the unsent update for a case after it is posted. */
export function clearCaseActivityDraft(
  workspaceId: string,
  individualId: string,
): void {
  try {
    window.localStorage.removeItem(_buildDraftKey(workspaceId, individualId));
  } catch {
    // Storage can be blocked; see saveCaseActivityDraft.
  }
}

/**
 * Forgets the case's draft only if it still holds `postedDocument`, so a
 * newer draft written after the post started survives.
 */
export function clearCaseActivityDraftIfUnchanged(
  workspaceId: string,
  individualId: string,
  postedDocument: RichTextDocument.T,
): void {
  const storedDraft = loadCaseActivityDraft(workspaceId, individualId);
  if (
    storedDraft !== undefined &&
    JSON.stringify(storedDraft) !== JSON.stringify(postedDocument)
  ) {
    return;
  }
  clearCaseActivityDraft(workspaceId, individualId);
}
