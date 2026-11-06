import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@/test-utils";
import { loadCaseActivityDraft } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityComposer/caseActivityDraftStorage";
import { useCaseActivityDraft } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityComposer/useCaseActivityDraft";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument";
import type { Workspace } from "$/models/Workspace/Workspace";

function _document(text: string): RichTextDocument.T {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

function _renderDraft() {
  return renderHook(() => {
    return useCaseActivityDraft("w1" as Workspace.Id, "i1" as Individual.Id);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

describe("useCaseActivityDraft", () => {
  it("waits for typing to pause before saving the draft", () => {
    const { result } = _renderDraft();
    act(() => {
      result.current.saveDraft(_document("first"));
      result.current.saveDraft(_document("first words"));
    });
    expect(loadCaseActivityDraft("w1", "i1")).toBeUndefined();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(loadCaseActivityDraft("w1", "i1")).toEqual(_document("first words"));
  });

  it("saves a pending draft when the composer goes away", () => {
    const { result, unmount } = _renderDraft();
    act(() => {
      result.current.saveDraft(_document("half a thought"));
    });
    unmount();
    expect(loadCaseActivityDraft("w1", "i1")).toEqual(
      _document("half a thought"),
    );
  });

  it("forgets the draft once the update it holds is posted", () => {
    const { result } = _renderDraft();
    act(() => {
      result.current.saveDraft(_document("posted"));
      result.current.clearPostedDraft(_document("posted"));
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(loadCaseActivityDraft("w1", "i1")).toBeUndefined();
  });
});
