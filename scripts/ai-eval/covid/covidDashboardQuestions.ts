import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { ResultChecks } from "../grading/ResultChecks";
import {
  CASES_TILE,
  DEATHS_TILE,
  US_DEATHS,
  datasetOf,
  monthlyIn2022,
  totalOrSum,
  weeklyTotal,
} from "./covidQuestionHelpers";
import { CovidTruthSql as Sql } from "./covidTruthSql";
import type { AgentGadgetContext } from "$/agent/mentions/AgentGadgetContext";
import type { AgentPageContext } from "$/agent/pageContext/AgentPageContext";
import type { ChatGeneratedDashboardBlock } from "$/types/chat.types";
import type {
  EvalDashboard,
  EvalQuestion,
  GradeContext,
} from "../EvalQuestion";
import type { Verdict } from "../grading/ResultMatchers";

/** Fixed ids, so a run's prompts are the same every time. */
const COVID_2022_ID = "5c1d0a10-0d01-4000-8000-000000000001";
const MORTALITY_ID = "5c1d0a10-0d02-4000-8000-000000000002";
const COVID_CASES_ID = "5c1d0a10-0d03-4000-8000-000000000003";
const COVID_DEATHS_ID = "5c1d0a10-0d04-4000-8000-000000000004";
const READ_ONLY_ID = "5c1d0a10-0d05-4000-8000-000000000005";

const COVID_2022: EvalDashboard = {
  id: COVID_2022_ID,
  name: "COVID 2022",
  canEdit: true,
  tiles: [CASES_TILE],
};
const MORTALITY: EvalDashboard = {
  id: MORTALITY_ID,
  name: "Mortality",
  canEdit: true,
  tiles: [DEATHS_TILE],
};
/** A dashboard the user can see but not edit, so it is never a target. */
const READ_ONLY: EvalDashboard = {
  id: READ_ONLY_ID,
  name: "State reports",
  canEdit: false,
  tiles: [],
};

/** The workspace most dashboard questions run in. */
const WORKSPACE_DASHBOARDS: readonly EvalDashboard[] = [
  COVID_2022,
  MORTALITY,
  READ_ONLY,
];

/** Two dashboards with the same name, for the card's picker. */
const SAME_NAME_DASHBOARDS: readonly EvalDashboard[] = [
  { id: COVID_CASES_ID, name: "COVID", canEdit: true, tiles: [CASES_TILE] },
  { id: COVID_DEATHS_ID, name: "COVID", canEdit: true, tiles: [DEATHS_TILE] },
  MORTALITY,
];

/** The COVID 2022 dashboard, open in the editor. */
const EDITOR_PAGE: AgentPageContext = {
  app: "dashboard",
  dashboard: {
    id: COVID_2022.id,
    name: COVID_2022.name,
    tiles: COVID_2022.tiles,
  },
};

const MAP_PAGE: AgentPageContext = {
  app: "map",
  map: { id: "5c1d0a10-0d10-4000-8000-000000000010", name: "US counties" },
};

const COVID_2022_MENTION: AgentGadgetContext = {
  kind: "dashboard",
  ref: { gadgetType: "dashboard", gadgetId: COVID_2022.id, subId: null },
  name: COVID_2022.name,
  tiles: COVID_2022.tiles,
};
const COVID_2022_TOKEN = ChatMentionToken.buildToken(COVID_2022_MENTION.ref);

/** The Data Explorer with monthly US deaths in 2022 on screen. */
const EXPLORER_WITH_DEATHS_QUERY: AgentPageContext = {
  app: "data-explorer",
  dataset: datasetOf("long-us-deaths.csv"),
  explorer: {
    sql: monthlyIn2022(US_DEATHS, "daily_new_deaths", "deaths"),
    resultColumns: [
      { name: "month", dataType: "date" },
      { name: "deaths", dataType: "bigint" },
    ],
  },
};

const YEAR_2022 = `year("date") = 2022`;

const MONTHLY_DEATHS_2022 = {
  monthly: Sql.monthly("us_deaths", YEAR_2022),
};

function _monthlyRows(context: GradeContext): Verdict {
  return ResultChecks.matchTruthRows(context.result, context.truth.monthly!, {
    keys: ["month"],
    values: ["value"],
    mode: "all",
  });
}

/** Checks a DataViz block's chart type. */
function _vizTypeIs(
  vizType: string,
): (block: ChatGeneratedDashboardBlock) => Verdict {
  return (block) => {
    return block.kind === "DataViz" && block.vizType === vizType
      ? { pass: true, detail: `a ${vizType} chart` }
      : {
          pass: false,
          detail: `expected a ${vizType} chart, got ${block.kind === "DataViz" ? block.vizType : block.kind}`,
        };
  };
}

/** Words a reply uses to say it found no such dashboard. */
const NOT_FOUND_PATTERN =
  /\b(can(?:no|['’])t find|could(?:n['’]t| not) find|unable to find|no dashboard|not find|doesn['’]t exist|does not exist|don['’]t see|do not see)\b/i;

/** Questions that add a block to the current editor's dashboard. */
const EDITOR_QUESTIONS: readonly EvalQuestion[] = [
  {
    id: "D01",
    category: "dashboards",
    prompt: "Add a line chart of monthly US deaths in 2022",
    clarification: "not_needed",
    pageContext: EDITOR_PAGE,
    dashboards: WORKSPACE_DASHBOARDS,
    openEditorDashboardId: COVID_2022.id,
    expectedWrite: {
      dashboardId: COVID_2022.id,
      via: "editor",
      kind: "DataViz",
      checkBlock: _vizTypeIs("line"),
    },
    truth: MONTHLY_DEATHS_2022,
    grade: _monthlyRows,
  },
  {
    id: "D02",
    category: "dashboards",
    prompt: "Add a heading that says Deaths in 2022",
    clarification: "not_needed",
    pageContext: EDITOR_PAGE,
    dashboards: WORKSPACE_DASHBOARDS,
    openEditorDashboardId: COVID_2022.id,
    expectedWrite: {
      dashboardId: COVID_2022.id,
      via: "editor",
      kind: "HeadingBlock",
      checkBlock: (block) => {
        return block.kind === "HeadingBlock" &&
          /^deaths in 2022\.?$/i.test(block.text.trim())
          ? { pass: true, detail: "the heading reads Deaths in 2022" }
          : { pass: false, detail: "the heading text does not match" };
      },
    },
    truth: {},
    grade: () => {
      return { pass: false, detail: "a heading has no result" };
    },
  },
  {
    id: "D03",
    category: "dashboards",
    prompt: "Add a callout warning that 2023 data is partial",
    clarification: "not_needed",
    pageContext: EDITOR_PAGE,
    dashboards: WORKSPACE_DASHBOARDS,
    openEditorDashboardId: COVID_2022.id,
    expectedWrite: {
      dashboardId: COVID_2022.id,
      via: "editor",
      kind: "CalloutBlock",
      checkBlock: (block) => {
        if (block.kind !== "CalloutBlock" || block.tone !== "warning") {
          return { pass: false, detail: "expected a warning callout" };
        }
        const text = `${block.title} ${block.body}`;
        return /2023/.test(text) && /partial|incomplete/i.test(text)
          ? { pass: true, detail: "a warning that 2023 is partial" }
          : { pass: false, detail: "the callout does not say 2023 is partial" };
      },
    },
    truth: {},
    grade: () => {
      return { pass: false, detail: "a callout has no result" };
    },
  },
  {
    id: "D04",
    category: "dashboards",
    prompt: "Add a table of the 5 states with the most deaths",
    clarification: "not_needed",
    pageContext: EDITOR_PAGE,
    dashboards: WORKSPACE_DASHBOARDS,
    openEditorDashboardId: COVID_2022.id,
    expectedWrite: {
      dashboardId: COVID_2022.id,
      via: "editor",
      kind: "DataViz",
      checkBlock: _vizTypeIs("table"),
    },
    truth: {
      top: Sql.ranked("us_deaths", `"Province_State"`, { limit: 5 }),
    },
    grade: (context) => {
      return ResultChecks.matchTruthRows(context.result, context.truth.top!, {
        keys: ["name"],
        values: ["value"],
        mode: "prefix",
        prefixLength: 5,
      });
    },
  },
  {
    id: "D05",
    category: "dashboards",
    prompt: "What were total US deaths in 2022?",
    clarification: "not_needed",
    pageContext: EDITOR_PAGE,
    dashboards: WORKSPACE_DASHBOARDS,
    openEditorDashboardId: COVID_2022.id,
    expectedWrite: "none",
    truth: { total: Sql.total("us_deaths", YEAR_2022) },
    grade: totalOrSum,
  },
];

/** Questions that add a block to a dashboard that is not open. */
const ELSEWHERE_QUESTIONS: readonly EvalQuestion[] = [
  {
    id: "D06",
    category: "dashboards",
    prompt: `Add this as a bar chart to ${COVID_2022_TOKEN}`,
    clarification: "not_needed",
    pageContext: EXPLORER_WITH_DEATHS_QUERY,
    mentions: [COVID_2022_MENTION],
    dashboards: WORKSPACE_DASHBOARDS,
    expectedWrite: {
      dashboardId: COVID_2022.id,
      via: "card",
      kind: "DataViz",
      checkBlock: _vizTypeIs("bar"),
    },
    truth: MONTHLY_DEATHS_2022,
    grade: _monthlyRows,
  },
  {
    id: "D07",
    category: "dashboards",
    prompt:
      "Add a chart of weekly US cases in 2022 to the COVID 2022 dashboard",
    clarification: "not_needed",
    pageContext: MAP_PAGE,
    dashboards: WORKSPACE_DASHBOARDS,
    expectedWrite: { dashboardId: COVID_2022.id, via: "card", kind: "DataViz" },
    truth: { total: Sql.total("us_cases", YEAR_2022) },
    grade: (context) => {
      return weeklyTotal(context, 52);
    },
  },
  {
    id: "D08",
    category: "dashboards",
    prompt: "Add a heading that says Spending to the Budget dashboard",
    clarification: "allowed",
    pageContext: MAP_PAGE,
    dashboards: WORKSPACE_DASHBOARDS,
    expectedWrite: "none",
    truth: {},
    grade: () => {
      return { pass: false, detail: "there is no Budget dashboard" };
    },
    gradeText: (assistantText) => {
      return NOT_FOUND_PATTERN.test(assistantText)
        ? { pass: true, detail: "said it cannot find the dashboard" }
        : { pass: false, detail: "did not say it cannot find the dashboard" };
    },
  },
  {
    id: "D09",
    category: "dashboards",
    prompt: "Add a chart of monthly US deaths in 2022 to the COVID dashboard",
    clarification: "allowed",
    user: { choose: /death/i, say: "the one with the deaths chart" },
    pageContext: MAP_PAGE,
    dashboards: SAME_NAME_DASHBOARDS,
    card: { action: "confirm", pickDashboardId: COVID_DEATHS_ID },
    expectedWrite: {
      dashboardId: COVID_DEATHS_ID,
      via: "card",
      kind: "DataViz",
    },
    truth: MONTHLY_DEATHS_2022,
    grade: _monthlyRows,
  },
];

/**
 * Questions that add a block to a dashboard: the one open in the editor,
 * a mentioned one, or one the user names. Graded on the end state: which
 * dashboard got which block, by which path.
 */
export const DASHBOARD_QUESTIONS: readonly EvalQuestion[] = [
  ...EDITOR_QUESTIONS,
  ...ELSEWHERE_QUESTIONS,
];
