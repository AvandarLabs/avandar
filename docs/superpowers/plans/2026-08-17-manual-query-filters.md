# Manual Query Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Data Explorer's manual filter panel produce correct SQL, keep its state trustworthy, and be readable and typeable, fixing all 35 findings in the review in one delivery.

**Architecture:** A single operator catalog in `shared/models/queries/StructuredQuery/` becomes the source of truth for which operators exist, which column types they apply to, what value shape they take, and how they render to DuckDB SQL. One renderer serves both `WHERE` and `HAVING`. `react-querybuilder` keeps owning the tree; we own the rendered controls, hold the tree in local state so typing does not remount inputs, and commit upward debounced and gated on rule validity. Filters address any dataset column, not just the displayed ones.

**Tech Stack:** TypeScript, React 19, Mantine 9.2 (`@mantine/dates` is **not** a dependency, so date inputs use `TextInput type="date"`), `react-querybuilder` 8.20 with `@react-querybuilder/mantine`, knex (SQL string building), `node-sql-parser` 5 (SQL to form), DuckDB WASM, vitest, Playwright, Lingui.

**Spec:** `docs/superpowers/specs/2026-08-17-manual-query-filters-design.md`
**Findings:** `docs/superpowers/2026-08-17-manual-query-filters-review.md`

---

## File Structure

**Create (shared, pure logic):**

| Path | Responsibility |
|---|---|
| `shared/models/queries/StructuredQuery/QueryFilterOperator.ts` | The operator catalog: spec per operator (arity, which `AvaDataType`s it applies to, whether `Match case` applies, whether it is legacy), plus `operatorsForDataType` and `operatorSpec` lookups |
| `shared/models/queries/StructuredQuery/QueryFilterValue.ts` | Tolerant value accessors (`filterValueAsScalar`, `filterValueAsList`, `filterValueAsPair`) and literal coercion by data type |
| `shared/models/queries/StructuredQuery/QueryFilterValidation.ts` | `isFilterRuleComplete`, `validateFilterRule`, and the `QueryFilterValidationReason` union |
| `shared/models/queries/StructuredQuery/renderFilterRule.ts` | The single rule-to-SQL renderer, returning `{ sql, bindings }` |
| `shared/copy/queryFilterOperatorLabel.ts` | Localized operator labels, type-aware (`=` reads "on" for dates) |
| `shared/copy/queryFilterValidationLabel.ts` | Localized validation messages |

**Create (web):**

| Path | Responsibility |
|---|---|
| `src/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversion.ts` | Conversion between our `QueryFilterGroup` and the library tree, preserving node ids |
| `src/views/DataExplorerApp/QueryForm/QueryFiltersField/useFilterTreeState.ts` | Local library-tree state, debounced commit, external resync |
| `src/views/DataExplorerApp/QueryForm/QueryFiltersField/FilterRuleRow.tsx` | Custom rule renderer: one row, labels, match-case toggle, remove |
| `src/views/DataExplorerApp/QueryForm/QueryFiltersField/FilterValueEditor.tsx` | Typed value editors: text, number, date, boolean, chip list, bound pair |
| `src/views/DataExplorerApp/QueryForm/QueryFiltersField/AppliedFilterSummary.tsx` | "N applied, M not applied" line with reasons |
| `src/views/DataExplorerApp/useQueryColumnsForDataSource.ts` | Extracted hook loading every column for a data source |
| `src/views/DataExplorerApp/QueryResultsError/QueryResultsError.tsx` | Query error surface for the results area |

**Modify:**

| Path | Change |
|---|---|
| `shared/models/queries/StructuredQuery/QueryFilter.types.ts` | Extend the operator union; add `id`, `columnDataType`, `matchCase`; add `makeQueryFilterNodeId` |
| `shared/models/queries/StructuredQuery/structuredQueryToSql/applyFilters.ts` | Delegate to `renderFilterRule`; skip incomplete rules |
| `shared/models/queries/StructuredQuery/structuredQueryToSql/applyHaving.ts` | Delegate to `renderFilterRule` |
| `shared/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql.ts` | Accept an optional `columnTypes` override |
| `shared/models/queries/StructuredQuery/sqlToStructuredQuery/sqlAstReaders.ts` | Recognize the new AST shapes |
| `shared/models/queries/StructuredQuery/sqlToStructuredQuery/parseFilterClauses.ts` | Parse function-form predicates, `IS TRUE/FALSE`, `NOT BETWEEN`, `lower()` wrappers |
| `src/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField.tsx` | Rewire to the catalog, local state, custom controls |
| `src/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField.module.css` | Row layout, hierarchy rails, scroll area |
| `src/views/DataExplorerApp/QueryForm/ManualQueryForm/ManualQueryForm.tsx` | Un-gate the filters group; pass dataset columns; render the applied summary |
| `src/views/DataExplorerApp/QueryColumnMultiSelect/QueryColumnMultiSelect.tsx` | Consume the extracted column hook |
| `src/views/DataExplorerApp/QueryForm/useManualQueryDataSourceChange.ts` | Reconcile filters when the data source changes |
| `src/views/DataExplorerApp/DataExplorerApp.tsx` | Render `QueryResultsError` |
| `src/views/DashboardApp/AvaPage/pfields/NLQueryPField/NLQueryPField.tsx` | Render `QueryResultsError` in the dashboard host |

**Test files:**

`QueryFilterOperator.test.ts`, `QueryFilterValue.test.ts`, `QueryFilterValidation.test.ts`, `renderFilterRule.test.ts`, `filterRoundTrip.test.ts` (all colocated in `shared/models/queries/StructuredQuery/`), `filterTreeConversion.test.ts`, `useFilterTreeState.test.tsx`, `QueryFiltersField.test.tsx`, and `tests/e2e/data-explorer-filters.spec.ts`.

**Commands used throughout:**

- Single vitest file: `npx vitest run <path>`
- Type check: `pnpm type-check`
- Lint: `pnpm lint`
- E2E single spec: `npx playwright test tests/e2e/data-explorer-filters.spec.ts`

---

## Task 1: Operator catalog

**Files:**
- Modify: `shared/models/queries/StructuredQuery/QueryFilter.types.ts`
- Create: `shared/models/queries/StructuredQuery/QueryFilterOperator.ts`
- Test: `shared/models/queries/StructuredQuery/QueryFilterOperator.test.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/models/queries/StructuredQuery/QueryFilterOperator.test.ts`:

```ts
import {
  QUERY_FILTER_OPERATOR_SPECS,
  operatorSpec,
  operatorsForDataType,
} from "$/models/queries/StructuredQuery/QueryFilterOperator.ts";
import { describe, expect, it } from "vitest";

describe("operatorsForDataType", () => {
  it("offers text operators for varchar and not numeric ranges", () => {
    const operators = operatorsForDataType("varchar");
    expect(operators).toContain("contains");
    expect(operators).toContain("starts_with");
    expect(operators).toContain("is_blank");
    expect(operators).not.toContain("between");
    expect(operators).not.toContain("is_true");
  });

  it("offers range operators for numbers and not text matching", () => {
    const operators = operatorsForDataType("bigint");
    expect(operators).toContain("between");
    expect(operators).toContain("not_between");
    expect(operators).toContain(">=");
    expect(operators).not.toContain("contains");
    expect(operators).not.toContain("is_blank");
  });

  it("offers range operators for temporal types", () => {
    expect(operatorsForDataType("date")).toContain("between");
    expect(operatorsForDataType("timestamp")).toContain(">");
    expect(operatorsForDataType("time")).toContain("<=");
  });

  it("offers boolean operators only for boolean", () => {
    expect(operatorsForDataType("boolean")).toContain("is_true");
    expect(operatorsForDataType("boolean")).toContain("is_false");
    expect(operatorsForDataType("varchar")).not.toContain("is_true");
  });

  it("offers null checks for every type", () => {
    (["varchar", "bigint", "double", "date", "timestamp", "time", "boolean"] as const).forEach(
      (dataType) => {
        expect(operatorsForDataType(dataType)).toContain("is_null");
        expect(operatorsForDataType(dataType)).toContain("is_not_null");
      },
    );
  });

  it("never offers legacy operators", () => {
    expect(operatorsForDataType("varchar")).not.toContain("like");
    expect(operatorsForDataType("varchar")).not.toContain("not_like");
  });
});

describe("operatorSpec", () => {
  it("describes value arity", () => {
    expect(operatorSpec("=")?.arity).toBe("scalar");
    expect(operatorSpec("in")?.arity).toBe("list");
    expect(operatorSpec("between")?.arity).toBe("pair");
    expect(operatorSpec("is_null")?.arity).toBe("none");
  });

  it("marks which operators honour Match case", () => {
    expect(operatorSpec("contains")?.supportsMatchCase).toBe(true);
    expect(operatorSpec("matches_regex")?.supportsMatchCase).toBe(false);
    expect(operatorSpec(">")?.supportsMatchCase).toBe(false);
  });

  it("has a spec for every operator in the catalog", () => {
    QUERY_FILTER_OPERATOR_SPECS.forEach((spec) => {
      expect(operatorSpec(spec.operator)).toBe(spec);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run shared/models/queries/StructuredQuery/QueryFilterOperator.test.ts`
Expected: FAIL, cannot resolve `QueryFilterOperator.ts`.

- [ ] **Step 3: Extend the operator union and node fields**

In `shared/models/queries/StructuredQuery/QueryFilter.types.ts`, replace the `QueryFilterOperator` type and the two node types with:

```ts
/** Operators the filter UI and the SQL layer understand. */
export type QueryFilterOperator =
  | "="
  | "!="
  | ">"
  | ">="
  | "<"
  | "<="
  | "contains"
  | "not_contains"
  | "starts_with"
  | "not_starts_with"
  | "ends_with"
  | "not_ends_with"
  | "in"
  | "not_in"
  | "between"
  | "not_between"
  | "is_null"
  | "is_not_null"
  | "is_blank"
  | "is_not_blank"
  | "is_true"
  | "is_false"
  | "matches_regex"
  | "not_matches_regex"
  /**
   * Legacy raw-pattern operators. Never produced by the UI: kept so filters
   * saved before the operator catalog, and hand-written `LIKE` SQL, keep their
   * original case-sensitive raw-pattern meaning.
   */
  | "like"
  | "not_like";

/** Stable identity for a node in the filter tree. */
export type QueryFilterNodeId = string;

/** Generates a new filter-node id. */
export function makeQueryFilterNodeId(): QueryFilterNodeId {
  return crypto.randomUUID();
}

/** A single column-level predicate. */
export type QueryFilterRule = {
  type: "rule";
  /**
   * Stable identity so re-rendering the tree does not remount the row (and
   * therefore does not steal focus from the value input).
   */
  id?: QueryFilterNodeId;
  /** The name of the underlying base column we filter on. */
  columnName: string;
  /**
   * The column's data type at authoring time. Used to render typed literals
   * and to pick the operator list. A live `columnTypes` map overrides it;
   * absent both, the column is treated as text.
   */
  columnDataType?: AvaDataType.T;
  operator: QueryFilterOperator;
  /**
   * Scalar operators take a primitive. `in` / `not_in` take a non-empty
   * array; `between` / `not_between` take exactly two elements. Null-ish and
   * boolean operators ignore this. Comma-joined strings are still accepted on
   * read for filters saved before arrays.
   */
  value: string | number | boolean | null | ReadonlyArray<string | number>;
  /**
   * Text operators only. Absent means case-insensitive, which is the default
   * for all text comparison.
   */
  matchCase?: boolean;
};

/** A nested AND/OR group. */
export type QueryFilterGroup = {
  type: "group";
  id?: QueryFilterNodeId;
  combinator: QueryFilterCombinator;
  rules: ReadonlyArray<QueryFilterGroup | QueryFilterRule>;
};
```

Add the import at the top of the file:

```ts
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
```

Leave `QueryFilterCombinator`, `QueryFilter`, `EMPTY_QUERY_FILTER`, and `isEmptyQueryFilter` unchanged.

- [ ] **Step 4: Create the catalog**

Create `shared/models/queries/StructuredQuery/QueryFilterOperator.ts`:

```ts
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { AvaDataType as AvaDataTypeNs } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { QueryFilterOperator } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

/** How many values an operator's editor collects. */
export type QueryFilterValueArity = "none" | "scalar" | "list" | "pair";

export type QueryFilterOperatorSpec = {
  operator: QueryFilterOperator;
  arity: QueryFilterValueArity;
  /** True when the operator is offered for this column type. */
  appliesTo: (dataType: AvaDataTypeNs.T) => boolean;
  /** True when the per-rule `Match case` toggle changes this operator's SQL. */
  supportsMatchCase: boolean;
  /**
   * Legacy operators are still rendered and parsed, but never offered in the
   * operator dropdown.
   */
  legacy?: boolean;
};

function _always(): boolean {
  return true;
}

function _isText(dataType: AvaDataTypeNs.T): boolean {
  return AvaDataType.isText(dataType);
}

function _isOrderable(dataType: AvaDataTypeNs.T): boolean {
  return AvaDataType.isNumeric(dataType) || AvaDataType.isTemporal(dataType);
}

function _isBoolean(dataType: AvaDataTypeNs.T): boolean {
  return dataType === "boolean";
}

/**
 * Every operator the filter layer supports, in the order the UI offers them.
 *
 * This is the single source of truth: the operator dropdown reads it, the SQL
 * renderer switches on it, and the SQL-to-form round-trip test iterates it, so
 * an operator cannot be added in one place and forgotten in another.
 */
export const QUERY_FILTER_OPERATOR_SPECS: readonly QueryFilterOperatorSpec[] = [
  { operator: "=", arity: "scalar", appliesTo: _always, supportsMatchCase: true },
  { operator: "!=", arity: "scalar", appliesTo: _always, supportsMatchCase: true },
  { operator: ">", arity: "scalar", appliesTo: _isOrderable, supportsMatchCase: false },
  { operator: ">=", arity: "scalar", appliesTo: _isOrderable, supportsMatchCase: false },
  { operator: "<", arity: "scalar", appliesTo: _isOrderable, supportsMatchCase: false },
  { operator: "<=", arity: "scalar", appliesTo: _isOrderable, supportsMatchCase: false },
  { operator: "contains", arity: "scalar", appliesTo: _isText, supportsMatchCase: true },
  { operator: "not_contains", arity: "scalar", appliesTo: _isText, supportsMatchCase: true },
  { operator: "starts_with", arity: "scalar", appliesTo: _isText, supportsMatchCase: true },
  { operator: "not_starts_with", arity: "scalar", appliesTo: _isText, supportsMatchCase: true },
  { operator: "ends_with", arity: "scalar", appliesTo: _isText, supportsMatchCase: true },
  { operator: "not_ends_with", arity: "scalar", appliesTo: _isText, supportsMatchCase: true },
  { operator: "in", arity: "list", appliesTo: _always, supportsMatchCase: true },
  { operator: "not_in", arity: "list", appliesTo: _always, supportsMatchCase: true },
  { operator: "between", arity: "pair", appliesTo: _isOrderable, supportsMatchCase: false },
  { operator: "not_between", arity: "pair", appliesTo: _isOrderable, supportsMatchCase: false },
  { operator: "is_null", arity: "none", appliesTo: _always, supportsMatchCase: false },
  { operator: "is_not_null", arity: "none", appliesTo: _always, supportsMatchCase: false },
  { operator: "is_blank", arity: "none", appliesTo: _isText, supportsMatchCase: false },
  { operator: "is_not_blank", arity: "none", appliesTo: _isText, supportsMatchCase: false },
  { operator: "is_true", arity: "none", appliesTo: _isBoolean, supportsMatchCase: false },
  { operator: "is_false", arity: "none", appliesTo: _isBoolean, supportsMatchCase: false },
  { operator: "matches_regex", arity: "scalar", appliesTo: _isText, supportsMatchCase: false },
  {
    operator: "not_matches_regex",
    arity: "scalar",
    appliesTo: _isText,
    supportsMatchCase: false,
  },
  {
    operator: "like",
    arity: "scalar",
    appliesTo: _isText,
    supportsMatchCase: false,
    legacy: true,
  },
  {
    operator: "not_like",
    arity: "scalar",
    appliesTo: _isText,
    supportsMatchCase: false,
    legacy: true,
  },
];

const _SPEC_BY_OPERATOR: Partial<
  Record<QueryFilterOperator, QueryFilterOperatorSpec>
> = Object.fromEntries(
  QUERY_FILTER_OPERATOR_SPECS.map((spec) => {
    return [spec.operator, spec];
  }),
);

/** Returns the spec for an operator, or `undefined` if it is unknown. */
export function operatorSpec(
  operator: QueryFilterOperator,
): QueryFilterOperatorSpec | undefined {
  return _SPEC_BY_OPERATOR[operator];
}

/**
 * The operators the UI offers for a column of this type, excluding legacy
 * operators. Falls back to the text operator set when the type is unknown,
 * because an unknown column is rendered as text by the SQL layer.
 */
export function operatorsForDataType(
  dataType: AvaDataTypeNs.T | undefined,
): readonly QueryFilterOperator[] {
  const effectiveType = dataType ?? "varchar";
  return QUERY_FILTER_OPERATOR_SPECS.filter((spec) => {
    return !spec.legacy && spec.appliesTo(effectiveType);
  }).map((spec) => {
    return spec.operator;
  });
}

/** The operator a new rule on this column type starts with. */
export function defaultOperatorForDataType(
  dataType: AvaDataTypeNs.T | undefined,
): QueryFilterOperator {
  return operatorsForDataType(dataType)[0] ?? "=";
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run shared/models/queries/StructuredQuery/QueryFilterOperator.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 6: Confirm nothing else broke**

Run: `npx vitest run shared/models/queries/StructuredQuery && pnpm type-check`
Expected: the existing `structuredQueryToSql` and `sqlToStructuredQuery` suites still pass. `pnpm type-check` passes: the union only gained members, and `applyFilters`'s `match(...).exhaustive()` accepts new members only once Task 4 handles them, so if type-check reports a non-exhaustive match in `applyFilters.ts` or `applyHaving.ts`, stop and confirm the failure names exactly those two files. That is expected and Task 4 and Task 5 fix it.

- [ ] **Step 7: Commit**

```bash
git add shared/models/queries/StructuredQuery/QueryFilter.types.ts \
        shared/models/queries/StructuredQuery/QueryFilterOperator.ts \
        shared/models/queries/StructuredQuery/QueryFilterOperator.test.ts
git commit -m "feat(filters): add type-aware operator catalog"
```

---

## Task 2: Value accessors

**Files:**
- Create: `shared/models/queries/StructuredQuery/QueryFilterValue.ts`
- Test: `shared/models/queries/StructuredQuery/QueryFilterValue.test.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/models/queries/StructuredQuery/QueryFilterValue.test.ts`:

```ts
import {
  coerceFilterLiteral,
  filterValueAsList,
  filterValueAsPair,
  filterValueAsScalar,
} from "$/models/queries/StructuredQuery/QueryFilterValue.ts";
import { describe, expect, it } from "vitest";

describe("filterValueAsScalar", () => {
  it("passes primitives through", () => {
    expect(filterValueAsScalar("Alameda")).toBe("Alameda");
    expect(filterValueAsScalar(42)).toBe(42);
    expect(filterValueAsScalar(true)).toBe(true);
  });

  it("returns undefined for absent values", () => {
    expect(filterValueAsScalar(null)).toBeUndefined();
    expect(filterValueAsScalar("")).toBeUndefined();
    expect(filterValueAsScalar("   ")).toBeUndefined();
  });

  it("takes the first element of a list", () => {
    expect(filterValueAsScalar(["a", "b"])).toBe("a");
  });
});

describe("filterValueAsList", () => {
  it("passes arrays through, dropping empties", () => {
    expect(filterValueAsList(["a", "", "b"])).toEqual(["a", "b"]);
  });

  it("splits legacy comma-joined strings and trims", () => {
    expect(filterValueAsList(" Alameda , Butte ,")).toEqual([
      "Alameda",
      "Butte",
    ]);
  });

  it("keeps values that contain a comma when they arrive as an array", () => {
    expect(filterValueAsList(["Korea, North"])).toEqual(["Korea, North"]);
  });

  it("returns an empty list for absent values", () => {
    expect(filterValueAsList(null)).toEqual([]);
    expect(filterValueAsList("")).toEqual([]);
  });
});

describe("filterValueAsPair", () => {
  it("returns both bounds from an array", () => {
    expect(filterValueAsPair([1, 2])).toEqual([1, 2]);
  });

  it("returns both bounds from a legacy comma string", () => {
    expect(filterValueAsPair("100,200")).toEqual(["100", "200"]);
  });

  it("returns undefined when a bound is missing", () => {
    expect(filterValueAsPair([1])).toBeUndefined();
    expect(filterValueAsPair("100,")).toBeUndefined();
    expect(filterValueAsPair(null)).toBeUndefined();
  });
});

describe("coerceFilterLiteral", () => {
  it("coerces numeric columns to numbers", () => {
    expect(coerceFilterLiteral("1000", "bigint")).toBe(1000);
    expect(coerceFilterLiteral("12.5", "double")).toBe(12.5);
  });

  it("leaves unparseable numbers as strings so validation can report them", () => {
    expect(coerceFilterLiteral("abc", "bigint")).toBe("abc");
  });

  it("stringifies temporal and text values", () => {
    expect(coerceFilterLiteral("2020-01-01", "date")).toBe("2020-01-01");
    expect(coerceFilterLiteral(5, "varchar")).toBe("5");
  });

  it("passes values through unchanged when the column type is unknown", () => {
    expect(coerceFilterLiteral("1000", undefined)).toBe("1000");
    expect(coerceFilterLiteral(30, undefined)).toBe(30);
    expect(coerceFilterLiteral(true, undefined)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run shared/models/queries/StructuredQuery/QueryFilterValue.test.ts`
Expected: FAIL, cannot resolve `QueryFilterValue.ts`.

- [ ] **Step 3: Write the implementation**

Create `shared/models/queries/StructuredQuery/QueryFilterValue.ts`:

```ts
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { AvaDataType as AvaDataTypeNs } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { QueryFilterRule } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

type FilterValue = QueryFilterRule["value"];

function _isBlank(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  );
}

/**
 * The single value a scalar operator compares against, or `undefined` when the
 * rule has no usable value yet.
 */
export function filterValueAsScalar(
  value: FilterValue,
): string | number | boolean | undefined {
  if (Array.isArray(value)) {
    const [first] = value;
    return _isBlank(first) ? undefined : first;
  }
  return _isBlank(value) ? undefined : (value as string | number | boolean);
}

/**
 * The list a list operator compares against. Arrays pass through with blanks
 * dropped; a string is split on commas and trimmed, which is how list values
 * were encoded before they became arrays.
 */
export function filterValueAsList(
  value: FilterValue,
  options: { dropEmpty?: boolean } = {},
): ReadonlyArray<string | number> {
  const dropEmpty = options.dropEmpty ?? true;
  const items =
    Array.isArray(value) ? [...value]
    : _isBlank(value) ? []
    : String(value)
        .split(",")
        .map((part) => {
          return part.trim();
        });
  return dropEmpty ?
      items.filter((item) => {
        return !_isBlank(item);
      })
    : items;
}

/** Both bounds of a `between`, or `undefined` when either is missing. */
export function filterValueAsPair(
  value: FilterValue,
): readonly [string | number, string | number] | undefined {
  const items = filterValueAsList(value, { dropEmpty: false });
  const [lower, upper] = items;
  if (_isBlank(lower) || _isBlank(upper)) {
    return undefined;
  }
  return [lower as string | number, upper as string | number];
}

/**
 * Coerces one value to the literal type the column wants, so numeric columns
 * bind as numbers rather than quoted strings. Values that cannot be coerced are
 * returned unchanged; `validateFilterRule` is what reports them to the user.
 *
 * An unknown column type passes the value through untouched, which is exactly
 * what the SQL layer did before typed literals existed, so rules saved without
 * a `columnDataType` keep rendering the way they always have.
 */
export function coerceFilterLiteral(
  value: string | number | boolean,
  dataType: AvaDataTypeNs.T | undefined,
): string | number | boolean {
  if (dataType === undefined) {
    return value;
  }
  if (AvaDataType.isNumeric(dataType)) {
    if (typeof value === "number") {
      return value;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) && String(value).trim() !== "" ?
        parsed
      : value;
  }
  if (typeof value === "boolean") {
    return value;
  }
  return String(value);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run shared/models/queries/StructuredQuery/QueryFilterValue.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 5: Commit**

```bash
git add shared/models/queries/StructuredQuery/QueryFilterValue.ts \
        shared/models/queries/StructuredQuery/QueryFilterValue.test.ts
git commit -m "feat(filters): add tolerant filter value accessors"
```

---

## Task 3: Completeness and validation

**Files:**
- Create: `shared/models/queries/StructuredQuery/QueryFilterValidation.ts`
- Test: `shared/models/queries/StructuredQuery/QueryFilterValidation.test.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/models/queries/StructuredQuery/QueryFilterValidation.test.ts`:

```ts
import {
  isFilterRuleComplete,
  validateFilterRule,
} from "$/models/queries/StructuredQuery/QueryFilterValidation.ts";
import { describe, expect, it } from "vitest";
import type { QueryFilterRule } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

function _rule(overrides: Partial<QueryFilterRule> = {}): QueryFilterRule {
  return {
    type: "rule",
    columnName: "Admin2",
    columnDataType: "varchar",
    operator: "=",
    value: "Alameda",
    ...overrides,
  };
}

describe("isFilterRuleComplete", () => {
  it("requires a value for scalar operators", () => {
    expect(isFilterRuleComplete(_rule())).toBe(true);
    expect(isFilterRuleComplete(_rule({ value: "" }))).toBe(false);
    expect(isFilterRuleComplete(_rule({ value: null }))).toBe(false);
  });

  it("requires at least one item for list operators", () => {
    expect(isFilterRuleComplete(_rule({ operator: "in", value: ["a"] }))).toBe(
      true,
    );
    expect(isFilterRuleComplete(_rule({ operator: "in", value: [] }))).toBe(
      false,
    );
    expect(isFilterRuleComplete(_rule({ operator: "in", value: "" }))).toBe(
      false,
    );
  });

  it("requires both bounds for between", () => {
    const numeric = { columnName: "cases", columnDataType: "bigint" } as const;
    expect(
      isFilterRuleComplete(
        _rule({ ...numeric, operator: "between", value: [1, 2] }),
      ),
    ).toBe(true);
    expect(
      isFilterRuleComplete(
        _rule({ ...numeric, operator: "between", value: [1] }),
      ),
    ).toBe(false);
  });

  it("requires nothing for null-ish and boolean operators", () => {
    expect(
      isFilterRuleComplete(_rule({ operator: "is_null", value: null })),
    ).toBe(true);
    expect(
      isFilterRuleComplete(
        _rule({
          columnName: "flag",
          columnDataType: "boolean",
          operator: "is_true",
          value: null,
        }),
      ),
    ).toBe(true);
  });

  it("treats an empty column name as incomplete", () => {
    expect(isFilterRuleComplete(_rule({ columnName: "" }))).toBe(false);
  });
});

describe("validateFilterRule", () => {
  it("accepts a well-formed rule", () => {
    expect(validateFilterRule(_rule())).toBeUndefined();
  });

  it("rejects an operator the column type does not support", () => {
    expect(
      validateFilterRule(
        _rule({ columnDataType: "bigint", operator: "contains" }),
      ),
    ).toEqual({
      code: "operatorNotAllowedForType",
      operator: "contains",
      dataType: "bigint",
    });
  });

  it("rejects a non-numeric value on a numeric column", () => {
    expect(
      validateFilterRule(
        _rule({ columnName: "cases", columnDataType: "bigint", value: "abc" }),
      ),
    ).toEqual({ code: "valueNotANumber", value: "abc" });
  });

  it("rejects an unparseable date on a temporal column", () => {
    expect(
      validateFilterRule(
        _rule({ columnName: "date", columnDataType: "date", value: "nope" }),
      ),
    ).toEqual({ code: "valueNotADate", value: "nope" });
  });

  it("accepts an ISO date on a temporal column", () => {
    expect(
      validateFilterRule(
        _rule({
          columnName: "date",
          columnDataType: "date",
          value: "2020-05-01",
        }),
      ),
    ).toBeUndefined();
  });

  it("rejects a regex that does not compile", () => {
    expect(
      validateFilterRule(_rule({ operator: "matches_regex", value: "a(" })),
    ).toEqual({ code: "regexDoesNotCompile", value: "a(" });
  });

  it("reports reversed between bounds", () => {
    expect(
      validateFilterRule(
        _rule({
          columnName: "cases",
          columnDataType: "bigint",
          operator: "between",
          value: [200, 100],
        }),
      ),
    ).toEqual({ code: "betweenBoundsReversed" });
  });

  it("does not validate values of incomplete rules", () => {
    expect(validateFilterRule(_rule({ value: "" }))).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run shared/models/queries/StructuredQuery/QueryFilterValidation.test.ts`
Expected: FAIL, cannot resolve `QueryFilterValidation.ts`.

- [ ] **Step 3: Write the implementation**

Create `shared/models/queries/StructuredQuery/QueryFilterValidation.ts`:

```ts
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { operatorSpec } from "$/models/queries/StructuredQuery/QueryFilterOperator.ts";
import {
  filterValueAsList,
  filterValueAsPair,
  filterValueAsScalar,
} from "$/models/queries/StructuredQuery/QueryFilterValue.ts";
import { match } from "ts-pattern";
import type { AvaDataType as AvaDataTypeNs } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type {
  QueryFilterOperator,
  QueryFilterRule,
} from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

/**
 * Why a rule cannot be applied. Structured codes rather than sentences: this
 * runs in shared code with no access to the active locale, so
 * `queryFilterValidationLabel` renders them.
 */
export type QueryFilterValidationReason =
  | { code: "unknownOperator"; operator: string }
  | {
      code: "operatorNotAllowedForType";
      operator: QueryFilterOperator;
      dataType: AvaDataTypeNs.T;
    }
  | { code: "valueNotANumber"; value: string }
  | { code: "valueNotADate"; value: string }
  | { code: "betweenBoundsReversed" }
  | { code: "regexDoesNotCompile"; value: string };

/**
 * True when the rule has everything the SQL layer needs. Incomplete rules are
 * excluded from the query rather than run with an empty value, which is what
 * used to produce `col = ''` and `col = NULL` predicates.
 */
export function isFilterRuleComplete(rule: QueryFilterRule): boolean {
  if (rule.columnName.trim() === "") {
    return false;
  }
  const spec = operatorSpec(rule.operator);
  if (!spec) {
    return false;
  }
  return match(spec.arity)
    .with("none", () => {
      return true;
    })
    .with("scalar", () => {
      return filterValueAsScalar(rule.value) !== undefined;
    })
    .with("list", () => {
      return filterValueAsList(rule.value).length > 0;
    })
    .with("pair", () => {
      return filterValueAsPair(rule.value) !== undefined;
    })
    .exhaustive();
}

function _isNumericText(value: string | number | boolean): boolean {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  const text = String(value).trim();
  return text !== "" && Number.isFinite(Number(text));
}

function _isDateText(value: string | number | boolean): boolean {
  return !Number.isNaN(new Date(String(value)).getTime());
}

function _validateLiteral(
  value: string | number | boolean,
  dataType: AvaDataTypeNs.T | undefined,
): QueryFilterValidationReason | undefined {
  if (dataType === undefined) {
    return undefined;
  }
  if (AvaDataType.isNumeric(dataType) && !_isNumericText(value)) {
    return { code: "valueNotANumber", value: String(value) };
  }
  if (AvaDataType.isTemporal(dataType) && !_isDateText(value)) {
    return { code: "valueNotADate", value: String(value) };
  }
  return undefined;
}

/**
 * Returns the reason a complete rule still cannot be applied, or `undefined`
 * when it is valid. Incomplete rules return `undefined`: they are excluded by
 * `isFilterRuleComplete` and marked as unfinished rather than as invalid, so a
 * half-typed rule does not shout at the user.
 */
export function validateFilterRule(
  rule: QueryFilterRule,
): QueryFilterValidationReason | undefined {
  const spec = operatorSpec(rule.operator);
  if (!spec) {
    return { code: "unknownOperator", operator: rule.operator };
  }
  if (
    rule.columnDataType !== undefined &&
    !spec.appliesTo(rule.columnDataType)
  ) {
    return {
      code: "operatorNotAllowedForType",
      operator: rule.operator,
      dataType: rule.columnDataType,
    };
  }
  if (!isFilterRuleComplete(rule)) {
    return undefined;
  }
  if (rule.operator === "matches_regex" || rule.operator === "not_matches_regex") {
    const pattern = String(filterValueAsScalar(rule.value));
    try {
      new RegExp(pattern);
    } catch {
      return { code: "regexDoesNotCompile", value: pattern };
    }
    return undefined;
  }
  return match(spec.arity)
    .with("none", () => {
      return undefined;
    })
    .with("scalar", () => {
      const value = filterValueAsScalar(rule.value);
      return value === undefined ?
          undefined
        : _validateLiteral(value, rule.columnDataType);
    })
    .with("list", () => {
      return filterValueAsList(rule.value).reduce<
        QueryFilterValidationReason | undefined
      >((reason, item) => {
        return reason ?? _validateLiteral(item, rule.columnDataType);
      }, undefined);
    })
    .with("pair", () => {
      const pair = filterValueAsPair(rule.value);
      if (!pair) {
        return undefined;
      }
      const [lower, upper] = pair;
      const literalReason =
        _validateLiteral(lower, rule.columnDataType) ??
        _validateLiteral(upper, rule.columnDataType);
      if (literalReason) {
        return literalReason;
      }
      const comparable =
        rule.columnDataType !== undefined &&
        AvaDataType.isNumeric(rule.columnDataType) ?
          [Number(lower), Number(upper)]
        : [String(lower), String(upper)];
      return comparable[0]! > comparable[1]! ?
          ({ code: "betweenBoundsReversed" } as const)
        : undefined;
    })
    .exhaustive();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run shared/models/queries/StructuredQuery/QueryFilterValidation.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add shared/models/queries/StructuredQuery/QueryFilterValidation.ts \
        shared/models/queries/StructuredQuery/QueryFilterValidation.test.ts
git commit -m "feat(filters): add filter rule completeness and validation"
```

---

## Task 4: The single SQL renderer

This is the heart of the change. Every operator's SQL is defined here once, and
both `WHERE` (Task 5) and `HAVING` (Task 6) consume it.

**Files:**
- Create: `shared/models/queries/StructuredQuery/renderFilterRule.ts`
- Test: `shared/models/queries/StructuredQuery/renderFilterRule.test.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/models/queries/StructuredQuery/renderFilterRule.test.ts`:

```ts
import { renderFilterRule } from "$/models/queries/StructuredQuery/renderFilterRule.ts";
import { describe, expect, it } from "vitest";
import type { QueryFilterRule } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import type { RenderFilterRuleOptions } from "$/models/queries/StructuredQuery/renderFilterRule.ts";

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
    expect(_render({ operator: "!=" })?.sql).toBe('lower("Admin2") <> lower(?)');
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
        { columnName: "cases", columnDataType: "varchar", operator: ">", value: "5" },
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
    expect(_render({ ...numeric, operator: "between", value: [100, 200] })).toEqual(
      { sql: '"daily_new_cases" BETWEEN ? AND ?', bindings: [100, 200] },
    );
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

  it("quotes identifiers that contain punctuation", () => {
    expect(
      _render({ columnName: "Country/Region", value: "Chad" })?.sql,
    ).toBe('lower("Country/Region") = lower(?)');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run shared/models/queries/StructuredQuery/renderFilterRule.test.ts`
Expected: FAIL, cannot resolve `renderFilterRule.ts`.

- [ ] **Step 3: Write the implementation**

Create `shared/models/queries/StructuredQuery/renderFilterRule.ts`:

```ts
import { quoteSqlIdentifier } from "@utils/sql/index.ts";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { operatorSpec } from "$/models/queries/StructuredQuery/QueryFilterOperator.ts";
import { isFilterRuleComplete } from "$/models/queries/StructuredQuery/QueryFilterValidation.ts";
import {
  coerceFilterLiteral,
  filterValueAsList,
  filterValueAsPair,
  filterValueAsScalar,
} from "$/models/queries/StructuredQuery/QueryFilterValue.ts";
import { match } from "ts-pattern";
import type { AvaDataType as AvaDataTypeNs } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { QueryFilterRule } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

/** A SQL snippet plus its positional bindings, ready for knex `*Raw` calls. */
export type SqlFragment = {
  sql: string;
  bindings: readonly unknown[];
};

export type RenderFilterRuleOptions = {
  /**
   * Live column types, keyed by column name. Takes precedence over the type
   * stored on the rule, so a column whose type the user changed renders with
   * the new type.
   */
  columnTypes?: Readonly<Record<string, AvaDataTypeNs.T>>;
};

function _castTarget(dataType: AvaDataTypeNs.T): string {
  return match(dataType)
    .with("date", () => {
      return "DATE";
    })
    .with("timestamp", () => {
      return "TIMESTAMP";
    })
    .with("time", () => {
      return "TIME";
    })
    .otherwise(() => {
      return "VARCHAR";
    });
}

/**
 * Renders one filter rule to SQL. Returns `undefined` when the rule is
 * incomplete or its operator is unknown, which is how incomplete rules get
 * excluded from the query instead of running as `col = ''`.
 *
 * Text matching uses DuckDB's `contains` / `starts_with` / `ends_with`
 * functions rather than `LIKE` patterns. That makes a `%` in the user's value a
 * literal character (no escaping to get wrong) and keeps every predicate in a
 * shape `node-sql-parser` can read back, which the round-trip test enforces.
 */
export function renderFilterRule(
  rule: QueryFilterRule,
  options: RenderFilterRuleOptions = {},
): SqlFragment | undefined {
  const spec = operatorSpec(rule.operator);
  if (!spec || !isFilterRuleComplete(rule)) {
    return undefined;
  }

  const dataType = options.columnTypes?.[rule.columnName] ?? rule.columnDataType;
  const column = quoteSqlIdentifier(rule.columnName);
  const isTextColumn = dataType === undefined || AvaDataType.isText(dataType);
  const foldCase =
    spec.supportsMatchCase && isTextColumn && rule.matchCase !== true;
  const lhs = foldCase ? `lower(${column})` : column;
  const isTemporal =
    dataType !== undefined && AvaDataType.isTemporal(dataType);
  const placeholder =
    isTemporal ? `CAST(? AS ${_castTarget(dataType)})`
    : foldCase ? "lower(?)"
    : "?";

  function literal(value: string | number | boolean): unknown {
    return coerceFilterLiteral(value, dataType);
  }

  function scalarBinding(): readonly unknown[] {
    const value = filterValueAsScalar(rule.value);
    return value === undefined ? [] : [literal(value)];
  }

  return match(rule.operator)
    .with("=", () => {
      return { sql: `${lhs} = ${placeholder}`, bindings: scalarBinding() };
    })
    .with("!=", () => {
      return { sql: `${lhs} <> ${placeholder}`, bindings: scalarBinding() };
    })
    .with(">", ">=", "<", "<=", (operator) => {
      return {
        sql: `${lhs} ${operator} ${placeholder}`,
        bindings: scalarBinding(),
      };
    })
    .with("contains", () => {
      return {
        sql: `contains(${lhs}, ${placeholder})`,
        bindings: scalarBinding(),
      };
    })
    .with("not_contains", () => {
      return {
        sql: `NOT contains(${lhs}, ${placeholder})`,
        bindings: scalarBinding(),
      };
    })
    .with("starts_with", () => {
      return {
        sql: `starts_with(${lhs}, ${placeholder})`,
        bindings: scalarBinding(),
      };
    })
    .with("not_starts_with", () => {
      return {
        sql: `NOT starts_with(${lhs}, ${placeholder})`,
        bindings: scalarBinding(),
      };
    })
    .with("ends_with", () => {
      return {
        sql: `ends_with(${lhs}, ${placeholder})`,
        bindings: scalarBinding(),
      };
    })
    .with("not_ends_with", () => {
      return {
        sql: `NOT ends_with(${lhs}, ${placeholder})`,
        bindings: scalarBinding(),
      };
    })
    .with("in", "not_in", (operator) => {
      const items = filterValueAsList(rule.value);
      const placeholders = items
        .map(() => {
          return placeholder;
        })
        .join(", ");
      const keyword = operator === "in" ? "IN" : "NOT IN";
      return {
        sql: `${lhs} ${keyword} (${placeholders})`,
        bindings: items.map((item) => {
          return literal(item);
        }),
      };
    })
    .with("between", "not_between", (operator) => {
      const pair = filterValueAsPair(rule.value);
      if (!pair) {
        return undefined;
      }
      const keyword = operator === "between" ? "BETWEEN" : "NOT BETWEEN";
      return {
        sql: `${column} ${keyword} ${placeholder} AND ${placeholder}`,
        bindings: [literal(pair[0]), literal(pair[1])],
      };
    })
    .with("is_null", () => {
      return { sql: `${column} IS NULL`, bindings: [] };
    })
    .with("is_not_null", () => {
      return { sql: `${column} IS NOT NULL`, bindings: [] };
    })
    .with("is_blank", () => {
      return { sql: `coalesce(trim(${column}), '') = ''`, bindings: [] };
    })
    .with("is_not_blank", () => {
      return { sql: `coalesce(trim(${column}), '') <> ''`, bindings: [] };
    })
    .with("is_true", () => {
      return { sql: `${column} IS TRUE`, bindings: [] };
    })
    .with("is_false", () => {
      return { sql: `${column} IS FALSE`, bindings: [] };
    })
    .with("matches_regex", () => {
      return {
        sql: `regexp_matches(${column}, ?)`,
        bindings: scalarBinding(),
      };
    })
    .with("not_matches_regex", () => {
      return {
        sql: `NOT regexp_matches(${column}, ?)`,
        bindings: scalarBinding(),
      };
    })
    .with("like", () => {
      return { sql: `${column} LIKE ?`, bindings: scalarBinding() };
    })
    .with("not_like", () => {
      return { sql: `${column} NOT LIKE ?`, bindings: scalarBinding() };
    })
    .exhaustive();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run shared/models/queries/StructuredQuery/renderFilterRule.test.ts`
Expected: PASS, 22 tests.

If the `>`/`>=`/`<`/`<=` case fails on a text column, note the expected
behavior: `foldCase` is false for those operators (`supportsMatchCase: false`),
so `lhs` equals `column` and the SQL is `"col" > ?`.

- [ ] **Step 5: Commit**

```bash
git add shared/models/queries/StructuredQuery/renderFilterRule.ts \
        shared/models/queries/StructuredQuery/renderFilterRule.test.ts
git commit -m "feat(filters): add single SQL renderer for filter rules"
```

---

## Task 5: Group renderer, and WHERE through it

Replaces `applyFilters`'s hand-built knex callback nesting with one group
renderer that both `WHERE` and `HAVING` use, so the two clauses cannot drift.

**Files:**
- Create: `shared/models/queries/StructuredQuery/renderFilterGroup.ts`
- Create: `shared/models/queries/StructuredQuery/renderFilterGroup.test.ts`
- Modify: `shared/models/queries/StructuredQuery/structuredQueryToSql/applyFilters.ts` (replace the whole file)

- [ ] **Step 1: Write the failing test**

Create `shared/models/queries/StructuredQuery/renderFilterGroup.test.ts`:

```ts
import { renderFilterGroup } from "$/models/queries/StructuredQuery/renderFilterGroup.ts";
import { describe, expect, it } from "vitest";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

const TEXT_RULE = {
  type: "rule",
  columnName: "Admin2",
  columnDataType: "varchar",
  operator: "=",
  value: "Alameda",
  matchCase: true,
} as const;

const NUM_RULE = {
  type: "rule",
  columnName: "cases",
  columnDataType: "bigint",
  operator: ">",
  value: 100,
} as const;

function _group(overrides: Partial<QueryFilterGroup>): QueryFilterGroup {
  return { type: "group", combinator: "AND", rules: [], ...overrides };
}

describe("renderFilterGroup", () => {
  it("returns undefined for an empty group", () => {
    expect(renderFilterGroup(_group({}))).toBeUndefined();
  });

  it("renders a single rule without parentheses", () => {
    expect(renderFilterGroup(_group({ rules: [TEXT_RULE] }))).toEqual({
      sql: '"Admin2" = ?',
      bindings: ["Alameda"],
    });
  });

  it("joins rules with the group combinator", () => {
    expect(
      renderFilterGroup(_group({ rules: [TEXT_RULE, NUM_RULE] })),
    ).toEqual({
      sql: '"Admin2" = ? and "cases" > ?',
      bindings: ["Alameda", 100],
    });
  });

  it("joins with OR when the combinator is OR", () => {
    expect(
      renderFilterGroup(_group({ combinator: "OR", rules: [TEXT_RULE, NUM_RULE] }))
        ?.sql,
    ).toBe('"Admin2" = ? or "cases" > ?');
  });

  it("parenthesises nested groups and keeps binding order", () => {
    const fragment = renderFilterGroup(
      _group({
        combinator: "AND",
        rules: [
          NUM_RULE,
          _group({ combinator: "OR", rules: [TEXT_RULE, { ...TEXT_RULE, value: "Butte" }] }),
        ],
      }),
    );
    expect(fragment?.sql).toBe(
      '"cases" > ? and ("Admin2" = ? or "Admin2" = ?)',
    );
    expect(fragment?.bindings).toEqual([100, "Alameda", "Butte"]);
  });

  it("skips incomplete rules instead of rendering them", () => {
    expect(
      renderFilterGroup(
        _group({ rules: [TEXT_RULE, { ...TEXT_RULE, value: "" }] }),
      ),
    ).toEqual({ sql: '"Admin2" = ?', bindings: ["Alameda"] });
  });

  it("returns undefined when every rule is incomplete", () => {
    expect(
      renderFilterGroup(_group({ rules: [{ ...TEXT_RULE, value: "" }] })),
    ).toBeUndefined();
  });

  it("drops empty nested groups", () => {
    expect(
      renderFilterGroup(_group({ rules: [TEXT_RULE, _group({})] }))?.sql,
    ).toBe('"Admin2" = ?');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run shared/models/queries/StructuredQuery/renderFilterGroup.test.ts`
Expected: FAIL, cannot resolve `renderFilterGroup.ts`.

- [ ] **Step 3: Write the group renderer**

Create `shared/models/queries/StructuredQuery/renderFilterGroup.ts`:

```ts
import { renderFilterRule } from "$/models/queries/StructuredQuery/renderFilterRule.ts";
import type {
  QueryFilter,
  QueryFilterGroup,
} from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import type {
  RenderFilterRuleOptions,
  SqlFragment,
} from "$/models/queries/StructuredQuery/renderFilterRule.ts";

function _renderNode(
  node: QueryFilter,
  options: RenderFilterRuleOptions,
): SqlFragment | undefined {
  if (node.type === "rule") {
    return renderFilterRule(node, options);
  }
  const nested = renderFilterGroup(node, options);
  return nested ?
      { sql: `(${nested.sql})`, bindings: nested.bindings }
    : undefined;
}

/**
 * Renders a filter tree to one SQL fragment. Returns `undefined` when nothing
 * in the tree is renderable, so callers can leave the clause off entirely.
 *
 * Rules that are incomplete are skipped rather than rendered, which is what
 * keeps a half-typed rule from turning into `col = ''`. The UI reports skipped
 * rules through `isFilterRuleComplete`, so the exclusion is never silent.
 */
export function renderFilterGroup(
  group: QueryFilterGroup,
  options: RenderFilterRuleOptions = {},
): SqlFragment | undefined {
  const fragments = group.rules
    .map((node) => {
      return _renderNode(node, options);
    })
    .filter((fragment): fragment is SqlFragment => {
      return fragment !== undefined;
    });

  if (fragments.length === 0) {
    return undefined;
  }

  const joiner = group.combinator === "OR" ? " or " : " and ";
  return {
    sql: fragments
      .map((fragment) => {
        return fragment.sql;
      })
      .join(joiner),
    bindings: fragments.flatMap((fragment) => {
      return [...fragment.bindings];
    }),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run shared/models/queries/StructuredQuery/renderFilterGroup.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Replace `applyFilters` with a thin wrapper**

Replace the entire contents of
`shared/models/queries/StructuredQuery/structuredQueryToSql/applyFilters.ts`
with:

```ts
import { renderFilterGroup } from "$/models/queries/StructuredQuery/renderFilterGroup.ts";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import type { RenderFilterRuleOptions } from "$/models/queries/StructuredQuery/renderFilterRule.ts";
import type { Knex } from "knex";

/**
 * Applies a filter tree as the query's WHERE clause.
 *
 * All operator semantics live in `renderFilterGroup` / `renderFilterRule` so
 * that WHERE and HAVING render identically; this function only decides where
 * the fragment is attached.
 */
export function applyFilters(
  builder: Knex.QueryBuilder,
  group: QueryFilterGroup,
  options: RenderFilterRuleOptions = {},
): Knex.QueryBuilder {
  const fragment = renderFilterGroup(group, options);
  if (!fragment) {
    return builder;
  }
  return builder.whereRaw(fragment.sql, [...fragment.bindings]);
}
```

- [ ] **Step 6: Run the existing SQL suite**

Run: `npx vitest run shared/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql.test.ts`
Expected: PASS, 9 tests. Two expectations to watch:

- The nested-group test asserts parentheses; `renderFilterGroup` emits them for
  nested groups only, which is what that test checks.
- The numeric test asserts `> 30` unquoted. The rule there has no
  `columnDataType`, and `coerceFilterLiteral` passes unknown-typed values
  through unchanged, so the number binds as a number. If it renders `> '30'`,
  the unknown-type branch of `coerceFilterLiteral` is wrong: fix it there, not
  in the test.

- [ ] **Step 7: Commit**

```bash
git add shared/models/queries/StructuredQuery/renderFilterGroup.ts \
        shared/models/queries/StructuredQuery/renderFilterGroup.test.ts \
        shared/models/queries/StructuredQuery/structuredQueryToSql/applyFilters.ts
git commit -m "refactor(filters): render WHERE through the shared group renderer"
```

---

## Task 6: HAVING through the same renderer

**Files:**
- Modify: `shared/models/queries/StructuredQuery/structuredQueryToSql/applyHaving.ts` (replace the whole file)
- Test: `shared/models/queries/StructuredQuery/structuredQueryToSql/applyHaving.test.ts`

- [ ] **Step 1: Write the failing test**

Create
`shared/models/queries/StructuredQuery/structuredQueryToSql/applyHaving.test.ts`:

```ts
import { EMPTY_QUERY_FILTER } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import { applyHaving } from "$/models/queries/StructuredQuery/structuredQueryToSql/applyHaving.ts";
import { sqlBuilder } from "$/models/queries/StructuredQuery/structuredQueryToSql/sqlBuilder.ts";
import { describe, expect, it } from "vitest";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

function _having(group: QueryFilterGroup): string {
  const builder = sqlBuilder.queryBuilder().select("*").from("t").groupBy("g");
  return applyHaving(builder, group).toQuery();
}

describe("applyHaving", () => {
  it("omits HAVING for an empty group", () => {
    expect(_having(EMPTY_QUERY_FILTER).toLowerCase()).not.toContain("having");
  });

  it("renders the same predicate shape as WHERE does", () => {
    const sql = _having({
      type: "group",
      combinator: "AND",
      rules: [
        {
          type: "rule",
          columnName: "total",
          columnDataType: "bigint",
          operator: ">",
          value: 1000,
        },
      ],
    });
    expect(sql).toContain('having "total" > 1000');
  });

  it("renders text matching with the substring function form", () => {
    const sql = _having({
      type: "group",
      combinator: "AND",
      rules: [
        {
          type: "rule",
          columnName: "label",
          columnDataType: "varchar",
          operator: "contains",
          value: "san",
        },
      ],
    });
    expect(sql).toContain(`contains(lower("label"), lower('san'))`);
  });

  it("skips incomplete rules", () => {
    const sql = _having({
      type: "group",
      combinator: "AND",
      rules: [
        {
          type: "rule",
          columnName: "total",
          columnDataType: "bigint",
          operator: ">",
          value: "",
        },
      ],
    });
    expect(sql.toLowerCase()).not.toContain("having");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run shared/models/queries/StructuredQuery/structuredQueryToSql/applyHaving.test.ts`
Expected: FAIL. The old `applyHaving` renders `contains` through its own
`match`, which has no `contains` case, so it throws
"Unknown filter operator on HAVING rule".

- [ ] **Step 3: Replace `applyHaving`**

Replace the entire contents of
`shared/models/queries/StructuredQuery/structuredQueryToSql/applyHaving.ts`
with:

```ts
import { renderFilterGroup } from "$/models/queries/StructuredQuery/renderFilterGroup.ts";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import type { RenderFilterRuleOptions } from "$/models/queries/StructuredQuery/renderFilterRule.ts";
import type { Knex } from "knex";

/**
 * Applies a filter tree as the query's HAVING clause, rendered after GROUP BY.
 *
 * Shares `renderFilterGroup` with `applyFilters`: one implementation of every
 * operator means HAVING can never fall behind WHERE.
 */
export function applyHaving(
  builder: Knex.QueryBuilder,
  group: QueryFilterGroup,
  options: RenderFilterRuleOptions = {},
): Knex.QueryBuilder {
  const fragment = renderFilterGroup(group, options);
  if (!fragment) {
    return builder;
  }
  return builder.havingRaw(fragment.sql, [...fragment.bindings]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run shared/models/queries/StructuredQuery/structuredQueryToSql/applyHaving.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Run the whole StructuredQuery suite and type-check**

Run: `npx vitest run shared/models/queries/StructuredQuery && pnpm type-check`
Expected: all pass. The non-exhaustive `match` errors from Task 1 Step 6 are
gone now that both appliers delegate to the renderer.

- [ ] **Step 6: Commit**

```bash
git add shared/models/queries/StructuredQuery/structuredQueryToSql/applyHaving.ts \
        shared/models/queries/StructuredQuery/structuredQueryToSql/applyHaving.test.ts
git commit -m "refactor(filters): render HAVING through the shared group renderer"
```

---

## Task 7: SQL to form parity

Without this, SQL mode flags our own generated SQL as an approximation, because
`parseWhereNode` only accepts `binary_expr` nodes and knows nothing about
function-form predicates.

The AST shapes below were verified against the installed `node-sql-parser` 5.x
with `database: "postgresql"`; see spec section 5.1.1.

**Files:**
- Modify: `shared/models/queries/StructuredQuery/sqlToStructuredQuery/sqlAstReaders.ts`
- Modify: `shared/models/queries/StructuredQuery/sqlToStructuredQuery/parseFilterClauses.ts`
- Test: `shared/models/queries/StructuredQuery/filterRoundTrip.test.ts`

- [ ] **Step 1: Write the failing round-trip test**

Create `shared/models/queries/StructuredQuery/filterRoundTrip.test.ts`:

```ts
/**
 * Every operator the catalog offers must survive a trip through
 * `structuredQueryToSql` and back through `sqlToStructuredQuery`. Without this,
 * adding an operator silently turns SQL mode's "form is an approximation"
 * warning on for queries the form itself produced.
 */
import { Model } from "@avandar/models";
import { QUERY_FILTER_OPERATOR_SPECS } from "$/models/queries/StructuredQuery/QueryFilterOperator.ts";
import { EMPTY_QUERY_FILTER } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import { sqlToStructuredQuery } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/sqlToStructuredQuery.ts";
import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql.ts";
import { describe, expect, it } from "vitest";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { DatasetModel } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { DatasetColumnRead } from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";
import type {
  QueryColumnId,
  QueryColumnRead,
} from "$/models/queries/QueryColumn/QueryColumn.types.ts";
import type {
  QueryFilterOperator,
  QueryFilterRule,
} from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import type {
  PartialStructuredQuery,
  StructuredQueryId,
} from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";

const DATASET_ID = "dataset_round_trip";

const COLUMNS: ReadonlyArray<{ name: string; dataType: AvaDataType.T }> = [
  { name: "label", dataType: "varchar" },
  { name: "total", dataType: "bigint" },
  { name: "seen_on", dataType: "date" },
  { name: "is_active", dataType: "boolean" },
];

function _datasetColumn(name: string, dataType: string): DatasetColumnRead {
  return {
    __type: "DatasetColumn",
    id: `col_${name}`,
    name,
    originalName: name,
    dataType,
    columnIdx: 0,
  } as unknown as DatasetColumnRead;
}

const DATASETS = [
  {
    dataset: {
      __type: "Dataset",
      id: DATASET_ID,
      name: "round_trip",
    } as unknown as DatasetModel["Read"],
    columns: COLUMNS.map((column) => {
      return _datasetColumn(column.name, column.dataType);
    }),
  },
];

function _queryColumn(name: string, dataType: string): QueryColumnRead {
  return Model.make("QueryColumn", {
    id: `qc_${name}` as QueryColumnId,
    baseColumn: _datasetColumn(name, dataType),
    aggregation: undefined,
  }) as unknown as QueryColumnRead;
}

function _query(rule: QueryFilterRule): PartialStructuredQuery {
  const queryColumns = COLUMNS.map((column) => {
    return _queryColumn(column.name, column.dataType);
  });
  return Model.make("StructuredQuery", {
    id: "q_round_trip" as StructuredQueryId,
    version: 1 as const,
    dataSource: DATASETS[0]!.dataset,
    queryColumns,
    orderByColumn: undefined,
    orderByDirection: undefined,
    aggregations: Object.fromEntries(
      queryColumns.map((column) => {
        return [column.id, "none"];
      }),
    ),
    filters: { type: "group", combinator: "AND", rules: [rule] },
    having: EMPTY_QUERY_FILTER,
    joins: [],
    offset: undefined,
    limit: undefined,
  }) as PartialStructuredQuery;
}

/**
 * One representative rule per operator. Column types are chosen so the rule is
 * valid for the operator being exercised.
 */
const RULES: Readonly<Record<QueryFilterOperator, QueryFilterRule>> = {
  "=": { type: "rule", columnName: "label", columnDataType: "varchar", operator: "=", value: "a" },
  "!=": { type: "rule", columnName: "label", columnDataType: "varchar", operator: "!=", value: "a" },
  ">": { type: "rule", columnName: "total", columnDataType: "bigint", operator: ">", value: 1 },
  ">=": { type: "rule", columnName: "total", columnDataType: "bigint", operator: ">=", value: 1 },
  "<": { type: "rule", columnName: "total", columnDataType: "bigint", operator: "<", value: 1 },
  "<=": { type: "rule", columnName: "total", columnDataType: "bigint", operator: "<=", value: 1 },
  contains: { type: "rule", columnName: "label", columnDataType: "varchar", operator: "contains", value: "a" },
  not_contains: { type: "rule", columnName: "label", columnDataType: "varchar", operator: "not_contains", value: "a" },
  starts_with: { type: "rule", columnName: "label", columnDataType: "varchar", operator: "starts_with", value: "a" },
  not_starts_with: { type: "rule", columnName: "label", columnDataType: "varchar", operator: "not_starts_with", value: "a" },
  ends_with: { type: "rule", columnName: "label", columnDataType: "varchar", operator: "ends_with", value: "a" },
  not_ends_with: { type: "rule", columnName: "label", columnDataType: "varchar", operator: "not_ends_with", value: "a" },
  in: { type: "rule", columnName: "label", columnDataType: "varchar", operator: "in", value: ["a", "b"] },
  not_in: { type: "rule", columnName: "label", columnDataType: "varchar", operator: "not_in", value: ["a", "b"] },
  between: { type: "rule", columnName: "total", columnDataType: "bigint", operator: "between", value: [1, 2] },
  not_between: { type: "rule", columnName: "total", columnDataType: "bigint", operator: "not_between", value: [1, 2] },
  is_null: { type: "rule", columnName: "label", columnDataType: "varchar", operator: "is_null", value: null },
  is_not_null: { type: "rule", columnName: "label", columnDataType: "varchar", operator: "is_not_null", value: null },
  is_blank: { type: "rule", columnName: "label", columnDataType: "varchar", operator: "is_blank", value: null },
  is_not_blank: { type: "rule", columnName: "label", columnDataType: "varchar", operator: "is_not_blank", value: null },
  is_true: { type: "rule", columnName: "is_active", columnDataType: "boolean", operator: "is_true", value: null },
  is_false: { type: "rule", columnName: "is_active", columnDataType: "boolean", operator: "is_false", value: null },
  matches_regex: { type: "rule", columnName: "label", columnDataType: "varchar", operator: "matches_regex", value: "^a" },
  not_matches_regex: { type: "rule", columnName: "label", columnDataType: "varchar", operator: "not_matches_regex", value: "^a" },
  like: { type: "rule", columnName: "label", columnDataType: "varchar", operator: "like", value: "a%" },
  not_like: { type: "rule", columnName: "label", columnDataType: "varchar", operator: "not_like", value: "a%" },
};

describe("filter round trip", () => {
  it("covers every operator in the catalog", () => {
    QUERY_FILTER_OPERATOR_SPECS.forEach((spec) => {
      expect(RULES[spec.operator]).toBeDefined();
    });
  });

  QUERY_FILTER_OPERATOR_SPECS.forEach((spec) => {
    it(`round-trips ${spec.operator}`, () => {
      const rule = RULES[spec.operator];
      const sql = structuredQueryToSql(_query(rule));
      const result = sqlToStructuredQuery({ sql, datasets: DATASETS });

      expect(
        result.unmappedReasons.filter((reason) => {
          return reason.code.startsWith("where");
        }),
      ).toEqual([]);

      const parsedFilters = result.query.filters;
      expect(parsedFilters.type).toBe("group");
      expect(parsedFilters.rules).toHaveLength(1);

      const parsed = parsedFilters.rules[0];
      expect(parsed?.type).toBe("rule");
      if (parsed?.type !== "rule") {
        return;
      }
      expect(parsed.operator).toBe(rule.operator);
      expect(parsed.columnName).toBe(rule.columnName);
      expect(parsed.matchCase ?? false).toBe(rule.matchCase ?? false);
    });
  });

  it("round-trips a case-sensitive text rule as matchCase true", () => {
    const rule: QueryFilterRule = {
      type: "rule",
      columnName: "label",
      columnDataType: "varchar",
      operator: "contains",
      value: "a",
      matchCase: true,
    };
    const sql = structuredQueryToSql(_query(rule));
    const result = sqlToStructuredQuery({ sql, datasets: DATASETS });
    const parsed = result.query.filters.rules[0];
    expect(parsed?.type === "rule" && parsed.matchCase).toBe(true);
  });

  it("round-trips a nested OR inside an AND", () => {
    const query = _query(RULES["="]);
    const nested: PartialStructuredQuery = {
      ...query,
      filters: {
        type: "group",
        combinator: "AND",
        rules: [
          RULES[">"],
          {
            type: "group",
            combinator: "OR",
            rules: [RULES["="], RULES.contains],
          },
        ],
      },
    } as PartialStructuredQuery;
    const sql = structuredQueryToSql(nested);
    const result = sqlToStructuredQuery({ sql, datasets: DATASETS });
    expect(result.query.filters).toEqual(nested.filters);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run shared/models/queries/StructuredQuery/filterRoundTrip.test.ts`
Expected: FAIL. The comparison and legacy `like` cases pass; every function-form
operator (`contains`, `starts_with`, `matches_regex`, and their negations),
`is_blank`, `is_true`, `is_false`, and `not_between` fail, because
`parseWhereNode` rejects non-`binary_expr` nodes and the operator map has no
entry for `NOT BETWEEN`.

- [ ] **Step 3: Add AST reader helpers**

In `shared/models/queries/StructuredQuery/sqlToStructuredQuery/sqlAstReaders.ts`,
add these exports at the end of the file:

```ts
/** The lower-cased name of a function-call node, if it is one. */
export function functionName(node: unknown): string | undefined {
  if (node === null || typeof node !== "object") {
    return undefined;
  }
  const obj = node as Record<string, unknown>;
  if (obj.type !== "function") {
    return undefined;
  }
  const name = obj.name as { name?: Array<{ value?: unknown }> } | undefined;
  const first = name?.name?.[0]?.value;
  return typeof first === "string" ? first.toLowerCase() : undefined;
}

/** The argument list of a function-call node. */
export function functionArgs(node: unknown): readonly unknown[] {
  if (node === null || typeof node !== "object") {
    return [];
  }
  const args = (node as Record<string, unknown>).args as
    | { value?: unknown[] }
    | undefined;
  return Array.isArray(args?.value) ? args.value : [];
}

/**
 * Unwraps a single `lower(...)` call. `wasLowered` is how the parser recovers
 * whether a rule was authored case-insensitively.
 */
export function unwrapLowerCall(node: unknown): {
  inner: unknown;
  wasLowered: boolean;
} {
  if (functionName(node) === "lower") {
    const [inner] = functionArgs(node);
    return { inner, wasLowered: true };
  }
  return { inner: node, wasLowered: false };
}

/** True when the node is the literal empty string. */
export function isEmptyStringLiteral(node: unknown): boolean {
  return literalValue(node) === "";
}

/** The boolean a `bool` literal node carries, if it is one. */
export function boolLiteral(node: unknown): boolean | undefined {
  if (node === null || typeof node !== "object") {
    return undefined;
  }
  const obj = node as Record<string, unknown>;
  return obj.type === "bool" && typeof obj.value === "boolean" ?
      obj.value
    : undefined;
}

/**
 * Matches `coalesce(trim(<column>), '')`, the shape `is_blank` renders. Returns
 * the column name when it matches.
 */
export function blankCheckColumnName(node: unknown): string | undefined {
  if (functionName(node) !== "coalesce") {
    return undefined;
  }
  const [trimCall, emptyString] = functionArgs(node);
  if (!isEmptyStringLiteral(emptyString)) {
    return undefined;
  }
  if (functionName(trimCall) !== "trim") {
    return undefined;
  }
  const [column] = functionArgs(trimCall);
  return columnRefName(column);
}
```

Then extend the operator map in the same file so `NOT BETWEEN` and `IS NOT` are
recognized. Replace the `_FILTER_OPERATOR_BY_SQL` entries for `BETWEEN` and `IS`
with:

```ts
  BETWEEN: "between",
  "NOT BETWEEN": "not_between",
  IS: "is_null",
```

Finally, make `literalValue` see through a cast so temporal rules round-trip. At
the top of `literalValue`, immediately after the `typeof node !== "object"`
guard, insert:

```ts
  const castObj = node as Record<string, unknown>;
  if (castObj.type === "cast") {
    return literalValue(castObj.expr);
  }
```

- [ ] **Step 4: Teach `parseWhereNode` the new shapes**

In `shared/models/queries/StructuredQuery/sqlToStructuredQuery/parseFilterClauses.ts`:

First extend the import to bring in the new helpers:

```ts
import {
  blankCheckColumnName,
  boolLiteral,
  columnRefName,
  extractValueList,
  functionArgs,
  functionName,
  isEmptyStringLiteral,
  literalValue,
  toFilterOperator,
  unwrapLowerCall,
} from "$/models/queries/StructuredQuery/sqlToStructuredQuery/sqlAstReaders.ts";
```

Then, inside `parseWhereNode`, replace the early `obj.type !== "binary_expr"`
rejection with a dispatch that tries the new shapes first:

```ts
  const obj = node as Record<string, unknown>;

  // `NOT <predicate>`: the shape every negated function-form operator takes.
  if (obj.type === "unary_expr" && String(obj.operator ?? "").toUpperCase() === "NOT") {
    const inner = _parseFunctionPredicate(obj.expr);
    if (inner) {
      return { ...inner, operator: _negateOperator(inner.operator) };
    }
    unmappedReasons.push({
      code: "whereUnsupportedNode",
      nodeType: "unary_expr",
    });
    return undefined;
  }

  // `contains(...)`, `starts_with(...)`, `ends_with(...)`, `regexp_matches(...)`
  if (obj.type === "function") {
    const rule = _parseFunctionPredicate(obj);
    if (rule) {
      return rule;
    }
    unmappedReasons.push({
      code: "whereUnsupportedNode",
      nodeType: `function:${functionName(obj) ?? "unknown"}`,
    });
    return undefined;
  }

  if (obj.type !== "binary_expr") {
    unmappedReasons.push({
      code: "whereUnsupportedNode",
      nodeType: String(obj.type),
    });
    return undefined;
  }
```

Add these two module-level helpers above `parseWhereNode`:

```ts
const _NEGATED_OPERATOR: Partial<
  Record<QueryFilterOperator, QueryFilterOperator>
> = {
  contains: "not_contains",
  starts_with: "not_starts_with",
  ends_with: "not_ends_with",
  matches_regex: "not_matches_regex",
};

function _negateOperator(operator: QueryFilterOperator): QueryFilterOperator {
  return _NEGATED_OPERATOR[operator] ?? operator;
}

/**
 * Parses the function-call predicates the renderer emits for text matching:
 * `contains`, `starts_with`, `ends_with` (each optionally wrapped in `lower`
 * on both sides), and `regexp_matches`.
 */
function _parseFunctionPredicate(node: unknown): QueryFilterRule | undefined {
  const name = functionName(node);
  if (!name) {
    return undefined;
  }

  if (name === "regexp_matches") {
    const [column, pattern] = functionArgs(node);
    const columnName = columnRefName(column);
    const value = literalValue(pattern);
    if (columnName === undefined || value === undefined || value === null) {
      return undefined;
    }
    return {
      type: "rule",
      columnName,
      operator: "matches_regex",
      value,
    };
  }

  const operator =
    name === "contains" ? "contains"
    : name === "starts_with" ? "starts_with"
    : name === "ends_with" ? "ends_with"
    : undefined;
  if (!operator) {
    return undefined;
  }

  const [left, right] = functionArgs(node);
  const unwrappedLeft = unwrapLowerCall(left);
  const unwrappedRight = unwrapLowerCall(right);
  const columnName = columnRefName(unwrappedLeft.inner);
  const value = literalValue(unwrappedRight.inner);
  if (columnName === undefined || value === undefined || value === null) {
    return undefined;
  }
  const rule: QueryFilterRule = {
    type: "rule",
    columnName,
    operator,
    value,
  };
  return unwrappedLeft.wasLowered ? rule : { ...rule, matchCase: true };
}
```

Next, in the leaf-comparison part of `parseWhereNode`, handle the remaining
shapes. Replace the existing `IS` / `IS NOT` block with:

```ts
  // IS NULL / IS NOT NULL / IS TRUE / IS FALSE
  if (operator === "IS" || operator === "IS NOT") {
    const rightType = (obj.right as { type?: string } | null)?.type;
    if (rightType === "null") {
      const rule: QueryFilterRule = {
        type: "rule",
        columnName: columnName!,
        operator: operator === "IS" ? "is_null" : "is_not_null",
        value: null,
      };
      return rule;
    }
    const bool = boolLiteral(obj.right);
    if (bool !== undefined) {
      const isTrue = operator === "IS" ? bool : !bool;
      const rule: QueryFilterRule = {
        type: "rule",
        columnName: columnName!,
        operator: isTrue ? "is_true" : "is_false",
        value: null,
      };
      return rule;
    }
    unmappedReasons.push({ code: "whereNonNullRightSide", operator });
    return undefined;
  }
```

Immediately before the `const columnName = columnRefName(obj.left);` line that
starts the leaf handling, insert the blank-check and `lower()` handling:

```ts
  // coalesce(trim(col), '') = '' / <> ''  ->  is_blank / is_not_blank
  const blankColumn = blankCheckColumnName(obj.left);
  if (blankColumn !== undefined && isEmptyStringLiteral(obj.right)) {
    if (operator === "=" || operator === "<>" || operator === "!=") {
      const rule: QueryFilterRule = {
        type: "rule",
        columnName: blankColumn,
        operator: operator === "=" ? "is_blank" : "is_not_blank",
        value: null,
      };
      return rule;
    }
  }
```

And make the leaf handling see through `lower()` on the left side by replacing:

```ts
  const columnName = columnRefName(obj.left);
```

with:

```ts
  const unwrappedLeft = unwrapLowerCall(obj.left);
  const columnName = columnRefName(unwrappedLeft.inner);
  const isCaseFolded = unwrappedLeft.wasLowered;
```

Then, at the two places that build a leaf rule (the `IN` / `NOT IN` branch and
the final generic comparison branch), unwrap `lower()` from the values and set
`matchCase`. In the `IN` branch, replace the `valueList` extraction and rule
construction with:

```ts
    const rawList = extractValueList(obj.right);
    const valueList = rawList?.map((item) => {
      return item;
    });
    if (!valueList) {
      unmappedReasons.push({
        code: "whereNonLiteralList",
        operator,
        columnName,
      });
      return undefined;
    }
    const rule: QueryFilterRule = {
      type: "rule",
      columnName,
      operator: operator === "IN" ? "in" : "not_in",
      value: valueList,
      ...(isCaseFolded ? {} : { matchCase: true }),
    };
    return rule;
```

In the final generic comparison branch, replace the rule construction with:

```ts
  const rule: QueryFilterRule = {
    type: "rule",
    columnName,
    operator: filterOp,
    value: literal,
    ...(isCaseFolded && (filterOp === "=" || filterOp === "!=") ?
      {}
    : filterOp === "=" || filterOp === "!=" ? { matchCase: true }
    : {}),
  };
  return rule;
```

- [ ] **Step 5: Make `extractValueList` see through `lower()`**

In `sqlAstReaders.ts`, find `extractValueList` and map each element through
`unwrapLowerCall` before reading its literal, so
`IN (lower('a'), lower('b'))` yields `["a", "b"]`. Insert the unwrap where each
element is read:

```ts
    const literal = literalValue(unwrapLowerCall(element).inner);
```

- [ ] **Step 6: Run the round-trip test**

Run: `npx vitest run shared/models/queries/StructuredQuery/filterRoundTrip.test.ts`
Expected: PASS, 29 tests (26 operators plus 3 extra cases).

If `is_blank` fails, check that the knex `sqlite3` client renders
`coalesce(trim("label"), '') = ''` without extra parentheses; adjust the reader
to tolerate a `paren`-wrapped left side if it does.

- [ ] **Step 7: Run the whole shared suite and type-check**

Run: `npx vitest run shared/models/queries/StructuredQuery && pnpm type-check`
Expected: all pass, including the pre-existing `sqlToStructuredQuery.test.ts`.

- [ ] **Step 8: Commit**

```bash
git add shared/models/queries/StructuredQuery/sqlToStructuredQuery/sqlAstReaders.ts \
        shared/models/queries/StructuredQuery/sqlToStructuredQuery/parseFilterClauses.ts \
        shared/models/queries/StructuredQuery/filterRoundTrip.test.ts
git commit -m "feat(filters): parse the new operator SQL back into the form"
```

---

## Task 8: Live column types reach the renderer

Rules carry a `columnDataType` hint, but a column's `dataType` is user-editable,
so a live map has to be able to win. `structuredQueryToSql` derives that map
from the columns it already has.

**Files:**
- Modify: `shared/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql.ts`
- Modify: `shared/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql.types.ts`
- Test: `shared/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql.test.ts` (add cases)

- [ ] **Step 1: Write the failing test**

Append to
`shared/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql.test.ts`,
inside the existing top-level `describe("structuredQueryToSql", ...)`:

```ts
  it("binds numeric filter values as numbers using the query's column types", () => {
    const sql = structuredQueryToSql(
      _makeQuery({
        type: "group",
        combinator: "AND",
        rules: [
          {
            type: "rule",
            columnName: "age",
            operator: ">",
            value: "30",
          },
        ],
      }),
    );
    expect(sql).toContain('"age" > 30');
    expect(sql).not.toContain(`'30'`);
  });

  it("lets an explicit columnTypes option override the query's columns", () => {
    const sql = structuredQueryToSql(
      _makeQuery({
        type: "group",
        combinator: "AND",
        rules: [
          {
            type: "rule",
            columnName: "name",
            operator: "=",
            value: "5",
          },
        ],
      }),
      { columnTypes: { name: "bigint" } },
    );
    expect(sql).toContain('"name" = 5');
  });
```

Note the first test needs the `age` column to have a real `AvaDataType`. In the
same file, change `_makeColumn("age", "integer")` to `_makeColumn("age", "bigint")`
(`integer` is not a member of `AvaDataType`, so it was silently treated as text).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run shared/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql.test.ts`
Expected: FAIL on both new tests: the first renders `"age" > '30'` because no
column types reach the renderer, the second rejects the unknown option.

- [ ] **Step 3: Extend the options type**

In `structuredQueryToSql.types.ts`, add to `StructuredQueryToSqlOptions`:

```ts
  /**
   * Live column data types keyed by column name, taking precedence over the
   * `columnDataType` stored on each filter rule. Callers that have the
   * dataset's columns loaded should pass them so a column whose type the user
   * changed renders with the new type.
   */
  columnTypes?: Readonly<Record<string, AvaDataType.T>>;
```

with the import:

```ts
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
```

- [ ] **Step 4: Thread the map through**

In `structuredQueryToSql.ts`, change the signature destructuring on line 40 to
also take the new option:

```ts
export function structuredQueryToSql(
  query: PartialStructuredQuery,
  {
    castTimestampsToISO = false,
    columnTypes,
  }: StructuredQueryToSqlOptions = {},
): string {
```

After the `sortedQueryColumns` computation, derive the effective map, preferring
the caller's entries:

```ts
  /**
   * Column types the filter renderer uses for typed literals. Built from the
   * query's own columns and overlaid with any caller-supplied types.
   */
  const effectiveColumnTypes: Record<string, AvaDataType.T> = {
    ...Object.fromEntries(
      queryColumns.map((column) => {
        return [column.baseColumn.name, column.baseColumn.dataType];
      }),
    ),
    ...(columnTypes ?? {}),
  };
```

Add the value import at the top if it is not already present:

```ts
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
```

Then pass it to both appliers, replacing lines 143 and 153:

```ts
    sqlQuery = applyFilters(sqlQuery, filters, {
      columnTypes: effectiveColumnTypes,
    });
```

```ts
    sqlQuery = applyHaving(sqlQuery, having, {
      columnTypes: effectiveColumnTypes,
    });
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run shared/models/queries/StructuredQuery && pnpm type-check`
Expected: PASS, including the round-trip suite (its rules carry
`columnDataType`, and the derived map agrees with it).

- [ ] **Step 6: Commit**

```bash
git add shared/models/queries/StructuredQuery/structuredQueryToSql/
git commit -m "feat(filters): use live column types for typed filter literals"
```

---

## Task 9: Localized operator and validation copy

**Files:**
- Create: `shared/copy/queryFilterOperatorLabel.ts`
- Create: `shared/copy/queryFilterValidationLabel.ts`
- Test: `shared/copy/queryFilterOperatorLabel.test.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/copy/queryFilterOperatorLabel.test.ts`:

```ts
import { queryFilterOperatorLabel } from "$/copy/queryFilterOperatorLabel.ts";
import { QUERY_FILTER_OPERATOR_SPECS } from "$/models/queries/StructuredQuery/QueryFilterOperator.ts";
import { describe, expect, it } from "vitest";

describe("queryFilterOperatorLabel", () => {
  it("reads naturally for text columns", () => {
    expect(queryFilterOperatorLabel("=", "varchar")).toBe("is");
    expect(queryFilterOperatorLabel("contains", "varchar")).toBe("contains");
    expect(queryFilterOperatorLabel("is_blank", "varchar")).toBe("is blank");
  });

  it("reads naturally for dates", () => {
    expect(queryFilterOperatorLabel("=", "date")).toBe("is on");
    expect(queryFilterOperatorLabel(">", "date")).toBe("is after");
    expect(queryFilterOperatorLabel("<=", "date")).toBe("is on or before");
  });

  it("uses comparison wording for numbers", () => {
    expect(queryFilterOperatorLabel(">", "bigint")).toBe("is greater than");
    expect(queryFilterOperatorLabel("<=", "double")).toBe("is at most");
  });

  it("has a label for every operator, including legacy ones", () => {
    QUERY_FILTER_OPERATOR_SPECS.forEach((spec) => {
      expect(queryFilterOperatorLabel(spec.operator, "varchar")).not.toBe("");
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run shared/copy/queryFilterOperatorLabel.test.ts`
Expected: FAIL, cannot resolve `queryFilterOperatorLabel.ts`.

- [ ] **Step 3: Write the operator labels**

Create `shared/copy/queryFilterOperatorLabel.ts`:

```ts
import { t } from "@lingui/core/macro";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { match } from "ts-pattern";
import type { AvaDataType as AvaDataTypeNs } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { QueryFilterOperator } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

/**
 * The user-visible label for a filter operator, worded for the column's type:
 * `>` reads "is after" on a date and "is greater than" on a number.
 *
 * Shared copy resolved at call time so it follows the active locale. The
 * exhaustive match means a new operator cannot ship without a label.
 */
export function queryFilterOperatorLabel(
  operator: QueryFilterOperator,
  dataType: AvaDataTypeNs.T | undefined,
): string {
  const isTemporal = dataType !== undefined && AvaDataType.isTemporal(dataType);
  return match(operator)
    .with("=", () => {
      return isTemporal ? t`is on` : t`is`;
    })
    .with("!=", () => {
      return isTemporal ? t`is not on` : t`is not`;
    })
    .with(">", () => {
      return isTemporal ? t`is after` : t`is greater than`;
    })
    .with(">=", () => {
      return isTemporal ? t`is on or after` : t`is at least`;
    })
    .with("<", () => {
      return isTemporal ? t`is before` : t`is less than`;
    })
    .with("<=", () => {
      return isTemporal ? t`is on or before` : t`is at most`;
    })
    .with("contains", () => {
      return t`contains`;
    })
    .with("not_contains", () => {
      return t`does not contain`;
    })
    .with("starts_with", () => {
      return t`starts with`;
    })
    .with("not_starts_with", () => {
      return t`does not start with`;
    })
    .with("ends_with", () => {
      return t`ends with`;
    })
    .with("not_ends_with", () => {
      return t`does not end with`;
    })
    .with("in", () => {
      return t`is any of`;
    })
    .with("not_in", () => {
      return t`is none of`;
    })
    .with("between", () => {
      return t`is between`;
    })
    .with("not_between", () => {
      return t`is not between`;
    })
    .with("is_null", () => {
      return t`has no value`;
    })
    .with("is_not_null", () => {
      return t`has a value`;
    })
    .with("is_blank", () => {
      return t`is blank`;
    })
    .with("is_not_blank", () => {
      return t`is not blank`;
    })
    .with("is_true", () => {
      return t`is true`;
    })
    .with("is_false", () => {
      return t`is false`;
    })
    .with("matches_regex", () => {
      return t`matches regex`;
    })
    .with("not_matches_regex", () => {
      return t`does not match regex`;
    })
    .with("like", () => {
      return t`matches pattern (legacy)`;
    })
    .with("not_like", () => {
      return t`does not match pattern (legacy)`;
    })
    .exhaustive();
}
```

- [ ] **Step 4: Write the validation labels**

Create `shared/copy/queryFilterValidationLabel.ts`:

```ts
import { t } from "@lingui/core/macro";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { match } from "ts-pattern";
import type { QueryFilterValidationReason } from "$/models/queries/StructuredQuery/QueryFilterValidation.ts";

/**
 * The message shown under a filter rule that cannot be applied.
 *
 * Shared copy resolved at call time so it follows the active locale.
 */
export function queryFilterValidationLabel(
  reason: QueryFilterValidationReason,
): string {
  return match(reason)
    .with({ code: "unknownOperator" }, ({ operator }) => {
      return t`"${operator}" is not an operator this form understands.`;
    })
    .with({ code: "operatorNotAllowedForType" }, ({ dataType }) => {
      const typeName = AvaDataType.toDisplayValue(dataType);
      return t`This condition does not apply to ${typeName} columns.`;
    })
    .with({ code: "valueNotANumber" }, ({ value }) => {
      return t`"${value}" is not a number.`;
    })
    .with({ code: "valueNotADate" }, ({ value }) => {
      return t`"${value}" is not a date. Use YYYY-MM-DD.`;
    })
    .with({ code: "betweenBoundsReversed" }, () => {
      return t`The first value must not be greater than the second.`;
    })
    .with({ code: "regexDoesNotCompile" }, ({ value }) => {
      return t`"${value}" is not a valid regular expression.`;
    })
    .exhaustive();
}
```

- [ ] **Step 5: Run the tests and extract translations**

Run: `npx vitest run shared/copy/queryFilterOperatorLabel.test.ts`
Expected: PASS, 4 tests.

Run: `pnpm i18n:extract`
Expected: `src/i18n/locales/*/messages.po` gain the new strings. Commit the
regenerated catalogs with the code.

- [ ] **Step 6: Commit**

```bash
git add shared/copy/queryFilterOperatorLabel.ts \
        shared/copy/queryFilterOperatorLabel.test.ts \
        shared/copy/queryFilterValidationLabel.ts \
        src/i18n/locales
git commit -m "feat(filters): add localized operator and validation copy"
```

---

## Task 10: Tree conversion with stable ids

The old conversion invented a new object for every node on every render, which is
what unmounts the focused input (R1). It also translated operator names through
two hand-written tables (R3, F15). Both go away: our internal operator ids and
`AND` / `OR` combinators become the library's own names, so conversion is
structural only.

**Files:**
- Create: `src/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversion.ts`
- Test: `src/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversion.test.ts`

- [ ] **Step 1: Write the failing test**

Create
`src/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversion.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  toInternalFilterGroup,
  toLibraryFilterGroup,
} from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversion";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types";

const COLUMN_TYPES: Readonly<Record<string, AvaDataType.T>> = {
  Admin2: "varchar",
  cases: "bigint",
};

const INTERNAL: QueryFilterGroup = {
  type: "group",
  id: "g1",
  combinator: "AND",
  rules: [
    {
      type: "rule",
      id: "r1",
      columnName: "Admin2",
      columnDataType: "varchar",
      operator: "contains",
      value: "san",
    },
    {
      type: "group",
      id: "g2",
      combinator: "OR",
      rules: [
        {
          type: "rule",
          id: "r2",
          columnName: "cases",
          columnDataType: "bigint",
          operator: "between",
          value: [1, 2],
        },
      ],
    },
  ],
};

describe("toLibraryFilterGroup", () => {
  it("maps our nodes onto the library's shape without renaming operators", () => {
    const library = toLibraryFilterGroup(INTERNAL);
    expect(library).toEqual({
      id: "g1",
      combinator: "AND",
      rules: [
        { id: "r1", field: "Admin2", operator: "contains", value: "san" },
        {
          id: "g2",
          combinator: "OR",
          rules: [
            { id: "r2", field: "cases", operator: "between", value: [1, 2] },
          ],
        },
      ],
    });
  });

  it("generates ids for nodes that have none, so identity is stable afterwards", () => {
    const library = toLibraryFilterGroup({
      type: "group",
      combinator: "AND",
      rules: [
        {
          type: "rule",
          columnName: "Admin2",
          operator: "=",
          value: "a",
        },
      ],
    });
    expect(library.id).toMatch(/.+/);
    expect(library.rules[0]?.id).toMatch(/.+/);
  });
});

describe("toInternalFilterGroup", () => {
  it("round-trips a tree, preserving ids", () => {
    const library = toLibraryFilterGroup(INTERNAL);
    const internal = toInternalFilterGroup(library, {
      columnTypes: COLUMN_TYPES,
      matchCaseById: {},
    });
    expect(internal).toEqual(INTERNAL);
  });

  it("derives columnDataType from the live column types", () => {
    const internal = toInternalFilterGroup(
      {
        id: "g1",
        combinator: "AND",
        rules: [{ id: "r1", field: "cases", operator: ">", value: 5 }],
      },
      { columnTypes: COLUMN_TYPES, matchCaseById: {} },
    );
    const rule = internal.rules[0];
    expect(rule?.type === "rule" && rule.columnDataType).toBe("bigint");
  });

  it("leaves columnDataType absent for a column that no longer exists", () => {
    const internal = toInternalFilterGroup(
      {
        id: "g1",
        combinator: "AND",
        rules: [{ id: "r1", field: "gone", operator: "=", value: "x" }],
      },
      { columnTypes: COLUMN_TYPES, matchCaseById: {} },
    );
    const rule = internal.rules[0];
    expect(rule?.type === "rule" && rule.columnDataType).toBeUndefined();
  });

  it("applies match-case state by rule id", () => {
    const internal = toInternalFilterGroup(
      {
        id: "g1",
        combinator: "AND",
        rules: [{ id: "r1", field: "Admin2", operator: "contains", value: "s" }],
      },
      { columnTypes: COLUMN_TYPES, matchCaseById: { r1: true } },
    );
    const rule = internal.rules[0];
    expect(rule?.type === "rule" && rule.matchCase).toBe(true);
  });

  it("normalizes an unexpected combinator to AND", () => {
    const internal = toInternalFilterGroup(
      { id: "g1", combinator: "xor", rules: [] },
      { columnTypes: COLUMN_TYPES, matchCaseById: {} },
    );
    expect(internal.combinator).toBe("AND");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversion.test.ts`
Expected: FAIL, cannot resolve `filterTreeConversion`.

- [ ] **Step 3: Write the implementation**

Create
`src/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversion.ts`:

```ts
import { makeQueryFilterNodeId } from "$/models/queries/StructuredQuery/QueryFilter.types";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type {
  QueryFilterGroup,
  QueryFilterOperator,
  QueryFilterRule,
} from "$/models/queries/StructuredQuery/QueryFilter.types";

/**
 * A rule in `react-querybuilder`'s shape. Operator names are our own internal
 * operator ids: the library is configured with our operator list, so no
 * translation table exists to drift out of sync.
 */
export type LibraryRule = {
  id?: string;
  field: string;
  operator: string;
  value: unknown;
};

export type LibraryGroup = {
  id?: string;
  combinator: string;
  rules: ReadonlyArray<LibraryGroup | LibraryRule>;
};

export type ToInternalOptions = {
  /** Live column types, used to stamp each rule's `columnDataType`. */
  columnTypes: Readonly<Record<string, AvaDataType.T>>;
  /** Per-rule `Match case` state, keyed by rule id. */
  matchCaseById: Readonly<Record<string, boolean>>;
};

function _isLibraryGroup(node: LibraryGroup | LibraryRule): node is LibraryGroup {
  return "rules" in node && "combinator" in node;
}

/** Converts one of our filter groups into the library's tree shape. */
export function toLibraryFilterGroup(group: QueryFilterGroup): LibraryGroup {
  return {
    id: group.id ?? makeQueryFilterNodeId(),
    combinator: group.combinator,
    rules: group.rules.map((child) => {
      if (child.type === "group") {
        return toLibraryFilterGroup(child);
      }
      return {
        id: child.id ?? makeQueryFilterNodeId(),
        field: child.columnName,
        operator: child.operator,
        value: child.value,
      };
    }),
  };
}

/**
 * Converts the library's tree back into our shape.
 *
 * Ids are carried through both directions, which is what keeps React from
 * remounting a rule row (and stealing focus from its value input) on every
 * edit. `columnDataType` is re-derived from the live column types rather than
 * round-tripped, so a rule cannot hold a type the dataset no longer has.
 */
export function toInternalFilterGroup(
  group: LibraryGroup,
  options: ToInternalOptions,
): QueryFilterGroup {
  return {
    type: "group",
    id: group.id ?? makeQueryFilterNodeId(),
    combinator: String(group.combinator).toUpperCase() === "OR" ? "OR" : "AND",
    rules: group.rules.map((child) => {
      if (_isLibraryGroup(child)) {
        return toInternalFilterGroup(child, options);
      }
      const id = child.id ?? makeQueryFilterNodeId();
      const columnDataType = options.columnTypes[child.field];
      const matchCase = options.matchCaseById[id];
      const rule: QueryFilterRule = {
        type: "rule",
        id,
        columnName: child.field,
        operator: child.operator as QueryFilterOperator,
        value: child.value as QueryFilterRule["value"],
        ...(columnDataType === undefined ? {} : { columnDataType }),
        ...(matchCase ? { matchCase: true } : {}),
      };
      return rule;
    }),
  };
}

/** Seeds the match-case map from a tree that already carries the flag. */
export function collectMatchCaseById(
  group: QueryFilterGroup,
): Record<string, boolean> {
  return group.rules.reduce<Record<string, boolean>>((accumulator, child) => {
    if (child.type === "group") {
      return { ...accumulator, ...collectMatchCaseById(child) };
    }
    return child.id !== undefined && child.matchCase === true ?
        { ...accumulator, [child.id]: true }
      : accumulator;
  }, {});
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversion.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversion.ts \
        src/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversion.test.ts
git commit -m "feat(filters): convert the filter tree with stable node ids"
```

---

## Task 11: Local tree state with debounced commit

**Files:**
- Create: `src/views/DataExplorerApp/QueryForm/QueryFiltersField/useFilterTreeState.ts`
- Test: `src/views/DataExplorerApp/QueryForm/QueryFiltersField/useFilterTreeState.test.tsx`

- [ ] **Step 1: Write the failing test**

Create
`src/views/DataExplorerApp/QueryForm/QueryFiltersField/useFilterTreeState.test.tsx`:

```tsx
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFilterTreeState } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/useFilterTreeState";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types";

const COLUMN_TYPES: Readonly<Record<string, AvaDataType.T>> = {
  Admin2: "varchar",
};

const EMPTY: QueryFilterGroup = { type: "group", combinator: "AND", rules: [] };

function _oneRule(value: string): QueryFilterGroup {
  return {
    type: "group",
    id: "g1",
    combinator: "AND",
    rules: [
      {
        type: "rule",
        id: "r1",
        columnName: "Admin2",
        columnDataType: "varchar",
        operator: "=",
        value,
      },
    ],
  };
}

describe("useFilterTreeState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not commit a value edit until the debounce elapses", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => {
      return useFilterTreeState({
        value: _oneRule("Ala"),
        columnTypes: COLUMN_TYPES,
        onChange,
      });
    });

    act(() => {
      result.current.onQueryChange({
        id: "g1",
        combinator: "AND",
        rules: [{ id: "r1", field: "Admin2", operator: "=", value: "Alam" }],
      });
    });
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    const committed = onChange.mock.calls[0]![0] as QueryFilterGroup;
    const rule = committed.rules[0];
    expect(rule?.type === "rule" && rule.value).toBe("Alam");
  });

  it("collapses a burst of keystrokes into one commit", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => {
      return useFilterTreeState({
        value: _oneRule(""),
        columnTypes: COLUMN_TYPES,
        onChange,
      });
    });

    ["A", "Al", "Ala"].forEach((value) => {
      act(() => {
        result.current.onQueryChange({
          id: "g1",
          combinator: "AND",
          rules: [{ id: "r1", field: "Admin2", operator: "=", value }],
        });
        vi.advanceTimersByTime(100);
      });
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const committed = onChange.mock.calls[0]![0] as QueryFilterGroup;
    const rule = committed.rules[0];
    expect(rule?.type === "rule" && rule.value).toBe("Ala");
  });

  it("commits structural changes immediately", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => {
      return useFilterTreeState({
        value: _oneRule("Alameda"),
        columnTypes: COLUMN_TYPES,
        onChange,
      });
    });

    act(() => {
      result.current.commitNow({
        id: "g1",
        combinator: "OR",
        rules: [{ id: "r1", field: "Admin2", operator: "=", value: "Alameda" }],
      });
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(
      (onChange.mock.calls[0]![0] as QueryFilterGroup).combinator,
    ).toBe("OR");
  });

  it("treats a combinator change as structural, without waiting for the debounce", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => {
      return useFilterTreeState({
        value: _oneRule("Alameda"),
        columnTypes: COLUMN_TYPES,
        onChange,
      });
    });

    act(() => {
      result.current.onQueryChange({
        id: "g1",
        combinator: "OR",
        rules: [{ id: "r1", field: "Admin2", operator: "=", value: "Alameda" }],
      });
    });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("treats adding and removing a rule as structural", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => {
      return useFilterTreeState({
        value: _oneRule("Alameda"),
        columnTypes: COLUMN_TYPES,
        onChange,
      });
    });

    act(() => {
      result.current.onQueryChange({
        id: "g1",
        combinator: "AND",
        rules: [
          { id: "r1", field: "Admin2", operator: "=", value: "Alameda" },
          { id: "r2", field: "Admin2", operator: "=", value: "" },
        ],
      });
    });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("treats an operator change as structural", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => {
      return useFilterTreeState({
        value: _oneRule("Alameda"),
        columnTypes: COLUMN_TYPES,
        onChange,
      });
    });

    act(() => {
      result.current.onQueryChange({
        id: "g1",
        combinator: "AND",
        rules: [
          { id: "r1", field: "Admin2", operator: "contains", value: "Alameda" },
        ],
      });
    });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("adopts an externally replaced value, such as Reset", () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      (props: { value: QueryFilterGroup }) => {
        return useFilterTreeState({
          value: props.value,
          columnTypes: COLUMN_TYPES,
          onChange,
        });
      },
      { initialProps: { value: _oneRule("Alameda") } },
    );

    expect(result.current.query.rules).toHaveLength(1);
    rerender({ value: EMPTY });
    expect(result.current.query.rules).toHaveLength(0);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps local edits when the parent echoes back what we committed", () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      (props: { value: QueryFilterGroup }) => {
        return useFilterTreeState({
          value: props.value,
          columnTypes: COLUMN_TYPES,
          onChange,
        });
      },
      { initialProps: { value: _oneRule("Ala") } },
    );

    act(() => {
      result.current.onQueryChange({
        id: "g1",
        combinator: "AND",
        rules: [{ id: "r1", field: "Admin2", operator: "=", value: "Alameda" }],
      });
      vi.advanceTimersByTime(300);
    });
    rerender({ value: _oneRule("Alameda") });

    const rule = result.current.query.rules[0];
    expect(rule && "value" in rule && rule.value).toBe("Alameda");
  });

  it("tracks match case per rule and commits it", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => {
      return useFilterTreeState({
        value: _oneRule("Alameda"),
        columnTypes: COLUMN_TYPES,
        onChange,
      });
    });

    act(() => {
      result.current.setMatchCase("r1", true);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const committed = onChange.mock.calls[0]![0] as QueryFilterGroup;
    const rule = committed.rules[0];
    expect(rule?.type === "rule" && rule.matchCase).toBe(true);
    expect(result.current.matchCaseById.r1).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/views/DataExplorerApp/QueryForm/QueryFiltersField/useFilterTreeState.test.tsx`
Expected: FAIL, cannot resolve `useFilterTreeState`.

- [ ] **Step 3: Write the hook**

Create
`src/views/DataExplorerApp/QueryForm/QueryFiltersField/useFilterTreeState.ts`:

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collectMatchCaseById,
  toInternalFilterGroup,
  toLibraryFilterGroup,
} from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversion";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types";
import type {
  LibraryGroup,
} from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversion";

/** Milliseconds of quiet before a typed value is committed upward. */
const COMMIT_DEBOUNCE_MS = 300;

/**
 * Everything about a tree except the values typed into it. Two trees with the
 * same signature differ only in what the user is typing, which is the one case
 * worth debouncing.
 */
function structureSignature(group: LibraryGroup): string {
  const parts = group.rules.map((child) => {
    if ("rules" in child && "combinator" in child) {
      return structureSignature(child as LibraryGroup);
    }
    const rule = child as { id?: string; field: string; operator: string };
    return `${rule.id ?? ""}:${rule.field}:${rule.operator}`;
  });
  return `${group.id ?? ""}:${group.combinator}(${parts.join(",")})`;
}

type Options = {
  /** The committed filter tree owned by the form. */
  value: QueryFilterGroup;
  /** Live column types, used to stamp each rule's data type on commit. */
  columnTypes: Readonly<Record<string, AvaDataType.T>>;
  onChange: (next: QueryFilterGroup) => void;
};

type FilterTreeState = {
  /** The tree the query builder renders. Owned locally while editing. */
  query: LibraryGroup;
  /** Per-rule `Match case` state, keyed by rule id. */
  matchCaseById: Readonly<Record<string, boolean>>;
  /** Debounced commit, for value typing. */
  onQueryChange: (next: LibraryGroup) => void;
  /** Immediate commit, for structural edits, blur, and Enter. */
  commitNow: (next: LibraryGroup) => void;
  setMatchCase: (ruleId: string, matchCase: boolean) => void;
};

/**
 * Owns the query-builder tree while the user is editing it.
 *
 * The library tree is local state, not a value derived from props on every
 * render, so a keystroke does not rebuild the tree, remount the row, and drop
 * focus. Commits upward are debounced while typing and immediate for
 * structural edits, which is also what stops a query running for a rule the
 * user has not finished writing.
 */
export function useFilterTreeState({
  value,
  columnTypes,
  onChange,
}: Options): FilterTreeState {
  const [query, setQuery] = useState<LibraryGroup>(() => {
    return toLibraryFilterGroup(value);
  });
  const [matchCaseById, setMatchCaseById] = useState<Record<string, boolean>>(
    () => {
      return collectMatchCaseById(value);
    },
  );

  /** The last tree we sent upward, so the echo of our own commit is ignored. */
  const committedRef = useRef<QueryFilterGroup>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Adopt externally replaced trees (Reset, Open, SQL-to-form mapping) while
  // ignoring the parent echoing back the tree we just committed.
  useEffect(
    function adoptExternalValue() {
      if (JSON.stringify(value) === JSON.stringify(committedRef.current)) {
        return;
      }
      committedRef.current = value;
      setQuery(toLibraryFilterGroup(value));
      setMatchCaseById(collectMatchCaseById(value));
    },
    [value],
  );

  useEffect(function clearTimerOnUnmount() {
    return () => {
      if (timerRef.current !== undefined) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const commit = useCallback(
    (next: LibraryGroup, matchCase: Readonly<Record<string, boolean>>) => {
      const internal = toInternalFilterGroup(next, {
        columnTypes,
        matchCaseById: matchCase,
      });
      committedRef.current = internal;
      onChange(internal);
    },
    [columnTypes, onChange],
  );

  const commitNow = useCallback(
    (next: LibraryGroup) => {
      if (timerRef.current !== undefined) {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
      setQuery(next);
      commit(next, matchCaseById);
    },
    [commit, matchCaseById],
  );

  const onQueryChange = useCallback(
    (next: LibraryGroup) => {
      // Only a typed value should wait for the debounce. Adding or removing a
      // rule, switching a column, an operator, or a combinator is a deliberate
      // act that should take effect at once.
      if (structureSignature(next) !== structureSignature(query)) {
        commitNow(next);
        return;
      }
      setQuery(next);
      if (timerRef.current !== undefined) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = undefined;
        commit(next, matchCaseById);
      }, COMMIT_DEBOUNCE_MS);
    },
    [commit, commitNow, matchCaseById, query],
  );

  const setMatchCase = useCallback(
    (ruleId: string, matchCase: boolean) => {
      const nextMatchCase = { ...matchCaseById, [ruleId]: matchCase };
      setMatchCaseById(nextMatchCase);
      commit(query, nextMatchCase);
    },
    [commit, matchCaseById, query],
  );

  return useMemo(() => {
    return {
      query,
      matchCaseById,
      onQueryChange,
      commitNow,
      setMatchCase,
    };
  }, [query, matchCaseById, onQueryChange, commitNow, setMatchCase]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/views/DataExplorerApp/QueryForm/QueryFiltersField/useFilterTreeState.test.tsx`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/views/DataExplorerApp/QueryForm/QueryFiltersField/useFilterTreeState.ts \
        src/views/DataExplorerApp/QueryForm/QueryFiltersField/useFilterTreeState.test.tsx
git commit -m "feat(filters): own the filter tree locally with debounced commits"
```

---

## Task 12: Typed value editors

**Files:**
- Create: `src/views/DataExplorerApp/QueryForm/QueryFiltersField/FilterValueEditor.tsx`
- Test: `src/views/DataExplorerApp/QueryForm/QueryFiltersField/FilterValueEditor.test.tsx`

- [ ] **Step 1: Write the failing test**

Create
`src/views/DataExplorerApp/QueryForm/QueryFiltersField/FilterValueEditor.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { fireEvent, render, screen } from "@/test-utils";
import { FilterValueEditor } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/FilterValueEditor";
import type { FilterValueEditorProps } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/FilterValueEditor";

function _renderEditor(overrides: Partial<FilterValueEditorProps> = {}) {
  const props: FilterValueEditorProps = {
    operator: "=",
    dataType: "varchar",
    value: "",
    onChange: vi.fn(),
    onCommit: vi.fn(),
    ...overrides,
  };
  render(
    <AvandarAppProvider>
      <FilterValueEditor {...props} />
    </AvandarAppProvider>,
  );
  return props;
}

describe("FilterValueEditor", () => {
  it("renders nothing for operators that take no value", () => {
    _renderEditor({ operator: "is_null" });
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("renders a text box for text columns and reports each change", () => {
    const props = _renderEditor({ value: "Ala" });
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Alam" } });
    expect(props.onChange).toHaveBeenCalledWith("Alam");
  });

  it("renders a numeric input for numeric columns", () => {
    _renderEditor({ dataType: "bigint", operator: ">", value: 5 });
    expect(screen.getByRole("textbox")).toHaveAttribute("inputmode", "numeric");
  });

  it("renders a date input for date columns", () => {
    _renderEditor({ dataType: "date", operator: ">", value: "2020-05-01" });
    expect(screen.getByTestId("filter-value-date")).toHaveAttribute(
      "type",
      "date",
    );
  });

  it("renders two bounds with a separator for between", () => {
    _renderEditor({
      dataType: "bigint",
      operator: "between",
      value: [100, 200],
    });
    expect(screen.getByTestId("filter-value-lower")).toBeInTheDocument();
    expect(screen.getByTestId("filter-value-upper")).toBeInTheDocument();
    expect(screen.getByText("and")).toBeInTheDocument();
  });

  it("reports a pair edit as an array", () => {
    const props = _renderEditor({
      dataType: "bigint",
      operator: "between",
      value: [100, 200],
    });
    fireEvent.change(screen.getByTestId("filter-value-upper"), {
      target: { value: "300" },
    });
    expect(props.onChange).toHaveBeenCalledWith([100, "300"]);
  });

  it("renders a chip list for list operators", () => {
    _renderEditor({ operator: "in", value: ["Alameda", "Butte"] });
    expect(screen.getByText("Alameda")).toBeInTheDocument();
    expect(screen.getByText("Butte")).toBeInTheDocument();
  });

  it("commits on blur so a debounce cannot swallow the last edit", () => {
    const props = _renderEditor({ value: "Alameda" });
    fireEvent.blur(screen.getByRole("textbox"));
    expect(props.onCommit).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/views/DataExplorerApp/QueryForm/QueryFiltersField/FilterValueEditor.test.tsx`
Expected: FAIL, cannot resolve `FilterValueEditor`.

- [ ] **Step 3: Write the component**

Create
`src/views/DataExplorerApp/QueryForm/QueryFiltersField/FilterValueEditor.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Group, TagsInput, Text, TextInput } from "@mantine/core";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { operatorSpec } from "$/models/queries/StructuredQuery/QueryFilterOperator";
import { filterValueAsList } from "$/models/queries/StructuredQuery/QueryFilterValue";
import { match } from "ts-pattern";
import classes from "./QueryFiltersField.module.css";
import type { AvaDataType as AvaDataTypeNs } from "$/models/datasets/AvaDataType/AvaDataType";
import type {
  QueryFilterOperator,
  QueryFilterRule,
} from "$/models/queries/StructuredQuery/QueryFilter.types";
import type { ReactNode } from "react";

export type FilterValueEditorProps = {
  operator: QueryFilterOperator;
  dataType: AvaDataTypeNs.T | undefined;
  value: QueryFilterRule["value"];
  /** Called on every edit; the caller debounces. */
  onChange: (next: QueryFilterRule["value"]) => void;
  /** Called on blur and on Enter so the last edit is never left pending. */
  onCommit: () => void;
};

/** The HTML input type that matches a temporal column. */
function _temporalInputType(dataType: AvaDataTypeNs.T): string {
  return match(dataType)
    .with("date", () => {
      return "date";
    })
    .with("time", () => {
      return "time";
    })
    .otherwise(() => {
      return "datetime-local";
    });
}

/**
 * The value control for one filter rule, chosen by the operator's value arity
 * and the column's type: a chip list for `in`, two labelled bounds for
 * `between`, a date picker for dates, a numeric field for numbers, nothing at
 * all for `is null`.
 */
export function FilterValueEditor({
  operator,
  dataType,
  value,
  onChange,
  onCommit,
}: FilterValueEditorProps): ReactNode {
  const { t } = useLingui();
  const spec = operatorSpec(operator);
  const arity = spec?.arity ?? "scalar";

  if (arity === "none") {
    return null;
  }

  const isNumeric = dataType !== undefined && AvaDataType.isNumeric(dataType);
  const isTemporal = dataType !== undefined && AvaDataType.isTemporal(dataType);

  function scalarInput(options: {
    testId: string;
    current: string | number;
    placeholder: string;
    onValue: (next: string) => void;
  }): ReactNode {
    if (isTemporal) {
      return (
        <TextInput
          size="sm"
          data-testid={options.testId}
          type={_temporalInputType(dataType!)}
          value={String(options.current ?? "")}
          onChange={(event) => {
            options.onValue(event.currentTarget.value);
          }}
          onBlur={onCommit}
          className={classes.valueControl}
        />
      );
    }
    return (
      <TextInput
        size="sm"
        data-testid={options.testId}
        inputMode={isNumeric ? "numeric" : undefined}
        placeholder={options.placeholder}
        value={String(options.current ?? "")}
        onChange={(event) => {
          options.onValue(event.currentTarget.value);
        }}
        onBlur={onCommit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onCommit();
          }
        }}
        className={classes.valueControl}
      />
    );
  }

  if (arity === "list") {
    return (
      <TagsInput
        size="sm"
        data-testid="filter-value-list"
        placeholder={t`Add a value`}
        value={filterValueAsList(value).map((item) => {
          return String(item);
        })}
        onChange={(next) => {
          onChange(next);
        }}
        onBlur={onCommit}
        className={classes.valueControl}
      />
    );
  }

  if (arity === "pair") {
    const [lower, upper] = filterValueAsList(value, { dropEmpty: false });
    return (
      <Group gap="xs" wrap="nowrap" className={classes.valuePair}>
        {scalarInput({
          testId: "filter-value-lower",
          current: lower ?? "",
          placeholder: t`Lower bound`,
          onValue: (next) => {
            onChange([next, upper ?? ""]);
          },
        })}
        <Text size="sm" c="neutral.6">
          {t`and`}
        </Text>
        {scalarInput({
          testId: "filter-value-upper",
          current: upper ?? "",
          placeholder: t`Upper bound`,
          onValue: (next) => {
            onChange([lower ?? "", next]);
          },
        })}
      </Group>
    );
  }

  const scalarValue = Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  return scalarInput({
    testId: isTemporal ? "filter-value-date" : "filter-value-scalar",
    current: scalarValue as string | number,
    placeholder:
      operator === "matches_regex" || operator === "not_matches_regex" ?
        t`Regular expression`
      : t`Value`,
    onValue: onChange,
  });
}
```

Note the pair editor reports `[lower, upper]` with the untouched bound passed
through unchanged, which is why the test expects `[100, "300"]`: the lower bound
keeps its number type and the edited bound arrives as the input's string. The SQL
layer coerces both (Task 2), so this asymmetry is harmless and avoids guessing at
partial numeric input like `-` or `1.`.

- [ ] **Step 4: Add the styles the editor references**

Append to
`src/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField.module.css`:

```css
/* Value controls flex to fill the row; the bounds pair splits what it gets. */
.valueControl {
  flex: 1 1 auto;
  min-width: 7rem;
}

.valuePair {
  flex: 1 1 auto;
  min-width: 12rem;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/views/DataExplorerApp/QueryForm/QueryFiltersField/FilterValueEditor.test.tsx`
Expected: PASS, 8 tests.

- [ ] **Step 6: Commit**

```bash
git add src/views/DataExplorerApp/QueryForm/QueryFiltersField/FilterValueEditor.tsx \
        src/views/DataExplorerApp/QueryForm/QueryFiltersField/FilterValueEditor.test.tsx \
        src/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField.module.css
git commit -m "feat(filters): add typed value editors for filter rules"
```

---

## Task 13: Custom controls and row layout

Rather than replace `react-querybuilder`'s `Rule` component (which would mean
reimplementing its wiring), we replace the individual controls it renders and
lay the row out with CSS. Verified against the installed 8.20.2: control
components receive `rule: RuleType`, `value`, `handleOnChange(value)`,
`options`, `fieldData`, `className`, `title`, `disabled`, and the `context`
object passed to `QueryBuilder`.

**Files:**
- Create: `src/views/DataExplorerApp/QueryForm/QueryFiltersField/filterControls.tsx`
- Modify: `src/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField.module.css`
- Test: covered by Task 14's component tests (these controls have no behavior of their own beyond forwarding)

- [ ] **Step 1: Write the controls**

Create
`src/views/DataExplorerApp/QueryForm/QueryFiltersField/filterControls.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Button, Select, Tooltip } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { queryFilterOperatorLabel } from "$/copy/queryFilterOperatorLabel";
import classes from "./QueryFiltersField.module.css";
import { FilterValueEditor } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/FilterValueEditor";
import { MatchCaseToggle } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/MatchCaseToggle";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { QueryFilterOperator } from "$/models/queries/StructuredQuery/QueryFilter.types";
import type {
  ActionProps,
  CombinatorSelectorProps,
  FieldSelectorProps,
  OperatorSelectorProps,
  ValueEditorProps,
} from "react-querybuilder";
import type { ReactNode } from "react";

/**
 * Everything our controls need beyond what react-querybuilder gives them,
 * passed through `QueryBuilder`'s `context` prop.
 */
export type FilterControlsContext = {
  /** Column data types keyed by column name. */
  columnTypes: Readonly<Record<string, AvaDataType.T>>;
  matchCaseById: Readonly<Record<string, boolean>>;
  setMatchCase: (ruleId: string, matchCase: boolean) => void;
  /** Flushes any pending debounced commit. */
  commitNow: () => void;
};

function _context(context: unknown): FilterControlsContext {
  return context as FilterControlsContext;
}

/**
 * Column picker. Renders the name from its start with an ellipsis and a
 * tooltip, because a long column name used to render as its own tail with no
 * indication that it was cut.
 */
export function FilterFieldSelector(props: FieldSelectorProps): ReactNode {
  const { t } = useLingui();
  const selected = String(props.value ?? "");
  return (
    <Tooltip label={selected} disabled={selected === ""} withinPortal>
      <Select
        size="sm"
        label={undefined}
        aria-label={t`Column`}
        placeholder={t`Column`}
        data={props.options.map((option) => {
          const name = "name" in option ? String(option.name) : "";
          return { value: name, label: name };
        })}
        value={selected === "" ? null : selected}
        onChange={(next) => {
          props.handleOnChange(next ?? "");
        }}
        searchable
        comboboxProps={{ withinPortal: true, width: "target", position: "bottom-start" }}
        className={classes.fieldControl}
        classNames={{ input: classes.truncatedInput, option: classes.wrappingOption }}
      />
    </Tooltip>
  );
}

/** Operator picker, labelled for the column's type. */
export function FilterOperatorSelector(
  props: OperatorSelectorProps,
): ReactNode {
  const { t } = useLingui();
  const dataType = _context(props.context).columnTypes[props.field];
  return (
    <Select
      size="sm"
      aria-label={t`Condition`}
      data={props.options.map((option) => {
        const name = "name" in option ? String(option.name) : "";
        return {
          value: name,
          label: queryFilterOperatorLabel(name as QueryFilterOperator, dataType),
        };
      })}
      value={String(props.value ?? "")}
      onChange={(next) => {
        props.handleOnChange(next ?? "=");
      }}
      comboboxProps={{ withinPortal: true, position: "bottom-start" }}
      className={classes.operatorControl}
      classNames={{ option: classes.wrappingOption }}
    />
  );
}

/** Value editor plus, for text operators, the `Match case` toggle. */
export function FilterValueEditorControl(props: ValueEditorProps): ReactNode {
  const context = _context(props.context);
  const ruleId = props.rule.id ?? "";
  const dataType = context.columnTypes[props.field];
  return (
    <div className={classes.valueSlot}>
      <FilterValueEditor
        operator={props.operator as QueryFilterOperator}
        dataType={dataType}
        value={props.value}
        onChange={(next) => {
          props.handleOnChange(next);
        }}
        onCommit={context.commitNow}
      />
      <MatchCaseToggle
        operator={props.operator as QueryFilterOperator}
        dataType={dataType}
        matchCase={context.matchCaseById[ruleId] === true}
        onChange={(next) => {
          context.setMatchCase(ruleId, next);
        }}
      />
    </div>
  );
}

/**
 * Remove buttons. A ghost icon rather than a solid blue block, so removing a
 * rule stops out-weighing the rule itself.
 */
export function FilterRemoveAction(props: ActionProps): ReactNode {
  const { t } = useLingui();
  const isGroup = "combinator" in props.ruleOrGroup;
  return (
    <ActionIcon
      variant="subtle"
      color="gray"
      size="md"
      aria-label={isGroup ? t`Remove group` : t`Remove condition`}
      onClick={(event) => {
        props.handleOnClick(event);
      }}
      className={classes.removeAction}
    >
      <IconTrash size={16} />
    </ActionIcon>
  );
}

/** Add buttons, de-emphasised so the conditions read louder than the chrome. */
export function FilterAddAction(props: ActionProps): ReactNode {
  return (
    <Button
      variant="light"
      size="compact-sm"
      onClick={(event) => {
        props.handleOnClick(event);
      }}
      className={classes.addAction}
    >
      {props.label}
    </Button>
  );
}

/** AND / OR picker. Its options are our own combinator values, so it displays. */
export function FilterCombinatorSelector(
  props: CombinatorSelectorProps,
): ReactNode {
  const { t } = useLingui();
  return (
    <Select
      size="sm"
      aria-label={t`Combine conditions with`}
      data={props.options.map((option) => {
        const name = "name" in option ? String(option.name) : "";
        const label = "label" in option ? String(option.label) : name;
        return { value: name, label };
      })}
      value={String(props.value ?? "AND")}
      onChange={(next) => {
        props.handleOnChange(next ?? "AND");
      }}
      comboboxProps={{ withinPortal: true, position: "bottom-start" }}
      className={classes.combinatorControl}
      allowDeselect={false}
    />
  );
}
```

- [ ] **Step 2: Write the match-case toggle**

Create
`src/views/DataExplorerApp/QueryForm/QueryFiltersField/MatchCaseToggle.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconLetterCase } from "@tabler/icons-react";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { operatorSpec } from "$/models/queries/StructuredQuery/QueryFilterOperator";
import type { AvaDataType as AvaDataTypeNs } from "$/models/datasets/AvaDataType/AvaDataType";
import type { QueryFilterOperator } from "$/models/queries/StructuredQuery/QueryFilter.types";
import type { ReactNode } from "react";

type Props = {
  operator: QueryFilterOperator;
  dataType: AvaDataTypeNs.T | undefined;
  matchCase: boolean;
  onChange: (matchCase: boolean) => void;
};

/**
 * Toggles case-sensitive matching for one rule. Text comparison is
 * case-insensitive by default, so this is the opt-in for the stricter reading.
 * Hidden when the operator or column type does not care about case.
 */
export function MatchCaseToggle({
  operator,
  dataType,
  matchCase,
  onChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const spec = operatorSpec(operator);
  const isTextColumn =
    dataType === undefined || AvaDataType.isText(dataType);
  if (!spec?.supportsMatchCase || !isTextColumn) {
    return null;
  }
  return (
    <Tooltip label={t`Match case`} withinPortal>
      <ActionIcon
        variant={matchCase ? "filled" : "subtle"}
        color={matchCase ? "blue" : "gray"}
        size="md"
        aria-label={t`Match case`}
        aria-pressed={matchCase}
        onClick={() => {
          onChange(!matchCase);
        }}
      >
        <IconLetterCase size={16} />
      </ActionIcon>
    </Tooltip>
  );
}
```

Confirm the icon names exist before running: `grep -o "IconLetterCase\|IconTrash"
node_modules/@tabler/icons-react/dist/esm/tabler-icons-react.d.ts | sort -u`. If
`IconLetterCase` is absent in the installed version, use `IconTextSize`.

- [ ] **Step 3: Replace the stylesheet**

Replace the entire contents of
`src/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField.module.css`
with:

```css
/*
 * Layout for the react-querybuilder tree.
 *
 * Two hosts render this: the Data Explorer drawer (wide, `layout="columns"`)
 * and the dashboard query panel (narrow, `layout="stacked"`). Everything below
 * is expressed as flex behaviour with minimum widths so one rule occupies one
 * row when there is room and wraps to two when there is not, instead of
 * stacking one control per line.
 */

.queryFiltersField {
  /* Own scroll area: the tree scrolls, the rest of the drawer does not. */
  max-height: 18rem;
  overflow-y: auto;
  font-size: var(--mantine-font-size-sm);
}

/* stylelint-disable selector-class-pattern -- third-party class names */

.queryFiltersField :global(.ruleGroup) {
  padding: var(--mantine-spacing-xs);
  border: 1px solid var(--ava-border-default);
  border-radius: var(--mantine-radius-sm);
  background: var(--mantine-color-body);
}

/* Nested groups: indent and mark depth with a rail rather than more tint. */
.queryFiltersField :global(.ruleGroup) :global(.ruleGroup) {
  margin-left: 0.75rem;
  border-left: 2px solid var(--mantine-color-blue-4);
  background: var(--mantine-color-gray-0);
}

.queryFiltersField :global(.ruleGroup-header) {
  display: flex;
  flex-wrap: wrap;
  gap: var(--mantine-spacing-xs);
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 1;
  padding-bottom: var(--mantine-spacing-xs);
  background: inherit;
}

.queryFiltersField :global(.ruleGroup-body) {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* One rule per row, wrapping to a second line in narrow hosts. */
.queryFiltersField :global(.rule) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--mantine-spacing-xs);
  padding: var(--mantine-spacing-xs) 0;
  border-bottom: 1px solid var(--mantine-color-gray-2);
}

.queryFiltersField :global(.rule:last-child) {
  border-bottom: none;
}

/* stylelint-enable selector-class-pattern */

.fieldControl {
  flex: 2 1 9rem;
  min-width: 8rem;
}

.operatorControl {
  flex: 1 1 8rem;
  min-width: 7rem;
}

.combinatorControl {
  flex: 0 0 6rem;
}

.valueSlot {
  display: flex;
  flex: 3 1 12rem;
  gap: var(--mantine-spacing-xs);
  align-items: center;
  min-width: 10rem;
}

.valueControl {
  flex: 1 1 auto;
  min-width: 7rem;
}

.valuePair {
  flex: 1 1 auto;
  min-width: 12rem;
}

/* Show a long column name from its start, cut with an ellipsis. */
.truncatedInput {
  text-overflow: ellipsis;
}

/* Dropdown options wrap instead of clipping mid-word. */
.wrappingOption {
  white-space: normal;
  overflow-wrap: anywhere;
}

.removeAction {
  flex: 0 0 auto;
}

.addAction {
  flex: 0 0 auto;
}

/* A rule excluded from the query: dimmed, with its reason underneath. */
.ruleNotApplied {
  opacity: 0.65;
}

.ruleMessage {
  flex: 1 1 100%;
  padding-left: 0.25rem;
}
```

- [ ] **Step 4: Compact the overwrite banner**

The `Overwrite SQL?` alert takes roughly 130px of a drawer that is only about
270px tall, pushing the filters out of view whenever it appears. In
`src/views/DataExplorerApp/QueryForm/ManualQueryForm/OverwriteSqlAlert/OverwriteSqlAlert.tsx`,
put the explanation and both actions on one line: keep the `Alert` but drop the
`title` into the body text, replace the stacked links with a
`Group gap="sm" wrap="nowrap"` holding the two actions, and give the component
`py="xs"`. Do not change the copy or the behaviour, only the density.

- [ ] **Step 5: Verify the stylesheet lints**

Run: `pnpm lint:css`
Expected: PASS. If stylelint objects to `:global(...)` nesting, keep the
`stylelint-disable selector-class-pattern` block as written; that pattern is
already used in this file's previous version.

- [ ] **Step 6: Commit**

```bash
git add src/views/DataExplorerApp/QueryForm/QueryFiltersField/filterControls.tsx \
        src/views/DataExplorerApp/QueryForm/QueryFiltersField/MatchCaseToggle.tsx \
        src/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField.module.css \
        src/views/DataExplorerApp/QueryForm/ManualQueryForm/OverwriteSqlAlert/OverwriteSqlAlert.tsx
git commit -m "feat(filters): add custom filter controls and one-row layout"
```

---

## Task 14: Rewire `QueryFiltersField`

**Files:**
- Modify: `src/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversion.ts` (add `normalizeLibraryTree`)
- Modify: `src/views/DataExplorerApp/QueryForm/QueryFiltersField/useFilterTreeState.ts` (normalize on change)
- Modify: `src/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField.tsx` (replace the whole file)
- Test: `src/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversion.test.ts` (add cases)
- Test: `src/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField.test.tsx`

- [ ] **Step 1: Write the failing normalization test**

Append to `filterTreeConversion.test.ts`:

```ts
describe("normalizeLibraryTree", () => {
  it("keeps the operator when the new column has the same type facet", () => {
    const next = normalizeLibraryTree(
      {
        id: "g1",
        combinator: "AND",
        rules: [{ id: "r1", field: "Admin2", operator: "contains", value: "s" }],
      },
      { Admin2: "varchar", other: "varchar" },
    );
    expect(next.rules[0]).toEqual({
      id: "r1",
      field: "Admin2",
      operator: "contains",
      value: "s",
    });
  });

  it("resets an operator the new column type cannot use, and clears the value", () => {
    const next = normalizeLibraryTree(
      {
        id: "g1",
        combinator: "AND",
        rules: [{ id: "r1", field: "cases", operator: "contains", value: "s" }],
      },
      { cases: "bigint" },
    );
    expect(next.rules[0]).toEqual({
      id: "r1",
      field: "cases",
      operator: "=",
      value: "",
    });
  });

  it("normalizes nested groups too", () => {
    const next = normalizeLibraryTree(
      {
        id: "g1",
        combinator: "AND",
        rules: [
          {
            id: "g2",
            combinator: "OR",
            rules: [{ id: "r1", field: "cases", operator: "is_blank", value: null }],
          },
        ],
      },
      { cases: "bigint" },
    );
    const nested = next.rules[0];
    expect(nested && "rules" in nested && nested.rules[0]).toEqual({
      id: "r1",
      field: "cases",
      operator: "=",
      value: "",
    });
  });

  it("leaves rules on unknown columns alone", () => {
    const rule = { id: "r1", field: "gone", operator: "contains", value: "s" };
    const next = normalizeLibraryTree(
      { id: "g1", combinator: "AND", rules: [rule] },
      { Admin2: "varchar" },
    );
    expect(next.rules[0]).toEqual(rule);
  });
});
```

Add `normalizeLibraryTree` to that file's import from `filterTreeConversion`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversion.test.ts`
Expected: FAIL, `normalizeLibraryTree` is not exported.

- [ ] **Step 3: Add the normalizer**

Append to
`src/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversion.ts`:

```ts
/**
 * Keeps each rule's operator legal for its column's type.
 *
 * `react-querybuilder`'s own `resetOnFieldChange` clears the operator and value
 * on every column change, which silently discarded work. This is the narrower
 * rule: keep both when the new column has the same type facet, reset only when
 * the operator genuinely cannot apply. Rules on columns we know nothing about
 * are left alone, because an unknown column is rendered as text and every text
 * operator is legal there.
 */
export function normalizeLibraryTree(
  group: LibraryGroup,
  columnTypes: Readonly<Record<string, AvaDataType.T>>,
): LibraryGroup {
  return {
    ...group,
    rules: group.rules.map((child) => {
      if (_isLibraryGroup(child)) {
        return normalizeLibraryTree(child, columnTypes);
      }
      const dataType = columnTypes[child.field];
      if (dataType === undefined) {
        return child;
      }
      const allowed = operatorsForDataType(dataType);
      if (allowed.includes(child.operator as QueryFilterOperator)) {
        return child;
      }
      return {
        ...child,
        operator: defaultOperatorForDataType(dataType),
        value: "",
      };
    }),
  };
}
```

with the added import:

```ts
import {
  defaultOperatorForDataType,
  operatorsForDataType,
} from "$/models/queries/StructuredQuery/QueryFilterOperator";
```

- [ ] **Step 4: Normalize inside the hook**

In `useFilterTreeState.ts`, import the normalizer:

```ts
import {
  collectMatchCaseById,
  normalizeLibraryTree,
  toInternalFilterGroup,
  toLibraryFilterGroup,
} from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversion";
```

Then normalize at the top of both `onQueryChange` and `commitNow`, replacing
their first line (`setQuery(next);`) with:

```ts
      const normalized = normalizeLibraryTree(next, columnTypes);
      setQuery(normalized);
```

and use `normalized` in place of `next` for the rest of each function body. Add
`columnTypes` to both `useCallback` dependency arrays.

- [ ] **Step 5: Run the conversion tests**

Run: `npx vitest run src/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversion.test.ts src/views/DataExplorerApp/QueryForm/QueryFiltersField/useFilterTreeState.test.tsx`
Expected: PASS, 20 tests (11 conversion, 9 hook).

- [ ] **Step 6: Write the failing component test**

Create
`src/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField.test.tsx`:

```tsx
/**
 * Behavioural tests for the filter builder. The first one is the regression
 * test for the bug that made the panel unusable: the value input used to be
 * unmounted on every keystroke, so focus jumped to `<body>` and only the first
 * character landed.
 */
import { Model } from "@avandar/models";
import { describe, expect, it, vi } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { QueryFiltersField } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField";
import type { QueryColumnRead } from "$/models/queries/QueryColumn/QueryColumn.types";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types";

function _column(name: string, dataType: string): QueryColumnRead {
  return Model.make("QueryColumn", {
    id: `qc_${name}`,
    baseColumn: Model.make("DatasetColumn", {
      id: `dc_${name}`,
      name,
      originalName: name,
      dataType,
      columnIdx: 0,
    }),
    aggregation: undefined,
  }) as unknown as QueryColumnRead;
}

const COLUMNS = [
  _column("Admin2", "varchar"),
  _column("daily_new_cases", "bigint"),
  _column("province_state_administrative_name", "varchar"),
];

const ONE_TEXT_RULE: QueryFilterGroup = {
  type: "group",
  id: "g1",
  combinator: "AND",
  rules: [
    {
      type: "rule",
      id: "r1",
      columnName: "Admin2",
      columnDataType: "varchar",
      operator: "contains",
      value: "",
    },
  ],
};

function _renderField(
  value: QueryFilterGroup,
  onChange = vi.fn<(next: QueryFilterGroup) => void>(),
) {
  render(
    <AvandarAppProvider>
      <QueryFiltersField columns={COLUMNS} value={value} onChange={onChange} />
    </AvandarAppProvider>,
  );
  return onChange;
}

describe("QueryFiltersField", () => {
  it("keeps focus in the value input across several keystrokes", () => {
    _renderField(ONE_TEXT_RULE);
    const input = screen.getByTestId("filter-value-scalar");

    input.focus();
    expect(document.activeElement).toBe(input);

    fireEvent.change(input, { target: { value: "s" } });
    expect(document.activeElement).toBe(screen.getByTestId("filter-value-scalar"));

    fireEvent.change(screen.getByTestId("filter-value-scalar"), {
      target: { value: "sa" },
    });
    fireEvent.change(screen.getByTestId("filter-value-scalar"), {
      target: { value: "san" },
    });

    expect(screen.getByTestId("filter-value-scalar")).toHaveValue("san");
    expect(document.activeElement).toBe(screen.getByTestId("filter-value-scalar"));
  });

  it("shows the combinator as And and can switch it to Or", async () => {
    const onChange = _renderField({
      ...ONE_TEXT_RULE,
      rules: [
        ONE_TEXT_RULE.rules[0]!,
        {
          type: "rule",
          id: "r2",
          columnName: "Admin2",
          columnDataType: "varchar",
          operator: "=",
          value: "Butte",
        },
      ],
    });

    const combinator = screen.getByLabelText("Combine conditions with");
    expect(combinator).toHaveValue("And");

    fireEvent.click(combinator);
    fireEvent.click(await screen.findByRole("option", { name: "Or" }));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });
    const committed = onChange.mock.calls.at(-1)![0];
    expect(committed.combinator).toBe("OR");
  });

  it("offers operators that suit the column type", async () => {
    _renderField({
      type: "group",
      id: "g1",
      combinator: "AND",
      rules: [
        {
          type: "rule",
          id: "r1",
          columnName: "daily_new_cases",
          columnDataType: "bigint",
          operator: ">",
          value: 5,
        },
      ],
    });

    fireEvent.click(screen.getByLabelText("Condition"));
    expect(await screen.findByRole("option", { name: "is between" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "contains" })).toBeNull();
  });

  it("shows full column names in the column dropdown", async () => {
    _renderField(ONE_TEXT_RULE);
    fireEvent.click(screen.getByLabelText("Column"));
    expect(
      await screen.findByRole("option", {
        name: "province_state_administrative_name",
      }),
    ).toBeInTheDocument();
  });

  it("prompts for a data source when there are no columns", () => {
    render(
      <AvandarAppProvider>
        <QueryFiltersField columns={[]} value={ONE_TEXT_RULE} onChange={vi.fn()} />
      </AvandarAppProvider>,
    );
    expect(screen.getByText(/select a data source/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npx vitest run src/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField.test.tsx`
Expected: FAIL. The focus test fails against the current implementation (the
input is replaced on change), the combinator test fails (the control renders
empty), the operator test fails (all operators are offered regardless of type),
and the empty-state text differs.

- [ ] **Step 8: Replace `QueryFiltersField`**

Replace the entire contents of
`src/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField.tsx`
with:

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { Box, Stack, Text } from "@mantine/core";
import { QueryBuilderMantine } from "@react-querybuilder/mantine";
import { useMemo } from "react";
import { QueryBuilder } from "react-querybuilder";
import { makeQueryFilterNodeId } from "$/models/queries/StructuredQuery/QueryFilter.types";
import {
  defaultOperatorForDataType,
  operatorsForDataType,
} from "$/models/queries/StructuredQuery/QueryFilterOperator";
import "react-querybuilder/dist/query-builder.css";
import classes from "./QueryFiltersField.module.css";
import {
  FilterAddAction,
  FilterCombinatorSelector,
  FilterFieldSelector,
  FilterOperatorSelector,
  FilterRemoveAction,
  FilterValueEditorControl,
} from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/filterControls";
import { useFilterTreeState } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/useFilterTreeState";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { QueryColumnRead } from "$/models/queries/QueryColumn/QueryColumn.types";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types";
import type { FilterControlsContext } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/filterControls";
import type { LibraryGroup } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversion";
import type { Field, RuleGroupType } from "react-querybuilder";
import type { ReactNode } from "react";

type Props = {
  /**
   * Every column of the current data source. Filters are not limited to the
   * columns the query displays: what you filter on and what you select are
   * separate choices.
   */
  columns: readonly QueryColumnRead[];
  value: QueryFilterGroup;
  onChange: (next: QueryFilterGroup) => void;
};

/**
 * Combinator options. The names are our own combinator values, so the select
 * always finds a matching option; the library's defaults are lower-case, which
 * is why this control used to render blank at every nesting level.
 */
const COMBINATORS = [
  { name: "AND", label: "And" },
  { name: "OR", label: "Or" },
] as const;

/**
 * Recursive filter UI for the manual query form. Wraps `react-querybuilder`
 * with our own controls and holds the tree locally while the user edits, so
 * typing neither remounts the row nor runs a query per keystroke.
 */
export function QueryFiltersField({
  columns,
  value,
  onChange,
}: Props): ReactNode {
  const { t } = useLingui();

  const columnTypes: Readonly<Record<string, AvaDataType.T>> = useMemo(() => {
    return Object.fromEntries(
      columns.map((column) => {
        return [column.baseColumn.name, column.baseColumn.dataType];
      }),
    );
  }, [columns]);

  const fields: Field[] = useMemo(() => {
    return columns.map((column) => {
      return {
        name: column.baseColumn.name,
        label: column.baseColumn.name,
      };
    });
  }, [columns]);

  const { query, matchCaseById, onQueryChange, commitNow, setMatchCase } =
    useFilterTreeState({ value, columnTypes, onChange });

  const context: FilterControlsContext = useMemo(() => {
    return {
      columnTypes,
      matchCaseById,
      setMatchCase,
      commitNow: () => {
        commitNow(query);
      },
    };
  }, [columnTypes, matchCaseById, setMatchCase, commitNow, query]);

  if (columns.length === 0) {
    return (
      <Stack gap="xs">
        <Text size="sm" c="neutral.6">
          <Trans>Select a data source to add filters.</Trans>
        </Text>
      </Stack>
    );
  }

  return (
    <Box
      data-testid="query-filters-field"
      className={classes.queryFiltersField}
    >
      <QueryBuilderMantine>
        <QueryBuilder
          fields={fields}
          combinators={[...COMBINATORS]}
          getOperators={(field) => {
            return operatorsForDataType(columnTypes[field]).map((operator) => {
              return { name: operator, label: operator };
            });
          }}
          getDefaultOperator={(field) => {
            return defaultOperatorForDataType(
              columnTypes[typeof field === "string" ? field : field.name],
            );
          }}
          resetOnFieldChange={false}
          listsAsArrays
          showCombinatorsBetweenRules
          idGenerator={makeQueryFilterNodeId}
          translations={{
            addRule: { label: t`+ Condition` },
            addGroup: { label: t`+ Group` },
          }}
          query={query as RuleGroupType}
          onQueryChange={(next) => {
            onQueryChange(next as unknown as LibraryGroup);
          }}
          context={context}
          controlElements={{
            fieldSelector: FilterFieldSelector,
            operatorSelector: FilterOperatorSelector,
            combinatorSelector: FilterCombinatorSelector,
            valueEditor: FilterValueEditorControl,
            addRuleAction: FilterAddAction,
            addGroupAction: FilterAddAction,
            removeRuleAction: FilterRemoveAction,
            removeGroupAction: FilterRemoveAction,
          }}
        />
      </QueryBuilderMantine>
    </Box>
  );
}
```

Operator option labels are the raw ids here on purpose: `FilterOperatorSelector`
renders the localized, type-aware label from
`queryFilterOperatorLabel`, because only it knows the column's type.

- [ ] **Step 9: Run the component test**

Run: `npx vitest run src/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField.test.tsx`
Expected: PASS, 5 tests.

If the focus test still fails, the cause is a new node identity reaching
`QueryBuilder`: check that `idGenerator` is wired, that `useFilterTreeState`
holds `query` in state rather than deriving it, and that `context` is memoized
(a new `context` object every render re-renders the controls but must not remount
them).

- [ ] **Step 10: Run the whole filter suite, lint, type-check**

Run: `npx vitest run src/views/DataExplorerApp/QueryForm && pnpm type-check && pnpm lint`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/views/DataExplorerApp/QueryForm/QueryFiltersField/
git commit -m "feat(filters): rewire the filter builder onto the operator catalog"
```

---

## Task 15: Filters over any dataset column

Today `QueryFiltersField` receives `queryColumns`, so the filter field list is
the SELECT list. That is the cause of the orphaned rule that keeps filtering
invisibly and of the stale tree after a data source switch.

**Files:**
- Create: `shared/models/queries/StructuredQuery/pruneFilterColumns.ts`
- Create: `shared/models/queries/StructuredQuery/pruneFilterColumns.test.ts`
- Create: `src/views/DataExplorerApp/useQueryColumnsForDataSource.ts`
- Modify: `src/views/DataExplorerApp/QueryColumnMultiSelect/QueryColumnMultiSelect.tsx`
- Modify: `src/views/DataExplorerApp/QueryForm/ManualQueryForm/ManualQueryForm.tsx`

- [ ] **Step 1: Write the failing prune test**

Create `shared/models/queries/StructuredQuery/pruneFilterColumns.test.ts`:

```ts
import { pruneFilterColumns } from "$/models/queries/StructuredQuery/pruneFilterColumns.ts";
import { describe, expect, it } from "vitest";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

const TREE: QueryFilterGroup = {
  type: "group",
  id: "g1",
  combinator: "AND",
  rules: [
    { type: "rule", id: "r1", columnName: "Admin2", operator: "=", value: "a" },
    {
      type: "group",
      id: "g2",
      combinator: "OR",
      rules: [
        { type: "rule", id: "r2", columnName: "gone", operator: "=", value: "b" },
        { type: "rule", id: "r3", columnName: "cases", operator: ">", value: 1 },
      ],
    },
  ],
};

describe("pruneFilterColumns", () => {
  it("keeps everything when every column still exists", () => {
    const result = pruneFilterColumns(TREE, ["Admin2", "gone", "cases"]);
    expect(result.removedColumnNames).toEqual([]);
    expect(result.filters).toBe(TREE);
  });

  it("drops rules whose column is gone and reports them", () => {
    const result = pruneFilterColumns(TREE, ["Admin2", "cases"]);
    expect(result.removedColumnNames).toEqual(["gone"]);
    const nested = result.filters.rules[1];
    expect(nested?.type === "group" && nested.rules).toHaveLength(1);
  });

  it("drops a group that ends up empty", () => {
    const result = pruneFilterColumns(TREE, ["Admin2"]);
    expect(result.filters.rules).toHaveLength(1);
    expect(result.removedColumnNames).toEqual(["gone", "cases"]);
  });

  it("returns an empty group when nothing survives", () => {
    const result = pruneFilterColumns(TREE, []);
    expect(result.filters.rules).toEqual([]);
    expect(result.removedColumnNames).toEqual(["Admin2", "gone", "cases"]);
  });

  it("reports each missing column once", () => {
    const result = pruneFilterColumns(
      {
        type: "group",
        combinator: "AND",
        rules: [
          { type: "rule", columnName: "gone", operator: "=", value: "a" },
          { type: "rule", columnName: "gone", operator: "=", value: "b" },
        ],
      },
      [],
    );
    expect(result.removedColumnNames).toEqual(["gone"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run shared/models/queries/StructuredQuery/pruneFilterColumns.test.ts`
Expected: FAIL, cannot resolve `pruneFilterColumns.ts`.

- [ ] **Step 3: Write the pruner**

Create `shared/models/queries/StructuredQuery/pruneFilterColumns.ts`:

```ts
import type {
  QueryFilter,
  QueryFilterGroup,
} from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

export type PruneFilterColumnsResult = {
  filters: QueryFilterGroup;
  /** Distinct column names whose rules were removed, in tree order. */
  removedColumnNames: readonly string[];
};

function _prune(
  group: QueryFilterGroup,
  columnNames: ReadonlySet<string>,
  removed: string[],
): QueryFilterGroup {
  const rules = group.rules
    .map((child): QueryFilter | undefined => {
      if (child.type === "group") {
        const pruned = _prune(child, columnNames, removed);
        return pruned.rules.length === 0 ? undefined : pruned;
      }
      if (columnNames.has(child.columnName)) {
        return child;
      }
      if (!removed.includes(child.columnName)) {
        removed.push(child.columnName);
      }
      return undefined;
    })
    .filter((child): child is QueryFilter => {
      return child !== undefined;
    });
  return { ...group, rules };
}

/**
 * Removes rules that reference columns the data source no longer has.
 *
 * Called when the data source changes: keeping such rules meant the query ran
 * against a table without those columns and failed with a binder error that the
 * UI reported as zero rows. Returning the removed column names lets the form
 * say what it dropped instead of doing it silently.
 */
export function pruneFilterColumns(
  filters: QueryFilterGroup,
  availableColumnNames: readonly string[],
): PruneFilterColumnsResult {
  const removed: string[] = [];
  const pruned = _prune(filters, new Set(availableColumnNames), removed);
  return {
    filters: removed.length === 0 ? filters : pruned,
    removedColumnNames: removed,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run shared/models/queries/StructuredQuery/pruneFilterColumns.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Extract the column-loading hook**

Create `src/views/DataExplorerApp/useQueryColumnsForDataSource.ts`, moving the
loading logic out of `QueryColumnMultiSelect` so the multi-select and the filter
panel cannot disagree about what columns exist:

```ts
import { Model } from "@avandar/models";
import { where } from "@avandar/utils";
import { QueryColumn as QueryColumnFns } from "$/models/queries/QueryColumn/QueryColumn";
import { useMemo } from "react";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryDataSourceId } from "$/models/queries/QueryDataSource/QueryDataSource.types";

type Result = {
  /** Every column of the data source, as query columns. */
  columns: readonly QueryColumn.T[];
  isLoading: boolean;
};

/**
 * Loads every column of a data source, whether it is a Dataset or a Concept.
 *
 * Shared by the column multi-select (what the query selects) and the filter
 * panel (what the query can filter on), which are deliberately different
 * choices over the same column list.
 */
export function useQueryColumnsForDataSource(
  dataSourceId: QueryDataSourceId | undefined,
): Result {
  const [datasetColumns, isLoadingDatasetColumns] =
    DatasetColumnClient.useGetAll({
      ...where("dataset_id", "eq", dataSourceId?.id),
      useQueryOptions: {
        enabled: Model.isOfModelType(dataSourceId, "Dataset"),
      },
    });

  const [conceptAttributes, isLoadingConceptAttributes] =
    ConceptAttributeClient.useGetAll({
      ...where("concept_id", "eq", dataSourceId?.id),
      useQueryOptions: {
        enabled: Model.isOfModelType(dataSourceId, "Concept"),
      },
    });

  const columns = useMemo(() => {
    return [
      ...(datasetColumns ?? []).map((column) => {
        return QueryColumnFns.makeFromDatasetColumn(column);
      }),
      ...(conceptAttributes ?? []).map((attribute) => {
        return QueryColumnFns.makeFromConceptAttribute(attribute);
      }),
    ];
  }, [datasetColumns, conceptAttributes]);

  return {
    columns,
    isLoading: isLoadingDatasetColumns || isLoadingConceptAttributes,
  };
}
```

Then in `QueryColumnMultiSelect.tsx`, delete its two client calls and the
`columns` `useMemo` that builds `queryColumns`, and replace them with:

```ts
  const { columns: queryColumns, isLoading } =
    useQueryColumnsForDataSource(dataSourceId);
```

keeping the existing `selectableOptions` / `queryColumnLookup` memo, now derived
from `queryColumns`. Import the hook and drop the now-unused `where`, `Model`,
`DatasetColumnClient`, and `ConceptAttributeClient` imports if nothing else in
the file uses them.

- [ ] **Step 6: Wire the form to dataset columns and prune on change**

In `ManualQueryForm.tsx`, inside `ManualQueryFormView`, after the existing
`useManualQueryDataSourceChange` call, add:

```tsx
  const { columns: dataSourceColumns } = useQueryColumnsForDataSource(
    dataSource ? Model.getTypedId(dataSource) : undefined,
  );

  const dataSourceColumnNames = useMemo(() => {
    return dataSourceColumns.map((column) => {
      return column.baseColumn.name;
    });
  }, [dataSourceColumns]);

  const [droppedFilterColumns, setDroppedFilterColumns] = useState<
    readonly string[]
  >([]);

  useEffect(
    function pruneFiltersWhenColumnsChange() {
      if (dataSourceColumnNames.length === 0) {
        return;
      }
      const result = pruneFilterColumns(filters, dataSourceColumnNames);
      if (result.removedColumnNames.length === 0) {
        setDroppedFilterColumns([]);
        return;
      }
      setDroppedFilterColumns(result.removedColumnNames);
      handlers.onSetFilters(result.filters);
    },
    [dataSourceColumnNames, filters, handlers],
  );
```

Change the `filterFields` element to pass the dataset's columns and the notice:

```tsx
  const filterFields = (
    <Stack gap="xs">
      {droppedFilterColumns.length > 0 ?
        <Text size="xs" c="neutral.6">
          {t`Removed ${droppedFilterColumns.length} filter(s) that referenced columns this data source does not have: ${droppedFilterColumns.join(", ")}`}
        </Text>
      : null}
      <QueryFiltersField
        columns={dataSourceColumns}
        value={filters}
        onChange={onFiltersChange}
      />
    </Stack>
  );
```

And un-gate the group: the `filters` entry in `groups` stays unconditional (it
already is), while the empty state now lives inside `QueryFiltersField` and keys
off `columns.length`, which is the dataset's column count rather than the
selected columns.

Add the imports `Model` from `@avandar/models`, `useEffect` / `useState` from
`react`, `pruneFilterColumns` from
`$/models/queries/StructuredQuery/pruneFilterColumns`, and
`useQueryColumnsForDataSource`.

- [ ] **Step 7: Give the filters group the width it needs**

`SettingsColumns` lays every group out in an equal-width `auto-fit minmax` grid,
so the filter tree gets the same room as a column of `None` selects. Add an
optional span so one group can be wider.

In `src/components/SettingsColumns/SettingsColumns.tsx`, add to
`SettingsColumnGroup`:

```ts
  /**
   * How many grid tracks the group occupies in the `columns` layout. Defaults
   * to 1. Use it for a group whose content is materially more complex than its
   * neighbours, such as the filter tree.
   */
  span?: number;
```

and apply it where each column is rendered, alongside the existing className:

```tsx
        style={group.span && group.span > 1 ? { gridColumn: `span ${group.span}` } : undefined}
```

Then in `ManualQueryForm.tsx`, mark the filters group:

```tsx
    { id: "filters", title: t`Filters (Where)`, content: filterFields, span: 2 },
```

A `span` wider than the available tracks is clamped by the grid itself, so the
narrow `stacked` host and a one-column `columns` host are unaffected.

- [ ] **Step 8: Verify**

Run: `npx vitest run src/views/DataExplorerApp src/components/SettingsColumns shared/models/queries/StructuredQuery && pnpm type-check && pnpm lint`
Expected: PASS. `DataExplorerDrawer.test.tsx` stubs `ManualQueryForm`, so it is
unaffected.

- [ ] **Step 9: Commit**

```bash
git add shared/models/queries/StructuredQuery/pruneFilterColumns.ts \
        shared/models/queries/StructuredQuery/pruneFilterColumns.test.ts \
        src/views/DataExplorerApp/useQueryColumnsForDataSource.ts \
        src/views/DataExplorerApp/QueryColumnMultiSelect/QueryColumnMultiSelect.tsx \
        src/views/DataExplorerApp/QueryForm/ManualQueryForm/ManualQueryForm.tsx \
        src/components/SettingsColumns/SettingsColumns.tsx
git commit -m "feat(filters): filter on any dataset column and prune stale rules"
```

---

## Task 16: Say which filters are applied

D9: a rule that is not in the query must be visible as such. Two surfaces, one
counter.

**Files:**
- Create: `shared/models/queries/StructuredQuery/countFilterRules.ts`
- Create: `shared/models/queries/StructuredQuery/countFilterRules.test.ts`
- Create: `src/views/DataExplorerApp/QueryForm/QueryFiltersField/AppliedFilterSummary.tsx`
- Modify: `src/views/DataExplorerApp/QueryForm/QueryFiltersField/filterControls.tsx`
- Modify: `src/views/DataExplorerApp/QueryForm/ManualQueryForm/ManualQueryForm.tsx`

- [ ] **Step 1: Write the failing counter test**

Create `shared/models/queries/StructuredQuery/countFilterRules.test.ts`:

```ts
import { countFilterRules } from "$/models/queries/StructuredQuery/countFilterRules.ts";
import { describe, expect, it } from "vitest";

describe("countFilterRules", () => {
  it("counts complete rules as applied", () => {
    expect(
      countFilterRules({
        type: "group",
        combinator: "AND",
        rules: [
          {
            type: "rule",
            columnName: "Admin2",
            columnDataType: "varchar",
            operator: "=",
            value: "a",
          },
        ],
      }),
    ).toEqual({ applied: 1, unfinished: 0, invalid: 0 });
  });

  it("counts incomplete rules as unfinished", () => {
    expect(
      countFilterRules({
        type: "group",
        combinator: "AND",
        rules: [
          {
            type: "rule",
            columnName: "Admin2",
            columnDataType: "varchar",
            operator: "=",
            value: "",
          },
        ],
      }),
    ).toEqual({ applied: 0, unfinished: 1, invalid: 0 });
  });

  it("counts rules that fail validation as invalid", () => {
    expect(
      countFilterRules({
        type: "group",
        combinator: "AND",
        rules: [
          {
            type: "rule",
            columnName: "cases",
            columnDataType: "bigint",
            operator: ">",
            value: "abc",
          },
        ],
      }),
    ).toEqual({ applied: 0, unfinished: 0, invalid: 1 });
  });

  it("counts nested groups", () => {
    expect(
      countFilterRules({
        type: "group",
        combinator: "AND",
        rules: [
          {
            type: "group",
            combinator: "OR",
            rules: [
              {
                type: "rule",
                columnName: "Admin2",
                columnDataType: "varchar",
                operator: "=",
                value: "a",
              },
              {
                type: "rule",
                columnName: "Admin2",
                columnDataType: "varchar",
                operator: "=",
                value: "",
              },
            ],
          },
        ],
      }),
    ).toEqual({ applied: 1, unfinished: 1, invalid: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run shared/models/queries/StructuredQuery/countFilterRules.test.ts`
Expected: FAIL, cannot resolve `countFilterRules.ts`.

- [ ] **Step 3: Write the counter**

Create `shared/models/queries/StructuredQuery/countFilterRules.ts`:

```ts
import {
  isFilterRuleComplete,
  validateFilterRule,
} from "$/models/queries/StructuredQuery/QueryFilterValidation.ts";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

export type FilterRuleCounts = {
  /** Rules that reach the query. */
  applied: number;
  /** Rules the user has not finished writing. */
  unfinished: number;
  /** Complete rules that cannot be applied, for example a letter in a number. */
  invalid: number;
};

/**
 * Counts what the query actually uses, so the panel and the results area can
 * both say "3 filters applied, 1 not applied" from the same source.
 */
export function countFilterRules(group: QueryFilterGroup): FilterRuleCounts {
  return group.rules.reduce<FilterRuleCounts>(
    (counts, child) => {
      if (child.type === "group") {
        const nested = countFilterRules(child);
        return {
          applied: counts.applied + nested.applied,
          unfinished: counts.unfinished + nested.unfinished,
          invalid: counts.invalid + nested.invalid,
        };
      }
      if (!isFilterRuleComplete(child)) {
        return { ...counts, unfinished: counts.unfinished + 1 };
      }
      if (validateFilterRule(child) !== undefined) {
        return { ...counts, invalid: counts.invalid + 1 };
      }
      return { ...counts, applied: counts.applied + 1 };
    },
    { applied: 0, unfinished: 0, invalid: 0 },
  );
}
```

- [ ] **Step 4: Write the summary component**

Create
`src/views/DataExplorerApp/QueryForm/QueryFiltersField/AppliedFilterSummary.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { countFilterRules } from "$/models/queries/StructuredQuery/countFilterRules";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types";
import type { ReactNode } from "react";

type Props = {
  filters: QueryFilterGroup;
};

/**
 * States how many filters the results reflect, and how many are being ignored.
 *
 * Without this, a rule that is unfinished or invalid is simply absent from the
 * query while still visible in the panel, so the grid and the panel disagree
 * with no way to tell.
 */
export function AppliedFilterSummary({ filters }: Props): ReactNode {
  const { t } = useLingui();
  const { applied, unfinished, invalid } = countFilterRules(filters);
  const ignored = unfinished + invalid;

  if (applied === 0 && ignored === 0) {
    return null;
  }

  return (
    <Text size="xs" c={ignored > 0 ? "orange.7" : "neutral.6"} data-testid="applied-filter-summary">
      {ignored > 0 ?
        t`${applied} filter(s) applied, ${ignored} not applied`
      : t`${applied} filter(s) applied`}
    </Text>
  );
}
```

- [ ] **Step 5: Show the reason under the offending rule**

In `filterControls.tsx`, extend `FilterValueEditorControl` to render the
validation message and dim an unfinished rule. Replace its body with:

```tsx
export function FilterValueEditorControl(props: ValueEditorProps): ReactNode {
  const context = _context(props.context);
  const ruleId = props.rule.id ?? "";
  const dataType = context.columnTypes[props.field];
  const rule: QueryFilterRule = {
    type: "rule",
    id: ruleId,
    columnName: props.field,
    ...(dataType === undefined ? {} : { columnDataType: dataType }),
    operator: props.operator as QueryFilterOperator,
    value: props.value,
    ...(context.matchCaseById[ruleId] === true ? { matchCase: true } : {}),
  };
  const reason = validateFilterRule(rule);
  const isUnfinished = !isFilterRuleComplete(rule);

  return (
    <>
      <div
        className={clsx(classes.valueSlot, isUnfinished && classes.ruleNotApplied)}
      >
        <FilterValueEditor
          operator={rule.operator}
          dataType={dataType}
          value={props.value}
          onChange={(next) => {
            props.handleOnChange(next);
          }}
          onCommit={context.commitNow}
        />
        <MatchCaseToggle
          operator={rule.operator}
          dataType={dataType}
          matchCase={context.matchCaseById[ruleId] === true}
          onChange={(next) => {
            context.setMatchCase(ruleId, next);
          }}
        />
      </div>
      {reason ?
        <Text size="xs" c="orange.7" className={classes.ruleMessage}>
          {queryFilterValidationLabel(reason)}
        </Text>
      : null}
    </>
  );
}
```

with the added imports:

```tsx
import { Text } from "@mantine/core";
import clsx from "clsx";
import { queryFilterValidationLabel } from "$/copy/queryFilterValidationLabel";
import {
  isFilterRuleComplete,
  validateFilterRule,
} from "$/models/queries/StructuredQuery/QueryFilterValidation";
import type { QueryFilterRule } from "$/models/queries/StructuredQuery/QueryFilter.types";
```

`clsx` is already a dependency and is used by `SettingsColumns`, so no new
package is needed.

- [ ] **Step 6: Put the summary in the panel header**

In `ManualQueryForm.tsx`, add the summary to the `filterFields` stack, above the
builder and below the dropped-columns notice:

```tsx
      <AppliedFilterSummary filters={filters} />
```

with the import from
`@/views/DataExplorerApp/QueryForm/QueryFiltersField/AppliedFilterSummary`.

- [ ] **Step 7: Add a component test for the message**

Append to `QueryFiltersField.test.tsx`:

```tsx
  it("explains why a rule is not applied", () => {
    _renderField({
      type: "group",
      id: "g1",
      combinator: "AND",
      rules: [
        {
          type: "rule",
          id: "r1",
          columnName: "daily_new_cases",
          columnDataType: "bigint",
          operator: ">",
          value: "abc",
        },
      ],
    });
    expect(screen.getByText(/"abc" is not a number/)).toBeInTheDocument();
  });
```

- [ ] **Step 8: Put the summary next to the row count**

The panel is not the only place this matters: when the drawer is collapsed, the
grid is all the user can see. In `DataExplorerApp.tsx`, render the same component
beside the grid's paging summary:

```tsx
        <AppliedFilterSummary filters={state.query.filters} />
```

Place it in the same row as the paging controls, before the page-size selector,
so "2 filters applied, 1 not applied" sits next to "1 to 50 of 175".

- [ ] **Step 9: Verify**

Run: `npx vitest run shared/models/queries/StructuredQuery/countFilterRules.test.ts src/views/DataExplorerApp/QueryForm && pnpm type-check`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add shared/models/queries/StructuredQuery/countFilterRules.ts \
        shared/models/queries/StructuredQuery/countFilterRules.test.ts \
        src/views/DataExplorerApp/QueryForm/QueryFiltersField/ \
        src/views/DataExplorerApp/QueryForm/ManualQueryForm/ManualQueryForm.tsx \
        src/views/DataExplorerApp/DataExplorerApp.tsx
git commit -m "feat(filters): report which filters are applied and why others are not"
```

---

## Task 17: Surface query errors

`state.lastQueryError` already holds the DuckDB message; its only consumer is the
AI chat panel, so with the chat closed a failing query reads as zero rows.

**Files:**
- Create: `src/views/DataExplorerApp/QueryResultsError/QueryResultsError.tsx`
- Create: `src/views/DataExplorerApp/QueryResultsError/QueryResultsError.test.tsx`
- Modify: `src/views/DataExplorerApp/DataExplorerApp.tsx`
- Modify: `src/views/DashboardApp/AvaPage/pfields/NLQueryPField/NLQueryPField.tsx`

- [ ] **Step 1: Write the failing test**

Create
`src/views/DataExplorerApp/QueryResultsError/QueryResultsError.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { fireEvent, render, screen } from "@/test-utils";
import { QueryResultsError } from "@/views/DataExplorerApp/QueryResultsError/QueryResultsError";

describe("QueryResultsError", () => {
  it("renders nothing when there is no error", () => {
    render(
      <AvandarAppProvider>
        <QueryResultsError message={undefined} sql="select 1" />
      </AvandarAppProvider>,
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the message so an error is not mistaken for zero rows", () => {
    render(
      <AvandarAppProvider>
        <QueryResultsError
          message={`Conversion Error: Could not convert string 'abc' to INT64`}
          sql={`select * from t where "cases" = 'abc'`}
        />
      </AvandarAppProvider>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/Could not convert/);
  });

  it("hides the SQL behind a disclosure", () => {
    render(
      <AvandarAppProvider>
        <QueryResultsError message="Binder Error" sql="select 1" />
      </AvandarAppProvider>,
    );
    expect(screen.queryByText("select 1")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /show sql/i }));
    expect(screen.getByText("select 1")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/views/DataExplorerApp/QueryResultsError/QueryResultsError.test.tsx`
Expected: FAIL, cannot resolve `QueryResultsError`.

- [ ] **Step 3: Write the component**

Create `src/views/DataExplorerApp/QueryResultsError/QueryResultsError.tsx`:

```tsx
import { Trans } from "@lingui/react/macro";
import { Alert, Anchor, Code, Collapse, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertTriangle } from "@tabler/icons-react";
import type { ReactNode } from "react";

type Props = {
  /** The last query error, or `undefined` when the query succeeded. */
  message: string | undefined;
  /** The SQL that failed, shown on request. */
  sql: string | undefined;
};

/**
 * Reports a failed query where the results would otherwise be.
 *
 * A DuckDB conversion or binder error used to leave the grid saying
 * "No Rows To Show", which is indistinguishable from a filter that legitimately
 * matches nothing.
 */
export function QueryResultsError({ message, sql }: Props): ReactNode {
  const [isSqlOpen, { toggle: toggleSql }] = useDisclosure(false);

  if (message === undefined) {
    return null;
  }

  return (
    <Alert
      role="alert"
      color="red"
      variant="light"
      icon={<IconAlertTriangle size={16} />}
      title={<Trans>This query could not run</Trans>}
    >
      <Stack gap="xs">
        <span>{message}</span>
        {sql ?
          <>
            <Anchor component="button" type="button" size="sm" onClick={toggleSql}>
              {isSqlOpen ?
                <Trans>Hide SQL</Trans>
              : <Trans>Show SQL</Trans>}
            </Anchor>
            <Collapse in={isSqlOpen}>
              <Code block>{sql}</Code>
            </Collapse>
          </>
        : null}
      </Stack>
    </Alert>
  );
}
```

- [ ] **Step 4: Render it in the Data Explorer**

In `DataExplorerApp.tsx`, render the alert directly above the results grid,
reading from the state the app already maintains:

```tsx
        <QueryResultsError
          message={state.lastQueryError}
          sql={state.rawSql}
        />
```

Place it inside the same container that holds the grid, before the grid element,
and import the component. Do not gate it on `isLoadingResults`: the error should
persist until the next successful run replaces it, which is what
`syncLastQueryError` already does.

- [ ] **Step 5: Render it in the dashboard query panel**

In `NLQueryPField.tsx`, inside the `"manual-query"` branch, wrap the existing
`ManualQueryForm` so the same message appears in the dashboard host:

```tsx
          return (
            <Stack gap="xs">
              <QueryResultsError
                message={manualState.lastQueryError}
                sql={rawSql}
              />
              <ManualQueryForm
                query={manualState.query}
                isStructuredQueryInSync={manualState.isStructuredQueryInSync}
                handlers={manualState.handlers}
                withinPortal
              />
            </Stack>
          );
```

If `useDashboardManualQueryState` does not expose `lastQueryError`, add it there
by mirroring how `DataExplorerApp` derives it from its `useDataQuery` result:
copy the `formatOfflineQueryError(error) ?? error.message` expression, and export
it from the hook's return value. Check the hook first:
`grep -n "return" src/views/DashboardApp/AvaPage/pfields/NLQueryPField/useDashboardManualQueryState.ts`.

- [ ] **Step 6: Verify**

Run: `npx vitest run src/views/DataExplorerApp src/views/DashboardApp && pnpm type-check && pnpm lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/views/DataExplorerApp/QueryResultsError/ \
        src/views/DataExplorerApp/DataExplorerApp.tsx \
        src/views/DashboardApp/AvaPage/pfields/NLQueryPField/
git commit -m "feat(filters): surface query errors instead of showing zero rows"
```

---

## Task 18: Row-count battery, end to end

The manual review verified 28 predicate and grouping cases by counting rows
against the CSV. This turns that into a regression suite. It is the only layer
that would have caught the broken `contains`, because every unit test in the
stack agreed with itself.

**Files:**
- Create: `tests/e2e/data-explorer-filters.spec.ts`

- [ ] **Step 1: Write the spec**

Create `tests/e2e/data-explorer-filters.spec.ts`:

```ts
/**
 * Filter semantics, verified by row count against a known CSV.
 *
 * Expected counts were computed directly from
 * `tests/data/california-covid-sample/california-covid-sample.csv` (14,700
 * rows). They are the contract: if a count changes, either the fixture changed
 * or a predicate's meaning did.
 *
 * The filter tree is driven through the URL's `sql` parameter rather than by
 * clicking the builder, because this spec is about what the SQL layer computes.
 * Builder interaction is covered by `QueryFiltersField.test.tsx`.
 */
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { CALIFORNIA_CSV_PATH } from "./helpers/constants";
import { dismissBlockingOverlays } from "./helpers/dataExplorerFlow";
import { parseDatasetIdFromDataManagerUrl } from "./helpers/manualUploadCloudSyncFlow";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import type { Page } from "@playwright/test";

type FilterCase = {
  name: string;
  /** WHERE clause exactly as the filter panel would generate it. */
  where: string;
  expectedRows: number;
};

const CASES: readonly FilterCase[] = [
  { name: "text equals", where: `lower("Admin2") = lower('Alameda')`, expectedRows: 245 },
  { name: "text not equals", where: `lower("Admin2") <> lower('Alameda')`, expectedRows: 14455 },
  { name: "contains, case insensitive", where: `contains(lower("Admin2"), lower('san'))`, expectedRows: 2450 },
  { name: "contains, case sensitive misses", where: `contains("Admin2", 'san')`, expectedRows: 0 },
  { name: "does not contain", where: `NOT contains(lower("Admin2"), lower('san'))`, expectedRows: 12250 },
  { name: "starts with", where: `starts_with(lower("Admin2"), lower('San'))`, expectedRows: 2450 },
  { name: "in list", where: `lower("Admin2") IN (lower('Alameda'), lower('Butte'), lower('Kern'))`, expectedRows: 735 },
  { name: "not in list", where: `lower("Admin2") NOT IN (lower('Alameda'), lower('Butte'), lower('Kern'))`, expectedRows: 13965 },
  { name: "numeric greater than", where: `"daily_new_cases" > 0`, expectedRows: 11444 },
  { name: "numeric at least", where: `"daily_new_cases" >= 0`, expectedRows: 14510 },
  { name: "numeric less than", where: `"daily_new_cases" < 0`, expectedRows: 190 },
  { name: "numeric at most", where: `"daily_new_cases" <= 0`, expectedRows: 3256 },
  { name: "numeric equals", where: `"daily_new_cases" = 0`, expectedRows: 3066 },
  { name: "numeric in list", where: `"daily_new_cases" IN (0, 1, 2)`, expectedRows: 4391 },
  { name: "between", where: `"daily_new_cases" BETWEEN 100 AND 200`, expectedRows: 1385 },
  { name: "not between", where: `"daily_new_cases" NOT BETWEEN 100 AND 200`, expectedRows: 13315 },
  { name: "is null on a full column", where: `"Admin2" IS NULL`, expectedRows: 0 },
  { name: "is not null on a full column", where: `"Admin2" IS NOT NULL`, expectedRows: 14700 },
  { name: "is blank on a full column", where: `coalesce(trim("Admin2"), '') = ''`, expectedRows: 0 },
  { name: "regex match", where: `regexp_matches("Admin2", '^San')`, expectedRows: 2450 },
  { name: "epoch date greater than", where: `"date" > 1600000000000`, expectedRows: 6540 },
  { name: "AND of two rules", where: `lower("Admin2") = lower('Alameda') and "daily_new_cases" > 100`, expectedRows: 150 },
  { name: "OR of two rules", where: `lower("Admin2") = lower('Alameda') or "daily_new_cases" > 100`, expectedRows: 3472 },
  { name: "nested OR inside AND", where: `"daily_new_cases" > 100 and (lower("Admin2") = lower('Alameda') or lower("Admin2") = lower('Butte'))`, expectedRows: 175 },
  { name: "nested AND inside OR", where: `"daily_new_cases" > 100 or (lower("Admin2") = lower('Alameda') and lower("Admin2") = lower('Butte'))`, expectedRows: 3377 },
  { name: "two sibling groups", where: `(lower("Admin2") = lower('Alameda') and "daily_new_cases" > 100) or (lower("Admin2") = lower('Butte') and "daily_new_cases" < 0)`, expectedRows: 154 },
  { name: "value containing a comma", where: `lower("Admin2") IN (lower('Contra Costa'), lower('Del Norte'))`, expectedRows: 490 },
  { name: "literal percent is not a wildcard", where: `contains(lower("Admin2"), lower('%'))`, expectedRows: 0 },
];

async function _importCaliforniaCsv(options: {
  page: Page;
  workspaceSlug: string;
}): Promise<string> {
  const { page, workspaceSlug } = options;
  await page.goto(`/${workspaceSlug}/data-manager/data-import`, {
    waitUntil: "domcontentloaded",
  });
  const uploadPanel = page.getByRole("tabpanel", { name: "Upload" });
  await uploadPanel
    .locator('input[type="file"]')
    .setInputFiles(CALIFORNIA_CSV_PATH);
  await uploadPanel
    .getByRole("button", { name: "Upload", exact: true })
    .click();
  await expect(
    page.getByText("Data processed successfully", { exact: false }),
  ).toBeVisible({ timeout: LONG_WAIT });
  await page.getByRole("button", { name: "Save Dataset" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/${workspaceSlug}/data-manager/[0-9a-f-]{36}`),
    { timeout: LONG_WAIT },
  );
  const datasetId = parseDatasetIdFromDataManagerUrl({
    url: page.url(),
    workspaceSlug,
  });
  if (datasetId === undefined) {
    throw new Error("Could not read the dataset id from the URL after import.");
  }
  return datasetId;
}

async function _rowCountFor(options: {
  page: Page;
  workspaceSlug: string;
  datasetId: string;
  where: string;
}): Promise<number> {
  const { page, workspaceSlug, datasetId, where } = options;
  const sql = `select count(*) as "row_count" from "${datasetId}" where ${where}`;
  await page.goto(
    `/${workspaceSlug}/data-explorer?sql=${encodeURIComponent(sql)}`,
    { waitUntil: "domcontentloaded" },
  );
  await dismissBlockingOverlays(page);
  const cell = page.getByRole("gridcell").first();
  await expect(cell).toBeVisible({ timeout: MEDIUM_WAIT });
  const text = (await cell.innerText()).replace(/[^\d-]/g, "");
  return Number(text);
}

test.describe("Data Explorer filter semantics", () => {
  test("every filter predicate returns the expected row count", async ({
    page,
    e2eWorkerDb,
  }) => {
    const { workspaceSlug } = e2eWorkerDb;
    await signInWithEmailPassword(page, {
      email: e2eWorkerDb.primaryUser.email,
      password: e2eWorkerDb.primaryUser.password,
      workspaceSlug,
    });

    const datasetId = await _importCaliforniaCsv({ page, workspaceSlug });

    for (const filterCase of CASES) {
      const rows = await _rowCountFor({
        page,
        workspaceSlug,
        datasetId,
        where: filterCase.where,
      });
      expect(rows, `${filterCase.name}: ${filterCase.where}`).toBe(
        filterCase.expectedRows,
      );
    }
  });
});
```

The counts marked below were not in the original review and must be computed
before the spec is trusted. Run this from the repo root and paste the results
into the `CASES` table, replacing any that differ:

```bash
python3 - <<'PY'
import csv
rows = list(csv.DictReader(open("tests/data/california-covid-sample/california-covid-sample.csv")))
n = lambda r: int(r["daily_new_cases"])
a = lambda r: r["Admin2"]
print("not between 100..200:", sum(1 for r in rows if not (100 <= n(r) <= 200)))
print("starts with San:", sum(1 for r in rows if a(r).startswith("San")))
print("regex ^San:", sum(1 for r in rows if a(r).startswith("San")))
print("in Contra Costa/Del Norte:", sum(1 for r in rows if a(r) in ("Contra Costa", "Del Norte")))
print("contains '%':", sum(1 for r in rows if "%" in a(r)))
PY
```

- [ ] **Step 2: Verify the expected counts**

Run the Python snippet above.
Expected: `not between` 13315, `starts with San` 2450, `regex ^San` 2450,
`in Contra Costa/Del Norte` 490, `contains '%'` 0. Correct the `CASES` table for
any that differ before running the spec, because a wrong expectation here would
be worse than no test.

- [ ] **Step 3: Run the spec**

Ensure the dev server and local Supabase are running, then:
`npx playwright test tests/e2e/data-explorer-filters.spec.ts`
Expected: PASS. This spec imports a 14,700-row CSV once and then runs 28
navigations, so allow a few minutes.

If the whole spec fails at import, check that the workspace has a plan selected;
the e2e fixture provisions a fresh workspace per worker, and
`dismissBlockingOverlays` handles the modals that otherwise cover the page.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/data-explorer-filters.spec.ts
git commit -m "test(filters): add row-count battery for filter semantics"
```

---

## Task 19: Full verification

- [ ] **Step 1: Run every automated check**

```bash
pnpm type-check
pnpm lint
npx vitest run shared/models/queries/StructuredQuery shared/copy src/views/DataExplorerApp src/views/DashboardApp
pnpm i18n:check
```

Expected: all pass. `pnpm i18n:check` fails if the new `t` macros were not
extracted; run `pnpm i18n:extract` and commit the catalogs if so.

- [ ] **Step 2: Drive the Data Explorer by hand**

Start the dev server (`npx vite --host 127.0.0.1 --port 5173` is enough; the full
`pnpm dev` also starts ngrok, which fails without an auth token), sign in with
the seeded credentials from `seed/SeedData.ts`, import
`tests/data/california-covid-sample/california-covid-sample.csv`, open the query
drawer, and confirm each of these, capturing a screenshot per step into `.temp/`:

1. Type `Alameda` into a text filter in one go. Every character lands and focus
   never leaves the input.
2. The combinator reads `And`, and switching it to `Or` changes both the label
   and the row count.
3. A rule reading `province_state_administrative_name` (upload
   `.temp/filters-review/long-column-names-probe.csv` if it is no longer around,
   or rename a column in the data manager) shows the name from its start with an
   ellipsis, and the dropdown shows the full name.
4. An operator dropdown opened from the bottom-most rule stays inside the drawer
   and reaches `is between`.
5. Two rules and a nested group are visually distinguishable: dividers between
   rules, an indent and rail for the group.
6. Typing `abc` into a numeric filter shows "not a number" under the field, the
   summary says one filter is not applied, and the grid keeps showing the
   previous result rather than emptying.
7. Deselecting a displayed column leaves the filters alone.
8. Switching the data source drops only the rules whose columns are absent and
   names them.

- [ ] **Step 3: Drive the dashboard host by hand**

Open a dashboard, add a data block, open its query panel (the `stacked` layout),
and repeat checks 1, 2, and 5. The panel is much narrower there: confirm each
rule wraps to two lines rather than one control per line, and that no control is
clipped.

- [ ] **Step 4: Commit any fixes, then summarize**

```bash
git add -A
git commit -m "fix(filters): address issues found in manual verification"
```

Write the outcome into
`docs/superpowers/2026-08-17-manual-query-filters-review.md` as a short
"Resolved" section listing the finding ids now covered by tests, so the review
document stays the index of what was wrong and what closed it.

---

## Coverage map

Every finding in the review, and where it is addressed.

| Finding | Task |
|---|---|
| F1 broken `contains` / `does not contain` | 1, 4, 18 |
| F2 focus loss per keystroke | 10, 11, 14 |
| F3 blank AND/OR selector | 13, 14 |
| F4 comma-split list values | 2, 14 (`listsAsArrays`) |
| F5 silent query errors | 17 |
| F6 stale filters after data source switch | 15 |
| F7 invisible filter on a removed column | 15 |
| F8 inconsistent empty-value handling | 3, 5, 16 |
| F9 epoch-millisecond date columns | deferred (spec 1.2), covered by an e2e case so the current behavior is pinned |
| F10 no HAVING surface | deferred (spec 1.2); renderer already shared, Task 6 |
| F11 stringified literals | 2, 4, 8 |
| F12 query per keystroke | 11 |
| F13 rule defaults and silent resets | 1, 14 |
| F14 arbitrary result column order | out of scope |
| F15 latent operator mappings | 1, 7, 10 (both mapping tables deleted) |
| F16 competing grid filters | deferred (spec 13) |
| U1 clipped column name | 13 |
| U2 clipped dropdown options | 13 |
| U3 12.6px control text | 13 |
| U4 no visible labels, axe violation | 13 (aria-labels on every control) |
| U5 stacked rule layout | 13 |
| U6 rules visually merge, no combinator | 13, 14 |
| U7 invisible nesting | 13 |
| U8 visual weight inversion | 13 |
| U9 remove buttons and no confirmation | 13 |
| U10 unlabelled `between` bounds | 12 |
| U11 no format guidance | 12 |
| U12 unreadable long values | 12 (chips) |
| U13 clipped filter tree, shared scroll | 13 |
| U14 dropdown overflows the drawer | 13 |
| U15 four-panel grid imbalance | 13, 15 |
| U16 oversized overwrite banner | 13 |
| U17 inconsistent empty state | 14, 15 |
| U18 truncated grid dates | out of scope |
| U19 duplicate `Upload` labels | out of scope |
| M1 to M5, M8, M9 new operators | 1, 4 |
| M6 regex | 1, 4 |
| M7 glob | dropped: `node-sql-parser` cannot read `GLOB` (spec 5.1.1) |
| M10 date-aware labels | 9 |
| M11 relative dates | deferred (spec 1.2) |
| M12 distinct-value picker | deferred (spec 1.2) |
| M13 length predicates | deferred (spec 13) |
| M14 HAVING | deferred (spec 1.2) |

