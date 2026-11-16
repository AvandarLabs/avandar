import { useEffect, useState } from "react";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { KeyboardEvent } from "react";

/** The active option of the stub's listbox, and what moves it. */
export type LayoutListKeyboard = {
  activeLayoutId: CrosswalkLayout.Id | undefined;
  setActiveLayoutId: (layoutId: CrosswalkLayout.Id) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

/** What a key does to the list: select an option or move the active one. */
type KeyAction = {
  kind: "select" | "move";
  layoutId: CrosswalkLayout.Id;
};

/** The index a navigation key moves to, or undefined for any other key. */
function _getMovedIndex(
  key: string,
  index: number,
  count: number,
): number | undefined {
  if (key === "ArrowDown") {
    return Math.min(index + 1, count - 1);
  }
  if (key === "ArrowUp") {
    return Math.max(index - 1, 0);
  }
  if (key === "Home") {
    return 0;
  }
  return key === "End" ? count - 1 : undefined;
}

/**
 * What a key does: Enter and Space select the active option, and the
 * navigation keys move it. Undefined for a key the list ignores.
 */
function _getKeyAction(
  options: Readonly<{
    key: string;
    activeLayoutId: CrosswalkLayout.Id | undefined;
    layoutIds: readonly CrosswalkLayout.Id[];
  }>,
): KeyAction | undefined {
  const { key, activeLayoutId, layoutIds } = options;
  if ((key === "Enter" || key === " ") && activeLayoutId) {
    return { kind: "select", layoutId: activeLayoutId };
  }
  const index = activeLayoutId ? layoutIds.indexOf(activeLayoutId) : -1;
  const movedIndex = _getMovedIndex(key, index, layoutIds.length);
  const movedLayoutId =
    movedIndex === undefined ? undefined : layoutIds[movedIndex];
  return movedLayoutId ? { kind: "move", layoutId: movedLayoutId } : undefined;
}

/** Scrolls the active option into view whenever it changes. */
function useScrollActiveIntoView(
  activeLayoutId: CrosswalkLayout.Id | undefined,
  options: Readonly<{
    getOptionId: (layoutId: CrosswalkLayout.Id) => string;
    scrollToLayout?: (layoutId: CrosswalkLayout.Id) => void;
  }>,
): void {
  useEffect(() => {
    if (!activeLayoutId) {
      return;
    }
    if (options.scrollToLayout) {
      options.scrollToLayout(activeLayoutId);
      return;
    }
    // jsdom has no scrollIntoView, so it is called only where it exists.
    document
      .getElementById(options.getOptionId(activeLayoutId))
      ?.scrollIntoView?.({ block: "nearest" });
    // Only a change of the active option scrolls. `getOptionId` and
    // `scrollToLayout` stand for the same rows in the meantime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayoutId]);
}

/**
 * The active option and a setter. A selection that changes from outside
 * takes the active option with it, and an active option that leaves the
 * list falls back to the selected one.
 */
function useActiveLayoutId(
  layoutIds: readonly CrosswalkLayout.Id[],
  selectedLayoutId: CrosswalkLayout.Id | undefined,
): [CrosswalkLayout.Id | undefined, (layoutId: CrosswalkLayout.Id) => void] {
  const [activeId, setActiveId] = useState<CrosswalkLayout.Id>();
  const [trackedSelectedId, setTrackedSelectedId] = useState(selectedLayoutId);
  if (trackedSelectedId !== selectedLayoutId) {
    setTrackedSelectedId(selectedLayoutId);
    setActiveId(undefined);
  }
  const activeLayoutId =
    activeId !== undefined && layoutIds.includes(activeId)
      ? activeId
      : (selectedLayoutId ?? layoutIds[0]);
  return [activeLayoutId, setActiveId];
}

/**
 * Keyboard for a single-select listbox that keeps focus on itself and
 * points at its active option (`aria-activedescendant`). Arrows, Home, and
 * End move the active option without selecting it. Enter and Space select
 * it. The active option starts at the selected one and follows it when the
 * selection changes from outside, such as Confirm and next. It is scrolled
 * into view as it moves.
 */
export function useLayoutListKeyboard(
  options: Readonly<{
    layoutIds: readonly CrosswalkLayout.Id[];
    selectedLayoutId: CrosswalkLayout.Id | undefined;
    getOptionId: (layoutId: CrosswalkLayout.Id) => string;
    onSelectLayout: (layoutId: CrosswalkLayout.Id) => void;
    /**
     * Scrolls a layout's row into view when the list renders only the rows
     * in view, where the row may not be in the DOM. Without it the row is
     * scrolled with `scrollIntoView`.
     */
    scrollToLayout?: (layoutId: CrosswalkLayout.Id) => void;
  }>,
): LayoutListKeyboard {
  const { layoutIds, selectedLayoutId } = options;
  const [activeLayoutId, setActiveLayoutId] = useActiveLayoutId(
    layoutIds,
    selectedLayoutId,
  );
  useScrollActiveIntoView(activeLayoutId, options);
  const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    const action = _getKeyAction({
      key: event.key,
      activeLayoutId,
      layoutIds,
    });
    if (!action) {
      return;
    }
    event.preventDefault();
    if (action.kind === "select") {
      options.onSelectLayout(action.layoutId);
    } else {
      setActiveLayoutId(action.layoutId);
    }
  };
  return { activeLayoutId, setActiveLayoutId, onKeyDown };
}
