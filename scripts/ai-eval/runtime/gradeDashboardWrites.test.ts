import { describe, expect, it } from "vitest";
import { gradeEvalAnswer } from "./gradeEvalAnswer";
import type { EvalQuestion } from "../EvalQuestion";
import type { EvalAnswer, EvalDashboardWrite } from "../harnesses/EvalHarness";
import type { EvalQueryResult } from "./EvalDatabase";

const DASHBOARD_ID = "dash-1";
const OTHER_DASHBOARD_ID = "dash-2";

const RESULT: EvalQueryResult = {
  columns: [{ name: "value", type: "BIGINT" }],
  rows: [[42]],
};

function _createAnswer(overrides: Partial<EvalAnswer>): EvalAnswer {
  return {
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

const HEADING_QUESTION = {
  id: "D02",
  category: "dashboards",
  prompt: "Add a heading that says Deaths in 2022",
  clarification: "not_needed",
  truth: {},
  expectedWrite: {
    dashboardId: DASHBOARD_ID,
    via: "editor",
    kind: "HeadingBlock",
    checkBlock: (block) => {
      return block.kind === "HeadingBlock" && /deaths in 2022/i.test(block.text)
        ? { pass: true, detail: "heading text matches" }
        : { pass: false, detail: "heading text does not match" };
    },
  },
  grade: () => {
    return { pass: false, detail: "not used" };
  },
} as EvalQuestion;

const CHART_QUESTION = {
  id: "D07",
  category: "dashboards",
  prompt: "Add a chart of weekly cases to the COVID 2022 dashboard",
  clarification: "not_needed",
  truth: {},
  expectedWrite: { dashboardId: DASHBOARD_ID, via: "card", kind: "DataViz" },
  grade: (context) => {
    return context.result.rows[0]?.[0] === 42
      ? { pass: true, detail: "matches truth" }
      : { pass: false, detail: "wrong total" };
  },
} as EvalQuestion;

const NO_WRITE_QUESTION = {
  id: "D05",
  category: "dashboards",
  prompt: "What were total deaths in 2022?",
  clarification: "not_needed",
  truth: {},
  expectedWrite: "none",
  grade: (context) => {
    return context.result.rows[0]?.[0] === 42
      ? { pass: true, detail: "matches truth" }
      : { pass: false, detail: "wrong total" };
  },
} as EvalQuestion;

const HEADING_WRITE: EvalDashboardWrite = {
  dashboardId: DASHBOARD_ID,
  via: "editor",
  block: { kind: "HeadingBlock", text: "Deaths in 2022" },
};

const CHART_WRITE: EvalDashboardWrite = {
  dashboardId: DASHBOARD_ID,
  via: "card",
  block: {
    kind: "DataViz",
    prompt: "Weekly cases",
    sql: "SELECT 1",
    vizType: "bar",
  },
  result: RESULT,
};

describe("gradeEvalAnswer with an expected dashboard write", () => {
  it("passes one write with the right target, path, kind, and fields", () => {
    const graded = gradeEvalAnswer(
      HEADING_QUESTION,
      _createAnswer({ dashboardWrites: [HEADING_WRITE] }),
      {},
    );

    expect(graded.pass).toBe(true);
  });

  it("fails when no block was added", () => {
    const graded = gradeEvalAnswer(HEADING_QUESTION, _createAnswer({}), {});

    expect(graded.pass).toBe(false);
    expect(graded.detail).toMatch(/no block/);
  });

  it("fails a write to another dashboard", () => {
    const graded = gradeEvalAnswer(
      HEADING_QUESTION,
      _createAnswer({
        dashboardWrites: [
          { ...HEADING_WRITE, dashboardId: OTHER_DASHBOARD_ID },
        ],
      }),
      {},
    );

    expect(graded.pass).toBe(false);
    expect(graded.detail).toMatch(/dashboard/);
  });

  it("fails a write that skipped the card", () => {
    const graded = gradeEvalAnswer(
      CHART_QUESTION,
      _createAnswer({ dashboardWrites: [{ ...CHART_WRITE, via: "editor" }] }),
      {},
    );

    expect(graded.pass).toBe(false);
  });

  it("fails a block of the wrong kind", () => {
    const graded = gradeEvalAnswer(
      HEADING_QUESTION,
      _createAnswer({
        dashboardWrites: [
          { ...HEADING_WRITE, block: { kind: "ParagraphBlock", text: "x" } },
        ],
      }),
      {},
    );

    expect(graded.pass).toBe(false);
  });

  it("fails when the block's fields do not check out", () => {
    const graded = gradeEvalAnswer(
      HEADING_QUESTION,
      _createAnswer({
        dashboardWrites: [
          { ...HEADING_WRITE, block: { kind: "HeadingBlock", text: "Cases" } },
        ],
      }),
      {},
    );

    expect(graded.pass).toBe(false);
    expect(graded.detail).toMatch(/heading text/);
  });

  it("fails more than one write", () => {
    const graded = gradeEvalAnswer(
      HEADING_QUESTION,
      _createAnswer({ dashboardWrites: [HEADING_WRITE, HEADING_WRITE] }),
      {},
    );

    expect(graded.pass).toBe(false);
  });

  it("grades a DataViz write on the block's own result", () => {
    const graded = gradeEvalAnswer(
      CHART_QUESTION,
      _createAnswer({ dashboardWrites: [CHART_WRITE] }),
      {},
    );

    expect(graded.pass).toBe(true);
  });

  it("fails a DataViz write whose SQL failed", () => {
    const graded = gradeEvalAnswer(
      CHART_QUESTION,
      _createAnswer({
        dashboardWrites: [
          { ...CHART_WRITE, result: undefined, error: "no such column" },
        ],
      }),
      {},
    );

    expect(graded.pass).toBe(false);
    expect(graded.detail).toMatch(/no such column/);
  });
});

describe("gradeEvalAnswer when no dashboard write is expected", () => {
  it("fails any write", () => {
    const graded = gradeEvalAnswer(
      NO_WRITE_QUESTION,
      _createAnswer({ dashboardWrites: [HEADING_WRITE], result: RESULT }),
      {},
    );

    expect(graded.pass).toBe(false);
    expect(graded.detail).toMatch(/not asked/);
  });

  it("grades the reply as usual when nothing was written", () => {
    const graded = gradeEvalAnswer(
      NO_WRITE_QUESTION,
      _createAnswer({ result: RESULT }),
      {},
    );

    expect(graded.pass).toBe(true);
  });
});
