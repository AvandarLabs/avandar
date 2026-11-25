import { prop } from "@avandar/utils";
import { uuid } from "$/lib/uuid.ts";
import { getCodingsFromProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/getCodingsFromProposal/getCodingsFromProposal.ts";
import { getValueLabel } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/proposalLabelHelpers/proposalLabelHelpers.ts";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary.ts";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type {
  DictionaryProposalCodeList,
  DictionaryProposalEntry,
  DictionaryProposalLabels,
  DictionaryProposalT,
} from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal.types.ts";

/** Coded entries, then scales, then description-only, as Review shows them. */
const SECTION_ORDER: Record<DataDictionaryEntry.Kind, number> = {
  categorical: 0,
  ordered: 1,
  identifier: 2,
  date: 2,
  number: 2,
  text: 2,
};

function _makeCodeListDraft(
  options: Readonly<{
    codeList: DictionaryProposalCodeList;
    id: DataDictionaryCodeList.Id;
    labels: DictionaryProposalLabels;
  }>,
): DataDictionary.CodeListDraft {
  const { codeList, id, labels } = options;
  const pairs = codeList.values.map((item) => {
    const label = getValueLabel(labels, {
      codeListKey: codeList.key,
      code: item.value,
    });
    // A value with no label is saved with a blank one, and the dictionary
    // marks it as needing a label.
    return {
      code: item.value,
      label: label?.label.trim() ?? "",
      acceptedSpellings: [],
      isMissing: label?.isMissing ?? false,
    };
  });
  return { id, name: codeList.name, isOrdered: codeList.isOrdered, pairs };
}

function _getOtherColumnNames(
  entry: Readonly<DictionaryProposalEntry>,
): string[] {
  const seen = new Set([entry.name.trim().toLowerCase()]);
  return [...entry.columns, ...entry.suggestedColumns]
    .map(prop("columnName"))
    .filter((name) => {
      const key = name.trim().toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function _makeEntryDraft(
  options: Readonly<{
    entry: DictionaryProposalEntry;
    codeListIds: readonly DataDictionaryCodeList.Id[];
  }>,
): DataDictionary.EntryDraft {
  const { entry, codeListIds } = options;
  return {
    id: uuid<DataDictionaryEntry.Id>(),
    name: entry.name,
    columnNames: _getOtherColumnNames(entry),
    kind: entry.kind,
    unit: "",
    validMin: undefined,
    validMax: undefined,
    description: entry.description,
    codings: codeListIds.map((codeListId, index) => {
      return { codeListId, isPrimary: index === 0 };
    }),
  };
}

/**
 * The dictionary contents a proposal saves: its included entries (coded
 * first, then scales, then description-only), each entry's other column
 * names, its code lists with the labels given, and fresh ids for all of
 * them. `DataDictionary.buildSavePayload` turns it into the save RPC's
 * arguments, exactly like a draft edited on the Dictionary view.
 */
export function makeDraftFromProposal(
  options: Readonly<{
    proposal: DictionaryProposalT;
    labels: DictionaryProposalLabels;
  }>,
): DataDictionary.Draft {
  const { codeLists, codeListKeysByEntryKey } = getCodingsFromProposal(
    options.proposal,
  );
  const idsByKey = new Map(
    codeLists.map((codeList) => {
      return [codeList.key, uuid<DataDictionaryCodeList.Id>()];
    }),
  );
  const idsFor = (keys: readonly string[]): DataDictionaryCodeList.Id[] => {
    return keys.flatMap((key) => {
      const id = idsByKey.get(key);
      return id ? [id] : [];
    });
  };
  const entries = options.proposal.entries
    .filter(prop("isIncluded"))
    .sort((entryA, entryB) => {
      return SECTION_ORDER[entryA.kind] - SECTION_ORDER[entryB.kind];
    });
  return {
    codeLists: codeLists.flatMap((codeList) => {
      const id = idsByKey.get(codeList.key);
      return id
        ? [_makeCodeListDraft({ codeList, id, labels: options.labels })]
        : [];
    }),
    entries: entries.map((entry) => {
      const codeListIds = idsFor(codeListKeysByEntryKey[entry.key] ?? []);
      return _makeEntryDraft({ entry, codeListIds });
    }),
  };
}
