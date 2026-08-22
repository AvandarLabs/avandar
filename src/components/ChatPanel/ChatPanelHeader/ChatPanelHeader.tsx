import { mantineColorVar, Tooltip } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { ActionIcon, Button, Group, Text } from "@mantine/core";
import { IconSparkles, IconX } from "@tabler/icons-react";

import css from "./ChatPanelHeader.module.css";

type Props = {
  onNewChatClick: () => void;
  onClose: () => void;
};

/**
 * Title row for the chat panel: Ask Avandar, New chat, and Close.
 */
export function ChatPanelHeader({
  onNewChatClick,
  onClose,
}: Readonly<Props>): React.ReactNode {
  const { t } = useLingui();
  return (
    <Group
      px="md"
      py="sm"
      justify="space-between"
      className={css.chatPanelHeader}
    >
      <Group gap="xs">
        <IconSparkles size={16} color={mantineColorVar("primary.6")} />
        <Text size="sm" fw={600} c="neutral.9">
          <Trans>Ask Avandar</Trans>
        </Text>
      </Group>
      <Group gap="xs" wrap="nowrap">
        <Button
          variant="outline"
          size="compact-sm"
          color="neutral"
          onClick={onNewChatClick}
        >
          <Trans>New chat</Trans>
        </Button>
        <Tooltip label={t`Close panel (⌘/)`}>
          <ActionIcon
            variant="subtle"
            size="sm"
            color="neutral"
            onClick={onClose}
            aria-label={t`Close chat panel`}
          >
            <IconX size={16} aria-hidden />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
}
