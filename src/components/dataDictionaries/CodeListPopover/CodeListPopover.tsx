import { ActionIcon } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Popover, ScrollArea } from "@mantine/core";
import { IconTag } from "@tabler/icons-react";
import { useRef } from "react";
import { CodeListPopoverContent } from "@/components/dataDictionaries/CodeListPopover/CodeListPopoverContent";
import { useHoverOrFocusOpen } from "@/components/dataDictionaries/CodeListPopover/useHoverOrFocusOpen";
import { POPOVER_Z_INDEX } from "@/config/Theme/Theme";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { FocusEvent, KeyboardEvent, ReactNode, RefObject } from "react";

/** How tall the code list grows before it scrolls. */
const CODE_LIST_MAX_HEIGHT = "calc(var(--mantine-spacing-xl) * 12)";

/** What Tab can land on inside the dropdown, such as its links. */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Props = {
  /** The column the code list explains, named in the button's label. */
  columnName: string;
  codes: ColumnCodes.T;
  /**
   * The column's dataset. Set where a converted column should also count
   * its values with no label, such as the dataset page.
   */
  datasetId?: Dataset.Id;
};

/**
 * Tab at either end of the dropdown goes back to the tag. Forward Tab is
 * not prevented: the browser's own Tab then carries on from the tag to
 * whatever follows it, and the popover closes as focus leaves.
 */
function _onDropdownTab(
  event: KeyboardEvent<HTMLDivElement>,
  dropdown: HTMLDivElement | null,
  tag: HTMLButtonElement | null,
): void {
  const stops = [
    ...(dropdown?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []),
  ];
  const stop = event.shiftKey ? stops[0] : stops[stops.length - 1];
  if (!tag || event.target !== stop) {
    return;
  }
  if (event.shiftKey) {
    event.preventDefault();
  }
  tag.focus();
}

/**
 * Keyboard handling for the tag and its dropdown. The dropdown is portaled
 * away from the tag, so Tab from an open tag moves into it by hand rather
 * than skipping its links. Escape, Shift+Tab from its first stop, and Tab
 * from its last stop hand focus back to the tag, so the dropdown reads as
 * if it sat right after the tag.
 */
function useCodeListKeyboard(popover: ReturnType<typeof useHoverOrFocusOpen>): {
  dropdownRef: RefObject<HTMLDivElement | null>;
  onTagFocus: (event: FocusEvent<HTMLButtonElement>) => void;
  onTagKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onDropdownKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
} {
  // Set whenever the tag gets focus. `ActionIcon` takes no ref.
  const tagRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const onTagKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (!popover.isOpen) {
      return;
    }
    // The dropdown only hears Escape when it has focus, and a popover
    // opened from the keyboard leaves focus on the tag.
    if (event.key === "Escape") {
      event.stopPropagation();
      popover.close();
      return;
    }
    const firstFocusable =
      dropdownRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    if (event.key === "Tab" && !event.shiftKey && firstFocusable) {
      event.preventDefault();
      firstFocusable.focus();
    }
  };

  const onDropdownKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    // Focusing the tag first lets `close` clear the focus that reopens it.
    if (event.key === "Escape") {
      event.stopPropagation();
      tagRef.current?.focus();
      popover.close();
      return;
    }
    if (event.key === "Tab") {
      _onDropdownTab(event, dropdownRef.current, tagRef.current);
    }
  };
  return {
    dropdownRef,
    onTagFocus: (event) => {
      tagRef.current = event.currentTarget;
      popover.onFocus();
    },
    onTagKeyDown,
    onDropdownKeyDown,
  };
}

/**
 * A tag button that shows what a column's codes mean. It opens on hover,
 * on keyboard focus, and on click, and Escape closes it. Tab from an open
 * tag moves into the dropdown, so its links are reachable. Use it next to a
 * column a dictionary is attached to, for example in a column list or a
 * results grid's header.
 */
export function CodeListPopover({
  columnName,
  codes,
  datasetId,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const popover = useHoverOrFocusOpen();
  const label = t`Code list for ${columnName}`;
  const keyboard = useCodeListKeyboard(popover);
  return (
    <Popover
      opened={popover.isOpen}
      onChange={(isOpen) => {
        return isOpen ? popover.onClick() : popover.close();
      }}
      position="bottom-start"
      width={300}
      shadow="md"
      withArrow
      zIndex={POPOVER_Z_INDEX}
    >
      <Popover.Target>
        <ActionIcon
          variant="subtle"
          color="neutral"
          size="sm"
          aria-label={label}
          onMouseEnter={popover.onPointerEnter}
          onMouseLeave={popover.onPointerLeave}
          onFocus={keyboard.onTagFocus}
          onBlur={popover.onBlur}
          onClick={(event) => {
            // In a grid header, a click that bubbles up would sort the column.
            event.stopPropagation();
            popover.onClick();
          }}
          onKeyDown={keyboard.onTagKeyDown}
        >
          <IconTag size={14} aria-hidden />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown
        ref={keyboard.dropdownRef}
        aria-label={label}
        onMouseEnter={popover.onPointerEnter}
        onMouseLeave={popover.onPointerLeave}
        // Focus on the dropdown's links keeps it open like focus on the tag.
        onFocus={popover.onFocus}
        onBlur={popover.onBlur}
        onKeyDown={keyboard.onDropdownKeyDown}
      >
        {/* The list scrolls, not the dropdown: an overflowing dropdown
            would clip the arrow drawn just outside its box. */}
        <ScrollArea.Autosize mah={CODE_LIST_MAX_HEIGHT} type="auto">
          <CodeListPopoverContent
            codes={codes}
            columnName={columnName}
            datasetId={datasetId}
          />
        </ScrollArea.Autosize>
      </Popover.Dropdown>
    </Popover>
  );
}
