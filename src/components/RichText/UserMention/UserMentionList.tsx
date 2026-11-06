import { Trans } from "@lingui/react/macro";
import { Combobox, Stack, Text, useCombobox } from "@mantine/core";
import {
  forwardRef,
  useEffect,
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
};

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
>(function UserMentionList({ items, clientRect, command }, ref) {
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

  useImperativeHandle(ref, () => {
    return {
      onKeyDown: (event) => {
        if (items.length === 0) {
          return false;
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
        if (event.key === "Enter" || event.key === "Tab") {
          const highlightedItem = items[currentIndex];
          if (highlightedItem) {
            command({ id: highlightedItem.userId });
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
        onOptionSubmit={(userId) => {
          command({ id: userId });
        }}
      >
        <Combobox.Target>
          <div />
        </Combobox.Target>
        <Combobox.Dropdown>
          <Combobox.Options>
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
