import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearCaseActivityDraft,
  clearCaseActivityDraftIfUnchanged,
  loadCaseActivityDraft,
  saveCaseActivityDraft,
} from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityComposer/caseActivityDraftStorage";

const CASE_ONE = { userId: "u1", workspaceId: "w1", individualId: "i1" };
const CASE_TWO = { ...CASE_ONE, individualId: "i2" };

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
    saveCaseActivityDraft(CASE_ONE, DRAFT);
    expect(loadCaseActivityDraft(CASE_ONE)).toEqual(DRAFT);
    expect(loadCaseActivityDraft(CASE_TWO)).toBeUndefined();
    clearCaseActivityDraft(CASE_ONE);
    expect(loadCaseActivityDraft(CASE_ONE)).toBeUndefined();
  });

  it("keeps each member's draft for the same case apart", () => {
    saveCaseActivityDraft(CASE_ONE, DRAFT);
    expect(
      window.localStorage.getItem("ava:case-activity-draft:u1:w1:i1"),
    ).not.toBeNull();
    expect(
      loadCaseActivityDraft({ ...CASE_ONE, userId: "u2" }),
    ).toBeUndefined();
  });

  it("forgets the draft when the saved document has no text", () => {
    saveCaseActivityDraft(CASE_ONE, DRAFT);
    saveCaseActivityDraft(CASE_ONE, {
      type: "doc",
      content: [{ type: "paragraph" }],
    });
    expect(
      window.localStorage.getItem("ava:case-activity-draft:u1:w1:i1"),
    ).toBeNull();
  });

  it("clears the draft only while it still holds the posted update", () => {
    const newerDraft = {
      type: "doc" as const,
      content: [
        { type: "paragraph", content: [{ type: "text", text: "newer" }] },
      ],
    };
    saveCaseActivityDraft(CASE_ONE, newerDraft);
    clearCaseActivityDraftIfUnchanged(CASE_ONE, DRAFT);
    expect(loadCaseActivityDraft(CASE_ONE)).toEqual(newerDraft);
    clearCaseActivityDraftIfUnchanged(CASE_ONE, newerDraft);
    expect(loadCaseActivityDraft(CASE_ONE)).toBeUndefined();
  });

  it("returns nothing instead of throwing when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadCaseActivityDraft(CASE_ONE)).toBeUndefined();
  });

  it("ignores a stored value that is not a document", () => {
    window.localStorage.setItem(
      "ava:case-activity-draft:u1:w1:i1",
      '{"type":"nope"}',
    );
    expect(loadCaseActivityDraft(CASE_ONE)).toBeUndefined();
  });
});
