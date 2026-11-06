import { Trans } from "@lingui/react/macro";
import { Combobox, Stack, Text, useCombobox } from "@mantine/core";
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import classes from "@/components/RichText/UserMention/UserMentionList.module.css";
import type { MentionCandidate } from "@/components/RichText/UserMention/filterMentionCandidates";

/** Lets the suggestion plugin forward the editor's key presses. */
export type UserMentionListHandle = {
  onKeyDown: (event: KeyboardEvent) => boolean;
};

export type UserMentionListProps = {
  items: readonly MentionCandidate[];
  clientRect: (() => DOMRect | null) | null | undefined;
  command: (attributes: { id: string }) => void;
  /**
   * The editor's editing area. While the list is mounted it becomes an ARIA
   * combobox that controls the list and points at the highlighted member.
   */
  editingArea?: HTMLElement;
};

/** ARIA attributes the list adds to the editing area while it is open. */
const COMBOBOX_ARIA_ATTRIBUTES = [
  "aria-activedescendant",
  "aria-autocomplete",
  "aria-controls",
  "aria-expanded",
] as const;

/** The DOM id of one member's option inside the listbox. */
function _buildOptionId(listboxId: string, userId: string): string {
  return `${listboxId}-${userId}`;
}

/**
 * Turns the editing area into a combobox for as long as the list is
 * mounted, then gives it back its own role and drops the attributes.
 */
function useEditingAreaComboboxAria(
  editingArea: HTMLElement | undefined,
  listboxId: string,
  activeOptionId: string | undefined,
): void {
  useEffect(() => {
    if (!editingArea) {
      return undefined;
    }
    const originalRole = editingArea.getAttribute("role");
    editingArea.setAttribute("role", "combobox");
    editingArea.setAttribute("aria-expanded", "true");
    editingArea.setAttribute("aria-autocomplete", "list");
    editingArea.setAttribute("aria-controls", listboxId);
    return () => {
      COMBOBOX_ARIA_ATTRIBUTES.forEach((attribute) => {
        editingArea.removeAttribute(attribute);
      });
      if (originalRole === null) {
        editingArea.removeAttribute("role");
      } else {
        editingArea.setAttribute("role", originalRole);
      }
    };
  }, [editingArea, listboxId]);

  useEffect(() => {
    if (!editingArea) {
      return;
    }
    if (activeOptionId) {
      editingArea.setAttribute("aria-activedescendant", activeOptionId);
    } else {
      editingArea.removeAttribute("aria-activedescendant");
    }
  }, [editingArea, activeOptionId]);
}

/** Two-letter initials for a member's avatar. */
function _initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => {
      return part[0]?.toUpperCase() ?? "";
    })
    .join("");
}

/**
 * The `@` typeahead. The editor keeps focus, so keyboard navigation arrives
 * through `onKeyDown` from the suggestion plugin rather than from the DOM.
 */
export const UserMentionList = forwardRef<
  UserMentionListHandle,
  UserMentionListProps
>(function UserMentionList({ items, clientRect, command, editingArea }, ref) {
  const listboxId = useId();
  // Always open while mounted: the suggestion plugin mounts and unmounts
  // the list as the `@` query starts and ends.
  const combobox = useCombobox({ opened: true });
  // The highlight is React state rather than the store's DOM-based
  // selection, which misses options the portal has not rendered yet. The
  // ref mirrors it so key presses arriving before a re-render still see
  // the latest index.
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const highlightedIndexRef = useRef(0);

  const highlightIndex = (index: number) => {
    highlightedIndexRef.current = index;
    setHighlightedIndex(index);
  };

  useEffect(() => {
    highlightedIndexRef.current = 0;
    setHighlightedIndex(0);
  }, [items]);

  const highlightedItem = items[highlightedIndex];
  useEditingAreaComboboxAria(
    editingArea,
    listboxId,
    highlightedItem
      ? _buildOptionId(listboxId, highlightedItem.userId)
      : undefined,
  );

  useImperativeHandle(ref, () => {
    return {
      onKeyDown: (event) => {
        const isArrowKey = event.key === "ArrowDown" || event.key === "ArrowUp";
        if (items.length === 0) {
          // Nothing to move through, but the caret must not move either.
          return isArrowKey;
        }
        const currentIndex = highlightedIndexRef.current;
        if (event.key === "ArrowDown") {
          highlightIndex((currentIndex + 1) % items.length);
          return true;
        }
        if (event.key === "ArrowUp") {
          highlightIndex((items.length + currentIndex - 1) % items.length);
          return true;
        }
        const hasModifier =
          event.ctrlKey || event.metaKey || event.altKey || event.shiftKey;
        if ((event.key === "Enter" || event.key === "Tab") && !hasModifier) {
          const chosenItem = items[currentIndex];
          if (chosenItem) {
            command({ id: chosenItem.userId });
          }
          return true;
        }
        return false;
      },
    };
  }, [command, items]);

  const rect = clientRect?.() ?? null;

  return (
    <div
      className={classes.anchor}
      style={{ left: rect?.left ?? 0, top: rect?.bottom ?? 0 }}
    >
      <Combobox
        store={combobox}
        position="bottom-start"
        width={300}
        withinPortal
        // The anchor is a zero-size point at the caret, which floating-ui
        // can report as detached. The list must show whenever it is mounted.
        hideDetached={false}
        onOptionSubmit={(userId) => {
          command({ id: userId });
        }}
      >
        <Combobox.Target>
          <div />
        </Combobox.Target>
        <Combobox.Dropdown>
          <Combobox.Options id={listboxId}>
            {items.length === 0 ? (
              <Combobox.Empty>
                <Trans>No teammates match</Trans>
              </Combobox.Empty>
            ) : (
              items.map((item, index) => {
                const isHighlighted = index === highlightedIndex;
                return (
                  <Combobox.Option
                    key={item.userId}
                    id={_buildOptionId(listboxId, item.userId)}
                    value={item.userId}
                    selected={isHighlighted}
                    aria-selected={isHighlighted}
                  >
                    <div className={classes.option}>
                      <span className={classes.initials} aria-hidden>
                        {_initials(item.displayName)}
                      </span>
                      <Stack gap={0}>
                        <Text size="sm" fw={600}>
                          {item.displayName}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {item.email}
                        </Text>
                      </Stack>
                    </div>
                  </Combobox.Option>
                );
              })
            )}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    </div>
  );
});
