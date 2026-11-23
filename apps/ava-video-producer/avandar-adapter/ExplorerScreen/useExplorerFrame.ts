import { propEq } from "@avandar/utils";
import { useMemo } from "react";
import {
  EXPLORER_CASES,
  EXPLORER_DISTRICT_COUNTS,
} from "../Explorer.constants";
import { emptyFilter, ExplorerTimeline } from "./ExplorerTimeline";
import { getExplorerQuery } from "./getExplorerQuery";
import { useExplorerFilters } from "./useExplorerFilters";
import { useExplorerVideoTargets } from "./useExplorerVideoTargets/useExplorerVideoTargets";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { ExplorerMode } from "./ExplorerTimeline";
import type { RefObject } from "react";

type Options = { frame: number; mode: ExplorerMode; height: number };
const _noop = () => {};
/** Sampled product query state and the refs used for native target marking. */
type ExplorerFrame = {
  stage: ReturnType<typeof ExplorerTimeline.getStageFromFrame>;
  rootRef: RefObject<HTMLDivElement | null>;
  filters: StructuredQuery.FilterGroup;
  appliedFilters: StructuredQuery.FilterGroup | typeof emptyFilter;
  rows: typeof EXPLORER_CASES | typeof EXPLORER_DISTRICT_COUNTS;
  drawerHeight: number;
  context: {
    opened: boolean;
    height: number;
    maxHeight: number;
    onResizePointerDown: () => void;
    onResizeKeyDown: () => void;
  };
  query: StructuredQuery.Partial;
};
/**
 * Sample the deterministic stage and retain filter and drawer memo identities.
 */
export function useExplorerFrame({
  frame,
  mode,
  height,
}: Readonly<Options>): ExplorerFrame {
  const stage = ExplorerTimeline.getStageFromFrame({
    frame,
    mode,
  });
  const rootRef = useExplorerVideoTargets({ frame, mode, time: stage.time });
  const filters = useExplorerFilters({ stage });
  const appliedFilters = stage.filterCommitted ? filters : emptyFilter;
  const rows = stage.isAggregate
    ? EXPLORER_DISTRICT_COUNTS
    : stage.filterCommitted
      ? EXPLORER_CASES.filter(propEq("district_name", "Eastbank"))
      : EXPLORER_CASES;
  const drawerHeight = Math.min(330, Math.round(height * 0.46));
  const context = useMemo(() => {
    return {
      opened: stage.drawerProgress > 0,
      height: drawerHeight,
      maxHeight: drawerHeight,
      onResizePointerDown: _noop,
      onResizeKeyDown: _noop,
    };
  }, [stage.drawerProgress, drawerHeight]);
  const query = getExplorerQuery({ filters });
  return {
    stage,
    rootRef,
    filters,
    appliedFilters,
    rows,
    drawerHeight,
    context,
    query,
  };
}
