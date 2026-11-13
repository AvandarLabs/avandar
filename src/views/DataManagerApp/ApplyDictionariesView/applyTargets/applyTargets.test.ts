import { describe, expect, it } from "vitest";
import {
  canConvert,
  getApplyTargets,
  getDefaultMode,
  getDefaultSaveTarget,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyTargets/applyTargets";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const BASE = {
  sourceType: "csv_file",
  linkedSourceDatasetId: undefined,
  isInCloudStorage: true,
  canCreateDatasets: true,
  isUnderDatasetLimit: true,
  hasLinkedDatasets: false,
  existingBindings: [] as DictionaryBinding.T[],
} as const;

describe("applyTargets", () => {
  it("offers a linked dataset to an admin and starts an upload converting", () => {
    const targets = getApplyTargets(BASE);

    expect(targets.linked).toEqual({ isAvailable: true });
    expect(targets.inPlace).toEqual({ isAvailable: true, storage: "synced" });
    expect(canConvert(targets)).toBe(true);
    expect(getDefaultMode(targets, "csv_file")).toBe("convert");
    expect(getDefaultSaveTarget(targets)).toBe("linked");
  });

  it("starts a live connection as reference, with a linked dataset to convert into", () => {
    const targets = getApplyTargets({ ...BASE, sourceType: "google_sheets" });

    expect(targets.inPlace).toMatchObject({
      isAvailable: false,
      reason: "not_an_upload",
    });
    expect(getDefaultMode(targets, "google_sheets")).toBe("reference");
    expect(getDefaultSaveTarget(targets)).toBe("linked");
  });

  it("says why someone who cannot add datasets cannot link", () => {
    expect(
      getApplyTargets({ ...BASE, canCreateDatasets: false }).linked,
    ).toEqual({
      isAvailable: false,
      reason: "not_admin",
    });
    expect(
      getApplyTargets({ ...BASE, isUnderDatasetLimit: false }).linked,
    ).toEqual({
      isAvailable: false,
      reason: "dataset_limit",
    });
  });

  it("converts nothing when no target is available", () => {
    const targets = getApplyTargets({ ...BASE, canCreateDatasets: false });

    expect(canConvert(targets)).toBe(false);
    expect(getDefaultMode(targets, "csv_file")).toBe("reference");
    expect(getDefaultSaveTarget(targets)).toBeUndefined();
  });

  it("updates a linked dataset's own conversions, with no target to choose", () => {
    const targets = getApplyTargets({
      ...BASE,
      sourceType: "virtual",
      linkedSourceDatasetId: "source-1" as Dataset.Id,
      canCreateDatasets: false,
    });

    expect(targets.isLinkedDataset).toBe(true);
    expect(canConvert(targets)).toBe(true);
    expect(getDefaultMode(targets, "virtual")).toBe("convert");
    expect(getDefaultSaveTarget(targets)).toBeUndefined();
  });

  it("keeps an offline upload's storage and refuses one a linked dataset reads", () => {
    expect(
      getApplyTargets({ ...BASE, isInCloudStorage: false }).inPlace,
    ).toEqual({
      isAvailable: true,
      storage: "offline",
    });
    expect(
      getApplyTargets({ ...BASE, hasLinkedDatasets: true }).inPlace,
    ).toEqual({
      isAvailable: false,
      reason: "has_linked_datasets",
      storage: "synced",
    });
  });

  it("knows an upload already converted in place", () => {
    const pinned = {
      mode: "convert",
      pinnedPairs: [],
    } as unknown as DictionaryBinding.T;

    expect(
      getApplyTargets({ ...BASE, existingBindings: [pinned] })
        .isAlreadyConvertedInPlace,
    ).toBe(true);
  });
});
