import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { ResultChecks } from "../grading/ResultChecks";
import {
  CASES_TILE,
  DEATHS_TILE,
  KINGS_COUNTY_2022,
  US_DEATHS,
  datasetOf,
  toStoredSql,
  totalOrSum,
  weeklyTotal,
} from "./covidQuestionHelpers";
import { CovidTruthSql as Sql } from "./covidTruthSql";
import type { AgentGadgetContext } from "$/agent/mentions/AgentGadgetContext";
import type { AgentPageContext } from "$/agent/pageContext/AgentPageContext";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { EvalQuestion } from "../EvalQuestion";
import type { Verdict } from "../grading/ResultMatchers";

/** Fixed ids, so a run's prompts are the same every time. */
const COVID_DASHBOARD_ID = "5c1d0a10-0001-4000-8000-000000000001";
const MORTALITY_DASHBOARD_ID = "5c1d0a10-0002-4000-8000-000000000002";
const KINGS_DASHBOARD_ID = "5c1d0a10-0003-4000-8000-000000000003";
const UNAVAILABLE_DASHBOARD_ID = "5c1d0a10-0004-4000-8000-000000000004";

function _tileRef(dashboardId: string, blockId: string): Gadget.Ref {
  return {
    gadgetType: "dashboard_tile",
    gadgetId: dashboardId,
    subId: blockId,
  };
}

function _datasetContext(fileName: string): AgentGadgetContext {
  const { id, name } = datasetOf(fileName);
  return {
    kind: "dataset",
    ref: { gadgetType: "dataset", gadgetId: id, subId: null },
    name,
  };
}

const US_DEATHS_CONTEXT = _datasetContext("long-us-deaths.csv");
const US_CASES_CONTEXT = _datasetContext("long-us-confirmed-cases.csv");

const DEATHS_TILE_CONTEXT: AgentGadgetContext = {
  kind: "dashboard_tile",
  ref: _tileRef(MORTALITY_DASHBOARD_ID, "deaths-tile"),
  dashboardName: "Mortality",
  tile: DEATHS_TILE,
};

/** The county chart, whose county name the harness treats as personal. */
const KINGS_TILE_CONTEXT: AgentGadgetContext = {
  kind: "dashboard_tile",
  ref: _tileRef(KINGS_DASHBOARD_ID, "county-tile"),
  dashboardName: "New York deaths",
  tile: {
    title: "Deaths in one county by month",
    chartType: "line",
    sql: toStoredSql(
      `SELECT date_trunc('month', "date") AS "month", SUM("daily_new_deaths") AS "deaths" FROM "${US_DEATHS}" WHERE ${KINGS_COUNTY_2022} GROUP BY 1 ORDER BY 1`,
    ),
  },
};

const ATTACHED_DASHBOARD: AgentGadgetContext = {
  kind: "dashboard",
  ref: {
    gadgetType: "dashboard",
    gadgetId: MORTALITY_DASHBOARD_ID,
    subId: null,
  },
  name: "Mortality",
  tiles: [DEATHS_TILE],
};

/** A dashboard the user cannot open: a deleted one, for example. */
const UNAVAILABLE_DASHBOARD: AgentGadgetContext = {
  kind: "unavailable",
  ref: {
    gadgetType: "dashboard",
    gadgetId: UNAVAILABLE_DASHBOARD_ID,
    subId: null,
  },
};

const US_DEATHS_TOKEN = ChatMentionToken.buildToken(US_DEATHS_CONTEXT.ref);
const US_CASES_TOKEN = ChatMentionToken.buildToken(US_CASES_CONTEXT.ref);
const DEATHS_TILE_TOKEN = ChatMentionToken.buildToken(DEATHS_TILE_CONTEXT.ref);
const KINGS_TILE_TOKEN = ChatMentionToken.buildToken(KINGS_TILE_CONTEXT.ref);
const UNAVAILABLE_TOKEN = ChatMentionToken.buildToken(
  UNAVAILABLE_DASHBOARD.ref,
);

const EXPLORER_ON_GLOBAL_DEATHS: AgentPageContext = {
  app: "data-explorer",
  dataset: datasetOf("long-global-deaths.csv"),
  explorer: { resultColumns: [] },
};

/** Another dashboard is open, with a chart the question does not mean. */
const OPEN_DASHBOARD: AgentPageContext = {
  app: "dashboard",
  dashboard: {
    id: COVID_DASHBOARD_ID,
    name: "COVID 2022",
    tiles: [CASES_TILE],
  },
};

const YEAR_2022 = `year("date") = 2022`;
const FIRST_HALF_2022 = `${YEAR_2022} AND month("date") <= 6`;

/** Rows by month holding both the deaths and the cases for each month. */
function _gradeBothMeasuresByMonth(
  context: Parameters<EvalQuestion["grade"]>[0],
): Verdict {
  const spec = { keys: ["month"], values: ["value"], mode: "all" } as const;
  const deaths = ResultChecks.matchTruthRows(
    context.result,
    context.truth.deaths!,
    spec,
  );
  return deaths.pass
    ? ResultChecks.matchTruthRows(context.result, context.truth.cases!, spec)
    : deaths;
}

const GADGET_QUESTIONS: readonly EvalQuestion[] = [
  {
    id: "M01",
    category: "mentions",
    prompt: `How many deaths are in ${US_DEATHS_TOKEN} in total?`,
    clarification: "not_needed",
    pageContext: EXPLORER_ON_GLOBAL_DEATHS,
    mentions: [US_DEATHS_CONTEXT],
    truth: { total: Sql.total("us_deaths") },
    grade: totalOrSum,
  },
  {
    id: "M02",
    category: "mentions",
    prompt: `show ${DEATHS_TILE_TOKEN} by week`,
    clarification: "not_needed",
    pageContext: OPEN_DASHBOARD,
    mentions: [DEATHS_TILE_CONTEXT],
    truth: { total: Sql.total("us_deaths", YEAR_2022) },
    grade: (context) => {
      return weeklyTotal(context, 52);
    },
  },
  {
    id: "M03",
    category: "mentions",
    prompt: "how many deaths does the attached dashboard show in total?",
    clarification: "not_needed",
    attached: [ATTACHED_DASHBOARD],
    truth: { total: Sql.total("us_deaths", YEAR_2022) },
    grade: totalOrSum,
  },
  {
    id: "M03b",
    category: "mentions",
    prompt: "and only the first half of the year?",
    followsId: "M03",
    clarification: "not_needed",
    attached: [ATTACHED_DASHBOARD],
    truth: { total: Sql.total("us_deaths", FIRST_HALF_2022) },
    grade: totalOrSum,
  },
  {
    id: "M04",
    category: "mentions",
    prompt: `compare ${US_DEATHS_TOKEN} and ${US_CASES_TOKEN} by month in 2022`,
    clarification: "not_needed",
    mentions: [US_DEATHS_CONTEXT, US_CASES_CONTEXT],
    truth: {
      deaths: Sql.monthly("us_deaths", YEAR_2022),
      cases: Sql.monthly("us_cases", YEAR_2022),
    },
    grade: _gradeBothMeasuresByMonth,
  },
  {
    id: "M05",
    category: "mentions",
    prompt: `what does ${UNAVAILABLE_TOKEN} show?`,
    clarification: "allowed",
    mentions: [UNAVAILABLE_DASHBOARD],
    // The grading API has no "no query" verdict, so `expectsNoQuery` grades
    // it: no query ran and the answer says it cannot see the dashboard.
    expectsNoQuery: true,
    truth: {},
    grade: () => {
      return {
        pass: false,
        detail: "ran a query for a dashboard it cannot see",
      };
    },
  },
  {
    id: "M06",
    category: "mentions",
    prompt: `show ${KINGS_TILE_TOKEN} by week`,
    clarification: "not_needed",
    mentions: [KINGS_TILE_CONTEXT],
    personalColumns: ["Admin2"],
    truth: { total: Sql.total("us_deaths", KINGS_COUNTY_2022) },
    grade: (context) => {
      return weeklyTotal(context, 52);
    },
  },
];

/** Questions whose subject is a gadget the user mentions or attaches. */
export const MENTION_QUESTIONS: readonly EvalQuestion[] = [...GADGET_QUESTIONS];
