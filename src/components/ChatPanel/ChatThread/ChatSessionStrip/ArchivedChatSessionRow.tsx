import { ActionIcon, Text } from "@mantine/core";
import { IconRestore, IconTrash } from "@tabler/icons-react";
import css from "./ChatSessionStrip.module.css";

type Props = {
  label: string;
  reopenLabel: string;
  deleteLabel: string;
  onReopen: () => void;
  onDelete: () => void;
};

/** Shows one closed chat with its reopen and delete actions. */
export function ArchivedChatSessionRow({
  label,
  reopenLabel,
  deleteLabel,
  onReopen,
  onDelete,
}: Readonly<Props>): React.ReactNode {
  return (
    <div className={css.archivedRow}>
      <Text size="xs" truncate className={css.archivedLabel}>
        {label}
      </Text>
      <ActionIcon
        variant="subtle"
        color="neutral"
        size="sm"
        aria-label={reopenLabel}
        onClick={onReopen}
      >
        <IconRestore size={15} aria-hidden />
      </ActionIcon>
      <ActionIcon
        variant="subtle"
        color="danger"
        size="sm"
        aria-label={deleteLabel}
        onClick={onDelete}
      >
        <IconTrash size={15} aria-hidden />
      </ActionIcon>
    </div>
  );
}
