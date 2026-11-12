import { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary.ts";
import type {
  DictionaryProposalCodeList,
  DictionaryProposalCodings,
  DictionaryProposalEntry,
  DictionaryProposalT,
} from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal.types.ts";

/** Two sets of codes are one coding when this share of the smaller overlaps. */
const MIN_CODING_OVERLAP = 0.5;

/** How many codes a code list's name shows, as in `GENDER (1/2/9)`. */
const CODES_IN_NAME = 4;

/** How many entry names a shared list's name shows before `...`. */
const NAMES_IN_NAME = 3;

/** A code made only of digits, with an optional sign or decimals. */
const NUMERIC_CODE = /^-?\d+(\.\d+)?$/;

/** Values by normalized code. The first spelling seen is the code kept. */
type Coding = Map<string, ColumnProfile.Value>;

type ListBuilder = {
  /** The shared first word of numeric lists' columns; empty for words. */
  groupWord: string;
  entryKeys: string[];
  isOrdered: boolean;
  values: Coding;
};

function _addValues(
  target: Coding,
  values: Iterable<ColumnProfile.Value>,
): void {
  [...values].forEach((item) => {
    const key = ColumnProfile.getComparisonKey(item.value);
    const current = target.get(key);
    target.set(key, {
      value: current?.value ?? item.value.trim(),
      rowCount: (current?.rowCount ?? 0) + item.rowCount,
    });
  });
}

function _getOverlap(codingA: Coding, codingB: Coding): number {
  const shared = [...codingA.keys()].filter((key) => {
    return codingB.has(key);
  }).length;
  return shared / Math.max(1, Math.min(codingA.size, codingB.size));
}

function _getTotalRows(coding: Coding): number {
  return [...coding.values()].reduce((sum, item) => {
    return sum + item.rowCount;
  }, 0);
}

function _makeColumnCoding(values: readonly ColumnProfile.Value[]): Coding {
  const coding: Coding = new Map();
  _addValues(coding, values);
  return coding;
}

/**
 * Merges every pair of codings that overlap, again and again until none
 * do, so a coding that bridges two others joins all three whatever order
 * the columns came in.
 */
function _mergeOverlappingCodings(codings: readonly Coding[]): Coding[] {
  const pairIndex = codings.findIndex((codingA, indexA) => {
    return codings.slice(indexA + 1).some((codingB) => {
      return _getOverlap(codingA, codingB) >= MIN_CODING_OVERLAP;
    });
  });
  const first = codings[pairIndex];
  if (!first) {
    return [...codings];
  }
  const secondIndex = codings.findIndex((coding, index) => {
    return (
      index > pairIndex && _getOverlap(first, coding) >= MIN_CODING_OVERLAP
    );
  });
  const merged: Coding = new Map(first);
  _addValues(merged, codings[secondIndex]?.values() ?? []);
  return _mergeOverlappingCodings([
    ...codings.slice(0, pairIndex),
    merged,
    ...codings.slice(pairIndex + 1).filter((_coding, index) => {
      return index + pairIndex + 1 !== secondIndex;
    }),
  ]);
}

/** One coding per set of codes the entry's columns hold, most rows first. */
function _makeCodings(entry: Readonly<DictionaryProposalEntry>): Coding[] {
  const columnCodings = [...entry.columns, ...entry.suggestedColumns]
    .filter((column) => {
      return column.values && column.values.length > 0;
    })
    .map((column) => {
      return _makeColumnCoding(column.values ?? []);
    });
  return _mergeOverlappingCodings(columnCodings).sort((codingA, codingB) => {
    return _getTotalRows(codingB) - _getTotalRows(codingA);
  });
}

/**
 * The word that lets numeric codings share a list: the first word of the
 * entry's first column name. Word codings need none, so it is empty. It is
 * read from the column, never the entry's name, so a rename keeps the key.
 */
function _getGroupWord(
  entry: Readonly<DictionaryProposalEntry>,
  coding: Coding,
): string {
  const isNumeric = [...coding.keys()].every((key) => {
    return NUMERIC_CODE.test(key);
  });
  if (!isNumeric) {
    return "";
  }
  const [firstColumn] = [...entry.columns, ...entry.suggestedColumns];
  const columnName = firstColumn?.columnName ?? entry.name;
  return ColumnProfile.getTokensFromColumnName(columnName)[0] ?? "";
}

/** The part of a list's name before its codes. */
function _getBaseName(
  builder: Readonly<ListBuilder>,
  entryNames: ReadonlyMap<string, string>,
): string {
  const names = builder.entryKeys.map((entryKey) => {
    return entryNames.get(entryKey) ?? "";
  });
  if (names.length === 1) {
    return names[0] ?? builder.groupWord;
  }
  if (builder.groupWord !== "") {
    return builder.groupWord;
  }
  const shown = names.slice(0, NAMES_IN_NAME).join(", ");
  return names.length > NAMES_IN_NAME ? `${shown}, ...` : shown;
}

function _makeCodeList(
  options: Readonly<{
    key: string;
    builder: ListBuilder;
    entryNames: ReadonlyMap<string, string>;
  }>,
): DictionaryProposalCodeList {
  const { key, builder, entryNames } = options;
  const values = [...builder.values.values()];
  const sortedValues = builder.isOrdered
    ? ColumnProfile.sortValuesInScaleOrder(values)
    : values.sort((itemA, itemB) => {
        return itemB.rowCount - itemA.rowCount;
      });
  const base = _getBaseName(builder, entryNames);
  const codes = sortedValues
    .slice(0, CODES_IN_NAME)
    .map((item) => {
      return item.value;
    })
    .join("/");
  const more = sortedValues.length > CODES_IN_NAME ? "/..." : "";
  return {
    key,
    name: `${base} (${codes}${more})`,
    isOrdered: builder.isOrdered,
    entryKeys: [...builder.entryKeys],
    values: sortedValues,
  };
}

/**
 * The code lists a proposal would save, and which ones each coded entry
 * uses, primary first. An entry gets one code list per set of codes its
 * columns hold. Entries share one list when their codes are the same words
 * (`Y/N/U`), or the same numbers and their columns' names start with the
 * same word (`symptom_fever`, `symptom_rash`). Excluded and
 * description-only entries get none.
 *
 * Read by the Label values step to list what needs labels, and by
 * `makeDraftFromProposal` to build the draft that is saved.
 */
export function getCodingsFromProposal(
  proposal: Readonly<DictionaryProposalT>,
): DictionaryProposalCodings {
  const builders = new Map<string, ListBuilder>();
  const codeListKeysByEntryKey: Record<string, string[]> = {};
  const codedEntries = proposal.entries.filter((entry) => {
    return entry.isIncluded && DataDictionary.isCodedKind(entry.kind);
  });
  codedEntries.forEach((entry) => {
    codeListKeysByEntryKey[entry.key] = _makeCodings(entry).map((coding) => {
      const groupWord = _getGroupWord(entry, coding);
      const key = `${groupWord}|${[...coding.keys()].sort().join("\u001f")}`;
      const builder = builders.get(key);
      if (builder) {
        builder.entryKeys.push(entry.key);
        builder.isOrdered ||= entry.kind === "ordered";
        _addValues(builder.values, coding.values());
      } else {
        const isOrdered = entry.kind === "ordered";
        builders.set(key, {
          groupWord,
          entryKeys: [entry.key],
          isOrdered,
          values: coding,
        });
      }
      return key;
    });
  });
  const entryNames = new Map(
    codedEntries.map((entry) => {
      return [entry.key, entry.name];
    }),
  );
  const codeLists = [...builders.entries()].map(([key, builder]) => {
    return _makeCodeList({ key, builder, entryNames });
  });
  return { codeLists, codeListKeysByEntryKey };
}
