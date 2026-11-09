import { ResultChecks } from "../grading/ResultChecks";
import { MatcherText } from "../grading/ResultMatchers";
import { MENTION_QUESTIONS } from "./covidMentionQuestions";
import { PAGE_QUESTIONS } from "./covidPageQuestions";
import { CovidTruthSql as Sql, US_STATE_NAMES } from "./covidTruthSql";
import type { EvalQuestion, GradeContext } from "../EvalQuestion";
import type { TruthRowSpec } from "../grading/ResultChecks";
import type { Verdict } from "../grading/ResultMatchers";

const MONTH_SERIES: TruthRowSpec = {
  keys: ["month"],
  values: ["value"],
  mode: "all",
};
const NEARLY_ALL_MONTHS: TruthRowSpec = { ...MONTH_SERIES, minShare: 0.95 };
const TOP_ONE: TruthRowSpec = {
  keys: ["name"],
  values: ["value"],
  mode: "prefix",
  prefixLength: 1,
};

function _scalar(context: GradeContext, name: string): number {
  return MatcherText.toNumber(context.truth[name]?.rows[0]?.[0]) ?? Number.NaN;
}

function _rows(
  context: GradeContext,
  name: string,
  spec: TruthRowSpec,
): () => Verdict {
  return () => {
    return ResultChecks.matchTruthRows(
      context.result,
      context.truth[name]!,
      spec,
    );
  };
}

function _value(context: GradeContext, name: string): () => Verdict {
  return () => {
    return ResultChecks.hasValue(context.result, _scalar(context, name));
  };
}

function _sum(
  context: GradeContext,
  name: string,
  tolerance = 0.001,
): () => Verdict {
  return () => {
    return ResultChecks.hasColumnSum(context.result, _scalar(context, name), {
      tolerance,
    });
  };
}

/** A total, shown either as one number or as rows that add up to it. */
function _totalOrSum(context: GradeContext, name: string): Verdict {
  return ResultChecks.anyOf([_value(context, name), _sum(context, name)]);
}

/** A weekly series: about `weekCount` rows adding up to the period's total. */
function _weeklyTotal(
  context: GradeContext,
  name: string,
  weekCount: number,
): Verdict {
  const rowCount = context.result.rows.length;
  if (Math.abs(rowCount - weekCount) > 2) {
    return {
      pass: false,
      detail: `expected about ${weekCount} weekly rows, got ${rowCount}`,
    };
  }
  return ResultChecks.hasColumnSum(context.result, _scalar(context, name), {
    tolerance: 0.05,
  });
}

const US_STATE = `"Province_State"`;
const STATES_AND_DC_SQL = [...US_STATE_NAMES, "District of Columbia"]
  .map((name) => {
    return `'${name}'`;
  })
  .join(", ");
const COUNTRY = `"Country/Region"`;
const NYC_COUNTIES = ["New York", "Kings", "Queens", "Bronx", "Richmond"];
const NYC_WHERE = `"Province_State" = 'New York' AND "Admin2" IN ('New York', 'Kings', 'Queens', 'Bronx', 'Richmond')`;

/** Basic questions: an analyst's first pass over the data. */
const BASIC_QUESTIONS: readonly EvalQuestion[] = [
  {
    id: "B01",
    category: "basic",
    prompt: "Show me monthly covid deaths in the US in 2022",
    clarification: "not_needed",
    truth: {
      us: Sql.monthly("us_deaths", `year("date") = 2022`),
      global: Sql.monthly(
        "global_deaths",
        `${COUNTRY} = 'US' AND year("date") = 2022`,
      ),
    },
    grade: (context) => {
      return ResultChecks.anyOf([
        _rows(context, "us", { ...MONTH_SERIES, exactRows: true }),
        _rows(context, "global", { ...MONTH_SERIES, exactRows: true }),
      ]);
    },
  },
  {
    id: "B02",
    category: "basic",
    prompt: "Show me monthly covid cases in California in 2022",
    clarification: "not_needed",
    truth: {
      monthly: Sql.monthly(
        "us_cases",
        `${US_STATE} = 'California' AND year("date") = 2022`,
      ),
    },
    grade: (context) => {
      return _rows(context, "monthly", { ...MONTH_SERIES, exactRows: true })();
    },
  },
  {
    id: "B03",
    category: "basic",
    prompt: "Which state had the most covid deaths?",
    clarification: "not_needed",
    truth: { top: Sql.ranked("us_deaths", US_STATE, { limit: 1 }) },
    grade: (context) => {
      return _rows(context, "top", TOP_ONE)();
    },
  },
  {
    id: "B04",
    category: "basic",
    prompt: "Which state had the most covid?",
    clarification: "allowed",
    user: { choose: /death/i, say: "deaths" },
    truth: {
      deaths: Sql.ranked("us_deaths", US_STATE, { limit: 1 }),
      cases: Sql.ranked("us_cases", US_STATE, { limit: 1 }),
    },
    grade: (context) => {
      return ResultChecks.anyOf([
        _rows(context, "deaths", TOP_ONE),
        _rows(context, "cases", TOP_ONE),
      ]);
    },
  },
  {
    id: "B05",
    category: "basic",
    prompt: "How many people died of covid in the US in total?",
    clarification: "not_needed",
    truth: { total: Sql.total("us_deaths") },
    grade: (context) => {
      return _value(context, "total")();
    },
  },
  {
    id: "B06",
    category: "basic",
    prompt: "Top 10 countries by total covid deaths",
    clarification: "not_needed",
    truth: { top: Sql.ranked("global_deaths", COUNTRY, { limit: 10 }) },
    grade: (context) => {
      return _rows(context, "top", { ...TOP_ONE, prefixLength: 10 })();
    },
  },
  {
    id: "B07",
    category: "basic",
    prompt: "What date range does the data cover?",
    clarification: "not_needed",
    truth: {
      range: `SELECT strftime(MIN("date"), '%Y-%m-%d') AS first_day, strftime(MAX("date"), '%Y-%m-%d') AS last_day FROM us_deaths`,
    },
    grade: (context) => {
      return _rows(context, "range", {
        keys: ["first_day", "last_day"],
        values: [],
        mode: "all",
      })();
    },
  },
  {
    id: "B08",
    category: "basic",
    prompt: "Show daily covid deaths in Texas in January 2021",
    clarification: "not_needed",
    truth: {
      daily: Sql.daily(
        "us_deaths",
        `${US_STATE} = 'Texas' AND strftime("date", '%Y-%m') = '2021-01'`,
      ),
    },
    grade: (context) => {
      return _rows(context, "daily", {
        keys: ["day"],
        values: ["value"],
        mode: "all",
        exactRows: true,
      })();
    },
  },
  {
    id: "B09",
    category: "basic",
    prompt: "Total covid cases in New York in 2021",
    clarification: "not_needed",
    truth: {
      total: Sql.total(
        "us_cases",
        `${US_STATE} = 'New York' AND year("date") = 2021`,
      ),
    },
    grade: (context) => {
      return _value(context, "total")();
    },
  },
  {
    id: "B10",
    category: "basic",
    prompt: "How many covid deaths were there in each year in the US?",
    clarification: "not_needed",
    truth: {
      us: `SELECT year("date") AS year, SUM(daily_new_deaths) AS value FROM us_deaths GROUP BY 1 ORDER BY 1`,
    },
    grade: (context) => {
      return _rows(context, "us", {
        keys: ["year"],
        values: ["value"],
        mode: "all",
        exactRows: true,
      })();
    },
  },
];

/** Intermediate questions: comparisons, windows, shares, and rankings. */
const INTERMEDIATE_QUESTIONS: readonly EvalQuestion[] = [
  {
    id: "I01",
    category: "intermediate",
    prompt: "Which county had the most covid deaths?",
    clarification: "not_needed",
    truth: {
      top: `SELECT "Admin2" AS name, SUM(daily_new_deaths) AS value FROM us_deaths GROUP BY "Admin2", "Province_State" ORDER BY 2 DESC LIMIT 1`,
    },
    grade: (context) => {
      return _rows(context, "top", TOP_ONE)();
    },
  },
  {
    id: "I02",
    category: "intermediate",
    prompt: "Compare monthly covid deaths in California and Texas in 2021",
    clarification: "not_needed",
    truth: {
      both: `SELECT "Province_State" AS state, strftime("date", '%Y-%m') AS month, SUM(daily_new_deaths) AS value FROM us_deaths WHERE "Province_State" IN ('California', 'Texas') AND year("date") = 2021 GROUP BY 1, 2 ORDER BY 1, 2`,
    },
    grade: (context) => {
      return _rows(context, "both", {
        keys: ["state", "month"],
        values: ["value"],
        mode: "all",
      })();
    },
  },
  {
    id: "I03",
    category: "intermediate",
    prompt: "What was the deadliest month for covid in the US?",
    clarification: "not_needed",
    truth: {
      top: `${Sql.monthly("us_deaths")} `.replace(
        "ORDER BY 1",
        "ORDER BY 2 DESC LIMIT 1",
      ),
    },
    grade: (context) => {
      return _rows(context, "top", {
        keys: ["month"],
        values: ["value"],
        mode: "prefix",
        prefixLength: 1,
      })();
    },
  },
  {
    id: "I04",
    category: "intermediate",
    prompt: "Show the 7-day rolling average of new US cases in 2022",
    clarification: "not_needed",
    truth: {
      rolling: `WITH daily AS (SELECT "date", SUM(daily_new_cases) AS cases FROM us_cases GROUP BY 1),
rolled AS (SELECT "date", AVG(cases) OVER (ORDER BY "date" ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS value FROM daily)
SELECT strftime("date", '%Y-%m-%d') AS day, value FROM rolled WHERE year("date") = 2022 ORDER BY 1`,
    },
    grade: (context) => {
      return _rows(context, "rolling", {
        keys: ["day"],
        values: ["value"],
        mode: "all",
        minShare: 0.99,
      })();
    },
  },
  {
    id: "I05",
    category: "intermediate",
    prompt: "Which day had the most new covid cases in the US?",
    clarification: "not_needed",
    truth: {
      top: Sql.daily("us_cases").replace(
        "ORDER BY 1",
        "ORDER BY 2 DESC LIMIT 1",
      ),
    },
    grade: (context) => {
      return _rows(context, "top", {
        keys: ["day"],
        values: ["value"],
        mode: "prefix",
        prefixLength: 1,
      })();
    },
  },
  {
    id: "I06",
    category: "intermediate",
    prompt: "Top 10 counties in Florida by covid cases",
    clarification: "not_needed",
    truth: {
      top: Sql.ranked("us_cases", `"Admin2"`, {
        where: `${US_STATE} = 'Florida'`,
        limit: 10,
      }),
    },
    grade: (context) => {
      return _rows(context, "top", { ...TOP_ONE, prefixLength: 10 })();
    },
  },
  {
    id: "I07",
    category: "intermediate",
    prompt: "Weekly covid deaths in the US vs the UK in 2021",
    clarification: "not_needed",
    user: { pick: ["United Kingdom"] },
    truth: {
      us: Sql.total("us_deaths", `year("date") = 2021`),
      ukAll: Sql.total(
        "global_deaths",
        `${COUNTRY} = 'United Kingdom' AND year("date") = 2021`,
      ),
      ukMain: Sql.total(
        "global_deaths",
        `${COUNTRY} = 'United Kingdom' AND "Province/State" IS NULL AND year("date") = 2021`,
      ),
    },
    grade: (context) => {
      return _gradeUsVsUk(context);
    },
  },
  {
    id: "I08",
    category: "intermediate",
    prompt: "What share of global covid deaths happened in the US?",
    clarification: "not_needed",
    truth: {
      share: `SELECT SUM(daily_new_deaths) FILTER (WHERE ${COUNTRY} = 'US') / SUM(daily_new_deaths) AS value FROM global_deaths`,
    },
    grade: (context) => {
      return ResultChecks.hasValue(context.result, _scalar(context, "share"), {
        scales: [1, 100],
        tolerance: 0.01,
      });
    },
  },
  {
    id: "I09",
    category: "intermediate",
    prompt: "Covid deaths by year for Brazil, India and Mexico",
    clarification: "not_needed",
    truth: {
      byYear: `SELECT ${COUNTRY} AS country, year("date") AS year, SUM(daily_new_deaths) AS value FROM global_deaths WHERE ${COUNTRY} IN ('Brazil', 'India', 'Mexico') GROUP BY 1, 2 ORDER BY 1, 2`,
    },
    grade: (context) => {
      return _rows(context, "byYear", {
        keys: ["country", "year"],
        values: ["value"],
        mode: "all",
      })();
    },
  },
  {
    id: "I10",
    category: "intermediate",
    prompt: "Which countries had the most covid deaths in 2020?",
    clarification: "not_needed",
    truth: {
      top: Sql.ranked("global_deaths", COUNTRY, {
        where: `year("date") = 2020`,
        limit: 3,
      }),
    },
    grade: (context) => {
      return _rows(context, "top", { ...TOP_ONE, prefixLength: 3 })();
    },
  },
];

/** Sums the result's numbers in rows or columns that name a place. */
function _sumForPlace(
  context: GradeContext,
  aliases: readonly string[],
): number[] {
  const { result } = context;
  const isPlace = (text: string): boolean => {
    const tokens = MatcherText.normalize(text).split(/[^a-z0-9]+/);
    return aliases.some((alias) => {
      return alias.includes(" ")
        ? MatcherText.normalize(text).includes(alias)
        : tokens.includes(alias);
    });
  };
  const placeRows = result.rows.filter((row) => {
    return row.some((cell) => {
      return typeof cell === "string" && isPlace(cell);
    });
  });
  const columnSums = result.columns.map((column, columnIndex) => {
    const rows = isPlace(column.name) ? result.rows : placeRows;
    return rows.reduce((sum, row) => {
      return sum + (MatcherText.toNumber(row[columnIndex]) ?? 0);
    }, 0);
  });
  return columnSums;
}

function _gradeUsVsUk(context: GradeContext): Verdict {
  const usSums = _sumForPlace(context, ["us", "usa", "united states"]);
  const ukSums = _sumForPlace(context, ["uk", "united kingdom"]);
  const isUsFound = usSums.some((sum) => {
    return MatcherText.isClose(sum, _scalar(context, "us"), 0.03);
  });
  const isUkFound = ukSums.some((sum) => {
    return (
      MatcherText.isClose(sum, _scalar(context, "ukAll"), 0.03) ||
      MatcherText.isClose(sum, _scalar(context, "ukMain"), 0.03)
    );
  });
  return {
    pass: isUsFound && isUkFound && context.result.rows.length >= 50,
    detail: `US total ${isUsFound ? "found" : "missing"}, UK total ${isUkFound ? "found" : "missing"}, ${context.result.rows.length} rows`,
  };
}

/** Hard questions: per-capita math, windows per group, cross-dataset checks. */
const HARD_QUESTIONS: readonly EvalQuestion[] = [
  {
    id: "H01",
    category: "hard",
    prompt: "Covid deaths per 100,000 people by state",
    clarification: "not_needed",
    truth: {
      perPerson: `SELECT * FROM (${Sql.deathsPerPerson()}) WHERE state IN (${STATES_AND_DC_SQL})`,
    },
    grade: (context) => {
      return _rows(context, "perPerson", {
        keys: ["state"],
        values: ["value"],
        mode: "all",
        tolerance: 0.005,
        scales: [100000],
      })();
    },
  },
  {
    id: "H02",
    category: "hard",
    prompt: "Case fatality rate by state",
    clarification: "not_needed",
    truth: {
      rate: `WITH d AS (SELECT "Province_State" AS state, SUM(daily_new_deaths) AS deaths FROM us_deaths GROUP BY 1),
c AS (SELECT "Province_State" AS state, SUM(daily_new_cases) AS cases FROM us_cases GROUP BY 1)
SELECT state, deaths / cases AS value FROM d JOIN c USING (state) WHERE cases > 0 AND state IN (${US_STATE_NAMES.map(
        (name) => {
          return `'${name}'`;
        },
      ).join(", ")}) ORDER BY 1`,
    },
    grade: (context) => {
      return _rows(context, "rate", {
        keys: ["state"],
        values: ["value"],
        mode: "all",
        tolerance: 0.01,
        scales: [1, 100],
      })();
    },
  },
  {
    id: "H03",
    category: "hard",
    prompt: "For each state, which month had the most covid cases?",
    clarification: "not_needed",
    truth: {
      peak: `WITH m AS (SELECT "Province_State" AS state, strftime("date", '%Y-%m') AS month, SUM(daily_new_cases) AS value FROM us_cases GROUP BY 1, 2),
r AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY state ORDER BY value DESC) AS rank FROM m)
SELECT state, month, value FROM r WHERE rank = 1 AND value > 0 ORDER BY state`,
    },
    grade: (context) => {
      return _rows(context, "peak", {
        keys: ["state", "month"],
        values: ["value"],
        mode: "all",
      })();
    },
  },
  {
    id: "H04",
    category: "hard",
    prompt: "Year-over-year change in covid deaths by state, 2021 vs 2022",
    clarification: "not_needed",
    truth: {
      change: `SELECT "Province_State" AS state,
  SUM(daily_new_deaths) FILTER (WHERE year("date") = 2021) AS deaths_2021,
  SUM(daily_new_deaths) FILTER (WHERE year("date") = 2022) AS deaths_2022,
  SUM(daily_new_deaths) FILTER (WHERE year("date") = 2022) - SUM(daily_new_deaths) FILTER (WHERE year("date") = 2021) AS change
FROM us_deaths WHERE "Province_State" IN (${US_STATE_NAMES.map((name) => {
        return `'${name}'`;
      }).join(", ")}) GROUP BY 1 ORDER BY 1`,
    },
    grade: (context) => {
      return ResultChecks.anyOf([
        _rows(context, "change", {
          keys: ["state"],
          values: ["deaths_2021", "deaths_2022"],
          mode: "all",
        }),
        _rows(context, "change", {
          keys: ["state"],
          values: ["change"],
          mode: "all",
        }),
      ]);
    },
  },
  {
    id: "H05",
    category: "hard",
    prompt: "Which states had more deaths in 2022 than in 2021?",
    clarification: "not_needed",
    truth: {
      states: `SELECT "Province_State" AS state FROM us_deaths GROUP BY 1
HAVING SUM(daily_new_deaths) FILTER (WHERE year("date") = 2022) > SUM(daily_new_deaths) FILTER (WHERE year("date") = 2021) ORDER BY 1`,
    },
    grade: (context) => {
      const names = context.truth.states!.rows.map((row) => {
        return String(row[0]);
      });
      return ResultChecks.hasKeySet(
        context.result,
        names.filter((name) => {
          return US_STATE_NAMES.includes(name);
        }),
        names.filter((name) => {
          return !US_STATE_NAMES.includes(name);
        }),
      );
    },
  },
  {
    id: "H06",
    category: "hard",
    prompt: "Top 10 states by covid deaths per capita in 2021",
    clarification: "not_needed",
    truth: { perPerson: Sql.deathsPerPerson(`year("date") = 2021`) },
    grade: (context) => {
      return _rows(context, "perPerson", {
        keys: ["state"],
        values: ["value"],
        mode: "prefix",
        prefixLength: 10,
        tolerance: 0.005,
        scales: [1, 100, 1000, 10000, 100000, 1000000],
      })();
    },
  },
  {
    id: "H07",
    category: "hard",
    prompt:
      "Does the US total in the global deaths file match the US deaths file?",
    clarification: "not_needed",
    truth: {
      us: Sql.total("us_deaths"),
      global: Sql.total("global_deaths", `${COUNTRY} = 'US'`),
    },
    grade: (context) => {
      const usVerdict = _value(context, "us")();
      const globalVerdict = _value(context, "global")();
      return {
        pass: usVerdict.pass && globalVerdict.pass,
        detail: `US file: ${usVerdict.detail}; global file: ${globalVerdict.detail}`,
      };
    },
  },
  {
    id: "H08",
    category: "hard",
    prompt: "Show counties in New York state with more than 1,000 covid deaths",
    clarification: "not_needed",
    truth: {
      counties: `SELECT "Admin2" AS county FROM us_deaths WHERE "Province_State" = 'New York' GROUP BY 1 HAVING SUM(daily_new_deaths) > 1000 ORDER BY 1`,
    },
    grade: (context) => {
      const names = context.truth.counties!.rows.map((row) => {
        return String(row[0]);
      });
      const isPseudoCounty = (name: string): boolean => {
        return name === "Unassigned" || name.startsWith("Out of");
      };
      return ResultChecks.hasKeySet(
        context.result,
        names.filter((name) => {
          return !isPseudoCounty(name);
        }),
        names.filter(isPseudoCounty),
      );
    },
  },
  {
    id: "H09",
    category: "hard",
    prompt: "Which 5 states had the highest single-day death count, and when?",
    clarification: "not_needed",
    truth: {
      top: `WITH d AS (SELECT "Province_State" AS state, "date", SUM(daily_new_deaths) AS value FROM us_deaths GROUP BY 1, 2),
r AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY state ORDER BY value DESC) AS rank FROM d)
SELECT state, strftime("date", '%Y-%m-%d') AS day, value FROM r WHERE rank = 1 ORDER BY value DESC LIMIT 5`,
    },
    grade: (context) => {
      return _rows(context, "top", {
        keys: ["state", "day"],
        values: ["value"],
        mode: "prefix",
        prefixLength: 5,
      })();
    },
  },
  {
    id: "H10",
    category: "hard",
    prompt: "Cumulative covid deaths in the US by month",
    clarification: "not_needed",
    truth: {
      cumulative: `SELECT month, SUM(value) OVER (ORDER BY month) AS value FROM (${Sql.monthly("us_deaths")}) ORDER BY 1`,
    },
    grade: (context) => {
      return _rows(context, "cumulative", MONTH_SERIES)();
    },
  },
];

/** Overview of a state: monthly deaths or cases, or the totals. */
function _gradeStateOverview(context: GradeContext): Verdict {
  return ResultChecks.anyOf([
    _rows(context, "deaths", NEARLY_ALL_MONTHS),
    _rows(context, "cases", NEARLY_ALL_MONTHS),
    _value(context, "totalDeaths"),
    _value(context, "totalCases"),
  ]);
}

function _stateOverviewTruth(state: string): Record<string, string> {
  const where = `${US_STATE} = '${state}'`;
  return {
    deaths: Sql.monthly("us_deaths", where),
    cases: Sql.monthly("us_cases", where),
    totalDeaths: Sql.total("us_deaths", where),
    totalCases: Sql.total("us_cases", where),
  };
}

/** Questions a non-technical user might ask, typos and all. */
const NON_TECHNICAL_QUESTIONS: readonly EvalQuestion[] = [
  {
    id: "N01",
    category: "non_technical",
    prompt: "how bad was covid in florida",
    clarification: "not_needed",
    truth: _stateOverviewTruth("Florida"),
    grade: _gradeStateOverview,
  },
  {
    id: "N02",
    category: "non_technical",
    prompt: "when was covid the worst?",
    clarification: "allowed",
    user: { choose: /\bUS\b|U\.S\.|united states/i, say: "the US" },
    truth: {
      usDeaths: Sql.monthly("us_deaths"),
      usCases: Sql.monthly("us_cases"),
      globalDeaths: Sql.monthly("global_deaths"),
      peakUsDeaths: Sql.monthly("us_deaths").replace(
        "ORDER BY 1",
        "ORDER BY 2 DESC LIMIT 1",
      ),
      peakUsCases: Sql.monthly("us_cases").replace(
        "ORDER BY 1",
        "ORDER BY 2 DESC LIMIT 1",
      ),
      peakGlobalDeaths: Sql.monthly("global_deaths").replace(
        "ORDER BY 1",
        "ORDER BY 2 DESC LIMIT 1",
      ),
      peakDays: [
        Sql.daily("us_deaths").replace("ORDER BY 1", "ORDER BY 2 DESC LIMIT 1"),
        Sql.daily("us_cases").replace("ORDER BY 1", "ORDER BY 2 DESC LIMIT 1"),
        Sql.daily("global_deaths").replace(
          "ORDER BY 1",
          "ORDER BY 2 DESC LIMIT 1",
        ),
      ]
        .map((sql) => {
          return `(${sql})`;
        })
        .join(" UNION ALL "),
    },
    grade: (context) => {
      const peak: TruthRowSpec = {
        ...MONTH_SERIES,
        mode: "prefix",
        prefixLength: 1,
      };
      return ResultChecks.anyOf([
        _rows(context, "peakDays", {
          keys: ["day"],
          values: ["value"],
          mode: "subset",
        }),
        _rows(context, "usDeaths", NEARLY_ALL_MONTHS),
        _rows(context, "usCases", NEARLY_ALL_MONTHS),
        _rows(context, "globalDeaths", NEARLY_ALL_MONTHS),
        _rows(context, "peakUsDeaths", peak),
        _rows(context, "peakUsCases", peak),
        _rows(context, "peakGlobalDeaths", peak),
      ]);
    },
  },
  {
    id: "N03",
    category: "non_technical",
    prompt: "how many people died from covid",
    clarification: "allowed",
    user: { choose: /world|global|all countries/i, say: "worldwide" },
    truth: { world: Sql.total("global_deaths"), us: Sql.total("us_deaths") },
    grade: (context) => {
      return ResultChecks.anyOf([
        _value(context, "world"),
        _value(context, "us"),
      ]);
    },
  },
  {
    id: "N04",
    category: "non_technical",
    prompt: "which country did best with covid",
    clarification: "expected",
    user: { choose: /fewest|lowest|least/i, say: "fewest total deaths" },
    truth: {
      fewest: `SELECT MIN(value) AS value FROM (${Sql.ranked("global_deaths", COUNTRY)})`,
    },
    grade: (context) => {
      return _rows(context, "fewest", {
        keys: [],
        values: ["value"],
        mode: "prefix",
        prefixLength: 1,
      })();
    },
  },
  {
    id: "N05",
    category: "non_technical",
    prompt: "covid deaths last year",
    clarification: "allowed",
    user: { choose: /\bUS\b|U\.S\.|united states/i, say: "the US" },
    truth: {
      us: Sql.total("us_deaths", `year("date") = 2022`),
      world: Sql.total("global_deaths", `year("date") = 2022`),
    },
    grade: (context) => {
      return ResultChecks.anyOf([
        _value(context, "us"),
        _sum(context, "us"),
        _value(context, "world"),
        _sum(context, "world"),
      ]);
    },
  },
  {
    id: "N06",
    category: "non_technical",
    prompt: "show me deaths in georgia",
    clarification: "expected",
    user: { choose: /state/i, say: "the US state" },
    truth: {
      total: Sql.total("us_deaths", `${US_STATE} = 'Georgia'`),
      monthly: Sql.monthly("us_deaths", `${US_STATE} = 'Georgia'`),
    },
    grade: (context) => {
      return ResultChecks.anyOf([
        _value(context, "total"),
        _sum(context, "total"),
        _rows(context, "monthly", NEARLY_ALL_MONTHS),
      ]);
    },
  },
  {
    id: "N07",
    category: "non_technical",
    prompt: "how many ppl got covid in NY",
    clarification: "not_needed",
    user: { pick: ["New York"] },
    truth: { total: Sql.total("us_cases", `${US_STATE} = 'New York'`) },
    grade: (context) => {
      return _totalOrSum(context, "total");
    },
  },
  {
    id: "N08",
    category: "non_technical",
    prompt: "covid deths in califronia 2021",
    clarification: "not_needed",
    user: { pick: ["California"] },
    truth: {
      total: Sql.total(
        "us_deaths",
        `${US_STATE} = 'California' AND year("date") = 2021`,
      ),
    },
    grade: (context) => {
      return _totalOrSum(context, "total");
    },
  },
  {
    id: "N09",
    category: "non_technical",
    prompt: "is covid getting better or worse?",
    clarification: "allowed",
    user: { choose: /\bUS\b|U\.S\.|united states/i, say: "the US" },
    truth: {
      usDeaths: Sql.monthly("us_deaths"),
      usCases: Sql.monthly("us_cases"),
      globalDeaths: Sql.monthly("global_deaths"),
      usDeathsWeekly: Sql.weekly("us_deaths"),
      usCasesWeekly: Sql.weekly("us_cases"),
      globalDeathsWeekly: Sql.weekly("global_deaths"),
    },
    grade: (context) => {
      const recentMonths: TruthRowSpec = { ...MONTH_SERIES, mode: "subset" };
      const recentWeeks: TruthRowSpec = {
        keys: ["week"],
        values: ["value"],
        mode: "subset",
      };
      return ResultChecks.anyOf([
        _rows(context, "usDeaths", recentMonths),
        _rows(context, "usCases", recentMonths),
        _rows(context, "globalDeaths", recentMonths),
        _rows(context, "usDeathsWeekly", recentWeeks),
        _rows(context, "usCasesWeekly", recentWeeks),
        _rows(context, "globalDeathsWeekly", recentWeeks),
      ]);
    },
  },
  {
    id: "N10",
    category: "non_technical",
    prompt: "make me a chart of us deaths over time",
    clarification: "not_needed",
    expectsChart: true,
    truth: {
      monthly: Sql.monthly("us_deaths"),
      weekly: Sql.weekly("us_deaths"),
      daily: Sql.daily("us_deaths"),
    },
    grade: (context) => {
      return ResultChecks.anyOf([
        _rows(context, "monthly", NEARLY_ALL_MONTHS),
        _rows(context, "weekly", {
          keys: ["week"],
          values: ["value"],
          mode: "all",
          minShare: 0.95,
        }),
        _rows(context, "daily", {
          keys: ["day"],
          values: ["value"],
          mode: "all",
          minShare: 0.95,
        }),
      ]);
    },
  },
  {
    id: "N11",
    category: "non_technical",
    prompt: "show me covid in new york city",
    clarification: "allowed",
    user: {
      choose: /all five|five boroughs|all 5|all boroughs|whole city/i,
      say: "all five boroughs",
      pick: NYC_COUNTIES,
    },
    truth: {
      deaths: Sql.monthly("us_deaths", NYC_WHERE),
      cases: Sql.monthly("us_cases", NYC_WHERE),
      countyDeaths: Sql.ranked("us_deaths", `"Admin2"`, { where: NYC_WHERE }),
      countyCases: Sql.ranked("us_cases", `"Admin2"`, { where: NYC_WHERE }),
      totalDeaths: Sql.total("us_deaths", NYC_WHERE),
      totalCases: Sql.total("us_cases", NYC_WHERE),
    },
    grade: (context) => {
      const counties: TruthRowSpec = {
        keys: ["name"],
        values: ["value"],
        mode: "all",
      };
      return ResultChecks.anyOf([
        _rows(context, "deaths", NEARLY_ALL_MONTHS),
        _rows(context, "cases", NEARLY_ALL_MONTHS),
        _rows(context, "countyDeaths", counties),
        _rows(context, "countyCases", counties),
        _value(context, "totalDeaths"),
        _value(context, "totalCases"),
      ]);
    },
  },
  {
    id: "N12",
    category: "non_technical",
    prompt: "what about texas?",
    followsId: "N01",
    clarification: "not_needed",
    truth: _stateOverviewTruth("Texas"),
    grade: _gradeStateOverview,
  },
];

const TEXAS_2022 = `${US_STATE} = 'Texas' AND year("date") = 2022`;

/** Follow-ups that must carry the place, period, and grain forward. */
const FOLLOW_UP_QUESTIONS: readonly EvalQuestion[] = [
  {
    id: "F01",
    category: "follow_up",
    prompt: "now do the same for Texas",
    followsId: "B02",
    clarification: "not_needed",
    truth: { monthly: Sql.monthly("us_cases", TEXAS_2022) },
    grade: (context) => {
      return _rows(context, "monthly", { ...MONTH_SERIES, exactRows: true })();
    },
  },
  {
    id: "F02",
    category: "follow_up",
    prompt: "make it weekly instead",
    followsId: "F01",
    clarification: "not_needed",
    truth: { total: Sql.total("us_cases", TEXAS_2022) },
    grade: (context) => {
      return _weeklyTotal(context, "total", 52);
    },
  },
  {
    id: "F03",
    category: "follow_up",
    prompt: "only show the first half of the year",
    followsId: "F02",
    clarification: "not_needed",
    truth: {
      total: Sql.total("us_cases", `${TEXAS_2022} AND month("date") <= 6`),
    },
    grade: (context) => {
      return _weeklyTotal(context, "total", 26);
    },
  },
];

/** Every COVID question, in the order the eval asks them. */
export const COVID_QUESTIONS: readonly EvalQuestion[] = [
  ...BASIC_QUESTIONS,
  ...INTERMEDIATE_QUESTIONS,
  ...HARD_QUESTIONS,
  ...NON_TECHNICAL_QUESTIONS,
  ...FOLLOW_UP_QUESTIONS,
  ...PAGE_QUESTIONS,
  ...MENTION_QUESTIONS,
];
