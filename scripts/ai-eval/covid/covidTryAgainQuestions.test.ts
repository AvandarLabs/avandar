import { describe, expect, it } from "vitest";
import { createTryAgainQuestions } from "./covidTryAgainQuestions";
import type { EvalQuestion } from "../EvalQuestion";
import type { EvalQueryResult } from "../runtime/EvalDatabase";

/** A stand-in source question whose grader names it. */
function _source(id: string): EvalQuestion {
  return {
    id,
    category: "basic",
    prompt: `prompt of ${id}`,
    clarification: "not_needed",
    truth: { total: `SELECT ${id.length}` },
    grade: () => {
      return { pass: true, detail: `graded by ${id}` };
    },
  };
}

const SOURCES = ["B04", "B05", "S01", "N06", "D02"].map(_source);

function _byId(questions: readonly EvalQuestion[], id: string): EvalQuestion {
  return questions.find((question) => {
    return question.id === id;
  })!;
}

function _result(
  columns: readonly string[],
  rows: ReadonlyArray<readonly unknown[]>,
): EvalQueryResult {
  return {
    columns: columns.map((name) => {
      return { name, type: "VARCHAR" };
    }),
    rows,
  };
}

describe("createTryAgainQuestions", () => {
  it.each([
    ["T01", "B04"],
    ["T02", "B05"],
    ["T03", "S01"],
    ["T05", "D02"],
  ])("gives %s the prompt, truth, and grader of %s", (id, sourceId) => {
    const question = _byId(createTryAgainQuestions(SOURCES), id);
    const source = _byId(SOURCES, sourceId);

    expect(question).toMatchObject({
      id,
      category: "try_again",
      prompt: source.prompt,
      truth: source.truth,
    });
    expect(question.tryAgain).toEqual({});
    expect(question.grade).toBe(source.grade);
  });

  it("leaves T04's first card unanswered", () => {
    const question = _byId(createTryAgainQuestions(SOURCES), "T04");

    expect(question).toMatchObject({
      category: "try_again",
      prompt: "prompt of N06",
      clarification: "allowed",
      tryAgain: { isFirstCardUnanswered: true },
    });
  });

  it("adds Georgia the country to N06's truth", () => {
    const question = _byId(createTryAgainQuestions(SOURCES), "T04");

    expect(Object.keys(question.truth)).toEqual([
      "total",
      "countryTotal",
      "countryMonthly",
    ]);
    expect(question.truth.countryTotal).toContain(
      `"Country/Region" = 'Georgia'`,
    );
  });

  it("passes T04 on the country's total when N06's grader fails it", () => {
    const failingN06: EvalQuestion = {
      ..._source("N06"),
      grade: () => {
        return { pass: false, detail: "not the state" };
      },
    };
    const sources = SOURCES.map((source) => {
      return source.id === "N06" ? failingN06 : source;
    });
    const question = _byId(createTryAgainQuestions(sources), "T04");
    const truth = {
      countryTotal: _result(["value"], [[1234]]),
      countryMonthly: _result(["month", "value"], [["2021-01", 1234]]),
    };

    expect(
      question.grade({ result: _result(["deaths"], [[1234]]), truth }).pass,
    ).toBe(true);
    expect(
      question.grade({ result: _result(["deaths"], [[99]]), truth }).pass,
    ).toBe(false);
  });

  it("throws when a source question is missing", () => {
    expect(() => {
      return createTryAgainQuestions(
        SOURCES.filter((source) => {
          return source.id !== "S01";
        }),
      );
    }).toThrow(/"S01"/);
  });
});

describe("T06", () => {
  const TRUTH = {
    deathsTop: _result(["name", "value"], [["California", 100]]),
    casesTop: _result(["name", "value"], [["California", 5000]]),
    deathsMonthly: _result(
      ["month", "value"],
      [
        ["2020-03", 10],
        ["2020-04", 90],
      ],
    ),
    casesMonthly: _result(
      ["month", "value"],
      [
        ["2020-03", 1000],
        ["2020-04", 4000],
      ],
    ),
  };
  const T06 = _byId(createTryAgainQuestions(SOURCES), "T06");

  function _grade(
    result: EvalQueryResult,
    parentResult: EvalQueryResult | undefined,
  ): boolean {
    return T06.grade({ result, truth: TRUTH, parentResult }).pass;
  }

  it("follows T01 once, with no Try again of its own", () => {
    expect(T06).toMatchObject({
      followsId: "T01",
      category: "try_again",
      prompt: "show that by month",
    });
    expect(T06.tryAgain).toBeUndefined();
  });

  it("passes the deaths series after T01 read deaths", () => {
    expect(_grade(TRUTH.deathsMonthly, TRUTH.deathsTop)).toBe(true);
  });

  it("passes the cases series after T01 read cases", () => {
    expect(_grade(TRUTH.casesMonthly, TRUTH.casesTop)).toBe(true);
  });

  it("fails the cases series after T01 read deaths", () => {
    expect(_grade(TRUTH.casesMonthly, TRUTH.deathsTop)).toBe(false);
  });

  it("fails when T01's result matched neither reading", () => {
    expect(
      _grade(TRUTH.deathsMonthly, _result(["name", "value"], [["Texas", 7]])),
    ).toBe(false);
  });

  it("fails when T01 showed no result", () => {
    expect(_grade(TRUTH.deathsMonthly, undefined)).toBe(false);
  });
});
