import { useLingui } from "@lingui/react/macro";
import { Button, Loader } from "@mantine/core";
import css from "./OfflineModeControl.module.css";
import type { ReactNode } from "react";

type Props = {
  /** Download progress from 0 to 1, or undefined while removing. */
  downloadProgress?: number;
};

/**
 * The offline mode control while the offline models download or are being
 * removed: it reports progress and takes no clicks. The floating job panel
 * shows the same download with its details.
 */
export function OfflineModeBusyButton({
  downloadProgress,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const percent =
    downloadProgress === undefined
      ? undefined
      : Math.round(downloadProgress * 100);
  return (
    <Button
      type="button"
      variant="subtle"
      color="neutral"
      size="compact-sm"
      className={css.offlineModeTrigger}
      leftSection={<Loader size={12} color="neutral" aria-hidden />}
      disabled
      aria-label={
        percent === undefined
          ? t`Removing offline models`
          : t`Downloading offline models: ${percent}%`
      }
    >
      {percent === undefined ? (
        t`Removing…`
      ) : (
        <span
          className={css.offlineModeProgress}
        >{t`Offline ${percent}%`}</span>
      )}
    </Button>
  );
}
