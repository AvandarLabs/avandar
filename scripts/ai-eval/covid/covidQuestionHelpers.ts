import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias";
import { ResultChecks } from "../grading/ResultChecks";
import { MatcherText } from "../grading/ResultMatchers";
import { COVID_DATASETS } from "./covidWorkspace";
import type { GradeContext } from "../EvalQuestion";
import type { Verdict } from "../grading/ResultMatchers";

const ALIASES = SqlTableAlias.fromDatasets(COVID_DATASETS);

/** The table alias the app gives a COVID dataset, by its file name. */
export function aliasOf(fileName: string): string {
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

export const US_DEATHS = aliasOf("long-us-deaths.csv");
export const US_CASES = aliasOf("long-us-confirmed-cases.csv");

/** The COVID dataset with this file name, as the page context names it. */
export function datasetOf(fileName: string): { id: string; name: string } {
  const dataset = COVID_DATASETS.find((candidate) => {
    return candidate.fileName === fileName;
  });
  if (!dataset) {
    throw new Error(`No COVID dataset named ${fileName}`);
  }
  return { id: dataset.id, name: dataset.name };
}

/** Page SQL as the app stores it: written with aliases, then resolved. */
export function toStoredSql(sql: string): string {
  return SqlTableAlias.applyToSql(sql, ALIASES);
}

export function monthlyIn2022(
  table: string,
  measure: string,
  label: string,
): string {
  return toStoredSql(
    `SELECT date_trunc('month', "date") AS "month", SUM("${measure}") AS "${label}" FROM "${table}" WHERE year("date") = 2022 GROUP BY 1 ORDER BY 1`,
  );
}

export const CASES_TILE = {
  title: "Monthly US cases in 2022",
  chartType: "bar",
  sql: monthlyIn2022(US_CASES, "daily_new_cases", "cases"),
};
export const DEATHS_TILE = {
  title: "Monthly US deaths in 2022",
  chartType: "line",
  sql: monthlyIn2022(US_DEATHS, "daily_new_deaths", "deaths"),
};

/** Kings County, New York (Brooklyn), in the us deaths data. */
export const KINGS_COUNTY_2022 = `"Admin2" = 'Kings' AND "Province_State" = 'New York' AND year("date") = 2022`;

/** The first cell of a truth result as a number, or NaN when absent. */
export function firstScalar(context: GradeContext, name: string): number {
  return MatcherText.toNumber(context.truth[name]?.rows[0]?.[0]) ?? Number.NaN;
}

/** A weekly series: about `weekCount` rows adding up to the period total. */
export function weeklyTotal(context: GradeContext, weekCount: number): Verdict {
  const rowCount = context.result.rows.length;
  if (Math.abs(rowCount - weekCount) > 2) {
    return {
      pass: false,
      detail: `expected about ${weekCount} weekly rows, got ${rowCount}`,
    };
  }
  return ResultChecks.hasColumnSum(
    context.result,
    firstScalar(context, "total"),
    {
      tolerance: 0.05,
    },
  );
}

/** A total, shown either as one number or as rows that add up to it. */
export function totalOrSum(context: GradeContext): Verdict {
  const total = firstScalar(context, "total");
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
