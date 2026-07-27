import { describe, expect, it } from "vitest";
import { ConsentAuditEntryParsers } from "./ConsentAuditEntryParsers";
import type { ConsentAuditEntry } from "./ConsentAuditEntry";

const row: ConsentAuditEntry.T = {
  id: "00000000-0000-4000-8000-000000000001" as ConsentAuditEntry.Id,
  workspaceId: "workspace-1",
  userId: "user-1",
  threadId: null,
  timestamp: 1_700_000_000_000,
  decision: "approved",
  context: "user_message_text",
  mode: "clean",
  detectedPii: [],
  detectedBias: [],
  sourceColumn: null,
  valueCount: 1,
  contentLengthChars: 12,
  warningShown: [],
  warningDismissed: [],
  suggestionUsed: null,
  patternLocale: "en",
  detectorVersion: "1.0.0",
  medicalTierTriggeredBy: null,
  typedConfirmationCorrect: null,
  ackTokenNonce: null,
};

describe("ConsentAuditEntryParsers", () => {
  it("round trips the Dexie row without changing it", () => {
    expect(ConsentAuditEntryParsers.fromDBReadToModelRead(row)).toEqual(row);
    expect(ConsentAuditEntryParsers.fromModelInsertToDBInsert(row)).toEqual(
      row,
    );
  });
});
