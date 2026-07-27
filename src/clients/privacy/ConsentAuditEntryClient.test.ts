import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import { ConsentAuditEntryClient } from "./ConsentAuditEntryClient";
import type { ConsentAuditEntry } from "@/models/privacy/ConsentAuditEntry/ConsentAuditEntry";

const NOW = new Date("2026-07-27T12:00:00.000Z").getTime();
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

function _createEntry(
  overrides: Partial<ConsentAuditEntry.T> = {},
): ConsentAuditEntry.T {
  return {
    id: crypto.randomUUID() as ConsentAuditEntry.Id,
    workspaceId: "workspace-1",
    userId: "user-1",
    threadId: null,
    timestamp: NOW,
    decision: "approved",
    context: "user_message_text",
    mode: "clean",
    detectedPii: [],
    detectedBias: [],
    sourceColumn: null,
    valueCount: 0,
    contentLengthChars: null,
    warningShown: [],
    warningDismissed: [],
    suggestionUsed: null,
    patternLocale: "en",
    detectorVersion: "1.0.0",
    medicalTierTriggeredBy: null,
    typedConfirmationCorrect: null,
    ackTokenNonce: null,
    ...overrides,
  };
}

describe("ConsentAuditEntryClient", () => {
  beforeEach(async () => {
    await AvaDexie.DB.ConsentAuditEntry.clear();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("records computed warnings and consent metadata", async () => {
    await ConsentAuditEntryClient.recordConsentDecision({
      workspaceId: "workspace-1",
      userId: "user-1",
      threadId: "thread-1",
      context: "user_message_text",
      decision: "cancelled",
      mode: "composite",
      detectedPii: ["email"],
      detectedBias: ["gender"],
      sourceColumn: "notes",
      valueCount: 3,
      contentLengthChars: 42,
      isMedical: true,
      typedConfirmationCorrect: false,
      ackTokenNonce: "nonce-1",
    });

    expect(await AvaDexie.DB.ConsentAuditEntry.toArray()).toEqual([
      expect.objectContaining({
        workspaceId: "workspace-1",
        userId: "user-1",
        threadId: "thread-1",
        timestamp: NOW,
        decision: "cancelled",
        context: "user_message_text",
        mode: "composite",
        detectedPii: ["email"],
        detectedBias: ["gender"],
        sourceColumn: "notes",
        valueCount: 3,
        contentLengthChars: 42,
        warningShown: ["pii", "bias", "medical"],
        warningDismissed: ["pii", "bias", "medical"],
        suggestionUsed: false,
        patternLocale: "en",
        detectorVersion: "1.0.0",
        medicalTierTriggeredBy: "column",
        typedConfirmationCorrect: false,
        ackTokenNonce: "nonce-1",
      }),
    ]);
  });

  it("excludes entries older than the default 90-day retention window", async () => {
    await AvaDexie.DB.ConsentAuditEntry.bulkAdd([
      _createEntry({ timestamp: NOW - 90 * DAY_IN_MILLISECONDS - 1 }),
      _createEntry({ timestamp: NOW - 90 * DAY_IN_MILLISECONDS + 1 }),
    ]);

    expect(await ConsentAuditEntryClient.listConsentLog()).toHaveLength(1);
  });

  it("composes workspace, context, and decision filters", async () => {
    await AvaDexie.DB.ConsentAuditEntry.bulkAdd([
      _createEntry({
        workspaceId: "workspace-1",
        context: "user_message_text",
        decision: "approved",
      }),
      _createEntry({
        workspaceId: "workspace-2",
        context: "user_message_text",
        decision: "approved",
      }),
      _createEntry({
        workspaceId: "workspace-1",
        context: "plan_step_input",
        decision: "approved",
      }),
      _createEntry({
        workspaceId: "workspace-1",
        context: "user_message_text",
        decision: "cancelled",
      }),
    ]);

    const entries = await ConsentAuditEntryClient.listConsentLog({
      workspaceId: "workspace-1",
      context: "user_message_text",
      decision: "approved",
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      workspaceId: "workspace-1",
      context: "user_message_text",
      decision: "approved",
    });
  });

  it("returns newest entries first", async () => {
    await AvaDexie.DB.ConsentAuditEntry.bulkAdd([
      _createEntry({ timestamp: NOW - 1 }),
      _createEntry({ timestamp: NOW - 3 }),
      _createEntry({ timestamp: NOW - 2 }),
    ]);

    expect(
      (await ConsentAuditEntryClient.listConsentLog()).map((entry) => {
        return entry.timestamp;
      }),
    ).toEqual([NOW - 1, NOW - 2, NOW - 3]);
  });

  it("clears every consent audit entry", async () => {
    await AvaDexie.DB.ConsentAuditEntry.bulkAdd([
      _createEntry(),
      _createEntry(),
    ]);

    await ConsentAuditEntryClient.clearConsentLog();

    expect(await AvaDexie.DB.ConsentAuditEntry.count()).toBe(0);
  });

  it("exposes usable query and mutation hooks", () => {
    expect(ConsentAuditEntryClient.useListConsentLog).toBeTypeOf("function");
    expect(ConsentAuditEntryClient.useRecordConsentDecision).toBeTypeOf(
      "function",
    );
    expect(ConsentAuditEntryClient.useClearConsentLog).toBeTypeOf("function");
  });
});
