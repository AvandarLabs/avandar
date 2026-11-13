import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { SaveTarget } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";

/**
 * Why a linked dataset cannot be created from a dataset. `already_linked`:
 * the dataset is itself a linked dataset, whose conversions update live.
 */
export type LinkedUnavailableReason =
  | "not_admin"
  | "dataset_limit"
  | "already_linked";

/** Why a dataset cannot be changed in place. */
export type InPlaceUnavailableReason = "not_an_upload" | "has_linked_datasets";

/** Where an upload's data lives: synced to the workspace, or this device. */
export type UploadStorage = "synced" | "offline";

/** Where one dataset's conversions can be saved. */
export type ApplyTargets = {
  /** The dataset is itself a linked dataset: saving updates it live. */
  isLinkedDataset: boolean;
  linked:
    | { isAvailable: true }
    | { isAvailable: false; reason: LinkedUnavailableReason };
  inPlace:
    | { isAvailable: true; storage: UploadStorage }
    | { isAvailable: false; reason: "not_an_upload"; storage: undefined }
    | {
        isAvailable: false;
        reason: "has_linked_datasets";
        storage: UploadStorage;
        /** The first linked dataset reading this one, once its name loads. */
        linkedDatasetName: string | undefined;
      };
  /** The dataset already holds conversions pinned in place. */
  isAlreadyConvertedInPlace: boolean;
};

const UPLOAD_SOURCE_TYPES: ReadonlySet<DatasetSource.SourceType> = new Set([
  "csv_file",
  "xlsx_file",
  "pdf_file",
]);

function _getLinked(
  options: Readonly<{
    canCreateDatasets: boolean;
    isUnderDatasetLimit: boolean;
  }>,
): ApplyTargets["linked"] {
  if (!options.canCreateDatasets) {
    return { isAvailable: false, reason: "not_admin" };
  }
  return options.isUnderDatasetLimit
    ? { isAvailable: true }
    : { isAvailable: false, reason: "dataset_limit" };
}

function _getInPlace(
  options: Readonly<{
    sourceType: DatasetSource.SourceType;
    isInCloudStorage: boolean | undefined;
    hasLinkedDatasets: boolean;
    linkedDatasetName: string | undefined;
  }>,
): ApplyTargets["inPlace"] {
  if (!UPLOAD_SOURCE_TYPES.has(options.sourceType)) {
    return { isAvailable: false, reason: "not_an_upload", storage: undefined };
  }
  const storage = options.isInCloudStorage === false ? "offline" : "synced";
  return options.hasLinkedDatasets
    ? {
        isAvailable: false,
        reason: "has_linked_datasets",
        storage,
        linkedDatasetName: options.linkedDatasetName,
      }
    : { isAvailable: true, storage };
}

/**
 * Where a dataset's conversions can go: a new linked dataset (workspace
 * admins under the dataset limit), the dataset itself (uploads that no
 * linked dataset reads, naming `linkedDatasetName` when one does), or, for
 * a linked dataset, its own live conversions.
 */
export function getApplyTargets(
  options: Readonly<{
    sourceType: DatasetSource.SourceType;
    linkedSourceDatasetId: Dataset.Id | undefined;
    isInCloudStorage: boolean | undefined;
    canCreateDatasets: boolean;
    isUnderDatasetLimit: boolean;
    hasLinkedDatasets: boolean;
    linkedDatasetName: string | undefined;
    existingBindings: readonly DictionaryBinding.T[];
  }>,
): ApplyTargets {
  const isLinkedDataset = options.linkedSourceDatasetId !== undefined;
  return {
    isLinkedDataset,
    linked: isLinkedDataset
      ? { isAvailable: false, reason: "already_linked" }
      : _getLinked(options),
    inPlace: _getInPlace(options),
    isAlreadyConvertedInPlace:
      !isLinkedDataset &&
      options.existingBindings.some((binding) => {
        return binding.mode === "convert" && binding.pinnedPairs !== undefined;
      }),
  };
}

/** Whether any column of the dataset can be converted at all. */
export function canConvert(targets: Readonly<ApplyTargets>): boolean {
  return (
    targets.isLinkedDataset ||
    targets.linked.isAvailable ||
    targets.inPlace.isAvailable
  );
}

/**
 * The mode a coded column starts in: converting for uploads and linked
 * datasets that can be converted, reference for everything else.
 */
export function getDefaultMode(
  targets: Readonly<ApplyTargets>,
  sourceType: DatasetSource.SourceType,
): DictionaryBinding.Mode {
  const isConvertingByDefault =
    targets.isLinkedDataset || UPLOAD_SOURCE_TYPES.has(sourceType);
  return isConvertingByDefault && canConvert(targets) ? "convert" : "reference";
}

/**
 * The card the Save step opens with: Change for a dataset already
 * converted in place, else a new linked dataset when one can be created,
 * else Change. A linked dataset has no cards, so it has no target.
 */
export function getDefaultSaveTarget(
  targets: Readonly<ApplyTargets>,
): SaveTarget | undefined {
  if (targets.isLinkedDataset) {
    return undefined;
  }
  if (targets.isAlreadyConvertedInPlace && targets.inPlace.isAvailable) {
    return "in_place";
  }
  if (targets.linked.isAvailable) {
    return "linked";
  }
  return targets.inPlace.isAvailable ? "in_place" : undefined;
}
