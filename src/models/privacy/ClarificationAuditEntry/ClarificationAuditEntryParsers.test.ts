import { describe, expect, it } from "vitest";
import { ClarificationAuditEntry } from "./ClarificationAuditEntry";
import { ClarificationAuditEntryParsers } from "./ClarificationAuditEntryParsers";

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
  it("validates the runtime clarification audit literal unions", () => {
    expect(ClarificationAuditEntry.isValidClarificationOutcome("answered")).toBe(
      true,
    );
    expect(
      ClarificationAuditEntry.isValidClarificationResponseShapeLabel(
        "free_text",
      ),
    ).toBe(true);
    expect(ClarificationAuditEntry.isValidClarificationOutcome("invalid")).toBe(
      false,
    );
  });

  it("round trips the Dexie row without changing it", () => {
    expect(ClarificationAuditEntryParsers.fromDBReadToModelRead(row)).toEqual(
      row,
    );
    expect(
      ClarificationAuditEntryParsers.fromModelInsertToDBInsert(row),
    ).toEqual(row);
  });
});
