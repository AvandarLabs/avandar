import { ResultChecks } from "../grading/ResultChecks";
import {
  CASES_TILE,
  DEATHS_TILE,
  KINGS_COUNTY_2022,
  US_DEATHS,
  datasetOf,
  firstScalar,
  toStoredSql,
  totalOrSum,
  weeklyTotal,
} from "./covidQuestionHelpers";
import { CovidTruthSql as Sql } from "./covidTruthSql";
import type { AgentPageContext } from "$/agent/pageContext/AgentPageContext";
import type { EvalQuestion, GradeContext } from "../EvalQuestion";
import type { Verdict } from "../grading/ResultMatchers";

const DEATHS_2021_MONTHLY = toStoredSql(
  `SELECT date_trunc('month', "date") AS "month", SUM("daily_new_deaths") AS "deaths" FROM "${US_DEATHS}" WHERE year("date") = 2021 GROUP BY 1 ORDER BY 1`,
);

/**
 * A county chart, whose county name the harness treats as personal. The
 * title does not name the county: titles get only the content check, so a
 * name in the title would reach the model and the placeholder would not be
 * needed.
 */
const KINGS_DASHBOARD: AgentPageContext = {
  app: "dashboard",
  dashboard: {
    id: "dash-3",
    name: "New York deaths",
    tiles: [
      {
        title: "Deaths in one county by month",
        chartType: "line",
        sql: toStoredSql(
          `SELECT date_trunc('month', "date") AS "month", SUM("daily_new_deaths") AS "deaths" FROM "${US_DEATHS}" WHERE ${KINGS_COUNTY_2022} GROUP BY 1 ORDER BY 1`,
        ),
      },
    ],
  },
};

const ONE_TILE_DASHBOARD: AgentPageContext = {
  app: "dashboard",
  dashboard: { id: "dash-1", name: "COVID 2022", tiles: [CASES_TILE] },
};

/**
 * A breakdown by state: one row per state with its 2021 deaths, or rows by
 * state and month that add up to the 2021 total. Counties do not pass.
 */
function _stateBreakdown(context: GradeContext): Verdict {
  const byState = context.truth.byState!;
  const stateNames = byState.rows.map((row) => {
    return String(row[0]);
  });
  return ResultChecks.anyOf([
    () => {
      return ResultChecks.matchTruthRows(context.result, byState, {
        keys: ["name"],
        values: ["value"],
        mode: "all",
        minShare: 0.95,
      });
    },
    () => {
      const keySet = ResultChecks.hasKeySet(context.result, stateNames);
      return keySet.pass
        ? ResultChecks.hasColumnSum(
            context.result,
            firstScalar(context, "total"),
            {
              tolerance: 0.001,
            },
          )
        : keySet;
    },
  ]);
}

const SCREEN_QUESTIONS: readonly EvalQuestion[] = [
  {
    id: "P01",
    category: "page_context",
    prompt: "How many deaths are in this dataset in total?",
    clarification: "not_needed",
    pageContext: {
      app: "data-explorer",
      dataset: datasetOf("long-global-deaths.csv"),
      explorer: { resultColumns: [] },
    },
    truth: { total: Sql.total("global_deaths") },
    grade: totalOrSum,
  },
  {
    id: "P02",
    category: "page_context",
    prompt: "break this down by state",
    clarification: "not_needed",
    pageContext: {
      app: "data-explorer",
      dataset: datasetOf("long-us-deaths.csv"),
      explorer: {
        sql: DEATHS_2021_MONTHLY,
        resultColumns: [
          { name: "month", dataType: "date" },
          { name: "deaths", dataType: "bigint" },
        ],
      },
    },
    truth: {
      total: Sql.total("us_deaths", `year("date") = 2021`),
      byState: Sql.ranked("us_deaths", `"Province_State"`, {
        where: `year("date") = 2021`,
      }),
    },
    grade: _stateBreakdown,
  },
  {
    id: "P03",
    category: "page_context",
    prompt: "show this chart by week instead",
    clarification: "not_needed",
    pageContext: ONE_TILE_DASHBOARD,
    truth: { total: Sql.total("us_cases", `year("date") = 2022`) },
    grade: (context) => {
      return weeklyTotal(context, 52);
    },
  },
  {
    id: "P04",
    category: "page_context",
    prompt: "make this a pie chart",
    clarification: "expected",
    expectsChart: true,
    user: { choose: /deaths (chart|in 2022)/i, say: "the deaths chart" },
    pageContext: {
      app: "dashboard",
      dashboard: {
        id: "dash-2",
        name: "COVID 2022",
        tiles: [CASES_TILE, DEATHS_TILE],
      },
    },
    truth: { monthly: Sql.monthly("us_deaths", `year("date") = 2022`) },
    grade: (context) => {
      return ResultChecks.matchTruthRows(
        context.result,
        context.truth.monthly!,
        {
          keys: ["month"],
          values: ["value"],
          mode: "all",
          exactRows: true,
        },
      );
    },
  },
  {
    id: "P05",
    category: "page_context",
    prompt: "Which state had the most covid deaths?",
    clarification: "not_needed",
    pageContext: { app: "map", map: { id: "map-1", name: "Clinic locations" } },
    truth: {
      top: Sql.ranked("us_deaths", `"Province_State"`, { limit: 1 }),
    },
    grade: (context) => {
      return ResultChecks.matchTruthRows(context.result, context.truth.top!, {
        keys: ["name"],
        values: ["value"],
        mode: "prefix",
        prefixLength: 1,
      });
    },
  },
  {
    id: "P06",
    category: "page_context",
    prompt: "only the first half of the year",
    followsId: "P03",
    clarification: "not_needed",
    pageContext: ONE_TILE_DASHBOARD,
    truth: {
      total: Sql.total(
        "us_cases",
        `year("date") = 2022 AND month("date") <= 6`,
      ),
    },
    grade: (context) => {
      return weeklyTotal(context, 26);
    },
  },
  {
    id: "P07",
    category: "page_context",
    prompt: "show this chart by week",
    clarification: "not_needed",
    pageContext: KINGS_DASHBOARD,
    personalColumns: ["Admin2"],
    truth: { total: Sql.total("us_deaths", KINGS_COUNTY_2022) },
    grade: (context) => {
      return weeklyTotal(context, 52);
    },
  },
];

/** Questions that only make sense with what is on screen. */
export const PAGE_QUESTIONS: readonly EvalQuestion[] = [...SCREEN_QUESTIONS];
