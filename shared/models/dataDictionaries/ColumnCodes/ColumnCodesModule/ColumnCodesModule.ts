import type {
  ColumnCodePair,
  ColumnCodesContext,
  ColumnCodesRows,
  ColumnCodesT,
} from "$/models/dataDictionaries/ColumnCodes/ColumnCodes.types.ts";

/** The most pairs one column lists in a prompt before "and n more". */
const MAX_PROMPT_PAIRS = 30;

/** The longest description one column carries into a prompt. */
const MAX_PROMPT_DESCRIPTION_CHARS = 120;

/** Trims and collapses each run of whitespace, newlines too, to one space. */
function _toOneLine(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/** Trims, lowercases, and collapses inner spaces, for comparing labels. */
function _toComparable(text: string): string {
  return _toOneLine(text).toLowerCase();
}

function _byId<Row extends { id: string }>(
  rows: readonly Row[],
): Map<string, Row> {
  return new Map(
    rows.map((row) => {
      return [row.id, row] as const;
    }),
  );
}

/**
 * Joins bindings to the dictionary rows they name, one result per bound
 * column. A binding whose dictionary or entry is gone, or not visible to
 * the reader, is left out.
 */
function fromRows(rows: Readonly<ColumnCodesRows>): Map<string, ColumnCodesT> {
  const dictionaries = _byId(rows.dictionaries);
  const entries = _byId(rows.entries);
  const codeLists = _byId(rows.codeLists);
  const result = new Map<string, ColumnCodesT>();
  rows.bindings.forEach((binding) => {
    const dictionary = dictionaries.get(binding.dictionaryId ?? "");
    const entry = entries.get(binding.entryId ?? "");
    if (!dictionary || !entry) {
      return;
    }
    const codeList = codeLists.get(binding.codeListId ?? "");
    result.set(binding.datasetColumnId, {
      datasetColumnId: binding.datasetColumnId,
      dictionaryId: dictionary.id,
      dictionaryName: dictionary.name,
      entryName: entry.name,
      description: entry.description,
      codeListName: codeList?.name,
      isOrdered: codeList?.isOrdered ?? false,
      pairs: codeList?.pairs ?? [],
      mode: binding.mode,
      direction: binding.direction,
    });
  });
  return result;
}

/** The part of a column's codes a model reads. */
function toContext(codes: Readonly<ColumnCodesContext>): ColumnCodesContext {
  return {
    direction: codes.direction,
    pairs: codes.pairs,
    ...(codes.description ? { description: codes.description } : {}),
  };
}

function _isStoredPair(value: unknown): value is {
  code: string;
  label: string;
  accepted_spellings?: unknown;
  is_missing?: unknown;
} {
  const pair = value as { code?: unknown; label?: unknown } | null;
  return typeof pair?.code === "string" && typeof pair.label === "string";
}

/**
 * Reads `data_dictionaries__code_lists.pairs` as stored (snake_case JSON).
 * A malformed pair is skipped rather than failing the whole list.
 */
function fromStoredPairs(value: unknown): ColumnCodePair[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(_isStoredPair).map((pair) => {
    const spellings = Array.isArray(pair.accepted_spellings)
      ? pair.accepted_spellings.filter((spelling): spelling is string => {
          return typeof spelling === "string";
        })
      : [];
    return {
      code: pair.code,
      label: pair.label,
      acceptedSpellings: spellings,
      isMissing: pair.is_missing === true,
    };
  });
}

/**
 * A label as prompt text: quoted, with inner quotes escaped, only when a
 * comma or `=` would otherwise blur where the pair ends.
 */
function _formatLabel(label: string): string {
  return /[,=]/.test(label) ? `"${label.replace(/"/g, '\\"')}"` : label;
}

function _formatPair(
  pair: Readonly<ColumnCodePair>,
  direction: ColumnCodesContext["direction"],
): string {
  const oneLineLabel = _toOneLine(pair.label);
  const label = oneLineLabel === "" ? "(no label)" : _formatLabel(oneLineLabel);
  const code = _toOneLine(pair.code);
  const missing = pair.isMissing ? " (missing)" : "";
  return direction === "decode"
    ? `${code}=${label}${missing}`
    : `${label}${missing}`;
}

/**
 * A column's pairs as one line of prompt text, such as `1=Male, 2=Female,
 * 9=Unknown (missing)`. A column holding labels lists just the labels.
 * Past 30 pairs it ends with "and 12 more".
 */
function formatPairs(codes: Readonly<ColumnCodesContext>): string {
  const pairs =
    codes.direction === "encode"
      ? codes.pairs.filter((pair) => {
          return pair.label.trim() !== "";
        })
      : codes.pairs;
  const shown = pairs.slice(0, MAX_PROMPT_PAIRS).map((pair) => {
    return _formatPair(pair, codes.direction);
  });
  const hiddenCount = pairs.length - shown.length;
  return hiddenCount > 0
    ? `${shown.join(", ")}, and ${hiddenCount} more`
    : shown.join(", ");
}

/** A description cut to 120 characters for a prompt, or undefined. */
function formatDescription(
  description: string | undefined,
): string | undefined {
  const text = description === undefined ? "" : _toOneLine(description);
  if (text === "") {
    return undefined;
  }
  return text.length > MAX_PROMPT_DESCRIPTION_CHARS
    ? `${text.slice(0, MAX_PROMPT_DESCRIPTION_CHARS - 3).trimEnd()}...`
    : text;
}

/**
 * The pair whose label or accepted spelling is `text`, ignoring case and
 * spaces, or undefined. A blank label never matches.
 */
function findPairByLabel(
  codes: Readonly<ColumnCodesContext>,
  text: string,
): ColumnCodePair | undefined {
  const wanted = _toComparable(text);
  if (wanted === "") {
    return undefined;
  }
  return codes.pairs.find((pair) => {
    return [pair.label, ...pair.acceptedSpellings].some((spelling) => {
      return _toComparable(spelling) === wanted;
    });
  });
}

/**
 * Pure helpers for what a dictionary says about a bound column: joining a
 * binding to its dictionary rows, reading stored pairs, and writing the
 * pairs into a model's prompt. Used wherever a bound column is shown or
 * described, for example a code-list popover or the data agent's schema.
 */
export const ColumnCodesModule = {
  MAX_PROMPT_PAIRS,
  MAX_PROMPT_DESCRIPTION_CHARS,
  fromRows,
  toContext,
  fromStoredPairs,
  formatPairs,
  formatDescription,
  findPairByLabel,
};
