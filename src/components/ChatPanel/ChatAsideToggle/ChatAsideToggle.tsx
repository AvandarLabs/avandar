import { Tooltip } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";

/**
 * Toggle button for the AppShell's right-side chat panel. Rendered in the
 * AppToolbar so it's available across every app view. The keyboard shortcut
 * (Cmd/Ctrl+/) lives on the AppShell itself.
 */
export function ChatAsideToggle(): React.ReactNode {
  const [{ isOpen }, dispatch] = ChatPanelStateManager.useContext();
  const { t } = useLingui();

  return (
    <Tooltip label={isOpen ? t`Close chat (⌘/)` : t`Open chat (⌘/)`}>
      <Button
        variant={isOpen ? "light" : "default"}
        size="compact-sm"
        color="neutral"
        onClick={dispatch.toggle}
        aria-pressed={isOpen}
        visibleFrom="sm"
        leftSection={<IconSparkles size={16} stroke={1.5} aria-hidden />}
      >
        <Trans>Chat</Trans>
      </Button>
    </Tooltip>
  );
}
