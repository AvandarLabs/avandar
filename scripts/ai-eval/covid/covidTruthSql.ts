/**
 * Ground-truth SQL builders over the eval's `us_deaths`, `us_cases`, and
 * `global_deaths` views. Months are `YYYY-MM` text and days `YYYY-MM-DD`
 * text, so graders can find them in any result format.
 */

type View = "us_deaths" | "us_cases" | "global_deaths";

function _measureOf(view: View): string {
  return view === "us_cases" ? "daily_new_cases" : "daily_new_deaths";
}

/** Monthly totals, as `month` and `value`. */
function _monthly(view: View, where = "true"): string {
  return `SELECT strftime("date", '%Y-%m') AS month, SUM(${_measureOf(view)}) AS value FROM ${view} WHERE ${where} GROUP BY 1 ORDER BY 1`;
}

/** Weekly totals by Monday week start, as `week` and `value`. */
function _weekly(view: View, where = "true"): string {
  return `SELECT strftime(date_trunc('week', "date"), '%Y-%m-%d') AS week, SUM(${_measureOf(view)}) AS value FROM ${view} WHERE ${where} GROUP BY 1 ORDER BY 1`;
}

/** Daily totals, as `day` and `value`. */
function _daily(view: View, where = "true"): string {
  return `SELECT strftime("date", '%Y-%m-%d') AS day, SUM(${_measureOf(view)}) AS value FROM ${view} WHERE ${where} GROUP BY 1 ORDER BY 1`;
}

/** One total, as `value`. */
function _total(view: View, where = "true"): string {
  return `SELECT SUM(${_measureOf(view)}) AS value FROM ${view} WHERE ${where}`;
}

/** Totals per group, largest first, as `name` and `value`. */
function _ranked(
  view: View,
  groupColumn: string,
  options: Readonly<{ where?: string; limit?: number }> = {},
): string {
  const limit = options.limit === undefined ? "" : ` LIMIT ${options.limit}`;
  return `SELECT ${groupColumn} AS name, SUM(${_measureOf(view)}) AS value FROM ${view} WHERE ${options.where ?? "true"} GROUP BY 1 ORDER BY 2 DESC${limit}`;
}

/**
 * Each US state's population, taken once per county (the value repeats on
 * every daily row) and then added up.
 */
const STATE_POPULATION_CTE = `state_population AS (
  SELECT state, SUM(population) AS population
  FROM (SELECT "Province_State" AS state, "UID", MAX("Population") AS population FROM us_deaths GROUP BY 1, 2)
  GROUP BY 1
)`;

/** Deaths per person by state over a period, as `state` and `value`. */
function _deathsPerPerson(where = "true"): string {
  return `WITH ${STATE_POPULATION_CTE},
state_deaths AS (SELECT "Province_State" AS state, SUM(daily_new_deaths) AS deaths FROM us_deaths WHERE ${where} GROUP BY 1)
SELECT d.state, d.deaths / p.population AS value FROM state_deaths d JOIN state_population p USING (state) WHERE p.population > 0 ORDER BY 2 DESC`;
}

/** Truth SQL builders for the COVID questions. */
export const CovidTruthSql = {
  monthly: _monthly,
  weekly: _weekly,
  daily: _daily,
  total: _total,
  ranked: _ranked,
  deathsPerPerson: _deathsPerPerson,
};

/** The 50 US states, for questions that may or may not include territories. */
export const US_STATE_NAMES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];
