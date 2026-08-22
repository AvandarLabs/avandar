import type { QueryFilterRule } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import type { RenderFilterRuleOptions } from "$/models/queries/StructuredQuery/renderFilterRule/renderFilterRule.ts";

import { describe, expect, it } from "vitest";

import { renderFilterRule } from "$/models/queries/StructuredQuery/renderFilterRule/renderFilterRule.ts";

function _render(
  overrides: Partial<QueryFilterRule>,
  options?: RenderFilterRuleOptions,
) {
  const rule: QueryFilterRule = {
    type: "rule",
    columnName: "Admin2",
    columnDataType: "varchar",
    operator: "=",
    value: "Alameda",
    ...overrides,
  };
  return renderFilterRule(rule, options);
}

describe("renderFilterRule, text comparison", () => {
  it("folds case by default", () => {
    expect(_render({})).toEqual({
      sql: 'lower("Admin2") = lower(?)',
      bindings: ["Alameda"],
    });
  });

  it("compares exactly when Match case is on", () => {
    expect(_render({ matchCase: true })).toEqual({
      sql: '"Admin2" = ?',
      bindings: ["Alameda"],
    });
  });

  it("renders inequality", () => {
    expect(_render({ operator: "!=" })?.sql).toBe(
      'lower("Admin2") <> lower(?)',
    );
  });
});

describe("renderFilterRule, substring operators", () => {
  it("renders contains as a function, not a pattern", () => {
    expect(_render({ operator: "contains", value: "san" })).toEqual({
      sql: 'contains(lower("Admin2"), lower(?))',
      bindings: ["san"],
    });
  });

  it("treats a percent sign in the value as a literal character", () => {
    expect(_render({ operator: "contains", value: "50%" })?.bindings).toEqual([
      "50%",
    ]);
  });

  it("negates with NOT", () => {
    expect(_render({ operator: "not_contains", value: "san" })?.sql).toBe(
      'NOT contains(lower("Admin2"), lower(?))',
    );
  });

  it("renders starts_with and ends_with", () => {
    expect(
      _render({ operator: "starts_with", value: "San", matchCase: true })?.sql,
    ).toBe('starts_with("Admin2", ?)');
    expect(_render({ operator: "ends_with", value: "o" })?.sql).toBe(
      'ends_with(lower("Admin2"), lower(?))',
    );
  });
});

describe("renderFilterRule, numeric and temporal literals", () => {
  it("binds numeric values as numbers", () => {
    expect(
      _render({
        columnName: "daily_new_cases",
        columnDataType: "bigint",
        operator: ">",
        value: "1000",
      }),
    ).toEqual({ sql: '"daily_new_cases" > ?', bindings: [1000] });
  });

  it("casts temporal values", () => {
    expect(
      _render({
        columnName: "date",
        columnDataType: "date",
        operator: ">",
        value: "2020-01-01",
      }),
    ).toEqual({
      sql: '"date" > CAST(? AS DATE)',
      bindings: ["2020-01-01"],
    });
  });

  it("casts timestamps as TIMESTAMP", () => {
    expect(
      _render({
        columnName: "seen_at",
        columnDataType: "timestamp",
        operator: "<=",
        value: "2020-01-01 10:00:00",
      })?.sql,
    ).toBe('"seen_at" <= CAST(? AS TIMESTAMP)');
  });

  it("prefers a live columnTypes override over the stored type", () => {
    expect(
      _render(
        {
          columnName: "cases",
          columnDataType: "varchar",
          operator: ">",
          value: "5",
        },
        { columnTypes: { cases: "bigint" } },
      ),
    ).toEqual({ sql: '"cases" > ?', bindings: [5] });
  });
});

describe("renderFilterRule, list and range operators", () => {
  it("renders a case-folded IN list", () => {
    expect(_render({ operator: "in", value: ["Alameda", "Butte"] })).toEqual({
      sql: 'lower("Admin2") IN (lower(?), lower(?))',
      bindings: ["Alameda", "Butte"],
    });
  });

  it("keeps a value containing a comma as one item", () => {
    expect(
      _render({ operator: "in", value: ["Korea, North"] })?.bindings,
    ).toEqual(["Korea, North"]);
  });

  it("renders NOT IN", () => {
    expect(_render({ operator: "not_in", value: ["a"] })?.sql).toBe(
      'lower("Admin2") NOT IN (lower(?))',
    );
  });

  it("renders BETWEEN and NOT BETWEEN with numeric bindings", () => {
    const numeric = {
      columnName: "daily_new_cases",
      columnDataType: "bigint",
    } as const;
    expect(
      _render({ ...numeric, operator: "between", value: [100, 200] }),
    ).toEqual({
      sql: '"daily_new_cases" BETWEEN ? AND ?',
      bindings: [100, 200],
    });
    expect(
      _render({ ...numeric, operator: "not_between", value: [100, 200] })?.sql,
    ).toBe('"daily_new_cases" NOT BETWEEN ? AND ?');
  });
});

describe("renderFilterRule, valueless operators", () => {
  it("renders null checks", () => {
    expect(_render({ operator: "is_null", value: null })).toEqual({
      sql: '"Admin2" IS NULL',
      bindings: [],
    });
    expect(_render({ operator: "is_not_null", value: null })?.sql).toBe(
      '"Admin2" IS NOT NULL',
    );
  });

  it("renders blank checks that also catch NULL and whitespace", () => {
    expect(_render({ operator: "is_blank", value: null })?.sql).toBe(
      `coalesce(trim("Admin2"), '') = ''`,
    );
    expect(_render({ operator: "is_not_blank", value: null })?.sql).toBe(
      `coalesce(trim("Admin2"), '') <> ''`,
    );
  });

  it("renders boolean checks", () => {
    expect(
      _render({
        columnName: "is_active",
        columnDataType: "boolean",
        operator: "is_true",
        value: null,
      })?.sql,
    ).toBe('"is_active" IS TRUE');
    expect(
      _render({
        columnName: "is_active",
        columnDataType: "boolean",
        operator: "is_false",
        value: null,
      })?.sql,
    ).toBe('"is_active" IS FALSE');
  });
});

describe("renderFilterRule, regex and legacy operators", () => {
  it("renders regexp_matches", () => {
    expect(_render({ operator: "matches_regex", value: "^San" })).toEqual({
      sql: 'regexp_matches("Admin2", ?)',
      bindings: ["^San"],
    });
    expect(_render({ operator: "not_matches_regex", value: "^San" })?.sql).toBe(
      'NOT regexp_matches("Admin2", ?)',
    );
  });

  it("renders legacy like rules unchanged: raw pattern, case sensitive", () => {
    expect(_render({ operator: "like", value: "San%" })).toEqual({
      sql: '"Admin2" LIKE ?',
      bindings: ["San%"],
    });
    expect(_render({ operator: "not_like", value: "San%" })?.sql).toBe(
      '"Admin2" NOT LIKE ?',
    );
  });
});

describe("renderFilterRule, exclusions", () => {
  it("returns undefined for an incomplete rule", () => {
    expect(_render({ value: "" })).toBeUndefined();
    expect(_render({ operator: "in", value: [] })).toBeUndefined();
    expect(_render({ operator: "between", value: [1] })).toBeUndefined();
  });

  it("returns undefined for a rule that fails validation", () => {
    // An invalid rule is excluded rather than sent to DuckDB, where it
    // would fail with a conversion error the user did not ask for.
    expect(
      _render({
        columnName: "daily_new_cases",
        columnDataType: "bigint",
        operator: "=",
        value: "abc",
      }),
    ).toBeUndefined();
    expect(_render({ operator: "matches_regex", value: "a(" })).toBeUndefined();
    expect(
      _render({
        columnName: "daily_new_cases",
        columnDataType: "bigint",
        operator: "between",
        value: [200, 100],
      }),
    ).toBeUndefined();
  });

  it("honours a columnTypes override when validating", () => {
    // The live type says numeric, so a letter is invalid even though the rule
    // was authored against a text column.
    expect(
      _render(
        { columnName: "cases", columnDataType: "varchar", value: "abc" },
        { columnTypes: { cases: "bigint" } },
      ),
    ).toBeUndefined();
  });

  it("quotes identifiers that contain punctuation", () => {
    expect(_render({ columnName: "Country/Region", value: "Chad" })?.sql).toBe(
      'lower("Country/Region") = lower(?)',
    );
  });
});
