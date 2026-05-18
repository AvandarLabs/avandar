import { ActionIcon } from "@mantine/core";
import {
  IconLayoutSidebarRightCollapse,
  IconLayoutSidebarRightExpand,
} from "@tabler/icons-react";
import { Tooltip } from "@ui";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager";

/**
 * Toggle button for the AppShell's right-side chat panel. Rendered in the
 * AppToolbar so it's available across every app view. The keyboard shortcut
 * (Cmd/Ctrl+J) lives on the AppShell itself.
 */
export function ChatAsideToggle(): JSX.Element {
  const [{ isOpen }, dispatch] = ChatPanelStateManager.useContext();

  return (
    <Tooltip label={isOpen ? "Close chat (⌘J)" : "Open chat (⌘J)"}>
      <ActionIcon
        variant="subtle"
        size="md"
        color="neutral"
        onClick={dispatch.toggle}
        aria-label={isOpen ? "Close chat panel" : "Open chat panel"}
        aria-pressed={isOpen}
        visibleFrom="sm"
      >
        {isOpen ?
          <IconLayoutSidebarRightCollapse size={18} />
        : <IconLayoutSidebarRightExpand size={18} />}
      </ActionIcon>
    </Tooltip>
  );
}
