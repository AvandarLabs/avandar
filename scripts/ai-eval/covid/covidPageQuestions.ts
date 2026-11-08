import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias";
import { ResultChecks } from "../grading/ResultChecks";
import { MatcherText } from "../grading/ResultMatchers";
import { CovidTruthSql as Sql } from "./covidTruthSql";
import { COVID_DATASETS } from "./covidWorkspace";
import type { AgentPageContext } from "$/agent/pageContext/AgentPageContext";
import type { EvalQuestion, GradeContext } from "../EvalQuestion";
import type { Verdict } from "../grading/ResultMatchers";

const ALIASES = SqlTableAlias.fromDatasets(COVID_DATASETS);

function _aliasOf(fileName: string): string {
  const dataset = COVID_DATASETS.find((candidate) => {
    return candidate.fileName === fileName;
  });
  const alias = ALIASES.find((candidate) => {
    return candidate.name === dataset?.name;
  });
  if (!alias) {
    throw new Error(`No table alias for ${fileName}`);
  }
  return alias.alias;
}

const US_DEATHS = _aliasOf("long-us-deaths.csv");
const US_CASES = _aliasOf("long-us-confirmed-cases.csv");

/** The COVID dataset with this file name, as the page context names it. */
function _datasetOf(fileName: string): { id: string; name: string } {
  const dataset = COVID_DATASETS.find((candidate) => {
    return candidate.fileName === fileName;
  });
  if (!dataset) {
    throw new Error(`No COVID dataset named ${fileName}`);
  }
  return { id: dataset.id, name: dataset.name };
}

/** Page SQL as the app stores it: written with aliases, then resolved. */
function _stored(sql: string): string {
  return SqlTableAlias.applyToSql(sql, ALIASES);
}

function _monthlyIn2022(table: string, measure: string, label: string): string {
  return _stored(
    `SELECT date_trunc('month', "date") AS "month", SUM("${measure}") AS "${label}" FROM "${table}" WHERE year("date") = 2022 GROUP BY 1 ORDER BY 1`,
  );
}

const DEATHS_2021_MONTHLY = _stored(
  `SELECT date_trunc('month', "date") AS "month", SUM("daily_new_deaths") AS "deaths" FROM "${US_DEATHS}" WHERE year("date") = 2021 GROUP BY 1 ORDER BY 1`,
);

const CASES_TILE = {
  title: "Monthly US cases in 2022",
  chartType: "bar",
  sql: _monthlyIn2022(US_CASES, "daily_new_cases", "cases"),
};
const DEATHS_TILE = {
  title: "Monthly US deaths in 2022",
  chartType: "line",
  sql: _monthlyIn2022(US_DEATHS, "daily_new_deaths", "deaths"),
};

const ONE_TILE_DASHBOARD: AgentPageContext = {
  app: "dashboard",
  dashboard: { id: "dash-1", name: "COVID 2022", tiles: [CASES_TILE] },
};

function _scalar(context: GradeContext, name: string): number {
  return MatcherText.toNumber(context.truth[name]?.rows[0]?.[0]) ?? Number.NaN;
}

/** A weekly series: about `weekCount` rows adding up to the period total. */
function _weeklyTotal(context: GradeContext, weekCount: number): Verdict {
  const rowCount = context.result.rows.length;
  if (Math.abs(rowCount - weekCount) > 2) {
    return {
      pass: false,
      detail: `expected about ${weekCount} weekly rows, got ${rowCount}`,
    };
  }
  return ResultChecks.hasColumnSum(context.result, _scalar(context, "total"), {
    tolerance: 0.05,
  });
}

/** A total, shown either as one number or as rows that add up to it. */
function _totalOrSum(context: GradeContext): Verdict {
  const total = _scalar(context, "total");
  return ResultChecks.anyOf([
    () => {
      return ResultChecks.hasValue(context.result, total);
    },
    () => {
      return ResultChecks.hasColumnSum(context.result, total, {
        tolerance: 0.001,
      });
    },
  ]);
}

function _stateBreakdown(context: GradeContext): Verdict {
  if (context.result.rows.length < 50) {
    return {
      pass: false,
      detail: "fewer than 50 rows is not a breakdown by state",
    };
  }
  return ResultChecks.hasColumnSum(context.result, _scalar(context, "total"), {
    tolerance: 0.001,
  });
}

const SCREEN_QUESTIONS: readonly EvalQuestion[] = [
  {
    id: "P01",
    category: "page_context",
    prompt: "How many deaths are in this dataset in total?",
    clarification: "not_needed",
    pageContext: {
      app: "data-explorer",
      dataset: _datasetOf("long-global-deaths.csv"),
      explorer: { resultColumns: [] },
    },
    truth: { total: Sql.total("global_deaths") },
    grade: _totalOrSum,
  },
  {
    id: "P02",
    category: "page_context",
    prompt: "break this down by state",
    clarification: "not_needed",
    pageContext: {
      app: "data-explorer",
      dataset: _datasetOf("long-us-deaths.csv"),
      explorer: {
        sql: DEATHS_2021_MONTHLY,
        resultColumns: [
          { name: "month", dataType: "date" },
          { name: "deaths", dataType: "bigint" },
        ],
      },
    },
    truth: { total: Sql.total("us_deaths", `year("date") = 2021`) },
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
      return _weeklyTotal(context, 52);
    },
  },
  {
    id: "P04",
    category: "page_context",
    prompt: "make this a pie chart",
    clarification: "expected",
    expectsChart: true,
    user: { choose: /death/i, say: "the deaths chart" },
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
      return _weeklyTotal(context, 26);
    },
  },
];

/** Questions that only make sense with what is on screen. */
export const PAGE_QUESTIONS: readonly EvalQuestion[] = [...SCREEN_QUESTIONS];
