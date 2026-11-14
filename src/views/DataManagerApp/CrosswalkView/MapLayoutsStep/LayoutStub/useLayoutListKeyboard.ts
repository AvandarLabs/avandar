import { useEffect, useState } from "react";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { KeyboardEvent } from "react";

/** The active option of the stub's listbox, and what moves it. */
export type LayoutListKeyboard = {
  activeLayoutId: CrosswalkLayout.Id | undefined;
  setActiveLayoutId: (layoutId: CrosswalkLayout.Id) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

/** The index the key moves to, or undefined for a key that does not move. */
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
 * Keyboard for a single-select listbox that keeps focus on itself and
 * points at its active option (`aria-activedescendant`). Arrows, Home, and
 * End move the active option without selecting it; Enter and Space select
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
  }>,
): LayoutListKeyboard {
  const { layoutIds, selectedLayoutId } = options;
  // The active option, and the selection it was chosen under.
  const [active, setActive] = useState<{
    underSelectedId: CrosswalkLayout.Id | undefined;
    layoutId: CrosswalkLayout.Id;
  }>();
  const activeLayoutId =
    active !== undefined &&
    active.underSelectedId === selectedLayoutId &&
    layoutIds.includes(active.layoutId)
      ? active.layoutId
      : (selectedLayoutId ?? layoutIds[0]);
  useEffect(() => {
    if (activeLayoutId) {
      document
        .getElementById(options.getOptionId(activeLayoutId))
        ?.scrollIntoView?.({ block: "nearest" });
    }
    // `getOptionId` is stable for the life of the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayoutId]);
  const setActiveLayoutId = (layoutId: CrosswalkLayout.Id): void => {
    setActive({ underSelectedId: selectedLayoutId, layoutId });
  };
  const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    const index = activeLayoutId ? layoutIds.indexOf(activeLayoutId) : -1;
    if ((event.key === "Enter" || event.key === " ") && activeLayoutId) {
      event.preventDefault();
      options.onSelectLayout(activeLayoutId);
      return;
    }
    const movedIndex = _getMovedIndex(event.key, index, layoutIds.length);
    const movedLayoutId =
      movedIndex === undefined ? undefined : layoutIds[movedIndex];
    if (movedLayoutId) {
      event.preventDefault();
      setActiveLayoutId(movedLayoutId);
    }
  };
  return { activeLayoutId, setActiveLayoutId, onKeyDown };
}
