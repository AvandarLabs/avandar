import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { LinkedDataset } from "@/hooks/datasets/useLinkedDatasets/useLinkedDatasets";

/** One way a dictionary reaches a dataset, as the dataset's rail says it. */
export type DictionaryUseNote =
  | { kind: "reference" }
  | { kind: "converted_live" }
  | {
      kind: "converted_pinned";
      /** The oldest version any of the dataset's columns was given. */
      appliedVersion: number;
      /** Undefined once the dictionary is deleted. */
      currentVersion: number | undefined;
      /**
       * Whether a pinned column still has its code list, so Re-apply has
       * something to re-pin.
       */
      canReapply: boolean;
    }
  | { kind: "linked"; datasetId: string; datasetName: string };

/** One dictionary in a dataset's rail, with every way it is applied. */
export type DictionaryUse = {
  /** Empty for a deleted dictionary whose pinned conversions remain. */
  dictionaryId: string;
  dictionaryName: string;
  notes: readonly DictionaryUseNote[];
};

function _groupByDictionary(
  columnCodes: ReadonlyMap<string, ColumnCodes.T>,
): Map<string, ColumnCodes.T[]> {
  const byDictionary = new Map<string, ColumnCodes.T[]>();
  columnCodes.forEach((codes) => {
    const group = byDictionary.get(codes.dictionaryId) ?? [];
    byDictionary.set(codes.dictionaryId, [...group, codes]);
  });
  return byDictionary;
}

function _getPinnedNote(
  group: readonly ColumnCodes.T[],
): DictionaryUseNote | undefined {
  const pinned = group.filter((codes) => {
    return codes.mode === "convert" && codes.isPinned;
  });
  const [first] = pinned;
  if (!first) {
    return undefined;
  }
  const appliedVersion = Math.min(
    ...pinned.map((codes) => {
      return codes.appliedDictionaryVersion;
    }),
  );
  return {
    kind: "converted_pinned",
    appliedVersion,
    currentVersion: first.currentDictionaryVersion,
    canReapply: pinned.some((codes) => {
      return codes.codeListName !== undefined;
    }),
  };
}

function _getNotes(
  dictionaryId: string,
  group: readonly ColumnCodes.T[],
  linkedDatasets: readonly LinkedDataset[],
): DictionaryUseNote[] {
  const hasReference = group.some((codes) => {
    return codes.mode === "reference";
  });
  const isConvertedLive = group.some((codes) => {
    return codes.mode === "convert" && !codes.isPinned;
  });
  const pinnedNote = _getPinnedNote(group);
  const linkedNotes = linkedDatasets.flatMap((linkedDataset) => {
    return dictionaryId !== "" && linkedDataset.dictionaryIds.has(dictionaryId)
      ? [
          {
            kind: "linked" as const,
            datasetId: linkedDataset.id,
            datasetName: linkedDataset.name,
          },
        ]
      : [];
  });
  return [
    ...(hasReference ? [{ kind: "reference" as const }] : []),
    ...(isConvertedLive ? [{ kind: "converted_live" as const }] : []),
    ...(pinnedNote ? [pinnedNote] : []),
    ...linkedNotes,
  ];
}

/**
 * Every dictionary that reaches a dataset, with how: attached as
 * reference, converted as it loads (a linked dataset's own conversions),
 * converted in place with the oldest version its columns were given, and
 * each linked dataset that converts with it. Sorted by name, with a
 * deleted dictionary's pinned conversions last. Used by the dataset rail.
 */
export function describeDictionaryUses(
  columnCodes: ReadonlyMap<string, ColumnCodes.T>,
  linkedDatasets: readonly LinkedDataset[],
): DictionaryUse[] {
  return [..._groupByDictionary(columnCodes)]
    .map(([dictionaryId, group]) => {
      return {
        dictionaryId,
        dictionaryName: group[0]?.dictionaryName ?? "",
        notes: _getNotes(dictionaryId, group, linkedDatasets),
      };
    })
    .sort((useA, useB) => {
      if ((useA.dictionaryId === "") !== (useB.dictionaryId === "")) {
        return useA.dictionaryId === "" ? 1 : -1;
      }
      return useA.dictionaryName.localeCompare(useB.dictionaryName);
    });
}
