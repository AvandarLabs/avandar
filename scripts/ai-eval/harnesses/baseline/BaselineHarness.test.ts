import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildBaselineTryAgainTurn,
  createBaselineHarness,
} from "./BaselineHarness";
import type { EvalQuestion } from "../../EvalQuestion";
import type { EvalDatabase } from "../../runtime/EvalDatabase";
import type { DenoChatTurn, DenoChatTurnResponse } from "./DenoChatTurnRunner";

const { runTurnMock, runEvalSqlMock } = vi.hoisted(() => {
  return { runTurnMock: vi.fn(), runEvalSqlMock: vi.fn() };
});

vi.mock("./DenoChatTurnRunner", () => {
  return {
    DenoChatTurnRunner: class {
      runTurn = runTurnMock;
      close(): void {}
    },
  };
});

vi.mock("../../runtime/runEvalSql", () => {
  return { runEvalSql: runEvalSqlMock };
});

const QUESTION = [
  { role: "user", content: "Which state had the most covid?" },
] as const;

describe("buildBaselineTryAgainTurn", () => {
  it("drops the trailing assistant message, as assistant-ui does", () => {
    const turn = buildBaselineTryAgainTurn({
      messages: [...QUESTION, { role: "assistant", content: "California." }],
      lastResult: { assistantText: "California." },
    });

    expect(turn.messages).toEqual(QUESTION);
  });

  it("describes the last response's SQL", () => {
    const turn = buildBaselineTryAgainTurn({
      messages: QUESTION,
      lastResult: { assistantText: "", generatedSql: { sql: "SELECT 1" } },
    });

    expect(turn.retryContext).toEqual({ priorGeneratedSql: "SELECT 1" });
  });

  it("describes the last response's card question", () => {
    const turn = buildBaselineTryAgainTurn({
      messages: QUESTION,
      lastResult: {
        assistantText: "Which one?",
        clarification: { question: "Deaths or cases?" },
      },
    });

    expect(turn.retryContext).toEqual({
      priorAssistantText: "Which one?",
      priorClarificationQuestion: "Deaths or cases?",
    });
  });

  it("describes the last response's block kind", () => {
    const turn = buildBaselineTryAgainTurn({
      messages: QUESTION,
      lastResult: {
        assistantText: "",
        dashboardBlock: { kind: "HeadingBlock" },
      },
    });

    expect(turn.retryContext).toEqual({
      priorDashboardBlockKind: "HeadingBlock",
    });
  });

  it("sends no retry context when the last call failed", () => {
    const turn = buildBaselineTryAgainTurn({
      messages: QUESTION,
      lastResult: undefined,
    });

    expect(turn.retryContext).toBeUndefined();
  });
});

const TRY_AGAIN_QUESTION: EvalQuestion = {
  id: "T02",
  category: "try_again",
  prompt: "How many people died of covid in the US in total?",
  clarification: "not_needed",
  user: { choose: /state/i },
  truth: {},
  grade: () => {
    return { pass: true, detail: "ok" };
  },
  tryAgain: {},
};

const CARD_RESPONSE: DenoChatTurnResponse = {
  result: {
    assistantText: "Which Georgia?",
    clarification: {
      question: "The state or the country?",
      responseShape: {
        kind: "fixed_options",
        options: ["The US state", "The country"],
        multi: false,
      },
    },
  },
  latencyMs: 1,
};

function _sqlResponse(sql: string): DenoChatTurnResponse {
  return {
    result: { assistantText: "Here it is.", generatedSql: { sql } },
    latencyMs: 1,
  };
}

describe("the baseline conversation on a Try again question", () => {
  const sentTurns: DenoChatTurn[] = [];

  /** Answers each model call in turn, keeping a copy of what was sent. */
  function _respondWith(responses: readonly DenoChatTurnResponse[]): void {
    runTurnMock.mockReset().mockImplementation(async (turn: DenoChatTurn) => {
      sentTurns.push(JSON.parse(JSON.stringify(turn)));
      return responses[sentTurns.length - 1];
    });
  }

  function _ask(question: EvalQuestion) {
    return createBaselineHarness({
      repoRoot: "/repo",
      openRouterApiKey: "key",
      database: {} as EvalDatabase,
      model: "anthropic/claude-haiku-5.5",
    })
      .startConversation()
      .ask(question);
  }

  beforeEach(() => {
    sentTurns.length = 0;
    runEvalSqlMock.mockReset().mockResolvedValue({
      kind: "rows",
      result: { columns: [{ name: "value", type: "BIGINT" }], rows: [[42]] },
    });
  });

  it("sends the retry context on the second attempt's first call only", async () => {
    _respondWith([_sqlResponse("SELECT 1"), _sqlResponse("SELECT 2")]);

    await _ask(TRY_AGAIN_QUESTION);

    expect(
      sentTurns.map((turn) => {
        return turn.retryContext;
      }),
    ).toEqual([
      undefined,
      { priorAssistantText: "Here it is.", priorGeneratedSql: "SELECT 1" },
    ]);
  });

  it("asks the second attempt on the thread without the first reply", async () => {
    _respondWith([_sqlResponse("SELECT 1"), _sqlResponse("SELECT 2")]);

    await _ask(TRY_AGAIN_QUESTION);

    expect(sentTurns[1]!.messages).toEqual([
      { role: "user", content: TRY_AGAIN_QUESTION.prompt },
    ]);
  });

  it("returns the second attempt, with the first beside it", async () => {
    _respondWith([_sqlResponse("SELECT 1"), _sqlResponse("SELECT 2")]);

    const answer = await _ask(TRY_AGAIN_QUESTION);

    expect(answer.finalSql).toBe("SELECT 2");
    expect(answer.firstAttempt?.finalSql).toBe("SELECT 1");
    expect(answer.firstAttempt).not.toHaveProperty("result");
  });

  it("counts both attempts' model calls in the question's usage", async () => {
    const usage = {
      calls: 1,
      promptTokens: 10,
      cachedPromptTokens: 0,
      completionTokens: 2,
      reasoningTokens: 0,
      cost: 0.001,
    };
    _respondWith([
      { ..._sqlResponse("SELECT 1"), usage },
      { ..._sqlResponse("SELECT 2"), usage },
    ]);

    const answer = await _ask(TRY_AGAIN_QUESTION);

    expect(answer.usage.calls).toBe(2);
    expect(answer.firstAttempt?.usage.calls).toBe(1);
  });

  it("ends the first attempt at a card it leaves unanswered", async () => {
    _respondWith([CARD_RESPONSE, _sqlResponse("SELECT 2")]);

    const answer = await _ask({
      ...TRY_AGAIN_QUESTION,
      tryAgain: { isFirstCardUnanswered: true },
    });

    expect(answer.firstAttempt?.clarifications).toEqual([
      {
        kind: "fixed_options",
        question: "The state or the country?",
        answer: "(unanswered)",
        isAutomatic: false,
      },
    ]);
    expect(sentTurns[1]!.messages).toEqual([
      { role: "user", content: TRY_AGAIN_QUESTION.prompt },
    ]);
    expect(sentTurns[1]!.retryContext).toEqual({
      priorAssistantText: "Which Georgia?",
      priorClarificationQuestion: "The state or the country?",
    });
  });

  it("sends no retry context after the second attempt's card is answered", async () => {
    _respondWith([
      _sqlResponse("SELECT 1"),
      CARD_RESPONSE,
      _sqlResponse("SELECT 3"),
    ]);

    const answer = await _ask(TRY_AGAIN_QUESTION);

    expect(sentTurns[2]!.retryContext).toBeUndefined();
    expect(answer.clarifications[0]?.question).toBe(
      "The state or the country?",
    );
  });
});
