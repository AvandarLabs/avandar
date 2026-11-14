import { prop, where } from "@avandar/utils";
import { useMemo } from "react";
import { CrosswalkClient } from "@/clients/crosswalks/CrosswalkClient";
import { DataDictionaryCodeListClient } from "@/clients/dataDictionaries/DataDictionaryCodeListClient";
import { DictionaryBindingClient } from "@/clients/dataDictionaries/DictionaryBindingClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { isCrosswalkStale } from "@/lib/crosswalks/isCrosswalkStale/isCrosswalkStale";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/**
 * How a dictionary reaches a dataset's values: attached as reference,
 * converted as the dataset loads (a linked dataset), converted in place
 * with the version it was given, or translated by a crosswalk into its
 * combined dataset.
 */
export type DictionaryUsageHow =
  | "reference"
  | "linked"
  | "changed"
  | "crosswalk";

/** The crosswalk whose combined dataset a Used by row is. */
export type DictionaryUsageCrosswalk = {
  id: Crosswalk.Id;
  name: string;
};

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
  /**
   * For a crosswalk's combined dataset, whether a code list it embedded
   * changed since it was combined. Otherwise, whether the applied version
   * is older than the dictionary's.
   */
  isBehind: boolean;
  /** The crosswalk that combined this dataset, if one did. */
  crosswalk: DictionaryUsageCrosswalk | undefined;
};

/** The datasets a dictionary is applied to, sorted by name. */
export type DictionaryUsage = {
  dictionaryId: DataDictionary.Id;
  dictionaryName: string;
  rows: readonly DictionaryUsageRow[];
  /** The dictionary's version now. */
  currentVersion: number;
  isLoading: boolean;
  /**
   * True when the bindings, their datasets, or their crosswalks could not
   * be read.
   */
  hasError: boolean;
};

/** A combined dataset's crosswalk, and whether a list it embedded changed. */
type CrosswalkOutput = {
  crosswalk: DictionaryUsageCrosswalk;
  isStale: boolean;
};

const NO_COMPILED_CODE_LISTS: readonly Crosswalk.CompiledCodeList[] = [];

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
  options: Readonly<{
    dataset: Dataset.T;
    allBindings: readonly DictionaryBinding.T[];
    currentVersion: number;
    crosswalkOutput: CrosswalkOutput | undefined;
  }>,
): DictionaryUsageRow {
  const { dataset, crosswalkOutput } = options;
  const bindings = options.allBindings.filter((binding) => {
    return binding.datasetId === dataset.id;
  });
  const appliedVersion = crosswalkOutput
    ? undefined
    : _getAppliedVersion(bindings);
  return {
    datasetId: dataset.id,
    datasetName: dataset.name,
    sourceType: dataset.sourceType,
    entryCount: new Set(bindings.map(prop("entryId"))).size,
    howApplied: crosswalkOutput
      ? "crosswalk"
      : _getHowApplied(dataset, bindings),
    appliedVersion,
    isBehind: crosswalkOutput
      ? crosswalkOutput.isStale
      : appliedVersion !== undefined && appliedVersion < options.currentVersion,
    crosswalk: crosswalkOutput?.crosswalk,
  };
}

function _toCrosswalkOutputs(
  crosswalks: readonly Crosswalk.T[],
  codeLists: readonly DataDictionaryCodeList.T[] | undefined,
): Map<string, CrosswalkOutput> {
  return new Map(
    crosswalks.flatMap((crosswalk) => {
      if (crosswalk.outputDatasetId === undefined) {
        return [];
      }
      const isStale =
        codeLists !== undefined &&
        isCrosswalkStale({
          compiledCodeLists:
            crosswalk.compiledCodeLists ?? NO_COMPILED_CODE_LISTS,
          codeLists,
        });
      const output = {
        crosswalk: { id: crosswalk.id, name: crosswalk.name },
        isStale,
      };
      return [[crosswalk.outputDatasetId as string, output] as const];
    }),
  );
}

/**
 * The crosswalks whose combined datasets are among `datasetIds`, by
 * dataset id, each with whether a code list it embedded changed.
 */
function useCrosswalkOutputs(datasetIds: readonly Dataset.Id[]): {
  byDatasetId: ReadonlyMap<string, CrosswalkOutput>;
  isLoading: boolean;
  isError: boolean;
} {
  const hasDatasets = datasetIds.length > 0;
  const [crosswalks, isLoadingCrosswalks, crosswalksQuery] =
    CrosswalkClient.useGetAll({
      ...where("output_dataset_id", "in", datasetIds),
      useQueryOptions: { ...ALWAYS_REFETCH_ON_MOUNT, enabled: hasDatasets },
    });
  const codeListIds = useMemo(() => {
    const compiled = (crosswalks ?? []).flatMap((crosswalk) => {
      return crosswalk.compiledCodeLists ?? NO_COMPILED_CODE_LISTS;
    });
    return [...new Set(compiled.map(prop("codeListId")))];
  }, [crosswalks]);
  const [codeLists, isLoadingCodeLists] =
    DataDictionaryCodeListClient.useGetAll({
      ...where("id", "in", codeListIds),
      useQueryOptions: { enabled: codeListIds.length > 0 },
    });
  const byDatasetId = useMemo(() => {
    return _toCrosswalkOutputs(
      hasDatasets ? (crosswalks ?? []) : [],
      codeLists,
    );
  }, [hasDatasets, crosswalks, codeLists]);
  return {
    byDatasetId,
    isLoading: isLoadingCrosswalks || isLoadingCodeLists,
    isError: crosswalksQuery.isError,
  };
}

function _toSortedRows(
  options: Readonly<{
    datasets: readonly Dataset.T[];
    bindings: readonly DictionaryBinding.T[];
    currentVersion: number;
    crosswalkOutputs: ReadonlyMap<string, CrosswalkOutput>;
  }>,
): DictionaryUsageRow[] {
  return options.datasets
    .map((dataset) => {
      return _toRow({
        dataset,
        allBindings: options.bindings,
        currentVersion: options.currentVersion,
        crosswalkOutput: options.crosswalkOutputs.get(dataset.id),
      });
    })
    .sort((rowA, rowB) => {
      return rowA.datasetName.localeCompare(rowB.datasetName);
    });
}

/**
 * The datasets one dictionary is applied to, that the user can see, with
 * how each uses it and whether it is behind: a pinned conversion older
 * than the dictionary's current version, or a crosswalk's combined dataset
 * whose embedded code lists changed. A dataset the user cannot read is
 * never counted, because its bindings are hidden with it. Bindings and
 * crosswalks refetch on mount, so an apply or a combine made a moment ago
 * is listed. Used by the Dictionary view's header and Used by tab.
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
  const crosswalkOutputs = useCrosswalkOutputs(datasetIds);
  const rows = useMemo(() => {
    return _toSortedRows({
      datasets: datasetIds.length > 0 ? (datasets ?? []) : [],
      bindings: bindings ?? [],
      currentVersion,
      crosswalkOutputs: crosswalkOutputs.byDatasetId,
    });
  }, [
    bindings,
    datasets,
    datasetIds,
    currentVersion,
    crosswalkOutputs.byDatasetId,
  ]);
  return {
    dictionaryId,
    dictionaryName,
    rows,
    currentVersion,
    isLoading:
      isLoadingBindings || isLoadingDatasets || crosswalkOutputs.isLoading,
    hasError:
      bindingsQuery.isError ||
      datasetsQuery.isError ||
      crosswalkOutputs.isError,
  };
}
