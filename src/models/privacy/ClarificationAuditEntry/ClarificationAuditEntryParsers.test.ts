import { describe, expect, it } from "vitest";
import { ClarificationAuditEntryParsers } from "./ClarificationAuditEntryParsers";
import type { ClarificationAuditEntry } from "./ClarificationAuditEntry";

const row: ClarificationAuditEntry.T = {
  id: "00000000-0000-4000-8000-000000000002" as ClarificationAuditEntry.Id,
  workspaceId: "workspace-1",
  threadId: null,
  timestamp: 1_700_000_000_000,
  turnNumber: 1,
  responseShape: "free_text",
  questionLengthChars: 20,
  rationaleProvided: false,
  optionsCount: null,
  outcome: "answered",
  biasReprompts: 0,
  timeToAnswerMs: 500,
  ledToSuccessfulSql: null,
  patternLocale: "en",
};

describe("ClarificationAuditEntryParsers", () => {
  it("round trips the Dexie row without changing it", () => {
    expect(
      ClarificationAuditEntryParsers.fromDBReadToModelRead(row),
    ).toEqual(row);
    expect(
      ClarificationAuditEntryParsers.fromModelInsertToDBInsert(row),
    ).toEqual(row);
  });
});
