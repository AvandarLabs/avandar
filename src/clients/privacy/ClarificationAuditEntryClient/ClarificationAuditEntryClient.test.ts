import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import { ClarificationAuditEntryParsers } from "@/models/privacy/ClarificationAuditEntry/ClarificationAuditEntryParsers";
import { ClarificationAuditEntryClient } from "./ClarificationAuditEntryClient";
import type { ClarificationAuditEntry } from "@/models/privacy/ClarificationAuditEntry/ClarificationAuditEntry";
import type { ChatClarifyRequest } from "$/types/chat.types";

const NOW = new Date("2026-07-27T12:00:00.000Z").getTime();

function _createRequest(
  overrides: Partial<ChatClarifyRequest> = {},
): ChatClarifyRequest {
  return {
    question: "Which region should the report cover?",
    rationale: "The report needs a region.",
    responseShape: {
      kind: "fixed_options",
      options: ["North", "South"],
      multi: false,
    },
    turnNumber: 1,
    ...overrides,
  };
}

function _createEntry(
  overrides: Partial<ClarificationAuditEntry.T> = {},
): ClarificationAuditEntry.T {
  return {
    id: crypto.randomUUID() as ClarificationAuditEntry.Id,
    workspaceId: "workspace-1",
    threadId: null,
    timestamp: NOW,
    turnNumber: 1,
    responseShape: "free_text",
    questionLengthChars: 20,
    rationaleProvided: false,
    optionsCount: null,
    outcome: "answered",
    biasReprompts: 0,
    timeToAnswerMs: null,
    ledToSuccessfulSql: null,
    patternLocale: "en",
    ...overrides,
  };
}

describe("ClarificationAuditEntryClient", () => {
  beforeEach(async () => {
    await AvaDexie.DB.ClarificationAuditEntry.clear();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("records fixed-option request metadata", async () => {
    const parserSpy = vi.spyOn(
      ClarificationAuditEntryParsers,
      "fromModelInsertToDBInsert",
    );

    await ClarificationAuditEntryClient.recordShown({
      workspaceId: "workspace-1",
      threadId: "thread-1",
      request: _createRequest(),
    });

    expect(await AvaDexie.DB.ClarificationAuditEntry.toArray()).toEqual([
      expect.objectContaining({
        workspaceId: "workspace-1",
        threadId: "thread-1",
        responseShape: "fixed_options_single",
        optionsCount: 2,
        questionLengthChars: 37,
        rationaleProvided: true,
        timestamp: NOW,
      }),
    ]);
    expect(parserSpy).toHaveBeenCalledOnce();
  });

  it("records discovery requests with an unknown option count", async () => {
    await ClarificationAuditEntryClient.recordShown({
      workspaceId: "workspace-1",
      request: _createRequest({
        responseShape: {
          kind: "discovery",
          query: "select distinct region from sales",
          column: "region",
          multi: true,
          candidateValues: ["North"],
        },
      }),
    });

    expect(await AvaDexie.DB.ClarificationAuditEntry.toArray()).toEqual([
      expect.objectContaining({
        responseShape: "discovery_multi",
        optionsCount: null,
      }),
    ]);
  });

  it("settles an outcome with elapsed answer time", async () => {
    const id = await ClarificationAuditEntryClient.recordShown({
      workspaceId: "workspace-1",
      request: _createRequest(),
    });
    vi.setSystemTime(NOW + 500);
    const parserSpy = vi.spyOn(
      ClarificationAuditEntryParsers,
      "fromModelUpdateToDBUpdate",
    );

    await ClarificationAuditEntryClient.recordOutcome({
      id,
      outcome: "cancelled",
    });

    expect(await AvaDexie.DB.ClarificationAuditEntry.get(id)).toMatchObject({
      outcome: "cancelled",
      timeToAnswerMs: 500,
    });
    expect(parserSpy).toHaveBeenCalledWith({
      outcome: "cancelled",
      timeToAnswerMs: 500,
    });
  });

  it("settles an unknown pending entry without elapsed answer time", async () => {
    const id = crypto.randomUUID() as ClarificationAuditEntry.Id;
    await AvaDexie.DB.ClarificationAuditEntry.add(_createEntry({ id }));

    await ClarificationAuditEntryClient.recordOutcome({
      id,
      outcome: "cap_reached",
    });

    expect(await AvaDexie.DB.ClarificationAuditEntry.get(id)).toMatchObject({
      outcome: "cap_reached",
      timeToAnswerMs: null,
    });
  });

  it("lists only workspace entries with newest first", async () => {
    const parserSpy = vi.spyOn(
      ClarificationAuditEntryParsers,
      "fromDBReadToModelRead",
    );
    await AvaDexie.DB.ClarificationAuditEntry.bulkAdd([
      _createEntry({ timestamp: NOW - 1 }),
      _createEntry({ timestamp: NOW - 3 }),
      _createEntry({ timestamp: NOW - 2 }),
      _createEntry({ workspaceId: "workspace-2" }),
    ]);

    expect(
      (
        await ClarificationAuditEntryClient.listClarificationLog("workspace-1")
      ).map((entry) => {
        return entry.timestamp;
      }),
    ).toEqual([NOW - 1, NOW - 2, NOW - 3]);
    expect(parserSpy).toHaveBeenCalledTimes(3);
  });

  it("rejects invalid rows read from IndexedDB", async () => {
    await AvaDexie.DB.ClarificationAuditEntry.put({
      ..._createEntry(),
      outcome: "invalid",
    } as unknown as ClarificationAuditEntry.T);

    await expect(
      ClarificationAuditEntryClient.listClarificationLog("workspace-1"),
    ).rejects.toThrow("[ClarificationAuditEntry:DBReadSchema]");
  });

  it("does not reject when audit record or outcome writes fail", async () => {
    const recordWarning = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});
    const add = vi
      .spyOn(AvaDexie.DB.ClarificationAuditEntry, "add")
      .mockRejectedValueOnce(new Error("write failed"));

    const id = await ClarificationAuditEntryClient.recordShown({
      workspaceId: "workspace-1",
      request: _createRequest(),
    });

    const update = vi
      .spyOn(AvaDexie.DB.ClarificationAuditEntry, "update")
      .mockRejectedValueOnce(new Error("update failed"));
    await expect(
      ClarificationAuditEntryClient.recordOutcome({ id, outcome: "answered" }),
    ).resolves.toBeUndefined();

    expect(add).toHaveBeenCalledOnce();
    expect(id).toEqual(expect.any(String));
    expect(update).toHaveBeenCalledOnce();
    expect(recordWarning).toHaveBeenCalledTimes(2);
  });
});
