import { Tooltip } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { ActionIcon, Group, Stack, Title } from "@mantine/core";
import {
  IconLayoutSidebarRightCollapse,
  IconMessagePlus,
} from "@tabler/icons-react";
import css from "./ChatPanelHeader.module.css";
import type { ReactNode } from "react";

type Props = {
  onNewChatClick: () => void;
  onClose: () => void;
  children?: ReactNode;
};

/**
 * Header band for Ask Avandar, its panel actions, and chat-session navigation.
 */
export function ChatPanelHeader({
  onNewChatClick,
  onClose,
  children,
}: Readonly<Props>): React.ReactNode {
  const { t } = useLingui();
  return (
    <Stack gap={0} className={css.chatPanelHeader}>
      <Group
        ps="md"
        pe="xs"
        py="xxs"
        gap="xs"
        wrap="nowrap"
        justify="space-between"
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
      {children}
    </Stack>
  );
}
