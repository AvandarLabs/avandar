import { ActionIcon, UnstyledButton } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import clsx from "clsx";
import css from "./ChatSessionStrip.module.css";

type Props = {
  label: string;
  isSelected: boolean;
  onSelect: () => void;
  onArchive: () => void;
  closeLabel: string;
};

/** Shows one selectable open chat and its separate close action. */
export function ChatSessionTab({
  label,
  isSelected,
  onSelect,
  onArchive,
  closeLabel,
}: Readonly<Props>): React.ReactNode {
  return (
    <div
      className={clsx(css.tabContainer, isSelected && css.tabContainerSelected)}
    >
      <UnstyledButton
        role="tab"
        aria-selected={isSelected}
        className={css.tab}
        onClick={onSelect}
      >
        {label}
      </UnstyledButton>
      <ActionIcon
        variant="subtle"
        color="neutral"
        size="xs"
        aria-label={closeLabel}
        onClick={(event) => {
          event.stopPropagation();
          onArchive();
        }}
      >
        <IconX size={14} aria-hidden />
      </ActionIcon>
    </div>
  );
}
