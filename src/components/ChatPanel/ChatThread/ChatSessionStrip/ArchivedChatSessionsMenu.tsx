import { ActionIcon, Menu } from "@mantine/core";
import { IconArchive } from "@tabler/icons-react";
import { ArchivedChatSessionRow } from "./ArchivedChatSessionRow";

type Props = {
  ids: readonly string[];
  labels: Readonly<Record<string, string>>;
  menuLabel: string;
  reopenLabel: string;
  deleteLabel: string;
  onReopen: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
};

/** Opens the closed-chat archive and its row actions. */
export function ArchivedChatSessionsMenu({
  ids,
  labels,
  menuLabel,
  reopenLabel,
  deleteLabel,
  onReopen,
  onDelete,
}: Readonly<Props>): React.ReactNode {
  if (ids.length === 0) {
    return null;
  }
  return (
    <Menu position="bottom-end" shadow="md" closeOnItemClick={false}>
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="neutral"
          size="sm"
          aria-label={menuLabel}
        >
          <IconArchive size={16} aria-hidden />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        {ids.map((sessionId) => {
          return (
            <ArchivedChatSessionRow
              key={sessionId}
              label={labels[sessionId] ?? ""}
              reopenLabel={reopenLabel}
              deleteLabel={deleteLabel}
              onReopen={() => {
                onReopen(sessionId);
              }}
              onDelete={() => {
                onDelete(sessionId);
              }}
            />
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}
