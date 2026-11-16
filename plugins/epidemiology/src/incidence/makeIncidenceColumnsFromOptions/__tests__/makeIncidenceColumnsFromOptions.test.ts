import { describe, expect, it } from "vitest";
import { makeIncidenceColumnsFromOptions } from "../makeIncidenceColumnsFromOptions";
import type {
  IncidenceBase,
  PopulationSource,
} from "../makeIncidenceColumnsFromOptions";
import type { DerivedColumn } from "@avandar/plugin-sdk";

const POPULATION_COLUMN: PopulationSource = {
  kind: "column",
  columnName: "pop_2024",
};

function _makeColumns(
  options: Readonly<{ population?: PopulationSource; base?: IncidenceBase }>,
): readonly DerivedColumn[] {
  return makeIncidenceColumnsFromOptions({
    casesColumn: "case_count",
    population: options.population ?? POPULATION_COLUMN,
    base: options.base ?? 100_000,
  });
}

function _getPlaceholderNames(expression: string): string[] {
  return [...expression.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)].map(
    (match) => {
      return match[1] ?? "";
    },
  );
}

describe("makeIncidenceColumnsFromOptions", () => {
  it.each([
    [1_000, "incidence_per_1k"],
    [10_000, "incidence_per_10k"],
    [100_000, "incidence_per_100k"],
    [1_000_000, "incidence_per_1m"],
  ] as const)("names the columns after a base of %i", (base, rateName) => {
    const names = _makeColumns({ base }).map((column) => {
      return column.name;
    });
    expect(names).toEqual([rateName, `${rateName}_lower`, `${rateName}_upper`]);
  });

  it("writes the rate as cases times the base over the population", () => {
    const [rate] = _makeColumns({});
    expect(rate?.expression).toBe(
      "{cases} * 100000.0 / NULLIF({population}, 0)",
    );
  });

  it.each([1_000, 10_000, 100_000, 1_000_000] as const)(
    "scales all three columns by a base of %i as a decimal literal",
    (base) => {
      _makeColumns({ base }).forEach((column) => {
        expect(column.expression).toContain(
          `* ${base}.0 / NULLIF({population}, 0)`,
        );
      });
    },
  );

  it("binds cases and a population column as inputs", () => {
    _makeColumns({}).forEach((column) => {
      expect(column.inputs).toEqual({
        cases: "case_count",
        population: "pop_2024",
      });
    });
  });

  it("binds every placeholder an expression uses", () => {
    [POPULATION_COLUMN, { kind: "fixed", value: 8_336_817 } as const].forEach(
      (population) => {
        _makeColumns({ population }).forEach((column) => {
          _getPlaceholderNames(column.expression).forEach((name) => {
            expect(Object.keys(column.inputs)).toContain(name);
          });
        });
      },
    );
  });

  it("writes a fixed population into the expressions as a number", () => {
    const columns = _makeColumns({
      population: { kind: "fixed", value: 8_336_817 },
    });
    columns.forEach((column) => {
      expect(column.expression).toContain("NULLIF(8336817, 0)");
      expect(column.expression).not.toContain("{population}");
      expect(column.inputs).toEqual({ cases: "case_count" });
    });
  });

  it("uses decimal literals in the Byar bounds", () => {
    const [, lower, upper] = _makeColumns({});
    [lower, upper].forEach((column) => {
      expect(column?.expression).toContain("9.0 * ");
      expect(column?.expression).toContain("1.96 / (3.0 * sqrt(");
    });
  });

  it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects a fixed population of %s",
    (value) => {
      expect(() => {
        _makeColumns({ population: { kind: "fixed", value } });
      }).toThrow(RangeError);
    },
  );
});
