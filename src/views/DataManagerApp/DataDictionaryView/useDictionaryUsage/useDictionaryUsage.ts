import { prop, where } from "@avandar/utils";
import { useMemo } from "react";
import { DictionaryBindingClient } from "@/clients/dataDictionaries/DictionaryBindingClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/**
 * How a dictionary reaches a dataset's values: attached as reference,
 * converted as the dataset loads (a linked dataset), or converted in place
 * with the version it was given.
 */
export type DictionaryUsageHow = "reference" | "linked" | "changed";

/** One dataset a dictionary is applied to, as the Used by tab lists it. */
export type DictionaryUsageRow = {
  datasetId: Dataset.Id;
  datasetName: string;
  sourceType: Dataset.T["sourceType"];
  /** How many of the dictionary's entries the dataset's columns use. */
  entryCount: number;
  howApplied: DictionaryUsageHow;
  /**
   * The oldest version a pinned conversion that can be re-applied was
   * given, or undefined when none is pinned.
   */
  appliedVersion: number | undefined;
  /** Whether that version is older than the dictionary's. */
  isBehind: boolean;
};

/** The datasets a dictionary is applied to, sorted by name. */
export type DictionaryUsage = {
  dictionaryId: DataDictionary.Id;
  dictionaryName: string;
  rows: readonly DictionaryUsageRow[];
  /** The dictionary's version now. */
  currentVersion: number;
  isLoading: boolean;
  /** True when the bindings or their datasets could not be read. */
  hasError: boolean;
};

function _getHowApplied(
  dataset: Dataset.T,
  bindings: readonly DictionaryBinding.T[],
): DictionaryUsageHow {
  const isConverted = bindings.some((binding) => {
    return binding.mode === "convert";
  });
  if (!isConverted) {
    return "reference";
  }
  return dataset.sourceType === "virtual" ? "linked" : "changed";
}

/** The oldest version a re-appliable pinned conversion was given. */
function _getAppliedVersion(
  bindings: readonly DictionaryBinding.T[],
): number | undefined {
  const versions = bindings
    .filter((binding) => {
      return (
        binding.mode === "convert" &&
        binding.pinnedPairs !== undefined &&
        binding.codeListId !== undefined
      );
    })
    .map(prop("appliedDictionaryVersion"));
  return versions.length === 0 ? undefined : Math.min(...versions);
}

function _toRow(
  dataset: Dataset.T,
  allBindings: readonly DictionaryBinding.T[],
  currentVersion: number,
): DictionaryUsageRow {
  const bindings = allBindings.filter((binding) => {
    return binding.datasetId === dataset.id;
  });
  const appliedVersion = _getAppliedVersion(bindings);
  return {
    datasetId: dataset.id,
    datasetName: dataset.name,
    sourceType: dataset.sourceType,
    entryCount: new Set(bindings.map(prop("entryId"))).size,
    howApplied: _getHowApplied(dataset, bindings),
    appliedVersion,
    isBehind: appliedVersion !== undefined && appliedVersion < currentVersion,
  };
}

/**
 * The datasets one dictionary is applied to, that the user can see, with
 * how each uses it and whether a pinned conversion is behind the
 * dictionary's current version. A dataset the user cannot read is never
 * counted, because its bindings are hidden with it. Bindings refetch on
 * mount, so an apply made a moment ago is listed. Used by the Dictionary
 * view's header and Used by tab.
 */
export function useDictionaryUsage(
  options: Readonly<{
    dictionaryId: DataDictionary.Id;
    dictionaryName: string;
    currentVersion: number;
  }>,
): DictionaryUsage {
  const { dictionaryId, dictionaryName, currentVersion } = options;
  const [bindings, isLoadingBindings, bindingsQuery] =
    DictionaryBindingClient.useGetAll({
      ...where("dictionary_id", "eq", dictionaryId),
      useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
    });
  const datasetIds = useMemo(() => {
    return [...new Set((bindings ?? []).map(prop("datasetId")))];
  }, [bindings]);
  const [datasets, isLoadingDatasets, datasetsQuery] = DatasetClient.useGetAll({
    ...where("id", "in", datasetIds),
    useQueryOptions: { enabled: datasetIds.length > 0 },
  });
  const rows = useMemo(() => {
    const readable = datasetIds.length > 0 ? (datasets ?? []) : [];
    return readable
      .map((dataset) => {
        return _toRow(dataset, bindings ?? [], currentVersion);
      })
      .sort((rowA, rowB) => {
        return rowA.datasetName.localeCompare(rowB.datasetName);
      });
  }, [bindings, datasets, datasetIds, currentVersion]);
  return {
    dictionaryId,
    dictionaryName,
    rows,
    currentVersion,
    isLoading: isLoadingBindings || isLoadingDatasets,
    hasError: bindingsQuery.isError || datasetsQuery.isError,
  };
}
