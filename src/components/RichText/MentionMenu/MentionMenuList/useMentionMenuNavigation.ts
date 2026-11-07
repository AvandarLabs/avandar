import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useEditingAreaComboboxAria } from "@/components/RichText/MentionMenu/MentionMenuList/useEditingAreaComboboxAria";
import type {
  MentionMenuGroup,
  MentionMenuItem,
} from "@/components/RichText/MentionMenu/buildMentionMenuGroups/buildMentionMenuGroups";
import type {
  MentionMenuListHandle,
  MentionMenuListProps,
  MentionMenuSelection,
} from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuList";
import type { Ref } from "react";

type KeyDownContext = {
  items: readonly MentionMenuItem[];
  currentIndex: number;
  highlightIndex: (index: number) => void;
  command: (selection: MentionMenuSelection) => void;
};

type NavigationOptions = Pick<
  MentionMenuListProps,
  "groups" | "isSearching" | "searchFailed" | "command" | "editingArea"
> & { listboxId: string };

type MentionMenuNavigation = {
  /** The groups to draw: only people while a search status shows. */
  visibleGroups: MentionMenuGroup[];
  highlightedItem: MentionMenuItem | undefined;
  buildOptionId: (itemId: string) => string;

  /** Inserts the row the author clicked, as a link when it is a gadget. */
  chooseItemById: (itemId: string) => void;
};

function _buildSelection(
  item: MentionMenuItem,
  display: "link" | "embed",
): MentionMenuSelection {
  return item.kind === "person"
    ? { kind: "person", candidate: item.candidate }
    : { kind: "gadget", display, result: item.result };
}

/**
 * The selection a key press makes on the highlighted row, or undefined when
 * the key is not a choice. Ctrl, Meta, and Alt always fall through, so
 * Mod-Enter still submits. Shift+Enter embeds a gadget and falls through on
 * a member, where it makes a line break.
 */
function _getSelectionFromKey(
  event: KeyboardEvent,
  item: MentionMenuItem,
): MentionMenuSelection | undefined {
  if (event.key !== "Enter" && event.key !== "Tab") {
    return undefined;
  }
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return undefined;
  }
  if (!event.shiftKey) {
    return _buildSelection(item, "link");
  }
  return event.key === "Enter" && item.kind === "gadget"
    ? _buildSelection(item, "embed")
    : undefined;
}

/**
 * Moves the highlight on arrow keys and chooses the highlighted row on
 * Enter, Shift+Enter, or Tab. Returns whether the editor must ignore the key.
 */
function _onListKeyDown(
  event: KeyboardEvent,
  context: KeyDownContext,
): boolean {
  const { items, currentIndex } = context;
  const isArrowKey = event.key === "ArrowDown" || event.key === "ArrowUp";
  const currentItem = items[currentIndex];
  if (!currentItem) {
    // Nothing to move through, but the caret must not move either.
    return isArrowKey;
  }
  if (isArrowKey) {
    const step = event.key === "ArrowDown" ? 1 : -1;
    context.highlightIndex((items.length + currentIndex + step) % items.length);
    return true;
  }
  const selection = _getSelectionFromKey(event, currentItem);
  if (selection) {
    context.command(selection);
  }
  return selection !== undefined;
}

/**
 * Keeps the highlight in React state rather than in the Combobox store's
 * DOM-based selection, which misses options the portal has not rendered
 * yet. The ref mirrors it so key presses arriving before a re-render still
 * see the latest index. The highlight goes back to the top when rows change.
 */
function useHighlightedIndex(items: readonly MentionMenuItem[]) {
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const highlightedIndexRef = useRef(0);
  const highlightIndex = useCallback((index: number) => {
    highlightedIndexRef.current = index;
    setHighlightedIndex(index);
  }, []);
  useEffect(() => {
    highlightIndex(0);
  }, [items, highlightIndex]);
  return { highlightedIndex, highlightedIndexRef, highlightIndex };
}

function useVisibleGroups(
  options: Pick<NavigationOptions, "groups" | "isSearching" | "searchFailed">,
) {
  const { groups, isSearching, searchFailed } = options;
  const visibleGroups = useMemo(() => {
    return groups.filter((group) => {
      return group.key === "people" || !(isSearching || searchFailed);
    });
  }, [groups, isSearching, searchFailed]);
  const items = useMemo(() => {
    return visibleGroups.flatMap((group) => {
      return group.items;
    });
  }, [visibleGroups]);
  return { visibleGroups, items };
}

/**
 * The highlight and keyboard handling behind `MentionMenuList`: one flat
 * highlight across every visible group, the key handler the suggestion
 * plugin calls through `ref`, and the editing area's combobox attributes.
 */
export function useMentionMenuNavigation(
  ref: Ref<MentionMenuListHandle>,
  options: NavigationOptions,
): MentionMenuNavigation {
  const { command, editingArea, listboxId } = options;
  const { visibleGroups, items } = useVisibleGroups(options);
  const { highlightedIndex, highlightedIndexRef, highlightIndex } =
    useHighlightedIndex(items);
  const highlightedItem = items[highlightedIndex];
  const buildOptionId = (itemId: string) => {
    return `${listboxId}-${itemId}`;
  };
  useEditingAreaComboboxAria(
    editingArea,
    listboxId,
    highlightedItem ? buildOptionId(highlightedItem.id) : undefined,
  );
  useImperativeHandle(ref, () => {
    return {
      onKeyDown: (event) => {
        return _onListKeyDown(event, {
          items,
          currentIndex: highlightedIndexRef.current,
          highlightIndex,
          command,
        });
      },
    };
  }, [command, items, highlightIndex, highlightedIndexRef]);
  const chooseItemById = (itemId: string) => {
    const chosenItem = items.find((item) => {
      return item.id === itemId;
    });
    if (chosenItem) {
      command(_buildSelection(chosenItem, "link"));
    }
  };
  return { visibleGroups, highlightedItem, buildOptionId, chooseItemById };
}
