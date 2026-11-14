import { useRef, useState } from "react";
import { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import { useIsMounted } from "@/lib/hooks/state/useIsMounted";
import { isCrosswalkDirty } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReferenceColumnBinding } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";
import type { CrosswalkCatalog } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkCatalog/useCrosswalkCatalog";
import type { CrosswalkFlow } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkFlow/useCrosswalkFlow";

/** What Next on the Choose datasets step needs, and the action itself. */
export type SeedColumns = {
  /**
   * False while seeding cannot run yet: the catalog is loading or the
   * reference has no dataset.
   */
  isReady: boolean;
  isWorking: boolean;
  /** Seeds the columns when there are none, saves, and opens step 2. */
  continueToMapping: () => Promise<void>;
};

type SeedOptions = Readonly<{ flow: CrosswalkFlow; catalog: CrosswalkCatalog }>;

/**
 * The reference dataset's bindings by the name of the column each one
 * binds, as `columns_seeded` reads them. The crosswalk reads the dataset's
 * view, so `holdsLabels` is true for a reference binding that encodes (the
 * column holds labels) and for a convert binding that decodes (the view
 * shows labels). A binding whose entry was deleted, or whose column the
 * catalog no longer has, is skipped.
 */
export function buildReferenceBindings(
  options: Readonly<{
    bindings: readonly DictionaryBinding.T[];
    /** Every dataset column's name, by its id. */
    columnNameById: ReadonlyMap<string, string>;
  }>,
): Map<string, ReferenceColumnBinding> {
  return new Map(
    options.bindings.flatMap((binding) => {
      const columnName = options.columnNameById.get(binding.datasetColumnId);
      if (!columnName || !binding.entryId) {
        return [];
      }
      const holdsLabels =
        binding.mode === "reference"
          ? binding.direction === "encode"
          : binding.direction === "decode";
      return [
        [
          columnName,
          {
            entryId: binding.entryId,
            codeListId: binding.codeListId,
            holdsLabels,
          },
        ] as const,
      ];
    }),
  );
}

/**
 * The layout step 2 opens on: the first layout that is not the reference
 * and is still To do or Review, otherwise the reference layout.
 */
export function getFirstLayoutToMap(
  draft: CrosswalkDraft.T,
): CrosswalkLayout.Id | undefined {
  const toMap = draft.layouts.find((layout) => {
    return (
      !layout.isReference &&
      (layout.status === "to_do" || layout.status === "review")
    );
  });
  return (toMap ?? CrosswalkDraft.getReferenceLayout(draft))?.id;
}

/**
 * Saves what Next needs saved. With no columns it seeds them from the
 * reference dataset through `dispatchAndSave`, so the draft saved is the
 * one the reducer produced (for a new crosswalk this is its first save).
 * With columns it saves the draft when it changed. Resolves whether the
 * crosswalk is saved.
 */
function _saveForMapping(
  options: SeedOptions,
  referenceDatasetId: Dataset.Id | undefined,
): Promise<boolean> {
  const { flow, catalog } = options;
  if (flow.state.draft.columns.length === 0) {
    const bindings = referenceDatasetId
      ? (catalog.bindingsByDatasetId.get(referenceDatasetId) ?? [])
      : [];
    return flow.dispatchAndSave({
      type: "columns_seeded",
      bindingsByColumnName: buildReferenceBindings({
        bindings,
        columnNameById: catalog.columnNameById,
      }),
      context: catalog.context,
    });
  }
  return isCrosswalkDirty(flow.state)
    ? flow.save(flow.state.draft)
    : Promise.resolve(true);
}

/**
 * Next on the Choose datasets step. The first time, the combined dataset's
 * columns are seeded from the reference dataset: one per column, named and
 * typed as there, governed where the reference column has a binding. Then
 * it opens step 2 on the first layout to map, but only when the save
 * resolved true; `goToStep` moves a crosswalk saved for the first time to
 * its own URL. A second press while the first is working does nothing.
 */
export function useSeedColumns(options: SeedOptions): SeedColumns {
  const { flow, catalog } = options;
  const [isWorking, setIsWorking] = useState(false);
  const isWorkingRef = useRef(false);
  const isMountedRef = useIsMounted();
  const { draft } = flow.state;
  const referenceDatasetId =
    CrosswalkDraft.getReferenceLayout(draft)?.datasetIds[0];
  const isReady =
    draft.columns.length > 0 ||
    (!catalog.isLoading && referenceDatasetId !== undefined);
  const continueToMapping = async (): Promise<void> => {
    if (isWorkingRef.current || !isReady) {
      return;
    }
    isWorkingRef.current = true;
    setIsWorking(true);
    const layoutId = getFirstLayoutToMap(draft);
    const isSaved = await _saveForMapping(options, referenceDatasetId);
    isWorkingRef.current = false;
    if (!isMountedRef.current) {
      return;
    }
    setIsWorking(false);
    if (isSaved) {
      flow.goToStep("map", layoutId);
    }
  };
  return { isReady, isWorking, continueToMapping };
}
