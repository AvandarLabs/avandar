import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";

type Layouts = Pick<CrosswalkDraft.T, "layouts">;

function _isToMap(layout: CrosswalkDraft.Layout): boolean {
  return layout.status === "to_do" || layout.status === "review";
}

/**
 * The layout step 2 shows: the one the search names when the draft has it,
 * otherwise the first layout that is To do or Review, otherwise the
 * reference layout, otherwise the first one.
 */
export function chooseShownLayout(
  draft: Layouts,
  layoutId: string | undefined,
): CrosswalkDraft.Layout | undefined {
  const named = draft.layouts.find((layout) => {
    return layout.id === layoutId;
  });
  const reference = draft.layouts.find((layout) => {
    return layout.isReference;
  });
  return named ?? draft.layouts.find(_isToMap) ?? reference ?? draft.layouts[0];
}

/**
 * The layout to map after `afterLayoutId`: the first one after it, wrapping
 * around, that is To do or Review, never `afterLayoutId` itself. Undefined
 * when none is left, which sends the user to step 3.
 */
export function findNextLayoutToMap(
  draft: Layouts,
  afterLayoutId: CrosswalkLayout.Id,
): CrosswalkLayout.Id | undefined {
  const index = draft.layouts.findIndex((layout) => {
    return layout.id === afterLayoutId;
  });
  const ordered = [
    ...draft.layouts.slice(index + 1),
    ...draft.layouts.slice(0, Math.max(index, 0)),
  ];
  return ordered.find(_isToMap)?.id;
}

/**
 * The column the side pane shows: the chosen one while it still exists,
 * otherwise the first column whose fill in this layout is missing or a
 * suggestion, otherwise the first column.
 */
export function chooseSelectedColumnId(
  draft: Pick<CrosswalkDraft.T, "columns" | "mappings">,
  layoutId: CrosswalkLayout.Id,
  chosenColumnId: CrosswalkColumn.Id | undefined,
): CrosswalkColumn.Id | undefined {
  const isChosenPresent = draft.columns.some((column) => {
    return column.id === chosenColumnId;
  });
  if (isChosenPresent) {
    return chosenColumnId;
  }
  const layoutMappings = draft.mappings[layoutId] ?? {};
  const needingAttention = draft.columns.find((column) => {
    const mapping = layoutMappings[column.id];
    return !mapping || mapping.status === "suggested";
  });
  return (needingAttention ?? draft.columns[0])?.id;
}

/** Whether a layout still has a suggested fill, for Accept all suggestions. */
export function hasSuggestions(
  draft: Pick<CrosswalkDraft.T, "mappings">,
  layoutId: CrosswalkLayout.Id,
): boolean {
  return Object.values(draft.mappings[layoutId] ?? {}).some((mapping) => {
    return mapping.status === "suggested";
  });
}
