import {
  isRichTextDocument,
  richTextToPlainText,
} from "$/models/RichTextDocument/RichTextDocument";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument";

/**
 * Whose draft, for which case. Drafts are kept per member so two people
 * sharing a device never see each other's unsent updates.
 */
export type CaseActivityDraftScope = Readonly<{
  userId: string;
  workspaceId: string;
  individualId: string;
}>;

function _buildDraftKey(scope: CaseActivityDraftScope): string {
  return `ava:case-activity-draft:${scope.userId}:${scope.workspaceId}:${scope.individualId}`;
}

/** The member's unsent update for a case on this device, if any. */
export function loadCaseActivityDraft(
  scope: CaseActivityDraftScope,
): RichTextDocument.T | undefined {
  try {
    const storedValue = window.localStorage.getItem(_buildDraftKey(scope));
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
 * Keeps the member's unsent update for a case on this device, or forgets it
 * once the document has no text left.
 */
export function saveCaseActivityDraft(
  scope: CaseActivityDraftScope,
  document: RichTextDocument.T,
): void {
  if (richTextToPlainText(document) === "") {
    clearCaseActivityDraft(scope);
    return;
  }
  try {
    window.localStorage.setItem(
      _buildDraftKey(scope),
      JSON.stringify(document),
    );
  } catch {
    // Storage can be full or blocked; a lost draft is better than a crash.
  }
}

/** Forgets the member's unsent update for a case after it is posted. */
export function clearCaseActivityDraft(scope: CaseActivityDraftScope): void {
  try {
    window.localStorage.removeItem(_buildDraftKey(scope));
  } catch {
    // Storage can be blocked; see saveCaseActivityDraft.
  }
}

/**
 * Forgets the case's draft only if it still holds `postedDocument`, so a
 * newer draft written after the post started survives.
 */
export function clearCaseActivityDraftIfUnchanged(
  scope: CaseActivityDraftScope,
  postedDocument: RichTextDocument.T,
): void {
  const storedDraft = loadCaseActivityDraft(scope);
  if (
    storedDraft !== undefined &&
    JSON.stringify(storedDraft) !== JSON.stringify(postedDocument)
  ) {
    return;
  }
  clearCaseActivityDraft(scope);
}
