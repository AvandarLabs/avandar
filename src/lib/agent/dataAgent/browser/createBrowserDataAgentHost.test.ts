import { describe, expect, it, vi } from "vitest";
import { createBrowserDataAgentHost } from "./createBrowserDataAgentHost";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { BrowserDataAgentHostOptions } from "./createBrowserDataAgentHost";

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: vi.fn() } };
});

vi.mock(
  "@/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary",
  () => {
    return { decideIfDataCanCrossBoundary: vi.fn() };
  },
);

function _host(
  showQuestionCard: BrowserDataAgentHostOptions["showQuestionCard"],
) {
  return createBrowserDataAgentHost({
    workspaceId: "workspace-1" as Workspace.Id,
    userId: "user-1",
    showQuery: vi.fn(),
    showQuestionCard,
  });
}

describe("createBrowserDataAgentHost askUser", () => {
  it("ends the agent's turn only after the card is recorded and shown", async () => {
    let finishCard: (() => void) | undefined;
    let isSettled = false;
    const showQuestionCard = vi.fn(() => {
      return new Promise<void>((resolve) => {
        finishCard = resolve;
      });
    });

    const answer = _host(showQuestionCard)
      .askUser({
        question: "Which?",
        options: ["A", "B"],
        isMulti: false,
        kind: "choice",
      })
      .then((result) => {
        isSettled = true;
        return result;
      });
    await vi.waitFor(() => {
      expect(showQuestionCard).toHaveBeenCalled();
    });

    expect(isSettled).toBe(false);
    finishCard!();
    await expect(answer).resolves.toEqual({ kind: "deferred" });
  });

  it("shows an ask_user card with its options and no turn number", async () => {
    const showQuestionCard = vi.fn().mockResolvedValue(undefined);

    await _host(showQuestionCard).askUser({
      question: "Which?",
      options: ["A", "B"],
      optionLabels: ["Alpha", "Beta"],
      isMulti: true,
      kind: "choice",
    });

    expect(showQuestionCard).toHaveBeenCalledWith({
      question: "Which?",
      responseShape: {
        kind: "fixed_options",
        options: ["A", "B"],
        optionLabels: ["Alpha", "Beta"],
        multi: true,
      },
    });
  });

  it("shows a value card as a discovery card with no turn number", async () => {
    const showQuestionCard = vi.fn().mockResolvedValue(undefined);

    await _host(showQuestionCard).askUser({
      question: "Which county?",
      options: ["Kings"],
      isMulti: false,
      kind: "values",
      lookup: {
        listQuery: "SELECT DISTINCT x FROM t",
        column: "x",
        candidateValues: ["Kings"],
      },
    });

    expect(showQuestionCard).toHaveBeenCalledWith({
      question: "Which county?",
      responseShape: {
        kind: "discovery",
        query: "SELECT DISTINCT x FROM t",
        column: "x",
        multi: false,
        candidateValues: ["Kings"],
      },
    });
  });
});
