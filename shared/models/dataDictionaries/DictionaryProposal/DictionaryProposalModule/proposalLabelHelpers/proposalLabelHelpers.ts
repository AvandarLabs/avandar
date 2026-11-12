import { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import type {
  DictionaryProposalCodeList,
  DictionaryProposalCodeListStatus,
  DictionaryProposalLabels,
  DictionaryProposalLabelSuggestions,
  DictionaryProposalValueLabel,
} from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal.types.ts";

/** A value this long or longer, with a letter in it, reads as a label. */
const MIN_LABEL_LENGTH = 4;

type ValueRef = { codeListKey: string; code: string };

function _readsAsLabel(value: string): boolean {
  const trimmed = value.trim();
  return (
    /\p{L}/u.test(trimmed) &&
    (trimmed.length >= MIN_LABEL_LENGTH || /\s/.test(trimmed))
  );
}

function _makeDefaultLabel(value: string): DictionaryProposalValueLabel {
  return {
    label: _readsAsLabel(value) ? value.trim() : "",
    isMissing: ColumnProfile.isMissingValue(value),
    source: "data",
  };
}

/**
 * The labels of the earlier list, one no current list uses, that holds the
 * most of this list's codes. Undefined when none shares a code. A list's key
 * is built from its codes, so a changed code set is a new key.
 */
function _findPreviousListLabels(
  labels: Readonly<DictionaryProposalLabels>,
  list: Readonly<DictionaryProposalCodeList>,
  currentKeys: ReadonlySet<string>,
): DictionaryProposalLabels[string] | undefined {
  const codes = list.values.map((item) => {
    return ColumnProfile.normalizeValue(item.value);
  });
  const overlaps = Object.entries(labels)
    .filter(([key]) => {
      return !currentKeys.has(key);
    })
    .map(([, previous]) => {
      const sharedCount = codes.filter((code) => {
        return previous.values[code] !== undefined;
      }).length;
      return { previous, sharedCount };
    });
  const best = overlaps.reduce<(typeof overlaps)[number] | undefined>(
    (leader, candidate) => {
      return candidate.sharedCount > (leader?.sharedCount ?? 0)
        ? candidate
        : leader;
    },
    undefined,
  );
  return best?.previous;
}

/**
 * The labels with an entry for every value of every code list, keeping
 * whatever was already there. A value that reads as a label (`Recovered`)
 * starts labeled with itself; a word for a missing answer starts marked
 * missing. A list with no labels yet takes those of the earlier list that
 * overlaps it most, by code, so changing an entry's code set does not drop
 * what was typed. Accepting the list does not carry over.
 */
export function withDefaultLabels(
  labels: Readonly<DictionaryProposalLabels>,
  codeLists: readonly DictionaryProposalCodeList[],
): DictionaryProposalLabels {
  const currentKeys = new Set(
    codeLists.map((list) => {
      return list.key;
    }),
  );
  const defaults = codeLists.map((list) => {
    const current = labels[list.key];
    const previous = current
      ? undefined
      : _findPreviousListLabels(labels, list, currentKeys);
    const values = Object.fromEntries(
      list.values.map((item) => {
        const key = ColumnProfile.normalizeValue(item.value);
        return [
          key,
          current?.values[key] ??
            previous?.values[key] ??
            _makeDefaultLabel(item.value),
        ];
      }),
    );
    return [list.key, { values, isAccepted: current?.isAccepted ?? false }];
  });
  return { ...labels, ...Object.fromEntries(defaults) };
}

/** The label of one value of one code list, if it has one. */
export function getValueLabel(
  labels: Readonly<DictionaryProposalLabels>,
  options: Readonly<ValueRef>,
): DictionaryProposalValueLabel | undefined {
  return labels[options.codeListKey]?.values[
    ColumnProfile.normalizeValue(options.code)
  ];
}

function _updateValue(
  labels: Readonly<DictionaryProposalLabels>,
  options: Readonly<
    ValueRef & {
      change: (
        current: DictionaryProposalValueLabel,
      ) => DictionaryProposalValueLabel;
    }
  >,
): DictionaryProposalLabels {
  const list = labels[options.codeListKey];
  const key = ColumnProfile.normalizeValue(options.code);
  const current = list?.values[key];
  if (!list || !current) {
    return { ...labels };
  }
  const values = { ...list.values, [key]: options.change(current) };
  return { ...labels, [options.codeListKey]: { ...list, values } };
}

/** The labels with one value's label typed by the user. */
export function setValueLabel(
  labels: Readonly<DictionaryProposalLabels>,
  options: Readonly<ValueRef & { label: string }>,
): DictionaryProposalLabels {
  return _updateValue(labels, {
    ...options,
    change: (current) => {
      return { ...current, label: options.label, source: "typed" };
    },
  });
}

/** The labels with one value marked, or unmarked, as a missing answer. */
export function setValueMissing(
  labels: Readonly<DictionaryProposalLabels>,
  options: Readonly<ValueRef & { isMissing: boolean }>,
): DictionaryProposalLabels {
  return _updateValue(labels, {
    ...options,
    change: (current) => {
      return { ...current, isMissing: options.isMissing };
    },
  });
}

/**
 * The labels with the suggestion model's labels filled in. A label the
 * user typed is never replaced, and a value the list does not hold is
 * ignored.
 */
export function applyLabelSuggestions(
  labels: Readonly<DictionaryProposalLabels>,
  options: Readonly<{
    codeListKey: string;
    suggestions: DictionaryProposalLabelSuggestions;
  }>,
): DictionaryProposalLabels {
  return options.suggestions.labels.reduce(
    (current, suggestion) => {
      return _updateValue(current, {
        codeListKey: options.codeListKey,
        code: suggestion.value,
        change: (value) => {
          return value.source === "typed"
            ? value
            : {
                label: suggestion.label,
                isMissing: suggestion.isMissing,
                source: "suggested",
              };
        },
      });
    },
    { ...labels },
  );
}

/** The labels with one code list marked as checked by the user. */
export function acceptCodeList(
  labels: Readonly<DictionaryProposalLabels>,
  codeListKey: string,
): DictionaryProposalLabels {
  const list = labels[codeListKey];
  return list
    ? { ...labels, [codeListKey]: { ...list, isAccepted: true } }
    : { ...labels };
}

/**
 * How far a code list is. Labeled once the user accepted it, or when every
 * value came with a label from the data. Suggested while every value has a
 * label and some are unchecked suggestions. To do otherwise.
 */
export function getCodeListStatus(
  labels: Readonly<DictionaryProposalLabels>,
  codeList: Readonly<DictionaryProposalCodeList>,
): DictionaryProposalCodeListStatus {
  const list = labels[codeList.key];
  const values = codeList.values.map((item) => {
    return list?.values[ColumnProfile.normalizeValue(item.value)];
  });
  const isAllLabeled = values.every((value) => {
    return (value?.label.trim() ?? "") !== "";
  });
  const hasSuggestion = values.some((value) => {
    return value?.source === "suggested";
  });
  if (list?.isAccepted || (isAllLabeled && !hasSuggestion)) {
    return "labeled";
  }
  return isAllLabeled ? "suggested" : "to_do";
}

/** How many values have no label, and the names of the lists they are in. */
export function getUnlabeledValues(
  labels: Readonly<DictionaryProposalLabels>,
  codeLists: readonly DictionaryProposalCodeList[],
): { valueCount: number; codeListNames: string[] } {
  const counts = codeLists.map((list) => {
    const count = list.values.filter((item) => {
      const label = getValueLabel(labels, {
        codeListKey: list.key,
        code: item.value,
      });
      return (label?.label.trim() ?? "") === "";
    }).length;
    return { name: list.name, count };
  });
  const withUnlabeled = counts.filter((item) => {
    return item.count > 0;
  });
  return {
    valueCount: withUnlabeled.reduce((sum, item) => {
      return sum + item.count;
    }, 0),
    codeListNames: withUnlabeled.map((item) => {
      return item.name;
    }),
  };
}
