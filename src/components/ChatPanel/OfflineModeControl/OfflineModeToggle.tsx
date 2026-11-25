import { ActionIcon, Tooltip } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { IconCheck, IconCloudOff, IconSettings } from "@tabler/icons-react";
import { OfflineModeStore } from "@/stores/OfflineModeStore/OfflineModeStore";
import css from "./OfflineModeControl.module.css";
import type { ReactNode } from "react";

type Props = {
  isOn: boolean;
  /** The connection dropped, so chat runs offline whatever the choice. */
  isBrowserOffline: boolean;
  disabled: boolean;
  onOpenDialog: () => void;
};

/**
 * The offline mode control once the offline models are downloaded: a toggle
 * for offline mode, and a button to the dialog where they can be removed.
 * While the browser has no connection the toggle shows chat running offline
 * and cannot be turned off.
 */
export function OfflineModeToggle({
  isOn,
  isBrowserOffline,
  disabled,
  onOpenDialog,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const isPressed = isOn || isBrowserOffline;
  const isLocked = isBrowserOffline || disabled;
  const tooltip = isBrowserOffline
    ? t`You are not connected to the internet, so chat runs on this computer with the offline models.`
    : isOn
      ? t`Offline mode is on. Chat runs on this computer and nothing leaves it. Click to go back online.`
      : t`Turn on offline mode to chat on this computer, without sending anything online.`;
  return (
    <>
      <Tooltip label={tooltip}>
        <Button
          type="button"
          variant={isPressed ? "light" : "subtle"}
          color={isPressed ? "primary" : "neutral"}
          size="compact-sm"
          className={css.offlineModeTrigger}
          leftSection={<IconCloudOff size={14} aria-hidden />}
          rightSection={isPressed ? <IconCheck size={12} aria-hidden /> : null}
          aria-label={isBrowserOffline ? t`Running offline` : t`Offline mode`}
          aria-pressed={isPressed}
          // Running offline is an active state, not an unavailable one, so it
          // keeps the on style and only refuses the click.
          data-disabled={disabled || undefined}
          aria-disabled={isLocked || undefined}
          onClick={() => {
            if (!isLocked) {
              OfflineModeStore.setOn(!isOn);
            }
          }}
        >
          {isBrowserOffline ? t`Running offline` : t`Offline`}
        </Button>
      </Tooltip>
      <ActionIcon
        tooltip={t`Manage offline models`}
        variant="subtle"
        color="neutral"
        size="sm"
        aria-label={t`Manage offline models`}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={onOpenDialog}
      >
        <IconSettings size={14} aria-hidden />
      </ActionIcon>
    </>
  );
}
