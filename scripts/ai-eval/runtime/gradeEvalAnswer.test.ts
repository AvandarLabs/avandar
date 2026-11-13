import { describe, expect, it } from "vitest";
import { gradeEvalAnswer } from "./gradeEvalAnswer";
import type { EvalQuestion } from "../EvalQuestion";
import type { EvalAnswer } from "../harnesses/EvalHarness";

const NO_QUERY_QUESTION = {
  id: "M05",
  category: "mentions",
  prompt: "what does it show?",
  clarification: "allowed",
  truth: {},
  expectsNoQuery: true,
  grade: () => {
    return { pass: false, detail: "ran a query" };
  },
} as unknown as EvalQuestion;

function _createAnswer(overrides: Partial<EvalAnswer>): EvalAnswer {
  return {
    error: "Answered in text without running a query",
    assistantText: "",
    clarifications: [],
    consentPrompts: 0,
    valuesSentToModel: [],
    toolNames: [],
    usage: {
      calls: 1,
      promptTokens: 0,
      cachedPromptTokens: 0,
      completionTokens: 0,
      reasoningTokens: 0,
      cost: 0,
    },
    latencyMs: 0,
    ...overrides,
  };
}

describe("gradeEvalAnswer with expectsNoQuery", () => {
  it("passes a text answer that says it cannot see the gadget", () => {
    const graded = gradeEvalAnswer(
      NO_QUERY_QUESTION,
      _createAnswer({ assistantText: "I can't see that dashboard." }),
      {},
    );

    expect(graded.pass).toBe(true);
  });

  it("fails a text answer that does not say it cannot see it", () => {
    const graded = gradeEvalAnswer(
      NO_QUERY_QUESTION,
      _createAnswer({ assistantText: "It shows deaths by month." }),
      {},
    );

    expect(graded.pass).toBe(false);
  });

  it("fails a text answer that states a number", () => {
    const graded = gradeEvalAnswer(
      NO_QUERY_QUESTION,
      _createAnswer({
        assistantText: "I cannot see it, but it likely shows 1,200 deaths.",
      }),
      {},
    );

    expect(graded.pass).toBe(false);
  });

  it("ignores the digits of a value placeholder", () => {
    const graded = gradeEvalAnswer(
      NO_QUERY_QUESTION,
      _createAnswer({
        assistantText: "I cannot see it, so I cannot tell about <value 1>.",
      }),
      {},
    );

    expect(graded.pass).toBe(true);
  });

  it("fails a schema answer that showed a query", () => {
    const graded = gradeEvalAnswer(
      {
        ...NO_QUERY_QUESTION,
        expectsNoQuery: false,
        gradeText: () => {
          return { pass: true, detail: "text was fine" };
        },
      },
      _createAnswer({
        finalSql: "SELECT 1",
        error: undefined,
        assistantText: "The columns differ.",
        result: { columns: [{ name: "x", type: "int" }], rows: [[1]] },
      }),
      {},
    );

    expect(graded.pass).toBe(false);
    expect(graded.detail).toBe("showed a query for a schema question");
  });

  it("grades a schema answer from its text when no query was shown", () => {
    const graded = gradeEvalAnswer(
      {
        ...NO_QUERY_QUESTION,
        expectsNoQuery: false,
        gradeText: () => {
          return { pass: true, detail: "named the differing columns" };
        },
      },
      _createAnswer({
        assistantText: "They cannot be stacked as they are.",
      }),
      {},
    );

    expect(graded.pass).toBe(true);
    expect(graded.detail).toBe("named the differing columns");
  });

  it("fails an answer that ran a query", () => {
    const graded = gradeEvalAnswer(
      NO_QUERY_QUESTION,
      _createAnswer({
        finalSql: "SELECT 1",
        error: undefined,
        assistantText: "I cannot see it, but here is a table.",
        result: { columns: [{ name: "x", type: "int" }], rows: [[1]] },
      }),
      {},
    );

    expect(graded.pass).toBe(false);
  });
});

const FIT_QUESTION = {
  id: "R01",
  category: "page_context",
  prompt: "Fit y on x for the result on screen.",
  clarification: "not_needed",
  truth: {},
  fitRegression: {
    rows: [1, 2, 3].map((x) => {
      return { x, y: 2 * x + 1 };
    }),
    columns: ["x", "y"],
    xColumn: "x",
    yColumn: "y",
    slope: 2,
  },
  grade: () => {
    return { pass: false, detail: "graded by the tool call" };
  },
} as unknown as EvalQuestion;

describe("gradeEvalAnswer with fitRegression", () => {
  it("passes R01 when the tool was called and the reply states the slope", () => {
    const graded = gradeEvalAnswer(
      FIT_QUESTION,
      _createAnswer({
        assistantText: "The slope is 2.",
        toolNames: ["fitRegression"],
      }),
      {},
    );

    expect(graded.pass).toBe(true);
  });

  it("fails R01 when the tool was not called", () => {
    const graded = gradeEvalAnswer(
      FIT_QUESTION,
      _createAnswer({ assistantText: "The slope is 2.", toolNames: [] }),
      {},
    );

    expect(graded.pass).toBe(false);
  });

  it("fails R01 when the reply does not state the slope", () => {
    const graded = gradeEvalAnswer(
      FIT_QUESTION,
      _createAnswer({
        assistantText: "I fitted a line.",
        toolNames: ["fitRegression"],
      }),
      {},
    );

    expect(graded.pass).toBe(false);
  });
});
