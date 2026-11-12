import { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import { getCodingsFromProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/getCodingsFromProposal/getCodingsFromProposal.ts";
import { makeDraftFromProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/makeDraftFromProposal/makeDraftFromProposal.ts";
import {
  getStrongerSuggestionReason,
  makeProposalFromColumnProfiles,
} from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/makeProposalFromColumnProfiles/makeProposalFromColumnProfiles.ts";
import {
  acceptCodeList,
  applyLabelSuggestions,
  getCodeListStatus,
  getUnlabeledValues,
  getValueLabel,
  setValueLabel,
  setValueMissing,
  withDefaultLabels,
} from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/proposalLabelHelpers/proposalLabelHelpers.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type {
  DictionaryProposalEntry,
  DictionaryProposalEntryNameIssue,
  DictionaryProposalMeaningMatch,
  DictionaryProposalT,
} from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal.types.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";

type EntryRef = { entryKey: string };

function _changeEntry(
  proposal: Readonly<DictionaryProposalT>,
  options: Readonly<
    EntryRef & {
      change: (entry: DictionaryProposalEntry) => DictionaryProposalEntry;
    }
  >,
): DictionaryProposalT {
  return {
    entries: proposal.entries.map((entry) => {
      return entry.key === options.entryKey ? options.change(entry) : entry;
    }),
  };
}

function getColumns(
  entry: Readonly<DictionaryProposalEntry>,
): ColumnProfile.T[] {
  return [...entry.columns, ...entry.suggestedColumns];
}

function getColumnNames(entry: Readonly<DictionaryProposalEntry>): string[] {
  return [
    ...new Set(
      getColumns(entry).map((column) => {
        return column.columnName;
      }),
    ),
  ];
}

function getColumnSources(
  entry: Readonly<DictionaryProposalEntry>,
): Array<{ columnName: string; datasetNames: string[] }> {
  const sources = new Map<string, string[]>();
  getColumns(entry).forEach((column) => {
    const datasetNames = sources.get(column.columnName) ?? [];
    sources.set(column.columnName, [...datasetNames, column.datasetName]);
  });
  return [...sources.entries()].map(([columnName, datasetNames]) => {
    return { columnName, datasetNames };
  });
}

function getDatasetIds(proposal: Readonly<DictionaryProposalT>): Dataset.Id[] {
  const datasetIds = proposal.entries.flatMap((entry) => {
    return getColumns(entry).map((column) => {
      return column.datasetId;
    });
  });
  return [...new Set(datasetIds)];
}

function getValuesSeen(
  entry: Readonly<DictionaryProposalEntry>,
): ColumnProfile.Value[] {
  const values = new Map<string, ColumnProfile.Value>();
  getColumns(entry).forEach((column) => {
    (column.values ?? []).forEach((item) => {
      const key = ColumnProfile.getComparisonKey(item.value);
      const current = values.get(key);
      values.set(key, {
        value: current?.value ?? item.value.trim(),
        rowCount: (current?.rowCount ?? 0) + item.rowCount,
      });
    });
  });
  return [...values.values()].sort((itemA, itemB) => {
    return itemB.rowCount - itemA.rowCount;
  });
}

function getNumberRange(
  entry: Readonly<DictionaryProposalEntry>,
): { min: number; max: number } | undefined {
  const ranges = getColumns(entry).flatMap((column) => {
    return column.numberRange ? [column.numberRange] : [];
  });
  if (ranges.length === 0) {
    return undefined;
  }
  return {
    min: Math.min(
      ...ranges.map((range) => {
        return range.min;
      }),
    ),
    max: Math.max(
      ...ranges.map((range) => {
        return range.max;
      }),
    ),
  };
}

function renameEntry(
  proposal: Readonly<DictionaryProposalT>,
  options: Readonly<EntryRef & { name: string }>,
): DictionaryProposalT {
  return _changeEntry(proposal, {
    entryKey: options.entryKey,
    change: (entry) => {
      return { ...entry, name: options.name };
    },
  });
}

function getEntryNameIssues(
  proposal: Readonly<DictionaryProposalT>,
): Map<string, DictionaryProposalEntryNameIssue> {
  const included = proposal.entries.filter((entry) => {
    return entry.isIncluded;
  });
  const counts = new Map<string, number>();
  included.forEach((entry) => {
    const key = ColumnProfile.normalizeValue(entry.name);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  const issues = included.flatMap(
    (entry): Array<[string, DictionaryProposalEntryNameIssue]> => {
      const key = ColumnProfile.normalizeValue(entry.name);
      if (key === "") {
        return [[entry.key, "name_required"]];
      }
      return (counts.get(key) ?? 0) > 1 ? [[entry.key, "name_not_unique"]] : [];
    },
  );
  return new Map(issues);
}

function setEntryKind(
  proposal: Readonly<DictionaryProposalT>,
  options: Readonly<EntryRef & { kind: DataDictionaryEntry.Kind }>,
): DictionaryProposalT {
  return _changeEntry(proposal, {
    entryKey: options.entryKey,
    change: (entry) => {
      return { ...entry, kind: options.kind };
    },
  });
}

function setEntryIncluded(
  proposal: Readonly<DictionaryProposalT>,
  options: Readonly<EntryRef & { isIncluded: boolean }>,
): DictionaryProposalT {
  return _changeEntry(proposal, {
    entryKey: options.entryKey,
    change: (entry) => {
      return { ...entry, isIncluded: options.isIncluded };
    },
  });
}

function setEntryDescription(
  proposal: Readonly<DictionaryProposalT>,
  options: Readonly<EntryRef & { description: string }>,
): DictionaryProposalT {
  return _changeEntry(proposal, {
    entryKey: options.entryKey,
    change: (entry) => {
      return {
        ...entry,
        description: options.description,
        isDescriptionSuggested: false,
      };
    },
  });
}

function suggestEntryDescription(
  proposal: Readonly<DictionaryProposalT>,
  options: Readonly<EntryRef & { description: string }>,
): DictionaryProposalT {
  return _changeEntry(proposal, {
    entryKey: options.entryKey,
    change: (entry) => {
      const isReplaceable =
        entry.description.trim() === "" || entry.isDescriptionSuggested;
      return isReplaceable
        ? {
            ...entry,
            description: options.description,
            isDescriptionSuggested: true,
          }
        : entry;
    },
  });
}

function keepApart(
  proposal: Readonly<DictionaryProposalT>,
  entryKey: string,
): DictionaryProposalT {
  const entry = proposal.entries.find((current) => {
    return current.key === entryKey;
  });
  if (!entry || entry.suggestedColumns.length === 0) {
    return { entries: [...proposal.entries] };
  }
  const takenNames = proposal.entries.map((current) => {
    return current.name;
  });
  const split = makeProposalFromColumnProfiles(entry.suggestedColumns, {
    takenNames,
  }).entries;
  const kept = { ...entry, suggestedColumns: [], suggestionReason: undefined };
  return {
    entries: proposal.entries.flatMap((current) => {
      return current.key === entryKey ? [kept, ...split] : [current];
    }),
  };
}

function _findEntryByName(
  proposal: Readonly<DictionaryProposalT>,
  name: string,
): DictionaryProposalEntry | undefined {
  const key = ColumnProfile.normalizeValue(name);
  return proposal.entries.find((entry) => {
    return ColumnProfile.normalizeValue(entry.name) === key;
  });
}

function _sharesDataset(
  entryA: Readonly<DictionaryProposalEntry>,
  entryB: Readonly<DictionaryProposalEntry>,
): boolean {
  const datasetIds = new Set(
    getColumns(entryA).map((column) => {
      return column.datasetId;
    }),
  );
  return getColumns(entryB).some((column) => {
    return datasetIds.has(column.datasetId);
  });
}

function _applyMeaningMatch(
  proposal: DictionaryProposalT,
  match: Readonly<DictionaryProposalMeaningMatch>,
): DictionaryProposalT {
  const source = _findEntryByName(proposal, match.name);
  const target = _findEntryByName(proposal, match.sameAs);
  if (!source || !target || source.key === target.key) {
    return proposal;
  }
  // Two columns of one dataset are two different things, whatever a model says.
  if (_sharesDataset(source, target)) {
    return proposal;
  }
  const merged: DictionaryProposalEntry = {
    ...target,
    suggestedColumns: [...target.suggestedColumns, ...getColumns(source)],
    suggestionReason: getStrongerSuggestionReason([
      target.suggestionReason,
      source.suggestionReason,
      "meaning",
    ]),
  };
  return {
    entries: proposal.entries
      .filter((entry) => {
        return entry.key !== source.key;
      })
      .map((entry) => {
        return entry.key === target.key ? merged : entry;
      }),
  };
}

function applyMeaningMatches(
  proposal: Readonly<DictionaryProposalT>,
  matches: readonly DictionaryProposalMeaningMatch[],
): DictionaryProposalT {
  return matches.reduce(_applyMeaningMatch, { entries: [...proposal.entries] });
}

/**
 * Learning a dictionary from datasets, as pure functions: grouping profiled
 * columns into proposed entries, the edits the create flow makes to them,
 * the code lists and labels they would save, and the draft the save RPC
 * takes. The create flow's reducer calls these. Nothing here reads data or
 * calls a model.
 */
export const DictionaryProposalModule = {
  /** Groups profiled columns from the picked datasets into proposed entries. */
  fromColumnProfiles: makeProposalFromColumnProfiles,

  /** The code lists a proposal would save, and each entry's, primary first. */
  getCodings: getCodingsFromProposal,

  /** The dictionary draft a proposal saves, for `buildSavePayload`. */
  toDraft: makeDraftFromProposal,

  /** An entry's certain columns, then its guessed ones. */
  getColumns,

  /** An entry's column names, each once, in the order they were read. */
  getColumnNames,

  /** Each of an entry's column names with the datasets it comes from. */
  getColumnSources,

  /** Every dataset a proposal was learned from, each once. */
  getDatasetIds,

  /** An entry's listed values across its columns, most rows first. */
  getValuesSeen,

  /** The lowest and highest value across an entry's number columns. */
  getNumberRange,

  /** The proposal with one entry renamed, exactly as typed. */
  renameEntry,

  /**
   * Each included entry whose name the save RPC would refuse: blank, or the
   * same as another included entry's ignoring case and spaces, by key.
   */
  getEntryNameIssues,

  /** The proposal with one entry's kind changed. */
  setEntryKind,

  /** The proposal with one entry included in, or left out of, the save. */
  setEntryIncluded,

  /** The proposal with one entry's description typed by the user. */
  setEntryDescription,

  /** The proposal with a suggested description, unless one was typed. */
  suggestEntryDescription,

  /** The proposal with an entry's guessed columns split into entries. */
  keepApart,

  /**
   * The proposal with the model's meaning matches joined as guesses. A
   * match naming an unknown entry, or joining two columns of one dataset,
   * is ignored.
   */
  applyMeaningMatches,

  /** The labels with an entry for every value of every code list. */
  withDefaultLabels,

  /** The label of one value of one code list. */
  getValueLabel,

  /** The labels with one value's label typed by the user. */
  setValueLabel,

  /** The labels with one value marked as a missing answer, or not. */
  setValueMissing,

  /** The labels with the model's suggestions filled in, never over typing. */
  applyLabelSuggestions,

  /** The labels with one code list accepted by the user. */
  acceptCodeList,

  /** Whether a code list is Labeled, Suggested, or To do. */
  getCodeListStatus,

  /** How many values have no label, and in which lists. */
  getUnlabeledValues,
};
