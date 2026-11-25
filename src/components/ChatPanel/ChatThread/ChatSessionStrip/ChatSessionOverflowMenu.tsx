import { ActionIcon, Menu } from "@mantine/core";
import { IconDots } from "@tabler/icons-react";

type Props = {
  ids: readonly string[];
  labels: Readonly<Record<string, string>>;
  menuLabel: string;
  onSelect: (sessionId: string) => void;
};

/** Opens the chats that do not fit in the visible tab list. */
export function ChatSessionOverflowMenu({
  ids,
  labels,
  menuLabel,
  onSelect,
}: Readonly<Props>): React.ReactNode {
  if (ids.length === 0) {
    return null;
  }
  return (
    <Menu position="bottom-end" shadow="md">
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="neutral"
          size="sm"
          aria-label={menuLabel}
        >
          <IconDots size={16} aria-hidden />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        {ids.map((sessionId) => {
          return (
            <Menu.Item
              key={sessionId}
              onClick={() => {
                onSelect(sessionId);
              }}
            >
              {labels[sessionId]}
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}
