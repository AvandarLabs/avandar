import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, List, Modal, Stack, Text } from "@mantine/core";
import {
  IconCircleCheck,
  IconClock,
  IconDownload,
  IconLock,
  IconWifiOff,
} from "@tabler/icons-react";
import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import css from "./OfflineModeControl.module.css";
import type { ReactNode } from "react";

type Props = {
  isOpen: boolean;
  isDownloaded: boolean;
  isRemoving: boolean;
  onClose: () => void;
  onDownload: () => void;
  onRemove: () => void;
};

function _OfflineModeFacts(): ReactNode {
  const iconProps = {
    size: 16,
    className: css.offlineModeDialogFactIcon,
    "aria-hidden": true,
  };
  return (
    <List
      spacing="xs"
      size="sm"
      classNames={{
        root: css.offlineModeDialogFact,
        itemLabel: css.offlineModeDialogFactLabel,
      }}
    >
      <List.Item icon={<IconWifiOff {...iconProps} />}>
        <Trans>Works without an internet connection.</Trans>
      </List.Item>
      <List.Item icon={<IconLock {...iconProps} />}>
        <Trans>
          Nothing you ask, and none of your data, leaves this computer.
        </Trans>
      </List.Item>
      <List.Item icon={<IconClock {...iconProps} />}>
        <Trans>Answers are slower and less accurate than online chat.</Trans>
      </List.Item>
    </List>
  );
}

function _OfflineModeDialogActions(props: Readonly<Props>): ReactNode {
  if (!props.isDownloaded) {
    return (
      <Group justify="flex-end">
        <Button variant="default" onClick={props.onClose}>
          <Trans>Cancel</Trans>
        </Button>
        <Button
          leftSection={<IconDownload size={16} />}
          onClick={props.onDownload}
        >
          <Trans>Download offline models</Trans>
        </Button>
      </Group>
    );
  }
  return (
    <Group justify="space-between">
      <Button
        variant="subtle"
        color="danger"
        loading={props.isRemoving}
        onClick={props.onRemove}
      >
        <Trans>Remove offline models</Trans>
      </Button>
      <Button variant="default" onClick={props.onClose}>
        <Trans>Done</Trans>
      </Button>
    </Group>
  );
}

/**
 * Explains offline mode in plain words: where it runs, what it costs, and
 * what the computer needs. Downloads the offline models when they are
 * missing, and removes them when they are on this computer. Opened from the
 * offline mode control in the chat composer.
 */
export function OfflineModeDialog(props: Readonly<Props>): ReactNode {
  const { i18n } = useLingui();
  const sizeGb = i18n.number(
    LocalChatModel.getDownloadMbFromBundle(LocalChatModel.OFFLINE_BUNDLE) /
      1000,
    { maximumFractionDigits: 1 },
  );
  return (
    <Modal
      opened={props.isOpen}
      onClose={props.onClose}
      centered
      size="md"
      title={<Trans>Offline mode</Trans>}
    >
      <Stack gap="lg">
        <Text size="sm">
          <Trans>
            Offline mode answers your questions with models that run on this
            computer instead of on Avandar's servers.
          </Trans>
        </Text>
        <_OfflineModeFacts />
        {props.isDownloaded ? (
          <Group gap="xs" wrap="nowrap" className={css.offlineModeDialogReady}>
            <IconCircleCheck size={16} aria-hidden />
            <Text size="sm" c="inherit">
              <Trans>The offline models are on this computer.</Trans>
            </Text>
          </Group>
        ) : (
          <Text size="sm" className={css.offlineModeDialogNote}>
            <Trans>
              About {sizeGb} GB to download, once. Needs a recent version of
              Chrome or Edge, and a computer with at least 16 GB of memory.
            </Trans>
          </Text>
        )}
        <_OfflineModeDialogActions {...props} />
      </Stack>
    </Modal>
  );
}
