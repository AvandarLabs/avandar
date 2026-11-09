import type { DerivedColumn } from "@avandar/plugin-sdk";

/** How many people an incidence rate is expressed per. */
export type IncidenceBase = 1_000 | 10_000 | 100_000 | 1_000_000;

/**
 * Where an incidence rate's population comes from: a numeric column of the
 * result, one value per row, or one fixed number for every row, such as a
 * city's census population.
 */
export type PopulationSource =
  | Readonly<{ kind: "column"; columnName: string }>
  | Readonly<{ kind: "fixed"; value: number }>;

/** The part of each column name that says which base it uses. */
const BASE_NAME_SUFFIXES: Record<IncidenceBase, string> = {
  1_000: "1k",
  10_000: "10k",
  100_000: "100k",
  1_000_000: "1m",
};

/** The normal quantile for a two-sided 95% interval. */
const Z_95 = "1.96";

/**
 * Byar's lower limit, in cases. Zero cases has a lower limit of 0, and a
 * negative count has none, since DuckDB fails a query that takes the square
 * root of a negative number.
 */
const BYAR_LOWER_CASES_SQL = [
  "CASE WHEN {cases} < 0 THEN NULL WHEN {cases} = 0 THEN 0.0",
  `ELSE {cases} * power(1.0 - 1.0 / (9.0 * {cases}) - ${Z_95} / (3.0 * sqrt({cases})), 3) END`,
].join(" ");

/** Byar's upper limit, in cases. A negative count has none. */
const BYAR_UPPER_CASES_SQL = [
  "CASE WHEN {cases} < 0 THEN NULL",
  `ELSE ({cases} + 1) * power(1.0 - 1.0 / (9.0 * ({cases} + 1)) + ${Z_95} / (3.0 * sqrt({cases} + 1)), 3) END`,
].join(" ");

function _getPopulationSqlFromSource(population: PopulationSource): string {
  if (population.kind === "column") {
    return "{population}";
  }
  if (!Number.isFinite(population.value) || population.value <= 0) {
    throw new RangeError(
      `A fixed population must be a positive number, not ${population.value}`,
    );
  }
  return String(population.value);
}

function _getInputsFromOptions(
  options: Readonly<{ casesColumn: string; population: PopulationSource }>,
): Record<string, string> {
  const { casesColumn, population } = options;
  return population.kind === "column"
    ? { cases: casesColumn, population: population.columnName }
    : { cases: casesColumn };
}

/**
 * Makes the three columns the "Incidence per 100k" command adds: the rate
 * per `base` people and the lower and upper limits of its 95% confidence
 * interval, from Byar's approximation of the exact Poisson interval. They are
 * named after the base, such as `incidence_per_100k`,
 * `incidence_per_100k_lower`, and `incidence_per_100k_upper`.
 *
 * A row with a missing or zero population gets NULL in all three. A fixed
 * population is written into the SQL as a number and must be positive.
 */
export function makeIncidenceColumnsFromOptions(
  options: Readonly<{
    casesColumn: string;
    population: PopulationSource;
    base: IncidenceBase;
  }>,
): readonly DerivedColumn[] {
  const { base } = options;
  const name = `incidence_per_${BASE_NAME_SUFFIXES[base]}`;
  // The decimal base keeps the arithmetic in floating point, so whole-number
  // columns never divide as integers.
  const scale = `* ${base}.0 / NULLIF(${_getPopulationSqlFromSource(options.population)}, 0)`;
  const inputs = _getInputsFromOptions(options);
  return [
    { name, expression: `{cases} ${scale}`, inputs },
    {
      name: `${name}_lower`,
      expression: `(${BYAR_LOWER_CASES_SQL}) ${scale}`,
      inputs,
    },
    {
      name: `${name}_upper`,
      expression: `(${BYAR_UPPER_CASES_SQL}) ${scale}`,
      inputs,
    },
  ];
}
