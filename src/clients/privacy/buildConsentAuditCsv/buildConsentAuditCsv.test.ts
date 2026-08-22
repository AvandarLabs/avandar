import type { ConsentAuditEntry } from "@/models/privacy/ConsentAuditEntry/ConsentAuditEntry";

import { describe, expect, it } from "vitest";

import { buildConsentAuditCsv } from "./buildConsentAuditCsv";

const entry: ConsentAuditEntry.T = {
  id: "00000000-0000-4000-8000-000000000001" as ConsentAuditEntry.Id,
  timestamp: new Date("2026-07-27T12:00:00.000Z").getTime(),
  workspaceId: "workspace,one",
  userId: 'user"one',
  threadId: "thread\none",
  context: "user_message_text",
  decision: "approved",
  mode: "composite",
  detectedPii: ["email", 'quote"value', "line\nbreak"],
  detectedBias: [],
  sourceColumn: null,
  valueCount: 2,
  contentLengthChars: 10,
  warningShown: ["pii", "bias"],
  warningDismissed: [],
  suggestionUsed: false,
  patternLocale: "en",
  detectorVersion: "1.0.0",
  medicalTierTriggeredBy: null,
  typedConfirmationCorrect: null,
  ackTokenNonce: null,
};

describe("buildConsentAuditCsv", () => {
  it("quotes arrays, commas, quotes, and newlines like the legacy helper", () => {
    const entries = [entry] as const;

    expect(buildConsentAuditCsv(entries)).toBe(
      [
        "id,timestamp,workspaceId,userId,threadId,context,decision,mode,detectedPii,detectedBias,sourceColumn,valueCount,contentLengthChars,warningShown,warningDismissed,suggestionUsed,patternLocale,detectorVersion,medicalTierTriggeredBy,typedConfirmationCorrect,ackTokenNonce",
        '00000000-0000-4000-8000-000000000001,2026-07-27T12:00:00.000Z,"workspace,one","user""one","thread\none",user_message_text,approved,composite,"email|quote""value|line\nbreak","",,2,10,"pii|bias","",false,en,1.0.0,,,',
      ].join("\n"),
    );
  });
});
