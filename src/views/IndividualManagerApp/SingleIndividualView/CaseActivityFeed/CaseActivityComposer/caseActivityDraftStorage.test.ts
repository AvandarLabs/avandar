import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearCaseActivityDraft,
  loadCaseActivityDraft,
  saveCaseActivityDraft,
} from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityComposer/caseActivityDraftStorage";

const DRAFT = {
  type: "doc" as const,
  content: [{ type: "paragraph", content: [{ type: "text", text: "draft" }] }],
};

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("caseActivityDraftStorage", () => {
  it("saves, loads, and clears a draft per case", () => {
    saveCaseActivityDraft("w1", "i1", DRAFT);
    expect(loadCaseActivityDraft("w1", "i1")).toEqual(DRAFT);
    expect(loadCaseActivityDraft("w1", "i2")).toBeUndefined();
    clearCaseActivityDraft("w1", "i1");
    expect(loadCaseActivityDraft("w1", "i1")).toBeUndefined();
  });

  it("forgets the draft when the saved document has no text", () => {
    saveCaseActivityDraft("w1", "i1", DRAFT);
    saveCaseActivityDraft("w1", "i1", {
      type: "doc",
      content: [{ type: "paragraph" }],
    });
    expect(
      window.localStorage.getItem("ava:case-activity-draft:w1:i1"),
    ).toBeNull();
  });

  it("returns nothing instead of throwing when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadCaseActivityDraft("w1", "i1")).toBeUndefined();
  });

  it("ignores a stored value that is not a document", () => {
    window.localStorage.setItem(
      "ava:case-activity-draft:w1:i1",
      '{"type":"nope"}',
    );
    expect(loadCaseActivityDraft("w1", "i1")).toBeUndefined();
  });
});
