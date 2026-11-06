import { Tooltip } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { ActionIcon, Group, Title } from "@mantine/core";
import {
  IconLayoutSidebarRightCollapse,
  IconMessagePlus,
} from "@tabler/icons-react";
import css from "./ChatPanelHeader.module.css";

type Props = {
  onNewChatClick: () => void;
  onClose: () => void;
};

/**
 * Title row for the chat panel: Ask Avandar, New chat, and Close. Built to
 * the slate toolbar's measure (same padding, control size, and bottom rule)
 * so the two read as one continuous band across the fused slate.
 */
export function ChatPanelHeader({
  onNewChatClick,
  onClose,
}: Readonly<Props>): React.ReactNode {
  const { t } = useLingui();
  return (
    <Group
      ps="md"
      pe="xs"
      py="xxs"
      gap="xs"
      wrap="nowrap"
      justify="space-between"
      className={css.chatPanelHeader}
    >
      <Title order={2} size="sm" fw={500} c="neutral.9">
        <Trans>Ask Avandar</Trans>
      </Title>
      <Group gap="xxs" wrap="nowrap">
        <Tooltip label={t`New chat`}>
          <ActionIcon
            variant="subtle"
            size="md"
            color="neutral"
            onClick={onNewChatClick}
            aria-label={t`New chat`}
          >
            <IconMessagePlus size={18} aria-hidden />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t`Close panel (⌘/)`}>
          <ActionIcon
            variant="subtle"
            size="md"
            color="neutral"
            onClick={onClose}
            aria-label={t`Close chat panel`}
          >
            <IconLayoutSidebarRightCollapse
              size={18}
              aria-hidden
              className={css.chatPanelHeaderCloseIcon}
            />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
}
