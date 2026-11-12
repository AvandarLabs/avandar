import { makeBucketMap, prop } from "@avandar/utils";
import { uuid } from "$/lib/uuid.ts";
import type {
  DataDictionaryCodeListDraft,
  DataDictionaryDraft,
  DataDictionaryDraftIssue,
  DataDictionaryEntryCodingDraft,
  DataDictionaryEntryDraft,
  DataDictionaryId,
  DataDictionarySaveErrorHint,
  DataDictionarySavePayload,
} from "$/models/dataDictionaries/DataDictionary/DataDictionary.types.ts";
import type {
  CodePair,
  DataDictionaryCodeListId,
  DataDictionaryCodeListModel,
} from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.types.ts";
import type {
  DataDictionaryEntryId,
  DataDictionaryEntryKind,
  DataDictionaryEntryModel,
} from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.types.ts";
import type { DataDictionaryEntryCodingModel } from "$/models/dataDictionaries/DataDictionaryEntryCoding/DataDictionaryEntryCoding.types.ts";

/** Every entry kind, in the order the Kind select lists them. */
const ENTRY_KINDS: readonly DataDictionaryEntryKind[] = [
  "categorical",
  "ordered",
  "number",
  "date",
  "text",
  "identifier",
];

const SAVE_ERROR_HINTS: readonly DataDictionarySaveErrorHint[] = [
  "dictionary_editor_required",
  "dictionary_payload_invalid",
  "item_not_in_dictionary",
  "code_list_name_required",
  "code_pair_incomplete",
  "codes_not_unique",
  "labels_not_unique",
  "entry_name_required",
  "entry_names_not_unique",
  "entry_range_invalid",
  "coding_kind_mismatch",
  "coding_list_not_in_dictionary",
  "coding_primary_required",
];

/** A line of pasted pairs: the code, a separator, then the label. */
const PASTED_PAIR_PATTERN = /^(.*?)\s*(?:=|:|\t|,)\s*(.*)$/;

/** Trims and lowercases a name, code, or label for comparison. */
function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

/** Whether entries of this kind translate codes to labels. */
function isCodedKind(kind: DataDictionaryEntryKind): boolean {
  return kind === "categorical" || kind === "ordered";
}

function _uniqueName(options: {
  base: string;
  separator: string;
  existingNames: readonly string[];
}): string {
  const taken = new Set(options.existingNames.map(normalizeKey));
  if (!taken.has(normalizeKey(options.base))) {
    return options.base;
  }
  let suffix = 2;
  while (
    taken.has(normalizeKey(`${options.base}${options.separator}${suffix}`))
  ) {
    suffix += 1;
  }
  return `${options.base}${options.separator}${suffix}`;
}

/** An empty pair, for a new row in a code list. */
function makeEmptyPair(): CodePair {
  return { code: "", label: "", acceptedSpellings: [], isMissing: false };
}

/** A blank text entry whose name clashes with none of `existingNames`. */
function makeNewEntry(
  existingNames: readonly string[],
): DataDictionaryEntryDraft {
  return {
    id: uuid<DataDictionaryEntryId>(),
    name: _uniqueName({ base: "new_entry", separator: "_", existingNames }),
    columnNames: [],
    kind: "text",
    unit: "",
    validMin: undefined,
    validMax: undefined,
    description: "",
    codings: [],
  };
}

/** A code list with one empty pair, named so it clashes with none. */
function makeNewCodeList(
  existingNames: readonly string[],
  base = "New code list",
): DataDictionaryCodeListDraft {
  return {
    id: uuid<DataDictionaryCodeListId>(),
    name: _uniqueName({ base, separator: " ", existingNames }),
    isOrdered: false,
    pairs: [makeEmptyPair()],
  };
}

function _toCodingDrafts(
  codings: ReadonlyArray<DataDictionaryEntryCodingModel["Read"]>,
): DataDictionaryEntryCodingDraft[] {
  return [...codings]
    .sort((codingA, codingB) => {
      return (
        Number(codingB.isPrimary) - Number(codingA.isPrimary) ||
        codingA.codeListId.localeCompare(codingB.codeListId)
      );
    })
    .map((coding) => {
      return { codeListId: coding.codeListId, isPrimary: coding.isPrimary };
    });
}

/**
 * Saved rows as an editable draft: entries by position, code lists by
 * name, and each entry's primary coding first.
 */
function toDraft(options: {
  entries: ReadonlyArray<DataDictionaryEntryModel["Read"]>;
  codeLists: ReadonlyArray<DataDictionaryCodeListModel["Read"]>;
  codings: ReadonlyArray<DataDictionaryEntryCodingModel["Read"]>;
}): DataDictionaryDraft {
  const codingsByEntryId = makeBucketMap(options.codings, {
    keyFn: prop("entryId"),
  });
  const entries = [...options.entries]
    .sort((entryA, entryB) => {
      return (
        entryA.position - entryB.position ||
        entryA.name.localeCompare(entryB.name)
      );
    })
    .map((entry): DataDictionaryEntryDraft => {
      return {
        id: entry.id,
        name: entry.name,
        columnNames: [...entry.columnNames],
        kind: entry.kind,
        unit: entry.unit ?? "",
        validMin: entry.validMin,
        validMax: entry.validMax,
        description: entry.description ?? "",
        codings: _toCodingDrafts(codingsByEntryId.get(entry.id) ?? []),
      };
    });
  const codeLists = [...options.codeLists]
    .sort((listA, listB) => {
      return listA.name.localeCompare(listB.name);
    })
    .map((list): DataDictionaryCodeListDraft => {
      return {
        id: list.id,
        name: list.name,
        isOrdered: list.isOrdered,
        pairs: list.pairs.map((pair) => {
          return { ...pair, acceptedSpellings: [...pair.acceptedSpellings] };
        }),
      };
    });
  return { entries, codeLists };
}

/** The draft with one entry replaced by id. */
function replaceEntry(
  draft: DataDictionaryDraft,
  entry: DataDictionaryEntryDraft,
): DataDictionaryDraft {
  return {
    ...draft,
    entries: draft.entries.map((current) => {
      return current.id === entry.id ? entry : current;
    }),
  };
}

/** The draft without one entry. */
function removeEntry(
  draft: DataDictionaryDraft,
  entryId: DataDictionaryEntryId,
): DataDictionaryDraft {
  return {
    ...draft,
    entries: draft.entries.filter((entry) => {
      return entry.id !== entryId;
    }),
  };
}

/** The draft with one code list replaced by id. */
function replaceCodeList(
  draft: DataDictionaryDraft,
  codeList: DataDictionaryCodeListDraft,
): DataDictionaryDraft {
  return {
    ...draft,
    codeLists: draft.codeLists.map((current) => {
      return current.id === codeList.id ? codeList : current;
    }),
  };
}

function _withPrimaryPromoted(
  codings: readonly DataDictionaryEntryCodingDraft[],
): DataDictionaryEntryCodingDraft[] {
  if (codings.length === 0 || codings.some(prop("isPrimary"))) {
    return [...codings];
  }
  return codings.map((coding, index) => {
    return { ...coding, isPrimary: index === 0 };
  });
}

/**
 * The draft without one code list, and without every coding that pointed
 * at it. An entry that lost its primary coding promotes its next one.
 */
function removeCodeList(
  draft: DataDictionaryDraft,
  codeListId: DataDictionaryCodeListId,
): DataDictionaryDraft {
  return {
    codeLists: draft.codeLists.filter((list) => {
      return list.id !== codeListId;
    }),
    entries: draft.entries.map((entry) => {
      const kept = entry.codings.filter((coding) => {
        return coding.codeListId !== codeListId;
      });
      return kept.length === entry.codings.length
        ? entry
        : { ...entry, codings: _withPrimaryPromoted(kept) };
    }),
  };
}

/**
 * The draft with one entry's primary code list set. Other codings stay as
 * non-primary. `undefined` removes every coding from the entry.
 */
function setPrimaryCodeList(
  draft: DataDictionaryDraft,
  options: {
    entryId: DataDictionaryEntryId;
    codeListId: DataDictionaryCodeListId | undefined;
  },
): DataDictionaryDraft {
  return {
    ...draft,
    entries: draft.entries.map((entry) => {
      if (entry.id !== options.entryId) {
        return entry;
      }
      if (options.codeListId === undefined) {
        return { ...entry, codings: [] };
      }
      const others = entry.codings
        .filter((coding) => {
          return coding.codeListId !== options.codeListId;
        })
        .map((coding) => {
          return { ...coding, isPrimary: false };
        });
      return {
        ...entry,
        codings: [
          { codeListId: options.codeListId, isPrimary: true },
          ...others,
        ],
      };
    }),
  };
}

/**
 * The draft with one entry's non-primary codings replaced by
 * `codeListIds`, keeping its primary coding first.
 */
function setOtherCodeLists(
  draft: DataDictionaryDraft,
  options: {
    entryId: DataDictionaryEntryId;
    codeListIds: readonly DataDictionaryCodeListId[];
  },
): DataDictionaryDraft {
  return {
    ...draft,
    entries: draft.entries.map((entry) => {
      if (entry.id !== options.entryId) {
        return entry;
      }
      const primary = entry.codings.filter(prop("isPrimary"));
      const primaryIds = new Set(primary.map(prop("codeListId")));
      const others = [...new Set(options.codeListIds)]
        .filter((codeListId) => {
          return !primaryIds.has(codeListId);
        })
        .map((codeListId) => {
          return { codeListId, isPrimary: false };
        });
      return {
        ...entry,
        codings: _withPrimaryPromoted([...primary, ...others]),
      };
    }),
  };
}

/**
 * Adds an empty code list named after an entry ("sex codes") and makes it
 * that entry's primary coding.
 */
function addCodeListForEntry(
  draft: DataDictionaryDraft,
  entryId: DataDictionaryEntryId,
): { draft: DataDictionaryDraft; codeListId: DataDictionaryCodeListId } {
  const entry = draft.entries.find((current) => {
    return current.id === entryId;
  });
  const codeList = makeNewCodeList(
    draft.codeLists.map(prop("name")),
    `${entry?.name.trim() || "New"} codes`,
  );
  const withList = { ...draft, codeLists: [...draft.codeLists, codeList] };
  return {
    draft: setPrimaryCodeList(withList, { entryId, codeListId: codeList.id }),
    codeListId: codeList.id,
  };
}

/** The entries that recognize a code list, in display order. */
function getEntriesUsingCodeList(
  draft: DataDictionaryDraft,
  codeListId: DataDictionaryCodeListId,
): DataDictionaryEntryDraft[] {
  return draft.entries.filter((entry) => {
    return entry.codings.some((coding) => {
      return coding.codeListId === codeListId;
    });
  });
}

/** An entry's primary code list, if it has one. */
function getPrimaryCodeListId(
  entry: DataDictionaryEntryDraft,
): DataDictionaryCodeListId | undefined {
  return entry.codings.find(prop("isPrimary"))?.codeListId;
}

function _countByKey(values: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    const key = normalizeKey(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return counts;
}

function _findEntryIssues(
  entries: readonly DataDictionaryEntryDraft[],
): DataDictionaryDraftIssue[] {
  const nameCounts = _countByKey(entries.map(prop("name")));
  return entries.flatMap((entry): DataDictionaryDraftIssue[] => {
    const issues: DataDictionaryDraftIssue[] = [];
    const nameKey = normalizeKey(entry.name);
    if (nameKey === "") {
      issues.push({ type: "entry_name_required", entryId: entry.id });
    } else if ((nameCounts.get(nameKey) ?? 0) > 1) {
      issues.push({ type: "entry_name_not_unique", entryId: entry.id });
    }
    if (
      entry.kind === "number" &&
      entry.validMin !== undefined &&
      entry.validMax !== undefined &&
      entry.validMin > entry.validMax
    ) {
      issues.push({ type: "entry_range_invalid", entryId: entry.id });
    }
    const primaryCount = entry.codings.filter(prop("isPrimary")).length;
    if (
      isCodedKind(entry.kind) &&
      entry.codings.length > 0 &&
      primaryCount !== 1
    ) {
      issues.push({ type: "entry_primary_required", entryId: entry.id });
    }
    return issues;
  });
}

function _pairSpellings(pair: CodePair): string[] {
  return [pair.label, ...pair.acceptedSpellings]
    .map(normalizeKey)
    .filter((spelling) => {
      return spelling !== "";
    });
}

function _findPairIssues(
  codeList: DataDictionaryCodeListDraft,
): DataDictionaryDraftIssue[] {
  const codeCounts = _countByKey(codeList.pairs.map(prop("code")));
  const pairsBySpelling = new Map<string, Set<number>>();
  codeList.pairs.forEach((pair, pairIndex) => {
    _pairSpellings(pair).forEach((spelling) => {
      pairsBySpelling.set(
        spelling,
        (pairsBySpelling.get(spelling) ?? new Set()).add(pairIndex),
      );
    });
  });
  return codeList.pairs.flatMap(
    (pair, pairIndex): DataDictionaryDraftIssue[] => {
      const at = { codeListId: codeList.id, pairIndex };
      if (normalizeKey(pair.code) === "" || normalizeKey(pair.label) === "") {
        return [{ type: "code_pair_incomplete", ...at }];
      }
      if ((codeCounts.get(normalizeKey(pair.code)) ?? 0) > 1) {
        return [{ type: "code_not_unique", ...at }];
      }
      const sharesSpelling = _pairSpellings(pair).some((spelling) => {
        return (pairsBySpelling.get(spelling)?.size ?? 0) > 1;
      });
      return sharesSpelling ? [{ type: "label_not_unique", ...at }] : [];
    },
  );
}

/**
 * Every reason the draft cannot be saved yet: entry issues first, then
 * code list issues, each in display order. Empty when it can be saved.
 */
function findDraftIssues(
  draft: DataDictionaryDraft,
): DataDictionaryDraftIssue[] {
  return [
    ..._findEntryIssues(draft.entries),
    ...draft.codeLists.flatMap((codeList): DataDictionaryDraftIssue[] => {
      return [
        ...(normalizeKey(codeList.name) === ""
          ? [
              {
                type: "code_list_name_required",
                codeListId: codeList.id,
              } as const,
            ]
          : []),
        ..._findPairIssues(codeList),
      ];
    }),
  ];
}

function _cleanList(
  values: readonly string[],
  exclude: readonly string[] = [],
): string[] {
  const seen = new Set(exclude.map(normalizeKey));
  return values
    .map((value) => {
      return value.trim();
    })
    .filter((value) => {
      const key = normalizeKey(value);
      if (key === "" || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

/**
 * The save RPC's payload for a draft: text trimmed, blanks dropped,
 * positions following the draft's order, and codings and number fields
 * kept only for the kinds they apply to.
 */
function buildSavePayload(options: {
  dictionaryId: DataDictionaryId;
  draft: DataDictionaryDraft;
}): DataDictionarySavePayload {
  const { dictionaryId, draft } = options;
  return {
    dictionaryId,
    codeLists: draft.codeLists.map((list) => {
      return {
        id: list.id,
        name: list.name.trim(),
        isOrdered: list.isOrdered,
        pairs: list.pairs.map((pair) => {
          const label = pair.label.trim();
          return {
            code: pair.code.trim(),
            label,
            acceptedSpellings: _cleanList(pair.acceptedSpellings, [label]),
            isMissing: pair.isMissing,
          };
        }),
      };
    }),
    entries: draft.entries.map((entry, index) => {
      const isNumber = entry.kind === "number";
      return {
        id: entry.id,
        name: entry.name.trim(),
        columnNames: _cleanList(entry.columnNames),
        kind: entry.kind,
        unit: isNumber ? entry.unit.trim() || undefined : undefined,
        validMin: isNumber ? entry.validMin : undefined,
        validMax: isNumber ? entry.validMax : undefined,
        description: entry.description.trim() || undefined,
        position: index,
        codings: isCodedKind(entry.kind) ? entry.codings : [],
      };
    }),
  };
}

/**
 * Pairs from pasted text, one per line. A line splits at its first `=`,
 * `:`, tab, or comma, so a label may itself contain commas. A line with no
 * separator becomes a code with an empty label. Blank lines are skipped.
 */
function parsePastedPairs(text: string): CodePair[] {
  return text
    .split(/\r?\n/)
    .map((line) => {
      return line.trim();
    })
    .filter((line) => {
      return line !== "";
    })
    .map((line) => {
      const match = PASTED_PAIR_PATTERN.exec(line);
      return {
        ...makeEmptyPair(),
        code: (match?.[1] ?? line).trim(),
        label: (match?.[2] ?? "").trim(),
      };
    });
}

/**
 * The save RPC's `hint` on a thrown database error, when it is one the
 * client knows how to explain.
 */
function toSaveErrorHint(
  error: unknown,
): DataDictionarySaveErrorHint | undefined {
  if (typeof error !== "object" || error === null || !("hint" in error)) {
    return undefined;
  }
  const { hint } = error;
  return SAVE_ERROR_HINTS.find((knownHint) => {
    return knownHint === hint;
  });
}

/**
 * Pure helpers for editing a dictionary's contents: building and changing
 * a draft, validating it, and turning it into the save RPC's payload.
 */
export const DataDictionaryModule = {
  ENTRY_KINDS,
  normalizeKey,
  isCodedKind,
  makeEmptyPair,
  makeNewEntry,
  makeNewCodeList,
  toDraft,
  replaceEntry,
  removeEntry,
  replaceCodeList,
  removeCodeList,
  setPrimaryCodeList,
  setOtherCodeLists,
  addCodeListForEntry,
  getEntriesUsingCodeList,
  getPrimaryCodeListId,
  findDraftIssues,
  buildSavePayload,
  parsePastedPairs,
  toSaveErrorHint,
};
