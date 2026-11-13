import { ActionIcon } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Popover } from "@mantine/core";
import { IconTag } from "@tabler/icons-react";
import css from "@/components/dataDictionaries/CodeListPopover/CodeListPopover.module.css";
import { CodeListPopoverContent } from "@/components/dataDictionaries/CodeListPopover/CodeListPopoverContent";
import { useHoverOrFocusOpen } from "@/components/dataDictionaries/CodeListPopover/useHoverOrFocusOpen";
import { POPOVER_Z_INDEX } from "@/config/Theme/Theme";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { ReactNode } from "react";

type Props = {
  /** The column the code list explains, named in the button's label. */
  columnName: string;
  codes: ColumnCodes.T;
};

/**
 * A tag button that shows what a column's codes mean. It opens on hover,
 * on keyboard focus, and on click, and Escape closes it. Use it next to a
 * column a dictionary is attached to, for example in a column list or a
 * results grid's header.
 */
export function CodeListPopover({
  columnName,
  codes,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const popover = useHoverOrFocusOpen();
  const label = t`Code list for ${columnName}`;
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
      returnFocus
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
          onFocus={popover.onFocus}
          onBlur={popover.onBlur}
          onClick={(event) => {
            // In a grid header, a click that bubbles up would sort the column.
            event.stopPropagation();
            popover.onClick();
          }}
          onKeyDown={(event) => {
            // The dropdown only hears Escape when it has focus, and a
            // popover opened from the keyboard leaves focus on the tag.
            if (event.key === "Escape" && popover.isOpen) {
              event.stopPropagation();
              popover.close();
            }
          }}
        >
          <IconTag size={14} aria-hidden />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown
        aria-label={label}
        className={css.codeListPopoverDropdown}
        onMouseEnter={popover.onPointerEnter}
        onMouseLeave={popover.onPointerLeave}
      >
        <CodeListPopoverContent codes={codes} />
      </Popover.Dropdown>
    </Popover>
  );
}
