import {
  arr,
  bool,
  int,
  obj,
  oneOf,
  opt,
  str,
} from "@earendil-works/pi-schema";
import type { Static } from "@earendil-works/pi-schema";

/** The time buckets a plan can group by. */
export const QUERY_PLAN_TIME_GRAINS = [
  "none",
  "day",
  "week",
  "month",
  "year",
] as const;

/** Periods counted back from the data's own latest date. */
export const QUERY_PLAN_RELATIVE_PERIODS = [
  "none",
  "last_full_year",
  "last_12_months",
  "last_30_days",
  "latest_day",
] as const;

/** Calculations a plan can apply on top of its measures. */
export const QUERY_PLAN_CALCULATIONS = [
  "none",
  "per_person",
  "ratio",
  "rolling_7_day_average",
  "running_total",
] as const;

/**
 * The arguments of the `plan_query` tool: a question described as measures,
 * filters, a period, groups, a calculation, and an order, which code turns
 * into SQL. A small model fills these slots far more reliably than it writes
 * SQL with CTEs and window functions.
 */
export const QUERY_PLAN_PARAMETERS = obj({
  measures: arr(
    obj({
      table: str({ description: "Dataset alias, such as t0." }),
      column: str({ description: "A number column to add up." }),
      name: str({ description: "Short output name, such as deaths." }),
      aggregate: opt(
        oneOf(["sum", "average", "max", "min", "count"], {
          description: "How to combine rows. Default sum.",
        }),
      ),
    }),
    {
      description:
        "1 to 3 numbers to show. Measures from different datasets are lined up by period and groups.",
    },
  ),
  filters: arr(
    obj({
      column: str({ description: "A text column." }),
      values: arr(str(), {
        description: "Stored values to keep, spelled exactly as listed.",
      }),
    }),
    { description: "Rows to keep. Empty for no filter." },
  ),
  from: str({
    description:
      "First date to include, YYYY-MM-DD, or empty. Only when the user names a period.",
  }),
  to: str({
    description:
      "First date after the period, YYYY-MM-DD (2021 is from 2021-01-01 to 2022-01-01), or empty.",
  }),
  relativePeriod: oneOf(QUERY_PLAN_RELATIVE_PERIODS, {
    description:
      "For 'last year', 'recently', 'latest': counted back from the data's latest date. Otherwise none.",
  }),
  timeGrain: oneOf(QUERY_PLAN_TIME_GRAINS, {
    description: "Time bucket for a series over time; none for a total.",
  }),
  groupBy: arr(str(), {
    description: "Text columns to break the result down by, such as a state.",
  }),
  calculation: oneOf(QUERY_PLAN_CALCULATIONS, {
    description:
      "per_person: first measure divided by population; ratio: first measure divided by the second; rolling_7_day_average and running_total: over time.",
  }),
  populationColumn: str({
    description: "For per_person: the column holding population, else empty.",
  }),
  order: oneOf(["time", "highest", "lowest"], {
    description: "time for a series; highest or lowest to rank.",
  }),
  limit: int({
    description: "How many rows to keep after ranking; 0 for all.",
  }),
  onePerGroup: bool({
    description:
      "True to keep only each group's single top row, such as each state's worst day.",
  }),
  summary: str({
    description:
      "One plain sentence for the user: what the result shows and the choices made.",
  }),
  chart: opt(
    oneOf(["bar", "line", "area", "scatter", "pie"], {
      description: "Only when the user asked for a chart, graph, or plot.",
    }),
  ),
});

/** A query described as slots instead of SQL. */
export type QueryPlan = Static<typeof QUERY_PLAN_PARAMETERS>;
