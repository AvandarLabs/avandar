import { MatcherText } from "./ResultMatchers";
import type { EvalQueryResult } from "../runtime/EvalDatabase";
import type { Verdict } from "./ResultMatchers";

/** How a model's result is compared with a ground-truth result. */
export type TruthRowSpec = {
  /** Truth columns that identify a row (a state, a month). */
  keys: readonly string[];
  /** Truth columns whose numbers must appear in the matching row. */
  values: readonly string[];
  /**
   * `all`: every truth row appears. `prefix`: the first rows appear in the
   * truth's order. `subset`: every result row is a truth row.
   */
  mode: "all" | "prefix" | "subset";
  /** Share of rows that must match (default 1). */
  minShare?: number;
  /** For `prefix`, how many leading rows to compare (default: all). */
  prefixLength?: number;
  /** Relative tolerance on numbers (default 0.001). */
  tolerance?: number;
  /** Accepted multipliers, such as [1, 100] for a ratio or a percent. */
  scales?: readonly number[];
  /** For `all`, fail when the result has a different number of rows. */
  exactRows?: boolean;
};

type TruthRow = { keys: unknown[]; values: number[] };

function _toTruthRows(truth: EvalQueryResult, spec: TruthRowSpec): TruthRow[] {
  const indexOf = (name: string): number => {
    const index = truth.columns.findIndex((column) => {
      return column.name === name;
    });
    if (index < 0) {
      throw new Error(`Truth has no column "${name}"`);
    }
    return index;
  };
  const keyIndexes = spec.keys.map(indexOf);
  const valueIndexes = spec.values.map(indexOf);
  return truth.rows.map((row) => {
    return {
      keys: keyIndexes.map((index) => {
        return row[index];
      }),
      values: valueIndexes.map((index) => {
        return MatcherText.toNumber(row[index]) ?? Number.NaN;
      }),
    };
  });
}

/**
 * Whether a result row holds a truth row: its keys in the row's cells (or,
 * for a wide result, in the name of the column holding the value) and each of
 * its numbers in a cell.
 */
function _rowMatches(
  result: EvalQueryResult,
  row: readonly unknown[],
  truthRow: TruthRow,
  spec: TruthRowSpec,
): boolean {
  const options = {
    tolerance: spec.tolerance ?? 0.001,
    scales: spec.scales ?? [1],
  };
  const missingKeys = truthRow.keys.filter((key) => {
    return !MatcherText.rowHasKey(row, key);
  });
  if (truthRow.values.length === 0) {
    return missingKeys.length === 0;
  }
  return truthRow.values.every((value) => {
    return row.some((cell, columnIndex) => {
      if (!MatcherText.cellMatchesValue(cell, value, options)) {
        return false;
      }
      const columnName = MatcherText.normalize(
        result.columns[columnIndex]?.name,
      );
      return missingKeys.every((key) => {
        return columnName.includes(MatcherText.normalize(key));
      });
    });
  });
}

function _describeTruthRow(truthRow: TruthRow): string {
  return `${truthRow.keys.join(" / ")} = ${truthRow.values.join(", ")}`;
}

function _matchAll(
  result: EvalQueryResult,
  truthRows: readonly TruthRow[],
  spec: TruthRowSpec,
): Verdict {
  const missing = truthRows.filter((truthRow) => {
    return !result.rows.some((row) => {
      return _rowMatches(result, row, truthRow, spec);
    });
  });
  const share = 1 - missing.length / Math.max(truthRows.length, 1);
  const extra = result.rows.length - truthRows.length;
  const extraNote = extra > 0 ? `, ${extra} extra rows` : "";
  const isRowCountOk = !spec.exactRows || extra === 0;
  return {
    pass: share >= (spec.minShare ?? 1) && isRowCountOk,
    detail:
      missing.length === 0
        ? `all ${truthRows.length} truth rows found${extraNote}`
        : `${missing.length}/${truthRows.length} truth rows missing, e.g. ${_describeTruthRow(missing[0]!)}${extraNote}`,
  };
}

function _matchPrefix(
  result: EvalQueryResult,
  truthRows: readonly TruthRow[],
  spec: TruthRowSpec,
): Verdict {
  const length = spec.prefixLength ?? truthRows.length;
  if (result.rows.length < length) {
    return {
      pass: false,
      detail: `expected at least ${length} rows, got ${result.rows.length}`,
    };
  }
  const firstMismatch = truthRows
    .slice(0, length)
    .findIndex((truthRow, index) => {
      return !_rowMatches(result, result.rows[index]!, truthRow, spec);
    });
  return firstMismatch < 0
    ? { pass: true, detail: `first ${length} rows match in order` }
    : {
        pass: false,
        detail: `row ${firstMismatch + 1} should be ${_describeTruthRow(truthRows[firstMismatch]!)}`,
      };
}

function _matchSubset(
  result: EvalQueryResult,
  truthRows: readonly TruthRow[],
  spec: TruthRowSpec,
): Verdict {
  if (result.rows.length === 0) {
    return { pass: false, detail: "no rows" };
  }
  const unmatched = result.rows.filter((row) => {
    return !truthRows.some((truthRow) => {
      return _rowMatches(result, row, truthRow, spec);
    });
  });
  const share = 1 - unmatched.length / result.rows.length;
  return {
    pass: share >= (spec.minShare ?? 1),
    detail:
      unmatched.length === 0
        ? `all ${result.rows.length} rows are truth rows`
        : `${unmatched.length}/${result.rows.length} rows are not truth rows, e.g. ${JSON.stringify(unmatched[0])}`,
  };
}

function _matchTruthRows(
  result: EvalQueryResult,
  truth: EvalQueryResult,
  spec: TruthRowSpec,
): Verdict {
  const truthRows = _toTruthRows(truth, spec);
  if (spec.mode === "prefix") {
    return _matchPrefix(result, truthRows, spec);
  }
  return spec.mode === "subset"
    ? _matchSubset(result, truthRows, spec)
    : _matchAll(result, truthRows, spec);
}

/** Whether a number appears in one of the first rows of the result. */
function _hasValue(
  result: EvalQueryResult,
  value: number,
  options: Readonly<{
    maxRows?: number;
    tolerance?: number;
    scales?: readonly number[];
  }> = {},
): Verdict {
  const rows = result.rows.slice(0, options.maxRows ?? 5);
  const isFound = rows.some((row) => {
    return row.some((cell) => {
      return MatcherText.cellMatchesValue(cell, value, {
        tolerance: options.tolerance ?? 0.001,
        scales: options.scales ?? [1],
      });
    });
  });
  return {
    pass: isFound,
    detail: isFound
      ? `found ${value}`
      : `${value} not in the first ${rows.length} rows`,
  };
}

/** Whether some numeric column adds up to the expected total. */
function _hasColumnSum(
  result: EvalQueryResult,
  total: number,
  options: Readonly<{ tolerance?: number }> = {},
): Verdict {
  const sums = result.columns.map((_column, columnIndex) => {
    return result.rows.reduce((sum, row) => {
      return sum + (MatcherText.toNumber(row[columnIndex]) ?? 0);
    }, 0);
  });
  const isFound = sums.some((sum) => {
    return MatcherText.isClose(sum, total, options.tolerance ?? 0.001);
  });
  return {
    pass: isFound,
    detail: isFound
      ? `a column sums to ${total}`
      : `no column sums to ${total} (sums: ${sums.map(Math.round).join(", ")})`,
  };
}

/**
 * Whether one column holds exactly the expected names: all of `expected`,
 * plus any of `optional`, and nothing else.
 */
function _hasKeySet(
  result: EvalQueryResult,
  expected: readonly string[],
  optional: readonly string[] = [],
): Verdict {
  const expectedSet = new Set(expected.map(MatcherText.normalize));
  const allowedSet = new Set([
    ...expectedSet,
    ...optional.map(MatcherText.normalize),
  ]);
  const isMatch = result.columns.some((_column, columnIndex) => {
    const values = new Set(
      result.rows.map((row) => {
        return MatcherText.normalize(row[columnIndex]);
      }),
    );
    return (
      [...expectedSet].every((value) => {
        return values.has(value);
      }) &&
      [...values].every((value) => {
        return allowedSet.has(value);
      })
    );
  });
  return {
    pass: isMatch,
    detail: isMatch
      ? `exactly the ${expectedSet.size} expected names`
      : `no column holds exactly the ${expectedSet.size} expected names`,
  };
}

/** Passes when any alternative passes, reporting the first that did. */
function _anyOf(verdicts: ReadonlyArray<() => Verdict>): Verdict {
  const details: string[] = [];
  for (const getVerdict of verdicts) {
    const verdict = getVerdict();
    if (verdict.pass) {
      return verdict;
    }
    details.push(verdict.detail);
  }
  return { pass: false, detail: details.join(" | ") };
}

/** Comparisons between a model's result and the ground truth. */
export const ResultChecks = {
  matchTruthRows: _matchTruthRows,
  hasValue: _hasValue,
  hasColumnSum: _hasColumnSum,
  hasKeySet: _hasKeySet,
  anyOf: _anyOf,
};
