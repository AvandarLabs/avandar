import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";

/** What a layout is called, as data a component translates. */
export type LayoutLabel = {
  /**
   * The name of the layout's first dataset by name. Undefined when the
   * layout holds no dataset, which only the reference layout can. Empty
   * while the catalog that names it is still loading.
   */
  firstDatasetName: string | undefined;
  /** How many other datasets share the layout. */
  otherDatasetCount: number;
};

/**
 * A layout has no name of its own: it is called after its first dataset,
 * with a count of the other datasets that share its columns.
 */
export function getLayoutLabel(
  layout: Pick<CrosswalkDraft.Layout, "datasetIds">,
  datasetsById: ReadonlyMap<string, CrosswalkLayout.Dataset>,
): LayoutLabel {
  const [firstDatasetId] = layout.datasetIds;
  return {
    firstDatasetName: firstDatasetId
      ? (datasetsById.get(firstDatasetId)?.name ?? "")
      : undefined,
    otherDatasetCount: Math.max(layout.datasetIds.length - 1, 0),
  };
}
