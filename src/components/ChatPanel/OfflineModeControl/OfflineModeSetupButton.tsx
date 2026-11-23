import { Tooltip } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { IconCloudOff, IconDownload } from "@tabler/icons-react";
import css from "./OfflineModeControl.module.css";
import type { ReactNode } from "react";

type Props = {
  /** True when this browser cannot run offline models at all. */
  isUnsupported: boolean;
  disabled: boolean;
  onOpenDialog: () => void;
};

/**
 * The offline mode control before the offline models are downloaded: it
 * opens the dialog that explains offline mode and downloads them. Without
 * WebGPU it stays visible but unavailable, with a tooltip saying why.
 */
export function OfflineModeSetupButton({
  isUnsupported,
  disabled,
  onOpenDialog,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const isUnavailable = isUnsupported || disabled;
  return (
    <Tooltip
      label={
        isUnsupported
          ? t`This browser cannot run the offline models. Use a recent version of Chrome or Edge.`
          : t`Set up offline mode to chat without an internet connection.`
      }
    >
      <Button
        type="button"
        variant="subtle"
        color="neutral"
        size="compact-sm"
        className={css.offlineModeTrigger}
        leftSection={<IconCloudOff size={14} aria-hidden />}
        rightSection={
          isUnsupported ? undefined : <IconDownload size={12} aria-hidden />
        }
        aria-label={t`Offline mode`}
        aria-haspopup="dialog"
        // `data-disabled` rather than `disabled`, so the tooltip still
        // explains why on hover and focus.
        data-disabled={isUnavailable || undefined}
        aria-disabled={isUnavailable || undefined}
        onClick={(event) => {
          if (isUnavailable) {
            event.preventDefault();
            return;
          }
          onOpenDialog();
        }}
      >
        {t`Offline`}
      </Button>
    </Tooltip>
  );
}
