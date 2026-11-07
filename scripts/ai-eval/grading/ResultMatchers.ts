/** Whether a check passed, with a short reason a reviewer can act on. */
export type Verdict = { pass: boolean; detail: string };

type Cell = unknown;

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

function _normalizeText(value: Cell): string {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase();
}

/** Reads a cell as a number, accepting numeric strings like "1,234.5". */
function _toNumber(value: Cell): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (
    typeof value === "string" &&
    /^-?[\d,]*\.?\d+(e[-+]?\d+)?$/i.test(value)
  ) {
    const parsed = Number(value.replaceAll(",", ""));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

/** Whether two numbers agree within a relative or absolute tolerance. */
function _isClose(
  actual: number,
  expected: number,
  tolerance: number,
): boolean {
  const scale = Math.max(Math.abs(expected), 1);
  return Math.abs(actual - expected) <= Math.max(tolerance * scale, 0.51);
}

function _matchesMonthParts(row: readonly Cell[], monthKey: string): boolean {
  const [year, month] = monthKey.split("-").map(Number);
  const monthName = MONTH_NAMES[(month ?? 1) - 1] ?? "";
  const hasYear = row.some((cell) => {
    return _toNumber(cell) === year || _normalizeText(cell) === String(year);
  });
  const hasMonth = row.some((cell) => {
    const text = _normalizeText(cell);
    return (
      _toNumber(cell) === month ||
      text === monthName ||
      text === monthName.slice(0, 3) ||
      text.startsWith(`${monthName} ${year}`) ||
      text.startsWith(`${monthName.slice(0, 3)} ${year}`)
    );
  });
  return hasYear && hasMonth;
}

/**
 * Whether a truth key (a name, a year, a `YYYY-MM` month, or a `YYYY-MM-DD`
 * day) appears in a result row, in any column and in any common format.
 */
function _rowHasKey(row: readonly Cell[], key: Cell): boolean {
  const keyText = _normalizeText(key);
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(keyText)) {
    return (
      row.some((cell) => {
        return _normalizeText(cell).startsWith(keyText);
      }) ||
      (keyText.length === 7 && _matchesMonthParts(row, keyText))
    );
  }
  const keyNumber = _toNumber(key);
  return row.some((cell) => {
    if (keyNumber !== undefined) {
      return (
        _toNumber(cell) === keyNumber ||
        _normalizeText(cell).startsWith(keyText)
      );
    }
    return _normalizeText(cell) === keyText;
  });
}

function _cellMatchesValue(
  cell: Cell,
  value: number,
  options: Readonly<{ tolerance: number; scales: readonly number[] }>,
): boolean {
  const cellNumber = _toNumber(cell);
  if (cellNumber === undefined) {
    return false;
  }
  return options.scales.some((scale) => {
    return _isClose(cellNumber, value * scale, options.tolerance);
  });
}

export const MatcherText = {
  normalize: _normalizeText,
  toNumber: _toNumber,
  isClose: _isClose,
  rowHasKey: _rowHasKey,
  cellMatchesValue: _cellMatchesValue,
};
