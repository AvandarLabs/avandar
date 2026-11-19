import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import { recordClarificationShown } from "./recordClarificationShown";
import type { ChatClarifyRequest } from "$/types/chat.types";

const CLARIFICATION: ChatClarifyRequest = {
  question: "Which state do you mean?",
  responseShape: {
    kind: "fixed_options",
    options: ["Georgia", "Texas"],
    multi: false,
  },
  turnNumber: 2,
};

describe("recordClarificationShown", () => {
  beforeEach(async () => {
    await AvaDexie.DB.ClarificationAuditEntry.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("records the card's shape, question length, option count, and turn number", async () => {
    const auditId = await recordClarificationShown({
      workspaceId: "workspace-1",
      clarification: CLARIFICATION,
    });

    expect(await AvaDexie.DB.ClarificationAuditEntry.toArray()).toEqual([
      expect.objectContaining({
        id: auditId,
        workspaceId: "workspace-1",
        responseShape: "fixed_options_single",
        questionLengthChars: 24,
        optionsCount: 2,
        turnNumber: 2,
      }),
    ]);
  });

  it("warns with the hit labels on a biased question and still records it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const auditId = await recordClarificationShown({
      workspaceId: "workspace-1",
      clarification: {
        ...CLARIFICATION,
        question: "women are always more careful with money",
      },
    });

    expect(warn).toHaveBeenCalledWith(
      "[chat] LLM clarification trips bias detector; passing through:",
      ["Gender generalization"],
    );
    expect(auditId).toEqual(expect.any(String));
  });

  it("returns an id when the audit write fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(AvaDexie.DB.ClarificationAuditEntry, "add").mockRejectedValueOnce(
      new Error("write failed"),
    );

    const auditId = await recordClarificationShown({
      workspaceId: "workspace-1",
      clarification: CLARIFICATION,
    });

    expect(auditId).toEqual(expect.any(String));
  });
});
