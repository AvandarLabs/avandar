import { ResultChecks } from "../grading/ResultChecks";
import { MatcherText } from "../grading/ResultMatchers";
import { CovidTruthSql as Sql } from "./covidTruthSql";
import type { EvalQuestion, GradeContext } from "../EvalQuestion";
import type { TruthRowSpec } from "../grading/ResultChecks";
import type { Verdict } from "../grading/ResultMatchers";

const US_STATE = `"Province_State"`;
const GEORGIA_COUNTRY = `"Country/Region" = 'Georgia'`;

/** The first row's name and value, as B04 grades its answer. */
const TOP_ONE: TruthRowSpec = {
  keys: ["name"],
  values: ["value"],
  mode: "prefix",
  prefixLength: 1,
};

/** A monthly series with 95% of its months, as N01 grades one. */
const NEARLY_ALL_MONTHS: TruthRowSpec = {
  keys: ["month"],
  values: ["value"],
  mode: "all",
  minShare: 0.95,
};

function _sourceById(
  sources: readonly EvalQuestion[],
  id: string,
): EvalQuestion {
  const source = sources.find((question) => {
    return question.id === id;
  });
  if (!source) {
    throw new Error(`The Try again questions need source question "${id}"`);
  }
  return source;
}

/** A Try again copy of a source question, under its own id. */
function _tryAgainOf(
  options: Readonly<{
    source: EvalQuestion;
    id: string;
    isFirstCardUnanswered?: boolean;
  }>,
): EvalQuestion {
  return {
    ...options.source,
    id: options.id,
    category: "try_again",
    tryAgain: options.isFirstCardUnanswered
      ? { isFirstCardUnanswered: true }
      : {},
  };
}

/** A truth result's first cell, as a number. */
function _scalar(context: GradeContext, name: string): number {
  return MatcherText.toNumber(context.truth[name]?.rows[0]?.[0]) ?? Number.NaN;
}

/**
 * N06's grader, or Georgia the country: its total as one number or as rows
 * that add up to it, or its monthly series.
 */
function _gradeStateOrCountry(source: EvalQuestion): EvalQuestion["grade"] {
  return (context) => {
    return ResultChecks.anyOf([
      () => {
        return source.grade(context);
      },
      () => {
        return ResultChecks.hasValue(
          context.result,
          _scalar(context, "countryTotal"),
        );
      },
      () => {
        return ResultChecks.hasColumnSum(
          context.result,
          _scalar(context, "countryTotal"),
          { tolerance: 0.001 },
        );
      },
      () => {
        return ResultChecks.matchTruthRows(
          context.result,
          context.truth.countryMonthly!,
          NEARLY_ALL_MONTHS,
        );
      },
    ]);
  };
}

/** `"Province_State"` equal to the state with the most of `view`'s measure. */
function _topStateWhere(view: "us_deaths" | "us_cases"): string {
  return `${US_STATE} = (SELECT name FROM (${Sql.ranked(view, US_STATE, { limit: 1 })}))`;
}

/**
 * T06's grader: the monthly series of the reading T01's second attempt
 * used. Monthly deaths of the top deaths state, or monthly cases of the top
 * cases state. A parent that matched neither reading fails.
 */
function _gradeMonthlyOfParentReading(context: GradeContext): Verdict {
  const parent = context.parentResult;
  if (!parent) {
    return { pass: false, detail: "T01's second attempt showed no result" };
  }
  if (
    ResultChecks.matchTruthRows(parent, context.truth.deathsTop!, TOP_ONE).pass
  ) {
    return ResultChecks.matchTruthRows(
      context.result,
      context.truth.deathsMonthly!,
      NEARLY_ALL_MONTHS,
    );
  }
  if (
    ResultChecks.matchTruthRows(parent, context.truth.casesTop!, TOP_ONE).pass
  ) {
    return ResultChecks.matchTruthRows(
      context.result,
      context.truth.casesMonthly!,
      NEARLY_ALL_MONTHS,
    );
  }
  return {
    pass: false,
    detail: "T01's second attempt matched neither reading",
  };
}

/** A follow-up asked once, after T01's second attempt. */
const T06: EvalQuestion = {
  id: "T06",
  category: "try_again",
  prompt: "show that by month",
  followsId: "T01",
  clarification: "not_needed",
  truth: {
    deathsTop: Sql.ranked("us_deaths", US_STATE, { limit: 1 }),
    casesTop: Sql.ranked("us_cases", US_STATE, { limit: 1 }),
    deathsMonthly: Sql.monthly("us_deaths", _topStateWhere("us_deaths")),
    casesMonthly: Sql.monthly("us_cases", _topStateWhere("us_cases")),
  },
  grade: _gradeMonthlyOfParentReading,
};

/**
 * The Try again set. T01 to T05 copy B04, B05, S01, N06, and D02 by id, and
 * each is asked twice, the second time as a Try again. T04 leaves its first
 * card unanswered and also accepts Georgia the country. T06 follows T01's
 * second attempt. Throws when a source id is missing from `sources`.
 */
export function createTryAgainQuestions(
  sources: readonly EvalQuestion[],
): EvalQuestion[] {
  const n06Source = _sourceById(sources, "N06");
  return [
    _tryAgainOf({ source: _sourceById(sources, "B04"), id: "T01" }),
    _tryAgainOf({ source: _sourceById(sources, "B05"), id: "T02" }),
    _tryAgainOf({ source: _sourceById(sources, "S01"), id: "T03" }),
    {
      ..._tryAgainOf({
        source: n06Source,
        id: "T04",
        isFirstCardUnanswered: true,
      }),
      clarification: "allowed",
      truth: {
        ...n06Source.truth,
        countryTotal: Sql.total("global_deaths", GEORGIA_COUNTRY),
        countryMonthly: Sql.monthly("global_deaths", GEORGIA_COUNTRY),
      },
      grade: _gradeStateOrCountry(n06Source),
    },
    _tryAgainOf({ source: _sourceById(sources, "D02"), id: "T05" }),
    T06,
  ];
}
